import React, { useState } from 'react';
import { CATEGORIES, ISSUING_UNITS, getLocalDateTimeString, getDateRange } from '../helpers.js';

// ---- DossierForm ----
export const DossierForm = ({ initialData, onClose, saveDossier }) => {
    const [form, setForm] = useState(() => {
        if (initialData) return { title: initialData.title, category: initialData.category, priority: initialData.priority || 'Trung bình', deadline: initialData.deadline || '', createdAt: getLocalDateTimeString(initialData.createdAt), docNumber: initialData.originalDoc.number, docDate: initialData.originalDoc.date, sender: initialData.originalDoc.sender, docSummary: initialData.originalDoc.summary, content: initialData.originalDoc.content, folderPath: initialData.folderPath || '' };
        return { title: '', category: 'CHUYỂN ĐỔI SỐ', priority: 'Trung bình', deadline: '', createdAt: getLocalDateTimeString(), docNumber: '', docDate: '', sender: '', docSummary: '', content: '', folderPath: '' };
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prevForm => ({ ...prevForm, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (form.title) {
            saveDossier({ title: form.title, category: form.category, priority: form.priority, deadline: form.deadline, createdAt: new Date(form.createdAt).toISOString(), folderPath: form.folderPath, originalDoc: { number: form.docNumber, date: form.docDate, summary: form.docSummary, sender: form.sender, content: form.content } }, initialData?.id);
            onClose();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Tên Hồ sơ / Chủ đề <span className="text-rose-500">*</span></label><textarea autoFocus required rows="2" name="title" value={form.title} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500 resize-none"></textarea></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Chuyên mục</label><select name="category" value={form.category} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500">{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Mức độ ưu tiên</label><select name="priority" value={form.priority} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500"><option value="Cao">🔴 Cao</option><option value="Trung bình">🟡 Trung bình</option><option value="Thấp">⚪ Thấp</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 mt-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Thời gian tạo</label><input type="datetime-local" name="createdAt" value={form.createdAt} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Thời hạn xử lý (Deadline)</label><input type="date" name="deadline" value={form.deadline} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 mt-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Số ký hiệu (VB gốc)</label><input type="text" name="docNumber" value={form.docNumber} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày ban hành</label><input type="date" name="docDate" value={form.docDate} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị gửi</label><input type="text" name="sender" value={form.sender} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Trích yếu văn bản</label><textarea rows="2" name="docSummary" value={form.docSummary} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500"></textarea></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nội dung chỉ đạo chi tiết</label><textarea rows="2" name="content" value={form.content} onChange={handleChange} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500"></textarea></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Tên thư mục hồ sơ <span className="font-normal text-slate-400 text-xs">(server tự tìm trên D:\)</span></label><input type="text" name="folderPath" value={form.folderPath} onChange={handleChange} placeholder="VD: HoSo_BaoCao_2026" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500 font-mono text-sm" /></div>
            <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button><button type="submit" className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium shadow-md">{initialData ? 'Lưu thay đổi' : 'Tạo Hồ sơ'}</button></div>
        </form>
    );
};

// ---- AddDocForm ----
export const AddDocForm = ({ dossierId, initialData, isArchived, onClose, saveRelatedDoc, updateFinalResult, setActiveDossierId }) => {
    const [activeTab, setActiveTab] = useState(initialData ? initialData.type : 'document');
    const [docForm, setDocForm] = useState(() => {
        if (initialData && initialData.type === 'document') return { number: initialData.number || '', date: initialData.date || '', sender: initialData.sender || '', content: initialData.content || '', fileName: initialData.fileName || '', note: initialData.note || '', docType: initialData.docType || 'Văn bản đính kèm', filePath: initialData.filePath || '' };
        return { number: '', date: '', sender: '', content: '', fileName: '', note: '', docType: 'Văn bản đính kèm', filePath: '' };
    });
    const [progForm, setProgForm] = useState(() => {
        if (initialData && initialData.type === 'progress') return { date: initialData.date || new Date().toISOString().split('T')[0], content: initialData.content || '' };
        return { date: new Date().toISOString().split('T')[0], content: '' };
    });
    const [finishForm, setFinishForm] = useState({ date: new Date().toISOString().split('T')[0], result: '' });
    // Thời gian cập nhật (addedAt) — chỉ cho sửa khi đang sửa nội dung đã có
    const [addedAt, setAddedAt] = useState(() => initialData?.addedAt ? getLocalDateTimeString(initialData.addedAt) : '');

    const handleSubmit = (e) => {
        e.preventDefault();
        const isEditing = !!initialData;
        const timeData = isEditing && addedAt ? { addedAt: new Date(addedAt).toISOString() } : {};
        if (activeTab === 'document' && (docForm.number || isEditing)) { saveRelatedDoc(dossierId, { type: 'document', ...docForm, ...timeData }, initialData?.id); onClose(); }
        else if (activeTab === 'progress' && (progForm.content || isEditing)) { saveRelatedDoc(dossierId, { type: 'progress', ...progForm, ...timeData }, initialData?.id); onClose(); }
        else if (activeTab === 'finish' && finishForm.result) { updateFinalResult(dossierId, finishForm.result, finishForm.date); setActiveDossierId(null); onClose(); }
    };

    return (
        <div className="space-y-4">
            {!initialData && (
                <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                    <button type="button" onClick={() => setActiveTab('document')} className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap ${activeTab === 'document' ? 'text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50' : 'text-slate-500'}`}>Văn bản phát sinh</button>
                    <button type="button" onClick={() => setActiveTab('progress')} className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap ${activeTab === 'progress' ? 'text-amber-700 border-b-2 border-amber-500 bg-amber-50' : 'text-slate-500'}`}>Tiến độ thực hiện</button>
                    {!isArchived && <button type="button" onClick={() => setActiveTab('finish')} className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap ${activeTab === 'finish' ? 'text-slate-800 border-b-2 border-slate-800 bg-slate-100' : 'text-slate-500'}`}>Đóng hồ sơ</button>}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                {initialData && activeTab !== 'finish' && (
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Thời gian cập nhật</label><input type="datetime-local" value={addedAt} onChange={e=>setAddedAt(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-brand-500" /></div>
                )}
                {activeTab === 'document' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Số Ký Hiệu <span className="text-rose-500">*</span></label><input type="text" value={docForm.number} onChange={e=>setDocForm({...docForm, number: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-emerald-500" /></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày ban hành</label><input type="date" value={docForm.date} onChange={e=>setDocForm({...docForm, date: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-emerald-500" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị phát hành</label><input type="text" list="issuing-units" value={docForm.sender} onChange={e=>setDocForm({...docForm, sender: e.target.value})} placeholder="Chọn hoặc tự nhập" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-emerald-500" /><datalist id="issuing-units">{ISSUING_UNITS.map(u => <option key={u} value={u} />)}</datalist></div>
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Phân loại</label><select value={docForm.docType} onChange={e=>setDocForm({...docForm, docType: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-emerald-500"><option>Văn bản đính kèm</option><option>Văn bản chỉ đạo mới</option><option>Phụ lục</option><option>Văn bản kết quả</option></select></div>
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Nội dung / Trích yếu</label><textarea rows="2" value={docForm.content} onChange={e=>setDocForm({...docForm, content: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-emerald-500"></textarea></div>
                        <div><label className="block text-sm font-medium text-amber-600 mb-1">Ghi chú (Mục đích)</label><textarea rows="2" value={docForm.note} onChange={e=>setDocForm({...docForm, note: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-emerald-500"></textarea></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Đường dẫn file</label><input type="text" value={docForm.filePath} onChange={e=>setDocForm({...docForm, filePath: e.target.value})} placeholder="VD: D:\HoSo\2026\VanBan.docx" className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-emerald-500 font-mono text-sm" /></div>
                    </>
                )}
                {activeTab === 'progress' && (
                    <>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày thực hiện</label><input type="date" value={progForm.date} onChange={e=>setProgForm({...progForm, date: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-amber-500" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Nội dung đang thực hiện / Kết quả <span className="text-rose-500">*</span></label><textarea rows="4" value={progForm.content} onChange={e=>setProgForm({...progForm, content: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-amber-500"></textarea></div>
                    </>
                )}
                {activeTab === 'finish' && (
                    <>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày đóng hồ sơ</label><input type="date" value={finishForm.date} onChange={e=>setFinishForm({...finishForm, date: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-slate-500" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Kết quả thực hiện / Văn bản báo cáo <span className="text-rose-500">*</span></label><textarea rows="4" value={finishForm.result} onChange={e=>setFinishForm({...finishForm, result: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-1 focus:ring-slate-500"></textarea></div>
                    </>
                )}
                <div className="pt-4 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                    <button type="submit" className={`px-5 py-2 text-white rounded-lg font-medium shadow-md ${activeTab === 'document' ? 'bg-emerald-600 hover:bg-emerald-500' : activeTab === 'progress' ? 'bg-amber-500 hover:bg-amber-400' : 'bg-slate-800 hover:bg-slate-700'}`}>
                        {activeTab === 'finish' ? 'Lưu & Đóng' : 'Lưu cập nhật'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// ---- DnisLogForm ----
export const DnisLogForm = ({ initialData, onClose, saveDnisLog }) => {
    const [form, setForm] = useState(() => {
        if (initialData) return { ...initialData, date: getLocalDateTimeString(initialData.date) };
        return { unit: '', date: getLocalDateTimeString(), content: '', contact: '', status: 'Đang thực hiện', docNumber: '', docDate: '' };
    });

    const handleSubmit = (e) => { e.preventDefault(); if (form.content) { saveDnisLog({ ...form, date: new Date(form.date).toISOString() }, initialData?.id); onClose(); } };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị / Cơ quan <span className="text-rose-500">*</span></label><input required type="text" value={form.unit} onChange={e=>setForm({...form, unit: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-fuchsia-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Thời gian tiếp nhận <span className="text-rose-500">*</span></label><input required type="datetime-local" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-fuchsia-500" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nội dung yêu cầu / Việc cần làm <span className="text-rose-500">*</span></label><textarea required rows="3" value={form.content} onChange={e=>setForm({...form, content: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-fuchsia-500"></textarea></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Người liên hệ</label><input type="text" value={form.contact} onChange={e=>setForm({...form, contact: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-fuchsia-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label><select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-fuchsia-500"><option value="Chưa làm">Chưa làm</option><option value="Đang thực hiện">Đang thực hiện</option><option value="Hoàn thành">Hoàn thành</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Số VB đề nghị (Nếu có)</label><input type="text" value={form.docNumber} onChange={e=>setForm({...form, docNumber: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-fuchsia-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày VB</label><input type="date" value={form.docDate} onChange={e=>setForm({...form, docDate: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-fuchsia-500" /></div>
            </div>
            <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button><button type="submit" className="px-5 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg font-medium shadow-md">Lưu Nhật Ký</button></div>
        </form>
    );
};

// ---- MailLogForm ----
export const MailLogForm = ({ initialData, onClose, saveMailLog }) => {
    const [form, setForm] = useState(() => {
        if (initialData) return { ...initialData, date: getLocalDateTimeString(initialData.date) };
        return { entity: '', email: '', password: '', date: getLocalDateTimeString(), content: '', status: 'Đang thực hiện' };
    });

    const handleSubmit = (e) => { e.preventDefault(); if (form.content) { saveMailLog({ ...form, date: new Date(form.date).toISOString() }, initialData?.id); onClose(); } };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Cá nhân / Tổ chức <span className="text-rose-500">*</span></label><input required type="text" value={form.entity} onChange={e=>setForm({...form, entity: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-cyan-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Thời gian yêu cầu <span className="text-rose-500">*</span></label><input required type="datetime-local" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-cyan-500" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ Mail</label><input type="text" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-cyan-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label><input type="text" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-cyan-500" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nội dung xử lý / Yêu cầu <span className="text-rose-500">*</span></label><textarea required rows="3" value={form.content} onChange={e=>setForm({...form, content: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-cyan-500"></textarea></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label><select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-cyan-500"><option value="Chưa làm">Chưa làm</option><option value="Đang thực hiện">Đang thực hiện</option><option value="Hoàn thành">Hoàn thành</option></select></div>
            <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button><button type="submit" className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium shadow-md">Lưu Yêu Cầu</button></div>
        </form>
    );
};

// ---- CoordLogForm ----
export const CoordLogForm = ({ initialData, onClose, saveCoordLog }) => {
    const [form, setForm] = useState(() => {
        if (initialData) return { ...initialData };
        return { assignedDate: new Date().toISOString().split('T')[0], docNumber: '', docDate: '', summary: '', content: '', progress: '', status: 'Đang thực hiện' };
    });

    const handleSubmit = (e) => { e.preventDefault(); if (form.summary) { saveCoordLog(form, initialData?.id); onClose(); } };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày giao việc <span className="text-rose-500">*</span></label><input required type="date" value={form.assignedDate} onChange={e=>setForm({...form, assignedDate: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-orange-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label><select value={form.status} onChange={e=>setForm({...form, status: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-orange-500"><option value="Đang thực hiện">Đang thực hiện</option><option value="Hoàn thành">Hoàn thành</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 mt-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Số Ký hiệu VB</label><input type="text" value={form.docNumber} onChange={e=>setForm({...form, docNumber: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-orange-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày VB</label><input type="date" value={form.docDate} onChange={e=>setForm({...form, docDate: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-orange-500" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Trích yếu <span className="text-rose-500">*</span></label><input required type="text" value={form.summary} onChange={e=>setForm({...form, summary: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-orange-500" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nội dung chỉ đạo phối hợp</label><textarea rows="3" value={form.content} onChange={e=>setForm({...form, content: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-orange-500"></textarea></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Tiến độ thực hiện chung</label><textarea rows="3" value={form.progress} onChange={e=>setForm({...form, progress: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-orange-500"></textarea></div>
            <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button><button type="submit" className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium shadow-md">Lưu Nhiệm Vụ</button></div>
        </form>
    );
};

// ---- ScheduleForm ----
export const ScheduleForm = ({ initialData, targetDate, onClose, saveSchedule, saveScheduleRange }) => {
    const isEditing = !!initialData;
    const [rangeMode, setRangeMode] = useState(false);
    const [form, setForm] = useState(() => {
        if (initialData) return { ...initialData, endDate: initialData.date };
        return { date: targetDate || new Date().toISOString().split('T')[0], endDate: targetDate || new Date().toISOString().split('T')[0], content: '', location: '', notes: '', result: '' };
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.content) return;
        const { endDate, ...scheduleData } = form;
        if (rangeMode) {
            const dates = getDateRange(form.date, endDate || form.date);
            saveScheduleRange(dates, scheduleData, initialData?.id);
        } else {
            saveSchedule(scheduleData, initialData?.id);
        }
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer w-fit">
                <input type="checkbox" checked={rangeMode} onChange={e => {
                    const checked = e.target.checked;
                    setRangeMode(checked);
                    if (checked && form.endDate < form.date) setForm({ ...form, endDate: form.date });
                }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                {isEditing ? 'Thêm cho nhiều ngày liên tiếp (nhân bản sang các ngày khác)' : 'Áp dụng cho nhiều ngày liên tiếp'}
            </label>
            {rangeMode ? (
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Từ ngày <span className="text-rose-500">*</span></label><input required type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value, endDate: form.endDate < e.target.value ? e.target.value : form.endDate})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-indigo-500" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Đến ngày <span className="text-rose-500">*</span></label><input required type="date" min={form.date} value={form.endDate} onChange={e=>setForm({...form, endDate: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-indigo-500" /></div>
                </div>
            ) : (
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày thực hiện <span className="text-rose-500">*</span></label><input required type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-indigo-500" /></div>
            )}
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nội dung công việc <span className="text-rose-500">*</span></label><textarea required rows="2" value={form.content} onChange={e=>setForm({...form, content: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-indigo-500"></textarea></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Địa điểm</label><input type="text" value={form.location} onChange={e=>setForm({...form, location: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-indigo-500" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label><textarea rows="2" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-indigo-500"></textarea></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Kết quả thực hiện</label><textarea rows="2" value={form.result} onChange={e=>setForm({...form, result: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-indigo-500"></textarea></div>
            <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button><button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-md">Lưu Kế Hoạch</button></div>
        </form>
    );
};

// ---- MeetingForm ----
export const MeetingForm = ({ initialData, onClose, saveMeeting }) => {
    const [form, setForm] = useState(() => {
        if (initialData) return { ...initialData, date: getLocalDateTimeString(initialData.date) };
        return { date: getLocalDateTimeString(), host: '', location: '', content: '', notes: '', docRef: '', category: 'KHÁC' };
    });

    const handleSubmit = (e) => { e.preventDefault(); if (form.content) { saveMeeting({ ...form, date: new Date(form.date).toISOString() }, initialData?.id); onClose(); } };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Thời gian họp <span className="text-rose-500">*</span></label><input required type="datetime-local" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-teal-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Địa điểm</label><input type="text" value={form.location} onChange={e=>setForm({...form, location: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-teal-500" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3 mt-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị chủ trì</label><input type="text" value={form.host} onChange={e=>setForm({...form, host: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-teal-500" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Căn cứ VB (Giấy mời)</label><input type="text" value={form.docRef} onChange={e=>setForm({...form, docRef: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-teal-500" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Chuyên mục</label><select value={form.category || 'KHÁC'} onChange={e=>setForm({...form, category: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-teal-500">{CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nội dung cuộc họp <span className="text-rose-500">*</span></label><textarea required rows="3" value={form.content} onChange={e=>setForm({...form, content: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-teal-500"></textarea></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú / Kết luận</label><textarea rows="3" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 focus:ring-teal-500"></textarea></div>
            <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button><button type="submit" className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium shadow-md">Lưu Cuộc Họp</button></div>
        </form>
    );
};
