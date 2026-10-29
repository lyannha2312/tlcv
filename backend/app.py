# -*- coding: utf-8 -*-
"""
Hồ sơ công việc - PV01 (Công an thành phố Đồng Nai)
Ứng dụng chạy local bằng Flask - độc lập hoàn toàn với dự án "Sổ tay AI".

Dữ liệu lưu trong Danh_Muc_Ho_So.xlsx (cùng thư mục với app.py).
PDF của từng hồ sơ lưu trong:
    static/ho_so/{năm}/{Lĩnh vực}/{Tên thư mục hồ sơ}/{Văn bản chỉ đạo|Phụ lục|Văn bản triển khai}/*.pdf
Năm được lấy theo "Ngày VB đến" (nếu trống thì lấy theo "Ngày tạo hồ sơ").
Lĩnh vực trống sẽ được xếp vào thư mục "CHƯA PHÂN LOẠI".

Cài đặt:  pip install -r requirements.txt
Chạy:     python app.py     (hoặc bấm đúp Mo_KhoHoSo.bat)
Mở web:   http://localhost:5001
"""

import json
import os
import shutil
import threading
import time
import webbrowser
from datetime import datetime

import pandas as pd
from flask import Flask, jsonify, render_template, request, send_from_directory, abort

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(BASE_DIR, "Danh_Muc_Ho_So.xlsx")

# Cấu hình riêng của từng máy (không đưa lên GitHub) - xem config.example.json.
# HOSO_ROOT: thư mục gốc chứa hồ sơ (vd. thư mục nằm trong Google Drive).
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")


def load_config():
    if not os.path.exists(CONFIG_PATH):
        return {}
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


CONFIG = load_config()

if CONFIG.get("HOSO_ROOT"):
    HOSO_ROOT = os.path.normpath(CONFIG["HOSO_ROOT"])
    if not os.path.isdir(HOSO_ROOT):
        # Không tự tạo: đường dẫn gõ sai sẽ sinh ra một thư mục hồ sơ rỗng ở sai chỗ.
        raise SystemExit(f"[LOI] HOSO_ROOT trong config.json khong ton tai: {HOSO_ROOT}")
    # URL xem file luon la /static/ho-so/... (route serve_pdf), khong phu thuoc ten thu muc that.
    HOSO_FOLDER_NAME = "ho-so"
else:
    # Tự động đổi tên thư mục từ ho_so sang ho-so nếu có
    old_hoso_root = os.path.join(BASE_DIR, "static", "ho_so")
    new_hoso_root = os.path.join(BASE_DIR, "static", "ho-so")
    HOSO_ROOT = new_hoso_root

    if os.path.isdir(old_hoso_root):
        if not os.path.exists(new_hoso_root):
            try:
                os.rename(old_hoso_root, new_hoso_root)
                print("Da doi ten thu muc static/ho_so thanh static/ho-so thanh cong.")
            except Exception as e:
                print(f"Loi khi doi ten thu muc static/ho_so sang static/ho-so: {e}")
                print("He thong se tiep tuc su dung thu muc ho_so cu.")
                HOSO_ROOT = old_hoso_root
        else:
            HOSO_ROOT = new_hoso_root
    else:
        HOSO_ROOT = new_hoso_root

    os.makedirs(HOSO_ROOT, exist_ok=True)
    HOSO_FOLDER_NAME = os.path.basename(HOSO_ROOT)

PORT = 5001

# Cấu trúc cột chuẩn - đây là "hợp đồng" giữa Excel <-> Web.
# Nếu đổi tên cột trong Excel, phải sửa lại danh sách này cho khớp.
COLUMNS = [
    "STT",
    "Tên thư mục hồ sơ",
    "Tiêu đề công việc",
    "Lĩnh vực",
    "Trạng thái",
    "Số hiệu VB đến",
    "Ngày VB đến",
    "Nơi gửi",
    "Trích yếu VB đến",
    "Kết quả xử lý / VB tham mưu",
    "Ngày tạo hồ sơ",
    "Hạn xử lý",
    "Ghi chú",
]

LINH_VUC_OPTIONS = [
    "TRÍ TUỆ NHÂN TẠO AI",
    "KHUNG KIẾN TRÚC",
    "CHUYỂN ĐỔI SỐ",
    "TRIỂN KHAI",
    "GÓP Ý",
    "DNIS",
    "KHÁC",
]

TRANG_THAI_OPTIONS = ["Đang xử lý", "Đã hoàn thành"]

# Các loại tài liệu gắn với mỗi hồ sơ - đây cũng là tên các thư mục con trong
# thư mục tài liệu của hồ sơ đó.
CATEGORIES = ["Văn bản chỉ đạo", "Phụ lục", "Văn bản triển khai", "Báo cáo của các đơn vị"]

