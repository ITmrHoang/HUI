/**
 * HUI Product Card — Thẻ sản phẩm (Molecule): ảnh, nhãn, yêu thích, tên, đánh giá, giá, nút thêm giỏ.
 * Dựng trên <hui-card> (hiệu ứng effect / href / orientation… chép thẳng xuống card bên trong).
 */

import styles from './hui-product-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import {
  forwardToCard, createMsg, createForwardSlot, canAnimate, isNum, CARD_EXPORTPARTS,
} from './card-shared.js';
import '../hui-card/hui-card.js';
import '../hui-button/hui-button.js';
import '../hui-icon/hui-icon.js';
import '../hui-price/hui-price.js';
import '../hui-rate/hui-rating-display.js';

const SIZES = ['sm', 'md', 'lg'];
const RATIO = /^\d+(\.\d+)?(\s*\/\s*\d+(\.\d+)?)?$/;

const msg = createMsg({
  'product.addToCart': { vi: 'Thêm vào giỏ', en: 'Add to cart' },
  'product.soldOut': { vi: 'Hết hàng', en: 'Sold out' },
  'product.wishlist': { vi: 'Yêu thích', en: 'Wishlist' },
});

/**
 * Thẻ sản phẩm: ảnh (tỉ lệ `ratio`), nhãn `badge` / slot badge, nút yêu thích, tên (link khi có href),
 * <hui-rating-display>, <hui-price>, nút thêm giỏ. `sold-out` → ảnh xám + lớp "Hết hàng" + khóa nút.
 *
 * @fires hui-add-to-cart - Bấm nút thêm giỏ (không phát khi sold-out). detail: { name, price }
 * @fires hui-wishlist - Bật/tắt yêu thích. detail: { active }
 * @slot badge - Nhãn tùy biến góc trên ảnh (vd <hui-tag>)
 * @slot extra - Nội dung thêm dưới giá (vd "Đã bán 1,2k", freeship)
 * @slot actions - Nút phụ cạnh nút thêm giỏ
 * @slot overlay - Lớp phủ trên ảnh (dùng với effect="reveal")
 * @csspart image - Ảnh sản phẩm
 * @csspart media - Lớp phủ trên ảnh (chứa badge, wishlist, sold-out)
 * @csspart badges - Vùng nhãn
 * @csspart badge - Nhãn từ attribute badge
 * @csspart wishlist - Nút yêu thích
 * @csspart sold-out - Lớp "Hết hàng"
 * @csspart content - Khối nội dung (tên, đánh giá, giá)
 * @csspart name - Tên sản phẩm (link khi có href)
 * @csspart rating - <hui-rating-display>
 * @csspart price - <hui-price>; kèm price-value, price-original, price-discount
 * @csspart add-button - Nút thêm giỏ (<hui-button>); kèm add-button-base
 * @csspart card - Khung <hui-card> (và cover, main, header, body, skeleton, actions, footer, overlay, card-link, card-check, card-glow)
 * @cssprop --hui-product-card-image-fit - object-fit của ảnh (mặc định cover)
 * @cssprop --hui-product-card-image-bg - Nền vùng ảnh
 * @cssprop --hui-product-card-name-color - Màu tên
 * @cssprop --hui-product-card-name-font-size - Cỡ chữ tên
 * @cssprop --hui-product-card-name-lines - Số dòng tối đa của tên (mặc định 2)
 * @cssprop --hui-product-card-badge-bg - Nền nhãn
 * @cssprop --hui-product-card-badge-color - Chữ nhãn
 * @cssprop --hui-product-card-wishlist-bg - Nền nút yêu thích
 * @cssprop --hui-product-card-wishlist-active-color - Màu tim khi bật
 * @cssprop --hui-product-card-sold-out-bg - Nền lớp "Hết hàng"
 */
class HuiProductCard extends HuiElement {
  static localized = true;

