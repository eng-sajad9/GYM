import React, { useState } from 'react';
import { Flame, Lock, Mail, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, fullName: string) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('يرجى كتابة البريد الإلكتروني وكلمة المرور لاستكمال الطلب');
      return;
    }

    setIsLoading(true);
    try {
      if (isLoginMode) {
        await onLogin(email.trim(), password.trim());
      } else {
        if (!fullName.trim()) {
          setErrorMsg('يرجى كتابة الاسم الكامل');
          setIsLoading(false);
          return;
        }
        await onRegister(email.trim(), password.trim(), fullName.trim());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة لاحقاً';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-cairo dir-rtl">
      {/* Background Ambient Lighting */}
      <div className="absolute top-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xl space-y-6">
        {/* Platform Header Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-green-500/20 to-emerald-500/10 border border-green-500/30 text-green-400 mb-1">
            <Flame className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">نظام التغذية الذكي</h1>
          <p className="text-xs text-neutral-400 font-medium">
            {isLoginMode ? 'مرحباً بك مجدداً، يرجى إدخال بيانات حسابك' : 'أنشئ حسابك الجديد وتأهب لتجربة التتبع الذكي'}
          </p>
        </div>

        {/* Elegant Non-Intrusive Notification Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5">الاسم الكامل</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الكامل (مثال: أحمد محمد)"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pr-11 pl-4 h-12 text-base text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-all font-medium"
                />
                <User className="w-5 h-5 text-neutral-500 absolute right-3.5 top-3.5" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pr-11 pl-4 h-12 text-base text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-all font-medium"
              />
              <Mail className="w-5 h-5 text-neutral-500 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pr-11 pl-4 h-12 text-base text-white placeholder-neutral-500 focus:outline-none focus:border-green-500 transition-all font-medium"
              />
              <Lock className="w-5 h-5 text-neutral-500 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-400 hover:to-emerald-300 text-neutral-950 font-black text-sm shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 animate-spin" />
                جاري التحقق أمنياً...
              </span>
            ) : (
              <>
                <span>{isLoginMode ? 'تسجيل الدخول' : 'إنشاء حساب متميز'}</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Footer */}
        <div className="text-center pt-3 border-t border-neutral-800/80">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg(null);
            }}
            className="text-xs text-neutral-400 hover:text-green-400 font-bold transition-colors py-2 px-3 min-h-[44px] inline-flex items-center justify-center"
          >
            {isLoginMode ? 'ليس لديك حساب؟ أنشئ حساباً جديداً مجاناً' : 'لديك حساب بالفعل؟ سجل دخولك الآن'}
          </button>
        </div>
      </div>
    </div>
  );
};
