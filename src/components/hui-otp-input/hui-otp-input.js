/**
 * HUI OTP Input — Ô nhập mã xác thực N ký tự (Ant Input.OTP), tham gia <form> qua HuiFormElement.
 * Gõ tự nhảy ô kế, Backspace lùi + xóa, phím mũi tên di chuyển, dán cả mã từ ô bất kỳ,
 * autocomplete="one-time-code" (SMS autofill), che ký tự (mask), lỗi thì rung nhẹ.
 * Parts / biến CSS: xem JSDoc class.
 */

import styles from './hui-otp-input.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { animationsDisabled } from '../../utils/animate.js';
import { createElement } from '../../utils/dom.js';

/** Chuỗi chưa có trong locale.js → dùng bản dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  'otp.label': { vi: 'Mã xác thực', en: 'Verification code' },
  'otp.char': { vi: 'Ký tự {index}/{length}', en: 'Character {index} of {length}' },
  'otp.incomplete': { vi: 'Vui lòng nhập đủ {length} ký tự', en: 'Please enter all {length} characters' },
};

function msg(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/** Ký tự hợp lệ theo type */
const CHAR_RE = { numeric: /^[0-9]$/, alphanumeric: /^[a-z0-9]$/i };

const SHAKE = [
  { transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' },
  { transform: 'translateX(-4px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' },
];
const POP = [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }];

/**
 * Ô nhập mã OTP.
 * @fires input - Mỗi lần người dùng đổi ký tự. detail: { value }
 * @fires change - Khi nhập đủ mã hoặc rời khỏi component với giá trị đã đổi. detail: { value }
 * @fires hui-complete - Người dùng vừa điền đủ mọi ô. detail: { value }
 * @csspart base - Khung nhóm các ô (role="group")
 * @csspart box - Từng ô <input>; kèm box-filled khi đã có ký tự
 * @cssprop --hui-otp-input-size - Cạnh mỗi ô (mặc định theo size)
 * @cssprop --hui-otp-input-gap - Khoảng cách giữa các ô
 * @cssprop --hui-otp-input-radius - Bo góc ô
 * @cssprop --hui-otp-input-font-size - Cỡ chữ trong ô
 * @cssprop --hui-otp-input-bg - Nền ô
 * @cssprop --hui-otp-input-color - Màu chữ
 * @cssprop --hui-otp-input-border-color - Viền ô
 * @cssprop --hui-otp-input-filled-border-color - Viền ô đã có ký tự
 * @cssprop --hui-otp-input-focus-border-color - Viền ô đang focus
 * @cssprop --hui-otp-input-focus-shadow - Vòng sáng khi focus
 */
class HuiOtpInput extends HuiFormElement {
  static properties = {
    /** Số ô (1–12) */
    length: { type: Number, default: 6 },
    /** Mã đã nhập (chuỗi ghép các ô); attribute value = giá trị ban đầu khi reset form */
    value: { type: String, default: '', reflect: false },
    /** numeric | alphanumeric — chỉ chữ số (bàn phím số trên di động) hoặc chữ + số */
    type: { type: String, default: 'numeric' },
    /** Che ký tự dạng chấm (giống mật khẩu) */
    mask: { type: Boolean },
    /** Ký tự gợi ý trong ô trống (vd "○", "-") */
    placeholder: { type: String, default: '' },
    /** Tên nhóm cho trình đọc màn hình (mặc định "Mã xác thực") */
    label: { type: String, default: '' },
    /** Tắt hiệu ứng (nảy khi điền, rung khi lỗi) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    /** Ký tự từng ô ('' = trống) — có thể có ô trống ở giữa khi xóa */
    this._chars = [];
    this._boxes = [];
    this._valueAtFocus = null;
    this._painted = false;
  }

  // =====================================================
  // GIÁ TRỊ
  // =====================================================

  get value() {
    return this._clean(this._getProp('value'));
  }
  set value(v) {
    this._setProp('value', v === null || v === undefined ? '' : String(v));
  }

  get _length() {
    const n = Math.floor(Number(this.length));
    return Number.isFinite(n) && n > 0 ? Math.min(n, 12) : 6;
  }

  get _re() {
    return CHAR_RE[this.type] || CHAR_RE.numeric;
  }

  /** Lọc ký tự hợp lệ + cắt theo length */
  _clean(raw) {
    const re = this._re;
    return [...String(raw ?? '')].filter((c) => re.test(c)).slice(0, this._length).join('');
  }

  get _locked() {
    return this.isDisabled || this.readonly;
  }

  get _complete() {
    return this._chars.length === this._length && this._chars.every(Boolean);
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._base = createElement('div', { className: 'hui-otp', part: 'base' });
    this._base.addEventListener('keydown', (e) => this._onKeydown(e));
    this._base.addEventListener('input', (e) => this._onInput(e));
    this._base.addEventListener('paste', (e) => this._onPaste(e));
    this._base.addEventListener('focusin', (e) => this._onFocusIn(e));
    this._base.addEventListener('focusout', (e) => this._onFocusOut(e));
    // change native của từng ô không có ý nghĩa (component tự phát change)
    this._base.addEventListener('change', (e) => e.stopPropagation());
    return this._base;
  }

