import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, Store, UserRound } from 'lucide-react';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { API_BASE } from '../../services/apiConfig';
import { getCurrentCustomer } from '../../services/customerAuth';

type ChatMessage = {
  id: number; body: string; sender_role: 'customer' | 'artisan'; created_at: string;
  artisan_name?: string; product_name?: string;
};

export const CustomerMessages: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const artisanId = Number(params.get('artisan_id'));
  const productId = Number(params.get('product_id')) || undefined;
  const artisanNameParam = params.get('artisan_name') || '';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [artisanFallbackName, setArtisanFallbackName] = useState(artisanNameParam);

  const title = useMemo(() => messages[0]?.artisan_name || artisanFallbackName || 'Artisan', [messages, artisanFallbackName]);

  const getHeaders = (extra: Record<string, string> = {}) => {
    const customer = getCurrentCustomer();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...extra,
    };
    if (customer?.id) {
      headers['X-Customer-Id'] = String(customer.id);
    }
    return headers;
  };

  const load = async () => {
    const customer = getCurrentCustomer();
    if (!artisanId || !customer) return;
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ artisan_id: String(artisanId) });
      if (productId) query.set('product_id', String(productId));
      const response = await fetch(`${API_BASE}/api/messages?${query}`, {
        credentials: 'include',
        headers: getHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Messages could not be loaded');
      setMessages(result.data || []);
      if (!artisanFallbackName && (!result.data || result.data.length === 0)) {
        // Attempt to fetch artisan name if no messages yet
        fetch(`${API_BASE}/api/artisans/public/${artisanId}`)
          .then((res) => res.json())
          .then((resData) => {
            if (resData?.success && resData?.data?.name) {
              setArtisanFallbackName(resData.data.name);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Messages could not be loaded');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getCurrentCustomer()) {
      navigate('/customer/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    if (!artisanId) {
      navigate('/marketplace');
      return;
    }
    load();
  }, [artisanId, productId]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ artisan_id: artisanId, product_id: productId, body }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Message could not be sent');
      setMessages((old) => [...old, result.data]);
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message could not be sent');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfaf6] text-[#173b2d]">
      <MarketplaceNavbar searchQuery="" onSearchChange={() => {}} selectedCategory="All" onSelectCategory={() => {}} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <Link
          to={productId ? `/marketplace/products/${productId}` : '/customer/custom-requests'}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#0b5538] hover:underline"
        >
          <ArrowLeft size={18} /> {productId ? 'Back to product' : 'Back to Custom Requests'}
        </Link>
        <section className="overflow-hidden rounded-3xl border border-[#dce9df] bg-white shadow-sm">
          <header className="flex items-center gap-3 border-b border-[#e8f0ea] bg-[#f2f8f3] p-5">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0b5538] text-white">
              <Store size={21} />
            </div>
            <div>
              <h1 className="font-extrabold text-[#0b5538]">Message {title}</h1>
              <p className="text-xs text-slate-500">
                {messages[0]?.product_name
                  ? `About: ${messages[0].product_name}`
                  : 'Ask about this handmade craft, customizations, and orders'}
              </p>
            </div>
          </header>
          <div className="h-[430px] space-y-3 overflow-y-auto bg-[#fcfdfb] p-5">
            {loading ? (
              <p className="pt-16 text-center text-sm text-slate-500">Opening conversation…</p>
            ) : messages.length === 0 ? (
              <div className="pt-16 text-center">
                <MessageCircle className="mx-auto mb-3 text-[#0b5538]" />
                <p className="font-bold">Start a conversation</p>
                <p className="mt-1 text-sm text-slate-500">
                  Ask the artisan about material, size, delivery, or custom work.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_role === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${
                      message.sender_role === 'customer'
                        ? 'rounded-br-md bg-[#0b5538] text-white'
                        : 'rounded-bl-md bg-[#eaf4ec] text-[#173b2d]'
                    }`}
                  >
                    <p>{message.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        message.sender_role === 'customer' ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {error && <p className="mx-5 my-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
          <form onSubmit={send} className="flex gap-3 border-t border-[#e8f0ea] p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf6f0] text-[#0b5538]">
              <UserRound size={18} />
            </div>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1500}
              placeholder="Write your message…"
              className="min-w-0 flex-1 rounded-xl border border-[#cfe0d5] px-4 text-sm outline-none focus:border-[#0b5538]"
            />
            <button
              disabled={!draft.trim() || sending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b5538] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <Send size={17} />
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

