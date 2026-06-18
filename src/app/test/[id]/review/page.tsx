'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/utils/supabase';
import toast from 'react-hot-toast';
import ReviewConsole from '@/components/ReviewConsole';
import { Loader } from 'lucide-react';
import Link from 'next/link';

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export default function ReviewPage({ params }: ReviewPageProps) {
  const resolvedParams = use(params);
  const testId = resolvedParams.id;
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const router = useRouter();
  const { language, user } = useApp();

  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState<any>(null);

  useEffect(() => {
    if (!attemptId) {
      toast.error(language === 'vi' ? 'Không tìm thấy ID bài làm!' : 'Attempt ID not found!');
      router.push('/');
      return;
    }

    const loadAttempt = async () => {
      setLoading(true);
      
      // 1. Try DB first
      if (user && supabase) {
        try {
          const { data, error } = await supabase
            .from('practice_history')
            .select('*')
            .eq('id', attemptId)
            .single();
          
          if (!error && data) {
            setReviewData({
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
            });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to load DB attempt:', e);
        }
      }

      // 2. Guest Mode: Load local
      const savedHistory = localStorage.getItem('toeic_sw_history');
      if (savedHistory) {
        try {
          const list = JSON.parse(savedHistory);
          const pastAttempt = list.find((h: any) => h.id === attemptId);
          if (pastAttempt) {
            setReviewData(pastAttempt);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }

      toast.error(language === 'vi' ? 'Không tìm thấy kết quả làm bài!' : 'Practice attempt not found!');
      router.push('/');
    };

    loadAttempt();
  }, [attemptId, user, language, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', gap: '16px' }}>
        <Loader className="pulse-border animate-spin" size={32} style={{ color: 'var(--accent)' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {language === 'vi' ? 'Đang tải kết quả bài làm...' : 'Loading practice attempt...'}
        </span>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', gap: '16px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
          {language === 'vi' ? 'Không tìm thấy kết quả!' : 'Attempt not found!'}
        </p>
        <Link href="/" className="btn-secondary" style={{ textDecoration: 'none' }}>
          {language === 'vi' ? 'Quay lại' : 'Go Back'}
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 5%', width: '100%', minHeight: '100vh', background: 'var(--background)' }}>
      <ReviewConsole
        attemptId={reviewData.id}
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
