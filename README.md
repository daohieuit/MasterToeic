# Master Toeic - Luyện Thi TOEIC Speaking & Writing Bằng AI

Master Toeic là ứng dụng web serverless tối giản, hiệu quả và hoàn toàn miễn phí (0đ chi phí vận hành) hỗ trợ ôn luyện và thi thử hai kỹ năng Nói (Speaking) và Viết (Writing) theo chuẩn định dạng TOEIC quốc tế. Hệ thống tích hợp công nghệ AI từ Gemini (`gemini-web2api` proxy) để tự động chấm điểm, chỉ ra lỗi sai ngữ pháp và đưa ra nhận xét chi tiết bằng tiếng Việt.

---

## 🌟 Tính Năng Nổi Bật

* **Zen Exam Room (Phòng thi tập trung):** Giao diện phòng thi tối giản, tự động ẩn mọi yếu tố điều hướng để học viên tập trung cao độ khi làm bài.
* **Chuẩn Format TOEIC S&W:** Các phần thi được thiết kế bám sát 100% cấu trúc bài thi thực tế của ETS (11 câu hỏi Speaking, 8 câu hỏi Writing).
* **Chấm Điểm & Nhận Xét Bằng Tiếng Việt:** AI tự động phân tích câu trả lời, sửa lỗi ngữ pháp, gợi ý diễn đạt lại và cung cấp bài mẫu đạt điểm tối đa (Sample Answer).
* **Ghi Âm & Nhận Diện Giọng Nói Cục Bộ:** 
  * Sử dụng **MediaRecorder API** để ghi âm câu trả lời giúp học viên nghe lại bài nói của mình.
  * Tích hợp **Web Speech API (Speech Recognition)** để nhận diện giọng nói sang văn bản tiếng Anh phục vụ chấm điểm.
* **Thời Gian Tùy Biến (Practice Mode):** Cho phép học viên kéo dài thời gian chuẩn bị/trả lời (x1.5) hoặc rút ngắn (x0.5) để thử thách bản thân.
* **Trang Admin Tạo Đề Nhanh:** Hỗ trợ Admin sinh đề thi ngẫu nhiên qua AI, chỉnh sửa trực tiếp và xuất tệp JSON hoặc lưu vào trình duyệt.
* **Kiến Trúc Serverless 0đ:** Không cần cơ sở dữ liệu. Điểm số và lịch sử làm bài được lưu trữ an toàn tại `localStorage` trình duyệt.

---

## 🛠️ Tech Stack & Thư Viện Sử Dụng

* **Framework chính:** Next.js (React / TypeScript) - App Router
* **Styling:** Vanilla CSS (CSS Variables) - Light / Dark Mode, Responsive, không sử dụng màu Tím (Purple Ban) bảo đảm giao diện chuyên nghiệp.
* **Icons:** `lucide-react`
* **Hiệu ứng chúc mừng:** `canvas-confetti`
* **AI API Proxy:** `gemini-web2api` (hỗ trợ OpenAI-compatible endpoint)

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh (Local Development)

### 1. Yêu cầu hệ thống
* Đã cài đặt **Node.js** (v18 trở lên).
* Đang chạy máy chủ proxy `gemini-web2api` tại cổng `8081` (hoặc cổng cấu hình riêng).

### 2. Cài đặt và Chạy ứng dụng
1. Clone dự án và truy cập vào thư mục:
   ```bash
   cd MasterToeic
   ```
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Tạo file cấu hình môi trường `.env.local` dựa trên mẫu `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
4. Chạy máy chủ phát triển:
   ```bash
   npm run dev
   ```
5. Mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Cấu Hình Môi Trường (.env)

| Biến Môi Trường | Mô Tả | Giá Trị Mặc Định |
|---|---|---|
| `GEMINI_API_KEY` | API Key của Gemini dùng để chấm bài ở API Route. | (Trống) |
| `GEMINI_BASE_URL` | Base URL dẫn tới proxy `gemini-web2api`. | `http://localhost:8081/v1` |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Mật khẩu truy cập trang Quản trị Admin. | `admin123` |

---

## 📄 Tài Liệu Chi Tiết (Docs)

Hệ thống tài liệu hướng dẫn nằm trong thư mục `/docs/`:
* [Yêu cầu Sản phẩm (PRD)](file:///d:/Workspace/MasterToeic/docs/PRD.md): Mục tiêu, đối tượng, và luồng tính năng.
* [Hệ thống Thiết kế (DESIGN)](file:///d:/Workspace/MasterToeic/docs/DESIGN.md): UI/UX, biến CSS, quy tắc thiết kế.
* [Cấu trúc Database (SQL)](file:///d:/Workspace/MasterToeic/docs/database.sql): Mã lệnh SQL khởi tạo bảng trên Supabase.
* [Tích hợp Gemini AI & Cấu trúc Prompt](file:///d:/Workspace/MasterToeic/docs/gemini_integration.md): Cách thức gọi API chấm điểm và sinh đề thi.
* [Gemini Web2API Proxy](file:///d:/Workspace/MasterToeic/docs/gemini-web2api.md): Cài đặt và sử dụng proxy API cho Gemini.
* [Hướng dẫn Lấy Key & Cấu hình Gemini](file:///d:/Workspace/MasterToeic/docs/gemini_setup.md): Hướng dẫn lấy Cookie từ Gemini Web hoặc API Key từ Google AI Studio.
* [Cấu trúc Đề thi TOEIC S&W](file:///d:/Workspace/MasterToeic/docs/toeic_format.md): Mô tả chi tiết thời gian và luật thi của các Part.
* [Hướng dẫn Triển khai Vercel](file:///d:/Workspace/MasterToeic/docs/deployment.md): Hướng dẫn deploy miễn phí lên Vercel.
