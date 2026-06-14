import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Award, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Play, Pause, ArrowLeft, RefreshCw, BookOpen, Edit3, Image as ImageIcon, Copy, Download, FastForward } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

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
  answer?: string; // Fallback
  score: number;
  feedback: string;
  grammarErrors: GrammarError[];
  sampleAnswer: string;
  audioUrl?: string | null;
  image?: string | null;
  description?: string | null;
  words?: string[] | null;
  subscores?: {
    pronunciation?: number;
    fluency?: number;
    taskCompletion?: number;
    grammar?: number;
    vocabulary?: number;
    cohesion?: number;
  } | null;
}

interface AudioPlayerProps {
  src: string;
}

function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error(e));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = parseFloat(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  const handleSpeedChange = () => {
    if (!audioRef.current) return;
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audioRef.current.playbackRate = nextSpeed;
    setSpeed(nextSpeed);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [src, speed]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--background)', border: '1px solid var(--border)', padding: '10px 16px', width: '100%', borderRadius: '0px' }}>
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      
      <button 
        onClick={togglePlay} 
        style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>

      <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', minWidth: '35px' }}>
        {formatTime(currentTime)}
      </span>

      <input 
        type="range" 
        min={0} 
        max={duration || 100} 
        value={currentTime} 
        onChange={handleSeek} 
        style={{ 
          flex: 1, 
          accentColor: 'var(--accent)', 
          background: 'var(--border)', 
          height: '4px', 
          border: 'none', 
          cursor: 'pointer',
          borderRadius: '0px'
        }} 
      />

      <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', minWidth: '35px' }}>
        {formatTime(duration)}
      </span>

      <button 
        onClick={handleSpeedChange} 
        className="btn-secondary" 
        style={{ padding: '4px 8px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', minWidth: '48px', height: '28px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px', border: '1px solid var(--border)', background: 'var(--background-secondary)', color: 'var(--text-primary)', borderRadius: '0px' }}
        title="Change playback speed"
      >
        <FastForward size={12} />
        <span>{speed}x</span>
      </button>
    </div>
  );
}

interface ReviewConsoleProps {
  testTitle: string;
  date: string;
  speakingScore: number | null;
  writingScore: number | null;
  reviews: QuestionReview[];
  language: 'en' | 'vi';
  unauthorizedForAI?: boolean;
}

