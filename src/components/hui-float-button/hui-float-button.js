/**
 * HUI Float Button — Nút nổi ở góc màn hình (Ant FloatButton + MUI Fab)
 * Đứng riêng: cố định ở góc (position/offset). Đặt trong <hui-float-group>: nhóm tự gắn `inline` để xếp chồng.
 * Có href → render thẻ <a>; badge qua hui-badge, tooltip qua hui-tooltip.
 */

import skin from './float-button-skin.css?raw';
import styles from './hui-float-button.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { applyOffset } from './float-utils.js';
import '../hui-icon/hui-icon.js';
import '../hui-badge/hui-badge.js';
import '../hui-tooltip/hui-tooltip.js';

// Không dùng flatten: flatten trả về cả nội dung dự phòng (fallback) của slot khi không có gì được gán
const hasContent = (slot) => slot.assignedNodes().some(
  (n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim() !== ''
);

/**
 * @slot icon - Icon tùy chỉnh (thay cho attribute icon)
 * @slot description - Mô tả dạng HTML (thay cho attribute description)
 * @csspart base - Thẻ <button> hoặc <a> bên trong
 * @csspart icon - Icon mặc định
 * @csspart description - Vùng mô tả
 * @csspart badge - hui-badge bọc ngoài nút
 * @csspart badge-indicator - Chỉ báo số / chấm của badge
 * @cssprop --hui-float-button-size - Đường kính (sm 32px, md 40px, lg 48px)
 * @cssprop --hui-float-button-radius - Bo góc khi shape="square"
 * @cssprop --hui-float-button-bg - Nền (type="default")
 * @cssprop --hui-float-button-color - Màu chữ/icon (type="default")
 * @cssprop --hui-float-button-hover-bg - Nền khi hover (type="default")
 * @cssprop --hui-float-button-primary-bg - Nền (type="primary")
 * @cssprop --hui-float-button-primary-color - Màu chữ/icon (type="primary")
 * @cssprop --hui-float-button-primary-hover-bg - Nền hover (type="primary")
 * @cssprop --hui-float-button-shadow - Đổ bóng
 * @cssprop --hui-float-button-icon-size - Cỡ icon
 * @cssprop --hui-float-button-focus-color - Viền focus
 * @cssprop --hui-float-button-pulse-color - Màu vòng lan (pulse)
 * @cssprop --hui-float-button-offset-x - Khoảng cách tới mép trái/phải khi đứng riêng (24px)
 * @cssprop --hui-float-button-offset-y - Khoảng cách tới mép trên/dưới khi đứng riêng (24px)
 */
class HuiFloatButton extends HuiElement {
  static properties = {
    /** Tên icon (xem hui-icon) */
    icon: { type: String },
    /** Mô tả ngắn dưới icon (nên dùng với shape="square") */
    description: { type: String },
    /** Có href → nút là liên kết <a> */
    href: { type: String },
    /** Target của liên kết (vd: _blank — tự thêm rel="noopener noreferrer") */
    target: { type: String },
    /** default | primary — default: nền nổi sáng, primary: màu chủ đạo */
    type: { type: String, default: 'default' },
    /** circle | square — tròn hoặc vuông bo góc */
    shape: { type: String, default: 'circle' },
    /** sm | md | lg — 32 / 40 / 48px */
    size: { type: String, default: 'md' },
    /** Số đếm trên nút (hui-badge); "dot" = chấm đỏ; rỗng/0 = ẩn */
    badge: { type: String },
    /** Nội dung tooltip (hui-tooltip) — đồng thời làm aria-label nếu không có aria-label */
    tooltip: { type: String },
    /** Vị trí tooltip: top | bottom | left | right (kèm -start / -end) */
    tooltipPlacement: { type: String, default: 'left' },
    /** bottom-right | bottom-left | top-right | top-left — góc màn hình khi đứng riêng */
    position: { type: String, default: 'bottom-right' },
    /** Khoảng cách tới mép (px): "24" hoặc "x,y" */
    offset: { type: String },
    /** Nằm trong luồng trang thay vì cố định ở góc (hui-float-group tự đặt cho con) */
    inline: { type: Boolean },
    /** Vòng lan nhẹ thu hút sự chú ý (tự tắt khi giảm chuyển động / no-animation) */
    pulse: { type: Boolean },
    /** Tắt hiệu ứng */
    noAnimation: { type: Boolean },
  };

  static styles = [skin, styles];

  render() {
    this._icon = createElement('hui-icon', { className: 'fb__icon', part: 'icon' });
    this._iconSlot = createElement('slot', { name: 'icon' }, this._icon);
    this._descText = document.createTextNode('');
    this._descSlot = createElement('slot', { name: 'description' }, this._descText);
    this._desc = createElement('span', { className: 'fb__desc', part: 'description' }, this._descSlot);

    // Hai thẻ gốc dựng sẵn, đổi qua lại theo href (giữ nguyên nội dung bên trong)
    this._button = createElement('button', { type: 'button', part: 'base' });
    this._link = createElement('a', { part: 'base' });
    this._base = this._button;
    this._base.append(this._iconSlot, this._desc);

    this._badge = createElement('hui-badge', { part: 'badge', exportparts: 'indicator: badge-indicator' }, this._base);
    this._tooltip = null;

    this._iconSlot.addEventListener('slotchange', () => this._syncParts());
    this._descSlot.addEventListener('slotchange', () => this._syncParts());
    return this._badge;
  }

  updated(changed) {
    if (changed.has('href') || changed.has('target')) this._syncBase();

    if (changed.has('icon')) {
      if (this.icon) this._icon.setAttribute('name', this.icon);
      else this._icon.removeAttribute('name');
    }
    if (changed.has('description')) this._descText.data = this.description || '';

    if (changed.has('badge') || changed.has('shape')) {
      const dot = this.badge === 'dot';
      this._badge.toggleAttribute('dot', dot);
      if (dot || !this.badge) this._badge.removeAttribute('count');
      else this._badge.setAttribute('count', this.badge);
      this._badge.setAttribute('overlap', this.shape === 'square' ? 'rectangular' : 'circular');
    }

    if (changed.has('tooltip') || changed.has('tooltipPlacement')) this._syncTooltip();
    if (changed.has('offset')) applyOffset(this, this.offset, 'fb');

    this._syncParts();
  }

  /** Đổi giữa <button> và <a> khi href thay đổi; cập nhật thuộc tính liên kết */
  _syncBase() {
    const next = this.href ? this._link : this._button;
    if (next !== this._base) {
      next.append(...this._base.childNodes);
      this._base.replaceWith(next);
      this._base = next;
    }
    if (this.href) {
      this._link.setAttribute('href', this.href);
      if (this.target) this._link.setAttribute('target', this.target);
      else this._link.removeAttribute('target');
      if (this.target === '_blank') this._link.setAttribute('rel', 'noopener noreferrer');
      else this._link.removeAttribute('rel');
    }
  }

  /** Bọc thêm hui-tooltip ở lần đầu có tooltip (không tạo khi không dùng) */
  _syncTooltip() {
    if (!this.tooltip && !this._tooltip) return;
    if (!this._tooltip) {
      this._tooltip = createElement('hui-tooltip', { part: 'tooltip' });
      this._badge.replaceWith(this._tooltip);
      this._tooltip.append(this._badge);
    }
    this._tooltip.setAttribute('content', this.tooltip || '');
    this._tooltip.setAttribute('placement', this.tooltipPlacement || 'left');
  }

  /** Class giao diện + aria-label (gọi mỗi lần cập nhật — chỉ là gán class/attribute) */
  _syncParts() {
    const hasDesc = Boolean(this.description) || hasContent(this._descSlot);
    this._desc.hidden = !hasDesc;
    const hasIcon = Boolean(this.icon) || hasContent(this._iconSlot);
    this._iconSlot.hidden = !hasIcon;

    this._base.className = [
      'fb',
      this.type === 'primary' ? 'fb--primary' : '',
      `fb--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
      this.shape === 'square' ? 'fb--square' : '',
      hasDesc ? 'fb--has-desc' : '',
      this.pulse ? 'fb--pulse' : '',
      this.noAnimation ? 'fb--no-animation' : '',
    ].filter(Boolean).join(' ');

    // Nút chỉ có icon cần nhãn cho trình đọc màn hình: aria-label của host → tooltip
    const label = this.getAttribute('aria-label') || this.tooltip;
    if (label) this._base.setAttribute('aria-label', label);
    else this._base.removeAttribute('aria-label');
  }

  /** Đưa focus vào nút thật bên trong */
  focus(options) {
    this._base ? this._base.focus(options) : super.focus(options);
  }

  blur() {
    this._base?.blur();
  }
}

defineElement('hui-float-button', HuiFloatButton);

export default HuiFloatButton;
