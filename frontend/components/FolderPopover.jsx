import React, { useState, useRef, useEffect } from 'react';
import { IconFolder } from '../Icons.jsx';

export const FolderPopover = ({ folderName, className = '' }) => {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const copy = () => {
        navigator.clipboard.writeText(folderName);
        setCopied(true);
        setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
    };

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 px-3.5 py-2 rounded-lg font-medium transition-colors text-sm"
            >
                <IconFolder className="w-4 h-4" /> Thư mục hồ sơ
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-72">
                    <p className="text-xs text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Tên thư mục hồ sơ</p>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-sm text-slate-800 break-all mb-3 select-all leading-relaxed">
                        {folderName}
                    </div>
                    <button
                        onClick={copy}
                        className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                    >
                        {copied ? '✓ Đã copy!' : 'Copy tên thư mục'}
                    </button>
                </div>
            )}
        </div>
    );
};
