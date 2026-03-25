import { useState, useRef, useEffect } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertMealSchema, type InsertMeal } from '@shared/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Utensils, Mic, AlertCircle, TrendingUp, Activity, Sparkles, Keyboard, Scale } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { getCurrentLanguage } from '@/i18n/config';
import LanguageSelector from '@/components/LanguageSelector';

export default function MealLoggingPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [description, setDescription] = useState('');
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [inputMode, setInputMode] = useState<'voice' | 'manual'>('manual');
  const [portionSize, setPortionSize] = useState('');
  const [portionUnit, setPortionUnit] = useState('grams');
  // Ref to store the latest transcript value to avoid timing issues
  const latestTranscriptRef = useRef('');

  const { data: profileData } = useQuery<{ profile: any }>({
    queryKey: ['/api/profile'],
  });
  
  const form = useForm<InsertMeal>({
    resolver: zodResolver(insertMealSchema),
    defaultValues: {
      name: '',
      carbs: 0,
      protein: 0,
      fat: 0,
      calories: 0,
      voiceRecorded: false,
    },
  });

  const createMealMutation = useMutation({
    mutationFn: async (data: InsertMeal) => {
      const response = await apiRequest('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('food.messages.logSuccess'),
        description: t('food.messages.logSuccessDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      form.reset();
      setIsRecording(false);
    },
    onError: (error: any) => {
      toast({
        title: t('food.messages.logError'),
        description: error.message || t('food.messages.logErrorDesc'),
        variant: 'destructive',
      });
    },
  });

  const { data: mealHistory } = useQuery<{ data: any[] }>({
    queryKey: ['/api/meals'],
  });

  const onSubmit = (data: InsertMeal) => {
    // Ensure voiceRecorded flag is properly set based on whether the meal was recorded via voice
    const isVoiceRecorded = inputMode === 'voice' && (isRecording || (latestTranscriptRef.current && latestTranscriptRef.current.trim() !== ''));
    createMealMutation.mutate({ ...data, voiceRecorded: !!isVoiceRecorded });
  };

  // Fuzzy string matching helper - calculates similarity between strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    
    const editDistance = (s1: string, s2: string): number => {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();
      const costs: number[] = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    };
    
    return (longer.length - editDistance(longer, shorter)) / longer.length;
  };

  // Comprehensive food database with Indian and international foods
  const foodDatabase = [
    // Indian Staples - Breads
    { names: ['chapati', 'roti', 'chapathi', 'chapti', 'phulka'], carbs: 15, protein: 3, fat: 1, calories: 80, sugar: 0 },
    { names: ['naan', 'nan', 'naan bread'], carbs: 45, protein: 9, fat: 8, calories: 262, sugar: 3 },
    { names: ['paratha', 'paratha', 'parotha', 'parota'], carbs: 28, protein: 5, fat: 10, calories: 210, sugar: 1 },
    { names: ['puri', 'poori', 'puri bread'], carbs: 20, protein: 3, fat: 12, calories: 164, sugar: 1 },
    { names: ['bhakri', 'bhakari', 'bhakhari'], carbs: 25, protein: 4, fat: 1, calories: 120, sugar: 0 },
    
    // Indian Rice Dishes
    { names: ['rice', 'white rice', 'steamed rice', 'plain rice'], carbs: 45, protein: 4, fat: 0.5, calories: 200, sugar: 0 },
    { names: ['brown rice', 'brown rice'], carbs: 50, protein: 5, fat: 2, calories: 218, sugar: 0 },
    { names: ['biryani', 'biriyani', 'briyani', 'veg biryani', 'chicken biryani'], carbs: 55, protein: 12, fat: 15, calories: 400, sugar: 2 },
    { names: ['pulao', 'pilaf', 'pulav', 'veg pulao'], carbs: 48, protein: 8, fat: 10, calories: 320, sugar: 1 },
    { names: ['jeera rice', 'cumin rice', 'zeera rice'], carbs: 46, protein: 4, fat: 5, calories: 240, sugar: 0 },
    { names: ['lemon rice', 'chitranna'], carbs: 50, protein: 4, fat: 8, calories: 280, sugar: 1 },
    { names: ['curd rice', 'yogurt rice', 'daddojanam', 'thayir sadam'], carbs: 42, protein: 8, fat: 6, calories: 250, sugar: 8 },
    
    // Indian Breakfast Items
    { names: ['idli', 'idly', 'idlli'], carbs: 12, protein: 3, fat: 0.5, calories: 65, sugar: 0 },
    { names: ['dosa', 'dosai', 'dose'], carbs: 28, protein: 6, fat: 4, calories: 168, sugar: 1 },
    { names: ['masala dosa', 'masala dose'], carbs: 45, protein: 8, fat: 12, calories: 320, sugar: 2 },
    { names: ['uttapam', 'uttappam', 'uthappam'], carbs: 32, protein: 7, fat: 5, calories: 200, sugar: 1 },
    { names: ['upma', 'uppma', 'uppittu'], carbs: 35, protein: 5, fat: 8, calories: 230, sugar: 1 },
    { names: ['poha', 'aval', 'avalakki', 'beaten rice'], carbs: 30, protein: 3, fat: 5, calories: 180, sugar: 2 },
    { names: ['medu vada', 'vada', 'vadai', 'medhu vada'], carbs: 18, protein: 5, fat: 12, calories: 180, sugar: 0 },
    { names: ['sambar vada', 'sambar vadai'], carbs: 25, protein: 7, fat: 10, calories: 210, sugar: 2 },
    { names: ['pongal', 'ven pongal', 'khara pongal'], carbs: 42, protein: 8, fat: 10, calories: 290, sugar: 1 },
    { names: ['rava dosa', 'ravai dosai'], carbs: 30, protein: 5, fat: 6, calories: 190, sugar: 1 },
    
    // Indian Curries & Gravies
    { names: ['dal', 'daal', 'dhal', 'lentils', 'dal curry'], carbs: 20, protein: 12, fat: 5, calories: 165, sugar: 1 },
    { names: ['sambar', 'sambhar', 'sambaar'], carbs: 18, protein: 8, fat: 4, calories: 130, sugar: 3 },
    { names: ['rasam', 'rasaam', 'chaaru'], carbs: 8, protein: 2, fat: 3, calories: 60, sugar: 2 },
    { names: ['paneer butter masala', 'paneer masala', 'butter paneer'], carbs: 15, protein: 14, fat: 20, calories: 300, sugar: 5 },
    { names: ['palak paneer', 'saag paneer'], carbs: 12, protein: 15, fat: 18, calories: 270, sugar: 3 },
    { names: ['chicken curry', 'murgh curry'], carbs: 10, protein: 25, fat: 12, calories: 250, sugar: 3 },
    { names: ['butter chicken', 'murgh makhani'], carbs: 12, protein: 28, fat: 20, calories: 350, sugar: 6 },
    { names: ['rajma', 'rajma curry', 'kidney beans'], carbs: 35, protein: 15, fat: 5, calories: 250, sugar: 2 },
    { names: ['chole', 'chana masala', 'chickpea curry'], carbs: 38, protein: 14, fat: 6, calories: 260, sugar: 3 },
    
    // Indian Snacks
    { names: ['samosa', 'samosa', 'singara'], carbs: 25, protein: 5, fat: 15, calories: 260, sugar: 2 },
    { names: ['pakora', 'pakoda', 'bhaji', 'bhajia'], carbs: 18, protein: 4, fat: 12, calories: 180, sugar: 1 },
    { names: ['vada pav', 'wada pav', 'vada pao'], carbs: 50, protein: 8, fat: 18, calories: 390, sugar: 3 },
    { names: ['pav bhaji', 'pav bhaji'], carbs: 55, protein: 10, fat: 15, calories: 400, sugar: 4 },
    { names: ['dhokla', 'khaman', 'khaman dhokla'], carbs: 28, protein: 6, fat: 4, calories: 170, sugar: 5 },
    { names: ['kachori', 'kachauri'], carbs: 30, protein: 6, fat: 18, calories: 300, sugar: 2 },
    { names: ['bhel puri', 'bhel', 'bhelpuri'], carbs: 45, protein: 5, fat: 8, calories: 270, sugar: 4 },
    
    // Indian Sweets
    { names: ['gulab jamun', 'gulab jamun', 'gulaab jamun'], carbs: 35, protein: 4, fat: 12, calories: 260, sugar: 30 },
    { names: ['jalebi', 'jalebi', 'jilapi'], carbs: 50, protein: 2, fat: 15, calories: 350, sugar: 45 },
    { names: ['ladoo', 'laddu', 'laddoo', 'besan ladoo'], carbs: 40, protein: 6, fat: 18, calories: 340, sugar: 35 },
    { names: ['barfi', 'burfi', 'milk barfi'], carbs: 38, protein: 8, fat: 15, calories: 320, sugar: 32 },
    { names: ['kheer', 'payasam', 'payas'], carbs: 42, protein: 7, fat: 10, calories: 280, sugar: 35 },
    { names: ['rasgulla', 'rasagulla', 'rosogolla'], carbs: 28, protein: 5, fat: 1, calories: 140, sugar: 25 },
    
    // International - Grains & Breads
    { names: ['bread', 'white bread', 'sandwich bread'], carbs: 30, protein: 5, fat: 2, calories: 180, sugar: 4 },
    { names: ['whole wheat bread', 'brown bread'], carbs: 28, protein: 6, fat: 2, calories: 170, sugar: 3 },
    { names: ['bagel', 'bagle'], carbs: 45, protein: 8, fat: 1, calories: 245, sugar: 5 },
    { names: ['croissant', 'croisant', 'kwason'], carbs: 26, protein: 5, fat: 12, calories: 231, sugar: 6 },
    { names: ['pasta', 'spaghetti', 'penne', 'macaroni'], carbs: 40, protein: 7, fat: 1, calories: 220, sugar: 2 },
    { names: ['quinoa', 'kinwa', 'quinua'], carbs: 39, protein: 8, fat: 4, calories: 222, sugar: 2 },
    { names: ['oatmeal', 'oats', 'porridge'], carbs: 40, protein: 6, fat: 3, calories: 220, sugar: 1 },
    
    // International - Proteins
    { names: ['chicken', 'chicken breast', 'grilled chicken'], carbs: 0, protein: 25, fat: 5, calories: 180, sugar: 0 },
    { names: ['fish', 'grilled fish', 'baked fish'], carbs: 0, protein: 22, fat: 8, calories: 180, sugar: 0 },
    { names: ['salmon', 'salman', 'grilled salmon'], carbs: 0, protein: 25, fat: 13, calories: 230, sugar: 0 },
    { names: ['egg', 'boiled egg', 'eggs'], carbs: 1, protein: 6, fat: 5, calories: 70, sugar: 0 },
    { names: ['omelet', 'omelette', 'omlette'], carbs: 2, protein: 12, fat: 10, calories: 154, sugar: 1 },
    { names: ['beef', 'steak', 'beef steak'], carbs: 0, protein: 26, fat: 15, calories: 250, sugar: 0 },
    { names: ['pork', 'pork chop'], carbs: 0, protein: 25, fat: 12, calories: 220, sugar: 0 },
    { names: ['tofu', 'bean curd'], carbs: 3, protein: 10, fat: 6, calories: 94, sugar: 1 },
    
    // International - Fast Food
    { names: ['pizza', 'cheese pizza', 'piza'], carbs: 35, protein: 12, fat: 12, calories: 300, sugar: 4 },
    { names: ['burger', 'hamburger', 'cheeseburger', 'burgar'], carbs: 40, protein: 20, fat: 18, calories: 400, sugar: 6 },
    { names: ['french fries', 'fries', 'chips'], carbs: 48, protein: 4, fat: 17, calories: 365, sugar: 1 },
    { names: ['hot dog', 'hotdog'], carbs: 25, protein: 10, fat: 15, calories: 290, sugar: 4 },
    { names: ['sandwich', 'sandwitch', 'club sandwich'], carbs: 35, protein: 15, fat: 10, calories: 300, sugar: 5 },
    { names: ['sub', 'subway', 'submarine sandwich'], carbs: 45, protein: 20, fat: 12, calories: 380, sugar: 6 },
    { names: ['taco', 'tacos'], carbs: 20, protein: 12, fat: 10, calories: 220, sugar: 2 },
    { names: ['burrito', 'burito'], carbs: 50, protein: 18, fat: 15, calories: 420, sugar: 3 },
    
    // Vegetables
    { names: ['salad', 'green salad', 'mixed salad'], carbs: 10, protein: 2, fat: 0.5, calories: 60, sugar: 4 },
    { names: ['broccoli', 'brocoli', 'brocolli'], carbs: 7, protein: 3, fat: 0.5, calories: 35, sugar: 2 },
    { names: ['potato', 'potatoes', 'boiled potato', 'aloo'], carbs: 37, protein: 4, fat: 0.5, calories: 163, sugar: 2 },
    { names: ['sweet potato', 'sweet potatoes', 'yam'], carbs: 41, protein: 2, fat: 0.5, calories: 180, sugar: 13 },
    { names: ['corn', 'maize', 'sweet corn'], carbs: 25, protein: 4, fat: 2, calories: 123, sugar: 6 },
    { names: ['peas', 'green peas', 'matar'], carbs: 21, protein: 8, fat: 0.5, calories: 118, sugar: 8 },
    
    // Fruits
    { names: ['banana', 'bananna', 'kela'], carbs: 27, protein: 1, fat: 0.5, calories: 105, sugar: 14 },
    { names: ['apple', 'aple', 'seb'], carbs: 25, protein: 0.5, fat: 0.5, calories: 95, sugar: 19 },
    { names: ['orange', 'orenge', 'santra'], carbs: 21, protein: 1, fat: 0.5, calories: 86, sugar: 17 },
    { names: ['mango', 'mangoes', 'aam'], carbs: 28, protein: 1, fat: 0.5, calories: 107, sugar: 24 },
    { names: ['grapes', 'grape', 'angoor'], carbs: 27, protein: 1, fat: 0.5, calories: 104, sugar: 23 },
    { names: ['watermelon', 'watermellon', 'tarbooj'], carbs: 12, protein: 1, fat: 0.5, calories: 46, sugar: 10 },
    { names: ['papaya', 'papaia', 'papita'], carbs: 15, protein: 1, fat: 0.5, calories: 59, sugar: 11 },
    { names: ['pineapple', 'pineaple', 'ananas'], carbs: 22, protein: 1, fat: 0.5, calories: 83, sugar: 16 },
    
    // Dairy
    { names: ['milk', 'whole milk', 'doodh'], carbs: 12, protein: 8, fat: 8, calories: 150, sugar: 12 },
    { names: ['skim milk', 'fat free milk', 'low fat milk'], carbs: 12, protein: 8, fat: 0.5, calories: 90, sugar: 12 },
    { names: ['yogurt', 'yoghurt', 'curd', 'dahi'], carbs: 15, protein: 10, fat: 4, calories: 120, sugar: 12 },
    { names: ['greek yogurt', 'greek yoghurt'], carbs: 9, protein: 17, fat: 5, calories: 130, sugar: 7 },
    { names: ['cheese', 'cheddar', 'paneer'], carbs: 2, protein: 14, fat: 18, calories: 220, sugar: 1 },
    { names: ['butter', 'makkhan'], carbs: 0, protein: 0.5, fat: 23, calories: 204, sugar: 0 },
    { names: ['ghee', 'clarified butter', 'ghee'], carbs: 0, protein: 0, fat: 25, calories: 225, sugar: 0 },
    
    // Beverages
    { names: ['coffee', 'black coffee', 'kafi'], carbs: 0, protein: 0.5, fat: 0, calories: 5, sugar: 0 },
    { names: ['tea', 'chai', 'black tea'], carbs: 0, protein: 0, fat: 0, calories: 2, sugar: 0 },
    { names: ['juice', 'fruit juice', 'orange juice'], carbs: 26, protein: 1, fat: 0, calories: 110, sugar: 24 },
    { names: ['soda', 'soft drink', 'coke', 'pepsi'], carbs: 39, protein: 0, fat: 0, calories: 150, sugar: 39 },
  ];

  // Enhanced nutrition estimator with fuzzy matching and spelling tolerance
  const estimateNutrition = (text: string) => {
    const lower = text.toLowerCase().trim();
    const ingredients: string[] = [];
    let carbs = 0, protein = 0, fat = 0, calories = 0, sugar = 0;
    const matchedFoods: string[] = [];

    const add = (foodName: string, nutrition: {carbs?:number, protein?:number, fat?:number, calories?:number, sugar?:number}) => {
      if (!matchedFoods.includes(foodName)) {
        ingredients.push(foodName);
        matchedFoods.push(foodName);
        carbs += nutrition.carbs || 0;
        protein += nutrition.protein || 0;
        fat += nutrition.fat || 0;
        calories += nutrition.calories || 0;
        sugar += nutrition.sugar || 0;
      }
    };

    // Extract numbers for quantity (pieces, cups, etc.)
    const numberMatch = lower.match(/(\d+)/);
    let quantity = numberMatch ? parseInt(numberMatch[1], 10) : 1;
    if (quantity > 20) quantity = 1; // Sanity check - likely grams not count

    // Check for each food in database with fuzzy matching
    foodDatabase.forEach(food => {
      food.names.forEach(foodName => {
        // Exact match
        if (lower.includes(foodName)) {
          add(foodName, food);
        } else {
          // Fuzzy match for spelling errors (similarity > 85%)
          const words = lower.split(/\s+/);
          words.forEach(word => {
            if (word.length > 2) { // Only fuzzy match words longer than 2 chars
              const similarity = calculateSimilarity(word, foodName);
              if (similarity > 0.80) { // Lower threshold for better matching
                add(foodName, food);
              }
            }
          });
        }
      });
    });

    // If no ingredients found, try splitting on common separators
    if (ingredients.length === 0) {
      const parts = lower.split(/[,;+&]|\band\b|\bwith\b/);
      parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed) {
          foodDatabase.forEach(food => {
            food.names.forEach(foodName => {
              const similarity = calculateSimilarity(trimmed, foodName);
              if (similarity > 0.70) { // Lower threshold for better matching
                add(foodName, food);
              }
            });
          });
        }
      });
    }

    // Portion size adjustments
    const gMatch = lower.match(/(\d+)\s?(g|grams?|gram)/i);
    const mlMatch = lower.match(/(\d+)\s?(ml|milliliters?)/i);
    const cupMatch = lower.match(/(\d+)\s?(cups?|cup)/i);
    const tbspMatch = lower.match(/(\d+)\s?(tbsp|tablespoons?)/i);
    const pieceMatch = lower.match(/(\d+)\s?(pieces?|pcs?|nos?|items?)/i);

    let portionMultiplier = 1;

    if (gMatch) {
      const grams = parseInt(gMatch[1], 10);
      portionMultiplier = grams / 100; // Nutritional values are per 100g
    } else if (mlMatch) {
      const ml = parseInt(mlMatch[1], 10);
      portionMultiplier = ml / 100;
    } else if (cupMatch) {
      const cups = parseInt(cupMatch[1], 10);
      portionMultiplier = cups * 2; // 1 cup ≈ 200g
    } else if (tbspMatch) {
      const tbsp = parseInt(tbspMatch[1], 10);
      portionMultiplier = tbsp * 0.15; // 1 tbsp ≈ 15g
    } else if (pieceMatch) {
      const pieces = parseInt(pieceMatch[1], 10);
      portionMultiplier = pieces; // Already per piece
    } else if (numberMatch && !lower.includes('gram') && !lower.includes('ml')) {
      // If just a number without unit, assume it's piece count
      portionMultiplier = quantity;
    }

    // Apply portion multiplier
    carbs = Math.round(carbs * portionMultiplier);
    protein = Math.round(protein * portionMultiplier);
    fat = Math.round(fat * portionMultiplier);
    calories = Math.round(calories * portionMultiplier);
    sugar = Math.round(sugar * portionMultiplier);

    // If still no match, provide generic estimation
    if (ingredients.length === 0) {
      ingredients.push('Unknown food item');
      carbs = 30; // Generic meal assumption
      protein = 8;
      fat = 5;
      calories = 200;
      sugar = 3;
    }

    return { ingredients, macros: { carbs, protein, fat, calories, sugar } };
  };

  const impactInsights = (macros: any, profile: any) => {
    const type = profile?.profile?.diabetesType || 'unknown';
    const insulin = profile?.profile?.typicalInsulin || 0;
    const carbs = macros.carbs || 0;
    const glycemicLoad = Math.round(carbs * 0.55); // rough estimate
    let impact = 'moderate';
    if (carbs >= 60) impact = 'high';
    else if (carbs <= 25) impact = 'low';

    let recommendation = 'Consider pre-bolus insulin and post-meal walk.';
    if (type === 'type 1') recommendation = 'Match insulin dose to carbs (ICR). Pre-bolus 10–15 min.';
    if (type === 'type 2') recommendation = 'Prefer lower GI foods; add protein/fiber to reduce spike.';

    return {
      impact,
      glycemicLoad,
      recommendation,
      advisory: insulin > 0 ? 'Adjust dose per ICR/ISF if applicable.' : 'Monitor post-meal glucose closely.',
    };
  };

  const analyzeDescription = (text: string) => {
    if (!text.trim()) {
      toast({
        title: t('food.messages.noInput'),
        description: t('food.messages.noInputDesc'),
        variant: 'destructive',
      });
      return;
    }
    
    const est = estimateNutrition(text);
    const insights = impactInsights(est.macros, profileData);
    setAnalysis({ ...est, insights });
    
    // pre-fill form
    form.setValue('name', text.trim());
    form.setValue('carbs', est.macros.carbs || 0);
    form.setValue('protein', est.macros.protein || 0);
    form.setValue('fat', est.macros.fat || 0);
    form.setValue('calories', est.macros.calories || 0);
    
    // Provide helpful feedback
    if (est.ingredients.length > 0 && est.ingredients[0] !== 'Unknown food item') {
      toast({
        title: t('food.messages.analysisComplete'),
        description: t('food.messages.recognizedFoods', { count: est.ingredients.length, foods: est.ingredients.join(', ') }),
      });
    } else {
      toast({
        title: t('food.messages.genericEstimation'),
        description: t('food.messages.genericEstimationDesc'),
        variant: 'default',
      });
    }
  };

  // Voice recording handler
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      // Reinitialize speech recognition when language changes
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 3; // Get multiple alternatives for better accuracy
      // Set language based on current i18n language
      // Map i18n language codes to speech recognition language codes
      const languageMap: Record<string, string> = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'kn': 'kn-IN',
        'te': 'te-IN',
      };
      recognitionRef.current.lang = languageMap[getCurrentLanguage()] || 'en-US';

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          // Use the best alternative (index 0) for highest confidence
          const transcript = event.results[i][0].transcript;
          interim += transcript;
        }
        setTranscript(interim);
        setDescription(interim);
        // Update ref with latest transcript to avoid timing issues
        latestTranscriptRef.current = interim;
        
        // Reset silence timeout on speech activity
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Set timeout to stop recording after 3 seconds of silence
        silenceTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
          }
        }, 3000);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: t('food.messages.speechNotSupported'),
          description: t('food.messages.speechError', { error: event.error }),
          variant: 'destructive',
        });
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        // Only analyze if we have a transcript and we're in voice mode
        // Use the latest transcript value from the ref to avoid timing issues
        if (latestTranscriptRef.current && latestTranscriptRef.current.trim() && inputMode === 'voice') {
          analyzeDescription(latestTranscriptRef.current);
        }
      };
    }
    
    // Cleanup function to stop recognition when component unmounts
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      // Clear timeout on unmount
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [transcript, toast, t, inputMode, i18n.language]);

  const handleVoiceRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: t('food.messages.speechNotSupported'),
        description: t('food.messages.speechNotSupportedDesc'),
        variant: 'destructive',
      });
      return;
    }

    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: t('food.messages.speechNotSupported'),
        description: t('food.messages.speechNotSupportedDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      // Clear timeout when manually stopping
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    } else {
      setTranscript('');
      setDescription('');
      setAnalysis(null);
      latestTranscriptRef.current = '';
      // Clear any existing timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      // Update language before starting recognition
      // Map i18n language codes to speech recognition language codes
      const languageMap: Record<string, string> = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'kn': 'kn-IN',
        'te': 'te-IN',
      };
      recognitionRef.current.lang = languageMap[getCurrentLanguage()] || 'en-US';
      recognitionRef.current.start();
    }
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Utensils className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Food AI</h2>
          </div>
          <LanguageSelector />
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">{t('food.title')}</h1>
              <p className="text-muted-foreground">{t('food.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Utensils className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">New Meal</h2>
                </div>

                <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'voice' | 'manual')} className="mb-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual" className="flex items-center gap-2">
                      <Keyboard className="h-4 w-4" />
                      Type Manually
                    </TabsTrigger>
                    <TabsTrigger value="voice" className="flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Voice Input
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Food Description</label>
                      <Input
                        placeholder="e.g., 2 chapati with dal, biryani 200g, dosa idli sambar, chicken salad"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        data-testid="input-meal-description"
                      />
                      <p className="text-xs text-muted-foreground">💡 Tip: Just type what you ate - spelling doesn't need to be perfect!</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none flex items-center gap-2">
                          <Scale className="h-3 w-3" />
                          Portion Size
                        </label>
                        <Input
                          type="number"
                          placeholder="200"
                          value={portionSize}
                          onChange={(e) => setPortionSize(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Unit</label>
                        <Select value={portionUnit} onValueChange={setPortionUnit}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="grams">Grams (g)</SelectItem>
                            <SelectItem value="oz">Ounces (oz)</SelectItem>
                            <SelectItem value="cup">Cup</SelectItem>
                            <SelectItem value="tbsp">Tablespoon</SelectItem>
                            <SelectItem value="pieces">Pieces</SelectItem>
                            <SelectItem value="serving">Serving</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button 
                      type="button" 
                      onClick={() => {
                        const desc = portionSize ? `${description}, ${portionSize}${portionUnit}` : description;
                        analyzeDescription(desc);
                      }} 
                      className="w-full" 
                      disabled={!description.trim()}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze Nutrition
                    </Button>
                  </TabsContent>

                  <TabsContent value="voice" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Speak Your Meal</label>
                      <Input
                        placeholder="e.g., I ate two idlis with sambar, or chicken biryani 250 grams"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        data-testid="input-meal-description-voice"
                        className={isRecording ? 'border-red-500 animate-pulse' : ''}
                        readOnly={isRecording}
                      />
                      <p className="text-xs text-muted-foreground">💡 Tip: Speak naturally - say food name and quantity</p>
                      {isRecording && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <Activity className="h-3 w-3 animate-pulse" />
                          Listening... Speak now
                        </p>
                      )}
                      {transcript && !isRecording && (
                        <p className="text-xs text-green-500 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          Captured: {transcript}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant={isRecording ? 'destructive' : 'default'} 
                        onClick={handleVoiceRecording} 
                        className="flex-1" 
                        data-testid="button-voice-record"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        {isRecording ? 'Stop Recording' : 'Start Voice Input'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => analyzeDescription(description)} 
                        className="flex-1" 
                        data-testid="button-analyze" 
                        disabled={!description.trim()}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Analysis Results */}
                {analysis && (
                  <div className="mb-6 space-y-4">
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          AI Nutritional Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Ingredients */}
                        {analysis.ingredients.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Detected Ingredients:</p>
                            <div className="flex flex-wrap gap-1">
                              {analysis.ingredients.map((ing: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">{ing}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Macros */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Macronutrients:</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-background/50 rounded p-2">
                              <span className="text-muted-foreground">Carbs:</span>
                              <span className="ml-1 font-bold text-orange-500">{analysis.macros.carbs}g</span>
                            </div>
                            <div className="bg-background/50 rounded p-2">
                              <span className="text-muted-foreground">Protein:</span>
                              <span className="ml-1 font-bold text-blue-500">{analysis.macros.protein}g</span>
                            </div>
                            <div className="bg-background/50 rounded p-2">
                              <span className="text-muted-foreground">Fat:</span>
                              <span className="ml-1 font-bold text-yellow-500">{analysis.macros.fat}g</span>
                            </div>
                            <div className="bg-background/50 rounded p-2">
                              <span className="text-muted-foreground">Sugar:</span>
                              <span className="ml-1 font-bold text-red-500">{analysis.macros.sugar}g</span>
                            </div>
                          </div>
                          <div className="bg-primary/20 rounded p-2 mt-2 text-center">
                            <span className="text-muted-foreground text-sm">Total Calories:</span>
                            <span className="ml-2 font-bold text-lg text-primary">{analysis.macros.calories}</span>
                          </div>
                        </div>

                        {/* Blood Sugar Impact */}
                        <Alert className={`border-2 ${
                          analysis.insights.impact === 'high' ? 'border-red-500 bg-red-500/10' :
                          analysis.insights.impact === 'moderate' ? 'border-yellow-500 bg-yellow-500/10' :
                          'border-green-500 bg-green-500/10'
                        }`}>
                          <TrendingUp className="h-4 w-4" />
                          <AlertDescription className="space-y-2">
                            <div>
                              <p className="font-semibold text-sm">Blood Sugar Impact: <span className="uppercase">{analysis.insights.impact}</span></p>
                              <p className="text-xs text-muted-foreground">Estimated Glycemic Load: {analysis.insights.glycemicLoad}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs"><strong>Recommendation:</strong> {analysis.insights.recommendation}</p>
                              <p className="text-xs"><strong>Advisory:</strong> {analysis.insights.advisory}</p>
                            </div>
                          </AlertDescription>
                        </Alert>

                        {/* Personalized Insights */}
                        {profileData?.profile && (
                          <div className="bg-background/50 rounded p-3 space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground">Personalized Insights:</p>
                            <p className="text-xs">
                              • Diabetes Type: <strong>{profileData.profile.diabetesType || 'Not specified'}</strong>
                            </p>
                            {profileData.profile.typicalInsulin > 0 && (
                              <p className="text-xs">
                                • Typical Insulin: <strong>{profileData.profile.typicalInsulin} units</strong>
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground italic">
                              This meal contains {analysis.macros.carbs}g of carbs. Consider your insulin-to-carb ratio when dosing.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meal Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Breakfast, Chicken Salad"
                              {...field}
                              data-testid="input-meal-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="carbs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carbohydrates (grams)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter carbs"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              data-testid="input-carbs"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="protein"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Protein (grams, optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter protein"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              data-testid="input-protein"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fat (grams, optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter fat"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              data-testid="input-fat"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="calories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calories (optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter calories"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              data-testid="input-calories"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createMealMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createMealMutation.isPending ? 'Logging...' : 'Log Meal'}
                    </Button>
                  </form>
                </Form>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Utensils className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Recent Meals</h2>
                </div>

                <div className="space-y-3">
                  {mealHistory?.data?.slice(0, 5).map((meal: any) => (
                    <div
                      key={meal._id}
                      className="p-4 rounded-lg bg-secondary/50 space-y-2"
                      data-testid={`meal-${meal._id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold" data-testid={`text-meal-name-${meal._id}`}>
                          {meal.name}
                        </span>
                        {meal.voiceRecorded && (
                          <Mic className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(meal.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Carbs:</span>
                          <span className="ml-1 font-semibold" data-testid={`text-carbs-${meal._id}`}>
                            {meal.carbs}g
                          </span>
                        </div>
                        {meal.protein > 0 && (
                          <div>
                            <span className="text-muted-foreground">Protein:</span>
                            <span className="ml-1 font-semibold">{meal.protein}g</span>
                          </div>
                        )}
                        {meal.fat > 0 && (
                          <div>
                            <span className="text-muted-foreground">Fat:</span>
                            <span className="ml-1 font-semibold">{meal.fat}g</span>
                          </div>
                        )}
                        {meal.calories > 0 && (
                          <div>
                            <span className="text-muted-foreground">Calories:</span>
                            <span className="ml-1 font-semibold">{meal.calories}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No meals logged yet. Log your first meal!
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
