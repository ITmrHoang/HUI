/**
 * HUI Table — bảng dữ liệu đầy đủ (Organism, Ant Table + MUI DataGrid)
 * Cột khai báo kiểu (`type` → định dạng sẵn), gộp tiêu đề nhiều tầng, sắp xếp đơn / đa cột, lọc (menu checkbox + ô tìm),
 * phân trang, chọn dòng (checkbox / radio), mở rộng dòng, dữ liệu cây (treegrid), dòng tổng, tiêu đề dính,
 * cột cố định trái / phải (bóng khi cuộn), kéo đổi độ rộng cột, cuộn ảo cho 10k+ dòng (role=grid).
 * Dữ liệu qua DataController: `data` (CLIENT — tự lọc / sắp xếp / cắt trang) hoặc `server` + `fetchFn` / `src`
 * (bảng chỉ ghi { page, pageSize, sort, order, …lọc } vào `params` và phát `hui-change`).
 */

import styles from './hui-table.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { DataController } from '../../core/data-controller.js';
import { renderTemplate } from '../../core/template.js';
import { Repeater } from '../../core/repeat.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { VirtualWindow } from '../../utils/virtual.js';
import { collapse } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { renderCell, alignOf, formatCell, cellValue, setPath, exportText, ensureElement } from './table-cells.js';
import { normalizeColumns, headerRows, processRows, normOrder, fold } from './table-query.js';
import '../hui-icon/hui-icon.js';
import '../hui-checkbox/index.js';
import '../hui-popover/index.js';
import '../hui-input/index.js';
import '../hui-button/index.js';
import '../hui-pagination/index.js';
import '../hui-empty/index.js';
import '../hui-skeleton/index.js';
import '../hui-spinner/index.js';

/** Chuỗi dự phòng khi locale.js chưa có key table.* */
const FALLBACK = {
  vi: {
    'table.label': 'Bảng dữ liệu',
    'table.filter': 'Lọc theo {title}',
    'table.filterSearch': 'Tìm trong bộ lọc',
    'table.filterEmpty': 'Không có lựa chọn phù hợp',
    'table.filterConfirm': 'Lọc',
    'table.filterReset': 'Đặt lại',
    'table.selectAll': 'Chọn tất cả',
    'table.selectRow': 'Chọn dòng {name}',
    'table.selection': 'Chọn dòng',
    'table.expandColumn': 'Mở rộng',
    'table.expand': 'Mở dòng',
    'table.collapse': 'Thu dòng',
    'table.sortAsc': 'Sắp xếp tăng dần',
    'table.sortDesc': 'Sắp xếp giảm dần',
    'table.sortNone': 'Bỏ sắp xếp',
    'table.resize': 'Đổi độ rộng cột {title}',
    'table.yes': 'Có',
    'table.no': 'Không',
  },
  en: {
    'table.label': 'Data table',
    'table.filter': 'Filter by {title}',
    'table.filterSearch': 'Search filters',
    'table.filterEmpty': 'No matching options',
    'table.filterConfirm': 'OK',
    'table.filterReset': 'Reset',
    'table.selectAll': 'Select all',
    'table.selectRow': 'Select row {name}',
    'table.selection': 'Row selection',
    'table.expandColumn': 'Expand',
    'table.expand': 'Expand row',
    'table.collapse': 'Collapse row',
    'table.sortAsc': 'Sort ascending',
    'table.sortDesc': 'Sort descending',
    'table.sortNone': 'Sorting removed',
    'table.resize': 'Resize column {title}',
    'table.yes': 'Yes',
    'table.no': 'No',
  },
};

function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/** Sự kiện của control nội bộ — chặn lại để bên ngoài chỉ nhận sự kiện của bảng */
const INNER_EVENTS = ['input', 'change', 'hui-change', 'open-change', 'clear', 'hui-search', 'hui-edit-start', 'hui-save', 'hui-saved', 'hui-save-error', 'hui-cancel'];
/** Chiều cao dòng mặc định (cuộn ảo) theo size */
const ROW_HEIGHT = { sm: 40, md: 48, lg: 56 };
/** Phần tử tương tác trong ô — không phát hui-row-click; chế độ grid: bỏ khỏi thứ tự Tab */
const INTERACTIVE = 'button, a[href], input, select, textarea, label, hui-checkbox, hui-radio, hui-radio-group, hui-input, hui-button, hui-select, hui-switch, hui-editable, [data-action], [contenteditable]';
const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex], hui-checkbox, hui-radio, hui-input, hui-button, hui-select, hui-switch, hui-editable';
const SPECIAL_WIDTH = 48;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const isPlain = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;
const srOnly = (text) => createElement('span', { className: 'sr-only' }, text);

let uid = 0;

/**
 * @fires hui-change - Đổi trang / sắp xếp / lọc (cả client lẫn server). detail: { pagination: { current, pageSize, total }, filters, sorter, sorters, action: 'paginate' | 'sort' | 'filter' }
 * @fires hui-sort - Đổi sắp xếp. detail: { sorter, sorters }
 * @fires hui-filter - Áp dụng bộ lọc của 1 cột. detail: { key, values, filters }
 * @fires hui-selection-change - Đổi lựa chọn. detail: { keys, rows }
 * @fires hui-expand - Mở / thu 1 dòng (mở rộng hoặc nút cây). detail: { key, row, expanded, expandedKeys }
 * @fires hui-row-click - Bấm vào dòng (không tính control bên trong). detail: { row, index, key, originalEvent }
 * @fires hui-action - Bấm nút ở cột `actions`. detail: { action, row, item, index, key, originalEvent }
 * @fires hui-column-resize - Đổi độ rộng cột (kéo / phím mũi tên). detail: { key, width }
 * @fires hui-cell-edit - Lưu ô sửa tại chỗ (cột editable). detail: { row, key, value, oldValue, index, waitUntil(promise) }. Cancelable: preventDefault() = từ chối, ô trở lại giá trị cũ
 * @fires hui-load - (DataController) tải xong src / fetchFn. detail: { data, total }
 * @fires hui-error - (DataController) tải lỗi. detail: { error }
 * @slot caption - Chú thích bảng (thay cho attribute caption)
 * @slot expand - `<template slot="expand">` khuôn nội dung dòng mở rộng (data-bind như hui-data-view)
 * @csspart base - Khung ngoài
 * @csspart scroller - Vùng cuộn chứa bảng (scroll-x / scroll-y)
 * @csspart table - Thẻ <table>
 * @csspart caption - <caption>
 * @csspart thead - <thead>
 * @csspart header-row - Mỗi hàng tiêu đề
 * @csspart th - Ô tiêu đề (thêm th-group cho tiêu đề nhóm, th-fixed khi cố định)
 * @csspart sort-button - Nút sắp xếp trong tiêu đề
 * @csspart sorter - Mũi tên sắp xếp
 * @csspart sort-priority - Số thứ tự ưu tiên khi sắp xếp nhiều cột
 * @csspart filter-button - Nút mở bộ lọc (thêm filter-button-active khi đang lọc)
 * @csspart filter-panel - Khung nội dung bộ lọc
 * @csspart filter-search - Ô tìm trong bộ lọc
 * @csspart filter-list - Danh sách lựa chọn lọc
 * @csspart filter-footer - Hàng nút Đặt lại / Lọc
 * @csspart resize-handle - Tay kéo đổi độ rộng cột
 * @csspart tbody - <tbody>
 * @csspart row - Mỗi dòng (thêm row-selected, row-expanded)
 * @csspart cell - Mỗi ô (thêm cell-fixed khi cố định)
 * @csspart selection-cell - Ô chứa checkbox / radio chọn dòng
 * @csspart expand-button - Nút mở / thu dòng (mở rộng và cây)
 * @csspart expanded-row - Dòng nội dung mở rộng
 * @csspart expanded-cell - Ô nội dung mở rộng
 * @csspart summary-row - Dòng tổng (<tfoot>)
 * @csspart summary-cell - Ô dòng tổng
 * @csspart state - Vùng đang tải / rỗng / lỗi
 * @csspart loading - Lớp phủ spinner khi tải lại
 * @csspart footer - Vùng phân trang
 * @csspart pagination - hui-pagination
 * @csspart action - Nút cột actions (thêm action-danger)
 * @csspart link - Liên kết cột type link
 * @cssprop --hui-table-bg - Nền ô
 * @cssprop --hui-table-color - Màu chữ
 * @cssprop --hui-table-font-size - Cỡ chữ
 * @cssprop --hui-table-radius - Bo góc khung
 * @cssprop --hui-table-border-color - Màu đường kẻ
 * @cssprop --hui-table-header-bg - Nền hàng tiêu đề
 * @cssprop --hui-table-header-color - Màu chữ tiêu đề
 * @cssprop --hui-table-header-font-weight - Độ đậm chữ tiêu đề
 * @cssprop --hui-table-cell-padding - Đệm ô (mặc định theo size)
 * @cssprop --hui-table-row-hover-bg - Nền dòng khi hover (attribute hover)
 * @cssprop --hui-table-row-selected-bg - Nền dòng đã chọn
 * @cssprop --hui-table-stripe-bg - Nền dòng chẵn (striped)
 * @cssprop --hui-table-expanded-bg - Nền dòng mở rộng
 * @cssprop --hui-table-summary-bg - Nền dòng tổng
 * @cssprop --hui-table-fixed-shadow - Bóng của cột cố định khi cuộn ngang
 * @cssprop --hui-table-sticky-offset - Khoảng cách tiêu đề dính tới mép trên trang (attribute sticky)
 * @cssprop --hui-table-sorter-color - Màu mũi tên sắp xếp chưa bật
 * @cssprop --hui-table-sorter-active-color - Màu mũi tên đang bật / nút lọc đang lọc
 * @cssprop --hui-table-resize-color - Màu tay kéo đổi độ rộng khi hover / focus
 * @cssprop --hui-table-focus-ring - Viền focus của ô (chế độ grid)
 */
