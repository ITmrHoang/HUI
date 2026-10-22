/**
 * Nội dung ô của hui-table theo `type` cột (định dạng qua core/format.js).
 * Tương thích cột của hui-data-view (key, type, format, render, actions, colors, labels, srcKey, compare).
 *   type: text | number | currency | percent | date | datetime | time | relative | tag | avatar | progress | boolean | link | actions
 */

import { getPath } from '../../core/template.js';
import { format, formatCurrency, formatDate, formatNumber, formatPercent, relativeTime } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/hui-icon.js';

/**
 * Component con chỉ cần cho một số kiểu cột / tính năng → tải động lần đầu dùng (giữ bundle hui-table gọn).
 * Phần tử tạo trước khi định nghĩa xong vẫn tự nâng cấp (HuiElement giữ lại property đã gán).
 */
const LAZY = {
  'hui-avatar': () => import('../hui-avatar/index.js'),
  'hui-progress': () => import('../hui-progress/index.js'),
  'hui-tag': () => import('../hui-tag/index.js'),
  'hui-editable': () => import('../hui-editable/index.js'),
  'hui-radio': () => import('../hui-radio/index.js'),
  'hui-radio-group': () => import('../hui-radio/index.js'),
  'hui-result': () => import('../hui-result/index.js'),
};
const pending = new Map();
export function ensureElement(tag) {
  if (customElements.get(tag) || !LAZY[tag]) return Promise.resolve();
  if (!pending.has(tag)) pending.set(tag, LAZY[tag]().then(() => customElements.whenDefined(tag)));
  return pending.get(tag);
}

const NUMERIC = new Set(['number', 'currency', 'percent']);
const isBlank = (v) => v === null || v === undefined || v === '';

/** Giá trị của ô theo đường dẫn cột ("a.b.c") */
export const cellValue = (col, row, index) => (col.path ? getPath(row, col.path, index) : undefined);

/** Căn lề mặc định theo kiểu cột (số căn phải để dễ so hàng đơn vị) */
export function alignOf(col) {
  if (col.align) return col.align;
  if (NUMERIC.has(col.type)) return 'right';
  if (col.type === 'boolean' || col.type === 'progress') return 'center';
  return 'left';
}

/** Chuỗi hiển thị của ô kiểu chữ / số / ngày (`format`: hàm, hoặc tham số theo từng kiểu) */
export function formatCell(col, value, row) {
  const f = col.format;
  if (typeof f === 'function') return String(f(value, row) ?? '');
  switch (col.type) {
    case 'number': return formatNumber(value, typeof f === 'number' || (f && typeof f === 'object') ? f : {});
    case 'currency': return formatCurrency(value, typeof f === 'string' ? f : col.currency || 'VND');
    case 'percent': return formatPercent(value, typeof f === 'number' ? f : 1);
    case 'date': return formatDate(value, f || 'medium');
    case 'datetime': return formatDate(value, f || 'datetime');
    case 'time': return formatDate(value, 'time');
    case 'relative': return relativeTime(value);
    default:
      if (typeof f === 'string') return format(value, f);
      return isBlank(value) ? '' : String(value);
  }
}

const isUrl = (s) => typeof s === 'string' && /^(https?:|data:|blob:|\/|\.\/)/.test(s);

/** href của cột link: chuỗi mẫu "/users/{id}" | hàm (row) => url | mặc định = giá trị ô */
function hrefOf(col, row, value) {
  if (typeof col.href === 'function') return col.href(row, value);
  if (typeof col.href === 'string') return col.href.replace(/\{([\w.$]+)\}/g, (m, p) => encodeURIComponent(getPath(row, p) ?? ''));
  return value;
}

/**
 * Nội dung 1 ô (Node). ctx = { yes, no } — chữ cho trình đọc màn hình của cột boolean.
 * render(value, row, index) trả về Node | chuỗi → ưu tiên hơn `type`.
 */
