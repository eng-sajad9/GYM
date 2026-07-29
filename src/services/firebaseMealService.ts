/**
 * ============================================================
 * Firebase Meal Service — Firestore Implementation
 *
 * Collections used:
 *   - meal_logs/{uid}/logs/{docId}  → user's meal logs
 *   - meal_items/{logId}/items/{id} → per-log meal items
 *   - custom_meals/{uid}/meals/{id} → user's custom meals
 * ============================================================
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { normalizeArabicText } from '../utils/arabicNormalizer';
import { translateArabicToEnglishAsync, normalizeIraqiDialect } from '../utils/translator';
import { EdamamService } from './edamamService';
import {
  ParseMealInput,
  ProcessedMealResult,
  ProcessedMealItem,
  CustomMeal,
  MealType,
} from '../types';
import { MealService } from './mealService'; // Reuse static helpers (cleanFoodNameArabic, estimateArabicNutrition)

// ── Firestore paths ────────────────────────────────────────────────
const mealLogsCol = (uid: string) => collection(db, 'users', uid, 'meal_logs');
const mealLogDoc = (uid: string, logId: string) => doc(db, 'users', uid, 'meal_logs', logId);
const mealItemsCol = (uid: string, logId: string) =>
  collection(db, 'users', uid, 'meal_logs', logId, 'meal_items');
const customMealsCol = (uid: string) => collection(db, 'users', uid, 'custom_meals');
const customMealDoc = (uid: string, mealId: string) =>
  doc(db, 'users', uid, 'custom_meals', mealId);

// ── Firebase Meal Log shape (Firestore doc) ────────────────────────
export interface FirebaseMealLog {
  id: string;
  user_id: string;
  logged_at: string;
  meal_type: MealType;
  source: string;
  raw_input_ar: string;
  normalized_input_ar: string;
  translated_input_en: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_sugar_g: number;
  meal_items?: FirebaseMealItem[];
}

export interface FirebaseMealItem {
  id?: string;
  meal_log_id: string;
  name_ar: string;
  name_en: string;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  custom_meal_id?: string | null;
}

export class FirebaseMealService {
  /**
   * Process nutrition data and save meal log + items to Firestore atomically.
   */
  public static async processAndSaveMeal(input: ParseMealInput): Promise<ProcessedMealResult> {
    const { userId, rawInputAr, mealType, source, loggedAt } = input;
    const loggedTimestamp = loggedAt || new Date().toISOString();
    const normalizedInputAr = normalizeArabicText(rawInputAr);

    // Check local custom meals first
    const localMatch = await FirebaseMealService.checkCustomMealsMatch(userId, normalizedInputAr);

    let items: ProcessedMealItem[] = [];
    let rawApiResponse: Record<string, unknown> | null = null;
    let translatedInputEn = '';
    let isLocalMatch = false;

    if (localMatch) {
      isLocalMatch = true;
      translatedInputEn = `Local Custom Meal: ${localMatch.nameAr}`;
      items = [
        {
          nameAr: MealService.cleanFoodNameArabic(localMatch.nameAr),
          nameEn: localMatch.nameAr,
          servingSizeG: Number(localMatch.servingSizeG),
          calories: Number(localMatch.calories),
          proteinG: Number(localMatch.proteinG),
          carbsG: Number(localMatch.carbsG),
          fatG: Number(localMatch.fatG),
          sugarG: Number(localMatch.sugarG || 0),
          customMealId: localMatch.id,
        },
      ];
    } else {
      translatedInputEn = await translateArabicToEnglishAsync(rawInputAr);
      const apiResult = await EdamamService.fetchNutritionData(translatedInputEn);
      rawApiResponse = apiResult as unknown as Record<string, unknown>;

      if (apiResult.ingredients && apiResult.ingredients.length > 0) {
        apiResult.ingredients.forEach((ing) => {
          if (ing.parsed && ing.parsed.length > 0) {
            ing.parsed.forEach((p) => {
              const itemCal = p.nutrients?.ENERC_KCAL?.quantity || 0;
              const itemProt = p.nutrients?.PROCNT?.quantity || 0;
              const itemCarb = p.nutrients?.CHOCDF?.quantity || 0;
              const itemFat = p.nutrients?.FAT?.quantity || 0;
              const itemSugar = p.nutrients?.SUGAR?.quantity || 0;
              const itemWeight = p.weight || 100;
              const itemNameRaw = p.foodMatch || p.food || translatedInputEn;
              const cleanArabicName = MealService.cleanFoodNameArabic(itemNameRaw, itemNameRaw);

              if (itemCal > 0 || itemProt > 0 || itemCarb > 0 || itemFat > 0) {
                items.push({
                  nameAr: cleanArabicName,
                  nameEn: itemNameRaw,
                  servingSizeG: Math.round(itemWeight),
                  calories: Math.round(itemCal),
                  proteinG: Number(itemProt.toFixed(1)),
                  carbsG: Number(itemCarb.toFixed(1)),
                  fatG: Number(itemFat.toFixed(1)),
                  sugarG: Number(itemSugar.toFixed(1)),
                });
              }
            });
          }
        });
      }

      if (items.length === 0) {
        const totalCal = apiResult.calories || apiResult.totalNutrients?.ENERC_KCAL?.quantity || 0;
        const totalProt = apiResult.totalNutrients?.PROCNT?.quantity || 0;
        const totalCarb = apiResult.totalNutrients?.CHOCDF?.quantity || 0;
        const totalFatVal = apiResult.totalNutrients?.FAT?.quantity || 0;
        const totalSugarVal = apiResult.totalNutrients?.SUGAR?.quantity || 0;
        const totalWeightG = apiResult.totalWeight || 100;

        if (totalCal > 0 || totalProt > 0 || totalCarb > 0) {
          items.push({
            nameAr: MealService.cleanFoodNameArabic(rawInputAr),
            nameEn: translatedInputEn,
            servingSizeG: Math.round(totalWeightG),
            calories: Math.round(totalCal),
            proteinG: Number(totalProt.toFixed(1)),
            carbsG: Number(totalCarb.toFixed(1)),
            fatG: Number(totalFatVal.toFixed(1)),
            sugarG: Number(totalSugarVal.toFixed(1)),
          });
        }
      }

      if (items.length === 0) {
        const fallbackItems = (MealService as unknown as { estimateArabicNutrition: (t: string) => ProcessedMealItem[] })['estimateArabicNutrition'](rawInputAr);
        items = fallbackItems;
      }
    }

    const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
    const totalProteinG = Number(items.reduce((sum, item) => sum + item.proteinG, 0).toFixed(1));
    const totalCarbsG = Number(items.reduce((sum, item) => sum + item.carbsG, 0).toFixed(1));
    const totalFatG = Number(items.reduce((sum, item) => sum + item.fatG, 0).toFixed(1));
    const totalSugarG = Number(items.reduce((sum, item) => sum + item.sugarG, 0).toFixed(1));

    // ── Save to Firestore ─────────────────────────────────────────
    const logData = {
      user_id: userId,
      logged_at: loggedTimestamp,
      meal_type: mealType,
      source,
      raw_input_ar: rawInputAr,
      normalized_input_ar: normalizedInputAr,
      translated_input_en: translatedInputEn,
      total_calories: totalCalories,
      total_protein_g: totalProteinG,
      total_carbs_g: totalCarbsG,
      total_fat_g: totalFatG,
      total_sugar_g: totalSugarG,
      created_at: Timestamp.now(),
    };

    const logRef = await addDoc(mealLogsCol(userId), logData);
    const mealLogId = logRef.id;

    // Batch-write meal items
    if (items.length > 0) {
      const batch = writeBatch(db);
      items.forEach((item) => {
        const itemRef = doc(mealItemsCol(userId, mealLogId));
        batch.set(itemRef, {
          meal_log_id: mealLogId,
          custom_meal_id: item.customMealId || null,
          name_ar: MealService.cleanFoodNameArabic(item.nameAr, item.nameEn),
          name_en: item.nameEn,
          serving_size_g: item.servingSizeG,
          calories: item.calories,
          protein_g: item.proteinG,
          carbs_g: item.carbsG,
          fat_g: item.fatG,
          sugar_g: item.sugarG,
        });
      });
      await batch.commit();
    }

    return {
      mealLogId,
      userId,
      loggedAt: loggedTimestamp,
      mealType,
      source,
      rawInputAr,
      normalizedInputAr,
      translatedInputEn,
      rawApiResponse,
      totalCalories,
      totalProteinG,
      totalCarbsG,
      totalFatG,
      totalSugarG,
      items,
      isLocalMatch,
    };
  }

  /**
   * Fetch all meal logs + their items for a user on a specific date.
   * Returns an array matching the shape of `DatabaseMealLog` from TodayMealList.
   */
  public static async getTodayMealLogs(userId: string, dateStr?: string): Promise<FirebaseMealLog[]> {
    if (!userId) return [];

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();

    const q = query(
      mealLogsCol(userId),
      where('logged_at', '>=', startISO),
      where('logged_at', '<=', endISO),
      orderBy('logged_at', 'desc')
    );

    const snap = await getDocs(q);
    const logs: FirebaseMealLog[] = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const logId = docSnap.id;

      // Fetch nested meal items
      const itemsSnap = await getDocs(mealItemsCol(userId, logId));
      const meal_items = itemsSnap.docs.map((iDoc) => ({
        id: iDoc.id,
        ...iDoc.data(),
      })) as FirebaseMealItem[];

      logs.push({
        id: logId,
        user_id: data.user_id,
        logged_at: data.logged_at,
        meal_type: data.meal_type,
        source: data.source,
        raw_input_ar: data.raw_input_ar,
        normalized_input_ar: data.normalized_input_ar,
        translated_input_en: data.translated_input_en,
        total_calories: data.total_calories,
        total_protein_g: data.total_protein_g,
        total_carbs_g: data.total_carbs_g,
        total_fat_g: data.total_fat_g,
        total_sugar_g: data.total_sugar_g,
        meal_items,
      });
    }

    return logs;
  }

  /**
   * Fetch all meal logs for a user across the current and previous month.
   */
  public static async getMonthlyMealLogs(userId: string): Promise<FirebaseMealLog[]> {
    if (!userId) return [];

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();

      const q = query(
        mealLogsCol(userId),
        where('logged_at', '>=', startOfMonth),
        orderBy('logged_at', 'desc')
      );

      const snap = await getDocs(q);
      return snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          user_id: data.user_id,
          logged_at: data.logged_at,
          meal_type: data.meal_type,
          source: data.source,
          raw_input_ar: data.raw_input_ar,
          normalized_input_ar: data.normalized_input_ar,
          translated_input_en: data.translated_input_en,
          total_calories: data.total_calories || 0,
          total_protein_g: data.total_protein_g || 0,
          total_carbs_g: data.total_carbs_g || 0,
          total_fat_g: data.total_fat_g || 0,
          total_sugar_g: data.total_sugar_g || 0,
          meal_items: [],
        };
      });
    } catch (err) {
      console.error('[FirebaseMealService] getMonthlyMealLogs error:', err);
      return [];
    }
  }

  /**
   * Update a meal log document in Firestore.
   */
  public static async updateMealLog(
    userId: string,
    mealLogId: string,
    updatedData: {
      rawInputAr: string;
      mealType: MealType;
      totalCalories: number;
      totalProteinG: number;
      totalCarbsG: number;
      totalFatG: number;
      totalSugarG?: number;
      reAnalyzeWithEdamam?: boolean;
    }
  ) {
    let { rawInputAr, mealType, totalCalories, totalProteinG, totalCarbsG, totalFatG, totalSugarG = 0 } = updatedData;
    const normalizedInputAr = normalizeArabicText(rawInputAr);

    if (updatedData.reAnalyzeWithEdamam) {
      const translatedInputEn = await translateArabicToEnglishAsync(rawInputAr);
      const apiResult = await EdamamService.fetchNutritionData(translatedInputEn);
      totalCalories = Math.round(apiResult.calories || apiResult.totalNutrients?.ENERC_KCAL?.quantity || 0);
      totalProteinG = Number((apiResult.totalNutrients?.PROCNT?.quantity || 0).toFixed(1));
      totalCarbsG = Number((apiResult.totalNutrients?.CHOCDF?.quantity || 0).toFixed(1));
      totalFatG = Number((apiResult.totalNutrients?.FAT?.quantity || 0).toFixed(1));
      totalSugarG = Number((apiResult.totalNutrients?.SUGAR?.quantity || 0).toFixed(1));
    }

    await updateDoc(mealLogDoc(userId, mealLogId), {
      raw_input_ar: rawInputAr,
      normalized_input_ar: normalizedInputAr,
      meal_type: mealType,
      total_calories: totalCalories,
      total_protein_g: totalProteinG,
      total_carbs_g: totalCarbsG,
      total_fat_g: totalFatG,
      total_sugar_g: totalSugarG,
      updated_at: Timestamp.now(),
    });

    return { rawInputAr, mealType, totalCalories, totalProteinG, totalCarbsG, totalFatG, totalSugarG, normalizedInputAr };
  }

  /**
   * Delete a meal log and all its items from Firestore.
   */
  public static async deleteMealLog(userId: string, mealLogId: string): Promise<void> {
    // Delete all meal items first
    const itemsSnap = await getDocs(mealItemsCol(userId, mealLogId));
    const batch = writeBatch(db);
    itemsSnap.docs.forEach((iDoc) => batch.delete(iDoc.ref));
    batch.delete(mealLogDoc(userId, mealLogId));
    await batch.commit();
  }

  /**
   * Save a custom meal to Firestore.
   */
  public static async saveCustomMeal(
    userId: string,
    meal: Omit<CustomMeal, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CustomMeal> {
    const now = Timestamp.now();
    const ref = await addDoc(customMealsCol(userId), {
      user_id: userId,
      name_ar: meal.nameAr,
      normalized_name_ar: meal.normalizedNameAr,
      serving_size_g: meal.servingSizeG,
      calories: meal.calories,
      protein_g: meal.proteinG,
      carbs_g: meal.carbsG,
      fat_g: meal.fatG,
      sugar_g: meal.sugarG,
      created_at: now,
      updated_at: now,
    });

    return { ...meal, id: ref.id };
  }

  /**
   * Get all custom meals for a user.
   */
  public static async getCustomMeals(userId: string): Promise<CustomMeal[]> {
    const snap = await getDocs(customMealsCol(userId));
    return snap.docs.map((d) => {
      const data = d.data();
      if (!data) return null;
      return {
        id: d.id,
        userId: data['user_id'],
        nameAr: data['name_ar'],
        normalizedNameAr: data['normalized_name_ar'],
        servingSizeG: data['serving_size_g'],
        calories: data['calories'],
        proteinG: data['protein_g'],
        carbsG: data['carbs_g'],
        fatG: data['fat_g'],
        sugarG: data['sugar_g'] || 0,
      } as CustomMeal;
    }).filter((m): m is CustomMeal => m !== null);
  }

  /**
   * Delete a custom meal.
   */
  public static async deleteCustomMeal(userId: string, mealId: string): Promise<void> {
    await deleteDoc(customMealDoc(userId, mealId));
  }

  /**
   * Update nutrition settings in Firestore.
   */
  public static async updateNutritionSettings(
    userId: string,
    settings: {
      dailyCalorieGoal: number;
      dailyProteinGoalG: number;
      dailyCarbsGoalG: number;
      dailyFatGoalG: number;
      dailySugarLimitG: number;
      telegramChatId?: number | null;
      fullName?: string;
    }
  ): Promise<void> {
    // Guard: Prevent linking a Telegram Chat ID that is already assigned to another player account
    if (settings.telegramChatId) {
      const nutCol = collection(db, 'nutrition_settings');
      const q = query(nutCol, where('telegram_chat_id', '==', settings.telegramChatId));
      const snap = await getDocs(q);
      const otherAccount = snap.docs.find((d) => d.id !== userId);
      if (otherAccount) {
        throw new Error('عذراً، معرف تليجرام هذا مربوط بحساب لاعب آخر مسبقاً.');
      }
    }

    const batch = writeBatch(db);

    // Update nutrition_settings doc
    batch.set(
      doc(db, 'nutrition_settings', userId),
      {
        user_id: userId,
        daily_calorie_goal: settings.dailyCalorieGoal,
        daily_protein_goal_g: settings.dailyProteinGoalG,
        daily_carbs_goal_g: settings.dailyCarbsGoalG,
        daily_fat_goal_g: settings.dailyFatGoalG,
        daily_sugar_limit_g: settings.dailySugarLimitG,
        telegram_chat_id: settings.telegramChatId ?? null,
        updated_at: Timestamp.now(),
      },
      { merge: true }
    );

    // Update full_name in users doc if provided
    if (settings.fullName) {
      batch.set(
        doc(db, 'users', userId),
        { full_name: settings.fullName, updated_at: Timestamp.now() },
        { merge: true }
      );
    }

    await batch.commit();
  }

  // ── Private helpers ────────────────────────────────────────────────

  private static async checkCustomMealsMatch(
    userId: string,
    normalizedInputAr: string
  ): Promise<CustomMeal | null> {
    try {
      const q = query(
        customMealsCol(userId),
        where('normalized_name_ar', '==', normalizedInputAr)
      );
      const snap = await getDocs(q);
      if (snap.empty || !snap.docs[0]) return null;
      const firstDoc = snap.docs[0];
      const data = firstDoc.data();
      return {
        id: firstDoc.id,
        userId: data['user_id'],
        nameAr: data['name_ar'],
        normalizedNameAr: data['normalized_name_ar'],
        servingSizeG: data['serving_size_g'],
        calories: data['calories'],
        proteinG: data['protein_g'],
        carbsG: data['carbs_g'],
        fatG: data['fat_g'],
        sugarG: data['sugar_g'] || 0,
      };
    } catch {
      return null;
    }
  }

  public static normalizeIraqiDialect(text: string): string {
    return normalizeIraqiDialect(text);
  }
}
