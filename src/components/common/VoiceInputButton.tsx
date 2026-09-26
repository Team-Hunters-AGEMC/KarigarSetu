import React, { useState, useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { SupportedLanguage } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

export interface VoiceInputButtonProps {
  language: SupportedLanguage;
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
  className?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  language,
  onTranscript,
  disabled = false,
  className = '',
}) => {
  const { t } = useLanguage();
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const {
    isListening,
    isSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    language,
    onTranscript: (text) => {
      onTranscript(text);
      setToastNotice(null);
    },
    onError: (errType) => {
      if (errType === 'not-allowed') {
        showTemporaryNotice(t.voiceInput?.micPermissionDenied || 'Microphone permission denied');
      } else if (errType === 'no-speech') {
        showTemporaryNotice(t.voiceInput?.noSpeechDetected || 'No speech detected');
      } else if (errType === 'unsupported') {
        showTemporaryNotice(t.voiceInput?.notSupported || 'Voice input is not supported in this browser');
      }
    },
  });

  const showTemporaryNotice = (msg: string) => {
    setToastNotice(msg);
  };

  useEffect(() => {
    if (toastNotice) {
      const timer = setTimeout(() => setToastNotice(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastNotice]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (!isSupported) {
      showTemporaryNotice(t.voiceInput?.notSupported || 'Voice input is not supported in this browser');
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getButtonTitle = () => {
    if (!isSupported) return t.voiceInput?.notSupported || 'Voice input is not supported in this browser';
    if (isListening) return t.voiceInput?.stopListening || 'Stop listening';
    return t.voiceInput?.voiceInput || 'Voice input';
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-label={getButtonTitle()}
        title={getButtonTitle()}
        className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 shrink-0 ${
          isListening
            ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/30 ring-2 ring-red-400 ring-offset-1 animate-pulse'
            : isSupported
            ? 'bg-emerald-50/80 hover:bg-emerald-100 text-[#0c4b31] border border-[#bedfc9] hover:border-[#0c4b31] shadow-2xs'
            : 'bg-stone-100 text-stone-400 border border-stone-200 opacity-60'
        } ${className}`}
      >
        {isListening ? (
          <div className="relative flex items-center justify-center">
            <MicOff className="w-4 h-4 text-white" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-ping"></span>
          </div>
        ) : (
          <Mic className="w-4 h-4 transition-transform group-hover:scale-110" />
        )}
      </button>

      {/* Listening Floating Badge */}
      {isListening && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1 z-30">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          <span>{t.voiceInput?.listening || 'Listening...'}</span>
        </span>
      )}

      {/* Error / Notice Popover */}
      {toastNotice && (
        <div className="absolute bottom-11 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-40 bg-stone-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-xl border border-stone-700 whitespace-nowrap flex items-center gap-1.5 animate-in fade-in duration-150">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{toastNotice}</span>
        </div>
      )}
    </div>
  );
};
