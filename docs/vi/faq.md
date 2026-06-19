# Các Câu Hỏi Thường Gặp (docs/faq.md)

Tổng hợp các câu trả lời cho những câu hỏi thường gặp của học viên và các nhà phát triển khi tham gia vận hành dự án **MASTER TOEIC**.

---

## 💡 HỌC VIÊN & NGƯỜI SỬ DỤNG (User FAQs)

### Q1: Tại sao MASTER TOEIC lại hoàn toàn miễn phí và không cần API Key?
* **Trả lời:** Các ứng dụng AI thông thường yêu cầu bạn nhập API Key hoặc trả phí duy trì máy chủ proxy. MASTER TOEIC sử dụng cơ chế **Tự chấm điểm (Self-Grading Workflow)**: Bạn tải bài làm (.json + .wav) về máy cục bộ, sau đó gửi lên giao diện Google Gemini Web (hoặc ChatGPT) để nhờ chấm và nhận lại mã JSON nhận xét. Nhờ vậy, ứng dụng hoạt động 100% độc lập, không phát sinh chi phí API Key và an toàn bảo mật dữ liệu.

### Q2: Tại sao tệp tin âm thanh Speaking tải về lại được gộp thành 1 tệp duy nhất?
* **Trả lời:** Một bài thi Speaking có 11 câu hỏi ghi âm. Nếu tải xuống riêng lẻ từng câu, học viên sẽ phải đính kèm 11 file ghi âm lên Gemini Web rất phiền phức. Hệ thống đã tích hợp thuật toán trộn âm để ghép nối tất cả 11 câu ghi âm đó kèm theo giọng đọc chỉ dẫn của AI (ví dụ: *"Part 1, Question 1"*) thành **1 tệp WAV duy nhất** giúp bạn tải lên Gemini Web cực kỳ tiện lợi và nhanh chóng.

### Q3: Tôi có thể làm thi thử mà không cần đăng nhập tài khoản không?
* **Trả lời:** **Hoàn toàn được.** Nếu chọn chế độ Khách (Guest Mode):
  * Dữ liệu làm bài được lưu tự động trên LocalStorage của trình duyệt.
  * Các file âm thanh Speaking được lưu dưới dạng cache tạm (Object URLs).
  * Lịch sử thi sẽ bị mất nếu bạn xóa dữ liệu trang web hoặc chuyển sang trình duyệt khác. Đăng nhập qua Supabase giúp đồng bộ dữ liệu và file âm thanh ổn định lâu dài.

---

## 🛠️ NHÀ PHÁT TRIỂN & QUẢN TRỊ VIÊN (Developer FAQs)

### Q1: Làm thế nào để thêm đề thi thử mới vào cơ sở dữ liệu?
* **Trả lời:** Bạn truy cập vào trang Admin `/admin` (tài khoản đăng nhập phải được cấp role `admin` trong bảng metadata người dùng của Supabase). Tại đây bạn có thể:
  1. Sử dụng tính năng **Tạo đề bằng AI** để biên soạn đề tự động bằng prompt.
  2. Tải đề mẫu JSON về, tự chỉnh sửa thủ công và dán nạp đề trực tiếp trên form Quản lý đề thi.

### Q2: Tại sao một số hình ảnh của đề thi bị báo lỗi link hỏng hoặc thiếu ảnh?
* **Trả lời:**
  * **Thiếu ảnh:** Do đề thi TOEIC Speaking Part 2 và Writing Part 1 bắt buộc phải có hình ảnh miêu tả tranh, nếu đề được tạo bằng AI mà chưa được gán link ảnh thì hệ thống sẽ hiển thị trạng thái thiếu ảnh. Bạn chỉ cần nhấn **"Cập nhật đề thiếu ảnh"** ở dashboard admin để lấy ảnh từ kho ảnh dự phòng gán tự động.
  * **Lỗi ảnh:** Hệ thống quản trị của chúng tôi chạy cơ chế tải song song trên client để xác minh link ảnh. Nếu ảnh thực sự không thể hiển thị được do liên kết die, hệ thống sẽ báo đỏ để admin kịp thời sửa đổi.

### Q3: Dung lượng lưu trữ file âm thanh Speaking của học viên trên Cloud có bị quá tải không?
* **Trả lời:** Không. Dự án cấu hình cơ chế tự động dọn dẹp bằng extension **`pg_cron`** tích hợp trong cơ sở dữ liệu Supabase PostgreSQL. Mỗi đêm, một tác vụ tự động sẽ chạy để xóa vĩnh viễn toàn bộ các bản ghi âm thanh đã được tạo từ quá 7 ngày trước. Điều này đảm bảo dung lượng lưu trữ Supabase Storage của bạn luôn nằm trong hạn mức gói Free trọn đời.
