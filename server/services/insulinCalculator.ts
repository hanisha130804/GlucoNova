// insulinCalculator.ts - Deterministic insulin dosage calculator with ICR + ISF

interface InsulinCalculationInput {
  patient_id?: string;
  current_glucose_mgdl: number;
  carbs_g?: number;
  icr?: number; // Insulin to Carb Ratio (units insulin per grams of carbs)
  isf?: number; // Insulin Sensitivity Factor (mg/dL drop per unit insulin)
  correction_target?: number; // Target glucose in mg/dL
  basal_rate?: number; // Optional basal rate (units/day or units/hour)
  insulin_type?: 'rapid' | 'short' | 'intermediate' | 'long' | 'mixed';
  diabetes_type?: 'Type 1' | 'Type 2' | 'Gestational' | 'Other' | 'Unknown';
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

interface InsulinCalculationResult {
  raw_total_units: number;
  carb_units: number;
  correction_units: number;
  adjusted_units_before_round: number;
  rounded_units: number;
  round_step: number;
  max_units: number;
  alert: boolean;
  confidence: number;
  safety_flags: string[];
  med_adjustments: Array<{
    med_id: string;
    adjustment_pct: number;
    reason: string;
  }>;
  explanation: string;
  provenance: Record<string, string>;
  raw_inputs?: Record<string, any>;
  diabetes_type?: string;
}

interface MedicationEffect {
  increases_hypoglycemia_risk: boolean;
  reduces_insulin_requirement_pct: number;
  increases_insulin_sensitivity_pct: number;
}

interface Medication {
  id: string;
  name: string;
  class: string;
  pharmacology_effects: MedicationEffect;
  safety_flags: string[];
  similar_ids: string[];
}

/**
 * Scan patient medications and return adjustments
 */
export function scanPatientMeds(
  patientMedList: Array<{ med_id: string }>,
  medsDB: Record<string, Medication>
): {
  adjustments: Array<{ med_id: string; adjustment_pct: number; reason: string }>;
  safety_flags: string[];
} {
  const adjustments: Array<{ med_id: string; adjustment_pct: number; reason: string }> = [];
  const safety_flags: Set<string> = new Set();
  let totalAdjustmentPct = 0;
  const MAX_ADJUSTMENT_CAP = 35;

  for (const patientMed of patientMedList) {
    const med = medsDB[patientMed.med_id];
    if (!med) continue;

    const effects = med.pharmacology_effects;

    // Sulfonylurea: increases hypoglycemia risk -> reduce correction by 15%
    if (effects.increases_hypoglycemia_risk && med.class === 'Sulfonylurea') {
      const reduction = 15;
      adjustments.push({
        med_id: patientMed.med_id,
        adjustment_pct: reduction,
        reason: `Sulfonylurea increases hypoglycemia risk — reduce correction by ${reduction}%`
      });
      totalAdjustmentPct += reduction;
      safety_flags.add('increased_hypoglycemia_risk');
    }

    // SGLT2 inhibitors: DKA risk if insulin reduction
    if (med.safety_flags?.includes('dka_risk_with_insulin_reduction')) {
      safety_flags.add('dka_risk_with_insulin');
    }

    // GLP-1: add note but no automatic adjustment
    if (med.class === 'GLP-1 Agonist') {
      safety_flags.add('glp1_concurrent_use');
    }
  }

  // Cap total adjustments
  const cappedAdjustmentPct = Math.min(totalAdjustmentPct, MAX_ADJUSTMENT_CAP);

  return {
    adjustments,
    safety_flags: Array.from(safety_flags)
  };
}

/**
 * Calculate insulin dosage using ICR + ISF formula with medication awareness
 * This is a deterministic calculator that provides explainable results
 */
export function calculateInsulinDose(
  input: InsulinCalculationInput,
  patientMedList?: Array<{ med_id: string }>,
  medsDB?: Record<string, Medication>,
  config?: { max_units?: number; default_correction_target?: number }
): InsulinCalculationResult {
  const {
    current_glucose_mgdl,
    carbs_g = 0,
    icr = 10, // Default 1:10 ratio (1 unit per 10g carbs)
    isf = 50, // Default 50 mg/dL per unit
    correction_target = 100, // Default target 100 mg/dL
    insulin_type = 'rapid',
    diabetes_type = 'Unknown',
    activity_level = 'moderate'
  } = input;
  
  const warnings: string[] = [];
  const explanation: string[] = [];
  let baseConfidence = 0.75; // Base confidence for deterministic calculation
  
  // ===== INPUT VALIDATION =====
  
  if (isNaN(current_glucose_mgdl) || current_glucose_mgdl < 20 || current_glucose_mgdl > 600) {
    throw new Error('Invalid glucose level. Must be between 20-600 mg/dL');
  }
  
  if (carbs_g < 0 || carbs_g > 500) {
    throw new Error('Invalid carb amount. Must be between 0-500g');
  }
  
  if (icr <= 0 || icr > 100) {
    throw new Error('Invalid ICR. Must be between 1-100');
  }
  
  if (isf <= 0 || isf > 200) {
    throw new Error('Invalid ISF. Must be between 1-200');
  }
  
  // ===== CARB COVERAGE CALCULATION =====
  
  const carbUnits = carbs_g / icr;
  
  if (carbs_g > 0) {
    explanation.push(`Carb coverage: ${carbs_g}g ÷ ICR(${icr}) = ${carbUnits.toFixed(1)} units`);
    baseConfidence += 0.05; // Higher confidence with meal data
  } else {
    explanation.push('No carb intake provided');
  }
  
  // ===== CORRECTION DOSE CALCULATION =====
  
  const glucoseDiff = current_glucose_mgdl - correction_target;
  let correctionUnits = 0;
  
  if (glucoseDiff > 0) {
    correctionUnits = glucoseDiff / isf;
    explanation.push(`Correction: (${current_glucose_mgdl} - ${correction_target}) ÷ ISF(${isf}) = ${correctionUnits.toFixed(1)} units`);
    baseConfidence += 0.05; // Correction adds confidence
  } else if (glucoseDiff < -30) {
    // Below target by more than 30 mg/dL - warn user
    warnings.push(`Glucose is ${Math.abs(glucoseDiff)} mg/dL below target. Consider reducing insulin or consuming carbs.`);
    explanation.push(`Glucose below target (${current_glucose_mgdl} mg/dL). No correction needed.`);
    correctionUnits = 0; // Never add negative correction
  } else {
    explanation.push(`Glucose near target (${current_glucose_mgdl} mg/dL). No correction needed.`);
  }
  
  // ===== MEDICATION-AWARE ADJUSTMENTS =====
  
  let adjustedCorrectionUnits = correctionUnits;
  const medAdjustments: Array<{ med_id: string; adjustment_pct: number; reason: string }> = [];
  const allSafetyFlags: Set<string> = new Set();
  
  if (patientMedList && patientMedList.length > 0 && medsDB) {
    const medScan = scanPatientMeds(patientMedList, medsDB);
    medAdjustments.push(...medScan.adjustments);
    medScan.safety_flags.forEach(f => allSafetyFlags.add(f));
    
    // Apply correction unit reduction for sulfonylureas
    for (const adj of medScan.adjustments) {
      const reductionFactor = 1 - (adj.adjustment_pct / 100);
      adjustedCorrectionUnits *= reductionFactor;
      explanation.push(`Applied ${adj.reason}`);
    }
  }
  
  // ===== DIABETES TYPE ADJUSTMENTS =======
  
  let typeAdjustment = 1.0; // Multiplier for total dose
  
  if (diabetes_type === 'Type 1') {
    // Type 1: Use stricter correction logic, no negative corrections
    if (correctionUnits < 0) {
      correctionUnits = 0;
      explanation.push('Type 1 diabetes: Negative corrections avoided');
    }
  } else if (diabetes_type === 'Type 2') {
    // Type 2: May need less aggressive corrections if insulin-resistant
    if (current_glucose_mgdl > 200) {
      typeAdjustment = 0.9; // Slightly reduce to avoid over-correction
      explanation.push('Type 2 adjustment: Conservative dosing for high glucose');
    }
  }
  
  // ===== ACTIVITY LEVEL ADJUSTMENTS =====
  
  let activityAdjustment = 0;
  
  if (activity_level === 'active' || activity_level === 'very_active') {
    // High activity increases insulin sensitivity - reduce dose by 10-20%
    const reductionPercent = activity_level === 'very_active' ? 0.20 : 0.10;
    activityAdjustment = -(carbUnits + correctionUnits) * reductionPercent;
    explanation.push(`Activity adjustment: Reduced by ${(reductionPercent * 100).toFixed(0)}% for ${activity_level} activity`);
    warnings.push('Exercise increases insulin sensitivity. Monitor glucose closely.');
  } else if (activity_level === 'sedentary') {
    // Low activity may require slight increase
    activityAdjustment = (carbUnits + correctionUnits) * 0.05;
    explanation.push('Activity adjustment: Slight increase for sedentary activity');
  }
  
  // ===== TOTAL CALCULATION =====
  
  let totalUnits = (carbUnits + correctionUnits + activityAdjustment) * typeAdjustment;
  totalUnits = Math.max(0, totalUnits); // Never recommend negative insulin
  
  // ===== ROUNDING BASED ON INSULIN TYPE =====
  
  let roundedUnits: number;
  
  if (insulin_type === 'rapid' || insulin_type === 'short') {
    // Round to nearest 0.5 units for rapid/short-acting
    roundedUnits = Math.round(totalUnits * 2) / 2;
    explanation.push(`Rounded to 0.5 units for ${insulin_type}-acting insulin`);
  } else if (insulin_type === 'intermediate' || insulin_type === 'long') {
    // Round to nearest 1 unit for intermediate/long-acting
    roundedUnits = Math.round(totalUnits);
    explanation.push(`Rounded to 1 unit for ${insulin_type}-acting insulin`);
  } else {
    // Default to 0.5 unit rounding
    roundedUnits = Math.round(totalUnits * 2) / 2;
  }
  
  // ===== SAFETY CHECKS =====
  
  const maxUnits = config?.max_units || 20;
  let hasAlert = false;
  
  if (roundedUnits > maxUnits) {
    allSafetyFlags.add('dose_exceeds_max');
    hasAlert = true;
    explanation.push(`Alert: Recommended dose (${roundedUnits} units) exceeds safety limit (${maxUnits} units).`);
  }
  
  if (current_glucose_mgdl < 70) {
    allSafetyFlags.add('hypoglycemia_risk');
    explanation.push('HYPOGLYCEMIA: Glucose below 70 mg/dL. Do NOT administer insulin.');
    roundedUnits = 0;
    adjustedCorrectionUnits = 0;
    baseConfidence = 0.95;
  }
  
  if (current_glucose_mgdl > 350) {
    allSafetyFlags.add('severe_hyperglycemia');
    baseConfidence = Math.max(baseConfidence - 0.1, 0.5);
  }
  
  // ===== CONFIDENCE ADJUSTMENT =====
  
  // Reduce confidence if using default ICR/ISF
  if (!input.icr) {
    baseConfidence = Math.max(baseConfidence - 0.15, 0.3);
    warnings.push('Using default ICR (1:10). Please update your profile with personalized ratio for better accuracy.');
  }
  
  if (!input.isf) {
    baseConfidence = Math.max(baseConfidence - 0.15, 0.3);
    warnings.push('Using default ISF (50 mg/dL). Please update your profile with personalized sensitivity factor.');
  }
  
  // Cap confidence at 0.95
  const finalConfidence = Math.min(baseConfidence, 0.95);
  
  // ===== BUILD RESULT =====
  
  const roundStep = (insulin_type === 'rapid' || insulin_type === 'short') ? 0.5 : 1;
  const adjustedTotalUnits = carbUnits + adjustedCorrectionUnits + (activityAdjustment || 0);
  const finalExplanation = explanation.join('. ') + '.';
  
  // Build provenance
  const provenance: Record<string, string> = {
    icr_source: input.icr ? 'user' : 'default',
    isf_source: input.isf ? 'user' : 'default',
    carbs_source: (input.carbs_g && input.carbs_g > 0) ? 'user' : 'default'
  };
  
  return {
    raw_total_units: parseFloat(carbUnits.toFixed(2)),
    carb_units: parseFloat(carbUnits.toFixed(1)),
    correction_units: parseFloat(correctionUnits.toFixed(1)),
    adjusted_units_before_round: parseFloat(adjustedTotalUnits.toFixed(2)),
    rounded_units: roundedUnits,
    round_step: roundStep,
    max_units: maxUnits,
    alert: hasAlert,
    confidence: parseFloat(finalConfidence.toFixed(2)),
    safety_flags: Array.from(allSafetyFlags),
    med_adjustments: medAdjustments,
    explanation: finalExplanation,
    provenance,
    raw_inputs: input,
    diabetes_type
  };
}

/**
 * Helper function to estimate ICR from total daily insulin (TDI)
 * Uses the "500 rule": ICR = 500 / TDI
 */
export function estimateICR(totalDailyInsulin: number): number {
  if (totalDailyInsulin <= 0 || totalDailyInsulin > 200) {
    return 10; // Return default if invalid
  }
  return Math.round(500 / totalDailyInsulin);
}

/**
 * Helper function to estimate ISF from total daily insulin (TDI)
 * Uses the "1800 rule": ISF = 1800 / TDI
 */
export function estimateISF(totalDailyInsulin: number): number {
  if (totalDailyInsulin <= 0 || totalDailyInsulin > 200) {
    return 50; // Return default if invalid
  }
  return Math.round(1800 / totalDailyInsulin);
}
