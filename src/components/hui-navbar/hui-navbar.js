/**
 * HUI Navbar — Thanh điều hướng đầu trang cho website (MUI AppBar + Ant Layout.Header)
 *   <hui-navbar sticky transparent-on-top>
 *     <a slot="logo" href="/">Brand</a>
 *     <a href="/docs">Tài liệu</a> <a href="/blog">Blog</a>      ← hoặc một <hui-menu mode="horizontal">
 *     <hui-button slot="actions">Đăng nhập</hui-button>
 *   </hui-navbar>
 * Hẹp hơn breakpoint (đo theo chiều rộng navbar): vùng nav ẩn sau nút hamburger, mở thành panel
 * full-width ngay dưới thanh (cùng một khung chứa slot → nội dung slot không phải nhân đôi).
 */

import styles from './hui-navbar.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { openOverlay } from '../../utils/overlay.js';
import '../hui-icon/hui-icon.js';

const FALLBACK = {
  vi: { 'navbar.openMenu': 'Mở menu', 'navbar.closeMenu': 'Đóng menu', 'navbar.label': 'Điều hướng chính' },
  en: { 'navbar.openMenu': 'Open menu', 'navbar.closeMenu': 'Close menu', 'navbar.label': 'Main navigation' },
};
function tx(key) {
  const v = t(key);
  return v !== key ? v : FALLBACK[getLocaleName() === 'vi' ? 'vi' : 'en'][key] ?? key;
}

/** Cuộn quá ngưỡng này (px) thì thanh transparent-on-top chuyển sang nền đặc + bóng */
const SCROLL_THRESHOLD = 8;

/**
 * @fires open-change - Panel mobile mở/đóng do người dùng. detail: { open }
 * @slot logo - Logo / tên thương hiệu (bên trái)
 * @slot - Link điều hướng hoặc một <hui-menu mode="horizontal"> (mobile: tự chuyển mode inline)
 * @slot actions - Nút hành động bên phải (luôn hiện, kể cả mobile)
 * @csspart base - Thẻ <header>
 * @csspart inner - Khung nội dung (giới hạn max-width)
 * @csspart logo - Vùng logo
 * @csspart nav - Vùng nav (desktop: nằm ngang; mobile: panel thả xuống)
 * @csspart actions - Vùng actions
 * @csspart toggle - Nút hamburger
 * @cssprop --hui-navbar-height - Chiều cao thanh (64px)
 * @cssprop --hui-navbar-bg - Nền thanh
 * @cssprop --hui-navbar-color - Màu chữ
 * @cssprop --hui-navbar-border-color - Viền dưới
 * @cssprop --hui-navbar-shadow - Đổ bóng khi đã cuộn
 * @cssprop --hui-navbar-max-width - Chiều rộng tối đa vùng nội dung (none)
 * @cssprop --hui-navbar-padding-x - Padding ngang
 * @cssprop --hui-navbar-gap - Khoảng cách giữa các vùng
 * @cssprop --hui-navbar-link-color - Màu link trong nav
 * @cssprop --hui-navbar-link-hover-color - Màu link khi hover
 * @cssprop --hui-navbar-panel-bg - Nền panel mobile
 * @cssprop --hui-navbar-panel-shadow - Đổ bóng panel mobile
 * @cssprop --hui-navbar-z-index - z-index khi sticky
 */
class HuiNavbar extends HuiElement {
  static properties = {
    /** Dính ở đầu trang khi cuộn (position: sticky) */
    sticky: { type: Boolean },
    /** Nền trong suốt khi ở đầu trang; cuộn > 8px → nền đặc + bóng */
    transparentOnTop: { type: Boolean },
    /** Chiều rộng (px) dưới mức này → thu nav vào nút hamburger */
    breakpoint: { type: Number, default: 768 },
    /** Panel mobile đang mở (tự phản chiếu khi người dùng bấm hamburger) */
    open: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._mobile = false;
    this._scrolled = false;
    this._panelShown = false;
    this._token = 0;
    this._overlay = null;
    this._menuModes = new WeakMap(); // hui-menu → mode gốc (khôi phục khi về desktop)
  }

  render() {
    this.requestUpdate('locale'); // lần updated() đầu cũng đặt chữ theo locale
    this._logo = createElement('div', { className: 'logo', part: 'logo' }, createElement('slot', { name: 'logo' }));
    this._navSlot = createElement('slot');
    this._navSlot.addEventListener('slotchange', () => this._syncMenus());
    this._nav = createElement('nav', { className: 'nav', part: 'nav', id: 'nav' }, this._navSlot);
    this._actions = createElement('div', { className: 'actions', part: 'actions' }, createElement('slot', { name: 'actions' }));

    this._toggleIcon = createElement('hui-icon', { name: 'menu' });
    this._toggle = createElement('button', {
      className: 'toggle', part: 'toggle', type: 'button', 'aria-controls': 'nav', 'aria-expanded': 'false', hidden: true,
    }, this._toggleIcon);
    this._toggle.addEventListener('click', () => this._setOpen(!this._panelShown));

    // Bấm link / chọn item trong panel mobile → đóng panel
    this._nav.addEventListener('click', (e) => {
      if (this._mobile && this._panelShown && e.composedPath().some((n) => n.localName === 'a' && n.hasAttribute?.('href'))) {
        this._setOpen(false);
      }
    });
    this._nav.addEventListener('hui-select', () => this._mobile && this._setOpen(false));

    this._inner = createElement('div', { className: 'inner', part: 'inner' }, this._logo, this._nav, this._actions, this._toggle);
    this._base = createElement('header', { className: 'bar', part: 'base' }, this._inner);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this.listen(window, 'scroll', () => this._onScroll(), { passive: true });
    this._resize ||= new ResizeObserver(() => this._checkMobile());
    this._resize.observe(this);
    this._onScroll();
    this._checkMobile();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resize?.disconnect();
    this._overlay?.close();
    this._overlay = null;
  }

