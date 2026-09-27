import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Truck, HeartHandshake, SlidersHorizontal } from 'lucide-react';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { ProductFilters } from '../../components/marketplace/ProductFilters';
import { ProductGrid } from '../../components/marketplace/ProductGrid';
import { LoginRequiredModal } from '../../components/marketplace/LoginRequiredModal';
import { marketplaceApi, MarketplaceProduct } from '../../services/marketplaceApi';
import { getCurrentCustomer } from '../../services/customerAuth';
import { CraftCategory } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import mktHeroJuteTexture from '../../assets/marketplace-hero-jute-texture.webp';

export const MarketplacePage: React.FC = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<CraftCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc' | 'newest'>('popular');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginModalMessage, setLoginModalMessage] = useState<string>('');

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await marketplaceApi.getApprovedProducts({
        category: selectedCategory,
        search: searchQuery,
        sort: sortBy,
        maxPrice: priceRange[1],
        inStockOnly,
      });
      setProducts(data);
    } catch (err) {
      console.error('Failed to load marketplace products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, searchQuery, sortBy, priceRange, inStockOnly]);

  const handleAddToCart = (product: MarketplaceProduct) => {
    const customer = getCurrentCustomer();
    if (!customer) {
      setLoginModalMessage(`Please log in or create a customer account to add "${product.product_name}" to your cart.`);
      setShowLoginModal(true);
      return;
    }

    // Customer is logged in, add to cart
    try {
      const cart = JSON.parse(localStorage.getItem('karigarsetu_cart') || '[]');
      const existing = cart.find((item: any) => item.product_id === product.id);
      if (existing) {
        existing.quantity = Math.min((existing.quantity || 1) + 1, product.stock_quantity);
      } else {
        cart.push({
          product_id: product.id,
          product_name: product.product_name,
          selling_price: product.selling_price,
          image_url: product.image_url,
          artisan_id: product.artisan_id,
          artisan_name: product.artisan_name,
          quantity: 1,
          stock_quantity: product.stock_quantity,
        });
      }
      localStorage.setItem('karigarsetu_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('karigarsetu_customer_updated'));
    } catch (e) {
      console.warn('Cart error', e);
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
    setSortBy('popular');
    setPriceRange([0, 10000]);
    setInStockOnly(false);
  };

  const categoryTitle = selectedCategory === 'All'
    ? t.categories.All
    : (t.categories[selectedCategory as keyof typeof t.categories] || selectedCategory);

  return (
    <div className="min-h-screen bg-transparent text-[#1a2e24]">
      {/* Marketplace Top Navigation */}
      <MarketplaceNavbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Hero / Value Proposition Strip */}
      <section 
        className="relative overflow-hidden bg-[#073323] bg-cover bg-center text-white py-6 sm:py-9 px-3 sm:px-6 shadow-md w-full max-w-full"
        style={{ backgroundImage: `url(${mktHeroJuteTexture})` }}
      >
        {/* Subtle dark green overlay to ensure maximum text contrast while keeping textile fibers & jute clearly visible */}
        <div className="absolute inset-0 bg-[#042d22]/25 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6 relative z-10 w-full min-w-0">
          <div className="max-w-2xl space-y-2 text-center md:text-left min-w-0">
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#0b3827]/60 text-[#ffd186] border border-[#ffd186]/30 uppercase tracking-wider inline-flex items-center gap-1.5 backdrop-blur-xs">
              <Sparkles className="w-3 h-3 text-[#ffd186]" /> Direct from Traditional Indian Clusters
            </span>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm break-words">
              Authentic Handmade Crafts & Living Wage Marketplace
            </h1>
            <p className="text-xs sm:text-sm text-[#e0efe7] leading-relaxed break-words">
              {t.nav.marketTagline}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center w-full md:w-auto min-w-0">
            <div className="bg-[#0b3827]/75 backdrop-blur-md px-1.5 sm:px-3.5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-white/20 shadow-md min-w-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300 mx-auto mb-1 shrink-0" />
              <strong className="text-[10px] sm:text-xs font-bold block text-white truncate">100% Genuine</strong>
              <span className="text-[8px] sm:text-[10px] text-emerald-100/80 block leading-tight truncate">All Human Certified</span>
            </div>
            <div className="bg-[#0b3827]/75 backdrop-blur-md px-1.5 sm:px-3.5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-white/20 shadow-md min-w-0">
              <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffd186] mx-auto mb-1 shrink-0" />
              <strong className="text-[10px] sm:text-xs font-bold block text-white truncate">Fair Wage</strong>
              <span className="text-[8px] sm:text-[10px] text-amber-100/80 block leading-tight truncate">Direct to Karigar</span>
            </div>
            <div className="bg-[#0b3827]/75 backdrop-blur-md px-1.5 sm:px-3.5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-white/20 shadow-md min-w-0">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300 mx-auto mb-1 shrink-0" />
              <strong className="text-[10px] sm:text-xs font-bold block text-white truncate">Safe Delivery</strong>
              <span className="text-[8px] sm:text-[10px] text-emerald-100/80 block leading-tight truncate">Eco Fragile Packing</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-2.5 sm:px-6 py-5 sm:py-8 min-w-0 w-full">
        {/* Mobile Filter Toggle */}
        <div className="flex items-center justify-between lg:hidden mb-4 gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl bg-white border border-[#d2dfd6] text-xs font-bold text-[#0c4b31] flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t.marketplace.filterAndRefine}</span>
          </button>

          <span className="text-xs font-semibold text-gray-500 truncate text-right">
            {products.length} {t.marketplace.resultsCount}
          </span>
        </div>

        {/* Mobile Filters Dropdown */}
        {mobileFiltersOpen && (
          <div className="lg:hidden mb-6 animate-fadeIn">
            <ProductFilters
              selectedCategory={selectedCategory}
              onCategoryChange={(cat) => {
                setSelectedCategory(cat);
                setMobileFiltersOpen(false);
              }}
              sortBy={sortBy}
              onSortChange={setSortBy}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              inStockOnly={inStockOnly}
              onInStockChange={setInStockOnly}
              totalResults={products.length}
              onReset={handleResetFilters}
            />
          </div>
        )}

        {/* Desktop Layout Grid: Left Sidebar + Right Products */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sticky Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24">
            <ProductFilters
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              sortBy={sortBy}
              onSortChange={setSortBy}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              inStockOnly={inStockOnly}
              onInStockChange={setInStockOnly}
              totalResults={products.length}
              onReset={handleResetFilters}
            />
          </aside>

          {/* Right Product Grid Column */}
          <section className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 gap-2 min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-[#0c4b31] truncate">
                {categoryTitle}
              </h2>
              <span className="text-xs text-gray-500 font-medium shrink-0">
                Showing {products.length} {t.marketplace.resultsCount}
              </span>
            </div>

            <ProductGrid
              products={products}
              isLoading={isLoading}
              onAddToCart={handleAddToCart}
              onResetFilters={handleResetFilters}
            />
          </section>

        </div>
      </main>

      {/* Guest Authentication Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginModalMessage}
      />
    </div>
  );
};
