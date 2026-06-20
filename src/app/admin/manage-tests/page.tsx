'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Search,
  Edit2,
  Trash2,
  FileText,
  BookOpen,
  HelpCircle,
  Image as ImageIcon,
  ImageOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface Question {
  id: string;
  type: string;
  text?: string;
  image?: string;
  description?: string;
  words?: string[];
  sampleAnswer?: string;
  [key: string]: any;
}

interface Part {
  part: number;
  partTitle: string;
  referenceInfo?: string;
  questions: Question[];
  [key: string]: any;
}

interface TestData {
  id: string;
  title: string;
  speaking: Part[];
  writing: Part[];
}

// Helper: Validate image URLs in test data
const validateTestImages = (test: TestData, force: boolean = false): Promise<'ok' | 'missing' | 'broken'> => {
  const cacheKey = 'toeic_sw_image_health_cache';
  let cache: Record<string, { status: 'ok' | 'missing' | 'broken'; lastChecked: number }> = {};
  try {
    const savedCache = localStorage.getItem(cacheKey);
    if (savedCache) cache = JSON.parse(savedCache);
  } catch (e) {
    console.error('Failed to parse image health cache:', e);
  }

  const cachedVal = cache[test.id];
  const checkThreshold = 24 * 60 * 60 * 1000; // 24 hours
  if (!force && cachedVal && (Date.now() - cachedVal.lastChecked < checkThreshold)) {
    // If it was previously 'missing' or 'broken', we'll only use cache if it's less than 5 minutes old to be safe
    if (cachedVal.status === 'ok' || (Date.now() - cachedVal.lastChecked < 5 * 60 * 1000)) {
      return Promise.resolve(cachedVal.status);
    }
  }

  const images: string[] = [];
  
  if (test.speaking && Array.isArray(test.speaking)) {
    test.speaking.forEach((part: any) => {
      if (part.part === 2 && Array.isArray(part.questions)) {
        part.questions.forEach((q: any) => {
          images.push(q.image || '');
        });
      }
    });
  }
  
  if (test.writing && Array.isArray(test.writing)) {
    test.writing.forEach((part: any) => {
      if (part.part === 1 && Array.isArray(part.questions)) {
        part.questions.forEach((q: any) => {
          images.push(q.image || '');
        });
      }
    });
  }

  if (images.length === 0) {
    const hasSpeakingPart2 = test.speaking && test.speaking.some((p: any) => p.part === 2);
    const hasWritingPart1 = test.writing && test.writing.some((p: any) => p.part === 1);
    const status = (!hasSpeakingPart2 && !hasWritingPart1) ? 'ok' : 'missing';
    
    try {
      cache[test.id] = { status, lastChecked: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (e) {}
    return Promise.resolve(status);
  }

  if (images.some(img => !img || img.trim() === '')) {
    try {
      cache[test.id] = { status: 'missing', lastChecked: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (e) {}
    return Promise.resolve('missing');
  }

  return new Promise((resolve) => {
    const saveToCacheAndResolve = (status: 'ok' | 'missing' | 'broken') => {
      try {
        cache[test.id] = { status, lastChecked: Date.now() };
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      } catch (e) {
        console.error('Failed to write image health cache:', e);
      }
      resolve(status);
    };

    let checkedCount = 0;
    let hasBroken = false;
    
    images.forEach(url => {
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
        hasBroken = true;
        checkedCount++;
        if (checkedCount === images.length) saveToCacheAndResolve('broken');
        return;
      }

      const img = new Image();
      img.onload = () => {
        checkedCount++;
        if (checkedCount === images.length) {
          saveToCacheAndResolve(hasBroken ? 'broken' : 'ok');
        }
      };
      img.onerror = () => {
        hasBroken = true;
        checkedCount++;
        if (checkedCount === images.length) {
          saveToCacheAndResolve('broken');
        }
      };
      img.src = url;
    });
  });
};

interface HealthCheckResult {
  isHealthy: boolean;
  issues: string[];
}

// Helper: Check test completeness and stability
const checkTestHealth = (test: TestData, imageStatus: 'ok' | 'missing' | 'broken' | undefined): HealthCheckResult => {
  const issues: string[] = [];

  const hasSpeaking = test.speaking && test.speaking.length > 0;
  const hasWriting = test.writing && test.writing.length > 0;

  if (!hasSpeaking && !hasWriting) {
    issues.push('Không có phần thi nào / No sections');
    return { isHealthy: false, issues };
  }

  // Check Speaking Parts
  if (hasSpeaking) {
    test.speaking.forEach((part) => {
      const partNum = part.part;
      
      // Situation check for Part 3
      if (partNum === 3 && (!part.situation || part.situation.trim() === '')) {
        issues.push('Part 3: Thiếu tình huống (situation)');
      }

      // ReferenceInfo check for Part 4
      if (partNum === 4 && (!part.referenceInfo || part.referenceInfo.trim() === '')) {
        issues.push('Part 4: Thiếu thông tin tham khảo (referenceInfo)');
      }

      if (!part.questions || part.questions.length === 0) {
        issues.push(`Speaking Part ${partNum}: Không có câu hỏi`);
      } else {
        part.questions.forEach((q, idx) => {
          const qLabel = `Speaking P${partNum} Q${idx + 1}`;
          
          if (partNum !== 2 && (!q.text || q.text.trim() === '')) {
            issues.push(`${qLabel}: Thiếu đề bài (text)`);
          }

          if (!q.sampleAnswer || q.sampleAnswer.trim() === '') {
            issues.push(`${qLabel}: Thiếu đáp án mẫu (sampleAnswer)`);
          }

          if (partNum === 2 && (!q.image || q.image.trim() === '')) {
            issues.push(`${qLabel}: Thiếu hình ảnh`);
          }
        });
      }
    });
  }

  // Check Writing Parts
  if (hasWriting) {
    test.writing.forEach((part) => {
      const partNum = part.part;

      if (!part.questions || part.questions.length === 0) {
        issues.push(`Writing Part ${partNum}: Không có câu hỏi`);
      } else {
        part.questions.forEach((q, idx) => {
          const qLabel = `Writing P${partNum} Q${idx + 1}`;

          // Part 1 doesn't always need q.text, but needs image and words
          if (partNum === 1) {
            if (!q.image || q.image.trim() === '') {
              issues.push(`${qLabel}: Thiếu hình ảnh`);
            }
            if (!q.words || q.words.length === 0) {
              issues.push(`${qLabel}: Thiếu từ khóa (words)`);
            }
          } else {
            // Part 2 and 3
            if (!q.text || q.text.trim() === '') {
              issues.push(`${qLabel}: Thiếu đề bài (text)`);
            }
          }

          if (partNum === 2 && (!q.direction || q.direction.trim() === '')) {
            issues.push(`${qLabel}: Thiếu direction`);
          }

          if (!q.sampleAnswer || q.sampleAnswer.trim() === '') {
            issues.push(`${qLabel}: Thiếu đáp án mẫu (sampleAnswer)`);
          }
        });
      }
    });
  }

  // Factor in imageStatus
  if (imageStatus === 'broken') {
    issues.push('Có ảnh bị lỗi liên kết');
  } else if (imageStatus === 'missing') {
    issues.push('Thiếu ảnh ở các câu hỏi yêu cầu ảnh');
  }

  return {
    isHealthy: issues.length === 0,
    issues
  };
};

export default function ManageTestsPage() {
  const router = useRouter();
  const { language, isAdmin, user } = useApp();

  const [tests, setTests] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'full' | 'speaking' | 'writing'>('all');
  const [imageStatuses, setImageStatuses] = useState<Record<string, 'ok' | 'missing' | 'broken'>>({});
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isCheckingImages, setIsCheckingImages] = useState(false);
  const [isNavigatingId, setIsNavigatingId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Validate images of all tests
  const validateAllImages = useCallback(async (testList: TestData[], force: boolean = false) => {
    const newStatuses: Record<string, 'ok' | 'missing' | 'broken'> = {};
    
    if (force) {
      // Clear cache
      localStorage.removeItem('toeic_sw_image_health_cache');
      setImageStatuses({});
    } else {
      // Load from cache first for instant response
      const cacheKey = 'toeic_sw_image_health_cache';
      let cache: Record<string, { status: 'ok' | 'missing' | 'broken'; lastChecked: number }> = {};
      try {
        const savedCache = localStorage.getItem(cacheKey);
        if (savedCache) {
          cache = JSON.parse(savedCache);
          testList.forEach(t => {
            if (cache[t.id]) {
              newStatuses[t.id] = cache[t.id].status;
            }
          });
          setImageStatuses({ ...newStatuses });
        }
      } catch (e) {}
    }

    setIsCheckingImages(true);
    // Async background validation
    await Promise.all(
      testList.map(async (test) => {
        const status = await validateTestImages(test, force);
        newStatuses[test.id] = status;
      })
    );
    setImageStatuses({ ...newStatuses });
    setIsCheckingImages(false);
  }, []);

  // Fetch all custom tests
  const fetchTests = useCallback(async () => {
    setLoading(true);
    if (user && supabase) {
      try {
        const { data, error } = await supabase
          .from('custom_tests')
          .select('id, title, speaking_data, writing_data')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const mapped = data.map((t) => {
            let sp = t.speaking_data;
            let wr = t.writing_data;
            if (typeof sp === 'string') {
              try { sp = JSON.parse(sp); } catch (e) { sp = []; }
            }
            if (typeof wr === 'string') {
              try { wr = JSON.parse(wr); } catch (e) { wr = []; }
            }
            return {
              id: t.id,
              title: t.title || '',
              speaking: Array.isArray(sp) ? sp : [],
              writing: Array.isArray(wr) ? wr : []
            };
          });
          const sorted = mapped.sort((a, b) => a.title.localeCompare(b.title, language === 'vi' ? 'vi' : 'en'));
          setTests(sorted);
          validateAllImages(sorted);
        }
      } catch (err: any) {
        toast.error(language === 'vi' ? 'Không thể tải đề thi: ' + err.message : 'Failed to load tests: ' + err.message);
      }
    } else {
      // Guest fallback
      const saved = localStorage.getItem('toeic_sw_custom_tests');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const mapped: TestData[] = parsed.map((t: any) => ({
            id: t.id,
            title: t.title || '',
            speaking: t.speaking || [],
            writing: t.writing || []
          }));
          const sorted = mapped.sort((a, b) => a.title.localeCompare(b.title, language === 'vi' ? 'vi' : 'en'));
          setTests(sorted);
          validateAllImages(sorted);
        } catch (e) {
          console.error(e);
        }
      }
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: user?.id avoids re-render loops on object reference changes
  }, [user?.id, language, validateAllImages]);

  useEffect(() => {
    if (isAdmin) {
      fetchTests();
    }
  }, [isAdmin, fetchTests]);

  // Delete Test
  const handleDeleteTest = async (testId: string, title: string) => {
    const confirmDelete = window.confirm(
      language === 'vi' 
        ? `Bạn có chắc chắn muốn xóa đề thi "${title}"? Thao tác này không thể hoàn tác.`
        : `Are you sure you want to delete the test "${title}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setIsDeletingId(testId);
    if (user && supabase) {
      try {
        const { error } = await supabase
          .from('custom_tests')
          .delete()
          .eq('id', testId);

        if (error) throw error;

        toast.success(language === 'vi' ? 'Đã xóa đề thi thành công!' : 'Test deleted successfully!');
        fetchTests();
      } catch (err: any) {
        toast.error(language === 'vi' ? 'Lỗi khi xóa: ' + err.message : 'Error deleting: ' + err.message);
      }
    } else {
      // LocalStorage delete
      const saved = localStorage.getItem('toeic_sw_custom_tests');
      if (saved) {
        try {
          const list = JSON.parse(saved);
          const filtered = list.filter((t: any) => t.id !== testId);
          localStorage.setItem('toeic_sw_custom_tests', JSON.stringify(filtered));
          toast.success(language === 'vi' ? 'Đã xóa đề thi cục bộ thành công!' : 'Test deleted locally!');
          fetchTests();
        } catch (e) {
          toast.error('LocalStorage error');
        }
      }
    }
    setIsDeletingId(null);
  };

  // Filtered tests (by section type and search query)
  const filteredTests = tests.filter(test => {
    const hasSpeaking = test.speaking && test.speaking.length > 0;
    const hasWriting = test.writing && test.writing.length > 0;
    
    if (filter === 'full' && !(hasSpeaking && hasWriting)) return false;
    if (filter === 'speaking' && !(hasSpeaking && !hasWriting)) return false;
    if (filter === 'writing' && !(hasWriting && !hasSpeaking)) return false;
    
    return (
      test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div style={{ padding: '24px 5% 40px 5%', width: '100%', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', position: 'relative' }} className="fade-in">
      
      {/* Main List Section */}
      <div className="card-sharp" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', background: 'var(--background-secondary)', border: '1px solid var(--border)', borderRadius: '0px' }}>
        
        {/* Search Bar & Refresh */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, border: '1px solid var(--border)', padding: '8px 16px', background: 'var(--background)', borderRadius: '0px' }}>
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder={language === 'vi' ? 'Tìm kiếm theo tên đề thi hoặc ID...' : 'Search by test title or ID...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.95rem' }}
            />
          </div>
          <button 
            className="btn-secondary"
            onClick={() => validateAllImages(tests, true)}
            disabled={isCheckingImages}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '0px', height: '100%' }}
            title={language === 'vi' ? 'Kiểm tra lại toàn bộ ảnh (Xóa cache)' : 'Re-check all images (Clear cache)'}
          >
            {isCheckingImages ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            <span className="desktop-only">
              {isCheckingImages 
                ? (language === 'vi' ? 'Đang kiểm tra...' : 'Checking...') 
                : (language === 'vi' ? 'Kiểm tra lại ảnh' : 'Recheck Images')
              }
            </span>
          </button>
        </div>

        {/* Classification Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                  color: active ? 'var(--background)' : 'var(--text-primary)',
                  borderRadius: '0px'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
            <div className="pulse-border" style={{ padding: '8px' }}>
              <FileText size={24} className="spin" style={{ color: 'var(--accent)' }} />
            </div>
            <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>
              {language === 'vi' ? 'Đang tải dữ liệu...' : 'Loading data...'}
            </span>
          </div>
        ) : filteredTests.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', border: '1px dashed var(--border)', textAlign: 'center', borderRadius: '0px' }}>
            <HelpCircle size={40} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {language === 'vi' ? 'Không tìm thấy đề thi nào phù hợp.' : 'No matching tests found.'}
            </p>
          </div>
        ) : (
          /* Test Cards Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredTests.map((test) => {
              const speakQs = test.speaking.reduce((acc, p) => acc + (p.questions?.length || 0), 0);
              const writeQs = test.writing.reduce((acc, p) => acc + (p.questions?.length || 0), 0);
              return (
                <div 
                  key={test.id} 
                  className="card-sharp" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    gap: '16px',
                    borderRadius: '0px',
                    borderColor: 'var(--border)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ minWidth: 0 }}>
                      <Link 
                        href={`/admin/tests/edit/${test.id}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '6px', fontWeight: '700', cursor: 'pointer' }} className="hover-accent">
                          {test.title}
                        </h3>
                      </Link>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>ID: {test.id}</span>
                    </div>

                    {/* Top Right Quality Badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0, fontSize: '0.65rem', fontWeight: 'bold' }}>
                      {/* Image Status Badge */}
                      {(() => {
                        const status = imageStatuses[test.id];
                        if (status === 'ok') {
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 8px', borderRadius: '0px' }}>
                              <CheckCircle2 size={10} /> <span>{language === 'vi' ? 'Đủ ảnh' : 'OK'}</span>
                            </span>
                          );
                        } else if (status === 'missing') {
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#eab308', color: '#000', padding: '2px 8px', borderRadius: '0px' }}>
                              <ImageOff size={10} /> <span>{language === 'vi' ? 'Thiếu ảnh' : 'Missing Img'}</span>
                            </span>
                          );
                        } else if (status === 'broken') {
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '0px' }}>
                              <AlertTriangle size={10} /> <span>{language === 'vi' ? 'Lỗi ảnh' : 'Broken Img'}</span>
                            </span>
                          );
                        } else {
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'var(--border)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '0px' }}>
                              <Loader2 size={10} className="spin" /> <span>{language === 'vi' ? 'Kiểm tra ảnh...' : 'Checking...'}</span>
                            </span>
                          );
                        }
                      })()}

                      {/* Completeness Badge */}
                      {(() => {
                        const imgStatus = imageStatuses[test.id];
                        const health = checkTestHealth(test, imgStatus);
                        if (health.isHealthy) {
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 8px', borderRadius: '0px' }}>
                              <CheckCircle2 size={10} /> <span>{language === 'vi' ? 'Đề ổn' : 'Stable'}</span>
                            </span>
                          );
                        } else {
                          return (
                            <span 
                              style={{ 
                                position: 'relative', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '3px', 
                                background: 'rgba(217, 119, 6, 0.15)', 
                                color: '#d97706', 
                                padding: '2px 8px', 
                                borderRadius: '0px',
                                cursor: 'help' 
                              }}
                              onMouseEnter={() => setActiveTooltip(test.id)}
                              onMouseLeave={() => setActiveTooltip(null)}
                            >
                              <AlertCircle size={10} /> 
                              <span>
                                {language === 'vi' 
                                  ? `Chưa ổn (${health.issues.length})` 
                                  : `Incomplete (${health.issues.length})`}
                              </span>

                              {/* Interactive premium tooltip */}
                              {activeTooltip === test.id && (
                                <div style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  right: '0%',
                                  marginBottom: '6px',
                                  width: '280px',
                                  backgroundColor: 'var(--background-secondary)',
                                  border: '1px solid var(--border-focus)',
                                  padding: '12px',
                                  boxShadow: 'var(--shadow)',
                                  zIndex: 100,
                                  borderRadius: '0px',
                                  fontSize: '0.75rem',
                                  color: 'var(--text-primary)',
                                  textAlign: 'left',
                                  fontWeight: 'normal'
                                }}>
                                  <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '6px', color: 'var(--accent)' }}>
                                    {language === 'vi' ? 'Các phần chưa hoàn thành:' : 'Missing items:'}
                                  </div>
                                  <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {health.issues.map((issue, idx) => (
                                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                        <span style={{ color: '#ef4444' }}>•</span>
                                        <span>{issue}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Badges/Stats */}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                    <div style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '0px' }}>
                      <BookOpen size={12} style={{ color: 'var(--accent)' }} />
                      <span>{speakQs} Qs Speaking</span>
                    </div>
                    <div style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '0px' }}>
                      <FileText size={12} style={{ color: 'var(--accent)' }} />
                      <span>{writeQs} Qs Writing</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                    <button
                      onClick={() => {
                        setIsNavigatingId(test.id);
                        router.push(`/admin/tests/edit/${test.id}`);
                      }}
                      className="btn-primary" 
                      disabled={isNavigatingId === test.id}
                      style={{ 
                        flex: 1, 
                        justifyContent: 'center', 
                        padding: '6px 12px', 
                        fontSize: '0.85rem', 
                        background: 'var(--accent)', 
                        borderColor: 'var(--accent)',
                        color: '#FFF',
                        borderRadius: '0px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isNavigatingId === test.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Edit2 size={14} />
                      )}
                      <span>{language === 'vi' ? 'Chỉnh sửa' : 'Edit'}</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteTest(test.id, test.title)}
                      className="btn-secondary" 
                      disabled={isDeletingId === test.id}
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '0.85rem', 
                        color: '#EF4444', 
                        borderColor: '#EF4444',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '0px'
                      }}
                    >
                      {isDeletingId === test.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
