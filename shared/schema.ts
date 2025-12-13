import { pgTable, serial, text, varchar, timestamp, boolean, integer, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoles = ['patient', 'doctor', 'admin'] as const;
export type UserRole = typeof userRoles[number];

export const activityLevels = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const;
export type ActivityLevel = typeof activityLevels[number];

// ==================== DRIZZLE TABLES ====================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).$type<UserRole>().notNull(),
  isApproved: boolean("is_approved").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const healthData = pgTable("health_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  glucose: integer("glucose").notNull(),
  insulin: integer("insulin").notNull(),
  carbs: integer("carbs").notNull(),
  activityLevel: varchar("activity_level", { length: 50 }).$type<ActivityLevel>(),
  notes: text("notes"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  carbs: integer("carbs").notNull(),
  protein: integer("protein"),
  fat: integer("fat"),
  calories: integer("calories"),
  voiceRecorded: boolean("voice_recorded").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const medicalReports = pgTable("medical_reports", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  predictedInsulin: integer("predicted_insulin").notNull(),
  confidence: integer("confidence").notNull(),
  factors: json("factors").$type<string[]>().notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  dateOfBirth: varchar("date_of_birth", { length: 50 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  height: decimal("height", { precision: 5, scale: 2 }),
  lastA1c: decimal("last_a1c", { precision: 4, scale: 2 }),
  medications: varchar("medications", { length: 500 }),
  typicalInsulin: decimal("typical_insulin", { precision: 5, scale: 2 }),
  targetRange: varchar("target_range", { length: 50 }),
  diabetesType: varchar("diabetes_type", { length: 50 }),
  icr: decimal("icr", { precision: 5, scale: 2 }), // Insulin to Carb Ratio
  isf: decimal("isf", { precision: 5, scale: 2 }), // Insulin Sensitivity Factor
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  dosage: varchar("dosage", { length: 100 }).notNull(),
  frequency: varchar("frequency", { length: 255 }).notNull(),
  timing: varchar("timing", { length: 255 }),
  category: varchar("category", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiFoodLogs = pgTable("ai_food_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  mealName: varchar("meal_name", { length: 255 }).notNull(),
  items: json("items").$type<any[]>().notNull(),
  totals: json("totals").$type<any>().notNull(),
  suggestions: json("suggestions").$type<string[]>(),
  healthBenefits: text("health_benefits"),
  alternatives: text("alternatives"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// ==================== DRIZZLE-ZOD INSERT SCHEMAS ====================

export const insertUserSchema = createInsertSchema(users, {
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(userRoles),
  isApproved: z.boolean().default(true),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const insertHealthDataSchema = createInsertSchema(healthData, {
  glucose: z.coerce.number().min(0).max(1000),
  insulin: z.coerce.number().min(0).max(200),
  carbs: z.coerce.number().min(0).max(500),
  activityLevel: z.enum(activityLevels).optional(),
  notes: z.string().optional(),
}).omit({
  id: true,
  userId: true,
  timestamp: true,
});

export const insertMealSchema = createInsertSchema(meals, {
  name: z.string().min(1, "Meal name is required"),
  carbs: z.coerce.number().min(0),
  protein: z.coerce.number().min(0).optional(),
  fat: z.coerce.number().min(0).optional(),
  calories: z.coerce.number().min(0).optional(),
  voiceRecorded: z.boolean().default(false),
}).omit({
  id: true,
  userId: true,
  timestamp: true,
});

export const insertMedicalReportSchema = createInsertSchema(medicalReports, {
  patientId: z.coerce.number(),
  description: z.string().optional(),
}).omit({
  id: true,
  fileName: true,
  fileUrl: true,
  fileType: true,
  fileSize: true,
  uploadedBy: true,
  uploadedAt: true,
});

export const insertPredictionSchema = createInsertSchema(predictions, {
  predictedInsulin: z.coerce.number().min(0),
  confidence: z.coerce.number().min(0).max(1),
  factors: z.array(z.string()),
}).omit({
  id: true,
  userId: true,
  timestamp: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles, {
  weight: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  lastA1c: z.coerce.number().positive().optional(),
  typicalInsulin: z.coerce.number().positive().optional(),
  dateOfBirth: z.string().optional(),
  medications: z.array(z.string()).optional(),
  targetRange: z.string().optional(),
  diabetesType: z.string().optional(),
  icr: z.coerce.number().positive().optional(),
  isf: z.coerce.number().positive().optional(),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedicationSchema = createInsertSchema(medications, {
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  timing: z.string().optional(),
  category: z.string().optional(),
}).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertAIFoodLogSchema = createInsertSchema(aiFoodLogs, {
  description: z.string().min(1, "Meal description is required"),
  mealName: z.string().min(1, "Meal name is required"),
  items: z.array(z.any()),
  totals: z.any(),
  suggestions: z.array(z.string()).optional(),
  healthBenefits: z.string().optional(),
  alternatives: z.string().optional(),
}).omit({
  id: true,
  userId: true,
  timestamp: true,
});

// ==================== TYPE EXPORTS ====================

// API types (with _id as string for backward compatibility)
export interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthData {
  _id: string;
  userId: string;
  glucose: number;
  insulin: number;
  carbs: number;
  activityLevel?: string;
  notes?: string;
  timestamp: Date;
}

export interface Meal {
  _id: string;
  userId: string;
  name: string;
  carbs: number;
  protein?: number;
  fat?: number;
  calories?: number;
  voiceRecorded: boolean;
  timestamp: Date;
}

export interface MedicalReport {
  _id: string;
  patientId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  description?: string;
  uploadedAt: Date;
}

export interface Prediction {
  _id: string;
  userId: string;
  predictedInsulin: number;
  confidence: number;
  factors: string[];
  timestamp: Date;
}

export interface UserProfile {
  _id: string;
  userId: string;
  dateOfBirth?: string;
  weight?: number;
  height?: number;
  lastA1c?: number;
  medications?: string;
  typicalInsulin?: number;
  targetRange?: string;
  diabetesType?: string;
  icr?: number;
  isf?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Medication {
  _id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  timing?: string;
  category?: string;
  createdAt: Date;
}

export interface AIFoodLog {
  _id: string;
  userId: string;
  description: string;
  mealName: string;
  items: any[];
  totals: any;
  suggestions?: string[];
  healthBenefits?: string;
  alternatives?: string;
  timestamp: Date;
}

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type InsertHealthData = z.infer<typeof insertHealthDataSchema>;
export type InsertMeal = z.infer<typeof insertMealSchema>;
export type InsertMedicalReport = z.infer<typeof insertMedicalReportSchema>;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type InsertAIFoodLog = z.infer<typeof insertAIFoodLogSchema>;

// Legacy schema names for backward compatibility
export const healthDataSchema = insertHealthDataSchema;
export const mealSchema = insertMealSchema;
