/**
 * HUI Pricing Card — Thẻ gói giá (Molecule): tên gói, giá / kỳ (tháng ↔ năm), mô tả, tính năng ✓/✗,
 * nút CTA, gói nổi bật (phóng to + viền chạy + ruy-băng "Phổ biến"). Dựng trên <hui-card>.
 */

import styles from './hui-pricing-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import {
  forwardToCard, createMsg, createForwardSlot, hasContent, canAnimate, isNum, CARD_EXPORTPARTS,
} from '../hui-product-card/card-shared.js';
import '../hui-card/hui-card.js';
import '../hui-button/hui-button.js';
import '../hui-icon/hui-icon.js';
import '../hui-price/hui-price.js';
import '../hui-badge/hui-badge-ribbon.js';

const msg = createMsg({
  'pricing.popular': { vi: 'Phổ biến', en: 'Popular' },
  'pricing.month': { vi: '/tháng', en: '/month' },
  'pricing.year': { vi: '/năm', en: '/year' },
  'pricing.cta': { vi: 'Chọn gói', en: 'Choose plan' },
  'pricing.included': { vi: 'Có', en: 'Included' },
  'pricing.excluded': { vi: 'Không có', en: 'Not included' },
  'pricing.save': { vi: 'Tiết kiệm {percent}%', en: 'Save {percent}%' },
});

/** 'Tên' | { text, included } → { text, included } */
const normalizeFeature = (f) => (f && typeof f === 'object'
  ? { text: String(f.text ?? f.label ?? ''), included: f.included !== false }
  : { text: String(f ?? ''), included: true });

/**
 * Thẻ gói giá. `features` (property mảng chuỗi hoặc { text, included }) hoặc slot <li>
 * (`<li data-excluded>` = tính năng không có). `billing="yearly"` + `yearly-price` → đổi giá hiển thị.
 *
 * @fires hui-select - Bấm nút CTA. detail: { plan, billing, price }. Cancelable: preventDefault() để không mở cta-href
 * @slot - Thêm tính năng dạng <li> (sau danh sách features)
 * @slot icon - Icon / hình minh họa trên tên gói
 * @slot footer - Chân thẻ (vd "Không cần thẻ tín dụng")
 * @slot overlay - Lớp phủ (chuyển xuống hui-card)
 * @csspart ribbon - Ruy-băng "Phổ biến" (kèm ribbon-text)
 * @csspart icon - Vùng icon
 * @csspart plan - Tên gói
 * @csspart description - Mô tả
 * @csspart pricing - Hàng giá
 * @csspart price - <hui-price>; kèm price-value, price-suffix, price-original
 * @csspart save - Nhãn "Tiết kiệm x%" (billing yearly)
 * @csspart features - Danh sách tính năng (<ul>)
 * @csspart feature - Mỗi tính năng; kèm feature-included | feature-excluded
 * @csspart feature-icon - Icon ✓ / ✗
 * @csspart cta - Nút CTA (<hui-button>); kèm cta-base
 * @csspart card - Khung <hui-card> (và cover, main, header, body, skeleton, actions, footer, overlay, card-link, card-check, card-glow)
 * @cssprop --hui-pricing-card-accent - Màu nhấn (icon, giá, ✓) — mặc định primary
 * @cssprop --hui-pricing-card-plan-color - Màu tên gói
 * @cssprop --hui-pricing-card-plan-font-size - Cỡ chữ tên gói
 * @cssprop --hui-pricing-card-price-font-size - Cỡ chữ giá
 * @cssprop --hui-pricing-card-check-color - Màu dấu ✓
 * @cssprop --hui-pricing-card-excluded-color - Màu tính năng không có
 * @cssprop --hui-pricing-card-feature-gap - Khoảng cách giữa các tính năng
 * @cssprop --hui-pricing-card-highlight-scale - Độ phóng gói nổi bật (mặc định 1.04)
 */
class HuiPricingCard extends HuiElement {
  static localized = true;

