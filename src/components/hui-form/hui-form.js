/**
 * HUI Form — Form có bố cục + validate theo luật (Ant Form). Không tạo <form> native:
 * bao các control HUI (HuiFormElement) và <hui-form-item>, tự gom giá trị / validate / submit.
 *   const { valid, values, errors } = await form.validate();
 * Submit: <hui-button type="submit"> bên trong, Enter trong ô nhập, hoặc form.submit().
 * Parts / events / biến CSS: xem JSDoc của class bên dưới.
 */

import styles from './hui-form.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import { createElement } from '../../utils/dom.js';
import { isFieldControl, isNestedControl, readValue, writeValue } from './hui-form-item.js';

/** Kiểu <input> mà Enter = submit (giống implicit submission của form native) */
const SUBMIT_INPUT_TYPES = new Set(['', 'text', 'email', 'password', 'search', 'tel', 'url', 'number', 'date', 'time']);

/** Thuộc tính của form mà hui-form-item đọc để hiển thị */
const ITEM_KEYS = ['layout', 'labelWidth', 'labelAlign', 'requiredMark', 'size'];

/**
 * @fires hui-submit - Submit và mọi field hợp lệ. detail: { values }
 * @fires hui-submit-failed - Submit nhưng có field lỗi. detail: { errors, values }
 * @fires hui-values-change - Người dùng đổi giá trị 1 field. detail: { changed: { [name]: value }, values }
 * @slot - Các <hui-form-item> / control / nút
 * @csspart base - Khung chứa nội dung
 * @cssprop --hui-form-inline-gap - Khoảng cách giữa các item ở layout inline
 */
class HuiForm extends HuiElement {
  static properties = {
    /** vertical | horizontal | inline — nhãn trên / nhãn bên trái / các item nằm ngang 1 dòng */
    layout: { type: String, default: 'vertical' },
    /** Chiều rộng cột nhãn khi horizontal (số = px, hoặc giá trị CSS: '8rem', '30%') */
    labelWidth: { type: String },
    /** left | right — canh chữ nhãn khi horizontal */
    labelAlign: { type: String, default: 'right' },
    /** sm | md | lg — kích thước mọi control bên trong (control tự đặt size thì giữ size riêng) */
    size: { type: String, default: '' },
    /** Vô hiệu hóa mọi control và nút bên trong */
    disabled: { type: Boolean },
    /** true | false | optional — hiện dấu * cho field bắt buộc / ẩn / hiện "(không bắt buộc)" cho field không bắt buộc */
    requiredMark: { type: String, default: 'true' },
    /** Submit lỗi → cuộn tới field lỗi đầu tiên và focus vào nó */
    scrollToFirstError: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    /** Phần tử do form vô hiệu hóa (để bật lại đúng những cái đó, không đụng control tự disabled) */
    this._disabledByForm = new Set();
    /** Giá trị đã báo gần nhất của từng control → không phát hui-values-change trùng (input + change) */
    this._lastValues = new WeakMap();
    this._submitting = false;
    this._observer = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._internals && 'role' in this._internals) this._internals.role = 'form';

    this.listen(this, 'hui-click', (e) => this._onButtonClick(e));
    this.listen(this, 'keydown', (e) => this._onKeydown(e));
    this.listen(this, 'input', (e) => this._onValueEvent(e));
    this.listen(this, 'change', (e) => this._onValueEvent(e));

