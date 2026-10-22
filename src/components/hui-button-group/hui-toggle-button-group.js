/**
 * HUI Toggle Button Group — Nhóm nút bật/tắt (MUI ToggleButtonGroup), tham gia <form> native.
 * Nút con là <hui-button value="…"> hoặc <button value="…">; chọn một (exclusive, mặc định) hoặc nhiều (`multiple`).
 * Nút đang bật có attribute `pressed` + aria-pressed="true" trên thẻ <button> thật.
 */

import baseStyles from './hui-button-group.css?raw';
import styles from './hui-toggle-button-group.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-button/hui-button.js';

/** Chuỗi attribute → mảng: JSON '["a","b"]' hoặc 'a,b' */
function toArray(v) {
  if (Array.isArray(v)) return v.map(String);
  if (v === null || v === undefined || v === '') return [];
  const s = String(v);
  if (s.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* tách dấu phẩy */ }
  }
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

/**
 * Nhóm nút bật/tắt gộp viền.
 * @fires input - Giá trị đổi do người dùng (phát trước change). detail: { value }
 * @fires change - Giá trị đổi do người dùng. detail: { value }
 * @fires hui-change - Như change (tên theo quy ước organism). detail: { value }
 * @slot - Các nút có attribute value (<hui-button> hoặc <button>)
 * @csspart base - Khung flex chứa các nút
 * @cssprop --hui-button-group-radius - Bo góc 2 đầu nhóm
 * @cssprop --hui-toggle-button-group-pressed-bg - Nền nút đang bật
 * @cssprop --hui-toggle-button-group-pressed-color - Màu chữ nút đang bật
 * @cssprop --hui-toggle-button-group-pressed-border-color - Viền nút đang bật
 */
class HuiToggleButtonGroup extends HuiFormElement {
  static properties = {
    /** exclusive: chuỗi ('' = không bật nút nào); multiple: mảng (attribute nhận 'a,b' hoặc JSON) */
    value: { type: String, default: '', reflect: false },
    /** Cho bật nhiều nút cùng lúc */
    multiple: { type: Boolean },
    /** horizontal | vertical — hướng xếp nút */
    orientation: { type: String, default: 'horizontal' },
    /** Variant cho <hui-button> con chưa tự đặt variant (mặc định outline) */
    variant: { type: String, default: 'outline' },
    /** Chiếm toàn bộ chiều ngang, các nút chia đều */
    block: { type: Boolean },
  };

  static styles = [baseStyles, styles];

  constructor() {
    super();
    this._own = new WeakMap();
  }

  /** exclusive → chuỗi, multiple → mảng (bản sao) */
  get value() {
    const raw = this._getProp('value');
    if (this.multiple) return toArray(raw);
    if (Array.isArray(raw)) return raw.length ? String(raw[0]) : '';
    return raw == null ? '' : String(raw);
  }

