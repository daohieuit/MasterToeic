import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Award, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Play, Pause, ArrowLeft, RefreshCw, BookOpen, Edit3, Image as ImageIcon, Copy, Download, FastForward } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import toast from 'react-hot-toast';
import { mergeAudioResponses } from '@/utils/audio';
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
  section?: string;
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
        aria-label="Audio timeline"
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

  const [pastedJson, setPastedJson] = useState('');
  const [localSpeakingScore, setLocalSpeakingScore] = useState<number | null>(speakingScore);
  const [localWritingScore, setLocalWritingScore] = useState<number | null>(writingScore);
  const [localReviews, setLocalReviews] = useState<QuestionReview[]>(reviews);
  const [mergingAudio, setMergingAudio] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);

  const getPromptTemplate = (title: string, revs: any[]) => {
    const promptData = {
      testTitle: title,
      speakingAnswers: revs
        .filter(r => r.section === 'speaking')
        .map((r, i) => ({
          questionIndex: i + 1,
          part: r.partTitle,
          prompt: r.questionText,
          imageDescriptionReference: r.description || null,
          requiredKeywords: r.words || [],
          userSpeechTranscription: r.userAnswer || r.answer || ''
        })),
      writingAnswers: revs
        .filter(r => r.section === 'writing')
        .map((r, i) => ({
          questionIndex: i + 1,
          part: r.partTitle,
          prompt: r.questionText,
          imageDescriptionReference: r.description || null,
          requiredKeywords: r.words || [],
          userWrittenResponse: r.userAnswer || r.answer || ''
        }))
    };

    return `Bạn là giám khảo chấm thi TOEIC Speaking & Writing chuyên nghiệp.
Tôi gửi cho bạn tệp âm thanh WAV ghi lại phần nói của tôi và tệp JSON dữ liệu bài làm dưới đây.
Nếu bài làm có phần Speaking, vui lòng NGHE kỹ file âm thanh WAV đính kèm theo thứ tự câu hỏi để chấm điểm phát âm (Pronunciation), độ trôi chảy (Fluency) và tính liên kết. Nếu không có âm thanh cho câu nào, hãy dùng đoạn Text Transcription làm căn cứ.

Thông tin bài làm:
\`\`\`json
${JSON.stringify(promptData, null, 2)}
\`\`\`

Hãy đánh giá và chấm điểm theo tiêu chí thi TOEIC chính thức (thang điểm 0-200 cho Speaking và 0-200 cho Writing).
Trả về kết quả chấm điểm bằng Tiếng Việt. Bạn BẮT BUỘC phải trả về cấu trúc định dạng JSON chuẩn sau đây, không thêm bất kỳ văn bản giải thích nào khác ngoài JSON:

{
  "speakingScore": [Điểm Speaking tổng hợp từ 0 đến 200, hoặc null nếu không thi Speaking],
  "writingScore": [Điểm Writing tổng hợp từ 0 đến 200, hoặc null nếu không thi Writing],
  "reviews": [
    {
      "questionNumber": [Số thứ tự câu hỏi từ 1 trở đi],
      "score": [Điểm câu hỏi từ 0 đến 100],
      "feedback": "[Nhận xét chi tiết bằng tiếng Việt, sửa phát âm hoặc cách diễn đạt]",
      "grammarErrors": [
        {
          "original": "[Lỗi sai trong câu trả lời của người dùng]",
          "correction": "[Câu đúng sau khi sửa]",
          "explanation": "[Giải thích ngắn gọn lý do sửa bằng tiếng Việt]"
        }
      ],
      "subscores": {
        "pronunciation": [0-100, chỉ áp dụng cho Speaking, còn lại null],
        "fluency": [0-100, chỉ áp dụng cho Speaking, còn lại null],
        "taskCompletion": [0-100],
        "grammar": [0-100],
        "vocabulary": [0-100],
        "cohesion": [0-100]
      }
    }
  ]
}`;
  };

  const handleApplyJson = () => {
    if (!pastedJson.trim()) {
      toast.error(language === 'vi' ? 'Vui lòng dán dữ liệu JSON!' : 'Please paste the JSON data!');
      return;
    }

    try {
      let cleaned = pastedJson.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '');
      }
      
      const parsed = JSON.parse(cleaned);

      if (parsed.speakingScore !== undefined) {
        setLocalSpeakingScore(parsed.speakingScore);
      }
      if (parsed.writingScore !== undefined) {
        setLocalWritingScore(parsed.writingScore);
      }

      if (Array.isArray(parsed.reviews)) {
        const updatedReviews = localReviews.map((origReview, idx) => {
          const parsedRev = parsed.reviews.find((r: any) => r.questionNumber === (idx + 1));
          if (parsedRev) {
            return {
              ...origReview,
              score: parsedRev.score ?? origReview.score,
              feedback: parsedRev.feedback ?? origReview.feedback,
              grammarErrors: parsedRev.grammarErrors ?? origReview.grammarErrors,
              subscores: parsedRev.subscores ?? origReview.subscores
            };
          }
          return origReview;
        });
        setLocalReviews(updatedReviews);
        
        // Update history item in localStorage for persistence
        try {
          const savedHistory = localStorage.getItem('toeic_sw_history');
          if (savedHistory) {
            const historyList = JSON.parse(savedHistory);
            // Match based on date or testTitle or ID if matching attempt
            const testAttempt = historyList.find((h: any) => h.testTitle === testTitle && h.date === date);
            if (testAttempt) {
              testAttempt.speakingScore = parsed.speakingScore ?? testAttempt.speakingScore;
              testAttempt.writingScore = parsed.writingScore ?? testAttempt.writingScore;
              testAttempt.reviews = updatedReviews;
              localStorage.setItem('toeic_sw_history', JSON.stringify(historyList));
            }
          }
        } catch (e) {
          console.error('Failed to sync updated score to history storage:', e);
        }

        toast.success(language === 'vi' ? 'Đã cập nhật điểm số và nhận xét từ AI thành công!' : 'Scores and AI reviews updated successfully!');
      } else {
        toast.error(language === 'vi' ? 'Định dạng JSON không chứa danh sách reviews!' : 'JSON format does not contain reviews array!');
      }
    } catch (e) {
      console.error(e);
      toast.error(language === 'vi' ? 'Lỗi phân tích JSON. Vui lòng kiểm tra lại định dạng dán vào!' : 'JSON parsing error. Please check the format!');
    }
  };

  const handleDownloadMaterials = async () => {
    handleExportJson();

    const speakingCount = localReviews.filter(r => r.section === 'speaking' && r.audioUrl).length;
    if (speakingCount > 0) {
      setMergingAudio(true);
      setMergeProgress(0);
      try {
        const wavBlob = await mergeAudioResponses(localReviews, (p) => setMergeProgress(p));
        if (wavBlob) {
          const url = URL.createObjectURL(wavBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `toeic_speaking_merged_${Date.now()}.wav`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success(language === 'vi' ? 'Đã tải xuống file âm thanh thành công!' : 'Audio downloaded successfully!');
        } else {
          toast.error(language === 'vi' ? 'Lỗi gộp âm thanh!' : 'Failed to merge audio!');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error generating audio.');
      } finally {
        setMergingAudio(false);
      }
    }
  };

  // Helper to generate deterministic subscores for older history items
  const getDeterministicSubscores = (rev: any): Record<string, number> => {
    const baseScore = rev.score !== null && rev.score !== undefined ? rev.score : 0;
    
    if (rev.subscores && typeof rev.subscores === 'object') {
      return {
        pronunciation: rev.subscores.pronunciation ?? baseScore,
        fluency: rev.subscores.fluency ?? baseScore,
        taskCompletion: rev.subscores.taskCompletion ?? baseScore,
        grammar: rev.subscores.grammar ?? baseScore,
        vocabulary: rev.subscores.vocabulary ?? baseScore,
        cohesion: rev.subscores.cohesion ?? baseScore,
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
      pronunciation: clamp(baseScore + delta1),
      fluency: clamp(baseScore + delta2),
      taskCompletion: clamp(baseScore + delta1),
      grammar: clamp(baseScore + delta3),
      vocabulary: clamp(baseScore + delta4),
      cohesion: clamp(baseScore + ((delta1 + delta2) >> 1)),
    };
  };

  const isSpeakingTest = localSpeakingScore !== null || reviews.some(r => r.section === 'speaking');
  const isWritingTest = localWritingScore !== null || reviews.some(r => r.section === 'writing');
  const isFullTest = reviews.some(r => r.section === 'speaking') && reviews.some(r => r.section === 'writing');

  const processedReviews = localReviews.map(rev => ({
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

  const handleExportJson = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mastertoeic.vercel.app';
    const exportData = {
      testTitle: testTitle,
      date: date,
      questions: localReviews.map((rev, idx) => ({
        questionNumber: idx + 1,
        part: rev.partTitle,
        prompt: rev.questionText,
        image: rev.image ? (rev.image.startsWith('http') ? rev.image : origin + rev.image) : null,
        requiredWords: rev.words || [],
        systemImageDescription: rev.description || null,
        sampleAnswer: rev.sampleAnswer || null,
        userAnswer: rev.userAnswer || rev.answer || null,
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toeic_result_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      exportAI: 'Copy Đề & Câu trả lời (Để tự chấm AI)',
      exportJson: 'Xuất file JSON (Để tự chấm bằng Gemini Web)'
    },
    en: {
      title: 'Practice Review & Evaluation',
      date: 'Date completed',
      scoreOverview: 'Score Overview',
      speakingScore: 'Speaking Score',
      writingScore: 'Writing Score',
      questionList: 'Questions & Evaluations',
      userAnswer: 'Your Response',
      score: 'Question Score',
      grammarTitle: 'Grammar & Vocabulary Corrections',
      feedbackTitle: 'Feedback & Advice',
      sampleTitle: 'Model Reference Answer',
      backDashboard: 'Back to Dashboard',
      listenSpeech: 'Listen to your response:',
      noGrammarErrors: 'Excellent! No major grammar errors detected.',
      imagePrompt: 'Question Image:',
      imageDesc: 'System Image Description Reference:',
      requiredWords: 'Required Keywords:',
      unauthAlert: 'AI grading is disabled. Please export JSON to self-grade.',
      exportAI: 'Copy Test & Answers (For your own AI)',
      exportJson: 'Export JSON (For Gemini Web)'
    }
  }[language];

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="fade-in review-container">
      
      {/* Back to Dashboard & Export */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
          <ArrowLeft size={16} /> {t.backDashboard}
        </Link>
        <button 
          className="btn-primary" 
          onClick={handleDownloadMaterials} 
          disabled={mergingAudio}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 'bold' }}
        >
          <Download size={16} /> 
          {mergingAudio 
            ? `${language === 'vi' ? 'Đang gộp...' : 'Merging...'} (${mergeProgress}%)` 
            : (language === 'vi' ? 'Tải JSON & Audio' : 'Download JSON & Audio')}
        </button>
      </div>

      {/* Header Panel */}
      <div className="card-sharp review-header-panel">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{testTitle}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>{t.date}: {date}</p>
 
            {/* Score blocks */}
            <div className="review-score-grid">
              {isSpeakingTest && (
                <div className="review-score-card">
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.speakingScore}</span>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                    {localSpeakingScore !== null ? `${localSpeakingScore}/200` : (language === 'vi' ? 'Chờ chấm' : 'Pending')}
                  </span>
                </div>
              )}
              {isWritingTest && (
                <div className="review-score-card">
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.writingScore}</span>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>
                    {localWritingScore !== null ? `${localWritingScore}/200` : (language === 'vi' ? 'Chờ chấm' : 'Pending')}
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

      {/* Self-grading Panel */}
      <div className="card-sharp" style={{ background: 'var(--background-secondary)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', margin: '24px 0', border: '1px solid var(--accent)' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Award size={20} />
          {language === 'vi' ? 'Chấm điểm tự phục vụ bằng Gemini Web' : 'Self-grading via Gemini Web'}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
          {language === 'vi'
            ? 'Để chấm điểm và nhận xét chi tiết 100% miễn phí, bạn hãy thực hiện theo 3 bước đơn giản dưới đây:'
            : 'To grade and get detailed comments 100% free, follow these 3 simple steps:'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.85rem', marginTop: '8px' }}>
          <div style={{ background: 'var(--background)', padding: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '6px' }}>1. {language === 'vi' ? 'Tải tư liệu' : 'Download Materials'}</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', margin: 0 }}>
                {language === 'vi' ? 'Tải file JSON đề bài và file âm thanh WAV đã gộp bài nói của bạn.' : 'Download the exported JSON and your merged WAV audio file.'}
              </p>
            </div>
            <div style={{ marginTop: '12px' }}>
              <button 
                className="btn-accent" 
                onClick={handleDownloadMaterials} 
                disabled={mergingAudio}
                style={{ width: '100%', padding: '8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <Download size={14} />
                {mergingAudio ? `${language === 'vi' ? 'Đang gộp...' : 'Merging...'} (${mergeProgress}%)` : (language === 'vi' ? 'Tải JSON & Audio' : 'Download JSON & Audio')}
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--background)', padding: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '6px' }}>2. {language === 'vi' ? 'Gửi cho Gemini Web' : 'Send to Gemini Web'}</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', margin: 0 }}>
                {language === 'vi' ? 'Copy Prompt ở dưới, vào Gemini Web, tải file WAV + JSON lên và paste prompt.' : 'Copy the prompt below, open Gemini Web, upload the audio WAV + JSON, and paste the prompt.'}
              </p>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => {
                  navigator.clipboard.writeText(getPromptTemplate(testTitle, localReviews));
                  toast.success(language === 'vi' ? 'Đã copy prompt chấm điểm!' : 'Prompt copied!');
                }} 
                style={{ flex: 1, padding: '8px 4px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <Copy size={12} />
                {language === 'vi' ? 'Copy Prompt' : 'Copy Prompt'}
              </button>
              <a 
                href="https://gemini.google.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-secondary" 
                style={{ flex: 1, padding: '8px 4px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Mở Gemini &rarr;
              </a>
            </div>
          </div>

          <div style={{ background: 'var(--background)', padding: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '6px' }}>3. {language === 'vi' ? 'Nhập kết quả' : 'Paste Result'}</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', margin: 0 }}>
                {language === 'vi' ? 'Dán đoạn mã JSON nhận xét mà Gemini Web trả ra vào đây rồi bấm Áp dụng.' : 'Paste the result JSON code returned by Gemini Web below and click Apply.'}
              </p>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder={language === 'vi' ? 'Dán JSON của Gemini...' : 'Paste Gemini JSON...'}
                style={{ flex: 1, height: '32px', minHeight: '32px', fontSize: '0.75rem', padding: '4px', background: 'var(--background-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', resize: 'none' }}
              />
              <button 
                className="btn-primary" 
                onClick={handleApplyJson}
                style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 'bold' }}
              >
                {language === 'vi' ? 'Dán' : 'Apply'}
              </button>
            </div>
          </div>
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
