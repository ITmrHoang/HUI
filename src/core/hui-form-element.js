/**
 * HuiFormElement — lớp nền cho mọi control nhập liệu (input, select, radio, slider, date-picker...).
 * Kế thừa HuiElement, bổ sung:
 * - Property chung: name, value, disabled, readonly, required, status (error|warning), size
 * - Tham gia <form> native: FormData, submit, reset, <fieldset disabled>, khôi phục khi Back
 * - Validate theo ràng buộc (required/minlength/maxlength/min/max/pattern) + setCustomValidity()
 * - Custom state cho CSS: :state(invalid), :state(user-invalid) (chỉ sau khi người dùng đã tương tác),
 *   :state(filled) (đã có giá trị)
 *
 * Lớp con cần:
 *   - Gọi this.markInteracted() khi blur/change (để user-invalid chỉ hiện sau khi người dùng chạm vào)
 *   - Override validationAnchor() → phần tử bên trong nhận bong bóng lỗi của trình duyệt
 *   - (tùy chọn) override formValue() nếu giá trị gửi lên form khác `value` (vd: mảng → FormData)
 *   - (tùy chọn) override checkConstraints() để thêm luật riêng (vd: input-number kiểm min/max)
 *   - Dùng relayNativeEvents(innerInput) để chuyển sự kiện input/change của thẻ native ra ngoài
 */

import { HuiElement } from './hui-element.js';
import { t } from './locale.js';

/** Property ảnh hưởng tới giá trị gửi form hoặc kết quả validate */
const FORM_KEYS = new Set([
  'value', 'checked', 'required', 'minlength', 'maxlength', 'pattern', 'min', 'max', 'disabled', 'locale',
]);

export class HuiFormElement extends HuiElement {
  static formAssociated = true;
  static localized = true;

  static properties = {
    /** Tên trường khi gửi form (FormData) */
    name: { type: String },
    // Không reflect: attribute value = giá trị BAN ĐẦU (dùng khi reset form), giống <input> native
    /** Giá trị hiện tại (attribute value = giá trị ban đầu khi reset form) */
    value: { type: String, default: '', reflect: false },
    /** Vô hiệu hóa (không gửi form, không validate) */
    disabled: { type: Boolean },
    /** Chỉ đọc — vẫn gửi form nhưng không sửa được */
    readonly: { type: Boolean },
    /** Bắt buộc có giá trị */
    required: { type: Boolean },
    /** '' | error | warning — trạng thái hiển thị (viền đỏ/vàng), độc lập với validate */
    status: { type: String, default: '' },
    /** sm | md | lg — bỏ trống thì lấy theo <hui-form size> chứa nó, mặc định md */
    size: { type: String, default: '' },
    /** Độ dài tối thiểu */
    minlength: { type: Number },
    /** Độ dài tối đa */
    maxlength: { type: Number },
    /** Biểu thức chính quy giá trị phải khớp (toàn chuỗi) */
    pattern: { type: String },
  };

  constructor() {
    super();
    this._defaultValue = null;
    this._customError = '';
    this._interacted = false;
  }

  connectedCallback() {
    // Ghi nhớ giá trị ban đầu để form.reset() đưa về đúng giá trị này
    if (this._defaultValue === null) this._defaultValue = this.getAttribute('value') ?? '';
    super.connectedCallback();
  }

  /** Kích thước thực tế: tự đặt > <hui-form size> / <hui-config-provider size> gần nhất > md */
  get effectiveSize() {
    return this.size || this.closest('hui-form[size], hui-config-provider[size]')?.getAttribute('size') || 'md';
  }

  /**
   * Đồng bộ giá trị form + validity NGAY khi property đổi (không chờ microtask như updated()),
   * vì code ngoài thường đọc liền: `el.value = 'x'; new FormData(form)` / `el.checkValidity()`
   * — giống hành vi của <input> native.
   */
  requestUpdate(name, oldValue) {
    super.requestUpdate(name, oldValue);
    if (this._hasRendered && FORM_KEYS.has(name)) this._syncForm();
  }

  /** Lớp con gọi super.updated(changed) — lần render đầu cần đồng bộ form */
  updated(changed) {
    if (changed.has('value')) this._syncForm();
  }

