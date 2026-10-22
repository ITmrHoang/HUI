/**
 * HUI Contact Form — Form liên hệ dựng sẵn (Organism): hui-form + hui-form-item + hui-input / hui-phone-input /
 * hui-select / hui-textarea / hui-checkbox. Validate → hui-submit (cancelable) → submitHandler (async)
 * hoặc POST JSON tới `action` → màn hình thành công (hui-result + nút "Gửi tin khác") hoặc thông báo lỗi.
 */

import styles from './hui-contact-form.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { animationsDisabled } from '../../utils/animate.js';
import { animateIn } from '../../utils/motion.js';
import { createElement } from '../../utils/dom.js';
import { ensureElements } from '../hui-data-view/lazy-elements.js';
import '../hui-form/index.js';
import '../hui-input/index.js';
import '../hui-textarea/index.js';
import '../hui-button/index.js';
import '../hui-alert/index.js';
import '../hui-result/index.js';
import '../hui-phone-input/index.js';

/** Chuỗi chưa có trong locale.js → dùng bản dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  'contactForm.name': { vi: 'Họ và tên', en: 'Full name' },
  'contactForm.email': { vi: 'Email', en: 'Email' },
  'contactForm.phone': { vi: 'Số điện thoại', en: 'Phone number' },
  'contactForm.subject': { vi: 'Chủ đề', en: 'Subject' },
  'contactForm.message': { vi: 'Nội dung', en: 'Message' },
  'contactForm.consent': { vi: 'Tôi đồng ý để được liên hệ lại qua thông tin trên', en: 'I agree to be contacted using the information above' },
  'contactForm.namePlaceholder': { vi: 'Nguyễn Văn A', en: 'Jane Doe' },
  'contactForm.emailPlaceholder': { vi: 'ban@email.com', en: 'you@example.com' },
  'contactForm.subjectPlaceholder': { vi: 'Chọn chủ đề', en: 'Choose a subject' },
  'contactForm.messagePlaceholder': { vi: 'Bạn cần chúng tôi hỗ trợ điều gì?', en: 'How can we help you?' },
  'contactForm.submit': { vi: 'Gửi liên hệ', en: 'Send message' },
  'contactForm.successTitle': { vi: 'Đã gửi thành công!', en: 'Message sent!' },
  'contactForm.successText': { vi: 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất có thể.', en: 'Thanks for reaching out. We will get back to you soon.' },
  'contactForm.reset': { vi: 'Gửi tin khác', en: 'Send another message' },
  'contactForm.error': { vi: 'Gửi không thành công. Vui lòng thử lại.', en: 'Could not send your message. Please try again.' },
  'contactForm.consentRequired': { vi: 'Vui lòng đồng ý để tiếp tục', en: 'Please agree to continue' },
};

function msg(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

const KNOWN_FIELDS = ['name', 'email', 'phone', 'subject', 'message', 'consent'];
const csv = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
/** Control chỉ cần khi bật tùy chọn tương ứng → tải động */
const LAZY_CONTROLS = ['hui-select', 'hui-checkbox'];

/**
 * Form liên hệ dựng sẵn.
 * @fires hui-submit - Form hợp lệ, trước khi gửi (cancelable: preventDefault để không gửi). detail: { values }
 * @fires hui-success - Gửi thành công. detail: { values, result }
 * @fires hui-error - Gửi lỗi (submitHandler throw / HTTP lỗi / mạng). detail: { values, error }
 * @fires hui-values-change - (từ hui-form bên trong) Người dùng đổi 1 field. detail: { changed, values }
 * @slot - Nội dung phía trên form (tiêu đề, mô tả)
 * @slot success - Nội dung thêm trong màn hình thành công
 * @csspart base - Khung ngoài
 * @csspart form - Thẻ <hui-form>
 * @csspart field - Mỗi <hui-form-item>; kèm field-<tên> (field-name, field-email...)
 * @csspart control - Mỗi control (hui-input, hui-phone-input...); kèm control-<tên>
 * @csspart alert - Thông báo lỗi gửi (<hui-alert>)
 * @csspart actions - Hàng nút gửi
 * @csspart submit - Nút gửi (<hui-button>)
 * @csspart success - Màn hình thành công (<hui-result>)
 * @csspart reset - Nút "Gửi tin khác"
 * @cssprop --hui-contact-form-gap - Khoảng cách giữa các field
 * @cssprop --hui-contact-form-max-width - Bề rộng tối đa
 * @cssprop --hui-contact-form-columns - Số cột cho các field ngắn (name/email/phone/subject) — mặc định 1
 */
