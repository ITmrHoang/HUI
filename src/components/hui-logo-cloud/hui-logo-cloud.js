/**
 * HUI Logo Cloud — Dải / lưới logo khách hàng, đối tác (Organism).
 * Nhận `data` [{ src, alt, href, name }] hoặc <img> / <a><img></a> con (được sao chép vào bên trong).
 * `variant="grid"` lưới tĩnh | `variant="marquee"` chạy vô hạn (dùng <hui-marquee>); `grayscale` → xám, rê vào hiện màu.
 */

import styles from './hui-logo-cloud.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { createMsg, toLength, contentChildren } from '../hui-feature-card/landing-shared.js';
import '../hui-marquee/hui-marquee.js';

const msg = createMsg({
  'logoCloud.label': { vi: 'Khách hàng và đối tác', en: 'Customers and partners' },
});

const assigned = (slot) => slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());

/**
 * Con trực tiếp chỉ là nguồn dữ liệu khi `data` trống: được sao chép (cloneNode) vào lưới / dải chạy,
 * bản gốc không hiển thị — style logo do component quyết định (chiều cao, xám, khoảng cách).
 *
 * @slot title - Tiêu đề tùy biến phía trên (thay attribute heading)
 * @csspart base - Khung ngoài
 * @csspart title - Tiêu đề
 * @csspart list - Lưới logo (variant grid, role="list")
 * @csspart marquee - <hui-marquee> (variant marquee)
 * @csspart item - Ô chứa mỗi logo
 * @csspart link - Link bao logo (khi có href)
 * @csspart logo - Ảnh logo (hoặc chữ khi chỉ có name)
 * @cssprop --hui-logo-cloud-logo-height - Chiều cao logo (attribute logo-height ưu tiên; mặc định 40px)
 * @cssprop --hui-logo-cloud-gap - Khoảng cách logo (attribute gap ưu tiên)
 * @cssprop --hui-logo-cloud-min-width - Bề rộng tối thiểu mỗi ô lưới khi không đặt columns (mặc định 140px)
 * @cssprop --hui-logo-cloud-item-bg - Nền mỗi ô (mặc định trong suốt)
 * @cssprop --hui-logo-cloud-item-padding - Đệm mỗi ô
 * @cssprop --hui-logo-cloud-item-radius - Bo góc mỗi ô
 * @cssprop --hui-logo-cloud-opacity - Độ mờ logo khi grayscale (mặc định 0.6)
 * @cssprop --hui-logo-cloud-title-color - Màu tiêu đề
 * @cssprop --hui-logo-cloud-text-color - Màu logo dạng chữ
 */
class HuiLogoCloud extends HuiElement {
  static localized = true;

