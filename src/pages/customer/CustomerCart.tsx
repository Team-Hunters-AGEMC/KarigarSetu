import React, { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, ShieldCheck, Zap } from 'lucide-react';
import { getCurrentCustomer } from '../../services/customerAuth';
import { useLanguage } from '../../i18n/LanguageContext';

interface CartItem {
  product_id: number;
  product_name: string;
  selling_price: number;
  image_url?: string;
  artisan_name?: string;
  artisan_id?: number;
  category?: string;
  quantity: number;
  stock_quantity: number;
}

const readCart = (): CartItem[] => {
  try { return JSON.parse(localStorage.getItem('karigarsetu_cart') || '[]'); } catch { return []; }
};

export const CustomerCart: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const customer = getCurrentCustomer();
  const [items, setItems] = useState<CartItem[]>(readCart);
  const [checkoutError, setCheckoutError] = useState('');

  const save = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem('karigarsetu_cart', JSON.stringify(next));
    window.dispatchEvent(new Event('karigarsetu_cart_updated'));
    window.dispatchEvent(new Event('karigarsetu_customer_updated'));
  };

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.selling_price) * item.quantity, 0), [items]);

  if (!customer) return <Navigate to="/customer/login" replace state={{ from: '/customer/cart' }} />;

  const changeQuantity = (id: number, change: number) => save(items.map((item) => item.product_id === id
    ? { ...item, quantity: Math.max(1, Math.min(Math.max(0, Number(item.stock_quantity)), item.quantity + change)) }
    : item));

  const removeItem = (productId: number) => {
    save(items.filter((item) => item.product_id !== productId));
    setCheckoutError('');
  };

  const buyNow = (item: CartItem) => {
    setCheckoutError('');
    const stock = Math.max(0, Number(item.stock_quantity));
    if (stock === 0) {
      setCheckoutError(`${item.product_name} is out of stock.`);
      return;
    }
    const quantity = Math.min(Math.max(1, Number(item.quantity)), stock);
    const product = { ...item, id: item.product_id };
    const checkoutData = { product, quantity, source: 'cart' };
    sessionStorage.setItem('karigarsetu_buy_now', JSON.stringify(checkoutData));
    navigate('/customer/checkout', { state: checkoutData });
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-8 text-[#1a2e24] sm:px-6">
      <main className="mx-auto max-w-6xl">
        <Link to="/marketplace" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#0c4b31]"><ArrowLeft className="h-4 w-4" /> {t.nav.backToMarketplace}</Link>
        <div className="mb-7 flex items-end justify-between">
          <div><p className="text-xs font-extrabold uppercase tracking-wider text-[#e87722]">Customer shopping</p><h1 className="text-3xl font-black text-[#0c4b31]">{t.cart.title}</h1></div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">{items.length} products</span>
        </div>

        {!items.length ? (
          <section className="rounded-3xl border border-[#dce8df] bg-white p-12 text-center shadow-sm">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-[#8eb8a0]" />
            <h2 className="text-xl font-extrabold text-[#0c4b31]">{t.cart.emptyTitle}</h2>
            <p className="mt-2 text-sm text-gray-500">{t.cart.emptyHint}</p>
            <Link to="/marketplace" className="mt-6 inline-block rounded-xl bg-[#0c5b3b] px-6 py-3 text-sm font-bold text-white cursor-pointer">{t.cart.startShopping}</Link>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <section className="space-y-3">
              {items.map((item) => (
                <article
                  key={item.product_id}
                  onClick={() => navigate(`/marketplace/products/${item.product_id}`)}
                  className="group flex flex-col gap-4 rounded-2xl border border-[#dce8df] bg-white p-4 shadow-sm transition-all duration-150 hover:border-[#8eb8a0] hover:shadow-md cursor-pointer sm:flex-row"
                >
                  <div className="relative block h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-[#eef5f0]">
                    <img
                      src={item.image_url || ''}
                      alt={item.product_name}
                      className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#e87722]">{item.artisan_name || 'Verified artisan'}</p>
                    <h2 className="truncate font-extrabold text-[#0c4b31] transition-colors duration-150 group-hover:text-[#083623] group-hover:underline">
                      {item.product_name}
                    </h2>
                    <p className="mt-2 text-lg font-black">₹{Number(item.selling_price).toLocaleString('en-IN')}</p>
                    <p className={`mt-1 text-xs font-bold ${Number(item.stock_quantity) > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {Number(item.stock_quantity) > 0 ? `${item.stock_quantity} in stock` : t.marketplace.outOfStock}
                    </p>
                  </div>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex min-w-44 flex-col gap-3 sm:items-end sm:justify-between"
                  >
                    <div className="flex items-center rounded-xl border bg-white">
                      <button
                        type="button"
                        disabled={item.quantity <= 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          changeQuantity(item.product_id, -1);
                        }}
                        className="p-2 disabled:opacity-30 cursor-pointer hover:bg-gray-50 rounded-l-xl transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-bold select-none">{item.quantity}</span>
                      <button
                        type="button"
                        disabled={Number(item.stock_quantity) <= 0 || item.quantity >= Number(item.stock_quantity)}
                        onClick={(e) => {
                          e.stopPropagation();
                          changeQuantity(item.product_id, 1);
                        }}
                        className="p-2 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer hover:bg-gray-50 rounded-r-xl transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.product_id);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-extrabold text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-4 w-4" /> {t.cart.remove}
                      </button>
                      <button
                        type="button"
                        disabled={Number(item.stock_quantity) <= 0 || item.quantity > Number(item.stock_quantity)}
                        onClick={(e) => {
                          e.stopPropagation();
                          buyNow(item);
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0c5b3b] px-3 py-2.5 text-xs font-extrabold text-white hover:bg-[#08452d] disabled:cursor-not-allowed disabled:bg-gray-400 cursor-pointer transition-colors"
                      >
                        <Zap className="h-4 w-4" /> {t.marketplace.buyNow}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
            <aside className="h-fit rounded-2xl border border-[#cfe0d5] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-[#0c4b31]">{t.cart.orderSummary}</h2>
              <div className="mt-5 flex justify-between border-b pb-4 text-sm"><span>{t.cart.subtotal}</span><strong>₹{total.toLocaleString('en-IN')}</strong></div>
              <div className="flex justify-between py-4 text-sm"><span>{t.cart.shipping}</span><strong className="text-emerald-700">{t.cart.freeShipping}</strong></div>
              <div className="flex justify-between border-t pt-4 text-lg"><strong>{t.cart.total}</strong><strong className="text-[#0c4b31]">₹{total.toLocaleString('en-IN')}</strong></div>
              {checkoutError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{checkoutError}</p>}
              <p className="mt-5 rounded-xl bg-[#f1f7f3] p-3 text-xs leading-relaxed text-gray-600">
                Direct handmade checkout with authentic GI certification and fair living wages.
              </p>
              <p className="mt-3 flex items-center justify-center gap-1 text-[11px] text-gray-500"><ShieldCheck className="h-3.5 w-3.5" /> Secure verified artisan order</p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};
