/**
 * Tiện ích thuần cho dữ liệu dạng cây — dùng chung hui-tree, hui-tree-select, hui-cascader, hui-transfer.
 * Không phụ thuộc component (chỉ highlight() / svgIcon() tạo DOM) → import riêng được:
 *   import { buildIndex, flattenTree, conductCheck, findPath } from '@itmrhoang/h-ui/hui-tree';
 *
 * Khóa node = node.key ?? node.value (Tree dùng key, Cascader/TreeSelect dùng value).
 * Bên trong so khớp theo String(khóa) → '1' và 1 coi là một; đầu ra trả lại khóa GỐC (giữ kiểu).
 */

import { t, getLocaleName } from '../../core/locale.js';
import { getIcon } from '../hui-icon/icons.js';

// =====================================================
// CHUỖI: locale dự phòng + khớp không dấu
// =====================================================

/** t() + bảng chuỗi dự phòng khi locale.js chưa có key */
export function msg(key, vars, table = {}) {
  let v = t(key, vars);
  if (v !== key) return v;
  v = table[key]?.[getLocaleName()] || table[key]?.en || key;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : v;
}

/** Bỏ dấu + chữ thường: "Hà Nội" → "ha noi", "Đà Nẵng" → "da nang" */
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/**
 * Vị trí [start, end) của `query` trong `text` (khớp không dấu, không phân biệt hoa thường), null nếu không khớp.
 * Gập dấu từng ký tự và ghi lại chỉ số gốc → tô đúng đoạn trong chuỗi CÓ dấu.
 */
export function matchRange(text, query) {
  const q = fold(query).trim();
  if (!q) return null;
  const src = String(text ?? '');
  let norm = '';
  const map = [];
  for (let i = 0; i < src.length; i++) {
    const f = fold(src[i]);
    for (let k = 0; k < f.length; k++) {
      norm += f[k];
      map.push(i);
    }
  }
  const idx = norm.indexOf(q);
  if (idx < 0) return null;
  return [map[idx], map[idx + q.length - 1] + 1];
}

/** <svg> nhỏ từ registry icon (nội dung do thư viện / dự án đăng ký) — dùng trong danh sách dài thay <hui-icon> */
export function svgIcon(name, className = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  if (className) s.setAttribute('class', className);
  s.innerHTML = getIcon(name) || '';
  return s;
}

/** Các node chữ, phần khớp bọc <mark part="highlight"> */
export function highlight(text, query, className = 'hui-mark') {
  const src = String(text ?? '');
  const range = query ? matchRange(src, query) : null;
  if (!range) return [document.createTextNode(src)];
  const [a, b] = range;
  const mark = document.createElement('mark');
  mark.className = className;
  mark.setAttribute('part', 'highlight');
  mark.textContent = src.slice(a, b);
  return [document.createTextNode(src.slice(0, a)), mark, document.createTextNode(src.slice(b))];
}

// =====================================================
// CHỈ MỤC CÂY
// =====================================================

export const keyOf = (node) => (node == null ? undefined : node.key ?? node.value);
export const childrenOf = (node) => node?.children;

/** Ký tự nối khóa theo đường dẫn (buildIndex pathIds) */
export const PATH_SEP = '\u001f';

/**
 * Lập chỉ mục cây: { map: Map<id, entry>, roots: entry[] }.
 * entry = { id: String(key), key, node, parent, depth, index (vị trí trong anh em), order (thứ tự duyệt trước), children }
 * `pathIds`: id = khóa cha + PATH_SEP + khóa (và key = id) — cho dữ liệu chỉ duy nhất trong cùng cấp (Cascader).
 */
