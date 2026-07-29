import { z } from 'zod';

// Re-export all Phase 1 SaaS Domain Types & Schemas
export * from './saas';

// ========================================================
// 1. Edamam Nutrition Analysis API Interfaces
// ========================================================
export interface EdamamNutrientInfo {
  label: string;
  quantity: number;
  unit: string;
}

export interface EdamamTotalNutrients {
  ENERC_KCAL?: EdamamNutrientInfo;
  PROCNT?: EdamamNutrientInfo;
  FAT?: EdamamNutrientInfo;
  CHOCDF?: EdamamNutrientInfo;
  FIBTG?: EdamamNutrientInfo;
  SUGAR?: EdamamNutrientInfo;
}

export interface EdamamParsedIngredient {
  text?: string;
  weight?: number;
  foodId?: string;
  food?: string;
  foodMatch?: string;
  retainedWeight?: number;
  nutrients?: {
    ENERC_KCAL?: { quantity?: number };
    PROCNT?: { quantity?: number };
    FAT?: { quantity?: number };
    CHOCDF?: { quantity?: number };
    SUGAR?: { quantity?: number };
  };
}

export interface EdamamIngredientItem {
  parsed?: EdamamParsedIngredient[];
}

export interface EdamamNutritionResponse {
  uri?: string;
  calories: number;
  totalWeight: number;
  dietLabels?: string[];
  healthLabels?: string[];
  cautions?: string[];
  totalNutrients: EdamamTotalNutrients;
  ingredients?: EdamamIngredientItem[];
}

// Alias for legacy service compatibility
export type EdamamResponse = EdamamNutritionResponse;

// ========================================================
// 2. User Profile & SaaS Fitness Goals Interfaces
// ========================================================
export interface UserProfile {
  id: string;
  fullName: string;
  email?: string;
  role?: 'user' | 'admin' | 'super_admin';
  accountStatus?: 'trial' | 'active' | 'expired' | 'blocked' | 'paused' | 'cancelled';
  dailyCalorieGoal: number;
  dailyProteinGoalG: number;
  dailyCarbsGoalG: number;
  dailyFatGoalG: number;
  dailySugarLimitG: number;
  telegramChatId?: number | null;
  trialEndDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ========================================================
// 3. Meal Logs & Items Interfaces
// ========================================================
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type MealSource = 'web' | 'telegram';

export interface ProcessedMealItem {
  nameAr: string;
  nameEn: string;
  servingSizeG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  customMealId?: string;
}

export interface ProcessedMealResult {
  mealLogId: string;
  userId: string;
  loggedAt: string;
  mealType: MealType;
  source: MealSource;
  rawInputAr: string;
  normalizedInputAr: string;
  translatedInputEn: string;
  rawApiResponse?: Record<string, unknown> | null;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalSugarG: number;
  items: ProcessedMealItem[];
  isLocalMatch?: boolean;
}

export interface CustomMeal {
  id: string;
  userId: string;
  nameAr: string;
  normalizedNameAr: string;
  servingSizeG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ParseMealInput {
  userId: string;
  rawInputAr: string;
  mealType: MealType;
  source: MealSource;
  loggedAt?: string;
}

export const ParseMealInputSchema = z.object({
  userId: z.string().uuid(),
  rawInputAr: z.string().min(1),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']),
  source: z.enum(['web', 'telegram']),
  loggedAt: z.string().optional(),
});

// ========================================================
// 4. Telegram Webhook Types & Zod Validation Schemas
// ========================================================
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramWebhookUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export const TelegramWebhookSchema = z.object({
  update_id: z.number(),
  message: z
    .object({
      message_id: z.number(),
      chat: z.object({
        id: z.number(),
        type: z.string(),
      }),
      date: z.number(),
      text: z.string().optional(),
    })
    .optional(),
});
