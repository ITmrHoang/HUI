/**
 * HUI Phone Input — Ô nhập số điện thoại quốc tế: chọn quốc gia (cờ + mã vùng) + số trong nước
 * tự định dạng theo quốc gia (VN "912 345 678", US "(201) 555-0123"...), bỏ số 0 đầu (trunk prefix),
 * kiểm tra độ dài theo quốc gia. Giá trị gửi form dạng E.164 (+84912345678) qua HuiFormElement.
 * Bộ chọn quốc gia là <select> native trong suốt phủ lên vùng cờ → bàn phím / trình đọc màn hình chuẩn.
 */

import styles from './hui-phone-input.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';

/** Chuỗi chưa có trong locale.js → dùng bản dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  'phone.country': { vi: 'Quốc gia / vùng', en: 'Country / region' },
  'phone.number': { vi: 'Số điện thoại', en: 'Phone number' },
  'phone.invalid': { vi: 'Số điện thoại không hợp lệ', en: 'Invalid phone number' },
};

function msg(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/**
 * Danh sách quốc gia dựng sẵn. Mỗi mục:
 * code (ISO 3166-1 alpha-2), dial (mã vùng, không có +), name ({vi,en} hoặc chuỗi),
 * min/max (số chữ số trong nước), groups (nhóm chữ số khi hiển thị) hoặc format ('nanp' | hàm),
 * trunk (số đầu trong nước bị bỏ khi chuyển E.164, vd '0'), example (số mẫu làm placeholder).
 */
export const PHONE_COUNTRIES = [
  { code: 'VN', dial: '84', name: { vi: 'Việt Nam', en: 'Vietnam' }, min: 9, max: 10, groups: [3, 3, 4], trunk: '0', example: '912345678' },
  { code: 'US', dial: '1', name: { vi: 'Hoa Kỳ', en: 'United States' }, min: 10, max: 10, format: 'nanp', example: '2015550123' },
  { code: 'CA', dial: '1', name: { vi: 'Canada', en: 'Canada' }, min: 10, max: 10, format: 'nanp', example: '5062345678' },
  { code: 'JP', dial: '81', name: { vi: 'Nhật Bản', en: 'Japan' }, min: 9, max: 10, groups: [2, 4, 4], trunk: '0', example: '9012345678' },
  { code: 'KR', dial: '82', name: { vi: 'Hàn Quốc', en: 'South Korea' }, min: 9, max: 10, groups: [2, 4, 4], trunk: '0', example: '1012345678' },
  { code: 'CN', dial: '86', name: { vi: 'Trung Quốc', en: 'China' }, min: 10, max: 11, groups: [3, 4, 4], trunk: '0', example: '13123456789' },
  { code: 'TW', dial: '886', name: { vi: 'Đài Loan', en: 'Taiwan' }, min: 9, max: 9, groups: [3, 3, 3], trunk: '0', example: '912345678' },
  { code: 'HK', dial: '852', name: { vi: 'Hồng Kông', en: 'Hong Kong' }, min: 8, max: 8, groups: [4, 4], example: '51234567' },
  { code: 'TH', dial: '66', name: { vi: 'Thái Lan', en: 'Thailand' }, min: 8, max: 9, groups: [2, 3, 4], trunk: '0', example: '812345678' },
  { code: 'SG', dial: '65', name: { vi: 'Singapore', en: 'Singapore' }, min: 8, max: 8, groups: [4, 4], example: '81234567' },
  { code: 'MY', dial: '60', name: { vi: 'Malaysia', en: 'Malaysia' }, min: 9, max: 10, groups: [2, 3, 4], trunk: '0', example: '123456789' },
  { code: 'ID', dial: '62', name: { vi: 'Indonesia', en: 'Indonesia' }, min: 9, max: 12, groups: [3, 4, 5], trunk: '0', example: '81234567890' },
  { code: 'PH', dial: '63', name: { vi: 'Philippines', en: 'Philippines' }, min: 10, max: 10, groups: [3, 3, 4], trunk: '0', example: '9051234567' },
  { code: 'IN', dial: '91', name: { vi: 'Ấn Độ', en: 'India' }, min: 10, max: 10, groups: [5, 5], trunk: '0', example: '9123456789' },
  { code: 'AU', dial: '61', name: { vi: 'Úc', en: 'Australia' }, min: 9, max: 9, groups: [3, 3, 3], trunk: '0', example: '412345678' },
  { code: 'GB', dial: '44', name: { vi: 'Anh', en: 'United Kingdom' }, min: 10, max: 10, groups: [4, 6], trunk: '0', example: '7400123456' },
  { code: 'FR', dial: '33', name: { vi: 'Pháp', en: 'France' }, min: 9, max: 9, groups: [1, 2, 2, 2, 2], trunk: '0', example: '612345678' },
  { code: 'DE', dial: '49', name: { vi: 'Đức', en: 'Germany' }, min: 7, max: 11, groups: [3, 4, 4], trunk: '0', example: '15123456789' },
];

