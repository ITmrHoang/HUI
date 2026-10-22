/**
 * HuiPickerBase — lớp nền dùng chung cho hui-date-picker / hui-range-picker / hui-time-picker:
 * ô nhập (1 hoặc 2 input) + icon + nút xóa, popup ở top-layer (utils/floating), Esc / click ngoài (utils/overlay),
 * bàn phím chung (↓ / Alt+↓ mở và đưa focus vào bảng, Enter xác nhận chữ gõ, Esc đóng), chế độ inline.
 *
 * Lớp con cài đặt:
 *   _renderInputs()  → { nodes: Node[], inputs: HTMLInputElement[] }
 *   _renderPopup()   → Node (nội dung popup)
 *   _onOpen()        đồng bộ bảng theo giá trị trước khi hiện
 *   _focusPanel()    đưa focus vào bảng (ô đang active)
 *   _commitPending() / _revertPending()  khi đóng popup (click ngoài/Tab = xác nhận, Esc = hủy)
 *   _onInputText(i) / _onInputEnter(i)   gõ chữ / Enter trong ô nhập
 *   _clearValue()    nút xóa
 *   _isEmpty()       (HuiFormElement)
 */

import baseStyles from './picker-base.css?raw';

import { HuiFormElement } from '../../core/hui-form-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import { autoUpdate, computePosition, floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { openOverlay } from '../../utils/overlay.js';
import '../hui-icon/index.js';
import { dmsg } from '../hui-calendar/calendar-panel.js';
import { parseISO } from '../hui-calendar/date-utils.js';

export { baseStyles, floatingCss };

const VARIANTS = ['outlined', 'filled', 'borderless'];

/** Giá trị preset: chuỗi ISO | Date | mảng [start, end] | hàm trả về một trong các dạng đó (tính lúc bấm) */
export function resolvePresetValue(v, weekStart) {
  const raw = typeof v === 'function' ? v() : v;
  if (Array.isArray(raw)) return raw.map((x) => parseISO(x, { weekStart }));
  return parseISO(raw, { weekStart });
}

export class HuiPickerBase extends HuiFormElement {
  static properties = {
    /** Chữ gợi ý khi ô trống (mặc định theo locale + loại picker) */
    placeholder: { type: String, default: '' },
    /** Mẫu hiển thị, vd DD/MM/YYYY, MM/YYYY, HH:mm (mặc định theo locale); giá trị form luôn là ISO */
    format: { type: String, default: '' },
    /** Giá trị nhỏ nhất chọn được (ISO) */
    min: { type: String, default: '' },
    /** Giá trị lớn nhất chọn được (ISO) */
    max: { type: String, default: '' },
    /** Thời điểm "hiện tại" ISO (mặc định giờ máy) — cố định cho test / demo */
    now: { type: String, default: '' },
    /** Hiện nút xóa khi có giá trị */
    clearable: { type: Boolean },
    /** Tên kiểu Ant của clearable */
    allowClear: { type: Boolean },
    /** outlined | filled | borderless — kiểu khung ô nhập */
    variant: { type: String, default: 'outlined' },
    /** Vị trí popup: bottom-start | bottom-end | top-start | top-end … (tự lật khi thiếu chỗ) */
    placement: { type: String, default: 'bottom-start' },
    /** Hiện bảng chọn ngay trong trang, không có ô nhập / popup */
    inline: { type: Boolean },
    /** Popup đang mở (gán để mở / đóng bằng code) */
    open: { type: Boolean },
    /** Nhãn trợ năng của ô nhập (aria-label) khi không nằm trong hui-form-item */
    label: { type: String, default: '' },
    /** Tắt hiệu ứng mở popup / trượt bảng */
    noAnimation: { type: Boolean },
  };

  /** Icon cuối ô nhập */
  static suffixIcon = 'calendar';

  constructor() {
    super();
    this._isOpen = false;
    this._overlay = null;
    this._stopAutoUpdate = null;
    this._popupToken = 0;
    this._side = 'bottom';
    this._activeIndex = 0;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    const { nodes, inputs } = this._renderInputs();
    this._inputs = inputs;
    inputs.forEach((input, i) => {
      input.classList.add('hui-picker__input');
      input.autocomplete = 'off';
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-haspopup', 'dialog');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-controls', 'popup');
      input.addEventListener('keydown', (e) => this._onInputKeydown(e, i));
      input.addEventListener('input', (e) => {
        e.stopPropagation(); // input của ô chữ không phải giá trị của picker
        this._activeIndex = i;
        this._onInputText(i);
      });
      input.addEventListener('change', (e) => e.stopPropagation());
      input.addEventListener('focus', () => {
        this._activeIndex = i;
        this._onInputFocus?.(i);
        this._syncClasses();
      });
      input.addEventListener('click', () => this._openPopup());
    });

