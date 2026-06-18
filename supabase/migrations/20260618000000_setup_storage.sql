-- 1. Khởi tạo Storage Bucket cho file âm thanh người dùng (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user_audio',
    'user_audio',
    true,
    10485760, -- Giới hạn 10MB mỗi file
    ARRAY['audio/wav', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Bật RLS cho bảng lưu trữ đối tượng (nếu chưa bật)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Tạo các chính sách bảo mật RLS cho bucket 'user_audio'
-- Cho phép mọi người đọc các file âm thanh thông qua URL công khai
CREATE POLICY "Allow public read of user_audio" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'user_audio');

-- Chỉ cho phép người dùng đã đăng nhập tải lên tệp tin vào thư mục của chính họ
CREATE POLICY "Allow authenticated insert to user_audio" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'user_audio' 
        AND (auth.uid())::text = (storage.foldername(name))[1]
    );

-- Chỉ cho phép người dùng đã đăng nhập tự xóa tệp tin của mình
CREATE POLICY "Allow authenticated delete from user_audio" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'user_audio'
        AND (auth.uid())::text = (storage.foldername(name))[1]
    );

-- 3. Kích hoạt và thiết lập cron tự động xóa tệp tin cũ hơn 7 ngày
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Hàm thực hiện dọn dẹp các bản ghi trong cơ sở dữ liệu lưu trữ
CREATE OR REPLACE FUNCTION public.cleanup_old_user_audio()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Chạy với quyền của admin để bỏ qua RLS của bảng storage
AS $$
BEGIN
    DELETE FROM storage.objects
    WHERE bucket_id = 'user_audio'
      AND created_at < (now() - INTERVAL '7 days');
END;
$$;

-- Đăng ký tác vụ cron chạy mỗi ngày vào lúc nửa đêm
SELECT cron.schedule(
    'cleanup-old-user-audio-job',
    '0 0 * * *',
    'SELECT public.cleanup_old_user_audio();'
);
