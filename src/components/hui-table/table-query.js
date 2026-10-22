/**
 * Xử lý cột + dữ liệu của hui-table (thuần JS, không DOM):
 * chuẩn hóa cột (gộp tiêu đề nhiều tầng), lọc / sắp xếp đệ quy cho dữ liệu cây.
 */

import { intlLocale } from '../../core/format.js';
import { sortValue, cellValue } from './table-cells.js';

/** 'ascend' / 'descend' (kiểu Ant) → 'asc' / 'desc' */
export const normOrder = (o) => (o === 'asc' || o === 'ascend' ? 'asc' : o === 'desc' || o === 'descend' ? 'desc' : null);

/** Bỏ dấu tiếng Việt + chữ thường (tìm trong bộ lọc) */
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const toPx = (w) => (w === undefined || w === null || w === '' ? null : typeof w === 'number' || /^\d+(\.\d+)?$/.test(String(w)) ? `${w}px` : String(w));

/**
 * Chuẩn hóa cây cột → { roots, leaves, depth }.
 * Lá có leafIndex; nút có level, colSpan, rowSpan (dựng thead nhiều hàng), fixed kế thừa từ cột cha.
 */
export function normalizeColumns(columns) {
  const leaves = [];
  let depth = 1;
  let auto = 0;

  const walk = (list, level, parentFixed) => list.filter(Boolean).map((src) => {
    const kidsSrc = Array.isArray(src.children) && src.children.length ? src.children : null;
    const path = Array.isArray(src.dataIndex) ? src.dataIndex.join('.') : src.dataIndex ?? src.key ?? null;
    const key = String(src.key ?? path ?? `col-${auto++}`);
    const fixed = src.fixed === true ? 'left' : src.fixed === 'left' || src.fixed === 'right' ? src.fixed : parentFixed;
    const sorter = typeof src.sorter === 'function' ? src.sorter
      : typeof src.compare === 'function' ? src.compare
        : src.sorter || src.sortable ? true : null;
    const col = {
      src,
      key,
      path: path === null ? null : String(path),
      title: src.title,
      titleText: typeof src.title === 'string' || typeof src.title === 'number' ? String(src.title) : String(src.titleText ?? key),
      type: src.type || 'text',
      width: toPx(src.width),
      minWidth: Number.parseFloat(src.minWidth) || null,
      maxWidth: Number.parseFloat(src.maxWidth) || null,
      align: src.align,
      fixed: fixed || null,
      ellipsis: Boolean(src.ellipsis),
      sorter,
      sortDirections: (Array.isArray(src.sortDirections) ? src.sortDirections.map(normOrder).filter(Boolean) : null) || ['asc', 'desc'],
      defaultSortOrder: normOrder(src.defaultSortOrder),
      filters: Array.isArray(src.filters) ? src.filters : null,
      onFilter: typeof src.onFilter === 'function' ? src.onFilter : null,
      filterSearch: src.filterSearch || false,
      filterMultiple: src.filterMultiple !== false,
      defaultFilteredValue: Array.isArray(src.defaultFilteredValue) ? src.defaultFilteredValue : null,
      resizable: src.resizable,
      level,
      kids: null,
      // Thuộc tính riêng của từng type (format, render, actions, colors, labels, srcKey, href…) đọc thẳng từ src
      format: src.format,
      render: src.render,
      currency: src.currency,
      colors: src.colors,
      color: src.color,
      labels: src.labels,
      srcKey: src.srcKey,
      descKey: src.descKey,
      href: src.href,
      target: src.target,
      actions: src.actions,
      className: src.className,
      // Sửa tại chỗ (hui-editable) + xuất CSV
      editable: src.editable,
      editor: src.editor,
      options: src.options,
      exportable: src.exportable !== false && src.type !== 'actions',
      exportValue: typeof src.exportValue === 'function' ? src.exportValue : null,
    };
    depth = Math.max(depth, level + 1);
    if (kidsSrc) {
      col.kids = walk(kidsSrc, level + 1, col.fixed);
    } else {
      col.leafIndex = leaves.length;
      leaves.push(col);
    }
    return col;
  });

  const roots = walk(Array.isArray(columns) ? columns : [], 0, null);
  // colSpan = số lá bên dưới; rowSpan: lá kéo xuống tới hàng tiêu đề cuối
  const span = (col) => {
    if (!col.kids) {
      col.colSpan = 1;
      col.rowSpan = depth - col.level;
      col.first = col.leafIndex;
      col.last = col.leafIndex;
      return 1;
    }
    col.colSpan = col.kids.reduce((n, k) => n + span(k), 0);
    col.rowSpan = 1;
    col.first = col.kids[0].first;
    col.last = col.kids[col.kids.length - 1].last;
    return col.colSpan;
  };
  roots.forEach(span);
  return { roots, leaves, depth };
}

