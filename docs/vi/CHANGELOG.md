# Nhật Ký Thay Đổi (CHANGELOG.md)

Tất cả các thay đổi đáng chú ý đối với dự án **MASTER TOEIC** sẽ được ghi lại chi tiết trong tệp tin này.

Định dạng của nhật ký thay đổi này bám sát theo chuẩn [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và tuân thủ nguyên tắc định vị phiên bản [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-06-20

### 🚀 Thay Đổi (Changed)
* **Kho Ảnh Lưu Trữ Trong CSDL:** Di chuyển kho ảnh TOEIC Speaking & Writing từ lưu trữ file JSON cục bộ (`unused_images.json`/`used_images.json`) sang bảng cơ sở dữ liệu `toeic_images` trên Supabase có cấu hình Row-Level Security (RLS).
* **Đồng bộ API & CLI:** Cập nhật API route của Admin (`/api/admin/pipeline`) và CLI Script (`pipeline_cli.js`) để đọc/ghi dữ liệu ảnh trực tiếp với cơ sở dữ liệu.
* **Đồng bộ Dữ liệu & Dọn dẹp:** Chạy script chuyển đổi 124 hình ảnh cũ sang database thành công và làm sạch các file JSON cục bộ.
* **Tài liệu Quy trình:** Cập nhật tài liệu quy trình hình ảnh (`IMAGE_WORKFLOW.md`) để bám sát mô hình kiến trúc lưu trữ database mới.

## [1.0.0] - 2026-06-19

### 🎉 Đã Thêm (Added)
* **Zen Exam Room:** Giao diện tập trung tối giản bám sát format thi thực tế TOEIC S&W.
* **Tự Chấm Điểm AI:** Hỗ trợ quy trình đóng gói dữ liệu JSON bài thi + ghép nối âm thanh Speaking thành 1 file WAV duy nhất có chèn chỉ dẫn để nộp chấm điểm miễn phí trên Gemini Web.
* **Audio Visualizer & Control:** Tích hợp sóng âm Canvas động thời gian thực và tuỳ chỉnh tốc độ phát âm thanh ghi âm.
* **Cloud Sync & Local-First:** Cơ chế đồng bộ dữ liệu thông minh giữa cơ sở dữ liệu đám mây Supabase (Auth, RLS, Storage + pg_cron tự động xóa file ghi âm sau 7 ngày) và LocalStorage của trình duyệt.
* **Quản trị Đề thi:** Giao diện quản lý Admin cao cấp hỗ trợ tạo đề bằng prompt AI, chỉnh sửa dữ liệu thủ công, nạp JSON Gemini trực tiếp và kho ảnh dùng chung.
* **Nút bấm Tiến trình:** Nút bấm tác vụ quản trị (Kiểm tra ảnh lỗi, Cập nhật đề thiếu ảnh) có tích hợp thanh tiến trình background sweep trực quan ngay bên trong nút.
* **Thanh hiển thị Phiên bản:** Thêm nhãn thông tin phiên bản hoạt động ở chân Drawer Cài đặt.
* **Tài liệu Dự án:** Bổ sung các hướng dẫn kỹ thuật chuyên nghiệp bao gồm đặc tả kiến trúc (`architecture.md`), thiết kế (`DESIGN.md`), PRD (`PRD.md`), cấu trúc TOEIC (`toeic_format.md`) và triển khai deploy (`deployment.md`).

### 🛠️ Đã Sửa (Fixed)
* **Client-Side Image Validation:** Chuyển hoàn toàn cơ chế kiểm tra ảnh hỏng sang client-side, khắc phục triệt để lỗi CDN chặn request HEAD từ server-side gây báo lỗi giả.
* **Đồng bộ UI/UX:** Cập nhật khoảng cách tiêu đề phông chữ Space Grotesk, bo góc modal cảnh báo và dọn dẹp các thư mục rỗng trong dự án.
