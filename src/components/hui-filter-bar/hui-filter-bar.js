/**
 * HUI Filter Bar — Thanh lọc tổng hợp: hui-search + hui-filter-chips + control tùy ý (hui-select, hui-input…)
 * đặt vào slot. Gom giá trị mọi control có `name` thành object `params`, phát `hui-filter-change` (debounce),
 * `for="id"` → tự đẩy params sang component dữ liệu (hui-data-view: updateQuery; DataController khác: params).
 * Màn hình hẹp (≤ collapse-width) → control phụ gom vào drawer "Bộ lọc" kèm số bộ lọc đang bật.
 */

import styles from './hui-filter-bar.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-search/hui-search.js';
import '../hui-filter-chips/hui-filter-chips.js';
import '../hui-button/hui-button.js';
import '../hui-drawer/hui-drawer.js';

const FALLBACK = {
  'filterBar.filters': { vi: 'Bộ lọc', en: 'Filters' },
  'filterBar.reset': { vi: 'Đặt lại', en: 'Reset' },
  'filterBar.apply': { vi: 'Xem kết quả', en: 'Show results' },
  'filterBar.searchPlaceholder': { vi: 'Tìm kiếm...', en: 'Search...' },
  'filterBar.active': { vi: '{count} bộ lọc đang bật', en: '{count} active filters' },
};
const msg = (key, vars) => {
  let v = t(key, vars);
  if (v !== key) return v;
  v = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : v;
};

const isEmptyValue = (v) => v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && v.length === 0);

/** Sự kiện của control nội bộ (search, chips) không lọt ra ngoài host */
const INTERNAL_EVENTS = ['input', 'change', 'hui-change', 'hui-search', 'hui-select', 'clear'];

/** Ô tích / radio native, hoặc custom element có `checked` (hui-checkbox, hui-switch) */
function isCheckable(el) {
  if (el instanceof HTMLInputElement) return el.type === 'checkbox' || el.type === 'radio';
  return el.localName.includes('-') && typeof el.checked === 'boolean';
}

/**
 * Thanh lọc.
 * @fires hui-filter-change - Bộ lọc đổi (đã debounce). detail: { params, count }
 * @fires hui-reset - Bấm "Đặt lại"
 * @slot - Control lọc thêm, mỗi control cần attribute `name` (hui-select, hui-input, hui-checkbox, select…)
 * @slot actions - Nút / nội dung bên phải thanh (luôn hiển thị)
 * @csspart base - Khung ngoài
 * @csspart row - Hàng search + control + nút
 * @csspart search - <hui-search>
 * @csspart filters - Vùng chứa control trong slot (màn hình rộng)
 * @csspart toggle - Nút "Bộ lọc" (màn hình hẹp)
 * @csspart count - Số bộ lọc đang bật (trên nút "Bộ lọc")
 * @csspart reset - Nút "Đặt lại"
 * @csspart chips - <hui-filter-chips>
 * @csspart drawer - <hui-drawer> chứa control khi màn hình hẹp
 * @cssprop --hui-filter-bar-gap - Khoảng cách giữa các phần tử
 * @cssprop --hui-filter-bar-search-width - Bề rộng ô tìm (màn hình rộng)
 * @cssprop --hui-filter-bar-bg - Nền thanh
 * @cssprop --hui-filter-bar-padding - Đệm thanh
 * @cssprop --hui-filter-bar-radius - Bo góc thanh
 * @cssprop --hui-filter-bar-count-bg - Nền số đếm
 * @cssprop --hui-filter-bar-count-color - Màu số đếm
 */
class HuiFilterBar extends HuiElement {
  static localized = true;

