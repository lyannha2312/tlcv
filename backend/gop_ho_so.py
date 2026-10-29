# -*- coding: utf-8 -*-
"""
Gộp danh mục hồ sơ: dossiers.json (Flask) <-> file sao lưu của QLCV (Backup_QLCV_*.json).

KHÔNG BAO GIỜ ghi đè dossiers.json. Hai bước:

  1) python gop_ho_so.py bao-cao [file_sao_luu.json]
        -> tạo bao_cao_lech.html: liệt kê mọi hồ sơ lệch nhau, có gợi ý sẵn.
           Mở file trong trình duyệt, chọn lại nếu muốn, bấm "Tải file quyết định"
           (được quyet_dinh.json, thường nằm trong thư mục Downloads).

  2) python gop_ho_so.py ap-dung [quyet_dinh.json]
        -> tạo dossiers_gop_<ngày giờ>.json (file MỚI). Xem lại rồi tự sao chép
           đè lên dossiers.json nếu hài lòng.

Chỉ dùng thư viện chuẩn của Python.
"""

import glob
import hashlib
import json
import os
import sys
import webbrowser
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FLASK_PATH = os.path.join(BASE_DIR, "dossiers.json")
REPORT_PATH = os.path.join(BASE_DIR, "bao_cao_lech.html")
DECISION_NAME = "quyet_dinh.json"

LIST_FIELDS = ("relatedDocs", "tasks")  # gộp được theo id


def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def sha1(path):
    with open(path, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()


def load_dossiers(path):
    data = read_json(path)
    items = data.get("dossiers") if isinstance(data, dict) else data
    if not isinstance(items, list):
        raise SystemExit(f"[LOI] {path} khong co danh sach 'dossiers'.")
    return items


def default_backup():
    """Bản sao lưu QLCV mới nhất (theo ngày trong tên file) ở frontend/data hoặc cạnh app.py."""
    patterns = [
        os.path.join(BASE_DIR, "..", "frontend", "data", "Backup_QLCV_*.json"),
        os.path.join(BASE_DIR, "Backup_QLCV_*.json"),
    ]
    found = [os.path.normpath(p) for pat in patterns for p in glob.glob(pat)]
    if not found:
        raise SystemExit("[LOI] Khong tim thay Backup_QLCV_*.json. Hay truyen duong dan file sao luu.")
    return max(found, key=lambda p: os.path.basename(p))


def is_empty(v):
    return v is None or v == "" or v == [] or v == {}


def short(v, n=110):
    s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False)
    return s if len(s) <= n else s[: n - 1] + "…"


def label_of(item):
    if not isinstance(item, dict):
        return str(item)
    return str(item.get("number") or item.get("title") or item.get("content") or item.get("id"))


def default_choice(field, f, b):
    if field in LIST_FIELDS:
        return "gop"
    if is_empty(b) and not is_empty(f):
        return "flask"
    if is_empty(f) and not is_empty(b):
        return "sao_luu"
    if field == "folderPath" and isinstance(f, str) and isinstance(b, str) and "/" in f and "/" not in b:
        return "sao_luu"
    return "flask"


def note_for(field, f, b):
    if field == "title" and isinstance(f, str) and isinstance(b, str):
        if f.strip() == "Góp ý " + b.strip():
            return "Flask thêm tiền tố “Góp ý ” vào tiêu đề."
        if b.strip() == "Góp ý " + f.strip():
            return "Bản sao lưu thêm tiền tố “Góp ý ” vào tiêu đề."
    if field == "folderPath":
        if isinstance(b, str) and "/" in b:
            return "Bản sao lưu chứa dấu “/” trong tên thư mục (không dùng được làm tên thư mục)."
        if isinstance(f, str) and "/" in f:
            return "Flask chứa dấu “/” trong tên thư mục (không dùng được làm tên thư mục)."
    if field in ("closedAt", "finalResult", "status") and (is_empty(f) != is_empty(b)):
        return "Một bên đã ghi kết quả/đóng hồ sơ, bên kia còn để trống."
    return ""


