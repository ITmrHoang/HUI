/**
 * HUI Color Swatch — Ô màu (Atom): vuông / tròn, nền ô cờ phía sau màu trong suốt,
 * tùy chọn chọn được (`selectable` → nút bật/tắt) hoặc bấm để sao chép mã màu (`copyable`).
 */

import styles from './hui-color-swatch.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { copyText } from '../hui-copy/hui-copy.js';
import '../hui-icon/index.js';

const SHAPES = ['square', 'circle', 'rounded'];
const SIZES = { sm: '20px', md: '28px', lg: '40px' };
const COLOR_TOKENS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

const FALLBACK = {
  vi: { 'colorSwatch.label': 'Màu {color}', 'colorSwatch.copy': 'Sao chép mã màu {color}', 'colorSwatch.copied': 'Đã sao chép {color}' },
  en: { 'colorSwatch.label': 'Color {color}', 'colorSwatch.copy': 'Copy color {color}', 'colorSwatch.copied': 'Copied {color}' },
};

function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/** "rgb(12, 34, 56)" / "rgba(…)" → độ sáng tương đối 0..1 (null nếu trong suốt / không đọc được) */
function luminanceOf(cssColor) {
  const m = String(cssColor).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (a < 0.35) return null;
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Ô màu.
 * @fires change - (selectable) Người dùng bật/tắt chọn. detail: { selected, color }
 * @fires hui-copy - (copyable) Đã sao chép mã màu. detail: { value }
 * @fires hui-copy-error - (copyable) Không ghi được clipboard. detail: { value }
 * @slot - Chữ hiển thị dưới/cạnh ô màu (thay label khi show-label)
 * @csspart base - Khung ngoài (ô màu + chữ)
 * @csspart swatch - Ô màu (button khi selectable/copyable)
 * @csspart color - Lớp màu phủ trên nền ô cờ
 * @csspart check - Dấu ✓ (đang chọn / vừa sao chép)
 * @csspart label - Chữ tên màu (show-label)
 * @csspart value - Mã màu dưới tên (show-label)
 * @cssprop --hui-color-swatch-size - Cạnh ô màu (attribute size ưu tiên hơn)
 * @cssprop --hui-color-swatch-radius - Bo góc khi shape="rounded"
 * @cssprop --hui-color-swatch-border - Viền ô màu (mặc định 1px viền mờ)
 * @cssprop --hui-color-swatch-ring-color - Màu vòng chọn (mặc định --hui-primary)
 * @cssprop --hui-color-swatch-checker - Màu ô cờ tối (mặc định --hui-fill-secondary)
 * @cssprop --hui-color-swatch-label-color - Màu chữ tên
 */
class HuiColorSwatch extends HuiElement {
  static localized = true;

  static properties = {
    /** Màu CSS bất kỳ (#1677ff, rgb(), hsl(), transparent…) hoặc token primary | success | warning | danger | info */
    color: { type: String },
    /** square | circle | rounded */
    shape: { type: String, default: 'rounded' },
    /** sm | md | lg hoặc số px */
    size: { type: String, default: 'md' },
    /** Tên màu cho trình đọc màn hình + chữ hiển thị khi show-label (mặc định = mã màu) */
    label: { type: String },
    /** Hiện tên + mã màu bên dưới ô */
    showLabel: { type: Boolean },
    /** Ô là nút bật/tắt chọn (aria-pressed) */
    selectable: { type: Boolean },
    /** Đang được chọn (hiện vòng + ✓) */
    selected: { type: Boolean },
    /** Bấm để sao chép mã màu */
    copyable: { type: Boolean },
    /** Vô hiệu hóa tương tác */
    disabled: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._copiedTimer = 0;
    this._copied = false;
  }

  render() {
    this._color = createElement('span', { className: 'cs__color', part: 'color' });
    this._check = createElement('hui-icon', { className: 'cs__check', part: 'check', name: 'check', 'aria-hidden': 'true' });
    this._live = createElement('span', { className: 'cs__sr', 'aria-live': 'polite' });
    this._labelText = createElement('span', { className: 'cs__label', part: 'label' }, createElement('slot'));
    this._labelFallback = document.createTextNode('');
    this._labelText.querySelector('slot').append(this._labelFallback);
    this._valueText = createElement('span', { className: 'cs__value', part: 'value' });
    this._caption = createElement('span', { className: 'cs__caption' }, this._labelText, this._valueText);
    this._base = createElement('span', { className: 'cs', part: 'base' }, this._caption, this._live);
    this._base.addEventListener('click', (e) => this._onClick(e));
    return this._base;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._copiedTimer);
  }

  get _interactive() {
    return this.selectable || this.copyable;
  }

  /** Mã màu hiển thị/sao chép */
  get _value() {
    return this.color || '';
  }

  updated(changed) {
    if (changed.has('selectable') || changed.has('copyable') || !this._swatch) this._buildSwatch();

    if (changed.has('color')) {
      const c = this.color ? (COLOR_TOKENS.includes(this.color) ? `var(--hui-${this.color})` : this.color) : 'transparent';
      this._swatch.style.setProperty('--_cs-color', c);
      // Màu ✓ tương phản với nền: đợi style áp xong rồi đo màu thật
      requestAnimationFrame(() => this._syncContrast());
    }
    if (changed.has('size')) {
      const raw = String(this.size ?? '').trim();
      // md = mặc định → để --hui-color-swatch-size từ ngoài có hiệu lực
      const size = !raw || raw === 'md' ? '' : SIZES[raw] || (/^\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw);
      if (size) this._base.style.setProperty('--_cs-size', size);
      else this._base.style.removeProperty('--_cs-size');
    }
    this._base.dataset.shape = SHAPES.includes(this.shape) ? this.shape : 'rounded';

    const name = this.label || this._value;
    this._labelFallback.data = name;
    this._valueText.textContent = this.label && this.label !== this._value ? this._value : '';
    this._valueText.hidden = !this._valueText.textContent;
    this._caption.hidden = !this.showLabel;

    const sw = this._swatch;
    if (this._interactive) {
      sw.disabled = this.disabled;
      sw.setAttribute('aria-label', this.copyable && !this.selectable ? tx('colorSwatch.copy', { color: name }) : tx('colorSwatch.label', { color: name }));
      if (this.selectable) sw.setAttribute('aria-pressed', String(Boolean(this.selected)));
      else sw.removeAttribute('aria-pressed');
      if (this.showLabel) sw.setAttribute('aria-describedby', 'cs-caption');
    } else {
      sw.setAttribute('aria-label', tx('colorSwatch.label', { color: name }));
    }
    this._caption.id = 'cs-caption';
    this._check.hidden = !(this.selected || this._copied);
    this._base.classList.toggle('cs--selected', Boolean(this.selected));
  }

  /** Dựng ô màu: <button> khi tương tác được, <span role="img"> khi chỉ hiển thị */
  _buildSwatch() {
    const old = this._swatch;
    const interactive = this._interactive;
    const sw = interactive
      ? createElement('button', { type: 'button', className: 'cs__swatch', part: 'swatch' })
      : createElement('span', { className: 'cs__swatch', part: 'swatch', role: 'img' });
    if (old) sw.style.cssText = old.style.cssText;
    sw.append(this._color, this._check);
    if (old) old.replaceWith(sw);
    else this._base.prepend(sw);
    this._swatch = sw;
  }

  _syncContrast() {
    const lum = luminanceOf(getComputedStyle(this._color).backgroundColor);
    this._base.dataset.contrast = lum === null || lum > 0.45 ? 'dark' : 'light';
  }

  async _onClick(e) {
    if (!this._interactive || this.disabled || !e.composedPath().includes(this._swatch)) return;
    if (this.selectable) {
      this.selected = !this.selected;
      this.emit('change', { selected: this.selected, color: this._value });
    }
    if (this.copyable && this._value) {
      const ok = await copyText(this._value);
      if (!ok) {
        this.emit('hui-copy-error', { value: this._value });
        return;
      }
      this._copied = true;
      this._live.textContent = tx('colorSwatch.copied', { color: this.label || this._value });
      this.requestUpdate();
      this.emit('hui-copy', { value: this._value });
      clearTimeout(this._copiedTimer);
      this._copiedTimer = setTimeout(() => {
        this._copied = false;
        this._live.textContent = '';
        this.requestUpdate();
      }, 1500);
    }
  }

  focus(options) {
    if (this._interactive) this._swatch?.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-color-swatch', HuiColorSwatch);

export default HuiColorSwatch;
