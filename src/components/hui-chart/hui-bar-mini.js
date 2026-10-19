/**
 * HUI Bar Mini — biểu đồ cột nhỏ: dọc (cột) hoặc ngang (danh sách xếp hạng: nhãn trái, thanh, giá trị phải).
 * Thanh là phần tử HTML, chiều dài theo biến CSS --_bm-v (0–1) → CSS transition lo phần chuyển động.
 */

import sharedStyles from './chart-shared.css?raw';
import styles from './hui-bar-mini.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import {
  msg, normalizeData, resolveColor, paletteColor, formatValue, clamp, canAnimate, durationOf,
  createTooltip, showTooltip, hideTooltip,
} from './chart-shared.js';

const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
/** auto | true | false (attribute rỗng = true) */
const flag = (v, auto) => (v === '' || v === true || v === 'true' ? true : v === false || v === 'false' ? false : auto);

/**
 * Cột / thanh xếp hạng gọn cho dashboard, card KPI.
 * Bàn phím: Tab vào nhóm · ←/→ (↑/↓) chuyển cột · Home/End · Enter/Space chọn (hui-select) · Esc ẩn tooltip.
 *
 * @fires hui-select - Bấm / Enter trên một cột. detail { index (vị trí trong data gốc), item, position (vị trí hiển thị) }
 * @csspart base - Khung ngoài (role="group")
 * @csspart list - Vùng chứa các cột
 * @csspart item - Một mục (role="button"); mục được highlight có thêm part item-highlight
 * @csspart label - Nhãn
 * @csspart track - Rãnh chứa thanh
 * @csspart bar - Thanh
 * @csspart value - Giá trị
 * @csspart tooltip - Tooltip (kèm tooltip-label, tooltip-value)
 * @cssprop --hui-bar-mini-color - Màu thanh mặc định (mục có color riêng không bị ảnh hưởng)
 * @cssprop --hui-bar-mini-height - Chiều cao vùng cột (dọc; ghi đè attribute height)
 * @cssprop --hui-bar-mini-bar-size - Độ dày thanh (ngang, mặc định 8px)
 * @cssprop --hui-bar-mini-gap - Khoảng cách giữa các cột / hàng (ghi đè attribute gap)
 * @cssprop --hui-bar-mini-radius - Bo góc thanh (ghi đè attribute radius)
 * @cssprop --hui-bar-mini-track-bg - Nền rãnh (mặc định: trong suốt khi dọc, fill nhạt khi ngang)
 * @cssprop --hui-bar-mini-label-color - Màu nhãn
 * @cssprop --hui-bar-mini-value-color - Màu giá trị
 * @cssprop --hui-bar-mini-label-width - Độ rộng tối đa cột nhãn (ngang, mặc định 12em)
 * @cssprop --hui-bar-mini-dim-opacity - Độ mờ các thanh không được highlight / hover (mặc định 0.45)
 * @cssprop --hui-bar-mini-duration - Thời lượng chuyển động (mặc định 600ms)
 */
class HuiBarMini extends HuiElement {
  static localized = true;

