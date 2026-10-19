/**
 * HUI Spinner — Chỉ báo đang tải (Ant Spin + MUI CircularProgress). Parts/slots/biến CSS: xem JSDoc của class.
 */

import styles from './hui-spinner.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const COLOR_VARIANTS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

/** Size keyword → px */
const SIZE_MAP = { sm: 16, md: 24, lg: 36 };

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Hệ tọa độ SVG giống MUI: viewBox="22 22 44 44", tâm (44, 44) */
const VIEWBOX_SIZE = 44;

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * Dùng độc lập như icon, hoặc bọc nội dung (wrapper mode) để phủ overlay khi đang tải.
 *
 * @slot - Nội dung được bọc. Có nội dung → wrapper mode (overlay + làm mờ + aria-busy)
 * @csspart container - Khung ngoài cùng
 * @csspart content - Vùng chứa nội dung được bọc (wrapper mode)
 * @csspart overlay - Lớp phủ chứa spinner (wrapper mode)
 * @csspart spinner - Khối spinner (icon + label), role="progressbar"
 * @csspart icon - Vùng icon
 * @csspart track - Vòng nền mờ (determinate)
 * @csspart circle - Vòng tròn chính (circular)
 * @csspart dot - Mỗi chấm (type="dots")
 * @csspart label - Dòng chữ mô tả
 * @cssprop --hui-spinner-size - Kích thước icon (ghi đè attribute size)
 * @cssprop --hui-spinner-color - Màu vòng xoay / chấm (ghi đè attribute color)
 * @cssprop --hui-spinner-track-color - Màu vòng nền (determinate)
 * @cssprop --hui-spinner-duration - Thời gian một vòng xoay (1.4s)
 * @cssprop --hui-spinner-gap - Khoảng cách icon ↔ label
 * @cssprop --hui-spinner-label-color - Màu label
 * @cssprop --hui-spinner-label-font-size - Cỡ chữ label
 * @cssprop --hui-spinner-overlay-bg - Nền lớp phủ (wrapper mode)
 * @cssprop --hui-spinner-content-opacity - Độ mờ nội dung khi đang tải (0.5)
 */
class HuiSpinner extends HuiElement {
  static properties = {
    /** sm (16px) | md (24px) | lg (36px) hoặc số px */
    size: { type: String, default: 'md' },
    /** primary | secondary | success | warning | danger | info | inherit hoặc màu CSS bất kỳ */
    color: { type: String, default: 'primary' },
    /** Độ dày nét (hệ tọa độ 44) — chỉ cho circular */
    thickness: { type: Number, default: 4 },
    /** circular | dots */
    type: { type: String, default: 'circular' },
    /** 0–100 → vòng tiến độ (determinate). Bỏ trống → xoay vô hạn */
    value: { type: Number },
    /** Dòng chữ mô tả (Ant tip), cũng là aria-label */
    label: { type: String },
    /** bottom | right */
    labelPosition: { type: String, default: 'bottom' },
    /** Chỉ có tác dụng ở wrapper mode: "false" để tắt overlay (mặc định đang xoay) */
    spinning: { type: String },
  };

  static styles = styles;

  render() {
    this._hasContent = false;

    const circle = (cls, part) => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', cls);
      c.setAttribute('part', part);
      c.setAttribute('cx', VIEWBOX_SIZE);
      c.setAttribute('cy', VIEWBOX_SIZE);
      c.setAttribute('fill', 'none');
      return c;
    };
    this._svg = document.createElementNS(SVG_NS, 'svg');
    this._svg.setAttribute('class', 'hui-spinner__svg');
    this._svg.setAttribute('viewBox', `${VIEWBOX_SIZE / 2} ${VIEWBOX_SIZE / 2} ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`);
    this._track = circle('hui-spinner__track', 'track');
    this._circle = circle('hui-spinner__circle', 'circle');
    this._svg.append(this._track, this._circle);

    this._dots = createElement('span', { className: 'hui-spinner__dots' },
      ...[1, 2, 3].map(() => createElement('span', { className: 'hui-spinner__dot', part: 'dot' })));

    const icon = createElement('span', { className: 'hui-spinner__icon', part: 'icon', 'aria-hidden': 'true' },
      this._svg, this._dots);
    this._label = createElement('span', { className: 'hui-spinner__label', part: 'label', 'aria-hidden': 'true' });
    this._indicator = createElement('span', { part: 'spinner', role: 'progressbar' }, icon, this._label);

