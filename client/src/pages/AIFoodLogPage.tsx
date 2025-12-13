import { useState, useEffect, useRef, useMemo } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Utensils, Mic, MicOff, Loader2, AlertCircle, CheckCircle, TrendingUp, Apple, Languages, Info, Leaf, Clock, Globe } from 'lucide-react';
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

type Language = 'EN' | 'HI' | 'KN' | 'TE' | 'TA' | 'MR' | 'BN' | 'GU' | 'ML' | 'PA' | 'OR' | 'AS';

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
  const [mealType, setMealType] = useState('Lunch');
  const [cookingStyle, setCookingStyle] = useState('');
  
  const recognitionRef = useRef<any>(null);

  // Sync language state with i18n when i18n language changes
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

  // Auto-update meal type based on meal timing selection
  useEffect(() => {
    if (mealTiming === 'AM') {
      setMealType('Breakfast');
    } else if (mealTiming === 'PM') {
      setMealType('Lunch');
    } else if (mealTiming === 'EV') {
      setMealType('Dinner');
    }
  }, [mealTiming]);

  // Meal timing translations for multiple languages
  const mealTimingLabels: Record<string, { AM: string; PM: string; EV: string }> = {
    'EN': { AM: 'AM', PM: 'PM', EV: 'EV' },
    'HI': { AM: 'सुबह', PM: 'दोपहर', EV: 'शाम' },
    'KN': { AM: 'ಬೆಳಗ್ಗೆ', PM: 'ಮಧ್ಯಾಹ್ನ', EV: 'ಸಂಜೆ' },
    'TE': { AM: 'ఉదయం', PM: 'మధ్యాహ్నం', EV: 'రాత్రి' },
    'TA': { AM: 'காலை', PM: 'மதியம்', EV: 'மாலை' },
    'MR': { AM: 'सकाळ', PM: 'दुपार', EV: 'संध्याकाळ' },
    'BN': { AM: 'সকাল', PM: 'দুপুর', EV: 'সন্ধ্যা' },
    'GU': { AM: 'સવાર', PM: 'બપોર', EV: 'સાંજ' },
    'ML': { AM: 'രാവിലെ', PM: 'ഉച്ചക്ക്', EV: 'വൈകുന്നേരം' },
    'PA': { AM: 'ਸਵੇਰ', PM: 'ਦੁਪਹਿਰ', EV: 'ਸ਼ਾਮ' },
    'OR': { AM: 'ସକାଳ', PM: 'ଅପରାହ୍ନ', EV: 'ସନ୍ଧ୍ୟା' },
    'AS': { AM: 'পুৱা', PM: 'দুপৰ', EV: 'গধূলি' },
  };

  // Get labels for current language, fallback to EN
  // useMemo ensures proper recalculation when language changes
  const currentTimingLabels = useMemo(
    () => mealTimingLabels[language] || mealTimingLabels['EN'],
    [language]
  );

  // Regional language mappings for Indian dishes
  // Maps local language names to their English/standard equivalents
  const regionalFoodMappings: Record<string, string> = {
    // Telugu dishes
    'annam pappu': 'dal rice', // Must be before 'annam' and 'pappu'
    'perugu annam': 'curd rice',
    'sambar annam': 'sambar rice',
    'annam': 'rice',
    'pappu': 'dal',
    'perugu': 'curd',
    'chapatilu': 'chapati',
    'pulihora': 'tamarind rice',
    'boorelu': 'dal vada',
    'pesarattu': 'moong dal dosa',
    'dibba roti': 'paratha',
    'punugulu': 'idli vada',
    'majjiga': 'buttermilk', // Telugu buttermilk
    
    // Kannada dishes
    'mosaru anna': 'curd rice',
    'huli anna': 'sambar rice',
    'bisi bele bath': 'sambar rice',
    'anna': 'rice',
    'tovve': 'dal',
    'mosaru': 'curd',
    'chapathi': 'chapati',
    'jolada roti': 'jowar roti',
    'ragi mudde': 'ragi ball',
    'dose': 'dosa',
    'vade': 'vada',
    'uppittu': 'upma',
    'chitranna': 'lemon rice',
    'mandakki': 'puffed rice',
    'neer dosa': 'rice crepe',
    'majjige': 'buttermilk', // Kannada buttermilk
    
    // Tamil dishes
    'thayir sadam': 'curd rice',
    'sambar sadam': 'sambar rice',
    'sadam': 'rice',
    'paruppu': 'dal',
    'thayir': 'curd',
    'parotta': 'paratha',
    'dosai': 'dosa',
    'vadai': 'vada',
    'mor': 'buttermilk', // Tamil buttermilk
    'kootu': 'vegetable curry',
    
    // Hindi/North Indian dishes
    'dahi chawal': 'curd rice',
    'dal chawal': 'dal rice',
    'bhaat': 'rice',
    'daal': 'dal',
    'dahi': 'curd',
    'poori': 'puri',
    'sabzi': 'vegetable curry', // North Indian vegetable curry
    'chaas': 'buttermilk', // Hindi buttermilk
    'khichdi': 'dal rice',
    
    // Marathi dishes  
    'bhat': 'rice',
    'loncha': 'pickle',
    'poli': 'roti',
    'bhakri': 'jowar roti',
    'thalipeeth': 'multi-grain flatbread',
    'misal': 'sprouted lentils',
    
    // Combined dishes common across regions
    'rice and dal': 'dal rice',
    'dal and rice': 'dal rice',
    'rice dal': 'dal rice',
    'yogurt rice': 'curd rice',
  };

  // Normalize description by replacing regional names with standard names
  const normalizeDescription = (desc: string): string => {
    let normalized = desc.toLowerCase();
    
    // Sort by length (descending) to match longer phrases first
    const sortedMappings = Object.entries(regionalFoodMappings)
      .sort((a, b) => b[0].length - a[0].length);
    
    // Replace regional names with standard equivalents
    for (const [regional, standard] of sortedMappings) {
      const regex = new RegExp(`\\b${regional}\\b`, 'gi');
      normalized = normalized.replace(regex, standard);
    }
    
    return normalized;
  };

  // Client-side meal analysis fallback (when backend is unavailable)
  const analyzeLocalMeal = (description: string, portionMult: number): MealAnalysis => {
    // Normalize regional language names to standard English names
    const normalizedDesc = normalizeDescription(description);
    const lowerDesc = normalizedDesc.toLowerCase();
    
    const indianFoods: Record<string, any> = {
      // Combined dishes
      'dal rice': { carbs: 63, protein: 13, fat: 4.5, fiber: 5.6, calories: 340, gi: 52, impact: 'medium', ingredients: ['white rice', 'lentils', 'oil', 'spices'] },
      'sambar rice': { carbs: 60, protein: 9, fat: 3.5, fiber: 4.6, calories: 300, gi: 55, impact: 'medium', ingredients: ['white rice', 'toor dal', 'vegetables', 'tamarind', 'spices'] },
      'lemon rice': { carbs: 48, protein: 4.5, fat: 6, fiber: 1, calories: 265, gi: 70, impact: 'medium', ingredients: ['white rice', 'lemon juice', 'peanuts', 'oil', 'spices'] },
      'tamarind rice': { carbs: 50, protein: 4.5, fat: 6, fiber: 1.5, calories: 275, gi: 68, impact: 'medium', ingredients: ['white rice', 'tamarind', 'peanuts', 'oil', 'spices'] },
      'coconut rice': { carbs: 48, protein: 5, fat: 8, fiber: 2, calories: 290, gi: 65, impact: 'medium', ingredients: ['white rice', 'coconut', 'oil', 'spices'] },
      'tomato rice': { carbs: 47, protein: 5, fat: 5, fiber: 2, calories: 260, gi: 68, impact: 'medium', ingredients: ['white rice', 'tomato', 'oil', 'spices'] },
      
      // Indian Staples - Bread
      'chapati': { carbs: 15, protein: 3, fat: 2, fiber: 2, calories: 90, gi: 62, impact: 'medium', ingredients: ['whole wheat flour', 'oil/ghee', 'salt'] },
      'roti': { carbs: 15, protein: 3, fat: 2, fiber: 2, calories: 90, gi: 62, impact: 'medium', ingredients: ['whole wheat flour', 'oil/ghee', 'salt'] },
      'naan': { carbs: 25, protein: 4, fat: 3, fiber: 1, calories: 140, gi: 70, impact: 'medium', ingredients: ['refined flour', 'yogurt', 'yeast', 'ghee'] },
      'paratha': { carbs: 25, protein: 4, fat: 8, fiber: 2, calories: 200, gi: 65, impact: 'medium', ingredients: ['wheat flour', 'oil/ghee', 'salt'] },
      'puri': { carbs: 18, protein: 3, fat: 6, fiber: 1, calories: 140, gi: 70, impact: 'medium', ingredients: ['wheat flour', 'oil (fried)', 'salt'] },
      
      // Indian Staples - Rice
      'rice': { carbs: 45, protein: 4, fat: 0.5, fiber: 0.6, calories: 200, gi: 73, impact: 'high', ingredients: ['white rice', 'water'] },
      'brown rice': { carbs: 45, protein: 5, fat: 1.5, fiber: 3.5, calories: 215, gi: 50, impact: 'medium', ingredients: ['brown rice', 'water'] },
      'biryani': { carbs: 55, protein: 15, fat: 12, fiber: 2, calories: 390, gi: 58, impact: 'high', ingredients: ['rice', 'chicken/mutton', 'oil/ghee', 'spices'] },
      'pulao': { carbs: 48, protein: 6, fat: 8, fiber: 2, calories: 290, gi: 60, impact: 'medium', ingredients: ['rice', 'vegetables', 'ghee', 'spices'] },
      'curd rice': { carbs: 35, protein: 6, fat: 3, fiber: 0.5, calories: 200, gi: 68, impact: 'medium', ingredients: ['rice', 'curd/yogurt', 'salt'] },
      
      // South Indian
      'idli': { carbs: 8, protein: 2, fat: 0.5, fiber: 1, calories: 40, gi: 45, impact: 'medium', ingredients: ['rice', 'urad dal', 'salt'] },
      'dosa': { carbs: 22, protein: 4, fat: 5, fiber: 1.5, calories: 150, gi: 66, impact: 'medium', ingredients: ['rice', 'urad dal', 'oil'] },
      'masala dosa': { carbs: 30, protein: 6, fat: 8, fiber: 2, calories: 220, gi: 66, impact: 'medium', ingredients: ['rice', 'urad dal', 'potato', 'oil', 'spices'] },
      'vada': { carbs: 12, protein: 4, fat: 8, fiber: 2, calories: 140, gi: 55, impact: 'medium', ingredients: ['urad dal', 'spices', 'oil (fried)'] },
      'sambar': { carbs: 15, protein: 5, fat: 3, fiber: 4, calories: 100, gi: 35, impact: 'low', ingredients: ['toor dal', 'vegetables', 'tamarind', 'spices'] },
      'rasam': { carbs: 8, protein: 2, fat: 2, fiber: 1.5, calories: 55, gi: 30, impact: 'low', ingredients: ['tomato', 'tamarind', 'spices', 'dal water'] },
      'upma': { carbs: 32, protein: 4, fat: 5, fiber: 2.5, calories: 190, gi: 60, impact: 'medium', ingredients: ['semolina', 'vegetables', 'oil', 'spices'] },
      'pongal': { carbs: 38, protein: 6, fat: 7, fiber: 2, calories: 240, gi: 58, impact: 'medium', ingredients: ['rice', 'moong dal', 'ghee', 'pepper', 'cumin'] },
      
      // North Indian - Dal/Lentils
      'dal': { carbs: 18, protein: 9, fat: 4, fiber: 5, calories: 140, gi: 30, impact: 'low', ingredients: ['lentils', 'oil', 'spices', 'onion', 'tomato'] },
      'dal makhani': { carbs: 20, protein: 10, fat: 8, fiber: 6, calories: 190, gi: 35, impact: 'low', ingredients: ['black dal', 'kidney beans', 'butter', 'cream', 'spices'] },
      'rajma': { carbs: 22, protein: 8, fat: 4, fiber: 7, calories: 155, gi: 28, impact: 'low', ingredients: ['kidney beans', 'onion', 'tomato', 'oil', 'spices'] },
      'chole': { carbs: 25, protein: 9, fat: 5, fiber: 8, calories: 180, gi: 28, impact: 'low', ingredients: ['chickpeas', 'onion', 'tomato', 'oil', 'spices'] },
      
      // Breakfast Items
      'poha': { carbs: 30, protein: 3, fat: 4, fiber: 2, calories: 170, gi: 55, impact: 'medium', ingredients: ['flattened rice', 'peanuts', 'oil', 'spices'] },
      
      // Curries
      'chicken curry': { carbs: 8, protein: 25, fat: 10, fiber: 2, calories: 220, gi: 0, impact: 'low', ingredients: ['chicken', 'oil', 'onion', 'tomato', 'spices'] },
      'butter chicken': { carbs: 12, protein: 22, fat: 18, fiber: 2, calories: 290, gi: 5, impact: 'low', ingredients: ['chicken', 'butter', 'cream', 'tomato', 'spices'] },
      'paneer': { carbs: 3, protein: 18, fat: 20, fiber: 0, calories: 260, gi: 0, impact: 'low', ingredients: ['cottage cheese', 'spices'] },
      'palak paneer': { carbs: 8, protein: 12, fat: 15, fiber: 3, calories: 210, gi: 15, impact: 'low', ingredients: ['paneer', 'spinach', 'cream', 'spices'] },
      
      // Dairy & Beverages
      'milk': { carbs: 12, protein: 8, fat: 8, fiber: 0, calories: 150, gi: 30, impact: 'medium', ingredients: ['whole milk'] },
      'buttermilk': { carbs: 5, protein: 3, fat: 0.5, fiber: 0, calories: 40, gi: 25, impact: 'low', ingredients: ['curd/yogurt', 'water', 'salt', 'spices'] },
      'lassi': { carbs: 20, protein: 5, fat: 3, fiber: 0, calories: 130, gi: 35, impact: 'medium', ingredients: ['yogurt', 'water', 'sugar/salt'] },
      'curd': { carbs: 5, protein: 4, fat: 3, fiber: 0, calories: 60, gi: 30, impact: 'low', ingredients: ['yogurt'] },
      'yogurt': { carbs: 5, protein: 4, fat: 3, fiber: 0, calories: 60, gi: 30, impact: 'low', ingredients: ['yogurt'] },
      
      // Snacks & Street Food
      'samosa': { carbs: 25, protein: 4, fat: 12, fiber: 2, calories: 230, gi: 70, impact: 'high', ingredients: ['refined flour', 'potato', 'peas', 'oil (fried)'] },
      'pakora': { carbs: 15, protein: 3, fat: 8, fiber: 2, calories: 150, gi: 65, impact: 'medium', ingredients: ['gram flour', 'vegetables', 'oil (fried)'] },
      'bhel puri': { carbs: 30, protein: 4, fat: 6, fiber: 3, calories: 190, gi: 60, impact: 'medium', ingredients: ['puffed rice', 'vegetables', 'chutney', 'sev'] },
      
      // Western Foods
      'bread': { carbs: 15, protein: 3, fat: 1, fiber: 1, calories: 80, gi: 75, impact: 'high', ingredients: ['refined flour', 'yeast', 'sugar'] },
      'brown bread': { carbs: 14, protein: 3, fat: 1, fiber: 2, calories: 80, gi: 55, impact: 'medium', ingredients: ['whole wheat flour', 'yeast'] },
      'oatmeal': { carbs: 27, protein: 5, fat: 3, fiber: 4, calories: 150, gi: 55, impact: 'medium', ingredients: ['oats', 'water/milk'] },
      'oats': { carbs: 27, protein: 5, fat: 3, fiber: 4, calories: 150, gi: 55, impact: 'medium', ingredients: ['oats', 'water/milk'] },
      'pasta': { carbs: 40, protein: 7, fat: 2, fiber: 2, calories: 200, gi: 60, impact: 'medium', ingredients: ['wheat pasta', 'sauce'] },
      'pizza': { carbs: 35, protein: 12, fat: 15, fiber: 2, calories: 320, gi: 65, impact: 'high', ingredients: ['refined flour', 'cheese', 'toppings', 'sauce'] },
      'burger': { carbs: 32, protein: 15, fat: 18, fiber: 2, calories: 350, gi: 68, impact: 'high', ingredients: ['bun', 'patty', 'cheese', 'vegetables', 'sauce'] },
      'sandwich': { carbs: 28, protein: 8, fat: 6, fiber: 3, calories: 200, gi: 60, impact: 'medium', ingredients: ['bread', 'vegetables', 'cheese/meat'] },
      'egg': { carbs: 1, protein: 6, fat: 5, fiber: 0, calories: 70, gi: 0, impact: 'low', ingredients: ['egg'] },
      'omelette': { carbs: 2, protein: 12, fat: 12, fiber: 0, calories: 170, gi: 0, impact: 'low', ingredients: ['eggs', 'oil', 'vegetables'] },
      
      // Fruits & Vegetables
      'apple': { carbs: 14, protein: 0.3, fat: 0.2, fiber: 2.4, calories: 52, gi: 36, impact: 'low', ingredients: ['apple'] },
      'banana': { carbs: 23, protein: 1, fat: 0.3, fiber: 2.6, calories: 89, gi: 51, impact: 'medium', ingredients: ['banana'] },
      'orange': { carbs: 12, protein: 1, fat: 0.1, fiber: 2.4, calories: 47, gi: 43, impact: 'low', ingredients: ['orange'] },
      'mango': { carbs: 15, protein: 0.8, fat: 0.4, fiber: 1.6, calories: 60, gi: 51, impact: 'medium', ingredients: ['mango'] },
      'salad': { carbs: 5, protein: 2, fat: 0.2, fiber: 2, calories: 25, gi: 15, impact: 'low', ingredients: ['mixed vegetables', 'greens'] },
      'vegetables': { carbs: 5, protein: 2, fat: 0.2, fiber: 2, calories: 25, gi: 15, impact: 'low', ingredients: ['mixed vegetables', 'greens'] },
      'vegetable': { carbs: 5, protein: 2, fat: 0.2, fiber: 2, calories: 25, gi: 15, impact: 'low', ingredients: ['mixed vegetables', 'greens'] },
    };

    const items: DishItem[] = [];
    Object.keys(indianFoods).forEach(food => {
      const regex = new RegExp(`(\\d+)?\\s*${food}`, 'gi');
      const matches = lowerDesc.match(regex);
      if (matches) {
        const quantityMatch = matches[0].match(/\d+/);
        const quantity = (quantityMatch ? parseInt(quantityMatch[0]) : 1) * portionMult;
        const foodData = indianFoods[food];
        items.push({
          dishName: food.charAt(0).toUpperCase() + food.slice(1),
          normalizedName: food,
          quantity,
          unit: 'serving',
          estimatedWeightGrams: quantity * 100,
          mainIngredients: foodData.ingredients,
          nutrition: {
            carbs: Math.round(foodData.carbs * quantity),
            protein: Math.round(foodData.protein * quantity),
            fat: Math.round(foodData.fat * quantity),
            fiber: Math.round(foodData.fiber * quantity),
            calories: Math.round(foodData.calories * quantity),
            glycemicIndex: foodData.gi || null,
          },
          impactLevel: foodData.impact as 'low' | 'medium' | 'high',
        });
      }
    });

    if (items.length === 0) {
      return {
        error: 'unknown_dish',
        message: 'Could not recognize dishes in description. Try including foods like: chapati, dal, rice, sambar, idli, dosa, upma, chicken curry, paneer, buttermilk, oats, eggs, salad, etc.',
        mealName: mealType,
        items: [],
        totals: { carbs: 0, protein: 0, fat: 0, calories: 0, fiber: 0, overallImpactLevel: 'medium' },
      };
    }

    const totals = {
      carbs: items.reduce((sum, item) => sum + item.nutrition.carbs, 0),
      protein: items.reduce((sum, item) => sum + item.nutrition.protein, 0),
      fat: items.reduce((sum, item) => sum + item.nutrition.fat, 0),
      calories: items.reduce((sum, item) => sum + item.nutrition.calories, 0),
      fiber: items.reduce((sum, item) => sum + item.nutrition.fiber, 0),
      overallImpactLevel: (items.some(i => i.impactLevel === 'high') ? 'high' : 
                          items.some(i => i.impactLevel === 'medium') ? 'medium' : 'low') as 'low' | 'medium' | 'high',
    };

    const benefits: string[] = [];
    const cautions: string[] = [];
    const alternatives: string[] = [];

    if (lowerDesc.includes('dal')) benefits.push('Dal provides plant-based protein and fiber for stable blood sugar.');
    if (lowerDesc.includes('vegetable') || lowerDesc.includes('salad')) benefits.push('Vegetables are rich in fiber and nutrients, excellent for diabetes.');
    if (totals.fiber >= 5) benefits.push(`High fiber content (${totals.fiber}g) helps slow carb absorption.`);
    if (totals.protein >= 20) benefits.push('Good protein content helps maintain stable energy levels.');

    if (totals.carbs > 60) {
      cautions.push('High carb intake detected. May raise blood sugar significantly.');
      alternatives.push('Consider reducing portion size by 25-30% or replace half the rice with vegetables.');
    }
    if (lowerDesc.includes('fried')) {
      cautions.push('Fried foods contain excess oil that may affect insulin sensitivity.');
      alternatives.push('Try baking, grilling, or air-frying instead.');
    }

    return {
      mealName: mealType,
      items,
      totals,
      healthImpact: {
        category: totals.carbs > 60 ? 'high' : totals.carbs > 40 ? 'medium' : 'low',
        description: totals.carbs > 60 
          ? 'High carbohydrate load - may cause significant blood sugar rise. Monitor levels 2 hours after eating.'
          : totals.carbs > 40
          ? 'Moderate carbohydrate content - may cause moderate blood sugar rise. Consider a 15-minute walk after eating.'
          : 'Low to moderate carbs - minimal blood sugar impact. Good choice for diabetes management.',
      },
      benefits: benefits.length > 0 ? benefits : ['This meal provides essential nutrients. Pair with mindful eating and glucose monitoring.'],
      cautions: cautions.length > 0 ? cautions : undefined,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    };
  };

  const { data: recentMeals, isLoading: mealsLoading } = useQuery({
    queryKey: ['/api/ai-food-log/recent'],
  });

  // Local storage fallback for meals when not authenticated
  const [localMeals, setLocalMeals] = useState<any[]>([]);

  // Load local meals from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('localMealLogs');
    if (stored) {
      try {
        setLocalMeals(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse local meals:', e);
        setLocalMeals([]);
      }
    }
  }, []);

  // Determine which meals to display (backend or local)
  const displayMeals = Array.isArray(recentMeals) && recentMeals.length > 0 
    ? recentMeals 
    : localMeals;

  // Initialize Speech Recognition with language support
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      // Update language based on selection
      recognitionRef.current.lang = language === 'HI' ? 'hi-IN' : 'en-IN';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          }
        }

        if (finalTranscript) {
          setMealDescription(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast({
          title: 'Voice Input Error',
          description: 'Could not capture voice. Please try again.',
          variant: 'destructive',
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [language, toast]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Voice Not Supported',
        description: 'Your browser does not support voice input.',
        variant: 'destructive',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const analyzeMeal = async () => {
    if (!mealDescription.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please describe your meal first.',
        variant: 'destructive',
      });
      return;
    }

    if (!portionSize || parseFloat(portionSize) <= 0) {
      toast({
        title: 'Invalid Portion',
        description: 'Please enter a valid portion size.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await apiRequest('/api/ai-food-log/analyze', {
        method: 'POST',
        body: JSON.stringify({
          description: mealDescription,
          portionMultiplier: parseFloat(portionSize),
          portionUnit,
          mealType,
          mealTiming, // Pass meal timing context for better analysis
          cookingStyle: cookingStyle || '',
          language: language === 'HI' ? 'hi-IN' : 'en-IN',
        }),
      });

      const data = await response.json();
      
      if (data.error === 'unknown_dish') {
        toast({
          title: 'Unknown Dish',
          description: data.message || 'Could not recognize this meal. Please provide more details.',
          variant: 'destructive',
        });
        setAnalysis(null);
      } else if (data && data.totals) {
        setAnalysis(data);
        toast({
          title: 'Analysis Complete',
          description: `Meal analyzed successfully. Overall impact: ${data.totals.overallImpactLevel}`,
        });
      } else {
        throw new Error('Invalid response structure from analysis');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      
      // If backend is unavailable (401 or network error), use local analysis
      if (error.message.includes('401') || error.message.includes('Authentication') || error.message.includes('401')) {
        console.log('Backend unavailable (401), using local analysis fallback...');
        const localAnalysis = analyzeLocalMeal(mealDescription, parseFloat(portionSize));
        
        if (localAnalysis.error === 'unknown_dish') {
          toast({
            title: 'Unknown Dish',
            description: localAnalysis.message || 'Could not recognize this meal. Please provide more details.',
            variant: 'destructive',
          });
          setAnalysis(null);
        } else {
          setAnalysis(localAnalysis);
          toast({
            title: 'Analysis Complete (Local)',
            description: `Meal analyzed locally. Overall impact: ${localAnalysis.totals.overallImpactLevel}. Note: Login for more accurate analysis.`,
          });
        }
      } else {
        console.log('Analysis error - checking if we should fallback to local analysis...');
        // Also fallback to local analysis for any fetch/network errors or invalid responses
        try {
          const localAnalysis = analyzeLocalMeal(mealDescription, parseFloat(portionSize));
          if (localAnalysis.error === 'unknown_dish') {
            toast({
              title: 'Unknown Dish',
              description: localAnalysis.message || 'Could not recognize this meal. Please provide more details.',
              variant: 'destructive',
            });
            setAnalysis(null);
          } else {
            setAnalysis(localAnalysis);
            toast({
              title: 'Analysis Complete (Local)',
              description: `Meal analyzed locally. Overall impact: ${localAnalysis.totals.overallImpactLevel}. Note: Login for more accurate analysis.`,
            });
          }
        } catch (fallbackError) {
          console.error('Local fallback also failed:', fallbackError);
          toast({
            title: 'Analysis Failed',
            description: error.message || 'Could not analyze meal. Please try again.',
            variant: 'destructive',
          });
          setAnalysis(null);
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
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
        title: 'Meal Logged',
        description: 'Your meal has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-food-log/recent'] });
      setMealDescription('');
      setAnalysis(null);
      setPortionSize('1');
      setCookingStyle('');
    },
    onError: (error: any) => {
      // If 401 error, save to local storage as fallback
      if (error.message.includes('401') || error.message.includes('Authentication')) {
        // Save to localStorage
        const mealToSave = {
          description: mealDescription,
          mealName: analysis?.mealName || 'Meal',
          items: analysis?.items || [],
          totals: analysis?.totals,
          timestamp: new Date().toISOString(),
        };
        
        const existingMeals = localStorage.getItem('localMealLogs');
        let meals = [];
        try {
          meals = existingMeals ? JSON.parse(existingMeals) : [];
        } catch (e) {
          meals = [];
        }
        
        meals.unshift(mealToSave); // Add to beginning
        meals = meals.slice(0, 20); // Keep only last 20
        localStorage.setItem('localMealLogs', JSON.stringify(meals));
        setLocalMeals(meals);
        
        toast({
          title: 'Meal Saved Locally',
          description: 'Your meal is saved locally. Login to sync with cloud.',
          variant: 'default',
        });
        
        // Clear the form
        setMealDescription('');
        setAnalysis(null);
        setPortionSize('1');
        setCookingStyle('');
      } else {
        toast({
          title: 'Failed to Log Meal',
          description: error.message || 'Could not save meal.',
          variant: 'destructive',
        });
      }
    },
  });

  const logMeal = () => {
    if (!analysis) return;
    logMealMutation.mutate({
      description: mealDescription,
      ...analysis,
    });
  };

  const clearMealForm = () => {
    // Stop voice recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    // Clear all form data
    setMealDescription('');
    setAnalysis(null);
    setPortionSize('1');
    setPortionUnit('plate');
    setMealType('Lunch');
    setCookingStyle('');
    setInputMode('type');
    toast({
      title: 'Form Cleared',
      description: 'All meal input has been cleared.',
    });
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-emerald-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getImpactBadge = (level: string) => {
    switch (level) {
      case 'low': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      case 'high': return 'bg-red-500/10 border-red-500/30 text-red-400';
      default: return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
    }
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '280px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Utensils className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Intelligent Nutrition & Carb Logging</h2>
              <p className="text-sm text-muted-foreground">AI-powered meal analysis with Indian food understanding</p>
            </div>
          </div>
          
          {/* Language Switcher */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <Select 
              value={language} 
              onValueChange={(value) => {
                const langMap: Record<Language, string> = {
                  'EN': 'en',
                  'HI': 'hi',
                  'KN': 'kn',
                  'TE': 'te',
                  'TA': 'en',
                  'MR': 'en',
                  'BN': 'en',
                  'GU': 'en',
                  'ML': 'en',
                  'PA': 'en',
                  'OR': 'en',
                  'AS': 'en',
                };
                const i18nLang = langMap[value as Language];
                changeLanguage(i18nLang);
                setLanguage(value as Language);
              }}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EN">English</SelectItem>
                <SelectItem value="HI">हिन्दी (Hindi)</SelectItem>
                <SelectItem value="KN">ಕನ್ನಡ (Kannada)</SelectItem>
                <SelectItem value="TE">తెలుగు (Telugu)</SelectItem>
                <SelectItem value="TA">தமிழ் (Tamil)</SelectItem>
                <SelectItem value="MR">मराठी (Marathi)</SelectItem>
                <SelectItem value="BN">বাংলা (Bengali)</SelectItem>
                <SelectItem value="GU">ગુજરાતી (Gujarati)</SelectItem>
                <SelectItem value="ML">മലയാളം (Malayalam)</SelectItem>
                <SelectItem value="PA">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                <SelectItem value="OR">ଓଡ଼ିଆ (Odia)</SelectItem>
                <SelectItem value="AS">অসমীয়া (Assamese)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            {/* Disclaimer */}
            <Alert className="mb-6 border-emerald-500/20 bg-emerald-500/5">
              <Info className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="text-sm text-muted-foreground">
                <strong>Educational Purpose Only:</strong> Nutrition values and health impact are estimates and may not be fully accurate. Always follow your doctor or dietitian's advice.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel - Log New Meal */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Apple className="w-5 h-5 text-primary" />
                    Log a New Meal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Meal Timing Toggle - Moved from header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground mr-2">Meal Time:</span>
                    <div className="flex gap-1 p-1 rounded-lg bg-secondary/50">
                      <Button
                        size="sm"
                        variant={mealTiming === 'AM' ? 'default' : 'ghost'}
                        onClick={() => setMealTiming('AM')}
                        className="h-7 px-3 text-xs font-medium"
                        title="Morning meal context"
                      >
                        {currentTimingLabels.AM}
                      </Button>
                      <Button
                        size="sm"
                        variant={mealTiming === 'PM' ? 'default' : 'ghost'}
                        onClick={() => setMealTiming('PM')}
                        className="h-7 px-3 text-xs font-medium"
                        title="Afternoon meal context"
                      >
                        {currentTimingLabels.PM}
                      </Button>
                      <Button
                        size="sm"
                        variant={mealTiming === 'EV' ? 'default' : 'ghost'}
                        onClick={() => setMealTiming('EV')}
                        className="h-7 px-3 text-xs font-medium"
                        title="Evening/Night meal context"
                      >
                        {currentTimingLabels.EV}
                      </Button>
                    </div>
                  </div>

                  {/* Input Mode Toggle */}
                  <div className="flex gap-2">
                    <Button
                      variant={inputMode === 'type' ? 'default' : 'outline'}
                      onClick={() => setInputMode('type')}
                      className="flex-1"
                    >
                      Type Manually
                    </Button>
                    <Button
                      variant={inputMode === 'voice' ? 'default' : 'outline'}
                      onClick={() => {
                        setInputMode('voice');
                        if (!isRecording) toggleRecording();
                      }}
                      className="flex-1"
                    >
                      {isRecording ? <><MicOff className="w-4 h-4 mr-2" /> Stop Voice</> : <><Mic className="w-4 h-4 mr-2" /> Voice Input</>}
                    </Button>
                  </div>

                  {/* Stop Voice Button (visible when recording) */}
                  {isRecording && (
                    <Button
                      onClick={toggleRecording}
                      variant="outline"
                      className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <MicOff className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}

                  {/* Meal Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Describe Your Meal</Label>
                    <Textarea
                      id="description"
                      placeholder="e.g., 2 chapati with dal, 1 cup chicken curry, salad"
                      value={mealDescription}
                      onChange={(e) => setMealDescription(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                    {isRecording && (
                      <p className="text-xs text-emerald-400 animate-pulse">🎤 Listening... Speak your meal description</p>
                    )}
                    {inputMode === 'voice' && !isRecording && mealDescription && (
                      <p className="text-xs text-muted-foreground">✓ You can edit the text before analyzing</p>
                    )}
                  </div>

                  {/* Form Fields Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="portionSize">Portion Size *</Label>
                      <Input
                        id="portionSize"
                        type="number"
                        step="0.5"
                        min="0.5"
                        max="5"
                        value={portionSize}
                        onChange={(e) => setPortionSize(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portionUnit">Unit *</Label>
                      <Select value={portionUnit} onValueChange={setPortionUnit}>
                        <SelectTrigger id="portionUnit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="plate">Plate</SelectItem>
                          <SelectItem value="bowl">Bowl</SelectItem>
                          <SelectItem value="piece">Piece</SelectItem>
                          <SelectItem value="cup">Cup</SelectItem>
                          <SelectItem value="grams">Grams</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="mealType">Meal Type *</Label>
                      <Select value={mealType} onValueChange={setMealType}>
                        <SelectTrigger id="mealType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Breakfast">Breakfast</SelectItem>
                          <SelectItem value="Lunch">Lunch</SelectItem>
                          <SelectItem value="Dinner">Dinner</SelectItem>
                          <SelectItem value="Snack">Snack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cookingStyle">Cooking Style</Label>
                      <Input
                        id="cookingStyle"
                        value={cookingStyle}
                        onChange={(e) => setCookingStyle(e.target.value)}
                        placeholder="e.g., Fried, Grilled"
                      />
                    </div>
                  </div>

                  {/* Analyze Button */}
                  <div className="flex gap-2">
                    <Button
                      onClick={analyzeMeal}
                      disabled={isAnalyzing || !mealDescription.trim()}
                      className="flex-1 bg-primary hover:bg-primary/90"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          🧠 Analyze Meal
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={clearMealForm}
                      variant="outline"
                      className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </div>

                  {/* Analysis Results */}
                  {analysis && !analysis.error && (
                    <div className="space-y-4 mt-6 p-4 rounded-lg border border-emerald-500/30" style={{ background: 'rgba(16,185,129,0.08)' }}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Analysis Results</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getImpactBadge(analysis.totals.overallImpactLevel)}`}>
                          {analysis.totals.overallImpactLevel.toUpperCase()} IMPACT
                        </span>
                      </div>

                      {/* Health Impact */}
                      {analysis.healthImpact && (
                        <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Info className="w-4 h-4 text-cyan-400" />
                            Impact on Your Health
                          </h4>
                          <p className="text-sm text-muted-foreground">{analysis.healthImpact.description}</p>
                        </div>
                      )}

                      {/* Nutrition Totals */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">Carbs</p>
                          <p className="text-lg font-bold text-primary">{analysis.totals.carbs}g</p>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">Protein</p>
                          <p className="text-lg font-bold text-emerald-400">{analysis.totals.protein}g</p>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">Fiber</p>
                          <p className="text-lg font-bold text-green-400">{analysis.totals.fiber}g</p>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg">
                          <p className="text-xs text-muted-foreground">Calories</p>
                          <p className="text-lg font-bold text-blue-400">{analysis.totals.calories}</p>
                        </div>
                      </div>

                      {/* Dishes Breakdown */}
                      {analysis.items && analysis.items.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">Dish Breakdown</h4>
                          <div className="space-y-3">
                            {analysis.items.map((item, idx) => (
                              <div key={idx} className="bg-secondary/30 p-3 rounded-lg border border-border/20">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <span className="font-medium text-foreground">{item.dishName}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({item.quantity} {item.unit})</span>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full ${getImpactBadge(item.impactLevel)}`}>
                                    {item.impactLevel}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  <strong>Ingredients:</strong> {item.mainIngredients.join(', ')}
                                </p>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span>{item.nutrition.carbs}g carbs</span>
                                  <span>•</span>
                                  <span>{item.nutrition.protein}g protein</span>
                                  <span>•</span>
                                  <span>{item.nutrition.calories} cal</span>
                                  {item.nutrition.glycemicIndex && (
                                    <>
                                      <span>•</span>
                                      <span>GI: {item.nutrition.glycemicIndex}</span>
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
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            Health Benefits
                          </h4>
                          <div className="space-y-1">
                            {analysis.benefits.map((benefit, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                <Leaf className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                                {benefit}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cautions */}
                      {analysis.cautions && analysis.cautions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                            Cautions
                          </h4>
                          <div className="space-y-1">
                            {analysis.cautions.map((caution, idx) => (
                              <p key={idx} className="text-xs text-yellow-400/90">⚠ {caution}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alternatives */}
                      {analysis.alternatives && analysis.alternatives.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-cyan-400" />
                            Better Alternatives
                          </h4>
                          <div className="space-y-1">
                            {analysis.alternatives.map((alt, idx) => (
                              <p key={idx} className="text-xs text-cyan-400/90">→ {alt}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Log Meal Button */}
                      <div className="flex gap-2">
                        <Button
                          onClick={logMeal}
                          disabled={logMealMutation.isPending}
                          className="flex-1 bg-primary hover:bg-primary/90"
                        >
                          {logMealMutation.isPending ? 'Logging...' : 'Log This Meal'}
                        </Button>
                        <Button
                          onClick={() => setAnalysis(null)}
                          variant="outline"
                          className="flex-1"
                        >
                          Clear & Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right Panel - Recent Meals */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    Recent Meals & Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {mealsLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                      <p className="text-muted-foreground mt-2">Loading meals...</p>
                    </div>
                  ) : Array.isArray(displayMeals) && displayMeals.length > 0 ? (
                    <div className="space-y-3">
                      {displayMeals.slice(0, 10).map((meal: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-border/50 hover:border-primary/30 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm">{meal.mealName || 'Meal'}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(meal.timestamp).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getImpactBadge(meal.totals?.overallImpactLevel || 'medium')}`}>
                              {(meal.totals?.overallImpactLevel || 'medium').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex gap-3 text-xs">
                            <span className="text-primary">{meal.totals?.carbs || 0}g carbs</span>
                            <span className="text-emerald-400">{meal.totals?.protein || 0}g protein</span>
                            <span className="text-blue-400">{meal.totals?.calories || 0} cal</span>
                          </div>
                          {meal.description && (
                            <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">"{meal.description}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-foreground font-medium">No meals logged yet</p>
                      <p className="text-muted-foreground text-sm">Start by analyzing your first meal!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
