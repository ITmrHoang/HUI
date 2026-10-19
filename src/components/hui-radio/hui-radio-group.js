/**
 * HUI Radio Group — Nhóm chọn một (Ant Radio.Group + MUI RadioGroup), tham gia <form> native.
 * Lựa chọn lấy từ property `options` hoặc các <hui-radio> con. Bàn phím theo WAI-ARIA APG Radio Group.
 * Parts / events / biến CSS: xem JSDoc của class bên dưới.
 */

import styles from './hui-radio-group.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import './hui-radio.js';

const NEXT_KEYS = ['ArrowDown', 'ArrowRight'];
const PREV_KEYS = ['ArrowUp', 'ArrowLeft'];

/**
 * @fires change - Người dùng chọn lựa chọn khác. detail: { value }
 * @fires input - Phát ngay trước change. detail: { value }
 * @slot - Các <hui-radio> (bị bỏ qua khi có property options)
 * @csspart base - Khung chứa các lựa chọn
 * @cssprop --hui-radio-group-gap - Khoảng cách giữa các lựa chọn (dạng mặc định)
 * @cssprop --hui-radio-group-row-gap - Khoảng cách dòng khi xuống dòng / direction="vertical"
 */
class HuiRadioGroup extends HuiFormElement {
  static properties = {
    /** Giá trị của lựa chọn đang chọn ('' = chưa chọn) */
    value: { type: String, default: '', reflect: false },
    /** Mảng string hoặc { label, value, disabled } — gán bằng property (attribute nhận JSON) */
    options: { type: Array, default: [] },
    /** horizontal | vertical — hướng xếp (chỉ áp dụng option-type="default") */
    direction: { type: String, default: 'horizontal' },
    /** default | button — button: các nút liền nhau dạng segmented */
    optionType: { type: String, default: 'default' },
    /** outline | solid — kiểu nút đang chọn khi option-type="button" */
    buttonStyle: { type: String, default: 'outline' },
  };

  static styles = styles;

  constructor() {
    super();
    /** <hui-radio> sinh từ options (nằm trong shadow) */
    this._generated = [];
  }

