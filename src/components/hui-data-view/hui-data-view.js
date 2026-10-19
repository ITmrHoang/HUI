/**
 * HUI Data View — "trang danh sách" trọn gói: MỘT nguồn dữ liệu, NHIỀU cách xem (list | grid | table) (Organism)
 * Thanh công cụ (tìm bỏ dấu, chip lọc, sắp xếp, chuyển chế độ xem, đếm kết quả), phân trang | xem thêm | cuộn vô hạn,
 * chọn nhiều + thanh thao tác hàng loạt, đồng bộ URL, nhớ chế độ xem, skeleton đúng hình dạng, hiệu ứng stagger + FLIP.
 * Dữ liệu qua DataController: `data` (CLIENT — tự tìm / lọc / sắp xếp / cắt trang trong bộ nhớ)
 * hoặc `src` / `fetchFn` (SERVER — ghi {q, sort, order, page, pageSize, …lọc} vào `params` để tải lại).
 */

import styles from './hui-data-view.css?raw';
import lightStyles from './hui-data-view-light.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { DataController } from '../../core/data-controller.js';
import { renderTemplate, updateTemplateNode, getPath } from '../../core/template.js';
import { Repeater } from '../../core/repeat.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement, createStyle } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { runAnimation, animationsDisabled } from '../../utils/animate.js';
import { processRows, parseList } from './data-view-query.js';
import { createCell, createHeaderCell } from './data-view-table.js';
import '../hui-icon/hui-icon.js';
import '../hui-input/index.js';
import '../hui-select/index.js';
import '../hui-tag/index.js';
import '../hui-pagination/index.js';
import '../hui-checkbox/index.js';
import '../hui-button/index.js';
import '../hui-empty/index.js';
import '../hui-result/index.js';

// Icon chế độ xem (menu / grid / table) nằm trong bộ icon chung (hui-icon/icons.js)

/** Chuỗi dự phòng khi locale.js chưa có key dataView.* */
const FALLBACK = {
  vi: {
    'dataView.label': 'Danh sách dữ liệu',
    'dataView.searchPlaceholder': 'Tìm kiếm...',
    'dataView.searchLabel': 'Tìm trong danh sách',
    'dataView.resultCount': '{count} kết quả',
    'dataView.clearFilters': 'Xóa lọc',
    'dataView.sort': 'Sắp xếp',
    'dataView.sortDefault': 'Mặc định',
    'dataView.views': 'Chế độ xem',
    'dataView.viewList': 'Danh sách',
    'dataView.viewGrid': 'Lưới',
    'dataView.viewTable': 'Bảng',
    'dataView.loadMore': 'Xem thêm',
    'dataView.loadingMore': 'Đang tải thêm...',
    'dataView.selected': 'Đã chọn {count}',
    'dataView.clearSelection': 'Bỏ chọn',
    'dataView.selectItem': 'Chọn {name}',
    'dataView.selectAll': 'Chọn tất cả',
    'dataView.noResults': 'Không tìm thấy kết quả phù hợp',
    'dataView.yes': 'Có',
    'dataView.no': 'Không',
  },
  en: {
    'dataView.label': 'Data list',
    'dataView.searchPlaceholder': 'Search...',
    'dataView.searchLabel': 'Search the list',
    'dataView.resultCount': '{count} results',
    'dataView.clearFilters': 'Clear filters',
    'dataView.sort': 'Sort by',
    'dataView.sortDefault': 'Default',
    'dataView.views': 'View',
    'dataView.viewList': 'List',
    'dataView.viewGrid': 'Grid',
    'dataView.viewTable': 'Table',
    'dataView.loadMore': 'Load more',
    'dataView.loadingMore': 'Loading more...',
    'dataView.selected': '{count} selected',
    'dataView.clearSelection': 'Clear selection',
    'dataView.selectItem': 'Select {name}',
    'dataView.selectAll': 'Select all',
    'dataView.noResults': 'No matching results',
    'dataView.yes': 'Yes',
    'dataView.no': 'No',
  },
};

function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

const VIEWS = ['list', 'grid', 'table'];
const CARD_VIEWS = new Set(['list', 'grid']);
const PAGINGS = ['pagination', 'load-more', 'infinite', 'none'];
const VIEW_ICONS = { list: 'menu', grid: 'grid', table: 'table' };
const VIEW_LABELS = { list: 'dataView.viewList', grid: 'dataView.viewGrid', table: 'dataView.viewTable' };
/** Sự kiện của control nội bộ (input, select, tag, checkbox, pagination) — chặn lại để không lẫn với sự kiện của data-view */
const INNER_EVENTS = ['input', 'change', 'hui-change', 'clear', 'hui-search', 'close'];
/** Hiệu ứng */
const STAGGER = 40;
const STAGGER_CAP = 10;
const FLIP_DURATION = 380;
const FLIP_EASE = 'cubic-bezier(0.2, 0, 0, 1)';

/** Trường dự phòng khi chế độ xem không có <template> */
const TITLE_FIELDS = ['title', 'name', 'label'];
const DESC_FIELDS = ['description', 'desc', 'subtitle', 'summary'];
const IMAGE_FIELDS = ['image', 'avatar', 'thumbnail', 'cover'];

/** Item đã render: node (wrapper / <tr>) → { item, index, key } */
const itemOf = new WeakMap();

/**
 * CSS cho phần tử ở LIGHT DOM (khung chứa + wrapper item + checkbox phủ + item dự phòng).
 * ::slotted() chỉ chạm được phần tử con trực tiếp → cần 1 stylesheet ở cùng phạm vi với thẻ
 * (document hoặc shadow root cha), gắn 1 lần cho mỗi phạm vi. Selector bọc :where() → CSS của bạn luôn thắng.
 */
