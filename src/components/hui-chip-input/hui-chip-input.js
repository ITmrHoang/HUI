/**
 * HUI Chip Input — Gõ rồi Enter / dấu phẩy để thêm chip (nhập tag, email, từ khóa), tham gia <form> native.
 * Backspace ở ô trống xóa chip cuối, dán chuỗi "a, b, c" tự tách, chặn trùng, giới hạn `max`, hàm `validate`.
 * Giá trị là mảng; gửi form: mỗi chip 1 entry cùng name (mặc định) hoặc chuỗi nối dấu phẩy (form-mode="comma").
 */

import styles from './hui-chip-input.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-tag/hui-tag.js';

const FALLBACK = {
  'chipInput.duplicate': { vi: '"{value}" đã có', en: '"{value}" already added' },
  'chipInput.max': { vi: 'Tối đa {max} mục', en: 'Up to {max} items' },
  'chipInput.invalid': { vi: '"{value}" không hợp lệ', en: '"{value}" is not valid' },
  'chipInput.added': { vi: 'Đã thêm {value}', en: 'Added {value}' },
  'chipInput.removed': { vi: 'Đã xóa {value}', en: 'Removed {value}' },
  'chipInput.remove': { vi: 'Xóa {value}', en: 'Remove {value}' },
};
const msg = (key, vars) => {
  let v = t(key, vars);
  if (v !== key) return v;
  v = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : v;
};

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

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Ô nhập nhiều giá trị dạng chip.
 * @fires input - Danh sách đổi. detail: { value }
 * @fires change - Danh sách đổi (thêm / xóa). detail: { value }
 * @fires hui-add - Vừa thêm chip. detail: { value }
 * @fires hui-remove - Vừa xóa chip. detail: { value, index }
 * @fires hui-invalid - Chữ bị từ chối. detail: { value, reason: 'duplicate' | 'max' | 'invalid', message }
 * @csspart base - Khung ngoài (nhãn + ô + thông báo)
 * @csspart label - Nhãn
 * @csspart container - Khung viền chứa chip + ô gõ
 * @csspart chip - Mỗi chip (<hui-tag>)
 * @csspart input - Ô gõ
 * @csspart message - Dòng thông báo lỗi / gợi ý
 * @cssprop --hui-chip-input-min-height - Chiều cao tối thiểu khung
 * @cssprop --hui-chip-input-radius - Bo góc khung
 * @cssprop --hui-chip-input-bg - Nền khung
 * @cssprop --hui-chip-input-border-color - Viền
 * @cssprop --hui-chip-input-focus-border-color - Viền khi focus
 * @cssprop --hui-chip-input-gap - Khoảng cách giữa các chip
 */
class HuiChipInput extends HuiFormElement {
  static properties = {
    /** Mảng chuỗi; attribute nhận 'a,b' hoặc JSON (= giá trị ban đầu khi reset) */
    value: { type: String, default: '', reflect: false },
    /** Chữ gợi ý trong ô gõ */
    placeholder: { type: String, default: '' },
    /** Nhãn phía trên */
    label: { type: String, default: '' },
    /** Gợi ý nhỏ phía dưới */
    hint: { type: String, default: '' },
    /** Thông báo lỗi (viền đỏ) */
    error: { type: String, default: '' },
    /** Số chip tối đa */
    max: { type: Number },
    /** Ký tự tách chip khi gõ / dán (ngoài Enter và xuống dòng), mặc định "," */
    separators: { type: String, default: ',' },
    /** Cho phép trùng giá trị */
    allowDuplicates: { type: Boolean },
    /** Rời ô thì tự thêm chữ đang gõ thành chip */
    addOnBlur: { type: Boolean },
    /** multiple | comma — gửi form: mỗi chip 1 entry cùng name, hoặc 1 chuỗi nối dấu phẩy */
    formMode: { type: String, default: 'multiple' },
    /** Màu chip (preset của hui-tag hoặc mã màu) */
    tagColor: { type: String, default: '' },
    /** soft | filled | outlined — kiểu chip */
    tagVariant: { type: String, default: '' },
    /** (text, values) => true | false | 'thông báo lỗi' — kiểm tra trước khi thêm */
    validate: { type: Object, attribute: false },
  };

  static styles = styles;

  get value() {
    return toArray(this._getProp('value'));
  }

  set value(v) {
    this._setProp('value', toArray(v));
  }

