# 🚀 Quy trình Quản lý Hình ảnh & Mô tả TOEIC S&W hàng loạt (DOCX Workflow)

Tài liệu này hướng dẫn chi tiết quy trình chuẩn hóa hình ảnh bằng ImgBB CDN, tạo tài liệu Word (.docx) chứa bảng ảnh hàng loạt để upload lên Gemini Web, và tự động đồng bộ kết quả mô tả JSON vào cơ sở dữ liệu của dự án.

---

## 📌 Khái niệm và Vai trò của các File dữ liệu

Tất cả các tệp tin quản lý hình ảnh được đặt trong các thư mục tương ứng trong `image_pipeline/` ở gốc dự án:

1. 📝 **`workspace/raw_images.txt` (File Nhập Link Gốc)**:
   * Chứa danh sách các link ảnh thô bạn tìm thấy trên mạng.
   * Dán các link ảnh thô vào đây (mỗi dòng 1 link, không ngoặc kép, không dấu phẩy).

2. 📝 **`workspace/imgbb_links.txt` (File Chứa Link CDN)**:
   * Chứa danh sách các link ảnh đã upload lên ImgBB thành công đang chờ được phân tích mô tả.

3. 📝 **`workspace/toeic_images_sheet_all.docx` (File Word chứa ảnh hàng loạt)**:
   * File Word được sinh tự động chứa bảng ảnh cùng link CDN tương ứng của hàng loạt ảnh để bạn tải lên Gemini Web.

4. 📝 **`workspace/paste_ai_here.txt` (File Dán Kết Quả AI)**:
   * Chỗ dán khối JSON (dạng mảng) phản hồi từ Gemini Web.

5. 📂 **`data/unused_images.json` (Kho ảnh sẵn sàng - Chưa sử dụng)**:
   * CSDL cục bộ lưu các ảnh đã có mô tả hoàn chỉnh để hệ thống bốc ngán vào đề thi mới.

6. 📂 **`data/used_images.json` (Kho ảnh đã sử dụng)**:
   * Lưu lịch sử những ảnh đã được gán vào đề thi để đảm bảo không bị trùng lặp.

---

## 💡 Triết lý thiết kế Mô tả phổ rộng (Broad-to-Specific)

Trong phần thi **TOEIC Speaking Part 2 (Describe a picture)**, hệ thống chấm điểm tự động đối chiếu từ khóa và cấu trúc ngữ nghĩa bài làm của học sinh với đáp án chuẩn. 
- Học sinh A có thể tập trung mô tả **Người A** ở bên trái.
- Học sinh B có thể tập trung mô tả **Người B** ở bên phải.
- Học sinh C có thể chọn mô tả **Bối cảnh chung** trước.
👉 **Cả 3 cách đều đúng.** 

Do đó, mô tả của AI cần phải bao quát từ tổng quát đến chi tiết hành động của **tất cả mọi người/đồ vật chính** trong ảnh. Điều này giúp nâng cao độ chính xác khi đối khớp từ khóa để chấm điểm.

---

## 🛠️ Hướng dẫn các bước thực hiện chi tiết