const styledRoots = new WeakSet();
let lightSheet = null;
function ensureLightStyles(host) {
  const root = host.getRootNode();
  if (!root || styledRoots.has(root) || !(root instanceof Document || root instanceof ShadowRoot)) return;
  styledRoots.add(root);
  if ('adoptedStyleSheets' in root && typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
    if (!lightSheet) {
      lightSheet = new CSSStyleSheet();
      lightSheet.replaceSync(lightStyles);
    }
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, lightSheet];
  } else {
    const style = createStyle(lightStyles);
    style.setAttribute('data-hui-data-view', '');
    (root instanceof Document ? root.head : root).append(style);
  }
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const firstField = (item, fields) => {
  for (const f of fields) {
    const v = item?.[f];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
};

let uid = 0;

/**
 * @fires hui-change - Trạng thái truy vấn đổi (chế độ xem, từ khóa, lọc, sắp xếp, trang). detail: { state }
 * @fires hui-action - Bấm phần tử `data-action` trong template hoặc nút ở cột `actions`. detail: { action, item, index, originalEvent }
 * @fires hui-selection-change - Đổi lựa chọn (selectable). detail: { keys, items }
 * @fires hui-load - (DataController) tải xong src / fetchFn. detail: { data, total }
 * @fires hui-error - (DataController) tải lỗi. detail: { error }
 * @slot toolbar-start - Đầu thanh công cụ (trước ô tìm)
 * @slot toolbar-end - Cuối thanh công cụ (sau nút chuyển chế độ xem)
 * @slot bulk-actions - Nút thao tác hàng loạt trong thanh "Đã chọn N" (hiện khi có mục được chọn)
 * @csspart base - Khung ngoài
 * @csspart toolbar - Thanh công cụ
 * @csspart search - Vùng ô tìm kiếm (role="search")
 * @csspart filters - Hàng chip lọc
 * @csspart filter-group - Mỗi nhóm chip lọc (role="group")
 * @csspart filter-label - Nhãn của nhóm lọc
 * @csspart clear-filters - Nút "Xóa lọc"
 * @csspart sort - hui-select sắp xếp
 * @csspart views - Nhóm nút chuyển chế độ xem (role="group")
 * @csspart view-button - Mỗi nút chế độ xem (thêm view-button-active cho nút đang chọn)
 * @csspart count - Dòng "{count} kết quả" (aria-live)
 * @csspart bulk-bar - Thanh thao tác hàng loạt
 * @csspart bulk-count - Chữ "Đã chọn N"
 * @csspart bulk-clear - Nút "Bỏ chọn"
 * @csspart body - Vùng nội dung (chứa các chế độ xem + trạng thái)
 * @csspart state - Vùng skeleton / rỗng / lỗi
 * @csspart skeleton - Khung skeleton của chế độ đang xem
 * @csspart list - Khung chế độ list (item ở light DOM: `[slot="view-list"] > .hui-dv-item`)
 * @csspart grid - Khung chế độ grid (item ở light DOM: `[slot="view-grid"] > .hui-dv-item`)
 * @csspart table-wrap - Khung cuộn của bảng
 * @csspart table - Thẻ <table>
 * @csspart th - Ô tiêu đề cột
 * @csspart sort-button - Nút sắp xếp trong tiêu đề cột
 * @csspart row - Mỗi dòng <tr> (thêm row-selected khi được chọn)
 * @csspart cell - Mỗi ô <td>
 * @csspart action - Nút ở cột actions (thêm action-danger)
 * @csspart footer - Vùng phân trang / xem thêm
 * @csspart pagination - hui-pagination
 * @csspart load-more - Nút "Xem thêm"
 * @csspart sentinel - Mốc cuộn vô hạn (hiện "Đang tải thêm...")
 * @cssprop --hui-data-view-gap - Khoảng cách giữa các khối (toolbar, lọc, nội dung, phân trang)
 * @cssprop --hui-data-view-toolbar-gap - Khoảng cách các control trên thanh công cụ
 * @cssprop --hui-data-view-search-width - Bề rộng ô tìm (mặc định 280px, co lại trên mobile)
 * @cssprop --hui-data-view-list-gap - Khoảng cách các dòng chế độ list
 * @cssprop --hui-data-view-grid-min - Bề rộng tối thiểu mỗi thẻ chế độ grid (mặc định 220px)
 * @cssprop --hui-data-view-grid-gap - Khoảng cách các thẻ chế độ grid
 * @cssprop --hui-data-view-item-bg - Nền item dự phòng (không có template)
 * @cssprop --hui-data-view-item-radius - Bo góc item
 * @cssprop --hui-data-view-item-border-color - Viền item dự phòng
 * @cssprop --hui-data-view-item-hover-shadow - Bóng item dự phòng khi hover
 * @cssprop --hui-data-view-selected-color - Viền / nền nhấn của item được chọn
 * @cssprop --hui-data-view-view-active-bg - Nền nút chế độ xem đang chọn
 * @cssprop --hui-data-view-view-active-color - Màu icon nút chế độ xem đang chọn
 * @cssprop --hui-data-view-count-color - Màu dòng đếm kết quả
 * @cssprop --hui-data-view-bulk-bg - Nền thanh thao tác hàng loạt
 * @cssprop --hui-data-view-bulk-color - Màu chữ thanh thao tác hàng loạt
 * @cssprop --hui-data-view-table-max-height - Chiều cao tối đa bảng (đặt giá trị → tiêu đề dính khi cuộn trong bảng)
 * @cssprop --hui-data-view-table-header-bg - Nền hàng tiêu đề
 * @cssprop --hui-data-view-table-border-color - Đường kẻ bảng
 * @cssprop --hui-data-view-table-row-hover-bg - Nền dòng khi hover
 * @cssprop --hui-data-view-table-stripe-bg - Nền dòng chẵn (striped)
 * @cssprop --hui-data-view-table-cell-padding - Đệm ô bảng
 * @cssprop --hui-data-view-skeleton-color - Màu khối skeleton
 */
class HuiDataView extends DataController(HuiElement) {
  static properties = {
    /** list | grid | table — chế độ xem hiện tại */
    view: { type: String, default: 'list' },
    /** Các nút chuyển chế độ xem hiển thị, phân tách bằng dấu phẩy (1 chế độ = ẩn nhóm nút) */
    views: { type: String, default: 'list,grid,table' },
    /** Cột của chế độ table: [{ key, title, type, sortable, width, align, format, render, actions }] — gán bằng JS */
    columns: { type: Array, default: null },
    /** Trường làm key của item (giữ DOM khi đổi thứ tự, làm key chọn nhiều); mặc định id → key → vị trí */
    rowKey: { type: String },
    /** Hiện ô tìm kiếm */
    search: { type: Boolean },
    /** Chữ gợi ý ô tìm (mặc định theo locale) */
    searchPlaceholder: { type: String },
    /** Trường được tìm, phân tách bằng dấu phẩy (hỗ trợ "a.b"); bỏ trống = mọi trường chuỗi */
    searchFields: { type: String },
    /** Trì hoãn áp dụng từ khóa khi gõ (ms) */
    searchDebounce: { type: Number, default: 300 },
    /** Bộ lọc dạng chip: [{ key, label, options: [{ label, value }], multiple, match? }] */
    filters: { type: Array, default: null },
    /** Lựa chọn sắp xếp: [{ label, key, order: 'asc' | 'desc', compare? }] */
    sortOptions: { type: Array, default: null },
    /** pagination | load-more | infinite | none — cách chia trang */
    paging: { type: String, default: 'pagination' },
    /** Số item mỗi trang / mỗi lần "xem thêm" */
    pageSize: { type: Number, default: 12 },
    /** Cho phép chọn nhiều (checkbox mỗi item; bảng có ô chọn tất cả) */
    selectable: { type: Boolean },
    /** Key các item đang chọn */
    selectedKeys: { type: Array, default: [] },
    /** Đồng bộ trạng thái lên URL: có mặt = bật; giá trị = tiền tố key (vd "p" → p_view, p_q) để 2 data-view cùng trang */
    syncUrl: { type: String, default: null },
    /** replace | push — replace: không thêm lịch sử; push: mỗi thay đổi là 1 bước Back */
    syncUrlMode: { type: String, default: 'replace' },
    /** Nhớ chế độ xem trong localStorage (key `hui-data-view:<persist-key | id>`) */
    persistView: { type: Boolean },
    /** Tên khóa nhớ chế độ xem (mặc định = id của thẻ) */
    persistKey: { type: String },
    /** Ép xử lý phía server (component chỉ ghi params, dữ liệu đã được lọc / cắt trang sẵn) */
    server: { type: Boolean },
    /** Ép xử lý phía client dù dùng src / fetchFn (tải 1 lần rồi tìm / lọc / sắp xếp trong bộ nhớ) */
    clientSide: { type: Boolean },
    /** Bảng kẻ sọc dòng chẵn */
    striped: { type: Boolean },
    /** Trường tiêu đề của item dự phòng (không có template); mặc định title → name → label */
    titleKey: { type: String },
    /** Trường mô tả của item dự phòng; mặc định description → desc → subtitle → summary */
    descriptionKey: { type: String },
    /** Trường ảnh của item dự phòng; mặc định image → avatar → thumbnail → cover */
    imageKey: { type: String },
    /** Nhãn ARIA của danh sách (mặc định theo locale) */
    label: { type: String },
    /** Tắt hiệu ứng xuất hiện / chuyển chế độ xem */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    /** Trạng thái truy vấn (view + pageSize nằm ở property) */
    this._state = { q: '', sort: null, order: null, page: 1, filters: {} };
    this._initDone = false;
    this._lastSig = null;
    this._defaults = { view: 'list' };
    this._skipUrlWrite = false;
    /** params do người dùng tự đặt (giữ lại khi component ghi params server) */
    this._baseParams = null;
    this._ownParams = undefined;
    /** SERVER: các dòng đã nhận (tích lũy khi load-more / infinite) */
    this._rows = [];
    this._appendPending = false;
    this._lastBatch = 0;
    /** key (chuỗi) → item, phục vụ selectedItems */
    this._itemByKey = new Map();
    /** item → key (tính 1 lần khi data đổi) */
    this._keyMap = new WeakMap();
    this._cache = { data: null, sig: '', rows: [] };
    this._repeaters = {};
    this._renderedView = null;
    this._vis = { rows: [], count: 0, hasMore: false, pages: 1 };
    this._searchTimer = 0;
    this._typing = false;
    this._sentinelStop = null;
    this._sentinelFrame = 0;
    this._structureSig = '';
    this._headSig = '';

    // hui-action: 1 listener cho cả item ở light DOM (template data-action) lẫn nút trong bảng (shadow DOM)
    this.addEventListener('click', (e) => this._onHostClick(e));
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    // ---- Thanh công cụ ----
    this._searchInput = createElement('hui-input', { type: 'search', clearable: true, className: 'dv__search-input' },
      createElement('hui-icon', { name: 'search', slot: 'prefix' }));
    this._searchInput.addEventListener('input', (e) => this._onSearchInput(e.detail?.value ?? ''));
    this._searchInput.addEventListener('clear', () => this._applySearch(''));
    this._searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._applySearch(this._searchInput.value ?? '');
    });
    this._searchBox = createElement('div', { className: 'dv__search', part: 'search', role: 'search' }, this._searchInput);

    this._sortSelect = createElement('hui-select', { className: 'dv__sort', part: 'sort', 'label-position': 'inline', 'allow-clear': true });
    this._sortSelect.addEventListener('change', (e) => this._onSortSelect(e.detail?.value));

    this._viewsGroup = createElement('div', { className: 'dv__views', part: 'views', role: 'group' });
    this._viewsGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-view]');
      if (btn) this.updateQuery({ view: btn.dataset.view });
    });

    this._startSlot = createElement('slot', { name: 'toolbar-start' });
    this._endSlot = createElement('slot', { name: 'toolbar-end' });
    for (const slot of [this._startSlot, this._endSlot]) slot.addEventListener('slotchange', () => this._syncToolbarVisibility());
    this._toolbar = createElement('div', { className: 'dv__toolbar', part: 'toolbar' },
      this._startSlot, this._searchBox, createElement('span', { className: 'dv__spacer' }),
      this._sortSelect, this._viewsGroup, this._endSlot);

    // ---- Chip lọc ----
    this._filterGroups = createElement('div', { className: 'dv__filter-groups' });
    this._clearFiltersBtn = createElement('hui-button', { variant: 'link', size: 'sm', className: 'dv__clear-filters', part: 'clear-filters', icon: 'close' });
    this._clearFiltersBtn.addEventListener('click', () => this.clearFilters());
    this._filtersEl = createElement('div', { className: 'dv__filters', part: 'filters', hidden: true }, this._filterGroups, this._clearFiltersBtn);
    this._filtersEl.addEventListener('change', (e) => {
      const tag = e.target.closest?.('hui-tag[data-filter]');
      if (tag) this._onChip(tag);
    });

    // ---- Đếm + thao tác hàng loạt ----
    this._countEl = createElement('div', { className: 'dv__count', part: 'count', role: 'status', 'aria-live': 'polite' });
    this._bulkCount = createElement('span', { className: 'dv__bulk-count', part: 'bulk-count', 'aria-live': 'polite' });
    this._bulkClear = createElement('hui-button', { variant: 'text', size: 'sm', className: 'dv__bulk-clear', part: 'bulk-clear' });
    this._bulkClear.addEventListener('click', () => this.clearSelection());
    this._bulkSlot = createElement('slot', { name: 'bulk-actions' });
    this._bulkBar = createElement('div', { className: 'dv__bulk', part: 'bulk-bar', role: 'group', hidden: true },
      this._bulkCount, createElement('span', { className: 'dv__bulk-actions' }, this._bulkSlot), this._bulkClear);

    // ---- Nội dung: 3 chế độ xem + vùng trạng thái ----
    this._stateEl = createElement('div', { className: 'dv__state', part: 'state', hidden: true });
    this._viewEls = {
      list: createElement('div', { className: 'dv__view dv__view--list', part: 'list', hidden: true }, createElement('slot', { name: 'view-list' })),
      grid: createElement('div', { className: 'dv__view dv__view--grid', part: 'grid', hidden: true }, createElement('slot', { name: 'view-grid' })),
    };
    this._selectAll = createElement('hui-checkbox', { className: 'dv__check' });
    this._selectAll.addEventListener('change', (e) => this._onSelectAll(Boolean(e.detail?.checked)));
    this._thead = createElement('thead', { className: 'dv__thead' });
    this._tbody = createElement('tbody', { className: 'dv__tbody' });
    this._table = createElement('table', { className: 'dv__table', part: 'table' }, this._thead, this._tbody);
    this._table.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-sort-key]');
      if (btn) this._onHeaderSort(btn.dataset.sortKey);
    });
    this._tbody.addEventListener('change', (e) => {
      const cb = e.target.closest?.('hui-checkbox[data-dv-select]');
      if (cb) this._onItemCheck(cb, Boolean(e.detail?.checked));
    });
    this._viewEls.table = createElement('div', { className: 'dv__view dv__view--table dv__table-wrap', part: 'table-wrap', hidden: true }, this._table);
    this._body = createElement('div', { className: 'dv__body', part: 'body' },
      this._stateEl, this._viewEls.list, this._viewEls.grid, this._viewEls.table);

    // ---- Chân: phân trang / xem thêm / mốc cuộn vô hạn ----
    this._pager = createElement('hui-pagination', { className: 'dv__pagination', part: 'pagination', 'hide-on-single-page': true, hidden: true });
    this._pager.addEventListener('change', (e) => {
      this.updateQuery({ page: Number(e.detail?.current) || 1 });
      this._scrollToTop();
    });
    this._moreBtn = createElement('hui-button', { variant: 'outline', className: 'dv__load-more', part: 'load-more', hidden: true });
    this._moreBtn.addEventListener('click', () => this.loadMore());
    this._sentinel = createElement('div', { className: 'dv__sentinel', part: 'sentinel', hidden: true });
    this._footer = createElement('div', { className: 'dv__footer', part: 'footer' }, this._pager, this._moreBtn, this._sentinel);

    this._base = createElement('div', { className: 'dv', part: 'base' },
      this._toolbar, this._filtersEl, this._countEl, this._bulkBar, this._body, this._footer);
    // Chặn sự kiện của control nội bộ (đã xử lý ở listener riêng) → bên ngoài chỉ nhận sự kiện của data-view
    for (const type of INNER_EVENTS) this._base.addEventListener(type, (e) => e.stopPropagation());

    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    ensureLightStyles(this);
    this._ensureContainers();
    this.listen(window, 'popstate', () => this._onPopState());
    if (this.paging === 'infinite') this._watchSentinel();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._searchTimer);
    this._sentinelStop?.();
    this._sentinelStop = null;
    cancelAnimationFrame(this._sentinelFrame);
  }

  /** Khung chứa item ở LIGHT DOM (được slot vào shadow) → CSS của trang áp dụng được cho item */
  _ensureContainers() {
    if (!this._containers) {
      this._containers = {};
      for (const v of ['list', 'grid']) {
        const el = createElement('div', { slot: `view-${v}`, className: `hui-dv-container hui-dv-container--${v}`, role: 'list', 'data-dv-container': v });
        // Checkbox phủ trên item: xử lý + chặn sự kiện (không chặn control riêng trong template của bạn)
        for (const type of ['change', 'input', 'hui-change']) {
          el.addEventListener(type, (e) => {
            const cb = e.target.closest?.('hui-checkbox[data-dv-select]');
            if (!cb || cb.parentElement?.parentElement !== el) return;
            e.stopPropagation();
            if (type === 'change') this._onItemCheck(cb, Boolean(e.detail?.checked));
          });
        }
        this._containers[v] = el;
      }
    }
    for (const el of Object.values(this._containers)) if (el.parentNode !== this) this.append(el);
  }

  updated(changed) {
    // Lần đầu: đọc chế độ xem đã nhớ + trạng thái trên URL TRƯỚC lần vẽ & lần tải đầu tiên
    if (!this._initDone) this._initState();

    if (changed.has('params') && this.params !== this._ownParams) this._baseParams = this.params;
    if (changed.has('data')) this._onData();
    if (changed.has('dataState') && this.dataState === 'error') this._appendPending = false;
    if (changed.has('paging') && this._hasRendered && this.isConnected) {
      this._sentinelStop?.();
      this._sentinelStop = null;
      if (this.paging === 'infinite') this._watchSentinel();
    }
    if (changed.has('pageSize') && changed.get('pageSize') !== undefined) this._state.page = 1;

    // Trạng thái truy vấn đổi → URL / localStorage / params server / hui-change
    this._commit();
    // Đổi nguồn dữ liệu (gán fetchFn / src sau khi gắn thẻ) → ghi params ngay cho lần tải đầu
    if (['src', 'fetchFn', 'server', 'clientSide'].some((k) => changed.has(k) && changed.get(k) !== undefined)) {
      this._rows = [];
      this._appendPending = false;
      this._syncServerParams();
    }

    super.updated(changed);

    // Cấu trúc item đổi (template, checkbox, cột…) → dựng lại toàn bộ node
    const structure = [this.selectable, this.rowKey, this.titleKey, this.descriptionKey, this.imageKey].join('|');
    if (structure !== this._structureSig) {
      this._structureSig = structure;
      this._resetViews();
    } else if (changed.has('columns')) {
      this._repeaters.table?.clear();
      this._headSig = '';
    }

    if (changed.has('locale') || changed.has('label')) this._syncLabels();
    if (changed.has('filters') || changed.has('locale')) this._buildFilters();
    if (changed.has('sortOptions') || changed.has('locale')) this._buildSortOptions();
    if (changed.has('views') || changed.has('locale')) this._buildViewButtons();
    if (changed.has('searchPlaceholder') || changed.has('locale')) {
      this._searchInput.setAttribute('placeholder', this.searchPlaceholder || tx('dataView.searchPlaceholder'));
    }
    this._base.classList.toggle('dv--striped', this.striped);
    this._base.classList.toggle('dv--no-animation', this.noAnimation);

    this._renderAll();
  }

  // =====================================================
  // API
  // =====================================================

  /** Trạng thái truy vấn hiện tại (bản sao): { view, q, sort, order, page, pageSize, filters } */
  get query() {
    const filters = {};
    for (const key of Object.keys(this._state.filters).sort()) {
      const vals = this._state.filters[key];
      if (vals && vals.length) filters[key] = [...vals];
    }
    return {
      view: this._view(),
      q: this._state.q.trim(),
      sort: this._state.sort,
      order: this._state.sort ? this._state.order || 'asc' : null,
      page: this._state.page,
      pageSize: this._pageSize(),
      filters,
    };
  }

  /**
   * Đổi một phần trạng thái: updateQuery({ q: 'áo', filters: { category: ['ao'] }, sort: 'price', order: 'desc' }).
   * Đổi q / filters / sort / pageSize mà không truyền page → tự về trang 1.
   * (Không dùng tên setState — HuiElement đã có setState() cho :state())
   */
  updateQuery(partial = {}) {
    const st = this._state;
    let resetPage = false;
    if ('view' in partial && VIEWS.includes(partial.view)) this.view = partial.view;
    if ('q' in partial) {
      // Giữ nguyên chữ đang gõ (kể cả dấu cách cuối); so sánh / ghi URL / gửi server dùng bản đã trim
      const q = String(partial.q ?? '');
      if (q.trim() !== st.q.trim()) resetPage = true;
      st.q = q;
      if (!this._typing && this._searchInput && this._searchInput.value !== q) this._searchInput.value = q;
    }
    if ('sort' in partial || 'order' in partial) {
      const sort = 'sort' in partial ? partial.sort || null : st.sort;
      const order = sort ? (('order' in partial ? partial.order : st.order) === 'desc' ? 'desc' : 'asc') : null;
      if (sort !== st.sort || order !== st.order) { st.sort = sort; st.order = order; resetPage = true; }
    }
    if ('filters' in partial) {
      const next = {};
      for (const [k, v] of Object.entries(partial.filters || {})) {
        const list = (Array.isArray(v) ? v : v === null || v === undefined || v === '' ? [] : [v]).map(String);
        if (list.length) next[k] = list;
      }
      if (JSON.stringify(next) !== JSON.stringify(this._cleanFilters(st.filters))) { st.filters = next; resetPage = true; }
    }
    if ('pageSize' in partial && Number(partial.pageSize) > 0 && Number(partial.pageSize) !== this.pageSize) {
      this.pageSize = Number(partial.pageSize);
      resetPage = true;
    }
    if ('page' in partial) {
      const page = Math.max(1, Math.floor(Number(partial.page) || 1));
      if (page !== st.page && page === st.page + 1 && this._isServer && this._isAppendPaging) this._appendPending = true;
      st.page = page;
    } else if (resetPage) {
      st.page = 1;
    }
    if (resetPage) this._appendPending = false;
    this.requestUpdate('query');
  }

  /** Tải lại (server) hoặc xử lý lại dữ liệu trong bộ nhớ (client) */
  refresh() {
    this._cache.data = null;
    if (this._isServer && (this.src || this.fetchFn)) {
      this._appendPending = false;
      // load-more / infinite: tải lại từ trang 1 (params đổi → DataController tự tải)
      if (this._isAppendPaging && this._state.page > 1) {
        this.updateQuery({ page: 1 });
        return this.updateComplete;
      }
      return this.reload();
    }
    this.requestUpdate('query');
    return Promise.resolve();
  }

  /** Tải thêm trang kế (load-more / infinite) */
  loadMore() {
    const vis = this._vis;
    if (!vis.hasMore || this.dataState === 'loading') return;
    this.updateQuery({ page: this._state.page + 1 });
  }

  /** Bỏ mọi bộ lọc + từ khóa tìm kiếm */
  clearFilters() {
    clearTimeout(this._searchTimer);
    this._typing = false;
    this.updateQuery({ q: '', filters: {} });
  }

  /** Bỏ chọn tất cả */
  clearSelection() {
    if (!this.selectedKeys.length) return;
    this._setSelection([]);
  }

  /** Item đang chọn (chỉ đọc) — với server mode: item đã từng tải về */
  get selectedItems() {
    return (this.selectedKeys || []).map((k) => this._itemByKey.get(String(k))).filter((x) => x !== undefined);
  }

  /** Item đang hiển thị (sau tìm / lọc / sắp xếp / cắt trang) — chỉ đọc */
  get visibleItems() {
    return [...this._vis.rows];
  }

  /** Tổng số kết quả (client: sau lọc; server: dataTotal) — chỉ đọc */
  get resultCount() {
    return this._vis.count;
  }

  // =====================================================
  // TRẠNG THÁI: khởi tạo, commit, URL, localStorage
  // =====================================================

  get _isServer() {
    return !this.clientSide && (this.server || Boolean(this.src || this.fetchFn));
  }

  get _isAppendPaging() {
    return this.paging === 'load-more' || this.paging === 'infinite';
  }

  _allowedViews() {
    const list = (parseList(this.views) || []).filter((v) => VIEWS.includes(v));
    return list.length ? [...new Set(list)] : ['list'];
  }

  /** Chế độ xem hợp lệ (nằm trong `views`) */
  _view() {
    const allowed = this._allowedViews();
    return allowed.includes(this.view) ? this.view : allowed[0];
  }

  _pageSize() {
    return Math.max(1, Math.floor(this.pageSize || 12));
  }

  _cleanFilters(filters) {
    const out = {};
    for (const [k, v] of Object.entries(filters || {})) if (v && v.length) out[k] = v;
    return out;
  }

  _sig() {
    return JSON.stringify(this.query);
  }

  _initState() {
    this._initDone = true;
    // Giá trị mặc định → URL chỉ ghi phần khác mặc định (link gọn)
    this._defaults = { view: this._view() };
    const stored = this._readPersisted();
    if (stored && this._allowedViews().includes(stored)) this.view = stored;
    if (this._urlEnabled) this._applyUrl(false);
  }

  /**
   * Chốt thay đổi trạng thái: so chữ ký trạng thái với lần trước — chỉ khác mới ghi URL, nhớ chế độ xem,
   * ghi params (server) và phát hui-change. Mọi nguồn thay đổi (nút, chip, URL, updateQuery, property) đều đi qua đây.
   */
  _commit() {
    if (!this._initDone) return;
    const sig = this._sig();
    if (sig === this._lastSig) return;
    const first = this._lastSig === null;
    this._lastSig = sig;
    this._syncServerParams();
    if (first) return;
    if (this._skipUrlWrite) this._skipUrlWrite = false;
    else this._writeUrl();
    this._persist();
    this.emit('hui-change', { state: this.query });
  }

  /** SERVER: params = params gốc của bạn + trạng thái truy vấn (lọc trải phẳng: { category: ['a','b'] }) */
  _syncServerParams() {
    if (!this._isServer || this.clientSide) return;
    const st = this.query;
    const p = { ...(this._baseParams || {}) };
    if (st.q) p.q = st.q;
    if (st.sort) {
      p.sort = st.sort;
      p.order = st.order;
    }
    if (this.paging !== 'none') {
      p.page = st.page;
      p.pageSize = st.pageSize;
    }
    for (const [k, v] of Object.entries(st.filters)) p[k] = v;
    if (JSON.stringify(p) === JSON.stringify(this.params || null)) return;
    this._ownParams = p;
    this.params = p;
  }

  get _urlEnabled() {
    const v = this.syncUrl;
    return v !== null && v !== undefined && v !== false && v !== 'false' && typeof location !== 'undefined';
  }

  /** Tên key trên URL (có tiền tố khi sync-url="p" → p_view) */
  _urlKey(name) {
    const v = this.syncUrl;
    const prefix = typeof v === 'string' && v !== 'true' ? v.trim() : '';
    return prefix ? `${prefix}_${name}` : name;
  }

  _readUrl() {
    const sp = new URLSearchParams(location.search);
    const k = (n) => this._urlKey(n);
    const view = sp.get(k('view'));
    const sort = sp.get(k('sort')) || null;
    const filters = {};
    const fPrefix = k('f_');
    let hasFilters = false;
    for (const [name, value] of sp) {
      if (name.startsWith(fPrefix)) hasFilters = true;
      if (name.startsWith(fPrefix) && name.length > fPrefix.length) {
        const vals = value.split(',').map((s) => s.trim()).filter(Boolean);
        if (vals.length) filters[name.slice(fPrefix.length)] = vals;
      }
    }
    return {
      view: VIEWS.includes(view) ? view : null,
      q: sp.get(k('q')) || '',
      sort,
      order: sort ? (sp.get(k('order')) === 'desc' ? 'desc' : 'asc') : null,
      // load-more / infinite không ghi page (F5 với page=3 mà chỉ tải trang 3 sẽ mất 2 trang đầu)
      page: this.paging === 'pagination' ? Math.max(1, Number.parseInt(sp.get(k('page')), 10) || 1) : 1,
      filters,
      has: { q: sp.has(k('q')), sort: sp.has(k('sort')), page: sp.has(k('page')), filters: hasFilters },
    };
  }

  /** Áp trạng thái đọc từ URL. fromHistory = true (Back/Forward): key vắng mặt → về mặc định */
  _applyUrl(fromHistory) {
    const s = this._readUrl();
    if (fromHistory) {
      this._state = { q: s.q, sort: s.sort, order: s.order, page: s.page, filters: s.filters };
    } else {
      // Lần đầu: chỉ lấy key có trên URL, giữ trạng thái đã đặt sẵn (updateQuery trước khi gắn thẻ)
      const st = this._state;
      if (s.has.q) st.q = s.q;
      if (s.has.sort) {
        st.sort = s.sort;
        st.order = s.order;
      }
      if (s.has.page) st.page = s.page;
      if (s.has.filters) st.filters = s.filters;
    }
    this._appendPending = false;
    if (s.view && this._allowedViews().includes(s.view)) this.view = s.view;
    else if (fromHistory) this.view = this._defaults.view;
    if (this._searchInput && this._searchInput.value !== this._state.q) this._searchInput.value = this._state.q;
  }

  _writeUrl() {
    if (!this._urlEnabled) return;
    const url = new URL(location.href);
    const sp = url.searchParams;
    const k = (n) => this._urlKey(n);
    const own = new Set(['view', 'q', 'sort', 'order', 'page'].map(k));
    const fPrefix = k('f_');
    // Giữ nguyên tham số khác trên URL (của trang / data-view khác), chỉ thay key của instance này
    for (const name of [...sp.keys()]) if (own.has(name) || name.startsWith(fPrefix)) sp.delete(name);
    const st = this.query;
    if (st.view !== this._defaults.view) sp.set(k('view'), st.view);
    if (st.q) sp.set(k('q'), st.q);
    if (st.sort) {
      sp.set(k('sort'), st.sort);
      sp.set(k('order'), st.order);
    }
    if (this.paging === 'pagination' && st.page > 1) sp.set(k('page'), String(st.page));
    for (const [key, vals] of Object.entries(st.filters)) sp.set(k(`f_${key}`), vals.join(','));
    const qs = sp.toString();
    const next = `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`;
    if (next === `${location.pathname}${location.search}${location.hash}`) return;
    try {
      if (this.syncUrlMode === 'push') history.pushState(history.state, '', next);
      else history.replaceState(history.state, '', next);
    } catch { /* sandbox / file:// không cho đổi URL */ }
  }

  _onPopState() {
    if (!this._urlEnabled || !this._initDone) return;
    const before = this._lastSig;
    this._applyUrl(true);
    // URL đã đúng sẵn → không ghi ngược lại (tránh replaceState thừa / phá lịch sử)
    this._skipUrlWrite = this._sig() !== before;
    this.requestUpdate('query');
  }

  get _storageKey() {
    if (!this.persistView) return null;
    const name = this.persistKey || this.id;
    return name ? `hui-data-view:${name}` : null;
  }

  _readPersisted() {
    const key = this._storageKey;
    if (!key) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  _persist() {
    const key = this._storageKey;
    if (!key) return;
    try {
      const view = this._view();
      if (localStorage.getItem(key) !== view) localStorage.setItem(key, view);
    } catch { /* chế độ riêng tư / bị chặn bộ nhớ */ }
  }

  // =====================================================
  // DỮ LIỆU
  // =====================================================

  /** Key của item: row-key → id → key → vị trí (item là chuỗi / số → chính nó) */
  _keyOf(item, index) {
    if (item === null || typeof item !== 'object') return item ?? index;
    const v = this.rowKey ? getPath(item, this.rowKey) : item.id ?? item.key;
    return v === undefined || v === null ? index : v;
  }

  _key(item) {
    if (item !== null && typeof item === 'object' && this._keyMap.has(item)) return this._keyMap.get(item);
    return this._keyOf(item, -1);
  }

  _indexItems(list, offset = 0, reset = true) {
    if (reset) {
      this._keyMap = new WeakMap();
      this._itemByKey = new Map();
    }
    list.forEach((item, i) => {
      const key = this._keyOf(item, offset + i);
      if (item !== null && typeof item === 'object') this._keyMap.set(item, key);
      this._itemByKey.set(String(key), item);
    });
  }

  _onData() {
    const batch = Array.isArray(this.data) ? this.data : [];
    if (this._isServer) {
      const append = this._appendPending && this._isAppendPaging;
      const offset = append ? this._rows.length : 0;
      this._rows = append ? this._rows.concat(batch) : batch.slice();
      this._lastBatch = batch.length;
      this._appendPending = false;
      // Giữ item của trang cũ trong _itemByKey → lựa chọn qua nhiều trang vẫn lấy được item
      this._indexItems(batch, offset, false);
    } else {
      this._indexItems(batch);
      this._cache.data = null;
    }
  }

  /** CLIENT: tìm → lọc → sắp xếp (có cache theo dữ liệu + truy vấn) */
  _processed() {
    const data = Array.isArray(this.data) ? this.data : [];
    const st = this._state;
    const sig = JSON.stringify([st.q, st.sort, st.order, this._cleanFilters(st.filters), this.searchFields]);
    if (this._cache.data === data && this._cache.sig === sig) return this._cache.rows;
    const rows = processRows(data, {
      q: st.q,
      fields: parseList(this.searchFields),
      filters: st.filters,
      filterDefs: Array.isArray(this.filters) ? this.filters : [],
      sort: st.sort,
      order: st.order || 'asc',
      compare: this._compareFor(st.sort, st.order),
    });
    this._cache = { data, sig, rows };
    return rows;
  }

  /** Hàm so sánh riêng (compare) khai báo trong sort-options / columns cho key đang sắp xếp */
  _compareFor(key, order) {
    if (!key) return null;
    const opt = (this.sortOptions || []).find((o) => o.key === key && (o.order || 'asc') === (order || 'asc') && typeof o.compare === 'function')
      || (this.sortOptions || []).find((o) => o.key === key && typeof o.compare === 'function');
    if (opt) return opt.compare;
    const col = (this.columns || []).find((c) => c.key === key && typeof c.compare === 'function');
    return col ? col.compare : null;
  }

  /** Item hiển thị + tổng số + còn trang sau không */
  _computeVisible() {
    const size = this._pageSize();
    const st = this._state;
    if (this._isServer) {
      const rows = this._rows;
      const total = typeof this.dataTotal === 'number' ? this.dataTotal : null;
      const hasMore = this._isAppendPaging && (total !== null ? rows.length < total : this._lastBatch >= size);
      // Không có total → phân trang ước lượng "còn trang sau" theo số dòng của trang hiện tại
      const pagerTotal = total ?? ((st.page - 1) * size + rows.length + (rows.length >= size ? 1 : 0));
      return { rows, count: total ?? rows.length, hasMore, pagerTotal };
    }
    const all = this._processed();
    const count = all.length;
    if (this.paging === 'pagination') {
      const pages = Math.max(1, Math.ceil(count / size));
      if (st.page > pages && this.dataState === 'ready') {
        st.page = pages; // trang trên URL vượt quá số trang → kẹp lại (lần cập nhật sau ghi lại URL)
        this.requestUpdate('query');
      }
      const page = Math.min(st.page, pages);
      return { rows: all.slice((page - 1) * size, page * size), count, hasMore: false, pagerTotal: count };
    }
    if (this._isAppendPaging) {
      const rows = all.slice(0, st.page * size);
      return { rows, count, hasMore: rows.length < count, pagerTotal: count };
    }
    return { rows: all, count, hasMore: false, pagerTotal: count };
  }

  /**
   * Trạng thái hiển thị (khác dataState một chút):
   * loading = chưa có gì → skeleton · refreshing = đang tải lại nhưng giữ item cũ (mờ đi) ·
   * more = đang tải thêm (load-more / infinite) · empty / no-results · error · ready · idle
   */
  _displayState(vis) {
    const ds = this.dataState;
    const hasRows = vis.rows.length > 0;
    if (ds === 'error') return 'error';
    if (ds === 'loading') {
      if (!hasRows || this._renderedView === null) return 'loading';
      return this._appendPending ? 'more' : 'refreshing';
    }
    if (hasRows) return 'ready';
    if (ds === 'idle' && !this._isServer) return 'idle';
    return this._hasActiveQuery() ? 'no-results' : 'empty';
  }

  _hasActiveQuery() {
    return Boolean(this._state.q.trim()) || Object.values(this._state.filters).some((v) => v && v.length);
  }

  // =====================================================
  // VẼ
  // =====================================================

  _renderAll() {
    const vis = this._computeVisible();
    this._vis = vis;
    const view = this._view();
    const state = this._displayState(vis);

    this._syncToolbar(view);
    this._ensureContainers();

    const showItems = state === 'ready' || state === 'more' || state === 'refreshing';
    this._body.classList.toggle('dv__body--busy', state === 'refreshing');
    this._body.setAttribute('aria-busy', String(state === 'loading' || state === 'refreshing'));

    if (showItems) {
      this._stateEl.hidden = true;
      this._stateEl.replaceChildren();
      this._stateEl._dvSig = '';
      this._renderView(view, vis.rows);
    } else {
      for (const v of VIEWS) this._viewEls[v].hidden = true;
      this._renderState(state, view);
    }

    // Đếm kết quả: giữ số cũ trong lúc tải
    if (state !== 'loading' && state !== 'refreshing' && state !== 'more') {
      const text = state === 'error' || state === 'idle' ? '' : tx('dataView.resultCount', { count: vis.count });
      if (this._countEl.textContent !== text) this._countEl.textContent = text;
    }
    this._countEl.hidden = !this._countEl.textContent;

    this._renderPaging(state, vis);
    this._renderBulk();
    if (this.paging === 'infinite') this._checkSentinelSoon();
  }

  _renderState(state, view) {
    const el = this._stateEl;
    // Chỉ dựng lại khi trạng thái / chế độ xem / chữ đổi (updated() chạy cả khi gõ phím)
    const sig = [state, view, getLocaleName(), this.emptyText, state === 'error' ? String(this.dataError?.message) : ''].join('|');
    if (el._dvSig === sig) return;
    el._dvSig = sig;
    el.hidden = state === 'idle';
    el.className = `dv__state dv__state--${state}`;
    if (state === 'idle') {
      el.replaceChildren();
    } else if (state === 'loading') {
      el.replaceChildren(this._skeleton(view));
    } else if (state === 'no-results') {
      const empty = createElement('hui-empty', { description: tx('dataView.noResults') });
      const btn = createElement('hui-button', { variant: 'outline', size: 'sm' }, tx('dataView.clearFilters'));
      btn.addEventListener('click', () => this.clearFilters());
      empty.append(btn);
      el.replaceChildren(empty);
    } else if (state === 'empty') {
      const empty = createElement('hui-empty', {});
      if (this.emptyText) empty.setAttribute('description', this.emptyText);
      el.replaceChildren(empty);
    } else {
      this.renderStateView(el); // error: hui-result + nút Thử lại (DataController)
      el.hidden = false;
    }
  }

  /** Skeleton đúng hình dạng chế độ xem: dòng list / thẻ grid / dòng bảng */
  _skeleton(view) {
    const wrap = createElement('div', { className: `sk sk--${view}`, part: 'skeleton', 'aria-hidden': 'true' });
    const line = (w) => createElement('span', { className: 'sk__block sk__line', style: { width: `${w}%` } });
    if (view === 'grid') {
      for (let i = 0; i < Math.min(this._pageSize(), 8); i++) {
        wrap.append(createElement('div', { className: 'sk__card' },
          createElement('span', { className: 'sk__block sk__media' }), line(80), line(50)));
      }
    } else if (view === 'table') {
      const cols = Math.max(2, Math.min((this.columns || []).length || 4, 6));
      for (let r = 0; r < 6; r++) {
        const row = createElement('div', { className: r === 0 ? 'sk__row sk__row--head' : 'sk__row' });
        for (let c = 0; c < cols; c++) row.append(line(c === 0 ? 70 : 50 + ((r + c) % 3) * 15));
        wrap.append(row);
      }
    } else {
      for (let i = 0; i < 5; i++) {
        wrap.append(createElement('div', { className: 'sk__item' },
          createElement('span', { className: 'sk__block sk__avatar' }),
          createElement('span', { className: 'sk__lines' }, line(40 + (i % 3) * 12), line(85))));
      }
    }
    return createElement('div', {}, createElement('span', { className: 'dv__sr-only' }, t('common.loading')), wrap);
  }

  /**
   * Vẽ chế độ xem + hiệu ứng:
   * - item MỚI (trang mới, tải xong, lọc ra item khác) → hiện so le (stagger fade-up)
   * - chuyển list ↔ grid → FLIP: đo vị trí item ở chế độ cũ, vẽ chế độ mới, rồi cho item bay từ chỗ cũ về chỗ mới
   * - chuyển sang / từ table → chỉ mờ dần (cấu trúc khác hẳn, không ghép cặp được)
   */
  _renderView(view, rows) {
    const prev = this._renderedView;
    const switching = prev !== null && prev !== view;
    const anim = this._animOk();
    const before = switching && anim && CARD_VIEWS.has(prev) && CARD_VIEWS.has(view) ? this._measure(prev) : null;

    for (const v of VIEWS) this._viewEls[v].hidden = v !== view;
    if (switching) this._clearView(prev);

    const created = view === 'table' ? this._renderTable(rows) : this._renderCards(view, rows);
    this._renderedView = view;
    if (!anim) return;

    if (before) this._flip(created, before);
    else if (switching) runAnimation([this._viewEls[view]], 'fade', { duration: 260 });
    else if (created.length) this._stagger(created, view);
  }

  _animOk() {
    return !this.noAnimation && !animationsDisabled();
  }

  _stagger(nodes, view) {
    const name = view === 'table' ? 'fade' : 'fade-up';
    nodes.forEach((el, i) => runAnimation([el], name, { duration: 420, delay: Math.min(i, STAGGER_CAP) * STAGGER }));
  }

  /** Vị trí (rect) các item đang hiện ở chế độ `view`, theo key */
  _measure(view) {
    const rep = this._repeaters[view];
    const map = new Map();
    if (!rep) return map;
    for (const node of rep.children) {
      const info = itemOf.get(node);
      const rect = node.getBoundingClientRect();
      if (info && rect.width > 0 && rect.height > 0) map.set(String(info.key), rect);
    }
    return map;
  }

  /** FLIP: First (rect cũ) → Last (rect mới) → Invert (transform về chỗ cũ) → Play (animate về none) */
  _flip(nodes, before) {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const onScreen = (r) => r.bottom > 0 && r.top < vh;
    for (const el of nodes) {
      const info = itemOf.get(el);
      const old = info ? before.get(String(info.key)) : null;
      const now = el.getBoundingClientRect();
      if (!old || !now.width || !now.height || (!onScreen(old) && !onScreen(now))) {
        if (onScreen(now)) runAnimation([el], 'fade', { duration: 300 });
        continue;
      }
      const dx = old.left - now.left;
      const dy = old.top - now.top;
      // Kẹp tỉ lệ để nội dung không bị kéo méo quá mức (dòng dài ↔ thẻ vuông)
      const sx = clamp(old.width / now.width, 0.5, 2);
      const sy = clamp(old.height / now.height, 0.5, 2);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) continue;
      el.animate([
        { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.6 },
        { transformOrigin: '0 0', transform: 'none', opacity: 1 },
      ], { duration: FLIP_DURATION, easing: FLIP_EASE });
    }
  }

  _clearView(view) {
    this._repeaters[view]?.clear();
  }

  /** Bỏ toàn bộ node đã vẽ (cấu trúc đổi) — lần vẽ sau tạo lại */
  _resetViews() {
    for (const v of VIEWS) this._repeaters[v]?.clear();
    this._headSig = '';
  }

  _repeater(view) {
    if (!this._repeaters[view]) {
      const container = view === 'table' ? this._tbody : this._containers[view];
      this._repeaters[view] = new Repeater(container, {
        key: (item) => this._key(item),
        create: (item, i) => (view === 'table' ? this._createRow(item, i) : this._createCard(view, item, i)),
        update: (node, item, i) => (view === 'table' ? this._updateRow(node, item, i) : this._updateCard(view, node, item, i)),
      });
    }
    return this._repeaters[view];
  }

  /** Vẽ theo key; trả về các node mới tạo (để chạy hiệu ứng) */
  _renderInto(view, rows) {
    const rep = this._repeater(view);
    const existing = new Set(rep.nodes.values());
    return rep.render(rows).filter((n) => !existing.has(n));
  }

  // ---------- list / grid ----------

  _template(view) {
    return this.querySelector(`:scope > template[view="${view}"]`) || this.querySelector(':scope > template:not([view])');
  }

  _renderCards(view, rows) {
    const container = this._containers[view];
    container.setAttribute('aria-label', this.label || tx('dataView.label'));
    // Template đổi (thay <template> khác) → dựng lại
    const tpl = this._template(view);
    if (container._dvTemplate !== tpl) {
      this._repeaters[view]?.clear();
      container._dvTemplate = tpl;
    }
    return this._renderInto(view, rows);
  }

  _titleOf(item) {
    if (item === null || typeof item !== 'object') return String(item ?? '');
    const v = this.titleKey ? getPath(item, this.titleKey) : firstField(item, TITLE_FIELDS);
    return v === undefined || v === null ? '' : String(v);
  }

  _createCard(view, item, index) {
    const key = this._key(item);
    const wrap = createElement('div', { className: `hui-dv-item hui-dv-item--${view}`, role: 'listitem', dataset: { key: String(key) } });
    const tpl = this._containers[view]._dvTemplate;
    const content = tpl ? renderTemplate(tpl, item, index) : this._createFallback(view);
    if (!tpl) this._updateFallback(content, item);
    wrap._dvTemplated = Boolean(tpl);
    if (this.selectable) {
      const cb = createElement('hui-checkbox', {
        className: 'hui-dv-item__check',
        'data-dv-select': '',
        'aria-label': tx('dataView.selectItem', { name: this._titleOf(item) || String(key) }),
      });
      wrap.append(cb);
    }
    wrap.append(content);
    itemOf.set(wrap, { item, index, key });
    this._syncSelected(wrap, key);
    return wrap;
  }

  _updateCard(view, wrap, item, index) {
    const key = this._key(item);
    const prev = itemOf.get(wrap);
    itemOf.set(wrap, { item, index, key });
    const content = wrap.lastElementChild;
    if (prev?.item !== item || prev?.index !== index) {
      if (wrap._dvTemplated) updateTemplateNode(content, item, index);
      else this._updateFallback(content, item);
    }
    this._syncSelected(wrap, key);
  }

  /** Item dự phòng khi chế độ xem không có <template>: list = dòng tiêu đề / mô tả, grid = thẻ */
  _createFallback(view) {
    const img = createElement('img', { className: 'hui-dv-fallback__media', alt: '', loading: 'lazy', hidden: true });
    const title = createElement('div', { className: 'hui-dv-fallback__title' });
    const desc = createElement('div', { className: 'hui-dv-fallback__desc' });
    return createElement('div', { className: `hui-dv-fallback hui-dv-fallback--${view}` },
      img, createElement('div', { className: 'hui-dv-fallback__body' }, title, desc));
  }

  _updateFallback(node, item) {
    const [img, body] = node.children;
    const [title, desc] = body.children;
    const obj = item !== null && typeof item === 'object';
    const image = obj ? (this.imageKey ? getPath(item, this.imageKey) : firstField(item, IMAGE_FIELDS)) : null;
    const description = obj ? (this.descriptionKey ? getPath(item, this.descriptionKey) : firstField(item, DESC_FIELDS)) : null;
    const text = this._titleOf(item);
    if (title.textContent !== text) title.textContent = text;
    const d = description === undefined || description === null ? '' : String(description);
    if (desc.textContent !== d) desc.textContent = d;
    desc.hidden = !d;
    if (typeof image === 'string' && image) {
      if (img.getAttribute('src') !== image) img.setAttribute('src', image);
      img.hidden = false;
    } else {
      img.removeAttribute('src');
      img.hidden = true;
    }
  }

  // ---------- table ----------

  _columns() {
    return Array.isArray(this.columns) ? this.columns.filter(Boolean) : [];
  }

  _renderTable(rows) {
    const columns = this._columns();
    const headSig = `${columns.map((c) => `${c.key}:${c.title}:${c.sortable ? 1 : 0}:${c.type}`).join('|')}|${this.selectable}|${getLocaleName()}`;
    if (headSig !== this._headSig) {
      this._headSig = headSig;
      this._repeaters.table?.clear();
      const tr = createElement('tr', { className: 'dv__tr-head' });
      if (this.selectable) {
        this._selectAll.setAttribute('aria-label', tx('dataView.selectAll'));
        tr.append(createElement('th', { scope: 'col', className: 'th th--select', part: 'th' }, this._selectAll));
      }
      for (const col of columns) tr.append(createHeaderCell(col));
      this._thead.replaceChildren(tr);
      this._table.setAttribute('aria-label', this.label || tx('dataView.label'));
    }
    // aria-sort theo trạng thái hiện tại
    const { sort, order } = this._state;
    for (const btn of this._thead.querySelectorAll('button[data-sort-key]')) {
      const th = btn.parentElement;
      const active = btn.dataset.sortKey === sort;
      th.setAttribute('aria-sort', active ? (order === 'desc' ? 'descending' : 'ascending') : 'none');
      th.classList.toggle('th--sorted', active);
    }
    const created = this._renderInto('table', rows);
    this._syncSelectAll(rows);
    return created;
  }

  _createRow(item, index) {
    const key = this._key(item);
    const tr = createElement('tr', { className: 'dv__tr', part: 'row', dataset: { key: String(key) } });
    itemOf.set(tr, { item, index, key });
    this._fillRow(tr, item, index);
    this._syncSelected(tr, key);
    return tr;
  }

  _updateRow(tr, item, index) {
    const key = this._key(item);
    const prev = itemOf.get(tr);
    itemOf.set(tr, { item, index, key });
    if (prev?.item !== item || prev?.index !== index) this._fillRow(tr, item, index);
    this._syncSelected(tr, key);
  }

  _fillRow(tr, item, index) {
    const ctx = { yes: tx('dataView.yes'), no: tx('dataView.no') };
    const cells = [];
    if (this.selectable) {
      const cb = createElement('hui-checkbox', {
        className: 'dv__check', 'data-dv-select': '',
        'aria-label': tx('dataView.selectItem', { name: this._titleOf(item) || String(this._key(item)) }),
      });
      cells.push(createElement('td', { className: 'cell cell--select', part: 'cell' }, cb));
    }
    for (const col of this._columns()) cells.push(createCell(col, item, index, ctx));
    tr.replaceChildren(...cells);
  }

  // ---------- chọn nhiều ----------

  _isSelected(key) {
    return (this.selectedKeys || []).some((k) => String(k) === String(key));
  }

  _syncSelected(node, key) {
    const on = this.selectable && this._isSelected(key);
    node.toggleAttribute('data-selected', on);
    if (node.tagName === 'TR') node.setAttribute('part', on ? 'row row-selected' : 'row');
    const cb = node.tagName === 'TR' ? node.querySelector('hui-checkbox[data-dv-select]') : node.firstElementChild?.matches?.('hui-checkbox[data-dv-select]') ? node.firstElementChild : null;
    if (cb && cb.checked !== on) cb.checked = on;
  }

  _syncSelectAll(rows) {
    if (!this.selectable) return;
    const keys = rows.map((r) => this._key(r));
    const n = keys.filter((k) => this._isSelected(k)).length;
    this._selectAll.checked = n > 0 && n === keys.length;
    this._selectAll.indeterminate = n > 0 && n < keys.length;
    this._selectAll.disabled = keys.length === 0;
  }

  _onItemCheck(cb, checked) {
    const node = cb.closest('.hui-dv-item, tr');
    const info = node && itemOf.get(node);
    if (!info) return;
    const map = new Map((this.selectedKeys || []).map((k) => [String(k), k]));
    if (checked) map.set(String(info.key), info.key);
    else map.delete(String(info.key));
    this._setSelection([...map.values()]);
  }

  _onSelectAll(checked) {
    const map = new Map((this.selectedKeys || []).map((k) => [String(k), k]));
    for (const item of this._vis.rows) {
      const key = this._key(item);
      if (checked) map.set(String(key), key);
      else map.delete(String(key));
    }
    this._setSelection([...map.values()]);
  }

  _setSelection(keys) {
    this.selectedKeys = keys;
    this.emit('hui-selection-change', { keys: [...keys], items: this.selectedItems });
  }

  _renderBulk() {
    const n = this.selectable ? (this.selectedKeys || []).length : 0;
    this._bulkBar.hidden = n === 0;
    if (n) {
      const text = tx('dataView.selected', { count: n });
      if (this._bulkCount.textContent !== text) this._bulkCount.textContent = text;
    }
  }

  // ---------- phân trang ----------

  _renderPaging(state, vis) {
    const paging = PAGINGS.includes(this.paging) ? this.paging : 'pagination';
    const active = state === 'ready' || state === 'more' || state === 'refreshing';
    const size = this._pageSize();

    this._pager.hidden = !(paging === 'pagination' && active);
    if (!this._pager.hidden) {
      this._pager.total = vis.pagerTotal;
      this._pager.pageSize = size;
      this._pager.current = this._state.page;
    }

    this._moreBtn.hidden = !(paging === 'load-more' && active && vis.hasMore);
    this._moreBtn.loading = state === 'more';

    this._sentinel.hidden = !(paging === 'infinite' && active && vis.hasMore);
    const sentinelText = state === 'more' ? tx('dataView.loadingMore') : '';
    if (this._sentinel.textContent !== sentinelText) this._sentinel.textContent = sentinelText;
  }

  _watchSentinel() {
    if (this._sentinelStop) return;
    this._sentinelStop = inView(this._sentinel, (entry) => {
      if (entry.isIntersecting) this.loadMore();
    }, { threshold: 0, rootMargin: '0px 0px 200px 0px' });
  }

  /**
   * IntersectionObserver chỉ báo khi trạng thái giao nhau ĐỔI → tải xong 1 trang mà mốc vẫn nằm trong
   * màn hình (trang quá ngắn) thì không có callback mới. Kiểm tra lại bằng vị trí sau mỗi lần vẽ.
   */
  _checkSentinelSoon() {
    cancelAnimationFrame(this._sentinelFrame);
    this._sentinelFrame = requestAnimationFrame(() => {
      if (this._sentinel.hidden || !this._vis.hasMore || this.dataState === 'loading' || !this.isConnected) return;
      const rect = this._sentinel.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < vh + 200 && rect.bottom > -200) this.loadMore();
    });
  }

  _scrollToTop() {
    const top = this.getBoundingClientRect().top;
    if (top < 0) this.scrollIntoView({ block: 'start', behavior: this._animOk() ? 'smooth' : 'auto' });
  }

  // =====================================================
  // THANH CÔNG CỤ
  // =====================================================

  _syncLabels() {
    this._viewsGroup.setAttribute('aria-label', tx('dataView.views'));
    this._searchBox.setAttribute('aria-label', tx('dataView.searchLabel'));
    this._sortSelect.setAttribute('label', tx('dataView.sort'));
    this._sortSelect.setAttribute('placeholder', tx('dataView.sortDefault'));
    this._clearFiltersBtn.textContent = tx('dataView.clearFilters');
    this._bulkClear.textContent = tx('dataView.clearSelection');
    this._bulkBar.setAttribute('aria-label', tx('dataView.selected', { count: '' }).trim());
    this._moreBtn.textContent = tx('dataView.loadMore');
    this._headSig = ''; // nhãn chọn tất cả / tiêu đề theo locale
  }

  _buildViewButtons() {
    const buttons = this._allowedViews().map((v) => createElement('button', {
      type: 'button',
      className: 'dv__view-btn',
      part: 'view-button',
      dataset: { view: v },
      'aria-pressed': 'false',
      'aria-label': tx(VIEW_LABELS[v]),
      title: tx(VIEW_LABELS[v]),
    }, createElement('hui-icon', { name: VIEW_ICONS[v] })));
    this._viewsGroup.replaceChildren(...buttons);
  }

  _buildSortOptions() {
    const opts = Array.isArray(this.sortOptions) ? this.sortOptions : [];
    this._sortSelect.options = opts.map((o) => ({ label: String(o.label ?? o.key), value: `${o.key}:${o.order === 'desc' ? 'desc' : 'asc'}` }));
  }

  _buildFilters() {
    const defs = Array.isArray(this.filters) ? this.filters : [];
    const groups = defs.filter((d) => d && d.key && Array.isArray(d.options)).map((def) => {
      const label = createElement('span', { className: 'dv__filter-label', part: 'filter-label', id: `dv-${this._uid}-f-${def.key}` }, String(def.label ?? def.key));
      const chips = def.options.map((opt) => {
        const o = typeof opt === 'object' && opt !== null ? opt : { label: String(opt), value: opt };
        return createElement('hui-tag', {
          checkable: true, shape: 'pill', className: 'dv__chip', dataset: { filter: def.key, value: String(o.value) },
        }, String(o.label ?? o.value));
      });
      return createElement('div', {
        className: 'dv__filter-group', part: 'filter-group', role: 'group', 'aria-labelledby': label.id, dataset: { filterGroup: def.key },
      }, label, ...chips);
    });
    this._filterGroups.replaceChildren(...groups);
    this._filtersEl.hidden = groups.length === 0;
  }

  _syncToolbar(view) {
    // Ô tìm
    this._searchBox.hidden = !this.search;
    if (!this._typing && this._searchInput.value !== this._state.q) this._searchInput.value = this._state.q;

    // Sắp xếp
    const hasSort = Array.isArray(this.sortOptions) && this.sortOptions.length > 0;
    this._sortSelect.hidden = !hasSort;
    if (hasSort) {
      const value = this._state.sort ? `${this._state.sort}:${this._state.order || 'asc'}` : null;
      const known = this._sortSelect.options?.some?.((o) => o.value === value);
      const next = known ? value : null;
      if (this._sortSelect.value !== next) this._sortSelect.value = next;
    }

    // Chế độ xem
    const allowed = this._allowedViews();
    this._viewsGroup.hidden = allowed.length < 2;
    for (const btn of this._viewsGroup.children) {
      const on = btn.dataset.view === view;
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('part', on ? 'view-button view-button-active' : 'view-button');
    }

    // Chip lọc
    const filters = this._state.filters;
    for (const chip of this._filterGroups.querySelectorAll('hui-tag[data-filter]')) {
      const on = (filters[chip.dataset.filter] || []).includes(chip.dataset.value);
      if (chip.checked !== on) chip.checked = on;
    }
    this._clearFiltersBtn.hidden = !this._hasActiveQuery();
    this._syncToolbarVisibility();
  }

  _syncToolbarVisibility() {
    const slotted = this._startSlot.assignedNodes().length + this._endSlot.assignedNodes().length > 0;
    const any = !this._searchBox.hidden || !this._sortSelect.hidden || !this._viewsGroup.hidden || slotted;
    this._toolbar.hidden = !any;
  }

  _onSearchInput(value) {
    this._typing = true;
    clearTimeout(this._searchTimer);
    const delay = Math.max(0, Number(this.searchDebounce) || 0);
    this._searchTimer = setTimeout(() => this._applySearch(value), delay);
  }

  _applySearch(value) {
    clearTimeout(this._searchTimer);
    this._typing = false;
    this.updateQuery({ q: String(value ?? '') });
  }

  _onSortSelect(value) {
    if (!value) {
      this.updateQuery({ sort: null });
      return;
    }
    const i = String(value).lastIndexOf(':');
    this.updateQuery({ sort: value.slice(0, i), order: value.slice(i + 1) });
  }

  /** Bấm tiêu đề cột: chưa sắp xếp → tăng dần → giảm dần → bỏ sắp xếp (giống Ant Table) */
  _onHeaderSort(key) {
    const { sort, order } = this._state;
    if (sort !== key) this.updateQuery({ sort: key, order: 'asc' });
    else if (order !== 'desc') this.updateQuery({ sort: key, order: 'desc' });
    else this.updateQuery({ sort: null });
  }

  _onChip(tag) {
    const key = tag.dataset.filter;
    const value = tag.dataset.value;
    const def = (this.filters || []).find((d) => d.key === key);
    const current = this._state.filters[key] || [];
    let next;
    if (tag.checked) next = def?.multiple ? [...new Set([...current, value])] : [value];
    else next = current.filter((v) => v !== value);
    this.updateQuery({ filters: { ...this._state.filters, [key]: next } });
  }

  _onHostClick(e) {
    const path = e.composedPath();
    const actionEl = path.find((n) => n instanceof Element && n.dataset?.action);
    if (!actionEl) return;
    const node = path.find((n) => n instanceof Element && itemOf.has(n));
    if (!node || !node.contains(actionEl)) return;
    const { item, index } = itemOf.get(node);
    this.emit('hui-action', { action: actionEl.dataset.action, item, index, originalEvent: e });
  }
}

defineElement('hui-data-view', HuiDataView);

export default HuiDataView;
