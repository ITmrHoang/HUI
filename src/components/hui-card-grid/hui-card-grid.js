/**
 * HUI Card Grid — Lưới card responsive từ dữ liệu (Organism)
 * Item: <template> con / hàm `renderItem` (render vào light DOM → CSS trang áp dụng được) hoặc con trực tiếp (lưới tĩnh).
 * Bố cục: `columns` cố định (responsive theo breakpoint) hoặc auto-fill theo `min-card-width`.
 * Thêm: sắp xếp / lọc / giới hạn phía client, chọn nhiều (Shift = chọn dải), phân trang / tải thêm / cuộn vô hạn,
 * skeleton khi tải, hiệu ứng fade-up lần lượt cho item mới (bật mặc định).
 */

import styles from './hui-card-grid.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { DataController } from '../../core/data-controller.js';
import { renderTemplate, updateTemplateNode, delegateActions, getPath } from '../../core/template.js';
import { Repeater } from '../../core/repeat.js';
import { t, getLocaleName } from '../../core/locale.js';
import { intlLocale } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { runAnimation, ANIMATIONS } from '../../utils/animate.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import { ensureElement, renderLazyStateView } from '../hui-data-view/lazy-elements.js';
import '../hui-card/index.js';
import '../hui-button/index.js';
// Tải động khi dùng tới: hui-pagination (paging="pagination" và nhiều hơn 1 trang), hui-empty / hui-result (trạng thái)

/** Chuỗi dự phòng khi locale.js chưa có key cardGrid.* */
const FALLBACK = {
  vi: {
    'cardGrid.loadMore': 'Tải thêm',
    'cardGrid.select': 'Chọn mục {index}',
    'cardGrid.loading': 'Đang tải thêm...',
  },
  en: {
    'cardGrid.loadMore': 'Load more',
    'cardGrid.select': 'Select item {index}',
    'cardGrid.loading': 'Loading more...',
  },
};

function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/** Từ khóa khoảng cách — giống hui-scroller / hui-flex */
const GAP_TOKENS = {
  none: '0px',
  xs: 'var(--hui-space-xs)',
  sm: 'var(--hui-space-sm)',
  md: 'var(--hui-space-lg)',
  lg: 'var(--hui-space-xl)',
  xl: 'var(--hui-space-2xl)',
};

