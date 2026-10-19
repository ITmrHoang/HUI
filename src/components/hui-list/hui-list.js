/**
 * HUI List — Danh sách (Ant List + MUI List). Parts/slots/biến CSS: xem JSDoc của class.
 */

import styles from './hui-list.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import '../hui-empty/index.js';
import '../hui-spinner/index.js';

const SIZES = ['sm', 'md', 'lg'];
const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/** Số trơn → px, còn lại giữ nguyên chuỗi CSS */
const toLength = (v) => (/^\d+(\.\d+)?$/.test(String(v).trim()) ? `${v}px` : String(v));

/** renderItem mặc định: object { title, description, content } → hui-list-item + meta; giá trị khác → chữ */
function defaultRenderItem(item) {
  const li = document.createElement('hui-list-item');
  if (item && typeof item === 'object') {
    if (item.title !== undefined || item.description !== undefined) {
      const meta = document.createElement('hui-list-item-meta');
      if (item.title !== undefined) meta.setAttribute('title', String(item.title));
      if (item.description !== undefined) meta.setAttribute('description', String(item.description));
      li.append(meta);
    }
    if (item.content !== undefined) li.append(String(item.content));
  } else {
    li.textContent = String(item ?? '');
  }
  return li;
}

/**
 * Danh sách các <hui-list-item>: header/footer, đường kẻ, loading, trạng thái rỗng (<hui-empty>),
 * chế độ lưới (grid-column) hiển thị item dạng thẻ, slot "pagination" cho phân trang.
 * Chế độ dữ liệu: gán `dataSource` (mảng) + `renderItem(item, index)` trả về Node / chuỗi.
 *
 * @slot - Các <hui-list-item>
 * @slot header - Đầu danh sách (thay attribute header)
 * @slot footer - Chân danh sách (thay attribute footer)
 * @slot pagination - Thành phần phân trang (vd: <hui-pagination>), canh phải dưới danh sách
 * @slot empty - Thay <hui-empty> mặc định khi không có item
 * @csspart base - Khung ngoài
 * @csspart header - Đầu danh sách
 * @csspart body - Vùng chứa item + lớp loading
 * @csspart items - Khối item (role="list"; grid ở chế độ lưới)
 * @csspart empty - Vùng trạng thái rỗng
 * @csspart loading - Lớp phủ khi loading
 * @csspart footer - Chân danh sách
 * @csspart pagination - Vùng phân trang
 * @cssprop --hui-list-bg - Nền khung (khi bordered)
 * @cssprop --hui-list-border-color - Màu viền ngoài (bordered)
 * @cssprop --hui-list-radius - Bo góc khung (bordered)
 * @cssprop --hui-list-split-color - Màu đường kẻ giữa các item
 * @cssprop --hui-list-item-padding - Khoảng đệm item (mặc định theo size / bordered)
 * @cssprop --hui-list-header-bg - Nền header/footer
 * @cssprop --hui-list-card-bg - Nền item ở chế độ lưới
 * @cssprop --hui-list-card-border-color - Viền item ở chế độ lưới
 * @cssprop --hui-list-card-radius - Bo góc item ở chế độ lưới
 * @cssprop --hui-list-loading-bg - Nền lớp phủ loading
 * @cssprop --hui-list-pagination-justify - Canh vùng phân trang (flex-end)
 */
class HuiList extends HuiElement {
  static properties = {
    /** Chữ đầu danh sách (hoặc slot="header") */
    header: { type: String },
    /** Chữ chân danh sách (hoặc slot="footer") */
    footer: { type: String },
    /** Viền ngoài + bo góc */
    bordered: { type: Boolean },
    /** Đường kẻ giữa các item. Mặc định bật; split="false" để tắt */
    split: { type: String },
    /** sm | md | lg — khoảng đệm item */
    size: { type: String, default: 'md' },
    /** Phủ spinner lên danh sách */
    loading: { type: Boolean },
    /** horizontal | vertical — vertical: actions nằm dưới nội dung, extra là vùng lớn bên phải */
    itemLayout: { type: String, default: 'horizontal' },
    /** Mô tả của trạng thái rỗng (mặc định chuỗi locale của hui-empty) */
    emptyText: { type: String },
    /** Số cột ở chế độ lưới (đặt → bật grid) */
    gridColumn: { type: Number },
    /** Khoảng cách giữa các thẻ lưới (số = px), mặc định 16 */
    gridGutter: { type: String },
    /** Số cột khi màn hình < 576px */
    gridColumnXs: { type: Number },
    /** Số cột khi ≥ 576px */
    gridColumnSm: { type: Number },
    /** Số cột khi ≥ 768px */
    gridColumnMd: { type: Number },
    /** Số cột khi ≥ 992px */
    gridColumnLg: { type: Number },
    /** Số cột khi ≥ 1200px */
    gridColumnXl: { type: Number },
    /** Số cột khi ≥ 1600px */
    gridColumnXxl: { type: Number },
    /** Mảng dữ liệu (chế độ dữ liệu) — chỉ gán bằng property */
    dataSource: { type: Array, attribute: false },
    /** (item, index) => Node | string — chỉ gán bằng property */
    renderItem: { type: Object, attribute: false },
  };

  static styles = styles;