export function buildIndex(data, { key = keyOf, children = childrenOf, pathIds = false } = {}) {
  const map = new Map();
  let order = 0;
  const visit = (nodes, parent, depth) => nodes.map((node, index) => {
    const raw = key(node);
    const id = pathIds && parent ? `${parent.id}${PATH_SEP}${raw}` : String(raw);
    const k = pathIds ? id : raw;
    const entry = { id, key: k, node, parent, depth, index, order: order++, children: [] };
    map.set(entry.id, entry);
    const kids = children(node);
    if (Array.isArray(kids)) entry.children = visit(kids, entry, depth + 1);
    return entry;
  });
  return { map, roots: visit(Array.isArray(data) ? data : [], null, 0) };
}

const asIndex = (src) => (src && src.map instanceof Map ? src : buildIndex(src));

/** Danh sách node từ gốc tới node có khóa `key` ([] nếu không có). Nhận data hoặc index */
export function findPath(src, key) {
  const out = [];
  for (let e = asIndex(src).map.get(String(key)); e; e = e.parent) out.unshift(e.node);
  return out;
}

/** `a` là tổ tiên của `b` */
export function isAncestor(a, b) {
  for (let p = b?.parent; p; p = p.parent) if (p === a) return true;
  return false;
}

/** Tập id → mảng khóa gốc theo thứ tự duyệt cây (id không có trong cây giữ nguyên ở cuối) */
export function idsToKeys(index, ids) {
  const known = [];
  const unknown = [];
  for (const id of ids) {
    const e = index.map.get(String(id));
    if (e) known.push(e);
    else unknown.push(id);
  }
  known.sort((a, b) => a.order - b.order);
  return [...known.map((e) => e.key), ...unknown];
}

/**
 * Làm phẳng các node đang hiển thị (cha đã mở) → mảng dòng để vẽ / virtual scroll.
 * Mỗi dòng: { entry, last, setSize, posInSet, lines } — lines[c] = tổ tiên ở độ sâu c còn anh em phía sau
 * (dùng vẽ đường nối show-line). `expanded`: Set<id> hoặc true (mở tất cả); `include(entry)` lọc node.
 */
export function flattenTree(index, expanded, { include } = {}) {
  const rows = [];
  const open = (e) => expanded === true || expanded.has(e.id);
  const walk = (entries, lines) => {
    const list = include ? entries.filter(include) : entries;
    list.forEach((entry, i) => {
      const last = i === list.length - 1;
      rows.push({ entry, last, setSize: list.length, posInSet: i + 1, lines });
      if (entry.children.length && open(entry)) walk(entry.children, [...lines, !last]);
    });
  };
  walk(index.roots, []);
  return rows;
}

// =====================================================
// CHECK CHA – CON (conduct)
// =====================================================

/** Node tham gia liên kết check (không disabled / disableCheckbox) */
export const isCheckable = (e) => Boolean(e) && !e.node.disabled && !e.node.disableCheckbox;

/**
 * Tính trạng thái check đầy đủ từ danh sách khóa:
 * - xuống: node đã check → mọi con cháu check được cũng check;
 * - lên: cha check khi TẤT CẢ con check được đã check, nửa (half) khi có một phần.
 * `strictly` = cha con độc lập (không lan). Trả về { checked: Set<id>, half: Set<id> }.
 */
export function conductCheck(src, keys, { strictly = false } = {}) {
  const index = asIndex(src);
  const checked = new Set([...(keys || [])].map(String));
  const half = new Set();
  if (strictly) return { checked, half };

  const down = (e) => {
    for (const c of e.children) {
      if (!isCheckable(c)) continue;
      checked.add(c.id);
      down(c);
    }
  };
  for (const id of [...checked]) {
    const e = index.map.get(id);
    if (isCheckable(e)) down(e);
  }

  // Duyệt sau (con trước cha) để trạng thái cha tính từ con đã chốt
  const up = (e) => {
    if (!e.children.length) return;
    e.children.forEach(up);
    if (!isCheckable(e)) return;
    const kids = e.children.filter(isCheckable);
    if (!kids.length) return;
    if (kids.every((c) => checked.has(c.id))) {
      checked.add(e.id);
    } else {
      checked.delete(e.id);
      if (kids.some((c) => checked.has(c.id) || half.has(c.id))) half.add(e.id);
    }
  };
  index.roots.forEach(up);
  return { checked, half };
}

