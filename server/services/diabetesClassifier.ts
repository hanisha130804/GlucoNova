// diabetesClassifier.ts - Rule-based diabetes type detection

interface DiabetesTypeResult {
  diabetes_type: 'Type 1' | 'Type 2' | 'Gestational' | 'Other' | 'Unknown';
  confidence: number;
  reasons: string[];
}

interface PatientData {
  age?: number;
  dob?: string;
  medications?: string;
  insulin_regimen?: string;
  a1c_percent?: number;
  weight_kg?: number;
  height_cm?: number;
  raw_text?: string;
}

/**
 * Infer diabetes type using rule-based keyword matching
 * @param data - Parsed patient data from medical report
 * @returns Diabetes type classification with confidence and reasoning
 */
export function inferDiabetesType(data: PatientData): DiabetesTypeResult {
  const reasons: string[] = [];
  let type1Score = 0;
  let type2Score = 0;
  let gestationalScore = 0;
  
  // Combine all text fields for keyword matching
  const allText = [
    data.medications || '',
    data.insulin_regimen || '',
    data.raw_text || ''
  ].join(' ').toLowerCase();
  
  // Calculate patient age if DOB available
  let patientAge: number | undefined = data.age;
  if (!patientAge && data.dob) {
    const birthYear = new Date(data.dob).getFullYear();
    if (!isNaN(birthYear)) {
      patientAge = new Date().getFullYear() - birthYear;
    }
  }
  
  // ===== TYPE 1 DIABETES INDICATORS =====
  
  // Explicit mentions
  if (allText.match(/type\s*1|type\s*i\s+diabetes|t1d|iddm|insulin[- ]dependent\s+diabetes/)) {
    type1Score += 40;
    reasons.push('Explicit mention of Type 1 diabetes');
  }
  
  // Autoimmune/pathology keywords
  if (allText.match(/autoimmune\s+diabetes|juvenile\s+diabetes|beta[- ]cell\s+destruction|c[- ]peptide\s+(?:low|negative|absent)/)) {
    type1Score += 30;
    reasons.push('Autoimmune diabetes indicators found');
  }
  
  // DKA (diabetic ketoacidosis) - common in Type 1
  if (allText.match(/diabetic\s+ketoacidosis|dka|ketones?\s+(?:positive|high|present)/)) {
    type1Score += 25;
    reasons.push('Ketoacidosis indicators (common in Type 1)');
  }
  
  // Young age at diagnosis
  if (patientAge && patientAge < 30) {
    type1Score += 15;
    reasons.push(`Young age (${patientAge} years) suggests Type 1`);
  }
  
  // Insulin since childhood/early diagnosis
  if (allText.match(/insulin\s+(?:since|from)\s+(?:childhood|birth|young|early)/)) {
    type1Score += 20;
    reasons.push('Insulin use since childhood');
  }
  
  // Multiple daily injections or pump therapy (more common in Type 1)
  if (allText.match(/insulin\s+pump|continuous\s+glucose\s+monitor|cgm|multiple\s+daily\s+injections|mdi|basal[- ]bolus/)) {
    type1Score += 10;
    reasons.push('Advanced insulin therapy (pump/MDI)');
  }
  
  // ===== TYPE 2 DIABETES INDICATORS =====
  
  // Explicit mentions
  if (allText.match(/type\s*2|type\s*ii\s+diabetes|t2d|niddm|non[- ]insulin[- ]dependent/)) {
    type2Score += 40;
    reasons.push('Explicit mention of Type 2 diabetes');
  }
  
  // Oral medications (metformin, sulfonylureas, etc.)
  const oralMedKeywords = [
    'metformin', 'glipizide', 'glyburide', 'glimepiride', 'pioglitazone', 
    'rosiglitazone', 'sitagliptin', 'linagliptin', 'empagliflozin', 
    'canagliflozin', 'dapagliflozin', 'acarbose'
  ];
  
  const oralMedCount = oralMedKeywords.filter(med => allText.includes(med)).length;
  if (oralMedCount > 0) {
    type2Score += oralMedCount * 15;
    reasons.push(`Oral hypoglycemic medications found (${oralMedCount} types)`);
  }
  
  // Insulin resistance keywords
  if (allText.match(/insulin\s+resistance|metabolic\s+syndrome|pre[- ]diabetes|obesity|overweight|bmi\s*>\s*30/)) {
    type2Score += 20;
    reasons.push('Insulin resistance indicators');
  }
  
  // BMI calculation (obesity indicator)
  if (data.weight_kg && data.height_cm) {
    const heightM = data.height_cm / 100;
    const bmi = data.weight_kg / (heightM * heightM);
    if (bmi > 30) {
      type2Score += 15;
      reasons.push(`High BMI (${bmi.toFixed(1)}) suggests Type 2`);
    }
  }
  
  // Age over 40 at diagnosis
  if (patientAge && patientAge > 40) {
    type2Score += 10;
    reasons.push(`Older age (${patientAge} years) more common in Type 2`);
  }
  
  // Lifestyle management mentioned
  if (allText.match(/diet\s+(?:control|management)|exercise\s+(?:therapy|program)|weight\s+(?:loss|management)/)) {
    type2Score += 10;
    reasons.push('Lifestyle interventions mentioned');
  }
  
  // ===== GESTATIONAL DIABETES INDICATORS =====
  
  // Explicit mentions
  if (allText.match(/gestational\s+diabetes|gdm|pregnancy[- ]induced\s+diabetes|diabetes\s+in\s+pregnancy/)) {
    gestationalScore += 50;
    reasons.push('Gestational diabetes explicitly mentioned');
  }
  
  // Pregnancy-related keywords
  if (allText.match(/pregnant|pregnancy|prenatal|antenatal|postpartum|trimester|obstetric/)) {
    gestationalScore += 20;
    reasons.push('Pregnancy-related context');
  }
  
  // Glucose tolerance test during pregnancy
  if (allText.match(/glucose\s+tolerance\s+test|gtt|ogtt|glucose\s+challenge/)) {
    gestationalScore += 15;
    reasons.push('Glucose tolerance testing mentioned');
  }
  
  // ===== DETERMINE FINAL CLASSIFICATION =====
  
  const maxScore = Math.max(type1Score, type2Score, gestationalScore);
  
  if (maxScore === 0) {
    return {
      diabetes_type: 'Unknown',
      confidence: 0,
      reasons: ['Insufficient data to classify diabetes type']
    };
  }
  
  // Confidence calculation (max score / 100, capped at 0.95)
  const confidence = Math.min(maxScore / 100, 0.95);
  
  if (type1Score === maxScore && type1Score >= 30) {
    return {
      diabetes_type: 'Type 1',
      confidence,
      reasons
    };
  }
  
  if (type2Score === maxScore && type2Score >= 30) {
    return {
      diabetes_type: 'Type 2',
      confidence,
      reasons
    };
  }
  
  if (gestationalScore === maxScore && gestationalScore >= 30) {
    return {
      diabetes_type: 'Gestational',
      confidence,
      reasons
    };
  }
  
  // If scores are low or ambiguous, return Unknown
  return {
    diabetes_type: 'Unknown',
    confidence: Math.max(confidence - 0.2, 0.1),
    reasons: reasons.length > 0 ? reasons : ['Ambiguous or insufficient indicators']
  };
}

/**
 * Validate and override diabetes type with user input
 */
export function validateDiabetesType(
  userInput: string
): 'Type 1' | 'Type 2' | 'Gestational' | 'Other' | 'Unknown' {
  const normalized = userInput.trim().toLowerCase();
  
  if (normalized.match(/type\s*1|t1d/)) return 'Type 1';
  if (normalized.match(/type\s*2|t2d/)) return 'Type 2';
  if (normalized.match(/gestational|gdm/)) return 'Gestational';
  if (normalized.match(/other|mody|lada/)) return 'Other';
  
  return 'Unknown';
}
