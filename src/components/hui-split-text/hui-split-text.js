/**
 * HUI Split Text — tách chữ thành từng từ / ký tự và cho hiện lần lượt khi cuộn tới (A7.3).
 *   <h2><hui-split-text>Thiết kế đẹp, chạy nhanh</hui-split-text></h2>
 *   <hui-split-text by="chars" effect="blur-in" stagger="30">Từng ký tự</hui-split-text>
 * Chỉ nhận chữ thuần (thẻ con được đọc dưới dạng chữ). Trình đọc màn hình đọc nguyên câu
 * (bản sao ẩn) — các mảnh tách ra được aria-hidden. Dùng chung lõi hiệu ứng với data-hui-animate.
 */

import styles from './hui-split-text.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { runAnimation, animationsDisabled, ANIMATIONS } from '../../utils/animate.js';
import { splitGraphemes } from '../../effects/text.js';

/**
 * @fires hui-reveal - Đã chạy hiệu ứng hiện. detail: { effect, count }
 * @csspart base - Khung chứa các mảnh chữ
 * @csspart word - Mỗi từ
 * @csspart char - Mỗi ký tự (by="chars")
 * @cssprop --hui-split-text-hidden-opacity - Độ mờ của mảnh chưa hiện (mặc định 0)
 */
class HuiSplitText extends HuiElement {
  static properties = {
    /** words | chars — tách theo từ hay theo ký tự */
    by: { type: String, default: 'words' },
    /** fade | fade-up | fade-down | fade-left | fade-right | zoom-in | zoom-out | flip-up | blur-in | slide-up */
    effect: { type: String, default: 'fade-up' },
    /** Khoảng cách giữa hai mảnh (ms) */
    stagger: { type: Number, default: 50 },
    /** Thời lượng mỗi mảnh (ms) */
    duration: { type: Number, default: 500 },
    /** Trễ trước khi chạy (ms) */
    delay: { type: Number, default: 0 },
    /** true | false — false: cuộn ra rồi vào lại thì chạy lại */
    once: { type: String, default: 'true' },
    /** Tỉ lệ diện tích nhìn thấy trước khi chạy (0–1) */
    threshold: { type: Number, default: 0.2 },
    /** Tắt hiệu ứng: hiện ngay */
    noAnimation: { type: Boolean },
    /** (chỉ đọc) Đã hiện hay chưa */
    revealed: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._sr = createElement('span', { className: 'sr-only' });
    this._base = createElement('span', { className: 'st', part: 'base', 'aria-hidden': 'true' });
    return [this._sr, this._base];
  }

  connectedCallback() {
    super.connectedCallback();
    // Nội dung bên trong đổi (framework render lại) → tách lại
    this._mo = new MutationObserver(() => this._split());
    this._mo.observe(this, { childList: true, characterData: true, subtree: true });
    this._observe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mo?.disconnect();
    this._stop?.();
    this._stop = null;
  }

  updated(changed) {
    if (changed.has('by')) this._split();
    if ((changed.has('threshold') || changed.has('once')) && changed.get('threshold') !== undefined) this._observe();
  }

  /** Các mảnh đang được hiệu ứng (từ hoặc ký tự) */
  get pieces() {
    return [...this._base.querySelectorAll(this.by === 'chars' ? '.st__char' : '.st__word')];
  }

  _split() {
    const text = this.textContent.replace(/\s+/g, ' ').trim();
    this._sr.textContent = text;
    const chars = this.by === 'chars';
    const nodes = [];
    text.split(' ').filter(Boolean).forEach((w, i) => {
      if (i) nodes.push(document.createTextNode(' '));
      const word = createElement('span', { className: 'st__word', part: 'word' });
      if (chars) {
        for (const c of splitGraphemes(w)) word.append(createElement('span', { className: 'st__char', part: 'char' }, c));
      } else word.textContent = w;
      nodes.push(word);
    });
    this._base.replaceChildren(...nodes);
    this._base.classList.toggle('st--chars', chars);
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
        this.reset();
      }
    }, { threshold: this.threshold });
  }

  /** Chạy hiệu ứng hiện ngay */
  reveal() {
    const pieces = this.pieces;
    this.revealed = true;
    if (!this.noAnimation && !animationsDisabled()) {
      runAnimation(pieces, ANIMATIONS[this.effect] ? this.effect : 'fade-up', {
        duration: this.duration, delay: this.delay, stagger: this.stagger,
      });
    }
    this.emit('hui-reveal', { effect: this.effect, count: pieces.length });
  }

  /** Đưa về trạng thái chưa hiện (lần cuộn tới sau sẽ chạy lại) */
  reset() {
    this.pieces.forEach((p) => p.getAnimations().forEach((a) => a.cancel()));
    this.revealed = false;
  }
}

defineElement('hui-split-text', HuiSplitText);

export default HuiSplitText;
