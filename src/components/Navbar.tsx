import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  Store, 
  UserCheck, 
  PlusCircle, 
  Globe, 
  ChevronDown, 
  Layers, 
  Menu, 
  X, 
  LogOut, 
  User 
} from 'lucide-react';
import { 
  getCurrentArtisan, 
  getLoggedInArtisan, 
  getStoredArtisans, 
  setCurrentArtisan, 
  logoutArtisan, 
  INITIAL_ARTISANS 
} from '../data/seedData';
import { getCurrentCustomer, logoutCustomer, CustomerUser } from '../services/customerAuth';
import { ArtisanProfile, SupportedLanguage } from '../types';
const karigarSetuLogo = new URL(
  '../assets/karigarsetu-logo.png',
  import.meta.url
).href;

interface NavbarProps {
  currentLang?: SupportedLanguage;
  onLangChange?: (lang: SupportedLanguage) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentLang = 'en-IN', 
  onLangChange 
}) => {
  const navTextByLanguage = {
    'en-IN': { tagline: 'Voice-First Cataloging in বাংলা, हिन्दी & English for Indian Artisans', buyer: 'Buyer', logout: 'Logout', artisan: 'Artisan', signedOut: 'Signed Out' },
    'bn-IN': { tagline: 'ভারতীয় কারিগরদের জন্য বাংলা, हिन्दी ও English-এ ভয়েস-ফার্স্ট ক্যাটালগ', buyer: 'ক্রেতা', logout: 'লগআউট', artisan: 'কারিগর', signedOut: 'সাইন আউট' },
    'hi-IN': { tagline: 'भारतीय कारीगरों के लिए বাংলা, हिन्दी और English में वॉइस-फर्स्ट कैटलॉग', buyer: 'खरीदार', logout: 'लॉगआउट', artisan: 'कारीगर', signedOut: 'साइन आउट' },
  } as const;
  const navText = currentLang === 'bn-IN'
    ? navTextByLanguage['bn-IN']
    : currentLang === 'hi-IN'
      ? navTextByLanguage['hi-IN']
      : navTextByLanguage['en-IN'];
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isArtisanRoute = location.pathname.startsWith('/artisan');
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(getLoggedInArtisan());
  const [customer, setCustomer] = useState<CustomerUser | null>(getCurrentCustomer());
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const artisans = getStoredArtisans();

  useEffect(() => {
    const handleArtisanUpdate = () => {
      setArtisan(getLoggedInArtisan());
    };
    const handleCustomerUpdate = () => {
      setCustomer(getCurrentCustomer());
    };
    window.addEventListener('karigarsetu_artisan_updated', handleArtisanUpdate);
    window.addEventListener('karigarsetu_customer_updated', handleCustomerUpdate);
    return () => {
      window.removeEventListener('karigarsetu_artisan_updated', handleArtisanUpdate);
      window.removeEventListener('karigarsetu_customer_updated', handleCustomerUpdate);
    };
  }, []);

  const selectArtisan = (item: ArtisanProfile) => {
    setCurrentArtisan(item);
    setArtisan(item);
    setShowRoleMenu(false);
  };

  const handleArtisanLogout = () => {
    logoutArtisan();
    setArtisan(null);
    setShowRoleMenu(false);
  };

  const handleCustomerLogout = () => {
    logoutCustomer();
    setCustomer(null);
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-[#fcfaf6]/95 backdrop-blur-md border-b border-[#e2eae4]">
      {/* Utility top ribbon */}
      <div className="bg-[#0b4830] text-[#e3f4ea] text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-[#f9bc60]">
              <Sparkles className="w-3.5 h-3.5" /> KarigarSetu Handmade
            </span>
            <span className="hidden sm:inline text-[#a9c9b9]">|</span>
            <span className="hidden sm:inline text-[#d5e7dd]">
              {navText.tagline}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            {/* Language indicator */}
            <div className="flex items-center gap-1.5 text-[#e6f3eb]">
              <Globe className="w-3.5 h-3.5 text-[#f9bc60]" />
              <select
                id="language-select"
                aria-label="Select preferred language"
                value={currentLang}
                onChange={(e) => onLangChange?.(e.target.value as SupportedLanguage)}
                className="bg-transparent text-xs text-white border-none outline-none cursor-pointer pr-1 font-medium"
              >
                <option value="bn-IN" className="bg-[#0c4b31] text-white">বাংলা (Bengali)</option>
                <option value="hi-IN" className="bg-[#0c4b31] text-white">हिन्दी (Hindi)</option>
                <option value="en-IN" className="bg-[#0c4b31] text-white">English</option>
              </select>
            </div>

            {/* Customer Status in Ribbon (if logged in) */}
            {customer && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#10422c] border border-emerald-700/50 text-[#e6f3eb]">
                <User className="w-3 h-3 text-[#f9bc60]" />
                <span className="truncate max-w-[100px]">{navText.buyer}: <strong className="text-white">{customer.name.split(' ')[0]}</strong></span>
                <button
                  type="button"
                  id="ribbon-customer-logout-btn"
                  onClick={handleCustomerLogout}
                  className="text-red-300 hover:text-white font-bold ml-1 text-[10px] hover:underline cursor-pointer flex items-center gap-0.5"
                  title="Customer Logout"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  <span>{navText.logout}</span>
                </button>
              </div>
            )}

            {/* Quick Persona Switcher & Artisan Status */}
            <div className="relative">
              <button
                id="artisan-persona-btn"
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#155a3e] hover:bg-[#1b6b4a] text-[#f6faf8] transition-colors cursor-pointer"
                title="Switch active demo persona or log out"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${artisan ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span>
                  {navText.artisan}: <strong className="text-white font-semibold">{artisan ? artisan.name.split(' ')[0] : `(${navText.signedOut})`}</strong>
                </span>
                <ChevronDown className="w-3 h-3 text-[#d2e4db]" />
              </button>

              {showRoleMenu && (
                <div 
                  className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 text-gray-800"
                  id="persona-dropdown-menu"
                >
                  {artisan ? (
                    <div className="p-2 mb-1.5 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <p className="text-[11px] font-bold text-emerald-950 truncate">Signed in: {artisan.name}</p>
                        <p className="text-[10px] text-emerald-700 truncate">{artisan.craftType} Artisan</p>
                      </div>
                      <button
                        type="button"
                        id="ribbon-artisan-logout-btn"
                        onClick={handleArtisanLogout}
                        className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        title="Log out from Artisan Studio"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Logout</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 mb-1.5 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-[11px] font-bold text-amber-900">Artisan Studio: Signed Out</p>
                      <p className="text-[10px] text-amber-700 mt-0.5">Select a profile below for 1-click login or sign in to your own account.</p>
                    </div>
                  )}

                  <div className="px-2 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Switch Demo Artisan Profile</span>
                  </div>
                  {artisans.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectArtisan(item)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 text-xs transition-colors cursor-pointer ${
                        artisan?.id === item.id ? 'bg-[#edf8f2] text-[#0b4830] font-bold' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <img 
                        src={item.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50'} 
                        alt={item.name} 
                        className="w-7 h-7 rounded-full object-cover border border-emerald-200"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{item.craftType} • {item.location.split(',')[0]}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <Link to="/" className="group shrink-0" id="navbar-brand-link" aria-label="KarigarSetu home">
          <img
            src={karigarSetuLogo}
            alt="KarigarSetu — Handmade Crafts, Direct from Artisans"
            className="h-16 sm:h-[68px] lg:h-[76px] w-auto max-w-[320px] sm:max-w-[420px] lg:max-w-[500px] object-contain transition-transform duration-200 group-hover:scale-[1.01]"
          />
        </Link>

        {/* Desktop Nav Links (Hidden completely on first public homepage) */}
        {isArtisanRoute && artisan && (
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              to="/marketplace"
              id="nav-marketplace"
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                isActive('/marketplace')
                  ? 'bg-[#0b4830] text-white shadow-sm'
                  : 'text-[#2a3f34] hover:text-[#0b4830] hover:bg-[#eaf4ee]'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Marketplace</span>
            </Link>

            <Link
              to="/artisan/dashboard"
              id="nav-artisan-dashboard"
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                isActive('/artisan/dashboard')
                  ? 'bg-[#0b4830] text-white shadow-sm'
                  : 'text-[#2a3f34] hover:text-[#0b4830] hover:bg-[#eaf4ee]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Artisan Studio</span>
            </Link>

          </nav>
        )}

        {/* Action Buttons: Customer Login, Customer Sign Up, Artisan Login */}
        <div className="hidden sm:flex items-center gap-2 lg:gap-3 shrink-0">
          {/* Customer actions belong only on the public home page. */}
          {isHomePage && (customer ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs font-semibold">
              <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="font-bold text-amber-950 max-w-[90px] lg:max-w-[120px] truncate" title={`Customer: ${customer.name}`}>
                {customer.name.split(' ')[0]}
              </span>
              <button
                type="button"
                id="nav-customer-logout-btn"
                onClick={handleCustomerLogout}
                className="text-red-600 hover:text-red-800 font-bold ml-1 hover:underline flex items-center gap-0.5 text-[11px] cursor-pointer"
                title="Log Out Customer Account"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 lg:gap-2">
              <Link
                to="/customer/login"
                id="nav-customer-login-btn"
                className="px-3 lg:px-3.5 py-2 text-xs font-bold text-[#e27d35] bg-white border border-[#f5d0b5] hover:bg-[#fff9f5] rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-[#e27d35]" />
                <span>Customer Login</span>
              </Link>
              <Link
                to="/customer/register"
                id="nav-customer-register-btn"
                className="px-3 lg:px-3.5 py-2 text-xs font-bold text-[#0c4b31] bg-[#edf8f2] border border-[#c2e2ce] hover:bg-[#e1f2e7] rounded-xl transition-all shadow-2xs flex items-center gap-1"
              >
                <span>Customer Sign Up</span>
              </Link>
            </div>
          ))}

          {/* Artisan Account or Artisan Login */}
          {artisan ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#edf8f1] border border-[#c2e2ce] rounded-xl text-xs font-semibold">
              <Link to="/artisan/dashboard" className="flex items-center gap-1.5 font-bold text-[#0c4b31] hover:underline max-w-[90px] lg:max-w-[120px] truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>{artisan.name.split(' ')[0]}</span>
              </Link>
              <button
                type="button"
                id="nav-artisan-logout-btn"
                onClick={handleArtisanLogout}
                className="text-red-600 hover:text-red-800 font-bold ml-1 hover:underline flex items-center gap-0.5 text-[11px] cursor-pointer"
                title="Log Out Artisan Account"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/artisan/register"
              id="nav-register-btn"
              className="px-3.5 lg:px-4 py-2 text-xs font-bold text-white bg-[#0c4b31] hover:bg-[#073623] rounded-xl transition-all shadow-md shadow-[#0c4b31]/20 flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-[#ffd186]" />
              <span>Artisan Login</span>
            </Link>
          )}

          {/* List Craft button (Hidden completely on first public homepage navbar) */}
          {isArtisanRoute && artisan && (
            <Link
              to="/artisan/add-product"
              id="nav-start-listing-btn"
              className="px-3.5 lg:px-4 py-2 text-xs font-bold text-white bg-[#0c4b31] hover:bg-[#073623] rounded-xl transition-all shadow-md shadow-[#0c4b31]/20 flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-[#ffd186]" />
              <span>+ List Craft</span>
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#0b4830] hover:bg-[#eaf4ee] rounded-lg cursor-pointer"
            aria-label="Toggle mobile menu"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200 px-4 pt-3 pb-5 space-y-3 animate-fadeIn">
          {/* If NOT homepage, render the navigation shortcuts */}
          {isArtisanRoute && artisan && (
            <div className="space-y-1 pb-2 border-b border-gray-100">
              <Link
                to="/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-bold text-[#0c4b31] hover:bg-[#edf7f1]"
              >
                Marketplace
              </Link>
              <Link
                to="/artisan/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-bold text-[#0c4b31] hover:bg-[#edf7f1]"
              >
                Artisan Studio {artisan ? `(${artisan.name.split(' ')[0]})` : ''}
              </Link>
            </div>
          )}

          {/* User Account Controls in Mobile */}
          <div className="space-y-2">
            {/* Customer actions are available only on the public home page. */}
            {isHomePage && (customer ? (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-700" />
                    <span>Customer: {customer.name}</span>
                  </p>
                  <p className="text-[10px] text-amber-700">{customer.email || customer.mobile}</p>
                </div>
                <button
                  type="button"
                  id="mobile-customer-logout-btn"
                  onClick={() => {
                    handleCustomerLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/customer/login"
                  id="mobile-customer-login-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2.5 px-2 text-xs font-bold text-[#e27d35] bg-[#fff8f2] border border-[#f5d0b5] rounded-xl"
                >
                  Customer Login
                </Link>
                <Link
                  to="/customer/register"
                  id="mobile-customer-register-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2.5 px-2 text-xs font-bold text-[#0c4b31] bg-[#edf8f2] border border-[#c2e2ce] rounded-xl"
                >
                  Customer Sign Up
                </Link>
              </div>
            ))}

            {/* Artisan Section */}
            {artisan ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Artisan: {artisan.name}</span>
                  </p>
                  <p className="text-[10px] text-emerald-700">{artisan.craftType} • {artisan.location.split(',')[0]}</p>
                </div>
                <button
                  type="button"
                  id="mobile-artisan-logout-btn"
                  onClick={() => {
                    handleArtisanLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/artisan/register"
                  id="mobile-artisan-login-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-xs font-bold text-white bg-[#0c4b31] hover:bg-[#073623] rounded-xl"
                >
                  Artisan Login
                </Link>
                {false && (
                  <Link
                    to="/artisan/add-product"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2.5 text-xs font-bold text-[#ffd186] bg-[#0c4b31] rounded-xl"
                  >
                    + List Craft
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
