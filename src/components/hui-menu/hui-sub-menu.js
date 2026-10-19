/**
 * HUI Sub Menu — Nhóm item mở rộng được trong <hui-menu>. Xem JSDoc của class.
 * Một khung chứa item con, đổi hành vi theo mode của menu:
 *   inline              → mở rộng ngay trong menu (animate chiều cao bằng utils/motion collapse)
 *   vertical/horizontal → popup nổi trên top-layer (utils/floating) + overlay (Esc / click ra ngoài)
 */

import itemStyles from './hui-menu-item.css?raw';
import styles from './hui-sub-menu.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { autoUpdate, computePosition, floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import { animateIn, animateOut, collapse } from '../../utils/motion.js';
import { openOverlay } from '../../utils/overlay.js';
import { DEFAULT_CTX } from './menu-shared.js';
import '../hui-icon/hui-icon.js';

const HOVER_OPEN_DELAY = 100;
const HOVER_CLOSE_DELAY = 150;

/**
 * Sub-menu: tiêu đề + danh sách item con. Đóng/mở do <hui-menu> cha quản lý qua open-keys.
 *
 * @slot - Các item con (hui-menu-item, hui-sub-menu, hui-menu-group, hui-menu-divider)
 * @slot label - Tiêu đề dạng HTML (thay cho attribute label)
 * @slot icon - Icon tùy chỉnh
 * @csspart title - Dòng tiêu đề (role=menuitem, aria-haspopup)
 * @csspart icon - Vùng icon
 * @csspart label - Vùng tiêu đề chữ
 * @csspart arrow - Mũi tên
 * @csspart popup - Khung chứa item con (role=menu) — popup nổi ở mode vertical/horizontal
 */
class HuiSubMenu extends HuiElement {
  static properties = {
    /** Khóa định danh (dùng cho open-keys, keyPath) */
    key: { type: String },
    /** Tiêu đề */
    label: { type: String },
    /** Tên hui-icon hiển thị trước tiêu đề */
    icon: { type: String },
    /** Không mở được */
    disabled: { type: Boolean },
  };

  static styles = [floatingCss, itemStyles, styles];

  constructor() {
    super();
    this._ctx = DEFAULT_CTX;
    this._tabbable = false;
    this._shownOpen = false;   // trạng thái mở đang hiển thị
    this._popupMode = null;    // true = popup nổi, false = inline
    this._token = 0;
    this._overlay = null;
    this._stopAutoUpdate = null;
    this._hoverTimer = null;
  }

  render() {
    this._iconEl = createElement('hui-icon');
    this._iconSlot = createElement('slot', { name: 'icon' }, this._iconEl);
    this._iconSlot.addEventListener('slotchange', () => this._applyCtx());
    this._iconWrap = createElement('span', { className: 'icon', part: 'icon' }, this._iconSlot);
    this._letter = createElement('span', { className: 'letter', 'aria-hidden': 'true' });
    this._labelText = document.createTextNode('');
    this._labelSlot = createElement('slot', { name: 'label' }, this._labelText);
    this._labelSlot.addEventListener('slotchange', () => this._applyCtx());
    this._label = createElement('span', { className: 'label', part: 'label' }, this._labelSlot);
    this._arrow = createElement('hui-icon', { className: 'arrow', part: 'arrow', name: 'chevron-down' });

    this._title = createElement('div', {
      part: 'title', role: 'menuitem', tabindex: '-1', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      dataset: { menuTitle: '' },
    }, this._iconWrap, this._letter, this._label, this._arrow);

    this._popup = createElement('div', { className: 'popup', part: 'popup', role: 'menu', hidden: true }, createElement('slot'));

    // Hover (popup mode): host bao cả tiêu đề lẫn popup (popup nằm trong shadow) → rê từ tiêu đề sang popup không bị đóng
    this.addEventListener('mouseenter', () => this._onHover(true));
    this.addEventListener('mouseleave', () => this._onHover(false));

    return [this._title, this._popup];
  }