class HuiTable extends DataController(HuiElement) {
  static properties = {
    /** Cột: [{ key | dataIndex, title, type, width, minWidth, align, fixed, ellipsis, sorter, sortDirections, defaultSortOrder, filters, onFilter, filterSearch, filterMultiple, defaultFilteredValue, format, render, children, resizable, actions, href, colors, labels, editable, editor, options, exportable, exportValue }] */
    columns: { type: Array, default: null },
    /** Trường làm key của dòng (hỗ trợ "a.b"); thiếu → theo vị trí */
    rowKey: { type: String, default: 'id' },
    /** sm | md | lg — mật độ ô */
    size: { type: String, default: 'md' },
    /** Kẻ viền mọi ô */
    bordered: { type: Boolean },
    /** Kẻ sọc dòng chẵn */
    striped: { type: Boolean },
    /** Tô nền dòng khi rê chuột */
    hover: { type: Boolean },
    /** Tiêu đề dính theo trang khi cuộn (không dùng cùng scroll-x; với scroll-y tiêu đề luôn dính trong khung) */
    sticky: { type: Boolean },
    /** Chiều cao tối đa vùng thân (số = px, hoặc độ dài CSS) → tiêu đề cố định, cuộn bên trong */
    scrollY: { type: String, attribute: 'scroll-y' },
    /** Bề rộng tối thiểu của bảng (số = px | max-content) → cuộn ngang, dùng với cột fixed */
    scrollX: { type: String, attribute: 'scroll-x' },
    /** auto | fixed — thuật toán chia cột (mặc định tự chọn: fixed khi có ellipsis / fixed / resize / virtual / scroll-x) */
    layout: { type: String },
    /** Chú thích bảng (<caption>) */
    caption: { type: String },
    /** Nhãn ARIA của bảng khi không có caption */
    label: { type: String },
    /** Cho phép sắp xếp nhiều cột: Shift + bấm tiêu đề để thêm cột */
    sortMultiple: { type: Boolean },
    /** SERVER mode: không tự lọc / sắp xếp / cắt trang — chỉ ghi params + phát hui-change */
    server: { type: Boolean },
    /** Trang hiện tại (bắt đầu từ 1) */
    page: { type: Number, default: 1 },
    /** Số dòng mỗi trang */
    pageSize: { type: Number, default: 10 },
    /** bottom | top | none — vị trí thanh phân trang (none = tắt phân trang) */
    pagination: { type: String, default: 'bottom' },
    /** Thuộc tính thêm cho hui-pagination: { showSizeChanger, showTotal, pageSizeOptions, simple, hideOnSinglePage… } */
    paginationProps: { type: Object, attribute: false },
    /** Tổng số dòng (SERVER, khi không trả về { data, total }) */
    total: { type: Number, default: null },
    /** checkbox | radio — cột chọn dòng */
    selection: { type: String },
    /** Key các dòng đang chọn */
    selectedKeys: { type: Array, default: [] },
    /** page | all | none — phạm vi ô "Chọn tất cả" (trang hiện tại / mọi dòng sau lọc / ẩn) */
    selectAll: { type: String, default: 'page' },
    /** Hàm (row) => boolean — dòng có được chọn không (false = checkbox bị khóa) */
    rowSelectable: { type: Object, attribute: false },
    /** Hàm (row, index) => Node | string — nội dung dòng mở rộng (hoặc <template slot="expand">) */
    expandRender: { type: Object, attribute: false },
    /** Hàm (row) => boolean — dòng nào có nút mở rộng */
    rowExpandable: { type: Object, attribute: false },
    /** Key các dòng đang mở (dòng mở rộng + nút cây) */
    expandedKeys: { type: Array, default: [] },
    /** Mở sẵn mọi dòng ở lần nhận dữ liệu đầu */
    defaultExpandAll: { type: Boolean },
    /** Tên trường chứa dòng con (dữ liệu cây) */
    childrenKey: { type: String, default: 'children' },
    /** Độ thụt mỗi cấp của cây (px) */
    indentSize: { type: Number, default: 20 },
    /** Hàm (pageRows, allRows) => mảng ô | object theo key cột | mảng các dòng — dòng tổng ở <tfoot> */
    summary: { type: Object, attribute: false },
    /** Cuộn ảo (chỉ vẽ dòng đang thấy) — cần scroll-y; bảng thành role="grid" + điều hướng phím mũi tên */
    virtual: { type: Boolean },
    /** Chiều cao cố định mỗi dòng khi cuộn ảo (px; mặc định theo size 40 / 48 / 56) */
    rowHeight: { type: Number },
    /** Cho phép kéo đổi độ rộng mọi cột (hoặc đặt resizable trên từng cột) */
    resizable: { type: Boolean },
    /** Tắt hiệu ứng mở dòng */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    this._sorters = [];
    this._filters = {};
    this._seenCols = new Set();
    this._cols = normalizeColumns([]);
    this._colsVersion = 0;
    this._keyOf = new WeakMap();
    this._rowByKey = new Map();
    this._hasTree = false;
    this._expandInit = false;
    this._keyIds = new Map();
    this._expandEls = new Map();
    this._widths = new Map();
    this._colEls = [];
    this._leafThs = [];
    this._headGrid = [];
    this._view = { rows: [], all: [], pageRows: [], kids: new Map(), entries: [], total: 0, page: 1 };
    this._headSig = '';
    this._baseParams = null;
    this._ownParams = undefined;
    this._rendered = [];
    this._rowStart = 0;
    this._vw = null;
    this._active = null;
    this._layoutFrame = 0;
    this._pingFrame = 0;
    this._kbdShift = false;
    this._pagerPropsApplied = null;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._captionText = document.createTextNode('');
    this._captionSlot = createElement('slot', { name: 'caption' }, this._captionText);
    this._captionSlot.addEventListener('slotchange', () => this._syncCaption());
    this._caption = createElement('caption', { className: 'caption', part: 'caption' }, this._captionSlot);
    this._colgroup = createElement('colgroup');
    this._thead = createElement('thead', { className: 'thead', part: 'thead' });
    this._topSpacer = createElement('tr', { className: 'spacer', 'aria-hidden': 'true' }, createElement('td'));
    this._bottomSpacer = createElement('tr', { className: 'spacer', 'aria-hidden': 'true' }, createElement('td'));
    this._stateEl = createElement('div', { className: 'state', part: 'state' });
    this._stateRow = createElement('tr', { className: 'state-row', hidden: true },
      createElement('td', { className: 'state-cell' }, this._stateEl));
    this._tbody = createElement('tbody', { className: 'tbody', part: 'tbody' }, this._topSpacer, this._bottomSpacer, this._stateRow);
    this._tfoot = createElement('tfoot', { className: 'tfoot', hidden: true });
    this._table = createElement('table', { className: 'table', part: 'table' }, this._caption, this._colgroup, this._thead, this._tbody, this._tfoot);
    this._repeater = new Repeater(this._tbody, {
      key: (entry) => entry.id,
      before: this._bottomSpacer,
      create: (entry) => this._createRow(entry),
      update: (tr, entry) => this._updateRow(tr, entry),
    });

    this._scroller = createElement('div', { className: 'scroller', part: 'scroller' }, this._table);
    this._scroller.addEventListener('scroll', () => this._schedulePing(), { passive: true });
    this._loadingEl = createElement('div', { className: 'loading', part: 'loading', hidden: true },
      createElement('hui-spinner', { size: 'md' }));
    this._pager = createElement('hui-pagination', { className: 'pagination', part: 'pagination' });
    this._pager.addEventListener('change', (e) => this._onPager(e.detail || {}));
    this._footer = createElement('div', { className: 'footer', part: 'footer', hidden: true }, this._pager);
    this._live = createElement('div', { className: 'sr-only', role: 'status', 'aria-live': 'polite' });
    this._base = createElement('div', { className: 'base', part: 'base' }, this._scroller, this._loadingEl, this._footer, this._live);

    // Chặn sự kiện của control nội bộ (checkbox, input, popover, phân trang); nội dung ở light DOM (dòng mở rộng) đi qua bình thường
    for (const type of INNER_EVENTS) {
      this._base.addEventListener(type, (e) => {
        if (e.target?.getRootNode?.() === this.shadowRoot) e.stopPropagation();
      });
    }
    this._thead.addEventListener('click', (e) => this._onHeadClick(e));
    this._thead.addEventListener('change', (e) => {
      if (e.target.matches?.('hui-checkbox[data-select-all]')) this._onSelectAll(Boolean(e.detail?.checked));
    });
    this._tbody.addEventListener('click', (e) => this._onBodyClick(e));
    this._tbody.addEventListener('hui-save', (e) => this._onCellSave(e));
    this._tbody.addEventListener('hui-saved', (e) => this._onCellSaved(e));
    this._tbody.addEventListener('change', (e) => {
      const cb = e.target.closest?.('hui-checkbox[data-select]');
      if (cb && e.target.getRootNode() === this.shadowRoot) this._toggleSelect(this._entryOf(cb), Boolean(e.detail?.checked));
    });
    this._table.addEventListener('keydown', (e) => this._onKeydown(e));
    this._table.addEventListener('keyup', (e) => { if (e.key === 'Shift') this._kbdShift = false; });
    this._table.addEventListener('focusin', (e) => this._onFocusIn(e));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    if (typeof ResizeObserver === 'function' && !this._ro) {
      this._ro = new ResizeObserver(() => this._scheduleLayout());
    }
    this._ro?.observe(this._table);
    this._ro?.observe(this._scroller);
    if (this._hasRendered && this.virtual && !this._vw) this._syncVirtual();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._vw?.destroy();
    this._vw = null;
    cancelAnimationFrame(this._layoutFrame);
    cancelAnimationFrame(this._pingFrame);
    this._layoutFrame = 0;
    this._pingFrame = 0;
  }

  updated(changed) {
    if (changed.has('params') && this.params !== this._ownParams) this._baseParams = this.params;
    if (changed.has('columns')) this._setColumns();
    if (changed.has('data') || changed.has('rowKey') || changed.has('childrenKey')) this._indexData();
    this._syncServerParams();
    super.updated(changed);
    this._renderAll(changed);
  }

  // =====================================================
  // API
  // =====================================================

  /** Trạng thái hiện tại (chỉ đọc): { pagination: { current, pageSize, total }, filters, sorter, sorters } */
  get tableState() {
    const sorters = this._sorters.map((s) => ({ ...s }));
    return {
      pagination: { current: this._view.page, pageSize: this._pageSize(), total: this._view.total },
      filters: this._filtersCopy(),
      sorter: this.sortMultiple ? sorters : sorters[0] || null,
      sorters,
    };
  }

  /** Dòng đang chọn (chỉ đọc) — SERVER: dòng đã từng tải về */
  get selectedRows() {
    return (this.selectedKeys || []).map((k) => this._rowByKey.get(String(k))).filter((r) => r !== undefined);
  }

  /** Mọi dòng cấp 1 sau lọc + sắp xếp (chỉ đọc) */
  get processedRows() {
    return [...this._view.all];
  }

  /** Dòng cấp 1 của trang đang hiển thị (chỉ đọc) */
  get pageRows() {
    return [...this._view.pageRows];
  }

  /**
   * Sắp xếp theo cột: order 'asc' | 'desc' | null (bỏ). multiple = true → thêm vào danh sách (sort-multiple).
   * (Không đặt tên sort — tránh nhầm với Array.prototype.sort khi dùng chung)
   */
  sortBy(colKey, order, multiple = false) {
    const key = String(colKey);
    const o = normOrder(order);
    let list = multiple && this.sortMultiple ? this._sorters.filter((s) => s.key !== key) : [];
    if (o) {
      const idx = this._sorters.findIndex((s) => s.key === key);
      const next = { key, order: o };
      if (multiple && this.sortMultiple && idx >= 0) list.splice(Math.min(idx, list.length), 0, next);
      else list = [...list, next];
    }
    this._sorters = list;
    this._commit('sort');
  }

  /** Bỏ mọi sắp xếp */
  clearSorter() {
    if (!this._sorters.length) return;
    this._sorters = [];
    this._commit('sort');
  }

  /** Đặt bộ lọc của 1 cột (mảng value) — [] / null = bỏ lọc cột đó */
  setFilter(key, values) {
    const list = Array.isArray(values) ? values : values === null || values === undefined ? [] : [values];
    const next = { ...this._filters };
    if (list.length) next[key] = [...list];
    else delete next[key];
    this._filters = next;
    this._commit('filter', { key, values: [...list] });
  }

