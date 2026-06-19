'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/utils/supabase';
import toast from 'react-hot-toast';
import { BarChart, BookOpen, Clock, Award, Settings, User, Plus, Trash2, Globe, Sun, Moon, ArrowRight, Activity, LogIn, LogOut, Loader } from 'lucide-react';

interface TestHistory {
  id: string;
  testId: string;
  testTitle: string;
  date: string;
  mode: 'full' | 'speaking' | 'writing' | 'part';
  partName?: string;
  speakingScore: number | null;
  writingScore: number | null;
}

export default function Dashboard() {
  const { theme, toggleTheme, language, setLanguage, user, isAdmin, logout, isDbConfigured } = useApp();
  const [history, setHistory] = useState<TestHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [filter, setFilter] = useState<'all' | 'full' | 'speaking' | 'writing'>('all');
  const [activeMobileTab, setActiveMobileTab] = useState<'tests' | 'history'>('tests');
  
  // Custom tests uploaded by admin (saved in database or localStorage)
  const [customTests, setCustomTests] = useState<any[]>([]);

  // Load History & Custom Tests
  useEffect(() => {
    const fetchHistoryAndTests = async () => {
      setLoadingHistory(true);
      
      // 1. Fetch History based on Auth status
      if (user && supabase) {
        try {
          // Fetch History
          const resHist = await fetch(`/api/history?userId=${user.id}`);
          if (resHist.ok) {
            const list = await resHist.json();
            const mappedHistory = list.map((h: any) => ({
              id: h.id,
              testId: h.test_id,
              testTitle: h.test_title,
              date: new Date(h.date).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }),
              mode: h.mode,
              partName: h.part_name,
              speakingScore: h.speaking_score,
              writingScore: h.writing_score
            }));
            setHistory(mappedHistory);
          }
        } catch (e) {
          console.error('Failed to load database history:', e);
        }
      } else {
        // Guest Mode: Load history from browser LocalStorage
        const savedHistory = localStorage.getItem('toeic_sw_history');
        if (savedHistory) {
          try {
            setHistory(JSON.parse(savedHistory));
          } catch (e) {
            console.error(e);
          }
        }
      }

      // 2. Fetch Custom Tests (Public for everyone)
      if (supabase) {
        try {
          const { data: tests, error } = await supabase
            .from('custom_tests')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && tests) {
            const mappedTests = tests.map(t => ({
              id: t.id,
              title: t.title,
              speaking: t.speaking_data,
              writing: t.writing_data
            }));
            setCustomTests(mappedTests);
          } else {
            throw new Error('Fallback to local tests');
          }
        } catch (e) {
          // Fallback if db error
          const savedTests = localStorage.getItem('toeic_sw_custom_tests');
          if (savedTests) {
            try { setCustomTests(JSON.parse(savedTests)); } catch (err) {}
          }
        }
      } else {
        const savedTests = localStorage.getItem('toeic_sw_custom_tests');
        if (savedTests) {
          try { setCustomTests(JSON.parse(savedTests)); } catch (e) {}
        }
      }
      
      setLoadingHistory(false);
    };

    fetchHistoryAndTests();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: user?.id avoids re-render loops on object reference changes
  }, [user?.id, language]);



  const clearHistory = async () => {
    if (confirm(language === 'vi' ? 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử luyện tập không?' : 'Are you sure you want to clear all practice history?')) {
      if (user && supabase) {
        // Clear in database
        const { error } = await supabase
          .from('practice_history')
          .delete()
          .eq('user_id', user.id);
        
        if (error) {
          toast.error('Không thể xóa lịch sử trên Database: ' + error.message);
          return;
        }
      } else {
        localStorage.removeItem('toeic_sw_history');
      }
      setHistory([]);
    }
  };

  const getAverageScore = (type: 'speaking' | 'writing') => {
    const scores = history
      .map(h => type === 'speaking' ? h.speakingScore : h.writingScore)
      .filter((s): s is number => s !== null);
    
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const t = {
    vi: {
      title: 'MASTER TOEIC',
      subtitle: 'Nền tảng luyện thi Nói & Viết chuẩn TOEIC S&W với AI trợ lực',
      startTest: 'Thi Thử Full Test',
      startSpeaking: 'Thi Luyện Speaking',
      startWriting: 'Thi Luyện Writing',
      practicePart: 'Luyện tập từng phần',
      historyTitle: 'Lịch sử luyện tập',
      noHistory: 'Bạn chưa làm bài test nào. Hãy bắt đầu ngay!',
      averageSpeaking: 'Điểm Nói trung bình',
      averageWriting: 'Điểm Viết trung bình',
      totalTests: 'Tổng số bài làm',
      timeSettings: 'Cấu hình thời gian',
      standardTime: 'Thời gian chuẩn (TOEIC)',
      customTimeLabel: 'Tự chỉnh thời gian (Dành cho ôn luyện)',
      speakingTimeScale: 'Thời gian Nói',
      writingTimeScale: 'Thời gian Viết',
      normal: 'Chuẩn',
      extraTime: 'Nhân 1.5 lần',
      halfTime: 'Chia đôi (Thử thách)',
      testList: 'Danh sách đề thi',
      builtIn: 'Mặc định',
      custom: 'Đám mây / Custom',
      login: 'Đăng Nhập',
      logout: 'Đăng Xuất',
      loadingHistoryText: 'Đang tải lịch sử...',
      practiceBtn: 'Vào phòng thi',
      fullTestType: 'Full Test (Nói & Viết)',
      speakingTestType: 'Speaking Test (Nói)',
      writingTestType: 'Writing Test (Viết)',
      testsTab: 'Đề thi',
      historyTab: 'Lịch sử làm bài'
    },
    en: {
      title: 'MASTER TOEIC',
      subtitle: 'Premium TOEIC Speaking & Writing Practice Powered by Gemini AI',
      startTest: 'Start Full Exam',
      startSpeaking: 'Start Speaking Practice',
      startWriting: 'Start Writing Practice',
      practicePart: 'Practice Specific Part',
      historyTitle: 'Practice History',
      noHistory: 'No history found. Take a test to get started!',
      averageSpeaking: 'Avg Speaking Score',
      averageWriting: 'Avg Writing Score',
      totalTests: 'Total Practice Runs',
      timeSettings: 'Time Customization',
      standardTime: 'Standard Exam Timing',
      customTimeLabel: 'Custom Timing (Practice Mode)',
      speakingTimeScale: 'Speaking Speed',
      writingTimeScale: 'Writing Speed',
      normal: 'Normal',
      extraTime: '1.5x Time',
      halfTime: '0.5x Time (Hard)',
      testList: 'Available Exams',
      builtIn: 'Standard',
      custom: 'Cloud / Custom',
      login: 'Student Sign In',
      logout: 'Sign Out',
      loadingHistoryText: 'Loading history...',
      practiceBtn: 'Practice Now',
      fullTestType: 'Full Test (Speaking & Writing)',
      speakingTestType: 'Speaking Test (Speaking)',
      writingTestType: 'Writing Test (Writing)',
      testsTab: 'Exams',
      historyTab: 'Practice History'
    }
  }[language];

  // Combine standard and custom tests, sorted A-Z
  const allTests = customTests
    .map(t => ({ ...t, type: 'custom' }))
    .sort((a: any, b: any) => (a.title || '').localeCompare(b.title || '', language === 'vi' ? 'vi' : 'en'));

  const filteredTests = allTests.filter((test) => {
    if (filter === 'all') return true;
    const hasSpeaking = Array.isArray(test.speaking) && test.speaking.length > 0;
    const hasWriting = Array.isArray(test.writing) && test.writing.length > 0;
    if (filter === 'full') return hasSpeaking && hasWriting;
    if (filter === 'speaking') return hasSpeaking && !hasWriting;
    if (filter === 'writing') return hasWriting && !hasSpeaking;
    return true;
  });



  return (
    <>
      <div className="fade-in" style={{ padding: '24px 5% 0 5%', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {/* Top Navbar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 
            style={{ 
              fontSize: '1.6rem', 
              fontFamily: 'var(--font-space-grotesk), sans-serif', 
              fontWeight: 800, 
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              textTransform: 'uppercase'
            }} 
            className="responsive-title"
          >
            <span style={{ color: 'var(--text-primary)' }}>MASTER</span>
            <span style={{ color: 'var(--accent)', marginLeft: '6px' }}>TOEIC</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }} className="desktop-only">{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
          
          {/* Account status or Sign in */}
          {isDbConfigured && (
            user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 'bold' }} className="desktop-only">{user.email}</span>
              </div>
            ) : (
              <Link href="/login" className="btn-secondary" style={{ padding: '8px 12px', textDecoration: 'none', gap: '6px' }}>
                <LogIn size={16} /> <span style={{ fontSize: '0.8rem' }} className="desktop-only">{t.login}</span>
              </Link>
            )
          )}

          <button className="btn-secondary" onClick={() => setShowConfig(true)} title={language === 'vi' ? 'Cài đặt' : 'Settings'} style={{ padding: '8px 12px', gap: '6px' }}>
            <Settings size={18} />
            <span style={{ fontSize: '0.8rem' }} className="desktop-only">{language === 'vi' ? 'Cài đặt' : 'Settings'}</span>
          </button>
        </div>
      </header>

      {/* Mobile/Tablet Tab Switcher */}
      <div className="mobile-tabs-container">
        <button 
          onClick={() => setActiveMobileTab('tests')} 
          style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            padding: '12px', 
            fontSize: '0.85rem', 
            fontWeight: 'bold', 
            border: '1px solid ' + (activeMobileTab === 'tests' ? 'var(--text-primary)' : 'var(--border)'), 
            background: activeMobileTab === 'tests' ? 'var(--text-primary)' : 'transparent', 
            color: activeMobileTab === 'tests' ? 'var(--background)' : 'var(--text-primary)',
            transition: 'all 0.15s ease'
          }}
        >
          <BookOpen size={16} />
          <span>{t.testsTab}</span>
        </button>
        <button 
          onClick={() => setActiveMobileTab('history')} 
          style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px', 
            padding: '12px', 
            fontSize: '0.85rem', 
            fontWeight: 'bold', 
            border: '1px solid ' + (activeMobileTab === 'history' ? 'var(--text-primary)' : 'var(--border)'), 
            background: activeMobileTab === 'history' ? 'var(--text-primary)' : 'transparent', 
            color: activeMobileTab === 'history' ? 'var(--background)' : 'var(--text-primary)',
            transition: 'all 0.15s ease'
          }}
        >
          <Clock size={16} />
          <span>{t.historyTab}</span>
        </button>
      </div>

      {/* Main Dashboard Layout (Asymmetric 70/30 Grid) */}
      <div className="dashboard-grid">
        
        {/* Left Column (70%) - Test taking & settings */}
        <section 
          className={activeMobileTab === 'tests' ? 'mobile-show' : 'mobile-hide'} 
          style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}
        >
          
            {/* Test Grid */}
            <div>
              <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} style={{ color: 'var(--accent)' }} /> {t.testList}
              </h3>

              {/* Classification Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {(['all', 'full', 'speaking', 'writing'] as const).map((cat) => {
                  const label = {
                    all: language === 'vi' ? 'Tất cả' : 'All',
                    full: 'Full Test',
                    speaking: 'Speaking',
                    writing: 'Writing'
                  }[cat];
                  const active = filter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={active ? 'btn-primary' : 'btn-secondary'}
                      style={{ 
                        padding: '6px 16px', 
                        fontSize: '0.8rem',
                        background: active ? 'var(--text-primary)' : 'transparent',
                        color: active ? 'var(--background)' : 'var(--text-primary)'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredTests.map((test) => {
                  const hasSpeaking = Array.isArray(test.speaking) && test.speaking.length > 0;
                  const hasWriting = Array.isArray(test.writing) && test.writing.length > 0;
                  let testTypeLabel = '';
                  if (hasSpeaking && hasWriting) {
                    testTypeLabel = t.fullTestType;
                  } else if (hasSpeaking) {
                    testTypeLabel = t.speakingTestType;
                  } else {
                    testTypeLabel = t.writingTestType;
                  }

                  return (
                    <div 
                      key={test.id} 
                      className="card-sharp" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between',
                        background: 'var(--background-secondary)',
                        transition: 'transform 0.2s, border-color 0.2s'
                      }}
                    >
                      <div>
                        
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-primary)', marginTop: '8px' }}>
                          {test.title}
                        </h4>
                        
                        <p style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 'bold', marginBottom: '12px' }}>
                          {testTypeLabel}
                        </p>
                        
                      </div>

                      <Link
                        href={`/test/${test.id}`}
                        className="btn-primary"
                        style={{ textDecoration: 'none', justifyContent: 'center', width: '100%', padding: '10px' }}
                      >
                        {t.practiceBtn}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
        </section>

        {/* Right Column (30%) - Analytics & History */}
        <aside 
          className={activeMobileTab === 'history' ? 'mobile-show' : 'mobile-hide'} 
          style={{ width: '100%' }}
        >
          {/* Average Scores Panel */}
          <div className="card-sharp" style={{ marginBottom: '24px', background: 'var(--background-secondary)' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} style={{ color: 'var(--accent)' }} /> Analytics
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.averageSpeaking}</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                  {getAverageScore('speaking')}/200
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.averageWriting}</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                  {getAverageScore('writing')}/200
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.totalTests}</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                  {history.length}
                </span>
              </div>
            </div>

            {/* Custom SVG Score Chart (Minimalist, Zero external library dependency Issues) */}
            {history.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {language === 'vi' ? 'Tiến trình điểm số gần đây' : 'Recent Score Progress'}
                </h4>
                <div style={{ width: '100%', height: '120px', display: 'flex', alignItems: 'flex-end', gap: '6px', background: 'var(--background)', padding: '12px', border: '1px solid var(--border)' }}>
                  {history.slice(-10).map((h, idx) => {
                    const speakingHeight = h.speakingScore ? (h.speakingScore / 200) * 100 : 0;
                    const writingHeight = h.writingScore ? (h.writingScore / 200) * 100 : 0;
                    return (
                      <div key={h.id || idx} style={{ flex: 1, display: 'flex', gap: '2px', height: '100%', alignItems: 'flex-end' }} title={`${h.testTitle} - Sp: ${h.speakingScore || 0}, Wr: ${h.writingScore || 0}`}>
                        {h.speakingScore !== null && (
                          <div style={{ flex: 1, height: `${speakingHeight}%`, background: 'var(--accent)', minHeight: '4px' }} />
                        )}
                        {h.writingScore !== null && (
                          <div style={{ flex: 1, height: `${writingHeight}%`, background: 'var(--success)', minHeight: '4px' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  <span>Oldest</span>
                  <span>Newest</span>
                </div>
              </div>
            )}
          </div>

          {/* History List */}
          <div className="card-sharp">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} style={{ color: 'var(--accent)' }} /> {t.historyTitle}
              </h3>
              {history.length > 0 && !loadingHistory && (
                <button onClick={clearHistory} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer' }} title="Clear History">
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {loadingHistory ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader className="pulse-border" size={16} /> {t.loadingHistoryText}
              </p>
            ) : history.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
                {t.noHistory}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }} className="no-scrollbar">
                {history.map((h) => (
                  <div 
                    key={h.id} 
                    style={{ 
                      padding: '16px', 
                      border: '1px solid var(--border)', 
                      background: 'var(--background-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative',
                      transition: 'border-color 0.2s ease, transform 0.2s ease',
                      borderRadius: '0px'
                    }}
                    className="card-sharp"
                  >
                    {/* Top Row: Title & Meta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 
                          style={{ 
                            fontSize: '0.9rem', 
                            fontWeight: 'bold', 
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }} 
                          title={h.testTitle}
                        >
                          {h.testTitle}
                        </h4>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{h.date}</span>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)' }} />
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 'bold' }}>
                            {h.mode.toUpperCase()} {h.partName ? `#${h.partName}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Score Badges & Review Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
                      {/* Scores */}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {(h.mode === 'full' || h.mode === 'speaking') && (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Speaking</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                              {h.speakingScore !== null ? h.speakingScore : (language === 'vi' ? 'Chờ chấm' : 'Grading')}
                            </span>
                          </div>
                        )}

                        {(h.mode === 'full' || h.mode === 'writing') && (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Writing</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                              {h.writingScore !== null ? h.writingScore : (language === 'vi' ? 'Chờ chấm' : 'Grading')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Detail Link */}
                      <Link 
                        href={`/test/${h.testId}/review?attemptId=${h.id}`} 
                        className="btn-secondary" 
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '0.75rem', 
                          textDecoration: 'none',
                          background: 'var(--background)',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRadius: '0px'
                        }}
                      >
                        {language === 'vi' ? 'Chi tiết' : 'Review'} <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Footer to occupy bottom space on desktop */}
      <footer style={{ marginTop: 'auto', paddingTop: '24px', paddingBottom: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
        <span>DAOHIEUIT</span>
      </footer>
    </div>

    {/* Settings Drawer (rendered outside the transform container to prevent breaking fixed positioning containing block) */}
    {showConfig && (
      <div className="drawer-overlay" onClick={() => setShowConfig(false)}>
        <div className="drawer-panel" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--text-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={18} style={{ color: 'var(--accent)' }} />
              {language === 'vi' ? 'Cấu hình' : 'Settings'}
            </h3>
            <button 
              onClick={() => setShowConfig(false)} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
            >
              &times;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto' }} className="no-scrollbar">
            
            {/* Language Switcher */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                {language === 'vi' ? 'NGÔN NGỮ / LANGUAGE' : 'LANGUAGE / NGÔN NGỮ'}
              </label>
              <button 
                className="btn-secondary" 
                onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')} 
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                <Globe size={16} />
                <span>{language === 'vi' ? 'Tiếng Việt (Switch to EN)' : 'English (Chuyển sang VI)'}</span>
              </button>
            </div>

            {/* Theme Switcher */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                {language === 'vi' ? 'GIAO DIỆN / THEME' : 'THEME / GIAO DIỆN'}
              </label>
              <button 
                className="btn-secondary" 
                onClick={toggleTheme} 
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                {theme === 'light' ? (
                  <>
                    <Moon size={16} /> <span>{language === 'vi' ? 'Chế độ Tối (Dark)' : 'Dark Mode'}</span>
                  </>
                ) : (
                  <>
                    <Sun size={16} /> <span>{language === 'vi' ? 'Chế độ Sáng (Light)' : 'Light Mode'}</span>
                  </>
                )}
              </button>
            </div>

            {/* User Info (Mobile only) */}
            {user && (
              <div className="mobile-only" style={{ width: '100%', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  {language === 'vi' ? 'TÀI KHOẢN' : 'ACCOUNT'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', width: '100%' }}>
                  <User size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{user.email}</span>
                </div>
              </div>
            )}



            {/* Bottom Section (Admin Panel & Logout) */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              {/* Admin Panel Link */}
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="btn-secondary" 
                  style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
                  onClick={() => setShowConfig(false)}
                >
                  {language === 'vi' ? 'Quản trị Admin' : 'Admin Panel'}
                </Link>
              )}

              {/* Logout Button */}
              {user && (
                <button 
                  className="btn-secondary" 
                  onClick={() => {
                    logout();
                    setShowConfig(false);
                  }} 
                  style={{ width: '100%', justifyContent: 'center', gap: '8px', color: 'var(--accent)', borderColor: 'var(--accent)' }}
                >
                  <LogOut size={16} />
                  <span>{t.logout}</span>
                </button>
              )}

              {/* Version Display */}
              <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                {language === 'vi' ? 'PHIÊN BẢN HIỆN TẠI: 1.0.2' : 'CURRENT VERSION: 1.0.2'}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
