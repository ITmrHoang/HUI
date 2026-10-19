/**
 * HUI Badge Ribbon — Dải ruy-băng gắn ở góc trên của nội dung (Ant Badge.Ribbon). Xem JSDoc của class.
 */

import styles from './hui-badge-ribbon.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const COLOR_VARIANTS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

/**
 * Bọc nội dung (thường là <hui-card>) và gắn ruy-băng ở mép trên, có góc gấp phía sau.
 *
 * @slot - Nội dung được gắn ruy-băng
 * @slot text - Nội dung ruy-băng tùy biến (thay attribute text)
 * @csspart base - Khung bọc
 * @csspart ribbon - Dải ruy-băng
 * @csspart text - Chữ trên ruy-băng
 * @csspart corner - Góc gấp
 * @cssprop --hui-badge-ribbon-bg - Màu ruy-băng (ghi đè attribute color)
 * @cssprop --hui-badge-ribbon-color - Màu chữ
 * @cssprop --hui-badge-ribbon-top - Khoảng cách từ mép trên (8px)
 * @cssprop --hui-badge-ribbon-height - Chiều cao (22px)
 * @cssprop --hui-badge-ribbon-radius - Bo góc
 * @cssprop --hui-badge-ribbon-font-size - Cỡ chữ
 */
class HuiBadgeRibbon extends HuiElement {
  static properties = {
    /** Chữ trên ruy-băng (hoặc slot="text") */
    text: { type: String },
    /** primary | secondary | success | warning | danger | info hoặc màu CSS bất kỳ */
    color: { type: String, default: 'primary' },
    /** start | end — mép gắn ruy-băng */
    placement: { type: String, default: 'end' },
  };

  static styles = styles;

  render() {
    this._textNode = createElement('span');
    this._text = createElement('span', { className: 'hui-badge-ribbon__text', part: 'text' },
      createElement('slot', { name: 'text' }, this._textNode));
    this._corner = createElement('span', { className: 'hui-badge-ribbon__corner', part: 'corner', 'aria-hidden': 'true' });
    this._ribbon = createElement('div', { part: 'ribbon' }, this._text, this._corner);
    return createElement('div', { className: 'hui-badge-ribbon-wrapper', part: 'base' }, createElement('slot'), this._ribbon);
  }

  updated(changed) {
    if (changed.has('text')) this._textNode.textContent = this.text || '';
    if (changed.has('placement')) {
      const placement = this.placement === 'start' ? 'start' : 'end';
      this._ribbon.className = `hui-badge-ribbon hui-badge-ribbon--${placement}`;
    }
    if (changed.has('color')) {
      const color = this.color || 'primary';
      this._ribbon.style.setProperty('--_ribbon-bg', COLOR_VARIANTS.includes(color) ? `var(--hui-${color})` : color);
    }
  }
}

defineElement('hui-badge-ribbon', HuiBadgeRibbon);

export default HuiBadgeRibbon;
