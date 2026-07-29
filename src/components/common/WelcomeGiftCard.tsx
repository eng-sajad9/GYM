import React, { useState } from 'react';
import { Gift, Sparkles, X, CheckCircle2, Zap } from 'lucide-react';

interface WelcomeGiftCardProps {
  userName: string;
  daysRemaining?: number;
}

export const WelcomeGiftCard: React.FC<WelcomeGiftCardProps> = ({ userName, daysRemaining = 5 }) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  if (!isVisible) return null;

  return (
    <div className="w-full bg-gradient-to-r from-amber-950/80 via-neutral-900 to-emerald-950/80 border border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden animate-fade-in font-cairo dir-rtl my-4">
      {/* Decorative Glow background */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Dismiss Button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-3 left-3 p-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all min-w-[32px] min-h-[32px] flex items-center justify-center"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3.5 pr-1">
        {/* Gift Icon Box */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10 mt-0.5">
          <Gift className="w-6 h-6 animate-pulse text-amber-400" />
        </div>

        <div className="space-y-2 flex-1 pl-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-black text-white">
              أهلاً بك يا {userName}! 🎁
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>هدية 5 أيام مجانية</span>
            </span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed font-medium">
            تم تفعيل اشتراكك المجاني بنجاح! يمكنك الآن تسجيل وجباتك، تتبع السعرات والماكروز، ومتابعة تطورك اليومي بكل سهولة.
          </p>

          {/* Quick Perks */}
          <div className="flex items-center gap-4 text-[11px] text-neutral-300 pt-1 font-bold flex-wrap">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>تسجيل غير محدود للوجبات</span>
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>متبقي: {daysRemaining} أيام</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
