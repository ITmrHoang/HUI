/**
 * HUI Masonry — lưới so le kiểu Pinterest cho card cao thấp khác nhau (Organism, A3.8).
 *   <hui-masonry columns="2" columns-md="3" columns-xl="4" gap="md">
 *     <article>…</article> <article>…</article>
 *   </hui-masonry>
 * Bố cục bằng JS: mỗi item đặt vào cột đang thấp nhất (position absolute + top/left), giữ NGUYÊN thứ tự DOM
 * (đọc màn hình / Tab đi đúng thứ tự). Tự xếp lại khi khung đổi bề rộng, item đổi chiều cao (ResizeObserver),
 * ảnh bên trong tải xong, hoặc thêm/bớt item. Item mới hiện bằng hiệu ứng fade-up.
 * Dữ liệu: con trực tiếp (slot) hoặc `data` + <template> (DataController: data / src / fetchFn).
 */

import styles from './hui-masonry.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { DataController } from '../../core/data-controller.js';
import { renderTemplate, updateTemplateNode, delegateActions } from '../../core/template.js';
import { Repeater } from '../../core/repeat.js';
import { createElement } from '../../utils/dom.js';
import { runAnimation, animationsDisabled } from '../../utils/animate.js';

const GAP_TOKENS = {
  none: '0px',
  xs: 'var(--hui-space-xs)',
  sm: 'var(--hui-space-sm)',
  md: 'var(--hui-space-lg)',
  lg: 'var(--hui-space-xl)',
  xl: 'var(--hui-space-2xl)',
};

