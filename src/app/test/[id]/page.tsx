'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/utils/supabase';
import SpeakingConsole from '@/components/SpeakingConsole';
import WritingConsole from '@/components/WritingConsole';
import ReviewConsole from '@/components/ReviewConsole';
import PartIntroScreen from '@/components/PartIntroScreen';
import ConfirmModal from '@/components/ConfirmModal';
import { AlertCircle, RefreshCw, Activity, ArrowRight, Loader } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

interface TestParams {
  id: string;
}

export default function TestPage({ params }: { params: Promise<TestParams> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const { language, adminApiKey, adminBaseUrl, user } = useApp();

  // Test setup variables
  const testId = resolvedParams.id;
  const mode = searchParams.get('mode') || 'full'; // 'full' | 'speaking' | 'writing' | 'part'
  const skill = searchParams.get('skill') || 'speaking';
  const part = parseInt(searchParams.get('part') || '0', 10);
  const customTime = searchParams.get('customTime') === 'true';
  const spMult = parseFloat(searchParams.get('spMult') || '1');
  const wrMult = parseFloat(searchParams.get('wrMult') || '1');
  const isStarted = searchParams.get('started') === 'true';

  // Attempt evaluation ID for direct history review
  const attemptId = searchParams.get('attemptId');

  // Loading states
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);

  // Exam flow states
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]); // Array of { questionId, answer, audioUrl }
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  
  // New States for Intro and Confirm
  const [shownIntroForPart, setShownIntroForPart] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Lobby & Transition States
  const [lobbyMode, setLobbyMode] = useState<'full' | 'speaking' | 'writing' | 'part'>('full');
  const [lobbySkill, setLobbySkill] = useState<'speaking' | 'writing'>('speaking');
  const [lobbyPart, setLobbyPart] = useState<number>(1);
  const [lobbyCustomTime, setLobbyCustomTime] = useState<boolean>(false);
  const [lobbySpMult, setLobbySpMult] = useState<number>(1);
  const [lobbyWrMult, setLobbyWrMult] = useState<number>(1);
  const [showSkillTransition, setShowSkillTransition] = useState<boolean>(false);

  useEffect(() => {
    if (testData) {
      if (testData.speaking && testData.writing) {
        setLobbyMode('full');
      } else if (testData.speaking) {
        setLobbyMode('speaking');
        setLobbySkill('speaking');
      } else if (testData.writing) {
        setLobbyMode('writing');
        setLobbySkill('writing');
      }
    }
  }, [testData]);

  // Load Test Data and filter questions
  useEffect(() => {
    const initTest = async () => {
      setLoading(true);
      // 1. Get test object (check local/cloud custom tests first)
      let selectedTest: any = null;
      
      // Try to load custom test from database first (Public for everyone)
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('custom_tests')
            .select('*')
            .eq('id', testId)
            .single();
          if (!error && data) {
            selectedTest = {
              id: data.id,
              title: data.title,
              description: data.description,
              speaking: data.speaking_data,
              writing: data.writing_data
            };
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      // Fallback to localStorage if not found in db or db error
      if (!selectedTest) {
        const savedTests = localStorage.getItem('toeic_sw_custom_tests');
        if (savedTests) {
          try {
            const list = JSON.parse(savedTests);
            selectedTest = list.find((t: any) => t.id === testId);
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (!selectedTest) {
        toast.error(language === 'vi' ? 'Không tìm thấy đề thi này!' : 'Test not found!');
        router.push('/');
        return;
      }
      setTestData(selectedTest);

      // If we are just reviewing a past attempt
      if (attemptId) {
        // Try fetching from database first if user logged in
        if (user && supabase) {
          try {
            const { data, error } = await supabase
              .from('practice_history')
              .select('*')
              .eq('id', attemptId)
              .single();
            
            if (!error && data) {
              const mappedReview = {
                id: data.id,
                testId: data.test_id,
                testTitle: data.test_title,
                date: new Date(data.date).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                speakingScore: data.speaking_score,
                writingScore: data.writing_score,
                reviews: data.reviews
              };
              setReviewData(mappedReview);
              setShowReview(true);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Failed to load DB attempt review:', e);
          }
        }

        // Guest fallback
        const savedHistory = localStorage.getItem('toeic_sw_history');
        if (savedHistory) {
          try {
            const list = JSON.parse(savedHistory);
            const pastAttempt = list.find((h: any) => h.id === attemptId);
            if (pastAttempt) {
              setReviewData(pastAttempt);
              setShowReview(true);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      // 2. Filter questions according to mode with auto-correct safeguard
      const hasSpeaking = !!selectedTest.speaking && selectedTest.speaking.length > 0;
      const hasWriting = !!selectedTest.writing && selectedTest.writing.length > 0;
      
      let activeMode = mode;
      let activeSkill = skill;
      
      if (hasWriting && !hasSpeaking) {
        if (activeMode === 'speaking' || activeMode === 'full') {
          activeMode = 'writing';
        }
        if (activeMode === 'part' && activeSkill === 'speaking') {
          activeSkill = 'writing';
        }
      } else if (hasSpeaking && !hasWriting) {
        if (activeMode === 'writing' || activeMode === 'full') {
          activeMode = 'speaking';
        }
        if (activeMode === 'part' && activeSkill === 'writing') {
          activeSkill = 'speaking';
        }
      }

      let filteredQuestions: any[] = [];

      if (activeMode === 'full') {
        if (selectedTest.speaking) {
          selectedTest.speaking.forEach((p: any) => {
            p.questions.forEach((q: any) => {
              filteredQuestions.push({
                ...q,
                partTitle: p.partTitle,
                referenceInfo: p.referenceInfo,
                section: 'speaking'
              });
            });
          });
        }
        if (selectedTest.writing) {
          selectedTest.writing.forEach((p: any) => {
            p.questions.forEach((q: any) => {
              filteredQuestions.push({
                ...q,
                partTitle: p.partTitle,
                section: 'writing'
              });
            });
          });
        }
      } else if (activeMode === 'speaking') {
        if (selectedTest.speaking) {
          selectedTest.speaking.forEach((p: any) => {
            p.questions.forEach((q: any) => {
              filteredQuestions.push({
                ...q,
                partTitle: p.partTitle,
                referenceInfo: p.referenceInfo,
                section: 'speaking'
              });
            });
          });
        }
      } else if (activeMode === 'writing') {
        if (selectedTest.writing) {
          selectedTest.writing.forEach((p: any) => {
            p.questions.forEach((q: any) => {
              filteredQuestions.push({
                ...q,
                partTitle: p.partTitle,
                section: 'writing'
              });
            });
          });
        }
      } else if (activeMode === 'part') {
        if (activeSkill === 'speaking' && selectedTest.speaking) {
          const p = selectedTest.speaking.find((x: any) => x.part === part);
          if (p) {
            p.questions.forEach((q: any) => {
              filteredQuestions.push({
                ...q,
                partTitle: p.partTitle,
                referenceInfo: p.referenceInfo,
                section: 'speaking'
              });
            });
          }
        } else if (activeSkill === 'writing' && selectedTest.writing) {
          const p = selectedTest.writing.find((x: any) => x.part === part);
          if (p) {
            p.questions.forEach((q: any) => {
              filteredQuestions.push({
                ...q,
                partTitle: p.partTitle,
                section: 'writing'
              });
            });
          }
        }
      }


      setQuestions(filteredQuestions);
      setCurrentIdx(0);
      setAnswers([]);
      setLoading(false);
    };

    initTest();
  }, [testId, mode, skill, part, attemptId, user, isStarted, language]);

  // Sync searchParams to lobby state
  useEffect(() => {
    if (searchParams.get('mode')) {
      setLobbyMode(searchParams.get('mode') as any);
    }
    if (searchParams.get('skill')) {
      setLobbySkill(searchParams.get('skill') as any);
    }
    if (searchParams.get('part')) {
      setLobbyPart(parseInt(searchParams.get('part') || '1', 10));
    }
    if (searchParams.get('customTime')) {
      setLobbyCustomTime(searchParams.get('customTime') === 'true');
    }
    if (searchParams.get('spMult')) {
      setLobbySpMult(parseFloat(searchParams.get('spMult') || '1'));
    }
    if (searchParams.get('wrMult')) {
      setLobbyWrMult(parseFloat(searchParams.get('wrMult') || '1'));
    }
  }, [searchParams]);

  // Activate Zen Mode body tag
  useEffect(() => {
    if (!showReview && isStarted) {
      document.body.classList.add('zen-mode');
    } else {
      document.body.classList.remove('zen-mode');
    }
    return () => {
      document.body.classList.remove('zen-mode');
    };
  }, [showReview, isStarted]);

  const handleNextQuestion = (answerText: string, audioUrl: string | null = null) => {
    const currentQ = questions[currentIdx];
    
    const newAnswers = [
      ...answers,
      {
        questionId: currentQ.id,
        type: currentQ.type,
        partTitle: currentQ.partTitle,
        questionText: currentQ.text || (currentQ.type === 'describe_picture' ? 'Describe the picture shown.' : 'Respond using information.'),
        answer: answerText,
        audioUrl: audioUrl,
        section: currentQ.section,
        image: currentQ.image || null,
        words: currentQ.words || null,
        referenceInfo: currentQ.referenceInfo || null,
        description: currentQ.description || null
      }
    ];
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      const nextQ = questions[currentIdx + 1];
      if (currentQ.section === 'speaking' && nextQ.section === 'writing') {
        setShowSkillTransition(true);
      } else {
        setCurrentIdx((prev) => prev + 1);
      }
    } else {
      evaluateTest(newAnswers);
    }
  };

  const handleProceedToWriting = () => {
    setShowSkillTransition(false);
    setCurrentIdx((prev) => prev + 1);
  };

  const evaluateTest = async (allAnswers: any[]) => {
    setEvaluating(true);
    setEvalProgress(0);
    
    const evaluationResults: any[] = [];
    let spScoreSum = 0;
    let spCount = 0;
    let wrScoreSum = 0;
    let wrCount = 0;
    let isUnauthorized = false;
    let unauthorizedMessage = '';

    const localKey = localStorage.getItem('admin_api_key') || adminApiKey || '';
    const localUrl = localStorage.getItem('admin_base_url') || adminBaseUrl || 'http://localhost:8081/v1';

    // Get current session token for API authorization
    let sessionToken = '';
    if (user && supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        sessionToken = data.session.access_token;
      }
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < allAnswers.length; i++) {
      const ans = allAnswers[i];
      setEvalProgress(Math.round((i / allAnswers.length) * 100));

      const isBlank = !ans.answer || 
                      ans.answer.trim() === '' || 
                      ans.answer === '(No response provided)' || 
                      ans.answer === '(No speech recorded)' ||
                      ans.answer.trim() === '(No speech recorded)' ||
                      ans.answer.trim() === '(No response provided)';

      if (isBlank) {
        evaluationResults.push({
          ...ans,
          userAnswer: ans.answer,
          score: 0,
          feedback: language === 'vi' ? 'Không có câu trả lời. Bạn nhận 0 điểm cho câu hỏi này.' : 'No response provided. You receive 0 points for this question.',
          grammarErrors: [],
          sampleAnswer: ''
        });

        if (ans.section === 'speaking') {
          spCount++;
        } else {
          wrCount++;
        }
        continue;
      }

      if (isUnauthorized) {
        // If already flagged as unauthorized, skip calling API
        evaluationResults.push({
          ...ans,
          userAnswer: ans.answer,
          score: 0,
          feedback: unauthorizedMessage || 'Tài khoản không có quyền chấm AI.',
          grammarErrors: [],
          sampleAnswer: ''
        });
        if (ans.section === 'speaking') spCount++; else wrCount++;
        continue;
      }

      // Add a small delay between requests to avoid Gemini API rate limits (429)
      if (i > 0) {
        await sleep(800);
      }

      try {
        const response = await fetch('/api/eval', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-gemini-api-key': localKey,
            'x-gemini-base-url': localUrl,
            ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
          },
          body: JSON.stringify({
            question: ans.questionText,
            answer: ans.answer,
            type: ans.type,
            details: {
              image: ans.image,
              words: ans.words,
              referenceInfo: ans.referenceInfo,
              imageDescription: ans.description
            }
          })
        });

        if (response.status === 403) {
          const errData = await response.json();
          if (errData.isUnauthorized) {
            isUnauthorized = true;
            unauthorizedMessage = errData.error;
            evaluationResults.push({
              ...ans,
              userAnswer: ans.answer,
              score: 0,
              feedback: unauthorizedMessage,
              grammarErrors: [],
              sampleAnswer: ''
            });
            if (ans.section === 'speaking') spCount++; else wrCount++;
            continue;
          }
        }

        if (!response.ok) {
          throw new Error('Chấm điểm thất bại');
        }

        const evaluation = await response.json();
        
        evaluationResults.push({
          ...ans,
          userAnswer: ans.answer,
          score: evaluation.score || 0,
          feedback: evaluation.feedback || 'Không thể đánh giá.',
          grammarErrors: evaluation.grammarErrors || [],
          sampleAnswer: evaluation.sampleAnswer || ''
        });

        if (ans.section === 'speaking') {
          spScoreSum += evaluation.score || 0;
          spCount++;
        } else {
          wrScoreSum += evaluation.score || 0;
          wrCount++;
        }
      } catch (err) {
        console.error('Error evaluating question:', ans.questionId, err);
        evaluationResults.push({
          ...ans,
          userAnswer: ans.answer,
          score: 0,
          feedback: 'Lỗi kết nối API. Không thể chấm bài cho câu hỏi này.',
          grammarErrors: [],
          sampleAnswer: 'API Connection Error'
        });
        
        if (ans.section === 'speaking') {
          spCount++;
        } else {
          wrCount++;
        }
      }
    }

    setEvalProgress(100);

    const averageSpeaking = (!isUnauthorized && spCount > 0) ? Math.round((spScoreSum / spCount) * 2) : null;
    const averageWriting = (!isUnauthorized && wrCount > 0) ? Math.round((wrScoreSum / wrCount) * 2) : null;

    const attemptResult = {
      testId: testData.id,
      testTitle: testData.title,
      mode: mode,
      partName: mode === 'part' ? `${skill.toUpperCase()} Part ${part}` : undefined,
      speakingScore: averageSpeaking,
      writingScore: averageWriting,
      reviews: evaluationResults,
      unauthorizedForAI: isUnauthorized
    };

    // Save Attempt
    let finalAttemptId = `attempt_${Date.now()}`;
    if (user && supabase) {
      // 1. Sync to Supabase Database
      try {
        const { data, error } = await supabase
          .from('practice_history')
          .insert({
            user_id: user.id,
            test_id: attemptResult.testId,
            test_title: attemptResult.testTitle,
            mode: attemptResult.mode,
            part_name: attemptResult.partName || null,
            speaking_score: attemptResult.speakingScore,
            writing_score: attemptResult.writingScore,
            reviews: attemptResult.reviews
          })
          .select();
        
        if (!error && data && data.length > 0) {
          finalAttemptId = data[0].id;
        } else if (error) {
          console.error('Failed to save attempt to Database:', error.message);
        }
      } catch (dbErr) {
        console.error('Failed to save attempt to Database:', dbErr);
      }
    } else {
      // 2. Guest Mode: Save locally
      const savedHistory = localStorage.getItem('toeic_sw_history');
      let historyList = [];
      if (savedHistory) {
        try {
          historyList = JSON.parse(savedHistory);
        } catch (e) {
          console.error(e);
        }
      }
      
      const localAttempt = {
        ...attemptResult,
        id: finalAttemptId,
        date: new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      historyList.unshift(localAttempt);
      localStorage.setItem('toeic_sw_history', JSON.stringify(historyList));
    }

    setReviewData({
      ...attemptResult,
      id: finalAttemptId,
      date: new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    });
    
    setEvaluating(false);
    setShowReview(true);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const t = {
    vi: {
      loading: 'Đang tải đề thi...',
      evaluating: 'AI Đang chấm điểm và viết nhận xét...',
      progress: 'Tiến độ',
      question: 'Câu hỏi',
      quitConfirm: 'Bạn có chắc chắn muốn rời phòng thi không? Tiến trình hiện tại sẽ bị mất.',
      backHome: 'Trở về trang chủ',
      lobbyTitle: 'Phòng chờ thi',
      lobbyDesc: 'Vui lòng cấu hình thời gian và chọn chế độ làm bài thi.',
      lobbyDetails: 'Chi tiết đề thi',
      lobbyConfig: 'Cấu hình thi',
      lobbyFull: 'Thi Cả 2 Kỹ Năng (Full Test)',
      lobbyFullDesc: 'Làm lần lượt 11 câu Speaking và 8 câu Writing. Có nghỉ giữa giờ.',
      lobbySpeaking: 'Luyện Kỹ Năng Nói (Speaking)',
      lobbySpeakingDesc: 'Luyện độc lập 11 câu hỏi Nói. Thời gian chuẩn: 20 phút.',
      lobbyWriting: 'Luyện Kỹ Năng Viết (Writing)',
      lobbyWritingDesc: 'Luyện độc lập 8 câu hỏi Viết. Thời gian chuẩn: 60 phút.',
      lobbyPart: 'Luyện từng Part cụ thể',
      lobbyPartDesc: 'Chọn riêng một part bất kỳ để luyện tập tập trung.',
      lobbyStart: 'Bắt đầu làm bài',
      lobbyBack: 'Quay lại Trang chủ',
      lobbyChoosePart: 'Chọn Part cần luyện tập',
      spPart: 'Speaking - Part',
      wrPart: 'Writing - Part',
      timeSettings: 'Cấu hình thời gian',
      standardTime: 'Thời gian chuẩn (TOEIC)',
      customTimeLabel: 'Tự chỉnh thời gian (Dành cho ôn luyện)',
      speakingTimeScale: 'Thời gian Nói',
      writingTimeScale: 'Thời gian Viết',
      normal: 'Chuẩn',
      extraTime: 'Nhân 1.5 lần',
      halfTime: 'Chia đôi (Thử thách)',
      noLimit: 'Không giới hạn',
      transHeader: 'Chuyển tiếp kỹ năng thi',
      transTitle: 'Đã hoàn thành phần thi Nói (Speaking)!',
      transDesc: 'Bạn đã hoàn tất tất cả 11 câu hỏi của phần thi Nói. Tiếp theo sẽ là phần thi Viết (Writing). Bạn có thể nghỉ giải lao một lát trước khi bắt đầu.',
      transContinue: 'Bắt đầu phần thi Viết'
    },
    en: {
      loading: 'Loading test...',
      evaluating: 'AI is evaluating and writing comments...',
      progress: 'Progress',
      question: 'Question',
      quitConfirm: 'Are you sure you want to leave the exam room? Your progress will be lost.',
      backHome: 'Back to Dashboard',
      lobbyTitle: 'Exam Lobby',
      lobbyDesc: 'Please configure timing and select your practice mode.',
      lobbyDetails: 'Test Structure & Details',
      lobbyConfig: 'Exam Configuration',
      lobbyFull: 'Full Exam (Speaking & Writing)',
      lobbyFullDesc: 'Complete 11 Speaking questions and 8 Writing questions with a break.',
      lobbySpeaking: 'Speaking Skill Practice',
      lobbySpeakingDesc: 'Practice only the 11 speaking questions. Standard time: 20m.',
      lobbyWriting: 'Writing Skill Practice',
      lobbyWritingDesc: 'Practice only the 8 writing questions. Standard time: 60m.',
      lobbyPart: 'Practice Specific Part',
      lobbyPartDesc: 'Select an individual part to focus on a particular skill.',
      lobbyStart: 'Start Exam Now',
      lobbyBack: 'Back to Dashboard',
      lobbyChoosePart: 'Select Part to Practice',
      spPart: 'Speaking - Part',
      wrPart: 'Writing - Part',
      timeSettings: 'Time Customization',
      standardTime: 'Standard Exam Timing',
      customTimeLabel: 'Custom Timing (Practice Mode)',
      speakingTimeScale: 'Speaking Speed',
      writingTimeScale: 'Writing Speed',
      normal: 'Normal',
      extraTime: '1.5x Time',
      halfTime: '0.5x Time (Hard)',
      noLimit: 'No Limit',
      transHeader: 'Skill Section Transition',
      transTitle: 'Speaking Section Completed!',
      transDesc: 'You have completed all 11 questions of the Speaking section. Next is the Writing section. Feel free to take a short break before proceeding.',
      transContinue: 'Start Writing Section'
    }
  }[language];

  const handleExit = () => {
    setShowExitConfirm(true);
  };
  
  const confirmExit = () => {
    setShowExitConfirm(false);
    router.push('/');
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--background)' }}>
        <Loader className="pulse-border" size={32} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>{t.loading}</p>
      </div>
    );
  }

  if (!isStarted && !attemptId) {
    const handleStartExam = () => {
      const params = new URLSearchParams();
      params.set('started', 'true');
      params.set('mode', lobbyMode);
      if (lobbyMode === 'part') {
        params.set('skill', lobbySkill);
        params.set('part', lobbyPart.toString());
      }
      params.set('customTime', lobbyCustomTime.toString());
      params.set('spMult', lobbySpMult.toString());
      params.set('wrMult', lobbyWrMult.toString());
      
      router.replace(`/test/${testId}?${params.toString()}`);
    };

    return (
      <div className="fade-in lobby-container">
        {/* Back link */}
        <div style={{ marginBottom: '24px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => router.push('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            &larr; {t.lobbyBack}
          </button>
        </div>

        {/* Header */}
        <header style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
            {t.lobbyTitle}: {testData?.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t.lobbyDesc}</p>
        </header>

        <div className="lobby-grid">
          {/* Left Column: Test Details */}
          <div className="card-sharp" style={{ background: 'var(--background-secondary)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              {t.lobbyDetails}
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', fontStyle: 'italic' }}>
              &ldquo;{testData?.description}&rdquo;
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              {testData?.speaking && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    TOEIC Speaking (11 câu hỏi / 11 Qs)
                  </h4>
                  <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>Part 1: Read a Text Aloud (Q1-2)</li>
                    <li>Part 2: Describe a Picture (Q3-4)</li>
                    <li>Part 3: Respond to Questions (Q5-7)</li>
                    <li>Part 4: Respond Using Info Provided (Q8-10)</li>
                    <li>Part 5: Express an Opinion (Q11)</li>
                  </ul>
                </div>
              )}

              {testData?.writing && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)', marginTop: testData?.speaking ? '16px' : '0' }}>
                    TOEIC Writing (8 câu hỏi / 8 Qs)
                  </h4>
                  <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>Part 1: Write a Sentence Based on a Picture (Q1-5)</li>
                    <li>Part 2: Respond to a Written Request (Q6-7)</li>
                    <li>Part 3: Write an Opinion Essay (Q8)</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Configuration */}
          <div className="card-sharp" style={{ background: 'var(--background-secondary)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              {t.lobbyConfig}
            </h3>

            {/* Mode selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>
                1. Chọn hình thức thi (Exam Mode)
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {testData?.speaking && testData?.writing && (
                  <label 
                    style={{ 
                      padding: '12px', 
                      border: `1px solid ${lobbyMode === 'full' ? 'var(--text-primary)' : 'var(--border)'}`, 
                      background: lobbyMode === 'full' ? 'var(--accent-light)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="radio" 
                        name="lobby_mode" 
                        checked={lobbyMode === 'full'} 
                        onChange={() => setLobbyMode('full')} 
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{t.lobbyFull}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '22px' }}>
                      {t.lobbyFullDesc}
                    </span>
                  </label>
                )}

                {testData?.speaking && (
                  <label 
                    style={{ 
                      padding: '12px', 
                      border: `1px solid ${lobbyMode === 'speaking' ? 'var(--text-primary)' : 'var(--border)'}`, 
                      background: lobbyMode === 'speaking' ? 'var(--accent-light)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="radio" 
                        name="lobby_mode" 
                        checked={lobbyMode === 'speaking'} 
                        onChange={() => { setLobbyMode('speaking'); setLobbySkill('speaking'); }} 
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{t.lobbySpeaking}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '22px' }}>
                      {t.lobbySpeakingDesc}
                    </span>
                  </label>
                )}

                {testData?.writing && (
                  <label 
                    style={{ 
                      padding: '12px', 
                      border: `1px solid ${lobbyMode === 'writing' ? 'var(--text-primary)' : 'var(--border)'}`, 
                      background: lobbyMode === 'writing' ? 'var(--accent-light)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="radio" 
                        name="lobby_mode" 
                        checked={lobbyMode === 'writing'} 
                        onChange={() => { setLobbyMode('writing'); setLobbySkill('writing'); }} 
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{t.lobbyWriting}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '22px' }}>
                      {t.lobbyWritingDesc}
                    </span>
                  </label>
                )}

                <label 
                  style={{ 
                    padding: '12px', 
                    border: `1px solid ${lobbyMode === 'part' ? 'var(--text-primary)' : 'var(--border)'}`, 
                    background: lobbyMode === 'part' ? 'var(--accent-light)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="radio" 
                      name="lobby_mode" 
                      checked={lobbyMode === 'part'} 
                      onChange={() => setLobbyMode('part')} 
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{t.lobbyPart}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '22px' }}>
                    {t.lobbyPartDesc}
                  </span>
                </label>
              </div>
            </div>

            {/* Part Selection sub-options (only if lobbyMode === 'part') */}
            {lobbyMode === 'part' && (
              <div className="fade-in" style={{ padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{t.lobbyChoosePart}</h4>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {testData?.speaking && (
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="lobby_part_skill" 
                        checked={lobbySkill === 'speaking'} 
                        onChange={() => { setLobbySkill('speaking'); setLobbyPart(1); }} 
                      />
                      Speaking Parts
                    </label>
                  )}
                  {testData?.writing && (
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="lobby_part_skill" 
                        checked={lobbySkill === 'writing'} 
                        onChange={() => { setLobbySkill('writing'); setLobbyPart(1); }} 
                      />
                      Writing Parts
                    </label>
                  )}
                </div>

                <div>
                  <select 
                    value={lobbyPart} 
                    onChange={(e) => setLobbyPart(parseInt(e.target.value, 10))}
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontWeight: 'bold' }}
                  >
                    {lobbySkill === 'speaking' ? (
                      <>
                        <option value="1">{t.spPart} 1: Read Aloud (Q1-2)</option>
                        <option value="2">{t.spPart} 2: Describe Picture (Q3-4)</option>
                        <option value="3">{t.spPart} 3: Respond to Questions (Q5-7)</option>
                        <option value="4">{t.spPart} 4: Use Info Provided (Q8-10)</option>
                        <option value="5">{t.spPart} 5: Express Opinion (Q11)</option>
                      </>
                    ) : (
                      <>
                        <option value="1">{t.wrPart} 1: Write based on Picture (Q1-5)</option>
                        <option value="2">{t.wrPart} 2: Respond to Request (Q6-7)</option>
                        <option value="3">{t.wrPart} 3: Opinion Essay (Q8)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            )}

            {/* Timing Config */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>
                2. {t.timeSettings}
              </label>

              <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="radio"
                    checked={!lobbyCustomTime}
                    onChange={() => setLobbyCustomTime(false)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {t.standardTime}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input
                    type="radio"
                    checked={lobbyCustomTime}
                    onChange={() => setLobbyCustomTime(true)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {t.customTimeLabel}
                </label>
              </div>

              {lobbyCustomTime && (
                <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--background)', padding: '12px', border: '1px solid var(--border)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}>{t.speakingTimeScale}</label>
                    <select
                      value={lobbySpMult}
                      onChange={(e) => setLobbySpMult(parseFloat(e.target.value))}
                      style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    >
                      <option value={1}>{t.normal} (1x)</option>
                      <option value={1.5}>{t.extraTime} (1.5x)</option>
                      <option value={0.5}>{t.halfTime} (0.5x)</option>
                      <option value={999}>{t.noLimit}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}>{t.writingTimeScale}</label>
                    <select
                      value={lobbyWrMult}
                      onChange={(e) => setLobbyWrMult(parseFloat(e.target.value))}
                      style={{ width: '100%', padding: '6px', border: '1px solid var(--border)', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    >
                      <option value={1}>{t.normal} (1x)</option>
                      <option value={1.5}>{t.extraTime} (1.5x)</option>
                      <option value={0.5}>{t.halfTime} (0.5x)</option>
                      <option value={999}>{t.noLimit}</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Start exam action */}
            <button 
              className="btn-accent" 
              onClick={handleStartExam}
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1.05rem', fontWeight: 'bold', marginTop: '12px' }}
            >
              {t.lobbyStart} &rarr;
            </button>
          </div>
        </div>

        {/* Simplified Footer matching home screen */}
        <footer style={{ marginTop: 'auto', paddingTop: '40px', paddingBottom: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
          <span>DAOHIEUIT</span>
        </footer>
      </div>
    );
  }

  if (evaluating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--background)', padding: '24px' }}>
        <Activity className="pulse-border" size={48} style={{ color: 'var(--accent)', marginBottom: '24px' }} />
        <h2 style={{ fontSize: '1.4rem', marginBottom: '8px', textAlign: 'center' }}>{t.evaluating}</h2>
        <div style={{ width: '100%', maxWidth: '400px', height: '6px', background: 'var(--border)', margin: '16px 0' }}>
          <div style={{ width: `${evalProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s ease' }} />
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{evalProgress}%</p>
      </div>
    );
  }

  if (showReview && reviewData) {
    return (
      <div style={{ padding: '24px 0', minHeight: '100vh', background: 'var(--background)' }}>
        <ReviewConsole
          testTitle={reviewData.testTitle}
          date={reviewData.date}
          speakingScore={reviewData.speakingScore}
          writingScore={reviewData.writingScore}
          reviews={reviewData.reviews}
          language={language}
        />
      </div>
    );
  }

  const currentQ = questions[currentIdx];

  if (!currentQ) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--background)', padding: '24px' }}>
        <AlertCircle size={32} style={{ color: 'var(--accent)', marginBottom: '16px' }} />
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>No valid questions found for this section.</p>
        <button className="btn-primary" onClick={() => router.push('/')}>Exit</button>
      </div>
    );
  }

  return (
    <div className="exam-layout">
      
      {/* Zen header */}
      <header style={{ height: '56px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', background: 'var(--background-secondary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 'bold', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{testData?.title}</span>
          <span style={{ height: '12px', width: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            {t.question} {currentIdx + 1} / {questions.length}
          </span>
        </div>
        <button 
          onClick={handleExit}
          style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Exit Exam
        </button>
      </header>

      {/* Main Exam Area */}
      <main className="exam-main">
        {showSkillTransition ? (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px', background: 'var(--background)' }} className="fade-in">
            <div className="card-sharp" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', borderColor: 'var(--accent)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {t.transHeader}
              </span>
              <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                {t.transTitle}
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
                {t.transDesc}
              </p>
              <button 
                className="btn-accent" 
                onClick={handleProceedToWriting}
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', fontWeight: 'bold', marginTop: '8px' }}
              >
                {t.transContinue} &rarr;
              </button>
            </div>
          </div>
        ) : currentQ.partTitle !== shownIntroForPart ? (
          <PartIntroScreen 
            partTitle={currentQ.partTitle} 
            onStart={() => setShownIntroForPart(currentQ.partTitle)} 
            language={language}
          />
        ) : currentQ.section === 'speaking' ? (
          <SpeakingConsole
            key={currentQ.id}
            question={currentQ}
            partTitle={currentQ.partTitle}
            referenceInfo={currentQ.referenceInfo}
            onNext={handleNextQuestion}
            timeMultiplier={customTime ? spMult : 1}
            language={language}
          />
        ) : (
          <WritingConsole
            key={currentQ.id}
            question={currentQ}
            partTitle={currentQ.partTitle}
            onNext={handleNextQuestion}
            timeMultiplier={customTime ? wrMult : 1}
            language={language}
          />
        )}
      </main>
      
      <ConfirmModal
        isOpen={showExitConfirm}
        title="Exit Exam"
        message={t.quitConfirm}
        confirmText="Yes, Exit"
        cancelText="Cancel"
        onConfirm={confirmExit}
        onCancel={cancelExit}
      />

    </div>
  );
}
