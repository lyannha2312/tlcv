import React from 'react';
import { IconBriefcase, IconPlus, IconEdit, IconTrash } from '../Icons.jsx';

const CoordinationsView = ({
    coordLogs,
    setCoordLogModalConfig,
    requestDeleteCoordLog,
}) => {
    return (
        <div className="max-w-6xl mx-auto pb-10">
            <div className="mb-8 border-b border-slate-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-orange-700 flex items-center gap-2"><IconBriefcase /> Nhiệm Vụ Phối Hợp</h2>
                    <p className="text-sm text-slate-500 mt-1">Theo dõi chung tiến độ các nhiệm vụ được giao phối hợp thực hiện.</p>
                </div>
                <button onClick={() => setCoordLogModalConfig({ isOpen: true, data: null })} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-md flex items-center gap-2"><IconPlus /> Thêm Nhiệm Vụ Mới</button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-12">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm min-w-[950px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th className="p-3 pl-5 font-semibold">Ngày giao & Trạng thái</th>
                                <th className="p-3 font-semibold w-1/5">Văn bản (Số & Ngày)</th>
                                <th className="p-3 font-semibold w-1/3">Trích yếu & Chỉ đạo</th>
                                <th className="p-3 font-semibold">Tiến độ thực hiện</th>
                                <th className="p-3 font-semibold text-center w-20">Tùy chỉnh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {coordLogs.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-slate-400">Chưa có nhiệm vụ phối hợp nào.</td></tr>}
                            {coordLogs.sort((a,b) => new Date(b.assignedDate) - new Date(a.assignedDate)).map(log => (
                                <tr key={log.id} className="hover:bg-orange-50/30 group align-top">
                                    <td className="p-3 pl-5">
                                        <div className="font-semibold text-orange-700">{log.assignedDate ? log.assignedDate.split('-').reverse().join('/') : '-'}</div>
                                        <div className={`mt-1.5 text-[10px] uppercase font-bold inline-block px-2 py-0.5 rounded-full border ${log.status === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{log.status}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-bold text-slate-800">{log.docNumber || '-'}</div>
                                        {log.docDate && <div className="text-slate-500 text-xs mt-1">Ngày VB: {log.docDate.split('-').reverse().join('/')}</div>}
                                    </td>
                                    <td className="p-3 text-slate-700">
                                        <div className="font-bold mb-1 text-slate-800">{log.summary}</div>
                                        <div className="text-slate-600 text-xs whitespace-pre-wrap">{log.content}</div>
                                    </td>
                                    <td className="p-3 text-slate-600 whitespace-pre-wrap">{log.progress || '-'}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                            <button onClick={() => setCoordLogModalConfig({ isOpen: true, data: log })} className="p-1 text-slate-400 hover:text-orange-600"><IconEdit className="w-4 h-4"/></button>
                                            <button onClick={() => requestDeleteCoordLog(log.id)} className="p-1 text-slate-400 hover:text-rose-600"><IconTrash className="w-4 h-4"/></button>
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

export default CoordinationsView;
