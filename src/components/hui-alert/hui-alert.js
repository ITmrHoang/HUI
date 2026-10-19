/**
 * HUI Alert — Hộp thông báo trạng thái (Web Component Vanilla JS)
 *
 * Kết hợp API của Ant Design Alert + MUI Alert:
 * - severity (MUI) / type (Ant): info, success, warning, error
 * - variant: standard (nền nhạt), filled (nền đặc), outlined (chỉ viền)
 * - title + description, icon mặc định theo severity (có thể ẩn hoặc thay bằng slot)
 * - closable: nút đóng, có animation thu gọn rồi tự ẩn bằng attribute `hidden`
 * - banner: hiển thị dạng dải ngang full width ở đầu trang
 */

import styles from './hui-alert.css?raw';
import { createElement, createStyle, ensureTokens } from '../../utils/dom.js';
import { emitEvent } from '../../utils/events.js';

// Bộ icon SVG mặc định cho từng severity (vẽ bằng stroke để ăn theo currentColor)
const ICONS = {
  info: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>`,
  success: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="8 12.5 11 15.5 16 9.5"></polyline>
    </svg>`,
  warning: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`,
  error: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>`,
};

const CLOSE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`;

const SEVERITIES = ['info', 'success', 'warning', 'error'];
const VARIANTS = ['standard', 'filled', 'outlined'];
const SIZES = ['sm', 'md', 'lg'];

class HuiAlert extends HTMLElement {
  static get observedAttributes() {
    return [
      'severity', 'type', 'variant', 'title', 'description',
      'hide-icon', 'closable', 'close-text', 'banner', 'size',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null;
    this._stylesInjected = false; // Cờ đảm bảo chỉ chèn <style> một lần
    this._closing = false;        // Đang chạy animation đóng → chặn gọi close() lặp
  }

  // =====================================================
  // LIFECYCLE CALLBACKS
  // =====================================================

  connectedCallback() {
    // Khi element bị gỡ ra rồi gắn lại (ví dụ di chuyển trong DOM), connectedCallback chạy lại.
    // Dùng cờ để không nhân bản thẻ <style> trong Shadow DOM.
    if (!this._stylesInjected) {
      ensureTokens();
      this.shadowRoot.appendChild(createStyle(styles));
      this._stylesInjected = true;
    }
    if (!this._wrapper) this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (this._wrapper) this._render();
  }

  // =====================================================
  // GETTERS TIỆN ÍCH
  // =====================================================

  /** Severity thực tế: ưu tiên `severity` (MUI), fallback sang `type` (Ant), mặc định 'info' */
  get severity() {
    const val = this.getAttribute('severity') || this.getAttribute('type');
    return SEVERITIES.includes(val) ? val : 'info';
  }
  set severity(val) {
    this.setAttribute('severity', val);
  }

  // =====================================================
  // PUBLIC METHODS
  // =====================================================

  /**
   * Đóng alert (giống bấm nút ×).
   * 1. Bắn event `close` có thể hủy (cancelable) → nếu người dùng gọi preventDefault() thì dừng.
   * 2. Chạy animation thu gọn chiều cao + mờ dần.
   * 3. Kết thúc: gắn attribute `hidden` và bắn event `after-close`.
   */
  close() {
    if (this._closing || this.hidden) return;

    const allowed = emitEvent(this, 'close', null, { cancelable: true });
    if (!allowed) return;

    this._closing = true;
    const el = this._wrapper;

    // Hàm kết thúc — có cờ `done` để không chạy 2 lần (transitionend + timeout dự phòng)
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (el) {
        el.classList.remove('hui-alert--closing');
        el.style.height = '';
      }
      this._closing = false;
      this.setAttribute('hidden', '');
      emitEvent(this, 'after-close');
    };

    if (!el) {
      finish();
      return;
    }

    // Kỹ thuật animate height: đặt height cố định = chiều cao hiện tại (px),
    // ép trình duyệt reflow, rồi mới thêm class để chuyển height → 0.
    el.style.height = `${el.offsetHeight}px`;
    void el.offsetHeight; // Đọc layout để ép reflow
    el.classList.add('hui-alert--closing');

    el.addEventListener('transitionend', (e) => {
      if (e.target === el && e.propertyName === 'height') finish();
    });
    // Dự phòng: nếu transition bị tắt (prefers-reduced-motion) thì transitionend không bao giờ chạy
    setTimeout(finish, 400);
  }

  // =====================================================
  // SLOT HELPERS
  // =====================================================

  /**
   * Kiểm tra Light DOM có nội dung gán vào slot `name` hay không.
   * - name rỗng: slot mặc định → node không có attribute slot (bỏ qua text chỉ toàn khoảng trắng)
   */
  _hasSlotted(name) {
    return Array.from(this.childNodes).some((node) => {
      if (node.nodeType === Node.TEXT_NODE) return !name && node.textContent.trim() !== '';
      if (node.nodeType !== Node.ELEMENT_NODE) return false;
      return name ? node.getAttribute('slot') === name : !node.hasAttribute('slot');
    });
  }

  /** Bật/tắt các class "has-*" để ẩn những khối trống (title, mô tả, action) */
  _updateSlotState() {
    if (!this._wrapper) return;
    const hasTitle = this.hasAttribute('title') || this._hasSlotted('title');
    const hasDesc = this.hasAttribute('description') || this._hasSlotted('');
    const hasAction = this._hasSlotted('action');

    this._wrapper.classList.toggle('hui-alert--has-title', hasTitle);
    this._wrapper.classList.toggle('hui-alert--has-description', hasDesc);
    this._wrapper.classList.toggle('hui-alert--has-action', hasAction);
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  _render() {
    if (this._wrapper) this._wrapper.remove();

    const severity = this.severity;
    const variantAttr = this.getAttribute('variant');
    const variant = VARIANTS.includes(variantAttr) ? variantAttr : 'standard';
    const sizeAttr = this.getAttribute('size');
    const size = SIZES.includes(sizeAttr) ? sizeAttr : 'md';
    const hideIcon = this.hasAttribute('hide-icon');
    const closable = this.hasAttribute('closable');
    const closeText = this.getAttribute('close-text');
    const title = this.getAttribute('title');
    const description = this.getAttribute('description');

    // Lưu ý: attribute `title` trên host sẽ tạo tooltip mặc định của trình duyệt.
    // Đây là hành vi chấp nhận được (giống Ant `message`), nếu không muốn thì dùng slot="title".

    const classes = [
      'hui-alert',
      `hui-alert--${severity}`,
      `hui-alert--${variant}`,
      `hui-alert--${size}`,
    ].join(' ');

    // 1. Icon: slot "icon" cho phép thay icon, nội dung fallback là SVG mặc định theo severity
    let iconEl = null;
    if (!hideIcon) {
      const iconSlot = createElement('slot', { name: 'icon' });
      iconSlot.innerHTML = ICONS[severity]; // SVG tĩnh do thư viện định nghĩa → an toàn
      iconEl = createElement('div', { className: 'hui-alert__icon' }, iconSlot);
    }

    // 2. Nội dung: title (slot "title", fallback attr) + mô tả (slot mặc định, fallback attr)
    // Fallback truyền dưới dạng text node (không dùng innerHTML) để tránh XSS.
    const titleSlot = createElement('slot', { name: 'title' }, title || '');
    const descSlot = createElement('slot', {}, description || '');
    titleSlot.addEventListener('slotchange', () => this._updateSlotState());
    descSlot.addEventListener('slotchange', () => this._updateSlotState());

    const contentEl = createElement('div', { className: 'hui-alert__content' },
      createElement('div', { className: 'hui-alert__title' }, titleSlot),
      createElement('div', { className: 'hui-alert__description' }, descSlot),
    );

    // 3. Action: vùng nút hành động bên phải (giống MUI `action` / Ant `action`)
    const actionSlot = createElement('slot', { name: 'action' });
    actionSlot.addEventListener('slotchange', () => this._updateSlotState());
    const actionEl = createElement('div', { className: 'hui-alert__action' }, actionSlot);

    // 4. Nút đóng: hiển thị text (close-text) hoặc icon ×
    let closeBtn = null;
    if (closable) {
      closeBtn = createElement('button', {
        type: 'button',
        className: closeText ? 'hui-alert__close hui-alert__close--text' : 'hui-alert__close',
        'aria-label': closeText || 'Đóng',
        onClick: () => this.close(),
      });
      if (closeText) closeBtn.textContent = closeText;
      else closeBtn.innerHTML = CLOSE_ICON;
    }

    // 5. Wrapper: role="alert" (đọc ngay lập tức) cho lỗi/cảnh báo,
    // role="status" (đọc lịch sự, không ngắt lời) cho info/success
    this._wrapper = createElement('div', {
      className: classes,
      role: severity === 'error' || severity === 'warning' ? 'alert' : 'status',
      part: 'base',
    }, ...[iconEl, contentEl, actionEl, closeBtn].filter(Boolean));

    this.shadowRoot.appendChild(this._wrapper);
    this._updateSlotState();
  }
}

if (!customElements.get('hui-alert')) {
  customElements.define('hui-alert', HuiAlert);
}

export default HuiAlert;
