/**
 * HUI Wishlist Toggle — nút trái tim bật/tắt yêu thích (aria-pressed).
 * Bật: tim "nảy" + vòng sóng + hạt nhỏ bắn ra (burst) — hiệu ứng tự viết bằng Web Animations API,
 * không phụ thuộc src/effects. Tắt bằng no-animation / prefers-reduced-motion.
 */

import styles from './hui-wishlist-toggle.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';

const FALLBACK = {
  'product.wishlist': { vi: 'Yêu thích', en: 'Wishlist' },
};
const msg = (key) => {
  const v = t(key);
  return v !== key ? v : FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const HEART = 'M12 20.6 4.3 13A5 5 0 0 1 12 6.5a5 5 0 0 1 7.7 6.5Z';
const EASE_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)';

/**
 * Nút yêu thích.
 * @fires change - Người dùng bật/tắt. Cancelable: preventDefault() để giữ trạng thái cũ. detail: { active }
 * @slot - Chữ tùy chọn bên cạnh tim (vd "Yêu thích")
 * @csspart button - Thẻ <button> (aria-pressed)
 * @csspart icon - SVG trái tim
 * @csspart label - Vùng chữ (slot)
 * @csspart burst - Lớp chứa vòng sóng + hạt
 * @cssprop --hui-wishlist-toggle-size - Cạnh nút (mặc định theo size)
 * @cssprop --hui-wishlist-toggle-icon-size - Cỡ trái tim
 * @cssprop --hui-wishlist-toggle-color - Màu tim khi tắt
 * @cssprop --hui-wishlist-toggle-active-color - Màu tim khi bật (mặc định danger)
 * @cssprop --hui-wishlist-toggle-bg - Nền nút (variant filled / outlined)
 * @cssprop --hui-wishlist-toggle-hover-bg - Nền khi hover
 * @cssprop --hui-wishlist-toggle-shadow - Bóng nút (variant filled)
 * @cssprop --hui-wishlist-toggle-burst-color - Màu hạt / vòng sóng (mặc định = active-color)
 */
class HuiWishlistToggle extends HuiElement {
  static properties = {
    /** Đang bật (đã yêu thích) */
    active: { type: Boolean },
    /** Tên cho trình đọc màn hình (mặc định "Yêu thích") */
    label: { type: String },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** filled | outlined | plain — nền tròn có bóng | viền | chỉ icon */
    variant: { type: String, default: 'filled' },
    /** Số hạt bắn ra khi bật */
    particles: { type: Number, default: 10 },
    /** Vô hiệu hóa */
    disabled: { type: Boolean },
    /** Tắt hiệu ứng nảy / hạt */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  render() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('part', 'icon');
    svg.classList.add('wl__icon');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', HEART);
    svg.append(path);
    this._icon = svg;

    this._burst = createElement('span', { className: 'wl__burst', part: 'burst', 'aria-hidden': 'true' });
    this._labelSlot = createElement('slot');
    this._label = createElement('span', { className: 'wl__label', part: 'label' }, this._labelSlot);
    this._labelSlot.addEventListener('slotchange', () => this._syncLabel());
    this._iconBox = createElement('span', { className: 'wl__icon-box' }, svg, this._burst);
    this._btn = createElement('button', { type: 'button', className: 'wl', part: 'button' }, this._iconBox, this._label);
    this._btn.addEventListener('click', () => this._toggle());
    return this._btn;
  }

  updated(changed) {
    this._btn.setAttribute('aria-pressed', String(this.active));
    this._btn.disabled = this.disabled;
    if (changed.has('label') || changed.has('locale')) this._syncLabel();
    this._btn.className = [
      'wl', `wl--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
      `wl--${['outlined', 'plain'].includes(this.variant) ? this.variant : 'filled'}`,
      this.active ? 'wl--active' : '',
    ].filter(Boolean).join(' ');
    this.setState('active', this.active);
  }

  firstUpdated() {
    this._syncLabel();
  }

  /** Có chữ trong slot → nút tự có tên; không thì aria-label */
  _syncLabel() {
    const hasText = this._labelSlot.assignedNodes({ flatten: true }).some((n) => n.textContent.trim());
    this._label.hidden = !hasText;
    this._btn.classList.toggle('wl--with-label', hasText);
    if (hasText && !this.label) this._btn.removeAttribute('aria-label');
    else this._btn.setAttribute('aria-label', this.label || msg('product.wishlist'));
  }

  _toggle() {
    if (this.disabled) return;
    const next = !this.active;
    this.active = next;
    const ok = this.emit('change', { active: next }, { cancelable: true });
    if (!ok) {
      this.active = !next;
      return;
    }
    if (next) this.celebrate();
  }

  /** Chạy hiệu ứng nảy + hạt (tự gọi khi người dùng bật; gọi tay được) */
  celebrate() {
    if (this.noAnimation || animationsDisabled() || typeof this._icon.animate !== 'function') return;
    this._icon.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(0.6)', offset: 0.25 }, { transform: 'scale(1.3)', offset: 0.6 }, { transform: 'scale(1)' }],
      { duration: 480, easing: EASE_OUT },
    );

    const ring = createElement('span', { className: 'wl__ring' });
    this._burst.append(ring);
    ring.animate(
      [{ transform: 'scale(0.2)', opacity: 0.9, borderWidth: '6px' }, { transform: 'scale(1.6)', opacity: 0, borderWidth: '1px' }],
      { duration: 500, easing: EASE_OUT },
    ).finished.finally(() => ring.remove());

    const count = Math.max(0, Math.min(24, Math.round(this.particles ?? 10)));
    const radius = this._iconBox.clientWidth * 0.95 || 24;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = radius * (0.8 + Math.random() * 0.5);
      const dot = createElement('span', { className: `wl__dot wl__dot--${i % 3}` });
      this._burst.append(dot);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      dot.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 1, offset: 0.7 },
          { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy * 1.15}px)) scale(0)`, opacity: 0 },
        ],
        { duration: 560 + Math.random() * 160, delay: 60, easing: EASE_OUT, fill: 'backwards' },
      ).finished.finally(() => dot.remove());
    }
  }

  focus(options) {
    if (this._btn) this._btn.focus(options);
    else super.focus(options);
  }

  blur() {
    this._btn?.blur();
  }
}

defineElement('hui-wishlist-toggle', HuiWishlistToggle);

export default HuiWishlistToggle;
