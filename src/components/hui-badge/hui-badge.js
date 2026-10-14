/**
 * HUI Badge — Huy hiệu số đếm / chấm trạng thái (Web Component Vanilla JS)
 *
 * Kết hợp ý tưởng từ Ant Design <Badge> và MUI <Badge>:
 * - Bọc nội dung (icon, avatar, nút...) và gắn chỉ báo ở góc (placement)
 * - Không có nội dung → hiển thị như một badge inline độc lập
 * - count + max (99+), dot, show-zero, invisible (ẩn có animation)
 * - overlap="circular" (MUI): kéo chỉ báo vào trong cho phần tử tròn như avatar
 * - status (Ant): chấm trạng thái + text, "processing" có vòng sóng lan tỏa
 * - Slot "count": tự truyền nội dung chỉ báo (ví dụ một icon)
 */

import styles from './hui-badge.css?raw';
import { createElement, createStyle, injectTokens } from '../../utils/dom.js';

const COLOR_VARIANTS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

// Map trạng thái kiểu Ant Design → token màu của HUI
const STATUS_COLORS = {
  success: 'var(--hui-success)',
  processing: 'var(--hui-info)',
  default: 'var(--hui-text-muted)',
  error: 'var(--hui-danger)',
  warning: 'var(--hui-warning)',
};

const PLACEMENTS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];

