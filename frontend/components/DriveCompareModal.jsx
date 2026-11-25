import React, { useState, useMemo } from 'react';
import Modal from './Modal.jsx';
import { defaultChoices, recordTitle, fmtTime } from '../driveCompare.js';

const FIELD_LABELS = {
    title: 'tiêu đề', category: 'chuyên đề', priority: 'mức ưu tiên', deadline: 'hạn', status: 'trạng thái', folderPath: 'thư mục',
    originalDoc: 'văn bản gốc', relatedDocs: 'các mốc xử lý', tasks: 'task nhỏ', finalResult: 'kết quả cuối', closedAt: 'ngày đóng', note: 'ghi chú',
    content: 'nội dung', unit: 'đơn vị', date: 'ngày', location: 'địa điểm', notes: 'ghi chú', result: 'kết quả', host: 'chủ trì', docRef: 'văn bản căn cứ',
    contact: 'liên hệ', type: 'loại',
};
const fieldName = (k) => FIELD_LABELS[k] || k;

const Side = ({ title, lines, tone }) => (
    <div className={`rounded-lg border p-3 ${tone}`}>
        <div className="text-xs font-bold uppercase tracking-wide mb-1">{title}</div>
        {lines.map((l, i) => <div key={i} className="text-sm">{l}</div>)}
    </div>
);

