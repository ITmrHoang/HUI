/**
 * HUI Badge — Huy hiệu số đếm / chấm trạng thái (Ant Badge + MUI Badge). Parts/slots/biến CSS: xem JSDoc của class.
 */

import styles from './hui-badge.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';

const COLOR_VARIANTS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

/** Trạng thái kiểu Ant → token màu */
const STATUS_COLORS = {
  success: 'var(--hui-success)',
  processing: 'var(--hui-info)',
  default: 'var(--hui-text-muted)',
  error: 'var(--hui-danger)',
  warning: 'var(--hui-warning)',
};

const PLACEMENTS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * Bọc nội dung và gắn chỉ báo ở góc; không có nội dung → badge inline độc lập;
 * `status` không có nội dung → chấm trạng thái + text.
 *
 * @slot - Nội dung được gắn badge. Bỏ trống → badge hiển thị inline độc lập
 * @slot count - Nội dung tùy biến cho chỉ báo (vd: icon) thay cho số đếm
 * @csspart base - Khung bọc nội dung + chỉ báo
 * @csspart indicator - Chỉ báo (số đếm / chấm)
 * @csspart status - Khối status mode (chấm + text)
 * @csspart status-dot - Chấm trạng thái
 * @csspart status-text - Text trạng thái
 * @cssprop --hui-badge-bg - Nền chỉ báo (ghi đè màu theo color/status)
 * @cssprop --hui-badge-color - Màu chữ chỉ báo
 * @cssprop --hui-badge-height - Chiều cao (và min-width) chỉ báo số
 * @cssprop --hui-badge-padding-x - Khoảng đệm ngang chỉ báo số
 * @cssprop --hui-badge-font-size - Cỡ chữ số đếm
 * @cssprop --hui-badge-radius - Bo góc chỉ báo
 * @cssprop --hui-badge-dot-size - Kích thước chấm (dot)
 * @cssprop --hui-badge-ring-color - Màu vòng viền tách chỉ báo khỏi nội dung
 * @cssprop --hui-badge-status-size - Kích thước chấm ở status mode
 */
class HuiBadge extends HuiElement {
  static properties = {
    /** Số đếm hoặc chữ (vd: "NEW"). Rỗng/0 → ẩn chỉ báo */
    count: { type: String },
    /** Vượt quá max → hiển thị "max+" */
    max: { type: Number, default: 99 },
    /** Chấm nhỏ thay cho số */
    dot: { type: Boolean },
    /** Vẫn hiển thị khi count = 0 */
    showZero: { type: Boolean },
    /** primary | secondary | success | warning | danger | info hoặc màu CSS bất kỳ */
    color: { type: String, default: 'danger' },
    /** standard | soft */
    variant: { type: String, default: 'standard' },
    /** top-right | top-left | bottom-right | bottom-left */
    placement: { type: String, default: 'top-right' },
    /** rectangular | circular (kéo chỉ báo vào trong cho phần tử tròn) */
    overlap: { type: String, default: 'rectangular' },
    /** Dịch chuyển chỉ báo, dạng "x,y" (px) */
    offset: { type: String },
    /** success | processing | default | error | warning — chấm trạng thái */
    status: { type: String },
    /** Text cạnh chấm ở status mode; chế độ khác dùng làm aria-label của chỉ báo */
    text: { type: String },
    /** Ẩn chỉ báo (có animation) */
    invisible: { type: Boolean },
    /** sm | md */
    size: { type: String, default: 'md' },
  };

  static styles = styles;

  render() {
    this._hasContent = false;
    this._hasCustomCount = false;
    // Trạng thái lần trước → chọn animation enter / leave / bump
    this._prevVisible = null;
    this._prevDisplay = null;

    this._slot = createElement('slot');
    this._countSlot = createElement('slot', { name: 'count' });
    this._countText = createElement('span', { className: 'hui-badge__count' });
    this._indicator = createElement('sup', { className: 'hui-badge__indicator', part: 'indicator' },
      this._countText, this._countSlot);
    this._base = createElement('span', { className: 'hui-badge', part: 'base' }, this._slot, this._indicator);

    this._statusDot = createElement('span', { className: 'hui-badge-status__dot', part: 'status-dot', 'aria-hidden': 'true' });
    this._statusText = createElement('span', { className: 'hui-badge-status__text', part: 'status-text' });
    this._status = createElement('span', { className: 'hui-badge-status', part: 'status' }, this._statusDot, this._statusText);

    // Thêm/bớt nội dung → đổi chế độ (bọc / standalone / status) mà không dựng lại DOM
    const onSlotChange = () => {
      const content = hasContent(this._slot);
      const custom = hasContent(this._countSlot);
      if (content !== this._hasContent || custom !== this._hasCustomCount) {
        this._hasContent = content;
        this._hasCustomCount = custom;
        this._sync();
      }
    };
    this._slot.addEventListener('slotchange', onSlotChange);
    this._countSlot.addEventListener('slotchange', onSlotChange);

    return [this._base, this._status];
  }

  updated() {
    if (!this._ready) {
      this._ready = true;
      this._hasContent = hasContent(this._slot);
      this._hasCustomCount = hasContent(this._countSlot);
    }
    // Mọi property đều ảnh hưởng chung tới chỉ báo → đồng bộ toàn bộ (chỉ sửa class/text/style)
    this._sync();
  }

  /** Biến thể → token; còn lại coi là màu CSS tự do */
  _getColor() {
    if (STATUS_COLORS[this.status]) return STATUS_COLORS[this.status];
    const color = this.color || 'danger';
    return COLOR_VARIANTS.includes(color) ? `var(--hui-${color})` : color;
  }