# Các đuôi file được phép đính kèm - khớp với danh sách "accept" trên giao diện web.
# PDF xem trước được ngay trên web; các loại còn lại chỉ tải về/mở bằng ứng dụng
# tương ứng trên máy.
ALLOWED_UPLOAD_EXTS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".jpg", ".jpeg", ".png", ".gif", ".txt", ".rtf", ".zip", ".rar",
}

KEY_COL = "Tên thư mục hồ sơ"
LINH_VUC_COL = "Lĩnh vực"
UNCLASSIFIED = "CHƯA PHÂN LOẠI"

# Tên sheet chứa dữ liệu hồ sơ trong file Excel (khớp với sheet dữ liệu trong
# file mẫu "Mau_Nhap_Ho_So.xlsx" - file mẫu đó còn có thêm 1 sheet "Hướng dẫn"
# đứng trước, nên khi nhập Excel phải đọc đúng tên sheet này, không được đọc
# đại sheet đầu tiên).
DATA_SHEET_NAME = "Danh_Muc_Ho_So"


BACKUP_DIR = os.path.join(BASE_DIR, "backups")

JSON_PATH = os.path.join(BASE_DIR, "dossiers.json")

# data.json giữ các nhóm dữ liệu ngoài hồ sơ (hồ sơ vẫn nằm ở dossiers.json).
# Tên nhóm khớp với payload của nút "Lưu lên Drive" (QLCV_Cloud_Backup.json).
DATA_PATH = os.path.join(BASE_DIR, "data.json")
DATA_COLLECTIONS = ["dnisLogs", "mailLogs", "coordLogs", "schedules", "meetings"]


class ExcelLockedException(Exception):
    pass


@app.errorhandler(ExcelLockedException)
def handle_excel_locked(e):
    return jsonify({
        "error": "Tệp Excel Danh_Muc_Ho_So.xlsx đang được mở bởi chương trình khác (như Microsoft Excel). Vui lòng đóng tệp Excel trên máy tính của bạn và thử lại."
    }), 409


def ensure_excel():
    if not os.path.exists(EXCEL_PATH):
        df = pd.DataFrame(columns=COLUMNS)
        try:
            df.to_excel(EXCEL_PATH, index=False)
        except PermissionError:
            raise ExcelLockedException()


def generate_id():
    import uuid
    return uuid.uuid4().hex[:7]


def migrate_excel_to_json():
    if os.path.exists(JSON_PATH):
        return
        
    import glob
    import json
    import re
    
    backup_files = glob.glob(os.path.join(BASE_DIR, "Backup_QLCV_*.json"))
    if not backup_files:
        backup_files = glob.glob(os.path.join(BASE_DIR, "*.json"))
        
    if not backup_files:
        with open(JSON_PATH, "w", encoding="utf-8") as f:
            json.dump({"dossiers": []}, f, ensure_ascii=False, indent=4)
        return
        
    latest_backup = max(backup_files, key=os.path.getmtime)
    try:
        with open(latest_backup, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading JSON backup: {e}")
        data = {"dossiers": []}
        
    dossiers = data.get("dossiers", [])
    
    excel_rows = []
    if os.path.exists(EXCEL_PATH):
        try:
            df = pd.read_excel(EXCEL_PATH, dtype=str).fillna("")
            excel_rows = df.to_dict(orient="records")
        except Exception as e:
            print(f"Error reading Excel during migration: {e}")
            
    for d in dossiers:
        folder_name = d.get("folderPath") or d.get("folderName", "")
        if not folder_name:
            title = str(d.get("title", "")).strip().lower()
            so_hieu = str(d.get("originalDoc", {}).get("number", "")).strip().lower() if d.get("originalDoc") else ""
            
            for row in excel_rows:
                e_title = str(row.get("Tiêu đề công việc", "")).strip().lower()
                if e_title == title:
                    folder_name = str(row.get("Tên thư mục hồ sơ", "")).strip()
                    break
                    
            if not folder_name and so_hieu:
                for row in excel_rows:
                    e_sohieu = str(row.get("Số hiệu VB đến", "")).strip().lower()
                    if e_sohieu == so_hieu:
                        folder_name = str(row.get("Tên thư mục hồ sơ", "")).strip()
                        break
                        
            if not folder_name:
                orig_doc = d.get("originalDoc") or {}
                date_den = orig_doc.get("date") or d.get("createdAt", "")[:10]
                num_den = orig_doc.get("number") or "KO-SO"
                clean_title = re.sub(r'[\\/*?:"<>|]', "", d.get("title", ""))
                clean_title = clean_title.replace(" ", "-")[:40]
                folder_name = f"{date_den}_{num_den}_{clean_title}"
            
        d["folderPath"] = folder_name
        if "folderName" in d:
            d.pop("folderName")
        
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({"version": 2, "dossiers": dossiers}, f, ensure_ascii=False, indent=4)


def load_dossiers():
    import json
    if not os.path.exists(JSON_PATH):
        migrate_excel_to_json()
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("dossiers", [])
    except Exception as e:
        print(f"Error loading dossiers.json: {e}")
        return []


def save_dossiers(dossiers):
    import json
    if os.path.exists(JSON_PATH):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        backup_file = os.path.join(BACKUP_DIR, f"dossiers_{timestamp}.json")
        try:
            shutil.copy2(JSON_PATH, backup_file)
        except Exception as e:
            print(f"Warning: Could not create JSON backup: {e}")
            
        try:
            backups = sorted(
                [os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR) if f.startswith("dossiers_") and f.endswith(".json")],
                key=os.path.getmtime
            )
            while len(backups) > 10:
                oldest = backups.pop(0)
                try:
                    os.remove(oldest)
                except Exception:
                    pass
        except Exception as e:
            print(f"Warning: Could not clean up old backups: {e}")
            
    temp_path = JSON_PATH + ".tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump({"version": 2, "dossiers": dossiers}, f, ensure_ascii=False, indent=4)
        if os.path.exists(JSON_PATH):
            os.remove(JSON_PATH)
        os.rename(temp_path, JSON_PATH)
    except Exception as e:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        raise Exception(f"Không thể ghi file JSON: {e}")


