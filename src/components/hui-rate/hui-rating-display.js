/**
 * HUI Rating Display — Hiển thị số sao chỉ đọc (Atom): tô chính xác số lẻ (4,3 → sao thứ 5 tô 30%),
 * kèm điểm "4,3" và "(128 đánh giá)". Nhẹ hơn hui-rate (không focus, không form).
 */

import starStyles from './rate-star.css?raw';
import styles from './hui-rating-display.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { formatNumber } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { msg, resolveColor, createStar, paintStars, normalizeCount } from './rate-shared.js';

const SIZES = ['sm', 'md', 'lg'];

/**
 * Số sao chỉ đọc. Host mang role="img" + aria-label "Đánh giá 4,3 trên 5".
 * @slot character - Ký hiệu tùy chỉnh thay cho sao (được nhân bản cho mọi sao)
 * @csspart base - Khung ngoài (sao + điểm + số đánh giá)
 * @csspart stars - Dãy sao
 * @csspart star - Từng sao; kèm star-full | star-half | star-zero
 * @csspart value - Điểm số (show-value)
 * @csspart reviews - Số lượt đánh giá
 * @cssprop --hui-rating-display-size - Cạnh mỗi sao (mặc định theo size: sm 0.875rem · md 1.125rem · lg 1.5rem)
 * @cssprop --hui-rating-display-gap - Khoảng cách giữa các sao
 * @cssprop --hui-rating-display-color - Màu sao (attribute color ưu tiên hơn)
 * @cssprop --hui-rating-display-inactive-color - Màu phần chưa tô
 * @cssprop --hui-rating-display-value-color - Màu chữ điểm số
 * @cssprop --hui-rating-display-reviews-color - Màu chữ số đánh giá
 * @cssprop --hui-rating-display-font-size - Cỡ chữ điểm / số đánh giá
 */
class HuiRatingDisplay extends HuiElement {
  static localized = true;

  static properties = {
    /** Điểm (số thực, vd 4.3) — kẹp trong [0, count] */
    value: { type: Number, default: 0 },
    /** Số sao */
    count: { type: Number, default: 5 },
    /** sm | md | lg — cỡ sao và chữ */
    size: { type: String, default: 'md' },
    /** primary | success | warning | danger | info hoặc màu CSS bất kỳ — mặc định màu warning */
    color: { type: String },
    /** Tên icon trong registry hui-icon (vd 'heart'), vẽ tô đặc. Mặc định: ngôi sao */
    icon: { type: String },
    /** Ký tự thay cho sao; slot character ưu tiên hơn */
    character: { type: String },
    /** Hiện điểm số cạnh sao, vd "4,3" */
    showValue: { type: Boolean },
    /** Số chữ số thập phân của điểm hiển thị */
    precision: { type: Number, default: 1 },
    /** Số lượt đánh giá → "(128 đánh giá)"; bỏ trống = ẩn */
    reviews: { type: Number },
    /** Tên cho trình đọc màn hình (mặc định "Đánh giá 4,3 trên 5") */
    label: { type: String },
  };

  static styles = [starStyles, styles];

  constructor() {
    super();
    this._starEls = [];
  }

  get _count() {
    return normalizeCount(this.count);
  }

  /** Điểm đã kẹp trong [0, count] */
  get _value() {
    const n = Number(this.value);
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), this._count) : 0;
  }

  render() {
    this._stars = createElement('span', { className: 'hui-rate__stars', part: 'stars' });
    this._valueEl = createElement('span', { className: 'hui-rating-display__value', part: 'value' });
    this._reviewsEl = createElement('span', { className: 'hui-rating-display__reviews', part: 'reviews' });
    this._charSlot = createElement('slot', { name: 'character' });
    this._charSlot.addEventListener('slotchange', () => {
      this._buildStars();
      paintStars(this._starEls, this._value);
    });
    const slotHolder = createElement('span', { hidden: true }, this._charSlot);
    this._base = createElement('span', { className: 'hui-rating-display', part: 'base' },
      this._stars, this._valueEl, this._reviewsEl, slotHolder);
    return this._base;
  }

  updated(changed) {
    if (['count', 'icon', 'character'].some((k) => changed.has(k))) this._buildStars();
    if (changed.has('color')) {
      const c = resolveColor(this.color);
      if (c) this._base.style.setProperty('--_rate-custom-color', c);
      else this._base.style.removeProperty('--_rate-custom-color');
    }

    const v = this._value;
    paintStars(this._starEls, v);

    const digits = Number.isFinite(this.precision) ? Math.min(Math.max(this.precision, 0), 3) : 1;
    const valueText = formatNumber(v, digits);
    this._valueEl.textContent = valueText;
    this._valueEl.hidden = !this.showValue;

    const hasReviews = this.reviews !== null && this.reviews !== undefined && Number.isFinite(Number(this.reviews));
    this._reviewsEl.textContent = hasReviews ? msg('rate.reviews', { count: formatNumber(this.reviews) }) : '';
    this._reviewsEl.hidden = !hasReviews;

    this._base.className = `hui-rating-display hui-rating-display--${SIZES.includes(this.size) ? this.size : 'md'}`;

    // Toàn khối là 1 ảnh với tên đầy đủ (gồm cả số đánh giá) cho trình đọc màn hình
    const label = this.label || [
      msg('rate.displayLabel', { value: formatNumber(v, { maximumFractionDigits: digits }), count: this._count }),
      hasReviews ? this._reviewsEl.textContent : '',
    ].filter(Boolean).join(' ');
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', label);
  }

  _buildStars() {
    const nodes = this._charSlot.assignedNodes({ flatten: true })
      .filter((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    const opts = { nodes, character: this.character, icon: this.icon };
    this._starEls = Array.from({ length: this._count }, () => createStar(opts));
    this._stars.replaceChildren(...this._starEls);
  }
}

defineElement('hui-rating-display', HuiRatingDisplay);

export default HuiRatingDisplay;