/** Từ khóa → token, số trơn → px, còn lại giữ nguyên (CSS length) */
function toLength(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (GAP_TOKENS[v]) return GAP_TOKENS[v];
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

/** Hậu tố breakpoint (min-width 576 / 768 / 992 / 1200 / 1600 — khớp CSS) */
const BREAKPOINTS = ['Sm', 'Md', 'Lg', 'Xl', 'Xxl'];
const PAGING = ['none', 'pagination', 'load-more', 'infinite'];
/** Con không phải item */
const SKIP_TAGS = new Set(['template', 'style', 'script', 'link', 'meta']);
/** Số item tối đa được cộng dồn độ trễ stagger (tránh item cuối chờ quá lâu) */
const STAGGER_CAP = 8;

/** Element tự hỗ trợ chọn (hui-card hoặc custom element có cả selectable + selected) */
function isSelectAware(el) {
  const C = customElements.get(el.localName);
  return Boolean(C && 'selectable' in C.prototype && 'selected' in C.prototype);
}

/** So sánh 2 giá trị khi sắp xếp: số theo số, chuỗi theo ngôn ngữ (có số tự nhiên), rỗng xuống cuối */
function compareValues(a, b, collator) {
  const blankA = a === null || a === undefined || a === '';
  const blankB = b === null || b === undefined || b === '';
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a - b;
  return collator.compare(String(a), String(b));
}

let uid = 0;

/**
 * Lưới card. Item lấy từ `data` + <template> con (hoặc `renderItem`), hoặc là con trực tiếp (lưới tĩnh).
 * Mỗi item nằm trong một ô (part="item", role="listitem") của lưới role="list".
 *
 * @fires hui-selection-change - Người dùng đổi lựa chọn (selectable). detail: { keys, items }
 * @fires hui-page-change - Đổi trang / tải thêm. detail: { page, pageSize }
 * @fires hui-action - (template) bấm phần tử có data-action. detail: { action, item, index, originalEvent }
 * @fires hui-load - (DataController) tải xong src / fetchFn. detail: { data, total }
 * @fires hui-error - (DataController) tải lỗi. detail: { error }
 * @slot - Item (lưới tĩnh). Một <template> con dùng làm khuôn khi có `data`
 * @csspart base - Khung ngoài
 * @csspart grid - Lưới item (role="list")
 * @csspart item - Ô chứa từng item (role="listitem"); thêm item-selected khi đang chọn (item không tự hỗ trợ chọn)
 * @csspart check - Ô checkbox phủ góc item (selectable, item không tự hỗ trợ chọn)
 * @csspart skeleton - Lưới skeleton khi đang tải
 * @csspart skeleton-card - Mỗi card skeleton
 * @csspart state - Vùng empty / error
 * @csspart footer - Vùng phân trang / nút tải thêm
 * @csspart pagination - <hui-pagination>
 * @csspart load-more - Nút "Tải thêm" (<hui-button>)
 * @csspart sentinel - Mốc cuộn vô hạn (kèm chữ đang tải)
 * @cssprop --hui-card-grid-gap - Khoảng cách giữa card khi không có attribute gap (mặc định --hui-space-lg)
 * @cssprop --hui-card-grid-min-card-width - Bề rộng tối thiểu card ở chế độ auto-fill khi không có attribute (240px)
 * @cssprop --hui-card-grid-item-radius - Bo góc ô item (vòng chọn, skeleton) — mặc định --hui-radius-lg
 * @cssprop --hui-card-grid-selected-color - Màu vòng chọn + checkbox (mặc định --hui-primary)
 * @cssprop --hui-card-grid-check-size - Cạnh ô checkbox phủ (mặc định 20px)
 * @cssprop --hui-card-grid-skeleton-bg - Nền khối skeleton
 * @cssprop --hui-card-grid-skeleton-height - Chiều cao ảnh skeleton (mặc định 160px)
 * @cssprop --hui-card-grid-footer-gap - Khoảng cách lưới ↔ footer (mặc định --hui-space-xl)
 * @cssprop --hui-card-grid-footer-justify - Căn footer (mặc định center)
 */
class HuiCardGrid extends DataController(HuiElement) {
  static properties = {
    /** Số cột cố định (bỏ trống = auto-fill theo min-card-width) */
    columns: { type: Number },
    /** Số cột khi màn hình ≥ 576px */
    columnsSm: { type: Number },
    /** Số cột khi màn hình ≥ 768px */
    columnsMd: { type: Number },
    /** Số cột khi màn hình ≥ 992px */
    columnsLg: { type: Number },
    /** Số cột khi màn hình ≥ 1200px */
    columnsXl: { type: Number },
    /** Số cột khi màn hình ≥ 1600px */
    columnsXxl: { type: Number },
    /** Bề rộng tối thiểu mỗi card ở chế độ auto-fill (số = px, hoặc CSS length) — mặc định 240px */
    minCardWidth: { type: String },
    /** Khoảng cách: xs | sm | md | lg | xl | none, số (px) hoặc CSS length */
    gap: { type: String },
    /** Card trong cùng hàng cao bằng nhau (kéo giãn theo card cao nhất) */
    equalHeight: { type: Boolean },
    /** Trường (đường dẫn "a.b") làm key: giữ DOM khi dữ liệu đổi, làm khóa lựa chọn */
    rowKey: { type: String },
    /** Trường sắp xếp phía client (đường dẫn "a.b") */
    sortBy: { type: String },
    /** asc | desc — chiều sắp xếp */
    sortOrder: { type: String, default: 'asc' },
    /** Hàm lọc phía client: (item, index) => boolean */
    filter: { type: Object, attribute: false },
    /** Giới hạn số item hiển thị (sau lọc + sắp xếp) */
    limit: { type: Number },
    /** Hàm tự dựng item: (item, index) => Node — thay cho <template> */
    renderItem: { type: Object, attribute: false },
    /** Hàm cập nhật node đã dựng bằng renderItem khi item đổi: (node, item, index) => void */
    updateItem: { type: Object, attribute: false },
    /** Cho phép chọn nhiều card (hui-card tự nhận selectable; item khác có checkbox phủ góc) */
    selectable: { type: Boolean },
    /** Key các item đang chọn (attribute nhận JSON "[1,2]") */
    selectedKeys: { type: Array, default: null },
    /** none | pagination | load-more | infinite — cách chia trang */
    paging: { type: String, default: 'none' },
    /** Số item mỗi trang / mỗi lần tải thêm */
    pageSize: { type: Number, default: 12 },
    /** Trang hiện tại (bắt đầu từ 1) */
    page: { type: Number, default: 1 },
    /** Tổng số bản ghi phía server — đặt khi `data` chỉ là trang hiện tại (phân trang server); bỏ trống = chia trang phía client */
    total: { type: Number },
    /** Số card skeleton khi đang tải (mặc định page-size, hoặc columns × 2, hoặc 6) */
    skeletonCount: { type: Number },
    /** Hiệu ứng xuất hiện của item mới: fade-up | fade | zoom-in | flip-up | blur-in … (xem data-hui-animate) */
    itemAnimation: { type: String, default: 'fade-up' },
    /** Độ trễ giữa các item khi xuất hiện lần lượt (ms) */
    stagger: { type: Number, default: 60 },
    /** Nhãn ARIA của lưới */
    label: { type: String },
    /** Tắt hiệu ứng xuất hiện + skeleton nhấp nháy */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    this._slotSeq = 0;
    /** Item đang hiển thị theo thứ tự */
    this._items = [];
    /** item element → { cell, slot, check, input, name } */
    this._cells = new WeakMap();
    /** item element → key / dữ liệu gốc */
    this._keyOfEl = new WeakMap();
    this._itemOfEl = new WeakMap();
    /** key → item dữ liệu (toàn bộ nguồn) */
    this._keyItem = new Map();
    /** Item mà grid đã tự bật selectable (để gỡ đúng phần mình) */
    this._ownedSelect = new WeakSet();
    this._fresh = [];
    this._repeater = null;
    this._actionsOff = null;
    this._stopSentinel = null;
    this._sentinelIn = false;
    this._waitingMore = false;
    this._anchorKey = undefined;
    this._shift = false;
    this._syncQueued = false;
    this._pendingEnter = [];
    this._enterFrame = 0;
    this._watchers = new Map();
    this._hasMore = false;
    this._pageCount = 1;
    this._count = 0;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    // Slot mặc định ẩn: con mới chưa có slot rơi vào đây → được gán slot riêng cho từng ô
    this._defaultSlot = createElement('slot');
    this._defaultSlot.addEventListener('slotchange', () => this._queueStaticSync());
    const pool = createElement('div', { className: 'cg__pool', hidden: true }, this._defaultSlot);

    this._grid = createElement('div', { className: 'cg__grid cg__layout', part: 'grid', role: 'list' });
    this._skeleton = createElement('div', { className: 'cg__layout cg__skeleton', part: 'skeleton', 'aria-hidden': 'true', hidden: true });
    this._state = createElement('div', { className: 'cg__state', part: 'state', hidden: true });

    this._pagination = createElement('hui-pagination', { part: 'pagination', 'hide-on-single-page': '' });
    // change của pagination nổi bọt xuyên shadow → chặn, phát hui-page-change thay thế
    this._pagination.addEventListener('change', (e) => {
      e.stopPropagation();
      this._goToPage(e.detail.current, true);
    });
    this._loadMoreBtn = createElement('hui-button', { part: 'load-more', variant: 'outline' });
    this._loadMoreBtn.addEventListener('click', () => this._loadNext());
    this._sentinel = createElement('div', { className: 'cg__sentinel', part: 'sentinel' },
      createElement('span', { className: 'cg__spinner', 'aria-hidden': 'true' }),
      createElement('span', { className: 'cg__sentinel-text' }));
    this._footer = createElement('div', { className: 'cg__footer', part: 'footer', hidden: true },
      this._pagination, this._loadMoreBtn, this._sentinel);

    this._base = createElement('div', { className: 'cg', part: 'base' },
      pool, this._state, this._skeleton, this._grid, this._footer);

    // Shift + click → chọn dải; chặn bôi đen chữ khi giữ Shift
    this.addEventListener('click', (e) => { this._shift = e.shiftKey; }, true);
    this.addEventListener('keydown', (e) => { this._shift = e.shiftKey; }, true);
    this.addEventListener('mousedown', (e) => {
      if (this.selectable && e.shiftKey) e.preventDefault();
    });
    // hui-card selectable tự đảo trạng thái rồi phát change {selected}
    this.addEventListener('change', (e) => this._onItemChange(e));
    return this._base;
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback();
    this._actionsOff = delegateActions(this, this);
    if (reconnect) {
      this._renderItems();
      this._syncFooter();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._actionsOff?.();
    this._actionsOff = null;
    this._stopSentinel?.();
    this._stopSentinel = null;
    for (const stop of this._watchers.values()) stop();
    this._watchers.clear();
    cancelAnimationFrame(this._enterFrame);
    this._enterFrame = 0;
    // Ô đang chờ hiệu ứng → hiện luôn (gắn lại không bị kẹt opacity 0)
    for (const cell of this._pendingEnter) cell.classList.remove('cg__cell--pending');
    this._pendingEnter = [];
    this._grid.querySelectorAll('.cg__cell--pending').forEach((c) => c.classList.remove('cg__cell--pending'));
  }

  updated(changed) {
    // Đổi cách sắp xếp / lọc → về trang 1 (trừ lần đầu)
    if (this._didFirst && ['sortBy', 'sortOrder', 'filter'].some((k) => changed.has(k)) && this.page !== 1) {
      this.page = 1;
    }
    // Dữ liệu mới về (tải thêm phía server) → hết chờ
    if (changed.has('data')) this._waitingMore = false;

    super.updated(changed);

    if (['columns', 'minCardWidth', 'gap', 'equalHeight', ...BREAKPOINTS.map((b) => `columns${b}`)].some((k) => changed.has(k))) {
      this._applyLayout();
    }
    if (changed.has('noAnimation')) this._base.classList.toggle('cg--static', this.noAnimation);
    if (changed.has('label')) {
      if (this.label) this._grid.setAttribute('aria-label', this.label);
      else this._grid.removeAttribute('aria-label');
    }

    if (['data', 'rowKey', 'sortBy', 'sortOrder', 'filter', 'limit', 'renderItem', 'paging', 'pageSize', 'page', 'total', 'src', 'fetchFn']
      .some((k) => changed.has(k))) this._renderItems();

    if (['dataState', 'loading', 'emptyText', 'data', 'src', 'fetchFn', 'locale', 'pageSize', 'paging', 'skeletonCount', 'columns']
      .some((k) => changed.has(k))) this._renderState();

    if (['selectable', 'selectedKeys', 'locale'].some((k) => changed.has(k))) this._syncSelection();
    if (['paging', 'pageSize', 'page', 'total', 'data', 'locale', 'dataState'].some((k) => changed.has(k))) this._syncFooter();

    this._didFirst = true;
  }

  // =====================================================
  // API
  // =====================================================

  /** Item đang hiển thị (element trong light DOM, theo thứ tự) — chỉ đọc */
  get items() {
    return [...this._items];
  }

  /** Số trang (theo dữ liệu sau lọc, hoặc `total`) — chỉ đọc */
  get pageCount() {
    return this._pageCount;
  }

  /** Còn trang để tải thêm không — chỉ đọc */
  get hasMore() {
    return this._hasMore;
  }

  /** Tải thêm trang kế (load-more / infinite) */
  loadMore() {
    this._loadNext();
  }

  /** Chọn mọi item (sau lọc) — phát hui-selection-change */
  selectAll() {
    if (!this.selectable) return;
    const keys = this._isDataMode ? this._processed.map((it) => this._keyOf(it)) : this._items.map((el) => this._keyOfEl.get(el));
    this.selectedKeys = keys;
    this._emitSelection();
  }

  /** Bỏ chọn tất cả — phát hui-selection-change */
  clearSelection() {
    this.selectedKeys = [];
    this._emitSelection();
  }

  /** Dựng lại toàn bộ item (vd sau khi tự đổi renderItem bên trong) */
  refresh() {
    this._repeater?.destroy();
    this._repeater = null;
    this._renderItems();
  }

  // =====================================================
  // BỐ CỤC
  // =====================================================

  /** Ghi biến nội bộ: khuôn cột theo từng breakpoint, gap, min-card-width */
  _applyLayout() {
    const set = (el, name, value) => (value ? el.style.setProperty(name, value) : el.style.removeProperty(name));
    const cols = (n) => (n > 0 ? `repeat(${Math.floor(n)}, minmax(0, 1fr))` : null);
    for (const el of [this._grid, this._skeleton]) {
      set(el, '--_cg-t-xs', cols(this.columns));
      for (const b of BREAKPOINTS) set(el, `--_cg-t-${b.toLowerCase()}`, cols(this[`columns${b}`]));
    }
    set(this._base, '--_cg-gap', toLength(this.gap));
    set(this._base, '--_cg-min', toLength(this.minCardWidth));
    this._base.classList.toggle('cg--equal', this.equalHeight);
  }

  get _isDataMode() {
    return this.data != null || Boolean(this.src) || Boolean(this.fetchFn);
  }

  get _paging() {
    return PAGING.includes(this.paging) ? this.paging : 'none';
  }

  get _serverPaging() {
    return this.total > 0 || (this.dataTotal != null && this.dataTotal > 0);
  }

  get _serverTotal() {
    return this.total > 0 ? this.total : this.dataTotal;
  }

  // =====================================================
  // DỮ LIỆU → ITEM
  // =====================================================

  /** Key của item dữ liệu: theo row-key, không có thì theo vị trí trong mảng gốc */
  _keyOf(item) {
    if (this.rowKey) {
      const k = getPath(item, this.rowKey);
      if (k !== undefined && k !== null) return k;
    }
    return this._indexOf.get(item);
  }

  /** Lọc → sắp xếp → giới hạn → cắt trang. Ghi lại số liệu phân trang. */
  _compute() {
    const source = Array.isArray(this.data) ? this.data : [];
    this._indexOf = new Map();
    source.forEach((it, i) => { if (!this._indexOf.has(it)) this._indexOf.set(it, i); });
    this._keyItem = new Map(source.map((it) => [this._keyOf(it), it]));

    let list = typeof this.filter === 'function' ? source.filter((it, i) => this.filter(it, i)) : [...source];
    if (this.sortBy) {
      const collator = new Intl.Collator(intlLocale(), { numeric: true, sensitivity: 'base' });
      const dir = this.sortOrder === 'desc' ? -1 : 1;
      const path = this.sortBy;
      list.sort((a, b) => dir * compareValues(getPath(a, path), getPath(b, path), collator));
    }
    if (this.limit > 0) list = list.slice(0, this.limit);
    this._processed = list;

    const mode = this._paging;
    const size = Math.max(1, Math.floor(this.pageSize || 12));
    const server = this._serverPaging;
    const count = server ? this._serverTotal : list.length;
    const pages = mode === 'none' ? 1 : Math.max(1, Math.ceil(count / size));
    const page = Math.min(Math.max(1, Math.floor(this.page || 1)), pages);
    this._count = count;
    this._pageCount = pages;
    this._effectivePage = page;

    let view = list;
    let offset = 0;
    if (!server && mode === 'pagination') {
      offset = (page - 1) * size;
      view = list.slice(offset, offset + size);
    } else if (!server && (mode === 'load-more' || mode === 'infinite')) {
      view = list.slice(0, page * size);
    } else if (server && mode === 'pagination') {
      offset = (page - 1) * size;
    }
    this._hasMore = (mode === 'load-more' || mode === 'infinite') && (server ? list.length < count : view.length < list.length);
    return { view, offset };
  }

  _createNode(item, index) {
    if (typeof this.renderItem === 'function') {
      const node = this.renderItem(item, index);
      if (node instanceof Node) return node;
    }
    const tpl = this.querySelector(':scope > template');
    if (tpl) return renderTemplate(tpl, item, index);
    // Không có khuôn → hui-card đơn giản từ title/name + description
    const card = createElement('hui-card', { title: String(item?.title ?? item?.name ?? item ?? '') });
    if (item?.description) card.append(String(item.description));
    return card;
  }

  _renderItems() {
    if (!this._hasRendered) return;
    if (!this._isDataMode) {
      this._repeater?.destroy();
      this._repeater = null;
      this._syncStatic();
      return;
    }
    const { view, offset } = this._compute();
    // Vị trí tuyệt đối ($index, hui-action index) = offset trang + vị trí trong trang
    this._offset = offset;
    if (!this._repeater || this._repeaterKey !== this.rowKey || this._repeaterFn !== this.renderItem) {
      this._repeater?.destroy();
      this._repeaterKey = this.rowKey;
      this._repeaterFn = this.renderItem;
      this._repeater = new Repeater(this, {
        key: (item) => this._keyOf(item),
        create: (item, i) => {
          const node = this._createNode(item, this._offset + i);
          this._fresh.push(node);
          return node;
        },
        update: (node, item, i) => {
          if (typeof this.renderItem === 'function') this.updateItem?.(node, item, this._offset + i);
          else updateTemplateNode(node, item, this._offset + i);
        },
      });
    }
    const nodes = this._repeater.render(view);
    nodes.forEach((node, i) => {
      this._keyOfEl.set(node, this._keyOf(view[i]));
      this._itemOfEl.set(node, view[i]);
    });
    this._setItems(nodes);
  }

  /** Lưới tĩnh: con trực tiếp là item (bỏ template/style/script và phần tử có slot riêng) */
  _syncStatic() {
    const prefix = `hui-cg-${this._uid}-`;
    const items = [...this.children].filter((el) => !SKIP_TAGS.has(el.localName)
      && (!el.hasAttribute('slot') || el.getAttribute('slot').startsWith(prefix)));
    items.forEach((el, i) => {
      if (!this._cells.has(el)) this._fresh.push(el);
      this._keyOfEl.set(el, el.dataset.key ?? (el.id || i));
      this._itemOfEl.set(el, el);
    });
    this._count = items.length;
    this._pageCount = 1;
    this._hasMore = false;
    this._setItems(items);
    this._syncSelection();
  }

  _queueStaticSync() {
    if (this._isDataMode || this._syncQueued) return;
    this._syncQueued = true;
    queueMicrotask(() => {
      this._syncQueued = false;
      if (!this._isDataMode) this._syncStatic();
    });
  }

  /** Đặt danh sách item: gán slot riêng, xếp ô đúng thứ tự, gỡ ô thừa, chạy hiệu ứng cho item mới */
  _setItems(items) {
    this._items = items;
    let prev = null;
    const used = new Set();
    items.forEach((el) => {
      let rec = this._cells.get(el);
      if (!rec) rec = this._makeCell(el);
      if (el.getAttribute('slot') !== rec.name) el.setAttribute('slot', rec.name);
      const ref = prev ? prev.nextSibling : this._grid.firstChild;
      if (rec.cell !== ref) this._grid.insertBefore(rec.cell, ref);
      prev = rec.cell;
      used.add(rec.cell);
    });
    for (const cell of [...this._grid.children]) {
      if (!used.has(cell)) {
        cell.remove();
        this._unwatch(cell);
      }
    }
    const fresh = this._fresh.filter((el) => items.includes(el));
    this._fresh = [];
    this._syncSelection();
    this._animateEnter(fresh.map((el) => this._cells.get(el).cell));
    if (this._paging === 'infinite') this._checkSentinel();
  }

  _makeCell(el) {
    const name = `hui-cg-${this._uid}-${++this._slotSeq}`;
    const slot = createElement('slot', { name });
    // Item bị gỡ / chuyển đi (lưới tĩnh) → đồng bộ lại
    slot.addEventListener('slotchange', () => this._queueStaticSync());
    const input = createElement('input', { type: 'checkbox', className: 'cg__check-input' });
    input.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggle(el, input.checked, e.shiftKey);
    });
    // change của checkbox nội bộ không lọt ra ngoài (trùng tên với change của hui-card)
    input.addEventListener('change', (e) => e.stopPropagation());
    const check = createElement('label', { className: 'cg__check', part: 'check', hidden: true }, input);
    const cell = createElement('div', { className: 'cg__cell', part: 'item', role: 'listitem' }, slot, check);
    const rec = { cell, slot, check, input, name };
    this._cells.set(el, rec);
    return rec;
  }

  // =====================================================
  // HIỆU ỨNG XUẤT HIỆN
  // =====================================================

  get _canAnimate() {
    return !this.noAnimation && !prefersReducedMotion() && Boolean(ANIMATIONS[this.itemAnimation] || ANIMATIONS['fade-up']);
  }

  /** Ô mới: ẩn chờ → khi vào khung nhìn thì chạy hiệu ứng (ô cùng lượt hiện lần lượt theo stagger) */
  _animateEnter(cells) {
    if (!cells.length || !this._canAnimate || !this.isConnected) return;
    for (const cell of cells) {
      cell.classList.add('cg__cell--pending');
      const stop = inView(cell, (entry) => {
        if (!entry.isIntersecting) return;
        this._unwatch(cell);
        this._pendingEnter.push(cell);
        if (!this._enterFrame) this._enterFrame = requestAnimationFrame(() => this._flushEnter());
      }, { threshold: 0, rootMargin: '0px 0px -5% 0px' });
      this._watchers.set(cell, stop);
    }
  }

  _flushEnter() {
    this._enterFrame = 0;
    const cells = this._pendingEnter.filter((c) => c.isConnected);
    this._pendingEnter = [];
    // Theo thứ tự hiển thị trong lưới
    cells.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const stagger = Math.max(0, this.stagger ?? 60);
    cells.forEach((cell, i) => {
      cell.classList.remove('cg__cell--pending');
      runAnimation([cell], this.itemAnimation, { duration: 500, delay: Math.min(i, STAGGER_CAP) * stagger });
    });
  }

  _unwatch(cell) {
    const stop = this._watchers.get(cell);
    if (stop) {
      stop();
      this._watchers.delete(cell);
    }
  }

  // =====================================================
  // TRẠNG THÁI: skeleton / empty / error
  // =====================================================

  _renderState() {
    const state = this.dataState;
    const loading = state === 'loading';
    if (loading) this._renderSkeleton();
    else {
      this._skeleton.hidden = true;
      this._skeleton.replaceChildren();
    }
    if (state === 'empty' || state === 'error') renderLazyStateView(this, this._state);
    else {
      this._state.hidden = true;
      this._state.replaceChildren();
    }
    this._grid.hidden = loading || state === 'empty' || state === 'error';
    this._grid.toggleAttribute('aria-busy', loading);
    this._base.classList.toggle('cg--loading', loading);
  }

  _renderSkeleton() {
    const count = this.skeletonCount > 0 ? this.skeletonCount
      : this._paging !== 'none' ? Math.max(1, this.pageSize || 12)
        : this.columns > 0 ? this.columns * 2 : 6;
    if (this._skeleton.children.length !== count) {
      const card = () => createElement('div', { className: 'cg__sk', part: 'skeleton-card' },
        createElement('div', { className: 'cg__sk-media' }),
        createElement('div', { className: 'cg__sk-line cg__sk-line--title' }),
        createElement('div', { className: 'cg__sk-line' }),
        createElement('div', { className: 'cg__sk-line cg__sk-line--short' }));
      this._skeleton.replaceChildren(...Array.from({ length: count }, card));
    }
    this._skeleton.hidden = false;
  }

  // =====================================================
  // PHÂN TRANG / TẢI THÊM
  // =====================================================

  _syncFooter() {
    if (!this._hasRendered) return;
    const mode = this._paging;
    const ready = this.dataState !== 'loading' && this.dataState !== 'empty' && this.dataState !== 'error';
    const isData = this._isDataMode;
    const showPagination = isData && ready && mode === 'pagination';
    const showMore = isData && ready && mode === 'load-more' && this._hasMore;
    const showSentinel = isData && ready && mode === 'infinite' && this._hasMore;

    this._pagination.hidden = !showPagination;
    if (showPagination) {
      const size = Math.max(1, this.pageSize || 12);
      // hide-on-single-page: chỉ 1 trang thì pagination tự ẩn → chưa cần tải
      if (this._count > size) ensureElement('hui-pagination');
      this._pagination.total = this._count;
      this._pagination.pageSize = size;
      this._pagination.current = this._effectivePage || 1;
    }
    this._loadMoreBtn.hidden = !showMore;
    this._loadMoreBtn.textContent = tx('cardGrid.loadMore');
    this._loadMoreBtn.loading = this._waitingMore;
    this._sentinel.hidden = !showSentinel;
    this._sentinel.classList.toggle('cg__sentinel--busy', this._waitingMore);
    this._sentinel.querySelector('.cg__sentinel-text').textContent = this._waitingMore ? tx('cardGrid.loading') : '';
    this._footer.hidden = !(showPagination || showMore || showSentinel);

    if (showSentinel && !this._stopSentinel && this.isConnected) {
      this._stopSentinel = inView(this._sentinel, (entry) => {
        this._sentinelIn = entry.isIntersecting;
        if (entry.isIntersecting) this._loadNext();
      }, { threshold: 0, rootMargin: '0px 0px 200px 0px' });
    } else if (!showSentinel && this._stopSentinel) {
      this._stopSentinel();
      this._stopSentinel = null;
      this._sentinelIn = false;
    }
  }

  /** Mốc vẫn còn trong khung nhìn sau khi thêm item (item thấp) → tải tiếp */
  _checkSentinel() {
    requestAnimationFrame(() => {
      if (!this._sentinelIn || !this._hasMore || this._waitingMore || this._sentinel.hidden) return;
      const r = this._sentinel.getBoundingClientRect();
      if (r.top < window.innerHeight + 200) this._loadNext();
    });
  }

  _loadNext() {
    if (!this._hasMore || this._waitingMore) return;
    const next = (this._effectivePage || 1) + 1;
    // Server: chờ người dùng nối thêm data (hui-page-change) → nút loading
    if (this._serverPaging) {
      this._waitingMore = true;
      this._syncFooter();
    }
    this._goToPage(next, false);
  }

  _goToPage(page, scrollTop) {
    const next = Math.max(1, Math.floor(page) || 1);
    if (next === this.page && next === this._effectivePage) return;
    this.page = next;
    this.emit('hui-page-change', { page: next, pageSize: Math.max(1, this.pageSize || 12) });
    // Phân trang: đầu lưới đã cuộn khuất → đưa về đầu lưới
    if (scrollTop && this.getBoundingClientRect().top < 0) {
      this.scrollIntoView({ block: 'start', behavior: this._canAnimate ? 'smooth' : 'auto' });
    }
  }

  // =====================================================
  // LỰA CHỌN
  // =====================================================

  _syncSelection() {
    if (!this._hasRendered) return;
    const on = this.selectable;
    const keys = new Set(this.selectedKeys || []);
    this._items.forEach((el, i) => {
      const rec = this._cells.get(el);
      if (!rec) return;
      const key = this._keyOfEl.get(el);
      const selected = on && keys.has(key);
      const aware = isSelectAware(el);
      if (aware) {
        if (on) {
          if (!el.selectable) {
            el.selectable = true;
            this._ownedSelect.add(el);
          }
          if (el.selected !== selected) el.selected = selected;
        } else if (this._ownedSelect.has(el)) {
          el.selectable = false;
          el.selected = false;
          this._ownedSelect.delete(el);
        }
      }
      const overlay = on && !aware;
      rec.check.hidden = !overlay;
      rec.input.checked = overlay && selected;
      rec.input.setAttribute('aria-label', tx('cardGrid.select', { index: i + 1 }));
      rec.cell.classList.toggle('cg__cell--selected', overlay && selected);
      rec.cell.setAttribute('part', overlay && selected ? 'item item-selected' : 'item');
    });
  }

  /** change từ item tự hỗ trợ chọn (hui-card) */
  _onItemChange(e) {
    if (!this.selectable) return;
    const el = e.composedPath()[0];
    if (!this._keyOfEl.has(el) || !this._items.includes(el) || !isSelectAware(el)) return;
    if (typeof e.detail?.selected !== 'boolean') return;
    this._toggle(el, e.detail.selected, this._shift);
  }

  /** Đổi trạng thái chọn của 1 item; `range` (Shift) → áp cho cả dải từ item chọn trước đó */
  _toggle(el, selected, range) {
    const key = this._keyOfEl.get(el);
    const set = new Set(this.selectedKeys || []);
    const keys = this._items.map((it) => this._keyOfEl.get(it));
    const from = range && this._anchorKey !== undefined ? keys.indexOf(this._anchorKey) : -1;
    const to = keys.indexOf(key);
    if (from >= 0 && to >= 0) {
      const [a, b] = from < to ? [from, to] : [to, from];
      for (let i = a; i <= b; i++) {
        if (selected) set.add(keys[i]);
        else set.delete(keys[i]);
      }
    } else if (selected) set.add(key);
    else set.delete(key);
    this._anchorKey = key;
    this._shift = false;
    this.selectedKeys = [...set];
    this._syncSelection();
    this._emitSelection();
  }

  _emitSelection() {
    const keys = [...(this.selectedKeys || [])];
    let items;
    if (this._isDataMode) items = keys.map((k) => this._keyItem.get(k)).filter((it) => it !== undefined);
    else {
      const byKey = new Map(this._items.map((el) => [this._keyOfEl.get(el), el]));
      items = keys.map((k) => byKey.get(k)).filter(Boolean);
    }
    this.emit('hui-selection-change', { keys, items });
  }
}

defineElement('hui-card-grid', HuiCardGrid);

export { HuiCardGrid };
export default HuiCardGrid;
