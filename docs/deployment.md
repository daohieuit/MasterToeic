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
1. Truy cập vào [Vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
2. Ở Dashboard, nhấn nút **"Add New..."** ➔ chọn **"Project"**.
3. Vercel sẽ hiển thị danh sách repository GitHub của bạn. Tìm repo `MasterToeic` và nhấn **"Import"**.
4. Ở trang **"Configure Project"**:
   - **Framework Preset**: Vercel sẽ tự động nhận diện là `Next.js` ✅
   - **Root Directory**: Để trống (mặc định là `.`)
   - **Build Command**: Để mặc định (`next build`)
   - **Output Directory**: Để mặc định

### Bước 3: Cấu hình biến môi trường (Environment Variables)

> ⚠️ **QUAN TRỌNG**: Đây là bước bắt buộc! Nếu thiếu biến Supabase, ứng dụng sẽ không thể đồng bộ dữ liệu lên Cloud.

Ở phần **"Environment Variables"** trong trang Configure Project, thêm lần lượt từng biến:

| Tên biến | Giá trị | Bắt buộc? | Mô tả |
|----------|---------|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | ✅ Có | URL dự án Supabase (lấy từ Supabase Dashboard → Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | ✅ Có | Anon/Public Key của Supabase (lấy cùng chỗ với URL) |
| `GEMINI_API_KEY` | `AIzaSy...` | ❌ Không | API Key Gemini cho server-side. Bỏ trống nếu Admin tự nhập trên trình duyệt. |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta/openai` | ❌ Không | Endpoint API. Mặc định dùng Google AI Studio Direct. |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | `your_secret_pass` | ❌ Không | Mật khẩu trang Admin. Mặc định là `admin123`. |

**Cách thêm từng biến:**
1. Ở ô **Key**, nhập tên biến (ví dụ: `NEXT_PUBLIC_SUPABASE_URL`)
2. Ở ô **Value**, paste giá trị tương ứng
3. Nhấn **"Add"** để thêm biến đó
4. Lặp lại cho các biến còn lại

### Bước 4: Triển khai (Deploy)
Nhấn nút **"Deploy"**. Vercel sẽ tự động:
1. Clone repo từ GitHub
2. Cài dependencies (`npm install`)
3. Build ứng dụng (`next build`)
4. Deploy lên CDN toàn cầu

Sau khi hoàn tất (1-2 phút), bạn sẽ nhận được URL dạng:
```
https://master-toeic.vercel.app
```

---

## 2. Lấy Supabase Keys Ở Đâu?

1. Truy cập [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn dự án của bạn
3. Vào menu **Settings** (biểu tượng bánh răng) → **API**
4. Copy 2 giá trị:
   - **Project URL** → dùng cho `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys** → mục **anon / public** → dùng cho `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. Cập Nhật Biến Môi Trường Sau Khi Deploy

Nếu bạn cần thay đổi biến môi trường sau khi đã deploy:

1. Vào [Vercel Dashboard](https://vercel.com/dashboard)
2. Chọn project **MasterToeic**
3. Nhấn tab **"Settings"** → **"Environment Variables"**
4. Thêm/Sửa/Xóa biến theo ý muốn
5. **Quan trọng**: Sau khi thay đổi, bạn cần **Redeploy** để biến mới có hiệu lực:
   - Vào tab **"Deployments"**
   - Nhấn dấu **"..."** ở deployment mới nhất
   - Chọn **"Redeploy"**

---

## 4. Cấu Hình Domain Tùy Chỉnh (Tùy chọn)

Nếu bạn có tên miền riêng:

1. Vào **Settings** → **Domains**
2. Nhập tên miền của bạn (ví dụ: `toeic.yourdomain.com`)
3. Vercel sẽ cung cấp bản ghi DNS (CNAME/A Record) để bạn trỏ domain

---

## 5. Lưu Ý Về Giới Hạn Serverless Của Vercel (Free Tier)

Do chúng ta đang sử dụng gói Vercel Free Tier, hãy lưu ý các thông số kỹ thuật sau:

1. **Serverless Function Timeout (10 giây):**
   * Trên gói Vercel Free, mỗi request API Route (như `/api/eval` hay `/api/generate`) chỉ được chạy tối đa **10 giây**.
   * Để tránh bị quá thời gian (timeout) khi chấm bài, hệ thống MasterToeic S&W đã được thiết kế để **gửi yêu cầu chấm điểm riêng lẻ cho từng câu hỏi một cách tuần tự**. Điều này giúp thời gian phản hồi của mỗi request chỉ mất từ 2-4 giây, hoàn toàn nằm trong giới hạn an toàn.
2. **Payload Limit (4.5MB):**
   * Giới hạn dung lượng tải lên của Vercel Serverless Function là 4.5MB.
   * Ứng dụng **không tải trực tiếp file âm thanh ghi âm** lên server. File ghi âm được giữ ở client-side, hệ thống chỉ gửi văn bản transcription lên Gemini chấm điểm. Dung lượng request chỉ vài KB.
3. **Bandwidth (100GB/tháng):**
   * Gói Free cho phép 100GB bandwidth/tháng. Đủ cho vài trăm học viên sử dụng hàng ngày.

---

## 6. Auto-Deploy (CI/CD)

Sau khi liên kết repo GitHub với Vercel, mỗi lần bạn `git push` lên nhánh `main`, Vercel sẽ **tự động build và deploy** phiên bản mới. Bạn không cần làm gì thêm.

```bash
# Ví dụ: cập nhật và deploy tự động
git add .
git commit -m "fix: update scoring logic"
git push origin main
# → Vercel tự động nhận và deploy trong 1-2 phút
```
