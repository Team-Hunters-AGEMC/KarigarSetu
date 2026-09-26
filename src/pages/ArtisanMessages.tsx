import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, UserRound, MoreVertical, Trash2, Ban } from 'lucide-react';
import { API_BASE } from '../services/apiConfig';
import { useLanguage } from '../i18n/LanguageContext';

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
  const { t } = useLanguage();
  const [inbox, setInbox] = useState<Conversation[]>([]);
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

  return (
    <main className="min-h-screen bg-[#faf8f5] px-4 py-8 text-[#173b2d]">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/artisan/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#0b5538] hover:underline"
        >
          <ArrowLeft size={18} />
          {t.artisan.dashboardTitle}
        </Link>

        <div className="grid overflow-hidden rounded-3xl border border-[#dce9df] bg-white shadow-md md:grid-cols-[320px_1fr]">
          <aside className="border-b border-[#e8f0ea] bg-[#f7faf8] p-4 md:border-b-0 md:border-r">
            <h1 className="mb-4 flex items-center gap-2 font-extrabold text-[#0b5538]">
              <MessageCircle size={20} />
              {t.artisan.buyerMessagesTitle}
            </h1>

            {inbox.length === 0 ? (
              <p className="text-sm text-slate-500">
                {t.artisan.noBuyerMessages}
              </p>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
                {inbox.map((item, index) => {
                  const isSelected = active?.customer_id === item.customer_id && active?.product_id === item.product_id;
                  return (
                    <button
                      key={`${item.customer_id}-${item.product_id || index}`}
                      onClick={() => openConversation(item)}
                      className={`w-full rounded-2xl p-3.5 text-left transition-all ${
                        isSelected
                          ? 'border border-[#c6decb] bg-white shadow-xs'
                          : 'hover:bg-white/80 border border-transparent'
                      }`}
                    >
                      <div className="flex justify-between gap-2">
                        <b className="truncate text-sm text-[#173b2d]">{item.customer_name}</b>

                        {item.unread_count > 0 && (
                          <span className="rounded-full bg-[#0b5538] px-2 py-0.5 text-xs font-bold text-white">
                            {item.unread_count}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-xs font-medium text-slate-600">
                        {item.product_name || t.artisan.productEnquiry}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {item.body}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="flex min-h-[580px] flex-col">
            {!active ? (
              <div className="m-auto text-center text-slate-500 py-16">
                <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-full bg-[#ebf5ee] text-[#0b5538]">
                  <UserRound size={26} />
                </div>
                <p className="font-bold text-[#173b2d]">{t.artisan.selectBuyerConversation}</p>
                <p className="mt-1 text-xs text-slate-400">Select any conversation from the list to view and reply.</p>
              </div>
            ) : (
              <>
                <header className="flex items-center justify-between border-b border-[#e8f0ea] bg-gradient-to-r from-[#f0f7f2] via-[#f7faf8] to-[#fbfdfb] p-5">
                  <div>
                    <b className="text-base text-[#173b2d]">{active.customer_name}</b>
                    <p className="text-xs font-medium text-slate-500">
                      {active.product_name || t.artisan.productEnquiry}
                    </p>
                  </div>
                </header>

                {/* Warm Sage & Cream Subtle Handmade Background Canvas */}
                <div
                  className="relative flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-8 bg-gradient-to-b from-[#f9fbf8] via-[#f7f9f6] to-[#f4f7f3]"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #dbe4dd 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  {messages.map((message) => {
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
                                  ? 'rounded-br-xs border border-[#e2ece5] bg-[#f0f4f1] text-slate-500 italic shadow-xs'
                                  : 'rounded-br-xs bg-[#0b5538] text-white shadow-xs'
                                : isDeletedEveryone
                                ? 'rounded-bl-xs border border-[#edebe8] bg-[#f7f5f2] text-slate-500 italic shadow-xs'
                                : 'rounded-bl-xs border border-[#e5ece6] bg-[#ffffff] text-[#173b2d] shadow-xs'
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
                                <span className={isMe && !isDeletedEveryone ? 'text-emerald-100/80' : 'text-slate-400'}>
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
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={sendReply}
                  className="flex items-center gap-3 border-t border-[#e8f0ea] bg-[#fafcfb] p-3.5 sm:p-4"
                >
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={t.artisan.replyPlaceholder}
                    className="min-w-0 flex-1 rounded-xl border border-[#cfe0d5] bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#0b5538] focus:ring-1 focus:ring-[#0b5538]"
                  />

                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0b5538] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-opacity hover:bg-[#08422b] disabled:opacity-50"
                  >
                    <Send size={16} />
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