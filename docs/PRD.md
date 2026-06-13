# Product Requirements Document (PRD) - Master Toeic

Master Toeic là nền tảng web serverless hỗ trợ người dùng tự luyện thi kỹ năng Nói (Speaking) và Viết (Writing) theo chuẩn định dạng TOEIC S&W chính thức, sử dụng công nghệ AI Gemini để tự động đánh giá và phản hồi chi tiết bằng tiếng Việt với chi phí vận hành 0đ.

---

## 1. Mục tiêu dự án (Objectives)
* **Tiện ích tối đa:** Cung cấp môi trường luyện thi sát với thực tế phòng thi TOEIC S&W nhất có thể.
* **Tự động hóa đánh giá:** Chấm điểm, chỉ ra lỗi sai ngữ pháp, phát âm (qua văn bản transcription) và đưa ra gợi ý cải thiện bằng tiếng Việt.
* **Chi phí 0đ:** Sử dụng kiến trúc Serverless (Next.js App Router trên Vercel), không cần cơ sở dữ liệu server-side, lưu trữ dữ liệu hoàn toàn ở Local Storage/IndexedDB trên trình duyệt của người dùng.
* **Trải nghiệm mượt mà:** Giao diện tối giản, tập trung tối đa vào phần làm bài, tải trang tức thì nhờ dữ liệu đề thi tĩnh (JSON).

---

## 2. Đối tượng người dùng (Target Audience)
* **Học viên tự ôn TOEIC S&W:** Những người cần luyện tập Speaking & Writing nhưng không có giáo viên sửa bài trực tiếp.
* **Quản trị viên (Admin/Creator):** Những người muốn tạo thêm đề thi mới một cách nhanh chóng thông qua AI mà không cần can thiệp sâu vào code.

---

## 3. Các tính năng chính (Core Features)

### 3.1. Phân hệ Luyện tập & Thi thử (Practice & Test Modules)
Hỗ trợ 3 chế độ làm bài:
1. **Full Test:** Làm trọn vẹn cả 2 kỹ năng Speaking (20 phút) và Writing (60 phút) theo đúng thời gian và trình tự thi thật.
2. **Skill Test:** Luyện riêng kỹ năng Speaking hoặc Writing với đầy đủ các Part tương ứng.
3. **Part Practice:** Luyện tập riêng lẻ từng Part cụ thể (ví dụ: chỉ luyện Writing Part 3 - Opinion Essay) để cải thiện kỹ năng còn yếu.

#### A. Speaking Test (11 Câu hỏi - ~20 phút)
* **Part 1 (Q1-2): Read a text aloud** (Đọc thành tiếng)
  * Chuẩn bị: 45s | Trả lời: 45s
* **Part 2 (Q3-4): Describe a picture** (Mô tả tranh)
  * Chuẩn bị: 45s | Trả lời: 45s
  * Hiển thị hình ảnh ngẫu nhiên hoặc theo đề từ kho ảnh công sở.
* **Part 3 (Q5-7): Respond to questions** (Trả lời câu hỏi tình huống)
  * Chuẩn bị: Không | Trả lời: Q5 (15s), Q6 (15s), Q7 (30s)
* **Part 4 (Q8-10): Respond to questions using information provided** (Trả lời câu hỏi dùng thông tin cho sẵn)
  * Đọc thông tin: 45s | Chuẩn bị: Không | Trả lời: Q8 (15s), Q9 (15s), Q10 (30s)
* **Part 5 (Q11): Express an opinion** (Nêu ý kiến)
  * Chuẩn bị: 45s | Trả lời: 60s

* **Tương tác Speaking:**
  * Bộ đếm thời gian đếm ngược tự động cho cả giai đoạn chuẩn bị và trả lời.
  * Ghi âm giọng nói cục bộ bằng trình duyệt (**MediaRecorder API**). Học viên có thể nghe lại file ghi âm của chính mình sau khi hoàn thành.
  * Sử dụng **Speech Recognition API** (Web Speech API của trình duyệt) để tự động chuyển đổi giọng nói thành văn bản (Transcribed Text) nhằm phục vụ cho việc chấm điểm bằng Gemini.

#### B. Writing Test (8 Câu hỏi - 60 phút)
* **Part 1 (Q1-5): Write a sentence based on a picture** (Viết câu theo tranh với 2 từ gợi ý)
  * Quản lý thời gian: Tổng cộng 8 phút cho cả 5 câu.
  * Hiển thị hình ảnh công sở kèm 2 từ khóa bắt buộc.
* **Part 2 (Q6-7): Respond to a written request** (Trả lời thư điện tử)
  * Quản lý thời gian: 10 phút cho mỗi email.
