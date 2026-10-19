/**
 * HUI Avatar — Ảnh đại diện (Ant Avatar + MUI Avatar). Parts/slots/biến CSS: xem JSDoc của class.
 * Thứ tự hiển thị: ảnh `src` → nội dung slot → chữ cái từ `name` → icon người dùng mặc định.
 */

import styles from './hui-avatar.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const COLOR_VARIANTS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

/** Size keyword → giá trị CSS (sm/md/lg dùng token chung với button, input...) */
export const AVATAR_SIZES = {
  sm: 'var(--hui-size-sm)',
  md: 'var(--hui-size-md)',
  lg: 'var(--hui-size-lg)',
  xl: '56px',
};

export const AVATAR_SHAPES = {
  circle: '50%',
  rounded: 'var(--hui-radius)',
  square: '0',
};

/** Màu nền avatar chữ cái — chọn theo hash của tên nên mỗi người luôn cố định 1 màu */
const NAME_PALETTE = [
  'var(--hui-primary)',
  'var(--hui-info)',
  'var(--hui-success)',
  'var(--hui-warning)',
  'var(--hui-danger)',
  'var(--hui-primary-8)',
  'var(--hui-secondary)',
  'var(--hui-info-8)',
];

const USER_ICON_PATH = 'M12 12c2.7 0 4.8-2.2 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z';

/** Size keyword hoặc số (px) → giá trị CSS; không hợp lệ → null */
export function avatarSizeValue(size) {
  if (!size) return null;
  if (AVATAR_SIZES[size]) return AVATAR_SIZES[size];
  const num = parseFloat(size);
  return Number.isFinite(num) && num > 0 ? `${num}px` : null;
}

/** Chữ đầu của từ đầu + từ cuối: "Nguyễn Văn An" → "NA", "hoang" → "H" */
export function getInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  // Array.from: không cắt đôi ký tự Unicode nhiều byte
  const first = Array.from(words[0])[0] || '';
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] || '' : '';
  return (first + last).toUpperCase();
}

/** Hash djb2 → 1 màu cố định trong bảng */
function colorFromName(name) {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) + hash + name.charCodeAt(i)) | 0;
  return NAME_PALETTE[Math.abs(hash) % NAME_PALETTE.length];
}

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * Ảnh đại diện với chuỗi fallback ảnh → slot → chữ cái → icon.
 *
 * @fires error - Ảnh tải thất bại (detail { src }, không bubble như <img>); avatar tự chuyển sang fallback
 * @slot - Icon hoặc chữ tùy ý, hiển thị khi không có ảnh (ưu tiên hơn name)
 * @csspart base - Khung avatar (role="img")
 * @csspart image - Ảnh
 * @csspart fallback - Lớp fallback (slot / chữ cái / icon)
 * @csspart initials - Chữ cái viết tắt
 * @csspart icon - Icon người dùng mặc định
 * @cssprop --hui-avatar-size - Kích thước mặc định (attribute size của avatar / group ưu tiên hơn)
 * @cssprop --hui-avatar-radius - Bo góc mặc định (attribute shape của avatar / group ưu tiên hơn)
 * @cssprop --hui-avatar-bg - Nền (ghi đè color và màu tự sinh theo tên)
 * @cssprop --hui-avatar-color - Màu chữ / icon
 * @cssprop --hui-avatar-font-size - Cỡ chữ (mặc định 40% kích thước)
 * @cssprop --hui-avatar-ring - Độ dày vòng viền (bordered: 2px, trong group: 2px)
 * @cssprop --hui-avatar-ring-color - Màu vòng viền
 */