  /** Số > max → "max+"; chuỗi không phải số giữ nguyên ("NEW") */
  _getCountInfo() {
    const raw = this.count == null ? '' : String(this.count).trim();
    const num = raw === '' ? NaN : Number(raw);
    const isNumeric = Number.isFinite(num);
    const max = Number.isFinite(this.max) && this.max > 0 ? this.max : 99;

    let display = raw;
    if (isNumeric) display = num > max ? `${max}+` : String(num);
    return { isEmpty: raw === '', isZero: isNumeric && num === 0, display };
  }

  _getOffset() {
    const [x, y] = String(this.offset || '').split(',').map((v) => parseFloat(v));
    return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0];
  }

  _sync() {
    const status = STATUS_COLORS[this.status] ? this.status : null;
    const color = this._getColor();

    // ===== STATUS MODE: không bọc nội dung → chấm + text =====
    const statusMode = Boolean(status) && !this._hasContent;
    this._status.hidden = !statusMode;
    this._base.hidden = statusMode;
    if (statusMode) {
      this._status.style.setProperty('--_badge-bg', color);
      this._statusDot.classList.toggle('hui-badge-status__dot--processing', status === 'processing');
      this._statusText.textContent = this.text || '';
      this._statusText.hidden = !this.text;
      // Không có text → chấm vẫn cần nhãn cho trình đọc màn hình
      if (this.text) {
        this._status.removeAttribute('role');
        this._status.removeAttribute('aria-label');
      } else {
        this._status.setAttribute('role', 'img');
        this._status.setAttribute('aria-label', status);
      }
      return;
    }

    const size = this.size === 'sm' ? 'sm' : 'md';
    const variant = this.variant === 'soft' ? 'soft' : 'standard';
    const placement = PLACEMENTS.includes(this.placement) ? this.placement : 'top-right';
    const overlap = this.overlap === 'circular' ? 'circular' : 'rectangular';

    const { isEmpty, isZero, display } = this._getCountInfo();
    // Giống Ant: dot chỉ bị ẩn khi count = 0 (trừ khi show-zero)
    const isDot = (this.dot || Boolean(status)) && !(isZero && !this.showZero);
    const isCustom = this._hasCustomCount && !isDot;
    const hiddenByCount = !isDot && !this._hasCustomCount && (isEmpty || (isZero && !this.showZero));
    const visible = !this.invisible && !hiddenByCount;

    this._base.className = [
      'hui-badge',
      this._hasContent ? `hui-badge--${placement}` : 'hui-badge--standalone',
      this._hasContent ? `hui-badge--overlap-${overlap}` : '',
    ].filter(Boolean).join(' ');

    const ind = this._indicator;
    ind.className = [
      'hui-badge__indicator',
      `hui-badge__indicator--${variant}`,
      `hui-badge__indicator--${size}`,
      isDot ? 'hui-badge__indicator--dot' : '',
      isCustom ? 'hui-badge__indicator--custom' : '',
      status === 'processing' && isDot ? 'hui-badge__indicator--processing' : '',
      visible ? '' : 'hui-badge__indicator--hidden',
    ].filter(Boolean).join(' ');

    // Nội dung: dot → rỗng; custom → slot "count"; còn lại → số đếm
    this._countText.textContent = isDot || isCustom ? '' : display;
    this._countText.hidden = isDot || isCustom;
    this._countSlot.hidden = !isCustom;

    const [ox, oy] = this._getOffset();
    ind.style.setProperty('--_badge-bg', color);
    ind.style.setProperty('--_badge-ox', `${ox}px`);
    ind.style.setProperty('--_badge-oy', `${oy}px`);

    // ===== ACCESSIBILITY =====
    ind.removeAttribute('role');
    ind.removeAttribute('aria-label');
    ind.removeAttribute('aria-hidden');
    if (!visible) {
      ind.setAttribute('aria-hidden', 'true');
    } else if (isDot) {
      ind.setAttribute('role', 'img');
      ind.setAttribute('aria-label', this.text || status || 'Có thông báo mới');
    } else if (this.text) {
      ind.setAttribute('aria-label', this.text);
    }

    // ===== ANIMATION: ẩn → hiện (zoom in), hiện → ẩn (zoom out), đổi số (bump) =====
    if (this._prevVisible !== null) {
      if (visible && !this._prevVisible) {
        this._animate([{ scale: 0, opacity: 0 }, { scale: 1, opacity: 1 }],
          { duration: 300, easing: 'cubic-bezier(0.12, 0.4, 0.29, 1.46)' });
      } else if (!visible && this._prevVisible) {
        // Giữ visibility trong lúc thu nhỏ; xong thì class --hidden có hiệu lực
        this._animate([{ scale: 1, opacity: 1, visibility: 'visible' }, { scale: 0, opacity: 0, visibility: 'visible' }],
          { duration: 200, easing: 'ease-in' });
      } else if (visible && display !== this._prevDisplay) {
        this._animate([{ scale: 0.6 }, { scale: 1.15, offset: 0.6 }, { scale: 1 }], { duration: 300, easing: 'ease-out' });
      }
    }
    this._prevVisible = visible;
    this._prevDisplay = display;
  }

  /** Animate thuộc tính `scale` (không đụng `transform` đang dùng để định vị) */
  _animate(keyframes, options) {
    this._anim?.cancel();
    if (prefersReducedMotion() || typeof this._indicator.animate !== 'function') return;
    this._anim = this._indicator.animate(keyframes, options);
  }
}

defineElement('hui-badge', HuiBadge);

export default HuiBadge;