def list_detail(f_list, b_list):
    f_list, b_list = f_list or [], b_list or []
    fi = {x.get("id"): x for x in f_list if isinstance(x, dict)}
    bi = {x.get("id"): x for x in b_list if isinstance(x, dict)}
    return {
        "so_flask": len(f_list),
        "so_sao_luu": len(b_list),
        "chi_flask": [label_of(fi[k]) for k in fi if k not in bi],
        "chi_sao_luu": [label_of(bi[k]) for k in bi if k not in fi],
        "khac_noi_dung": sum(1 for k in fi if k in bi and fi[k] != bi[k]),
    }


def build_report(flask_items, backup_items):
    f_map = {d["id"]: d for d in flask_items}
    b_map = {d["id"]: d for d in backup_items}
    diffs = []
    for i, f in f_map.items():
        b = b_map.get(i)
        if b is None:
            continue
        fields = []
        for key in sorted(set(f) | set(b)):
            fv, bv = f.get(key), b.get(key)
            if fv == bv:
                continue
            row = {"ten": key, "mac_dinh": default_choice(key, fv, bv), "ghi_chu": note_for(key, fv, bv)}
            if key in LIST_FIELDS:
                row["chi_tiet"] = list_detail(fv, bv)
            else:
                row["flask"], row["sao_luu"] = short(fv), short(bv)
            fields.append(row)
        if fields:
            diffs.append({"id": i, "title": f.get("title", ""), "category": f.get("category", ""), "truong": fields})
    only_f = [{"id": i, "title": d.get("title", ""), "category": d.get("category", ""), "status": d.get("status", "")}
              for i, d in f_map.items() if i not in b_map]
    only_b = [{"id": i, "title": d.get("title", ""), "category": d.get("category", ""), "status": d.get("status", "")}
              for i, d in b_map.items() if i not in f_map]
    return {"lech": diffs, "chi_flask": only_f, "chi_sao_luu": only_b}


