/**
 * HUI Coupon Input — ô nhập mã giảm giá + nút "Áp dụng".
 * Trạng thái: idle → loading (await validate) → applied (chip mã + nút gỡ) | error (rung bằng WAAPI + thông báo).
 * Tham gia <form> qua HuiFormElement: value = mã ĐÃ áp dụng ('' khi chưa có).
 */

import styles from './hui-coupon-input.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { formatCurrency } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-add-to-cart/shop-icons.js';
import '../hui-icon/index.js';
import '../hui-button/index.js';

const FALLBACK = {
  'coupon.label': { vi: 'Mã giảm giá', en: 'Coupon code' },
  'coupon.placeholder': { vi: 'Nhập mã giảm giá', en: 'Enter coupon code' },
  'coupon.apply': { vi: 'Áp dụng', en: 'Apply' },
  'coupon.applied': { vi: 'Đã áp dụng mã {code}', en: 'Coupon {code} applied' },
  'coupon.invalid': { vi: 'Mã giảm giá không hợp lệ', en: 'Invalid coupon code' },
  'coupon.empty': { vi: 'Vui lòng nhập mã giảm giá', en: 'Please enter a coupon code' },
  'coupon.remove': { vi: 'Gỡ mã {code}', en: 'Remove coupon {code}' },
};
const msg = (key, vars) => {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
};

let uid = 0;

/**
 * Ô nhập mã giảm giá.
 * @fires hui-apply - Mã hợp lệ đã được áp dụng. detail: { code, discount, message, result }
 * @fires hui-error - Mã không hợp lệ / validate ném lỗi / bỏ trống. detail: { code, message, error }
 * @fires hui-remove - Người dùng gỡ mã. detail: { code }
 * @fires change - value (mã đã áp dụng) đổi do người dùng. detail: { value }
 * @csspart base - Khung ngoài
 * @csspart field - Hàng ô nhập + nút
 * @csspart input - Thẻ <input>
 * @csspart apply - Nút "Áp dụng" (<hui-button>)
 * @csspart applied - Hàng hiển thị mã đã áp dụng
 * @csspart tag - Chip mã đã áp dụng
 * @csspart code - Chữ mã trong chip
 * @csspart remove - Nút gỡ mã (×)
 * @csspart discount - Số tiền / % được giảm
 * @csspart message - Dòng thông báo (thành công / lỗi)
 * @cssprop --hui-coupon-input-height - Chiều cao ô nhập (mặc định theo size)
 * @cssprop --hui-coupon-input-radius - Bo góc ô nhập
 * @cssprop --hui-coupon-input-bg - Nền ô nhập
 * @cssprop --hui-coupon-input-border-color - Viền ô nhập
 * @cssprop --hui-coupon-input-focus-border-color - Viền khi focus
 * @cssprop --hui-coupon-input-gap - Khoảng cách ô ↔ nút
 * @cssprop --hui-coupon-input-tag-bg - Nền chip mã
 * @cssprop --hui-coupon-input-tag-color - Chữ chip mã
 * @cssprop --hui-coupon-input-discount-color - Màu số tiền giảm
 * @cssprop --hui-coupon-input-error-color - Màu lỗi
 */
class HuiCouponInput extends HuiFormElement {
  static properties = {
    /** Mã đã áp dụng ('' = chưa có); attribute value = mã áp sẵn ban đầu */
    value: { type: String, default: '', reflect: false },
    /** Mức giảm hiển thị cạnh chip: số → định dạng tiền "−50.000 ₫", chuỗi → giữ nguyên ("−10%") */
    discount: { type: String },
    /** Mã tiền tệ khi discount là số */
    currency: { type: String, default: 'VND' },
    /** Chữ gợi ý trong ô (mặc định "Nhập mã giảm giá") */
    placeholder: { type: String },
    /** Chữ nút (mặc định "Áp dụng") */
    buttonText: { type: String },
    /** Giữ nguyên chữ hoa/thường (mặc định tự viết hoa mã) */
    preserveCase: { type: Boolean },
    /** Tắt hiệu ứng rung khi lỗi */
    noAnimation: { type: Boolean },
    /** Hàm async (code) => ({ valid, discount, message }) | boolean — kiểm tra mã; ném lỗi = lỗi */
    validate: { type: Object, attribute: false },
  };

