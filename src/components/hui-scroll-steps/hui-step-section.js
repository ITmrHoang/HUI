/**
 * HUI Step Section — Một bước (full chiều cao) bên trong <hui-scroll-steps>
 * Nền (màu / gradient / ảnh hoặc slot background cho video/ảnh tràn viền), căn nội dung theo chiều dọc,
 * theme sáng/tối riêng cho từng bước, hiệu ứng vào cho các con khi bước được kích hoạt.
 * Biến CSS: xem đầu hui-step-section.css.
 */

import styles from './hui-step-section.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import { ANIMATIONS } from '../../utils/animate.js';

const PADDINGS = ['none', 'sm', 'md', 'lg'];
const EASE = 'cubic-bezier(0.215, 0.61, 0.355, 1)';

/** Hiệu ứng bị tắt toàn cục? (giảm chuyển động, <html data-hui-no-animation>, token 0ms) */
function motionDisabled(el) {
  if (prefersReducedMotion()) return true;
  if (document.documentElement.hasAttribute('data-hui-no-animation')) return true;
  const token = getComputedStyle(el).getPropertyValue('--hui-motion-duration').trim();
  return token === '0ms' || token === '0s' || token === '0';
}

/**
 * @slot - Nội dung của bước
 * @slot background - Lớp nền tràn viền phía sau nội dung (video, ảnh, canvas…)
 * @csspart base - Khung ngoài (nền, kích thước)
 * @csspart background - Lớp nền chứa slot background
 * @csspart content - Vùng nội dung (cuộn bên trong khi cao hơn khung)
 * @cssprop --hui-step-section-bg - Nền (attribute background ưu tiên hơn)
 * @cssprop --hui-step-section-color - Màu chữ
 * @cssprop --hui-step-section-padding - Khoảng đệm nội dung (attribute padding đổi thang)
 * @cssprop --hui-step-section-max-width - Chiều rộng tối đa của nội dung (mặc định 1200px)
 * @cssprop --hui-step-section-gap - Khoảng cách giữa các con trực tiếp (mặc định 16px)
 */
class HuiStepSection extends HuiElement {
  static properties = {
    /** Nhãn của bước — hiện ở chấm điều hướng và aria-label */
    label: { type: String },
    /** Nền: màu, gradient hoặc url(...) — giá trị CSS background bất kỳ */
    background: { type: String },
    /** start | center | end — căn nội dung theo chiều dọc */
    align: { type: String, default: 'center' },
    /** none | sm | md | lg — thang khoảng đệm, hoặc độ dài CSS (vd "48px 24px") */
    padding: { type: String, default: 'md' },
    /** dark | light — đặt data-theme để token đổi theo trong bước này */
    theme: { type: String },
    /** Ép cuộn bên trong (nội dung cao hơn khung); không đặt thì tự phát hiện */
    scrollable: { type: Boolean },
    /** Attribute `animate`: fade | fade-up | fade-down | fade-left | fade-right | zoom-in | zoom-out | flip-up | blur-in | slide-up — hiệu ứng vào cho các con khi bước được kích hoạt (để trống = fade-up). Property tên animateEffect để không đè Element.animate() */
    animateEffect: { type: String, attribute: 'animate' },
    /** "false" = chạy lại hiệu ứng mỗi lần quay lại bước; mặc định chỉ chạy 1 lần */
    animateOnce: { type: String, default: 'true' },
    /** Khoảng cách (ms) giữa các con khi hiện lần lượt */
    stagger: { type: Number, default: 80 },
    /** Thời lượng hiệu ứng (ms) */
    duration: { type: Number, default: 600 },
    /** Tắt hiệu ứng vào */
    noAnimation: { type: Boolean },
    /** Bước đang được xem — do <hui-scroll-steps> gắn (chỉ đọc) */
    active: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._played = false;
    this._ro = null;
  }