HTML = r'''<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Báo cáo hồ sơ lệch nhau</title>
<style>
:root{--bg:#F9F8F6;--card:#fff;--ink:#18191B;--soft:#484C56;--line:#E4DFD5;--pri:#1C355E;--pri-s:#EBF1FA;--acc:#8E5311;--acc-s:#FBF0E4;--ok:#19584C;--ok-s:#E5F3EE}
@media(prefers-color-scheme:dark){:root{--bg:#13151A;--card:#1A1D24;--ink:#E6E8EE;--soft:#9BA2B5;--line:#262B38;--pri:#8CA9F2;--pri-s:#1B2640;--acc:#E5B869;--acc-s:#302613;--ok:#6FC5A8;--ok-s:#172A23}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 "Segoe UI",system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:20px 16px 110px}
h1{font-size:1.5rem;margin:.2em 0}h2{font-size:1.15rem;margin:1.6em 0 .5em;color:var(--pri)}
.meta{color:var(--soft);font-size:13px}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}.stat{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--pri);border-radius:8px;padding:8px 14px}.stat b{display:block;font:700 1.5rem ui-monospace,Consolas,monospace;color:var(--pri)}
.how{background:var(--pri-s);border-left:4px solid var(--pri);border-radius:8px;padding:10px 14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:12px 0;overflow:hidden}
.card>header{padding:10px 14px;border-bottom:1px solid var(--line)}.card>header b{display:block}.card>header small{color:var(--soft);font-family:ui-monospace,Consolas,monospace}
.f{padding:10px 14px;border-bottom:1px solid var(--line)}.f:last-child{border:0}
.f h4{margin:0 0 6px;font:600 12px ui-monospace,Consolas,monospace;text-transform:uppercase;letter-spacing:.05em;color:var(--pri)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:8px}.col{background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:6px 10px;font-size:13.5px;word-break:break-word}.col span{display:block;font-size:11.5px;color:var(--soft);margin-bottom:2px}
.note{margin:6px 0 0;font-size:13px;color:var(--acc);background:var(--acc-s);border-radius:6px;padding:4px 10px}
select{font:inherit;padding:4px 8px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink)}
.pick{margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13.5px}
ul{margin:.3em 0;padding-left:1.2em;font-size:13px}
.row{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:1px solid var(--line);flex-wrap:wrap}.row:last-child{border:0}
.bar{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--line);padding:10px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap}
button{font:600 14px inherit;font-family:inherit;border:0;border-radius:8px;padding:9px 18px;background:var(--pri);color:var(--bg);cursor:pointer}
@media(max-width:640px){.cols{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Báo cáo hồ sơ lệch nhau</h1>
<div class="meta" id="meta"></div>
<div class="stats" id="stats"></div>
<div class="how"><b>Cách dùng.</b> Mỗi mục đã có sẵn một lựa chọn gợi ý. Bạn chỉ đổi những mục không đồng ý, rồi bấm <b>Tải file quyết định</b> ở cuối trang. Sau đó chạy <code>python gop_ho_so.py ap-dung</code>. Báo cáo này không sửa dữ liệu nào.</div>
<h2>1. Hồ sơ có ở cả hai nguồn nhưng khác nhau</h2><div id="lech"></div>
<h2>2. Hồ sơ chỉ có ở Flask (dossiers.json)</h2><div class="card" id="cf"></div>
<h2>3. Hồ sơ chỉ có ở bản sao lưu QLCV</h2><div class="card" id="cb"></div>
</main>
<div class="bar"><span id="count" class="meta"></span><button id="dl">Tải file quyết định</button></div>
<script>
var D = __DATA__;
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var $=function(id){return document.getElementById(id)};
$('meta').textContent='Flask: '+D.nguon_flask+'  ·  Sao lưu QLCV: '+D.nguon_sao_luu;
$('stats').innerHTML=[[D.lech.length,'hồ sơ khác nội dung'],[D.chi_flask.length,'chỉ có ở Flask'],[D.chi_sao_luu.length,'chỉ có ở sao lưu QLCV']].map(function(s){return '<div class="stat"><b>'+s[0]+'</b>'+s[1]+'</div>'}).join('');
var LBL={status:'Trạng thái',closedAt:'Ngày đóng hồ sơ',finalResult:'Kết quả xử lý',title:'Tiêu đề',folderPath:'Tên thư mục hồ sơ',relatedDocs:'Văn bản liên quan',tasks:'Việc cần làm',category:'Lĩnh vực',deadline:'Hạn xử lý',priority:'Mức ưu tiên',originalDoc:'Văn bản gốc',createdAt:'Ngày tạo'};
function opts(list,sel){return list.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===sel?' selected':'')+'>'+o[1]+'</option>'}).join('')}
function fieldHtml(id,f){
  var h='<div class="f"><h4>'+esc(LBL[f.ten]||f.ten)+'</h4>';
  if(f.chi_tiet){var c=f.chi_tiet;
    h+='<div class="cols"><div class="col"><span>Flask</span>'+c.so_flask+' mục</div><div class="col"><span>Sao lưu QLCV</span>'+c.so_sao_luu+' mục</div></div>';
    if(c.chi_flask.length)h+='<ul><li>Chỉ có ở Flask: '+c.chi_flask.map(esc).join(', ')+'</li></ul>';
    if(c.chi_sao_luu.length)h+='<ul><li>Chỉ có ở sao lưu: '+c.chi_sao_luu.map(esc).join(', ')+'</li></ul>';
    if(c.khac_noi_dung)h+='<div class="meta">'+c.khac_noi_dung+' mục trùng id nhưng khác nội dung (thường chỉ khác giờ thêm).</div>';
    h+='<div class="pick">Chọn: <select data-id="'+esc(id)+'" data-f="'+esc(f.ten)+'">'+opts([['gop','Gộp cả hai (theo id, ưu tiên Flask)'],['flask','Chỉ lấy Flask'],['sao_luu','Chỉ lấy sao lưu QLCV']],f.mac_dinh)+'</select></div>';
  }else{
    h+='<div class="cols"><div class="col"><span>Flask</span>'+esc(f.flask)+'</div><div class="col"><span>Sao lưu QLCV</span>'+esc(f.sao_luu)+'</div></div>';
    h+='<div class="pick">Chọn: <select data-id="'+esc(id)+'" data-f="'+esc(f.ten)+'">'+opts([['flask','Lấy Flask'],['sao_luu','Lấy sao lưu QLCV']],f.mac_dinh)+'</select></div>';
  }
  if(f.ghi_chu)h+='<div class="note">'+esc(f.ghi_chu)+'</div>';
  return h+'</div>';
}
$('lech').innerHTML=D.lech.map(function(d){return '<div class="card"><header><b>'+esc(d.title)+'</b><small>'+esc(d.id)+' · '+esc(d.category)+'</small></header>'+d.truong.map(function(f){return fieldHtml(d.id,f)}).join('')+'</div>'}).join('')||'<div class="meta">Không có.</div>';
function listHtml(arr,attr,list){return arr.map(function(d){return '<div class="row"><div><b>'+esc(d.title)+'</b><br><small class="meta">'+esc(d.id)+' · '+esc(d.category)+' · '+esc(d.status)+'</small></div><select '+attr+'="'+esc(d.id)+'">'+opts(list,list[0][0])+'</select></div>'}).join('')||'<div class="row meta">Không có.</div>'}
$('cf').innerHTML=listHtml(D.chi_flask,'data-cf',[['giu','Giữ'],['bo','Bỏ']]);
$('cb').innerHTML=listHtml(D.chi_sao_luu,'data-cb',[['them','Thêm vào'],['bo','Bỏ']]);
$('count').textContent=document.querySelectorAll('select').length+' lựa chọn (đã có sẵn gợi ý)';
$('dl').onclick=function(){
  var q={fields:{},chi_flask:{},chi_sao_luu:{}};
  document.querySelectorAll('select[data-f]').forEach(function(s){(q.fields[s.dataset.id]=q.fields[s.dataset.id]||{})[s.dataset.f]=s.value});
  document.querySelectorAll('select[data-cf]').forEach(function(s){q.chi_flask[s.dataset.cf]=s.value});
  document.querySelectorAll('select[data-cb]').forEach(function(s){q.chi_sao_luu[s.dataset.cb]=s.value});
  var out={nguon_flask:D.nguon_flask,nguon_sao_luu:D.nguon_sao_luu,sha1_flask:D.sha1_flask,sha1_sao_luu:D.sha1_sao_luu,chon:q};
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:'application/json'}));a.download='quyet_dinh.json';document.body.appendChild(a);a.click();a.remove();
};
</script></body></html>
'''


