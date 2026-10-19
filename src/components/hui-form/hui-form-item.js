/**
 * HUI Form Item — Một dòng của form (Ant Form.Item): nhãn, control, luật validate, dòng lỗi/gợi ý.
 * Control = phần tử HuiFormElement bên trong có name trùng `name`, không có thì lấy control đầu tiên.
 * Luật: attribute (required, type, min, max, minlength, maxlength, pattern, message) và/hoặc property `rules`.
 * Kết quả luật được ghi vào control bằng setCustomValidity() → :state(user-invalid), checkValidity() đều đúng.
 * Parts / slots / biến CSS: xem JSDoc của class bên dưới.
 */

import styles from './hui-form-item.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/hui-icon.js';
import '../hui-tooltip/hui-tooltip.js';

// =====================================================
// TIỆN ÍCH DÙNG CHUNG VỚI hui-form
// =====================================================

/** Phần tử là control của HUI (kế thừa HuiFormElement) — kiểm theo API để chạy cả khi trang có 2 bản HUI */
export function isFieldControl(el) {
  return Boolean(el) && typeof el.markInteracted === 'function' && typeof el.setCustomValidity === 'function'
    && typeof el.checkValidity === 'function';
}

/** Control nằm bên trong control khác (vd: hui-checkbox trong hui-checkbox-group) → không phải field riêng */
export function isNestedControl(el, root) {
  for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
    if (isFieldControl(p)) return true;
  }
  return false;
}

/** Control kiểu bật/tắt (checkbox, switch): giá trị của field là `checked` */
function hasChecked(control) {
  return Boolean(control.constructor?._getPropertyMap?.().has('checked'));
}

export function readValue(control) {
  return hasChecked(control) ? Boolean(control.checked) : control.value;
}

export function writeValue(control, value) {
  if (hasChecked(control)) control.checked = Boolean(value);
  else control.value = value;
}

function isEmptyValue(v) {
  return v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && v.length === 0);
}

/** Chuỗi chưa có trong locale.js (xem báo cáo) — fallback theo ngôn ngữ hiện tại */
const FALLBACK = {
  vi: { typeNumber: 'Vui lòng nhập số', minItems: 'Chọn tối thiểu {min} mục', maxItems: 'Chọn tối đa {max} mục' },
  en: { typeNumber: 'Please enter a number', minItems: 'Select at least {min} items', maxItems: 'Select at most {max} items' },
};

function msg(key, vars) {
  const path = `form.${key}`;
  const text = t(path, vars);
  if (text !== path) return text;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] || path;
  return raw.replace(/\{(\w+)\}/g, (m, k) => (vars?.[k] !== undefined ? String(vars[k]) : m));
}

/** <input> tách rời để kiểm email/url theo đúng luật trình duyệt */
let probe = null;
function typeMismatch(type, value) {
  probe ||= document.createElement('input');
  probe.type = type;
  probe.value = String(value);
  return probe.validity.typeMismatch;
}

let uid = 0;

/**
 * @slot - Control (hui-input, hui-select, hui-radio-group...)
 * @slot extra - Nội dung phụ dưới control (thay cho attribute extra)
 * @slot feedback - Dành riêng: dòng lỗi / gợi ý do form-item tự tạo (không dùng)
 * @csspart base - Khung ngoài (nhãn + control)
 * @csspart label - Cột nhãn
 * @csspart label-text - Thẻ chứa chữ nhãn
 * @csspart required-mark - Dấu * bắt buộc
 * @csspart optional - Chữ "(không bắt buộc)" khi required-mark="optional"
 * @csspart tooltip - Icon ⓘ có tooltip
 * @csspart control - Cột control (control + lỗi/gợi ý + extra)
 * @csspart help - Vùng dòng lỗi / gợi ý
 * @csspart extra - Vùng nội dung phụ
 * @cssprop --hui-form-item-margin-bottom - Khoảng cách dưới mỗi dòng
 * @cssprop --hui-form-label-width - Chiều rộng cột nhãn (layout horizontal; attribute label-width ưu tiên hơn)
 * @cssprop --hui-form-label-color - Màu chữ nhãn
 * @cssprop --hui-form-label-font-size - Cỡ chữ nhãn
 * @cssprop --hui-form-required-color - Màu dấu *
 * @cssprop --hui-form-help-font-size - Cỡ chữ dòng lỗi / gợi ý / extra
 * @cssprop --hui-form-error-color - Màu dòng lỗi
 * @cssprop --hui-form-warning-color - Màu dòng cảnh báo
 * @cssprop --hui-form-help-color - Màu dòng gợi ý / extra
 */
