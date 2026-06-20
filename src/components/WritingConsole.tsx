'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Type, Edit3, Image as ImageIcon, Clock, BookOpen, ArrowRight, ArrowLeft } from 'lucide-react';

import { DEFAULT_WRITING_PARTS } from '@/utils/constants';

interface Question {
  id: string;
  type: string;
  text?: string;
  image?: string;
  words?: string[];
  prepTime?: number;
  respTime?: number;
  direction?: string;
  partTime?: number;
  questions?: Question[];
}

interface WritingConsoleProps {
  question: Question;
  partTitle: string;
  onNext: (answerData: string | any[]) => void;
  timeMultiplier: number;
  language: 'en' | 'vi';
}

export default function WritingConsole({
  question,
  partTitle,
  onNext,
  timeMultiplier,
  language
}: WritingConsoleProps) {
  const isGroup = question.type === 'writing_part_1_group';
  const groupQuestions = isGroup ? (question.questions || []) : [question];
  
  // Set limits based on time multiplier (999 means infinite)
  const isInfinite = timeMultiplier > 100;
  
  // Resolve default writing times
  const partMatch = partTitle.match(/part\s*(\d+)/i);
  const partNum = partMatch ? parseInt(partMatch[1], 10) : 1;
  const config = DEFAULT_WRITING_PARTS[partNum];
  const defaultPartTime = config?.partTime ?? 480;
  const defaultRespTime = config ? (typeof config.defaultRespTime === 'function' ? config.defaultRespTime(0) : config.defaultRespTime) : 600;

  const baseTime = isGroup 
    ? (question.partTime !== undefined ? question.partTime : defaultPartTime) 
    : (question.respTime !== undefined ? question.respTime : defaultRespTime);

  const duration = isInfinite ? 99999 : Math.round(baseTime * timeMultiplier);

  const [subIdx, setSubIdx] = useState(0);
  const activeQ = groupQuestions[subIdx];
  const [answers, setAnswers] = useState<string[]>(Array(groupQuestions.length).fill(''));
  const [timeLeft, setTimeLeft] = useState(duration);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleNextRef = useRef<() => void>(() => {});

  // Image Loading State to delay timer
  const [imageLoaded, setImageLoaded] = useState(true);

  // Set imageLoaded when activeQ.image changes
  useEffect(() => {
    setImageLoaded(!activeQ?.image);
  }, [activeQ?.image]);

  handleNextRef.current = () => {
    if (isGroup) {
      const formattedAnswers = groupQuestions.map((q, idx) => ({
        ...q,
        answer: answers[idx].trim() || '(No response provided)'
      }));
      onNext(formattedAnswers);
    } else {
      onNext(answers[0].trim() || '(No response provided)');
    }
  };

  // Reset when question changes
  useEffect(() => {
    setSubIdx(0);
    setAnswers(Array(groupQuestions.length).fill(''));
    setTimeLeft(duration);
  }, [question, duration, groupQuestions.length]);

  // Timer Countdown Logic
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Skip timer countdown if image is loading
    if (!imageLoaded) return;

    if (timeLeft <= 0) {
      handleNextRef.current();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, imageLoaded]);

  const handleSubmit = () => {
    setPendingSubmit(true);
    setTimeout(() => {
      handleNextRef.current();
      setPendingSubmit(false); // Reset in case component isn't unmounted immediately
    }, 50);
  };

  // Helpers
  const getWordCount = (str: string) => {
    const cleanStr = str.trim().replace(/\s+/g, ' ');
    if (cleanStr === '') return 0;
    return cleanStr.split(' ').length;
  };

  const formatTime = (seconds: number) => {
    if (seconds > 50000) return '∞';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const t = {
    vi: {
      submit: isGroup ? 'Nộp bài Part 1' : 'Nộp bài & Tiếp tục',
      timeRemaining: 'Thời gian làm bài',
      wordCount: 'Số từ',
      targetEssay: 'Yêu cầu: Tối thiểu 300 từ',
      requiredWords: 'Từ bắt buộc sử dụng',
      placeholderPicture: 'Viết một câu mô tả bức tranh sử dụng cả hai từ gợi ý ở trên...',
      placeholderEmail: 'Soạn thư điện tử trả lời yêu cầu tại đây...',
      placeholderEssay: 'Viết bài luận nêu ý kiến của bạn tại đây...',
      wordsInfo: 'Tiêu chí chấm điểm: Sử dụng chính xác 2 từ gợi ý trong cùng 1 câu.',
      nextQ: 'Câu tiếp theo',
      prevQ: 'Câu trước'
    },
    en: {
      submit: isGroup ? 'Submit Part 1' : 'Submit & Next',
      timeRemaining: 'Time Remaining',
      wordCount: 'Word Count',
      targetEssay: 'Target: Minimum 300 words',
      requiredWords: 'Required Words',
      placeholderPicture: 'Write one sentence describing the picture using both words above...',
      placeholderEmail: 'Write your email response here...',
      placeholderEssay: 'Write your opinion essay here...',
      wordsInfo: 'Grading Criteria: Use both keywords accurately in a single sentence.',
      nextQ: 'Next Question',
      prevQ: 'Previous Question'
    }
  }['en']; // Force English in test mode to match TOEIC format

  const getPlaceholder = () => {
    if (activeQ.type === 'write_sentence_picture') return t.placeholderPicture;
    if (activeQ.type === 'respond_written_request') return t.placeholderEmail;
    return t.placeholderEssay;
  };

  return (
    <div className="writing-console-container">
      
      {/* Top Header */}
      <div className="writing-header">
        <h2 className="writing-title">{partTitle}</h2>
        
        {isGroup && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
              Question {subIdx + 1} of {groupQuestions.length}
            </span>
          </div>
        )}

        <div className="writing-timer-group">
          <span className="writing-timer-label">{t.timeRemaining}:</span>
          <div 
            className={`writing-timer ${timeLeft < 60 ? 'warning-pulse' : ''}`}
          >
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Prompt, Right Editor */}
      <div className="writing-layout">
        
        {/* Left Side: Question Prompt */}
        <div className="writing-prompt-area no-scrollbar">
          
          {/* Part 2 Direction */}
          {activeQ.direction && (
            <div 
              style={{ 
                background: 'var(--background-secondary)', 
                border: '1px solid var(--border)', 
                padding: '16px', 
                fontSize: '0.95rem',
                lineHeight: '1.6',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                marginBottom: '16px'
              }}
            >
              <strong>Direction: </strong>{activeQ.direction}
            </div>
          )}

          {activeQ.image && (
            <div className="writing-image-container" style={{ position: 'relative', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background-secondary)' }}>
              {!imageLoaded && (
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                  <div className="animate-spin" style={{ width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading image...</span>
                </div>
              )}
              <img 
                src={activeQ.image} 
                alt="TOEIC Writing Scenario" 
                className="writing-image"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
                style={{ opacity: imageLoaded ? 1 : 0, transition: 'opacity 0.2s ease' }}
              />
            </div>
          )}

          {activeQ.words && activeQ.words.length > 0 && (
            <div className="writing-required-words">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.requiredWords}</h4>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                {activeQ.words.map((w, idx) => (
                  <span 
                    key={idx} 
                    className="writing-words-badge"
                  >
                    {w}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {t.wordsInfo}
              </p>
            </div>
          )}

          {activeQ.text && (
            <div 
              className="writing-prompt-text"
              style={{ 
                fontFamily: activeQ.type === 'respond_written_request' ? 'var(--font-mono)' : 'inherit',
                whiteSpace: 'pre-line'
              }}
            >
              {activeQ.text}
            </div>
          )}
        </div>

        {/* Right Side: Text Editor */}
        <div className="writing-editor-area">
          <div className="writing-textarea-container">
            <textarea
              value={answers[subIdx]}
              onChange={(e) => {
                const newAns = [...answers];
                newAns[subIdx] = e.target.value;
                setAnswers(newAns);
              }}
              placeholder={getPlaceholder()}
              className="writing-textarea"
            />
            
            {/* Word Count Indicator for Essay */}
            {activeQ.type === 'opinion_essay' && (
              <div className="writing-word-count-badge">
                <span>{t.wordCount}: {getWordCount(answers[subIdx])}</span>
                <span style={{ color: getWordCount(answers[subIdx]) >= 300 ? 'var(--success)' : 'var(--accent)' }}>
                  {t.targetEssay}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Actions */}
      <div className="writing-footer" style={{ display: 'flex', justifyContent: isGroup ? 'space-between' : 'flex-end', alignItems: 'center' }}>
        
        {isGroup && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setSubIdx(Math.max(0, subIdx - 1))}
              disabled={subIdx === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
            >
              <ArrowLeft size={18} /> {t.prevQ}
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => setSubIdx(Math.min(groupQuestions.length - 1, subIdx + 1))}
              disabled={subIdx === groupQuestions.length - 1}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
            >
              {t.nextQ} <ArrowRight size={18} />
            </button>
          </div>
        )}

        <button 
          className="btn-accent writing-submit-btn" 
          onClick={handleSubmit}
          disabled={pendingSubmit}
        >
          {pendingSubmit ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid var(--background)', borderTopColor: 'transparent', borderRadius: '50%' }} />
              {language === 'vi' ? 'Đang xử lý...' : 'Processing...'}
            </span>
          ) : (
            t.submit
          )}
        </button>
      </div>

    </div>
  );
}
