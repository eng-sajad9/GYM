import { FirebaseAuthService as AuthService } from '../src/services/firebaseAuthService';
import { AdminBillingService } from '../src/services/adminBillingService';

export interface VercelApiRequest {
  method?: string;
  query?: Record<string, string | string[]>;
  body?: Record<string, unknown>;
}

export interface VercelApiResponse {
  status: (code: number) => VercelApiResponse;
  json: (body: unknown) => VercelApiResponse;
}

export default async function handler(req: VercelApiRequest, res: VercelApiResponse) {
  const method = req.method?.toUpperCase() || 'GET';
  const action = String(req.query?.action || 'users');

  try {
    // 1. Auth Register Endpoint
    if (method === 'POST' && action === 'register') {
      const result = await AuthService.registerUser(req.body as any);
      return res.status(result.success ? 200 : 400).json(result);
    }

    // 2. Auth Login Endpoint
    if (method === 'POST' && action === 'login') {
      const { email, password } = (req.body || {}) as { email?: string; password?: string };
      const result = await AuthService.loginUser(email || '', password || '');
      return res.status(result.success ? 200 : 401).json(result);
    }

    // 3. Admin Extend Trial / Subscription Endpoint
    if (method === 'POST' && action === 'extend') {
      const { adminUserId, targetUserId, extraDays, reason } = (req.body || {}) as any;
      const result = await AdminBillingService.extendSubscription(adminUserId, targetUserId, Number(extraDays), reason);
      return res.status(result.success ? 200 : 400).json(result);
    }

    // 4. Admin Activate Paid Subscription Endpoint
    if (method === 'POST' && action === 'activate') {
      const { adminUserId, targetUserId, planType, durationDays, amountPaid, reason } = (req.body || {}) as any;
      const result = await AdminBillingService.activateSubscription(
        adminUserId,
        targetUserId,
        planType,
        Number(durationDays),
        Number(amountPaid),
        reason
      );
      return res.status(result.success ? 200 : 400).json(result);
    }

    // 5. Admin Revoke / Block Subscription Endpoint
    if (method === 'POST' && action === 'revoke') {
      const { adminUserId, targetUserId, reason } = (req.body || {}) as any;
      const result = await AdminBillingService.revokeSubscription(adminUserId, targetUserId, reason);
      return res.status(result.success ? 200 : 400).json(result);
    }

    // 6. Admin Paginated Users Endpoint
    if (method === 'GET' && action === 'users') {
      const page = Number(req.query?.page || 1);
      const limit = Number(req.query?.limit || 20);
      const search = String(req.query?.search || '');
      const statusFilter = String(req.query?.status || 'all');

      const result = await AdminBillingService.getUsersPaginated(page, limit, search, statusFilter);
      return res.status(result.success ? 200 : 400).json(result);
    }

    return res.status(404).json({ success: false, data: null, error: 'Endpoint action not found' });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('SaaS API Handler error:', err);
    return res.status(500).json({ success: false, data: null, error: errorMsg });
  }
}
