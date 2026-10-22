/**
 * Date utils — tiện ích ngày giờ tự viết (Date native + Intl, không thư viện), dùng chung cho
 * hui-calendar / hui-date-picker / hui-range-picker / hui-time-picker.
 *
 *   parseISO('2026-10-22')                  → Date (giờ địa phương, KHÔNG lệch múi giờ như new Date('2026-10-22'))
 *   formatPattern(d, 'DD/MM/YYYY HH:mm')    → "22/10/2026 14:30"
 *   parsePattern('22/10/2026', 'DD/MM/YYYY') → Date | null (kiểm tra ngày hợp lệ: 31/02 → null)
 *   toISO(d, 'date' | 'datetime' | 'week' | 'month' | 'quarter' | 'year')
 *   monthGrid(2026, 9, 1)                   → 42 ngày (6 tuần) bắt đầu từ thứ Hai
 *
 * Mọi Date đều là giờ ĐỊA PHƯƠNG; chuỗi ISO không mang múi giờ (giống <input type="date">).
 */

import { intlLocale } from '../../core/format.js';
import { getLocaleName, t } from '../../core/locale.js';

export const DAY_MS = 864e5;

export const pad = (n, len = 2) => String(Math.abs(Math.trunc(n))).padStart(len, '0');

export const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

/** Tạo Date địa phương, năm < 100 không bị đổi thành 19xx */
export function makeDate(y, m, d = 1, h = 0, mi = 0, s = 0) {
  const x = new Date(y, m, d, h, mi, s, 0);
  if (y >= 0 && y < 100) x.setFullYear(y);
  return x;
}

export const cloneDate = (d) => new Date(d.getTime());
export const startOfDay = (d) => makeDate(d.getFullYear(), d.getMonth(), d.getDate());
export const startOfMonth = (d) => makeDate(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d) => makeDate(d.getFullYear(), d.getMonth() + 1, 0);
export const startOfYear = (d) => makeDate(d.getFullYear(), 0, 1);
export const startOfQuarter = (d) => makeDate(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
export const daysInMonth = (y, m) => makeDate(y, m + 1, 0).getDate();
export const quarterOf = (d) => Math.floor(d.getMonth() / 3) + 1;

/** Cộng ngày theo lịch (không cộng ms → không lệch khi đổi giờ mùa hè) */
export function addDays(d, n) {
  const x = cloneDate(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Cộng tháng, ngày bị kẹp về cuối tháng (31/01 + 1 tháng → 28|29/02) */
export function addMonths(d, n) {
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  const target = makeDate(y, m, 1, d.getHours(), d.getMinutes(), d.getSeconds());
  target.setDate(Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth())));
  return target;
}

export const addYears = (d, n) => addMonths(d, n * 12);

/** Số ngày từ b tới a (a - b), làm tròn để bỏ qua chênh lệch giờ mùa hè */
export const diffDays = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / DAY_MS);
export const diffMonths = (a, b) => (a.getFullYear() - b.getFullYear()) * 12 + a.getMonth() - b.getMonth();

export const isSameDay = (a, b) => Boolean(a && b) && a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const isSameMonth = (a, b) => Boolean(a && b) && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
export const isSameYear = (a, b) => Boolean(a && b) && a.getFullYear() === b.getFullYear();
export const isSameQuarter = (a, b) => isSameYear(a, b) && quarterOf(a) === quarterOf(b);

