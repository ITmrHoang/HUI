/**
 * HUI Newsletter — Khối đăng ký nhận tin: ô email (hui-input) + nút (hui-button) + ô đồng ý (hui-checkbox, tùy chọn).
 * Validate email → phát hui-subscribe → gọi hàm `subscribe` (async, do người dùng cung cấp) →
 * trạng thái loading / success (dấu ✓ tự vẽ) / error. Không tự gọi mạng.
 */

import styles from './hui-newsletter.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { animationsDisabled } from '../../utils/animate.js';
import { createElement } from '../../utils/dom.js';
import '../hui-input/index.js';
import '../hui-button/index.js';
import '../hui-checkbox/index.js';

/** Chuỗi chưa có trong locale.js → dùng bản dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  'newsletter.label': { vi: 'Địa chỉ email', en: 'Email address' },
  'newsletter.form': { vi: 'Đăng ký nhận tin', en: 'Newsletter signup' },
  'newsletter.placeholder': { vi: 'Nhập email của bạn', en: 'Enter your email' },
  'newsletter.button': { vi: 'Đăng ký', en: 'Subscribe' },
  'newsletter.success': { vi: 'Đăng ký thành công! Hãy kiểm tra hộp thư của bạn.', en: 'Thanks for subscribing! Please check your inbox.' },
  'newsletter.empty': { vi: 'Vui lòng nhập email', en: 'Please enter your email' },
  'newsletter.consentRequired': { vi: 'Vui lòng đồng ý để tiếp tục', en: 'Please agree to continue' },
  'newsletter.error': { vi: 'Đăng ký không thành công, vui lòng thử lại', en: 'Subscription failed, please try again' },
};

function msg(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/** Kiểm email theo đúng luật <input type="email"> của trình duyệt */
let probe = null;
function isEmail(value) {
  probe ||= Object.assign(document.createElement('input'), { type: 'email' });
  probe.value = value;
  return !probe.validity.typeMismatch;
}

const SVG_CHECK = `<svg class="hui-nl__check" part="success-icon" viewBox="0 0 52 52" aria-hidden="true">
  <circle class="hui-nl__check-circle" cx="26" cy="26" r="24" fill="none"/>
  <path class="hui-nl__check-mark" fill="none" d="M15 27l7 7 15-15"/>
</svg>`;

/**
 * Khối đăng ký nhận tin qua email.
 * @fires hui-subscribe - Email hợp lệ, trước khi gọi `subscribe` (cancelable: preventDefault để dừng). detail: { email, consent }
 * @fires hui-success - Đăng ký thành công. detail: { email, result }
 * @fires hui-error - Hàm `subscribe` báo lỗi. detail: { email, error }
 * @slot - Nội dung giới thiệu phía trên (tiêu đề, mô tả)
 * @slot success - Nội dung thay chữ thành công
 * @csspart base - Khung ngoài
 * @csspart form - Vùng nhập (nhãn + ô email + nút + ô đồng ý + lỗi)
 * @csspart label - Nhãn hiển thị (attribute label)
 * @csspart row - Hàng ô email + nút
 * @csspart input - Thẻ <hui-input> email
 * @csspart button - Thẻ <hui-button>
 * @csspart consent - Thẻ <hui-checkbox> đồng ý
 * @csspart error - Dòng lỗi gửi (role="alert")
 * @csspart success - Khung thành công
 * @csspart success-icon - Dấu ✓ SVG
 * @csspart success-text - Chữ thành công
 * @cssprop --hui-newsletter-gap - Khoảng cách các phần tử
 * @cssprop --hui-newsletter-button-min-width - Bề rộng tối thiểu nút (layout inline)
 * @cssprop --hui-newsletter-error-color - Màu dòng lỗi
 * @cssprop --hui-newsletter-success-color - Màu dấu ✓ + chữ thành công
 * @cssprop --hui-newsletter-success-icon-size - Cạnh dấu ✓
 */
class HuiNewsletter extends HuiElement {
  static localized = true;

