import { useState, useEffect, useRef, useMemo } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { 
  Brain,
  Sparkles,
  Search,
  X,
  Save,
  BarChart3,
  Sunrise,
  Sun,
  Moon,
  Coffee,
  Utensils,
  UtensilsCrossed,
  Flame,
  Droplets,
  Wheat,
  Fish,
  Cookie,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Leaf,
  Clock,
  Globe,
  Loader2,
  Mic,
  MicOff,
  Target,
  Zap,
  Volume2,
  Repeat,
  Stethoscope,
  HeartPulse
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n/config';

// Add shake animation CSS
const shakeAnimation = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
  .shake {
    animation: shake 0.5s ease-in-out;
  }
`;

// Inject CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = shakeAnimation;
  if (!document.head.querySelector('style[data-shake-animation]')) {
    style.setAttribute('data-shake-animation', 'true');
    document.head.appendChild(style);
  }
}

type Language = 'EN' | 'HI' | 'KN' | 'TE' | 'TA' | 'MR' | 'BN' | 'GU' | 'ML' | 'PA' | 'OR' | 'AS';
type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type SugarLevel = 'low' | 'medium' | 'high' | 'very high';

// Language code mapping for voice recognition (BCP-47 format)
const LANGUAGE_VOICE_CODES: Record<Language, string> = {
  'EN': 'en-IN',  // Indian English
  'HI': 'hi-IN',  // Hindi
  'KN': 'kn-IN',  // Kannada
  'TE': 'te-IN',  // Telugu
  'TA': 'ta-IN',  // Tamil
  'MR': 'mr-IN',  // Marathi
  'BN': 'bn-IN',  // Bengali
  'GU': 'gu-IN',  // Gujarati
  'ML': 'ml-IN',  // Malayalam
  'PA': 'pa-IN',  // Punjabi
  'OR': 'or-IN',  // Odia
  'AS': 'as-IN',  // Assamese
};

// Indian Food Database (50+ dishes)
const indianFoodDatabase: Record<string, {
  carbs: number;
  protein: number;
  fiber: number;
  calories: number;
  sugar: SugarLevel;
  gi: number;
  region: string;
}> = {
  // HIGH SUGAR IMPACT
  'biryani': { carbs: 85, protein: 18, fiber: 3, calories: 520, sugar: 'high', gi: 75, region: 'north' },
  'pulao': { carbs: 70, protein: 12, fiber: 2, calories: 380, sugar: 'high', gi: 72, region: 'north' },
  'naan': { carbs: 58, protein: 9, fiber: 2, calories: 310, sugar: 'high', gi: 70, region: 'north' },
  'jalebi': { carbs: 95, protein: 3, fiber: 1, calories: 450, sugar: 'very high', gi: 85, region: 'north' },
  'gulab jamun': { carbs: 90, protein: 6, fiber: 1, calories: 420, sugar: 'very high', gi: 82, region: 'all' },
  'rasgulla': { carbs: 88, protein: 8, fiber: 0, calories: 380, sugar: 'very high', gi: 80, region: 'east' },
  'sweet lassi': { carbs: 65, protein: 8, fiber: 0, calories: 320, sugar: 'high', gi: 68, region: 'north' },
  'puri': { carbs: 62, protein: 8, fiber: 2, calories: 350, sugar: 'high', gi: 76, region: 'north' },
  'bhatura': { carbs: 68, protein: 9, fiber: 2, calories: 420, sugar: 'high', gi: 78, region: 'north' },
  'white rice': { carbs: 80, protein: 7, fiber: 1, calories: 350, sugar: 'high', gi: 73, region: 'all' },
  'fried rice': { carbs: 75, protein: 10, fiber: 2, calories: 380, sugar: 'high', gi: 72, region: 'all' },
  'pakora': { carbs: 55, protein: 8, fiber: 3, calories: 320, sugar: 'high', gi: 71, region: 'north' },
  'samosa': { carbs: 60, protein: 7, fiber: 3, calories: 330, sugar: 'high', gi: 70, region: 'north' },
  'aloo paratha': { carbs: 58, protein: 8, fiber: 3, calories: 310, sugar: 'high', gi: 72, region: 'north' },
  'pav bhaji': { carbs: 70, protein: 10, fiber: 4, calories: 380, sugar: 'high', gi: 68, region: 'west' },
  
  // MODERATE SUGAR
  'chapati': { carbs: 45, protein: 8, fiber: 4, calories: 120, sugar: 'medium', gi: 55, region: 'north' },
  'roti': { carbs: 45, protein: 8, fiber: 4, calories: 120, sugar: 'medium', gi: 55, region: 'north' },
  'paratha': { carbs: 50, protein: 7, fiber: 3, calories: 280, sugar: 'medium', gi: 60, region: 'north' },
  'dosa': { carbs: 55, protein: 8, fiber: 2, calories: 250, sugar: 'medium', gi: 58, region: 'south' },
  'idli': { carbs: 40, protein: 10, fiber: 3, calories: 180, sugar: 'medium', gi: 53, region: 'south' },
  'upma': { carbs: 48, protein: 9, fiber: 4, calories: 220, sugar: 'medium', gi: 56, region: 'south' },
  'poha': { carbs: 52, protein: 7, fiber: 3, calories: 240, sugar: 'medium', gi: 59, region: 'west' },
  'vada': { carbs: 50, protein: 12, fiber: 5, calories: 280, sugar: 'medium', gi: 54, region: 'south' },
  'uttapam': { carbs: 52, protein: 9, fiber: 3, calories: 270, sugar: 'medium', gi: 57, region: 'south' },
  'thepla': { carbs: 48, protein: 8, fiber: 4, calories: 210, sugar: 'medium', gi: 55, region: 'west' },
  'dhokla': { carbs: 44, protein: 10, fiber: 3, calories: 200, sugar: 'medium', gi: 52, region: 'west' },
  'khichdi': { carbs: 50, protein: 12, fiber: 5, calories: 260, sugar: 'medium', gi: 54, region: 'all' },
  'pulka': { carbs: 44, protein: 8, fiber: 4, calories: 120, sugar: 'medium', gi: 54, region: 'south' },
  
  // LOW SUGAR
  'curd rice': { carbs: 85, protein: 14, fiber: 2, calories: 450, sugar: 'medium', gi: 65, region: 'south' },
  'dal': { carbs: 20, protein: 12, fiber: 8, calories: 150, sugar: 'low', gi: 25, region: 'all' },
  'moong dal': { carbs: 18, protein: 14, fiber: 9, calories: 140, sugar: 'low', gi: 22, region: 'all' },
  'toor dal': { carbs: 22, protein: 12, fiber: 8, calories: 160, sugar: 'low', gi: 28, region: 'all' },
  'masoor dal': { carbs: 20, protein: 13, fiber: 8, calories: 155, sugar: 'low', gi: 26, region: 'all' },
  'sambar': { carbs: 25, protein: 10, fiber: 6, calories: 180, sugar: 'low', gi: 30, region: 'south' },
  'rasam': { carbs: 15, protein: 5, fiber: 3, calories: 80, sugar: 'low', gi: 20, region: 'south' },
  'palak paneer': { carbs: 12, protein: 25, fiber: 4, calories: 320, sugar: 'low', gi: 18, region: 'north' },
  'paneer tikka': { carbs: 8, protein: 28, fiber: 2, calories: 280, sugar: 'low', gi: 15, region: 'north' },
  'chicken curry': { carbs: 10, protein: 35, fiber: 3, calories: 320, sugar: 'low', gi: 15, region: 'all' },
  'chicken tikka': { carbs: 6, protein: 38, fiber: 2, calories: 280, sugar: 'low', gi: 12, region: 'north' },
  'fish curry': { carbs: 8, protein: 30, fiber: 2, calories: 280, sugar: 'low', gi: 12, region: 'coastal' },
  'egg curry': { carbs: 8, protein: 18, fiber: 3, calories: 220, sugar: 'low', gi: 18, region: 'all' },
  'omelette': { carbs: 3, protein: 15, fiber: 1, calories: 180, sugar: 'low', gi: 10, region: 'all' },
  'boiled egg': { carbs: 1, protein: 13, fiber: 0, calories: 155, sugar: 'low', gi: 8, region: 'all' },
  'vegetable curry': { carbs: 15, protein: 6, fiber: 5, calories: 140, sugar: 'low', gi: 28, region: 'all' },
  'mixed veg': { carbs: 18, protein: 7, fiber: 6, calories: 160, sugar: 'low', gi: 30, region: 'all' },
  'bhindi masala': { carbs: 12, protein: 4, fiber: 5, calories: 110, sugar: 'low', gi: 25, region: 'all' },
  'aloo gobi': { carbs: 22, protein: 5, fiber: 4, calories: 150, sugar: 'low', gi: 35, region: 'north' },
  'cabbage sabzi': { carbs: 10, protein: 3, fiber: 4, calories: 90, sugar: 'low', gi: 20, region: 'all' },
  'sprouted moong': { carbs: 16, protein: 14, fiber: 8, calories: 130, sugar: 'low', gi: 22, region: 'all' },
  'curd': { carbs: 7, protein: 6, fiber: 0, calories: 98, sugar: 'low', gi: 28, region: 'all' },
  'buttermilk': { carbs: 6, protein: 4, fiber: 0, calories: 60, sugar: 'low', gi: 24, region: 'all' },
  'green chutney': { carbs: 5, protein: 2, fiber: 2, calories: 40, sugar: 'low', gi: 15, region: 'all' },
  'raita': { carbs: 8, protein: 5, fiber: 1, calories: 85, sugar: 'low', gi: 26, region: 'all' },
};

// Replacement suggestions
const replacementDatabase: Record<string, Array<{ name: string; carbs: number; protein: number; gi: number; benefit: string }>> = {
  'biryani': [
    { name: 'Quinoa Biryani', carbs: 45, protein: 18, gi: 53, benefit: 'High protein, low GI' },
    { name: 'Cauliflower Rice Biryani', carbs: 15, protein: 14, gi: 20, benefit: '90% less carbs' },
    { name: 'Brown Rice Biryani', carbs: 65, protein: 16, gi: 55, benefit: 'Higher fiber' },
  ],
  'rice': [
    { name: 'Brown Rice', carbs: 55, protein: 6, gi: 55, benefit: 'More fiber' },
    { name: 'Quinoa', carbs: 39, protein: 14, gi: 53, benefit: 'Complete protein' },
    { name: 'Barley', carbs: 44, protein: 8, gi: 28, benefit: 'Lowest GI' },
  ],
  'naan': [
    { name: 'Whole Wheat Chapati', carbs: 45, protein: 8, gi: 55, benefit: 'Higher fiber' },
    { name: 'Bajra Roti', carbs: 42, protein: 10, gi: 48, benefit: 'Rich in minerals' },
    { name: 'Multigrain Bread', carbs: 40, protein: 9, gi: 49, benefit: 'Balanced nutrients' },
  ],
};

// Multilingual food name aliases - maps local language names to English keys
const FOOD_ALIASES: Record<string, string[]> = {
  // Hindi (हिंदी) aliases
  'biryani': ['बिरयानी', 'बिरियानी', 'बिर्यानी'],
  'pulao': ['पुलाव', 'पुलाओ'],
  'chapati': ['चपाती', 'रोटी'],
  'roti': ['रोटी', 'फुल्का', 'रोटि'],
  'dal': ['दाल', 'दल'],
  'moong dal': ['मूंग दाल', 'मूँग दाल'],
  'sambar': ['सांभर', 'साम्बर'],
  'dosa': ['डोसा', 'दोसा'],
  'idli': ['इडली', 'इडलि'],
  'upma': ['उपमा'],
  'poha': ['पोहा', 'पोहे'],
  'paratha': ['पराठा', 'पराँठा'],
  'aloo paratha': ['आलू पराठा', 'आलू का पराठा'],
  'naan': ['नान', 'नाँ'],
  'paneer': ['पनीर'],
  'palak paneer': ['पालक पनीर'],
  'chicken curry': ['चिकन करी', 'मुर्गी करी'],
  'egg curry': ['अंडा करी', 'एग करी'],
  'curd': ['दही'],
  'buttermilk': ['छाछ', 'मट्ठा', 'लस्सी'],
  'raita': ['रायता'],
  'samosa': ['समोसा'],
  'pakora': ['पकोड़ा', 'पकोड़े'],
  'jalebi': ['जलेबी'],
  'gulab jamun': ['गुलाब जामुन'],
  'khichdi': ['खिचड़ी'],
  'puri': ['पूरी', 'पुरी'],
  'bhatura': ['भठूरा', 'भटूरा'],
  
  // Kannada & Telugu aliases merged
  'rice': ['ಅನ್ನ', 'ಅಕ್ಕಿ', 'అన్నం', 'బియ్యం', 'चावल'],
  'white rice': ['ಬಿಳಿ ಅನ್ನ', 'తెల్ల అన్నం'],
  'rasam': ['ರಸಂ', 'ಸಾರು', 'రసం', 'చారు'],
  'vada': ['वडा', 'ವಡೆ', 'ವಡಾ', 'వడ', 'గారెలు'],
  'curd rice': ['ಮೊಸರನ್ನ', 'ತಂಬಳಿ ಅನ್ನ', 'పెరుగు అన్నం', 'దద్దోజనం'],
  'vegetable curry': ['सब्जी करी', 'ತರಕಾರಿ ಪಲ್ಯ', 'కూరగాయల కూర'],
  'fish curry': ['मछली करी', 'ಮೀನು ಸಾರು', 'చేప కూర'],
};

// Function to normalize food name from any language to English key
const normalizeFoodName = (input: string): string => {
  const inputLower = input.toLowerCase().trim();
  
  // Check direct match in English database
  if (indianFoodDatabase[inputLower]) {
    return inputLower;
  }
  
  // Check aliases in all languages
  for (const [englishKey, aliases] of Object.entries(FOOD_ALIASES)) {
    for (const alias of aliases) {
      if (inputLower.includes(alias.toLowerCase()) || alias.toLowerCase().includes(inputLower)) {
        return englishKey;
      }
    }
  }
  
  // Partial match in English database
  for (const key of Object.keys(indianFoodDatabase)) {
    if (inputLower.includes(key) || key.includes(inputLower)) {
      return key;
    }
  }
  
  return inputLower;
};

interface DishItem {
  dishName: string;
  normalizedName: string;
  quantity: number;
  unit: string;
  estimatedWeightGrams: number;
  mainIngredients: string[];
  nutrition: {
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    calories: number;
    glycemicIndex: number | null;
  };
  impactLevel: 'low' | 'medium' | 'high';
}

interface MealAnalysis {
  mealName: string;
  items: DishItem[];
  totals: {
    carbs: number;
    protein: number;
    fat: number;
    calories: number;
    fiber: number;
    overallImpactLevel: 'low' | 'medium' | 'high';
  };
  healthImpact?: {
    category: 'low' | 'medium' | 'high';
    description: string;
  };
  benefits?: string[];
  cautions?: string[];
  alternatives?: string[];
  error?: string;
  message?: string;
}

export default function AIFoodLogPage() {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState<Language>('EN');
  const [mealTiming, setMealTiming] = useState<'AM' | 'PM' | 'EV'>('PM');
  const [inputMode, setInputMode] = useState<'type' | 'voice'>('type');
  const [mealDescription, setMealDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Form fields
  const [portionSize, setPortionSize] = useState('1');
  const [portionUnit, setPortionUnit] = useState('plate');
  const [mealType, setMealType] = useState<MealTime>('lunch');
  const [cookingStyle, setCookingStyle] = useState('');
  
  // New state for sugar alerts and replacements
  const [sugarAlert, setSugarAlert] = useState<{ level: 'low' | 'medium' | 'high'; message: string; gi: number; region: string } | null>(null);
  const [showReplacements, setShowReplacements] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState('Click microphone to describe your meal');
  
  const recognitionRef = useRef<any>(null);

  // Sync language state with i18n
  useEffect(() => {
    const langMap: Record<string, Language> = {
      'en': 'EN',
      'hi': 'HI',
      'kn': 'KN',
      'te': 'TE',
    };
    const mappedLang = langMap[i18n.language] || 'EN';
    setLanguage(mappedLang);
  }, [i18n.language]);

  // Auto-update meal type based on timing
  useEffect(() => {
    if (mealTiming === 'AM') {
      setMealType('breakfast');
    } else if (mealTiming === 'PM') {
      setMealType('lunch');
    } else if (mealTiming === 'EV') {
      setMealType('dinner');
    }
  }, [mealTiming]);

  const { data: recentMeals, isLoading: mealsLoading } = useQuery({
    queryKey: ['/api/ai-food-log/recent'],
  });

  // Fetch user profile for personalized medical feedback
  const { data: profileData } = useQuery<{ profile: any }>({
    queryKey: ['/api/profile'],
  });

  // Fetch recent glucose readings for pattern analysis
  const { data: healthData } = useQuery<{ data: any[] }>({
    queryKey: ['/api/health-data'],
  });

  // Generate personalized medical feedback based on meal analysis and patient data
  const generateMedicalFeedback = (mealAnalysis: MealAnalysis | null): string[] => {
    if (!mealAnalysis) return [];
    
    const feedback: string[] = [];
    const diabetesType = profileData?.profile?.diabetesType || 'Type 2';
    const carbs = mealAnalysis.totals.carbs;
    const fiber = mealAnalysis.totals.fiber;
    const protein = mealAnalysis.totals.protein;
    const impactLevel = mealAnalysis.totals.overallImpactLevel;
    
    // Calculate time-in-range from recent glucose data
    const recentReadings = healthData?.data || [];
    const inRangeCount = recentReadings.filter((r: any) => r.glucose >= 70 && r.glucose <= 180).length;
    const timeInRange = recentReadings.length > 0 ? Math.round((inRangeCount / recentReadings.length) * 100) : 0;
    
    // Check for rice-based meals in history
    const hasRiceHistory = mealDescription.toLowerCase().includes('rice') || 
                          mealDescription.toLowerCase().includes('biryani') ||
                          mealDescription.toLowerCase().includes('pulao');
    
    // Rule 1: Diabetes type specific feedback
    if (diabetesType.includes('Type 2') || diabetesType.includes('2')) {
      if (carbs > 60) {
        feedback.push(t('food.medicalFeedback.type2HighCarb'));
      } else if (carbs > 40) {
        feedback.push(t('food.medicalFeedback.type2ModerateCarb'));
      }
    } else if (diabetesType.includes('Type 1') || diabetesType.includes('1')) {
      feedback.push(t('food.medicalFeedback.type1Bolus', { carbs }));
    } else if (diabetesType.toLowerCase().includes('pre')) {
      feedback.push(t('food.medicalFeedback.prediabetic'));
    }
    
    // Rule 2: High carb meal with rice history
    if (hasRiceHistory && impactLevel === 'high') {
      feedback.push(t('food.medicalFeedback.riceDelayed'));
    }
    
    // Rule 3: Fiber benefit
    if (fiber >= 5) {
      feedback.push(t('food.medicalFeedback.fiberBenefit', { fiber }));
    }
    
    // Rule 4: Protein balance
    if (protein >= 15 && carbs > 40) {
      feedback.push(t('food.medicalFeedback.proteinBalance'));
    }
    
    // Rule 5: Post-meal monitoring recommendation
    if (impactLevel === 'high' || impactLevel === 'medium') {
      feedback.push(t('food.medicalFeedback.monitorPostMeal'));
    }
    
    // Rule 6: Time-in-range based feedback
    if (timeInRange < 50 && recentReadings.length >= 5) {
      feedback.push(t('food.medicalFeedback.lowTimeInRange'));
    }
    
    // Limit to 4 points max
    return feedback.slice(0, 4);
  };

  // Voice Recognition Setup - updates when language changes
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      // Use selected language for voice recognition
      recognitionRef.current.lang = LANGUAGE_VOICE_CODES[language];

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setVoiceStatus(t('food.listening'));
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMealDescription(transcript);
        setVoiceStatus(`${t('food.captured')}: "${transcript}"`);
        
        // Auto-detect portion size - multilingual patterns
        const portionPatterns = [
          // English
          /(\d+)\s*(bowl|plate|cup|piece|chapati|idli|dosa)/i,
          // Hindi
          /(\d+)\s*(ब़ाउल|प्लेट|कप|टुकड़ा|चपाती|इडली|डोसा)/i,
          // Kannada
          /(\d+)\s*(ಬೌಲ್|ಪ್ಲೇಟ್|ಕಪ್|ಇಡ್ಲಿ|ದೋಸೆ)/i,
          // Telugu  
          /(\d+)\s*(బౌల్|ప్లేట్|కప్|ఇడ్లీ|దోశ)/i
        ];
        
        for (const pattern of portionPatterns) {
          const portionMatch = transcript.match(pattern);
          if (portionMatch) {
            setPortionSize(portionMatch[1]);
            // Map local unit names to standard units
            const unitMap: Record<string, string> = {
              'bowl': 'bowl', 'ब़ाउल': 'bowl', 'ಬೌಲ್': 'bowl', 'బౌల్': 'bowl',
              'plate': 'plate', 'प्लेट': 'plate', 'ಪ್ಲೇಟ್': 'plate', 'ప్లేట్': 'plate',
              'cup': 'cup', 'कप': 'cup', 'ಕಪ್': 'cup', 'కప్': 'cup',
              'piece': 'piece', 'टुकड़ा': 'piece',
              'chapati': 'chapati', 'चपाती': 'chapati', 'ಚಪಾತಿ': 'chapati', 'చపాతీ': 'chapati',
              'idli': 'idli', 'इडली': 'idli', 'ಇಡ್ಲಿ': 'idli', 'ఇడ్లీ': 'idli',
              'dosa': 'dosa', 'डोसा': 'dosa', 'ದೋಸೆ': 'dosa', 'దోశ': 'dosa'
            };
            setPortionUnit(unitMap[portionMatch[2].toLowerCase()] || portionMatch[2]);
            break;
          }
        }

        setTimeout(() => setVoiceStatus(t('food.tapMicPrompt')), 3000);
      };

      recognitionRef.current.onerror = (event: any) => {
        setVoiceStatus(t('food.messages.speechError', { error: event.error }));
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [language, t]);

  // Toggle voice recording
  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: t('food.messages.speechNotSupported'),
        description: t('food.messages.speechNotSupportedDesc'),
        variant: 'destructive',
      });
      return;
    }

    // Update language before starting
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANGUAGE_VOICE_CODES[language];
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Check sugar impact function - uses multilingual normalization
  const checkSugarImpact = (mealName: string) => {
    // Normalize the food name from any language to English key
    const normalizedName = normalizeFoodName(mealName);
    const foodData = indianFoodDatabase[normalizedName];
    
    if (!foodData) {
      setSugarAlert(null);
      setShowReplacements(false);
      return;
    }

    const foundMeal = { name: normalizedName, ...foodData };
    let alertLevel: 'low' | 'medium' | 'high' = 'low';
    let alertMessage = '';

    if (foundMeal.sugar === 'very high' || foundMeal.gi > 70) {
      alertLevel = 'high';
      alertMessage = t('aiFood.alerts.highSugar', { food: foundMeal.name, gi: foundMeal.gi });
      setShowReplacements(true);
      
      // Speak alert in selected language
      if ('speechSynthesis' in window) {
        const alertText = language === 'HI' 
          ? `चेतावनी! ${foundMeal.name} में उच्च चीनी है`
          : language === 'KN'
          ? `ಎಚ್ಚರಿಕೆ! ${foundMeal.name} ನಲ್ಲಿ ಹೆಚ್ಚಿನ ಸಕ್ಕರೆ ಇದೆ`
          : language === 'TE'
          ? `హెచ్చరిక! ${foundMeal.name} లో ఎక్కువ చక్కెర ఉంది`
          : `Warning! High sugar alert for ${foundMeal.name}`;
        const utterance = new SpeechSynthesisUtterance(alertText);
        utterance.lang = LANGUAGE_VOICE_CODES[language];
        window.speechSynthesis.speak(utterance);
      }
    } else if (foundMeal.sugar === 'high' || foundMeal.gi > 60) {
      alertLevel = 'medium';
      alertMessage = t('aiFood.alerts.moderateSugar', { food: foundMeal.name });
    } else {
      alertLevel = 'low';
      alertMessage = t('aiFood.alerts.lowSugar', { food: foundMeal.name });
    }

    setSugarAlert({
      level: alertLevel,
      message: alertMessage,
      gi: foundMeal.gi,
      region: foundMeal.region,
    });
  };

  // Real-time sugar check on input change
  useEffect(() => {
    if (mealDescription.trim()) {
      checkSugarImpact(mealDescription);
    }
  }, [mealDescription]);

  // Welcome message on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      toast({
        title: '🎤 Voice Input Available!',
        description: 'Click the microphone button to describe your meal with voice. 50+ Indian dishes supported!',
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const analyzeMeal = async () => {
    if (!mealDescription.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please describe your meal first.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis with 1.5s delay (matching your HTML design)
    setTimeout(async () => {
      try {
        const response = await apiRequest('/api/ai-food-log/analyze', {
          method: 'POST',
          body: JSON.stringify({
            description: mealDescription,
            portionMultiplier: parseFloat(portionSize),
            portionUnit,
            mealType,
            mealTiming,
            cookingStyle: cookingStyle || '',
            language: language === 'HI' ? 'hi-IN' : 'en-IN',
          }),
        });

        const data = await response.json();
        
        if (data.error === 'unknown_dish') {
          toast({
            title: 'Unknown Dish',
            description: data.message || 'Could not recognize this meal.',
            variant: 'destructive',
          });
          setAnalysis(null);
        } else if (data && data.totals) {
          setAnalysis(data);
          toast({
            title: 'Analysis Complete',
            description: `Meal analyzed successfully. Overall impact: ${data.totals.overallImpactLevel}`,
          });
          
          // Smooth scroll to results
          setTimeout(() => {
            document.getElementById('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      } catch (error: any) {
        console.error('Analysis error:', error);
        toast({
          title: 'Analysis Failed',
          description: error.message || 'Could not analyze meal. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsAnalyzing(false);
      }
    }, 1500);
  };

  const logMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/ai-food-log/log', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Meal Logged Successfully!',
        description: 'Your meal has been saved and added to Recent Meals.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-food-log/recent'] });
      setMealDescription('');
      setAnalysis(null);
      setPortionSize('1');
      setCookingStyle('');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Log Meal',
        description: error.message || 'Could not save meal.',
        variant: 'destructive',
      });
    },
  });

  const logMeal = () => {
    if (!analysis) return;
    logMealMutation.mutate({
      description: mealDescription,
      ...analysis,
    });
  };

  const clearForm = () => {
    setMealDescription('');
    setAnalysis(null);
    setPortionSize('1');
    setPortionUnit('plate');
    setMealType('lunch');
    setCookingStyle('');
    toast({
      title: 'Form Cleared!',
      description: 'All meal input has been cleared successfully.',
    });
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-emerald-400';
      case 'medium': return 'text-amber-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getImpactBg = (level: string) => {
    switch (level) {
      case 'low': return 'bg-emerald-900/20 border-emerald-500/30';
      case 'medium': return 'bg-amber-900/20 border-amber-500/30';
      case 'high': return 'bg-red-900/20 border-red-500/30';
      default: return 'bg-gray-900/20 border-gray-500/30';
    }
  };

  return (
    <div className="flex h-screen w-full relative overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px', background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)' }}>
        
        {/* Enhanced Header */}
        <header className="flex items-center justify-between border-b" style={{ 
          height: '80px', 
          padding: '0 32px',
          background: 'linear-gradient(135deg, #0d3c61 0%, #1a5c8f 100%)',
          borderBottom: '1px solid rgba(33, 200, 155, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #21C89B 0%, #16A085 100%)',
              boxShadow: '0 4px 20px rgba(33, 200, 155, 0.4)'
            }}>
              <Brain className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Intelligent Nutrition & Carb Logging</h1>
              <p className="text-sm text-cyan-300">AI-powered meal analysis with Indian food understanding</p>
            </div>
          </div>
          
          {/* Language Switcher */}
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-300" />
            <Select 
              value={language} 
              onValueChange={(value) => {
                const langMap: Record<Language, string> = {
                  'EN': 'en', 'HI': 'hi', 'KN': 'kn', 'TE': 'te',
                  'TA': 'en', 'MR': 'en', 'BN': 'en', 'GU': 'en',
                  'ML': 'en', 'PA': 'en', 'OR': 'en', 'AS': 'en',
                };
                const i18nLang = langMap[value as Language];
                changeLanguage(i18nLang);
                setLanguage(value as Language);
              }}
            >
              <SelectTrigger className="h-10 w-[150px] border-cyan-500/30 bg-white/10 text-white hover:bg-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EN">English</SelectItem>
                <SelectItem value="HI">हिन्दी (Hindi)</SelectItem>
                <SelectItem value="KN">ಕನ್ನಡ (Kannada)</SelectItem>
                <SelectItem value="TE">తెలుగు (Telugu)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ padding: '32px' }}>
          {/* Warning Box */}
          <Alert className="mb-6 border-amber-500/30" style={{ 
            background: 'linear-gradient(135deg, rgba(255, 248, 225, 0.1) 0%, rgba(255, 236, 179, 0.1) 100%)',
            borderLeft: '5px solid #ff9800'
          }}>
            <AlertTriangle className="h-5 w-5 text-amber-400 animate-pulse" />
            <AlertDescription className="text-sm text-gray-300">
              <strong>Educational Purpose Only:</strong> Nutrition values and health impact are estimates and may not be fully accurate. Always follow your doctor or dietitian's advice.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Meal Logging Form */}
            <div className="glass-card rounded-2xl p-8 border border-gray-700" style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}>
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                <h2 className="text-2xl font-bold text-white">Log a New Meal</h2>
              </div>

              {/* Meal Time Selection */}
              <div className="mb-6">
                <label className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Meal Time
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'breakfast', label: t('food.breakfast'), icon: Sunrise },
                    { id: 'lunch', label: t('food.lunch'), icon: Sun },
                    { id: 'dinner', label: t('food.dinner'), icon: Moon },
                    { id: 'snack', label: t('food.snack'), icon: Coffee }
                  ].map((option) => {
                    const IconComp = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setMealType(option.id as MealTime)}
                        className={`p-4 rounded-xl border-2 transition-all group ${
                          mealType === option.id 
                            ? 'border-cyan-500 bg-cyan-900/30' 
                            : 'border-gray-700 hover:border-gray-600 hover:bg-white/5'
                        }`}
                      >
                        <IconComp className={`w-6 h-6 mx-auto mb-2 transition-all ${
                          mealType === option.id 
                            ? 'text-cyan-400 animate-pulse' 
                            : 'text-gray-400 group-hover:text-cyan-400 group-hover:scale-110'
                        }`} />
                        <div className="text-sm font-medium text-gray-300">{option.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meal Description */}
              <div className="mb-6">
                <Label className="text-gray-300 mb-2 flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-primary" />
                  Describe Your Meal *
                </Label>
                
                {/* Quick Select Indian Dishes */}
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Quick Select (Popular Indian Dishes):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['curd rice', 'chapati', 'dal', 'biryani', 'idli', 'dosa', 'poha', 'paratha'].map((dish) => (
                      <button
                        key={dish}
                        onClick={() => setMealDescription(dish)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          mealDescription.toLowerCase() === dish
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:scale-105'
                        }`}
                      >
                        <Utensils className="w-3 h-3 inline mr-1" />
                        {dish}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  placeholder="e.g., curd rice with vegetables, 2 chapati with dal"
                  rows={4}
                  className="bg-gray-900/50 border-gray-700 text-white resize-none focus:border-primary"
                />
                
                {/* Voice Input Section */}
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={toggleVoiceRecording}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                      isRecording 
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 animate-pulse shadow-lg shadow-emerald-500/50'
                        : 'bg-gradient-to-r from-red-500 to-pink-500 hover:scale-110 shadow-lg shadow-red-500/30'
                    }`}
                    title={isRecording ? 'Stop Recording' : 'Describe with Voice'}
                  >
                    {isRecording ? (
                      <MicOff className="w-6 h-6 text-white" />
                    ) : (
                      <Mic className="w-6 h-6 text-white" />
                    )}
                  </button>
                  <div className={`flex-1 px-4 py-3 rounded-xl text-sm ${
                    isRecording 
                      ? 'bg-emerald-900/30 text-emerald-300 border-l-4 border-emerald-500'
                      : 'bg-gray-900/50 text-gray-400'
                  }`}>
                    <Info className="w-4 h-4 inline mr-2" />
                    {voiceStatus}
                  </div>
                </div>
                
                <small className="text-gray-500 mt-2 block">✏️ You can edit the text before analyzing</small>
              </div>

              {/* Sugar Alert (Real-time) */}
              {sugarAlert && (
                <div className={`mb-6 p-4 rounded-xl border-l-4 animate-in slide-in-from-left duration-300 ${
                  sugarAlert.level === 'high' 
                    ? 'bg-red-900/20 border-red-500 shake'
                    : sugarAlert.level === 'medium'
                    ? 'bg-amber-900/20 border-amber-500'
                    : 'bg-emerald-900/20 border-emerald-500'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      sugarAlert.level === 'high' ? 'bg-red-500/20' :
                      sugarAlert.level === 'medium' ? 'bg-amber-500/20' :
                      'bg-emerald-500/20'
                    }`}>
                      {sugarAlert.level === 'high' ? (
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                      ) : sugarAlert.level === 'medium' ? (
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold mb-1 ${
                        sugarAlert.level === 'high' ? 'text-red-400' :
                        sugarAlert.level === 'medium' ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        {sugarAlert.message}
                      </p>
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span><strong>Glycemic Index:</strong> {sugarAlert.gi} ({sugarAlert.gi > 70 ? 'High' : sugarAlert.gi > 55 ? 'Medium' : 'Low'})</span>
                        <span>•</span>
                        <span><strong>Region:</strong> {sugarAlert.region.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Portion Size & Unit */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <Label className="text-gray-300 mb-2">Portion Size *</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="5"
                    value={portionSize}
                    onChange={(e) => setPortionSize(e.target.value)}
                    className="bg-gray-900/50 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-2">Unit *</Label>
                  <Select value={portionUnit} onValueChange={setPortionUnit}>
                    <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plate">Plate</SelectItem>
                      <SelectItem value="bowl">Bowl</SelectItem>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="cup">Cup</SelectItem>
                      <SelectItem value="chapati">Chapati</SelectItem>
                      <SelectItem value="idli">Idli</SelectItem>
                      <SelectItem value="dosa">Dosa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cooking Style */}
              <div className="mb-6">
                <Label className="text-gray-300 mb-2 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Cooking Style (Optional)
                </Label>
                <Input
                  value={cookingStyle}
                  onChange={(e) => setCookingStyle(e.target.value)}
                  placeholder="e.g., Fried, Grilled, Steamed"
                  className="bg-gray-900/50 border-gray-700 text-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={analyzeMeal}
                  disabled={isAnalyzing || !mealDescription.trim()}
                  className="flex-1 h-14 text-lg font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #2a7de1 0%, #1a6bc8 100%)',
                    boxShadow: isAnalyzing ? 'none' : '0 4px 15px rgba(42, 125, 225, 0.4)'
                  }}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2 animate-pulse" />
                      Analyze Meal
                    </>
                  )}
                </Button>
                <Button
                  onClick={clearForm}
                  variant="outline"
                  className="flex-1 h-14 text-lg font-semibold border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-5 h-5 mr-2" />
                  Clear Form
                </Button>
              </div>

              {/* Analysis Results */}
              {analysis && !analysis.error && (
                <div id="analysis-results" className="mt-8 p-6 rounded-2xl border-2 animate-in fade-in duration-500" style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
                  borderColor: 'rgba(16, 185, 129, 0.3)'
                }}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-6 h-6 text-primary" />
                      Analysis Results
                    </h3>
                    <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
                      analysis.totals.overallImpactLevel === 'low' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' :
                      analysis.totals.overallImpactLevel === 'medium' ? 'bg-amber-900/30 text-amber-400 border-amber-500/50' :
                      'bg-red-900/30 text-red-400 border-red-500/50'
                    }`}>
                      {analysis.totals.overallImpactLevel.toUpperCase()} IMPACT
                    </div>
                  </div>

                  {/* Health Impact */}
                  {analysis.healthImpact && (
                    <div className="mb-6 p-4 rounded-xl bg-gray-900/50 border border-cyan-500/30">
                      <h4 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Impact on Your Health
                      </h4>
                      <p className="text-sm text-gray-300">{analysis.healthImpact.description}</p>
                    </div>
                  )}

                  {/* Personalized Medical Feedback Card */}
                  {analysis && generateMedicalFeedback(analysis).length > 0 && (
                    <div className="mb-6 p-5 rounded-2xl border-2" style={{
                      background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)',
                      borderColor: 'rgba(20, 184, 166, 0.4)',
                      boxShadow: '0 4px 20px rgba(20, 184, 166, 0.15)'
                    }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                          background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)',
                          boxShadow: '0 4px 15px rgba(20, 184, 166, 0.4)'
                        }}>
                          <Stethoscope className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-teal-400">
                            {t('food.medicalFeedback.title')}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {t('food.medicalFeedback.subtitle', { 
                              type: profileData?.profile?.diabetesType || 'Type 2' 
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {generateMedicalFeedback(analysis).map((point, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/40 border border-teal-500/20 hover:border-teal-500/40 transition-all"
                          >
                            <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <HeartPulse className="w-3.5 h-3.5 text-teal-400" />
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">
                              {point}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-teal-500/20 flex items-center gap-2 text-xs text-gray-500">
                        <Info className="w-3.5 h-3.5" />
                        <span>{t('food.medicalFeedback.disclaimer')}</span>
                      </div>
                    </div>
                  )}

                  {/* Nutrition Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-xl text-center transition-all hover:scale-105" style={{
                      background: 'linear-gradient(135deg, rgba(42, 125, 225, 0.1) 0%, rgba(26, 107, 200, 0.1) 100%)'
                    }}>
                      <div className="text-3xl font-black text-cyan-400">{analysis.totals.carbs}g</div>
                      <div className="text-xs text-gray-400 mt-1">Carbohydrates</div>
                    </div>
                    <div className="p-4 rounded-xl text-center transition-all hover:scale-105" style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
                    }}>
                      <div className="text-3xl font-black text-emerald-400">{analysis.totals.protein}g</div>
                      <div className="text-xs text-gray-400 mt-1">Protein</div>
                    </div>
                    <div className="p-4 rounded-xl text-center transition-all hover:scale-105" style={{
                      background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)'
                    }}>
                      <div className="text-3xl font-black text-green-400">{analysis.totals.fiber}g</div>
                      <div className="text-xs text-gray-400 mt-1">Fiber</div>
                    </div>
                    <div className="p-4 rounded-xl text-center transition-all hover:scale-105" style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'
                    }}>
                      <div className="text-3xl font-black text-blue-400">{analysis.totals.calories}</div>
                      <div className="text-xs text-gray-400 mt-1">Calories</div>
                    </div>
                  </div>

                  {/* Smart Replacements Section */}
                  {showReplacements && mealDescription && (
                    <div className="mb-6 p-6 rounded-2xl border-2 border-dashed border-cyan-500/30" style={{
                      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)'
                    }}>
                      <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <Repeat className="w-5 h-5 text-cyan-400" />
                        Smart Replacements
                      </h4>
                      <p className="text-sm text-gray-400 mb-4">Healthier alternatives for better blood sugar control</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(() => {
                          const mealKey = Object.keys(replacementDatabase).find(key => 
                            mealDescription.toLowerCase().includes(key)
                          );
                          const replacements = mealKey ? replacementDatabase[mealKey] : [];
                          
                          return replacements.map((replacement, index) => (
                            <div key={index} className={`relative p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg ${
                              index === 0 
                                ? 'border-emerald-500 bg-gradient-to-br from-emerald-900/20 to-green-900/20'
                                : 'border-gray-700 bg-gray-900/30 hover:border-cyan-500'
                            }`}>
                              {index === 0 && (
                                <div className="absolute -top-3 right-3 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-lg">
                                  BEST CHOICE
                                </div>
                              )}
                              <div className="text-center mb-3">
                                <Leaf className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                                <h5 className="font-bold text-white">{replacement.name}</h5>
                                <p className="text-xs text-gray-400 mt-1">{replacement.benefit}</p>
                              </div>
                              
                              <div className="flex justify-around text-center mt-4 pt-4 border-t border-gray-700">
                                <div>
                                  <div className="text-lg font-bold text-emerald-400">{replacement.carbs}g</div>
                                  <div className="text-xs text-gray-500">Carbs</div>
                                  <div className="text-xs text-emerald-400">↓{(analysis?.totals.carbs || 0) - replacement.carbs}g</div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold text-cyan-400">GI {replacement.gi}</div>
                                  <div className="text-xs text-gray-500">Index</div>
                                  <div className="text-xs text-cyan-400">↓70</div>
                                </div>
                              </div>
                              
                              <Button
                                onClick={() => {
                                  setMealDescription(replacement.name);
                                  setShowReplacements(false);
                                  toast({
                                    title: 'Great Choice!',
                                    description: `Switched to ${replacement.name} - a healthier option!`,
                                  });
                                  // Speak confirmation
                                  if ('speechSynthesis' in window) {
                                    const utterance = new SpeechSynthesisUtterance(`Great choice! ${replacement.name} selected.`);
                                    utterance.lang = 'en-IN';
                                    window.speechSynthesis.speak(utterance);
                                  }
                                }}
                                className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white"
                                size="sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Choose This
                              </Button>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Dish Breakdown */}
                  {analysis.items && analysis.items.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <UtensilsCrossed className="w-5 h-5 text-amber-400" />
                        Dish Breakdown
                      </h4>
                      <div className="space-y-3">
                        {analysis.items.map((item, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-gray-900/30 border border-gray-700 hover:border-primary/50 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Target className={`w-4 h-4 ${getImpactColor(item.impactLevel)}`} />
                                <span className="font-bold text-white">{item.dishName}</span>
                                <span className="text-xs text-gray-500">({item.quantity} {item.unit})</span>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getImpactBg(item.impactLevel)} ${getImpactColor(item.impactLevel)}`}>
                                {item.impactLevel}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {item.mainIngredients.slice(0, 4).map((ing, i) => (
                                <span key={i} className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-400 flex items-center gap-1">
                                  <Leaf className="w-3 h-3 text-emerald-400" />
                                  {ing}
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-4 text-xs text-gray-400">
                              <span>{item.nutrition.carbs}g carbs</span>
                              <span>•</span>
                              <span>{item.nutrition.protein}g protein</span>
                              <span>•</span>
                              <span>{item.nutrition.calories} cal</span>
                              {item.nutrition.glycemicIndex && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-amber-400">GI: {item.nutrition.glycemicIndex}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Benefits */}
                  {analysis.benefits && analysis.benefits.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Health Benefits
                      </h4>
                      <div className="space-y-2">
                        {analysis.benefits.map((benefit, idx) => (
                          <p key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                            <Leaf className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            {benefit}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alternatives */}
                  {analysis.alternatives && analysis.alternatives.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        Healthier Alternatives
                      </h4>
                      <div className="space-y-2">
                        {analysis.alternatives.map((alt, idx) => (
                          <p key={idx} className="text-sm text-cyan-300 flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                            {alt}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Health Tips - Static Section */}
                  <div className="mb-6 p-4 rounded-xl border border-cyan-500/20" style={{
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)'
                  }}>
                    <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      💡 Diabetes Management Tips
                    </h4>
                    <div className="space-y-2 text-xs text-gray-300">
                      <p className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Portion Control:</strong> Eat smaller, frequent meals to maintain steady blood sugar levels.</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Choose Low GI:</strong> Prefer foods with Glycemic Index below 55 for better control.</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span><strong>Stay Hydrated:</strong> Drink water regularly to help regulate blood sugar.</span>
                      </p>
                    </div>
                  </div>

                  {/* Log Meal Buttons */}
                  <div className="flex gap-4 mt-6">
                    <Button
                      onClick={logMeal}
                      disabled={logMealMutation.isPending}
                      className="flex-1 h-12 font-bold"
                      style={{ background: 'linear-gradient(135deg, #21C89B 0%, #16A085 100%)' }}
                    >
                      {logMealMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Logging...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Log This Meal
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setAnalysis(null)}
                      variant="outline"
                      className="flex-1 h-12 font-bold border-gray-600"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Close Analysis
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Recent Meals */}
            <div className="glass-card rounded-2xl p-8 border border-gray-700" style={{
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}>
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-blue-400 animate-pulse" />
                <h2 className="text-2xl font-bold text-white">Recent Meals & Impact</h2>
              </div>

              {mealsLoading ? (
                <div className="text-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-3" />
                  <p className="text-gray-400">Loading meal history...</p>
                </div>
              ) : Array.isArray(recentMeals) && recentMeals.length > 0 ? (
                <div className="space-y-4">
                  {recentMeals.slice(0, 6).map((meal: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-gray-900/30 border border-gray-700 hover:border-primary/50 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="font-bold text-white group-hover:text-primary transition-colors">{meal.mealName || 'Meal'}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {new Date(meal.timestamp).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          meal.totals?.overallImpactLevel === 'low' ? 'bg-emerald-900/30 text-emerald-400' :
                          meal.totals?.overallImpactLevel === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                          'bg-red-900/30 text-red-400'
                        }`}>
                          {(meal.totals?.overallImpactLevel || 'medium').toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="text-center p-2 rounded-lg bg-gray-800/50">
                          <div className="font-bold text-cyan-400">{meal.totals?.carbs || 0}g</div>
                          <div className="text-gray-500">Carbs</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-gray-800/50">
                          <div className="font-bold text-emerald-400">{meal.totals?.protein || 0}g</div>
                          <div className="text-gray-500">Protein</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-gray-800/50">
                          <div className="font-bold text-blue-400">{meal.totals?.calories || 0}</div>
                          <div className="text-gray-500">Cal</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4 animate-pulse" />
                  <p className="text-white font-semibold mb-2">No readings yet</p>
                  <p className="text-gray-500 text-sm">Your recent glucose readings will appear here</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
