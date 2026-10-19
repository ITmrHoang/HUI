/**
 * HUI Dropdown — Menu thả xuống gắn vào một trigger (Ant Dropdown + MUI Menu)
 *   <hui-dropdown trigger="click"><hui-button>Tùy chọn</hui-button><hui-menu slot="menu">...</hui-menu></hui-dropdown>
 *   dropdown.menu = [{ key: 'edit', label: 'Sửa', icon: 'edit' }, { divider: true }, { key: 'del', label: 'Xóa', danger: true }]
 * Popup nằm trên top-layer (utils/floating), Esc / click ra ngoài đóng (utils/overlay + listener riêng).
 */

import styles from './hui-dropdown.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import {
  autoUpdate, computePosition, floatingCss, hideFloating, showFloating, virtualPoint,
} from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { getTabbables, openOverlay } from '../../utils/overlay.js';
import '../hui-menu/index.js';

/** Tên kiểu Ant không có trong floating.js (topCenter / bottomCenter) */
const EXTRA_ALIAS = { topCenter: 'top', bottomCenter: 'bottom' };

/**
 * Dựng cây hui-menu từ mảng mô tả { key, label, icon, disabled, danger, divider, children, type: 'group' }.
 * Dùng chung cho hui-dropdown, hui-dropdown-button, hui-breadcrumb-item.
 */
export function buildMenuItems(items = []) {
  return items.filter(Boolean).map((it) => {
    if (it.divider || it.type === 'divider') return createElement('hui-menu-divider');
    if (it.type === 'group') {
      const group = createElement('hui-menu-group', { label: it.label ?? '' });
      group.append(...buildMenuItems(it.children || []));
      return group;
    }
    const attrs = { key: String(it.key ?? it.label ?? '') };
    if (it.icon) attrs.icon = it.icon;
    if (it.disabled) attrs.disabled = true;
    if (Array.isArray(it.children) && it.children.length) {
      const sub = createElement('hui-sub-menu', { ...attrs, label: it.label ?? '' });
      sub.append(...buildMenuItems(it.children));
      return sub;
    }
    if (it.danger) attrs.danger = true;
    if (it.href) attrs.href = it.href;
    return createElement('hui-menu-item', attrs, String(it.label ?? it.key ?? ''));
  });
}

/**
 * @fires open-change - Mở/đóng do người dùng hoặc method. detail: { open }
 * @fires hui-select - (nổi bọt từ hui-menu bên trong) chọn một item. detail: { key, keyPath, item }
 * @slot - Phần tử kích hoạt (trigger)
 * @slot menu - Nội dung popup, thường là một <hui-menu> (ưu tiên hơn property menu)
 * @csspart trigger - Khung bọc trigger
 * @csspart popup - Khung popup (top-layer)
 * @csspart content - Hộp nội dung (nền, bóng, bo góc)
 * @csspart arrow - Mũi tên (attribute arrow)
 * @csspart menu - hui-menu tự dựng từ property menu
 * @csspart menu-base - Part base của hui-menu tự dựng
 * @cssprop --hui-dropdown-bg - Nền popup
 * @cssprop --hui-dropdown-radius - Bo góc popup
 * @cssprop --hui-dropdown-shadow - Đổ bóng popup
 * @cssprop --hui-dropdown-padding - Padding hộp nội dung
 * @cssprop --hui-dropdown-min-width - Chiều rộng tối thiểu
 * @cssprop --hui-dropdown-max-height - Chiều cao tối đa (cuộn khi dài)
 */
class HuiDropdown extends HuiElement {
  static properties = {
    /** hover | click | contextmenu — kết hợp bằng dấu cách: "hover click" */
    trigger: { type: String, default: 'hover' },
    /** 12 vị trí: top | bottom | left | right kèm -start / -end, hoặc tên Ant: bottomLeft, topRight, bottomCenter... */
    placement: { type: String, default: 'bottom-start' },
    /** Hiện mũi tên chỉ vào trigger */
    arrow: { type: Boolean },
    /** Trạng thái mở (controlled), tự phản chiếu khi mở/đóng */
    open: { type: Boolean },
    /** Không mở được */
    disabled: { type: Boolean },
    /** Mảng item { key, label, icon, disabled, danger, divider, children } → tự dựng hui-menu (gán bằng property) */
    menu: { type: Array, default: [] },
    /** Giữ trạng thái chọn của menu sau khi chọn (mặc định menu dropdown không đánh dấu chọn) */
    selectable: { type: Boolean },
    /** Khoảng cách trigger ↔ popup (px) */
    offset: { type: Number, default: 4 },
    /** Độ trễ mở khi hover (ms) */
    mouseEnterDelay: { type: Number, default: 150 },
    /** Độ trễ đóng khi rời chuột (ms) */
    mouseLeaveDelay: { type: Number, default: 100 },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._shown = false;
    this._token = 0;
    this._timer = null;
    this._overlay = null;
    this._stopAutoUpdate = null;
    this._point = null;       // vị trí chuột (contextmenu)
    this._focusOnOpen = null; // 'first' | 'last' khi mở bằng bàn phím
  }

