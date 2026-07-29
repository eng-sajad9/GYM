import React, { useState } from 'react';
import {
  Trophy,
  Target,
  Flame,
  CalendarCheck,
  TrendingUp,
  Sparkles,
  Award,
  Activity,
  Dumbbell,
} from 'lucide-react';
import { UserProfile } from '../../types';

export interface MonthlyMealLogItem {
  id?: string;
  loggedAt?: string;
  totalCalories?: number;
  calories?: number;
  totalProteinG?: number;
  proteinG?: number;
  totalCarbsG?: number;
  carbsG?: number;
  totalFatG?: number;
  fatG?: number;
}

interface MonthlySummaryReportProps {
  profile: UserProfile;
  mealLogs?: MonthlyMealLogItem[];
}

export const MonthlySummaryReport: React.FC<MonthlySummaryReportProps> = ({
  profile,
  mealLogs = [],
}) => {
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0); // 0 = Current month, 1 = Previous month

  // Compute date ranges
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() - selectedMonthOffset, 1);
  const currentMonthName = targetDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();

  // Filter logs for the selected month
  const targetMonthLogs = mealLogs.filter((log) => {
    if (!log.loggedAt) return false;
    const logDate = new Date(log.loggedAt);
    return (
      logDate.getFullYear() === targetDate.getFullYear() &&
      logDate.getMonth() === targetDate.getMonth()
    );
  });

  // Calculate actual totals from real logs (or fallback realistic monthly estimates if initial)
  const actualCalories = targetMonthLogs.reduce((acc, l) => acc + (l.totalCalories || l.calories || 0), 0);
  const actualProtein = targetMonthLogs.reduce((acc, l) => acc + (l.totalProteinG || l.proteinG || 0), 0);
  const actualCarbs = targetMonthLogs.reduce((acc, l) => acc + (l.totalCarbsG || l.carbsG || 0), 0);
  const actualFat = targetMonthLogs.reduce((acc, l) => acc + (l.totalFatG || l.fatG || 0), 0);
  const totalMealsCount = targetMonthLogs.length;

  // Days logged count (unique dates)
  const uniqueLoggedDays = new Set(
    targetMonthLogs.map((l) => l.loggedAt ? l.loggedAt.substring(0, 10) : '')
  ).size;

  // Monthly targets
  const targetMonthlyCalories = (profile.dailyCalorieGoal || 2400) * daysInMonth;
  const targetMonthlyProtein = (profile.dailyProteinGoalG || 160) * daysInMonth;
  const targetMonthlyCarbs = (profile.dailyCarbsGoalG || 220) * daysInMonth;
  const targetMonthlyFat = (profile.dailyFatGoalG || 70) * daysInMonth;

  // Calculate completion percentage strictly from real player data
  const hasLogs = targetMonthLogs.length > 0;
  const displayCalories = actualCalories;
  const displayProtein = actualProtein;
  const displayCarbs = actualCarbs;
  const displayFat = actualFat;
  const displayLoggedDays = uniqueLoggedDays;
  const displayMealsCount = totalMealsCount;

  const caloriePercentage = Math.min(100, Math.round((displayCalories / (targetMonthlyCalories || 1)) * 100));
  const proteinPercentage = Math.min(100, Math.round((displayProtein / (targetMonthlyProtein || 1)) * 100));
  const carbsPercentage = Math.min(100, Math.round((displayCarbs / (targetMonthlyCarbs || 1)) * 100));
  const fatPercentage = Math.min(100, Math.round((displayFat / (targetMonthlyFat || 1)) * 100));
  const commitmentScore = hasLogs ? Math.round((caloriePercentage + proteinPercentage + carbsPercentage) / 3) : 0;

  // Daily Averages vs Goals
  const targetDailyCalories = profile.dailyCalorieGoal || 2400;
  const targetDailyProtein = profile.dailyProteinGoalG || 160;
  const targetDailyCarbs = profile.dailyCarbsGoalG || 220;
  const targetDailyFat = profile.dailyFatGoalG || 70;

  const avgDailyCalories = hasLogs ? Math.round(displayCalories / (displayLoggedDays || 1)) : 0;
  const avgDailyProtein = hasLogs ? Math.round(displayProtein / (displayLoggedDays || 1)) : 0;
  const avgDailyCarbs = hasLogs ? Math.round(displayCarbs / (displayLoggedDays || 1)) : 0;
  const avgDailyFat = hasLogs ? Math.round(displayFat / (displayLoggedDays || 1)) : 0;

  // Performance evaluation tier
  const getEvaluationTier = (score: number, hasLogs: boolean) => {
    if (!hasLogs) {
      return {
        title: 'في انتظار تسجيل وجباتك الأولى 📝',
        desc: 'لم تقم بتسجيل وجبات بهذا الشهر حتى الآن. ابدأ بتسجيل وجباتك اليومية لتظهر تحليلاتك وإنجازك الشخصي هنا!',
        badgeBg: 'bg-neutral-800 text-neutral-300 border-neutral-700',
        glowBg: 'from-neutral-800/20 via-neutral-900 to-transparent',
        icon: TrendingUp,
      };
    }
    if (score >= 85) {
      return {
        title: 'أداء أسطوري! ممتاز جداً 🏆',
        desc: 'حسنت التزامك بالماكروز والسعرات الشهرية بشكل استثنائي. أنت قريب جداً من تحقيق بناء جسمك المثالي!',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        glowBg: 'from-emerald-500/10 via-amber-500/5 to-transparent',
        icon: Trophy,
      };
    } else if (score >= 70) {
      return {
        title: 'أداء ممتاز وجيد جداً! 🎯',
        desc: 'حققت نسبة عالية من أهدافك الشهرية. واصل الالتزام اليومي لتصل للعلامة الكاملة!',
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        glowBg: 'from-sky-500/10 via-emerald-500/5 to-transparent',
        icon: Target,
      };
    } else {
      return {
        title: 'بداية طيبة! واصل التطور 💪',
        desc: 'استمر في تسجيل وجباتك يومياً لرفع نسبة التزامك والوصول لهدفك البنائي قريباً.',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        glowBg: 'from-amber-500/10 via-orange-500/5 to-transparent',
        icon: TrendingUp,
      };
    }
  };

  const evalTier = getEvaluationTier(commitmentScore, hasLogs);
  const EvalIcon = evalTier.icon;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6 font-cairo dir-rtl relative overflow-hidden animate-fade-in">
      {/* Background Ambient Glows */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section with Month Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-400 shrink-0 shadow-lg">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-black text-white">
                الملخص والإنجاز الشهري التراكمي
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>تحديث حي تلقائي</span>
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              تحليل شامل لكافة السعرات والماكروز ونسبة الالتزام بالهدف لشهر {currentMonthName}
            </p>
          </div>
        </div>

        {/* Month Selector Pills */}
        <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 shrink-0">
          <button
            onClick={() => setSelectedMonthOffset(0)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] ${selectedMonthOffset === 0
              ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
              : 'text-neutral-400 hover:text-white'
              }`}
          >
            الشهر الحالي 📅
          </button>
          <button
            onClick={() => setSelectedMonthOffset(1)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] ${selectedMonthOffset === 1
              ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
              : 'text-neutral-400 hover:text-white'
              }`}
          >
            الشهر السابق ⏪
          </button>
        </div>
      </div>

      {/* Main Achievement Evaluation Banner */}
      <div className={`p-4 sm:p-5 rounded-3xl bg-gradient-to-r ${evalTier.glowBg} bg-neutral-950/80 border border-neutral-800 space-y-3 relative overflow-hidden`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl border shrink-0 ${evalTier.badgeBg}`}>
              <EvalIcon className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${evalTier.badgeBg}`}>
                تقييم الأداء الشهري
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                {evalTier.title}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
                {evalTier.desc}
              </p>
            </div>
          </div>

          {/* Overall Commitment Rating Meter */}
          <div className="bg-neutral-900/90 border border-neutral-800 p-3.5 rounded-2xl text-center shrink-0 min-w-[130px] shadow-xl">
            <span className="text-[11px] text-neutral-400 font-bold block">نسبة الالتزام بالهدف</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 flex items-center justify-center gap-1">
              <span>%{commitmentScore}</span>
              <Flame className="w-5 h-5 text-orange-400 animate-bounce" />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Macronutrient Goals vs Real Intake Progress Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Calories Card */}
        <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-sky-400" />
              <span>السعرات الحرارية الشهرية</span>
            </span>
            <span className="text-xs font-black text-sky-300">%{caloriePercentage}</span>
          </div>
          <div className="text-lg font-black text-white">
            {displayCalories.toLocaleString()} <span className="text-xs font-medium text-neutral-400">/ {targetMonthlyCalories.toLocaleString()} سعرة</span>
          </div>
          <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-blue-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${caloriePercentage}%` }}
            />
          </div>
        </div>

        {/* 2. Protein Card */}
        <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <span>إجمالي البروتين المستهلك</span>
            </span>
            <span className="text-xs font-black text-emerald-300">%{proteinPercentage}</span>
          </div>
          <div className="text-lg font-black text-white">
            {displayProtein.toLocaleString()}g <span className="text-xs font-medium text-neutral-400">/ {targetMonthlyProtein.toLocaleString()}g</span>
          </div>
          <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${proteinPercentage}%` }}
            />
          </div>
        </div>

        {/* 3. Carbs Card */}
        <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>إجمالي الكاربوهيدرات</span>
            </span>
            <span className="text-xs font-black text-amber-300">%{carbsPercentage}</span>
          </div>
          <div className="text-lg font-black text-white">
            {displayCarbs.toLocaleString()}g <span className="text-xs font-medium text-neutral-400">/ {targetMonthlyCarbs.toLocaleString()}g</span>
          </div>
          <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${carbsPercentage}%` }}
            />
          </div>
        </div>

        {/* 4. Fats Card */}
        <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>إجمالي الدهون الصحية</span>
            </span>
            <span className="text-xs font-black text-orange-300">%{fatPercentage}</span>
          </div>
          <div className="text-lg font-black text-white">
            {displayFat.toLocaleString()}g <span className="text-xs font-medium text-neutral-400">/ {targetMonthlyFat.toLocaleString()}g</span>
          </div>
          <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-red-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${fatPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Daily Average Intake Breakdown Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-white">معدل التناول اليومي الفعلي (الماكروز اليومية)</h3>
          </div>
          <span className="text-[11px] font-bold text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-xl border border-neutral-800">
            مقاسة لكل يوم تسجيل
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Daily Avg Protein */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-emerald-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5" />
                <span>معدل البروتين اليومي</span>
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {Math.round((avgDailyProtein / targetDailyProtein) * 100)}% من الهدف
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-white">{avgDailyProtein}g</span>
              <span className="text-[11px] font-bold text-neutral-400">المطلوب: {targetDailyProtein}g</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((avgDailyProtein / targetDailyProtein) * 100))}%` }}
              />
            </div>
          </div>

          {/* Daily Avg Carbs */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-amber-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                <span>معدل الكاربوهيدرات اليومي</span>
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {Math.round((avgDailyCarbs / targetDailyCarbs) * 100)}% من الهدف
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-white">{avgDailyCarbs}g</span>
              <span className="text-[11px] font-bold text-neutral-400">المطلوب: {targetDailyCarbs}g</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((avgDailyCarbs / targetDailyCarbs) * 100))}%` }}
              />
            </div>
          </div>

          {/* Daily Avg Fat */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-orange-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>معدل الدهون اليومي</span>
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20">
                {Math.round((avgDailyFat / targetDailyFat) * 100)}% من الهدف
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-white">{avgDailyFat}g</span>
              <span className="text-[11px] font-bold text-neutral-400">المطلوب: {targetDailyFat}g</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-orange-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((avgDailyFat / targetDailyFat) * 100))}%` }}
              />
            </div>
          </div>

          {/* Daily Avg Calories */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-sky-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>معدل السعرات اليومي</span>
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                {Math.round((avgDailyCalories / targetDailyCalories) * 100)}% من الهدف
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-white">{avgDailyCalories} <span className="text-xs font-medium text-neutral-400">سعرة</span></span>
              <span className="text-[11px] font-bold text-neutral-400">المطلوب: {targetDailyCalories}</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((avgDailyCalories / targetDailyCalories) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Key Highlights & Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 font-bold block">أيام التسجيل التراكمي</span>
            <span className="text-sm font-black text-white">
              {displayLoggedDays} من أصل {daysInMonth} يوماً 🔥
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-400 font-bold block">إجمالي الوجبات المسجلة</span>
            <span className="text-sm font-black text-white">{displayMealsCount} وجبة طعام 🍽️</span>
          </div>
        </div>
      </div>
    </div>
  );
};