export function renderCell(col, row, index, ctx = {}) {
  const value = cellValue(col, row, index);

  if (typeof col.render === 'function') {
    const out = col.render(value, row, index);
    return out instanceof Node ? out : document.createTextNode(isBlank(out) ? '' : String(out));
  }

  switch (col.type) {
    case 'tag': {
      const wrap = createElement('span', { className: 'cell-tags' });
      const values = Array.isArray(value) ? value : isBlank(value) ? [] : [value];
      for (const v of values) {
        const color = col.colors?.[v] ?? (typeof col.color === 'function' ? col.color(v, row) : col.color);
        ensureElement('hui-tag');
        const tag = createElement('hui-tag', { size: 'sm' }, String(col.labels?.[v] ?? v));
        if (color) tag.setAttribute('color', color);
        wrap.append(tag);
      }
      return wrap;
    }
    case 'avatar': {
      // value: "Tên" | "url ảnh" | { name, src }; srcKey: ảnh ở trường khác; descKey: dòng phụ dưới tên
      const obj = value && typeof value === 'object' ? value : null;
      const src = obj?.src ?? (col.srcKey ? getPath(row, col.srcKey) : isUrl(value) ? value : null);
      const name = obj?.name ?? (isUrl(value) ? '' : value);
      const desc = col.descKey ? getPath(row, col.descKey) : obj?.description;
      ensureElement('hui-avatar');
      const avatar = createElement('hui-avatar', { size: 'sm' });
      if (name) avatar.setAttribute('name', String(name));
      if (src) avatar.setAttribute('src', String(src));
      if (name) avatar.setAttribute('alt', String(name));
      const text = name ? createElement('span', { className: 'cell-avatar__text' },
        createElement('span', { className: 'cell-avatar__name' }, String(name)),
        isBlank(desc) ? null : createElement('span', { className: 'cell-avatar__desc' }, String(desc))) : null;
      return createElement('span', { className: 'cell-avatar' }, avatar, text);
    }
    case 'progress': {
      const n = Math.max(0, Math.min(100, Number(value) || 0));
      ensureElement('hui-progress');
      const p = createElement('hui-progress', { size: 'sm', percent: String(n) });
      if (col.titleText) p.setAttribute('label', col.titleText);
      if (n >= 100) p.setAttribute('status', 'success');
      return createElement('span', { className: 'cell-progress' }, p);
    }
    case 'boolean': {
      const on = Boolean(value) && value !== 'false' && value !== '0';
      return createElement('hui-icon', {
        name: on ? 'check' : 'close',
        className: on ? 'cell-bool cell-bool--on' : 'cell-bool cell-bool--off',
        label: on ? ctx.yes || 'Yes' : ctx.no || 'No',
      });
    }
    case 'link': {
      const href = hrefOf(col, row, value);
      const text = col.format ? formatCell(col, value, row) : isBlank(value) ? '' : String(value);
      if (isBlank(href)) return document.createTextNode(text);
      const a = createElement('a', { className: 'cell-link', part: 'link', href: String(href) }, text);
      if (col.target) {
        a.setAttribute('target', col.target);
        if (col.target === '_blank') a.setAttribute('rel', 'noopener noreferrer');
      }
      return a;
    }
    case 'actions': {
      const wrap = createElement('span', { className: 'cell-actions' });
      for (const action of col.actions || []) {
        const disabled = typeof action.disabled === 'function' ? action.disabled(row) : Boolean(action.disabled);
        const btn = createElement('button', {
          type: 'button',
          className: action.danger ? 'cell-action cell-action--danger' : 'cell-action',
          part: action.danger ? 'action action-danger' : 'action',
          dataset: { action: action.key },
          disabled,
        },
        action.icon ? createElement('hui-icon', { name: action.icon }) : null,
        action.label ? createElement('span', {}, String(action.label)) : null);
        // Nút chỉ có icon → cần tên cho trình đọc màn hình
        if (!action.label) btn.setAttribute('aria-label', String(action.ariaLabel || action.key));
        wrap.append(btn);
      }
      return wrap;
    }
    default:
      return document.createTextNode(formatCell(col, value, row));
  }
}

/** Ghi giá trị theo đường dẫn "a.b.c" (tạo object trung gian khi thiếu) */
export function setPath(row, path, value) {
  const keys = String(path).split('.');
  let o = row;
  for (const k of keys.slice(0, -1)) {
    if (o[k] === null || typeof o[k] !== 'object') o[k] = {};
    o = o[k];
  }
  o[keys[keys.length - 1]] = value;
}

/** Chữ của ô khi xuất CSV: formatted = như trên bảng (tiền, ngày, nhãn tag…), false = giá trị gốc */
export function exportText(col, row, formatted, ctx = {}) {
  const v = cellValue(col, row);
  if (col.exportValue) return col.exportValue(v, row);
  const list = Array.isArray(v) ? v : null;
  if (!formatted || col.type === 'progress' || col.type === 'link') {
    if (list) return list.join('; ');
    return v && typeof v === 'object' && !(v instanceof Date) ? v.name ?? JSON.stringify(v) : v;
  }
  switch (col.type) {
    case 'tag': return (list || (isBlank(v) ? [] : [v])).map((x) => col.labels?.[x] ?? x).join('; ');
    case 'avatar': return v && typeof v === 'object' ? v.name : v;
    case 'boolean': return Boolean(v) && v !== 'false' && v !== '0' ? ctx.yes || 'Yes' : ctx.no || 'No';
    default: return formatCell(col, v, row);
  }
}

/** Giá trị dùng để so sánh khi sắp xếp mặc định (ngày → timestamp) */
export function sortValue(col, row) {
  const v = cellValue(col, row);
  if (col.type === 'date' || col.type === 'datetime' || col.type === 'time' || col.type === 'relative') {
    const t = v instanceof Date ? v.getTime() : Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  if (v && typeof v === 'object' && 'name' in v) return v.name; // avatar { name, src }
  return v;
}