class HuiBadge extends HTMLElement {
  static get observedAttributes() {
    return [
      'count', 'max', 'dot', 'show-zero', 'color', 'variant', 'placement',
      'overlap', 'offset', 'status', 'text', 'invisible', 'size',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null;
    this._initialized = false;

    // Trạng thái của lần render trước — dùng để quyết định chạy animation nào
    // (vì mỗi lần render là tạo DOM mới nên không thể dùng CSS transition thông thường)
    this._prevVisible = null;
    this._prevDisplay = null;

    // Lưu kết quả kiểm tra slot để chỉ render lại khi thực sự thay đổi
    this._hasContent = false;
    this._hasCustomCount = false;

    this.shadowRoot.addEventListener('slotchange', () => {
      if (
        this._detectContent() !== this._hasContent ||
        this._detectContent('count') !== this._hasCustomCount
      ) {
        this._render();
      }
    });
  }

  connectedCallback() {
    // Chỉ tiêm style 1 lần — tránh nhân đôi <style> khi phần tử được gắn lại vào DOM
    if (!this._initialized) {
      injectTokens(this.shadowRoot);
      this.shadowRoot.appendChild(createStyle(styles));
      this._initialized = true;
    }
    this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (this._wrapper) this._render();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Kiểm tra Light DOM có nội dung cho slot không.
   * @param {string} [slotName] - bỏ trống = slot mặc định
   */
  _detectContent(slotName) {
    return Array.from(this.childNodes).some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return slotName ? node.getAttribute('slot') === slotName : !node.hasAttribute('slot');
      }
      // Text node chỉ thuộc về slot mặc định, bỏ qua khoảng trắng
      if (!slotName && node.nodeType === Node.TEXT_NODE) return node.textContent.trim() !== '';
      return false;
    });
  }

  /** Biến thể → token màu; còn lại coi là màu CSS tự do (#hex, rgb(), tên màu...). */
  _getColor() {
    const status = this.getAttribute('status');
    if (status && STATUS_COLORS[status]) return STATUS_COLORS[status];
    const color = this.getAttribute('color') || 'danger';
    return COLOR_VARIANTS.includes(color) ? `var(--hui-${color})` : color;
  }

  /**
   * Tính nội dung hiển thị của chỉ báo.
   * - Số: vượt quá `max` → "max+" (ví dụ 99+)
   * - Chuỗi không phải số: giữ nguyên (ví dụ "NEW", "HOT")
   */
  _getCountInfo() {
    const raw = this.getAttribute('count');
    const isEmpty = raw === null || raw.trim() === '';
    const num = isEmpty ? NaN : Number(raw);
    const isNumeric = Number.isFinite(num);
    const max = parseInt(this.getAttribute('max'), 10);
    const safeMax = Number.isFinite(max) && max > 0 ? max : 99;

    let display = '';
    if (isNumeric) display = num > safeMax ? `${safeMax}+` : String(num);
    else if (!isEmpty) display = raw.trim();

    return { isEmpty, isZero: isNumeric && num === 0, display };
  }

  /** Đọc offset dạng "x,y" (px) → dịch chuyển chỉ báo khỏi vị trí góc. */
  _getOffset() {
    const raw = this.getAttribute('offset');
    if (!raw) return [0, 0];
    const [x, y] = raw.split(',').map((v) => parseFloat(v));
    return [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0];
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  /** Chế độ status (Ant): chấm màu + text, không bọc nội dung. */
  _renderStatus(status, text) {
    const dot = createElement('span', {
      className: `hui-badge-status__dot${status === 'processing' ? ' hui-badge-status__dot--processing' : ''}`,
      'aria-hidden': 'true',
    });
    const textEl = text ? createElement('span', { className: 'hui-badge-status__text' }, text) : null;

    // Không có text thì chấm màu vẫn cần nhãn cho trình đọc màn hình
    const attrs = text
      ? { className: 'hui-badge-status' }
      : { className: 'hui-badge-status', role: 'img', 'aria-label': status };

    // Slot rỗng (ẩn) để vẫn bắt được slotchange nếu người dùng chèn children sau này
    const hiddenSlots = createElement('span', { className: 'hui-badge__hidden-slot' },
      createElement('slot'),
      createElement('slot', { name: 'count' }),
    );

    const wrapper = createElement('span', attrs, dot, ...[textEl].filter(Boolean), hiddenSlots);
    wrapper.style.setProperty('--_badge-bg', this._getColor());
    return wrapper;
  }

  _render() {
    if (this._wrapper) this._wrapper.remove();

    this._hasContent = this._detectContent();
    this._hasCustomCount = this._detectContent('count');

    const status = this.getAttribute('status');
    const text = this.getAttribute('text');

    // ===== STATUS MODE KHÔNG CÓ CHILDREN → chấm + text inline =====
    if (status && STATUS_COLORS[status] && !this._hasContent) {
      this._wrapper = this._renderStatus(status, text);
      this.shadowRoot.appendChild(this._wrapper);
      return;
    }

    const size = this.getAttribute('size') === 'sm' ? 'sm' : 'md';
    const variant = this.getAttribute('variant') === 'soft' ? 'soft' : 'standard';
    const placementAttr = this.getAttribute('placement');
    const placement = PLACEMENTS.includes(placementAttr) ? placementAttr : 'top-right';
    const overlap = this.getAttribute('overlap') === 'circular' ? 'circular' : 'rectangular';
    const showZero = this.hasAttribute('show-zero');
    const invisible = this.hasAttribute('invisible');

    const { isEmpty, isZero, display } = this._getCountInfo();
    // Status + children: hiển thị chấm màu theo trạng thái ở góc
    const isStatusDot = Boolean(status && STATUS_COLORS[status]);
    // Logic giống Ant Design: dot chỉ bị ẩn khi count = 0 (trừ khi show-zero)
    const isDot = (this.hasAttribute('dot') || isStatusDot) && !(isZero && !showZero);

    // Quyết định có hiển thị chỉ báo hay không
    const hiddenByCount = !isDot && !this._hasCustomCount && (isEmpty || (isZero && !showZero));
    const visible = !invisible && !hiddenByCount;

    // ===== CHỌN ANIMATION DỰA TRÊN TRẠNG THÁI LẦN TRƯỚC =====
    // - Lần render đầu: không animation
    // - Ẩn → hiện: phóng to từ 0 (enter)
    // - Hiện → ẩn: thu nhỏ về 0 (leave)
    // - Đang hiện mà số thay đổi: "nảy" nhẹ (bump)
    let animClass = '';
    if (this._prevVisible !== null) {
      if (visible && !this._prevVisible) animClass = 'hui-badge__indicator--enter';
      else if (!visible && this._prevVisible) animClass = 'hui-badge__indicator--leave';
      else if (visible && display !== this._prevDisplay) animClass = 'hui-badge__indicator--bump';
    }
    if (!visible && !animClass) animClass = 'hui-badge__indicator--hidden';
    this._prevVisible = visible;
    this._prevDisplay = display;

    const indicatorClasses = [
      'hui-badge__indicator',
      `hui-badge__indicator--${variant}`,
      `hui-badge__indicator--${size}`,
      isDot ? 'hui-badge__indicator--dot' : '',
      this._hasCustomCount && !isDot ? 'hui-badge__indicator--custom' : '',
      status === 'processing' && isDot ? 'hui-badge__indicator--processing' : '',
      animClass,
    ].filter(Boolean).join(' ');

    // Nội dung chỉ báo: dot → rỗng; custom → slot "count"; còn lại → text số đếm
    const countSlot = createElement('slot', { name: 'count' });
    const indicatorChildren = [];
    if (!isDot) {
      if (this._hasCustomCount) indicatorChildren.push(countSlot);
      else indicatorChildren.push(display);
    }

    const indicator = createElement('sup', { className: indicatorClasses }, ...indicatorChildren);

    // Slot "count" phải luôn nằm trong DOM để bắt slotchange (kể cả ở chế độ dot)
    if (!indicatorChildren.includes(countSlot)) {
      indicator.appendChild(createElement('span', { className: 'hui-badge__hidden-slot' }, countSlot));
    }

    // ===== ACCESSIBILITY =====
    if (!visible) {
      indicator.setAttribute('aria-hidden', 'true');
    } else if (isDot) {
      // Chấm không có chữ → cần nhãn mô tả (ưu tiên `text`, sau đó status)
      indicator.setAttribute('role', 'img');
      indicator.setAttribute('aria-label', text || status || 'Có thông báo mới');
    } else if (text) {
      // `text` ghi đè nội dung đọc của số đếm, ví dụ "5 thông báo chưa đọc"
      indicator.setAttribute('aria-label', text);
    }

    // Truyền màu + offset qua CSS custom property
    const [ox, oy] = this._getOffset();
    indicator.style.setProperty('--_badge-bg', this._getColor());
    indicator.style.setProperty('--_ox', `${ox}px`);
    indicator.style.setProperty('--_oy', `${oy}px`);

    const wrapperClasses = [
      'hui-badge',
      this._hasContent ? `hui-badge--${placement}` : 'hui-badge--standalone',
      this._hasContent ? `hui-badge--overlap-${overlap}` : '',
    ].filter(Boolean).join(' ');

    this._wrapper = createElement('span', { className: wrapperClasses },
      createElement('slot'),
      indicator,
    );

    this.shadowRoot.appendChild(this._wrapper);
  }
}

if (!customElements.get('hui-badge')) {
  customElements.define('hui-badge', HuiBadge);
}

export default HuiBadge;
