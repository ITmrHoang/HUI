/**
 * Ô bảng (chế độ table) của hui-data-view — bản gọn, đủ cho trang danh sách.
 * (Bảng đầy đủ: cố định cột, gộp ô, mở rộng dòng… sẽ là hui-table ở G3.)
 *
 * column = { key, title, type, sortable, width, align, format, render, actions, colors, color, labels, srcKey, compare }
 *   type: text | number | currency | percent | date | datetime | relative | tag | avatar | progress | boolean | actions
 */

import { getPath } from '../../core/template.js';
import { format, formatCurrency, formatDate, formatNumber, formatPercent, relativeTime } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { ensureElement } from './lazy-elements.js';
import '../hui-icon/hui-icon.js';

const NUMERIC = new Set(['number', 'currency', 'percent']);

/** Căn lề mặc định theo kiểu cột (số căn phải để dễ so sánh hàng đơn vị) */
export function alignOf(column) {
  if (column.align) return column.align;
  if (NUMERIC.has(column.type)) return 'right';
  if (column.type === 'boolean') return 'center';
  return 'left';
}

/** Chuỗi hiển thị của ô kiểu chữ / số / ngày (`format`: hàm, hoặc tham số theo từng kiểu) */
export function formatCell(column, value, item) {
  const f = column.format;
  if (typeof f === 'function') return String(f(value, item) ?? '');
  switch (column.type) {
    case 'number': return formatNumber(value, typeof f === 'number' || (f && typeof f === 'object') ? f : {});
    case 'currency': return formatCurrency(value, typeof f === 'string' ? f : column.currency || 'VND');
    case 'percent': return formatPercent(value, typeof f === 'number' ? f : 1);
    case 'date': return formatDate(value, f || 'medium');
    case 'datetime': return formatDate(value, f || 'datetime');
    case 'relative': return relativeTime(value);
    default:
      if (typeof f === 'string') return format(value, f);
      return value === null || value === undefined ? '' : String(value);
  }
}

const isUrl = (s) => typeof s === 'string' && /^(https?:|data:|blob:|\/|\.\/)/.test(s);

/**
 * Nội dung 1 ô. `ctx` = { yes, no } (chữ cho trình đọc màn hình của cột boolean).
 * @returns {Node}
 */
export function renderCell(column, item, index, ctx = {}) {
  const value = column.key ? getPath(item, column.key, index) : undefined;

  if (typeof column.render === 'function') {
    const out = column.render(value, item, index);
    return out instanceof Node ? out : document.createTextNode(out === null || out === undefined ? '' : String(out));
  }

  switch (column.type) {
    case 'tag': {
      const wrap = createElement('span', { className: 'cell-tags' });
      ensureElement('hui-tag'); // thẻ con tải động khi có cột dùng tới
      const values = Array.isArray(value) ? value : value === null || value === undefined || value === '' ? [] : [value];
      for (const v of values) {
        const color = column.colors?.[v] ?? (typeof column.color === 'function' ? column.color(v, item) : column.color);
        const tag = createElement('hui-tag', { size: 'sm' }, String(column.labels?.[v] ?? v));
        if (color) tag.setAttribute('color', color);
        wrap.append(tag);
      }
      return wrap;
    }
    case 'avatar': {
      // value: "Tên" | "url ảnh" | { name, src }; srcKey: đọc ảnh từ trường khác của item
      const obj = value && typeof value === 'object' ? value : null;
      const src = obj?.src ?? (column.srcKey ? getPath(item, column.srcKey) : isUrl(value) ? value : null);
      const name = obj?.name ?? (isUrl(value) ? '' : value);
      ensureElement('hui-avatar');
      const avatar = createElement('hui-avatar', { size: 'sm' });
      if (name) avatar.setAttribute('name', String(name));
      if (src) avatar.setAttribute('src', String(src));
      if (name) avatar.setAttribute('alt', String(name));
      return createElement('span', { className: 'cell-avatar' }, avatar, name ? createElement('span', { className: 'cell-avatar__name' }, String(name)) : null);
    }
    case 'progress': {
      ensureElement('hui-progress');
      const p = createElement('hui-progress', { size: 'sm', percent: String(Number(value) || 0) });
      if (column.title) p.setAttribute('label', String(column.title));
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
    case 'actions': {
      const wrap = createElement('span', { className: 'cell-actions' });
      for (const action of column.actions || []) {
        const btn = createElement('button', {
          type: 'button',
          className: action.danger ? 'cell-action cell-action--danger' : 'cell-action',
          part: action.danger ? 'action action-danger' : 'action',
          dataset: { action: action.key },
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
      return document.createTextNode(formatCell(column, value, item));
  }
}

/** Dựng 1 ô <td> (căn lề + nội dung) */
export function createCell(column, item, index, ctx) {
  const td = createElement('td', { className: `cell cell--${column.type || 'text'}`, part: 'cell' });
  td.style.textAlign = alignOf(column);
  td.append(renderCell(column, item, index, ctx));
  return td;
}

/** Dựng ô tiêu đề <th>; cột sortable có nút bấm + mũi tên đôi (CSS) */
export function createHeaderCell(column) {
  const align = alignOf(column);
  const th = createElement('th', { scope: 'col', className: `th th--${column.type || 'text'} th--align-${align}`, part: 'th' });
  th.style.textAlign = align;
  if (column.width !== undefined && column.width !== null && column.width !== '') {
    th.style.width = typeof column.width === 'number' || /^\d+$/.test(String(column.width)) ? `${column.width}px` : String(column.width);
  }
  const label = String(column.title ?? column.key ?? '');
  if (column.sortable && column.key) {
    th.classList.add('th--sortable');
    const btn = createElement('button', { type: 'button', className: 'th__sort', part: 'sort-button', dataset: { sortKey: column.key } },
      createElement('span', {}, label),
      createElement('span', { className: 'sorter', 'aria-hidden': 'true' }));
    th.append(btn);
    th.setAttribute('aria-sort', 'none');
  } else {
    th.textContent = label;
  }
  return th;
}
