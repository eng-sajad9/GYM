import { X, Crown, Sparkles, Send, CheckCircle2 } from 'lucide-react';

interface RenewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RenewSubscriptionModal: React.FC<RenewSubscriptionModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const telegramBotUrl = 'https://t.me/emg_s';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-md animate-fade-in font-cairo dir-rtl">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-5 p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">تجديد الاشتراك والترقية</h3>
              <p className="text-[11px] text-neutral-400">استعد إمكانية تسجيل وجباتك وتتبع سعراتك فوراً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Benefits List */}
        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-2 text-xs">
          <h4 className="font-bold text-amber-400 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4" />
            <span>مميزات تجديد الاشتراك:</span>
          </h4>

          <div className="flex items-center gap-2 text-neutral-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>تسجيل مفتوح وغير محدود للوجبات بالنص العربي</span>
          </div>

          <div className="flex items-center gap-2 text-neutral-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>تتبع السعرات الحرارية والماكروز تلقائياً مع الذكاء الاصطناعي</span>
          </div>

          <div className="flex items-center gap-2 text-neutral-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>ربط وحفظ مباشر عبر بوت تليجرام</span>
          </div>
        </div>

        {/* Contact Methods */}
        <div className="space-y-2.5">
          <p className="text-xs font-bold text-neutral-300">تواصل مع إدارة النظام للتفعيل السريع:</p>

          <a
            href={telegramBotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-sky-500/20 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>التواصل عبر بوت تليجرام السريع 💬</span>
          </a>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors"
        >
          إغلاق والعودة للتطبيقات
        </button>
      </div>
    </div>
  );
};
