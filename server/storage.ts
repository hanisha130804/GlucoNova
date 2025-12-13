import {  type User,
  type InsertUser,
  type HealthData,
  type InsertHealthData,
  type Meal,
  type InsertMeal,
  type MedicalReport,
  type InsertMedicalReport,
  type Prediction,
  type InsertPrediction,
  type UserProfile,
  type InsertUserProfile,
  type Medication,
  type InsertMedication,
  type AIFoodLog,
  type InsertAIFoodLog,
  users,
  healthData,
  meals,
  medicalReports,
  predictions,
  userProfiles,
  medications,
  aiFoodLogs,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import mongoose from "mongoose";
import { MessageModel } from "./models/Message";
import { ConversationModel } from "./models/Conversation";
import { ReportModel } from "./models/Report";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUserApproval(id: string, isApproved: boolean): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  
  // Health data operations
  createHealthData(userId: string, data: InsertHealthData): Promise<HealthData>;
  getHealthDataByUser(userId: string, limit?: number): Promise<HealthData[]>;
  getLatestHealthData(userId: string): Promise<HealthData | null>;
  
  // Meal operations
  createMeal(userId: string, meal: InsertMeal): Promise<Meal>;
  getMealsByUser(userId: string, limit?: number): Promise<Meal[]>;
  
  // Medical report operations
  getMedicalReportsByPatient(patientId: string): Promise<MedicalReport[]>;
  getMedicalReportById(reportId: string): Promise<MedicalReport | null>;
  createMedicalReport(patientId: string, uploaderId: string, report: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    description?: string;
  }): Promise<MedicalReport>;
  
  // Prediction operations
  createPrediction(userId: string, prediction: InsertPrediction): Promise<Prediction>;
  getPredictionsByUser(userId: string, limit?: number): Promise<Prediction[]>;
  getLatestPrediction(userId: string): Promise<Prediction | null>;
  
  // User profile operations
  createUserProfile(userId: string, profile: InsertUserProfile): Promise<UserProfile>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  updateUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | null>;
  
  // Medication operations
  createMedication(userId: string, medication: InsertMedication): Promise<Medication>;
  getMedicationsByUser(userId: string): Promise<Medication[]>;
  deleteMedication(userId: string, medicationId: string): Promise<boolean>;

  // AI Food Log operations
  createAIFoodLog(userId: string, foodLog: InsertAIFoodLog): Promise<AIFoodLog>;
  getAIFoodLogs(userId: string, limit?: number): Promise<AIFoodLog[]>;

  // Conversation operations
  getConversations(userId: string): Promise<any[]>;
  getConversation(conversationId: string): Promise<any | null>;
  createConversation(patientId: string, doctorId: string): Promise<any>;

  // Message operations
  getMessages(conversationId: string, limit?: number, before?: string): Promise<any[]>;
  createMessage(conversationId: string, fromUserId: string, toUserId: string, text: string, type?: string, attachments?: any[]): Promise<any>;
  markMessageAsRead(messageId: string): Promise<any | null>;

  // Report operations
  createReport(patientId: string, fileUrl: string, fileName: string, doctorId?: string): Promise<any>;
  getReportsByPatient(patientId: string): Promise<any[]>;
  getReportsByDoctor(doctorId: string): Promise<any[]>;
  getReportById(reportId: string): Promise<any | null>;
  updateReportReviewStatus(reportId: string, reviewStatus: string, reviewedBy: string): Promise<any | null>;
  updateReportAiSummary(reportId: string, aiSummary: string, extractedData?: any): Promise<any | null>;
}

// Helper function to coerce nullable values
function toNumber(val: number | null): number | undefined {
  return val === null ? undefined : val;
}

export class DrizzleStorage implements IStorage {
  // ==================== USER OPERATIONS ====================
  
