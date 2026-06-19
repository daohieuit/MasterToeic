# Kiến Trúc Hệ Thống (docs/architecture.md)

Tài liệu này mô tả chi tiết kiến trúc kỹ thuật, mô hình dữ liệu, luồng xử lý âm thanh và tích hợp AI của ứng dụng **MASTER TOEIC S&W**.

---

## 1. Tổng Quan Kiến Trúc (Architecture Overview)

MASTER TOEIC S&W là ứng dụng web serverless hiệu năng cao được xây dựng trên Next.js (App Router), vận hành theo mô hình kết hợp (Hybrid Model):

*   **Chế độ Khách (Guest Mode - Offline-First):** Lưu trữ toàn bộ dữ liệu lịch sử thi tại `localStorage`. File âm thanh ghi âm Speaking được duy trì tạm thời dưới dạng Object URL (`blob:`) trên bộ nhớ RAM trình duyệt. Hoàn toàn không phát sinh chi phí truyền tải đám mây.
*   **Chế độ Đăng nhập (Authenticated Mode - Cloud Sync):** Đồng bộ dữ liệu lịch sử thi lên Supabase Database. Tự động tải các file ghi âm Speaking của người dùng lên Supabase Storage và thiết lập lịch dọn dẹp tự động để tối ưu dung lượng lưu trữ.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS CLIENT                            │
│                                                                        │
│  ┌────────────────────────┐  Audio Blob  ┌──────────────────────────┐  │
│  │    Speaking/Writing    ├─────────────►│    Audio Merge Utility   │  │
│  │        Consoles        │              │  (TTS Marker + Silence)  │  │
│  └───────────┬────────────┘              └────────────┬─────────────┘  │
│              │ Reviews JSON                           │ WAV Audio      │
│              ▼                                        ▼                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         Attempt Handler                          │  │
│  └───────────┬────────────────────────────────────────┬─────────────┘  │
└──────────────┼────────────────────────────────────────┼────────────────┘
               │                                        │
      REST     │ RPC / INSERT                           │ Upload
      API      ▼                                        ▼
┌──────────────┴──────────────┐          ┌──────────────┴──────────────┐
│      SUPABASE DATABASE      │          │       SUPABASE STORAGE      │
│    (practice_history)       │          │        (user_audio)         │
└─────────────────────────────┘          └──────────────┬──────────────┘
                                                        │
                                                        │ Daily Job
                                                        ▼
                                                 ┌──────────────┐
                                                 │   pg_cron    │
                                                 │ (Auto-delete │
                                                 │  after 7d)   │
                                                 └──────────────┘
