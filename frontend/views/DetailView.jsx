import React, { useState, useEffect } from 'react';
import { formatDate, CATEGORY_COLORS, getLocalDateTimeString } from '../helpers.js';
import DossierFiles, { useDossierFiles, FileChip, openDossierFolder } from '../components/DossierFiles.jsx';
import PdfViewer from '../components/PdfViewer.jsx';
import { attachFiles, STAGE_CONSULT, DOC_TYPE_CONSULT, REPORTS_FOLDER, isConsultRaw, folderLabel, isWebLink } from '../fileMatch.js';
import dangIcon from '../assets/dang-icon.png';
import {
    IconClock, IconCalendar, IconEdit, IconCheckCircle, IconTrash,
    IconFolder, IconFileText, IconDownload, IconEye, IconEyeOff, IconExternalLink
} from '../Icons.jsx';

const TYPE_STYLE = {
    init:     { dot: 'bg-brand-500',   badge: 'bg-slate-50 text-slate-700 border-slate-200',       label: 'Khởi tạo'       },
    doc:      { dot: 'bg-slate-500',   badge: 'bg-slate-50 text-slate-700 border-slate-200',       label: 'VB Đính kèm'    },
    sub:      { dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-700 border-slate-200',       label: 'Phụ lục'        },
    directive:{ dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 border-rose-200',          label: 'VB Chỉ đạo mới' },
    result:   { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'VB Kết quả'     },
    progress: { dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700 border-amber-200',       label: 'Tiến độ'        },
    consult:  { dot: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700 border-violet-200',    label: 'Lấy ý kiến'     },
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

// Danh sách file ở một mốc: quá 5 file thì chỉ hiện 5 file đầu, còn lại thu gọn.
const FileList = ({ files, selectedKey, onPick, limit = 5 }) => {
    const chips = (list) => list.map(f => <FileChip key={f.key} file={f} active={selectedKey === f.key} onSelect={onPick} />);
    return (
        <div className="mt-2.5 space-y-1.5">
            {chips(files.slice(0, limit))}
            {files.length > limit && (
                <details>
                    <summary className="text-xs font-semibold text-brand-600 cursor-pointer select-none">Xem thêm {files.length - limit} file</summary>
                    <div className="mt-1.5 space-y-1.5">{chips(files.slice(limit))}</div>
                </details>
            )}
        </div>
    );
};

// Báo cáo của các đơn vị/địa phương: chỉ đếm và liệt kê file, không theo dõi từng đơn vị.
const ReportsList = ({ files, selectedKey, onPick, deadline }) => (
    <details className="mt-2.5 rounded-lg border border-violet-200 bg-violet-50/40" open={files.length > 0 && files.length <= 5}>
        <summary className="px-3 py-2 text-xs font-semibold text-violet-800 cursor-pointer select-none">
            📥 {files.length > 0 ? `${files.length} báo cáo từ các đơn vị` : 'Chưa có báo cáo nào trong thư mục'}
            {deadline ? ` · hạn góp ý ${deadline.split('-').reverse().join('/')}` : ''}
        </summary>
        {files.length > 0 && (
            <div className="px-3 pb-3 space-y-1.5">
                {files.map(f => <FileChip key={f.key} file={f} active={selectedKey === f.key} onSelect={onPick} />)}
            </div>
        )}
    </details>
);

const DetailView = ({
    activeDossier,
    setCurrentView,
    setEditDossierConfig,
    setDocModalConfig,
    requestDeleteRelatedDoc,
    updateFinalResult,
    reopenDossier,
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
        docDate: activeDossier.originalDoc.date,
        desc: (
            <div className="space-y-1.5">
                {activeDossier.originalDoc.summary && <div>{activeDossier.originalDoc.summary}</div>}
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
        if (doc.type === 'progress') {
            const consult = doc.stage === STAGE_CONSULT;
            events.push({ id: doc.id, time: doc.addedAt, sortDate: doc.date || (doc.addedAt || '').slice(0, 10), type: consult ? 'consult' : 'progress', desc: doc.content, date: doc.date, rawData: doc });
        }
        else {
            const evtType = doc.docType === DOC_TYPE_CONSULT ? 'consult' : doc.docType === 'Văn bản kết quả' ? 'result' : doc.docType === 'Phụ lục' ? 'sub' : doc.docType === 'Văn bản chỉ đạo mới' ? 'directive' : 'doc';
            events.push({ id: doc.id, time: doc.addedAt, sortDate: doc.date || (doc.addedAt || '').slice(0, 10), number: doc.number, type: evtType, desc: doc.content, extra: doc.fileName, note: doc.note, docDate: doc.date, rawData: doc });
        }
    });
    if (activeDossier.status === 'archived' && activeDossier.finalResult && activeDossier.closedAt) {
        events.push({ time: activeDossier.closedAt, type: 'finish', desc: '' });
    }
    // Khởi tạo luôn đầu, kết thúc luôn cuối; còn lại xếp theo ngày của văn bản/tiến độ (không phải ngày nhập vào hệ thống).
    events.sort((a, b) => {
        if (a.type === 'finish') return 1;
        if (b.type === 'finish') return -1;
        if (a.type === 'init') return -1;
        if (b.type === 'init') return 1;
        return (a.sortDate || '').localeCompare(b.sortDate || '') || new Date(a.time) - new Date(b.time);
    });
    const attached = withViewer && files.categories ? attachFiles(events, files.categories) : { byIndex: [], unassigned: [], reports: [], others: [] };
    const orderedFiles = [...attached.byIndex.flat(), ...attached.unassigned, ...attached.reports, ...attached.others];
    const pickFile = (file) => { setPickedFile(file); setViewerVisible(true); };
    // Màn hình rộng luôn có khung đọc bên phải khi viewerVisible: chưa chọn thì mở văn bản đầu tiên của timeline.
    const selectedFile = pickedFile || (wide && viewerVisible ? (orderedFiles.find(f => /\.pdf$/i.test(f.fileName)) || orderedFiles[0]) : null) || null;
    const eventDate = (evt) => /^\d{4}-\d{2}-\d{2}$/.test(evt.sortDate || '') ? evt.sortDate.split('-').reverse().join('/') : formatDate(evt.time);

    const twoCols = withViewer && viewerVisible && wide;
    const isActive = activeDossier.status === 'active';
    const catTheme = CATEGORY_COLORS[activeDossier.category] || CATEGORY_COLORS['KHÁC'];

    return (
        <div className={`${twoCols ? 'max-w-[1700px]' : 'max-w-3xl'} mx-auto`}>

            {/* Nút quay lại + toggle khung đọc + xuất JSON: dính đầu trang, nằm ngoài lưới hai cột */}
            <div className="sticky top-0 z-20 py-2 bg-slate-50 flex items-center justify-between gap-2 flex-wrap">
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
                </div>
            </div>

            <div className={twoCols ? 'grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-start' : ''}>
            <div className="space-y-4 min-w-0">

            {/* Card thông tin hồ sơ */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 md:p-5">
                    {/* Badges + edit */}
                    <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center flex-wrap gap-1.5">
                            <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded text-white ${catTheme.dot || 'bg-brand-500'}`}>
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
                <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-2 flex items-center justify-end gap-2">
                    {activeDossier.folderPath && (
                        <button onClick={() => openDossierFolder(activeDossier.folderPath, serverMode === true)}
                            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg font-medium shadow-sm text-xs">
                            <IconFolder className="w-3.5 h-3.5 text-brand-600"/> Mở thư mục trên máy
                        </button>
                    )}
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
                        // Mốc Kết thúc lặp lại nội dung thẻ "Kết Quả Cuối Cùng" ngay bên dưới nên chỉ hiện khi có tài liệu gắn vào.
                        if (evt.type === 'finish' && !(attached.byIndex[idx]?.length > 0)) return null;
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
                                        {(evt.type === 'doc' || evt.type === 'progress' || evt.type === 'consult' || evt.type === 'result' || evt.type === 'sub') && (
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
                                    {/* Số văn bản và ngày ban hành trên cùng một dòng; loại mốc đã có ở nhãn phía trên nên không nhắc lại */}
                                    {(evt.number || evt.docDate) && (
                                        <div className="mb-1 flex items-center gap-1.5 flex-wrap">
                                            {evt.type === 'result' && evt.rawData?.sender === 'ĐUCATP' && (
                                                <img src={dangIcon} alt="Cờ Đảng" title="Văn bản của Đảng ủy Công an thành phố" className="h-4 w-auto rounded-sm shadow-sm" />
                                            )}
                                            {evt.number && <span className="font-semibold text-slate-800 text-sm">{String(evt.number).trim()}</span>}
                                            {evt.docDate && <span className="text-xs text-slate-500">{evt.number ? '· ' : ''}ngày {evt.docDate.split('-').reverse().join('/')}</span>}
                                        </div>
                                    )}
                                    {/* Content (thu gọn nếu dài) */}
                                    {typeof evt.desc === 'string' ? (
                                        <ExpandableText text={evt.desc} clamp={3} className="text-sm text-slate-600 leading-relaxed" />
                                    ) : (
                                        <div className="text-sm text-slate-600 leading-relaxed">{evt.desc}</div>
                                    )}
                                    {/* Extra fields */}
                                    {isWebLink(evt.rawData?.filePath) && (
                                        <a href={evt.rawData.filePath.trim()} target="_blank" rel="noreferrer"
                                            title={evt.rawData.filePath}
                                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2.5 py-1 rounded-lg">
                                            <IconExternalLink className="w-3.5 h-3.5"/> Mở link (Drive)
                                        </a>
                                    )}
                                    {evt.note && (
                                        <div className="mt-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
                                            <span className="font-semibold">Ghi chú:</span> {evt.note}
                                        </div>
                                    )}
                                    {(() => {
                                        const list = attached.byIndex[idx] || [];
                                        const isConsult = isConsultRaw(evt.rawData);
                                        const own = isConsult ? list.filter(f => f.category !== REPORTS_FOLDER) : list;
                                        const reports = isConsult ? list.filter(f => f.category === REPORTS_FOLDER) : [];
                                        return (
                                            <>
                                                {own.length > 0 && <FileList files={own} selectedKey={selectedFile?.key} onPick={pickFile} />}
                                                {isConsult && withViewer && <ReportsList files={reports} selectedKey={selectedFile?.key} onPick={pickFile} deadline={evt.rawData?.consultDeadline} />}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

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

            {attached.reports.length > 0 && (
                <div className="bg-white border border-violet-200 rounded-2xl shadow-sm p-4 md:p-5">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-sm"><IconFileText className="w-4 h-4 text-violet-500"/> {folderLabel(REPORTS_FOLDER)} ({attached.reports.length})</h4>
                    <p className="text-xs text-slate-500">Hồ sơ chưa có mốc "Lấy ý kiến". Thêm một mốc Tiến độ và chọn "Đây là giai đoạn lấy ý kiến" để số báo cáo hiện ngay trên nhật ký xử lý.</p>
                    <ReportsList files={attached.reports} selectedKey={selectedFile?.key} onPick={pickFile} />
                </div>
            )}

            {attached.others.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-sm"><IconFileText className="w-4 h-4 text-slate-400"/> Bản nháp, trao đổi và tài liệu khác</h4>
                    <p className="text-xs text-slate-500 mb-2.5">Các thư mục con ngoài 4 thư mục chuẩn (ví dụ bản xin ý kiến trước khi ban hành) và file nằm lẻ ở gốc hồ sơ.</p>
                    {[...new Set(attached.others.map(f => f.category))].map(cat => (
                        <div key={cat} className="mb-2.5 last:mb-0">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{folderLabel(cat)}</div>
                            <FileList files={attached.others.filter(f => f.category === cat)} selectedKey={selectedFile?.key} onPick={pickFile} />
                        </div>
                    ))}
                </div>
            )}

            {attached.unassigned.length > 0 && (
                <div className="bg-white border border-amber-200 rounded-2xl shadow-sm p-4 md:p-5">
                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-1.5 text-sm"><IconFileText className="w-4 h-4 text-amber-500"/> Tài liệu chưa gắn vào tiến trình</h4>
                    <p className="text-xs text-slate-500 mb-2.5">Có trong thư mục hồ sơ nhưng chưa có mốc phù hợp (ví dụ văn bản triển khai khi hồ sơ chưa có mốc "Văn bản kết quả"). Muốn gắn vào đúng mốc: bấm Sửa ở mốc đó rồi chọn file ở ô "File trong kho hồ sơ".</p>
                    {[...new Set(attached.unassigned.map(f => f.category))].map(cat => (
                        <div key={cat} className="mb-2.5 last:mb-0">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{folderLabel(cat)}</div>
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

            {withViewer && <DossierFiles files={files} showToast={showToast} selectedKey={selectedFile?.key} onPick={pickFile} />}
        </div>
        {withViewer && viewerVisible && (
            <aside className={wide ? 'sticky top-12 h-[calc(100vh-10.5rem)]' : 'fixed inset-0 z-50 bg-slate-900/40 p-3'}>
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
        </div>
    );
};

export default DetailView;
