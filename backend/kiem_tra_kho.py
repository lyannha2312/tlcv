"""Kiểm tra kho hồ sơ (CHỈ ĐỌC): đối chiếu dossiers.json với thư mục thật trên đĩa.

Không sửa, không xóa, không di chuyển bất cứ thứ gì. Chỉ in tóm tắt ra màn hình
và ghi báo cáo HTML (bao_cao_kho.html) để duyệt từng mục trước khi dọn.

Chạy:  python kiem_tra_kho.py
"""
import difflib
import html
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
# Tên thư mục con chuẩn: tên mới (có số thứ tự) và tên cũ vẫn nhận ra cho hồ sơ chưa đổi tên.
NEW_NAMES = ["1_Chỉ đạo", "2_Phụ lục", "3_Báo cáo đơn vị", "4_Triển khai", "5_Bản nháp"]
OLD_NAMES = ["Văn bản chỉ đạo", "Phụ lục", "Báo cáo của các đơn vị", "Văn bản triển khai"]
CATEGORIES = NEW_NAMES + OLD_NAMES
REQUIRED_WHEN_CLOSED = {"văn bản chỉ đạo": ("1_Chỉ đạo", "Văn bản chỉ đạo"), "văn bản triển khai": ("4_Triển khai", "Văn bản triển khai")}
ALLOWED_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
                ".jpg", ".jpeg", ".png", ".gif", ".txt", ".rtf", ".zip", ".rar"}
OWN_SENDERS = {"pv01", "catp", "đucatp", "ducatp", "pv01-tmth"}
FORBIDDEN = set('<>:"|?*\\/')
YEAR_DIRS = {"2025", "2026"}

# Gợi ý quy docType cũ về 4 loại chuẩn (đúng bằng 4 thư mục).
DOCTYPE_MAP = {
    "văn bản kết quả": "Văn bản triển khai",
    "văn bản chỉ đạo": "Văn bản chỉ đạo",
    "văn bản chỉ đạo mới": "Văn bản chỉ đạo",
    "căn cứ chỉ đạo": "Văn bản chỉ đạo",
    "phụ lục ban hành kèm theo quyết định": "Phụ lục",
}


