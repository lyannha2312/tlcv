# Hồ sơ công việc

Ứng dụng chạy **local trên máy tính**, độc lập hoàn toàn với dự án "Sổ tay AI".

## 1. Cài đặt & chạy lần đầu
1. Giải nén toàn bộ thư mục `KhoHoSo_ThamMuu` ra vị trí bất kỳ trên máy (ví dụ ổ D:).
2. Bấm đúp file **`Mo_KhoHoSo.bat`**.
   - Lần đầu chạy sẽ tự tạo môi trường Python và cài thư viện (mất khoảng 30–60 giây, cần có Internet).
   - Các lần sau mở lại rất nhanh.
3. Trình duyệt sẽ tự mở `http://localhost:5001`.

## 2. Cấu trúc dữ liệu
```
KhoHoSo_ThamMuu/
├── dossiers.json                ← danh mục hồ sơ lưu trữ dạng JSON
├── static/ho-so/
│   └── 2026/                          ← năm (theo "Ngày VB đến")
│       └── <Lĩnh vực>/                 ← lĩnh vực (TRÍ TUỆ NHÂN TẠO AI, KHUNG KIẾN TRÚC, CHUYỂN ĐỔI SỐ, TRIỂN KHAI, GÓP Ý, DNIS, KHÁC...)
│           └── <Tên thư mục hồ sơ>/    ← một hồ sơ
│               ├── Văn bản chỉ đạo/    ← bỏ file văn bản chỉ đạo vào đây
│               ├── Phụ lục/            ← bỏ file phụ lục vào đây (nếu có)
│               └── Văn bản triển khai/ ← bỏ file văn bản triển khai/kết quả vào đây
└── Mo_KhoHoSo.bat
```

Hồ sơ được lưu theo **năm/lĩnh vực**: đổi "Lĩnh vực" của một hồ sơ trên giao diện web sẽ tự động di chuyển cả thư mục hồ sơ (và 3 thư mục con PDF bên trong) sang đúng vị trí mới. Hồ sơ chưa gán lĩnh vực sẽ nằm trong thư mục `CHƯA PHÂN LOẠI`.

Mỗi hồ sơ đã có sẵn 3 thư mục con ở trên — có thể chép file thẳng vào đúng thư mục con, hoặc bấm nút "+ Tải lên" ngay trên giao diện web (xem mục 3).

Đã tạo sẵn **32 khung thư mục trống** trong `static/ho-so/2026/` (và một hồ sơ năm 2025) tương ứng với 32 hồ sơ lấy từ file `Backup_QLCV_2026-08-09.json` bạn cung cấp — **tên thư mục do hệ thống tự đề xuất**, dựa theo quy tắc:

```
{Ngày VB đến}_{Số hiệu VB đến}_{mô-tả-ngắn-cách-gạch-ngang}
```

⚠️ **Cần đối chiếu lại**: đây là tên gợi ý tự động, có thể không khớp 100% với tên thư mục thật bạn đã đặt trên máy. Bạn có 2 cách xử lý:
- **Cách 1 (khuyên dùng)**: đổi tên thư mục thật trên máy cho khớp với thuộc tính "Tên thư mục hồ sơ" trong dữ liệu JSON, rồi chép PDF vào.
- **Cách 2**: mở web → bấm "Sửa" từng hồ sơ → sửa lại đúng tên thư mục thật của bạn (ứng dụng sẽ tự đổi tên thư mục theo).

## 3. Các chức năng chính
- **Giao diện chia 3 cột** (có thể thu gọn cột 1 và cột 3 bằng nút ‹ › ở viền): (1) danh sách hồ sơ (năm → lĩnh vực → hồ sơ), (2) xem trước tài liệu của văn bản đang chọn, (3) thông tin hồ sơ + timeline văn bản (Văn bản chỉ đạo → Phụ lục → Văn bản triển khai) — bấm vào 1 văn bản trong timeline để xem ở cột (2).
- **Thêm / Sửa / Xóa hồ sơ** ngay trên giao diện web (nút sửa/xóa/sao chép tên thư mục nằm ở đầu cột 3).
- **Đính kèm & xem tài liệu**: mỗi hồ sơ có 3 mục cố định — **Văn bản chỉ đạo**, **Phụ lục** (nếu có), **Văn bản triển khai**. Bấm nút "+ Tải lên" ở mục tương ứng để tải file lên thẳng đúng thư mục, hoặc bấm ✕ cạnh file để xóa. Nhận các loại file: **PDF, Word (.doc/.docx), Excel (.xls/.xlsx), PowerPoint (.ppt/.pptx), ảnh (.jpg/.jpeg/.png/.gif), văn bản (.txt/.rtf), file nén (.zip/.rar)** — riêng PDF xem trước được ngay trên web, các loại khác bấm "Mở / Tải xuống" để mở bằng ứng dụng tương ứng trên máy. File không đúng định dạng cho phép sẽ bị bỏ qua và báo cho chị biết.
- **Xuất JSON**: tải file backup dạng JSON `Backup_QLCV_YYYY-MM-DD.json` về máy.
- **Nhập JSON**: tải file JSON đã lưu lên, hệ thống tự động đối chiếu theo ID hoặc Tên thư mục hồ sơ (ghi đè hồ sơ trùng, thêm hồ sơ mới).
- **Lọc & tìm kiếm**: theo trạng thái hoặc từ khóa (cây thư mục đã tự nhóm theo lĩnh vực, mặc định lọc "Đang xử lý").

## 4. Ghi chú
- Xóa hồ sơ trên giao diện **không** xóa thư mục tài liệu trên đĩa (tránh mất dữ liệu ngoài ý muốn).
- Nếu đổi "Tên thư mục hồ sơ" khi sửa, ứng dụng tự động đổi tên thư mục tài liệu tương ứng trên đĩa.
- Xóa 1 file qua nút ✕ trên giao diện là xóa thật, **không thể hoàn tác**.