  /** Bỏ mọi bộ lọc */
  clearFilters() {
    if (!Object.keys(this._filters).length) return;
    this._filters = {};
    this._commit('filter', { key: null, values: [] });
  }

  /** Chuyển trang */
  goToPage(page) {
    const p = Math.max(1, Math.floor(Number(page) || 1));
    if (p === this.page) return;
    this.page = p;
    this._emitChange('paginate');
  }

  /** Chọn mọi dòng trong phạm vi select-all (trang / tất cả) */
  selectAllRows() {
    this._onSelectAll(true);
  }

  /** Bỏ chọn tất cả */
  clearSelection() {
    if (!(this.selectedKeys || []).length) return;
    this._setSelection([]);
  }

  /** Mở / thu 1 dòng theo key (open bỏ trống = đảo trạng thái) */
  toggleExpand(key, open) {
    const ks = String(key);
    const isOpen = this._expandedSet().has(ks);
    const next = open === undefined ? !isOpen : Boolean(open);
    if (next === isOpen) return;
    const keys = (this.expandedKeys || []).filter((k) => String(k) !== ks);
    if (next) keys.push(this._rowByKey.has(ks) ? this._key(this._rowByKey.get(ks)) : key);
    this.expandedKeys = keys;
    this.emit('hui-expand', { key, row: this._rowByKey.get(ks), expanded: next, expandedKeys: [...keys] });
  }

  /** Mở mọi dòng có con / có nội dung mở rộng */
  expandAll() {
    this.expandedKeys = this._expandableKeys();
  }

  /** Thu mọi dòng */
  collapseAll() {
    this.expandedKeys = [];
  }

  /** Cuộn tới dòng (key hoặc vị trí trong danh sách đang hiển thị) */
  scrollToRow(keyOrIndex, align = 'start') {
    const entries = this._view.entries;
    const idx = typeof keyOrIndex === 'number' ? keyOrIndex : entries.findIndex((e) => e.kind === 'row' && String(e.key) === String(keyOrIndex));
    if (idx < 0 || idx >= entries.length) return;
    if (this._vw) {
      this._vw.scrollToIndex(idx, align);
      return;
    }
    this._rowEl(idx)?.scrollIntoView({ block: align === 'center' ? 'center' : align === 'end' ? 'end' : 'nearest' });
  }

