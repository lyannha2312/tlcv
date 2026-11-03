# -*- coding: utf-8 -*-
"""Kiểm thử đường dẫn lưu trữ hồ sơ (storagePath) trên thư mục tạm, không đụng kho thật.

Chạy:  python -m unittest discover -s tests -v   (trong thư mục backend)
"""
import json
import mimetypes
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app as server  # noqa: E402


def make_dossier(id_, folder, category="GÓP Ý", date="2026-05-01", **extra):
    d = {"id": id_, "status": "active", "title": f"Hồ sơ {id_}", "category": category,
         "createdAt": "2026-05-02T00:00:00.000Z", "folderPath": folder,
         "originalDoc": {"number": "1/X", "date": date, "summary": "", "sender": ""},
         "relatedDocs": [], "tasks": []}
    d.update(extra)
    return d


class LuuTruTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="qlcv_test_")
        self.old = (server.HOSO_ROOT, server.JSON_PATH, server.BACKUP_DIR, server.BASE_DIR)
        # BASE_DIR cũng trỏ vào thư mục tạm để không đọc nhầm file cấu hình/dữ liệu thật.
        server.BASE_DIR = self.tmp
        server.HOSO_ROOT = os.path.join(self.tmp, "ho-so")
        server.JSON_PATH = os.path.join(self.tmp, "dossiers.json")
        server.BACKUP_DIR = os.path.join(self.tmp, "backups")
        os.makedirs(server.HOSO_ROOT)
        self.client = server.app.test_client()

    def tearDown(self):
        server.HOSO_ROOT, server.JSON_PATH, server.BACKUP_DIR, server.BASE_DIR = self.old
        shutil.rmtree(self.tmp, ignore_errors=True)

    # --- tiện ích ---
    def path(self, *parts):
        return os.path.join(server.HOSO_ROOT, *parts)

    def write(self, rel, text="x"):
        p = self.path(*rel.split("/"))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(text)

    def put(self, items):
        return self.client.put("/api/dossiers", json=items)

    def saved(self):
        with open(server.JSON_PATH, encoding="utf-8") as f:
            return {d["id"]: d for d in json.load(f)["dossiers"]}

    # --- hồ sơ mới / đường dẫn cố định ---
    def test_ho_so_moi_duoc_gan_storage_path_va_tao_thu_muc_chuan(self):
        r = self.put([make_dossier("a", "2026-05-01_1-X_abc")])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.saved()["a"]["storagePath"], "2026/GÓP Ý/2026-05-01_1-X_abc")
        for c in ("1_Chỉ đạo", "2_Phụ lục", "4_Triển khai"):
            self.assertTrue(os.path.isdir(self.path("2026", "GÓP Ý", "2026-05-01_1-X_abc", c)))

    def test_storage_path_tu_may_khach_bi_bo_qua(self):
        self.put([make_dossier("a", "f1")])
        d = make_dossier("a", "f1", storagePath="2026/GÓP Ý/../../ngoai")
        self.assertEqual(self.put([d]).status_code, 200)
        self.assertEqual(self.saved()["a"]["storagePath"], "2026/GÓP Ý/f1")

    # --- đổi chuyên đề / tên thì thư mục đi theo ---
    def test_doi_chuyen_de_thi_chuyen_thu_muc(self):
        self.put([make_dossier("a", "f1")])
        self.write("2026/GÓP Ý/f1/1_Chỉ đạo/a.pdf", "noi dung")
        r = self.put([make_dossier("a", "f1", category="TRÍ TUỆ NHÂN TẠO AI")])
        self.assertEqual(r.status_code, 200)
        self.assertTrue(os.path.isfile(self.path("2026", "TRÍ TUỆ NHÂN TẠO AI", "f1", "1_Chỉ đạo", "a.pdf")))
        self.assertFalse(os.path.exists(self.path("2026", "GÓP Ý", "f1")))
        self.assertEqual(self.saved()["a"]["storagePath"], "2026/TRÍ TUỆ NHÂN TẠO AI/f1")

    def test_doi_ten_thu_muc_thi_chuyen(self):
        self.put([make_dossier("a", "f1")])
        self.write("2026/GÓP Ý/f1/2_Phụ lục/p.docx")
        self.assertEqual(self.put([make_dossier("a", "f2")]).status_code, 200)
        self.assertTrue(os.path.isfile(self.path("2026", "GÓP Ý", "f2", "2_Phụ lục", "p.docx")))

    def test_doi_nam_van_ban_thi_chuyen_sang_nam_moi(self):
        self.put([make_dossier("a", "f1")])
        self.write("2026/GÓP Ý/f1/2_Phụ lục/p.docx")
        self.put([make_dossier("a", "f1", date="2027-01-02")])
        self.assertTrue(os.path.isfile(self.path("2027", "GÓP Ý", "f1", "2_Phụ lục", "p.docx")))

    def test_doi_hoa_thuong_khong_bi_coi_la_trung(self):
        self.put([make_dossier("a", "Abc")])
        self.write("2026/GÓP Ý/Abc/2_Phụ lục/p.docx")
        r = self.put([make_dossier("a", "abc")])
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        self.assertTrue(os.path.isfile(self.path("2026", "GÓP Ý", "abc", "2_Phụ lục", "p.docx")))

    def test_dich_da_co_file_thi_tu_choi_va_khong_thay_doi_gi(self):
        self.put([make_dossier("a", "f1"), make_dossier("b", "f2", category="KHÁC")])
        self.write("2026/GÓP Ý/f1/2_Phụ lục/a.pdf")
        self.write("2026/KHÁC/f2/2_Phụ lục/b.pdf")
        before = open(server.JSON_PATH, encoding="utf-8").read()
        r = self.put([make_dossier("a", "f1"), make_dossier("b", "f1", category="GÓP Ý")])
        self.assertEqual(r.status_code, 409)
        self.assertTrue(os.path.isfile(self.path("2026", "KHÁC", "f2", "2_Phụ lục", "b.pdf")))
        self.assertEqual(open(server.JSON_PATH, encoding="utf-8").read(), before)

    def test_dich_rong_thi_ghi_de_duoc(self):
        self.put([make_dossier("a", "f1")])
        self.write("2026/GÓP Ý/f1/2_Phụ lục/a.pdf")
        os.makedirs(self.path("2026", "KHÁC", "f1", "2_Phụ lục"))
        r = self.put([make_dossier("a", "f1", category="KHÁC")])
        self.assertEqual(r.status_code, 200)
        self.assertTrue(os.path.isfile(self.path("2026", "KHÁC", "f1", "2_Phụ lục", "a.pdf")))

    def test_hai_ho_so_cung_thu_muc_bi_tu_choi(self):
        r = self.put([make_dossier("a", "f1"), make_dossier("b", "f1")])
        self.assertEqual(r.status_code, 409)

    # --- kiểm tra tên ---
    def test_ten_co_dau_gach_cheo_bi_tu_choi(self):
        r = self.put([make_dossier("a", "2026-04-03_386/PA05")])
        self.assertEqual(r.status_code, 409)
        self.assertIn("ký tự không được dùng", r.get_json()["error"])
        self.assertFalse(os.path.exists(server.JSON_PATH))  # bị từ chối thì không ghi gì

    def test_chuyen_de_co_ky_tu_cam_bi_tu_choi(self):
        self.assertEqual(self.put([make_dossier("a", "f1", category="A/B")]).status_code, 409)

    def test_ho_so_cu_ten_xau_khong_chan_viec_luu_ho_so_khac(self):
        # Dữ liệu cũ đã có tên không hợp lệ: chỉ kiểm tra khi hồ sơ đó bị đổi, để không khóa cả hệ thống.
        os.makedirs(server.BACKUP_DIR, exist_ok=True)
        with open(server.JSON_PATH, "w", encoding="utf-8") as f:
            json.dump({"version": 2, "dossiers": [make_dossier("a", "x/y")]}, f)
        r = self.put([make_dossier("a", "x/y"), make_dossier("b", "f2")])
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))

    def test_khong_duoc_xoa_trong_ten_thu_muc_da_co(self):
        self.put([make_dossier("a", "f1")])
        r = self.put([make_dossier("a", "")])
        self.assertEqual(r.status_code, 409)

    def test_ho_so_cu_khong_co_storage_path_duoc_dien_va_di_chuyen_dung(self):
        with open(server.JSON_PATH, "w", encoding="utf-8") as f:
            json.dump({"version": 2, "dossiers": [make_dossier("a", "f1")]}, f)
        self.write("2026/GÓP Ý/f1/2_Phụ lục/a.pdf")
        r = self.put([make_dossier("a", "f1", category="KHÁC")])
        self.assertEqual(r.status_code, 200)
        self.assertTrue(os.path.isfile(self.path("2026", "KHÁC", "f1", "2_Phụ lục", "a.pdf")))

    # --- liệt kê / tải lên / xóa ---
    def test_liet_ke_hien_moi_thu_muc_con_va_file_le(self):
        self.put([make_dossier("a", "f1")])
        base = "2026/GÓP Ý/f1/"
        self.write(base + "1_Chỉ đạo/cd.pdf")
        self.write(base + "Xin ý kiến BTV/nhap.docx")
        self.write(base + "3_Báo cáo đơn vị/CAP A.pdf")
        self.write(base + "2_Phụ lục/ghi-chu.md")
        self.write(base + "2_Phụ lục/.~lock.x.docx#")
        self.write(base + "le.mp4")
        groups = self.client.get("/api/ho_so/f1/files").get_json()["categories"]
        self.assertEqual([f["fileName"] for f in groups["Xin ý kiến BTV"]], ["nhap.docx"])
        self.assertEqual([f["fileName"] for f in groups["3_Báo cáo đơn vị"]], ["CAP A.pdf"])
        self.assertEqual([f["fileName"] for f in groups["2_Phụ lục"]], ["ghi-chu.md"])  # bỏ file khóa tạm
        self.assertEqual([f["fileName"] for f in groups["Khác"]], ["le.mp4"])
        self.assertEqual(groups["1_Chỉ đạo"][0]["url"], "/static/ho-so/2026/GÓP Ý/f1/1_Chỉ đạo/cd.pdf")
        self.assertIn("4_Triển khai", groups)  # nhóm chuẩn luôn có

    def test_tai_len_va_xoa_trong_thu_muc_con_tu_tao_nhung_khong_thoat_ra_ngoai(self):
        self.put([make_dossier("a", "f1")])
        self.write("2026/GÓP Ý/f1/Xin ý kiến BTV/nhap.docx")
        r = self.client.delete("/api/ho_so/f1/pdf/Xin ý kiến BTV/nhap.docx")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(os.path.exists(self.path("2026", "GÓP Ý", "f1", "Xin ý kiến BTV", "nhap.docx")))
        self.assertEqual(self.client.delete("/api/ho_so/f1/pdf/..%2F..%2Fx/a.pdf").status_code, 400)
        r = self.client.post("/api/ho_so/f1/upload", data={"category": "Khong co thu muc nay"})
        self.assertEqual(r.status_code, 400)

    def test_url_file_dung_voi_storage_path_khi_doi_chuyen_de(self):
        self.put([make_dossier("a", "f1")])
        self.write("2026/GÓP Ý/f1/2_Phụ lục/a.pdf")
        self.put([make_dossier("a", "f1", category="KHÁC")])
        groups = self.client.get("/api/ho_so/f1/files").get_json()["categories"]
        self.assertEqual(groups["2_Phụ lục"][0]["url"], "/static/ho-so/2026/KHÁC/f1/2_Phụ lục/a.pdf")
        self.assertEqual(self.client.get(groups["2_Phụ lục"][0]["url"]).status_code, 200)

    # --- tên thư mục con mới / cũ ---
    def test_thu_muc_ten_cu_van_duoc_nhan_ra_va_gop_vao_nhom_ten_moi(self):
        self.put([make_dossier("a", "f1")])
        for d in ("1_Chỉ đạo", "2_Phụ lục", "4_Triển khai"):
            shutil.rmtree(self.path("2026", "GÓP Ý", "f1", d))
        self.write("2026/GÓP Ý/f1/Văn bản chỉ đạo/cu.pdf")
        self.write("2026/GÓP Ý/f1/Báo cáo của các đơn vị/CAP A.pdf")
        self.write("2026/GÓP Ý/f1/Văn bản triển khai/kq.pdf")
        groups = self.client.get("/api/ho_so/f1/files").get_json()["categories"]
        self.assertEqual([f["fileName"] for f in groups["1_Chỉ đạo"]], ["cu.pdf"])
        self.assertEqual([f["fileName"] for f in groups["3_Báo cáo đơn vị"]], ["CAP A.pdf"])
        self.assertEqual([f["fileName"] for f in groups["4_Triển khai"]], ["kq.pdf"])
        self.assertNotIn("Văn bản chỉ đạo", groups)
        self.assertEqual(groups["1_Chỉ đạo"][0]["url"], "/static/ho-so/2026/GÓP Ý/f1/Văn bản chỉ đạo/cu.pdf")
        self.assertEqual(self.client.get(groups["1_Chỉ đạo"][0]["url"]).status_code, 200)

    def test_tai_len_vao_nhom_moi_dung_thu_muc_cu_neu_hoso_chua_doi_ten(self):
        self.put([make_dossier("a", "f1")])
        shutil.rmtree(self.path("2026", "GÓP Ý", "f1", "4_Triển khai"))
        self.write("2026/GÓP Ý/f1/Văn bản triển khai/co.pdf")
        import io
        r = self.client.post("/api/ho_so/f1/upload", data={"category": "4_Triển khai", "files": (io.BytesIO(b"x"), "moi.pdf")},
                             content_type="multipart/form-data")
        self.assertEqual(r.status_code, 200, r.get_data(as_text=True))
        self.assertTrue(os.path.isfile(self.path("2026", "GÓP Ý", "f1", "Văn bản triển khai", "moi.pdf")))
        self.assertFalse(os.path.exists(self.path("2026", "GÓP Ý", "f1", "4_Triển khai")))

    def test_ho_so_moi_tao_dung_ba_thu_muc_ten_moi(self):
        self.put([make_dossier("a", "f1")])
        names = sorted(os.listdir(self.path("2026", "GÓP Ý", "f1")))
        self.assertEqual(names, ["1_Chỉ đạo", "2_Phụ lục", "4_Triển khai"])

    def test_canh_bao_khi_ten_file_hoac_duong_dan_qua_dai(self):
        self.put([make_dossier("a", "f1")])
        import io
        long_name = "x" * 80 + ".pdf"
        r = self.client.post("/api/ho_so/f1/upload", data={"category": "1_Chỉ đạo", "files": (io.BytesIO(b"x"), long_name)},
                             content_type="multipart/form-data")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.get_json()["warnings"]), 1)
        self.assertIn("tên file dài", r.get_json()["warnings"][0])
        r = self.client.post("/api/ho_so/f1/upload", data={"category": "1_Chỉ đạo", "files": (io.BytesIO(b"x"), "ngan.pdf")},
                             content_type="multipart/form-data")
        self.assertEqual(r.get_json()["warnings"], [])


    def test_tai_len_tao_thu_muc_bao_cao_va_ban_nhap_khi_chua_co(self):
        self.put([make_dossier("a", "f1")])
        import io
        for group in ("3_Báo cáo đơn vị", "5_Bản nháp"):
            r = self.client.post("/api/ho_so/f1/upload", data={"category": group, "files": (io.BytesIO(b"x"), "a.pdf")},
                                 content_type="multipart/form-data")
            self.assertEqual(r.status_code, 200, group)
            self.assertTrue(os.path.isfile(self.path("2026", "GÓP Ý", "f1", group, "a.pdf")))
        # tên cũ của thư mục báo cáo vẫn được nhận và gộp về nhóm tên mới
        groups = self.client.get("/api/ho_so/f1/files").get_json()["categories"]
        self.assertIn("3_Báo cáo đơn vị", groups)

    def test_ho_so_chua_co_thu_muc_khong_ghi_vao_thu_muc_hien_hanh(self):
        d = make_dossier("a", "")
        self.assertEqual(self.put([d]).status_code, 200)
        r = self.client.post("/api/ho_so//upload", data={"category": "1_Chỉ đạo"})
        self.assertIn(r.status_code, (400, 404))
        self.assertEqual(self.client.get("/api/ho_so//files").status_code, 404)

    def test_trang_kho_cu_va_api_cu_da_go_bo(self):
        self.assertNotIn("pandas", sys.modules)  # không còn phụ thuộc pandas/Excel
        for method, path in (("get", "/kho"), ("get", "/api/ho_so"), ("post", "/api/ho_so"), ("get", "/api/ho_so/export"),
                             ("post", "/api/ho_so/import"), ("post", "/api/ho_so/open_root"), ("get", "/static/css/styles.css"),
                             ("get", "/api/ho_so/f1/timeline_details"), ("post", "/api/ho_so/f1/create_category")):
            self.assertIn(getattr(self.client, method)(path).status_code, (404, 405), path)

    # --- trang GitHub Pages (chỉ đọc) ---
    PAGES = "https://lyannha2312.github.io"

    def test_trang_pages_duoc_mo_thu_muc_xem_danh_sach_va_xem_file(self):
        self.put([make_dossier("a", "f1")])
        self.write("2026/GÓP Ý/f1/1_Chỉ đạo/a.pdf", "noi dung")
        h = {"Origin": self.PAGES}
        r = self.client.options("/api/ho_so/f1/open_folder", headers={**h, "Access-Control-Request-Method": "POST",
                                                                       "Access-Control-Request-Private-Network": "true"})
        self.assertEqual(r.headers.get("Access-Control-Allow-Origin"), self.PAGES)
        self.assertEqual(r.headers.get("Access-Control-Allow-Private-Network"), "true")
        r = self.client.post("/api/ho_so/khong-co/open_folder", headers=h)
        self.assertEqual((r.status_code, r.headers.get("Access-Control-Allow-Origin")), (404, self.PAGES))
        r = self.client.get("/api/ho_so/f1/files", headers=h)
        self.assertEqual((r.status_code, r.headers.get("Access-Control-Allow-Origin")), (200, self.PAGES))
        r = self.client.get("/static/ho-so/2026/GÓP Ý/f1/1_Chỉ đạo/a.pdf", headers=h)
        self.assertEqual((r.status_code, r.headers.get("Access-Control-Allow-Origin")), (200, self.PAGES))
        r.close()

    def test_origin_la_khong_duoc_cors(self):
        self.put([make_dossier("a", "f1")])
        for origin in ("https://evil.example", "https://lyannha2312.github.io.evil.example", "http://lyannha2312.github.io"):
            for method, path in (("options", "/api/ho_so/f1/open_folder"), ("get", "/api/ho_so/f1/files"), ("get", "/static/ho-so/x")):
                r = getattr(self.client, method)(path, headers={"Origin": origin})
                self.assertIsNone(r.headers.get("Access-Control-Allow-Origin"), (origin, path))

    def test_trang_pages_khong_ghi_xoa_hay_doc_danh_sach_ho_so(self):
        self.put([make_dossier("a", "f1")])
        h = {"Origin": self.PAGES}
        for method, path in (("get", "/api/dossiers"), ("put", "/api/dossiers"), ("post", "/api/ho_so/f1/upload"),
                             ("delete", "/api/ho_so/f1/pdf/1_Chỉ đạo/a.pdf"), ("get", "/api/data"), ("post", "/api/ho_so/f1/files")):
            r = getattr(self.client, method)(path, headers=h)
            self.assertIsNone(r.headers.get("Access-Control-Allow-Origin"), (method, path))
        # GET vào endpoint chỉ cho POST (và ngược lại) cũng không được cấp quyền
        r = self.client.get("/api/ho_so/f1/open_folder", headers=h)
        self.assertIsNone(r.headers.get("Access-Control-Allow-Origin"))

    # --- không đọc được file ngoài kho ---
    def test_khong_doc_duoc_file_ngoai_kho_bang_duong_dan_chua_cham_cham(self):
        secret = os.path.join(self.tmp, "bi-mat.txt")
        with open(secret, "w", encoding="utf-8") as f:
            f.write("khong duoc lo")
        self.write("2026/GÓP Ý/f1/1_Chỉ đạo/a.pdf", "ok")
        self.assertEqual(self.client.get("/static/ho-so/2026/GÓP Ý/f1/1_Chỉ đạo/a.pdf").status_code, 200)
        for bad in ("/static/ho-so/../bi-mat.txt", "/static/ho-so/%2e%2e/bi-mat.txt",
                    "/static/ho-so/2026/../../bi-mat.txt", "/static/ho_so/../bi-mat.txt"):
            r = self.client.get(bad)
            self.assertEqual(r.status_code, 404, bad)
            self.assertNotIn(b"khong duoc lo", r.data, bad)

    # --- giao diện ---
    def test_file_js_css_phuc_vu_dung_kieu_du_cho_registry_windows_sai(self):
        dist = os.path.join(self.tmp, "dist")
        os.makedirs(os.path.join(dist, "assets"))
        for name in ("a.js", "a.css"):
            with open(os.path.join(dist, "assets", name), "w", encoding="utf-8") as f:
                f.write("x")
        old_dist = server.QLCV_DIST_DIR
        server.QLCV_DIST_DIR = dist
        try:
            # Mô phỏng máy khai .js là text/plain trong registry, rồi chạy lại bước sửa lúc khởi động.
            mimetypes.add_type("text/plain", ".js")
            mimetypes.add_type("text/plain", ".css")
            server.fix_mime_types()
            self.assertTrue(self.client.get("/assets/a.js").headers["Content-Type"].startswith("text/javascript"))
            self.assertTrue(self.client.get("/assets/a.css").headers["Content-Type"].startswith("text/css"))
        finally:
            server.QLCV_DIST_DIR = old_dist


if __name__ == "__main__":
    unittest.main()
