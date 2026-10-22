/**
 * HUI Tree — Cây phân cấp (Ant Tree + MUI TreeView), bàn phím theo WAI-ARIA APG Tree.
 * Dữ liệu `data` [{ key, title, icon, children, isLeaf, disabled, disableCheckbox, selectable }],
 * check cha–con liên kết (nửa chọn), chọn một / nhiều, tải con bất đồng bộ (loadData), đường nối (show-line),
 * tìm kiếm không dấu (filter-value), kéo thả sắp xếp (drag-reorder), virtual scroll (virtual + height).
 * Cây luôn được làm phẳng thành các dòng role=treeitem (aria-level / setsize / posinset) → cùng một
 * cách vẽ cho cả chế độ thường lẫn virtual. Logic dữ liệu nằm ở ./tree-utils.js (dùng lại được).
 */

import styles from './hui-tree.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { VirtualWindow } from '../../utils/virtual.js';
import { animationsDisabled } from '../../utils/animate.js';
import { floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import '../hui-icon/hui-icon.js';
import '../hui-empty/hui-empty.js';
import {
  buildIndex, flattenTree, conductCheck, toggleCheck, filterTree, highlight, moveNode,
  idsToKeys, isAncestor, isCheckable, fold, textOf, msg, svgIcon,
} from './tree-utils.js';

const FALLBACK = {
  'tree.label': { vi: 'Cây thư mục', en: 'Tree' },
  'tree.empty': { vi: 'Không có dữ liệu', en: 'No data' },
  'tree.notFound': { vi: 'Không tìm thấy kết quả phù hợp', en: 'No matching results' },
  'tree.loading': { vi: 'Đang tải {title}...', en: 'Loading {title}...' },
  'tree.moved': { vi: 'Đã chuyển {title}', en: 'Moved {title}' },
};
const m = (key, vars) => msg(key, vars, FALLBACK);

/** Chiều cao dòng dự phòng (px) khi chưa đo được — theo size */
const ROW_HEIGHT = { sm: 24, md: 28, lg: 34 };
const TYPEAHEAD_MS = 600;
const DRAG_THRESHOLD = 5;
const TOUCH_HOLD_MS = 350;
const AUTO_EXPAND_MS = 650;

/**
 * Cây phân cấp có chọn / check / tải động / tìm kiếm / kéo thả / virtual.
 * @fires hui-select - Chọn / bỏ chọn node (cancelable). detail: { selectedKeys, node, selected }
 * @fires hui-check - Check / bỏ check (cancelable). detail: { checkedKeys, halfCheckedKeys, node, checked }
 * @fires hui-expand - Mở / đóng node. detail: { expandedKeys, node, expanded }
 * @fires hui-load - loadData xong. detail: { node, loadedKeys }
 * @fires hui-drop - Thả node khi kéo (cancelable — preventDefault để tự xử lý). detail: { dragNode, dropNode, dragKey, dropKey, position: 'before' | 'inside' | 'after' }
 * @slot empty - Nội dung khi cây trống / không có kết quả lọc (mặc định <hui-empty>)
 * @csspart base - Khung ngoài (vùng cuộn khi có height)
 * @csspart tree - Phần tử role=tree
 * @csspart node - Mỗi dòng (+ node-selected / node-active / node-disabled / node-match / node-leaf / node-open / node-dragging / node-drop-inside)
 * @csspart indent - Vùng thụt lề (+ đường nối khi show-line)
 * @csspart switcher - Nút mở / đóng (mũi tên)
 * @csspart loading - Vòng xoay khi đang tải con
 * @csspart checkbox - Ô check (+ checkbox-checked / checkbox-indeterminate / checkbox-disabled)
 * @csspart content - Vùng icon + chữ (nhận nền hover / chọn / viền focus)
 * @csspart icon - Icon node (show-icon)
 * @csspart title - Chữ của node
 * @csspart highlight - Phần chữ khớp tìm kiếm (<mark>)
 * @csspart empty - Vùng trống
 * @csspart drop-indicator - Vạch báo vị trí thả
 * @csspart drag-ghost - Nhãn bay theo con trỏ khi kéo
 * @cssprop --hui-tree-node-height - Chiều cao mỗi dòng
 * @cssprop --hui-tree-indent - Độ thụt mỗi cấp
 * @cssprop --hui-tree-font-size - Cỡ chữ
 * @cssprop --hui-tree-color - Màu chữ
 * @cssprop --hui-tree-bg - Nền cây
 * @cssprop --hui-tree-node-radius - Bo góc dòng
 * @cssprop --hui-tree-node-hover-bg - Nền dòng khi hover
 * @cssprop --hui-tree-node-selected-bg - Nền dòng đang chọn
 * @cssprop --hui-tree-node-selected-color - Màu chữ dòng đang chọn
 * @cssprop --hui-tree-line-color - Màu đường nối (show-line)
 * @cssprop --hui-tree-checkbox-size - Cạnh ô check
 * @cssprop --hui-tree-checked-bg - Nền ô check đã chọn
 * @cssprop --hui-tree-highlight-color - Màu chữ phần khớp tìm kiếm
 * @cssprop --hui-tree-highlight-bg - Nền phần khớp tìm kiếm
 * @cssprop --hui-tree-drop-color - Màu vạch thả / viền thả vào trong
 * @cssprop --hui-tree-focus-ring - Viền focus bàn phím
 */
export class HuiTree extends HuiElement {
  static properties = {
    /** Dữ liệu cây [{ key, title, icon, children, isLeaf, disabled, disableCheckbox, selectable }] — gán bằng property */
    data: { type: Array, default: [] },
    /** Khóa các node đang mở */
    expandedKeys: { type: Array, default: [] },
    /** Khóa các node đang chọn */
    selectedKeys: { type: Array, default: [] },
    /** Khóa các node đang check (không strictly: được tính lại đầy đủ cha – con) */
    checkedKeys: { type: Array, default: [] },
    /** Mở toàn bộ cây ở lần có dữ liệu đầu tiên */
    defaultExpandAll: { type: Boolean },
    /** Hiện ô check trước mỗi node */
    checkable: { type: Boolean },
    /** Check cha – con độc lập (không lan, không nửa chọn) */
    checkStrictly: { type: Boolean },
    /** true | false — cho phép chọn node (bấm vào chữ) */
    selectable: { type: String, default: 'true' },
    /** Chọn nhiều node (bấm để bật / tắt) */
    multiple: { type: Boolean },
    /** Vẽ đường nối cha – con */
    showLine: { type: Boolean },
    /** Hiện icon node (node.icon = tên hui-icon; mặc định thư mục / tệp) */
    showIcon: { type: Boolean },
    /** Dòng chiếm hết chiều ngang (vùng bấm / nền chọn rộng hết dòng) */
    blockNode: { type: Boolean },
    /** Chữ tìm kiếm (không dấu): tô đậm phần khớp + tự mở tổ tiên của node khớp */
    filterValue: { type: String, default: '' },
    /** highlight | hide — highlight: chỉ tô đậm; hide: ẩn node không khớp (giữ tổ tiên và con cháu của node khớp) */
    filterMode: { type: String, default: 'highlight' },
    /** Kéo thả để sắp xếp / đổi cha (phát hui-drop) */
    dragReorder: { type: Boolean },
    /** Chỉ vẽ các dòng đang nhìn thấy (cần height) — cho cây hàng nghìn node */
    virtual: { type: Boolean },
    /** Chiều cao vùng cuộn (px); bỏ trống = cao theo nội dung */
    height: { type: Number },
    /** sm | md | lg — chiều cao dòng / cỡ chữ */
    size: { type: String, default: 'md' },
    /** Tên cây cho trình đọc màn hình (mặc định "Cây thư mục") */
    label: { type: String, default: '' },
    /** Tắt hiệu ứng (mở node, xoay mũi tên) */
    noAnimation: { type: Boolean },
    /** async (node) => children[] | void — tải con khi mở node chưa có children (có thể tự gán node.children) */
    loadData: { type: Object, attribute: false },
    /** (node, { query }) => string | Node — tự vẽ phần chữ của node */
    renderTitle: { type: Object, attribute: false },
    /** ({ dragNode, dropNode, position }) => boolean — cho phép thả hay không (drag-reorder) */
    allowDrop: { type: Object, attribute: false },
  };

  static styles = [floatingCss, styles];
  static localized = true;

  constructor() {
    super();
    this._index = buildIndex([]);
    this._expanded = new Set();
    this._selected = new Set();
    this._checked = new Set();
    this._half = new Set();
    /** id → Promise đang tải */
    this._loading = new Map();
    this._loaded = new Set();
    this._filter = null;
    this._rows = [];
    this._rowEls = new Map();
    this._uids = new Map();
    this._activeId = null;
    this._expandInit = false;
    this._animateNew = false;
    this._typed = '';
    this._typedAt = 0;
    this._vw = null;
    this._rowH = 0;
    this._drag = null;
  }

  // =====================================================
  // JS PROPERTIES (hàm)
  // =====================================================

  get _loader() { return typeof this.loadData === 'function' ? this.loadData : null; }
  get _titleFn() { return typeof this.renderTitle === 'function' ? this.renderTitle : null; }
  get _dropFn() { return typeof this.allowDrop === 'function' ? this.allowDrop : null; }

  /** Khóa các node nửa chọn (chỉ đọc) */
  get halfCheckedKeys() { return idsToKeys(this._index, this._half); }

  /** Khóa node đang focus bằng bàn phím (chỉ đọc) */
  get activeKey() { return this._activeId == null ? null : this._index.map.get(this._activeId)?.key ?? null; }

  get _isSelectable() { return this.selectable !== 'false' && this.selectable !== false; }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._tree = createElement('div', { className: 'tree__list', part: 'tree', role: 'tree', tabindex: '0' });
    this._tree.addEventListener('keydown', (e) => this._onKeydown(e));
    this._tree.addEventListener('click', (e) => this._onClick(e));
    this._tree.addEventListener('focus', () => this._onFocus());
    this._tree.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this._tree.addEventListener('touchmove', (e) => { if (this._drag?.started) e.preventDefault(); }, { passive: false });

    this._spacer = createElement('div', { className: 'tree__spacer', 'aria-hidden': 'true' });
    this._emptyEl = createElement('hui-empty', { image: 'simple' });
    this._empty = createElement('div', { className: 'tree__empty', part: 'empty', hidden: true },
      createElement('slot', { name: 'empty' }, this._emptyEl));
    this._indicator = createElement('div', { className: 'tree__indicator', part: 'drop-indicator', hidden: true, 'aria-hidden': 'true' });
    this._live = createElement('div', { className: 'tree__sr', role: 'status', 'aria-live': 'polite' });
    this._ghost = createElement('div', { className: 'hui-floating tree__ghost', part: 'drag-ghost', hidden: true, 'aria-hidden': 'true' });

    this._base = createElement('div', { className: 'tree', part: 'base' },
      this._spacer, this._tree, this._empty, this._indicator, this._live, this._ghost);
    return this._base;
  }

  updated(changed) {
    let structure = false;

    if (changed.has('data') || changed.has('loadData')) {
      this._index = buildIndex(this.data);
      structure = true;
      if (!this._expandInit && this.defaultExpandAll && this._index.roots.length) {
        this._expandInit = true;
        if (!this.expandedKeys.length) {
          this.expandedKeys = [...this._index.map.values()].filter((e) => e.children.length).map((e) => e.key);
        }
      }
    }
    if (changed.has('expandedKeys')) {
      this._expanded = new Set((this.expandedKeys || []).map(String));
      structure = true;
    }
    if (changed.has('selectedKeys') || changed.has('data')) this._selected = new Set((this.selectedKeys || []).map(String));
    if (['checkedKeys', 'checkStrictly', 'data', 'loadData'].some((k) => changed.has(k))) this._recheck();

    if (changed.has('filterValue') || changed.has('data') || changed.has('filterMode')) {
      const prev = this._filter;
      this._filter = filterTree(this._index, this.filterValue);
      structure = true;
      // Mở tổ tiên của node khớp (người dùng vẫn đóng lại được)
      if (this._filter && changed.has('filterValue') && this.filterValue !== (prev?.query ?? '')) {
        const missing = [...this._filter.ancestors].filter((id) => !this._expanded.has(id));
        if (missing.length) {
          this.expandedKeys = idsToKeys(this._index, new Set([...this._expanded, ...missing]));
          this._expanded = new Set(this.expandedKeys.map(String));
        }
      }
      if (this._filter) this._filter.query = this.filterValue;
    }

    if (changed.has('label') || changed.has('locale')) {
      this._tree.setAttribute('aria-label', this.label || m('tree.label'));
    }
    if (changed.has('multiple') || changed.has('selectable')) {
      if (this.multiple && this._isSelectable) this._tree.setAttribute('aria-multiselectable', 'true');
      else this._tree.removeAttribute('aria-multiselectable');
    }
    if (changed.has('height')) this._base.style.height = this.height > 0 ? `${this.height}px` : '';
    this._base.className = [
      'tree', `tree--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
      this.height > 0 && 'tree--scroll', this.showLine && 'tree--line', this.blockNode && 'tree--block',
      this.checkable && 'tree--checkable', this.dragReorder && 'tree--draggable',
      this.virtual && this.height > 0 && 'tree--virtual', this._noAnim && 'tree--no-animation',
    ].filter(Boolean).join(' ');
    if (changed.has('size')) this._rowH = 0;

    if (structure) this._flatten();
    this._ensureVirtual();
    this._renderRows();
    this._lazyExpand();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._endDrag(false);
    this._vw?.destroy();
    this._vw = null;
  }

  focus(options) {
    if (this._tree) this._tree.focus(options);
    else super.focus(options);
  }

  get _noAnim() {
    return this.noAnimation || animationsDisabled();
  }

  // =====================================================
  // TÍNH TOÁN
  // =====================================================

  _recheck() {
    const { checked, half } = conductCheck(this._index, (this.checkedKeys || []).map(String), { strictly: this.checkStrictly });
    this._checked = checked;
    this._half = half;
  }

  _isLeaf(e) {
    const n = e.node;
    if (n.isLeaf === true) return true;
    if (e.children.length) return false;
    return Array.isArray(n.children) || !this._loader || this._loaded.has(e.id);
  }

  _needsLoad(e) {
    return Boolean(this._loader) && !this._isLeaf(e) && !e.children.length && !this._loaded.has(e.id);
  }

  /** expandedKeys chứa node chưa tải con → tải luôn (giống Ant) */
  _lazyExpand() {
    if (!this._loader) return;
    for (const id of this._expanded) {
      const e = this._index.map.get(id);
      if (e && this._needsLoad(e) && !this._loading.has(id)) this._load(e);
    }
  }

  _flatten() {
    const prev = new Set(this._rows.map((r) => r.entry.id));
    const hide = this._filter && this.filterMode === 'hide' ? this._filter.visible : null;
    this._rows = flattenTree(this._index, this._expanded, hide ? { include: (e) => hide.has(e.id) } : undefined);
    this._newIds = this._animateNew ? new Set(this._rows.map((r) => r.entry.id).filter((id) => !prev.has(id))) : null;
    this._animateNew = false;
    this._rowPos = new Map(this._rows.map((r, i) => [r.entry.id, i]));

    // Node đang focus bị ẩn (cha đóng / bị lọc) → focus về tổ tiên gần nhất còn hiển thị
    if (this._activeId != null && !this._rowPos.has(this._activeId)) {
      let e = this._index.map.get(this._activeId)?.parent;
      while (e && !this._rowPos.has(e.id)) e = e.parent;
      this._activeId = e ? e.id : null;
    }
  }

  _domId(id) {
    if (!this._uids.has(id)) this._uids.set(id, this._uids.size + 1);
    return `node-${this._uids.get(id)}`;
  }

  // =====================================================
  // VẼ DÒNG
  // =====================================================

  _ensureVirtual() {
    const on = this.virtual && this.height > 0;
    if (on && !this._vw) {
      this._vw = new VirtualWindow(this._base, {
        count: 0, itemSize: this._rowHeight(), overscan: 8, onRange: (r) => this._renderRange(r),
      });
    } else if (!on && this._vw) {
      this._vw.destroy();
      this._vw = null;
      this._spacer.style.height = '';
      this._tree.style.transform = '';
    }
  }

  _rowHeight() {
    if (this._rowH) return this._rowH;
    return ROW_HEIGHT[this.size] || ROW_HEIGHT.md;
  }

  _renderRows() {
    const empty = !this._rows.length;
    this._empty.hidden = !empty;
    this._emptyEl.setAttribute('description', this._filter ? m('tree.notFound') : m('tree.empty'));
    if (this._vw) {
      this._vw.itemSize = this._rowHeight();
      this._vw.setCount(this._rows.length);
    } else {
      this._renderRange({ start: 0, end: this._rows.length });
    }
    this._syncActive(false);
  }

  _renderRange({ start, end, offset = 0, total = 0 }) {
    this._rowEls = new Map();
    const els = [];
    for (let i = start; i < end; i++) {
      const el = this._createRow(this._rows[i]);
      this._rowEls.set(this._rows[i].entry.id, el);
      els.push(el);
    }
    this._tree.replaceChildren(...els);
    if (this._vw) {
      this._spacer.style.height = `${total}px`;
      this._tree.style.transform = `translateY(${offset}px)`;
      // Đo chiều cao dòng thật (CSS có thể đổi --hui-tree-node-height) → tính lại cửa sổ
      const h = els[0]?.offsetHeight;
      if (h && h !== this._vw.itemSize) {
        this._rowH = h;
        this._vw.itemSize = h;
        queueMicrotask(() => this._vw?.update(true));
      }
    }
    this._syncActive(false);

    // Hiệu ứng: các dòng vừa hiện ra khi mở node trượt nhẹ xuống
    if (this._newIds?.size && !this._noAnim && !this._vw) {
      for (const id of this._newIds) {
        const el = this._rowEls.get(id);
        el?.animate?.([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
          { duration: 180, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' });
      }
    }
    this._newIds = null;
  }

  _createRow(row) {
    const { entry: e } = row;
    const n = e.node;
    const id = e.id;
    const leaf = this._isLeaf(e);
    const open = !leaf && this._expanded.has(id) && e.children.length > 0;
    const loading = this._loading.has(id);
    const disabled = Boolean(n.disabled);
    const selected = this._selected.has(id);
    const match = Boolean(this._filter?.matched.has(id));
    const parts = ['node', selected && 'node-selected', disabled && 'node-disabled', match && 'node-match',
      leaf && 'node-leaf', open && 'node-open'];

    const el = createElement('div', {
      className: ['tree__node', selected && 'tree__node--selected', disabled && 'tree__node--disabled',
        match && 'tree__node--match', leaf && 'tree__node--leaf', open && 'tree__node--open'].filter(Boolean).join(' '),
      part: parts.filter(Boolean).join(' '),
      role: 'treeitem',
      id: this._domId(id),
      'aria-level': String(e.depth + 1),
      'aria-setsize': String(row.setSize),
      'aria-posinset': String(row.posInSet),
      dataset: { id },
    });
    if (!leaf) el.setAttribute('aria-expanded', String(open));
    if (this._isSelectable && n.selectable !== false) el.setAttribute('aria-selected', String(selected));
    if (disabled) el.setAttribute('aria-disabled', 'true');
    if (loading) el.setAttribute('aria-busy', 'true');

    // Thụt lề + đường nối: cột c < depth-1 vẽ đường dọc nếu tổ tiên ở độ sâu c+1 còn anh em phía sau;
    // cột cuối (sát nút mở) vẽ ├ hoặc └ tùy node có phải con cuối.
    const indent = createElement('span', { className: 'tree__indent', part: 'indent', 'aria-hidden': 'true' });
    for (let c = 0; c < e.depth; c++) {
      let cls = 'tree__unit';
      if (this.showLine) {
        if (c < e.depth - 1) cls += row.lines[c + 1] ? ' tree__unit--line' : '';
        else cls += row.last ? ' tree__unit--elbow-last' : ' tree__unit--elbow';
      }
      indent.append(createElement('span', { className: cls }));
    }
    el.append(indent);

    const sw = createElement('span', { className: 'tree__switcher', part: 'switcher', 'aria-hidden': 'true' });
    if (loading) {
      sw.append(createElement('span', { className: 'tree__spinner', part: 'loading' }));
    } else if (!leaf) {
      sw.dataset.switcher = '';
      sw.append(svgIcon('chevron-right', 'tree__arrow'));
    } else {
      sw.classList.add('tree__switcher--leaf');
    }
    el.append(sw);

    if (this.checkable) {
      const boxDisabled = disabled || Boolean(n.disableCheckbox);
      const checked = this._checked.has(id);
      const half = !checked && this._half.has(id);
      el.setAttribute('aria-checked', half ? 'mixed' : String(checked));
      const box = createElement('span', {
        className: ['tree__checkbox', checked && 'tree__checkbox--checked', half && 'tree__checkbox--half',
          boxDisabled && 'tree__checkbox--disabled'].filter(Boolean).join(' '),
        part: ['checkbox', checked && 'checkbox-checked', half && 'checkbox-indeterminate', boxDisabled && 'checkbox-disabled'].filter(Boolean).join(' '),
        'aria-hidden': 'true',
      }, svgIcon(half ? 'minus' : 'check', 'tree__check'));
      if (!boxDisabled) box.dataset.checkbox = '';
      el.append(box);
    }

    // Vùng nội dung (icon + chữ): nhận nền hover / chọn / viền focus
    const content = createElement('span', { className: 'tree__content', part: 'content' });
    if (this.showIcon) {
      const name = typeof n.icon === 'string' ? n.icon : leaf ? 'file' : open ? 'folder-open' : 'folder';
      content.append(createElement('hui-icon', { className: 'tree__icon', part: 'icon', name }));
    }
    const title = createElement('span', { className: 'tree__title', part: 'title' });
    const custom = this._titleFn?.(n, { query: this.filterValue });
    if (custom instanceof Node) title.append(custom);
    else if (custom != null) title.textContent = String(custom);
    else if (this._filter) title.append(...highlight(textOf(n.title), this.filterValue, 'tree__mark'));
    else title.textContent = textOf(n.title);
    content.append(title);
    el.append(content);
    return el;
  }

  /** Đồng bộ dòng đang focus (class + aria-activedescendant), cuộn tới nếu cần */
  _syncActive(scroll) {
    for (const [id, el] of this._rowEls) {
      const on = id === this._activeId;
      el.classList.toggle('tree__node--active', on);
      if (on) el.part.add('node-active');
      else el.part.remove('node-active');
    }
    const el = this._rowEls.get(this._activeId);
    if (el) this._tree.setAttribute('aria-activedescendant', el.id);
    else this._tree.removeAttribute('aria-activedescendant');
    if (scroll && this._activeId != null) this._scrollToId(this._activeId);
  }

  _scrollToId(id) {
    const i = this._rowPos?.get(id);
    if (i === undefined) return;
    if (this._vw) {
      const rh = this._vw.itemSize;
      const top = i * rh;
      const base = this._base;
      if (top < base.scrollTop) base.scrollTop = top;
      else if (top + rh > base.scrollTop + base.clientHeight) base.scrollTop = top + rh - base.clientHeight;
      this._vw.update();
      this._syncActive(false);
      return;
    }
    const el = this._rowEls.get(id);
    if (!el) return;
    if (this.height > 0) {
      const base = this._base;
      const top = el.offsetTop;
      if (top < base.scrollTop) base.scrollTop = top;
      else if (top + el.offsetHeight > base.scrollTop + base.clientHeight) base.scrollTop = top + el.offsetHeight - base.clientHeight;
    } else {
      el.scrollIntoView?.({ block: 'nearest' });
    }
  }

  // =====================================================
  // HÀNH ĐỘNG
  // =====================================================

  /** Mở / đóng node theo id (nội bộ) — node chưa có con + loadData thì tải trước */
  async _toggle(id, open = !this._expanded.has(id)) {
    let e = this._index.map.get(id);
    if (!e || (this._isLeaf(e) && !this._needsLoad(e))) return;
    if (open && this._needsLoad(e)) {
      const ok = await this._load(e);
      e = this._index.map.get(id);
      if (!ok || !e || !e.children.length) return;
    }
    if (open === this._expanded.has(id)) return;
    const set = new Set(this._expanded);
    if (open) set.add(id);
    else set.delete(id);
    this._applyExpanded(set, e.node, open);
  }

  _applyExpanded(set, node, expanded) {
    this._animateNew = expanded;
    this.expandedKeys = idsToKeys(this._index, set);
    this.emit('hui-expand', { expandedKeys: this.expandedKeys, node, expanded });
  }

  _load(e) {
    const id = e.id;
    if (this._loading.has(id)) return this._loading.get(id);
    const node = e.node;
    this._live.textContent = m('tree.loading', { title: textOf(node.title) });
    const job = (async () => {
      let ok = false;
      try {
        const result = await this._loader(node);
        if (Array.isArray(result)) node.children = result;
        ok = true;
      } catch (err) {
        console.error('[hui-tree] loadData error:', err);
      }
      this._loading.delete(id);
      if (ok) this._loaded.add(id);
      this._live.textContent = '';
      // Cấu trúc đã đổi (node.children mới) → lập lại chỉ mục, check, lọc
      this._index = buildIndex(this.data);
      this._recheck();
      if (this._filter) this._filter = Object.assign(filterTree(this._index, this.filterValue) || {}, { query: this.filterValue });
      this._animateNew = true;
      this._flatten();
      this._renderRows();
      if (ok) this.emit('hui-load', { node, loadedKeys: idsToKeys(this._index, this._loaded) });
      return ok;
    })();
    this._loading.set(id, job);
    this._renderRows(); // hiện vòng xoay
    return job;
  }

  _select(id) {
    const e = this._index.map.get(id);
    if (!e || e.node.disabled || e.node.selectable === false || !this._isSelectable) return;
    const was = this._selected.has(id);
    let set;
    if (this.multiple) {
      set = new Set(this._selected);
      if (was) set.delete(id);
      else set.add(id);
    } else {
      set = was ? new Set() : new Set([id]);
    }
    const selectedKeys = idsToKeys(this._index, set);
    if (!this.emit('hui-select', { selectedKeys, node: e.node, selected: !was }, { cancelable: true })) return;
    this.selectedKeys = selectedKeys;
  }

  _check(id) {
    const e = this._index.map.get(id);
    if (!this.checkable || !isCheckable(e)) return;
    const on = !this._checked.has(id);
    const { checked, half } = toggleCheck(this._index, this._checked, id, on, { strictly: this.checkStrictly });
    const checkedKeys = idsToKeys(this._index, checked);
    const detail = { checkedKeys, halfCheckedKeys: idsToKeys(this._index, half), node: e.node, checked: on };
    if (!this.emit('hui-check', detail, { cancelable: true })) return;
    this.checkedKeys = checkedKeys;
  }

  /** Hành động chính của node (Enter / bấm chữ): chọn → check → mở/đóng */
  _activate(id) {
    const e = this._index.map.get(id);
    if (!e) return;
    if (this._isSelectable && e.node.selectable !== false) this._select(id);
    else if (this.checkable) this._check(id);
    else if (!this._isLeaf(e)) this._toggle(id);
  }

  _setActive(id, scroll = true) {
    this._activeId = id;
    this._syncActive(scroll);
  }

  // =====================================================
  // API CÔNG KHAI
  // =====================================================

  /** Node theo khóa (undefined nếu không có) */
  getNode(key) {
    return this._index.map.get(String(key))?.node;
  }

  /** Mở mọi node đã có con */
  expandAll() {
    this._animateNew = true;
    this.expandedKeys = [...this._index.map.values()].filter((e) => e.children.length).map((e) => e.key);
  }

  collapseAll() {
    this.expandedKeys = [];
  }

  /** Mở tổ tiên, cuộn tới và focus (bàn phím) node theo khóa */
  scrollToKey(key) {
    const e = this._index.map.get(String(key));
    if (!e) return;
    const missing = [];
    for (let p = e.parent; p; p = p.parent) if (!this._expanded.has(p.id)) missing.push(p.id);
    if (missing.length) {
      this.expandedKeys = idsToKeys(this._index, new Set([...this._expanded, ...missing]));
      this._expanded = new Set(this.expandedKeys.map(String));
      this._flatten();
      this._renderRows();
    }
    this._setActive(e.id, true);
  }

  /** Báo cây đo lại kích thước (vd: vừa hiện trong popup) */
  refreshLayout() {
    this._rowH = 0;
    this._renderRows();
    this._syncActive(true);
  }

  // =====================================================
  // CHUỘT
  // =====================================================

  _onClick(e) {
    if (this._suppressClick) {
      this._suppressClick = false;
      return;
    }
    const rowEl = e.target.closest?.('[role="treeitem"]');
    if (!rowEl) return;
    const id = rowEl.dataset.id;
    this._setActive(id, false);
    if (e.target.closest('[data-switcher]')) this._toggle(id);
    else if (e.target.closest('[data-checkbox]')) this._check(id);
    else this._activate(id);
  }

  /** Focus vào cây: giữ node focus cũ, không có thì node đang chọn / node đầu (chỉ cuộn khi focus bằng bàn phím) */
  _onFocus() {
    const keyboard = this._tree.matches(':focus-visible');
    if (this._activeId != null && this._rowPos?.has(this._activeId)) {
      this._syncActive(keyboard);
      return;
    }
    const sel = this._rows.find((r) => this._selected.has(r.entry.id) || this._checked.has(r.entry.id)) || this._rows[0];
    if (sel) this._setActive(sel.entry.id, keyboard);
  }

  // =====================================================
  // BÀN PHÍM (APG Tree)
  // =====================================================

  _onKeydown(e) {
    const rows = this._rows;
    if (!rows.length) return;
    if (this._drag?.started) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this._endDrag(false);
      }
      return;
    }
    let i = this._rowPos.get(this._activeId) ?? -1;
    const cur = rows[i]?.entry;
    const go = (to) => {
      e.preventDefault();
      const j = Math.max(0, Math.min(rows.length - 1, to));
      this._setActive(rows[j].entry.id);
    };

    if (e.altKey && this.dragReorder && cur && e.key.startsWith('Arrow')) {
      e.preventDefault();
      this._keyboardMove(cur, e.key);
      return;
    }

    switch (e.key) {
      case 'ArrowDown': go(i + 1); break;
      case 'ArrowUp': go(i < 0 ? 0 : i - 1); break;
      case 'Home': go(0); break;
      case 'End': go(rows.length - 1); break;
      case 'ArrowRight':
        if (!cur) { go(0); break; }
        e.preventDefault();
        if (this._isLeaf(cur)) break;
        if (!this._expanded.has(cur.id) || !cur.children.length) this._toggle(cur.id, true);
        else if (rows[i + 1]?.entry.parent === cur) go(i + 1);
        break;
      case 'ArrowLeft':
        if (!cur) { go(0); break; }
        e.preventDefault();
        if (!this._isLeaf(cur) && this._expanded.has(cur.id) && cur.children.length) this._toggle(cur.id, false);
        else if (cur.parent && this._rowPos.has(cur.parent.id)) this._setActive(cur.parent.id);
        break;
      case 'Enter':
        if (!cur) break;
        e.preventDefault();
        this._activate(cur.id);
        break;
      case ' ':
        if (!cur) break;
        e.preventDefault();
        if (this.checkable) this._check(cur.id);
        else this._activate(cur.id);
        break;
      case '*': {
        if (!cur) break;
        e.preventDefault();
        const siblings = cur.parent ? cur.parent.children : this._index.roots;
        const set = new Set(this._expanded);
        for (const s of siblings) {
          if (this._needsLoad(s)) this._toggle(s.id, true);
          else if (s.children.length) set.add(s.id);
        }
        if (set.size !== this._expanded.size) this._applyExpanded(set, cur.node, true);
        break;
      }
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') this._typeahead(e.key, i);
    }
  }

  /** Gõ chữ → nhảy tới node kế tiếp có tên bắt đầu bằng chuỗi vừa gõ (không dấu) */
  _typeahead(ch, from) {
    const now = Date.now();
    this._typed = now - this._typedAt > TYPEAHEAD_MS ? ch : this._typed + ch;
    this._typedAt = now;
    const q = fold(this._typed);
    const rows = this._rows;
    // Gõ lặp 1 ký tự → đi tiếp node kế; gõ chuỗi → tìm từ node hiện tại
    const start = this._typed.length === 1 ? from + 1 : Math.max(from, 0);
    for (let k = 0; k < rows.length; k++) {
      const r = rows[(start + k) % rows.length];
      if (fold(textOf(r.entry.node.title)).startsWith(q)) {
        this._setActive(r.entry.id);
        return;
      }
    }
  }

  /** Alt + mũi tên (drag-reorder): ↑↓ đổi chỗ với anh em, → thụt vào node trước, ← ra ngoài cha */
  _keyboardMove(cur, key) {
    const siblings = cur.parent ? cur.parent.children : this._index.roots;
    const i = siblings.indexOf(cur);
    let drop = null;
    let position = null;
    if (key === 'ArrowUp' && i > 0) [drop, position] = [siblings[i - 1], 'before'];
    else if (key === 'ArrowDown' && i < siblings.length - 1) [drop, position] = [siblings[i + 1], 'after'];
    else if (key === 'ArrowRight' && i > 0) {
      const prev = siblings[i - 1];
      [drop, position] = prev.children.length ? [prev.children[prev.children.length - 1], 'after'] : [prev, 'inside'];
    } else if (key === 'ArrowLeft' && cur.parent) [drop, position] = [cur.parent, 'after'];
    if (!drop || !this._canDrop(cur, drop, position)) return;
    this._drop(cur, drop, position);
  }

  // =====================================================
  // KÉO THẢ (pointer events — chuột, bút, cảm ứng nhấn giữ)
  // =====================================================

  _onPointerDown(ev) {
    if (!this.dragReorder || ev.button !== 0 || this._drag) return;
    const rowEl = ev.target.closest?.('[role="treeitem"]');
    if (!rowEl || ev.target.closest('[data-switcher],[data-checkbox]')) return;
    const entry = this._index.map.get(rowEl.dataset.id);
    if (!entry || entry.node.disabled) return;

    const d = { entry, x0: ev.clientX, y0: ev.clientY, pointerId: ev.pointerId, started: false, target: null, abort: new AbortController() };
    this._drag = d;
    const opts = { signal: d.abort.signal };
    document.addEventListener('pointermove', (e) => this._onPointerMove(e), { ...opts, passive: false });
    document.addEventListener('pointerup', (e) => this._onPointerUp(e), opts);
    document.addEventListener('pointercancel', () => this._endDrag(false), opts);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && d.started) {
        e.preventDefault();
        e.stopPropagation();
        this._endDrag(false);
      }
    }, { ...opts, capture: true });
    // Cảm ứng: phải nhấn giữ mới bắt đầu kéo (để vuốt vẫn cuộn được)
    if (ev.pointerType === 'touch') {
      d.touch = true;
      d.holdTimer = setTimeout(() => { d.held = true; }, TOUCH_HOLD_MS);
    }
  }

  _onPointerMove(ev) {
    const d = this._drag;
    if (!d || ev.pointerId !== d.pointerId) return;
    if (!d.started) {
      const dist = Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0);
      if (d.touch && !d.held) {
        if (dist > 8) this._endDrag(false); // vuốt cuộn → bỏ kéo
        return;
      }
      if (dist < DRAG_THRESHOLD) return;
      this._startDrag(d);
    }
    ev.preventDefault();
    this._ghost.style.left = `${ev.clientX + 14}px`;
    this._ghost.style.top = `${ev.clientY + 10}px`;
    this._autoScroll(ev.clientY);
    this._updateDropTarget(ev.clientY);
  }

  _startDrag(d) {
    d.started = true;
    this._ghost.textContent = textOf(d.entry.node.title);
    showFloating(this._ghost, '--hui-z-tooltip');
    this._rowEls.get(d.entry.id)?.part.add('node-dragging');
    this._rowEls.get(d.entry.id)?.classList.add('tree__node--dragging');
    this.setState('dragging', true);
  }

  _onPointerUp(ev) {
    const d = this._drag;
    if (!d || ev.pointerId !== d.pointerId) return;
    this._endDrag(d.started);
  }

  /** Dòng dưới con trỏ + vị trí thả (25% trên = before, 25% dưới = after, giữa = inside) */
  _updateDropTarget(y) {
    const d = this._drag;
    let target = null;
    for (const [id, el] of this._rowEls) {
      const r = el.getBoundingClientRect();
      if (y < r.top || y >= r.bottom) continue;
      const entry = this._index.map.get(id);
      const rel = (y - r.top) / r.height;
      const canInside = entry.node.isLeaf !== true;
      let position = rel < 0.25 ? 'before' : rel > 0.75 ? 'after' : 'inside';
      if (!canInside && position === 'inside') position = rel < 0.5 ? 'before' : 'after';
      // "Sau" một node đang mở = vào trong, đứng đầu danh sách con
      if (position === 'after' && this._expanded.has(id) && entry.children.length) position = 'inside';
      if (this._canDrop(d.entry, entry, position)) target = { entry, el, position };
      break;
    }
    const same = d.target && target && d.target.entry === target.entry && d.target.position === target.position;
    if (!same) {
      clearTimeout(d.expandTimer);
      // Giữ trên node đóng một lúc → tự mở
      if (target?.position === 'inside' && !this._isLeaf(target.entry) && !this._expanded.has(target.entry.id)) {
        const id = target.entry.id;
        d.expandTimer = setTimeout(() => this._toggle(id, true), AUTO_EXPAND_MS);
      }
    }
    d.target = target;
    this._paintIndicator();
  }

  _canDrop(drag, drop, position) {
    if (!drag || !drop || drag === drop || isAncestor(drag, drop)) return false;
    if (position === 'inside' && drop.node.isLeaf === true) return false;
    if (this._dropFn && this._dropFn({ dragNode: drag.node, dropNode: drop.node, position }) === false) return false;
    return true;
  }

  _paintIndicator() {
    const t = this._drag?.target;
    for (const el of this._rowEls.values()) {
      el.classList.remove('tree__node--drop-inside');
      el.part.remove('node-drop-inside');
    }
    if (!t) {
      this._indicator.hidden = true;
      return;
    }
    const el = this._rowEls.get(t.entry.id) || t.el;
    if (t.position === 'inside') {
      el.classList.add('tree__node--drop-inside');
      el.part.add('node-drop-inside');
      this._indicator.hidden = true;
      return;
    }
    const base = this._base.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const title = el.querySelector('.tree__content')?.getBoundingClientRect() || r;
    const top = (t.position === 'before' ? r.top : r.bottom) - base.top + this._base.scrollTop;
    Object.assign(this._indicator.style, { top: `${Math.round(top - 1)}px`, left: `${Math.round(title.left - base.left)}px` });
    this._indicator.hidden = false;
  }

  _autoScroll(y) {
    if (!(this.height > 0)) return;
    const r = this._base.getBoundingClientRect();
    const edge = 28;
    if (y < r.top + edge) this._base.scrollTop -= 10;
    else if (y > r.bottom - edge) this._base.scrollTop += 10;
  }

  _endDrag(commit) {
    const d = this._drag;
    if (!d) return;
    this._drag = null;
    d.abort.abort();
    clearTimeout(d.holdTimer);
    clearTimeout(d.expandTimer);
    if (d.started) {
      this._suppressClick = true;
      setTimeout(() => { this._suppressClick = false; }, 0);
      hideFloating(this._ghost);
      this.setState('dragging', false);
      this._indicator.hidden = true;
      const t = d.target;
      d.target = null;
      this._paintIndicator();
      this._rowEls.get(d.entry.id)?.classList.remove('tree__node--dragging');
      this._rowEls.get(d.entry.id)?.part.remove('node-dragging');
      if (commit && t) this._drop(d.entry, t.entry, t.position);
    }
  }

  /** Phát hui-drop (cancelable); không bị chặn thì chuyển node trong data rồi vẽ lại */
  _drop(drag, drop, position) {
    const detail = { dragNode: drag.node, dropNode: drop.node, dragKey: drag.key, dropKey: drop.key, position };
    if (!this.emit('hui-drop', detail, { cancelable: true })) return;
    if (!moveNode(this.data, drag.key, drop.key, position)) return;
    if (position === 'inside' && !this._expanded.has(drop.id)) {
      this._expanded.add(drop.id);
      this.expandedKeys = [...this.expandedKeys, drop.key];
    }
    this._activeId = drag.id;
    this.data = [...this.data];
    this._live.textContent = m('tree.moved', { title: textOf(drag.node.title) });
    this.updateComplete.then(() => this._syncActive(true));
  }
}

defineElement('hui-tree', HuiTree);

export default HuiTree;
