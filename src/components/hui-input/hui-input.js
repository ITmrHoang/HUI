/**
 * HUI Input — Ô nhập liệu (Ant Input + MUI TextField), tham gia <form> native qua HuiFormElement
 * Parts / slots / events / biến CSS: xem JSDoc của class bên dưới. Cách override: xem hui-demo.
 */

import styles from './hui-input.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { debounce } from '../../utils/events.js';

/** Tên cũ của label-position vẫn được chấp nhận */
const LABEL_ALIAS = { above: 'top', left: 'inline' };
const LABEL_POSITIONS = ['top', 'inline', 'inside'];

/** <input> tách rời để kiểm định dạng email/url theo đúng luật của trình duyệt */
let probe = null;

/**
 * Ô nhập liệu một dòng, tham gia <form> native.
 * @fires input - Khi gõ chữ, detail: { value }
 * @fires change - Khi giá trị đã đổi và rời ô nhập, detail: { value }
 * @fires hui-search - type="search": phát sau 300ms ngừng gõ, detail: { value }
 * @fires clear - Khi bấm nút xóa (clearable)
 * @slot prefix - Nội dung trước ô nhập (bị thay bằng icon-left nếu có)
 * @slot suffix - Nội dung sau ô nhập (bị thay bằng icon-right nếu có)
 * @csspart base - Khung ngoài cùng (label + ô + thông báo)
 * @csspart label - Nhãn
 * @csspart container - Khung viền chứa ô nhập, icon, prefix/suffix
 * @csspart input - Thẻ <input> native
 * @csspart prefix - Vùng slot prefix
 * @csspart suffix - Vùng slot suffix
 * @csspart icon - Cả hai icon (icon-left, icon-right là từng bên)
 * @csspart icon-left - Icon bên trái
 * @csspart icon-right - Icon bên phải
 * @csspart clear - Nút xóa ✕
 * @csspart message - Dòng thông báo lỗi / thành công / gợi ý
 * @cssprop --hui-input-height - Chiều cao khung
 * @cssprop --hui-input-padding-x - Khoảng đệm ngang của ô nhập
 * @cssprop --hui-input-font-size - Cỡ chữ
 * @cssprop --hui-input-radius - Bo góc
 * @cssprop --hui-input-bg - Màu nền
 * @cssprop --hui-input-color - Màu chữ
 * @cssprop --hui-input-placeholder-color - Màu placeholder
 * @cssprop --hui-input-border-color - Màu viền
 * @cssprop --hui-input-hover-border-color - Màu viền khi hover
 * @cssprop --hui-input-focus-border-color - Màu viền khi focus
 * @cssprop --hui-input-focus-shadow - Vòng sáng khi focus
 * @cssprop --hui-input-label-color - Màu nhãn
 * @cssprop --hui-input-label-font-size - Cỡ chữ nhãn
 * @cssprop --hui-input-icon-color - Màu icon / prefix / suffix
 */
class HuiInput extends HuiFormElement {
  static properties = {
    /** text | email | password | search | number | tel | url ... */
    type: { type: String, default: 'text' },
    /** Nhãn của ô nhập */
    label: { type: String, default: '' },
    /** top | inline | inside (floating label) — alias cũ: above, left */
    labelPosition: { type: String, default: 'top' },
    /** Chữ gợi ý khi ô trống */
    placeholder: { type: String, default: '' },
    /** Thông báo lỗi (viền đỏ) — ưu tiên hơn success / hint */
    error: { type: String, default: '' },
    /** Thông báo thành công (viền xanh) */
    success: { type: String, default: '' },
    /** Gợi ý nhỏ phía dưới */
    hint: { type: String, default: '' },
    /** Hiện nút ✕ khi có giá trị */
    clearable: { type: Boolean },
    /** Icon chữ/emoji bên trái, thay cho slot prefix */
    iconLeft: { type: String, default: '' },
    /** Icon chữ/emoji bên phải, thay cho slot suffix */
    iconRight: { type: String, default: '' },
  };