def load_data():
    """Đọc data.json; thiếu file hoặc thiếu nhóm nào thì trả về danh sách rỗng cho nhóm đó."""
    import json
    data = {}
    if os.path.exists(DATA_PATH):
        try:
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            # Không trả rỗng âm thầm: lần ghi sau sẽ đè mất dữ liệu đang có trong file hỏng.
            raise Exception(f"Không đọc được data.json: {e}")
    return {name: data.get(name) if isinstance(data.get(name), list) else [] for name in DATA_COLLECTIONS}


def save_data(data):
    import json
    if os.path.exists(DATA_PATH):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        try:
            shutil.copy2(DATA_PATH, os.path.join(BACKUP_DIR, f"data_{timestamp}.json"))
            backups = sorted(
                [os.path.join(BACKUP_DIR, f) for f in os.listdir(BACKUP_DIR) if f.startswith("data_") and f.endswith(".json")],
                key=os.path.getmtime
            )
            while len(backups) > 10:
                os.remove(backups.pop(0))
        except Exception as e:
            print(f"Warning: Could not back up data.json: {e}")

    payload = {"version": 2}
    payload.update({name: data.get(name, []) for name in DATA_COLLECTIONS})
    temp_path = DATA_PATH + ".tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=4)
        os.replace(temp_path, DATA_PATH)
    except Exception as e:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        raise Exception(f"Không thể ghi file data.json: {e}")


def merge_by_id(current, incoming, prepend=False):
    """Gộp theo id như mergeById ở frontend: mục trùng id được cập nhật, mục mới được thêm, mục cũ không bị xóa."""
    inc_map = {x["id"]: x for x in incoming if isinstance(x, dict) and x.get("id")}
    cur_ids = {x.get("id") for x in current if isinstance(x, dict)}
    updated = 0
    merged = []
    for item in current:
        other = inc_map.get(item.get("id")) if isinstance(item, dict) else None
        if other is not None:
            updated += 1
            merged.append({**item, **other})
        else:
            merged.append(item)
    new_items = [x for x in incoming if not (isinstance(x, dict) and x.get("id") and x["id"] in cur_ids)]
    items = new_items + merged if prepend else merged + new_items
    return items, {"added": len(new_items), "updated": updated, "kept": len(current) - updated}


def dossier_to_excel_record(d):
    orig = d.get("originalDoc", {}) or {}
    status_map = {
        "active": "Đang xử lý",
        "archived": "Đã hoàn thành"
    }
    raw_status = d.get("status", "active")
    status = status_map.get(raw_status, raw_status)
    
    created_at = d.get("createdAt", "")
    if created_at and "T" in created_at:
        created_at = created_at.split("T")[0]
        
    return {
        "STT": "",
        "Tên thư mục hồ sơ": d.get("folderPath") or d.get("folderName", ""),
        "Tiêu đề công việc": d.get("title", ""),
        "Lĩnh vực": d.get("category", ""),
        "Trạng thái": status,
        "Số hiệu VB đến": orig.get("number", ""),
        "Ngày VB đến": orig.get("date", ""),
        "Nơi gửi": orig.get("sender", ""),
        "Trích yếu VB đến": orig.get("summary", ""),
        "Kết quả xử lý / VB tham mưu": d.get("finalResult", ""),
        "Ngày tạo hồ sơ": created_at,
        "Hạn xử lý": d.get("deadline", ""),
        "Ghi chú": d.get("note", d.get("Ghi chú", ""))
    }


