import React, { useState } from 'react';
import { X, Calculator, Target, Check, Sparkles, Bot, HelpCircle } from 'lucide-react';
import { UserProfile } from '../../types';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void>;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'calculator'>('calculator');

  // Manual goals state
  const [fullName, setFullName] = useState(profile.fullName);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(profile.dailyCalorieGoal);
  const [dailyProteinGoalG, setDailyProteinGoalG] = useState(profile.dailyProteinGoalG);
  const [dailyCarbsGoalG, setDailyCarbsGoalG] = useState(profile.dailyCarbsGoalG);
  const [dailyFatGoalG, setDailyFatGoalG] = useState(profile.dailyFatGoalG);
  const [dailySugarLimitG, setDailySugarLimitG] = useState(profile.dailySugarLimitG || 50);
  const [telegramChatId, setTelegramChatId] = useState<string>(profile.telegramChatId ? String(profile.telegramChatId) : '');

  // Calculator inputs (Mifflin-St Jeor)
  const [weightKg, setWeightKg] = useState(75);
  const [heightCm, setHeightCm] = useState(175);
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activityLevel, setActivityLevel] = useState<number>(1.55);
  const [fitnessGoal, setFitnessGoal] = useState<'cut' | 'maintain' | 'bulk'>('maintain');

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const calculateMacros = () => {
    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
    bmr = gender === 'male' ? bmr + 5 : bmr - 161;

    let tdee = bmr * activityLevel;
    if (fitnessGoal === 'cut') tdee -= 500;
    if (fitnessGoal === 'bulk') tdee += 400;

    const recCalories = Math.round(tdee);
    const recProtein = Math.round(weightKg * 2.0);
    const recFat = Math.round((recCalories * 0.25) / 9);
    const remainingCal = recCalories - (recProtein * 4 + recFat * 9);
    const recCarbs = Math.max(50, Math.round(remainingCal / 4));
    const recSugar = Math.min(50, Math.round((recCalories * 0.08) / 4));

    return { recCalories, recProtein, recCarbs, recFat, recSugar };
  };

  const handleApplyCalculated = () => {
    const { recCalories, recProtein, recCarbs, recFat, recSugar } = calculateMacros();
    setDailyCalorieGoal(recCalories);
    setDailyProteinGoalG(recProtein);
    setDailyCarbsGoalG(recCarbs);
    setDailyFatGoalG(recFat);
    setDailySugarLimitG(recSugar);
    setActiveTab('manual');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await onUpdateProfile({
        fullName: fullName.trim(),
        dailyCalorieGoal: Number(dailyCalorieGoal),
        dailyProteinGoalG: Number(dailyProteinGoalG),
        dailyCarbsGoalG: Number(dailyCarbsGoalG),
        dailyFatGoalG: Number(dailyFatGoalG),
        dailySugarLimitG: Number(dailySugarLimitG),
        telegramChatId: telegramChatId.trim() ? Number(telegramChatId.trim()) : null,
      });

      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const calculated = calculateMacros();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-950/80 backdrop-blur-sm animate-fade-in font-cairo dir-rtl">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">إعدادات الملف الشخصي والأهداف الرياضية</h3>
              <p className="text-[11px] text-neutral-400">حدد أهداف السعرات، البروتين، الكارب، الدهون والسكريات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 p-2 gap-2">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
              activeTab === 'calculator'
                ? 'bg-green-500 text-neutral-950 shadow-md shadow-green-500/20 font-black'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Calculator className="w-4 h-4 shrink-0" />
            <span>حاسبة الاحتياج الرياضي</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
              activeTab === 'manual'
                ? 'bg-green-500 text-neutral-950 shadow-md shadow-green-500/20 font-black'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Target className="w-4 h-4 shrink-0" />
            <span>تعديل الأهداف المباشرة</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'calculator' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">الوزن الحالي (كغم)</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-3.5 h-12 text-base text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">الطول (سم)</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-3.5 h-12 text-base text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">العمر</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-3.5 h-12 text-base text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">الجنس</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-3.5 h-12 text-base text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="male">ذكر ♂</option>
                    <option value="female">أنثى ♀</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">مستوى النشاط الأسبوعي</label>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-3.5 h-12 text-base text-white focus:outline-none focus:border-green-500"
                  >
                    <option value={1.2}>خامل (بدون تمارين)</option>
                    <option value={1.375}>خفيف (1-3 أيام/أسبوع)</option>
                    <option value={1.55}>متوسط (3-5 أيام/أسبوع)</option>
                    <option value={1.725}>عالي (6-7 أيام/أسبوع)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">الهدف الرياضي الحالي</label>
                  <select
                    value={fitnessGoal}
                    onChange={(e) => setFitnessGoal(e.target.value as 'cut' | 'maintain' | 'bulk')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-3.5 h-12 text-base text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="cut">تنشيف وخسارة دهون 🔥</option>
                    <option value="maintain">ثبات الوزن ⚖️ (صيانة)</option>
                    <option value="bulk">تضخيم وبناء عضل 🏋️‍♂️</option>
                  </select>
                </div>
              </div>

              {/* Recommendation Box */}
              <div className="bg-neutral-950 border border-green-500/30 rounded-3xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1.5 font-cairo">
                    <Sparkles className="w-4 h-4" /> النتائج المحسوبة بدقة علمية
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="p-2.5 bg-neutral-900 rounded-2xl border border-sky-500/30">
                    <span className="text-[10px] text-neutral-400 block font-bold">السعرات</span>
                    <span className="text-base font-black text-sky-400">{calculated.recCalories}</span>
                    <span className="text-[9px] text-neutral-500 block">كالوري</span>
                  </div>

                  <div className="p-2.5 bg-neutral-900 rounded-2xl border border-green-500/30">
                    <span className="text-[10px] text-neutral-400 block font-bold">البروتين</span>
                    <span className="text-base font-black text-green-400">{calculated.recProtein}</span>
                    <span className="text-[9px] text-neutral-500 block">جرام</span>
                  </div>

                  <div className="p-2.5 bg-neutral-900 rounded-2xl border border-amber-500/30">
                    <span className="text-[10px] text-neutral-400 block font-bold">الكارب</span>
                    <span className="text-base font-black text-amber-400">{calculated.recCarbs}</span>
                    <span className="text-[9px] text-neutral-500 block">جرام</span>
                  </div>

                  <div className="p-2.5 bg-neutral-900 rounded-2xl border border-orange-500/30">
                    <span className="text-[10px] text-neutral-400 block font-bold">الدهون</span>
                    <span className="text-base font-black text-orange-400">{calculated.recFat}</span>
                    <span className="text-[9px] text-neutral-500 block">جرام</span>
                  </div>

                  <div className="p-2.5 bg-neutral-900 rounded-2xl border border-rose-500/30">
                    <span className="text-[10px] text-neutral-400 block font-bold">السكريات</span>
                    <span className="text-base font-black text-rose-400">{calculated.recSugar}</span>
                    <span className="text-[9px] text-neutral-500 block">حد أقصى</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyCalculated}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-400 hover:to-emerald-300 text-neutral-950 font-black text-xs shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>اعتماد الأهداف وتطبيقها</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الكامل (مثال: أحمد محمد)"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-3.5 h-12 text-base text-neutral-100 focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">السعرات</label>
                  <input
                    type="number"
                    required
                    min="500"
                    value={dailyCalorieGoal}
                    onChange={(e) => setDailyCalorieGoal(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-2 h-12 text-base text-neutral-100 focus:outline-none focus:border-sky-400 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">البروتين (ج)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={dailyProteinGoalG}
                    onChange={(e) => setDailyProteinGoalG(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-2 h-12 text-base text-neutral-100 focus:outline-none focus:border-green-400 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">الكارب (ج)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={dailyCarbsGoalG}
                    onChange={(e) => setDailyCarbsGoalG(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-2 h-12 text-base text-neutral-100 focus:outline-none focus:border-amber-400 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">الدهون (ج)</label>
                  <input
                    type="number"
                    required
                    min="5"
                    value={dailyFatGoalG}
                    onChange={(e) => setDailyFatGoalG(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-2 h-12 text-base text-neutral-100 focus:outline-none focus:border-orange-400 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">السكريات</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={dailySugarLimitG}
                    onChange={(e) => setDailySugarLimitG(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-2 h-12 text-base text-neutral-100 focus:outline-none focus:border-rose-400 text-center"
                  />
                </div>
              </div>

              {/* Improved Telegram Chat ID Field with Clear Helper Text Box */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-sky-400" />
                  <span>معرف تليجرام الشخصي (Telegram Chat ID)</span>
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="مثال: 651561282"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-3.5 h-12 text-base text-neutral-100 focus:outline-none focus:border-sky-400 font-mono"
                />

                {/* Helper Text Card */}
                <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-800/40 text-sky-300 text-[11px] leading-relaxed flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">كيف تحصل على الرقم؟</span>
                    <span>
                      للحصول على معرفك، ابحث عن البوت <strong className="text-white font-mono bg-sky-900/60 px-1.5 py-0.5 rounded">@userinfobot</strong> في تليجرام وأرسل له أي رسالة، ثم انسخ الرقم المحدد في حقل Id وضعه هنا.
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full h-12 rounded-2xl bg-green-500 hover:bg-green-400 text-neutral-950 font-black text-xs transition-all disabled:opacity-50 mt-4"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
