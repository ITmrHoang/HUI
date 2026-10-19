/**
 * Xử lý dữ liệu phía client cho hui-data-view: tìm kiếm (bỏ dấu tiếng Việt) → lọc → sắp xếp.
 * Tách riêng để dễ đọc + dễ test; không phụ thuộc DOM.
 */

import { getPath } from '../../core/template.js';
import { intlLocale } from '../../core/format.js';

const COMBINING = /[̀-ͯ]/g;

/** "Áo Thun ĐỎ" → "ao thun do" (NFD + bỏ dấu tổ hợp; đ/Đ không tách được bằng NFD nên đổi tay) */
export function foldText(str) {
  return String(str ?? '').normalize('NFD').replace(COMBINING, '').replace(/[đĐ]/g, 'd').toLowerCase();
}

/** "name, brand" → ['name', 'brand']; rỗng → null (= mọi trường chuỗi) */
export function parseList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  const list = String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : null;
}

/** Cache chuỗi tìm kiếm đã bỏ dấu của từng item: item → { fields, text } */
const haystacks = new WeakMap();

/** Gom chuỗi tìm kiếm của 1 item (theo `fields`, hoặc mọi giá trị chuỗi / số cấp 1 khi không chỉ định) */
function haystackOf(item, fields) {
  if (item === null || typeof item !== 'object') return foldText(item);
  const sig = fields ? fields.join(',') : '*';
  const cached = haystacks.get(item);
  if (cached && cached.sig === sig) return cached.text;
  const parts = [];
  if (fields) {
    for (const f of fields) {
      const v = getPath(item, f);
      if (Array.isArray(v)) parts.push(...v.filter((x) => typeof x !== 'object'));
      else if (v !== null && v !== undefined && typeof v !== 'object') parts.push(v);
    }
  } else {
    for (const v of Object.values(item)) if (typeof v === 'string') parts.push(v);
  }
  const text = foldText(parts.join(' \u0001 '));
  haystacks.set(item, { sig, text });
  return text;
}

/** Item khớp khi chứa ĐỦ mọi từ khóa (AND), không phân biệt dấu / hoa thường */
export function matchesSearch(item, query, fields) {
  const tokens = foldText(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const text = haystackOf(item, fields);
  return tokens.every((tk) => text.includes(tk));
}

/**
 * Lọc theo bộ lọc chip: { category: ['ao', 'quan'], inStock: ['true'] }.
 * Trong 1 nhóm: khớp 1 giá trị bất kỳ (OR); giữa các nhóm: phải khớp hết (AND).
 * Giá trị item là mảng (tags) → khớp khi có giao nhau. So sánh dạng chuỗi.
 * `defs` (cấu hình filters) cho phép mỗi nhóm có hàm `match(item, values)` riêng.
 */
export function matchesFilters(item, filters, defs = []) {
  for (const [key, values] of Object.entries(filters || {})) {
    if (!values || !values.length) continue;
    const def = defs.find((d) => d.key === key);
    if (typeof def?.match === 'function') {
      if (!def.match(item, values)) return false;
      continue;
    }
    const raw = getPath(item, def?.field || key);
    const list = Array.isArray(raw) ? raw.map(String) : [String(raw)];
    if (!values.some((v) => list.includes(String(v)))) return false;
  }
  return true;
}

let collator = null;
let collatorLocale = '';
function compareText(a, b) {
  const loc = intlLocale();
  if (!collator || collatorLocale !== loc) {
    collator = new Intl.Collator(loc, { numeric: true, sensitivity: 'base' });
    collatorLocale = loc;
  }
  return collator.compare(a, b);
}

/** So sánh mặc định: rỗng luôn xếp cuối; số / boolean / Date theo giá trị; còn lại theo chữ (locale, số tự nhiên) */
export function defaultCompare(a, b) {
  const blankA = a === null || a === undefined || a === '';
  const blankB = b === null || b === undefined || b === '';
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() - new Date(b).getTime();
  if ((typeof a === 'number' || typeof a === 'boolean') && (typeof b === 'number' || typeof b === 'boolean')) return Number(a) - Number(b);
  return compareText(String(a), String(b));
}

/**
 * Sắp xếp ổn định (giữ thứ tự gốc khi bằng nhau) theo `key`.
 * `compare(a, b)` tùy chọn so sánh 2 ITEM (không phải 2 giá trị).
 */
export function sortRows(rows, key, order = 'asc', compare = null) {
  if (!key) return rows;
  const dir = order === 'desc' ? -1 : 1;
  return rows
    .map((item, i) => ({ item, i }))
    .sort((x, y) => {
      let r;
      if (compare) r = compare(x.item, y.item);
      else {
        const a = getPath(x.item, key);
        const b = getPath(y.item, key);
        r = defaultCompare(a, b);
        // Giá trị rỗng luôn nằm cuối, kể cả khi giảm dần
        const blank = (v) => v === null || v === undefined || v === '';
        if (blank(a) !== blank(b)) return r;
      }
      return r * dir || x.i - y.i;
    })
    .map((x) => x.item);
}

/** Toàn bộ pipeline client: tìm → lọc → sắp xếp (chưa phân trang) */
export function processRows(data, { q = '', fields = null, filters = {}, filterDefs = [], sort = null, order = 'asc', compare = null } = {}) {
  let rows = Array.isArray(data) ? data : [];
  if (q && q.trim()) rows = rows.filter((item) => matchesSearch(item, q, fields));
  if (Object.values(filters || {}).some((v) => v && v.length)) rows = rows.filter((item) => matchesFilters(item, filters, filterDefs));
  if (sort) rows = sortRows(rows === data ? rows.slice() : rows, sort, order, compare);
  return rows;
}
