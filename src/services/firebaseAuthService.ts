/**
 * ============================================================
 * Firebase Auth Service — Phase 1 Migration
 *
 * Implements the full authentication & profile provisioning
 * flow using Firebase Auth + Firestore, strictly matching
 * the existing `UserProfileDTO` contract used across the app.
 *
 * Collections (mirror of Postgres schema):
 *   - users              → replaces public.users
 *   - subscriptions      → replaces public.subscriptions
 *   - nutrition_settings → replaces public.nutrition_settings
 * ============================================================
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type UserCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebaseConfig';
import { UserProfileDTO, ApiResponse, SubscriptionStatus, AppRole } from '../types/saas';
import { getOrCreateDeviceId } from '../utils/deviceFingerprint';

// ── Hardcoded Super Admin UID ─────────────────────────────────────
// This UID is always guaranteed super_admin access regardless of Firestore role value.
const SUPER_ADMIN_UID = 'YimwkF4tsWeipxKw0T9HIgY1vt62';

// ── Firestore Document Shapes (internal, not exported) ─────

interface FirestoreUserDoc {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  account_status: SubscriptionStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

interface FirestoreSubscriptionDoc {
  user_id: string;
  plan_type: string;
  status: SubscriptionStatus;
  starts_at: Timestamp;
  ends_at: Timestamp;
  auto_renew: boolean;
  updated_at: Timestamp;
}

interface FirestoreNutritionDoc {
  user_id: string;
  daily_calorie_goal: number;
  daily_protein_goal_g: number;
  daily_carbs_goal_g: number;
  daily_fat_goal_g: number;
  daily_sugar_limit_g: number;
  telegram_chat_id?: number | null;
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Converts a Firestore Timestamp (or ISO string) to an ISO string.
 * Safe to call on undefined — returns fallback.
 */
function toISO(ts: any, fallback = new Date().toISOString()): string {
  if (!ts) return fallback;
  if (typeof ts === 'string') return ts;
  if (typeof ts?.toDate === 'function') return ts.toDate().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  return fallback;
}

/**
 * Assembles a `UserProfileDTO` from all three Firestore docs.
 */
function buildProfileDTO(
  uid: string,
  userDoc: FirestoreUserDoc,
  subDoc: FirestoreSubscriptionDoc | null,
  nutDoc: FirestoreNutritionDoc | null
): UserProfileDTO {
  const now = new Date().toISOString();
  return {
    id: uid,
    fullName: userDoc.full_name,
    email: userDoc.email,
    role: userDoc.role ?? 'user',
    subscriptionStatus: subDoc?.status ?? userDoc.account_status ?? 'trial',
    trialStartDate: toISO(subDoc?.starts_at, now),
    trialEndDate: toISO(subDoc?.ends_at, new Date(Date.now() + 30 * 86_400_000).toISOString()),
    isEmailVerified: auth.currentUser?.emailVerified ?? false,
    dailyCalorieGoal: nutDoc?.daily_calorie_goal ?? 2400,
    dailyProteinGoalG: nutDoc?.daily_protein_goal_g ?? 160,
    dailyCarbsGoalG: nutDoc?.daily_carbs_goal_g ?? 220,
    dailyFatGoalG: nutDoc?.daily_fat_goal_g ?? 70,
    dailySugarLimitG: nutDoc?.daily_sugar_limit_g ?? 50,
    telegramChatId: nutDoc?.telegram_chat_id ?? null,
    createdAt: toISO(userDoc.created_at, now),
    updatedAt: toISO(userDoc.updated_at, now),
  };
}

// ── Core Service ───────────────────────────────────────────