    this._suffix = createElement('span', { className: 'hui-picker__suffix', part: 'suffix', 'aria-hidden': 'true' },
      createElement('hui-icon', { name: this.constructor.suffixIcon }));
    this._clearBtn = createElement('button', {
      className: 'hui-picker__clear', part: 'clear', type: 'button', tabindex: '-1',
    }, createElement('hui-icon', { name: 'error', 'aria-hidden': 'true' }));
    this._clearBtn.addEventListener('mousedown', (e) => e.preventDefault());
    this._clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isDisabled || this.readonly) return;
      this._clearValue();
      this.emit('clear');
      this._activeInput()?.focus({ preventScroll: true });
    });

    this._selector = createElement('div', { className: 'hui-picker__selector', part: 'trigger' },
      ...nodes, this._suffix, this._clearBtn);
    // Bấm vào khung (ngoài input) → focus input đầu, không làm mất focus
    this._selector.addEventListener('mousedown', (e) => {
      if (e.target.closest?.('input')) return;
      e.preventDefault();
      if (e.target.closest?.('.hui-picker__clear')) return;
      if (this.isDisabled) return;
      this._activeInput()?.focus({ preventScroll: true });
      this._openPopup();
    });

    this._popup = createElement('div', { className: 'hui-floating hui-picker__popup', part: 'popup', id: 'popup', hidden: true },
      this._renderPopup());

    // Focus rời hẳn component (Tab ra ngoài) → xác nhận chữ gõ / giá trị tạm rồi đóng
    this.shadowRoot.addEventListener('focusout', (e) => {
      const to = e.relatedTarget;
      if (!to || this.shadowRoot.contains(to) || to === this) return;
      if (this._isOpen) this._closePopup({ commit: true });
      else this._commitPending();
      this.markInteracted();
    });

    this._base = createElement('div', { className: 'hui-picker', part: 'base' }, this._selector, this._popup);
    return this._base;
  }

  updated(changed) {
    if (changed.has('locale') || changed.has('placeholder') || changed.has('label')) {
      this._clearBtn.setAttribute('aria-label', t('common.clear'));
      this._syncPlaceholders();
      this._inputs.forEach((input, i) => {
        const name = this._inputLabel(i);
        if (name) input.setAttribute('aria-label', name);
        else input.removeAttribute('aria-label');
      });
      this._popup.setAttribute('aria-label', this._dialogLabel());
    }
    if (changed.has('disabled') || changed.has('readonly')) {
      for (const input of this._inputs) {
        input.disabled = this.isDisabled;
        input.readOnly = this.readonly;
      }
      if (this.isDisabled || this.readonly) this._closePopup({ commit: false });
    }
    if (changed.has('required')) this._inputs.forEach((i) => i.toggleAttribute('aria-required', this.required));
    if (changed.has('status')) {
      this._inputs.forEach((i) => (this.status === 'error' ? i.setAttribute('aria-invalid', 'true') : i.removeAttribute('aria-invalid')));
    }
    if (changed.has('inline')) this._syncInline();
    if (changed.has('open') && !this.inline && this.open !== this._isOpen) {
      if (this.open) this._openPopup();
      else this._closePopup({ commit: false });
    }
    this._syncClasses();
    super.updated(changed);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._isOpen) {
      this._isOpen = false;
      this._overlay?.close();
      this._overlay = null;
    }
    this._stopAutoUpdate?.();
    this._stopAutoUpdate = null;
    if (this._popup && !this.inline) hideFloating(this._popup);
  }

  // =====================================================
  // HIỂN THỊ
  // =====================================================

  /** Nhãn trợ năng của input thứ i (mặc định: label) */
  _inputLabel() {
    return this.label;
  }

  _dialogLabel() {
    return dmsg('datePicker.dialog');
  }

  _syncPlaceholders() {}

  _syncInline() {
    const inline = this.inline;
    this._selector.hidden = inline;
    if (inline) {
      if (this._isOpen) this._closePopup({ commit: false });
      hideFloating(this._popup);
      this._popup.removeAttribute('popover');
      this._popup.classList.remove('hui-floating');
      this._popup.hidden = false;
      this._popup.setAttribute('role', 'group');
      this._onOpen();
    } else {
      this._popup.classList.add('hui-floating');
      this._popup.hidden = true;
      this._popup.setAttribute('role', 'dialog');
    }
  }

  _syncClasses() {
    const tone = this.status === 'error' ? 'error' : this.status === 'warning' ? 'warning' : '';
    const variant = VARIANTS.includes(this.variant) ? this.variant : 'outlined';
    this._base.className = [
      'hui-picker', `hui-picker--${this.effectiveSize}`, `hui-picker--${variant}`,
      tone && `hui-picker--${tone}`, this._isOpen && 'hui-picker--open', this.isDisabled && 'hui-picker--disabled',
      this.inline && 'hui-picker--inline', !this._isEmpty() && 'hui-picker--has-value', ...this._extraClasses(),
    ].filter(Boolean).join(' ');
    const canClear = (this.clearable || this.allowClear) && !this._isEmpty() && !this.isDisabled && !this.readonly;
    this._clearBtn.hidden = !canClear;
    this._inputs.forEach((input, i) => {
      input.setAttribute('aria-expanded', String(this._isOpen));
      input.classList.toggle('hui-picker__input--active', this._isOpen && i === this._activeIndex);
    });
    this.setState('open', this._isOpen);
    this.setState('disabled', this.isDisabled);
  }

  _extraClasses() {
    return [];
  }

  _animated() {
    return !this.noAnimation && !animationsDisabled();
  }

  _now() {
    return parseISO(this.now) || new Date();
  }

  _activeInput() {
    return this._inputs[this._activeIndex] || this._inputs[0];
  }

  // =====================================================
  // POPUP
  // =====================================================

  _openPopup({ focusPanel = false } = {}) {
    if (this.inline) {
      if (focusPanel) this._focusPanel();
      return;
    }
    if (this.isDisabled || this.readonly) return;
    if (this._isOpen) {
      if (focusPanel) this._focusPanel();
      return;
    }
    this._isOpen = true;
    this.open = true;
    this._onOpen();
    ++this._popupToken; // hủy lượt đóng đang chạy animation
    this._popup.getAnimations?.().forEach((a) => a.cancel());
    showFloating(this._popup);
    this._stopAutoUpdate ||= autoUpdate(this._selector, this._popup, () => this._position());
    this._afterShow();
    if (this._animated()) animateIn(this._popup, this._side === 'top' ? 'slide-up' : 'slide-down');
    this._overlay = openOverlay({
      element: this._popup,
      ignore: [this._selector],
      restoreFocus: false,
      onEscape: () => this._closePopup({ commit: false, focusInput: true }),
      onClickOutside: () => this._closePopup({ commit: true }),
    });
    this._syncClasses();
    this.emit('hui-open');
    if (focusPanel) this._focusPanel();
  }

  /**
   * Đóng popup. commit: xác nhận giá trị tạm (false = hủy, về giá trị cũ).
   * Focus được trả về ô nhập TRƯỚC khi ẩn popup (tránh trình duyệt tự đẩy focus về body).
   */
  _closePopup({ commit = true, focusInput = false } = {}) {
    if (!this._isOpen) return;
    const active = this.shadowRoot.activeElement;
    if (focusInput || (active && this._popup.contains(active))) this._activeInput()?.focus({ preventScroll: true });
    this._isOpen = false;
    this.open = false;
    this._overlay?.close();
    this._overlay = null;
    if (commit) this._commitPending();
    else this._revertPending();
    this._syncClasses();
    this.markInteracted();

    const token = ++this._popupToken;
    const done = () => {
      if (token !== this._popupToken) return;
      this._stopAutoUpdate?.();
      this._stopAutoUpdate = null;
      hideFloating(this._popup);
      this._popup.getAnimations?.().forEach((a) => a.cancel());
    };
    if (this._animated()) animateOut(this._popup, this._side === 'top' ? 'slide-up' : 'slide-down').then(done);
    else done();
    this.emit('hui-close');
  }

  _position() {
    const pos = computePosition(this._selector, this._popup, { placement: this.placement || 'bottom-start', offset: 4 });
    this._popup.style.left = `${pos.x}px`;
    this._popup.style.top = `${pos.y}px`;
    this._side = pos.side;
  }

  /** Popup vừa hiện (đo được kích thước) */
  _afterShow() {}

  // =====================================================
  // BÀN PHÍM Ô NHẬP
  // =====================================================

  _onInputKeydown(e, index) {
    if (this.isDisabled) return;
    switch (e.key) {
      case 'ArrowDown':
        if (this.readonly) return;
        e.preventDefault();
        this._activeIndex = index;
        this._openPopup({ focusPanel: true });
        break;
      case 'Enter':
        e.preventDefault();
        this._onInputEnter(index);
        break;
      case 'Escape':
        // Popup mở thì overlay đã xử lý Esc; popup đóng mà đang gõ dở → trả lại chữ cũ
        if (!this._isOpen) this._revertPending();
        break;
      default:
    }
  }

  // =====================================================
  // GIÁ TRỊ
  // =====================================================

  /** Gán giá trị do người dùng chọn → phát input + change (chỉ khi đổi) */
  _setUserValue(value, detail) {
    const same = Array.isArray(value) && Array.isArray(this.value)
      ? value.join('/') === this.value.join('/')
      : value === this.value;
    if (same) return false;
    this.value = value;
    this.markInteracted();
    this.emit('input', detail);
    this.emit('change', detail);
    return true;
  }

  validationAnchor() {
    return this._inputs?.[0];
  }

  /** Đưa focus vào ô nhập đầu (giống <input>) */
  focus(options) {
    if (this._inputs?.length && !this.inline) this._inputs[0].focus(options);
    else if (this.inline) this._focusPanel();
    else super.focus(options);
  }

  blur() {
    this._activeInput()?.blur();
  }

  // Mặc định rỗng — lớp con ghi đè
  _renderInputs() { return { nodes: [], inputs: [] }; }
  _renderPopup() { return createElement('div'); }
  _onOpen() {}
  _focusPanel() {}
  _commitPending() {}
  _revertPending() {}
  _onInputText() {}
  _onInputEnter() {
    if (this._isOpen) this._closePopup({ commit: true });
    else this._commitPending();
  }
  _clearValue() {}
}

export default HuiPickerBase;
