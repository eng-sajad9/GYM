import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Gift,
  Ban,
  Search,
  RefreshCw,
  UserCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Calendar,
  Sparkles,
  StopCircle,
  PlayCircle,
  PauseCircle,
  Settings,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { UserProfileDTO, SubscriptionStatus } from '../../types/saas';
import { AdminBillingService } from '../../services/adminBillingService';

interface MobileAdminDashboardProps {
  initialUsers: UserProfileDTO[];
  adminUserId: string;
  onRefresh: () => Promise<void>;
}

export const MobileAdminDashboard: React.FC<MobileAdminDashboardProps> = ({
  initialUsers,
  adminUserId,
  onRefresh,
}) => {
  // Filter out any admin accounts from initial state
  const cleanInitialUsers = initialUsers.filter((u) => u.role !== 'admin' && u.role !== 'super_admin');
  const [users, setUsers] = useState<UserProfileDTO[]>(cleanInitialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'gift' | SubscriptionStatus>('all');
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);

  // Modal States
  const [selectedUser, setSelectedUser] = useState<UserProfileDTO | null>(null);
  const [modalType, setModalType] = useState<'manage' | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<SubscriptionStatus>('active');
  const [customDate, setCustomDate] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch registered users (excludes admins)
  const fetchAllUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await AdminBillingService.getUsersPaginated(1, 100, searchQuery, statusFilter === 'gift' ? 'all' : statusFilter);
      if (res.success && res.data) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Error fetching users for admin dashboard:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const handleManualRefresh = async () => {
    await fetchAllUsers();
    await onRefresh();
    showToast('تم تحديث قائمة الحسابات بنجاح ✨', 'success');
  };

  // Compute KPIs (excluding admins)
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.subscriptionStatus === 'active').length;
  const expiredUsers = users.filter((u) => u.subscriptionStatus === 'expired' || u.subscriptionStatus === 'cancelled' || u.subscriptionStatus === 'paused' || u.subscriptionStatus === 'trial').length;
  const blockedUsers = users.filter((u) => u.subscriptionStatus === 'blocked').length;
  const giftUsersCount = users.filter((u) => {
    if (u.subscriptionStatus !== 'active' || !u.trialEndDate) return false;
    const diffMs = new Date(u.trialEndDate).getTime() - Date.now();
    return diffMs > 0 && diffMs <= 6 * 86_400_000;
  }).length;

  const filteredUsers = users.filter((u) => {
    const queryStr = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !queryStr ||
      u.fullName.toLowerCase().includes(queryStr) ||
      u.email.toLowerCase().includes(queryStr) ||
      u.id.toLowerCase().includes(queryStr) ||
      (u.telegramChatId && String(u.telegramChatId).includes(queryStr));

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'gift') {
      const isGift = u.subscriptionStatus === 'active' && u.trialEndDate &&
        (new Date(u.trialEndDate).getTime() - Date.now() <= 6 * 86_400_000) &&
        (new Date(u.trialEndDate).getTime() > Date.now());
      return matchesSearch && isGift;
    }
    return matchesSearch && u.subscriptionStatus === statusFilter;
  });

  const updateLocalUser = (userId: string, newStatus: SubscriptionStatus, newEndDate?: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          subscriptionStatus: newStatus,
          trialEndDate: newEndDate || u.trialEndDate,
        };
      })
    );
  };

  const removeLocalUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // 1. Gift +5 Days Free Trial (Expires on Day 6)
  const handleOneTapGift5Days = async (user: UserProfileDTO) => {
    setIsProcessing(true);
    try {
      const res = await AdminBillingService.extendSubscription(adminUserId, user.id, 5, 'إهداء 5 أيام مجانية');
      if (res.success) {
        const newEnd = new Date(Date.now() + 5 * 86_400_000).toISOString();
        updateLocalUser(user.id, 'active', newEnd);
        showToast(`تم إهداء 5 أيام للاعب (${user.fullName}) بنجاح ✨ (ينتهي بعد 5 أيام)`, 'success');
      } else {
        showToast(res.error || 'فشلت عملية إهداء 5 أيام', 'error');
      }
    } catch {
      showToast('حدث خطأ أثناء تمديد الحساب', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Activate 30-Day Paid Subscription (Expires on Day 31)
  const handleOneTapActivate30Days = async (user: UserProfileDTO) => {
    setIsProcessing(true);
    try {
      const res = await AdminBillingService.activateSubscription(adminUserId, user.id, 'monthly', 30, 0, 'تفعيل اشتراك 30 يوماً');
      if (res.success) {
        const newEnd = new Date(Date.now() + 30 * 86_400_000).toISOString();
        updateLocalUser(user.id, 'active', newEnd);
        showToast(`تم تفعيل اشتراك 30 يوماً بنجاح للاعب (${user.fullName}) ✨ (يتوقف في اليوم 31)`, 'success');
      } else {
        showToast(res.error || 'فشلت عملية التفعيل', 'error');
      }
    } catch {
      showToast('حدث خطأ أثناء تفعيل الاشتراك', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Toggle Pause / Resume Subscription
  const handleOneTapTogglePauseSubscription = async (user: UserProfileDTO) => {
    setIsProcessing(true);
    try {
      if (user.subscriptionStatus === 'paused') {
        const res = await AdminBillingService.updateSubscriptionStatus(adminUserId, user.id, 'active');
        if (res.success) {
          updateLocalUser(user.id, 'active');
          showToast(`تم استئناف اشتراك اللاعب (${user.fullName}) بنجاح ▶️`, 'success');
        } else {
          showToast(res.error || 'فشلت عملية استئناف الاشتراك', 'error');
        }
      } else {
        const res = await AdminBillingService.updateSubscriptionStatus(adminUserId, user.id, 'paused');
        if (res.success) {
          updateLocalUser(user.id, 'paused');
          showToast(`تم إيقاف اشتراك اللاعب (${user.fullName}) مؤقتاً ⏸️`, 'success');
        } else {
          showToast(res.error || 'فشلت عملية إيقاف الاشتراك', 'error');
        }
      }
    } catch {
      showToast('حدث خطأ أثناء معالجة الطلب', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Toggle Block / Unblock User
  const handleOneTapToggleBlock = async (user: UserProfileDTO) => {
    setIsProcessing(true);
    try {
      if (user.subscriptionStatus === 'blocked') {
        const res = await AdminBillingService.updateSubscriptionStatus(adminUserId, user.id, 'active');
        if (res.success) {
          updateLocalUser(user.id, 'active');
          showToast(`تم فك الحظر عن الحساب (${user.fullName}) ✨`, 'success');
        } else {
          showToast(res.error || 'فشلت عملية فك الحظر', 'error');
        }
      } else {
        const res = await AdminBillingService.revokeSubscription(adminUserId, user.id, 'حظر إداري');
        if (res.success) {
          updateLocalUser(user.id, 'blocked');
          showToast(`تم حظر وتعطيل الحساب (${user.fullName}) بنجاح`, 'success');
        } else {
          showToast(res.error || 'فشلت عملية الحظر', 'error');
        }
      }
    } catch {
      showToast('حدث خطأ أثناء معالجة الطلب', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Comprehensive Manage Form Submit
  const handleManageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isProcessing) return;

    setIsProcessing(true);
    try {
      const targetEndsAt = customDate ? new Date(customDate).toISOString() : undefined;
      const res = await AdminBillingService.updateSubscriptionStatus(adminUserId, selectedUser.id, selectedStatus, targetEndsAt);

      if (res.success) {
        updateLocalUser(selectedUser.id, selectedStatus, targetEndsAt);
        showToast(`تم تحديث حالة الحساب (${selectedUser.fullName}) بنجاح ✨`, 'success');
        setModalType(null);
        setSelectedUser(null);
        setIsConfirmingDelete(false);
      } else {
        showToast(res.error || 'فشل تحديث الحساب', 'error');
      }
    } catch {
      showToast('حدث خطأ غير متوقع', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Delete Account Submit (Guaranteed Execution & Immediate User Logout)
  const handleDeleteUserExecution = async (user: UserProfileDTO) => {
    setIsProcessing(true);
    try {
      const res = await AdminBillingService.deleteUserAccount(adminUserId, user.id);
      if (res.success) {
        removeLocalUser(user.id);
        showToast(`تم مسح حساب (${user.fullName}) من الداتا بيس وإخراجه بنجاح 🗑️`, 'success');
        setModalType(null);
        setSelectedUser(null);
        setIsConfirmingDelete(false);
      } else {
        showToast(res.error || 'فشل حذف الحساب من قاعدة البيانات', 'error');
      }
    } catch {
      showToast('حدث خطأ أثناء حذف الحساب', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return { label: 'مشترك مدفوع 🟢', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 };
      case 'cancelled':
        return { label: 'اشتراك ملغى 🔴', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30', icon: StopCircle };
      case 'expired':
      case 'trial':
        return { label: 'اشتراك منتهي ⚪', bg: 'bg-neutral-800 text-neutral-400 border-neutral-700', icon: AlertCircle };
      case 'blocked':
        return { label: 'حساب محظور 🚫', bg: 'bg-red-500/10 text-red-400 border-red-500/30', icon: Ban };
      default:
        return { label: 'مشترك ⚪', bg: 'bg-neutral-800 text-neutral-400 border-neutral-700', icon: AlertCircle };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-5 font-cairo dir-rtl">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold animate-bounce transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
              : 'bg-red-950 border-red-500/50 text-red-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Admin Dashboard Mobile-Optimized Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-4 sm:p-5 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-white">لوحة الإدارة والتحكم بالحسابات</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Super Admin
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">تعديل فوري ومباشر للاشتراكات والحسابات بدون ريفريش</p>
          </div>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isLoadingUsers}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-bold transition-all active:scale-95 min-h-[44px]"
        >
          <RefreshCw className={`w-4 h-4 text-amber-400 ${isLoadingUsers ? 'animate-spin' : ''}`} />
          <span>تحديث القائمة الحية</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
          <span className="text-xs text-neutral-400 font-bold block">إجمالي اللاعبين</span>
          <span className="text-2xl font-black text-white mt-1 block">{totalUsers}</span>
        </div>

        <div className="bg-neutral-900 border border-amber-500/30 p-4 rounded-2xl">
          <span className="text-xs text-amber-400 font-bold block">أعضاء الهدية (5 أيام) 🎁</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{giftUsersCount}</span>
        </div>

        <div className="bg-neutral-900 border border-emerald-500/20 p-4 rounded-2xl">
          <span className="text-xs text-emerald-400 font-bold block">اشتراكات مدفوعة 🟢</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{activeUsers}</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
          <span className="text-xs text-neutral-400 font-bold block">اشتراكات منتهية ⚪</span>
          <span className="text-2xl font-black text-neutral-400 mt-1 block">{expiredUsers}</span>
        </div>

        <div className="bg-neutral-900 border border-red-500/20 p-4 rounded-2xl">
          <span className="text-xs text-red-400 font-bold block">حسابات محظورة 🚫</span>
          <span className="text-2xl font-black text-red-400 mt-1 block">{blockedUsers}</span>
        </div>
      </div>

      {/* Filter Pills & Search Input */}
      <div className="bg-neutral-900 border border-neutral-800 p-3.5 sm:p-4 rounded-3xl space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث بالاسم، البريد الإلكتروني، تليجرام ID، أو UID..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl pr-10 pl-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'الكل 🌐' },
            { id: 'gift', label: 'أعضاء الهدية (5 أيام) 🎁' },
            { id: 'active', label: 'مدفوع 🟢' },
            { id: 'expired', label: 'منتهي ⚪' },
            { id: 'blocked', label: 'محظور 🚫' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 min-h-[40px] ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-neutral-950 font-black shadow-lg shadow-amber-500/20'
                  : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Cards List */}
      {isLoadingUsers ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-xs text-neutral-400 font-bold">جاري تحميل قائمة الحسابات...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
          <Users className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-300">لم يتم العثور على حسابات مطابقة</h3>
          <p className="text-xs text-neutral-500 mt-1">تأكد من كتابة اسم أو بريد مستخدم صحيح</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredUsers.map((user) => {
            const badge = getStatusBadge(user.subscriptionStatus);
            const StatusIcon = badge.icon;
            const endDateFormatted = user.trialEndDate
              ? new Date(user.trialEndDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
              : 'غير محدد';

            return (
              <div
                key={user.id}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-3xl p-4 sm:p-5 transition-all shadow-lg space-y-3.5"
              >
                {/* User Info Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-400 font-black text-sm shrink-0">
                      {user.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">{user.fullName}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">{user.email}</p>
                      {user.telegramChatId && (
                        <p className="text-[11px] text-sky-400 font-medium mt-0.5">
                          تليجرام ID: {user.telegramChatId}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-bold border shrink-0 ${badge.bg}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Expiration Date Info */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80 text-xs">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>تاريخ الانتهاء:</span>
                  </div>
                  <span className="font-bold text-neutral-200">{endDateFormatted}</span>
                </div>

                {/* CLEAR & FUNCTIONAL ACTION BUTTONS */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {/* Button 1: Gift +5 Days Free */}
                  <button
                    onClick={() => handleOneTapGift5Days(user)}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
                  >
                    <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>إهداء +5 أيام 🎁</span>
                  </button>

                  {/* Button 2: Activate 30 Days Subscription */}
                  <button
                    onClick={() => handleOneTapActivate30Days(user)}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
                  >
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>تفعيل 30 يوماً ⚡</span>
                  </button>

                  {/* Button 3: Toggle Pause / Resume Subscription */}
                  <button
                    onClick={() => handleOneTapTogglePauseSubscription(user)}
                    disabled={isProcessing}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 min-h-[44px] border ${
                      user.subscriptionStatus === 'paused'
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/30'
                    }`}
                  >
                    {user.subscriptionStatus === 'paused' ? (
                      <>
                        <PlayCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>استئناف ▶️</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle className="w-4 h-4 shrink-0 text-orange-400" />
                        <span>إيقاف مؤقت ⏸️</span>
                      </>
                    )}
                  </button>

                  {/* Button 4: Block / Unblock */}
                  <button
                    onClick={() => handleOneTapToggleBlock(user)}
                    disabled={isProcessing}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 min-h-[44px] border ${
                      user.subscriptionStatus === 'blocked'
                        ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
                    }`}
                  >
                    {user.subscriptionStatus === 'blocked' ? (
                      <>
                        <UserCheck className="w-4 h-4 shrink-0" />
                        <span>فك الحظر</span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4 shrink-0" />
                        <span>حظر الحساب</span>
                      </>
                    )}
                  </button>

                  {/* Button 5: Full Control / Edit Date Modal */}
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setSelectedStatus(user.subscriptionStatus || 'active');
                      setCustomDate(user.trialEndDate ? user.trialEndDate.substring(0, 10) : '');
                      setIsConfirmingDelete(false);
                      setModalType('manage');
                    }}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
                  >
                    <Settings className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>تعديل التاريخ ⚙️</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Control & Manage Modal */}
      {modalType === 'manage' && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-fade-in font-cairo dir-rtl">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">إدارة وتعديل تاريخ اشتراك المستخدم</h3>
              </div>
              <button
                onClick={() => {
                  setModalType(null);
                  setIsConfirmingDelete(false);
                }}
                className="p-1 rounded-xl text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
              <p className="text-xs text-neutral-300 font-bold">المستخدم: {selectedUser.fullName}</p>
              <p className="text-[11px] text-neutral-400">{selectedUser.email}</p>
            </div>

            {/* Custom Delete Confirmation Card Overlay */}
            {isConfirmingDelete ? (
              <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/50 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>هل أنت متأكد تماماً من حذف هذا الحساب نهائياً؟</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  سيتم مسح كافّة بيانات اللاعب من الفايربيس ومسح اشتراكه، وسيتم إخراجه فوراً إلى صفحة تسجيل الدخول إذا كان متواجداً حالياً في التطبيق.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDeleteUserExecution(selectedUser)}
                    disabled={isProcessing}
                    className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>نعم، تأكيد مسح الحساب وإخراجه 🗑️</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isProcessing}
                    className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-all min-h-[44px]"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleManageSubmit} className="space-y-4">
                {/* Change Status Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">حالة الاشتراك والحساب</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as SubscriptionStatus)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-3 text-xs text-neutral-100 font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="active">🟢 مشترك مدفوع (Active)</option>
                    <option value="expired">⚪ اشتراك منتهي (Expired)</option>
                    <option value="blocked">🚫 حساب محظور (Blocked)</option>
                  </select>
                </div>

                {/* Expiration Date Selection */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">تاريخ الانتهاء المخصص</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-3 text-xs text-neutral-100 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
                  >
                    {isProcessing ? 'جاري التحديث...' : 'تأكيد وحفظ التغييرات ✨'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    disabled={isProcessing}
                    className="px-4 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 min-h-[44px] flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                    <span>حذف الحساب</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
