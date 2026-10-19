/**
 * HUI Announcement Bar — Dải thông báo đầu trang (khuyến mãi, sự kiện), đóng được + nhớ trạng thái,
 * xoay nhiều thông báo hoặc chữ chạy (marquee). Parts / slots / biến CSS: xem JSDoc của class.
 */

import styles from './hui-announcement-bar.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { collapse, prefersReducedMotion } from '../../utils/motion.js';
import '../hui-icon/index.js';

const TYPES = ['info', 'success', 'warning', 'danger', 'primary'];
const VARIANTS = ['soft', 'filled'];
const STORAGE_PREFIX = 'hui-dismiss:';

/** Chuỗi chưa có trong locale.js → chuỗi dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  vi: { 'announcement.label': 'Thông báo', 'announcement.close': 'Đóng thông báo' },
  en: { 'announcement.label': 'Announcement', 'announcement.close': 'Dismiss announcement' },
};
function tx(key) {
  const v = t(key);
  return v !== key ? v : (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

/** localStorage có thể bị chặn (Safari private, iframe sandbox, cookie bị tắt) → bọc try/catch */
function readDismissed(key) {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key) !== null;
  } catch {
    return false;
  }
}
function writeDismissed(key, on) {
  try {
    if (on) localStorage.setItem(STORAGE_PREFIX + key, String(Date.now()));
    else localStorage.removeItem(STORAGE_PREFIX + key);
  } catch { /* không lưu được → chỉ đóng trong phiên hiện tại */ }
}

/**
 * Dải thông báo. Nội dung: slot mặc định, hoặc `messages` (mảng chuỗi / Node) xoay vòng mỗi `interval` ms
 * với hiệu ứng trượt; `marquee` = chữ chạy liên tục (dừng khi hover / focus).
 * `dismiss-key` → lần đóng được nhớ trong localStorage "hui-dismiss:<key>" (lần sau không hiện lại).
 * Tôn trọng prefers-reduced-motion: không trượt, không chạy chữ (hiện tĩnh).
 *
 * @fires hui-close - Bấm nút đóng (cancelable: preventDefault() để giữ lại). Sau khi đóng xong host có `hidden`
 * @fires hui-change - Thông báo đang hiện đổi (messages xoay). detail: { index }
 * @slot - Nội dung thông báo (khi không dùng messages)
 * @slot prefix - Icon / nhãn phía trước (vd: "🔥 HOT")
 * @slot action - Nút / link hành động phía sau (vd: "Mua ngay")
 * @csspart base - Khung ngoài (role="region")
 * @csspart inner - Hàng nội dung (căn giữa, giới hạn chiều rộng)
 * @csspart prefix - Vùng slot prefix
 * @csspart content - Vùng nội dung (cắt phần tràn khi marquee)
 * @csspart track - Dải chạy chữ (marquee)
 * @csspart message - Mỗi thông báo trong messages
 * @csspart action - Vùng slot action
 * @csspart close - Nút đóng
 * @cssprop --hui-announcement-bar-bg - Màu nền (ghi đè type / variant)
 * @cssprop --hui-announcement-bar-color - Màu chữ
 * @cssprop --hui-announcement-bar-border-color - Màu viền dưới
 * @cssprop --hui-announcement-bar-padding - Khoảng đệm
 * @cssprop --hui-announcement-bar-font-size - Cỡ chữ
 * @cssprop --hui-announcement-bar-gap - Khoảng cách prefix ↔ nội dung ↔ action
 * @cssprop --hui-announcement-bar-max-width - Chiều rộng tối đa hàng nội dung
 * @cssprop --hui-announcement-bar-z-index - z-index khi sticky
 * @cssprop --hui-announcement-bar-marquee-gap - Khoảng cách giữa các thông báo khi marquee
 */
