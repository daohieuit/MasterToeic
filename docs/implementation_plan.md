# Kế hoạch Sắp xếp và Tải cấu trúc Thư mục Dự án

Kế hoạch này đề xuất các thay đổi để dọn dẹp các thư mục trống không sử dụng, gom nhóm các tài liệu cơ sở dữ liệu và scripts vào cấu trúc thư mục `supabase/` chuẩn hóa, giúp cấu trúc dự án trở nên chuyên nghiệp, rõ ràng và dễ quản lý hơn.

---

## User Review Required

> [!IMPORTANT]
> - **Cấu trúc Supabase chuẩn hóa:** Chúng ta sẽ tạo một thư mục gốc `supabase/` để chứa các file SQL setup và migration, thay vì để lẫn lộn trong thư mục `docs/` hay thư mục `archive/` riêng lẻ. Điều này đồng nhất với các dự án sử dụng Supabase trên thực tế.
> - **An toàn xây dựng (Build Safety):** Các thay đổi này chỉ di chuyển các tệp tĩnh, tài liệu SQL và xóa thư mục trống, hoàn toàn không ảnh hưởng đến logic runtime của Next.js hay các import path trong phần code nguồn `src/`.

---

## Open Questions

> [!NOTE]
> 1. **Về các tệp tin trong `public/`:** Các tệp tin như `toeic_prompt_template.txt`, `toeic_speaking_prompt_template.txt`, `toeic_writing_prompt_template.txt` hiện đang được gọi trực tiếp bằng đường dẫn tĩnh từ `/admin` để người dùng tải/sao chép. Chúng bắt buộc phải nằm ở thư mục `public/` và tôi đề xuất giữ nguyên vị trí của chúng. Bạn có đồng ý không?
> 2. **Về thư mục `image_pipeline/`:** Đây là một công cụ xử lý ảnh đang hoạt động và được tích hợp với API route `/api/admin/pipeline` để tải ảnh lên ImgBB và tạo file Word. Thư mục này rất gọn gàng và cần được giữ nguyên ở thư mục gốc.

---

## Proposed Changes

### Component: Database & Project Reorganization

Tạo thư mục `supabase/` mới và gom các tệp tin liên quan đến database/migrations vào đây.

#### [NEW] [20260613000000_init_schema.sql](file:///d:/Workspace/MasterToeic/supabase/migrations/20260613000000_init_schema.sql)
Di chuyển và đổi tên từ `docs/database.sql` thành file migration SQL chuẩn hóa.

#### [NEW] [20260618000000_setup_storage.sql](file:///d:/Workspace/MasterToeic/supabase/migrations/20260618000000_setup_storage.sql)
Di chuyển và đổi tên từ `docs/setup_storage.sql` thành file migration SQL chuẩn hóa.

#### [NEW] [db_updates.json](file:///d:/Workspace/MasterToeic/supabase/archive/db_updates.json)
Di chuyển từ `archive/db_updates.json` sang thư mục con lưu trữ dưới `supabase/`.

#### [NEW] [migrate_tests.ts](file:///d:/Workspace/MasterToeic/supabase/archive/migrate_tests.ts)
Di chuyển từ `archive/migrate_tests.ts` sang `supabase/archive/` và cập nhật đường dẫn đọc `docs/example_test.json` cho chính xác.

#### [DELETE] [database.sql](file:///d:/Workspace/MasterToeic/docs/database.sql)
Loại bỏ file cũ sau khi đã di chuyển sang thư mục `supabase/migrations/`.

#### [DELETE] [setup_storage.sql](file:///d:/Workspace/MasterToeic/docs/setup_storage.sql)
Loại bỏ file cũ sau khi đã di chuyển sang thư mục `supabase/migrations/`.

#### [DELETE] [db_updates.json](file:///d:/Workspace/MasterToeic/archive/db_updates.json)
Loại bỏ file cũ ở thư mục gốc `archive/`.

#### [DELETE] [migrate_tests.ts](file:///d:/Workspace/MasterToeic/archive/migrate_tests.ts)
Loại bỏ file cũ ở thư mục gốc `archive/`.

---

### Component: Cleanup Unused Directories

Xóa bỏ các thư mục rỗng và không còn được sử dụng trong dự án.

#### [DELETE] [tests/](file:///d:/Workspace/MasterToeic/src/data/tests)
Thư mục rỗng (không còn chứa dữ liệu đề thi tĩnh vì đã chuyển sang Supabase và LocalStorage).

#### [DELETE] [data/](file:///d:/Workspace/MasterToeic/src/data)
Thư mục cha chứa `tests/`, hiện tại hoàn toàn rỗng.

#### [DELETE] [process-images/](file:///d:/Workspace/MasterToeic/src/app/api/admin/process-images)
Thư mục API rỗng, không được sử dụng ở bất kỳ đâu trong codebase.

---

### Component: Documentation Link Updates

Cập nhật các đường dẫn tài liệu tham chiếu tới các file SQL đã di chuyển.

#### [MODIFY] [README.md](file:///d:/Workspace/MasterToeic/README.md)
Cập nhật link tải/xem mã lệnh SQL của Database và Storage hướng tới thư mục `supabase/migrations/`.

#### [MODIFY] [architecture.md](file:///d:/Workspace/MasterToeic/docs/architecture.md)
Cập nhật các liên kết hoặc mô tả liên quan tới file SQL đã di chuyển.

---

## Verification Plan

### Automated Tests
- Kiểm tra biên dịch TypeScript để đảm bảo không phát sinh bất kỳ lỗi đường dẫn import nào:
  ```powershell
  npx tsc --noEmit
  ```
- Kiểm tra tính đúng đắn của dự án qua script checklist kiểm định:
  ```powershell
  python .agents/scripts/checklist.py .
  ```

### Manual Verification
- Kiểm tra thư mục dự án sau khi dọn dẹp trực tiếp trong cây thư mục để đảm bảo mọi thư mục trống đã được xóa sạch sẽ.
- Chạy thử `npm run build` để kiểm tra toàn diện khả năng build của ứng dụng Next.js.