  set value(v) {
    this._setProp('value', Array.isArray(v) ? v.map(String) : v);
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._internals && 'role' in this._internals) this._internals.role = 'group';
    else if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
    this.listen(this, 'click', (e) => this._onClick(e));
    this.listen(this, 'keydown', (e) => this._onKeydown(e));
    this.listen(this, 'focusout', (e) => {
      if (!this.contains(e.relatedTarget)) this.markInteracted();
    });
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncItems());
    return createElement('div', { className: 'bgroup', part: 'base' }, this._slot);
  }

  updated(changed) {
    if (changed.has('name') || changed.has('multiple')) this._syncForm();
    if (this._internals && 'ariaDisabled' in this._internals) {
      this._internals.ariaDisabled = this.isDisabled ? 'true' : null;
      this._internals.ariaOrientation = this.orientation === 'vertical' ? 'vertical' : null;
    }
    this.setState('disabled', this.isDisabled);
    this._syncItems();
    super.updated(changed);
  }

  // =====================================================
  // NÚT CON
  // =====================================================

  _items() {
    return this._slot ? this._slot.assignedElements().filter((el) => el.hasAttribute('value')) : [];
  }

  /** Thẻ nhận aria-pressed: <button> thật bên trong <hui-button>, hoặc chính <button> native */
  _realButton(el) {
    if (el.localName === 'button') return el;
    return el.shadowRoot?.querySelector('button') || null;
  }

  _isOn(el) {
    const v = el.getAttribute('value');
    return this.multiple ? this.value.includes(v) : this.value === v;
  }

  _syncItems() {
    if (!this._hasRendered) return;
    for (const el of this._items()) {
      if (!this._own.has(el)) {
        this._own.set(el, { variant: el.getAttribute('variant'), size: el.getAttribute('size'), disabled: el.hasAttribute('disabled') });
      }
      const own = this._own.get(el);
      const on = this._isOn(el);
      el.toggleAttribute('pressed', on);
      if (el.localName === 'hui-button') {
        if (own.variant === null) el.setAttribute('variant', this.variant || 'outline');
        if (own.size === null) {
          if (this.size) el.setAttribute('size', this.size);
          else el.removeAttribute('size');
        }
        if (own.block === undefined) own.block = el.hasAttribute('block');
        if (!own.block) el.toggleAttribute('block', this.block);
      }
      if (!own.disabled) el.toggleAttribute('disabled', this.isDisabled);
      const real = this._realButton(el);
      if (real) real.setAttribute('aria-pressed', String(on));
      // <hui-button> chưa upgrade → chưa có <button> bên trong: thử lại ở frame sau
      else if (!this._retry && (this._retries = (this._retries || 0) + 1) < 20) {
        this._retry = requestAnimationFrame(() => {
          this._retry = 0;
          this._syncItems();
        });
      }
    }
  }

  _itemFromEvent(e) {
    const items = this._items();
    return e.composedPath().find((n) => items.includes(n)) || null;
  }

  _onClick(e) {
    const el = this._itemFromEvent(e);
    if (!el || this.isDisabled || this.readonly || el.hasAttribute('disabled')) return;
    const v = el.getAttribute('value');
    if (this.multiple) {
      const set = new Set(this.value);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      // Giữ thứ tự theo vị trí nút trong nhóm
      const order = this._items().map((it) => it.getAttribute('value'));
      this.value = [...order.filter((x) => set.has(x)), ...[...set].filter((x) => !order.includes(x))];
    } else {
      // Bấm lại nút đang bật → tắt (giống MUI exclusive)
      this.value = this.value === v ? '' : v;
    }
    this._syncItems();
    this.markInteracted();
    const detail = { value: this.value };
    this.emit('input', detail);
    this.emit('change', detail);
    this.emit('hui-change', detail);
  }

  /** ←/→ (↑/↓ khi dọc), Home/End di chuyển focus giữa các nút */
  _onKeydown(e) {
    const el = this._itemFromEvent(e);
    if (!el) return;
    const vertical = this.orientation === 'vertical';
    const next = vertical ? 'ArrowDown' : 'ArrowRight';
    const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
    const items = this._items().filter((it) => !it.hasAttribute('disabled'));
    const i = items.indexOf(el);
    let target = null;
    if (e.key === next) target = items[(i + 1) % items.length];
    else if (e.key === prev) target = items[(i - 1 + items.length) % items.length];
    else if (e.key === 'Home') target = items[0];
    else if (e.key === 'End') target = items[items.length - 1];
    if (!target) return;
    e.preventDefault();
    target.focus();
  }

  // =====================================================
  // FORM
  // =====================================================

  formValue() {
    if (this._isEmpty()) return null;
    if (!this.multiple) return this.value;
    if (!this.name) return null;
    const data = new FormData();
    for (const v of this.value) data.append(this.name, v);
    return data;
  }

  _isEmpty() {
    return this.multiple ? this.value.length === 0 : this.value === '';
  }

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() {
    const first = this._items()[0];
    return first ? this._realButton(first) || undefined : undefined;
  }

  formResetCallback() {
    super.formResetCallback();
    this._syncItems();
  }

  formStateRestoreCallback(state) {
    if (state instanceof FormData) this.value = state.getAll(this.name);
    else super.formStateRestoreCallback(state);
  }

  focus(options) {
    const first = this._items().find((it) => !it.hasAttribute('disabled'));
    if (first) first.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-toggle-button-group', HuiToggleButtonGroup);

export default HuiToggleButtonGroup;
