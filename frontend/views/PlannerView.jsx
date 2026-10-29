import React from 'react';
import { getDayName, getMonday } from '../helpers.js';
import {
    IconCalendar, IconPlus, IconEdit, IconTrash,
    IconChevronLeft, IconChevronRight, IconExternalLink,
    IconFolder, IconInfo, IconCheckCircle, IconDatabase, IconMail, IconBriefcase, IconUsers
} from '../Icons.jsx';

const PlannerView = ({
    currentWeekStart,
    setCurrentWeekStart,
    schedules,
    dossiers,
    dnisLogs,
    mailLogs,
    coordLogs,
    meetings,
    setScheduleModalConfig,
    requestDeleteSchedule,
}) => {
    const weekDates = Array.from({length: 7}).map((_, i) => {
        const d = new Date(currentWeekStart); d.setDate(d.getDate() + i); return d.toISOString().split('T')[0];
    });

    const fmtDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    // Điều hướng nhanh
    const toYMD = (d) => d.toISOString().split('T')[0];
    const shiftWeeks = (n) => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + n * 7); setCurrentWeekStart(toYMD(d)); };
    const jumpToDate = (val) => { if (val) setCurrentWeekStart(toYMD(getMonday(new Date(val)))); };
    const jumpToMonth = (val) => { if (val) setCurrentWeekStart(toYMD(getMonday(new Date(val + '-01')))); };
    const goToday = () => setCurrentWeekStart(toYMD(getMonday(new Date())));
    const isCurrentWeek = currentWeekStart === toYMD(getMonday(new Date()));

    // Mở chi tiết hồ sơ ở tab mới
    const openDossierTab = (id) => {
        if (!id) return;
        const base = window.location.pathname + window.location.search;
        window.open(`${base}#dossier=${encodeURIComponent(id)}`, '_blank', 'noopener');
    };

    const getSystemActivities = (dateStr) => {
        const acts = [];
        dossiers.forEach(d => {
            const docNum = d.originalDoc.number ? `${d.originalDoc.number} - ` : '';
            // Ngữ cảnh hồ sơ đính kèm cho các mục con (tiến độ / VB kết quả / đóng hồ sơ)
            const ctx = `\nVăn bản gốc: ${docNum}${d.originalDoc.summary || '(Không có trích yếu)'}`;
            const openMeta = d.createdAt ? `Ngày mở hồ sơ ${fmtDate(d.createdAt)}` : '';

            if (d.createdAt?.startsWith(dateStr)) {
                let text = `Văn bản gốc: ${docNum}${d.originalDoc.summary || '(Không có trích yếu)'}`;
                if (d.originalDoc.content) text += `\nChỉ đạo: ${d.originalDoc.content}`;
                acts.push({
                    id: d.id + '_init',
                    dossierId: d.id,
                    text,
                    source: `MỞ HỒ SƠ: ${d.title}`,
                    icon: <IconFolder className="w-4 h-4"/>,
                    color: 'text-blue-700',
                });
            }

            // Gộp mọi cập nhật trong ngày của cùng 1 hồ sơ (tiến độ + văn bản kết quả) vào 1 dòng cho gọn.
            // VB kết quả hiện theo NGÀY BAN HÀNH; nếu trùng ngày đóng hồ sơ thì coi là VB kết thúc -> chỉ hiện ở mục "ĐÓNG HỒ SƠ".
            const closeDay = (d.status === 'archived' && d.closedAt) ? d.closedAt.slice(0, 10) : null;
            const updates = [];
            d.relatedDocs.forEach(rd => {
                if (rd.type === 'progress' && rd.addedAt?.startsWith(dateStr)) {
                    updates.push(`Tiến độ: ${rd.content}`);
                } else if (rd.type === 'document' && rd.docType === 'Văn bản kết quả') {
                    const day = (rd.date || rd.addedAt || '').slice(0, 10);
                    if (day === dateStr && day !== closeDay) {
                        let u = `Văn bản kết quả: ${rd.number || '(chưa có số)'}`;
                        if (rd.content) u += ` - ${rd.content}`;
                        if (rd.note) u += ` (Ghi chú: ${rd.note})`;
                        updates.push(u);
                    }
                } else if (rd.type === 'document' && rd.docType === 'Văn bản chỉ đạo mới') {
                    // Theo thời điểm nhận/cập nhật (addedAt) như tiến độ, không theo ngày ban hành
                    if (rd.addedAt?.startsWith(dateStr)) {
                        let u = `Văn bản chỉ đạo mới: ${rd.number || '(chưa có số)'}`;
                        if (rd.date) u += ` (ban hành ${fmtDate(rd.date)})`;
                        if (rd.content) u += ` - ${rd.content}`;
                        if (rd.note) u += ` (Ghi chú: ${rd.note})`;
                        updates.push(u);
                    }
                }
            });
            if (updates.length) {
                const body = updates.length === 1 ? updates[0] : updates.map(u => `• ${u}`).join('\n');
                acts.push({
                    id: `${d.id}_upd_${dateStr}`,
                    dossierId: d.id,
                    text: `${body}${ctx}`,
                    source: `CẬP NHẬT TIẾN ĐỘ: ${d.title}`,
                    meta: openMeta,
                    icon: <IconInfo className="w-4 h-4"/>,
                    color: 'text-violet-700',
                });
            }

            if (d.status === 'archived' && d.finalResult && d.closedAt?.startsWith(dateStr)) {
                acts.push({
                    id: d.id + '_final',
                    dossierId: d.id,
                    text: `Kết quả báo cáo: ${d.finalResult}${ctx}`,
                    source: `ĐÓNG HỒ SƠ: ${d.title}`,
                    meta: openMeta,
                    icon: <IconCheckCircle className="w-4 h-4"/>,
                    color: 'text-emerald-700',
                });
            }
        });
        const dnisDone = dnisLogs.filter(l => (l.createdAt?.startsWith(dateStr) || l.date?.startsWith(dateStr)) && l.status === 'Hoàn thành');
        if (dnisDone.length) {
            acts.push({
                id: `dnis_${dateStr}`,
                text: (
                    <div className="space-y-1">
                        {dnisDone.map(l => (
                            <div key={l.id}>• <span className="font-semibold">{l.unit}</span>: {l.content}</div>
                        ))}
                    </div>
                ),
                source: `Yêu cầu DNIS`,
                icon: <IconDatabase className="w-4 h-4"/>,
                color: 'text-fuchsia-700',
            });
        }
        mailLogs.filter(l => l.createdAt?.startsWith(dateStr) || l.date?.startsWith(dateStr)).forEach(l =>
            acts.push({ id: l.id, text: `Mail: ${l.email || l.entity}\nNội dung: ${l.content}`, source: `Mail công vụ - ${l.entity}`, icon: <IconMail className="w-4 h-4"/>, color: 'text-cyan-700' })
        );
        coordLogs.filter(l => l.assignedDate === dateStr).forEach(l =>
            acts.push({ id: l.id, text: `Chỉ đạo: ${l.content}\nTiến độ: ${l.progress}`, source: `Phối hợp: ${l.summary}`, icon: <IconBriefcase className="w-4 h-4"/>, color: 'text-orange-700' })
        );
        meetings.filter(m => m.date?.startsWith(dateStr)).forEach(m =>
            acts.push({ id: m.id, text: `Nội dung: ${m.content}`, source: `Cuộc họp - ${m.location || 'Chưa rõ ĐĐ'}`, icon: <IconUsers className="w-4 h-4"/>, color: 'text-teal-700' })
        );
        return acts;
    };

    const accentMap = { 'text-blue-700': 'bg-blue-500', 'text-violet-700': 'bg-violet-500', 'text-emerald-700': 'bg-emerald-500', 'text-fuchsia-700': 'bg-fuchsia-500', 'text-cyan-700': 'bg-cyan-500', 'text-orange-700': 'bg-orange-500', 'text-teal-700': 'bg-teal-500' };

    return (
        <div className="max-w-5xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl"><IconCalendar /></div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Sổ Kế Hoạch Công Tác</h2>
                        <p className="text-sm text-slate-500 font-medium">Lịch làm việc tích hợp - đồng bộ tự động từ toàn hệ thống</p>
                    </div>
                </div>
                <div className="flex items-center flex-wrap gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => shiftWeeks(-1)} title="Tuần trước" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><IconChevronLeft /></button>
                    <label className="relative px-3 font-semibold text-slate-700 text-sm min-w-[190px] text-center cursor-pointer hover:text-indigo-600 transition-colors" title="Chọn ngày bất kỳ để nhảy tới tuần đó">
                        {currentWeekStart.split('-').reverse().join('/')} - {weekDates[6].split('-').reverse().join('/')}
                        <input type="date" value={currentWeekStart} onChange={(e) => jumpToDate(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </label>
                    <button onClick={() => shiftWeeks(1)} title="Tuần sau" className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><IconChevronRight /></button>
                    <input type="month" value={currentWeekStart.slice(0, 7)} onChange={(e) => jumpToMonth(e.target.value)} title="Chọn tháng để xem nhanh" className="px-2 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    <button onClick={goToday} disabled={isCurrentWeek} title="Về tuần hiện tại" className={`ml-0.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${isCurrentWeek ? 'text-slate-300 cursor-default' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>Hôm nay</button>
                </div>
            </div>

            <div className="space-y-3">
                {weekDates.map((dateStr) => {
                    const daySchedules = schedules.filter(s => s.date === dateStr);
                    const sysActivities = getSystemActivities(dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const totalItems = daySchedules.length + sysActivities.length;

                    const allItems = [
                        ...daySchedules.map(sch => ({
                            id: sch.id, type: 'schedule',
                            icon: <IconCalendar className="w-4 h-4" />,
                            source: sch.content,
                            detail: [sch.location ? `📍 ${sch.location}` : null, sch.notes ? `📝 ${sch.notes}` : null, sch.result ? `✅ Kết quả: ${sch.result}` : null].filter(Boolean).join('\n'),
                            color: 'text-indigo-700', accent: 'bg-indigo-500', data: sch, dossierId: null
                        })),
                        ...sysActivities.map(act => ({
                            id: act.id, type: 'system',
                            icon: act.icon, source: act.source, meta: act.meta || null, detail: act.text,
                            color: act.color, accent: accentMap[act.color] || 'bg-slate-400',
                            data: null, dossierId: act.dossierId || null
                        }))
                    ];

                    return (
                        <div key={dateStr} className={`rounded-2xl overflow-hidden border shadow-sm ${isToday ? 'border-indigo-300 ring-2 ring-indigo-500/10' : 'border-slate-200'}`}>
                            <div className={`flex items-center justify-between px-5 py-3 ${isToday ? 'bg-gradient-to-r from-indigo-600 to-indigo-500' : 'bg-slate-50 border-b border-slate-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="text-center w-10 shrink-0">
                                        <div className={`text-xl font-bold leading-none ${isToday ? 'text-white' : 'text-slate-800'}`}>{dateStr.split('-')[2]}</div>
                                        <div className={`text-[10px] font-semibold uppercase tracking-wider leading-none mt-0.5 ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>Th.{dateStr.split('-')[1].replace(/^0/, '')}</div>
                                    </div>
                                    <div className={`w-px h-8 ${isToday ? 'bg-white/30' : 'bg-slate-200'}`}></div>
                                    <div>
                                        <div className={`font-bold text-base leading-tight ${isToday ? 'text-white' : 'text-slate-800'}`}>{getDayName(dateStr)}</div>
                                        <div className={`text-[11px] font-medium ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>{isToday ? 'Hôm nay' : dateStr.split('-').reverse().join('/')}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {totalItems > 0 && (
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isToday ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'}`}>{totalItems} mục</span>
                                    )}
                                    <button onClick={() => setScheduleModalConfig({ isOpen: true, data: null, targetDate: dateStr })}
                                        className={`text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${isToday ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30' : 'bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 shadow-sm'}`}>
                                        <IconPlus className="w-3.5 h-3.5" /> Thêm
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white divide-y divide-slate-100">
                                {allItems.length === 0 ? (
                                    <div className="py-5 px-5 text-slate-400 text-sm italic">Không có kế hoạch hoặc hoạt động.</div>
                                ) : (
                                    allItems.map((item, i) => {
                                        const clickable = !!item.dossierId;
                                        return (
                                            <div key={`${item.id}-${i}`}
                                                onClick={clickable ? () => openDossierTab(item.dossierId) : undefined}
                                                title={clickable ? 'Mở chi tiết hồ sơ trong tab mới' : undefined}
                                                className={`flex group transition-colors ${clickable ? 'cursor-pointer hover:bg-indigo-50/60' : 'hover:bg-slate-50/80'}`}>
                                                <div className={`w-1 shrink-0 ${item.accent}`}></div>
                                                <div className="flex-1 px-4 py-3 flex items-start gap-3 min-w-0">
                                                    <div className={`mt-0.5 shrink-0 ${item.color}`}>{item.icon}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-sm leading-snug ${item.color}`}>
                                                            <span className="font-semibold">{item.source}</span>
                                                            {item.meta && <span className="font-normal text-[11px] text-slate-400"> - {item.meta}</span>}
                                                        </div>
                                                        {item.detail && <div className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">{item.detail}</div>}
                                                    </div>
                                                    {clickable && (
                                                        <div className="shrink-0 mt-0.5 text-slate-300 group-hover:text-indigo-500 transition-colors">
                                                            <IconExternalLink className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}
                                                    {item.type === 'schedule' && (
                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                            <button onClick={() => setScheduleModalConfig({ isOpen: true, data: item.data, targetDate: dateStr })} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Sửa"><IconEdit className="w-3.5 h-3.5"/></button>
                                                            <button onClick={() => requestDeleteSchedule(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Xóa"><IconTrash className="w-3.5 h-3.5"/></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PlannerView;
