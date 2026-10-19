/**
 * HUI Textarea — Ô nhập nhiều dòng (Ant Input.TextArea + MUI TextField multiline), tham gia <form> native
 * autosize: tự cao theo nội dung trong khoảng min-rows … max-rows. Parts / biến CSS: xem JSDoc class.
 */

import styles from './hui-textarea.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { createElement } from '../../utils/dom.js';

const VARIANTS = ['outlined', 'filled', 'borderless'];
const RESIZES = ['none', 'vertical', 'both'];

/**
 * Ô nhập liệu nhiều dòng, tham gia <form> native.
 * @fires input - Khi gõ chữ, detail: { value }
 * @fires change - Khi giá trị đã đổi và rời ô nhập, detail: { value }
 * @csspart base - Khung ngoài cùng (label + ô + chân)
 * @csspart label - Nhãn
 * @csspart textarea - Thẻ <textarea> native (cũng là khung viền)
 * @csspart footer - Hàng dưới ô: thông báo + bộ đếm
 * @csspart message - Dòng thông báo lỗi / thành công / gợi ý
 * @csspart count - Bộ đếm ký tự (show-count)
 * @cssprop --hui-textarea-padding - Khoảng đệm trong ô
 * @cssprop --hui-textarea-font-size - Cỡ chữ
 * @cssprop --hui-textarea-line-height - Chiều cao dòng
 * @cssprop --hui-textarea-radius - Bo góc
 * @cssprop --hui-textarea-bg - Màu nền
 * @cssprop --hui-textarea-filled-bg - Màu nền variant filled
 * @cssprop --hui-textarea-color - Màu chữ
 * @cssprop --hui-textarea-placeholder-color - Màu placeholder
 * @cssprop --hui-textarea-border-color - Màu viền
 * @cssprop --hui-textarea-hover-border-color - Màu viền khi hover
 * @cssprop --hui-textarea-focus-border-color - Màu viền khi focus
 * @cssprop --hui-textarea-focus-shadow - Vòng sáng khi focus
 * @cssprop --hui-textarea-label-color - Màu nhãn
 * @cssprop --hui-textarea-label-font-size - Cỡ chữ nhãn
 * @cssprop --hui-textarea-count-color - Màu chữ bộ đếm
 */
class HuiTextarea extends HuiFormElement {
  static properties = {
    /** Nhãn của ô nhập */
    label: { type: String, default: '' },
    /** top | inline — vị trí nhãn */
    labelPosition: { type: String, default: 'top' },
    /** Chữ gợi ý khi ô trống */
    placeholder: { type: String, default: '' },
    /** Thông báo lỗi (viền đỏ) — ưu tiên hơn success / hint */
    error: { type: String, default: '' },
    /** Thông báo thành công (viền xanh) */
    success: { type: String, default: '' },
    /** Gợi ý nhỏ phía dưới */
    hint: { type: String, default: '' },
    /** Số dòng hiển thị (khi không bật autosize) */
    rows: { type: Number, default: 3 },
    /** Tự cao theo nội dung (giới hạn bởi min-rows / max-rows) */
    autosize: { type: Boolean },
    /** autosize: số dòng tối thiểu (mặc định 1) */
    minRows: { type: Number },
    /** autosize: số dòng tối đa — vượt quá thì hiện thanh cuộn */
    maxRows: { type: Number },
    /** Hiện bộ đếm ký tự dưới ô ("12" hoặc "12 / 200" khi có maxlength) */
    showCount: { type: Boolean },
    /** none | vertical | both — cho phép kéo đổi kích thước (autosize luôn là none) */
    resize: { type: String, default: 'vertical' },
    /** outlined | filled | borderless — kiểu khung viền */
    variant: { type: String, default: 'outlined' },
  };

  static styles = styles;

