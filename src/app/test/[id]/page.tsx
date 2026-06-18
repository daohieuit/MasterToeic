'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/utils/supabase';
import SpeakingConsole from '@/components/SpeakingConsole';
import WritingConsole from '@/components/WritingConsole';
import ReviewConsole from '@/components/ReviewConsole';
import PartIntroScreen from '@/components/PartIntroScreen';
import ConfirmModal from '@/components/ConfirmModal';
import { AlertCircle, RefreshCw, Activity, ArrowRight, Loader, Mic, MicOff, Play, Volume2, Award, ArrowLeft } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { getSpeakingPartConfig, getWritingPartConfig } from '@/utils/constants';

interface TestParams {
  id: string;
}

export default function TestPage({ params }: { params: Promise<TestParams> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const { language, user } = useApp();

  // Test setup variables
  const testId = resolvedParams.id;
  const mode = searchParams.get('mode') || 'full'; // 'full' | 'speaking' | 'writing' | 'part'
  const skill = searchParams.get('skill') || 'speaking';
  const partsParam = searchParams.get('parts') || searchParams.get('part') || '1';
  const selectedParts = partsParam.split(',').map(p => parseInt(p, 10)).filter(p => !isNaN(p) && p > 0);
  const customTime = searchParams.get('customTime') === 'true';
  const spMult = parseFloat(searchParams.get('spMult') || '1');
  const wrMult = parseFloat(searchParams.get('wrMult') || '1');
  const isStarted = searchParams.get('started') === 'true';

  // Attempt evaluation ID for direct history review
  const attemptId = searchParams.get('attemptId');

  // Loading states
  const [testData, setTestData] = useState<any>(null);
  const hasSpeaking = Array.isArray(testData?.speaking) && testData.speaking.length > 0;
  const hasWriting = Array.isArray(testData?.writing) && testData.writing.length > 0;
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

  // Lobby Mic Test States
  const lobbyRecorder = useAudioRecorder();
  const [lobbyTestPlaying, setLobbyTestPlaying] = useState(false);
  const lobbyAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // Lobby & Transition States
  const [lobbyMode, setLobbyMode] = useState<'full' | 'speaking' | 'writing' | 'part'>('full');
  const [lobbySkill, setLobbySkill] = useState<'speaking' | 'writing'>('speaking');
  const [lobbyParts, setLobbyParts] = useState<number[]>([1]);
  const [lobbyCustomTime, setLobbyCustomTime] = useState<boolean>(false);
  const [lobbySpMult, setLobbySpMult] = useState<number>(1);
  const [lobbyWrMult, setLobbyWrMult] = useState<number>(1);
  const [showSkillTransition, setShowSkillTransition] = useState<boolean>(false);

  useEffect(() => {
    if (testData) {
      const currentHasSpeaking = Array.isArray(testData.speaking) && testData.speaking.length > 0;
      const currentHasWriting = Array.isArray(testData.writing) && testData.writing.length > 0;

      if (currentHasSpeaking && currentHasWriting) {
        setLobbyMode('full');
      } else if (currentHasSpeaking) {
        setLobbyMode('speaking');
        setLobbySkill('speaking');
      } else if (currentHasWriting) {
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
      let globalSpIdx = 1;
      let globalWrIdx = 1;

      if (activeMode === 'full') {
        if (selectedTest.speaking) {
          selectedTest.speaking.forEach((p: any) => {
            const pTitle = p.partTitle || getSpeakingPartConfig(p.part)?.partTitle || `Part ${p.part}`;
            p.questions.forEach((q: any) => {
              filteredQuestions.push({
                ...q,
                id: q.id || `sp_q${globalSpIdx++}`,
                partTitle: pTitle,
                referenceInfo: p.referenceInfo,
                situation: p.situation,
                section: 'speaking'
              });
            });
          });
        }
        if (selectedTest.writing) {
          selectedTest.writing.forEach((p: any) => {
            const pTitle = p.partTitle || getWritingPartConfig(p.part)?.partTitle || `Part ${p.part}`;
            if (p.part === 1) {
              const cleanedQuestions = p.questions.map((q: any) => ({
                ...q,
                id: q.id || `wr_q${globalWrIdx++}`
              }));
              filteredQuestions.push({
                id: `writing_part_1_group_${Date.now()}`,
                type: 'writing_part_1_group',
                partTitle: pTitle,
                partTime: p.partTime || 480,
                questions: cleanedQuestions,
                section: 'writing'
              });
            } else {
              p.questions.forEach((q: any) => {
                filteredQuestions.push({
                  ...q,
                  id: q.id || `wr_q${globalWrIdx++}`,
                  partTitle: pTitle,
                  direction: q.direction,
                  section: 'writing'
                });
              });
            }
          });
        }
      } else if (activeMode === 'speaking') {
        if (selectedTest.speaking) {
          selectedTest.speaking.forEach((p: any) => {
            const pTitle = p.partTitle || getSpeakingPartConfig(p.part)?.partTitle || `Part ${p.part}`;
            p.questions.forEach((q: any) => {
              filteredQuestions.push({
                ...q,
                id: q.id || `sp_q${globalSpIdx++}`,
                partTitle: pTitle,
                referenceInfo: p.referenceInfo,
                situation: p.situation,
                section: 'speaking'
              });
            });
          });
        }
      } else if (activeMode === 'writing') {
        if (selectedTest.writing) {
          selectedTest.writing.forEach((p: any) => {
            const pTitle = p.partTitle || getWritingPartConfig(p.part)?.partTitle || `Part ${p.part}`;
            if (p.part === 1) {
              const cleanedQuestions = p.questions.map((q: any) => ({
                ...q,
                id: q.id || `wr_q${globalWrIdx++}`
              }));
              filteredQuestions.push({
                id: `writing_part_1_group_${Date.now()}`,
                type: 'writing_part_1_group',
                partTitle: pTitle,
                partTime: p.partTime || 480,
                questions: cleanedQuestions,
                section: 'writing'
              });
            } else {
              p.questions.forEach((q: any) => {
                filteredQuestions.push({
                  ...q,
                  id: q.id || `wr_q${globalWrIdx++}`,
                  partTitle: pTitle,
                  direction: q.direction,
                  section: 'writing'
                });
              });
            }
          });
        }
      } else if (activeMode === 'part') {
        if (activeSkill === 'speaking' && selectedTest.speaking) {
          const sortedParts = [...selectedParts].sort((a, b) => a - b);
          sortedParts.forEach((pNum) => {
            const p = selectedTest.speaking.find((x: any) => x.part === pNum);
            if (p) {
              const pTitle = p.partTitle || getSpeakingPartConfig(p.part)?.partTitle || `Part ${p.part}`;
              p.questions.forEach((q: any, qIdx: number) => {
                filteredQuestions.push({
                  ...q,
                  id: q.id || `sp_q_${pNum}_${qIdx + 1}`,
                  partTitle: pTitle,
                  referenceInfo: p.referenceInfo,
                  situation: p.situation,
                  section: 'speaking'
                });
              });
            }
          });
        } else if (activeSkill === 'writing' && selectedTest.writing) {
          const sortedParts = [...selectedParts].sort((a, b) => a - b);
          sortedParts.forEach((pNum) => {
            const p = selectedTest.writing.find((x: any) => x.part === pNum);
            if (p) {
              const pTitle = p.partTitle || getWritingPartConfig(p.part)?.partTitle || `Part ${p.part}`;
              if (p.part === 1) {
                const cleanedQuestions = p.questions.map((q: any, qIdx: number) => ({
                  ...q,
                  id: q.id || `wr_q_1_${qIdx + 1}`
                }));
                filteredQuestions.push({
                  id: `writing_part_1_group_${Date.now()}_${pNum}`,
                  type: 'writing_part_1_group',
                  partTitle: pTitle,
                  partTime: p.partTime || 480,
                  questions: cleanedQuestions,
                  section: 'writing'
                });
              } else {
                p.questions.forEach((q: any, qIdx: number) => {
                  filteredQuestions.push({
                    ...q,
                    id: q.id || `wr_q_${pNum}_${qIdx + 1}`,
                    partTitle: pTitle,
                    direction: q.direction,
                    section: 'writing'
                  });
                });
              }
            }
          });
        }
      }


      setQuestions(filteredQuestions);
      setCurrentIdx(0);
      setAnswers([]);
      setLoading(false);
    };

    initTest();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: user?.id prevents re-render loops; router from useRouter() is stable
  }, [testId, mode, skill, partsParam, attemptId, user?.id, isStarted, language]);

  // Sync searchParams to lobby state
  useEffect(() => {
    if (searchParams.get('mode')) {
      setLobbyMode(searchParams.get('mode') as any);
    }
    if (searchParams.get('skill')) {
      setLobbySkill(searchParams.get('skill') as any);
    }
    const partsVal = searchParams.get('parts') || searchParams.get('part');
    if (partsVal) {
      const parsed = partsVal.split(',').map(x => parseInt(x, 10)).filter(x => !isNaN(x) && x > 0);
      if (parsed.length > 0) {
        setLobbyParts(parsed);
      }
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

  const handleNextQuestion = (answerData: string | any[], audioUrl: string | null = null) => {
    const currentQ = questions[currentIdx];
    
    let newAnswers = [...answers];

    if (Array.isArray(answerData)) {
      // It's a group of answers (Writing Part 1)
      answerData.forEach((ans) => {
        newAnswers.push({
          questionId: ans.id,
          type: ans.type,
          partTitle: currentQ.partTitle,
          questionText: ans.text || 'Write one sentence describing the picture.',
          answer: ans.answer,
          audioUrl: null,
          section: 'writing',
          image: ans.image || null,
          words: ans.words || null,
          referenceInfo: null,
          direction: null,
          situation: null,
          description: ans.description || null
        });
      });
    } else {
      newAnswers.push({
        questionId: currentQ.id,
        type: currentQ.type,
        partTitle: currentQ.partTitle,
        questionText: currentQ.text || (currentQ.type === 'describe_picture' ? 'Describe the picture shown.' : 'Respond using information.'),
        answer: answerData as string,
        audioUrl: audioUrl,
        section: currentQ.section,
        image: currentQ.image || null,
        words: currentQ.words || null,
        referenceInfo: currentQ.referenceInfo || null,
        direction: currentQ.direction || null,
        situation: currentQ.situation || null,
        description: currentQ.description || null
      });
    }
    
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
    setEvalProgress(100);
    
    const evaluationResults: any[] = [];

    for (let i = 0; i < allAnswers.length; i++) {
      const ans = allAnswers[i];

      evaluationResults.push({
        ...ans,
        userAnswer: ans.answer,
        score: null, 
        feedback: language === 'vi' ? 'Vui lòng xuất file JSON và gửi cho Gemini Web để chấm điểm.' : 'Please export JSON and send to Gemini Web for evaluation.',
        grammarErrors: [],
        sampleAnswer: ans.sampleAnswer || ''
      });
    }

    const attemptResult = {
      testId: testData.id,
      testTitle: testData.title,
      mode: mode,
      partName: mode === 'part' ? `${skill.toUpperCase()} Part ${partsParam}` : undefined,
      speakingScore: null,
      writingScore: null,
      reviews: evaluationResults,
      unauthorizedForAI: false
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
        params.set('parts', lobbyParts.join(','));
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
              {hasSpeaking && (
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

              {hasWriting && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)', marginTop: hasSpeaking ? '16px' : '0' }}>
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
                {hasSpeaking && hasWriting && (
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

                {hasSpeaking && (
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

                {hasWriting && (
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
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  {hasSpeaking && (
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="lobby_part_skill" 
                        checked={lobbySkill === 'speaking'} 
                        onChange={() => { setLobbySkill('speaking'); setLobbyParts([1]); }} 
                      />
                      Speaking Parts
                    </label>
                  )}
                  {hasWriting && (
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="lobby_part_skill" 
                        checked={lobbySkill === 'writing'} 
                        onChange={() => { setLobbySkill('writing'); setLobbyParts([1]); }} 
                      />
                      Writing Parts
                    </label>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(lobbySkill === 'speaking'
                    ? [
                        { id: 1, label: `${t.spPart} 1: Read Aloud (Q1-2)` },
                        { id: 2, label: `${t.spPart} 2: Describe Picture (Q3-4)` },
                        { id: 3, label: `${t.spPart} 3: Respond to Questions (Q5-7)` },
                        { id: 4, label: `${t.spPart} 4: Use Info Provided (Q8-10)` },
                        { id: 5, label: `${t.spPart} 5: Express Opinion (Q11)` }
                      ]
                    : [
                        { id: 1, label: `${t.wrPart} 1: Write based on Picture (Q1-5)` },
                        { id: 2, label: `${t.wrPart} 2: Respond to Request (Q6-7)` },
                        { id: 3, label: `${t.wrPart} 3: Opinion Essay (Q8)` }
                      ]
                  ).map((p) => {
                    const isSelected = lobbyParts.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setLobbyParts((prev) => {
                            if (prev.includes(p.id)) {
                              if (prev.length === 1) {
                                toast.error(language === 'vi' ? 'Bạn phải chọn ít nhất một Part!' : 'You must select at least one Part!');
                                return prev;
                              }
                              return prev.filter(id => id !== p.id);
                            } else {
                              return [...prev, p.id];
                            }
                          });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: isSelected ? 'var(--accent-light)' : 'var(--background-secondary)',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          color: 'var(--text-primary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          transition: 'all 0.15s ease',
                          borderRadius: '0px'
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-secondary)'}`,
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}
                        >
                          {isSelected && '✓'}
                        </div>
                        <span style={{ fontSize: '0.85rem' }}>{p.label}</span>
                      </button>
                    );
                  })}
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

            {/* Microphone Test Widget (Only for tests containing Speaking) */}
            {hasSpeaking && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  3. {language === 'vi' ? 'Kiểm tra Microphone' : 'Test Microphone'}
                </label>
                <div style={{ background: 'var(--background)', padding: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {language === 'vi' 
                      ? 'Nói thử vài từ để kiểm tra âm lượng mic trước khi thi. Bản ghi sẽ tự động xóa sau khi thoát.' 
                      : 'Speak a few words to test your mic before starting. Recording is stored in memory and deleted when you exit.'}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!lobbyRecorder.isRecording ? (
                      <button 
                        className="btn-accent" 
                        onClick={lobbyRecorder.startRecording}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.85rem' }}
                      >
                        <Mic size={14} />
                        {language === 'vi' ? 'Bắt đầu Test Mic' : 'Start Mic Test'}
                      </button>
                    ) : (
                      <button 
                        className="btn-primary" 
                        onClick={lobbyRecorder.stopRecording}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.85rem', background: '#D32F2F', border: 'none', color: '#fff' }}
                      >
                        <span className="pulse-dot" style={{ display: 'inline-block', width: '8px', height: '8px', background: '#fff', borderRadius: '50%' }} />
                        {language === 'vi' ? 'Dừng thu âm' : 'Stop Recording'}
                      </button>
                    )}

                    {lobbyRecorder.audioUrl && !lobbyRecorder.isRecording && (
                      <button 
                        className="btn-secondary" 
                        onClick={() => {
                          if (lobbyAudioRef.current) {
                            if (lobbyTestPlaying) {
                              lobbyAudioRef.current.pause();
                              setLobbyTestPlaying(false);
                            } else {
                              lobbyAudioRef.current.play();
                              setLobbyTestPlaying(true);
                            }
                          }
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.85rem' }}
                      >
                        <Play size={14} />
                        {lobbyTestPlaying 
                          ? (language === 'vi' ? 'Tạm dừng' : 'Pause') 
                          : (language === 'vi' ? 'Nghe lại' : 'Play Back')}
                      </button>
                    )}
                  </div>

                  {lobbyRecorder.audioUrl && (
                    <audio 
                      ref={lobbyAudioRef} 
                      src={lobbyRecorder.audioUrl} 
                      style={{ display: 'none' }} 
                      onEnded={() => setLobbyTestPlaying(false)}
                      onPause={() => setLobbyTestPlaying(false)}
                      onPlay={() => setLobbyTestPlaying(true)}
                    />
                  )}
                </div>
              </div>
            )}

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
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: '24px' }}>
        <div className="card-sharp animate-fade-in" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px', borderColor: 'var(--accent)', background: 'var(--background-secondary)', textAlign: 'center', borderRadius: '0px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '16px', background: 'var(--background)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', width: '64px', height: '64px' }}>
              <Award size={32} style={{ color: 'var(--accent)' }} />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              {language === 'vi' ? 'HOÀN THÀNH BÀI LÀM' : 'EXAM COMPLETED'}
            </span>
            <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: '4px 0 0 0', fontWeight: 'bold' }}>
              {reviewData.testTitle}
            </h2>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem', background: 'var(--background)', margin: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{language === 'vi' ? 'Ngày hoàn thành' : 'Completion Date'}:</span>
              <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{reviewData.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{language === 'vi' ? 'Chế độ thi' : 'Exam Mode'}:</span>
              <span style={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent)' }}>
                {reviewData.mode === 'full' 
                  ? (language === 'vi' ? 'Full Test (Nói & Viết)' : 'Full Test (Speaking & Writing)')
                  : reviewData.mode === 'speaking'
                  ? (language === 'vi' ? 'Speaking Only (Chỉ Nói)' : 'Speaking Only')
                  : reviewData.mode === 'writing'
                  ? (language === 'vi' ? 'Writing Only (Chỉ Viết)' : 'Writing Only')
                  : (language === 'vi' ? `Part Luyện Tập (${reviewData.partName})` : `Part Practice (${reviewData.partName})`)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{language === 'vi' ? 'Số câu đã làm' : 'Questions Answered'}:</span>
              <span style={{ fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{reviewData.reviews?.length || 0}</span>
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
            {language === 'vi'
              ? 'Bài làm của bạn đã được ghi lại thành công. Nhấn nút bên dưới để đi đến trang chi tiết: tải xuống tệp âm thanh/JSON, sao chép prompt và dán kết quả nhận xét từ AI.'
              : 'Your practice attempt has been recorded successfully. Click the button below to view detailed results, download audio, copy grading prompt, and apply AI feedback.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            <Link 
              href={`/test/${testId}/review?attemptId=${reviewData.id}`}
              className="btn-accent"
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                padding: '16px', 
                fontSize: '1.1rem', 
                fontWeight: 'bold',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {language === 'vi' ? 'Xem chi tiết & Chấm điểm AI' : 'View Details & AI Grading'} <ArrowRight size={20} />
            </Link>

            <Link 
              href="/" 
              className="btn-secondary"
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                padding: '12px', 
                fontSize: '0.95rem',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={16} /> {language === 'vi' ? 'Quay lại Trang chủ' : 'Back to Dashboard'}
            </Link>
          </div>

        </div>
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
            situation={currentQ.situation}
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
