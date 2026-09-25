import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingBag, 
  Package, 
  User, 
  ChevronDown, 
  LogOut, 
  Menu, 
  X, 
  Sparkles, 
  Layers,
  ShieldCheck,
  ArrowUpRight,
  Store,
  Tag,
  LoaderCircle,
} from 'lucide-react';
import { getCurrentCustomer, setCurrentCustomer, logoutCustomer, getCartCount, CustomerUser } from '../../services/customerAuth';
import { getLoggedInArtisan, logoutArtisan } from '../../data/seedData';
import { LoginRequiredModal } from './LoginRequiredModal';
import { CraftCategory, ArtisanProfile } from '../../types';
import { marketplaceApi, MarketplaceProduct } from '../../services/marketplaceApi';

interface MarketplaceNavbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedCategory?: string;
  onSelectCategory?: (category: CraftCategory | 'All') => void;
}

const CATEGORY_LIST: { id: CraftCategory | 'All'; label: string }[] = [
  { id: 'All', label: 'All Categories' },
  { id: 'Pottery', label: 'Terracotta & Pottery' },
  { id: 'Handloom', label: 'Handloom & Textiles' },
  { id: 'Metalcraft', label: 'Dokra & Metalcraft' },
  { id: 'Woodcraft', label: 'Carved Woodcraft' },
  { id: 'Jewellery', label: 'Heritage Jewellery' },
  { id: 'Painting', label: 'Folk Art & Painting' },
];

