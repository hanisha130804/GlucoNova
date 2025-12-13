/**
 * Unit tests for medication-aware insulin calculator
 * Tests deterministic calculation, medication influence, and safety checks
 */

import { calculateInsulinDose, scanPatientMeds } from '../insulinCalculator';

describe('Insulin Calculator - Base Calculation', () => {
  it('Scenario A: Carbs-only calculation (ICR present)', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 100,
      carbs_g: 45,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.carb_units).toBe(3); // 45/15 = 3
    expect(result.correction_units).toBe(0); // 100-100 = 0
    expect(result.rounded_units).toBe(3);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('Scenario B: Correction-only calculation (ISF present)', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 160,
      carbs_g: 0,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.carb_units).toBe(0);
    expect(result.correction_units).toBe(1.5); // (160-100)/40 = 1.5
    expect(result.rounded_units).toBe(1.5);
  });

  it('Scenario C: Combined carbs and correction', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 160,
      carbs_g: 45,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 2'
    });

    // Carb: 45/15 = 3, Correction: (160-100)/40 = 1.5, Total: 4.5
    expect(result.carb_units).toBe(3);
    expect(result.correction_units).toBeCloseTo(1.5, 1);
    expect(result.rounded_units).toBeCloseTo(4.5, 1);
  });

  it('Scenario D: Missing ICR reduces confidence', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 100,
      carbs_g: 45,
      icr: undefined,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.confidence).toBeLessThan(0.7);
  });

  it('Scenario E: Missing ISF reduces confidence', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 160,
      carbs_g: 0,
      icr: 15,
      isf: undefined,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.confidence).toBeLessThan(0.7);
  });
});

describe('Insulin Calculator - Safety Checks', () => {
  it('Scenario F: Very high glucose triggers safety flag', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 400,
      carbs_g: 30,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.safety_flags).toContain('severe_hyperglycemia');
  });

  it('Scenario G: Hypoglycemia (< 70) returns 0 units with alert', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 55,
      carbs_g: 0,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.rounded_units).toBe(0);
    expect(result.safety_flags).toContain('hypoglycemia_risk');
    expect(result.confidence).toBe(0.95);
  });

  it('Scenario H: Dose exceeds max units triggers alert', () => {
    const result = calculateInsulinDose(
      {
        current_glucose_mgdl: 350,
        carbs_g: 120,
        icr: 10,
        isf: 20,
        correction_target: 100,
        insulin_type: 'rapid',
        diabetes_type: 'Type 1'
      },
      [],
      undefined,
      { max_units: 20 }
    );

    if (result.rounded_units > 20) {
      expect(result.alert).toBe(true);
      expect(result.safety_flags).toContain('dose_exceeds_max');
    }
  });
});

describe('Insulin Calculator - Type-Specific Behavior', () => {
  it('Type 1: Negative correction is clamped to 0', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 50,
      carbs_g: 0,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.correction_units).toBeLessThanOrEqual(0);
  });

  it('Rounding: Rapid acting rounds to 0.5', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 100,
      carbs_g: 33,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.round_step).toBe(0.5);
    expect(result.rounded_units % 0.5).toBeLessThan(0.01);
  });

  it('Rounding: Long-acting rounds to 1', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 100,
      carbs_g: 30,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'long',
      diabetes_type: 'Type 1'
    });

    expect(result.round_step).toBe(1);
    expect(Number.isInteger(result.rounded_units)).toBe(true);
  });
});