/** So sánh theo đơn vị: date | week | month | quarter | year → -1 | 0 | 1 */
export function compareUnit(a, b, unit = 'date', weekStart = 1) {
  const key = (d) => {
    switch (unit) {
      case 'year': return d.getFullYear();
      case 'quarter': return d.getFullYear() * 10 + quarterOf(d);
      case 'month': return d.getFullYear() * 100 + d.getMonth();
      case 'week': return startOfWeek(d, weekStart).getTime();
      default: return startOfDay(d).getTime();
    }
  };
  const ka = key(a);
  const kb = key(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

export const isSameUnit = (a, b, unit, weekStart) => Boolean(a && b) && compareUnit(a, b, unit, weekStart) === 0;

/** Ngày cuối của đơn vị chứa d: date | month | quarter | year */
export function endOfUnit(d, unit) {
  switch (unit) {
    case 'month': return makeDate(d.getFullYear(), d.getMonth() + 1, 0);
    case 'quarter': return makeDate(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0);
    case 'year': return makeDate(d.getFullYear(), 11, 31);
    default: return d;
  }
}

/** Kẹp ngày vào [min, max] (theo ngày, giữ giờ) */
export function clampDate(d, min, max) {
  if (min && compareUnit(d, min) < 0) return cloneDate(min);
  if (max && compareUnit(d, max) > 0) return cloneDate(max);
  return d;
}

// =====================================================
// TUẦN
// =====================================================

/** Ngày đầu tuần theo ngôn ngữ: vi = 1 (thứ Hai), en = 0 (Chủ nhật) — lấy từ locale datePicker.weekStart */
export function localeWeekStart() {
  const v = Number(t('datePicker.weekStart'));
  if (Number.isInteger(v) && v >= 0 && v <= 6) return v;
  return getLocaleName() === 'en' ? 0 : 1;
}

export function startOfWeek(d, weekStart = 1) {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() - weekStart + 7) % 7));
}

/**
 * Số tuần + "năm của tuần".
 * weekStart = 1 → chuẩn ISO 8601 (tuần 1 chứa ngày 4/1); khác → kiểu Mỹ (tuần 1 chứa ngày 1/1).
 */
export function weekInfo(d, weekStart = 1) {
  const minDays = weekStart === 1 ? 4 : 1;
  const start = startOfWeek(d, weekStart);
  const year = addDays(start, 7 - minDays).getFullYear();
  const first = startOfWeek(makeDate(year, 0, minDays), weekStart);
  return { year, week: Math.floor(diffDays(start, first) / 7) + 1 };
}

/** Ngày đầu tiên của tuần `week` thuộc "năm của tuần" `year` */
export function weekStartDate(year, week, weekStart = 1) {
  const minDays = weekStart === 1 ? 4 : 1;
  return addDays(startOfWeek(makeDate(year, 0, minDays), weekStart), (week - 1) * 7);
}

// =====================================================
// LƯỚI LỊCH
// =====================================================

