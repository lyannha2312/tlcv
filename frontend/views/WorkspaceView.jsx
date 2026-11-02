import React, { useState } from 'react';
import { CATEGORY_COLORS } from '../helpers.js';
import { openDossierFolder } from '../components/DossierFiles.jsx';
import {
    IconFolder, IconPlus, IconClock, IconPlay, IconCheckCircle,
    IconCalendar, IconFileText, IconEdit, IconTag, IconChevronLeft
} from '../Icons.jsx';

const ExpandableText = ({ text, clamp = 2, className = '' }) => {
    const [expanded, setExpanded] = useState(false);
    if (!text) return null;
    const isLong = text.length > 130 || (text.match(/\n/g) || []).length >= 2;
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

const WorkspaceView = ({
    serverMode,
    dossiers,
    activeDossier,
    setActiveDossierId,
    setIsCreateModalOpen,
    setEditDossierConfig,
    setDocModalConfig,
    setCurrentView,
    freePomoConfig,
    setFreePomoConfig,
    startFreeTimer,
    timerState,
    taskDurations,
    setTaskDurations,
    toggleTimer,
    setFocusMode,
    newTaskTitle,
    setNewTaskTitle,
    addTask,
    toggleTaskComplete,
}) => {
    return (
        <div className="max-w-5xl mx-auto h-full flex flex-col">
            {!activeDossier ? (
                <div className="w-full pb-10 animate-[fadeIn_0.3s_ease-out]">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex-1 w-full">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1.5"><IconClock className="text-brand-600"/> Pomodoro Tự Do (Tùy chọn thời gian)</h3>
                                <p className="text-xs text-slate-500 mb-3">Dành cho các tác vụ ngắn, việc linh tinh không cần lưu lại trong hồ sơ cố định.</p>
                                <div className="flex flex-col md:flex-row gap-2.5">
                                    <input type="text" value={freePomoConfig.name} onChange={e=>setFreePomoConfig({...freePomoConfig, name: e.target.value})} placeholder="Nhập tên việc cần làm (VD: Trả lời email, Đọc tài liệu...)" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500" onKeyDown={e => { if (e.key === 'Enter') startFreeTimer(); }} />
                                    <div className="flex items-center gap-1.5">
                                        <input type="number" min="1" max="120" value={freePomoConfig.minutes} onChange={e=>setFreePomoConfig({...freePomoConfig, minutes: Number(e.target.value)})} className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-center text-sm focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500" />
                                        <span className="text-xs font-medium text-slate-600">phút</span>
                                    </div>
                                    <button onClick={startFreeTimer} className="flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all whitespace-nowrap"><IconPlay className="w-3.5 h-3.5" /> Bắt đầu Focus</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><IconFolder className="text-brand-600" /> Bàn làm việc</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Bạn đang có <strong className="text-brand-700 font-semibold">{dossiers.filter(d => d.status === 'active').length}</strong> hồ sơ cần xử lý.</p>
                        </div>
                        <button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all"><IconPlus className="w-4 h-4"/> Tạo Hồ Sơ Mới</button>
                    </div>

                    {dossiers.filter(d => d.status === 'active').length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-16 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-100"><IconFolder className="w-8 h-8 text-slate-300" /></div>
                            <p className="text-base mb-4 text-slate-500 font-medium">Bàn làm việc đang trống. Rất tuyệt vời!</p>
                            <button onClick={() => setIsCreateModalOpen(true)} className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium shadow-sm transition-colors">Bắt đầu việc mới</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {dossiers.filter(d => d.status === 'active').sort((a, b) => {
                                const pWeight = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };
                                const wA = pWeight[a.priority || 'Trung bình'] || 0; const wB = pWeight[b.priority || 'Trung bình'] || 0;
                                if (wA !== wB) return wB - wA;
                                if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
                                if (a.deadline) return -1; if (b.deadline) return 1;
                                return new Date(b.createdAt) - new Date(a.createdAt);
                            }).map(dossier => {
                                const catTheme = CATEGORY_COLORS[dossier.category] || CATEGORY_COLORS['KHÁC'];
                                const completedTasks = dossier.tasks.filter(t => t.isCompleted).length;
                                const totalTasks = dossier.tasks.length;
                                const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

                                return (
                                    <div key={dossier.id} onClick={() => setActiveDossierId(dossier.id)} className="bg-white border border-slate-200 hover:border-brand-300 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md group flex flex-col h-full relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded text-white ${catTheme.dot || 'bg-brand-500'}`}>
                                                {dossier.category || 'KHÁC'}
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                {dossier.deadline && <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1"><IconCalendar className="w-3 h-3"/> {dossier.deadline.split('-').reverse().join('/')}</span>}
                                                {dossier.priority === 'Cao' && <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">🔴 Khẩn</span>}
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors mb-1.5 text-sm leading-snug line-clamp-2" title={dossier.title}>{dossier.title}</h3>
                                        {dossier.originalDoc?.number && (
                                            <div className="mb-1.5">
                                                <span className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1 w-max">
                                                    <IconFileText className="w-3 h-3 shrink-0 text-slate-400"/> {dossier.originalDoc.number}
                                                </span>
                                            </div>
                                        )}
                                        {(dossier.originalDoc?.summary || dossier.originalDoc?.content) && (
                                            <p className="text-xs text-slate-500 line-clamp-1 mb-2.5" title={dossier.originalDoc.summary || dossier.originalDoc.content}>
                                                {dossier.originalDoc.summary || dossier.originalDoc.content}
                                            </p>
                                        )}
                                        <div className="mt-auto pt-2.5 border-t border-slate-100">
                                            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1"><span>Task: {completedTasks}/{totalTasks}</span><span className={progress === 100 ? 'text-emerald-600' : 'text-brand-600'}>{progress}%</span></div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2.5 overflow-hidden"><div className={`h-1.5 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{width: `${progress}%`}}></div></div>
                                            <div className="flex gap-2 text-xs">
                                                <span className="flex items-center gap-1 font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-600 text-[11px]"><IconFileText className="w-3 h-3 text-slate-400"/> {dossier.relatedDocs.length} Cập nhật</span>
                                                <span className="flex items-center gap-1 font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-600 text-[11px]"><IconClock className="w-3 h-3 text-slate-400"/> {dossier.tasks.reduce((sum, t) => sum + t.pomodoros, 0)} Pomo</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4 pb-16">
                    <button onClick={() => setActiveDossierId(null)} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
                        <IconChevronLeft className="w-3.5 h-3.5"/> Quay lại danh sách
                    </button>
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 md:p-5">
                            {/* Badges + nút sửa */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center flex-wrap gap-1.5">
                                    <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded text-white ${CATEGORY_COLORS[activeDossier.category]?.dot || 'bg-brand-500'}`}>
                                        {activeDossier.category || 'KHÁC'}
                                    </span>
                                    {activeDossier.priority === 'Cao' && <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">🔴 Khẩn</span>}
                                    {activeDossier.deadline && <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1"><IconCalendar className="w-3 h-3"/> Hạn: {activeDossier.deadline.split('-').reverse().join('/')}</span>}
                                </div>
                                <button onClick={() => setEditDossierConfig({isOpen: true, data: activeDossier})} className="text-slate-400 hover:text-brand-600 hover:bg-brand-50 p-1.5 rounded-lg border border-transparent hover:border-brand-200 transition-colors" title="Chỉnh sửa hồ sơ"><IconEdit className="w-4 h-4"/></button>
                            </div>
                            {/* Tiêu đề */}
                            <h2 className="text-lg font-bold text-slate-800 mb-2.5 leading-snug">{activeDossier.title}</h2>
                            {/* Metadata văn bản */}
                            <div className="flex flex-wrap gap-1.5 text-xs mb-3">
                                {activeDossier.originalDoc.number && <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200 flex items-center gap-1"><IconTag className="w-3 h-3 shrink-0 text-slate-400"/> {activeDossier.originalDoc.number}</span>}
                                {activeDossier.originalDoc.date && <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200">Ngày: {activeDossier.originalDoc.date.split('-').reverse().join('/')}</span>}
                                {activeDossier.originalDoc.sender && <span className="bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200">Từ: {activeDossier.originalDoc.sender}</span>}
                            </div>
                            {/* Trích yếu / Chỉ đạo (rút gọn) */}
                            {(activeDossier.originalDoc.summary || activeDossier.originalDoc.content) && (
                                <div className="text-slate-600 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5">
                                    {activeDossier.originalDoc.summary && <div><span className="font-semibold text-slate-800">Trích yếu:</span> {activeDossier.originalDoc.summary}</div>}
                                    {activeDossier.originalDoc.content && (
                                        <div>
                                            <span className="font-semibold text-slate-800">Ý kiến chỉ đạo: </span>
                                            <ExpandableText text={activeDossier.originalDoc.content} clamp={2} className="inline text-slate-700" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Footer actions - gom hàng gọn */}
                        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 flex flex-wrap items-center justify-end gap-2">
                            {activeDossier.folderPath && (
                                <button onClick={() => openDossierFolder(activeDossier.folderPath, serverMode === true)} className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg font-medium text-xs shadow-sm transition-colors"><IconFolder className="w-3.5 h-3.5 text-amber-600"/> Mở thư mục</button>
                            )}
                            <button onClick={() => setCurrentView('detail')} className="flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 px-3 py-1.5 rounded-lg font-medium text-xs shadow-sm transition-colors"><IconClock className="w-3.5 h-3.5 text-sky-600"/> Xem Timeline</button>
                            <button onClick={() => setDocModalConfig({isOpen: true, data: null})} className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-1.5 rounded-lg font-medium shadow-sm text-xs transition-colors"><IconPlus className="w-3.5 h-3.5"/> Cập nhật nội dung xử lý</button>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5"><IconCheckCircle className="text-brand-600 w-4 h-4"/> Task Nhỏ Chống Trì Hoãn</h3>
                            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">{activeDossier.tasks.filter(t=>t.isCompleted).length} / {activeDossier.tasks.length} Xong</span>
                        </div>
                        <div className="relative mb-4">
                            <input type="text" value={newTaskTitle} onChange={(e)=>setNewTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTaskTitle.trim()) { addTask(activeDossier.id, newTaskTitle.trim()); setNewTaskTitle(''); } }} placeholder="Nhập tên việc nhỏ cần làm & nhấn Enter..." className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500" />
                            <button onClick={() => { if(newTaskTitle) { addTask(activeDossier.id, newTaskTitle); setNewTaskTitle(''); } }} className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md"><IconPlus className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-2">
                            {activeDossier.tasks.length === 0 && <p className="text-center text-slate-400 py-4 text-xs">Chưa có nhiệm vụ nhỏ nào.</p>}
                            {activeDossier.tasks.map(task => (
                                <div key={task.id} className={`group flex flex-col md:flex-row md:items-center justify-between p-2.5 rounded-lg border transition-all ${task.isCompleted ? 'bg-slate-50 border-slate-100 opacity-70' : 'bg-white border-slate-200 hover:border-brand-200'}`}>
                                    <div className="flex items-start md:items-center gap-2.5 flex-1 overflow-hidden mb-2 md:mb-0">
                                        <button onClick={() => toggleTaskComplete(activeDossier.id, task.id)} className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-brand-500'}`}><IconCheckCircle className="w-3.5 h-3.5" /></button>
                                        <span className={`text-xs md:text-sm truncate ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>{task.title}</span>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pl-7 md:pl-3">
                                        <div className="flex items-center gap-1" title="Số phiên Pomodoro">
                                            {Array.from({length: Math.min(5, task.pomodoros)}).map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-brand-500"></div>)}
                                            {task.pomodoros > 5 && <span className="text-[11px] text-brand-600 font-bold ml-1">+{task.pomodoros - 5}</span>}
                                            {task.pomodoros === 0 && <span className="text-[11px] text-slate-400">0 pomo</span>}
                                        </div>
                                        {!task.isCompleted && (
                                            <div className="flex items-center gap-1.5">
                                                <input type="number" min="1" max="120" value={taskDurations[task.id] || 25} onChange={(e) => setTaskDurations({...taskDurations, [task.id]: Number(e.target.value)})} className="w-12 bg-white border border-slate-200 rounded text-center text-xs py-1 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" title="Thời gian (phút)" />
                                                <button onClick={() => { setFocusMode(true); toggleTimer(task.id, task.title, taskDurations[task.id] || 25); }} className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-brand-50 text-slate-600 hover:text-brand-700 rounded text-xs font-medium border border-slate-200 hover:border-brand-300 shadow-sm"><IconClock className="w-3 h-3" /> Chạy</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkspaceView;
