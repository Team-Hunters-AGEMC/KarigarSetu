import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { getCurrentCustomer, setCurrentCustomer, logoutCustomer, CustomerUser } from '../../services/customerAuth';

export const CustomerRegister: React.FC = () => {
  const navigate = useNavigate();
  const [currentCustomer, setLocalCustomer] = useState<CustomerUser | null>(getCurrentCustomer());

  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    city: '',
    district: '',
    state: 'West Bengal',
    pinCode: '',
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.mobile.trim())) {
      setError('Please provide a valid 10-digit Indian mobile number.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!formData.address.trim() || !formData.city.trim() || !formData.pinCode.trim()) {
      setError('Please complete your delivery address and PIN code.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.fullName,
          mobile: formData.mobile,
          email: formData.email,
          password: formData.password,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          pinCode: formData.pinCode,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Registration failed');
      setCurrentCustomer(result.data as CustomerUser);
      navigate('/marketplace');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Backend-এর সঙ্গে সংযোগ করা যাচ্ছে না');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf6] py-10 px-4 sm:px-6">
      <div className="max-w-xl w-full mx-auto space-y-6">
        
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
            Create Customer Account
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Join thousands of conscious buyers directly supporting rural artisan livelihoods.
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
                id="customer-register-page-logout-btn"
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

        <div className="bg-white rounded-3xl border border-[#dce8df] p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="e.g. Sweta Sen"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Indian Mobile Number (10 digits) *
                </label>
                <input
                  type="tel"
                  name="mobile"
                  required
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={formData.mobile}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="sweta.sen@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2 bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
              />
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
                />
              </div>
            </div>

            {/* Address */}
            <div className="pt-2 border-t border-gray-100">
              <span className="text-[11px] font-extrabold text-[#e27d35] tracking-wider uppercase block mb-2">
                Delivery Address Information
              </span>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Street Address & House / Flat No. *
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  placeholder="e.g. 15 Park Street, Apt 4C"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  placeholder="Kolkata"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  District
                </label>
                <input
                  type="text"
                  name="district"
                  placeholder="Kolkata"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  State
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-2 py-2 bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
                >
                  <option value="West Bengal">West Bengal</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Jharkhand">Jharkhand</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Assam">Assam</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Other">Other State</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  PIN Code *
                </label>
                <input
                  type="text"
                  name="pinCode"
                  required
                  maxLength={6}
                  placeholder="700016"
                  value={formData.pinCode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-[#fafcfa] border border-[#cfded3] rounded-xl focus:outline-none focus:border-[#0c4b31]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#0c4b31]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#ffd186]" />
              <span>{isLoading ? 'Creating Account...' : 'Complete Customer Registration'}</span>
            </button>
          </form>

          <div className="text-center pt-4 border-t border-gray-100 mt-4">
            <span className="text-xs text-gray-500">Already registered as a customer? </span>
            <Link
              to="/customer/login"
              className="text-xs font-bold text-[#0c4b31] hover:underline"
            >
              Sign In Here
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
