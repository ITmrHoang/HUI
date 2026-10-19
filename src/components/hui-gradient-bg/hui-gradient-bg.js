/**
 * HUI Gradient Bg — khung nền gradient chuyển động chậm (A7.4), dùng cho hero / banner / CTA.
 *   <hui-gradient-bg>…nội dung…</hui-gradient-bg>                       ← mesh (mặc định)
 *   <hui-gradient-bg variant="linear" colors="primary, info, success" angle="120">…</hui-gradient-bg>
 * Màu mặc định là sắc độ nhạt của token → chữ bên trên vẫn đủ tương phản, dark mode tự đổi theo.
 * Giảm chuyển động / no-animation → nền đứng yên.
 */

import styles from './hui-gradient-bg.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { parseColors } from '../../effects/colors.js';
import { watchMotion } from '../../effects/motion-watch.js';

const DEFAULT_COLORS = ['primary-4', 'info-3', 'success-3', 'danger-3'];

/**
 * @slot - Nội dung nằm trên nền
 * @csspart base - Khung ngoài
 * @csspart layer - Lớp gradient
 * @csspart content - Khung nội dung
 * @cssprop --hui-gradient-bg-base - Màu nền dưới gradient mesh (mặc định --hui-bg-container)
 * @cssprop --hui-gradient-bg-opacity - Độ đậm lớp gradient (mặc định 1)
 * @cssprop --hui-gradient-bg-blur - Làm mờ lớp gradient (mặc định 0px)
 * @cssprop --hui-gradient-bg-radius - Bo góc (mặc định 0)
 * @cssprop --hui-gradient-bg-padding - Khoảng đệm nội dung (mặc định 0)
 * @cssprop --hui-gradient-bg-min-height - Chiều cao tối thiểu (mặc định auto)
 * @cssprop --hui-gradient-bg-color - Màu chữ nội dung (mặc định --hui-text)
 */
class HuiGradientBg extends HuiElement {
  static properties = {
    /** mesh | linear — mesh: các đốm màu xoay chậm; linear: dải gradient trôi qua lại */
    variant: { type: String, default: 'mesh' },
    /** Danh sách màu, phân cách dấu phẩy; nhận tên token: "primary-4, info-3, #fde68a" */
    colors: { type: String },
    /** Góc gradient (độ, variant="linear") */
    angle: { type: Number, default: 120 },
    /** Chu kỳ chuyển động (ms) */
    duration: { type: Number, default: 18000 },
    /** Nền đứng yên */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._layer = createElement('div', { className: 'gbg__layer', part: 'layer', 'aria-hidden': 'true' });
    this._base = createElement('div', { className: 'gbg', part: 'base' },
      this._layer,
      createElement('div', { className: 'gbg__content', part: 'content' }, createElement('slot')));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._stopMotion = watchMotion((off) => this._base.classList.toggle('is-still', off));
    // Lớp mesh xoay tròn: cạnh hình vuông ≥ đường chéo khung → xoay góc nào cũng phủ kín
    this._ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      this._layer.style.setProperty('--_gbg-side', `${Math.ceil(Math.hypot(width, height) * 1.2)}px`);
    });
    this._ro.observe(this._base);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopMotion?.();
    this._ro?.disconnect();
  }

  updated(changed) {
    const s = this._layer.style;
    if (changed.has('colors')) {
      const list = parseColors(this.colors, DEFAULT_COLORS);
      for (let i = 0; i < 4; i++) s.setProperty(`--_gbg-c${i + 1}`, list[i % list.length]);
      s.setProperty('--_gbg-list', [...list, list[0]].join(', '));
    }
    if (changed.has('variant')) this._base.classList.toggle('gbg--linear', this.variant === 'linear');
    if (changed.has('angle')) s.setProperty('--_gbg-angle', `${Number(this.angle) || 0}deg`);
    if (changed.has('duration')) s.setProperty('--_gbg-duration', `${Math.max(1000, Number(this.duration) || 18000)}ms`);
  }
}

defineElement('hui-gradient-bg', HuiGradientBg);

export default HuiGradientBg;
