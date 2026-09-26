import { useState, useEffect, useRef, useCallback } from 'react';
import { SupportedLanguage } from '../types';

// Declare Web Speech API types for TypeScript
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
}

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: {
    new (): ISpeechRecognition;
  };
  webkitSpeechRecognition?: {
    new (): ISpeechRecognition;
  };
}

export interface UseSpeechRecognitionOptions {
  language: SupportedLanguage;
  onTranscript: (transcript: string) => void;
  onError?: (errorType: 'not-allowed' | 'no-speech' | 'unsupported' | 'general') => void;
}

export function useSpeechRecognition({
  language,
  onTranscript,
  onError,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Check support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as IWindowWithSpeech;
      const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      setIsSupported(Boolean(SpeechClass));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore already stopped
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setErrorMessage(null);

    if (typeof window === 'undefined') return;
    const win = window as IWindowWithSpeech;
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechClass) {
      setIsSupported(false);
      setErrorMessage('unsupported');
      onErrorRef.current?.('unsupported');
      return;
    }

    // If already running, stop first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechClass();
      recognition.continuous = false;
      recognition.interimResults = false;

      // Exact language mapping: en-IN -> en-IN, bn-IN -> bn-IN, hi-IN -> hi-IN
      const langMap: Record<SupportedLanguage, string> = {
        'en-IN': 'en-IN',
        'bn-IN': 'bn-IN',
        'hi-IN': 'hi-IN',
      };
      recognition.lang = langMap[language] || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0] && item[0].transcript) {
            finalTranscript += item[0].transcript;
          }
        }

        const trimmed = finalTranscript.trim();
        if (trimmed) {
          onTranscriptRef.current(trimmed);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        const errType = event.error;

        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          setErrorMessage('not-allowed');
          onErrorRef.current?.('not-allowed');
        } else if (errType === 'no-speech') {
          setErrorMessage('no-speech');
          onErrorRef.current?.('no-speech');
        } else if (errType !== 'aborted') {
          setErrorMessage('general');
          onErrorRef.current?.('general');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
      setErrorMessage('general');
      onErrorRef.current?.('general');
    }
  }, [language]);

  // Clean up on unmount or when language changes
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
    clearError: () => setErrorMessage(null),
  };
}