  static styles = styles;

  constructor() {
    super();
    this._debouncedSearch = debounce((value) => this.emit('hui-search', { value }), 300);
  }

  render() {
    this._label = createElement('label', { className: 'hui-input__label', part: 'label', id: 'label', for: 'input' });

    this._input = createElement('input', { className: 'hui-input__field', part: 'input', id: 'input' });
    this.relayNativeEvents(this._input);
    this._input.addEventListener('input', () => {
      if (this.type === 'search') this._debouncedSearch(this._input.value);
    });

    this._iconLeft = createElement('span', {
      className: 'hui-input__icon hui-input__icon--left', part: 'icon icon-left', 'aria-hidden': 'true',
    });
    this._iconRight = createElement('span', {
      className: 'hui-input__icon hui-input__icon--right', part: 'icon icon-right', 'aria-hidden': 'true',
    });

    this._prefixSlot = createElement('slot', { name: 'prefix' });
    this._suffixSlot = createElement('slot', { name: 'suffix' });
    this._prefix = createElement('span', { className: 'hui-input__prefix', part: 'prefix' }, this._prefixSlot);
    this._suffix = createElement('span', { className: 'hui-input__suffix', part: 'suffix' }, this._suffixSlot);
    this._prefixSlot.addEventListener('slotchange', () => this._syncAffixes());
    this._suffixSlot.addEventListener('slotchange', () => this._syncAffixes());

    this._clearBtn = createElement('button', {
      className: 'hui-input__clear', part: 'clear', type: 'button', tabindex: '-1',
    }, '✕');
    // Giữ focus trong ô nhập khi bấm nút xóa
    this._clearBtn.addEventListener('mousedown', (e) => e.preventDefault());
    this._clearBtn.addEventListener('click', () => this._clear());

    this._container = createElement('div', { className: 'hui-input__container', part: 'container' },
      this._iconLeft, this._prefix, this._input, this._clearBtn, this._suffix, this._iconRight);

    this._message = createElement('div', { className: 'hui-input__message', part: 'message', id: 'message' });
    this._group = createElement('div', { className: 'hui-input__group' }, this._container, this._message);
    this._wrapper = createElement('div', { className: 'hui-input', part: 'base' }, this._label, this._group);
    return this._wrapper;
  }

  updated(changed) {
    const input = this._input;

    // Chỉ ghi vào <input> khi khác giá trị → không làm nhảy con trỏ khi đang gõ
    if (changed.has('value')) {
      const v = this.value == null ? '' : String(this.value);
      if (input.value !== v) input.value = v;
    }
    if (changed.has('type')) input.type = this.type || 'text';
    if (changed.has('placeholder')) input.placeholder = this.placeholder || '';
    if (changed.has('name')) input.name = this.name || '';
    if (changed.has('readonly')) input.readOnly = this.readonly;
    if (changed.has('maxlength')) {
      if (this.maxlength != null) input.maxLength = this.maxlength;
      else input.removeAttribute('maxlength');
    }
    if (changed.has('disabled')) input.disabled = this.isDisabled;
    if (changed.has('required')) {
      input.toggleAttribute('aria-required', this.required);
      this._label.classList.toggle('hui-input__label--required', this.required);
    }
    if (changed.has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
    }
    if (changed.has('labelPosition')) this._placeLabel();
    if (changed.has('iconLeft') || changed.has('iconRight')) {
      this._iconLeft.textContent = this.iconLeft || '';
      this._iconRight.textContent = this.iconRight || '';
      this._syncAffixes();
    }
    if (['error', 'success', 'hint', 'status'].some((k) => changed.has(k))) this._syncMessage();
    if (changed.has('locale')) this._clearBtn.setAttribute('aria-label', t('common.clear'));

    this._syncClasses();
    super.updated(changed);
    // Đổi type (vd: text → email) làm đổi luật validate
    if (changed.has('type')) this._syncValidity();
  }