  connectedCallback() {
    super.connectedCallback();
    // role đặt qua ElementInternals → aria-label / aria-labelledby trên chính thẻ có tác dụng
    if (this._internals && 'role' in this._internals) this._internals.role = 'radiogroup';
    else if (!this.hasAttribute('role')) this.setAttribute('role', 'radiogroup');

    // Radio con (light DOM) và radio sinh ra (shadow) đều nổi bọt lên host (click/keydown là composed)
    this.listen(this, 'click', (e) => {
      const radio = this._radioFromEvent(e);
      if (radio) this._select(radio, false);
    });
    this.listen(this, 'keydown', (e) => this._onKeydown(e));
    this.listen(this, 'focusout', (e) => {
      if (!this.contains(e.relatedTarget) && !this.shadowRoot.contains(e.relatedTarget)) this.markInteracted();
    });
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncRadios());
    this._optionsWrap = createElement('span', { className: 'hui-radio-group__options' });
    this._base = createElement('div', { className: 'hui-radio-group', part: 'base' }, this._slot, this._optionsWrap);
    return this._base;
  }

  updated(changed) {
    if (changed.has('options')) this._renderOptions();
    this._base.className = [
      'hui-radio-group',
      this.optionType === 'button' ? 'hui-radio-group--button' : `hui-radio-group--${this.direction === 'vertical' ? 'vertical' : 'horizontal'}`,
    ].join(' ');
    this._syncRadios();
    if (this._internals && 'ariaDisabled' in this._internals) {
      this._internals.ariaDisabled = this.isDisabled ? 'true' : null;
      this._internals.ariaRequired = this.required ? 'true' : null;
      this._internals.ariaInvalid = this.status === 'error' ? 'true' : null;
    }
    this.setState('disabled', this.isDisabled);
    super.updated(changed);
  }

  // =====================================================
  // OPTIONS / RADIO
  // =====================================================

  /** Chuẩn hóa 1 option → { label, value, disabled } */
  _normalize(option) {
    if (option !== null && typeof option === 'object') {
      return { label: String(option.label ?? option.value ?? ''), value: String(option.value ?? ''), disabled: Boolean(option.disabled) };
    }
    return { label: String(option), value: String(option), disabled: false };
  }

  _renderOptions() {
    const list = Array.isArray(this.options) ? this.options : [];
    this._generated = list.map((o) => {
      const { label, value, disabled } = this._normalize(o);
      return createElement('hui-radio', { value, label, ...(disabled ? { disabled: true } : {}) });
    });
    this._optionsWrap.replaceChildren(...this._generated);
    this._slot.hidden = this._generated.length > 0;
  }

  /** Danh sách radio đang dùng: từ options nếu có, nếu không thì radio con (kể cả lồng trong thẻ khác) */
  _radios() {
    if (this._generated.length) return this._generated;
    // Bỏ qua radio chưa upgrade (chưa có API) — nó sẽ tự báo nhóm khi connected
    return [...this.querySelectorAll('hui-radio')].filter((r) => typeof r._applyGroup === 'function');
  }

  _radioFromEvent(e) {
    const radios = this._radios();
    return e.composedPath().find((n) => radios.includes(n)) || null;
  }

  /**
   * Đồng bộ trạng thái mọi radio + roving tabindex:
   * chỉ 1 radio có tabindex=0 (radio đang chọn, chưa chọn thì radio bật đầu tiên) → Tab vào nhóm
   * dừng đúng 1 lần, phím mũi tên di chuyển bên trong nhóm.
   */
  _syncRadios() {
    if (!this._hasRendered) return;
    const radios = this._radios();
    const cfg = {
      group: this,
      button: this.optionType === 'button',
      solid: this.buttonStyle === 'solid',
      size: this.effectiveSize,
      disabled: this.isDisabled,
    };

    // Chưa có value mà radio con được đánh dấu checked sẵn → lấy làm giá trị ban đầu
    if (this.value === '' && !this._generated.length) {
      const preset = radios.find((r) => r.hasAttribute('checked'));
      if (preset) {
        this._props.value = preset.value;
        if (this._defaultValue === '') this._defaultValue = preset.value;
        this._syncForm();
      }
    }

    let tabStop = null;
    for (const radio of radios) {
      radio._applyGroup(cfg);
      radio.checked = this.value !== '' && String(radio.value) === String(this.value);
      if (radio.checked && !radio.isDisabled) tabStop = radio;
    }
    tabStop ||= radios.find((r) => !r.isDisabled);
    for (const radio of radios) radio.tabIndex = radio === tabStop ? 0 : -1;
  }

  /** Chọn radio (do người dùng) → phát input + change nếu giá trị đổi */
  _select(radio, focus) {
    if (this.isDisabled || this.readonly || radio.isDisabled) return;
    if (focus) radio.focus();
    this.markInteracted();
    const value = String(radio.value);
    if (value === String(this.value)) return;
    this.value = value;
    this._syncRadios();
    this.emit('input', { value });
    this.emit('change', { value });
  }

  /** APG: mũi tên xuống/phải → radio kế (vòng lại đầu), lên/trái → radio trước; Space chọn radio đang focus */
  _onKeydown(e) {
    const radio = this._radioFromEvent(e);
    if (!radio || this.isDisabled) return;
    const enabled = this._radios().filter((r) => !r.isDisabled);
    if (!enabled.length) return;

    if (e.key === ' ') {
      e.preventDefault();
      this._select(radio, false);
      return;
    }
    const dir = NEXT_KEYS.includes(e.key) ? 1 : PREV_KEYS.includes(e.key) ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const from = enabled.indexOf(radio);
    const next = enabled[(from + dir + enabled.length) % enabled.length];
    if (this.readonly) next.focus();
    else this._select(next, true);
  }

  // =====================================================
  // FORM
  // =====================================================

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() {
    return this._radios().find((r) => r.checked) || this._radios()[0];
  }

  formResetCallback() {
    super.formResetCallback();
    this._syncRadios();
  }

  focus(options) {
    const radios = this._radios();
    const target = radios.find((r) => r.tabIndex === 0) || radios[0];
    if (target) target.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-radio-group', HuiRadioGroup);

export default HuiRadioGroup;
