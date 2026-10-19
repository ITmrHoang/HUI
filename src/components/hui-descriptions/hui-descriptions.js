/**
 * HUI Descriptions — Danh sách mô tả nhãn/giá trị (Ant Descriptions). Parts/slots/biến CSS: xem JSDoc của class.
 */

import styles from './hui-descriptions.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const SIZES = ['sm', 'md', 'lg'];
/** Thứ tự từ lớn → nhỏ: breakpoint lớn nhất đang khớp và có giá trị thì thắng (giống Ant) */
const BREAKPOINTS = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'];
const QUERIES = {
  xs: '(max-width: 575.98px)',
  sm: '(min-width: 576px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 992px)',
  xl: '(min-width: 1200px)',
  xxl: '(min-width: 1600px)',
};
const DEFAULT_COLUMNS = { xxl: 3, xl: 3, lg: 3, md: 3, sm: 2, xs: 1 };

const cap = (s) => s[0].toUpperCase() + s.slice(1);

let uid = 0;

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * Hiển thị các cặp nhãn – giá trị dạng lưới nhiều cột. Mỗi <hui-descriptions-item> chiếm `span` cột;
 * item cuối hàng tự kéo dài lấp chỗ trống. Ngữ nghĩa: role="table", mỗi item là một hàng
 * (nhãn = rowheader, giá trị = cell) → trình đọc màn hình đọc "Nhãn, giá trị".
 *
 * @slot - Các <hui-descriptions-item>
 * @slot title - Tiêu đề tùy biến (thay attribute title)
 * @slot extra - Vùng góc phải tiêu đề (vd: nút Sửa)
 * @csspart base - Khung ngoài
 * @csspart header - Hàng tiêu đề + extra
 * @csspart title - Tiêu đề
 * @csspart extra - Vùng extra
 * @csspart view - Lưới nhãn/giá trị (role="table")
 * @cssprop --hui-descriptions-border-color - Màu viền (bordered)
 * @cssprop --hui-descriptions-radius - Bo góc (bordered)
 * @cssprop --hui-descriptions-title-color - Màu tiêu đề
 * @cssprop --hui-descriptions-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-descriptions-label-color - Màu nhãn
 * @cssprop --hui-descriptions-label-bg - Nền ô nhãn (bordered)
 * @cssprop --hui-descriptions-content-color - Màu giá trị
 * @cssprop --hui-descriptions-content-bg - Nền ô giá trị (bordered)
 * @cssprop --hui-descriptions-cell-padding - Khoảng đệm ô (mặc định theo size)
 */