class HuiContactForm extends HuiElement {
  static localized = true;

  static properties = {
    /** Danh sách field theo thứ tự, cách nhau dấu phẩy: name, email, phone, subject, message, consent */
    fields: { type: String, default: 'name,email,phone,message' },
    /** Field bắt buộc (consent luôn bắt buộc khi có) */
    requiredFields: { type: String, default: 'name,email,message' },
    /** Danh sách chủ đề → subject là hui-select (chuỗi hoặc { label, value }); trống → subject là ô nhập */
    subjects: { type: Array, default: null },
    /** URL nhận dữ liệu (fetch JSON). submitHandler được ưu tiên hơn */
    action: { type: String, default: '' },
    /** POST | PUT | PATCH | GET — phương thức khi gửi tới action (GET: dữ liệu thành query string) */
    method: { type: String, default: 'POST' },
    /** Header thêm khi gửi tới action, vd { "X-CSRF-Token": "..." } */
    headers: { type: Object, default: null },
    /** Hàm async (values) => any — tự gửi dữ liệu; throw = lỗi. Ưu tiên hơn action */
    submitHandler: { type: Object, attribute: false },
    /** Ghi đè nhãn từng field, vd { name: "Tên của bạn" } */
    labels: { type: Object, default: null },
    /** Ghi đè placeholder từng field */
    placeholders: { type: Object, default: null },
    /** Chữ ô đồng ý (field consent) */
    consentText: { type: String, default: '' },
    /** Quốc gia mặc định của field phone */
    phoneCountry: { type: String, default: 'VN' },
    /** Số ký tự tối đa của nội dung (hiện bộ đếm) */
    messageMaxlength: { type: Number },
    /** Chữ nút gửi */
    submitText: { type: String, default: '' },
    /** Tiêu đề màn hình thành công */
    successTitle: { type: String, default: '' },
    /** Mô tả màn hình thành công */
    successText: { type: String, default: '' },
    /** Chữ nút "Gửi tin khác" */
    resetText: { type: String, default: '' },
    /** vertical | horizontal — bố cục nhãn của hui-form */
    layout: { type: String, default: 'vertical' },
    /** sm | md | lg */
    size: { type: String, default: '' },
    /** Vô hiệu hóa toàn bộ */
    disabled: { type: Boolean },
    /** Tắt hiệu ứng xuất hiện màn hình thành công */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._state = 'idle';
    this._busy = false;
    this._pending = null;
    /** name → { item, control } */
    this._fieldMap = new Map();
    /** Promise tải control động (hui-select / hui-checkbox) đang chờ, null khi đã xong */
    this._lazyReady = null;
  }

  /** Trạng thái: idle | loading | success | error */
  get state() {
    return this._state;
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._form = createElement('hui-form', { part: 'form', className: 'hui-cf__form' });
    this._form.addEventListener('hui-submit', (e) => {
      if (e.target !== this._form) return;
      e.stopPropagation(); // component phát hui-submit riêng (cancelable)
      this._pending = this._send(e.detail.values);
    });
    this._form.addEventListener('hui-submit-failed', (e) => {
      if (e.target !== this._form) return;
      e.stopPropagation();
      this._form.scrollToError();
    });

    this._fieldsEl = createElement('div', { className: 'hui-cf__fields' });
    // Tiêu đề qua slot (attribute title của hui-alert sẽ hiện tooltip native)
    this._alertTitle = createElement('span', { slot: 'title' });
    this._alert = createElement('hui-alert', { part: 'alert', className: 'hui-cf__alert', severity: 'error', hidden: true }, this._alertTitle);
    this._submit = createElement('hui-button', { type: 'submit', part: 'submit', className: 'hui-cf__submit' });
    this._actions = createElement('hui-form-item', { part: 'actions', className: 'hui-cf__actions' }, this._submit);
    this._form.append(this._fieldsEl, this._alert, this._actions);

    this._resetBtn = createElement('hui-button', { slot: 'extra', part: 'reset', variant: 'outline' });
    this._resetBtn.addEventListener('hui-click', () => this.reset(true));
    this._result = createElement('hui-result', { part: 'success', className: 'hui-cf__success', status: 'success', hidden: true, tabindex: '-1' },
      this._resetBtn, createElement('slot', { name: 'success' }));

    this._base = createElement('div', { className: 'hui-cf', part: 'base' }, createElement('slot'), this._form, this._result);
    // Sự kiện của control / nút con không lọt ra ngoài (component có sự kiện riêng); hui-form đã xử lý ở bên trong
    for (const type of ['hui-click', 'input', 'change', 'hui-change']) {
      this._base.addEventListener(type, (e) => {
        const path = e.composedPath();
        if (path.includes(this._form) || path.includes(this._result)) e.stopPropagation(); // nội dung slot của người dùng vẫn đi qua
      });
    }
    return this._base;
  }

