/**
 * HUI InputNumber — Ô nhập số (Ant InputNumber), tham gia <form> native qua HuiFormElement
 * value là Number (null khi trống). formatter/parser là property hàm → hiển thị "1,000 ₫" mà value vẫn = 1000.
 * Parts / biến CSS: xem JSDoc class.
 */

import styles from './hui-input-number.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/index.js';

const VARIANTS = ['outlined', 'filled', 'borderless'];

/** Chuỗi locale chưa có trong locale.js → dùng chuỗi dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  'inputNumber.increase': { vi: 'Tăng giá trị', en: 'Increase value' },
  'inputNumber.decrease': { vi: 'Giảm giá trị', en: 'Decrease value' },
};
const msg = (key) => {
  const v = t(key);
  return v !== key ? v : FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

/** Giá trị bất kỳ → số hữu hạn hoặc null */
function toNumber(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Số chữ số thập phân của một số (0.25 → 2, 1e-7 → 7) */
function decimals(n) {
  if (n == null || !Number.isFinite(n)) return 0;
  const s = String(n);
  if (s.includes('e-')) return Number(s.split('e-')[1]) || 0;
  return (s.split('.')[1] || '').length;
}

const REPEAT_DELAY = 500;
const REPEAT_INTERVAL = 80;

/**
 * Ô nhập số có nút tăng/giảm, phím ↑/↓, formatter/parser, min/max/step/precision.
 * @fires input - Giá trị số đổi (gõ hợp lệ, bấm nút, phím mũi tên), detail: { value }
 * @fires change - Giá trị đã chốt: rời ô / Enter / bấm nút / phím mũi tên, detail: { value }
 * @slot prefix - Nội dung trước ô nhập, trong khung viền (vd: "$")
 * @slot suffix - Nội dung sau ô nhập, trước nút tăng/giảm (vd: "kg")
 * @csspart base - Khung ngoài cùng (label + ô + thông báo)
 * @csspart label - Nhãn
 * @csspart container - Khung viền
 * @csspart input - Thẻ <input> native (role="spinbutton")
 * @csspart prefix - Vùng slot prefix
 * @csspart suffix - Vùng slot suffix
 * @csspart controls - Cột chứa 2 nút tăng/giảm
 * @csspart increment - Nút tăng
 * @csspart decrement - Nút giảm
 * @csspart message - Dòng thông báo lỗi / thành công / gợi ý
 * @cssprop --hui-input-number-height - Chiều cao khung
 * @cssprop --hui-input-number-padding-x - Khoảng đệm ngang của ô nhập
 * @cssprop --hui-input-number-font-size - Cỡ chữ
 * @cssprop --hui-input-number-radius - Bo góc
 * @cssprop --hui-input-number-bg - Màu nền
 * @cssprop --hui-input-number-filled-bg - Màu nền variant filled
 * @cssprop --hui-input-number-color - Màu chữ
 * @cssprop --hui-input-number-placeholder-color - Màu placeholder
 * @cssprop --hui-input-number-border-color - Màu viền
 * @cssprop --hui-input-number-hover-border-color - Màu viền khi hover
 * @cssprop --hui-input-number-focus-border-color - Màu viền khi focus
 * @cssprop --hui-input-number-focus-shadow - Vòng sáng khi focus
 * @cssprop --hui-input-number-label-color - Màu nhãn
 * @cssprop --hui-input-number-affix-color - Màu prefix / suffix
 * @cssprop --hui-input-number-controls-width - Bề ngang cột nút tăng/giảm
 * @cssprop --hui-input-number-controls-color - Màu icon nút tăng/giảm
 * @cssprop --hui-input-number-controls-hover-bg - Nền nút tăng/giảm khi hover
 */
class HuiInputNumber extends HuiFormElement {
  static properties = {
    /** Giá trị số hiện tại (null khi trống); attribute value = giá trị ban đầu khi reset form */
    value: { type: Number, default: null, reflect: false },
    /** Giá trị nhỏ nhất (nút/phím không vượt qua; gõ tay nhỏ hơn → rangeUnderflow) */
    min: { type: Number },
    /** Giá trị lớn nhất (nút/phím không vượt qua; gõ tay lớn hơn → rangeOverflow) */
    max: { type: Number },
    /** Bước nhảy của nút tăng/giảm và phím ↑/↓ (Shift = ×10) */
    step: { type: Number, default: 1 },
    /** Số chữ số thập phân — làm tròn value khi chốt và khi hiển thị */
    precision: { type: Number },
    /** Hiện nút tăng/giảm — đặt controls="false" để ẩn */
    controls: { type: String, default: 'true' },
    /** Hàm định dạng hiển thị: (text, value) => string — vd thêm dấu phân cách nghìn, "₫" */
    formatter: { type: Object, attribute: false },
    /** Hàm đọc ngược chữ người dùng gõ: (text) => string | number — vd bỏ dấu phẩy, "₫" */
    parser: { type: Object, attribute: false },
    /** Nhãn của ô nhập */
    label: { type: String, default: '' },
    /** Chữ gợi ý khi ô trống */
    placeholder: { type: String, default: '' },
    /** Thông báo lỗi (viền đỏ) — ưu tiên hơn success / hint */
    error: { type: String, default: '' },
    /** Thông báo thành công (viền xanh) */
    success: { type: String, default: '' },
    /** Gợi ý nhỏ phía dưới */
    hint: { type: String, default: '' },
    /** outlined | filled | borderless — kiểu khung viền */
    variant: { type: String, default: 'outlined' },
  };

  static styles = styles;

  constructor() {
    super();
    this._focusValue = null;
    this._repeatTimer = null;
    this._pointerStepped = false;
  }

  /** Luôn là số hữu hạn hoặc null */
  get value() {
    const v = this._getProp('value');
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
  set value(v) {
    this._setProp('value', toNumber(v));
  }

  /** controls="false" / controls = false → ẩn nút tăng/giảm */
  get controls() {
    const v = this._getProp('controls');
    return v !== false && v !== 'false';
  }
  set controls(v) {
    this._setProp('controls', v === false || v === 'false' ? 'false' : 'true');
  }

  render() {
    this._label = createElement('label', { className: 'hui-input-number__label', part: 'label', for: 'input' });

    this._input = createElement('input', {
      className: 'hui-input-number__field', part: 'input', id: 'input',
      type: 'text', inputmode: 'decimal', autocomplete: 'off', role: 'spinbutton',
    });
    this._input.addEventListener('input', (e) => this._onInput(e));
    this._input.addEventListener('change', (e) => e.stopPropagation()); // change tự phát khi chốt
    this._input.addEventListener('keydown', (e) => this._onKeydown(e));
    this._input.addEventListener('focus', () => { this._focusValue = this.value; });
    this._input.addEventListener('blur', () => {
      this._commit();
      this.markInteracted();
    });

    this._prefixSlot = createElement('slot', { name: 'prefix' });
    this._suffixSlot = createElement('slot', { name: 'suffix' });
    this._prefix = createElement('span', { className: 'hui-input-number__prefix', part: 'prefix' }, this._prefixSlot);
    this._suffix = createElement('span', { className: 'hui-input-number__suffix', part: 'suffix' }, this._suffixSlot);
    this._prefixSlot.addEventListener('slotchange', () => this._syncAffixes());
    this._suffixSlot.addEventListener('slotchange', () => this._syncAffixes());

    this._upBtn = this._createStepButton(1, 'chevron-up', 'increment');
    this._downBtn = this._createStepButton(-1, 'chevron-down', 'decrement');
    this._controlsBox = createElement('span', { className: 'hui-input-number__controls', part: 'controls' },
      this._upBtn, this._downBtn);

    this._container = createElement('div', { className: 'hui-input-number__container', part: 'container' },
      this._prefix, this._input, this._suffix, this._controlsBox);

    this._message = createElement('div', { className: 'hui-input-number__message', part: 'message', id: 'message' });
    this._wrapper = createElement('div', { className: 'hui-input-number', part: 'base' },
      this._label, this._container, this._message);
    return this._wrapper;
  }

  /** Nút tăng/giảm: nhấn giữ để lặp; không nhận focus (bàn phím dùng ↑/↓ trong ô) */
  _createStepButton(dir, icon, part) {
    const btn = createElement('button', {
      className: `hui-input-number__step hui-input-number__step--${part}`, part, type: 'button', tabindex: '-1',
    }, createElement('hui-icon', { name: icon }));
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault(); // giữ focus trong ô nhập
      this._pointerStepped = true;
      if (!this._isFocused) this._input.focus({ preventScroll: true });
      this._step(dir);
      this._stopRepeat();
      this._repeatTimer = setTimeout(() => {
        this._repeatTimer = setInterval(() => this._step(dir), REPEAT_INTERVAL);
      }, REPEAT_DELAY);
    });
    for (const type of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(type, () => this._stopRepeat());
    // click không kèm pointerdown (trình đọc màn hình, .click() trong code) vẫn tăng/giảm
    btn.addEventListener('click', () => {
      if (!this._pointerStepped) this._step(dir);
      this._pointerStepped = false;
    });
    return btn;
  }

  _stopRepeat() {
    clearTimeout(this._repeatTimer);
    clearInterval(this._repeatTimer);
    this._repeatTimer = null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopRepeat();
  }

  updated(changed) {
    const input = this._input;

    // Chữ trong ô đã biểu diễn đúng value (người dùng đang gõ "1." hay "1,0") thì giữ nguyên → không nhảy con trỏ
    if (['value', 'precision', 'formatter', 'parser'].some((k) => changed.has(k))) {
      const keep = this._isFocused && !changed.has('formatter') && !changed.has('precision')
        && this._parse(input.value) === this.value;
      if (!keep) this._renderText();
    }
    if (changed.has('placeholder')) input.placeholder = this.placeholder || '';
    if (changed.has('name')) input.name = this.name || '';
    if (changed.has('readonly')) input.readOnly = this.readonly;
    if (changed.has('disabled')) input.disabled = this.isDisabled;
    if (changed.has('required')) {
      input.toggleAttribute('aria-required', this.required);
      this._label.classList.toggle('hui-input-number__label--required', this.required);
    }
    if (changed.has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
    }
    if (['error', 'success', 'hint', 'status'].some((k) => changed.has(k))) this._syncMessage();
    if (changed.has('locale')) {
      this._upBtn.setAttribute('aria-label', msg('inputNumber.increase'));
      this._downBtn.setAttribute('aria-label', msg('inputNumber.decrease'));
    }
    this._syncAria();
    this._syncClasses();
    super.updated(changed);
  }

  firstUpdated() {
    this._syncAffixes();
  }

  get _isFocused() {
    return this.shadowRoot.activeElement === this._input;
  }

  // =====================================================
  // ĐỊNH DẠNG ↔ ĐỌC NGƯỢC
  // =====================================================

  /** Số → chuỗi đã làm tròn theo precision (chưa qua formatter) */
  _toFixedText(n) {
    if (n == null) return '';
    return this.precision != null && this.precision >= 0 ? n.toFixed(this.precision) : String(n);
  }

  _formatText(n) {
    if (n == null) return '';
    const text = this._toFixedText(n);
    return typeof this.formatter === 'function' ? String(this.formatter(text, n) ?? '') : text;
  }

  /** Chữ → số | null (trống) | NaN (không hợp lệ) */
  _parse(text) {
    const raw = typeof this.parser === 'function' ? this.parser(String(text)) : String(text).replace(/\s/g, '');
    if (raw === null || raw === undefined || String(raw).trim() === '') return null;
    const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
    return Number.isFinite(n) ? n : NaN;
  }

  _renderText() {
    const text = this._formatText(this.value);
    if (this._input.value !== text) this._input.value = text;
  }

  _round(n, extraDecimals = 0) {
    const p = this.precision != null && this.precision >= 0
      ? this.precision
      : Math.max(decimals(this.step), extraDecimals);
    return Number(n.toFixed(Math.min(p, 20)));
  }

  _clamp(n) {
    if (this.min != null && n < this.min) n = this.min;
    if (this.max != null && n > this.max) n = this.max;
    return n;
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  /** Gõ phím: chữ đọc được thành số → cập nhật value; không hợp lệ ("-", "abc") → giữ value cũ */
  _onInput(e) {
    e.stopPropagation();
    const n = this._parse(this._input.value);
    if (Number.isNaN(n)) return;
    if (n === this.value) return;
    this.value = n;
    this.emit('input', { value: this.value });
  }

  _onKeydown(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this._step(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey ? 10 : 1);
    } else if (e.key === 'Enter') {
      this._commit();
    }
  }

  /** Chốt chữ đang gõ: không hợp lệ → trả lại giá trị cũ; làm tròn theo precision; phát change nếu đổi */
  _commit() {
    let n = this._parse(this._input.value);
    if (Number.isNaN(n)) n = this.value;
    if (n !== null && this.precision != null && this.precision >= 0) n = this._round(n);
    const changedByCommit = n !== this.value;
    if (changedByCommit) this.value = n;
    this._renderText();
    if (changedByCommit) this.emit('input', { value: this.value });
    if (this.value !== this._focusValue) {
      this._focusValue = this.value;
      this.emit('change', { value: this.value });
    }
  }

  /**
   * Tăng/giảm `dir` bước (× multiplier). Trống → tính từ 0. Luôn kẹp trong [min, max].
   * Chữ đang gõ dở được đọc trước để bước tiếp từ đúng số người dùng thấy.
   */
  _step(dir, multiplier = 1) {
    if (this.isDisabled || this.readonly) return;
    const typed = this._parse(this._input.value);
    const current = Number.isNaN(typed) ? this.value : typed;
    const step = Math.abs(this.step) || 1;

    let next;
    if (current === null) next = this._clamp(this._round(dir * step * multiplier));
    else next = this._clamp(this._round(current + dir * step * multiplier, decimals(current)));

    if (next === this.value && this._formatText(next) === this._input.value) return;
    this.value = next;
    this._renderText();
    this._focusValue = this.value;
    this.emit('input', { value: this.value });
    this.emit('change', { value: this.value });
  }

  // =====================================================
  // ĐỒNG BỘ GIAO DIỆN
  // =====================================================

  _syncAria() {
    const input = this._input;
    const set = (name, v) => (v == null ? input.removeAttribute(name) : input.setAttribute(name, String(v)));
    set('aria-valuenow', this.value);
    set('aria-valuemin', this.min);
    set('aria-valuemax', this.max);
    set('aria-valuetext', this.value == null ? null : this._formatText(this.value));

    const v = this.value;
    const atMax = v != null && this.max != null && v >= this.max;
    const atMin = v != null && this.min != null && v <= this.min;
    const locked = this.isDisabled || this.readonly;
    this._upBtn.disabled = locked || atMax;
    this._downBtn.disabled = locked || atMin;
    this._controlsBox.hidden = !this.controls;
  }

  _syncAffixes() {
    this._prefix.hidden = !this._prefixSlot.assignedNodes().length;
    this._suffix.hidden = !this._suffixSlot.assignedNodes().length;
  }

  _syncMessage() {
    const text = this.error || this.success || this.hint || '';
    const kind = this.error ? 'error' : this.success ? 'success' : 'hint';
    this._message.textContent = text;
    this._message.hidden = !text;
    this._message.className = `hui-input-number__message hui-input-number__message--${kind}`;
    if (text) this._input.setAttribute('aria-describedby', 'message');
    else this._input.removeAttribute('aria-describedby');
    if (this.error || this.status === 'error') this._input.setAttribute('aria-invalid', 'true');
    else this._input.removeAttribute('aria-invalid');
  }

  _syncClasses() {
    const tone = this.error || this.status === 'error' ? 'error'
      : this.status === 'warning' ? 'warning'
        : this.success ? 'success' : '';
    const variant = VARIANTS.includes(this.variant) ? this.variant : 'outlined';
    this._wrapper.className = [
      'hui-input-number',
      `hui-input-number--${this.effectiveSize}`,
      `hui-input-number--${variant}`,
      tone ? `hui-input-number--${tone}` : '',
      this.isDisabled ? 'hui-input-number--disabled' : '',
    ].filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
  }

  // =====================================================
  // FORM
  // =====================================================

  formValue() {
    return this.value == null ? null : String(this.value);
  }

  /** Thêm luật min/max (giá trị gõ tay hoặc gán bằng code có thể nằm ngoài khoảng) */
  checkConstraints() {
    const error = super.checkConstraints();
    if (error || this.isDisabled) return error;
    const v = this.value;
    if (v == null) return null;
    if (this.min != null && v < this.min) {
      return { flags: { rangeUnderflow: true }, message: t('form.rangeUnderflow', { min: this.min }) };
    }
    if (this.max != null && v > this.max) {
      return { flags: { rangeOverflow: true }, message: t('form.rangeOverflow', { max: this.max }) };
    }
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

  select() {
    this._input?.select();
  }
}

defineElement('hui-input-number', HuiInputNumber);

export default HuiInputNumber;
