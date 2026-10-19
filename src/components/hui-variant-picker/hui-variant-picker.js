/**
 * HUI Variant Picker — chọn biến thể sản phẩm: ô màu (swatch), nút kích cỡ (pill) hoặc ảnh thu nhỏ.
 * Ngữ nghĩa radio group (WAI-ARIA APG) với roving tabindex; mục hết hàng bị gạch chéo, không chọn được.
 * Tham gia <form> qua HuiFormElement (gửi value). Parts / biến CSS: xem JSDoc class.
 */

import styles from './hui-variant-picker.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';

const FALLBACK = {
  'variantPicker.soldOut': { vi: 'Hết hàng', en: 'Sold out' },
  'variantPicker.label': { vi: 'Chọn biến thể', en: 'Choose a variant' },
};
const msg = (key) => {
  const v = t(key);
  return v !== key ? v : FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

const TYPES = ['button', 'color', 'image'];
let uid = 0;

/** Chuẩn hóa 1 option: chuỗi → { value, label } */
function normalizeOption(o) {
  if (o === null || o === undefined) return null;
  if (typeof o !== 'object') return { value: String(o), label: String(o) };
  const value = o.value ?? o.label;
  if (value === undefined || value === null) return null;
  return { ...o, value: String(value), label: o.label ?? String(value), disabled: Boolean(o.disabled || o.soldOut) };
}

/**
 * Chọn biến thể (màu / cỡ / ảnh).
 * @fires input - Người dùng chọn mục khác. detail: { value, option }
 * @fires change - Phát cùng lúc với input. detail: { value, option }
 * @csspart base - Khung ngoài
 * @csspart header - Dòng nhãn "Màu sắc: Đỏ"
 * @csspart label - Nhãn (attribute label)
 * @csspart selected - Tên mục đang chọn sau nhãn
 * @csspart group - Vùng role="radiogroup"
 * @csspart option - Từng mục (kèm option-checked / option-disabled)
 * @csspart swatch - Ô màu bên trong mục (type="color")
 * @csspart thumb - Ảnh bên trong mục (type="image")
 * @cssprop --hui-variant-picker-gap - Khoảng cách giữa các mục
 * @cssprop --hui-variant-picker-swatch-size - Cạnh ô màu / ảnh (mặc định theo size)
 * @cssprop --hui-variant-picker-radius - Bo góc nút cỡ (mặc định pill)
 * @cssprop --hui-variant-picker-border-color - Viền mục chưa chọn
 * @cssprop --hui-variant-picker-active-color - Viền / chữ mục đang chọn
 * @cssprop --hui-variant-picker-active-bg - Nền nút cỡ đang chọn
 * @cssprop --hui-variant-picker-bg - Nền nút cỡ
 * @cssprop --hui-variant-picker-color - Màu chữ nút cỡ
 * @cssprop --hui-variant-picker-disabled-color - Màu đường gạch chéo / chữ mục hết hàng
 */
class HuiVariantPicker extends HuiFormElement {
  static properties = {
    /** Giá trị đang chọn ('' = chưa chọn); attribute value = giá trị ban đầu khi reset form */
    value: { type: String, default: '', reflect: false },
    /** [{ value, label, color, image, disabled }] hoặc mảng chuỗi — attribute dạng JSON */
    options: { type: Array, default: [] },
    /** button | color | image — nút chữ (pill) | ô màu | ảnh thu nhỏ */
    type: { type: String, default: 'button' },
    /** Nhãn nhóm (vd "Màu sắc") — hiện kèm tên mục đang chọn */
    label: { type: String },
    /** Ẩn tên mục đang chọn sau nhãn */
    hideSelected: { type: Boolean },
    /** Tắt hiệu ứng */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._id = `hui-vp-${++uid}`;
    this._items = [];
    this._els = [];
    this._focusIndex = -1;
  }

  get _type() {
    return TYPES.includes(this.type) ? this.type : 'button';
  }

  /** Option đang chọn (null nếu chưa chọn / không khớp) */
  get selectedOption() {
    return this._items.find((o) => o.value === String(this.value ?? '')) || null;
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._labelEl = createElement('span', { className: 'vp__label', part: 'label', id: `${this._id}-label` });
    this._selectedEl = createElement('span', { className: 'vp__selected', part: 'selected' });
    this._header = createElement('div', { className: 'vp__header', part: 'header' }, this._labelEl, this._selectedEl);
    this._group = createElement('div', { className: 'vp__group', part: 'group', role: 'radiogroup' });
    this._group.addEventListener('keydown', (e) => this._onKeydown(e));
    this._group.addEventListener('focusout', (e) => {
      if (!this._group.contains(e.relatedTarget)) this.markInteracted();
    });
    this._base = createElement('div', { className: 'vp', part: 'base' }, this._header, this._group);
    return this._base;
  }

  updated(changed) {
    if (changed.has('options') || changed.has('type') || changed.has('locale')) this._build();
    if (changed.has('label') || changed.has('locale')) {
      this._labelEl.textContent = this.label || '';
      if (this.label) {
        this._group.setAttribute('aria-labelledby', this._labelEl.id);
        this._group.removeAttribute('aria-label');
      } else {
        this._group.removeAttribute('aria-labelledby');
        this._group.setAttribute('aria-label', msg('variantPicker.label'));
      }
    }
    this._sync();
    if (changed.has('required')) this._group.toggleAttribute('aria-required', this.required);
    this._base.className = [
      'vp', `vp--${this._type}`, `vp--${this.effectiveSize}`,
      this.isDisabled ? 'vp--disabled' : '',
      this.noAnimation || animationsDisabled() ? 'vp--static' : '',
    ].filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
    super.updated(changed);
  }

  _build() {
    this._items = (Array.isArray(this.options) ? this.options : []).map(normalizeOption).filter(Boolean);
    const type = this._type;
    this._els = this._items.map((o, i) => {
      const el = createElement('button', { type: 'button', className: 'vp__option', role: 'radio' });
      if (type === 'color') {
        const swatch = createElement('span', { className: 'vp__swatch', part: 'swatch' });
        if (o.color) swatch.style.background = o.color;
        el.append(swatch);
        el.setAttribute('aria-label', o.disabled ? `${o.label}, ${msg('variantPicker.soldOut')}` : o.label);
        el.setAttribute('title', o.label);
      } else if (type === 'image') {
        el.append(createElement('img', { className: 'vp__thumb', part: 'thumb', src: o.image || '', alt: '', draggable: 'false' }));
        el.setAttribute('aria-label', o.disabled ? `${o.label}, ${msg('variantPicker.soldOut')}` : o.label);
        el.setAttribute('title', o.label);
      } else {
        el.append(createElement('span', { className: 'vp__text' }, o.label));
        if (o.disabled) el.setAttribute('aria-label', `${o.label}, ${msg('variantPicker.soldOut')}`);
      }
      el.addEventListener('click', () => this._select(i, true));
      return el;
    });
    this._group.replaceChildren(...this._els);
  }

  _sync() {
    const selected = this.selectedOption;
    const selectedIndex = selected ? this._items.indexOf(selected) : -1;
    const locked = this.isDisabled;
    // Roving tabindex: mục đang chọn, không có thì mục bật đầu tiên
    const tabIndex = selectedIndex >= 0 ? selectedIndex : this._items.findIndex((o) => !o.disabled);
    this._els.forEach((el, i) => {
      const o = this._items[i];
      const checked = i === selectedIndex;
      el.setAttribute('aria-checked', String(checked));
      el.setAttribute('tabindex', !locked && i === tabIndex ? '0' : '-1');
      el.setAttribute('part', ['option', checked ? 'option-checked' : '', o.disabled ? 'option-disabled' : ''].filter(Boolean).join(' '));
      el.classList.toggle('vp__option--checked', checked);
      el.classList.toggle('vp__option--disabled', o.disabled);
      if (o.disabled || locked) el.setAttribute('aria-disabled', 'true');
      else el.removeAttribute('aria-disabled');
    });
    this._selectedEl.textContent = selected && this.label && !this.hideSelected ? selected.label : '';
    this._selectedEl.hidden = !this._selectedEl.textContent;
    this._header.hidden = !this.label;
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  /** Chọn mục i. Trả về true nếu giá trị đổi */
  _select(i, fromPointer = false) {
    const o = this._items[i];
    if (!o || o.disabled || this.isDisabled || this.readonly) return false;
    if (fromPointer) this._els[i].focus({ preventScroll: true });
    if (o.value === this.value) return false;
    this.value = o.value;
    this._sync();
    this._pop(this._els[i]);
    this.markInteracted();
    this.emit('input', { value: o.value, option: o });
    this.emit('change', { value: o.value, option: o });
    return true;
  }

  _pop(el) {
    if (this.noAnimation || animationsDisabled() || !el?.animate) return;
    el.animate([{ transform: 'scale(0.9)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
      { duration: 260, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
  }

  /** APG Radio Group: mũi tên chuyển + chọn mục bật kế tiếp (vòng tròn), Space chọn mục đang focus */
  _onKeydown(e) {
    const current = this._els.indexOf(e.target.closest?.('.vp__option') || e.target);
    if (current < 0 || this.isDisabled) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    let dir = 0;
    switch (e.key) {
      case 'ArrowRight': dir = rtl ? -1 : 1; break;
      case 'ArrowDown': dir = 1; break;
      case 'ArrowLeft': dir = rtl ? 1 : -1; break;
      case 'ArrowUp': dir = -1; break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        this._select(current);
        return;
      default: return;
    }
    e.preventDefault();
    const n = this._els.length;
    for (let k = 1; k <= n; k++) {
      const i = (current + dir * k + n * k) % n;
      if (!this._items[i].disabled) {
        this._els[i].focus();
        if (!this.readonly) this._select(i);
        else this._els.forEach((el, j) => el.setAttribute('tabindex', j === i ? '0' : '-1'));
        return;
      }
    }
  }

  // =====================================================
  // FORM
  // =====================================================

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && !this.selectedOption) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() {
    return this._els.find((el) => el.getAttribute('tabindex') === '0') || this._els[0];
  }

  focus(options) {
    const target = this.validationAnchor?.();
    if (target) target.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-variant-picker', HuiVariantPicker);

export default HuiVariantPicker;
