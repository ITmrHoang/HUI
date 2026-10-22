/**
 * HUI CTA Banner — Dải kêu gọi hành động (Organism): tiêu đề, mô tả, nút; nền màu / gradient / viền;
 * bố cục ngang (inline) hoặc xếp chồng (stacked); có thể đóng (dismissible).
 */

import styles from './hui-cta-banner.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { animateOut } from '../../utils/motion.js';
import { createMsg, colorValue, headingLevel } from '../hui-feature-card/landing-shared.js';
import '../hui-icon/hui-icon.js';

const msg = createMsg({
  'ctaBanner.close': { vi: 'Đóng', en: 'Dismiss' },
});

const VARIANTS = ['filled', 'gradient', 'outline'];
const assigned = (slot) => slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());

/**
 * @fires hui-close - Bấm nút đóng (trước khi ẩn). Cancelable: preventDefault() để giữ banner
 * @slot - Nội dung thêm dưới mô tả
 * @slot title - Tiêu đề tùy biến (thay attribute heading)
 * @slot description - Mô tả tùy biến (thay attribute description)
 * @slot actions - Các nút hành động (trên nền filled / gradient nên dùng hui-button variant="secondary")
 * @slot icon - Icon / hình minh họa bên trái (thay attribute icon)
 * @csspart base - Khung banner (<section>)
 * @csspart icon - Vùng icon
 * @csspart content - Cột chữ
 * @csspart title - Tiêu đề (role heading)
 * @csspart description - Mô tả
 * @csspart actions - Hàng nút
 * @csspart close - Nút đóng
 * @cssprop --hui-cta-banner-bg - Nền (ghi đè theo variant)
 * @cssprop --hui-cta-banner-gradient - Dải màu của variant gradient
 * @cssprop --hui-cta-banner-color - Màu chữ
 * @cssprop --hui-cta-banner-border-color - Màu viền (variant outline)
 * @cssprop --hui-cta-banner-radius - Bo góc (mặc định --hui-radius-xl)
 * @cssprop --hui-cta-banner-padding - Đệm trong
 * @cssprop --hui-cta-banner-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-cta-banner-description-color - Màu mô tả
 * @cssprop --hui-cta-banner-shadow - Bóng đổ
 */
class HuiCtaBanner extends HuiElement {
  static localized = true;

  static properties = {
    /** Tiêu đề */
    heading: { type: String },
    /** Cấp heading của tiêu đề (aria-level) */
    headingLevel: { type: Number, default: 2 },
    /** Mô tả */
    description: { type: String },
    /** filled | gradient | outline — nền màu / gradient / viền màu trên nền trong */
    variant: { type: String, default: 'filled' },
    /** inline | stacked — chữ trái + nút phải / xếp chồng căn giữa */
    layout: { type: String, default: 'inline' },
    /** primary | secondary | success | warning | danger | info hoặc màu CSS */
    color: { type: String, default: 'primary' },
    /** Tên icon hui-icon bên trái (slot icon thay được) */
    icon: { type: String },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Hiện nút đóng */
    dismissible: { type: Boolean },
    /** Đã đóng (ẩn banner) — gỡ attribute để hiện lại */
    dismissed: { type: Boolean },
    /** Tắt hiệu ứng đóng */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    const slot = (name, ...fallback) => {
      const s = createElement('slot', name ? { name } : {}, ...fallback);
      s.addEventListener('slotchange', () => this._syncSections());
      return s;
    };
    this._iconEl = createElement('hui-icon');
    this._iconSlot = slot('icon', this._iconEl);
    this._iconBox = createElement('div', { className: 'cta__icon', part: 'icon', 'aria-hidden': 'true' }, this._iconSlot);

    this._titleText = document.createTextNode('');
    this._titleSlot = slot('title', this._titleText);
    this._title = createElement('div', { className: 'cta__title', part: 'title', role: 'heading', id: 'title' }, this._titleSlot);
    this._descText = document.createTextNode('');
    this._descSlot = slot('description', this._descText);
    this._desc = createElement('div', { className: 'cta__desc', part: 'description' }, this._descSlot);
    this._extraSlot = slot();
    this._extra = createElement('div', { className: 'cta__extra' }, this._extraSlot);
    this._content = createElement('div', { className: 'cta__content', part: 'content' }, this._title, this._desc, this._extra);

    this._actionsSlot = slot('actions');
    this._actions = createElement('div', { className: 'cta__actions', part: 'actions' }, this._actionsSlot);

    this._close = createElement('button', { type: 'button', className: 'cta__close', part: 'close' },
      createElement('hui-icon', { name: 'close' }));
    this._close.addEventListener('click', () => this.dismiss());

    this._base = createElement('section', { className: 'cta', part: 'base' },
      this._iconBox, this._content, this._actions, this._close);
    return this._base;
  }

  updated(changed) {
    if (['variant', 'layout', 'size', 'dismissible'].some((k) => changed.has(k))) {
      this._base.className = [
        'cta',
        `cta--${VARIANTS.includes(this.variant) ? this.variant : 'filled'}`,
        `cta--${this.layout === 'stacked' ? 'stacked' : 'inline'}`,
        `cta--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
        this.dismissible ? 'cta--dismissible' : '',
      ].filter(Boolean).join(' ');
    }
    if (changed.has('color')) this._base.style.setProperty('--_cta-color', colorValue(this.color) || 'var(--hui-primary)');
    if (changed.has('icon')) {
      if (this.icon) this._iconEl.setAttribute('name', this.icon);
      else this._iconEl.removeAttribute('name');
    }
    if (changed.has('heading')) this._titleText.textContent = this.heading ?? '';
    if (changed.has('description')) this._descText.textContent = this.description ?? '';
    if (changed.has('headingLevel')) this._title.setAttribute('aria-level', String(headingLevel(this.headingLevel, 2)));
    if (changed.has('dismissible') || changed.has('locale')) {
      this._close.hidden = !this.dismissible;
      this._close.setAttribute('aria-label', msg('ctaBanner.close'));
    }
    this._syncSections();
  }

  /** Đóng banner (như bấm nút ×): phát hui-close (hủy được) → hiệu ứng thu nhỏ → dismissed */
  async dismiss() {
    if (this.dismissed) return;
    const ok = this.emit('hui-close', null, { cancelable: true });
    if (!ok) return;
    if (!this.noAnimation) await animateOut(this._base, 'zoom', { duration: 200 });
    this.dismissed = true;
  }

  _syncSections() {
    if (!this._base) return;
    this._iconBox.hidden = !assigned(this._iconSlot) && !this.icon;
    this._title.hidden = !assigned(this._titleSlot) && !this.heading;
    this._desc.hidden = !assigned(this._descSlot) && !this.description;
    this._extra.hidden = !assigned(this._extraSlot);
    this._actions.hidden = !assigned(this._actionsSlot);
    if (!this._title.hidden) this._base.setAttribute('aria-labelledby', 'title');
    else this._base.removeAttribute('aria-labelledby');
  }
}

defineElement('hui-cta-banner', HuiCtaBanner);

export { HuiCtaBanner };
export default HuiCtaBanner;
