/**
 * HUI Editable — Sửa tại chỗ (Atom): bấm (hoặc Enter) vào chữ → ô nhập (input / textarea / select),
 * Enter lưu · Esc hủy · rời ô thì lưu (tùy chỉnh `blur-action`).
 * Lưu bất đồng bộ: listener `hui-save` gọi detail.waitUntil(promise) → trạng thái saving;
 * promise lỗi hoặc preventDefault() → khôi phục giá trị cũ + trạng thái error.
 */

import styles from './hui-editable.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { format } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/hui-icon.js';

const FALLBACK = {
  'editable.placeholder': { vi: 'Nhấn để sửa', en: 'Click to edit' },
  'editable.hint': { vi: 'Nhấn Enter để sửa', en: 'Press Enter to edit' },
  'editable.saving': { vi: 'Đang lưu...', en: 'Saving...' },
  'editable.saved': { vi: 'Đã lưu', en: 'Saved' },
  'editable.error': { vi: 'Không lưu được, đã khôi phục giá trị cũ', en: 'Could not save, the previous value was restored' },
  'editable.required': { vi: 'Vui lòng nhập giá trị', en: 'Please enter a value' },
};
const msg = (key, vars) => {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
};

const INPUT_TYPES = new Set(['text', 'number', 'email', 'url', 'tel', 'search', 'date', 'time']);

/** options: ['A', 'B'] hoặc [{ value, label }] → [{ value, label }] */
function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((o) => (o !== null && typeof o === 'object'
    ? { value: String(o.value ?? o.label ?? ''), label: String(o.label ?? o.value ?? ''), disabled: Boolean(o.disabled) }
    : { value: String(o), label: String(o) }));
}

/**
 * Sửa tại chỗ.
 *
 * @fires hui-edit-start - Vào chế độ sửa. detail: { value }
 * @fires hui-save - Người dùng lưu giá trị mới (khác giá trị cũ). detail: { value, oldValue, waitUntil(promise) }. Cancelable: preventDefault() = từ chối → khôi phục + error
 * @fires hui-saved - Lưu xong (sau khi mọi promise của waitUntil thành công). detail: { value, oldValue }
 * @fires hui-save-error - Lưu thất bại (bị chặn hoặc promise lỗi). detail: { value, oldValue, error }
 * @fires hui-cancel - Hủy sửa (Esc hoặc blur-action="cancel"). detail: { value }
 * @slot - (không dùng) — nội dung hiển thị lấy từ `value`
 * @csspart view - Chữ ở chế độ xem (role="button")
 * @csspart text - Phần chữ / placeholder
 * @csspart icon - Icon bút chì
 * @csspart spinner - Vòng xoay khi đang lưu
 * @csspart editor - Khung chứa ô nhập
 * @csspart control - Ô nhập (input / textarea / select)
 * @csspart message - Dòng thông báo lỗi
 * @cssprop --hui-editable-hover-bg - Nền khi hover chế độ xem
 * @cssprop --hui-editable-radius - Bo góc vùng xem / ô nhập
 * @cssprop --hui-editable-padding - Padding vùng xem / ô nhập
 * @cssprop --hui-editable-placeholder-color - Màu chữ placeholder
 * @cssprop --hui-editable-border-color - Viền ô nhập
 * @cssprop --hui-editable-focus-color - Màu viền focus
 * @cssprop --hui-editable-error-color - Màu trạng thái lỗi
 * @cssprop --hui-editable-icon-color - Màu icon bút chì
 * @cssprop --hui-editable-min-width - Bề rộng tối thiểu ô nhập
 */
class HuiEditable extends HuiElement {
  static localized = true;

  static properties = {
    /** Giá trị hiện tại */
    value: { type: String, default: '' },
    /** text | textarea | select | number | email | url | tel | date | time — loại ô nhập */
    type: { type: String, default: 'text' },
    /** Danh sách lựa chọn khi type="select": ["A", "B"] hoặc [{ value, label }] */
    options: { type: Array, default: null },
    /** Chữ hiển thị khi giá trị rỗng (mặc định "Nhấn để sửa") */
    placeholder: { type: String },
    /** Tên trường cho trình đọc màn hình (aria-label của nút xem và ô nhập) */
    label: { type: String },
    /** save | cancel | none — rời ô nhập thì lưu / hủy / giữ nguyên chế độ sửa */
    blurAction: { type: String, default: 'save' },
    /** Không cho lưu giá trị rỗng */
    required: { type: Boolean },
    /** Số ký tự tối đa (input / textarea) */
    maxlength: { type: Number },
    /** Số dòng của textarea */
    rows: { type: Number, default: 3 },
    /** Định dạng hiển thị như data-format: number | currency | percent | date | relative… */
    format: { type: String },
    /** Hàm định dạng hiển thị: (value) => string — ưu tiên hơn `format` */
    formatFn: { type: Object, attribute: false },
    /** Ẩn icon bút chì */
    noIcon: { type: Boolean },
    /** Vô hiệu hóa sửa */
    disabled: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._editing = false;
    this._saving = false;
    this._control = null;
    this._oldValue = '';
  }

