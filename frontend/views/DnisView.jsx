import React from 'react';
import { formatDate, CATEGORY_COLORS } from '../helpers.js';
import { IconDatabase, IconPlus, IconEdit, IconTrash, IconTag, IconFileText, IconCheckCircle } from '../Icons.jsx';

const DnisView = ({
    dnisLogs,
    meetings = [],
    dossiers,
    setDnisLogModalConfig,
    requestDeleteDnisLog,
    setActiveDossierId,
    setCurrentView,
    setIsCreateModalOpen,
}) => {
    // Sắp xếp theo thời gian mới nhất lên đầu, không phụ thuộc thứ tự lưu (tránh mục gộp từ sao lưu bị đẩy xuống cuối).
    const sortedLogs = [...dnisLogs].sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    return (
        <div className="max-w-6xl mx-auto pb-10">
            <div className="mb-8 border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-fuchsia-700 flex items-center gap-2"><IconDatabase /> Chuyên Đề DNIS</h2>
                    <p className="text-sm text-slate-500 mt-1">Quản lý các yêu cầu, liên hệ và hồ sơ liên quan đến Hệ thống DNIS.</p>
                </div>
                <button onClick={() => setDnisLogModalConfig({ isOpen: true, data: null })} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-md flex items-center gap-2"><IconPlus /> Thêm Nhật Ký Mới</button>
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-4">Nhật Ký Theo Dõi & Yêu Cầu</h3>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-12">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th className="p-3 pl-5 font-semibold w-40">Thời gian & Trạng thái</th>
                                <th className="p-3 font-semibold w-1/5">Đơn vị / Cơ quan</th>
                                <th className="p-3 font-semibold w-1/3">Nội dung yêu cầu</th>
                                <th className="p-3 font-semibold">Căn cứ (Nếu có)</th>
                                <th className="p-3 font-semibold text-center w-20">Tùy chỉnh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dnisLogs.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400">Chưa có nhật ký nào.</td></tr>}
                            {sortedLogs.map(log => (
                                <tr key={log.id} className="hover:bg-fuchsia-50/30 group align-top">
                                    <td className="p-3 pl-5">
                                        <div className="font-semibold text-slate-800">{formatDate(log.date)}</div>
                                        <div className={`mt-1.5 text-[10px] uppercase font-bold inline-block px-2 py-0.5 rounded-full border ${log.status === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : log.status === 'Đang thực hiện' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{log.status}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-bold text-fuchsia-700">{log.unit}</div>
                                        <div className="text-slate-500 text-xs mt-1">LH: {log.contact || 'Không có'}</div>
                                    </td>
                                    <td className="p-3 text-slate-700">{log.content}</td>
                                    <td className="p-3 text-slate-600">
                                        {log.docNumber ? <div className="font-medium">{log.docNumber}</div> : '-'}
                                        {log.docDate && <div className="text-xs text-slate-400 mt-0.5">Ngày: {log.docDate.split('-').reverse().join('/')}</div>}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                            <button onClick={() => setDnisLogModalConfig({ isOpen: true, data: log })} className="p-1 text-slate-400 hover:text-fuchsia-600"><IconEdit className="w-4 h-4"/></button>
                                            <button onClick={() => requestDeleteDnisLog(log.id)} className="p-1 text-slate-400 hover:text-rose-600"><IconTrash className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
                <span>Hồ Sơ Văn Bản DNIS</span>
                <button onClick={() => { setIsCreateModalOpen(true); setTimeout(() => { const sel = document.querySelector('select'); if(sel) sel.value = 'DNIS'; }, 100); }} className="text-sm text-fuchsia-600 font-medium hover:underline flex items-center gap-1"><IconPlus className="w-4 h-4"/> Tạo Hồ sơ DNIS</button>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {dossiers.filter(d => d.category === 'DNIS').map(dossier => (
                    <div key={dossier.id} onClick={() => { setActiveDossierId(dossier.id); setCurrentView('detail'); }} className="bg-white border border-slate-200 hover:border-fuchsia-300 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md group flex flex-col h-full relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia-600"></div>
                        <div className="flex justify-between items-start mb-3 pl-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">DNIS</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${dossier.status==='active' ? 'bg-blue-50 text-brand-600 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{dossier.status === 'active' ? 'Đang xử lý' : 'Đã kết thúc'}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 group-hover:text-fuchsia-600 mb-2 pl-2 text-lg">{dossier.title}</h3>
                        <div className="pl-2 mb-4 flex-1">
                            <div className="flex flex-wrap gap-1.5 mb-1.5">
                                {dossier.originalDoc.number && <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1"><IconTag className="w-3 h-3"/> {dossier.originalDoc.number}</span>}
                                {dossier.originalDoc.date && <span className="text-[11px] font-medium bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{dossier.originalDoc.date.split('-').reverse().join('/')}</span>}
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2" title={dossier.originalDoc.summary || dossier.originalDoc.content}>{dossier.originalDoc.summary || dossier.originalDoc.content}</p>
                        </div>
                        <div className="text-xs text-slate-500 pl-2 pt-4 border-t border-slate-100 mt-auto flex gap-3">
                            <span className="flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded"><IconFileText className="w-3.5 h-3.5"/> {1 + dossier.relatedDocs.length} VB</span>
                            <span className="flex items-center gap-1 font-medium bg-slate-50 px-2 py-1 rounded"><IconCheckCircle className="w-3.5 h-3.5"/> {dossier.tasks.filter(t=>t.isCompleted).length}/{dossier.tasks.length} Task</span>
                        </div>
                    </div>
                ))}
                {dossiers.filter(d => d.category === 'DNIS').length === 0 && <div className="col-span-2 text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">Chưa có hồ sơ văn bản nào thuộc chuyên mục DNIS.</div>}
            </div>

            <h3 className="text-lg font-bold text-slate-800 mt-12 mb-4">Nội Dung Các Cuộc Họp DNIS</h3>
            <div className="space-y-4">
                {[...meetings].filter(m => m.category === 'DNIS').sort((a, b) => new Date(b.date) - new Date(a.date)).map(m => (
                    <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-fuchsia-600"></div>
                        <div className="pl-2 flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-sm">
                            <span className="font-semibold text-fuchsia-700">{formatDate(m.date)}</span>
                            {m.location && <span className="text-slate-500 text-xs">{m.location}</span>}
                            {m.host && <span className="text-slate-700 font-medium">Chủ trì: {m.host}</span>}
                            {m.docRef && <span className="text-slate-500 text-xs">Căn cứ: {m.docRef}</span>}
                        </div>
                        <div className="pl-2 text-sm text-slate-700 whitespace-pre-wrap">{m.content}</div>
                        {m.notes && <div className="pl-2 mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600 whitespace-pre-wrap"><span className="font-semibold">Kết luận: </span>{m.notes}</div>}
                    </div>
                ))}
                {meetings.filter(m => m.category === 'DNIS').length === 0 && <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">Chưa có cuộc họp nào thuộc chuyên mục DNIS.</div>}
            </div>
        </div>
    );
};

export default DnisView;
