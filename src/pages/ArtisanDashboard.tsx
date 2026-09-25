import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  Edit3, 
  Trash2, 
  Sparkles, 
  Archive, 
  RefreshCw,
  TrendingUp,
  MapPin,
  LogOut,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { 
  getCurrentArtisan, 
  isArtisanLoggedIn, 
  logoutArtisan, 
} from '../data/seedData';
import { ArtisanProfile, ProductItem, ProductStatus } from '../types';

export const ArtisanDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [artisan, setArtisan] = useState<ArtisanProfile>(getCurrentArtisan());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(isArtisanLoggedIn());
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'approved' | 'review' | 'unpublished'>('all');
  const [mainTab, setMainTab] = useState<'catalog' | 'custom_requests'>('catalog');
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [loadingCustomRequests, setLoadingCustomRequests] = useState(false);
  const [quoteModalReq, setQuoteModalReq] = useState<any | null>(null);
  const [quotePriceInput, setQuotePriceInput] = useState<string>('');
  const [quoteMessageInput, setQuoteMessageInput] = useState<string>('');
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [rejectModalReq, setRejectModalReq] = useState<any | null>(null);
  const [rejectMessageInput, setRejectMessageInput] = useState<string>('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editValues, setEditValues] = useState<{ stock: number; price: number }>({ stock: 0, price: 0 });
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    const current = getCurrentArtisan();
    const loggedIn = isArtisanLoggedIn();
    setArtisan(current);
    setIsLoggedIn(loggedIn);
    if (!loggedIn) { 
      setProducts([]); 
      setCustomRequests([]);
      return; 
    }
    try {
      const response = await fetch(`/api/products?artisan_id=${current.id}`, { credentials: 'include' });
      const result = await response.json();
      setProducts(result.products || []);
    } catch (e) {
      console.warn('Could not load products', e);
    }

    try {
      setLoadingCustomRequests(true);
      const reqRes = await fetch('/api/artisan/custom-requests', { credentials: 'include' });
      const reqData = await reqRes.json();
      if (reqRes.ok && reqData.success) {
        setCustomRequests(reqData.data || []);
      }
    } catch (e) {
      console.warn('Could not load custom requests', e);
    } finally {
      setLoadingCustomRequests(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/artisans/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    logoutArtisan();
    navigate('/artisan/register', {
      replace: true,
      state: { from: '/artisan/dashboard', message: 'আপনি sign out করেছেন। Artisan Studio-তে ঢুকতে আবার login করুন।' },
    });
  };


  useEffect(() => {
    loadData();
    window.addEventListener('karigarsetu_products_updated', loadData);
    window.addEventListener('karigarsetu_artisan_updated', loadData);
    return () => {
      window.removeEventListener('karigarsetu_products_updated', loadData);
      window.removeEventListener('karigarsetu_artisan_updated', loadData);
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleStartEdit = (product: ProductItem) => {
    setEditingId(product.id);
    setEditValues({
      stock: product.stock_quantity,
      price: product.selling_price
    });
  };

  const handleSaveEdit = async (productId: number) => {
    if (!Number.isFinite(editValues.price) || editValues.price <= 0) {
      showToast('Selling price must be greater than 0', 'error');
      return;
    }
    if (!Number.isInteger(editValues.stock) || editValues.stock < 0) {
      showToast('Stock quantity must be a non-negative whole number', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const response = await fetch(`/api/products/${productId}/stock-price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sellingPrice: editValues.price, stockQuantity: editValues.stock }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Stock and price update failed.');
      }
      await loadData();
      setEditingId(null);
      showToast('Stock and price updated successfully!');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Stock and price update failed.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = (product: ProductItem) => {
    const confirm = window.confirm(`Are you sure you want to delete "${product.product_name}"?`);
    if (!confirm) return;

    fetch(`/api/products/${product.id}`, { method: 'DELETE', credentials: 'include' })
      .then(async response => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.message || 'Could not delete product.');
        await loadData();
        showToast(`"${product.product_name}" has been deleted.`);
      })
      .catch(error => showToast(error instanceof Error ? error.message : 'Could not delete product.', 'error'));
  };

  const handleOpenQuoteModal = (req: any) => {
    setQuoteModalReq(req);
    setQuotePriceInput(req.quoted_price ? String(req.quoted_price) : '');
    setQuoteMessageInput(req.artisan_message || '');
  };

  const handleSubmitQuote = async () => {
    if (!quoteModalReq) return;
    const price = parseFloat(quotePriceInput);
    if (!price || price <= 0) {
      showToast('Please enter a valid price greater than 0', 'error');
      return;
    }

    setSubmittingQuote(true);
    try {
      const res = await fetch(`/api/artisan/custom-requests/${quoteModalReq.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          quoted_price: price,
          artisan_message: quoteMessageInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send quote');
      }
      showToast(`Price quote of ₹${price} sent to ${quoteModalReq.customer_name}!`);
      setQuoteModalReq(null);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send quote', 'error');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleOpenRejectModal = (req: any) => {
    setRejectModalReq(req);
    setRejectMessageInput('');
  };

  const handleSubmitReject = async () => {
    if (!rejectModalReq) return;
    setSubmittingReject(true);
    try {
      const res = await fetch(`/api/artisan/custom-requests/${rejectModalReq.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          artisan_message: rejectMessageInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to decline request');
      }
      showToast(`Custom request #${rejectModalReq.id} declined.`);
      setRejectModalReq(null);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to decline request', 'error');
    } finally {
      setSubmittingReject(false);
    }
  };

  // Metrics
  const approvedCount = products.filter((p) => p.status === 'approved').length;
  const reviewCount = products.filter((p) => p.status === 'pending_ai_check' || p.status === 'admin_review' || p.status === 'under_review').length;
  const totalStock = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
  const pendingCustomCount = customRequests.filter((r) => r.status === 'pending').length;

  const filteredProducts = products.filter((p) => {
    if (activeFilter === 'approved') return p.status === 'approved';
    if (activeFilter === 'review') return p.status === 'pending_ai_check' || p.status === 'admin_review' || p.status === 'under_review';
    if (activeFilter === 'unpublished') return p.status === 'unpublished' || p.status === 'rejected';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f7f9f7] text-[#1b2f24]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e1eae3]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#e27d35] tracking-wider uppercase">
              <span>Artisan Workspace</span>
              <span>•</span>
              <span className="text-[#0c4b31]">{artisan.craftType} Artisan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0c4b31] tracking-tight">
              Namaste, {artisan.name}
            </h1>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#e27d35]" />
              <span>{artisan.location}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <>
                <Link
                  to="/artisan/add-product"
                  id="dashboard-add-product-btn"
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#0c4b31]/20 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                >
                  <PlusCircle className="w-4 h-4 text-[#ffd186]" />
                  <span>+ Add New Craft</span>
                </Link>

                <button
                  type="button"
                  id="artisan-dashboard-logout-btn"
                  onClick={handleLogout}
                  className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-red-50/90 hover:bg-red-100 text-red-700 border border-red-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Log out of Artisan Studio"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Artisan Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/artisan/register')}
                  className="px-3.5 py-2.5 rounded-xl bg-[#edf8f1] hover:bg-[#dfefe5] text-[#0c4b31] border border-[#bedfc9] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#e27d35]" />
                  <span>Artisan Sign In</span>
                </button>
                <Link
                  to="/artisan/register"
                  id="dashboard-login-btn"
                  className="px-4 py-2.5 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#0c4b31]/20 flex items-center gap-2 transition-all"
                >
                  <UserCheck className="w-4 h-4 text-[#ffd186]" />
                  <span>Artisan Sign In</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Signed Out Alert Banner */}
        {!isLoggedIn && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold">You are currently logged out of the Artisan Workspace</h4>
                <p className="text-xs text-amber-700/90 mt-0.5">
                  Sign in with your registered phone number to publish handmade crafts, manage stock prices, or view buyer telemetry.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => navigate('/artisan/register')}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Artisan Sign In
              </button>
              <Link
                to="/artisan/register"
                className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition-colors"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Notification Toast */}
        {actionNotice && (
          <div className={`mt-4 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
            actionNotice.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionNotice.text}</span>
          </div>
        )}

        {/* Welcome Banner */}
        <div className="mt-6 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0c4b31] to-[#15603f] text-white shadow-lg shadow-[#0c4b31]/15 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#dff2e5] text-[#0c4b31] uppercase tracking-wide">
              ✦ KarigarSetu AI Studio
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Turn your craft into fair living income.
            </h2>
            <p className="text-xs sm:text-sm text-[#d0e5d8] leading-relaxed">
              Upload any phone photograph and describe your materials by voice in {artisan.language || 'Bengali'}. 
              Our AI writes export-ready titles, generates marketing captions, and computes fair living wages.
            </p>
          </div>
          
          <div className="absolute right-6 bottom-4 opacity-10 text-9xl select-none pointer-events-none hidden md:block">
            🏺
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-white border border-[#e2ece5] shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold">Total Crafts Listed</span>
              <Package className="w-4 h-4 text-[#0c4b31]" />
            </div>
            <strong className="text-2xl font-extrabold text-[#0c4b31]">{products.length}</strong>
            <p className="text-[11px] text-gray-500 mt-1">In your studio collection</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#e2ece5] shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold">Marketplace Approved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <strong className="text-2xl font-extrabold text-emerald-700">{approvedCount}</strong>
            <p className="text-[11px] text-gray-500 mt-1">Live to global buyers</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#e2ece5] shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold">Under AI Quality Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <strong className="text-2xl font-extrabold text-amber-700">{reviewCount}</strong>
            <p className="text-[11px] text-gray-500 mt-1">Verification in progress</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#e2ece5] shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-2">
              <span className="text-xs font-semibold">Available Units in Stock</span>
              <TrendingUp className="w-4 h-4 text-[#e27d35]" />
            </div>
            <strong className="text-2xl font-extrabold text-[#0c4b31]">{totalStock}</strong>
            <p className="text-[11px] text-gray-500 mt-1">Ready for direct dispatch</p>
          </div>
        </div>

        {/* Catalog Section */}
        {/* Workspace Sections - Catalog & Custom Requests */}
        <div className="mt-10 bg-white rounded-2xl border border-[#dfe7e2] shadow-xs p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMainTab('catalog')}
                className={`pb-1 font-extrabold text-base sm:text-lg border-b-2 transition-all cursor-pointer ${
                  mainTab === 'catalog'
                    ? 'border-[#0c4b31] text-[#0c4b31]'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                Product Catalog ({products.length})
              </button>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                id="artisan-custom-requests-tab-btn"
                onClick={() => setMainTab('custom_requests')}
                className={`pb-1 font-extrabold text-base sm:text-lg border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  mainTab === 'custom_requests'
                    ? 'border-[#0c4b31] text-[#0c4b31]'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#e27d35]" />
                <span>Custom Requests</span>
                {pendingCustomCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#e87722] text-white text-[10px] font-extrabold ml-1">
                    {pendingCustomCount} new
                  </span>
                )}
              </button>
            </div>

            {/* Sub-filter tabs for Catalog */}
            {mainTab === 'catalog' && (
              <div className="flex items-center gap-1.5 p-1 bg-[#f0f6f2] rounded-xl text-xs font-semibold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeFilter === 'all' ? 'bg-[#0c4b31] text-white font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeFilter === 'approved' ? 'bg-[#0c4b31] text-white font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Approved ({approvedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('review')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeFilter === 'review' ? 'bg-[#0c4b31] text-white font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Review ({reviewCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('unpublished')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeFilter === 'unpublished' ? 'bg-[#0c4b31] text-white font-bold' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Unpublished
                </button>
              </div>
            )}
          </div>

          {/* MAIN TAB 1: Product Catalog */}
          {mainTab === 'catalog' && (
            <>
              {filteredProducts.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-700">No craft items found in this section.</p>
                  <p className="text-xs text-gray-500 mt-0.5">Click &quot;+ Add New Craft&quot; to list your first handmade creation.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => {
                    const isEditing = editingId === product.id;

                    return (
                      <div key={product.id} className="py-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
                        {/* Left: Thumbnail & Details */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#f4f7f5] border border-gray-200 shrink-0 flex items-center justify-center p-1">
                            <img
                              src={product.image_url}
                              alt={product.product_name}
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                product.status === 'approved' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : product.status === 'pending_ai_check' || product.status === 'admin_review' || product.status === 'under_review'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                ● {product.status.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              <span className="text-[11px] font-semibold text-gray-400">
                                {product.category}
                              </span>
                            </div>

                            <h4 className="text-base font-extrabold text-[#0c4b31] truncate">
                              {product.product_name}
                            </h4>

                            <p className="text-xs text-gray-500 line-clamp-1">
                              {product.description}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-gray-600 pt-1">
                              <span>
                                Current Price: <strong className="text-[#0c4b31] font-bold">₹{product.selling_price.toLocaleString('en-IN')}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                In Stock: <strong className={product.stock_quantity > 0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>{product.stock_quantity}</strong>
                              </span>
                              <span>•</span>
                              <span className="text-gray-400 text-[11px]">
                                AI Living Wage Recommendation: ₹{product.suggested_price}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Inline Editor or Action Buttons */}
                        <div className="w-full md:w-auto shrink-0 flex flex-col md:items-end gap-2">
                          {isEditing ? (
                            <div className="p-3 bg-[#f8faf8] border border-[#ceddd2] rounded-xl flex flex-wrap items-center gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Price (₹)</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editValues.price}
                                  onChange={(e) => setEditValues((prev) => ({ ...prev, price: Number(e.target.value) }))}
                                  className="w-24 px-2 py-1 text-xs border rounded bg-white font-bold"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Stock Units</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={editValues.stock}
                                  onChange={(e) => setEditValues((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                                  className="w-20 px-2 py-1 text-xs border rounded bg-white font-bold"
                                />
                              </div>

                              <div className="flex gap-1 self-end">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(product.id)}
                                  disabled={savingEdit}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-50"
                                >
                                  {savingEdit ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="px-2.5 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(product)}
                                className="px-3 py-1.5 rounded-lg bg-[#edf8f1] hover:bg-[#dff3e6] text-[#0c4b31] text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Stock & Price</span>
                              </button>

                              <span className="rounded-lg bg-[#edf8f1] px-3 py-1.5 text-xs font-bold text-[#0c4b31]">
                                {product.status === 'approved' ? 'Admin approved · Live' : 'Awaiting Admin decision'}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleDelete(product)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                                title="Delete craft listing"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* MAIN TAB 2: Custom Product Requests from Customers */}
          {mainTab === 'custom_requests' && (
            <div className="pt-4 space-y-4">
              {loadingCustomRequests ? (
                <div className="py-12 text-center text-gray-500">
                  <div className="w-8 h-8 border-3 border-[#0c4b31] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold">Loading customer custom requests...</p>
                </div>
              ) : customRequests.length === 0 ? (
                <div className="py-16 text-center text-gray-500 space-y-2">
                  <Sparkles className="w-12 h-12 mx-auto text-[#d96b14] opacity-50" />
                  <p className="text-sm font-bold text-gray-700">No Custom Requests Yet</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    When customers view your crafts and request customized colors, sizes or motifs, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {customRequests.map((req) => (
                    <div key={req.id} className="py-6 space-y-4">
                      {/* Request Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-extrabold text-[#0c4b31]">Request #{req.id}</span>
                            <span>•</span>
                            <span className="text-gray-500">{new Date(req.created_at).toLocaleString()}</span>
                            <span>•</span>
                            <span className="font-bold text-gray-800">Buyer: {req.customer_name}</span>
                          </div>
                          {req.product_name && (
                            <p className="text-xs text-gray-500">
                              Based on craft: <strong className="text-gray-700">{req.product_name}</strong>
                            </p>
                          )}
                        </div>

                        <div>
                          {req.status === 'pending' && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                              ● Pending Your Quote
                            </span>
                          )}
                          {req.status === 'quoted' && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                              ● Quoted (₹{req.quoted_price}) - Awaiting Buyer
                            </span>
                          )}
                          {req.status === 'accepted' && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                              ● Buyer Accepted Quote (₹{req.quoted_price})
                            </span>
                          )}
                          {req.status === 'ordered' && (
                            <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
                              ● Custom Order Placed & Confirmed
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                              ● Request Declined
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Request Content Body */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 rounded-2xl bg-[#fafcfa] border border-[#dce8df]">
                        {/* Reference photo preview */}
                        <div className="lg:col-span-3 space-y-2">
                          {req.reference_image_url ? (
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                                Customer Reference Image
                              </span>
                              <a
                                href={req.reference_image_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-xl overflow-hidden border border-gray-200 bg-white group relative aspect-square max-w-[140px]"
                              >
                                <img
                                  src={req.reference_image_url}
                                  alt="Customer Reference"
                                  className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
                                />
                                <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                                  Zoom
                                </span>
                              </a>
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center text-xs text-gray-400 font-semibold">
                              No reference photo attached
                            </div>
                          )}
                        </div>

                        {/* Customization Details */}
                        <div className="lg:col-span-6 space-y-2">
                          <span className="text-[10px] font-extrabold text-[#0c4b31] uppercase tracking-wider block">
                            Requested Custom Work
                          </span>
                          <p className="text-xs sm:text-sm text-gray-800 leading-relaxed font-medium bg-white p-3 rounded-xl border border-gray-200">
                            {req.customization_details}
                          </p>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-white border border-gray-200">
                              <span className="text-gray-400 text-[10px] font-semibold block">Quantity</span>
                              <strong className="text-gray-900">{req.quantity} unit(s)</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-white border border-gray-200">
                              <span className="text-gray-400 text-[10px] font-semibold block">Color</span>
                              <strong className="text-gray-900 truncate block">{req.preferred_color || 'As shown'}</strong>
                            </div>
                            <div className="p-2 rounded-lg bg-white border border-gray-200">
                              <span className="text-gray-400 text-[10px] font-semibold block">Size</span>
                              <strong className="text-gray-900 truncate block">{req.preferred_size || 'Standard'}</strong>
                            </div>
                          </div>

                          {req.additional_note && (
                            <p className="text-xs text-gray-500 italic">
                              Buyer Note: {req.additional_note}
                            </p>
                          )}

                          {req.artisan_message && (
                            <div className="p-2.5 rounded-xl bg-[#edf8f1] border border-[#cbe4d3] text-xs text-gray-700">
                              <strong className="text-[10px] uppercase text-[#0c4b31] block font-bold">
                                Your Sent Message:
                              </strong>
                              <p className="italic mt-0.5">&quot;{req.artisan_message}&quot;</p>
                            </div>
                          )}
                        </div>

                        {/* Action Panel for Artisan */}
                        <div className="lg:col-span-3 flex flex-col justify-between space-y-3 bg-white p-3.5 rounded-xl border border-gray-200">
                          <div>
                            {req.quoted_price ? (
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Quoted Amount</span>
                                <div className="text-xl font-extrabold text-[#0c4b31]">
                                  ₹{Number(req.quoted_price).toLocaleString('en-IN')}
                                </div>
                                <span className="text-[10px] text-gray-500">For {req.quantity} unit(s)</span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-amber-700 uppercase">Price Required</span>
                                <p className="text-xs text-gray-500">Quote total price including crafting & material.</p>
                              </div>
                            )}
                          </div>

                          {/* Artisan Action Buttons */}
                          <div className="space-y-2">
                            {req.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  id={`quote-btn-${req.id}`}
                                  onClick={() => handleOpenQuoteModal(req)}
                                  className="w-full py-2.5 px-3 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-[#ffd186]" />
                                  <span>Send Price Quote</span>
                                </button>

                                <button
                                  type="button"
                                  id={`reject-btn-${req.id}`}
                                  onClick={() => handleOpenRejectModal(req)}
                                  className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <span>Decline Request</span>
                                </button>
                              </>
                            )}

                            {req.status === 'quoted' && (
                              <button
                                type="button"
                                onClick={() => handleOpenQuoteModal(req)}
                                className="w-full py-2 px-3 rounded-xl bg-white border border-[#0c4b31] text-[#0c4b31] hover:bg-[#edf8f1] text-xs font-bold transition-colors cursor-pointer"
                              >
                                Revise Price Quote
                              </button>
                            )}

                            <Link
                              to={`/artisan/messages`}
                              className="w-full py-2 px-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Messages Inbox</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Send / Revise Price Quote */}
        {quoteModalReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#e27d35]" />
                  <h3 className="text-lg font-extrabold text-[#0c4b31]">
                    Send Custom Price Quote
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setQuoteModalReq(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-[#fafcfa] border border-[#e0eae3] text-xs space-y-1">
                <p><strong>Customer:</strong> {quoteModalReq.customer_name}</p>
                <p><strong>Requirement:</strong> {quoteModalReq.customization_details}</p>
                <p><strong>Quantity:</strong> {quoteModalReq.quantity} unit(s)</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-900">
                    Total Quoted Price (₹) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    required
                    value={quotePriceInput}
                    onChange={(e) => setQuotePriceInput(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-base font-bold outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/15"
                  />
                  <p className="text-[11px] text-gray-400">Total amount buyer will pay upon accepting quote.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-900">
                    Artisan Message / Timeline to Buyer (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={quoteMessageInput}
                    onChange={(e) => setQuoteMessageInput(e.target.value)}
                    placeholder="e.g. Will take 5-7 days to handcraft and naturally sun-bake. Includes protective wooden crate."
                    className="w-full rounded-xl border border-gray-300 p-3 text-xs outline-none focus:border-[#0c4b31] focus:ring-2 focus:ring-[#0c4b31]/15"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuoteModalReq(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-send-quote-btn"
                  disabled={submittingQuote}
                  onClick={handleSubmitQuote}
                  className="px-6 py-2.5 rounded-xl bg-[#0c4b31] hover:bg-[#073623] text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submittingQuote ? 'Sending Quote...' : 'Send Quote to Buyer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Decline / Reject Custom Request */}
        {rejectModalReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="text-base font-extrabold text-red-700">
                  Decline Custom Request
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-gray-600">
                Are you sure you want to decline this request from <strong>{rejectModalReq.customer_name}</strong>?
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Reason for buyer (Optional):</label>
                <textarea
                  rows={3}
                  value={rejectMessageInput}
                  onChange={(e) => setRejectMessageInput(e.target.value)}
                  placeholder="e.g. Currently out of traditional natural clay / capacity fully booked for this festival season."
                  className="w-full rounded-xl border border-gray-300 p-3 text-xs outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  id="confirm-reject-request-btn"
                  disabled={submittingReject}
                  onClick={handleSubmitReject}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submittingReject ? 'Declining...' : 'Decline Request'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
      {isLoggedIn && (
        <Link
          to="/artisan/messages"
          aria-label="Open buyer messages"
          title="Buyer Messages"
          className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#0c4b31] text-white shadow-xl shadow-[#0c4b31]/35 transition-transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-[#bce0c9] sm:bottom-8 sm:right-8"
        >
          <MessageSquare className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
};