/** 42 ngày (6 hàng × 7) hiển thị cho tháng `month` (0-11) của năm `year` */
export function monthGrid(year, month, weekStart = 1) {
  const first = startOfWeek(makeDate(year, month, 1), weekStart);
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/** 12 tháng của năm (ngày 1 mỗi tháng) */
export const yearGrid = (year) => Array.from({ length: 12 }, (_, i) => makeDate(year, i, 1));

/** 12 năm của thập kỷ chứa `year`: năm cuối thập kỷ trước … năm đầu thập kỷ sau */
export function decadeGrid(year) {
  const start = Math.floor(year / 10) * 10;
  return Array.from({ length: 12 }, (_, i) => makeDate(start - 1 + i, 0, 1));
}

// =====================================================
// TÊN THÁNG / THỨ (Intl, cache theo locale)
// =====================================================

const nameCache = new Map();
function cachedNames(key, build) {
  const k = `${intlLocale()}|${key}`;
  if (!nameCache.has(k)) nameCache.set(k, build(intlLocale()));
  return nameCache.get(k);
}

/** Viết hoa chữ cái đầu ("tháng 10" → "Tháng 10") */
export const capitalize = (s) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

/** Tên 12 tháng: style long | short | narrow */
export function monthNames(style = 'long') {
  return cachedNames(`m-${style}`, (loc) => {
    const f = new Intl.DateTimeFormat(loc, { month: style });
    return Array.from({ length: 12 }, (_, i) => capitalize(f.format(makeDate(2024, i, 1))));
  });
}

/** Tên 7 thứ, index 0 = Chủ nhật: style long | short | narrow */
export function weekdayNames(style = 'short') {
  return cachedNames(`w-${style}`, (loc) => {
    const f = new Intl.DateTimeFormat(loc, { weekday: style });
    // 7/1/2024 là Chủ nhật
    return Array.from({ length: 7 }, (_, i) => capitalize(f.format(makeDate(2024, 0, 7 + i))));
  });
}

/** Thứ ngắn cho tiêu đề cột lịch: tên short nếu đủ ngắn (≤ 3 ký tự, vd "Mon"), không thì narrow ("T2") */
export function weekdayShortNames() {
  const short = weekdayNames('short');
  return short.every((s) => s.length <= 3) ? short : weekdayNames('narrow');
}

/** Chữ SA/CH (vi) hoặc AM/PM (en) */
export function dayPeriodNames() {
  return cachedNames('ampm', (loc) => {
    const f = new Intl.DateTimeFormat(loc, { hour: 'numeric', hour12: true });
    const get = (h) => f.formatToParts(makeDate(2024, 0, 1, h)).find((p) => p.type === 'dayPeriod')?.value;
    return [get(9) || 'AM', get(15) || 'PM'];
  });
}

/** Ngày đầy đủ cho trình đọc màn hình: "Thứ Năm, 22 tháng 10, 2026" */
export function fullDateLabel(d) {
  return cachedNames('full', (loc) => new Intl.DateTimeFormat(loc, { dateStyle: 'full' })).format(d);
}

// =====================================================
// ĐỊNH DẠNG THEO MẪU (token kiểu dayjs)
// =====================================================

/**
 * Token: YYYY YY gggg(năm của tuần) Q MMMM MMM MM M DD D dddd ddd ww w HH H hh h mm m ss s A a
 * Chữ cố định đặt trong [...]: 'YYYY-[W]ww'
 */
const TOKEN_RE = /\[([^\]]*)]|YYYY|gggg|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|ww|w|HH|H|hh|h|mm|m|ss|s|Q|A|a/g;

