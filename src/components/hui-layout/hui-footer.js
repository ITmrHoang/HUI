/**
 * HUI Footer — Chân trang trong hui-layout (Ant Layout.Footer)
 */

import styles from './hui-footer.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/**
 * @slot - Nội dung chân trang
 * @cssprop --hui-footer-padding - Khoảng đệm (mặc định 24px 48px)
 * @cssprop --hui-footer-bg - Màu nền (mặc định trong suốt)
 * @cssprop --hui-footer-color - Màu chữ (mặc định --hui-text-secondary)
 * @cssprop --hui-footer-font-size - Cỡ chữ (mặc định --hui-font-sm)
 * @cssprop --hui-footer-border-color - Màu viền trên (mặc định không có)
 */
class HuiFooter extends HuiElement {
  static styles = styles;

  render() {
    return createElement('slot');
  }
}

defineElement('hui-footer', HuiFooter);

export default HuiFooter;