  updated(changed) {
    if (changed.has('breakpoint')) this._checkMobile();
    if (changed.has('open')) this._applyOpen(this.open && this._mobile);
    if (changed.has('locale')) this._nav.setAttribute('aria-label', tx('navbar.label'));
    this._syncClasses();
  }

  // =====================================================
  // NỘI BỘ
  // =====================================================

  _syncClasses() {
    const transparent = this.transparentOnTop && !this._scrolled && !this._panelShown;
    this._base.className = [
      'bar',
      this._mobile ? 'bar--mobile' : '',
      transparent ? 'bar--transparent' : '',
      this._scrolled ? 'bar--scrolled' : '',
      this._panelShown ? 'bar--open' : '',
    ].filter(Boolean).join(' ');
    this._toggle.hidden = !this._mobile;
    this._toggle.setAttribute('aria-expanded', String(this._panelShown));
    this._toggle.setAttribute('aria-label', tx(this._panelShown ? 'navbar.closeMenu' : 'navbar.openMenu'));
    this._toggleIcon.setAttribute('name', this._panelShown ? 'close' : 'menu');
    // Mobile + đóng: nav ẩn hẳn (không Tab vào được)
    this._nav.hidden = this._mobile && !this._panelShown;
    this.setState('mobile', this._mobile);
    this.setState('scrolled', this._scrolled);
    this.setState('open', this._panelShown);
  }

  _onScroll() {
    const scrolled = (window.scrollY || document.documentElement.scrollTop || 0) > SCROLL_THRESHOLD;
    if (scrolled === this._scrolled) return;
    this._scrolled = scrolled;
    if (this._hasRendered) this._syncClasses();
  }

  _checkMobile() {
    if (!this._hasRendered) return;
    const width = this.getBoundingClientRect().width || window.innerWidth;
    const mobile = width > 0 && width < (this.breakpoint || 768);
    if (mobile === this._mobile) return;
    this._mobile = mobile;
    if (!mobile && this._panelShown) {
      // Về desktop: đóng panel ngay, không animation
      this._closeImmediately();
      if (this.open) {
        this.open = false;
        this.emit('open-change', { open: false });
      }
    }
    this._syncMenus();
    this._syncClasses();
  }

  /** hui-menu ngang trong slot nav: mobile → inline (dọc), desktop → mode gốc */
  _syncMenus() {
    for (const el of this._navSlot.assignedElements({ flatten: true })) {
      const menus = el.localName === 'hui-menu' ? [el] : [...el.querySelectorAll?.('hui-menu') ?? []];
      for (const menu of menus) {
        if (this._mobile) {
          if (!this._menuModes.has(menu)) this._menuModes.set(menu, menu.getAttribute('mode'));
          menu.setAttribute('mode', 'inline');
        } else if (this._menuModes.has(menu)) {
          const mode = this._menuModes.get(menu);
          if (mode === null) menu.removeAttribute('mode');
          else menu.setAttribute('mode', mode);
          this._menuModes.delete(menu);
        }
      }
    }
  }

  /** Mở/đóng do người dùng → phản chiếu attribute open + phát open-change */
  _setOpen(open) {
    if (open && !this._mobile) return;
    if (open === this._panelShown) return;
    this._applyOpen(open);
    this.open = open;
    this.emit('open-change', { open });
  }

  _applyOpen(open) {
    if (open === this._panelShown) return;
    this._panelShown = open;
    const token = ++this._token;
    this._syncClasses();
    const panel = this._nav;

    if (open) {
      panel.getAnimations?.().forEach((a) => a.cancel());
      animateIn(panel, 'slide-down');
      this._overlay = openOverlay({
        element: panel,
        ignore: [this._toggle],
        restoreFocus: false,
        onEscape: () => {
          this._setOpen(false);
          this._toggle.focus();
        },
        onClickOutside: () => this._setOpen(false),
      });
      return;
    }

    this._overlay?.close();
    this._overlay = null;
    // Giữ nav hiển thị trong lúc chạy animation đóng
    panel.hidden = false;
    animateOut(panel, 'slide-down').then(() => {
      if (token !== this._token) return;
      panel.getAnimations?.().forEach((a) => a.cancel());
      this._syncClasses();
    });
  }

  _closeImmediately() {
    this._token++;
    this._panelShown = false;
    this._overlay?.close();
    this._overlay = null;
    this._nav.getAnimations?.().forEach((a) => a.cancel());
  }
}

defineElement('hui-navbar', HuiNavbar);

export default HuiNavbar;
