# -*- coding: utf-8 -*-
"""Kiểm thử sổ Hỗ trợ (gộp DNIS, Mail công vụ, QLVB V3) trên thư mục tạm, không đụng data.json thật.

Chạy:  python -m unittest discover -s tests -v   (trong thư mục backend)
"""
import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import app as server  # noqa: E402

OLD_DNIS = {"id": "d1", "unit": "Phòng A", "date": "2026-05-01T01:00:00.000Z", "content": "Cấp tài khoản", "contact": "An", "status": "Hoàn thành", "docNumber": "12/CV", "docDate": "2026-04-30"}
OLD_MAIL = {"id": "m1", "entity": "Nguyễn Văn B", "email": "b@x.vn", "password": "abc", "date": "2026-05-02T01:00:00.000Z", "content": "Khôi phục mật khẩu", "status": "Đang thực hiện"}


class HoTroTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="qlcv_test_")
        self.old = (server.DATA_PATH, server.BACKUP_DIR)
        server.DATA_PATH = os.path.join(self.tmp, "data.json")
        server.BACKUP_DIR = os.path.join(self.tmp, "backups")
        self.client = server.app.test_client()

    def tearDown(self):
        server.DATA_PATH, server.BACKUP_DIR = self.old
        shutil.rmtree(self.tmp, ignore_errors=True)

    def write_data(self, payload):
        with open(server.DATA_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f)

    def test_data_json_cu_duoc_chuyen_sang_ho_tro(self):
        self.write_data({"version": 2, "dnisLogs": [OLD_DNIS], "mailLogs": [OLD_MAIL], "meetings": [{"id": "x"}]})
        data = self.client.get("/api/data").get_json()
        self.assertNotIn("dnisLogs", data)
        self.assertNotIn("mailLogs", data)
        by_id = {l["id"]: l for l in data["supportLogs"]}
        self.assertEqual(by_id["d1"]["type"], "DNIS")
        self.assertEqual(by_id["d1"]["docNumber"], "12/CV")
        self.assertEqual(by_id["m1"]["type"], "MAIL CÔNG VỤ")
        self.assertEqual(by_id["m1"]["unit"], "Nguyễn Văn B")
        self.assertNotIn("entity", by_id["m1"])
        self.assertEqual(by_id["m1"]["password"], "abc")
        self.assertEqual(data["meetings"], [{"id": "x"}])

    def test_luu_xong_chi_con_cau_truc_moi(self):
        self.write_data({"version": 2, "dnisLogs": [OLD_DNIS], "mailLogs": [OLD_MAIL]})
        items = self.client.get("/api/data").get_json()["supportLogs"]
        qlvb = {"id": "q1", "type": "QLVB V3", "unit": "Đội C", "content": "Lỗi đăng nhập", "status": "Chưa làm", "date": "2026-05-03T01:00:00.000Z"}
        r = self.client.put("/api/data/supportLogs", json=[qlvb] + items)
        self.assertEqual(r.status_code, 200)
        with open(server.DATA_PATH, encoding="utf-8") as f:
            on_disk = json.load(f)
        self.assertNotIn("dnisLogs", on_disk)
        self.assertNotIn("mailLogs", on_disk)
        self.assertEqual(sorted(l["id"] for l in on_disk["supportLogs"]), ["d1", "m1", "q1"])
        # Đọc lại không nhân đôi.
        self.assertEqual(len(self.client.get("/api/data").get_json()["supportLogs"]), 3)

    def test_nhom_cu_khong_con_la_nhom_hop_le(self):
        self.assertEqual(self.client.put("/api/data/dnisLogs", json=[]).status_code, 404)
        self.assertEqual(self.client.put("/api/data/mailLogs", json=[]).status_code, 404)

    def test_import_file_sao_luu_cu(self):
        r = self.client.post("/api/data/import", json={"version": 2, "dossiers": [], "dnisLogs": [OLD_DNIS], "mailLogs": [OLD_MAIL]})
        self.assertEqual(r.status_code, 200)
        logs = self.client.get("/api/data").get_json()["supportLogs"]
        self.assertEqual({(l["id"], l["type"]) for l in logs}, {("d1", "DNIS"), ("m1", "MAIL CÔNG VỤ")})
        # Nhập lần hai không thêm trùng.
        self.client.post("/api/data/import", json={"dnisLogs": [OLD_DNIS], "mailLogs": [OLD_MAIL]})
        self.assertEqual(len(self.client.get("/api/data").get_json()["supportLogs"]), 2)

    def test_import_file_sao_luu_moi(self):
        qlvb = {"id": "q1", "type": "QLVB V3", "unit": "Đội C", "content": "x", "status": "Chưa làm", "date": "2026-05-03T01:00:00.000Z"}
        self.client.post("/api/data/import", json={"supportLogs": [qlvb]})
        logs = self.client.get("/api/data").get_json()["supportLogs"]
        self.assertEqual([l["id"] for l in logs], ["q1"])


if __name__ == "__main__":
    unittest.main()
