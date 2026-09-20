import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Loader2,
  Clock
} from 'lucide-react';
import { adminApi } from '../../services/adminApi';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingExisting, setIsVerifyingExisting] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  // Check if admin is already logged in
  useEffect(() => {
    async function checkExisting() {
      const res = await adminApi.checkAdminAuth();
      if (res.authenticated && res.user?.role === 'admin') {
        const destination = (location.state as any)?.from?.pathname || '/admin/dashboard';
        navigate(destination, { replace: true });
      } else {
        setIsVerifyingExisting(false);
      }
    }
    checkExisting();
  }, [navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Please provide both administrator identifier and security key.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const res = await adminApi.login(identifier, password);
    setIsLoading(false);

    if (res.success && res.user?.role === 'admin') {
      const destination = (location.state as any)?.from?.pathname || '/admin/dashboard';
      navigate(destination, { replace: true });
    } else {
      setErrorMessage(res.message || 'Invalid administrator credentials. Access attempts are audited.');
      if (res.locked) {
        setIsLocked(true);
      }
    }
  };

  if (isVerifyingExisting) {
    return (
      <div className="min-h-screen bg-[#072418] text-white flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-emerald-400 text-sm font-semibold">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Verifying administrator portal status...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="admin-login-portal-container"
      className="min-h-screen bg-[#072015] text-gray-100 flex flex-col justify-between"
    >
      {/* Top Security Bar */}
      <div className="border-b border-[#12422c] bg-[#051810] px-6 py-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold tracking-wide">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>KarigarSetu AI • Quality & Governance Portal</span>
        </div>
        <div className="flex items-center gap-4 text-gray-400">
          <span className="hidden sm:inline font-mono text-[11px] text-emerald-500/80">
            RBAC Enforced • HttpOnly Session
          </span>
          <Link 
            to="/" 
            className="text-gray-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </Link>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-[#0a291b] border border-[#164a32] rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Administrator Login
            </h1>
            <p className="text-xs text-emerald-200/70 mt-1.5">
              Authorized personnel only. All access events are cryptographically audited.
            </p>
          </div>

          {/* Error / Lockout Banner */}
          {errorMessage && (
            <div 
              id="admin-login-error-alert"
              className={`p-3.5 rounded-xl text-xs font-medium mb-6 flex items-start gap-2.5 border ${
                isLocked 
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300' 
                  : 'bg-red-950/40 border-red-800/80 text-red-300'
              }`}
            >
              {isLocked ? <Clock className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <div className="flex-1 leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5">
                Admin Email or Username
              </label>
              <div className="relative">
                <input
                  id="admin-login-email-input"
                  type="text"
                  required
                  autoFocus
                  disabled={isLoading || isLocked}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@karigarsetu.org"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#061b11] border border-[#1a553a] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all disabled:opacity-50"
                />
                <Mail className="w-4 h-4 text-emerald-500/60 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-200 uppercase tracking-wider mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="admin-login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isLoading || isLocked}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#061b11] border border-[#1a553a] text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all disabled:opacity-50 font-mono"
                />
                <Lock className="w-4 h-4 text-emerald-500/60 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating Clearance...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate Session</span>
                </>
              )}
            </button>
          </form>


        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#12422c] bg-[#051810] px-6 py-4 text-center text-xs text-gray-500">
        KarigarSetu AI Governance Infrastructure • Internal Security Notice: Unauthorized access or attempted privilege escalation is recorded in the immutable audit log.
      </div>
    </div>
  );
};
