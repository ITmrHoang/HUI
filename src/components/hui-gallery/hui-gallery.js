/**
 * HUI Gallery — lưới ảnh (grid | masonry) mở hui-lightbox theo nhóm (Organism)
 *   <hui-gallery layout="masonry" columns="2" columns-md="3" columns-lg="4" gap="sm">
 *     <hui-image src="a.jpg" alt="A" caption="Ảnh A"></hui-image>
 *     <img src="b-thumb.jpg" data-full="b.jpg" alt="B">
 *     <a href="c.jpg"><img src="c-thumb.jpg" alt="C"></a>
 *   </hui-gallery>
 *   <hui-gallery data='[{"src":"a.jpg","thumb":"a-sm.jpg","alt":"A","caption":"…"}]'></hui-gallery>
 * Masonry dùng CSS columns (không cần JS đo đạc). Bấm 1 ảnh → lightbox chứa cả nhóm, phóng từ ảnh đó.
 */

import styles from './hui-gallery.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { tx, toLength, toAspectRatio, BREAKPOINTS, breakpointMqls } from '../hui-image/media-shared.js';
import { lightbox } from '../hui-lightbox/lightbox-api.js';
import '../hui-image/hui-image.js';

const SKIP_TAGS = new Set(['template', 'style', 'script', 'link', 'meta']);

/** Thuộc tính gallery tự gắn lên item light DOM → chỉ gỡ đúng cái mình đã gắn */
const owned = new WeakMap();

/**
 * @fires hui-open - Mở lightbox. detail: { index, items }
 * @slot - Ảnh: <hui-image>, <img> (data-full = ảnh lớn, data-caption = chú thích) hoặc <a href="ảnh lớn"><img></a>
 * @csspart base - Khung lưới
 * @csspart item - Mỗi ô ảnh (chế độ data)
 * @cssprop --hui-gallery-gap - Khoảng cách ô (attribute gap ưu tiên hơn; mặc định --hui-space-sm)
 * @cssprop --hui-gallery-radius - Bo góc mỗi ảnh (mặc định --hui-radius-md)
 * @cssprop --hui-gallery-ratio - Tỉ lệ ô ở layout grid (attribute ratio ưu tiên hơn; mặc định 1 / 1)
 * @cssprop --hui-gallery-focus-color - Viền focus ô ảnh
 */
class HuiGallery extends HuiElement {
  static properties = {
    /** grid | masonry — lưới ô đều (cắt theo ratio) hoặc xếp gạch theo cột (giữ tỉ lệ ảnh) */
    layout: { type: String, default: 'grid' },
    /** Số cột mặc định (mọi màn hình) */
    columns: { type: Number, default: 3 },
    /** Số cột khi màn hình ≥ 576px */
    columnsSm: { type: Number },
    /** Số cột khi màn hình ≥ 768px */
    columnsMd: { type: Number },
    /** Số cột khi màn hình ≥ 992px */
    columnsLg: { type: Number },
    /** Số cột khi màn hình ≥ 1200px */
    columnsXl: { type: Number },
    /** Khoảng cách ô: xs | sm | md | lg | xl | none, số (px) hoặc CSS length */
    gap: { type: String },
    /** Tỉ lệ ô ở layout grid (mặc định 1/1); masonry bỏ qua */
    ratio: { type: String },
    /** Danh sách ảnh [{ src, thumb?, alt, caption }] — thay cho phần tử con */
    data: { type: Array },
    /** Lightbox: ảnh cuối → ảnh đầu */
    loop: { type: Boolean },
    /** Ẩn nút tải ảnh trong lightbox */
    noDownload: { type: Boolean },
    /** Nhãn ARIA của lưới (mặc định theo locale) */
    label: { type: String },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    /** Phần tử ô ảnh (light DOM hoặc shadow) */
    this._items = [];
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncItems());
    this._dataGrid = createElement('div', { className: 'gallery__data', hidden: true });
    this._base = createElement('div', { className: 'gallery', part: 'base', role: 'group' }, this._slot, this._dataGrid);

