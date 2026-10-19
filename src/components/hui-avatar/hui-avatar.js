/**
 * HUI Avatar — Ảnh đại diện người dùng (Web Component Vanilla JS)
 *
 * Kết hợp ý tưởng từ Ant Design <Avatar> và MUI <Avatar>.
 * Thứ tự ưu tiên hiển thị (fallback chain):
 *   1. Ảnh từ `src` (nếu tải thành công)
 *   2. Nội dung slot mặc định (icon, chữ tùy ý)
 *   3. Chữ cái viết tắt từ `name` (ví dụ "Nguyễn Văn An" → "NA"), màu nền tự sinh theo tên
 *   4. Icon người dùng mặc định
 * - Sizes: sm, md, lg (theo token 26/32/38px), xl (56px) hoặc một con số (px)
 * - Shapes: circle, square, rounded
 */

import styles from './hui-avatar.css?raw';
import { createElement, createStyle, ensureTokens } from '../../utils/dom.js';
import { emitEvent } from '../../utils/events.js';

const COLOR_VARIANTS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

// Kích thước keyword → giá trị CSS (sm/md/lg dùng token chung để đồng bộ với button, input...)
const SIZE_MAP = {
  sm: 'var(--hui-size-sm)',
  md: 'var(--hui-size-md)',
  lg: 'var(--hui-size-lg)',
  xl: '56px',
};

// Bo góc theo hình dạng
const SHAPE_MAP = {
  circle: '50%',
  rounded: 'var(--hui-radius)',
  square: '0',
};

// Bảng màu dịu mắt cho avatar chữ cái — chọn theo hash của tên nên mỗi người luôn cố định 1 màu
const NAME_PALETTE = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
];

// Icon người dùng mặc định (khi không có ảnh, slot hay tên)
const USER_ICON = `
  <svg class="hui-avatar__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 12c2.7 0 4.8-2.2 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"></path>
  </svg>
`;

/**
 * Lấy chữ cái đầu từ tên: chữ đầu của từ đầu tiên + chữ đầu của từ cuối cùng.
 * Ví dụ: "Nguyễn Văn An" → "NA", "hoang" → "H".
 */
export function getInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  // Dùng Array.from để không cắt đôi ký tự Unicode nhiều byte (emoji, chữ có dấu tổ hợp)
  const first = Array.from(words[0])[0] || '';
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] || '' : '';
  return (first + last).toUpperCase();
}

/** Hash chuỗi đơn giản (djb2) → chọn 1 màu cố định trong bảng màu. */
function colorFromName(name) {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) + hash + name.charCodeAt(i)) | 0;
  }
  return NAME_PALETTE[Math.abs(hash) % NAME_PALETTE.length];
}

