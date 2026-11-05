# Trợ lý công việc — Tổng quan dự án

Công cụ cá nhân để theo dõi công việc văn phòng và lưu trữ hồ sơ tài liệu. Cập nhật lần cuối: 02/11/2026.

- **Trang công khai (chỉ giao diện, dữ liệu lưu trong trình duyệt):** https://lyannha2312.github.io/tlcv/
- **Mã nguồn:** https://github.com/lyannha2312/tlcv
- **Bản đầy đủ (có quản lý file):** chạy trên máy, địa chỉ http://localhost:5001

## 1. Quy trình công việc được mô hình hóa

1. Một **văn bản chỉ đạo** đến thì mở **một hồ sơ** theo chuyên đề. Văn bản chỉ đạo có thể kèm **phụ lục**.
2. Người dùng **tham mưu văn bản triển khai** (kết quả công việc của hồ sơ).
3. Hồ sơ nhiều giai đoạn thì **lấy ý kiến Công an các đơn vị, địa phương**: các báo cáo gửi về chỉ **lưu file**, không theo dõi tiến trình từng đơn vị.
4. Chủ đề góp ý nhiều vòng (ví dụ Thư viện điện tử, Chatbot AI công tác chính trị) gộp **một hồ sơ**: văn bản gốc là lần 1, các lần sau là mốc có ghi chú "Lần 2".
5. Xong việc thì **đóng hồ sơ**, ghi kết quả; hồ sơ chuyển sang Kho hồ sơ.

## 2. Kho tài liệu trên đĩa

Thư mục gốc đặt trong `backend/config.json` (`HOSO_ROOT`, hiện là `D:/ho-so`), cấu trúc:

```
ho-so/
└── 2026/                                   ← năm của văn bản gốc
    └── GÓP Ý/                              ← chuyên đề
        └── 2026-09-11_551-PX03_gop-y-chatbot/   ← thư mục hồ sơ
            ├── 1_Chỉ đạo/                  văn bản chỉ đạo (văn bản đến)
            ├── 2_Phụ lục/                  phụ lục của văn bản chỉ đạo
            ├── 3_Báo cáo đơn vị/           báo cáo của CA đơn vị, địa phương (chỉ lưu file)
            ├── 4_Triển khai/               văn bản triển khai (kết quả), kèm phụ lục của nó
            └── 5_Bản nháp/                 bản nháp, xin ý kiến, trao đổi (tùy chọn)
```

- **Chuyên đề:** TRÍ TUỆ NHÂN TẠO AI, KHUNG KIẾN TRÚC, CHUYỂN ĐỔI SỐ, TRIỂN KHAI, GÓP Ý, DNIS, KHÁC (giao diện còn MAIL CÔNG VỤ, ĐẢNG).
- **Đường dẫn do hồ sơ lưu cố định** (`storagePath`). Đổi chuyên đề, năm văn bản hoặc tên thư mục thì Flask **tự chuyển thư mục** theo; từ chối nếu thư mục đích đã có file.
- Thư mục con tự đặt thêm (ví dụ `Xin ý kiến BTV`) vẫn hiện, như một nhóm riêng. Tên cũ (`Văn bản chỉ đạo`, `Phụ lục`...) vẫn được nhận ra.

### Quy ước tên

| Đối tượng | Quy ước |
|---|---|
| Thư mục hồ sơ | `yyyy-mm-dd_SỐ-KÝ-HIỆU_tên-rút-gọn`, không dấu, tối đa **60** ký tự. Form tự sinh nếu để trống |
| Số ký hiệu | `/` thành `-`, `Đ` thành `D`, giữ chữ hoa, hồ sơ không có số dùng `KO-SO` |
| Ký tự cấm | `\ / : * ? " < > \|` |
| Tên file | Bắt đầu bằng số ký hiệu để hệ thống tự gắn vào mốc; tối đa **70** ký tự |
| Tổng đường dẫn | Dưới **200** ký tự (Windows lỗi quanh 260). Tiền tố Drive của máy này: `H:\Other computers\<Tên máy>\ho-so` |

Giao diện cảnh báo khi tên file hoặc đường dẫn quá dài.

## 3. Chức năng

