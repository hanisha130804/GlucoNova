import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { authMiddleware, roleMiddleware, approvalMiddleware, authWithApproval, optionalAuthWithApproval, generateToken, type AuthRequest } from "./middleware/auth";
import { hashPassword, comparePassword } from "./utils/password";
import { insertUserSchema, loginSchema, insertHealthDataSchema, insertMealSchema, insertUserProfileSchema, insertMedicationSchema, healthDataSchema } from "@shared/schema";
import { consolidate } from "./services/parserService";
import { inferDiabetesType } from "./services/diabetesClassifier";
import { calculateInsulinDose, estimateICR, estimateISF, scanPatientMeds } from "./services/insulinCalculator";
import { parsePatientData, validateParsedData } from "./services/multiFormatParser";
import { searchMedications, getMedicationById } from "./services/medicationSearcher";

// Use memory storage instead of disk storage for Railway compatibility
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'));
    }
  },
});

// Enhanced Indian & Western Food Nutrition Database with ingredients
const indianFoodDatabase: Record<string, any> = {
  // Indian Staples - Bread
  'chapati': { 
    carbs: 15, protein: 3, fat: 2, calories: 90, fiber: 2, gi: 62, 
    impactLevel: 'medium', portion: '1 piece (30g)',
    ingredients: ['whole wheat flour', 'oil/ghee', 'salt']
  },
  'roti': { 
    carbs: 15, protein: 3, fat: 2, calories: 90, fiber: 2, gi: 62, 
    impactLevel: 'medium', portion: '1 piece (30g)',
    ingredients: ['whole wheat flour', 'oil/ghee', 'salt']
  },
  'naan': { 
    carbs: 25, protein: 4, fat: 3, calories: 140, fiber: 1, gi: 70, 
    impactLevel: 'medium', portion: '1 piece (60g)',
    ingredients: ['refined flour', 'yogurt', 'yeast', 'ghee']
  },
  'paratha': { 
    carbs: 25, protein: 4, fat: 8, calories: 200, fiber: 2, gi: 65, 
    impactLevel: 'medium', portion: '1 piece (80g)',
    ingredients: ['wheat flour', 'oil/ghee', 'salt', 'stuffing (optional)']
  },
  'puri': { 
    carbs: 18, protein: 3, fat: 6, calories: 140, fiber: 1, gi: 70, 
    impactLevel: 'medium', portion: '1 piece (40g)',
    ingredients: ['wheat flour', 'oil (for frying)', 'salt']
  },
  'bhatura': { 
    carbs: 30, protein: 5, fat: 8, calories: 220, fiber: 1.5, gi: 72, 
    impactLevel: 'high', portion: '1 piece (100g)',
    ingredients: ['refined flour', 'yogurt', 'oil (fried)', 'baking powder']
  },
  
  // Indian Staples - Rice
  'rice': { 
    carbs: 45, protein: 4, fat: 0.5, calories: 200, fiber: 0.6, gi: 73, 
    impactLevel: 'high', portion: '1 cup (150g)',
    ingredients: ['white rice', 'water']
  },
  'brown rice': { 
    carbs: 45, protein: 5, fat: 1.5, calories: 215, fiber: 3.5, gi: 50, 
    impactLevel: 'medium', portion: '1 cup (150g)',
    ingredients: ['brown rice', 'water']
  },
  'biryani': { 
    carbs: 55, protein: 15, fat: 12, calories: 390, fiber: 2, gi: 58, 
    impactLevel: 'high', portion: '1 plate (200g)',
    ingredients: ['rice', 'chicken/mutton', 'oil/ghee', 'spices', 'onion']
  },
  'pulao': { 
    carbs: 48, protein: 6, fat: 8, calories: 290, fiber: 2, gi: 60, 
    impactLevel: 'medium', portion: '1 plate (180g)',
    ingredients: ['rice', 'vegetables', 'ghee', 'spices']
  },
  'curd rice': { 
    carbs: 35, protein: 6, fat: 3, calories: 200, fiber: 0.5, gi: 68, 
    impactLevel: 'medium', portion: '1 bowl (200g)',
    ingredients: ['rice', 'curd/yogurt', 'salt']
  },
  'dal rice': {
    carbs: 63, protein: 13, fat: 4.5, calories: 340, fiber: 5.6, gi: 52,
    impactLevel: 'medium', portion: '1 plate (250g)',
    ingredients: ['white rice', 'lentils', 'oil', 'spices']
  },
  'sambar rice': {
    carbs: 60, protein: 9, fat: 3.5, calories: 300, fiber: 4.6, gi: 55,
    impactLevel: 'medium', portion: '1 plate (250g)',
    ingredients: ['white rice', 'toor dal', 'vegetables', 'tamarind', 'spices']
  },
  'lemon rice': {
    carbs: 48, protein: 4.5, fat: 6, calories: 265, fiber: 1, gi: 70,
    impactLevel: 'medium', portion: '1 plate (200g)',
    ingredients: ['white rice', 'lemon juice', 'peanuts', 'oil', 'spices']
  },
  'tamarind rice': {
    carbs: 50, protein: 4.5, fat: 6, calories: 275, fiber: 1.5, gi: 68,
    impactLevel: 'medium', portion: '1 plate (200g)',
    ingredients: ['white rice', 'tamarind', 'peanuts', 'oil', 'spices']
  },
  'coconut rice': {
    carbs: 48, protein: 5, fat: 8, calories: 290, fiber: 2, gi: 65,
    impactLevel: 'medium', portion: '1 plate (200g)',
    ingredients: ['white rice', 'coconut', 'oil', 'spices']
  },
  'tomato rice': {
    carbs: 47, protein: 5, fat: 5, calories: 260, fiber: 2, gi: 68,
    impactLevel: 'medium', portion: '1 plate (200g)',
    ingredients: ['white rice', 'tomato', 'oil', 'spices']
  },
  'fried rice': { 
    carbs: 52, protein: 8, fat: 10, calories: 330, fiber: 1.5, gi: 70, 
    impactLevel: 'high', portion: '1 plate (200g)',
    ingredients: ['rice', 'vegetables', 'oil', 'soy sauce', 'egg']
  },
  
  // South Indian
  'idli': { 
    carbs: 8, protein: 2, fat: 0.5, calories: 40, fiber: 1, gi: 45, 
    impactLevel: 'medium', portion: '1 piece (40g)',
    ingredients: ['rice', 'urad dal', 'salt']
  },
  'dosa': { 
    carbs: 22, protein: 4, fat: 5, calories: 150, fiber: 1.5, gi: 66, 
    impactLevel: 'medium', portion: '1 medium (80g)',
    ingredients: ['rice', 'urad dal', 'oil', 'salt']
  },
  'masala dosa': { 
    carbs: 30, protein: 6, fat: 8, calories: 220, fiber: 2, gi: 66, 
    impactLevel: 'medium', portion: '1 medium (120g)',
    ingredients: ['rice', 'urad dal', 'potato', 'oil', 'spices']
  },
  'uttapam': { 
    carbs: 28, protein: 5, fat: 6, calories: 180, fiber: 2, gi: 62, 
    impactLevel: 'medium', portion: '1 piece (100g)',
    ingredients: ['rice', 'urad dal', 'vegetables', 'oil']
  },
  'vada': { 
    carbs: 12, protein: 4, fat: 8, calories: 140, fiber: 2, gi: 55, 
    impactLevel: 'medium', portion: '1 piece (50g)',
    ingredients: ['urad dal', 'spices', 'oil (fried)']
  },
  'medu vada': { 
    carbs: 12, protein: 4, fat: 8, calories: 140, fiber: 2, gi: 55, 
    impactLevel: 'medium', portion: '1 piece (50g)',
    ingredients: ['urad dal', 'spices', 'oil (fried)']
  },
  'sambar': { 
    carbs: 15, protein: 5, fat: 3, calories: 100, fiber: 4, gi: 35, 
    impactLevel: 'low', portion: '1 bowl (150ml)',
    ingredients: ['toor dal', 'vegetables', 'tamarind', 'spices']
  },
  'rasam': { 
    carbs: 8, protein: 2, fat: 2, calories: 55, fiber: 1.5, gi: 30, 
    impactLevel: 'low', portion: '1 bowl (150ml)',
    ingredients: ['tomato', 'tamarind', 'spices', 'dal water']
  },
  'pongal': { 
    carbs: 38, protein: 6, fat: 7, calories: 240, fiber: 2, gi: 58, 
    impactLevel: 'medium', portion: '1 bowl (150g)',
    ingredients: ['rice', 'moong dal', 'ghee', 'pepper', 'cumin']
  },
  
  // North Indian - Dal/Lentils
  'dal': { 
    carbs: 18, protein: 9, fat: 4, calories: 140, fiber: 5, gi: 30, 
    impactLevel: 'low', portion: '1 bowl (120g)',
    ingredients: ['lentils', 'oil', 'spices', 'onion', 'tomato']
  },
  'dal makhani': { 
    carbs: 20, protein: 10, fat: 8, calories: 190, fiber: 6, gi: 35, 
    impactLevel: 'low', portion: '1 bowl (150g)',
    ingredients: ['black dal', 'kidney beans', 'butter', 'cream', 'spices']
  },
  'dal fry': { 
    carbs: 18, protein: 9, fat: 5, calories: 150, fiber: 5, gi: 30, 
    impactLevel: 'low', portion: '1 bowl (120g)',
    ingredients: ['toor dal', 'oil', 'onion', 'tomato', 'spices']
  },
  'rajma': { 
    carbs: 22, protein: 8, fat: 4, calories: 155, fiber: 7, gi: 28, 
    impactLevel: 'low', portion: '1 bowl (150g)',
    ingredients: ['kidney beans', 'onion', 'tomato', 'oil', 'spices']
  },
  'chole': { 
    carbs: 25, protein: 9, fat: 5, calories: 180, fiber: 8, gi: 28, 
    impactLevel: 'low', portion: '1 bowl (150g)',
    ingredients: ['chickpeas', 'onion', 'tomato', 'oil', 'spices']
  },
  
  // Breakfast Items
  'poha': { 
    carbs: 30, protein: 3, fat: 4, calories: 170, fiber: 2, gi: 55, 
    impactLevel: 'medium', portion: '1 bowl (150g)',
    ingredients: ['flattened rice', 'peanuts', 'oil', 'spices']
  },
  'upma': { 
    carbs: 32, protein: 4, fat: 5, calories: 190, fiber: 2.5, gi: 60, 
    impactLevel: 'medium', portion: '1 bowl (150g)',
    ingredients: ['semolina', 'vegetables', 'oil', 'spices']
  },
  'aloo paratha': { 
    carbs: 32, protein: 5, fat: 10, calories: 240, fiber: 3, gi: 68, 
    impactLevel: 'medium', portion: '1 piece (100g)',
    ingredients: ['wheat flour', 'potato', 'ghee', 'spices']
  },
  'poori bhaji': { 
    carbs: 40, protein: 5, fat: 12, calories: 290, fiber: 3, gi: 70, 
    impactLevel: 'high', portion: '2 pooris with bhaji (150g)',
    ingredients: ['wheat flour', 'potato', 'oil (fried)', 'spices']
  },
  'sheera': { 
    carbs: 45, protein: 2, fat: 8, calories: 260, fiber: 1, gi: 75, 
    impactLevel: 'high', portion: '1 bowl (100g)',
    ingredients: ['semolina', 'sugar', 'ghee', 'dry fruits']
  },
  
  // Curries - Vegetarian
  'paneer': { 
    carbs: 3, protein: 18, fat: 20, calories: 260, fiber: 0, gi: 0, 
    impactLevel: 'low', portion: '100g',
    ingredients: ['cottage cheese', 'spices (if curry)']
  },
  'paneer tikka': { 
    carbs: 6, protein: 15, fat: 12, calories: 200, fiber: 1, gi: 5, 
    impactLevel: 'low', portion: '100g',
    ingredients: ['paneer', 'yogurt', 'spices', 'oil']
  },
  'palak paneer': { 
    carbs: 8, protein: 12, fat: 15, calories: 210, fiber: 3, gi: 15, 
    impactLevel: 'low', portion: '1 bowl (150g)',
    ingredients: ['paneer', 'spinach', 'cream', 'spices']
  },
  'aloo gobi': { 
    carbs: 18, protein: 3, fat: 6, calories: 140, fiber: 3, gi: 55, 
    impactLevel: 'medium', portion: '1 bowl (120g)',
    ingredients: ['potato', 'cauliflower', 'oil', 'spices']
  },
  
  // Curries - Non-Vegetarian
  'chicken curry': { 
    carbs: 8, protein: 25, fat: 10, calories: 220, fiber: 2, gi: 0, 
    impactLevel: 'low', portion: '1 bowl (150g)',
    ingredients: ['chicken', 'oil', 'onion', 'tomato', 'spices']
  },
  'butter chicken': { 
    carbs: 12, protein: 22, fat: 18, calories: 290, fiber: 2, gi: 5, 
    impactLevel: 'low', portion: '1 bowl (180g)',
    ingredients: ['chicken', 'butter', 'cream', 'tomato', 'spices']
  },
  'chicken tikka': { 
    carbs: 4, protein: 28, fat: 8, calories: 200, fiber: 1, gi: 0, 
    impactLevel: 'low', portion: '100g',
    ingredients: ['chicken', 'yogurt', 'spices', 'oil']
  },
  'mutton curry': { 
    carbs: 6, protein: 22, fat: 15, calories: 250, fiber: 2, gi: 0, 
    impactLevel: 'low', portion: '1 bowl (150g)',
    ingredients: ['mutton', 'oil', 'onion', 'tomato', 'spices']
  },
  'fish curry': { 
    carbs: 5, protein: 20, fat: 8, calories: 180, fiber: 1, gi: 0, 
    impactLevel: 'low', portion: '1 bowl (150g)',
    ingredients: ['fish', 'oil', 'coconut', 'tamarind', 'spices']
  },
  'egg curry': { 
    carbs: 8, protein: 12, fat: 10, calories: 170, fiber: 2, gi: 5, 
    impactLevel: 'low', portion: '2 eggs with gravy (120g)',
    ingredients: ['eggs', 'oil', 'onion', 'tomato', 'spices']
  },

  // Dairy & Beverages
  'milk': { 
    carbs: 12, protein: 8, fat: 8, calories: 150, fiber: 0, gi: 30, 
    impactLevel: 'medium', portion: '1 cup (240ml)',
    ingredients: ['whole milk']
  },
  'buttermilk': { 
    carbs: 5, protein: 3, fat: 0.5, calories: 40, fiber: 0, gi: 25, 
    impactLevel: 'low', portion: '1 cup (240ml)',
    ingredients: ['curd/yogurt', 'water', 'salt', 'spices']
  },
  'lassi': { 
    carbs: 20, protein: 5, fat: 3, calories: 130, fiber: 0, gi: 35, 
    impactLevel: 'medium', portion: '1 glass (200ml)',
    ingredients: ['yogurt', 'water', 'sugar/salt']
  },
  'curd': { 
    carbs: 5, protein: 4, fat: 3, calories: 60, fiber: 0, gi: 30, 
    impactLevel: 'low', portion: '1 bowl (100g)',
    ingredients: ['yogurt']
  },
  'yogurt': { 
    carbs: 5, protein: 4, fat: 3, calories: 60, fiber: 0, gi: 30, 
    impactLevel: 'low', portion: '1 bowl (100g)',
    ingredients: ['yogurt']
  },

  // Snacks & Street Food
  'samosa': { 
    carbs: 25, protein: 4, fat: 12, calories: 230, fiber: 2, gi: 70, 
    impactLevel: 'high', portion: '1 piece (80g)',
    ingredients: ['refined flour', 'potato', 'peas', 'oil (fried)']
  },
  'pakora': { 
    carbs: 15, protein: 3, fat: 8, calories: 150, fiber: 2, gi: 65, 
    impactLevel: 'medium', portion: '4-5 pieces (80g)',
    ingredients: ['gram flour', 'vegetables', 'oil (fried)']
  },
  'bhel puri': { 
    carbs: 30, protein: 4, fat: 6, calories: 190, fiber: 3, gi: 60, 
    impactLevel: 'medium', portion: '1 bowl (100g)',
    ingredients: ['puffed rice', 'vegetables', 'chutney', 'sev']
  },
  'pav bhaji': { 
    carbs: 42, protein: 6, fat: 10, calories: 290, fiber: 4, gi: 68, 
    impactLevel: 'medium', portion: '2 pavs with bhaji (200g)',
    ingredients: ['bread', 'mixed vegetables', 'butter', 'spices']
  },
  'vada pav': { 
    carbs: 35, protein: 5, fat: 10, calories: 250, fiber: 2, gi: 70, 
    impactLevel: 'high', portion: '1 piece (100g)',
    ingredients: ['bread', 'potato vada', 'chutney', 'oil (fried)']
  },

  // Western Foods
  'bread': { 
    carbs: 15, protein: 3, fat: 1, calories: 80, fiber: 1, gi: 75, 
    impactLevel: 'high', portion: '1 slice (30g)',
    ingredients: ['refined flour', 'yeast', 'sugar']
  },
  'brown bread': { 
    carbs: 14, protein: 3, fat: 1, calories: 80, fiber: 2, gi: 55, 
    impactLevel: 'medium', portion: '1 slice (30g)',
    ingredients: ['whole wheat flour', 'yeast']
  },
  'oatmeal': { 
    carbs: 27, protein: 5, fat: 3, calories: 150, fiber: 4, gi: 55, 
    impactLevel: 'medium', portion: '1 bowl (150g)',
    ingredients: ['oats', 'water/milk']
  },
  'oats': { 
    carbs: 27, protein: 5, fat: 3, calories: 150, fiber: 4, gi: 55, 
    impactLevel: 'medium', portion: '1 bowl (150g)',
    ingredients: ['oats', 'water/milk']
  },
  'pasta': { 
    carbs: 40, protein: 7, fat: 2, calories: 200, fiber: 2, gi: 60, 
    impactLevel: 'medium', portion: '1 bowl (150g)',
    ingredients: ['wheat pasta', 'sauce']
  },
  'pizza': { 
    carbs: 35, protein: 12, fat: 15, calories: 320, fiber: 2, gi: 65, 
    impactLevel: 'high', portion: '2 slices (150g)',
    ingredients: ['refined flour', 'cheese', 'toppings', 'sauce']
  },
  'burger': { 
    carbs: 32, protein: 15, fat: 18, calories: 350, fiber: 2, gi: 68, 
    impactLevel: 'high', portion: '1 burger (150g)',
    ingredients: ['bun', 'patty', 'cheese', 'vegetables', 'sauce']
  },
  'sandwich': { 
    carbs: 28, protein: 8, fat: 6, calories: 200, fiber: 3, gi: 60, 
    impactLevel: 'medium', portion: '1 sandwich (100g)',
    ingredients: ['bread', 'vegetables', 'cheese/meat']
  },
  'egg': { 
    carbs: 1, protein: 6, fat: 5, calories: 70, fiber: 0, gi: 0, 
    impactLevel: 'low', portion: '1 egg (50g)',
    ingredients: ['egg']
  },
  'boiled egg': { 
    carbs: 1, protein: 6, fat: 5, calories: 70, fiber: 0, gi: 0, 
    impactLevel: 'low', portion: '1 egg (50g)',
    ingredients: ['egg']
  },
  'omelette': { 
    carbs: 2, protein: 12, fat: 12, calories: 170, fiber: 0, gi: 0, 
    impactLevel: 'low', portion: '2 eggs (100g)',
    ingredients: ['eggs', 'oil', 'vegetables']
  },

  // Fruits & Vegetables
  'apple': { 
    carbs: 14, protein: 0.3, fat: 0.2, calories: 52, fiber: 2.4, gi: 36, 
    impactLevel: 'low', portion: '1 medium (100g)',
    ingredients: ['apple']
  },
  'banana': { 
    carbs: 23, protein: 1, fat: 0.3, calories: 89, fiber: 2.6, gi: 51, 
    impactLevel: 'medium', portion: '1 medium (100g)',
    ingredients: ['banana']
  },
  'orange': { 
    carbs: 12, protein: 1, fat: 0.1, calories: 47, fiber: 2.4, gi: 43, 
    impactLevel: 'low', portion: '1 medium (100g)',
    ingredients: ['orange']
  },
  'mango': { 
    carbs: 15, protein: 0.8, fat: 0.4, calories: 60, fiber: 1.6, gi: 51, 
    impactLevel: 'medium', portion: '1 cup (100g)',
    ingredients: ['mango']
  },
  'papaya': { 
    carbs: 11, protein: 0.5, fat: 0.3, calories: 43, fiber: 1.7, gi: 60, 
    impactLevel: 'medium', portion: '1 cup (100g)',
    ingredients: ['papaya']
  },
  'salad': { 
    carbs: 5, protein: 2, fat: 0.2, calories: 25, fiber: 2, gi: 15, 
    impactLevel: 'low', portion: '1 bowl (100g)',
    ingredients: ['mixed vegetables', 'greens']
  },
  'vegetable': { 
    carbs: 5, protein: 2, fat: 0.2, calories: 25, fiber: 2, gi: 15, 
    impactLevel: 'low', portion: '1 bowl (100g)',
    ingredients: ['mixed vegetables']
  },
};

