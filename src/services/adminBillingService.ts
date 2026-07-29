/**
 * ============================================================
 * Admin Billing & User Management Service — Firestore Implementation
 * Provides robust administrative control over user accounts and subscriptions:
 *   - Extend subscription (+5 Days Free)
 *   - Activate paid subscription (30 Days)
 *   - Stop / Expire subscription
 *   - Block / Unblock user
 *   - Delete user account
 *   - Paginated user listing (Excludes Admin/Super-Admin accounts)
 * ============================================================
 */

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import {
  ApiResponse,
  UserProfileDTO,
  SubscriptionStatus,
} from '../types/saas';

const SUPER_ADMIN_UID = 'YimwkF4tsWeipxKw0T9HIgY1vt62';

export class AdminBillingService {
  /**
   * 1. Gift +5 Days Free Trial (Expires after 5 days)
   */
  public static async extendSubscription(
    _adminUserId: string,
    targetUserId: string,
    extraDays: number = 5,
    _reason: string = 'إهداء 5 أيام مجانية'
  ): Promise<ApiResponse<{ targetUserId: string; newTrialEndDate: string }>> {
    try {
      // Calculate end date strictly from TODAY (Date.now()) to prevent accidental double-stacking
      const newEnd = new Date(Date.now() + extraDays * 86_400_000).toISOString();
      const now = Timestamp.now();

      await setDoc(doc(db, 'subscriptions', targetUserId), {
        plan_type: 'gift_5_days',
        status: 'active',
        ends_at: newEnd,
        updated_at: now,
      }, { merge: true });

      await setDoc(doc(db, 'users', targetUserId), {
        account_status: 'active',
        updated_at: now,
      }, { merge: true });

      return { success: true, data: { targetUserId, newTrialEndDate: newEnd }, error: null };
    } catch (err) {
      console.error('[AdminBillingService] extendSubscription error:', err);
      return { success: false, data: null, error: err instanceof Error ? err.message : 'خطأ في إهداء الأيام المجانية' };
    }
  }

  /**
   * 2. Activate 30-Day Paid Subscription (Expires on Day 31)
   */
  public static async activateSubscription(
    _adminUserId: string,
    targetUserId: string,
    planType: string = 'monthly',
    durationDays: number = 30,
    _amountPaid: number = 0,
    _reason: string = 'تفعيل 30 يوماً'
  ): Promise<ApiResponse<{ targetUserId: string; planType: string; expiresAt: string }>> {
    try {
      // Calculate end date strictly from TODAY (Date.now()) so double clicking won't create 60 days
      const expiresAt = planType === 'lifetime'
        ? '9999-12-31T23:59:59Z'
        : new Date(Date.now() + durationDays * 86_400_000).toISOString();

      const now = Timestamp.now();

      await setDoc(doc(db, 'subscriptions', targetUserId), {
        plan_type: planType,
        status: 'active',
        starts_at: now,
        ends_at: expiresAt,
        updated_at: now,
      }, { merge: true });

      await setDoc(doc(db, 'users', targetUserId), {
        account_status: 'active',
        updated_at: now,
      }, { merge: true });

      return { success: true, data: { targetUserId, planType, expiresAt }, error: null };
    } catch (err) {
      console.error('[AdminBillingService] activateSubscription error:', err);
      return { success: false, data: null, error: err instanceof Error ? err.message : 'خطأ في تفعيل الاشتراك' };
    }
  }

  /**
   * 3. Update Subscription Status directly (Pause, Stop, Cancel, Expire, Block, Reactivate)
   */
  public static async updateSubscriptionStatus(
    _adminUserId: string,
    targetUserId: string,
    status: SubscriptionStatus,
    customEndsAt?: string
  ): Promise<ApiResponse<{ targetUserId: string; status: SubscriptionStatus }>> {
    try {
      const now = Timestamp.now();
      const updatePayload: Record<string, unknown> = {
        status,
        updated_at: now,
      };

      if (customEndsAt) {
        updatePayload['ends_at'] = customEndsAt;
      } else if (status === 'expired' || status === 'cancelled') {
        updatePayload['ends_at'] = new Date().toISOString();
      }

      await setDoc(doc(db, 'subscriptions', targetUserId), updatePayload, { merge: true });
      await setDoc(doc(db, 'users', targetUserId), { account_status: status, updated_at: now }, { merge: true });

      return { success: true, data: { targetUserId, status }, error: null };
    } catch (err) {
      console.error('[AdminBillingService] updateSubscriptionStatus error:', err);
      return { success: false, data: null, error: err instanceof Error ? err.message : 'خطأ في تحديث حالة الاشتراك' };
    }
  }

  /**
   * 4. Revoke / Block user account
   */
  public static async revokeSubscription(
    _adminUserId: string,
    targetUserId: string,
    _reason: string = 'حظر إداري'
  ): Promise<ApiResponse<{ targetUserId: string; status: string }>> {
    return this.updateSubscriptionStatus(_adminUserId, targetUserId, 'blocked');
  }

