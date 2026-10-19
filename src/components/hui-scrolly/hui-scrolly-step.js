/**
 * HUI Scrolly Step — một bước trong <hui-scrolly>. Cao tối thiểu 80vh để mỗi lần chỉ một bước cắt qua giữa màn hình;
 * bước không hiện tại bị làm mờ. `active` do hui-scrolly tự gắn.
 */

import styles from './hui-scrolly-step.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/**
 * @slot - Nội dung bước
 * @csspart base - Khung nội dung (thẻ nổi)
 * @cssprop --hui-scrolly-step-min-height - Chiều cao tối thiểu mỗi bước (mặc định 80vh)
 * @cssprop --hui-scrolly-step-align - Căn khung nội dung theo chiều dọc: center | start | end (mặc định center)
 * @cssprop --hui-scrolly-step-bg - Nền khung nội dung (mặc định --hui-bg-elevated)
 * @cssprop --hui-scrolly-step-padding - Đệm khung nội dung (mặc định --hui-space-xl)
 * @cssprop --hui-scrolly-step-radius - Bo góc (mặc định --hui-radius-lg)
 * @cssprop --hui-scrolly-step-shadow - Bóng (mặc định --hui-shadow-md)
 * @cssprop --hui-scrolly-step-inactive-opacity - Độ mờ bước không hiện tại (mặc định 0.4)
 * @cssprop --hui-scrolly-step-active-border - Viền trái bước hiện tại (mặc định 3px solid --hui-primary)
 */
class HuiScrollyStep extends HuiElement {
  static properties = {
    /** Bước đang hiện tại (hui-scrolly tự gắn) */
    active: { type: Boolean },
  };

  static styles = styles;

  render() {
    return createElement('div', { className: 'step', part: 'base' }, createElement('slot'));
  }
}

defineElement('hui-scrolly-step', HuiScrollyStep);

export default HuiScrollyStep;
