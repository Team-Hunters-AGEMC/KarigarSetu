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
  UserCheck
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editValues, setEditValues] = useState<{ stock: number; price: number }>({ stock: 0, price: 0 });
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    const current = getCurrentArtisan();
    const loggedIn = isArtisanLoggedIn();
    setArtisan(current);
    setIsLoggedIn(loggedIn);
    if (!loggedIn) { setProducts([]); return; }
    const response = await fetch(`/api/products?artisan_id=${current.id}`, { credentials: 'include' });
    const result = await response.json();
    setProducts(result.products || []);
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

  // Metrics
  const approvedCount = products.filter((p) => p.status === 'approved').length;
  const reviewCount = products.filter((p) => p.status === 'pending_ai_check' || p.status === 'admin_review' || p.status === 'under_review').length;
  const totalStock = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);

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
        <div className="mt-10 bg-white rounded-2xl border border-[#dfe7e2] shadow-xs p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-extrabold text-[#0c4b31]">Your Product Catalog</h3>
              <p className="text-xs text-gray-500">Manage pricing, inventory, and marketplace visibility.</p>
            </div>

            {/* Filter tabs */}
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
          </div>

          {/* Product Items List */}
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
        </div>

      </main>
    </div>
  );
};