class HuiAvatar extends HuiElement {
  static properties = {
    /** Đường dẫn ảnh */
    src: { type: String },
    /** Mô tả ảnh, đồng thời là aria-label */
    alt: { type: String },
    /** Tên người dùng → chữ cái viết tắt + màu nền tự sinh */
    name: { type: String },
    /** sm | md | lg | xl hoặc số px. Vắng mặt → theo group / --hui-avatar-size / md */
    size: { type: String },
    /** circle | square | rounded */
    shape: { type: String },
    /** Màu nền: primary | secondary | success | warning | danger | info hoặc màu CSS */
    color: { type: String },
    /** Vòng viền bao quanh */
    bordered: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._hasContent = false;
    /** src đã tải lỗi → không thử tải lại cho tới khi src đổi */
    this._failedSrc = null;
    this._loaded = false;

    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => {
      const next = hasContent(this._slot);
      if (next !== this._hasContent) {
        this._hasContent = next;
        this._sync();
      }
    });
    this._initials = createElement('span', { className: 'hui-avatar__initials', part: 'initials' });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hui-avatar__icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', USER_ICON_PATH);
    svg.appendChild(path);
    this._icon = createElement('span', { className: 'hui-avatar__icon-wrap', part: 'icon', 'aria-hidden': 'true' }, svg);

    const fallback = createElement('span', { className: 'hui-avatar__fallback', part: 'fallback' },
      this._slot, this._initials, this._icon);

    this._img = createElement('img', { className: 'hui-avatar__img', part: 'image', draggable: 'false', alt: '', hidden: true });
    this._img.addEventListener('load', () => {
      this._loaded = true;
      this._base.classList.add('hui-avatar--loaded');
    });
    this._img.addEventListener('error', () => this._handleImgError());

    this._base = createElement('span', { part: 'base', role: 'img' }, fallback, this._img);
    return this._base;
  }

  updated(changed) {
    if (!this._ready) {
      this._ready = true;
      this._hasContent = hasContent(this._slot);
    }

    if (changed.has('src')) {
      // Ảnh mới → xóa trạng thái lỗi / đã tải cũ
      this._failedSrc = null;
      this._loaded = false;
      if (this.src) this._img.src = this.src;
      else this._img.removeAttribute('src');
    }
    if (changed.has('alt')) this._img.alt = this.alt || '';

    // Chỉ đặt khi có attribute → nếu không, giá trị lấy từ group / biến CSS (xem hui-avatar.css)
    if (changed.has('size')) {
      const v = avatarSizeValue(this.size);
      if (v) this._base.style.setProperty('--_avatar-size', v);
      else this._base.style.removeProperty('--_avatar-size');
    }
    if (changed.has('shape')) {
      if (AVATAR_SHAPES[this.shape]) this._base.style.setProperty('--_avatar-radius', AVATAR_SHAPES[this.shape]);
      else this._base.style.removeProperty('--_avatar-radius');
    }

    this._sync();
  }

  _sync() {
    const name = (this.name || '').trim();
    const initials = getInitials(name);
    const showImage = Boolean(this.src) && this.src !== this._failedSrc;
    const fallbackType = this._hasContent ? 'slot' : initials ? 'initials' : 'icon';

    this._img.hidden = !showImage;
    this._initials.textContent = initials;
    this._initials.hidden = fallbackType !== 'initials';
    this._icon.hidden = fallbackType !== 'icon';

    this._base.className = [
      'hui-avatar',
      `hui-avatar--${fallbackType}`,
      showImage ? 'hui-avatar--has-image' : '',
      // Ảnh đã tải → ẩn fallback phía sau (tránh lộ chữ sau ảnh PNG trong suốt)
      showImage && this._loaded ? 'hui-avatar--loaded' : '',
      this.bordered ? 'hui-avatar--bordered' : '',
    ].filter(Boolean).join(' ');
    this._base.setAttribute('aria-label', this.alt || name || 'Avatar');

    // Màu nền: `color` ưu tiên hơn màu tự sinh theo tên
    let bg = null;
    if (this.color) bg = COLOR_VARIANTS.includes(this.color) ? `var(--hui-${this.color})` : this.color;
    else if (fallbackType === 'initials') bg = colorFromName(name);
    if (bg) this._base.style.setProperty('--_avatar-bg', bg);
    else this._base.style.removeProperty('--_avatar-bg');
  }

  _handleImgError() {
    const src = this._img.getAttribute('src');
    // Bỏ qua lỗi của ảnh cũ đã bị thay bằng src mới
    if (!src || src !== this.src) return;
    this._failedSrc = src;
    this._loaded = false;
    // Giống <img>: 'error' không bubble nhưng vẫn xuyên Shadow DOM (composed)
    this.emit('error', { src }, { bubbles: false });
    this._sync();
  }
}

defineElement('hui-avatar', HuiAvatar);

export default HuiAvatar;
