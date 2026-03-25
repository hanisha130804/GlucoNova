import { useState, useCallback, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, FileText, X, Check, Activity, Droplet, Pill, Mic, Heart, Utensils, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';

// VERSION: 2.0.1 - Fixed input focus issue with useMemo

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
  isMandatory?: boolean; // New prop to control if modal can be closed/skipped
}

interface HealthData {
  name: string;
  dob: string;
  weight: string;
  height: string;
  lastA1c: string;
  medications: string;
  typicalInsulin: string;
  targetRange: string;
  lastA1cKnown?: boolean; // Track if user knows their A1c
}

export default function OnboardingModal({ isOpen, onClose, onComplete, onSkip, isMandatory = false }: OnboardingModalProps) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

    const handleInputChange = useCallback((field: keyof HealthData, value: string) => {
    console.log('�� Input changed:', field, '=', value);
    setHealthData(prev => {
      const updated = { ...prev, [field]: value };
      console.log('📝 Updated healthData:', updated);
      return updated;
    });
  }, []);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showParser, setShowParser] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showExistingReports, setShowExistingReports] = useState(false);
  const [healthData, setHealthData] = useState<HealthData>({
    name: '',
    dob: '',
    weight: '',
    height: '',
    lastA1c: '',
    medications: '',
    typicalInsulin: '',
    targetRange: '70-180',
    lastA1cKnown: true, // Default: user knows their A1c
  });
  // Track which fields were auto-filled from the report
  const [extractedFields, setExtractedFields] = useState<Set<keyof HealthData>>(new Set());
  // Track extraction failure
  const [extractionFailed, setExtractionFailed] = useState(false);
  // DEBUG: Track raw server response for debugging
  const [debugServerResponse, setDebugServerResponse] = useState<any>(null);
  // Track field metadata (confidence and source)
  const [fieldMetadata, setFieldMetadata] = useState<Record<string, { confidence: number; source: string }>>({});
  // Track diabetes type detection
  const [diabetesType, setDiabetesType] = useState<string>('');
  const [diabetesTypeConfidence, setDiabetesTypeConfidence] = useState<number>(0);
  const [diabetesTypeReasons, setDiabetesTypeReasons] = useState<string[]>([]);
  const [manualDiabetesType, setManualDiabetesType] = useState<string>('');
  const { toast } = useToast();

  // Helper component to render field with confidence indicator  
  const FieldWithConfidence = ({ 
    fieldName, 
    label, 
    type = 'text', 
    placeholder,
    skipIfNotKnown = false
  }: { 
    fieldName: keyof HealthData; 
    label: string; 
    type?: string; 
    placeholder?: string;
    skipIfNotKnown?: boolean;
  }) => {
    // Skip rendering if this is A1c and user selected "I don't know"
    if (skipIfNotKnown && fieldName === 'lastA1c' && !healthData.lastA1cKnown) {
      return null;
    }
    
    const metadata = fieldMetadata[fieldName];
    const isExtracted = extractedFields.has(fieldName);
    const isLowConfidence = metadata && metadata.confidence < 0.5;
    const fieldValue = healthData[fieldName];
    
    // Skip if field is boolean (like lastA1cKnown)
    if (typeof fieldValue === 'boolean') {
      return null;
    }
    
    return (
      <div>
        <div className="flex items-center gap-1 mb-1">
          <Label className="text-xs text-muted-foreground">
            {label} {isExtracted ? '✓' : '*'}
          </Label>
          {metadata && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <div>Source: <span className="font-semibold">{metadata.source.toUpperCase()}</span></div>
                  <div>Confidence: <span className="font-semibold">{(metadata.confidence * 100).toFixed(0)}%</span></div>
                  {isLowConfidence && (
                    <div className="text-yellow-400">⚠️ Low confidence - please verify</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <Input
          type={type}
          value={fieldValue as string}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          className={`h-9 border-input text-foreground text-sm ${
            isExtracted 
              ? isLowConfidence 
                ? 'bg-yellow-500/10 border-yellow-500/30' 
                : 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-secondary'
          }`}
          placeholder={placeholder}
          data-testid={`input-${fieldName}`}
        />
        {isExtracted && (
          <p className={`text-xs mt-1 ${
            isLowConfidence 
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {isLowConfidence ? '⚠️ Auto-filled (low confidence)' : '✓ Auto-filled from report'}
          </p>
        )}
      </div>
    );
  };

  // DEBUG: Log whenever healthData changes
  useEffect(() => {
    console.log('====== healthData state changed ======');
    console.log('New healthData:', healthData);
    console.log('extractedFields:', Array.from(extractedFields));
    console.log('extractionFailed:', extractionFailed);
    console.log('showParser:', showParser);
    console.log('======================================');
  }, [healthData, extractedFields, extractionFailed, showParser]);

  // CRITICAL DEBUG: Log when Step 3 form renders
  useEffect(() => {
    if (step === 3 && showParser) {
      console.log('🎯🎯🎯 STEP 3 FORM IS NOW VISIBLE 🎯🎯🎯');
      console.log('Current healthData in form:');
      console.log('  name:', healthData.name, '(length:', healthData.name?.length, ')');
      console.log('  dob:', healthData.dob, '(length:', healthData.dob?.length, ')');
      console.log('  weight:', healthData.weight, '(length:', healthData.weight?.length, ')');
      console.log('  height:', healthData.height, '(length:', healthData.height?.length, ')');
      console.log('  typicalInsulin:', healthData.typicalInsulin, '(length:', healthData.typicalInsulin?.length, ')');
      console.log('extractedFields Set contains:');
      console.log('  has name?', extractedFields.has('name'));
      console.log('  has weight?', extractedFields.has('weight'));
      console.log('  has typicalInsulin?', extractedFields.has('typicalInsulin'));
      console.log('  All fields:', Array.from(extractedFields));
      console.log('🚨 IF FIELDS ARE EMPTY STRINGS BUT extractedFields HAS THEM, STATE UPDATE BUG!');
      console.log('🚨 IF FIELDS HAVE VALUES BUT extractedFields IS EMPTY, THRESHOLD ISSUE!');
    }
  }, [step, showParser, healthData, extractedFields]);

  // Debug logging
  useEffect(() => {
    console.log('=== OnboardingModal Render ===' );
    console.log('isOpen:', isOpen);
    console.log('isMandatory:', isMandatory);
    console.log('step:', step);
  }, [isOpen, isMandatory, step]);

  // Fetch existing medical reports
  const { data: reportsData, isLoading: isLoadingReports } = useQuery<{ reports: any[] }>({
    queryKey: ['/api/reports'],
    enabled: isOpen && showExistingReports,
  });

  const progress = (step / 5) * 100;

  const handleFileUpload = useCallback((file: File) => {
    if (file.type === 'application/pdf' || file.type === 'image/jpeg' || file.type === 'image/png') {
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: t('onboarding.messages.fileTooLarge'),
          description: t('onboarding.messages.fileSizeLimit'),
          variant: 'destructive',
        });
        return;
      }
      setUploadedFile(file);
      
      // Send file to server for actual PDF parsing
      const parseFile = async () => {
        try {
          console.log('=== Uploading and parsing file ===');
          console.log('File name:', file.name);
          console.log('File type:', file.type);
          console.log('File size:', file.size, 'bytes');
          
          const formData = new FormData();
          formData.append('file', file);
          
          const token = localStorage.getItem('token');
          
          // STEP 1: Upload file to server first
          console.log('📤 Step 1: Uploading file...');
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);
          uploadFormData.append('skipDbSave', 'true'); // Skip database save during onboarding
          
          const uploadResponse = await fetch('/api/reports/upload', {
            method: 'POST',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            },
            body: uploadFormData,
          });
          
          if (!uploadResponse.ok) {
            const uploadErrorData = await uploadResponse.json().catch(() => ({ message: 'Upload failed' }));
            console.error('❌ Upload failed:', uploadResponse.status, uploadErrorData);
            throw new Error(`Upload failed: ${uploadErrorData.message}`);
          }
          
          const uploadData = await uploadResponse.json();
          console.log('✅ Upload successful:', uploadData);
          
          // STEP 2: Parse file for data extraction
          console.log('📄 Step 2: Parsing file for data extraction...');
          const parseFormData = new FormData();
          parseFormData.append('file', file);
          
          const response = await fetch('/api/reports/parse', {
            method: 'POST',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            },
            body: parseFormData,
          });
          
          if (!response.ok) {
            throw new Error('Failed to parse document');
          }
          
          const parsedData = await response.json();
          
          // CRITICAL: Store raw server response for debugging UI
          setDebugServerResponse(parsedData);
          
          console.log('=== Parsed data received ===');
          console.log('Parsed data:', parsedData);
          console.log('Raw JSON:', JSON.stringify(parsedData, null, 2));
          console.log('Response keys:', Object.keys(parsedData));
          console.log('Number of keys:', Object.keys(parsedData).length);
          
          // Log each field in detail
          Object.entries(parsedData).forEach(([key, field]: [string, any]) => {
            console.log(`\n--- Field: ${key} ---`);
            console.log('  Type:', typeof field);
            console.log('  Is object:', typeof field === 'object');
            console.log('  Is null:', field === null);
            console.log('  Raw value:', field);
            if (typeof field === 'object' && field !== null) {
              console.log('  field.value:', field.value);
              console.log('  field.confidence:', field.confidence);
              console.log(`  SUMMARY: value='${field.value}', confidence=${field.confidence}`);
            }
          });
          
          // Track which fields were successfully extracted (confidence >= 0.35)
          const extracted = new Set<keyof HealthData>();
          const metadata: Record<string, { confidence: number; source: string }> = {};
          const CONFIDENCE_THRESHOLD = 0.35; // Lowered from 0.4 to 0.35 for more inclusive extraction
          
          // Check if extraction completely failed
          const hasAnyData = Object.values(parsedData).some(
            (field: any) => field?.value && field?.confidence >= CONFIDENCE_THRESHOLD
          );
          
          console.log('Has any valid extracted data:', hasAnyData);
          
          // Build updated data object from extracted fields
          // Start with a fresh object to avoid stale state issues
          const updatedData: HealthData = {
            name: '',
            dob: '',
            weight: '',
            height: '',
            lastA1c: '',
            medications: '',
            typicalInsulin: '',
            targetRange: '70-180',
            lastA1cKnown: true,
          };
          
          console.log('Processing parsed fields...');
          console.log('CONFIDENCE_THRESHOLD:', CONFIDENCE_THRESHOLD);
          
          // Helper to extract and track field
          const processField = (fieldName: keyof HealthData, apiFieldName: string, formatValue?: (v: any) => string) => {
            // Skip lastA1cKnown field - it's not extracted from API
            if (fieldName === 'lastA1cKnown') {
              return;
            }
            
            const fieldData = parsedData[apiFieldName];
            console.log(`\n=== Processing ${fieldName.toUpperCase()} ===`);
            console.log(`${apiFieldName} exists:`, !!fieldData);
            
            if (fieldData && typeof fieldData === 'object') {
              console.log(`${apiFieldName}.value:`, fieldData.value);
              console.log(`${apiFieldName}.confidence:`, fieldData.confidence);
              console.log(`${apiFieldName}.source:`, fieldData.source);
              
              if (fieldData.value !== null && fieldData.value !== undefined && fieldData.confidence >= CONFIDENCE_THRESHOLD) {
                const value = formatValue ? formatValue(fieldData.value) : String(fieldData.value).trim();
                (updatedData as any)[fieldName] = value;
                extracted.add(fieldName);
                metadata[fieldName] = {
                  confidence: fieldData.confidence,
                  source: fieldData.source || 'ml'
                };
                console.log(`✅ ${fieldName} extracted: '${value}' (confidence: ${fieldData.confidence}, source: ${fieldData.source})`);
              } else {
                console.log(`❌ ${fieldName} NOT extracted - failed confidence or value check`);
              }
            } else {
              console.log(`❌ ${fieldName} field missing or not an object`);
            }
          };
          
          // Process all fields with new API format
          processField('name', 'name');
          processField('dob', 'dob');
          processField('weight', 'weight_kg'); // API returns weight_kg
          processField('height', 'height_cm'); // API returns height_cm
          processField('lastA1c', 'a1c_percent'); // API returns a1c_percent
          processField('medications', 'medications');
          // Try to extract insulin from insulin_regimen or typical_daily_insulin_units
          if (!updatedData.typicalInsulin) {
            const insulinRegimen = parsedData['insulin_regimen'];
            if (insulinRegimen && insulinRegimen.value && insulinRegimen.confidence >= CONFIDENCE_THRESHOLD) {
              // Try to extract numeric value from regimen (e.g., "24 units" -> "24")
              const match = String(insulinRegimen.value).match(/\d+/);
              if (match) {
                updatedData.typicalInsulin = match[0];
                extracted.add('typicalInsulin');
                metadata['typicalInsulin'] = {
                  confidence: insulinRegimen.confidence,
                  source: insulinRegimen.source || 'regex'
                };
              }
            }
          }
          processField('targetRange', 'targetRange');
          
          // Save extracted name to localStorage for dashboard welcome message
          if (parsedData.name?.value && parsedData.name.confidence >= CONFIDENCE_THRESHOLD) {
            localStorage.setItem('extractedPatientName', parsedData.name.value);
            console.log('Saved extracted patient name:', parsedData.name.value);
          }
          
          // Extract diabetes type if available
          if (parsedData.diabetes_type) {
            const dtValue = parsedData.diabetes_type.value;
            const dtConfidence = parsedData.diabetes_type.confidence || 0;
            const dtReasons = parsedData.diabetes_type.reasons || [];
            
            console.log('Diabetes type detected:', dtValue, 'confidence:', dtConfidence);
            setDiabetesType(dtValue);
            setDiabetesTypeConfidence(dtConfidence);
            setDiabetesTypeReasons(dtReasons);
            setManualDiabetesType(dtValue); // Pre-select the detected type
          }
          
          console.log('=== Final Extraction Summary ===');
          console.log('Total fields extracted:', extracted.size);
          console.log('Extracted fields:', Array.from(extracted).join(', '));
          console.log('Field metadata:', metadata);
          console.log('Updated health data:', updatedData);
          console.log('About to update state...');
          
          // CRITICAL: Update state in specific order to prevent race conditions
          // React 18+ will batch these automatically, but order matters for debugging
          
          // Step 1: Set extracted fields first (for visual indicators)
          setExtractedFields(extracted);
          
          // Step 2: Set field metadata (confidence and source)
          setFieldMetadata(metadata);
          
          // Step 3: Set extraction failed flag
          setExtractionFailed(extracted.size === 0);
          
          // Step 4: Set health data (this triggers form input values to update)
          setHealthData(updatedData);
          
          console.log('State updated, current healthData should be:', updatedData);
          console.log('Extracted fields set should be:', Array.from(extracted));
          
          // Step 4: Show parser form LAST - after all data is set
          setShowParser(true);
          
          const extractedFieldCount = extracted.size;
          if (extractedFieldCount === 0) {
            toast({
              title: t('onboarding.messages.parsingFailed'),
              description: 'No fields could be automatically extracted. Please fill in your information manually.',
              variant: 'default',
            });
          } else {
            toast({
              title: t('onboarding.messages.parsingSuccess'),
              description: t('onboarding.messages.parsingSuccessDesc', { count: extractedFieldCount }),
              variant: 'default',
            });
          }
        } catch (error) {
          console.error('PDF parsing error:', error);
          setShowParser(true);
          setExtractionFailed(true);
          toast({
            title: t('onboarding.messages.parsingFailed'),
            description: 'Could not extract data from report. Please fill in the fields manually.',
            variant: 'destructive',
          });
        }
      };
      
      parseFile();
    } else {
      toast({
        title: t('onboarding.messages.invalidFileType'),
        description: t('onboarding.messages.supportedFileTypes'),
        variant: 'destructive',
      });
    }
  }, [toast, t]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleUseSample = () => {
    console.log('📊 Using sample/demo data');
    
    const sampleData: HealthData = {
      name: 'Jane Smith',
      dob: '1985-03-20',
      weight: '68',
      height: '165',
      lastA1c: '7.2',
      medications: 'Insulin Glargine',
      typicalInsulin: '18',
      targetRange: '70-180',
    };
    
    // Mark all fields as extracted
    const allFields = new Set<keyof HealthData>([
      'name', 'dob', 'weight', 'height', 'lastA1c', 'medications', 'typicalInsulin', 'targetRange'
    ]);
    
    setExtractedFields(allFields);
    setExtractionFailed(false);
    setHealthData(sampleData);
    setShowParser(true);
    
    console.log('Sample data set:', sampleData);
    console.log('Extracted fields:', Array.from(allFields));
    
    toast({
      title: 'Demo Data Loaded',
      description: 'Sample health data has been populated. You can edit any field.',
      variant: 'default',
    });
  };

  const handleManualEntry = () => {
    setShowParser(false);
    setShowExistingReports(false);
    setStep(4);
  };

  const handleSelectExistingReport = () => {
    setShowExistingReports(true);
  };

  const handleReportSelection = async (reportId: string) => {
    try {
      setSelectedReportId(reportId);
      
      // Fetch patient details from the selected report
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/reports/${reportId}/patient`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patient details');
      }

      const data = await response.json();
      
      // Also try to parse the file to get health data
      const reportFile = reportsData?.reports.find(r => r._id === reportId);
      if (reportFile && reportFile.fileUrl) {
        try {
          // Fetch the file and parse it
          const fileResponse = await fetch(reportFile.fileUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (fileResponse.ok) {
            const blob = await fileResponse.blob();
            const file = new File([blob], reportFile.fileName, { type: reportFile.fileType });
            
            // Parse the file
            const parseFormData = new FormData();
            parseFormData.append('file', file);
            
            const parseResponse = await fetch('/api/reports/parse', {
              method: 'POST',
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
              },
              body: parseFormData,
            });
            
            if (parseResponse.ok) {
              const parsedData = await parseResponse.json();
              
              // Update health data with parsed values
              // Handle both { value, confidence } format and direct string values
              const extractValue = (field: any) => {
                if (!field) return '';
                return field.value || field;
              };
              
              const CONFIDENCE_THRESHOLD = 0.4; // Match main upload threshold
              const extracted = new Set<keyof HealthData>();
              
              // Start with a fresh object to avoid stale state issues
              const updatedData: HealthData = {
                name: '',
                dob: '',
                weight: '',
                height: '',
                lastA1c: '',
                medications: '',
                typicalInsulin: '',
                targetRange: '70-180',
              };
              
              if (parsedData.name) {
                const value = extractValue(parsedData.name);
                const confidence = parsedData.name?.confidence || 1;
                if (value && confidence >= CONFIDENCE_THRESHOLD) {
                  updatedData.name = value;
                  extracted.add('name');
                }
              }
              if (!updatedData.name && data.patient.name) {
                updatedData.name = data.patient.name;
                extracted.add('name');
              }
              
              if (parsedData.dob) {
                const value = extractValue(parsedData.dob);
                const confidence = parsedData.dob?.confidence || 1;
                if (value && confidence >= CONFIDENCE_THRESHOLD) {
                  updatedData.dob = value;
                  extracted.add('dob');
                }
              }
              
              if (parsedData.weight_kg) {
                const value = extractValue(parsedData.weight_kg);
                const confidence = parsedData.weight_kg?.confidence || 1;
                if (value && confidence >= CONFIDENCE_THRESHOLD) {
                  updatedData.weight = value;
                  extracted.add('weight');
                }
              }
              
              if (parsedData.height_cm) {
                const value = extractValue(parsedData.height_cm);
                const confidence = parsedData.height_cm?.confidence || 1;
                if (value && confidence >= CONFIDENCE_THRESHOLD) {
                  updatedData.height = value;
                  extracted.add('height');
                }
              }
              
              if (parsedData.a1c_percent) {
                const value = extractValue(parsedData.a1c_percent);
                const confidence = parsedData.a1c_percent?.confidence || 1;
                if (value && confidence >= CONFIDENCE_THRESHOLD) {
                  updatedData.lastA1c = value;
                  extracted.add('lastA1c');
                }
              }
              
              if (parsedData.medications) {
                const value = extractValue(parsedData.medications);
                const confidence = parsedData.medications?.confidence || 1;
                if (value && confidence >= CONFIDENCE_THRESHOLD) {
                  updatedData.medications = value;
                  extracted.add('medications');
                }
              }
              
              if (parsedData.insulin_regimen) {
                const value = extractValue(parsedData.insulin_regimen);
                const confidence = parsedData.insulin_regimen?.confidence || 1;
                console.log('Insulin extraction - Value:', value, 'Confidence:', confidence, 'Threshold:', CONFIDENCE_THRESHOLD);
                if (value && confidence >= CONFIDENCE_THRESHOLD) {
                  // Try to extract numeric value from regimen (e.g., "24 units" -> "24")
                  const match = String(value).match(/\d+/);
                  if (match) {
                    updatedData.typicalInsulin = match[0];
                    extracted.add('typicalInsulin');
                    console.log('✅ Insulin data extracted successfully:', match[0]);
                  }
                } else {
                  console.log('⚠️ Insulin data below confidence threshold or empty');
                }
              }
              
              if (parsedData.targetRange) {
                const value = extractValue(parsedData.targetRange);
                const confidence = parsedData.targetRange?.confidence || 1;
                if (value && confidence >= CONFIDENCE_THRESHOLD) {
                  updatedData.targetRange = value;
                  extracted.add('targetRange');
                }
              }
              
              setHealthData(updatedData);
              setExtractedFields(extracted);
              
              // Log extraction summary
              console.log('=== Extraction Summary ===');
              console.log('Total fields extracted:', extracted.size);
              console.log('Extracted fields:', Array.from(extracted).join(', '));
              console.log('Updated health data:', updatedData);
              
              // Show toast with extraction results
              if (extracted.size > 0) {
                toast({
                  title: t('onboarding.messages.parsingSuccess'),
                  description: t('onboarding.messages.parsingSuccessDesc', { count: extracted.size }),
                });
              } else {
                toast({
                  title: t('onboarding.messages.parsingPartial'),
                  description: 'No fields could be automatically extracted. Please fill in manually.',
                  variant: 'default',
                });
              }
            } else {
              console.error('Parse response not OK:', parseResponse.status, parseResponse.statusText);
              const errorText = await parseResponse.text();
              console.error('Parse error details:', errorText);
              toast({
                title: t('onboarding.messages.parsingFailed'),
                description: 'Could not parse the report. Please fill in the fields manually.',
                variant: 'destructive',
              });
            }
          }
        } catch (parseError) {
          console.error('Error parsing report file:', parseError);
          // Fall back to just using patient data
          setHealthData(prev => ({
            ...prev,
            name: data.patient.name || prev.name,
          }));
        }
      } else {
        // Just use patient data if file parsing is not available
        setHealthData(prev => ({
          ...prev,
          name: data.patient.name || prev.name,
        }));
      }
      
      setShowParser(true);
      setShowExistingReports(false);
      
      toast({
        title: t('onboarding.messages.reportLoaded'),
        description: t('onboarding.messages.reportLoadedDesc'),
      });
    } catch (error) {
      console.error('Error loading report:', error);
      toast({
        title: t('common.error'),
        description: t('onboarding.messages.loadPatientFailed'),
        variant: 'destructive',
      });
    }
  };

  const validateData = () => {
    if (!healthData.name.trim()) {
      toast({
        title: t('onboarding.messages.nameRequired'),
        description: t('onboarding.messages.nameRequiredDesc'),
        variant: 'destructive',
      });
      return false;
    }
    if (!healthData.dob) {
      toast({
        title: t('onboarding.messages.dobRequired'),
        description: t('onboarding.messages.dobRequiredDesc'),
        variant: 'destructive',
      });
      return false;
    }
    if (!healthData.weight || parseFloat(healthData.weight) <= 0) {
      toast({
        title: t('onboarding.messages.validWeightRequired'),
        description: t('onboarding.messages.validWeightRequiredDesc'),
        variant: 'destructive',
      });
      return false;
    }
    if (!healthData.height || parseFloat(healthData.height) <= 0) {
      toast({
        title: t('onboarding.messages.validHeightRequired'),
        description: t('onboarding.messages.validHeightRequiredDesc'),
        variant: 'destructive',
      });
      return false;
    }
    // A1c is optional if user selects "I don't know my HbA1c"
    if (healthData.lastA1cKnown && (!healthData.lastA1c || parseFloat(healthData.lastA1c) <= 0)) {
      toast({
        title: 'HbA1c Required',
        description: 'Please enter your HbA1c value (e.g., 7.2) or select "I don\'t know my HbA1c" to skip.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleNextStep = async () => {
    // Validate before moving from step 3 (parser) or step 4 (manual) to step 5
    if ((step === 3 && showParser) || step === 4) {
      if (!validateData()) {
        return;
      }
    }
    
    if (step < 5) {
      setStep(step + 1);
    } else {
      try {
        const profileData = {
          dateOfBirth: healthData.dob,
          weight: parseFloat(healthData.weight),
          height: parseFloat(healthData.height),
          lastA1c: healthData.lastA1c ? parseFloat(healthData.lastA1c) : undefined,
          medications: healthData.medications ? [healthData.medications] : [], // Send as array for schema compatibility
          typicalInsulin: healthData.typicalInsulin ? parseFloat(healthData.typicalInsulin) : undefined,
          targetRange: healthData.targetRange || undefined,
          diabetesType: manualDiabetesType || undefined, // Save selected diabetes type
        };

        console.log('=== Saving Profile Data ===');
        console.log('Profile data:', profileData);

        // Save user profile data to the database
        let savedProfile;
        try {
          const token = localStorage.getItem('token');
          const skipAuth = localStorage.getItem('skipAuth');
          
          const profileResponse = await fetch('/api/profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify(profileData),
          });
          
          if (!profileResponse.ok) {
            throw new Error(`Profile save failed: ${profileResponse.status}`);
          }
          
          savedProfile = await profileResponse.json();
          console.log('Profile created:', savedProfile);
        } catch (error: any) {
          // If profile already exists (409), update it instead
          if (error.message.includes('409')) {
            const token = localStorage.getItem('token');
            const updateResponse = await fetch('/api/profile', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
              },
              body: JSON.stringify(profileData),
            });
            
            if (!updateResponse.ok) {
              throw new Error(`Profile update failed: ${updateResponse.status}`);
            }
            
            savedProfile = await updateResponse.json();
            console.log('Profile updated:', savedProfile);
          } else {
            throw error;
          }
        }

        // Also save initial health data reading
        try {
          const token = localStorage.getItem('token');
          const healthResponse = await fetch('/api/health-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify({
              glucose: 100,
              insulin: parseFloat(healthData.typicalInsulin) || 0,
              carbs: 0,
              activityLevel: 'moderate',
              notes: 'Initial reading after onboarding',
            }),
          });
          
          if (healthResponse.ok) {
            await healthResponse.json();
          }
        } catch (error) {
          console.warn('Failed to save initial health reading:', error);
        }

        localStorage.setItem('onboardingCompleted', 'true');
        
        console.log('=== Invalidating Dashboard Queries ===');
        // Invalidate all queries to refresh dashboard data in real-time
        await queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/health-data'] });
        console.log('Dashboard queries invalidated - data will refresh automatically');
        
        // Generate AI diabetes summary based on profile data
        try {
          console.log('=== Generating AI Diabetes Summary ===');
          const token = localStorage.getItem('token');
          const aiSummaryData = {
            patient_name: healthData.name,
            date_of_birth: healthData.dob,
            weight_kg: healthData.weight ? parseFloat(healthData.weight) : undefined,
            height_cm: healthData.height ? parseFloat(healthData.height) : undefined,
            hba1c_percent: healthData.lastA1c ? parseFloat(healthData.lastA1c) : undefined,
            lastA1c: healthData.lastA1c ? parseFloat(healthData.lastA1c) : undefined,
            typical_daily_insulin_units: healthData.typicalInsulin ? parseFloat(healthData.typicalInsulin) : undefined,
            medications: healthData.medications ? [healthData.medications] : [],
            target_range: healthData.targetRange,
          };
          
          const aiSummaryResponse = await fetch('/api/ai/diabetes-summary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify(aiSummaryData),
          });
          
          if (aiSummaryResponse.ok) {
            const diabetesSummary = await aiSummaryResponse.json();
            console.log('AI Diabetes Summary Generated:', diabetesSummary);
            // Store the summary in localStorage for the dashboard to display
            localStorage.setItem('diabetesSummary', JSON.stringify(diabetesSummary));
            // Invalidate AI insights queries
            await queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
          } else {
            console.warn('Failed to generate AI summary:', await aiSummaryResponse.json());
          }
        } catch (error) {
          console.warn('Error generating AI diabetes summary:', error);
          // Don't block the onboarding flow if AI summary fails
        }
        
        toast({
          title: t('onboarding.messages.profileCreated'),
          description: t('onboarding.messages.healthDataSaved'),
        });
        
        onComplete();
        // Navigate to dashboard after a brief delay to allow modal to close
        setTimeout(() => navigate('/dashboard'), 300);
      } catch (error) {
        toast({
          title: t('onboarding.messages.saveProfileError'),
          description: t('onboarding.messages.saveProfileErrorDesc'),
          variant: 'destructive',
        });
      }
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboardingSkipped', 'true');
    onSkip();
  };


  // Handle "Upload Another Report" - reset Step 3 and go back to upload
  const handleUploadAnotherReport = () => {
    console.log('🔄 User clicked "Upload Another Report" - resetting Step 3...');
    
    // Reset all parsed data
    setHealthData({
      name: '',
      dob: '',
      weight: '',
      height: '',
      lastA1c: '',
      medications: '',
      typicalInsulin: '',
      targetRange: '70-180',
      lastA1cKnown: true,
    });
    
    // Clear extracted fields and metadata
    setExtractedFields(new Set());
    setFieldMetadata({});
    setExtractionFailed(false);
    setDebugServerResponse(null);
    setUploadedFile(null);
    
    // Reset diabetes type detection
    setDiabetesType('');
    setDiabetesTypeConfidence(0);
    setDiabetesTypeReasons([]);
    setManualDiabetesType('');
    
    // Reset parser view
    setShowParser(false);
    
    // Show toast feedback
    toast({
      title: 'Upload Reset',
      description: 'Previous report discarded. Please upload a new medical report.',
    });
    
    console.log('✅ Step 3 reset complete - ready for new upload');
  };

  return (
    <TooltipProvider>
    <Dialog open={isOpen} onOpenChange={isMandatory ? undefined : onClose}>
      <DialogContent 
        className="glass-card"
        hideCloseButton={isMandatory}
        style={{ 
          width: '640px', 
          height: '460px', 
          maxWidth: '90vw', 
          padding: '28px',
          zIndex: isMandatory ? 9999 : 1000 // Ensure modal is always on top, higher when mandatory
        }}
        data-testid="dialog-onboarding"
        onPointerDownOutside={(e) => isMandatory && e.preventDefault()}
        onEscapeKeyDown={(e) => isMandatory && e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>{t('onboarding.stepTitle', { step, total: 5 })}</DialogTitle>
          <DialogDescription>{t('onboarding.stepDescription')}</DialogDescription>
        </VisuallyHidden>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{t('onboarding.stepProgress', { step, total: 5 })}</span>
            {!isMandatory && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground"
                data-testid="button-skip"
              >
                {t('onboarding.skipForNow')}
              </Button>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">{t('onboarding.welcome.title')}</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              {t('onboarding.welcome.description')}
            </p>
            <Button 
              onClick={handleNextStep}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-next-step"
            >
              {t('onboarding.welcome.startTour')}
            </Button>
          </div>
        )}

        {/* Step 2: Features Walkthrough */}
        {step === 2 && (
          <div className="flex flex-col flex-1">
            <h2 className="text-xl font-bold mb-2 text-foreground">{t('onboarding.features.title')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t('onboarding.features.description')}</p>
            
            <div className="flex-1 overflow-y-auto space-y-3">
              <Card className="p-3 bg-secondary/50 border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground mb-1">{t('onboarding.features.glucose.title')}</h3>
                    <p className="text-xs text-muted-foreground">{t('onboarding.features.glucose.description')}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-secondary/50 border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Droplet className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground mb-1">{t('onboarding.features.insulin.title')}</h3>
                    <p className="text-xs text-muted-foreground">{t('onboarding.features.insulin.description')}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-secondary/50 border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Utensils className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground mb-1">{t('onboarding.features.meal.title')}</h3>
                    <p className="text-xs text-muted-foreground">{t('onboarding.features.meal.description')}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-secondary/50 border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground mb-1">{t('onboarding.features.medication.title')}</h3>
                    <p className="text-xs text-muted-foreground">{t('onboarding.features.medication.description')}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-secondary/50 border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground mb-1">{t('onboarding.features.doctor.title')}</h3>
                    <p className="text-xs text-muted-foreground">{t('onboarding.features.doctor.description')}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 bg-secondary/50 border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground mb-1">{t('onboarding.features.voice.title')}</h3>
                    <p className="text-xs text-muted-foreground">{t('onboarding.features.voice.description')}</p>
                  </div>
                </div>
              </Card>
            </div>

            <Button
              onClick={handleNextStep}
              className="bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
              data-testid="button-next-features"
            >
              {t('onboarding.features.continueSetup')}
            </Button>
          </div>
        )}

        {/* Step 3: Upload Health Records OR Select Existing */}
        {step === 3 && !showParser && !showExistingReports && (
          <div className="flex flex-col flex-1">
            <h2 className="text-xl font-bold mb-2 text-foreground">{t('onboarding.upload.title')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t('onboarding.upload.description')}</p>
            
            <div
              className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                isDragging ? 'border-primary bg-primary/10' : 'border-border'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="dropzone-upload"
            >
              {uploadedFile ? (
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFile(null)}
                    data-testid="button-remove-file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-foreground mb-2">{t('onboarding.upload.dragDrop')}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t('onboarding.upload.or')}</p>
                  <label htmlFor="file-upload">
                    <Button variant="outline" size="sm" asChild data-testid="button-browse">
                      <span>{t('onboarding.upload.browseFiles')}</span>
                    </Button>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <Button
                variant="outline"
                onClick={handleSelectExistingReport}
                className="flex-1"
                data-testid="button-select-existing"
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('onboarding.upload.selectExisting')}
              </Button>
              <Button
                variant="outline"
                onClick={handleUseSample}
                className="flex-1"
                data-testid="button-use-sample"
              >
                {t('onboarding.upload.useDemoData')}
              </Button>
              <Button
                variant="outline"
                onClick={handleManualEntry}
                className="flex-1"
                data-testid="button-manual-entry"
              >
                {t('onboarding.upload.enterManually')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Select from Existing Reports */}
        {step === 3 && showExistingReports && (
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">{t('onboarding.existing.title')}</h2>
                <p className="text-sm text-muted-foreground">{t('onboarding.existing.description')}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExistingReports(false)}
                data-testid="button-back-to-upload"
              >
                {t('onboarding.existing.back')}
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3">
              {isLoadingReports ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">{t('onboarding.existing.loading')}</p>
                </div>
              ) : reportsData && reportsData.reports && reportsData.reports.length > 0 ? (
                reportsData.reports.map((report: any) => (
                  <Card
                    key={report._id}
                    className="p-4 bg-secondary/50 border-border hover:border-primary/50 cursor-pointer transition-all"
                    onClick={() => handleReportSelection(report._id)}
                    data-testid={`report-card-${report._id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{report.fileName}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                        </p>
                        {report.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {report.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            {report.fileType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(report.fileSize / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-foreground mb-2">{t('onboarding.existing.noReports')}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t('onboarding.existing.uploadToStart')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExistingReports(false)}
                    data-testid="button-upload-new"
                  >
                    {t('onboarding.existing.uploadNew')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Parser Results */}
        {step === 3 && showParser && (
          <div className="flex flex-col flex-1 h-full overflow-hidden">
            {/* Header - fixed */}
            <div className="flex-shrink-0 flex items-start justify-between mb-3 pb-3 border-b border-border">
              <div className="min-w-0 flex-1 pr-3">
                <h2 className="text-lg font-bold text-foreground">{t('onboarding.confirm.title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {uploadedFile ? 
                    `Review the extracted data from "${uploadedFile.name}". Fields highlighted are auto-filled. Please confirm or edit.` : 
                    'Please review and confirm your information.'}
                </p>
              </div>
              {uploadedFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUploadAnotherReport}
                  className="text-xs text-muted-foreground hover:text-foreground whitespace-nowrap flex-shrink-0 ml-2 h-8"
                  data-testid="button-upload-another"
                  title="Upload a different medical report"
                >
                  ↺ Upload Different
                </Button>
              )}
            </div>
            
            {/* Body - scrollable */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <FieldWithConfidence 
                  fieldName="name" 
                  label={t('onboarding.form.name')} 
                  placeholder="Enter your full name" 
                />
                <FieldWithConfidence 
                  fieldName="dob" 
                  label={t('onboarding.form.dob')} 
                  type="date" 
                />
                <FieldWithConfidence 
                  fieldName="weight" 
                  label={`${t('onboarding.form.weight')} (kg)`} 
                  type="number" 
                  placeholder="e.g., 70" 
                />
                <FieldWithConfidence 
                  fieldName="height" 
                  label={`${t('onboarding.form.height')} (cm)`} 
                  type="number" 
                  placeholder="e.g., 170" 
                />
                {/* A1c Field with Special UX */}
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Label className="text-xs text-muted-foreground">
                      Last HbA1c (%)
                      {healthData.lastA1cKnown ? '*' : ''}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="text-xs space-y-2">
                          <div className="font-semibold">What is HbA1c?</div>
                          <div>HbA1c reflects your average blood sugar over the last 3 months.</div>
                          <div>It is usually written like "7.2%" in medical reports.</div>
                          <div>If you don't know your HbA1c, you can skip this field.</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="number"
                    value={healthData.lastA1c}
                    onChange={(e) => handleInputChange('lastA1c', e.target.value)}
                    disabled={!healthData.lastA1cKnown}
                    className={`h-9 border-input text-foreground text-sm ${
                      !healthData.lastA1cKnown ? 'opacity-50 bg-gray-500/10 cursor-not-allowed' : 'bg-secondary'
                    }`}
                    placeholder="e.g., 7.2"
                    data-testid="input-a1c"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={!healthData.lastA1cKnown}
                        onChange={(e) => {
                          setHealthData(prev => ({ 
                            ...prev, 
                            lastA1cKnown: !e.target.checked,
                            lastA1c: !e.target.checked ? prev.lastA1c : '' // Clear if "don't know" is checked
                          }));
                        }}
                        className="rounded"
                        data-testid="checkbox-a1c-unknown"
                      />
                      <span>I don't know my HbA1c</span>
                    </label>
                  </div>
                </div>
                <FieldWithConfidence 
                  fieldName="typicalInsulin" 
                  label={`${t('onboarding.form.insulin')} (U)`} 
                  type="number" 
                  placeholder="Daily units" 
                />
              </div>
              <FieldWithConfidence 
                fieldName="medications" 
                label={t('onboarding.form.medications')} 
                placeholder="List your current medications" 
              />
              
              {/* Diabetes Type Detection */}
              {diabetesType && (
                <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-foreground">Detected Diabetes Type</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400">
                          {diabetesType}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(diabetesTypeConfidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      
                      {diabetesTypeReasons.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Why we think this:</p>
                          <ul className="text-xs space-y-0.5">
                            {diabetesTypeReasons.slice(0, 3).map((reason, idx) => (
                              <li key={idx} className="text-muted-foreground flex items-start gap-1">
                                <span className="text-blue-500 flex-shrink-0">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="mt-3">
                        <Label className="text-xs text-muted-foreground mb-2 block">Confirm or correct your diabetes type:</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {['Type 1', 'Type 2', 'Gestational', 'Other', 'Unknown'].map((type) => (
                            <label
                              key={type}
                              className={`flex items-center gap-1.5 p-1.5 rounded-md border-2 cursor-pointer transition-all text-xs ${
                                manualDiabetesType === type
                                  ? 'border-blue-500 bg-blue-500/10'
                                  : 'border-border hover:border-blue-500/50 bg-secondary/50'
                              }`}
                            >
                              <input
                                type="radio"
                                name="diabetesType"
                                value={type}
                                checked={manualDiabetesType === type}
                                onChange={(e) => setManualDiabetesType(e.target.value)}
                                className="w-3 h-3 flex-shrink-0"
                              />
                              <span className="font-medium text-foreground leading-tight">{type}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Manual Diabetes Type Selection (if not auto-detected) */}
              {!diabetesType && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="mb-2">
                    <Label className="text-xs text-foreground mb-1.5 block">Select your diabetes type (optional):</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      This helps us provide more personalized insulin recommendations.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Type 1', 'Type 2', 'Gestational', 'Other', 'Unknown'].map((type) => (
                      <label
                        key={type}
                        className={`flex items-center gap-1.5 p-1.5 rounded-md border-2 cursor-pointer transition-all text-xs ${
                          manualDiabetesType === type
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 bg-secondary'
                        }`}
                      >
                        <input
                          type="radio"
                          name="diabetesType"
                          value={type}
                          checked={manualDiabetesType === type}
                          onChange={(e) => setManualDiabetesType(e.target.value)}
                          className="w-3 h-3 flex-shrink-0"
                        />
                        <span className="font-medium text-foreground leading-tight">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground mt-1">
                <span className="text-emerald-400">✓</span> = Auto-filled | 
                <span className="text-yellow-400">⚠️</span> = Verify |
                <span className="text-red-400">*</span> = Required
              </div>
            </div>

            {/* Footer - fixed */}
            <div className="flex-shrink-0 border-t border-border pt-2 mt-2">
              <Button
                onClick={handleNextStep}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-sm"
                data-testid="button-confirm"
                disabled={!healthData.name || !healthData.dob || !healthData.weight || !healthData.height || (healthData.lastA1cKnown && !healthData.lastA1c)}
              >
                {t('onboarding.confirm.button')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Manual Entry */}
        {step === 4 && (
          <div className="flex flex-col flex-1">
            <h2 className="text-xl font-bold mb-2 text-foreground">{t('onboarding.manual.title')}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t('onboarding.manual.description')}</p>
            
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">{t('onboarding.form.name')}</Label>
                  <Input
                    value={healthData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="h-9 bg-secondary border-input text-foreground text-sm"
                    data-testid="input-manual-name"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">{t('onboarding.form.dob')}</Label>
                  <Input
                    type="date"
                    value={healthData.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    className="h-9 bg-secondary border-input text-foreground text-sm"
                    data-testid="input-manual-dob"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">{t('onboarding.form.weight')}</Label>
                  <Input
                    type="number"
                    value={healthData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    className="h-9 bg-secondary border-input text-foreground text-sm"
                    data-testid="input-manual-weight"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">{t('onboarding.form.height')}</Label>
                  <Input
                    type="number"
                    value={healthData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    className="h-9 bg-secondary border-input text-foreground text-sm"
                    data-testid="input-manual-height"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">{t('onboarding.form.insulin')}</Label>
                  <Input
                    type="number"
                    value={healthData.typicalInsulin}
                    onChange={(e) => handleInputChange('typicalInsulin', e.target.value)}
                    className="h-9 bg-secondary border-input text-foreground text-sm"
                    placeholder="Daily units"
                    data-testid="input-manual-insulin"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">{t('onboarding.form.targetRange')}</Label>
                  <Input
                    value={healthData.targetRange}
                    onChange={(e) => handleInputChange('targetRange', e.target.value)}
                    className="h-9 bg-secondary border-input text-foreground text-sm"
                    placeholder="e.g., 70-180"
                    data-testid="input-manual-range"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleNextStep}
              className="bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
              data-testid="button-next-manual"
            >
              {t('onboarding.manual.continue')}
            </Button>
          </div>
        )}

        {/* Step 5: Finish */}
        {step === 5 && (
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">{t('onboarding.finish.title')}</h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              {t('onboarding.finish.description')}
            </p>
            <Button 
              onClick={handleNextStep}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="button-go-dashboard"
            >
              {t('onboarding.finish.goToDashboard')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
