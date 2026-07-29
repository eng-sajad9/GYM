import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { Header } from '../components/common/Header';
import { MacroProgressBar } from '../components/dashboard/MacroProgressBar';
import { DateSelector } from '../components/dashboard/DateSelector';
import { MealInputForm } from '../components/meals/MealInputForm';
import { TodayMealList } from '../components/meals/TodayMealList';
import { CustomMealManager } from '../components/meals/CustomMealManager';
import { ProfileSettingsModal } from '../components/profile/ProfileSettingsModal';
import { MonthlyMacroChart, ChartDayData } from '../components/charts/MonthlyMacroChart';
import { MonthlySummaryReport } from '../components/dashboard/MonthlySummaryReport';
import { AuthScreen } from '../components/auth/AuthScreen';
import { MobileAdminDashboard } from '../components/admin/MobileAdminDashboard';
import { ExpiredSubscriptionCard } from '../components/common/ExpiredSubscriptionCard';
import { WelcomeGiftCard } from '../components/common/WelcomeGiftCard';
import { RenewSubscriptionModal } from '../components/common/RenewSubscriptionModal';
import { useMealTracker } from '../hooks/useMealTracker';
import { FirebaseAuthService } from '../services/firebaseAuthService';
import { UserProfileDTO } from '../types/saas';

