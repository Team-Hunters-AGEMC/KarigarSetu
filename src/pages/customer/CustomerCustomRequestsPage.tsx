import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  MessageSquare, 
  ShoppingBag, 
  Store, 
  FileText,
  AlertCircle,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { getCurrentCustomer } from '../../services/customerAuth';
import { customRequestsApi } from '../../services/customRequestsApi';
import { CustomProductRequest } from '../../types';

export const CustomerCustomRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CustomProductRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadRequests = async () => {
    const customer = getCurrentCustomer();
    if (!customer) {
      navigate('/customer/login', {
        state: { from: '/customer/custom-requests' },
      });
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const data = await customRequestsApi.getCustomerCustomRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load custom requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleAcceptQuote = async (req: CustomProductRequest) => {
    setActionLoadingId(req.id);
    try {
      await customRequestsApi.acceptQuote(req.id);
      showToast('Quote accepted! Proceeding to checkout...');
      await loadRequests();
      handleProceedToCheckout(req);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not accept quote.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleProceedToCheckout = (req: CustomProductRequest) => {
    const checkoutItem = {
      product: {
        id: req.product_id || 0,
        product_name: req.product_name ? `Custom: ${req.product_name}` : 'Custom Handcrafted Piece',
        category: 'Other',
        selling_price: req.quoted_price || 0,
        stock_quantity: req.quantity,
        image_url: req.reference_image_url || req.product_image_url || '',
        artisan_id: req.artisan_id,
        artisan_name: req.artisan_name || 'Artisan',
        artisan_location: req.artisan_location || '',
      },
      quantity: req.quantity,
      custom_request_id: req.id,
    };

    sessionStorage.setItem('karigarsetu_buy_now', JSON.stringify(checkoutItem));
    navigate('/customer/checkout', { state: checkoutItem });
  };

  const renderStatusBadge = (status: CustomProductRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Awaiting Artisan Quote</span>
          </span>
        );
      case 'quoted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Quote Received</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Quote Accepted</span>
          </span>
        );
      case 'ordered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Custom Order Placed</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>Declined by Artisan</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf6] text-[#1a2e24]">
      <MarketplaceNavbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Breadcrumb / Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c4b31] hover:underline mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Marketplace</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c4b31] tracking-tight">
              My Custom Product Requests
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Track status, review artisan quotes, and accept custom handcrafted orders.
            </p>
          </div>

          <Link
            to="/marketplace"
            className="px-4 py-2.5 rounded-xl bg-[#0c4b31] text-white text-xs font-bold hover:bg-[#073623] transition-colors shadow-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4 text-[#ffd186]" />
            <span>Browse Crafts for Custom Order</span>
          </Link>
        </div>

        {/* Toast notice */}
        {actionNotice && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionNotice.text}</span>
          </div>
        )}

        {/* Content Section */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-[#0c4b31] animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-600">Loading your custom requests...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
            <p className="text-sm font-bold text-red-800">{error}</p>
            <button
              type="button"
              onClick={loadRequests}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#dce8df] p-12 text-center shadow-sm space-y-4">
            <Sparkles className="w-12 h-12 text-[#d96b14] mx-auto opacity-75" />
            <h3 className="text-lg font-extrabold text-[#0c4b31]">No Custom Requests Yet</h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              Find any handcrafted item on the marketplace and click &quot;Request Custom Product&quot; to order tailored sizes, colors, or motifs directly from master artisans.
            </p>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-xs font-bold shadow-md shadow-[#0c4b31]/20 transition-all"
            >
              <span>Explore Marketplace</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-[#dce8df] p-6 shadow-sm space-y-5 hover:border-[#b8d4c2] transition-colors"
              >
                {/* Top header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-gray-400">
                        Request #{req.id}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] text-gray-500">
                        {new Date(req.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-[#0c4b31]" />
                      <span className="text-sm font-extrabold text-[#0c4b31]">
                        {req.artisan_name} {req.artisan_location ? `(${req.artisan_location})` : ''}
                      </span>
                    </div>
                  </div>

                  <div>{renderStatusBadge(req.status)}</div>
                </div>

                {/* Details layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Images & Base product info */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="flex gap-3">
                      {req.reference_image_url && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Your Reference
                          </span>
                          <img
                            src={req.reference_image_url}
                            alt="Reference"
                            className="w-24 h-24 rounded-2xl object-cover border border-gray-200 bg-[#fafcfa]"
                          />
                        </div>
                      )}

                      {req.product_image_url && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Base Craft
                          </span>
                          <img
                            src={req.product_image_url}
                            alt="Base Craft"
                            className="w-24 h-24 rounded-2xl object-cover border border-gray-200 bg-[#fafcfa]"
                          />
                        </div>
                      )}
                    </div>

                    {req.product_name && (
                      <p className="text-xs text-gray-600">
                        <strong className="font-bold text-gray-800">Base Craft:</strong> {req.product_name}
                      </p>
                    )}
                  </div>

                  {/* Middle: Custom specifications */}
                  <div className="lg:col-span-5 space-y-2">
                    <div className="p-3.5 rounded-2xl bg-[#fafcfa] border border-[#e2ece5] space-y-1.5">
                      <span className="text-[10px] font-extrabold text-[#0c4b31] uppercase tracking-wider block">
                        Customization Specifications
                      </span>
                      <p className="text-xs text-gray-700 leading-relaxed font-medium">
                        {req.customization_details}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block font-semibold">Qty</span>
                        <strong className="text-gray-900">{req.quantity} unit(s)</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block font-semibold">Color</span>
                        <strong className="text-gray-900 truncate block">{req.preferred_color || 'Standard'}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block font-semibold">Size</span>
                        <strong className="text-gray-900 truncate block">{req.preferred_size || 'Standard'}</strong>
                      </div>
                    </div>

                    {req.additional_note && (
                      <p className="text-[11px] text-gray-500 italic">
                        Note: {req.additional_note}
                      </p>
                    )}
                  </div>

                  {/* Right: Pricing & Actions */}
                  <div className="lg:col-span-3 flex flex-col justify-between space-y-3 bg-[#f8faf8] p-4 rounded-2xl border border-[#dce8df]">
                    {req.status === 'quoted' || req.status === 'accepted' || req.status === 'ordered' ? (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          Artisan Quoted Price
                        </span>
                        <div className="text-2xl font-extrabold text-[#0c4b31]">
                          ₹{Number(req.quoted_price).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-emerald-700 font-semibold block">
                          Total for {req.quantity} unit(s) (Free shipping included)
                        </span>

                        {req.artisan_message && (
                          <div className="mt-2 p-2.5 rounded-xl bg-white border border-[#cbe4d3] text-xs text-gray-700">
                            <strong className="text-[10px] uppercase text-[#0c4b31] block font-bold">
                              Artisan Message:
                            </strong>
                            <p className="italic mt-0.5">&quot;{req.artisan_message}&quot;</p>
                          </div>
                        )}
                      </div>
                    ) : req.status === 'pending' ? (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          Price Estimation
                        </span>
                        <p className="text-xs text-gray-500 font-medium">
                          The artisan is calculating material and craftsmanship labor for your custom piece.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-red-600 uppercase">
                          Request Declined
                        </span>
                        {req.artisan_message && (
                          <p className="text-xs text-gray-600 italic">
                            &quot;{req.artisan_message}&quot;
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      {req.status === 'quoted' && (
                        <button
                          type="button"
                          id={`accept-quote-btn-${req.id}`}
                          disabled={actionLoadingId === req.id}
                          onClick={() => handleAcceptQuote(req)}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {actionLoadingId === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-[#ffd186]" />
                              <span>Accept Quote & Checkout</span>
                            </>
                          )}
                        </button>
                      )}

                      {req.status === 'accepted' && (
                        <button
                          type="button"
                          id={`checkout-accepted-btn-${req.id}`}
                          onClick={() => handleProceedToCheckout(req)}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#ffd522] hover:bg-[#facb10] text-[#17281f] text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>Complete Checkout (₹{req.quoted_price})</span>
                        </button>
                      )}

                      <Link
                        to={`/customer/messages?artisan_id=${req.artisan_id}${req.product_id ? `&product_id=${req.product_id}` : ''}`}
                        className="w-full py-2 px-3 rounded-xl bg-white border border-[#c6ded0] hover:bg-[#eef8f2] text-[#0c4b31] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat with Artisan</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
