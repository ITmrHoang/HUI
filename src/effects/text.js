/**
 * Tách chuỗi theo ký tự người đọc thấy (grapheme): "ệ", emoji ghép… không bị cắt đôi.
 * Dùng cho hui-typewriter / hui-split-text.
 */
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

/** @param {string} text @returns {string[]} */
export function splitGraphemes(text) {
  const s = String(text ?? '');
  return segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s);
}

/** Đọc danh sách chữ: mảng / JSON / chuỗi phân cách bằng "|" */
export function parseWords(value) {
  if (Array.isArray(value)) return value.map(String).filter((w) => w.length);
  if (typeof value !== 'string' || !value.trim()) return [];
  const s = value.trim();
  if (s.startsWith('[')) {
    try { return parseWords(JSON.parse(s)); } catch { return []; }
  }
  return s.split('|').map((w) => w.trim()).filter(Boolean);
}