// Regional language mappings for Indian dishes
const regionalFoodMappings: Record<string, string> = {
  // Telugu dishes
  'annam pappu': 'dal rice',
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
  'majjiga': 'buttermilk',
  
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
  'majjige': 'buttermilk',
  
  // Tamil dishes
  'thayir sadam': 'curd rice',
  'sambar sadam': 'sambar rice',
  'sadam': 'rice',
  'paruppu': 'dal',
  'thayir': 'curd',
  'parotta': 'paratha',
  'dosai': 'dosa',
  'vadai': 'vada',
  'mor': 'buttermilk',
  'kootu': 'vegetable curry',
  
  // Hindi/North Indian dishes
  'dahi chawal': 'curd rice',
  'dal chawal': 'dal rice',
  'bhaat': 'rice',
  'daal': 'dal',
  'dahi': 'curd',
  'poori': 'puri',
  'sabzi': 'vegetable curry',
  'chaas': 'buttermilk',
  'khichdi': 'dal rice',
  
  // Marathi dishes
  'bhat': 'rice',
  'loncha': 'pickle',
  'poli': 'roti',
  'bhakri': 'jowar roti',
  'thalipeeth': 'multi-grain flatbread',
  'misal': 'sprouted lentils',
  
  // Combined dishes
  'rice and dal': 'dal rice',
  'dal and rice': 'dal rice',
  'rice dal': 'dal rice',
  'yogurt rice': 'curd rice',
};

// Normalize description by replacing regional names with standard names
function normalizeDescription(desc: string): string {
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
}

