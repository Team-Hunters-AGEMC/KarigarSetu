import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Award, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  Layers, 
  Calendar,
  Share2
} from 'lucide-react';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { ProductCard } from '../../components/marketplace/ProductCard';
import { LoginRequiredModal } from '../../components/marketplace/LoginRequiredModal';
import { marketplaceApi, ArtisanPublicData, MarketplaceProduct } from '../../services/marketplaceApi';
import { getCurrentCustomer } from '../../services/customerAuth';

export const ArtisanPublicProfilePage: React.FC = () => {
  const { artisanId } = useParams<{ artisanId: string }>();
  const navigate = useNavigate();

  const [artisan, setArtisan] = useState<ArtisanPublicData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginModalMessage, setLoginModalMessage] = useState<string>('');

  useEffect(() => {
    async function loadProfile() {
      if (!artisanId) return;
      setIsLoading(true);
      try {
        const data = await marketplaceApi.getArtisanPublicProfile(Number(artisanId));
        setArtisan(data);
      } catch (err) {
        console.error('Failed to load artisan public profile:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
    window.scrollTo(0, 0);
  }, [artisanId]);

  const handleProtectedAction = (actionName: string, onAuthorized: () => void) => {
    const customer = getCurrentCustomer();
    if (!customer) {
      setLoginModalMessage(`Please log in or create a customer account to ${actionName}.`);
      setShowLoginModal(true);
      return;
    }
    onAuthorized();
  };

  const handleMessageArtisan = () => {
    if (!artisan) return;
    handleProtectedAction(`message master artisan ${artisan.name}`, () => {
      navigate(`/customer/messages?artisan_id=${artisan.id}`);
    });
  };

  const handleRequestCustom = () => {
    if (!artisan) return;
    handleProtectedAction(`request a custom order from ${artisan.name}`, () => {
      navigate(`/customer/custom-request?artisan_id=${artisan.id}`);
    });
  };

  const handleAddToCart = (product: MarketplaceProduct) => {
    handleProtectedAction(`add "${product.product_name}" to your cart`, () => {
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
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent">
        <MarketplaceNavbar />
        <div className="max-w-6xl mx-auto py-16 px-4 text-center">
          <div className="w-12 h-12 border-4 border-[#0c4b31] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-600">Loading master artisan profile...</p>
        </div>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="min-h-screen bg-transparent">
        <MarketplaceNavbar />
        <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
          <h2 className="text-2xl font-extrabold text-[#0c4b31]">Artisan Profile Not Found</h2>
          <p className="text-xs text-gray-500">
            The requested artisan profile is not available or inactive.
          </p>
          <Link
            to="/marketplace"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#0c4b31] text-white text-xs font-bold"
          >
            ← Return to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[#1a2e24]">
      <MarketplaceNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link to="/marketplace" className="hover:text-[#0c4b31] flex items-center gap-1 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Marketplace</span>
          </Link>
          <span>/</span>
          <span className="text-gray-700 font-semibold">Artisan Profiles</span>
          <span>/</span>
          <span className="text-gray-900 font-bold">{artisan.name}</span>
        </div>

        {/* Hero Banner with Artisan Identity */}
        <div className="bg-white rounded-3xl border border-[#dce8df] p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#0c4b31] to-[#1a6e4b] text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-lg shrink-0">
                {artisan.avatar ? (
                  <img src={artisan.avatar} alt={artisan.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  artisan.name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#edf8f1] text-[#0c4b31] border border-[#bfe2ce]">
                    ✦ Certified Master Artisan
                  </span>
                  <span className="text-xs text-gray-400 font-medium">GI Heritage</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c4b31]">
                  {artisan.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#e27d35]" />
                    {artisan.location}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    {artisan.experience} Years of Heritage Craft Experience
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    Specialty: {artisan.craftType}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons for Guest / Customer */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
              <button
                type="button"
                id="artisan-profile-message-btn"
                onClick={handleMessageArtisan}
                className="py-3 px-4 rounded-xl bg-white border border-[#b8d4c2] hover:bg-[#edf6f0] text-[#0c4b31] text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-[#0c4b31]" />
                <span>Message Artisan</span>
              </button>

              <button
                type="button"
                id="artisan-profile-custom-btn"
                onClick={handleRequestCustom}
                className="py-3 px-4 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-[#0c4b31]/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#ffd186]" />
                <span>Request Custom Craft</span>
              </button>
            </div>

          </div>

          {/* Artisan Story / Bio */}
          {artisan.story && (
            <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
              <h3 className="text-xs font-extrabold text-[#e27d35] uppercase tracking-wider">
                Artisan Story & Lineage
              </h3>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-4xl">
                {artisan.story}
              </p>
            </div>
          )}
        </div>

        {/* Master Artisan Catalog */}
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <div>
              <span className="text-xs font-extrabold text-[#e27d35] uppercase tracking-wider">
                Direct from Studio
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0c4b31]">
                Approved Creations by {artisan.name} ({artisan.products.length})
              </h2>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              100% Genuine Certified
            </span>
          </div>

          {artisan.products.length === 0 ? (
            <div className="py-12 px-4 bg-white rounded-2xl border border-gray-200 text-center text-gray-500">
              <p className="text-sm font-bold">No products currently available from this artisan.</p>
              <p className="text-xs mt-1">Check back soon or request a custom craft above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {artisan.products.map((p) => (
                <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )}
        </section>
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
