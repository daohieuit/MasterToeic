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
   * Để tránh giới hạn này, các tệp âm thanh ghi âm được tải lên trực tiếp từ trình duyệt đến **Supabase Storage** (đối với người dùng đăng nhập) hoặc được giữ tạm thời ở RAM client-side dưới dạng Blob URL (đối với khách). Do đó, Vercel Serverless API không phải xử lý hay truyền tải dữ liệu âm thanh thô, giúp dung lượng request lên Vercel cực nhẹ (chỉ vài KB).
3. **Bandwidth (100GB/tháng):**
   * Gói Free cho phép 100GB bandwidth/tháng. Đủ cho vài trăm học viên sử dụng hàng ngày.

---

## 6. Quy Trình Tự Chấm Điểm AI Miễn Phí (Self-Grading Workflow)

Để tối ưu hóa chi phí vận hành 0đ và đảm bảo dự án hoạt động trọn đời không lo hết hạn API Key hoặc phát sinh hóa đơn, MasterToeic S&W hỗ trợ cơ chế **Tự chấm điểm bằng Gemini Web** (hoặc bất kỳ AI nào như ChatGPT, Claude) của người dùng:

### Cách Hoạt Động:
1. **Hoàn thành bài thi:** Sau khi hoàn thành phần thi Nói/Viết, học viên nhấn nộp bài. Hệ thống sẽ ngay lập tức hiển thị giao diện kết quả với trạng thái là `Chờ chấm (Pending)`.
2. **Tải tư liệu học tập:** Học viên nhấn nút **"Tải JSON & Audio"** ở trang kết quả:
   - Hệ thống tải xuống 1 file `.json` chứa toàn bộ câu hỏi và câu trả lời dạng chữ của bạn.
   - Hệ thống tự động giải mã và ghép nối tất cả các file ghi âm nói của bạn cùng với giọng đọc dẫn đề tiếng Anh của AI (ví dụ: *"Part 1, Question 1"*, *"Question 2"*...) xen kẽ khoảng lặng 1.5s thành **1 file `.wav` duy nhất** và tải xuống.
3. **Chấm trên Gemini Web:**
   - Học viên bấm **"Copy Prompt"** trên web (nút này sao chép câu lệnh chỉ thị chấm thi chi tiết bằng tiếng Việt định dạng JSON).
   - Truy cập giao diện chat [Gemini Web](https://gemini.google.com) miễn phí.
   - Tải tệp `.json` bài làm và tệp âm thanh `.wav` lên khung chat.
   - Dán Prompt vừa copy và nhấn gửi. Gemini Web sẽ tự động phân tích âm thanh, đối chiếu đáp án mẫu và trả về một đoạn mã JSON kết quả chấm điểm.
4. **Cập nhật giao diện web:**
   - Học viên copy đoạn mã JSON kết quả từ Gemini Web.
   - Quay lại trang kết quả MasterToeic, dán vào ô nhập liệu dưới Bước 3 và bấm **"Dán / Áp dụng (Apply)"**.
   - Giao diện web sẽ lập tức cập nhật điểm số tổng hợp, biểu đồ Radar phân tích 5 kỹ năng thành phần, và các thẻ sửa lỗi ngữ pháp chi tiết cho từng câu hỏi!

> 💡 **Lợi ích:** Quy trình này giúp bạn không cần thiết lập bất kỳ API Key có phí nào trên Vercel. Mọi quá trình ghi âm, xử lý và ghép nối tệp âm thanh WAV đều diễn ra 100% trên trình duyệt của người học (Client-side) hoàn toàn miễn phí và cực kỳ bảo mật riêng tư.

---

## 7. Auto-Deploy (CI/CD)

Sau khi liên kết repo GitHub với Vercel, mỗi lần bạn `git push` lên nhánh `main`, Vercel sẽ **tự động build và deploy** phiên bản mới. Bạn không cần làm gì thêm.

```bash
# Ví dụ: cập nhật và deploy tự động
git add .
git commit -m "fix: update scoring logic"
git push origin main
# → Vercel tự động nhận và deploy trong 1-2 phút
```
