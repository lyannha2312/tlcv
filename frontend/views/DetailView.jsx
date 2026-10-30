import React, { useState, useEffect } from 'react';
import { formatDate, CATEGORY_COLORS, getLocalDateTimeString } from '../helpers.js';
import { FolderPopover } from '../components/FolderPopover.jsx';
import DossierFiles, { useDossierFiles, FileChip } from '../components/DossierFiles.jsx';
import PdfViewer from '../components/PdfViewer.jsx';
import { attachFiles } from '../fileMatch.js';
import dangIcon from '../assets/dang-icon.png';
import {
    IconClock, IconCalendar, IconEdit, IconCheckCircle, IconTrash,
    IconFolder, IconFileText, IconDownload, IconEye, IconEyeOff
} from '../Icons.jsx';

const TYPE_STYLE = {
    init:     { dot: 'bg-brand-500',   badge: 'bg-slate-50 text-slate-700 border-slate-200',       label: 'Khởi tạo'       },
    doc:      { dot: 'bg-slate-500',   badge: 'bg-slate-50 text-slate-700 border-slate-200',       label: 'VB Đính kèm'    },
    sub:      { dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-700 border-slate-200',       label: 'Phụ lục'        },
    directive:{ dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 border-rose-200',          label: 'VB Chỉ đạo mới' },
    result:   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'VB Kết quả'     },
    progress: { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Tiến độ'        },
    finish:   { dot: 'bg-slate-700',   badge: 'bg-slate-100 text-slate-700 border-slate-300',      label: 'Kết thúc'       },
};

export const ExpandableText = ({ text, clamp = 2, className = '' }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return null;
    const isLong = text.length > 140 || (text.match(/\n/g) || []).length >= 2;
    if (!isLong) return <div className={`whitespace-pre-line ${className}`}>{text}</div>;
    return (
        <div>
            <div className={`whitespace-pre-line ${!expanded ? (clamp === 3 ? 'line-clamp-3' : 'line-clamp-2') : ''} ${className}`}>{text}</div>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline mt-1 inline-flex items-center gap-1 cursor-pointer select-none"
            >
                {expanded ? '▲ Thu gọn' : '▼ Xem thêm...'}
            </button>
        </div>
    );
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
    serverMode,
    showToast,
    treeOpen,
}) => {
    const [editingResult, setEditingResult] = useState(false);
    const [resultDraft, setResultDraft] = useState('');
    const [pickedFile, setPickedFile] = useState(null);
    const [viewerVisible, setViewerVisible] = useState(true);
    const withViewer = serverMode === true && !!activeDossier?.folderPath;
    const files = useDossierFiles(withViewer ? activeDossier.folderPath : null);

    useEffect(() => { setPickedFile(null); }, [activeDossier?.id]);

    // Chia hai cột (timeline | khung đọc) khi đủ rộng; danh sách hồ sơ bên trái đang mở thì cần rộng hơn.
    const minWide = treeOpen ? 1536 : 1280;
    const [wide, setWide] = useState(() => window.innerWidth >= minWide);
    useEffect(() => {
        const mq = window.matchMedia(`(min-width: ${minWide}px)`);
        const onChange = () => setWide(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [minWide]);

    if (!activeDossier) return null;

    let events = [];
    events.push({
        time: activeDossier.createdAt,
        type: 'init',
        number: activeDossier.originalDoc.number,
        title: 'Khởi tạo hồ sơ',
        desc: (
            <div className="space-y-1.5">
                <div>Nhận văn bản: <strong>{activeDossier.originalDoc.number}</strong>{activeDossier.originalDoc.date ? ` (Ngày ${activeDossier.originalDoc.date.split('-').reverse().join('/')})` : ''}{activeDossier.originalDoc.summary ? ` — ${activeDossier.originalDoc.summary}` : ''}</div>
                {activeDossier.originalDoc.content && (
                    <div className="mt-1 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-800">Ý kiến chỉ đạo: </span>
                        <ExpandableText text={activeDossier.originalDoc.content} clamp={2} className="inline text-slate-700 text-sm" />
                    </div>
                )}
            </div>
        )
    });
    activeDossier.relatedDocs.forEach(doc => {
        if (doc.type === 'progress') events.push({ id: doc.id, time: doc.addedAt, sortDate: doc.date || (doc.addedAt || '').slice(0, 10), type: 'progress', title: 'Cập nhật tiến độ', desc: doc.content, date: doc.date, rawData: doc });
        else {
            const evtType = doc.docType === 'Văn bản kết quả' ? 'result' : doc.docType === 'Phụ lục' ? 'sub' : doc.docType === 'Văn bản chỉ đạo mới' ? 'directive' : 'doc';
            events.push({ id: doc.id, time: doc.addedAt, sortDate: doc.date || (doc.addedAt || '').slice(0, 10), number: doc.number, type: evtType, title: `${doc.docType || 'Văn bản'}: ${doc.number}`, desc: doc.content, extra: doc.fileName, note: doc.note, docDate: doc.date, rawData: doc });
        }
    });
    if (activeDossier.status === 'archived' && activeDossier.finalResult && activeDossier.closedAt) {
        events.push({ time: activeDossier.closedAt, type: 'finish', title: 'Kết Thúc Hồ Sơ', desc: activeDossier.finalResult });
    }
    // Khởi tạo luôn đầu, kết thúc luôn cuối; còn lại xếp theo ngày của văn bản/tiến độ (không phải ngày nhập vào hệ thống).
    events.sort((a, b) => {
        if (a.type === 'finish') return 1;
        if (b.type === 'finish') return -1;
        if (a.type === 'init') return -1;
        if (b.type === 'init') return 1;
        return (a.sortDate || '').localeCompare(b.sortDate || '') || new Date(a.time) - new Date(b.time);
    });
    const attached = withViewer && files.categories ? attachFiles(events, files.categories) : { byIndex: [], unassigned: [] };
    const orderedFiles = [...attached.byIndex.flat(), ...attached.unassigned];
    // Màn hình rộng luôn có khung đọc bên phải khi viewerVisible: chưa chọn thì mở văn bản đầu tiên của timeline.
    const selectedFile = pickedFile || (wide && viewerVisible ? (orderedFiles.find(f => /\.pdf$/i.test(f.fileName)) || orderedFiles[0]) : null) || null;
    const eventDate = (evt) => /^\d{4}-\d{2}-\d{2}$/.test(evt.sortDate || '') ? evt.sortDate.split('-').reverse().join('/') : formatDate(evt.time);

    const isActive = activeDossier.status === 'active';
    const catTheme = CATEGORY_COLORS[activeDossier.category] || CATEGORY_COLORS['KHÁC'];

    return (
        <div className={withViewer && viewerVisible ? `max-w-[1700px] mx-auto pb-20 ${wide ? 'grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-start' : 'max-w-3xl'}` : 'max-w-3xl mx-auto pb-20'}>
        <div className="space-y-4 min-w-0">

            {/* Nút quay lại + toggle khung đọc + xuất Excel / JSON */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <button onClick={() => setCurrentView(isActive ? 'workspace' : 'archive')}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">
                    ← Quay lại {isActive ? 'Bàn làm việc' : 'Kho hồ sơ'}
                </button>
                <div className="flex items-center gap-2 flex-wrap">
                    {withViewer && (
                        <button onClick={() => {
                            if (!viewerVisible && !selectedFile && orderedFiles.length > 0) setPickedFile(orderedFiles[0]);
                            setViewerVisible(v => !v);
                        }}
                        title={viewerVisible ? 'Ẩn khung đọc tài liệu bên phải' : 'Hiện khung đọc tài liệu bên phải'}
                        className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${viewerVisible ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border-brand-200 shadow-sm'}`}>
                            {viewerVisible ? <IconEyeOff className="w-4 h-4"/> : <IconEye className="w-4 h-4"/>}
                            <span>{viewerVisible ? 'Ẩn khung đọc' : 'Hiện khung đọc'}</span>
                        </button>
                    )}
                    <button onClick={() => exportDossierToJson(activeDossier)}
                        title="Xuất hồ sơ này ra file JSON (có thể Import lại vào hệ thống)"
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">
                        <IconDownload className="w-4 h-4"/> Xuất JSON
                    </button>
                    <button onClick={() => exportDossierToExcel(activeDossier)}
                        title="Xuất hồ sơ này ra file Excel (theo mẫu Danh_Muc_Ho_So)"
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">
                        <IconDownload className="w-4 h-4"/> Xuất Excel
                    </button>
                </div>
            </div>

            {/* Card thông tin hồ sơ */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 md:p-5">
                    {/* Badges + edit */}
                    <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center flex-wrap gap-1.5">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1.5 ${catTheme.bg} ${catTheme.text} ${catTheme.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${catTheme.dot || 'bg-brand-500'}`}></span>
                                {activeDossier.category || 'KHÁC'}
                            </span>
                            {activeDossier.priority === 'Cao' && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">🔴 Khẩn</span>
                            )}
                            {activeDossier.deadline && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                    <IconCalendar className="w-3 h-3"/> Hạn: {activeDossier.deadline.split('-').reverse().join('/')}
                                </span>
                            )}
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${isActive ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
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
                    <h2 className="text-lg font-bold text-slate-800 mb-1 leading-snug">{activeDossier.title}</h2>
                    {/* Ngày tạo */}
                    <p className="text-xs text-slate-400">Tạo ngày: {formatDate(activeDossier.createdAt)}</p>
                </div>
                {/* Footer actions */}
                <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 flex items-center justify-between gap-2">
                    <div>
                        {activeDossier.folderPath && <FolderPopover folderName={activeDossier.folderPath} />}
                    </div>
                    <button onClick={() => setDocModalConfig({isOpen: true, data: null, dossierId: activeDossier.id, isArchived: !isActive})}
                        className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-1.5 rounded-lg font-medium shadow-sm text-xs">
                        <IconEdit className="w-3.5 h-3.5"/> Cập nhật nội dung
                    </button>
                </div>
            </div>

            {/* Ghi chú hồ sơ */}
            {activeDossier.note && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                        <IconFileText className="w-4 h-4 text-amber-500"/> Ghi Chú Hồ Sơ
                    </h3>
                    <div className="text-sm text-slate-600 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: activeDossier.note }}></div>
                </div>
            )}

            {/* Timeline */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                    <IconClock className="w-4 h-4 text-brand-500"/> Nhật Ký Xử Lý
                </h3>
                <div className="relative border-l-2 border-slate-100 ml-2 space-y-4">
                    {events.map((evt, idx) => {
                        const s = TYPE_STYLE[evt.type] || TYPE_STYLE.init;
                        return (
                            <div key={idx} className="relative pl-5">
                                {/* Dot */}
                                <div className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full border-2 border-white shadow ${s.dot}`}></div>
                                <div className="border border-slate-200 rounded-xl p-3.5 bg-white hover:shadow-sm transition-shadow">
                                    {/* Header: badge + timestamp + actions */}
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wide ${s.badge}`}>{s.label}</span>
                                            <span className="text-xs text-slate-400 font-mono">{eventDate(evt)}</span>
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
                                    <div className="font-semibold text-slate-800 text-sm mb-1">{evt.title}</div>
                                    {/* Đơn vị phát hành */}
                                    {evt.rawData?.type === 'document' && evt.rawData.sender && (
                                        <div className="mb-1 text-xs text-slate-500 flex items-center gap-1.5">
                                            {evt.type === 'result' && evt.rawData.sender === 'ĐUCATP' && (
                                                <img src={dangIcon} alt="Cờ Đảng" title="Văn bản của Đảng ủy Công an thành phố" className="h-4 w-auto rounded-sm shadow-sm" />
                                            )}
                                            <span>Đơn vị phát hành: <strong className="text-slate-700">{evt.rawData.sender}</strong></span>
                                        </div>
                                    )}
                                    {/* Content (thu gọn nếu dài) */}
                                    {typeof evt.desc === 'string' ? (
                                        <ExpandableText text={evt.desc} clamp={3} className="text-sm text-slate-600 leading-relaxed" />
                                    ) : (
                                        <div className="text-sm text-slate-600 leading-relaxed">{evt.desc}</div>
                                    )}
                                    {/* Extra fields */}
                                    {evt.docDate && (
                                        <div className="mt-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-max">
                                            Ngày ban hành: {evt.docDate.split('-').reverse().join('/')}
                                        </div>
                                    )}
                                    {evt.note && (
                                        <div className="mt-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
                                            <span className="font-semibold">Ghi chú:</span> {evt.note}
                                        </div>
                                    )}
                                    {attached.byIndex[idx]?.length > 0 && (
                                        <div className="mt-2.5 space-y-1.5">
                                            {attached.byIndex[idx].map(f => (
                                                <FileChip
                                                    key={f.key}
                                                    file={f}
                                                    active={selectedFile?.key === f.key}
                                                    onSelect={(file) => { setPickedFile(file); setViewerVisible(true); }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {evt.rawData?.filePath && (
                                        <span onClick={() => navigator.clipboard.writeText(evt.rawData.filePath)}
                                            className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-max max-w-full truncate cursor-pointer select-none"
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

            {attached.unassigned.length > 0 && (
                <div className="bg-white border border-amber-200 rounded-2xl shadow-sm p-4 md:p-5">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-sm"><IconFileText className="w-4 h-4 text-amber-500"/> Tài liệu chưa gắn vào tiến trình</h4>
                    <p className="text-xs text-slate-500 mb-2.5">Có trong thư mục hồ sơ nhưng chưa khớp với văn bản nào ở timeline. Muốn gắn vào đúng mốc: bấm Sửa ở mốc đó rồi chọn file ở ô "File trong kho hồ sơ".</p>
                    {[...new Set(attached.unassigned.map(f => f.category))].map(cat => (
                        <div key={cat} className="mb-2.5 last:mb-0">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{cat}</div>
                            <div className="space-y-1">
                                {attached.unassigned.filter(f => f.category === cat).map(f => (
                                    <FileChip
                                        key={f.key}
                                        file={f}
                                        active={selectedFile?.key === f.key}
                                        onSelect={(file) => { setPickedFile(file); setViewerVisible(true); }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {withViewer && <DossierFiles files={files} showToast={showToast} />}

            {/* Kết quả cuối cùng */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                    <IconCheckCircle className="w-4 h-4 text-slate-400"/> Kết Quả Cuối Cùng
                </h4>
                {isActive ? (
                    <div className="space-y-2.5">
                        <p className="text-xs text-slate-500">Hồ sơ đang trong quá trình thực hiện. Khi hoàn thành toàn bộ công việc, bấm "Cập nhật nội dung xử lý" &gt; tab "Đóng hồ sơ" để kết thúc và lưu kết quả.</p>
                        <button onClick={() => setDocModalConfig({isOpen: true, data: null, dossierId: activeDossier.id, initialTab: 'close'})}
                            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors">
                            <IconCheckCircle className="w-3.5 h-3.5"/> Đóng hồ sơ này
                        </button>
                    </div>
                ) : (
                    <div>
                        {editingResult ? (
                            <div className="space-y-2.5">
                                <textarea rows="3" value={resultDraft} onChange={e => setResultDraft(e.target.value)}
                                    placeholder="Nhập kết quả xử lý / số ký hiệu văn bản hoàn thành..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none"/>
                                <div className="flex gap-2">
                                    <button onClick={() => { updateFinalResult(activeDossier.id, resultDraft, activeDossier.closedAt); setEditingResult(false); }}
                                        className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-medium">Lưu kết quả</button>
                                    <button onClick={() => setEditingResult(false)}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium">Hủy</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed">
                                    {activeDossier.finalResult || <span className="text-slate-400 italic">Chưa ghi nhận kết quả cụ thể.</span>}
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>Đã đóng lúc: {formatDate(activeDossier.closedAt)}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setResultDraft(activeDossier.finalResult || ''); setEditingResult(true); }}
                                            className="text-brand-600 hover:underline font-medium">Sửa kết quả</button>
                                        <span>·</span>
                                        <button onClick={() => reopenDossier(activeDossier.id)}
                                            className="text-amber-600 hover:underline font-medium">Mở lại hồ sơ</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        {withViewer && viewerVisible && (
            <aside className={wide ? 'sticky top-0 h-[calc(100vh-7.5rem)]' : 'fixed inset-0 z-50 bg-slate-900/40 p-3'}>
                <PdfViewer
                    file={selectedFile}
                    files={orderedFiles}
                    onSelect={(f) => { setPickedFile(f); setViewerVisible(true); }}
                    onClose={() => setViewerVisible(false)}
                    overlay={!wide}
                />
            </aside>
        )}
        </div>
    );
};

export default DetailView;
