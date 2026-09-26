import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, Store, UserRound, MoreVertical, Trash2, Ban } from 'lucide-react';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { API_BASE } from '../../services/apiConfig';
import { getCurrentCustomer } from '../../services/customerAuth';
import { useLanguage } from '../../i18n/LanguageContext';

type ChatMessage = {
  id: number;
  body: string;
  sender_role: 'customer' | 'artisan';
  created_at: string;
  is_deleted_everyone?: boolean;
  artisan_name?: string;
  product_name?: string;
};

export const CustomerMessages: React.FC = () => {
  const { t } = useLanguage();
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

  // Message Action Menu & Deletion Modal State
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<number | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ChatMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => messages[0]?.artisan_name || artisanFallbackName || 'Artisan', [messages, artisanFallbackName]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuMessageId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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
      const msg = e instanceof Error ? e.message : 'Message could not be sent';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteForMe = async (messageId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuMessageId(null);
    try {
      const response = await fetch(`${API_BASE}/api/messages/${messageId}?scope=me`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Failed to delete message');
      setMessages((old) => old.filter((m) => m.id !== messageId));
      showToast(t.chat?.deleteForMe || 'Message deleted for you');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete message';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const confirmDeleteForEveryone = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/api/messages/${deleteConfirmTarget.id}?scope=everyone`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Failed to delete for everyone');
      setMessages((old) =>
        old.map((m) =>
          m.id === deleteConfirmTarget.id ? { ...m, body: '', is_deleted_everyone: true } : m
        )
      );
      setDeleteConfirmTarget(null);
      showToast(t.chat?.deleteForEveryone || 'Message deleted for everyone');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete for everyone';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#173b2d]">
      <MarketplaceNavbar searchQuery="" onSearchChange={() => {}} selectedCategory="All" onSelectCategory={() => {}} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <Link
          to={productId ? `/marketplace/products/${productId}` : '/customer/custom-requests'}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#0b5538] hover:underline"
        >
          <ArrowLeft size={18} /> {productId ? t.productDetails?.backToMarketplace || 'Back to product' : t.customRequests?.title || 'Back to Custom Requests'}
        </Link>
        <section className="overflow-hidden rounded-3xl border border-[#dce9df] bg-white shadow-md">
          {/* Header */}
          <header className="flex items-center gap-3.5 border-b border-[#e5ede7] bg-gradient-to-r from-[#f0f7f2] via-[#f7faf8] to-[#fbfdfb] p-5">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#0b5538] text-white shadow-xs">
              <Store size={21} />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-[#0b5538] sm:text-lg">{t.productDetails?.messageArtisan || 'Message'} {title}</h1>
              <p className="text-xs font-medium text-slate-500">
                {messages[0]?.product_name
                  ? `${t.productDetails?.specifications || 'About'}: ${messages[0].product_name}`
                  : t.productDetails?.artisanCraftsmanship || 'Ask about this handmade craft, customizations, and orders'}
              </p>
            </div>
          </header>

          {/* Chat Canvas with Warm Sage & Cream Subtle Handmade Background */}
          <div
            className="relative h-[480px] space-y-4 overflow-y-auto px-4 py-6 sm:px-8 bg-gradient-to-b from-[#f9fbf8] via-[#f7f9f6] to-[#f4f7f3]"
            style={{
              backgroundImage: 'radial-gradient(circle, #dbe4dd 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            {loading ? (
              <p className="pt-20 text-center text-sm font-medium text-slate-500">Opening conversation…</p>
            ) : messages.length === 0 ? (
              <div className="pt-20 text-center">
                <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-full bg-[#ebf5ee] text-[#0b5538]">
                  <MessageCircle size={26} />
                </div>
                <p className="font-extrabold text-[#173b2d]">{t.customRequests?.chatWithArtisan || 'Start a conversation'}</p>
                <p className="mx-auto mt-1.5 max-w-sm text-xs text-slate-500">
                  Ask the artisan about material, size, delivery, or custom work.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isMe = message.sender_role === 'customer';
                const isDeletedEveryone = Boolean(message.is_deleted_everyone);
                const isMenuOpen = activeMenuMessageId === message.id;

                return (
                  <div
                    key={message.id}
                    className={`group relative flex ${isMe ? 'justify-end' : 'justify-start'} py-0.5`}
                  >
                    <div className={`relative max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`relative rounded-2xl px-4.5 py-3 text-sm transition-all ${
                          isMe
                            ? isDeletedEveryone
                              ? 'rounded-br-xs border border-[#e2ece5] bg-[#f0f4f1] text-slate-500 italic shadow-xs'
                              : 'rounded-br-xs bg-[#0b5538] text-white shadow-xs'
                            : isDeletedEveryone
                            ? 'rounded-bl-xs border border-[#edebe8] bg-[#f7f5f2] text-slate-500 italic shadow-xs'
                            : 'rounded-bl-xs border border-[#e5ece6] bg-[#ffffff] text-[#173b2d] shadow-xs'
                        }`}
                      >
                        {/* Message Body or Deleted Placeholder */}
                        <div className="flex items-start gap-2">
                          {isDeletedEveryone && <Ban size={14} className="mt-0.5 shrink-0 opacity-60" />}
                          <p className="leading-relaxed break-words">
                            {isDeletedEveryone
                              ? isMe
                                ? t.chat?.youDeletedMessage || 'You deleted this message'
                                : t.chat?.thisMessageDeleted || 'This message was deleted'
                              : message.body}
                          </p>
                        </div>

                        {/* Timestamp */}
                        <div className="mt-1 flex items-center justify-between gap-3 text-[10px]">
                          <span className={isMe && !isDeletedEveryone ? 'text-emerald-100/80' : 'text-slate-400'}>
                            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* 3-Dot Action Menu Button */}
                      {!isDeletedEveryone && (
                        <div
                          className={`absolute top-2 ${isMe ? '-left-8 sm:-left-9' : '-right-8 sm:-right-9'} ${
                            isMenuOpen ? 'opacity-100 z-30' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                          } transition-opacity`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuMessageId(isMenuOpen ? null : message.id);
                            }}
                            className="rounded-full bg-white/95 p-1.5 text-slate-600 shadow-md border border-slate-200/80 hover:bg-white hover:text-slate-900 transition-colors"
                            title="Message options"
                            aria-label="Message options"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute z-40 top-8 ${isMe ? 'right-0 sm:left-0 sm:right-auto' : 'left-0 sm:right-0 sm:left-auto'} w-44 rounded-2xl border border-[#dce8df] bg-white py-1.5 shadow-xl text-xs`}
                            >
                              <button
                                type="button"
                                onClick={(e) => handleDeleteForMe(message.id, e)}
                                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-[#f4f8f5] transition-colors"
                              >
                                <Trash2 size={14} className="text-slate-500" />
                                <span>{t.chat?.deleteForMe || 'Delete for Me'}</span>
                              </button>

                              {isMe && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuMessageId(null);
                                    setDeleteConfirmTarget(message);
                                  }}
                                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Ban size={14} className="text-red-500" />
                                  <span>{t.chat?.deleteForEveryone || 'Delete for Everyone'}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && <p className="mx-5 my-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

          {/* Message Input Footer */}
          <form onSubmit={send} className="flex items-center gap-3 border-t border-[#e8f0ea] bg-[#fafcfb] p-3.5 sm:p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf6f0] text-[#0b5538]">
              <UserRound size={18} />
            </div>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1500}
              placeholder="Write your message…"
              className="min-w-0 flex-1 rounded-xl border border-[#cfe0d5] bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#0b5538] focus:ring-1 focus:ring-[#0b5538]"
            />
            <button
              disabled={!draft.trim() || sending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0b5538] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-opacity hover:bg-[#08422b] disabled:opacity-50"
            >
              <Send size={16} />
              <span className="hidden sm:inline">{sending ? 'Sending…' : 'Send'}</span>
            </button>
          </form>
        </section>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`rounded-2xl px-4 py-3 text-xs font-bold shadow-lg border flex items-center gap-2 ${
              toastMessage.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-[#ebf5ee] text-[#0b5538] border-[#c4e0cb]'
            }`}
          >
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete for Everyone */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-[#dce9df] bg-white p-6 shadow-2xl space-y-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#173b2d]">
                {t.chat?.deleteForEveryoneConfirmTitle || 'Delete this message for everyone?'}
              </h3>
              <p className="text-xs text-slate-500">
                {t.chat?.deleteForEveryoneConfirmDesc || 'This message will be removed for both you and the other participant.'}
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {t.chat?.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteForEveryone}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? t.chat?.deleting || 'Deleting...' : t.chat?.delete || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


