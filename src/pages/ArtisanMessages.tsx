import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  Send,
  UserRound,
  MoreVertical,
  Trash2,
  Ban,
  Search,
  Package,
  Paperclip,
  CheckCheck,
} from 'lucide-react';
import { API_BASE } from '../services/apiConfig';
import { useLanguage } from '../i18n/LanguageContext';
import { VoiceInputButton } from '../components/common/VoiceInputButton';
import { ChatCanvasBackground } from '../components/common/ChatCanvasBackground';

type Conversation = {
  customer_id: number;
  artisan_id: number;
  product_id?: number;
  customer_name: string;
  product_name?: string;
  body: string;
  unread_count: number;
};

type ChatMessage = {
  id: number;
  body: string;
  sender_role: 'customer' | 'artisan';
  created_at?: string;
  is_deleted_everyone?: boolean;
};

export const ArtisanMessages: React.FC = () => {
  const { t, language } = useLanguage();
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  // Mobile navigation between conversation list and active chat
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Contextual actions & deletion modal state
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

  const loadInbox = async (): Promise<Conversation[]> => {
    const response = await fetch(`${API_BASE}/api/messages/inbox`, {
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Inbox load failed.');
    }

    const items: Conversation[] = result.data || [];
    setInbox(items);
    return items;
  };

  const openConversation = async (item: Conversation) => {
    setActive(item);
    setError('');
    setMobileShowChat(true);

    try {
      const params = new URLSearchParams({
        artisan_id: String(item.artisan_id),
        customer_id: String(item.customer_id),
      });

      if (item.product_id) {
        params.set('product_id', String(item.product_id));
      }

      const response = await fetch(
        `${API_BASE}/api/messages?${params.toString()}`,
        { credentials: 'include' }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Conversation load failed.');
      }

      setMessages(result.data || []);
      loadInbox().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading conversation.');
    }
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!active || !draft.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: active.customer_id,
          product_id: active.product_id,
          body: draft.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Message could not be sent.');
      }

      setMessages((previous) => [...previous, result.data]);
      setDraft('');

      // Auto-scroll to bottom immediately when user sends a reply
      isUserNearBottomRef.current = true;
      setTimeout(() => scrollToBottom('smooth'), 50);

      loadInbox().catch(() => {});
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error sending message.';
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleDeleteForMe = async (messageId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuMessageId(null);
    try {
      const response = await fetch(`${API_BASE}/api/messages/${messageId}?scope=me`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Failed to delete message');
      setMessages((old) => old.filter((m) => m.id !== messageId));
      loadInbox().catch(() => {});
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
      showToast(t.chat?.deleteForEveryone || 'Message deleted for everyone');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete for everyone';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadInbox().then((items) => {
      // Desktop default: open first conversation if available
      if (items && items.length > 0 && window.innerWidth >= 768 && !active) {
        openConversation(items[0]);
      }
    }).catch((err) => setError(err.message));
  }, []);

  // Auto-scroll to bottom immediately when switching active conversation
  useEffect(() => {
    if (active) {
      isUserNearBottomRef.current = true;
      const timer = setTimeout(() => scrollToBottom('auto'), 50);
      return () => clearTimeout(timer);
    }
  }, [active?.customer_id, active?.product_id]);

  // When messages arrive or change: only auto-scroll if user is already near bottom
  useEffect(() => {
    if (messages.length > 0 && isUserNearBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuMessageId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const displayedInbox = inbox.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
      (c.product_name && c.product_name.toLowerCase().includes(q)) ||
      (c.body && c.body.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative h-screen max-h-screen flex flex-col bg-transparent text-[#173b2d] overflow-hidden">
      {/* Main Messaging Viewport - Fixed like WhatsApp Web */}
      <main className="relative z-10 flex-1 min-h-0 w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex flex-col overflow-hidden">
        {/* Navigation Breadcrumb - Compact flex-shrink-0 */}
        <div className="flex-shrink-0 mb-1.5 flex items-center justify-between">
          <Link
            to="/artisan/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0c4b31] hover:underline"
          >
            <ArrowLeft size={16} />
            <span>{t.artisan?.dashboardTitle || 'Back to Dashboard'}</span>
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
                <h1 className="flex items-center gap-2 font-serif font-bold text-[#16382a] text-base sm:text-lg">
                  <MessageCircle size={20} className="text-[#0c4b31]" />
                  <span>{t.artisan?.buyerMessagesTitle || 'Buyer Messages'}</span>
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
              {displayedInbox.length === 0 ? (
                <div className="py-14 text-center px-2">
                  <div className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-2xl bg-[#ede7dc] text-[#0c4b31]">
                    <MessageCircle size={22} />
                  </div>
                  <h3 className="font-bold text-sm text-[#173b2d]">
                    {searchQuery ? 'No matching conversations' : t.artisan.noBuyerMessages}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#7c7263]">
                    {searchQuery ? 'Try a different buyer name.' : 'Inquiries from buyers will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {displayedInbox.map((item, index) => {
                    const isSelected =
                      active?.customer_id === item.customer_id &&
                      (active?.product_id || null) === (item.product_id || null);

                    return (
                      <button
                        key={`${item.customer_id}-${item.product_id || index}`}
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
                                {item.customer_name ? item.customer_name.charAt(0).toUpperCase() : 'B'}
                              </div>
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="truncate text-xs sm:text-sm font-bold text-[#173b2d] block">
                                {item.customer_name}
                              </span>
                              {item.product_name && (
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0c4b31] truncate">
                                  <Package size={11} className="text-[#d97706] shrink-0" />
                                  <span className="truncate">{item.product_name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {item.unread_count > 0 && (
                            <span className="rounded-full bg-[#ea580c] px-2 py-0.5 text-[10px] font-extrabold text-white shrink-0 shadow-2xs">
                              {item.unread_count} new
                            </span>
                          )}
                        </div>

                        <p className="mt-1 truncate text-xs text-[#78716c]">
                          {item.body || 'No messages yet'}
                        </p>
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
                  <UserRound size={26} />
                </div>
                <h3 className="font-serif font-bold text-[#173b2d] text-lg">{t.artisan.selectBuyerConversation}</h3>
                <p className="mt-1.5 text-xs text-[#8c8273]">Select any conversation from the list to view and reply.</p>
              </div>
            ) : (
              <>
                {/* 1. TOP HEADER (Fixed, stays visible at top) */}
                <header className="flex-shrink-0 flex items-center justify-between border-b border-[#e8e2d5] bg-[#fdfbf7] px-4 py-3 sm:px-6 shadow-2xs z-20">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Mobile Back Button to buyer list */}
                    <button
                      type="button"
                      onClick={() => setMobileShowChat(false)}
                      className="md:hidden p-1.5 -ml-1 text-[#0c4b31] hover:bg-[#edf4ee] rounded-lg cursor-pointer shrink-0"
                      title="Back to Conversations"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#0c4b31] text-[#fde047] flex items-center justify-center font-bold text-sm shadow-xs">
                        {active.customer_name ? active.customer_name.charAt(0).toUpperCase() : <UserRound size={18} />}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-bold font-serif text-[#173b2d] flex items-center gap-2 truncate">
                        <span className="truncate">{active.customer_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#edf4ee] text-[#0c4b31] border border-[#bedfc9] font-bold shrink-0">
                          Buyer
                        </span>
                      </h2>
                      <p className="text-xs font-medium text-[#496555] flex items-center gap-1 mt-0.5 truncate">
                        {active.product_name && <Package size={12} className="text-[#d97706] shrink-0" />}
                        <span className="truncate max-w-[200px] sm:max-w-xs">{active.product_name || t.artisan.productEnquiry}</span>
                      </p>
                    </div>
                  </div>
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

                    {messages.length === 0 ? (
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
                          Chat with Buyer
                        </h3>
                        <p className="mx-auto mt-2 max-w-sm text-xs sm:text-sm text-[#6b6255] leading-relaxed">
                          Respond to questions about craftsmanship, customizations, or order details.
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isMe = message.sender_role === 'artisan';
                        const isDeletedEveryone = Boolean(message.is_deleted_everyone);
                        const isMenuOpen = activeMenuMessageId === message.id;

                        return (
                          <div
                            key={message.id}
                            className={`group relative flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} py-0.5`}
                          >
                            {/* Customer Avatar for received messages */}
                            {!isMe && (
                              <div className="w-7 h-7 rounded-full bg-[#1b4332] text-[#fde047] flex items-center justify-center text-[11px] font-bold shrink-0 shadow-2xs mb-0.5">
                                <UserRound size={13} />
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
                                {/* Message Body or Placeholder */}
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
                                  {message.created_at && (
                                    <span className={isMe && !isDeletedEveryone ? 'text-[#326e46]' : 'text-[#8c8273]'}>
                                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
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
                                      className={`absolute z-40 top-8 ${isMe ? 'right-0 sm:left-0 sm:right-auto' : 'left-0 sm:right-0 sm:left-auto'} w-44 rounded-2xl border border-[#ded6c7] bg-white py-1.5 shadow-xl text-xs`}
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

                            {/* Artisan Avatar for sent messages */}
                            {isMe && (
                              <div className="w-7 h-7 rounded-full bg-[#0c4b31] text-[#fde047] flex items-center justify-center text-[11px] font-bold shrink-0 shadow-2xs mb-0.5">
                                <span>A</span>
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
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={t.artisan?.replyPlaceholder || 'Type a reply...'}
                    className="min-w-0 flex-1 rounded-full border border-[#ded7c8] bg-white px-4 py-2.5 text-xs sm:text-sm text-[#18392b] placeholder-[#8c8273] outline-none transition-colors focus:border-[#0c4b31] focus:ring-1 focus:ring-[#0c4b31]"
                  />

                  <VoiceInputButton
                    theme="light"
                    language={language}
                    onTranscript={(transcript) => {
                      setDraft((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="w-10 h-10 rounded-full bg-[#0c4b31] hover:bg-[#083824] text-white flex items-center justify-center shadow-md transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shrink-0"
                    title="Send"
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