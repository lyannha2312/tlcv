import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import './index.css';

// Helpers & constants
import { generateId, mergeById, formatDate, getLocalDateTimeString, getMonday, CATEGORY_COLORS, CATEGORIES, WORK_TIME, BREAK_TIME } from './helpers.js';

// Icons
import {
    IconFolder, IconClock, IconCheckCircle, IconPlus, IconArchive,
    IconPlay, IconSquare, IconSearch, IconSave, IconUpload,
    IconDatabase, IconMail, IconBriefcase, IconCalendar, IconUsers,
    IconMaximize, IconMinimize, IconSun, IconMoon, IconEdit
} from './Icons.jsx';

// Components
import Modal from './components/Modal.jsx';
import { DossierForm, AddDocForm, DnisLogForm, MailLogForm, CoordLogForm, ScheduleForm, MeetingForm } from './components/Forms.jsx';

// Views
import WorkspaceView from './views/WorkspaceView.jsx';
import ArchiveView from './views/ArchiveView.jsx';
import DnisView from './views/DnisView.jsx';
import MailView from './views/MailView.jsx';
import CoordinationsView from './views/CoordinationsView.jsx';
import MeetingsView from './views/MeetingsView.jsx';
import PlannerView from './views/PlannerView.jsx';
import DetailView from './views/DetailView.jsx';
import { initGoogleAuth, loginAndSync, uploadToDrive, downloadFromDrive } from './driveSync.js';
import { APP_PASSWORD } from './security.js';

