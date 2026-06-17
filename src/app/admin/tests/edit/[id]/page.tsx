'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Save,
  FileText,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  Eye,
  AlertCircle,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { getSpeakingPartConfig, getWritingPartConfig } from '@/utils/constants';

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
  situation?: string;
  referenceInfo?: string;
  questions: Question[];
  [key: string]: any;
}

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

const AutoResizeTextarea = ({ value, style, ...props }: AutoResizeTextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={props.onChange}
      onInput={adjustHeight}
      style={{
        ...style,
        resize: 'none',
        overflowY: 'hidden'
      }}
      {...props}
    />
  );
};

function cleanSpeakingDataForDB(data: Part[]) {
  if (!Array.isArray(data)) return data;
  return data.map((part) => {
    const cleanedPart: any = { part: part.part };
    
    // Add situation for Part 3
    if (part.part === 3 && part.situation) {
      cleanedPart.situation = part.situation;
    }
    // Add referenceInfo for Part 4
    if (part.part === 4 && part.referenceInfo) {
      cleanedPart.referenceInfo = part.referenceInfo;
    }
    
    if (Array.isArray(part.questions)) {
      cleanedPart.questions = part.questions.map((q: any) => {
        const cleanedQ: any = {};
        
        if (part.part === 2) {
          if (q.image !== undefined && q.image !== null) cleanedQ.image = q.image;
          if (q.description !== undefined && q.description !== null) cleanedQ.description = q.description;
        } else {
          if (q.text) cleanedQ.text = q.text;
        }
        
        if (q.sampleAnswer) cleanedQ.sampleAnswer = q.sampleAnswer;
        
        return cleanedQ;
      });
    }
    
    return cleanedPart;
  });
}

function cleanWritingDataForDB(data: Part[]) {
  if (!Array.isArray(data)) return data;
  return data.map((part) => {
    const cleanedPart: any = { part: part.part };
    
    if (Array.isArray(part.questions)) {
      cleanedPart.questions = part.questions.map((q: any) => {
        const cleanedQ: any = {};
        
        if (part.part === 1) {
          if (q.image !== undefined && q.image !== null) cleanedQ.image = q.image;
          if (q.description !== undefined && q.description !== null) cleanedQ.description = q.description;
          if (Array.isArray(q.words) && q.words.length > 0) cleanedQ.words = q.words;
        } else if (part.part === 2) {
          if (q.text) cleanedQ.text = q.text;
          if (q.direction) cleanedQ.direction = q.direction;
        } else {
          if (q.text) cleanedQ.text = q.text;
        }
        
        if (q.sampleAnswer) cleanedQ.sampleAnswer = q.sampleAnswer;
        
        return cleanedQ;
      });
    }
    
    return cleanedPart;
  });
}

function isQuestionComplete(q: any, partNum: number, section: 'speaking' | 'writing', partData: any): boolean {
  if (!q.sampleAnswer || q.sampleAnswer.trim() === '') return false;

  if (section === 'speaking') {
    switch (partNum) {
      case 1:
      case 5:
        return !!(q.text && q.text.trim() !== '');
      case 2:
        return !!(q.image && q.image.trim() !== '' && q.description && q.description.trim() !== '');
      case 3:
        return !!(
          q.text && q.text.trim() !== '' && 
          partData.situation && partData.situation.trim() !== ''
        );
      case 4:
        return !!(
          q.text && q.text.trim() !== '' && 
          partData.referenceInfo && partData.referenceInfo.trim() !== ''
        );
      default:
        return false;
    }
  } else {
    switch (partNum) {
      case 1:
        return !!(
          q.image && q.image.trim() !== '' && 
          q.description && q.description.trim() !== '' && 
          Array.isArray(q.words) && q.words.length > 0
        );
      case 2:
        return !!(
          q.text && q.text.trim() !== '' && 
          q.direction && q.direction.trim() !== ''
        );
      case 3:
        return !!(q.text && q.text.trim() !== '');
      default:
        return false;
    }
  }
}

