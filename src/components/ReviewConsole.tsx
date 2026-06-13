'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Award, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Play, ArrowLeft, RefreshCw, BookOpen, Edit3 } from 'lucide-react';

interface GrammarError {
  original: string;
  correction: string;
  explanation: string;
}

interface QuestionReview {
  id: string;
  type: string;
  partTitle: string;
  questionText: string;
  userAnswer: string;
  score: number;
  feedback: string;
  grammarErrors: GrammarError[];
  sampleAnswer: string;
  audioUrl?: string | null;
}

interface ReviewConsoleProps {
  testTitle: string;
  date: string;
  speakingScore: number | null;
  writingScore: number | null;
  reviews: QuestionReview[];
  language: 'en' | 'vi';
}

export default function ReviewConsole({
  testTitle,
  date,
  speakingScore,
  writingScore,
  reviews,
  language
}: ReviewConsoleProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const t = {
    vi: {
      title: 'Kết quả ôn tập & Đánh giá chi tiết',
      date: 'Ngày làm bài',
      scoreOverview: 'Tổng quan điểm số',
      speakingScore: 'Điểm Nói (Speaking)',
      writingScore: 'Điểm Viết (Writing)',
      questionList: 'Danh sách câu hỏi & Nhận xét từ AI',
      userAnswer: 'Bài làm của bạn',
      score: 'Điểm câu hỏi',
      grammarTitle: 'Sửa lỗi ngữ pháp & Từ vựng',
      feedbackTitle: 'Đánh giá & Góp ý (AI)',
      sampleTitle: 'Bài mẫu tham khảo (Sample Answer)',
      backDashboard: 'Quay lại Trang chủ',
      listenSpeech: 'Nghe lại bài nói:',
      noGrammarErrors: 'Tuyệt vời! Không phát hiện lỗi ngữ pháp rõ rệt.'
    },
    en: {
      title: 'Practice Review & Evaluation',
      date: 'Date completed',
      scoreOverview: 'Score Overview',
      speakingScore: 'Speaking Score',
      writingScore: 'Writing Score',
      questionList: 'Questions & AI Evaluations',
      userAnswer: 'Your Response',
      score: 'Question Score',
      grammarTitle: 'Grammar & Vocabulary Corrections',
      feedbackTitle: 'Feedback & Advice (AI)',
      sampleTitle: 'Model Reference Answer',
      backDashboard: 'Back to Dashboard',
      listenSpeech: 'Listen to your response:',
      noGrammarErrors: 'Excellent! No major grammar errors detected.'
    }
  }[language];

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="fade-in review-container">
      
      {/* Back to Dashboard */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
          <ArrowLeft size={16} /> {t.backDashboard}
        </Link>
      </div>

      {/* Header Panel */}
      <div className="card-sharp review-header-panel">
        <h1 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{testTitle}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.date}: {date}</p>

        {/* Score blocks */}
        <div className="review-score-grid">
          {speakingScore !== null && (
            <div className="review-score-card">
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.speakingScore}</span>
              <span style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                {speakingScore}/200
              </span>
            </div>
          )}
          {writingScore !== null && (
            <div className="review-score-card">
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.writingScore}</span>
              <span style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                {writingScore}/200
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Question Review List */}
      <div>
        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={20} style={{ color: 'var(--accent)' }} /> {t.questionList}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.map((rev, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div 
                key={rev.id || idx} 
                className="card-sharp" 
                style={{ 
                  padding: 0,
                  overflow: 'hidden',
                  borderColor: isExpanded ? 'var(--text-primary)' : 'var(--border)'
                }}
              >
                {/* Accordion Toggle Bar */}
                <button
                  onClick={() => toggleExpand(idx)}
                  className="review-accordion-toggle"
                >
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                        {rev.partTitle.toUpperCase()}
                      </span>
                      <span className="mobile-only" style={{ padding: '2px 6px', background: 'var(--background)', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                        {rev.score}/100
                      </span>
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>
                      Question {idx + 1}: {rev.questionText.slice(0, 75)}{rev.questionText.length > 75 ? '...' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                    <div className="desktop-only review-score-badge">
                      Score: {rev.score}/100
                    </div>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="fade-in review-details">
                    
                    {/* Prompt Context */}
                    <div className="review-prompt-box">
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '6px' }}>Đề bài (Prompt):</p>
                      <p style={{ fontSize: '0.95rem', fontStyle: 'italic' }}>{rev.questionText}</p>
                    </div>

                    {/* Audio playback if Speaking */}
                    {rev.audioUrl && (
                      <div className="review-audio-box">
                        <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.listenSpeech}</p>
                        <audio src={rev.audioUrl} controls style={{ width: '100%', outline: 'none' }} />
                      </div>
                    )}

                    {/* User Answer */}
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Edit3 size={16} /> {t.userAnswer}
                      </h4>
                      <div className="review-answer-box">
                        {rev.userAnswer}
                      </div>
                    </div>

                    {/* AI Feedback & Scores */}
                    <div className="review-feedback-grid">
                      
                      {/* Overall feedback */}
                      <div>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '8px' }}>
                          {t.feedbackTitle}
                        </h4>
                        <div className="review-feedback-box">
                          {rev.feedback}
                        </div>
                      </div>
 
                      {/* Grammar corrections */}
                      <div>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '8px' }}>
                          {t.grammarTitle}
                        </h4>
                        <div className="review-grammar-box">
                          {rev.grammarErrors.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle size={16} style={{ color: 'var(--success)' }} /> {t.noGrammarErrors}
                            </p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {rev.grammarErrors.map((err, errIdx) => (
                                <div key={errIdx} style={{ fontSize: '0.85rem', borderBottom: errIdx < rev.grammarErrors.length - 1 ? '1px dashed var(--border)' : 'none', paddingBottom: '12px' }}>
                                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--accent)', textDecoration: 'line-through' }}>{err.original}</span>
                                    <span>➔</span>
                                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{err.correction}</span>
                                  </div>
                                  <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                                    {err.explanation}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
 
                      {/* Sample Answer */}
                      {rev.sampleAnswer && (
                        <div>
                          <h4 style={{ fontSize: '0.9rem', color: 'var(--success)', marginBottom: '8px' }}>
                            {t.sampleTitle}
                          </h4>
                          <div className="review-sample-box">
                            {rev.sampleAnswer}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