  connectedCallback() {
    super.connectedCallback();
    this.closest('hui-menu')?._scheduleSync?.();
    if (this._ctx.open && this._hasRendered) this._applyCtx();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._hoverTimer);
    this._teardownFloating();
    this._shownOpen = false;
  }

  updated(changed) {
    if (changed.has('icon')) {
      if (this.icon) this._iconEl.setAttribute('name', this.icon);
      else this._iconEl.removeAttribute('name');
    }
    if (changed.has('label')) this._labelText.data = this.label || '';
    if (changed.has('disabled')) {
      if (this.disabled) this._title.setAttribute('aria-disabled', 'true');
      else this._title.removeAttribute('aria-disabled');
    }
    this._applyCtx();
  }

  focus(options) {
    if (this._title) this._title.focus(options);
    else super.focus(options);
  }

  /** Tiêu đề dạng text */
  get labelText() {
    if (this.label) return this.label;
    const slotted = [...this.children].find((el) => el.getAttribute('slot') === 'label');
    return slotted?.textContent.trim() || '';
  }

  // =====================================================
  // NỘI BỘ — hui-menu gọi
  // =====================================================

  _applyContext(ctx) {
    this._ctx = ctx;
    if (this._hasRendered) this._applyCtx();
  }

  _setTabbable(on) {
    this._tabbable = on;
    if (this._title) this._title.tabIndex = on ? 0 : -1;
  }

  get _isOpenShown() {
    return this._shownOpen;
  }

  _onHover(enter) {
    const menu = this.closest('hui-menu');
    if (!menu || this.disabled || this._ctx.mode === 'inline' || menu._subTrigger !== 'hover') return;
    clearTimeout(this._hoverTimer);
    this._hoverTimer = setTimeout(
      () => menu._setSubOpen(this, enter, { hover: true }),
      enter ? HOVER_OPEN_DELAY : HOVER_CLOSE_DELAY,
    );
  }

  _applyCtx() {
    if (!this._hasRendered) return;
    const ctx = this._ctx;
    const inline = ctx.mode === 'inline';
    const hasIcon = Boolean(this.icon) || this._iconSlot.assignedNodes().length > 0;
    this._iconWrap.hidden = !hasIcon;

    const open = Boolean(ctx.open) && !this.disabled;
    this._title.className = [
      'item',
      ctx.horizontalRoot ? 'item--horizontal' : '',
      ctx.collapsedRoot ? 'item--collapsed' : '',
      ctx.collapsedRoot && !hasIcon ? 'item--no-icon' : '',
      ctx.childSelected ? 'item--child-selected' : '',
      open ? 'item--open' : '',
      this.disabled ? 'item--disabled' : '',
    ].filter(Boolean).join(' ');
    this._title.style.setProperty('--_mi-level', String(inline ? ctx.level : 0));
    this._title.style.setProperty('--_mi-indent', `${ctx.indent}px`);
    this._title.setAttribute('aria-expanded', String(open));

    const text = this.labelText;
    this._letter.textContent = ctx.collapsedRoot && !hasIcon ? text.charAt(0) : '';
    if (ctx.collapsedRoot) this._title.title = text;
    else this._title.removeAttribute('title');
    if (text) this._popup.setAttribute('aria-label', text);

    // Mũi tên: inline xoay ▼/▲, menu ngang (cấp gốc) ▼, popup dọc ▶
    this._arrow.setAttribute('name', inline || ctx.horizontalRoot ? 'chevron-down' : 'chevron-right');
    this._arrow.classList.toggle('arrow--inline', inline);
    this.setState('open', open);

    // Đổi mode (inline ↔ popup) → dọn trạng thái cũ, hiển thị lại không animation
    const popupMode = !inline;
    if (popupMode !== this._popupMode) {
      const first = this._popupMode === null;
      this._teardownFloating();
      this._popup.removeAttribute('popover');
      this._popup.style.left = '';
      this._popup.style.top = '';
      this._popup.className = `popup ${popupMode ? 'hui-floating popup--floating' : 'popup--inline'}`;
      this._popupMode = popupMode;
      this._shownOpen = false;
      this._popup.hidden = true;
      if (open) this._show(!first);
      return;
    }
    if (open !== this._shownOpen) {
      if (open) this._show(true);
      else this._hide();
    }
  }

  _show(animate) {
    if (!this.isConnected) return;
    this._shownOpen = true;
    ++this._token; // hủy lượt đóng đang chờ animation
    const popup = this._popup;
    popup.getAnimations?.().forEach((a) => a.cancel());

    if (!this._popupMode) {
      popup.hidden = false;
      if (animate) collapse(popup, true);
      return;
    }

    showFloating(popup, '--hui-z-dropdown');
    this._stopAutoUpdate?.();
    this._stopAutoUpdate = autoUpdate(this._title, popup, () => this._position());
    if (animate) animateIn(popup, this._ctx.horizontalRoot ? 'slide-down' : 'zoom', { origin: this._origin });

    const menu = this.closest('hui-menu');
    this._overlay?.close();
    this._overlay = openOverlay({
      element: popup,
      ignore: [this._title],
      restoreFocus: false,
      onEscape: () => menu?._onPopupEscape(this),
      onClickOutside: (e) => menu?._onPopupOutside(this, e),
    });
  }

  _hide() {
    this._shownOpen = false;
    const token = ++this._token;
    const popup = this._popup;
    this._overlay?.close();
    this._overlay = null;

    if (!this._popupMode) {
      collapse(popup, false).then(() => {
        if (token === this._token) popup.hidden = true;
      });
      return;
    }
    animateOut(popup, this._ctx.horizontalRoot ? 'slide-down' : 'zoom', { origin: this._origin }).then(() => {
      if (token !== this._token) return;
      this._teardownFloating();
    });
  }

  /** Gỡ popup nổi ngay lập tức (không animation) */
  _teardownFloating() {
    this._overlay?.close();
    this._overlay = null;
    this._stopAutoUpdate?.();
    this._stopAutoUpdate = null;
    if (this._popup && this._popupMode) {
      hideFloating(this._popup);
      this._popup.getAnimations?.().forEach((a) => a.cancel());
    }
  }

  _position() {
    const horizontalRoot = this._ctx.horizontalRoot;
    const pos = computePosition(this._title, this._popup, {
      placement: horizontalRoot ? 'bottom-start' : 'right-start',
      offset: horizontalRoot ? 4 : 6,
    });
    this._popup.style.left = `${pos.x}px`;
    this._popup.style.top = `${pos.y}px`;
    this._origin = { bottom: 'top left', top: 'bottom left', right: 'top left', left: 'top right' }[pos.side];
  }
}

defineElement('hui-sub-menu', HuiSubMenu);

export default HuiSubMenu;