class HuiAvatar extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'alt', 'name', 'size', 'shape', 'color', 'bordered'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null;
    this._initialized = false;
    this._hasContent = false;
    // Ghi nhớ `src` đã tải lỗi → không thử tải lại ảnh hỏng mỗi lần render
    this._failedSrc = null;

    this.shadowRoot.addEventListener('slotchange', () => {
      if (this._detectContent() !== this._hasContent) this._render();
    });
  }

  connectedCallback() {
    // Chỉ tiêm style 1 lần — tránh nhân đôi <style> khi phần tử được gắn lại vào DOM
    if (!this._initialized) {
      ensureTokens();
      this.shadowRoot.appendChild(createStyle(styles));
      this._initialized = true;
    }
    this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    // Đổi ảnh mới → xóa trạng thái lỗi cũ để thử tải lại
    if (name === 'src') this._failedSrc = null;
    if (this._wrapper) this._render();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /** Kiểm tra Light DOM có nội dung cho slot mặc định không (bỏ qua khoảng trắng). */
  _detectContent() {
    return Array.from(this.childNodes).some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return !node.hasAttribute('slot');
      if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim() !== '';
      return false;
    });
  }

  /** Khi ảnh lỗi: bắn event 'error' (giống thẻ <img>) rồi render lại để chuyển sang fallback. */
  _handleImgError(src) {
    // Bỏ qua lỗi của ảnh cũ (đã bị thay bằng src mới trước khi kịp báo lỗi)
    if (src !== this.getAttribute('src')) return;
    this._failedSrc = src;
    // Giống <img> gốc: event 'error' không bubble, nhưng vẫn xuyên qua Shadow DOM (composed)
    emitEvent(this, 'error', { src }, { bubbles: false });
    this._render();
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  _render() {
    if (this._wrapper) this._wrapper.remove();

    this._hasContent = this._detectContent();

    const src = this.getAttribute('src');
    const alt = this.getAttribute('alt') || '';
    const name = (this.getAttribute('name') || '').trim();
    const size = this.getAttribute('size');
    const shape = this.getAttribute('shape');
    const color = this.getAttribute('color');
    const bordered = this.hasAttribute('bordered');

    const showImage = Boolean(src) && src !== this._failedSrc;
    const initials = getInitials(name);

    // ===== LỚP FALLBACK (luôn nằm dưới, ảnh sẽ phủ lên khi tải xong) =====
    // Slot luôn được render để luôn bắt được 'slotchange'
    const fallbackChildren = [createElement('slot')];
    let fallbackType = 'slot';
    if (!this._hasContent) {
      if (initials) {
        fallbackType = 'initials';
        fallbackChildren.push(createElement('span', { className: 'hui-avatar__initials' }, initials));
      } else {
        fallbackType = 'icon';
        const iconWrap = createElement('span', { className: 'hui-avatar__icon-wrap' });
        iconWrap.innerHTML = USER_ICON;
        fallbackChildren.push(iconWrap);
      }
    }
    const fallback = createElement('span', { className: 'hui-avatar__fallback' }, ...fallbackChildren);

    // ===== ẢNH =====
    let img = null;
    if (showImage) {
      img = createElement('img', {
        className: 'hui-avatar__img',
        src,
        alt,
        draggable: 'false',
        onError: () => this._handleImgError(src),
        // Ảnh tải xong → ẩn lớp fallback (tránh lộ chữ/icon phía sau ảnh PNG trong suốt)
        // (dùng parentNode của chính ảnh này, không dùng this._wrapper vì có thể đã bị render lại)
        onLoad: (e) => e.target.parentNode && e.target.parentNode.classList.add('hui-avatar--loaded'),
      });
    }

    const classes = [
      'hui-avatar',
      `hui-avatar--${fallbackType}`,
      showImage ? 'hui-avatar--has-image' : '',
      bordered ? 'hui-avatar--bordered' : '',
    ].filter(Boolean).join(' ');

    // Trợ năng: cả khối là một "hình ảnh" có nhãn là alt hoặc tên
    this._wrapper = createElement('span', {
      className: classes,
      role: 'img',
      'aria-label': alt || name || 'Avatar',
    }, fallback, ...[img].filter(Boolean));

    // ===== TRUYỀN STYLE QUA CSS CUSTOM PROPERTY =====
    // Chỉ set khi người dùng truyền attribute → nếu không, giá trị kế thừa từ
    // --hui-avatar-size / --hui-avatar-radius do hui-avatar-group đặt ở cha.
    if (size) {
      const num = parseFloat(size);
      const sizeValue = SIZE_MAP[size] || (Number.isFinite(num) && num > 0 ? `${num}px` : null);
      if (sizeValue) this._wrapper.style.setProperty('--_size', sizeValue);
    }
    if (shape && SHAPE_MAP[shape]) {
      this._wrapper.style.setProperty('--_radius', SHAPE_MAP[shape]);
    }

    // Màu nền: `color` (biến thể hoặc màu tự do) ưu tiên hơn màu tự sinh theo tên
    let bg = null;
    if (color) bg = COLOR_VARIANTS.includes(color) ? `var(--hui-${color})` : color;
    else if (fallbackType === 'initials') bg = colorFromName(name);
    if (bg) this._wrapper.style.setProperty('--_avatar-bg', bg);

    this.shadowRoot.appendChild(this._wrapper);
  }
}

if (!customElements.get('hui-avatar')) {
  customElements.define('hui-avatar', HuiAvatar);
}

export default HuiAvatar;