  static styles = styles;

  constructor() {
    super();
    this._id = `hui-coupon-${++uid}`;
    /** idle | loading | applied | error */
    this._status = 'idle';
    this._message = '';
    this._token = 0;
  }

  /** Trạng thái hiện tại: idle | loading | applied | error */
  get couponState() {
    return this._status;
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._input = createElement('input', {
      className: 'cp__input', part: 'input', type: 'text', autocomplete: 'off', spellcheck: 'false',
      autocapitalize: 'characters', 'aria-describedby': `${this._id}-msg`,
    });
    this._input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // không để hui-form / <form> submit
        this.apply();
      }
    });
    this._input.addEventListener('input', (e) => {
      e.stopPropagation();
      if (this._status === 'error') this._setStatus('idle', '');
    });
    this._input.addEventListener('change', (e) => e.stopPropagation());
    this._input.addEventListener('blur', () => this.markInteracted());

    this._applyBtn = createElement('hui-button', { className: 'cp__apply', part: 'apply', variant: 'outline' });
    this._applyBtn.addEventListener('hui-click', (e) => {
      e.stopPropagation();
      this.apply();
    });
    this._field = createElement('div', { className: 'cp__field', part: 'field' }, this._input, this._applyBtn);

    this._codeEl = createElement('span', { className: 'cp__code', part: 'code' });
    this._removeBtn = createElement('button', { type: 'button', className: 'cp__remove', part: 'remove' },
      createElement('hui-icon', { name: 'close' }));
    this._removeBtn.addEventListener('click', () => this.removeCode());
    const tag = createElement('span', { className: 'cp__tag', part: 'tag' },
      createElement('hui-icon', { name: 'tag', className: 'cp__tag-icon' }), this._codeEl, this._removeBtn);
    this._discountEl = createElement('span', { className: 'cp__discount', part: 'discount' });
    this._applied = createElement('div', { className: 'cp__applied', part: 'applied', hidden: true }, tag, this._discountEl);

    this._msgEl = createElement('div', { className: 'cp__message', part: 'message', id: `${this._id}-msg`, role: 'status' });
    this._base = createElement('div', { className: 'cp', part: 'base' }, this._field, this._applied, this._msgEl);
    return this._base;
  }

  updated(changed) {
    if (changed.has('placeholder') || changed.has('locale')) this._input.placeholder = this.placeholder || msg('coupon.placeholder');
    if (changed.has('buttonText') || changed.has('locale')) this._applyBtn.textContent = this.buttonText || msg('coupon.apply');
    if (changed.has('locale') && !this._input.hasAttribute('aria-label')) this._input.setAttribute('aria-label', msg('coupon.label'));
    // value đổi từ ngoài (gán code / reset form) → đồng bộ trạng thái
    if (changed.has('value') && !this._internalChange) {
      if (this.value) this._setStatus('applied', '');
      else if (this._status === 'applied') this._setStatus('idle', '');
    }
    this._internalChange = false;
    this._input.disabled = this.isDisabled;
    this._input.readOnly = this.readonly || this._status === 'loading';
    this._applyBtn.disabled = this.isDisabled || this.readonly;
    this._removeBtn.disabled = this.isDisabled || this.readonly;
    this._sync();
    super.updated(changed);
  }

  _sync() {
    const s = this._status;
    const applied = s === 'applied' && Boolean(this.value);
    this._field.hidden = applied;
    this._applied.hidden = !applied;
    this._applyBtn.loading = s === 'loading';
    this._applyBtn.size = this.effectiveSize;
    this._codeEl.textContent = this.value || '';
    this._removeBtn.setAttribute('aria-label', msg('coupon.remove', { code: this.value || '' }));
    const d = this.discount;
    const num = d !== null && d !== undefined && d !== '' && Number.isFinite(Number(d)) ? Number(d) : null;
    this._discountEl.textContent = num !== null ? `−${formatCurrency(Math.abs(num), this.currency || 'VND')}` : (d || '');
    this._discountEl.hidden = !this._discountEl.textContent || !applied;
    this._msgEl.textContent = this._message;
    this._msgEl.hidden = !this._message;
    this._msgEl.setAttribute('role', s === 'error' ? 'alert' : 'status');
    this._input.toggleAttribute('aria-invalid', s === 'error');
    this._base.className = ['cp', `cp--${this.effectiveSize}`, `cp--${s}`, this.isDisabled ? 'cp--disabled' : ''].filter(Boolean).join(' ');
    for (const name of ['idle', 'loading', 'applied', 'error']) this.setState(name, name === s);
  }

  _setStatus(status, message) {
    this._status = status;
    this._message = message;
    if (this._hasRendered) this.requestUpdate('couponState');
  }

  // =====================================================
  // ÁP DỤNG / GỠ
  // =====================================================

  _normalizeCode(raw) {
    const code = String(raw ?? '').trim();
    return this.preserveCase ? code : code.toUpperCase();
  }

  /**
   * Áp dụng mã trong ô (hoặc `code` truyền vào). Trả về true nếu hợp lệ.
   * Gọi lại trong lúc đang kiểm tra → kết quả cũ bị bỏ qua.
   */
  async apply(code = this._input?.value) {
    if (this.isDisabled || this.readonly) return false;
    const c = this._normalizeCode(code);
    if (this._input) this._input.value = c;
    if (!c) {
      this._fail(c, msg('coupon.empty'));
      return false;
    }
    const token = ++this._token;
    let result = { valid: true };
    if (typeof this.validate === 'function') {
      this._setStatus('loading', '');
      try {
        const r = await this.validate(c);
        result = typeof r === 'object' && r !== null ? r : { valid: Boolean(r) };
      } catch (error) {
        if (token !== this._token) return false;
        this._fail(c, error?.message || msg('coupon.invalid'), error);
        return false;
      }
      if (token !== this._token) return false;
    }
    if (!result.valid) {
      this._fail(c, result.message || msg('coupon.invalid'));
      return false;
    }
    const message = result.message || msg('coupon.applied', { code: c });
    this._internalChange = true;
    this.discount = result.discount ?? null;
    this.value = c;
    this._setStatus('applied', message);
    this.markInteracted();
    this.emit('hui-apply', { code: c, discount: result.discount ?? null, message, result });
    this.emit('change', { value: c });
    // Focus chuyển sang nút gỡ (ô nhập đã bị ẩn)
    queueMicrotask(() => {
      if (this.shadowRoot.activeElement === this._input || !this.shadowRoot.activeElement) this._removeBtn.focus({ preventScroll: true });
    });
    return true;
  }

  _fail(code, message, error) {
    this._setStatus('error', message);
    this._shake();
    this.emit('hui-error', { code, message, error });
  }

  _shake() {
    if (this.noAnimation || animationsDisabled() || !this._field.animate) return;
    this._field.animate(
      [0, -8, 7, -5, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 420, easing: 'ease-in-out' },
    );
  }

  /** Gỡ mã đang áp dụng */
  removeCode() {
    if (!this.value || this.isDisabled || this.readonly) return;
    const code = this.value;
    this._token++;
    this._internalChange = true;
    this.value = '';
    this.discount = null;
    this._setStatus('idle', '');
    if (this._input) this._input.value = '';
    this.emit('hui-remove', { code });
    this.emit('change', { value: '' });
    queueMicrotask(() => this._input?.focus({ preventScroll: true }));
  }

  // =====================================================
  // FORM
  // =====================================================

  formResetCallback() {
    this._token++;
    super.formResetCallback();
    this._setStatus(this.value ? 'applied' : 'idle', '');
    if (this._input) this._input.value = '';
  }

  validationAnchor() {
    return this._status === 'applied' ? this._removeBtn : this._input;
  }

  focus(options) {
    const target = this.validationAnchor?.();
    if (target) target.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-coupon-input', HuiCouponInput);

export default HuiCouponInput;