export function formatPattern(d, pattern, { weekStart = localeWeekStart() } = {}) {
  if (!isValidDate(d)) return '';
  const h = d.getHours();
  const h12 = h % 12 || 12;
  let week = null;
  const wk = () => (week ||= weekInfo(d, weekStart));
  return pattern.replace(TOKEN_RE, (tok, literal) => {
    if (literal !== undefined) return literal;
    switch (tok) {
      case 'YYYY': return pad(d.getFullYear(), 4);
      case 'gggg': return pad(wk().year, 4);
      case 'YY': return pad(d.getFullYear() % 100);
      case 'Q': return String(quarterOf(d));
      case 'MMMM': return monthNames('long')[d.getMonth()];
      case 'MMM': return monthNames('short')[d.getMonth()];
      case 'MM': return pad(d.getMonth() + 1);
      case 'M': return String(d.getMonth() + 1);
      case 'DD': return pad(d.getDate());
      case 'D': return String(d.getDate());
      case 'dddd': return weekdayNames('long')[d.getDay()];
      case 'ddd': return weekdayNames('short')[d.getDay()];
      case 'ww': return pad(wk().week);
      case 'w': return String(wk().week);
      case 'HH': return pad(h);
      case 'H': return String(h);
      case 'hh': return pad(h12);
      case 'h': return String(h12);
      case 'mm': return pad(d.getMinutes());
      case 'm': return String(d.getMinutes());
      case 'ss': return pad(d.getSeconds());
      case 's': return String(d.getSeconds());
      case 'A': return dayPeriodNames()[h < 12 ? 0 : 1];
      case 'a': return dayPeriodNames()[h < 12 ? 0 : 1].toLowerCase();
      default: return tok;
    }
  });
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Đọc chuỗi người dùng gõ theo mẫu → Date | null.
 * Dễ dãi: không bắt buộc số 0 ở đầu ("2/9/2026"), khoảng trắng tùy ý, không phân biệt hoa thường.
 * Chặt chẽ: ngày phải tồn tại (31/02 → null), giờ/phút/giây trong khoảng hợp lệ.
 */
export function parsePattern(text, pattern, { weekStart = localeWeekStart() } = {}) {
  const input = String(text ?? '').trim();
  if (!input) return null;
  const fields = [];
  let src = '';
  let last = 0;
  pattern.replace(TOKEN_RE, (tok, literal, offset) => {
    src += lit(pattern.slice(last, offset));
    last = offset + tok.length;
    if (literal !== undefined) {
      src += lit(literal);
      return tok;
    }
    fields.push(tok);
    src += tokenRe(tok);
    return tok;
  });
  src += lit(pattern.slice(last));
  const match = new RegExp(`^${src}$`, 'iu').exec(input);
  if (!match) return null;

  const now = new Date();
  const p = { y: null, m: 0, d: 1, h: 0, mi: 0, s: 0, pm: null, q: null, w: null, wy: null, bad: false };
  fields.forEach((tok, i) => {
    const raw = match[i + 1];
    const n = Number(raw);
    switch (tok) {
      case 'YYYY': p.y = n; break;
      case 'gggg': p.wy = n; break;
      case 'YY': p.y = 2000 + n; break;
      case 'Q': p.q = n; break;
      case 'MMMM': case 'MMM': {
        const names = monthNames(tok === 'MMMM' ? 'long' : 'short').map((s) => s.toLowerCase());
        p.m = names.indexOf(raw.toLowerCase());
        break;
      }
      case 'MM': case 'M': p.m = n - 1; break;
      case 'DD': case 'D': p.d = n; break;
      case 'ww': case 'w': p.w = n; break;
      case 'HH': case 'H': case 'hh': case 'h': p.h = n; break;
      case 'mm': case 'm': p.mi = n; break;
      case 'ss': case 's': p.s = n; break;
      case 'A': case 'a': {
        const v = raw.toLowerCase();
        const [am, pmName] = dayPeriodNames().map((s) => s.toLowerCase());
        p.pm = v === pmName || v === 'pm' || v === 'ch' ? true : v === am || v === 'am' || v === 'sa' ? false : null;
        if (p.pm === null) p.bad = true;
        break;
      }
      default:
    }
  });

  if (p.bad) return null;
  if (p.pm !== null) {
    if (p.h < 1 || p.h > 12) return null;
    p.h = (p.h % 12) + (p.pm ? 12 : 0);
  }
  if (p.h > 23 || p.mi > 59 || p.s > 59) return null;

  if (p.w !== null) {
    const wy = p.wy ?? p.y;
    if (wy === null || p.w < 1 || p.w > 53) return null;
    const start = weekStartDate(wy, p.w, weekStart);
    return weekInfo(start, weekStart).week === p.w ? start : null;
  }
  if (p.y === null) {
    // Mẫu chỉ có giờ (HH:mm) → ngày hôm nay
    if (!fields.some((f) => /^[YMDQg]/.test(f))) {
      return makeDate(now.getFullYear(), now.getMonth(), now.getDate(), p.h, p.mi, p.s);
    }
    return null;
  }
  if (p.q !== null) p.m = (p.q - 1) * 3;
  if (p.m < 0 || p.m > 11 || p.d < 1 || p.d > daysInMonth(p.y, p.m)) return null;
  return makeDate(p.y, p.m, p.d, p.h, p.mi, p.s);

  function lit(s) {
    return s.split(/\s+/).map(escapeRe).join('\\s*');
  }
  function tokenRe(tok) {
    if (tok === 'YYYY' || tok === 'gggg') return '(\\d{4})';
    if (tok === 'YY') return '(\\d{2})';
    if (tok === 'Q') return '([1-4])';
    if (tok === 'MMMM' || tok === 'MMM') {
      return `(${monthNames(tok === 'MMMM' ? 'long' : 'short').map(escapeRe).sort((a, b) => b.length - a.length).join('|')})`;
    }
    if (tok === 'dddd' || tok === 'ddd') return '(?:[^\\s\\d,]+(?:\\s[^\\s\\d,]+)?)'; // tên thứ: bỏ qua
    if (tok === 'A' || tok === 'a') return '([^\\s\\d]+)';
    return '(\\d{1,2})';
  }
}

// =====================================================
// ISO (giá trị form) — không múi giờ
// =====================================================

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/**
 * Chuỗi ISO / Date / timestamp → Date địa phương | null.
 * Nhận: YYYY-MM-DD, YYYY-MM-DDTHH:mm[:ss], YYYY-MM, YYYY-Www, YYYY-Qn, YYYY, HH:mm[:ss] (ngày hôm nay).
 */
export function parseISO(value, { weekStart = localeWeekStart() } = {}) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isValidDate(value) ? cloneDate(value) : null;
  if (typeof value === 'number') return isValidDate(new Date(value)) ? new Date(value) : null;
  const s = String(value).trim();
  let m = ISO_DATE.exec(s);
  if (m) {
    const [y, mo, d, h = 0, mi = 0, sec = 0] = m.slice(1).map((x) => (x === undefined ? 0 : Number(x)));
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo - 1) || h > 23 || mi > 59 || sec > 59) return null;
    return makeDate(y, mo - 1, d, h, mi, sec);
  }
  if ((m = /^(\d{4})-(\d{2})$/.exec(s))) {
    const mo = Number(m[2]);
    return mo >= 1 && mo <= 12 ? makeDate(Number(m[1]), mo - 1, 1) : null;
  }
  if ((m = /^(\d{4})-W(\d{1,2})$/i.exec(s))) {
    const y = Number(m[1]);
    const w = Number(m[2]);
    const start = weekStartDate(y, w, weekStart);
    return w >= 1 && weekInfo(start, weekStart).week === w ? start : null;
  }
  if ((m = /^(\d{4})-Q([1-4])$/i.exec(s))) return makeDate(Number(m[1]), (Number(m[2]) - 1) * 3, 1);
  if ((m = /^(\d{4})$/.exec(s))) return makeDate(Number(m[1]), 0, 1);
  if ((m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s))) {
    const [h, mi, sec = 0] = m.slice(1).map((x) => Number(x || 0));
    if (h > 23 || mi > 59 || sec > 59) return null;
    const now = new Date();
    return makeDate(now.getFullYear(), now.getMonth(), now.getDate(), h, mi, sec);
  }
  return null;
}

