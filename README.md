# Master Toeic - Luyện Thi TOEIC Speaking & Writing Bằng AI

Master Toeic là ứng dụng web serverless tối giản, hiệu quả và hoàn toàn miễn phí (0đ chi phí vận hành) hỗ trợ ôn luyện và thi thử hai kỹ năng Nói (Speaking) và Viết (Writing) theo chuẩn định dạng TOEIC quốc tế. Hệ thống tích hợp công nghệ AI từ **Google Gemini API** để tự động chấm điểm, chỉ ra lỗi sai ngữ pháp và đưa ra nhận xét chi tiết bằng tiếng Việt.

---

## 🌟 Tính Năng Nổi Bật

* **Zen Exam Room (Phòng thi tập trung):** Giao diện phòng thi tối giản, tự động ẩn mọi yếu tố điều hướng để học viên tập trung cao độ khi làm bài.
* **Chuẩn Format TOEIC S&W:** Các phần thi được thiết kế bám sát 100% cấu trúc bài thi thực tế của ETS (11 câu hỏi Speaking, 8 câu hỏi Writing).
* **Chấm Điểm & Nhận Xét Bằng Tiếng Việt:** AI tự động phân tích câu trả lời, sửa lỗi ngữ pháp, gợi ý diễn đạt lại và cung cấp bài mẫu đạt điểm tối đa (Sample Answer).
* **Nhận diện giọng nói & Sóng âm động thời gian thực (Real-time Audio Visualizer):**
  * Sử dụng **MediaRecorder API** và HTML5 Web Audio API vẽ biểu đồ sóng Canvas thời gian thực động khi thu âm Speaking.
  * Tích hợp **Web Speech API (Speech Recognition)** để nhận diện giọng nói sang văn bản phục vụ chấm điểm.
* **Biểu đồ Radar & Trình phát Audio tuỳ chỉnh:**
  * Biểu đồ **Radar Chart (`react-chartjs-2`)** phân tích đa khía cạnh điểm số thành phần (Phát âm, Trôi chảy, Ngữ pháp, Từ vựng, Liên kết).
  * Trình phát Custom Audio Player hỗ trợ điều chỉnh tốc độ phát (0.75x, 1x, 1.25x, 1.5x, 2x) hữu ích khi shadowing.
* **Thời Gian Tùy Biến (Practice Mode):** Cho phép học viên kéo dài thời gian chuẩn bị/trả lời (x1.5) hoặc rút ngắn (x0.5) để thử thách bản thân.
* **Bảng điều khiển Admin Pipeline & Editor Drawer:**
  * Sinh đề tự động bằng AI, quản lý đề thi trực quan, kiểm tra link ảnh bị hỏng có lưu bộ đệm (cache) 24h.
  * Trình biên tập đề thi Split-pane chia cột trực quan, chỉnh sửa câu hỏi chuyên sâu và nhập dữ liệu JSON nhanh chóng.
* **Kiến trúc Linh hoạt (Cloud Sync & Local-first):** Hỗ trợ lưu trữ lịch sử thi và đề custom linh hoạt tại đám mây **Supabase Database** (khi đăng nhập) hoặc tự động chuyển hướng về bộ nhớ **LocalStorage** trình duyệt (chế độ Guest).

---

## 🛠️ Tech Stack & Thư Viện Sử Dụng

* **Framework chính:** Next.js (React / TypeScript) - App Router
* **Database & Auth:** Supabase (PostgreSQL + Row-Level Security)
* **AI Scoring:** Google Gemini API (`gemini-2.5-flash` hoặc tương đương)
* **Image Hosting:** ImgBB API (cho ảnh đề Writing Part 1)
* **Styling:** Vanilla CSS (CSS Variables) - Light / Dark Mode, Responsive
* **Icons:** `lucide-react`
* **Hiệu ứng chúc mừng:** `canvas-confetti`

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh (Local Development)