class HuiAnnouncementBar extends HuiElement {
  static properties = {
    /** info | success | warning | danger | primary — màu theo token */
    type: { type: String, default: 'info' },
    /** soft | filled — soft: nền nhạt; filled: nền đậm, chữ tương phản */
    variant: { type: String, default: 'soft' },
    /** Hiện nút đóng */
    closable: { type: Boolean },
    /** Khóa nhớ việc đóng trong localStorage ("hui-dismiss:<key>"); bỏ trống = không nhớ */
    dismissKey: { type: String },
    /** Mảng thông báo (chuỗi hoặc Node) xoay vòng; attribute nhận JSON mảng chuỗi */
    messages: { type: Array, default: null },
    /** Thời gian mỗi thông báo (ms) khi xoay vòng */
    interval: { type: Number, default: 5000 },
    /** Chữ chạy liên tục (dừng khi hover / focus) */
    marquee: { type: Boolean },
    /** Tốc độ chữ chạy (px / giây) */
    speed: { type: Number, default: 60 },
    /** Dính ở mép trên khi cuộn trang */
    sticky: { type: Boolean },
    /** Tắt hiệu ứng (trượt, chữ chạy, thu gọn khi đóng) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._index = 0;
    this._timer = 0;
    this._paused = false;
    this._marqueeAnim = null;
    this._msgEls = [];
  }

  render() {
    const prefixSlot = createElement('slot', { name: 'prefix' });
    this._prefix = createElement('span', { className: 'ab__prefix', part: 'prefix' }, prefixSlot);
    prefixSlot.addEventListener('slotchange', () => { this._prefix.hidden = !prefixSlot.assignedNodes().length; });
    this._prefix.hidden = true;

    this._slot = createElement('slot');
    this._messages = createElement('div', { className: 'ab__messages' });
    this._track = createElement('div', { className: 'ab__track', part: 'track' }, this._slot, this._messages);
    this._content = createElement('div', { className: 'ab__content', part: 'content' }, this._track);

    const actionSlot = createElement('slot', { name: 'action' });
    this._action = createElement('span', { className: 'ab__action', part: 'action' }, actionSlot);
    actionSlot.addEventListener('slotchange', () => { this._action.hidden = !actionSlot.assignedNodes().length; });
    this._action.hidden = true;

    this._close = createElement('button', { className: 'ab__close', part: 'close', type: 'button' },
      createElement('hui-icon', { name: 'close' }));
    this._close.addEventListener('click', () => this.close());

    this._inner = createElement('div', { className: 'ab__inner', part: 'inner' },
      this._prefix, this._content, this._action, this._close);
    this._base = createElement('div', { className: 'ab', part: 'base', role: 'region' }, this._inner);

    // Dừng xoay / chữ chạy khi người dùng đang đọc (hover) hoặc đang thao tác bằng bàn phím (focus)
    this.addEventListener('mouseenter', () => this._setPaused(true, 'hover'));
    this.addEventListener('mouseleave', () => this._setPaused(false, 'hover'));
    this.addEventListener('focusin', () => this._setPaused(true, 'focus'));
    this.addEventListener('focusout', (e) => {
      if (!this.contains(e.relatedTarget) && !this.shadowRoot.contains(e.relatedTarget)) this._setPaused(false, 'focus');
    });
    return this._base;
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback();
    this._ro ||= new ResizeObserver(() => this._syncMarquee());
    this._ro.observe(this._content);
    this._ro.observe(this._track);
    if (reconnect) {
      this._syncTimer();
      this._syncMarquee();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._stopTimer();
    this._stopMarquee();
  }

  updated(changed) {
    if (['type', 'variant', 'closable', 'marquee', 'noAnimation'].some((k) => changed.has(k))) {
      const type = TYPES.includes(this.type) ? this.type : 'info';
      const variant = VARIANTS.includes(this.variant) ? this.variant : 'soft';
      this._base.className = [
        'ab', `ab--${type}`, `ab--${variant}`,
        this.closable ? 'ab--closable' : '',
        this.marquee ? 'ab--marquee' : '',
        this.marquee && !this._animationsOn ? 'ab--marquee-static' : '',
      ].filter(Boolean).join(' ');
      this._close.hidden = !this.closable;
    }
    if (changed.has('locale')) {
      this._base.setAttribute('aria-label', tx('announcement.label'));
      this._close.setAttribute('aria-label', tx('announcement.close'));
    }

    // Đã đóng trước đó (localStorage) → ẩn ngay từ đầu, không hiệu ứng
    if (changed.has('dismissKey') && this.dismissKey && readDismissed(this.dismissKey)) {
      this.hidden = true;
      this.setState('dismissed', true);
    }

    if (changed.has('messages') || changed.has('marquee')) this._renderMessages();
    if (['messages', 'marquee', 'interval'].some((k) => changed.has(k))) this._syncTimer();
    if (['messages', 'marquee', 'speed', 'noAnimation'].some((k) => changed.has(k))) {
      // Chờ layout xong mới đo kích thước
      requestAnimationFrame(() => this._syncMarquee());
    }
  }

  // =====================================================
  // THÔNG BÁO XOAY VÒNG
  // =====================================================

  get _list() {
    return Array.isArray(this.messages) ? this.messages.filter((m) => m !== null && m !== undefined && m !== '') : [];
  }

  get _animationsOn() {
    if (this.noAnimation || prefersReducedMotion()) return false;
    return !document.documentElement.hasAttribute('data-hui-no-animation');
  }

  /** Thông báo đang hiện (chỉ số trong messages) */
  get currentIndex() {
    return this._index;
  }

  _renderMessages() {
    const list = this._list;
    this._slot.hidden = list.length > 0; // có messages → bỏ qua nội dung slot mặc định
    this._messages.hidden = !list.length;
    this._msgEls = list.map((msg, i) => {
      const el = createElement('div', { className: 'ab__message', part: 'message' });
      if (msg instanceof Node) el.append(msg);
      else el.textContent = String(msg);
      if (this.marquee && i > 0) {
        // Dấu phân cách giữa các thông báo khi chữ chạy
        const sep = createElement('span', { className: 'ab__sep', 'aria-hidden': 'true' }, '•');
        return [sep, el];
      }
      return [el];
    });
    this._messages.replaceChildren(...this._msgEls.flat());
    this._msgEls = this._msgEls.map((pair) => pair[pair.length - 1]);
    if (this._index >= list.length) this._index = 0;
    this._show(this._index, false);
  }

  /** Hiện thông báo thứ `index`; animate = trượt lên (cái cũ ra trên, cái mới vào từ dưới) */
  _show(index, animate) {
    const els = this._msgEls;
    if (!els.length) return;
    if (this.marquee) {
      els.forEach((el) => { el.hidden = false; el.removeAttribute('aria-hidden'); });
      return;
    }
    const prev = els[this._index];
    const next = els[index];
    this._index = index;
    els.forEach((el) => {
      const current = el === next;
      el.classList.toggle('ab__message--current', current);
      if (current) el.removeAttribute('aria-hidden');
      else el.setAttribute('aria-hidden', 'true');
    });
    if (!animate || prev === next || !this._animationsOn || typeof next.animate !== 'function') return;
    const opts = { duration: 400, easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)' };
    // Cái cũ vẫn hiện trong lúc trượt ra
    prev.classList.add('ab__message--leaving');
    prev.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-100%)', opacity: 0 }], opts)
      .finished.catch(() => {}).finally(() => prev.classList.remove('ab__message--leaving'));
    next.animate([{ transform: 'translateY(100%)', opacity: 0 }, { transform: 'none', opacity: 1 }], opts);
  }

