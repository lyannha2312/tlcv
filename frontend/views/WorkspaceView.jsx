import React from 'react';
import { CATEGORY_COLORS } from '../helpers.js';
import { FolderPopover } from '../components/FolderPopover.jsx';
import {
    IconFolder, IconPlus, IconClock, IconPlay, IconCheckCircle,
    IconCalendar, IconFileText, IconEdit, IconTag, IconChevronLeft
} from '../Icons.jsx';

const WorkspaceView = ({
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
                    <div className="bg-white border border-brand-200 rounded-2xl p-6 shadow-sm mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-bl-full -z-10 opacity-50"></div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex-1 w-full">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2"><IconClock className="text-brand-500"/> Pomodoro Tự Do (Tùy chọn thời gian)</h3>
                                <p className="text-sm text-slate-500 mb-4">Dành cho các tác vụ ngắn, việc linh tinh không cần lưu lại trong hồ sơ cố định.</p>
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input type="text" value={freePomoConfig.name} onChange={e=>setFreePomoConfig({...freePomoConfig, name: e.target.value})} placeholder="Nhập tên việc cần làm (VD: Trả lời email, Đọc tài liệu...)" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" onKeyDown={e => { if (e.key === 'Enter') startFreeTimer(); }} />
                                    <div className="flex items-center gap-2">
                                        <input type="number" min="1" max="120" value={freePomoConfig.minutes} onChange={e=>setFreePomoConfig({...freePomoConfig, minutes: Number(e.target.value)})} className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-center focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" />
                                        <span className="text-sm font-medium text-slate-600">phút</span>
                                    </div>
                                    <button onClick={startFreeTimer} className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-brand-500/20 transition-all hover:scale-105 whitespace-nowrap"><IconPlay className="w-4 h-4" /> Bắt đầu Focus</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><IconFolder className="text-brand-500" /> Tổng quan Bàn làm việc</h2>
                            <p className="text-sm text-slate-500 mt-1 font-medium">Bạn đang có <strong className="text-brand-600 text-base">{dossiers.filter(d => d.status === 'active').length}</strong> hồ sơ cần xử lý.</p>
                        </div>
                        <button onClick={() => setIsCreateModalOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md shadow-brand-500/20 transition-all hover:scale-105"><IconPlus className="w-5 h-5"/> Tạo Hồ Sơ Mới</button>
                    </div>

                    {dossiers.filter(d => d.status === 'active').length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-20 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-100"><IconFolder className="w-10 h-10 text-slate-300" /></div>
                            <p className="text-lg mb-6 text-slate-500 font-semibold">Bàn làm việc đang trống. Rất tuyệt vời!</p>
                            <button onClick={() => setIsCreateModalOpen(true)} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium shadow-md shadow-brand-500/20 transition-colors">Bắt đầu việc mới</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    <div key={dossier.id} onClick={() => setActiveDossierId(dossier.id)} className="bg-white border border-slate-200 hover:border-brand-400 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group flex flex-col h-full relative overflow-hidden">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${catTheme.solid}`}></div>
                                        <div className="flex justify-between items-start mb-3 pl-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${catTheme.bg} ${catTheme.text} border ${catTheme.border}`}>{dossier.category || 'KHÁC'}</span>
                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                {dossier.deadline && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1"><IconCalendar className="w-3 h-3"/> {dossier.deadline.split('-').reverse().join('/')}</span>}
                                                {dossier.priority === 'Cao' && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded shadow-sm animate-pulse">🔴 Khẩn</span>}
                                            </div>
                                        </div>
                                        <h3 className="font-semibold text-slate-800 group-hover:text-brand-600 transition-colors mb-2 pl-2 text-sm leading-snug line-clamp-2" title={dossier.title}>{dossier.title}</h3>
                                        {dossier.originalDoc?.number && <div className="pl-2 mb-2"><span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1 w-max"><IconFileText className="w-3 h-3 shrink-0"/> {dossier.originalDoc.number}</span></div>}
                                        <div className="mt-auto pl-2 pt-4">
                                            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5"><span>Tiến độ Task: {completedTasks}/{totalTasks}</span><span className={progress === 100 ? 'text-emerald-600' : 'text-brand-600'}>{progress}%</span></div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden"><div className={`h-1.5 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{width: `${progress}%`}}></div></div>
                                            <div className="flex gap-2 text-xs">
                                                <span className="flex items-center gap-1 font-medium bg-slate-50 border border-slate-100 px-2.5 py-1 rounded text-slate-600"><IconFileText className="w-3.5 h-3.5"/> {dossier.relatedDocs.length} Cập nhật</span>
                                                <span className="flex items-center gap-1 font-medium bg-slate-50 border border-slate-100 px-2.5 py-1 rounded text-slate-600"><IconClock className="w-3.5 h-3.5"/> {dossier.tasks.reduce((sum, t) => sum + t.pomodoros, 0)} Pomo</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 pb-20">
                    <button onClick={() => setActiveDossierId(null)} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-600 hover:bg-brand-50 px-3 py-2 rounded-lg border border-transparent hover:border-brand-200 transition-colors">
                        <IconChevronLeft /> Quay lại danh sách
                    </button>
                    <div className={`bg-white border-t-4 border border-slate-200 rounded-2xl shadow-sm ${CATEGORY_COLORS[activeDossier.category]?.border.replace('border-', 'border-t-') || 'border-t-slate-500'}`}>
                        <div className="p-6">
                            {/* Badges + nút sửa */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center flex-wrap gap-2">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${CATEGORY_COLORS[activeDossier.category]?.bg} ${CATEGORY_COLORS[activeDossier.category]?.text} border ${CATEGORY_COLORS[activeDossier.category]?.border}`}>{activeDossier.category || 'KHÁC'}</span>
                                    {activeDossier.priority === 'Cao' && <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">🔴 Ưu tiên Cao</span>}
                                    {activeDossier.deadline && <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1"><IconCalendar className="w-3 h-3"/> Hạn: {activeDossier.deadline.split('-').reverse().join('/')}</span>}
                                </div>
                                <button onClick={() => setEditDossierConfig({isOpen: true, data: activeDossier})} className="text-slate-400 hover:text-brand-600 hover:bg-brand-50 p-1.5 rounded-lg border border-transparent hover:border-brand-200 transition-colors" title="Chỉnh sửa hồ sơ"><IconEdit className="w-4 h-4"/></button>
                            </div>
                            {/* Tiêu đề */}
                            <h2 className="text-xl font-bold text-slate-800 mb-4 leading-snug">{activeDossier.title}</h2>
                            {/* Metadata văn bản */}
                            <div className="flex flex-wrap gap-2 text-sm mb-5">
                                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5"><IconTag className="w-3.5 h-3.5 shrink-0"/> {activeDossier.originalDoc.number}</span>
                                {activeDossier.originalDoc.date && <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200">Ngày: {activeDossier.originalDoc.date.split('-').reverse().join('/')}</span>}
                                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200">Từ: {activeDossier.originalDoc.sender}</span>
                            </div>
                            {/* Trích yếu / Chỉ đạo */}
                            {(activeDossier.originalDoc.summary || activeDossier.originalDoc.content) && (
                                <div className="text-slate-600 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                                    {activeDossier.originalDoc.summary && <div><span className="font-semibold text-slate-800">Trích yếu:</span> {activeDossier.originalDoc.summary}</div>}
                                    {activeDossier.originalDoc.content && <div><span className="font-semibold text-slate-800">Chỉ đạo:</span> {activeDossier.originalDoc.content}</div>}
                                </div>
                            )}
                        </div>
                        {/* Footer actions */}
                        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3 flex flex-wrap items-center justify-end gap-2 rounded-b-2xl">
                            {activeDossier.folderPath && (
                                <FolderPopover folderName={activeDossier.folderPath} />
                            )}
                            <button onClick={() => setCurrentView('detail')} className="flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-lg font-medium transition-colors text-sm"><IconClock className="w-4 h-4"/> Xem Timeline</button>
                            <button onClick={() => setDocModalConfig({isOpen: true, data: null})} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium shadow-sm text-sm"><IconPlus className="w-4 h-4"/> Cập nhật nội dung xử lý</button>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><IconCheckCircle className="text-brand-500"/> Task Nhỏ Chống Trì Hoãn</h3>
                            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200">{activeDossier.tasks.filter(t=>t.isCompleted).length} / {activeDossier.tasks.length} Xong</span>
                        </div>
                        <div className="relative mb-6">
                            <input type="text" value={newTaskTitle} onChange={(e)=>setNewTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTaskTitle.trim()) { addTask(activeDossier.id, newTaskTitle.trim()); setNewTaskTitle(''); } }} placeholder="Nhập tên việc nhỏ cần làm & nhấn Enter..." className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 shadow-inner" />
                            <button onClick={() => { if(newTaskTitle) { addTask(activeDossier.id, newTaskTitle); setNewTaskTitle(''); } }} className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"><IconPlus /></button>
                        </div>
                        <div className="space-y-3">
                            {activeDossier.tasks.length === 0 && <p className="text-center text-slate-400 py-6 text-sm">Chưa có nhiệm vụ nhỏ nào.</p>}
                            {activeDossier.tasks.map(task => (
                                <div key={task.id} className={`group flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl border transition-all ${task.isCompleted ? 'bg-slate-50 border-slate-100 opacity-70' : 'bg-white border-slate-200 hover:border-brand-300'}`}>
                                    <div className="flex items-start md:items-center gap-3 flex-1 overflow-hidden mb-3 md:mb-0">
                                        <button onClick={() => toggleTaskComplete(activeDossier.id, task.id)} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors ${task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-brand-500'}`}><IconCheckCircle className="w-4 h-4" /></button>
                                        <span className={`text-sm md:text-base truncate ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>{task.title}</span>
                                    </div>
                                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pl-9 md:pl-4">
                                        <div className="flex items-center gap-1.5" title="Số phiên Pomodoro">
                                            {Array.from({length: Math.min(5, task.pomodoros)}).map((_, i) => <div key={i} className="w-2.5 h-2.5 rounded-full bg-brand-500"></div>)}
                                            {task.pomodoros > 5 && <span className="text-xs text-brand-600 font-bold ml-1">+{task.pomodoros - 5}</span>}
                                            {task.pomodoros === 0 && <span className="text-xs text-slate-400">0 pomo</span>}
                                        </div>
                                        {!task.isCompleted && (
                                            <div className="flex items-center gap-1.5">
                                                <input type="number" min="1" max="120" value={taskDurations[task.id] || 25} onChange={(e) => setTaskDurations({...taskDurations, [task.id]: Number(e.target.value)})} className="w-12 bg-white border border-slate-200 rounded-md text-center text-xs py-1.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500" title="Thời gian (phút)" />
                                                <button onClick={() => { setFocusMode(true); toggleTimer(task.id, task.title, taskDurations[task.id] || 25); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-brand-50 text-slate-600 hover:text-brand-700 rounded-lg text-xs font-medium border border-slate-200 hover:border-brand-300 shadow-sm"><IconClock className="w-3.5 h-3.5" /> Chạy</button>
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