export const DashboardPage: React.FC = () => {
  // Authentication & Admin View State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'user' | 'admin'>('user');
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfileDTO | null>(null);

  // Hook bound to the current Firebase Auth UID
  const {
    profile,
    isSubscriptionExpired,
    selectedDate,
    setSelectedDate,
    mealLogs,
    monthlyMealLogs,
    customMeals,
    isLoading,
    notification,
    totals,
    handleUpdateProfile,
    handleAddMeal,
    handleUpdateMealLog,
    handleDeleteMealLog,
    handleSaveCustomMeal,
    handleDeleteCustomMeal,
  } = useMealTracker(currentUserProfile?.id);

  const [chartData, setChartData] = useState<ChartDayData[]>([]);
  const [isCustomMealModalOpen, setIsCustomMealModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState<boolean>(false);

  // Live real-time listener for user profile updates & deletion logout
  useEffect(() => {
    if (!currentUserProfile?.id) return;

    const unsubUser = onSnapshot(doc(db, 'users', currentUserProfile.id), (snap) => {
      if (!snap.exists()) {
        // User account deleted by admin! Log out immediately.
        FirebaseAuthService.logoutUser().catch(() => null);
        setIsAuthenticated(false);
        setCurrentUserProfile(null);
        setActiveView('user');
      } else {
        const u = snap.data();
        if (u.account_status && u.account_status !== currentUserProfile.subscriptionStatus) {
          setCurrentUserProfile((prev) => (prev ? { ...prev, subscriptionStatus: u.account_status } : null));
        }
      }
    });

    return () => unsubUser();
  }, [currentUserProfile?.id]);

  useEffect(() => {
    generateChartData();

    // Firebase Auth state listener — single source of truth for session
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userProf = await FirebaseAuthService.getUserProfileById(firebaseUser.uid);
          if (userProf) {
            setCurrentUserProfile(userProf);
            setIsAuthenticated(true);
            setActiveView('user');
          }
        } catch {
          // Fall through to login
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUserProfile(null);
        setActiveView('user');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const generateChartData = () => {
    const days: ChartDayData[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' });

      days.push({
        date: dateStr,
        calories: Math.floor(1800 + Math.random() * 500),
        protein: Math.floor(120 + Math.random() * 40),
        carbs: Math.floor(180 + Math.random() * 50),
        fat: Math.floor(50 + Math.random() * 20),
      });
    }

    setChartData(days);
  };

  const handleLogin = async (email: string, password: string) => {
    const result = await FirebaseAuthService.loginUser(email, password);
    if (result.success && result.data) {
      setCurrentUserProfile(result.data.profile);
      setIsAuthenticated(true);
      setActiveView('user');
    } else {
      throw new Error(result.error || 'فشل تسجيل الدخول: البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
  };

  const handleRegister = async (email: string, password: string, fullName: string) => {
    const result = await FirebaseAuthService.registerUser(email, password, fullName);
    if (result.success && result.data) {
      setCurrentUserProfile(result.data);
      setIsAuthenticated(true);
      setActiveView('user');
    } else {
      throw new Error(result.error || 'فشلت عملية إنشاء الحساب');
    }
  };

  const handleLogout = async () => {
    await FirebaseAuthService.logoutUser();
    setIsAuthenticated(false);
    setCurrentUserProfile(null);
    setActiveView('user');
  };

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />;
  }

  const isAdmin = currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col font-tajawal">
      {/* Header Bar */}
      <Header
        profile={{
          ...profile,
          fullName: currentUserProfile?.fullName || profile.fullName,
          role: currentUserProfile?.role,
          accountStatus: currentUserProfile?.subscriptionStatus,
          email: currentUserProfile?.email,
        }}
        activeView={activeView}
        onToggleView={(view) => {
          if (isAdmin) setActiveView(view);
        }}
        onOpenCustomMealModal={() => setIsCustomMealModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold animate-bounce transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
              : 'bg-red-950 border-red-500/50 text-red-300'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Render Admin Dashboard if Admin View is Active */}
      {activeView === 'admin' && isAdmin ? (
        <MobileAdminDashboard
          initialUsers={currentUserProfile ? [currentUserProfile] : []}
          adminUserId={currentUserProfile?.id || ''}
          onRefresh={async () => {
            if (currentUserProfile) {
              const updated = await FirebaseAuthService.getUserProfileById(currentUserProfile.id);
              if (updated) setCurrentUserProfile(updated);
            }
          }}
        />
      ) : (
        /* User Dashboard View (Default Home View for Everyone) */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Prominent Expired Subscription Alert Card */}
          {isSubscriptionExpired ? (
            <ExpiredSubscriptionCard
              trialEndDate={profile.trialEndDate || currentUserProfile?.trialEndDate}
              accountStatus={profile.accountStatus || currentUserProfile?.subscriptionStatus}
              onOpenRenewModal={() => setIsRenewModalOpen(true)}
            />
          ) : (
            !isAdmin && (
              <WelcomeGiftCard
                userName={profile.fullName || currentUserProfile?.fullName || 'اللاعب'}
                daysRemaining={
                  profile.trialEndDate
                    ? Math.max(1, Math.ceil((new Date(profile.trialEndDate).getTime() - Date.now()) / 86400000))
                    : 5
                }
              />
            )
          )}

          {/* Date Selector Calendar */}
          <section>
            <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </section>

          {/* Macro Progress Dashboard */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold text-white font-cairo">ملخص أهداف اليوم المحدد</h2>
              <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-neutral-800 text-green-400 border border-neutral-700">
                تتبع حي تلقائي
              </span>
            </div>
            <MacroProgressBar profile={profile} totals={totals} />
          </section>

          {/* Natural Language Meal Entry Form (Disabled if expired) */}
          <section>
            <MealInputForm
              onAddMeal={handleAddMeal}
              isLoading={isLoading}
              selectedDate={selectedDate}
              isSubscriptionExpired={isSubscriptionExpired}
              onOpenRenewModal={() => setIsRenewModalOpen(true)}
            />
          </section>

          {/* Today's Meal Log Timeline & Monthly Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TodayMealList
              mealLogs={mealLogs}
              onDeleteMealLog={handleDeleteMealLog}
              onUpdateMealLog={handleUpdateMealLog}
              selectedDate={selectedDate}
            />
            <MonthlyMacroChart data={chartData} calorieGoal={profile.dailyCalorieGoal} />
          </div>

          {/* Cumulative Monthly Achievement Summary & Report Card */}
          <section>
            <MonthlySummaryReport profile={profile} mealLogs={monthlyMealLogs} />
          </section>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-950 py-6 text-center text-xs text-neutral-500 font-medium">
        نظام تتبع والتغذية الآلي باللغة العربية © {new Date().getFullYear()} — جميع الحقوق محفوظة
      </footer>

      {/* Custom Meal Modal */}
      <CustomMealManager
        isOpen={isCustomMealModalOpen}
        onClose={() => setIsCustomMealModalOpen(false)}
        customMeals={customMeals}
        onSaveCustomMeal={handleSaveCustomMeal}
        onDeleteCustomMeal={handleDeleteCustomMeal}
        userId={profile.id}
      />

      {/* Profile & Fitness Goals Settings Modal */}
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* Renewal / Contact Admin Modal */}
      <RenewSubscriptionModal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
      />
    </div>
  );
};
