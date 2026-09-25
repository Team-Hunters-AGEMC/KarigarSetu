import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Palette, 
  Ruler, 
  Layers, 
  FileText,
  Store,
  Info
} from 'lucide-react';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { getCurrentCustomer } from '../../services/customerAuth';
import { marketplaceApi, MarketplaceProduct } from '../../services/marketplaceApi';
import { customRequestsApi } from '../../services/customRequestsApi';
import { API_BASE } from '../../services/apiConfig';

export const CustomRequestFormPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const artisanIdParam = searchParams.get('artisan_id');
  const productIdParam = searchParams.get('ref_product_id');

  const [artisanId, setArtisanId] = useState<number>(Number(artisanIdParam) || 0);
  const [productId, setProductId] = useState<number | undefined>(
    productIdParam ? Number(productIdParam) : undefined
  );

  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [artisanName, setArtisanName] = useState<string>('');
  const [artisanLocation, setArtisanLocation] = useState<string>('');

  const [customizationDetails, setCustomizationDetails] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [preferredColor, setPreferredColor] = useState('');
  const [preferredSize, setPreferredSize] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const customer = getCurrentCustomer();
    if (!customer) {
      navigate('/customer/login', { 
        state: { 
          from: `/customer/custom-request${location.search}`,
          message: 'Please log in to submit a custom product request.'
        } 
      });
      return;
    }

    async function loadContext() {
      if (productId) {
        try {
          const item = await marketplaceApi.getProductDetails(productId);
          if (item) {
            setProduct(item);
            setArtisanId(item.artisan_id);
            setArtisanName(item.artisan_name);
            setArtisanLocation(item.artisan_location);
          }
        } catch (e) {
          console.warn('Could not load base product', e);
        }
      } else if (artisanId) {
        try {
          const profile = await marketplaceApi.getArtisanPublicProfile(artisanId);
          if (profile) {
            setArtisanName(profile.name);
            setArtisanLocation(profile.location);
          }
        } catch (e) {
          console.warn('Could not load artisan profile', e);
        }
      }
    }

    loadContext();
  }, [productId, artisanId, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE}/api/uploads`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success || !result.imageUrl) {
        throw new Error(result.message || 'Image upload failed. Please try again.');
      }

      setReferenceImageUrl(result.imageUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customizationDetails.trim()) {
      setSubmitError('Please describe the custom work you want crafted.');
      return;
    }
    if (!artisanId) {
      setSubmitError('Artisan information is missing.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await customRequestsApi.createCustomRequest({
        artisan_id: artisanId,
        product_id: productId || null,
        customization_details: customizationDetails.trim(),
        quantity: Math.max(1, quantity),
        preferred_color: preferredColor.trim() || undefined,
        preferred_size: preferredSize.trim() || undefined,
        reference_image_url: referenceImageUrl || undefined,
        additional_note: additionalNote.trim() || undefined,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        navigate('/customer/custom-requests');
      }, 1800);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf6] text-[#1a2e24]">
      <MarketplaceNavbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Back Link */}
        <Link
          to={productId ? `/marketplace/products/${productId}` : '/marketplace'}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0c4b31] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {product ? product.product_name : 'Marketplace'}</span>
        </Link>

        {/* Header Banner */}
        <div className="bg-white rounded-3xl border border-[#dce8df] p-6 sm:p-8 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fff4e5] text-[#d96b14] text-xs font-extrabold uppercase tracking-wide border border-[#fedbb7]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Karigar Custom Order</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c4b31] leading-tight">
            Request Custom Handcrafted Piece
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-2xl">
            Have a special dimension, preferred natural color, personalized engraving, or traditional motif in mind? 
            Send your specifications directly to the master artisan for a personalized price quote.
          </p>

          {/* Reference Product Card (if applicable) */}
          {product && (
            <div className="mt-4 p-4 rounded-2xl bg-[#fafcfa] border border-[#d6e5da] flex items-center gap-4">
              <img
                src={product.image_url}
                alt={product.product_name}
                className="w-16 h-16 rounded-xl object-contain bg-white border border-gray-200 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-[#e27d35] uppercase tracking-wider block">
                  Reference Craft Base
                </span>
                <h4 className="text-sm font-extrabold text-[#0c4b31] truncate">
                  {product.product_name}
                </h4>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Store className="w-3 h-3 text-[#0c4b31]" />
                  <span>By {product.artisan_name} ({product.artisan_location})</span>
                </p>
              </div>
            </div>
          )}

          {!product && artisanName && (
            <div className="mt-4 p-4 rounded-2xl bg-[#fafcfa] border border-[#d6e5da] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0c4b31] text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                {artisanName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Selected Master Artisan
                </span>
                <h4 className="text-sm font-extrabold text-[#0c4b31]">
                  {artisanName} {artisanLocation ? `(${artisanLocation})` : ''}
                </h4>
              </div>
            </div>
          )}
        </div>

        {/* Success Alert */}
        {submitSuccess && (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 shadow-xs animate-fadeIn">
            <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
            <div>
              <h4 className="text-sm font-extrabold">Request Sent to Artisan!</h4>
              <p className="text-xs text-emerald-800">
                The artisan will review your requirements and send a quoted price. Redirecting to your custom requests dashboard...
              </p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#dce8df] p-6 sm:p-8 shadow-sm space-y-6">
          {submitError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Customization Details */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#0c4b31]" />
              <span>Customization Details *</span>
            </label>
            <p className="text-xs text-gray-500">
              Describe what changes or unique elements you want (e.g., custom clay figurine height, specific handloom border pattern, brass Dokra motif).
            </p>
            <textarea
              required
              rows={4}
              value={customizationDetails}
              onChange={(e) => setCustomizationDetails(e.target.value)}
              placeholder="e.g. I would like this terracotta vase with traditional Bishnupur floral etchings and a wider neck..."
              className="w-full rounded-2xl border border-gray-300 p-4 text-xs sm:text-sm outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/15 transition-all"
            />
          </div>

          {/* Grid: Quantity, Preferred Color, Preferred Size */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#0c4b31]" />
                <span>Quantity *</span>
              </label>
              <input
                type="number"
                min={1}
                max={500}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm font-semibold outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/15"
              />
            </div>

            {/* Preferred Color */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-[#0c4b31]" />
                <span>Preferred Color / Tone</span>
              </label>
              <input
                type="text"
                value={preferredColor}
                onChange={(e) => setPreferredColor(e.target.value)}
                placeholder="e.g. Natural Terracotta Red, Deep Indigo"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/15"
              />
            </div>

            {/* Preferred Size */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-[#0c4b31]" />
                <span>Dimensions / Size</span>
              </label>
              <input
                type="text"
                value={preferredSize}
                onChange={(e) => setPreferredSize(e.target.value)}
                placeholder="e.g. 12 inches height, 5.5 meters"
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/15"
              />
            </div>
          </div>

          {/* Reference Image Upload via Cloudinary */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <label className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-[#0c4b31]" />
              <span>Reference Sketch / Sample Image (Optional)</span>
            </label>
            <p className="text-xs text-gray-500">
              Upload a photo or sketch of what you envision. Uploads are stored securely via Cloudinary.
            </p>

            {referenceImageUrl ? (
              <div className="p-4 rounded-2xl bg-[#f4faf6] border border-[#cbe4d3] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={referenceImageUrl}
                    alt="Uploaded Reference"
                    className="w-16 h-16 rounded-xl object-contain bg-white border border-gray-200"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-[#0c4b31] block">
                      Reference Photo Attached
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Artisan will use this as a craft reference.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReferenceImageUrl('')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-gray-300 hover:border-[#0c4b31] rounded-2xl p-6 text-center transition-colors bg-[#fafcfa]">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  disabled={isUploadingImage}
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-8 h-8 text-[#0c4b31] animate-spin" />
                      <p className="text-xs font-bold text-gray-700">Uploading to Cloudinary...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-[#0c4b31]" />
                      <p className="text-xs font-bold text-gray-800">
                        Click or drag a photo to upload reference image
                      </p>
                      <p className="text-[11px] text-gray-400">PNG, JPG, or WEBP (Max 10MB)</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {uploadError && (
              <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{uploadError}</span>
              </p>
            )}
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            <label className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#0c4b31]" />
              <span>Additional Note / Occasion (Optional)</span>
            </label>
            <input
              type="text"
              value={additionalNote}
              onChange={(e) => setAdditionalNote(e.target.value)}
              placeholder="e.g. Needed for Diwali puja by next month, requires sturdy wooden packaging"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs sm:text-sm outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/15"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Submitting is free with zero upfront payment. You only pay if you accept the artisan&apos;s quote.
            </p>

            <button
              type="submit"
              id="submit-custom-request-btn"
              disabled={isSubmitting || isUploadingImage || submitSuccess}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white font-extrabold text-sm shadow-md shadow-[#0c4b31]/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#ffd186]" />
                  <span>Send Custom Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