/** Bật/tắt check của 1 node rồi tính lại toàn cây. `checked`: Set<id> đã conduct */
export function toggleCheck(src, checked, key, on, { strictly = false } = {}) {
  const index = asIndex(src);
  const next = new Set(checked);
  const e = index.map.get(String(key));
  if (!e) return conductCheck(index, next, { strictly });
  if (strictly) {
    if (on) next.add(e.id);
    else next.delete(e.id);
    return { checked: next, half: new Set() };
  }
  const mark = (x) => {
    if (on) next.add(x.id);
    else next.delete(x.id);
    for (const c of x.children) if (isCheckable(c)) mark(c);
  };
  mark(e);
  if (!on) for (let p = e.parent; p; p = p.parent) next.delete(p.id);
  return conductCheck(index, next);
}

/**
 * Rút gọn tập đã check theo chiến lược hiển thị (TreeSelect showCheckedStrategy):
 * all — mọi node; parent — chỉ node mà cha chưa check; child — chỉ node không có con nào đang check (lá).
 * Trả về mảng khóa gốc theo thứ tự cây.
 */
export function strategyKeys(src, checked, strategy = 'all') {
  const index = asIndex(src);
  const ids = [...checked].filter((id) => {
    const e = index.map.get(String(id));
    if (!e || strategy === 'all') return true;
    if (strategy === 'parent') return !e.parent || !checked.has(e.parent.id);
    return !e.children.some((c) => checked.has(c.id));
  });
  return idsToKeys(index, ids);
}

// =====================================================
// TÌM KIẾM
// =====================================================

/** Chữ thuần của nhãn (bỏ qua nhãn là Node / hàm) */
export const textOf = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

/**
 * Lọc cây theo chữ (không dấu). Trả về null khi query rỗng, ngược lại
 * { matched, ancestors, visible } — visible = khớp ∪ tổ tiên ∪ con cháu của node khớp.
 */
export function filterTree(src, query, labelOf = (n) => n.title ?? n.label) {
  if (!fold(query).trim()) return null;
  const index = asIndex(src);
  const matched = new Set();
  const ancestors = new Set();
  for (const e of index.map.values()) {
    if (!matchRange(textOf(labelOf(e.node)), query)) continue;
    matched.add(e.id);
    for (let p = e.parent; p && !ancestors.has(p.id); p = p.parent) ancestors.add(p.id);
  }
  const visible = new Set([...matched, ...ancestors]);
  const addDown = (e) => e.children.forEach((c) => {
    visible.add(c.id);
    addDown(c);
  });
  for (const id of matched) addDown(index.map.get(id));
  return { matched, ancestors, visible };
}

// =====================================================
// KÉO THẢ
// =====================================================

/**
 * Chuyển node `dragKey` tới cạnh / vào trong node `dropKey` — SỬA TRỰC TIẾP mảng `data` (giữ nguyên object node).
 * position: before | after | inside (thành con đầu tiên). Trả về false nếu không hợp lệ (thả vào chính nó / con cháu).
 */
export function moveNode(data, dragKey, dropKey, position) {
  const index = buildIndex(data);
  const drag = index.map.get(String(dragKey));
  const drop = index.map.get(String(dropKey));
  if (!drag || !drop || drag === drop || isAncestor(drag, drop)) return false;
  const from = drag.parent ? drag.parent.node.children : data;
  from.splice(from.indexOf(drag.node), 1);
  if (position === 'inside') {
    if (!Array.isArray(drop.node.children)) drop.node.children = [];
    drop.node.children.unshift(drag.node);
  } else {
    const to = drop.parent ? drop.parent.node.children : data;
    const i = to.indexOf(drop.node);
    to.splice(position === 'after' ? i + 1 : i, 0, drag.node);
  }
  return true;
}
