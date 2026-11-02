# Trợ lý công việc

Theo dõi công việc văn phòng theo hồ sơ và lưu trữ tài liệu của từng hồ sơ. Mỗi văn bản chỉ đạo đến là một hồ sơ; hồ sơ có nhật ký xử lý, văn bản phát sinh, kết quả và thư mục tài liệu riêng.

- Trang công khai (giao diện, dữ liệu lưu trong trình duyệt): https://lyannha2312.github.io/tlcv/
- Bản đầy đủ có quản lý file: chạy trên máy tại http://localhost:5001

**Tổng quan chức năng, cấu trúc kho tài liệu, quy ước đặt tên, kiến trúc, bảo mật và các lệnh: xem [tong-quan-du-an.md](tong-quan-du-an.md).**

## Chạy bản trên máy

1. Sao chép `backend/config.example.json` thành `backend/config.json`, đặt `HOSO_ROOT` là thư mục chứa kho tài liệu.
2. Sao chép `frontend/.env.example` thành `frontend/.env.local`, đặt `VITE_APP_PASSWORD` (mật khẩu xác nhận các thao tác nhạy cảm).
3. Build giao diện (lần đầu và mỗi khi sửa mã trong `frontend/`):
   `cd frontend`, `npm install`, `npm run build:flask`.
4. Chạy `backend\Mo_KhoHoSo.bat` rồi mở http://localhost:5001 (lần đầu tự tạo môi trường Python).

## Deploy lên GitHub Pages

Tạo `frontend/.env.pages.local` với `VITE_APP_PASSWORD` **khác** mật khẩu ở bước trên (gói Pages là JS công khai), rồi:
`cd frontend`, `npm run deploy`.

## Dữ liệu

Hồ sơ, sao lưu, cấu hình và mật khẩu chỉ nằm trên máy, được `.gitignore` loại khỏi kho mã. Không commit các file đó.