def cmd_bao_cao(args):
    backup_path = os.path.abspath(args[0]) if args else default_backup()
    flask_items = load_dossiers(FLASK_PATH)
    backup_items = load_dossiers(backup_path)
    rep = build_report(flask_items, backup_items)
    rep.update({
        "nguon_flask": FLASK_PATH, "nguon_sao_luu": backup_path,
        "sha1_flask": sha1(FLASK_PATH), "sha1_sao_luu": sha1(backup_path),
    })
    page = HTML.replace("__DATA__", json.dumps(rep, ensure_ascii=False).replace("</", "<\\/"))
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(page)
    print(f"Flask      : {len(flask_items)} ho so  ({FLASK_PATH})")
    print(f"Sao luu QLCV: {len(backup_items)} ho so  ({backup_path})")
    print(f"Khac noi dung: {len(rep['lech'])} | chi co o Flask: {len(rep['chi_flask'])} | chi co o sao luu: {len(rep['chi_sao_luu'])}")
    print(f"Da tao: {REPORT_PATH}")
    try:
        webbrowser.open("file:///" + REPORT_PATH.replace("\\", "/"))
    except Exception:
        pass


def find_decision(args):
    if args:
        return os.path.abspath(args[0])
    candidates = [os.path.join(BASE_DIR, DECISION_NAME)]
    candidates += glob.glob(os.path.join(os.path.expanduser("~"), "Downloads", "quyet_dinh*.json"))
    candidates = [p for p in candidates if os.path.exists(p)]
    if not candidates:
        raise SystemExit("[LOI] Khong thay quyet_dinh.json. Hay mo bao_cao_lech.html va bam 'Tai file quyet dinh'.")
    return max(candidates, key=os.path.getmtime)


