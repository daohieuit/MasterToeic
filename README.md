<p align="center">
  <img src="./public/logo.png" alt="MASTER TOEIC Logo" width="120" height="120" />
</p>

# MASTER TOEIC - Luyện Thi TOEIC Speaking & Writing Bằng AI

MASTER TOEIC là ứng dụng web serverless tối giản, hiệu quả và hoàn toàn miễn phí (0đ chi phí vận hành) hỗ trợ ôn luyện và thi thử hai kỹ năng Nói (Speaking) và Viết (Writing) theo chuẩn định dạng TOEIC quốc tế. 

Hệ thống hỗ trợ cơ chế **Tự chấm điểm bằng Gemini Web** hoàn toàn miễn phí, an toàn và bảo mật riêng tư, không cần cài đặt hay duy trì bất kỳ API Key hoặc máy chủ proxy nào.

---

## 🌟 Tính Năng Nổi Bật

*   **Zen Exam Room (Phòng thi tập trung):** Giao diện phòng thi tối giản, tự động ẩn mọi yếu tố điều hướng để học viên tập trung cao độ khi làm bài.
*   **Chuẩn Format TOEIC S&W:** Các phần thi được thiết kế bám sát 100% cấu trúc bài thi thực tế của ETS (11 câu hỏi Speaking, 8 câu hỏi Writing).
*   **Chấm Điểm & Nhận Xét Bằng Tiếng Việt:** AI tự động phân tích câu trả lời, sửa lỗi ngữ pháp, gợi ý diễn đạt lại và cung cấp bài mẫu đạt điểm tối đa (Sample Answer).
*   **Nhận diện giọng nói & Sóng âm động thời gian thực (Real-time Audio Visualizer):**
    *   Sử dụng **MediaRecorder API** và HTML5 Web Audio API vẽ biểu đồ sóng Canvas thời gian thực động khi thu âm Speaking.
    *   Tích hợp **Web Speech API (Speech Recognition)** để tự động nhận diện giọng nói sang văn bản phục vụ chấm điểm.
*   **Biểu đồ Radar & Trình phát Audio tuỳ chỉnh:**
    *   Biểu đồ **Radar Chart (`react-chartjs-2`)** phân tích đa khía cạnh điểm số thành phần (Phát âm, Trôi chảy, Ngữ pháp, Từ vựng, Liên kết).
    *   Trình phát Custom Audio Player hỗ trợ điều chỉnh tốc độ phát (0.75x, 1x, 1.25x, 1.5x, 2x) hữu ích khi shadowing.
*   **Thời Gian Tùy Biến (Practice Mode):** Cho phép học viên kéo dài thời gian chuẩn bị/trả lời (x1.5) hoặc rút ngắn (x0.5) để thử thách bản thân.
*   **Kiến trúc Linh hoạt (Cloud Sync & Local-first):** Hỗ trợ lưu trữ lịch sử thi và đề custom linh hoạt tại đám mây **Supabase Database** và **Storage** (khi đăng nhập) hoặc tự động chuyển hướng về bộ nhớ **LocalStorage** trình duyệt (chế độ Guest).

---

## 🛠️ Tech Stack & Thư Viện Sử Dụng

*   **Framework chính:** Next.js (React / TypeScript) - App Router
*   **Database & Auth & Storage:** Supabase (PostgreSQL + Row-Level Security + Storage Buckets)
*   **AI Engine:** Tương thích với mô hình đa phương thức trên các nền tảng AI Web như Google Gemini Web, ChatGPT, Claude (thông qua cơ chế nạp JSON dán).
*   **Styling:** Vanilla CSS (CSS Variables) - Light / Dark Mode, Responsive, không sử dụng màu Tím (Purple Ban) bảo đảm giao diện chuyên nghiệp.
*   **Icons:** `lucide-react`
*   **Hiệu ứng chúc mừng:** `canvas-confetti`

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh (Local Development)