// mode 'upload': bấm "Lưu lên Drive" → so sánh trước khi ghi lên Drive.
// mode 'download': bấm "Tải từ Drive" → so sánh trước khi đưa về máy này.
const DriveCompareModal = ({ mode, result, meta, onMerge, onOverwrite, onClose }) => {
    const [choices, setChoices] = useState(() => defaultChoices(result || []));
    const isUpload = mode === 'upload';
    const totals = useMemo(() => (result || []).reduce((t, c) => ({
        onlyRemote: t.onlyRemote + c.onlyRemote.length, onlyLocal: t.onlyLocal + c.onlyLocal.length, diff: t.diff + c.diff.length,
    }), { onlyRemote: 0, onlyLocal: 0, diff: 0 }), [result]);
    if (!result) return null;

    const remoteNewer = meta.remoteEdit && (!meta.localEdit || meta.remoteEdit > meta.localEdit);
    const localNewer = meta.localEdit && (!meta.remoteEdit || meta.localEdit > meta.remoteEdit);
    let verdict = 'Chưa đủ thông tin giờ sửa để biết bản nào mới hơn (các bản ghi cũ chưa ghi giờ sửa). Hãy xem từng mục khác nhau bên dưới.';
    if (remoteNewer && !localNewer) verdict = '⚠️ Bản trên Drive có chỉnh sửa MỚI HƠN máy này.';
    else if (localNewer && !remoteNewer) verdict = 'Máy này có chỉnh sửa mới hơn bản trên Drive.';
    else if (localNewer && remoteNewer) verdict = 'Hai bên đều có chỉnh sửa; xem từng mục bên dưới.';

    const setChoice = (k, v) => setChoices(c => ({ ...c, [k]: v }));

    return (
        <Modal isOpen onClose={onClose} title={isUpload ? 'So sánh trước khi lưu lên Drive' : 'So sánh trước khi tải từ Drive'} maxWidth="max-w-3xl">
            <div className="space-y-4 text-slate-700">
                <div className="grid sm:grid-cols-2 gap-3">
                    <Side title="Bản trên Drive" tone="border-sky-200 bg-sky-50 text-sky-900" lines={[
                        `Lưu lúc: ${fmtTime(meta.remoteSavedAt || meta.remoteModified)}`,
                        `Từ máy: ${meta.remoteSavedBy || 'chưa ghi'}`,
                        `Sửa gần nhất: ${fmtTime(meta.remoteEdit)}`,
                    ]} />
                    <Side title="Máy này" tone="border-emerald-200 bg-emerald-50 text-emerald-900" lines={[
                        `Tên máy: ${meta.localName || 'chưa đặt'}`,
                        `Sửa gần nhất: ${fmtTime(meta.localEdit)}`,
                    ]} />
                </div>
                <div className={`rounded-lg px-3 py-2 text-sm font-medium ${remoteNewer && !localNewer ? 'bg-amber-50 border border-amber-300 text-amber-900' : 'bg-slate-50 border border-slate-200'}`}>{verdict}</div>

                <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 text-slate-600 text-xs">
                        <tr><th className="text-left p-2">Sổ</th><th className="p-2">Chỉ có trên Drive</th><th className="p-2">Chỉ có ở máy này</th><th className="p-2">Khác nội dung</th><th className="p-2">Giống nhau</th></tr>
                    </thead>
                    <tbody>
                        {result.map(c => (
                            <tr key={c.key} className="border-t border-slate-100 text-center">
                                <td className="p-2 text-left font-medium">{c.label}</td>
                                <td className={`p-2 ${c.onlyRemote.length ? 'font-bold text-sky-700' : 'text-slate-400'}`}>{c.onlyRemote.length}</td>
                                <td className={`p-2 ${c.onlyLocal.length ? 'font-bold text-emerald-700' : 'text-slate-400'}`}>{c.onlyLocal.length}</td>
                                <td className={`p-2 ${c.diff.length ? 'font-bold text-amber-700' : 'text-slate-400'}`}>{c.diff.length}</td>
                                <td className="p-2 text-slate-500">{c.same}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {result.map(c => (c.onlyRemote.length || c.onlyLocal.length || c.diff.length) ? (
                        <details key={c.key} className="border border-slate-200 rounded-lg" open={c.diff.length > 0}>
                            <summary className="px-3 py-2 text-sm font-semibold cursor-pointer select-none bg-slate-50">{c.label}: {c.onlyRemote.length} chỉ có trên Drive · {c.onlyLocal.length} chỉ có ở máy này · {c.diff.length} khác nội dung</summary>
                            <div className="p-3 space-y-3 text-sm">
                                {c.diff.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-amber-700 mb-1">KHÁC NỘI DUNG — chọn bản giữ lại</div>
                                        {c.diff.map(d => {
                                            const k = `${c.key}:${d.id}`;
                                            return (
                                                <div key={d.id} className="border border-amber-200 bg-amber-50/40 rounded-lg p-2 mb-2">
                                                    <div className="font-medium">{recordTitle(d.local)}</div>
                                                    <div className="text-xs text-slate-500 mb-1">Khác ở: {d.fields.map(fieldName).join(', ')}</div>
                                                    <div className="flex flex-wrap gap-3 text-xs">
                                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={choices[k] === 'remote'} onChange={() => setChoice(k, 'remote')} /> Bản Drive ({fmtTime(d.remote.updatedAt)}){d.newer === 'remote' ? ' · mới hơn' : ''}</label>
                                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={choices[k] !== 'remote'} onChange={() => setChoice(k, 'local')} /> Bản máy này ({fmtTime(d.local.updatedAt)}){d.newer === 'local' ? ' · mới hơn' : ''}</label>
                                                        {d.newer === 'unknown' && <span className="text-slate-400">chưa rõ bản nào mới hơn</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {c.onlyRemote.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-sky-700 mb-1">CHỈ CÓ TRÊN DRIVE (máy này chưa có)</div>
                                        {c.onlyRemote.slice(0, 30).map(r => <div key={r.id} className="text-slate-600">• {recordTitle(r)}</div>)}
                                        {c.onlyRemote.length > 30 && <div className="text-slate-400">… và {c.onlyRemote.length - 30} mục khác</div>}
                                    </div>
                                )}
                                {c.onlyLocal.length > 0 && (
                                    <div>
                                        <div className="text-xs font-bold text-emerald-700 mb-1">CHỈ CÓ Ở MÁY NÀY (Drive chưa có — hoặc đã bị xóa ở máy khác)</div>
                                        {c.onlyLocal.slice(0, 30).map(r => <div key={r.id} className="text-slate-600">• {recordTitle(r)}</div>)}
                                        {c.onlyLocal.length > 30 && <div className="text-slate-400">… và {c.onlyLocal.length - 30} mục khác</div>}
                                    </div>
                                )}
                            </div>
                        </details>
                    ) : null)}
                </div>

                <div className="flex flex-wrap gap-2 justify-end pt-1">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Hủy</button>
                    {isUpload ? (
                        <button onClick={() => onOverwrite()} title="Ghi đè toàn bộ bản trên Drive bằng dữ liệu máy này"
                            className={`px-4 py-2 rounded-lg text-sm font-medium border ${totals.onlyRemote || totals.diff ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            Chỉ lưu bản máy này (ghi đè){totals.onlyRemote || totals.diff ? ' ⚠️' : ''}
                        </button>
                    ) : (
                        <button onClick={() => onOverwrite()} title="Thay toàn bộ dữ liệu máy này bằng bản trên Drive (mục chỉ có ở máy này sẽ bị bỏ)"
                            className={`px-4 py-2 rounded-lg text-sm font-medium border ${totals.onlyLocal ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            Thay bằng bản Drive{totals.onlyLocal ? ` (bỏ ${totals.onlyLocal} mục chỉ có ở máy này)` : ''}
                        </button>
                    )}
                    <button onClick={() => onMerge(choices)} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium shadow-sm">
                        {isUpload ? 'Gộp rồi lưu lên Drive' : 'Gộp vào máy này'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DriveCompareModal;