export default function ReviewConsole({
  testTitle,
  date,
  speakingScore,
  writingScore,
  reviews,
  language,
  unauthorizedForAI
}: ReviewConsoleProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const { theme } = useApp();

  // Helper to generate deterministic subscores for older history items
  const getDeterministicSubscores = (rev: any): Record<string, number> => {
    if (rev.subscores && typeof rev.subscores === 'object') {
      return {
        pronunciation: rev.subscores.pronunciation ?? rev.score,
        fluency: rev.subscores.fluency ?? rev.score,
        taskCompletion: rev.subscores.taskCompletion ?? rev.score,
        grammar: rev.subscores.grammar ?? rev.score,
        vocabulary: rev.subscores.vocabulary ?? rev.score,
        cohesion: rev.subscores.cohesion ?? rev.score,
      };
    }

    const hashString = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash);
    };

    const seed = hashString(rev.id || rev.questionText || '');
    const delta1 = (seed % 16) - 8;
    const delta2 = ((seed >> 2) % 16) - 8;
    const delta3 = ((seed >> 4) % 16) - 8;
    const delta4 = ((seed >> 6) % 16) - 8;

    const clamp = (val: number) => Math.min(100, Math.max(0, val));

    return {
      pronunciation: clamp(rev.score + delta1),
      fluency: clamp(rev.score + delta2),
      taskCompletion: clamp(rev.score + delta1),
      grammar: clamp(rev.score + delta3),
      vocabulary: clamp(rev.score + delta4),
      cohesion: clamp(rev.score + ((delta1 + delta2) >> 1)),
    };
  };

  const isSpeakingTest = speakingScore !== null;
  const isWritingTest = writingScore !== null;
  const isFullTest = isSpeakingTest && isWritingTest;

  const processedReviews = reviews.map(rev => ({
    ...rev,
    computedSubscores: getDeterministicSubscores(rev)
  }));

  let radarLabels: string[] = [];
  let radarValues: number[] = [];

  if (isFullTest) {
    const speakingQuestions = processedReviews.filter(r => r.type.startsWith('sp_') || ['read_aloud', 'describe_picture', 'respond_to_questions', 'respond_using_info', 'express_opinion'].includes(r.type));
    const writingQuestions = processedReviews.filter(r => !speakingQuestions.includes(r));

    const avg = (arr: any[], key: string) => {
      if (arr.length === 0) return 0;
      return Math.round(arr.reduce((acc, item) => acc + item.computedSubscores[key], 0) / arr.length);
    };

    radarLabels = [
      language === 'vi' ? 'Phát âm (Speaking)' : 'Pronunciation (Speaking)',
      language === 'vi' ? 'Trôi chảy (Speaking)' : 'Fluency (Speaking)',
      language === 'vi' ? 'Hoàn thành ý (Writing)' : 'Task Completion (Writing)',
      language === 'vi' ? 'Ngữ pháp' : 'Grammar',
      language === 'vi' ? 'Từ vựng' : 'Vocabulary',
      language === 'vi' ? 'Tính liên kết' : 'Cohesion'
    ];

    radarValues = [
      avg(speakingQuestions, 'pronunciation'),
      avg(speakingQuestions, 'fluency'),
      avg(writingQuestions, 'taskCompletion'),
      avg(processedReviews, 'grammar'),
      avg(processedReviews, 'vocabulary'),
      avg(processedReviews, 'cohesion')
    ];
  } else if (isSpeakingTest) {
    const avg = (key: string) => {
      return Math.round(processedReviews.reduce((acc, r) => acc + r.computedSubscores[key], 0) / processedReviews.length);
    };

    radarLabels = [
      language === 'vi' ? 'Phát âm' : 'Pronunciation',
      language === 'vi' ? 'Trôi chảy' : 'Fluency',
      language === 'vi' ? 'Ngữ pháp' : 'Grammar',
      language === 'vi' ? 'Từ vựng' : 'Vocabulary',
      language === 'vi' ? 'Tính liên kết' : 'Cohesion'
    ];

    radarValues = [
      avg('pronunciation'),
      avg('fluency'),
      avg('grammar'),
      avg('vocabulary'),
      avg('cohesion')
    ];
  } else {
    const avg = (key: string) => {
      return Math.round(processedReviews.reduce((acc, r) => acc + r.computedSubscores[key], 0) / processedReviews.length);
    };

    radarLabels = [
      language === 'vi' ? 'Hoàn thành ý' : 'Task Completion',
      language === 'vi' ? 'Tính liên kết' : 'Cohesion',
      language === 'vi' ? 'Ngữ pháp' : 'Grammar',
      language === 'vi' ? 'Từ vựng' : 'Vocabulary'
    ];

    radarValues = [
      avg('taskCompletion'),
      avg('cohesion'),
      avg('grammar'),
      avg('vocabulary')
    ];
  }

  const isDark = theme === 'dark';
  const textColor = isDark ? '#FBF8F6' : '#160904';
  const gridColor = isDark ? '#403225' : '#E6DFD9';
  const accentColor = isDark ? '#BEA45F' : '#938053';
  const accentLight = isDark ? 'rgba(190, 164, 95, 0.2)' : 'rgba(147, 128, 83, 0.2)';

  const radarData = {
    labels: radarLabels,
    datasets: [
      {
        label: language === 'vi' ? 'Điểm thành phần' : 'Subscores',
        data: radarValues,
        backgroundColor: accentLight,
        borderColor: accentColor,
        borderWidth: 2,
        pointBackgroundColor: accentColor,
        pointBorderColor: isDark ? '#000' : '#fff',
        pointHoverBackgroundColor: isDark ? '#000' : '#fff',
        pointHoverBorderColor: accentColor,
      },
    ],
  };

  const radarOptions = {
    scales: {
      r: {
        angleLines: {
          color: gridColor,
        },
        grid: {
          color: gridColor,
        },
        pointLabels: {
          color: textColor,
          font: {
            size: 10,
            weight: 'bold' as const
          }
        },
        ticks: {
          color: textColor,
          backdropColor: 'transparent',
          font: {
            size: 8,
          },
          stepSize: 20
        },
        min: 0,
        max: 100,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  };

  const handleExportPrompt = async () => {
    let promptText = "Vui lòng đóng vai một giám khảo TOEIC Speaking & Writing chuyên nghiệp và chấm điểm các câu trả lời sau của tôi dựa trên tiêu chí chấm điểm chính thức. Đối với mỗi câu hỏi, hãy cung cấp điểm, sửa lỗi ngữ pháp, nhận xét chi tiết và bài mẫu đạt điểm tối đa.\n\n";
    
    reviews.forEach((rev, idx) => {
      promptText += `--- CÂU HỎI ${idx + 1} (${rev.partTitle.toUpperCase()}) ---\n`;
      promptText += `Đề bài: ${rev.questionText}\n`;
      
      // Chuyển link ảnh thành đường dẫn tuyệt đối nếu cần (giả sử website host ở window.location.origin)
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mastertoeic.vercel.app';
      if (rev.image) {
        const fullImageUrl = rev.image.startsWith('http') ? rev.image : origin + rev.image;
        promptText += `Hình ảnh đính kèm: ${fullImageUrl}\n`;
      }
      if (rev.description) promptText += `Mô tả ảnh của hệ thống: ${rev.description}\n`;
      if (rev.words && rev.words.length > 0) promptText += `Từ khóa bắt buộc: ${rev.words.join(', ')}\n`;
      promptText += `\nCâu trả lời của tôi:\n${rev.userAnswer || rev.answer || '(Không có câu trả lời)'}\n\n`;
    });

    try {
      await navigator.clipboard.writeText(promptText);
      alert(language === 'vi' ? 'Đã copy toàn bộ đề, link ảnh và câu trả lời! Bạn có thể dán vào ChatGPT hoặc Gemini để tự chấm.' : 'Copied! You can now paste this to ChatGPT or Gemini to self-grade.');
    } catch (e) {
      alert('Lỗi copy. Trình duyệt không hỗ trợ.');
    }
  };

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
      noGrammarErrors: 'Tuyệt vời! Không phát hiện lỗi ngữ pháp rõ rệt.',
      imagePrompt: 'Hình ảnh câu hỏi:',
      imageDesc: 'Mô tả hình ảnh của AI:',
      requiredWords: 'Từ khóa bắt buộc:',
      unauthAlert: 'Tính năng chấm điểm AI bị khóa đối với tài khoản của bạn để tránh quá tải máy chủ. Đừng lo, bạn vẫn có thể ấn nút bên dưới để copy toàn bộ câu trả lời kèm link ảnh để tự chấm bằng ChatGPT/Gemini của riêng bạn!',
      exportAI: 'Copy Đề & Câu trả lời (Để tự chấm AI)'
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
      noGrammarErrors: 'Excellent! No major grammar errors detected.',
      imagePrompt: 'Question Image:',
      imageDesc: 'AI Image Description Reference:',
      requiredWords: 'Required Keywords:',
      unauthAlert: 'AI grading is locked for your account to prevent server overload. Don\'t worry, you can click the button below to copy all your answers and image links to self-grade using your own ChatGPT/Gemini!',
      exportAI: 'Copy Test & Answers (For your own AI)'
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{testTitle}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>{t.date}: {date}</p>

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
          
          {/* Radar Chart Visual */}
          <div style={{ height: '220px', width: '100%', maxWidth: '340px', margin: '0 auto', position: 'relative' }}>
            <Radar data={radarData} options={radarOptions} />
          </div>
        </div>
      </div>

      {unauthorizedForAI && (
        <div style={{ background: 'var(--background-secondary)', border: '1px solid var(--accent)', borderLeft: '4px solid var(--accent)', padding: '16px', marginBottom: '24px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertCircle size={20} style={{ color: 'var(--accent)' }} />
            <h4 style={{ color: 'var(--accent)', fontSize: '1.05rem', fontWeight: 'bold' }}>
              {language === 'vi' ? 'Tài khoản của bạn chưa được cấp quyền dùng AI!' : 'AI Grading is not enabled for your account!'}
            </h4>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', lineHeight: '1.5' }}>
            {t.unauthAlert}
          </p>
          <button className="btn-accent" onClick={handleExportPrompt} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontWeight: 'bold' }}>
            <Copy size={16} /> {t.exportAI}
          </button>
        </div>
      )}

      {/* Detailed Question Review List */}
      <div>
        <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={20} style={{ color: 'var(--accent)' }} /> {t.questionList}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.map((rev, idx) => {
            const isExpanded = expandedIndex === idx;
            const displayAnswer = rev.userAnswer || rev.answer || '';
            
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
                      <p style={{ fontSize: '0.95rem', fontStyle: 'italic', marginBottom: '12px' }}>{rev.questionText}</p>
                      
                      {rev.words && rev.words.length > 0 && (
                        <div style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{t.requiredWords} </span>
                          <span style={{ background: 'var(--background-secondary)', padding: '2px 8px', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)' }}>
                            {rev.words.join(', ')}
                          </span>
                        </div>
                      )}

                      {rev.image && (
                        <div style={{ marginBottom: '16px' }}>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold', marginBottom: '6px' }}>{t.imagePrompt}</p>
                          <div style={{ maxWidth: '400px', border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--background-secondary)' }}>
                            <img 
                              src={rev.image} 
                              alt="TOEIC question" 
                              style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', display: 'block' }} 
                            />
                          </div>
                        </div>
                      )}

                      {rev.description && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--background-secondary)', padding: '10px 12px', borderLeft: '3px solid var(--accent)', marginTop: '8px' }}>
                          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>{t.imageDesc}</strong>
                          <span style={{ fontStyle: 'italic' }}>{rev.description}</span>
                        </div>
                      )}
                    </div>

                    {/* Audio playback if Speaking */}
                    {rev.audioUrl && (
                      <div className="review-audio-box">
                        <p style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.listenSpeech}</p>
                        <AudioPlayer src={rev.audioUrl} />
                      </div>
                    )}

                    {/* User Answer */}
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Edit3 size={16} /> {t.userAnswer}
                      </h4>
                      <div className="review-answer-box">
                        {displayAnswer}
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
