# Tổng quan: QLCV_Merged

## 1. Dự án này là gì

Đây là công cụ cá nhân để **theo dõi công việc văn phòng**. Tên giao diện là "Trợ lý công việc".

Cách làm việc: mỗi văn bản chỉ đạo đến thì tạo một **hồ sơ**. Hồ sơ đó theo dõi mọi thứ phát sinh cho đến khi đóng. Ngoài hồ sơ còn có các sổ ghi chép riêng cho DNIS, mail công vụ, nhiệm vụ phối hợp, cuộc họp và lịch tuần.

Dự án này là **bản gộp** của hai dự án cũ:

- **QLCV**: giao diện React/Vite, trước đây lưu dữ liệu trong trình duyệt.
- **Kho hồ sơ (Flask)**: máy chủ Python quản lý thư mục và file PDF của hồ sơ.

Hai thư mục gốc `D:\_QLCV` và `KhoHoSo_ThamMuu` **không bị sửa**. Bản gộp là bản làm việc riêng (tạo ngày 29/10/2026), gồm hai phần:

- `frontend/`: giao diện React.
- `backend/`: máy chủ Flask, vừa phục vụ giao diện đã build, vừa quản lý file.

## 2. Các chức năng

### A. Bàn làm việc (hồ sơ đang xử lý)

- **Thẻ hồ sơ**: hiện các hồ sơ đang xử lý, tô màu theo chuyên mục. Có hạn xử lý, nhãn "Khẩn" cho ưu tiên cao, số văn bản gốc, thanh tiến độ task, số lần cập nhật và số Pomodoro.
- **Thứ tự sắp xếp**: ưu tiên Cao → Trung bình → Thấp, rồi hạn gần trước, rồi mới tạo trước.
- **Mở một hồ sơ** thì thấy:
  - Thông tin văn bản gốc: số ký hiệu, ngày, nơi gửi, trích yếu, nội dung chỉ đạo.
  - **Task nhỏ chống trì hoãn**: thêm, tick hoàn thành, mỗi task chạy được phiên Pomodoro (mặc định 25 phút, chỉnh được).
  - Nút xem Timeline, nút "Cập nhật nội dung xử lý", nút mở thư mục hồ sơ trên máy.
- **Pomodoro tự do**: gõ tên việc và số phút để bắt đầu, không cần gắn hồ sơ. Có màn hình tập trung toàn màn hình (vòng đếm, sáng/tối, chuông báo). Hết phiên làm việc thì tự chuyển sang nghỉ 5 phút.

### B. Tạo và sửa hồ sơ

Mỗi hồ sơ có các trường sau:

- Tên hồ sơ.
- **Chuyên mục**: CHUYỂN ĐỔI SỐ, TRIỂN KHAI, KHUNG KIẾN TRÚC, DNIS, MAIL CÔNG VỤ, GÓP Ý, TRÍ TUỆ NHÂN TẠO, ĐẢNG, KHÁC.
- Mức ưu tiên, thời gian tạo, hạn xử lý.
- Văn bản gốc: số ký hiệu, ngày ban hành, đơn vị gửi, trích yếu, nội dung chỉ đạo.
- **Tên thư mục hồ sơ**: nối hồ sơ với thư mục tài liệu thật trên đĩa.

### C. Cập nhật nội dung xử lý (ba loại)

1. **Văn bản phát sinh**: số ký hiệu, ngày, đơn vị phát hành (PV01 / CATP / ĐUCATP hoặc tự nhập), nội dung, ghi chú mục đích, đường dẫn file.
   - Phân loại: Văn bản đính kèm, Văn bản chỉ đạo mới, Phụ lục, Văn bản kết quả.
   - Chọn được một file có sẵn trong thư mục hồ sơ để gắn vào mốc này.
2. **Tiến độ thực hiện**: ngày và nội dung.
3. **Đóng hồ sơ**: ngày đóng và kết quả hoặc số văn bản báo cáo.

### D. Timeline (Nhật ký xử lý) của từng hồ sơ