  updated(changed) {
    super.updated(changed);
    if (changed.has('length') || changed.has('type') || changed.has('mask')) this._buildBoxes();
    if (changed.has('length') || changed.has('type')) this._syncForm();

    // Giá trị đổi từ ngoài (code / reset) → tách lại vào các ô
    if (this._chars.join('') !== this.value || this._chars.length !== this._length) {
      const v = this.value;
      this._chars = Array.from({ length: this._length }, (_, i) => v[i] || '');
    }

    this._syncAria();
    this._paint();
    this._syncClasses();

    if (changed.has('status') && this.status === 'error' && changed.get('status') !== 'error' && this._painted) {
      this.shake();
    }
  }

  firstUpdated() {
    this._painted = true;
  }

  _buildBoxes() {
    const n = this._length;
    const numeric = this.type !== 'alphanumeric';
    this._boxes = Array.from({ length: n }, (_, i) => {
      const box = createElement('input', {
        className: 'hui-otp__box',
        part: 'box',
        type: this.mask ? 'password' : 'text',
        inputmode: numeric ? 'numeric' : 'text',
        autocomplete: i === 0 ? 'one-time-code' : 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
      });
      if (numeric) box.setAttribute('pattern', '[0-9]*');
      box._index = i;
      return box;
    });
    this._base.replaceChildren(...this._boxes);
  }

  _syncAria() {
    const label = this.label || msg('otp.label');
    const n = this._length;
    // Nhãn nhóm đặt qua ElementInternals → hui-form-item ghi aria-label lên host vẫn đè được
    if (this._internals && 'role' in this._internals) {
      this._internals.role = 'group';
      this._internals.ariaLabel = label;
    } else {
      this._base.setAttribute('role', 'group');
      this._base.setAttribute('aria-label', label);
    }
    const invalid = this.status === 'error';
    this._boxes.forEach((box, i) => {
      box.setAttribute('aria-label', msg('otp.char', { index: i + 1, length: n }));
      box.disabled = this.isDisabled;
      box.readOnly = this.readonly;
      box.placeholder = this.placeholder || '';
      box.toggleAttribute('aria-required', this.required);
      if (invalid) box.setAttribute('aria-invalid', 'true');
      else box.removeAttribute('aria-invalid');
    });
  }

  /** Ghi ký tự vào từng ô + part box-filled */
  _paint() {
    this._boxes.forEach((box, i) => {
      const c = this._chars[i] || '';
      if (box.value !== c) box.value = c;
      box.setAttribute('part', c ? 'box box-filled' : 'box');
    });
  }

  _syncClasses() {
    this._base.className = [
      'hui-otp',
      `hui-otp--${this.effectiveSize}`,
      this.status === 'error' || this.status === 'warning' ? `hui-otp--${this.status}` : '',
      this.isDisabled ? 'hui-otp--disabled' : '',
      this._motionOff ? 'hui-otp--static' : '',
    ].filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
    this.setState('complete', this._complete);
  }

  get _motionOff() {
    return this.noAnimation || animationsDisabled();
  }

  // =====================================================
  // HIỆU ỨNG
  // =====================================================

  /** Rung nhẹ cả nhóm (tự gọi khi status chuyển sang error) */
  shake() {
    if (this._motionOff || !this._base.animate) return;
    this._base.animate(SHAKE, { duration: 400, easing: 'ease-in-out' });
  }