  static properties = {
    /** Mảng {label, value, color?} hoặc số — attribute nhận JSON */
    data: { type: Array, default: [] },
    /** vertical | horizontal — cột đứng | thanh ngang (danh sách xếp hạng) */
    orientation: { type: String, default: 'vertical' },
    /** auto | true | false — hiện nhãn (auto: chỉ khi horizontal; attribute rỗng = true) */
    showLabels: { type: String, default: 'auto' },
    /** auto | true | false — hiện giá trị (auto: chỉ khi horizontal; attribute rỗng = true) */
    showValues: { type: String, default: 'auto' },
    /** Giá trị ứng với thanh dài nhất (mặc định = giá trị lớn nhất trong data) */
    max: { type: Number },
    /** Khoảng cách giữa các cột / hàng (px) */
    gap: { type: Number },
    /** Bo góc thanh (px) */
    radius: { type: Number },
    /** Chiều cao vùng cột khi vertical (px) */
    height: { type: Number, default: 80 },
    /** Index (trong data gốc) hoặc label của mục cần làm nổi bật — các mục khác nhạt đi */
    highlight: { type: String },
    /** none | asc | desc — thứ tự hiển thị */
    sort: { type: String, default: 'none' },
    /** Màu thanh: preset (primary, success-4…), màu CSS, hoặc "palette" (mỗi mục một màu) */
    color: { type: String, default: 'primary' },
    /** Định dạng số (format.js): number | number:1 | currency | percent | compact */
    format: { type: String },
    /** Hàm định dạng (value, item) => string — chỉ gán bằng JS */
    formatter: { type: Object, attribute: false },
    /** Tên biểu đồ cho trình đọc màn hình (mặc định "Biểu đồ cột") */
    label: { type: String },
    /** Tắt hiệu ứng mọc cột / chuyển tiếp */
    noAnimation: { type: Boolean },
  };

  static styles = [sharedStyles, styles];

  constructor() {
    super();
    this._rowsCache = [];
    this._active = -1;
    this._focusPos = -1;
    this._entered = false;
  }

  /** Các mục đang hiển thị (đã sắp xếp): [{label, value, color, index, raw}] */
  get rows() {
    return this._rowsCache.map((r) => ({ ...r }));
  }

  /** Focus vào mục đang nhận Tab (roving tabindex) */
  focus(options) {
    this._list?.querySelector('.bm__item[tabindex="0"]')?.focus(options);
  }

  render() {
    this._list = createElement('div', { className: 'bm__list', part: 'list' });
    this._tip = createTooltip();
    this._base = createElement('div', { className: 'bm', part: 'base', role: 'group' }, this._list, this._tip);

    const itemOf = (e) => e.target.closest?.('.bm__item');
    this._list.addEventListener('pointerover', (e) => {
      const item = itemOf(e);
      if (item) this._setActive(this._posOf(item));
    });
    this._list.addEventListener('pointerleave', () => {
      if (!this._list.contains(this.shadowRoot.activeElement)) this._setActive(-1);
    });
    this._list.addEventListener('click', (e) => {
      const item = itemOf(e);
      if (item) this._select(this._posOf(item));
    });
    this._list.addEventListener('focusin', (e) => {
      const item = itemOf(e);
      if (!item) return;
      this._focusPos = this._posOf(item);
      this._syncTabindex();
      this._setActive(this._focusPos);
    });
    this._list.addEventListener('focusout', (e) => {
      if (!this._list.contains(e.relatedTarget)) this._setActive(-1);
    });
    this._list.addEventListener('keydown', (e) => this._onKey(e));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._watchEntry();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopView?.();
    this._stopView = null;
  }

