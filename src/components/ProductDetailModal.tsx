import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  MapPin, 
  Sparkles, 
  Volume2, 
  CheckCircle2, 
  ShoppingBag, 
  Share2, 
  PhoneCall, 
  Maximize2 
} from 'lucide-react';
import { ProductItem } from '../types';

interface ProductDetailModalProps {
  product: ProductItem | null;
  onClose: () => void;
  onInquire?: (product: ProductItem) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ 
  product, 
  onClose 
}) => {
  const [activeView, setActiveView] = useState<'studio' | 'detail'>('studio');
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);

  if (!product) return null;

  const playVoiceStory = () => {
    setIsPlayingVoice(true);
    // Use speech synthesis to recite the artisan's voice transcript or craft description in authentic tone
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = product.voice_transcript || product.description;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      // Try Bengali if available, or regional language
      if (product.voice_transcript && /[\u0980-\u09FF]/.test(product.voice_transcript)) {
        utterance.lang = 'bn-IN';
      } else {
        utterance.lang = 'en-IN';
      }
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingVoice(false);
      utterance.onerror = () => setIsPlayingVoice(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingVoice(false), 3000);
    }
  };

  const handleOrder = () => {
    setOrderConfirmed(true);
    setTimeout(() => {
      setOrderConfirmed(false);
    }, 4000);
  };

  const detailFocus = product.detail_focus || { x: 50, y: 50 };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto"
      id="product-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        id="product-modal-content"
      >
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f9faf8]">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#e3f4ea] text-[#0c4b31] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Authentic Handmade
            </span>
            <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
              Category: {product.category}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            id="close-product-modal"
            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Image Viewer with Studio vs Craft Zoom */}
          <div className="md:col-span-6 flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#f8faf7] to-[#eef4ef] border border-gray-200 shadow-inner h-[340px] sm:h-[400px] flex items-center justify-center">
              <img
                src={product.image_url}
                alt={product.product_name}
                className={`w-full h-full object-contain p-4 transition-all duration-500 ${
                  activeView === 'detail' ? 'scale-[2.1]' : 'scale-100'
                }`}
                style={
                  activeView === 'detail'
                    ? { transformOrigin: `${detailFocus.x}% ${detailFocus.y}%` }
                    : undefined
                }
              />

              {/* View mode badge */}
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-[#0c4b31] border border-gray-200 shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#e87722]" />
                {activeView === 'studio' ? 'Studio Showcase' : '2.1× Micro Craft Zoom'}
              </div>

              {/* Verification watermark */}
              <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] tracking-wider uppercase font-semibold">
                KarigarSetu AI Verified
              </div>
            </div>

            {/* Buyer gallery: first is the full craft, second is the selected craft detail. */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setActiveView('studio')}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 bg-[#f4f8f5] p-1 ${activeView === 'studio' ? 'border-[#0c4b31]' : 'border-transparent'}`}
                aria-label="Show full craft"
              >
                <img src={product.image_url} alt="Full craft" className="h-full w-full object-contain" />
              </button>
              <button
                type="button"
                onClick={() => setActiveView('detail')}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 bg-[#f4f8f5] p-1 ${activeView === 'detail' ? 'border-[#0c4b31]' : 'border-transparent'}`}
                aria-label="Show craft detail"
              >
                <img
                  src={product.image_url}
                  alt="Craft detail"
                  className="h-full w-full scale-[2.1] object-contain"
                  style={{ transformOrigin: `${detailFocus.x}% ${detailFocus.y}%` }}
                />
              </button>
            </div>

            {/* Lens Switcher */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setActiveView('studio')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'studio'
                    ? 'bg-[#0c4b31] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Studio View
              </button>
              <button
                type="button"
                onClick={() => setActiveView('detail')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  activeView === 'detail'
                    ? 'bg-[#0c4b31] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Maximize2 className="w-3 h-3 text-[#e87722]" />
                Craft Detail Lens
              </button>
            </div>

            {/* Artisan Audio Voice Recorder Playback */}
            {product.voice_transcript && (
              <div className="p-3.5 rounded-xl bg-[#fff8ee] border border-[#fae2c0] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#fcead0] flex items-center justify-center text-[#c26214] shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#8d470d]">Artisan Voice Story</p>
                    <p className="text-[11px] text-gray-600 truncate italic">
                      &quot;{product.voice_transcript}&quot;
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={playVoiceStory}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                    isPlayingVoice ? 'bg-amber-600 text-white animate-pulse' : 'bg-[#e27d35] hover:bg-[#c26214] text-white'
                  }`}
                >
                  {isPlayingVoice ? 'Playing...' : '▶ Listen'}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Details, Cultural Heritage, Fair Price breakdown & Buy */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div>
              {/* Category & Tags */}
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#e87722]">
                  {product.category}
                </span>
                {product.tags?.slice(0, 3).map((t, idx) => (
                  <span key={idx} className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0c4b31] tracking-tight mb-2">
                {product.product_name}
              </h2>

              {/* Artisan attribution card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f4f8f4] border border-[#dbe8de] mb-4">
                <div className="w-10 h-10 rounded-full bg-[#0c4b31] text-white font-bold flex items-center justify-center shrink-0">
                  {product.artisan_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500 font-medium">Crafted with care by</span>
                    <strong className="text-xs text-[#0c4b31] font-bold">{product.artisan_name}</strong>
                  </div>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#e87722]" />
                    {product.artisan_location}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                {product.description}
              </p>

              {/* Cultural Significance */}
              {product.cultural_significance && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 mb-4">
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Cultural Lineage & Heritage
                  </p>
                  <p className="text-xs text-amber-950 leading-normal">
                    {product.cultural_significance}
                  </p>
                </div>
              )}

              {/* Fair Living Wage Transparency Breakdown */}
              <div className="p-3.5 rounded-xl bg-[#edf6f0] border border-[#cbe1d3] space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Raw Materials (Clay, Silk, Wax, Dyes):</span>
                  <span className="font-semibold text-gray-900">₹{product.material_cost}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Artisan Skill & Labour Hours:</span>
                  <span className="font-semibold text-gray-900">₹{product.labour_cost}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>AI Authenticity Confidence Index:</span>
                  <span className="font-semibold text-emerald-700">{product.ai_confidence_score}% Verified Handmade</span>
                </div>
                <div className="pt-2 border-t border-[#b9d6c4] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0c4b31]">Fair Living Wage Suggested:</span>
                  <span className="text-xs font-bold text-emerald-800">₹{product.suggested_price}</span>
                </div>
              </div>

              {/* Price & Stock */}
              <div className="flex items-baseline justify-between pt-2">
                <div>
                  <span className="text-xs text-gray-500 font-medium">Direct Artisan Price</span>
                  <div className="text-3xl font-extrabold text-[#0c4b31]">
                    ₹{product.selling_price.toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    product.stock_quantity > 0 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {product.stock_quantity > 0 ? `In Stock (${product.stock_quantity} available)` : 'Made to Order'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              {orderConfirmed ? (
                <div className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-center flex items-center justify-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Order placed directly with {product.artisan_name}! Tracking SMS sent.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleOrder}
                    id="buy-direct-artisan-btn"
                    className="py-3.5 px-4 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#0c4b31]/20 transition-all hover:-translate-y-0.5"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#ffd186]" />
                    <span>Direct Artisan Purchase</span>
                  </button>

                  <a
                    href={`https://wa.me/91${product.artisan_name ? '9832104567' : ''}?text=Hello%20${encodeURIComponent(product.artisan_name)},%20I%20am%20interested%20in%20your%20${encodeURIComponent(product.product_name)}%20on%20KarigarSetu.`}
                    target="_blank"
                    rel="noreferrer"
                    id="inquire-whatsapp-btn"
                    className="py-3.5 px-4 rounded-xl bg-[#1f7a4e] hover:bg-[#18643f] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Chat with Artisan</span>
                  </a>
                </div>
              )}

              <p className="text-[11px] text-center text-gray-500 pt-1">
                100% of payment goes directly to the craftsperson. Protected by KarigarSetu Authenticity Guarantee.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