### 1. Yêu cầu hệ thống
* Đã cài đặt **Node.js** (v18 trở lên).
* Tài khoản **Supabase** (miễn phí) với project đã khởi tạo.
* **Google Gemini API Key** (lấy tại [Google AI Studio](https://aistudio.google.com/)).

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
4. Điền các giá trị thực vào `.env.local` (xem bảng bên dưới).
5. Chạy máy chủ phát triển:
   ```bash
   npm run dev
   ```
6. Mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Cấu Hình Môi Trường (.env)

| Biến Môi Trường | Mô Tả | Bắt Buộc |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase của bạn. | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key của project Supabase. | ✅ |
| `GEMINI_API_KEY` | API Key của Gemini dùng để chấm bài. | ✅ |
| `GEMINI_BASE_URL` | Base URL Gemini API. | ✅ (mặc định: `https://generativelanguage.googleapis.com/v1beta/openai`) |
| `GEMINI_MODEL` | Model Gemini sử dụng. | Không (mặc định: `gemini-2.5-flash`) |
| `IMGBB_API_KEY` | API Key ImgBB để upload ảnh đề Writing Part 1. | Không bắt buộc |

---

## 📄 Tài Liệu Chi Tiết (Docs)

Hệ thống tài liệu hướng dẫn nằm trong thư mục `/docs/`:
* [Yêu cầu Sản phẩm (PRD)](docs/PRD.md): Mục tiêu, đối tượng, và luồng tính năng.
* [Hệ thống Thiết kế (DESIGN)](docs/DESIGN.md): UI/UX, biến CSS, quy tắc thiết kế.
* [Cấu trúc Database (SQL)](docs/database.sql): Mã lệnh SQL khởi tạo bảng trên Supabase.
* [Cấu trúc Đề thi TOEIC S&W](docs/toeic_format.md): Mô tả chi tiết thời gian và luật thi của các Part.
* [Tài liệu học Speaking & Writing](docs/sw.md): Hướng dẫn ôn tập kỹ năng Nói và Viết.
* [Hướng dẫn Triển khai Vercel](docs/deployment.md): Hướng dẫn deploy miễn phí lên Vercel.


---

## 🌟 Tính Năng Nổi Bật

* **Zen Exam Room (Phòng thi tập trung):** Giao diện phòng thi tối giản, tự động ẩn mọi yếu tố điều hướng để học viên tập trung cao độ khi làm bài.
* **Chuẩn Format TOEIC S&W:** Các phần thi được thiết kế bám sát 100% cấu trúc bài thi thực tế của ETS (11 câu hỏi Speaking, 8 câu hỏi Writing).
* **Chấm Điểm & Nhận Xét Bằng Tiếng Việt:** AI tự động phân tích câu trả lời, sửa lỗi ngữ pháp, gợi ý diễn đạt lại và cung cấp bài mẫu đạt điểm tối đa (Sample Answer).
* **Nhận diện giọng nói & Sóng âm động thời gian thực (Real-time Audio Visualizer):** 
  * Sử dụng **MediaRecorder API** và HTML5 Web Audio API vẽ biểu đồ sóng Canvas thời gian thực động khi thu âm Speaking.
  * Tích hợp **Web Speech API (Speech Recognition)** để nhận diện giọng nói sang văn bản phục vụ chấm điểm.
* **Biểu đồ Radar & Trình phát Audio tuỳ chỉnh:**
  * Biểu đồ **Radar Chart (`react-chartjs-2`)** phân tích đa khía cạnh điểm số thành phần (Phát âm, Trôi chảy, Ngữ pháp, Từ vựng, Liên kết).
  * Trình phát Custom Audio Player hỗ trợ điều chỉnh tốc độ phát (0.75x, 1x, 1.25x, 1.5x, 2x) hữu ích khi shadowing.
* **Thời Gian Tùy Biến (Practice Mode):** Cho phép học viên kéo dài thời gian chuẩn bị/trả lời (x1.5) hoặc rút ngắn (x0.5) để thử thách bản thân.
* **Bảng điều khiển Admin Pipeline & Editor Drawer:**
  * Sinh đề tự động bằng AI, quản lý đề thi trực quan, kiểm tra link ảnh bị hỏng có lưu bộ đệm (cache) 24h.
  * Trình biên tập đề thi Split-pane chia cột trực quan, chỉnh sửa câu hỏi chuyên sâu và nhập dữ liệu JSON nhanh chóng.
* **Kiến trúc Linh hoạt (Cloud Sync & Local-first):** Hỗ trợ lưu trữ lịch sử thi và đề custom linh hoạt tại đám mây **Supabase Database** (khi đăng nhập) hoặc tự động chuyển hướng về bộ nhớ **LocalStorage** trình duyệt (chế độ Guest).

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
* [Cấu trúc Đề thi TOEIC S&W](file:///d:/Workspace/MasterToeic/docs/toeic_format.md): Mô tả chi tiết thời gian và luật thi của các Part.
* [Tài liệu học Speaking & Writing](file:///d:/Workspace/MasterToeic/docs/sw.md): Hướng dẫn ôn tập kỹ năng Nói và Viết.
* [Hướng dẫn Triển khai Vercel](file:///d:/Workspace/MasterToeic/docs/deployment.md): Hướng dẫn deploy miễn phí lên Vercel.