const App = () => {
    // Notifications State
    const [toastMsg, setToastMsg] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const showToast = (msg) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    // Password Gate (bảo vệ các thao tác: Lưu lên Drive, Sao lưu, Phục hồi, Import hồ sơ từ file)
    const [passwordGate, setPasswordGate] = useState({ isOpen: false, value: '', error: '' });
    const pendingActionRef = useRef(null);

    const requirePassword = (action) => {
        pendingActionRef.current = action;
        setPasswordGate({ isOpen: true, value: '', error: '' });
    };
    const confirmPasswordGate = () => {
        if (passwordGate.value === APP_PASSWORD) {
            const action = pendingActionRef.current;
            pendingActionRef.current = null;
            setPasswordGate({ isOpen: false, value: '', error: '' });
            if (action) action();
        } else {
            setPasswordGate(prev => ({ ...prev, value: '', error: 'Sai mật khẩu, vui lòng thử lại!' }));
        }
    };
    const cancelPasswordGate = () => {
        pendingActionRef.current = null;
        setPasswordGate({ isOpen: false, value: '', error: '' });
    };

    // Data State
    const [dossiers, setDossiers] = useState(() => {
        const saved = localStorage.getItem('hoso_data_light_v4');
        return saved ? JSON.parse(saved) : [];
    });
    const [dnisLogs, setDnisLogs] = useState(() => {
        const saved = localStorage.getItem('hoso_data_light_dnis_logs_v4');
        return saved ? JSON.parse(saved) : [];
    });
    const [mailLogs, setMailLogs] = useState(() => {
        const saved = localStorage.getItem('hoso_data_light_mail_logs_v4');
        return saved ? JSON.parse(saved) : [];
    });
    const [coordLogs, setCoordLogs] = useState(() => {
        const saved = localStorage.getItem('hoso_data_light_coord_logs_v4');
        return saved ? JSON.parse(saved) : [];
    });
    const [schedules, setSchedules] = useState(() => {
        const saved = localStorage.getItem('hoso_data_light_schedules_v4');
        return saved ? JSON.parse(saved) : [];
    });
    const [meetings, setMeetings] = useState(() => {
        const saved = localStorage.getItem('hoso_data_light_meetings_v4');
        return saved ? JSON.parse(saved) : [];
    });

    // UI State
    const [currentView, setCurrentView] = useState('workspace');
    const [activeDossierId, setActiveDossierId] = useState(null);
    const [focusMode, setFocusMode] = useState(false);
    const [focusDark, setFocusDark] = useState(false);
    const [isDriveSyncing, setIsDriveSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()).toISOString().split('T')[0]);

    // Timer State
    const [freePomoConfig, setFreePomoConfig] = useState({ name: '', minutes: 25 });
    const [timerState, setTimerState] = useState({ timeLeft: WORK_TIME, initialDuration: WORK_TIME, isRunning: false, mode: 'work', activeTaskId: null, isFree: false, activeTaskName: '' });
    const timerRef = useRef(null);
    const [taskDurations, setTaskDurations] = useState({});

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editDossierConfig, setEditDossierConfig] = useState({ isOpen: false, data: null });
    const [docModalConfig, setDocModalConfig] = useState({ isOpen: false, data: null });
    const [dnisLogModalConfig, setDnisLogModalConfig] = useState({ isOpen: false, data: null });
    const [mailLogModalConfig, setMailLogModalConfig] = useState({ isOpen: false, data: null });
    const [coordLogModalConfig, setCoordLogModalConfig] = useState({ isOpen: false, data: null });
    const [scheduleModalConfig, setScheduleModalConfig] = useState({ isOpen: false, data: null, targetDate: '' });
    const [meetingModalConfig, setMeetingModalConfig] = useState({ isOpen: false, data: null });
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

    // Auto-save
    useEffect(() => localStorage.setItem('hoso_data_light_v4', JSON.stringify(dossiers)), [dossiers]);
    useEffect(() => localStorage.setItem('hoso_data_light_dnis_logs_v4', JSON.stringify(dnisLogs)), [dnisLogs]);
    useEffect(() => localStorage.setItem('hoso_data_light_mail_logs_v4', JSON.stringify(mailLogs)), [mailLogs]);
    useEffect(() => localStorage.setItem('hoso_data_light_coord_logs_v4', JSON.stringify(coordLogs)), [coordLogs]);
    useEffect(() => localStorage.setItem('hoso_data_light_schedules_v4', JSON.stringify(schedules)), [schedules]);
    useEffect(() => localStorage.setItem('hoso_data_light_meetings_v4', JSON.stringify(meetings)), [meetings]);

    useEffect(() => {
        initGoogleAuth(); // Kích hoạt ngầm thư viện Google khi web tải xong
    }, []);

    // Mở nhanh chi tiết 1 hồ sơ qua hash URL (#dossier=<id>) — dùng khi mở ở tab mới từ Sổ kế hoạch
    const dossiersRef = useRef(dossiers);
    useEffect(() => { dossiersRef.current = dossiers; }, [dossiers]);
    useEffect(() => {
        const applyHash = () => {
            const m = window.location.hash.match(/^#dossier=(.+)$/);
            if (!m) return;
            const id = decodeURIComponent(m[1]);
            if (!dossiersRef.current.some(d => d.id === id)) return;
            setActiveDossierId(id);
            setCurrentView('detail');
            history.replaceState(null, '', window.location.pathname + window.location.search);
        };
        applyHash();
        window.addEventListener('hashchange', applyHash);
        return () => window.removeEventListener('hashchange', applyHash);
    }, []);

    useEffect(() => {
        if (timerState.isRunning) {
            timerRef.current = setInterval(() => {
                setTimerState(prev => {
                    if (prev.timeLeft <= 1) {
                        clearInterval(timerRef.current);
                        const isWork = prev.mode === 'work';
                        playBeep();
                        if (isWork && !prev.isFree && prev.activeTaskId && activeDossierId) handlePomodoroComplete(activeDossierId, prev.activeTaskId);
                        const nextMode = isWork ? 'break' : 'work';
                        const nextTime = isWork ? BREAK_TIME : prev.initialDuration;
                        return { ...prev, isRunning: false, mode: nextMode, timeLeft: nextTime };
                    }
                    return { ...prev, timeLeft: prev.timeLeft - 1 };
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [timerState.isRunning, activeDossierId]);

    const playBeep = () => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        } catch(e) { console.log('Audio not supported'); }
    };

    const toggleTimer = (taskId = null, taskName = '', customMinutes = 25) => {
        setTimerState(prev => {
            if (!prev.isRunning && taskId) {
                const durationSeconds = customMinutes * 60;
                return { ...prev, isRunning: true, activeTaskId: taskId, mode: 'work', timeLeft: durationSeconds, initialDuration: durationSeconds, isFree: false, activeTaskName: taskName };
            }
            return { ...prev, isRunning: !prev.isRunning };
        });
    };

    const startFreeTimer = () => {
        if (!freePomoConfig.name.trim()) { showToast('Vui lòng nhập tên công việc để tập trung!'); return; }
        const durationSeconds = freePomoConfig.minutes * 60;
        setTimerState({ timeLeft: durationSeconds, initialDuration: durationSeconds, isRunning: true, mode: 'work', activeTaskId: 'free', isFree: true, activeTaskName: freePomoConfig.name.trim() });
        setActiveDossierId(null);
        setFocusMode(true);
    };

    const saveDossier = (data, editId = null) => {
        if (editId) {
            setDossiers(dossiers.map(d => d.id === editId ? { ...d, ...data, originalDoc: { ...d.originalDoc, ...data.originalDoc } } : d));
            showToast('Đã cập nhật thông tin hồ sơ!');
        } else {
            const newDossier = { id: generateId(), status: 'active', relatedDocs: [], tasks: [], finalResult: '', ...data };
            setDossiers([...dossiers, newDossier]);
            setActiveDossierId(newDossier.id);
            setCurrentView('workspace');
            showToast('Đã tạo hồ sơ mới!');
        }
    };

    const saveRelatedDoc = (dossierId, docData, editId = null) => {
        if (editId) {
            setDossiers(prev => prev.map(d => d.id === dossierId ? { ...d, relatedDocs: d.relatedDocs.map(rd => rd.id === editId ? { ...rd, ...docData } : rd) } : d));
            showToast('Đã cập nhật nội dung xử lý!');
        } else {
            setDossiers(prev => prev.map(d => d.id === dossierId ? { ...d, relatedDocs: [...d.relatedDocs, { id: generateId(), addedAt: new Date().toISOString(), ...docData }] } : d));
            showToast('Đã thêm nội dung xử lý!');
        }
    };

    const requestDeleteDossier = (dossier) => {
        requirePassword(() => {
            setConfirmDialog({ isOpen: true, title: 'Xóa hồ sơ?', message: `Bạn có chắc chắn muốn xóa hồ sơ "${dossier.title}"? Toàn bộ văn bản và công việc liên quan sẽ bị xóa, không thể hoàn tác.`, onConfirm: () => { setDossiers(prev => prev.filter(d => d.id !== dossier.id)); if (activeDossierId === dossier.id) setActiveDossierId(null); showToast('Đã xóa hồ sơ!'); } });
        });
    };

    const requestDeleteRelatedDoc = (dossierId, docId) => {
        setConfirmDialog({ isOpen: true, title: 'Xóa nội dung xử lý?', message: 'Bạn có chắc chắn muốn xóa nội dung này?', onConfirm: () => { setDossiers(dossiers.map(d => d.id === dossierId ? { ...d, relatedDocs: d.relatedDocs.filter(rd => rd.id !== docId) } : d)); showToast('Đã xóa thành công!'); } });
    };

    const addTask = (dossierId, title) => {
        setDossiers(dossiers.map(d => d.id === dossierId ? { ...d, tasks: [...d.tasks, { id: generateId(), title: title, isCompleted: false, pomodoros: 0, completedAt: null, createdAt: new Date().toISOString() }] } : d));
    };

    const toggleTaskComplete = (dossierId, taskId) => {
        setDossiers(dossiers.map(d => d.id === dossierId ? { ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? new Date().toISOString() : null } : t) } : d));
    };

    const handlePomodoroComplete = (dossierId, taskId) => {
        setDossiers(prev => prev.map(d => d.id === dossierId ? { ...d, tasks: d.tasks.map(t => t.id === taskId ? { ...t, pomodoros: t.pomodoros + 1 } : t) } : d));
    };

    const updateFinalResult = (dossierId, result, closedDate) => {
        // Ngày đóng hồ sơ chỉ chọn ngày (YYYY-MM-DD) → gán mặc định 23:59 để luôn nằm cuối ngày đó
        const normalizedClose = /^\d{4}-\d{2}-\d{2}$/.test(closedDate || '') ? `${closedDate}T23:59:00` : closedDate;
        const finalClosedAt = normalizedClose ? new Date(normalizedClose).toISOString() : new Date().toISOString();
        setDossiers(dossiers.map(d => d.id === dossierId ? { ...d, finalResult: result, status: 'archived', closedAt: finalClosedAt } : d));
        showToast('Đã đóng hồ sơ thành công!');
    };

    const reopenDossier = (dossierId) => {
        setDossiers(dossiers.map(d => d.id === dossierId ? { ...d, status: 'active', closedAt: null } : d));
        showToast('Đã chuyển hồ sơ về trạng thái Đang thực hiện!');
    };

    const saveDnisLog = (data, editId = null) => {
        if (editId) { setDnisLogs(dnisLogs.map(l => l.id === editId ? { ...l, ...data } : l)); showToast('Đã cập nhật nhật ký DNIS!'); }
        else { setDnisLogs([{ id: generateId(), createdAt: new Date().toISOString(), ...data }, ...dnisLogs]); showToast('Đã thêm nhật ký DNIS mới!'); }
    };
    const requestDeleteDnisLog = (id) => {
        setConfirmDialog({ isOpen: true, title: 'Xóa nhật ký DNIS?', message: 'Bạn có chắc chắn muốn xóa bản ghi này? Không thể hoàn tác.', onConfirm: () => { setDnisLogs(dnisLogs.filter(l => l.id !== id)); showToast('Đã xóa thành công!'); } });
    };

    const saveMailLog = (data, editId = null) => {
        if (editId) { setMailLogs(mailLogs.map(l => l.id === editId ? { ...l, ...data } : l)); showToast('Đã cập nhật yêu cầu Mail!'); }
        else { setMailLogs([{ id: generateId(), createdAt: new Date().toISOString(), ...data }, ...mailLogs]); showToast('Đã thêm yêu cầu Mail mới!'); }
    };
    const requestDeleteMailLog = (id) => {
        setConfirmDialog({ isOpen: true, title: 'Xóa yêu cầu Mail?', message: 'Bạn có chắc chắn muốn xóa bản ghi này?', onConfirm: () => { setMailLogs(mailLogs.filter(l => l.id !== id)); showToast('Đã xóa thành công!'); } });
    };

    const saveCoordLog = (data, editId = null) => {
        if (editId) { setCoordLogs(coordLogs.map(l => l.id === editId ? { ...l, ...data } : l)); showToast('Đã cập nhật nhiệm vụ phối hợp!'); }
        else { setCoordLogs([{ id: generateId(), createdAt: new Date().toISOString(), ...data }, ...coordLogs]); showToast('Đã thêm nhiệm vụ phối hợp mới!'); }
    };
    const requestDeleteCoordLog = (id) => {
        setConfirmDialog({ isOpen: true, title: 'Xóa nhiệm vụ phối hợp?', message: 'Bạn có chắc chắn muốn xóa bản ghi này?', onConfirm: () => { setCoordLogs(coordLogs.filter(l => l.id !== id)); showToast('Đã xóa thành công!'); } });
    };

    const saveSchedule = (scheduleData, editId = null) => {
        if (editId) { setSchedules(schedules.map(s => s.id === editId ? { ...s, ...scheduleData } : s)); showToast('Đã cập nhật kế hoạch công tác!'); }
        else { setSchedules([...schedules, { id: generateId(), createdAt: new Date().toISOString(), ...scheduleData }]); showToast('Đã thêm kế hoạch công tác mới!'); }
    };
    const saveScheduleRange = (dates, scheduleData, editId = null) => {
        const createdAt = new Date().toISOString();
        if (editId) {
            // Sửa: giữ bản ghi gốc (ngày đầu), các ngày còn lại được nhân bản thêm
            const [firstDate, ...restDates] = dates;
            const newItems = restDates.map(date => ({ id: generateId(), createdAt, ...scheduleData, id: generateId(), date }));
            setSchedules([...schedules.map(s => s.id === editId ? { ...s, ...scheduleData, date: firstDate } : s), ...newItems]);
            showToast(`Đã cập nhật kế hoạch và thêm cho ${newItems.length} ngày khác!`);
            return;
        }
        const newItems = dates.map(date => ({ id: generateId(), createdAt, ...scheduleData, date }));
        setSchedules([...schedules, ...newItems]);
        showToast(`Đã thêm kế hoạch công tác cho ${newItems.length} ngày!`);
    };
    const requestDeleteSchedule = (id) => {
        setConfirmDialog({ isOpen: true, title: 'Xóa kế hoạch?', message: 'Bạn có chắc chắn muốn xóa mục kế hoạch này?', onConfirm: () => { setSchedules(schedules.filter(s => s.id !== id)); showToast('Đã xóa thành công!'); } });
    };

    const saveMeeting = (data, editId = null) => {
        if (editId) { setMeetings(meetings.map(m => m.id === editId ? { ...m, ...data } : m)); showToast('Đã cập nhật thông tin cuộc họp!'); }
        else { setMeetings([{ id: generateId(), createdAt: new Date().toISOString(), ...data }, ...meetings]); showToast('Đã thêm cuộc họp mới!'); }
    };
    const requestDeleteMeeting = (id) => {
        setConfirmDialog({ isOpen: true, title: 'Xóa cuộc họp?', message: 'Bạn có chắc chắn muốn xóa bản ghi cuộc họp này?', onConfirm: () => { setMeetings(meetings.filter(m => m.id !== id)); showToast('Đã xóa thành công!'); } });
    };

    // Gộp bản sao lưu vào dữ liệu hiện có theo id thay vì ghi đè — mục chưa có trong bản sao lưu vẫn được giữ lại.
    // Trả về thống kê cho danh sách hồ sơ.
    const mergeBackupData = (data) => {
        const d = mergeById(dossiers, data.dossiers, ['relatedDocs', 'tasks']);
        if (data.dossiers) setDossiers(d.items);
        // DNIS, Mail, Phối hợp, Cuộc họp hiển thị theo thứ tự lưu (mới nhất ở đầu) nên mục mới phải chèn lên đầu.
        const dn = mergeById(dnisLogs, data.dnisLogs, [], { prepend: true });
        if (data.dnisLogs) setDnisLogs(dn.items);
        if (data.mailLogs) setMailLogs(mergeById(mailLogs, data.mailLogs, [], { prepend: true }).items);
        if (data.coordLogs) setCoordLogs(mergeById(coordLogs, data.coordLogs, [], { prepend: true }).items);
        if (data.schedules) setSchedules(mergeById(schedules, data.schedules).items);
        if (data.meetings) setMeetings(mergeById(meetings, data.meetings, [], { prepend: true }).items);
        return { ...d, dnisAdded: dn.added, dnisInBackup: Array.isArray(data.dnisLogs) ? data.dnisLogs.length : 0 };
    };

    const handleDriveUpload = () => {
        loginAndSync(async () => {
            setIsDriveSyncing(true);
            try {
                const payload = { dossiers, dnisLogs, mailLogs, coordLogs, schedules, meetings, version: 2 };
                await uploadToDrive(payload);
                showToast('✅ Đã lưu dữ liệu lên Google Drive!');
            } catch(e) {
                showToast('Lỗi: ' + e.message);
            } finally {
                setIsDriveSyncing(false);
            }
        });
    };

    const handleDriveDownload = () => {
        loginAndSync(async () => {
            setIsDriveSyncing(true);
            try {
                const data = await downloadFromDrive();
                if (data) {
                    const r = mergeBackupData(data);
                    showToast(`✅ Đã gộp dữ liệu từ Google Drive — Hồ sơ: thêm ${r.added}, cập nhật ${r.updated}. DNIS: thêm ${r.dnisAdded} (Drive có ${r.dnisInBackup}).`);
                } else {
                    showToast('Không tìm thấy bản sao lưu nào trên Drive.');
                }
            } catch(e) {
                showToast('Lỗi: ' + e.message);
            } finally {
                setIsDriveSyncing(false);
            }
        });
    };

    const handleBackup = () => {
        const payload = { dossiers, dnisLogs, mailLogs, coordLogs, schedules, meetings, version: 2 };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload));
        const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", `Backup_QLCV_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
    };

    const handleImportDossier = (event) => {
        const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.type === 'import_dossiers' && Array.isArray(data.dossiers) && data.dossiers.length > 0) {
                    const existingIds = new Set(dossiers.map(d => d.id));
                    const newDossiers = data.dossiers.map(d => ({
                        status: 'active', relatedDocs: [], tasks: [], finalResult: '',
                        ...d,
                        id: existingIds.has(d.id) ? generateId() : d.id,
                    }));
                    setDossiers(prev => [...prev, ...newDossiers]);
                    showToast(`✅ Đã thêm ${newDossiers.length} hồ sơ mới vào hệ thống!`);
                } else {
                    showToast('File không đúng định dạng import. Vui lòng dùng file template.');
                }
            } catch (err) { showToast("Lỗi đọc file: " + err.message); }
        };
        reader.readAsText(file); event.target.value = '';
    };

    const handleRestore = (event) => {
        const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.version && data.dossiers) {
                    const r = mergeBackupData(data);
                    showToast(`Phục hồi thành công — Hồ sơ: thêm ${r.added}, cập nhật ${r.updated}. DNIS: thêm ${r.dnisAdded} (file có ${r.dnisInBackup}).`);
                }
                else if (Array.isArray(data)) {
                    const r = mergeBackupData({ dossiers: data });
                    showToast(`Phục hồi hồ sơ (bản cũ): thêm ${r.added}, cập nhật ${r.updated}, giữ nguyên ${r.kept} hồ sơ hiện có.`);
                }
                else showToast("File không đúng định dạng!");
            } catch (err) { showToast("Lỗi đọc file: " + err.message); }
        };
        reader.readAsText(file); event.target.value = '';
    };

    const exportToExcel = () => {
        let stt = 0;
        const vanBanData = [];
        dossiers.forEach(d => {
            // Dòng VB gốc (VB chỉ đạo)
            stt++;
            vanBanData.push({
                "STT": stt,
                "Tên Hồ sơ": d.title,
                "Phân loại": "VB chỉ đạo",
                "Số Ký hiệu VB": d.originalDoc.number || '',
                "Ngày phát hành": d.originalDoc.date ? d.originalDoc.date.split('-').reverse().join('/') : '',
                "Đơn vị phát hành": d.originalDoc.sender || '',
                "Trích yếu": d.originalDoc.summary || d.originalDoc.content || '',
                "Ghi chú": '',
            });
            // Các VB liên quan (chỉ type='document')
            (d.relatedDocs || []).filter(rd => rd.type === 'document').forEach(rd => {
                stt++;
                vanBanData.push({
                    "STT": stt,
                    "Tên Hồ sơ": d.title,
                    "Phân loại": rd.docType || 'Văn bản đính kèm',
                    "Số Ký hiệu VB": rd.number || '',
                    "Ngày phát hành": rd.date ? rd.date.split('-').reverse().join('/') : '',
                    "Đơn vị phát hành": rd.sender || '',
                    "Trích yếu": rd.content || '',
                    "Ghi chú": rd.note || '',
                });
            });
        });

        let coordData = coordLogs.map(c => ({
            "Ngày giao việc": c.assignedDate ? c.assignedDate.split('-').reverse().join('/') : '',
            "Số/Ký hiệu VB": c.docNumber, "Ngày VB": c.docDate ? c.docDate.split('-').reverse().join('/') : '',
            "Trích yếu": c.summary, "Nội dung chỉ đạo": c.content, "Tiến độ thực hiện": c.progress, "Trạng thái": c.status
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vanBanData), "DanhSachVanBan");
        if (coordData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(coordData), "NhiemVuPhoiHop");
        XLSX.writeFile(wb, `BaoCao_HoSoCongViec_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Xuất 1 hồ sơ ra file Excel theo đúng cấu trúc Mau_Nhap_Ho_So.xlsx (sheet "Danh_Muc_Ho_So", 13 cột)
    const HO_SO_EXPORT_HEADERS = [
        "STT", "Tên thư mục hồ sơ", "Tiêu đề công việc", "Lĩnh vực", "Trạng thái",
        "Số hiệu VB đến", "Ngày VB đến", "Nơi gửi", "Trích yếu VB đến",
        "Kết quả xử lý / VB tham mưu", "Ngày tạo hồ sơ", "Hạn xử lý", "Ghi chú",
    ];
    const exportDossierToExcel = (d) => {
        const toYMD = (iso) => iso ? getLocalDateTimeString(iso).slice(0, 10) : '';
        const row = {
            "STT": 1,
            "Tên thư mục hồ sơ": d.folderPath || '',
            "Tiêu đề công việc": d.title || '',
            "Lĩnh vực": d.category || '',
            "Trạng thái": d.status === 'archived' ? 'Đã hoàn thành' : 'Đang xử lý',
            "Số hiệu VB đến": d.originalDoc?.number || '',
            "Ngày VB đến": d.originalDoc?.date || '',
            "Nơi gửi": d.originalDoc?.sender || '',
            "Trích yếu VB đến": d.originalDoc?.summary || '',
            "Kết quả xử lý / VB tham mưu": d.finalResult || '',
            "Ngày tạo hồ sơ": toYMD(d.createdAt),
            "Hạn xử lý": d.deadline || '',
            "Ghi chú": d.originalDoc?.content || '',
        };

        const ws = XLSX.utils.json_to_sheet([row], { header: HO_SO_EXPORT_HEADERS });
        ws['!cols'] = [4, 30, 36, 22, 14, 20, 14, 24, 36, 36, 14, 14, 36].map(wch => ({ wch }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh_Muc_Ho_So");

        const safeName = (d.folderPath || d.title || 'HoSo').toString().trim().replace(/[\\/:*?"<>|]/g, '_');
        XLSX.writeFile(wb, `HoSo_${safeName}.xlsx`);
    };

    // Xuất 1 hồ sơ ra file JSON (dùng lại được với chức năng "Import hồ sơ từ file")
    const exportDossierToJson = (d) => {
        const payload = { type: 'import_dossiers', dossiers: [d] };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
        const safeName = (d.folderPath || d.title || 'HoSo').toString().trim().replace(/[\\/:*?"<>|]/g, '_');
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `HoSo_${safeName}.json`);
        document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
    };

    const activeDossier = dossiers.find(d => d.id === activeDossierId);
    const filteredDossiers = useMemo(() => {
        let filtered = [...dossiers];
        if (searchQuery) {
            const lowerQ = searchQuery.toLowerCase();
            filtered = filtered.filter(d => d.title.toLowerCase().includes(lowerQ) || d.originalDoc.number.toLowerCase().includes(lowerQ) || (d.category && d.category.toLowerCase().includes(lowerQ)) || d.relatedDocs.some(rd => (rd.number && rd.number.toLowerCase().includes(lowerQ)) || rd.content.toLowerCase().includes(lowerQ)));
        }
        const priorityWeight = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };
        return filtered.sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1; if (a.status !== 'active' && b.status === 'active') return 1;
            // Hồ sơ đã hoàn thành: chỉ sắp theo ngày tạo, mới nhất ở trên
            if (a.status !== 'active') return new Date(b.createdAt) - new Date(a.createdAt);
            const weightA = priorityWeight[a.priority || 'Trung bình'] || 0; const weightB = priorityWeight[b.priority || 'Trung bình'] || 0; if (weightA !== weightB) return weightB - weightA;
            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline); if (a.deadline) return -1; if (b.deadline) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [dossiers, searchQuery]);

    const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    // Focus mode screen
    if (focusMode) {
        const taskName = timerState.activeTaskName || 'Tự do tập trung';
        const parentTitle = timerState.isFree ? 'POMODORO TỰ DO' : (activeDossier?.title || 'TẬP TRUNG');
        const progressPct = ((timerState.initialDuration - timerState.timeLeft) / timerState.initialDuration) * 100;
        const pomosCount = timerState.isFree ? 0 : (activeDossier?.tasks.find(t => t.id === timerState.activeTaskId)?.pomodoros || 0);
        const ringColor = timerState.mode === 'work' ? '#3b82f6' : '#10b981';

        return (
            <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative transition-colors duration-500 ${focusDark ? 'bg-gray-950' : 'bg-slate-50'}`}>
                <div className="absolute top-6 right-6 flex items-center gap-2">
                    <button onClick={() => setFocusDark(!focusDark)} title={focusDark ? 'Chuyển chế độ sáng' : 'Chuyển chế độ tối'} className={`flex items-center justify-center w-10 h-10 rounded-lg shadow-sm border transition-colors ${focusDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-yellow-300 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'}`}>
                        {focusDark ? <IconSun /> : <IconMoon />}
                    </button>
                    <button onClick={() => setFocusMode(false)} className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm border transition-colors text-sm font-medium ${focusDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'}`}>
                        <IconMinimize /> Thoát
                    </button>
                </div>

                <div className="text-center max-w-xl w-full">
                    <p className={`text-xs font-bold tracking-widest uppercase mb-3 ${focusDark ? 'text-slate-600' : 'text-slate-400'}`}>{parentTitle}</p>
                    <h1 className={`text-2xl md:text-3xl font-bold mb-10 leading-snug ${focusDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        <span className={focusDark ? 'text-slate-500' : 'text-slate-400'}>Đang làm: </span>
                        <span style={{color: ringColor}}>{taskName}</span>
                    </h1>

                    <div className="relative w-72 h-72 mx-auto mb-10 flex items-center justify-center">
                        {focusDark && (
                            <div className="absolute inset-0 rounded-full pointer-events-none" style={{background: `radial-gradient(circle, ${ringColor}18 0%, transparent 68%)`}}></div>
                        )}
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="44" fill="none" stroke={focusDark ? '#1e293b' : '#e2e8f0'} strokeWidth="6" />
                            <circle cx="50" cy="50" r="44" fill="none" stroke={ringColor} strokeWidth="6"
                                strokeDasharray={`${progressPct * 2.76} 276`} strokeLinecap="round"
                                className="transition-all duration-1000 ease-linear"
                                style={focusDark ? {filter: `drop-shadow(0 0 5px ${ringColor})`} : {}}
                            />
                        </svg>
                        <div className={`text-6xl font-light tracking-tighter z-10 ${focusDark ? 'text-white' : 'text-slate-800'}`}>{formatTime(timerState.timeLeft)}</div>
                        <div className="absolute bottom-10 left-0 right-0 text-center text-xs font-bold tracking-widest z-10" style={{color: ringColor}}>
                            {timerState.mode === 'work' ? 'LÀM VIỆC' : 'NGHỈ NGƠI'}
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <button onClick={() => toggleTimer()} className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95 ${timerState.isRunning ? 'bg-rose-500 shadow-rose-500/30' : 'bg-brand-600 shadow-brand-500/40'}`}>
                            {timerState.isRunning ? <IconSquare /> : <IconPlay />}
                        </button>
                    </div>

                    {!timerState.isFree && (
                        <div className={`mt-10 flex justify-center items-center gap-2 text-sm ${focusDark ? 'text-slate-600' : 'text-slate-400'}`}>
                            <span>Pomodoro hoàn thành:</span>
                            <span className="flex items-center gap-1.5 font-bold" style={{color: ringColor}}>
                                <span className="w-2 h-2 rounded-full inline-block" style={{background: ringColor}}></span> {pomosCount}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex shrink-0 z-10">
                <div className="p-4 border-b border-slate-100">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-emerald-500 flex items-center gap-2"><IconCheckCircle /> QLCV của Lý</h1>
                </div>
                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="space-y-1 mb-8">
                        <button onClick={() => setCurrentView('workspace')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${currentView === 'workspace' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}><IconFolder /> Bàn làm việc</button>
                        <button onClick={() => setCurrentView('archive')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${currentView === 'archive' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}><IconArchive /> Kho Hồ sơ</button>
                        <button onClick={() => setCurrentView('dnis')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${currentView === 'dnis' ? 'bg-fuchsia-50 text-fuchsia-700' : 'text-slate-600 hover:bg-slate-50'}`}><IconDatabase /> Chuyên đề DNIS</button>
                        <button onClick={() => setCurrentView('mail')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${currentView === 'mail' ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-50'}`}><IconMail /> Mail Công vụ</button>
                        <button onClick={() => setCurrentView('coordinations')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${currentView === 'coordinations' ? 'bg-orange-50 text-orange-700' : 'text-slate-600 hover:bg-slate-50'}`}><IconBriefcase /> Nhiệm vụ phối hợp</button>
                        <button onClick={() => setCurrentView('meetings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${currentView === 'meetings' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}><IconUsers /> Sổ tay Cuộc họp</button>
                        <button onClick={() => setCurrentView('planner')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${currentView === 'planner' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><IconCalendar /> Sổ kế hoạch tuần</button>
                    </div>
                    <div className="mb-4 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <span>Hồ sơ đang xử lý</span>
                        <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full border">{dossiers.filter(d=>d.status==='active').length}</span>
                    </div>
                    <div className="space-y-1">
                        {dossiers.filter(d=>d.status==='active').sort((a, b) => {
                            const pWeight = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };
                            const wA = pWeight[a.priority || 'Trung bình'] || 0;
                            const wB = pWeight[b.priority || 'Trung bình'] || 0;
                            if (wA !== wB) return wB - wA;
                            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
                            if (a.deadline) return -1; if (b.deadline) return 1;
                            return new Date(b.createdAt) - new Date(a.createdAt);
                        }).map(d => (
                            <div key={d.id} className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${activeDossierId === d.id && currentView === 'workspace' ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-2 overflow-hidden flex-1" onClick={() => { setActiveDossierId(d.id); setCurrentView('workspace'); }} title={d.title}>
                                    <span className={`w-2 h-2 rounded-full ${(CATEGORY_COLORS[d.category] || CATEGORY_COLORS['KHÁC']).solid} shrink-0`}></span>
                                    <span className="truncate text-left flex items-center gap-1.5">{d.priority === 'Cao' && <span title="Ưu tiên cao" className="text-[10px] shrink-0">🔴</span>} {d.title}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setEditDossierConfig({isOpen:true, data:d}); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-brand-600 shrink-0"><IconEdit className="w-3.5 h-3.5"/></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
                    <div className="flex gap-2">
                        <button onClick={() => requirePassword(handleDriveUpload)} disabled={isDriveSyncing} className={`flex-1 py-2 rounded-lg text-xs font-medium shadow-sm transition-colors border ${isDriveSyncing ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700'}`}>{isDriveSyncing ? '⏳ Đang xử lý...' : '☁️ Lưu lên Drive'}</button>
                        <button onClick={handleDriveDownload} disabled={isDriveSyncing} className={`flex-1 py-2 rounded-lg text-xs font-medium shadow-sm transition-colors border ${isDriveSyncing ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700'}`}>{isDriveSyncing ? '⏳ Đang xử lý...' : '⬇️ Tải từ Drive'}</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => requirePassword(handleBackup)} className="flex-1 flex justify-center items-center gap-2 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium shadow-sm"><IconSave className="w-4 h-4"/> Sao lưu</button>
                        <label className="flex-1 flex justify-center items-center gap-2 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium shadow-sm cursor-pointer"><IconUpload className="w-4 h-4"/> Phục hồi<input type="file" accept=".json" onChange={(e) => requirePassword(() => handleRestore(e))} className="hidden" /></label>
                    </div>
                    <label className="w-full flex justify-center items-center gap-2 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium shadow-sm cursor-pointer" title="Thêm hồ sơ mới từ file JSON mà không xóa dữ liệu hiện tại"><IconPlus className="w-4 h-4"/> Import hồ sơ từ file<input type="file" accept=".json" onChange={(e) => requirePassword(() => handleImportDossier(e))} className="hidden" /></label>
                    <button onClick={() => setIsCreateModalOpen(true)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium shadow-md shadow-brand-500/20"><IconPlus /> Tạo Hồ sơ mới</button>
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header */}
                <div className="md:hidden p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold text-brand-600 flex items-center gap-1.5"><IconCheckCircle /> QLCV</h1>
                        <button onClick={() => setIsSyncModalOpen(true)} className="p-1.5 text-slate-500 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded border border-slate-200" title="Đồng bộ & Sao lưu"><IconSave className="w-4 h-4"/></button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        <button onClick={() => setCurrentView('workspace')} className={`p-2 rounded shrink-0 ${currentView==='workspace'?'bg-slate-100 text-slate-900':'text-slate-500'}`}><IconFolder/></button>
                        <button onClick={() => setCurrentView('archive')} className={`p-2 rounded shrink-0 ${currentView==='archive'?'bg-slate-100 text-slate-900':'text-slate-500'}`}><IconArchive/></button>
                        <button onClick={() => setCurrentView('dnis')} className={`p-2 rounded shrink-0 ${currentView==='dnis'?'bg-fuchsia-100 text-fuchsia-700':'text-slate-500'}`}><IconDatabase/></button>
                        <button onClick={() => setCurrentView('mail')} className={`p-2 rounded shrink-0 ${currentView==='mail'?'bg-cyan-100 text-cyan-700':'text-slate-500'}`}><IconMail/></button>
                        <button onClick={() => setCurrentView('coordinations')} className={`p-2 rounded shrink-0 ${currentView==='coordinations'?'bg-orange-100 text-orange-700':'text-slate-500'}`}><IconBriefcase/></button>
                        <button onClick={() => setCurrentView('meetings')} className={`p-2 rounded shrink-0 ${currentView==='meetings'?'bg-teal-100 text-teal-700':'text-slate-500'}`}><IconUsers/></button>
                        <button onClick={() => setCurrentView('planner')} className={`p-2 rounded shrink-0 ${currentView==='planner'?'bg-indigo-100 text-indigo-700':'text-slate-500'}`}><IconCalendar/></button>
                    </div>
                </div>

                {timerState.isRunning && !focusMode && (
                    <div className="bg-brand-600 text-white px-4 py-2 flex items-center justify-between shadow-md z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span></span>
                            <span className="font-medium text-sm">
                                {timerState.mode === 'work' ? 'Đang Focus: ' : 'Nghỉ ngơi: '}
                                <span className="font-bold ml-1 mr-1">{timerState.activeTaskName}</span>
                                ({formatTime(timerState.timeLeft)})
                            </span>
                        </div>
                        <button onClick={() => setFocusMode(true)} className="text-xs bg-black/20 hover:bg-black/40 px-3 py-1 rounded flex items-center gap-1"><IconMaximize /> Mở rộng</button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    {currentView === 'workspace' && (
                        <WorkspaceView
                            dossiers={dossiers}
                            activeDossier={activeDossier}
                            setActiveDossierId={setActiveDossierId}
                            setIsCreateModalOpen={setIsCreateModalOpen}
                            setEditDossierConfig={setEditDossierConfig}
                            setDocModalConfig={setDocModalConfig}
                            setCurrentView={setCurrentView}
                            freePomoConfig={freePomoConfig}
                            setFreePomoConfig={setFreePomoConfig}
                            startFreeTimer={startFreeTimer}
                            timerState={timerState}
                            taskDurations={taskDurations}
                            setTaskDurations={setTaskDurations}
                            toggleTimer={toggleTimer}
                            setFocusMode={setFocusMode}
                            newTaskTitle={newTaskTitle}
                            setNewTaskTitle={setNewTaskTitle}
                            addTask={addTask}
                            toggleTaskComplete={toggleTaskComplete}
                        />
                    )}

                    {currentView === 'archive' && (
                        <ArchiveView
                            filteredDossiers={filteredDossiers}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            setActiveDossierId={setActiveDossierId}
                            setCurrentView={setCurrentView}
                            exportToExcel={exportToExcel}
                            requestDeleteDossier={requestDeleteDossier}
                        />
                    )}

                    {currentView === 'dnis' && (
                        <DnisView
                            dnisLogs={dnisLogs}
                            meetings={meetings}
                            dossiers={dossiers}
                            setDnisLogModalConfig={setDnisLogModalConfig}
                            requestDeleteDnisLog={requestDeleteDnisLog}
                            setActiveDossierId={setActiveDossierId}
                            setCurrentView={setCurrentView}
                            setIsCreateModalOpen={setIsCreateModalOpen}
                        />
                    )}

                    {currentView === 'mail' && (
                        <MailView
                            mailLogs={mailLogs}
                            dossiers={dossiers}
                            setMailLogModalConfig={setMailLogModalConfig}
                            requestDeleteMailLog={requestDeleteMailLog}
                            setActiveDossierId={setActiveDossierId}
                            setCurrentView={setCurrentView}
                            setIsCreateModalOpen={setIsCreateModalOpen}
                        />
                    )}

                    {currentView === 'coordinations' && (
                        <CoordinationsView
                            coordLogs={coordLogs}
                            setCoordLogModalConfig={setCoordLogModalConfig}
                            requestDeleteCoordLog={requestDeleteCoordLog}
                        />
                    )}

                    {currentView === 'meetings' && (
                        <MeetingsView
                            meetings={meetings}
                            setMeetingModalConfig={setMeetingModalConfig}
                            requestDeleteMeeting={requestDeleteMeeting}
                        />
                    )}

                    {currentView === 'planner' && (
                        <PlannerView
                            currentWeekStart={currentWeekStart}
                            setCurrentWeekStart={setCurrentWeekStart}
                            schedules={schedules}
                            dossiers={dossiers}
                            dnisLogs={dnisLogs}
                            mailLogs={mailLogs}
                            coordLogs={coordLogs}
                            meetings={meetings}
                            setScheduleModalConfig={setScheduleModalConfig}
                            requestDeleteSchedule={requestDeleteSchedule}
                        />
                    )}

                    {currentView === 'detail' && activeDossier && (
                        <DetailView
                            activeDossier={activeDossier}
                            setCurrentView={setCurrentView}
                            setEditDossierConfig={setEditDossierConfig}
                            setDocModalConfig={setDocModalConfig}
                            requestDeleteRelatedDoc={requestDeleteRelatedDoc}
                            updateFinalResult={updateFinalResult}
                            reopenDossier={reopenDossier}
                            exportDossierToExcel={exportDossierToExcel}
                            exportDossierToJson={exportDossierToJson}
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Đồng bộ & Sao lưu dữ liệu">
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h3 className="font-bold text-blue-800 mb-2">Đồng bộ Google Drive</h3>
                        <p className="text-xs text-blue-600 mb-4">Lưu hoặc tải dữ liệu từ Google Drive để đồng bộ giữa các thiết bị.</p>
                        <div className="flex gap-2">
                            <button onClick={() => { setIsSyncModalOpen(false); requirePassword(handleDriveUpload); }} disabled={isDriveSyncing} className={`flex-1 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors border ${isDriveSyncing ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white border-blue-200 hover:bg-blue-100 text-blue-700'}`}>{isDriveSyncing ? '⏳ Đang xử lý...' : '☁️ Lưu lên Drive'}</button>
                            <button onClick={() => { setIsSyncModalOpen(false); handleDriveDownload(); }} disabled={isDriveSyncing} className={`flex-1 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors border ${isDriveSyncing ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700'}`}>{isDriveSyncing ? '⏳ Đang xử lý...' : '⬇️ Tải từ Drive'}</button>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-2">Sao lưu thủ công</h3>
                        <p className="text-xs text-slate-500 mb-4">Tải file dữ liệu về máy hoặc phục hồi từ file có sẵn.</p>
                        <div className="flex gap-2 mb-3">
                            <button onClick={() => { setIsSyncModalOpen(false); requirePassword(handleBackup); }} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm"><IconSave className="w-4 h-4"/> Sao lưu</button>
                            <label className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium shadow-sm cursor-pointer"><IconUpload className="w-4 h-4"/> Phục hồi<input type="file" accept=".json" onChange={(e) => { setIsSyncModalOpen(false); requirePassword(() => handleRestore(e)); }} className="hidden" /></label>
                        </div>
                        <label className="w-full flex justify-center items-center gap-2 py-2.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium shadow-sm cursor-pointer"><IconPlus className="w-4 h-4"/> Import hồ sơ từ file (không xóa dữ liệu cũ)<input type="file" accept=".json" onChange={(e) => { setIsSyncModalOpen(false); requirePassword(() => handleImportDossier(e)); }} className="hidden" /></label>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Tạo Hồ Sơ Công Việc Mới">
                <DossierForm onClose={() => setIsCreateModalOpen(false)} saveDossier={saveDossier} />
            </Modal>

            <Modal isOpen={editDossierConfig.isOpen} onClose={() => setEditDossierConfig({isOpen: false, data: null})} title="Chỉnh sửa Thông tin Hồ Sơ">
                {editDossierConfig.data && <DossierForm initialData={editDossierConfig.data} onClose={() => setEditDossierConfig({isOpen: false, data: null})} saveDossier={saveDossier} />}
            </Modal>

            <Modal isOpen={docModalConfig.isOpen} onClose={() => setDocModalConfig({isOpen: false, data: null})} title={docModalConfig.data ? "Sửa Nội Dung Xử Lý" : "Cập Nhật Nội Dung Xử Lý"}>
                <AddDocForm
                    dossierId={docModalConfig.dossierId || activeDossier?.id}
                    initialData={docModalConfig.data}
                    isArchived={false}
                    onClose={() => setDocModalConfig({isOpen: false, data: null})}
                    saveRelatedDoc={saveRelatedDoc}
                    updateFinalResult={updateFinalResult}
                    setActiveDossierId={setActiveDossierId}
                />
            </Modal>

            <Modal isOpen={dnisLogModalConfig.isOpen} onClose={() => setDnisLogModalConfig({isOpen: false, data: null})} title={dnisLogModalConfig.data ? "Cập nhật Nhật ký DNIS" : "Thêm Nhật ký DNIS mới"} maxWidth="max-w-2xl">
                <DnisLogForm initialData={dnisLogModalConfig.data} onClose={() => setDnisLogModalConfig({isOpen: false, data: null})} saveDnisLog={saveDnisLog} />
            </Modal>

            <Modal isOpen={mailLogModalConfig.isOpen} onClose={() => setMailLogModalConfig({isOpen: false, data: null})} title={mailLogModalConfig.data ? "Cập nhật Yêu cầu Mail" : "Thêm Yêu cầu Mail mới"} maxWidth="max-w-2xl">
                <MailLogForm initialData={mailLogModalConfig.data} onClose={() => setMailLogModalConfig({isOpen: false, data: null})} saveMailLog={saveMailLog} />
            </Modal>

            <Modal isOpen={coordLogModalConfig.isOpen} onClose={() => setCoordLogModalConfig({isOpen: false, data: null})} title={coordLogModalConfig.data ? "Cập nhật Nhiệm vụ Phối hợp" : "Thêm Nhiệm vụ Phối hợp mới"} maxWidth="max-w-2xl">
                <CoordLogForm initialData={coordLogModalConfig.data} onClose={() => setCoordLogModalConfig({isOpen: false, data: null})} saveCoordLog={saveCoordLog} />
            </Modal>

            <Modal isOpen={scheduleModalConfig.isOpen} onClose={() => setScheduleModalConfig({isOpen: false, data: null, targetDate: ''})} title={scheduleModalConfig.data ? "Sửa Kế Hoạch Công Tác" : "Thêm Kế Hoạch Công Tác"}>
                <ScheduleForm initialData={scheduleModalConfig.data} targetDate={scheduleModalConfig.targetDate} onClose={() => setScheduleModalConfig({isOpen: false, data: null, targetDate: ''})} saveSchedule={saveSchedule} saveScheduleRange={saveScheduleRange} />
            </Modal>

            <Modal isOpen={meetingModalConfig.isOpen} onClose={() => setMeetingModalConfig({isOpen: false, data: null})} title={meetingModalConfig.data ? "Cập nhật Cuộc họp" : "Thêm Cuộc họp mới"} maxWidth="max-w-2xl">
                <MeetingForm initialData={meetingModalConfig.data} onClose={() => setMeetingModalConfig({isOpen: false, data: null})} saveMeeting={saveMeeting} />
            </Modal>

            {/* Custom Confirm Dialog */}
            {confirmDialog.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{confirmDialog.title}</h3>
                        <p className="text-slate-600 mb-6 text-sm">{confirmDialog.message}</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setConfirmDialog({isOpen: false})} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">Hủy</button>
                            <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({isOpen: false}); }} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-colors shadow-md shadow-rose-500/20">Đồng ý</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Gate Dialog */}
            {passwordGate.isOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Yêu cầu mật khẩu</h3>
                        <p className="text-slate-600 mb-4 text-sm">Vui lòng nhập mật khẩu để tiếp tục thao tác này.</p>
                        <input
                            type="password"
                            autoFocus
                            value={passwordGate.value}
                            onChange={(e) => setPasswordGate(prev => ({ ...prev, value: e.target.value, error: '' }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') confirmPasswordGate(); if (e.key === 'Escape') cancelPasswordGate(); }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder="Nhập mật khẩu"
                        />
                        {passwordGate.error && <p className="text-rose-600 text-xs mt-2">{passwordGate.error}</p>}
                        <div className="flex gap-3 justify-center mt-5">
                            <button onClick={cancelPasswordGate} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">Hủy</button>
                            <button onClick={confirmPasswordGate} className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors shadow-md shadow-brand-500/20">Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMsg && (
                <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-5 py-3 rounded-lg shadow-xl z-[70] flex items-center gap-3 animate-[slideIn_0.2s_ease-out]">
                    <IconCheckCircle className="text-emerald-400 w-5 h-5"/>
                    <span className="font-medium text-sm">{toastMsg}</span>
                </div>
            )}
        </div>
    );
};

export default App;