  /** Sang thông báo kế tiếp */
  next() {
    const n = this._msgEls.length;
    if (n < 2) return;
    this._show((this._index + 1) % n, true);
    this.emit('hui-change', { index: this._index });
  }

  /** Về thông báo trước */
  prev() {
    const n = this._msgEls.length;
    if (n < 2) return;
    this._show((this._index - 1 + n) % n, true);
    this.emit('hui-change', { index: this._index });
  }

  _syncTimer() {
    this._stopTimer();
    if (!this.isConnected || this.marquee || this._paused || this.hidden || this._msgEls.length < 2) return;
    this._timer = setInterval(() => this.next(), Math.max(1000, this.interval || 5000));
  }

  _stopTimer() {
    clearInterval(this._timer);
    this._timer = 0;
  }

  _setPaused(on, reason) {
    this._pauseReasons ||= new Set();
    if (on) this._pauseReasons.add(reason);
    else this._pauseReasons.delete(reason);
    const paused = this._pauseReasons.size > 0;
    if (paused === this._paused) return;
    this._paused = paused;
    this.setState('paused', paused);
    if (this._marqueeAnim) {
      if (paused) this._marqueeAnim.pause();
      else this._marqueeAnim.play();
    }
    this._syncTimer();
  }

  // =====================================================
  // CHỮ CHẠY (MARQUEE)
  // =====================================================