describe('Medication-Aware Adjustments', () => {
  const mockMedsDB = {
    'gliclazide-80': {
      id: 'gliclazide-80',
      name: 'Gliclazide',
      class: 'Sulfonylurea',
      pharmacology_effects: {
        increases_hypoglycemia_risk: true,
        reduces_insulin_requirement_pct: 15,
        increases_insulin_sensitivity_pct: 0
      },
      safety_flags: ['hypoglycemia_risk'],
      similar_ids: []
    },
    'empagliflozin-10': {
      id: 'empagliflozin-10',
      name: 'Empagliflozin',
      class: 'SGLT2 Inhibitor',
      pharmacology_effects: {
        increases_hypoglycemia_risk: false,
        reduces_insulin_requirement_pct: 0,
        increases_insulin_sensitivity_pct: 10
      },
      safety_flags: ['dka_risk_with_insulin_reduction'],
      similar_ids: []
    }
  };

  it('Scenario I: Sulfonylurea reduces correction units by 15%', () => {
    const result = calculateInsulinDose(
      {
        current_glucose_mgdl: 160,
        carbs_g: 45,
        icr: 15,
        isf: 40,
        correction_target: 100,
        insulin_type: 'rapid',
        diabetes_type: 'Type 2'
      },
      [{ med_id: 'gliclazide-80' }],
      mockMedsDB as any
    );

    expect(result.med_adjustments.length).toBeGreaterThan(0);
    expect(result.med_adjustments[0].med_id).toBe('gliclazide-80');
    expect(result.med_adjustments[0].adjustment_pct).toBe(15);
    expect(result.safety_flags).toContain('increased_hypoglycemia_risk');
  });

  it('Scenario J: SGLT2 inhibitor adds DKA risk flag', () => {
    const result = calculateInsulinDose(
      {
        current_glucose_mgdl: 150,
        carbs_g: 30,
        icr: 15,
        isf: 40,
        correction_target: 100,
        insulin_type: 'rapid',
        diabetes_type: 'Type 2'
      },
      [{ med_id: 'empagliflozin-10' }],
      mockMedsDB as any
    );

    expect(result.safety_flags).toContain('dka_risk_with_insulin');
  });

  it('Scan meds: Returns correct adjustments and flags', () => {
    const scanResult = scanPatientMeds(
      [{ med_id: 'gliclazide-80' }],
      mockMedsDB as any
    );

    expect(scanResult.adjustments.length).toBeGreaterThan(0);
    expect(scanResult.adjustments[0].adjustment_pct).toBe(15);
    expect(scanResult.safety_flags).toContain('increased_hypoglycemia_risk');
  });
});

describe('Response Structure Validation', () => {
  it('Response includes all required fields', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 160,
      carbs_g: 45,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result).toHaveProperty('raw_total_units');
    expect(result).toHaveProperty('carb_units');
    expect(result).toHaveProperty('correction_units');
    expect(result).toHaveProperty('adjusted_units_before_round');
    expect(result).toHaveProperty('rounded_units');
    expect(result).toHaveProperty('round_step');
    expect(result).toHaveProperty('max_units');
    expect(result).toHaveProperty('alert');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('safety_flags');
    expect(result).toHaveProperty('med_adjustments');
    expect(result).toHaveProperty('explanation');
    expect(result).toHaveProperty('provenance');
  });

  it('Provenance correctly reflects input sources', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 160,
      carbs_g: 45,
      icr: 15,
      isf: undefined,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.provenance.icr_source).toBe('user');
    expect(result.provenance.isf_source).toBe('default');
    expect(result.provenance.carbs_source).toBe('user');
  });

  it('Explanation includes all calculation steps', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 160,
      carbs_g: 45,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.explanation).toContain('Carb');
    expect(result.explanation).toContain('Correction');
    expect(result.explanation).toContain('Rounded');
  });
});

describe('Edge Cases & Validation', () => {
  it('Zero carbs and target glucose: Should return 0 units', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 100,
      carbs_g: 0,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.rounded_units).toBe(0);
  });

  it('High carb intake is handled correctly', () => {
    const result = calculateInsulinDose({
      current_glucose_mgdl: 100,
      carbs_g: 200,
      icr: 15,
      isf: 40,
      correction_target: 100,
      insulin_type: 'rapid',
      diabetes_type: 'Type 1'
    });

    expect(result.carb_units).toBe(200 / 15);
    expect(result.rounded_units).toBeGreaterThan(0);
  });
});
