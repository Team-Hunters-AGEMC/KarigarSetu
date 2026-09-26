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
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { apiUrl } from '../../services/apiConfig';
import { VoiceInputButton } from './VoiceInputButton';
import { AiAssistantAtmosphere } from './AiAssistantAtmosphere';

const aiAssistantLogo = new URL('../../assets/ai-assistant-logo.png', import.meta.url).href;

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
  const [speakingId, setSpeakingId] = useState<string | null>(null);

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

  // Stop any ongoing speech synthesis when assistant panel closes or unmounts
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || 'en-IN';
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
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
          className="relative w-[92vw] sm:w-[420px] h-[590px] max-h-[85vh] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_35px_rgba(6,182,212,0.3)] border border-cyan-400/40 flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Deep Navy / Dark Teal 3D Wave Mesh & Glowing Particles Environment (Reference 1) */}
          <AiAssistantAtmosphere />

          {/* Header - Dark Glass with Glowing Cyan Logo */}
          <div className="relative z-10 bg-[#041a26]/90 backdrop-blur-md border-b border-cyan-500/25 text-white px-4 py-3.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#092b3a] border-2 border-cyan-400 p-0.5 shadow-[0_0_14px_rgba(34,211,238,0.55)] shrink-0 flex items-center justify-center">
                <img
                  src={aiAssistantLogo}
                  alt="KarigarSetu AI"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base leading-tight flex items-center gap-1.5 text-white">
                  {t.aiAssistant.title}
                </h3>
                <p className="text-[11px] text-cyan-300 font-medium flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse"></span>
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
                  className="p-1.5 rounded-lg text-cyan-400/80 hover:text-cyan-200 hover:bg-cyan-900/40 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Chat Messages Body - Overlaid on Dark Atmosphere */}
          <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3.5 bg-transparent">
            {/* Greeting Card if no messages */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="bg-[#062433]/75 border border-cyan-500/30 p-4 rounded-2xl shadow-[0_8px_25px_rgba(0,0,0,0.45)] text-cyan-50 backdrop-blur-md">
                  <div className="flex items-center justify-between text-cyan-300 font-semibold text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <img src={aiAssistantLogo} alt="AI" className="w-5 h-5 rounded-full object-cover shrink-0 border border-cyan-400/50" />
                      <span className="font-bold tracking-wide">KarigarSetu Smart Guide</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/30 text-cyan-300">
                      AI Verified
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-200">{welcomeText}</p>
                </div>

                {/* Quick Prompts */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-cyan-300/85 mb-2 flex items-center gap-1 px-1">
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                    {t.aiAssistant.suggestedQuestions}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {suggestedPills.map((pill, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(pill)}
                        className="text-left text-xs bg-[#082a3c]/75 hover:bg-[#0c3a52] text-cyan-100 hover:text-white px-3.5 py-2.5 rounded-xl border border-cyan-500/30 hover:border-cyan-400/60 transition-all shadow-sm font-medium cursor-pointer backdrop-blur-xs"
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
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-[#092b3a] p-0.5 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-cyan-400/50">
                    <img src={aiAssistantLogo} alt="AI" className="w-full h-full object-cover rounded-full" />
                  </div>
                )}

                <div
                  className={`relative group max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#0d6e53] to-[#0a5c46] text-white border border-emerald-400/40 rounded-br-xs shadow-[0_4px_16px_rgba(13,110,83,0.35)]'
                      : 'bg-[#062332]/85 text-cyan-50 border border-cyan-400/30 rounded-bl-xs shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div
                    className={`text-[10px] mt-1.5 flex items-center justify-between gap-3 ${
                      msg.sender === 'user' ? 'text-emerald-200/80' : 'text-slate-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'assistant' && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(msg.id, msg.text)}
                          className="opacity-0 group-hover:opacity-100 hover:text-cyan-200 transition-opacity p-0.5 cursor-pointer text-slate-400"
                          title={speakingId === msg.id ? (t.voiceInput?.stopReading || 'Stop reading') : (t.voiceInput?.readAloud || 'Read aloud')}
                        >
                          {speakingId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 hover:text-cyan-300" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="opacity-0 group-hover:opacity-100 hover:text-cyan-200 transition-opacity p-0.5 cursor-pointer text-slate-400"
                          title={copiedId === msg.id ? t.aiAssistant.copied : t.aiAssistant.copyReply}
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-cyan-300" />
                          ) : (
                            <Copy className="w-3 h-3 hover:text-cyan-300" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[#0d4f3e] text-emerald-200 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing / Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-[#092b3a] p-0.5 flex items-center justify-center shrink-0 shadow-2xs border border-cyan-400/50 animate-pulse">
                  <img src={aiAssistantLogo} alt="AI" className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="bg-[#062433]/90 text-cyan-200 border border-cyan-500/30 px-3.5 py-2 rounded-2xl rounded-bl-xs text-xs flex items-center gap-2 shadow-lg backdrop-blur-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>{t.aiAssistant.thinking}</span>
                </div>
              </div>
            )}

            {/* Error Message banner */}
            {errorMsg && (
              <div className="p-3 bg-red-950/80 border border-red-500/40 text-red-200 rounded-xl text-xs flex items-center justify-between">
                <span>{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  className="font-medium underline ml-2 hover:text-red-100 cursor-pointer"
                >
                  {t.aiAssistant.tryAgain}
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Pills when in conversation */}
          {messages.length > 0 && !isLoading && (
            <div className="relative z-10 px-3 py-1.5 bg-[#031520]/80 border-t border-cyan-500/20 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5 backdrop-blur-xs">
              {suggestedPills.slice(0, 3).map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(pill)}
                  className="inline-block text-[11px] bg-[#07293b]/85 hover:bg-[#0c3950] text-cyan-200 hover:text-white px-2.5 py-1 rounded-full border border-cyan-500/30 transition-colors shadow-2xs cursor-pointer"
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
            className="relative z-10 p-2.5 sm:p-3 bg-[#031622]/95 border-t border-cyan-500/25 flex items-center gap-1.5 sm:gap-2 backdrop-blur-md"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t.aiAssistant.askAnything}
              disabled={isLoading}
              maxLength={1000}
              className="min-w-0 flex-1 bg-[#062433] hover:bg-[#082b3d] focus:bg-[#0a3348] text-white placeholder-cyan-200/40 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-cyan-500/35 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300/40 transition-colors"
            />
            <VoiceInputButton
              theme="dark"
              language={language}
              onTranscript={(transcript) => {
                setInputMessage((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#0d9488] hover:from-[#22d3ee] hover:to-[#14b8a6] disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-[0_0_14px_rgba(6,182,212,0.4)] shrink-0 cursor-pointer disabled:cursor-not-allowed"
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

      {/* Floating Toggle Button - Glowing Cyan Futuristic Ring (Reference Image 2) */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#0c394c] via-[#082836] to-[#041620] hover:from-[#0e4359] text-white shadow-[0_0_22px_rgba(6,182,212,0.45),0_8px_20px_rgba(0,0,0,0.6)] hover:shadow-[0_0_28px_rgba(6,182,212,0.65)] hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-cyan-400/80 cursor-pointer overflow-hidden p-1"
        aria-label="Toggle KarigarSetu AI Assistant"
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-cyan-300 transition-transform duration-200" />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={aiAssistantLogo}
              alt="KarigarSetu AI"
              className="w-full h-full object-cover rounded-full"
            />
            <span className="absolute top-0 right-0 w-3 h-3 bg-cyan-400 border-2 border-[#051822] rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]"></span>
          </div>
        )}

        {/* Hover Tooltip if closed */}
        {!isOpen && (
          <span className="absolute right-16 bg-[#072533] text-cyan-200 text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl border border-cyan-400/40 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {t.aiAssistant.title}
          </span>
        )}
      </button>
    </div>
  );
};
