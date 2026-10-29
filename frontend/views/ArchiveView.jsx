import React, { useState } from 'react';
import { CATEGORY_COLORS, CATEGORIES, hasDucatpDoc } from '../helpers.js';
import dangIcon from '../assets/dang-icon.png';
import { IconSearch, IconDownload, IconFileText, IconTag, IconCalendar, IconTrash } from '../Icons.jsx';

const ArchiveView = ({
    filteredDossiers,
    searchQuery,
    setSearchQuery,
    setActiveDossierId,
    setCurrentView,
    exportToExcel,
    requestDeleteDossier,
}) => {
    const [activeCategory, setActiveCategory] = useState(null);
    const [activeStatus, setActiveStatus] = useState(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const matchesCategory = d => !activeCategory || d.category === activeCategory;
    const matchesStatus = d => !activeStatus || d.status === activeStatus;
    const matchesDate = d =>
        (!dateFrom || (d.originalDoc.date && d.originalDoc.date >= dateFrom)) &&
        (!dateTo || (d.originalDoc.date && d.originalDoc.date <= dateTo));

    const displayDossiers = filteredDossiers.filter(d => matchesCategory(d) && matchesStatus(d) && matchesDate(d));

    // Base lists used to compute live counts per filter, each excluding its own dimension
    // so a filter's own count reflects the OTHER active filters, not itself.
    const categoryCountBase = filteredDossiers.filter(d => matchesStatus(d) && matchesDate(d));
    const statusCountBase = filteredDossiers.filter(d => matchesCategory(d) && matchesDate(d));

    const availableCategories = CATEGORIES.filter(cat =>
        categoryCountBase.some(d => d.category === cat)
    );

    const isFiltered = searchQuery || activeCategory || activeStatus || dateFrom || dateTo;

    return (
        <div className="max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Kho Hồ Sơ & Tra Cứu</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {isFiltered
                            ? <span><span className="font-semibold text-slate-700">{displayDossiers.length}</span> / {filteredDossiers.length} hồ sơ</span>
                            : <span><span className="font-semibold text-slate-700">{filteredDossiers.length}</span> hồ sơ</span>
                        }
                    </p>
                </div>
                <button onClick={exportToExcel} className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-md">
                    <IconDownload /> Xuất Excel
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><IconSearch /></div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tra cứu theo tên hồ sơ, số hiệu, chuyên mục..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 shadow-sm"
                />
            </div>

            {/* Category tags */}
            <div className="flex flex-wrap gap-2 mb-3">
                <button
                    onClick={() => setActiveCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${!activeCategory ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'}`}
                >
                    Tất cả ({categoryCountBase.length})
                </button>
                {availableCategories.map(cat => {
                    const count = categoryCountBase.filter(d => d.category === cat).length;
                    const theme = CATEGORY_COLORS[cat];
                    const isActive = activeCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(isActive ? null : cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${isActive ? `${theme.bg} ${theme.text} ${theme.border}` : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'}`}
                        >
                            {cat} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Status filter + date range */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-7">
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: null, label: 'Tất cả trạng thái' },
                        { key: 'active', label: 'Đang xử lý' },
                        { key: 'archived', label: 'Hoàn thành' },
                    ].map(opt => {
                        const isActive = activeStatus === opt.key;
                        const count = opt.key ? statusCountBase.filter(d => d.status === opt.key).length : statusCountBase.length;
                        return (
                            <button
                                key={opt.label}
                                onClick={() => setActiveStatus(isActive ? null : opt.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${isActive ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'}`}
                            >
                                {opt.label} ({count})
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 sm:ml-auto">
                    <span className="font-medium shrink-0">Từ ngày</span>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        max={dateTo || undefined}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                    <span className="font-medium shrink-0">đến ngày</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        min={dateFrom || undefined}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                    {(dateFrom || dateTo) && (
                        <button
                            onClick={() => { setDateFrom(''); setDateTo(''); }}
                            className="text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2"
                        >
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            {displayDossiers.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <IconSearch className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Không tìm thấy hồ sơ nào</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayDossiers.map(dossier => {
                        const catTheme = CATEGORY_COLORS[dossier.category] || CATEGORY_COLORS['KHÁC'];
                        return (
                            <div key={dossier.id} onClick={() => { setActiveDossierId(dossier.id); setCurrentView('detail'); }}
                                className="bg-white border border-slate-200 hover:border-brand-300 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md group flex flex-col h-full relative overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${catTheme.solid}`}></div>
                                <div className="flex justify-between items-start mb-3 pl-2">
                                    <div className="flex gap-2 flex-wrap">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${catTheme.bg} ${catTheme.text} border ${catTheme.border}`}>{dossier.category || 'KHÁC'}</span>
                                        {dossier.status === 'active' && dossier.priority === 'Cao' && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">🔴 Cấp bách</span>}
                                        {dossier.status === 'active' && dossier.deadline && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">⏰ {dossier.deadline.split('-').reverse().join('/')}</span>}
                                        {hasDucatpDoc(dossier) && <img src={dangIcon} alt="Cờ Đảng" title="Có văn bản của Đảng ủy Công an thành phố (ĐUCATP)" className="h-5 w-auto rounded-sm shadow-sm" />}
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${dossier.status === 'active' ? 'bg-blue-50 text-brand-600 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {dossier.status === 'active' ? 'Đang xử lý' : 'Đã kết thúc'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-800 group-hover:text-brand-600 mb-2 pl-2 text-sm leading-snug line-clamp-2">{dossier.title}</h3>
                                <div className="pl-2 mb-4 flex-1">
                                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                                        {dossier.originalDoc.number && <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1"><IconTag className="w-3 h-3"/> {dossier.originalDoc.number}</span>}
                                        {dossier.originalDoc.date && <span className="text-[11px] font-medium bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{dossier.originalDoc.date.split('-').reverse().join('/')}</span>}
                                    </div>
                                    <p className="text-sm text-slate-600 line-clamp-2" title={dossier.originalDoc.summary || dossier.originalDoc.content}>{dossier.originalDoc.summary || dossier.originalDoc.content}</p>
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-slate-500 pl-2 pt-3 border-t border-slate-100 mt-auto">
                                    <span className="flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded"><IconFileText className="w-3.5 h-3.5"/> {1 + dossier.relatedDocs.length} VB</span>
                                    {dossier.createdAt && <span className="flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded"><IconCalendar className="w-3.5 h-3.5"/> Giao: {new Date(dossier.createdAt).toLocaleDateString('vi-VN')}</span>}
                                    <button
                                        onClick={e => { e.stopPropagation(); requestDeleteDossier(dossier); }}
                                        title="Xóa hồ sơ"
                                        className="ml-auto flex items-center gap-1 font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                                    >
                                        <IconTrash className="w-3.5 h-3.5"/> 
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ArchiveView;
