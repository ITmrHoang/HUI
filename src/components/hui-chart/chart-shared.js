/**
 * Dùng chung cho hui-sparkline / hui-bar-mini / hui-donut / hui-gauge:
 * chuẩn hóa data, màu từ token, định dạng số, hình học SVG (đường cong monotone, cung tròn), tween, tooltip.
 * Các hàm hình học là hàm thuần (không đụng DOM) → dùng lại được ở nơi khác / test riêng.
 */

import { t, getLocaleName } from '../../core/locale.js';
import { format as formatSpec, formatNumber } from '../../core/format.js';
import { animationsDisabled } from '../../utils/animate.js';
import { createElement } from '../../utils/dom.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Tạo phần tử SVG kèm attribute */
export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// =====================================================
// LOCALE — key chưa có trong locale.js → bảng dự phòng vi/en
// =====================================================

const FALLBACK = {
  'chart.sparkline': { vi: 'Biểu đồ đường', en: 'Line chart' },
  'chart.bar': { vi: 'Biểu đồ cột', en: 'Bar chart' },
  'chart.donut': { vi: 'Biểu đồ tròn', en: 'Donut chart' },
  'chart.gauge': { vi: 'Đồng hồ đo', en: 'Gauge' },
  'chart.summary': { vi: 'Thấp nhất {min}, cao nhất {max}, hiện tại {last}', en: 'Min {min}, max {max}, latest {last}' },
  'chart.trendUp': { vi: 'xu hướng tăng', en: 'trending up' },
  'chart.trendDown': { vi: 'xu hướng giảm', en: 'trending down' },
  'chart.trendFlat': { vi: 'đi ngang', en: 'flat' },
  'chart.reference': { vi: 'mốc tham chiếu {value}', en: 'reference {value}' },
  'chart.barSummary': { vi: '{count} mục, cao nhất {maxLabel}: {max}', en: '{count} items, highest {maxLabel}: {max}' },
  'chart.donutSummary': { vi: '{count} phần, tổng {total}', en: '{count} parts, total {total}' },
  'chart.total': { vi: 'Tổng', en: 'Total' },
  'chart.label': { vi: 'Nhãn', en: 'Label' },
  'chart.value': { vi: 'Giá trị', en: 'Value' },
  'chart.point': { vi: 'Điểm {index}', en: 'Point {index}' },
  'chart.empty': { vi: 'Không có dữ liệu', en: 'No data' },
};

/** Dịch có dự phòng: t() trả lại chính key (chưa có bản dịch) → lấy từ FALLBACK */
export function msg(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

// =====================================================
// DATA
// =====================================================

/**
 * Chuẩn hóa `data`: số | chuỗi số | {label, value, color} → [{label, value, color, index, raw}].
 * Phần tử không có giá trị số hợp lệ bị bỏ qua (index giữ vị trí gốc trong mảng).
 */
export function normalizeData(data) {
  const list = Array.isArray(data) ? data : [];
  const out = [];
  list.forEach((raw, index) => {
    const obj = raw !== null && typeof raw === 'object';
    const value = Number(obj ? raw.value : raw);
    if (raw === null || raw === '' || !Number.isFinite(value)) return;
    out.push({
      label: obj && raw.label !== undefined && raw.label !== null ? String(raw.label) : '',
      value,
      color: obj && raw.color ? String(raw.color) : '',
      index,
      raw,
    });
  });
  return out;
}

// =====================================================
// MÀU — chỉ lấy từ token (dark mode tự đổi theo)
// =====================================================

const PRESETS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];
const PRESET_RE = /^(primary|secondary|success|warning|danger|info)(-(10|[1-9]))?$/;

/** Bảng màu chuỗi dữ liệu (lặp vòng); ghi đè từng màu bằng --hui-chart-color-1 … -12 */
export const CHART_PALETTE = [
  'primary', 'info', 'success', 'warning', 'danger', 'secondary',
  'primary-4', 'info-4', 'success-4', 'warning-4', 'danger-4', 'secondary-4',
];

