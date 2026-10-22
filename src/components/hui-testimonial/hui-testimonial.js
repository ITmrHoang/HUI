/**
 * HUI Testimonial — Lời nhận xét của khách hàng (Molecule): trích dẫn, số sao, avatar, tên, chức danh / công ty.
 * Ngữ nghĩa <figure> + <blockquote> + <figcaption>. Dựng trên <hui-card> (effect, href).
 */

import styles from './hui-testimonial.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import {
  createForwardSlot, forwardToCard, isNum, CARD_EXPORTPARTS,
} from '../hui-feature-card/landing-shared.js';
import '../hui-card/hui-card.js';
import '../hui-avatar/hui-avatar.js';
import '../hui-rate/hui-rating-display.js';

const VARIANTS = ['card', 'plain', 'bubble'];

/**
 * Lời nhận xét. Nội dung trích dẫn lấy từ `quote` hoặc slot mặc định (cho phép HTML: <p>, <strong>…).
 *
 * @slot - Nội dung trích dẫn (thay attribute quote)
 * @slot avatar - Avatar tùy biến (thay <hui-avatar> mặc định)
 * @slot footer - Chân thẻ (chuyển xuống hui-card)
 * @csspart base - Thẻ <figure>
 * @csspart bubble - Khối trích dẫn (+ sao); variant bubble là bong bóng có đuôi
 * @csspart quote-mark - Dấu ngoặc kép trang trí
 * @csspart rating - <hui-rating-display>
 * @csspart quote - Thẻ <blockquote>
 * @csspart author - Thẻ <figcaption> (avatar + tên)
 * @csspart avatar - <hui-avatar>
 * @csspart name - Tên người nhận xét (<cite>)
 * @csspart meta - Chức danh · công ty
 * @csspart card - Khung <hui-card> (và cover, main, header, body, skeleton, actions, footer, overlay, card-link, card-check, card-glow)
 * @cssprop --hui-testimonial-quote-color - Màu chữ trích dẫn
 * @cssprop --hui-testimonial-quote-font-size - Cỡ chữ trích dẫn
 * @cssprop --hui-testimonial-mark-color - Màu dấu ngoặc kép (mặc định primary nhạt)
 * @cssprop --hui-testimonial-mark-size - Cỡ dấu ngoặc kép
 * @cssprop --hui-testimonial-bubble-bg - Nền bong bóng (variant bubble)
 * @cssprop --hui-testimonial-bubble-radius - Bo góc bong bóng
 * @cssprop --hui-testimonial-name-color - Màu tên
 * @cssprop --hui-testimonial-meta-color - Màu chức danh / công ty
 * @cssprop --hui-testimonial-gap - Khoảng cách các khối
 */
class HuiTestimonial extends HuiElement {
  static properties = {
    /** Nội dung trích dẫn (slot mặc định ưu tiên hơn) */
    quote: { type: String },
    /** Tên người nhận xét */
    author: { type: String },
    /** Chức danh, vd "Giám đốc sản phẩm" */
    jobTitle: { type: String },
    /** Công ty / tổ chức */
    company: { type: String },
    /** URL ảnh đại diện (không có → chữ cái viết tắt từ author) */
    avatar: { type: String },
    /** Số sao (0–5, cho phép lẻ); bỏ trống = ẩn */
    rating: { type: Number },
    /** card | plain | bubble — thẻ / chữ trơn / bong bóng hội thoại */
    variant: { type: String, default: 'card' },
    /** start | center — căn nội dung */
    align: { type: String, default: 'start' },
    /** vertical | horizontal — horizontal: tác giả bên trái, trích dẫn bên phải */
    orientation: { type: String, default: 'vertical' },
    /** Ẩn dấu ngoặc kép trang trí */
    noQuoteMark: { type: Boolean },
    /** Hiệu ứng của hui-card: lift | tilt | glow | border-gradient… */
    effect: { type: String },
    /** Link nguồn (bài review, case study) — cả thẻ bấm được */
    href: { type: String },
    /** target của link */
    target: { type: String },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Skeleton thay cho nội dung */
    loading: { type: Boolean },
    /** Tắt chuyển động */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._mark = createElement('span', { className: 'tm__mark', part: 'quote-mark', 'aria-hidden': 'true' }, '“');
    this._rating = createElement('hui-rating-display', { className: 'tm__rating', part: 'rating', size: 'sm' });
    this._quoteText = createElement('p', { className: 'tm__quote-text' });
    this._quoteSlot = createElement('slot', {}, this._quoteText);
    this._quoteSlot.addEventListener('slotchange', () => this._syncQuote());
    this._quote = createElement('blockquote', { className: 'tm__quote', part: 'quote' }, this._quoteSlot);
    this._bubble = createElement('div', { className: 'tm__bubble', part: 'bubble' }, this._mark, this._rating, this._quote);

    this._avatarEl = createElement('hui-avatar', { className: 'tm__avatar', part: 'avatar' });
    this._avatarSlot = createElement('slot', { name: 'avatar' }, this._avatarEl);
    this._avatarSlot.addEventListener('slotchange', () => this._syncAuthor());
    this._name = createElement('cite', { className: 'tm__name', part: 'name' });
    this._meta = createElement('span', { className: 'tm__meta', part: 'meta' });
    this._who = createElement('span', { className: 'tm__who' }, this._name, this._meta);
    this._author = createElement('figcaption', { className: 'tm__author', part: 'author' },
      createElement('span', { className: 'tm__avatar-wrap' }, this._avatarSlot), this._who);

    this._base = createElement('figure', { className: 'tm', part: 'base' }, this._bubble, this._author);
    this._card = createElement('hui-card', { className: 'tm__card', exportparts: CARD_EXPORTPARTS },
      this._base, createForwardSlot('footer'));
    return this._card;
  }