```

---

## 2. Công Nghệ Sử Dụng (Technology Stack)

*   **Core:** React 19, Next.js 16 (App Router), TypeScript.
*   **Styling:** Vanilla CSS kết hợp CSS Variables (Hệ màu sắc tối giản, không sử dụng Tailwind CSS hay các UI Library cồng kềnh nhằm giữ tính tùy biến cao và tải trang nhanh).
*   **Database & Storage:** Supabase (PostgreSQL, Storage API).
*   **Audio API:** Web Audio API (giải mã, trộn âm, ghép nối tệp), MediaRecorder API (ghi âm).
*   **AI Integration:** Tương thích API Gemini (qua SDK hoặc API Gemini Web định dạng JSON).
*   **Charts:** Chart.js + react-chartjs-2 (Biểu đồ Radar phân tích kỹ năng thành phần).

---

## 3. Mô Hình Dữ Liệu (Data Model)

### 3.1. Bảng Lịch Sử Làm Bài (Table: `practice_history`)
Bảng này lưu trữ kết quả toàn bộ bài thi thử và luyện tập của người dùng.

```sql
CREATE TABLE IF NOT EXISTS public.practice_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id TEXT NOT NULL,
    test_title TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    mode TEXT NOT NULL, -- 'full' | 'speaking' | 'writing' | 'part'
    part_name TEXT,     -- Ví dụ: "SPEAKING Part 3"
    speaking_score INTEGER, -- 0 - 200 (hoặc NULL nếu chưa chấm / không thi)
    writing_score INTEGER,  -- 0 - 200 (hoặc NULL nếu chưa chấm / không thi)
    reviews JSONB NOT NULL  -- Mảng chứa thông tin chi tiết từng câu hỏi
);
```

#### Cấu trúc phần tử trong mảng `reviews` (JSONB):
```json
{
  "questionId": "sp_q_1_1",
  "partTitle": "Part 1: Read a Text Aloud",
  "questionText": "If you're shopping, sightseeing...",
  "answer": "If you're shopping, sightseeing...",
  "audioUrl": "https://[ref].supabase.co/storage/v1/object/public/user_audio/[user_id]/[attempt_id]/sp_q_1_1.webm",
  "section": "speaking",
  "score": 80,
  "feedback": "Phát âm rõ ràng, nhịp điệu tương đối tốt...",
  "grammarErrors": [
    {
      "original": "shoping",
      "correction": "shopping",
      "explanation": "Sai chính tả từ shopping."
    }
  ],
  "computedSubscores": {
    "pronunciation": 85,
    "fluency": 80,
    "taskCompletion": 90,
    "grammar": 80,
    "vocabulary": 80,
    "cohesion": 80
  }
}
```

### 3.2. Cấu hình Lưu trữ Âm thanh (Storage Bucket: `user_audio`)
*   **Chế độ:** Public (URL trực tiếp hỗ trợ phát âm thanh qua thẻ HTML `<audio>`).
*   **Bảo mật RLS:**
    *   **SELECT:** Cho phép tất cả mọi người đọc (để bot chấm điểm hoặc trình duyệt khách nghe lại).
    *   **INSERT / DELETE:** Chỉ cho phép người dùng đã đăng nhập thao tác trên thư mục trùng với UUID của chính mình: `user_audio/[auth.uid()]/...`.
*   **Đường dẫn lưu tệp:** `user_audio/[user_id]/[attempt_id]/[question_id].[ext]`

---

## 4. Xử Lý File Âm Thanh & Gộp Tệp (Audio Pipelines)

Ứng dụng cung cấp hai cơ chế xử lý âm thanh độc lập tùy thuộc vào tính năng:

### 4.1. Luồng Ghi âm & Tải lên Storage (Độc lập từng câu)
Khi hoàn thành một câu hỏi Nói (Speaking):
1.  Ghi âm qua **MediaRecorder API** ➔ xuất ra Blob định dạng mặc định của trình duyệt (`audio/webm` trên Chrome/Android hoặc `audio/mp4` trên Safari/iOS).
2.  Sau khi kết thúc toàn bộ đề thi, nếu người dùng đã đăng nhập:
    -   Hệ thống đọc dữ liệu nhị phân từ các Blob URL cục bộ.
    -   Thực hiện tải lên Supabase Storage bucket `user_audio` theo đường dẫn cá nhân.
    -   Lấy liên kết công khai (Public URL) và cập nhật trường `audioUrl` của câu đó.

### 4.2. Luồng Trộn & Ghép Nối Âm thanh (Audio Merging - Tải xuống cục bộ)
Để hỗ trợ việc nộp bài và chấm điểm offline miễn phí trên Gemini Web, hệ thống tích hợp thư viện ghép nối âm thanh [audio.ts](file:///d:/Workspace/MasterToeic/src/utils/audio.ts) chạy bằng **Web Audio API**:

1.  **TTS Markers:** Hệ thống tự động gọi API `/api/tts` để sinh giọng đọc chỉ thị của AI (ví dụ: *"Part 1, Question 1"*, *"Question 2"*...).
2.  **Khử trùng khớp mẫu (Decoding):** Sử dụng `AudioContext.decodeAudioData` giải mã tệp chỉ thị AI và tệp ghi âm Speaking của học viên sang mảng đệm số `AudioBuffer`.
3.  **Tạo khoảng nghỉ (Silence Buffer):** Chèn các đoạn im lặng 1.0 giây sau chỉ thị AI và 1.5 giây giữa các câu trả lời.
4.  **Hợp nhất (Concatenation):** Tạo một `AudioBuffer` lớn bằng tổng độ dài tất cả các tệp, sao chép dữ liệu từ các tệp thành phần vào các vị trí offset tương ứng.
5.  **Mã hóa WAV:** Chuyển đổi mảng dữ liệu âm thanh số sang định dạng **WAV 16-bit PCM Mono** (1 kênh để tiết kiệm dung lượng) và tải xuống thiết bị của người dùng.

---

## 5. Cơ Chế Tự Động Dọn Dẹp (Cron Garbage Collector)

Để tránh lãng phí dung lượng lưu trữ Cloud (vốn giới hạn trên gói miễn phí), chúng tôi sử dụng extension `pg_cron` tích hợp trong cơ sở dữ liệu Supabase:

*   Một hàm SQL định danh `cleanup_old_user_audio()` chạy với quyền admin (`SECURITY DEFINER`) để xóa toàn bộ các bản ghi tệp cũ hơn 7 ngày trong bảng `storage.objects` của bucket `user_audio`:
    ```sql
    DELETE FROM storage.objects
    WHERE bucket_id = 'user_audio'
      AND created_at < (now() - INTERVAL '7 days');
    ```
*   Một lịch trình cron chạy hàng ngày vào lúc nửa đêm (`0 0 * * *`) để kích hoạt hàm trên, tự động giải phóng hoàn toàn dung lượng các file âm thanh đã quá hạn.
*   Khi tệp bị xóa khỏi bảng `storage.objects` ở database, trigger nội bộ của Supabase Storage sẽ tự động gửi webhook để xóa vĩnh viễn tệp tin vật lý tương ứng trên hệ thống lưu trữ đám mây.
