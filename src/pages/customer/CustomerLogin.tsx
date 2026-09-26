import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, ArrowLeft, ShieldCheck, AlertCircle, LogOut, User } from 'lucide-react';
import { getCurrentCustomer, setCurrentCustomer, logoutCustomer, CustomerUser } from '../../services/customerAuth';

export const CustomerLogin: React.FC = () => {
  const navigate = useNavigate();
  const [currentCustomer, setLocalCustomer] = useState<CustomerUser | null>(getCurrentCustomer());
  const [mobileOrEmail, setMobileOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileOrEmail.trim() || !password.trim()) {
      setError('Please provide your registered mobile number/email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: mobileOrEmail.trim(), password }),
      });
      const responseText = await response.text();
      const contentType = response.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        throw new Error(
          response.status === 404
            ? 'Customer login API পাওয়া যায়নি। backend/app.py আপডেট করে Flask server restart করুন।'
            : `Backend JSON-এর বদলে HTML পাঠিয়েছে (HTTP ${response.status}). Flask server port 5000-এ চলছে কি না দেখুন।`,
        );
      }

      let result: { success?: boolean; data?: CustomerUser; message?: string };
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error('Backend থেকে invalid JSON response এসেছে।');
      }

      if (!response.ok || !result.success) throw new Error(result.message || 'Login failed');
      if (!result.data) throw new Error('Login সফল হলেও customer data পাওয়া যায়নি।');
      setCurrentCustomer(result.data);
      navigate('/marketplace');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Backend-এর সঙ্গে সংযোগ করা যাচ্ছে না');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        <div className="text-center space-y-2">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c4b31] hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Return to Marketplace</span>
          </Link>

          <div className="w-12 h-12 rounded-2xl bg-[#0c4b31] text-white flex items-center justify-center font-extrabold text-xl mx-auto shadow-md">
            ✦
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c4b31]">
            Customer Sign In
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Sign in to place orders, message artisans, and request custom handmade crafts.
          </p>
        </div>

        {currentCustomer && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-sm shrink-0">
                {currentCustomer.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950">Logged in as {currentCustomer.name}</p>
                <p className="text-[11px] text-amber-700">{currentCustomer.email || currentCustomer.mobile}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                id="customer-login-page-logout-btn"
                onClick={() => {
                  logoutCustomer();
                  setLocalCustomer(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Customer Logout</span>
              </button>
              <Link
                to="/marketplace"
                className="px-3 py-1.5 rounded-xl bg-[#0c4b31] hover:bg-[#083623] text-white text-xs font-bold"
              >
                Marketplace →
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-[#dce8df] p-6 sm:p-8 shadow-sm space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Mobile Number or Email
              </label>
              <input
                type="text"
                id="customer-login-input"
                required
                placeholder="e.g. 9876543210 or yourname@email.com"
                value={mobileOrEmail}
                onChange={(e) => setMobileOrEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="customer-password-input"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
              />
            </div>

            <button
              type="submit"
              id="customer-login-submit-btn"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#0c4b31]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Signing In...' : 'Sign In as Buyer'}</span>
            </button>
          </form>

          <div className="text-center pt-2">
            <span className="text-xs text-gray-500">Don&apos;t have a customer account? </span>
            <Link
              to="/customer/register"
              id="customer-to-register-link"
              className="text-xs font-bold text-[#0c4b31] hover:underline"
            >
              Create Customer Account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
