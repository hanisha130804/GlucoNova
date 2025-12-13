// parserService.ts - Production-grade PDF medical data parser with ensemble fallbacks

interface ExtractedField {
  value: string | number | null;
  confidence: number;
  source: 'ml' | 'ocr_visual' | 'ocr_text' | 'regex' | 'fallback';
  sources?: string[]; // Track all sources that contributed
}

interface ParsedData {
  name: ExtractedField;
  dob: ExtractedField;
  weight_kg: ExtractedField;
  height_cm: ExtractedField;
  glucose_mgdl: ExtractedField;
  carbs_g: ExtractedField;
  a1c_percent?: ExtractedField;
  medications?: ExtractedField;
  insulin_regimen?: ExtractedField;
  diabetes_type?: ExtractedField;
  raw_text: string;
}

interface MLResponse {
  [key: string]: any;
  raw_text?: string;
  ocr_text?: string;
}

// ============================================
// NORMALIZATION UTILITIES
// ============================================

const normalizeWeight = (value: any): number | null => {
  if (!value) return null;
  const str = String(value).toLowerCase().trim();
  // Extract number from patterns like "70kg", "70 kg", "155 lbs", "155lbs", etc.
  const match = str.match(/(\d+\.?\d*)\s?(kg|kilograms?|lbs?|pounds?|g\b)?/);
  if (!match) return null;
  
  let weight = parseFloat(match[1]);
  if (isNaN(weight)) return null;
  
  // Convert lbs to kg if needed
  const unit = match[2]?.toLowerCase() || '';
  if (unit.startsWith('lb') || unit.startsWith('pound')) {
    weight = weight * 0.453592; // lbs to kg
  }
  
  // Sanity check: weight between 20kg and 300kg
  if (weight < 20 || weight > 300) return null;
  
  return parseFloat(weight.toFixed(1));
};

const normalizeHeight = (value: any): number | null => {
  if (!value) return null;
  const str = String(value).toLowerCase().trim();
  // Extract number from patterns like "170cm", "170 cm", "5.7 feet", "5'7", etc.
  const match = str.match(/(\d+\.?\d*)\s?(cm|centimeters?|feet?|ft|inches?|in\b|m\b)?/);
  if (!match) return null;
  
  let height = parseFloat(match[1]);
  if (isNaN(height)) return null;
  
  // Convert feet/inches to cm if needed
  const unit = match[2]?.toLowerCase() || '';
  if (unit.startsWith('foot') || unit === 'ft') {
    height = height * 30.48; // feet to cm
  } else if (unit.startsWith('inch') || unit === 'in') {
    height = height * 2.54; // inches to cm
  } else if (unit === 'm') {
    height = height * 100; // meters to cm
  }
  
  // Sanity check: height between 100cm and 250cm
  if (height < 100 || height > 250) return null;
  
  return parseFloat(height.toFixed(1));
};

const normalizeGlucose = (value: any): number | null => {
  if (!value) return null;
  const str = String(value).toLowerCase().trim();
  // Extract number from patterns like "120 mg/dL", "120mg/dL", "6.7 mmol/L", etc.
  const match = str.match(/(\d+\.?\d*)\s?(mg\/dl|mmol\/l|mg\/ml)?/);
  if (!match) return null;
  
  let glucose = parseFloat(match[1]);
  if (isNaN(glucose)) return null;
  
  // Convert mmol/L to mg/dL if needed
  const unit = match[2]?.toLowerCase() || '';
  if (unit.includes('mmol')) {
    glucose = Math.round(glucose * 18); // mmol/L to mg/dL
  }
  
  // Sanity check: glucose between 20 and 600 mg/dL
  if (glucose < 20 || glucose > 600) return null;
  
  return Math.round(glucose);
};

const normalizeCarbs = (value: any): number | null => {
  if (!value) return null;
  const str = String(value).toLowerCase().trim();
  // Extract number from patterns like "45g", "45 g", "45 grams", etc.
  const match = str.match(/(\d+\.?\d*)\s?(g|grams?|carbs?|carbohydrates?)?/);
  if (!match) return null;
  
  let carbs = parseFloat(match[1]);
  if (isNaN(carbs)) return null;
  
  // Sanity check: carbs between 0 and 500g
  if (carbs < 0 || carbs > 500) return null;
  
  return Math.round(carbs);
};