  render() {
    this._bgSlot = createElement('slot', { name: 'background' });
    this._bg = createElement('div', { className: 'section__bg', part: 'background', 'aria-hidden': 'true' }, this._bgSlot);
    this._inner = createElement('div', { className: 'section__inner' }, createElement('slot'));
    this._content = createElement('div', { className: 'section__content', part: 'content' }, this._inner);
    this._base = createElement('div', { className: 'section', part: 'base' }, this._bg, this._content);
    this._bgSlot.addEventListener('slotchange', () => {
      this._bg.hidden = this._bgSlot.assignedElements().length === 0;
    });
    this._bg.hidden = true;
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    // Tự phát hiện nội dung cao hơn khung → gắn `overflowing` (container đổi scroll-snap-stop)
    if (typeof ResizeObserver === 'function' && !this._ro) {
      this._ro = new ResizeObserver(() => this._checkOverflow());
      this._ro.observe(this._content);
      this._ro.observe(this._inner);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._ro = null;
  }

  updated(changed) {
    if (changed.has('background')) {
      if (this.background) this._base.style.setProperty('--_section-bg', this.background);
      else this._base.style.removeProperty('--_section-bg');
    }

    if (changed.has('padding')) {
      const v = this.padding;
      const custom = v && !PADDINGS.includes(v) ? (/^\d+(\.\d+)?$/.test(v) ? `${v}px` : v) : null;
      if (custom) this._content.style.setProperty('--_section-padding-custom', custom);
      else this._content.style.removeProperty('--_section-padding-custom');
    }

    // data-theme trên chính thẻ (light DOM) → tokens.css áp cho cả bước, xuyên vào shadow
    if (changed.has('theme')) {
      if (this.theme === 'dark' || this.theme === 'light') this.setAttribute('data-theme', this.theme);
      else if (changed.get('theme')) this.removeAttribute('data-theme');
    }

    if (changed.has('animateEffect') || changed.has('noAnimation')) {
      // Ẩn các con trước khi chạy hiệu ứng lần đầu (tránh nháy nội dung rồi mới animate)
      // Chỉ ẩn khi nằm trong <hui-scroll-steps> (có người gắn active), dùng lẻ thì luôn hiện
      const pending = this._animateEnabled() && !this._played && !this.active &&
        Boolean(this.closest('hui-scroll-steps')) && !motionDisabled(this);
      this._content.classList.toggle('section__content--pending', pending);
    }

    if (changed.has('active')) {
      this.setState('active', this.active);
      if (this.active) this.playAnimation();
    }
  }

  /** Chạy hiệu ứng vào cho các con (lần lượt theo `stagger`) */
  playAnimation() {
    if (!this.hasAttribute('animate')) return;
    if (this._played && this.animateOnce !== 'false') return;
    this._played = true;
    this._content.classList.remove('section__content--pending');
    if (!this._animateEnabled() || motionDisabled(this)) return;

    const keyframes = ANIMATIONS[this.animateEffect] || ANIMATIONS['fade-up'];
    const stagger = Number.isFinite(this.stagger) ? this.stagger : 80;
    const duration = Number.isFinite(this.duration) ? this.duration : 600;
    [...this.children].filter((c) => c.slot !== 'background').forEach((child, i) => {
      child.animate?.(keyframes, { duration, delay: i * stagger, easing: EASE, fill: 'backwards' });
    });
  }

  /** Đưa về trạng thái chưa hiện — container gọi khi bước ra hẳn khỏi khung (chỉ khi animate-once="false") */
  resetAnimation() {
    if (this.animateOnce !== 'false' || this.active || !this._played) return;
    this._played = false;
    if (this._animateEnabled() && !motionDisabled(this)) this._content.classList.add('section__content--pending');
  }

  _animateEnabled() {
    return this.hasAttribute('animate') && !this.noAnimation && !this.closest('hui-scroll-steps[no-animation]');
  }

  _checkOverflow() {
    const over = this._content.scrollHeight > this._content.clientHeight + 1;
    if (over !== this.hasAttribute('overflowing')) this.toggleAttribute('overflowing', over);
    // Vùng cuộn bên trong phải focus được để cuộn bằng bàn phím (WCAG 2.1.1)
    if (over) this._content.tabIndex = 0;
    else this._content.removeAttribute('tabindex');
    this.setState('overflowing', over);
  }
}

defineElement('hui-step-section', HuiStepSection);

export default HuiStepSection;
