/**
 * HUI Feature Grid — Lưới tính năng landing page (Organism): `data` → các <hui-feature-card>,
 * hoặc đặt sẵn <hui-feature-card> con. Số cột co theo bề rộng khung (container query),
 * các thẻ hiện lần lượt (stagger) khi cuộn tới.
 */

import styles from './hui-feature-grid.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { revealOnView, toLength } from '../hui-feature-card/landing-shared.js';
import '../hui-feature-card/hui-feature-card.js';

/** Trường của item → attribute của hui-feature-card */
const ITEM_ATTRS = {
  icon: 'icon', title: 'title', description: 'description', href: 'href', target: 'target',
  linkText: 'link-text', color: 'color', iconShape: 'icon-shape', effect: 'effect',
};

/** Attribute thẻ con tự đặt (không bị lưới ghi đè): phần tử → Set tên attribute */
const ownAttrs = new WeakMap();

/**
 * @slot - <hui-feature-card> (hoặc phần tử bất kỳ) — dùng khi không có `data`
 * @csspart base - Lưới (role="list" khi render từ data)
 * @csspart item - Mỗi <hui-feature-card> sinh từ data
 * @cssprop --hui-feature-grid-gap - Khoảng cách giữa các thẻ (attribute gap ưu tiên hơn)
 * @cssprop --hui-feature-grid-min-width - Bề rộng tối thiểu mỗi thẻ khi không đặt columns (mặc định 240px)
 */
class HuiFeatureGrid extends HuiElement {
  static properties = {
    /** Mảng tính năng [{ icon, title, description, href, target, linkText, color, iconShape, effect }] */
    data: { type: Array },
    /** Số cột cố định (khung < 640px còn tối đa 2, < 400px còn 1); bỏ trống = tự chia theo bề rộng */
    columns: { type: Number },
    /** plain | card | outline — variant của từng thẻ */
    variant: { type: String, default: 'card' },
    /** start | center — căn nội dung thẻ */
    align: { type: String, default: 'start' },
    /** vertical | horizontal — bố cục thẻ (horizontal: icon trái) */
    orientation: { type: String, default: 'vertical' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Hiệu ứng hui-card cho mọi thẻ (item.effect ưu tiên hơn): lift | tilt | glow | border-gradient… */
    effect: { type: String },
    /** Cấp heading tiêu đề thẻ */
    headingLevel: { type: Number, default: 3 },
    /** Khoảng cách: xs | sm | md | lg | xl | none, số (px) hoặc CSS length */
    gap: { type: String },
    /** Trễ giữa các thẻ khi hiện lần lượt (ms; 0 = hiện cùng lúc) */
    stagger: { type: Number, default: 80 },
    /** Nhãn ARIA của danh sách */
    label: { type: String },
    /** Tắt hiệu ứng xuất hiện (và chuyển động của thẻ) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  get _isDataMode() {
    return Array.isArray(this.data) && this.data.length > 0;
  }

  /** Các thẻ đang hiển thị (sinh từ data hoặc phần tử con) */
  get items() {
    return this._isDataMode ? [...this._grid.children].filter((c) => c.localName !== 'slot') : this._slot.assignedElements();
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => { if (!this._isDataMode) this._syncChildren(); });
    this._grid = createElement('div', { className: 'fg', part: 'base' }, this._slot);
    return this._grid;
  }

  firstUpdated() {
    this._ready = true;
    this._armReveal();
  }

  /** Hẹn hiệu ứng xuất hiện cho các thẻ hiện có (data đổi trước khi lưới cuộn tới → hẹn lại với thẻ mới) */
  _armReveal() {
    this._stopReveal?.();
    this._stopReveal = null;
    if (this._revealed || !this._ready) return;
    this._stopReveal = revealOnView(this, this.items, { stagger: this.stagger, onShow: () => { this._revealed = true; } });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopReveal?.();
    this._stopReveal = null;
  }

  updated(changed) {
    if (changed.has('columns')) {
      const cols = Number(this.columns);
      const fixed = Number.isFinite(cols) && cols > 0;
      this._grid.classList.toggle('fg--fixed', fixed);
      this._grid.classList.toggle('fg--fixed-many', fixed && cols > 2);
      if (fixed) this._grid.style.setProperty('--_fg-cols', String(Math.round(cols)));
      else this._grid.style.removeProperty('--_fg-cols');
    }
    if (changed.has('gap')) {
      const gap = toLength(this.gap);
      if (gap) this._grid.style.setProperty('--_fg-gap', gap);
      else this._grid.style.removeProperty('--_fg-gap');
    }
    if (changed.has('label')) {
      if (this.label) this._grid.setAttribute('aria-label', this.label);
      else this._grid.removeAttribute('aria-label');
    }
    if (changed.has('noAnimation') && this.noAnimation) {
      this._stopReveal?.();
      this._stopReveal = null;
    }

    if (changed.has('data')) this._renderData();
    else if (['variant', 'align', 'orientation', 'size', 'effect', 'headingLevel', 'noAnimation'].some((k) => changed.has(k))) {
      if (this._isDataMode) this.items.forEach((el, i) => this._applyShared(el, this.data[i]));
      else this._syncChildren();
    }
  }

  _renderData() {
    const data = this._isDataMode;
    if (data) this._grid.setAttribute('role', 'list');
    else this._grid.removeAttribute('role');
    const cards = data ? this.data.map((item) => {
      const card = createElement('hui-feature-card', { part: 'item', role: 'listitem' });
      for (const [key, attr] of Object.entries(ITEM_ATTRS)) {
        const v = item?.[key];
        if (v !== undefined && v !== null && v !== '' && key !== 'effect') card.setAttribute(attr, String(v));
      }
      this._applyShared(card, item);
      return card;
    }) : [];
    // Data → thẻ thay cho slot; hết data → trả lại slot cho phần tử con
    this._grid.replaceChildren(...(data ? cards : [this._slot]));
    if (!data) this._syncChildren();
    this._armReveal();
  }

  /** Thuộc tính dùng chung áp cho thẻ sinh từ data; item.effect ưu tiên hơn effect của lưới */
  _applyShared(el, item) {
    const set = (attr, value) => {
      if (value === null || value === undefined || value === '' || value === false) el.removeAttribute(attr);
      else el.setAttribute(attr, value === true ? '' : String(value));
    };
    set('variant', this.variant);
    set('align', this.align);
    set('orientation', this.orientation);
    set('size', this.size);
    set('heading-level', this.headingLevel);
    set('no-animation', this.noAnimation);
    set('effect', item?.effect || this.effect);
  }

  /** Thẻ con (slot): chỉ điền thuộc tính mà thẻ chưa tự đặt — giá trị riêng của thẻ luôn được giữ */
  _syncChildren() {
    const shared = { variant: this.variant, align: this.align, orientation: this.orientation, size: this.size, effect: this.effect };
    for (const el of this._slot.assignedElements()) {
      if (el.localName !== 'hui-feature-card') continue;
      // Lần đầu gặp: ghi nhớ attribute nào do người dùng tự đặt
      if (!ownAttrs.has(el)) ownAttrs.set(el, new Set(Object.keys(shared).filter((a) => el.hasAttribute(a))));
      const own = ownAttrs.get(el);
      for (const [attr, value] of Object.entries(shared)) {
        if (own.has(attr)) continue;
        if (value) el.setAttribute(attr, String(value));
        else el.removeAttribute(attr);
      }
      if (this.noAnimation) el.setAttribute('no-animation', '');
    }
  }
}

defineElement('hui-feature-grid', HuiFeatureGrid);

export { HuiFeatureGrid };
export default HuiFeatureGrid;