  updated(changed) {
    const structural = ['fields', 'requiredFields', 'subjects', 'phoneCountry', 'messageMaxlength'];
    if (structural.some((k) => changed.has(k))) this._build();
    this._syncTexts();
    if (changed.has('layout')) this._form.layout = this.layout === 'horizontal' ? 'horizontal' : 'vertical';
    if (changed.has('size')) this._form.size = this.size || '';
    if (changed.has('disabled')) this._form.disabled = this.disabled;
    this._syncState();
  }

  /** Danh sách field hợp lệ theo thứ tự khai báo */
  get _fieldList() {
    const list = csv(this.fields).filter((f, i, arr) => KNOWN_FIELDS.includes(f) && arr.indexOf(f) === i);
    return list.length ? list : ['name', 'email', 'phone', 'message'];
  }

  _createControl(name) {
    switch (name) {
      case 'email':
        return createElement('hui-input', { type: 'email', name });
      case 'phone':
        return createElement('hui-phone-input', { name, country: this.phoneCountry || 'VN' });
      case 'subject': {
        if (Array.isArray(this.subjects) && this.subjects.length) {
          const el = createElement('hui-select', { name });
          el.options = this.subjects.map((s) => (typeof s === 'object' && s ? s : { label: String(s), value: String(s) }));
          return el;
        }
        return createElement('hui-input', { name });
      }
      case 'message': {
        const el = createElement('hui-textarea', { name, rows: '5' });
        if (this.messageMaxlength) {
          el.maxlength = this.messageMaxlength;
          el.showCount = true;
        }
        return el;
      }
      case 'consent':
        return createElement('hui-checkbox', { name });
      default:
        return createElement('hui-input', { name });
    }
  }

  /** Dựng lại các field (giữ giá trị đã nhập) */
  _build() {
    const prev = this._fieldMap.size ? this._form.getValues() : null;
    const required = new Set(csv(this.requiredFields));
    this._fieldMap.clear();
    const items = this._fieldList.map((name) => {
      const control = this._createControl(name);
      control.setAttribute('part', `control control-${name}`);
      const item = createElement('hui-form-item', { name, part: `field field-${name}`, className: `hui-cf__field hui-cf__field--${name}` }, control);
      if (name === 'email') item.type = 'email';
      if (name === 'consent') {
        item.rules = [{ required: true, message: msg('contactForm.consentRequired') }];
      } else {
        item.required = required.has(name);
      }
      this._fieldMap.set(name, { item, control });
      return item;
    });
    this._fieldsEl.replaceChildren(...items);
    if (prev) this._form.setValues(prev);
    // hui-select (có subjects) / hui-checkbox (field consent) tải động → định nghĩa xong thì gán lại placeholder / nhãn
    const lazy = [...this._fieldMap.values()].map(({ control }) => control.localName)
      .filter((tag, i, arr) => LAZY_CONTROLS.includes(tag) && arr.indexOf(tag) === i && !customElements.get(tag));
    // submit() / setValues() đợi promise này: control chưa định nghĩa thì hui-form chưa thấy (bỏ qua validate / giá trị)
    const ready = lazy.length
      ? ensureElements(lazy).then(() => {
        this._syncTexts();
        if (this._lazyReady === ready) this._lazyReady = null;
      })
      : null;
    this._lazyReady = ready;
  }

  _syncTexts() {
    const labels = this.labels && typeof this.labels === 'object' ? this.labels : {};
    const placeholders = this.placeholders && typeof this.placeholders === 'object' ? this.placeholders : {};
    const PH = { name: 'namePlaceholder', email: 'emailPlaceholder', subject: 'subjectPlaceholder', message: 'messagePlaceholder' };
    for (const [name, { item, control }] of this._fieldMap) {
      if (name === 'consent') {
        item.label = '';
        control.label = labels.consent || this.consentText || msg('contactForm.consent');
        continue;
      }
      item.label = labels[name] ?? msg(`contactForm.${name}`);
      const ph = placeholders[name] ?? (PH[name] ? msg(`contactForm.${PH[name]}`) : '');
      if (ph && 'placeholder' in control) control.placeholder = ph;
    }
    const submit = this.submitText || msg('contactForm.submit');
    if (this._submit.textContent !== submit) this._submit.textContent = submit;
    const reset = this.resetText || msg('contactForm.reset');
    if (this._resetBtn.textContent !== reset) this._resetBtn.textContent = reset;
    this._result.title = this.successTitle || msg('contactForm.successTitle');
    this._result.subTitle = this.successText || msg('contactForm.successText');
  }

