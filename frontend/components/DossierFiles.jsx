import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IconFolder, IconFileText, IconTrash, IconPlus } from '../Icons.jsx';

const parseError = async (res) => {
    let detail = '';
    try { detail = (await res.json())?.error || ''; } catch (e) { /* bỏ qua */ }
    return new Error(detail || `Lỗi máy chủ (${res.status})`);
};

const UPLOAD_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.rtf,.zip,.rar';

export const fileExt = (name) => (name.split('.').pop() || '').toLowerCase();

// Đọc danh sách file của một hồ sơ từ Flask. folderPath = null thì không làm gì.
export const useDossierFiles = (folderPath) => {
    const [categories, setCategories] = useState(null);
    const [error, setError] = useState('');
    const apiBase = folderPath ? `/api/ho_so/${encodeURIComponent(folderPath).replace(/%2F/g, '/')}` : null;

    const reload = useCallback(async () => {
        if (!apiBase) { setCategories(null); return; }
        setError('');
        try {
            const res = await fetch(`${apiBase}/files`, { headers: { Accept: 'application/json' } });
            if (!res.ok) throw await parseError(res);
            setCategories((await res.json()).categories);
        } catch (e) {
            setCategories(null);
            setError(e.message);
        }
    }, [apiBase]);

    useEffect(() => { setCategories(null); }, [apiBase]);
    useEffect(() => { reload(); }, [reload]);

    return { categories, error, reload, apiBase };
};

const FILE_STYLE = {
    pdf: 'text-rose-600 bg-rose-50 border-rose-200',
    doc: 'text-blue-600 bg-blue-50 border-blue-200', docx: 'text-blue-600 bg-blue-50 border-blue-200',
    xls: 'text-emerald-600 bg-emerald-50 border-emerald-200', xlsx: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

// Một file trong mốc timeline; bấm để xem ở khung bên phải.
export const FileChip = ({ file, active, onSelect }) => {
    const ext = fileExt(file.fileName);
    return (
        <button
            onClick={() => onSelect(file)}
            className={`w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg border text-sm transition-colors ${active ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-200' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-sky-200'}`}
        >
            <span className={`shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${FILE_STYLE[ext] || 'text-slate-500 bg-white border-slate-200'}`}>{ext || 'file'}</span>
            <span className="min-w-0">
                <span className={`block break-words ${active ? 'text-sky-800 font-medium' : 'text-slate-700'}`}>{file.fileName}</span>
                <span className="block text-[11px] text-slate-400">{file.category}</span>
            </span>
        </button>
    );
};

// Quản lý file (tải lên, xóa, mở thư mục trên máy). Việc đọc file nằm ở khung xem bên phải.
const DossierFiles = ({ files, showToast }) => {
    const { categories, error, reload, apiBase } = files;
    const [busy, setBusy] = useState(false);
    const fileInputs = useRef({});

    const upload = async (category, picked) => {
        if (!picked.length) return;
        const form = new FormData();
        form.append('category', category);
        picked.forEach(f => form.append('files', f));
        setBusy(true);
        try {
            const res = await fetch(`${apiBase}/upload`, { method: 'POST', body: form });
            if (!res.ok) throw await parseError(res);
            const out = await res.json();
            showToast?.(out.skipped?.length ? `Đã tải ${out.saved.length} file, bỏ qua ${out.skipped.length} file sai định dạng` : `Đã tải ${out.saved.length} file lên`);
            await reload();
        } catch (e) {
            alert('Không tải lên được: ' + e.message);
        } finally {
            setBusy(false);
        }
    };

    const remove = async (category, fileName) => {
        if (!window.confirm(`Xóa file "${fileName}"? Không thể hoàn tác.`)) return;
        try {
            const res = await fetch(`${apiBase}/pdf/${encodeURIComponent(category)}/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
            if (!res.ok) throw await parseError(res);
            showToast?.('Đã xóa file');
            await reload();
        } catch (e) {
            alert('Không xóa được: ' + e.message);
        }
    };

    const openFolder = async () => {
        try {
            const res = await fetch(`${apiBase}/open_folder`, { method: 'POST' });
            if (!res.ok) throw await parseError(res);
        } catch (e) {
            alert('Không mở được thư mục: ' + e.message);
        }
    };

    const total = categories ? Object.values(categories).reduce((n, list) => n + list.length, 0) : 0;

    return (
        <details className="bg-white border border-slate-200 rounded-2xl shadow-sm group">
            <summary className="flex items-center justify-between gap-2 px-6 py-4 cursor-pointer select-none list-none">
                <span className="font-bold text-slate-800 flex items-center gap-2 text-base"><IconFileText className="w-5 h-5 text-sky-600" /> Quản lý tài liệu {categories && <span className="text-sm font-medium text-slate-400">({total} file)</span>}</span>
                <span className="text-xs text-slate-400 group-open:hidden">Tải lên · Xóa</span>
            </summary>
            <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                <div className="flex justify-end mb-3">
                    <button onClick={openFolder} className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg font-medium text-sm"><IconFolder className="w-4 h-4" /> Mở thư mục trên máy</button>
                </div>
                {error && <p className="text-sm text-rose-600">{error}</p>}
                {categories && Object.entries(categories).map(([category, list]) => (
                    <div key={category} className="mb-4 last:mb-0">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{category} <span className="text-slate-400 normal-case font-medium">({list.length})</span></span>
                            <button
                                disabled={busy}
                                onClick={() => fileInputs.current[category]?.click()}
                                className="flex items-center gap-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md disabled:opacity-50"
                            ><IconPlus className="w-3.5 h-3.5" /> Thêm file</button>
                            <input
                                type="file" multiple accept={UPLOAD_ACCEPT} className="hidden"
                                ref={el => { fileInputs.current[category] = el; }}
                                onChange={e => { upload(category, Array.from(e.target.files)); e.target.value = ''; }}
                            />
                        </div>
                        {list.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">Chưa có file</p>
                        ) : (
                            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                                {list.map(f => (
                                    <li key={f.fileName} className="flex items-center justify-between gap-3 px-3 py-2 text-sm group/row">
                                        <span className="text-slate-700 break-all">{f.fileName}</span>
                                        <button onClick={() => remove(category, f.fileName)} title="Xóa file" className="text-slate-300 hover:text-rose-600 opacity-0 group-hover/row:opacity-100 focus:opacity-100 shrink-0"><IconTrash className="w-4 h-4" /></button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        </details>
    );
};

export default DossierFiles;
