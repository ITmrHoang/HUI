/**
 * HUI Price — Giá bán (Atom): giá đã định dạng theo tiền tệ, giá gốc gạch ngang, nhãn % giảm tự tính.
 *   <hui-price value="750000" original="1000000"></hui-price>  → 750.000 ₫  1.000.000 ₫  -25%
 */

import styles from './hui-price.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { formatCurrency } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { createMsg, isNum } from '../hui-product-card/card-shared.js';

const SIZES = ['sm', 'md', 'lg'];

const msg = createMsg({
  'price.free': { vi: 'Miễn phí', en: 'Free' },
  'price.label': { vi: 'Giá {value}', en: 'Price {value}' },
  'price.srSale': { vi: 'Giá gốc {original}, giá bán {value}', en: 'Original price {original}, sale price {value}' },
  'price.srDiscount': { vi: 'giảm {percent}%', en: '{percent}% off' },
});

/** % giảm làm tròn (0 khi không có giảm giá hợp lệ) */
export function discountPercent(value, original) {
  const v = Number(value);
  const o = Number(original);
  if (!isNum(value) || !isNum(original) || o <= 0 || v >= o || v < 0) return 0;
  return Math.round((1 - v / o) * 100);
}

/**
 * Giá bán + giá gốc (<del>) + nhãn "-25%". Phần hiển thị bị ẩn khỏi trình đọc màn hình,
 * thay bằng một câu đầy đủ "Giá gốc 1.000.000 ₫, giá bán 750.000 ₫, giảm 25%".
 *
 * @csspart base - Khung ngoài
 * @csspart value - Giá bán (hoặc chữ "Miễn phí")
 * @csspart suffix - Hậu tố sau giá (vd "/tháng")
 * @csspart original - Giá gốc gạch ngang (<del>)
 * @csspart discount - Nhãn % giảm
 * @cssprop --hui-price-color - Màu giá bán (mặc định: chữ thường; có giảm giá → danger)
 * @cssprop --hui-price-font-size - Cỡ chữ giá bán (mặc định theo size)
 * @cssprop --hui-price-font-weight - Độ đậm giá bán
 * @cssprop --hui-price-original-color - Màu giá gốc
 * @cssprop --hui-price-original-font-size - Cỡ chữ giá gốc
 * @cssprop --hui-price-discount-bg - Nền nhãn % giảm
 * @cssprop --hui-price-discount-color - Chữ nhãn % giảm
 * @cssprop --hui-price-discount-radius - Bo góc nhãn % giảm
 * @cssprop --hui-price-free-color - Màu chữ "Miễn phí"
 * @cssprop --hui-price-gap - Khoảng cách giữa các phần
 */
class HuiPrice extends HuiElement {
  static localized = true;

  static properties = {
    /** Giá bán (số) */
    value: { type: Number },
    /** Giá gốc — lớn hơn value thì hiện gạch ngang + nhãn % giảm */
    original: { type: Number },
    /** Mã tiền tệ ISO 4217 (VND, USD, EUR…) */
    currency: { type: String, default: 'VND' },
    /** sm | md | lg — cỡ chữ */
    size: { type: String, default: 'md' },
    /** 'true' | 'false' — hiện nhãn % giảm (mặc định bật; show-discount="false" để tắt) */
    showDiscount: { type: String, default: 'true' },
    /** Chữ hiển thị khi giá = 0 (mặc định locale price.free "Miễn phí") */
    freeText: { type: String },
    /** Hậu tố nhỏ sau giá bán (vd "/tháng") */
    suffix: { type: String },
  };

  static styles = styles;

  /** % giảm đang hiển thị (0 = không giảm) */
  get discount() {
    return discountPercent(this.value, this.original);
  }

  render() {
    this._sr = createElement('span', { className: 'sr-only' });
    this._value = createElement('span', { className: 'price__value', part: 'value' });
    this._suffix = createElement('span', { className: 'price__suffix', part: 'suffix' });
    this._original = createElement('del', { className: 'price__original', part: 'original' });
    this._discount = createElement('span', { className: 'price__discount', part: 'discount' });
    this._visual = createElement('span', { className: 'price__visual', 'aria-hidden': 'true' },
      createElement('span', { className: 'price__main' }, this._value, this._suffix), this._original, this._discount);
    this._base = createElement('span', { part: 'base' }, this._sr, this._visual);
    return this._base;
  }

  updated() {
    // Mọi phần phụ thuộc lẫn nhau (value ↔ original ↔ currency ↔ locale) → vẽ lại toàn bộ, rất rẻ
    const hasValue = isNum(this.value);
    const isFree = hasValue && Number(this.value) === 0;
    const hasOriginal = isNum(this.original) && Number(this.original) > (hasValue ? Number(this.value) : 0);
    const percent = this.discount;
    const showDiscount = this.showDiscount !== 'false' && percent > 0 && !isFree;

    const valueText = isFree ? (this.freeText || msg('price.free')) : (hasValue ? formatCurrency(this.value, this.currency || 'VND') : '');
    const originalText = hasOriginal ? formatCurrency(this.original, this.currency || 'VND') : '';

    this._value.textContent = valueText;
    this._value.hidden = !valueText;
    this._suffix.textContent = this.suffix || '';
    this._suffix.hidden = !this.suffix || isFree;
    this._original.textContent = originalText;
    this._original.hidden = !originalText;
    this._discount.textContent = showDiscount ? `-${percent}%` : '';
    this._discount.hidden = !showDiscount;

    const size = SIZES.includes(this.size) ? this.size : 'md';
    this._base.className = [
      'price',
      `price--${size}`,
      hasOriginal ? 'price--sale' : '',
      isFree ? 'price--free' : '',
    ].filter(Boolean).join(' ');
    this.setState('sale', hasOriginal);
    this.setState('free', isFree);

    // Câu đọc cho trình đọc màn hình
    const main = `${valueText}${this.suffix && !isFree ? ` ${this.suffix}` : ''}`;
    let sr = '';
    if (hasOriginal && valueText) sr = msg('price.srSale', { original: originalText, value: main });
    else if (valueText) sr = msg('price.label', { value: main });
    if (sr && showDiscount) sr += `, ${msg('price.srDiscount', { percent })}`;
    this._sr.textContent = sr;
  }
}

defineElement('hui-price', HuiPrice);

export { HuiPrice };
export default HuiPrice;
