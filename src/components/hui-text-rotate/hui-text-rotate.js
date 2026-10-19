/**
 * HUI Text Rotate — đổi lần lượt từ khoá ngay trong câu (A7.3).
 *   <h1>Xây giao diện <hui-text-rotate words="nhanh|đẹp|dễ tiếp cận"></hui-text-rotate> hơn</h1>
 *   <hui-text-rotate words='["React","Vue","HTML"]' effect="flip" interval="2000"></hui-text-rotate>
 * Bề rộng co giãn mượt theo từ mới (câu xung quanh không bị giật).
 * Giảm chuyển động / no-animation → vẫn đổi từ nhưng tức thì, không chuyển động.
 */

import styles from './hui-text-rotate.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { animationsDisabled } from '../../utils/animate.js';
import { parseWords } from '../../effects/text.js';

const EASE = 'cubic-bezier(0.645, 0.045, 0.355, 1)';

/** Keyframes vào / ra của từng kiểu */
const EFFECTS = {
  slide: {
    in: [{ transform: 'translateY(100%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    out: [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-100%)', opacity: 0 }],
  },
  fade: {
    in: [{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'none' }],
    out: [{ opacity: 1, filter: 'none' }, { opacity: 0, filter: 'blur(4px)' }],
  },
  flip: {
    in: [{ transform: 'rotateX(-90deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    out: [{ transform: 'none', opacity: 1 }, { transform: 'rotateX(90deg)', opacity: 0 }],
  },
};

/**
 * @fires hui-rotate - Vừa đổi sang từ mới. detail: { index, word }
 * @csspart base - Khung ngoài
 * @csspart viewport - Khung chứa từ (co giãn bề rộng)
 * @csspart word - Từ đang hiện
 * @cssprop --hui-text-rotate-color - Màu từ khoá (mặc định --hui-primary)
 * @cssprop --hui-text-rotate-weight - Độ đậm từ khoá (mặc định kế thừa)
 * @cssprop --hui-text-rotate-bg - Nền khung từ khoá (mặc định trong suốt)
 * @cssprop --hui-text-rotate-padding - Khoảng đệm khung từ khoá (mặc định 0)
 * @cssprop --hui-text-rotate-radius - Bo góc khung từ khoá
 */
class HuiTextRotate extends HuiElement {
  static properties = {
    /** Danh sách từ: JSON '["a","b"]', chuỗi "a|b|c" hoặc mảng (JS) */
    words: { type: String, reflect: false },
    /** Thời gian giữa hai lần đổi (ms) */
    interval: { type: Number, default: 2500 },
    /** slide | fade | flip — kiểu chuyển */
    effect: { type: String, default: 'slide' },
    /** Thời lượng chuyển (ms) */
    duration: { type: Number, default: 500 },
    /** Tạm dừng tự đổi */
    paused: { type: Boolean },
    /** Tắt chuyển động (vẫn đổi từ) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._sr = createElement('span', { className: 'sr-only' });
    this._viewport = createElement('span', { className: 'tr__viewport', part: 'viewport', 'aria-hidden': 'true' });
    return createElement('span', { className: 'tr', part: 'base' }, this._sr, this._viewport);
  }

  connectedCallback() {
    const again = this._hasRendered;
    super.connectedCallback();
    this._visible = true;
    this._stopView = inView(this, (entry) => {
      this._visible = entry.isIntersecting;
      if (this._visible) this._schedule();
    }, { threshold: 0 });
    if (again) this._schedule();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopView?.();
    clearTimeout(this._timer);
  }

  updated(changed) {
    if (changed.has('words')) {
      this._list = parseWords(this.words);
      this._sr.textContent = this._list.join(', ');
      this._index = 0;
      this._viewport.replaceChildren();
      if (this._list.length) this._viewport.append(this._word(this._list[0]));
    }
    if (changed.has('words') || changed.has('interval') || changed.has('paused')) this._schedule();
  }

  /** Vị trí từ đang hiện */
  get index() {
    return this._index ?? 0;
  }

  /** Từ đang hiện */
  get currentWord() {
    return this._list?.[this.index] ?? '';
  }

  _word(text) {
    return createElement('span', { className: 'tr__word', part: 'word' }, text);
  }

  _schedule() {
    clearTimeout(this._timer);
    if (this.paused || !this.isConnected || (this._list?.length ?? 0) < 2) return;
    this._timer = setTimeout(() => {
      if (!this._visible) return; // ngoài màn hình: chờ quay lại (inView gọi _schedule)
      this.next();
    }, Math.max(300, this.interval));
  }

  /** Chuyển sang từ kế tiếp ngay */
  next() {
    if (!this._list?.length) return;
    this._goto((this.index + 1) % this._list.length);
    this._schedule();
  }

  _goto(index) {
    const word = this._list[index];
    const vp = this._viewport;
    const oldEl = vp.querySelector('.tr__word:not(.tr__word--leaving)');
    const newEl = this._word(word);
    this._index = index;
    const still = this.noAnimation || animationsDisabled();
    if (still || !oldEl || typeof vp.animate !== 'function') {
      vp.replaceChildren(newEl);
    } else {
      // Bỏ các từ đang rời đi dở dang (đổi liên tục nhanh)
      vp.querySelectorAll('.tr__word--leaving').forEach((n) => n.remove());
      const from = oldEl.getBoundingClientRect().width;
      oldEl.classList.add('tr__word--leaving');
      vp.append(newEl);
      const to = newEl.getBoundingClientRect().width;
      const fx = EFFECTS[this.effect] || EFFECTS.slide;
      const opts = { duration: this.duration, easing: EASE };
      vp.animate([{ width: `${from}px` }, { width: `${to}px` }], opts);
      newEl.animate(fx.in, { ...opts, fill: 'backwards' });
      oldEl.animate(fx.out, { ...opts, fill: 'forwards' }).finished.then(() => oldEl.remove(), () => oldEl.remove());
    }
    this.emit('hui-rotate', { index, word });
  }
}

defineElement('hui-text-rotate', HuiTextRotate);

export default HuiTextRotate;
