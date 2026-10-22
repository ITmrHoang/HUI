/**
 * HUI Segmented — Chọn một trong nhiều dạng thanh trượt (Ant Segmented), tham gia <form> native.
 * Lựa chọn lấy từ property `options` (chuỗi hoặc { value, label, icon, disabled }) hoặc các <option> con.
 * Vệt chỉ báo (indicator) trượt tới lựa chọn đang chọn. Bàn phím theo WAI-ARIA APG Radio Group.
 */

import styles from './hui-segmented.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-icon/hui-icon.js';

const NEXT_KEYS = ['ArrowRight', 'ArrowDown'];
const PREV_KEYS = ['ArrowLeft', 'ArrowUp'];

/** Chuẩn hóa 1 option → { value, label, icon, disabled, tip } */
function normalize(option) {
  if (option !== null && typeof option === 'object') {
    const value = String(option.value ?? option.label ?? '');
    return {
      value,
      label: option.label == null ? '' : String(option.label),
      icon: option.icon ? String(option.icon) : '',
      disabled: Boolean(option.disabled),
      tip: option.title ? String(option.title) : '',
    };
  }
  return { value: String(option), label: String(option), icon: '', disabled: false, tip: '' };
}

/**
 * Thanh chọn một trong nhiều.
 * @fires input - Người dùng chọn lựa chọn khác (phát trước change). detail: { value }
 * @fires change - Người dùng chọn lựa chọn khác. detail: { value }
 * @slot - Các <option value="…" icon="…" disabled> (bị bỏ qua khi có property options)
 * @csspart base - Khung nền (role=radiogroup)
 * @csspart indicator - Vệt nền trượt dưới lựa chọn đang chọn
 * @csspart item - Mỗi lựa chọn (thêm item-selected / item-disabled)
 * @csspart icon - Icon của lựa chọn
 * @csspart label - Chữ của lựa chọn
 * @cssprop --hui-segmented-bg - Nền khung
 * @cssprop --hui-segmented-padding - Khoảng đệm quanh các lựa chọn
 * @cssprop --hui-segmented-radius - Bo góc khung
 * @cssprop --hui-segmented-item-radius - Bo góc lựa chọn / indicator
 * @cssprop --hui-segmented-item-height - Chiều cao lựa chọn
 * @cssprop --hui-segmented-item-padding-x - Đệm ngang lựa chọn
 * @cssprop --hui-segmented-font-size - Cỡ chữ
 * @cssprop --hui-segmented-color - Màu chữ lựa chọn thường
 * @cssprop --hui-segmented-hover-color - Màu chữ khi hover
 * @cssprop --hui-segmented-item-hover-bg - Nền lựa chọn khi hover
 * @cssprop --hui-segmented-selected-color - Màu chữ lựa chọn đang chọn
 * @cssprop --hui-segmented-indicator-bg - Nền indicator
 * @cssprop --hui-segmented-indicator-shadow - Đổ bóng indicator
 * @cssprop --hui-segmented-duration - Thời gian trượt indicator
 */
class HuiSegmented extends HuiFormElement {
  static properties = {
    /** Giá trị đang chọn; bỏ trống → tự chọn lựa chọn bật đầu tiên */
    value: { type: String, default: '', reflect: false },
    /** Mảng chuỗi hoặc { value, label, icon, disabled, title } — gán bằng property (attribute nhận JSON) */
    options: { type: Array, default: [] },
    /** Chiếm toàn bộ chiều ngang, các lựa chọn chia đều */
    block: { type: Boolean },
    /** Nhãn ARIA của nhóm (khi không có nhãn hiển thị bên ngoài) */
    label: { type: String },
    /** Tắt hiệu ứng trượt của indicator */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    /** Danh sách lựa chọn đã chuẩn hóa đang hiển thị */
    this._items = [];
    this._buttons = [];
    this._placed = false;
  }

