import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { adminApi, AdminUser } from '../../services/adminApi';

interface ProtectedAdminRouteProps {
  children?: React.ReactNode;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const location = useLocation();
  const [authState, setAuthState] = useState<{
    isLoading: boolean;
    isAuthenticated: boolean;
    user: AdminUser | null;
  }>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function verifyAdminSession() {
      setAuthState((current) => ({ ...current, isLoading: true }));

      try {
        const response = await adminApi.checkAdminAuth();

        if (!isMounted) return;

        const user = response.authenticated ? response.user ?? null : null;
        const isAdmin = Boolean(user && user.role === 'admin');

        setAuthState({
          isLoading: false,
          isAuthenticated: isAdmin,
          user: isAdmin ? user : null,
        });
      } catch (error) {
        if (!isMounted) return;

        console.error('Admin session verification failed:', error);
        setAuthState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
        });
      }
    }

    void verifyAdminSession();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (authState.isLoading) {
    return (
      <div
        id="admin-auth-loading-screen"
        className="min-h-screen bg-[#072418] text-white flex flex-col items-center justify-center p-6"
      >
        <div className="w-full max-w-md p-8 rounded-2xl bg-[#0b3323] border border-[#18533b] shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 text-emerald-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-2">
            Verifying Administrator Credentials
          </h2>
          <p className="text-sm text-emerald-200/70 mb-4">
            Checking your secure administrator session...
          </p>
          <div className="w-full bg-[#072418] rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-400 h-full w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