  _stopMarquee() {
    this._marqueeAnim?.cancel();
    this._marqueeAnim = null;
  }

  /** Chạy từ mép phải tới khi khuất hẳn bên trái, lặp vô hạn; tốc độ đều theo `speed` px/s */
  _syncMarquee() {
    if (!this._hasRendered) return;
    if (!this.marquee || !this._animationsOn || !this.isConnected || this.hidden || typeof this._track.animate !== 'function') {
      this._stopMarquee();
      this._lastMarqueeSize = null;
      return;
    }
    const box = this._content.clientWidth;
    const width = this._track.scrollWidth;
    if (!box || !width) return;
    const size = `${box}|${width}|${this.speed}`;
    if (this._marqueeAnim && size === this._lastMarqueeSize) return; // ResizeObserver gọi lại khi không đổi
    this._lastMarqueeSize = size;
    // Lần đầu: bắt đầu với chữ ở mép trái (khỏi phải chờ chữ chạy từ mép phải vào); đo lại thì giữ tiến độ
    const progress = this._marqueeAnim
      ? (this._marqueeAnim.currentTime || 0) / (this._marqueeDuration || 1)
      : box / (box + width);
    this._stopMarquee();
    const duration = ((box + width) / Math.max(10, this.speed || 60)) * 1000;
    this._marqueeDuration = duration;
    this._marqueeAnim = this._track.animate(
      [{ transform: `translateX(${box}px)` }, { transform: `translateX(${-width}px)` }],
      { duration, iterations: Infinity, easing: 'linear' }
    );
    this._marqueeAnim.currentTime = (progress % 1) * duration;
    if (this._paused) this._marqueeAnim.pause();
  }

  // =====================================================
  // ĐÓNG / HIỆN LẠI
  // =====================================================

  /** Đóng (như bấm nút ✕): phát hui-close (cancelable), nhớ nếu có dismiss-key, thu gọn chiều cao rồi ẩn */
  async close() {
    if (this.hidden || this._closing) return;
    if (!this.emit('hui-close', { dismissKey: this.dismissKey || null }, { cancelable: true })) return;
    this._closing = true;
    if (this.dismissKey) writeDismissed(this.dismissKey, true);
    this._stopTimer();
    if (this._animationsOn) await collapse(this, false);
    this._closing = false;
    this.hidden = true;
    this.setState('dismissed', true);
    this._stopMarquee();
  }

  /** Hiện lại (xóa trạng thái đã đóng trong localStorage) */
  show() {
    if (this.dismissKey) writeDismissed(this.dismissKey, false);
    this.hidden = false;
    this.setState('dismissed', false);
    this._syncTimer();
    requestAnimationFrame(() => this._syncMarquee());
  }

  /** Đã bị đóng (trong phiên này hoặc nhớ từ localStorage) */
  get dismissed() {
    return this.hidden || Boolean(this.dismissKey && readDismissed(this.dismissKey));
  }
}

defineElement('hui-announcement-bar', HuiAnnouncementBar);

export default HuiAnnouncementBar;
