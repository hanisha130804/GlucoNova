import { useState, useEffect, useRef } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { 
  Lightbulb, Activity, TrendingUp, Apple, Heart, Footprints, Loader2, Sparkles,
  Bot, Target, Utensils, Flame, CheckCircle, XCircle, ArrowRight, Calendar,
  Clock, Mic, Trophy, Star, Leaf, Coffee, Dumbbell, Plus, Info, Zap, Volume2, RotateCw, Globe
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FoodImageService } from '@/services/FoodImageService';
import { apiRequest } from '@/lib/queryClient';

interface SuggestionsData {
  dailyFocus: string;
  patterns: string[];
}

interface FoodItem {
  id: number;
  name: string;
  description: string;
  category: 'breakfast' | 'snack' | 'drink';
  carbs: number;
  protein: number;
  fiber: number;
  calories: number;
  impact: 'low' | 'medium' | 'high';
  gi: number;
  tags: string[];
  image: string;
  region: string;
  prepTime: string;
}

// Enhanced Indian Food Database with Corrected Images
const INDIAN_FOOD_DATABASE: FoodItem[] = [
  {
    id: 1,
    name: "Vegetable Upma",
    description: "Semolina cooked with vegetables, spices, and nuts. High fiber content helps in slow glucose release.",
    category: "breakfast",
    carbs: 45, protein: 12, fiber: 6, calories: 280,
    impact: "low", gi: 56,
    tags: ["High Fiber", "Low GI", "Vegetarian"],
    image: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?fit=crop&w=800&q=80",
    region: "south", prepTime: "20 mins"
  },
  {
    id: 2,
    name: "Vegetable Poha",
    description: "Flattened rice cooked with onions, peas, and peanuts. Balanced carbs with protein and healthy fats.",
    category: "breakfast",
    carbs: 52, protein: 15, fiber: 4, calories: 320,
    impact: "medium", gi: 59,
    tags: ["Low GI", "With Peanuts", "Gluten Free"],
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
    region: "west", prepTime: "15 mins"
  },
  {
    id: 3,
    name: "Moong Dal Chilla",
    description: "Savory lentil pancakes made with moong dal. Protein rich, helps prevent glucose spikes.",
    category: "snack",
    carbs: 18, protein: 12, fiber: 5, calories: 180,
    impact: "low", gi: 25,
    tags: ["High Protein", "Gluten Free", "Diabetic Friendly"],
    image: "https://images.unsplash.com/photo-1565299552127-2065f6d5f736?auto=format&fit=crop&w=800&q=80",
    region: "north", prepTime: "25 mins"
  },
  {
    id: 4,
    name: "Sprouted Moong Salad",
    description: "Fresh sprouted moong beans with vegetables. High in fiber and vitamins, minimal glucose impact.",
    category: "snack",
    carbs: 20, protein: 9, fiber: 8, calories: 120,
    impact: "low", gi: 20,
    tags: ["High Fiber", "Raw", "Low Calorie"],
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    region: "all", prepTime: "10 mins"
  },
  {
    id: 5,
    name: "Buttermilk (Chaas)",
    description: "Traditional Indian probiotic drink. Helps digestion and provides hydration without added sugar.",
    category: "drink",
    carbs: 8, protein: 6, fiber: 0, calories: 60,
    impact: "low", gi: 15,
    tags: ["Probiotic", "Hydrating", "Low Calorie"],
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    region: "all", prepTime: "5 mins"
  },
  {
    id: 6,
    name: "Cucumber & Carrot Sticks with Hummus",
    description: "Fresh vegetables with hummus dip. Crunchy, satisfying snack with healthy fats.",
    category: "snack",
    carbs: 15, protein: 6, fiber: 4, calories: 150,
    impact: "low", gi: 15,
    tags: ["Raw", "High Fiber", "Vegetarian"],
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?auto=format&fit=crop&w=800&q=80",
    region: "all", prepTime: "10 mins"
  },
  {
    id: 7,
    name: "Almonds (Handful)",
    description: "10-12 almonds. High in healthy fats and protein, keeps you full longer.",
    category: "snack",
    carbs: 6, protein: 6, fiber: 3, calories: 125,
    impact: "low", gi: 0,
    tags: ["High Protein", "Healthy Fats", "Portion Control"],
    image: "https://images.unsplash.com/photo-1628253747716-0c4e0354a7c4?auto=format&fit=crop&w=800&q=80",
    region: "all", prepTime: "0 mins"
  },
  {
    id: 8,
    name: "Idli with Sambar",
    description: "Steamed rice cakes with lentil soup. Light, easily digestible South Indian breakfast.",
    category: "breakfast",
    carbs: 40, protein: 10, fiber: 4, calories: 180,
    impact: "low", gi: 53,
    tags: ["Steamed", "Low Fat", "Protein Rich"],
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
    region: "south", prepTime: "30 mins"
  },
  {
    id: 9,
    name: "Dosa with Chutney",
    description: "Crispy fermented crepe made from rice batter. Served with coconut chutney.",
    category: "breakfast",
    carbs: 55, protein: 8, fiber: 2, calories: 250,
    impact: "medium", gi: 58,
    tags: ["Fermented", "Crispy", "South Indian"],
    image: "https://images.unsplash.com/photo-1630142771938-7548c2d2e5fa?auto=format&fit=crop&w=800&q=80",
    region: "south", prepTime: "30 mins"
  },
  {
    id: 10,
    name: "Chapati with Dal",
    description: "Whole wheat flatbread with lentil curry. Balanced meal with complex carbs and protein.",
    category: "breakfast",
    carbs: 45, protein: 18, fiber: 8, calories: 320,
    impact: "low", gi: 55,
    tags: ["Whole Wheat", "High Protein", "Traditional"],
    image: "https://images.unsplash.com/photo-1585937421612-70ca003675ed?auto=format&fit=crop&w=800&q=80",
    region: "north", prepTime: "25 mins"
  },
];

