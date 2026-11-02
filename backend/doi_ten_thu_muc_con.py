# -*- coding: utf-8 -*-
"""Đổi tên 4 thư mục con chuẩn trong mọi hồ sơ sang tên mới (có số thứ tự, ngắn hơn).

    Văn bản chỉ đạo         -> 1_Chỉ đạo
    Phụ lục                 -> 2_Phụ lục
    Báo cáo của các đơn vị  -> 3_Báo cáo đơn vị
    Văn bản triển khai      -> 4_Triển khai

Mặc định CHỈ LIỆT KÊ, không đổi gì. Thêm --apply để đổi thật.
Chỉ đổi tên thư mục (không chạm file bên trong). Không ghi đè: nếu thư mục tên mới đã có sẵn
và còn file thì bỏ qua và báo; nếu thư mục tên mới rỗng thì thay bằng thư mục cũ.

Chạy:  python doi_ten_thu_muc_con.py                      (xem trước, kho theo config.json)
       python doi_ten_thu_muc_con.py --root D:/ho-so_thu --apply
"""
import argparse
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RENAMES = {
    "Văn bản chỉ đạo": "1_Chỉ đạo",
    "Phụ lục": "2_Phụ lục",
    "Báo cáo của các đơn vị": "3_Báo cáo đơn vị",
    "Văn bản triển khai": "4_Triển khai",
}


def default_root():
    path = os.path.join(HERE, "config.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            root = json.load(f).get("HOSO_ROOT")
            if root:
                return root
    return os.path.join(HERE, "static", "ho-so")


def has_files(path):
    return any(files for _, _, files in os.walk(path))


def dossier_dirs(root):
    """Thư mục hồ sơ = cấp thứ 3 dưới gốc kho: năm / chuyên đề / hồ sơ (năm là 4 chữ số)."""
    for year in sorted(os.listdir(root)):
        yp = os.path.join(root, year)
        if not (year.isdigit() and len(year) == 4 and os.path.isdir(yp)):
            continue
        for topic in sorted(os.listdir(yp)):
            tp = os.path.join(yp, topic)
            if not os.path.isdir(tp):
                continue
            for name in sorted(os.listdir(tp)):
                hp = os.path.join(tp, name)
                if os.path.isdir(hp):
                    yield hp


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=None, help="Thư mục gốc kho hồ sơ (mặc định: HOSO_ROOT trong config.json)")
    ap.add_argument("--apply", action="store_true", help="Đổi tên thật (không có thì chỉ liệt kê)")
    ap.add_argument("--log", default=None, help="Ghi từng thư mục đã đổi (cũ → mới) vào file này, để hoàn lại khi cần")
    args = ap.parse_args()
    root = os.path.normpath(args.root or default_root())
    if not os.path.isdir(root):
        sys.exit(f"[LỖI] Không thấy thư mục kho: {root}")

    done, skipped, conflicts, folders = 0, 0, [], 0
    log_lines = []
    for hp in dossier_dirs(root):
        folders += 1
        entries = set(os.listdir(hp))
        for old, new in RENAMES.items():
            if old not in entries or not os.path.isdir(os.path.join(hp, old)):
                continue
            src, dst = os.path.join(hp, old), os.path.join(hp, new)
            rel = os.path.relpath(hp, root)
            if os.path.exists(dst):
                if has_files(dst):
                    conflicts.append(f"{rel}: có cả '{old}' và '{new}' (đều có file)")
                    continue
                if args.apply:
                    shutil.rmtree(dst)  # thư mục tên mới rỗng: thay bằng thư mục cũ
            if args.apply:
                os.rename(src, dst)
                log_lines.append(f"{rel}\t{old}\t{new}")
            done += 1
    if args.log and log_lines:
        with open(args.log, "w", encoding="utf-8") as f:
            f.write("\n".join(log_lines) + "\n")
    verb = "Đã đổi" if args.apply else "Sẽ đổi (xem trước, chưa đổi gì)"
    print(f"Kho: {root}")
    print(f"Hồ sơ quét: {folders} | {verb}: {done} thư mục con")
    for c in conflicts:
        print("  BỎ QUA -", c)
    if conflicts:
        print(f"{len(conflicts)} hồ sơ cần xử lý tay (cả tên cũ và tên mới đều có file).")
    if not args.apply:
        print("Thêm --apply để đổi thật.")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
