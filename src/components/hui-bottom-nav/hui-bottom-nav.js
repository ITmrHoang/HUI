/**
 * HUI Bottom Nav — Thanh điều hướng đáy cho mobile: icon + nhãn, badge (hui-badge), icon nhún khi chọn,
 * chừa vùng an toàn (safe-area), tùy chọn ẩn khi cuộn xuống / hiện khi cuộn lên.
 */

import styles from './hui-bottom-nav.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import { onScroll } from '../../utils/scroll.js';
import '../hui-icon/index.js';
import '../hui-badge/index.js';

const LABELS = ['always', 'selected'];
const POSITIONS = ['fixed', 'static'];

const FALLBACK = {
  vi: { 'bottomNav.label': 'Điều hướng nhanh' },
  en: { 'bottomNav.label': 'Quick navigation' },
};
function tx(key) {
  const v = t(key);
  return v !== key ? v : (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

/**
 * Thanh điều hướng đáy. Mỗi mục `items`: { value, label, icon, href, badge, dot, disabled }.
 * Có `href` → thẻ <a> (điều hướng native); không có → <button>. Mục đang chọn có `aria-current`.
 * Trang nên chừa `padding-bottom` bằng chiều cao thanh (≈ 64px + safe-area) để nội dung cuối không bị che.
 *
 * @fires hui-change - Người dùng chọn mục khác. Cancelable (preventDefault() → giữ mục cũ, chặn điều hướng). detail: { value, previous, item }
 * @csspart base - Thẻ <nav>
 * @csspart list - Danh sách mục
 * @csspart item - Mỗi mục (a | button)
 * @csspart indicator - Nền viên thuốc sau icon của mục đang chọn
 * @csspart icon - hui-icon
 * @csspart badge - hui-badge bọc icon
 * @csspart label - Nhãn
 * @cssprop --hui-bottom-nav-bg - Nền thanh
 * @cssprop --hui-bottom-nav-color - Màu mục thường
 * @cssprop --hui-bottom-nav-active-color - Màu mục đang chọn
 * @cssprop --hui-bottom-nav-indicator-bg - Nền viên thuốc sau icon đang chọn
 * @cssprop --hui-bottom-nav-height - Chiều cao (chưa gồm safe-area)
 * @cssprop --hui-bottom-nav-icon-size - Cỡ icon
 * @cssprop --hui-bottom-nav-font-size - Cỡ chữ nhãn
 * @cssprop --hui-bottom-nav-border-color - Viền trên
 * @cssprop --hui-bottom-nav-shadow - Đổ bóng
 * @cssprop --hui-bottom-nav-max-width - Rộng tối đa hàng mục (căn giữa)
 * @cssprop --hui-bottom-nav-z-index - z-index khi fixed
 */
class HuiBottomNav extends HuiElement {
  static properties = {
    /** Danh sách mục [{ value, label, icon, href, badge, dot, disabled }] */
    items: { type: Array, default: [] },
    /** Giá trị mục đang chọn */
    value: { type: String },
    /** always | selected — always: luôn hiện nhãn; selected: chỉ mục đang chọn hiện nhãn */
    labels: { type: String, default: 'always' },
    /** fixed | static — fixed: dính đáy màn hình; static: nằm trong luồng (vd: trong khung xem trước) */
    position: { type: String, default: 'fixed' },
    /** Ẩn khi cuộn xuống, hiện lại khi cuộn lên */
    hideOnScroll: { type: Boolean },
    /** Phần tử cuộn để theo dõi (CSS selector) — mặc định window */
    scrollTarget: { type: String },
    /** Viewport rộng hơn giá trị này (px) thì ẩn hẳn thanh — 0 = luôn hiện */
    hideAbove: { type: Number, default: 0 },
    /** Nhãn <nav> (mặc định theo locale) */
    label: { type: String },
    /** Tắt hiệu ứng nhún / trượt */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._els = [];
    this._stopScroll = null;
    this._mq = null;
  }

  render() {
    this._list = createElement('ul', { className: 'bn__list', part: 'list' });
    this._base = createElement('nav', { className: 'bn', part: 'base' }, this._list);
    this._base.addEventListener('focusin', () => this._setScrollHidden(false));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._syncScroll();
    this._syncHideAbove();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopScroll?.();
    this._stopScroll = null;
    this._mq?.removeEventListener?.('change', this._onMq);
    this._mq = null;
  }

  updated(changed) {
    if (changed.has('label') || changed.has('locale')) this._base.setAttribute('aria-label', this.label || tx('bottomNav.label'));
    if (changed.has('labels') || changed.has('position')) {
      const labels = LABELS.includes(this.labels) ? this.labels : 'always';
      const pos = POSITIONS.includes(this.position) ? this.position : 'fixed';
      this._base.className = `bn bn--labels-${labels} bn--${pos}`;
    }
    if (changed.has('items')) this._build();
    else if (changed.has('value')) this._syncSelected(this._mounted && changed.get('value') != null);
    if ((changed.has('hideOnScroll') || changed.has('scrollTarget')) && this._mounted) this._syncScroll();
    if (changed.has('hideAbove') && this._mounted) this._syncHideAbove();
  }

  firstUpdated() {
    this._mounted = true;
  }

  get _items() {
    return (Array.isArray(this.items) ? this.items : []).filter(Boolean)
      .map((it, i) => ({ ...it, value: String(it.value ?? i) }));
  }

  _build() {
    const items = this._items;
    this._els = items.map((item) => {
      const tag = item.href && !item.disabled ? 'a' : 'button';
      const el = createElement(tag, { className: 'bn__item', part: 'item', 'data-value': item.value });
      if (tag === 'a') el.href = item.href;
      else {
        el.type = 'button';
        el.disabled = Boolean(item.disabled);
      }
      if (item.disabled) el.setAttribute('aria-disabled', 'true');

      const icon = createElement('hui-icon', { name: item.icon || 'home', part: 'icon', className: 'bn__icon' });
      const hasBadge = item.dot || (item.badge !== undefined && item.badge !== null && item.badge !== '' && item.badge !== 0);
      const iconWrap = createElement('span', { className: 'bn__icon-wrap' },
        createElement('span', { className: 'bn__indicator', part: 'indicator', 'aria-hidden': 'true' }));
      if (hasBadge) {
        const badge = createElement('hui-badge', { part: 'badge', size: 'sm', className: 'bn__badge' }, icon);
        if (item.dot) badge.setAttribute('dot', '');
        else badge.setAttribute('count', String(item.badge));
        iconWrap.append(badge);
      } else {
        iconWrap.append(icon);
      }
      const label = createElement('span', { className: 'bn__label', part: 'label' }, String(item.label ?? item.value));
      el.append(iconWrap, label);
      el.addEventListener('click', (e) => this._onClick(e, item));
      return { item, el, icon: iconWrap };
    });
    this._list.replaceChildren(...this._els.map(({ el }) => createElement('li', { className: 'bn__cell' }, el)));
    this._base.style.setProperty('--_bn-count', String(Math.max(1, items.length)));
    if (this.value === null || this.value === undefined) {
      if (items[0]) this.value = items[0].value;
    }
    this._syncSelected(false);
  }

  _syncSelected(bounce) {
    this._els.forEach(({ item, el, icon }) => {
      const on = item.value === this.value;
      el.classList.toggle('bn__item--active', on);
      if (on) el.setAttribute('aria-current', item.href ? 'page' : 'true');
      else el.removeAttribute('aria-current');
      if (on && bounce) this._bounce(icon);
    });
  }

  /** Icon nhún: nảy lên + phóng nhẹ rồi về chỗ */
  _bounce(el) {
    if (this.noAnimation || animationsDisabled() || typeof el.animate !== 'function') return;
    el.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-5px) scale(1.12)', offset: 0.35 },
      { transform: 'translateY(1px) scale(0.96)', offset: 0.7 },
      { transform: 'translateY(0) scale(1)' },
    ], { duration: 450, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
  }

  _onClick(e, item) {
    if (item.disabled) {
      e.preventDefault();
      return;
    }
    if (item.value === this.value) return;
    const previous = this.value;
    const ok = this.emit('hui-change', { value: item.value, previous, item }, { cancelable: true });
    if (!ok) {
      e.preventDefault();
      return;
    }
    this.value = item.value;
  }

  // =====================================================
  // ẨN KHI CUỘN / ẨN TRÊN MÀN HÌNH RỘNG
  // =====================================================

  _syncScroll() {
    this._stopScroll?.();
    this._stopScroll = null;
    this._setScrollHidden(false);
    if (!this.hideOnScroll || !this.isConnected) return;
    let target = window;
    if (this.scrollTarget) {
      try {
        target = document.querySelector(this.scrollTarget) || window;
      } catch {
        target = window;
      }
    }
    let last = null;
    this._stopScroll = onScroll(target, ({ top }) => {
      if (last === null) {
        last = top;
        return;
      }
      const delta = top - last;
      // Bỏ qua dao động nhỏ (quán tính cuộn trên iOS); gần đầu trang luôn hiện
      if (Math.abs(delta) < 6) return;
      last = top;
      if (top < 24) this._setScrollHidden(false);
      else if (!this._base.matches(':focus-within')) this._setScrollHidden(delta > 0);
    });
  }

  _setScrollHidden(on) {
    if (on === this._scrollHidden) return;
    this._scrollHidden = on;
    this._base.classList.toggle('bn--scroll-hidden', on);
    this._base.classList.toggle('bn--no-motion', this.noAnimation || animationsDisabled());
    this.setState('scroll-hidden', on);
  }

  _syncHideAbove() {
    this._mq?.removeEventListener?.('change', this._onMq);
    this._mq = null;
    const px = Number(this.hideAbove) || 0;
    if (!px || typeof matchMedia !== 'function') {
      this._base.classList.remove('bn--desktop-hidden');
      return;
    }
    this._mq = matchMedia(`(min-width: ${px + 0.02}px)`);
    this._onMq ||= () => this._base.classList.toggle('bn--desktop-hidden', Boolean(this._mq?.matches));
    this._mq.addEventListener?.('change', this._onMq);
    this._onMq();
  }

  /** Mục đang chọn */
  get selectedItem() {
    return this._items.find((it) => it.value === this.value) || null;
  }
}

defineElement('hui-bottom-nav', HuiBottomNav);

export default HuiBottomNav;
