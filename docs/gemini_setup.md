# Hướng Dẫn Lấy Key & Cấu Hình Gemini (docs/gemini_setup.md)

Tài liệu này hướng dẫn bạn cách lấy thông tin xác thực cần thiết từ Google Gemini để cấu hình cho ứng dụng MasterToeic S&W.

---

## 1. Phương Án 1: Lấy Cookie Cho `gemini-web2api` (Dành cho bản Web miễn phí)

Nếu bạn đang chạy proxy `gemini-web2api` cục bộ hoặc trên server riêng để chuyển đổi giao diện web của Gemini thành API, bạn cần lấy cookie từ trình duyệt của mình để xác thực.

### Các bước thực hiện:
1. Mở trình duyệt Chrome hoặc Edge, truy cập trang web [gemini.google.com](https://gemini.google.com) và đăng nhập bằng tài khoản Google của bạn.
2. Nhấn phím **F12** (hoặc click chuột phải chọn **Inspect/Kiểm tra**) để mở Developer Tools.
3. Chuyển sang tab **Application** (đối với Chrome) hoặc **Storage** (đối với Safari/Firefox).
4. Tại cột danh mục bên trái, tìm phần **Cookies** và nhấp chọn dòng `https://gemini.google.com`.
5. Tìm và copy giá trị của các cookie sau:
   * **`SID`**
   * **`HSID`**
   * **`SSID`**
   * **`APISID`**
   * **`SAPISID`**
   * **`__Secure-1PSID`**
6. Tạo một tệp tin tên là `cookie.txt` cùng thư mục với script `gemini_web2api.py` và dán các cookie theo định dạng sau:
   ```text
   SID=giá_trị_sid; HSID=giá_trị_hsid; SSID=giá_trị_ssid; APISID=giá_trị_apisid; SAPISID=giá_trị_sapisid; __Secure-1PSID=giá_trị_1psid
   ```
7. Chạy server proxy với lệnh:
   ```bash
   python gemini_web2api.py --cookie-file cookie.txt
   ```
   * *Lưu ý:* Việc dùng cookie là bắt buộc đối với model nâng cao như `gemini-3.1-pro` để tránh việc hệ thống tự động định tuyến (fallback) về phiên bản Flash miễn phí.

---

## 2. Phương Án 2: Lấy API Key Từ Google AI Studio (Dành cho API chính thức)

Nếu bạn muốn kết nối trực tiếp với API chính thức của Google mà không cần chạy proxy web2api (bản này ổn định hơn nhưng có thể tính phí khi vượt quá hạn mức miễn phí):

### Các bước thực hiện:
1. Truy cập vào trang web [Google AI Studio](https://aistudio.google.com/).
2. Đăng nhập bằng tài khoản Google của bạn.
3. Nhấp vào nút **Get API Key** ở góc trên bên trái màn hình.
4. Chọn **Create API Key** ➔ chọn dự án Google Cloud có sẵn hoặc tạo một dự án mới.
5. Copy chuỗi API Key được sinh ra (chuỗi ký tự bắt đầu bằng `AIzaSy...`).
6. Dán key này trực tiếp vào:
   * Mục **Gemini API Key** trong phần **Cấu hình** trên website MasterToeic S&W.
   * Hoặc lưu trữ trực tiếp vào tệp tin `.env.local` ở server qua biến `GEMINI_API_KEY`.