  // =====================================================
  // PUBLIC
  // =====================================================

  show() { this._clearTimer(); this._setOpen(true); }
  hide() { this._clearTimer(); this._setOpen(false); }
  toggle() { this._clearTimer(); this._setOpen(!this._shown); }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._triggerSlot = createElement('slot');
    this._triggerSlot.addEventListener('slotchange', () => this._syncTriggerAria());
    this._trigger = createElement('span', { className: 'trigger', part: 'trigger' }, this._triggerSlot);

    this._generated = createElement('hui-menu', { part: 'menu', exportparts: 'base: menu-base', mode: 'vertical' });
    this._menuSlot = createElement('slot', { name: 'menu' }, this._generated);
    this._arrow = createElement('span', { className: 'arrow', part: 'arrow', hidden: true });
    this._content = createElement('div', { className: 'content', part: 'content' }, this._menuSlot);
    this._popup = createElement('div', { className: 'popup hui-floating', part: 'popup', hidden: true },
      this._arrow, this._content);

    const t = this._trigger;
    t.addEventListener('click', (e) => {
      if (!this._has('click')) return;
      this._point = null;
      this.toggle();
    });
    t.addEventListener('contextmenu', (e) => {
      if (!this._has('contextmenu') || this.disabled) return;
      e.preventDefault();
      this._point = virtualPoint(e.clientX, e.clientY);
      if (this._shown) this._position();
      this.show();
    });
    t.addEventListener('keydown', (e) => this._onTriggerKeydown(e));

    // Host bao cả trigger lẫn popup (popup nằm trong shadow) → rê chuột sang popup vẫn mở
    this.addEventListener('mouseenter', () => this._has('hover') && this._schedule(true));
    this.addEventListener('mouseleave', () => this._has('hover') && this._schedule(false));

