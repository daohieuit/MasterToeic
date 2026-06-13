'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Mic, MicOff, Volume2, Play, Square, RefreshCw, AlertCircle } from 'lucide-react';

interface Question {
  id: string;
  type: string;
  text?: string;
  image?: string;
  prepTime: number;
  respTime: number;
}

interface SpeakingConsoleProps {
  question: Question;
  partTitle: string;
  referenceInfo?: string;
  onNext: (answerText: string, audioUrl: string | null) => void;
  timeMultiplier: number;
  language: 'en' | 'vi';
}

export default function SpeakingConsole({
  question,
  partTitle,
  referenceInfo,
  onNext,
  timeMultiplier,
  language
}: SpeakingConsoleProps) {
  const { isRecording, audioUrl, startRecording, stopRecording } = useAudioRecorder();
  const { transcript, isListening, startListening, stopListening, isSupported } = useSpeechRecognition();
  
  // Set limits based on time multiplier (999 means infinite)
  const isInfinite = timeMultiplier > 100;
  const prepDuration = isInfinite ? 99999 : Math.round(question.prepTime * timeMultiplier);
  const respDuration = isInfinite ? 99999 : Math.round(question.respTime * timeMultiplier);

  // Timer States
  const [phase, setPhase] = useState<'prepare' | 'respond' | 'completed'>(question.prepTime > 0 ? 'prepare' : 'respond');
  const [timeLeft, setTimeLeft] = useState(question.prepTime > 0 ? prepDuration : respDuration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStartRecording = useCallback(() => {
    startRecording();
    if (isSupported) startListening();
  }, [startRecording, isSupported, startListening]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
    if (isSupported) stopListening();
  }, [stopRecording, isSupported, stopListening]);

  // Reset console when question changes
  useEffect(() => {
    setPhase(question.prepTime > 0 ? 'prepare' : 'respond');
    setTimeLeft(question.prepTime > 0 ? prepDuration : respDuration);
  }, [question, prepDuration, respDuration]);

  // Main Timer Logic
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (timeLeft <= 0) {
      if (phase === 'prepare') {
        setPhase('respond');
        setTimeLeft(respDuration);
      } else if (phase === 'respond') {
        handleStopRecording();
        setPhase('completed');
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, phase, respDuration, handleStopRecording]);

  // Auto trigger recording when entering respond phase
  useEffect(() => {
    if (phase === 'respond') {
      handleStartRecording();
    }
  }, [phase, handleStartRecording]);

  const handleSubmit = () => {
    handleStopRecording();
    onNext(transcript || '(No speech recorded)', audioUrl);
  };

  const t = {
    vi: {
      preparing: 'CHUẨN BỊ',
      speaking: 'ĐANG THU ÂM',
      completed: 'HOÀN THÀNH',
      seconds: 'giây',
      prepTimeLabel: 'Thời gian chuẩn bị',
      respTimeLabel: 'Thời gian trả lời',
      micSupportedDesc: 'Nhận diện giọng nói đang hoạt động. Trả lời bằng tiếng Anh.',
      micNotSupported: 'Trình duyệt không hỗ trợ tự nhận diện giọng nói. AI sẽ chấm điểm dựa trên phát âm âm thanh hoặc nội dung nhập tay.',
      submit: 'Nộp bài & Tiếp tục',
      listenPlayback: 'Nghe lại bài nói của bạn:',
      recordStatus: 'Trạng thái ghi âm',
      skipPrep: 'Bỏ qua chuẩn bị'
    },
    en: {
      preparing: 'PREPARING',
      speaking: 'RECORDING',
      completed: 'COMPLETED',
      seconds: 'seconds',
      prepTimeLabel: 'Preparation Time',
      respTimeLabel: 'Response Time',
      micSupportedDesc: 'Speech Recognition active. Please respond in English.',
      micNotSupported: 'Speech recognition not supported in this browser. Grading will proceed.',
      submit: 'Submit & Next',
      listenPlayback: 'Listen to your response:',
      recordStatus: 'Recording status',
      skipPrep: 'Skip Prep'
    }
  }['en']; // Force English in test mode to match TOEIC format

  // Helper to format countdown
  const formatTime = (seconds: number) => {
    if (seconds > 50000) return '∞';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="speaking-console-container">
      
      {/* Top Section: Part Title and Status */}
      <div className="speaking-header">
        <h2 className="speaking-title">{partTitle}</h2>
        <div className="speaking-status-group">
          
          {/* Status Badge */}
          <div 
            className="speaking-status-badge"
            style={{ 
              background: phase === 'prepare' ? '#E64A19' : phase === 'respond' ? '#D32F2F' : 'var(--success)'
            }}
          >
            {phase === 'prepare' ? t.preparing : phase === 'respond' ? t.speaking : t.completed}
          </div>

          {/* Countdown Clock */}
          <div 
            className={`speaking-timer ${timeLeft < 10 && phase !== 'completed' ? 'warning-pulse' : ''}`}
          >
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Middle Section: Display Question/Reference Information */}
      <div className="speaking-content-area no-scrollbar">
        {/* If reference Info exists (Part 4 table schedule) */}
        {referenceInfo && (
          <div 
            style={{ 
              background: 'var(--background-secondary)', 
              border: '1px solid var(--border)', 
              padding: '20px', 
              whiteSpace: 'pre-line',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              lineHeight: '1.6'
            }}
          >
            {referenceInfo}
          </div>
        )}

        {/* Question Text */}
        {question.text && (
          <div style={{ fontSize: '1.25rem', fontWeight: '500', lineHeight: '1.6', color: 'var(--text-primary)' }}>
            {question.text}
          </div>
        )}

        {/* Question Image (Part 2 Describe Picture) */}
        {question.image && (
          <div className="speaking-image-container">
            <img 
              src={question.image} 
              alt="Describe this photo" 
              className="speaking-image"
            />
          </div>
        )}
      </div>

      {/* Bottom Section: Mic status, Playback, and Submit Button */}
      <div className="speaking-footer">
        
        {/* Microphone indicator and Waveform */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--background-secondary)', padding: '12px 16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isRecording ? (
              <div className="waveform-container">
                <div className="wave-bar active-1" />
                <div className="wave-bar active-2" />
                <div className="wave-bar active-3" />
                <div className="wave-bar active-4" />
                <div className="wave-bar active-5" />
              </div>
            ) : (
              <MicOff size={24} style={{ color: 'var(--text-secondary)' }} />
            )}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {isSupported ? t.micSupportedDesc : t.micNotSupported}
            </span>
          </div>
          
          {phase === 'prepare' && (
            <button className="btn-secondary" onClick={() => setTimeLeft(0)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              {t.skipPrep}
            </button>
          )}
        </div>

        {/* Transcript / Audio Playback (If completed) */}
        {phase === 'completed' && (
          <div className="fade-in" style={{ background: 'var(--background-secondary)', padding: '16px', border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--accent)' }}>{t.listenPlayback}</h4>
            {audioUrl ? (
              <audio src={audioUrl} controls style={{ width: '100%', outline: 'none' }} />
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Processing your recording...</p>
            )}
            
            {transcript && (
              <div style={{ marginTop: '12px', borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>Speech Transcription:</p>
                <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>&ldquo;{transcript}&rdquo;</p>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="speaking-actions">
          <button 
            className="btn-accent speaking-submit-btn" 
            onClick={handleSubmit}
          >
            {t.submit}
          </button>
        </div>

      </div>

    </div>
  );
}
