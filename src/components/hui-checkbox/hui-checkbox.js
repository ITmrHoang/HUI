/**
 * HUI Checkbox — Component hộp kiểm đa năng (Web Component Vanilla JS)
 *
 * Hỗ trợ:
 * - Checked, Indeterminate states
 * - Label: Trái, Phải hoặc không có label
 * - Variants (Màu sắc): primary, success, danger, warning
 * - Sizes: sm, md, lg
 * - Disabled, required, error
 */

import styles from './hui-checkbox.css?raw';
import { createElement, createStyle, injectTokens } from '../../utils/dom.js';
import { emitEvent } from '../../utils/events.js';

class HuiCheckbox extends HTMLElement {
  static get observedAttributes() {
    return [
      'checked', 'indeterminate', 'disabled', 'required', 'label', 
      'label-position', 'size', 'variant', 'error', 'name', 'value'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null;
    this._input = null;

    // Giữ state nội bộ cho checked và indeterminate để xử lý
    this._checked = false;
    this._indeterminate = false;
  }

  // =====================================================
  // KẾT NỐI PROPERTIES THÔNG THƯỜNG (GET/SET)
  // =====================================================

  get checked() {
    return this._checked;
  }
  set checked(val) {
    const isChecked = Boolean(val);
    if (this._checked !== isChecked) {
      this._checked = isChecked;
      if (isChecked) {
        this.setAttribute('checked', '');
      } else {
        this.removeAttribute('checked');
      }
      this._render();
    }
  }

  get indeterminate() {
    return this._indeterminate;
  }
  set indeterminate(val) {
    const isIndet = Boolean(val);
    if (this._indeterminate !== isIndet) {
      this._indeterminate = isIndet;
      if (isIndet) {
        this.setAttribute('indeterminate', '');
      } else {
        this.removeAttribute('indeterminate');
      }
      this._render();
    }
  }

  get value() {
    return this.getAttribute('value') || 'on';
  }
  set value(val) {
    this.setAttribute('value', val);
  }

  // =====================================================
  // LIFECYCLE CALLBACKS
  // =====================================================

  connectedCallback() {
    injectTokens(this.shadowRoot);
    this.shadowRoot.appendChild(createStyle(styles));

    // Đọc khởi tạo state từ attribute
    this._checked = this.hasAttribute('checked');
    this._indeterminate = this.hasAttribute('indeterminate');

    this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    
    if (name === 'checked') {
      this._checked = newVal !== null;
    } else if (name === 'indeterminate') {
      this._indeterminate = newVal !== null;
    }

    if (this._wrapper) this._render();
  }

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  _handleChange(e) {
    // Ngăn event tự nhiên rò rỉ ra nếu không muốn
    e.stopPropagation();

    if (this.hasAttribute('disabled')) return;

    // Khi người dùng click, indeterminate sẽ biến mất và chuyển sang checked state mới
    this._checked = e.target.checked;
    this._indeterminate = false;
    
    if (this._checked) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
    this.removeAttribute('indeterminate');

    this._render();

    // Bắn event ra ngoài
    emitEvent(this, 'hui-change', { checked: this._checked, value: this.value });
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  _render() {
    if (this._wrapper) this._wrapper.remove();

    const label = this.getAttribute('label');
    const labelPos = this.getAttribute('label-position') || 'right'; // 'left' hoặc 'right'
    const size = this.getAttribute('size') || 'md';
    const variant = this.getAttribute('variant') || 'primary';
    const disabled = this.hasAttribute('disabled');
    const error = this.getAttribute('error');
    const required = this.hasAttribute('required');
    const name = this.getAttribute('name') || '';
    const valueAttr = this.getAttribute('value') || 'on';

    // SVG icon: Có thể là dấu check hoặc đường gạch ngang (indeterminate)
    let iconSvg = '';
    if (this._indeterminate) {
      iconSvg = `
        <svg class="hui-checkbox__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      `;
    } else if (this._checked) {
      iconSvg = `
        <svg class="hui-checkbox__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
    }

    // Input ẩn thực sự (giữ accessibility và event)
    this._input = createElement('input', {
      type: 'checkbox',
      className: 'hui-checkbox__input',
      checked: this._checked,
      disabled,
      name,
      value: valueAttr,
      onChange: (e) => this._handleChange(e)
    });
    // Set property thẳng vào element vì attribute không ăn chuẩn cho indeterminate
    this._input.indeterminate = this._indeterminate;

    // Box checkbox tự vẽ
    const boxEl = createElement('div', { className: 'hui-checkbox__box' });
    boxEl.innerHTML = iconSvg; // Chèn thẳng SVG vào

    // Text Label (nếu có)
    let textEl = null;
    if (label) {
      const mark = required ? ' *' : '';
      textEl = createElement('span', { className: 'hui-checkbox__label-text' });
      textEl.innerHTML = label + (required ? `<span style="color:var(--hui-danger)">${mark}</span>` : '');
    }

    // Class tổng hợp cho Container (label chứa input)
    const containerClasses = [
      'hui-checkbox__container',
      `hui-checkbox--${size}`,
      variant !== 'primary' ? `hui-checkbox--${variant}` : '',
      this._checked ? 'hui-checkbox__container--checked' : '',
      this._indeterminate ? 'hui-checkbox__container--indeterminate' : '',
      error ? 'hui-checkbox__container--error' : '',
      labelPos === 'left' ? 'hui-checkbox__container--label-left' : ''
    ].filter(Boolean).join(' ');

    const containerEl = createElement('label', { className: containerClasses },
      this._input, boxEl, ...[textEl].filter(Boolean)
    );

    // Message Lỗi/Gợi ý dưới cùng nếu có
    const messageEl = error 
      ? createElement('div', { className: 'hui-checkbox__message' }, error)
      : null;

    // Wrapper bao lấy tất cả
    this._wrapper = createElement('div', { className: 'hui-checkbox-wrapper' },
      containerEl, ...[messageEl].filter(Boolean)
    );

    this.shadowRoot.appendChild(this._wrapper);
  }
}

if (!customElements.get('hui-checkbox')) {
  customElements.define('hui-checkbox', HuiCheckbox);
}

export default HuiCheckbox;
