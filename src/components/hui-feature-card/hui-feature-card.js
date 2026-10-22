/**
 * HUI Feature Card — Thẻ tính năng cho landing page (Molecule): icon lớn trong vòng tròn tô màu nhạt,
 * tiêu đề, mô tả, link "Tìm hiểu thêm →". Dựng trên <hui-card> (hưởng effect lift / tilt / glow…).
 */

import styles from './hui-feature-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import {
  TitleAttrMixin, createMsg, createForwardSlot, forwardToCard, hasContent, colorValue,
  headingLevel, CARD_EXPORTPARTS,
} from './landing-shared.js';
import '../hui-card/hui-card.js';
import '../hui-icon/hui-icon.js';


const msg = createMsg({
  'featureCard.more': { vi: 'Tìm hiểu thêm', en: 'Learn more' },
});

/** variant của feature card → variant của hui-card */
const CARD_VARIANT = { plain: 'ghost', card: 'elevated', outline: 'outlined' };

/**
 * Thẻ tính năng. `href` → hiện link "Tìm hiểu thêm →" và cả thẻ bấm được (link là điểm Tab duy nhất).
 *
 * @slot - Nội dung thêm dưới mô tả
 * @slot icon - Icon / hình minh họa tùy biến (thay attribute icon)
 * @slot actions - Thanh hành động (chuyển xuống hui-card)
 * @slot footer - Chân thẻ (chuyển xuống hui-card)
 * @csspart base - Khung bố cục icon + nội dung
 * @csspart icon - Vòng tròn chứa icon
 * @csspart content - Cột nội dung
 * @csspart heading - Tiêu đề (role heading)
 * @csspart description - Mô tả
 * @csspart link - Link "Tìm hiểu thêm"
 * @csspart link-icon - Mũi tên trong link
 * @csspart card - Khung <hui-card> (và cover, main, header, body, skeleton, actions, footer, overlay, card-link, card-check, card-glow)
 * @cssprop --hui-feature-card-accent - Màu nhấn (icon, link) — mặc định theo `color` / primary
 * @cssprop --hui-feature-card-icon-bg - Nền vòng icon (mặc định accent pha 14%)
 * @cssprop --hui-feature-card-icon-size - Đường kính vòng icon (mặc định 40 / 56 / 72px theo size)
 * @cssprop --hui-feature-card-icon-radius - Bo góc vòng icon (mặc định theo icon-shape)
 * @cssprop --hui-feature-card-title-color - Màu tiêu đề
 * @cssprop --hui-feature-card-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-feature-card-description-color - Màu mô tả
 * @cssprop --hui-feature-card-gap - Khoảng cách các dòng
 */
class HuiFeatureCard extends TitleAttrMixin(HuiElement) {
  static localized = true;

  static properties = {
    /** Tên icon trong bộ hui-icon (slot icon ưu tiên hơn) */
    icon: { type: String },
    /** Tiêu đề. Attribute bị gỡ khỏi host để không hiện tooltip native */
    title: { type: String, reflect: false },
    /** Cấp heading của tiêu đề (aria-level) */
    headingLevel: { type: Number, default: 3 },
    /** Mô tả ngắn */
    description: { type: String },
    /** Link chi tiết — hiện link "Tìm hiểu thêm →", cả thẻ bấm được */
    href: { type: String },
    /** target của link (vd _blank) */
    target: { type: String },
    /** Chữ của link (mặc định locale featureCard.more "Tìm hiểu thêm") */
    linkText: { type: String },
    /** plain | card | outline — chữ trơn / thẻ nổi / thẻ viền */
    variant: { type: String, default: 'card' },
    /** start | center — căn nội dung */
    align: { type: String, default: 'start' },
    /** vertical | horizontal — horizontal: icon bên trái nội dung */
    orientation: { type: String, default: 'vertical' },
    /** primary | secondary | success | warning | danger | info hoặc màu CSS — màu icon + link */
    color: { type: String, default: 'primary' },
    /** circle | rounded | square — hình khung icon */
    iconShape: { type: String, default: 'circle' },
    /** Hiệu ứng của hui-card: lift | tilt | glow | zoom-media | reveal | border-gradient */
    effect: { type: String },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Skeleton thay cho nội dung */
    loading: { type: Boolean },
    /** Tắt chuyển động */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._iconEl = createElement('hui-icon', { className: 'fc__icon-svg' });
    this._iconSlot = createElement('slot', { name: 'icon' }, this._iconEl);
    this._iconSlot.addEventListener('slotchange', () => this._syncIcon());
    this._icon = createElement('div', { className: 'fc__icon', part: 'icon', 'aria-hidden': 'true' }, this._iconSlot);

    this._heading = createElement('div', { className: 'fc__heading', part: 'heading', role: 'heading' });
    this._desc = createElement('p', { className: 'fc__desc', part: 'description' });
    this._extraSlot = createElement('slot');
    this._extra = createElement('div', { className: 'fc__extra' }, this._extraSlot);
    this._extraSlot.addEventListener('slotchange', () => { this._extra.hidden = !hasContent(this._extraSlot); });

    this._linkText = createElement('span');
    this._link = createElement('a', { className: 'fc__link', part: 'link' }, this._linkText,
      createElement('hui-icon', { className: 'fc__link-icon', part: 'link-icon', name: 'arrow-right' }));

    this._base = createElement('div', { className: 'fc', part: 'base' },
      this._icon,
      createElement('div', { className: 'fc__content', part: 'content' }, this._heading, this._desc, this._extra, this._link));

    this._card = createElement('hui-card', { className: 'fc__card', exportparts: CARD_EXPORTPARTS },
      this._base, createForwardSlot('actions'), createForwardSlot('footer'));
    return this._card;
  }