// Fallback Image System
const FOOD_IMAGE_FALLBACKS: Record<string, string> = {
  "Vegetable Upma": "https://i.ibb.co/1qYqJ3T/upma.jpg",
  "Vegetable Poha": "https://i.ibb.co/5sJqZqP/poha.jpg",
  "Moong Dal Chilla": "https://i.ibb.co/3hZ8zJ8/chilla.jpg",
  "Sprouted Moong Salad": "https://i.ibb.co/7WqyYrP/sprouts-salad.jpg",
  "Buttermilk (Chaas)": "https://i.ibb.co/5KzQ2Yz/buttermilk.jpg",
  "Cucumber & Carrot Sticks with Hummus": "https://i.ibb.co/0jycLqT/veggie-sticks.jpg",
  "Almonds (Handful)": "https://i.ibb.co/8XK1q2B/almonds.jpg",
  "Idli with Sambar": "https://i.ibb.co/3zR8Z0J/idli.jpg",
  "Dosa with Chutney": "https://i.ibb.co/8DqJY5X/dosa.jpg",
  "Chapati with Dal": "https://i.ibb.co/6ZxH8tT/chapati-dal.jpg"
};

// Food Icon Mapping for icon-based fallback
const FOOD_ICONS: Record<string, string> = {
  "Vegetable Upma": "🥣",
  "Vegetable Poha": "🍚",
  "Moong Dal Chilla": "🥞",
  "Sprouted Moong Salad": "🥗",
  "Buttermilk (Chaas)": "🥛",
  "Cucumber & Carrot Sticks with Hummus": "🥒",
  "Almonds (Handful)": "🌰",
  "Idli with Sambar": "🍥",
  "Dosa with Chutney": "🥞",
  "Chapati with Dal": "🫓"
};

