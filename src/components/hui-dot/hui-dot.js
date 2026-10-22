/**
 * HUI Dot — Chấm trạng thái (Atom): success / processing (nhấp nháy) / online / offline / busy…
 * Có chữ (attribute label hoặc slot) → chấm chỉ trang trí; không có chữ → host role="img" + tên trạng thái.
 */

import styles from './hui-dot.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';

const STATUSES = ['success', 'processing', 'default', 'error', 'warning', 'online', 'offline', 'busy'];
const SIZES = { sm: '6px', md: '8px', lg: '10px' };
const COLOR_TOKENS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

const FALLBACK = {
  vi: { success: 'Thành công', processing: 'Đang xử lý', default: 'Mặc định', error: 'Lỗi', warning: 'Cảnh báo', online: 'Trực tuyến', offline: 'Ngoại tuyến', busy: 'Bận' },
  en: { success: 'Success', processing: 'Processing', default: 'Default', error: 'Error', warning: 'Warning', online: 'Online', offline: 'Offline', busy: 'Busy' },
};

/** Tên trạng thái theo ngôn ngữ (key dot.<status>) */
export function dotStatusText(status) {
  const key = `dot.${status}`;
  const v = t(key);
  if (v !== key) return v;
  return (FALLBACK[getLocaleName()] || FALLBACK.en)[status] ?? FALLBACK.en[status] ?? status;
}

const hasNodes = (slot) => slot.assignedNodes({ flatten: true })
  .some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim() !== '');

/**
 * Chấm trạng thái.
 * @slot - Chữ cạnh chấm (thay attribute label)
 * @csspart base - Khung ngoài (chấm + chữ)
 * @csspart dot - Chấm tròn
 * @csspart ring - Vòng lan tỏa khi nhấp nháy (processing / pulse)
 * @csspart label - Chữ cạnh chấm
 * @cssprop --hui-dot-size - Đường kính chấm (attribute size ưu tiên hơn)
 * @cssprop --hui-dot-color - Màu chấm (attribute color ưu tiên hơn)
 * @cssprop --hui-dot-gap - Khoảng cách chấm ↔ chữ
 * @cssprop --hui-dot-label-color - Màu chữ
 * @cssprop --hui-dot-font-size - Cỡ chữ
 * @cssprop --hui-dot-pulse-duration - Chu kỳ nhấp nháy (mặc định 1.6s)
 * @cssprop --hui-dot-ring-width - Viền trắng quanh chấm (mặc định 0, đặt 2px khi chấm nằm trên avatar)
 */
class HuiDot extends HuiElement {
  static localized = true;

  static properties = {
    /** success | processing | default | error | warning | online | offline | busy — processing tự nhấp nháy */
    status: { type: String, default: 'default' },
    /** sm | md | lg hoặc số px — đường kính chấm */
    size: { type: String, default: 'md' },
    /** Màu tùy chỉnh: primary | success | warning | danger | info hoặc màu CSS (ưu tiên hơn status) */
    color: { type: String },
    /** Chữ cạnh chấm (hoặc slot mặc định) */
    label: { type: String },
    /** Ép nhấp nháy với mọi trạng thái */
    pulse: { type: Boolean },
    /** Tắt nhấp nháy */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._ring = createElement('span', { className: 'dot__ring', part: 'ring' });
    this._dot = createElement('span', { className: 'dot__dot', part: 'dot', 'aria-hidden': 'true' }, this._ring);
    this._labelText = document.createTextNode('');
    this._slot = createElement('slot', {}, this._labelText);
    this._slot.addEventListener('slotchange', () => this._syncA11y());
    this._label = createElement('span', { className: 'dot__label', part: 'label' }, this._slot);
    this._base = createElement('span', { className: 'dot', part: 'base' }, this._dot, this._label);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    // Tắt chuyển động toàn trang (html[data-hui-no-animation], token 0ms) — CSS trong shadow không thấy được
    this._base.classList.toggle('dot--static', animationsDisabled());
  }

  get _status() {
    return STATUSES.includes(this.status) ? this.status : 'default';
  }

  updated(changed) {
    if (changed.has('label')) this._labelText.data = this.label || '';
    if (changed.has('size')) {
      const raw = String(this.size ?? '').trim();
      // md = mặc định → để --hui-dot-size từ ngoài có hiệu lực
      const size = !raw || raw === 'md' ? '' : SIZES[raw] || (/^\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw);
      if (size) this._base.style.setProperty('--_dot-size', size);
      else this._base.style.removeProperty('--_dot-size');
    }
    if (changed.has('color')) {
      const c = this.color ? (COLOR_TOKENS.includes(this.color) ? `var(--hui-${this.color})` : this.color) : '';
      if (c) this._base.style.setProperty('--_dot-custom', c);
      else this._base.style.removeProperty('--_dot-custom');
    }
    const status = this._status;
    this._base.dataset.status = status;
    this._base.classList.toggle('dot--pulse', (this.pulse || status === 'processing') && !this.noAnimation);
    this._syncA11y();
  }

  /** Có chữ hiển thị → chữ là tên; không có → host là ảnh mang tên trạng thái */
  _syncA11y() {
    if (!this._slot) return;
    const hasLabel = Boolean(this.label) || hasNodes(this._slot);
    this._label.hidden = !hasLabel;
    if (hasLabel) {
      if (this.getAttribute('role') === 'img') this.removeAttribute('role');
      this.removeAttribute('aria-label');
    } else {
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', dotStatusText(this._status));
    }
  }
}

defineElement('hui-dot', HuiDot);

export default HuiDot;
