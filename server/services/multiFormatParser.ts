/**
 * Multi-Format Patient Data Parser
 * Supports: PDF, Image (JPEG/PNG), and Plain Text inputs
 * 
 * This service handles different input formats and normalizes them
 * into a common pipeline for reliable data extraction.
 */

import { consolidate } from './parserService';

export interface ParseRequest {
  fileBuffer?: Buffer;
  fileType?: string;
  fileName?: string;
  rawText?: string; // For plain text input
}

export interface ParseResult {
  name: { value: string | number | null; confidence: number; source: string; sources?: string[] };
  dob: { value: string | number | null; confidence: number; source: string; sources?: string[] };
  weight_kg: { value: string | number | null; confidence: number; source: string; sources?: string[] };
  height_cm: { value: string | number | null; confidence: number; source: string; sources?: string[] };
  glucose_mgdl: { value: string | number | null; confidence: number; source: string; sources?: string[] };
  carbs_g: { value: string | number | null; confidence: number; source: string; sources?: string[] };
  [key: string]: any;
}

/**
 * Extract text from different input formats
 */
export async function extractTextFromInput(request: ParseRequest): Promise<string> {
  const { fileBuffer, fileType, rawText } = request;

  // 1. Plain text input
  if (rawText) {
    console.log('📝 Input format: Plain text');
    return rawText;
  }

  if (!fileBuffer) {
    throw new Error('No input provided (no buffer or rawText)');
  }

  // 2. PDF file
  if (fileType === 'application/pdf') {
    console.log('📄 Input format: PDF');
    return await extractFromPDF(fileBuffer);
  }

  // 3. Image files (JPEG, PNG)
  if (fileType === 'image/jpeg' || fileType === 'image/png') {
    console.log('🖼️  Input format: Image');
    // OCR implementation would go here (Phase 2)
    // For now, return error message with guidance
    throw new Error(
      'Image OCR not yet implemented. ' +
      'Phase 2 will add Tesseract/EasyOCR support for scanned documents. ' +
      'Please use a text-based PDF or upload plain text instead.'
    );
  }

  throw new Error(
    `Unsupported file type: ${fileType}. ` +
    'Supported formats: PDF, JPEG, PNG, plain text'
  );
}

/**
 * Extract text from PDF using pdf2json
 */
async function extractFromPDF(buffer: Buffer): Promise<string> {
  const { writeFileSync, unlinkSync } = await import('fs');
  const PDFParser = (await import('pdf2json')).default;

  console.log('🔄 Parsing PDF with pdf2json...');

  const pdfParser = new (PDFParser as any)(null, false);
  const tempFilePath = `/tmp/temp-pdf-${Date.now()}.pdf`;

  // Write buffer to temporary file
  writeFileSync(tempFilePath, buffer);

  try {
    // Parse PDF and extract text
    const fullText = await new Promise<string>((resolve, reject) => {
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          let text = '';
          if (pdfData.Pages) {
            pdfData.Pages.forEach((page: any, pageIndex: number) => {
              if (page.Texts) {
                // Group text items by Y position (line-by-line)
                const textsByY: { [key: number]: string[] } = {};
                page.Texts.forEach((textItem: any) => {
                  try {
                    let decodedText = '';
                    try {
                      decodedText = decodeURIComponent(textItem.R[0].T);
                    } catch (e) {
                      decodedText = textItem.R[0].T;
                    }
                    const y = Math.round((textItem.y || 0) * 10) / 10;
                    if (!textsByY[y]) textsByY[y] = [];
                    textsByY[y].push(decodedText);
                  } catch (e) {
                    console.warn('⚠️  Failed to decode text item:', e);
                  }
                });

                // Reconstruct text with proper line breaks
                const sortedYPositions = Object.keys(textsByY)
                  .map(y => parseFloat(y))
                  .sort((a, b) => a - b);

                sortedYPositions.forEach(y => {
                  text += textsByY[y].join(' ') + '\n';
                });

                if (pageIndex < pdfData.Pages.length - 1) {
                  text += '\n'; // Page break
                }
              }
            });
          }
          console.log('✅ PDF text extraction successful');
          resolve(text);
        } catch (error) {
          reject(error);
        }
      });

      pdfParser.on('pdfParser_dataError', (error: any) => {
        console.error('❌ PDF parser error:', error);
        reject(error);
      });

      pdfParser.loadPDF(tempFilePath);
    });

    return fullText;
  } finally {
    // Cleanup temp file
    try {
      unlinkSync(tempFilePath);
      console.log('🧹 Cleaned up temp PDF file');
    } catch (e) {
      console.warn('⚠️  Failed to clean up temp file:', e);
    }
  }
}

