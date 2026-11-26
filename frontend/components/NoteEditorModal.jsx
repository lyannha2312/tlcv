import React, { useRef, useEffect } from 'react';
import Modal from './Modal.jsx';
import { noteToHtml, noteFromEditor } from '../richText.js';

const TOOLS = [
    { cmd: 'bold', label: <b>B</b>, title: 'In đậm (Ctrl+B)' },
    { cmd: 'italic', label: <i>I</i>, title: 'In nghiêng (Ctrl+I)' },
    { cmd: 'underline', label: <u>U</u>, title: 'Gạch chân (Ctrl+U)' },
    { sep: true },
    { cmd: 'insertUnorderedList', label: '• Danh sách', title: 'Danh sách gạch đầu dòng' },
    { cmd: 'insertOrderedList', label: '1. Đánh số', title: 'Danh sách đánh số' },
    { sep: true },
    { cmd: 'removeFormat', label: 'Xóa định dạng', title: 'Bỏ đậm, nghiêng, gạch chân ở phần đang chọn' },
    { cmd: 'undo', label: '↶', title: 'Hoàn tác (Ctrl+Z)' },
    { cmd: 'redo', label: '↷', title: 'Làm lại (Ctrl+Y)' },
];

// Xem và sửa trực tiếp ghi chú của một mốc, có các công cụ định dạng cơ bản.
const NoteEditorModal = ({ title, note, onSave, onClose }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.innerHTML = noteToHtml(note);
            editorRef.current.focus();
        }
    }, [note]);

    const run = (cmd) => { editorRef.current?.focus(); document.execCommand(cmd, false, null); };
    // Dán chỉ lấy chữ, không mang theo màu, cỡ chữ, font của nơi sao chép.
    const onPaste = (e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    };

    return (
        <Modal isOpen onClose={onClose} title={title || 'Ghi chú'} maxWidth="max-w-3xl">
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1 border border-slate-200 rounded-lg bg-slate-50 p-1.5">
                    {TOOLS.map((t, i) => t.sep
                        ? <span key={i} className="w-px h-5 bg-slate-300 mx-1" />
                        : <button key={t.cmd} type="button" title={t.title}
                            onMouseDown={(e) => { e.preventDefault(); run(t.cmd); }}
                            className="px-2.5 py-1 text-sm rounded-md text-slate-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200">{t.label}</button>)}
                </div>
                <div ref={editorRef} contentEditable suppressContentEditableWarning onPaste={onPaste}
                    className="min-h-[45vh] max-h-[60vh] overflow-y-auto border border-slate-300 rounded-lg px-4 py-3 text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-300 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6" />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Hủy</button>
                    <button onClick={() => onSave(noteFromEditor(editorRef.current?.innerHTML || ''))}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium shadow-sm">Lưu ghi chú</button>
                </div>
            </div>
        </Modal>
    );
};

export default NoteEditorModal;
