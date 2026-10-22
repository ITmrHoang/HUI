/**
 * Tiện ích màu thuần (không phụ thuộc DOM, trừ bước dự phòng đọc tên màu CSS):
 * parse chuỗi màu → { r, g, b, a }, đổi qua lại RGB / HSV (HSB) / HSL / HEX, định dạng chuỗi, độ tương phản WCAG.
 *   parseColor('#1677ff80')            → { r: 22, g: 119, b: 255, a: 0.5 }
 *   formatColor('hsl(210 100% 50%)', 'hex') → '#0080ff'
 *   contrastRatio('#fff', '#1677ff')   → 4.1…
 * r, g, b: 0..255 (có thể lẻ khi parse từ hsl/hsv — giữ độ chính xác khi đổi qua lại); a: 0..1
 * h: 0..360; s, v, l: 0..1
 */

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const round = (v, d = 0) => {
  const p = 10 ** d;
  return Math.round(v * p) / p;
};

// =====================================================
// ĐỔI HỆ MÀU
// =====================================================

/** { r, g, b } (0..255) → { h, s, v } */
export function rgbToHsv({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

/** { h, s, v } → { r, g, b } (0..255, chưa làm tròn) */
export function hsvToRgb({ h, s, v }) {
  h = (((h % 360) + 360) % 360) / 60;
  const c = v * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = v - c;
  const [r, g, b] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x]
    : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/** { h, s, l } → { h, s, v } (giữ nguyên hue) */
export function hslToHsv({ h, s, l }) {
  const v = l + s * Math.min(l, 1 - l);
  return { h, s: v ? 2 * (1 - l / v) : 0, v };
}

/** { h, s, v } → { h, s, l } (giữ nguyên hue) */
export function hsvToHsl({ h, s, v }) {
  const l = v * (1 - s / 2);
  const m = Math.min(l, 1 - l);
  return { h, s: m ? (v - l) / m : 0, l };
}

export const rgbToHsl = (rgb) => hsvToHsl(rgbToHsv(rgb));
export const hslToRgb = (hsl) => hsvToRgb(hslToHsv(hsl));

const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');

/** { r, g, b, a } → '#rrggbb' (thêm 'aa' khi a < 1 và withAlpha) */
export function rgbToHex({ r, g, b, a = 1 }, withAlpha = true) {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${withAlpha && a < 1 ? hex2(a * 255) : ''}`;
}

// =====================================================
// PARSE
// =====================================================

const HEX_RE = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FN_RE = /^(rgba?|hsla?|hsva?|hsba?)\(\s*([^)]*)\)$/i;

function parseHex(s) {
  const m = HEX_RE.exec(s);
  if (!m) return null;
  let h = m[1];
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  const n = (i) => parseInt(h.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? round(n(6) / 255, 3) : 1 };
}

/** '50%' → 0.5 × max ; '128' → 128 */
const channel = (tok, max) => (tok.endsWith('%') ? (parseFloat(tok) / 100) * max : parseFloat(tok));
const alphaOf = (tok) => (tok === undefined ? 1 : tok.endsWith('%') ? parseFloat(tok) / 100 : parseFloat(tok));

/** Hue có đơn vị: deg (mặc định) | turn | rad | grad */
function hueOf(tok) {
  const n = parseFloat(tok);
  if (tok.endsWith('turn')) return n * 360;
  if (tok.endsWith('grad')) return n * 0.9;
  if (tok.endsWith('rad')) return (n * 180) / Math.PI;
  return n;
}

function parseFn(s) {
  const m = FN_RE.exec(s);
  if (!m) return null;
  const kind = m[1].toLowerCase().slice(0, 3);
  const args = m[2].split(/[\s,/]+/).filter(Boolean);
  if (args.length < 3 || args.length > 4) return null;
  const a = clamp(alphaOf(args[3]), 0, 1);
  let out;
  if (kind === 'rgb') {
    out = { r: channel(args[0], 255), g: channel(args[1], 255), b: channel(args[2], 255) };
  } else {
    // hsl / hsv / hsb: s, l/v dạng % hoặc số 0..100
    const h = hueOf(args[0]);
    const s = clamp(parseFloat(args[1]) / 100, 0, 1);
    const t = clamp(parseFloat(args[2]) / 100, 0, 1);
    out = kind === 'hsl' ? hslToRgb({ h, s, l: t }) : hsvToRgb({ h, s, v: t });
  }
  if ([out.r, out.g, out.b, a].some((v) => !Number.isFinite(v))) return null;
  return { r: clamp(out.r, 0, 255), g: clamp(out.g, 0, 255), b: clamp(out.b, 0, 255), a: round(a, 3) };
}

/** Bộ nhớ đệm cho tên màu CSS (red, rebeccapurple, oklch()…) đã giải qua trình duyệt */
const namedCache = new Map();

/**
 * Màu CSS bất kỳ trình duyệt hiểu (tên màu, oklch(), color()…) → nhờ getComputedStyle đổi sang rgb().
 * Không có DOM (SSR) → null.
 */
function parseByBrowser(s) {
  if (namedCache.has(s)) return namedCache.get(s);
  let out = null;
  if (typeof document !== 'undefined' && typeof CSS !== 'undefined' && CSS.supports?.('color', s)
    && !/^(currentcolor|inherit|initial|unset|revert)/i.test(s)) {
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
    probe.style.color = s;
    (document.body || document.documentElement).appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    out = parseFn(computed);
    if (!out) {
      // Một số không gian màu (oklch, lab) vẫn giữ nguyên khi computed → nhờ canvas chuẩn hóa về sRGB
      try {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillStyle = computed;
        out = parseHex(ctx.fillStyle) || parseFn(ctx.fillStyle);
      } catch { /* bỏ qua */ }
    }
  }
  if (namedCache.size > 200) namedCache.clear();
  namedCache.set(s, out);
  return out;
}

/**
 * Chuỗi màu → { r, g, b, a } hoặc null nếu không hợp lệ.
 * Hỗ trợ: #rgb, #rgba, #rrggbb, #rrggbbaa (có/không '#'), rgb()/rgba(), hsl()/hsla(), hsv()/hsb() (cú pháp phẩy
 * hoặc khoảng trắng + "/ alpha"), 'transparent', và mọi màu CSS khác trình duyệt hiểu (tên màu…).
 * Cũng nhận object { r, g, b, a? } / { h, s, v, a? } / { h, s, l, a? }.
 */
export function parseColor(input) {
  if (input == null) return null;
  if (typeof input === 'object') {
    const a = input.a ?? 1;
    if ('r' in input) return { r: input.r, g: input.g, b: input.b, a };
    if ('v' in input) return { ...hsvToRgb(input), a };
    if ('l' in input) return { ...hslToRgb(input), a };
    return null;
  }
  const s = String(input).trim();
  if (!s) return null;
  if (/^transparent$/i.test(s)) return { r: 0, g: 0, b: 0, a: 0 };
  return parseHex(s) || parseFn(s) || parseByBrowser(s);
}

// =====================================================
// ĐỊNH DẠNG
// =====================================================

/**
 * Màu (chuỗi hoặc object như parseColor) → chuỗi theo format.
 * @param {string|object} color
 * @param {'hex'|'rgb'|'hsl'|'hsv'} [format='hex'] — a < 1 → #rrggbbaa / rgba() / hsla() / hsva()
 * @returns {string} '' nếu màu không hợp lệ
 */
export function formatColor(color, format = 'hex') {
  // Có sẵn HSV (vd: từ color picker) → dùng thẳng để giữ hue khi màu xám/đen
  const hsv = color && typeof color === 'object' && 'v' in color ? color : null;
  const c = hsv ? { ...hsvToRgb(hsv), a: hsv.a ?? 1 } : parseColor(color);
  if (!c) return '';
  const a = round(clamp(c.a ?? 1, 0, 1), 2);
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);
  if (format === 'rgb') return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
  if (format === 'hsl' || format === 'hsv' || format === 'hsb') {
    const src = hsv || rgbToHsv(c);
    const isHsl = format === 'hsl';
    const m = isHsl ? hsvToHsl(src) : src;
    const h = Math.round(m.h) % 360;
    const s = Math.round(m.s * 100);
    const t = Math.round((isHsl ? m.l : m.v) * 100);
    const fn = isHsl ? 'hsl' : 'hsv';
    return a < 1 ? `${fn}a(${h}, ${s}%, ${t}%, ${a})` : `${fn}(${h}, ${s}%, ${t}%)`;
  }
  return rgbToHex({ r, g, b, a });
}

// =====================================================
// ĐỘ TƯƠNG PHẢN (WCAG 2.x)
// =====================================================

/** Độ sáng tương đối 0..1 (bỏ qua alpha) */
export function luminance(color) {
  const c = parseColor(color);
  if (!c) return 0;
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/** Tỉ lệ tương phản WCAG giữa 2 màu: 1 … 21 (AA chữ thường cần ≥ 4.5, chữ lớn ≥ 3) */
export function contrastRatio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return round((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), 2);
}

/** Màu chữ dễ đọc nhất trên nền `bg` trong các ứng viên (mặc định đen / trắng) */
export function readableColor(bg, candidates = ['#000000', '#ffffff']) {
  let best = candidates[0];
  let bestRatio = -1;
  for (const c of candidates) {
    const r = contrastRatio(bg, c);
    if (r > bestRatio) {
      bestRatio = r;
      best = c;
    }
  }
  return best;
}
