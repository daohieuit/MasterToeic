import { useState, useRef, useEffect, useCallback } from 'react';

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; // TOEIC answers must be in English

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognitionRef.current = recognition;
  }, []);
  const isListeningRef = useRef(false);


  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    // Stop any existing session first to avoid "already started" error
    if (isListeningRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      setIsListening(false);
      isListeningRef.current = false;
    }
    setTranscript('');
    try {
      recognitionRef.current.start();
      isListeningRef.current = true;
    } catch (err) {
      console.error('Error starting recognition:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, []);

  return {
    transcript,
    setTranscript,
    isListening,
    startListening,
    stopListening,
    isSupported: typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
  };
}
