/**
 * HUI Menu Item — Một mục trong <hui-menu> (hoặc hui-sub-menu / hui-menu-group). Xem JSDoc của class.
 */

import styles from './hui-menu-item.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { DEFAULT_CTX } from './menu-shared.js';
import '../hui-icon/hui-icon.js';

/**
 * Mục menu. Trạng thái chọn / cấp lồng / chế độ hiển thị do <hui-menu> cha điều khiển;
 * click và bàn phím cũng do hui-menu xử lý tập trung (phát hui-select).
 *
 * @slot - Nhãn
 * @slot icon - Icon tùy chỉnh (thay cho attribute icon)
 * @slot extra - Nội dung phụ bên phải (phím tắt, badge...)
 * @csspart base - Dòng menu (role=menuitem; là thẻ <a> khi có href)
 * @csspart icon - Vùng icon
 * @csspart label - Vùng nhãn
 * @csspart extra - Vùng extra
 */
class HuiMenuItem extends HuiElement {
  static properties = {
    /** Khóa định danh (dùng cho selected-keys, sự kiện hui-select) */
    key: { type: String },
    /** Tên hui-icon hiển thị trước nhãn */
    icon: { type: String },
    /** Không chọn được */
    disabled: { type: Boolean },
    /** Kiểu nguy hiểm (chữ đỏ) — vd: Xóa, Đăng xuất */
    danger: { type: Boolean },
    /** Có href → render thẻ <a> (điều hướng native, middle-click mở tab mới) */
    href: { type: String },
    /** target của thẻ <a> (_blank...) */
    target: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    this._ctx = DEFAULT_CTX;
    this._tabbable = false;
  }

  render() {
    this._iconEl = createElement('hui-icon');
    this._iconSlot = createElement('slot', { name: 'icon' }, this._iconEl);
    this._iconSlot.addEventListener('slotchange', () => this._applyCtx());
    this._iconWrap = createElement('span', { className: 'icon', part: 'icon' }, this._iconSlot);
    this._letter = createElement('span', { className: 'letter', 'aria-hidden': 'true' });
    this._labelSlot = createElement('slot');
    this._labelSlot.addEventListener('slotchange', () => this._applyCtx());
    this._label = createElement('span', { className: 'label', part: 'label' }, this._labelSlot);
    const extraSlot = createElement('slot', { name: 'extra' });
    this._extra = createElement('span', { className: 'extra', part: 'extra', hidden: true }, extraSlot);
    extraSlot.addEventListener('slotchange', () => (this._extra.hidden = !extraSlot.assignedNodes().length));

    this._base = this._createBase('div');
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._menu()?._scheduleSync?.();
  }

  updated(changed) {
    if (changed.has('href') || changed.has('target') || changed.has('disabled')) this._syncBase();
    if (changed.has('icon')) {
      if (this.icon) this._iconEl.setAttribute('name', this.icon);
      else this._iconEl.removeAttribute('name');
    }
    this._applyCtx();
  }

  /** Focus vào dòng menu bên trong (hui-menu gọi khi điều hướng bàn phím) */
  focus(options) {
    if (this._base) this._base.focus(options);
    else super.focus(options);
  }

  /** Nhãn dạng text (dùng cho tooltip khi menu thu gọn) */
  get labelText() {
    const nodes = this._labelSlot?.assignedNodes() ?? [...this.childNodes].filter((n) => !n.slot);
    return nodes.map((n) => n.textContent).join('').trim();
  }

  // =====================================================
  // NỘI BỘ — hui-menu gọi
  // =====================================================

  _menu() {
    return this.closest('hui-menu');
  }

  /** hui-menu truyền ngữ cảnh: { mode, level, indent, horizontalRoot, collapsedRoot, selected... } */
  _applyContext(ctx) {
    this._ctx = ctx;
    if (this._hasRendered) this._applyCtx();
  }

  _setTabbable(on) {
    this._tabbable = on;
    if (this._base) this._base.tabIndex = on ? 0 : -1;
  }

  /** Bấm như người dùng (giữ điều hướng native của <a>) */
  _activate() {
    this._base.click();
  }

  _createBase(tag) {
    const base = createElement(tag, { part: 'base', role: 'menuitem', tabindex: this._tabbable ? '0' : '-1' });
    base.append(this._iconWrap, this._letter, this._label, this._extra);
    return base;
  }

  /** Đổi <div> ↔ <a> khi href đổi; item disabled thì bỏ href để không điều hướng */
  _syncBase() {
    const tag = this.href ? 'a' : 'div';
    if (this._base.localName !== tag) {
      const next = this._createBase(tag);
      this._base.replaceWith(next);
      this._base = next;
    }
    if (tag === 'a') {
      if (this.disabled) this._base.removeAttribute('href');
      else this._base.setAttribute('href', this.href);
      if (this.target) this._base.setAttribute('target', this.target);
      else this._base.removeAttribute('target');
      if (this.target === '_blank') this._base.setAttribute('rel', 'noopener noreferrer');
    }
    if (this.disabled) this._base.setAttribute('aria-disabled', 'true');
    else this._base.removeAttribute('aria-disabled');
  }

  _hasIcon() {
    return Boolean(this.icon) || this._iconSlot.assignedNodes().length > 0;
  }

  _applyCtx() {
    if (!this._hasRendered) return;
    const ctx = this._ctx;
    const hasIcon = this._hasIcon();
    this._iconWrap.hidden = !hasIcon;

    this._base.className = [
      'item',
      ctx.horizontalRoot ? 'item--horizontal' : '',
      ctx.collapsedRoot ? 'item--collapsed' : '',
      ctx.collapsedRoot && !hasIcon ? 'item--no-icon' : '',
      ctx.selected ? 'item--selected' : '',
      this.danger ? 'item--danger' : '',
      this.disabled ? 'item--disabled' : '',
    ].filter(Boolean).join(' ');

    // Thụt lề theo cấp chỉ áp cho menu inline
    const level = ctx.mode === 'inline' ? ctx.level : 0;
    this._base.style.setProperty('--_mi-level', String(level));
    this._base.style.setProperty('--_mi-indent', `${ctx.indent}px`);

    // Menu thu gọn: nhãn ẩn → hiện qua tooltip native (title)
    const text = this.labelText;
    this._letter.textContent = ctx.collapsedRoot && !hasIcon ? text.charAt(0) : '';
    if (ctx.collapsedRoot) {
      this._base.title = text;
      this._base.setAttribute('aria-label', text);
    } else {
      this._base.removeAttribute('title');
      this._base.removeAttribute('aria-label');
    }

    if (ctx.selected) this._base.setAttribute('aria-current', 'page');
    else this._base.removeAttribute('aria-current');
    this.setState('selected', ctx.selected);
    this.setState('disabled', this.disabled);
  }
}

defineElement('hui-menu-item', HuiMenuItem);

export default HuiMenuItem;