def excel_record_to_dossier(payload, existing_dossier=None):
    if existing_dossier is None:
        existing_dossier = {
            "id": generate_id(),
            "relatedDocs": [],
            "tasks": []
        }
        
    status_map = {
        "Đang xử lý": "active",
        "Đã hoàn thành": "archived"
    }
    raw_status = payload.get("Trạng thái", "Đang xử lý")
    status = status_map.get(raw_status, "active")
    
    existing_dossier["folderPath"] = payload.get("Tên thư mục hồ sơ", "").strip()
    if "folderName" in existing_dossier:
        existing_dossier.pop("folderName")
    existing_dossier["title"] = payload.get("Tiêu đề công việc", "").strip()
    existing_dossier["category"] = payload.get("Lĩnh vực", "").strip()
    existing_dossier["status"] = status
    existing_dossier["finalResult"] = payload.get("Kết quả xử lý / VB tham mưu", "").strip()
    existing_dossier["deadline"] = payload.get("Hạn xử lý", "").strip()
    existing_dossier["note"] = payload.get("Ghi chú", "").strip()
    
    created_date = payload.get("Ngày tạo hồ sơ", "").strip()
    if created_date:
        existing_dossier["createdAt"] = f"{created_date}T00:00:00.000Z"
    elif "createdAt" not in existing_dossier:
        existing_dossier["createdAt"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000Z")
        
    orig = existing_dossier.setdefault("originalDoc", {})
    if not orig:
        orig = {}
        existing_dossier["originalDoc"] = orig
    orig["number"] = payload.get("Số hiệu VB đến", "").strip()
    orig["date"] = payload.get("Ngày VB đến", "").strip()
    orig["sender"] = payload.get("Nơi gửi", "").strip()
    orig["summary"] = payload.get("Trích yếu VB đến", "").strip()
    
    return existing_dossier


def record_year(row):
    for field in ("Ngày VB đến", "Ngày tạo hồ sơ"):
        val = str(row.get(field, "")).strip()
        if len(val) >= 4 and val[:4].isdigit():
            return val[:4]
    return str(datetime.now().year)


def folder_path_for(row):
    """Hồ sơ được lưu theo cấu trúc: static/ho_so/{năm}/{lĩnh vực}/{tên thư mục hồ sơ}/"""
    year = record_year(row)
    linh_vuc = str(row.get(LINH_VUC_COL, "")).strip() or UNCLASSIFIED
    folder_name = str(row.get(KEY_COL, "")).strip()
    return os.path.join(HOSO_ROOT, year, linh_vuc, folder_name), year, linh_vuc, folder_name


def get_hoso_files_map():
    """Duyệt qua HOSO_ROOT một lần để lấy danh sách tất cả file trên đĩa,
       tránh việc thực hiện hàng trăm lệnh gọi hệ thống (I/O) listdir.
    """
    files_map = {}
    if not os.path.exists(HOSO_ROOT):
        return files_map
    for root, dirs, files in os.walk(HOSO_ROOT):
        rel_path = os.path.relpath(root, HOSO_ROOT)
        if rel_path == ".":
            continue
        parts = rel_path.split(os.sep)
        if len(parts) == 4:
            year, linh_vuc, folder_name, cat = parts
            if cat in CATEGORIES:
                allowed_files = sorted(
                    f for f in files
                    if os.path.splitext(f)[1].lower() in ALLOWED_UPLOAD_EXTS
                )
                files_map.setdefault(year, {}).setdefault(linh_vuc, {}).setdefault(folder_name, {})[cat] = allowed_files
    return files_map


def list_pdfs_for_row(row, files_map=None):
    """Trả về dict {category: [{"fileName":.., "url":..}, ...]} cho các loại tài liệu."""
    folder, year, linh_vuc, folder_name = folder_path_for(row)
    if not folder_name:
        return {}
    
    # Xác định các thư mục hiển thị cho hồ sơ này
    # "Báo cáo của các đơn vị" chỉ được hiển thị nếu tồn tại trên đĩa
    has_bc = False
    if files_map is not None:
        has_bc = "Báo cáo của các đơn vị" in files_map.get(year, {}).get(linh_vuc, {}).get(folder_name, {})
    else:
        has_bc = os.path.isdir(os.path.join(folder, "Báo cáo của các đơn vị"))
        
    active_categories = ["Văn bản chỉ đạo", "Phụ lục", "Văn bản triển khai"]
    if has_bc:
        active_categories.append("Báo cáo của các đơn vị")
    
    result = {}
    for cat in active_categories:
        if files_map is not None:
            files = files_map.get(year, {}).get(linh_vuc, {}).get(folder_name, {}).get(cat, [])
            result[cat] = [
                {
                    "fileName": f,
                    "url": f"/static/{HOSO_FOLDER_NAME}/{year}/{linh_vuc}/{folder_name}/{cat}/{f}",
                }
                for f in files
            ]
        else:
            cat_dir = os.path.join(folder, cat)
            if not os.path.isdir(cat_dir):
                result[cat] = []
                continue
            files = sorted(
                f for f in os.listdir(cat_dir)
                if os.path.splitext(f)[1].lower() in ALLOWED_UPLOAD_EXTS
            )
            result[cat] = [
                {
                    "fileName": f,
                    "url": f"/static/{HOSO_FOLDER_NAME}/{year}/{linh_vuc}/{folder_name}/{cat}/{f}",
                }
                for f in files
            ]
    return result


def ensure_category_dirs(base_folder):
    # Chỉ tự động tạo 3 thư mục mặc định khi tạo mới/import
    for cat in ["Văn bản chỉ đạo", "Phụ lục", "Văn bản triển khai"]:
        os.makedirs(os.path.join(base_folder, cat), exist_ok=True)


@app.route("/")
def index():
    return render_template(
        "index.html",
        linh_vuc_options=LINH_VUC_OPTIONS,
        trang_thai_options=TRANG_THAI_OPTIONS,
        categories=CATEGORIES,
    )


@app.route("/api/ho_so", methods=["GET"])
def api_list():
    dossiers = load_dossiers()
    records = [dossier_to_excel_record(d) for d in dossiers]
    for i, r in enumerate(records, 1):
        r["STT"] = str(i)
    files_map = get_hoso_files_map()
    for r in records:
        r["pdfs"] = list_pdfs_for_row(r, files_map)
        r["_year"] = record_year(r)
    return jsonify(records)


@app.route("/api/ho_so", methods=["POST"])
def api_create():
    payload = request.get_json(force=True)
    dossiers = load_dossiers()

    key = str(payload.get(KEY_COL, "")).strip()
    if not key:
        return jsonify({"error": f'"{KEY_COL}" không được để trống'}), 400
        
    if any(str(d.get("folderPath") or d.get("folderName", "")).strip() == key for d in dossiers):
        return jsonify({"error": f'Tên thư mục hồ sơ "{key}" đã tồn tại'}), 400

    new_dossier = excel_record_to_dossier(payload)
    dossiers.append(new_dossier)
    save_dossiers(dossiers)

    new_row = dossier_to_excel_record(new_dossier)
    folder, _, _, folder_name = folder_path_for(new_row)
    if folder_name:
        ensure_category_dirs(folder)

    return jsonify({"ok": True})


@app.route("/api/ho_so/<path:old_key>", methods=["PUT"])
def api_update(old_key):
    payload = request.get_json(force=True)
    dossiers = load_dossiers()

    target_dossier = None
    for d in dossiers:
        if (d.get("folderPath") or d.get("folderName", "")) == old_key:
            target_dossier = d
            break
            
    if not target_dossier:
        return jsonify({"error": "Không tìm thấy hồ sơ"}), 404

    new_key = str(payload.get(KEY_COL, "")).strip()
    if not new_key:
        return jsonify({"error": f'"{KEY_COL}" không được để trống'}), 400
    if new_key != old_key and any((d.get("folderPath") or d.get("folderName", "")) == new_key for d in dossiers):
        return jsonify({"error": f'Tên thư mục hồ sơ "{new_key}" đã tồn tại'}), 400

    old_row = dossier_to_excel_record(target_dossier)
    old_folder, _, _, _ = folder_path_for(old_row)

    excel_record_to_dossier(payload, target_dossier)

    new_row = dossier_to_excel_record(target_dossier)
    new_folder, _, _, new_folder_name = folder_path_for(new_row)

    if old_folder != new_folder:
        if os.path.isdir(old_folder):
            os.makedirs(os.path.dirname(new_folder), exist_ok=True)
            os.rename(old_folder, new_folder)
            ensure_category_dirs(new_folder)
        elif new_folder_name:
            ensure_category_dirs(new_folder)

    save_dossiers(dossiers)
    return jsonify({"ok": True})


@app.route("/api/ho_so/<path:key>", methods=["DELETE"])
def api_delete(key):
    dossiers = load_dossiers()
    if not any((d.get("folderPath") or d.get("folderName", "")) == key for d in dossiers):
        return jsonify({"error": "Không tìm thấy hồ sơ"}), 404
        
    dossiers = [d for d in dossiers if (d.get("folderPath") or d.get("folderName", "")) != key]
    save_dossiers(dossiers)
    return jsonify({"ok": True})


@app.route("/api/ho_so/open_root", methods=["POST"])
def api_open_root():
    os.makedirs(HOSO_ROOT, exist_ok=True)
    try:
        import subprocess
        subprocess.Popen(["explorer.exe", os.path.normpath(HOSO_ROOT)])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": f"Không thể mở thư mục gốc: {e}"}), 500


@app.route("/api/ho_so/<path:key>/open_folder", methods=["POST"])
def api_open_folder(key):
    dossiers = load_dossiers()
    target_dossier = None
    for d in dossiers:
        if (d.get("folderPath") or d.get("folderName", "")) == key:
            target_dossier = d
            break
            
    if not target_dossier:
        return jsonify({"error": "Không tìm thấy hồ sơ"}), 404
        
    row = dossier_to_excel_record(target_dossier)
    folder, _, _, _ = folder_path_for(row)
    os.makedirs(folder, exist_ok=True)
    try:
        import subprocess
        subprocess.Popen(["explorer.exe", os.path.normpath(folder)])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": f"Không thể mở thư mục hồ sơ: {e}"}), 500


@app.route("/api/ho_so/export", methods=["GET"])
def api_export():
    try:
        dossiers = load_dossiers()
        import json
        from flask import make_response
        
        export_data = {"version": 2, "dossiers": dossiers}
        json_str = json.dumps(export_data, ensure_ascii=False, indent=4)
        
        response = make_response(json_str)
        current_date = datetime.now().strftime("%Y-%m-%d")
        response.headers["Content-Disposition"] = f"attachment; filename=Backup_QLCV_{current_date}.json"
        response.headers["Content-Type"] = "application/json; charset=utf-8"
        return response
    except Exception as e:
        return jsonify({"error": f"Không thể xuất file JSON: {e}"}), 500


@app.route("/api/ho_so/import", methods=["POST"])
def api_import():
    if "file" not in request.files:
        return jsonify({"error": "Chưa chọn file"}), 400
    f = request.files["file"]
    
    try:
        import json
        data = json.load(f)
    except Exception as e:
        return jsonify({"error": f"Không đọc được file JSON: {e}"}), 400

    if isinstance(data, dict):
        imported_dossiers = data.get("dossiers", [])
    elif isinstance(data, list):
        imported_dossiers = data
    else:
        return jsonify({"error": "Định dạng file JSON không hợp lệ"}), 400

    if not isinstance(imported_dossiers, list):
        return jsonify({"error": "Danh sách hồ sơ (dossiers) không hợp lệ"}), 400

    dossiers = load_dossiers()
    
    id_map = {d["id"]: d for d in dossiers if d.get("id")}
    folder_map = {}
    for d in dossiers:
        f_val = d.get("folderPath") or d.get("folderName")
        if f_val:
            folder_map[f_val] = d
    
    updated_count = 0
    added_count = 0
    
    for item in imported_dossiers:
        if not isinstance(item, dict):
            continue
            
        matched_dossier = None
        item_id = item.get("id")
        item_folder = item.get("folderPath") or item.get("folderName")
        
        if item_id and item_id in id_map:
            matched_dossier = id_map[item_id]
        elif item_folder and item_folder in folder_map:
            matched_dossier = folder_map[item_folder]
            
        if matched_dossier:
            existing_id = matched_dossier.get("id") or generate_id()
            matched_dossier.clear()
            matched_dossier.update(item)
            if "folderName" in matched_dossier:
                f_name = matched_dossier.pop("folderName")
                if not matched_dossier.get("folderPath"):
                    matched_dossier["folderPath"] = f_name
            matched_dossier["id"] = existing_id
            updated_count += 1
        else:
            new_item = item.copy()
            if "id" not in new_item or not new_item["id"]:
                new_item["id"] = generate_id()
            if "folderName" in new_item:
                f_name = new_item.pop("folderName")
                if not new_item.get("folderPath"):
                    new_item["folderPath"] = f_name
            dossiers.append(new_item)
            id_map[new_item["id"]] = new_item
            f_val = new_item.get("folderPath")
            if f_val:
                folder_map[f_val] = new_item
            added_count += 1

    save_dossiers(dossiers)

    # Đảm bảo cấu trúc thư mục đầy đủ cho tất cả hồ sơ sau khi import
    for d in dossiers:
        row = dossier_to_excel_record(d)
        folder, _, _, folder_name = folder_path_for(row)
        if folder_name:
            ensure_category_dirs(folder)

    return jsonify({"ok": True, "count": len(dossiers), "added": added_count, "updated": updated_count})


def safe_pdf_filename(raw):
    return os.path.basename(str(raw or "").strip())


@app.route("/api/ho_so/<path:key>/create_category", methods=["POST"])
def api_create_category(key):
    dossiers = load_dossiers()
    target_dossier = None
    for d in dossiers:
        if (d.get("folderPath") or d.get("folderName", "")) == key:
            target_dossier = d
            break
            
    if not target_dossier:
        return jsonify({"error": "Không tìm thấy hồ sơ"}), 404

    payload = request.get_json(force=True)
    category = str(payload.get("category", "")).strip()
    if not category:
        return jsonify({"error": "Tên thư mục không được để trống"}), 400
        
    if category not in CATEGORIES:
        return jsonify({"error": "Thư mục không hợp lệ"}), 400

    row = dossier_to_excel_record(target_dossier)
    folder, _, _, _ = folder_path_for(row)
    cat_dir = os.path.join(folder, category)
    try:
        os.makedirs(cat_dir, exist_ok=True)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": f"Không thể tạo thư mục: {e}"}), 500


@app.route("/api/ho_so/<path:key>/upload", methods=["POST"])
def api_upload_pdf(key):
    dossiers = load_dossiers()
    target_dossier = None
    for d in dossiers:
        if (d.get("folderPath") or d.get("folderName", "")) == key:
            target_dossier = d
            break
            
    if not target_dossier:
        return jsonify({"error": "Không tìm thấy hồ sơ"}), 404

    category = str(request.form.get("category", "")).strip()
    if category not in CATEGORIES:
        return jsonify({"error": "Loại tài liệu không hợp lệ"}), 400

    row = dossier_to_excel_record(target_dossier)
    folder, _, _, _ = folder_path_for(row)
    cat_dir = os.path.join(folder, category)
    os.makedirs(cat_dir, exist_ok=True)

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "Chưa chọn file"}), 400

    saved = []
    skipped = []
    for f in files:
        if not f or not f.filename:
            continue
        filename = safe_pdf_filename(f.filename)
        base, ext = os.path.splitext(filename)
        if ext.lower() not in ALLOWED_UPLOAD_EXTS:
            skipped.append(filename)
            continue
        dest = os.path.join(cat_dir, filename)
        i = 1
        while os.path.exists(dest):
            dest = os.path.join(cat_dir, f"{base}({i}){ext}")
            i += 1
        f.save(dest)
        saved.append(os.path.basename(dest))

    if not saved and not skipped:
        return jsonify({"error": "Chưa chọn file"}), 400

    return jsonify({"ok": True, "saved": saved, "skipped": skipped})


