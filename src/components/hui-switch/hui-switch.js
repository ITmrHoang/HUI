/**
 * HUI Switch — Công tắc bật/tắt (Ant Switch + MUI Switch), tham gia <form> như checkbox
 * Render <button role="switch">: Tab để focus, Space/Enter để bật/tắt.
 * Parts: base, track, thumb, text, label · Event: change { checked, value }
 * Biến CSS: xem đầu hui-switch.css
 */

import styles from './hui-switch.css?raw';

import { HuiFormElement } from '../../core/hui-form-element.js';
import { defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';

let uid = 0;

/**
 * @fires change - Người dùng bật/tắt (không phát khi đổi bằng JS). detail: { checked, value }
 * @csspart base - Thẻ <label> bao ngoài
 * @csspart track - Nút <button role="switch"> (đường ray)
 * @csspart thumb - Nút tròn trượt
 * @csspart text - Chữ bên trong track
 * @csspart label - Nhãn chữ cạnh công tắc
 * @cssprop --hui-switch-height - Chiều cao track
 * @cssprop --hui-switch-width - Độ rộng tối thiểu track
 * @cssprop --hui-switch-thumb-size - Cỡ nút tròn
 * @cssprop --hui-switch-track-bg - Màu track khi tắt
 * @cssprop --hui-switch-track-hover-bg - Màu track khi tắt + hover
 * @cssprop --hui-switch-checked-bg - Màu track khi bật (đè màu của color)
 * @cssprop --hui-switch-thumb-bg - Màu nút tròn
 * @cssprop --hui-switch-thumb-shadow - Đổ bóng nút tròn
 * @cssprop --hui-switch-text-color - Màu chữ trong track
 * @cssprop --hui-switch-label-color - Màu chữ nhãn
 * @cssprop --hui-switch-gap - Khoảng cách track và nhãn
 * @cssprop --hui-switch-focus-color - Màu viền focus
 */
class HuiSwitch extends HuiFormElement {
  static properties = {
    /** Trạng thái bật (phản chiếu attribute checked) */
    checked: { type: Boolean },
    /** Hiện spinner trong nút tròn, không bật/tắt được nhưng vẫn giữ focus */
    loading: { type: Boolean },
    /** primary | secondary | success | warning | danger | info — màu khi bật */
    color: { type: String, default: 'primary' },
    /** Nhãn chữ cạnh công tắc */
    label: { type: String },
    /** right | left — vị trí nhãn */
    labelPosition: { type: String, default: 'right' },
    /** Chữ trong track khi bật (Ant checkedChildren) */
    checkedText: { type: String },
    /** Chữ trong track khi tắt (Ant unCheckedChildren) */
    uncheckedText: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    this._defaultChecked = null;
    this._labelId = `hui-switch-label-${++uid}`;
  }

  /** Giá trị gửi lên form khi bật — mặc định 'on' */
  get value() {
    return this._getProp('value') || 'on';
  }
  set value(v) {
    this._setProp('value', v);
  }

  connectedCallback() {
    if (this._defaultChecked === null) this._defaultChecked = this.hasAttribute('checked');
    super.connectedCallback();
  }

  render() {
    this._spinner = createElement('span', { className: 'hui-switch__spinner' });
    this._thumb = createElement('span', { className: 'hui-switch__thumb', part: 'thumb', 'aria-hidden': 'true' }, this._spinner);
    this._text = createElement('span', { className: 'hui-switch__text', part: 'text', 'aria-hidden': 'true' });

    this._button = createElement('button', { type: 'button', role: 'switch', className: 'hui-switch__track', part: 'track' },
      this._text, this._thumb);
    this._button.addEventListener('click', () => this._handleClick());
    this._button.addEventListener('blur', () => this.markInteracted());

    this._labelText = createElement('span', {});
    this._required = createElement('span', { className: 'hui-switch__required', 'aria-hidden': 'true' }, ' *');
    this._label = createElement('span', { className: 'hui-switch__label', id: this._labelId, part: 'label' },
      this._labelText, this._required);

    // <label> bao ngoài: click vào chữ cũng thành click lên <button>
    this._wrapper = createElement('label', { part: 'base' }, this._button, this._label);
    return this._wrapper;
  }

  updated(changed) {
    super.updated(changed);
    const btn = this._button;

    if (changed.has('checked')) {
      btn.setAttribute('aria-checked', String(this.checked));
    }
    if (changed.has('checked') || changed.has('checkedText') || changed.has('uncheckedText')) {
      this._text.textContent = (this.checked ? this.checkedText : this.uncheckedText) || '';
    }
    if (changed.has('disabled')) btn.disabled = this.isDisabled;

    if (changed.has('loading')) {
      // aria-disabled thay vì disabled: vẫn giữ focus khi đang loading
      this._spinner.hidden = !this.loading;
      if (this.loading) {
        btn.setAttribute('aria-busy', 'true');
        btn.setAttribute('aria-disabled', 'true');
      } else {
        btn.removeAttribute('aria-busy');
        btn.removeAttribute('aria-disabled');
      }
    }

    if (changed.has('required')) {
      this._required.hidden = !this.required;
      if (this.required) btn.setAttribute('aria-required', 'true');
      else btn.removeAttribute('aria-required');
    }

    if (changed.has('label')) {
      this._labelText.textContent = this.label || '';
      this._label.hidden = !this.label;
    }

    // Có nhãn → aria-labelledby; không có → chuyển aria-label của host vào nút
    if (this.label) {
      btn.setAttribute('aria-labelledby', this._labelId);
      btn.removeAttribute('aria-label');
    } else {
      btn.removeAttribute('aria-labelledby');
      if (this.hasAttribute('aria-label')) btn.setAttribute('aria-label', this.getAttribute('aria-label'));
    }

    this._wrapper.className = [
      'hui-switch',
      `hui-switch--${this.effectiveSize}`,
      `hui-switch--${this.color}`,
      this.checked ? 'hui-switch--checked' : '',
      this.labelPosition === 'left' ? 'hui-switch--label-left' : '',
      this.isDisabled ? 'hui-switch--disabled' : '',
      this.loading ? 'hui-switch--loading' : '',
      this.checkedText || this.uncheckedText ? 'hui-switch--has-text' : '',
    ].filter(Boolean).join(' ');
  }

  /** Đảo trạng thái bằng JS (không phát change — chỉ người dùng thao tác mới phát) */
  toggle() {
    this.checked = !this.checked;
  }

  _handleClick() {
    if (this.isDisabled || this.loading || this.readonly) return;
    this.checked = !this.checked;
    this.markInteracted();
    this.emit('change', { checked: this.checked, value: this.value });
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
    return this._button;
  }

  /** required = phải bật */
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
    this._button ? this._button.focus(options) : super.focus(options);
  }

  blur() {
    this._button?.blur();
  }
}

defineElement('hui-switch', HuiSwitch);

export default HuiSwitch;
