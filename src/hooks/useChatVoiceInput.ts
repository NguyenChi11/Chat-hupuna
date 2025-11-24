'use client';

import { useCallback, useRef, useState } from 'react';

interface UseChatVoiceInputParams {
  editableRef: React.RefObject<HTMLDivElement | null>;
  handleInputChangeEditable: () => void;
}

export function useChatVoiceInput({ editableRef, handleInputChangeEditable }: UseChatVoiceInputParams) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const handleVoiceInput = useCallback(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn không hỗ trợ chức năng này. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0][0].transcript;

      if (editableRef.current) {
        editableRef.current.focus();
        document.execCommand('insertText', false, transcript);
        handleInputChangeEditable();
      }
    };

    recognition.onerror = (event: SpeechRecognitionEventLike) => {
      console.error('Voice error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening, editableRef, handleInputChangeEditable]);

  return {
    isListening,
    handleVoiceInput,
  };
}