    // Một cấu trúc cho cả 2 chế độ: standalone chỉ ẩn vùng content (slot vẫn bắt được slotchange)
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => {
      const next = hasContent(this._slot);
      if (next !== this._hasContent) {
        this._hasContent = next;
        this._syncMode();
      }
    });
    this._content = createElement('div', { className: 'hui-spin-content', part: 'content' }, this._slot);
    this._overlay = createElement('div', { className: 'hui-spin-overlay', part: 'overlay' }, this._indicator);
    this._container = createElement('div', { className: 'hui-spin-container', part: 'container' },
      this._content, this._overlay);
    return this._container;
  }

  updated(changed) {
    if (!this._ready) {
      this._ready = true;
      this._hasContent = hasContent(this._slot);
    }

    const type = this.type === 'dots' ? 'dots' : 'circular';
    const value = type === 'circular' ? this._getValue() : null;

    this._indicator.className = [
      'hui-spinner',
      `hui-spinner--${type}`,
      `hui-spinner--label-${this.labelPosition === 'right' ? 'right' : 'bottom'}`,
      value !== null ? 'hui-spinner--determinate' : 'hui-spinner--indeterminate',
    ].join(' ');
    this._svg.toggleAttribute('hidden', type !== 'circular');
    this._dots.hidden = type !== 'dots';

    if (changed.has('size')) this._indicator.style.setProperty('--_spinner-size', `${this._getSizePx()}px`);
    if (changed.has('color')) this._indicator.style.setProperty('--_spinner-color', this._getColor());

    if (changed.has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
      this._indicator.setAttribute('aria-label', this.label || 'Loading');
    }

    this._syncCircle(value);
    this._syncMode();
  }

  /** Size keyword hoặc số tự do → px */
  _getSizePx() {
    if (SIZE_MAP[this.size]) return SIZE_MAP[this.size];
    const num = parseFloat(this.size);
    return Number.isFinite(num) && num > 0 ? num : SIZE_MAP.md;
  }

  _getColor() {
    const color = this.color || 'primary';
    if (COLOR_VARIANTS.includes(color)) return `var(--hui-${color})`;
    if (color === 'inherit') return 'currentColor';
    return color;
  }

  /** null → indeterminate; ngược lại kẹp vào 0–100 */
  _getValue() {
    return Number.isFinite(this.value) ? Math.min(100, Math.max(0, this.value)) : null;
  }

  /**
   * Determinate: cả chu vi là một nét liền, dịch dashoffset để chỉ lộ đúng value%.
   * Indeterminate: xóa style inline để animation CSS điều khiển nét vẽ.
   */
  _syncCircle(value) {
    const t = Number.isFinite(this.thickness) && this.thickness > 0
      ? Math.min(this.thickness, VIEWBOX_SIZE / 2) // Không dày hơn bán kính
      : 4;
    const radius = (VIEWBOX_SIZE - t) / 2;
    for (const c of [this._track, this._circle]) {
      c.setAttribute('r', radius);
      c.setAttribute('stroke-width', t);
    }
    this._track.toggleAttribute('hidden', value === null);

    const ind = this._indicator;
    if (value !== null) {
      const circumference = 2 * Math.PI * radius;
      this._circle.style.strokeDasharray = `${circumference.toFixed(3)}px`;
      this._circle.style.strokeDashoffset = `${(((100 - value) / 100) * circumference).toFixed(3)}px`;
      ind.setAttribute('aria-valuemin', '0');
      ind.setAttribute('aria-valuemax', '100');
      ind.setAttribute('aria-valuenow', String(Math.round(value)));
    } else {
      this._circle.style.strokeDasharray = '';
      this._circle.style.strokeDashoffset = '';
      ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'].forEach((a) => ind.removeAttribute(a));
    }
  }

  /** Standalone ↔ wrapper mode theo nội dung slot; wrapper mode bật/tắt overlay theo `spinning` */
  _syncMode() {
    const nested = this._hasContent;
    // Chỉ "false" mới tắt — mọi giá trị khác (kể cả không đặt) đều đang xoay
    const spinning = String(this.spinning) !== 'false';

    // Giữ attribute data-nested trên host như bản cũ (CSS ngoài có thể đang dùng)
    this.toggleAttribute('data-nested', nested);
    this.setState('nested', nested);

    this._container.classList.toggle('hui-spin-container--nested', nested);
    this._content.hidden = !nested;
    this._content.inert = nested && spinning;
    this._content.classList.toggle('hui-spin-content--blur', nested && spinning);
    this._overlay.hidden = nested && !spinning;
    if (nested) this._container.setAttribute('aria-busy', spinning ? 'true' : 'false');
    else this._container.removeAttribute('aria-busy');
  }
}

defineElement('hui-spinner', HuiSpinner);

export default HuiSpinner;