    // Chọn item → đóng popup (sự kiện hui-select vẫn nổi bọt ra ngoài)
    this._popup.addEventListener('hui-select', (e) => {
      if (!this.selectable && e.target?.localName === 'hui-menu') e.target.selectedKeys = [];
      this._setOpen(false);
      this._focusTrigger();
    });
    this._popup.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') this._setOpen(false);
    });

    return [this._trigger, this._popup];
  }

  connectedCallback() {
    super.connectedCallback();
    // Click ra ngoài (kể cả khi sub-menu bên trong đang giữ lớp overlay trên cùng)
    this.listen(document, 'pointerdown', (e) => {
      if (this._shown && !e.composedPath().includes(this)) this._setOpen(false);
    }, { capture: true });
    if (this._mounted && this.open) requestAnimationFrame(() => this._applyOpen(this.open));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimer();
    if (this._shown) {
      this._shown = false;
      this._token++;
      this._teardown();
    }
  }

  updated(changed) {
    if (changed.has('menu')) this._generated.replaceChildren(...buildMenuItems(this.menu));
    if (changed.has('arrow')) this._popup.classList.toggle('popup--arrow', this.arrow);
    if (changed.has('arrow')) this._arrow.hidden = !this.arrow;
    if (changed.has('disabled') && this.disabled) this.hide();
    if (changed.has('trigger') || changed.has('disabled')) this._syncTriggerAria();

    if (changed.has('open')) {
      if (!this._mounted) requestAnimationFrame(() => this._applyOpen(this.open));
      else this._applyOpen(this.open);
    }
    if (this._shown && ['placement', 'arrow', 'offset', 'menu'].some((k) => changed.has(k))) this._position();
  }

  firstUpdated() {
    this._mounted = true;
  }

  // =====================================================
  // HELPERS
  // =====================================================

  _has(name) {
    return (this.trigger || 'hover').toLowerCase().split(/\s+/).includes(name);
  }

  _triggerEl() {
    return this._triggerSlot.assignedElements({ flatten: true })[0] || null;
  }

  /** Phần tử nhận focus thật trong trigger (hui-button → <button> bên trong) */
  _focusTrigger() {
    const el = this._triggerEl();
    el?.focus?.();
  }

  /** hui-menu trong popup (slot menu hoặc tự dựng) */
  _menuEl() {
    const slotted = this._menuSlot.assignedElements({ flatten: true });
    if (!slotted.length) return this._generated;
    return slotted.find((el) => el.localName === 'hui-menu') || slotted.find((el) => el.querySelector?.('hui-menu'))?.querySelector('hui-menu') || null;
  }

  _syncTriggerAria() {
    const el = this._triggerEl();
    if (!el) return;
    el.setAttribute('aria-haspopup', 'menu');
    el.setAttribute('aria-expanded', String(this._shown));
  }

  _clearTimer() {
    clearTimeout(this._timer);
    this._timer = null;
  }

  _schedule(open) {
    this._clearTimer();
    if (open === this._shown) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      this._point = null;
      this._setOpen(open);
    }, open ? this.mouseEnterDelay ?? 150 : this.mouseLeaveDelay ?? 100);
  }

  _onTriggerKeydown(e) {
    if (this.disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this._focusOnOpen = e.key === 'ArrowDown' ? 'first' : 'last';
      this._point = null;
      if (this._shown) this._focusMenu();
      else this.show();
    } else if ((e.key === 'Enter' || e.key === ' ') && !this._has('click')) {
      // trigger="click": Enter/Space đã sinh click native → không mở 2 lần
      e.preventDefault();
      this._focusOnOpen = 'first';
      this.show();
    }
  }

  _focusMenu() {
    const which = this._focusOnOpen || 'first';
    this._focusOnOpen = null;
    const menu = this._menuEl();
    if (menu?.focusFirst) {
      if (which === 'last') menu.focusLast();
      else menu.focusFirst();
      return;
    }
    getTabbables(this._content)[0]?.focus();
  }

  // =====================================================
  // ĐÓNG / MỞ
  // =====================================================

  _setOpen(open) {
    if (open && this.disabled) return;
    if (open === this._shown) return;
    this._applyOpen(open);
    this.open = open;
    this.emit('open-change', { open });
  }

  _applyOpen(open) {
    if (open && (this.disabled || !this.isConnected)) open = false;
    if (open === this._shown) return;
    this._shown = open;
    const token = ++this._token;
    const popup = this._popup;
    this.setState('open', open);
    this._syncTriggerAria();

    if (open) {
      popup.getAnimations?.().forEach((a) => a.cancel());
      showFloating(popup, '--hui-z-dropdown');
      this._stopAutoUpdate = autoUpdate(this._trigger, popup, () => this._position());
      animateIn(popup, this._side === 'top' ? 'slide-up' : 'slide-down', { origin: this._origin });
      this._overlay = openOverlay({
        element: popup,
        ignore: [this._trigger],
        restoreFocus: false,
        onEscape: () => {
          this._setOpen(false);
          this._focusTrigger();
        },
        onClickOutside: () => this._setOpen(false),
      });
      if (this._focusOnOpen) this._focusMenu();
      return;
    }

    this._overlay?.close();
    this._overlay = null;
    this._menuEl()?._closeAllPopups?.();
    animateOut(popup, this._side === 'top' ? 'slide-up' : 'slide-down', { origin: this._origin }).then(() => {
      if (token !== this._token) return;
      this._teardown();
    });
  }

  _teardown() {
    this._overlay?.close();
    this._overlay = null;
    this._stopAutoUpdate?.();
    this._stopAutoUpdate = null;
    hideFloating(this._popup);
    this._popup.getAnimations?.().forEach((a) => a.cancel());
  }

  _position() {
    const placement = EXTRA_ALIAS[this.placement] || this.placement || 'bottom-start';
    const reference = this._point || this._trigger;
    const pos = computePosition(reference, this._popup, {
      placement: this._point ? 'bottom-start' : placement,
      offset: this._point ? 2 : (this.offset ?? 4) + (this.arrow ? 6 : 0),
      arrow: this.arrow && !this._point ? this._arrow : undefined,
    });
    const popup = this._popup;
    popup.style.left = `${pos.x}px`;
    popup.style.top = `${pos.y}px`;
    popup.dataset.side = pos.side;
    this._side = pos.side;
    if (pos.arrowX !== undefined) popup.style.setProperty('--_dropdown-arrow-x', `${pos.arrowX}px`);
    else popup.style.removeProperty('--_dropdown-arrow-x');
    if (pos.arrowY !== undefined) popup.style.setProperty('--_dropdown-arrow-y', `${pos.arrowY}px`);
    else popup.style.removeProperty('--_dropdown-arrow-y');
    const h = { start: 'left', end: 'right', center: 'center' }[pos.align] || 'left';
    const v = { start: 'top', end: 'bottom', center: 'center' }[pos.align] || 'top';
    this._origin = { bottom: `top ${h}`, top: `bottom ${h}`, right: `${v} left`, left: `${v} right` }[pos.side];
  }
}

defineElement('hui-dropdown', HuiDropdown);

export default HuiDropdown;
