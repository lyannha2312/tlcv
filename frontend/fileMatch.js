// Gắn file trong thư mục hồ sơ vào từng mốc của timeline.
// Dữ liệu hồ sơ không lưu liên kết file ↔ mốc, nên ghép theo thứ tự ưu tiên:
//   1. tên file (hoặc đường dẫn file) khai trong mốc trùng tên file trong thư mục;
//   2. số ký hiệu văn bản (205/PV01 ↔ 205-PV01_2026-06-01_....pdf; phụ lục "..._PhuLuc01" cũng khớp theo số);
//   3. vai trò của thư mục, cho các file còn lại:
//        1_Chỉ đạo + 2_Phụ lục   → mốc Khởi tạo (văn bản đến và phụ lục của nó);
//        4_Triển khai            → mốc văn bản do đơn vị mình ban hành gần nhất (hoặc mốc Kết thúc);
//        3_Báo cáo đơn vị        → mốc "Lấy ý kiến" (nếu có), còn không thì hiện thành một nhóm riêng.
// Thư mục con khác (Xin ý kiến BTV, Khác...) là bản nháp/trao đổi: hiện thành nhóm riêng, không gắn vào mốc.

export const STAGE_CONSULT = 'lay-y-kien';
// Phân loại văn bản dành cho công văn gửi lấy ý kiến các đơn vị, địa phương (văn bản do mình ban hành).
export const DOC_TYPE_CONSULT = 'Lấy ý kiến';
// Mốc đánh dấu giai đoạn lấy ý kiến: văn bản có phân loại trên, hoặc mốc tiến độ được tích chọn giai đoạn lấy ý kiến.
export const isConsultRaw = (raw) => !!raw && (raw.docType === DOC_TYPE_CONSULT || raw.stage === STAGE_CONSULT);
// Tên thư mục con chuẩn của hồ sơ (khớp backend/app.py). Số đứng đầu để Explorer/Drive xếp đúng quy trình.
export const FOLDER_DIRECTIVE = '1_Chỉ đạo';
export const FOLDER_APPENDIX = '2_Phụ lục';
export const REPORTS_FOLDER = '3_Báo cáo đơn vị';
export const RESULT_FOLDER = '4_Triển khai';
export const FOLDER_DRAFT = '5_Bản nháp';
// Tên hiển thị: bỏ tiền tố số ("4_Triển khai" → "Triển khai").
export const folderLabel = (name) => (name || '').replace(/^\d+_/, '');
const INCOMING_FOLDERS = [FOLDER_DIRECTIVE, FOLDER_APPENDIX];
const STANDARD_FOLDERS = [...INCOMING_FOLDERS, RESULT_FOLDER, REPORTS_FOLDER];
const OWN_SENDERS = ['pv01', 'catp', 'ducatp', 'cat', 'pv01-tmth'];

const strip = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
export const slug = (s) => strip(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const baseName = (p) => (p || '').split(/[\\/]/).pop();
const dropExt = (n) => n.replace(/\.[^.]+$/, '');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Link web (Google Drive...) lưu trong ô "Đường dẫn file" của mốc.
export const isWebLink = (s) => /^https?:\/\//i.test((s || '').trim());
// Mở một file trên Google Drive bằng cách tìm theo tên (không cần biết mã file); dùng cho Word/Excel mà trình duyệt không đọc trực tiếp.
export const driveSearchUrl = (fileName) => `https://drive.google.com/drive/search?q=${encodeURIComponent(fileName)}`;

export const flattenFiles = (categories) =>
    Object.entries(categories || {}).flatMap(([category, list]) =>
        list.map(f => ({ ...f, category, key: `${category}/${f.fileName}` })));

// Tên file bỏ đuôi, bỏ số ký hiệu đứng đầu và hậu tố _signed: "4350-CATP-PV01_Ten_signed.pdf" và "CATP-PV01_Ten.docx" cùng một khóa.
const familyKey = (fileName) => slug(dropExt(fileName)).replace(/^\d+-/, '').replace(/-(signed|ky|da-ky)$/, '');

// Văn bản do đơn vị mình ban hành (kết quả công việc) — gồm cả mốc nhập là "Văn bản đính kèm" nhưng người gửi là PV01/CATP/ĐUCATP.
const isOutgoing = (evt) =>
    evt.type === 'result' || evt.rawData?.docType === DOC_TYPE_CONSULT || (evt.rawData?.type === 'document' && OWN_SENDERS.includes(slug(evt.rawData.sender)));

export const attachFiles = (events, categories) => {
    const files = flattenFiles(categories);
    const taken = new Set();
    const byIndex = events.map(() => []);
    const claim = (i, pred) => files.forEach(f => {
        if (!taken.has(f.key) && pred(f)) { taken.add(f.key); byIndex[i].push(f); }
    });

    events.forEach((evt, i) => {
        // filePath là link web thì không dùng để đoán tên file
        const pathName = isWebLink(evt.rawData?.filePath) ? '' : baseName(evt.rawData?.filePath);
        const names = [evt.rawData?.fileName, pathName].filter(Boolean).map(n => slug(dropExt(n)));
        if (names.length) claim(i, f => names.includes(slug(dropExt(f.fileName))));
    });

    events.forEach((evt, i) => {
        const token = slug(evt.number);
        if (token.length < 4) return;
        const re = new RegExp(`(^|-)${escapeRe(token)}(-|$)`);
        claim(i, f => re.test(slug(dropExt(f.fileName))));
    });

    // Bản nháp/bản Word của một văn bản đi cùng mốc với bản đã ký (tên giống nhau, chỉ khác số ký hiệu ở đầu và đuôi _signed).
    events.forEach((evt, i) => {
        if (!isOutgoing(evt)) return;
        const keys = new Set(byIndex[i].filter(f => f.category === RESULT_FOLDER).map(f => familyKey(f.fileName)).filter(k => k.length >= 8));
        if (keys.size) claim(i, f => f.category === RESULT_FOLDER && keys.has(familyKey(f.fileName)));
    });

    const initIndex = events.findIndex(e => e.type === 'init');
    if (initIndex >= 0) claim(initIndex, f => INCOMING_FOLDERS.includes(f.category));

    let resultIndex = -1;
    let results = 0; // số văn bản kết quả (không tính công văn lấy ý kiến)
    events.forEach((e, i) => { if (isOutgoing(e)) { resultIndex = i; if (!isConsultRaw(e.rawData)) results++; } });
    if (resultIndex < 0) resultIndex = events.findIndex(e => e.type === 'finish');
    // Từ hai văn bản kết quả trở lên thì không đoán file còn lại thuộc văn bản nào: để ở nhóm "chưa gắn vào tiến trình".
    if (resultIndex >= 0 && results < 2) claim(resultIndex, f => f.category === RESULT_FOLDER);

    const consultIndex = events.findIndex(e => isConsultRaw(e.rawData));
    if (consultIndex >= 0) claim(consultIndex, f => f.category === REPORTS_FOLDER);

    byIndex.forEach(list => list.sort((a, b) => a.fileName.localeCompare(b.fileName, 'vi', { numeric: true })));
    const left = files.filter(f => !taken.has(f.key));
    return {
        byIndex,
        unassigned: left.filter(f => STANDARD_FOLDERS.includes(f.category) && f.category !== REPORTS_FOLDER),
        reports: left.filter(f => f.category === REPORTS_FOLDER),
        others: left.filter(f => !STANDARD_FOLDERS.includes(f.category)),
    };
};
