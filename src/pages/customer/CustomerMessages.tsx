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
  Search,
  ExternalLink,
  Paperclip,
  CheckCheck,
} from 'lucide-react';
import { MarketplaceNavbar } from '../../components/marketplace/MarketplaceNavbar';
import { API_BASE } from '../../services/apiConfig';
import { getCurrentCustomer } from '../../services/customerAuth';
import { useLanguage } from '../../i18n/LanguageContext';
import { VoiceInputButton } from '../../components/common/VoiceInputButton';
import { ArtisanRoomDecorations } from '../../components/common/ArtisanRoomDecorations';
import { ChatCanvasBackground } from '../../components/common/ChatCanvasBackground';

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
  const [searchQuery, setSearchQuery] = useState('');
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isUserNearBottomRef = useRef<boolean>(true);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Consider user at bottom if within 150px
    isUserNearBottomRef.current = distanceFromBottom < 150;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current;
    if (el) {
      if (behavior === 'auto') {
        el.scrollTop = el.scrollHeight;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
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

  // Auto-scroll to bottom immediately when opening/switching conversation
  useEffect(() => {
    if (active) {
      isUserNearBottomRef.current = true;
      const timer = setTimeout(() => scrollToBottom('auto'), 50);
      return () => clearTimeout(timer);
    }
  }, [active?.artisan_id, active?.product_id]);

  // When messages arrive or change: only auto-scroll if user is already near the bottom
  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      if (isUserNearBottomRef.current) {
        scrollToBottom('smooth');
      }
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

      // When sending own reply, always scroll to bottom
      isUserNearBottomRef.current = true;
      setTimeout(() => scrollToBottom('smooth'), 50);

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

  const displayedInbox = inbox.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.artisan_name && c.artisan_name.toLowerCase().includes(q)) ||
      (c.product_name && c.product_name.toLowerCase().includes(q)) ||
      (c.body && c.body.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative h-screen max-h-screen flex flex-col bg-[#faf5ed] text-[#173b2d] overflow-hidden">
      {/* Handcrafted Studio Environment (Outside ambient decor) */}
      <ArtisanRoomDecorations />

      {/* Top Navbar - Fixed flex-shrink-0 */}
      <div className="relative z-20 flex-shrink-0">
        <MarketplaceNavbar searchQuery="" onSearchChange={() => {}} selectedCategory="All" onSelectCategory={() => {}} />
      </div>

      {/* Main Messaging Viewport - Fixed like WhatsApp Web */}
      <main className="relative z-10 flex-1 min-h-0 w-full max-w-7xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2.5 flex flex-col overflow-hidden">
        {/* Navigation Breadcrumb - Compact flex-shrink-0 */}
        <div className="flex-shrink-0 mb-1.5 flex items-center justify-between">
          <Link
            to={active?.product_id ? `/marketplace/products/${active.product_id}` : '/marketplace'}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c4b31] hover:underline"
          >
            <ArrowLeft size={15} />
            <span>
              {active?.product_id
                ? t.productDetails?.backToMarketplace || 'Back to Product'
                : t.nav?.backToMarketplace || 'Back to Marketplace'}
            </span>
          </Link>
        </div>

        {/* Two-Column WhatsApp Container - Never grows or stretches page */}
        <div className="flex-1 min-h-0 w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-[#ded5c5] bg-[#fffaf2] shadow-2xl flex flex-col md:flex-row">
          {/* Left Column: Conversations Inbox List */}
          <aside
            className={`w-full md:w-[340px] lg:w-[380px] flex-shrink-0 flex flex-col h-full min-h-0 border-b md:border-b-0 md:border-r border-[#e8dfd1] bg-[#fdfbf7] ${
              mobileShowChat ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Sidebar Fixed Header */}
            <div className="flex-shrink-0 p-3.5 border-b border-[#e6dfd1] bg-[#faf6ef]">
              <div className="mb-2.5 flex items-center justify-between">
                <h1 className="flex items-center gap-2 font-bold font-serif text-[#16382a] text-base sm:text-lg">
                  <MessageCircle size={20} className="text-[#0c4b31]" />
                  <span>{t.customerMessages?.title || 'My Messages'}</span>
                </h1>
                {inbox.length > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#ede7dc] text-[#5c5243]">
                    {inbox.length} {inbox.length === 1 ? 'chat' : 'chats'}
                  </span>
                )}
              </div>

              {/* Search conversations input matching Reference 1 */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8273]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-xl bg-[#eee7db]/80 border border-[#ded5c5] pl-9 pr-3 py-2 text-xs text-[#1c382b] placeholder-[#8c8273] focus:outline-none focus:border-[#0c4b31] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Conversation list: flex-1 min-h-0 overflow-y-auto */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-2.5 scrollbar-thin">
              {loadingInbox ? (
                <div className="py-16 text-center text-sm font-medium text-[#8c8273]">
                  Loading conversations…
                </div>
              ) : displayedInbox.length === 0 ? (
                <div className="py-14 text-center px-2">
                  <div className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-2xl bg-[#ede7dc] text-[#0c4b31]">
                    <MessageCircle size={22} />
                  </div>
                  <h3 className="font-bold text-sm text-[#173b2d]">
                    {searchQuery
                      ? 'No matching conversations'
                      : t.customerMessages?.noConversations || 'No conversations yet'}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#7c7263] leading-relaxed">
                    {searchQuery
                      ? 'Try a different search term or artisan name.'
                      : t.customerMessages?.noConversationsHint ||
                        'Start a conversation with an artisan from any product page or custom request.'}
                  </p>
                  {!searchQuery && (
                    <Link
                      to="/marketplace"
                      className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0c4b31] hover:bg-[#08422b] text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <Store size={14} />
                      <span>{t.customerMessages?.browseMarketplace || 'Explore Crafts'}</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {displayedInbox.map((item, index) => {
                    const isSelected =
                      active?.artisan_id === item.artisan_id &&
                      (active?.product_id || null) === (item.product_id || null);

                    return (
                      <button
                        key={`${item.artisan_id}-${item.product_id || 0}-${index}`}
                        type="button"
                        onClick={() => openConversation(item)}
                        className={`w-full rounded-xl p-3 text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-l-4 border-l-[#b86b3e] border border-[#a8cfb6] bg-[#edf4ee] shadow-xs'
                            : 'border border-[#eee7da] bg-[#ffffff] hover:bg-[#faf7f2] hover:border-[#ded5c5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative">
                              <div className="w-9 h-9 rounded-full bg-[#0c4b31] text-[#fde047] font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {item.artisan_name ? item.artisan_name.charAt(0).toUpperCase() : 'A'}
                              </div>
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate text-xs sm:text-sm font-bold text-[#173b2d]">
                                  {item.artisan_name || 'Artisan'}
                                </span>
                                {item.created_at && (
                                  <span className="text-[10px] text-[#8c8273] shrink-0 font-medium">
                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              {item.product_name && (
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0c4b31] truncate">
                                  <Package size={11} className="text-[#d97706] shrink-0" />
                                  <span className="truncate">{item.product_name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {item.unread_count ? item.unread_count > 0 && (
                            <span className="rounded-full bg-[#ea580c] px-2 py-0.5 text-[10px] font-extrabold text-white shrink-0 shadow-2xs">
                              {item.unread_count} new
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-[#78716c] flex-1">
                            {item.body || 'No messages yet'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="flex-shrink-0 p-2.5 border-t border-[#ede7dc] bg-[#f7f2e9] text-center text-[11px] text-[#7d705c] font-medium hidden sm:block">
              Craft People Stronger Together
            </div>
          </aside>

          {/* Right Column: Chat History and Composer */}
          <section className={`flex-1 min-h-0 flex flex-col h-full overflow-hidden ${mobileShowChat ? 'flex' : 'hidden md:flex'}`}>
            {!active ? (
              <div className="m-auto text-center text-[#7c7263] py-16 px-4">
                <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-2xl bg-[#ede7dc] text-[#0c4b31]">
                  <MessageCircle size={26} />
                </div>
                <h3 className="font-serif font-bold text-[#173b2d] text-lg">
                  {t.customerMessages?.selectConversation || 'Select a conversation'}
                </h3>
                <p className="mt-1.5 text-xs text-[#8c8273] max-w-sm mx-auto">
                  {t.customerMessages?.selectConversationHint ||
                    'Select any artisan conversation from the left to view messages and reply.'}
                </p>
              </div>
            ) : (
              <>
                {/* 1. TOP HEADER (Fixed, stays visible at top) */}
                <header className="flex-shrink-0 flex items-center justify-between border-b border-[#e8e2d5] bg-[#fdfbf7] px-4 py-3 sm:px-6 shadow-2xs z-20">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button to inbox list */}
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      className="md:hidden p-1.5 -ml-1 text-[#0c4b31] hover:bg-[#edf4ee] rounded-lg cursor-pointer shrink-0"
                      title={t.customerMessages?.backToConversations || 'Back to Conversations'}
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#0c4b31] text-[#fde047] flex items-center justify-center font-bold text-sm shadow-xs">
                        {active.artisan_name ? active.artisan_name.charAt(0).toUpperCase() : <Store size={18} />}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-bold font-serif text-[#173b2d] flex items-center gap-2 truncate">
                        <span className="truncate">{active.artisan_name || 'Artisan'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#edf4ee] text-[#0c4b31] border border-[#bedfc9] font-bold shrink-0">
                          Artisan
                        </span>
                      </h2>

                      {active.product_name ? (
                        <div className="text-[11px] font-medium text-[#496555] flex items-center gap-1 mt-0.5 truncate">
                          <Package size={12} className="text-[#d97706] shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-xs">{active.product_name}</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#7c7263]">
                          {t.customerMessages?.directArtisanChat || 'Direct Artisan Chat'}
                        </p>
                      )}
                    </div>
                  </div>

                  {active.product_id && (
                    <Link
                      to={`/marketplace/products/${active.product_id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ded5c5] bg-white hover:bg-[#faf7f2] text-[#173b2d] text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 ml-2"
                    >
                      <span>View Product</span>
                      <ExternalLink size={13} className="text-[#0c4b31]" />
                    </Link>
                  )}
                </header>

                {/* 2. CHAT BODY - Fixed Viewport with Fixed Background and Scrolling Messages Layer */}
                <div className="relative flex-1 min-h-0 overflow-hidden">
                  {/* Fixed Handcrafted Canvas Background (Visual target from reference image) */}
                  <ChatCanvasBackground />

                  {/* Messages Scroll Layer: ONLY this scrolls vertically */}
                  <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-3 scrollbar-thin"
                  >
                    {/* Date separator badge matching WhatsApp reference */}
                    <div className="flex justify-center my-1.5">
                      <span className="rounded-lg bg-[#f0eae1]/90 border border-[#ded5c5] px-3.5 py-1 text-[11px] font-bold text-[#6d614e] shadow-2xs backdrop-blur-xs">
                        Today
                      </span>
                    </div>

                    {loadingMessages ? (
                      <div className="pt-20 text-center text-sm font-medium text-[#8c8273]">
                        Loading messages…
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="pt-16 pb-12 text-center flex flex-col items-center justify-center">
                        <div className="relative mb-5 w-24 h-20 flex items-center justify-center">
                          <span className="absolute -top-1 left-2 w-1 h-2 bg-[#d97706]/40 rounded-full rotate-[-25deg]"></span>
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-1.5 h-2 bg-[#d97706]/50 rounded-full"></span>
                          <span className="absolute -top-1 right-2 w-1 h-2 bg-[#d97706]/40 rounded-full rotate-[25deg]"></span>

                          <div className="absolute top-0 left-1 w-14 h-12 rounded-2xl bg-[#86a789] shadow-sm flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/70 mx-0.5"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/70 mx-0.5"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/70 mx-0.5"></span>
                          </div>

                          <div className="absolute bottom-0 right-1 w-14 h-12 rounded-2xl bg-[#eae2d3] border border-[#d8cdbc] shadow-md flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#52493c] mx-0.5"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#52493c] mx-0.5"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#52493c] mx-0.5"></span>
                          </div>
                        </div>

                        <h3 className="font-serif font-bold text-2xl text-[#18392b]">
                          {t.customRequests?.chatWithArtisan || 'Chat with Artisan'}
                        </h3>
                        <p className="mx-auto mt-2 max-w-sm text-xs sm:text-sm text-[#6b6255] leading-relaxed">
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
                            className={`group relative flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} py-0.5`}
                          >
                            {/* Artisan Avatar for received messages */}
                            {!isMe && (
                              <div className="w-7 h-7 rounded-full bg-[#0c4b31] text-[#fde047] flex items-center justify-center text-[11px] font-bold shrink-0 shadow-2xs mb-0.5">
                                {active.artisan_name ? active.artisan_name.charAt(0).toUpperCase() : 'A'}
                              </div>
                            )}

                            <div className={`relative max-w-[85%] sm:max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                              <div
                                className={`relative rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm transition-all shadow-2xs ${
                                  isMe
                                    ? isDeletedEveryone
                                      ? 'rounded-br-xs border border-[#ded7ca] bg-[#f0eae1] text-[#78716c] italic'
                                      : 'rounded-br-xs bg-[#daf1de] text-[#0f3d2a] border border-[#b8e2c0]'
                                    : isDeletedEveryone
                                    ? 'rounded-bl-xs border border-[#ede7dc] bg-[#f7f3ec] text-[#78716c] italic'
                                    : 'rounded-bl-xs border border-[#eee6d8] bg-white/95 text-[#1c382b]'
                                }`}
                              >
                                {/* Message Content or Placeholder */}
                                <div className="flex items-start gap-2">
                                  {isDeletedEveryone && <Ban size={14} className="mt-0.5 shrink-0 opacity-60" />}
                                  <p className="leading-relaxed break-words whitespace-pre-wrap">
                                    {isDeletedEveryone
                                      ? isMe
                                        ? t.chat?.youDeletedMessage || 'You deleted this message'
                                        : t.chat?.thisMessageDeleted || 'This message was deleted'
                                      : message.body}
                                  </p>
                                </div>

                                {/* Timestamp + Double Check */}
                                <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px]">
                                  <span className={isMe && !isDeletedEveryone ? 'text-[#326e46]' : 'text-[#8c8273]'}>
                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isMe && !isDeletedEveryone && (
                                    <CheckCheck size={13} className="text-[#15803d]" />
                                  )}
                                </div>
                              </div>

                              {/* 3-Dot Action Menu Button */}
                              {!isDeletedEveryone && (
                                <div
                                  className={`absolute top-2 ${isMe ? '-left-8' : '-right-8'} ${
                                    isMenuOpen ? 'opacity-100 z-30' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                                  } transition-opacity`}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuMessageId(isMenuOpen ? null : message.id);
                                    }}
                                    className="rounded-full bg-white/95 p-1.5 text-[#5c5446] shadow-md border border-[#e4ddd0] hover:bg-white hover:text-[#173b2d] transition-colors cursor-pointer"
                                    title="Message options"
                                    aria-label="Message options"
                                  >
                                    <MoreVertical size={13} />
                                  </button>

                                  {/* Dropdown Menu */}
                                  {isMenuOpen && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className={`absolute z-40 top-8 ${
                                        isMe ? 'right-0 sm:left-0 sm:right-auto' : 'left-0 sm:right-0 sm:left-auto'
                                      } w-44 rounded-2xl border border-[#ded6c7] bg-white py-1.5 shadow-xl text-xs`}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteForMe(message.id, e)}
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-[#faf7f2] transition-colors cursor-pointer"
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

                            {/* Customer Avatar for sent messages */}
                            {isMe && (
                              <div className="w-7 h-7 rounded-full bg-[#1b4332] text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-2xs mb-0.5">
                                <UserRound size={13} />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {error && (
                  <p className="mx-4 my-1.5 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">
                    {error}
                  </p>
                )}

                {/* 3. BOTTOM COMPOSER (Fixed at bottom, never scrolls) */}
                <form
                  onSubmit={sendReply}
                  className="flex-shrink-0 flex items-center gap-2 sm:gap-2.5 border-t border-[#e8e2d5] bg-[#faf7f2] px-3 sm:px-4 py-2.5 sm:py-3 z-20"
                >
                  <button
                    type="button"
                    className="p-2 text-[#7c7263] hover:text-[#0c4b31] hover:bg-[#ede7dc] rounded-full transition-colors cursor-pointer shrink-0"
                    title="Attachment"
                  >
                    <Paperclip size={18} />
                  </button>

                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={1500}
                    placeholder={t.customerMessages?.writeMessage || 'Type a message...'}
                    className="min-w-0 flex-1 rounded-full border border-[#ded7c8] bg-white px-4 py-2.5 text-xs sm:text-sm text-[#18392b] placeholder-[#8c8273] outline-none transition-colors focus:border-[#0c4b31] focus:ring-1 focus:ring-[#0c4b31]"
                  />

                  <VoiceInputButton
                    theme="light"
                    language={language}
                    onTranscript={(transcript) => {
                      setDraft((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
                    }}
                    disabled={sending}
                  />

                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="w-10 h-10 rounded-full bg-[#0c4b31] hover:bg-[#083824] text-white flex items-center justify-center shadow-md transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shrink-0"
                    title={t.customerMessages?.send || 'Send'}
                  >
                    <Send size={16} className="-ml-0.5" />
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
