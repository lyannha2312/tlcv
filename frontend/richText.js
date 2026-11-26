// Ghi chú của mốc xử lý: chữ thuần (cách cũ) hoặc HTML định dạng cơ bản (đậm, nghiêng, gạch chân, danh sách) khi sửa trong cửa sổ chi tiết.
// Chỉ giữ một số thẻ không có thuộc tính để nội dung từ file nhập / Drive không chèn được mã lạ.

const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'br', 'p', 'div']);
const TAG = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

const escapeText = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const hasMarkup = (s) => /<\s*\/?\s*(b|strong|i|em|u|ul|ol|li|br|p|div)\b/i.test(s || '');
export const isFormatted = (s) => /<\s*(b|strong|i|em|u|ul|ol|li)\b/i.test(s || '');

export const sanitizeHtml = (html) => {
    const noScripts = String(html || '').replace(/<\s*(script|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    let out = '', last = 0, m;
    TAG.lastIndex = 0;
    while ((m = TAG.exec(noScripts)) !== null) {
        out += escapeText(noScripts.slice(last, m.index));
        const name = m[2].toLowerCase();
        if (ALLOWED.has(name)) out += m[1] ? `</${name}>` : `<${name}>`;
        last = m.index + m[0].length;
    }
    return out + escapeText(noScripts.slice(last));
};

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

// Ghi chú dạng HTML hoặc chữ thuần → chữ thuần (cho dòng xem nhanh, Sổ kế hoạch, file Excel).
export const noteToText = (note) => {
    const s = String(note || '');
    if (!hasMarkup(s)) return s;
    // Thẻ mở khối (div, p, ul, ol) là điểm xuống dòng nếu đang ở giữa dòng; thẻ đóng luôn xuống dòng.
    return sanitizeHtml(s)
        .replace(/<br>/g, '\n').replace(/<li>/g, '• ').replace(/<\/(p|div|li)>/g, '\n')
        .replace(/<(p|div|ul|ol)>/g, '\u0001').replace(/(^|\n)\u0001/g, '$1').replace(/\u0001/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e] ?? e)
        .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};

// Nội dung đưa vào ô soạn thảo.
export const noteToHtml = (note) => {
    const s = String(note || '');
    if (hasMarkup(s)) return sanitizeHtml(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>');
};

// Nội dung lấy từ ô soạn thảo → giá trị lưu. Không có định dạng nào thì lưu lại thành chữ thuần như cũ.
export const noteFromEditor = (html) => {
    const clean = sanitizeHtml(html);
    const text = noteToText(clean);
    if (!text.trim()) return '';
    return isFormatted(clean) ? clean.trim() : text;
};