    this.addEventListener('click', (e) => this._onClick(e));
    this.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.composedPath()[0];
      // <img role="button"> do gallery gắn — hui-image tự xử lý phím (rồi đi qua click)
      if (el?.localName === 'img' && this._items.includes(el)) {
        e.preventDefault();
        this.openLightbox(this._items.indexOf(el));
      }
    });
    // hui-image có preview tự mở lightbox 1 ảnh → chặn, gallery mở cả nhóm
    this.addEventListener('hui-preview', (e) => {
      if (this._indexOfPath(e.composedPath()) !== -1) {
        e.preventDefault();
        this.openLightbox(this._indexOfPath(e.composedPath()));
      }
    });
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    for (const mql of breakpointMqls()) this.listen(mql, 'change', () => this._applyColumns());
  }

  updated(changed) {
    if (['columns', 'columnsSm', 'columnsMd', 'columnsLg', 'columnsXl'].some((k) => changed.has(k))) this._applyColumns();
    if (changed.has('gap')) {
      const g = toLength(this.gap);
      if (g) this._base.style.setProperty('--_gallery-gap', g);
      else this._base.style.removeProperty('--_gallery-gap');
    }
    if (changed.has('ratio')) {
      const r = toAspectRatio(this.ratio);
      if (r) this._base.style.setProperty('--_gallery-ratio', r);
      else this._base.style.removeProperty('--_gallery-ratio');
    }
    if (changed.has('layout')) {
      const masonry = this.layout === 'masonry';
      this._base.classList.toggle('gallery--masonry', masonry);
      this._base.classList.toggle('gallery--grid', !masonry);
    }
    if (changed.has('label') || changed.has('locale')) this._base.setAttribute('aria-label', this.label || tx('gallery.label'));
    if (changed.has('data') || (this._isData && (changed.has('layout') || changed.has('ratio')))) this._renderData();
    else if (changed.has('locale')) this._labelItems();
  }

  // =====================================================
  // API
  // =====================================================

  /** Danh sách mục lightbox [{ src, alt, caption }] theo thứ tự ô (chỉ đọc) */
  get items() {
    return this._items.map((el) => this._itemOf(el));
  }

  /** Mở lightbox tại ô thứ `index` */
  openLightbox(index = 0) {
    const items = this.items;
    if (!items.length) return null;
    const i = Math.max(0, Math.min(items.length - 1, index));
    const el = this._items[i];
    this.emit('hui-open', { index: i, items });
    return lightbox.open(items, i, { origin: el, loop: this.loop, noDownload: this.noDownload });
  }

  // =====================================================
  // NỘI BỘ
  // =====================================================

  get _isData() {
    return Array.isArray(this.data);
  }

  _applyColumns() {
    const mqls = breakpointMqls();
    let n = this.columns > 0 ? this.columns : 3;
    BREAKPOINTS.forEach(([suffix], i) => {
      const v = this[`columns${suffix}`];
      if (v > 0 && mqls[i]?.matches) n = v;
    });
    this._base.style.setProperty('--_gallery-cols', String(Math.round(n)));
  }

  /** Mục lightbox của 1 ô: hui-image → previewItem; img → data-full / currentSrc; a → href */
  _itemOf(el) {
    if (el.localName === 'hui-image') return el.previewItem;
    const img = el.localName === 'img' ? el : el.querySelector('img');
    const href = el.localName === 'a' ? el.getAttribute('href') : null;
    return {
      src: el.dataset.full || img?.dataset.full || href || img?.currentSrc || img?.src || '',
      alt: img?.alt || el.getAttribute('aria-label') || '',
      caption: el.dataset.caption || img?.dataset.caption || el.getAttribute('title') || '',
    };
  }

  _indexOfPath(path) {
    for (const node of path) {
      const i = this._items.indexOf(node);
      if (i !== -1) return i;
      if (node === this) break;
    }
    return -1;
  }

  _onClick(e) {
    if (e.defaultPrevented) return;
    const path = e.composedPath();
    const i = this._indexOfPath(path);
    if (i === -1) return;
    const el = this._items[i];
    // hui-image có preview đã mở qua hui-preview
    if (el.localName === 'hui-image' && el.preview) return;
    // Click vào nút / link phụ bên trong ô (không phải chính ô <a>) → bỏ qua
    const inner = path.slice(0, path.indexOf(el)).find((n) => n instanceof Element && n.matches?.('button, a[href], hui-button, input'));
    if (inner) return;
    e.preventDefault(); // <a href="ảnh lớn"> → mở lightbox thay vì chuyển trang
    this.openLightbox(i);
  }

  _syncItems() {
    if (this._isData) return;
    this._items = this._slot.assignedElements().filter((el) => !SKIP_TAGS.has(el.localName));
    this._labelItems();
  }

  /** Ô light DOM: hui-image → bật preview; <img> → focus được như nút; <a> đã focus được sẵn */
  _labelItems() {
    const count = this._items.length;
    this._items.forEach((el, i) => {
      if (el.localName === 'hui-image') {
        if (!el.hasAttribute('preview')) {
          el.setAttribute('preview', '');
          this._own(el, 'preview');
        }
        return;
      }
      if (el.localName === 'img') {
        this._setOwned(el, 'tabindex', '0');
        this._setOwned(el, 'role', 'button');
        if (!el.alt) this._setOwned(el, 'aria-label', tx('gallery.open', { index: i + 1, count }));
      }
    });
  }

  _own(el, attr) {
    let set = owned.get(el);
    if (!set) owned.set(el, (set = {}));
    set[attr] = el.getAttribute(attr);
  }

  /** Gắn attribute nếu người dùng chưa tự đặt (hoặc giá trị là do gallery gắn trước đó) */
  _setOwned(el, attr, value) {
    const set = owned.get(el) || {};
    const current = el.getAttribute(attr);
    if (current === null || set[attr] === current) {
      if (current !== value) el.setAttribute(attr, value);
      this._own(el, attr);
    }
  }

  /** Chế độ data: dựng <hui-image preview> trong shadow DOM */
  _renderData() {
    const isData = this._isData;
    this._slot.hidden = isData;
    this._dataGrid.hidden = !isData;
    if (!isData) {
      this._dataGrid.replaceChildren();
      this._syncItems();
      return;
    }
    const masonry = this.layout === 'masonry';
    this._items = this.data.filter((d) => d && (d.src || d.thumb)).map((d, i) => {
      const img = createElement('hui-image', {
        part: 'item',
        className: 'gallery__item',
        src: d.thumb || d.src,
        'preview-src': d.src || d.thumb,
        alt: d.alt || '',
        preview: true,
        dataset: { index: String(i) },
      });
      if (d.caption) img.setAttribute('caption', d.caption);
      if (!masonry) img.setAttribute('ratio', this.ratio || '1/1');
      if (d.width && d.height) {
        img.setAttribute('width', String(d.width));
        img.setAttribute('height', String(d.height));
      }
      return img;
    });
    this._dataGrid.replaceChildren(...this._items);
  }
}

defineElement('hui-gallery', HuiGallery);

export default HuiGallery;