- **Bàn làm việc:** hồ sơ đang xử lý, tô màu theo chuyên đề, hạn xử lý, nhãn Khẩn, task nhỏ kèm Pomodoro.
- **Hồ sơ và Nhật ký xử lý:** mỗi mốc có một nhãn loại và một dòng "số văn bản · ngày ban hành". Loại mốc: Khởi tạo, Văn bản (đính kèm, chỉ đạo mới, phụ lục, kết quả), **Lấy ý kiến**, Tiến độ, Kết thúc. Thẻ **Kết Quả Cuối Cùng** nằm ngay dưới nhật ký.
- **Phân loại "Lấy ý kiến":** công văn gửi lấy ý kiến, có thể ghi hạn góp ý. Các báo cáo trong `3_Báo cáo đơn vị` được đếm và hiện ngay dưới mốc này. Báo cáo tuần vẫn tính như văn bản kết quả.
- **Gắn file vào nhật ký (tự động):** theo tên file hoặc đường dẫn khai trong mốc, rồi theo số ký hiệu, rồi theo vai trò thư mục (chỉ đạo/phụ lục vào mốc Khởi tạo, triển khai vào mốc văn bản kết quả). Tên file chứa số ký hiệu thì khớp đúng mốc. Hiện hơn 99% file đã được gắn.
- **Quản lý tài liệu:** icon theo loại file (PDF đỏ, Word xanh dương, Excel xanh lá...), mỗi file một dòng, bấm để xem ở khung đọc bên phải (PDF và ảnh xem trực tiếp; Word, Excel mở trên Drive hoặc tải xuống), tải lên, xóa, Làm mới. Link Google Drive lưu trong ô "Đường dẫn file" của mốc mở được bằng một nút.
- **Cảnh báo khi đóng hồ sơ** mà thư mục thiếu file ở `1_Chỉ đạo` hoặc `4_Triển khai` (không chặn).
- **Kho hồ sơ:** tìm kiếm, lọc theo chuyên đề, trạng thái, khoảng ngày; cây hồ sơ bên trái theo chuyên đề.
- **Các sổ ghi chép:** Hỗ trợ (chọn loại DNIS / Mail công vụ / QLVB V3), nhiệm vụ phối hợp, cuộc họp; **Kế hoạch tuần** tự tổng hợp hoạt động từ dữ liệu có sẵn.
- **Đồng bộ và sao lưu:** lưu/tải Google Drive (`QLCV_Cloud_Backup.json`), sao lưu, phục hồi, import hồ sơ từ file (có mật khẩu xác nhận).

## 4. Hai cách chạy

| | Bản trên máy (Flask) | Trang GitHub Pages |
|---|---|---|
| Địa chỉ | http://localhost:5001 | https://lyannha2312.github.io/tlcv/ |
| Dữ liệu hồ sơ | `backend/dossiers.json`, `backend/data.json` | Bộ nhớ trình duyệt (localStorage) |
| Tài liệu và thư mục | Đầy đủ: xem, tải lên, xóa, mở thư mục | Không chứa tài liệu. Có thể **bật** nút "Xem tài liệu từ máy" (chỉ đọc) và nút "Mở thư mục", cả hai cần Flask đang chạy trên máy |
| Khởi động | Chạy `backend\Mo_KhoHoSo.bat` | Mở trình duyệt (Chrome hoặc Edge để dùng kết nối về máy) |

## 5. Kiến trúc và mã nguồn

```
_QLCV_Merged/
├── backend/                     máy chủ Flask (Python)
│   ├── app.py                   toàn bộ API, quản lý thư mục/file, đường dẫn cố định (chỉ cần thư viện Flask)
│   ├── kiem_tra_kho.py          kiểm tra chỉ đọc kho ↔ dữ liệu (xuất bao_cao_kho.html)
│   ├── tests/test_luu_tru.py    28 bài kiểm thử
│   ├── Mo_KhoHoSo.bat          khởi động (tự tạo môi trường Python ở lần đầu)
│   ├── config.example.json      mẫu cấu hình (bản thật: config.json, không đưa lên git)
│   ├── qlcv_dist/               giao diện đã build (tạo bằng npm run build:flask)
│   └── dossiers.json, data.json, backups/   dữ liệu thật (không đưa lên git)
└── frontend/                    giao diện React 18 + Vite + Tailwind
    ├── App.jsx                  điều phối, đồng bộ máy chủ, mật khẩu xác nhận
    ├── views/                   Workspace, Detail, Archive, Planner, Support, Coordinations, Meetings
    ├── components/              DossierFiles, DossierTree, Forms, PdfViewer, Modal
    ├── fileMatch.js             gắn file vào mốc, tên thư mục chuẩn, phân loại "Lấy ý kiến"
    ├── helpers.js, serverSync.js, driveSync.js, security.js
    └── .env.example             mẫu biến môi trường
```