def merge_list_by_id(flask_list, backup_list):
    """Giữ nguyên danh sách Flask, thêm các mục chỉ có ở bản sao lưu vào cuối."""
    flask_list = flask_list or []
    have = {x.get("id") for x in flask_list if isinstance(x, dict)}
    extra = [x for x in (backup_list or []) if not (isinstance(x, dict) and x.get("id") in have)]
    return list(flask_list) + extra


def cmd_ap_dung(args):
    dec_path = find_decision(args)
    dec = read_json(dec_path)
    for key, path in (("sha1_flask", dec["nguon_flask"]), ("sha1_sao_luu", dec["nguon_sao_luu"])):
        if sha1(path) != dec[key]:
            raise SystemExit(f"[LOI] {path} da thay doi sau khi tao bao cao. Hay chay lai 'bao-cao' roi chon lai.")
    flask_items = load_dossiers(dec["nguon_flask"])
    b_map = {d["id"]: d for d in load_dossiers(dec["nguon_sao_luu"])}
    chon = dec["chon"]
    stats = {"giu_flask": 0, "doi_truong": 0, "bo_flask": 0, "them_sao_luu": 0}

    merged = []
    for f in flask_items:
        i = f["id"]
        if i not in b_map:
            if chon["chi_flask"].get(i, "giu") == "bo":
                stats["bo_flask"] += 1
                continue
            merged.append(f)
            continue
        d = json.loads(json.dumps(f))
        b = b_map[i]
        for field, how in chon["fields"].get(i, {}).items():
            if how == "sao_luu":
                if field in b:
                    d[field] = b[field]
                else:
                    d.pop(field, None)
                stats["doi_truong"] += 1
            elif how == "gop" and field in LIST_FIELDS:
                d[field] = merge_list_by_id(f.get(field), b.get(field))
                stats["doi_truong"] += 1
        merged.append(d)

    f_ids = {d["id"] for d in flask_items}
    for i, b in b_map.items():
        if i not in f_ids and chon["chi_sao_luu"].get(i, "them") == "them":
            merged.append(b)
            stats["them_sao_luu"] += 1

    out_path = os.path.join(BASE_DIR, f"dossiers_gop_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"version": 2, "dossiers": merged}, f, ensure_ascii=False, indent=4)
    print(f"Quyet dinh: {dec_path}")
    print(f"Ket qua: {len(flask_items)} ho so Flask -> {len(merged)} ho so sau khi gop")
    print(f"  bo khoi Flask: {stats['bo_flask']} | truong thay doi: {stats['doi_truong']} | them tu sao luu: {stats['them_sao_luu']}")
    print(f"Da tao file MOI: {out_path}")
    print("dossiers.json CHUA bi thay doi. Xem lai file tren; neu dung y thi tu sao chep de len dossiers.json.")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("bao-cao", "ap-dung"):
        print(__doc__)
        raise SystemExit(1)
    {"bao-cao": cmd_bao_cao, "ap-dung": cmd_ap_dung}[sys.argv[1]](sys.argv[2:])


if __name__ == "__main__":
    main()
