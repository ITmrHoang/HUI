/**
 * HUI KPI Row — Dải ô chỉ số KPI dựng từ <hui-stat-card> (Organism)
 * Dữ liệu: `data` / `src` / `fetchFn` (DataController) → mỗi item một hui-stat-card (render vào light DOM),
 * hoặc đặt sẵn <hui-stat-card> làm con trực tiếp. Lưới auto-fit theo `min-width`, `columns` = số cột tối đa;
 * `scroll` → màn hình hẹp (< 576px) thành hàng cuộn ngang có snap.
 */

import styles from './hui-kpi-row.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { DataController } from '../../core/data-controller.js';
import { getPath } from '../../core/template.js';
import { Repeater } from '../../core/repeat.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { runAnimation } from '../../utils/animate.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import '../hui-stat-card/index.js';
import '../hui-empty/index.js';
import '../hui-result/index.js';
import '../hui-button/index.js';

/** Chuỗi dự phòng khi locale.js chưa có key kpiRow.* */
const FALLBACK = {
  vi: { 'kpiRow.label': 'Chỉ số chính' },
  en: { 'kpiRow.label': 'Key metrics' },
};

function tx(key) {
  const v = t(key);
  if (v !== key) return v;
  return (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

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

/** Trường của item → property của hui-stat-card */
const ITEM_FIELDS = ['title', 'value', 'prefix', 'suffix', 'precision', 'delta', 'deltaLabel', 'invertDelta', 'icon', 'color', 'trend', 'href', 'target'];
/** Property của kpi-row chuyển xuống mọi ô (item có thể ghi đè variant / effect / size) */
const PASS = { variant: 'variant', effect: 'effect', size: 'size' };
const SKIP_TAGS = new Set(['template', 'style', 'script', 'link', 'meta']);
const NARROW = '(max-width: 575.98px)';

/** Thuộc tính do kpi-row tự gắn lên ô: tile → { attr: giá trị đã gắn } (không đè giá trị người dùng đặt) */
const owned = new WeakMap();
function applyOwned(el, attr, value) {
  let map = owned.get(el);
  if (!map) owned.set(el, (map = {}));
  const current = el.getAttribute(attr);
  const mine = attr in map && map[attr] === current;
  if (current !== null && !mine) return; // người dùng đã đặt → giữ nguyên
  if (value === null || value === undefined || value === false) {
    if (mine) el.removeAttribute(attr);
    delete map[attr];
  } else {
    const v = value === true ? '' : String(value);
    if (current !== v) el.setAttribute(attr, v);
    map[attr] = v;
  }
}

/**
 * Dải KPI. `clickable` → mỗi ô là nút (Enter / Space), bấm phát `hui-select`; `active-key` tô ô đang chọn.
 *
 * @fires hui-select - Bấm ô (clickable). detail: { key, item, tile }
 * @fires hui-load - (DataController) tải xong src / fetchFn. detail: { data, total }
 * @fires hui-error - (DataController) tải lỗi. detail: { error }
 * @slot - Các <hui-stat-card> đặt sẵn (khi không dùng data)
 * @csspart base - Khung ngoài
 * @csspart row - Lưới / hàng chứa ô (role="list", hoặc "group" khi clickable)
 * @csspart skeleton - Hàng ô skeleton khi đang tải
 * @csspart state - Vùng empty / error
 * @cssprop --hui-kpi-row-gap - Khoảng cách giữa ô khi không có attribute gap (mặc định --hui-space-lg)
 * @cssprop --hui-kpi-row-min-width - Bề rộng tối thiểu mỗi ô khi không có attribute min-width (200px)
 * @cssprop --hui-kpi-row-scroll-item-width - Bề rộng ô ở chế độ cuộn ngang trên màn hình hẹp (mặc định 80%)
 * @cssprop --hui-kpi-row-active-color - Màu viền ô đang chọn (mặc định --hui-primary)
 * @cssprop --hui-kpi-row-focus-color - Màu viền focus của ô clickable
 * @cssprop --hui-kpi-row-radius - Bo góc vòng focus / chọn (mặc định --hui-radius-lg)
 */
class HuiKpiRow extends DataController(HuiElement) {
  static properties = {
    /** Bề rộng tối thiểu mỗi ô trước khi xuống dòng (số = px, hoặc CSS length) — mặc định 200px */
    minWidth: { type: String },
    /** Số cột tối đa (vẫn xuống dòng khi ô hẹp hơn min-width) */
    columns: { type: Number },
    /** Khoảng cách: xs | sm | md | lg | xl | none, số (px) hoặc CSS length */
    gap: { type: String },
    /** elevated | outlined | filled | ghost — biến thể hui-stat-card (item.variant ghi đè) */
    variant: { type: String },
    /** Hiệu ứng hui-card cho mọi ô, vd "lift" (item.effect ghi đè) */
    effect: { type: String },
    /** sm | md | lg — kích thước ô */
    size: { type: String },
    /** Mỗi ô bấm được (role="button"), phát hui-select */
    clickable: { type: Boolean },
    /** Key ô đang chọn (clickable) — tự cập nhật khi bấm */
    activeKey: { type: String },
    /** Màn hình hẹp (< 576px): hàng cuộn ngang có snap thay vì xuống dòng (attribute `scroll`) */
    scrollMode: { type: Boolean, attribute: 'scroll' },
    /** Số ô skeleton khi đang tải */
    skeletonCount: { type: Number, default: 4 },
    /** Trường làm key của item */
    rowKey: { type: String, default: 'key' },
    /** Nhãn ARIA của dải (mặc định theo locale) */
    label: { type: String },
    /** Tắt hiệu ứng xuất hiện + đếm số của ô */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._tiles = [];
    this._repeater = null;
    this._tileItem = new WeakMap();
    this._tileKey = new WeakMap();
    this._seen = new WeakSet();
    this._mql = null;
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncTiles());
    this._row = createElement('div', { className: 'kpi__row', part: 'row' }, this._slot);
    this._skeleton = createElement('div', { className: 'kpi__row kpi__skeleton', part: 'skeleton', 'aria-hidden': 'true', hidden: true });
    this._state = createElement('div', { className: 'kpi__state', part: 'state', hidden: true });
    this._base = createElement('div', { className: 'kpi', part: 'base' }, this._state, this._skeleton, this._row);

    this.addEventListener('click', (e) => this._onActivate(e));
    this.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const tile = e.composedPath()[0];
      if (!this.clickable || !this._tiles.includes(tile)) return;
      e.preventDefault();
      this._select(tile);
    });
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    if (typeof matchMedia === 'function') {
      this._mql = matchMedia(NARROW);
      this.listen(this._mql, 'change', () => this._syncScroll());
    }
    this._syncScroll();
  }

  updated(changed) {
    super.updated(changed);

    if (['minWidth', 'columns', 'gap'].some((k) => changed.has(k))) this._applyLayout();
    if (['data', 'rowKey', 'src', 'fetchFn'].some((k) => changed.has(k))) this._renderData();
    if (['variant', 'effect', 'size', 'noAnimation', 'clickable', 'activeKey', 'data', 'rowKey', 'locale'].some((k) => changed.has(k))) {
      this._syncTiles();
    }
    if (['dataState', 'loading', 'emptyText', 'skeletonCount', 'variant', 'effect', 'size', 'locale', 'data', 'src', 'fetchFn'].some((k) => changed.has(k))) {
      this._renderState();
    }
    if (['clickable', 'label', 'locale', 'scrollMode'].some((k) => changed.has(k))) {
      this._row.setAttribute('role', this.clickable ? 'group' : 'list');
      this._row.setAttribute('aria-label', this.label || tx('kpiRow.label'));
      this._syncScroll();
    }
  }

  // =====================================================
  // API
  // =====================================================

  /** Các ô hui-stat-card đang hiển thị — chỉ đọc */
  get tiles() {
    return [...this._tiles];
  }

  // =====================================================
  // BỐ CỤC
  // =====================================================

  _applyLayout() {
    const style = this._base.style;
    const set = (name, value) => (value ? style.setProperty(name, value) : style.removeProperty(name));
    set('--_kpi-gap', toLength(this.gap));
    set('--_kpi-min', toLength(this.minWidth));
    set('--_kpi-cols', this.columns > 0 ? String(Math.floor(this.columns)) : null);
    this._base.classList.toggle('kpi--cols', this.columns > 0);
  }

  /** Chế độ cuộn ngang đang bật thật (scroll + màn hình hẹp) → vùng cuộn focus được bằng bàn phím */
  _syncScroll() {
    if (!this._row) return;
    const active = this.scrollMode && Boolean(this._mql?.matches);
    if (active) this._row.setAttribute('tabindex', '0');
    else this._row.removeAttribute('tabindex');
  }

  get _isDataMode() {
    return this.data != null || Boolean(this.src) || Boolean(this.fetchFn);
  }

  // =====================================================
  // DỮ LIỆU → Ô
  // =====================================================

  _keyOf(item, i) {
    const k = item && typeof item === 'object' ? getPath(item, this.rowKey || 'key') : undefined;
    return k === undefined || k === null ? i : k;
  }

  _renderData() {
    if (!this._isDataMode) {
      this._repeater?.destroy();
      this._repeater = null;
      this._syncTiles();
      return;
    }
    const list = Array.isArray(this.data) ? this.data : [];
    if (!this._repeater || this._repeaterKey !== this.rowKey) {
      this._repeater?.destroy();
      this._repeaterKey = this.rowKey;
      this._repeater = new Repeater(this, {
        key: (item, i) => this._keyOf(item, i),
        create: () => createElement('hui-stat-card'),
      });
    }
    const tiles = this._repeater.render(list);
    tiles.forEach((tile, i) => {
      this._tileItem.set(tile, list[i]);
      this._tileKey.set(tile, this._keyOf(list[i], i));
      this._applyItem(tile, list[i]);
    });
  }

  /** Chép trường của item xuống ô (thiếu trường → về mặc định của stat-card) */
  _applyItem(tile, item) {
    const src = item && typeof item === 'object' ? item : { value: item };
    for (const f of ITEM_FIELDS) {
      const v = src[f];
      if (tile[f] !== v) tile[f] = v === undefined ? null : v;
    }
  }

  /** Đồng bộ danh sách ô + thuộc tính chuyển tiếp, ARIA, hiệu ứng xuất hiện */
  _syncTiles() {
    if (!this._slot) return;
    const tiles = this._slot.assignedElements().filter((el) => !SKIP_TAGS.has(el.localName));
    this._tiles = tiles;
    const fresh = [];
    tiles.forEach((tile, i) => {
      const item = this._tileItem.get(tile);
      if (!this._tileItem.has(tile)) this._tileKey.set(tile, tile.dataset.key ?? (tile.id || i));
      for (const [prop, attr] of Object.entries(PASS)) {
        const own = item && typeof item === 'object' ? item[prop] : undefined;
        applyOwned(tile, attr, own ?? this[prop]);
      }
      applyOwned(tile, 'no-animation', this.noAnimation);
      if (this.clickable) {
        applyOwned(tile, 'role', 'button');
        applyOwned(tile, 'tabindex', '0');
        const pressed = this.activeKey !== null && this.activeKey !== undefined && this.activeKey !== '';
        applyOwned(tile, 'aria-pressed', pressed ? String(String(this._tileKey.get(tile)) === String(this.activeKey)) : null);
      } else {
        applyOwned(tile, 'role', 'listitem');
        applyOwned(tile, 'tabindex', null);
        applyOwned(tile, 'aria-pressed', null);
      }
      tile.classList.toggle('hui-kpi-row__tile--active', this.clickable && String(this._tileKey.get(tile)) === String(this.activeKey ?? '\u0000'));
      if (!this._seen.has(tile)) {
        this._seen.add(tile);
        fresh.push(tile);
      }
    });
    if (fresh.length && !this.noAnimation && !prefersReducedMotion()) {
      runAnimation(fresh, 'fade-up', { duration: 500, stagger: 70 });
    }
  }

  // =====================================================
  // TRẠNG THÁI
  // =====================================================

  _renderState() {
    const state = this.dataState;
    const loading = state === 'loading';
    if (loading) {
      const count = Math.max(1, Math.floor(this.skeletonCount || 4));
      if (this._skeleton.children.length !== count) {
        this._skeleton.replaceChildren(...Array.from({ length: count }, () => createElement('hui-stat-card', { loading: '' })));
      }
      for (const sk of this._skeleton.children) {
        for (const [prop, attr] of Object.entries(PASS)) {
          if (this[prop]) sk.setAttribute(attr, this[prop]);
          else sk.removeAttribute(attr);
        }
      }
      this._skeleton.hidden = false;
    } else {
      this._skeleton.hidden = true;
      this._skeleton.replaceChildren();
    }
    if (state === 'empty' || state === 'error') this.renderStateView(this._state);
    else {
      this._state.hidden = true;
      this._state.replaceChildren();
    }
    this._row.hidden = loading || state === 'empty' || state === 'error';
  }

  // =====================================================
  // CHỌN Ô
  // =====================================================

  _onActivate(e) {
    if (!this.clickable) return;
    const tile = e.composedPath().find((n) => this._tiles.includes(n));
    if (tile) this._select(tile);
  }

  _select(tile) {
    const key = this._tileKey.get(tile);
    this.activeKey = key === undefined || key === null ? null : String(key);
    this.emit('hui-select', { key, item: this._tileItem.get(tile) ?? null, tile });
  }
}

defineElement('hui-kpi-row', HuiKpiRow);

export { HuiKpiRow };
export default HuiKpiRow;
