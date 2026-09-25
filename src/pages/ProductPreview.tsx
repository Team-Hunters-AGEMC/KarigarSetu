import React, { useState, useEffect } from 'react';
import { API_BASE } from '../services/apiConfig';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Maximize2, 
  Edit, 
  Check, 
  TrendingUp, 
  Tag, 
  FileText 
} from 'lucide-react';
import { getCurrentArtisan } from '../data/seedData';
import { useLanguage } from '../i18n/LanguageContext';

// All artisan requests share the Vite origin and its Flask proxy, including cookies.


export const ProductPreview: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const artisan = getCurrentArtisan();

  const [productData, setProductData] = useState<any>(null);
  const [productImage, setProductImage] = useState<string>('');
  const [activeImageView, setActiveImageView] = useState<'studio' | 'detail'>('studio');
  const [detailFocus, setDetailFocus] = useState<{ x: number; y: number }>({ x: 50, y: 40 });
  const [isSelectingDetail, setIsSelectingDetail] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [publishConfidence, setPublishConfidence] = useState<number | null>(null);
  const [publishError, setPublishError] = useState('');

  useEffect(() => {
    const isPublishedResult = new URLSearchParams(location.search).get('published') === '1';
    if (isPublishedResult) {
      try {
        const receipt = JSON.parse(sessionStorage.getItem('karigarsetu_publish_receipt') || '{}');
        if (receipt.message) {
          setPublishMessage(receipt.message);
          setPublishConfidence(typeof receipt.confidenceScore === 'number' ? receipt.confidenceScore : null);
          setPublishSuccess(true);
          return;
        }
      } catch {
        // If the receipt is unavailable, fall through to the normal preview.
      }
    }

    try {
      const saved = JSON.parse(sessionStorage.getItem('productData') || '{}');
      const savedImage = sessionStorage.getItem('productImage') || saved.imageUrl;
      if (!saved.productName && !savedImage) {
        navigate('/artisan/dashboard', { replace: true });
      } else {
        setProductData(saved);
        setProductImage(savedImage || '');
      }
    } catch (e) {
      console.warn('Preview parse error', e);
    }
  }, [artisan, location.search, navigate]);

  const handleDetailAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelectingDetail || !productImage) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setDetailFocus({
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y))
    });
    setIsSelectingDetail(false);
    setActiveImageView('detail');
  };

  const handlePublish = async () => {
    if (!productData) {
      setPublishError('No product data available to publish.');
      return;
    }

    setIsPublishing(true);
    setPublishError('');

    try {
      const response = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productName: productData.productName,
          category: productData.category,
          description: productData.description,
          materialCost: Number(productData.materialCost),
          labourCost: Number(productData.labourCost),
          suggestedPrice: Number(productData.aiCatalog?.suggestedPrice ?? productData.suggestedPrice),
          imageUrl: productImage,
          approvalCheck: productData.aiCatalog?.approvalCheck,
          detailFocus,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        navigate('/artisan/register', {
          state: { from: '/artisan/product-preview', message: 'আপনার login session শেষ হয়েছে। আগের account-এ আবার login করুন; নতুন আবেদন করতে হবে না।' },
        });
        return;
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Product could not be submitted.');
      }

      const message = result.status === 'approved'
        ? 'AI approved your product. It is now live in the marketplace.'
        : 'AI sent this product to Admin Review. It will appear in the marketplace after Admin approval.';
      const confidenceScore = typeof result.aiConfidenceScore === 'number'
        ? result.aiConfidenceScore
        : null;

      // Keep a small receipt so the result page still appears even after this
      // component remounts during navigation.
      sessionStorage.setItem('karigarsetu_publish_receipt', JSON.stringify({
        status: result.status,
        message,
        confidenceScore,
      }));
      sessionStorage.removeItem('productData');
      sessionStorage.removeItem('productImage');
      navigate('/artisan/product-preview?published=1', { replace: true });
    } catch (error) {
      setPublishError(error instanceof TypeError
        ? 'Backend-এর সঙ্গে সংযোগ করা যাচ্ছে না। Flask server চলছে কি না দেখুন। আপনার product draft সংরক্ষিত আছে।'
        : error instanceof Error ? error.message : 'Product could not be submitted.');
    } finally {
      setIsPublishing(false);
    }
  };

  const aiCatalog = productData?.aiCatalog || {};
  const displayTitle = aiCatalog.professionalTitle || productData?.productName || 'Traditional Handcrafted Item';
  const displayDesc = aiCatalog.catalogDescription || productData?.description || 'Authentic handmade craft item.';
  const suggestedPrice = aiCatalog.suggestedPrice || productData?.suggestedPrice || 1200;
  const materialCost = productData?.materialCost || 250;
  const labourCost = productData?.labourCost || 500;

  if (publishSuccess) {
    return (
      <div className="min-h-screen bg-[#fcfaf6] px-4 flex items-center justify-center text-[#1b2f24]">
        <div className="w-full max-w-xl rounded-3xl border border-emerald-200 bg-white p-8 sm:p-12 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-11 w-11" />
          </div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">
            {t.artisan.submissionComplete}
          </p>
          <h1 className="text-3xl font-extrabold text-[#0c4b31]">
            {publishMessage.startsWith('AI approved') ? t.artisan.aiApprovedTitle : t.artisan.sentForAdminReviewTitle}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            {publishConfidence !== null && `AI confidence: ${publishConfidence}%. `}{publishMessage}
          </p>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('karigarsetu_publish_receipt');
              navigate('/artisan/dashboard', { replace: true });
            }}
            className="mt-8 w-full rounded-xl bg-[#0c4b31] px-5 py-4 text-sm font-extrabold text-white shadow-md transition-colors hover:bg-[#073623]"
          >
            {t.artisan.backToDashboardBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfaf6] text-[#1b2f24] py-8 px-4 sm:px-6">
      <main className="max-w-6xl mx-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#e1eae4] mb-8">
          <Link
            to="/artisan/add-product?mode=edit"
            state={{ editMode: true }}
            id="back-to-edit-btn"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c4b31] hover:text-[#e27d35] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.artisan.editProductInfo}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#0c4b31] text-white flex items-center justify-center text-xs font-bold">✦</span>
            <span className="text-xs font-extrabold text-[#0c4b31]">{t.artisan.dashboardTitle}</span>
          </div>
        </div>

        {/* Intro */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-[#e3f4ea] text-[#0c4b31] border border-[#bfe2ce] uppercase tracking-wider">
            {t.artisan.step2Of3}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0c4b31] tracking-tight mt-3">
            {t.artisan.reviewSmartCatalogTitle}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            {t.artisan.reviewSmartCatalogSubtitle}
          </p>
        </div>

        {/* Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Product Showcase Card with Lens */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#dce8df] shadow-xl overflow-hidden">
            {/* Image Canvas */}
            <div 
              className={`relative h-80 sm:h-96 bg-gradient-to-br from-[#fbfdfb] to-[#edf4ee] flex items-center justify-center overflow-hidden cursor-pointer ${
                isSelectingDetail ? 'ring-4 ring-emerald-500 ring-inset cursor-crosshair' : ''
              }`}
              onClick={handleDetailAreaClick}
              id="craft-preview-image-box"
            >
              {productImage ? (
                <img
                  src={productImage}
                  alt={displayTitle}
                  className={`w-full h-full object-contain p-4 transition-all duration-500 ${
                    activeImageView === 'detail' ? 'scale-[2.1]' : 'scale-100'
                  }`}
                  style={
                    activeImageView === 'detail'
                      ? { transformOrigin: `${detailFocus.x}% ${detailFocus.y}%` }
                      : undefined
                  }
                />
              ) : (
                <span className="text-6xl">🏺</span>
              )}

              {/* Status Badge */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold text-[#0c4b31] shadow-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#e27d35]" />
                {activeImageView === 'studio' ? t.artisan.proStudioView : t.artisan.craftDetailZoom}
              </div>

              {/* Selection Guide Prompt */}
              {isSelectingDetail && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#0c4b31] text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
                  {t.artisan.clickToSetFocus}
                </div>
              )}
            </div>

            {/* Micro Craft Focus Buttons */}
            <div className="p-4 border-t border-gray-100 bg-[#fbfdfb] flex items-center justify-between gap-3">
              <button
                type="button"
                id="select-craft-focus-btn"
                onClick={() => { setActiveImageView('studio'); setIsSelectingDetail(true); }}
                className="px-3 py-1.5 rounded-lg bg-[#e3f4ea] hover:bg-[#d5eee0] text-[#0c4b31] text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{t.artisan.selectCraftDetailArea}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="switch-studio-view-btn"
                  onClick={() => { setIsSelectingDetail(false); setActiveImageView('studio'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    activeImageView === 'studio' ? 'bg-[#0c4b31] text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {t.artisan.studioViewBtn}
                </button>
                <button
                  type="button"
                  id="switch-detail-view-btn"
                  onClick={() => { setIsSelectingDetail(false); setActiveImageView('detail'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    activeImageView === 'detail' ? 'bg-[#0c4b31] text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {t.artisan.detailZoomBtn}
                </button>
              </div>
            </div>

            {/* Product description preview */}
            <div className="p-6 space-y-3">
              <span className="text-xs font-extrabold text-[#e27d35] uppercase tracking-wider">
                {productData?.category || 'Handmade Craft'}
              </span>
              <h3 className="text-2xl font-extrabold text-[#0c4b31] leading-tight">
                {displayTitle}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {displayDesc}
              </p>
              
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">{t.artisan.recommendedLivingWagePrice}</span>
                <strong className="text-2xl font-extrabold text-[#0c4b31]">₹{suggestedPrice}</strong>
              </div>
            </div>
          </div>

          {/* Right: AI Catalog Breakdown & Publish Actions */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-2xl border border-[#dce8df] shadow-md p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[11px] font-extrabold text-[#e27d35] tracking-wider uppercase">
                    {t.artisan.aiVerifiedBreakdown}
                  </span>
                  <h3 className="text-lg font-extrabold text-[#0c4b31]">
                    {t.artisan.catalogSpecifications}
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#e3f4ea] text-[#0c4b31] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {t.artisan.readyToPublishBadge}
                </span>
              </div>

              {/* Breakdown Fields */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">{t.artisan.productNameLabel}:</span>
                  <strong className="text-gray-900 font-bold max-w-[60%] text-right">{displayTitle}</strong>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">{t.artisan.craftCategoryLabel}:</span>
                  <strong className="text-gray-900 font-bold">{productData?.category}</strong>
                </div>

                <div className="py-2 border-b border-gray-100 space-y-1">
                  <span className="text-gray-500 font-medium block">{t.artisan.marketingCaption}</span>
                  <p className="text-gray-800 font-medium italic bg-[#f9faf8] p-2.5 rounded-lg border border-gray-200">
                    &quot;{aiCatalog.marketingCaption || `Authentic handmade ${productData?.category} directly from artisan ${artisan.name}.`}&quot;
                  </p>
                </div>

                {/* Keywords */}
                <div className="py-2 space-y-1.5">
                  <span className="text-gray-500 font-medium block">{t.artisan.catalogTags}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(aiCatalog.keywords || ['Terracotta', 'Handmade', 'GI-Tagged', 'DirectFromVillage']).map((tag: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-[#edf8f1] text-[#0c4b31] font-semibold text-[11px]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Calculation Transparency */}
              <div className="p-4 rounded-xl bg-[#f4f9f5] border border-[#cedfd3] space-y-2.5">
                <h4 className="text-xs font-extrabold text-[#0c4b31] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#e27d35]" />
                  {t.artisan.fairLivingWageRec}
                </h4>

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{t.artisan.rawMaterialCost}</span>
                  <strong className="text-gray-900">₹{materialCost}</strong>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{t.artisan.artisanLabourTime}</span>
                  <strong className="text-gray-900">₹{labourCost}</strong>
                </div>

                <div className="pt-2 border-t border-[#b8dfc7] flex items-center justify-between text-sm font-extrabold text-[#0c4b31]">
                  <span>{t.artisan.aiSuggestedFairPrice}</span>
                  <strong className="text-lg text-emerald-800">₹{suggestedPrice}</strong>
                </div>

                <p className="text-[11px] text-gray-500 leading-normal pt-1">
                  {t.artisan.fairPriceExplanation}
                </p>
              </div>

              {publishError && (
                <p className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">
                  {publishError}
                </p>
              )}

              {/* Action Buttons */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/artisan/add-product?mode=edit"
                  state={{ editMode: true }}
                  className="py-3.5 px-4 rounded-xl bg-white border border-[#b2cfbd] hover:bg-[#f3f9f5] text-[#0c4b31] font-bold text-xs sm:text-sm text-center transition-colors"
                >
                  {t.artisan.edit}
                </Link>

                <button
                  type="button"
                  id="publish-product-btn"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="py-3.5 px-4 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#0c4b31]/20 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>{isPublishing ? t.artisan.publishingBtn : t.artisan.publishToMarketplaceBtn}</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
