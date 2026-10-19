/**
 * HUI Confetti — bọc phần tử bất kỳ, bắn pháo giấy khi bấm / khi cuộn tới / khi gọi fire() (A7.5).
 *   <hui-confetti><hui-button>Đặt hàng</hui-button></hui-confetti>
 *   <hui-confetti trigger="visible" count="200"><h2>Chúc mừng!</h2></hui-confetti>
 *   <hui-confetti trigger="manual" id="c"></hui-confetti>  →  c.fire()
 * Dùng confetti() của @itmrhoang/h-ui/effects (canvas tự viết, tự gỡ khi xong).
 * Giảm chuyển động / no-animation → không bắn (sự kiện hui-confetti vẫn phát với detail.skipped = true).
 */

import styles from './hui-confetti.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { animationsDisabled } from '../../utils/animate.js';
import { confetti } from '../../effects/feedback.js';

/**
 * @fires hui-confetti - Vừa bắn (hoặc bỏ qua vì giảm chuyển động). detail: { count, origin: {x, y}, skipped }
 * @slot - Phần tử kích hoạt (nút, thẻ, tiêu đề…)
 * @csspart base - Khung bao nội dung
 */
class HuiConfetti extends HuiElement {
  static properties = {
    /** click | visible | manual — bắn khi bấm phần tử con / khi cuộn tới (1 lần) / chỉ khi gọi fire() */
    trigger: { type: String, default: 'click' },
    /** Số mảnh giấy */
    count: { type: Number, default: 120 },
    /** Độ toả (độ) */
    spread: { type: Number, default: 70 },
    /** Hướng bắn (độ, 90 = thẳng lên) */
    angle: { type: Number, default: 90 },
    /** Vận tốc đầu */
    velocity: { type: Number, default: 13 },
    /** Danh sách màu, phân cách dấu phẩy; nhận tên token. Trống → primary, info, success, warning, danger */
    colors: { type: String },
    /** element | pointer | center — điểm bắn: tâm phần tử được bấm / vị trí con trỏ / giữa màn hình */
    origin: { type: String, default: 'element' },
    /** trigger="click": chỉ bắn lần bấm đầu tiên */
    once: { type: Boolean },
    /** Hiển thị dạng khối (block) thay vì inline-block */
    block: { type: Boolean },
    /** Tắt pháo giấy */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._base = createElement('span', { className: 'cf', part: 'base' }, createElement('slot'));
    this._base.addEventListener('click', (e) => {
      if (this.trigger !== 'click' || (this.once && this._fired)) return;
      const child = [...this.children].find((c) => c.contains(e.target));
      let origin = child || this;
      // Bấm bằng bàn phím → clientX/Y = 0: dùng tâm phần tử
      if (this.origin === 'pointer' && (e.clientX || e.clientY)) origin = { x: e.clientX, y: e.clientY };
      this.fire({ origin });
    });
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._watch();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopView?.();
    this._stopView = null;
  }

  updated(changed) {
    if (changed.has('trigger') && changed.get('trigger') !== undefined) this._watch();
  }

  _watch() {
    this._stopView?.();
    this._stopView = null;
    if (this.trigger !== 'visible' || !this.isConnected) return;
    this._stopView = inView(this, (entry) => {
      if (!entry.isIntersecting) return;
      this._stopView?.();
      this._stopView = null;
      this.fire();
    }, { threshold: 0.5 });
  }

  /**
   * Bắn ngay. `opts` ghi đè thuộc tính (count, spread, colors, origin…) — xem confetti() trong effects.
   * @returns {Promise<void>} resolve khi pháo giấy rơi hết
   */
  fire(opts = {}) {
    this._fired = true;
    let origin = opts.origin;
    if (!origin) origin = this.origin === 'center' ? { x: 0.5, y: 0.5 } : this;
    const skipped = this.noAnimation || animationsDisabled();
    const r = origin instanceof Element ? origin.getBoundingClientRect() : null;
    const point = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : origin;
    this.emit('hui-confetti', { count: this.count, origin: point, skipped });
    if (skipped) return Promise.resolve();
    return confetti({
      count: this.count,
      spread: this.spread,
      angle: this.angle,
      velocity: this.velocity,
      colors: this.colors || undefined,
      ...opts,
      origin,
    });
  }
}

defineElement('hui-confetti', HuiConfetti);

export default HuiConfetti;
