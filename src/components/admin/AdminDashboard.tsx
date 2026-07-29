import React from 'react';
import { MobileAdminDashboard } from './MobileAdminDashboard';
import { UserProfileDTO, AppRole, SubscriptionStatus } from '../../types/saas';

export interface SaaSUserRecord {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  accountStatus: SubscriptionStatus;
  dailyCalorieGoal: number;
  dailyProteinGoalG: number;
  dailyCarbsGoalG: number;
  dailyFatGoalG: number;
  dailySugarLimitG: number;
  telegramChatId?: number | null;
  trialEndsAt?: string;
  planType?: string;
}

interface AdminDashboardProps {
  users: SaaSUserRecord[];
  onExtendTrial: (userId: string, extraDays: number) => Promise<void>;
  onActivateSubscription: (userId: string, days: number, planType: string) => Promise<void>;
  onBlockUser: (userId: string) => Promise<void>;
  onUnblockUser: (userId: string) => Promise<void>;
  onChangeUserRole: (userId: string, role: AppRole) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  onRefresh,
}) => {
  // Map legacy SaaSUserRecord format to standard UserProfileDTO
  const mappedUsers: UserProfileDTO[] = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    subscriptionStatus: u.accountStatus,
    trialStartDate: new Date().toISOString(),
    trialEndDate: u.trialEndsAt || new Date(Date.now() + 5 * 86400000).toISOString(),
    isEmailVerified: true,
    dailyCalorieGoal: u.dailyCalorieGoal,
    dailyProteinGoalG: u.dailyProteinGoalG,
    dailyCarbsGoalG: u.dailyCarbsGoalG,
    dailyFatGoalG: u.dailyFatGoalG,
    dailySugarLimitG: u.dailySugarLimitG,
    telegramChatId: u.telegramChatId,
  }));

  return (
    <MobileAdminDashboard
      initialUsers={mappedUsers}
      adminUserId="admin-super-1"
      onRefresh={onRefresh}
    />
  );
};
