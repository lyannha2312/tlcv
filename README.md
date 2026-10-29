# QLCV_Merged — bản nâng cấp gộp QLCV + Kho hồ sơ

Bản làm việc riêng, tạo ngày 2026-10-29. **Không sửa** hai thư mục gốc:
- `D:\_QLCV` (QLCV React/Vite) → chép sang `frontend/`
- `D:\_QLCV\KhoHoSo_ThamMuu` (Flask) → chép sang `backend/`

Chưa chép: `node_modules`, `dist`, `venv`, `test_venv` (cài lại bằng `npm install` / tạo venv mới).

## Hướng đi (đã chốt)
- Flask là backend duy nhất; QLCV được build rồi Flask phục vụ chung một địa chỉ.
- Kho file theo **cách A**: Google Drive for Desktop ở chế độ Mirror; đường dẫn đặt trong `config.json` (`HOSO_ROOT`).
- Giữ nút "Lưu lên / Tải từ Drive" và định dạng `QLCV_Cloud_Backup.json` để bản GitHub Pages vẫn xem được hồ sơ, nhiệm vụ (không xem được file đính kèm).

## Thứ tự làm
1. `config.json` + sửa `backend/app.py` đọc đường dẫn từ đó.
2. `data.json` lưu thêm DNIS, mail, phối hợp, lịch, họp.
3. Script gộp dữ liệu: liệt kê 9 hồ sơ lệch nhau để chọn, không tự ghi đè.
4. Giao diện gộp (Flask phục vụ bản build của QLCV, thêm tab Kho hồ sơ).
5. Dọn lỗi: đường dẫn dài 253 ký tự, `folderPath` chứa `/`, 12 thư mục lẻ, danh sách Lĩnh vực lệch, Flask đang mở `0.0.0.0` không mật khẩu.

## Lưu ý
- Khi chuyển `ho-so` lên Drive thật, copy thư mục này sang Drive, đừng trỏ thẳng vào thư mục gốc cũ để thử nghiệm.
