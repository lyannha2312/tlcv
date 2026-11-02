export const generateId = () => Math.random().toString(36).substring(2, 9);

export const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export const getLocalDateTimeString = (dateObj = new Date()) => {
    const d = new Date(dateObj);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
};

export const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
};

export const getDateRange = (startStr, endStr) => {
    const dates = [];
    const cur = new Date(startStr);
    const end = new Date(endStr);
    while (cur <= end) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
};

export const getDayName = (dateStr) => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[new Date(dateStr).getDay()];
};

export const CATEGORY_COLORS = {
    'CHUYỂN ĐỔI SỐ': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-500', dot: 'bg-blue-500', solid: 'bg-slate-300' },
    'TRIỂN KHAI': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-500', dot: 'bg-emerald-500', solid: 'bg-slate-300' },
    'KHUNG KIẾN TRÚC': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-500', dot: 'bg-indigo-500', solid: 'bg-slate-300' },
    'DNIS': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-500', dot: 'bg-fuchsia-500', solid: 'bg-slate-300' },
    'MAIL CÔNG VỤ': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-500', dot: 'bg-cyan-500', solid: 'bg-slate-300' },
    'GÓP Ý': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-500', dot: 'bg-amber-500', solid: 'bg-slate-300' },
    'TRÍ TUỆ NHÂN TẠO AI': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-500', dot: 'bg-violet-500', solid: 'bg-slate-300' },
    'ĐẢNG': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-500', dot: 'bg-rose-500', solid: 'bg-slate-300' },
    'KHÁC': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-500', dot: 'bg-slate-400', solid: 'bg-slate-300' },
};

export const CATEGORIES = Object.keys(CATEGORY_COLORS);

// Đơn vị phát hành văn bản (chọn khi thêm văn bản phát sinh)
export const ISSUING_UNITS = ['PV01', 'CATP', 'ĐUCATP'];

const isDucatp = s => (s || '').trim().toUpperCase() === 'ĐUCATP';
// Hồ sơ có văn bản gốc hoặc văn bản phát sinh do ĐUCATP phát hành
export const hasDucatpDoc = dossier =>
    isDucatp(dossier.originalDoc?.sender) || (dossier.relatedDocs || []).some(d => d.type === 'document' && isDucatp(d.sender));

export const WORK_TIME = 25 * 60; // 25 mins
export const BREAK_TIME = 5 * 60; // 5 mins

export const openPath = (value, type = 'folder') => {
    if (!value) return;
    const isAbsPath = /^[A-Za-z]:\\/.test(value) || /^\\\\/.test(value);
    if (isAbsPath) {
        // Đường dẫn tuyệt đối — dùng trực tiếp
        fetch(`http://127.0.0.1:3001/open?path=${encodeURIComponent(value)}&type=${type}`)
            .catch(() => alert('Không thể mở. Hãy chắc chắn server đang chạy (npm run server).'));
    } else {
        // Chỉ là tên thư mục — server sẽ tìm kiếm tự động
        fetch(`http://127.0.0.1:3001/find-folder?name=${encodeURIComponent(value)}`)
            .then(r => r.json())
            .then(data => { if (!data.ok) alert(data.error || 'Không tìm thấy thư mục.'); })
            .catch(() => alert('Không thể mở. Hãy chắc chắn server đang chạy (npm run server).'));
    }
};

// Gộp dữ liệu phục hồi vào dữ liệu hiện có theo id (không làm mất mục đang có).
// - Mục chỉ có ở hiện tại: giữ nguyên.
// - Mục chỉ có trong bản sao lưu: thêm vào.
// - Mục có ở cả hai: lấy nội dung từ bản sao lưu, nhưng gộp tiếp các danh sách con (nestedKeys) theo id.
// - prepend: đưa mục mới lên đầu (dùng cho các danh sách vốn thêm mục mới vào đầu như DNIS, Mail...).
export const mergeById = (current = [], incoming = [], nestedKeys = [], { prepend = false } = {}) => {
    const cur = Array.isArray(current) ? current : [];
    const inc = Array.isArray(incoming) ? incoming : [];
    const incMap = new Map(inc.filter(x => x && x.id).map(x => [x.id, x]));
    const curIds = new Set(cur.map(x => x && x.id));
    let updated = 0;
    const merged = cur.map(item => {
        const other = item && incMap.get(item.id);
        if (!other) return item;
        updated++;
        const result = { ...item, ...other };
        nestedKeys.forEach(k => {
            if (Array.isArray(item[k]) || Array.isArray(other[k])) result[k] = mergeById(item[k], other[k]).items;
        });
        return result;
    });
    const newItems = inc.filter(x => !x || !x.id || !curIds.has(x.id));
    const added = newItems.length;
    return { items: prepend ? [...newItems, ...merged] : [...merged, ...newItems], added, updated, kept: cur.length - updated };
};

// ---- Tên thư mục hồ sơ ----
// Quy ước: yyyy-mm-dd(ngày văn bản)_số-ký-hiệu_tên-rút-gọn, không có ký tự cấm của Windows (khớp kiểm tra ở backend/app.py).
const asciiKeepCase = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Tên thư mục hồ sơ tối đa 60 ký tự để đường dẫn trên Drive (H:\Other computers\My Laptop\ho-so\...) không quá dài.
export const MAX_FOLDER_NAME = 60;

export const makeFolderName = ({ docDate, createdAt, docNumber, title }) => {
    const date = (docDate || createdAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
    const head = `${date}_${asciiKeepCase(docNumber) || 'KO-SO'}`;
    const room = MAX_FOLDER_NAME - head.length - 1;
    let short = asciiKeepCase(title).toLowerCase();
    if (room < 8) return head.slice(0, MAX_FOLDER_NAME);
    if (short.length > room) {
        short = short.slice(0, room);
        const cut = short.lastIndexOf('-');  // cắt ở ranh giới từ, không cắt giữa chữ
        if (cut > 8) short = short.slice(0, cut);
    }
    short = short.replace(/-+$/, '');
    return short ? `${head}_${short}` : head;
};

// Trả về mô tả lỗi nếu tên không dùng được làm tên thư mục, ngược lại chuỗi rỗng.
export const folderNameProblem = (name, maxLen = 150) => {
    const v = name || '';
    if (v === '.' || v === '..') return 'Tên thư mục không hợp lệ';
    const bad = [...new Set(v.split('').filter(c => '\/:*?"<>|'.includes(c)))];
    if (bad.length) return `Tên thư mục không được chứa: ${bad.join(' ')}`;
    if (v !== v.trim() || v.endsWith('.')) return 'Tên thư mục không được bắt đầu/kết thúc bằng khoảng trắng hoặc dấu chấm';
    if (v.length > maxLen) return `Tên thư mục dài quá ${maxLen} ký tự (đường dẫn trên Drive sẽ quá dài)`;
    return '';
};