### 1. Yêu cầu hệ thống
*   Đã cài đặt **Node.js** (v18 trở lên).
*   Tài khoản **Supabase** (miễn phí) với project đã khởi tạo và thiết lập các bảng.

### 2. Cài đặt và Chạy ứng dụng
1.  Clone dự án và truy cập vào thư mục:
    ```bash
    cd MasterToeic
    ```
2.  Cài đặt các gói phụ thuộc:
    ```bash
    npm install
    ```
3.  Tạo file cấu hình môi trường `.env.local` dựa trên mẫu `.env.example`:
    ```bash
    cp .env.example .env.local
    ```
4.  Điền các thông số kết nối Supabase của riêng bạn vào `.env.local`.
5.  Chạy máy chủ phát triển:
    ```bash
    npm run dev
    ```
6.  Mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Cấu Hình Môi Trường (.env)

| Biến Môi Trường | Mô Tả | Bắt Buộc |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL dự án Supabase của bạn. | ✅ Có (cho lưu Cloud) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/Public key của dự án Supabase. | ✅ Có (cho lưu Cloud) |

---

## 📄 Tài Liệu Chi Tiết (Docs)

Hệ thống tài liệu hướng dẫn chi tiết nằm trong thư mục `/docs/`:
*   [Yêu cầu Sản phẩm (PRD)](./docs/PRD.md): Mục tiêu, đối tượng, và luồng tính năng.
*   [Hệ thống Thiết kế (DESIGN)](./docs/DESIGN.md): UI/UX, biến CSS, quy tắc thiết kế.
*   [Kiến trúc Hệ thống (ARCHITECTURE)](./docs/architecture.md): Mô hình dữ liệu, luồng Audio và hoạt động của Cron Job.
*   [Cấu trúc Database (SQL)](./supabase/migrations/20260613000000_init_schema.sql): Mã lệnh SQL khởi tạo bảng trên Supabase.
*   [Thiết lập Storage (SQL)](./supabase/migrations/20260618000000_setup_storage.sql): Mã lệnh SQL cấu hình Storage Bucket và RLS cho file ghi âm.
*   [Cấu trúc Đề thi TOEIC S&W](./docs/toeic_format.md): Mô tả chi tiết thời gian và luật thi của các Part.
*   [Hướng dẫn Triển khai Vercel](./docs/deployment.md): Hướng dẫn deploy miễn phí lên Vercel.

---

## 💡 Quy Trình Tự Chấm Điểm AI Miễn Phí (Self-Grading Workflow)

Để tối ưu hóa chi phí vận hành 0đ và đảm bảo dự án hoạt động trọn đời không lo hết hạn API Key, MASTER TOEIC hỗ trợ quy trình tự chấm điểm miễn phí bằng AI:

1.  **Làm bài:** Học viên hoàn thành phần thi Nói/Viết và nhấn nộp bài. Trang kết quả ban đầu hiển thị trạng thái `Chờ chấm (Pending)`.
2.  **Tải tư liệu:** Nhấn nút **"Tải JSON & Audio"**. Hệ thống sẽ tải xuống 1 file JSON bài làm và tự động ghép nối các bản thu âm của bạn thành **1 tệp âm thanh WAV duy nhất** có chèn chỉ thị của AI.
3.  **Copy Prompt:** Nhấp vào nút **"Copy Prompt"** để sao chép chỉ thị chấm điểm chuyên sâu bằng tiếng Việt.
4.  **Tải lên Gemini Web:** Truy cập [Gemini Web](https://gemini.google.com), đính kèm file JSON + file WAV vừa tải về, dán prompt đã copy và gửi.
5.  **Áp dụng kết quả:** Sao chép đoạn mã JSON kết quả nhận xét mà Gemini Web trả về, dán vào ô dán JSON trên MASTER TOEIC và bấm **"Áp dụng kết quả"**. Hệ thống sẽ ngay lập tức hiển thị điểm trọng số chi tiết, biểu đồ Radar và phần sửa lỗi ngữ pháp.
