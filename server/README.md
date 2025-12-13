# GlucoNova Backend - Medical Report Parser

## Overview

This document describes the medical report parsing system used to extract patient data from PDF and image documents.

## Parser Heuristics

### Extraction Process

The parser uses a multi-stage extraction process:

1. **Primary ML Extraction**: Attempts to extract data using pattern matching with high confidence
2. **Fallback OCR/Regex**: If ML fails or confidence < 0.35, applies fallback regex patterns
3. **Unit Normalization**: Converts values to standard units (kg, cm, mg/dL, grams)

### Confidence Thresholds

- **≥ 0.95**: Explicit label match (e.g., "Patient Name: John Doe")
- **0.75 - 0.94**: Strong pattern match (e.g., two capitalized words)
- **0.35 - 0.74**: Contextual extraction or fallback patterns
- **< 0.35**: Rejected - field left empty for manual entry

**Minimum Acceptable Confidence**: 0.35 (35%)

### Fallback Extraction Patterns

#### Date of Birth (DOB)
- Formats supported: `MM/DD/YYYY`, `YYYY-MM-DD`, `DD Mon YYYY`
- Normalizes to: `YYYY-MM-DD`
- Fallback confidence: 0.35
- Example: "05/14/1990" → "1990-05-14"

#### Weight
- Accepts: kg, kilograms, lbs, pounds
- Converts to: kg (float)
- Auto-conversion: lbs × 0.453592 = kg
- Fallback confidence: 0.35
- Example: "154 lbs" → 69.9 kg

#### Height
- Accepts: cm, centimeters, in, inches
- Converts to: cm (float)
- Auto-conversion: inches × 2.54 = cm
- Fallback confidence: 0.35
- Example: "5'10\"" or "70 in" → 177.8 cm

#### Glucose
- Accepts: mg/dL, mmol/L
- Converts to: mg/dL (integer)
- Auto-conversion: mmol/L × 18 = mg/dL
- Fallback confidence: 0.35
- Valid range: 20-600 mg/dL
- Example: "6.5 mmol/L" → 117 mg/dL

#### Carbohydrates
- Accepts: g, grams, carbs, carbohydrates
- Unit: grams (integer)
- Fallback confidence: 0.35
- Valid range: 0-500 g
- Example: "45g carbs" → 45

### Source Attribution

Each extracted field includes a `source` attribute:

- **`ml`**: Machine learning / primary pattern extraction
- **`ocr`**: OCR-based extraction or secondary patterns
- **`fallback`**: Fallback regex when primary methods fail

## API Response Format

```json
{
  "name": {
    "value": "John Doe",
    "confidence": 0.95,
    "source": "ml"
  },
  "dob": {
    "value": "1985-03-20",
    "confidence": 0.92,
    "source": "ocr"
  },
  "weight_kg": {
    "value": 75.5,
    "confidence": 0.85,
    "source": "fallback"
  },
  "height_cm": {
    "value": 175.0,
    "confidence": 0.80,
    "source": "fallback"
  },
  "glucose_mgdl": {
    "value": 120,
    "confidence": 0.75,
    "source": "ml"
  },
  "carbs_g": {
    "value": 45,
    "confidence": 0.70,
    "source": "fallback"
  },
  "lastA1c": {
    "value": "7.2",
    "confidence": 0.92,
    "source": "ml"
  },
  "medications": {
    "value": "Metformin 500mg",
    "confidence": 0.80,
    "source": "ml"
  },
  "typicalInsulin": {
    "value": "24",
    "confidence": 0.88,
    "source": "ml"
  },
  "targetRange": {
    "value": "70-180",
    "confidence": 1.0,
    "source": "ml"
  },
  "raw_text": "Medical Report\\nPatient Name: John Doe..."
}
```

## Insulin Prediction Algorithm

The `/api/predictions/insulin` endpoint calculates insulin dosage using a deterministic ICR + ISF formula:

### Formula

```
recommended_units = carb_units + correction_units

where:
  carb_units = carbs_g ÷ ICR
  correction_units = (current_glucose - target_glucose) ÷ ISF
```

### Parameters

- **ICR** (Insulin to Carb Ratio): Units of insulin per grams of carbs (default: 10)
- **ISF** (Insulin Sensitivity Factor): mg/dL drop per unit of insulin (default: 50)
- **Target Glucose**: Desired blood glucose level in mg/dL (default: 100)

### Example

```json
{
  "current_glucose_mgdl": 180,
  "carbs_g": 60,
  "icr": 10,
  "isf": 50,
  "correction_target": 100
}
```

**Calculation**:
- Carb coverage: 60g ÷ 10 = 6.0 units
- Correction: (180 - 100) ÷ 50 = 1.6 units
- **Total: 7.6 units**

### Confidence Scoring

- Base confidence: 0.75 (deterministic calculation)
- +0.1 if correction needed
- +0.1 if user profile data available
- +0.1 if ≥5 historical health entries
- Maximum: 0.95

## Adjusting Confidence Thresholds

To modify the minimum confidence threshold for auto-filling fields:

**File**: `/client/src/components/OnboardingModal.tsx`

```typescript
const CONFIDENCE_THRESHOLD = 0.35; // Change this value
```

**Recommended ranges**:
- 0.30 - 0.35: More inclusive (accepts more fields)
- 0.40 - 0.50: Balanced (default for production)
- 0.60+: Strict (only high-confidence extractions)

## Troubleshooting

### Issue: All fields return null

**Cause**: PDF is image-based (scanned) or encrypted

**Solution**:
1. Check server logs for "PDF text extraction returned empty string"
2. If confirmed, document requires OCR (not currently implemented)
3. User must manually enter data

### Issue: Low confidence scores

**Cause**: Document format doesn't match expected patterns

**Solution**:
1. Review `raw_text` field in API response
2. Add custom regex patterns to `parseMedicalDocument()` function
3. Test with sample documents from the same source

### Issue: Incorrect unit conversion

**Cause**: Unexpected unit abbreviations

**Solution**:
1. Check logs for extracted values before conversion
2. Add new unit patterns to fallback regex in `extractWithFallback()`
3. Validate conversion formulas

## Performance

- **PDF Parsing**: 1-3 seconds (depends on file size)
- **Fallback Extraction**: < 100ms additional overhead
- **Unit Normalization**: Negligible (< 1ms)

## Security Considerations

- File size limit: 20MB
- Temporary files cleaned up immediately after parsing
- Raw text limited to 500 characters in response
- No sensitive data logged in production mode
