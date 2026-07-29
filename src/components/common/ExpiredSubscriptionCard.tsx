import { Clock, ShieldAlert, Crown, Lock } from 'lucide-react';

interface ExpiredSubscriptionCardProps {
  trialEndDate?: string;
  accountStatus?: string;
  onOpenRenewModal: () => void;
}

export const ExpiredSubscriptionCard: React.FC<ExpiredSubscriptionCardProps> = ({
  trialEndDate,
  accountStatus,
  onOpenRenewModal,
}) => {
  const formattedEndDate = trialEndDate
    ? new Date(trialEndDate).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'غير محدد';

  const isBlocked = accountStatus === 'blocked';
  const isPaused = accountStatus === 'paused';

  const statusLabel = isBlocked
    ? 'حساب محظور'
    : isPaused
    ? 'اشتراك موقوف مؤقتاً'
    : 'اشتراك منتهي';

  const titleText = isBlocked
    ? 'تنبيه: تم حظر هذا الحساب 🚫'
    : isPaused
    ? 'تنبيه: تم إيقاف اشتراكك مؤقتاً ⏸️'
    : 'تنبيه: انتهت مدة صلاحية الاشتراك ⚠️';

  const descriptionText = isBlocked
    ? 'تم تعطيل هذا الحساب بقرار إداري. يرجى التواصل مع الإدارة للتفاصيل.'
    : isPaused
    ? 'تم إيقاف احتساب أيام اشتراكك مؤقتاً بناءً على طلبك أو بقرار إداري. يمكنك تصفح جميع وجباتك السابقة، وساعات اشتراكك محفوظة بالكامل حتى تطلب الاستئناف.'
    : 'يمكنك تصفح جميع سجلاتك ورسوماتك البيانية السابقة، ولكن خدمة تسجيل الوجبات الجديدة متوقفة مؤقتاً.';

  const buttonText = isPaused ? 'تواصل لاستئناف الاشتراك ✨' : 'تجديد الاشتراك الآن ✨';

  return (
    <div className="bg-gradient-to-br from-amber-950/40 via-neutral-950/50 to-neutral-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-md font-cairo dir-rtl relative overflow-hidden animate-fade-in">
      {/* Background Ambient Glow */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Top Header & Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {titleText}
                </h3>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {statusLabel}
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                {descriptionText}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenRenewModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-black text-xs shadow-xl shadow-amber-500/20 transition-all active:scale-95 shrink-0 min-h-[44px]"
          >
            <Crown className="w-4 h-4 text-neutral-950" />
            <span>{buttonText}</span>
          </button>
        </div>

        {/* Info Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs">
            <div className="flex items-center gap-2 text-neutral-400">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>تاريخ انتهاء الصلاحية:</span>
            </div>
            <span className="font-bold text-amber-300">{formattedEndDate}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs">
            <div className="flex items-center gap-2 text-neutral-400">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>حالة تسجيل الوجبات:</span>
            </div>
            <span className="font-bold text-amber-400">
              {isPaused ? 'موقوف مؤقتاً (أيامك محفوظة)' : 'معطل مؤقتاً لحين التجديد'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
