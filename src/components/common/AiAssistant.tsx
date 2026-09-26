import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Trash2,
  Bot,
  User,
  Loader2,
  ChevronDown,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { apiUrl } from '../../services/apiConfig';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const STORAGE_KEY = 'karigarsetu_ai_chat_history';

export const AiAssistant: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // Close AI Assistant on outside click (desktop & mobile)
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      // Do not close if clicking inside the panel or on the launcher toggle button
      if (panelRef.current?.contains(target) || launcherRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Determine user role and context from route & localStorage
  const isArtisanRoute = location.pathname.startsWith('/artisan');
  const isCustomerRoute = location.pathname.startsWith('/customer') || location.pathname.startsWith('/marketplace');

  // Customer ID from storage if customer logged in
  const storedCustomerId = localStorage.getItem('customer_id') || localStorage.getItem('karigarsetu_customer_id');

  // Extract route parameters safely
  const productMatch = location.pathname.match(/\/marketplace\/products\/(\d+)/);
  const currentProductId = productMatch ? parseInt(productMatch[1], 10) : undefined;

  const artisanMatch = location.pathname.match(/\/marketplace\/artisans\/(\d+)/);
  const currentArtisanId = artisanMatch ? parseInt(artisanMatch[1], 10) : undefined;

  // Persist messages to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) {
      setInputMessage('');
    }
    setIsLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedCustomerId) {
        headers['X-Customer-Id'] = storedCustomerId;
      }

      const response = await fetch(apiUrl('/api/ai-assistant/chat'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          message: text,
          language,
          current_route: location.pathname,
          product_id: currentProductId,
          artisan_id: currentArtisanId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.reply) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setErrorMsg(data.message || t.aiAssistant.somethingWentWrong);
      }
    } catch (err) {
      console.error('AI assistant chat error:', err);
      setErrorMsg(t.aiAssistant.somethingWentWrong);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMsg(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Select initial welcome message
  const welcomeText = isArtisanRoute
    ? t.aiAssistant.welcomeArtisan
    : isCustomerRoute
    ? t.aiAssistant.welcomeCustomer
    : t.aiAssistant.welcomeGeneral;

  // Select prompt pills based on role
  const suggestedPills = isArtisanRoute
    ? t.aiAssistant.promptPills.artisan
    : t.aiAssistant.promptPills.customer;

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end">
      {/* Chat Panel / Drawer */}
      {isOpen && (
        <div
          ref={panelRef}
          className="w-[92vw] sm:w-[410px] h-[580px] max-h-[85vh] bg-[#fcfaf6] rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5 duration-200"
          style={{
            boxShadow: '0 20px 40px -15px rgba(44, 76, 56, 0.25), 0 0 0 1px rgba(44, 76, 56, 0.08)',
          }}
        >
          {/* Header */}
          <div className="bg-[#2c4c38] text-white px-4 py-3.5 flex items-center justify-between shadow-sm relative">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-700/60 border border-emerald-400/30 flex items-center justify-center text-amber-200 shadow-inner">
                <Sparkles className="w-5 h-5 animate-pulse text-[#ffd186]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base leading-tight flex items-center gap-1.5 text-stone-100">
                  {t.aiAssistant.title}
                </h3>
                <p className="text-[11px] text-emerald-200/90 font-light flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {t.aiAssistant.onlineStatus}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  title={t.aiAssistant.clearChat}
                  className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-[#f9f6f0] to-[#f4eee4]">
            {/* Greeting Card if no messages */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="bg-white/90 border border-emerald-900/10 p-4 rounded-2xl shadow-sm text-stone-800">
                  <div className="flex items-center gap-2 text-emerald-900 font-medium text-xs mb-1">
                    <Bot className="w-4 h-4 text-emerald-700" />
                    <span>KarigarSetu Smart Guide</span>
                  </div>
                  <p className="text-sm leading-relaxed text-stone-700">{welcomeText}</p>
                </div>

                {/* Quick Prompts */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-stone-700 mb-2 flex items-center gap-1 px-1">
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
                    {t.aiAssistant.suggestedQuestions}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {suggestedPills.map((pill, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(pill)}
                        className="text-left text-xs bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 px-3 py-2 rounded-xl border border-stone-200 hover:border-emerald-300 transition-all shadow-2xs font-normal"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Message Thread */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#2c4c38] text-amber-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`relative group max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#2c4c38] text-white rounded-br-xs shadow-xs'
                      : 'bg-white text-stone-800 border border-stone-200/80 rounded-bl-xs shadow-2xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div
                    className={`text-[10px] mt-1 flex items-center justify-between gap-3 ${
                      msg.sender === 'user' ? 'text-emerald-200' : 'text-stone-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="opacity-0 group-hover:opacity-100 hover:text-stone-600 transition-opacity p-0.5"
                        title={copiedId === msg.id ? t.aiAssistant.copied : t.aiAssistant.copyReply}
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing / Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-[#2c4c38] text-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white text-stone-600 border border-stone-200 px-3.5 py-2 rounded-2xl rounded-bl-xs text-xs flex items-center gap-2 shadow-2xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                  <span>{t.aiAssistant.thinking}</span>
                </div>
              </div>
            )}

            {/* Error Message banner */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
                <span>{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="font-medium underline ml-2 hover:text-red-900"
                >
                  {t.aiAssistant.tryAgain}
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Pills when in conversation */}
          {messages.length > 0 && !isLoading && (
            <div className="px-3 py-1.5 bg-[#f4eee4] border-t border-stone-200/60 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
              {suggestedPills.slice(0, 3).map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(pill)}
                  className="inline-block text-[11px] bg-white hover:bg-emerald-50 text-stone-600 hover:text-emerald-900 px-2.5 py-1 rounded-full border border-stone-200 transition-colors shadow-2xs"
                >
                  {pill}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-stone-200 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t.aiAssistant.askAnything}
              disabled={isLoading}
              maxLength={1000}
              className="flex-1 bg-stone-100 hover:bg-stone-50 focus:bg-white text-stone-900 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-stone-200 focus:border-emerald-600 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-[#2c4c38] hover:bg-[#233d2c] disabled:opacity-40 disabled:hover:bg-[#2c4c38] text-white flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer disabled:cursor-not-allowed"
              title={t.aiAssistant.send}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#0c4b31] hover:bg-[#073623] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-[#ffd186]/50 cursor-pointer"
        aria-label="Toggle KarigarSetu AI Assistant"
        style={{
          boxShadow: '0 8px 24px -2px rgba(12, 75, 49, 0.45), 0 0 0 1px rgba(255, 209, 134, 0.25)',
        }}
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-[#ffd186] transition-transform duration-200" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-[#ffd186] transition-transform group-hover:rotate-12 duration-300" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-[#0c4b31] rounded-full animate-pulse"></span>
          </div>
        )}

        {/* Hover Tooltip if closed */}
        {!isOpen && (
          <span className="absolute right-16 bg-[#0c4b31] text-[#ffd186] text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-[#ffd186]/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {t.aiAssistant.title}
          </span>
        )}
      </button>
    </div>
  );
};
