/**
 * HUI Quantity — Bộ chọn số lượng "− [n] +" cho giỏ hàng, tham gia <form> qua HuiFormElement.
 * Nút tự khóa ở biên min/max, nhấn giữ để lặp (tăng tốc dần), phím ↑/↓/PageUp/PageDown/Home/End,
 * số "nảy" theo hướng tăng/giảm. Parts / biến CSS: xem JSDoc class.
 */

import styles from './hui-quantity.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-icon/index.js';

const FALLBACK = {
  'quantity.label': { vi: 'Số lượng', en: 'Quantity' },
  'quantity.increase': { vi: 'Tăng số lượng', en: 'Increase quantity' },
  'quantity.decrease': { vi: 'Giảm số lượng', en: 'Decrease quantity' },
};
const msg = (key) => {
  const v = t(key);
  return v !== key ? v : FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

/** Nhấn giữ: chờ 400ms rồi lặp, khoảng lặp rút dần từ 150ms xuống 40ms */
const REPEAT_DELAY = 400;
const REPEAT_START = 150;
const REPEAT_MIN = 40;

/**
 * Bộ chọn số lượng.
 * @fires input - Số lượng đổi (nút, phím, gõ hợp lệ). detail: { value }
 * @fires change - Số lượng đã chốt (nút, phím, rời ô / Enter). detail: { value }
 * @csspart base - Khung viền chứa 2 nút + ô số
 * @csspart decrement - Nút giảm (−)
 * @csspart increment - Nút tăng (+)
 * @csspart input - Ô số (role="spinbutton")
 * @cssprop --hui-quantity-height - Chiều cao (mặc định theo size)
 * @cssprop --hui-quantity-input-width - Bề ngang ô số
 * @cssprop --hui-quantity-radius - Bo góc
 * @cssprop --hui-quantity-bg - Nền
 * @cssprop --hui-quantity-border-color - Màu viền
 * @cssprop --hui-quantity-focus-border-color - Màu viền khi focus
 * @cssprop --hui-quantity-color - Màu chữ số
 * @cssprop --hui-quantity-button-color - Màu icon nút
 * @cssprop --hui-quantity-button-hover-bg - Nền nút khi hover
 * @cssprop --hui-quantity-font-size - Cỡ chữ số
 */
class HuiQuantity extends HuiFormElement {
  static properties = {
    /** Số lượng hiện tại; attribute value = giá trị ban đầu khi reset form */
    value: { type: Number, default: 1, reflect: false },
    /** Nhỏ nhất (mặc định 1) */
    min: { type: Number, default: 1 },
    /** Lớn nhất (bỏ trống = không giới hạn) — vd tồn kho */
    max: { type: Number },
    /** Bước nhảy của nút / phím */
    step: { type: Number, default: 1 },
    /** outlined | filled | borderless — kiểu khung */
    variant: { type: String, default: 'outlined' },
    /** Tên cho trình đọc màn hình (mặc định "Số lượng") */
    label: { type: String },
    /** Tắt hiệu ứng số nảy */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._timer = null;
    this._pointerStepped = false;
    this._focusValue = null;
  }

  // =====================================================
  // GIÁ TRỊ
  // =====================================================

  get value() {
    const v = this._getProp('value');
    // Luôn nằm trong [min, max] — gán ngoài khoảng bằng code thì bị kẹp lại
    return this._clamp(typeof v === 'number' && Number.isFinite(v) ? v : this._min);
  }
  set value(v) {
    const n = v === null || v === undefined || v === '' ? null : Number(v);
    this._setProp('value', Number.isFinite(n) ? n : null);
  }

  get _min() {
    return Number.isFinite(this.min) ? this.min : 1;
  }

  get _max() {
    return Number.isFinite(this.max) ? this.max : Infinity;
  }

  get _stepSize() {
    return Math.abs(this.step) || 1;
  }

  get _locked() {
    return this.isDisabled || this.readonly;
  }

  _clamp(n) {
    return Math.min(Math.max(n, this._min), this._max);
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._dec = this._makeButton(-1, 'minus', 'decrement');
    this._inc = this._makeButton(1, 'plus', 'increment');

    this._input = createElement('input', {
      className: 'qty__input', part: 'input', type: 'text', inputmode: 'numeric',
      autocomplete: 'off', role: 'spinbutton',
    });
    this._input.addEventListener('input', (e) => this._onInput(e));
    this._input.addEventListener('change', (e) => e.stopPropagation());
    this._input.addEventListener('keydown', (e) => this._onKeydown(e));
    this._input.addEventListener('focus', () => { this._focusValue = this.value; });
    this._input.addEventListener('blur', () => {
      this._commitText();
      this.markInteracted();
    });

    this._base = createElement('div', { className: 'qty', part: 'base' }, this._dec, this._input, this._inc);
    return this._base;
  }

  /** Nút −/+: nhấn giữ để lặp; không nhận Tab (bàn phím dùng ↑/↓ trong ô số, giống APG spinbutton) */
  _makeButton(dir, icon, part) {
    const btn = createElement('button', { type: 'button', className: `qty__btn qty__btn--${part}`, part, tabindex: '-1' },
      createElement('hui-icon', { name: icon }));
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || this._locked) return;
      e.preventDefault(); // giữ focus ở ô số
      this._pointerStepped = true;
      this._step(dir);
      this._startRepeat(dir);
    });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(type, () => this._stopRepeat());
    // click không kèm pointerdown (trình đọc màn hình, .click()) vẫn tăng/giảm
    btn.addEventListener('click', () => {
      if (!this._pointerStepped) this._step(dir);
      this._pointerStepped = false;
    });
    return btn;
  }

  _startRepeat(dir) {
    this._stopRepeat();
    let interval = REPEAT_START;
    const tick = () => {
      if (!this._step(dir)) return this._stopRepeat();
      interval = Math.max(REPEAT_MIN, interval * 0.85);
      this._timer = setTimeout(tick, interval);
    };
    this._timer = setTimeout(tick, REPEAT_DELAY);
  }

  _stopRepeat() {
    clearTimeout(this._timer);
    this._timer = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopRepeat();
  }

  updated(changed) {
    if (['value', 'min', 'max'].some((k) => changed.has(k))) {
      const text = String(this.value);
      if (this._input.value !== text) this._input.value = text;
      const old = changed.get('value');
      if (changed.has('value') && typeof old === 'number' && old !== this.value && this._hasPainted) {
        this._bump(this.value > old ? 1 : -1);
      }
    }
    if (changed.has('name')) this._input.name = this.name || '';
    if (changed.has('readonly')) this._input.readOnly = this.readonly;
    if (changed.has('disabled')) this._input.disabled = this.isDisabled;
    if (changed.has('label') || changed.has('locale')) {
      this._input.setAttribute('aria-label', this.label || msg('quantity.label'));
      this._dec.setAttribute('aria-label', msg('quantity.decrease'));
      this._inc.setAttribute('aria-label', msg('quantity.increase'));
    }
    this._syncAria();
    this._base.className = [
      'qty', `qty--${this.effectiveSize}`,
      `qty--${['filled', 'borderless'].includes(this.variant) ? this.variant : 'outlined'}`,
      this.isDisabled ? 'qty--disabled' : '',
    ].filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
    super.updated(changed);
  }

  firstUpdated() {
    this._hasPainted = true;
  }

  _syncAria() {
    const input = this._input;
    input.setAttribute('aria-valuenow', String(this.value));
    input.setAttribute('aria-valuemin', String(this._min));
    if (Number.isFinite(this._max)) input.setAttribute('aria-valuemax', String(this._max));
    else input.removeAttribute('aria-valuemax');
    this._dec.disabled = this._locked || this.value <= this._min;
    this._inc.disabled = this._locked || this.value >= this._max;
  }

  /** Số "trượt" theo hướng đổi: tăng → từ dưới lên, giảm → từ trên xuống */
  _bump(dir) {
    if (this.noAnimation || animationsDisabled() || !this._input.animate) return;
    this._input.animate(
      [{ transform: `translateY(${dir * 40}%)`, opacity: 0.2 }, { transform: 'none', opacity: 1 }],
      { duration: 180, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' },
    );
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  /** Tăng/giảm dir bước (× mult). Trả về true nếu giá trị đổi */
  _step(dir, mult = 1) {
    if (this._locked) return false;
    const typed = Number.parseInt(this._input.value, 10);
    const current = Number.isFinite(typed) ? typed : this.value;
    return this._set(this._clamp(current + dir * this._stepSize * mult));
  }

  /** Đặt giá trị do người dùng → input + change. Trả về true nếu đổi */
  _set(next) {
    if (next === this.value) {
      this._input.value = String(next);
      return false;
    }
    this.value = next;
    this._input.value = String(next);
    this._focusValue = next;
    this.emit('input', { value: next });
    this.emit('change', { value: next });
    return true;
  }

  /** Chỉ cho gõ chữ số; số hợp lệ trong khoảng → cập nhật value ngay */
  _onInput(e) {
    e.stopPropagation();
    const clean = this._input.value.replace(/\D/g, '');
    if (clean !== this._input.value) this._input.value = clean;
    const n = Number.parseInt(clean, 10);
    if (!Number.isFinite(n) || n < this._min || n > this._max || n === this.value) return;
    this.value = n;
    this.emit('input', { value: n });
  }

  /** Chốt chữ đang gõ: trống / ngoài khoảng → kẹp về [min, max] */
  _commitText() {
    const n = Number.parseInt(this._input.value, 10);
    const next = Number.isFinite(n) ? this._clamp(n) : this.value;
    if (next !== this.value) {
      this.value = next;
      this.emit('input', { value: next });
    }
    this._input.value = String(this.value);
    if (this._focusValue !== null && this.value !== this._focusValue) {
      this._focusValue = this.value;
      this.emit('change', { value: this.value });
    }
  }

  _onKeydown(e) {
    if (this._locked) return;
    switch (e.key) {
      case 'ArrowUp': this._step(1); break;
      case 'ArrowDown': this._step(-1); break;
      case 'PageUp': this._step(1, 10); break;
      case 'PageDown': this._step(-1, 10); break;
      case 'Home': this._set(this._min); break;
      case 'End':
        if (!Number.isFinite(this._max)) return;
        this._set(this._max);
        break;
      case 'Enter': this._commitText(); return;
      default: return;
    }
    e.preventDefault();
  }

  // =====================================================
  // FORM
  // =====================================================

  _isEmpty() {
    return false;
  }

  formValue() {
    return String(this.value);
  }

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.value < this._min) return { flags: { rangeUnderflow: true }, message: t('form.rangeUnderflow', { min: this._min }) };
    if (this.value > this._max) return { flags: { rangeOverflow: true }, message: t('form.rangeOverflow', { max: this._max }) };
    return null;
  }

  validationAnchor() {
    return this._input;
  }

  focus(options) {
    if (this._input) this._input.focus(options);
    else super.focus(options);
  }

  blur() {
    this._input?.blur();
  }

  /** Tăng 1 bước (như bấm +) */
  stepUp() {
    this._step(1);
  }

  /** Giảm 1 bước (như bấm −) */
  stepDown() {
    this._step(-1);
  }
}

defineElement('hui-quantity', HuiQuantity);

export default HuiQuantity;
