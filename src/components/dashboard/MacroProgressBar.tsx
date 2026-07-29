import React from 'react';
import { Flame, Beef, Wheat, Droplet, Candy } from 'lucide-react';
import { UserProfile } from '../../types';

interface MacroProgressBarProps {
  profile: UserProfile;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugar?: number;
  };
}

export const MacroProgressBar: React.FC<MacroProgressBarProps> = ({ profile, totals }) => {
  const calGoal = profile.dailyCalorieGoal || 2400;
  const protGoal = profile.dailyProteinGoalG || 160;
  const carbsGoal = profile.dailyCarbsGoalG || 220;
  const fatGoal = profile.dailyFatGoalG || 70;
  const sugarLimit = profile.dailySugarLimitG || 50;

  const currentCal = Math.round(totals.calories);
  const currentProt = Number(totals.protein.toFixed(1));
  const currentCarbs = Number(totals.carbs.toFixed(1));
  const currentFat = Number(totals.fat.toFixed(1));
  const currentSugar = Number((totals.sugar || 0).toFixed(1));

  const calPct = Math.min(100, Math.round((currentCal / calGoal) * 100));
  const protPct = Math.min(100, Math.round((currentProt / protGoal) * 100));
  const carbsPct = Math.min(100, Math.round((currentCarbs / carbsGoal) * 100));
  const fatPct = Math.min(100, Math.round((currentFat / fatGoal) * 100));
  const sugarPct = Math.min(100, Math.round((currentSugar / sugarLimit) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Calories Card */}
      <div className="bg-neutral-800/90 border border-sky-500/30 rounded-2xl p-4 shadow-lg hover:border-sky-500/50 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 font-cairo">
            <Flame className="w-4 h-4 text-sky-400" /> السعرات الحرارية
          </span>
          <span className="text-xs font-extrabold text-sky-400 font-cairo">{calPct}%</span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-black text-white font-cairo">{currentCal}</span>
          <span className="text-xs text-neutral-400 font-medium">من {calGoal} كالوري</span>
        </div>

        <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-sky-500/50"
            style={{ width: `${calPct}%` }}
          />
        </div>
      </div>

      {/* 2. Protein Card */}
      <div className="bg-neutral-800/90 border border-green-500/30 rounded-2xl p-4 shadow-lg hover:border-green-500/50 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 font-cairo">
            <Beef className="w-4 h-4 text-green-400" /> البروتين
          </span>
          <span className="text-xs font-extrabold text-green-400 font-cairo">{protPct}%</span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-black text-white font-cairo">{currentProt}</span>
          <span className="text-xs text-neutral-400 font-medium">من {protGoal} جرام</span>
        </div>

        <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-green-500/50"
            style={{ width: `${protPct}%` }}
          />
        </div>
      </div>

      {/* 3. Carbs Card */}
      <div className="bg-neutral-800/90 border border-amber-500/30 rounded-2xl p-4 shadow-lg hover:border-amber-500/50 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 font-cairo">
            <Wheat className="w-4 h-4 text-amber-400" /> الكاربوهيدرات
          </span>
          <span className="text-xs font-extrabold text-amber-400 font-cairo">{carbsPct}%</span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-black text-white font-cairo">{currentCarbs}</span>
          <span className="text-xs text-neutral-400 font-medium">من {carbsGoal} جرام</span>
        </div>

        <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 shadow-sm shadow-amber-500/50"
            style={{ width: `${carbsPct}%` }}
          />
        </div>
      </div>

      {/* 4. Fat Card */}
      <div className="bg-neutral-800/90 border border-orange-500/30 rounded-2xl p-4 shadow-lg hover:border-orange-500/50 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 font-cairo">
            <Droplet className="w-4 h-4 text-orange-400" /> الدهون
          </span>
          <span className="text-xs font-extrabold text-orange-400 font-cairo">{fatPct}%</span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-black text-white font-cairo">{currentFat}</span>
          <span className="text-xs text-neutral-400 font-medium">من {fatGoal} جرام</span>
        </div>

        <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500 shadow-sm shadow-orange-500/50"
            style={{ width: `${fatPct}%` }}
          />
        </div>
      </div>

      {/* 5. Sugar Tracking Card (Distinct Rose/Pink Design) */}
      <div className="bg-neutral-800/90 border border-rose-500/30 rounded-2xl p-4 shadow-lg hover:border-rose-500/50 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 font-cairo">
            <Candy className="w-4 h-4 text-rose-400" /> السكريات
          </span>
          <span className={`text-xs font-extrabold font-cairo ${sugarPct > 100 ? 'text-red-400' : 'text-rose-400'}`}>
            {sugarPct}%
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-black text-white font-cairo">{currentSugar}</span>
          <span className="text-xs text-neutral-400 font-medium">حد أقصى {sugarLimit}g</span>
        </div>

        <div className="w-full bg-neutral-900 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 shadow-sm ${
              sugarPct > 100
                ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-red-500/50 animate-pulse'
                : 'bg-gradient-to-r from-rose-500 to-pink-400 shadow-rose-500/50'
            }`}
            style={{ width: `${sugarPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
