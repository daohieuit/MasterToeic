'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Mic, MicOff, Volume2, Play, Square, RefreshCw, AlertCircle } from 'lucide-react';
import { DEFAULT_SPEAKING_PARTS } from '@/utils/constants';

interface Question {
  id: string;
  type: string;
  text?: string;
  image?: string;
  prepTime?: number;
  respTime?: number;
}

interface SpeakingConsoleProps {
  question: Question;
  partTitle: string;
  referenceInfo?: string;
  situation?: string;
  onNext: (answerText: string, audioUrl: string | null) => void;
  timeMultiplier: number;
  language: 'en' | 'vi';
}

const getQIndex = (id: string) => {
  const m = id.match(/q(\d+)/i);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num === 7 || num === 10) return 2;
    if (num === 6 || num === 9) return 1;
  }
  return 0;
};

export default function SpeakingConsole({
  question,
  partTitle,
  referenceInfo,
  situation,
  onNext,
  timeMultiplier,
  language
}: SpeakingConsoleProps) {
  const { isRecording, audioUrl, startRecording, stopRecording, stream } = useAudioRecorder();
  const { transcript, isListening, startListening, stopListening, isSupported } = useSpeechRecognition();
  
  // Set limits based on time multiplier (999 means infinite)
  const isInfinite = timeMultiplier > 100;
  
  // Get part configuration
  const partMatch = partTitle.match(/part\s*(\d+)/i);
  const partNum = partMatch ? parseInt(partMatch[1], 10) : 1;
  const config = DEFAULT_SPEAKING_PARTS[partNum];
  
  // Resolve times dynamically
  const defaultPrep = config ? (typeof config.defaultPrepTime === 'function' ? config.defaultPrepTime(getQIndex(question.id)) : config.defaultPrepTime) : 45;
  const defaultResp = config ? (typeof config.defaultRespTime === 'function' ? config.defaultRespTime(getQIndex(question.id)) : config.defaultRespTime) : 45;
  
  const questionPrepTime = question.prepTime !== undefined ? question.prepTime : defaultPrep;
  const questionRespTime = question.respTime !== undefined ? question.respTime : defaultResp;

  const prepDuration = isInfinite ? 99999 : Math.round(questionPrepTime * timeMultiplier);
  const respDuration = isInfinite ? 99999 : Math.round(questionRespTime * timeMultiplier);

  // Timer States
  const [phase, setPhase] = useState<'prepare' | 'respond' | 'completed'>(questionPrepTime > 0 ? 'prepare' : 'respond');
  const [timeLeft, setTimeLeft] = useState(questionPrepTime > 0 ? prepDuration : respDuration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Canvas Waveform visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

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
    setPhase(questionPrepTime > 0 ? 'prepare' : 'respond');
    setTimeLeft(questionPrepTime > 0 ? prepDuration : respDuration);
  }, [question, prepDuration, respDuration, questionPrepTime]);

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

  // Audio visualizer drawing logic
  useEffect(() => {
    if (isRecording && stream && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64; // Small fftSize for simple visualizer bars
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current) return;
        animationRef.current = requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = 4;
        const barGap = 3;
        const totalBars = Math.floor(canvas.width / (barWidth + barGap));
        
        // Use css variable --accent or default to MasterTOEIC gold #BEA45F
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#BEA45F';

        for (let i = 0; i < totalBars; i++) {
          const dataIdx = Math.floor((i / totalBars) * bufferLength);
          const value = dataArray[dataIdx] || 0;
          const percent = value / 255;
          const barHeight = Math.max(4, percent * canvas.height);
          const x = i * (barWidth + barGap);
          const y = (canvas.height - barHeight) / 2;

          // Draw sharp bars (sharp geometry)
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      };

      draw();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        audioContextRef.current = null;
      }
      analyserRef.current = null;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
      }
    };
  }, [isRecording, stream]);

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

        {/* If situation exists (Part 3) */}
        {situation && (
          <div 
            style={{ 
              background: 'var(--background-secondary)', 
              border: '1px solid var(--border)', 
              padding: '20px', 
              fontSize: '1.05rem',
              lineHeight: '1.6',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              marginBottom: '16px'
            }}
          >
            <strong>Situation: </strong>{situation}
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
              <div style={{ display: 'flex', alignItems: 'center', height: '36px', padding: '0 16px' }}>
                <canvas ref={canvasRef} width={120} height={36} style={{ display: 'block', background: 'transparent' }} />
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
