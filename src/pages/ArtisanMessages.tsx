import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, UserRound, MoreVertical, Trash2, Ban, Search, Package } from 'lucide-react';
import { API_BASE } from '../services/apiConfig';
import { useLanguage } from '../i18n/LanguageContext';
import { VoiceInputButton } from '../components/common/VoiceInputButton';
import { ArtisanRoomDecorations } from '../components/common/ArtisanRoomDecorations';

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

  // Contextual actions & deletion modal state
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

  const loadInbox = async () => {
    const response = await fetch(`${API_BASE}/api/messages/inbox`, {
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Inbox load করা যায়নি।');
    }

    setInbox(result.data || []);
  };

  const openConversation = async (item: Conversation) => {
    setActive(item);
    setError('');

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
        throw new Error(result.message || 'Conversation load করা যায়নি।');
      }

      setMessages(result.data || []);
      loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'সমস্যা হয়েছে।');
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
        throw new Error(result.message || 'Message পাঠানো যায়নি।');
      }

      setMessages((previous) => [...previous, result.data]);
      setDraft('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'সমস্যা হয়েছে।';
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
    loadInbox().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
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
    <main className="relative min-h-screen bg-[#faf5ed] px-4 py-8 text-[#173b2d] overflow-x-hidden">
      {/* Handcrafted Studio Environment (Hanging lamp, potted plant, pottery, sunlight) */}
      <ArtisanRoomDecorations />

      <div className="relative z-10 mx-auto max-w-6xl">
        <Link
          to="/artisan/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#0c4b31] hover:underline"
        >
          <ArrowLeft size={18} />
          {t.artisan.dashboardTitle}
        </Link>

        <div className="grid overflow-hidden rounded-3xl border border-[#e6dfd1] bg-[#fbf9f5]/95 backdrop-blur-xs shadow-xl md:grid-cols-[330px_1fr] min-h-[640px]">
          <aside className="border-b border-[#e9e3d6] bg-[#f7f3eb] p-4 md:border-b-0 md:border-r md:border-[#e9e3d6]">
            <div className="mb-3.5 flex items-center justify-between border-b border-[#e6dfd1] pb-3">
              <h1 className="flex items-center gap-2 font-serif font-bold text-[#16382a] text-lg">
                <MessageCircle size={22} className="text-[#0c4b31]" />
                <span>{t.artisan.buyerMessagesTitle}</span>
              </h1>
              {inbox.length > 0 && (
                <span className="text-xs font-semibold text-[#7c7263]">
                  {inbox.length} {inbox.length === 1 ? 'chat' : 'chats'}
                </span>
              )}
            </div>

            {/* Search conversations input matching Reference 1 */}
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8273]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl bg-[#eee7db]/80 border border-[#ded5c5] pl-9 pr-3 py-2 text-xs text-[#1c382b] placeholder-[#8c8273] focus:outline-none focus:border-[#0c4b31] focus:bg-white transition-colors"
              />
            </div>

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
              <div className="space-y-1.5 overflow-y-auto max-h-[600px] pr-1">
                {displayedInbox.map((item, index) => {
                  const isSelected = active?.customer_id === item.customer_id && active?.product_id === item.product_id;
                  return (
                    <button
                      key={`${item.customer_id}-${item.product_id || index}`}
                      type="button"
                      onClick={() => openConversation(item)}
                      className={`w-full rounded-2xl p-3.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border border-[#a8cfb6] bg-[#edf4ee] shadow-xs'
                          : 'border border-[#eee7da] bg-[#ffffff] hover:bg-[#faf7f2] hover:border-[#ded5c5]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#0c4b31] text-[#fde047] font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {item.customer_name ? item.customer_name.charAt(0).toUpperCase() : 'B'}
                          </div>
                          <span className="truncate text-sm font-bold text-[#173b2d]">{item.customer_name}</span>
                        </div>

                        {item.unread_count > 0 && (
                          <span className="rounded-full bg-[#ea580c] px-2 py-0.5 text-[10px] font-extrabold text-white shrink-0 shadow-2xs">
                            {item.unread_count} new
                          </span>
                        )}
                      </div>

                      {item.product_name && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#0c4b31] truncate">
                          <Package size={12} className="text-[#d97706] shrink-0" />
                          <span className="truncate">{item.product_name}</span>
                        </div>
                      )}

                      <p className="mt-1 truncate text-xs text-[#78716c]">
                        {item.body || 'No messages yet'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="flex min-h-[580px] flex-col">
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
                <header className="flex items-center justify-between border-b border-[#e8e2d5] bg-[#fdfbf7] px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0c4b31] text-[#fde047] flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {active.customer_name ? active.customer_name.charAt(0).toUpperCase() : <UserRound size={18} />}
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold font-serif text-[#173b2d] flex items-center gap-2">
                        <span>{active.customer_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#edf4ee] text-[#0c4b31] border border-[#bedfc9] font-bold">
                          Buyer
                        </span>
                      </h2>
                      <p className="text-xs font-medium text-[#496555] flex items-center gap-1 mt-0.5">
                        {active.product_name && <Package size={12} className="text-[#d97706] shrink-0" />}
                        <span className="truncate max-w-[200px] sm:max-w-xs">{active.product_name || t.artisan.productEnquiry}</span>
                      </p>
                    </div>
                  </div>
                </header>

                {/* Messages Canvas - Warm Handcrafted Paper & Subtle Artisan Pattern */}
                <div
                  className="relative flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-8 bg-[#fdfbf7]"
                  style={{
                    backgroundImage: `radial-gradient(circle, #e2dcd0 1px, transparent 1px), url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239c8d76' fill-opacity='0.04' fill-rule='evenodd'%3E%3Cpath d='M30 30c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10zm-20 0c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10-10-4.477-10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundSize: '24px 24px, 120px 120px',
                  }}
                >
                  {/* Canvas Corner Leaf/Botanical Branch Motif (Reference 2) */}
                  <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="pointer-events-none absolute top-1 left-1 w-24 sm:w-32 h-24 sm:h-32 opacity-25 z-0"
                  >
                    <path d="M0 0 C25 20, 50 55, 75 90" stroke="#71866e" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M20 18 C10 24, 12 36, 26 38 C34 34, 30 22, 20 18 Z" fill="#849b81" />
                    <path d="M38 40 C28 48, 30 60, 44 62 C52 56, 48 44, 38 40 Z" fill="#71876e" />
                    <path d="M56 64 C48 72, 50 84, 62 85 C70 80, 66 68, 56 64 Z" fill="#849b81" />
                    <circle cx="28" cy="22" r="2" fill="#d97706" opacity="0.7" />
                    <circle cx="46" cy="45" r="2" fill="#d97706" opacity="0.7" />
                  </svg>

                  {/* Canvas Corner Indian Geometric / Diamond Block Motif (Reference 2) */}
                  <svg
                    viewBox="0 0 80 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="pointer-events-none absolute top-2 right-2 w-16 sm:w-20 h-16 sm:h-20 opacity-20 z-0"
                  >
                    <path d="M40 5 L75 40 L40 75 L5 40 Z" stroke="#8d7456" strokeWidth="1" strokeDasharray="2 2" fill="none" />
                    <path d="M40 18 L62 40 L40 62 L18 40 Z" stroke="#8d7456" strokeWidth="1" fill="none" />
                    <circle cx="40" cy="40" r="4" fill="#c46a36" opacity="0.6" />
                    <circle cx="40" cy="18" r="2" fill="#8d7456" />
                    <circle cx="62" cy="40" r="2" fill="#8d7456" />
                    <circle cx="40" cy="62" r="2" fill="#8d7456" />
                    <circle cx="18" cy="40" r="2" fill="#8d7456" />
                  </svg>

                  {/* Canvas Bottom-Left Terracotta Pot & Clay Bowl (Reference 2) */}
                  <svg
                    viewBox="0 0 110 110"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="pointer-events-none absolute bottom-3 left-3 w-24 sm:w-28 h-24 sm:h-28 opacity-25 z-0"
                  >
                    <path
                      d="M45 40 C45 28, 65 28, 65 40 C78 55, 82 85, 70 98 C58 102, 42 102, 30 98 C18 85, 22 55, 45 40 Z"
                      fill="#d47945"
                    />
                    <ellipse cx="55" cy="38" rx="12" ry="4" fill="#e89665" />
                    <ellipse cx="55" cy="37" rx="9" ry="2.5" fill="#a44b1d" />
                    <path d="M30 65 Q 55 72 80 65" stroke="#f6c09b" strokeWidth="1.2" fill="none" opacity="0.8" />
                    <path d="M32 78 Q 55 85 78 78" stroke="#f6c09b" strokeWidth="1.2" fill="none" opacity="0.8" />
                    <ellipse cx="78" cy="94" rx="22" ry="7" fill="#b85f2d" />
                    <ellipse cx="78" cy="92" rx="19" ry="5" fill="#883b13" />
                  </svg>

                  {messages.length === 0 ? (
                    <div className="pt-16 pb-12 text-center flex flex-col items-center justify-center">
                      {/* Dual overlapping chat bubbles with sparkles (Reference Image 1) */}
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
                          className={`group relative flex ${isMe ? 'justify-end' : 'justify-start'} py-0.5`}
                        >
                          <div className={`relative max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`relative rounded-2xl px-4.5 py-3 text-sm transition-all ${
                                isMe
                                  ? isDeletedEveryone
                                    ? 'rounded-br-xs border border-[#ded7ca] bg-[#f0eae1] text-[#78716c] italic shadow-xs'
                                    : 'rounded-br-xs bg-[#0c4b31] text-white shadow-xs border border-[#083824]'
                                  : isDeletedEveryone
                                  ? 'rounded-bl-xs border border-[#ede7dc] bg-[#f7f3ec] text-[#78716c] italic shadow-xs'
                                  : 'rounded-bl-xs border border-[#e8e2d4] bg-[#ffffff] text-[#173b2d] shadow-2xs'
                              }`}
                            >
                              {/* Message Body or Placeholder */}
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
                              {message.created_at && (
                                <div className="mt-1 flex items-center justify-between gap-3 text-[10px]">
                                  <span className={isMe && !isDeletedEveryone ? 'text-emerald-100/80' : 'text-[#8c8273]'}>
                                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              )}
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
                                  className="rounded-full bg-white/95 p-1.5 text-[#5c5446] shadow-md border border-[#e4ddd0] hover:bg-white hover:text-[#173b2d] transition-colors cursor-pointer"
                                  title="Message options"
                                  aria-label="Message options"
                                >
                                  <MoreVertical size={14} />
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
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Composer - Clean and Handcrafted like Reference Image 1 */}
                <form
                  onSubmit={sendReply}
                  className="flex items-center gap-2 sm:gap-3 border-t border-[#e8e2d5] bg-[#faf7f2] p-3 sm:p-4"
                >
                  <div className="hidden sm:grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ede7dc] text-[#0c4b31]">
                    <UserRound size={17} />
                  </div>
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={t.artisan.replyPlaceholder}
                    className="min-w-0 flex-1 rounded-full sm:rounded-2xl border border-[#ded7c8] bg-white px-4 py-2.5 text-xs sm:text-sm text-[#18392b] placeholder-[#8c8273] outline-none transition-colors focus:border-[#0c4b31] focus:ring-1 focus:ring-[#0c4b31]"
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
                    className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-[#0c4b31] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#083824] disabled:opacity-40 shrink-0 cursor-pointer"
                  >
                    <Send size={15} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </>
            )}
          </section>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </div>

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
    </main>
  );
};