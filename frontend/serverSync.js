// Kết nối tới Flask (backend/app.py) khi giao diện được Flask phục vụ cùng địa chỉ.
// Ở GitHub Pages hoặc `npm run dev` không có Flask: detectBackend() trả về false và ứng dụng lưu bằng localStorage như cũ.

const parseError = async (res) => {
    let detail = '';
    try { detail = (await res.json())?.error || ''; } catch (e) { /* bỏ qua */ }
    return new Error(detail || `Lỗi máy chủ (${res.status})`);
};

const getJson = async (path) => {
    const res = await fetch(path, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw await parseError(res);
    return res.json();
};

export const detectBackend = async () => {
    if (/github\.io$/.test(window.location.hostname)) return false;
    try {
        const res = await fetch('/api/data', { headers: { Accept: 'application/json' } });
        // Máy chủ dev của Vite trả về index.html cho mọi đường dẫn, nên phải kiểm tra đúng là JSON.
        if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return false;
        await res.json();
        return true;
    } catch (e) {
        return false;
    }
};

export const loadDossiers = () => getJson('/api/dossiers');

export const loadServerData = async () => {
    const [dossiers, data] = await Promise.all([loadDossiers(), getJson('/api/data')]);
    return { dossiers, ...data };
};

// name: 'dossiers' | 'dnisLogs' | 'mailLogs' | 'coordLogs' | 'schedules' | 'meetings'
export const saveCollection = async (name, items) => {
    const path = name === 'dossiers' ? '/api/dossiers' : `/api/data/${name}`;
    const res = await fetch(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items) });
    if (!res.ok) throw await parseError(res);
};
