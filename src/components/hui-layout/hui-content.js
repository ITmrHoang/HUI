/**
 * HUI Content — Vùng nội dung chính trong hui-layout (Ant Layout.Content)
 * Chiếm toàn bộ không gian còn lại (flex: auto).
 */

import styles from './hui-content.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/**
 * @slot - Nội dung trang
 * @cssprop --hui-content-padding - Khoảng đệm (mặc định 24px)
 * @cssprop --hui-content-bg - Màu nền (mặc định trong suốt = nền của hui-layout)
 */
class HuiContent extends HuiElement {
  static styles = styles;

  render() {
    return createElement('slot');
  }
}

defineElement('hui-content', HuiContent);

export default HuiContent;
