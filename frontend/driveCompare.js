// So sánh và gộp dữ liệu giữa máy này và bản trên Google Drive, để lưu từ nhiều máy không làm mất dữ liệu.
// Mỗi bản ghi có `updatedAt` (gắn tự động mỗi khi sửa, xem App.jsx); bản ghi cũ chưa có thì chỉ so theo nội dung.

// prepend: danh sách hiển thị mục mới nhất ở đầu nên mục mới từ bên kia phải chèn lên đầu (khớp mergeById).
export const COLLECTIONS = [
    { key: 'dossiers', label: 'Hồ sơ', nested: ['relatedDocs', 'tasks'], prepend: false },
    { key: 'supportLogs', label: 'Hỗ trợ', nested: [], prepend: true },
    { key: 'coordLogs', label: 'Phối hợp', nested: [], prepend: true },
    { key: 'schedules', label: 'Lịch công tác', nested: [], prepend: false },
    { key: 'meetings', label: 'Cuộc họp', nested: [], prepend: true },
];

const list = (x) => (Array.isArray(x) ? x.filter(r => r && r.id) : []);

// JSON có thứ tự khóa cố định để so sánh nội dung, bỏ `updatedAt`.
const stable = (v) => {
    if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
    if (v && typeof v === 'object') {
        return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
    }
    return JSON.stringify(v === undefined ? null : v);
};
export const contentKey = ({ updatedAt, ...rest }) => stable(rest);

export const recordTitle = (r) => {
    const text = r.title || r.content || r.unit || r.id;
    const date = (r.date || r.originalDoc?.date || '').slice(0, 10).split('-').reverse().join('/');
    return `${date ? date + ' · ' : ''}${String(text).replace(/\s+/g, ' ').slice(0, 90)}`;
};

// Bên nào sửa sau: 'local' | 'remote' | 'unknown' (chưa đủ thông tin giờ sửa).
export const newerSide = (local, remote) => {
    const a = local.updatedAt, b = remote.updatedAt;
    if (!a && !b) return 'unknown';
    if (a && !b) return 'local';
    if (!a && b) return 'remote';
    if (a === b) return 'unknown';
    return a > b ? 'local' : 'remote';
};

// Các trường khác nhau giữa hai bản của cùng một bản ghi.
const differingFields = (a, b) => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    keys.delete('updatedAt');
    return [...keys].filter(k => stable(a[k]) !== stable(b[k]));
};

export const lastEdit = (data) => {
    let best = null;
    COLLECTIONS.forEach(({ key }) => list(data?.[key]).forEach(r => { if (r.updatedAt && (!best || r.updatedAt > best)) best = r.updatedAt; }));
    return best;
};

// local, remote: { dossiers, supportLogs, coordLogs, schedules, meetings }
export const compareData = (local, remote) => COLLECTIONS.map(({ key, label }) => {
    const l = list(local?.[key]), r = list(remote?.[key]);
    const lm = new Map(l.map(x => [x.id, x])), rm = new Map(r.map(x => [x.id, x]));
    const onlyLocal = l.filter(x => !rm.has(x.id));
    const onlyRemote = r.filter(x => !lm.has(x.id));
    const diff = [];
    let same = 0;
    l.forEach(x => {
        const y = rm.get(x.id);
        if (!y) return;
        if (contentKey(x) === contentKey(y)) { same++; return; }
        diff.push({ id: x.id, local: x, remote: y, fields: differingFields(x, y), newer: newerSide(x, y) });
    });
    return { key, label, onlyLocal, onlyRemote, diff, same };
});

export const hasDifferences = (result) => result.some(c => c.onlyLocal.length || c.onlyRemote.length || c.diff.length);

// Lựa chọn mặc định cho mục khác nội dung: bản sửa sau; chưa rõ thì lấy bản máy này.
export const defaultChoices = (result) => {
    const choices = {};
    result.forEach(c => c.diff.forEach(d => { choices[`${c.key}:${d.id}`] = d.newer === 'remote' ? 'remote' : 'local'; }));
    return choices;
};

const unionById = (first, second) => {
    const ids = new Set(list(first).map(x => x.id));
    return [...list(first), ...list(second).filter(x => !ids.has(x.id))];
};

// Gộp theo mã: mục chỉ có một bên thì giữ; mục khác nội dung theo `choices` ('local' | 'remote').
// Hồ sơ: các mốc (relatedDocs) và task chỉ có ở bên không được chọn vẫn được giữ lại.
export const mergeData = (local, remote, choices = {}) => {
    const out = {};
    COLLECTIONS.forEach(({ key, nested, prepend }) => {
        const l = list(local?.[key]), r = list(remote?.[key]);
        const rm = new Map(r.map(x => [x.id, x]));
        const lids = new Set(l.map(x => x.id));
        const merged = l.map(x => {
            const y = rm.get(x.id);
            if (!y || contentKey(x) === contentKey(y)) return y && !x.updatedAt && y.updatedAt ? { ...x, updatedAt: y.updatedAt } : x;
            const winner = choices[`${key}:${x.id}`] === 'remote' ? y : x;
            const loser = winner === x ? y : x;
            const result = { ...winner };
            nested.forEach(n => { if (Array.isArray(winner[n]) || Array.isArray(loser[n])) result[n] = unionById(winner[n], loser[n]); });
            return result;
        });
        const added = r.filter(x => !lids.has(x.id));
        out[key] = prepend ? [...added, ...merged] : [...merged, ...added];
    });
    return out;
};

// Tên máy này (hỏi một lần) để file trên Drive ghi được "lưu từ máy nào".
export const getMachineName = () => {
    const KEY = 'tlcv_ten_may';
    try {
        const saved = localStorage.getItem(KEY);
        if (saved) return saved;
        const name = (window.prompt('Đặt tên cho máy này (vd: Máy cơ quan, Laptop nhà) để biết bản trên Drive lưu từ máy nào:', 'Máy này') || '').trim() || 'Không rõ';
        localStorage.setItem(KEY, name);
        return name;
    } catch (e) { return 'Không rõ'; }
};

export const fmtTime = (iso) => {
    if (!iso) return 'chưa rõ';
    const d = new Date(iso);
    if (isNaN(d)) return 'chưa rõ';
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())} ngày ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};