  connectedCallback() {
    super.connectedCallback();
    // <option> con thay đổi (thêm/bớt/sửa chữ) → đọc lại
    this._mo ||= new MutationObserver((records) => {
      // Bỏ qua thay đổi attribute của chính host (disabled, block…) — chỉ quan tâm <option> con
      if (this._fromProperty() || records.every((r) => r.type === 'attributes' && r.target === this)) return;
      this._rebuild();
    });
    this._mo.observe(this, { childList: true, subtree: true, attributes: true, characterData: true });
    if (typeof ResizeObserver === 'function') {
      this._ro ||= new ResizeObserver(() => this._placeIndicator(false));
      this._ro.observe(this._track);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._mo?.disconnect();
    this._ro?.disconnect();
  }

  render() {
    this._indicator = createElement('div', { className: 'seg__indicator', part: 'indicator', 'aria-hidden': 'true' });
    this._track = createElement('div', { className: 'seg', part: 'base', role: 'radiogroup' }, this._indicator);
    this._track.addEventListener('click', (e) => {
      const btn = e.target.closest?.('.seg__item');
      if (btn) this._select(Number(btn.dataset.index), false);
    });
    this._track.addEventListener('keydown', (e) => this._onKeydown(e));
    this._track.addEventListener('focusout', (e) => {
      if (!this._track.contains(e.relatedTarget)) this.markInteracted();
    });
    return this._track;
  }

  updated(changed) {
    if (changed.has('options')) this._rebuild();
    if (changed.has('label') || changed.has('locale')) {
      if (this.label) this._track.setAttribute('aria-label', this.label);
      else this._track.removeAttribute('aria-label');
    }
    if (changed.has('value') || changed.has('disabled')) this._syncButtons();
    if (changed.has('required')) this._track.toggleAttribute('aria-required', this.required);
    this._track.className = ['seg', `seg--${this.effectiveSize}`, this.isDisabled ? 'seg--disabled' : ''].filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
    super.updated(changed);
  }

  firstUpdated() {
    // Đợi layout xong mới đo được vị trí lựa chọn
    requestAnimationFrame(() => this._placeIndicator(false));
  }

  // =====================================================
  // LỰA CHỌN
  // =====================================================

  _fromProperty() {
    return Array.isArray(this.options) && this.options.length > 0;
  }

  _readOptions() {
    if (this._fromProperty()) return this.options.map(normalize);
    return [...this.querySelectorAll('option')].map((o) => ({
      value: o.hasAttribute('value') ? o.getAttribute('value') : o.textContent.trim(),
      label: o.textContent.trim(),
      icon: o.getAttribute('icon') || '',
      disabled: o.disabled,
      tip: o.getAttribute('title') || '',
      selected: o.hasAttribute('selected'),
    }));
  }

  _rebuild() {
    if (!this._hasRendered) return;
    this._items = this._readOptions();
    this._buttons = this._items.map((item, i) => {
      const children = [];
      if (item.icon) children.push(createElement('hui-icon', { name: item.icon, className: 'seg__icon', part: 'icon', 'aria-hidden': 'true' }));
      if (item.label) children.push(createElement('span', { className: 'seg__label', part: 'label' }, item.label));
      const btn = createElement('button', {
        type: 'button', className: 'seg__item', part: 'item', role: 'radio', dataset: { index: String(i) },
      }, ...children);
      // Lựa chọn chỉ có icon → cần tên cho trình đọc màn hình
      if (!item.label) btn.setAttribute('aria-label', item.tip || item.value);
      if (item.tip) btn.title = item.tip;
      return btn;
    });
    this._track.replaceChildren(this._indicator, ...this._buttons);

    // Chưa có giá trị: <option selected> hoặc lựa chọn bật đầu tiên (giống Ant Segmented)
    if (this.value === '' || !this._items.some((it) => it.value === String(this.value))) {
      const preset = this._items.find((it) => it.selected && !it.disabled) || this._items.find((it) => !it.disabled);
      if (preset && (this.value === '' || this.value == null)) {
        this._props.value = preset.value;
        if (this._defaultValue === '') this._defaultValue = preset.value;
        this._syncForm();
      }
    }
    this._placed = false;
    this._syncButtons();
  }

  get _selectedIndex() {
    return this._items.findIndex((it) => it.value === String(this.value));
  }

  /** aria-checked, roving tabindex (chỉ 1 lựa chọn nhận Tab), disabled */
  _syncButtons() {
    const sel = this._selectedIndex;
    let tabStop = sel >= 0 && !this._items[sel].disabled ? sel : this._items.findIndex((it) => !it.disabled);
    if (this.isDisabled) tabStop = -1;
    this._buttons.forEach((btn, i) => {
      const item = this._items[i];
      const on = i === sel;
      btn.setAttribute('aria-checked', String(on));
      btn.disabled = this.isDisabled || item.disabled;
      btn.tabIndex = i === tabStop ? 0 : -1;
      btn.setAttribute('part', ['item', on && 'item-selected', item.disabled && 'item-disabled'].filter(Boolean).join(' '));
      btn.classList.toggle('seg__item--selected', on);
    });
    this._placeIndicator(this._placed);
  }

  /** Đặt indicator dưới lựa chọn đang chọn; animate = false khi lần đầu / đổi kích thước */
  _placeIndicator(animate) {
    const btn = this._buttons[this._selectedIndex];
    if (!btn || !btn.offsetWidth) {
      this._indicator.hidden = !btn;
      return;
    }
    const smooth = animate && !this.noAnimation && !animationsDisabled();
    this._track.classList.toggle('seg--animate', smooth);
    this._indicator.hidden = false;
    this._indicator.style.width = `${btn.offsetWidth}px`;
    this._indicator.style.transform = `translateX(${btn.offsetLeft}px)`;
    this._placed = true;
  }

  _select(index, focus) {
    const item = this._items[index];
    if (!item || item.disabled || this.isDisabled || this.readonly) return;
    if (focus) this._buttons[index].focus();
    if (item.value === String(this.value)) return;
    this.value = item.value;
    this._syncButtons();
    this.markInteracted();
    this.emit('input', { value: this.value });
    this.emit('change', { value: this.value });
  }

  /** APG Radio Group: mũi tên chọn lựa chọn kế/trước (vòng lại), Home/End về đầu/cuối */
  _onKeydown(e) {
    const btn = e.target.closest?.('.seg__item');
    if (!btn || this.isDisabled) return;
    const enabled = this._items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    if (!enabled.length) return;
    const from = enabled.indexOf(Number(btn.dataset.index));
    let next = null;
    if (NEXT_KEYS.includes(e.key)) next = enabled[(from + 1) % enabled.length];
    else if (PREV_KEYS.includes(e.key)) next = enabled[(from - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next === null) return;
    e.preventDefault();
    if (this.readonly) this._buttons[next].focus();
    else this._select(next, true);
  }

  // =====================================================
  // FORM
  // =====================================================

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() {
    return this._buttons[Math.max(0, this._selectedIndex)];
  }

  formResetCallback() {
    super.formResetCallback();
    this._syncButtons();
  }

  focus(options) {
    const target = this._buttons.find((b) => b.tabIndex === 0);
    if (target) target.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-segmented', HuiSegmented);

export default HuiSegmented;
