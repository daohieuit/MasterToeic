'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Plus, Trash2, Download, Play, Shield, Key, Database, RefreshCw, Settings, FileJson, Cloud, Loader, Upload, Copy, Check, AlertTriangle, ImageOff, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { language, adminApiKey, setAdminApiKey, adminBaseUrl, setAdminBaseUrl, user, isAdmin } = useApp();
  
  // Test generation settings
  const [skill, setSkill] = useState<'speaking' | 'writing' | 'full'>('speaking');
  const [topics, setTopics] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Accordion state for API settings
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  
  // Local state for API configurations to prevent saving to database on every keystroke
  const [apiKeyLocal, setApiKeyLocal] = useState('');
  const [baseUrlLocal, setBaseUrlLocal] = useState('');
  const [proxyStatus, setProxyStatus] = useState<'online' | 'offline' | 'not_applicable'>('not_applicable');


  const checkStatusForUrl = useCallback(async (url: string) => {
    if (!isAdmin || !supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/admin/pipeline?proxyUrl=${encodeURIComponent(url)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.proxyStatus) {
          setProxyStatus(data.proxyStatus);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [isAdmin]);

  const fetchProxyStatus = useCallback(() => {
    const baseUrlToUse = localStorage.getItem('admin_base_url') || adminBaseUrl || '';
    checkStatusForUrl(baseUrlToUse);
  }, [adminBaseUrl, checkStatusForUrl]);

  useEffect(() => {
    setApiKeyLocal(adminApiKey);
    setBaseUrlLocal(adminBaseUrl);

    if (adminApiKey && adminBaseUrl) {
      const isWeb = adminBaseUrl.includes('localhost') || adminBaseUrl.includes('127.0.0.1') || adminBaseUrl.includes('8081');
      if (isWeb) {
        if (!localStorage.getItem('admin_api_key_web2api')) {
          localStorage.setItem('admin_api_key_web2api', adminApiKey);
        }
      } else {
        if (!localStorage.getItem('admin_api_key_aistudio')) {
          localStorage.setItem('admin_api_key_aistudio', adminApiKey);
        }
      }
    }
    
    if (isAdmin) {
      fetchProxyStatus();
    }
  }, [adminApiKey, adminBaseUrl, isAdmin, fetchProxyStatus]);

  useEffect(() => {
    if (!adminApiKey) {
      setIsSettingsExpanded(true);
    }
  }, [adminApiKey]);

  const handleSwitchToWeb2API = () => {
    if (baseUrlLocal.includes('googleapis.com')) {
      localStorage.setItem('admin_api_key_aistudio', apiKeyLocal);
    }
    setBaseUrlLocal('http://localhost:8081/v1');
    const savedWebKey = localStorage.getItem('admin_api_key_web2api') || '';
    setApiKeyLocal(savedWebKey);
    checkStatusForUrl('http://localhost:8081/v1');
  };

  const handleSwitchToAIStudio = () => {
    if (baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081')) {
      localStorage.setItem('admin_api_key_web2api', apiKeyLocal);
    }
    setBaseUrlLocal('https://generativelanguage.googleapis.com/v1beta/openai');
    const savedStudioKey = localStorage.getItem('admin_api_key_aistudio') || '';
    setApiKeyLocal(savedStudioKey);
    setProxyStatus('not_applicable');
  };

  const handleCopyPrompt = async (fileName: string, key: string) => {
    try {
      const response = await fetch(fileName);
      if (!response.ok) throw new Error("Failed to load template");
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err: any) {
      toast.error(language === 'vi' ? 'Không thể sao chép: ' + err.message : 'Failed to copy: ' + err.message);
    }
  };
  
  // Custom tests saved in browser LocalStorage / Database
  const [customTests, setCustomTests] = useState<any[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [testStatuses, setTestStatuses] = useState<Record<string, 'ok' | 'missing' | 'broken'>>({});

  // Helper to validate test images
  const validateTestImages = (test: any): Promise<'ok' | 'missing' | 'broken'> => {
    // 1. Check localStorage Cache
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
    if (cachedVal && (Date.now() - cachedVal.lastChecked < checkThreshold)) {
      return Promise.resolve(cachedVal.status);
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
      
      // Save status immediately to cache
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

  // Load custom tests list
  useEffect(() => {
    const fetchCustomTests = async () => {
      setLoadingCustom(true);
      if (user && supabase) {
        try {
          const { data, error } = await supabase
            .from('custom_tests')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (!error && data) {
            setCustomTests(data.map(t => ({
              id: t.id,
              title: t.title,
              description: t.description,
              speaking: t.speaking_data,
              writing: t.writing_data
            })));
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        const saved = localStorage.getItem('toeic_sw_custom_tests');
        if (saved) {
          try {
            setCustomTests(JSON.parse(saved));
          } catch (e) {
            console.error(e);
          }
        }
      }
      setLoadingCustom(false);
    };

    if (isAdmin) {
      fetchCustomTests();
    }
  }, [isAdmin, user]);

  // Run image validation when customTests changes
  useEffect(() => {
    const validateAll = async () => {
      const newStatuses: Record<string, 'ok' | 'missing' | 'broken'> = {};
      await Promise.all(
        customTests.map(async (test) => {
          const status = await validateTestImages(test);
          newStatuses[test.id] = status;
        })
      );
      setTestStatuses(newStatuses);
    };
    if (customTests.length > 0) {
      validateAll();
    }
  }, [customTests]);

  const getNextTestNumberAndId = (
    skillType: 'full' | 'speaking' | 'writing',
    existingCustomTests: any[]
  ) => {
    let count = 0;
    
    existingCustomTests.forEach(t => {
      const hasSpeaking = !!t.speaking;
      const hasWriting = !!t.writing;
      if (skillType === 'full' && hasSpeaking && hasWriting) count++;
      if (skillType === 'speaking' && hasSpeaking && !hasWriting) count++;
      if (skillType === 'writing' && hasWriting && !hasSpeaking) count++;
    });
    
    const nextNum = count + 1;
    const prefix = skillType === 'full' ? 'TOEIC SW TEST' : skillType === 'speaking' ? 'TOEIC SPEAKING TEST' : 'TOEIC WRITING TEST';
    const idPrefix = skillType === 'full' ? 'toeic_sw_test' : skillType === 'speaking' ? 'toeic_speaking_test' : 'toeic_writing_test';
    
    return {
      title: `${prefix} ${nextNum}`,
      id: `${idPrefix}_${nextNum}`
    };
  };

  const handleGenerate = async () => {
    const keyToUse = localStorage.getItem('admin_api_key') || adminApiKey || '';
    if (!keyToUse) {
      toast.error(language === 'vi' ? 'Vui lòng cung cấp Gemini API Key trong phần Cấu hình trước khi tạo đề.' : 'Please configure your Gemini API Key first.');
      return;
    }

    const isWeb = baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081');
    if (isWeb && proxyStatus === 'offline') {
      toast.error(language === 'vi' 
        ? 'Máy chủ proxy (Web2API) chưa được bật! Vui lòng mở terminal và chạy lệnh: python gemini_web2api.py --cookie-file cookie.txt' 
        : 'Proxy server (Web2API) is offline! Please run: python gemini_web2api.py --cookie-file cookie.txt');
      return;
    }

    setGenerating(true);
    setGeneratedTest(null);
    setIsSaved(false);
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          return 95;
        }
        const increment = prev < 40 ? 4 : prev < 75 ? 2 : prev < 90 ? 1 : 0.5;
        return Number((prev + increment).toFixed(1));
      });
    }, 1000);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': keyToUse,
          'x-gemini-base-url': adminBaseUrl
        },
        body: JSON.stringify({ skill, topics })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Sinh đề thất bại');
      }

      const test = await response.json();
      setProgress(100);
      
      // Auto-assign sequential name and ID
      const hasSpeaking = !!test.speaking;
      const hasWriting = !!test.writing;
      const testSkill: 'full' | 'speaking' | 'writing' = (hasSpeaking && hasWriting) ? 'full' : hasSpeaking ? 'speaking' : 'writing';
      const autoNaming = getNextTestNumberAndId(testSkill, customTests);
      test.title = autoNaming.title;
      test.id = autoNaming.id;
      
      // Delay briefly so user sees 100% completion
      setTimeout(() => {
        setGeneratedTest(test);
      }, 400);
    } catch (err: any) {
      console.error(err);
      toast.error((language === 'vi' ? 'Lỗi sinh đề: ' : 'Generation failed: ') + err.message);
    } finally {
      clearInterval(interval);
      setGenerating(false);
    }
  };

  // Save generated test directly to browser LocalStorage list or Supabase database
  const handleSaveToBrowser = async () => {
    if (!generatedTest) return;

    if (user && supabase) {
      // Save to Supabase Cloud
      try {
        const { error } = await supabase
          .from('custom_tests')
          .insert({
            id: generatedTest.id,
            title: generatedTest.title,
            description: generatedTest.description,
            speaking_data: generatedTest.speaking || null,
            writing_data: generatedTest.writing || null,
            created_by: user.id
          });

        if (error) throw error;
        
        const testListObj = {
          id: generatedTest.id,
          title: generatedTest.title,
          description: generatedTest.description,
          speaking: generatedTest.speaking,
          writing: generatedTest.writing
        };
        setCustomTests([testListObj, ...customTests.filter(t => t.id !== generatedTest.id)]);
        setIsSaved(true);
        toast.success(language === 'vi' ? 'Đã lưu đề thi thành công lên đám mây Supabase! Mọi học viên đều có thể làm bài.' : 'Test successfully saved to Supabase Cloud! All students can practice it.');
      } catch (err: any) {
        console.error(err);
        toast.error(language === 'vi' ? 'Không thể lưu lên Cloud: ' + err.message : 'Failed to save to Cloud: ' + err.message);
      }
    } else {
      // Local fallback
      const newList = [generatedTest, ...customTests.filter(t => t.id !== generatedTest.id)];
      setCustomTests(newList);
      localStorage.setItem('toeic_sw_custom_tests', JSON.stringify(newList));
      setIsSaved(true);
      toast.success(language === 'vi' ? 'Đã lưu đề thi vào Bộ nhớ Trình duyệt cục bộ! (Chưa đăng nhập)' : 'Test saved to local browser storage! (Guest Mode)');
    }
  };

  // Download test as JSON file
  const handleDownloadJSON = () => {
    if (!generatedTest) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(generatedTest, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${generatedTest.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDeleteCustom = async (id: string) => {
    if (confirm(language === 'vi' ? 'Bạn có muốn xóa đề thi này không?' : 'Do you want to delete this test?')) {
      if (user && supabase) {
        // Delete in cloud
        const { error } = await supabase
          .from('custom_tests')
          .delete()
          .eq('id', id);
        
        if (error) {
          toast.error('Không thể xóa đề thi trên Cloud: ' + error.message);
          return;
        }
      } else {
        // Local fallback
        const savedTests = localStorage.getItem('toeic_sw_custom_tests');
        if (savedTests) {
          const list = JSON.parse(savedTests);
          const filtered = list.filter((t: any) => t.id !== id);
          localStorage.setItem('toeic_sw_custom_tests', JSON.stringify(filtered));
        }
      }
      setCustomTests(customTests.filter(t => t.id !== id));
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const test = JSON.parse(text);

        // Basic validation
        if (!test.speaking && !test.writing) {
          toast.error(language === 'vi' ? 'Đề thi phải có ít nhất phần speaking hoặc writing.' : 'The test must contain at least speaking or writing data.');
          return;
        }

        // Auto-assign sequential name and ID
        const hasSpeaking = !!test.speaking;
        const hasWriting = !!test.writing;
        const testSkill: 'full' | 'speaking' | 'writing' = (hasSpeaking && hasWriting) ? 'full' : hasSpeaking ? 'speaking' : 'writing';
        const autoNaming = getNextTestNumberAndId(testSkill, customTests);
        test.title = autoNaming.title;
        test.id = autoNaming.id;

        // Do not auto-inject random images on import to allow manual custom images

        const keyToUse = localStorage.getItem('admin_api_key') || adminApiKey || '';
        if (keyToUse) {
          const isWeb = baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081');
          if (isWeb && proxyStatus === 'offline') {
            toast.error(language === 'vi' 
              ? 'Máy chủ proxy (Web2API) chưa được bật! Vui lòng mở terminal và chạy lệnh: python gemini_web2api.py --cookie-file cookie.txt' 
              : 'Proxy server (Web2API) is offline! Please run: python gemini_web2api.py --cookie-file cookie.txt');
            setGeneratedTest(test);
            toast.success(language === 'vi' ? 'Import thành công (Chưa đồng bộ Vision AI do proxy offline).' : 'Imported successfully (AI Vision sync bypassed because proxy is offline).');
            return;
          }
          const toastId = toast.loading(language === 'vi' ? 'Đang dùng Vision AI phân tích ảnh và tạo từ khóa...' : 'Analyzing images and generating keywords with Vision AI...');
          try {
            const syncResponse = await fetch('/api/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-gemini-api-key': keyToUse,
                'x-gemini-base-url': adminBaseUrl
              },
              body: JSON.stringify({ action: 'sync_images', testData: test })
            });

            if (!syncResponse.ok) {
              throw new Error('Sync failed');
            }

            const syncedTest = await syncResponse.json();
            setGeneratedTest(syncedTest);
            toast.success(language === 'vi' ? 'Import và đồng bộ ảnh bằng Vision AI thành công!' : 'Import and AI image sync completed!', { id: toastId });
          } catch (syncErr) {
            console.error('Vision AI sync failed on import, using raw test:', syncErr);
            setGeneratedTest(test);
            toast.success(language === 'vi' ? 'Import thành công (Chưa đồng bộ Vision AI do lỗi API).' : 'Imported successfully (AI Vision sync bypassed due to API error).', { id: toastId });
          }
        } else {
          setGeneratedTest(test);
          toast.success(language === 'vi' ? 'Import thành công (Hãy cấu hình API Key để bật Vision AI đồng bộ ảnh).' : 'Imported successfully (Configure API key to enable Vision AI sync).');
        }

        setIsSaved(false);
      } catch (err: any) {
        toast.error((language === 'vi' ? 'Lỗi đọc file JSON: ' : 'Failed to read JSON: ') + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const t = {
    vi: {
      authTitle: 'Khu vực quản trị Admin',
      authDesc: 'Vui lòng nhập mật khẩu quản trị để tiếp tục (Mặc định: admin123)',
      passwordPlace: 'Mật khẩu...',
      login: 'Đăng nhập',
      adminPanel: 'Bảng quản trị tạo đề thi',
      genHeader: 'Sinh đề thi mới bằng AI',
      selectSkill: 'Chọn kỹ năng thi',
      speaking: 'TOEIC Speaking (11 câu)',
      writing: 'TOEIC Writing (8 câu)',
      full: 'TOEIC Full Test (Nói & Viết)',
      topicsLabel: 'Chủ đề định hướng đề bài (Không bắt buộc)',
      topicsPlace: 'Ví dụ: office meeting, delayed project, dining review...',
      generateBtn: 'Bắt đầu sinh đề bằng Gemini',
      generating: 'Đang kết nối Gemini và sinh đề thi. Vui lòng đợi (30-60 giây)...',
      saveBrowser: 'Lưu vào Đám mây / Trình duyệt',
      downloadJson: 'Tải tệp JSON (để thêm vào code)',
      localTestsTitle: 'Danh sách đề tự tạo trực tuyến',
      noLocalTests: 'Chưa có đề tự tạo nào được lưu.',
      previewTitle: 'Xem trước nội dung đề đã sinh',
      backDashboard: 'Quay lại Trang chủ',
      apiKeyLabel: 'Cấu hình Gemini API Key (Cục bộ)',
      baseUrlLabel: 'Endpoint API Base URL',
      saveConfig: 'Lưu Cấu Hình',
      configDesc: 'Cấu hình này được lưu trực tiếp trên trình duyệt của riêng bạn.',
      loadingTests: 'Đang tải danh sách đề...',
      cloudStatus: 'Đã kết nối đám mây (Supabase)',
      localStatus: 'Chế độ Guest (Lưu cục bộ ở trình duyệt)'
    },
    en: {
      authTitle: 'Admin Access Gate',
      authDesc: 'Please enter admin password to continue (Default: admin123)',
      passwordPlace: 'Password...',
      login: 'Login',
      adminPanel: 'Admin Test Generator Panel',
      genHeader: 'Generate New Test with AI',
      selectSkill: 'Select Exam Skill',
      speaking: 'TOEIC Speaking (11 Qs)',
      writing: 'TOEIC Writing (8 Qs)',
      full: 'TOEIC Full Test (Speaking & Writing)',
      topicsLabel: 'Orientation Topics/Themes (Optional)',
      topicsPlace: 'E.g., office meeting, delayed project, dining review...',
      generateBtn: 'Start Generation with Gemini',
      generating: 'Connecting to Gemini and generating test. Please wait (30-60s)...',
      saveBrowser: 'Save to Cloud / Browser',
      downloadJson: 'Download JSON File',
      localTestsTitle: 'Custom Tests Online/Local',
      noLocalTests: 'No custom tests saved yet.',
      previewTitle: 'Generated Test Preview',
      backDashboard: 'Back to Dashboard',
      apiKeyLabel: 'Gemini API Key (Local storage)',
      baseUrlLabel: 'API Base URL Endpoint',
      saveConfig: 'Save Configuration',
      configDesc: 'Configuration is saved securely in your browser session.',
      loadingTests: 'Loading custom tests...',
      cloudStatus: 'Connected to Cloud (Supabase)',
      localStatus: 'Guest Mode (Local browser storage)'
    }
  }[language];

  return (
    <div style={{ padding: '24px 5% 0 5%', width: '100%', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} className="fade-in">

      {/* Cloud Status Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--background-secondary)', border: '1px solid var(--border)', padding: '12px 16px', marginBottom: '24px', fontSize: '0.85rem' }}>
        {user && supabase ? (
          <>
            <Cloud size={16} style={{ color: 'var(--success)' }} />
            <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{t.cloudStatus}</span>
            <span style={{ color: 'var(--text-secondary)' }}>- Đề thi sẽ được lưu lên Cloud để đồng bộ thiết bị khác.</span>
          </>
        ) : (
          <>
            <Database size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{t.localStatus}</span>
            <span style={{ color: 'var(--text-secondary)' }}>- Đăng ký và đăng nhập ở trang chủ để bật tính năng lưu lên Cloud.</span>
          </>
        )}
      </div>

      <div className="admin-dashboard-grid">
        
        {/* Left column (Main Generator Area): AI Test Generator Box & Preview */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Grid Container for Creation Options */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            
            {/* Generator Box */}
            <div className="card-sharp">
              <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: 'var(--accent)' }}>{t.genHeader}</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px' }}>{t.selectSkill}</label>
                  <select
                    value={skill}
                    onChange={(e) => setSkill(e.target.value as any)}
                    className="admin-premium-input"
                    style={{ width: '100%', padding: '10px 12px', fontWeight: 'bold' }}
                  >
                    <option value="speaking">{t.speaking}</option>
                    <option value="writing">{t.writing}</option>
                    <option value="full">{t.full}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px' }}>{t.topicsLabel}</label>
                  <input
                    type="text"
                    placeholder={t.topicsPlace}
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    className="admin-premium-input"
                    style={{ width: '100%', padding: '10px 12px' }}
                  />
                </div>
                <button 
                  className="btn-accent" 
                  onClick={handleGenerate} 
                  disabled={generating}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontWeight: 'bold' }}
                >
                  {generating ? (
                    <>
                      <RefreshCw className="pulse-border" size={18} style={{ marginRight: '8px' }} />
                      {t.generating}
                    </>
                  ) : (
                    t.generateBtn
                  )}
                </button>

                {generating && (
                  <div style={{ marginTop: '16px' }} className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>{language === 'vi' ? 'Đang tạo đề bằng AI...' : 'Generating test with AI...'}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--border)', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${progress}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, var(--accent), var(--success))', 
                          transition: 'width 0.2s ease' 
                        }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Import JSON Box */}
            <div className="card-sharp">
              <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                <FileJson size={18} /> {language === 'vi' ? 'Nhập đề từ file JSON' : 'Import Test from JSON'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
                {language === 'vi' 
                  ? 'Tải lên file JSON được tạo trực tiếp từ Gemini. Hệ thống sẽ tự động chèn ảnh ngẫu nhiên nếu thiếu.' 
                  : 'Upload a JSON file generated directly from Gemini. The system will auto-inject random images if missing.'}
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div 
                  style={{ 
                    border: '2px dashed var(--border)', 
                    padding: '24px 16px', 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    background: 'var(--background-secondary)',
                    borderRadius: '0px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                  onClick={() => document.getElementById('json-file-input')?.click()}
                >
                  <Upload size={24} style={{ margin: '0 auto 8px', color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '0.85rem', display: 'block', fontWeight: 'bold' }}>
                    {language === 'vi' ? 'Chọn file .json hoặc kéo thả vào đây' : 'Choose .json file or drag & drop'}
                  </span>
                  <input 
                    type="file" 
                    id="json-file-input" 
                    accept=".json" 
                    style={{ display: 'none' }} 
                    onChange={handleImportJSON}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a 
                    href="/toeic_prompt_template.txt" 
                    download
                    className="btn-secondary" 
                    style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: '0.8rem', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> {language === 'vi' ? 'Tải Prompt Full Test S&W (.txt)' : 'Download Full Test Prompt (.txt)'}
                  </a>
                  <button
                    className="btn-secondary"
                    onClick={() => handleCopyPrompt('/toeic_prompt_template.txt', 'full')}
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={language === 'vi' ? 'Copy Prompt' : 'Copy Prompt'}
                  >
                    {copiedKey === 'full' ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <a 
                    href="/toeic_speaking_prompt_template.txt" 
                    download
                    className="btn-secondary" 
                    style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: '0.8rem', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> {language === 'vi' ? 'Tải Prompt Speaking Only (.txt)' : 'Download Speaking Prompt (.txt)'}
                  </a>
                  <button
                    className="btn-secondary"
                    onClick={() => handleCopyPrompt('/toeic_speaking_prompt_template.txt', 'speaking')}
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={language === 'vi' ? 'Copy Prompt' : 'Copy Prompt'}
                  >
                    {copiedKey === 'speaking' ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <a 
                    href="/toeic_writing_prompt_template.txt" 
                    download
                    className="btn-secondary" 
                    style={{ flex: 1, textDecoration: 'none', justifyContent: 'center', fontSize: '0.8rem', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> {language === 'vi' ? 'Tải Prompt Writing Only (.txt)' : 'Download Writing Prompt (.txt)'}
                  </a>
                  <button
                    className="btn-secondary"
                    onClick={() => handleCopyPrompt('/toeic_writing_prompt_template.txt', 'writing')}
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={language === 'vi' ? 'Copy Prompt' : 'Copy Prompt'}
                  >
                    {copiedKey === 'writing' ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Generated Result Preview */}
          {generatedTest && (
            <div className="card-sharp fade-in" style={{ borderColor: 'var(--success)' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--success)' }}>{t.previewTitle}</h3>
              
              <div style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '16px', maxHeight: '240px', overflowY: 'auto', marginBottom: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} className="no-scrollbar">
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(generatedTest, null, 2)}</pre>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-primary" onClick={handleSaveToBrowser} style={{ flex: 1, justifyContent: 'center' }} disabled={isSaved}>
                    <Save size={16} /> {isSaved ? (language === 'vi' ? 'Đã lưu' : 'Saved') : t.saveBrowser}
                  </button>
                  <button className="btn-secondary" onClick={handleDownloadJSON} style={{ flex: 1, justifyContent: 'center' }}>
                    <Download size={16} /> {t.downloadJson}
                  </button>
                </div>
                {isSaved && (
                  <Link 
                    href={`/test/${generatedTest.id}`} 
                    className="btn-accent" 
                    style={{ textDecoration: 'none', justifyContent: 'center', width: '100%', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Play size={16} /> {language === 'vi' ? 'Bắt đầu làm bài thi ngay' : 'Start practicing now'}
                  </Link>
                )}
              </div>
            </div>
          )}

        </section>

        {/* Right column (Config & Management Area): API Settings, Import JSON & Saved Tests */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Settings Box */}
          {/* Settings Box */}
          <div className="card-sharp" style={{ padding: '20px' }}>
            <div 
              onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Key size={18} style={{ color: 'var(--accent)' }} /> 
                <span>API Settings</span>
                {isSettingsExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />}
              </h3>
              
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 'bold', 
                padding: '4px 8px', 
                borderRadius: '0px',
                border: '1px solid',
                borderColor: (baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081')) 
                  ? (proxyStatus === 'online' ? '#22c55e' : '#ef4444') 
                  : baseUrlLocal.includes('googleapis.com')
                    ? '#22c55e'
                    : 'var(--border)',
                background: (baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081')) 
                  ? (proxyStatus === 'online' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)') 
                  : baseUrlLocal.includes('googleapis.com')
                    ? 'rgba(34, 197, 94, 0.08)'
                    : 'rgba(156, 163, 175, 0.08)',
                color: (baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081')) 
                  ? (proxyStatus === 'online' ? '#22c55e' : '#ef4444') 
                  : baseUrlLocal.includes('googleapis.com')
                    ? '#22c55e'
                    : 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {(baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081')) && (
                  <span 
                    className="pulsing-dot" 
                    style={{ 
                      backgroundColor: proxyStatus === 'online' ? '#22c55e' : '#ef4444',
                      animation: proxyStatus === 'online' ? 'adminDotPulse 1.6s infinite ease-in-out' : 'none'
                    }} 
                  />
                )}
                {(baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081')) 
                  ? (proxyStatus === 'online' ? 'Web2API Proxy: ON' : 'Web2API Proxy: OFF') 
                  : baseUrlLocal.includes('googleapis.com')
                    ? 'Google AI Studio'
                    : (language === 'vi' ? 'Tự chọn' : 'Custom')}
              </span>
            </div>
            
            {isSettingsExpanded && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-in">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>{t.configDesc}</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>{t.apiKeyLabel}</label>
                    <input 
                      type="password" 
                      value={apiKeyLocal}
                      onChange={(e) => setApiKeyLocal(e.target.value)}
                      placeholder="sk-..."
                      className="admin-premium-input"
                      style={{ width: '100%', padding: '8px 12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>{t.baseUrlLabel}</label>
                    <input 
                      type="text" 
                      value={baseUrlLocal}
                      onChange={(e) => setBaseUrlLocal(e.target.value)}
                      className="admin-premium-input"
                      style={{ width: '100%', padding: '8px 12px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button 
                        className="btn-secondary" 
                        onClick={handleSwitchToWeb2API}
                        style={{ 
                          flex: 1, 
                          padding: '6px', 
                          fontSize: '0.75rem', 
                          justifyContent: 'center',
                          borderRadius: '0px',
                          borderColor: (baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081')) ? 'var(--accent)' : 'var(--border)'
                        }}
                      >
                        Web2API (Local)
                      </button>
                      <button 
                        className="btn-secondary" 
                        onClick={handleSwitchToAIStudio}
                        style={{ 
                          flex: 1, 
                          padding: '6px', 
                          fontSize: '0.75rem', 
                          justifyContent: 'center',
                          borderRadius: '0px',
                          borderColor: baseUrlLocal.includes('googleapis.com') ? 'var(--accent)' : 'var(--border)'
                        }}
                      >
                        AI Studio (Direct)
                      </button>
                    </div>
                  </div>

                  {(baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081')) && (
                    <div style={{ padding: '12px', background: 'var(--background-secondary)', border: '1px solid var(--border)', borderRadius: '0px' }} className="fade-in">
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {language === 'vi' ? 'Lệnh chạy server Proxy (Web2API):' : 'Proxy server run command (Web2API):'}
                      </label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <code 
                          className="admin-code-input"
                          style={{ flex: 1, fontSize: '0.75rem', wordBreak: 'break-all', padding: '6px 8px', display: 'block' }}
                        >
                          python gemini_web2api.py --cookie-file cookie.txt
                        </code>
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            navigator.clipboard.writeText('python gemini_web2api.py --cookie-file cookie.txt');
                            toast.success(language === 'vi' ? 'Đã copy lệnh chạy proxy!' : 'Proxy command copied!');
                          }}
                          style={{ padding: '8px 10px', borderRadius: '0px' }}
                          title={language === 'vi' ? 'Sao chép' : 'Copy'}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  <button 
                    className="btn-primary" 
                    onClick={async () => {
                      await setAdminApiKey(apiKeyLocal);
                      await setAdminBaseUrl(baseUrlLocal);
                      
                      if (baseUrlLocal.includes('localhost') || baseUrlLocal.includes('127.0.0.1') || baseUrlLocal.includes('8081')) {
                        localStorage.setItem('admin_api_key_web2api', apiKeyLocal);
                      } else if (baseUrlLocal.includes('googleapis.com')) {
                        localStorage.setItem('admin_api_key_aistudio', apiKeyLocal);
                      }
                      
                      toast.success(language === 'vi' ? 'Đã lưu và đồng bộ cấu hình API!' : 'API Configuration Saved and Synced!');
                    }}
                    style={{ width: '100%', justifyContent: 'center', padding: '10px', fontWeight: 'bold', marginTop: '8px' }}
                  >
                    {t.saveConfig || (language === 'vi' ? 'Lưu cấu hình' : 'Save Config')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Browser Custom Tests List */}
          <div className="card-sharp">
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} style={{ color: 'var(--accent)' }} /> {t.localTestsTitle}
            </h3>

            {loadingCustom ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader className="pulse-border" size={16} /> {t.loadingTests}
              </p>
            ) : customTests.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
                {t.noLocalTests}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {customTests.slice(0, 5).map((test) => {
                  const status = testStatuses[test.id] || 'ok';
                  const borderStyle = status === 'missing' 
                    ? '1px solid #eab308' 
                    : status === 'broken' 
                      ? '1px solid #ef4444' 
                      : '1px solid var(--border)';
                  const bgStyle = status === 'missing'
                    ? 'rgba(234, 179, 8, 0.04)'
                    : status === 'broken'
                      ? 'rgba(239, 68, 68, 0.04)'
                      : 'var(--background)';

                  return (
                    <div 
                      key={test.id} 
                      className="admin-test-item-card"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px', 
                        border: borderStyle, 
                        background: bgStyle, 
                        borderRadius: '0px' 
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{test.title}</h4>
                          {status === 'missing' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', background: '#eab308', color: '#000', padding: '2px 6px', borderRadius: '0px', fontWeight: 'bold' }}>
                              <ImageOff size={10} /> {language === 'vi' ? 'Thiếu ảnh' : 'Missing Image'}
                            </span>
                          )}
                          {status === 'broken' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '0px', fontWeight: 'bold' }}>
                              <AlertTriangle size={10} /> {language === 'vi' ? 'Lỗi ảnh' : 'Broken URL'}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {test.id}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Link href={`/test/${test.id}`} className="btn-secondary" style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', borderRadius: '0px' }} title={language === 'vi' ? 'Làm bài' : 'Practice'}>
                          <Play size={14} style={{ color: 'var(--accent)' }} />
                        </Link>
                        <button onClick={() => handleDeleteCustom(test.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </aside>

      </div>

      {/* Simplified Footer matching home screen */}
      <footer style={{ marginTop: 'auto', paddingTop: '24px', paddingBottom: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
        <span>DAOHIEUIT</span>
      </footer>
    </div>
  );
}