    // Control / nút thêm vào sau khi form đang disabled → vô hiệu hóa luôn
    this._observer = new MutationObserver(() => {
      if (this.disabled) this._applyDisabled();
    });
    this._observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = null;
  }

  render() {
    this._base = createElement('div', { className: 'hui-form', part: 'base' }, createElement('slot'));
    return this._base;
  }

  updated(changed) {
    if (changed.has('layout')) {
      const layout = ['horizontal', 'inline'].includes(this.layout) ? this.layout : 'vertical';
      this._base.className = `hui-form hui-form--${layout}`;
    }
    if (ITEM_KEYS.some((k) => changed.has(k))) {
      for (const item of this._items()) item.requestUpdate?.('form');
    }
    // Control đọc size qua closest('hui-form[size]') trong updated() → nhắc control vẽ lại
    if (changed.has('size')) {
      for (const { control } of this._fields()) control.requestUpdate?.('size');
    }
    if (changed.has('disabled')) this._applyDisabled();
  }

  // =====================================================
  // FIELD
  // =====================================================

  /** Các hui-form-item thuộc form này (không tính form lồng bên trong) */
  _items() {
    return [...this.querySelectorAll('hui-form-item')].filter((i) => i.closest('hui-form') === this);
  }

  /**
   * Mọi field của form: { control, item, name }. Field = control HUI không nằm trong control khác
   * (vd: hui-checkbox trong hui-checkbox-group không phải field riêng).
   */
  _fields() {
    const out = [];
    for (const el of this.querySelectorAll('*')) {
      if (!isFieldControl(el) || isNestedControl(el, this) || el.closest('hui-form') !== this) continue;
      const host = el.closest('hui-form-item');
      const item = host && host.control === el ? host : null;
      out.push({ control: el, item, name: el.name || item?.name || '' });
    }
    return out;
  }

  _fieldFromEvent(e) {
    const fields = this._fields();
    for (const node of e.composedPath()) {
      const field = fields.find((f) => f.control === node);
      if (field) return field;
      if (node === this) break;
    }
    return null;
  }

  // =====================================================
  // API
  // =====================================================

  /** Giá trị mọi field có name: { [name]: value } (checkbox/switch → true/false) */
  getValues() {
    const values = {};
    for (const { control, name } of this._fields()) {
      if (name) values[name] = readValue(control);
    }
    return values;
  }

  /** Gán giá trị theo name (không phát sự kiện, không validate — giống Ant setFieldsValue) */
  setValues(obj = {}) {
    for (const { control, name } of this._fields()) {
      if (name && Object.prototype.hasOwnProperty.call(obj, name)) {
        writeValue(control, obj[name]);
        this._lastValues.set(control, JSON.stringify(readValue(control)));
      }
    }
  }

  /**
   * Validate toàn bộ form.
   * @returns {Promise<{valid: boolean, values: object, errors: Array<{name: string, message: string, element: HTMLElement}>}>}
   */
  validate() {
    return this.validateFields();
  }

  /**
   * Validate một số field theo name (bỏ trống = tất cả). Field nằm trong hui-form-item chạy luật của item;
   * field đứng riêng chỉ xét ràng buộc của chính control (required, minlength...).
   * @param {string[]} [names]
   */
  async validateFields(names) {
    const filter = Array.isArray(names) && names.length ? new Set(names) : null;
    const jobs = this._fields()
      .filter((f) => !filter || filter.has(f.name))
      .map(async ({ control, item, name }) => {
        if (item) return item.validate();
        control.markInteracted();
        const message = control.isDisabled ? '' : control.errorMessage;
        return { name, message, valid: !message, element: control };
      });
    const results = await Promise.all(jobs);
    const errors = results.filter((r) => !r.valid).map(({ name, message, element }) => ({ name, message, element }));
    return { valid: errors.length === 0, values: this.getValues(), errors };
  }

  /** Đưa mọi field về giá trị ban đầu (attribute value / checked), xóa lỗi */
  reset() {
    for (const { control } of this._fields()) {
      control.formResetCallback?.();
      this._lastValues.delete(control);
    }
    for (const item of this._items()) item.reset?.();
  }

  /** Cuộn tới field lỗi đầu tiên (theo thứ tự trong trang) và focus vào nó. Trả về control đó hoặc null */
  scrollToError() {
    const field = this._fields().find(({ control, item }) => (item ? item.errorMessage : !control.checkValidity()));
    if (!field) return null;
    const target = field.item || field.control;
    target.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    field.control.focus?.({ preventScroll: true });
    return field.control;
  }

  /** Validate rồi phát hui-submit (hợp lệ) hoặc hui-submit-failed. Trả về kết quả validate */
  async submit() {
    if (this._submitting) return null;
    this._submitting = true;
    try {
      const result = await this.validate();
      if (result.valid) {
        this.emit('hui-submit', { values: result.values });
      } else {
        this.emit('hui-submit-failed', { errors: result.errors, values: result.values });
        if (this.scrollToFirstError) this.scrollToError();
      }
      return result;
    } finally {
      this._submitting = false;
    }
  }

  // =====================================================
  // SỰ KIỆN
  // =====================================================

  _onButtonClick(e) {
    const button = e.composedPath().find((n) => n.localName === 'hui-button');
    if (!button || button.closest('hui-form') !== this) return;
    if (button.type === 'submit') this.submit();
    else if (button.type === 'reset') this.reset();
  }

  /** Enter trong ô nhập 1 dòng → submit (control đã tự xử lý Enter thì đã preventDefault, vd: select) */
  _onKeydown(e) {
    if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
    const origin = e.composedPath()[0];
    if (origin?.localName !== 'input' || !SUBMIT_INPUT_TYPES.has(origin.type)) return;
    e.preventDefault();
    this.submit();
  }

  _onValueEvent(e) {
    const field = this._fieldFromEvent(e);
    if (!field || !field.name) return;
    const value = readValue(field.control);
    let key;
    try {
      key = JSON.stringify(value);
    } catch {
      key = String(value);
    }
    if (this._lastValues.get(field.control) === key) return;
    this._lastValues.set(field.control, key);

    this.emit('hui-values-change', { changed: { [field.name]: value }, values: this.getValues() });

    // Field phụ thuộc (dependencies) đã được chạm → validate lại (vd: xác nhận mật khẩu khi đổi mật khẩu)
    for (const item of this._items()) {
      if (item !== field.item && item._touched && item._dependencyList?.includes(field.name)) item.validate();
    }
  }

  _applyDisabled() {
    if (this.disabled) {
      const targets = [...this._fields().map((f) => f.control), ...this.querySelectorAll('hui-button')];
      for (const el of targets) {
        if (!el.disabled) {
          el.disabled = true;
          this._disabledByForm.add(el);
        }
      }
    } else {
      for (const el of this._disabledByForm) el.disabled = false;
      this._disabledByForm.clear();
    }
  }
}

defineElement('hui-form', HuiForm);

export default HuiForm;