  updated(changed) {
    const has = (...keys) => keys.some((k) => changed.has(k));
    const s = this._base.style;
    if (has('height')) s.setProperty('--_bm-h', `${this.height > 0 ? this.height : 80}px`);
    if (has('gap')) {
      if (isNum(this.gap)) s.setProperty('--_bm-gap', `${this.gap}px`);
      else s.removeProperty('--_bm-gap');
    }
    if (has('radius')) {
      if (isNum(this.radius)) s.setProperty('--_bm-r', `${this.radius}px`);
      else s.removeProperty('--_bm-r');
    }
    if (has('noAnimation')) this._base.classList.toggle('bm--static', !!this.noAnimation);
    if (has('data', 'orientation', 'showLabels', 'showValues', 'max', 'highlight', 'sort', 'color', 'format', 'formatter', 'locale', 'label')) {
      this._sync();
    }
    if (changed.has('noAnimation') && this.noAnimation && !this._entered) this._play();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  get _horizontal() {
    return this.orientation === 'horizontal';
  }

  _fmt(row) {
    return formatValue(row.value, { format: this.format, formatter: this.formatter, item: row.raw });
  }

  _posOf(item) {
    return [...this._list.children].indexOf(item);
  }

  _computeRows() {
    const rows = normalizeData(this.data);
    if (this.sort === 'asc') rows.sort((a, b) => a.value - b.value);
    else if (this.sort === 'desc') rows.sort((a, b) => b.value - a.value);
    return rows;
  }

  _isHighlight(row) {
    const h = this.highlight;
    if (h === null || h === undefined || h === '') return false;
    const s = String(h);
    if (row.label && row.label === s) return true;
    return /^\d+$/.test(s) && Number(s) === row.index;
  }

  _createItem() {
    const label = createElement('span', { className: 'bm__label', part: 'label' });
    const bar = createElement('span', { className: 'bm__bar', part: 'bar' });
    const value = createElement('span', { className: 'bm__value', part: 'value' });
    const track = createElement('span', { className: 'bm__track', part: 'track' }, bar);
    const item = createElement('div', { className: 'bm__item', part: 'item', role: 'button', tabindex: '-1' }, label, track, value);
    item._els = { label, bar, value, track };
    return item;
  }

  /** Đồng bộ DOM với data: tái dùng phần tử theo vị trí → chiều dài thanh chuyển tiếp mượt */
  _sync() {
    const rows = (this._rowsCache = this._computeRows());
    const horizontal = this._horizontal;
    const labels = flag(this.showLabels, horizontal);
    const values = flag(this.showValues, horizontal);
    const vals = rows.map((r) => r.value);
    const top = isNum(this.max) && Number(this.max) > 0 ? Number(this.max) : Math.max(0, ...vals) || 1;
    const hasHighlight = rows.some((r) => this._isHighlight(r));
    const keep = ['is-entering', 'has-active'].filter((c) => this._base.classList.contains(c));

    this._base.className = [
      ...keep,
      'bm', `bm--${horizontal ? 'horizontal' : 'vertical'}`,
      labels && 'has-labels', values && 'has-values', hasHighlight && 'has-highlight',
      this.noAnimation && 'bm--static', !this._entered && 'is-pending',
    ].filter(Boolean).join(' ');
    // Cột lưới khi ngang: [nhãn] [thanh] [giá trị] — bỏ cột bị ẩn
    this._list.style.gridTemplateColumns = horizontal
      ? [labels && 'minmax(0, max-content)', 'minmax(48px, 1fr)', values && 'max-content'].filter(Boolean).join(' ')
      : '';

    const list = this._list;
    while (list.children.length > rows.length) list.lastChild.remove();
    while (list.children.length < rows.length) list.append(this._createItem());

    rows.forEach((row, pos) => {
      const item = list.children[pos];
      const { label, value, track } = item._els;
      const text = this._fmt(row);
      const name = row.label || msg('chart.point', { index: row.index + 1 });
      const hl = this._isHighlight(row);
      label.textContent = row.label;
      label.hidden = !labels;
      value.textContent = text;
      value.hidden = !values;
      // Dọc: giá trị nằm trong rãnh, ngay trên đỉnh cột; ngang: cột riêng bên phải
      const valueParent = horizontal ? item : track;
      if (value.parentNode !== valueParent) valueParent.append(value);
      item.style.setProperty('--_bm-v', String(clamp(row.value / top, 0, 1)));
      item.style.setProperty('--_bm-i', String(pos));
      item.style.setProperty('--_bm-color', row.color
        ? resolveColor(row.color)
        : `var(--hui-bar-mini-color, ${this.color === 'palette' ? paletteColor(row.index) : resolveColor(this.color)})`);
      item.classList.toggle('is-highlight', hl);
      item.setAttribute('part', hl ? 'item item-highlight' : 'item');
      item.setAttribute('aria-label', `${name}: ${text}`);
      if (hl) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });

    if (this._focusPos >= rows.length) this._focusPos = rows.length - 1;
    this._syncTabindex();
    if (this._active >= rows.length) this._setActive(-1);
    else if (this._active >= 0) this._setActive(this._active);

    // Nhãn nhóm: tên + tóm tắt mục cao nhất
    const name = this.label || msg('chart.bar');
    if (!rows.length) {
      this._base.setAttribute('aria-label', `${name}: ${msg('chart.empty')}`);
      return;
    }
    const best = rows.reduce((a, b) => (b.value > a.value ? b : a));
    this._base.setAttribute('aria-label', `${name}. ${msg('chart.barSummary', {
      count: rows.length,
      maxLabel: best.label || msg('chart.point', { index: best.index + 1 }),
      max: this._fmt(best),
    })}`);
  }

  /** Roving tabindex: chỉ 1 mục nhận Tab (mục đang focus → mục highlight → mục đầu) */
  _syncTabindex() {
    const items = [...this._list.children];
    if (!items.length) return;
    let pos = this._focusPos;
    if (pos < 0) {
      pos = items.findIndex((it) => it.classList.contains('is-highlight'));
      if (pos < 0) pos = 0;
    }
    items.forEach((it, i) => it.setAttribute('tabindex', i === pos ? '0' : '-1'));
  }

  _setActive(pos) {
    const items = [...this._list.children];
    items.forEach((it, i) => it.classList.toggle('is-active', i === pos));
    this._base.classList.toggle('has-active', pos >= 0 && pos < items.length);
    if (pos < 0 || pos >= items.length) {
      this._active = -1;
      hideTooltip(this._tip);
      return;
    }
    this._active = pos;
    const row = this._rowsCache[pos];
    const b = this._base.getBoundingClientRect();
    const r = items[pos]._els.bar.getBoundingClientRect();
    const horizontal = this._horizontal;
    const x = (horizontal ? r.right : r.left + r.width / 2) - b.left;
    const y = r.top - b.top;
    showTooltip(this._tip, { label: row.label, value: this._fmt(row), color: items[pos].style.getPropertyValue('--_bm-color') }, x, y, this._base);
  }

  _select(pos) {
    const row = this._rowsCache[pos];
    if (!row) return;
    this.emit('hui-select', { index: row.index, item: row.raw, position: pos });
  }

  _onKey(e) {
    const items = [...this._list.children];
    const n = items.length;
    if (!n) return;
    const cur = Math.max(0, this._posOf(e.target.closest?.('.bm__item')));
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._select(cur);
      return;
    }
    if (e.key === 'Escape') {
      this._setActive(-1);
      return;
    }
    const next = {
      ArrowRight: cur + 1, ArrowDown: cur + 1, ArrowLeft: cur - 1, ArrowUp: cur - 1, Home: 0, End: n - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    this._focusPos = clamp(next, 0, n - 1);
    this._syncTabindex();
    items[this._focusPos].focus();
  }

  // =====================================================
  // HIỆU ỨNG XUẤT HIỆN — cột mọc lần lượt khi cuộn tới
  // =====================================================

  _watchEntry() {
    if (this._entered || this._stopView) return;
    if (!canAnimate(this)) {
      this._entered = true;
      this._base.classList.remove('is-pending');
      return;
    }
    this._base.classList.add('is-pending');
    this._stopView = inView(this, (entry) => {
      if (!entry.isIntersecting) return;
      this._stopView = null;
      this._play();
    }, { once: true });
  }

  _play() {
    this._stopView?.();
    this._stopView = null;
    this._entered = true;
    if (!canAnimate(this)) {
      this._base.classList.remove('is-pending');
      return;
    }
    void this._list.offsetWidth; // chốt trạng thái 0 trước khi bỏ is-pending → transition chạy
    this._base.classList.add('is-entering');
    this._base.classList.remove('is-pending');
    const total = durationOf(this, '--hui-bar-mini-duration', 600) + this._list.children.length * 40;
    clearTimeout(this._enterTimer);
    this._enterTimer = setTimeout(() => this._base.classList.remove('is-entering'), total);
  }
}

defineElement('hui-bar-mini', HuiBarMini);

export { HuiBarMini };
export default HuiBarMini;