- Các mốc xếp theo thời gian: Khởi tạo → các văn bản và tiến độ (xếp theo ngày ban hành) → Kết thúc. Mỗi loại một màu.
- Mỗi mốc sửa hoặc xóa được.
- Văn bản của ĐUCATP có biểu tượng cờ Đảng.
- Có ghi chú hồ sơ (soạn thảo định dạng).
- Có **Xuất JSON** (nhập lại được vào hệ thống). Không có Xuất Excel.
- Đã đóng thì sửa được kết quả, hoặc **chuyển về "Đang thực hiện"**.

### E. Tài liệu đính kèm (chỉ khi chạy qua Flask)

- Mỗi hồ sơ có các thư mục: **Văn bản chỉ đạo / Phụ lục / Văn bản triển khai / Báo cáo của các đơn vị**.
- Tải lên (nhiều file một lúc) và xóa file. Chấp nhận PDF, Word, Excel, PowerPoint, ảnh, txt/rtf, zip/rar. File trùng tên được tự đánh số `(1)`, `(2)`.
- **Khung đọc PDF bên phải** timeline: màn hình rộng thì hiện cạnh timeline, màn hình hẹp thì hiện phủ lên.
- **Tự gắn file vào mốc timeline**, theo thứ tự ưu tiên:
  1. Trùng tên file khai trong mốc.
  2. Khớp số ký hiệu văn bản (ví dụ `205/PV01` ↔ `205-PV01_...pdf`).
  3. File còn lại trong "Văn bản chỉ đạo" gắn vào mốc Khởi tạo.
  - File không khớp được vào mốc nào thì nằm ở mục "Tài liệu chưa gắn vào tiến trình".
- Mở thư mục hồ sơ bằng Explorer trên máy.

### F. Kho hồ sơ (hồ sơ đã đóng) và tra cứu

- Màn hình tra cứu có ô tìm kiếm (theo tên, số hiệu, chuyên mục, nội dung văn bản liên quan).
- Bộ lọc theo chuyên mục, trạng thái và khoảng ngày văn bản. Số đếm trên mỗi bộ lọc cập nhật theo các bộ lọc còn lại.
- Xóa hồ sơ phải nhập mật khẩu.
- **Cây hồ sơ bên trái**: nhóm theo chuyên mục, có tìm kiếm và lọc trạng thái, thu gọn được.

### G. Các sổ ghi chép khác

| Tab | Nội dung ghi |
|---|---|
| **DNIS** | Nhật ký yêu cầu của đơn vị/cơ quan: nội dung, người liên hệ, trạng thái (Chưa làm / Đang thực hiện / Hoàn thành), số và ngày văn bản đề nghị. |
| **Mail công vụ** | Yêu cầu cấp mail, khôi phục mật khẩu: tên cá nhân/tổ chức, địa chỉ mail, mật khẩu, nội dung, trạng thái. |
| **Phối hợp** | Nhiệm vụ phối hợp: ngày giao việc, văn bản, trích yếu, nội dung chỉ đạo, tiến độ chung, trạng thái. |
| **Cuộc họp** | Sổ tay họp: thời gian, địa điểm, đơn vị chủ trì, giấy mời, chuyên mục, nội dung, kết luận. |

### H. Kế hoạch tuần (Planner)

- Lịch tuần Thứ Hai → Chủ Nhật, chuyển tuần, nhảy tới ngày hoặc tháng bất kỳ.
- Thêm kế hoạch công tác: nội dung, địa điểm, ghi chú, kết quả. Có thể áp dụng cho nhiều ngày liên tiếp.
- **Tự tổng hợp hoạt động từ dữ liệu có sẵn** vào từng ngày: mở hồ sơ, cập nhật tiến độ, văn bản kết quả, đóng hồ sơ, DNIS hoàn thành, mail, phối hợp, họp. Làm báo cáo tuần không phải gõ lại.
- Bấm vào hoạt động thì mở hồ sơ ở tab mới (qua `#dossier=<id>`).

