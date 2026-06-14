'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Settings,
  Database,
  Cloud,
  FileJson,
  Upload,
  Download,
  Copy,
  Check,
  Play,
  Trash2,
  AlertTriangle,
  ImageOff,
  CheckCircle2,
  RefreshCw,
  Loader2,
  FileText
} from 'lucide-react';

export default function AdminTestsPage() {
  const router = useRouter();
  const { language, adminApiKey, adminBaseUrl, user, isAdmin } = useApp();

  // Test states
  const [tests, setTests] = useState<any[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testStatuses, setTestStatuses] = useState<Record<string, 'ok' | 'missing' | 'broken'>>({});
  const [updatingMissing, setUpdatingMissing] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState<'all' | 'sw' | 's' | 'w'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'missing' | 'broken'>('all');

  // Pipeline states
  const [rawUrlsText, setRawUrlsText] = useState('');
  const [pipelineStep, setPipelineStep] = useState<'idle' | 'uploading' | 'generating_docx' | 'success' | 'error'>('idle');
  const [pipelineProgress, setPipelineProgress] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [unusedImagesCount, setUnusedImagesCount] = useState<number | null>(null);
  const [proxyStatus, setProxyStatus] = useState<'online' | 'offline' | 'not_applicable'>('not_applicable');

  // Import JSON states
  const [geminiJsonText, setGeminiJsonText] = useState('');
  const [importingJson, setImportingJson] = useState(false);

  // Fetch Unused Images Count
  const fetchUnusedImagesCount = useCallback(async () => {
    if (!isAdmin || !supabase) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const baseUrlToUse = localStorage.getItem('admin_base_url') || adminBaseUrl || '';
      const res = await fetch(`/api/admin/pipeline?proxyUrl=${encodeURIComponent(baseUrlToUse)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUnusedImagesCount(data.totalUnused);
        if (data.proxyStatus) {
          setProxyStatus(data.proxyStatus);
        }
      }
    } catch (e) {
      console.error('Failed to fetch unused images count:', e);
    }
  }, [isAdmin, adminBaseUrl]);

  // Image validation helper (defined here as it does not rely on React state)
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

  const validateAllImages = useCallback(async (testList: any[]) => {
    const newStatuses: Record<string, 'ok' | 'missing' | 'broken'> = {};
    await Promise.all(
      testList.map(async (test) => {
        const status = await validateTestImages(test);
        newStatuses[test.id] = status;
      })
    );
    setTestStatuses(newStatuses);
  }, []);

  // Load custom tests
  const fetchTests = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingTests(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('custom_tests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted = data.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            speaking: t.speaking_data,
            writing: t.writing_data
          }));
          setTests(formatted);
          validateAllImages(formatted);
        }
      }
    } catch (e: any) {
      toast.error(language === 'vi' ? 'Không thể tải đề thi: ' + e.message : 'Failed to fetch tests: ' + e.message);
    } finally {
      setLoadingTests(false);
    }
  }, [isAdmin, language, validateAllImages]);

  useEffect(() => {
    if (isAdmin) {
      fetchTests();
      fetchUnusedImagesCount();
    }
  }, [isAdmin, fetchTests, fetchUnusedImagesCount]);

  // Delete Test
  const handleDeleteTest = async (id: string) => {
    if (confirm(language === 'vi' ? 'Bạn có muốn xóa đề thi này không?' : 'Do you want to delete this test?')) {
      try {
        if (supabase) {
          const { error } = await supabase
            .from('custom_tests')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          setTests(tests.filter(t => t.id !== id));
          toast.success(language === 'vi' ? 'Đã xóa đề thi.' : 'Test deleted.');
        }
      } catch (err: any) {
        toast.error(language === 'vi' ? 'Không thể xóa: ' + err.message : 'Delete failed: ' + err.message);
      }
    }
  };

  // Pipeline Step 1: Upload ImgBB & Generate Docx
  const handleUploadAndGenerateDocx = async () => {
    const urls = rawUrlsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));

    if (urls.length === 0) {
      toast.error(language === 'vi' ? 'Vui lòng cung cấp ít nhất 1 link ảnh hợp lệ.' : 'Please provide at least 1 valid image URL.');
      return;
    }

    try {
      if (!supabase) {
        throw new Error(language === 'vi' ? 'Supabase chưa được cấu hình' : 'Supabase is not configured');
      }
      setPipelineStep('uploading');
      setPipelineProgress(language === 'vi' ? `Đang tải ảnh lên ImgBB (0/${urls.length})...` : `Uploading images to ImgBB (0/${urls.length})...`);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1. Upload to ImgBB via server proxy
      const uploadRes = await fetch('/api/admin/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upload_imgbb', urls })
      });

      if (!uploadRes.ok) {
        throw new Error(language === 'vi' ? 'Lỗi upload ảnh lên ImgBB' : 'Failed to upload images to ImgBB');
      }

      const { results } = await uploadRes.json();
      const successfulUrls = results
        .filter((r: any) => r.imgbbUrl)
        .map((r: any) => r.imgbbUrl);

      const failedCount = results.filter((r: any) => r.error).length;
      if (successfulUrls.length === 0) {
        throw new Error(language === 'vi' ? 'Không có hình ảnh nào được tải lên ImgBB thành công.' : 'No images were successfully uploaded to ImgBB.');
      }

      toast.success(
        language === 'vi' 
          ? `Đã tải lên ${successfulUrls.length} ảnh. Thất bại: ${failedCount}`
          : `Uploaded ${successfulUrls.length} images. Failed: ${failedCount}`
      );

      // 2. Generate DOCX file
      setPipelineStep('generating_docx');
      setPipelineProgress(language === 'vi' ? 'Đang tạo và đóng gói tài liệu Word (.docx)...' : 'Creating and packaging Word document (.docx)...');

      const docxRes = await fetch('/api/admin/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'create_docx', urls: successfulUrls })
      });

      if (!docxRes.ok) {
        throw new Error(language === 'vi' ? 'Không thể tạo file Word.' : 'Failed to generate Word document.');
      }

      // 3. Download DOCX Blob
      const blob = await docxRes.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = downloadUrl;
      downloadAnchor.download = `toeic_images_sheet_${Date.now()}.docx`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setPipelineStep('success');
      setPipelineProgress(language === 'vi' ? 'Tải file .docx thành công! Hãy chuyển sang bước 2.' : 'File .docx downloaded successfully! Proceed to Step 2.');
      setRawUrlsText('');
    } catch (err: any) {
      console.error(err);
      setPipelineStep('error');
      setPipelineProgress(err.message || 'Error occurred');
      toast.error(err.message);
    }
  };

  // Copy Prompt
  const handleCopyPrompt = () => {
    const promptText = `Bạn là một chuyên gia AI cao cấp chuyên biên soạn đề thi TOEIC Speaking & Writing chuẩn quốc tế.

Tôi đã tải lên một tài liệu Word (.docx) chứa một bảng gồm danh sách các hình ảnh và URL của chúng.
Nhiệm vụ của bạn là phân tích từng hình ảnh trong tài liệu này và trả về duy nhất một mảng JSON (JSON Array) chứa thông tin phân tích của tất cả các ảnh, khớp chính xác URL tương ứng của chúng.

### 🎯 NGUYÊN TẮC PHÂN TÍCH HÌNH ẢNH (BẮT BUỘC CHO TỪNG ẢNH):
1. **Trường "url"**: Điền chính xác đường link ảnh ImgBB tương ứng với bức ảnh đó (lấy từ cột "Image URL" trong tài liệu).
2. **Trường "description"**: Viết mô tả chi tiết bằng Tiếng Anh (khoảng 3 - 6 câu).
   * **Quy tắc Phổ Rộng (Tổng quát đến Chi tiết - Rất quan trọng)**: Trong phòng thi TOEIC Speaking Part 2, thí sinh có thể chọn mô tả Người A hoặc Người B, hoặc mô tả góc trái hay góc phải. Cả hai cách tiếp cận đều đúng. Do đó, mô tả của bạn phải bao quát toàn diện:
     - *Câu 1 (Tổng quát)*: Bối cảnh chung (ví dụ: trong văn phòng, ngoài trời, quán cà phê) và hành động/chủ thể nổi bật nhất.
     - *Câu 2 & 3 (Chi tiết các nhân vật)*: Mô tả hành động, trang phục, hoặc trạng thái của tất cả các chủ thể xuất hiện (ví dụ: người bên trái đang viết, người bên phải đang nghe điện thoại). Tránh việc chỉ mô tả một người và bỏ quên người khác.
     - *Câu 4 & 5 (Hậu cảnh & Vật thể)*: Mô tả các đồ vật xung quanh (laptop, cốc nước, tài liệu...) và bối cảnh phía sau (cửa sổ, cây xanh, bức tường...).
3. **Trường "words"**: Trích xuất chính xác 2 từ khóa hoặc cụm từ tiếng Anh đơn giản (viết thường hoàn toàn) liên quan trực tiếp đến bức ảnh để dùng cho TOEIC Writing Part 1 (Viết câu dựa trên tranh). Ví dụ: \`["laptop", "discuss"]\` hoặc \`["woman", "write"]\`.

### ⚠️ QUY ĐỊNH PHẢN HỒI JSON:
- Phản hồi **CHỈ CHỨA DUY NHẤT** mảng JSON dạng \`[ { ... }, { ... } ]\`.
- Không thêm bất kỳ lời dẫn nhập, lời giải thích hay kết luận nào ngoài mảng JSON.
- Hãy bọc mảng JSON trong định dạng \`\`\`json để tôi có thể dễ dàng sao chép bằng một cú click chuột.

### 📝 MẪU CẤU TRÚC ĐẦU RA (JSON ARRAY):
\`\`\`json
[
  {
    "url": "https://i.ibb.co/xxxxx/image1.webp",
    "description": "The image shows a busy office environment with two colleagues working at a wooden desk. On the left, a man wearing a blue shirt is typing on his laptop, while the woman on the right with glasses is taking notes in a notebook. On the desk, there are coffee mugs, some documents, and a small plant. In the background, other office cubicles and large windows are visible under soft lighting.",
    "words": ["laptop", "write"]
  },
  {
    "url": "https://i.ibb.co/yyyyy/image2.webp",
    "description": "The image shows an outdoor cafe setting on a sunny afternoon. A group of friends are sitting around a table laughing and drinking coffee. A waiter in a black apron is serving a tray of pastries to the table. In the background, other customers are enjoying their time, with green trees lining the street under a clear blue sky.",
    "words": ["friend", "laugh"]
  }
]
\`\`\``;

    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    toast.success(language === 'vi' ? 'Đã copy câu lệnh prompt!' : 'Prompt copied to clipboard!');
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Pipeline Step 3: Confirm Import JSON
  const handleConfirmImport = async () => {
    if (!geminiJsonText.trim()) {
      toast.error(language === 'vi' ? 'Vui lòng dán dữ liệu JSON mô tả từ Gemini.' : 'Please paste Gemini JSON description.');
      return;
    }

    let parsed: any = null;
    try {
      // Clean up markdown block wraps if present
      let cleanText = geminiJsonText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(json)?/, '');
        cleanText = cleanText.replace(/```$/, '');
        cleanText = cleanText.trim();
      }
      parsed = JSON.parse(cleanText);
    } catch (e) {
      toast.error(language === 'vi' ? 'Định dạng JSON không hợp lệ. Vui lòng kiểm tra lại.' : 'Invalid JSON format. Please check the content.');
      return;
    }

    if (!Array.isArray(parsed)) {
      toast.error(language === 'vi' ? 'Dữ liệu JSON phải là một mảng danh sách [{}, {}]' : 'JSON data must be an array [{}, {}]');
      return;
    }

    try {
      if (!supabase) {
        throw new Error(language === 'vi' ? 'Supabase chưa được cấu hình' : 'Supabase is not configured');
      }
      setImportingJson(true);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/admin/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'import_gemini_descriptions', descriptions: parsed })
      });

      if (!response.ok) {
        throw new Error(language === 'vi' ? 'Lỗi máy chủ khi nạp kho ảnh' : 'Server error importing images');
      }

      const result = await response.json();
      toast.success(
        language === 'vi'
          ? `Nạp thành công: ${result.importedCount} ảnh mới. Bỏ qua trùng lặp: ${result.duplicatesSkipped}. Tổng kho: ${result.totalUnused}.`
          : `Imported: ${result.importedCount} new. Skipped: ${result.duplicatesSkipped}. Total unused: ${result.totalUnused}.`
      );
      setUnusedImagesCount(result.totalUnused);
      setGeminiJsonText('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImportingJson(false);
    }
  };

  // Auto-update Missing Images
  const handleAutoUpdateMissing = async () => {
    const keyToUse = localStorage.getItem('admin_api_key') || adminApiKey || '';
    const baseUrlToUse = localStorage.getItem('admin_base_url') || adminBaseUrl || '';

    if (!keyToUse) {
      toast.error(language === 'vi' ? 'Vui lòng cung cấp Gemini API Key tại cấu hình trang Admin.' : 'Please configure Gemini API Key first.');
      return;
    }

    // Check proxy offline if using proxy configuration
    const isWeb = baseUrlToUse.includes('localhost') || baseUrlToUse.includes('127.0.0.1') || baseUrlToUse.includes('8081');
    if (isWeb && proxyStatus === 'offline') {
      toast.error(language === 'vi' 
        ? 'Máy chủ proxy (Web2API) chưa được bật! Vui lòng mở terminal và chạy lệnh: python gemini_web2api.py --cookie-file cookie.txt'
        : 'Proxy server (Web2API) is offline! Please run: python gemini_web2api.py --cookie-file cookie.txt');
      return;
    }

    try {
      if (!supabase) {
        throw new Error(language === 'vi' ? 'Supabase chưa được cấu hình' : 'Supabase is not configured');
      }
      setUpdatingMissing(true);
      const toastId = toast.loading(language === 'vi' ? 'Đang quét kho và cập nhật các đề thiếu ảnh...' : 'Scanning pool and updating missing tests...');

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/admin/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-gemini-api-key': keyToUse,
          'x-gemini-base-url': baseUrlToUse
        },
        body: JSON.stringify({ action: 'auto_fill_missing' })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Autofill failed');
      }

      const result = await response.json();
      toast.dismiss(toastId);

      if (result.updatedCount > 0) {
        toast.success(
          language === 'vi'
            ? `Cập nhật thành công ${result.updatedCount} đề thi: ${result.updatedDetails.join(', ')}`
            : `Successfully updated ${result.updatedCount} tests: ${result.updatedDetails.join(', ')}`
        );
        setUnusedImagesCount(result.remainingUnused);
        fetchTests();
      } else {
        fetchUnusedImagesCount();
        toast.success(language === 'vi' ? 'Không có đề nào cần cập nhật ảnh.' : 'No tests needed image updates.');
      }
    } catch (err: any) {
      toast.error(language === 'vi' ? 'Lỗi: ' + err.message : 'Error: ' + err.message);
    } finally {
      setUpdatingMissing(false);
    }
  };

  // Compute test stats
  const missingTestsCount = tests.filter(t => testStatuses[t.id] === 'missing').length;
  const brokenTestsCount = tests.filter(t => testStatuses[t.id] === 'broken').length;
  
  const totalMissingImagesCount = (() => {
    let count = 0;
    tests.forEach(test => {
      if (test.speaking && Array.isArray(test.speaking)) {
        test.speaking.forEach((part: any) => {
          if (part.part === 2 && Array.isArray(part.questions)) {
            part.questions.forEach((q: any) => {
              if (!q.image || q.image.trim() === '' || q.image.includes('placeholder')) {
                count++;
              }
            });
          }
        });
      }
      if (test.writing && Array.isArray(test.writing)) {
        test.writing.forEach((part: any) => {
          if (part.part === 1 && Array.isArray(part.questions)) {
            part.questions.forEach((q: any) => {
              if (!q.image || q.image.trim() === '' || q.image.includes('placeholder')) {
                count++;
              }
            });
          }
        });
      }
    });
    return count;
  })();

  return (
    <div style={{ padding: '24px 5% 40px 5%', width: '100%', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }} className="fade-in">


      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="card-sharp" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px', background: 'var(--background)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
            {language === 'vi' ? 'TỔNG SỐ ĐỀ THI' : 'TOTAL TESTS'}
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {tests.length}
          </span>
        </div>
        
        <div className="card-sharp" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px', border: totalMissingImagesCount > 0 ? '1px solid #eab308' : '1px solid var(--border)', background: totalMissingImagesCount > 0 ? 'rgba(234, 179, 8, 0.03)' : 'var(--background)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
            {language === 'vi' ? 'ẢNH CÒN THIẾU TRONG ĐỀ' : 'MISSING IMAGES IN TESTS'}
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: totalMissingImagesCount > 0 ? '#eab308' : '#22c55e', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            {totalMissingImagesCount}
            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
              {language === 'vi' ? `(ở ${missingTestsCount} đề)` : `(in ${missingTestsCount} tests)`}
            </span>
          </span>
        </div>

        <div className="card-sharp" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px', background: 'var(--background)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
            {language === 'vi' ? 'ẢNH BỊ LỖI LIÊN KẾT' : 'BROKEN IMAGE LINKS'}
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent)', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            {brokenTestsCount}
            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
              {language === 'vi' ? `(ở ${brokenTestsCount} đề)` : `(in ${brokenTestsCount} tests)`}
            </span>
          </span>
        </div>

        <div className="card-sharp" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          padding: '20px', 
          border: (unusedImagesCount !== null && unusedImagesCount === 0) ? '1px solid #ef4444' : '1px solid var(--border)', 
          background: (unusedImagesCount !== null && unusedImagesCount === 0) ? 'rgba(239, 68, 68, 0.03)' : 'var(--background)' 
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
            {language === 'vi' ? 'ẢNH CÓ SẴN (CHƯA DÙNG)' : 'AVAILABLE UNUSED IMAGES'}
          </span>
          <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: (unusedImagesCount !== null && unusedImagesCount === 0) ? '#ef4444' : '#22c55e' }}>
            {unusedImagesCount === null ? (
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 className="animate-spin" size={14} /> {language === 'vi' ? 'Đang tải...' : 'Loading...'}
              </span>
            ) : (
              unusedImagesCount
            )}
          </span>
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Test List */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card-sharp" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                <Database size={20} />
                {language === 'vi' ? 'Danh sách đề thi sẵn có' : 'Available Tests'}
              </h3>
              
              <button
                className="btn-accent"
                onClick={handleAutoUpdateMissing}
                disabled={updatingMissing || loadingTests}
                style={{ fontSize: '0.8rem', padding: '8px 14px' }}
              >
                {updatingMissing ? (
                  <>
                    <Loader2 className="animate-spin" size={14} style={{ marginRight: '6px' }} />
                    {language === 'vi' ? 'Đang cập nhật...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} style={{ marginRight: '6px' }} />
                    {language === 'vi' ? 'Cập nhật đề thiếu ảnh' : 'Update Missing Images'}
                  </>
                )}
              </button>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: 'var(--background-secondary)', padding: '16px', border: '1px solid var(--border)', borderRadius: '0px' }}>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  {language === 'vi' ? 'Phân loại đề thi' : 'Test Type'}
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="admin-premium-input"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}
                >
                  <option value="all">{language === 'vi' ? 'Tất cả các loại' : 'All Types'}</option>
                  <option value="sw">{language === 'vi' ? 'Full S&W (Nói & Viết)' : 'Full S&W'}</option>
                  <option value="s">{language === 'vi' ? 'Speaking (Nói)' : 'Speaking'}</option>
                  <option value="w">{language === 'vi' ? 'Writing (Viết)' : 'Writing'}</option>
                </select>
              </div>

              <div style={{ flex: 1, minWidth: '140px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  {language === 'vi' ? 'Trạng thái ảnh' : 'Image Status'}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="admin-premium-input"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', fontWeight: 'bold' }}
                >
                  <option value="all">{language === 'vi' ? 'Tất cả trạng thái' : 'All Statuses'}</option>
                  <option value="ok">{language === 'vi' ? 'Đủ ảnh (OK)' : 'Complete (OK)'}</option>
                  <option value="missing">{language === 'vi' ? 'Thiếu ảnh' : 'Missing Images'}</option>
                  <option value="broken">{language === 'vi' ? 'Lỗi ảnh (Broken)' : 'Broken Images'}</option>
                </select>
              </div>
            </div>

            {loadingTests ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', gap: '8px', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin" size={20} />
                <span>{language === 'vi' ? 'Đang tải danh sách đề thi...' : 'Loading tests...'}</span>
              </div>
            ) : (() => {
              const filteredTests = tests.filter((test) => {
                const hasSpeaking = test.speaking && Array.isArray(test.speaking) && test.speaking.length > 0;
                const hasWriting = test.writing && Array.isArray(test.writing) && test.writing.length > 0;
                const type = (hasSpeaking && hasWriting) ? 'sw' : hasSpeaking ? 's' : 'w';

                if (filterType !== 'all' && type !== filterType) {
                  return false;
                }

                const status = testStatuses[test.id] || 'ok';
                if (filterStatus !== 'all' && status !== filterStatus) {
                  return false;
                }

                return true;
              });

              if (filteredTests.length === 0) {
                return (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0' }}>
                    {language === 'vi' ? 'Không tìm thấy đề thi nào phù hợp.' : 'No matching tests found.'}
                  </p>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' }} className="no-scrollbar">
                  {filteredTests.map((test) => {
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
                          padding: '16px',
                          border: borderStyle,
                          background: bgStyle,
                          borderRadius: '0px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{test.title}</h4>
                            {status === 'ok' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 8px', borderRadius: '0px', fontWeight: 'bold' }}>
                                <CheckCircle2 size={10} /> {language === 'vi' ? 'Đủ ảnh' : 'OK'}
                              </span>
                            )}
                            {status === 'missing' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', background: '#eab308', color: '#000', padding: '2px 8px', borderRadius: '0px', fontWeight: 'bold' }}>
                                <ImageOff size={10} /> {language === 'vi' ? 'Thiếu ảnh' : 'Missing Image'}
                              </span>
                            )}
                            {status === 'broken' && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: '0px', fontWeight: 'bold' }}>
                                <AlertTriangle size={10} /> {language === 'vi' ? 'Lỗi ảnh' : 'Broken'}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {test.id}</span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link
                            href={`/test/${test.id}`}
                            className="btn-secondary"
                            style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                            title={language === 'vi' ? 'Làm thử' : 'Try'}
                          >
                            <Play size={14} style={{ color: 'var(--accent)' }} />
                          </Link>
                          <button
                            onClick={() => handleDeleteTest(test.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px' }}
                            title={language === 'vi' ? 'Xóa đề' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </section>

        {/* Right Column: Image Pipeline Tool */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Step 1: Upload & Docx */}
          <div className="card-sharp">
            <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} />
              {language === 'vi' ? 'Bước 1: Tải lên ImgBB & Tạo file Word' : 'Step 1: Upload ImgBB & Create Docx'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
              {language === 'vi' 
                ? 'Dán các link ảnh gốc thu thập được (mỗi dòng một link). Hệ thống sẽ tự động upload lên ImgBB, trộn ngẫu nhiên và đóng gói thành tệp .docx.'
                : 'Paste raw image URLs (one per line). The system will upload to ImgBB, shuffle them, and bundle them into a .docx.'}
            </p>

            <textarea
              value={rawUrlsText}
              onChange={(e) => setRawUrlsText(e.target.value)}
              placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png"
              className="admin-code-input"
              style={{
                width: '100%',
                height: '140px',
                marginBottom: '16px',
                resize: 'vertical'
              }}
            />

            <button
              className="btn-primary"
              onClick={handleUploadAndGenerateDocx}
              disabled={pipelineStep === 'uploading' || pipelineStep === 'generating_docx'}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontWeight: 'bold' }}
            >
              {(pipelineStep === 'uploading' || pipelineStep === 'generating_docx') ? (
                <>
                  <Loader2 className="animate-spin" size={16} style={{ marginRight: '8px' }} />
                  {pipelineProgress}
                </>
              ) : (
                <>
                  <FileText size={16} style={{ marginRight: '8px' }} />
                  {language === 'vi' ? 'Tải lên & Tạo file Word' : 'Upload & Generate Word'}
                </>
              )}
            </button>

            {pipelineStep === 'success' && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontSize: '0.8rem', fontWeight: 'bold' }}>
                <CheckCircle2 size={16} />
                <span>{pipelineProgress}</span>
              </div>
            )}
          </div>

          {/* Step 2: Copy Prompt */}
          <div className="card-sharp">
            <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Copy size={18} />
              {language === 'vi' ? 'Bước 2: Copy Prompt cho Gemini Web' : 'Step 2: Copy Prompt for Gemini Web'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
              {language === 'vi'
                ? 'Sao chép prompt thiết kế sẵn để gửi kèm file Word (.docx) vào Gemini Web nhằm nhận lại định dạng mô tả ảnh chuẩn JSON.'
                : 'Copy the custom prompt to feed along with the Word document (.docx) into Gemini Web to get the correct JSON format.'}
            </p>

            <button
              className="btn-secondary"
              onClick={handleCopyPrompt}
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              {copiedPrompt ? (
                <>
                  <Check size={16} style={{ marginRight: '8px', color: '#22c55e' }} />
                  {language === 'vi' ? 'Đã sao chép!' : 'Copied!'}
                </>
              ) : (
                <>
                  <Copy size={16} style={{ marginRight: '8px' }} />
                  {language === 'vi' ? 'Copy câu lệnh Prompt' : 'Copy Prompt Command'}
                </>
              )}
            </button>
          </div>

          {/* Step 3: Paste JSON Results */}
          <div className="card-sharp">
            <h3 style={{ marginBottom: '12px', fontSize: '1.1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileJson size={18} />
              {language === 'vi' ? 'Bước 3: Nhập kết quả từ Gemini Web' : 'Step 3: Paste Gemini Web JSON'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px' }}>
              {language === 'vi'
                ? 'Dán toàn bộ kết quả mô tả ảnh JSON nhận được từ Gemini Web vào ô bên dưới, sau đó xác nhận nạp vào kho.'
                : 'Paste the JSON results containing descriptions from Gemini Web below, then submit to save them.'}
            </p>

            <textarea
              value={geminiJsonText}
              onChange={(e) => setGeminiJsonText(e.target.value)}
              placeholder="[&#10;  {&#10;    &quot;url&quot;: &quot;...&quot;,&#10;    &quot;description&quot;: &quot;...&quot;&#10;  }&#10;]"
              className="admin-code-input"
              style={{
                width: '100%',
                height: '140px',
                marginBottom: '16px',
                resize: 'vertical'
              }}
            />

            <button
              className="btn-accent"
              onClick={handleConfirmImport}
              disabled={importingJson}
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontWeight: 'bold' }}
            >
              {importingJson ? (
                <>
                  <Loader2 className="animate-spin" size={16} style={{ marginRight: '8px' }} />
                  {language === 'vi' ? 'Đang nạp...' : 'Importing...'}
                </>
              ) : (
                <>
                  <Database size={16} style={{ marginRight: '8px' }} />
                  {language === 'vi' ? 'Xác nhận nạp vào Kho ảnh' : 'Confirm Import to Pool'}
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
