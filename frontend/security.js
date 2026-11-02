// Mật khẩu xác nhận cho các thao tác nhạy cảm (Lưu lên Drive, Sao lưu, Phục hồi, Import hồ sơ từ file, Xóa hồ sơ).
// KHÔNG ghi mật khẩu vào mã nguồn (repo công khai). Đặt VITE_APP_PASSWORD trong frontend/.env.local
// (file này không được commit; xem .env.example) rồi build lại giao diện.
export const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || '';