  static properties = {
    /** inline | stacked — ô + nút cùng hàng / xếp dọc (nút rộng hết) */
    layout: { type: String, default: 'inline' },
    /** Chữ gợi ý ô email (mặc định "Nhập email của bạn") */
    placeholder: { type: String, default: '' },
    /** Chữ trên nút (mặc định "Đăng ký") */
    buttonText: { type: String, default: '' },
    /** Chữ khi thành công (slot success ưu tiên hơn) */
    successText: { type: String, default: '' },
    /** Chữ ô đồng ý — có thì hiện hui-checkbox, bắt buộc tick mới gửi */
    consent: { type: String, default: '' },
    /** Nhãn hiển thị trên ô email (bỏ trống = chỉ có nhãn ẩn cho trình đọc màn hình) */
    label: { type: String, default: '' },
    /** Hàm async ({ email, consent }) => any — gọi để đăng ký; throw = lỗi. Không có thì thành công ngay */
    subscribe: { type: Object, attribute: false },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Vô hiệu hóa */
    disabled: { type: Boolean },
    /** Tắt hiệu ứng vẽ dấu ✓ */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._state = 'idle';
    this._email = '';
  }

  /** Trạng thái hiện tại: idle | loading | success | error */
  get state() {
    return this._state;
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._input = createElement('hui-input', { type: 'email', part: 'input', className: 'hui-nl__input' });
    this._button = createElement('hui-button', { type: 'button', part: 'button', className: 'hui-nl__button' });
    this._button.addEventListener('hui-click', () => this.submit());
    this._row = createElement('div', { className: 'hui-nl__row', part: 'row' }, this._input, this._button);

    this._checkbox = createElement('hui-checkbox', { part: 'consent', className: 'hui-nl__consent' });
    this._error = createElement('div', { className: 'hui-nl__error', part: 'error', role: 'alert' });

    // Nhãn đặt ngoài hui-input để nút luôn thẳng hàng với ô nhập
    this._label = createElement('label', { className: 'hui-nl__label', part: 'label' });
    this._label.addEventListener('click', () => this._input.focus());
    this._form = createElement('div', { className: 'hui-nl__form', part: 'form', role: 'group' },
      this._label, this._row, this._checkbox, this._error);
    // Enter trong ô email = đăng ký
    this._form.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing || !e.composedPath().includes(this._input)) return;
      e.preventDefault();
      this.submit();
    });
    // Sự kiện của control con không lọt ra ngoài (component có sự kiện riêng)
    for (const type of ['input', 'change', 'hui-change']) {
      this._form.addEventListener(type, (e) => {
        e.stopPropagation();
        this._onEdit(e);
      });
    }

    this._successText = document.createTextNode('');
    this._success = createElement('div', { className: 'hui-nl__success', part: 'success', role: 'status', tabindex: '-1' });
    this._success.innerHTML = SVG_CHECK; // SVG tĩnh của thư viện
    this._success.append(createElement('div', { className: 'hui-nl__success-text', part: 'success-text' },
      createElement('slot', { name: 'success' }, this._successText)));

    this._base = createElement('div', { className: 'hui-nl', part: 'base' }, createElement('slot'), this._form, this._success);
    return this._base;
  }

  updated(changed) {
    const input = this._input;
    input.placeholder = this.placeholder || msg('newsletter.placeholder');
    this._label.textContent = this.label || '';
    this._label.hidden = !this.label;
    input.size = this.size;
    this._button.size = this.size;
    const text = this.buttonText || msg('newsletter.button');
    if (this._button.textContent !== text) this._button.textContent = text;
    this._button.block = this.layout === 'stacked';
    this._successText.textContent = this.successText || msg('newsletter.success');
    this._checkbox.hidden = !this.consent;
    this._checkbox.label = this.consent || '';
    this._checkbox.required = Boolean(this.consent);
    this._checkbox.size = this.size;
    this._form.setAttribute('aria-label', msg('newsletter.form'));

    if (changed.has('disabled')) this._syncLock();
    if (changed.has('label') || changed.has('locale')) this._labelInput();
    this._syncClasses();
  }

  /** Tên cho <input> thật bên trong hui-input (nhãn hiển thị nằm ngoài shadow của nó) */
  async _labelInput() {
    await this._input.updateComplete;
    const anchor = this._input.validationAnchor?.();
    if (!anchor) return;
    anchor.setAttribute('aria-label', this.label || msg('newsletter.label'));
  }

  _syncClasses() {
    const layout = this.layout === 'stacked' ? 'stacked' : 'inline';
    this._base.className = [
      'hui-nl',
      `hui-nl--${layout}`,
      `hui-nl--${this._state}`,
      this.noAnimation || animationsDisabled() ? 'hui-nl--static' : '',
    ].filter(Boolean).join(' ');
    this._form.hidden = this._state === 'success';
    this._success.hidden = this._state !== 'success';
    for (const s of ['idle', 'loading', 'success', 'error']) this.setState(s, this._state === s);
  }

  _setStateName(state) {
    this._state = state;
    this._syncLock();
    this._syncClasses();
  }

  _syncLock() {
    const loading = this._state === 'loading';
    this._button.loading = loading;
    this._button.disabled = this.disabled;
    this._input.disabled = this.disabled;
    this._input.readonly = loading;
    this._checkbox.disabled = this.disabled || loading;
  }

  // =====================================================
  // GỬI
  // =====================================================

  /** Sửa ô email / tick đồng ý → xóa lỗi cũ */
  _onEdit(e) {
    const path = e.composedPath();
    if (path.includes(this._input) && this._input.error) this._input.error = '';
    if (path.includes(this._checkbox) && this._checkbox.checked) this._checkbox.error = '';
    if (this._state === 'error') {
      this._error.textContent = '';
      this._setStateName('idle');
    }
  }

  /** Validate rồi đăng ký. Trả về true khi thành công */
  async submit() {
    if (this._state === 'loading' || this.disabled) return false;
    const email = String(this._input.value || '').trim();
    const consent = Boolean(this._checkbox.checked);

    const emailError = !email ? msg('newsletter.empty') : !isEmail(email) ? t('form.typeEmail') : '';
    const consentError = this.consent && !consent ? msg('newsletter.consentRequired') : '';
    this._input.error = emailError;
    this._checkbox.error = consentError;
    if (emailError || consentError) {
      (emailError ? this._input : this._checkbox).focus();
      return false;
    }

    this._error.textContent = '';
    if (!this.emit('hui-subscribe', { email, consent }, { cancelable: true })) return false;

    this._email = email;
    if (typeof this.subscribe !== 'function') {
      this._succeed(email, undefined);
      return true;
    }
    this._setStateName('loading');
    try {
      const result = await this.subscribe({ email, consent });
      this._succeed(email, result);
      return true;
    } catch (error) {
      this._fail(email, error);
      return false;
    }
  }

  _succeed(email, result) {
    const hadFocus = this.matches(':focus-within');
    this._setStateName('success');
    if (hadFocus) this._success.focus();
    this.emit('hui-success', { email, result });
  }

  _fail(email, error) {
    this._setStateName('error');
    const text = (error && typeof error.message === 'string' && error.message) || (typeof error === 'string' && error) || msg('newsletter.error');
    this._error.textContent = text;
    this.emit('hui-error', { email, error });
  }

  /** Về trạng thái ban đầu (xóa email, bỏ tick, ẩn thông báo) */
  reset() {
    this._input.value = '';
    this._input.error = '';
    this._checkbox.checked = false;
    this._checkbox.error = '';
    this._error.textContent = '';
    this._setStateName('idle');
  }

  /** Focus ô email */
  focus(options) {
    if (this._state === 'success') this._success.focus(options);
    else if (this._input) this._input.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-newsletter', HuiNewsletter);

export default HuiNewsletter;