  /** Đang ở chế độ sửa */
  get editing() {
    return this._editing;
  }

  /** Đang chờ lưu (promise của waitUntil chưa xong) */
  get saving() {
    return this._saving;
  }

  render() {
    this._text = createElement('span', { className: 'text', part: 'text' });
    this._icon = createElement('hui-icon', { className: 'icon', part: 'icon', name: 'edit', 'aria-hidden': 'true' });
    this._spinner = createElement('span', { className: 'spinner', part: 'spinner', hidden: true, 'aria-hidden': 'true' });
    this._view = createElement('span', { className: 'view', part: 'view', role: 'button', tabindex: '0' },
      this._text, this._icon, this._spinner);
    this._editor = createElement('span', { className: 'editor', part: 'editor', hidden: true });
    this._msg = createElement('span', { className: 'message', part: 'message', 'aria-live': 'polite' });

    this._view.addEventListener('click', () => this.edit());
    this._view.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'F2') {
        e.preventDefault();
        this.edit();
      }
    });
    return [this._view, this._editor, this._msg];
  }

  connectedCallback() {
    super.connectedCallback();
    // Esc nghe ở window (capture) → chạy trước overlay manager, không làm đóng nhầm modal chứa ô sửa
    this.listen(window, 'keydown', (e) => {
      if (e.key !== 'Escape' || !this._editing || !this._control) return;
      if (!e.composedPath().includes(this._control)) return;
      e.preventDefault();
      e.stopPropagation();
      this.cancel();
    }, { capture: true });
  }

  updated(changed) {
    if (['value', 'options', 'format', 'formatFn', 'placeholder', 'type', 'label', 'locale'].some((k) => changed.has(k))) {
      this._syncView();
    }
    if (changed.has('disabled')) {
      this._view.setAttribute('aria-disabled', String(this.disabled));
      this._view.tabIndex = this.disabled ? -1 : 0;
      if (this.disabled && this._editing) this.cancel(false);
    }
    if (changed.has('noIcon')) this._icon.hidden = this.noIcon;
    if (changed.has('locale')) this._view.setAttribute('aria-description', msg('editable.hint'));
  }

  /** Chữ hiển thị của giá trị (select → nhãn; formatFn / format) */
  get displayValue() {
    const v = this.value ?? '';
    if (v === '') return '';
    if (typeof this.formatFn === 'function') return String(this.formatFn(v) ?? '');
    if (this.type === 'select') {
      const opt = normalizeOptions(this.options).find((o) => o.value === String(v));
      if (opt) return opt.label;
    }
    return this.format ? format(v, this.format) : String(v);
  }

  _syncView() {
    const text = this.displayValue;
    const empty = !text;
    this._text.textContent = empty ? (this.placeholder || msg('editable.placeholder')) : text;
    this._text.classList.toggle('text--placeholder', empty);
    this.setState('empty', empty);
    if (this.label) this._view.setAttribute('aria-label', `${this.label}: ${this._text.textContent}`);
    else this._view.removeAttribute('aria-label');
  }

  // =====================================================
  // CHẾ ĐỘ SỬA
  // =====================================================

  /** Vào chế độ sửa (focus ô nhập, chọn sẵn chữ) */
  edit() {
    if (this.disabled || this._editing || this._saving) return;
    this._editing = true;
    this._oldValue = this.value ?? '';
    this._setError(null);
    const control = this._buildControl();
    this._control = control;
    this._editor.replaceChildren(control);
    this._view.hidden = true;
    this._editor.hidden = false;
    this.setState('editing', true);
    control.focus();
    if (typeof control.select === 'function' && control.tagName !== 'SELECT') {
      try { control.select(); } catch { /* type không hỗ trợ select() */ }
    }
    this.emit('hui-edit-start', { value: this._oldValue });
  }

  _buildControl() {
    const type = this.type === 'textarea' || this.type === 'select' ? this.type : (INPUT_TYPES.has(this.type) ? this.type : 'text');
    let control;
    if (type === 'select') {
      control = createElement('select', { className: 'control', part: 'control' });
      const opts = normalizeOptions(this.options);
      const current = String(this.value ?? '');
      if (!opts.some((o) => o.value === current)) control.append(createElement('option', { value: current }, current));
      for (const o of opts) control.append(createElement('option', { value: o.value, disabled: o.disabled }, o.label));
      control.value = current;
      // Chọn bằng chuột → lưu luôn
      control.addEventListener('change', () => this.save());
    } else if (type === 'textarea') {
      control = createElement('textarea', { className: 'control', part: 'control', rows: String(this.rows || 3) });
      control.value = this.value ?? '';
    } else {
      control = createElement('input', { className: 'control', part: 'control', type });
      control.value = this.value ?? '';
    }
    if (this.maxlength && type !== 'select') control.setAttribute('maxlength', String(this.maxlength));
    if (this.required) control.setAttribute('aria-required', 'true');
    if (this.placeholder && type !== 'select') control.setAttribute('placeholder', this.placeholder);
    control.setAttribute('aria-label', this.label || this.placeholder || msg('editable.placeholder'));
    // Ô nhập tự giãn theo độ dài chữ (input một dòng)
    if (control.tagName === 'INPUT') {
      const fit = () => control.style.setProperty('--_editable-ch', String(Math.max(4, control.value.length + 2)));
      control.addEventListener('input', fit);
      fit();
    }
    control.addEventListener('input', () => {
      if (this._msg.textContent) this._setError(null);
    });
    control.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      // textarea: Enter xuống dòng, Ctrl/⌘ + Enter mới lưu
      if (control.tagName === 'TEXTAREA' && !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      this.save();
    });
    control.addEventListener('blur', () => {
      if (!this._editing || this._control !== control) return;
      if (this.blurAction === 'cancel') this.cancel(false);
      else if (this.blurAction !== 'none') this.save({ restoreFocus: false });
    });
    return control;
  }

  _exitEdit(restoreFocus) {
    this._editing = false;
    const hadFocus = this._control && this.shadowRoot.activeElement === this._control;
    this._control = null;
    this._editor.hidden = true;
    this._editor.replaceChildren();
    this._view.hidden = false;
    this.setState('editing', false);
    if (restoreFocus && hadFocus) this._view.focus();
  }

  /** Hủy sửa, giữ giá trị cũ */
  cancel(restoreFocus = true) {
    if (!this._editing) return;
    this._exitEdit(restoreFocus);
    this._setError(null);
    this.emit('hui-cancel', { value: this.value });
  }

  /**
   * Lưu giá trị đang nhập. Trả về Promise<boolean> (true = đã lưu / không đổi).
   * @param {{restoreFocus?: boolean}} [opts]
   */
  async save({ restoreFocus = true } = {}) {
    if (!this._editing || !this._control) return false;
    const value = this._control.value;
    const oldValue = this._oldValue;
    if (this.required && !String(value).trim()) {
      this._setError(msg('editable.required'));
      this._control.setAttribute('aria-invalid', 'true');
      this._control.focus();
      return false;
    }
    this._exitEdit(restoreFocus);
    if (value === oldValue) return true;

    const waits = [];
    const detail = { value, oldValue, waitUntil: (p) => waits.push(Promise.resolve(p)) };
    const ok = this.emit('hui-save', detail, { cancelable: true });
    if (!ok) {
      this._fail(value, oldValue, null);
      return false;
    }
    // Hiển thị lạc quan giá trị mới trong lúc chờ lưu
    this.value = value;
    if (!waits.length) {
      this.emit('hui-saved', { value, oldValue });
      return true;
    }
    this._setSaving(true);
    try {
      const results = await Promise.all(waits);
      this._setSaving(false);
      // Promise trả về false cũng tính là từ chối
      if (results.some((r) => r === false)) {
        this._fail(value, oldValue, null);
        return false;
      }
      this.emit('hui-saved', { value, oldValue });
      return true;
    } catch (error) {
      this._setSaving(false);
      this._fail(value, oldValue, error);
      return false;
    }
  }

  _fail(value, oldValue, error) {
    this.value = oldValue;
    const text = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
    this._setError(text || msg('editable.error'));
    this.emit('hui-save-error', { value, oldValue, error });
  }

  _setSaving(on) {
    this._saving = on;
    this.setState('saving', on);
    this._spinner.hidden = !on;
    this._view.toggleAttribute('aria-busy', on);
    this._view.setAttribute('aria-disabled', String(on || this.disabled));
  }

  _setError(text) {
    this._msg.textContent = text || '';
    this.setState('error', Boolean(text));
    if (!text) this._control?.removeAttribute('aria-invalid');
  }
}

defineElement('hui-editable', HuiEditable);

export default HuiEditable;