  static properties = {
    /** Mảng logo [{ src, alt, href, target, name }] — không có src → hiện name dạng chữ */
    data: { type: Array },
    /** grid | marquee — lưới tĩnh / dải chạy vô hạn */
    variant: { type: String, default: 'grid' },
    /** Logo xám + mờ, rê chuột / focus hiện màu */
    grayscale: { type: Boolean },
    /** Số cột cố định của lưới (khung hẹp tự giảm); bỏ trống = tự chia theo bề rộng */
    columns: { type: Number },
    /** Chiều cao logo: số (px) hoặc CSS length */
    logoHeight: { type: String },
    /** Khoảng cách logo: xs | sm | md | lg | xl, số (px) hoặc CSS length */
    gap: { type: String },
    /** Tốc độ dải chạy (px/giây, variant marquee) */
    speed: { type: Number, default: 40 },
    /** left | right — hướng chạy (variant marquee) */
    direction: { type: String, default: 'left' },
    /** Làm mờ 2 mép dải chạy */
    edgeFade: { type: Boolean },
    /** Tiêu đề nhỏ phía trên (vd "Được tin dùng bởi 500+ doanh nghiệp") */
    heading: { type: String },
    /** Nhãn ARIA của vùng logo (mặc định locale logoCloud.label) */
    label: { type: String },
    /** Tắt chuyển động (dải chạy thành hàng tĩnh cuộn tay được) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  get _isDataMode() {
    return Array.isArray(this.data) && this.data.length > 0;
  }

  connectedCallback() {
    super.connectedCallback();
    // Con trực tiếp đổi → dựng lại (chỉ khi không có data)
    this._observer = new MutationObserver(() => { if (!this._isDataMode) this._build(); });
    this._observer.observe(this, { childList: true, subtree: true, attributes: true, characterData: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = null;
  }

  render() {
    this._titleText = document.createTextNode('');
    this._titleSlot = createElement('slot', { name: 'title' }, this._titleText);
    this._titleSlot.addEventListener('slotchange', () => this._syncTitle());
    this._title = createElement('div', { className: 'lc__title', part: 'title' }, this._titleSlot);
    this._list = createElement('ul', { className: 'lc__list', part: 'list', role: 'list' });
    this._marquee = createElement('hui-marquee', { className: 'lc__marquee', part: 'marquee', 'pause-on-hover': '' });
    this._base = createElement('div', { className: 'lc', part: 'base' }, this._title, this._list, this._marquee);
    return this._base;
  }

  updated(changed) {
    const marquee = this.variant === 'marquee';
    if (['variant', 'grayscale', 'columns'].some((k) => changed.has(k))) {
      const cols = Number(this.columns);
      const fixed = Number.isFinite(cols) && cols > 0;
      this._base.className = ['lc', `lc--${marquee ? 'marquee' : 'grid'}`, this.grayscale ? 'lc--grayscale' : '', fixed ? 'lc--fixed' : '',
        fixed && cols > 3 ? 'lc--fixed-many' : ''].filter(Boolean).join(' ');
      if (fixed) this._base.style.setProperty('--_lc-cols', String(Math.round(cols)));
      else this._base.style.removeProperty('--_lc-cols');
    }
    if (changed.has('logoHeight')) {
      const h = toLength(this.logoHeight);
      if (h) this._base.style.setProperty('--_lc-height', h);
      else this._base.style.removeProperty('--_lc-height');
    }
    if (changed.has('gap')) {
      const g = toLength(this.gap);
      if (g) this._base.style.setProperty('--_lc-gap', g);
      else this._base.style.removeProperty('--_lc-gap');
    }

    // Thuộc tính của dải chạy
    const m = this._marquee;
    m.setAttribute('speed', String(Number(this.speed) > 0 ? this.speed : 40));
    m.setAttribute('direction', this.direction === 'right' ? 'right' : 'left');
    m.toggleAttribute('edge-fade', this.edgeFade);
    m.toggleAttribute('no-animation', this.noAnimation);
    if (this.gap) m.setAttribute('gap', this.gap);
    else m.removeAttribute('gap');

    if (['label', 'heading', 'locale', 'variant'].some((k) => changed.has(k))) {
      const label = this.label || this.heading || msg('logoCloud.label');
      this._list.setAttribute('aria-label', label);
      m.setAttribute('label', label);
    }
    if (changed.has('heading')) {
      this._titleText.textContent = this.heading ?? '';
      this._syncTitle();
    }

    if (changed.has('data') || changed.has('variant')) this._build();
  }

  _syncTitle() {
    this._title.hidden = !assigned(this._titleSlot) && !this.heading;
  }

  /** Dựng lại ô logo vào lưới hoặc dải chạy theo variant */
  _build() {
    if (!this._list) return;
    const marquee = this.variant === 'marquee';
    const nodes = this._isDataMode
      ? this.data.map((item) => this._fromData(item || {}))
      : contentChildren(this).filter((c) => !c.hasAttribute('slot')).map((c) => this._fromElement(c));
    const items = nodes.map((logo) => createElement(marquee ? 'div' : 'li', { className: 'lc__item', part: 'item' }, logo));
    this._list.hidden = marquee;
    this._marquee.hidden = !marquee;
    if (marquee) {
      this._list.replaceChildren();
      this._marquee.replaceChildren(...items);
    } else {
      this._marquee.replaceChildren();
      this._list.replaceChildren(...items);
    }
  }

  _fromData(item) {
    const logo = item.src
      ? createElement('img', { className: 'lc__logo', part: 'logo', src: String(item.src), alt: String(item.alt ?? item.name ?? ''), loading: 'lazy', decoding: 'async' })
      : createElement('span', { className: 'lc__logo lc__logo--text', part: 'logo' }, String(item.name ?? item.alt ?? ''));
    if (!item.href) return logo;
    const link = createElement('a', { className: 'lc__link', part: 'link', href: String(item.href) }, logo);
    if (item.target) link.target = String(item.target);
    if (item.target === '_blank') link.rel = 'noopener noreferrer';
    return link;
  }

  /** Phần tử con → bản sao gắn part (img trực tiếp hoặc img bên trong link) */
  _fromElement(el) {
    const clone = el.cloneNode(true);
    clone.removeAttribute('id');
    if (clone.localName === 'a') {
      clone.classList.add('lc__link');
      clone.setAttribute('part', 'link');
      clone.querySelectorAll('img, svg').forEach((n) => { n.classList.add('lc__logo'); n.setAttribute('part', 'logo'); });
    } else {
      clone.classList.add('lc__logo');
      clone.setAttribute('part', 'logo');
    }
    return clone;
  }
}

defineElement('hui-logo-cloud', HuiLogoCloud);

export { HuiLogoCloud };
export default HuiLogoCloud;