  /** Thêm luật cho type="email" / type="url" */
  checkConstraints() {
    const error = super.checkConstraints();
    if (error || this.isDisabled || this._isEmpty()) return error;
    if ((this.type === 'email' || this.type === 'url') && this._typeMismatch()) {
      return { flags: { typeMismatch: true }, message: t(this.type === 'email' ? 'form.typeEmail' : 'form.typeUrl') };
    }
    return null;
  }

  /** Kiểm trên <input> tách rời: validate chạy ngay khi gán value, lúc <input> bên trong chưa kịp cập nhật */
  _typeMismatch() {
    probe ||= document.createElement('input');
    probe.type = this.type;
    probe.value = String(this.value);
    return probe.validity.typeMismatch;
  }

  validationAnchor() {
    return this._input;
  }

  get _labelPos() {
    const pos = LABEL_ALIAS[this.labelPosition] || this.labelPosition;
    return LABEL_POSITIONS.includes(pos) ? pos : 'top';
  }

  /** Floating label (inside) nằm trong khung viền, các kiểu khác nằm đầu wrapper — chỉ di chuyển label, không đụng <input> */
  _placeLabel() {
    const parent = this._labelPos === 'inside' ? this._container : this._wrapper;
    if (this._label.parentNode !== parent) parent.prepend(this._label);
  }

  /** Icon attribute ưu tiên hơn slot; prefix/suffix trống thì ẩn để không dư khoảng đệm */
  _syncAffixes() {
    this._iconLeft.hidden = !this.iconLeft;
    this._iconRight.hidden = !this.iconRight;
    this._prefix.hidden = Boolean(this.iconLeft) || !this._prefixSlot.assignedNodes().length;
    this._suffix.hidden = Boolean(this.iconRight) || !this._suffixSlot.assignedNodes().length;
  }

  _syncMessage() {
    const text = this.error || this.success || this.hint || '';
    const kind = this.error ? 'error' : this.success ? 'success' : 'hint';
    this._message.textContent = text;
    this._message.hidden = !text;
    this._message.className = `hui-input__message hui-input__message--${kind}`;
    if (text) this._input.setAttribute('aria-describedby', 'message');
    else this._input.removeAttribute('aria-describedby');
    if (this.error || this.status === 'error') this._input.setAttribute('aria-invalid', 'true');
    else this._input.removeAttribute('aria-invalid');
  }

  _syncClasses() {
    const hasValue = this._input.value.length > 0;
    const tone = this.error || this.status === 'error' ? 'error'
      : this.status === 'warning' ? 'warning'
        : this.success ? 'success' : '';

    this._wrapper.className = [
      'hui-input',
      `hui-input--${this.effectiveSize}`,
      `hui-input--label-${this._labelPos}`,
      this.label ? 'hui-input--has-label' : '',
      hasValue ? 'hui-input--has-value' : '',
      tone ? `hui-input--${tone}` : '',
      this.isDisabled ? 'hui-input--disabled' : '',
    ].filter(Boolean).join(' ');

    this._clearBtn.hidden = !this.clearable;
    this._clearBtn.classList.toggle('hui-input__clear--hidden', !hasValue || this.isDisabled || this.readonly);
    this.setState('disabled', this.isDisabled);
  }

  _clear() {
    if (this.isDisabled || this.readonly) return;
    this._input.value = '';
    this.value = '';
    this.emit('input', { value: '' });
    this.emit('clear');
    this._input.focus();
  }

  /** Đưa focus vào <input> thật bên trong (giống HTMLInputElement) */
  focus(options) {
    if (this._input) this._input.focus(options);
    else super.focus(options);
  }

  blur() {
    this._input?.blur();
  }

  select() {
    this._input?.select();
  }
}

defineElement('hui-input', HuiInput);

export default HuiInput;