  render() {
    this._label = createElement('label', { className: 'hui-textarea__label', part: 'label', for: 'textarea' });

    this._textarea = createElement('textarea', { className: 'hui-textarea__field', part: 'textarea', id: 'textarea' });
    this.relayNativeEvents(this._textarea);
    this._textarea.addEventListener('input', () => {
      this._syncCount();
      this._autoResize();
    });

    this._message = createElement('div', { className: 'hui-textarea__message', part: 'message', id: 'message' });
    this._count = createElement('span', { className: 'hui-textarea__count', part: 'count', 'aria-hidden': 'true' });
    this._footer = createElement('div', { className: 'hui-textarea__footer', part: 'footer' }, this._message, this._count);
    this._group = createElement('div', { className: 'hui-textarea__group' }, this._textarea, this._footer);
    this._wrapper = createElement('div', { className: 'hui-textarea', part: 'base' }, this._label, this._group);

    // Đổi bề ngang (cha co giãn) → số dòng xuống hàng đổi → đo lại chiều cao
    this._lastWidth = 0;
    this._ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      const w = this._textarea.clientWidth;
      if (w !== this._lastWidth) {
        this._lastWidth = w;
        this._autoResize();
      }
    }) : null;
    return this._wrapper;
  }

  connectedCallback() {
    super.connectedCallback();
    this._ro?.observe(this._textarea);
    this._autoResize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
  }

  updated(changed) {
    const ta = this._textarea;

    if (changed.has('value')) {
      const v = this.value == null ? '' : String(this.value);
      if (ta.value !== v) ta.value = v;
    }
    if (changed.has('placeholder')) ta.placeholder = this.placeholder || '';
    if (changed.has('name')) ta.name = this.name || '';
    if (changed.has('readonly')) ta.readOnly = this.readonly;
    if (changed.has('disabled')) ta.disabled = this.isDisabled;
    if (changed.has('maxlength')) {
      if (this.maxlength != null) ta.maxLength = this.maxlength;
      else ta.removeAttribute('maxlength');
    }
    if (changed.has('required')) {
      ta.toggleAttribute('aria-required', this.required);
      this._label.classList.toggle('hui-textarea__label--required', this.required);
    }
    if (changed.has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
    }
    if (['error', 'success', 'hint', 'status'].some((k) => changed.has(k))) this._syncMessage();

    this._syncClasses();
    this._syncCount();
    if (['value', 'rows', 'autosize', 'minRows', 'maxRows', 'size'].some((k) => changed.has(k))) this._autoResize();
    super.updated(changed);
  }

  /**
   * autosize: đặt rows=1 + height:auto để đo scrollHeight (chiều cao thật của nội dung),
   * rồi kẹp trong [min-rows, max-rows] theo line-height đã tính.
   */
  _autoResize() {
    const ta = this._textarea;
    if (!ta) return;
    if (!this.autosize) {
      ta.rows = Math.max(1, this.rows || 3);
      ta.style.height = '';
      ta.style.overflowY = '';
      return;
    }
    if (!this.isConnected) return;

    const cs = getComputedStyle(ta);
    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5 || 20;
    const extra = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
      + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const minH = Math.max(1, this.minRows || 1) * lineHeight + extra;
    const maxH = this.maxRows ? Math.max(this.maxRows, this.minRows || 1) * lineHeight + extra : Infinity;

    const scrollTop = ta.scrollTop;
    ta.rows = 1;
    ta.style.height = 'auto';
    const content = ta.scrollHeight + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const height = Math.min(Math.max(content, minH), maxH);
    ta.style.height = `${height}px`;
    ta.style.overflowY = content > maxH ? 'auto' : 'hidden';
    ta.scrollTop = scrollTop;
  }

  _syncCount() {
    this._count.hidden = !this.showCount;
    if (!this.showCount) return;
    const len = this._textarea.value.length;
    const max = this.maxlength;
    this._count.textContent = max != null ? `${len} / ${max}` : String(len);
    this._count.classList.toggle('hui-textarea__count--exceed', max != null && len > max);
  }

  _syncMessage() {
    const text = this.error || this.success || this.hint || '';
    const kind = this.error ? 'error' : this.success ? 'success' : 'hint';
    this._message.textContent = text;
    this._message.className = `hui-textarea__message hui-textarea__message--${kind}`;
    if (text) this._textarea.setAttribute('aria-describedby', 'message');
    else this._textarea.removeAttribute('aria-describedby');
    if (this.error || this.status === 'error') this._textarea.setAttribute('aria-invalid', 'true');
    else this._textarea.removeAttribute('aria-invalid');
  }

  _syncClasses() {
    const tone = this.error || this.status === 'error' ? 'error'
      : this.status === 'warning' ? 'warning'
        : this.success ? 'success' : '';
    const variant = VARIANTS.includes(this.variant) ? this.variant : 'outlined';
    const resize = this.autosize ? 'none' : RESIZES.includes(this.resize) ? this.resize : 'vertical';

    this._wrapper.className = [
      'hui-textarea',
      `hui-textarea--${this.effectiveSize}`,
      `hui-textarea--${variant}`,
      `hui-textarea--resize-${resize}`,
      this.labelPosition === 'inline' ? 'hui-textarea--label-inline' : '',
      tone ? `hui-textarea--${tone}` : '',
      this.isDisabled ? 'hui-textarea--disabled' : '',
    ].filter(Boolean).join(' ');
    // Footer chỉ chiếm chỗ khi có nội dung
    this._footer.hidden = !this.showCount && !(this.error || this.success || this.hint);
    this.setState('disabled', this.isDisabled);
  }

  validationAnchor() {
    return this._textarea;
  }

  /** Đưa focus vào <textarea> thật bên trong */
  focus(options) {
    if (this._textarea) this._textarea.focus(options);
    else super.focus(options);
  }

  blur() {
    this._textarea?.blur();
  }

  select() {
    this._textarea?.select();
  }
}

defineElement('hui-textarea', HuiTextarea);

export default HuiTextarea;
