import React from 'react';
import { Flame, Bot, PlusCircle, UserCircle, Settings, LayoutDashboard, User, LogOut } from 'lucide-react';
import { UserProfile } from '../../types';

interface HeaderProps {
  profile: UserProfile | null;
  activeView?: 'user' | 'admin';
  onToggleView?: (view: 'user' | 'admin') => void;
  onOpenCustomMealModal: () => void;
  onOpenProfileModal: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  activeView = 'user',
  onToggleView,
  onOpenCustomMealModal,
  onOpenProfileModal,
  onLogout,
}) => {
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  return (
    <header className="bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-40 dir-rtl font-cairo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 min-h-[64px]">
        {/* Brand Logo & Name */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-green-500 to-emerald-400 p-0.5 shadow-lg shadow-green-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-green-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                نظام التغذية <span className="text-green-400">الذكي</span>
              </h1>
              <p className="text-[10px] text-neutral-400 font-medium">تتبع تغذية ذكي واحترافي</p>
            </div>
          </div>

          {/* Mobile Admin Switcher */}
          {isAdmin && onToggleView && (
            <div className="flex sm:hidden bg-neutral-950 p-1 rounded-2xl border border-neutral-800 shrink-0">
              <button
                onClick={() => onToggleView(activeView === 'user' ? 'admin' : 'user')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-neutral-950 flex items-center gap-1 min-h-[36px]"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{activeView === 'user' ? 'لوحة التحكم' : 'الرئيسية'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Desktop Admin View Switcher */}
        {isAdmin && onToggleView && (
          <div className="hidden sm:flex bg-neutral-950 p-1 rounded-2xl border border-neutral-800">
            <button
              onClick={() => onToggleView('user')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] ${
                activeView === 'user'
                  ? 'bg-green-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>واجهة المستخدم</span>
            </button>

            <button
              onClick={() => onToggleView('admin')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] ${
                activeView === 'admin'
                  ? 'bg-amber-400 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>لوحة التحكم</span>
            </button>
          </div>
        )}

        {/* Action Buttons & User Profile Controls */}
        <div className="flex items-center justify-end w-full sm:w-auto gap-2.5">
          <button
            onClick={onOpenCustomMealModal}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold border border-neutral-700 transition-all min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>وجبة مخصصة</span>
          </button>

          {/* Telegram Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-sky-950/40 border border-sky-800/40 text-sky-400 text-xs font-bold min-h-[44px]">
            <Bot className="w-4 h-4" />
            <span>{profile?.telegramChatId ? 'تليجرام متصل ✅' : 'غير مرتبط'}</span>
          </div>

          {/* User Profile Settings Button */}
          <button
            onClick={onOpenProfileModal}
            className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 px-3.5 py-2 rounded-2xl transition-all min-h-[44px]"
            title="تعديل الأهداف والملف الشخصي"
          >
            <UserCircle className="w-5 h-5 text-green-400 shrink-0" />
            <span className="text-xs font-bold text-neutral-200 truncate max-w-[100px] sm:max-w-[140px]">
              {profile?.fullName || 'المستخدم'}
            </span>
            <Settings className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