@app.route("/api/ho_so/<path:key>/pdf/<string:category>/<path:filename>", methods=["DELETE"])
def api_delete_pdf(key, category, filename):
    if category not in CATEGORIES:
        return jsonify({"error": "Loại tài liệu không hợp lệ"}), 400

    dossiers = load_dossiers()
    target_dossier = None
    for d in dossiers:
        if (d.get("folderPath") or d.get("folderName", "")) == key:
            target_dossier = d
            break
            
    if not target_dossier:
        return jsonify({"error": "Không tìm thấy hồ sơ"}), 404

    row = dossier_to_excel_record(target_dossier)
    folder, _, _, _ = folder_path_for(row)
    safe_name = safe_pdf_filename(filename)
    target = os.path.join(folder, category, safe_name)

    if not os.path.isfile(target):
        return jsonify({"error": "Không tìm thấy file"}), 404

    os.remove(target)
    return jsonify({"ok": True})


@app.route("/api/ho_so/<path:key>/timeline_details", methods=["GET"])
def api_timeline_details(key):
    dossiers = load_dossiers()
    target_dossier = None
    for d in dossiers:
        if (d.get("folderPath") or d.get("folderName", "")) == key:
            target_dossier = d
            break
            
    if not target_dossier:
        return jsonify({
            "found": False,
            "message": "Không tìm thấy dữ liệu chi tiết của hồ sơ này."
        })
        
    events = []
    
    # 1. Original Doc
    orig = target_dossier.get("originalDoc", {})
    orig_date = (orig.get("date") if orig else None) or target_dossier.get("createdAt", "")[:10]
    if orig:
        content_html = f"<b>Số hiệu:</b> {orig.get('number') or '—'}<br>"
        content_html += f"<b>Nơi gửi:</b> {orig.get('sender') or '—'}<br>"
        content_html += f"<b>Trích yếu:</b> {orig.get('summary') or '—'}"
        if orig.get("content"):
            content_html += f"<br><b>Ý kiến chỉ đạo:</b> {orig.get('content')}"
            
        events.append({
            "date": orig_date,
            "type": "original_doc",
            "icon": "fa-file-import",
            "title": "Văn bản đến (Khởi tạo hồ sơ)",
            "content": content_html
        })
    else:
        events.append({
            "date": target_dossier.get("createdAt", "")[:10],
            "type": "created",
            "icon": "fa-folder-plus",
            "title": "Khởi tạo hồ sơ",
            "content": "Bắt đầu thụ lý hồ sơ."
        })
        
    # 2. Related Docs
    for doc in target_dossier.get("relatedDocs", []):
        doc_type = doc.get("type")
        added_at = doc.get("addedAt", "")
        date_str = doc.get("date") or added_at[:10] or "—"
        
        if doc_type == "progress":
            events.append({
                "date": date_str,
                "type": "progress",
                "icon": "fa-spinner",
                "title": "Cập nhật tiến độ",
                "content": doc.get("content") or "—"
            })
        else:
            content_html = f"<b>Số hiệu:</b> {doc.get('number') or '—'}<br>"
            content_html += f"<b>Trích yếu:</b> {doc.get('content') or '—'}"
            if doc.get("sender"):
                content_html += f"<br><b>Nơi gửi:</b> {doc.get('sender')}"
            if doc.get("note"):
                content_html += f"<br><b>Ghi chú:</b> {doc.get('note')}"
                
            doc_label = doc.get("docType") or "Văn bản liên quan"
            events.append({
                "date": date_str,
                "type": "document",
                "icon": "fa-file-lines",
                "title": f"Đính kèm: {doc_label}",
                "content": content_html
            })
            
    # 3. Tasks
    for task in target_dossier.get("tasks", []):
        created_at = task.get("createdAt", "")
        if created_at:
            events.append({
                "date": created_at[:10],
                "type": "task_created",
                "icon": "fa-tasks",
                "title": "Giao nhiệm vụ",
                "content": f"Giao nhiệm vụ: <b>{task.get('title') or '—'}</b>"
            })
            
        completed_at = task.get("completedAt", "")
        if task.get("isCompleted") and completed_at:
            events.append({
                "date": completed_at[:10],
                "type": "task_completed",
                "icon": "fa-check-double",
                "title": "Hoàn thành nhiệm vụ",
                "content": f"Đã hoàn thành: <b>{task.get('title') or '—'}</b>"
            })
            
    # 4. Closed / Final Result
    final_result = target_dossier.get("finalResult")
    closed_at = target_dossier.get("closedAt")
    if closed_at or final_result:
        date_str = closed_at[:10] if closed_at else "—"
        content_html = ""
        if final_result:
            content_html = f"<b>Kết quả tham mưu:</b> {final_result}"
        else:
            content_html = "Hồ sơ hoàn thành và đóng lại."
            
        events.append({
            "date": date_str,
            "type": "closed",
            "icon": "fa-box-archive",
            "title": "Hoàn thành / Đóng hồ sơ",
            "content": content_html
        })
        
    def sort_key(e):
        d = e["date"]
        if not d or d == "—":
            return "9999-12-31"
        return d[:10]
        
    events.sort(key=sort_key)
    
    for e in events:
        d = e["date"]
        if d and len(d) >= 10 and d[:4].isdigit():
            e["formatted_date"] = f"{d[8:10]}/{d[5:7]}/{d[:4]}"
        else:
            e["formatted_date"] = d
            
    return jsonify({
        "found": True,
        "title": target_dossier.get("title"),
        "id": target_dossier.get("id"),
        "events": events
    })


