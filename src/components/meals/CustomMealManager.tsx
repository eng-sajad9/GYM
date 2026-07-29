import React, { useState } from 'react';
import { X, Plus, Trash2, Utensils } from 'lucide-react';
import { CustomMeal } from '../../types';
import { normalizeArabicText } from '../../utils/arabicNormalizer';

interface CustomMealManagerProps {
  isOpen: boolean;
  onClose: () => void;
  customMeals: CustomMeal[];
  onSaveCustomMeal: (meal: Omit<CustomMeal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDeleteCustomMeal: (id: string) => Promise<void>;
  userId: string;
}

export const CustomMealManager: React.FC<CustomMealManagerProps> = ({
  isOpen,
  onClose,
  customMeals,
  onSaveCustomMeal,
  onDeleteCustomMeal,
  userId,
}) => {
  const [nameAr, setNameAr] = useState('');
  const [servingSizeG, setServingSizeG] = useState<number>(100);
  const [calories, setCalories] = useState<number>(0);
  const [proteinG, setProteinG] = useState<number>(0);
  const [carbsG, setCarbsG] = useState<number>(0);
  const [fatG, setFatG] = useState<number>(0);
  const [sugarG, setSugarG] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSaveCustomMeal({
        userId,
        nameAr: nameAr.trim(),
        normalizedNameAr: normalizeArabicText(nameAr.trim()),
        servingSizeG: Number(servingSizeG),
        calories: Number(calories),
        proteinG: Number(proteinG),
        carbsG: Number(carbsG),
        fatG: Number(fatG),
        sugarG: Number(sugarG),
      });

      // Reset form
      setNameAr('');
      setCalories(0);
      setProteinG(0);
      setCarbsG(0);
      setFatG(0);
      setSugarG(0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-800 border border-neutral-700 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-700/80 flex items-center justify-between bg-neutral-800/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-cairo">الوجبات المخصصة</h3>
              <p className="text-xs text-neutral-400">أضف وجباتك المفضلة لتجاوز الاستعلام وتخزينها محلياً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add New Custom Meal Form */}
          <form onSubmit={handleSubmit} className="bg-neutral-900/90 border border-neutral-700/60 rounded-2xl p-4 space-y-4">
            <h4 className="text-sm font-bold text-neutral-200 font-cairo flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-400" /> إضافة وجبة مخصصة جديدة
            </h4>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">اسم الوجبة (بالعربية)</label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: شيك بروتين الموز أو كباب دجاج عراقي"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">الحجم (غرام)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={servingSizeG}
                  onChange={(e) => setServingSizeG(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">السعرات</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">البروتين (g)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  value={proteinG}
                  onChange={(e) => setProteinG(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-green-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">الكارب (g)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  value={carbsG}
                  onChange={(e) => setCarbsG(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">الدهون (g)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  value={fatG}
                  onChange={(e) => setFatG(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 mb-1">السكريات (g)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  value={sugarG}
                  onChange={(e) => setSugarG(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !nameAr.trim()}
              className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-neutral-950 font-bold text-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ الوجبة المخصصة'}
            </button>
          </form>

          {/* List of Existing Custom Meals */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">الوجبات المخصصة المخزنة</h4>
            {customMeals.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-4">لا توجد وجبات مخصصة مخزنة بعد</p>
            ) : (
              customMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900 border border-neutral-700/60 hover:border-neutral-600 transition-all"
                >
                  <div>
                    <h5 className="text-sm font-bold text-white font-cairo">{meal.nameAr}</h5>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                      <span>{meal.servingSizeG} غرام</span>
                      <span>•</span>
                      <span className="text-sky-400 font-semibold">{meal.calories} كالوري</span>
                      <span>•</span>
                      <span className="text-green-400">P: {meal.proteinG}g</span>
                      <span>•</span>
                      <span className="text-amber-400">C: {meal.carbsG}g</span>
                      <span>•</span>
                      <span className="text-orange-400">F: {meal.fatG}g</span>
                      <span>•</span>
                      <span className="text-rose-400">S: {meal.sugarG || 0}g</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteCustomMeal(meal.id)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