class HuiDescriptions extends HuiElement {
  static properties = {
    /** Tiêu đề (hoặc slot="title") */
    title: { type: String },
    /** Kẻ ô dạng bảng */
    bordered: { type: Boolean },
    /** Số cột: số ("3") hoặc theo breakpoint ("xs:1,sm:2,md:3"). Mặc định xs 1 · sm 2 · md+ 3 */
    column: { type: String },
    /** Số cột khi màn hình < 576px */
    columnXs: { type: Number },
    /** Số cột khi ≥ 576px */
    columnSm: { type: Number },
    /** Số cột khi ≥ 768px */
    columnMd: { type: Number },
    /** Số cột khi ≥ 992px */
    columnLg: { type: Number },
    /** Số cột khi ≥ 1200px */
    columnXl: { type: Number },
    /** Số cột khi ≥ 1600px */
    columnXxl: { type: Number },
    /** horizontal | vertical — vertical: nhãn nằm trên giá trị */
    layout: { type: String, default: 'horizontal' },
    /** sm | md | lg — khoảng đệm ô */
    size: { type: String, default: 'md' },
    /** Dấu ":" sau nhãn (horizontal, không bordered). Mặc định bật; colon="false" để tắt */
    colon: { type: String },
  };

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    // Đổi breakpoint → tính lại số cột
    if (typeof matchMedia === 'function') {
      this._mqls = Object.fromEntries(Object.entries(QUERIES).map(([bp, q]) => [bp, matchMedia(q)]));
      for (const mql of Object.values(this._mqls)) this.listen(mql, 'change', () => this._layout());
    }
    this._layout();
  }

  render() {
    const id = `hui-descriptions-${++uid}`;
    this._titleText = createElement('span');
    this._titleSlot = createElement('slot', { name: 'title' }, this._titleText);
    this._title = createElement('div', { className: 'hui-descriptions__title', part: 'title', id: `${id}-title` }, this._titleSlot);
    this._extraSlot = createElement('slot', { name: 'extra' });
    this._extra = createElement('div', { className: 'hui-descriptions__extra', part: 'extra' }, this._extraSlot);
    this._header = createElement('div', { className: 'hui-descriptions__header', part: 'header' }, this._title, this._extra);
    for (const s of [this._titleSlot, this._extraSlot]) s.addEventListener('slotchange', () => this._syncHeader());

    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._layout());
    this._view = createElement('div', { className: 'hui-descriptions__view', part: 'view', role: 'table' }, this._slot);
    this._titleId = `${id}-title`;

    // Item đổi span / label → bố trí lại
    this.addEventListener('hui-descriptions-item-change', (e) => {
      if (e.target.parentElement === this) {
        e.stopPropagation();
        this._layout();
      }
    });

    this._base = createElement('div', { part: 'base' }, this._header, this._view);
    return this._base;
  }

  updated(changed) {
    if (['bordered', 'layout', 'size', 'colon'].some((k) => changed.has(k))) {
      const size = SIZES.includes(this.size) ? this.size : 'md';
      const vertical = this.layout === 'vertical';
      const colon = this.colon !== 'false' && this.colon !== false && !this.bordered && !vertical;
      this._base.className = [
        'hui-descriptions',
        `hui-descriptions--${size}`,
        vertical ? 'hui-descriptions--vertical' : 'hui-descriptions--horizontal',
        this.bordered ? 'hui-descriptions--bordered' : '',
        colon ? 'hui-descriptions--colon' : '',
      ].filter(Boolean).join(' ');
    }
    if (changed.has('title')) {
      this._titleText.textContent = this.title || '';
      this._syncHeader();
    }
    this._layout();
  }

  _syncHeader() {
    const hasTitle = Boolean(this.title) || hasContent(this._titleSlot);
    this._title.hidden = !hasTitle;
    this._extra.hidden = !hasContent(this._extraSlot);
    this._header.hidden = this._title.hidden && this._extra.hidden;
    if (hasTitle) this._view.setAttribute('aria-labelledby', this._titleId);
    else this._view.removeAttribute('aria-labelledby');
  }

  /** Breakpoint đang khớp (theo matchMedia) */
  _matchedScreens() {
    if (!this._mqls) return new Set(['md', 'sm']);
    return new Set(Object.entries(this._mqls).filter(([, m]) => m.matches).map(([bp]) => bp));
  }

  /** Số cột hiệu lực tại kích thước màn hình hiện tại */
  get columnCount() {
    const raw = String(this.column ?? '').trim();
    const fixed = /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;
    const map = {};
    if (!fixed && raw) {
      raw.split(',').forEach((part) => {
        const [k, v] = part.split(':').map((s) => s.trim());
        if (DEFAULT_COLUMNS[k] && Number(v) > 0) map[k] = Math.floor(Number(v));
      });
    }
    BREAKPOINTS.forEach((bp) => {
      const v = this[`column${cap(bp)}`];
      if (Number.isFinite(v) && v > 0) map[bp] = Math.floor(v);
    });
    if (fixed && !Object.keys(map).length) return fixed;

    const screens = this._matchedScreens();
    for (const bp of BREAKPOINTS) if (screens.has(bp) && map[bp]) return map[bp];
    if (fixed) return fixed;
    const current = BREAKPOINTS.find((bp) => screens.has(bp)) || 'md';
    return DEFAULT_COLUMNS[current];
  }

  /** Item con trực tiếp */
  _items() {
    return Array.from(this.children).filter((el) => el.localName === 'hui-descriptions-item');
  }

  /**
   * Chia item vào hàng: tràn hàng → cắt span bằng chỗ còn lại; item cuối (hoặc span="filled")
   * lấp phần còn lại của hàng → không có ô trống (cần cho viền dạng gap 1px).
   */
  _layout() {
    if (!this._view) return;
    const columns = this.columnCount;
    const vertical = this.layout === 'vertical';
    this._view.style.setProperty('--_desc-cols', String(columns));

    const items = this._items();
    let row = 0;
    let col = 0;
    items.forEach((item, index) => {
      const rest = columns - col;
      const raw = item.getAttribute('span');
      let span = raw === 'filled' ? rest : Math.max(1, Math.floor(Number(raw) || 1));
      if (index === items.length - 1 || span > rest) span = rest;
      item._place?.({ vertical, row, col, span });
      col += span;
      if (col >= columns) {
        row += 1;
        col = 0;
      }
    });
  }
}

defineElement('hui-descriptions', HuiDescriptions);

export default HuiDescriptions;
