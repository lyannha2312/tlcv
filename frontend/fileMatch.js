// Gắn file trong thư mục hồ sơ (Văn bản chỉ đạo / Phụ lục / Văn bản triển khai / Báo cáo...) vào từng mốc của timeline.
// Dữ liệu hồ sơ không lưu liên kết file ↔ mốc, nên ghép theo thứ tự ưu tiên:
//   1. tên file (hoặc đường dẫn file) khai trong mốc trùng tên file trong thư mục;
//   2. số ký hiệu văn bản (205/PV01 ↔ 205-PV01_2026-06-01_....pdf);
//   3. file còn lại trong "Văn bản chỉ đạo" gắn vào mốc khởi tạo hồ sơ.
// File không ghép được vào mốc nào sẽ nằm ở mục "chưa gắn vào tiến trình".

const strip = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
const slug = (s) => strip(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const baseName = (p) => (p || '').split(/[\\/]/).pop();
const dropExt = (n) => n.replace(/\.[^.]+$/, '');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const flattenFiles = (categories) =>
    Object.entries(categories || {}).flatMap(([category, list]) =>
        list.map(f => ({ ...f, category, key: `${category}/${f.fileName}` })));

export const attachFiles = (events, categories) => {
    const files = flattenFiles(categories);
    const taken = new Set();
    const byIndex = events.map(() => []);
    const claim = (i, pred) => files.forEach(f => {
        if (!taken.has(f.key) && pred(f)) { taken.add(f.key); byIndex[i].push(f); }
    });

    events.forEach((evt, i) => {
        const names = [evt.rawData?.fileName, baseName(evt.rawData?.filePath)].filter(Boolean).map(n => slug(dropExt(n)));
        if (names.length) claim(i, f => names.includes(slug(dropExt(f.fileName))));
    });

    events.forEach((evt, i) => {
        const token = slug(evt.number);
        if (token.length < 4) return;
        const re = new RegExp(`(^|-)${escapeRe(token)}(-|$)`);
        claim(i, f => re.test(slug(dropExt(f.fileName))));
    });

    const initIndex = events.findIndex(e => e.type === 'init');
    if (initIndex >= 0) claim(initIndex, f => f.category === 'Văn bản chỉ đạo');

    byIndex.forEach(list => list.sort((a, b) => a.fileName.localeCompare(b.fileName, 'vi', { numeric: true })));
    return { byIndex, unassigned: files.filter(f => !taken.has(f.key)) };
};