def load_config():
    path = os.path.join(HERE, "config.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def slug(s):
    import unicodedata
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").replace("đ", "d").replace("Đ", "D").lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def number_token(name):
    """Lấy phần 'số-ký hiệu' sau tiền tố ngày: 2026-05-06_1012-PX01-D1_xxx -> 1012-px01-d1."""
    m = re.match(r"\d{4}-\d{2}-\d{2}_([^_]+)", name)
    return slug(m.group(1)) if m else ""


def dossier_year(h):
    od = h.get("originalDoc") or {}
    for v in (od.get("date"), h.get("createdAt")):
        if v and len(v) >= 4 and v[:4].isdigit():
            return v[:4]
    return str(datetime.now().year)


def tree_has_files(path):
    return any(files for _, _, files in os.walk(path))


def list_files(path):
    out = []
    for r, _, fs in os.walk(path):
        for f in fs:
            full = os.path.join(r, f)
            out.append((os.path.relpath(full, path), os.path.getsize(full)))
    return out


def main():
    cfg = load_config()
    root = os.path.normpath(cfg.get("HOSO_ROOT") or os.path.join(HERE, "static", "ho-so"))
    stale_root = os.path.join(HERE, "static", "ho-so")
    with open(os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else "dossiers.json"), encoding="utf-8") as f:
        dossiers = json.load(f)["dossiers"]

    sections = []  # (tiêu đề, mô tả, [hàng], [cột])

    def add(title, note, header, rows):
        sections.append((title, note, header, rows))

    # ---- Dựng bản đồ thư mục thật: depth 3 = năm/chuyên đề/hồ sơ ----
    disk = {}            # (năm, chuyên đề, tên) -> đường dẫn
    loose_in_topic = []  # file lẻ nằm ở cấp chuyên đề
    root_extras = []     # thứ lạ ở gốc kho
    for name in sorted(os.listdir(root)):
        p = os.path.join(root, name)
        if name not in YEAR_DIRS:
            root_extras.append((name, "thư mục" if os.path.isdir(p) else "file"))
            continue
        for topic in sorted(os.listdir(p)):
            tp = os.path.join(p, topic)
            if not os.path.isdir(tp):
                loose_in_topic.append((f"{name}/{topic}", os.path.getsize(tp)))
                continue
            for item in sorted(os.listdir(tp)):
                ip = os.path.join(tp, item)
                if os.path.isdir(ip):
                    disk[(name, topic, item)] = ip
                else:
                    loose_in_topic.append((f"{name}/{topic}/{item}", os.path.getsize(ip)))

    by_name = defaultdict(list)
    for key in disk:
        by_name[key[2]].append(key)

    # ---- A. Hồ sơ -> thư mục ----
    claimed = set()
    rows_a = []
    state = Counter()
    for h in dossiers:
        fp = h.get("folderPath") or ""
        key = (dossier_year(h), h.get("category", ""), fp)
        nfiles = None
        if key in disk:
            claimed.add(key)
            nfiles = len(list_files(disk[key]))
            if nfiles == 0:
                state["rỗng"] += 1
                other = [k for k in by_name.get(fp.split("/")[-1], []) if k != key]
                extra = "; file có thể nằm ở: " + "; ".join(f"{k[0]}/{k[1]} ({len(list_files(disk[k]))} file)" for k in other) if other else ""
                for k in other:
                    claimed.add(k)
                rows_a.append((h["status"], h.get("category"), fp, "Thư mục RỖNG" + extra))
            else:
                state["ok"] += 1
            continue
        elsewhere = [k for k in by_name.get(fp.split("/")[-1], [])]
        if elsewhere:
            for k in elsewhere:
                claimed.add(k)
            where = "; ".join(f"{k[0]}/{k[1]} ({len(list_files(disk[k]))} file)" for k in elsewhere)
            state["sai chuyên đề/năm"] += 1
            rows_a.append((h["status"], h.get("category"), fp, f"Thư mục nằm ở chỗ khác: {where}"))
        else:
            state["không có thư mục"] += 1
            rows_a.append((h["status"], h.get("category"), fp, "KHÔNG tìm thấy thư mục nào"))
    add("A. Hồ sơ không khớp thư mục trên đĩa",
        "Đường dẫn kỳ vọng = năm / chuyên đề / tên thư mục. Hồ sơ đã đóng mà thư mục rỗng hoặc sai chỗ thì không xem được file.",
        ["Trạng thái", "Chuyên đề khai", "Tên thư mục hồ sơ", "Vấn đề"], rows_a)

    # ---- B. Thư mục mồ côi ----
    rows_b = []
    for key, path in sorted(disk.items()):
        if key in claimed:
            continue
        files = list_files(path)
        tok = number_token(key[2])
        cand = [h["folderPath"] for h in dossiers
                if (tok and number_token(h["folderPath"]) == tok)
                or difflib.SequenceMatcher(None, slug(h["folderPath"]), slug(key[2])).ratio() > 0.75]
        rows_b.append((f"{key[0]}/{key[1]}", key[2], len(files),
                       "; ".join(cand) if cand else "— không có hồ sơ giống —"))
    add("B. Thư mục trên đĩa không thuộc hồ sơ nào",
        "Hoặc hồ sơ chưa được tạo trong hệ thống, hoặc là bản trùng/tên cũ của một hồ sơ đã có (cột cuối).",
        ["Năm/Chuyên đề", "Tên thư mục", "Số file", "Hồ sơ giống nhất"], rows_b)

    # ---- C. File lẻ, thứ lạ ở gốc ----
    rows_c = [("File lẻ ở cấp chuyên đề", p, f"{s // 1024} KB") for p, s in loose_in_topic]
    rows_c += [("Ở gốc kho", n, k) for n, k in root_extras]
    add("C. File lẻ và thứ không thuộc cấu trúc năm/chuyên đề/hồ sơ",
        "Cần quyết: gắn vào hồ sơ nào, hay chuyển sang một thư mục tham khảo riêng (ví dụ _ThamKhao).",
        ["Loại", "Đường dẫn", "Ghi chú"], rows_c)

    # ---- D. File bên trong hồ sơ: vị trí/đuôi ----
    rows_d = []
    dup_rows = []
    for key, path in sorted(disk.items()):
        seen = defaultdict(list)
        for rel, size in list_files(path):
            parts = rel.split(os.sep)
            ext = os.path.splitext(rel)[1].lower()
            if re.match(r"^\.~lock\.", parts[-1]):
                rows_d.append((key[2], rel, "File khóa tạm của LibreOffice — nên xóa"))
                continue
            if len(parts) == 1:
                rows_d.append((key[2], rel, "Nằm ở gốc hồ sơ, ngoài 4 thư mục chuẩn"))
            elif parts[0] not in CATEGORIES:
                rows_d.append((key[2], rel, "Nằm trong thư mục không chuẩn"))
            elif len(parts) > 2:
                rows_d.append((key[2], rel, "Thư mục con lồng nhau (giao diện không đọc)"))
            elif ext not in ALLOWED_EXTS:
                rows_d.append((key[2], rel, f"Đuôi {ext or '(không có)'} không được hiển thị"))
            seen[(re.sub(r"\s*(-\s*copy|\(\d+\))$", "", os.path.splitext(parts[-1])[0].lower()), ext)].append((rel, size))
            seen[("#size", size, ext)].append((rel, size))
        for k, lst in seen.items():
            cats = {x[0].split(os.sep)[0] for x in lst}
            if len(lst) > 1 and (k[0] != "#size" or len(cats) > 1):
                dup_rows.append((key[2], " | ".join(x[0] for x in lst)))
    add("D. File nằm sai chỗ hoặc không hiển thị được",
        "Giao diện chỉ đọc file đuôi chuẩn nằm trực tiếp trong 4 thư mục chuẩn.",
        ["Hồ sơ", "File", "Vấn đề"], rows_d)
    seen_pairs, dup_unique = set(), []
    for r in dup_rows:
        if r not in seen_pairs:
            seen_pairs.add(r)
            dup_unique.append(r)
    add("E. File có khả năng trùng lặp trong cùng hồ sơ",
        "Cùng tên (bỏ '(1)', '- Copy') hoặc cùng dung lượng và đuôi nhưng nằm ở thư mục khác nhau. Chỉ là gợi ý, cần mắt người xác nhận.",
        ["Hồ sơ", "Các file nghi trùng"], dup_unique)

    # ---- E2. File xung đột do đồng bộ Drive ----
    rows_e2 = []
    for r, _, fs in os.walk(root):
        for f in fs:
            if re.search(r"conflicted copy|\.~lock\.", f, re.I):
                rows_e2.append((os.path.relpath(os.path.join(r, f), root), "bản xung đột đồng bộ" if "conflicted" in f.lower() else "file khóa tạm"))
    add("E2. File xung đột đồng bộ / file khóa tạm trong toàn kho",
        "Sinh ra khi hai máy cùng sửa một file qua Drive. Cần chọn bản đúng rồi xóa phần thừa.",
        ["Đường dẫn", "Loại"], rows_e2)

    # ---- F. Tên thư mục hồ sơ ----
    rows_f = []
    for h in dossiers:
        fp = h.get("folderPath") or ""
        od = h.get("originalDoc") or {}
        issues = []
        m = re.match(r"(\d{4}-\d{2}-\d{2})_", fp)
        if not m:
            issues.append("thiếu tiền tố ngày yyyy-mm-dd_")
        elif od.get("date") and m.group(1) != od["date"]:
            issues.append(f"tiền tố ngày {m.group(1)} ≠ ngày văn bản {od['date']}")
        if any(c in FORBIDDEN for c in fp):
            issues.append("chứa ký tự cấm (/ \\ : * ? \" < > |) — tạo thư mục lồng sai")
        if len(os.path.join(root, "2026", h.get("category", ""), fp)) > 200:
            issues.append("đường dẫn dài (>200 ký tự)")
        if issues:
            rows_f.append((fp, "; ".join(issues)))
    add("F. Tên thư mục hồ sơ không theo quy ước",
        "Quy ước đề xuất: yyyy-mm-dd(ngày văn bản)_số-ký hiệu_slug, không ký tự cấm.",
        ["Tên thư mục hồ sơ", "Vấn đề"], rows_f)

    # ---- G. Dữ liệu hồ sơ thiếu / mâu thuẫn ----
    rows_g = []
    for h in dossiers:
        od = h.get("originalDoc") or {}
        issues = []
        if not od.get("number"):
            issues.append("thiếu số văn bản gốc")
        if not h.get("deadline"):
            issues.append("thiếu hạn xử lý")
        if h["status"] == "archived":
            if not h.get("closedAt"):
                issues.append("đã đóng nhưng thiếu ngày đóng")
            if not h.get("finalResult"):
                issues.append("đã đóng nhưng thiếu kết quả")
            key = (dossier_year(h), h.get("category", ""), h.get("folderPath", ""))
            if key in disk:
                base = disk[key]
                for label, names in REQUIRED_WHEN_CLOSED.items():
                    if not any(os.path.isdir(os.path.join(base, n)) and tree_has_files(os.path.join(base, n)) for n in names):
                        issues.append(f"đã đóng nhưng thư mục '{names[0]}' chưa có file")
        elif h.get("closedAt") or h.get("finalResult"):
            issues.append("đang xử lý nhưng lại có ngày đóng/kết quả")
        if issues:
            rows_g.append((h["status"], h["title"][:70], "; ".join(issues)))
    add("G. Dữ liệu hồ sơ thiếu hoặc mâu thuẫn",
        "Hồ sơ đã đóng nên có đủ văn bản chỉ đạo (đầu vào) và văn bản triển khai (kết quả).",
        ["Trạng thái", "Tên hồ sơ", "Vấn đề"], rows_g)

    # ---- H. Mốc văn bản: docType và filePath ----
    rows_h = []
    type_count = Counter()
    for h in dossiers:
        key = (dossier_year(h), h.get("category", ""), h.get("folderPath", ""))
        base = disk.get(key)
        for r in h.get("relatedDocs", []):
            if r.get("type") != "document":
                continue
            dt = r.get("docType") or ""
            type_count[dt or "(trống)"] += 1
            sender = (r.get("sender") or "").strip().lower()
            sug = DOCTYPE_MAP.get(dt.lower())
            if not sug:
                sug = "Văn bản triển khai (nếu do PV01/CATP/ĐUCATP ban hành)" if sender in OWN_SENDERS else "Phụ lục hoặc Văn bản chỉ đạo — cần xem"
            fpth = r.get("filePath") or ""
            where = ""
            if re.match(r"^[A-Za-z]:[\\/]", fpth):
                where = "đường dẫn tuyệt đối trên máy/Drive"
            elif fpth and base:
                hits = [c for c in CATEGORIES if os.path.exists(os.path.join(base, c, os.path.basename(fpth)))]
                where = ("duy nhất trong " + hits[0]) if len(hits) == 1 else ("trùng ở: " + ", ".join(hits)) if hits else "không thấy file trong hồ sơ"
            if dt.lower() not in DOCTYPE_MAP and dt not in {"Phụ lục", "Văn bản triển khai"}:
                rows_h.append((h["folderPath"][:45], r.get("number") or "—", dt or "(trống)", sug, where))
    add("H. Loại văn bản (docType) cần quy về 4 loại chuẩn",
        "Thống kê: " + "; ".join(f"{k} = {v}" for k, v in type_count.most_common()) +
        ". Các loại quy đổi chắc chắn (không liệt kê): Văn bản kết quả → Văn bản triển khai; Văn bản chỉ đạo mới / Căn cứ chỉ đạo → Văn bản chỉ đạo; Phụ lục ban hành kèm theo Quyết định → Phụ lục. Dưới đây là các mục còn lại, cần bạn quyết.",
        ["Hồ sơ", "Số văn bản", "docType hiện tại", "Gợi ý", "Liên kết file"], rows_h)

    # ---- I. Hai bản sao kho ----
    rows_i = []
    if os.path.isdir(stale_root) and os.path.normcase(os.path.abspath(stale_root)) != os.path.normcase(os.path.abspath(root)):
        a = {rel for rel, _ in list_files(root)}
        b = {rel for rel, _ in list_files(stale_root)}
        rows_i += [("Chỉ có ở kho đang dùng", x) for x in sorted(a - b)]
        rows_i += [("Chỉ có ở bản sao cũ backend/static/ho-so", x) for x in sorted(b - a)]
    add("I. Hai bản sao của kho hồ sơ",
        f"Kho đang dùng: {root}. Bản sao cũ: {stale_root}. Lệch nhau ở các file dưới đây.",
        ["Vị trí", "File"], rows_i)

    # ---- J. Đường dẫn dài khi xem qua Drive ----
    prefix = str(cfg.get("DRIVE_PREFIX") or root).rstrip("\\/")
    rows_j = []
    for r, _, fs in os.walk(root):
        for f in fs:
            full = os.path.join(r, f)
            total = len(prefix) + 1 + len(os.path.relpath(full, root))
            if total > 200 or len(f) > 70:
                rows_j.append((total, len(f), os.path.relpath(full, root)))
    rows_j.sort(reverse=True)
    add("J. Đường dẫn hoặc tên file dài (xem qua Drive)",
        f"Tính với tiền tố '{prefix}' ({len(prefix)} ký tự). Nên dưới 200 ký tự tổng và dưới 70 ký tự cho tên file; Windows lỗi quanh 260.",
        ["Độ dài đường dẫn", "Độ dài tên file", "Đường dẫn trong kho"], rows_j)

    # ---- Tóm tắt ----
    print(f"Kho: {root}")
    print(f"Hồ sơ: {len(dossiers)}  | thư mục trên đĩa: {len(disk)}")
    print("Hồ sơ ↔ thư mục:", dict(state))
    for title, _, _, rows in sections:
        print(f"  {title}: {len(rows)} mục")

    # ---- Xuất HTML ----
    e = html.escape
    out = ["<!DOCTYPE html><html lang='vi'><meta charset='utf-8'><title>Báo cáo kiểm tra kho hồ sơ</title>",
           "<style>body{font:14px/1.5 Segoe UI,sans-serif;max-width:1200px;margin:24px auto;padding:0 16px;color:#1e293b}"
           "table{border-collapse:collapse;width:100%;margin:8px 0 28px}td,th{border:1px solid #cbd5e1;padding:5px 8px;text-align:left;vertical-align:top}"
           "th{background:#f1f5f9}h2{margin-top:32px}.n{color:#64748b}.ok{color:#15803d}</style>",
           f"<h1>Báo cáo kiểm tra kho hồ sơ</h1><p class='n'>Tạo lúc {datetime.now():%d/%m/%Y %H:%M}. "
           "Báo cáo chỉ đọc — chưa có thay đổi nào được thực hiện lên dữ liệu.</p>",
           f"<p><b>{len(dossiers)}</b> hồ sơ · <b>{len(disk)}</b> thư mục trên đĩa · khớp tốt: <b>{state['ok']}</b> · "
           + " · ".join(f"{k}: <b>{v}</b>" for k, v in state.items() if k != 'ok') + "</p>"]
    for title, note, header, rows in sections:
        out.append(f"<h2>{e(title)} <span class='n'>({len(rows)})</span></h2><p class='n'>{e(note)}</p>")
        if not rows:
            out.append("<p class='ok'>Không có mục nào.</p>")
            continue
        out.append("<table><tr>" + "".join(f"<th>{e(c)}</th>" for c in header) + "</tr>")
        for r in rows:
            out.append("<tr>" + "".join(f"<td>{e(str(c))}</td>" for c in r) + "</tr>")
        out.append("</table>")
    report = os.path.join(HERE, "bao_cao_kho.html")
    with open(report, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print("Đã ghi báo cáo:", report)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
