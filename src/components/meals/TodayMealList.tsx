import React, { useState } from 'react';
import {
  Clock,
  Globe,
  Bot,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  Pencil,
  X,
  Check,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { MealType } from '../../types';
import { MealService } from '../../services/mealService';

export interface DatabaseMealLog {
  id: string;
  logged_at: string;
  meal_type: string;
  source: string;
  raw_input_ar: string;
  normalized_input_ar: string;
  translated_input_en: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_sugar_g?: number;
  meal_items?: Array<{
    id: string;
    name_ar?: string;
    name_en: string;
    serving_size_g: number;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    sugar_g?: number;
  }>;
}

interface TodayMealListProps {
  mealLogs: DatabaseMealLog[];
  onDeleteMealLog: (id: string) => Promise<void>;
  onUpdateMealLog: (
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
  ) => Promise<void>;
  selectedDate: string;
}

export const TodayMealList: React.FC<TodayMealListProps> = ({
  mealLogs,
  onDeleteMealLog,
  onUpdateMealLog,
  selectedDate,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<DatabaseMealLog | null>(null);

  const [editInputAr, setEditInputAr] = useState('');
  const [editMealType, setEditMealType] = useState<MealType>('lunch');
  const [editCalories, setEditCalories] = useState<number>(0);
  const [editProtein, setEditProtein] = useState<number>(0);
  const [editCarbs, setEditCarbs] = useState<number>(0);
  const [editFat, setEditFat] = useState<number>(0);
  const [editSugar, setEditSugar] = useState<number>(0);
  const [reAnalyze, setReAnalyze] = useState<boolean>(true);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const startEdit = (log: DatabaseMealLog) => {
    setEditingMeal(log);
    setEditInputAr(log.raw_input_ar);
    setEditMealType((log.meal_type as MealType) || 'other');
    setEditCalories(Math.round(log.total_calories));
    setEditProtein(Number(log.total_protein_g));
    setEditCarbs(Number(log.total_carbs_g));
    setEditFat(Number(log.total_fat_g));
    setEditSugar(Number(log.total_sugar_g || 0));
    setReAnalyze(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeal || isSubmittingEdit) return;

    setIsSubmittingEdit(true);
    try {
      await onUpdateMealLog(editingMeal.id, {
        rawInputAr: editInputAr.trim(),
        mealType: editMealType,
        totalCalories: Number(editCalories),
        totalProteinG: Number(editProtein),
        totalCarbsG: Number(editCarbs),
        totalFatG: Number(editFat),
        totalSugarG: Number(editSugar),
        reAnalyzeWithEdamam: reAnalyze,
      });

      setEditingMeal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const getMealTypeBadge = (type: string) => {
    switch (type) {
      case 'breakfast': return { label: '🥣 إفطار', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'lunch': return { label: '🍗 غداء', bg: 'bg-green-500/10 text-green-400 border-green-500/20' };
      case 'dinner': return { label: '🥗 عشاء', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20' };
      case 'snack': return { label: '🍎 سناك', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      default: return { label: '🍽️ وجبة', bg: 'bg-neutral-700/40 text-neutral-300 border-neutral-600/30' };
    }
  };

  const formattedDateTitle = new Date(selectedDate).toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  if (mealLogs.length === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center font-cairo dir-rtl">
        <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 mx-auto flex items-center justify-center text-neutral-500 mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-neutral-300">لا توجد وجبات مسجلة يوم {formattedDateTitle}</h3>
        <p className="text-xs text-neutral-500 mt-1">استخدم نموذج الإدخال أعلاه لتسجيل وجباتك وسيقوم النظام بتفصيلها تلقائياً</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-xl relative font-cairo dir-rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">سجل وجبات {formattedDateTitle}</h3>
            <p className="text-xs text-neutral-400">{mealLogs.length} وجبات مسجلة</p>
          </div>
        </div>
      </div>

      {/* Meal Log Cards */}
      <div className="space-y-3">
        {mealLogs.map((log) => {
          const badge = getMealTypeBadge(log.meal_type);
          const isExpanded = expandedId === log.id;
          const formattedTime = new Date(log.logged_at).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={log.id}
              className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden transition-all hover:border-neutral-700 shadow-md"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-xl border border-neutral-800">
                      <Clock className="w-3 h-3 text-neutral-400" /> {formattedTime}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-xl border border-neutral-800">
                      {log.source === 'telegram' ? <Bot className="w-3 h-3 text-sky-400" /> : <Globe className="w-3 h-3 text-green-400" />}
                      {log.source === 'telegram' ? 'تليجرام' : 'التطبيق'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(log)}
                      className="p-2 rounded-xl text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all active:scale-95"
                      title="تعديل الوجبة"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteMealLog(log.id)}
                      className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 border border-neutral-800 transition-all active:scale-95"
                      title="حذف الوجبة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="cursor-pointer" onClick={() => toggleExpand(log.id)}>
                  <h4 className="text-sm sm:text-base font-black text-white leading-relaxed hover:text-green-400 transition-colors">
                    {log.raw_input_ar}
                  </h4>
                </div>

                {/* Macro & Sugar Pills in Clean Arabic */}
                <div
                  className="flex items-center justify-between bg-neutral-900 p-3 rounded-2xl border border-neutral-800 cursor-pointer"
                  onClick={() => toggleExpand(log.id)}
                >
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-sky-400">
                      {Number(log.total_calories).toFixed(0)}
                    </span>
                    <span className="text-xs text-neutral-400 font-bold">كالوري</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold flex-wrap">
                    <span className="text-green-400 bg-green-500/10 px-2.5 py-1 rounded-xl border border-green-500/20">
                      بروتين: {Number(log.total_protein_g).toFixed(1)}ج
                    </span>
                    <span className="text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                      كارب: {Number(log.total_carbs_g).toFixed(1)}ج
                    </span>
                    <span className="text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-xl border border-orange-500/20">
                      دهون: {Number(log.total_fat_g).toFixed(1)}ج
                    </span>
                    <span className="text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20">
                      سكر: {Number(log.total_sugar_g || 0).toFixed(1)}ج
                    </span>
                  </div>

                  <div className="text-neutral-500 pl-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-green-400" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-neutral-800 bg-neutral-950 space-y-3 text-xs">
                  {log.meal_items && log.meal_items.length > 0 && (
                    <div>
                      <span className="text-neutral-400 font-bold block mb-2 text-xs">مكونات الوجبة بالتفصيل:</span>
                      <div className="space-y-2">
                        {log.meal_items.map((item, idx) => {
                          const cleanArabicName = MealService.cleanFoodNameArabic(item.name_ar, item.name_en);
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex-wrap gap-2">
                              <span className="font-bold text-white text-xs">
                                {cleanArabicName} <span className="text-neutral-400 font-normal text-[11px]">({item.serving_size_g} جرام)</span>
                              </span>
                              <div className="flex items-center gap-2 font-bold text-[11px] flex-wrap">
                                <span className="text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">{item.calories} كالوري</span>
                                <span className="text-green-400">بروتين {item.protein_g}ج</span>
                                <span className="text-amber-400">كارب {item.carbs_g}ج</span>
                                <span className="text-orange-400">دهون {item.fat_g}ج</span>
                                <span className="text-rose-400">سكر {item.sugar_g || 0}ج</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Meal Modal */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">تعديل الوجبة والكميات</h3>
                  <p className="text-xs text-neutral-400">صحح الوصف أو عدل قيم الماكروز يدوياً</p>
                </div>
              </div>
              <button
                onClick={() => setEditingMeal(null)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">وصف الوجبة باللغة العربية</label>
                <textarea
                  value={editInputAr}
                  onChange={(e) => setEditInputAr(e.target.value)}
                  rows={2}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 text-base text-neutral-100 focus:outline-none focus:border-amber-400 resize-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">نوع الوجبة</label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: 'breakfast', label: '🥣 إفطار' },
                    { id: 'lunch', label: '🍗 غداء' },
                    { id: 'dinner', label: '🥗 عشاء' },
                    { id: 'snack', label: '🍎 سناك' },
                    { id: 'other', label: '🍽️ آخر' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setEditMealType(t.id as MealType)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 min-h-[40px] ${
                        editMealType === t.id
                          ? 'bg-amber-400 text-neutral-950 shadow-md font-black'
                          : 'bg-neutral-950 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-400" />
                  <div>
                    <span className="text-xs font-bold text-neutral-200 block">إعادة التحليل الآلي التلقائي</span>
                    <span className="text-[10px] text-neutral-400 block">إعادة احتساب القيم التغذوية للوصف المعدل</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reAnalyze}
                  onChange={(e) => setReAnalyze(e.target.checked)}
                  className="w-5 h-5 accent-green-500 rounded cursor-pointer"
                />
              </div>

              {!reAnalyze && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 mb-1">السعرات</label>
                    <input
                      type="number"
                      value={editCalories}
                      onChange={(e) => setEditCalories(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-2 h-12 text-base text-neutral-100 focus:outline-none focus:border-sky-400 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 mb-1">البروتين</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editProtein}
                      onChange={(e) => setEditProtein(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-2 h-12 text-base text-neutral-100 focus:outline-none focus:border-green-400 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 mb-1">الكارب</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editCarbs}
                      onChange={(e) => setEditCarbs(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-2 h-12 text-base text-neutral-100 focus:outline-none focus:border-amber-400 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 mb-1">الدهون</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editFat}
                      onChange={(e) => setEditFat(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-2 h-12 text-base text-neutral-100 focus:outline-none focus:border-orange-400 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 mb-1">السكريات</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editSugar}
                      onChange={(e) => setEditSugar(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-2 h-12 text-base text-neutral-100 focus:outline-none focus:border-rose-400 text-center"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  disabled={isSubmittingEdit || !editInputAr.trim()}
                  className="flex-1 h-12 rounded-2xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>جاري تحديث الوجبة...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ التعديلات والتحديث</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
