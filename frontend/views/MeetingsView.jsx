import React from 'react';
import { formatDate, CATEGORY_COLORS } from '../helpers.js';
import { IconUsers, IconPlus, IconEdit, IconTrash } from '../Icons.jsx';

const MeetingsView = ({
    meetings,
    setMeetingModalConfig,
    requestDeleteMeeting,
}) => {
    return (
        <div className="max-w-6xl mx-auto pb-10">
            <div className="mb-8 border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-teal-700 flex items-center gap-2"><IconUsers /> Sổ Tay Cuộc Họp</h2>
                    <p className="text-sm text-slate-500 mt-1">Lưu trữ biên bản, nội dung và các kết luận từ các cuộc họp đã tham dự.</p>
                </div>
                <button onClick={() => setMeetingModalConfig({ isOpen: true, data: null })} className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-md flex items-center gap-2"><IconPlus /> Thêm Cuộc Họp Mới</button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-12">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm min-w-[640px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th className="p-3 pl-5 font-semibold w-[16%]">Thời gian & Địa điểm</th>
                                <th className="p-3 font-semibold w-[16%]">Đơn vị chủ trì & Căn cứ</th>
                                <th className="p-3 font-semibold w-[12%] text-center">Chuyên mục</th>
                                <th className="p-3 font-semibold w-[36%]">Nội dung họp</th>
                                <th className="p-3 font-semibold w-[14%]">Ghi chú / Kết luận</th>
                                <th className="p-3 font-semibold text-center w-20">Tùy chỉnh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {meetings.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400">Chưa có bản ghi cuộc họp nào.</td></tr>}
                            {meetings.sort((a,b) => new Date(b.date) - new Date(a.date)).map(meeting => (
                                <tr key={meeting.id} className="hover:bg-teal-50/30 group align-top">
                                    <td className="p-3 pl-5">
                                        <div className="font-semibold text-teal-700">{formatDate(meeting.date)}</div>
                                        <div className="text-slate-500 text-xs mt-1">{meeting.location || 'Chưa có địa điểm'}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-medium text-slate-800">{meeting.host || '-'}</div>
                                        <div className="text-slate-500 text-xs mt-1">{meeting.docRef || '-'}</div>
                                    </td>
                                    <td className="p-3 text-center">
                                        {(() => { const c = CATEGORY_COLORS[meeting.category] || CATEGORY_COLORS['KHÁC']; return <span className={`text-[10px] font-bold uppercase tracking-wide ${c.text}`}>{meeting.category || 'KHÁC'}</span>; })()}
                                    </td>
                                    <td className="p-3 text-slate-700 whitespace-pre-wrap">{meeting.content}</td>
                                    <td className="p-3 text-slate-600 whitespace-pre-wrap">{meeting.notes || '-'}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => setMeetingModalConfig({ isOpen: true, data: meeting })} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-100 rounded"><IconEdit className="w-4 h-4"/></button>
                                            <button onClick={() => requestDeleteMeeting(meeting.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded"><IconTrash className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MeetingsView;
