/**
 * HUI Typewriter — gõ chữ từng ký tự, xoay vòng nhiều câu, con trỏ nhấp nháy (A7.3).
 *   <hui-typewriter words='["Nhanh","Đẹp","Dễ dùng"]' loop></hui-typewriter>
 *   <hui-typewriter words="Xin chào|Hello|Bonjour" speed="60" pause="1200" loop></hui-typewriter>
 *   <hui-typewriter>Một câu duy nhất</hui-typewriter>   ← không có words thì gõ nội dung bên trong
 * Trình đọc màn hình nhận toàn bộ danh sách chữ (không bị đọc từng ký tự).
 * Giảm chuyển động / no-animation → hiện ngay câu đầu, không gõ.
 */

import styles from './hui-typewriter.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { animationsDisabled } from '../../utils/animate.js';
import { splitGraphemes, parseWords } from '../../effects/text.js';

/**
 * @fires hui-word - Gõ xong một câu. detail: { word, index }
 * @fires hui-complete - Gõ xong câu cuối (khi không loop)
 * @csspart base - Khung ngoài
 * @csspart text - Phần chữ đang gõ
 * @csspart cursor - Con trỏ
 * @cssprop --hui-typewriter-cursor-color - Màu con trỏ (mặc định --hui-primary)
 * @cssprop --hui-typewriter-cursor-blink - Chu kỳ nhấp nháy (mặc định 1s)
 * @cssprop --hui-typewriter-color - Màu chữ (mặc định kế thừa)
 */
class HuiTypewriter extends HuiElement {
  static properties = {
    /** Danh sách câu: JSON '["a","b"]', chuỗi "a|b|c" hoặc mảng (JS). Trống → dùng nội dung bên trong thẻ */
    words: { type: String, reflect: false },
    /** Tốc độ gõ (ms mỗi ký tự) */
    speed: { type: Number, default: 70 },
    /** Tốc độ xoá (ms mỗi ký tự) */
    deleteSpeed: { type: Number, default: 40 },
    /** Dừng sau khi gõ xong một câu (ms) */
    pause: { type: Number, default: 1500 },
    /** Chờ trước khi bắt đầu (ms) */
    startDelay: { type: Number, default: 0 },
    /** Gõ lại từ đầu sau câu cuối (không loop: dừng ở câu cuối) */
    loop: { type: Boolean },
    /** Ký tự con trỏ */
    cursor: { type: String, default: '|' },
    /** Ẩn con trỏ */
    noCursor: { type: Boolean },
    /** Tắt hiệu ứng gõ: hiện ngay câu đầu */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._sr = createElement('span', { className: 'sr-only' });
    this._text = createElement('span', { className: 'tw__text', part: 'text' });
    this._cursor = createElement('span', { className: 'tw__cursor', part: 'cursor' });
    this._visual = createElement('span', { className: 'tw__visual', 'aria-hidden': 'true' }, this._text, this._cursor);
    this._base = createElement('span', { className: 'tw', part: 'base' }, this._sr, this._visual);
    return this._base;
  }

  connectedCallback() {
    const again = this._hasRendered;
    super.connectedCallback();
    this._visible = true;
    this._stopView = inView(this, (entry) => {
      this._visible = entry.isIntersecting;
      // Cuộn ra khỏi màn hình thì tạm dừng, quay lại thì gõ tiếp
      if (this._visible && this._suspended) {
        this._suspended = false;
        this._schedule(0);
      }
    }, { threshold: 0 });
    if (again) this.start();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopView?.();
    clearTimeout(this._timer);
  }

  updated(changed) {
    if (changed.has('cursor')) this._cursor.textContent = this.cursor;
    if (changed.has('noCursor')) this._cursor.hidden = this.noCursor;
    if (changed.has('words') || changed.has('loop') || changed.has('noAnimation')) this.start();
  }

  /** Danh sách câu đang dùng */
  get wordList() {
    const list = parseWords(this.words);
    if (list.length) return list;
    const own = this.textContent.trim();
    return own ? [own] : [];
  }

  /** Câu đang hiển thị (đầy đủ hay đang gõ dở) */
  get currentText() {
    return this._text?.textContent ?? '';
  }

  /** Bắt đầu lại từ câu đầu */
  start() {
    if (!this._hasRendered) return;
    clearTimeout(this._timer);
    this._suspended = false;
    const list = this.wordList;
    this._list = list;
    this._sr.textContent = list.join(', ');
    this._index = 0;
    this._pos = 0;
    this._phase = 'typing';
    this._text.textContent = '';
    if (!list.length) return;
    const still = this.noAnimation || animationsDisabled();
    this._base.classList.toggle('tw--static', still);
    if (still) {
      this._text.textContent = list[0];
      this._setTyping(false);
      return;
    }
    this._chars = splitGraphemes(list[0]);
    this._schedule(this.startDelay);
  }

  /** Dừng tại chỗ (giữ nguyên chữ đang hiện) */
  stop() {
    clearTimeout(this._timer);
    this._phase = 'stopped';
    this._setTyping(false);
  }

  _schedule(ms) {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._tick(), Math.max(0, ms));
  }

  _setTyping(on) {
    // Đang gõ / xoá: con trỏ sáng liên tục; dừng: nhấp nháy
    this._cursor.classList.toggle('tw__cursor--solid', on);
  }

  _tick() {
    if (!this.isConnected || this._phase === 'stopped') return;
    if (!this._visible) {
      this._suspended = true;
      return;
    }
    const list = this._list;
    if (this._phase === 'typing') {
      this._setTyping(true);
      this._pos += 1;
      this._text.textContent = this._chars.slice(0, this._pos).join('');
      if (this._pos < this._chars.length) {
        this._schedule(this.speed);
        return;
      }
      this._setTyping(false);
      this.emit('hui-word', { word: list[this._index], index: this._index });
      const last = this._index === list.length - 1;
      if (last && !this.loop) {
        this._phase = 'stopped';
        this.emit('hui-complete');
        return;
      }
      // Chỉ 1 câu + loop: gõ lại câu đó sau khi xoá
      this._phase = 'deleting';
      this._schedule(this.pause);
      return;
    }
    if (this._phase === 'deleting') {
      this._setTyping(true);
      this._pos -= 1;
      this._text.textContent = this._chars.slice(0, Math.max(0, this._pos)).join('');
      if (this._pos > 0) {
        this._schedule(this.deleteSpeed);
        return;
      }
      this._index = (this._index + 1) % list.length;
      this._chars = splitGraphemes(list[this._index]);
      this._phase = 'typing';
      this._schedule(this.speed * 3);
    }
  }
}

defineElement('hui-typewriter', HuiTypewriter);

export default HuiTypewriter;
