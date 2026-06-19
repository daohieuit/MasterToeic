# Hướng Dẫn Bắt Đầu Phát Triển (docs/getting-started.md)

Chào mừng bạn đã đến với dự án **MASTER TOEIC**! Hướng dẫn này sẽ giúp bạn thiết lập dự án cục bộ từ đầu, kết nối cơ sở dữ liệu Supabase và triển khai lên môi trường production.

---

## 📋 Yêu cầu Hệ thống (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:
* **Node.js** (Phiên bản 18.x hoặc mới hơn).
* **Git** (Dùng để kiểm soát mã nguồn).
* Một tài khoản **Supabase** (Miễn phí) để lưu trữ kết quả và tệp tin ghi âm.

---

## 🛠️ Thiết Lập Môi Trường Cục Bộ (Local Setup)

### Bước 1: Nhân bản mã nguồn (Clone Repository)
Mở terminal và chạy các lệnh sau:
```bash
git clone https://github.com/your-username/MasterToeic.git
cd MasterToeic
```

### Bước 2: Cài đặt thư viện phụ thuộc (Install Dependencies)
Cài đặt toàn bộ các thư viện Node.js cần thiết:
```bash
npm install
```

### Bước 3: Cấu hình biến môi trường (Environment Variables)
Sao chép tệp tin cấu hình mẫu thành cấu hình cục bộ:
```bash
cp .env.example .env.local
```
Mở tệp `.env.local` và cập nhật thông tin API của riêng bạn:
* `NEXT_PUBLIC_SUPABASE_URL`: Đường dẫn URL dự án Supabase.
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Mã khóa công khai (Anonymous Key) của Supabase.

---

## 🗄️ Thiết Lập Supabase Database & Storage

Dự án sử dụng cơ sở dữ liệu Supabase để đồng bộ kết quả làm bài của học viên. Hãy thực hiện thiết lập theo thứ tự sau:

### 1. Khởi tạo Bảng dữ liệu (Database Schema)
* Truy cập vào **SQL Editor** trong Supabase Dashboard của bạn.
* Nhấp vào **New Query** (Tạo câu lệnh SQL mới).
* Mở tệp tin [20260613000000_init_schema.sql](../../supabase/migrations/20260613000000_init_schema.sql), sao chép toàn bộ nội dung và dán vào SQL Editor, sau đó nhấn **Run**. Lệnh này sẽ tạo bảng `practice_history` và `custom_tests` cùng các chính sách bảo mật RLS cơ bản.

### 2. Cấu hình Storage (User Audio Storage)
* Mở tệp tin [20260618000000_setup_storage.sql](../../supabase/migrations/20260618000000_setup_storage.sql).
* Sao chép toàn bộ nội dung, dán vào SQL Editor của Supabase và nhấn **Run**. Lệnh này sẽ:
  * Tạo một Storage Bucket tên là `user_audio` ở chế độ Public.
  * Cấu hình chính sách bảo mật RLS chỉ cho phép học viên tải lên/xóa file âm thanh trong thư mục trùng với ID của họ (`user_audio/user_id/...`).
  * Cài đặt tự động kích hoạt tiến trình Cron Job hàng ngày bằng `pg_cron` để quét dọn và tự động xóa các file ghi âm cũ hơn 7 ngày nhằm duy trì dung lượng Cloud miễn phí trọn đời.

---

## 🏃 Chạy Ứng Dụng Cục Bộ (Running Locally)

Sau khi hoàn thành cấu hình môi trường và cơ sở dữ liệu:

```bash
npm run dev
```
* Mở trình duyệt và truy cập [http://localhost:3000](http://localhost:3000).
* Bạn có thể đăng ký tài khoản mới ngay trên giao diện web để kiểm tra luồng hoạt động Cloud Sync hoặc sử dụng chế độ Khách (Guest Mode) để dữ liệu lưu trữ trực tiếp trên LocalStorage của trình duyệt.

---

## 🚀 Triển Khai Lên Vercel (Production Deployment)

Dự án MASTER TOEIC được tối ưu hóa hoàn hảo cho kiến trúc Serverless của Vercel:

### Bước 1: Đẩy mã nguồn lên GitHub cá nhân
```bash
git init
git add .
git commit -m "Initial commit of MASTER TOEIC"
git remote add origin https://github.com/your-username/master-toeic.git
git branch -M main
git push -u origin main
```

### Bước 2: Nhập dự án vào Vercel
1. Đăng nhập [Vercel.com](https://vercel.com) bằng tài khoản GitHub của bạn.
2. Tại dashboard chính, nhấn **Add New...** ➔ chọn **Project**.
3. Tìm kiếm repository `MASTER TOEIC` vừa đẩy lên và chọn **Import**.

### Bước 3: Điền các biến cấu hình và Triển khai
1. Tại mục **Configure Project**, Vercel sẽ tự động chọn Preset là **Next.js**.
2. Mở rộng phần **Environment Variables** và điền 2 biến bắt buộc:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Nhấp vào nút **Deploy**. Quá trình build và deploy sẽ hoàn tất trong vòng 1-2 phút. Bạn sẽ có một đường dẫn trực tuyến hoạt động hoàn toàn miễn phí trọn đời!
