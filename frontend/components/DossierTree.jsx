import React, { useState, useMemo } from 'react';
import { IconSearch, IconEdit, IconChevronLeft } from '../Icons.jsx';
import { CATEGORY_COLORS, CATEGORIES } from '../helpers.js';

const PRIORITY_WEIGHT = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };

const byUrgency = (a, b) => {
    const wA = PRIORITY_WEIGHT[a.priority || 'Trung bình'] || 0;
    const wB = PRIORITY_WEIGHT[b.priority || 'Trung bình'] || 0;
    if (wA !== wB) return wB - wA;
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
};

const byClosedDesc = (a, b) => new Date(b.closedAt || b.createdAt) - new Date(a.closedAt || a.createdAt);

// Danh sách hồ sơ dạng cây theo chuyên mục (giống cột trái của Kho hồ sơ cũ): bấm chuyên mục để xổ ra / thu lại.
const DossierTree = ({ dossiers, activeDossierId, onSelect, onEdit, onCollapse }) => {
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('active');
    const [overrides, setOverrides] = useState({});

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = dossiers.filter(d => (status === 'all' || d.status === status)
            && (!q || d.title.toLowerCase().includes(q) || (d.originalDoc?.number || '').toLowerCase().includes(q)));
        const map = {};
        list.forEach(d => { const cat = CATEGORIES.includes(d.category) ? d.category : 'KHÁC'; (map[cat] = map[cat] || []).push(d); });
        return CATEGORIES.filter(cat => map[cat]).map(cat => ({ cat, items: map[cat].sort(status === 'archived' ? byClosedDesc : byUrgency) }));
    }, [dossiers, query, status]);

    const total = groups.reduce((n, g) => n + g.items.length, 0);

    return (
        <aside className="w-72 xl:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 hidden md:flex">
            <div className="p-3 border-b border-slate-100 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <IconSearch className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm hồ sơ, số văn bản..."
                            className="w-full pl-8 pr-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-500 focus:bg-white" />
                    </div>
                    <button onClick={onCollapse} title="Thu gọn danh sách" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><IconChevronLeft className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <select value={status} onChange={e => { setStatus(e.target.value); setOverrides({}); }}
                        className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600">
                        <option value="active">Đang xử lý</option>
                        <option value="archived">Đã kết thúc</option>
                        <option value="all">Tất cả</option>
                    </select>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1">{total} hồ sơ</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                {groups.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Không có hồ sơ phù hợp</p>}
                {groups.map(({ cat, items }) => {
                    const hasActive = items.some(d => d.id === activeDossierId);
                    const open = overrides[cat] ?? (status === 'active' || !!query.trim() || hasActive);
                    const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS['KHÁC'];
                    return (
                        <div key={cat} className="mb-0.5">
                            <button onClick={() => setOverrides(o => ({ ...o, [cat]: !open }))}
                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                                <span className={`text-[10px] text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
                                <span className="flex-1 min-w-0">
                                    <span className={`inline-block max-w-full px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide text-white truncate align-middle ${color.dot || 'bg-brand-500'}`}>{cat}</span>
                                </span>
                                <span className="text-xs text-slate-400 font-medium">{items.length}</span>
                            </button>
                            {open && items.map(d => {
                                const selected = d.id === activeDossierId;
                                return (
                                    <div key={d.id} className={`group flex items-center gap-1 pl-9 pr-2 py-1.5 cursor-pointer border-l-2 text-sm ${selected ? 'bg-brand-50 border-brand-500 text-brand-800 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-50'}`}>
                                        <span className="flex-1 min-w-0 flex items-start gap-1.5" onClick={() => onSelect(d)} title={d.title}>
                                            {d.priority === 'Cao' && d.status === 'active' && <span title="Ưu tiên cao" className="text-[10px] mt-0.5 shrink-0">🔴</span>}
                                            <span className="line-clamp-2 leading-snug">{d.title}</span>
                                        </span>
                                        <button onClick={() => onEdit(d)} title="Chỉnh sửa hồ sơ" className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-brand-600 shrink-0"><IconEdit className="w-3.5 h-3.5" /></button>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
};

export default DossierTree;