function analyzeMealDescription(description: string, portionMultiplier: number = 1, cookingStyle?: string): any {
  // Normalize regional language names to standard English names
  const normalizedDesc = normalizeDescription(description);
  const lowerDesc = normalizedDesc.toLowerCase();
  const items: any[] = [];
  
  // Match food items in description
  Object.keys(indianFoodDatabase).forEach(food => {
    const regex = new RegExp('(\\d+)?\\s*' + food, 'gi');
    const matches = lowerDesc.match(regex);
    
    if (matches) {
      const quantityMatch = matches[0].match(/\d+/);
      const quantity = quantityMatch ? parseInt(quantityMatch[0]) : 1;
      const foodData = indianFoodDatabase[food];
      const adjustedQuantity = quantity * portionMultiplier;
      
      items.push({
        dishName: food.charAt(0).toUpperCase() + food.slice(1),
        normalizedName: food,
        quantity: adjustedQuantity,
        unit: foodData.portion.includes('piece') ? 'piece' : foodData.portion.includes('bowl') ? 'bowl' : foodData.portion.includes('cup') ? 'cup' : 'plate',
        estimatedWeightGrams: parseInt(foodData.portion.match(/\d+/)?.[0] || '100') * adjustedQuantity,
        mainIngredients: foodData.ingredients || [],
        nutrition: {
          carbs: Math.round(foodData.carbs * adjustedQuantity),
          protein: Math.round(foodData.protein * adjustedQuantity),
          fat: Math.round(foodData.fat * adjustedQuantity),
          fiber: Math.round(foodData.fiber * adjustedQuantity),
          calories: Math.round(foodData.calories * adjustedQuantity),
          glycemicIndex: foodData.gi || null,
        },
        impactLevel: foodData.impactLevel,
      });
    }
  });
  
  // If no items found, mark as unrecognized
  if (items.length === 0) {
    return {
      error: 'unknown_dish',
      message: 'We could not confidently recognize this dish. Please provide more details or try describing individual items.',
      mealName: 'Unrecognized Meal',
      items: [],
      totals: { carbs: 0, protein: 0, fat: 0, calories: 0, fiber: 0, overallImpactLevel: 'medium' },
    };
  }
  
  // Calculate totals
  const totals = {
    carbs: items.reduce((sum, item) => sum + item.nutrition.carbs, 0),
    protein: items.reduce((sum, item) => sum + item.nutrition.protein, 0),
    fat: items.reduce((sum, item) => sum + item.nutrition.fat, 0),
    calories: items.reduce((sum, item) => sum + item.nutrition.calories, 0),
    fiber: items.reduce((sum, item) => sum + item.nutrition.fiber, 0),
    overallImpactLevel: items.some(i => i.impactLevel === 'high') ? 'high' : 
                       items.some(i => i.impactLevel === 'medium') ? 'medium' : 'low',
  };
  
  // Generate patient-specific health impact
  let healthImpactCategory: 'low' | 'medium' | 'high' = totals.overallImpactLevel as any;
  let healthImpactDescription = '';
  
  if (totals.carbs > 60) {
    healthImpactCategory = 'high';
    healthImpactDescription = 'This meal has a high carbohydrate load and may cause a significant rise in blood sugar, especially for type 2 diabetes. Monitor glucose levels 2 hours after eating.';
  } else if (totals.carbs > 40) {
    healthImpactCategory = 'medium';
    healthImpactDescription = 'This meal has a moderate carbohydrate content. May cause a moderate blood sugar rise. Consider pairing with fiber-rich foods and a 15-minute post-meal walk.';
  } else {
    healthImpactCategory = 'low';
    healthImpactDescription = 'This meal has low to moderate carbs and should have minimal impact on blood sugar levels. Good choice for diabetes management.';
  }
  
  // Generate benefits from ingredients
  const benefits: string[] = [];
  const cautions: string[] = [];
  const alternatives: string[] = [];
  
  // Analyze ingredients for benefits
  if (lowerDesc.includes('dal') || lowerDesc.includes('lentil')) {
    benefits.push('Dal provides plant-based protein and fiber, which helps stabilize blood sugar and improves satiety.');
  }
  
  if (lowerDesc.includes('vegetable') || lowerDesc.includes('salad')) {
    benefits.push('Vegetables are rich in fiber, vitamins, and antioxidants while being low in calories - excellent for diabetes management.');
  }
  
  if (lowerDesc.includes('brown rice') || lowerDesc.includes('millet')) {
    benefits.push('Whole grains like brown rice contain more fiber than refined grains, leading to slower glucose absorption.');
  }
  
  if (totals.fiber >= 5) {
    benefits.push('High fiber content (≥5g) helps slow down carbohydrate absorption and improves glucose control.');
  }
  
  if (totals.protein >= 20) {
    benefits.push('Good protein content helps with muscle maintenance and provides sustained energy without spiking blood sugar.');
  }
  
  // Generate cautions and alternatives
  if (totals.carbs > 60) {
    cautions.push('High carb intake detected. This may lead to elevated blood sugar levels.');
    alternatives.push('Consider reducing portion size by 25-30% or replacing half the rice/chapati with vegetables or salad.');
    alternatives.push('Try replacing white rice with brown rice, millet, or quinoa for better glucose control.');
  }
  
  if (lowerDesc.includes('fried') || lowerDesc.includes('pakora') || lowerDesc.includes('samosa')) {
    cautions.push('Fried foods contain excess oil and calories, which can affect insulin sensitivity over time.');
    alternatives.push('Consider baking, grilling, or air-frying instead of deep frying to reduce fat content.');
  }
  
  if (cookingStyle && (cookingStyle.toLowerCase().includes('fried') || cookingStyle.toLowerCase().includes('deep'))) {
    cautions.push('Deep frying adds significant fat and calories. Frequent consumption may impact cardiovascular health.');
    alternatives.push('Try shallow frying, grilling, or steaming as healthier cooking methods.');
  }
  
  if (lowerDesc.includes('sugar') || lowerDesc.includes('sweet') || lowerDesc.includes('dessert')) {
    cautions.push('Sugary items cause rapid glucose spikes. Best avoided or consumed in very small portions.');
    alternatives.push('Replace sugar-based desserts with fresh fruit paired with nuts, or use natural sweeteners like stevia.');
  }
  
  if (totals.carbs > 50 && totals.fiber < 3) {
    cautions.push('High carbs with low fiber may lead to faster glucose absorption.');
    alternatives.push('Add a side of salad, cucumber raita, or steamed vegetables to increase fiber content.');
  }
  
  // Post-meal activity suggestion
  if (totals.carbs > 50) {
    benefits.push('A 15-20 minute walk after this meal can help reduce glucose spikes by up to 30%.');
  }
  
  return {
    mealName: 'Meal Analysis',
    items,
    totals,
    healthImpact: {
      category: healthImpactCategory,
      description: healthImpactDescription,
    },
    benefits: benefits.length > 0 ? benefits : ['This meal provides essential nutrients. Pair with mindful eating and regular glucose monitoring.'],
    cautions: cautions.length > 0 ? cautions : undefined,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ==================== AUTH ROUTES ====================
  
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const hashedPassword = await hashPassword(validatedData.password);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        isApproved: true,
      });

      const token = generateToken(user._id, user.role, user.isApproved);

      res.status(201).json({
        message: 'Registration successful. You can now login.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
        },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        res.status(400).json({ message: error.message || 'Registration failed' });
      }
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isPasswordValid = await comparePassword(validatedData.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = generateToken(user._id, user.role, user.isApproved);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
        },
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Login failed' });
    }
  });

  app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch user' });
    }
  });

  // ==================== HEALTH DATA ROUTES ====================
  
  app.post('/api/health-data', optionalAuthWithApproval, async (req: AuthRequest, res: any) => {
    try {
      const validatedData = insertHealthDataSchema.parse(req.body);
      const healthData = await storage.createHealthData(req.user!.userId, validatedData);
      
      res.status(201).json({ message: 'Health data recorded successfully', data: healthData });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to record health data' });
    }
  });

  app.get('/api/health-data', authMiddleware, roleMiddleware('patient', 'doctor'), async (req: AuthRequest, res) => {
    try {
      const userId = req.query.userId as string || req.user!.userId;
      
      if (req.user!.role === 'patient' && userId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const healthData = await storage.getHealthDataByUser(userId);
      res.json({ data: healthData });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch health data' });
    }
  });

  app.get('/api/health-data/latest', authMiddleware, roleMiddleware('patient'), async (req: AuthRequest, res) => {
    try {
      const latestData = await storage.getLatestHealthData(req.user!.userId);
      res.json({ data: latestData });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch latest health data' });
    }
  });

  // ==================== MEAL ROUTES ====================
  
  app.post('/api/meals', authMiddleware, roleMiddleware('patient'), async (req: AuthRequest, res) => {
    try {
      const validatedData = insertMealSchema.parse(req.body);
      const meal = await storage.createMeal(req.user!.userId, validatedData);
      
      res.status(201).json({ message: 'Meal logged successfully', data: meal });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to log meal' });
    }
  });

  app.get('/api/meals', authMiddleware, roleMiddleware('patient', 'doctor'), async (req: AuthRequest, res) => {
    try {
      const userId = req.query.userId as string || req.user!.userId;
      
      if (req.user!.role === 'patient' && userId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const meals = await storage.getMealsByUser(userId);
      res.json({ data: meals });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch meals' });
    }
  });

  // ==================== PREDICTION ROUTES ====================
  
  // ==================== AI FOOD LOG ROUTES ====================
  
  app.post('/api/ai-food-log/analyze', authMiddleware, roleMiddleware('patient'), async (req: AuthRequest, res) => {
    try {
      const { description, portionMultiplier, portionUnit, mealType, cookingStyle, language } = req.body;
      
      if (!description || !description.trim()) {
        return res.status(400).json({ message: 'Meal description is required' });
      }

      // Enhanced meal analysis with portion multiplier and cooking style
      const analysis = analyzeMealDescription(
        description, 
        portionMultiplier || 1, 
        cookingStyle
      );
      
      // Add meal type if provided
      if (mealType) {
        analysis.mealName = mealType;
      }
      
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to analyze meal' });
    }
  });

  app.post('/api/ai-food-log/log', authMiddleware, roleMiddleware('patient'), async (req: AuthRequest, res) => {
    try {
      const { description, ...analysisData } = req.body;
      
      // Prepare data for storage with new structure
      const mealLog = await storage.createAIFoodLog(req.user!.userId, {
        description,
        mealName: analysisData.mealName || 'Meal',
        items: analysisData.items || [],
        totals: analysisData.totals,
        suggestions: analysisData.cautions || [],  // Store cautions as suggestions
        healthBenefits: analysisData.benefits ? analysisData.benefits.join(' ') : '',
        alternatives: analysisData.alternatives ? analysisData.alternatives.join(' ') : '',
      });
      
      res.status(201).json({ message: 'Meal logged successfully', data: mealLog });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to log meal' });
    }
  });

  app.get('/api/ai-food-log/recent', authMiddleware, roleMiddleware('patient'), async (req: AuthRequest, res) => {
    try {
      const meals = await storage.getAIFoodLogs(req.user!.userId);
      res.json(meals);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch meals' });
    }
  });

  app.get('/api/suggestions-activity/today', authMiddleware, roleMiddleware('patient'), async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const recentMeals = await storage.getAIFoodLogs(userId, 14);
      
      // Generate patterns from recent meals
      const patterns: string[] = [];
      
      if (recentMeals && recentMeals.length > 0) {
        const highCarbMeals = recentMeals.filter((m: any) => m.totals?.carbs > 60).length;
        if (highCarbMeals > recentMeals.length / 2) {
          patterns.push('Your highest carb meals are mostly dinner. Consider reducing portions or adding more vegetables.');
        }
        
        const avgCarbs = recentMeals.reduce((sum: number, m: any) => sum + (m.totals?.carbs || 0), 0) / recentMeals.length;
        if (avgCarbs > 70) {
          patterns.push('Average carb intake is high. Try swapping white rice with brown rice or millet.');
        }
        
        if (recentMeals.length < 7) {
          patterns.push('You haven\'t logged meals consistently. Regular logging helps track patterns better.');
        }
      } else {
        patterns.push('Start logging your meals to receive personalized insights.');
      }
      
      const dailyFocus = patterns.length > 0 
        ? patterns[0]
        : 'Keep up the good work! Focus on consistent meal timing and post-meal walks.';
      
      res.json({
        dailyFocus,
        patterns,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch suggestions' });
    }
  });
  
  // ==================== PREDICTION ROUTES ====================
  
  app.post('/api/predictions/insulin', optionalAuthWithApproval, async (req: any, res: any) => {
    try {
      const userId = req.user!.userId;
      const { 
        current_glucose_mgdl,
        carbs_g,
        insulin_type,
        icr,
        isf,
        correction_target,
        activity_level,
        diabetes_type,
        patient_id
      } = req.body;
      
      // Validate required parameters
      if (!current_glucose_mgdl) {
        return res.status(400).json({ error: 'current_glucose_mgdl is required' });
      }

      // Get user profile for defaults
      const userProfile = await storage.getUserProfile(userId);
      
      // Load medications database for medication-aware calculation
      let medsDB: Record<string, any> | undefined = undefined;
      let patientMeds: Array<{ med_id: string }> = [];
      
      try {
        const medsPath = path.join(process.cwd(), 'server', 'data', 'medications.json');
        const medsContent = fs.readFileSync(medsPath, 'utf-8');
        medsDB = JSON.parse(medsContent);
      } catch (e) {
        console.warn('Could not load medications database:', e);
      }
      
      // Use new intelligent calculator with medication awareness
      const calculationInput = {
        patient_id: patient_id || userId,
        current_glucose_mgdl: parseFloat(current_glucose_mgdl) || 100,
        carbs_g: parseFloat(carbs_g) || 0,
        icr: parseFloat(icr) || (userProfile?.icr as any) || 10,
        isf: parseFloat(isf) || (userProfile?.isf as any) || 50,
        correction_target: parseFloat(correction_target) || 100,
        insulin_type: insulin_type || 'rapid',
        diabetes_type: diabetes_type || (userProfile?.diabetesType as any) || 'Unknown',
        activity_level: activity_level || 'moderate'
      };
      
      const result = calculateInsulinDose(
        calculationInput,
        patientMeds,
        medsDB,
        { max_units: 20, default_correction_target: 100 }
      );
      
      // Save prediction to database
      const prediction = await storage.createPrediction(userId, {
        predictedInsulin: result.rounded_units,
        confidence: result.confidence,
        factors: [result.explanation, ...result.safety_flags],
      });

      res.status(201).json({
        ...result,
        timestamp: prediction.timestamp,
      });
    } catch (error: any) {
      console.error('Insulin prediction error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate prediction' });
    }
  });

  app.get('/api/predictions/latest', authMiddleware, roleMiddleware('patient', 'doctor'), async (req: AuthRequest, res) => {
    try {
      const userId = req.query.userId as string || req.user!.userId;
      
      if (req.user!.role === 'patient' && userId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const prediction = await storage.getLatestPrediction(userId);
      res.json({ prediction });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch latest prediction' });
    }
  });

  app.get('/api/predictions', authMiddleware, roleMiddleware('patient', 'doctor'), async (req: AuthRequest, res) => {
    try {
      const userId = req.query.userId as string || req.user!.userId;
      
      if (req.user!.role === 'patient' && userId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const predictions = await storage.getPredictionsByUser(userId);
      res.json({ predictions });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch predictions' });
    }
  });

  app.post('/api/predictions/record', optionalAuthWithApproval, async (req: any, res: any) => {
    try {
      const userId = req.user!.userId;
      const {
        rounded_units,
        carb_units,
        correction_units,
        current_glucose_mgdl,
        carbs_g,
        insulin_type,
      } = req.body;

      // Validate required fields
      if (typeof rounded_units !== 'number') {
        return res.status(400).json({ error: 'rounded_units is required and must be a number' });
      }

      // Save the calculated/planned dose to database
      const prediction = await storage.createPrediction(userId, {
        predictedInsulin: rounded_units,
        confidence: 1.0, // This was user-confirmed
        factors: [
          `Carbs: ${carbs_g || 0}g`,
          `Correction: ${correction_units || 0} units`,
          `Glucose: ${current_glucose_mgdl} mg/dL`,
          `Insulin type: ${insulin_type || 'rapid'}`,
        ],
      });

      res.status(201).json({
        message: 'Insulin dose recorded successfully',
        prediction: {
          id: prediction.id,
          rounded_units,
          carb_units,
          correction_units,
          current_glucose_mgdl,
          carbs_g,
          insulin_type,
          timestamp: prediction.timestamp,
          recordedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Record prediction error:', error);
      res.status(500).json({ error: error.message || 'Failed to record prediction' });
    }
  });

  // ==================== MEDICATION ROUTES ====================

  app.get('/api/medications/search', optionalAuthWithApproval, (req: any, res: any) => {
    try {
      const query = req.query.q as string;
      const max = parseInt(req.query.max as string) || 10;
      
      if (!query?.trim()) {
        return res.status(400).json({ error: 'Search query required' });
      }
      
      const results = searchMedications(query, max);
      res.json(results);
    } catch (error: any) {
      console.error('Medication search error:', error);
      res.status(500).json({ error: 'Medication search failed' });
    }
  });

  app.get('/api/medications/:id', optionalAuthWithApproval, (req: any, res: any) => {
    try {
      const med = getMedicationById(req.params.id);
      if (!med) {
        return res.status(404).json({ error: 'Medication not found' });
      }
      res.json(med);
    } catch (error: any) {
      console.error('Medication fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch medication' });
    }
  });

  app.post('/api/patients/:patientId/medications', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { patientId } = req.params;
      const { medicationId, strength_mg, notes } = req.body;
      
      // Ensure user can only add medications to their own record, or doctor can add to patient
      if (req.user!.role === 'patient' && patientId !== req.user!.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!medicationId) {
        return res.status(400).json({ error: 'Medication ID required' });
      }
      
      // Get the medication to verify it exists
      const med = getMedicationById(medicationId);
      if (!med) {
        return res.status(404).json({ error: 'Medication not found' });
      }
      
      // Return success with medication details
      // In a full implementation, this would persist to database
      res.json({ 
        message: 'Medication added successfully',
        medication: {
          medicationId,
          strength_mg: strength_mg || (med as any).strength_mg,
          addedAt: new Date().toISOString(),
          addedBy: req.user!.userId,
          acknowledged: req.user!.role === 'patient',
          ...med
        }
      });
    } catch (error: any) {
      console.error('Add medication error:', error);
      res.status(500).json({ error: 'Failed to add medication' });
    }
  });

  app.get('/api/patients/:patientId/medications', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { patientId } = req.params;
      
      // Ensure user can only view their own medications, or doctor can view patient's
      if (req.user!.role === 'patient' && patientId !== req.user!.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Return empty medications list (full impl would query database)
      res.json({ medications: [] });
    } catch (error: any) {
      console.error('Fetch medications error:', error);
      res.status(500).json({ error: 'Failed to fetch medications' });
    }
  });

  // ==================== ADMIN ROUTES ====================
  
  app.get('/api/admin/users', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        createdAt: user.createdAt,
      }));
      
      res.json({ users: sanitizedUsers });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch users' });
    }
  });

  app.patch('/api/admin/users/:id/approve', authMiddleware, roleMiddleware('admin'), async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { isApproved } = req.body;
      
      const user = await storage.updateUserApproval(id, isApproved);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User approval status updated', user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
      }});
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update user approval' });
    }
  });

  // ==================== DOCTOR ROUTES ====================
  
  app.get('/api/doctor/patients', authMiddleware, roleMiddleware('doctor'), async (req: AuthRequest, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const patients = allUsers
        .filter(user => user.role === 'patient' && user.isApproved)
        .map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        }));
      
      res.json({ patients });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch patients' });
    }
  });

  // ==================== FILE UPLOAD ROUTES ====================
  
  // PDF/Document parsing endpoint for extracting medical information
  app.post('/api/reports/parse', upload.single('file'), async (req: any, res: any) => {
    try {
      console.log('📄 Parse request received');
      console.log('File present:', !!req.file);
      
      if (!req.file) {
        console.error('❌ No file in request');
        return res.status(400).json({ message: 'No file uploaded' });
      }

      console.log('File details:', {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        bufferLength: req.file.buffer?.length
      });

      const fileType = req.file.mimetype;
      let extractedData: any = {};
      let pdfText = ''; // Declare pdfText in broader scope for fallback access

      // Handle PDF files
      if (fileType === 'application/pdf') {
        try {
          const { writeFileSync, unlinkSync } = await import('fs');
          const PDFParser = (await import('pdf2json')).default;
          
          console.log('=== PDF Parsing with pdf2json ===');
          
          const pdfParser = new (PDFParser as any)(null, false);
          
          // For memory storage, write buffer to temporary file
          const tempFilePath = `/tmp/temp-pdf-${Date.now()}.pdf`;
          writeFileSync(tempFilePath, req.file.buffer);
          
          // Parse PDF and extract text
          const parsePromise = new Promise((resolve, reject) => {
            pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
              try {
                // Extract text from all pages
                let fullText = '';
                if (pdfData.Pages) {
                  pdfData.Pages.forEach((page: any, pageIndex: number) => {
                    if (page.Texts) {
                      // Group text items by Y position (vertical position) to preserve line breaks
                      const textsByY: { [key: number]: string[] } = {};
                      
                      page.Texts.forEach((textItem: any) => {
                        try {
                          // Safely decode URI component, handle errors gracefully
                          let decodedText = '';
                          try {
                            decodedText = decodeURIComponent(textItem.R[0].T);
                          } catch (e) {
                            // If decoding fails, use raw text
                            decodedText = textItem.R[0].T;
                          }
                          
                          // Use Y position to group text on same line
                          const y = Math.round((textItem.y || 0) * 10) / 10; // Round to prevent floating point issues
                          if (!textsByY[y]) {
                            textsByY[y] = [];
                          }
                          textsByY[y].push(decodedText);
                        } catch (e) {
                          console.warn('Failed to decode text item:', e);
                        }
                      });
                      
                      // Reconstruct text with proper line breaks
                      const sortedYPositions = Object.keys(textsByY)
                        .map(y => parseFloat(y))
                        .sort((a, b) => a - b);
                      
                      sortedYPositions.forEach(y => {
                        fullText += textsByY[y].join(' ') + '\n';
                      });
                      
                      if (pageIndex < pdfData.Pages.length - 1) {
                        fullText += '\n'; // Page break
                      }
                    }
                  });
                }
                console.log('Successfully extracted text from PDF');
                resolve(fullText);
              } catch (error) {
                reject(error);
              }
            });
            
            pdfParser.on('pdfParser_dataError', (error: any) => {
              console.error('PDF parser error event:', error);
              reject(error);
            });
            
            // Load PDF from temp file
            pdfParser.loadPDF(tempFilePath);
          });
          
          pdfText = await parsePromise as string;
          
          // Cleanup temp file
          try {
            unlinkSync(tempFilePath);
            console.log('✅ Cleaned up temp PDF file');
          } catch (e) {
            console.warn('Failed to clean up temp file:', e);
          }
          
          console.log('=== PDF Text Extraction Results ===');
          console.log('✓ Extraction completed successfully');
          console.log('Text length:', pdfText.length);
          console.log('Is empty?', pdfText.length === 0);
          console.log('Is only whitespace?', pdfText.trim().length === 0);
          
          if (pdfText.length === 0) {
            console.error('🚨 CRITICAL: PDF text extraction returned empty string!');
            console.error('This means pdf2json could not extract any text from the PDF');
            console.error('Possible causes: PDF is image-based (scanned), encrypted, or corrupted');
          } else if (pdfText.trim().length === 0) {
            console.error('🚨 CRITICAL: PDF text is only whitespace!');
          } else {
            console.log('✓ Text extraction successful, non-empty content');
          }
          
          console.log('\n=== FIRST 1000 CHARACTERS ===');
          console.log(pdfText.substring(0, 1000));
          console.log('\n=== FULL TEXT (for pattern matching) ===');
          console.log(pdfText);
          console.log('\n=== LAST 300 CHARACTERS ===');
          console.log(pdfText.substring(Math.max(0, pdfText.length - 300)));
          console.log('=== END PDF TEXT ===\n');
          
          // Log insulin-related content for debugging
          const insulinMatches = pdfText.match(/insulin[^\n]{0,100}/gi);
          if (insulinMatches) {
            console.log('=== Insulin-related text found ===');
            insulinMatches.forEach((match, i) => {
              console.log(`Match ${i + 1}:`, match);
            });
          } else {
            console.log('⚠️ No insulin-related text found in document');
          }
          
          // Parse the extracted text
          extractedData = parseMedicalDocument(pdfText);
          console.log('=== Extracted Data ===');
          console.log(extractedData);
        } catch (error) {
          console.error('PDF parsing error:', error);
          extractedData = {};
        }
      } else if (fileType === 'image/jpeg' || fileType === 'image/png') {
        // For images, we would need OCR - for now return empty
        // In production, integrate with Tesseract.js or cloud OCR API
        console.log('Image file uploaded - OCR not implemented');
        extractedData = {};
      }

      // Build ML response object with extracted data and raw text
      const mlResponse = {
        ...extractedData,
        raw_text: pdfText,
        ocr_text: pdfText
      };

      // Use consolidated parser service for robust fallback extraction
      console.log('=== Calling consolidate() from parserService ===');
      const responseData = await consolidate(mlResponse);

      console.log('=== Consolidated Response Data ===');
      console.log('Response structure:');
      console.log('- Name:', responseData.name);
      console.log('- DOB:', responseData.dob);
      console.log('- Weight (kg):', responseData.weight_kg);
      console.log('- Height (cm):', responseData.height_cm);
      console.log('- Glucose (mg/dL):', responseData.glucose_mgdl);
      console.log('- Carbs (g):', responseData.carbs_g);
      
      // Infer diabetes type from parsed data
      console.log('=== Inferring Diabetes Type ===');
      const diabetesTypeData = {
        dob: responseData.dob?.value as string,
        medications: responseData.medications?.value as string,
        insulin_regimen: responseData.insulin_regimen?.value as string,
        a1c_percent: responseData.a1c_percent?.value as number,
        weight_kg: responseData.weight_kg?.value as number,
        height_cm: responseData.height_cm?.value as number,
        raw_text: responseData.raw_text
      };
      
      const diabetesTypeResult = inferDiabetesType(diabetesTypeData);
      console.log('Diabetes Type Result:', diabetesTypeResult);
      
      // Add diabetes type to response
      const enhancedResponse = {
        ...responseData,
        diabetes_type: {
          value: diabetesTypeResult.diabetes_type,
          confidence: diabetesTypeResult.confidence,
          source: 'classifier' as const,
          reasons: diabetesTypeResult.reasons
        }
      };

      res.json(enhancedResponse);
    } catch (error: any) {
      console.error('❌ Parse error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        message: error.message || 'Failed to parse document',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
  
  // Helper function to normalize and extract field values with fallback logic
  interface ExtractedField {
    value: string | number | null;
    confidence: number;
    source: 'ml' | 'ocr' | 'fallback';
  }

  function createField(value: any, confidence: number, source: 'ml' | 'ocr' | 'fallback'): ExtractedField {
    return { value, confidence, source };
  }

  // Fallback regex patterns for when ML returns null
  function extractWithFallback(text: string, fieldType: string): ExtractedField {
    const textLower = text.toLowerCase();
    
    switch (fieldType) {
      case 'dob':
        // Try multiple date patterns
        const dobPatterns = [
          /\b(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/,
          /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i
        ];
        for (const pattern of dobPatterns) {
          const match = text.match(pattern);
          if (match) {
            let normalized = match[0];
            // Normalize to YYYY-MM-DD
            if (match[0].includes('/')) {
              const parts = match[0].split('/');
              normalized = parts.length === 3 ? `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}` : match[0];
            }
            return createField(normalized, 0.35, 'ocr');
          }
        }
        return createField(null, 0, 'fallback');

      case 'weight':
        // Extract weight in kg or lbs
        const weightMatch = text.match(/(\d{2,3})\s?(kg|kilograms?|lbs?|pounds?)/i);
        if (weightMatch) {
          let weightKg = parseFloat(weightMatch[1]);
          if (weightMatch[2].toLowerCase().startsWith('lb') || weightMatch[2].toLowerCase().startsWith('pound')) {
            weightKg = weightKg * 0.453592; // Convert lbs to kg
          }
          return createField(parseFloat(weightKg.toFixed(1)), 0.35, 'fallback');
        }
        return createField(null, 0, 'fallback');

      case 'height':
        // Extract height in cm or inches
        const heightMatch = text.match(/(\d{2,3})\s?(cm|centimeters?|in|inches?)/i);
        if (heightMatch) {
          let heightCm = parseFloat(heightMatch[1]);
          if (heightMatch[2].toLowerCase().startsWith('in')) {
            heightCm = heightCm * 2.54; // Convert inches to cm
          }
          return createField(parseFloat(heightCm.toFixed(1)), 0.35, 'fallback');
        }
        return createField(null, 0, 'fallback');

      case 'glucose':
        // Extract glucose in mg/dL
        const glucoseMatch = text.match(/(\d{2,3})\s?(mg\/dl|mmol\/l)?/i);
        if (glucoseMatch) {
          let glucoseMgDl = parseInt(glucoseMatch[1]);
          if (glucoseMatch[2]?.toLowerCase().includes('mmol')) {
            glucoseMgDl = Math.round(glucoseMgDl * 18); // Convert mmol/L to mg/dL
          }
          if (glucoseMgDl >= 20 && glucoseMgDl <= 600) {
            return createField(glucoseMgDl, 0.35, 'fallback');
          }
        }
        return createField(null, 0, 'fallback');

      case 'carbs':
        // Extract carbs in grams
        const carbsMatch = text.match(/(\d{1,4})\s?(g|grams?|carbs?|carbohydrates?)/i);
        if (carbsMatch) {
          const carbs = parseInt(carbsMatch[1]);
          if (carbs >= 0 && carbs <= 500) {
            return createField(carbs, 0.35, 'fallback');
          }
        }
        return createField(null, 0, 'fallback');

      default:
        return createField(null, 0, 'fallback');
    }
  }

  // Helper function to parse medical document content with confidence scores
  function parseMedicalDocument(content: string): any {
    const data: any = {};
    const lines = content.split('\n');

    console.log('=== Parsing Medical Document ===');
    console.log('Total lines:', lines.length);
    console.log('Content length:', content.length);
    console.log('\n=== FULL CONTENT FOR PATTERN MATCHING ===');
    console.log(content);
    console.log('=== END FULL CONTENT ===\n');

    // Try to extract all text in one pass for more flexible pattern matching
    const fullContent = content.toLowerCase();

    // Extract Name - ULTRA AGGRESSIVE patterns with broad fallbacks
    if (!data.name) {
      // Pattern 1: "Patient Name: John Doe" or "Name: John Doe" (most explicit)
      let match = content.match(/(?:patient\s+)?name[:\s]+([A-Za-z\s]+?)(?:[,\n]|$)/i);
      if (match) {
        const name = match[1].trim().split(/[,\n]/)[0].trim();
        if (name && name.length > 2 && name.length < 100 && !name.match(/^(medical|diagnostic|report|test)/i)) {
          data.name = createField(name, 0.95, 'ml');
          console.log('Found name (Pattern 1 - explicit):', data.name.value, 'confidence:', data.name.confidence);
        }
      }
      
      // Pattern 2: Look for "Patient:" or "Name:" with ANY text after it
      if (!data.name) {
        match = content.match(/(?:patient|name)[:\s]+([A-Za-z][A-Za-z\s]{2,50}?)(?:\n|,|age|dob|date|gender|id|weight|height|$)/i);
        if (match) {
          const name = match[1].trim();
          if (name && name.length > 2 && !name.match(/^(medical|diagnostic|report|test|result)/i)) {
            data.name = createField(name, 0.90, 'ocr');
            console.log('Found name (Pattern 2 - patient/name label):', data.name.value, 'confidence:', data.name.confidence);
          }
        }
      }
      
      // Pattern 3: Two capitalized words (First Last name pattern)
      if (!data.name) {
        match = content.match(/\b([A-Z][a-z]{2,20}\s+[A-Z][a-z]{2,20})\b/);
        if (match) {
          const name = match[1];
          // Skip common headers
          if (!name.match(/^(Medical|Diagnostic|Report|Patient|Test|Date|Doctor|Health|Laboratory|Clinical|Diabetes|Glucose)/i)) {
            data.name = createField(name, 0.75, 'ocr');
            console.log('Found name (Pattern 3 - capitalized pair):', data.name.value, 'confidence:', data.name.confidence);
          }
        }
      }
      
      // Pattern 4: Single capitalized name (very aggressive fallback)
      if (!data.name) {
        const namePatterns = content.match(/\b([A-Z][a-z]{3,20})\b/g);
        if (namePatterns && namePatterns.length > 0) {
          // Take the first one that's not a common medical/document term
          for (const pattern of namePatterns) {
            if (!pattern.match(/^(Medical|Report|Diabetes|Patient|Doctor|Hospital|Clinic|Test|Result|Date|Page|Table|Health|Laboratory|Clinical|Glucose|Analysis|Summary|Data|Type|Level|Range|Value|Unit|Total|Daily|Weekly|Monthly)/i)) {
              data.name = createField(pattern.trim(), 0.45, 'fallback');
              console.log('Found name (Pattern 4 - aggressive single word):', data.name.value, 'confidence:', data.name.confidence);
              break;
            }
          }
        }
      }
      
      // Pattern 5: ULTRA FALLBACK - Extract first line that looks like a name
      if (!data.name) {
        const firstLine = lines[0]?.trim();
        if (firstLine && firstLine.length > 2 && firstLine.length < 50 && firstLine.match(/[A-Za-z]{3,}/)) {
          // Check if first line looks like a name (not a header)
          if (!firstLine.match(/^(Medical|Report|Diabetes|Patient Record|Health|Hospital|Clinic|Laboratory|Test Results|Analysis)/i)) {
            data.name = createField(firstLine, 0.40, 'fallback');
            console.log('Found name (Pattern 5 - first line fallback):', data.name.value, 'confidence:', data.name.confidence);
          }
        }
      }
    }

    // Extract Date of Birth - comprehensive pattern matching
    if (!data.dob) {
      // Helper function to validate and normalize dates
      const validateAndNormalizeDate = (dateStr: string, pattern: string): { normalized: string, confidence: number } | null => {
        // Check year is reasonable (1900-2024)
        const year = parseInt(dateStr.match(/\d{4}/)?.[0] || '');
        if (year < 1900 || year > 2024) {
          return null;
        }
        
        let parts: string[];
        let normalized: string;
        
        // Handle different date formats
        if (pattern === 'dd/mm/yyyy' || pattern === 'dd-mm-yyyy') {
          parts = dateStr.split(/[-\/]/);
          // Validate day (1-31) and month (1-12)
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          if (day < 1 || day > 31 || month < 1 || month > 12) return null;
          normalized = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (pattern === 'mm/dd/yyyy' || pattern === 'mm-dd-yyyy') {
          parts = dateStr.split(/[-\/]/);
          // Validate day (1-31) and month (1-12)
          const month = parseInt(parts[0]);
          const day = parseInt(parts[1]);
          if (day < 1 || day > 31 || month < 1 || month > 12) return null;
          normalized = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        } else if (pattern === 'yyyy-mm-dd' || pattern === 'yyyy/mm/dd') {
          parts = dateStr.split(/[-\/]/);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          if (day < 1 || day > 31 || month < 1 || month > 12) return null;
          normalized = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (pattern === 'dd mon yyyy') {
          // Handle "14 June 2003" or "14 Jun 2003" format
          const monthMatch = dateStr.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
          if (!monthMatch) return null;
          
          const monthStr = monthMatch[1].toLowerCase();
          const monthMap: {[key: string]: string} = {
            'january': '01', 'jan': '01',
            'february': '02', 'feb': '02',
            'march': '03', 'mar': '03',
            'april': '04', 'apr': '04',
            'may': '05',
            'june': '06', 'jun': '06',
            'july': '07', 'jul': '07',
            'august': '08', 'aug': '08',
            'september': '09', 'sep': '09',
            'october': '10', 'oct': '10',
            'november': '11', 'nov': '11',
            'december': '12', 'dec': '12'
          };
          
          const dayMatch = dateStr.match(/(\d{1,2})/);
          const yearMatch = dateStr.match(/(\d{4})/);
          if (!dayMatch || !yearMatch) return null;
          
          const day = parseInt(dayMatch[1]);
          if (day < 1 || day > 31) return null;
          
          const month = monthMap[monthStr];
          if (!month) return null;
          normalized = `${yearMatch[1]}-${month}-${dayMatch[1].padStart(2, '0')}`;
        } else {
          return null;
        }
        
        return { normalized, confidence: 0.95 };
      };

      // Pattern 1: Explicit "Date of Birth:" or "DOB:" with numbers (highest priority)
      let match = content.match(/(?:date\s+of\s+birth|dob)[:\s]+([^\n,]+?)(?:\n|,|$)/i);
      if (match) {
        const dateStr = match[1].trim();
        
        // Try DD/MM/YYYY format
        let dateMatch = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if (dateMatch) {
          const result = validateAndNormalizeDate(dateMatch[0], dateMatch[1].length === 1 || dateMatch[0].split(/[-\/]/)[0].length <= 2 ? 'dd/mm/yyyy' : 'mm/dd/yyyy');
          if (result) {
            data.dob = { value: result.normalized, confidence: 0.97 };
            console.log('Found DOB (explicit label, DD/MM/YYYY):', data.dob.value, 'confidence:', data.dob.confidence);
          }
        }
        
        // Try DD Month YYYY format
        if (!data.dob) {
          dateMatch = dateStr.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
          if (dateMatch) {
            const result = validateAndNormalizeDate(dateMatch[0], 'dd mon yyyy');
            if (result) {
              data.dob = { value: result.normalized, confidence: 0.98 };
              console.log('Found DOB (explicit label, DD Month YYYY):', data.dob.value, 'confidence:', data.dob.confidence);
            }
          }
        }
        
        // Try YYYY-MM-DD format
        if (!data.dob) {
          dateMatch = dateStr.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
          if (dateMatch) {
            const result = validateAndNormalizeDate(dateMatch[0], 'yyyy-mm-dd');
            if (result) {
              data.dob = { value: result.normalized, confidence: 0.97 };
              console.log('Found DOB (explicit label, YYYY-MM-DD):', data.dob.value, 'confidence:', data.dob.confidence);
            }
          }
        }
      }

      // Pattern 2: "born" keyword with date
      if (!data.dob) {
        match = content.match(/\b(?:born|b\.?\s*on)[:\s]+([^\n,]+?)(?:\n|,|$)/i);
        if (match) {
          const dateStr = match[1].trim();
          
          // Try DD Month YYYY
          let dateMatch = dateStr.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
          if (dateMatch) {
            const result = validateAndNormalizeDate(dateMatch[0], 'dd mon yyyy');
            if (result) {
              data.dob = { value: result.normalized, confidence: 0.92 };
              console.log('Found DOB (born keyword, DD Month YYYY):', data.dob.value, 'confidence:', data.dob.confidence);
            }
          }
          
          // Try DD/MM/YYYY
          if (!data.dob) {
            dateMatch = dateStr.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
            if (dateMatch) {
              const result = validateAndNormalizeDate(dateMatch[0], 'dd/mm/yyyy');
              if (result) {
                data.dob = { value: result.normalized, confidence: 0.92 };
                console.log('Found DOB (born keyword, DD/MM/YYYY):', data.dob.value, 'confidence:', data.dob.confidence);
              }
            }
          }
        }
      }

      // Pattern 3: Age-based inference (if DOB still not found but age is present)
      if (!data.dob) {
        match = content.match(/age[:\s]+([0-9]{1,3})\s*(?:years?|yrs?)?/i);
        if (match) {
          const age = parseInt(match[1]);
          if (age >= 0 && age <= 150) {
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - age;
            // Use January 1st as approximation
            data.dob = { value: `${birthYear}-01-01`, confidence: 0.50 }; // Low confidence for approximation
            console.log('Found DOB (inferred from age):', data.dob.value, 'confidence:', data.dob.confidence);
          }
        }
      }

      // Pattern 4: Generic date pattern (fallback - look for earliest reasonable date in document)
      if (!data.dob) {
        // Find all date patterns and pick the one that looks like a birth date (older date)
        const allDates = content.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})|(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/g);
        if (allDates && allDates.length > 0) {
          for (const dateStr of allDates) {
            let result;
            if (dateStr.match(/^\d{4}/)) {
              result = validateAndNormalizeDate(dateStr, 'yyyy-mm-dd');
            } else {
              result = validateAndNormalizeDate(dateStr, 'dd/mm/yyyy');
            }
            
            if (result) {
              // Pick dates that are likely birth dates (older dates)
              const year = parseInt(result.normalized.split('-')[0]);
              if (year < new Date().getFullYear() - 10) { // At least 10 years old
                data.dob = { value: result.normalized, confidence: 0.70 };
                console.log('Found DOB (generic pattern, confidence lower):', data.dob.value, 'confidence:', data.dob.confidence);
                break;
              }
            }
          }
        }
      }
    }

    // Extract Weight
    if (!data.weight) {
      // Pattern 1: "weight: 70 kg" or similar
      let match = content.match(/weight[:\s]*([0-9]{1,3}(?:\.[0-9]{1,2})?)\ s*(?:kg|kilogram|kgs?)?/i);
      if (match) {
        const value = parseFloat(match[1]);
        if (value >= 30 && value <= 250) {
          data.weight = { value: match[1], confidence: 0.85 };
          console.log('Found weight (Pattern 1):', data.weight.value, 'confidence:', data.weight.confidence);
        }
      }
      // Pattern 2: "wt" or "body weight" variations
      if (!data.weight) {
        match = content.match(/(?:wt|body\s*weight|weight)[^0-9]{0,30}([0-9]{2,3}(?:\.[0-9]{1,2})?)\s*(?:kg|kgs?|lbs?)?/i);
        if (match) {
        const value = parseFloat(match[1]);
        if (value >= 30 && value <= 250) {
          data.weight = { value: match[1], confidence: 0.75 };
          console.log('Found weight (Pattern 2):', data.weight.value, 'confidence:', data.weight.confidence);
        }
        }
      }
      
      // Pattern 3: VERY AGGRESSIVE - Any 2-3 digit number 40-200 near "weight" or "wt"
      if (!data.weight) {
        match = content.match(/(?:weight|wt|body)[^0-9]{0,50}([4-9][0-9]|1[0-9]{2}|2[0-4][0-9])/i);
        if (match) {
          const value = parseInt(match[1]);
          if (value >= 40 && value <= 200) {
          data.weight = { value: match[1], confidence: 0.55 };
          console.log('Found weight (Pattern 3 - aggressive):', data.weight.value, 'confidence:', data.weight.confidence);
          }
        }
      }
      
      // Pattern 4: ULTRA FALLBACK - Find "kg" or "lbs" and look for number before it
      if (!data.weight) {
        match = content.match(/([4-9][0-9]|1[0-9]{2}|2[0-4][0-9])\s*(?:kg|kgs?|lbs?)/i);
        if (match) {
          const value = parseInt(match[1]);
          if (value >= 40 && value <= 200) {
            data.weight = { value: match[1], confidence: 0.45 };
            console.log('Found weight (Pattern 4 - ultra fallback):', data.weight.value, 'confidence:', data.weight.confidence);
          }
        }
      }
    }

    // Extract Height
    if (!data.height) {
      // Pattern 1: "height: 170 cm" or "Height 170"
      let match = content.match(/height[:\s]*([0-9]{2,3}(?:\.[0-9]{1,2})?)\s*(?:cm|centimeter|inch|in)?/i);
      if (match) {
        const value = parseFloat(match[1]);
        if (value >= 100 && value <= 250) {
          data.height = { value: match[1], confidence: 0.80 };
          console.log('Found height (Pattern 1 - explicit):', data.height.value, 'confidence:', data.height.confidence);
        }
      }
      
      // Pattern 2: Numbers near "height" keyword
      if (!data.height) {
        match = content.match(/height[^0-9]{0,30}([0-9]{2,3}(?:\.[0-9]{1,2})?)\s*(?:cm|centimeters?|inches?)?/i);
        if (match) {
          const value = parseFloat(match[1]);
          if (value >= 100 && value <= 250) {
            data.height = { value: match[1], confidence: 0.70 };
            console.log('Found height (Pattern 2 - near height):', data.height.value, 'confidence:', data.height.confidence);
          }
        }
      }
      
      // Pattern 3: ULTRA FALLBACK - Find "cm" and look for number before it (100-220 range)
      if (!data.height) {
        match = content.match(/(1[0-9]{2}|2[0-4][0-9])\s*(?:cm|centimeters?)/i);
        if (match) {
          const value = parseInt(match[1]);
          if (value >= 100 && value <= 220) {
            data.height = { value: match[1], confidence: 0.50 };
            console.log('Found height (Pattern 3 - ultra fallback cm):', data.height.value, 'confidence:', data.height.confidence);
          }
        }
      }
    }

    // Extract A1C - Enhanced with better pattern matching
    if (!data.lastA1c) {
      // Pattern 1: "HbA1c: 7.2%" or "A1C: 7.2" (most explicit)
      let match = content.match(/(?:hba1c|a1c|hemoglobin\s+a1c|glycated\s+hemoglobin)[:\s]*([0-9]{1,2}(?:\.[0-9]{1,2})?)\s*%?/i);
      if (match) {
        const value = parseFloat(match[1]);
        if (value >= 4.0 && value <= 15.0) { // Validate reasonable A1C range (4-15%)
          data.lastA1c = { value: match[1], confidence: 0.92 };
          console.log('Found A1C (explicit):', data.lastA1c.value, 'confidence:', data.lastA1c.confidence);
        }
      }
      
      // Pattern 2: "A1C = 7.2" or "HbA1c level: 6.8"
      if (!data.lastA1c) {
        match = content.match(/(?:hba1c|a1c)\s*(?:level|value)?\s*[=:]?\s*([0-9]{1,2}(?:\.[0-9]{1,2})?)\s*%?/i);
        if (match) {
          const value = parseFloat(match[1]);
          if (value >= 4.0 && value <= 15.0) {
            data.lastA1c = { value: match[1], confidence: 0.88 };
            console.log('Found A1C (with equals/level):', data.lastA1c.value, 'confidence:', data.lastA1c.confidence);
          }
        }
      }
      
      // Pattern 3: Within test results section
      if (!data.lastA1c) {
        match = content.match(/(?:test\s+results?|lab\s+results?)[^]*?(?:hba1c|a1c)[:\s]*([0-9]{1,2}(?:\.[0-9]{1,2})?)\s*%?/i);
        if (match) {
          const value = parseFloat(match[1]);
          if (value >= 4.0 && value <= 15.0) {
            data.lastA1c = { value: match[1], confidence: 0.85 };
            console.log('Found A1C (in test results):', data.lastA1c.value, 'confidence:', data.lastA1c.confidence);
          }
        }
      }
    }

    // Extract Medications
    if (!data.medications) {
      // Pattern 1: "Medications: Metformin 500mg..."
      let match = content.match(/medications?[:\s]*([A-Za-z0-9\s,;\-()./]*(?:mg|units?|dosage)?[A-Za-z0-9\s,;\-()./]*)/i);
      if (match) {
        const meds = match[1].trim().substring(0, 200);
        if (meds.length > 2) {
          data.medications = { value: meds, confidence: 0.80 };
          console.log('Found medications:', data.medications.value, 'confidence:', data.medications.confidence);
        }
      }
    }

    // Extract Typical Insulin - Enhanced with multiple comprehensive patterns
    if (!data.typicalInsulin) {
      // Pattern 1: Explicit "Insulin dose:" or "Daily insulin:" or "Total daily insulin:"
      let match = content.match(/(?:insulin\s+dose|daily\s+insulin|total\s+daily\s+insulin|tdi)[:\s]*([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*(?:unit|units?|u)?/i);
      if (match) {
        const value = parseFloat(match[1]);
        if (value > 0 && value <= 300) { // Validate reasonable insulin range
          data.typicalInsulin = { value: match[1], confidence: 0.92 };
          console.log('Found insulin (explicit dose):', data.typicalInsulin.value, 'confidence:', data.typicalInsulin.confidence);
        }
      }
      
      // Pattern 2: "Insulin: 24 units" or "Dose: 18u" (original pattern with validation)
      if (!data.typicalInsulin) {
        match = content.match(/(?:^|\n|\s)(?:insulin|dose)[:\s]+([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*(?:unit|units?|u)(?:\s|\n|$|,)/i);
        if (match) {
          const value = parseFloat(match[1]);
          if (value > 0 && value <= 300) {
            data.typicalInsulin = { value: match[1], confidence: 0.88 };
            console.log('Found insulin (standard):', data.typicalInsulin.value, 'confidence:', data.typicalInsulin.confidence);
          }
        }
      }
      
      // Pattern 3: "Basal insulin" + "Bolus insulin" (sum both for total daily dose)
      if (!data.typicalInsulin) {
        const basalMatch = content.match(/basal\s+(?:insulin)?[:\s]*([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*(?:unit|units?|u)?/i);
        const bolusMatch = content.match(/bolus\s+(?:insulin)?[:\s]*([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*(?:unit|units?|u)?/i);
        
        if (basalMatch && bolusMatch) {
          const basal = parseFloat(basalMatch[1]);
          const bolus = parseFloat(bolusMatch[1]);
          const total = basal + bolus;
          if (total > 0 && total <= 300) {
            data.typicalInsulin = { value: total.toFixed(1), confidence: 0.90 };
            console.log(`Found insulin (basal: ${basal} + bolus: ${bolus} = ${total}):`, data.typicalInsulin.value, 'confidence:', data.typicalInsulin.confidence);
          }
        } else if (basalMatch) {
          const value = parseFloat(basalMatch[1]);
          if (value > 0 && value <= 300) {
            data.typicalInsulin = { value: basalMatch[1], confidence: 0.78 };
            console.log('Found insulin (basal only):', data.typicalInsulin.value, 'confidence:', data.typicalInsulin.confidence);
          }
        }
      }
      
      // Pattern 4: Within medication list containing insulin brands
      if (!data.typicalInsulin) {
        const insulinBrands = ['lantus', 'novolog', 'humalog', 'levemir', 'tresiba', 'apidra', 'fiasp', 'toujeo', 'humulin', 'novolin'];
        for (const brand of insulinBrands) {
          const regex = new RegExp(`${brand}[\\s:,]+([0-9]{1,3}(?:\\.[0-9]{1,2})?)\\s*(?:unit|units?|u)`, 'i');
          match = content.match(regex);
          if (match) {
            const value = parseFloat(match[1]);
            if (value > 0 && value <= 300) {
              data.typicalInsulin = { value: match[1], confidence: 0.85 };
              console.log(`Found insulin (${brand} medication):`, data.typicalInsulin.value, 'confidence:', data.typicalInsulin.confidence);
              break;
            }
          }
        }
      }
      
      // Pattern 5: "units per day" or "units/day"
      if (!data.typicalInsulin) {
        match = content.match(/([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*(?:unit|units?|u)\s*(?:per\s+day|daily|\/day|\/d)/i);
        if (match) {
          const value = parseFloat(match[1]);
          if (value > 0 && value <= 300) {
            data.typicalInsulin = { value: match[1], confidence: 0.83 };
            console.log('Found insulin (units per day):', data.typicalInsulin.value, 'confidence:', data.typicalInsulin.confidence);
          }
        }
      }
      
      // Pattern 6: Generic number near "units" in context of insulin/diabetes (lowest confidence)
      if (!data.typicalInsulin) {
        const insulinContext = content.match(/(?:insulin|diabetes)[^0-9]{0,50}([0-9]{1,3}(?:\.[0-9]{1,2})?)\s*(?:unit|units?|u)/i);
        if (insulinContext) {
          const value = parseFloat(insulinContext[1]);
          if (value > 0 && value <= 300) {
            data.typicalInsulin = { value: insulinContext[1], confidence: 0.68 };
            console.log('Found insulin (context-based):', data.typicalInsulin.value, 'confidence:', data.typicalInsulin.confidence);
          }
        }
      }
      
      // Pattern 7: ULTRA AGGRESSIVE - Any number 5-100 near "insulin"
      if (!data.typicalInsulin) {
        match = content.match(/insulin[^0-9]{0,30}([5-9]|[1-9][0-9]|100)/i);
        if (match) {
          const value = parseInt(match[1]);
          if (value >= 5 && value <= 100) {
            data.typicalInsulin = { value: match[1], confidence: 0.55 };
            console.log('Found insulin (aggressive):', data.typicalInsulin.value, 'confidence:', data.typicalInsulin.confidence);
          }
        }
      }
    }

    // Extract Target Range
    if (!data.targetRange) {
      // Pattern 1: "70-180" or "70–180" (en-dash) with explicit labels
      let match = content.match(/(?:target|range|glucose.*?range|blood\s+sugar\s+range)[:\s]*([0-9]{2,3})\s*[-–]\s*([0-9]{2,3})/i);
      if (match) {
        const low = parseInt(match[1]);
        const high = parseInt(match[2]);
        if (low >= 50 && low < high && high <= 400) { // Validate reasonable range
          data.targetRange = { value: `${match[1]}-${match[2]}`, confidence: 0.90 };
          console.log('Found target range (explicit):', data.targetRange.value, 'confidence:', data.targetRange.confidence);
        }
      }
      
      // Pattern 2: Generic range pattern near "glucose" or "sugar"
      if (!data.targetRange) {
        match = content.match(/(?:glucose|sugar)[^0-9]{0,30}([0-9]{2,3})\s*[-–]\s*([0-9]{2,3})/i);
        if (match) {
          const low = parseInt(match[1]);
          const high = parseInt(match[2]);
          if (low >= 50 && low < high && high <= 400) {
            data.targetRange = { value: `${match[1]}-${match[2]}`, confidence: 0.75 };
            console.log('Found target range (context):', data.targetRange.value, 'confidence:', data.targetRange.confidence);
          }
        }
      }
    }
    
    // Extract additional glucose readings if present (for better AI predictions)
    if (!data.fastingGlucose) {
      const match = content.match(/(?:fasting\s+(?:glucose|blood\s+sugar|bg))[:\s]*([0-9]{2,3})\s*(?:mg\/dl)?/i);
      if (match) {
        const value = parseInt(match[1]);
        if (value >= 50 && value <= 600) {
          data.fastingGlucose = { value: match[1], confidence: 0.88 };
          console.log('Found fasting glucose:', data.fastingGlucose.value, 'confidence:', data.fastingGlucose.confidence);
        }
      }
    }
    
    if (!data.randomGlucose) {
      const match = content.match(/(?:random\s+(?:glucose|blood\s+sugar|bg))[:\s]*([0-9]{2,3})\s*(?:mg\/dl)?/i);
      if (match) {
        const value = parseInt(match[1]);
        if (value >= 50 && value <= 600) {
          data.randomGlucose = { value: match[1], confidence: 0.85 };
          console.log('Found random glucose:', data.randomGlucose.value, 'confidence:', data.randomGlucose.confidence);
        }
      }
    }
    
    if (!data.postprandialGlucose) {
      const match = content.match(/(?:postprandial|post\s+meal|after\s+meal|pp)\s+(?:glucose|blood\s+sugar|bg)[:\s]*([0-9]{2,3})\s*(?:mg\/dl)?/i);
      if (match) {
        const value = parseInt(match[1]);
        if (value >= 50 && value <= 600) {
          data.postprandialGlucose = { value: match[1], confidence: 0.88 };
          console.log('Found postprandial glucose:', data.postprandialGlucose.value, 'confidence:', data.postprandialGlucose.confidence);
        }
      }
    }

    console.log('=== Final Parsed Data ===');
    console.log(data);
    return data;
  }

  app.post('/api/reports/upload', optionalAuthWithApproval, upload.single('file'), async (req: AuthRequest, res: any) => {
    try {
      console.log('📤 Upload request received');
      console.log('User:', req.user);
      console.log('File present:', !!req.file);
      console.log('Headers:', req.headers.authorization ? 'Token present' : 'No token');
      
      if (!req.file) {
        console.error('❌ No file uploaded');
        return res.status(400).json({ message: 'No file uploaded' });
      }

      console.log('File details:', {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      });

      const { patientId, description, skipDbSave } = req.body;
      
      // Log for debugging
      console.log('Patient ID from body:', patientId);
      console.log('Skip DB save:', skipDbSave);
      console.log('User ID from token:', req.user?.userId || 'NO USER');
      console.log('User role:', req.user?.role || 'NO ROLE');
      
      // ONBOARDING MODE: If skipDbSave is true, just acknowledge upload without saving to DB
      // This allows users in onboarding (not yet in DB) to upload files for parsing
      if (skipDbSave === 'true' || skipDbSave === true) {
        console.log('🔵 ONBOARDING MODE: Skipping database save, file uploaded for parsing only');
        return res.status(200).json({
          message: 'File uploaded successfully (parsing mode)',
          tempFile: true,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
        });
      }
      
      // NORMAL MODE: Save to database (requires authenticated user)
      if (!req.user || !req.user.userId) {
        console.error('❌ No authenticated user for database save');
        return res.status(401).json({ 
          message: 'Authentication required to save report to database. Use skipDbSave=true for onboarding.',
        });
      }
      
      // Allow patients to only upload for themselves (compare as strings)
      if (req.user.role === 'patient' && patientId && patientId !== req.user.userId) {
        console.error('❌ Access denied - patient trying to upload for different user');
        return res.status(403).json({ message: 'Access denied' });
      }

      console.log('Creating medical report...');
      // For Railway deployment, we store file metadata but not the actual file
      // In a production environment, you would integrate with a storage service like AWS S3
      const fileUrl = `memory://${req.file.buffer.length}-bytes`; // Placeholder for Railway

      const report = await storage.createMedicalReport(
        patientId || req.user.userId,
        req.user.userId,
        {
          fileName: req.file.originalname,
          fileUrl: fileUrl,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          description,
        }
      );

      console.log('✅ Report uploaded successfully:', report._id);
      res.status(201).json({ 
        message: 'Report uploaded successfully',
        report: {
          id: report._id,
          fileName: report.fileName,
          fileType: report.fileType,
          uploadedAt: report.uploadedAt,
        }
      });
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        message: error.message || 'Failed to upload report',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.get('/api/reports', optionalAuthWithApproval, async (req: AuthRequest, res: any) => {
    try {
      console.log('📋 Reports list request received');
      console.log('User:', req.user);
      
      const patientId = req.query.patientId as string || req.user!.userId;
      
      if (req.user!.role === 'patient' && patientId !== req.user!.userId) {
        console.error('❌ Access denied - patient trying to access different user reports');
        return res.status(403).json({ message: 'Access denied' });
      }

      const reports = await storage.getMedicalReportsByPatient(patientId);
      console.log(`✅ Found ${reports.length} reports for user ${patientId}`);

      res.json({ reports });
    } catch (error: any) {
      console.error('❌ Error fetching reports:', error);
      res.status(500).json({ message: error.message || 'Failed to fetch reports' });
    }
  });

  // Get patient details for a specific report
  app.get('/api/reports/:reportId/patient', optionalAuthWithApproval, async (req: AuthRequest, res: any) => {
    try {
      const { reportId } = req.params;
      
      // Get the report first to find the patient ID
      const report = await storage.getMedicalReportById(reportId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      // Check authorization
      if (req.user!.role === 'patient' && report.patientId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Fetch patient details
      const patient = await storage.getUser(report.patientId);
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }

      // Return patient information (excluding sensitive password)
      res.json({
        patient: {
          id: patient._id,
          name: patient.name,
          email: patient.email,
          role: patient.role,
          isApproved: patient.isApproved,
          createdAt: patient.createdAt,
        },
        report: {
          id: report._id,
          fileName: report.fileName,
          fileType: report.fileType,
          fileSize: report.fileSize,
          uploadedAt: report.uploadedAt,
          description: report.description,
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch patient details' });
    }
  });

  // User Profile Routes
  app.post('/api/profile', optionalAuthWithApproval, async (req: AuthRequest, res: any) => {
    try {
      // Check if profile already exists
      const existing = await storage.getUserProfile(req.user!.userId);
      if (existing) {
        return res.status(409).json({ message: 'Profile already exists, use PUT to update' });
      }

      const validated = insertUserProfileSchema.parse(req.body);
      const profile = await storage.createUserProfile(req.user!.userId, validated);
      res.status(201).json({ profile });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to create profile' });
    }
  });

  app.get('/api/profile', optionalAuthWithApproval, async (req: AuthRequest, res: any) => {
    try {
      const profile = await storage.getUserProfile(req.user!.userId);
      res.json({ profile });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch profile' });
    }
  });

  app.put('/api/profile', optionalAuthWithApproval, async (req: AuthRequest, res: any) => {
    try {
      const validated = insertUserProfileSchema.partial().parse(req.body);
      const profile = await storage.updateUserProfile(req.user!.userId, validated);
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      res.json({ profile });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to update profile' });
    }
  });

  // ==================== AI DIABETES INTERPRETATION ====================

  app.post('/api/ai/diabetes-summary', optionalAuthWithApproval, async (req: AuthRequest, res: any) => {
    try {
      const profileData = req.body;

      // Validate required fields for analysis
      if (!profileData.hba1c_percent && !profileData.lastA1c) {
        return res.status(400).json({ 
          message: 'Insufficient data for analysis. At least HbA1c is required.',
          summary: {
            control_level: 'unknown',
            key_risks: ['Insufficient clinical data'],
            summary_sentence: 'Please provide HbA1c value for diabetes control assessment.',
            recommended_focus_areas: ['Complete patient profile with HbA1c measurement']
          }
        });
      }

      // Analyze diabetes control based on HbA1c and glucose values
      const a1c = profileData.hba1c_percent || profileData.lastA1c;
      const fastingGlucose = profileData.fasting_glucose_mgdl;
      const randomGlucose = profileData.random_glucose_mgdl;
      const postprandialGlucose = profileData.postprandial_glucose_mgdl;

      // Determine control level
      let controlLevel = 'unknown';
      let riskLevel = 'moderate';
      
      if (a1c < 7) {
        controlLevel = 'good';
        riskLevel = 'low';
      } else if (a1c < 8) {
        controlLevel = 'moderate';
        riskLevel = 'moderate';
      } else if (a1c < 10) {
        controlLevel = 'poor';
        riskLevel = 'high';
      } else {
        controlLevel = 'poor';
        riskLevel = 'critical';
      }

      // Identify key risks
      const keyRisks: string[] = [];
      
      if (a1c >= 8) {
        keyRisks.push(`Poor glycemic control (HbA1c ${a1c}%)`);
      }
      
      if (fastingGlucose && fastingGlucose > 180) {
        keyRisks.push('Elevated fasting glucose levels');
      }
      
      if (randomGlucose && randomGlucose > 250) {
        keyRisks.push('Recurrent hyperglycemia');
      }
      
      const bmi = calculateBMI(profileData.weight_kg, profileData.height_cm);
      if (bmi && bmi > 30) {
        keyRisks.push('Overweight/obesity (BMI ' + bmi.toFixed(1) + ')');
      }
      
      if (!profileData.medications || profileData.medications.length === 0) {
        keyRisks.push('Limited medication documentation');
      }

      if (keyRisks.length === 0) {
        keyRisks.push('Well-managed diabetes');
      }

      // Generate summary sentence
      let summarySentence = '';
      if (controlLevel === 'good') {
        summarySentence = `Patient demonstrates good glycemic control with HbA1c of ${a1c}%. Continue current management plan and regular monitoring.`;
      } else if (controlLevel === 'moderate') {
        summarySentence = `Moderate glycemic control with HbA1c of ${a1c}%. Consider intensifying management to achieve better glucose targets.`;
      } else {
        summarySentence = `Poor glycemic control with HbA1c of ${a1c}%. Immediate review of diabetes management strategy recommended.`;
      }

      // Recommend focus areas
      const recommendedFocusAreas: string[] = [];
      
      if (controlLevel !== 'good') {
        recommendedFocusAreas.push('Improve glycemic control through medication optimization');
      }
      
      if (fastingGlucose && fastingGlucose > 130) {
        recommendedFocusAreas.push('Address morning fasting glucose levels');
      }
      
      if (bmi && bmi > 25) {
        recommendedFocusAreas.push('Implement lifestyle modifications including weight management');
      }
      
      if (postprandialGlucose && postprandialGlucose > 180) {
        recommendedFocusAreas.push('Improve meal-time glucose control and carbohydrate counting');
      }
      
      if (!profileData.typical_daily_insulin_units) {
        recommendedFocusAreas.push('Review and document current insulin regimen');
      }

      if (recommendedFocusAreas.length === 0) {
        recommendedFocusAreas.push('Maintain current diabetes management plan');
        recommendedFocusAreas.push('Schedule regular follow-up appointments');
      }

      // Limit to 4 recommendations
      const limitedFocusAreas = recommendedFocusAreas.slice(0, 4);

      const summary = {
        control_level: controlLevel,
        risk_level: riskLevel,
        key_risks: keyRisks.slice(0, 5),
        summary_sentence: summarySentence,
        recommended_focus_areas: limitedFocusAreas,
        analysis_date: new Date().toISOString(),
        data_completeness: calculateDataCompleteness(profileData)
      };

      res.json(summary);
    } catch (error: any) {
      console.error('AI diabetes summary error:', error);
      res.status(500).json({ message: error.message || 'Failed to generate diabetes summary' });
    }
  });

  // Helper function to calculate BMI
  function calculateBMI(weightKg?: number, heightCm?: number): number | null {
    if (!weightKg || !heightCm) return null;
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  // Helper function to calculate data completeness percentage
  function calculateDataCompleteness(data: any): number {
    const importantFields = [
      'patient_name',
      'date_of_birth',
      'weight_kg',
      'height_cm',
      'hba1c_percent',
      'fasting_glucose_mgdl',
      'typical_daily_insulin_units'
    ];
    
    let filledFields = 0;
    for (const field of importantFields) {
      if (data[field]) {
        filledFields++;
      }
    }
    
    return Math.round((filledFields / importantFields.length) * 100);
  }

  // ==================== MEDICATION ROUTES ====================
  
  app.post('/api/medications', authWithApproval, async (req: AuthRequest, res: any) => {
    try {
      const validated = insertMedicationSchema.parse(req.body);
      const medication = await storage.createMedication(req.user!.userId, validated);
      res.status(201).json({ 
        message: 'Medication added successfully',
        medication 
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: error.message || 'Failed to add medication' });
    }
  });

  app.get('/api/medications', authWithApproval, async (req: AuthRequest, res: any) => {
    try {
      const medications = await storage.getMedicationsByUser(req.user!.userId);
      res.json({ medications });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch medications' });
    }
  });

  app.delete('/api/medications/:id', authWithApproval, async (req: AuthRequest, res: any) => {
    try {
      const success = await storage.deleteMedication(req.user!.userId, req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Medication not found' });
      }
      res.json({ message: 'Medication deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to delete medication' });
    }
  });

  // ==================== ANALYTICS ROUTES ====================

  app.get('/api/analytics/glucose-stats', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.query.userId as string || req.user!.userId;
      
      if (req.user!.role === 'patient' && userId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const healthData = await storage.getHealthDataByUser(userId, 100);
      
      if (healthData.length === 0) {
        return res.json({
          avgGlucose: 0,
          minGlucose: 0,
          maxGlucose: 0,
          timeInRange: 0,
          highReadings: 0,
          lowReadings: 0,
          variance: 0,
        });
      }

      const glucoseLevels = healthData.map(d => d.glucose);
      const avgGlucose = Math.round(glucoseLevels.reduce((a, b) => a + b, 0) / glucoseLevels.length);
      const minGlucose = Math.min(...glucoseLevels);
      const maxGlucose = Math.max(...glucoseLevels);
      const timeInRange = healthData.filter(d => d.glucose >= 70 && d.glucose <= 180).length;
      const highReadings = healthData.filter(d => d.glucose > 180).length;
      const lowReadings = healthData.filter(d => d.glucose < 70).length;
      
      const variance = Math.round(
        glucoseLevels.reduce((sum, g) => sum + Math.pow(g - avgGlucose, 2), 0) / glucoseLevels.length
      );

      res.json({
        avgGlucose,
        minGlucose,
        maxGlucose,
        timeInRange: Math.round((timeInRange / healthData.length) * 100),
        highReadings,
        lowReadings,
        variance,
        totalReadings: healthData.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to calculate statistics' });
    }
  });

  app.get('/api/analytics/meal-summary', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.query.userId as string || req.user!.userId;
      
      if (req.user!.role === 'patient' && userId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const meals = await storage.getMealsByUser(userId, 100);
      
      if (meals.length === 0) {
        return res.json({
          avgDailyCarbs: 0,
          totalMealsLogged: 0,
          voiceLogged: 0,
          avgCarbs: 0,
          avgProtein: 0,
          avgFat: 0,
        });
      }

      const avgCarbs = Math.round(meals.reduce((sum, m) => sum + m.carbs, 0) / meals.length);
      const avgProtein = Math.round(meals.filter(m => m.protein).reduce((sum, m) => sum + (m.protein || 0), 0) / meals.length);
      const avgFat = Math.round(meals.filter(m => m.fat).reduce((sum, m) => sum + (m.fat || 0), 0) / meals.length);
      const voiceLogged = meals.filter(m => m.voiceRecorded).length;

      res.json({
        totalMealsLogged: meals.length,
        voiceLogged,
        avgCarbs,
        avgProtein,
        avgFat,
        avgDailyCarbs: Math.round(avgCarbs * 3),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to calculate meal summary' });
    }
  });

  // ==================== HEALTH INSIGHTS ====================

  app.get('/api/insights/recommendations', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const healthData = await storage.getHealthDataByUser(userId, 30);
      const meals = await storage.getMealsByUser(userId, 30);
      const profile = await storage.getUserProfile(userId);

      const recommendations: string[] = [];

      if (healthData.length > 0) {
        const lowReadings = healthData.filter(d => d.glucose < 70).length;
        const highReadings = healthData.filter(d => d.glucose > 180).length;
        const avgGlucose = Math.round(healthData.reduce((sum, d) => sum + d.glucose, 0) / healthData.length);

        if (lowReadings > 0) {
          recommendations.push('You have had several low glucose readings. Consider increasing carb intake or reducing insulin dose.');
        }
        if (highReadings > 0) {
          recommendations.push('You have had several high glucose readings. Consider reducing carb intake or increasing insulin dose.');
        }
        if (avgGlucose > 150) {
          recommendations.push('Your average glucose is above target. Consult your doctor about adjusting your medication.');
        }
      }

      if (meals.length === 0 && healthData.length > 0) {
        recommendations.push('Consider logging your meals to help predict insulin needs more accurately.');
      }

      if (!profile || !profile.weight) {
        recommendations.push('Complete your health profile for more personalized recommendations.');
      }

      if (recommendations.length === 0) {
        recommendations.push('Great job maintaining good glucose control! Keep up the excellent work.');
      }

      res.json({ recommendations });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to generate recommendations' });
    }
  });

  // ==================== CONVERSATION ROUTES ====================

  app.get('/api/conversations', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.userId;
      const conversations = await storage.getConversations(userId);
      res.json({ data: conversations });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch conversations' });
    }
  });

  app.get('/api/conversations/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      res.json({ data: conversation });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch conversation' });
    }
  });

  app.get('/api/conversations/:id/messages', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before as string;
      const messages = await storage.getMessages(req.params.id, limit, before);
      res.json({ data: messages });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch messages' });
    }
  });

  app.post('/api/conversations/:doctorId', authMiddleware, roleMiddleware('patient'), async (req: AuthRequest, res) => {
    try {
      const patientId = req.user!.userId;
      const doctorId = req.params.doctorId;
      const conversation = await storage.createConversation(patientId, doctorId);
      res.status(201).json({ data: conversation });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to create conversation' });
    }
  });

  // ==================== MESSAGE ROUTES ====================

  app.post('/api/messages', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { conversationId, text, attachments, type } = req.body;
      const fromUserId = req.user!.userId;

      if (!conversationId || !text) {
        return res.status(400).json({ message: 'conversationId and text are required' });
      }

      // Get conversation to find recipient
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      const toUserId = conversation.participants.find((p: any) => p.userId !== fromUserId)?.userId;
      const message = await storage.createMessage(conversationId, fromUserId, toUserId, text, type || 'chat', attachments);

      res.status(201).json({ data: message });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to create message' });
    }
  });

  app.patch('/api/messages/:id/read', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const message = await storage.markMessageAsRead(req.params.id);
      res.json({ data: message });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to mark message as read' });
    }
  });

  // ==================== REPORT ROUTES ====================

  app.post('/api/upload-report', authMiddleware, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const patientId = req.user!.userId;
      const doctorId = req.body.doctorId || null;
      // For Railway deployment, we store file metadata but not the actual file
      // In a production environment, you would integrate with a storage service like AWS S3
      const fileUrl = `memory://${req.file.buffer.length}-bytes`; // Placeholder for Railway
      const fileName = req.file.originalname;

      const report = await storage.createReport(patientId, fileUrl, fileName, doctorId);

      // If doctorId provided, create a message in conversation
      if (doctorId) {
        const conversation = await storage.createConversation(patientId, doctorId);
        await storage.createMessage(
          conversation._id,
          patientId,
          doctorId,
          `Uploaded report: ${fileName}`,
          'report_shared',
          [{ reportId: report._id, fileName, fileUrl }]
        );
      }

      res.status(201).json({ message: 'Report uploaded successfully', data: report });
    } catch (error: any) {
      res.status(400).json({ message: error.message || 'Failed to upload report' });
    }
  });

  app.get('/api/reports/patient', authMiddleware, roleMiddleware('patient'), async (req: AuthRequest, res) => {
    try {
      const patientId = req.user!.userId;
      const reports = await storage.getReportsByPatient(patientId);
      res.json({ data: reports });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch reports' });
    }
  });

  app.get('/api/reports/doctor', authMiddleware, roleMiddleware('doctor'), async (req: AuthRequest, res) => {
    try {
      const doctorId = req.user!.userId;
      const reports = await storage.getReportsByDoctor(doctorId);
      res.json({ data: reports });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch reports' });
    }
  });

  app.get('/api/reports/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const report = await storage.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }
      res.json({ data: report });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch report' });
    }
  });

  app.patch('/api/reports/:id/review', authMiddleware, roleMiddleware('doctor'), async (req: AuthRequest, res) => {
    try {
      const { reviewStatus } = req.body;
      if (!reviewStatus) {
        return res.status(400).json({ message: 'reviewStatus is required' });
      }

      const report = await storage.updateReportReviewStatus(req.params.id, reviewStatus, req.user!.userId);
      res.json({ data: report });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update report' });
    }
  });

  app.patch('/api/reports/:id/ai-summary', authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { aiSummary, extractedData } = req.body;
      const report = await storage.updateReportAiSummary(req.params.id, aiSummary, extractedData);
      res.json({ data: report });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to update report summary' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
