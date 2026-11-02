import React, { useState, useEffect, useCallback, useRef } from 'react';
import { IconFileText, IconTrash, IconPlus } from '../Icons.jsx';
import { folderLabel } from '../fileMatch.js';

const parseError = async (res) => {
    let detail = '';
    try { detail = (await res.json())?.error || ''; } catch (e) { /* bỏ qua */ }
    return new Error(detail || `Lỗi máy chủ (${res.status})`);
};

const UPLOAD_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.rtf,.zip,.rar';

// Đuôi file viết thường, không có dấu chấm; file không có đuôi (hoặc chỉ là ".ten") thì trả về chuỗi rỗng.
export const fileExt = (name) => { const dot = name.lastIndexOf('.'); return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''; };

const dossierApiBase = (folderPath) => folderPath ? `/api/ho_so/${encodeURIComponent(folderPath).replace(/%2F/g, '/')}` : null;

// Mở thư mục hồ sơ trong Explorer (chỉ chạy được khi dùng server Flask trên chính máy này).
export const openDossierFolder = async (folderPath) => {
    try {
        const res = await fetch(`${dossierApiBase(folderPath)}/open_folder`, { method: 'POST' });
        if (!res.ok) throw await parseError(res);
    } catch (e) {
        alert('Không mở được thư mục: ' + e.message);
    }
};

// Đọc danh sách file của một hồ sơ từ Flask. folderPath = null thì không làm gì.
export const useDossierFiles = (folderPath) => {
    const [categories, setCategories] = useState(null);
    const [error, setError] = useState('');
    const apiBase = dossierApiBase(folderPath);

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

    const openFolder = () => openDossierFolder(folderPath);

    return { categories, error, reload, apiBase, openFolder };
};

// Màu theo loại file: PDF đỏ, Word xanh dương, Excel xanh lá, PowerPoint cam, ảnh tím, nén vàng nâu, video chàm.
const FILE_TYPES = [
    { exts: ['pdf'], color: '#e11d48', text: 'text-rose-600' },
    { exts: ['doc', 'docx', 'rtf', 'odt'], color: '#2563eb', text: 'text-blue-600' },
    { exts: ['xls', 'xlsx', 'xlsm', 'csv', 'ods'], color: '#059669', text: 'text-emerald-600' },
    { exts: ['ppt', 'pptx', 'pps', 'ppsx'], color: '#ea580c', text: 'text-orange-600' },
    { exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'], color: '#7c3aed', text: 'text-violet-600' },
    { exts: ['zip', 'rar', '7z'], color: '#d97706', text: 'text-amber-600' },
    { exts: ['mp4', 'mov', 'avi', 'mkv'], color: '#4f46e5', text: 'text-indigo-600' },
    { exts: ['html', 'htm'], color: '#0d9488', text: 'text-teal-600' },
    { exts: ['txt', 'md'], color: '#64748b', text: 'text-slate-500' },
];
const fileKind = (ext) => FILE_TYPES.find(t => t.exts.includes(ext)) || { color: '#94a3b8', text: 'text-slate-500' };

// Icon trang tài liệu có góc gấp, nền màu theo loại file, nhãn là đuôi file (PDF, DOCX, XLSX...).
export const FileTypeIcon = ({ ext, className = 'w-6 h-7' }) => {
    const kind = fileKind(ext);
    const label = (ext || 'file').toUpperCase().slice(0, 4);
    return (
        <svg viewBox="0 0 24 28" className={`shrink-0 ${className}`} aria-label={`File ${label}`}>
            <path d="M3 1h12l7 7v17a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" fill={kind.color} />
            <path d="M15 1l7 7h-5a2 2 0 0 1-2-2z" fill="#ffffff" fillOpacity="0.45" />
            <text x="11.5" y="21.5" textAnchor="middle" fontSize={label.length > 3 ? 6.2 : 7.4} fontWeight="700" fill="#ffffff" fontFamily="Inter, Arial, sans-serif">{label}</text>
        </svg>
    );
};

// Tên file: phần đuôi (.pdf, .docx...) tô cùng màu với icon.
export const FileName = ({ name, className = '' }) => {
    const dot = name.lastIndexOf('.');
    if (dot <= 0) return <span className={className}>{name}</span>;
    return <span className={className}>{name.slice(0, dot)}<span className={`font-semibold ${fileKind(name.slice(dot + 1).toLowerCase()).text}`}>{name.slice(dot)}</span></span>;
};

// Một file trong mốc timeline; bấm để xem ở khung bên phải.
export const FileChip = ({ file, active, onSelect }) => {
    const ext = fileExt(file.fileName);
    return (
        <button
            onClick={() => onSelect(file)}
            title={file.fileName}
            className={`w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${active ? 'bg-sky-50 border-sky-300 ring-1 ring-sky-200' : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-sky-200'}`}
        >
            <FileTypeIcon ext={ext} className="w-5 h-6" />
            <FileName name={file.fileName} className={`min-w-0 flex-1 truncate ${active ? 'text-sky-800 font-medium' : 'text-slate-700'}`} />
        </button>
    );
};

// Quản lý file (tải lên, xóa, mở thư mục trên máy). Việc đọc file nằm ở khung xem bên phải.
const DossierFiles = ({ files, showToast, selectedKey, onPick }) => {
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
            if (out.warnings?.length) alert(`Lưu ý độ dài tên/đường dẫn (dễ lỗi khi xem qua Drive):\n\n${out.warnings.join('\n')}\n\nNên đổi tên file ngắn hơn.`);
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

    const total = categories ? Object.values(categories).reduce((n, list) => n + list.length, 0) : 0;

    return (
        <details className="bg-white border border-slate-200 rounded-2xl shadow-sm group">
            <summary className="flex items-center justify-between gap-2 px-6 py-4 cursor-pointer select-none list-none">
                <span className="font-bold text-slate-800 flex items-center gap-2 text-base"><IconFileText className="w-5 h-5 text-sky-600" /> Quản lý tài liệu {categories && <span className="text-sm font-medium text-slate-400">({total} file)</span>}</span>
                <span className="text-xs text-slate-400 group-open:hidden">Tải lên · Xóa</span>
            </summary>
            <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                {error && <p className="text-sm text-rose-600">{error}</p>}
                {categories && Object.entries(categories).map(([category, list]) => (
                    <div key={category} className="mb-4 last:mb-0">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{folderLabel(category)} <span className="text-slate-400 normal-case font-medium">({list.length})</span></span>
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
                                    <li key={f.fileName} className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs group/row ${selectedKey === `${category}/${f.fileName}` ? 'bg-sky-50' : 'hover:bg-slate-50'}`}>
                                        {/* Một dòng, chữ nhỏ; tên dài bị cắt bằng "…" và di chuột vào để xem đầy đủ. Bấm để đọc ở khung bên phải. */}
                                        <button
                                            type="button"
                                            onClick={() => onPick?.({ ...f, category, key: `${category}/${f.fileName}` })}
                                            title={f.fileName}
                                            className="flex items-center gap-2 min-w-0 flex-1 text-left"
                                        >
                                            <FileTypeIcon ext={fileExt(f.fileName)} className="w-5 h-6" />
                                            <FileName name={f.fileName} className={`min-w-0 flex-1 truncate ${selectedKey === `${category}/${f.fileName}` ? 'text-sky-800 font-medium' : 'text-slate-700'}`} />
                                        </button>
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
