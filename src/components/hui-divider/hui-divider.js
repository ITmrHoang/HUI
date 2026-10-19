/**
 * HUI Divider — Đường phân cách (Ant Divider + MUI Divider)
 * Ngang (có thể kèm chữ) hoặc dọc (chen giữa phần tử inline).
 * Parts: base, text · Slot: (mặc định) = chữ trên đường kẻ (chỉ divider ngang)
 * Biến CSS: xem đầu hui-divider.css
 */

import styles from './hui-divider.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const ALIGNS = ['center', 'left', 'right'];
const VARIANTS = ['solid', 'dashed', 'dotted'];

/**
 * @slot - Chữ nằm trên đường kẻ (chỉ với divider ngang)
 * @csspart base - Đường kẻ (role="separator"); 2 đoạn kẻ khi có chữ là ::before / ::after
 * @csspart text - Vùng chữ
 * @cssprop --hui-divider-color - Màu đường kẻ (attribute color thắng)
 * @cssprop --hui-divider-thickness - Độ dày nét (mặc định 1px)
 * @cssprop --hui-divider-text-color - Màu chữ
 * @cssprop --hui-divider-font-size - Cỡ chữ
 * @cssprop --hui-divider-font-weight - Độ đậm chữ
 * @cssprop --hui-divider-text-padding - Khoảng đệm hai bên chữ (mặc định 0 1em)
 * @cssprop --hui-divider-text-offset - Độ dài đoạn kẻ ngắn khi text-align left/right (mặc định 5%)
 * @cssprop --hui-divider-inset - Thụt lề trái khi có inset (mặc định 72px)
 * @cssprop --hui-divider-vertical-height - Chiều cao divider dọc (mặc định 0.9em)
 */
class HuiDivider extends HuiElement {
  static properties = {
    /** horizontal | vertical */
    orientation: { type: String, default: 'horizontal' },
    /** center | left | right — vị trí chữ trên divider ngang */
    textAlign: { type: String, default: 'center' },
    /** solid | dashed | dotted */
    variant: { type: String, default: 'solid' },
    /** Chữ nhỏ, mảnh, nhạt hơn (Ant plain) */
    plain: { type: Boolean },
    /** none | sm | md | lg — khoảng cách trên/dưới (dọc: hai bên) */
    spacing: { type: String },
    /** Thụt lề trái (MUI inset). Để trống = 72px, hoặc độ dài CSS (vd: 40px) */
    inset: { type: String },
    /** Màu đường kẻ (mã màu CSS bất kỳ) */
    color: { type: String },
  };

  static styles = styles;

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncText());
    this._text = createElement('span', { className: 'hui-divider__text', part: 'text' }, this._slot);
    this._base = createElement('div', { role: 'separator', part: 'base' }, this._text);
    return this._base;
  }

  updated() {
    const vertical = this.orientation === 'vertical';
    const align = ALIGNS.includes(this.textAlign) ? this.textAlign : 'center';
    const variant = VARIANTS.includes(this.variant) ? this.variant : 'solid';
    // inset: null/'false' = tắt; '' / 'true' = mặc định 72px; còn lại = độ dài CSS
    const inset = this.inset;
    const insetOn = inset !== null && inset !== 'false';
    const insetLength = insetOn && inset !== '' && inset !== 'true' ? inset : '';

    this._base.className = [
      'hui-divider',
      vertical ? 'hui-divider--vertical' : 'hui-divider--horizontal',
      `hui-divider--${variant}`,
      vertical ? '' : `hui-divider--${align}`,
      this.plain ? 'hui-divider--plain' : '',
      insetOn && !vertical ? 'hui-divider--inset' : '',
    ].filter(Boolean).join(' ');
    this._base.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');

    // Giá trị tùy biến truyền qua biến nội bộ (attribute thắng biến CSS công khai)
    if (this.color) this._base.style.setProperty('--_divider-color', this.color);
    else this._base.style.removeProperty('--_divider-color');
    if (insetLength) this._base.style.setProperty('--_divider-inset', insetLength);
    else this._base.style.removeProperty('--_divider-inset');

    this._syncText();
  }

  /** Có chữ thật (bỏ qua khoảng trắng do format HTML) → layout 2 đoạn kẻ hai bên chữ */
  _syncText() {
    const hasText = this._slot.assignedNodes().some((node) =>
      node.nodeType === Node.TEXT_NODE ? node.textContent.trim() !== '' : node.nodeType === Node.ELEMENT_NODE
    );
    this._base.classList.toggle('hui-divider--with-text', this.orientation !== 'vertical' && hasText);
  }
}

defineElement('hui-divider', HuiDivider);

export default HuiDivider;