### I. Lưu trữ, đồng bộ, sao lưu

- **Chạy qua Flask** (`http://localhost:5001`): dữ liệu ghi vào `dossiers.json` và `data.json`, tự lưu sau 0,6 giây kể từ thay đổi cuối. Mỗi lần ghi tạo bản dự phòng trong `backups/`, giữ 10 bản gần nhất. Ghi qua file tạm rồi thay file để không hỏng dữ liệu giữa chừng. Server từ chối ghi danh sách hồ sơ rỗng đè lên dữ liệu đang có.
- **Chạy bằng GitHub Pages hoặc `npm run dev`**: lưu vào localStorage trình duyệt như bản cũ.
- **Lưu lên / Tải từ Google Drive**: dùng file `QLCV_Cloud_Backup.json`. Tải về thì **gộp theo id**, không ghi đè.
- **Sao lưu / Phục hồi / Import hồ sơ từ file**: Import chỉ thêm hồ sơ mới, không xóa dữ liệu cũ.
- **Mật khẩu** (`security.js`) bảo vệ: Lưu lên Drive, Sao lưu, Phục hồi, Import, Xóa hồ sơ.

## 3. Kiến trúc kỹ thuật

```
Trình duyệt ── Flask :5001 ── dossiers.json, data.json, backups/
(React build)      └────── thư mục hồ sơ trên đĩa / Google Drive Mirror (HOSO_ROOT)
```

- **Giao diện**: React 18, Vite, Tailwind, thư viện xlsx. Lệnh `npm run build:flask` build ra `backend/qlcv_dist/`. Lệnh `npm run deploy` đẩy lên GitHub Pages `lyannha2312.github.io/tlcv`.
- **Máy chủ**: Flask. Các API chính:
  - `/api/dossiers`: đọc và ghi hồ sơ.
  - `/api/data/<nhóm>`: DNIS, mail, phối hợp, lịch, họp.
  - `/api/ho_so/<thư mục>/files`, `/upload`, `/open_folder`: quản lý file.
  - `/static/ho-so/...`: phục vụ file.
- **Cấu hình**: `config.json` (riêng từng máy) khai báo `HOSO_ROOT`, thư mục gốc chứa hồ sơ. Đường dẫn là thư mục Google Drive for Desktop ở chế độ Mirror.
- **Khởi chạy**: `Mo_KhoHoSo.bat` tự tạo môi trường Python, cài thư viện, rồi mở trình duyệt.
- **Công cụ phụ**: `gop_ho_so.py` so sánh `dossiers.json` với file sao lưu QLCV và liệt kê hồ sơ lệch nhau. Nó xuất báo cáo HTML để chọn bản nào giữ, rồi tạo file mới, **không bao giờ ghi đè** `dossiers.json`.
- **Còn sót từ bản cũ**:
  - `frontend/server.js` (cổng 3001) mở thư mục bằng Explorer cho bản GitHub Pages.
  - Trang `/kho` là trang Kho hồ sơ cũ, giữ để dự phòng.
  - Một số file HTML tài liệu (`HUONG_DAN_TRIEN_KHAI.html`, `tong-quan-du-an.html`...).

## 4. Ý đồ đã xác nhận

1. **Ý đồ chính**: một giao diện duy nhất (QLCV) làm cả quản lý công việc lẫn quản lý file hồ sơ, và vẫn xem được trên GitHub Pages (không có file đính kèm).
2. **Người dùng**: chỉ một người dùng, nhưng đăng nhập từ nhiều máy.
3. **Trạng thái dang dở**: `app.py`, `App.jsx`, `Forms.jsx`, `DetailView.jsx` đang sửa; `DossierFiles`, `DossierTree`, `PdfViewer`, `fileMatch.js`, `serverSync.js` chưa commit. Bước 4 (giao diện gộp) đã chạy được. Bước 5 (dọn lỗi) chưa làm hết.
4. **Mật khẩu mail** lưu dạng chữ thường trong dữ liệu và trong file sao lưu. Đúng như hiện trạng.