* **Part 3 (Q8): Write an opinion essay** (Viết bài luận nêu ý kiến)
  * Quản lý thời gian: 30 phút.
  * Yêu cầu độ dài tối thiểu 300 từ (có bộ đếm từ trực quan).

---

### 3.2. Hệ thống chấm điểm & Nhận xét bằng AI (Gemini AI Evaluation)
* Sau khi người dùng hoàn thành bài thi/bài luyện tập, hệ thống gửi câu trả lời (văn bản đối với Writing, và văn bản đã nhận diện giọng nói đối với Speaking) kèm theo ngữ cảnh câu hỏi đến API của **Gemini** (thông qua router API an toàn của Next.js để giấu API key).
* **Nội dung đánh giá trả về bằng tiếng Việt:**
  * Điểm số ước lượng theo thang điểm TOEIC (Nói: 0-200, Viết: 0-200 hoặc điểm số cho từng câu).
  * Nhận xét chi tiết về ngữ pháp, từ vựng, tính liên kết (coherence) và cách phát triển ý.
  * Chỉ ra các lỗi sai cụ thể và đưa ra gợi ý sửa đổi.
  * Cung cấp **Bài mẫu tham khảo (Sample Answer)** đạt điểm tối đa cho câu hỏi đó.

---

### 3.3. Trang Quản trị tạo đề thi nhanh (Admin Generator Panel)
* Lối vào trang ẩn `/admin` được bảo vệ bằng mật khẩu tĩnh thiết lập qua biến môi trường (`ADMIN_PASSWORD`).
* Cho phép Admin nhập cấu hình kết nối API Gemini (Base URL, API Key) cục bộ (lưu trong Session Storage của admin, bảo mật tuyệt đối).
* **Tính năng Sinh đề tự động:**
  * Admin chọn Kỹ năng hoặc Part cần tạo đề.
  * Hệ thống gửi prompt tối ưu đến Gemini để tự động thiết kế đề thi tiếng Anh chuẩn TOEIC (văn bản đọc, câu hỏi tình huống, bảng biểu thông tin cho Part 4, từ gợi ý cho Writing Part 1, đề bài luận...).
  * Đối với các câu hỏi có hình ảnh (Speaking Part 2, Writing Part 1), hệ thống tự động tìm và gợi ý các ảnh phù hợp chủ đề công sở từ thư viện ảnh Unsplash/Picsum.
  * Giao diện trực quan cho phép Admin xem trước (Preview), chỉnh sửa thủ công các câu hỏi trực tiếp trên web.
  * **Xuất đề thi:** Cho phép Admin tải về file JSON của đề thi để lưu vào thư mục dự án trên GitHub.

---

### 3.4. Lưu trữ lịch sử học tập (Local History & Progress)
* Lưu trữ lịch sử toàn bộ các bài làm, đáp án của người dùng, file ghi âm cục bộ (dưới dạng base64 hoặc IndexedDB blob) và nhận xét của AI.
* Trang thống kê cá nhân hiển thị biểu đồ tiến trình điểm số (Speaking và Writing) qua các lần làm bài (sử dụng LocalStorage).

---

### 3.5. Trải nghiệm người dùng (UX/UI & Localization)
* **Song ngữ:** Chuyển đổi toàn bộ giao diện phần khung giữa tiếng Anh và tiếng Việt bằng 1 cú click. (Nội dung đề thi luôn bằng tiếng Anh theo chuẩn thi thật).
* **Light/Dark Mode:** Thiết kế tinh tế, dịu mắt, tránh gây mất tập trung khi làm bài.
* **Không làm gián đoạn:** Bộ đếm thời gian và trình ghi âm chạy ngầm mượt mà, tự động chuyển câu hỏi khi hết giờ.

---

## 4. Ràng buộc kỹ thuật & Giải pháp tối ưu hóa chi phí
* **Frontend Framework:** Next.js (App Router) với React.
* **Styling:** Vanilla CSS kết hợp các CSS Variables mạnh mẽ để quản lý Theme (Light/Dark) và đáp ứng chuẩn thiết kế cao cấp, nói không với sự rập khuôn của các thư viện UI mặc định (theo quy tắc `frontend-specialist`).
* **Database:** Không dùng database server. Lưu dữ liệu cấu hình đề thi ở file JSON tĩnh `/src/data/tests/` và lưu kết quả làm bài của học viên ở trình duyệt (`localStorage` / `IndexedDB`).
* **API Integration:** Xây dựng API Route Next.js `/api/eval` và `/api/generate` làm cầu nối gọi tới `gemini-web2api`. Điều này giúp bảo vệ API Key của hệ thống không bị lộ ra ngoài client-side.
* **Deployment:** Deploy miễn phí lên Vercel. Dữ liệu đề thi tĩnh giúp trang tải cực nhanh và chịu tải lớn mà không tốn tài nguyên server.
