/**
 * Tiện ích nội bộ dùng chung cho họ hui-menu (không export ra ngoài thư viện).
 */

let seq = 0;

/** Key của item / sub-menu: attribute key, không có thì sinh key tự động (cố định theo phần tử) */
export function keyOf(el) {
  const key = el.getAttribute('key');
  if (key !== null) return key;
  el._huiAutoKey ||= `hui-menu-auto-${++seq}`;
  return el._huiAutoKey;
}

/** Ngữ cảnh mặc định khi item chưa nằm trong <hui-menu> nào */
export const DEFAULT_CTX = Object.freeze({
  mode: 'vertical',
  level: 0,
  indent: 24,
  horizontalRoot: false,
  inPopup: false,
  collapsedRoot: false,
  selected: false,
  open: false,
});

/** Chuỗi "a, b,c" hoặc JSON '["a","b"]' → mảng chuỗi */
export function parseKeyList(value) {
  if (value === null || value === undefined) return [];
  const raw = String(value).trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch { /* rơi xuống tách dấu phẩy */ }
  }
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}