const normalizeA1c = (value: any): number | null => {
  if (!value) return null;
  const str = String(value).toLowerCase().trim();
  // Extract number from patterns like "7.2%", "7.2", "HbA1c: 7.2", etc.
  const match = str.match(/(\d+\.?\d*)\s?%?/);
  if (!match) return null;
  
  let a1c = parseFloat(match[1]);
  if (isNaN(a1c)) return null;
  
  // Sanity check: A1c between 4% and 14%
  if (a1c < 4 || a1c > 14) return null;
  
  return parseFloat(a1c.toFixed(1));
};

const normalizeDOB = (value: any): string | null => {
  if (!value) return null;
  const str = String(value).trim();
  
  // Try multiple date formats
  // DD/MM/YYYY
  let match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    // Assume MM/DD/YYYY format (US standard), convert to YYYY-MM-DD
    return `${year}-${month}-${day}`;
  }
  
  // YYYY/MM/DD or YYYY-MM-DD
  match = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Month name format: "January 5, 1990" or "5 January 1990"
  match = str.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})|[\w]+\s+(\d{1,2}),?\s+(\d{4})/i);
  if (match) {
    // Simple fallback - not ideal but better than nothing
    return null; // For now, skip complex date parsing
  }
  
  return null;
};

const normalizeName = (value: any): string | null => {
  if (!value) return null;
  const str = String(value).trim();
  
  // Filter out common non-name patterns
  if (str.match(/^(medical|report|patient|doctor|hospital|clinic|laboratory|test|result|date|page|table)/i)) {
    return null;
  }
  
  // Name should be 3-100 characters and contain letters
  if (str.length < 3 || str.length > 100 || !str.match(/[a-z]/i)) {
    return null;
  }
  
  return str;
};

// ============================================
// REGEX EXTRACTION PATTERNS (ENHANCED)
// ============================================

function extractWithRegex(rawText: string): Partial<ParsedData> {
  const results: any = {};
  
  // Extract Name
  let match = rawText.match(/(?:patient\s+)?name[:\s]+([A-Za-z \.-]{3,60}?)(?:\n|,|age|dob|date|gender|id|weight|height|$)/i);
  if (match) {
    const name = normalizeName(match[1]);
    if (name) {
      results.name = { value: name, confidence: 0.85, source: 'regex' };
    }
  }
  
  // Extract DOB
  match = rawText.match(/(?:date\s+of\s+)?birth[:\s]+([\d\/\-\s\w,]+?)(?:\n|weight|height|age|gender|$)/i);
  if (match) {
    const dob = normalizeDOB(match[1]);
    if (dob) {
      results.dob = { value: dob, confidence: 0.8, source: 'regex' };
    }
  } else {
    // Try alternative DOB patterns
    match = rawText.match(/(?:dob|d\.o\.b)[:\s]+([\d\/\-\s]+)/i);
    if (match) {
      const dob = normalizeDOB(match[1]);
      if (dob) {
        results.dob = { value: dob, confidence: 0.75, source: 'regex' };
      }
    }
  }
  
  // Extract Weight
  match = rawText.match(/weight[:\s]+([\d.]+\s?(?:kg|kilograms?|lbs?|pounds?|g\b)?)(?:\n|height|,|$)/i);
  if (match) {
    const weight = normalizeWeight(match[1]);
    if (weight) {
      results.weight_kg = { value: weight, confidence: 0.8, source: 'regex' };
    }
  }
  
  // Extract Height
  match = rawText.match(/height[:\s]+([\d.]+\s?(?:cm|centimeters?|feet?|ft|inches?|in|m\b)?)(?:\n|weight|,|$)/i);
  if (match) {
    const height = normalizeHeight(match[1]);
    if (height) {
      results.height_cm = { value: height, confidence: 0.8, source: 'regex' };
    }
  }
  
  // Extract Glucose
  match = rawText.match(/(?:glucose|blood\s+sugar|fasting\s+glucose)[:\s]+([\d.]+\s?(?:mg\/dl|mmol\/l)?)/i);
  if (match) {
    const glucose = normalizeGlucose(match[1]);
    if (glucose) {
      results.glucose_mgdl = { value: glucose, confidence: 0.8, source: 'regex' };
    }
  }
  
  // Extract Carbs
  match = rawText.match(/(?:carbs?|carbohydrates?)[:\s]+([\d.]+\s?(?:g|grams?)?)|carb\s+ratio[:\s]+1\s+unit\s*\/\s*([\d.]+)\s?g/i);
  if (match) {
    const carbValue = match[1] || match[2]; // Extract from either pattern
    const carbs = normalizeCarbs(carbValue);
    if (carbs) {
      results.carbs_g = { value: carbs, confidence: 0.75, source: 'regex' };
    }
  }
  
  // Extract A1c
  match = rawText.match(/(?:a1c|hba1c|glycated\s+hemoglobin)[:\s]+([\d.]+\s?%?)/i);
  if (match) {
    const a1c = normalizeA1c(match[1]);
    if (a1c) {
      results.a1c_percent = { value: a1c, confidence: 0.8, source: 'regex' };
    }
  }
  
  // Extract Medications
  match = rawText.match(/(?:medications?|drugs?|prescriptions?)[:\s]+([^\n]{5,200}?)(?:\n|$)/i);
  if (match) {
    const meds = match[1].trim();
    if (meds.length > 2) {
      results.medications = { value: meds, confidence: 0.7, source: 'regex' };
    }
  }
  
  // Extract Insulin Regimen
  match = rawText.match(/(?:insulin\s+regimen?|insulin\s+type|basal|bolus|insulin\s+therapy)[:\s]+([^\n]{5,150}?)(?:\n|$)/i);
  if (match) {
    const regimen = match[1].trim();
    if (regimen.length > 2) {
      results.insulin_regimen = { value: regimen, confidence: 0.7, source: 'regex' };
    }
  } else {
    // Try to extract from medication list if it contains insulin keywords
    const insulinMatch = rawText.match(/((?:rapid|short|intermediate|long)(?:\s+acting)?\s+insulin|insulin\s+(?:glargine|lispro|aspart|detemir|degludec|nph)|basal-bolus)/i);
    if (insulinMatch) {
      results.insulin_regimen = { value: insulinMatch[1].trim(), confidence: 0.65, source: 'regex' };
    }
  }
  
  return results;
}

