-- 1. Tạo bảng lưu lịch sử thi (practice_history)
CREATE TABLE IF NOT EXISTS public.practice_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id TEXT NOT NULL,
    test_title TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    mode TEXT NOT NULL,
    part_name TEXT,
    speaking_score INTEGER,
    writing_score INTEGER,
    reviews JSONB NOT NULL
);

-- Bật tính năng Row Level Security (RLS) cho bảng lịch sử
ALTER TABLE public.practice_history ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách bảo mật cho bảng lịch sử: Người dùng chỉ được xem/thêm/xóa dữ liệu của chính mình
CREATE POLICY "Users can view their own history" 
    ON public.practice_history FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history" 
    ON public.practice_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own history" 
    ON public.practice_history FOR DELETE 
    USING (auth.uid() = user_id);


-- 2. Tạo bảng lưu đề thi tự sinh (custom_tests)
CREATE TABLE IF NOT EXISTS public.custom_tests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    speaking_data JSONB,
    writing_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Bật tính năng Row Level Security (RLS) cho bảng đề thi
ALTER TABLE public.custom_tests ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách bảo mật cho bảng đề thi:
-- Tất cả mọi người (kể cả khách chưa đăng nhập) đều có quyền xem đề thi
CREATE POLICY "Anyone can view custom tests" 
    ON public.custom_tests FOR SELECT 
    USING (true);

-- Chỉ những tài khoản đã đăng nhập mới có quyền thêm/sửa/xóa đề thi
CREATE POLICY "Authenticated users can insert tests" 
    ON public.custom_tests FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tests" 
    ON public.custom_tests FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tests" 
    ON public.custom_tests FOR DELETE 
    USING (auth.role() = 'authenticated');


-- 3. Thiết lập Storage cho tệp âm thanh Speaking
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user_audio',
    'user_audio',
    true,
    10485760, -- 10MB
    ARRAY['audio/wav', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Bật RLS cho bảng storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Cho phép xem âm thanh công khai
CREATE POLICY "Allow public read of user_audio" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'user_audio');

-- Cho phép upload vào thư mục riêng của người dùng
CREATE POLICY "Allow authenticated insert to user_audio" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'user_audio' 
        AND (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Cho phép xóa tệp tin của chính mình
CREATE POLICY "Allow authenticated delete from user_audio" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'user_audio'
        AND (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Kích hoạt cron tự động xóa tệp tin cũ hơn 7 ngày
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_old_user_audio()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'user_audio'
      AND created_at < (now() - INTERVAL '7 days');
END;
$$;

-- Chạy dọn dẹp hàng ngày lúc 00:00
SELECT cron.schedule(
    'cleanup-old-user-audio-job',
    '0 0 * * *',
    'SELECT public.cleanup_old_user_audio();'
);