export class FirebaseAuthService {
  /**
   * Fetch full profile by UID from Firestore (users + subscriptions + nutrition_settings).
   * Returns null if user document doesn't exist yet.
   */
  public static async getUserProfileById(uid: string): Promise<UserProfileDTO | null> {
    try {
      const [userSnap, subSnap, nutSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, 'subscriptions', uid)),
        getDoc(doc(db, 'nutrition_settings', uid)),
      ]);

      if (!userSnap.exists()) return null;

      const userData = userSnap.data() as FirestoreUserDoc;

      // ── Auto-upgrade super admin on every profile read ─────────────────
      const isSuperAdmin = uid === SUPER_ADMIN_UID;
      if (isSuperAdmin && userData.role !== 'super_admin') {
        // Patch Firestore asynchronously without blocking the return
        const adminBatch = writeBatch(db);
        adminBatch.set(
          doc(db, 'users', uid),
          { role: 'super_admin', account_status: 'active', updated_at: serverTimestamp() },
          { merge: true }
        );
        adminBatch.set(
          doc(db, 'subscriptions', uid),
          { plan_type: 'lifetime', status: 'active', updated_at: serverTimestamp() },
          { merge: true }
        );
        adminBatch.commit().catch(() => null); // Fire-and-forget
        userData.role = 'super_admin';
        userData.account_status = 'active';
      }

      return buildProfileDTO(
        uid,
        userData,
        subSnap.exists() ? (subSnap.data() as FirestoreSubscriptionDoc) : null,
        nutSnap.exists() ? (nutSnap.data() as FirestoreNutritionDoc) : null
      );
    } catch (err) {
      console.error('[FirebaseAuthService] getUserProfileById error:', err);
      return null;
    }
  }

  /**
   * Register a new user:
   *  1. createUserWithEmailAndPassword → get UID
   *  2. Batch-write users + subscriptions + nutrition_settings atomically
   *  3. Return assembled UserProfileDTO
   */
  public static async registerUser(
    emailOrPayload: string | { email: string; password: string; fullName: string },
    passwordArg?: string,
    fullNameArg?: string
  ): Promise<ApiResponse<UserProfileDTO>> {
    if (!isFirebaseConfigured()) {
      return {
        success: false,
        data: null,
        error: 'Firebase غير مُهيأ. يرجى إضافة بيانات مشروعك في ملف .env',
      };
    }

    const email = typeof emailOrPayload === 'object' ? emailOrPayload.email : emailOrPayload;
    const password = typeof emailOrPayload === 'object' ? emailOrPayload.password : (passwordArg || '');
    const fullName = typeof emailOrPayload === 'object' ? emailOrPayload.fullName : (fullNameArg || '');

    const normalizedEmail = (email || '').trim().toLowerCase();

    // ── Step 0: Unique email guard (Firestore query) ──────
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', normalizedEmail));
      const existing = await getDocs(q);
      if (!existing.empty) {
        return {
          success: false,
          data: null,
          error: 'عذراً، هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد.',
        };
      }
    } catch {
      // Non-fatal — Firebase Auth will also reject duplicates
    }

    try {
      // ── Step 1: Create Firebase Auth account ─────────────
      const credential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );
      const uid = credential.user.uid;

      // Update display name in Firebase Auth (non-blocking)
      updateProfile(credential.user, { displayName: fullName }).catch(() => null);

      // ── Step 1.5: Device Fingerprint Check (Anti-Abuse) ───
      const deviceId = getOrCreateDeviceId();
      let isEligibleForGift = true;
      try {
        const deviceRef = doc(db, 'device_trials', deviceId);
        const deviceSnap = await getDoc(deviceRef);
        if (deviceSnap.exists()) {
          isEligibleForGift = false;
        }
      } catch {
        // Non-fatal fallback
      }

      // ── Step 2: Atomic batch write to Firestore ───────────
      const now = serverTimestamp();
      const giftStart = Timestamp.now();
      const giftEnd = isEligibleForGift
        ? Timestamp.fromDate(new Date(Date.now() + 5 * 86_400_000))
        : Timestamp.fromDate(new Date(Date.now() - 1000));

      const initialStatus: SubscriptionStatus = isEligibleForGift ? 'active' : 'expired';
      const initialPlanType = isEligibleForGift ? 'gift_5_days' : 'trial';

      const batch = writeBatch(db);

      // Lock device fingerprint if eligible for gift
      if (isEligibleForGift) {
        batch.set(doc(db, 'device_trials', deviceId), {
          device_id: deviceId,
          claimed_by_uid: uid,
          claimed_by_email: normalizedEmail,
          claimed_at: now,
        });
      }

      // users/{uid}
      const userRef = doc(db, 'users', uid);
      batch.set(userRef, {
        id: uid,
        full_name: fullName,
        email: normalizedEmail,
        role: 'user',
        account_status: initialStatus,
        created_at: now,
        updated_at: now,
      } satisfies Omit<FirestoreUserDoc, 'created_at' | 'updated_at'> & { created_at: unknown; updated_at: unknown });

      // subscriptions/{uid}
      const subRef = doc(db, 'subscriptions', uid);
      batch.set(subRef, {
        user_id: uid,
        plan_type: initialPlanType,
        status: initialStatus,
        starts_at: giftStart,
        ends_at: giftEnd,
        auto_renew: false,
        updated_at: now,
      } satisfies Omit<FirestoreSubscriptionDoc, 'updated_at'> & { updated_at: unknown });

      // nutrition_settings/{uid}
      const nutRef = doc(db, 'nutrition_settings', uid);
      batch.set(nutRef, {
        user_id: uid,
        daily_calorie_goal: 2400,
        daily_protein_goal_g: 160,
        daily_carbs_goal_g: 220,
        daily_fat_goal_g: 70,
        daily_sugar_limit_g: 50,
      } satisfies FirestoreNutritionDoc);

      await batch.commit();
      console.log('[FirebaseAuthService] Batch write committed for uid:', uid);

      // ── Step 3: Assemble and return DTO ──────────────────
      const profile = await FirebaseAuthService.getUserProfileById(uid);

      // Fallback DTO in the unlikely case Firestore read is delayed
      const fallback: UserProfileDTO = {
        id: uid,
        fullName,
        email: normalizedEmail,
        role: 'user',
        subscriptionStatus: 'active',
        trialStartDate: giftStart.toDate().toISOString(),
        trialEndDate: giftEnd.toDate().toISOString(),
        isEmailVerified: credential.user.emailVerified,
        dailyCalorieGoal: 2400,
        dailyProteinGoalG: 160,
        dailyCarbsGoalG: 220,
        dailyFatGoalG: 70,
        dailySugarLimitG: 50,
        createdAt: new Date().toISOString(),
      };

      return { success: true, data: profile ?? fallback, error: null };
    } catch (err: unknown) {
      const firebaseCode = (err as { code?: string })?.code ?? '';
      const rawMsg = (err as Error)?.message ?? '';

      let arabicError = 'حدث خطأ غير متوقع أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.';

      if (firebaseCode === 'auth/email-already-in-use') {
        arabicError = 'عذراً، هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول بدلاً من إنشاء حساب جديد.';
      } else if (firebaseCode === 'auth/weak-password') {
        arabicError = 'كلمة المرور ضعيفة جداً. يرجى استخدام كلمة مرور لا تقل عن 6 أحرف.';
      } else if (firebaseCode === 'auth/invalid-email') {
        arabicError = 'عنوان البريد الإلكتروني غير صالح. يرجى التأكد من صحة الإدخال.';
      } else if (firebaseCode === 'auth/network-request-failed') {
        arabicError = 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.';
      } else if (firebaseCode === 'auth/too-many-requests') {
        arabicError = 'تم تجاوز عدد المحاولات المسموح بها مؤقتاً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
      }

      console.error('[FirebaseAuthService] registerUser error:', firebaseCode, rawMsg);
      return { success: false, data: null, error: arabicError };
    }
  }

  /**
   * Login an existing user with email + password.
   * Returns their full Firestore profile (auto-heals missing docs on first login).
   */
  public static async loginUser(
    email: string,
    password: string
  ): Promise<ApiResponse<{ profile: UserProfileDTO; sessionToken?: string }>> {
    if (!email?.trim() || !password) {
      return { success: false, data: null, error: 'يرجى كتابة البريد الإلكتروني وكلمة المرور' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const uid = credential.user.uid;
      const token = await credential.user.getIdToken();

      let profile = await FirebaseAuthService.getUserProfileById(uid);

      // ── Auto-heal: provision missing Firestore docs on login ──
      if (!profile) {
        console.warn('[FirebaseAuthService] Profile missing for uid:', uid, '— auto-healing...');
        const healName = credential.user.displayName || 'المستخدم';
        const now = serverTimestamp();
        const trialStart = Timestamp.now();
        const trialEnd = Timestamp.fromDate(new Date(Date.now() + 30 * 86_400_000));
        const batch = writeBatch(db);

        batch.set(
          doc(db, 'users', uid),
          {
            id: uid,
            full_name: healName,
            email: normalizedEmail,
            role: 'user',
            account_status: 'trial',
            created_at: now,
            updated_at: now,
          },
          { merge: true }
        );

        batch.set(
          doc(db, 'subscriptions', uid),
          {
            user_id: uid,
            plan_type: 'trial',
            status: 'trial',
            starts_at: trialStart,
            ends_at: trialEnd,
            auto_renew: false,
            updated_at: now,
          },
          { merge: true }
        );

        batch.set(
          doc(db, 'nutrition_settings', uid),
          {
            user_id: uid,
            daily_calorie_goal: 2400,
            daily_protein_goal_g: 160,
            daily_carbs_goal_g: 220,
            daily_fat_goal_g: 70,
            daily_sugar_limit_g: 50,
          },
          { merge: true }
        );

        await batch.commit();
        profile = await FirebaseAuthService.getUserProfileById(uid);
      }

      // ── Guard: blocked accounts ───────────────────────────
      if (profile?.subscriptionStatus === 'blocked') {
        await signOut(auth);
        return {
          success: false,
          data: null,
          error: '⛔ تم حظر هذا الحساب. يرجى التواصل مع إدارة النظام.',
        };
      }

      const fallbackProfile: UserProfileDTO = {
        id: uid,
        fullName: credential.user.displayName || 'المستخدم',
        email: normalizedEmail,
        role: 'user',
        subscriptionStatus: 'trial',
        trialStartDate: new Date().toISOString(),
        trialEndDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        isEmailVerified: credential.user.emailVerified,
        dailyCalorieGoal: 2400,
        dailyProteinGoalG: 160,
        dailyCarbsGoalG: 220,
        dailyFatGoalG: 70,
        dailySugarLimitG: 50,
        createdAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: { profile: profile ?? fallbackProfile, sessionToken: token },
        error: null,
      };
    } catch (err: unknown) {
      const firebaseCode = (err as { code?: string })?.code ?? '';

      let arabicError = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات وإعادة المحاولة.';

      if (
        firebaseCode === 'auth/user-not-found' ||
        firebaseCode === 'auth/wrong-password' ||
        firebaseCode === 'auth/invalid-credential'
      ) {
        arabicError = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (firebaseCode === 'auth/too-many-requests') {
        arabicError = 'تم تجاوز عدد محاولات الدخول المسموح بها مؤقتاً. يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
      } else if (firebaseCode === 'auth/network-request-failed') {
        arabicError = 'فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.';
      } else if (firebaseCode === 'auth/user-disabled') {
        arabicError = '⛔ تم تعطيل هذا الحساب. يرجى التواصل مع إدارة النظام.';
      }

      console.error('[FirebaseAuthService] loginUser error:', firebaseCode);
      return { success: false, data: null, error: arabicError };
    }
  }

  /**
   * Sign out the current Firebase Auth session.
   */
  public static async logoutUser(): Promise<ApiResponse<null>> {
    try {
      await signOut(auth);
      return { success: true, data: null, error: null };
    } catch (err) {
      const msg = (err as Error)?.message ?? 'فشل تسجيل الخروج';
      return { success: false, data: null, error: msg };
    }
  }
}
