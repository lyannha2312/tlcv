import React from 'react';
import { IconPlus } from '../Icons.jsx';

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><IconPlus className="rotate-45" /></button>
                </div>
                <div className="p-6 max-h-[85vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

export default Modal;
