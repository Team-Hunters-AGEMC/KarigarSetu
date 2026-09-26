import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Home, Minus, Phone, Plus, X } from 'lucide-react';
import { getCurrentCustomer } from '../../services/customerAuth';
import { useLanguage } from '../../i18n/LanguageContext';

type Address = { address: string; city: string; district: string; state: string; pin_code: string; mobile: string };

const readCheckout = (state: any) => {
  if (state?.product) return state;
  try { return JSON.parse(sessionStorage.getItem('karigarsetu_buy_now') || 'null'); } catch { return null; }
};

export const CheckoutConfirm: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const customer: any = getCurrentCustomer();
  const checkout = readCheckout(location.state);
  const product = checkout?.product;
  const isCustomOrder = Boolean(checkout?.custom_request_id);
  const stock = isCustomOrder ? Math.max(1, Number(checkout?.quantity || 1)) : Math.max(0, Number(product?.stock_quantity || 0));
  const [quantity, setQuantity] = useState(isCustomOrder ? Number(checkout?.quantity || 1) : Math.min(stock, Math.max(1, Number(checkout?.quantity || 1))));
  const [editingAddress, setEditingAddress] = useState(false);
  const [address, setAddress] = useState<Address>({
    address: customer?.address || '', city: customer?.city || '', district: customer?.district || '',
    state: customer?.state || '', pin_code: customer?.pin_code || '', mobile: customer?.mobile || '',
  });
  const [draftAddress, setDraftAddress] = useState(address);
  const total = useMemo(() => Number(product?.selling_price || 0) * quantity, [product, quantity]);

  if (!customer) return <Navigate to="/customer/login" replace state={{ from: '/customer/checkout' }} />;
  if (!product) return <Navigate to="/marketplace" replace />;

  const saveAddress = () => {
    if (!draftAddress.address.trim() || !draftAddress.city.trim() || !draftAddress.state.trim() || !/^\d{6}$/.test(draftAddress.pin_code.trim())) return;
    setAddress(draftAddress);
    setEditingAddress(false);
  };

  const continueToPayment = () => {
    if (!isCustomOrder && (stock === 0 || quantity > stock)) return;
    const next = { product, quantity, address, total, custom_request_id: checkout?.custom_request_id };
    sessionStorage.setItem('karigarsetu_buy_now', JSON.stringify(next));
    navigate('/customer/payment', { state: next });
  };

  return (
    <div className="min-h-screen bg-transparent pb-28 text-[#17281f]">
      <header className="border-b bg-white px-4 py-5 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4"><button onClick={() => navigate(-1)} className="cursor-pointer"><ArrowLeft /></button><h1 className="text-2xl font-extrabold">{t.checkout.confirmDetails}</h1></div>
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-3 text-center text-sm font-bold">
          <div className="text-[#0b5738]"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0b5738]"><Check className="h-5 w-5" /></span><p>{t.checkout.deliveryAddress}</p></div>
          <div className="text-[#0b5738]"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#0b5738] text-white">2</span><p>{t.checkout.confirmDetails}</p></div>
          <div className="text-gray-400"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2">3</span><p>{t.checkout.payment}</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h2 className="text-2xl font-black">{t.checkout.deliveringTo}</h2>
        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><Home className="mt-1 text-[#0b5738]" /><div><h3 className="text-xl font-extrabold">{customer.name}</h3><p className="mt-3 max-w-2xl text-gray-600">{[address.address, address.city, address.district, address.state, address.pin_code].filter(Boolean).join(', ')}</p><p className="mt-3 flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4" /> {address.mobile}</p></div></div><button onClick={() => { setDraftAddress(address); setEditingAddress(true); }} className="font-extrabold text-blue-600 cursor-pointer">{t.checkout.change}</button></div>
        </section>

        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center"><img src={product.image_url || ''} alt={product.product_name} className="h-36 w-36 rounded-2xl bg-[#eef5f0] object-contain" /><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase text-[#e87722]">{product.category}</p><h2 className="mt-1 text-xl font-black text-[#0b5738]">{product.product_name}</h2><p className="mt-1 text-sm text-gray-500">Sold by {product.artisan_name}</p><strong className="mt-4 block text-2xl">₹{Number(product.selling_price).toLocaleString('en-IN')}</strong></div><div><div className="flex items-center rounded-xl border"><button disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="p-3 disabled:opacity-30 cursor-pointer"><Minus className="h-4 w-4" /></button><span className="min-w-12 text-center font-extrabold">{quantity}</span><button disabled={quantity >= stock} onClick={() => setQuantity((q) => Math.min(stock, q + 1))} className="p-3 disabled:opacity-30 cursor-pointer"><Plus className="h-4 w-4" /></button></div><p className="mt-2 text-center text-xs text-gray-500">{stock} {t.productDetails.stockLeft}</p></div></div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t bg-white p-4 shadow-[0_-6px_20px_rgba(0,0,0,.08)]"><div className="mx-auto flex max-w-5xl items-center justify-between gap-6"><div><p className="text-xs text-gray-500">{t.checkout.totalAmount}</p><strong className="text-2xl">₹{total.toLocaleString('en-IN')}</strong></div><button disabled={stock === 0 || quantity > stock} onClick={continueToPayment} className="min-w-48 rounded-2xl bg-[#ffd522] px-8 py-4 text-lg font-black disabled:bg-gray-300 cursor-pointer">{t.checkout.continue}</button></div></footer>

      {editingAddress && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">{t.checkout.change} {t.checkout.deliveryAddress}</h2><button onClick={() => setEditingAddress(false)} className="cursor-pointer"><X /></button></div><div className="grid gap-3 sm:grid-cols-2"><textarea value={draftAddress.address} onChange={(e) => setDraftAddress({ ...draftAddress, address: e.target.value })} placeholder={t.checkout.streetAddress} className="min-h-24 rounded-xl border p-3 sm:col-span-2" /><input value={draftAddress.city} onChange={(e) => setDraftAddress({ ...draftAddress, city: e.target.value })} placeholder={t.checkout.city} className="rounded-xl border p-3" /><input value={draftAddress.district} onChange={(e) => setDraftAddress({ ...draftAddress, district: e.target.value })} placeholder={t.checkout.district} className="rounded-xl border p-3" /><input value={draftAddress.state} onChange={(e) => setDraftAddress({ ...draftAddress, state: e.target.value })} placeholder={t.checkout.state} className="rounded-xl border p-3" /><input value={draftAddress.pin_code} maxLength={6} onChange={(e) => setDraftAddress({ ...draftAddress, pin_code: e.target.value.replace(/\D/g, '') })} placeholder={t.checkout.pinCode} className="rounded-xl border p-3" /><input value={draftAddress.mobile} onChange={(e) => setDraftAddress({ ...draftAddress, mobile: e.target.value.replace(/\D/g, '') })} placeholder={t.checkout.mobileNumber} className="rounded-xl border p-3 sm:col-span-2" /></div><button onClick={saveAddress} className="mt-5 w-full rounded-xl bg-[#0b5738] py-3 font-extrabold text-white cursor-pointer">{t.checkout.saveAddress}</button></div></div>}
    </div>
  );
};
