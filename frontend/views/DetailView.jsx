import React, { useState } from 'react';
import { formatDate, CATEGORY_COLORS, getLocalDateTimeString } from '../helpers.js';
import { FolderPopover } from '../components/FolderPopover.jsx';
import dangIcon from '../assets/dang-icon.png';
import { IconClock, IconCalendar, IconEdit, IconCheckCircle, IconTrash, IconFolder, IconFileText, IconDownload } from '../Icons.jsx';

const TYPE_STYLE = {
    init:     { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200',         label: 'Khởi tạo'     },
    doc:      { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'VB Đính kèm'  },
    sub:      { dot: 'bg-teal-400',    badge: 'bg-teal-50 text-teal-700 border-teal-200',          label: 'Phụ lục'      },
    directive:{ dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 border-rose-200',          label: 'VB Chỉ đạo mới' },
    result:   { dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200',    label: 'VB Kết quả'   },
    progress: { dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Tiến độ'      },
    finish:   { dot: 'bg-slate-700',   badge: 'bg-slate-100 text-slate-700 border-slate-300',      label: 'Kết thúc'     },
};

const DetailView = ({
    activeDossier,
    setCurrentView,
    setEditDossierConfig,
    setDocModalConfig,
    requestDeleteRelatedDoc,
    updateFinalResult,
    reopenDossier,
    exportDossierToExcel,
    exportDossierToJson,
}) => {
    const [editingResult, setEditingResult] = useState(false);
    const [resultDraft, setResultDraft] = useState('');

    if (!activeDossier) return null;

    let events = [];
    events.push({
        time: activeDossier.createdAt,
        type: 'init',
        title: 'Khởi tạo hồ sơ',
        desc: (
            <div>
                <div>Nhận văn bản: <strong>{activeDossier.originalDoc.number}</strong>{activeDossier.originalDoc.date ? ` (Ngày ${activeDossier.originalDoc.date.split('-').reverse().join('/')})` : ''}{activeDossier.originalDoc.summary ? ` — ${activeDossier.originalDoc.summary}` : ''}</div>
                {activeDossier.originalDoc.content && <div className="mt-2 text-slate-700"><span className="font-semibold">Ý kiến chỉ đạo:</span> {activeDossier.originalDoc.content}</div>}
            </div>
        )
    });
    activeDossier.relatedDocs.forEach(doc => {
        if (doc.type === 'progress') events.push({ id: doc.id, time: doc.addedAt, type: 'progress', title: 'Cập nhật tiến độ', desc: doc.content, date: doc.date, rawData: doc });
        else {
            const evtType = doc.docType === 'Văn bản kết quả' ? 'result' : doc.docType === 'Phụ lục' ? 'sub' : doc.docType === 'Văn bản chỉ đạo mới' ? 'directive' : 'doc';
            events.push({ id: doc.id, time: doc.addedAt, type: evtType, title: `${doc.docType || 'Văn bản'}: ${doc.number}`, desc: doc.content, extra: doc.fileName, note: doc.note, docDate: doc.date, rawData: doc });
        }
    });
    if (activeDossier.status === 'archived' && activeDossier.finalResult && activeDossier.closedAt) {
        events.push({ time: activeDossier.closedAt, type: 'finish', title: 'Kết Thúc Hồ Sơ', desc: activeDossier.finalResult });
    }
    events.sort((a, b) => {
        if (a.type === 'finish') return 1;
        if (b.type === 'finish') return -1;
        return new Date(a.time) - new Date(b.time);
    });

    const isActive = activeDossier.status === 'active';

    return (
        <div className="max-w-3xl mx-auto pb-20 space-y-5">

            {/* Nút quay lại + xuất Excel */}
            <div className="flex items-center justify-between gap-2">
                <button onClick={() => setCurrentView(isActive ? 'workspace' : 'archive')}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600 hover:bg-brand-50 px-3 py-2 rounded-lg border border-transparent hover:border-brand-200 transition-colors">
                    ← Quay lại {isActive ? 'Bàn làm việc' : 'Kho hồ sơ'}
                </button>
                <div className="flex items-center gap-2">
                    <button onClick={() => exportDossierToJson(activeDossier)}
                        title="Xuất hồ sơ này ra file JSON (có thể Import lại vào hệ thống)"
                        className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200 transition-colors">
                        <IconDownload className="w-4 h-4"/> Xuất JSON
                    </button>
                    <button onClick={() => exportDossierToExcel(activeDossier)}
                        title="Xuất hồ sơ này ra file Excel (theo mẫu Danh_Muc_Ho_So)"
                        className="flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg border border-emerald-200 transition-colors">
                        <IconDownload className="w-4 h-4"/> Xuất Excel
                    </button>
                </div>
            </div>

            {/* Card thông tin hồ sơ */}
            <div className={`bg-white border-t-4 border border-slate-200 rounded-2xl shadow-sm ${CATEGORY_COLORS[activeDossier.category]?.border.replace('border-', 'border-t-') || 'border-t-slate-500'}`}>
                <div className="p-6">
                    {/* Badges + edit */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center flex-wrap gap-2">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${CATEGORY_COLORS[activeDossier.category]?.bg} ${CATEGORY_COLORS[activeDossier.category]?.text} border ${CATEGORY_COLORS[activeDossier.category]?.border}`}>
                                {activeDossier.category || 'KHÁC'}
                            </span>
                            {activeDossier.priority === 'Cao' && (
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">🔴 Ưu tiên Cao</span>
                            )}
                            {activeDossier.deadline && (
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                                    <IconCalendar className="w-3 h-3"/> Hạn: {activeDossier.deadline.split('-').reverse().join('/')}
                                </span>
                            )}
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border ${isActive ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {isActive ? 'Đang xử lý' : 'Đã kết thúc'}
                            </span>
                        </div>
                        <button onClick={() => setEditDossierConfig({isOpen: true, data: activeDossier})}
                            className="text-slate-400 hover:text-brand-600 hover:bg-brand-50 p-1.5 rounded-lg border border-transparent hover:border-brand-200 transition-colors"
                            title="Chỉnh sửa hồ sơ">
                            <IconEdit className="w-4 h-4"/>
                        </button>
                    </div>
                    {/* Tiêu đề */}
                    <h2 className="text-xl font-bold text-slate-800 mb-3 leading-snug">{activeDossier.title}</h2>
                    {/* Ngày tạo */}
                    <p className="text-xs text-slate-400 font-medium">Tạo ngày: {formatDate(activeDossier.createdAt)}</p>
                </div>
                {/* Footer actions */}
                <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3 flex items-center justify-between gap-2 rounded-b-2xl">
                    <div>
                        {activeDossier.folderPath && <FolderPopover folderName={activeDossier.folderPath} />}
                    </div>
                    <button onClick={() => setDocModalConfig({isOpen: true, data: null, dossierId: activeDossier.id, isArchived: !isActive})}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium shadow-sm text-sm">
                        <IconEdit className="w-4 h-4"/> Cập nhật nội dung
                    </button>
                </div>
            </div>

            {/* Ghi chú hồ sơ */}
            {activeDossier.note && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <IconFileText className="w-5 h-5 text-amber-500"/> Ghi Chú Hồ Sơ
                    </h3>
                    <div className="text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: activeDossier.note }}></div>
                </div>
            )}

            {/* Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <IconClock className="w-5 h-5 text-brand-500"/> Nhật Ký Xử Lý
                </h3>
                <div className="relative border-l-2 border-slate-100 ml-2 space-y-6">
                    {events.map((evt, idx) => {
                        const s = TYPE_STYLE[evt.type] || TYPE_STYLE.init;
                        return (
                            <div key={idx} className="relative pl-6">
                                {/* Dot */}
                                <div className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full border-2 border-white shadow ${s.dot}`}></div>
                                <div className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
                                    {/* Header: badge + timestamp + actions */}
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${s.badge}`}>{s.label}</span>
                                            <span className="text-xs text-slate-400 font-mono">{formatDate(evt.time)}</span>
                                        </div>
                                        {(evt.type === 'doc' || evt.type === 'progress' || evt.type === 'result' || evt.type === 'sub') && (
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => setDocModalConfig({isOpen: true, data: evt.rawData, dossierId: activeDossier.id, isArchived: !isActive})}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded border border-slate-200 hover:border-brand-300">
                                                    <IconEdit className="w-3 h-3"/> Sửa
                                                </button>
                                                <button onClick={() => requestDeleteRelatedDoc(activeDossier.id, evt.id)}
                                                    className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded border border-slate-200 hover:border-rose-300">
                                                    <IconTrash className="w-3 h-3"/> Xóa
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {/* Title */}
                                    <div className="font-semibold text-slate-800 text-sm mb-1.5">{evt.title}</div>
                                    {/* Đơn vị phát hành */}
                                    {evt.rawData?.type === 'document' && evt.rawData.sender && (
                                        <div className="mb-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                                            {evt.type === 'result' && evt.rawData.sender === 'ĐUCATP' && (
                                                <img src={dangIcon} alt="Cờ Đảng" title="Văn bản của Đảng ủy Công an thành phố" className="h-4 w-auto rounded-sm shadow-sm" />
                                            )}
                                            <span>Đơn vị phát hành: <strong className="text-slate-700">{evt.rawData.sender}</strong></span>
                                        </div>
                                    )}
                                    {/* Content */}
                                    <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{evt.desc}</div>
                                    {/* Extra fields */}
                                    {evt.docDate && (
                                        <div className="mt-2 text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded border border-slate-100 w-max">
                                            Ngày ban hành: {evt.docDate.split('-').reverse().join('/')}
                                        </div>
                                    )}
                                    {evt.note && (
                                        <div className="mt-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                                            <span className="font-semibold">Ghi chú:</span> {evt.note}
                                        </div>
                                    )}
                                    {evt.rawData?.filePath && (
                                        <span onClick={() => navigator.clipboard.writeText(evt.rawData.filePath)}
                                            className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded border border-slate-200 w-max max-w-full truncate cursor-pointer select-none"
                                            title={`Nhấn để copy: ${evt.rawData.filePath}`}>
                                            <IconFileText className="w-3.5 h-3.5 shrink-0"/> {evt.rawData.filePath.split(/[\\/]/).pop()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Kết quả cuối cùng */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <IconCheckCircle className="w-5 h-5 text-slate-400"/> Kết Quả Cuối Cùng
                </h4>
                {isActive ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Ngày đóng hồ sơ</label>
                                <input type="date" id="finalResultDate" defaultValue={getLocalDateTimeString().split('T')[0]}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Kết quả / Số văn bản báo cáo</label>
                                <textarea id="finalResultInput" rows="2"
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500"
                                    placeholder="Nhập kết quả hoặc số ký hiệu văn bản báo cáo..."/>
                            </div>
                        </div>
                        <button onClick={() => {
                            const val = document.getElementById('finalResultInput').value;
                            const dateVal = document.getElementById('finalResultDate').value;
                            if (val) updateFinalResult(activeDossier.id, val, dateVal);
                        }} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium shadow-sm">
                            Lưu & Đóng hồ sơ
                        </button>
                    </div>
                ) : editingResult ? (
                    <div className="space-y-3">
                        <textarea rows="3" value={resultDraft} onChange={e => setResultDraft(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500"/>
                        <div className="flex gap-2">
                            <button onClick={() => { if (resultDraft.trim()) { updateFinalResult(activeDossier.id, resultDraft.trim(), activeDossier.closedAt); setEditingResult(false); } }}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium">Lưu</button>
                            <button onClick={() => setEditingResult(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Hủy</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <IconCheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"/>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold text-emerald-800 text-sm">{activeDossier.finalResult}</div>
                            {activeDossier.closedAt && <div className="text-xs text-emerald-600 mt-1">Đóng ngày: {formatDate(activeDossier.closedAt)}</div>}
                        </div>
                        <div className="shrink-0 flex flex-col gap-1.5 items-end">
                            <button onClick={() => { setResultDraft(activeDossier.finalResult); setEditingResult(true); }}
                                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded border border-emerald-200 font-medium">
                                <IconEdit className="w-3 h-3"/> Sửa
                            </button>
                            <button onClick={() => reopenDossier(activeDossier.id)}
                                className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded border border-amber-200 font-medium">
                                <IconClock className="w-3 h-3"/> Chuyển về Đang thực hiện
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailView;
