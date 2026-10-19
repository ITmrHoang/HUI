/**
 * HUI Divider — Đường phân cách nội dung (Web Component Vanilla JS)
 *
 * Kết hợp API của Ant Design Divider + MUI Divider:
 * - orientation: horizontal (ngang, mặc định) / vertical (dọc, dùng giữa các phần tử inline)
 * - text-align: vị trí chữ trên đường ngang (center, left, right) — tương đương `orientation` của Ant
 * - variant: solid, dashed, dotted
 * - plain: chữ nhỏ và mảnh hơn (Ant `plain`)
 * - spacing: khoảng cách trên/dưới (none, sm, md, lg)
 * - inset: thụt lề trái (MUI `variant="inset"`)
 * - color: ghi đè màu đường kẻ
 */

import styles from './hui-divider.css?raw';
import { createElement, createStyle, ensureTokens } from '../../utils/dom.js';

const ALIGNS = ['center', 'left', 'right'];
const VARIANTS = ['solid', 'dashed', 'dotted'];

class HuiDivider extends HTMLElement {
  static get observedAttributes() {
    return ['orientation', 'text-align', 'variant', 'plain', 'spacing', 'inset', 'color'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null;
    this._stylesInjected = false;
  }

  // =====================================================
  // LIFECYCLE CALLBACKS
  // =====================================================

  connectedCallback() {
    // Chỉ chèn style một lần, tránh nhân bản khi element bị gỡ ra rồi gắn lại
    if (!this._stylesInjected) {
      ensureTokens();
      this.shadowRoot.appendChild(createStyle(styles));
      this._stylesInjected = true;
    }
    if (!this._wrapper) this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (this._wrapper) this._render();
  }

  // =====================================================
  // SLOT HELPERS
  // =====================================================

  /**
   * Kiểm tra slot mặc định có nội dung thật hay không.
   * Text chỉ toàn khoảng trắng / xuống dòng (do format HTML) không được tính là có chữ.
   */
  _hasText() {
    return Array.from(this.childNodes).some((node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim() !== '';
      return node.nodeType === Node.ELEMENT_NODE && !node.hasAttribute('slot');
    });
  }

  /** Có chữ → dùng layout flex với 2 đoạn kẻ 2 bên; không có → chỉ là 1 đường kẻ */
  _updateSlotState() {
    if (!this._wrapper) return;
    const vertical = this.getAttribute('orientation') === 'vertical';
    this._wrapper.classList.toggle('hui-divider--with-text', !vertical && this._hasText());
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  _render() {
    if (this._wrapper) this._wrapper.remove();

    const vertical = this.getAttribute('orientation') === 'vertical';
    const alignAttr = this.getAttribute('text-align');
    const align = ALIGNS.includes(alignAttr) ? alignAttr : 'center';
    const variantAttr = this.getAttribute('variant');
    const variant = VARIANTS.includes(variantAttr) ? variantAttr : 'solid';
    const plain = this.hasAttribute('plain');
    const color = this.getAttribute('color');
    const inset = this.getAttribute('inset'); // null = không thụt; '' = mặc định 72px; giá trị khác = độ dài CSS

    const classes = [
      'hui-divider',
      vertical ? 'hui-divider--vertical' : 'hui-divider--horizontal',
      `hui-divider--${variant}`,
      !vertical ? `hui-divider--${align}` : '',
      plain ? 'hui-divider--plain' : '',
      inset !== null && !vertical ? 'hui-divider--inset' : '',
    ].filter(Boolean).join(' ');

    // role="separator" + aria-orientation để trình đọc màn hình hiểu đây là đường phân cách
    this._wrapper = createElement('div', {
      className: classes,
      role: 'separator',
      'aria-orientation': vertical ? 'vertical' : 'horizontal',
      part: 'base',
    });

    // Divider dọc không hiển thị chữ (giống Ant/MUI) → không cần slot
    if (!vertical) {
      const slot = createElement('slot');
      // slotchange: chữ được thêm/xóa động → cập nhật lại layout
      slot.addEventListener('slotchange', () => this._updateSlotState());
      this._wrapper.appendChild(createElement('span', { className: 'hui-divider__text' }, slot));
    }

    // Truyền giá trị tùy biến qua CSS custom property nội bộ (an toàn, không cần sinh CSS động)
    if (color) this._wrapper.style.setProperty('--_divider-color', color);
    if (inset) this._wrapper.style.setProperty('--_divider-inset', inset);

    this.shadowRoot.appendChild(this._wrapper);
    this._updateSlotState();
  }
}

if (!customElements.get('hui-divider')) {
  customElements.define('hui-divider', HuiDivider);
}

export default HuiDivider;
