# Tích Hợp Gemini AI & Cấu Trúc Prompt (docs/gemini_integration.md)

Dự án MasterToeic S&W sử dụng proxy `gemini-web2api` chuyển đổi giao diện web của Gemini thành một API tương thích với OpenAI để phục vụ hai tính năng cốt lõi: **Chấm điểm (Evaluation)** và **Sinh đề thi (Generation)**.

---

## 1. Cơ Chế Chấm Điểm & Nhận Xét (/api/eval)

Hệ thống gửi câu trả lời của người dùng (dạng văn bản cho phần Viết hoặc văn bản chuyển đổi từ giọng nói cho phần Nói) cùng với ngữ cảnh đề bài lên API route `/api/eval`.

### 1.1. Cấu Trúc Prompt Hệ Thống (System Prompt)
AI được chỉ thị đóng vai trò là một **Giám khảo TOEIC S&W được cấp chứng chỉ**:
* Phân tích lỗi ngữ pháp, chính tả, cách dùng từ.
* Viết đánh giá bằng **tiếng Việt**.
* Giữ nguyên bài thi của học viên và bài mẫu bằng **tiếng Anh**.
* Trả về định dạng JSON thuần để hệ thống dễ dàng xử lý mà không bị lẫn văn bản thừa.

### 1.2. Tiêu Chí Đánh Giá Cho Từng Part
* **Speaking Part 1 (Read Aloud):** Tập trung vào Phát âm (Pronunciation), Ngữ điệu (Intonation) và Trọng âm (Stress).
* **Speaking Part 2 (Describe a Picture):** Đánh giá Ngữ pháp (Grammar), Từ vựng (Vocabulary), Tính liên kết (Coherence) và mức độ bám sát chi tiết tranh.
* **Speaking Part 3, 4, 5:** Đánh giá tính hoàn thiện của câu trả lời, sự mạch lạc và từ vựng chuyên ngành.
* **Writing Part 1 (Write a Sentence Based on a Picture):** Kiểm tra ngữ pháp và bắt buộc phải dùng chính xác 2 từ gợi ý trong cùng 1 câu đơn miêu tả tranh.
* **Writing Part 2 (Respond to a Written Request):** Đánh giá tính thuyết phục của giải pháp/gợi ý trong email, văn phong công sở lịch sự.
* **Writing Part 3 (Opinion Essay):** Kiểm tra cấu trúc bài viết (Mở - Thân - Kết), luận điểm chứng minh và số lượng từ (yêu cầu tối thiểu 300 từ).

---

## 2. Cơ Chế Tự Động Sinh Đề Thi (/api/generate)

Trang Admin cho phép sinh đề tự động bằng cách gửi yêu cầu tới API Route `/api/generate`.

### 2.1. Sinh Đề Nói (Speaking)
Gemini sẽ tạo ra cấu trúc JSON chứa:
* Q1-2: Các đoạn văn bản thông báo hoặc quảng cáo dài khoảng 60-80 từ có nhiều từ phát âm khó (số, tên riêng, từ ghép).
* Q3-4: Đề bài yêu cầu miêu tả ảnh (Ảnh thực tế sẽ được server-side tự động nhúng link Unsplash chất lượng cao theo chủ đề công sở).
* Q5-7: Các câu hỏi tình huống đời sống/công việc.
* Q8-10: Thiết kế một bảng thông tin (Agenda, lịch trình hội nghị, hóa đơn) chi tiết dạng văn bản và 3 câu hỏi khai thác dữ liệu trong bảng.
* Q11: Câu hỏi viết luận thảo luận ý kiến cá nhân.

### 2.2. Sinh Đề Viết (Writing)
* Q1-5: Sinh 5 nhóm từ gợi ý miêu tả tranh công sở (Ví dụ: `receptionist` / `guest`).
* Q6-7: Viết 2 email yêu cầu mẫu từ đối tác hoặc cấp trên.
* Q8: Một chủ đề tranh luận xã hội hoặc công việc để viết essay.

---

## 3. Xử Lý Phản Hồi JSON Lỗi (Robust Parsing)

Do API web2api đôi khi trả về mã markdown bao quanh JSON (ví dụ: ` ```json ... ``` `), máy chủ API của MasterToeic S&W đã tích hợp sẵn bộ lọc regex để:
1. Loại bỏ các ký tự markdown thừa.
2. Ép kiểu và parse sang JSON object.
3. Trong trường hợp AI trả về văn bản hỏng không thể parse, hệ thống tự động sinh một cấu trúc dữ liệu fallback để giao diện người dùng không bị crash, đảm bảo tính ổn định tối đa cho website.
