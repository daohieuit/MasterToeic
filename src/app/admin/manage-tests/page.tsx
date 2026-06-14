'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Search,
  Edit2,
  Trash2,
  Save,
  X,
  Plus,
  FileText,
  AlertTriangle,
  ChevronRight,
  Image as ImageIcon,
  BookOpen,
  HelpCircle,
  Eye,
  Settings,
  AlertCircle
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
  description: string;
  speaking: Part[];
  writing: Part[];
}

export default function ManageTestsPage() {
  const router = useRouter();
  const { language, isAdmin, user } = useApp();

  const [tests, setTests] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected test & editing states
  const [selectedTest, setSelectedTest] = useState<TestData | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSpeaking, setEditSpeaking] = useState<Part[]>([]);
  const [editWriting, setEditWriting] = useState<Part[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Active editor navigation section: 'speaking_1', 'writing_1', etc.
  const [activePartKey, setActivePartKey] = useState<string>('speaking_1');

  // Fetch all custom tests
  const fetchTests = useCallback(async () => {
    setLoading(true);
    if (user && supabase) {
      try {
        const { data, error } = await supabase
          .from('custom_tests')
          .select('*')
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
              description: t.description || '',
              speaking: Array.isArray(sp) ? sp : [],
              writing: Array.isArray(wr) ? wr : []
            };
          });
          setTests(mapped);
        }
      } catch (err: any) {
        toast.error(language === 'vi' ? 'Không thể tải đề thi: ' + err.message : 'Failed to load tests: ' + err.message);
      }
    } else {
      // Guest fallback
      const saved = localStorage.getItem('toeic_sw_custom_tests');
      if (saved) {
        try {
          setTests(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
    setLoading(false);
  }, [user, language]);

  useEffect(() => {
    if (isAdmin) {
      fetchTests();
    }
  }, [isAdmin, fetchTests]);

  // Handle beforeunload to warn user of unsaved changes
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

  // Open Edit Panel
  const handleOpenEdit = (test: TestData) => {
    setSelectedTest(test);
    setEditTitle(test.title);
    setEditDescription(test.description);
    
    // Normalize structured data to avoid UI crashes
    const normalizedSpeaking = (test.speaking || []).map(p => ({
      ...p,
      questions: (p.questions || []).map(q => ({
        ...q,
        sampleAnswer: q.sampleAnswer || '',
        text: q.text || '',
        image: q.image || '',
        description: q.description || '',
        words: Array.isArray(q.words) ? q.words : []
      }))
    }));
    
    const normalizedWriting = (test.writing || []).map(p => ({
      ...p,
      questions: (p.questions || []).map(q => ({
        ...q,
        sampleAnswer: q.sampleAnswer || '',
        text: q.text || '',
        image: q.image || '',
        description: q.description || '',
        words: Array.isArray(q.words) ? q.words : []
      }))
    }));

    setEditSpeaking(normalizedSpeaking);
    setEditWriting(normalizedWriting);
    setIsDirty(false);

    // Default to the first available part
    if (normalizedSpeaking.length > 0) {
      setActivePartKey(`speaking_${normalizedSpeaking[0].part}`);
    } else if (normalizedWriting.length > 0) {
      setActivePartKey(`writing_${normalizedWriting[0].part}`);
    } else {
      setActivePartKey('');
    }
  };

  // Close Edit Panel with Unsaved check
  const handleCloseEdit = () => {
    if (isDirty) {
      const confirmClose = window.confirm(
        language === 'vi' 
          ? 'Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn đóng và hủy thay đổi không?' 
          : 'You have unsaved changes. Are you sure you want to close and discard changes?'
      );
      if (!confirmClose) return;
    }
    setSelectedTest(null);
    setIsDirty(false);
  };

  // Helper to update a speaking question field
  const handleUpdateSpeakingQuestion = (partIdx: number, qIdx: number, field: string, value: any) => {
    const updated = [...editSpeaking];
    updated[partIdx].questions[qIdx] = {
      ...updated[partIdx].questions[qIdx],
      [field]: value
    };
    setEditSpeaking(updated);
    setIsDirty(true);
  };

  // Helper to update a writing question field
  const handleUpdateWritingQuestion = (partIdx: number, qIdx: number, field: string, value: any) => {
    const updated = [...editWriting];
    updated[partIdx].questions[qIdx] = {
      ...updated[partIdx].questions[qIdx],
      [field]: value
    };
    setEditWriting(updated);
    setIsDirty(true);
  };

  // Helper to update a part header field (e.g. referenceInfo)
  const handleUpdatePartField = (section: 'speaking' | 'writing', partIdx: number, field: string, value: any) => {
    if (section === 'speaking') {
      const updated = [...editSpeaking];
      updated[partIdx] = {
        ...updated[partIdx],
        [field]: value
      };
      setEditSpeaking(updated);
    } else {
      const updated = [...editWriting];
      updated[partIdx] = {
        ...updated[partIdx],
        [field]: value
      };
      setEditWriting(updated);
    }
    setIsDirty(true);
  };

  // Save changes to Supabase / LocalStorage
  const handleSaveChanges = async () => {
    if (!selectedTest) return;
    setSaving(true);

    if (user && supabase) {
      try {
        const { error } = await supabase
          .from('custom_tests')
          .update({
            title: editTitle,
            description: editDescription,
            speaking_data: editSpeaking,
            writing_data: editWriting
          })
          .eq('id', selectedTest.id);

        if (error) throw error;

        toast.success(language === 'vi' ? 'Đã lưu thay đổi thành công!' : 'Changes saved successfully!');
        setIsDirty(false);
        fetchTests();
      } catch (err: any) {
        toast.error(language === 'vi' ? 'Lỗi khi lưu: ' + err.message : 'Error saving: ' + err.message);
      }
    } else {
      // LocalStorage update
      const saved = localStorage.getItem('toeic_sw_custom_tests');
      if (saved) {
        try {
          const list = JSON.parse(saved);
          const idx = list.findIndex((t: any) => t.id === selectedTest.id);
          if (idx !== -1) {
            list[idx] = {
              id: selectedTest.id,
              title: editTitle,
              description: editDescription,
              speaking: editSpeaking,
              writing: editWriting
            };
            localStorage.setItem('toeic_sw_custom_tests', JSON.stringify(list));
            toast.success(language === 'vi' ? 'Đã lưu thay đổi cục bộ thành công!' : 'Changes saved locally!');
            setIsDirty(false);
            fetchTests();
          }
        } catch (e) {
          toast.error('LocalStorage error');
        }
      }
    }
    setSaving(false);
  };

  // Delete Test
  const handleDeleteTest = async (testId: string, title: string) => {
    const confirmDelete = window.confirm(
      language === 'vi' 
        ? `Bạn có chắc chắn muốn xóa đề thi "${title}"? Thao tác này không thể hoàn tác.`
        : `Are you sure you want to delete the test "${title}"? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    if (user && supabase) {
      try {
        const { error } = await supabase
          .from('custom_tests')
          .delete()
          .eq('id', testId);

        if (error) throw error;

        toast.success(language === 'vi' ? 'Đã xóa đề thi thành công!' : 'Test deleted successfully!');
        fetchTests();
        if (selectedTest?.id === testId) {
          setSelectedTest(null);
        }
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
          if (selectedTest?.id === testId) {
            setSelectedTest(null);
          }
        } catch (e) {
          toast.error('LocalStorage error');
        }
      }
    }
  };

  // Filtered tests
  const filteredTests = tests.filter(test => 
    test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    test.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Parse active section and part number
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

  return (
    <div style={{ padding: '24px 5% 40px 5%', width: '100%', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', position: 'relative' }} className="fade-in">


      {/* Main List Section */}
      <div className="card-sharp" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', background: 'var(--background-secondary)', border: '1px solid var(--border)', borderRadius: '0px' }}>
        
        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', border: '1px solid var(--border)', padding: '8px 16px', background: 'var(--background)', borderRadius: '0px' }}>
          <Search size={18} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder={language === 'vi' ? 'Tìm kiếm theo tên đề thi hoặc mô tả...' : 'Search by test title or description...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.95rem' }}
          />
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
                    borderColor: selectedTest?.id === test.id ? 'var(--accent)' : 'var(--border)',
                    boxShadow: selectedTest?.id === test.id ? '0 0 0 1px var(--accent)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = selectedTest?.id === test.id ? 'var(--accent)' : 'var(--border)';
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '6px', fontWeight: '700' }}>
                      {test.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', minHeight: '36px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {test.description || (language === 'vi' ? '(Chưa có mô tả)' : '(No description)')}
                    </p>
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
                      onClick={() => handleOpenEdit(test)}
                      className="btn-primary" 
                      style={{ 
                        flex: 1, 
                        justifyContent: 'center', 
                        padding: '6px 12px', 
                        fontSize: '0.85rem', 
                        background: 'var(--accent)', 
                        borderColor: 'var(--accent)',
                        color: '#FFF',
                        borderRadius: '0px'
                      }}
                    >
                      <Edit2 size={14} /> {language === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                    </button>
                    <button 
                      onClick={() => handleDeleteTest(test.id, test.title)}
                      className="btn-secondary" 
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
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-out Editor Panel (IDE Split screen style, width 85vw, max-width 950px) */}
      {selectedTest && (
        <div 
          onClick={handleCloseEdit} // Close on backdrop click
          className="drawer-overlay" 
          style={{ background: 'rgba(0, 0, 0, 0.6)', cursor: 'pointer' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} // Prevent closing on panel click
            className="drawer-panel"
            style={{ 
              maxWidth: '950px', 
              width: '85vw', 
              display: 'flex', 
              flexDirection: 'column', 
              cursor: 'default',
              borderLeft: '2px solid var(--border)',
              background: 'var(--background-secondary)',
              position: 'relative',
              borderRadius: '0px'
            }}
          >
            {/* Panel Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                  {language === 'vi' ? 'Bản Chỉnh sửa Đề thi (PC-First IDE)' : 'Exam Editor Dashboard (PC IDE)'}
                </span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {editTitle || selectedTest.title}
                </h2>
              </div>
              <button 
                onClick={handleCloseEdit}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', padding: '6px', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Test Metadata Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {language === 'vi' ? 'Tiêu đề đề thi' : 'Test Title'}
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => { setEditTitle(e.target.value); setIsDirty(true); }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)', fontSize: '0.9rem', borderRadius: '0px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {language === 'vi' ? 'Mô tả đề thi' : 'Test Description'}
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => { setEditDescription(e.target.value); setIsDirty(true); }}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)', fontSize: '0.9rem', borderRadius: '0px' }}
                />
              </div>
            </div>

            {/* IDE-Style Split Body */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: '20px', marginBottom: '16px' }}>
              
              {/* Left Column: Sidebar Navigation (240px) */}
              <div 
                style={{ 
                  width: '240px', 
                  borderRight: '1px solid var(--border)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px', 
                  paddingRight: '16px', 
                  overflowY: 'auto' 
                }}
                className="no-scrollbar"
              >
                {/* Speaking Section Category Header */}
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={12} />
                  <span>Speaking Section</span>
                </div>
                {editSpeaking.map((part) => {
                  const isCurrent = activePartKey === `speaking_${part.part}`;
                  const answeredCount = part.questions.filter(q => q.sampleAnswer && q.sampleAnswer.trim() !== '').length;
                  const totalCount = part.questions?.length || 0;
                  
                  return (
                    <button
                      key={`speaking_${part.part}`}
                      onClick={() => setActivePartKey(`speaking_${part.part}`)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        background: isCurrent ? 'var(--background)' : 'transparent',
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
                        if (!isCurrent) e.currentTarget.style.background = 'var(--background)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>Part {part.part}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          {part.partTitle.length > 20 ? part.partTitle.slice(0, 18) + '...' : part.partTitle}
                        </span>
                      </div>
                      
                      {/* Check if fully answered */}
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

                {/* Writing Section Category Header */}
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '16px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={12} />
                  <span>Writing Section</span>
                </div>
                {editWriting.map((part) => {
                  const isCurrent = activePartKey === `writing_${part.part}`;
                  const answeredCount = part.questions.filter(q => q.sampleAnswer && q.sampleAnswer.trim() !== '').length;
                  const totalCount = part.questions?.length || 0;
                  
                  return (
                    <button
                      key={`writing_${part.part}`}
                      onClick={() => setActivePartKey(`writing_${part.part}`)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        background: isCurrent ? 'var(--background)' : 'transparent',
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
                        if (!isCurrent) e.currentTarget.style.background = 'var(--background)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>Part {part.part}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          {part.partTitle.length > 20 ? part.partTitle.slice(0, 18) + '...' : part.partTitle}
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

              {/* Right Column: Editor Workspace (Focused details) */}
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
                key={activePartKey} // Triggers fade-in animation on part switch
              >
                {activePartData ? (
                  <>
                    {/* Part Headline Banner */}
                    <div style={{ background: 'var(--background)', border: '1px solid var(--border)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase' }}>
                          {activeSection === 'speaking' ? 'Speaking Practice' : 'Writing Practice'} - Part {activePartNum}
                        </span>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
                          {activePartData.partTitle}
                        </h3>
                      </div>
                    </div>

                    {/* Part Table Info for Speaking Part 4 */}
                    {activeSection === 'speaking' && activePartNum === 4 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--background-secondary)', border: '1px solid var(--border)', padding: '16px', borderRadius: '0px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={14} />
                          <span>Reference Info (Table Data / Text Data)</span>
                        </label>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          {language === 'vi' ? 'Dữ liệu tham khảo dạng thô sử dụng cho các câu hỏi 8, 9, 10:' : 'Raw reference data for Questions 8, 9, 10:'}
                        </p>
                        <textarea
                          value={activePartData.referenceInfo || ''}
                          onChange={(e) => handleUpdatePartField('speaking', activePartIdx, 'referenceInfo', e.target.value)}
                          rows={6}
                          style={{ 
                            width: '100%', 
                            padding: '10px 14px', 
                            border: '1px solid var(--border)', 
                            background: 'var(--background)', 
                            color: 'var(--text-primary)', 
                            fontFamily: 'var(--font-mono)', 
                            fontSize: '0.8rem',
                            borderRadius: '0px'
                          }}
                        />
                      </div>
                    )}

                    {/* Questions of this Part */}
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
                        {/* Question title index */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Question {qIdx + 1}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            ID: {q.id}
                          </span>
                        </div>

                        {/* Question/Prompt input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Question Text / Prompt</label>
                          <textarea
                            value={q.text || ''}
                            onChange={(e) => {
                              if (activeSection === 'speaking') {
                                handleUpdateSpeakingQuestion(activePartIdx, qIdx, 'text', e.target.value);
                              } else {
                                handleUpdateWritingQuestion(activePartIdx, qIdx, 'text', e.target.value);
                              }
                            }}
                            rows={2}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-primary)', fontSize: '0.9rem', borderRadius: '0px' }}
                          />
                        </div>

                        {/* Speaking Part 2 Image / Writing Part 1 Image & Words */}
                        {((activeSection === 'speaking' && activePartNum === 2) || (activeSection === 'writing' && activePartNum === 1)) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--background)', padding: '16px', border: '1px solid var(--border)', borderRadius: '0px' }}>
                            
                            {/* Inputs side-by-side on PC */}
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

                            {/* Image Description */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Image Description (for AI grading reference)</label>
                              <textarea
                                value={q.description || ''}
                                onChange={(e) => {
                                  if (activeSection === 'speaking') {
                                    handleUpdateSpeakingQuestion(activePartIdx, qIdx, 'description', e.target.value);
                                  } else {
                                    handleUpdateWritingQuestion(activePartIdx, qIdx, 'description', e.target.value);
                                  }
                                }}
                                rows={2}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--background-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', borderRadius: '0px' }}
                              />
                            </div>

                            {/* Live Image Preview */}
                            {q.image && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Image Preview:</span>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                  <div style={{ width: '140px', height: '90px', position: 'relative', border: '1px solid var(--border)', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
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

                        {/* Sample Answer Textarea */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--success)' }}>Sample Answer</label>
                          <textarea
                            value={q.sampleAnswer || ''}
                            onChange={(e) => {
                              if (activeSection === 'speaking') {
                                handleUpdateSpeakingQuestion(activePartIdx, qIdx, 'sampleAnswer', e.target.value);
                              } else {
                                handleUpdateWritingQuestion(activePartIdx, qIdx, 'sampleAnswer', e.target.value);
                              }
                            }}
                            rows={5}
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
                            placeholder={language === 'vi' ? 'Nhập câu trả lời mẫu/đáp án mẫu cho câu hỏi này...' : 'Enter the sample answer or reference answer...'}
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

            {/* Panel Footer Actions */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleCloseEdit}
                className="btn-secondary"
                style={{ padding: '10px 20px', borderRadius: '0px' }}
              >
                {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
              </button>
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
                <Save size={18} />
                {saving 
                  ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') 
                  : (language === 'vi' ? 'Lưu thay đổi' : 'Save Changes')
                }
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