  _pop(i) {
    const box = this._boxes[i];
    if (this._motionOff || !box?.animate) return;
    box.animate(POP, { duration: 180, easing: 'ease-out' });
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  _indexOf(e) {
    const box = e.composedPath().find((n) => n?._index !== undefined && this._boxes.includes(n));
    return box ? box._index : -1;
  }

  _focusBox(i) {
    const box = this._boxes[Math.max(0, Math.min(i, this._length - 1))];
    if (!box) return;
    box.focus();
    box.select?.();
  }

  get _firstEmpty() {
    const i = this._chars.findIndex((c) => !c);
    return i === -1 ? this._length - 1 : i;
  }

  /** Ghi ký tự do người dùng → input (+ change / hui-complete khi đủ) */
  _commit(filledIndexes = []) {
    const before = this._getProp('value');
    const next = this._chars.join('');
    this._paint();
    filledIndexes.forEach((i) => this._pop(i));
    if (next === before) return;
    this.value = next;
    this.emit('input', { value: next });
    if (this._complete) {
      this.markInteracted();
      this._valueAtFocus = next;
      this.emit('change', { value: next });
      this.emit('hui-complete', { value: next });
    }
  }

  /** Điền chuỗi từ ô `start` (dán / autofill). Mã đủ dài thì điền từ ô đầu */
  _distribute(start, text) {
    const re = this._re;
    const chars = [...String(text)].filter((c) => re.test(c));
    if (!chars.length) return;
    const n = this._length;
    const from = chars.length >= n ? 0 : start;
    const filled = [];
    chars.slice(0, n - from).forEach((c, k) => {
      this._chars[from + k] = c;
      filled.push(from + k);
    });
    this._commit(filled);
    this._focusBox(Math.min(from + chars.length, n - 1));
  }

  _onKeydown(e) {
    const i = this._indexOf(e);
    if (i < 0 || e.isComposing) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; // Ctrl+V, Ctrl+A... để trình duyệt xử lý
    const rtl = getComputedStyle(this).direction === 'rtl';
    const n = this._length;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        this._focusBox(rtl ? i + 1 : i - 1);
        return;
      case 'ArrowRight':
        e.preventDefault();
        this._focusBox(rtl ? i - 1 : i + 1);
        return;
      case 'Home':
        e.preventDefault();
        this._focusBox(0);
        return;
      case 'End':
        e.preventDefault();
        this._focusBox(this._firstEmpty);
        return;
      default:
        break;
    }
    if (this._locked) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      // Ô hiện tại có ký tự → xóa tại chỗ; ô trống → lùi về ô trước và xóa ô đó
      if (this._chars[i]) {
        this._chars[i] = '';
      } else if (i > 0) {
        this._chars[i - 1] = '';
        this._focusBox(i - 1);
      }
      this._commit();
      return;
    }
    if (e.key === 'Delete') {
      e.preventDefault();
      this._chars[i] = '';
      this._commit();
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      if (!this._re.test(e.key)) return; // ký tự không hợp lệ → bỏ qua
      this._chars[i] = e.key;
      this._commit([i]);
      if (i < n - 1) this._focusBox(i + 1);
    }
  }

  /** Dự phòng cho bàn phím ảo / IME / autofill SMS (không có keydown đúng phím) */
  _onInput(e) {
    e.stopPropagation(); // input native composed → chặn, component tự phát input kèm detail
    const i = this._indexOf(e);
    if (i < 0) return;
    const box = this._boxes[i];
    if (this._locked) {
      box.value = this._chars[i] || '';
      return;
    }
    const re = this._re;
    const text = [...box.value].filter((c) => re.test(c)).join('');
    const old = this._chars[i] || '';
    if (!text) {
      this._chars[i] = '';
      this._commit();
    } else if (text.length === 1 || (text.length === 2 && old && text.includes(old))) {
      // 1 ký tự mới (ô đang có ký tự cũ thì lấy ký tự vừa gõ)
      const c = text.length === 1 ? text : text.replace(old, '');
      this._chars[i] = c;
      this._commit([i]);
      if (i < this._length - 1) this._focusBox(i + 1);
    } else {
      this._distribute(i, text);
    }
    box.value = this._chars[i] || '';
  }

  _onPaste(e) {
    const i = this._indexOf(e);
    if (i < 0) return;
    e.preventDefault();
    if (this._locked) return;
    const text = e.clipboardData?.getData('text') || '';
    this._distribute(i, text);
  }

  _onFocusIn(e) {
    const i = this._indexOf(e);
    if (i < 0) return;
    if (this._valueAtFocus === null) this._valueAtFocus = this.value;
    // Không để trống ô ở giữa: focus ô sau ô trống đầu tiên → đưa về ô trống đó
    const first = this._chars.findIndex((c) => !c);
    if (!this._locked && first !== -1 && i > first) {
      this._focusBox(first);
      return;
    }
    this._boxes[i].select?.();
  }

  _onFocusOut(e) {
    if (e.relatedTarget && this._boxes.includes(e.relatedTarget)) return;
    this.markInteracted();
    const start = this._valueAtFocus;
    this._valueAtFocus = null;
    if (start !== null && start !== this.value) this.emit('change', { value: this.value });
  }

  // =====================================================
  // FORM
  // =====================================================

  /** Bắt buộc = phải đủ length ký tự; điền dở dang cũng là lỗi */
  checkConstraints() {
    if (this.isDisabled) return null;
    const len = this.value.length;
    const message = msg('otp.incomplete', { length: this._length });
    if (this.required && len === 0) return { flags: { valueMissing: true }, message };
    if (len > 0 && len < this._length) return { flags: { tooShort: true }, message };
    return null;
  }

  validationAnchor() {
    return this._boxes[0];
  }

  /** Focus ô trống đầu tiên (hoặc ô cuối khi đã đủ) */
  focus(options) {
    const box = this._boxes[this._firstEmpty];
    if (box) box.focus(options);
    else super.focus(options);
  }

  blur() {
    this._boxes.forEach((b) => b.blur());
  }

  /** Xóa toàn bộ mã và focus ô đầu */
  clear() {
    this._chars = this._chars.map(() => '');
    this._commit();
    this._focusBox(0);
  }
}

defineElement('hui-otp-input', HuiOtpInput);

export default HuiOtpInput;