  static properties = {
    /** id của component dữ liệu (hui-data-view, hui-card-grid…) nhận params tự động */
    for: { type: String, default: '' },
    /** Giá trị lọc hiện tại { q, category, … } — gán để đặt sẵn bộ lọc (vd đọc từ URL) */
    params: { type: Object, default: null },
    /** Trì hoãn (ms) trước khi phát hui-filter-change khi gõ */
    debounce: { type: Number, default: 300 },
    /** Tên key của ô tìm trong params */
    searchName: { type: String, default: 'q' },
    /** Chữ gợi ý ô tìm */
    searchPlaceholder: { type: String, default: '' },
    /** Ẩn ô tìm */
    noSearch: { type: Boolean },
    /** Option cho hàng chip lọc nhanh [{ value, label, count, icon }] — gán bằng property */
    chips: { type: Array, default: [] },
    /** Tên key của hàng chip trong params */
    chipsName: { type: String, default: 'tag' },
    /** Hàng chip chọn nhiều */
    chipsMultiple: { type: Boolean },
    /** Chữ chip "Tất cả" đầu hàng (bỏ trống = không có) */
    chipsAllLabel: { type: String, default: '' },
    /** Bề rộng (px) trở xuống thì gom control phụ vào drawer */
    collapseWidth: { type: Number, default: 640 },
    /** Ẩn nút "Đặt lại" */
    noReset: { type: Boolean },
    /** sm | md | lg — kích thước các control nội bộ */
    size: { type: String, default: 'md' },
  };

  static styles = styles;

  constructor() {
    super();
    this._ownParams = null;
    this._lastSig = null;
    this._timer = 0;
    this._narrow = false;
    this._targetBase = null;
    this._targetEl = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._internals && 'role' in this._internals) this._internals.role = 'search';
    if (typeof ResizeObserver === 'function') {
      this._ro ||= new ResizeObserver(() => this._syncNarrow());
      this._ro.observe(this);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    clearTimeout(this._timer);
  }

  render() {
    this._search = createElement('hui-search', { part: 'search', className: 'fb__search', debounce: '0' });
    this._search.addEventListener('hui-search', (e) => this._schedule(e.detail?.trigger !== 'input'));

    this._extraSlot = createElement('slot');
    this._extraSlot.addEventListener('slotchange', () => {
      this._syncNarrow();
      this._syncExtraVisibility();
    });
    // Sự kiện của control trong slot đi qua <slot> → gom ở đây (không lẫn sự kiện nội bộ)
    this._extraSlot.addEventListener('change', () => this._schedule(true));
    this._extraSlot.addEventListener('input', (e) => {
      // Control chọn (select, checkbox…) phát input ngay trước change → để change xử lý
      if (isCheckable(e.target) || e.target.localName === 'hui-select' || e.target instanceof HTMLSelectElement) return;
      this._schedule(false);
    });
    this._filters = createElement('div', { className: 'fb__filters', part: 'filters' }, this._extraSlot);

    this._count = createElement('span', { className: 'fb__count', part: 'count', hidden: true });
    this._toggleLabel = createElement('span');
    this._toggle = createElement('hui-button', { variant: 'outline', icon: 'filter', part: 'toggle', className: 'fb__toggle', hidden: true },
      this._toggleLabel, this._count);
    this._toggle.addEventListener('click', () => {
      this._drawer.open = true;
    });

    this._reset = createElement('hui-button', { variant: 'text', part: 'reset', className: 'fb__reset', hidden: true });
    this._reset.addEventListener('click', () => this.reset());

    this._actions = createElement('slot', { name: 'actions' });
    this._row = createElement('div', { className: 'fb__row', part: 'row' },
      this._search, this._filters, this._toggle, this._reset, this._actions);

    this._chips = createElement('hui-filter-chips', { part: 'chips', className: 'fb__chips', hidden: true });
    this._chips.addEventListener('change', () => this._schedule(true));

    // Drawer cho màn hình hẹp: slot control được chuyển vào đây
    this._drawerBody = createElement('div', { className: 'fb__drawer-body' });
    this._drawerReset = createElement('hui-button', { variant: 'outline' });
    this._drawerReset.addEventListener('click', () => this.reset());
    this._drawerApply = createElement('hui-button', { variant: 'primary' });
    this._drawerApply.addEventListener('click', () => {
      this._commit();
      this._drawer.open = false;
    });
    this._drawerFooter = createElement('div', { slot: 'footer', className: 'fb__drawer-footer' }, this._drawerReset, this._drawerApply);
    this._drawer = createElement('hui-drawer', { part: 'drawer', placement: 'bottom' }, this._drawerBody, this._drawerFooter);

    for (const el of [this._search, this._chips]) {
      for (const type of INTERNAL_EVENTS) el.addEventListener(type, (e) => e.stopPropagation());
    }
    // Sự kiện mở/đóng của drawer nội bộ cũng không lọt ra ngoài
    for (const type of ['hui-open', 'hui-close', 'hui-after-close', 'hui-cancel']) {
      this._drawer.addEventListener(type, (e) => e.stopPropagation());
    }

    this._base = createElement('div', { className: 'fb', part: 'base' }, this._row, this._chips, this._drawer);
    return this._base;
  }

