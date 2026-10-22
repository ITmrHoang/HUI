/**
 * HUI Mega Menu — Menu xổ lớn nhiều cột (nhóm link có icon / mô tả + khối nổi bật có ảnh) cho navbar.
 * Mở theo hover có trễ (hover intent) và theo click / bàn phím (mẫu APG "disclosure navigation");
 * màn hình hẹp (< breakpoint) chuyển thành accordion. Nhận `items` hoặc nội dung slot.
 */

import styles from './hui-mega-menu.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animateIn, animateOut, collapse } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { autoUpdate } from '../../utils/floating.js';
import { getTabbables } from '../../utils/overlay.js';
import '../hui-icon/index.js';

const LAYOUTS = ['auto', 'horizontal', 'accordion'];
let uid = 0;

const FALLBACK = {
  vi: { 'megaMenu.label': 'Menu chính' },
  en: { 'megaMenu.label': 'Main menu' },
};
function tx(key) {
  const v = t(key);
  return v !== key ? v : (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

/**
 * Menu xổ lớn. Mỗi mục `items`:
 *   { key, label, icon, href }                                  → link thường ở hàng trên cùng
 *   { key, label, icon, columns: [{ title, links: [{ label, href, icon, description, badge }] }],
 *     featured: { image, title, description, href, cta }, footer: { label, href } } → có panel
 * Hoặc slot: mỗi phần tử con có `data-label` (tuỳ chọn `data-key`, `data-icon`) là nội dung một panel;
 * phần tử con là thẻ <a href data-label> (không có nội dung panel) → link thường.
 * Khối nổi bật tùy biến cho panel dữ liệu: phần tử con `slot="featured-<key>"`.
 *
 * @fires hui-open - Panel mở. detail: { key }
 * @fires hui-close - Panel đóng. detail: { key }
 * @fires hui-select - Bấm một link trong panel dữ liệu (không chặn điều hướng). detail: { key, link }
 * @slot - Nội dung panel dạng slot (phần tử con có data-label)
 * @slot featured-<key> - Khối nổi bật tùy biến cho panel `key` (chế độ dữ liệu)
 * @csspart base - Thẻ <nav>
 * @csspart list - Hàng mục trên cùng (<ul>)
 * @csspart item - Mỗi mục (<li>)
 * @csspart trigger - Nút mở panel (aria-expanded)
 * @csspart top-link - Link thường ở hàng trên cùng
 * @csspart arrow - Mũi tên trên nút
 * @csspart panel - Panel xổ xuống
 * @csspart panel-inner - Khung nội dung panel (giới hạn chiều rộng)
 * @csspart columns - Vùng các cột link
 * @csspart group - Một cột / nhóm link
 * @csspart group-title - Tiêu đề nhóm
 * @csspart link - Một link trong nhóm
 * @csspart link-icon - Icon của link
 * @csspart link-label - Tên link
 * @csspart link-description - Mô tả link
 * @csspart badge - Nhãn nhỏ cạnh tên link
 * @csspart featured - Khối nổi bật
 * @csspart featured-image - Ảnh khối nổi bật
 * @csspart panel-footer - Dòng link cuối panel
 * @cssprop --hui-mega-menu-color - Màu chữ mục trên cùng
 * @cssprop --hui-mega-menu-hover-color - Màu chữ khi hover / đang mở
 * @cssprop --hui-mega-menu-item-padding - Đệm mục trên cùng
 * @cssprop --hui-mega-menu-item-height - Chiều cao mục trên cùng
 * @cssprop --hui-mega-menu-panel-bg - Nền panel
 * @cssprop --hui-mega-menu-panel-shadow - Bóng panel
 * @cssprop --hui-mega-menu-panel-radius - Bo góc panel
 * @cssprop --hui-mega-menu-panel-padding - Đệm panel
 * @cssprop --hui-mega-menu-panel-width - Rộng panel (mặc định bằng menu; full-width: cả màn hình)
 * @cssprop --hui-mega-menu-panel-max-width - Rộng tối đa phần nội dung panel
 * @cssprop --hui-mega-menu-columns - Số cột tối thiểu mỗi hàng (mặc định tự giãn theo chỗ)
 * @cssprop --hui-mega-menu-column-min-width - Rộng tối thiểu một cột
 * @cssprop --hui-mega-menu-gap - Khoảng cách các cột
 * @cssprop --hui-mega-menu-link-hover-bg - Nền link khi hover
 * @cssprop --hui-mega-menu-icon-color - Màu icon link
 * @cssprop --hui-mega-menu-icon-bg - Nền ô icon link
 * @cssprop --hui-mega-menu-featured-bg - Nền khối nổi bật
 * @cssprop --hui-mega-menu-z-index - z-index panel
 */
class HuiMegaMenu extends HuiElement {
  static properties = {
    /** Dữ liệu mục menu (xem JSDoc của class) */
    items: { type: Array, default: null },
    /** Key panel đang mở (rỗng = đóng hết) */
    openKey: { type: String, default: '' },
    /** Trễ mở khi rê chuột (ms) */
    openDelay: { type: Number, default: 120 },
    /** Trễ đóng khi rời chuột (ms) */
    closeDelay: { type: Number, default: 200 },
    /** auto | horizontal | accordion — auto: accordion khi viewport hẹp hơn `breakpoint` */
    layout: { type: String, default: 'auto' },
    /** Ngưỡng chuyển accordion (px, theo viewport) khi layout="auto" */
    breakpoint: { type: Number, default: 768 },
    /** Panel rộng bằng cả màn hình (position: fixed ngay dưới menu) */
    fullWidth: { type: Boolean },
    /** Nhãn của <nav> (mặc định theo locale) */
    label: { type: String },
    /** Tắt hiệu ứng mở / đóng */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    this._entries = []; // { key, li, trigger?, panel?, link? }
    this._shownKey = '';
    this._timer = 0;
    this._mq = null;
    this._accordion = false;
    this._stopTrack = null;
  }

  render() {
    this._collector = createElement('slot', { className: 'mm__collector' });
    this._collector.addEventListener('slotchange', () => {
      if (this._hasData) return;
      // Gán slot cho con → slotchange lặp lại một lần; chỉ dựng lại khi danh sách thật sự đổi
      if (this._slotSignature() === this._slotSig) return;
      this._build();
    });
    this._list = createElement('ul', { className: 'mm__list', part: 'list' });
    this._base = createElement('nav', { className: 'mm', part: 'base' }, this._list, this._collector);

    this._base.addEventListener('keydown', (e) => this._onKeydown(e));
    this._base.addEventListener('focusout', (e) => {
      // Focus rời hẳn menu (Tab ra ngoài) → đóng panel (ở chế độ ngang)
      if (!this._accordion && this._shownKey && !this._containsNode(e.relatedTarget)) this._setOpen('', { animate: true });
    });
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this.listen(document, 'pointerdown', (e) => {
      if (!this._accordion && this._shownKey && !e.composedPath().includes(this)) this._setOpen('', { animate: true });
    }, { capture: true });
    this._syncLayout();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
    this._mq?.removeEventListener?.('change', this._onMq);
    this._mq = null;
    this._stopTrack?.();
    this._stopTrack = null;
  }

  updated(changed) {
    if (changed.has('label') || changed.has('locale')) this._base.setAttribute('aria-label', this.label || tx('megaMenu.label'));
    if (changed.has('items')) this._build();
    if (changed.has('layout') || changed.has('breakpoint')) this._syncLayout();
    if (changed.has('fullWidth')) this._base.classList.toggle('mm--full', this.fullWidth);
    if (changed.has('openKey') && (this.openKey || '') !== this._shownKey) this._apply(this.openKey || '', { animate: this._mounted });
  }

  firstUpdated() {
    this._mounted = true;
  }

  // =====================================================
  // BỐ CỤC: ngang ↔ accordion
  // =====================================================

  _syncLayout() {
    if (!this._hasRendered) return;
    this._mq?.removeEventListener?.('change', this._onMq);
    this._mq = null;
    const layout = LAYOUTS.includes(this.layout) ? this.layout : 'auto';
    let accordion = layout === 'accordion';
    if (layout === 'auto' && typeof matchMedia === 'function') {
      this._mq = matchMedia(`(max-width: ${Math.max(0, (this.breakpoint || 768) - 0.02)}px)`);
      this._onMq ||= () => this._setAccordion(this._mq.matches);
      this._mq.addEventListener?.('change', this._onMq);
      accordion = this._mq.matches;
    }
    this._setAccordion(accordion);
  }

  _setAccordion(on) {
    const changed = on !== this._accordion;
    this._accordion = on;
    this._base.classList.toggle('mm--accordion', on);
    this._base.classList.toggle('mm--horizontal', !on);
    this.setState('accordion', on);
    if (changed) {
      // Đổi bố cục → đóng hết cho gọn, gỡ inline style của chế độ cũ
      this._apply('', { animate: false });
      this._entries.forEach((e) => e.panel?.style.removeProperty('--_mm-top'));
    }
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  get _hasData() {
    return Array.isArray(this.items) && this.items.length > 0;
  }

  _build() {
    if (!this._hasRendered) return;
    const prevKey = this._shownKey;
    this._apply('', { animate: false });
    this._entries = [];
    const nodes = this._hasData ? this._buildFromData() : this._buildFromSlot();
    this._list.replaceChildren(...nodes);
    if (prevKey && this._entries.some((e) => e.key === prevKey && e.panel)) this._apply(prevKey, { animate: false });
  }

  _buildFromData() {
    return this.items.filter(Boolean).map((item, i) => {
      const key = String(item.key ?? item.label ?? i);
      const hasPanel = Array.isArray(item.columns) && item.columns.length > 0 || item.featured;
      if (!hasPanel) return this._topLink(key, item.label, item.href, item.icon);
      const content = [];
      if (Array.isArray(item.columns) && item.columns.length) {
        content.push(createElement('div', { className: 'mm__columns', part: 'columns' },
          ...item.columns.filter(Boolean).map((col) => this._group(key, col))));
      }
      // Khối nổi bật: slot featured-<key> (nếu có) thay cho dữ liệu featured
      const featuredSlot = createElement('slot', { name: `featured-${key}` }, item.featured ? this._featured(item.featured) : '');
      const featured = createElement('div', { className: 'mm__featured', part: 'featured' }, featuredSlot);
      const syncFeatured = () => {
        featured.hidden = !item.featured && !featuredSlot.assignedNodes().length;
      };
      featuredSlot.addEventListener('slotchange', syncFeatured);
      syncFeatured();
      content.push(featured);
      const footer = item.footer?.label
        ? createElement('div', { className: 'mm__footer', part: 'panel-footer' },
          createElement('a', { href: item.footer.href || '#', className: 'mm__footer-link' }, String(item.footer.label),
            createElement('hui-icon', { name: 'chevron-right' })))
        : null;
      return this._panelItem(key, item.label, item.icon, [
        createElement('div', { className: 'mm__body' }, ...content), footer,
      ]);
    });
  }

  _slotSignature() {
    return [...this.children].filter((el) => el.hasAttribute('data-label'))
      .map((el) => `${el.getAttribute('data-key')}|${el.getAttribute('data-label')}|${el.localName}`).join(';');
  }

  _buildFromSlot() {
    this._slotSig = this._slotSignature();
    const children = [...this.children].filter((el) => el.hasAttribute('data-label'));
    return children.map((el, i) => {
      const key = el.getAttribute('data-key') || String(i);
      const label = el.getAttribute('data-label');
      const icon = el.getAttribute('data-icon');
      // <a href data-label> không có nội dung panel → link thường
      if (el.localName === 'a' && el.hasAttribute('href') && !el.children.length) {
        el.slot = `link-${key}`;
        const li = createElement('li', { className: 'mm__item', part: 'item' }, createElement('slot', { name: `link-${key}` }));
        el.classList.add('mm-top-link');
        this._entries.push({ key, li, link: el });
        return li;
      }
      el.slot = `panel-${key}`;
      return this._panelItem(key, label, icon, [createElement('slot', { name: `panel-${key}` })]);
    });
  }

  _topLink(key, label, href, icon) {
    const link = createElement('a', { className: 'mm__top-link', part: 'top-link', href: href || '#' },
      icon ? createElement('hui-icon', { name: icon, className: 'mm__top-icon' }) : '',
      createElement('span', {}, String(label ?? key)));
    const li = createElement('li', { className: 'mm__item', part: 'item' }, link);
    this._entries.push({ key, li, link });
    return li;
  }

  _panelItem(key, label, icon, content) {
    const panelId = `hui-mm-${this._uid}-${key.replace(/[^\w-]/g, '_')}`;
    const trigger = createElement('button', {
      type: 'button', className: 'mm__trigger', part: 'trigger', 'aria-expanded': 'false', 'aria-controls': panelId,
    },
    icon ? createElement('hui-icon', { name: icon, className: 'mm__top-icon' }) : '',
    createElement('span', {}, String(label ?? key)),
    createElement('hui-icon', { name: 'chevron-down', className: 'mm__arrow', part: 'arrow' }));
    const panel = createElement('div', { className: 'mm__panel', part: 'panel', id: panelId, hidden: true },
      createElement('div', { className: 'mm__panel-inner', part: 'panel-inner' }, ...content.filter(Boolean)));
    const li = createElement('li', { className: 'mm__item mm__item--panel', part: 'item' }, trigger, panel);

    trigger.addEventListener('click', () => {
      clearTimeout(this._timer);
      // Vừa mở bằng hover thì click không đóng ngay (tránh "mở rồi tắt" khi rê chuột rồi bấm)
      if (this._shownKey === key && performance.now() - (this._hoverOpenedAt || 0) < 500) return;
      this._setOpen(this._shownKey === key ? '' : key, { animate: true });
    });
    li.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || this._accordion) return;
      this._schedule(key);
    });
    li.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse' || this._accordion) return;
      if (this._shownKey === key || this._pendingKey === key) this._schedule('');
    });
    panel.addEventListener('click', (e) => {
      const a = e.composedPath().find((n) => n.localName === 'a' && n.dataset?.mmLink !== undefined);
      if (!a) return;
      this.emit('hui-select', { key, link: a._mmLink });
    });
    this._entries.push({ key, li, trigger, panel });
    return li;
  }

  _group(key, col) {
    const links = (col.links || []).filter(Boolean).map((link) => {
      const a = createElement('a', { className: 'mm__link', part: 'link', href: link.href || '#', 'data-mm-link': '' });
      a._mmLink = link;
      if (link.icon) {
        a.append(createElement('span', { className: 'mm__link-icon', part: 'link-icon', 'aria-hidden': 'true' },
          createElement('hui-icon', { name: link.icon })));
      }
      const label = createElement('span', { className: 'mm__link-label', part: 'link-label' }, String(link.label ?? ''));
      if (link.badge) label.append(createElement('span', { className: 'mm__badge', part: 'badge' }, String(link.badge)));
      const text = createElement('span', { className: 'mm__link-text' }, label);
      if (link.description) {
        text.append(createElement('span', { className: 'mm__link-desc', part: 'link-description' }, String(link.description)));
      }
      a.append(text);
      return createElement('li', {}, a);
    });
    const titleId = `hui-mm-${this._uid}-g${++uid}`;
    const title = col.title ? createElement('h3', { className: 'mm__group-title', part: 'group-title', id: titleId }, String(col.title)) : null;
    const list = createElement('ul', { className: 'mm__links' }, ...links);
    if (title) list.setAttribute('aria-labelledby', titleId);
    return createElement('div', { className: 'mm__group', part: 'group' }, title, list);
  }

  _featured(f) {
    const card = createElement(f.href ? 'a' : 'div', { className: 'mm__featured-card' });
    if (f.href) {
      card.href = f.href;
      card.dataset.mmLink = '';
      card._mmLink = f;
    }
    if (f.image) {
      card.append(createElement('img', {
        className: 'mm__featured-image', part: 'featured-image', src: f.image, alt: f.imageAlt || '', loading: 'lazy', decoding: 'async',
      }));
    }
    if (f.title) card.append(createElement('strong', { className: 'mm__featured-title' }, String(f.title)));
    if (f.description) card.append(createElement('span', { className: 'mm__featured-desc' }, String(f.description)));
    if (f.cta) {
      card.append(createElement('span', { className: 'mm__featured-cta' }, String(f.cta),
        createElement('hui-icon', { name: 'chevron-right' })));
    }
    return card;
  }

  // =====================================================
  // ĐÓNG / MỞ
  // =====================================================

  _entry(key) {
    return this._entries.find((e) => e.key === key && e.panel) || null;
  }

  /** Hover intent: đã có panel mở → chuyển nhanh; chưa có → chờ open-delay */
  _schedule(key) {
    clearTimeout(this._timer);
    this._pendingKey = key;
    const delay = key
      ? (this._shownKey ? Math.min(60, this.openDelay ?? 120) : this.openDelay ?? 120)
      : this.closeDelay ?? 200;
    this._timer = setTimeout(() => {
      this._pendingKey = null;
      if (key) this._hoverOpenedAt = performance.now();
      this._setOpen(key, { animate: true });
    }, Math.max(0, delay));
  }

  /** Mở panel `key` */
  show(key) {
    clearTimeout(this._timer);
    this._setOpen(String(key ?? ''), { animate: true });
  }

  /** Đóng panel đang mở */
  hide() {
    clearTimeout(this._timer);
    this._setOpen('', { animate: true });
  }

  _setOpen(key, opts) {
    if (key && !this._entry(key)) {
      // items vừa gán nhưng chưa dựng (cập nhật gom theo microtask) → để updated() mở sau khi dựng xong
      if (this._changed.has('items')) {
        this.openKey = key;
        return;
      }
      key = '';
    }
    if (key === this._shownKey) return;
    this._apply(key, opts);
    this.openKey = key;
  }

  get _animated() {
    return !this.noAnimation && !animationsDisabled();
  }

  /** Áp trạng thái lên DOM (không qua property) */
  _apply(key, { animate = true } = {}) {
    if (key && !this._entry(key)) key = '';
    const prev = this._shownKey;
    if (prev === key) return;
    this._shownKey = key;
    const prevEntry = prev ? this._entry(prev) : null;
    const nextEntry = key ? this._entry(key) : null;
    const anim = animate && this._animated;

    if (prevEntry) {
      prevEntry.trigger.setAttribute('aria-expanded', 'false');
      prevEntry.li.classList.remove('mm__item--open');
      const panel = prevEntry.panel;
      // Chuyển panel (ngang): ẩn ngay panel cũ; đóng hẳn: mờ dần / thu lại
      if (anim && !nextEntry) {
        const token = (panel._mmToken = (panel._mmToken || 0) + 1);
        const done = () => { if (panel._mmToken === token) panel.hidden = true; };
        if (this._accordion) collapse(panel, false).then(done);
        else animateOut(panel, 'slide-down').then(done);
      } else {
        panel._mmToken = (panel._mmToken || 0) + 1;
        panel.getAnimations?.().forEach((a) => a.cancel());
        panel.hidden = true;
      }
      this.emit('hui-close', { key: prev });
    }

    this._stopTrack?.();
    this._stopTrack = null;

    if (nextEntry) {
      const panel = nextEntry.panel;
      panel._mmToken = (panel._mmToken || 0) + 1;
      panel.getAnimations?.().forEach((a) => a.cancel());
      panel.hidden = false;
      nextEntry.trigger.setAttribute('aria-expanded', 'true');
      nextEntry.li.classList.add('mm__item--open');
      if (!this._accordion && this.fullWidth) {
        // Panel fixed toàn màn hình: bám theo mép dưới của menu khi cuộn / đổi kích thước
        this._stopTrack = autoUpdate(this._base, panel, () => {
          panel.style.setProperty('--_mm-top', `${Math.round(this._base.getBoundingClientRect().bottom)}px`);
        });
      }
      if (anim) {
        if (this._accordion) collapse(panel, true);
        else if (!prevEntry) animateIn(panel, 'slide-down');
      }
      this.emit('hui-open', { key });
    }
    this.setState('open', Boolean(key));
  }

  // =====================================================
  // BÀN PHÍM (APG disclosure navigation)
  // =====================================================

  /** Các phần tử ở hàng trên cùng (nút / link) theo thứ tự */
  get _topControls() {
    return this._entries.map((e) => e.trigger || e.link).filter(Boolean);
  }

  _onKeydown(e) {
    const path = e.composedPath();
    const top = this._topControls;
    const topIndex = top.indexOf(path[0]);
    const panelEntry = this._entries.find((en) => en.panel && path.includes(en.panel));
    const next = this._accordion ? 'ArrowDown' : 'ArrowRight';
    const prev = this._accordion ? 'ArrowUp' : 'ArrowLeft';

    if (e.key === 'Escape') {
      const entry = panelEntry || (topIndex >= 0 ? this._entries.find((en) => en.trigger === top[topIndex]) : null) || this._entry(this._shownKey);
      if (!this._shownKey || !entry?.trigger) return;
      e.preventDefault();
      e.stopPropagation();
      this._setOpen('', { animate: true });
      entry.trigger.focus();
      return;
    }

    if (panelEntry) {
      // Trong panel: ↑ ↓ giữa các link, Home / End
      const items = getTabbables(panelEntry.panel);
      const i = items.indexOf(path.find((n) => items.includes(n)));
      if (!items.length) return;
      let to = -1;
      if (e.key === 'ArrowDown') to = Math.min(items.length - 1, i + 1);
      else if (e.key === 'ArrowUp') to = i <= 0 ? -2 : i - 1;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = items.length - 1;
      else return;
      e.preventDefault();
      if (to === -2) panelEntry.trigger.focus(); // ↑ ở link đầu → về nút
      else items[to]?.focus();
      return;
    }

    if (topIndex < 0) return;
    const control = top[topIndex];
    const entry = this._entries.find((en) => en.trigger === control);
    let to = -1;
    if (e.key === next) to = (topIndex + 1) % top.length;
    else if (e.key === prev) to = (topIndex - 1 + top.length) % top.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = top.length - 1;
    else if (!this._accordion && e.key === 'ArrowDown' && entry) {
      // ↓ trên nút: mở panel và vào link đầu tiên
      e.preventDefault();
      clearTimeout(this._timer);
      this._setOpen(entry.key, { animate: true });
      requestAnimationFrame(() => getTabbables(entry.panel)[0]?.focus());
      return;
    } else return;
    e.preventDefault();
    top[to].focus();
  }

  _containsNode(node) {
    for (let n = node; n; n = n.assignedSlot || n.parentNode || n.host) {
      if (n === this) return true;
    }
    return false;
  }
}

defineElement('hui-mega-menu', HuiMegaMenu);

export default HuiMegaMenu;