  firstUpdated() {
    this._extra.hidden = !hasContent(this._extraSlot);
    this._syncIcon();
  }

  updated(changed) {
    // orientation do feature card tự bố cục (icon trái) — không chuyển xuống hui-card (vốn dành cho ảnh cover)
    forwardToCard(this, this._card, changed, {
      variant: CARD_VARIANT[this.variant] || 'elevated',
      orientation: null,
    });

    if (['variant', 'align', 'orientation', 'size', 'iconShape'].some((k) => changed.has(k))) {
      this._base.className = [
        'fc',
        `fc--${CARD_VARIANT[this.variant] ? this.variant : 'card'}`,
        `fc--${this.align === 'center' ? 'center' : 'start'}`,
        `fc--${this.orientation === 'horizontal' ? 'horizontal' : 'vertical'}`,
        `fc--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
        `fc--shape-${['rounded', 'square'].includes(this.iconShape) ? this.iconShape : 'circle'}`,
      ].join(' ');
      this._card.classList.toggle('fc__card--plain', this.variant === 'plain');
    }

    if (changed.has('color')) this._base.style.setProperty('--_fc-accent', colorValue(this.color) || 'var(--hui-primary)');

    if (changed.has('icon')) {
      if (this.icon) this._iconEl.setAttribute('name', this.icon);
      else this._iconEl.removeAttribute('name');
      this._syncIcon();
    }

    if (changed.has('title')) {
      this._heading.textContent = this.title || '';
      this._heading.hidden = !this.title;
    }
    if (changed.has('headingLevel')) this._heading.setAttribute('aria-level', String(headingLevel(this.headingLevel)));

    if (changed.has('description')) {
      this._desc.textContent = this.description || '';
      this._desc.hidden = !this.description;
    }

    if (['href', 'target', 'linkText', 'title', 'locale'].some((k) => changed.has(k))) this._syncLink();
  }

  _syncLink() {
    const link = this._link;
    this._linkText.textContent = this.linkText || msg('featureCard.more');
    link.hidden = !this.href;
    if (this.href) {
      link.href = this.href;
      if (this.target) link.target = this.target;
      else link.removeAttribute('target');
      if (this.target === '_blank') link.rel = 'noopener noreferrer';
      else link.removeAttribute('rel');
      // "Tìm hiểu thêm" lặp lại ở mọi thẻ → gắn tên tiêu đề để trình đọc màn hình phân biệt
      if (this.title) link.setAttribute('aria-label', `${this._linkText.textContent}: ${this.title}`);
      else link.removeAttribute('aria-label');
    } else {
      for (const a of ['href', 'target', 'rel', 'aria-label']) link.removeAttribute(a);
    }
  }

  _syncIcon() {
    if (!this._icon) return;
    const slotted = this._iconSlot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    this._icon.hidden = !slotted && !this.icon;
  }
}

defineElement('hui-feature-card', HuiFeatureCard);

export { HuiFeatureCard };
export default HuiFeatureCard;
