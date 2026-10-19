/**
 * HUI Breadcrumb Item — Một cấp trong <hui-breadcrumb>. Xem JSDoc của class.
 */

import styles from './hui-breadcrumb-item.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { breadcrumbText } from './breadcrumb-locale.js';
import '../hui-icon/hui-icon.js';
import '../hui-dropdown/hui-dropdown.js';

/**
 * Một cấp đường dẫn: link (href) hoặc chữ; có thể kèm menu thả xuống (property menu → hui-dropdown).
 * Item cuối tự gắn aria-current="page".
 *
 * @fires hui-click - Bấm vào item (kể cả không có href). detail: { originalEvent }
 * @slot - Nhãn
 * @csspart base - Khung item
 * @csspart link - Thẻ <a> (có href) hoặc <span>
 * @csspart icon - Icon trước nhãn
 * @csspart dropdown-icon - Mũi tên ▼ khi có menu
 * @csspart separator - Dấu phân cách sau item
 * @csspart ellipsis - Nút "…" (item ngay trước phần bị rút gọn)
 */
class HuiBreadcrumbItem extends HuiElement {
  static properties = {
    /** Đường dẫn → render thẻ <a> */
    href: { type: String },
    /** target của thẻ <a> */
    target: { type: String },
    /** Tên hui-icon trước nhãn */
    icon: { type: String },
    /** Mảng item menu thả xuống (xem hui-dropdown) — gán bằng property */
    menu: { type: Array, default: [] },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._ctx = { separator: '/', separatorNode: null, last: false, hiddenByCollapse: false, ellipsisAfter: false };
    this._hiddenByUs = false;
  }

  render() {
    this.requestUpdate('locale'); // lần updated() đầu cũng đặt chữ theo locale
    this._icon = createElement('hui-icon', { className: 'icon', part: 'icon', hidden: true });
    this._label = createElement('span', { className: 'label' }, createElement('slot'));
    this._caret = createElement('hui-icon', { className: 'caret', part: 'dropdown-icon', name: 'chevron-down', hidden: true });
    this._link = this._createLink('span');
    this._dropdown = null;
    this._base = createElement('span', { className: 'item', part: 'base' }, this._link);

    this._sep = createElement('span', { className: 'sep', part: 'separator', 'aria-hidden': 'true' });
    this._ellipsisBtn = createElement('button', { className: 'ellipsis', part: 'ellipsis', type: 'button' }, '…');
    this._ellipsisBtn.addEventListener('click', () => this.emit('hui-breadcrumb-expand'));
    this._ellipsisSep = createElement('span', { className: 'sep', part: 'separator', 'aria-hidden': 'true' });
    this._ellipsis = createElement('span', { className: 'ellipsis-wrap', hidden: true }, this._ellipsisBtn, this._ellipsisSep);
    return [this._base, this._sep, this._ellipsis];
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
    this.parentElement?._schedule?.();
  }

  updated(changed) {
    if (changed.has('href') || changed.has('target')) this._syncLink();
    if (changed.has('icon')) {
      this._icon.hidden = !this.icon;
      if (this.icon) this._icon.setAttribute('name', this.icon);
    }
    if (changed.has('menu')) this._syncMenu();
    if (changed.has('locale')) this._ellipsisBtn.setAttribute('aria-label', breadcrumbText('breadcrumb.expand'));
    this._applyCtx();
  }

  focus(options) {
    if (this._link?.localName === 'a') this._link.focus(options);
    else super.focus(options);
  }

  /** hui-breadcrumb truyền: { separator, separatorNode, last, hiddenByCollapse, ellipsisAfter } */
  _applyContext(ctx) {
    this._ctx = ctx;
    if (this._hasRendered) this._applyCtx();
  }

  _createLink(tag) {
    const link = createElement(tag, { className: 'link', part: 'link' }, this._icon, this._label, this._caret);
    link.addEventListener('click', (e) => this.emit('hui-click', { originalEvent: e }));
    return link;
  }

  _syncLink() {
    const tag = this.href ? 'a' : 'span';
    if (this._link.localName !== tag) {
      const next = this._createLink(tag);
      this._link.replaceWith(next);
      this._link = next;
    }
    if (tag === 'a') {
      this._link.setAttribute('href', this.href);
      if (this.target) this._link.setAttribute('target', this.target);
      else this._link.removeAttribute('target');
      if (this.target === '_blank') this._link.setAttribute('rel', 'noopener noreferrer');
    }
    this._applyCtx();
  }

  /** Có menu → bọc link trong hui-dropdown (hover mở) */
  _syncMenu() {
    const has = Array.isArray(this.menu) && this.menu.length > 0;
    this._caret.hidden = !has;
    if (has && !this._dropdown) {
      this._dropdown = createElement('hui-dropdown', { trigger: 'hover', placement: 'bottom-start', part: 'dropdown' });
      this._base.replaceChildren(this._dropdown);
      this._dropdown.append(this._link);
    } else if (!has && this._dropdown) {
      this._base.replaceChildren(this._link);
      this._dropdown = null;
    }
    if (this._dropdown) this._dropdown.menu = this.menu;
  }

  _applyCtx() {
    if (!this._hasRendered) return;
    const ctx = this._ctx;

    // Dấu phân cách: slot separator của breadcrumb (sao chép) hoặc chữ
    for (const sep of [this._sep, this._ellipsisSep]) {
      if (ctx.separatorNode) {
        const clone = ctx.separatorNode.cloneNode(true);
        clone.removeAttribute('slot');
        sep.replaceChildren(clone);
      } else {
        sep.textContent = ctx.separator;
      }
    }
    this._sep.hidden = ctx.last;
    this._ellipsis.hidden = !ctx.ellipsisAfter;
    this._base.classList.toggle('item--last', ctx.last);

    if (ctx.last) this._link.setAttribute('aria-current', 'page');
    else this._link.removeAttribute('aria-current');
    this.setState('last', ctx.last);

    // Ẩn do rút gọn — chỉ gỡ hidden do chính mình đặt, không đụng hidden người dùng tự đặt
    if (ctx.hiddenByCollapse && !this.hidden) {
      this.hidden = true;
      this._hiddenByUs = true;
    } else if (!ctx.hiddenByCollapse && this._hiddenByUs) {
      this.hidden = false;
      this._hiddenByUs = false;
    }
  }
}

defineElement('hui-breadcrumb-item', HuiBreadcrumbItem);

export default HuiBreadcrumbItem;
