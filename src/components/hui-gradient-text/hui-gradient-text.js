/**
 * HUI Gradient Text — chữ tô gradient chạy chậm (background-clip: text) (A7.3).
 *   <h1><hui-gradient-text>Tiêu đề nổi bật</hui-gradient-text></h1>
 *   <hui-gradient-text colors="danger, warning, success" angle="45" duration="3000">…</hui-gradient-text>
 * Màu mặc định lấy từ token (primary → info → success) → đổi theme là đổi theo.
 * Giảm chuyển động / no-animation → gradient đứng yên. Chế độ tương phản cao → chữ thường.
 */

import styles from './hui-gradient-text.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { parseColors } from '../../effects/colors.js';
import { watchMotion } from '../../effects/motion-watch.js';

/**
 * @slot - Nội dung chữ
 * @csspart base - Khung chữ mang gradient
 * @cssprop --hui-gradient-text-colors - Danh sách màu gradient (ghi đè attribute colors), vd "red, blue"
 * @cssprop --hui-gradient-text-duration - Chu kỳ chạy (ghi đè attribute duration), vd 3s
 */
class HuiGradientText extends HuiElement {
  static properties = {
    /** Danh sách màu, phân cách dấu phẩy; nhận tên token: "primary, info-5, #f43f5e" */
    colors: { type: String, default: 'primary, info, success' },
    /** Góc gradient (độ) */
    angle: { type: Number, default: 90 },
    /** Chu kỳ chạy (ms) */
    duration: { type: Number, default: 6000 },
    /** Gradient đứng yên */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._base = createElement('span', { className: 'gt', part: 'base' }, createElement('slot'));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._stopMotion = watchMotion((off) => this._base.classList.toggle('is-still', off));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopMotion?.();
  }

  updated(changed) {
    if (changed.has('colors')) {
      const list = parseColors(this.colors, ['primary', 'info', 'success']);
      // Lặp lại màu đầu ở cuối → chạy qua lại không bị "đứt" màu
      this._base.style.setProperty('--_gt-colors', [...list, list[0]].join(', '));
    }
    if (changed.has('angle')) this._base.style.setProperty('--_gt-angle', `${Number(this.angle) || 0}deg`);
    if (changed.has('duration')) this._base.style.setProperty('--_gt-duration', `${Math.max(100, Number(this.duration) || 6000)}ms`);
  }
}

defineElement('hui-gradient-text', HuiGradientText);

export default HuiGradientText;