  async getUser(id: string): Promise<User | null> {
    const userId = parseInt(id);
    if (isNaN(userId)) return null;
    
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (result.length === 0) return null;
    
    const user = result[0];
    return {
      _id: user.id.toString(),
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (result.length === 0) return null;
    
    const user = result[0];
    return {
      _id: user.id.toString(),
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const isApproved = true;
    
    const result = await db.insert(users).values({
      ...insertUser,
      isApproved,
    }).returning();
    
    const user = result[0];
    return {
      _id: user.id.toString(),
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUserApproval(id: string, isApproved: boolean): Promise<User | null> {
    const userId = parseInt(id);
    if (isNaN(userId)) return null;
    
    const result = await db.update(users)
      .set({ isApproved, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) return null;
    
    const user = result[0];
    return {
      _id: user.id.toString(),
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    
    return result.map((user: any) => ({
      _id: user.id.toString(),
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  // ==================== HEALTH DATA OPERATIONS ====================
  
  async createHealthData(userId: string, data: InsertHealthData): Promise<HealthData> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) throw new Error('Invalid user ID');
    
    const result = await db.insert(healthData).values({
      userId: userIdNum,
      glucose: Math.round(data.glucose),
      insulin: Math.round(data.insulin),
      carbs: Math.round(data.carbs),
      activityLevel: data.activityLevel,
      notes: data.notes,
    }).returning();
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      userId: userId,
      glucose: record.glucose,
      insulin: record.insulin,
      carbs: record.carbs,
      activityLevel: record.activityLevel || undefined,
      notes: record.notes || undefined,
      timestamp: record.timestamp,
    };
  }

  async getHealthDataByUser(userId: string, limit: number = 50): Promise<HealthData[]> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) return [];
    
    const result = await db.select()
      .from(healthData)
      .where(eq(healthData.userId, userIdNum))
      .orderBy(desc(healthData.timestamp))
      .limit(limit);
    
    return result.map((record: any) => ({
      _id: record.id.toString(),
      userId: userId,
      glucose: record.glucose,
      insulin: record.insulin,
      carbs: record.carbs,
      activityLevel: record.activityLevel || undefined,
      notes: record.notes || undefined,
      timestamp: record.timestamp,
    }));
  }

  async getLatestHealthData(userId: string): Promise<HealthData | null> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) return null;
    
    const result = await db.select()
      .from(healthData)
      .where(eq(healthData.userId, userIdNum))
      .orderBy(desc(healthData.timestamp))
      .limit(1);
    
    if (result.length === 0) return null;
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      userId: userId,
      glucose: record.glucose,
      insulin: record.insulin,
      carbs: record.carbs,
      activityLevel: record.activityLevel || undefined,
      notes: record.notes || undefined,
      timestamp: record.timestamp,
    };
  }

  // ==================== MEAL OPERATIONS ====================
  
  async createMeal(userId: string, meal: InsertMeal): Promise<Meal> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) throw new Error('Invalid user ID');
    
    const result = await db.insert(meals).values({
      userId: userIdNum,
      name: meal.name,
      carbs: Math.round(meal.carbs),
      protein: meal.protein == null ? null : Math.round(meal.protein),
      fat: meal.fat == null ? null : Math.round(meal.fat),
      calories: meal.calories ?? null,
      voiceRecorded: meal.voiceRecorded,
    }).returning();
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      userId: userId,
      name: record.name,
      carbs: record.carbs,
      protein: record.protein ?? undefined,
      fat: record.fat ?? undefined,
      calories: record.calories ?? undefined,
      voiceRecorded: record.voiceRecorded,
      timestamp: record.timestamp,
    };
  }

  async getMealsByUser(userId: string, limit: number = 50): Promise<Meal[]> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) return [];
    
    const result = await db.select()
      .from(meals)
      .where(eq(meals.userId, userIdNum))
      .orderBy(desc(meals.timestamp))
      .limit(limit);
    
    return result.map((record: any) => ({
      _id: record.id.toString(),
      userId: userId,
      name: record.name,
      carbs: record.carbs,
      protein: record.protein ?? undefined,
      fat: record.fat ?? undefined,
      calories: record.calories ?? undefined,
      voiceRecorded: record.voiceRecorded,
      timestamp: record.timestamp,
    }));
  }

  // ==================== MEDICAL REPORT OPERATIONS ====================
  
  async getMedicalReportsByPatient(patientId: string): Promise<MedicalReport[]> {
    const patientIdNum = parseInt(patientId);
    if (isNaN(patientIdNum)) return [];
    
    const result = await db.select()
      .from(medicalReports)
      .where(eq(medicalReports.patientId, patientIdNum))
      .orderBy(desc(medicalReports.uploadedAt));
    
    return result.map((record: any) => ({
      _id: record.id.toString(),
      patientId: record.patientId.toString(),
      fileName: record.fileName,
      fileUrl: record.fileUrl,
      fileType: record.fileType,
      fileSize: record.fileSize,
      uploadedBy: record.uploadedBy.toString(),
      description: record.description || undefined,
      uploadedAt: record.uploadedAt,
    }));
  }

  async getMedicalReportById(reportId: string): Promise<MedicalReport | null> {
    const reportIdNum = parseInt(reportId);
    if (isNaN(reportIdNum)) return null;
    
    const result = await db.select()
      .from(medicalReports)
      .where(eq(medicalReports.id, reportIdNum))
      .limit(1);
    
    if (result.length === 0) return null;
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      patientId: record.patientId.toString(),
      fileName: record.fileName,
      fileUrl: record.fileUrl,
      fileType: record.fileType,
      fileSize: record.fileSize,
      uploadedBy: record.uploadedBy.toString(),
      description: record.description || undefined,
      uploadedAt: record.uploadedAt,
    };
  }

  async createMedicalReport(patientId: string, uploaderId: string, report: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    description?: string;
  }): Promise<MedicalReport> {
    // Handle skip-auth users (temporary IDs during onboarding)
    let patientIdNum: number;
    let uploaderIdNum: number;
    
    if (patientId.startsWith('skip-auth-')) {
      // Use temporary ID 0 for skip-auth users
      patientIdNum = 0;
      console.log('⚠️ Skip-auth patient ID detected:', patientId);
    } else {
      patientIdNum = parseInt(patientId);
      if (isNaN(patientIdNum)) {
        throw new Error('Invalid patient ID format');
      }
    }
    
    if (uploaderId.startsWith('skip-auth-')) {
      uploaderIdNum = 0;
      console.log('⚠️ Skip-auth uploader ID detected:', uploaderId);
    } else {
      uploaderIdNum = parseInt(uploaderId);
      if (isNaN(uploaderIdNum)) {
        throw new Error('Invalid uploader ID format');
      }
    }
    
    const result = await db.insert(medicalReports).values({
      patientId: patientIdNum,
      fileName: report.fileName,
      fileUrl: report.fileUrl,
      fileType: report.fileType,
      fileSize: report.fileSize,
      uploadedBy: uploaderIdNum,
      description: report.description,
    }).returning();
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      patientId: record.patientId.toString(),
      fileName: record.fileName,
      fileUrl: record.fileUrl,
      fileType: record.fileType,
      fileSize: record.fileSize,
      uploadedBy: record.uploadedBy.toString(),
      description: record.description || undefined,
      uploadedAt: record.uploadedAt,
    };
  }

  // ==================== PREDICTION OPERATIONS ====================
  
  async createPrediction(userId: string, prediction: InsertPrediction): Promise<Prediction> {
    // For skip-auth users, return a temporary prediction object without persisting to DB
    if (userId.startsWith('skip-auth-')) {
      console.log('Creating temporary prediction for skip-auth user:', userId);
      return {
        _id: `temp-${Date.now()}`,
        userId: userId,
        predictedInsulin: Math.round(prediction.predictedInsulin),
        confidence: Math.round(prediction.confidence * 100) / 100,
        factors: prediction.factors,
        timestamp: new Date().toISOString(),
      };
    }
    
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) throw new Error('Invalid user ID');
    
    const result = await db.insert(predictions).values({
      userId: userIdNum,
      predictedInsulin: Math.round(prediction.predictedInsulin),
      confidence: Math.round(prediction.confidence * 100),
      factors: prediction.factors,
    }).returning();
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      userId: userId,
      predictedInsulin: record.predictedInsulin,
      confidence: record.confidence / 100,
      factors: record.factors,
      timestamp: record.timestamp,
    };
  }

  async getPredictionsByUser(userId: string, limit: number = 50): Promise<Prediction[]> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) return [];
    
    const result = await db.select()
      .from(predictions)
      .where(eq(predictions.userId, userIdNum))
      .orderBy(desc(predictions.timestamp))
      .limit(limit);
    
    return result.map((record: any) => ({
      _id: record.id.toString(),
      userId: userId,
      predictedInsulin: record.predictedInsulin,
      confidence: record.confidence / 100,
      factors: record.factors,
      timestamp: record.timestamp,
    }));
  }

  async getLatestPrediction(userId: string): Promise<Prediction | null> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) return null;
    
    const result = await db.select()
      .from(predictions)
      .where(eq(predictions.userId, userIdNum))
      .orderBy(desc(predictions.timestamp))
      .limit(1);
    
    if (result.length === 0) return null;
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      userId: userId,
      predictedInsulin: record.predictedInsulin,
      confidence: record.confidence / 100,
      factors: record.factors,
      timestamp: record.timestamp,
    };
  }

  // User Profile Methods
  async createUserProfile(userId: string, profile: InsertUserProfile): Promise<UserProfile> {
    // For skip-auth users, return a temporary profile object without persisting to DB
    if (userId.startsWith('skip-auth-')) {
      console.log('Creating temporary profile for skip-auth user:', userId);
      return {
        _id: `temp-${Date.now()}`,
        userId: userId,
        dateOfBirth: profile.dateOfBirth,
        weight: profile.weight,
        height: profile.height,
        lastA1c: profile.lastA1c,
        medications: profile.medications ? profile.medications.join('; ') : undefined,
        typicalInsulin: profile.typicalInsulin,
        targetRange: profile.targetRange,
        diabetesType: profile.diabetesType,
        icr: profile.icr,
        isf: profile.isf,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) throw new Error('Invalid user ID');
    
    const result = await db.insert(userProfiles).values({
      userId: userIdNum,
      dateOfBirth: profile.dateOfBirth || null,
      weight: profile.weight?.toString() || null,
      height: profile.height?.toString() || null,
      lastA1c: profile.lastA1c?.toString() || null,
      medications: profile.medications ? profile.medications.join('; ') : null,
      typicalInsulin: profile.typicalInsulin?.toString() || null,
      targetRange: profile.targetRange || null,
      diabetesType: profile.diabetesType || null,
      icr: profile.icr?.toString() || null,
      isf: profile.isf?.toString() || null,
    }).returning();
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      userId: userId,
      dateOfBirth: record.dateOfBirth || undefined,
      weight: record.weight ? parseFloat(record.weight) : undefined,
      height: record.height ? parseFloat(record.height) : undefined,
      lastA1c: record.lastA1c ? parseFloat(record.lastA1c) : undefined,
      medications: record.medications ? record.medications.split('; ').filter(m => m.trim() !== '') : undefined,
      typicalInsulin: record.typicalInsulin ? parseFloat(record.typicalInsulin) : undefined,
      targetRange: record.targetRange || undefined,
      diabetesType: record.diabetesType || undefined,
      icr: record.icr ? parseFloat(record.icr) : undefined,
      isf: record.isf ? parseFloat(record.isf) : undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Handle skip-auth users (return null to allow creation)
    if (userId.startsWith('skip-auth-')) {
      return null; // No existing profile for skip-auth session
    }
    
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) return null;
    
    const result = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userIdNum))
      .limit(1);
    
    if (result.length === 0) return null;
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      userId: userId,
      dateOfBirth: record.dateOfBirth || undefined,
      weight: record.weight ? parseFloat(record.weight) : undefined,
      height: record.height ? parseFloat(record.height) : undefined,
      lastA1c: record.lastA1c ? parseFloat(record.lastA1c) : undefined,
      medications: record.medications ? record.medications.split('; ').filter(m => m.trim() !== '') : undefined,
      typicalInsulin: record.typicalInsulin ? parseFloat(record.typicalInsulin) : undefined,
      targetRange: record.targetRange || undefined,
      diabetesType: record.diabetesType || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async updateUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | null> {
    // For skip-auth users, return updated temporary profile without persisting to DB
    if (userId.startsWith('skip-auth-')) {
      console.log('Updating temporary profile for skip-auth user:', userId);
      return {
        _id: `temp-${Date.now()}`,
        userId: userId,
        dateOfBirth: profile.dateOfBirth,
        weight: profile.weight,
        height: profile.height,
        lastA1c: profile.lastA1c,
        medications: profile.medications ? profile.medications.join('; ') : undefined,
        typicalInsulin: profile.typicalInsulin,
        targetRange: profile.targetRange,
        diabetesType: profile.diabetesType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) return null;
    
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (profile.dateOfBirth !== undefined) updateData.dateOfBirth = profile.dateOfBirth || null;
    if (profile.weight !== undefined) updateData.weight = profile.weight !== null && profile.weight !== undefined ? profile.weight.toString() : null;
    if (profile.height !== undefined) updateData.height = profile.height !== null && profile.height !== undefined ? profile.height.toString() : null;
    if (profile.lastA1c !== undefined) updateData.lastA1c = profile.lastA1c !== null && profile.lastA1c !== undefined ? profile.lastA1c.toString() : null;
    if (profile.medications !== undefined) updateData.medications = profile.medications ? profile.medications.join('; ') : null;
    if (profile.typicalInsulin !== undefined) updateData.typicalInsulin = profile.typicalInsulin !== null && profile.typicalInsulin !== undefined ? profile.typicalInsulin.toString() : null;
    if (profile.targetRange !== undefined) updateData.targetRange = profile.targetRange || null;
    if (profile.diabetesType !== undefined) updateData.diabetesType = profile.diabetesType || null;
    if (profile.icr !== undefined) updateData.icr = profile.icr !== null && profile.icr !== undefined ? profile.icr.toString() : null;
    if (profile.isf !== undefined) updateData.isf = profile.isf !== null && profile.isf !== undefined ? profile.isf.toString() : null;
    
    const result = await db.update(userProfiles)
      .set(updateData)
      .where(eq(userProfiles.userId, userIdNum))
      .returning();
    
    if (result.length === 0) return null;
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      userId: userId,
      dateOfBirth: record.dateOfBirth || undefined,
      weight: record.weight ? parseFloat(record.weight) : undefined,
      height: record.height ? parseFloat(record.height) : undefined,
      lastA1c: record.lastA1c ? parseFloat(record.lastA1c) : undefined,
      medications: record.medications ? record.medications.split('; ').filter(m => m.trim() !== '') : undefined,
      typicalInsulin: record.typicalInsulin ? parseFloat(record.typicalInsulin) : undefined,
      targetRange: record.targetRange || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  // Medication Methods
  async createMedication(userId: string, medication: InsertMedication): Promise<Medication> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) throw new Error('Invalid user ID');
    
    const result = await db.insert(medications).values({
      userId: userIdNum,
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      timing: medication.timing || null,
      category: medication.category || null,
    }).returning();
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      userId: userId,
      name: record.name,
      dosage: record.dosage,
      frequency: record.frequency,
      timing: record.timing || undefined,
      category: record.category || undefined,
      createdAt: record.createdAt,
    };
  }

  async getMedicationsByUser(userId: string): Promise<Medication[]> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) return [];
    
    const result = await db.select()
      .from(medications)
      .where(eq(medications.userId, userIdNum))
      .orderBy(desc(medications.createdAt));
    
    return result.map((record: any) => ({
      _id: record.id.toString(),
      userId: userId,
      name: record.name,
      dosage: record.dosage,
      frequency: record.frequency,
      timing: record.timing || undefined,
      category: record.category || undefined,
      createdAt: record.createdAt,
    }));
  }

  async deleteMedication(userId: string, medicationId: string): Promise<boolean> {
    const userIdNum = parseInt(userId);
    const medIdNum = parseInt(medicationId);
    
    if (isNaN(userIdNum) || isNaN(medIdNum)) return false;
    
    const result = await db.delete(medications)
      .where(eq(medications.id, medIdNum))
      .returning();
    
    return result.length > 0;
  }

  // ==================== AI FOOD LOG OPERATIONS ====================

  async createAIFoodLog(userId: string, foodLog: InsertAIFoodLog): Promise<AIFoodLog> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) throw new Error('Invalid user ID');
    
    const result = await db.insert(aiFoodLogs).values({
      userId: userIdNum,
      ...foodLog,
    }).returning();
    
    const record = result[0];
    return {
      _id: record.id.toString(),
      userId: userId,
      description: record.description,
      mealName: record.mealName,
      items: record.items || [],
      totals: record.totals || {},
      suggestions: record.suggestions || undefined,
      healthBenefits: record.healthBenefits || undefined,
      alternatives: record.alternatives || undefined,
      timestamp: record.timestamp,
    };
  }

  async getAIFoodLogs(userId: string, limit: number = 20): Promise<AIFoodLog[]> {
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) return [];
    
    const result = await db.select()
      .from(aiFoodLogs)
      .where(eq(aiFoodLogs.userId, userIdNum))
      .orderBy(desc(aiFoodLogs.timestamp))
      .limit(limit);
    
    return result.map((record: any) => ({
      _id: record.id.toString(),
      userId: userId,
      description: record.description,
      mealName: record.mealName,
      items: record.items || [],
      totals: record.totals || {},
      suggestions: record.suggestions || undefined,
      healthBenefits: record.healthBenefits || undefined,
      alternatives: record.alternatives || undefined,
      timestamp: record.timestamp,
    }));
  }

  // ==================== CONVERSATION OPERATIONS ====================

  async getConversations(userId: string): Promise<any[]> {
    try {
      const conversations = await ConversationModel.find({
        'participants.userId': userId,
      }).populate('lastMessage').sort({ lastUpdatedAt: -1 });
      return conversations || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getConversation(conversationId: string): Promise<any | null> {
    try {
      return await ConversationModel.findById(conversationId).populate('lastMessage');
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  async createConversation(patientId: string, doctorId: string): Promise<any> {
    try {
      // Check if conversation already exists
      let conversation = await ConversationModel.findOne({
        'participants.userId': { $all: [patientId, doctorId] },
      });

      if (conversation) {
        return conversation;
      }

      // Create new conversation
      conversation = new ConversationModel({
        participants: [
          { userId: patientId, role: 'patient' },
          { userId: doctorId, role: 'doctor' },
        ],
      });

      await conversation.save();
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // ==================== MESSAGE OPERATIONS ====================

  async getMessages(conversationId: string, limit: number = 50, before?: string): Promise<any[]> {
    try {
      const query: any = { conversationId };
      
      if (before) {
        // Add _id comparison for pagination
        query._id = { $lt: before };
      }

      const messages = await MessageModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('attachments.reportId');

      return messages.reverse();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async createMessage(
    conversationId: string,
    fromUserId: string,
    toUserId: string,
    text: string,
    type: string = 'chat',
    attachments: any[] = []
  ): Promise<any> {
    try {
      const message = new MessageModel({
        conversationId,
        fromUserId,
        toUserId,
        text,
        type,
        attachments,
        createdAt: new Date(),
      });

      await message.save();

      // Update conversation
      await ConversationModel.findByIdAndUpdate(
        conversationId,
        {
          lastMessage: message._id,
          lastMessageText: text || `[${type}]`,
          lastMessageTime: new Date(),
          lastUpdatedAt: new Date(),
          ...(type === 'chat' && fromUserId !== toUserId && { unreadCountForDoctor: 1 }),
        },
        { new: true }
      );

      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId: string): Promise<any | null> {
    try {
      return await MessageModel.findByIdAndUpdate(
        messageId,
        { readAt: new Date() },
        { new: true }
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
      return null;
    }
  }

  // ==================== REPORT OPERATIONS ====================

  async createReport(
    patientId: string,
    fileUrl: string,
    fileName: string,
    doctorId?: string
  ): Promise<any> {
    try {
      const report = new ReportModel({
        patientId,
        fileUrl,
        fileName,
        doctorId: doctorId || null,
        uploadedAt: new Date(),
      });

      await report.save();
      return report;
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  }

  async getReportsByPatient(patientId: string): Promise<any[]> {
    try {
      return await ReportModel.find({ patientId }).sort({ uploadedAt: -1 });
    } catch (error) {
      console.error('Error fetching patient reports:', error);
      return [];
    }
  }

  async getReportsByDoctor(doctorId: string): Promise<any[]> {
    try {
      return await ReportModel.find({ doctorId }).sort({ uploadedAt: -1 });
    } catch (error) {
      console.error('Error fetching doctor reports:', error);
      return [];
    }
  }

  async getReportById(reportId: string): Promise<any | null> {
    try {
      return await ReportModel.findById(reportId);
    } catch (error) {
      console.error('Error fetching report:', error);
      return null;
    }
  }

  async updateReportReviewStatus(
    reportId: string,
    reviewStatus: string,
    reviewedBy: string
  ): Promise<any | null> {
    try {
      return await ReportModel.findByIdAndUpdate(
        reportId,
        {
          reviewStatus,
          reviewedBy,
          reviewedAt: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      console.error('Error updating report status:', error);
      return null;
    }
  }

  async updateReportAiSummary(
    reportId: string,
    aiSummary: string,
    extractedData?: any
  ): Promise<any | null> {
    try {
      return await ReportModel.findByIdAndUpdate(
        reportId,
        {
          aiSummary,
          extractedData: extractedData || {},
        },
        { new: true }
      );
    } catch (error) {
      console.error('Error updating report AI summary:', error);
      return null;
    }
  }
}

// Export the storage instance
export const storage = new DrizzleStorage();
