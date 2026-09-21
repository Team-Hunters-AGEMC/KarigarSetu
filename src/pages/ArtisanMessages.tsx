import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, UserRound } from 'lucide-react';
import { API_BASE } from '../services/apiConfig';

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
};

export const ArtisanMessages: React.FC = () => {
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

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
      setError(err instanceof Error ? err.message : 'সমস্যা হয়েছে।');
    }
  };

  useEffect(() => {
    loadInbox().catch((err) => setError(err.message));
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f9f7] px-4 py-8 text-[#173b2d]">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/artisan/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#0b5538]"
        >
          <ArrowLeft size={18} />
          Artisan Studio
        </Link>

        <div className="grid overflow-hidden rounded-3xl border border-[#dce9df] bg-white shadow-sm md:grid-cols-[300px_1fr]">
          <aside className="border-b border-[#e8f0ea] bg-[#f3f8f4] p-4 md:border-b-0 md:border-r">
            <h1 className="mb-4 flex items-center gap-2 font-extrabold text-[#0b5538]">
              <MessageCircle size={20} />
              Buyer Messages
            </h1>

            {inbox.length === 0 ? (
              <p className="text-sm text-slate-500">
                এখনও কোনো buyer message নেই।
              </p>
            ) : (
              inbox.map((item, index) => (
                <button
                  key={`${item.customer_id}-${item.product_id || index}`}
                  onClick={() => openConversation(item)}
                  className="mb-2 w-full rounded-xl p-3 text-left hover:bg-white"
                >
                  <div className="flex justify-between gap-2">
                    <b className="truncate text-sm">{item.customer_name}</b>

                    {item.unread_count > 0 && (
                      <span className="rounded-full bg-[#0b5538] px-2 text-xs text-white">
                        {item.unread_count}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {item.product_name || 'Product enquiry'}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-400">
                    {item.body}
                  </p>
                </button>
              ))
            )}
          </aside>

          <section className="flex min-h-[540px] flex-col">
            {!active ? (
              <div className="m-auto text-center text-slate-500">
                <UserRound className="mx-auto mb-3" />
                <p>Buyer-এর conversation select করো।</p>
              </div>
            ) : (
              <>
                <header className="border-b border-[#e8f0ea] p-5">
                  <b>{active.customer_name}</b>
                  <p className="text-xs text-slate-500">
                    {active.product_name || 'Product enquiry'}
                  </p>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto bg-[#fcfdfb] p-5">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_role === 'artisan'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                          message.sender_role === 'artisan'
                            ? 'bg-[#0b5538] text-white'
                            : 'bg-[#eaf4ec]'
                        }`}
                      >
                        {message.body}
                      </div>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={sendReply}
                  className="flex gap-3 border-t p-4"
                >
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Buyer-কে reply লিখুন…"
                    className="min-w-0 flex-1 rounded-xl border border-[#cfe0d5] px-4 py-3 text-sm outline-none focus:border-[#0b5538]"
                  />

                  <button
                    type="submit"
                    className="rounded-xl bg-[#0b5538] px-4 text-white"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </main>
  );
};