/** Màu thứ i trong bảng màu (lặp vòng) */
export function paletteColor(i) {
  const n = CHART_PALETTE.length;
  const k = ((i % n) + n) % n;
  return `var(--hui-chart-color-${k + 1}, var(--hui-${CHART_PALETTE[k]}))`;
}

/**
 * Tên preset (primary, success-4…) → var(--hui-…); chuỗi khác coi là màu CSS người dùng tự truyền.
 * Rỗng → `fallback`.
 */
export function resolveColor(color, fallback = 'var(--hui-primary)') {
  const c = String(color ?? '').trim();
  if (!c) return fallback;
  return PRESET_RE.test(c) ? `var(--hui-${c})` : c;
}

export const isPreset = (c) => PRESETS.includes(c);

// =====================================================
// ĐỊNH DẠNG SỐ
// =====================================================

/**
 * Định dạng giá trị: hàm `formatter(value, item)` > chuỗi `format` (format.js: "currency", "number:1", "percent"…)
 * > số theo locale (`digits` = số lẻ tối đa).
 */
export function formatValue(value, { format, formatter, item, digits } = {}) {
  if (typeof formatter === 'function') return String(formatter(value, item));
  if (format) return formatSpec(value, format);
  return formatNumber(value, digits !== undefined ? { maximumFractionDigits: digits } : {});
}

/** Số chữ số thập phân của một số (12.5 → 1) — để số đếm dần không lòi thêm số lẻ */
export function decimalsOf(n) {
  const s = String(n);
  const i = s.indexOf('.');
  return i < 0 || /e/i.test(s) ? 0 : Math.min(s.length - i - 1, 6);
}

// =====================================================
// TOÁN / HÌNH HỌC (hàm thuần)
// =====================================================

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
const r2 = (v) => Math.round(v * 100) / 100;

/**
 * Làm tròn lên số "đẹp" cho trục: 1 | 2 | 2.5 | 5 | 10 × 10^k.
 * niceMax(87) → 100, niceMax(2300) → 2500, niceMax(0.42) → 0.5
 */
export function niceMax(v) {
  if (!Number.isFinite(v) || v <= 0) return 0;
  const base = 10 ** Math.floor(Math.log10(v));
  const f = v / base;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return Number((nice * base).toPrecision(12));
}

/** Thang tuyến tính [d0, d1] → [r0, r1] */
export function scaleLinear(d0, d1, r0, r1) {
  const span = d1 - d0 || 1;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
}

const sign = (x) => (x < 0 ? -1 : 1);

/**
 * Tiếp tuyến cho đường cong monotone (thuật toán Steffen, như d3.curveMonotoneX):
 * - Trong lòng: hệ số góc hai bên khác dấu (đỉnh/đáy) → tiếp tuyến 0 (nằm ngang);
 *   cùng dấu → min(|s0|, |s1|, |p|/2), p = trung bình có trọng số → đường cong KHÔNG vọt quá dữ liệu.
 * - Hai đầu mút: tiếp tuyến một phía (3s − m kề) / 2.
 * @param {{x:number, y:number}[]} pts - x tăng dần
 */
export function monotoneTangents(pts) {
  const n = pts.length;
  const m = new Array(n).fill(0);
  if (n < 2) return m;
  const h = [];
  const s = [];
  for (let i = 0; i < n - 1; i++) {
    h[i] = pts[i + 1].x - pts[i].x;
    s[i] = h[i] ? (pts[i + 1].y - pts[i].y) / h[i] : 0;
  }
  for (let i = 1; i < n - 1; i++) {
    const p = (s[i - 1] * h[i] + s[i] * h[i - 1]) / (h[i - 1] + h[i] || 1);
    m[i] = (sign(s[i - 1]) + sign(s[i])) * Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), 0.5 * Math.abs(p)) || 0;
  }
  m[0] = n > 2 ? (3 * s[0] - m[1]) / 2 : s[0];
  m[n - 1] = n > 2 ? (3 * s[n - 2] - m[n - 2]) / 2 : s[n - 2];
  return m;
}

/**
 * Chuỗi `d` cho đường qua các điểm.
 * linear: M + L…; smooth: M + C… (Bézier bậc 3 Hermite: điểm điều khiển cách 1/3 đoạn theo tiếp tuyến).
 * Mỗi điểm dữ liệu ứng đúng 1 lệnh (M/L/C) → đếm lệnh = số điểm.
 */
