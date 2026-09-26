import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Package, Clock, CheckCircle2, Truck } from 'lucide-react';
import { getCurrentCustomer } from '../../services/customerAuth';
import { useLanguage } from '../../i18n/LanguageContext';

export const CustomerOrders: React.FC = () => {
  const { t } = useLanguage();
  const customer = getCurrentCustomer();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!customer) return;
    let active = true;
    fetch('/api/customers/orders', { credentials: 'include', headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) throw new Error(data?.message || 'Unable to load orders');
        if (active) setOrders(Array.isArray(data.data) ? data.data : []);
      })
      .catch((reason) => { if (active) setError(reason?.message || 'Unable to load orders'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [customer?.id]);

  if (!customer) return <Navigate to="/customer/login" replace state={{ from: '/customer/orders' }} />;

  return (
    <div className="min-h-screen bg-[#f7faf8] px-4 py-8 text-[#1a2e24] sm:px-6">
      <main className="mx-auto max-w-6xl">
        <Link to="/marketplace" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#0c4b31]"><ArrowLeft className="h-4 w-4" /> {t.nav.backToMarketplace}</Link>
        <div className="mb-7"><p className="text-xs font-extrabold uppercase tracking-wider text-[#e87722]">Purchase history</p><h1 className="text-3xl font-black text-[#0c4b31]">{t.orders.title}</h1><p className="mt-1 text-sm text-gray-500">{t.orders.subtitle}</p></div>
        {isLoading ? (
          <section className="rounded-3xl border border-[#dce8df] bg-white p-12 text-center shadow-sm"><Clock className="mx-auto mb-4 h-10 w-10 animate-spin text-[#8eb8a0]" /><p className="font-bold text-[#0c4b31]">{t.orders.loadingOrders}</p></section>
        ) : error ? (
          <section className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm"><p className="font-bold text-red-700">{error}</p></section>
        ) : !orders.length ? (
          <section className="rounded-3xl border border-[#dce8df] bg-white p-12 text-center shadow-sm"><Package className="mx-auto mb-4 h-12 w-12 text-[#8eb8a0]" /><h2 className="text-xl font-extrabold text-[#0c4b31]">{t.orders.noOrdersTitle}</h2><p className="mt-2 text-sm text-gray-500">{t.orders.noOrdersHint}</p><Link to="/marketplace" className="mt-6 inline-block rounded-xl bg-[#0c5b3b] px-6 py-3 text-sm font-bold text-white cursor-pointer">{t.orders.startShopping}</Link></section>
        ) : (
          <div className="space-y-4">{orders.map((order) => (
            <article key={order.id} className="overflow-hidden rounded-2xl border border-[#dce8df] bg-white shadow-sm">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#f8fbf9] px-5 py-4"><div><p className="text-xs text-gray-500">{t.orders.orderId}</p><strong className="text-[#0c4b31]">{order.id}</strong></div><div className="text-right"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> {order.status}</span><p className="mt-1 text-[11px] text-gray-400">{new Date(order.created_at).toLocaleString()}</p></div></header>
              <div className="space-y-3 p-5">{order.items.map((item: any) => <div key={item.product_id} className="flex items-center gap-4"><img src={item.image_url || ''} alt={item.product_name} className="h-16 w-16 rounded-lg bg-[#eef5f0] object-contain" /><div className="flex-1"><h2 className="font-bold text-[#0c4b31]">{item.product_name}</h2><p className="text-xs text-gray-500">{t.orders.quantity}: {item.quantity} • {item.artisan_name}</p></div><strong>₹{(item.selling_price * item.quantity).toLocaleString('en-IN')}</strong></div>)}</div>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4"><p className="flex items-center gap-2 text-xs text-gray-500"><Truck className="h-4 w-4 text-[#e87722]" /> {t.orders.deliveryTo}: {order.delivery_address || 'Saved customer address'}</p><strong className="text-lg text-[#0c4b31]">{t.orders.total} ₹{Number(order.total).toLocaleString('en-IN')}</strong></footer>
            </article>
          ))}</div>
        )}
      </main>
    </div>
  );
};