/**
 * Main parse function - orchestrates format detection and extraction
 */
export async function parsePatientData(request: ParseRequest): Promise<ParseResult> {
  try {
    // Step 1: Extract text from input (handles all formats)
    console.log('\n🚀 Starting patient data parsing pipeline');
    const rawText = await extractTextFromInput(request);

    if (!rawText || rawText.trim().length === 0) {
      console.warn('⚠️  Warning: Extracted text is empty');
      return createEmptyResult();
    }

    console.log(`📊 Extracted ${rawText.length} characters of text`);

    // Step 2: Consolidate extraction (ML + regex fallback)
    console.log('🔍 Running ensemble parser (ML + regex fallback)...');
    const result = await consolidate({
      raw_text: rawText,
      ocr_text: rawText
    });

    // Step 3: Log results
    logParseResults(result);

    return result;
  } catch (error: any) {
    console.error('❌ Parse error:', error.message);
    throw error;
  }
}

/**
 * Log parsing results in a user-friendly format
 */
function logParseResults(result: any): void {
  console.log('\n📋 Parsing Results:');
  console.log('===================');
  console.log(`Name:      ${result.name.value || 'null'} (confidence: ${(result.name.confidence * 100).toFixed(0)}%, source: ${result.name.source})`);
  console.log(`DOB:       ${result.dob.value || 'null'} (confidence: ${(result.dob.confidence * 100).toFixed(0)}%, source: ${result.dob.source})`);
  console.log(`Weight:    ${result.weight_kg.value || 'null'} kg (confidence: ${(result.weight_kg.confidence * 100).toFixed(0)}%, source: ${result.weight_kg.source})`);
  console.log(`Height:    ${result.height_cm.value || 'null'} cm (confidence: ${(result.height_cm.confidence * 100).toFixed(0)}%, source: ${result.height_cm.source})`);
  console.log(`Glucose:   ${result.glucose_mgdl.value || 'null'} mg/dL (confidence: ${(result.glucose_mgdl.confidence * 100).toFixed(0)}%, source: ${result.glucose_mgdl.source})`);
  console.log(`Carbs:     ${result.carbs_g.value || 'null'} g (confidence: ${(result.carbs_g.confidence * 100).toFixed(0)}%, source: ${result.carbs_g.source})`);

  // Count high confidence fields
  const highConfidence = [
    result.name.confidence >= 0.6,
    result.dob.confidence >= 0.6,
    result.weight_kg.confidence >= 0.6,
    result.height_cm.confidence >= 0.6,
    result.glucose_mgdl.confidence >= 0.6,
    result.carbs_g.confidence >= 0.6
  ].filter(Boolean).length;

  console.log(`\n📈 Summary: ${highConfidence}/6 critical fields have good confidence (≥60%)`);
  console.log('===================\n');
}

/**
 * Create an empty result for error cases
 */
function createEmptyResult(): ParseResult {
  return {
    name: { value: null, confidence: 0, source: 'fallback' },
    dob: { value: null, confidence: 0, source: 'fallback' },
    weight_kg: { value: null, confidence: 0, source: 'fallback' },
    height_cm: { value: null, confidence: 0, source: 'fallback' },
    glucose_mgdl: { value: null, confidence: 0, source: 'fallback' },
    carbs_g: { value: null, confidence: 0, source: 'fallback' }
  };
}

/**
 * Validate parsed data for completeness
 */
export function validateParsedData(result: ParseResult): {
  isComplete: boolean;
  missingCritical: string[];
  lowConfidenceFields: string[];
  requiresReview: boolean;
} {
  const missingCritical: string[] = [];
  const lowConfidenceFields: string[] = [];

  const criticalFields = ['name', 'dob', 'weight_kg', 'height_cm', 'glucose_mgdl'];

  criticalFields.forEach(field => {
    const data = result[field as keyof ParseResult] as any;
    if (!data.value) {
      missingCritical.push(field);
    } else if (data.confidence < 0.6) {
      lowConfidenceFields.push(field);
    }
  });

  return {
    isComplete: missingCritical.length === 0,
    missingCritical,
    lowConfidenceFields,
    requiresReview: lowConfidenceFields.length > 0
  };
}