  _syncState() {
    const s = this._state;
    this._submit.loading = s === 'loading';
    this._form.toggleAttribute('aria-busy', s === 'loading');
    this._form.hidden = s === 'success';
    this._result.hidden = s !== 'success';
    this._base.className = `hui-cf hui-cf--${s}`;
    for (const name of ['idle', 'loading', 'success', 'error']) this.setState(name, s === name);
  }

  _setStateName(s) {
    this._state = s;
    this._syncState();
  }

  // =====================================================
  // GỬI
  // =====================================================

  async _send(values) {
    if (this._busy) return;
    if (!this.emit('hui-submit', { values }, { cancelable: true })) return;
    this._busy = true;
    this._alert.hidden = true;
    this._setStateName('loading');
    try {
      let result;
      if (typeof this.submitHandler === 'function') result = await this.submitHandler(values);
      else if (this.action) result = await this._fetch(values);
      this._showSuccess(values, result);
    } catch (error) {
      this._showError(values, error);
    } finally {
      this._busy = false;
    }
  }

  /** Gửi JSON tới action (GET → query string). HTTP không 2xx → lỗi */
  async _fetch(values) {
    const method = String(this.method || 'POST').toUpperCase();
    let url = this.action;
    const init = {
      method,
      headers: { Accept: 'application/json', ...(this.headers && typeof this.headers === 'object' ? this.headers : {}) },
    };
    if (method === 'GET' || method === 'HEAD') {
      const qs = new URLSearchParams(Object.entries(values).map(([k, v]) => [k, v == null ? '' : String(v)])).toString();
      url += (url.includes('?') ? '&' : '?') + qs;
    } else {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(values);
    }
    const res = await fetch(url, init);
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`);
      error.status = res.status;
      error.response = res;
      throw error;
    }
    const type = res.headers.get('content-type') || '';
    return type.includes('json') ? res.json() : res.text();
  }

  _showSuccess(values, result) {
    const hadFocus = this.matches(':focus-within');
    this._setStateName('success');
    if (!this.noAnimation && !animationsDisabled()) animateIn(this._result, 'zoom');
    if (hadFocus) this._result.focus({ preventScroll: true });
    this.emit('hui-success', { values, result });
  }

  _showError(values, error) {
    this._setStateName('error');
    this._alertTitle.textContent = msg('contactForm.error');
    const detail = (error && typeof error.message === 'string' && error.message) || (typeof error === 'string' ? error : '');
    this._alert.description = detail;
    this._alert.hidden = false;
    this.emit('hui-error', { values, error });
  }

  // =====================================================
  // API
  // =====================================================

  /** Validate + gửi. Trả về true khi gửi thành công */
  async submit() {
    if (this._busy || this.disabled) return false;
    if (this._lazyReady) await this._lazyReady;
    const result = await this._form.submit();
    if (!result?.valid) return false;
    await this._pending;
    return this._state === 'success';
  }

  /** Giá trị hiện tại { name, email, phone, ... } */
  getValues() {
    return this._form.getValues();
  }

  /** Gán giá trị theo tên field */
  setValues(values) {
    this._form.setValues(values);
    // Field dùng control tải động chưa định nghĩa → hui-form chưa thấy → gán lại riêng các field đó khi định nghĩa xong
    if (!this._lazyReady || !values) return;
    const late = Object.fromEntries(Object.entries(values).filter(([name]) => {
      const tag = this._fieldMap.get(name)?.control.localName;
      return tag && !customElements.get(tag);
    }));
    if (Object.keys(late).length) this._lazyReady.then(() => this._form.setValues(late));
  }

  /** Xóa form về ban đầu, ẩn thông báo; focusFirst = focus field đầu tiên */
  reset(focusFirst = false) {
    this._form.reset();
    this._alert.hidden = true;
    this._setStateName('idle');
    if (focusFirst) {
      const first = this._fieldMap.values().next().value;
      requestAnimationFrame(() => first?.control.focus?.());
    }
  }
}

defineElement('hui-contact-form', HuiContactForm);

export default HuiContactForm;
