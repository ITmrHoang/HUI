/**
 * Format — định dạng số / tiền / phần trăm / ngày theo ngôn ngữ hiện tại (Intl, không thư viện).
 * Dùng chung cho template (`data-format`), hui-number, hui-time, table, statistic…
 *
 *   formatCurrency(56890000)        → "56.890.000 ₫"   (vi)
 *   formatPercent(12.5)             → "12,5 %"          (giá trị tính theo đơn vị %, không phải 0.125)
 *   formatCompact(1250000)          → "1,3 Tr"
 *   relativeTime(Date.now() - 180e3) → "3 phút trước"
 *   format(value, 'currency:USD')   → bộ chọn dùng cho data-format
 */

import { getLocaleName } from './locale.js';

const INTL_LOCALE = { vi: 'vi-VN', en: 'en-US' };

/** Mã locale cho Intl theo ngôn ngữ HUI đang chọn ('vi' → 'vi-VN') */
export function intlLocale() {
  const name = getLocaleName();
  return INTL_LOCALE[name] || name;
}

// Tạo Intl.*Format tốn kém → cache theo (locale + tùy chọn)
const cache = new Map();
function cached(Ctor, opts) {
  const key = `${Ctor.name}|${intlLocale()}|${JSON.stringify(opts)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Ctor(intlLocale(), opts);
    cache.set(key, f);
  }
  return f;
}

const isBlank = (v) => v === null || v === undefined || v === '';
const toNumber = (v) => (typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, '')));

export function formatNumber(value, opts = {}) {
  if (isBlank(value)) return '';
  const n = toNumber(value);
  if (Number.isNaN(n)) return String(value);
  const options = typeof opts === 'number' ? { minimumFractionDigits: opts, maximumFractionDigits: opts } : opts;
  return cached(Intl.NumberFormat, options).format(n);
}

/** Tiền tệ — mặc định VND (không có phần lẻ) */
export function formatCurrency(value, currency = 'VND', opts = {}) {
  if (isBlank(value)) return '';
  const n = toNumber(value);
  if (Number.isNaN(n)) return String(value);
  const digits = currency === 'VND' ? { maximumFractionDigits: 0 } : {};
  return cached(Intl.NumberFormat, { style: 'currency', currency, ...digits, ...opts }).format(n);
}

/** Phần trăm — `value` tính theo đơn vị % (12.5 nghĩa là 12,5 %) */
export function formatPercent(value, digits = 1) {
  if (isBlank(value)) return '';
  const n = toNumber(value);
  if (Number.isNaN(n)) return String(value);
  return cached(Intl.NumberFormat, { style: 'percent', maximumFractionDigits: digits }).format(n / 100);
}

/** Số rút gọn: 1.250.000 → "1,3 Tr" (vi) / "1.3M" (en) */
export function formatCompact(value, digits = 1) {
  if (isBlank(value)) return '';
  const n = toNumber(value);
  if (Number.isNaN(n)) return String(value);
  return cached(Intl.NumberFormat, { notation: 'compact', maximumFractionDigits: digits }).format(n);
}

/** Chuyển giá trị bất kỳ (Date, timestamp ms, chuỗi ISO) → Date; không hợp lệ → null */
export function toDate(value) {
  if (isBlank(value)) return null;
  const d = value instanceof Date ? value : new Date(typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DATE_STYLES = {
  short: { dateStyle: 'short' },
  medium: { dateStyle: 'medium' },
  long: { dateStyle: 'long' },
  full: { dateStyle: 'full' },
  time: { timeStyle: 'short' },
  datetime: { dateStyle: 'medium', timeStyle: 'short' },
};

/** Ngày giờ: style short | medium | long | full | time | datetime, hoặc object tùy chọn Intl */
export function formatDate(value, style = 'medium') {
  const d = toDate(value);
  if (!d) return isBlank(value) ? '' : String(value);
  const opts = typeof style === 'string' ? DATE_STYLES[style] || DATE_STYLES.medium : style;
  return cached(Intl.DateTimeFormat, opts).format(d);
}

const UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

/** Thời gian tương đối: "3 phút trước", "trong 2 ngày" */
export function relativeTime(value, now = Date.now()) {
  const d = toDate(value);
  if (!d) return isBlank(value) ? '' : String(value);
  const diff = (d.getTime() - now) / 1000;
  const abs = Math.abs(diff);
  const rtf = cached(Intl.RelativeTimeFormat, { numeric: 'auto' });
  if (abs < 45) return rtf.format(0, 'second'); // "bây giờ"
  for (const [unit, sec] of UNITS) {
    if (abs >= sec || unit === 'second') return rtf.format(Math.round(diff / sec), unit);
  }
  return '';
}

/**
 * Bộ chọn theo chuỗi — dùng cho `data-format` trong template.
 *   number | number:2 | currency | currency:USD | percent | percent:0 | compact
 *   date | date:long | datetime | time | relative | upper | lower
 */
export function format(value, spec) {
  if (!spec) return isBlank(value) ? '' : String(value);
  const [kind, arg] = spec.split(':');
  switch (kind) {
    case 'number': return formatNumber(value, arg !== undefined ? Number(arg) : {});
    case 'currency': return formatCurrency(value, arg || 'VND');
    case 'percent': return formatPercent(value, arg !== undefined ? Number(arg) : 1);
    case 'compact': return formatCompact(value);
    case 'date': return formatDate(value, arg || 'medium');
    case 'datetime': return formatDate(value, 'datetime');
    case 'time': return formatDate(value, 'time');
    case 'relative': return relativeTime(value);
    case 'upper': return String(value ?? '').toUpperCase();
    case 'lower': return String(value ?? '').toLowerCase();
    default: return isBlank(value) ? '' : String(value);
  }
}
