import React from 'react';
import { Calendar, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';

interface DateSelectorProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
}

export const DateSelector: React.FC<DateSelectorProps> = ({ selectedDate, onDateChange }) => {
  const todayStr = new Date().toISOString().split('T')[0]!;
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0]!;

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split('T')[0]!);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split('T')[0]!);
  };

  // Format Arabic Date
  const formattedArabicDate = new Date(selectedDate).toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isToday = selectedDate === todayStr;
  const isYesterday = selectedDate === yesterdayStr;

  return (
    <div className="bg-neutral-800/90 border border-neutral-700/80 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
      {/* Date Title & Calendar Badge */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white font-cairo">{formattedArabicDate}</h3>
            {isToday && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-green-500/20 text-green-400 border border-green-500/30">
                اليوم
              </span>
            )}
            {isYesterday && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                الأمس
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400">تصفح سجلات الأيام الماضية وتحديد التاريخ المطلوبة</p>
        </div>
      </div>

      {/* Date Controls & Input */}
      <div className="flex items-center gap-2">
        {/* Native Calendar Input Picker */}
        <div className="relative">
          <input
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-neutral-200 font-semibold focus:outline-none focus:border-green-500 cursor-pointer"
          />
        </div>

        {/* Quick Buttons */}
        <button
          onClick={() => onDateChange(todayStr)}
          disabled={isToday}
          className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-green-400 hover:border-green-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="العودة لليوم الحالي"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Prev / Next Arrows */}
        <div className="flex items-center bg-neutral-900 border border-neutral-700 rounded-xl p-0.5">
          <button
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="اليوم السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-neutral-800"></div>
          <button
            onClick={handleNextDay}
            disabled={isToday}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="اليوم التالي"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
