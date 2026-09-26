import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send,
  User,
  Loader2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  X,
  Lightbulb,
  Copy,
  Check,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { apiUrl } from '../../services/apiConfig';
import { VoiceInputButton } from './VoiceInputButton';
import { AiAssistantAtmosphere } from './AiAssistantAtmosphere';

const aiAssistantLogo = new URL('../../assets/karigarsetu-ai-assistant-logo.png', import.meta.url).href;

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
          className="relative w-[92vw] sm:w-[410px] h-[610px] max-h-[86vh] rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.65),0_0_30px_rgba(217,164,65,0.22)] border border-[#D9A441]/60 flex flex-col overflow-hidden mb-3 animate-in fade-in slide-in-from-bottom-5 duration-200 bg-[#073C31]"
        >
          {/* Handcrafted Emerald Atmosphere & Corner Foliage (Reference Match) */}
          <AiAssistantAtmosphere />

          {/* Header - Warm Ivory/Cream with Robot Logo and Gold Border (Reference Match) */}
          <div className="relative z-10 bg-gradient-to-b from-[#FFF6E4] to-[#F8E9CF] border-b border-[#E8D4B0] px-4 py-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-[#D9A441]/70 shadow-sm shrink-0 bg-[#073c31] flex items-center justify-center">
                <img
                  src={aiAssistantLogo}
                  alt="KarigarSetu AI"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-[#0a3a2c] leading-tight tracking-tight">
                  KarigarSetu AI Assistant
                </h3>
                <p className="text-[11px] text-[#1b5e48] font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 shadow-[0_0_6px_#059669]"></span>
                  Online • KarigarSetu Smart Guide
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearChat}
                title={t.aiAssistant.clearChat || 'Reset conversation'}
                className="w-8 h-8 rounded-full border border-[#D8C29D] hover:bg-[#EFE0C4] text-[#0a3a2c] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Reset chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close assistant"
                className="w-8 h-8 rounded-full border border-[#D8C29D] hover:bg-[#EFE0C4] text-[#0a3a2c] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body - Overlaid on Emerald Atmosphere */}
          <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3.5 bg-transparent">
            {/* Initial Welcome & Suggested Questions (Exact Reference Match) */}
            {messages.length === 0 && (
              <div className="space-y-4">
                {/* Assistant Welcome Card in Warm Ivory */}
                <div className="relative group max-w-[94%] bg-[#FFF4DE] text-[#193228] border border-[#E9D6B3] rounded-2xl rounded-tl-xs shadow-[0_4px_18px_rgba(0,0,0,0.22)] p-4 text-xs sm:text-sm leading-relaxed">
                  <div className="font-extrabold text-sm text-[#0c4b31] mb-1">Namaste! 🙏</div>
                  <p className="text-[#203a30] leading-relaxed font-medium">{welcomeText}</p>
                </div>

                {/* Suggested Questions Section */}
                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wider font-extrabold text-[#E5B558] mb-2.5 flex items-center gap-1.5 px-1">
                    <Lightbulb className="w-3.5 h-3.5 text-[#E5B558]" />
                    {t.aiAssistant.suggestedQuestions || 'SUGGESTED QUESTIONS'}
                  </p>
                  <div className="flex flex-col gap-2">
                    {suggestedPills.map((pill, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(pill)}
                        className="w-full text-left text-xs bg-[#0B4B3D]/90 hover:bg-[#125848] text-white px-4 py-2.5 rounded-xl border border-[#166352] hover:border-[#D9A441]/50 transition-all flex items-center justify-between font-medium group cursor-pointer shadow-xs"
                      >
                        <span className="line-clamp-1">{pill}</span>
                        <ChevronRight className="w-4 h-4 text-emerald-300 group-hover:text-[#D9A441] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
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
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-[#073c31] border border-[#D9A441]/60 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <img src={aiAssistantLogo} alt="AI" className="w-full h-full object-cover rounded-full" />
                  </div>
                )}

                <div
                  className={`relative group max-w-[82%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#176B55] to-[#125848] text-white border border-[#21846b]/60 rounded-br-xs shadow-md'
                      : 'bg-[#FFF4DE] text-[#193228] border border-[#E9D6B3] rounded-tl-xs shadow-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
                  <div
                    className={`text-[10px] mt-1.5 flex items-center justify-between gap-3 ${
                      msg.sender === 'user' ? 'text-emerald-200/80' : 'text-[#5c7167]'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'assistant' && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleSpeak(msg.id, msg.text)}
                          className="opacity-0 group-hover:opacity-100 hover:text-[#0c4b31] transition-opacity p-0.5 cursor-pointer text-[#6b7280]"
                          title={speakingId === msg.id ? (t.voiceInput?.stopReading || 'Stop reading') : (t.voiceInput?.readAloud || 'Read aloud')}
                        >
                          {speakingId === msg.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 hover:text-[#0c4b31]" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="opacity-0 group-hover:opacity-100 hover:text-[#0c4b31] transition-opacity p-0.5 cursor-pointer text-[#6b7280]"
                          title={copiedId === msg.id ? t.aiAssistant.copied : t.aiAssistant.copyReply}
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-700" />
                          ) : (
                            <Copy className="w-3 h-3 hover:text-[#0c4b31]" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[#073C31] text-emerald-200 flex items-center justify-center shrink-0 mt-0.5 border border-[#1b6452]">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing / Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-[#073c31] border border-[#D9A441]/60 flex items-center justify-center shrink-0 shadow-2xs animate-pulse">
                  <img src={aiAssistantLogo} alt="AI" className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="bg-[#FFF4DE] text-[#0c4b31] border border-[#E9D6B3] px-3.5 py-2 rounded-2xl rounded-tl-xs text-xs flex items-center gap-2 shadow-md font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0c4b31]" />
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

          {/* Quick Prompt Pills when in ongoing conversation */}
          {messages.length > 0 && !isLoading && (
            <div className="relative z-10 px-3 py-1.5 bg-[#04261f]/90 border-t border-[#0e4f40] overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5 backdrop-blur-xs">
              {suggestedPills.slice(0, 3).map((pill, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(pill)}
                  className="inline-block text-[11px] bg-[#0B4B3D] hover:bg-[#125848] text-emerald-100 hover:text-white px-3 py-1 rounded-full border border-[#166352] transition-colors shadow-2xs cursor-pointer font-medium"
                >
                  {pill}
                </button>
              ))}
            </div>
          )}

          {/* Bottom Message Input Composer (Reference Match) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative z-10 p-2.5 sm:p-3 bg-[#04261f]/95 border-t border-[#0e4f40] flex items-center gap-2 backdrop-blur-md"
          >
            {/* Dark green pill container with subtle gold/emerald border */}
            <div className="min-w-0 flex-1 flex items-center bg-[#07372d] border border-[#1a6452] focus-within:border-[#D9A441]/70 rounded-full px-3.5 py-1.5 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={t.aiAssistant.askAnything || 'Ask about crafts, orders, pricing...'}
                disabled={isLoading}
                maxLength={1000}
                className="min-w-0 flex-1 bg-transparent text-white placeholder-emerald-200/50 text-xs sm:text-sm focus:outline-none"
              />
              <VoiceInputButton
                theme="dark"
                language={language}
                className="w-8 h-8 rounded-full"
                onTranscript={(transcript) => {
                  setInputMessage((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
                }}
                disabled={isLoading}
              />
            </div>

            {/* Warm Golden/Terracotta Circular Send Button */}
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-[#DE8032] to-[#C96D25] hover:from-[#E58C40] hover:to-[#D5762C] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow-[0_2px_12px_rgba(201,109,37,0.45)] hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
              title={t.aiAssistant.send}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button - KarigarSetu Robot with Soft Emerald/Gold Glow (Reference Match) */}
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#0c5944] via-[#073c31] to-[#04281f] text-white shadow-[0_4px_22px_rgba(7,60,49,0.55),0_0_18px_rgba(217,164,65,0.30)] hover:shadow-[0_6px_28px_rgba(7,60,49,0.7),0_0_24px_rgba(217,164,65,0.50)] hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-[#D9A441]/80 cursor-pointer overflow-hidden p-1"
        aria-label="Toggle KarigarSetu AI Assistant"
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-[#FFF4DE] transition-transform duration-200" />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={aiAssistantLogo}
              alt="KarigarSetu AI"
              className="w-full h-full object-cover rounded-full"
            />
            <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#073c31] rounded-full shadow-[0_0_6px_#34d399] animate-pulse"></span>
          </div>
        )}

        {/* Hover Tooltip if closed */}
        {!isOpen && (
          <span className="absolute right-18 bg-[#073c31] text-[#FFF4DE] text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl border border-[#D9A441]/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            KarigarSetu AI Assistant
          </span>
        )}
      </button>
    </div>
  );
};