export function linePath(pts, curve = 'linear') {
  const n = pts.length;
  if (!n) return '';
  let d = `M${r2(pts[0].x)},${r2(pts[0].y)}`;
  if (curve !== 'smooth' || n < 2) {
    for (let i = 1; i < n; i++) d += `L${r2(pts[i].x)},${r2(pts[i].y)}`;
    return d;
  }
  const m = monotoneTangents(pts);
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const dx = (p1.x - p0.x) / 3;
    d += `C${r2(p0.x + dx)},${r2(p0.y + dx * m[i])} ${r2(p1.x - dx)},${r2(p1.y - dx * m[i + 1])} ${r2(p1.x)},${r2(p1.y)}`;
  }
  return d;
}

/** Vùng tô dưới đường: đường + khép về đường đáy `baseY` */
export function areaPath(pts, baseY, curve = 'linear') {
  if (!pts.length) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${linePath(pts, curve)}L${r2(last.x)},${r2(baseY)}L${r2(first.x)},${r2(baseY)}Z`;
}

/**
 * Tọa độ trên đường tròn. Quy ước góc: 0° = 12 giờ, tăng theo chiều kim đồng hồ
 * (SVG trục y hướng xuống → x = cx + r·sin, y = cy − r·cos).
 */
export function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

/**
 * Cung tròn (đường mở, để vẽ bằng stroke) từ góc `start` tới `end` (độ, chiều kim đồng hồ).
 * Lệnh A: rx ry xoay large-arc sweep x y — large-arc = 1 khi cung > 180°, sweep = 1 (chiều kim đồng hồ).
 * Cung ≥ 360° không vẽ được bằng 1 lệnh A (điểm đầu ≡ điểm cuối) → tách 2 nửa.
 */
export function arcPath(cx, cy, r, start, end) {
  const sweep = end - start;
  if (!(sweep > 0.01) || !(r > 0)) return '';
  const a = polar(cx, cy, r, start);
  if (sweep >= 359.99) {
    const b = polar(cx, cy, r, start + 180);
    return `M${r2(a.x)},${r2(a.y)}A${r2(r)},${r2(r)} 0 1 1 ${r2(b.x)},${r2(b.y)}A${r2(r)},${r2(r)} 0 1 1 ${r2(a.x)},${r2(a.y)}`;
  }
  const b = polar(cx, cy, r, end);
  return `M${r2(a.x)},${r2(a.y)}A${r2(r)},${r2(r)} 0 ${sweep > 180 ? 1 : 0} 1 ${r2(b.x)},${r2(b.y)}`;
}

/**
 * Hình quạt vành khuyên (vùng tô) giữa bán kính trong/ngoài: cung ngoài thuận chiều → cạnh → cung trong ngược chiều.
 */
export function sectorPath(cx, cy, rOuter, rInner, start, end) {
  const sweep = Math.min(end - start, 359.99);
  if (!(sweep > 0.01)) return '';
  const large = sweep > 180 ? 1 : 0;
  const o0 = polar(cx, cy, rOuter, start);
  const o1 = polar(cx, cy, rOuter, start + sweep);
  const i1 = polar(cx, cy, rInner, start + sweep);
  const i0 = polar(cx, cy, rInner, start);
  return `M${r2(o0.x)},${r2(o0.y)}A${r2(rOuter)},${r2(rOuter)} 0 ${large} 1 ${r2(o1.x)},${r2(o1.y)}`
    + `L${r2(i1.x)},${r2(i1.y)}A${r2(rInner)},${r2(rInner)} 0 ${large} 0 ${r2(i0.x)},${r2(i0.y)}Z`;
}

/**
 * Nội suy mảng điểm cũ sang đúng `n` điểm (để tween khi số điểm đổi):
 * điểm mới thứ i lấy vị trí phân số i·(m−1)/(n−1) trên mảng cũ.
 */
export function resamplePoints(pts, n) {
  const m = pts.length;
  if (m === n) return pts.map((p) => ({ ...p }));
  if (!m) return [];
  if (m === 1 || n === 1) return Array.from({ length: n }, () => ({ ...pts[m - 1] }));
  return Array.from({ length: n }, (_, i) => {
    const f = (i * (m - 1)) / (n - 1);
    const k = Math.floor(f);
    const a = pts[k];
    const b = pts[Math.min(k + 1, m - 1)];
    return { x: lerp(a.x, b.x, f - k), y: lerp(a.y, b.y, f - k) };
  });
}

// =====================================================
// CHUYỂN ĐỘNG
// =====================================================

/** Được phép chạy hiệu ứng: không no-animation, không prefers-reduced-motion, token thời lượng ≠ 0 */
export function canAnimate(el) {
  return !el.noAnimation && !animationsDisabled();
}

/** Thời lượng hiệu ứng (ms) từ biến CSS `name` trên phần tử, không có → fallback */
export function durationOf(el, name, fallback) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const v = parseFloat(raw);
  if (!Number.isFinite(v)) return fallback;
  return raw.endsWith('ms') ? v : raw.endsWith('s') ? v * 1000 : v;
}

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * Chạy onFrame(p) mỗi frame với p đi 0 → 1 (đã qua easing) trong `duration` ms. Trả về hàm hủy.
 * Chỉ chạy khi data đổi / lần đầu xuất hiện — không có vòng lặp thường trực.
 */
export function tween(duration, onFrame, { ease = easeOutCubic, onDone } = {}) {
  let raf = 0;
  let start = 0;
  const step = (now) => {
    if (!start) start = now;
    const p = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
    onFrame(ease(p));
    if (p < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// =====================================================
// TOOLTIP (nằm trong shadow root, định vị tuyệt đối theo khung biểu đồ)
// =====================================================

export function createTooltip() {
  const label = createElement('span', { className: 'chart-tip__label', part: 'tooltip-label' });
  const swatch = createElement('span', { className: 'chart-tip__swatch', 'aria-hidden': 'true' });
  const value = createElement('span', { className: 'chart-tip__text' });
  const row = createElement('span', { className: 'chart-tip__value', part: 'tooltip-value' }, swatch, value);
  const tip = createElement('div', { className: 'chart-tip', part: 'tooltip', 'aria-hidden': 'true' }, label, row);
  tip._parts = { label, value, swatch };
  return tip;
}

/**
 * Hiện tooltip tại (x, y) — tọa độ px trong khung `bounds` (phần tử position: relative chứa tooltip).
 * Tooltip nằm phía trên điểm; bị kẹp ngang để không tràn khỏi khung.
 */
export function showTooltip(tip, { label = '', value = '', color = '' }, x, y, bounds) {
  const { label: l, value: v, swatch } = tip._parts;
  l.textContent = label;
  l.hidden = !label;
  v.textContent = value;
  swatch.hidden = !color;
  if (color) tip.style.setProperty('--_chart-tip-color', color);
  tip.classList.add('is-visible');
  const w = tip.offsetWidth;
  const W = bounds?.clientWidth || 0;
  const left = W > w ? clamp(x, w / 2, W - w / 2) : W / 2 || x;
  tip.style.left = `${r2(left)}px`;
  tip.style.top = `${r2(y)}px`;
}

export function hideTooltip(tip) {
  tip.classList.remove('is-visible');
}

// =====================================================
// BẢNG DỮ LIỆU ẨN CHO TRÌNH ĐỌC MÀN HÌNH
// =====================================================

/** Bảng ẩn (sr-only) — trình đọc màn hình duyệt được từng dòng: nhãn | giá trị */
export function createSrTable() {
  return createElement('table', { className: 'sr-only', part: 'data-table' });
}

export function fillSrTable(table, caption, rows) {
  const head = createElement('tr', {},
    createElement('th', { scope: 'col' }, msg('chart.label')),
    createElement('th', { scope: 'col' }, msg('chart.value')));
  const body = createElement('tbody', {}, ...rows.map(([k, v]) => createElement('tr', {},
    createElement('th', { scope: 'row' }, k),
    createElement('td', {}, v))));
  table.replaceChildren(createElement('caption', {}, caption), createElement('thead', {}, head), body);
}
