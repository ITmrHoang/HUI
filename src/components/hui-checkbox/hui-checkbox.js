/**
 * HUI Checkbox — Hộp kiểm (Ant Checkbox + MUI Checkbox), tham gia <form> như <input type="checkbox">
 * Parts: base, control, box, icon, label, message · Slot: (mặc định) = nhãn
 * Events: change, input (detail { checked, value }), hui-change (giữ cho code cũ)
 * Biến CSS: xem đầu hui-checkbox.css
 */

import styles from './hui-checkbox.css?raw';

import { HuiFormElement } from '../../core/hui-form-element.js';
import { defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';

// Dấu check + gạch ngang (indeterminate) — CSS chọn hiện cái nào
const ICONS = `
  <svg class="hui-checkbox__icon hui-checkbox__icon--check" part="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
  <svg class="hui-checkbox__icon hui-checkbox__icon--indeterminate" part="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>`;

let uid = 0;

/**
 * @fires change - Người dùng bật/tắt. detail: { checked, value }
 * @fires input - Phát cùng lúc với change. detail: { checked, value }
 * @fires hui-change - Tên sự kiện cũ (giữ tương thích). detail: { checked, value }
 * @slot - Nhãn (thay cho attribute label)
 * @csspart base - Khung ngoài cùng (control + message)
 * @csspart control - Thẻ <label> chứa ô và nhãn
 * @csspart box - Ô vuông
 * @csspart icon - Dấu check / gạch ngang
 * @csspart label - Vùng chữ nhãn
 * @csspart message - Dòng thông báo lỗi
 * @cssprop --hui-checkbox-size - Cạnh ô vuông
 * @cssprop --hui-checkbox-radius - Bo góc ô
 * @cssprop --hui-checkbox-gap - Khoảng cách ô và nhãn
 * @cssprop --hui-checkbox-bg - Nền ô khi chưa chọn
 * @cssprop --hui-checkbox-border-color - Viền ô khi chưa chọn
 * @cssprop --hui-checkbox-hover-border-color - Viền ô khi hover
 * @cssprop --hui-checkbox-checked-bg - Nền + viền ô khi đã chọn
 * @cssprop --hui-checkbox-check-color - Màu dấu check
 * @cssprop --hui-checkbox-focus-ring - box-shadow khi focus bằng bàn phím
 * @cssprop --hui-checkbox-label-color - Màu chữ nhãn
 * @cssprop --hui-checkbox-font-size - Cỡ chữ nhãn
 */
class HuiCheckbox extends HuiFormElement {
  static properties = {
    /** Đang được chọn (phản chiếu attribute checked) */
    checked: { type: Boolean },
    /** Trạng thái "chọn một phần" — hiện dấu gạch ngang, tự tắt khi người dùng click */
    indeterminate: { type: Boolean },
    /** Nhãn chữ (hoặc dùng slot mặc định) */
    label: { type: String },
    /** right | left — vị trí nhãn so với ô */
    labelPosition: { type: String, default: 'right' },
    /** primary | success | warning | danger — màu khi được chọn */
    variant: { type: String, default: 'primary' },
    /** Thông báo lỗi hiển thị dưới checkbox (viền ô chuyển đỏ) */
    error: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    this._defaultChecked = null;
    this._messageId = `hui-checkbox-msg-${++uid}`;
  }

  /** Giá trị gửi lên form khi được chọn — mặc định 'on' như <input type="checkbox"> */
  get value() {
    return this._getProp('value') || 'on';
  }
  set value(v) {
    this._setProp('value', v);
  }

  connectedCallback() {
    // Trạng thái ban đầu cho form.reset()
    if (this._defaultChecked === null) this._defaultChecked = this.hasAttribute('checked');
    super.connectedCallback();
  }

  render() {
    this._input = createElement('input', { type: 'checkbox', className: 'hui-checkbox__input' });
    this._input.addEventListener('click', (e) => {
      if (this.readonly) e.preventDefault();
    });
    // input native là composed → chặn bản gốc, phát lại 1 lần kèm detail
    this._input.addEventListener('input', (e) => e.stopPropagation());
    this._input.addEventListener('change', () => this._handleChange());
    this._input.addEventListener('blur', () => this.markInteracted());

    this._box = createElement('span', { className: 'hui-checkbox__box', part: 'box' });
    this._box.innerHTML = ICONS;

    this._labelFallback = document.createTextNode('');
    this._slot = createElement('slot', {}, this._labelFallback);
    this._slot.addEventListener('slotchange', () => this._syncLabelVisibility());
    this._required = createElement('span', { className: 'hui-checkbox__required', 'aria-hidden': 'true' }, ' *');
    this._labelText = createElement('span', { className: 'hui-checkbox__label-text', part: 'label' },
      this._slot, this._required);

    this._container = createElement('label', { part: 'control' }, this._input, this._box, this._labelText);
    this._message = createElement('div', { className: 'hui-checkbox__message', part: 'message', id: this._messageId });

    return createElement('div', { className: 'hui-checkbox-wrapper', part: 'base' }, this._container, this._message);
  }

  updated(changed) {
    super.updated(changed);
    const input = this._input;

    if (changed.has('checked')) input.checked = this.checked;
    if (changed.has('indeterminate')) input.indeterminate = this.indeterminate;
    if (changed.has('disabled')) input.disabled = this.isDisabled;
    if (changed.has('name')) input.name = this.name || '';
    if (changed.has('value')) input.value = this.value;

    if (changed.has('required')) {
      this._required.hidden = !this.required;
      input.required = this.required;
    }

    if (changed.has('label')) {
      this._labelFallback.textContent = this.label || '';
      this._syncLabelVisibility();
    }

    if (changed.has('error') || changed.has('status')) {
      this._message.textContent = this.error || '';
      this._message.hidden = !this.error;
      const invalid = Boolean(this.error) || this.status === 'error';
      input.setAttribute('aria-invalid', String(invalid));
      if (this.error) input.setAttribute('aria-describedby', this._messageId);
      else input.removeAttribute('aria-describedby');
    }

    this._container.className = [
      'hui-checkbox__container',
      `hui-checkbox--${this.effectiveSize}`,
      this.variant !== 'primary' ? `hui-checkbox--${this.variant}` : '',
      this.checked ? 'hui-checkbox__container--checked' : '',
      this.indeterminate ? 'hui-checkbox__container--indeterminate' : '',
      this.error || this.status === 'error' ? 'hui-checkbox__container--error' : '',
      this.labelPosition === 'left' ? 'hui-checkbox__container--label-left' : '',
      this.isDisabled ? 'hui-checkbox__container--disabled' : '',
    ].filter(Boolean).join(' ');

    // Không có nhãn hiển thị → chuyển aria-label của host vào input
    if (this.hasAttribute('aria-label')) input.setAttribute('aria-label', this.getAttribute('aria-label'));
  }

  _handleChange() {
    if (this.isDisabled) return;
    // Người dùng click → bỏ indeterminate, lấy trạng thái mới từ input native
    this.indeterminate = false;
    this.checked = this._input.checked;
    this.markInteracted();

    const detail = { checked: this.checked, value: this.value };
    this.emit('input', detail);
    this.emit('change', detail);
    this.emit('hui-change', detail);
  }

  _syncLabelVisibility() {
    const hasSlotted = this._slot.assignedNodes().some(
      (n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim()
    );
    this._labelText.hidden = !hasSlotted && !this.label;
  }

  // =====================================================
  // FORM
  // =====================================================

  _isEmpty() {
    return !this.checked;
  }

  formValue() {
    return this.checked ? this.value || 'on' : null;
  }

  validationAnchor() {
    return this._input;
  }

  /** required = phải được chọn */
  checkConstraints() {
    if (this.isDisabled || !this.required || this.checked) return null;
    const msg = t('form.requiredChecked');
    return { flags: { valueMissing: true }, message: msg === 'form.requiredChecked' ? t('form.required') : msg };
  }

  formResetCallback() {
    this.checked = this._defaultChecked;
    super.formResetCallback();
  }

  formStateRestoreCallback(state) {
    this.checked = state != null;
  }

  focus(options) {
    this._input ? this._input.focus(options) : super.focus(options);
  }

  blur() {
    this._input?.blur();
  }
}

defineElement('hui-checkbox', HuiCheckbox);

export default HuiCheckbox;
