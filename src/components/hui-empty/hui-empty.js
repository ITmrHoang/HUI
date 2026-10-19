/**
 * HUI Empty — Trạng thái không có dữ liệu (Ant Empty)
 * Dùng độc lập hoặc bên trong Select / List / Table khi rỗng.
 * Parts: base, image, description, footer · Slots: image, description, (mặc định) = hành động
 */

import styles from './hui-empty.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { t } from '../../core/locale.js';

// Minh họa mặc định: hộp rỗng, nét theo token → tự đổi màu ở dark mode
const DEFAULT_IMAGE = `
<svg viewBox="0 0 64 41" fill="none" aria-hidden="true">
  <ellipse cx="32" cy="33" rx="32" ry="7" fill="var(--hui-fill-tertiary)"/>
  <g stroke="var(--hui-border-hover)" fill="var(--hui-bg-container)">
    <path d="M55 13.3 44.9 1.9A2.6 2.6 0 0 0 43 1H21c-.7 0-1.4.3-1.9.9L9 13.3V22h46v-8.7Z"/>
    <path d="M41.6 16.4c0-1.6 1-2.8 2.1-2.8H55v18.1c0 2-1.3 3.7-2.9 3.7H11.9c-1.6 0-2.9-1.7-2.9-3.7V13.6h11.3c1.2 0 2.1 1.2 2.1 2.8 0 1.5 1 2.8 2.2 2.8h14.8c1.2 0 2.2-1.3 2.2-2.8Z" fill="var(--hui-fill-secondary)"/>
  </g>
</svg>`;

const SIMPLE_IMAGE = `
<svg viewBox="0 0 64 41" fill="none" aria-hidden="true">
  <ellipse cx="32" cy="33" rx="32" ry="7" fill="var(--hui-fill-tertiary)"/>
  <g stroke="var(--hui-border)" fill="none">
    <path d="M55 13.3 44.9 1.9A2.6 2.6 0 0 0 43 1H21c-.7 0-1.4.3-1.9.9L9 13.3V22h46v-8.7Z"/>
    <path d="M9 13.6h11.3c1.2 0 2.1 1.2 2.1 2.8 0 1.5 1 2.8 2.2 2.8h14.8c1.2 0 2.2-1.3 2.2-2.8 0-1.6 1-2.8 2.1-2.8H55"/>
  </g>
</svg>`;

/**
 * @slot - Hành động bên dưới (vd: nút "Tạo mới")
 * @slot image - Thay hình minh họa
 * @slot description - Thay dòng mô tả
 * @csspart base - Khung ngoài
 * @csspart image - Vùng hình minh họa
 * @csspart description - Dòng mô tả
 * @csspart footer - Vùng hành động
 * @cssprop --hui-empty-image-height - Chiều cao hình (mặc định 100px, simple: 40px)
 * @cssprop --hui-empty-color - Màu chữ mô tả
 * @cssprop --hui-empty-font-size - Cỡ chữ mô tả
 * @cssprop --hui-empty-padding - Khoảng đệm khung
 */
class HuiEmpty extends HuiElement {
  static localized = true;

  static properties = {
    /** Mô tả. Bỏ trống = chuỗi locale "Không có dữ liệu"; đặt description="" (attribute rỗng) để ẩn */
    description: { type: String },
    /** default | simple — simple: hình nhỏ, dùng bên trong Select/Table */
    image: { type: String, default: 'default' },
  };

  static styles = styles;

  render() {
    this._image = createElement('div', { className: 'hui-empty__image', part: 'image' });
    const imageSlot = createElement('slot', { name: 'image' }, this._image);

    this._desc = createElement('span');
    const descSlot = createElement('slot', { name: 'description' }, this._desc);
    this._descWrap = createElement('div', { className: 'hui-empty__description', part: 'description' }, descSlot);

    this._footerSlot = createElement('slot');
    this._footer = createElement('div', { className: 'hui-empty__footer', part: 'footer' }, this._footerSlot);
    this._footerSlot.addEventListener('slotchange', () => {
      this._footer.hidden = this._footerSlot.assignedElements().length === 0;
    });
    this._footer.hidden = true;

    return createElement('div', { className: 'hui-empty', part: 'base' }, imageSlot, this._descWrap, this._footer);
  }

  updated(changed) {
    if (changed.has('image')) {
      this._image.innerHTML = this.image === 'simple' ? SIMPLE_IMAGE : DEFAULT_IMAGE;
      this.toggleAttribute('data-simple', this.image === 'simple');
    }
    if (changed.has('description') || changed.has('locale')) {
      // description="" (có attribute nhưng rỗng) → ẩn mô tả; không có attribute → chuỗi mặc định
      const hidden = this.hasAttribute('description') && this.description === '';
      this._desc.textContent = this.description || t('empty.description');
      this._descWrap.hidden = hidden;
    }
  }
}

defineElement('hui-empty', HuiEmpty);

export default HuiEmpty;