  static properties = {
    /** URL ảnh sản phẩm */
    image: { type: String },
    /** Mô tả ảnh (mặc định = name) */
    imageAlt: { type: String },
    /** Tỉ lệ ảnh rộng/cao, vd "1/1", "4/3", "3/4" */
    ratio: { type: String, default: '1/1' },
    /** Tên sản phẩm */
    name: { type: String },
    /** Cấp heading của tên (aria-level) */
    headingLevel: { type: Number, default: 3 },
    /** Giá bán */
    price: { type: Number },
    /** Giá gốc (lớn hơn price → gạch ngang + % giảm) */
    originalPrice: { type: Number },
    /** Mã tiền tệ ISO 4217 */
    currency: { type: String, default: 'VND' },
    /** Điểm đánh giá 0–5 (bỏ trống = ẩn) */
    rating: { type: Number },
    /** Số lượt đánh giá */
    reviews: { type: Number },
    /** Chữ nhãn góc ảnh, vd "Mới" (hoặc slot badge) */
    badge: { type: String },
    /** Hết hàng: ảnh xám + lớp "Hết hàng" + khóa nút thêm giỏ */
    soldOut: { type: Boolean },
    /** Hiện nút yêu thích (trái tim) */
    wishlist: { type: Boolean },
    /** Trạng thái yêu thích đang bật */
    wishlisted: { type: Boolean },
    /** Chữ nút thêm giỏ (mặc định locale product.addToCart) */
    addText: { type: String },
    /** Ẩn nút thêm giỏ */
    noAddButton: { type: Boolean },
    /** Hiệu ứng của hui-card: lift | tilt | glow | zoom-media | reveal | border-gradient (nhiều giá trị cách nhau bởi dấu cách) */
    effect: { type: String, default: 'lift zoom-media' },
    /** Link trang chi tiết — tên thành link, cả card bấm được */
    href: { type: String },
    /** target của link (vd _blank) */
    target: { type: String },
    /** elevated | outlined | filled | ghost — biến thể hui-card */
    variant: { type: String, default: 'elevated' },
    /** vertical | horizontal — horizontal: ảnh trái, nội dung phải (dạng danh sách) */
    orientation: { type: String, default: 'vertical' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Skeleton thay cho nội dung */
    loading: { type: Boolean },
    /** Tắt chuyển động (hover, tim nảy) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._img = createElement('img', { slot: 'cover', className: 'pc__img', part: 'image', alt: '', loading: 'lazy', decoding: 'async' });

    this._badgeText = createElement('span', { className: 'pc__badge', part: 'badge' });
    const badges = createElement('div', { className: 'pc__badges', part: 'badges' },
      this._badgeText, createElement('slot', { name: 'badge' }));

    this._wishIcon = createElement('hui-icon', { name: 'heart' });
    this._wish = createElement('button', { type: 'button', className: 'pc__wishlist', part: 'wishlist', 'aria-pressed': 'false' }, this._wishIcon);
    this._wish.addEventListener('click', () => this._toggleWishlist());

    this._soldOutText = createElement('span', { className: 'pc__sold-out-label' });
    this._soldOut = createElement('div', { className: 'pc__sold-out', part: 'sold-out' }, this._soldOutText);

    this._media = createElement('div', { slot: 'cover', className: 'pc__media', part: 'media' }, badges, this._soldOut, this._wish);

    // Nội dung: tên → đánh giá → giá → extra
    this._name = createElement('a', { className: 'pc__name-link', part: 'name' });
    this._heading = createElement('div', { className: 'pc__name', role: 'heading' }, this._name);
    this._rating = createElement('hui-rating-display', { className: 'pc__rating', part: 'rating', size: 'sm' });
    this._price = createElement('hui-price', {
      className: 'pc__price', part: 'price',
      exportparts: 'value: price-value, original: price-original, discount: price-discount',
    });
    const content = createElement('div', { className: 'pc__content', part: 'content' },
      this._heading, this._rating, this._price, createElement('slot', { name: 'extra' }));

    this._add = createElement('hui-button', { className: 'pc__add', part: 'add-button', exportparts: 'base: add-button-base', icon: 'plus', block: '' });
    this._add.addEventListener('hui-click', () => this._addToCart());
    this._actions = createElement('div', { slot: 'actions', className: 'pc__actions' }, this._add, createElement('slot', { name: 'actions' }));

    this._card = createElement('hui-card', { className: 'pc__card', 'cover-height': 'auto', exportparts: CARD_EXPORTPARTS },
      this._img, this._media, content, this._actions, createForwardSlot('overlay'));
    return this._card;
  }

  updated(changed) {
    forwardToCard(this, this._card, changed);

    if (changed.has('image') || changed.has('imageAlt') || changed.has('name')) {
      if (this.image) this._img.src = this.image;
      else this._img.removeAttribute('src');
      this._img.alt = this.imageAlt ?? this.name ?? '';
      this._img.hidden = !this.image;
      this._media.classList.toggle('pc__media--empty', !this.image);
    }

    if (changed.has('ratio')) {
      const ratio = RATIO.test(String(this.ratio || '').trim()) ? String(this.ratio).trim() : '1/1';
      for (const el of [this._img, this._media]) el.style.setProperty('--_pc-ratio', ratio);
    }

    if (changed.has('name') || changed.has('href') || changed.has('target')) {
      this._name.textContent = this.name || '';
      if (this.href) {
        this._name.href = this.href;
        if (this.target) this._name.target = this.target;
        else this._name.removeAttribute('target');
        if (this.target === '_blank') this._name.rel = 'noopener noreferrer';
        else this._name.removeAttribute('rel');
      } else {
        for (const a of ['href', 'target', 'rel']) this._name.removeAttribute(a);
      }
      this._heading.hidden = !this.name;
    }
    if (changed.has('headingLevel')) {
      const level = Number.isFinite(this.headingLevel) ? Math.min(6, Math.max(1, Math.round(this.headingLevel))) : 3;
      this._heading.setAttribute('aria-level', String(level));
    }

    if (changed.has('rating') || changed.has('reviews')) {
      const show = isNum(this.rating);
      this._rating.hidden = !show;
      if (show) this._rating.setAttribute('value', String(this.rating));
      if (isNum(this.reviews)) this._rating.setAttribute('reviews', String(this.reviews));
      else this._rating.removeAttribute('reviews');
    }

    if (['price', 'originalPrice', 'currency', 'size'].some((k) => changed.has(k))) {
      const p = this._price;
      if (isNum(this.price)) p.setAttribute('value', String(this.price));
      else p.removeAttribute('value');
      if (isNum(this.originalPrice)) p.setAttribute('original', String(this.originalPrice));
      else p.removeAttribute('original');
      p.setAttribute('currency', this.currency || 'VND');
      p.setAttribute('size', SIZES.includes(this.size) ? this.size : 'md');
      p.hidden = !isNum(this.price);
    }

    if (changed.has('badge')) {
      this._badgeText.textContent = this.badge || '';
      this._badgeText.hidden = !this.badge;
    }

    if (changed.has('wishlist') || changed.has('wishlisted') || changed.has('locale')) {
      this._wish.hidden = !this.wishlist;
      this._wish.setAttribute('aria-pressed', String(Boolean(this.wishlisted)));
      this._wish.setAttribute('aria-label', msg('product.wishlist'));
      this.setState('wishlisted', Boolean(this.wishlisted));
    }

    if (changed.has('soldOut') || changed.has('locale')) {
      this._soldOutText.textContent = msg('product.soldOut');
      this._soldOut.hidden = !this.soldOut;
      this._add.toggleAttribute('disabled', this.soldOut);
      this.setState('sold-out', this.soldOut);
    }

    if (changed.has('addText') || changed.has('noAddButton') || changed.has('size') || changed.has('locale')) {
      this._add.textContent = this.addText || msg('product.addToCart');
      this._add.setAttribute('size', this.size === 'lg' ? 'md' : 'sm');
      this._add.hidden = this.noAddButton;
    }
  }

  _toggleWishlist() {
    this.wishlisted = !this.wishlisted;
    if (this.wishlisted && canAnimate(this) && typeof this._wishIcon.animate === 'function') {
      this._wishIcon.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }],
        { duration: 360, easing: 'ease-out' },
      );
    }
    this.emit('hui-wishlist', { active: this.wishlisted });
  }

  _addToCart() {
    if (this.soldOut) return;
    this.emit('hui-add-to-cart', { name: this.name, price: this.price });
  }
}

defineElement('hui-product-card', HuiProductCard);

export { HuiProductCard };
export default HuiProductCard;