  static properties = {
    /** Tên gói */
    plan: { type: String },
    /** Cấp heading của tên gói (aria-level) */
    headingLevel: { type: Number, default: 3 },
    /** Giá theo tháng (0 = "Miễn phí") */
    price: { type: Number },
    /** Giá theo năm (dùng khi billing="yearly") */
    yearlyPrice: { type: Number },
    /** monthly | yearly — kỳ thanh toán đang hiển thị */
    billing: { type: String, default: 'monthly' },
    /** Kỳ của giá tháng (mặc định locale pricing.month "/tháng") */
    period: { type: String },
    /** Kỳ của giá năm (mặc định locale pricing.year "/năm") */
    yearlyPeriod: { type: String },
    /** Mã tiền tệ ISO 4217 */
    currency: { type: String, default: 'VND' },
    /** Mô tả ngắn dưới tên gói */
    description: { type: String },
    /** Mảng tính năng: chuỗi hoặc { text, included } (attribute nhận JSON) */
    features: { type: Array },
    /** Gói nổi bật: phóng to + effect border-gradient + ruy-băng */
    highlighted: { type: Boolean },
    /** Chữ ruy-băng (mặc định locale pricing.popular "Phổ biến") */
    highlightText: { type: String },
    /** Chữ nút CTA (mặc định locale pricing.cta "Chọn gói") */
    ctaText: { type: String },
    /** Link mở khi bấm CTA (bỏ trống = chỉ phát hui-select) */
    ctaHref: { type: String },
    /** Hiệu ứng của hui-card: lift | tilt | glow | zoom-media | reveal | border-gradient (highlighted tự thêm border-gradient) */
    effect: { type: String },
    /** Cả card là link (chuyển xuống hui-card) */
    href: { type: String },
    /** target của link */
    target: { type: String },
    /** elevated | outlined | filled | ghost — biến thể hui-card */
    variant: { type: String, default: 'outlined' },
    /** vertical | horizontal */
    orientation: { type: String, default: 'vertical' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Skeleton thay cho nội dung */
    loading: { type: Boolean },
    /** Tắt chuyển động (phóng to, viền chạy, đổi giá) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  /** Giá đang hiển thị theo billing */
  get currentPrice() {
    return this._isYearly ? this.yearlyPrice : this.price;
  }

  get _isYearly() {
    return this.billing === 'yearly' && isNum(this.yearlyPrice);
  }

  render() {
    this._iconSlot = createElement('slot', { name: 'icon' });
    this._icon = createElement('div', { className: 'pr__icon', part: 'icon' }, this._iconSlot);
    this._iconSlot.addEventListener('slotchange', () => { this._icon.hidden = !hasContent(this._iconSlot); });

    this._plan = createElement('div', { className: 'pr__plan', part: 'plan', role: 'heading' });
    this._desc = createElement('p', { className: 'pr__desc', part: 'description' });

    this._price = createElement('hui-price', {
      className: 'pr__price', part: 'price', size: 'lg', 'show-discount': 'false',
      exportparts: 'value: price-value, suffix: price-suffix, original: price-original',
    });
    this._save = createElement('span', { className: 'pr__save', part: 'save' });
    this._pricing = createElement('div', { className: 'pr__pricing', part: 'pricing' }, this._price, this._save);

    this._featureItems = [];
    this._userFeatures = createElement('slot');
    this._userFeatures.addEventListener('slotchange', () => this._syncFeaturesVisible());
    this._features = createElement('ul', { className: 'pr__features', part: 'features', role: 'list' }, this._userFeatures);

    this._cta = createElement('hui-button', { className: 'pr__cta', part: 'cta', exportparts: 'base: cta-base', block: '' });
    this._cta.addEventListener('hui-click', () => this._select());
    this._ctaLink = createElement('a', { hidden: true, tabindex: '-1', 'aria-hidden': 'true' });

    this._card = createElement('hui-card', { className: 'pr__card', exportparts: CARD_EXPORTPARTS },
      createElement('div', { className: 'pr__body' },
        this._icon,
        createElement('div', { className: 'pr__head' }, this._plan, this._desc),
        this._pricing,
        this._features),
      createElement('div', { slot: 'actions', className: 'pr__actions' }, this._cta, this._ctaLink),
      createForwardSlot('footer'),
      createForwardSlot('overlay'));

    this._ribbon = createElement('hui-badge-ribbon', {
      className: 'pr__ribbon', exportparts: 'ribbon, text: ribbon-text',
    }, this._card);
    return this._ribbon;
  }

  firstUpdated() {
    this._icon.hidden = !hasContent(this._iconSlot);
  }

  updated(changed) {
    // highlighted → thêm border-gradient vào effect của hui-card
    const fx = [...new Set([...(this.effect || '').split(/\s+/).filter(Boolean), ...(this.highlighted ? ['border-gradient'] : [])])].join(' ');
    forwardToCard(this, this._card, changed, { effect: fx }, ['highlighted']);

    if (changed.has('plan')) this._plan.textContent = this.plan || '';
    if (changed.has('headingLevel')) {
      const level = Number.isFinite(this.headingLevel) ? Math.min(6, Math.max(1, Math.round(this.headingLevel))) : 3;
      this._plan.setAttribute('aria-level', String(level));
    }
    if (changed.has('description')) {
      this._desc.textContent = this.description || '';
      this._desc.hidden = !this.description;
    }

    if (changed.has('highlighted') || changed.has('highlightText') || changed.has('locale')) {
      this._ribbon.setAttribute('text', this.highlightText || msg('pricing.popular'));
      this._ribbon.toggleAttribute('data-active', this.highlighted);
      this.setState('highlighted', this.highlighted);
    }

    if (['price', 'yearlyPrice', 'billing', 'period', 'yearlyPeriod', 'currency', 'locale'].some((k) => changed.has(k))) {
      this._syncPrice(changed.has('billing') && changed.get('billing') !== undefined);
    }

    if (changed.has('features') || changed.has('locale')) this._renderFeatures();

    if (['ctaText', 'ctaHref', 'highlighted', 'size', 'locale'].some((k) => changed.has(k))) {
      this._cta.textContent = this.ctaText || msg('pricing.cta');
      this._cta.setAttribute('variant', this.highlighted ? 'primary' : 'outline');
      this._cta.setAttribute('size', this.size === 'sm' ? 'sm' : (this.size === 'lg' ? 'lg' : 'md'));
      if (this.ctaHref) this._ctaLink.href = this.ctaHref;
      else this._ctaLink.removeAttribute('href');
    }
  }

  _syncPrice(animate) {
    const yearly = this._isYearly;
    const value = yearly ? this.yearlyPrice : this.price;
    const p = this._price;
    if (isNum(value)) p.setAttribute('value', String(value));
    else p.removeAttribute('value');
    p.setAttribute('currency', this.currency || 'VND');
    p.setAttribute('suffix', yearly ? (this.yearlyPeriod || msg('pricing.year')) : (this.period || msg('pricing.month')));
    this._pricing.hidden = !isNum(value);

    // Năm rẻ hơn 12 tháng → "Tiết kiệm x%"
    const full = Number(this.price) * 12;
    const percent = yearly && isNum(this.price) && full > 0 ? Math.round((1 - Number(this.yearlyPrice) / full) * 100) : 0;
    this._save.textContent = percent > 0 ? msg('pricing.save', { percent }) : '';
    this._save.hidden = percent <= 0;
    this.setState('yearly', yearly);

    if (animate && canAnimate(this) && typeof this._pricing.animate === 'function') {
      this._pricing.animate(
        [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
        { duration: 240, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' },
      );
    }
  }

  _renderFeatures() {
    const list = Array.isArray(this.features) ? this.features.map(normalizeFeature).filter((f) => f.text) : [];
    const items = list.map((f) => createElement('li', {
      className: `pr__feature ${f.included ? 'pr__feature--included' : 'pr__feature--excluded'}`,
      part: `feature ${f.included ? 'feature-included' : 'feature-excluded'}`,
    },
    createElement('hui-icon', {
      className: 'pr__feature-icon', part: 'feature-icon',
      name: f.included ? 'check' : 'close',
      label: msg(f.included ? 'pricing.included' : 'pricing.excluded'),
    }),
    createElement('span', { className: 'pr__feature-text' }, f.text)));
    // li sinh ra đứng trước slot (li người dùng truyền vào nằm sau)
    for (const li of this._featureItems) li.remove();
    for (const li of items) this._features.insertBefore(li, this._userFeatures);
    this._featureItems = items;
    this._syncFeaturesVisible();
  }

  _syncFeaturesVisible() {
    this._features.hidden = !this._featureItems.length && !hasContent(this._userFeatures);
  }

  _select() {
    const ok = this.emit('hui-select', { plan: this.plan, billing: this._isYearly ? 'yearly' : 'monthly', price: this.currentPrice }, { cancelable: true });
    if (ok && this.ctaHref) this._ctaLink.click();
  }
}

defineElement('hui-pricing-card', HuiPricingCard);

export { HuiPricingCard };
export default HuiPricingCard;
