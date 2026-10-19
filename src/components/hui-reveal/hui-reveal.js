/**
 * HUI Reveal — bọc nội dung để hiện dần khi cuộn tới (dạng component của directive data-hui-animate).
 *   <hui-reveal effect="fade-up">…</hui-reveal>
 *   <hui-reveal effect="zoom-in" stagger="80">  ← các con hiện lần lượt
 *   <hui-reveal effect="fade" once="false">     ← cuộn ra rồi vào lại thì chạy lại
 * Dùng chung lõi runAnimation với directive → cùng danh sách hiệu ứng, cùng cách tắt
 * (no-animation, html[data-hui-no-animation], token --hui-motion-duration: 0ms, prefers-reduced-motion).
 */

import styles from './hui-reveal.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { runAnimation, animationsDisabled, ANIMATIONS } from '../../utils/animate.js';

/**
 * @fires hui-reveal - Nội dung vừa được hiện. detail: { effect }
 * @fires hui-hide - Nội dung trở lại trạng thái ẩn (chỉ khi once="false")
 * @slot - Nội dung hiện dần
 * @csspart base - Khung bao nội dung
 * @cssprop --hui-reveal-hidden-opacity - Độ mờ khi chưa hiện (mặc định 0)
 */
class HuiReveal extends HuiElement {
  static properties = {
    /** fade | fade-up | fade-down | fade-left | fade-right | zoom-in | zoom-out | flip-up | blur-in | slide-up */
    effect: { type: String, default: 'fade-up' },
    /** Thời lượng (ms) */
    duration: { type: Number, default: 600 },
    /** Trễ trước khi chạy (ms) */
    delay: { type: Number, default: 0 },
    /** > 0: chạy lần lượt cho từng phần tử con, cách nhau N ms */
    stagger: { type: Number, default: 0 },
    /** true | false — false: cuộn ra khỏi màn hình rồi vào lại thì chạy lại */
    once: { type: String, default: 'true' },
    /** Tỉ lệ diện tích phải nhìn thấy trước khi chạy (0–1) */
    threshold: { type: Number, default: 0.15 },
    /** rootMargin của IntersectionObserver, vd "0px 0px -10% 0px" (chạy sớm/muộn hơn) */
    offset: { type: String, default: '0px 0px -10% 0px' },
    /** Hiển thị dạng inline-block thay vì block */
    inline: { type: Boolean },
    /** Tắt hiệu ứng: nội dung hiện ngay */
    noAnimation: { type: Boolean },
    /** (chỉ đọc) Đã hiện hay chưa — CSS dùng hui-reveal[revealed] */
    revealed: { type: Boolean },
  };

  static styles = styles;

  render() {
    return createElement('div', { className: 'reveal', part: 'base' }, createElement('slot'));
  }

  connectedCallback() {
    super.connectedCallback();
    this._observe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stop?.();
    this._stop = null;
  }

  updated(changed) {
    // Đổi ngưỡng/vùng quan sát → theo dõi lại với cấu hình mới
    if ((changed.has('threshold') || changed.has('offset') || changed.has('once')) && changed.get('threshold') !== undefined) {
      this._observe();
    }
    this.toggleAttribute('data-stagger', this.stagger > 0);
  }

  _observe() {
    this._stop?.();
    if (!this.isConnected) return;
    const once = this.once !== 'false';
    this._stop = inView(this, (entry) => {
      if (entry.isIntersecting) {
        if (!this.revealed) this.reveal();
        if (once) {
          this._stop?.();
          this._stop = null;
        }
      } else if (!once && this.revealed && entry.boundingClientRect.top > 0) {
        // Chỉ ẩn lại khi phần tử trôi xuống dưới (người dùng cuộn ngược lên) — tránh nháy khi cuộn qua
        this.hide();
      }
    }, { threshold: this.threshold, rootMargin: this.offset });
  }

  /** Hiện ngay (chạy hiệu ứng nếu không bị tắt) */
  reveal() {
    this.revealed = true;
    if (!this.noAnimation && !animationsDisabled()) {
      const targets = this.stagger > 0 ? [...this.children] : [this.shadowRoot.querySelector('.reveal')];
      runAnimation(targets, ANIMATIONS[this.effect] ? this.effect : 'fade-up', {
        duration: this.duration, delay: this.delay, stagger: this.stagger,
      });
    }
    this.emit('hui-reveal', { effect: this.effect });
  }

  /** Đưa về trạng thái chưa hiện (lần cuộn tới sau sẽ chạy lại) */
  hide() {
    this.revealed = false;
    this.emit('hui-hide');
  }
}

defineElement('hui-reveal', HuiReveal);

export default HuiReveal;
