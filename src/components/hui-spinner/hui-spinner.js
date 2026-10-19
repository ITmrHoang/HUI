/**
 * HUI Spinner — Vòng xoay báo trạng thái đang tải (Web Component Vanilla JS)
 *
 * Kết hợp ý tưởng từ Ant Design <Spin> và MUI <CircularProgress>:
 * - type="circular": vòng tròn SVG (giống MUI), hỗ trợ cả indeterminate (xoay vô hạn)
 *   và determinate (có `value` 0–100 → vẽ cung tròn theo phần trăm)
 * - type="dots": 3 chấm nhảy lên xuống
 * - Wrapper mode (giống Ant Spin bọc children): nếu có nội dung trong slot mặc định,
 *   spinner sẽ phủ một lớp overlay mờ lên nội dung khi đang `spinning`
 * - Sizes: sm, md, lg hoặc một con số (px)
 * - Colors: primary, secondary, success, warning, danger, info, inherit hoặc màu CSS bất kỳ
 */

import styles from './hui-spinner.css?raw';
import { createElement, createStyle, ensureTokens } from '../../utils/dom.js';

// Các màu có sẵn trong design tokens
const COLOR_VARIANTS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

// Kích thước chuẩn (px) theo từng size keyword
const SIZE_MAP = { sm: 16, md: 24, lg: 36 };

// SVG namespace — bắt buộc dùng createElementNS thì trình duyệt mới hiểu là thẻ SVG
const SVG_NS = 'http://www.w3.org/2000/svg';

// Kích thước hệ tọa độ SVG (giống MUI: viewBox="22 22 44 44", tâm ở (44, 44))
const VIEWBOX_SIZE = 44;

