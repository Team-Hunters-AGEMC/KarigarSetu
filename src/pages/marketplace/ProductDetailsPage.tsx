import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Zap, 
  MessageSquare, 
  Sparkles, 
  MapPin, 
  ShieldCheck, 
  Truck, 
  CheckCircle2, 
  UserCheck, 
} from 'lucide-react';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { LoginRequiredModal } from '../../components/marketplace/LoginRequiredModal';
import { marketplaceApi, MarketplaceProduct } from '../../services/marketplaceApi';
import { getCurrentCustomer } from '../../services/customerAuth';
import { useLanguage } from '../../i18n/LanguageContext';

export const ProductDetailsPage: React.FC = () => {
  const { t } = useLanguage();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [artisanOtherProducts, setArtisanOtherProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginModalMessage, setLoginModalMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'story' | 'craft' | 'shipping'>('story');
  const [activeImage, setActiveImage] = useState<'studio' | 'detail'>('studio');

  useEffect(() => {
    async function loadData() {
      if (!productId) return;
      setIsLoading(true);
      try {
        const item = await marketplaceApi.getProductDetails(Number(productId));
        setProduct(item);
        setActiveImage('studio');
        setSelectedQuantity(1);

        if (item) {
          const artisanData = await marketplaceApi.getArtisanPublicProfile(item.artisan_id);
          if (artisanData) {
            setArtisanOtherProducts(
              artisanData.products.filter((p) => p.id !== item.id)
            );
          }
        }
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
    window.scrollTo(0, 0);
  }, [productId]);

  const handleProtectedAction = (actionName: string, onAuthorized: () => void) => {
    const customer = getCurrentCustomer();
    if (!customer) {
      setLoginModalMessage(`Please log in or create a customer account to ${actionName}.`);
      setShowLoginModal(true);
      return;
    }
    onAuthorized();
  };

  const handleAddToCart = () => {
    if (!product) return;
    handleProtectedAction(`add "${product.product_name}" to your cart`, () => {
      try {
        const cart = JSON.parse(localStorage.getItem('karigarsetu_cart') || '[]');
        const existing = cart.find((item: any) => item.product_id === product.id);
        if (existing) {
          existing.quantity = Math.min((existing.quantity || 1) + selectedQuantity, product.stock_quantity);
        } else {
          cart.push({
            product_id: product.id,
            product_name: product.product_name,
            selling_price: product.selling_price,
            image_url: product.image_url,
            artisan_id: product.artisan_id,
            artisan_name: product.artisan_name,
            quantity: selectedQuantity,
            stock_quantity: product.stock_quantity,
          });
        }
        localStorage.setItem('karigarsetu_cart', JSON.stringify(cart));
        window.dispatchEvent(new Event('karigarsetu_customer_updated'));
      } catch (e) {
        console.warn('Cart error', e);
      }
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    const availableStock = Math.max(0, Number(product.stock_quantity || 0));
    if (availableStock === 0 || selectedQuantity < 1 || selectedQuantity > availableStock) {
      return;
    }

    handleProtectedAction('proceed with direct checkout', () => {
      const checkoutData = {
        product,
        quantity: selectedQuantity,
      };

      // Keep the direct-checkout item available after refresh/back navigation.
      sessionStorage.setItem(
        'karigarsetu_buy_now',
        JSON.stringify(checkoutData)
      );

      navigate('/customer/checkout', {
        state: checkoutData,
      });
    });
  };

  const handleMessageArtisan = () => {
    if (!product) return;
    handleProtectedAction(`send a message to ${product.artisan_name}`, () => {
      navigate(`/customer/messages?artisan_id=${product.artisan_id}&product_id=${product.id}`);
    });
  };

  const handleRequestCustom = () => {
    if (!product) return;
    handleProtectedAction(`request a custom handcrafted order from ${product.artisan_name}`, () => {
      navigate(`/customer/custom-request?artisan_id=${product.artisan_id}&ref_product_id=${product.id}`);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent">
        <MarketplaceNavbar />
        <div className="max-w-6xl mx-auto py-16 px-4 text-center">
          <div className="w-12 h-12 border-4 border-[#0c4b31] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-600">Loading craft details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-transparent">
        <MarketplaceNavbar />
        <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
          <h2 className="text-2xl font-extrabold text-[#0c4b31]">Product Not Found or Unavailable</h2>
          <p className="text-xs text-gray-500">
            This craft may be pending verification, sold out, or removed by the artisan.
          </p>
          <Link
            to="/marketplace"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#0c4b31] text-white text-xs font-bold"
          >
            ← {t.nav.backToMarketplace}
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.stock_quantity <= 0;
  const detailFocus = product.detail_focus || { x: 50, y: 50 };

  return (
    <div className="min-h-screen bg-transparent text-[#1a2e24]">
      <MarketplaceNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link to="/marketplace" className="hover:text-[#0c4b31] flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.nav.marketplace}</span>
          </Link>
          <span>/</span>
          <span className="font-semibold text-gray-700">{t.categories[product.category as keyof typeof t.categories] || product.category}</span>
          <span>/</span>
          <span className="text-gray-900 font-bold truncate max-w-xs">{product.product_name}</span>
        </div>

        {/* Product Main Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Large High-Resolution Showcase Image */}
          <div className="lg:col-span-6 karigarsetu-product-card bg-[#EAF2E5] rounded-3xl border border-[#CBDCC6] p-6 shadow-sm overflow-hidden space-y-4">
            <div className="relative h-80 sm:h-96 md:h-[420px] bg-white rounded-2xl flex items-center justify-center p-4 overflow-hidden border border-[#CBDCC6]">
              <img
                src={product.image_url}
                alt={product.product_name}
                className={`w-full h-full object-contain transition-transform duration-500 ${
                  activeImage === 'detail' ? 'scale-[2.1]' : 'hover:scale-105'
                }`}
                style={activeImage === 'detail' ? { transformOrigin: `${detailFocus.x}% ${detailFocus.y}%` } : undefined}
              />
              
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold text-[#0c4b31] shadow-xs flex items-center gap-1.5 border border-[#cee0d4]">
                <Sparkles className="w-3.5 h-3.5 text-[#e27d35]" />
                <span>{t.productDetails.verifiedHandmade}</span>
              </div>
            </div>

            <div className="flex gap-3" aria-label="Product image gallery">
              <button type="button" onClick={() => setActiveImage('studio')} className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 bg-white p-1 transition cursor-pointer ${activeImage === 'studio' ? 'border-[#0c4b31]' : 'border-[#CBDCC6] hover:border-[#0c4b31]'}`} aria-label="Show full product image">
                <img src={product.image_url} alt="Full product view" className="h-full w-full object-contain" />
                <span className="absolute bottom-0 inset-x-0 bg-black/55 py-0.5 text-[9px] font-bold text-white">Full view</span>
              </button>
              <button type="button" onClick={() => setActiveImage('detail')} className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 bg-white p-1 transition cursor-pointer ${activeImage === 'detail' ? 'border-[#0c4b31]' : 'border-[#CBDCC6] hover:border-[#0c4b31]'}`} aria-label="Show craftsmanship detail">
                <img src={product.image_url} alt="Craftsmanship detail" className="h-full w-full scale-[2.1] object-contain" style={{ transformOrigin: `${detailFocus.x}% ${detailFocus.y}%` }} />
                <span className="absolute bottom-0 inset-x-0 bg-black/55 py-0.5 text-[9px] font-bold text-white">Detail zoom</span>
              </button>
            </div>

            {/* Quick Guarantees Strip */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#d4e3d0] text-center">
              <div className="p-2.5 rounded-xl bg-white/80 border border-[#CBDCC6]">
                <ShieldCheck className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-gray-800 block">GI Certified</span>
                <span className="text-[10px] text-gray-500">Traditional Origin</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-[#CBDCC6]">
                <Truck className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-gray-800 block">Safe Transit</span>
                <span className="text-[10px] text-gray-500">Bubble Cushioning</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-[#CBDCC6]">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-gray-800 block">Living Wage</span>
                <span className="text-[10px] text-gray-500">Zero Middlemen</span>
              </div>
            </div>
          </div>

          {/* Right: Commercial Details & Purchase Options */}
          <div className="lg:col-span-6 space-y-6">
            <div className="karigarsetu-product-card bg-[#EAF2E5] rounded-3xl border border-[#CBDCC6] p-6 sm:p-8 shadow-sm space-y-5">
              
              {/* Category & Title */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#e27d35] tracking-wider uppercase">
                    {t.categories[product.category as keyof typeof t.categories] || product.category}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {isOutOfStock ? t.marketplace.outOfStock : `${t.marketplace.inStock} (${product.stock_quantity} ${t.productDetails.stockLeft})`}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c4b31] leading-tight">
                  {product.product_name}
                </h1>
              </div>

              {/* Artisan Profile Card Reference */}
              <div className="p-3.5 rounded-2xl bg-[#fafcfa] border border-[#dce6df] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0c4b31] text-white flex items-center justify-center font-bold text-sm">
                    {product.artisan_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">{t.productDetails.aboutArtisan}</span>
                    <Link
                      to={`/marketplace/artisans/${product.artisan_id}`}
                      id="product-artisan-profile-link"
                      className="text-sm font-extrabold text-[#0c4b31] hover:underline flex items-center gap-1"
                    >
                      <span>{product.artisan_name}</span>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </Link>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#e27d35]" />
                      <span>{product.artisan_location}</span>
                    </p>
                  </div>
                </div>

                <Link
                  to={`/marketplace/artisans/${product.artisan_id}`}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#0c4b31] bg-white border border-[#b8d4c2] hover:bg-[#edf6f0] transition-colors"
                >
                  {t.marketplace.viewProfile}
                </Link>
              </div>

              {/* Price Display */}
              <div className="p-4 rounded-2xl bg-white/80 border border-[#CBDCC6] flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-gray-500 font-medium block">{t.productDetails.finalFairPrice}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[#0c4b31]">
                      ₹{product.selling_price}
                    </span>
                    <span className="text-xs text-emerald-800 font-bold bg-[#e3f4ea] px-2 py-0.5 rounded">
                      {t.productDetails.directArtisanImpact}
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs text-gray-500">
                  <span className="text-emerald-700 font-bold block">✓ Free All-India Shipping</span>
                  <span>Taxes & packing included</span>
                </div>
              </div>

              {/* Quantity Selector */}
              {!isOutOfStock && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs font-bold text-gray-700">{t.productDetails.quantity}:</span>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-200 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 text-xs font-extrabold text-gray-900 bg-white">
                      {selectedQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                      className="px-3 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-200 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">
                    Max: {product.stock_quantity} units
                  </span>
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  id="detail-add-to-cart-btn"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="py-3.5 px-4 rounded-xl bg-white border-2 border-[#0c4b31] hover:bg-[#edf8f1] text-[#0c4b31] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t.productDetails.addToCart}</span>
                </button>

                <button
                  type="button"
                  id="detail-buy-now-btn"
                  disabled={
                    isOutOfStock ||
                    selectedQuantity < 1 ||
                    selectedQuantity > product.stock_quantity
                  }
                  onClick={handleBuyNow}
                  className="py-3.5 px-4 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#0c4b31]/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                >
                  <Zap className="w-4 h-4 text-[#ffd186]" />
                  <span>{t.productDetails.buyNow}</span>
                </button>
              </div>

              {/* Artisan Interaction Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  id="detail-message-artisan-btn"
                  onClick={handleMessageArtisan}
                  className="py-2.5 px-3 rounded-xl bg-[#f8faf8] hover:bg-[#ebf4ee] border border-[#d2e2d7] text-[#0c4b31] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-[#0c4b31]" />
                  <span>{t.productDetails.messageArtisan}</span>
                </button>

                <button
                  type="button"
                  id="detail-custom-product-btn"
                  onClick={handleRequestCustom}
                  className="py-2.5 px-3 rounded-xl bg-[#fff8ee] hover:bg-[#ffefd8] border border-[#f5dcba] text-[#854511] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#e27d35]" />
                  <span>{t.productDetails.requestCustomization}</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Tabbed Story, Craftsmanship, and Origin */}
        <div className="karigarsetu-product-card bg-[#EAF2E5] rounded-3xl border border-[#CBDCC6] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex border-b border-gray-200 gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('story')}
              className={`pb-3 text-xs sm:text-sm font-extrabold transition-colors border-b-2 cursor-pointer ${
                activeTab === 'story'
                  ? 'border-[#0c4b31] text-[#0c4b31]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.productDetails.craftStory}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('craft')}
              className={`pb-3 text-xs sm:text-sm font-extrabold transition-colors border-b-2 cursor-pointer ${
                activeTab === 'craft'
                  ? 'border-[#0c4b31] text-[#0c4b31]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.productDetails.specifications}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shipping')}
              className={`pb-3 text-xs sm:text-sm font-extrabold transition-colors border-b-2 cursor-pointer ${
                activeTab === 'shipping'
                  ? 'border-[#0c4b31] text-[#0c4b31]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.productDetails.deliveryInfo}
            </button>
          </div>

          <div className="text-xs sm:text-sm text-gray-700 leading-relaxed space-y-3">
            {activeTab === 'story' && (
              <div className="space-y-3">
                <p className="font-medium text-gray-800 text-base">
                  {product.description}
                </p>
                {product.cultural_significance && (
                  <div className="p-4 rounded-2xl bg-[#edf8f1] border border-[#cbe5d4] space-y-1">
                    <strong className="text-xs font-extrabold text-[#0c4b31] block">
                      Cultural Significance & Regional Heritage:
                    </strong>
                    <p className="text-xs text-[#1e4431]">
                      {product.cultural_significance}
                    </p>
                  </div>
                )}
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {product.tags.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'craft' && (
              <div className="space-y-3">
                <p>
                  This piece was individually shaped by hand without industrial stamping or automation. Minor variations in shade, terracotta clay gradients, or weave tension are the hallmarks of genuine artisan craftsmanship.
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Origin: {product.artisan_location}</li>
                  <li>Master Artisan: {product.artisan_name}</li>
                  <li>Handmade Verification Status: Passed KarigarSetu Authenticity Check</li>
                  {(product.length || product.width || product.height) && (
                    <li>
                      {t.artisan.dimensionsTitle}: {[
                        product.length ? `${t.artisan.lengthLabel} ${product.length}` : null,
                        product.width ? `${t.artisan.widthLabel} ${product.width}` : null,
                        product.height ? `${t.artisan.heightLabel} ${product.height}` : null,
                      ].filter(Boolean).join(' × ')} {product.dimension_unit || 'cm'}
                    </li>
                  )}
                </ul>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-3">
                <p>
                  Fragile and heritage crafts are packed with biodegradable honeycomb paper wrap, high-density shock absorbers, and sealed boxes to ensure safe transport from rural clusters to your doorstep.
                </p>
                <p className="text-xs text-gray-500">
                  Estimated transit time: 4–7 business days across India. Trackable through your customer account.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* More Approved Crafts from This Artisan */}
        {artisanOtherProducts.length > 0 && (
          <section className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#e27d35] uppercase tracking-wider">
                  More From {product.artisan_name}
                </span>
                <h2 className="text-xl font-extrabold text-[#0c4b31]">
                  {t.productDetails.artisanOtherCrafts}
                </h2>
              </div>
              <Link
                to={`/marketplace/artisans/${product.artisan_id}`}
                className="text-xs font-bold text-[#0c4b31] hover:underline"
              >
                View Artisan Studio →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {artisanOtherProducts.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  to={`/marketplace/products/${item.id}`}
                  className="bg-white rounded-2xl border border-gray-200 p-3 hover:border-[#0c4b31] transition-all group"
                >
                  <div className="h-36 bg-[#f4f7f5] rounded-xl overflow-hidden p-2 flex items-center justify-center">
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="mt-2.5 space-y-1">
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#0c4b31] line-clamp-1">
                      {item.product_name}
                    </h4>
                    <span className="text-sm font-extrabold text-[#0c4b31] block">
                      ₹{item.selling_price}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
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