/** Date → chuỗi giá trị form theo loại: date | datetime | datetime-seconds | week | month | quarter | year | time | time-seconds */
export function toISO(d, kind = 'date', { weekStart = localeWeekStart() } = {}) {
  if (!isValidDate(d)) return '';
  const date = `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  switch (kind) {
    case 'datetime': return `${date}T${time}`;
    case 'datetime-seconds': return `${date}T${time}:${pad(d.getSeconds())}`;
    case 'time': return time;
    case 'time-seconds': return `${time}:${pad(d.getSeconds())}`;
    case 'week': {
      const { year, week } = weekInfo(d, weekStart);
      return `${pad(year, 4)}-W${pad(week)}`;
    }
    case 'month': return date.slice(0, 7);
    case 'quarter': return `${pad(d.getFullYear(), 4)}-Q${quarterOf(d)}`;
    case 'year': return pad(d.getFullYear(), 4);
    default: return date;
  }
}

/** Mẫu hiển thị mặc định theo ngôn ngữ + loại picker */
export function defaultFormat(picker = 'date', { showTime = false, timeFormat = 'HH:mm' } = {}) {
  const en = getLocaleName() === 'en';
  switch (picker) {
    case 'week': return 'gggg-[W]ww';
    case 'month': return 'MM/YYYY';
    case 'quarter': return 'YYYY-[Q]Q';
    case 'year': return 'YYYY';
    case 'time': return timeFormat;
    default: {
      const date = en ? 'MM/DD/YYYY' : 'DD/MM/YYYY';
      return showTime ? `${date} ${timeFormat}` : date;
    }
  }
}