  render() {
    this._label = createElement('label', { className: 'ci__label', part: 'label', id: 'label', for: 'input' });
    this._chips = createElement('span', { className: 'ci__chips', role: 'list' });
    this._input = createElement('input', {
      className: 'ci__input', part: 'input', id: 'input', type: 'text', autocomplete: 'off', enterkeyhint: 'enter',
    });
    this._input.addEventListener('keydown', (e) => this._onKeydown(e));
    this._input.addEventListener('input', (e) => {
      e.stopPropagation();
      this._onTyping();
    });
    this._input.addEventListener('change', (e) => e.stopPropagation());
    this._input.addEventListener('paste', (e) => this._onPaste(e));
    this._input.addEventListener('blur', () => {
      if (this.addOnBlur && this._input.value.trim()) this._addMany([this._input.value]);
      this.markInteracted();
    });

    this._container = createElement('div', { className: 'ci__container', part: 'container' }, this._chips, this._input);
    this._container.addEventListener('mousedown', (e) => {
      if (e.target === this._container || e.target === this._chips) {
        e.preventDefault();
        this._input.focus();
      }
    });
    this._chips.addEventListener('keydown', (e) => this._onChipKeydown(e));
    this._chips.addEventListener('close', (e) => {
      // hui-tag tự ẩn sau animation — chặn lại, tự xóa giá trị (vẽ lại danh sách)
      e.preventDefault();
      const tag = e.composedPath().find((n) => n.localName === 'hui-tag');
      if (tag) this._removeAt(Number(tag.dataset.index), true);
    });

    this._live = createElement('div', { className: 'ci__sr', role: 'status', 'aria-live': 'polite' });
    this._message = createElement('div', { className: 'ci__message', part: 'message', id: 'message' });
    this._wrapper = createElement('div', { className: 'ci', part: 'base' }, this._label, this._container, this._message, this._live);
    return this._wrapper;
  }

  updated(changed) {
    if (changed.has('value') || changed.has('tagColor') || changed.has('tagVariant') || changed.has('disabled')
      || changed.has('readonly') || changed.has('locale') || changed.has('size')) this._renderChips();
    if (changed.has('placeholder') || changed.has('value') || changed.has('max')) this._syncPlaceholder();
    if (changed.has('name')) this._syncForm();
    if (changed.has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
    }
    if (changed.has('disabled')) this._input.disabled = this.isDisabled;
    if (changed.has('readonly')) this._input.readOnly = this.readonly;
    if (changed.has('required')) this._input.toggleAttribute('aria-required', this.required);
    if (['error', 'hint', 'status'].some((k) => changed.has(k))) this._syncMessage();
    this._wrapper.className = ['ci', `ci--${this.effectiveSize}`, (this.error || this.status === 'error') && 'ci--error',
      this.status === 'warning' && 'ci--warning', this.isDisabled && 'ci--disabled'].filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
    super.updated(changed);
  }

  // =====================================================
  // HIỂN THỊ
  // =====================================================

  _renderChips() {
    const values = this.value;
    const removable = !this.isDisabled && !this.readonly;
    const size = this.effectiveSize === 'lg' ? 'md' : 'sm';
    const tags = values.map((v, i) => {
      const tag = createElement('hui-tag', { part: 'chip', role: 'listitem', size, dataset: { index: String(i) } }, v);
      if (removable) tag.setAttribute('closable', '');
      if (this.tagColor) tag.setAttribute('color', this.tagColor);
      if (this.tagVariant) tag.setAttribute('variant', this.tagVariant);
      if (this.isDisabled) tag.setAttribute('disabled', '');
      return tag;
    });
    this._chips.replaceChildren(...tags);
    // Đặt nhãn nút × riêng cho từng chip ("Xóa react") sau khi hui-tag dựng xong
    requestAnimationFrame(() => {
      tags.forEach((tag, i) => tag.shadowRoot?.querySelector('[part="close"]')?.setAttribute('aria-label', msg('chipInput.remove', { value: values[i] })));
    });
  }

  _syncPlaceholder() {
    const full = this.max != null && this.value.length >= this.max;
    this._input.placeholder = full || this.value.length ? '' : this.placeholder || '';
    if (!this.label && this.placeholder) this._input.setAttribute('aria-label', this.placeholder);
    else this._input.removeAttribute('aria-label');
  }

  _syncMessage() {
    const text = this.error || this.hint || '';
    this._message.textContent = text;
    this._message.hidden = !text;
    this._message.className = `ci__message ci__message--${this.error ? 'error' : 'hint'}`;
    if (text) this._input.setAttribute('aria-describedby', 'message');
    else this._input.removeAttribute('aria-describedby');
    if (this.error || this.status === 'error') this._input.setAttribute('aria-invalid', 'true');
    else this._input.removeAttribute('aria-invalid');
  }

  _announce(text) {
    this._live.textContent = text;
  }

