/**
 * Màu cho hiệu ứng: đọc danh sách màu từ attribute / tuỳ chọn, cho phép viết tắt tên token.
 *   parseColors('primary, info-5, #f00, rgb(0 0 0 / .5)')
 *     → ['var(--hui-primary)', 'var(--hui-info-5)', '#f00', 'rgb(0 0 0 / .5)']
 *   resolveColors([...]) → giá trị rgb() thật (canvas không hiểu var()).
 */

const TOKEN_RE = /^(primary|secondary|success|warning|danger|info)(-(?:[1-9]|10|hover|active|light))?$/;

/** Màu mặc định của hiệu ứng (đều là token → đổi theme là đổi theo) */
export const DEFAULT_EFFECT_COLORS = ['primary', 'info', 'success', 'warning', 'danger'];

/** Tách chuỗi theo dấu phẩy nhưng bỏ qua dấu phẩy nằm trong ngoặc: rgb(1, 2, 3) */
function splitList(text) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Một màu: tên token ('primary', 'info-5') → var(--hui-…); còn lại giữ nguyên */
export function toCssColor(value) {
  const v = String(value).trim();
  if (TOKEN_RE.test(v)) return `var(--hui-${v})`;
  if (v.startsWith('--')) return `var(${v})`;
  return v;
}

/**
 * Chuẩn hoá danh sách màu (chuỗi phân cách dấu phẩy / mảng / JSON) thành mảng giá trị CSS.
 * @param {string|string[]|null|undefined} input
 * @param {string[]} [fallback]
 * @returns {string[]}
 */
export function parseColors(input, fallback = DEFAULT_EFFECT_COLORS) {
  let list = [];
  if (Array.isArray(input)) list = input;
  else if (typeof input === 'string' && input.trim()) {
    const s = input.trim();
    if (s.startsWith('[')) {
      try { list = JSON.parse(s); } catch { list = []; }
    } else list = splitList(s);
  }
  list = list.map((c) => String(c).trim()).filter(Boolean);
  return (list.length ? list : fallback).map(toCssColor);
}

/**
 * Tính màu thật (rgb) để vẽ canvas — đặt vào phần tử dò trong `scope` để var() / color-mix được giải.
 * @param {string[]} colors - giá trị CSS (sau parseColors)
 * @param {Element} [scope=document.body] - vùng đọc token (theme của vùng con)
 */
export function resolveColors(colors, scope) {
  const host = scope?.isConnected ? scope : document.body || document.documentElement;
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
  // Phần tử thường (div, button) chứa được con; thẻ rỗng (input, img) thì dò ở cha
  const needParent = Boolean(host.shadowRoot) || /^(INPUT|IMG|TEXTAREA|SELECT|BR|HR)$/.test(host.tagName);
  const parent = needParent ? host.parentNode || document.body : host;
  parent.appendChild(probe);
  const out = colors.map((c) => {
    probe.style.color = '';
    probe.style.color = c;
    return getComputedStyle(probe).color || c;
  });
  probe.remove();
  return out;
}