  firstUpdated() {
    this._syncQuote();
    this._syncAuthor();
  }

  updated(changed) {
    const variant = VARIANTS.includes(this.variant) ? this.variant : 'card';
    forwardToCard(this, this._card, changed, {
      variant: variant === 'card' ? 'elevated' : 'ghost',
      orientation: null,
    });

    if (['variant', 'align', 'orientation', 'size', 'noQuoteMark'].some((k) => changed.has(k))) {
      this._base.className = [
        'tm',
        `tm--${variant}`,
        `tm--${this.align === 'center' ? 'center' : 'start'}`,
        `tm--${this.orientation === 'horizontal' ? 'horizontal' : 'vertical'}`,
        `tm--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
      ].join(' ');
      this._mark.hidden = this.noQuoteMark;
      this._card.classList.toggle('tm__card--flat', variant !== 'card');
      this._avatarEl.setAttribute('size', this.size === 'lg' ? 'lg' : this.size === 'sm' ? 'sm' : 'md');
    }

    if (changed.has('quote')) {
      this._quoteText.textContent = this.quote || '';
      this._syncQuote();
    }

    if (changed.has('rating')) {
      const show = isNum(this.rating);
      this._rating.hidden = !show;
      if (show) this._rating.setAttribute('value', String(this.rating));
      else this._rating.removeAttribute('value');
    }

    if (['author', 'avatar', 'jobTitle', 'company'].some((k) => changed.has(k))) {
      if (this.avatar) this._avatarEl.setAttribute('src', this.avatar);
      else this._avatarEl.removeAttribute('src');
      if (this.author) this._avatarEl.setAttribute('name', this.author);
      else this._avatarEl.removeAttribute('name');
      // Tên đã hiện bằng chữ ngay cạnh → avatar chỉ là trang trí (tránh đọc tên 2 lần)
      this._avatarSlot.parentElement.toggleAttribute('aria-hidden', Boolean(this.author));
      this._name.textContent = this.author || '';
      this._name.hidden = !this.author;
      this._meta.textContent = [this.jobTitle, this.company].filter(Boolean).join(' · ');
      this._meta.hidden = !this._meta.textContent;
      this._syncAuthor();
    }
  }

  _syncQuote() {
    if (!this._quote) return;
    const slotted = this._quoteSlot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    this._quote.hidden = !slotted && !this.quote;
  }

  _syncAuthor() {
    if (!this._author) return;
    const slotted = this._avatarSlot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE);
    const hasAvatar = slotted || Boolean(this.avatar || this.author);
    this._avatarSlot.parentElement.hidden = !hasAvatar;
    this._author.hidden = !hasAvatar && !this.author && !this.jobTitle && !this.company;
  }
}

defineElement('hui-testimonial', HuiTestimonial);

export { HuiTestimonial };
export default HuiTestimonial;