  /**
   * Xuất CSV (trả về chuỗi; có `filename` → tải file, kèm BOM để Excel đọc đúng tiếng Việt).
   * rows: all (mọi dòng sau lọc + sắp xếp) | page | selected · formatted: chữ như trên bảng (false = giá trị gốc)
   * columns: mảng key cột cần xuất (mặc định mọi cột trừ actions / exportable: false)
   */
  exportCsv({ filename, rows = 'all', formatted = true, columns, separator = ',' } = {}) {
    const cols = this._cols.leaves.filter((c) => c.exportable && (!columns || columns.includes(c.key)));
    const list = rows === 'selected' ? this.selectedRows
      : this._flatRows(rows === 'page' || this.server ? this._view.pageRows : this._view.all);
    const ctx = { yes: tx('table.yes'), no: tx('table.no') };
    const esc = (v) => {
      let s = v === null || v === undefined ? '' : String(v);
      // Chống chèn công thức khi mở bằng Excel (=, +, @, - không phải số)
      if (/^[=+@\t\r]/.test(s) || (/^-/.test(s) && Number.isNaN(Number(s)))) s = `'${s}`;
      return s.includes(separator) || /["\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.map((c) => esc(c.titleText)).join(separator)];
    for (const row of list) lines.push(cols.map((c) => esc(exportText(c, row, formatted, ctx))).join(separator));
    const csv = lines.join('\r\n');
    if (filename) {
      const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
      const a = createElement('a', { href: url, download: /\.csv$/i.test(filename) ? filename : `${filename}.csv` });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return csv;
  }

  /** Dòng + mọi dòng con (sau lọc / sắp xếp) theo thứ tự hiển thị */
  _flatRows(list) {
    const out = [];
    const walk = (rows) => rows.forEach((row) => {
      out.push(row);
      const k = this._view.kids.get(row);
      if (k && k.length) walk(k);
    });
    walk(list);
    return out;
  }

  // =====================================================
  // CỘT + DỮ LIỆU
  // =====================================================

  _setColumns() {
    this._cols = normalizeColumns(this.columns);
    this._colsVersion++;
    // Sắp xếp / lọc mặc định: chỉ áp 1 lần cho mỗi key cột (đổi columns sau đó không ghi đè lựa chọn của người dùng)
    for (const col of this._cols.leaves) {
      if (this._seenCols.has(col.key)) continue;
      this._seenCols.add(col.key);
      if (col.defaultSortOrder && col.sorter && !this._sorters.some((s) => s.key === col.key)) {
        this._sorters = this.sortMultiple ? [...this._sorters, { key: col.key, order: col.defaultSortOrder }] : [{ key: col.key, order: col.defaultSortOrder }];
      }
      if (col.defaultFilteredValue?.length && !this._filters[col.key]) {
        this._filters = { ...this._filters, [col.key]: [...col.defaultFilteredValue] };
      }
    }
  }

  _rawKey(row, fallback) {
    if (row === null || typeof row !== 'object') return row ?? fallback;
    const path = this.rowKey || 'id';
    const v = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), row);
    return v === undefined || v === null ? fallback : v;
  }

  _key(row) {
    if (row !== null && typeof row === 'object' && this._keyOf.has(row)) return this._keyOf.get(row);
    return this._rawKey(row, row);
  }

  /** Đánh key cho mọi dòng (kể cả dòng con); SERVER giữ dòng các trang trước để selectedRows vẫn đủ */
  _indexData() {
    if (!this.server) this._rowByKey = new Map();
    this._keyOf = new WeakMap();
    const ck = this.childrenKey || 'children';
    let tree = false;
    const walk = (list, prefix) => list.forEach((row, i) => {
      const key = this._rawKey(row, `${prefix}${i}`);
      if (row !== null && typeof row === 'object') this._keyOf.set(row, key);
      this._rowByKey.set(String(key), row);
      const kids = row && Array.isArray(row[ck]) && row[ck].length ? row[ck] : null;
      if (kids) {
        tree = true;
        walk(kids, `${prefix}${i}.`);
      }
    });
    const data = Array.isArray(this.data) ? this.data : [];
    walk(data, '#');
    this._hasTree = tree;
    if (this.defaultExpandAll && !this._expandInit && data.length) {
      this._expandInit = true;
      this.expandedKeys = this._expandableKeys();
    }
  }

  _expandableKeys() {
    const ck = this.childrenKey || 'children';
    const out = [];
    const walk = (list) => list.forEach((row) => {
      const kids = row && Array.isArray(row[ck]) && row[ck].length ? row[ck] : null;
      if (kids || (this._isExpandable() && this._canExpand(row))) out.push(this._key(row));
      if (kids) walk(kids);
    });
    walk(Array.isArray(this.data) ? this.data : []);
    return out;
  }

  _expandTemplate() {
    return this.querySelector(':scope > template[slot="expand"]');
  }

  _isExpandable() {
    return !this.virtual && (typeof this.expandRender === 'function' || Boolean(this._expandTemplate()));
  }

  _canExpand(row) {
    return typeof this.rowExpandable === 'function' ? Boolean(this.rowExpandable(row)) : true;
  }

  _canSelect(row) {
    return typeof this.rowSelectable === 'function' ? Boolean(this.rowSelectable(row)) : true;
  }

  _expandedSet() {
    return new Set((this.expandedKeys || []).map(String));
  }

  _selectedSet() {
    return new Set((this.selectedKeys || []).map(String));
  }

  _pageSize() {
    return Math.max(1, Math.floor(this.pageSize || 10));
  }

  get _paged() {
    return this.pagination !== 'none';
  }

  get _isGrid() {
    return Boolean(this.virtual || this._hasTree);
  }

  get _selectionMode() {
    return this.selection === 'checkbox' || this.selection === 'radio' ? this.selection : null;
  }

  _filtersCopy() {
    const out = {};
    for (const [k, v] of Object.entries(this._filters)) if (v && v.length) out[k] = [...v];
    return out;
  }

  /** Lọc → sắp xếp → cắt trang → làm phẳng (dòng mở rộng + dòng con đang mở) */
  _compute() {
    const client = !this.server;
    const data = Array.isArray(this.data) ? this.data : [];
    const { rows, kids } = processRows(data, {
      leaves: this._cols.leaves,
      filters: client ? this._filters : null,
      sorters: client ? this._sorters : null,
      childrenKey: this.childrenKey || 'children',
      tree: this._hasTree,
    });
    const size = this._pageSize();
    let total;
    let page = Math.max(1, this.page || 1);
    let pageRows;
    if (client) {
      total = rows.length;
      if (this._paged) {
        const pages = Math.max(1, Math.ceil(total / size));
        if (page > pages && this.dataState === 'ready') {
          page = pages;
          this.page = pages; // kẹp trang vượt quá (vd sau khi lọc) — lần cập nhật sau vẽ lại
        }
        page = Math.min(page, pages);
        pageRows = rows.slice((page - 1) * size, page * size);
      } else {
        pageRows = rows;
      }
    } else {
      total = typeof this.total === 'number' ? this.total : typeof this.dataTotal === 'number' ? this.dataTotal : rows.length;
      pageRows = rows;
    }

    const expanded = this._expandedSet();
    const expandable = this._isExpandable();
    const entries = [];
    const visit = (list, level, parentKey) => list.forEach((row, i) => {
      const key = this._key(row);
      const ks = String(key);
      const children = this._hasTree ? kids.get(row) : null;
      const hasKids = Boolean(children && children.length);
      const open = expanded.has(ks);
      entries.push({ id: `r${ks}`, kind: 'row', row, key, level, index: i, setsize: list.length, hasKids, parentKey, open });
      if (expandable && open && this._canExpand(row)) entries.push({ id: `x${ks}`, kind: 'expand', row, key, index: i, level });
      if (hasKids && open) visit(children, level + 1, key);
    });
    visit(pageRows, 0, null);
    return { rows, all: rows, kids, pageRows, entries, total, page };
  }

  // =====================================================
  // TRẠNG THÁI: sắp xếp / lọc / trang → sự kiện + params server
  // =====================================================

  _commit(action, extra = {}) {
    if (this.page !== 1) this.page = 1; // đổi sắp xếp / lọc → về trang 1
    if (action === 'sort') {
      const { sorter, sorters } = this.tableState;
      this.emit('hui-sort', { sorter, sorters });
      this._announceSort();
    } else if (action === 'filter') {
      this.emit('hui-filter', { ...extra, filters: this._filtersCopy() });
    }
    this._syncServerParams();
    this.requestUpdate('tableState');
    this._emitChange(action);
  }

  _emitChange(action) {
    // Tổng / trang hiện tại tính lại ngay (client) để detail đúng ở thời điểm phát
    this._view = this._compute();
    this.emit('hui-change', { ...this.tableState, action });
  }

  /** SERVER: params = params gốc của bạn + { page, pageSize, sort, order, sorts?, …lọc (mảng) } */
  _syncServerParams() {
    if (!this.server) return;
    const p = { ...(this._baseParams || {}) };
    if (this._paged) {
      p.page = Math.max(1, this.page || 1);
      p.pageSize = this._pageSize();
    }
    if (this._sorters.length) {
      p.sort = this._sorters[0].key;
      p.order = this._sorters[0].order;
      if (this.sortMultiple) p.sorts = this._sorters.map((s) => ({ ...s }));
    }
    for (const [k, v] of Object.entries(this._filters)) if (v && v.length) p[k] = [...v];
    if (JSON.stringify(p) === JSON.stringify(this.params || null)) return;
    this._ownParams = p;
    this.params = p;
  }

  _announceSort() {
    const s = this._sorters[0];
    const col = s && this._cols.leaves.find((c) => c.key === s.key);
    this._announce(col ? `${col.titleText}: ${tx(s.order === 'desc' ? 'table.sortDesc' : 'table.sortAsc')}` : tx('table.sortNone'));
  }

  _announce(text) {
    // Xóa rồi ghi lại → trình đọc màn hình đọc cả khi nội dung trùng lần trước
    this._live.textContent = '';
    requestAnimationFrame(() => { this._live.textContent = text; });
  }

  // =====================================================
  // VẼ
  // =====================================================

  _renderAll(changed) {
    const view = this._compute();
    this._view = view;

    // Khung: layout, scroll, role
    const scrollX = this.scrollX === '' ? 'max-content' : this.scrollX;
    const fixedLayout = this.layout ? this.layout === 'fixed'
      : Boolean((scrollX && scrollX !== 'max-content') || this.virtual || this.resizable || this._widths.size
        || this._cols.leaves.some((c) => c.ellipsis || c.fixed || c.resizable));
    this._table.classList.toggle('table--fixed', fixedLayout);
    this._table.style.minWidth = scrollX ? (/^\d+(\.\d+)?$/.test(scrollX) ? `${scrollX}px` : scrollX) : '';
    const scrollY = this.scrollY || (this.virtual ? '400' : '');
    this._scroller.style.maxHeight = scrollY ? (/^\d+(\.\d+)?$/.test(scrollY) ? `${scrollY}px` : scrollY) : '';
    this._base.classList.toggle('base--scroll-y', Boolean(scrollY));
    this._base.classList.toggle('base--scroll-x', Boolean(scrollX));
    this._base.classList.toggle('base--sticky', this.sticky && !scrollY);
    this._base.classList.toggle('base--virtual', Boolean(this.virtual));
    this._base.classList.toggle('base--grid', this._isGrid);
    this._base.classList.toggle('base--top', this.pagination === 'top');
    if (this.pagination === 'top') this._base.insertBefore(this._footer, this._scroller);
    else this._base.insertBefore(this._footer, this._live);
    this._table.style.setProperty('--_table-row-h', `${this._rowHeight()}px`);
    this._table.style.setProperty('--_table-indent', `${Math.max(0, Number(this.indentSize) || 0)}px`);

    // Role: bảng thường = <table> thật; cuộn ảo = grid; dữ liệu cây = treegrid (+ điều hướng phím mũi tên)
    const role = this._hasTree ? 'treegrid' : this.virtual ? 'grid' : null;
    if (role) this._table.setAttribute('role', role);
    else this._table.removeAttribute('role');
    if (this._selectionMode === 'checkbox' && role) this._table.setAttribute('aria-multiselectable', 'true');
    else this._table.removeAttribute('aria-multiselectable');

    if (changed.has('caption') || changed.has('label') || changed.has('locale')) this._syncCaption();

    // Cấu trúc cột / cột đặc biệt đổi → dựng lại tiêu đề + mọi dòng
    const headSig = [this._colsVersion, this._selectionMode, this.selectAll, this._isExpandable(), this._hasTree, this._isGrid,
      this.resizable, this.sortMultiple, getLocaleName()].join('|');
    if (headSig !== this._headSig) {
      this._headSig = headSig;
      this._buildColumns();
      this._repeater.clear();
      this._rendered = [];
    }
    this._syncHead();

    // Thân bảng
    const ds = this.dataState;
    // DataController gắn aria-busy="" (rỗng = false theo ARIA) → ghi rõ "true"
    if (this.hasAttribute('aria-busy')) this.setAttribute('aria-busy', 'true');
    const hasRows = view.entries.length > 0;
    this._renderState(ds, hasRows);
    this._loadingEl.hidden = !(ds === 'loading' && hasRows);
    this._scroller.classList.toggle('scroller--busy', ds === 'loading' && hasRows);
    if (this.virtual) {
      this._syncVirtual();
    } else {
      if (this._vw) {
        this._vw.destroy();
        this._vw = null;
        this._table.removeAttribute('aria-rowcount');
        for (const tr of this._thead.rows) tr.removeAttribute('aria-rowindex');
      }
      this._topSpacer.hidden = true;
      this._bottomSpacer.hidden = true;
      this._renderRows(view.entries, 0);
    }
    this._syncExpandEls(view.entries);
    this._renderSummary(view);
    this._renderPager(view, ds, hasRows);

    // Vùng cuộn: có thể focus bằng Tab khi không có control nào bên trong (axe scrollable-region-focusable)
    const scrollable = Boolean(scrollY || scrollX);
    if (scrollable && !this._isGrid) {
      this._scroller.setAttribute('tabindex', '0');
      this._scroller.setAttribute('role', 'region');
      this._scroller.setAttribute('aria-label', this.caption || this.label || tx('table.label'));
    } else {
      this._scroller.setAttribute('tabindex', '-1');
      this._scroller.removeAttribute('role');
      this._scroller.removeAttribute('aria-label');
    }
    if (this._isGrid) {
      this._ensureActive();
      this._scheduleDemote();
    }
    this._scheduleLayout();
  }

  _rowHeight() {
    const h = Number(this.rowHeight);
    return h > 0 ? h : ROW_HEIGHT[this.size] || ROW_HEIGHT.md;
  }

  _syncCaption() {
    if (!this._captionText) return;
    this._captionText.data = this.caption || '';
    const slotted = this._captionSlot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    this._caption.hidden = !this.caption && !slotted;
    if (this._caption.hidden && this.label) this._table.setAttribute('aria-label', this.label);
    else this._table.removeAttribute('aria-label');
  }

  // ---------- cột: colgroup + thead ----------

  /** Danh sách cột hiển thị: [chọn dòng?, mở rộng?, ...lá] kèm trạng thái cố định */
  _buildColumns() {
    const leaves = this._cols.leaves;
    const specials = [];
    if (this._selectionMode) specials.push({ kind: 'select' });
    if (this._isExpandable()) specials.push({ kind: 'expand' });
    const leftSpecial = leaves[0]?.fixed === 'left';
    const all = [...specials.map((s) => ({ ...s, fixed: leftSpecial ? 'left' : null })), ...leaves.map((col) => ({ kind: 'data', col, fixed: col.fixed }))];
    this._specials = specials.length;
    this._all = all;
    this._lastLeft = all.reduce((m, c, i) => (c.fixed === 'left' ? i : m), -1);
    this._firstRight = all.findIndex((c) => c.fixed === 'right');
    this._hasFixed = this._lastLeft >= 0 || this._firstRight >= 0;

    // colgroup
    this._colEls = all.map((c) => {
      const el = createElement('col', { className: `col col--${c.kind}` });
      const w = c.kind === 'data' ? this._widthOf(c.col) : `${SPECIAL_WIDTH}px`;
      if (w) el.style.width = w;
      return el;
    });
    this._colgroup.replaceChildren(...this._colEls);
    this._syncTableWidth();

    // thead (nhiều hàng khi gộp tiêu đề)
    const rows = headerRows(this._cols);
    const depth = this._cols.depth;
    this._headGrid = Array.from({ length: depth }, () => []);
    this._leafThs = [];
    const trs = rows.map((list, r) => {
      const tr = createElement('tr', { className: 'header-row', part: 'header-row' });
      if (r === 0) {
        specials.forEach((s, i) => {
          const th = this._specialHead(s, depth);
          this._fixCell(th, all[i].fixed, i, i);
          tr.append(th);
          this._leafThs[i] = th;
          for (let rr = 0; rr < depth; rr++) this._headGrid[rr][i] = th;
        });
      }
      for (const col of list) {
        const th = this._headCell(col, r);
        tr.append(th);
        const start = this._specials + col.first;
        const end = this._specials + col.last;
        if (!col.kids) this._leafThs[start] = th;
        for (let rr = r; rr < r + col.rowSpan; rr++) for (let c = start; c <= end; c++) this._headGrid[rr][c] = th;
      }
      return tr;
    });
    this._thead.replaceChildren(...trs);
    this._thead.hidden = !leaves.length;
    const span = String(Math.max(1, all.length));
    for (const tr of [this._topSpacer, this._bottomSpacer, this._stateRow]) tr.firstElementChild.colSpan = Number(span);
    this._active = null;
  }

  _widthOf(col) {
    const w = this._widths.get(col.key);
    return w ? `${w}px` : col.width;
  }

  /** Đã kéo đổi độ rộng → bảng rộng đúng bằng tổng các cột (cột khác không tự co giãn theo) */
  _syncTableWidth() {
    if (!this._widths.size || !this._all) {
      this._table.style.width = '';
      return;
    }
    let sum = 0;
    for (const c of this._all) {
      const w = c.kind === 'data' ? Number.parseFloat(this._widthOf(c.col)) : SPECIAL_WIDTH;
      if (!Number.isFinite(w)) {
        this._table.style.width = '';
        return;
      }
      sum += w;
    }
    this._table.style.width = `${sum}px`;
  }

  _cellAttrs(th) {
    if (this._isGrid) th.tabIndex = -1;
    return th;
  }

  _specialHead(s, depth) {
    const th = this._cellAttrs(createElement('th', { scope: 'col', className: `th th--${s.kind}`, part: 'th', rowspan: String(depth) }));
    th.dataset.col = s.kind === 'select' ? '0' : String(this._selectionMode ? 1 : 0);
    if (s.kind === 'select' && this._selectionMode === 'checkbox' && this.selectAll !== 'none') {
      const cb = createElement('hui-checkbox', { 'data-select-all': '', 'aria-label': tx('table.selectAll') });
      th.dataset.selectAll = '';
      th.append(cb);
      this._selectAllEl = cb;
    } else {
      th.append(srOnly(tx(s.kind === 'select' ? 'table.selection' : 'table.expandColumn')));
      if (s.kind === 'select') this._selectAllEl = null;
    }
    if (this._isGrid) this._demote(th);
    return th;
  }

  _headCell(col, r) {
    const isLeaf = !col.kids;
    const align = isLeaf ? alignOf(col) : 'center';
    const th = this._cellAttrs(createElement('th', {
      scope: isLeaf ? 'col' : 'colgroup',
      className: `th th--${isLeaf ? col.type : 'group'} th--align-${align}`,
      part: isLeaf ? 'th' : 'th th-group',
    }));
    if (col.colSpan > 1) th.colSpan = col.colSpan;
    if (col.rowSpan > 1) th.rowSpan = col.rowSpan;
    th.dataset.col = String(this._specials + col.first);
    th.dataset.key = col.key;
    th._col = col;
    // Tiêu đề nhiều hàng dính: hàng r dính dưới tổng chiều cao các hàng trên (đo ở _layout)
    if (this._cols.depth > 1) th.style.setProperty('--_table-row-top', `var(--_table-top${r}, 0px)`);
    if (col.className) th.classList.add(...String(col.className).split(/\s+/).filter(Boolean));
    if (isLeaf && col.minWidth) th.style.minWidth = `${col.minWidth}px`;
    this._fixCell(th, col.fixed, this._specials + col.first, this._specials + col.last);

    const title = typeof col.title === 'function' ? col.title() : col.title instanceof Node ? col.title.cloneNode(true) : String(col.title ?? col.key);
    const inner = createElement('div', { className: 'th__inner' });
    if (isLeaf && col.sorter) {
      th.classList.add('th--sortable');
      inner.append(createElement('button', { type: 'button', className: 'th__sort', part: 'sort-button', dataset: { sort: col.key } },
        createElement('span', { className: 'th__title' }, title),
        createElement('span', { className: 'sorter', part: 'sorter', 'aria-hidden': 'true' }),
        createElement('span', { className: 'sort-priority', part: 'sort-priority', 'aria-hidden': 'true', hidden: true })));
    } else {
      inner.append(createElement('span', { className: 'th__title' }, title));
    }
    if (isLeaf && (col.filters || col.filterSearch)) inner.append(this._filterControl(col));
    th.append(inner);
    if (isLeaf && (col.resizable ?? this.resizable)) th.append(this._resizeHandle(col, th));
    if (this._isGrid) this._demote(th);
    return th;
  }

  /** Cột cố định: position sticky + offset qua biến nội bộ (tính ở _layout sau khi đo) */
  _fixCell(el, fixed, start, end) {
    if (fixed === 'left') {
      el.classList.add('fix-l');
      el.style.insetInlineStart = `var(--_table-l${start}, 0px)`;
      if (end === this._lastLeft) el.classList.add('fix-l-last');
    } else if (fixed === 'right') {
      el.classList.add('fix-r');
      el.style.insetInlineEnd = `var(--_table-r${end}, 0px)`;
      if (start === this._firstRight) el.classList.add('fix-r-first');
    } else {
      return;
    }
    el.setAttribute('part', `${el.getAttribute('part')} ${el.tagName === 'TH' ? 'th-fixed' : 'cell-fixed'}`);
  }

  /** Cập nhật trạng thái động của tiêu đề: aria-sort, mũi tên, thứ tự ưu tiên, nút lọc, chọn tất cả */
  _syncHead() {
    const sorters = this._sorters;
    for (const btn of this._thead.querySelectorAll('button[data-sort]')) {
      const th = btn.closest('th');
      const idx = sorters.findIndex((s) => s.key === btn.dataset.sort);
      const s = sorters[idx];
      th.classList.toggle('th--sorted', Boolean(s));
      th.dataset.order = s ? s.order : '';
      // Chỉ cột sắp xếp chính mang aria-sort (ARIA: tối đa 1 cột khác "none")
      if (idx === 0) th.setAttribute('aria-sort', s.order === 'desc' ? 'descending' : 'ascending');
      else th.removeAttribute('aria-sort');
      const pr = btn.querySelector('.sort-priority');
      pr.hidden = !(this.sortMultiple && sorters.length > 1 && s);
      pr.textContent = s ? String(idx + 1) : '';
    }
    for (const btn of this._thead.querySelectorAll('button[data-filter]')) {
      const on = Boolean(this._filters[btn.dataset.filter]?.length);
      btn.classList.toggle('filter-btn--active', on);
      btn.setAttribute('part', on ? 'filter-button filter-button-active' : 'filter-button');
    }
    this._syncSelectAll();
  }

  // ---------- bộ lọc ----------

  _filterControl(col) {
    const btn = createElement('button', {
      type: 'button', className: 'filter-btn', part: 'filter-button', dataset: { filter: col.key },
      'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-label': tx('table.filter', { title: col.titleText }),
    }, createElement('hui-icon', { name: 'filter' }));
    const panel = createElement('div', { slot: 'content', className: 'filter-panel', part: 'filter-panel' });
    const pop = createElement('hui-popover', { trigger: 'click', placement: 'bottom-end', arrow: 'false', className: 'filter-pop' }, btn, panel);
    pop.addEventListener('open-change', (e) => {
      btn.setAttribute('aria-expanded', String(Boolean(e.detail?.open)));
      if (e.detail?.open) this._openFilter(col, pop, panel, btn);
    });
    return pop;
  }

  /** Dựng nội dung bộ lọc khi mở (nháp — chỉ áp dụng khi bấm Lọc) */
  _openFilter(col, pop, panel, btn) {
    pop.popup?.setAttribute('aria-label', tx('table.filter', { title: col.titleText }));
    const options = (col.filters || []).map((f) => (f !== null && typeof f === 'object' ? f : { text: String(f), value: f }));
    const current = this._filters[col.key] || [];
    const isOn = (o) => current.some((v) => String(v) === String(o.value));
    const textOf = (o) => String(o.text ?? o.label ?? o.value);
    const listId = `hui-table-${this._uid}-f-${col.key}`;

    let list;
    let items;
    if (col.filterMultiple) {
      items = options.map((o, i) => createElement('hui-checkbox', { className: 'filter-option', dataset: { i: String(i) }, label: textOf(o), checked: isOn(o), size: 'sm' }));
      list = createElement('div', { className: 'filter-list', part: 'filter-list', role: 'group', id: listId, 'aria-label': col.titleText }, ...items);
    } else {
      ensureElement('hui-radio-group');
      list = createElement('hui-radio-group', { className: 'filter-list', part: 'filter-list', direction: 'vertical', id: listId, 'aria-label': col.titleText });
      list.options = options.map((o, i) => ({ label: textOf(o), value: String(i) }));
      const on = options.findIndex(isOn);
      list.value = on >= 0 ? String(on) : '';
      items = null;
    }
    const empty = createElement('div', { className: 'filter-empty', hidden: true }, tx('table.filterEmpty'));
    let search = null;
    if (col.filterSearch) {
      search = createElement('hui-input', { type: 'search', size: 'sm', className: 'filter-search', part: 'filter-search', placeholder: tx('table.filterSearch'), clearable: true });
      const apply = (q) => {
        const fq = fold(q).trim();
        let shown = 0;
        options.forEach((o, i) => {
          const ok = !fq || (typeof col.filterSearch === 'function' ? col.filterSearch(q, o) : fold(textOf(o)).includes(fq));
          if (items) items[i].hidden = !ok;
          if (ok) shown++;
        });
        if (!items) {
          list.options = options.map((o, i) => ({ label: textOf(o), value: String(i) }))
            .filter((o, i) => !fq || (typeof col.filterSearch === 'function' ? col.filterSearch(q, options[i]) : fold(o.label).includes(fq)));
        }
        empty.hidden = shown > 0;
      };
      search.addEventListener('input', (e) => apply(e.detail?.value ?? ''));
      search.addEventListener('clear', () => apply(''));
    }
    const reset = createElement('hui-button', { size: 'sm', variant: 'text', className: 'filter-reset' }, tx('table.filterReset'));
    const ok = createElement('hui-button', { size: 'sm', variant: 'primary', className: 'filter-ok' }, tx('table.filterConfirm'));
    const close = () => {
      pop.hide();
      btn.focus();
    };
    reset.addEventListener('click', () => {
      close();
      this.setFilter(col.key, []);
    });
    ok.addEventListener('click', () => {
      let values;
      if (items) values = items.filter((cb) => cb.checked).map((cb) => options[Number(cb.dataset.i)].value);
      else values = list.value === '' || list.value === null ? [] : [options[Number(list.value)].value];
      close();
      const same = values.length === current.length && values.every((v, i) => String(v) === String(current[i]));
      if (!same) this.setFilter(col.key, values);
    });
    panel.replaceChildren(search || '', list, empty, createElement('div', { className: 'filter-footer', part: 'filter-footer' }, reset, ok));
    if (!options.length) empty.hidden = false;
    // Focus vào control đầu tiên (đợi popup hiện + control con dựng xong)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const first = search || (items ? items.find((x) => !x.hidden) : list);
      this._focusInside(first || ok);
    }));
  }

  /** Focus phần tử thật bên trong custom element (input / button trong shadow root) */
  _focusInside(el) {
    if (!el) return;
    const inner = el.shadowRoot?.querySelector('input, button, [tabindex]:not([tabindex^="-"]), [role="button"]')
      || (el.tagName === 'HUI-RADIO-GROUP' ? el.querySelector('hui-radio[tabindex="0"], hui-radio') : null);
    (inner || el).focus?.();
  }

  // ---------- đổi độ rộng cột ----------

  _resizeHandle(col, th) {
    const handle = createElement('span', {
      className: 'resizer', part: 'resize-handle', role: 'separator', tabindex: '0',
      'aria-orientation': 'vertical', 'aria-label': tx('table.resize', { title: col.titleText }),
      'aria-valuemin': String(col.minWidth || 40), 'aria-valuenow': String(Math.round(Number.parseFloat(this._widthOf(col)) || col.minWidth || 40)),
      dataset: { resize: col.key },
    });
    handle.addEventListener('click', (e) => e.stopPropagation());
    handle.addEventListener('pointerdown', (e) => this._startResize(e, col, th, handle));
    handle.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 50 : 10;
      const dir = getComputedStyle(this).direction === 'rtl' ? -1 : 1;
      let delta = 0;
      if (e.key === 'ArrowRight') delta = step * dir;
      else if (e.key === 'ArrowLeft') delta = -step * dir;
      else return;
      e.preventDefault();
      e.stopPropagation();
      this._freezeWidths();
      const w = this._setColWidth(col, (this._widths.get(col.key) || th.getBoundingClientRect().width) + delta, handle);
      this.emit('hui-column-resize', { key: col.key, width: w });
    });
    return handle;
  }

  /** Lần đầu kéo: chốt độ rộng hiện tại của mọi cột (để chỉ cột đang kéo đổi kích thước) */
  _freezeWidths() {
    if (!this._all) return;
    let changed = false;
    this._all.forEach((c, i) => {
      if (c.kind !== 'data' || this._widths.has(c.col.key)) return;
      const th = this._leafThs[i];
      const w = th ? Math.round(th.getBoundingClientRect().width) : 0;
      if (w > 0) {
        this._widths.set(c.col.key, w);
        this._colEls[i].style.width = `${w}px`;
        changed = true;
      }
    });
    if (changed) {
      this._table.classList.add('table--fixed');
      this._syncTableWidth();
    }
  }

  _setColWidth(col, width, handle) {
    const w = Math.round(clamp(width, col.minWidth || 40, col.maxWidth || 2000));
    this._widths.set(col.key, w);
    const el = this._colEls[this._specials + col.leafIndex];
    if (el) el.style.width = `${w}px`;
    handle?.setAttribute('aria-valuenow', String(w));
    this._syncTableWidth();
    this._scheduleLayout();
    return w;
  }

  _startResize(e, col, th, handle) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    this._freezeWidths();
    const startX = e.clientX;
    const startW = this._widths.get(col.key) || th.getBoundingClientRect().width;
    const dir = getComputedStyle(this).direction === 'rtl' ? -1 : 1;
    let last = startW;
    try { handle.setPointerCapture(e.pointerId); } catch { /* pointer giả lập */ }
    this._base.classList.add('base--resizing');
    const move = (ev) => { last = this._setColWidth(col, startW + (ev.clientX - startX) * dir, handle); };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      this._base.classList.remove('base--resizing');
      this.emit('hui-column-resize', { key: col.key, width: last });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  // ---------- dòng ----------

  _renderRows(entries, start) {
    const nodes = this._repeater.render(entries);
    this._rendered = nodes;
    this._rowStart = start;
    const sel = this._selectedSet();
    nodes.forEach((tr, i) => this._syncRow(tr, entries[i], sel, start + i));
  }

  /** Cuộn ảo: VirtualWindow báo khoảng [start, end) → 2 dòng đệm giữ đúng chiều cao thanh cuộn */
  _syncVirtual() {
    if (!this.virtual || !this.isConnected || !this._hasRendered) return;
    const entries = this._view.entries;
    const h = this._rowHeight();
    if (!this._vw) {
      this._vw = new VirtualWindow(this._scroller, { count: entries.length, itemSize: h, overscan: 8, onRange: (r) => this._renderSlice(r) });
    } else {
      this._vw.itemSize = h;
      this._vw.setCount(entries.length);
    }
  }

  _renderSlice({ start, end }) {
    const entries = this._view.entries;
    const h = this._rowHeight();
    const s = Math.min(start, entries.length);
    const e = Math.min(end, entries.length);
    this._topSpacer.hidden = s === 0;
    this._bottomSpacer.hidden = e >= entries.length;
    this._topSpacer.firstElementChild.style.height = `${s * h}px`;
    this._bottomSpacer.firstElementChild.style.height = `${(entries.length - e) * h}px`;
    this._renderRows(entries.slice(s, e), s);
    const head = this._thead.hidden ? 0 : this._cols.depth;
    this._table.setAttribute('aria-rowcount', String(head + entries.length + (this._tfoot.hidden ? 0 : this._tfoot.rows.length)));
    [...this._thead.rows].forEach((tr, i) => tr.setAttribute('aria-rowindex', String(i + 1)));
    this._ensureActive();
    this._scheduleDemote();
  }

  _createRow(entry) {
    if (entry.kind === 'expand') {
      const name = this._slotName(entry.key);
      const inner = createElement('div', { className: 'expand-inner' }, createElement('slot', { name }));
      const td = this._cellAttrs(createElement('td', { className: 'expanded-cell', part: 'expanded-cell', colspan: String(this._all.length) },
        createElement('div', { className: 'expand-sticky' }, inner)));
      const tr = createElement('tr', { className: 'expanded-row', part: 'expanded-row', id: this._detailId(entry.key) }, td);
      tr._entry = entry;
      tr._inner = inner;
      return tr;
    }
    const tr = createElement('tr', { className: 'row', part: 'row' });
    tr._entry = entry;
    this._fillRow(tr, entry);
    return tr;
  }

  _updateRow(tr, entry) {
    const prev = tr._entry;
    tr._entry = entry;
    if (entry.kind === 'row' && (prev.row !== entry.row || prev.index !== entry.index || prev.level !== entry.level || prev.hasKids !== entry.hasKids)) {
      this._fillRow(tr, entry);
    }
  }

  _fillRow(tr, entry) {
    const cells = [];
    const all = this._all;
    if (this._selectionMode) cells.push(this._selectCell(entry, 0));
    if (this._isExpandable()) cells.push(this._expandCell(entry, this._selectionMode ? 1 : 0));
    const ctx = { yes: tx('table.yes'), no: tx('table.no') };
    this._cols.leaves.forEach((col, i) => {
      const p = this._specials + i;
      const td = this._cellAttrs(createElement('td', { className: `cell cell--${col.type}`, part: 'cell' }));
      const align = alignOf(col);
      if (align !== 'left') {
        td.style.textAlign = align;
        td.classList.add(`cell--align-${align}`);
      }
      if (col.className) td.classList.add(...String(col.className).split(/\s+/).filter(Boolean));
      this._fixCell(td, all[p].fixed, p, p);
      const editable = typeof col.editable === 'function' ? col.editable(entry.row) : Boolean(col.editable);
      let content = editable ? this._editor(col, entry) : renderCell(col, entry.row, entry.index, ctx);
      if (col.ellipsis) {
        const wrap = createElement('span', { className: 'ellipsis' }, content);
        const text = content.textContent?.trim();
        if (text) wrap.title = text;
        content = wrap;
      }
      if (i === 0 && this._hasTree) {
        td.dataset.tree = '';
        const indent = createElement('span', { className: 'indent', style: { width: `calc(var(--_table-indent) * ${entry.level})` } });
        const toggle = entry.hasKids
          ? this._toggleButton(entry, 'tree')
          : createElement('span', { className: 'toggle-space', 'aria-hidden': 'true' });
        content = createElement('span', { className: 'tree-cell' }, indent, toggle, content);
      }
      td.append(content);
      cells.push(td);
    });
    tr.replaceChildren(...cells);
    if (this._isGrid) this._demote(tr);
  }

  _toggleButton(entry, kind) {
    const btn = createElement('button', {
      type: 'button', className: `toggle toggle--${kind}`, part: 'expand-button', dataset: { toggle: kind },
    }, createElement('hui-icon', { name: 'chevron-right' }));
    if (kind === 'expand') btn.setAttribute('aria-controls', this._detailId(entry.key));
    return btn;
  }

  _selectCell(entry, pos) {
    const td = this._cellAttrs(createElement('td', { className: 'cell cell--select', part: 'cell selection-cell', dataset: { select: '' } }));
    this._fixCell(td, this._all[pos].fixed, pos, pos);
    const first = this._cols.leaves[0];
    const name = first ? cellValue(first, entry.row) : null;
    const label = tx('table.selectRow', { name: name !== null && name !== undefined && typeof name !== 'object' ? String(name) : String(entry.key) });
    if (this._selectionMode === 'radio') ensureElement('hui-radio');
    const ctl = this._selectionMode === 'radio'
      ? createElement('hui-radio', { 'data-select': '', 'aria-label': label })
      : createElement('hui-checkbox', { 'data-select': '', 'aria-label': label });
    td.append(ctl);
    return td;
  }

  _expandCell(entry, pos) {
    const td = this._cellAttrs(createElement('td', { className: 'cell cell--expand', part: 'cell' }));
    this._fixCell(td, this._all[pos].fixed, pos, pos);
    if (this._canExpand(entry.row)) {
      td.dataset.expand = '';
      td.append(this._toggleButton(entry, 'expand'));
    }
    return td;
  }

  // ---------- sửa tại chỗ (cột editable → hui-editable) ----------

  _editor(col, entry) {
    const value = cellValue(col, entry.row);
    const numeric = ['number', 'currency', 'percent'].includes(col.type);
    ensureElement('hui-editable');
    const ed = createElement('hui-editable', {
      'data-edit': col.key,
      type: col.editor || (Array.isArray(col.options) ? 'select' : numeric ? 'number' : 'text'),
      label: col.titleText,
      value: value === null || value === undefined ? '' : String(value),
    });
    // Luôn đưa dạng { value, label } (hui-editable nhận chuỗi trần sẽ gắn disabled="undefined" cho option)
    if (Array.isArray(col.options)) ed.options = col.options.map((o) => (o !== null && typeof o === 'object' ? o : { value: o, label: String(o) }));
    // Hiển thị theo type cột (tiền, %, nhãn tag…) dù giá trị lưu là chuỗi nhập
    ed.formatFn = (v) => (col.labels?.[v] !== undefined ? String(col.labels[v]) : formatCell(col, this._coerce(col, v, value), entry.row));
    return ed;
  }

  /** Giá trị nhập (chuỗi) → đúng kiểu của dữ liệu cũ (số) */
  _coerce(col, v, old) {
    if (col.editor === 'number' || typeof old === 'number' || ['number', 'currency', 'percent'].includes(col.type)) {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    }
    return v;
  }

  _editTarget(e) {
    const ed = e.target.closest?.('hui-editable[data-edit]');
    if (!ed || ed.getRootNode() !== this.shadowRoot) return null;
    const entry = this._entryOf(ed);
    const col = this._cols.leaves.find((c) => c.key === ed.dataset.edit);
    return entry && col ? { entry, col } : null;
  }

  _onCellSave(e) {
    const t = this._editTarget(e);
    if (!t) return;
    const oldValue = cellValue(t.col, t.entry.row);
    const value = this._coerce(t.col, e.detail?.value, oldValue);
    const ok = this.emit('hui-cell-edit', {
      row: t.entry.row, key: t.col.key, value, oldValue, index: t.entry.index, waitUntil: e.detail?.waitUntil,
    }, { cancelable: true });
    if (!ok) e.preventDefault();
  }

  /** Lưu xong (kể cả promise của waitUntil) → ghi vào dòng, tính lại sắp xếp / lọc / dòng tổng */
  _onCellSaved(e) {
    const t = this._editTarget(e);
    if (!t || !t.col.path) return;
    setPath(t.entry.row, t.col.path, this._coerce(t.col, e.detail?.value, cellValue(t.col, t.entry.row)));
    this.requestUpdate('cellEdit');
  }

  /** Trạng thái động của dòng: đã chọn, đang mở, ARIA (treegrid / grid) */
  _syncRow(tr, entry, sel, flat) {
    // Cuộn ảo: aria-rowindex (tính cả hàng tiêu đề) để trình đọc màn hình biết vị trí thật
    if (this.virtual) tr.setAttribute('aria-rowindex', String((this._thead.hidden ? 0 : this._cols.depth) + flat + 1));
    else tr.removeAttribute('aria-rowindex');
    tr.dataset.flat = String(flat);
    // Kẻ sọc theo vị trí thật (không theo DOM) → không nháy khi cuộn ảo
    tr.classList.toggle('row--even', flat % 2 === 1);
    if (entry.kind === 'expand') return;
    const ks = String(entry.key);
    const selected = Boolean(this._selectionMode) && sel.has(ks);
    const selectable = this._canSelect(entry.row);
    tr.toggleAttribute('data-selected', selected);
    tr.toggleAttribute('data-expanded', entry.open);
    tr.setAttribute('part', ['row', selected ? 'row-selected' : '', entry.open ? 'row-expanded' : ''].filter(Boolean).join(' '));
    const ctl = tr.querySelector('[data-select]:is(hui-checkbox, hui-radio)');
    if (ctl) {
      if (ctl.checked !== selected) ctl.checked = selected;
      if (ctl.disabled !== !selectable) ctl.disabled = !selectable;
    }
    for (const btn of tr.querySelectorAll('button[data-toggle]')) {
      btn.setAttribute('aria-expanded', String(entry.open));
      btn.setAttribute('aria-label', tx(entry.open ? 'table.collapse' : 'table.expand'));
    }
    // ARIA theo chế độ
    if (this._isGrid && this._selectionMode) tr.setAttribute('aria-selected', String(selected));
    else tr.removeAttribute('aria-selected');
    if (this._hasTree) {
      tr.setAttribute('aria-level', String(entry.level + 1));
      tr.setAttribute('aria-setsize', String(entry.setsize));
      tr.setAttribute('aria-posinset', String(entry.index + 1));
      if (entry.hasKids) tr.setAttribute('aria-expanded', String(entry.open));
      else tr.removeAttribute('aria-expanded');
    } else {
      for (const a of ['aria-level', 'aria-setsize', 'aria-posinset', 'aria-expanded']) tr.removeAttribute(a);
    }
  }

  _slotName(key) {
    const ks = String(key);
    if (!this._keyIds.has(ks)) this._keyIds.set(ks, this._keyIds.size + 1);
    return `hui-table-expand-${this._keyIds.get(ks)}`;
  }

  _detailId(key) {
    return `${this._slotName(key)}-row`;
  }

  /** Nội dung dòng mở rộng nằm ở LIGHT DOM (slot vào ô) → CSS của trang áp dụng được */
  _syncExpandEls(entries) {
    const live = new Set();
    const tpl = this._expandTemplate();
    for (const entry of entries) {
      if (entry.kind !== 'expand') continue;
      live.add(entry.id);
      let rec = this._expandEls.get(entry.id);
      const fresh = !rec;
      if (!rec) {
        rec = { el: createElement('div', { slot: this._slotName(entry.key), className: 'hui-table-expand' }), row: null };
        this._expandEls.set(entry.id, rec);
      }
      if (rec.row !== entry.row) {
        rec.row = entry.row;
        let content = null;
        if (typeof this.expandRender === 'function') content = this.expandRender(entry.row, entry.index);
        else if (tpl) content = renderTemplate(tpl, entry.row, entry.index);
        rec.el.replaceChildren(content instanceof Node ? content : document.createTextNode(content === null || content === undefined ? '' : String(content)));
      }
      if (rec.el.parentNode !== this) this.append(rec.el);
      if (fresh && this._animOk()) {
        const tr = this._rendered.find((n) => n._entry === entry);
        if (tr?._inner) collapse(tr._inner, true);
      }
    }
    for (const [id, rec] of this._expandEls) {
      if (!live.has(id)) {
        rec.el.remove();
        this._expandEls.delete(id);
      }
    }
  }

  _animOk() {
    return !this.noAnimation && !animationsDisabled();
  }

  // ---------- trạng thái rỗng / tải / lỗi ----------

  _renderState(ds, hasRows) {
    this._stateRow.hidden = hasRows;
    if (hasRows) {
      this._stateEl._sig = '';
      return;
    }
    const sig = [ds, getLocaleName(), this.emptyText, ds === 'error' ? String(this.dataError?.message) : ''].join('|');
    if (this._stateEl._sig === sig) return;
    this._stateEl._sig = sig;
    if (ds === 'loading' || ds === 'error') {
      // hui-result tải động: renderStateView chỉ dùng thẻ đã định nghĩa → tải xong thì vẽ lại trạng thái lỗi
      if (ds === 'error' && !customElements.get('hui-result')) {
        ensureElement('hui-result').then(() => {
          if (this.dataState !== 'error') return;
          this._stateEl._sig = '';
          this._renderState('error', false);
        });
      }
      this.renderStateView(this._stateEl, { skeletonRows: 4 });
      const sk = this._stateEl.querySelector('hui-skeleton');
      sk?.setAttribute('part', 'skeleton');
    } else {
      const empty = createElement('hui-empty', {});
      if (this.emptyText) empty.setAttribute('description', this.emptyText);
      this._stateEl.replaceChildren(empty);
    }
    this._stateEl.hidden = false;
  }

  // ---------- dòng tổng ----------

  _renderSummary(view) {
    if (typeof this.summary !== 'function' || !this._all) {
      this._tfoot.hidden = true;
      this._tfoot.replaceChildren();
      return;
    }
    const out = this.summary(view.pageRows, view.all);
    const rows = Array.isArray(out) && out.length && (Array.isArray(out[0]) || (isPlain(out[0]) && !('colSpan' in out[0]) && !('value' in out[0])))
      ? out : out === null || out === undefined ? [] : [out];
    const leaves = this._cols.leaves;
    const trs = rows.map((r) => {
      const tr = createElement('tr', { className: 'summary-row', part: 'summary-row' });
      for (let p = 0; p < this._specials; p++) {
        const td = this._cellAttrs(createElement('td', { className: 'summary-cell', part: 'summary-cell' }));
        this._fixCell(td, this._all[p].fixed, p, p);
        tr.append(td);
      }
      // Mảng: các ô lần lượt (ô { colSpan } chiếm nhiều cột); object: theo key cột
      let item = 0;
      for (let i = 0; i < leaves.length;) {
        const col = leaves[i];
        let v = Array.isArray(r) ? r[item++] : r?.[col.key];
        let span = 1;
        if (isPlain(v) && ('value' in v || 'colSpan' in v)) {
          span = Math.max(1, Math.min(leaves.length - i, Number(v.colSpan) || 1));
          v = v.value;
        }
        const p = this._specials + i;
        const td = this._cellAttrs(createElement('td', { className: `summary-cell cell--${col.type}`, part: 'summary-cell' }));
        if (span > 1) td.colSpan = span;
        const align = alignOf(col);
        if (align !== 'left') td.style.textAlign = align;
        this._fixCell(td, this._all[p].fixed, p, p + span - 1);
        if (v instanceof Node) td.append(v);
        else if (v !== null && v !== undefined && v !== '') {
          td.textContent = typeof v === 'number' && ['number', 'currency', 'percent'].includes(col.type) ? formatCell(col, v) : String(v);
        }
        tr.append(td);
        i += span;
      }
      return tr;
    });
    this._tfoot.replaceChildren(...trs);
    this._tfoot.hidden = trs.length === 0;
    if (this._isGrid) this._demote(this._tfoot);
  }

  // ---------- phân trang ----------

  _renderPager(view, ds, hasRows) {
    const show = this._paged && view.total > 0 && (hasRows || ds === 'loading');
    this._footer.hidden = !show;
    if (!show) return;
    const props = this.paginationProps;
    if (props && props !== this._pagerPropsApplied) {
      this._pagerPropsApplied = props;
      Object.assign(this._pager, props);
    }
    this._pager.total = view.total;
    this._pager.pageSize = this._pageSize();
    this._pager.current = view.page;
  }

  _onPager({ current, pageSize }) {
    const size = Number(pageSize) || this._pageSize();
    const page = Math.max(1, Number(current) || 1);
    if (size === this._pageSize() && page === this.page) return;
    this.pageSize = size;
    this.page = page;
    this._emitChange('paginate');
    // Trang mới → cuộn về đầu bảng (khung cuộn trong + trang khi tiêu đề bảng đã trôi khỏi màn hình)
    this._scroller.scrollTop = 0;
    if (this.getBoundingClientRect().top < 0) this.scrollIntoView({ block: 'start', behavior: this._animOk() ? 'smooth' : 'auto' });
  }

  // =====================================================
  // BỐ CỤC: cột cố định, tiêu đề dính nhiều hàng, bóng khi cuộn ngang
  // =====================================================

  _scheduleLayout() {
    if (this._layoutFrame || !this.isConnected) return;
    this._layoutFrame = requestAnimationFrame(() => {
      this._layoutFrame = 0;
      this._layout();
    });
  }

  _layout() {
    if (!this._all) return;
    const ths = this._leafThs;
    const widths = this._all.map((c, i) => ths[i]?.getBoundingClientRect().width || 0);
    const style = this._table.style;
    // role="separator" focus được bắt buộc có aria-valuenow → độ rộng hiện tại (px)
    this._all.forEach((c, i) => {
      const handle = c.kind === 'data' && widths[i] ? ths[i]?.querySelector(':scope > .resizer') : null;
      if (handle) handle.setAttribute('aria-valuenow', String(Math.round(widths[i])));
    });
    if (this._hasFixed) {
      let acc = 0;
      this._all.forEach((c, i) => {
        if (c.fixed === 'left') style.setProperty(`--_table-l${i}`, `${acc}px`);
        acc += widths[i];
      });
      acc = 0;
      for (let i = this._all.length - 1; i >= 0; i--) {
        if (this._all[i].fixed === 'right') style.setProperty(`--_table-r${i}`, `${acc}px`);
        acc += widths[i];
      }
    }
    if (this._cols.depth > 1) {
      let top = 0;
      [...this._thead.rows].forEach((tr, r) => {
        style.setProperty(`--_table-top${r}`, `${top}px`);
        top += tr.getBoundingClientRect().height;
      });
    }
    style.setProperty('--_table-view-w', `${this._scroller.clientWidth}px`);
    this._updatePing();
  }

  _schedulePing() {
    if (this._pingFrame) return;
    this._pingFrame = requestAnimationFrame(() => {
      this._pingFrame = 0;
      this._updatePing();
    });
  }

  _updatePing() {
    const sc = this._scroller;
    const left = Math.abs(sc.scrollLeft);
    const max = sc.scrollWidth - sc.clientWidth;
    this._base.classList.toggle('ping-start', left > 0.5);
    this._base.classList.toggle('ping-end', max > 0.5 && left < max - 0.5);
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  _entryOf(node) {
    const tr = node?.closest?.('tr');
    return tr?._entry || null;
  }

  _onHeadClick(e) {
    const btn = e.target.closest?.('button[data-sort]');
    if (!btn) return;
    const th = btn.closest('th');
    this._sortByHeader(th._col, e.shiftKey || this._kbdShift);
    this._kbdShift = false;
  }

  /** Bấm tiêu đề: chưa sắp xếp → hướng 1 → hướng 2 → bỏ (theo sortDirections); Shift = thêm cột (sort-multiple) */
  _sortByHeader(col, multi) {
    if (!col?.sorter) return;
    const cur = this._sorters.find((s) => s.key === col.key);
    const dirs = col.sortDirections.length ? col.sortDirections : ['asc', 'desc'];
    const next = cur ? dirs[dirs.indexOf(cur.order) + 1] ?? null : dirs[0];
    this.sortBy(col.key, next, multi);
  }

  _onBodyClick(e) {
    const path = e.composedPath();
    const tr = path.find((n) => n instanceof HTMLTableRowElement && n._entry);
    if (!tr || tr._entry.kind !== 'row') return;
    const entry = tr._entry;
    const toggle = e.target.closest?.('button[data-toggle]');
    if (toggle) {
      this.toggleExpand(entry.key);
      return;
    }
    const radio = e.target.closest?.('hui-radio[data-select]');
    if (radio) {
      if (!radio.disabled) this._toggleSelect(entry, true);
      return;
    }
    const action = e.target.closest?.('button[data-action]');
    if (action) {
      this.emit('hui-action', { action: action.dataset.action, row: entry.row, item: entry.row, index: entry.index, key: entry.key, originalEvent: e });
      return;
    }
    // Click lên control bên trong ô (checkbox, link, nút trong render()) → không tính là bấm dòng
    const own = path.slice(0, path.indexOf(tr));
    if (own.some((n) => n instanceof Element && n.matches(INTERACTIVE))) return;
    this.emit('hui-row-click', { row: entry.row, index: entry.index, key: entry.key, originalEvent: e });
  }

  _toggleSelect(entry, on) {
    if (!entry || entry.kind !== 'row' || !this._canSelect(entry.row)) return;
    const ks = String(entry.key);
    if (this._selectionMode === 'radio') {
      if (this._selectedSet().has(ks) && on) return;
      this._setSelection(on ? [entry.key] : []);
      return;
    }
    const map = new Map((this.selectedKeys || []).map((k) => [String(k), k]));
    if (on) map.set(ks, entry.key);
    else map.delete(ks);
    this._setSelection([...map.values()]);
  }

  /** Dòng thuộc phạm vi "chọn tất cả": trang hiện tại / mọi dòng sau lọc (gồm dòng con của cây) */
  _scopeRows() {
    const out = [];
    const kids = this._view.kids;
    const walk = (list) => list.forEach((row) => {
      out.push(row);
      const k = kids.get(row);
      if (k && k.length) walk(k);
    });
    walk(this.selectAll === 'all' && !this.server ? this._view.all : this._view.pageRows);
    return out;
  }

  _onSelectAll(on) {
    if (this._selectionMode !== 'checkbox') return;
    const map = new Map((this.selectedKeys || []).map((k) => [String(k), k]));
    for (const row of this._scopeRows()) {
      if (!this._canSelect(row)) continue;
      const key = this._key(row);
      if (on) map.set(String(key), key);
      else map.delete(String(key));
    }
    this._setSelection([...map.values()]);
  }

  _syncSelectAll() {
    const cb = this._selectAllEl;
    if (!cb || !cb.isConnected) return;
    const sel = this._selectedSet();
    const rows = this._scopeRows().filter((r) => this._canSelect(r));
    const n = rows.filter((r) => sel.has(String(this._key(r)))).length;
    const all = n > 0 && n === rows.length;
    if (cb.checked !== all) cb.checked = all;
    const ind = n > 0 && n < rows.length;
    if (cb.indeterminate !== ind) cb.indeterminate = ind;
    cb.disabled = rows.length === 0;
  }

  _setSelection(keys) {
    this.selectedKeys = keys;
    this.emit('hui-selection-change', { keys: [...keys], rows: this.selectedRows });
  }

  // =====================================================
  // BÀN PHÍM
  // =====================================================

  _onKeydown(e) {
    if (e.key === 'Shift') {
      this._kbdShift = true;
      return;
    }
    // Shift + Enter / Space trên nút sắp xếp → sắp xếp nhiều cột
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('button[data-sort]')) {
      this._kbdShift = e.shiftKey;
    }
    // Radio chọn dòng (hui-radio đứng riêng không tự xử lý phím)
    const radio = e.target.closest?.('hui-radio[data-select]');
    if (radio && (e.key === ' ' || e.key === 'Enter') && e.target === radio) {
      e.preventDefault();
      if (!radio.disabled) this._toggleSelect(this._entryOf(radio), true);
      return;
    }
    if (this._isGrid) this._gridKey(e);
  }

  /** Ô (td / th) chứa phần tử đang focus */
  _cellOf(node) {
    const cell = node?.closest?.('td, th');
    return cell && this._table.contains(cell) && cell.closest('table') === this._table ? cell : null;
  }

  _onFocusIn(e) {
    if (!this._isGrid) return;
    const cell = this._cellOf(e.target);
    if (cell && !cell.closest('.state-row, .spacer') && !e.target.closest?.('.filter-panel')) this._setActive(cell);
  }

  /** Roving tabindex: chỉ 1 ô của lưới nằm trong thứ tự Tab */
  _setActive(cell) {
    if (this._active === cell) return;
    if (this._active?.isConnected) this._active.tabIndex = -1;
    this._active = cell;
    cell.tabIndex = 0;
  }

  _ensureActive() {
    if (this._active?.isConnected && this._table.contains(this._active)) {
      this._active.tabIndex = 0;
      return;
    }
    this._active = null;
    const first = this._headGrid[0]?.[0] || this._rendered[0]?.cells[0];
    if (first) this._setActive(first);
  }

  /**
   * Chế độ grid: hạ control trong ô sau khi chúng dựng xong shadow DOM (input của hui-checkbox chỉ có sau khi gắn vào trang;
   * hui-radio đứng riêng tự đặt lại tabIndex = 0 mỗi lần cập nhật) → gom 1 microtask cho cả bảng.
   */
  _scheduleDemote() {
    if (this._demotePending) return;
    this._demotePending = true;
    queueMicrotask(() => {
      this._demotePending = false;
      if (this._isGrid) this._demote(this._table);
    });
  }

  /** Hạ mọi control trong vùng xuống tabindex -1 (chế độ grid: Tab chỉ dừng ở ô đang chọn) */
  _demote(root) {
    if (!root) return;
    for (const el of root.querySelectorAll(FOCUSABLE)) {
      if (el.matches('td, th') || el.closest('.filter-panel')) continue;
      el.tabIndex = -1;
      // input / button thật bên trong shadow root của hui-checkbox, hui-input…
      for (const inner of el.shadowRoot?.querySelectorAll('input, button, a[href], [tabindex]') || []) inner.tabIndex = -1;
    }
  }

  /** Số hàng điều hướng: tiêu đề + dòng thân + dòng tổng */
  _navCounts() {
    const head = this._thead.hidden ? 0 : this._cols.depth;
    return { head, body: this._view.entries.length, foot: this._tfoot.hidden ? 0 : this._tfoot.rows.length };
  }

  /** Thẻ <tr> của dòng thân thứ `flat` (cuộn ảo: cuộn tới để dòng được vẽ) */
  _rowEl(flat) {
    let tr = this._rendered[flat - this._rowStart];
    if (tr && Number(tr.dataset.flat) === flat) return tr;
    if (this._vw) {
      this._vw.scrollToIndex(flat, flat > this._rowStart ? 'end' : 'start');
      tr = this._rendered[flat - this._rowStart];
    }
    return tr || null;
  }

  _rowIndexOf(cell) {
    const tr = cell.parentElement;
    const { head, body } = this._navCounts();
    if (tr.parentElement === this._thead) return [...this._thead.rows].indexOf(tr);
    if (tr.parentElement === this._tfoot) return head + body + [...this._tfoot.rows].indexOf(tr);
    return head + Number(tr.dataset.flat || 0);
  }

  _colOf(cell) {
    if (cell.dataset.col !== undefined && cell.tagName === 'TH') return Number(cell.dataset.col);
    let c = 0;
    for (let n = cell.previousElementSibling; n; n = n.previousElementSibling) c += n.colSpan || 1;
    return c;
  }

  _cellAt(r, c) {
    const { head, body } = this._navCounts();
    if (r < head) return this._headGrid[r]?.[c] || null;
    const tr = r < head + body ? this._rowEl(r - head) : this._tfoot.rows[r - head - body];
    if (!tr) return null;
    let acc = 0;
    for (const cell of tr.cells) {
      acc += cell.colSpan || 1;
      if (c < acc) return cell;
    }
    return tr.cells[tr.cells.length - 1] || null;
  }

  _focusCell(cell) {
    if (!cell) return;
    this._setActive(cell);
    cell.focus();
  }

  _gridKey(e) {
    if (e.target.closest?.('.filter-panel')) return; // phím trong bộ lọc do popover / control tự xử lý
    const cell = this._cellOf(e.target);
    if (!cell || cell.closest('.state-row, .spacer')) return;
    // Đang ở control bên trong ô: Esc → về ô; phím khác để control tự xử lý
    if (e.target !== cell) {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        this._focusCell(cell);
      }
      return;
    }
    const { head, body, foot } = this._navCounts();
    const total = head + body + foot;
    const r = this._rowIndexOf(cell);
    const c = this._colOf(cell);
    const lastCol = this._all.length - 1;
    const entry = cell.parentElement._entry;
    const isBody = r >= head && r < head + body;
    const move = (nr, nc) => {
      const rr = clamp(nr, 0, total - 1);
      const cc = clamp(nc, 0, lastCol);
      const target = this._cellAt(rr, cc);
      if (target) this._focusCell(target);
    };
    const toggleTree = isBody && cell.dataset.tree !== undefined && entry?.hasKids;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        if (toggleTree && !entry.open) this.toggleExpand(entry.key, true);
        else move(r, c + (cell.colSpan || 1));
        return;
      case 'ArrowLeft':
        e.preventDefault();
        if (toggleTree && entry.open) {
          this.toggleExpand(entry.key, false);
        } else if (isBody && cell.dataset.tree !== undefined && entry?.parentKey !== null && entry?.parentKey !== undefined) {
          const pi = this._view.entries.findIndex((x) => x.kind === 'row' && String(x.key) === String(entry.parentKey));
          if (pi >= 0) move(head + pi, c);
        } else {
          move(r, c - 1);
        }
        return;
      case 'ArrowDown':
        e.preventDefault();
        move(r + (cell.rowSpan || 1), c);
        return;
      case 'ArrowUp':
        e.preventDefault();
        move(r - 1, c);
        return;
      case 'Home':
        e.preventDefault();
        move(e.ctrlKey ? 0 : r, 0);
        return;
      case 'End':
        e.preventDefault();
        move(e.ctrlKey ? total - 1 : r, lastCol);
        return;
      case 'PageDown':
        e.preventDefault();
        move(r < head ? head + 9 : Math.min(r + 10, head + body - 1), c);
        return;
      case 'PageUp':
        e.preventDefault();
        move(r < head ? r : Math.max(r - 10, head), c);
        return;
      case ' ':
      case 'Enter': {
        if (cell.dataset.selectAll !== undefined) {
          e.preventDefault();
          this._onSelectAll(!this._selectAllEl?.checked);
          return;
        }
        if (isBody && cell.dataset.select !== undefined) {
          e.preventDefault();
          const on = !this._selectedSet().has(String(entry.key));
          this._toggleSelect(entry, this._selectionMode === 'radio' ? true : on);
          return;
        }
        if (e.key === ' ') return;
        if (cell.tagName === 'TH' && cell._col?.sorter) {
          e.preventDefault();
          this._sortByHeader(cell._col, e.shiftKey);
          return;
        }
        if (isBody && (cell.dataset.expand !== undefined || toggleTree)) {
          e.preventDefault();
          this.toggleExpand(entry.key);
          return;
        }
        this._enterCell(e, cell, entry, isBody);
        return;
      }
      case 'F2':
        this._enterCell(e, cell, entry, false);
        return;
      default:
        // Alt + ↓ trên tiêu đề có bộ lọc → mở bộ lọc
        if (e.altKey && e.key === 'ArrowDown') {
          const fb = cell.querySelector('button[data-filter]');
          if (fb) {
            e.preventDefault();
            fb.click();
          }
        }
    }
  }

  /** Enter / F2: vào control đầu tiên trong ô (Esc để ra); ô không có control → hui-row-click */
  _enterCell(e, cell, entry, emitRow) {
    const inner = [...cell.querySelectorAll(FOCUSABLE)].find((el) => !el.disabled && !el.closest('[hidden]'));
    if (inner) {
      e.preventDefault();
      this._focusInside(inner);
    } else if (emitRow && entry?.kind === 'row') {
      e.preventDefault();
      this.emit('hui-row-click', { row: entry.row, index: entry.index, key: entry.key, originalEvent: e });
    }
  }
}

defineElement('hui-table', HuiTable);

export { HuiTable };
export default HuiTable;
