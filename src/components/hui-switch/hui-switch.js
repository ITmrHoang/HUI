/**
 * HUI Switch — Công tắc bật/tắt (Web Component Vanilla JS)
 * Kết hợp API của Ant Design Switch + MUI Switch.
 *
 * Hỗ trợ:
 * - checked, disabled, loading (spinner trong nút tròn)
 * - Sizes: sm, md, lg — Colors: primary, secondary, success, warning, danger, info
 * - Label trái/phải, chữ bên trong track (checked-text / unchecked-text)
 * - Tham gia <form> qua ElementInternals (name, value, required)
 */

import styles from './hui-switch.css?raw';
import { createElement, createStyle, ensureTokens } from '../../utils/dom.js';
import { emitEvent } from '../../utils/events.js';

// Bộ đếm để sinh id duy nhất cho label (dùng với aria-labelledby)
let switchUid = 0;

class HuiSwitch extends HTMLElement {
  static get observedAttributes() {
    return [
      'checked', 'disabled', 'loading', 'size', 'color', 'label', 'label-position',
      'checked-text', 'unchecked-text', 'name', 'value', 'required',
    ];
  }

  /**
   * formAssociated: báo cho trình duyệt biết element này là một form control
   * (giống <input>) → giá trị sẽ được gửi kèm khi submit <form>.
   * Chỉ bật khi trình duyệt hỗ trợ ElementInternals.
   */
  static get formAssociated() {
    return 'attachInternals' in HTMLElement.prototype;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null;  // <label> bao ngoài cùng
    this._button = null;   // <button role="switch"> thật bên trong
    this._styled = false;  // Đã chèn CSS hay chưa
    this._labelId = `hui-switch-label-${++switchUid}`;
    this._defaultChecked = false; // Giá trị ban đầu — dùng khi form reset
    this._formDisabled = false;   // Bị disable bởi <fieldset disabled> cha

    // ElementInternals: cầu nối giữa custom element và <form> cha
    this._internals = typeof this.attachInternals === 'function' ? this.attachInternals() : null;
  }

  // =====================================================
  // PROPERTIES (GET/SET)
  // =====================================================

  /** Trạng thái bật/tắt — phản chiếu (reflect) sang attribute "checked" */
  get checked() {
    return this.hasAttribute('checked');
  }
  set checked(val) {
    // Đặt attribute → attributeChangedCallback sẽ tự đồng bộ giao diện
    this.toggleAttribute('checked', Boolean(val));
  }

  get value() {
    return this.getAttribute('value') || 'on';
  }
  set value(val) {
    this.setAttribute('value', val);
  }

  get disabled() {
    return this.hasAttribute('disabled');
  }
  set disabled(val) {
    this.toggleAttribute('disabled', Boolean(val));
  }

  /** Các API chuẩn của form control (giống <input>) */
  get form() { return this._internals?.form ?? null; }
  get name() { return this.getAttribute('name'); }
  get validity() { return this._internals?.validity; }
  get validationMessage() { return this._internals?.validationMessage ?? ''; }
  checkValidity() { return this._internals ? this._internals.checkValidity() : true; }
  reportValidity() { return this._internals ? this._internals.reportValidity() : true; }

  // =====================================================
  // LIFECYCLE CALLBACKS
  // =====================================================

  connectedCallback() {
    if (!this._styled) {
      ensureTokens();
      this.shadowRoot.appendChild(createStyle(styles));
      this._styled = true;
      // Ghi nhớ trạng thái ban đầu để reset form đưa về đúng giá trị này
      this._defaultChecked = this.hasAttribute('checked');
    }
    if (!this._wrapper) this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (!this._wrapper) return;

    // Thay đổi checked chỉ cập nhật tại chỗ (không vẽ lại) để KHÔNG làm mất focus
    // của nút khi người dùng bật/tắt bằng bàn phím.
    if (name === 'checked') {
      this._syncState();
    } else {
      this._render();
    }
  }

  // =====================================================
  // FORM CALLBACKS (ElementInternals)
  // =====================================================

  /** Form cha bị reset → trả về trạng thái ban đầu */
  formResetCallback() {
    this.checked = this._defaultChecked;
  }

  /** Trình duyệt khôi phục state (back/forward cache, autofill) */
  formStateRestoreCallback(state) {
    this.checked = state != null;
  }

  /** <fieldset disabled> bao ngoài → switch cũng bị vô hiệu hóa theo */
  formDisabledCallback(disabled) {
    this._formDisabled = disabled;
    if (this._wrapper) this._render();
  }