  _syncForm() {
    this.setFormValue(this.formValue(), this._isEmpty() ? null : this.value);
    this.setState('filled', !this._isEmpty());
    this._syncValidity();
  }

  // =====================================================
  // GIÁ TRỊ
  // =====================================================

  /** Giá trị gửi lên form. Rỗng → null (không gửi), giống <input> bị disabled/không tên */
  formValue() {
    return this._isEmpty() ? null : String(this.value);
  }

  _isEmpty() {
    const v = this.value;
    return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
  }

  // =====================================================
  // VALIDATE
  // =====================================================

  /** Phần tử nhận bong bóng lỗi của trình duyệt (lớp con trả về <input> bên trong) */
  validationAnchor() {
    return undefined;
  }

  /**
   * Kiểm tra các ràng buộc. Trả về { flags, message } giống ValidityState.
   * Lớp con override + gọi super để thêm luật.
   */
  checkConstraints() {
    if (this.isDisabled) return null; // Control bị disabled không validate (giống native)
    const value = this.value == null ? '' : String(this.value);
    const len = Array.isArray(this.value) ? this.value.length : value.length;

    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.required') };
    if (!this._isEmpty()) {
      if (this.minlength != null && len < this.minlength) {
        return { flags: { tooShort: true }, message: t('form.tooShort', { min: this.minlength }) };
      }
      if (this.maxlength != null && len > this.maxlength) {
        return { flags: { tooLong: true }, message: t('form.tooLong', { max: this.maxlength }) };
      }
      if (this.pattern && !new RegExp(`^(?:${this.pattern})$`, 'u').test(value)) {
        return { flags: { patternMismatch: true }, message: t('form.patternMismatch') };
      }
    }
    return null;
  }

  /** Đặt lỗi tùy chỉnh (giống <input>.setCustomValidity). Chuỗi rỗng = hết lỗi */
  setCustomValidity(message) {
    this._customError = message || '';
    this._syncValidity();
  }

  _syncValidity() {
    const internals = this._formInternals;
    let error = this._customError ? { flags: { customError: true }, message: this._customError } : this.checkConstraints();
    if (internals) {
      if (error) internals.setValidity(error.flags, error.message, this.validationAnchor());
      else internals.setValidity({});
    }
    this.setState('invalid', Boolean(error));
    this.setState('user-invalid', Boolean(error) && this._interacted);
    return error;
  }

  /** Lỗi hiện tại (chuỗi) hoặc '' — tiện cho hui-form-item hiển thị dưới ô nhập */
  get errorMessage() {
    return this._syncValidity()?.message || '';
  }

  /** Đánh dấu người dùng đã tương tác (blur / change) → bật :state(user-invalid) nếu đang lỗi */
  markInteracted() {
    if (this._interacted) return;
    this._interacted = true;
    this._syncValidity();
  }

  // =====================================================
  // SỰ KIỆN
  // =====================================================

  /**
   * Chuyển sự kiện của thẻ native bên trong ra ngoài host:
   * - `input` của native vốn đã composed (tự xuyên Shadow DOM) → chặn bản gốc, phát lại kèm detail
   *   để người dùng chỉ nhận ĐÚNG 1 sự kiện.
   * - `change` native KHÔNG composed (bị kẹt trong shadow) → phải phát lại thì ngoài mới nghe được.
   * `read` lấy giá trị mới từ thẻ native (mặc định: inner.value).
   */
  relayNativeEvents(inner, read = (el) => el.value) {
    inner.addEventListener('input', (e) => {
      e.stopPropagation();
      this.value = read(inner);
      this.emit('input', { value: this.value });
    });
    inner.addEventListener('change', () => {
      this.value = read(inner);
      this.markInteracted();
      this.emit('change', { value: this.value });
    });
    inner.addEventListener('blur', () => this.markInteracted());
  }

  // =====================================================
  // FORM CALLBACKS
  // =====================================================

  formResetCallback() {
    this.value = this._defaultValue;
    this._interacted = false;
    this._customError = '';
    this._syncValidity();
  }

  /** Trình duyệt khôi phục giá trị (Back/Forward, autofill) */
  formStateRestoreCallback(state) {
    if (state != null) this.value = state;
  }
}

export default HuiFormElement;