  /** Rung nhẹ khung khi chữ bị từ chối */
  _reject(value, reason, message) {
    this.emit('hui-invalid', { value, reason, message });
    this._announce(message);
    this.setState('rejected', true);
    clearTimeout(this._rejectTimer);
    this._rejectTimer = setTimeout(() => this.setState('rejected', false), 600);
    if (!animationsDisabled() && this._container.animate) {
      this._container.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
        { duration: 240 },
      );
    }
  }

  // =====================================================
  // THÊM / XÓA
  // =====================================================

  get _sepChars() {
    return [...(this.separators ?? ',')];
  }

  /** Tách theo dấu phân cách + xuống dòng / tab */
  _split(text) {
    const chars = ['\n', '\r', '\t', ...this._sepChars].map(escapeRe).join('');
    return String(text).split(new RegExp(`[${chars}]`)).map((s) => s.trim()).filter(Boolean);
  }

  /** Thêm nhiều chuỗi; trả về số chip đã thêm. Chuỗi bị từ chối giữ lại trong ô gõ */
  _addMany(texts) {
    if (this.isDisabled || this.readonly) return 0;
    const values = this.value;
    const added = [];
    const rejected = [];
    for (const raw of texts.flatMap((s) => this._split(s))) {
      const text = raw.trim();
      if (!text) continue;
      if (this.max != null && values.length >= this.max) {
        this._reject(text, 'max', msg('chipInput.max', { max: this.max }));
        rejected.push(text);
        continue;
      }
      if (!this.allowDuplicates && values.some((v) => v.toLowerCase() === text.toLowerCase())) {
        this._reject(text, 'duplicate', msg('chipInput.duplicate', { value: text }));
        continue;
      }
      if (typeof this.validate === 'function') {
        const res = this.validate(text, [...values]);
        if (res !== true && res !== undefined) {
          this._reject(text, 'invalid', typeof res === 'string' && res ? res : msg('chipInput.invalid', { value: text }));
          rejected.push(text);
          continue;
        }
      }
      values.push(text);
      added.push(text);
    }
    this._input.value = rejected.join(', ');
    if (!added.length) return 0;
    this.value = values;
    for (const v of added) this.emit('hui-add', { value: v });
    this._announce(msg('chipInput.added', { value: added.join(', ') }));
    this._emitChange();
    return added.length;
  }

  _removeAt(index, focusAfter = false) {
    if (this.isDisabled || this.readonly) return;
    const values = this.value;
    if (index < 0 || index >= values.length) return;
    const [removed] = values.splice(index, 1);
    this.value = values;
    this.emit('hui-remove', { value: removed, index });
    this._announce(msg('chipInput.removed', { value: removed }));
    this.markInteracted();
    this._emitChange();
    if (focusAfter) {
      // Chip kế bên (hoặc ô gõ) nhận focus sau khi danh sách vẽ lại
      queueMicrotask(() => {
        const tags = [...this._chips.children];
        const next = tags[Math.min(index, tags.length - 1)];
        if (next && index < tags.length) next.focus();
        else this._input.focus();
      });
    }
  }

  _emitChange() {
    const detail = { value: this.value };
    this.emit('input', detail);
    this.emit('change', detail);
  }

  /** Thêm nhiều giá trị bằng code (có kiểm tra trùng / max / validate) */
  add(...items) {
    return this._addMany(items.map(String));
  }

  /** Xóa giá trị bằng code */
  removeValue(value) {
    this._removeAt(this.value.indexOf(String(value)));
  }

  // =====================================================
  // BÀN PHÍM
  // =====================================================

  _onTyping() {
    // Gõ / IME chèn dấu phân cách vào giữa chữ → tách luôn
    const text = this._input.value;
    if (this._sepChars.some((c) => text.includes(c))) this._addMany([text]);
  }

  _onKeydown(e) {
    if (e.isComposing) return;
    const input = this._input;
    const text = input.value;
    if (e.key === 'Enter' || this._sepChars.includes(e.key)) {
      if (!text.trim()) {
        if (e.key !== 'Enter') e.preventDefault();
        return;
      }
      e.preventDefault();
      this._addMany([text]);
      return;
    }
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    if (e.key === 'Backspace' && !text && this.value.length) {
      e.preventDefault();
      this._removeAt(this.value.length - 1);
      return;
    }
    if (e.key === 'ArrowLeft' && atStart && this.value.length) {
      e.preventDefault();
      this._chips.lastElementChild?.focus();
    }
  }

  _moveChipFocus(from, dir) {
    const tags = [...this._chips.children];
    const i = tags.indexOf(from);
    const next = tags[i + dir];
    if (next) next.focus();
    else if (dir > 0) this._input.focus();
  }

  _onChipKeydown(e) {
    const tag = e.composedPath().find((n) => n.localName === 'hui-tag');
    if (!tag) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this._moveChipFocus(tag, e.key === 'ArrowLeft' ? -1 : 1);
    }
  }

  _onPaste(e) {
    const text = e.clipboardData?.getData('text') ?? '';
    // Chỉ can thiệp khi chuỗi dán có dấu phân cách / xuống dòng (còn lại để trình duyệt dán bình thường)
    if (!/[\n\r\t]/.test(text) && !this._sepChars.some((c) => text.includes(c))) return;
    e.preventDefault();
    this._addMany([`${this._input.value}${text}`]);
  }

  // =====================================================
  // FORM
  // =====================================================

  formValue() {
    const values = this.value;
    if (!values.length) return null;
    if (this.formMode === 'comma') return values.join(',');
    if (!this.name) return null;
    const data = new FormData();
    for (const v of values) data.append(this.name, v);
    return data;
  }

  _isEmpty() {
    return this.value.length === 0;
  }

  validationAnchor() {
    return this._input;
  }

  formStateRestoreCallback(state) {
    if (state instanceof FormData) this.value = state.getAll(this.name);
    else super.formStateRestoreCallback(state);
  }

  focus(options) {
    if (this._input) this._input.focus(options);
    else super.focus(options);
  }

  blur() {
    this._input?.blur();
  }
}

defineElement('hui-chip-input', HuiChipInput);

export default HuiChipInput;
