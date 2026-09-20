/**
 * KarigarSetu AI - Admin Security & Moderation API Service
 * Handles server-managed session authentication and administrative actions.
 * All requests include credentials (HttpOnly cookies).
 * Never relies on client-side state as proof of administrative authorization.
 */
import { API_BASE } from './apiConfig';
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  username: string;
  role: 'admin';
}

export interface AdminAuditLog {
  id: number;
  admin_id: number;
  admin_name: string;
  action: string;
  target_type?: string;
  target_id?: number;
  ip_address?: string;
  created_at: string;
}

export interface AdminDashboardStats {
  total: number;
  autoApproved: number;
  approved: number;
  pendingReview: number;
  rejected: number;
  reported: number;
}

export interface AdminCheckResponse {
  authenticated: boolean;
  user?: AdminUser;
  error?: string;
  status?: number;
}
export interface ArtisanApplication {
  id: number; name: string; phone: string; email: string; address: string;
  language: string; craft_type: string; location: string; experience: number;
  proof_image_1: string; proof_image_2: string; proof_video: string;
  verification_status: 'pending'|'approved'|'rejected'; review_note?: string; created_at: string;
}


export const adminApi = {
  async getArtisanApplications(): Promise<ArtisanApplication[]> {
    try {
      const res = await fetch(`${API_BASE}/api/admin/artisan-applications`, { credentials: 'include' });
      const data = await res.json(); return res.ok ? data.applications || [] : [];
    } catch { return []; }
  },

  async decideArtisanApplication(id: number, status: 'approved'|'rejected', note = ''): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/admin/artisan-applications/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ status, note }),
      }); return res.ok;
    } catch { return false; }
  },
  /**
   * Check if current session is authenticated with role 'admin' on the backend.
   * Returns authenticated: true and admin profile if valid; otherwise false.
   */
  async checkAdminAuth(): Promise<AdminCheckResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/me`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        return { authenticated: false, status: 401, error: 'Unauthorized: No active admin session.' };
      }

      if (response.status === 403) {
        return { authenticated: false, status: 403, error: 'Forbidden: Account does not hold administrative clearance.' };
      }

      if (!response.ok) {
        return { authenticated: false, status: response.status, error: `Authentication check failed (${response.status})` };
      }

      const data = await response.json();
      if (data?.authenticated && data?.user?.role === 'admin') {
        return {
          authenticated: true,
          user: data.user,
          status: 200,
        };
      }

      return { authenticated: false, status: 403, error: 'Invalid admin role credentials.' };
    } catch (err: any) {
      console.warn('[Admin Auth Check Error]', err);
      return { authenticated: false, status: 500, error: err?.message || 'Network error verifying admin credentials.' };
    }
  },

  /**
   * Secure Admin Sign-in.
   * Validates credentials against backend and sets server HttpOnly session cookie.
   */
  async login(identifier: string, password: string): Promise<{ success: boolean; user?: AdminUser; message?: string; locked?: boolean }> {
    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: identifier.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 429) {
        return {
          success: false,
          locked: true,
          message: data?.message || 'Account temporarily locked due to excessive failed attempts. Try again in 15 minutes.',
        };
      }

      if (!response.ok || !data?.success) {
        return {
          success: false,
          message: data?.message || 'Invalid administrator credentials. Access attempts are audited.',
        };
      }

      return {
        success: true,
        user: data.user,
        message: data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Unable to connect to administrative authentication server.',
      };
    }
  },

  /**
   * Secure Admin Sign-out.
   * Clears backend session and cookie, then logs audit event.
   */
  async logout(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/admin/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      return response.ok;
    } catch (err) {
      console.warn('[Admin Logout Error]', err);
      return false;
    }
  },

  /**
   * Fetch Dashboard Overview metrics and audit summaries
   */
  async getDashboardData(): Promise<{ stats: AdminDashboardStats; adminUser: AdminUser } | null> {
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  },

  /**
   * Fetch complete product moderation list
   */
  async getProducts(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/api/admin/dashboard?view=total`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.products || [];
    } catch {
      return [];
    }
  },

  /**
   * Approve single craft for buyer marketplace
   */
  async approveProduct(productId: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${productId}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'approved', decisionNote: 'Approved by administrator.' }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Reject single craft with formal reason
   */
  async rejectProduct(productId: number, reason: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${productId}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'rejected', decisionNote: reason }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Restore rejected product back to review queue
   */
  async restoreProduct(productId: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${productId}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'under_review', decisionNote: 'Restored to the admin review queue.' }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Bulk approve a list of products
   */
  async bulkApproveProducts(productIds: number[]): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ product_ids: productIds }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Fetch administrative audit logs
   */
  async getAuditLogs(): Promise<AdminAuditLog[]> {
    try {
      const res = await fetch(`${API_BASE}/api/admin/audit-logs`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  },
};