@app.route("/api/data", methods=["GET"])
def api_data_get():
    try:
        return jsonify(load_data())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/data/<name>", methods=["PUT"])
def api_data_put(name):
    """Thay toàn bộ một nhóm (dnisLogs, mailLogs, ...) bằng danh sách gửi lên."""
    if name not in DATA_COLLECTIONS:
        return jsonify({"error": f"Nhóm dữ liệu không hợp lệ: {name}"}), 404
    items = request.get_json(silent=True)
    if not isinstance(items, list) or not all(isinstance(x, dict) for x in items):
        return jsonify({"error": "Dữ liệu gửi lên phải là danh sách các đối tượng JSON."}), 400
    try:
        data = load_data()
        data[name] = items
        save_data(data)
        return jsonify({"ok": True, "count": len(items)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/data/import", methods=["POST"])
def api_data_import():
    """Gộp các nhóm dữ liệu từ một file Backup_QLCV / QLCV_Cloud_Backup.json theo id, không ghi đè mục đang có."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "File sao lưu không hợp lệ."}), 400
    try:
        data = load_data()
        stats = {}
        for name in DATA_COLLECTIONS:
            incoming = body.get(name)
            if not isinstance(incoming, list):
                continue
            # Danh sách hiển thị mục mới nhất ở đầu nên mục mới phải chèn lên đầu.
            data[name], stats[name] = merge_by_id(data[name], incoming, prepend=True)
        save_data(data)
        return jsonify({"ok": True, "stats": stats})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/static/ho-so/<path:subpath>")
@app.route("/static/ho_so/<path:subpath>")
def serve_pdf(subpath):
    full_path = os.path.join(HOSO_ROOT, subpath)
    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)
    if not os.path.isfile(full_path):
        abort(404)
    return send_from_directory(directory, filename)


def open_browser():
    time.sleep(1.2)
    webbrowser.open(f"http://localhost:{PORT}")


if __name__ == "__main__":
    threading.Thread(target=open_browser).start()
    app.run(host="0.0.0.0", port=PORT, debug=False)
