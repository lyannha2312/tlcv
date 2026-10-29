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
    'CHUYỂN ĐỔI SỐ': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-500', solid: 'bg-blue-600' },
    'TRIỂN KHAI': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-500', solid: 'bg-emerald-600' },
    'KHUNG KIẾN TRÚC': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'text-indigo-500', solid: 'bg-indigo-600' },
    'DNIS': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-200', icon: 'text-fuchsia-500', solid: 'bg-fuchsia-600' },
    'MAIL CÔNG VỤ': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', icon: 'text-cyan-500', solid: 'bg-cyan-600' },
    'GÓP Ý': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500', solid: 'bg-amber-500' },
    'TRÍ TUỆ NHÂN TẠO AI': { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', icon: 'text-violet-500', solid: 'bg-violet-600' },
    'ĐẢNG': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', icon: 'text-rose-500', solid: 'bg-rose-600' },
    'KHÁC': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: 'text-slate-500', solid: 'bg-slate-500' },
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