### Bước 1: Thu thập Link ảnh gốc
1. Tìm kiếm và thu thập các link ảnh phù hợp với đề thi TOEIC S&W.
2. Mở file [raw_images.txt](file:///d:/Workspace/MasterToeic/image_pipeline/workspace/raw_images.txt) và dán các link ảnh thô vào đây (mỗi dòng 1 link).

### Bước 2: Upload tự động lên ImgBB CDN
1. Đảm bảo cấu hình khóa ImgBB API Key trong file `.env.local` ở thư mục gốc:
   ```env
   IMGBB_API_KEY=e57c65409864adacabdc4f78c5fae253
   ```
2. Chạy lệnh upload hình ảnh:
   ```bash
   node image_pipeline/scripts/pipeline_cli.js upload
   ```
   * **Kết quả**: Script tải ảnh gốc về, đẩy lên ImgBB lấy link CDN vĩnh viễn, nối các link này vào file [imgbb_links.txt](file:///d:/Workspace/MasterToeic/image_pipeline/workspace/imgbb_links.txt) và tự động làm sạch file [raw_images.txt](file:///d:/Workspace/MasterToeic/image_pipeline/workspace/raw_images.txt).

### Bước 3: Tạo File Word chứa ảnh hàng loạt (.docx)
1. Chạy lệnh sinh file Word:
   ```bash
   node image_pipeline/scripts/pipeline_cli.js docx
   ```
   * **Kết quả**: Hệ thống sẽ tải tất cả các ảnh từ [imgbb_links.txt](file:///d:/Workspace/MasterToeic/image_pipeline/workspace/imgbb_links.txt) về và đóng gói thành file Word [toeic_images_sheet_all.docx](file:///d:/Workspace/MasterToeic/image_pipeline/workspace/toeic_images_sheet_all.docx) tại thư mục `workspace/`.

### Bước 4: Tải lên Gemini Web và Lấy kết quả mô tả
1. Truy cập Gemini Web (hoặc Google AI Studio Chat).
2. Tải file Word [toeic_images_sheet_all.docx](file:///d:/Workspace/MasterToeic/image_pipeline/workspace/toeic_images_sheet_all.docx) vừa tạo lên khung chat.
3. Mở file [toeic_image_analysis_prompt.txt](file:///d:/Workspace/MasterToeic/image_pipeline/prompts/toeic_image_analysis_prompt.txt), copy toàn bộ nội dung prompt và gửi cho Gemini Web cùng với file Word.
4. Chờ Gemini phản hồi và copy toàn bộ khối JSON mảng mà nó trả về.

### Bước 5: Đồng bộ dữ liệu vào Kho ảnh dự án
1. Mở file [paste_ai_here.txt](file:///d:/Workspace/MasterToeic/image_pipeline/workspace/paste_ai_here.txt) và dán nội dung JSON đã copy vào đó.
2. Chạy lệnh đồng bộ dữ liệu:
   ```bash
   node image_pipeline/scripts/pipeline_cli.js parse
   ```
   * **Kết quả**: Script sẽ trích xuất khối JSON từ file dán, thêm mới các hình ảnh vào file CSDL [unused_images.json](file:///d:/Workspace/MasterToeic/image_pipeline/data/unused_images.json) (không trùng lặp), tự động xóa các link tương ứng khỏi [imgbb_links.txt](file:///d:/Workspace/MasterToeic/image_pipeline/workspace/imgbb_links.txt) và dọn sạch file [paste_ai_here.txt](file:///d:/Workspace/MasterToeic/image_pipeline/workspace/paste_ai_here.txt) để sẵn sàng cho lần tiếp theo.

---

## ⚡ Các lệnh chạy nhanh (Run từ gốc dự án):
* **Upload ảnh thô**: `node image_pipeline/scripts/pipeline_cli.js upload`
* **Tạo file DOCX hàng loạt**: `node image_pipeline/scripts/pipeline_cli.js docx`
* **Đồng bộ kết quả mô tả**: `node image_pipeline/scripts/pipeline_cli.js parse`

---

## 📁 Các tệp tin liên quan trong dự án
* **Thư mục chứa script**: [scripts/](file:///d:/Workspace/MasterToeic/image_pipeline/scripts)
* **Thư mục chứa prompts**: [prompts/](file:///d:/Workspace/MasterToeic/image_pipeline/prompts)
* **Thư mục làm việc (txt/docx)**: [workspace/](file:///d:/Workspace/MasterToeic/image_pipeline/workspace)
* **Thư mục dữ liệu (json)**: [data/](file:///d:/Workspace/MasterToeic/image_pipeline/data)
* **Tài liệu hướng dẫn này**: [IMAGE_WORKFLOW.md](file:///d:/Workspace/MasterToeic/image_pipeline/IMAGE_WORKFLOW.md)
