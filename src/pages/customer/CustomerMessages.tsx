import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  Send,
  Store,
  UserRound,
  MoreVertical,
  Trash2,
  Ban,
  Package,
} from 'lucide-react';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { API_BASE } from '../../services/apiConfig';
import { getCurrentCustomer } from '../../services/customerAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { VoiceInputButton } from '../../components/common/VoiceInputButton';

type Conversation = {
  customer_id: number;
  artisan_id: number;
  product_id?: number | null;
  customer_name?: string;
  artisan_name?: string;
  product_name?: string;
  body: string;
  created_at?: string;
  unread_count?: number;
};

type ChatMessage = {
  id: number;
  customer_id: number;
  artisan_id: number;
  product_id?: number | null;
  body: string;
  sender_role: 'customer' | 'artisan';
  created_at: string;
  is_read?: boolean;
  is_deleted_everyone?: boolean;
  customer_name?: string;
  artisan_name?: string;
  product_name?: string;
};

export const CustomerMessages: React.FC = () => {
  const { t, language } = useLanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const queryArtisanId = Number(params.get('artisan_id')) || undefined;
  const queryProductId = Number(params.get('product_id')) || undefined;
  const queryArtisanName = params.get('artisan_name') || '';

  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Mobile navigation between conversation list and active chat
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Message Action Menu & Deletion Modal State
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<number | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ChatMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  const loadInbox = async (): Promise<Conversation[]> => {
    const customer = getCurrentCustomer();
    if (!customer) return [];
    try {
      const response = await fetch(`${API_BASE}/api/messages/inbox`, {
        credentials: 'include',
        headers: getHeaders(),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Messages inbox could not be loaded');
      }
      const data: Conversation[] = result.data || [];
      setInbox(data);
      return data;
    } catch (e) {
      console.warn('Inbox fetch failed', e);
      return [];
    }
  };

  const openConversation = async (item: Conversation) => {
    setActive(item);
    setMobileShowChat(true);
    setLoadingMessages(true);
    setError('');

    try {
      const q = new URLSearchParams({
        artisan_id: String(item.artisan_id),
      });
      if (item.product_id) {
        q.set('product_id', String(item.product_id));
      }

      const response = await fetch(`${API_BASE}/api/messages?${q.toString()}`, {
        credentials: 'include',
        headers: getHeaders(),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Conversation could not be loaded');
      }

      setMessages(result.data || []);

      // If backend returned messages with more metadata, update conversation metadata
      if (result.data && result.data.length > 0) {
        const first = result.data[0];
        setActive((prev) =>
          prev
            ? {
                ...prev,
                artisan_name: prev.artisan_name || first.artisan_name,
                product_name: prev.product_name || first.product_name,
              }
            : null
        );
      }

      // Refresh inbox list so unread badge is cleared
      loadInbox().then(() => {
        window.dispatchEvent(new Event('karigarsetu_messages_updated'));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Initialize inbox and select/stub conversation
  useEffect(() => {
    const customer = getCurrentCustomer();
    if (!customer) {
      navigate('/customer/login', {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }

    const init = async () => {
      setLoadingInbox(true);
      const items = await loadInbox();
      setLoadingInbox(false);

      if (queryArtisanId) {
        // Look for matching conversation in inbox
        const existing = items.find(
          (c) =>
            c.artisan_id === queryArtisanId &&
            (!queryProductId || c.product_id === queryProductId)
        );

        if (existing) {
          openConversation(existing);
        } else {
          // Create stub conversation for customer to start chatting
          let artisanName = queryArtisanName;
          let productName: string | undefined = undefined;

          // Fetch artisan public details if name is missing
          if (!artisanName) {
            try {
              const res = await fetch(`${API_BASE}/api/artisans/public/${queryArtisanId}`);
              const aData = await res.json();
              if (aData?.success && aData?.data?.name) {
                artisanName = aData.data.name;
              }
            } catch {
              artisanName = 'Artisan';
            }
          }

          // Fetch product details if productId is present
          if (queryProductId) {
            try {
              const pRes = await fetch(`${API_BASE}/api/products/${queryProductId}`);
              const pData = await pRes.json();
              if (pData?.success && pData?.product?.product_name) {
                productName = pData.product.product_name;
              }
            } catch {
              // ignore
            }
          }

          const stub: Conversation = {
            customer_id: customer.id,
            artisan_id: queryArtisanId,
            product_id: queryProductId || null,
            artisan_name: artisanName || 'Artisan',
            product_name: productName,
            body: '',
            unread_count: 0,
          };

          openConversation(stub);
        }
      } else if (items.length > 0 && window.innerWidth >= 768) {
        // Desktop default: open first conversation
        openConversation(items[0]);
      }
    };

    init();
  }, [queryArtisanId, queryProductId]);

  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loadingMessages]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuMessageId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!active || !draft.trim() || sending) return;

    const body = draft.trim();
    setSending(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          artisan_id: active.artisan_id,
          product_id: active.product_id || undefined,
          body,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Message could not be sent');
      }

      setMessages((prev) => [...prev, result.data]);
      setDraft('');

      // Reload inbox to update latest snippet
      await loadInbox();
      window.dispatchEvent(new Event('karigarsetu_messages_updated'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Message could not be sent';
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
      loadInbox().catch(() => {});
      window.dispatchEvent(new Event('karigarsetu_messages_updated'));
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
      loadInbox().catch(() => {});
      window.dispatchEvent(new Event('karigarsetu_messages_updated'));
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

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to={active?.product_id ? `/marketplace/products/${active.product_id}` : '/marketplace'}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0b5538] hover:underline"
          >
            <ArrowLeft size={16} />
            <span>
              {active?.product_id
                ? t.productDetails?.backToMarketplace || 'Back to Product'
                : t.nav?.backToMarketplace || 'Back to Marketplace'}
            </span>
          </Link>
        </div>

        {/* Main Inbox & Chat Container */}
        <div className="overflow-hidden rounded-3xl border border-[#dce9df] bg-white shadow-md grid md:grid-cols-[340px_1fr] min-h-[620px]">
          {/* Left Column: Conversations Inbox List */}
          <aside
            className={`border-b border-[#e8f0ea] bg-[#f7faf8] p-4 md:border-b-0 md:border-r ${
              mobileShowChat ? 'hidden md:block' : 'block'
            }`}
          >
            <div className="mb-4 flex items-center justify-between border-b border-[#e5ece7] pb-3">
              <h1 className="flex items-center gap-2 font-extrabold text-[#0b5538] text-base">
                <MessageCircle size={20} />
                <span>{t.customerMessages?.title || 'My Messages'}</span>
              </h1>
              {inbox.length > 0 && (
                <span className="text-xs font-semibold text-slate-500">
                  {inbox.length} {inbox.length === 1 ? 'chat' : 'chats'}
                </span>
              )}
            </div>

            {loadingInbox ? (
              <div className="py-16 text-center text-sm font-medium text-slate-400">
                Loading conversations…
              </div>
            ) : inbox.length === 0 ? (
              <div className="py-14 text-center px-2">
                <div className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-2xl bg-[#ebf5ee] text-[#0b5538]">
                  <MessageCircle size={22} />
                </div>
                <h3 className="font-extrabold text-sm text-[#173b2d]">
                  {t.customerMessages?.noConversations || 'No conversations yet'}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  {t.customerMessages?.noConversationsHint ||
                    'Start a conversation with an artisan from any product page or custom request.'}
                </p>
                <Link
                  to="/marketplace"
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0c4b31] hover:bg-[#08422b] text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Store size={14} />
                  <span>{t.customerMessages?.browseMarketplace || 'Explore Crafts'}</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[600px] pr-1">
                {inbox.map((item, index) => {
                  const isSelected =
                    active?.artisan_id === item.artisan_id &&
                    (active?.product_id || null) === (item.product_id || null);

                  return (
                    <button
                      key={`${item.artisan_id}-${item.product_id || 0}-${index}`}
                      type="button"
                      onClick={() => openConversation(item)}
                      className={`w-full rounded-2xl p-3.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border border-[#bedfc9] bg-white shadow-xs'
                          : 'hover:bg-white/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[#0b5538] text-[#ffd186] font-extrabold text-xs flex items-center justify-center shrink-0">
                            {item.artisan_name ? item.artisan_name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <span className="truncate text-sm font-bold text-[#173b2d]">
                            {item.artisan_name || 'Artisan'}
                          </span>
                        </div>

                        {item.unread_count ? item.unread_count > 0 && (
                          <span className="rounded-full bg-[#e87722] px-2 py-0.5 text-[10px] font-extrabold text-white shrink-0">
                            {item.unread_count} new
                          </span>
                        ) : null}
                      </div>

                      {item.product_name && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#0c4b31] truncate">
                          <Package size={12} className="text-[#e27d35] shrink-0" />
                          <span className="truncate">{item.product_name}</span>
                        </div>
                      )}

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {item.body || 'No messages yet'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Right Column: Chat History and Composer */}
          <section className={`flex flex-col min-h-[580px] ${mobileShowChat ? 'block' : 'hidden md:flex'}`}>
            {!active ? (
              <div className="m-auto text-center text-slate-500 py-16 px-4">
                <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-2xl bg-[#ebf5ee] text-[#0b5538]">
                  <MessageCircle size={26} />
                </div>
                <h3 className="font-extrabold text-[#173b2d] text-base">
                  {t.customerMessages?.selectConversation || 'Select a conversation'}
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 max-w-sm mx-auto">
                  {t.customerMessages?.selectConversationHint ||
                    'Select any artisan conversation from the left to view messages and reply.'}
                </p>
              </div>
            ) : (
              <>
                {/* Active Chat Header */}
                <header className="flex items-center justify-between border-b border-[#e8f0ea] bg-gradient-to-r from-[#f0f7f2] via-[#f7faf8] to-[#fbfdfb] px-4 py-3.5 sm:px-6">
                  <div className="flex items-center gap-3">
                    {/* Mobile Back Button to inbox list */}
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      className="md:hidden p-1.5 -ml-1 text-[#0b5538] hover:bg-emerald-50 rounded-lg cursor-pointer"
                      title={t.customerMessages?.backToConversations || 'Back to Conversations'}
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <div className="w-10 h-10 rounded-2xl bg-[#0b5538] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      <Store size={18} />
                    </div>

                    <div>
                      <h2 className="text-sm sm:text-base font-extrabold text-[#173b2d] flex items-center gap-2">
                        <span>{active.artisan_name || 'Artisan'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-[#0c4b31] font-bold">
                          Artisan
                        </span>
                      </h2>

                      {active.product_name ? (
                        <Link
                          to={active.product_id ? `/marketplace/products/${active.product_id}` : '#'}
                          className="text-[11px] font-semibold text-[#0c4b31] hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Package size={12} className="text-[#e27d35]" />
                          <span className="truncate max-w-[240px] sm:max-w-md">{active.product_name}</span>
                        </Link>
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          {t.customerMessages?.directArtisanChat || 'Direct Artisan Chat'}
                        </p>
                      )}
                    </div>
                  </div>
                </header>

                {/* Messages Canvas */}
                <div
                  className="relative flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-8 bg-gradient-to-b from-[#f9fbf8] via-[#f7f9f6] to-[#f4f7f3]"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #dbe4dd 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  {loadingMessages ? (
                    <div className="pt-20 text-center text-sm font-medium text-slate-500">
                      Loading messages…
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="pt-20 text-center">
                      <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-full bg-[#ebf5ee] text-[#0b5538]">
                        <MessageCircle size={26} />
                      </div>
                      <h3 className="font-extrabold text-[#173b2d]">
                        {t.customRequests?.chatWithArtisan || 'Start a conversation'}
                      </h3>
                      <p className="mx-auto mt-1.5 max-w-sm text-xs text-slate-500">
                        Ask about this handmade craft, customizations, materials, or order details.
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
                              {/* Message Content or Placeholder */}
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
                                  className="rounded-full bg-white/95 p-1.5 text-slate-600 shadow-md border border-slate-200/80 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
                                  title="Message options"
                                  aria-label="Message options"
                                >
                                  <MoreVertical size={14} />
                                </button>

                                {/* Dropdown Menu */}
                                {isMenuOpen && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className={`absolute z-40 top-8 ${
                                      isMe ? 'right-0 sm:left-0 sm:right-auto' : 'left-0 sm:right-0 sm:left-auto'
                                    } w-44 rounded-2xl border border-[#dce8df] bg-white py-1.5 shadow-xl text-xs`}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteForMe(message.id, e)}
                                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-[#f4f8f5] transition-colors cursor-pointer"
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
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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

                {error && (
                  <p className="mx-5 my-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {error}
                  </p>
                )}

                {/* Chat Composer */}
                <form
                  onSubmit={sendReply}
                  className="flex items-center gap-2 sm:gap-3 border-t border-[#e8f0ea] bg-[#fafcfb] p-3 sm:p-4"
                >
                  <div className="hidden sm:grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf6f0] text-[#0b5538]">
                    <UserRound size={18} />
                  </div>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={1500}
                    placeholder={t.customerMessages?.writeMessage || 'Write a message to artisan…'}
                    className="min-w-0 flex-1 rounded-xl border border-[#cfe0d5] bg-white px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm outline-none transition-colors focus:border-[#0b5538] focus:ring-1 focus:ring-[#0b5538]"
                  />
                  <VoiceInputButton
                    language={language}
                    onTranscript={(transcript) => {
                      setDraft((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
                    }}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-[#0b5538] px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition-opacity hover:bg-[#08422b] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed shrink-0"
                  >
                    <Send size={16} />
                    <span className="hidden sm:inline">
                      {sending ? 'Sending…' : t.customerMessages?.send || 'Send'}
                    </span>
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
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
                {t.chat?.deleteForEveryoneConfirmDesc ||
                  'This message will be removed for both you and the other participant.'}
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {t.chat?.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteForEveryone}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 cursor-pointer"
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
