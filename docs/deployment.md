# Hướng Dẫn Triển Khai Lên Vercel (docs/deployment.md)

Dự án MasterToeic S&W được tối ưu hóa hoàn toàn cho kiến trúc **Serverless** của **Vercel** giúp bạn deploy trực tuyến miễn phí và nhanh chóng.

---

## 1. Các Bước Deploy Lên Vercel (Free)

### Bước 1: Đẩy mã nguồn lên GitHub
1. Khởi tạo repository Git trong thư mục dự án của bạn (nếu chưa có):
   ```bash
   git init
   git add .
   git commit -m "Initial commit of MasterToeic"
   ```
2. Tạo một repository mới trên GitHub (chế độ Private hoặc Public).
3. Liên kết Git local với GitHub và đẩy code lên:
   ```bash
   git remote add origin https://github.com/username/master-toeic.git
   git branch -M main
   git push -u origin main
   ```

### Bước 2: Liên kết với Vercel
1. Truy cập vào [Vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub của bạn.
2. Nhấn nút **Add New** ➔ chọn **Project**.
3. Tìm repository `master-toeic` trong danh sách của bạn và nhấn **Import**.

### Bước 3: Cấu hình biến môi trường trên Vercel
Trong phần **Environment Variables** khi setup dự án trên Vercel, hãy thêm các biến sau:

* **`GEMINI_API_KEY`**: API Key của Gemini dùng để chấm bài ở API Route. (Bạn có thể bỏ trống nếu muốn admin tự nhập API Key thủ công trên trình duyệt khi ôn luyện).
* **`GEMINI_BASE_URL`**: Base URL dẫn tới proxy `gemini-web2api`. Nếu bạn deploy proxy này lên một VPS hoặc một dịch vụ cloud khác, hãy điền link URL của proxy đó tại đây.
* **`NEXT_PUBLIC_ADMIN_PASSWORD`**: Mật khẩu để bảo vệ trang `/admin` (ví dụ: `your_secret_pass`). Nếu không điền, mặc định hệ thống sẽ dùng `admin123`.

### Bước 4: Triển khai (Deploy)
Nhấn nút **Deploy**. Vercel sẽ tự động build ứng dụng Next.js của bạn và cung cấp một tên miền phụ miễn phí dạng `https://master-toeic.vercel.app`.

---

## 2. Lưu Ý Về Giới Hạn Serverless Của Vercel (Hạn chế 0đ)

Do chúng ta đang sử dụng gói Vercel Free Tier, hãy lưu ý các thông số kỹ thuật sau để đảm bảo ứng dụng chạy mượt mà:

1. **Serverless Function Timeout (10 giây):**
   * Trên gói Vercel Free, mỗi request API Route (như `/api/eval` hay `/api/generate`) chỉ được chạy tối đa **10 giây**.
   * Để tránh bị quá thời gian (timeout) khi chấm bài, hệ thống MasterToeic S&W đã được thiết kế để **gửi yêu cầu chấm điểm riêng lẻ cho từng câu hỏi một cách tuần tự**. Điều này giúp thời gian phản hồi của mỗi request chỉ mất từ 2-4 giây, hoàn toàn nằm trong giới hạn an toàn của Vercel mà không bị lỗi HTTP 504.
2. **Payload Limit (4.5MB):**
   * Giới hạn dung lượng tải lên của Vercel Serverless Function là 4.5MB.
   * Để tối ưu hóa điều này, ứng dụng **không tải trực tiếp file âm thanh ghi âm của học viên lên server**. File ghi âm được giữ lại ở client-side để học viên nghe lại, và hệ thống chỉ gửi văn bản chuyển đổi (transcription text) lên Gemini chấm điểm. Điều này giúp dung lượng request siêu nhẹ (chỉ vài KB) và không bao giờ bị quá tải.
