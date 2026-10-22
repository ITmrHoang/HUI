/**
 * HUI Virtual List — Danh sách rất dài chỉ render phần đang nhìn thấy (Organism, DataController).
 * Dựa trên VirtualWindow (src/utils/virtual.js): dòng cao cố định (`item-height`) hoặc tự đo (ước lượng + ResizeObserver).
 * Dòng render vào light DOM (CSS trang áp dụng được) từ <template> con hoặc `renderItem(item, index)`; giữ node theo key.
 * `selectable` → listbox theo APG (aria-activedescendant trên host, phím mũi tên / Home / End / PageUp / PageDown).
 */

import styles from './hui-virtual-list.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { DataController } from '../../core/data-controller.js';
import { renderTemplate, updateTemplateNode, delegateActions, getPath } from '../../core/template.js';
import { Repeater } from '../../core/repeat.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { VirtualWindow } from '../../utils/virtual.js';
import '../hui-spinner/index.js';
import '../hui-skeleton/index.js';
import '../hui-empty/index.js';
import '../hui-result/index.js';
import '../hui-button/index.js';

/** Chuỗi dự phòng khi locale.js chưa có key virtualList.* */
const FALLBACK = {
  vi: { 'virtualList.label': 'Danh sách', 'virtualList.loadingMore': 'Đang tải thêm...' },
  en: { 'virtualList.label': 'List', 'virtualList.loadingMore': 'Loading more...' },
};

