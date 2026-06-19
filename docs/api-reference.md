# Đặc Tả API Hệ Thống (docs/api-reference.md)

Dự án **Master Toeic** cung cấp một số API nội bộ phục vụ cho quá trình đồng bộ lịch sử làm bài, chuyển văn bản thành giọng đọc (TTS) và pipeline quản lý hình ảnh trong trang quản trị Admin.

---

## 🎧 1. API TTS (Text-to-Speech Proxy)
Proxy cục bộ để sinh giọng đọc chỉ thị của AI phục vụ cho bài thi Speaking.

*   **Endpoint:** `/api/tts`
*   **Phương thức:** `GET`
*   **Tham số truy vấn (Query Params):**
    *   `text` (string, Bắt buộc): Nội dung văn bản tiếng Anh cần chuyển đổi sang giọng nói.
*   **Phản hồi (Response):**
    *   **Thành công (200 OK):** Trả về file âm thanh nhị phân định dạng `audio/mpeg` (Google Translate TTS API).
    *   **Thất bại (400 / 500):** Trả về đối tượng lỗi JSON:
        ```json
        { "error": "Text parameter is required" }
        ```

---

## 📈 2. API Lịch Sử Làm Bài (Practice History)
Đồng bộ kết quả và nhật ký làm bài của học viên đã đăng nhập lên đám mây.

### 2.1. Lấy danh sách lịch sử thi thử
*   **Endpoint:** `/api/history`
*   **Phương thức:** `GET`
*   **Tham số truy vấn (Query Params):**
    *   `userId` (string, Bắt buộc): UUID của người dùng trong hệ thống Supabase Auth.
*   **Phản hồi (Response):**
    *   **Thành công (200 OK):** Mảng chứa danh sách các lượt thi thử xếp từ mới nhất đến cũ nhất.

### 2.2. Lưu lượt thi thử mới
*   **Endpoint:** `/api/history`
*   **Phương thức:** `POST`
*   **Tiêu đề (Headers):** `Content-Type: application/json`
*   **Tham số thân (Request Body JSON):**
    ```json
    {
      "userId": "uuid-nguoi-dung-auth",
      "attempt": {
        "testId": "test-id-1",
        "testTitle": "TOEIC SW Actual Test 01",
        "mode": "full",
        "partName": null,
        "speakingScore": 120,
        "writingScore": 140,
        "reviews": [
          {
            "questionId": "sp_q_1",
            "section": "speaking",
            "score": 80,
            "feedback": "Phát âm rõ ràng...",
            "audioUrl": "https://[ref].supabase.co/storage/v1/object/public/user_audio/..."
          }
        ]
      }
    }
    ```
*   **Phản hồi (Response):**
    *   **Thành công (200 OK):** Trả về đối tượng dữ liệu đã lưu trong bảng `practice_history` của Supabase.

---

## ⚙️ 3. API Quản Trị Pipeline (Admin Image Pipeline)
Mục này liệt kê các API nội bộ hỗ trợ quản trị và đồng bộ kho ảnh. Tất cả các endpoint này yêu cầu quyền quản trị viên Admin (kiểm tra JWT thông qua Header `Authorization`).

*   **Endpoint:** `/api/admin/pipeline`
*   **Tiêu đề (Headers):**
    *   `Authorization: Bearer <JWT_TOKEN>` (Bắt buộc)
    *   `Content-Type: application/json`

### 3.1. Upload ảnh hàng loạt lên ImgBB
*   **Yêu cầu (POST Body):**
    ```json
    {
      "action": "upload_imgbb",
      "urls": [
        "https://domain.com/photo1.jpg",
        "https://domain.com/photo2.png"
      ]
    }
    ```
*   **Phản hồi (Response):**
    *   Trả về danh sách kết quả upload lên ImgBB, tự động bỏ qua nếu ảnh gốc đã nằm sẵn trên máy chủ ImgBB.

### 3.2. Đóng gói tài liệu Word (.docx) chứa tranh thi
Dùng để tải tài liệu Word chứa bảng tranh TOEIC gửi kèm prompt lên Gemini Web.
*   **Yêu cầu (POST Body):**
    ```json
    {
      "action": "create_docx",
      "urls": [
        "https://i.ibb.co/xxxxx/photo1.jpg",
        "https://i.ibb.co/yyyyy/photo2.png"
      ]
    }
    ```
*   **Phản hồi (Response):** Trả về file nhị phân kiểu `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (tự động tải xuống dạng `.docx`).

### 3.3. Nhập dữ liệu mô tả JSON từ Gemini Web vào Kho ảnh
*   **Yêu cầu (POST Body):**
    ```json
    {
      "action": "import_gemini_descriptions",
      "descriptions": [
        {
          "url": "https://i.ibb.co/xxxxx/photo1.jpg",
          "description": "Two people working in an office...",
          "words": ["workspace", "discuss"]
        }
      ]
    }
    ```
*   **Phản hồi (Response):** Số lượng ảnh đã nạp thành công, số lượng trùng lặp bị bỏ qua và tổng số lượng ảnh khả dụng còn dư trong kho.

### 3.4. Tự động gán ảnh cho đề thi thiếu hình
*   **Yêu cầu (POST Body):**
    ```json
    {
      "action": "auto_fill_missing",
      "brokenUrls": ["https://i.ibb.co/xxxxx/deadphoto.jpg"]
    }
    ```
*   **Phản hồi (Response):** Số lượng đề thi đã được tự động cập nhật, danh sách tiêu đề đề thi được cập nhật và số lượng ảnh còn lại trong kho.