  /** Bị vô hiệu hóa bởi chính attribute hoặc bởi <fieldset disabled> cha */
  _isDisabled() {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  // =====================================================
  // PUBLIC METHODS
  // =====================================================

  /** Đảo trạng thái bằng JS (không phát event change — chỉ user thao tác mới phát) */
  toggle() {
    this.checked = !this.checked;
  }

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Click vào nút (chuột, hoặc Space/Enter — vì <button> native tự biến phím thành click).
   * Click vào label cũng được trình duyệt chuyển thành click lên <button> bên trong.
   */
  _handleClick(e) {
    if (this._isDisabled() || this.hasAttribute('loading')) return;

    this.checked = !this.checked;
    emitEvent(this, 'change', { checked: this.checked, value: this.value });
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  /**
   * Đồng bộ những phần phụ thuộc vào "checked" mà không dựng lại DOM:
   * class, aria-checked, chữ trong track, giá trị form và validity.
   */
  _syncState() {
    if (!this._wrapper) return;
    const checked = this.checked;

    this._wrapper.classList.toggle('hui-switch--checked', checked);
    this._button.setAttribute('aria-checked', String(checked));

    // Chữ bên trong track đổi theo trạng thái (Ant checkedChildren / unCheckedChildren)
    const textEl = this._wrapper.querySelector('.hui-switch__text');
    if (textEl) {
      textEl.textContent = checked
        ? this.getAttribute('checked-text') || ''
        : this.getAttribute('unchecked-text') || '';
    }

    // Cập nhật giá trị gửi lên form: bật → value (mặc định "on"), tắt → null (không gửi)
    if (this._internals) {
      this._internals.setFormValue(checked ? this.value : null, checked ? 'on' : null);
      if (this.hasAttribute('required') && !checked) {
        this._internals.setValidity(
          { valueMissing: true },
          'Vui lòng bật công tắc này để tiếp tục.',
          this._button // Trình duyệt hiển thị bong bóng lỗi tại nút này
        );
      } else {
        this._internals.setValidity({});
      }
    }
  }

  _render() {
    // Ghi nhớ focus để trả lại sau khi vẽ lại (tránh mất focus khi đổi attribute)
    const hadFocus = this._button && this.shadowRoot.activeElement === this._button;
    if (this._wrapper) this._wrapper.remove();

    const size = this.getAttribute('size') || 'md';
    const color = this.getAttribute('color') || 'primary';
    const label = this.getAttribute('label');
    const labelPos = this.getAttribute('label-position') || 'right';
    const disabled = this._isDisabled();
    const loading = this.hasAttribute('loading');
    const required = this.hasAttribute('required');
    const hasInnerText = !!(this.getAttribute('checked-text') || this.getAttribute('unchecked-text'));

    const classes = [
      'hui-switch',
      `hui-switch--${size}`,
      `hui-switch--${color}`,
      labelPos === 'left' ? 'hui-switch--label-left' : '',
      disabled ? 'hui-switch--disabled' : '',
      loading ? 'hui-switch--loading' : '',
      hasInnerText ? 'hui-switch--has-text' : '',
    ].filter(Boolean).join(' ');

    // Nút tròn (thumb) trượt qua lại; khi loading thì có spinner xoay bên trong
    const thumb = createElement('span', { className: 'hui-switch__thumb', 'aria-hidden': 'true' },
      ...[loading ? createElement('span', { className: 'hui-switch__spinner' }) : null].filter(Boolean)
    );

    // Chữ hiển thị bên trong track (nội dung thực được gán trong _syncState)
    const textEl = hasInnerText
      ? createElement('span', { className: 'hui-switch__text', 'aria-hidden': 'true' })
      : null;

    // <button role="switch">: chuẩn WAI-ARIA cho công tắc.
    // Dùng <button> native nên Space/Enter tự kích hoạt click, Tab tự focus được.
    const buttonAttrs = {
      type: 'button',
      role: 'switch',
      className: 'hui-switch__track',
      part: 'track',
      'aria-checked': String(this.checked),
      disabled,
    };
    if (label) {
      buttonAttrs['aria-labelledby'] = this._labelId;
    } else if (this.getAttribute('aria-label')) {
      // Không có label hiển thị → chuyển aria-label của host vào nút để trình đọc màn hình đọc được
      buttonAttrs['aria-label'] = this.getAttribute('aria-label');
    }
    if (loading) {
      // Không dùng disabled khi loading để vẫn giữ focus, chỉ báo cho trình đọc màn hình
      buttonAttrs['aria-busy'] = 'true';
      buttonAttrs['aria-disabled'] = 'true';
    }
    if (required) buttonAttrs['aria-required'] = 'true';

    this._button = createElement('button', buttonAttrs, ...[textEl, thumb].filter(Boolean));
    this._button.addEventListener('click', (e) => this._handleClick(e));

    // Nhãn chữ bên cạnh (kèm dấu * đỏ nếu required)
    const labelEl = label
      ? createElement('span', { className: 'hui-switch__label', id: this._labelId, part: 'label' },
          label,
          ...[required ? createElement('span', { className: 'hui-switch__required', 'aria-hidden': 'true' }, ' *') : null].filter(Boolean)
        )
      : null;

    // Dùng <label> bao ngoài: click vào chữ cũng được trình duyệt chuyển thành click lên <button>
    this._wrapper = createElement('label', { className: classes }, this._button, ...[labelEl].filter(Boolean));

    this.shadowRoot.appendChild(this._wrapper);
    this._syncState();

    if (hadFocus) this._button.focus();
  }
}

if (!customElements.get('hui-switch')) {
  customElements.define('hui-switch', HuiSwitch);
}

export default HuiSwitch;