// ============================================
// ENSEMBLE CONSOLIDATOR (MASTER)
// ============================================

export async function consolidate(raw: MLResponse): Promise<ParsedData> {
  const text = raw.raw_text || raw.ocr_text || "";
  
  // Extract using regex
  const regexResults = extractWithRegex(text);
  
  // Build final result with ensemble logic
  const result: any = {};
  
  const ensembleField = (key: string, mlKeys: string[], fallbackExtraction: any): ExtractedField => {
    // 1. Try ML extraction first
    for (const mlKey of mlKeys) {
      const ml = raw[mlKey];
      if (ml?.value != null && (ml.confidence ?? 0) >= 0.6) {
        return {
          value: ml.value,
          confidence: ml.confidence,
          source: 'ml',
          sources: ['ml']
        };
      }
    }
    
    // 2. Try regex extraction
    if (fallbackExtraction?.value != null) {
      return {
        value: fallbackExtraction.value,
        confidence: Math.min(fallbackExtraction.confidence, 0.85), // Cap regex confidence
        source: 'regex',
        sources: ['regex']
      };
    }
    
    // 3. Return null with minimal confidence
    return {
      value: null,
      confidence: 0,
      source: 'fallback',
      sources: []
    };
  };
  
  // Consolidate each field
  result.name = ensembleField('name', ['name', 'patient_name'], regexResults.name);
  result.dob = ensembleField('dob', ['dob', 'date_of_birth'], regexResults.dob);
  result.weight_kg = ensembleField('weight_kg', ['weight', 'weight_kg'], regexResults.weight_kg);
  result.height_cm = ensembleField('height_cm', ['height', 'height_cm'], regexResults.height_cm);
  result.glucose_mgdl = ensembleField('glucose_mgdl', ['glucose', 'glucose_mgdl', 'blood_glucose'], regexResults.glucose_mgdl);
  result.carbs_g = ensembleField('carbs_g', ['carbs', 'carbs_g'], regexResults.carbs_g);
  result.a1c_percent = ensembleField('a1c_percent', ['a1c', 'hba1c', 'a1c_percent'], regexResults.a1c_percent);
  result.medications = ensembleField('medications', ['medications'], regexResults.medications);
  result.insulin_regimen = ensembleField('insulin_regimen', ['insulin_regimen', 'insulin_type'], regexResults.insulin_regimen);
  
  // Add raw text for debugging
  result.raw_text = text.substring(0, 1000);
  
  return result as ParsedData;
}
