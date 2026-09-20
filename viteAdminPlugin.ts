import type { Plugin } from 'vite';
import crypto from 'crypto';

interface SessionData {
  id: number;
  name: string;
  email: string;
  username: string;
  role: 'admin';
  createdAt: number;
}

interface AuditLog {
  id: number;
  admin_id: number;
  admin_name: string;
  action: string;
  target_type?: string;
  target_id?: number;
  ip_address?: string;
  created_at: string;
}

// In-memory server-managed state for dev server runtime
const activeSessions = new Map<string, SessionData>();
let nextLogId = 1;
const auditLogs: AuditLog[] = [
  {
    id: nextLogId++,
    admin_id: 1,
    admin_name: 'Chief Quality Officer',
    action: 'SYSTEM_INITIALIZED',
    target_type: 'security_governance',
    target_id: 1,
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  }
];

let failedAttempts = 0;
let lockedUntil: number | null = null;

export function adminDevServerPlugin(): Plugin {
  return {
    name: 'karigarsetu-admin-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? new URL(req.url, 'http://localhost:3000') : null;
        if (!url || !url.pathname.startsWith('/api/admin')) {
          return next();
        }

        // Helper to parse JSON body
        const readBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        // Helper to get session from cookie
        const getSession = (): SessionData | null => {
          const cookieHeader = req.headers.cookie || '';
          const match = cookieHeader.match(/karigarsetu_admin_session=([^;]+)/);
          if (!match) return null;
          const token = match[1];
          const session = activeSessions.get(token);
          if (!session) return null;
          // Check 8-hour expiration
          if (Date.now() - session.createdAt > 8 * 60 * 60 * 1000) {
            activeSessions.delete(token);
            return null;
          }
          return session;
        };

        const json = (statusCode: number, data: any, headers: Record<string, string> = {}) => {
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json');
          for (const [k, v] of Object.entries(headers)) {
            res.setHeader(k, v);
          }
          res.end(JSON.stringify(data));
        };

        const logAudit = (adminId: number, adminName: string, action: string, targetType?: string, targetId?: number) => {
          auditLogs.unshift({
            id: nextLogId++,
            admin_id: adminId,
            admin_name: adminName,
            action,
            target_type: targetType,
            target_id: targetId,
            ip_address: req.socket.remoteAddress || '127.0.0.1',
            created_at: new Date().toISOString(),
          });
          if (auditLogs.length > 200) {
            auditLogs.pop();
          }
        };

        const path = url.pathname;

        // 1. POST /api/admin/auth/login
        if (path === '/api/admin/auth/login' && req.method === 'POST') {
          const now = Date.now();
          const body = await readBody();
          const identifier = String(body.email || body.identifier || '').trim().toLowerCase();
          const password = String(body.password || '');

          const validEmails = [
            'admin@karigarsetu.org',
            'admin',
            'arghyamandal765@gmail.com',
            'ronit37830@gmail.com',
            'hunters',
            'arghya',
            (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
          ].filter(Boolean);

          const validPasswords = [
            'Karigarsetu@2026',
            'KarigarSetuAdmin@2026',
            'karigarsetu@2026',
            process.env.ADMIN_PASSWORD,
          ].filter(Boolean);

          const isValidIdentifier = validEmails.includes(identifier);
          const isValidPassword = validPasswords.includes(password);

          // If valid credentials are provided, immediately unlock and authenticate!
          if (isValidIdentifier && isValidPassword) {
            failedAttempts = 0;
            lockedUntil = null;

            const sessionToken = crypto.randomBytes(32).toString('hex');
            let displayName = process.env.ADMIN_NAME || 'Chief Quality Officer';
            if (identifier.includes('arghya')) displayName = 'Arghya Mandal (Administrator)';
            if (identifier.includes('ronit')) displayName = 'Ronit (Administrator)';

            const adminUser: SessionData = {
              id: 1,
              name: displayName,
              email: identifier.includes('@') ? identifier : 'admin@karigarsetu.org',
              username: identifier.includes('@') ? identifier.split('@')[0] : identifier,
              role: 'admin',
              createdAt: now,
            };
            activeSessions.set(sessionToken, adminUser);
            logAudit(adminUser.id, adminUser.name, 'ADMIN_LOGIN', 'admin_user', adminUser.id);

            return json(
              200,
              {
                success: true,
                message: 'Administrator authenticated successfully.',
                user: {
                  id: adminUser.id,
                  name: adminUser.name,
                  email: adminUser.email,
                  username: adminUser.username,
                  role: adminUser.role,
                },
              },
              {
                'Set-Cookie': `karigarsetu_admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
              }
            );
          }

          // If locked and credentials were wrong
          if (lockedUntil && now < lockedUntil) {
            const remMins = Math.ceil((lockedUntil - now) / 60000);
            return json(429, {
              success: false,
              error: 'Account Locked',
              message: `Security Lockout: Too many failed login attempts. Please wait ${remMins} minute(s) before trying again, or use the 1-Click Instant Login button.`,
            });
          }

          failedAttempts += 1;
          if (failedAttempts >= 5) {
            lockedUntil = now + 15 * 60 * 1000; // 15 mins lock
          }
          logAudit(0, 'Unknown Requester', 'FAILED_LOGIN_ATTEMPT', 'admin_user', 0);
          return json(401, {
            success: false,
            message: 'Invalid administrator credentials. Please use password: Karigarsetu@2026',
          });
        }

        // 2. GET /api/admin/auth/me
        if (path === '/api/admin/auth/me' && req.method === 'GET') {
          const session = getSession();
          if (!session) {
            return json(401, {
              success: false,
              error: 'Unauthorized',
              message: 'Authentication required. No active administrator session found.',
            });
          }
          if (session.role !== 'admin') {
            return json(403, {
              success: false,
              error: 'Forbidden',
              message: 'Access Denied. Role clearance insufficient.',
            });
          }
          return json(200, {
            success: true,
            authenticated: true,
            user: {
              id: session.id,
              name: session.name,
              email: session.email,
              username: session.username,
              role: session.role,
            },
          });
        }

        // 3. POST /api/admin/auth/logout
        if (path === '/api/admin/auth/logout' && req.method === 'POST') {
          const cookieHeader = req.headers.cookie || '';
          const match = cookieHeader.match(/karigarsetu_admin_session=([^;]+)/);
          if (match) {
            const token = match[1];
            const session = activeSessions.get(token);
            if (session) {
              logAudit(session.id, session.name, 'ADMIN_LOGOUT', 'admin_user', session.id);
            }
            activeSessions.delete(token);
          }
          return json(
            200,
            {
              success: true,
              message: 'Administrator session terminated.',
            },
            {
              'Set-Cookie': 'karigarsetu_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
            }
          );
        }

        // Authenticate all remaining /api/admin/* routes
        const session = getSession();
        if (!session) {
          return json(401, {
            success: false,
            error: 'Unauthorized',
            message: 'Authentication required. No active administrator session found.',
          });
        }
        if (session.role !== 'admin') {
          return json(403, {
            success: false,
            error: 'Forbidden',
            message: 'Access Denied. Account does not have administrative clearance.',
          });
        }

        // 4. GET /api/admin/audit-logs
        if (path === '/api/admin/audit-logs' && req.method === 'GET') {
          return json(200, {
            success: true,
            count: auditLogs.length,
            data: auditLogs,
          });
        }

        // 5. POST /api/admin/products/:id/approve
        const approveMatch = path.match(/^\/api\/admin\/products\/(\d+)\/approve$/);
        if (approveMatch && req.method === 'POST') {
          const productId = parseInt(approveMatch[1], 10);
          logAudit(session.id, session.name, 'PRODUCT_APPROVED', 'product', productId);
          return json(200, {
            success: true,
            message: `Product #${productId} approved for buyer marketplace.`,
            productId,
            status: 'approved',
          });
        }

        // 6. POST /api/admin/products/:id/reject
        const rejectMatch = path.match(/^\/api\/admin\/products\/(\d+)\/reject$/);
        if (rejectMatch && req.method === 'POST') {
          const productId = parseInt(rejectMatch[1], 10);
          const body = await readBody();
          logAudit(session.id, session.name, 'PRODUCT_REJECTED', 'product', productId);
          return json(200, {
            success: true,
            message: `Product #${productId} rejected.`,
            productId,
            reason: body.reason,
            status: 'rejected',
          });
        }

        // 7. POST /api/admin/products/:id/restore
        const restoreMatch = path.match(/^\/api\/admin\/products\/(\d+)\/restore$/);
        if (restoreMatch && req.method === 'POST') {
          const productId = parseInt(restoreMatch[1], 10);
          logAudit(session.id, session.name, 'PRODUCT_RESTORED', 'product', productId);
          return json(200, {
            success: true,
            message: `Product #${productId} restored to review queue.`,
            productId,
            status: 'pending_ai_check',
          });
        }

        // 8. POST /api/admin/products/bulk-approve
        if (path === '/api/admin/products/bulk-approve' && req.method === 'POST') {
          const body = await readBody();
          const ids = body.product_ids || [];
          logAudit(session.id, session.name, 'BULK_APPROVED', 'product', ids.length);
          return json(200, {
            success: true,
            message: `Bulk approved ${ids.length} products.`,
            count: ids.length,
          });
        }

        // Default 404 for unhandled admin routes
        return json(404, { success: false, message: 'Admin endpoint not found' });
      });
    },
  };
}
