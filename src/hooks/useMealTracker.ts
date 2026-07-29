import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { UserProfile, CustomMeal, MealType } from '../types';
import { FirebaseMealService, FirebaseMealLog } from '../services/firebaseMealService';
import { DatabaseMealLog } from '../components/meals/TodayMealList';

const INITIAL_PROFILE: UserProfile = {
  id: '',
  fullName: 'المستخدم',
  dailyCalorieGoal: 2400,
  dailyProteinGoalG: 160,
  dailyCarbsGoalG: 220,
  dailyFatGoalG: 70,
  dailySugarLimitG: 50,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Converts a FirebaseMealLog to the DatabaseMealLog shape
 * expected by TodayMealList, preserving all field names.
 */
function toDBMealLog(log: FirebaseMealLog): DatabaseMealLog {
  return log as unknown as DatabaseMealLog;
}

export function useMealTracker(activeUserId?: string) {
  const [currentUserId, setCurrentUserId] = useState<string>(activeUserId || '');
  const [profile, setProfile] = useState<UserProfile>({ ...INITIAL_PROFILE, id: activeUserId || '' });
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]!);
  const [mealLogs, setMealLogs] = useState<DatabaseMealLog[]>([]);
  const [monthlyMealLogs, setMonthlyMealLogs] = useState<DatabaseMealLog[]>([]);
  const [customMeals, setCustomMeals] = useState<CustomMeal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sync activeUserId → local state; fallback to Firebase Auth current user
  useEffect(() => {
    if (activeUserId) {
      setCurrentUserId(activeUserId);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user?.uid) setCurrentUserId(user.uid);
    });
    return unsub;
  }, [activeUserId]);

  // Real-Time Live Listener on Subscriptions & Users docs (Updates instantly on admin change)
  useEffect(() => {
    if (!currentUserId) return;

    const unsubSub = onSnapshot(doc(db, 'subscriptions', currentUserId), (subSnap) => {
      if (subSnap.exists()) {
        const s = subSnap.data();
        const endsAtStr = s.ends_at?.toDate?.()?.toISOString() || (typeof s.ends_at === 'string' ? s.ends_at : undefined);
        setProfile((prev) => ({
          ...prev,
          accountStatus: s.status || prev.accountStatus,
          trialEndDate: endsAtStr ?? prev.trialEndDate,
        }));
      }
    });

    const unsubUser = onSnapshot(doc(db, 'users', currentUserId), (userSnap) => {
      if (userSnap.exists()) {
        const u = userSnap.data();
        setProfile((prev) => ({
          ...prev,
          fullName: u.full_name || prev.fullName,
          accountStatus: u.account_status || prev.accountStatus,
          role: u.role || prev.role,
        }));
      }
    });

    return () => {
      unsubSub();
      unsubUser();
    };
  }, [currentUserId]);

  // ── Fetch user profile from Firestore ────────────────────────────
  const fetchUserProfile = useCallback(async (uid: string) => {
    if (!uid) return;
    try {
      const [userSnap, nutSnap, subSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, 'nutrition_settings', uid)),
        getDoc(doc(db, 'subscriptions', uid)),
      ]);

      if (userSnap.exists()) {
        const u = userSnap.data();
        const n = nutSnap.exists() ? nutSnap.data() : null;
        const s = subSnap.exists() ? subSnap.data() : null;
        setProfile({
          id: uid,
          fullName: u.full_name,
          email: u.email,
          role: u.role,
          accountStatus: s?.status || u.account_status,
          dailyCalorieGoal: n?.daily_calorie_goal ?? 2400,
          dailyProteinGoalG: Number(n?.daily_protein_goal_g ?? 160),
          dailyCarbsGoalG: Number(n?.daily_carbs_goal_g ?? 220),
          dailyFatGoalG: Number(n?.daily_fat_goal_g ?? 70),
          dailySugarLimitG: Number(n?.daily_sugar_limit_g ?? 50),
          telegramChatId: n?.telegram_chat_id ?? null,
          trialEndDate: s?.ends_at?.toDate?.()?.toISOString() || (typeof s?.ends_at === 'string' ? s.ends_at : undefined),
          createdAt: u.created_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
          updatedAt: u.updated_at?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('[useMealTracker] fetchUserProfile error:', err);
    }
  }, []);

  // ── Fetch meal logs for selected date ─────────────────────────────
  const fetchDateData = useCallback(async (uid: string, dateStr: string) => {
    if (!uid) { setMealLogs([]); return; }
    try {
      const data = await FirebaseMealService.getTodayMealLogs(uid, dateStr);
      setMealLogs(data.map(toDBMealLog));
    } catch (err) {
      console.error('[useMealTracker] fetchDateData error:', err);
      setMealLogs([]);
    }
  }, []);

  // ── Fetch all monthly meal logs ───────────────────────────────────
  const fetchMonthlyData = useCallback(async (uid: string) => {
    if (!uid) { setMonthlyMealLogs([]); return; }
    try {
      const data = await FirebaseMealService.getMonthlyMealLogs(uid);
      setMonthlyMealLogs(data.map(toDBMealLog));
    } catch {
      setMonthlyMealLogs([]);
    }
  }, []);

  // ── Fetch custom meals ────────────────────────────────────────────
  const fetchCustomMeals = useCallback(async (uid: string) => {
    if (!uid) return;
    try {
      const meals = await FirebaseMealService.getCustomMeals(uid);
      setCustomMeals(meals);
    } catch {
      setCustomMeals([]);
    }
  }, []);

  // ── Primary effect: reload on uid or date change ─────────────────
  useEffect(() => {
    if (currentUserId) {
      fetchUserProfile(currentUserId);
      fetchCustomMeals(currentUserId);
      fetchDateData(currentUserId, selectedDate);
      fetchMonthlyData(currentUserId);
    }
  }, [currentUserId, selectedDate, fetchUserProfile, fetchCustomMeals, fetchDateData, fetchMonthlyData]);

  // ── Update profile + nutrition settings in Firestore ─────────────
  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    const targetId = currentUserId || profile.id;
    const newProfile = { ...profile, ...updated, id: targetId };
    setProfile(newProfile);

    if (targetId) {
      try {
        await FirebaseMealService.updateNutritionSettings(targetId, {
          dailyCalorieGoal: newProfile.dailyCalorieGoal,
          dailyProteinGoalG: newProfile.dailyProteinGoalG,
          dailyCarbsGoalG: newProfile.dailyCarbsGoalG,
          dailyFatGoalG: newProfile.dailyFatGoalG,
          dailySugarLimitG: newProfile.dailySugarLimitG,
          telegramChatId: newProfile.telegramChatId,
          fullName: newProfile.fullName,
        });
      } catch (err) {
        console.warn('[useMealTracker] updateNutritionSettings warning:', err);
      }
    }

    showToast('تم تحديث الملف الشخصي والأهداف الرياضية بنجاح! ✨', 'success');
  };

  const isSubscriptionExpired = Boolean(
    (profile.accountStatus && ['expired', 'cancelled', 'paused', 'blocked'].includes(profile.accountStatus)) ||
    (profile.trialEndDate && new Date(profile.trialEndDate).getTime() < Date.now() && profile.accountStatus !== 'active')
  );

  // ── Add meal ──────────────────────────────────────────────────────
  const handleAddMeal = async (rawInputAr: string, mealType: MealType) => {
    const targetUserId = currentUserId || profile.id;
    if (!targetUserId) {
      showToast('يرجى تسجيل الدخول أولاً لتسجيل الوجبات', 'error');
      return;
    }

    if (isSubscriptionExpired) {
      showToast('عفواً، انتهت فترة اشتراكك في النظام. يرجى تجديد الاشتراك لتتمكن من تسجيل وجبات جديدة.', 'error');
      return;
    }

    setIsLoading(true);
    showToast('جاري حساب القيم التغذوية وتسجيل الوجبة...', 'success');

    const now = new Date();
    const [yearStr, monthStr, dayStr] = selectedDate.split('-');
    const loggedDateObj = new Date(
      Number(yearStr),
      Number(monthStr) - 1,
      Number(dayStr),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );

    try {
      await FirebaseMealService.processAndSaveMeal({
        userId: targetUserId,
        rawInputAr,
        mealType,
        source: 'web',
        loggedAt: loggedDateObj.toISOString(),
      });

      await fetchDateData(targetUserId, selectedDate);
      showToast('تم تسجيل الوجبة بنجاح ✨', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الوجبة';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Update meal log ────────────────────────────────────────────────
  const handleUpdateMealLog = async (
    id: string,
    updated: {
      rawInputAr: string;
      mealType: MealType;
      totalCalories: number;
      totalProteinG: number;
      totalCarbsG: number;
      totalFatG: number;
      totalSugarG?: number;
      reAnalyzeWithEdamam?: boolean;
    }
  ) => {
    const targetUserId = currentUserId || profile.id;
    try {
      showToast('جاري تحديث بيانات الوجبة...', 'success');
      await FirebaseMealService.updateMealLog(targetUserId, id, updated);
      await fetchDateData(targetUserId, selectedDate);
      showToast('تم تعديل الوجبة بنجاح ✨', 'success');
    } catch (err) {
      console.error('[useMealTracker] updateMealLog error:', err);
      showToast('حدث خطأ أثناء تعديل الوجبة', 'error');
    }
  };

  // ── Delete meal log ────────────────────────────────────────────────
  const handleDeleteMealLog = async (id: string) => {
    const targetUserId = currentUserId || profile.id;
    // Optimistic update
    setMealLogs((prev) => prev.filter((m) => m.id !== id));
    try {
      await FirebaseMealService.deleteMealLog(targetUserId, id);
      showToast('تم حذف الوجبة بنجاح', 'success');
    } catch (err) {
      console.error('[useMealTracker] deleteMealLog error:', err);
      // Re-fetch to restore state on error
      await fetchDateData(targetUserId, selectedDate);
      showToast('حدث خطأ أثناء حذف الوجبة', 'error');
    }
  };

  // ── Save custom meal ───────────────────────────────────────────────
  const handleSaveCustomMeal = async (meal: Omit<CustomMeal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const targetUserId = currentUserId || profile.id;
    try {
      const saved = await FirebaseMealService.saveCustomMeal(targetUserId, meal);
      setCustomMeals((prev) => [saved, ...prev]);
      showToast('تم حفظ الوجبة المخصصة بنجاح ✨', 'success');
    } catch (err) {
      console.error('[useMealTracker] saveCustomMeal error:', err);
      showToast('حدث خطأ أثناء حفظ الوجبة المخصصة', 'error');
    }
  };

  // ── Delete custom meal ─────────────────────────────────────────────
  const handleDeleteCustomMeal = async (id: string) => {
    const targetUserId = currentUserId || profile.id;
    setCustomMeals((prev) => prev.filter((m) => m.id !== id));
    try {
      await FirebaseMealService.deleteCustomMeal(targetUserId, id);
      showToast('تم حذف الوجبة المخصصة بنجاح', 'success');
    } catch {
      await fetchCustomMeals(targetUserId);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const totals = mealLogs.reduce(
    (acc, m) => ({
      calories: acc.calories + Number(m.total_calories || 0),
      protein: acc.protein + Number(m.total_protein_g || 0),
      carbs: acc.carbs + Number(m.total_carbs_g || 0),
      fat: acc.fat + Number(m.total_fat_g || 0),
      sugar: acc.sugar + Number(m.total_sugar_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 }
  );

  return {
    profile,
    isSubscriptionExpired,
    selectedDate,
    setSelectedDate,
    mealLogs,
    monthlyMealLogs,
    customMeals,
    isLoading,
    notification,
    totals,
    handleUpdateProfile,
    handleAddMeal,
    handleUpdateMealLog,
    handleDeleteMealLog,
    handleSaveCustomMeal,
    handleDeleteCustomMeal,
  };
}