function tx(key) {
  const v = t(key);
  if (v !== key) return v;
  return (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

/** Số trơn → px, còn lại giữ nguyên chuỗi CSS */
const toLength = (v) => (v === null || v === undefined || v === '' ? null : /^\d+(\.\d+)?$/.test(String(v).trim()) ? `${v}px` : String(v));

let uid = 0;

/**
 * @fires hui-select - (selectable) chọn 1 dòng bằng click / Enter / Space. detail: { item, index, key }
 * @fires hui-reach-end - Cuộn gần cuối (cách cuối ≤ end-threshold px) — dùng để tải thêm. detail: { count }
 * @fires hui-range-change - Khoảng dòng đang render đổi. detail: { start, end }
 * @fires hui-action - (template) bấm phần tử có data-action. detail: { action, item, index, originalEvent }
 * @fires hui-load - (DataController) tải xong src / fetchFn. detail: { data, total }
 * @fires hui-error - (DataController) tải lỗi. detail: { error }
 * @slot - <template> khuôn dòng (1 phần tử gốc). Các dòng được render vào đây (light DOM)
 * @slot footer - Thay nội dung mặc định của vùng "đang tải thêm" (hiện khi loading-more)
 * @csspart base - Khung ngoài
 * @csspart viewport - Vùng cuộn
 * @csspart spacer - Khối giữ đúng chiều dài thanh cuộn
 * @csspart window - Khối chứa các dòng đang render (được dịch theo vị trí cuộn)
 * @csspart footer - Vùng "đang tải thêm" cuối danh sách
 * @csspart state - Vùng loading / empty / error của dữ liệu
 * @cssprop --hui-virtual-list-height - Chiều cao vùng cuộn khi không có attribute height (mặc định 400px; horizontal: auto)
 * @cssprop --hui-virtual-list-bg - Nền vùng cuộn
 * @cssprop --hui-virtual-list-border-color - Viền (khi bordered)
 * @cssprop --hui-virtual-list-radius - Bo góc (khi bordered)
 * @cssprop --hui-virtual-list-row-padding - Đệm dòng mặc định (không template / renderItem)
 * @cssprop --hui-virtual-list-split-color - Đường kẻ giữa các dòng mặc định
 * @cssprop --hui-virtual-list-hover-bg - Nền dòng khi hover (selectable)
 * @cssprop --hui-virtual-list-selected-bg - Nền dòng đang chọn
 * @cssprop --hui-virtual-list-selected-color - Màu chữ dòng đang chọn
 * @cssprop --hui-virtual-list-focus-color - Viền dòng đang active khi focus bằng bàn phím
 */
class HuiVirtualList extends DataController(HuiElement) {
  static properties = {
    /** Kích thước cố định mỗi dòng (px, theo trục cuộn). Bỏ trống = tự đo từng dòng */
    itemHeight: { type: Number },
    /** Kích thước ước lượng (px) cho dòng chưa đo — chế độ tự đo */
    estimatedHeight: { type: Number, default: 48 },
    /** Chiều cao vùng cuộn: số (px) hoặc CSS length (mặc định 400px) */
    height: { type: String },
    /** Số dòng render dư ra ngoài vùng nhìn mỗi phía */
    overscan: { type: Number, default: 6 },
    /** Cuộn ngang (dòng xếp theo hàng ngang) */
    horizontal: { type: Boolean },
    /** Trường làm key (giữ node + kích thước đã đo khi dữ liệu đổi thứ tự / thêm vào) */
    rowKey: { type: String },
    /** Bật chế độ chọn (role="listbox", bàn phím theo APG) */
    selectable: { type: Boolean },
    /** Key của dòng đang chọn (giá trị trường row-key, hoặc vị trí khi không có row-key) */
    value: { type: String },
    /** Cách cuối bao nhiêu px thì phát hui-reach-end */
    endThreshold: { type: Number, default: 200 },
    /** Hiện vùng "đang tải thêm" ở cuối (không phát hui-reach-end khi đang bật) */
    loadingMore: { type: Boolean },
    /** Viền ngoài + bo góc */
    bordered: { type: Boolean },
    /** Nhãn ARIA (mặc định theo locale) */
    label: { type: String },
    /** (item, index) => Node | string — tự dựng dòng (thay cho <template>). Chỉ gán bằng property */
    renderItem: { type: Object, attribute: false },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    this._vw = null;
    this._repeater = null;
    this._range = { start: 0, end: 0 };
    this._start = 0;
    /** Kích thước đã đo: key → px */
    this._sizes = new Map();
    this._observed = new Set();
    this._activeIndex = -1;
    this._reachedAt = -1;
    this._scrollFrame = 0;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._slot = createElement('slot');
    this._window = createElement('div', { className: 'vl__window', part: 'window' }, this._slot);
    this._spacer = createElement('div', { className: 'vl__spacer', part: 'spacer' }, this._window);
    this._footerText = createElement('span');
    this._footer = createElement('div', { className: 'vl__footer', part: 'footer', hidden: true, role: 'status' },
      createElement('slot', { name: 'footer' }, createElement('hui-spinner', { size: 'sm' }), this._footerText));
    this._viewport = createElement('div', { className: 'vl__viewport', part: 'viewport' }, this._spacer, this._footer);
    this._state = createElement('div', { className: 'vl__state', part: 'state', hidden: true });
    this._base = createElement('div', { className: 'vl', part: 'base' }, this._state, this._viewport);

    this._viewport.addEventListener('scroll', () => {
      if (this._scrollFrame) return;
      this._scrollFrame = requestAnimationFrame(() => {
        this._scrollFrame = 0;
        this._checkReachEnd();
      });
    }, { passive: true });

    // Dòng đổi kích thước (ảnh tải xong, chữ xuống dòng…) → cập nhật bảng vị trí
    this._ro = typeof ResizeObserver === 'function' ? new ResizeObserver((entries) => this._onRowResize(entries)) : null;

    this.addEventListener('click', (e) => this._onClick(e));
    this.addEventListener('keydown', (e) => this._onKeydown(e));
    this.addEventListener('focus', () => {
      if (this.selectable && this._activeIndex < 0 && this._count) this._setActive(Math.max(0, this._selectedIndex()), true);
    });
    return this._base;
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback();
    this._actionsOff = delegateActions(this, this);
    if (reconnect) this._setupWindow();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._actionsOff?.();
    this._actionsOff = null;
    this._vw?.destroy();
    this._vw = null;
    this._ro?.disconnect();
    this._observed.clear();
    cancelAnimationFrame(this._scrollFrame);
    this._scrollFrame = 0;
  }

  updated(changed) {
    super.updated(changed);

    if (changed.has('height') || changed.has('horizontal') || changed.has('bordered') || changed.has('itemHeight')) {
      const cl = this._base.classList;
      cl.toggle('vl--horizontal', this.horizontal);
      cl.toggle('vl--bordered', this.bordered);
      cl.toggle('vl--fixed', this._fixed);
      const h = toLength(this.height);
      if (h) this._base.style.setProperty('--_vl-height', h);
      else this._base.style.removeProperty('--_vl-height');
      if (this._fixed) this._base.style.setProperty('--_vl-size', `${this.itemHeight}px`);
      else this._base.style.removeProperty('--_vl-size');
    }

    if (['selectable', 'label', 'locale', 'horizontal'].some((k) => changed.has(k))) this._syncAria();

    if (changed.has('loadingMore') || changed.has('locale')) {
      this._footer.hidden = !this.loadingMore;
      this._footerText.textContent = tx('virtualList.loadingMore');
    }

    // Dữ liệu / cách render đổi → dựng lại các dòng
    const dataChanged = ['data', 'renderItem', 'rowKey'].some((k) => changed.has(k));
    if (dataChanged) {
      if (changed.has('renderItem') || changed.has('rowKey') || (typeof this.renderItem === 'function' && !this.rowKey)) {
        this._repeater?.destroy();
        this._repeater = null;
      }
      if (!this.rowKey) this._sizes.clear();
      if (this._activeIndex >= this._count) this._activeIndex = -1;
    }

    if (['data', 'dataState', 'loading', 'emptyText', 'src', 'fetchFn', 'locale'].some((k) => changed.has(k))) {
      const showState = this.renderStateView(this._state, { skeletonRows: 4 });
      this._viewport.hidden = showState;
    }

    if (!this._vw || ['horizontal', 'itemHeight', 'estimatedHeight', 'overscan'].some((k) => changed.has(k))) this._setupWindow();
    else if (dataChanged || changed.has('dataState')) {
      this._reachedAt = -1;
      this._vw.setCount(this._count);
    } else if (changed.has('value') || changed.has('selectable')) this._decorateAll();
  }

  // =====================================================
  // API
  // =====================================================

  /** Khoảng dòng đang render { start, end } (end không tính) — chỉ đọc */
  get renderedRange() {
    return { ...this._range };
  }

  /** Chỉ số dòng đang active (bàn phím, selectable) — chỉ đọc, -1 = chưa có */
  get activeIndex() {
    return this._activeIndex;
  }

  /** Tổng số dòng */
  get _count() {
    return Array.isArray(this.data) && this.dataState !== 'loading' ? this.data.length : 0;
  }

  get _fixed() {
    return this.itemHeight > 0;
  }

  /**
   * Cuộn tới dòng thứ `index`.
   * @param {number} index
   * @param {'start' | 'center' | 'end' | 'auto'} [align] - auto: chỉ cuộn khi dòng chưa nằm trọn trong vùng nhìn
   * @returns {Promise<void>} resolve khi vị trí đã ổn định (chế độ tự đo cần vài frame để đo lại)
   */
  scrollToIndex(index, align = 'start') {
    const vw = this._vw;
    if (!vw || !this._count) return Promise.resolve();
    const i = Math.max(0, Math.min(this._count - 1, Math.round(Number(index) || 0)));
    const go = () => {
      let a = align;
      if (a === 'auto' || !['start', 'center', 'end'].includes(a)) {
        const pos = this._scrollPos;
        const size = this._viewportSize;
        const from = vw.offsetOf(i);
        const to = vw.offsetOf(i + 1);
        if (from < pos) a = 'start';
        else if (to > pos + size) a = 'end';
        else return;
      }
      vw.scrollToIndex(i, a);
    };
    go();
    if (this._fixed) return Promise.resolve();
    // Tự đo: dòng vừa render đổi kích thước thật → bảng vị trí đổi → cuộn lại cho khớp (tối đa vài frame)
    return new Promise((resolve) => {
      let tries = 4;
      let last = vw.offsetOf(i);
      const tick = () => {
        const now = this._vw?.offsetOf(i);
        if (now === undefined || tries-- <= 0 || Math.abs(now - last) < 0.5) {
          resolve();
          return;
        }
        last = now;
        go();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(() => requestAnimationFrame(tick));
    });
  }

  /** Bỏ kích thước đã đo và đo lại (gọi khi đổi font / bề rộng làm mọi dòng đổi chiều cao) */
  refresh() {
    this._sizes.clear();
    this._vw?.invalidate();
  }

  // =====================================================
  // VIRTUAL WINDOW
  // =====================================================

  get _scrollPos() {
    return this.horizontal ? this._viewport.scrollLeft : this._viewport.scrollTop;
  }

  get _viewportSize() {
    return this.horizontal ? this._viewport.clientWidth : this._viewport.clientHeight;
  }

  _keyOf(index) {
    const item = this.data?.[index];
    return this.rowKey && item && typeof item === 'object' ? getPath(item, this.rowKey, index) : index;
  }

  _setupWindow() {
    if (!this.isConnected || !this._hasRendered) return;
    this._vw?.destroy();
    const estimate = this.estimatedHeight > 0 ? this.estimatedHeight : 48;
    this._reachedAt = -1;
    this._vw = new VirtualWindow(this._viewport, {
      count: this._count,
      itemSize: this._fixed ? this.itemHeight : (i) => this._sizes.get(this._keyOf(i)) ?? estimate,
      overscan: Math.max(0, this.overscan ?? 6),
      horizontal: this.horizontal,
      onRange: (range) => this._renderRange(range),
    });
  }

  _ensureRepeater() {
    if (this._repeater) return this._repeater;
    const tpl = this.querySelector(':scope > template');
    this._repeater = new Repeater(this, {
      key: (item, i) => (this.rowKey && item && typeof item === 'object' ? getPath(item, this.rowKey, this._start + i) : this._start + i),
      create: (item, i) => this._createRow(item, this._start + i, tpl),
      update: (node, item, i) => {
        if (tpl && typeof this.renderItem !== 'function') updateTemplateNode(node, item, this._start + i);
      },
    });
    return this._repeater;
  }

  _createRow(item, index, tpl) {
    if (typeof this.renderItem === 'function') {
      const out = this.renderItem(item, index);
      if (out instanceof Element) return out;
      return createElement('div', { 'data-hui-default-row': '' }, out instanceof Node ? out : String(out ?? ''));
    }
    if (tpl) return renderTemplate(tpl, item, index);
    const text = item && typeof item === 'object' ? item.label ?? item.title ?? item.name ?? JSON.stringify(item) : item;
    return createElement('div', { 'data-hui-default-row': '' }, String(text ?? ''));
  }

  /** Vẽ khoảng dòng [start, end): giữ chiều dài thanh cuộn bằng spacer, dịch khối dòng tới offset */
  _renderRange({ start, end, offset, total }) {
    const h = this.horizontal;
    this._spacer.style.width = h ? `${total}px` : '';
    this._spacer.style.height = h ? '' : `${total}px`;
    this._window.style.transform = h ? `translateX(${offset}px)` : `translateY(${offset}px)`;

    this._start = start;
    const list = this._count ? this.data.slice(start, end) : [];
    const nodes = this._ensureRepeater().render(list);
    nodes.forEach((node, i) => this._decorateRow(node, start + i));
    this._observeRows(nodes);

    if (start !== this._range.start || end !== this._range.end) {
      this._range = { start, end };
      this.emit('hui-range-change', { start, end });
    }
    this._checkReachEnd();
  }

  /** Gắn ARIA + chỉ số cho dòng (aria-setsize/posinset vì phần lớn dòng không có trong DOM) */
  _decorateRow(node, index) {
    if (!(node instanceof Element)) return;
    node.dataset.index = String(index);
    node.setAttribute('role', this.selectable ? 'option' : 'listitem');
    node.setAttribute('aria-setsize', String(this._count));
    node.setAttribute('aria-posinset', String(index + 1));
    if (this.selectable) {
      node.id = this._rowId(index);
      node.setAttribute('aria-selected', String(this._isSelected(index)));
      node.toggleAttribute('data-hui-active', index === this._activeIndex);
    } else {
      node.removeAttribute('aria-selected');
      node.removeAttribute('data-hui-active');
    }
  }

  _decorateAll() {
    this._syncAria();
    for (const node of this._repeater?.children || []) this._decorateRow(node, Number(node.dataset?.index));
  }

  _rowId(index) {
    return `hui-vl-${this._uid}-row-${index}`;
  }

  _observeRows(nodes) {
    if (!this._ro) return;
    const next = new Set(nodes.filter((n) => n instanceof Element));
    for (const n of this._observed) if (!next.has(n)) this._ro.unobserve(n);
    if (this._fixed) {
      for (const n of this._observed) this._ro.unobserve(n);
      this._observed.clear();
      return;
    }
    for (const n of next) if (!this._observed.has(n)) this._ro.observe(n);
    this._observed = next;
  }

  /**
   * Ghi kích thước thật của dòng. Giữ nguyên dòng đang ở mép trên vùng nhìn (dòng phía trên đổi cao
   * không làm nội dung nhảy): nhớ dòng neo + độ lệch trước khi tính lại, rồi bù scrollTop.
   */
  _onRowResize(entries) {
    if (this._fixed || !this._vw) return;
    const h = this.horizontal;
    let changed = false;
    const pos = this._scrollPos;
    const anchor = this._indexAtOffset(pos);
    const anchorDelta = pos - this._vw.offsetOf(anchor);

    for (const entry of entries) {
      const el = entry.target;
      if (!el.isConnected || el.dataset.index === undefined) continue;
      const box = entry.borderBoxSize?.[0];
      const size = box ? (h ? box.inlineSize : box.blockSize) : (h ? el.offsetWidth : el.offsetHeight);
      if (!(size > 0)) continue;
      const key = this._keyOf(Number(el.dataset.index));
      if (Math.abs((this._sizes.get(key) ?? -1) - size) > 0.5) {
        this._sizes.set(key, size);
        changed = true;
      }
    }
    if (!changed) return;
    this._vw.invalidate();
    if (pos > 0) {
      const target = this._vw.offsetOf(anchor) + anchorDelta;
      if (Math.abs(target - pos) > 0.5) {
        this._viewport[h ? 'scrollLeft' : 'scrollTop'] = target;
        this._vw.update();
      }
    }
  }

  /** Dòng chứa vị trí `pos` (tìm nhị phân trên bảng vị trí của VirtualWindow) */
  _indexAtOffset(pos) {
    const count = this._count;
    if (!count || !this._vw) return 0;
    let lo = 0;
    let hi = count - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this._vw.offsetOf(mid) <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  _checkReachEnd() {
    const count = this._count;
    if (!count || this.loadingMore || this._reachedAt === count) return;
    const vp = this._viewport;
    const size = this.horizontal ? vp.scrollWidth : vp.scrollHeight;
    if (this._scrollPos + this._viewportSize >= size - Math.max(0, this.endThreshold ?? 200)) {
      this._reachedAt = count; // mỗi độ dài dữ liệu chỉ phát 1 lần (thêm dữ liệu → phát lại được)
      this.emit('hui-reach-end', { count });
    }
  }

  // =====================================================
  // CHỌN + BÀN PHÍM (listbox APG)
  // =====================================================

  _syncAria() {
    const label = this.label || tx('virtualList.label');
    if (this.selectable) {
      this.setAttribute('role', 'listbox');
      this.setAttribute('aria-label', label);
      this.setAttribute('aria-orientation', this.horizontal ? 'horizontal' : 'vertical');
      if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '0');
      this._viewport.removeAttribute('tabindex');
      this._viewport.removeAttribute('role');
      this._viewport.removeAttribute('aria-label');
    } else {
      // Danh sách thường: vùng cuộn focus được để cuộn bằng bàn phím
      for (const a of ['role', 'aria-label', 'aria-orientation', 'aria-activedescendant']) this.removeAttribute(a);
      if (this.getAttribute('tabindex') === '0') this.removeAttribute('tabindex');
      this._viewport.setAttribute('tabindex', '0');
      this._viewport.setAttribute('role', 'list');
      this._viewport.setAttribute('aria-label', label);
    }
  }

  _isSelected(index) {
    return this.value !== null && this.value !== undefined && String(this._keyOf(index)) === String(this.value);
  }

  _selectedIndex() {
    if (this.value === null || this.value === undefined) return -1;
    if (!this.rowKey) {
      const i = Number(this.value);
      return Number.isInteger(i) && i < this._count ? i : -1;
    }
    return (this.data || []).findIndex((item, i) => String(this._keyOf(i)) === String(this.value));
  }

  _setActive(index, scroll) {
    const prev = this._activeIndex;
    this._activeIndex = index;
    for (const node of this._repeater?.children || []) {
      if (node instanceof Element) node.toggleAttribute('data-hui-active', Number(node.dataset.index) === index);
    }
    if (scroll) this.scrollToIndex(index, 'auto');
    if (index >= 0) this.setAttribute('aria-activedescendant', this._rowId(index));
    else this.removeAttribute('aria-activedescendant');
    return prev !== index;
  }

  _select(index) {
    if (index < 0 || index >= this._count) return;
    const key = this._keyOf(index);
    this.value = String(key);
    this._decorateAll();
    this.emit('hui-select', { item: this.data[index], index, key });
  }

  _onClick(e) {
    if (!this.selectable) return;
    const row = e.composedPath().find((n) => n instanceof Element && n.parentNode === this && n.dataset.index !== undefined);
    if (!row) return;
    const index = Number(row.dataset.index);
    this._setActive(index, false);
    this._select(index);
  }

  _onKeydown(e) {
    if (!this.selectable || e.target !== this || e.altKey || e.ctrlKey || e.metaKey) return;
    const count = this._count;
    if (!count) return;
    const cur = this._activeIndex < 0 ? Math.max(0, this._selectedIndex()) : this._activeIndex;
    const nextKey = this.horizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = this.horizontal ? 'ArrowLeft' : 'ArrowUp';
    const page = Math.max(1, Math.floor(this._viewportSize / (this._fixed ? this.itemHeight : (this.estimatedHeight || 48))) - 1);
    let next = null;
    if (e.key === nextKey) next = this._activeIndex < 0 ? cur : cur + 1;
    else if (e.key === prevKey) next = cur - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else if (e.key === 'PageDown') next = cur + page;
    else if (e.key === 'PageUp') next = cur - page;
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this._activeIndex >= 0) this._select(this._activeIndex);
      return;
    } else return;
    e.preventDefault();
    this._setActive(Math.max(0, Math.min(count - 1, next)), true);
  }
}

defineElement('hui-virtual-list', HuiVirtualList);

export default HuiVirtualList;