  updated(changed) {
    if (changed.has('noSearch')) this._search.hidden = this.noSearch;
    if (changed.has('searchPlaceholder') || changed.has('locale')) {
      this._search.setAttribute('placeholder', this.searchPlaceholder || msg('filterBar.searchPlaceholder'));
    }
    if (changed.has('size')) {
      for (const el of [this._search, this._chips, this._toggle, this._reset]) el.setAttribute('size', this.size || 'md');
    }
    if (changed.has('chips') || changed.has('chipsMultiple') || changed.has('chipsAllLabel')) {
      const list = Array.isArray(this.chips) ? this.chips : [];
      this._chips.options = list;
      this._chips.multiple = this.chipsMultiple;
      this._chips.allLabel = this.chipsAllLabel;
      this._chips.hidden = !list.length;
    }
    if (changed.has('locale')) {
      this._toggleLabel.textContent = msg('filterBar.filters');
      this._reset.textContent = msg('filterBar.reset');
      this._drawerReset.textContent = msg('filterBar.reset');
      this._drawerApply.textContent = msg('filterBar.apply');
      this._drawer.setAttribute('title', msg('filterBar.filters'));
    }
    // params gán từ ngoài (không phải do thanh tự ghi) → đổ ngược vào control + đẩy sang component đích
    if (changed.has('params') && this.params !== this._ownParams) {
      const p = this.params && typeof this.params === 'object' ? this.params : {};
      queueMicrotask(() => {
        this._applyToControls(p);
        this._lastSig = JSON.stringify(this._collect());
        this._syncIndicators(this._collect());
        if (this.params) this._pushToTarget(this._collect());
      });
    }
    if (changed.has('collapseWidth')) this._syncNarrow();
    // Đổi đích SAU lần vẽ đầu → đẩy bộ lọc hiện tại sang đích mới
    if (changed.has('for') && this._ready) {
      this._targetBase = null;
      this._pushToTarget(this._collect());
    }
  }

  firstUpdated() {
    this._ready = true;
    this._syncExtraVisibility();
    this._syncIndicators(this._collect());
  }

  // =====================================================
  // ĐỌC / GHI GIÁ TRỊ
  // =====================================================

  /** Control có name trong slot (kể cả lồng trong thẻ bọc như hui-form-item) */
  _controls() {
    const out = [];
    for (const el of this._extraSlot.assignedElements({ flatten: true })) {
      if (el.hasAttribute('name')) out.push(el);
      out.push(...el.querySelectorAll('[name]'));
    }
    return out;
  }

  _read(el) {
    if (isCheckable(el)) {
      if (!el.checked) return undefined;
      const v = el.getAttribute('value');
      return v === null || v === '' || v === 'on' ? true : v;
    }
    const v = el.value;
    return Array.isArray(v) ? [...v] : v;
  }

  /** Gom giá trị mọi control → params (bỏ key rỗng) */
  _collect() {
    const p = {};
    if (!this.noSearch) {
      const q = String(this._search.value ?? '').trim();
      if (q) p[this.searchName] = q;
    }
    if (Array.isArray(this.chips) && this.chips.length) {
      const v = this._chips.value;
      if (!isEmptyValue(v)) p[this.chipsName] = Array.isArray(v) ? [...v] : v;
    }
    for (const el of this._controls()) {
      const name = el.getAttribute('name');
      if (!name || name in p) continue;
      const v = this._read(el);
      if (!isEmptyValue(v)) p[name] = v;
    }
    return p;
  }

  _applyToControls(p) {
    if (!this.noSearch) this._search.value = p[this.searchName] == null ? '' : String(p[this.searchName]);
    if (Array.isArray(this.chips) && this.chips.length) {
      const v = p[this.chipsName];
      this._chips.value = v == null ? (this.chipsMultiple ? [] : '') : v;
    }
    for (const el of this._controls()) {
      const name = el.getAttribute('name');
      const v = p[name];
      if (isCheckable(el)) {
        const own = el.getAttribute('value');
        el.checked = v === true || (v != null && (String(v) === own || (Array.isArray(v) && v.map(String).includes(own))));
      } else if (v == null) {
        this._clearControl(el);
      } else {
        el.value = v;
      }
    }
  }