class HuiSpinner extends HTMLElement {
  static get observedAttributes() {
    return ['size', 'color', 'thickness', 'type', 'value', 'label', 'label-position', 'spinning'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null;
    this._initialized = false;
    // Có nội dung trong slot mặc định hay không → quyết định chế độ wrapper / standalone
    this._hasContent = false;

    // Lắng nghe 'slotchange' ngay trên shadowRoot (event này bubble trong shadow tree).
    // Khi người dùng thêm/xóa children, ta kiểm tra lại để chuyển chế độ.
    this.shadowRoot.addEventListener('slotchange', () => {
      const hasContent = this._detectContent();
      // Chỉ render lại khi chế độ thực sự thay đổi → tránh vòng lặp vô hạn
      // (vì mỗi lần render lại sẽ tạo <slot> mới và lại bắn slotchange)
      if (hasContent !== this._hasContent) this._render();
    });
  }

  connectedCallback() {
    // Chỉ tiêm style 1 lần duy nhất — nếu phần tử bị gỡ ra rồi gắn lại thì không bị nhân đôi <style>
    if (!this._initialized) {
      ensureTokens();
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
   * Kiểm tra Light DOM xem có nội dung "thật" cho slot mặc định không.
   * Bỏ qua các text node chỉ chứa khoảng trắng (xuống dòng, thụt lề trong HTML).
   */
  _detectContent() {
    return Array.from(this.childNodes).some((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return !node.hasAttribute('slot');
      if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim() !== '';
      return false;
    });
  }

  /** Đổi giá trị `size` thành số px. Hỗ trợ keyword (sm/md/lg) hoặc số tự do. */
  _getSizePx() {
    const size = this.getAttribute('size') || 'md';
    if (SIZE_MAP[size]) return SIZE_MAP[size];
    const num = parseFloat(size);
    return Number.isFinite(num) && num > 0 ? num : SIZE_MAP.md;
  }

  /** Đổi `color` thành giá trị CSS: token biến thể, currentColor, hoặc giữ nguyên màu tự do. */
  _getColor() {
    const color = this.getAttribute('color') || 'primary';
    if (COLOR_VARIANTS.includes(color)) return `var(--hui-${color})`;
    if (color === 'inherit') return 'currentColor';
    return color;
  }

  /**
   * Đọc `value`. Trả về null nếu không có (→ indeterminate),
   * ngược lại kẹp (clamp) vào khoảng 0–100.
   */
  _getValue() {
    const raw = this.getAttribute('value');
    if (raw === null || raw === '') return null;
    const num = parseFloat(raw);
    if (!Number.isFinite(num)) return null;
    return Math.min(100, Math.max(0, num));
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  /**
   * Vẽ vòng tròn SVG kiểu MUI.
   * - Indeterminate: SVG xoay + nét vẽ co giãn bằng animation stroke-dasharray (định nghĩa trong CSS)
   * - Determinate: tính chu vi rồi dùng stroke-dashoffset để "che" phần chưa hoàn thành
   */
  _createCircular(thickness, value) {
    const radius = (VIEWBOX_SIZE - thickness) / 2;
    const center = VIEWBOX_SIZE; // Tâm (44, 44) do viewBox bắt đầu từ 22

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'hui-spinner__svg');
    svg.setAttribute('viewBox', `${VIEWBOX_SIZE / 2} ${VIEWBOX_SIZE / 2} ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`);

    const makeCircle = (className) => {
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('class', className);
      circle.setAttribute('cx', center);
      circle.setAttribute('cy', center);
      circle.setAttribute('r', radius);
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke-width', thickness);
      return circle;
    };

    if (value !== null) {
      // Determinate: thêm vòng "track" mờ phía sau để người dùng thấy được tổng quãng đường
      svg.appendChild(makeCircle('hui-spinner__track'));

      const circle = makeCircle('hui-spinner__circle');
      const circumference = 2 * Math.PI * radius;
      // Toàn bộ chu vi là 1 đoạn nét liền; dịch offset để chỉ lộ ra đúng `value`%
      circle.style.strokeDasharray = `${circumference.toFixed(3)}px`;
      circle.style.strokeDashoffset = `${(((100 - value) / 100) * circumference).toFixed(3)}px`;
      svg.appendChild(circle);
    } else {
      svg.appendChild(makeCircle('hui-spinner__circle'));
    }

    return svg;
  }

  /** Vẽ 3 chấm nhảy (animation-delay lệch nhau được đặt trong CSS). */
  _createDots() {
    return createElement('span', { className: 'hui-spinner__dots' },
      createElement('span', { className: 'hui-spinner__dot' }),
      createElement('span', { className: 'hui-spinner__dot' }),
      createElement('span', { className: 'hui-spinner__dot' }),
    );
  }

  /** Tạo khối spinner (icon + label) — dùng chung cho cả standalone và overlay. */
  _createIndicator() {
    const type = this.getAttribute('type') === 'dots' ? 'dots' : 'circular';
    const label = this.getAttribute('label');
    const labelPos = this.getAttribute('label-position') === 'right' ? 'right' : 'bottom';
    const thicknessRaw = parseFloat(this.getAttribute('thickness'));
    const thickness = Number.isFinite(thicknessRaw) && thicknessRaw > 0
      ? Math.min(thicknessRaw, VIEWBOX_SIZE / 2) // Không cho nét dày hơn bán kính
      : 4;
    // Chế độ determinate chỉ áp dụng cho kiểu circular
    const value = type === 'circular' ? this._getValue() : null;

    const classes = [
      'hui-spinner',
      `hui-spinner--${type}`,
      `hui-spinner--label-${labelPos}`,
      value !== null ? 'hui-spinner--determinate' : 'hui-spinner--indeterminate',
    ].join(' ');

    // Thuộc tính trợ năng (accessibility) cho trình đọc màn hình
    const ariaAttrs = {
      role: 'progressbar',
      'aria-label': label || 'Loading',
    };
    if (value !== null) {
      ariaAttrs['aria-valuemin'] = '0';
      ariaAttrs['aria-valuemax'] = '100';
      ariaAttrs['aria-valuenow'] = String(Math.round(value));
    }

    const icon = createElement('span', { className: 'hui-spinner__icon', 'aria-hidden': 'true' },
      type === 'dots' ? this._createDots() : this._createCircular(thickness, value),
    );

    const labelEl = label
      ? createElement('span', { className: 'hui-spinner__label', 'aria-hidden': 'true' }, label)
      : null;

    const indicator = createElement('span', { className: classes, ...ariaAttrs },
      icon, ...[labelEl].filter(Boolean),
    );

    // Truyền size + màu qua CSS custom property → CSS tự tính kích thước chấm, nét vẽ...
    indicator.style.setProperty('--_spinner-size', `${this._getSizePx()}px`);
    indicator.style.setProperty('--_spinner-color', this._getColor());
    return indicator;
  }

  _render() {
    if (this._wrapper) this._wrapper.remove();

    this._hasContent = this._detectContent();
    // Thuộc tính nội bộ trên host để CSS đổi display (inline-block ↔ block)
    this.toggleAttribute('data-nested', this._hasContent);

    // Slot luôn được render để luôn bắt được 'slotchange' khi người dùng thêm children
    const slot = createElement('slot');

    if (!this._hasContent) {
      // ===== STANDALONE: chỉ hiển thị spinner (slot rỗng nằm ẩn bên trong) =====
      this._wrapper = createElement('span', { className: 'hui-spinner-root' },
        this._createIndicator(),
        createElement('span', { className: 'hui-spinner__hidden-slot' }, slot),
      );
    } else {
      // ===== WRAPPER MODE (giống Ant Spin bọc nội dung) =====
      // Chỉ khi spinning="false" mới tắt — mọi giá trị khác (kể cả không set) đều đang xoay
      const spinning = this.getAttribute('spinning') !== 'false';

      const content = createElement('div', {
        className: `hui-spin-content${spinning ? ' hui-spin-content--blur' : ''}`,
        // Khi đang loading, chặn người dùng thao tác lên nội dung bên dưới
        inert: spinning,
      }, slot);

      const overlay = spinning
        ? createElement('div', { className: 'hui-spin-overlay' }, this._createIndicator())
        : null;

      this._wrapper = createElement('div', {
        className: 'hui-spin-container',
        'aria-busy': spinning ? 'true' : 'false',
      }, content, ...[overlay].filter(Boolean));
    }

    this.shadowRoot.appendChild(this._wrapper);
  }
}

if (!customElements.get('hui-spinner')) {
  customElements.define('hui-spinner', HuiSpinner);
}

export default HuiSpinner;
