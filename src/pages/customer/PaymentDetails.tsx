import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, Landmark, Loader2, Smartphone } from 'lucide-react';
import { getCurrentCustomer } from '../../services/customerAuth';
import { useLanguage } from '../../i18n/LanguageContext';

const readCheckout = (state: any) => {
  if (state?.product && state?.address) return state;
  try { return JSON.parse(sessionStorage.getItem('karigarsetu_buy_now') || 'null'); } catch { return null; }
};

export const PaymentDetails: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const customer = getCurrentCustomer();
  const checkout = readCheckout(location.state);
  const [method, setMethod] = useState<'cod' | 'upi' | 'card'>('cod');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  if (!customer) return <Navigate to="/customer/login" replace state={{ from: '/customer/payment' }} />;
  if (!checkout?.product || !checkout?.address) return <Navigate to="/marketplace" replace />;

  const placeOrder = async () => {
    setPlacing(true); setError('');
    try {
      const payload: any = {
        delivery_address: checkout.address,
        payment_method: method,
      };
      if (checkout.custom_request_id) {
        payload.custom_request_id = checkout.custom_request_id;
      } else {
        payload.items = [{ product_id: checkout.product.id, quantity: checkout.quantity }];
      }

      const response = await fetch('/api/customers/orders', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Order could not be placed');
      sessionStorage.removeItem('karigarsetu_buy_now');
      navigate('/customer/orders', { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Order could not be placed'); }
    finally { setPlacing(false); }
  };

  const Option = ({ value, icon, title, text }: any) => (
    <button
      type="button"
      onClick={() => setMethod(value)}
      className={`flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left cursor-pointer transition-all ${
        method === value ? 'border-[#0b5738] bg-emerald-50' : 'border-gray-200 bg-white'
      }`}
    >
      {icon}
      <div className="flex-1">
        <h3 className="font-extrabold">{title}</h3>
        <p className="text-xs text-gray-500">{text}</p>
      </div>
      {method === value && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0b5738] text-white">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f6f8f6] pb-28 text-[#17281f]">
      <header className="border-b bg-white px-4 py-5 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <button onClick={() => navigate(-1)} className="cursor-pointer"><ArrowLeft /></button>
          <h1 className="text-2xl font-extrabold">{t.checkout.payment}</h1>
        </div>
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-3 text-center text-sm font-bold">
          <div className="text-[#0b5738]"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0b5738]"><Check className="h-5 w-5" /></span><p>{t.checkout.deliveryAddress}</p></div>
          <div className="text-[#0b5738]"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0b5738]"><Check className="h-5 w-5" /></span><p>{t.checkout.confirmDetails}</p></div>
          <div className="text-[#0b5738]"><span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#0b5738] text-white">3</span><p>{t.checkout.payment}</p></div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_330px]">
        <section>
          <h2 className="mb-4 text-2xl font-black">{t.checkout.choosePaymentMethod}</h2>
          <div className="space-y-3">
            <Option value="cod" icon={<Landmark className="text-[#0b5738]" />} title={t.checkout.cashOnDelivery} text={t.checkout.payOnDelivery} />
            <Option value="upi" icon={<Smartphone className="text-[#0b5738]" />} title={t.checkout.upi} text={t.checkout.upiApps} />
            <Option value="card" icon={<CreditCard className="text-[#0b5738]" />} title={t.checkout.card} text={t.checkout.cardDesc} />
          </div>
        </section>
        <aside className="h-fit rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="font-extrabold">{t.cart.orderSummary}</h2>
          <div className="mt-4 flex gap-3">
            <img src={checkout.product.image_url || ''} className="h-16 w-16 rounded-lg object-contain bg-[#eef5f0]" />
            <div>
              <p className="font-bold">{checkout.product.product_name}</p>
              <p className="text-xs text-gray-500">{t.productDetails.quantity}: {checkout.quantity}</p>
            </div>
          </div>
          <div className="mt-5 flex justify-between border-t pt-4">
            <strong>{t.cart.total}</strong>
            <strong className="text-xl">₹{Number(checkout.total).toLocaleString('en-IN')}</strong>
          </div>
          {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
        </aside>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t bg-white p-4 shadow-[0_-6px_20px_rgba(0,0,0,.08)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6">
          <strong className="text-2xl">₹{Number(checkout.total).toLocaleString('en-IN')}</strong>
          <button disabled={placing} onClick={placeOrder} className="min-w-52 rounded-2xl bg-[#ffd522] px-8 py-4 text-lg font-black disabled:bg-gray-300 cursor-pointer">
            {placing ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> {t.common?.loading || 'Processing…'}</span> : method === 'cod' ? t.checkout.placeOrder : t.checkout.payAndPlaceOrder}
          </button>
        </div>
      </footer>
    </div>
  );
};
