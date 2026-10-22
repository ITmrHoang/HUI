/**
 * HUI Testimonial Slider — Băng chuyền lời nhận xét (Organism): `data` → các <hui-testimonial> trong <hui-scroller>
 * (cuộn native + scroll-snap, vuốt / kéo chuột / bàn phím, chấm chỉ trang, tự chạy tùy chọn).
 * Số thẻ mỗi khung nhìn đổi theo màn hình (mặc định 1 → 2 → 3).
 */

import styles from './hui-testimonial-slider.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { createMsg, contentChildren } from '../hui-feature-card/landing-shared.js';
import '../hui-scroller/hui-scroller.js';
import '../hui-testimonial/hui-testimonial.js';

const msg = createMsg({
  'testimonialSlider.label': { vi: 'Nhận xét của khách hàng', en: 'Customer testimonials' },
});

/** Trường của item → attribute của hui-testimonial */
const ITEM_ATTRS = {
  quote: 'quote', author: 'author', jobTitle: 'job-title', company: 'company', avatar: 'avatar', rating: 'rating', href: 'href',
};

/**
 * Con trực tiếp (vd <hui-testimonial>) chỉ dùng khi `data` trống: được sao chép (cloneNode) vào băng chuyền.
 *
 * @fires hui-scroll - Từ hui-scroller: vị trí cuộn đổi. detail: { index, progress, atStart, atEnd }
 * @csspart base - Khung ngoài
 * @csspart scroller - <hui-scroller> (kèm scroller-viewport, scroller-prev, scroller-next, scroller-indicator, scroller-dot, scroller-dot-active)
 * @csspart item - Mỗi <hui-testimonial>
 */
class HuiTestimonialSlider extends HuiElement {
  static localized = true;

  static properties = {
    /** Mảng nhận xét [{ quote, author, jobTitle, company, avatar, rating, href }] */
    data: { type: Array },
    /** card | plain | bubble — variant của từng hui-testimonial */
    variant: { type: String, default: 'card' },
    /** start | center — căn nội dung thẻ */
    align: { type: String, default: 'start' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Hiệu ứng hui-card cho mọi thẻ (lift | tilt | glow…) */
    effect: { type: String },
    /** Số thẻ mỗi khung nhìn (màn hình nhỏ; cho phép lẻ, vd 1.15 lộ thẻ kế) */
    itemsPerView: { type: Number, default: 1 },
    /** Số thẻ khi màn hình ≥ 768px */
    itemsPerViewMd: { type: Number, default: 2 },
    /** Số thẻ khi màn hình ≥ 992px */
    itemsPerViewLg: { type: Number, default: 3 },
    /** Tự chuyển sau mỗi N ms (attribute rỗng = 5000); dừng khi hover / focus / tab ẩn / giảm chuyển động */
    autoplay: { type: Number, default: 0 },
    /** dots | bar | none — chỉ báo vị trí */
    indicator: { type: String, default: 'dots' },
    /** auto | always | never — nút mũi tên (auto: chỉ thiết bị có chuột) */
    arrows: { type: String, default: 'auto' },
    /** Khoảng cách thẻ: xs | sm | md | lg | xl, số (px) hoặc CSS length */
    gap: { type: String, default: 'lg' },
    /** Nhãn ARIA của vùng (mặc định locale "Nhận xét của khách hàng") */
    label: { type: String },
    /** Tắt cuộn mượt / tự chạy */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  get _isDataMode() {
    return Array.isArray(this.data) && this.data.length > 0;
  }

  /** <hui-scroller> bên trong (gọi next() / prev() / scrollToIndex()) */
  get scroller() {
    return this._scroller;
  }

  connectedCallback() {
    super.connectedCallback();
    this._observer = new MutationObserver(() => { if (!this._isDataMode) this._build(); });
    this._observer.observe(this, { childList: true, subtree: true, attributes: true, characterData: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = null;
  }

  render() {
    this._scroller = createElement('hui-scroller', {
      className: 'ts__scroller', part: 'scroller', snap: 'start',
      exportparts: 'viewport: scroller-viewport, prev: scroller-prev, next: scroller-next, indicator: scroller-indicator, dot: scroller-dot, dot-active: scroller-dot-active',
    });
    return createElement('div', { className: 'ts', part: 'base' }, this._scroller);
  }

  updated(changed) {
    const s = this._scroller;
    const set = (attr, value) => {
      if (value === null || value === undefined || value === '' || value === false) s.removeAttribute(attr);
      else s.setAttribute(attr, value === true ? '' : String(value));
    };
    set('items-per-view', this.itemsPerView);
    set('items-per-view-md', this.itemsPerViewMd);
    set('items-per-view-lg', this.itemsPerViewLg);
    set('indicator', ['dots', 'bar', 'none'].includes(this.indicator) ? this.indicator : 'dots');
    set('arrows', this.arrows);
    set('gap', this.gap);
    // Đã có chấm / thanh chỉ vị trí → ẩn thanh cuộn của trình duyệt
    set('scrollbar', this.indicator === 'none' ? 'auto' : 'hidden');
    set('no-animation', this.noAnimation);
    // Attribute rỗng (<… autoplay>) = 5000ms; autoplay="0" = tắt
    const ms = this.autoplay > 0 ? this.autoplay : this.getAttribute('autoplay') === '' ? 5000 : 0;
    set('autoplay', ms > 0 && !this.noAnimation ? ms : null);
    if (changed.has('label') || changed.has('locale')) set('label', this.label || msg('testimonialSlider.label'));

    if (changed.has('data')) this._build();
    else if (['variant', 'align', 'size', 'effect'].some((k) => changed.has(k))) {
      if (this._isDataMode) this._items().forEach((el) => this._applyShared(el));
      else this._build();
    }
  }

  _items() {
    return [...this._scroller.children].filter((c) => c.localName === 'hui-testimonial');
  }

  _build() {
    if (!this._scroller) return;
    const nodes = this._isDataMode
      ? this.data.map((item) => {
        const el = createElement('hui-testimonial', { part: 'item' });
        for (const [key, attr] of Object.entries(ITEM_ATTRS)) {
          const v = item?.[key];
          if (v !== undefined && v !== null && v !== '') el.setAttribute(attr, String(v));
        }
        this._applyShared(el);
        return el;
      })
      : contentChildren(this).map((c) => {
        const clone = c.cloneNode(true);
        clone.removeAttribute('id');
        clone.setAttribute('part', 'item');
        if (clone.localName === 'hui-testimonial') this._applyShared(clone, true);
        return clone;
      });
    this._scroller.replaceChildren(...nodes);
  }

  /** Thuộc tính chung; với thẻ sao chép từ con chỉ điền khi thẻ chưa tự đặt */
  _applyShared(el, keepOwn = false) {
    for (const [attr, value] of [['variant', this.variant], ['align', this.align], ['size', this.size], ['effect', this.effect]]) {
      if (keepOwn && el.hasAttribute(attr)) continue;
      if (value) el.setAttribute(attr, String(value));
      else el.removeAttribute(attr);
    }
  }
}

defineElement('hui-testimonial-slider', HuiTestimonialSlider);

export { HuiTestimonialSlider };
export default HuiTestimonialSlider;
