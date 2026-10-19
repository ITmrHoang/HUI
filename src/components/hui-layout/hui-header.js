/**
 * HUI Header — Thanh đầu trang trong hui-layout (Ant Layout.Header + MUI AppBar tĩnh)
 * Chính :host là khung flex ngang; sticky → dính trên cùng khi cuộn.
 */

import styles from './hui-header.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/**
 * @slot - Nội dung (logo, menu, hành động)
 * @cssprop --hui-header-height - Chiều cao (mặc định 64px)
 * @cssprop --hui-header-padding-x - Khoảng đệm ngang (mặc định 24px)
 * @cssprop --hui-header-bg - Màu nền (mặc định --hui-bg-container)
 * @cssprop --hui-header-color - Màu chữ
 * @cssprop --hui-header-border-color - Màu viền dưới
 * @cssprop --hui-header-shadow - Đổ bóng (mặc định không có)
 */
class HuiHeader extends HuiElement {
  static properties = {
    /** Dính trên cùng khi cuộn (position: sticky) */
    sticky: { type: Boolean },
  };

  static styles = styles;

  render() {
    return createElement('slot');
  }
}

defineElement('hui-header', HuiHeader);

export default HuiHeader;