export const MarketplaceNavbar: React.FC<MarketplaceNavbarProps> = ({
  searchQuery = '',
  onSearchChange,
  selectedCategory = 'All',
  onSelectCategory,
}) => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerUser | null>(getCurrentCustomer());
  const [artisan, setArtisan] = useState<ArtisanProfile | null>(getLoggedInArtisan());
  const [cartCount, setCartCount] = useState<number>(getCartCount());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalContext, setLoginModalContext] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [suggestionProducts, setSuggestionProducts] = useState<MarketplaceProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  useEffect(() => {
    const handleCustomerUpdate = () => {
      setCustomer(getCurrentCustomer());
      setCartCount(getCartCount());
    };
    const handleArtisanUpdate = () => {
      setArtisan(getLoggedInArtisan());
    };
    window.addEventListener('karigarsetu_customer_updated', handleCustomerUpdate);
    window.addEventListener('karigarsetu_cart_updated', handleCustomerUpdate);
    window.addEventListener('karigarsetu_artisan_updated', handleArtisanUpdate);
    return () => {
      window.removeEventListener('karigarsetu_customer_updated', handleCustomerUpdate);
      window.removeEventListener('karigarsetu_cart_updated', handleCustomerUpdate);
      window.removeEventListener('karigarsetu_artisan_updated', handleArtisanUpdate);
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSuggestionProducts([]);
      setSuggestionsLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const data = await marketplaceApi.getApprovedProducts({
          category: 'All',
          search: query,
          sort: 'popular',
          maxPrice: 10000,
          inStockOnly: false,
        });
        setSuggestionProducts(data.slice(0, 5));
      } catch {
        setSuggestionProducts([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const handleProtectedAction = (destination: string, contextMessage: string) => {
    if (!customer) {
      setLoginModalContext(contextMessage);
      setShowLoginModal(true);
      return;
    }
    navigate(destination);
  };

  const handleCustomerLogout = () => {
    logoutCustomer();
    setShowProfileMenu(false);
    navigate('/marketplace');
  };

  const handleArtisanLogout = () => {
    logoutArtisan();
    setArtisan(null);
  };

  const selectSuggestion = (value: string) => {
    onSearchChange?.(value);
    setShowSuggestions(false);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const categorySuggestions = CATEGORY_LIST.filter((item) =>
    item.id !== 'All' && item.label.toLowerCase().includes(normalizedQuery),
  ).slice(0, 2);
  const artisanSuggestions = [...new Set(
    suggestionProducts.map((product) => product.artisan_name).filter(Boolean),
  )].slice(0, 2);
  const hasSuggestions = suggestionProducts.length > 0 || categorySuggestions.length > 0 || artisanSuggestions.length > 0;

  return (
    <header className="sticky top-0 z-40 bg-[#fcfaf6]/95 backdrop-blur-md border-b border-[#e2eae4]">
      {/* Top micro ribbon */}
      <div className="bg-[#0b4830] text-[#e3f4ea] text-[11px] py-1 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#f9bc60] font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> KarigarSetu Verified Marketplace
            </span>
            <span className="hidden sm:inline text-emerald-300">|</span>
            <span className="hidden sm:inline text-[#d5e7dd]">
              100% Authentic Indian Handicrafts • Direct Artisan Fair Living Wage
            </span>
          </div>

          <div className="hidden">
            {artisan ? (
              <div className="flex items-center gap-1.5">
                <Link to="/artisan/dashboard" className="text-[#ffd186] hover:underline font-semibold flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>Artisan: {artisan.name.split(' ')[0]}</span>
                </Link>
                <button
                  type="button"
                  id="mkt-artisan-logout-btn"
                  onClick={handleArtisanLogout}
                  className="text-red-300 hover:text-white text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/60 flex items-center gap-0.5 cursor-pointer transition-colors"
                  title="Log Out of Artisan Account"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link to="/artisan/dashboard" className="text-[#ffd186] hover:underline font-semibold flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>Artisan Portal</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-3 lg:gap-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group" id="mkt-nav-brand">
          <div className="w-9 h-9 rounded-xl bg-[#0c4b31] text-white flex items-center justify-center font-extrabold text-base shadow-sm group-hover:scale-105 transition-transform">
            ✦
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-xl sm:text-2xl text-[#0b4830] tracking-tight">KarigarSetu</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-[#e87722] text-white">
                MARKET
              </span>
            </div>
            <p className="text-[9px] font-semibold text-[#64746d] -mt-0.5 tracking-wider uppercase">
              Artisan Handcrafted
            </p>
          </div>
        </Link>

        {/* Categories Dropdown */}
        <div className="relative hidden md:block shrink-0">
          <button
            type="button"
            onClick={() => setShowCategoriesMenu(!showCategoriesMenu)}
            id="mkt-categories-menu-btn"
            className="px-3.5 py-2 rounded-xl bg-white border border-[#d2dfd6] hover:border-[#0c4b31] text-xs font-bold text-[#0c4b31] flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <span>{selectedCategory === 'All' ? 'Categories' : selectedCategory}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
          </button>

          {showCategoriesMenu && (
            <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 animate-fadeIn text-xs">
              {CATEGORY_LIST.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory?.(cat.id);
                    setShowCategoriesMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-[#edf8f1] text-[#0c4b31] font-bold'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="marketplace-global-search"
            type="text"
            placeholder="Search terracotta, handloom silk, dokra brass, woodcraft..."
            value={searchQuery}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              onSearchChange?.(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowSuggestions(false);
              if (e.key === 'Enter') setShowSuggestions(false);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-[#cfddd3] rounded-xl focus:outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/10 transition-all shadow-xs"
          />

          {showSuggestions && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] overflow-hidden rounded-xl border border-[#d9e5dc] bg-white shadow-xl z-50 text-xs">
              {suggestionsLoading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-gray-500">
                  <LoaderCircle className="w-4 h-4 animate-spin text-[#0c4b31]" />
                  Searching crafts…
                </div>
              ) : hasSuggestions ? (
                <>
                  {suggestionProducts.map((product) => (
                    <button
                      key={`product-${product.id}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(product.product_name)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f1f8f4] transition-colors border-b border-gray-100"
                    >
                      <img
                        src={product.image_url}
                        alt=""
                        className="w-9 h-9 rounded-lg bg-[#edf5ef] object-cover border border-[#e1ebe4]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-[#1a2e24]">{product.product_name}</span>
                        <span className="block truncate text-[10px] text-gray-500">by {product.artisan_name} · {product.category}</span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-gray-400 shrink-0" />
                    </button>
                  ))}

                  {categorySuggestions.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onSelectCategory?.(category.id);
                        onSearchChange?.('');
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f1f8f4] transition-colors border-b border-gray-100"
                    >
                      <Tag className="w-4 h-4 text-[#e87722]" />
                      <span className="flex-1"><b>{category.label}</b><span className="text-gray-500"> in Categories</span></span>
                      <ArrowUpRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}

                  {artisanSuggestions.map((artisanName) => (
                    <button
                      key={artisanName}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(artisanName)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f1f8f4] transition-colors"
                    >
                      <Store className="w-4 h-4 text-[#0c4b31]" />
                      <span className="flex-1"><b>{artisanName}</b><span className="text-gray-500"> · Artisan Store</span></span>
                      <ArrowUpRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </>
              ) : (
                <div className="px-4 py-3 text-gray-500">No matching crafts found. Press Enter to search all products.</div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
          <Link
            to="/"
            className="px-3 py-2 rounded-lg text-xs font-bold text-[#2a3f34] hover:text-[#0c4b31] hover:bg-[#eef6f1] transition-colors"
          >
            Home
          </Link>

          {/* My Orders */}
          <button
            type="button"
            id="mkt-nav-orders-btn"
            onClick={() => handleProtectedAction('/customer/orders', 'Please log in or create a customer account to view your orders.')}
            className="px-3 py-2 rounded-lg text-xs font-bold text-[#2a3f34] hover:text-[#0c4b31] hover:bg-[#eef6f1] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Package className="w-4 h-4 text-[#e27d35]" />
            <span>My Orders</span>
          </button>

          {/* Cart Icon */}
          <button
            type="button"
            id="mkt-nav-cart-btn"
            onClick={() => handleProtectedAction('/customer/cart', 'Please log in or create a customer account to view your shopping cart.')}
            className="relative p-2 rounded-xl bg-white border border-[#d2dfd6] hover:border-[#0c4b31] text-[#0c4b31] transition-all cursor-pointer"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#e87722] text-white text-[10px] font-bold flex items-center justify-center shadow-xs animate-scaleUp">
                {cartCount}
              </span>
            )}
          </button>

          {/* Customer Auth / Profile */}
          {customer ? (
            <div className="relative">
              <button
                type="button"
                id="mkt-customer-profile-btn"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-[#edf8f1] hover:bg-[#dff2e6] text-[#0c4b31] text-xs font-bold transition-colors cursor-pointer border border-[#c4e4d1]"
              >
                <div className="w-6 h-6 rounded-full bg-[#0c4b31] text-white flex items-center justify-center text-[11px] font-bold">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{customer.name.split(' ')[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 animate-fadeIn text-xs space-y-1">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="font-bold text-gray-900 truncate">{customer.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{customer.email || customer.mobile}</p>
                  </div>
                  <Link
                    to="/customer/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Customer Profile
                  </Link>
                  <Link
                    to="/customer/custom-requests"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium flex items-center justify-between"
                  >
                    <span>Custom Requests</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </Link>
                  <Link
                    to="/customer/orders"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    My Orders
                  </Link>
                  <button
                    type="button"
                    id="customer-logout-btn"
                    onClick={handleCustomerLogout}
                    className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Customer Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                to="/customer/login"
                id="mkt-customer-login-btn"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#0c4b31] bg-white border border-[#bed8c8] hover:bg-[#eef8f2] transition-colors"
              >
                Customer Login
              </Link>
              <Link
                to="/customer/register"
                id="mkt-customer-register-btn"
                className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#0c4b31] hover:bg-[#073623] shadow-xs transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => handleProtectedAction('/customer/cart', 'Please log in or create a customer account to view your cart.')}
            className="p-2 rounded-lg text-[#0c4b31] relative"
            aria-label="Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-[#e87722] text-white text-[9px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#0c4b31] hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-3 animate-fadeIn text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick Links</span>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-gray-800 font-bold hover:bg-[#edf8f1]"
            >
              Home Page
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleProtectedAction('/customer/custom-requests', 'Please log in or create a customer account to view custom requests.');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-gray-800 font-bold hover:bg-[#edf8f1] flex items-center justify-between"
            >
              <span>Custom Requests</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleProtectedAction('/customer/orders', 'Please log in or create a customer account to view orders.');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-gray-800 font-bold hover:bg-[#edf8f1]"
            >
              My Orders
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleProtectedAction('/customer/cart', 'Please log in or create a customer account to view your cart.');
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-gray-800 font-bold hover:bg-[#edf8f1]"
            >
              Shopping Cart
            </button>
          </div>

          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2.5">
            {/* Customer Section */}
            {customer ? (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-amber-950 flex items-center gap-1">
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
                  className="px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Customer Logout</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/customer/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 rounded-lg bg-[#edf8f1] text-[#0c4b31] font-bold text-center text-xs"
                >
                  Customer Login
                </Link>
                <Link
                  to="/customer/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 rounded-lg bg-[#0c4b31] text-white font-bold text-center text-xs"
                >
                  Create Account
                </Link>
              </div>
            )}

            <div className="hidden">{/* Artisan Section */}
            {artisan ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-emerald-950 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Artisan: {artisan.name}</span>
                  </p>
                  <p className="text-[10px] text-emerald-700">{artisan.craftType}</p>
                </div>
                <button
                  type="button"
                  id="mkt-mobile-artisan-logout-btn"
                  onClick={() => {
                    handleArtisanLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Artisan Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/artisan/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 rounded-lg bg-[#f0f8f3] border border-[#cbe5d4] text-[#0c4b31] font-bold text-xs text-center flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-[#0c4b31]" />
                <span>Artisan Portal</span>
              </Link>
            )}</div>

          </div>
        </div>
      )}

      {/* Guest Authentication Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginModalContext || 'Please log in or create a customer account to continue.'}
      />
    </header>
  );
};
