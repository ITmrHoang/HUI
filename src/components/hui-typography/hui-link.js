/**
 * HUI Link — Liên kết (Ant Typography.Link + MUI Link)
 * Thẻ <a> thật trong Shadow DOM: href, target, external (icon ↗ + mở tab mới), underline, disabled.
 * Biến CSS: xem đầu hui-link.css.
 */

import styles from './hui-link.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const TYPES = ['secondary', 'success', 'warning', 'danger'];
const UNDERLINES = ['none', 'hover', 'always'];
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Icon ↗ (mở ra ngoài) — vẽ bằng nét, màu theo currentColor */
function createExternalIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('part', 'external-icon');
  svg.setAttribute('class', 'link__external');
  for (const d of ['M7 17 17 7', 'M8 7h9v9']) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

/**
 * @slot - Nội dung liên kết
 * @slot icon - Icon phía trước chữ
 * @csspart base - Thẻ <a> bên trong
 * @csspart external-icon - Icon ↗ khi external
 * @cssprop --hui-link-color - Màu chữ (mặc định --hui-primary; type thắng)
 * @cssprop --hui-link-hover-color - Màu khi hover
 * @cssprop --hui-link-active-color - Màu khi nhấn
 * @cssprop --hui-link-disabled-color - Màu khi disabled
 * @cssprop --hui-link-font-weight - Độ đậm chữ
 * @cssprop --hui-link-underline-offset - Khoảng cách gạch chân (mặc định 0.2em)
 * @cssprop --hui-link-gap - Khoảng cách icon ↔ chữ
 */
class HuiLink extends HuiElement {
  static properties = {
    /** Đường dẫn */
    href: { type: String },
    /** _self | _blank | _parent | _top — nơi mở liên kết (external mặc định _blank) */
    target: { type: String },
    /** Thuộc tính rel (target="_blank" tự thêm "noopener noreferrer") */
    rel: { type: String },
    /** Tải xuống thay vì mở (giá trị = tên file gợi ý, để trống = tên gốc) */
    download: { type: String },
    /** Liên kết ra ngoài: hiện icon ↗ và mở tab mới */
    external: { type: Boolean },
    /** none | hover | always — khi nào hiện gạch chân */
    underline: { type: String, default: 'hover' },
    /** secondary | success | warning | danger — màu ngữ nghĩa */
    type: { type: String },
    /** Vô hiệu hóa: bỏ href, không focus, không điều hướng */
    disabled: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._iconSlot = createElement('slot', { name: 'icon' });
    this._external = createExternalIcon();
    this._anchor = createElement('a', { part: 'base', className: 'link' }, this._iconSlot, createElement('slot'), this._external);

    // Chặn click khi disabled (listener capture trên host chạy trước listener của người dùng)
    this.addEventListener('click', (e) => {
      if (this.disabled) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
    return this._anchor;
  }

  updated(changed) {
    const a = this._anchor;
    const target = this.target || (this.external ? '_blank' : null);

    if (changed.has('href') || changed.has('disabled')) {
      // Bỏ href → thẻ <a> không còn focus/điều hướng được; role="link" giữ ngữ nghĩa cho trình đọc màn hình
      if (this.href && !this.disabled) a.setAttribute('href', this.href);
      else a.removeAttribute('href');
      if (this.disabled) {
        a.setAttribute('aria-disabled', 'true');
        a.setAttribute('role', 'link');
      } else {
        a.removeAttribute('aria-disabled');
        a.removeAttribute('role');
      }
    }

    if (target) a.setAttribute('target', target);
    else a.removeAttribute('target');

    // Mở tab mới → chặn trang đích truy cập window.opener
    const rel = this.rel || (target === '_blank' ? 'noopener noreferrer' : null);
    if (rel) a.setAttribute('rel', rel);
    else a.removeAttribute('rel');

    if (this.download !== null) a.setAttribute('download', this.download);
    else a.removeAttribute('download');

    this._external.style.display = this.external ? '' : 'none';

    const underline = UNDERLINES.includes(this.underline) ? this.underline : 'hover';
    a.className = [
      'link',
      `link--underline-${underline}`,
      TYPES.includes(this.type) ? `link--${this.type}` : '',
      this.disabled ? 'link--disabled' : '',
    ].filter(Boolean).join(' ');
  }

  /** Đưa focus vào thẻ <a> bên trong */
  focus(options) {
    this._anchor ? this._anchor.focus(options) : super.focus(options);
  }

  blur() {
    this._anchor?.blur();
  }

  click() {
    this._anchor ? this._anchor.click() : super.click();
  }
}

defineElement('hui-link', HuiLink);

export default HuiLink;