  /**
   * 5. Delete User Account and all related documents in Firestore
   */
  public static async deleteUserAccount(
    _adminUserId: string,
    targetUserId: string
  ): Promise<ApiResponse<{ targetUserId: string }>> {
    try {
      // 1. Delete main documents
      await Promise.all([
        deleteDoc(doc(db, 'users', targetUserId)),
        deleteDoc(doc(db, 'subscriptions', targetUserId)),
        deleteDoc(doc(db, 'nutrition_settings', targetUserId)),
      ]);

      // 2. Delete subcollections (meal_logs & custom_meals)
      try {
        const [logsSnap, mealsSnap] = await Promise.all([
          getDocs(collection(db, 'users', targetUserId, 'meal_logs')),
          getDocs(collection(db, 'users', targetUserId, 'custom_meals')),
        ]);
        const deletes = [
          ...logsSnap.docs.map((d) => deleteDoc(d.ref)),
          ...mealsSnap.docs.map((d) => deleteDoc(d.ref)),
        ];
        await Promise.all(deletes);
      } catch {
        // Non-fatal subcollection cleanup
      }

      return { success: true, data: { targetUserId }, error: null };
    } catch (err) {
      console.error('[AdminBillingService] deleteUserAccount error:', err);
      return { success: false, data: null, error: err instanceof Error ? err.message : 'خطأ في حذف الحساب' };
    }
  }

  /**
   * 6. User List for Admin Dashboard — EXCLUDES Admin and Super-Admin accounts
   */
  public static async getUsersPaginated(
    page: number = 1,
    limit: number = 100,
    searchQuery: string = '',
    statusFilter: string = 'all'
  ): Promise<ApiResponse<{ users: UserProfileDTO[]; totalCount: number; page: number; limit: number }>> {
    try {
      // Safe query without orderBy to prevent missing index errors
      const usersSnap = await getDocs(collection(db, 'users'));

      const allUsers: UserProfileDTO[] = [];

      for (const userDoc of usersSnap.docs) {
        const u = userDoc.data();
        const role = u['role'] || 'user';

        // ── HIDE ADMIN / SUPER ADMIN ACCOUNTS FROM LIST ────────────────
        if (role === 'admin' || role === 'super_admin' || userDoc.id === SUPER_ADMIN_UID) {
          continue;
        }

        const [subSnap, nutSnap] = await Promise.all([
          getDoc(doc(db, 'subscriptions', userDoc.id)),
          getDoc(doc(db, 'nutrition_settings', userDoc.id)),
        ]);

        const sub = subSnap.exists() ? subSnap.data() : null;
        const nut = nutSnap.exists() ? nutSnap.data() : null;

        const subStatus = sub?.['status'] || u['account_status'] || 'trial';

        // Apply search filter
        if (searchQuery.trim()) {
          const qStr = searchQuery.toLowerCase();
          if (
            !u['full_name']?.toLowerCase().includes(qStr) &&
            !u['email']?.toLowerCase().includes(qStr) &&
            !userDoc.id.toLowerCase().includes(qStr)
          ) {
            continue;
          }
        }

        // Apply status filter
        if (statusFilter !== 'all' && subStatus !== statusFilter) continue;

        const createdAt = u['created_at']?.toDate?.()?.toISOString() || new Date().toISOString();
        const subStart = sub?.['starts_at']?.toDate?.()?.toISOString() || createdAt;
        const subEnd = sub?.['ends_at']?.toDate?.()?.toISOString() || sub?.['ends_at'] ||
          new Date(new Date(createdAt).getTime() + 30 * 86_400_000).toISOString();

        allUsers.push({
          id: userDoc.id,
          fullName: u['full_name'] || 'مستخدم',
          email: u['email'] || '',
          role: role,
          subscriptionStatus: subStatus as SubscriptionStatus,
          trialStartDate: subStart,
          trialEndDate: subEnd,
          isEmailVerified: true,
          dailyCalorieGoal: nut?.['daily_calorie_goal'] ?? 2400,
          dailyProteinGoalG: Number(nut?.['daily_protein_goal_g'] ?? 160),
          dailyCarbsGoalG: Number(nut?.['daily_carbs_goal_g'] ?? 220),
          dailyFatGoalG: Number(nut?.['daily_fat_goal_g'] ?? 70),
          dailySugarLimitG: Number(nut?.['daily_sugar_limit_g'] ?? 50),
          telegramChatId: nut?.['telegram_chat_id'] ?? null,
          createdAt,
        });
      }

      // Sort by createdAt descending
      allUsers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      // Client-side pagination
      const offset = (page - 1) * limit;
      const paged = allUsers.slice(offset, offset + limit);

      return {
        success: true,
        data: { users: paged, totalCount: allUsers.length, page, limit },
        error: null,
      };
    } catch (err) {
      console.error('[AdminBillingService] getUsersPaginated error:', err);
      return { success: false, data: null, error: err instanceof Error ? err.message : 'خطأ في جلب قائمة المستخدمين' };
    }
  }
}
