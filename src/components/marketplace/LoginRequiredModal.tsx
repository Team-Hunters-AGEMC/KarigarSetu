import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, UserPlus, X } from 'lucide-react';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({
  isOpen,
  onClose,
  title = 'Authentication Required',
  message = 'Please log in or create a customer account to continue.',
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      id="login-required-modal-overlay"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-5 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        id="login-required-modal"
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-base font-extrabold text-[#0c4b31]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 text-center py-2">
          <p className="text-sm text-gray-700 font-medium">
            {message}
          </p>
          <p className="text-xs text-gray-500">
            Guest visitors can freely explore approved crafts. A customer account is needed to add items to cart, place orders, message artisans, or request custom crafts.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/customer/login');
            }}
            id="modal-login-btn"
            className="w-full py-3 px-4 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white font-bold text-sm shadow-md shadow-[#0c4b31]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Login to Customer Account</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/customer/register');
            }}
            id="modal-create-account-btn"
            className="w-full py-3 px-4 rounded-xl bg-[#fff8ee] hover:bg-[#ffefd8] text-[#854511] border border-[#f5dcba] font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#e27d35]" />
            <span>Create New Account</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            id="modal-cancel-btn"
            className="w-full py-2.5 px-4 text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