class HuiFormItem extends HuiElement {
  static localized = true;

  static properties = {
    /** Nhãn */
    label: { type: String, default: '' },
    /** Tên field — chọn control có name trùng; control chưa có name thì được gán name này */
    name: { type: String, default: '' },
    /** Gợi ý dưới control (bị thay bằng lỗi khi validate sai) */
    help: { type: String, default: '' },
    /** Nội dung phụ dưới cùng (luôn hiện) */
    extra: { type: String, default: '' },
    /** Chữ của icon ⓘ cạnh nhãn */
    tooltip: { type: String, default: '' },
    /** Bắt buộc có giá trị (checkbox: phải được chọn) */
    required: { type: Boolean },
    /** '' | email | url | number — kiểm định dạng */
    type: { type: String, default: '' },
    /** Số: giá trị nhỏ nhất · chuỗi: độ dài tối thiểu · mảng: số mục tối thiểu */
    min: { type: Number },
    /** Số: giá trị lớn nhất · chuỗi: độ dài tối đa · mảng: số mục tối đa */
    max: { type: Number },
    /** Độ dài tối thiểu */
    minlength: { type: Number },
    /** Độ dài tối đa */
    maxlength: { type: Number },
    /** Biểu thức chính quy (khớp toàn chuỗi) */
    pattern: { type: String, default: '' },
    /** Thông báo lỗi thay cho thông báo mặc định của các luật đặt bằng attribute */
    message: { type: String, default: '' },
    /** '' | success | warning | error | validating — ép trạng thái hiển thị (bỏ trống = theo kết quả validate) */
    status: { type: String, default: '' },
    /** Tên các field khác (cách nhau dấu phẩy) — field đó đổi thì validate lại item này (vd: xác nhận mật khẩu) */
    dependencies: { type: String, default: '' },
    /** Luật bổ sung: [{ required, type, min, max, len, pattern, validator: async (value, values) => {}, message }] */
    rules: { type: Array, default: [], attribute: false },
  };

  static styles = styles;

  constructor() {
    super();
    this._error = '';
    this._token = 0;
    this._pending = null;
    this._touched = false;
    this._ownsStatus = false;
    this._describedAnchor = null;
    this._feedbackId = `hui-form-item-help-${++uid}`;
  }

  connectedCallback() {
    super.connectedCallback();
    // Dòng lỗi/gợi ý nằm ở light DOM (slot="feedback") để aria-describedby từ <input> trong shadow của control
    // trỏ tới được (element reference chỉ trỏ ra cây cha, không trỏ vào shadow của form-item)
    if (!this._feedback) {
      this._feedback = createElement('div', { slot: 'feedback', id: this._feedbackId, 'aria-live': 'polite' });
    }
    if (this._feedback.parentNode !== this) this.append(this._feedback);

    this.listen(this, 'change', (e) => this._onControlEvent(e, true));
    this.listen(this, 'input', (e) => this._onControlEvent(e, false));
    queueMicrotask(() => this._syncControl());
  }

  render() {
    this._mark = createElement('span', { className: 'hui-form-item__mark', part: 'required-mark', 'aria-hidden': 'true' }, '*');
    this._labelTextNode = document.createTextNode('');
    this._tooltipIcon = createElement('hui-icon', { name: 'info', tabindex: '0' });
    this._tooltip = createElement('hui-tooltip', { className: 'hui-form-item__tooltip', part: 'tooltip' }, this._tooltipIcon);
    this._optional = createElement('span', { className: 'hui-form-item__optional', part: 'optional' });
    this._labelText = createElement('label', { className: 'hui-form-item__label-text', part: 'label-text' },
      this._mark, this._labelTextNode, this._tooltip, this._optional);
    this._labelText.addEventListener('click', (e) => {
      if (e.composedPath().includes(this._tooltip)) return;
      this.control?.focus?.();
    });
    this._labelCol = createElement('div', { className: 'hui-form-item__label', part: 'label' }, this._labelText);

    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncControl());
    this._help = createElement('div', { className: 'hui-form-item__help', part: 'help' }, createElement('slot', { name: 'feedback' }));
    this._extraText = document.createTextNode('');
    this._extraSlot = createElement('slot', { name: 'extra' }, this._extraText);
    this._extraSlot.addEventListener('slotchange', () => this._syncExtra());
    this._extra = createElement('div', { className: 'hui-form-item__extra', part: 'extra' }, this._extraSlot);
    this._controlCol = createElement('div', { className: 'hui-form-item__control', part: 'control' },
      createElement('div', { className: 'hui-form-item__input' }, this._slot), this._help, this._extra);