/** Các hàng tiêu đề: rows[level] = cột ở tầng đó (theo thứ tự trái → phải) */
export function headerRows({ roots, depth }) {
  const rows = Array.from({ length: depth }, () => []);
  const visit = (col) => {
    rows[col.level].push(col);
    col.kids?.forEach(visit);
  };
  roots.forEach(visit);
  return rows;
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

/** So sánh mặc định: rỗng xuống cuối, số theo giá trị, chữ theo ngôn ngữ (số trong chuỗi so như số) */
export function defaultCompare(a, b) {
  const ea = a === null || a === undefined || a === '';
  const eb = b === null || b === undefined || b === '';
  if (ea || eb) return ea && eb ? 0 : ea ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' || typeof b === 'boolean') return Number(a) - Number(b);
  return compareText(String(a), String(b));
}

/** Một dòng có khớp các bộ lọc đang bật không (OR trong 1 cột, AND giữa các cột) */
function matchRow(row, active) {
  for (const { col, values } of active) {
    const ok = values.some((v) => {
      if (col.onFilter) return col.onFilter(v, row);
      const cell = cellValue(col, row);
      return Array.isArray(cell) ? cell.some((c) => String(c) === String(v)) : String(cell) === String(v);
    });
    if (!ok) return false;
  }
  return true;
}

/**
 * Lọc + sắp xếp (đệ quy theo cây). Không sửa dữ liệu gốc: con đã xử lý nằm trong Map `kids`.
 * @returns {{ rows: object[], kids: Map<object, object[]> }}
 */
export function processRows(data, { leaves, filters, sorters, childrenKey, tree }) {
  const byKey = new Map(leaves.map((c) => [c.key, c]));
  const active = Object.entries(filters || {})
    .map(([key, values]) => ({ col: byKey.get(key), values }))
    .filter((f) => f.col && Array.isArray(f.values) && f.values.length);
  const sorts = (sorters || [])
    .map((s) => ({ col: byKey.get(s.key), order: s.order }))
    .filter((s) => s.col && s.col.sorter && s.order);
  const kids = new Map();

  const cmp = (a, b) => {
    for (const { col, order } of sorts) {
      const r = typeof col.sorter === 'function'
        ? col.sorter(a, b, order)
        : defaultCompare(sortValue(col, a), sortValue(col, b));
      if (r) return order === 'desc' ? -r : r;
    }
    return 0;
  };

  const run = (list) => {
    let out = [];
    for (const row of list) {
      const children = tree && row && Array.isArray(row[childrenKey]) && row[childrenKey].length ? run(row[childrenKey]) : null;
      if (children) kids.set(row, children);
      if (!active.length || matchRow(row, active) || (children && children.length)) out.push(row);
    }
    if (sorts.length) out = out.map((r, i) => [r, i]).sort((x, y) => cmp(x[0], y[0]) || x[1] - y[1]).map((x) => x[0]);
    return out;
  };

  return { rows: run(Array.isArray(data) ? data : []), kids };
}