export default function EditTestPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.id as string;
  const { language, isAdmin, user } = useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Test editing states
  const [editTitle, setEditTitle] = useState('');
  const [editSpeaking, setEditSpeaking] = useState<Part[]>([]);
  const [editWriting, setEditWriting] = useState<Part[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Active section key for navigation: e.g., 'speaking_1', 'writing_1'
  const [activePartKey, setActivePartKey] = useState<string>('speaking_1');

  // JSON Import modal/panel state
  const [showImportArea, setShowImportArea] = useState(false);
  const [jsonPasteText, setJsonPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch target test
  const fetchTest = useCallback(async () => {
    setLoading(true);
    if (user && supabase) {
      try {
        const { data, error } = await supabase
          .from('custom_tests')
          .select('id, title, speaking_data, writing_data')
          .eq('id', testId)
          .single();

        if (error) throw error;

        if (data) {
          setEditTitle(data.title || '');
          let sp = data.speaking_data;
          let wr = data.writing_data;
          if (typeof sp === 'string') {
            try { sp = JSON.parse(sp); } catch (e) { sp = []; }
          }
          if (typeof wr === 'string') {
            try { wr = JSON.parse(wr); } catch (e) { wr = []; }
          }
          
          const normalizedSpeaking = (Array.isArray(sp) ? sp : []).map((p: any) => ({
            ...p,
            partTitle: p.partTitle || getSpeakingPartConfig(p.part)?.partTitle || `Part ${p.part}`,
            questions: (p.questions || []).map((q: any) => ({
              ...q,
              sampleAnswer: q.sampleAnswer || '',
              text: q.text || '',
              image: q.image || '',
              description: q.description || '',
              words: Array.isArray(q.words) ? q.words : []
            }))
          }));

          const normalizedWriting = (Array.isArray(wr) ? wr : []).map((p: any) => ({
            ...p,
            partTitle: p.partTitle || getWritingPartConfig(p.part)?.partTitle || `Part ${p.part}`,
            questions: (p.questions || []).map((q: any) => ({
              ...q,
              sampleAnswer: q.sampleAnswer || '',
              text: q.text || '',
              image: q.image || '',
              description: q.description || '',
              words: Array.isArray(q.words) ? q.words : [],
              direction: q.direction || ''
            }))
          }));

          setEditSpeaking(normalizedSpeaking);
          setEditWriting(normalizedWriting);
          
          if (normalizedSpeaking.length > 0) {
            setActivePartKey(`speaking_${normalizedSpeaking[0].part}`);
          } else if (normalizedWriting.length > 0) {
            setActivePartKey(`writing_${normalizedWriting[0].part}`);
          }
        }
      } catch (err: any) {
        toast.error(language === 'vi' ? 'Lỗi tải đề thi: ' + err.message : 'Error loading test: ' + err.message);
      }
    } else {
      // LocalStorage load fallback
      const saved = localStorage.getItem('toeic_sw_custom_tests');
      if (saved) {
        try {
          const list = JSON.parse(saved);
          const found = list.find((t: any) => t.id === testId);
          if (found) {
            setEditTitle(found.title || '');
            const normalizedSpeaking = (found.speaking || []).map((p: any) => ({
              ...p,
              partTitle: p.partTitle || getSpeakingPartConfig(p.part)?.partTitle || `Part ${p.part}`,
              questions: (p.questions || []).map((q: any) => ({
                ...q,
                sampleAnswer: q.sampleAnswer || '',
                text: q.text || '',
                image: q.image || '',
                description: q.description || '',
                words: Array.isArray(q.words) ? q.words : []
              }))
            }));
            const normalizedWriting = (found.writing || []).map((p: any) => ({
              ...p,
              partTitle: p.partTitle || getWritingPartConfig(p.part)?.partTitle || `Part ${p.part}`,
              questions: (p.questions || []).map((q: any) => ({
                ...q,
                sampleAnswer: q.sampleAnswer || '',
                text: q.text || '',
                image: q.image || '',
                description: q.description || '',
                words: Array.isArray(q.words) ? q.words : [],
                direction: q.direction || ''
              }))
            }));
            setEditSpeaking(normalizedSpeaking);
            setEditWriting(normalizedWriting);
            if (normalizedSpeaking.length > 0) {
              setActivePartKey(`speaking_${normalizedSpeaking[0].part}`);
            } else if (normalizedWriting.length > 0) {
              setActivePartKey(`writing_${normalizedWriting[0].part}`);
            }
          } else {
            toast.error(language === 'vi' ? 'Không tìm thấy đề thi cục bộ.' : 'Local test not found.');
          }
        } catch (e) {
          console.error('LocalStorage parse error', e);
        }
      }
    }
    setLoading(false);
    setIsDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: user?.id avoids re-render loops on object reference changes
  }, [testId, user?.id, language]);

  useEffect(() => {
    if (isAdmin) {
      fetchTest();
    }
  }, [isAdmin, fetchTest]);

  // Alert on unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Update question fields
  const handleUpdateSpeakingQuestion = (partIdx: number, qIdx: number, field: string, value: any) => {
    const updated = [...editSpeaking];
    updated[partIdx].questions[qIdx] = {
      ...updated[partIdx].questions[qIdx],
      [field]: value
    };
    setEditSpeaking(updated);
    setIsDirty(true);
  };

  const handleUpdateWritingQuestion = (partIdx: number, qIdx: number, field: string, value: any) => {
    const updated = [...editWriting];
    updated[partIdx].questions[qIdx] = {
      ...updated[partIdx].questions[qIdx],
      [field]: value
    };
    setEditWriting(updated);
    setIsDirty(true);
  };

  const handleUpdatePartField = (section: 'speaking' | 'writing', partIdx: number, field: string, value: any) => {
    if (section === 'speaking') {
      const updated = [...editSpeaking];
      updated[partIdx] = { ...updated[partIdx], [field]: value };
      setEditSpeaking(updated);
    } else {
      const updated = [...editWriting];
      updated[partIdx] = { ...updated[partIdx], [field]: value };
      setEditWriting(updated);
    }
    setIsDirty(true);
  };

  // Save changes to Supabase / LocalStorage
  const handleSaveChanges = async () => {
    if (!editTitle.trim()) {
      toast.error(language === 'vi' ? 'Tiêu đề đề thi không được để trống!' : 'Test title cannot be empty!');
      return;
    }
    setSaving(true);

    const cleanedSpeaking = cleanSpeakingDataForDB(editSpeaking);
    const cleanedWriting = cleanWritingDataForDB(editWriting);

    if (user && supabase) {
      try {
        const { error } = await supabase
          .from('custom_tests')
          .update({
            title: editTitle,
            speaking_data: cleanedSpeaking,
            writing_data: cleanedWriting
          })
          .eq('id', testId);

        if (error) throw error;

        toast.success(language === 'vi' ? 'Đã lưu thay đổi thành công!' : 'Changes saved successfully!');
        setIsDirty(false);
      } catch (err: any) {
        toast.error(language === 'vi' ? 'Lỗi khi lưu: ' + err.message : 'Error saving: ' + err.message);
      }
    } else {
      // LocalStorage update
      const saved = localStorage.getItem('toeic_sw_custom_tests');
      if (saved) {
        try {
          const list = JSON.parse(saved);
          const idx = list.findIndex((t: any) => t.id === testId);
          if (idx !== -1) {
            list[idx] = {
              id: testId,
              title: editTitle,
              speaking: cleanedSpeaking,
              writing: cleanedWriting
            };
            localStorage.setItem('toeic_sw_custom_tests', JSON.stringify(list));
            toast.success(language === 'vi' ? 'Đã lưu cục bộ thành công!' : 'Changes saved locally!');
            setIsDirty(false);
          }
        } catch (e) {
          toast.error('LocalStorage error');
        }
      }
    }
    setSaving(false);
  };

  // Active section mapping helpers
  const getActivePartDetails = () => {
    if (!activePartKey) return { section: null, partNum: null, partIdx: -1, partData: null };
    const [section, numStr] = activePartKey.split('_');
    const partNum = parseInt(numStr, 10);
    
    if (section === 'speaking') {
      const partIdx = editSpeaking.findIndex(p => p.part === partNum);
      return { section, partNum, partIdx, partData: partIdx !== -1 ? editSpeaking[partIdx] : null };
    } else {
      const partIdx = editWriting.findIndex(p => p.part === partNum);
      return { section, partNum, partIdx, partData: partIdx !== -1 ? editWriting[partIdx] : null };
    }
  };

  const { section: activeSection, partNum: activePartNum, partIdx: activePartIdx, partData: activePartData } = getActivePartDetails();

  // Export JSON functionality
  const handleExportJSON = () => {
    const exportData = {
      id: testId,
      title: editTitle,
      speaking: cleanSpeakingDataForDB(editSpeaking),
      writing: cleanWritingDataForDB(editWriting)
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `toeic_test_${testId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(language === 'vi' ? 'Đã xuất file JSON thành công!' : 'Successfully exported JSON file!');
  };

  const handleCopyJSONToClipboard = () => {
    const exportData = {
      id: testId,
      title: editTitle,
      speaking: cleanSpeakingDataForDB(editSpeaking),
      writing: cleanWritingDataForDB(editWriting)
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast.success(language === 'vi' ? 'Đã copy nội dung JSON đề thi!' : 'Copied test JSON to clipboard!');
  };

  // Import JSON functionality
  const applyImportedData = (rawData: any) => {
    try {
      if (!rawData.title) {
        throw new Error(language === 'vi' ? 'Không tìm thấy trường tiêu đề ("title") trong JSON.' : 'Field "title" not found in JSON.');
      }
      
      const sp = rawData.speaking || rawData.speaking_data || [];
      const wr = rawData.writing || rawData.writing_data || [];
      
      if (!Array.isArray(sp) || !Array.isArray(wr)) {
        throw new Error(language === 'vi' ? 'Speaking hoặc Writing phải là mảng dữ liệu.' : 'Speaking or Writing must be array format.');
      }

      // Validate structure basic check
      const normalizedSpeaking = sp.map((p: any) => ({
        part: p.part || 1,
        partTitle: p.partTitle || getSpeakingPartConfig(p.part)?.partTitle || `Part ${p.part}`,
        referenceInfo: p.referenceInfo || '',
        situation: p.situation || '',
        questions: (p.questions || []).map((q: any) => ({
          id: q.id || '',
          type: q.type || '',
          text: q.text || '',
          image: q.image || '',
          description: q.description || '',
          words: Array.isArray(q.words) ? q.words : [],
          sampleAnswer: q.sampleAnswer || ''
        }))
      }));

      const normalizedWriting = wr.map((p: any) => ({
        part: p.part || 1,
        partTitle: p.partTitle || getWritingPartConfig(p.part)?.partTitle || `Part ${p.part}`,
        questions: (p.questions || []).map((q: any) => ({
          id: q.id || '',
          type: q.type || '',
          text: q.text || '',
          image: q.image || '',
          description: q.description || '',
          words: Array.isArray(q.words) ? q.words : [],
          direction: q.direction || '',
          sampleAnswer: q.sampleAnswer || ''
        }))
      }));

      setEditTitle(rawData.title);
      setEditSpeaking(normalizedSpeaking);
      setEditWriting(normalizedWriting);
      setIsDirty(true);

      // Default back to first part
      if (normalizedSpeaking.length > 0) {
        setActivePartKey(`speaking_${normalizedSpeaking[0].part}`);
      } else if (normalizedWriting.length > 0) {
        setActivePartKey(`writing_${normalizedWriting[0].part}`);
      }

      toast.success(language === 'vi' ? 'Đã tải dữ liệu JSON thành công vào trình chỉnh sửa. Hãy nhớ ấn nút LƯU để cập nhật vào database!' : 'JSON data loaded into editor. Remember to click SAVE to update the database!');
      setShowImportArea(false);
      setJsonPasteText('');
    } catch (err: any) {
      toast.error((language === 'vi' ? 'Lỗi xử lý dữ liệu JSON: ' : 'Error processing JSON data: ') + err.message);
    }
  };

  const handleImportTextSubmit = () => {
    try {
      const parsed = JSON.parse(jsonPasteText.trim());
      applyImportedData(parsed);
    } catch (e) {
      toast.error(language === 'vi' ? 'Định dạng JSON không hợp lệ!' : 'Invalid JSON format!');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        applyImportedData(parsed);
      } catch (err) {
        toast.error(language === 'vi' ? 'Đọc file JSON thất bại!' : 'Failed to parse JSON file!');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  // Prevent accessing if not admin
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--background)' }}>
        <p style={{ color: 'var(--accent)' }}>Access Denied</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 5% 40px 5%', width: '100%', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }} className="fade-in">
      
      {/* Header controls section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={() => {
              if (isDirty) {
                const conf = window.confirm(
                  language === 'vi' 
                    ? 'Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn quay lại và hủy thay đổi không?'
                    : 'You have unsaved changes. Are you sure you want to go back and discard changes?'
                );
                if (!conf) return;
              }
              router.push('/admin/manage-tests');
            }} 
            className="btn-secondary" 
            style={{ padding: '8px 12px', borderRadius: '0px' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>
              {language === 'vi' ? 'QUẢN TRỊ VIÊN > CHỈNH SỬA ĐỀ THI' : 'ADMINISTRATOR > TEST EDITOR'}
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {editTitle || 'Loading...'}
            </h2>
          </div>
        </div>

        {/* Global Toolbar */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Export button group */}
          <button 
            onClick={handleExportJSON}
            className="btn-secondary"
            title="Download JSON File"
            style={{ borderRadius: '0px', gap: '6px' }}
          >
            <Download size={14} />
            <span>{language === 'vi' ? 'Tải JSON' : 'Download JSON'}</span>
          </button>

          <button 
            onClick={handleCopyJSONToClipboard}
            className="btn-secondary"
            title="Copy JSON to Clipboard"
            style={{ borderRadius: '0px', gap: '6px' }}
          >
            <Copy size={14} />
            <span>{language === 'vi' ? 'Copy JSON' : 'Copy JSON'}</span>
          </button>

          {/* Import JSON toggler */}
          <button 
            onClick={() => setShowImportArea(!showImportArea)}
            className="btn-secondary"
            title="Import/Overwrite JSON"
            style={{ borderRadius: '0px', gap: '6px', borderColor: showImportArea ? 'var(--accent)' : 'var(--border)' }}
          >
            <Upload size={14} />
            <span>{language === 'vi' ? 'Nhập JSON' : 'Import JSON'}</span>
          </button>

          {/* Save Button */}
          <button 
            onClick={handleSaveChanges}
            disabled={saving || !isDirty}
            className="btn-accent"
            style={{ 
              padding: '10px 24px', 
              opacity: isDirty ? 1 : 0.6,
              cursor: isDirty ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '0px'
            }}
          >
            <Save size={16} />
            {saving 
              ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') 
              : (language === 'vi' ? 'Lưu thay đổi' : 'Save Changes')
            }
          </button>
        </div>
      </div>

      {/* Import panel overlay/drawer (Inline styled for modern IDE feel) */}
      {showImportArea && (
        <div className="card-sharp" style={{ marginBottom: '24px', background: 'var(--background-secondary)', border: '1px solid var(--accent)', padding: '20px', borderRadius: '0px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={16} />
              {language === 'vi' ? 'Nhập / Ghi đè toàn bộ đề thi bằng JSON' : 'Import / Overwrite entire test from JSON'}
            </h3>
            <button 
              className="btn-secondary" 
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '0px', gap: '6px' }}
            >
              <Upload size={12} />
              <span>{language === 'vi' ? 'Chọn file JSON (.json)' : 'Choose JSON File'}</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".json" 
              style={{ display: 'none' }} 
            />
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {language === 'vi'
              ? 'Dán nội dung JSON chứa cấu trúc đề thi vào khung bên dưới để nạp nhanh nội dung vào trình chỉnh sửa. Sau khi nạp, hãy nhấn nút "Lưu thay đổi" màu cam ở góc trên bên phải để cập nhật dữ liệu vào cơ sở dữ liệu.'
              : 'Paste test JSON data below. After loading, you must click the orange "Save Changes" button on the top right to commit the changes to the database.'}
          </p>

          <textarea
            value={jsonPasteText}
            onChange={(e) => setJsonPasteText(e.target.value)}
            rows={5}
            placeholder='{ "title": "TOEIC Test", "speaking": [...], "writing": [...] }'
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontFamily: 'var(--font-mono), monospace', 
              fontSize: '0.8rem', 
              background: 'var(--background)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border)',
              borderRadius: '0px'
            }}
          />

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => { setShowImportArea(false); setJsonPasteText(''); }} 
              className="btn-secondary"
              style={{ padding: '8px 16px', borderRadius: '0px' }}
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button 
              onClick={handleImportTextSubmit} 
              className="btn-accent"
              disabled={!jsonPasteText.trim()}
              style={{ padding: '8px 20px', borderRadius: '0px', opacity: jsonPasteText.trim() ? 1 : 0.6 }}
            >
              {language === 'vi' ? 'Xác nhận Nạp' : 'Load JSON'}
            </button>
          </div>
        </div>
      )}

      {/* Main editor split view workspace */}
      {loading ? (
        <div style={{ display: 'flex', flex: 1, height: '400px', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
            <RefreshCw className="spin" size={20} />
            <span>{language === 'vi' ? 'Đang tải dữ liệu đề thi...' : 'Loading test data...'}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, gap: '24px', minHeight: 0 }} className="dashboard-grid">
          
          {/* Left Navigation: Parts Lists */}
          <div 
            style={{ 
              width: '260px', 
              borderRight: '1px solid var(--border)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px', 
              paddingRight: '20px', 
              overflowY: 'auto'
            }}
            className="no-scrollbar"
          >
            {/* Title field on the side */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                {language === 'vi' ? 'TIÊU ĐỀ ĐỀ THI' : 'TEST TITLE'}
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); setIsDirty(true); }}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', borderRadius: '0px', fontWeight: 'bold' }}
              />
            </div>

            {/* Speaking Section */}
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={12} />
              <span>Speaking Section</span>
            </div>
            
            {editSpeaking.map((part, partIdx) => {
              const isCurrent = activePartKey === `speaking_${part.part}`;
              const answeredCount = part.questions.filter(q => isQuestionComplete(q, part.part, 'speaking', part)).length;
              const totalCount = part.questions?.length || 0;
              
              return (
                <button
                  key={`speaking_${part.part}`}
                  onClick={() => setActivePartKey(`speaking_${part.part}`)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: isCurrent ? 'var(--background-secondary)' : 'transparent',
                    border: '1px solid',
                    borderColor: isCurrent ? 'var(--accent)' : 'transparent',
                    color: isCurrent ? 'var(--accent)' : 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: isCurrent ? '700' : '500',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: '0px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.background = 'var(--background-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>Part {part.part}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                      {part.partTitle.length > 22 ? part.partTitle.slice(0, 20) + '...' : part.partTitle}
                    </span>
                  </div>
                  
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '1px 5px', 
                    background: answeredCount === totalCount ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)', 
                    color: answeredCount === totalCount ? '#22c55e' : '#eab308',
                    fontWeight: 'bold'
                  }}>
                    {answeredCount}/{totalCount}
                  </span>
                </button>
              );
            })}

            {/* Writing Section */}
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '16px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={12} />
              <span>Writing Section</span>
            </div>

            {editWriting.map((part, partIdx) => {
              const isCurrent = activePartKey === `writing_${part.part}`;
              const answeredCount = part.questions.filter(q => isQuestionComplete(q, part.part, 'writing', part)).length;
              const totalCount = part.questions?.length || 0;
              
              return (
                <button
                  key={`writing_${part.part}`}
                  onClick={() => setActivePartKey(`writing_${part.part}`)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: isCurrent ? 'var(--background-secondary)' : 'transparent',
                    border: '1px solid',
                    borderColor: isCurrent ? 'var(--accent)' : 'transparent',
                    color: isCurrent ? 'var(--accent)' : 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: isCurrent ? '700' : '500',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: '0px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) e.currentTarget.style.background = 'var(--background-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>Part {part.part}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                      {part.partTitle.length > 22 ? part.partTitle.slice(0, 20) + '...' : part.partTitle}
                    </span>
                  </div>
                  
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '1px 5px', 
                    background: answeredCount === totalCount ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)', 
                    color: answeredCount === totalCount ? '#22c55e' : '#eab308',
                    fontWeight: 'bold'
                  }}>
                    {answeredCount}/{totalCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right workspace: active part questions form */}
          <div 
            style={{ 
              flex: 1, 
              overflowY: 'auto', 
              paddingRight: '6px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px'
            }}
            className="fade-in"
            key={activePartKey}
          >
            {activePartData ? (
              <>
                {/* Part Header Banner */}
                <div style={{ background: 'var(--background-secondary)', border: '1px solid var(--border)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase' }}>
                      {activeSection === 'speaking' ? 'Speaking Section' : 'Writing Section'} - Part {activePartNum}
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
                      {activePartData.partTitle}
                    </h3>
                  </div>
                </div>

                {/* Part situation (For speaking Part 3) */}
                {activeSection === 'speaking' && activePartNum === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--background-secondary)', border: '1px solid var(--border)', padding: '16px', borderRadius: '0px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} />
                      <span>Situation / Context</span>
                    </label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {language === 'vi' ? 'Tình huống / Bối cảnh trò chuyện cho các câu hỏi 5, 6, 7:' : 'Conversation context / situation for Questions 5, 6, 7:'}
                    </p>
                    <AutoResizeTextarea
                      value={activePartData.situation || ''}
                      onChange={(e) => handleUpdatePartField('speaking', activePartIdx, 'situation', e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        border: '1px solid var(--border)', 
                        background: 'var(--background)', 
                        color: 'var(--text-primary)', 
                        fontSize: '0.9rem',
                        borderRadius: '0px',
                        lineHeight: '1.6'
                      }}
                    />
                  </div>
                )}

                {/* Part reference info (For speaking Part 4) */}
                {activeSection === 'speaking' && activePartNum === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--background-secondary)', border: '1px solid var(--border)', padding: '16px', borderRadius: '0px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} />
                      <span>Reference Info (Table Data / Text Data)</span>
                    </label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {language === 'vi' ? 'Dữ liệu văn bản / lịch trình tham khảo cho các câu hỏi 8, 9, 10:' : 'Raw reference agenda table for Questions 8, 9, 10:'}
                    </p>
                    <AutoResizeTextarea
                      value={activePartData.referenceInfo || ''}
                      onChange={(e) => handleUpdatePartField('speaking', activePartIdx, 'referenceInfo', e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        border: '1px solid var(--border)', 
                        background: 'var(--background)', 
                        color: 'var(--text-primary)', 
                        fontFamily: 'var(--font-mono), monospace', 
                        fontSize: '0.8rem',
                        borderRadius: '0px',
                        lineHeight: '1.6'
                      }}
                    />
                  </div>
                )}

                {/* Render Questions List */}
                {(activePartData.questions || []).map((q, qIdx) => (
                  <div 
                    key={q.id || qIdx} 
                    style={{ 
                      padding: '20px', 
                      background: 'var(--background-secondary)', 
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      borderRadius: '0px'
                    }}
                  >
                    {/* Header line for each Question */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        Question {qIdx + 1}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        ID: {q.id}
                      </span>
                    </div>

                    {/* Direction input for Writing Part 2 */}
                    {activeSection === 'writing' && activePartNum === 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent)' }}>Direction / Instruction</label>
                        <AutoResizeTextarea
                          value={q.direction || ''}
                          onChange={(e) => handleUpdateWritingQuestion(activePartIdx, qIdx, 'direction', e.target.value)}
                          placeholder="e.g. Directions: Respond to the e-mail. In your e-mail, make at least TWO suggestions..."
                          style={{ 
                            width: '100%', 
                            padding: '10px 12px', 
                            border: '1px solid var(--border)', 
                            background: 'var(--background)', 
                            color: 'var(--text-primary)', 
                            fontSize: '0.9rem', 
                            borderRadius: '0px',
                            lineHeight: '1.6'
                          }}
                        />
                      </div>
                    )}

                    {/* Question text textarea */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Question Text / Prompt</label>
                      <AutoResizeTextarea
                        value={q.text || ''}
                        onChange={(e) => {
                          if (activeSection === 'speaking') {
                            handleUpdateSpeakingQuestion(activePartIdx, qIdx, 'text', e.target.value);
                          } else {
                            handleUpdateWritingQuestion(activePartIdx, qIdx, 'text', e.target.value);
                          }
                        }}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)', fontSize: '0.9rem', borderRadius: '0px', lineHeight: '1.6' }}
                      />
                    </div>

                    {/* Image inputs for Speaking Q3-4 / Writing Q1-5 */}
                    {((activeSection === 'speaking' && activePartNum === 2) || (activeSection === 'writing' && activePartNum === 1)) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--background)', padding: '16px', border: '1px solid var(--border)', borderRadius: '0px' }}>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: activeSection === 'writing' ? '1fr 1fr' : '1fr', gap: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Image URL</label>
                            <input
                              type="text"
                              value={q.image || ''}
                              onChange={(e) => {
                                if (activeSection === 'speaking') {
                                  handleUpdateSpeakingQuestion(activePartIdx, qIdx, 'image', e.target.value);
                                } else {
                                  handleUpdateWritingQuestion(activePartIdx, qIdx, 'image', e.target.value);
                                }
                              }}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', borderRadius: '0px' }}
                            />
                          </div>

                          {activeSection === 'writing' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Required Words (comma separated)</label>
                              <input
                                type="text"
                                value={q.words ? q.words.join(', ') : ''}
                                onChange={(e) => {
                                  const wordsArr = e.target.value.split(',').map(w => w.trim()).filter(w => w !== '');
                                  handleUpdateWritingQuestion(activePartIdx, qIdx, 'words', wordsArr);
                                }}
                                placeholder="e.g. key, door"
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', borderRadius: '0px' }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Image Description (For AI Reference) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Image Description (for AI grading reference)</label>
                          <AutoResizeTextarea
                            value={q.description || ''}
                            onChange={(e) => {
                              if (activeSection === 'speaking') {
                                handleUpdateSpeakingQuestion(activePartIdx, qIdx, 'description', e.target.value);
                              } else {
                                handleUpdateWritingQuestion(activePartIdx, qIdx, 'description', e.target.value);
                              }
                            }}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', borderRadius: '0px', lineHeight: '1.6' }}
                          />
                        </div>

                        {/* Image Preview Box */}
                        {q.image && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Image Preview:</span>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                              <div style={{ width: '140px', height: '90px', position: 'relative', border: '1px solid var(--border)', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <img src={q.image} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center', minWidth: 0 }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {q.image}
                                </span>
                                <a href={q.image} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', width: 'fit-content', borderRadius: '0px' }}>
                                  <Eye size={12} /> View Large Image
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sample answer textarea */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--success)' }}>Sample Answer</label>
                      <AutoResizeTextarea
                        value={q.sampleAnswer || ''}
                        onChange={(e) => {
                          if (activeSection === 'speaking') {
                            handleUpdateSpeakingQuestion(activePartIdx, qIdx, 'sampleAnswer', e.target.value);
                          } else {
                            handleUpdateWritingQuestion(activePartIdx, qIdx, 'sampleAnswer', e.target.value);
                          }
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '10px 12px', 
                          border: '1px solid var(--success)', 
                          background: 'var(--background)', 
                          color: 'var(--text-primary)', 
                          fontSize: '0.9rem',
                          borderRadius: '0px',
                          lineHeight: '1.6'
                        }}
                        placeholder={language === 'vi' ? 'Nhập câu trả lời mẫu cho câu hỏi này...' : 'Enter sample answer or reference answer...'}
                      />
                    </div>

                  </div>
                ))}
              </>
            ) : (
              <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center', border: '1px dashed var(--border)', height: '200px' }}>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {language === 'vi' ? 'Không có phần thi nào được chọn.' : 'No section selected.'}
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