    this._base = createElement('div', { className: 'hui-form-item', part: 'base' }, this._labelCol, this._controlCol);
    return this._base;
  }

  updated(changed) {
    const form = this._hostForm;
    const layout = form?.layout || 'vertical';
    const markMode = String(form?.requiredMark ?? 'true');
    const required = this._isRequired();

    this.setAttribute('data-layout', ['horizontal', 'inline'].includes(layout) ? layout : 'vertical');
    this.setAttribute('data-size', form?.size || 'md');

    this._labelTextNode.textContent = this.label;
    this._labelCol.hidden = !this.label && layout !== 'horizontal';
    this._labelText.hidden = !this.label;
    this._labelCol.classList.toggle('hui-form-item__label--left', form?.labelAlign === 'left');
    const width = form?.labelWidth;
    if (width && layout === 'horizontal') {
      this._labelCol.style.setProperty('--_form-label-width', /^\d+(\.\d+)?$/.test(width) ? `${width}px` : width);
    } else {
      this._labelCol.style.removeProperty('--_form-label-width');
    }

    this._mark.hidden = !required || markMode === 'false' || markMode === 'optional';
    this._optional.hidden = required || markMode !== 'optional';
    this._optional.textContent = t('form.optional');

    this._tooltip.hidden = !this.tooltip;
    this._tooltip.setAttribute('content', this.tooltip);
    if (this.tooltip) this._tooltipIcon.setAttribute('label', this.tooltip);

    if (changed.has('extra')) {
      this._extraText.textContent = this.extra;
      this._syncExtra();
    }
    if (changed.has('name') || changed.has('label')) this._syncControl();
    this._syncFeedback();
  }

  // =====================================================
  // CONTROL
  // =====================================================

  get _hostForm() {
    return this.closest('hui-form');
  }

  /** Control mà item quản lý (null nếu chưa có / chưa upgrade) */
  get control() {
    const list = [...this.querySelectorAll('*')].filter(
      (el) => isFieldControl(el) && !isNestedControl(el, this) && el.closest('hui-form-item') === this,
    );
    if (this.name) return list.find((c) => c.name === this.name) || list[0] || null;
    return list[0] || null;
  }

  /** Tên field: name của control, không có thì name của item */
  get fieldName() {
    return this.control?.name || this.name || '';
  }

  _isRequired() {
    const rules = Array.isArray(this.rules) ? this.rules : [];
    return this.required || rules.some((r) => r?.required) || Boolean(this.control?.required);
  }

  /** Control mới vào (slotchange) / đổi name / label: gán name, nhãn trợ năng, mô tả lỗi */
  _syncControl() {
    if (!this.isConnected) return;
    const control = this.control;
    if (!control) {
      // Control chưa upgrade → đợi định nghĩa rồi đồng bộ lại
      for (const el of this.querySelectorAll(':not(:defined)')) {
        customElements.whenDefined(el.localName).then(() => this._syncControl());
      }
      return;
    }
    if (this.name && !control.name) control.name = this.name;
    this._wireLabel(control);
    this._wireDescription();
    this.requestUpdate('control');
  }

  /**
   * Nhãn trợ năng: nhãn của item nằm trong shadow nên không gắn <label for> vào control được.
   * - Nhóm (radio/checkbox group) có role trên chính thẻ → aria-label trên host
   * - Control khác → aria-label trên phần tử focus bên trong (validationAnchor), trừ khi control tự có nhãn
   */
  _wireLabel(control) {
    const text = this.label;
    let target = control;
    if (!control._internals?.role) {
      if (control.label || [...control.childNodes].some((n) => n.nodeType === 1 || n.textContent.trim())) return;
      target = control.validationAnchor?.();
    }
    if (!target) return;
    const ours = target._huiItemLabel === true;
    if (!ours && (target.hasAttribute('aria-label') || target.hasAttribute('aria-labelledby'))) return;
    if (text) {
      target.setAttribute('aria-label', text);
      target._huiItemLabel = true;
    } else if (ours) {
      target.removeAttribute('aria-label');
      target._huiItemLabel = false;
    }
  }

  /** aria-describedby (element reference) từ phần tử focus của control → dòng lỗi / gợi ý */
  async _wireDescription() {
    const control = this.control;
    if (!control) return;
    await control.updateComplete; // control tự đặt lại aria-describedby trong updated() → đợi xong rồi mới gắn
    const anchor = control.validationAnchor?.();
    if (!anchor || !('ariaDescribedByElements' in anchor)) return;
    // Control đang tự mô tả bằng id riêng (hint / error của chính nó) → không ghi đè
    if (anchor.getAttribute('aria-describedby')) return;
    if (this._feedback.textContent) {
      anchor.ariaDescribedByElements = [this._feedback];
      this._describedAnchor = anchor;
    } else if (this._describedAnchor === anchor) {
      anchor.ariaDescribedByElements = null;
      anchor.removeAttribute('aria-describedby');
      this._describedAnchor = null;
    }
  }

  _syncExtra() {
    const slotted = this._extraSlot.assignedNodes().length > 0;
    this._extra.hidden = !slotted && !this.extra;
  }

  // =====================================================
  // HIỂN THỊ LỖI / TRẠNG THÁI
  // =====================================================

  get _effectiveStatus() {
    if (this.status) return this.status;
    return this._error ? 'error' : '';
  }

  _syncFeedback() {
    if (!this._feedback) return;
    const status = this._effectiveStatus;
    const text = this._error || this.help || '';
    if (this._feedback.textContent !== text) this._feedback.textContent = text;
    this._feedback.hidden = !text;
    this._help.hidden = !text;
    if (status && status !== 'validating') this._feedback.setAttribute('data-status', status);
    else this._feedback.removeAttribute('data-status');
    this.setState('error', status === 'error');
    this.setState('warning', status === 'warning');
    this.setState('success', status === 'success');
    this.setState('validating', status === 'validating');

    // Viền màu của control theo trạng thái (chỉ đụng tới status do item tự đặt)
    const control = this.control;
    const tone = status === 'error' || status === 'warning' ? status : '';
    if (control) {
      if (tone && (this._ownsStatus || !control.status)) {
        control.status = tone;
        this._ownsStatus = true;
      } else if (!tone && this._ownsStatus) {
        control.status = '';
        this._ownsStatus = false;
      }
    }
    this._wireDescription();
  }

  _setError(message) {
    this._error = message || '';
    this._syncFeedback();
  }

  /** Lỗi hiện tại ('' = hợp lệ / chưa validate) */
  get errorMessage() {
    return this._error;
  }

  // =====================================================
  // VALIDATE — rule engine
  // =====================================================

  /** Gom luật: attribute trước (theo thứ tự required → type → min/max → length → pattern), rồi tới property rules */
  _collectRules() {
    const message = this.message || undefined;
    const rules = [];
    if (this.required) rules.push({ required: true, message });
    if (this.type) rules.push({ type: this.type, message });
    if (this.min != null || this.max != null) rules.push({ min: this.min ?? undefined, max: this.max ?? undefined, message });
    if (this.minlength != null || this.maxlength != null) {
      rules.push({ minlength: this.minlength ?? undefined, maxlength: this.maxlength ?? undefined, message });
    }
    if (this.pattern) rules.push({ pattern: this.pattern, message });
    return [...rules, ...(Array.isArray(this.rules) ? this.rules.filter(Boolean) : [])];
  }

  _requiredMessage(control, value) {
    if (control && hasChecked(control)) return t('form.requiredChecked');
    if (Array.isArray(value) || control?._internals?.role || control?.localName === 'hui-select') return t('form.requiredSelect');
    return t('form.required');
  }

  /**
   * Kiểm 1 luật → chuỗi lỗi hoặc ''. Thứ tự trong 1 luật: required → (bỏ qua nếu rỗng) type → min/max →
   * minlength/maxlength/len → pattern → validator (validator luôn chạy, kể cả khi rỗng — giống Ant).
   * min/max: với type="number" hoặc giá trị số → so sánh giá trị; mảng → số mục; chuỗi → độ dài.
   */
  async _checkRule(rule, value, values, control) {
    const empty = isEmptyValue(value);
    if (rule.required && empty) return rule.message || this._requiredMessage(control, value);

    if (!empty) {
      const isArr = Array.isArray(value);
      const str = isArr ? '' : String(value);
      const numeric = rule.type === 'number' || this.type === 'number' || typeof value === 'number';

      if (rule.type === 'email' || rule.type === 'url') {
        if (typeMismatch(rule.type, str)) return rule.message || t(rule.type === 'email' ? 'form.typeEmail' : 'form.typeUrl');
      } else if (rule.type === 'number' && (str.trim() === '' || !Number.isFinite(Number(str)))) {
        return rule.message || msg('typeNumber');
      }

      if (rule.min != null || rule.max != null) {
        if (numeric && !isArr) {
          const n = Number(str);
          if (rule.min != null && n < rule.min) return rule.message || t('form.rangeUnderflow', { min: rule.min });
          if (rule.max != null && n > rule.max) return rule.message || t('form.rangeOverflow', { max: rule.max });
        } else if (isArr) {
          if (rule.min != null && value.length < rule.min) return rule.message || msg('minItems', { min: rule.min });
          if (rule.max != null && value.length > rule.max) return rule.message || msg('maxItems', { max: rule.max });
        } else {
          if (rule.min != null && str.length < rule.min) return rule.message || t('form.tooShort', { min: rule.min });
          if (rule.max != null && str.length > rule.max) return rule.message || t('form.tooLong', { max: rule.max });
        }
      }

      const len = isArr ? value.length : str.length;
      const minLen = rule.minlength ?? rule.len;
      const maxLen = rule.maxlength ?? rule.len;
      if (minLen != null && len < minLen) return rule.message || t('form.tooShort', { min: minLen });
      if (maxLen != null && len > maxLen) return rule.message || t('form.tooLong', { max: maxLen });

      if (rule.pattern && !isArr) {
        const re = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(`^(?:${rule.pattern})$`, 'u');
        re.lastIndex = 0;
        if (!re.test(str)) return rule.message || t('form.patternMismatch');
      }
    }

    if (typeof rule.validator === 'function') {
      try {
        const result = await rule.validator(value, values);
        if (typeof result === 'string' && result) return result;
        if (result === false) return rule.message || t('form.patternMismatch');
      } catch (err) {
        return (err && err.message) || (typeof err === 'string' && err) || rule.message || t('form.patternMismatch');
      }
    }
    return '';
  }

  /**
   * Validate item: chạy luật của item → nếu hợp lệ thì xét ràng buộc riêng của control (required, minlength...
   * đặt trên chính control). Lỗi luật được ghi vào control qua setCustomValidity().
   * Gọi liên tiếp (gõ nhanh + validator async): chỉ kết quả của lượt gọi MỚI NHẤT được áp dụng.
   * @returns {Promise<{name: string, message: string, valid: boolean, element: HTMLElement|null}>}
   */
  validate() {
    this._pending = this._runValidate(++this._token);
    return this._pending;
  }

  async _runValidate(token) {
    const control = this.control;
    const name = this.fieldName;
    if (!control || control.isDisabled) {
      this._setError('');
      return { name, message: '', valid: true, element: control };
    }
    this._touched = true;
    control.setCustomValidity('');
    const value = readValue(control);
    const values = this._hostForm?.getValues?.() ?? {};
    const rules = this._collectRules();
    const hasAsync = rules.some((r) => typeof r.validator === 'function');
    if (hasAsync && !this.status) this.setState('validating', true);

    let message = '';
    for (const rule of rules) {
      message = await this._checkRule(rule, value, values, control);
      if (token !== this._token) return this._pending; // đã có lượt validate mới hơn
      if (message) break;
    }
    this.setState('validating', false);

    if (message) control.setCustomValidity(message);
    else message = control.errorMessage; // ràng buộc riêng của control
    control.markInteracted();
    this._setError(message);
    return { name, message, valid: !message, element: control };
  }

  /** Xóa lỗi + trạng thái đã chạm (form.reset() gọi) */
  reset() {
    ++this._token;
    this._touched = false;
    this.control?.setCustomValidity('');
    this._setError('');
  }

  _onControlEvent(e, isChange) {
    const control = this.control;
    if (!control || !e.composedPath().includes(control)) return;
    // Ant: validate khi giá trị đổi. Ô chữ: 'change' (rời ô) lần đầu đánh dấu đã chạm, sau đó validate khi gõ
    if (isChange) {
      this._touched = true;
      this.validate();
    } else if (this._touched || this._error) {
      this.validate();
    }
  }

  get _dependencyList() {
    return this.dependencies.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

defineElement('hui-form-item', HuiFormItem);

export default HuiFormItem;