export default function SuggestionsActivityPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: suggestions, isLoading } = useQuery<SuggestionsData>({
    queryKey: ['/api/suggestions-activity/today'],
  });

  // State management
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [mealProgress, setMealProgress] = useState({ current: 1, total: 3 });
  const [weeklyGoals, setWeeklyGoals] = useState({
    meals: { current: 12, total: 21 },
    activity: { current: 120, total: 150 },
    glucose: { current: 75, total: 100 }
  });
  const [streak, setStreak] = useState(7);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [currentBreakfastIdeas, setCurrentBreakfastIdeas] = useState<typeof allBreakfastOptions>([]);
  const recognitionRef = useRef<any>(null);

  // New states for enhanced food system
  const [breakfastFoods, setBreakfastFoods] = useState<FoodItem[]>(() => {
    return INDIAN_FOOD_DATABASE.filter(food => food.category === 'breakfast').slice(0, 2);
  });
  const [snackFoods, setSnackFoods] = useState<FoodItem[]>(() => {
    return INDIAN_FOOD_DATABASE.filter(food => 
      food.category === 'snack' || food.category === 'drink'
    ).slice(0, 4);
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [activeSnackFilter, setActiveSnackFilter] = useState<'all' | 'lowCal' | 'highProtein'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extended breakfast database with variety
  const allBreakfastOptions = [
    { 
      name: 'Vegetable Upma', 
      benefit: 'Semolina cooked with vegetables, spices, and nuts. High fiber content helps in slow glucose release.',
      carbs: 45, protein: 12, calories: 280, 
      tags: ['High Fiber', 'Low GI', 'Balanced'],
      image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?fit=crop&w=800&q=80'
    },
    { 
      name: 'Vegetable Poha', 
      benefit: 'Flattened rice cooked with onions, peas, and peanuts. Balanced carbs with protein and healthy fats.',
      carbs: 52, protein: 15, calories: 320,
      tags: ['Low GI', 'With Peanuts'],
      image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=800'
    },
    { 
      name: 'Moong Dal Cheela', 
      benefit: 'Protein-rich lentil pancake, helps reduce glucose spikes',
      carbs: 38, protein: 18, calories: 240,
      tags: ['High Protein', 'Low GI'],
      image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800'
    },
    { 
      name: 'Besan Chilla', 
      benefit: 'Chickpea flour pancakes with vegetables, high in protein and fiber.',
      carbs: 30, protein: 18, calories: 250,
      tags: ['High Protein', 'Gluten-Free'],
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800'
    },
    { 
      name: 'Oats Idli', 
      benefit: 'Steamed oat cakes with vegetables, low glycemic index.',
      carbs: 40, protein: 10, calories: 200,
      tags: ['High Fiber', 'Low GI'],
      image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=800'
    },
    { 
      name: 'Quinoa Pongal', 
      benefit: 'Quinoa cooked with lentils and spices, protein-packed alternative.',
      carbs: 35, protein: 14, calories: 220,
      tags: ['High Protein', 'Low GI'],
      image: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=800'
    },
  ];

  // Get random breakfast ideas
  const getRandomBreakfasts = (count: number) => {
    const shuffled = [...allBreakfastOptions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Daily auto-refresh
  useEffect(() => {
    const lastRefresh = localStorage.getItem('lastBreakfastRefresh');
    const today = new Date().toDateString();
    
    if (lastRefresh !== today) {
      setCurrentBreakfastIdeas(getRandomBreakfasts(3));
      localStorage.setItem('lastBreakfastRefresh', today);
    } else {
      setCurrentBreakfastIdeas(getRandomBreakfasts(3));
    }
  }, []);

  // Refresh breakfast ideas
  const refreshBreakfasts = () => {
    setCurrentBreakfastIdeas(getRandomBreakfasts(3));
    toast({
      title: '🔄 New Ideas!',
      description: 'Fresh breakfast suggestions loaded.'
    });
  };

  // Voice Recognition Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-IN';

      recognitionRef.current.onstart = () => setIsVoiceListening(true);
      recognitionRef.current.onend = () => setIsVoiceListening(false);
      recognitionRef.current.onerror = () => setIsVoiceListening(false);

      recognitionRef.current.onresult = (event: any) => {
        const command = event.results[0][0].transcript.toLowerCase();
        processVoiceCommand(command);
      };
    }

    // Welcome message
    setTimeout(() => {
      toast({
        title: '👋 Welcome to AI Health Coach!',
        description: 'Try voice commands or explore meal suggestions below.'
      });
    }, 1000);
  }, []);

  // Voice command processor
  const processVoiceCommand = (command: string) => {
    const cmd = command.toLowerCase();
    
    // Food-specific commands
    if (cmd.includes('show me breakfast') || cmd.includes('breakfast options')) {
      refreshBreakfast();
      speakResponse('Refreshing breakfast suggestions for you.');
      return;
    }
    
    if (cmd.includes('show me snacks') || cmd.includes('snack ideas')) {
      refreshSnacks();
      speakResponse('Finding new snack options for you.');
      return;
    }
    
    if (cmd.includes('low calorie') || cmd.includes('low cal')) {
      filterByCalories();
      speakResponse('Showing low calorie snack options.');
      return;
    }
    
    if (cmd.includes('high protein')) {
      filterByProtein();
      speakResponse('Showing high protein snacks.');
      return;
    }
    
    if (cmd.includes('all snacks') || cmd.includes('show all')) {
      showAllSnacks();
      speakResponse('Showing all snack options.');
      return;
    }
    
    // Check for specific food names
    const foods = INDIAN_FOOD_DATABASE.map(f => f.name.toLowerCase());
    const foundFood = foods.find(foodName => cmd.includes(foodName));
    
    if (foundFood) {
      const food = INDIAN_FOOD_DATABASE.find(f => 
        f.name.toLowerCase() === foundFood
      );
      
      if (food) {
        openFoodDetails(food);
        speakResponse(`Showing details for ${food.name}. This has ${food.carbs} grams of carbs.`);
        return;
      }
    }
    
    // Original commands
    if (cmd.includes('breakfast')) {
      speakResponse('Here are some breakfast ideas. Vegetable upma and poha are great options.');
      toast({ title: '🎤 Voice Command', description: 'Showing breakfast ideas' });
    } else if (cmd.includes('snack')) {
      speakResponse('Smart snack options include almonds, cucumber sticks, or moong dal chilla.');
    } else if (cmd.includes('progress')) {
      speakResponse(`You've logged ${weeklyGoals.meals.current} meals this week and completed ${weeklyGoals.activity.current} minutes of activity. Keep it up!`);
    } else if (cmd.includes('help')) {
      speakResponse('I can help with meal suggestions, activity planning, and tracking your progress. Just ask!');
    }
  };

  const speakResponse = (text: string, type: 'meal-logged' | 'achievement' | 'error' | 'info' = 'info') => {
    // Check voice settings from localStorage
    const voiceSettings = {
      enabled: localStorage.getItem('voiceEnabled') !== 'false',
      feedbackType: (localStorage.getItem('voiceFeedbackType') || 'minimal') as 'minimal' | 'detailed' | 'silent',
      volume: parseFloat(localStorage.getItem('voiceVolume') || '0.5'),
      speed: parseFloat(localStorage.getItem('voiceSpeed') || '1.0')
    };
    
    // Skip if voice disabled or silent mode
    if (!voiceSettings.enabled || voiceSettings.feedbackType === 'silent') return;
    
    // Skip info messages in minimal mode
    if (voiceSettings.feedbackType === 'minimal' && type === 'info') return;
    
    // Adjust text based on feedback type
    let finalText = text;
    if (voiceSettings.feedbackType === 'minimal') {
      if (type === 'meal-logged') {
        finalText = "Logged!";
      } else if (type === 'achievement') {
        finalText = "Achievement unlocked!";
      }
    }
    
    // Speak with settings
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(finalText);
      utterance.volume = voiceSettings.volume;
      utterance.rate = voiceSettings.speed;
      utterance.pitch = 1;
      utterance.lang = 'en-IN';
      
      // Stop any currently speaking
      window.speechSynthesis.cancel();
      
      // Add slight delay for better UX
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  const toggleVoiceAssistant = () => {
    if (!recognitionRef.current) {
      toast({ title: 'Voice Not Supported', description: 'Your browser does not support voice input.', variant: 'destructive' });
      return;
    }
    if (isVoiceListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      toast({ title: '🎤 Listening', description: 'Speak your command now...' });
    }
  };

  const logMeal = (mealName: string) => {
    // Find the food item to get nutrition data
    const foodItem = INDIAN_FOOD_DATABASE.find(f => f.name === mealName);
    
    if (!foodItem) {
      toast({ 
        title: '❌ Error', 
        description: 'Food item not found',
        variant: 'destructive'
      });
      return;
    }

    // Save to AI Food Log database with proper structure
    logMealMutation.mutate({
      description: foodItem.description,
      mealName: foodItem.name,
      items: [
        {
          name: foodItem.name,
          carbs: foodItem.carbs,
          protein: foodItem.protein,
          fat: 0,
          calories: foodItem.calories,
          quantity: 1
        }
      ],
      totals: {
        carbs: foodItem.carbs,
        protein: foodItem.protein,
        fat: 0,
        calories: foodItem.calories,
        overallImpactLevel: foodItem.impact
      },
      suggestions: foodItem.tags,
      healthBenefits: foodItem.description,
      alternatives: ''
    });
  };

  // Meal logging mutation - Save to AI Food Log endpoint
  const logMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/ai-food-log/log', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Update local state
      setMealProgress(prev => ({ ...prev, current: Math.min(prev.current + 1, prev.total) }));
      setWeeklyGoals(prev => ({
        ...prev,
        meals: { ...prev.meals, current: Math.min(prev.meals.current + 1, prev.meals.total) }
      }));
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/ai-food-log/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/meal-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions-activity/today'] });
      
      // Success feedback
      toast({ 
        title: '✓ Meal Logged!', 
        description: `${variables.mealName} has been saved and will appear in Recent Meals.` 
      });
      speakResponse(`${variables.mealName} logged. Great choice!`, 'meal-logged');
      
      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Log Meal',
        description: error.message || 'Please login to save meals.',
        variant: 'destructive',
      });
    },
  });

  const logActivity = (activityName: string) => {
    setWeeklyGoals(prev => ({
      ...prev,
      activity: { ...prev.activity, current: Math.min(prev.activity.current + 15, prev.activity.total) }
    }));
    toast({ title: '✓ Activity Completed!', description: `${activityName} logged successfully.` });
    speakResponse(`Great job completing ${activityName}!`, 'achievement');
  };

  // Enhanced food system functions
  const refreshBreakfast = () => {
    setIsRefreshing(true);
    const allBreakfasts = INDIAN_FOOD_DATABASE.filter(food => food.category === 'breakfast');
    const shuffled = [...allBreakfasts].sort(() => Math.random() - 0.5);
    setBreakfastFoods(shuffled.slice(0, 2));
    
    setTimeout(() => {
      setIsRefreshing(false);
      toast({ title: '✨ Refreshed!', description: 'New breakfast suggestions loaded.' });
    }, 800);
  };

  const refreshSnacks = () => {
    setIsRefreshing(true);
    let filteredSnacks = INDIAN_FOOD_DATABASE.filter(food => 
      food.category === 'snack' || food.category === 'drink'
    );
    
    if (activeSnackFilter === 'lowCal') {
      filteredSnacks = filteredSnacks.filter(food => food.calories <= 150);
    } else if (activeSnackFilter === 'highProtein') {
      filteredSnacks = filteredSnacks.filter(food => food.protein >= 10);
    }
    
    const shuffled = [...filteredSnacks].sort(() => Math.random() - 0.5);
    setSnackFoods(shuffled.slice(0, 4));
    
    setTimeout(() => {
      setIsRefreshing(false);
      toast({ title: '✨ Refreshed!', description: 'New snack suggestions loaded.' });
    }, 800);
  };

  const filterByCalories = () => {
    setActiveSnackFilter('lowCal');
    const filtered = INDIAN_FOOD_DATABASE.filter(food => 
      (food.category === 'snack' || food.category === 'drink') && 
      food.calories <= 150
    );
    setSnackFoods(filtered.slice(0, 4));
    toast({ title: '🍃 Low Calorie', description: 'Showing snacks under 150 calories' });
  };

  const filterByProtein = () => {
    setActiveSnackFilter('highProtein');
    const filtered = INDIAN_FOOD_DATABASE.filter(food => 
      (food.category === 'snack' || food.category === 'drink') && 
      food.protein >= 10
    );
    setSnackFoods(filtered.slice(0, 4));
    toast({ title: '💪 High Protein', description: 'Showing high protein snacks (10g+)' });
  };

  const showAllSnacks = () => {
    setActiveSnackFilter('all');
    const allSnacks = INDIAN_FOOD_DATABASE.filter(food => 
      food.category === 'snack' || food.category === 'drink'
    );
    setSnackFoods(allSnacks.slice(0, 4));
  };

  const openFoodDetails = (food: FoodItem) => {
    setSelectedFood(food);
    setIsModalOpen(true);
  };



  const snackOptions = [
    { name: 'Handful of Almonds (10-12)', icon: Leaf, calories: 125, protein: 4, impact: 'Low', benefit: 'High in healthy fats and protein' },
    { name: 'Cucumber & Carrot Sticks with Hummus', icon: Apple, calories: 150, protein: 6, impact: 'Low', benefit: 'Crunchy and satisfying' },
    { name: 'Moong Dal Chilla with Mint Chutney', icon: Coffee, calories: 180, protein: 12, impact: 'Low', benefit: 'Protein rich, helps prevent glucose spikes' },
    { name: 'Sprouted Moong Salad', icon: Leaf, calories: 130, protein: 14, impact: 'Low', benefit: 'Rich in fiber and nutrients' },
  ];

  const smartSwaps = [
    { 
      from: { name: 'White Rice', gi: 73, carbs: 65, impact: 'high' },
      to: { name: 'Brown Rice / Millet / Quinoa', gi: 55, carbs: 55, impact: 'low' }
    },
    { 
      from: { name: 'Fried Paratha', gi: 0, carbs: 320, impact: 'high', label: 'High Fat' },
      to: { name: 'Baked Samosas / Air-fried Snacks', gi: 0, carbs: 180, impact: 'low', label: 'Reduced Fat' }
    },
    { 
      from: { name: 'Refined Flour Roti', gi: 0, carbs: 2, impact: 'high', label: 'Quick Digestion' },
      to: { name: 'Multigrain / Bajra Roti', gi: 0, carbs: 6, impact: 'low', label: 'Slower Digestion' }
    },
  ];

  const weekDays = [
    { label: 'Today', day: 'Mon', date: 'Dec 25', active: true, completed: false },
    { label: 'Tomorrow', day: 'Tue', date: 'Dec 26', active: false, completed: false },
    { label: 'Completed', day: 'Sun', date: 'Dec 24', active: false, completed: true },
    { label: 'Upcoming', day: 'Wed', date: 'Dec 27', active: false, completed: false },
    { label: 'Upcoming', day: 'Thu', date: 'Dec 28', active: false, completed: false },
  ];

  const activities = [
    { time: '8:00 AM', name: 'Morning Walk', duration: '30 minutes', location: 'Park', icon: Footprints, color: 'emerald' },
    { time: '6:00 PM', name: 'Evening Yoga', duration: '20 minutes', location: 'Home', icon: Activity, color: 'orange' },
    { time: '7:00 PM', name: 'Strength Training', duration: '15 minutes', location: 'Gym', icon: Dumbbell, color: 'red' },
  ];

  const achievements = [
    { icon: Utensils, title: '7-Day Streak', subtitle: 'Meal Logging', earned: true },
    { icon: Footprints, title: 'Active Week', subtitle: '150+ mins', earned: true },
    { icon: TrendingUp, title: 'On Track', subtitle: '80% Time in Range', earned: true },
    { icon: Heart, title: 'Healthy Choice', subtitle: '10 smart swaps', earned: false },
    { icon: Star, title: 'Perfect Week', subtitle: 'All goals met', earned: false },
  ];

  // FoodCard Component with Hybrid Image-Icon Display
  const FoodCard: React.FC<{ food: FoodItem; onLogMeal: (foodName: string) => void; onViewDetails: (food: FoodItem) => void }> = ({ 
    food, 
    onLogMeal, 
    onViewDetails 
  }) => {
    // Use icon-first approach for guaranteed correct display
    const [displayMode, setDisplayMode] = useState<'icon' | 'image'>('icon');
    const [currentImage, setCurrentImage] = useState(food.image);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Try to load image in background, but show icon by default
    useEffect(() => {
      const loadCorrectImage = async () => {
        // Get correct image from FoodImageService
        const correctUrl = FoodImageService.getImageForFood(food.name);
        
        // Validate image exists
        const isValid = await FoodImageService.validateImage(correctUrl);
        
        if (isValid) {
          setCurrentImage(correctUrl);
          setImageLoaded(true);
          setDisplayMode('image'); // Switch to image only after successful load
        } else {
          // Try fallback URL from food database
          const fallbackUrl = FOOD_IMAGE_FALLBACKS[food.name];
          if (fallbackUrl) {
            const fallbackValid = await FoodImageService.validateImage(fallbackUrl);
            if (fallbackValid) {
              setCurrentImage(fallbackUrl);
              setImageLoaded(true);
              setDisplayMode('image');
            } else {
              setImageError(true);
              setDisplayMode('icon'); // Stay with icon if both fail
            }
          } else {
            setImageError(true);
            setDisplayMode('icon');
          }
        }
      };

      loadCorrectImage();
    }, [food.name]);

    // Icon-based display (always reliable)
    const getImpactColor = () => {
      switch (food.impact) {
        case 'low': return 'from-emerald-500 to-green-600';
        case 'medium': return 'from-amber-500 to-orange-600';
        case 'high': return 'from-red-500 to-rose-600';
        default: return 'from-emerald-500 to-green-600';
      }
    };

    return (
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
        {/* Header with Icon or Image */}
        <div className="relative h-48 overflow-hidden">
          {displayMode === 'icon' || !imageLoaded ? (
            <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${getImpactColor()} text-white p-4`}>
              <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 animate-pulse">
                <span className="text-6xl">{FOOD_ICONS[food.name] || "🍽️"}</span>
              </div>
              <h3 className="text-xl font-bold text-center mb-1">{food.name}</h3>
              <div className="flex gap-3 text-white/90 text-sm">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {food.prepTime}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" /> {food.region}
                </span>
              </div>
              <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold ${
                food.impact === 'low' ? 'bg-green-500/30' :
                food.impact === 'medium' ? 'bg-amber-500/30' : 'bg-red-500/30'
              }`}>
                {food.impact.toUpperCase()} GI: {food.gi}
              </div>
            </div>
          ) : (
            <>
              <img
                src={currentImage}
                alt={food.name}
                className="w-full h-full object-cover"
                onError={() => setDisplayMode('icon')}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <h3 className="text-white font-bold text-lg">{food.name}</h3>
                <div className="flex gap-3 text-white/90 text-xs mt-1">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {food.prepTime}</span>
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {food.region}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <CardContent className="p-4">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {food.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
                {tag}
              </span>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{food.description}</p>

          {/* Nutrition info */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2 rounded-lg bg-secondary">
              <div className="text-lg font-bold text-foreground">{food.carbs}g</div>
              <div className="text-xs text-muted-foreground">Carbs</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-secondary">
              <div className="text-lg font-bold text-foreground">{food.protein}g</div>
              <div className="text-xs text-muted-foreground">Protein</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-secondary">
              <div className="text-lg font-bold text-foreground">{food.calories}</div>
              <div className="text-xs text-muted-foreground">Calories</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button 
              className="flex-1"
              onClick={() => onLogMeal(food.name)}
            >
              <Plus className="w-4 h-4 mr-1" /> Log Meal
            </Button>
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => onViewDetails(food)}
            >
              <Info className="w-4 h-4 mr-1" /> Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // FoodDetailsModal Component
  const FoodDetailsModal: React.FC<{ food: FoodItem; onClose: () => void; onLogMeal: (foodName: string) => void }> = ({ 
    food, 
    onClose, 
    onLogMeal 
  }) => {
    // Close on Escape key
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const getImpactColor = () => {
      switch (food.impact) {
        case 'low': return 'text-green-500';
        case 'medium': return 'text-orange-500';
        case 'high': return 'text-red-500';
        default: return 'text-green-500';
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-background rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            onClick={onClose}
          >
            <XCircle className="w-5 h-5" />
          </button>

          {/* Modal content - 2 column layout */}
          <div className="grid md:grid-cols-2 gap-6 p-8">
            {/* Left Column: Image & Basic Info */}
            <div className="space-y-4">
              <div className="h-72 rounded-xl overflow-hidden bg-secondary">
                <img 
                  src={food.image} 
                  alt={food.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white"><svg class="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 3h18v18H3V3z"/></svg><span class="text-lg font-medium">${food.name}</span></div>`;
                    }
                  }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold">{food.prepTime}</div>
                  <div className="text-xs text-muted-foreground mt-1">Prep Time</div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className={`text-2xl font-bold ${getImpactColor()}`}>{food.gi}</div>
                  <div className="text-xs text-muted-foreground mt-1">Glycemic Index</div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="text-2xl font-bold capitalize">{food.region}</div>
                  <div className="text-xs text-muted-foreground mt-1">Region</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {food.tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Column: Detailed Information */}
            <div className="space-y-4">
              <div>
                <h2 className="text-3xl font-bold mb-3">{food.name}</h2>
                <p className="text-muted-foreground leading-relaxed">{food.description}</p>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-3">Nutrition Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-secondary rounded-lg text-center">
                    <div className="text-3xl font-bold">{food.carbs}g</div>
                    <div className="text-sm text-muted-foreground mt-1">Carbohydrates</div>
                    <div className="text-xs text-muted-foreground">Per serving</div>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg text-center">
                    <div className="text-3xl font-bold">{food.protein}g</div>
                    <div className="text-sm text-muted-foreground mt-1">Protein</div>
                    <div className="text-xs text-muted-foreground">Per serving</div>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg text-center">
                    <div className="text-3xl font-bold">{food.fiber}g</div>
                    <div className="text-sm text-muted-foreground mt-1">Fiber</div>
                    <div className="text-xs text-muted-foreground">Per serving</div>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg text-center">
                    <div className="text-3xl font-bold">{food.calories}</div>
                    <div className="text-sm text-muted-foreground mt-1">Calories</div>
                    <div className="text-xs text-muted-foreground">Per serving</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-3">Health Benefits</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Helps maintain stable blood sugar levels</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> {food.fiber}g of fiber aids digestion</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> {food.protein}g of protein supports muscle health</li>
                  <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Low glycemic impact (GI: {food.gi})</li>
                  {food.tags.includes('Probiotic') && <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Contains probiotics for gut health</li>}
                  {food.tags.includes('Hydrating') && <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> Helps with hydration</li>}
                </ul>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    onLogMeal(food.name);
                    onClose();
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" /> Log This Meal
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    toast({ title: '✅ Added to Plan', description: `${food.name} added to meal plan!` });
                    onClose();
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" /> Add to Plan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Suggestions & Activity</h2>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2">AI Health Coach Dashboard</h1>
              <p className="text-muted-foreground">Personalized food suggestions and activity recommendations for better diabetes management</p>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-2">Loading recommendations...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* AI COACH SECTION */}
                <div className="rounded-2xl p-10 relative overflow-hidden" style={{
                  background: 'linear-gradient(135deg, #0d3c61 0%, #1a5c8f 100%)',
                  color: 'white'
                }}>
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center animate-bounce" style={{
                      background: 'linear-gradient(135deg, #7ed957 0%, #5bcb3d 100%)',
                      boxShadow: '0 10px 30px rgba(126, 217, 87, 0.3)'
                    }}>
                      <Bot className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold mb-2">Your AI Health Coach</h2>
                      <p className="opacity-90">Personal guidance for optimal diabetes management</p>
                    </div>
                  </div>
                  
                  <div className="rounded-2xl p-6 mb-6" style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <h3 className="flex items-center gap-2 text-lg font-bold mb-3">
                      <Target className="w-5 h-5" />
                      Today's Focus
                    </h3>
                    <p className="mb-4">
                      You haven't logged meals consistently. Regular logging helps track patterns better. Let's aim for 3 meals today!
                    </p>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-1000"
                        style={{ width: `${(mealProgress.current / mealProgress.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{mealProgress.current} of {mealProgress.total} meals logged</span>
                      <span>{Math.round((mealProgress.current / mealProgress.total) * 100)}% complete</span>
                    </div>
                  </div>
                </div>

                {/* GOAL TRACKING SECTION */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Your Weekly Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Meal Logging Goal */}
                      <div className="p-6 rounded-xl border border-gray-700 hover:border-primary/50 transition-all hover:-translate-y-1" style={{
                        background: 'rgba(255, 255, 255, 0.03)'
                      }}>
                        <div className="flex items-center gap-4 mb-5">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'
                          }}>
                            <Utensils className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-bold">Meal Logging</h3>
                            <p className="text-sm text-muted-foreground">Track 21 meals this week</p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-1000"
                            style={{ width: `${(weeklyGoals.meals.current / weeklyGoals.meals.total) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{weeklyGoals.meals.current}/{weeklyGoals.meals.total} meals</span>
                          <span>{Math.round((weeklyGoals.meals.current / weeklyGoals.meals.total) * 100)}%</span>
                        </div>
                      </div>

                      {/* Activity Goal */}
                      <div className="p-6 rounded-xl border border-gray-700 hover:border-primary/50 transition-all hover:-translate-y-1" style={{
                        background: 'rgba(255, 255, 255, 0.03)'
                      }}>
                        <div className="flex items-center gap-4 mb-5">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, rgba(126, 217, 87, 0.1) 0%, rgba(91, 203, 61, 0.1) 100%)'
                          }}>
                            <Footprints className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-bold">Physical Activity</h3>
                            <p className="text-sm text-muted-foreground">150 minutes this week</p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-1000"
                            style={{ width: `${(weeklyGoals.activity.current / weeklyGoals.activity.total) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{weeklyGoals.activity.current}/{weeklyGoals.activity.total} mins</span>
                          <span>{Math.round((weeklyGoals.activity.current / weeklyGoals.activity.total) * 100)}%</span>
                        </div>
                      </div>

                      {/* Glucose Goal */}
                      <div className="p-6 rounded-xl border border-gray-700 hover:border-primary/50 transition-all hover:-translate-y-1" style={{
                        background: 'rgba(255, 255, 255, 0.03)'
                      }}>
                        <div className="flex items-center gap-4 mb-5">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(251, 140, 0, 0.1) 100%)'
                          }}>
                            <Activity className="w-6 h-6 text-orange-400" />
                          </div>
                          <div>
                            <h3 className="font-bold">Time in Range</h3>
                            <p className="text-sm text-muted-foreground">Target: 80% this week</p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-1000"
                            style={{ width: `${(weeklyGoals.glucose.current / weeklyGoals.glucose.total) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{weeklyGoals.glucose.current}% achieved</span>
                          <span>On track</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* BREAKFAST IDEAS - ENHANCED FOOD CARDS */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Apple className="w-5 h-5 text-emerald-400" />
                          Breakfast Ideas
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">Start your day with diabetes-friendly options</p>
                      </div>
                      <Button 
                        onClick={refreshBreakfast} 
                        variant="outline" 
                        disabled={isRefreshing}
                        className="flex items-center gap-2"
                      >
                        <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'New Ideas'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {breakfastFoods.map((food) => (
                        <FoodCard
                          key={food.id}
                          food={food}
                          onLogMeal={logMeal}
                          onViewDetails={openFoodDetails}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* SNACKS SECTION WITH FILTERS */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Coffee className="w-5 h-5 text-amber-400" />
                          Smart Snack Options
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">Healthy choices between meals</p>
                      </div>
                    </div>
                    
                    {/* Filter Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 p-4 bg-secondary/30 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant={activeSnackFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={showAllSnacks}
                        >
                          All Snacks
                        </Button>
                        <Button 
                          variant={activeSnackFilter === 'lowCal' ? 'default' : 'outline'}
                          size="sm"
                          onClick={filterByCalories}
                        >
                          <Flame className="w-4 h-4 mr-1" /> Low Calorie
                        </Button>
                        <Button 
                          variant={activeSnackFilter === 'highProtein' ? 'default' : 'outline'}
                          size="sm"
                          onClick={filterByProtein}
                        >
                          <Dumbbell className="w-4 h-4 mr-1" /> High Protein
                        </Button>
                      </div>
                      
                      <Button 
                        onClick={refreshSnacks} 
                        variant="outline"
                        size="sm"
                        disabled={isRefreshing}
                      >
                        <RotateCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {snackFoods.map((food) => (
                        <FoodCard
                          key={food.id}
                          food={food}
                          onLogMeal={logMeal}
                          onViewDetails={openFoodDetails}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Patterns from Logs */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-400" />
                      Insights from Your Logs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {suggestions?.patterns && suggestions.patterns.length > 0 ? (
                      <div className="space-y-3">
                        {suggestions.patterns.map((pattern: string, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg bg-secondary/50 border border-orange-500/20">
                            <p className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-orange-400">•</span>
                              {pattern}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-foreground font-medium">Start Logging to See Patterns</p>
                        <p className="text-muted-foreground text-sm mt-2">
                          Log your meals and activities to receive personalized insights
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* General Diabetes Tips */}
                <div className="rounded-lg p-6 border border-blue-500/30" style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  backdropFilter: 'blur(8px)',
                }}>
                  <h3 className="font-semibold text-foreground mb-3">💡 General Diabetes Management Tips</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>✓ Maintain consistent meal timing throughout the day</p>
                    <p>✓ Never skip breakfast - it helps regulate blood sugar</p>
                    <p>✓ Stay hydrated with 2.5-3L water daily</p>
                    <p>✓ Aim for 7-8 hours of quality sleep</p>
                    <p>✓ Practice stress management through meditation or yoga</p>
                    <p>✓ Monitor blood glucose regularly and track trends</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* VOICE ASSISTANT FLOATING BUTTON */}
      <button
        onClick={toggleVoiceAssistant}
        className={`fixed bottom-8 right-8 w-16 h-16 rounded-full flex items-center justify-center transition-all z-50 ${
          isVoiceListening 
            ? 'animate-pulse'
            : 'hover:scale-110'
        }`}
        style={{
          background: isVoiceListening 
            ? 'linear-gradient(135deg, #7ed957 0%, #5bcb3d 100%)'
            : 'linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)',
          boxShadow: isVoiceListening
            ? '0 10px 30px rgba(126, 217, 87, 0.4)'
            : '0 10px 30px rgba(255, 107, 107, 0.4)'
        }}
      >
        {isVoiceListening ? (
          <Volume2 className="w-7 h-7 text-white" />
        ) : (
          <Mic className="w-7 h-7 text-white" />
        )}
      </button>

      {/* FOOD DETAILS MODAL */}
      {isModalOpen && selectedFood && (
        <FoodDetailsModal
          food={selectedFood}
          onClose={() => setIsModalOpen(false)}
          onLogMeal={logMeal}
        />
      )}
    </div>
  );
}
