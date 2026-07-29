import { z } from 'zod';

// ========================================================
// 1. SaaS Core Domain Enums & Types
// ========================================================
export type AppRole = 'user' | 'admin' | 'super_admin';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'blocked' | 'paused' | 'cancelled';
export type SubscriptionPlanType = 'trial' | 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
export type BillingActionType = 'started' | 'renewed' | 'extended' | 'paused' | 'resumed' | 'cancelled' | 'expired' | 'revoked';

// ========================================================
// 2. Data Models (DTOs & Database Entities)
// ========================================================

export interface UserProfileDTO {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  subscriptionStatus: SubscriptionStatus;
  trialStartDate: string;
  trialEndDate: string;
  deviceId?: string | null;
  lastLoginIp?: string | null;
  isEmailVerified: boolean;
  dailyCalorieGoal: number;
  dailyProteinGoalG: number;
  dailyCarbsGoalG: number;
  dailyFatGoalG: number;
  dailySugarLimitG: number;
  telegramChatId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface SubscriptionDTO {
  id: string;
  userId: string;
  planType: SubscriptionPlanType;
  status: SubscriptionStatus;
  startsAt: string;
  endsAt: string;
  autoRenew: boolean;
  adminNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionHistoryDTO {
  id: string;
  userId: string;
  subscriptionId?: string | null;
  actionType: BillingActionType;
  planType: SubscriptionPlanType;
  daysAdded: number;
  amountPaid: number;
  currency: string;
  processedByAdminId?: string | null;
  reason: string;
  createdAt: string;
}

export interface DeviceFingerprintDTO {
  id: string;
  deviceId: string;
  userId: string;
  ipAddress: string;
  userAgent?: string | null;
  createdAt: string;
}

export interface IPRateLimitDTO {
  id: string;
  ipAddress: string;
  registrationCount: number;
  firstSeenAt: string;
  lastRegistrationAt: string;
}

// Standardized API Response Contract
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// ========================================================
// 3. Strict Zod Input Validation Schemas
// ========================================================

export const AuthRegisterSchema = z.object({
  email: z.string().email('عنوان البريد الإلكتروني غير صالح').max(255),
  password: z.string().min(6, 'كلمة المرور يجب أن لا تقل عن 6 أحرف'),
  fullName: z.string().min(2, 'الاسم الكامل مطلوب'),
  deviceId: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const AdminExtendSubscriptionSchema = z.object({
  targetUserId: z.string().uuid(),
  extraDays: z.number().int().min(1).max(365),
  reason: z.string().min(3, 'سبب التمديد مطلوب لتوثيق سجل الإدارة'),
});

export const AdminActivateSubscriptionSchema = z.object({
  targetUserId: z.string().uuid(),
  planType: z.enum(['monthly', 'quarterly', 'yearly', 'lifetime']),
  durationDays: z.number().int().min(1).max(3650),
  amountPaid: z.number().min(0),
  reason: z.string().min(3, 'سبب التفعيل مطلوب'),
});

export const AdminBlockUserSchema = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().min(3, 'سبب الحظر مطلوب لتوثيق الأمان'),
});