/** 'VN' → 🇻🇳 (ký tự chỉ báo vùng) */
function flagOf(code) {
  const c = String(code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  return String.fromCodePoint(...[...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** Chuẩn hóa 1 mục quốc gia (người dùng có thể chỉ khai báo code + dial) */
function normalizeCountry(c) {
  const code = String(c.code || '').toUpperCase();
  const dial = String(c.dial ?? '').replace(/\D/g, '');
  if (!code || !dial) return null;
  return {
    min: 4, max: 15, groups: [3, 3, 4], trunk: '', example: '',
    ...c, code, dial, flag: c.flag ?? flagOf(code),
  };
}

/** Tên hiển thị theo ngôn ngữ hiện tại */
function countryName(c) {
  if (c.name && typeof c.name === 'object') return c.name[getLocaleName()] || c.name.en || c.code;
  return c.name || c.code;
}

/** Định dạng chữ số trong nước theo quốc gia */
export function formatNational(digits, country) {
  const d = String(digits || '');
  if (!d || !country) return d;
  if (typeof country.format === 'function') return country.format(d);
  if (country.format === 'nanp') {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  const out = [];
  let pos = 0;
  for (const g of country.groups || [3, 3, 4]) {
    if (pos >= d.length) break;
    out.push(d.slice(pos, pos + g));
    pos += g;
  }
  if (pos < d.length) out[out.length - 1] += d.slice(pos); // dư chữ số → dồn vào nhóm cuối
  return out.join(' ');
}

/**
 * Phân tích chuỗi số → { country, national, e164 }.
 * '+84 912…' / '0084…' → dò mã vùng (ưu tiên quốc gia đang chọn nếu trùng mã, rồi mã dài nhất);
 * không có '+' → coi là số trong nước của `preferred`. Bỏ trunk prefix, cắt theo max.
 */
export function parsePhone(raw, preferred, list) {
  const s = String(raw ?? '').trim();
  let country = preferred;
  let digits = s.replace(/\D/g, '');
  const international = s.startsWith('+') || (s.startsWith('00') && digits.length > 4);
  if (international) {
    if (!s.startsWith('+')) digits = digits.slice(2);
    if (!(preferred && digits.startsWith(preferred.dial))) {
      const match = list
        .filter((c) => digits.startsWith(c.dial))
        .sort((a, b) => b.dial.length - a.dial.length)[0];
      if (match) country = match;
    }
    if (country && digits.startsWith(country.dial)) digits = digits.slice(country.dial.length);
  }
  if (country?.trunk && digits.startsWith(country.trunk)) digits = digits.slice(country.trunk.length);
  const national = digits.slice(0, country?.max ?? 15);
  return { country, national, e164: national && country ? `+${country.dial}${national}` : '' };
}

const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

let uid = 0;

/**
 * Ô nhập số điện thoại quốc tế.
 * @fires input - Gõ số / đổi quốc gia. detail: { value, country, national }
 * @fires change - Rời ô số với giá trị đã đổi / đổi quốc gia. detail: { value, country, national }
 * @csspart base - Khung ngoài (nhãn + ô + thông báo)
 * @csspart label - Nhãn
 * @csspart control - Khung viền chứa bộ chọn quốc gia + ô số
 * @csspart country - Vùng bộ chọn quốc gia (cờ + mã vùng + mũi tên)
 * @csspart flag - Cờ quốc gia
 * @csspart dial - Mã vùng (+84)
 * @csspart country-select - Thẻ <select> native (trong suốt, phủ lên vùng country)
 * @csspart input - Thẻ <input type="tel"> nhập số
 * @csspart message - Dòng lỗi / gợi ý
 * @cssprop --hui-phone-input-height - Chiều cao khung
 * @cssprop --hui-phone-input-radius - Bo góc
 * @cssprop --hui-phone-input-bg - Nền
 * @cssprop --hui-phone-input-color - Màu chữ
 * @cssprop --hui-phone-input-border-color - Viền
 * @cssprop --hui-phone-input-hover-border-color - Viền khi hover
 * @cssprop --hui-phone-input-focus-border-color - Viền khi focus
 * @cssprop --hui-phone-input-focus-shadow - Vòng sáng khi focus
 * @cssprop --hui-phone-input-country-bg - Nền vùng chọn quốc gia
 * @cssprop --hui-phone-input-font-size - Cỡ chữ
 */
class HuiPhoneInput extends HuiFormElement {
  static properties = {
    /** Số E.164 (+84912345678) — gán số trong nước (0912…) cũng được, tự chuẩn hóa theo country */
    value: { type: String, default: '', reflect: false },
    /** Mã ISO quốc gia đang chọn (VN, US, JP...) */
    country: { type: String, default: 'VN' },
    /** Ghi đè danh sách quốc gia: mảng mã ISO ["VN","US"] hoặc mục { code, dial, name, min, max, groups, trunk, example } */
    countries: { type: Array, default: null },
    /** Nhãn hiển thị phía trên */
    label: { type: String, default: '' },
    /** Chữ gợi ý (mặc định: số mẫu của quốc gia, vd "912 345 678") */
    placeholder: { type: String, default: '' },
    /** Thông báo lỗi (viền đỏ) */
    error: { type: String, default: '' },
    /** Gợi ý nhỏ phía dưới */
    hint: { type: String, default: '' },
    /** Khóa bộ chọn quốc gia (chỉ nhập số) */
    lockCountry: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._defaultCountry = null;
    this._uid = ++uid;
    this._valueAtFocus = null;
  }

  connectedCallback() {
    if (this._defaultCountry === null) this._defaultCountry = this.getAttribute('country') || 'VN';
    super.connectedCallback();
  }

  // =====================================================
  // DỮ LIỆU
  // =====================================================

  /** Danh sách quốc gia đã chuẩn hóa */
  get _list() {
    const src = Array.isArray(this.countries) && this.countries.length ? this.countries : PHONE_COUNTRIES;
    if (this._listSrc === src) return this._listCache;
    const list = src.map((c) => (typeof c === 'string'
      ? PHONE_COUNTRIES.find((p) => p.code === c.toUpperCase())
      : c)).filter(Boolean).map(normalizeCountry).filter(Boolean);
    this._listSrc = src;
    this._listCache = list.length ? list : PHONE_COUNTRIES.map(normalizeCountry);
    return this._listCache;
  }

  /** Quốc gia đang chọn (mã lạ → mục đầu danh sách) */
  get countryInfo() {
    const list = this._list;
    const code = String(this.country || '').toUpperCase();
    return list.find((c) => c.code === code) || list[0];
  }

  _parse(raw = this._getProp('value'), country = this.countryInfo) {
    return parsePhone(raw, country, this._list);
  }

  get value() {
    return this._parse().e164;
  }
  set value(v) {
    this._setProp('value', v === null || v === undefined ? '' : String(v));
  }

  /** Chữ số trong nước (không có mã vùng, không có số 0 đầu) */
  get national() {
    return this._parse().national;
  }

  _detail() {
    return { value: this.value, country: this.countryInfo?.code || '', national: this.national };
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    const inputId = `hui-phone-${this._uid}`;
    this._label = createElement('label', { className: 'hui-phone__label', part: 'label', for: inputId });

    this._flag = createElement('span', { className: 'hui-phone__flag', part: 'flag', 'aria-hidden': 'true' });
    this._dial = createElement('span', { className: 'hui-phone__dial', part: 'dial', 'aria-hidden': 'true' });
    const chevron = createElement('span', { className: 'hui-phone__chevron', 'aria-hidden': 'true' });
    chevron.innerHTML = CHEVRON;
    this._select = createElement('select', { className: 'hui-phone__select', part: 'country-select' });
    this._select.addEventListener('input', (e) => e.stopPropagation());
    this._select.addEventListener('change', (e) => {
      e.stopPropagation();
      this._onCountryChange();
    });
    this._country = createElement('div', { className: 'hui-phone__country', part: 'country' },
      this._flag, this._dial, chevron, this._select);

    this._input = createElement('input', {
      className: 'hui-phone__field', part: 'input', id: inputId,
      type: 'tel', inputmode: 'tel', autocomplete: 'tel-national',
    });
    this._input.addEventListener('input', (e) => {
      e.stopPropagation();
      this._onFieldInput();
    });
    this._input.addEventListener('keydown', (e) => this._onKeydown(e));
    this._input.addEventListener('change', (e) => e.stopPropagation());
    this._input.addEventListener('focus', () => { this._valueAtFocus = this.value; });
    this._input.addEventListener('blur', () => {
      this.markInteracted();
      if (this._valueAtFocus !== null && this._valueAtFocus !== this.value) this.emit('change', this._detail());
      this._valueAtFocus = null;
    });

    this._control = createElement('div', { className: 'hui-phone__control', part: 'control' }, this._country, this._input);
    this._message = createElement('div', { className: 'hui-phone__message', part: 'message', id: `${inputId}-msg` });
    this._base = createElement('div', { className: 'hui-phone', part: 'base' }, this._label, this._control, this._message);
    return this._base;
  }

  updated(changed) {
    // Giá trị E.164 mang mã vùng quốc gia khác → tự đổi country
    if (changed.has('value')) {
      const detected = this._parse().country;
      if (detected && detected.code !== this.countryInfo?.code) this.country = detected.code;
    }
    // Đổi country từ ngoài khi đã có số → giữ số trong nước, đổi mã vùng
    if (changed.has('country') && !changed.has('value')) {
      const oldCode = String(changed.get('country') || '').toUpperCase();
      const old = this._list.find((c) => c.code === oldCode) || this.countryInfo;
      const { national } = this._parse(this._getProp('value'), old);
      const next = national ? `+${this.countryInfo.dial}${national}` : '';
      if (next !== this._getProp('value')) this._setProp('value', next);
      else this._syncForm();
    }
    super.updated(changed);

    if (changed.has('countries') || changed.has('locale')) this._buildOptions();

    const c = this.countryInfo;
    this._flag.textContent = c?.flag || '';
    this._dial.textContent = c ? `+${c.dial}` : '';
    if (c && this._select.value !== c.code) this._select.value = c.code;
    this._select.disabled = this.isDisabled || this.lockCountry || this.readonly;
    this._select.setAttribute('aria-label', msg('phone.country'));
    this._select.title = c ? `${countryName(c)} (+${c.dial})` : '';

    // Ô số: chỉ ghi khi khác → không làm nhảy con trỏ khi đang gõ (_onFieldInput đã tự định dạng)
    const formatted = formatNational(this.national, c);
    if (this._input.value !== formatted) this._input.value = formatted;
    this._input.placeholder = this.placeholder || formatNational(c?.example || '', c);
    this._input.disabled = this.isDisabled;
    this._input.readOnly = this.readonly;
    this._input.name = this.name || '';
    this._input.toggleAttribute('aria-required', this.required);

    this._label.textContent = this.label || '';
    this._label.hidden = !this.label;
    // Không có nhãn hiển thị: tự đặt tên "Số điện thoại" — trừ khi nằm trong hui-form-item (item tự gắn nhãn)
    if (this.label || this.closest('hui-form-item')) {
      if (this._input._ownLabel) {
        this._input.removeAttribute('aria-label');
        this._input._ownLabel = false;
      }
    } else if (!this._input.hasAttribute('aria-label') || this._input._ownLabel) {
      this._input.setAttribute('aria-label', msg('phone.number'));
      this._input._ownLabel = true;
    }

    this._syncMessage();
    this._syncClasses();
  }

  _buildOptions() {
    const opts = this._list.map((c) => createElement('option', { value: c.code },
      `${c.flag ? `${c.flag} ` : ''}${countryName(c)} (+${c.dial})`));
    this._select.replaceChildren(...opts);
    const code = this.countryInfo?.code;
    if (code) this._select.value = code;
  }

  _syncMessage() {
    const text = this.error || this.hint || '';
    this._message.textContent = text;
    this._message.hidden = !text;
    this._message.className = `hui-phone__message hui-phone__message--${this.error ? 'error' : 'hint'}`;
    if (text) this._input.setAttribute('aria-describedby', this._message.id);
    else this._input.removeAttribute('aria-describedby');
    if (this.error || this.status === 'error') this._input.setAttribute('aria-invalid', 'true');
    else this._input.removeAttribute('aria-invalid');
  }

  _syncClasses() {
    const tone = this.error || this.status === 'error' ? 'error' : this.status === 'warning' ? 'warning' : '';
    this._base.className = [
      'hui-phone',
      `hui-phone--${this.effectiveSize}`,
      tone ? `hui-phone--${tone}` : '',
      this.isDisabled ? 'hui-phone--disabled' : '',
      this.lockCountry ? 'hui-phone--locked' : '',
    ].filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  _onCountryChange() {
    const code = this._select.value;
    const next = this._list.find((c) => c.code === code);
    if (!next || next.code === this.countryInfo?.code) return;
    const { national } = this._parse();
    this.country = next.code;
    this.value = national ? `+${next.dial}${national.slice(0, next.max)}` : '';
    this.markInteracted();
    const detail = this._detail();
    this.emit('input', detail);
    this.emit('change', detail);
  }

  /** Gõ / dán: lọc chữ số, bỏ số 0 đầu, định dạng lại và giữ con trỏ sau đúng chữ số */
  _onFieldInput() {
    const field = this._input;
    const raw = field.value;
    const caret = field.selectionStart ?? raw.length;
    let digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
    const before = this.value;

    let parsed;
    if (/^\s*(\+|00)/.test(raw)) {
      // Dán số quốc tế (+81 90…) → dò quốc gia theo mã vùng
      parsed = parsePhone(raw, this.countryInfo, this._list);
      digitsBefore = parsed.national.length;
    } else {
      const c = this.countryInfo;
      let digits = raw.replace(/\D/g, '');
      if (c?.trunk && digits.startsWith(c.trunk)) {
        digits = digits.slice(c.trunk.length);
        digitsBefore = Math.max(0, digitsBefore - c.trunk.length);
      }
      parsed = { country: c, national: digits.slice(0, c?.max ?? 15) };
    }
    const { country, national } = parsed;
    if (country && country.code !== this.countryInfo?.code) this.country = country.code;
    this.value = national && country ? `+${country.dial}${national}` : '';

    const formatted = formatNational(national, country);
    if (field.value !== formatted) {
      field.value = formatted;
      const pos = caretAfterDigits(formatted, Math.min(digitsBefore, national.length));
      try { field.setSelectionRange(pos, pos); } catch { /* type không hỗ trợ selection */ }
    }
    if (this.value !== before) this.emit('input', this._detail());
  }

  /** Backspace / Delete đứng cạnh ký tự định dạng (dấu cách, ngoặc, gạch) → xóa luôn chữ số kế bên */
  _onKeydown(e) {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    const field = this._input;
    const { selectionStart: s, selectionEnd: end, value } = field;
    if (s === null || s !== end || this.readonly) return;
    const isDigit = (ch) => /\d/.test(ch);
    if (e.key === 'Backspace' && s > 0 && !isDigit(value[s - 1])) {
      let j = s - 1;
      while (j >= 0 && !isDigit(value[j])) j--;
      if (j < 0) return;
      e.preventDefault();
      field.value = value.slice(0, j) + value.slice(j + 1);
      field.setSelectionRange(j, j);
      this._onFieldInput();
    } else if (e.key === 'Delete' && s < value.length && !isDigit(value[s])) {
      let j = s;
      while (j < value.length && !isDigit(value[j])) j++;
      if (j >= value.length) return;
      e.preventDefault();
      field.value = value.slice(0, j) + value.slice(j + 1);
      field.setSelectionRange(s, s);
      this._onFieldInput();
    }
  }

  // =====================================================
  // FORM
  // =====================================================

  /** Thêm luật độ dài số trong nước theo quốc gia (min–max chữ số) */
  checkConstraints() {
    const error = super.checkConstraints();
    if (error || this.isDisabled || this._isEmpty()) return error;
    const c = this.countryInfo;
    const len = this.national.length;
    if (c && (len < c.min || len > c.max)) {
      return { flags: { patternMismatch: true }, message: msg('phone.invalid') };
    }
    return null;
  }

  validationAnchor() {
    return this._input;
  }

  formResetCallback() {
    this.country = this._defaultCountry || 'VN';
    super.formResetCallback();
  }

  focus(options) {
    if (this._input) this._input.focus(options);
    else super.focus(options);
  }

  blur() {
    this._input?.blur();
  }
}

/** Vị trí con trỏ ngay sau chữ số thứ n trong chuỗi đã định dạng */
function caretAfterDigits(text, n) {
  if (n <= 0) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]) && ++count === n) return i + 1;
  }
  return text.length;
}

defineElement('hui-phone-input', HuiPhoneInput);

export default HuiPhoneInput;
