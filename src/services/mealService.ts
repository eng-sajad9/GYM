import { db } from '../config/firebaseConfig';
import { addDoc, collection, query, where, getDocs, Timestamp, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { normalizeArabicText } from '../utils/arabicNormalizer';
import { translateArabicToEnglishAsync, normalizeIraqiDialect } from '../utils/translator';
import { EdamamService } from './edamamService';
import {
  ParseMealInput,
  ProcessedMealResult,
  ProcessedMealItem,
  CustomMeal,
} from '../types';

export class MealService {
  /**
   * تنظيف وتنسيق اسم العنصر الغذائي ليصبح بسيطا ومرتبا باللغة العربية بدون تعقيد
   */
  public static cleanFoodNameArabic(nameAr?: string, nameEn?: string): string {
    const raw = (nameAr || nameEn || '').toLowerCase().trim();

    if (!raw) return 'عنصر غذائي';

    // المطابقة مع الأطعمة الشائعة لتوفير مسميات مرتبة وبسيطة
    if (raw.includes('chicken') || raw.includes('دجاج') || raw.includes('صدر')) return 'صدر دجاج مشوي';
    if (raw.includes('shawarma') || raw.includes('شاورما') || raw.includes('كص')) return 'شاورما لحم';
    if (raw.includes('kebab') || raw.includes('beef') || raw.includes('لحم') || raw.includes('كباب')) return 'لحم بقر مشوي';
    if (raw.includes('rice') || raw.includes('تمن') || raw.includes('أرز') || raw.includes('رز')) return 'أرز مطبوخ';
    if (raw.includes('egg') || raw.includes('بيض')) return 'بيض مسلوق';
    if (raw.includes('bread') || raw.includes('خبز') || raw.includes('صمون') || raw.includes('توست')) return 'خبز';
    if (raw.includes('oat') || raw.includes('شوفان')) return 'شوفان';
    if (raw.includes('milk') || raw.includes('حليب')) return 'حليب';
    if (raw.includes('yogurt') || raw.includes('زبادي') || raw.includes('قيمر')) return 'زبادي';
    if (raw.includes('fish') || raw.includes('salmon') || raw.includes('tuna') || raw.includes('سمك') || raw.includes('سلمون')) return 'سمك مشوي';
    if (raw.includes('potato') || raw.includes('بطاطس') || raw.includes('بتيتة')) return 'بطاطس مطبوخة';
    if (raw.includes('apple') || raw.includes('تفاح')) return 'تفاحة طازجة';
    if (raw.includes('banana') || raw.includes('موز')) return 'موز طازج';
    if (raw.includes('salad') || raw.includes('خضار') || raw.includes('زلاطة') || raw.includes('بروكلي')) return 'خضروات وسلاطة';

    // تنظيف النصوص العربية من المصطلحات التقنية المعقدة
    if (/[\u0600-\u06FF]/.test(raw)) {
      return raw.replace(/(خام|غير مطبوخ|المصنع|المعلب|,.*$)/gi, '').trim();
    }

    // تنظيف النصوص الإنجليزية المعقدة وإرجاع اسم مرتب
    const cleanedEn = raw
      .replace(/,\s*(raw|cooked|boiled|unprepared|nfc|ns as to.*$)/gi, '')
      .replace(/[^\w\s]/gi, ' ')
      .trim();

    return cleanedEn || 'عنصر غذائي';
  }

  /**
   * 1. Execution & Strict Persistent Save of Meal into public.meal_logs & public.meal_items
   */
  public static async processAndSaveMeal(input: ParseMealInput): Promise<ProcessedMealResult> {
    const { userId, rawInputAr, mealType, source, loggedAt } = input;
    const loggedTimestamp = loggedAt || new Date().toISOString();

    const normalizedInputAr = normalizeArabicText(rawInputAr);

    const localMatch = await this.checkCustomMealsMatch(userId, normalizedInputAr);

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

      // Check root level nutrients if ingredients array didn't yield non-zero values
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

      // SMART FALLBACK ENGINE: إذا فشل API الخارجي أو أرجع 0 سعرات، شغل محرك التغذية العربي الذكي
      if (items.length === 0) {
        items = this.estimateArabicNutrition(rawInputAr);
      }
    }

    const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
    const totalProteinG = Number(items.reduce((sum, item) => sum + item.proteinG, 0).toFixed(1));
    const totalCarbsG = Number(items.reduce((sum, item) => sum + item.carbsG, 0).toFixed(1));
    const totalFatG = Number(items.reduce((sum, item) => sum + item.fatG, 0).toFixed(1));
    const totalSugarG = Number(items.reduce((sum, item) => sum + item.sugarG, 0).toFixed(1));

    // ── Save to Firestore ──────────────────────────────────────────────
    const logRef = await addDoc(collection(db, 'users', userId, 'meal_logs'), {
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
    });

    const mealLogId = logRef.id;

    if (items.length > 0) {
      const batch = writeBatch(db);
      items.forEach((item) => {
        const itemRef = doc(collection(db, 'users', userId, 'meal_logs', mealLogId, 'meal_items'));
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
   * المحرك العربي الذكي لتقدير القيم التغذوية والماكروز والسكريات بمسميات عربية راقية وبسيطة
   */
  private static estimateArabicNutrition(rawInputAr: string): ProcessedMealItem[] {
    const text = rawInputAr.toLowerCase().trim();
    const items: ProcessedMealItem[] = [];

    const weightMatch = text.match(/(\d+)\s*(غرام|جرام|غم|g|مل|ml)/i);
    const explicitWeight = weightMatch ? Number(weightMatch[1]) : null;

    const countMatch = text.match(/(\d+)\s*(بيض|بيضة|بيضات|قطع|قطعة|خبز|صمون)/i);
    const explicitCount = countMatch ? Number(countMatch[1]) : 1;

    let hasMatchedAny = false;

    // الدواجن واللحوم
    if (text.includes('دجاج') || text.includes('صدر')) {
      hasMatchedAny = true;
      const weight = explicitWeight || 150;
      const factor = weight / 100;
      items.push({
        nameAr: 'صدر دجاج مشوي',
        nameEn: 'grilled chicken breast',
        servingSizeG: weight,
        calories: Math.round(165 * factor),
        proteinG: Number((31 * factor).toFixed(1)),
        carbsG: 0,
        fatG: Number((3.6 * factor).toFixed(1)),
        sugarG: 0,
      });
    }

    if (text.includes('شاورما') || text.includes('كص') || text.includes('لحم') || text.includes('كباب')) {
      hasMatchedAny = true;
      const weight = explicitWeight || 200;
      const factor = weight / 100;
      items.push({
        nameAr: text.includes('شاورما') ? 'شاورما لحم' : 'لحم بقر مشوي',
        nameEn: 'beef shawarma',
        servingSizeG: weight,
        calories: Math.round(250 * factor),
        proteinG: Number((26 * factor).toFixed(1)),
        carbsG: Number((2 * factor).toFixed(1)),
        fatG: Number((15 * factor).toFixed(1)),
        sugarG: Number((0.5 * factor).toFixed(1)),
      });
    }

    // الأرز والتمن
    if (text.includes('تمن') || text.includes('أرز') || text.includes('رز')) {
      hasMatchedAny = true;
      const weight = text.includes('تمن') && explicitWeight ? explicitWeight : 175;
      const factor = weight / 100;
      items.push({
        nameAr: 'أرز مطبوخ',
        nameEn: 'cooked rice',
        servingSizeG: weight,
        calories: Math.round(130 * factor),
        proteinG: Number((2.7 * factor).toFixed(1)),
        carbsG: Number((28 * factor).toFixed(1)),
        fatG: Number((0.3 * factor).toFixed(1)),
        sugarG: Number((0.1 * factor).toFixed(1)),
      });
    }

    // البيض
    if (text.includes('بيض') || text.includes('بيضة')) {
      hasMatchedAny = true;
      const count = explicitCount || 2;
      const weight = count * 50;
      items.push({
        nameAr: `${count} بيض مسلوق`,
        nameEn: `${count} boiled eggs`,
        servingSizeG: weight,
        calories: Math.round(72 * count),
        proteinG: Number((6.3 * count).toFixed(1)),
        carbsG: Number((0.4 * count).toFixed(1)),
        fatG: Number((4.8 * count).toFixed(1)),
        sugarG: Number((0.2 * count).toFixed(1)),
      });
    }

    // الخبز والصمون
    if (text.includes('خبز') || text.includes('صمون') || text.includes('توست')) {
      hasMatchedAny = true;
      const weight = text.includes('خبز') && explicitWeight ? explicitWeight : 50;
      const factor = weight / 100;
      items.push({
        nameAr: 'خبز',
        nameEn: 'bread',
        servingSizeG: weight,
        calories: Math.round(265 * factor),
        proteinG: Number((9 * factor).toFixed(1)),
        carbsG: Number((49 * factor).toFixed(1)),
        fatG: Number((3.2 * factor).toFixed(1)),
        sugarG: Number((2.5 * factor).toFixed(1)),
      });
    }

    // الشوفان والحليب
    if (text.includes('شوفان')) {
      hasMatchedAny = true;
      const weight = explicitWeight || 50;
      const factor = weight / 100;
      items.push({
        nameAr: 'شوفان',
        nameEn: 'oats',
        servingSizeG: weight,
        calories: Math.round(389 * factor),
        proteinG: Number((16.9 * factor).toFixed(1)),
        carbsG: Number((66 * factor).toFixed(1)),
        fatG: Number((6.9 * factor).toFixed(1)),
        sugarG: Number((1 * factor).toFixed(1)),
      });
    }

    if (text.includes('حليب') || text.includes('لبن')) {
      hasMatchedAny = true;
      const weight = explicitWeight || 200;
      const factor = weight / 100;
      items.push({
        nameAr: 'حليب',
        nameEn: 'milk',
        servingSizeG: weight,
        calories: Math.round(60 * factor),
        proteinG: Number((3.4 * factor).toFixed(1)),
        carbsG: Number((5 * factor).toFixed(1)),
        fatG: Number((3.3 * factor).toFixed(1)),
        sugarG: Number((5 * factor).toFixed(1)),
      });
    }

    // الأسماك
    if (text.includes('سمك') || text.includes('سلمون') || text.includes('تونة') || text.includes('تونه')) {
      hasMatchedAny = true;
      const weight = explicitWeight || 150;
      const factor = weight / 100;
      items.push({
        nameAr: 'سمك مشوي',
        nameEn: 'grilled fish',
        servingSizeG: weight,
        calories: Math.round(140 * factor),
        proteinG: Number((20 * factor).toFixed(1)),
        carbsG: 0,
        fatG: Number((6 * factor).toFixed(1)),
        sugarG: 0,
      });
    }

    // Fallback عام لحساب الماكروز عند إدخال طعام غير مسجل
    if (!hasMatchedAny || items.length === 0) {
      const weight = explicitWeight || 150;
      items.push({
        nameAr: MealService.cleanFoodNameArabic(rawInputAr),
        nameEn: 'Custom Meal Item',
        servingSizeG: weight,
        calories: Math.round(weight * 1.8),
        proteinG: Number((weight * 0.15).toFixed(1)),
        carbsG: Number((weight * 0.20).toFixed(1)),
        fatG: Number((weight * 0.05).toFixed(1)),
        sugarG: Number((weight * 0.02).toFixed(1)),
      });
    }

    return items;
  }

  /**
   * 2. Update Meal Log with Persistence Check
   */
  public static async updateMealLog(
    arg1: string,
    arg2: any,
    arg3?: any
  ) {
    const userId = typeof arg2 === 'string' ? arg1 : (arg2?.userId || '');
    const mealLogId = typeof arg2 === 'string' ? arg2 : arg1;
    const updatedData = typeof arg2 === 'string' ? arg3 : arg2;

    let { rawInputAr, mealType, totalCalories, totalProteinG, totalCarbsG, totalFatG, totalSugarG = 0, reAnalyzeWithEdamam } = updatedData || {};
    let normalizedInputAr = normalizeArabicText(rawInputAr || '');
    let translatedInputEn = '';

    if (reAnalyzeWithEdamam && rawInputAr) {
      translatedInputEn = await translateArabicToEnglishAsync(rawInputAr);
      const apiResult = await EdamamService.fetchNutritionData(translatedInputEn);

      let totalCal = apiResult.calories || apiResult.totalNutrients?.ENERC_KCAL?.quantity || 0;
      let totalProt = apiResult.totalNutrients?.PROCNT?.quantity || 0;
      let totalCarb = apiResult.totalNutrients?.CHOCDF?.quantity || 0;
      let totalFatVal = apiResult.totalNutrients?.FAT?.quantity || 0;
      let totalSugarVal = apiResult.totalNutrients?.SUGAR?.quantity || 0;

      if (apiResult.ingredients && apiResult.ingredients.length > 0) {
        apiResult.ingredients.forEach((ing) => {
          if (ing.parsed && ing.parsed.length > 0) {
            ing.parsed.forEach((parsedItem) => {
              if (parsedItem.nutrients) {
                if (!totalCal) totalCal += parsedItem.nutrients.ENERC_KCAL?.quantity || 0;
                if (!totalProt) totalProt += parsedItem.nutrients.PROCNT?.quantity || 0;
                if (!totalCarb) totalCarb += parsedItem.nutrients.CHOCDF?.quantity || 0;
                if (!totalFatVal) totalFatVal += parsedItem.nutrients.FAT?.quantity || 0;
                if (!totalSugarVal) totalSugarVal += parsedItem.nutrients.SUGAR?.quantity || 0;
              }
            });
          }
        });
      }

      if (totalCal === 0 && totalProt === 0 && totalCarb === 0) {
        const estItems = this.estimateArabicNutrition(rawInputAr);
        totalCal = estItems.reduce((s, i) => s + i.calories, 0);
        totalProt = estItems.reduce((s, i) => s + i.proteinG, 0);
        totalCarb = estItems.reduce((s, i) => s + i.carbsG, 0);
        totalFatVal = estItems.reduce((s, i) => s + i.fatG, 0);
        totalSugarVal = estItems.reduce((s, i) => s + i.sugarG, 0);
      }

      totalCalories = Math.round(totalCal);
      totalProteinG = Number(totalProt.toFixed(1));
      totalCarbsG = Number(totalCarb.toFixed(1));
      totalFatG = Number(totalFatVal.toFixed(1));
      totalSugarG = Number(totalSugarVal.toFixed(1));
    }

    if (userId && mealLogId) {
      await updateDoc(doc(db, 'users', userId, 'meal_logs', mealLogId), {
        raw_input_ar: rawInputAr,
        meal_type: mealType,
        total_calories: totalCalories,
        total_protein_g: totalProteinG,
        total_carbs_g: totalCarbsG,
        total_fat_g: totalFatG,
        total_sugar_g: totalSugarG,
        ...(reAnalyzeWithEdamam ? { normalized_input_ar: normalizedInputAr, translated_input_en: translatedInputEn } : {}),
      }).catch((err) => { throw new Error(`فشل تحديث الوجبة في قاعدة البيانات: ${err.message}`); });
    }

    return {
      rawInputAr,
      mealType,
      totalCalories,
      totalProteinG,
      totalCarbsG,
      totalFatG,
      totalSugarG,
      normalizedInputAr,
      translatedInputEn,
    };
  }

  public static normalizeIraqiDialect(text: string): string {
    return normalizeIraqiDialect(text);
  }

  // updateMealLog needs userId – exposed via FirebaseMealService. This stub kept for signature compat.
  public static _userId: string = '';

  private static async checkCustomMealsMatch(
    userId: string,
    normalizedInputAr: string
  ): Promise<CustomMeal | null> {
    if (!userId) return null;
    try {
      const q = query(
        collection(db, 'users', userId, 'custom_meals'),
        where('normalized_name_ar', '==', normalizedInputAr)
      );
      const snap = await getDocs(q);
      if (snap.empty || !snap.docs[0]) return null;
      const d = snap.docs[0];
      const data = d.data();
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
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch meal logs from Firestore for a specific user and date.
   */
  public static async getTodayMealLogs(userId: string, dateStr?: string) {
    if (!userId) return [];
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);

    try {
      const q = query(
        collection(db, 'users', userId, 'meal_logs'),
        where('logged_at', '>=', startOfDay.toISOString()),
        where('logged_at', '<=', endOfDay.toISOString())
      );
      const snap = await getDocs(q);
      const results = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const itemsSnap = await getDocs(collection(db, 'users', userId, 'meal_logs', docSnap.id, 'meal_items'));
        results.push({
          id: docSnap.id,
          ...data,
          meal_items: itemsSnap.docs.map((i) => ({ id: i.id, ...i.data() })),
        });
      }
      return results;
    } catch (err) {
      console.error('خطأ في استعلام الوجبات من Firestore:', err);
      return [];
    }
  }
}
