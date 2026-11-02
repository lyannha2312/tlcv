import React from 'react';
import { folderLabel, driveSearchUrl } from '../fileMatch.js';
import { IconFileText, IconDownload, IconChevronLeft, IconChevronRight, IconX, IconExternalLink } from '../Icons.jsx';
import { fileExt } from './DossierFiles.jsx';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif'];

// Khung đọc file bên phải timeline. `files` là danh sách theo thứ tự timeline để bấm Trước/Sau.
const PdfViewer = ({ file, files, onSelect, onClose, overlay }) => {
    const index = file ? files.findIndex(f => f.key === file.key) : -1;
    const ext = file ? fileExt(file.fileName) : '';
    const step = (delta) => { const next = files[index + delta]; if (next) onSelect(next); };

    let body;
    if (!file) {
        body = (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 px-6 text-center">
                <IconFileText className="w-12 h-12 opacity-30" />
                <p className="text-sm">Bấm vào một tài liệu ở mốc bên trái để đọc tại đây</p>
            </div>
        );
    } else if (ext === 'pdf') {
        body = <iframe key={file.url} title={file.fileName} src={`${file.url}#view=FitH`} className="w-full h-full border-0 bg-slate-100" />;
    } else if (IMAGE_EXTS.includes(ext)) {
        body = <div className="h-full overflow-auto bg-slate-100 p-3"><img src={file.url} alt={file.fileName} className="max-w-full mx-auto" /></div>;
    } else {
        body = (
            <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                <IconFileText className="w-12 h-12 text-slate-300" />
                <p className="text-sm text-slate-600 break-all">{file.fileName}</p>
                <p className="text-xs text-slate-400">Trình duyệt không xem trực tiếp được loại file này. Nếu file đã có trên Google Drive, mở ở đó để xem ngay trên trình duyệt.</p>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <a href={driveSearchUrl(file.fileName)} target="_blank" rel="noreferrer" title="Tìm file này trên Google Drive (cần đăng nhập đúng tài khoản)" className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium"><IconExternalLink className="w-4 h-4" /> Mở trên Drive</a>
                    <a href={file.url} download className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium"><IconDownload className="w-4 h-4" /> Tải xuống</a>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-slate-50/80">
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 truncate" title={file?.fileName}>{file ? file.fileName : 'Xem tài liệu'}</div>
                    {file && <div className="text-[11px] text-slate-400">{folderLabel(file.category)}{files.length > 1 && index >= 0 ? ` · ${index + 1}/${files.length}` : ''}</div>}
                </div>
                {file && files.length > 1 && (
                    <div className="flex gap-1 shrink-0">
                        <button onClick={() => step(-1)} disabled={index <= 0} title="Tài liệu trước (theo timeline)" className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"><IconChevronLeft className="w-3.5 h-3.5" /></button>
                        <button onClick={() => step(1)} disabled={index < 0 || index >= files.length - 1} title="Tài liệu sau (theo timeline)" className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"><IconChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                )}
                {file && <a href={file.url} target="_blank" rel="noreferrer" className="shrink-0 px-2 py-1 text-xs font-medium rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600">Mở tab mới</a>}
                {onClose && (
                    <button onClick={onClose} title="Ẩn khung đọc tài liệu" className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 transition-colors">
                        <IconX className="w-3.5 h-3.5" /> <span>{overlay ? 'Đóng' : 'Ẩn'}</span>
                    </button>
                )}
            </div>
            <div className="flex-1 min-h-0">{body}</div>
        </div>
    );
};

export default PdfViewer;