  render() {
    const slot = (name, ...fallback) => {
      const s = createElement('slot', name ? { name } : {}, ...fallback);
      s.addEventListener('slotchange', () => this._syncSections());
      return s;
    };

    this._headerText = createElement('span');
    this._headerSlot = slot('header', this._headerText);
    this._header = createElement('div', { className: 'hui-list__header', part: 'header' }, this._headerSlot);

    this._slot = slot();
    // Item sinh từ dataSource nằm cạnh slot, cùng chung lưới / đường kẻ
    this._data = createElement('div', { className: 'hui-list__data' });
    this._items = createElement('div', { className: 'hui-list__items', part: 'items', role: 'list' }, this._slot, this._data);

    this._emptyEl = createElement('hui-empty', { image: 'simple' });
    this._empty = createElement('div', { className: 'hui-list__empty', part: 'empty' }, createElement('slot', { name: 'empty' }, this._emptyEl));

    this._loading = createElement('div', { className: 'hui-list__loading', part: 'loading' }, createElement('hui-spinner'));
    this._body = createElement('div', { className: 'hui-list__body', part: 'body' }, this._items, this._empty, this._loading);

    this._footerText = createElement('span');
    this._footerSlot = slot('footer', this._footerText);
    this._footer = createElement('div', { className: 'hui-list__footer', part: 'footer' }, this._footerSlot);

    this._paginationSlot = slot('pagination');
    this._pagination = createElement('div', { className: 'hui-list__pagination', part: 'pagination' }, this._paginationSlot);

    this._base = createElement('div', { part: 'base' }, this._header, this._body, this._footer, this._pagination);
    return this._base;
  }

  updated(changed) {
    const gridKeys = ['gridColumn', ...BREAKPOINTS.map((b) => `gridColumn${b[0].toUpperCase()}${b.slice(1)}`)];

    if (['bordered', 'split', 'size', 'itemLayout', ...gridKeys].some((k) => changed.has(k))) {
      const size = SIZES.includes(this.size) ? this.size : 'md';
      const split = this.split !== 'false' && this.split !== false;
      this._base.className = [
        'hui-list',
        `hui-list--${size}`,
        this.bordered ? 'hui-list--bordered' : '',
        split ? 'hui-list--split' : '',
        this.itemLayout === 'vertical' ? 'hui-list--vertical' : 'hui-list--horizontal',
        this._isGrid() ? 'hui-list--grid' : '',
      ].filter(Boolean).join(' ');
    }

    if (gridKeys.some((k) => changed.has(k)) || changed.has('gridGutter')) {
      const style = this._items.style;
      gridKeys.forEach((key, i) => {
        const name = i === 0 ? '--_list-col' : `--_list-col-${BREAKPOINTS[i - 1]}`;
        const v = this[key];
        if (Number.isFinite(v) && v > 0) style.setProperty(name, String(Math.floor(v)));
        else style.removeProperty(name);
      });
      if (this.gridGutter !== null && this.gridGutter !== '') style.setProperty('--_list-gutter', toLength(this.gridGutter));
      else style.removeProperty('--_list-gutter');
    }

    if (changed.has('header')) this._headerText.textContent = this.header || '';
    if (changed.has('footer')) this._footerText.textContent = this.footer || '';
    if (changed.has('emptyText')) {
      if (this.emptyText !== null) this._emptyEl.setAttribute('description', this.emptyText);
      else this._emptyEl.removeAttribute('description');
    }

    if (changed.has('loading')) {
      this._loading.hidden = !this.loading;
      this._items.inert = this.loading;
      this._body.setAttribute('aria-busy', String(this.loading));
      this._body.classList.toggle('hui-list__body--loading', this.loading);
    }

    if (changed.has('dataSource') || changed.has('renderItem')) this._renderData();
    this._syncSections();
  }

  _isGrid() {
    return [this.gridColumn, this.gridColumnXs, this.gridColumnSm, this.gridColumnMd,
      this.gridColumnLg, this.gridColumnXl, this.gridColumnXxl].some((v) => Number.isFinite(v) && v > 0);
  }

  /** Dựng lại item từ dataSource (chỉ khi dataSource / renderItem đổi) */
  _renderData() {
    const list = Array.isArray(this.dataSource) ? this.dataSource : [];
    const render = typeof this.renderItem === 'function' ? this.renderItem : defaultRenderItem;
    const nodes = list.map((item, index) => {
      const out = render(item, index);
      return out instanceof Node ? out : document.createTextNode(String(out ?? ''));
    });
    this._data.replaceChildren(...nodes);
  }

  /** Số item hiện có (slot mặc định + dataSource) */
  get itemCount() {
    if (!this._slot) return 0;
    return this._slot.assignedElements().length + this._data.childNodes.length;
  }

  _syncSections() {
    if (!this._base) return;
    this._header.hidden = !(this.header || hasContent(this._headerSlot));
    this._footer.hidden = !(this.footer || hasContent(this._footerSlot));
    this._pagination.hidden = !hasContent(this._paginationSlot);
    const empty = this.itemCount === 0;
    this._empty.hidden = !empty;
    this._items.hidden = empty;
    this.setState('empty', empty);
  }
}

defineElement('hui-list', HuiList);

export default HuiList;
