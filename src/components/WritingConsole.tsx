'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Type, Edit3, Image as ImageIcon, Clock, BookOpen } from 'lucide-react';

interface Question {
  id: string;
  type: string;
  text?: string;
  image?: string;
  words?: string[];
  prepTime: number;
  respTime: number;
}

interface WritingConsoleProps {
  question: Question;
  partTitle: string;
  onNext: (answerText: string) => void;
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
  // Set limits based on time multiplier (999 means infinite)
  const isInfinite = timeMultiplier > 100;
  const duration = isInfinite ? 99999 : Math.round(question.respTime * timeMultiplier);

  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleNextRef = useRef<() => void>(() => {});

  handleNextRef.current = () => {
    onNext(answer.trim() || '(No response provided)');
  };

  // Reset when question changes
  useEffect(() => {
    setAnswer('');
    setTimeLeft(duration);
  }, [question, duration]);

  // Timer Countdown Logic
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

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
  }, [timeLeft]);

  const handleNext = () => {
    handleNextRef.current();
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
      submit: 'Nộp bài & Tiếp tục',
      timeRemaining: 'Thời gian làm bài',
      wordCount: 'Số từ',
      targetEssay: 'Yêu cầu: Tối thiểu 300 từ',
      requiredWords: 'Từ bắt buộc sử dụng',
      placeholderPicture: 'Viết một câu mô tả bức tranh sử dụng cả hai từ gợi ý ở trên...',
      placeholderEmail: 'Soạn thư điện tử trả lời yêu cầu tại đây...',
      placeholderEssay: 'Viết bài luận nêu ý kiến của bạn tại đây...',
      wordsInfo: 'Tiêu chí chấm điểm: Sử dụng chính xác 2 từ gợi ý trong cùng 1 câu.'
    },
    en: {
      submit: 'Submit & Next',
      timeRemaining: 'Time Remaining',
      wordCount: 'Word Count',
      targetEssay: 'Target: Minimum 300 words',
      requiredWords: 'Required Words',
      placeholderPicture: 'Write one sentence describing the picture using both words above...',
      placeholderEmail: 'Write your email response here...',
      placeholderEssay: 'Write your opinion essay here...',
      wordsInfo: 'Grading Criteria: Use both keywords accurately in a single sentence.'
    }
  }['en']; // Force English in test mode to match TOEIC format

  // Pick placeholder based on question type
  const getPlaceholder = () => {
    if (question.type === 'write_sentence_picture') return t.placeholderPicture;
    if (question.type === 'respond_written_request') return t.placeholderEmail;
    return t.placeholderEssay;
  };

  return (
    <div className="writing-console-container">
      
      {/* Top Header */}
      <div className="writing-header">
        <h2 className="writing-title">{partTitle}</h2>
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
          {question.image && (
            <div className="writing-image-container">
              <img 
                src={question.image} 
                alt="TOEIC Writing Scenario" 
                className="writing-image"
              />
            </div>
          )}

          {question.words && (
            <div className="writing-required-words">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.requiredWords}</h4>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                {question.words.map((w, idx) => (
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

          {question.text && (
            <div 
              className="writing-prompt-text"
              style={{ 
                fontFamily: question.type === 'respond_written_request' ? 'var(--font-mono)' : 'inherit'
              }}
            >
              {question.text}
            </div>
          )}
        </div>

        {/* Right Side: Text Editor */}
        <div className="writing-editor-area">
          <div className="writing-textarea-container">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={getPlaceholder()}
              className="writing-textarea"
            />
            
            {/* Word Count Indicator for Essay */}
            {question.type === 'opinion_essay' && (
              <div className="writing-word-count-badge">
                <span>{t.wordCount}: {getWordCount(answer)}</span>
                <span style={{ color: getWordCount(answer) >= 300 ? 'var(--success)' : 'var(--accent)' }}>
                  {t.targetEssay}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Actions */}
      <div className="writing-footer">
        <button 
          className="btn-accent writing-submit-btn" 
          onClick={handleNext}
        >
          {t.submit}
        </button>
      </div>

    </div>
  );
}