  _clearControl(el) {
    if (isCheckable(el)) {
      el.checked = false;
    } else if (el instanceof HTMLSelectElement) {
      el.value = '';
      if (el.selectedIndex === -1 && !el.multiple && el.options.length) el.selectedIndex = 0;
    } else if (Array.isArray(el.value)) {
      el.value = [];
    } else if (el.localName === 'hui-select') {
      el.value = null;
    } else {
      el.value = '';
    }
  }

  // =====================================================
  // CHỐT THAY ĐỔI
  // =====================================================

  /** immediate: chọn chip / select / Enter → chốt ngay; gõ chữ → đợi debounce */
  _schedule(immediate) {
    clearTimeout(this._timer);
    if (immediate || !(this.debounce > 0)) this._commit();
    else this._timer = setTimeout(() => this._commit(), this.debounce);
  }

  _commit() {
    clearTimeout(this._timer);
    const p = this._collect();
    const sig = JSON.stringify(p);
    this._syncIndicators(p);
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    this._ownParams = p;
    this.params = p;
    const count = this._activeCount(p);
    this.emit('hui-filter-change', { params: { ...p }, count });
    this._pushToTarget(p);
  }

  /** Số bộ lọc đang bật (không tính ô tìm) */
  _activeCount(p) {
    return Object.keys(p).filter((k) => k !== this.searchName).length;
  }

  /** Bỏ mọi bộ lọc + từ khóa, phát hui-filter-change ngay */
  reset() {
    this._applyToControls({});
    this.emit('hui-reset');
    this._commit();
  }

  /** Chốt ngay (bỏ qua debounce) — trả về params */
  apply() {
    this._commit();
    return { ...(this.params || {}) };
  }

  _pushToTarget(p) {
    if (!this.for || !this.isConnected) return;
    const root = this.getRootNode();
    const target = root.getElementById?.(this.for) || document.getElementById(this.for);
    if (!target) return;

    // hui-data-view: đi qua updateQuery → chạy cả lọc client lẫn server, tự về trang 1
    if (typeof target.updateQuery === 'function') {
      const filters = {};
      for (const [k, v] of Object.entries(p)) if (k !== this.searchName) filters[k] = v;
      target.updateQuery({ q: p[this.searchName] ?? '', filters });
      return;
    }
    // DataController khác: params = params gốc của đích (trừ các key thanh quản lý) + params lọc
    if (this._targetEl !== target || !this._targetBase) {
      this._targetEl = target;
      this._targetBase = { ...(target.params || {}) };
    }
    const managed = new Set([this.searchName, this.chipsName, ...this._controls().map((el) => el.getAttribute('name'))]);
    const base = Object.fromEntries(Object.entries(this._targetBase).filter(([k]) => !managed.has(k)));
    target.params = { ...base, ...p };
  }

  // =====================================================
  // HIỂN THỊ
  // =====================================================

  _syncIndicators(p) {
    const count = this._activeCount(p);
    const any = Object.keys(p).length > 0;
    this._count.textContent = String(count);
    this._count.hidden = count === 0;
    this._toggle.setAttribute('aria-label', count ? `${msg('filterBar.filters')} — ${msg('filterBar.active', { count })}` : msg('filterBar.filters'));
    this._reset.hidden = this.noReset || !any;
    this.setState('active', any);
  }

  _syncExtraVisibility() {
    const has = this._extraSlot.assignedElements().length > 0;
    this._filters.hidden = !has || this._narrow;
    this._toggle.hidden = !has || !this._narrow;
  }

  /** Hẹp → chuyển slot control vào drawer; rộng → đưa về hàng ngang */
  _syncNarrow() {
    if (!this._base) return;
    const width = this.getBoundingClientRect().width;
    const narrow = width > 0 && width <= (this.collapseWidth || 0);
    if (narrow !== this._narrow) {
      this._narrow = narrow;
      (narrow ? this._drawerBody : this._filters).append(this._extraSlot);
      if (!narrow) this._drawer.open = false;
      this._base.classList.toggle('fb--narrow', narrow);
      this.setState('narrow', narrow);
    }
    this._syncExtraVisibility();
  }
}

defineElement('hui-filter-bar', HuiFilterBar);

export default HuiFilterBar;