**API chính của Flask:** `/api/dossiers` (đọc, ghi cả danh sách; ghi có kiểm tra tên thư mục và tự chuyển thư mục), `/api/data/...` (các sổ), `/api/ho_so/<thư mục>/files|upload|open_folder|create_category`, `/api/ho_so/<thư mục>/pdf/<nhóm>/<file>` (xóa), `/static/ho-so/...` (xem file; chỉ phục vụ file nằm trong kho).

**Dữ liệu một hồ sơ** (`dossiers.json`): `id`, `status` (active/archived), `title`, `category`, `priority`, `deadline`, `createdAt`, `closedAt`, `originalDoc {number, date, summary, sender, content}`, `relatedDocs []` (mốc: `type` document/progress, `docType`, `number`, `date`, `sender`, `content`, `note`, `fileName`, `filePath`, `consultDeadline`), `tasks []`, `finalResult`, `note`, `folderPath`, `storagePath`.

## 6. Lệnh thường dùng

| Việc | Lệnh |
|---|---|
| Chạy bản trên máy | `backend\Mo_KhoHoSo.bat`, rồi mở http://localhost:5001 |
| Build giao diện cho Flask | `cd frontend`, rồi `npm run build:flask` (chạy trong Git Bash cần đặt `MSYS_NO_PATHCONV=1`) |
| Deploy GitHub Pages | `git push origin main` rồi `cd frontend`, `npm run deploy` (tự build với mật khẩu riêng của Pages) |
| Chạy kiểm thử | `cd backend`, `python -m unittest discover -s tests` |
| Kiểm tra kho | `cd backend`, `python kiem_tra_kho.py` → mở `bao_cao_kho.html` |
| Thay đổi mật khẩu | Sửa `frontend/.env.local` (máy) hoặc `frontend/.env.pages.local` (Pages), build lại |

Biến môi trường để chạy bản thử tách khỏi dữ liệu thật: `QLCV_HOSO_ROOT`, `QLCV_DATA_DIR`, `QLCV_DIST`, `QLCV_PORT`, `QLCV_HOST`, `QLCV_NO_BROWSER`.

## 7. Cấu hình và file cục bộ (không đưa lên GitHub)

| File | Nội dung |
|---|---|
| `backend/config.json` | `HOSO_ROOT` (thư mục kho), `DRIVE_PREFIX` (đường dẫn kho khi xem qua Drive, để tính độ dài), `HOST` (mặc định `127.0.0.1`) |
| `backend/dossiers.json`, `data.json` | Dữ liệu hồ sơ và các sổ. Mỗi lần ghi tự sao lưu vào `backups/` (giữ 10 bản) |
| `frontend/.env.local` | `VITE_APP_PASSWORD` cho bản chạy trên máy |
| `frontend/.env.pages.local` | `VITE_APP_PASSWORD` riêng cho trang Pages (gói Pages là JS công khai, **không** dùng mật khẩu máy) |

## 8. Bảo mật

- Flask mặc định chỉ nghe `127.0.0.1`, **không có mật khẩu**, nên không mở cho mạng LAN. Muốn mở thì đặt `"HOST": "0.0.0.0"` và hiểu rõ rủi ro.
- Đường dẫn `/static/ho-so/...` chỉ phục vụ file **trong kho** (chặn `../`).
- Trang `lyannha2312.github.io` chỉ được gọi đúng ba việc **chỉ đọc**: mở thư mục, xem danh sách file, xem nội dung file. Mọi việc khác (tải lên, xóa, ghi, danh sách hồ sơ) và mọi trang khác đều bị từ chối.
- Mật khẩu ứng dụng chặn các thao tác nhạy cảm (lưu Drive, sao lưu, phục hồi, import, xóa hồ sơ). Trên Pages nó chỉ là rào cản thao tác nhầm, vì mã chạy ở trình duyệt.
- Dữ liệu hồ sơ, sao lưu, cấu hình, mật khẩu **không** được đưa lên GitHub (xem `.gitignore`). Repo công khai: không bao giờ commit các file đó.
- Mật khẩu mail trong sổ "Hỗ trợ" (loại Mail công vụ) lưu dạng chữ thường trong `data.json` và file sao lưu.

## 9. Việc có thể làm tiếp

- Xem trước trực tiếp Word và Excel trong khung đọc.
- Gắn tên file dài vượt 70 ký tự của vài hồ sơ cũ (xem mục J trong báo cáo `kiem_tra_kho.py`).
- Cho Flask tự chạy khi đăng nhập Windows.
