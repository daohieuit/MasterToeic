# Hướng Dẫn Đóng Góp Ý Kiến & Phát Triển (CONTRIBUTING.md)

Chào mừng bạn đã đến với dự án **MASTER TOEIC**! Chúng tôi vô cùng trân quý và hoan nghênh mọi sự đóng góp của bạn để phát triển ứng dụng này tốt hơn.

Dưới đây là một số hướng dẫn chi tiết giúp bạn bắt đầu đóng góp cho dự án.

---

## 🚀 Thiết Lập Môi Trường Phát Triển Cục Bộ

1. **Fork & Clone repository:**
   * Hãy Fork dự án này về tài khoản GitHub của bạn.
   * Sao chép dự án về máy cục bộ:
     ```bash
     git clone https://github.com/your-username/MasterToeic.git
     cd MasterToeic
     ```

2. **Cài đặt dependencies:**
   * Đảm bảo bạn đang sử dụng Node.js v18 trở lên.
   * Cài đặt các thư viện phụ thuộc:
     ```bash
     npm install
     ```

3. **Cấu hình môi trường:**
   * Tạo tệp tin `.env.local` từ tệp tin mẫu `.env.example`:
     ```bash
     cp .env.example .env.local
     ```
   * Điền thông tin kết nối Supabase của bạn (nếu có sử dụng tính năng Cloud Sync).

4. **Khởi chạy ứng dụng phát triển:**
   * Chạy server phát triển cục bộ:
     ```bash
     npm run dev
     ```
   * Truy cập ứng dụng tại [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Quy Trình Gửi Đóng Góp (Pull Request)

1. **Tạo nhánh (branch) mới:**
   * Luôn tạo nhánh mới từ nhánh phát triển chính trước khi thực hiện chỉnh sửa:
     ```bash
     git checkout -b feature/ten-tinh-nang
     # hoặc
     git checkout -b fix/ten-loi
     ```

2. **Quy chuẩn mã nguồn (Coding Standard):**
   * Hãy giữ mã nguồn sạch sẽ, không lạm dụng các thư viện cồng kềnh.
   * Đảm bảo không sử dụng màu sắc thuộc nhóm màu tím (`Purple Ban`) để tuân thủ thiết kế chủ đạo (phối màu Vàng Gold Antique / Đen / Trắng Alabaster).
   * Định dạng mã nguồn và kiểm tra lỗi kiểu dữ liệu:
     ```bash
     npx tsc --noEmit
     ```

3. **Thực hiện commit:**
   * Viết thông điệp commit (commit message) rõ ràng và súc tích theo chuẩn Conventional Commits:
     * `feat: thêm chức năng A`
     * `fix: sửa lỗi B`
     * `docs: cập nhật tài liệu C`
     ```bash
     git commit -m "feat(audio): thêm tuỳ chọn lọc tiếng ồn ghi âm"
     ```

4. **Gửi Pull Request (PR):**
   * Đẩy nhánh của bạn lên fork:
     ```bash
     git push origin feature/ten-tinh-nang
     ```
   * Mở Pull Request hướng về nhánh chính của dự án gốc. Mô tả chi tiết các thay đổi của bạn trong phần mô tả PR.

---

## 🐛 Báo Cáo Lỗi (Reporting Issues)

Nếu bạn phát hiện lỗi hoặc muốn đề xuất tính năng mới, hãy tạo một **Issue** trên GitHub và cung cấp các thông tin sau:
* Mô tả ngắn gọn về lỗi.
* Các bước để tái hiện lỗi.
* Ảnh chụp màn hình hoặc log console (nếu có).
* Môi trường thử nghiệm (Hệ điều hành, Trình duyệt).

Cảm ơn bạn đã đồng hành cùng MASTER TOEIC để nâng cao kỹ năng Nói & Viết cho cộng đồng!
