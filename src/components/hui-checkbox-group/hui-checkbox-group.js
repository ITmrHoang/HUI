/**
 * HUI Checkbox Group — Nhóm chọn nhiều (Ant Checkbox.Group), tham gia <form> native.
 * Lựa chọn lấy từ property `options` hoặc các <hui-checkbox> con. Giá trị là mảng;
 * khi gửi form mỗi giá trị được thêm 1 lần dưới cùng `name` (FormData.getAll(name)).
 * Parts / events / biến CSS: xem JSDoc của class bên dưới.
 */

import styles from './hui-checkbox-group.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-checkbox/hui-checkbox.js';

/** Chuỗi attribute value → mảng: JSON '["a","b"]' hoặc 'a,b' */
function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined || v === '') return [];
  if (typeof v === 'string') {
    if (v.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* rơi xuống tách dấu phẩy */ }
    }
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [v];
}

/**
 * @fires change - Người dùng bật/tắt một lựa chọn. detail: { value }
 * @fires input - Phát ngay trước change. detail: { value }
 * @slot - Các <hui-checkbox> (bị bỏ qua khi có property options). Không cần đặt name cho checkbox con
 * @csspart base - Khung chứa các lựa chọn
 * @cssprop --hui-checkbox-group-gap - Khoảng cách giữa các lựa chọn
 * @cssprop --hui-checkbox-group-row-gap - Khoảng cách dòng (xuống dòng / direction="vertical")
 */
class HuiCheckboxGroup extends HuiFormElement {
  static properties = {
    /** Mảng giá trị đang chọn. Attribute nhận JSON '["a","b"]' hoặc 'a,b' (= giá trị ban đầu khi reset) */
    value: { type: String, default: '', reflect: false },
    /** Mảng string hoặc { label, value, disabled } — gán bằng property */
    options: { type: Array, default: [] },
    /** horizontal | vertical — hướng xếp */
    direction: { type: String, default: 'horizontal' },
  };

  static styles = styles;

  constructor() {
    super();
    this._generated = [];
  }

  /** Luôn trả về mảng (bản sao — sửa mảng trả về không làm đổi nhóm) */
  get value() {
    return [...toArray(this._getProp('value'))];
  }

  set value(v) {
    this._setProp('value', toArray(v).map(String));
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._internals && 'role' in this._internals) this._internals.role = 'group';
    else if (!this.hasAttribute('role')) this.setAttribute('role', 'group');

    this.listen(this, 'focusout', (e) => {
      if (!this.contains(e.relatedTarget) && !this.shadowRoot.contains(e.relatedTarget)) this.markInteracted();
    });
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncBoxes());
    this._optionsWrap = createElement('span', { className: 'hui-checkbox-group__options' });
    this._base = createElement('div', { className: 'hui-checkbox-group', part: 'base' }, this._slot, this._optionsWrap);
    return this._base;
  }

  updated(changed) {
    if (changed.has('options')) this._renderOptions();
    if (changed.has('name')) this._syncForm(); // formValue phụ thuộc name (FormData)
    this._base.className = `hui-checkbox-group hui-checkbox-group--${this.direction === 'vertical' ? 'vertical' : 'horizontal'}`;
    this._syncBoxes();
    if (this._internals && 'ariaDisabled' in this._internals) {
      this._internals.ariaDisabled = this.isDisabled ? 'true' : null;
      this._internals.ariaRequired = this.required ? 'true' : null;
      this._internals.ariaInvalid = this.status === 'error' ? 'true' : null;
    }
    this.setState('disabled', this.isDisabled);
    super.updated(changed);
  }

  // =====================================================
  // OPTIONS / CHECKBOX
  // =====================================================

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
      const box = createElement('hui-checkbox', { value, label });
      box._optionDisabled = disabled;
      return box;
    });
    this._optionsWrap.replaceChildren(...this._generated);
    this._slot.hidden = this._generated.length > 0;
  }

  _boxes() {
    if (this._generated.length) return this._generated;
    return [...this.querySelectorAll('hui-checkbox')];
  }

  /**
   * Gom sự kiện của checkbox con → nhóm phát 1 sự kiện của riêng nó. Listener gắn trên CHÍNH checkbox con
   * (pha target) rồi stopPropagation: listener của người dùng trên checkbox con vẫn chạy, còn thẻ cha
   * (nhóm, hui-form, framework @change trên nhóm) không bao giờ nhận nhầm sự kiện của con.
   */
  _bindBox(box) {
    if (box._huiGroupRelay) return;
    box._huiGroupRelay = (e) => {
      if (!this._boxes().includes(box)) return; // checkbox đã bị chuyển ra khỏi nhóm
      e.stopPropagation();
      if (e.type === 'change') this._toggle(box);
    };
    for (const type of ['change', 'input', 'hui-change']) box.addEventListener(type, box._huiGroupRelay);
  }

  /** Đồng bộ checked / disabled / size của checkbox con theo value của nhóm */
  _syncBoxes() {
    if (!this._hasRendered) return;
    const values = this.value;
    for (const box of this._boxes()) {
      this._bindBox(box);
      if (box._ownDisabled === undefined) box._ownDisabled = box.hasAttribute('disabled') || Boolean(box._optionDisabled);
      box.checked = values.includes(String(box.value));
      box.disabled = this.isDisabled || box._ownDisabled;
      // size riêng của checkbox con được giữ; không có thì theo nhóm
      if (box._ownSize === undefined) box._ownSize = box.getAttribute('size') || '';
      box.size = box._ownSize || this.size || '';
    }
  }

  _toggle(box) {
    if (this.isDisabled || this.readonly) return;
    const v = String(box.value);
    const set = new Set(this.value);
    if (box.checked) set.add(v);
    else set.delete(v);
    // Giữ thứ tự theo danh sách lựa chọn; giá trị không có trong danh sách để cuối
    const order = this._boxes().map((b) => String(b.value));
    const next = [...order.filter((x) => set.has(x)), ...[...set].filter((x) => !order.includes(x))];
    this.value = next;
    this.markInteracted();
    this.emit('input', { value: this.value });
    this.emit('change', { value: this.value });
  }

  // =====================================================
  // FORM
  // =====================================================

  /** Mỗi giá trị 1 entry cùng name → FormData.getAll(name) */
  formValue() {
    const values = this.value;
    if (!values.length || !this.name) return null;
    const data = new FormData();
    for (const v of values) data.append(this.name, v);
    return data;
  }

  _isEmpty() {
    return this.value.length === 0;
  }

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() {
    return this._boxes()[0]?.validationAnchor?.();
  }

  formStateRestoreCallback(state) {
    if (state instanceof FormData) this.value = state.getAll(this.name);
    else if (state != null) this.value = state;
  }

  formResetCallback() {
    super.formResetCallback();
    this._syncBoxes();
  }

  focus(options) {
    const first = this._boxes().find((b) => !b.disabled);
    if (first) first.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-checkbox-group', HuiCheckboxGroup);

export default HuiCheckboxGroup;
