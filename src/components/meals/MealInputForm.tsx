import React, { useState } from 'react';
import { Send, Loader2, Sparkles, Calendar, Lock } from 'lucide-react';
import { MealType } from '../../types';

interface MealInputFormProps {
  onAddMeal: (rawInputAr: string, mealType: MealType) => Promise<void>;
  isLoading: boolean;
  selectedDate: string;
  isSubscriptionExpired?: boolean;
  onOpenRenewModal?: () => void;
}

export const MealInputForm: React.FC<MealInputFormProps> = ({
  onAddMeal,
  isLoading,
  selectedDate,
  isSubscriptionExpired = false,
  onOpenRenewModal,
}) => {
  const [input, setInput] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');

  const todayStr = new Date().toISOString().split('T')[0]!;
  const isToday = selectedDate === todayStr;

  const examples = [
    '2 بيض مسلوق 100 غرام مع 50 غرام خبز',
    '150 غرام صدر دجاج مشوي مع 175 غرام تمن',
    '200 غرام شاورما لحم',
    '50 غرام شوفان مع 200 مل حليب',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubscriptionExpired) {
      if (onOpenRenewModal) onOpenRenewModal();
      return;
    }
    if (!input.trim() || isLoading) return;
    await onAddMeal(input.trim(), mealType);
    setInput('');
  };

  const handleSelectExample = (ex: string) => {
    if (isSubscriptionExpired) {
      if (onOpenRenewModal) onOpenRenewModal();
      return;
    }
    setInput(ex);
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('ar-EG', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden font-cairo dir-rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 shrink-0">
            <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">تسجيل وجبة جديد بالنص الطبيعي</h2>
            <p className="text-[11px] text-neutral-400">اكتب وجبتك بلغتك اليومية، وسيتم احتساب قيمها الغذائية وتفصيلها تلقائياً</p>
          </div>
        </div>

        {!isToday && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            <span>تسجيل بتاريخ: {formattedDate}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Meal Type Selection Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'breakfast', label: '🥣 إفطار' },
            { id: 'lunch', label: '🍗 غداء' },
            { id: 'dinner', label: '🥗 عشاء' },
            { id: 'snack', label: '🍎 سناك' },
            { id: 'other', label: '🍽️ آخر' },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setMealType(tab.id as MealType)}
              disabled={isSubscriptionExpired}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 min-h-[40px] ${
                mealType === tab.id
                  ? 'bg-green-500 text-neutral-950 shadow-md shadow-green-500/20 font-black'
                  : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-neutral-800'
              } ${isSubscriptionExpired ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Textarea Input */}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isSubscriptionExpired
                ? 'انتهت صلاحية الاشتراك... تصفح السجلات متاح، لكن الخدمة التفاعلية لتسجيل الوجبات مغلقة لحين التجديد.'
                : 'مثال: أكلت 150 غرام صدر دجاج مشوي مع 175 غرام تمن...'
            }
            rows={3}
            disabled={isLoading || isSubscriptionExpired}
            className={`w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-4 pb-14 text-base text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-all resize-none font-medium leading-relaxed ${
              isSubscriptionExpired ? 'opacity-60 cursor-not-allowed border-amber-500/30' : ''
            }`}
          />

          {isSubscriptionExpired ? (
            <button
              type="button"
              onClick={onOpenRenewModal}
              className="absolute bottom-3 left-3 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs shadow-lg transition-all active:scale-95 min-h-[44px]"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>تجديد الاشتراك للتسجيل</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute bottom-3 left-3 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-400 hover:to-emerald-300 text-neutral-950 font-black text-xs shadow-lg shadow-green-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري حساب القيم والتسجيل...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>تسجيل الوجبة</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Localized Quick Example Chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
          <span className="text-neutral-500 font-bold text-[11px]">أمثلة سريعة:</span>
          {examples.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectExample(ex)}
              disabled={isSubscriptionExpired}
              className={`px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-green-400 border border-neutral-800 transition-colors text-[11px] min-h-[36px] ${
                isSubscriptionExpired ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              "{ex}"
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};