function toLength(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (GAP_TOKENS[v]) return GAP_TOKENS[v];
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

/** Breakpoint giống hui-grid / hui-scroller (min-width) */
const BREAKPOINTS = [
  ['Sm', 576],
  ['Md', 768],
  ['Lg', 992],
  ['Xl', 1200],
];

let sharedMqls = null;
function breakpointMqls() {
  if (!sharedMqls && typeof matchMedia === 'function') {
    sharedMqls = BREAKPOINTS.map(([, px]) => matchMedia(`(min-width: ${px}px)`));
  }
  return sharedMqls;
}

const SKIP_TAGS = new Set(['template', 'style', 'script', 'link', 'meta']);
/** Item đầu tiên xuất hiện: hiện lần lượt nhưng giới hạn tổng thời gian chờ */
const MAX_STAGGERED = 12;

/**
 * @fires hui-layout - Xếp xong. detail: { columns, height, count }
 * @fires hui-action - (template) bấm phần tử có data-action. detail: { action, item, index, originalEvent }
 * @fires hui-load - (DataController) tải xong src / fetchFn. detail: { data, total }
 * @fires hui-error - (DataController) tải lỗi. detail: { error }
 * @slot - Các item (phần tử con trực tiếp). Một <template> con dùng làm khuôn khi có `data`
 * @csspart base - Khung ngoài
 * @csspart grid - Vùng chứa item (chiều cao = cột cao nhất)
 * @csspart state - Vùng loading / empty / error của dữ liệu
 * @cssprop --hui-masonry-gap - Khoảng cách item khi không có attribute gap (mặc định --hui-space-lg)
 * @cssprop --hui-masonry-duration - Thời gian trượt item khi xếp lại (mặc định --hui-motion-duration-slow)
 */
class HuiMasonry extends DataController(HuiElement) {
  static properties = {
    /** Số cột (mobile-first, mặc định 3) */
    columns: { type: Number, default: 3 },
    /** Số cột khi màn hình ≥ 576px */
    columnsSm: { type: Number },
    /** Số cột khi màn hình ≥ 768px */
    columnsMd: { type: Number },
    /** Số cột khi màn hình ≥ 992px */
    columnsLg: { type: Number },
    /** Số cột khi màn hình ≥ 1200px */
    columnsXl: { type: Number },
    /** Khoảng cách giữa item (ngang và dọc): xs | sm | md | lg | xl | none, số (px) hoặc CSS length */
    gap: { type: String },
    /** Trường làm key khi render từ data (giữ DOM khi dữ liệu đổi thứ tự) */
    rowKey: { type: String },
    /** Tắt hiệu ứng hiện item mới và trượt khi xếp lại */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._items = [];
    this._seen = new WeakSet();
    this._frame = 0;
    this._laidOut = false;
    this._repeater = null;
    this._columnCount = 0;
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncItems());
    this._grid = createElement('div', { className: 'masonry__grid', part: 'grid' }, this._slot);
    this._state = createElement('div', { className: 'masonry__state', part: 'state', hidden: true });
    this._base = createElement('div', { className: 'masonry', part: 'base' }, this._state, this._grid);
    // Ảnh tải xong (sự kiện load không nổi bọt → bắt ở pha capture)
    this.addEventListener('load', (e) => { if (e.target !== this) this._schedule(); }, true);
    return this._base;
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback();
    for (const mql of breakpointMqls() || []) this.listen(mql, 'change', () => this._schedule());
    if (typeof ResizeObserver === 'function') {
      // Khung đổi bề rộng hoặc item đổi chiều cao → xếp lại (gom 1 lần / frame)
      this._ro = new ResizeObserver(() => this._schedule());
      this._ro.observe(this._grid);
      for (const el of this._items) this._ro.observe(el);
    }
    this._actionsOff = delegateActions(this, this);
    if (reconnect) this._syncItems();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._ro = null;
    this._actionsOff?.();
    this._actionsOff = null;
    cancelAnimationFrame(this._frame);
    this._frame = 0;
  }

  updated(changed) {
    super.updated(changed);
    if (changed.has('gap')) {
      const gap = toLength(this.gap);
      if (gap) this._base.style.setProperty('--_masonry-gap', gap);
      else this._base.style.removeProperty('--_masonry-gap');
    }
    if (changed.has('noAnimation')) this._base.classList.toggle('masonry--no-animation', this.noAnimation);
    if (['columns', 'columnsSm', 'columnsMd', 'columnsLg', 'columnsXl', 'gap'].some((k) => changed.has(k))) this._schedule();

    if (['data', 'rowKey'].some((k) => changed.has(k))) this._renderData();
    if (['data', 'dataState', 'loading', 'emptyText', 'src', 'fetchFn', 'locale'].some((k) => changed.has(k))) {
      if (this._isDataMode) this.renderStateView(this._state, { skeletonRows: 4 });
      else {
        this._state.hidden = true;
        this._state.replaceChildren();
      }
      this._grid.hidden = this._isDataMode && this.dataState !== 'ready';
      this._schedule();
    }
  }

  // =====================================================
  // API
  // =====================================================

  /** Số cột đang áp dụng theo breakpoint (chỉ đọc) */
  get columnCount() {
    let n = this.columns;
    const mqls = breakpointMqls();
    BREAKPOINTS.forEach(([suffix], i) => {
      const v = this[`columns${suffix}`];
      if (v > 0 && mqls?.[i]?.matches) n = v;
    });
    return Math.max(1, Math.floor(n > 0 ? n : 1));
  }

  /** Danh sách phần tử item (chỉ đọc) */
  get items() {
    return [...this._items];
  }

  /** Xếp lại ngay (đồng bộ) — gọi khi tự đổi nội dung item bằng code mà không đổi kích thước */
  refresh() {
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    this._layout();
  }

  // =====================================================
  // BỐ CỤC
  // =====================================================

  get _isDataMode() {
    // `loading` cũng tính: đặt loading trên lưới slot → hiện skeleton thay cho item
    return this.data != null || Boolean(this.src) || Boolean(this.fetchFn) || this.loading;
  }

  _syncItems() {
    const next = this._slot.assignedElements().filter((el) => !SKIP_TAGS.has(el.localName));
    const nextSet = new Set(next);
    for (const el of this._items) {
      if (!nextSet.has(el)) {
        this._ro?.unobserve(el);
        // Item bị gỡ khỏi masonry → trả lại style gốc
        for (const p of ['position', 'top', 'left', 'width', 'inset-inline-start']) el.style.removeProperty(p);
      }
    }
    for (const el of next) if (!this._items.includes(el)) this._ro?.observe(el);
    this._items = next;
    this._schedule();
  }

  _schedule() {
    if (this._frame || !this.isConnected) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = 0;
      this._layout();
    });
  }

  /**
   * Xếp item vào cột thấp nhất:
   * 1. ghi bề rộng cột cho mọi item (1 lần ghi) → 2. đọc chiều cao mọi item (1 lần reflow)
   * → 3. tính vị trí rồi ghi top/left + chiều cao khung. Không xen kẽ đọc/ghi → không layout thrashing.
   */
  _layout() {
    if (!this._hasRendered || !this.isConnected) return;
    const items = this._items.filter((el) => !el.hidden && getComputedStyle(el).display !== 'none');
    const width = this._grid.clientWidth;
    if (!width) return;
    const cols = this.columnCount;
    const gap = parseFloat(getComputedStyle(this._grid).columnGap) || 0;
    const colWidth = Math.max(0, (width - gap * (cols - 1)) / cols);

    for (const el of items) el.style.width = `${colWidth}px`;
    this._grid.classList.add('masonry__grid--positioned');
    const heights = items.map((el) => el.getBoundingClientRect().height);

    const colHeights = new Array(cols).fill(0);
    const fresh = [];
    items.forEach((el, i) => {
      // Cột thấp nhất (bằng nhau → cột bên trái)
      let c = 0;
      for (let k = 1; k < cols; k++) if (colHeights[k] < colHeights[c] - 0.5) c = k;
      const top = colHeights[c] === 0 ? 0 : colHeights[c] + gap;
      el.style.insetInlineStart = `${c * (colWidth + gap)}px`;
      el.style.top = `${top}px`;
      colHeights[c] = top + heights[i];
      if (!this._seen.has(el)) {
        this._seen.add(el);
        fresh.push(el);
      }
    });
    const height = Math.max(0, ...colHeights);
    this._grid.style.height = `${height}px`;

    const animate = !this.noAnimation && !animationsDisabled();
    if (animate && fresh.length) {
      // Lần đầu: hiện lần lượt; item thêm sau: cùng hiện
      runAnimation(fresh, 'fade-up', { duration: 450, stagger: fresh.length > MAX_STAGGERED ? 0 : 50 });
    }
    // Từ lần xếp thứ 2 trở đi mới bật trượt mượt (lần đầu đặt thẳng vị trí)
    if (this._laidOut) this._grid.classList.toggle('masonry__grid--animated', animate);
    this._laidOut = true;

    const changed = cols !== this._columnCount || Math.abs(height - (this._lastHeight || 0)) > 0.5 || items.length !== this._lastCount;
    this._columnCount = cols;
    this._lastHeight = height;
    this._lastCount = items.length;
    this.setState('ready-layout', true);
    if (changed) this.emit('hui-layout', { columns: cols, height, count: items.length });
  }

  /** Render data bằng <template> con (light DOM) — giữ node theo row-key */
  _renderData() {
    if (!this._isDataMode) {
      this._repeater?.destroy();
      this._repeater = null;
      return;
    }
    const list = Array.isArray(this.data) ? this.data : [];
    const tpl = this.querySelector(':scope > template');
    if (!this._repeater || this._repeaterKey !== this.rowKey) {
      this._repeater?.destroy();
      this._repeaterKey = this.rowKey;
      this._repeater = new Repeater(this, {
        key: this.rowKey || undefined,
        create: (item, i) => (tpl ? renderTemplate(tpl, item, i) : createElement('div', {}, String(item?.label ?? item?.name ?? item))),
        update: (node, item, i) => updateTemplateNode(node, item, i),
      });
    }
    this._repeater.render(list);
  }
}

defineElement('hui-masonry', HuiMasonry);

export default HuiMasonry;
