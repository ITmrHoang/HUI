/**
 * HUI Breadcrumb — Đường dẫn vị trí trang (Ant Breadcrumb + MUI Breadcrumbs)
 *   <hui-breadcrumb max-items="4"><hui-breadcrumb-item href="/">Trang chủ</hui-breadcrumb-item>...</hui-breadcrumb>
 * Breadcrumb truyền ngữ cảnh (dấu phân cách, item cuối, ẩn bớt) xuống từng hui-breadcrumb-item con.
 */

import styles from './hui-breadcrumb.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { breadcrumbText } from './breadcrumb-locale.js';
import './hui-breadcrumb-item.js';

/**
 * @slot - Các hui-breadcrumb-item
 * @slot separator - Dấu phân cách tùy chỉnh dạng HTML (được sao chép vào giữa các item)
 * @csspart base - Thẻ <nav> (landmark)
 * @csspart list - Danh sách <ol>
 * @cssprop --hui-breadcrumb-font-size - Cỡ chữ
 * @cssprop --hui-breadcrumb-color - Màu chữ item thường
 * @cssprop --hui-breadcrumb-link-color - Màu link
 * @cssprop --hui-breadcrumb-link-hover-color - Màu link khi hover
 * @cssprop --hui-breadcrumb-link-hover-bg - Nền link khi hover
 * @cssprop --hui-breadcrumb-last-color - Màu item cuối (trang hiện tại)
 * @cssprop --hui-breadcrumb-separator-color - Màu dấu phân cách
 * @cssprop --hui-breadcrumb-separator-margin - Khoảng cách hai bên dấu phân cách
 */
class HuiBreadcrumb extends HuiElement {
  static properties = {
    /** Dấu phân cách dạng chữ (slot separator ưu tiên hơn) */
    separator: { type: String, default: '/' },
    /** Hiện tối đa N item; nhiều hơn → gộp các item giữa thành "…" (bấm để hiện đủ) */
    maxItems: { type: Number },
    /** Số item giữ lại phía trước "…" */
    itemsBeforeCollapse: { type: Number, default: 1 },
    /** Số item giữ lại phía sau "…" (mặc định = max-items - items-before-collapse) */
    itemsAfterCollapse: { type: Number },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._expanded = false;
    this._queued = false;
  }

  render() {
    this.requestUpdate('locale'); // lần updated() đầu cũng đặt chữ theo locale
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._schedule());
    this._sepSlot = createElement('slot', { name: 'separator' });
    this._sepSlot.addEventListener('slotchange', () => this._schedule());
    this._list = createElement('ol', { className: 'list', part: 'list' }, this._slot);
    this._nav = createElement('nav', { className: 'breadcrumb', part: 'base' }, this._list,
      createElement('span', { hidden: true }, this._sepSlot));
    // Item đầu bấm "…" → mở rộng
    this.addEventListener('hui-breadcrumb-expand', (e) => {
      e.stopPropagation();
      this._expanded = true;
      this._sync();
      this._items()[this._before]?.focus?.();
    });
    return this._nav;
  }

  updated(changed) {
    if (changed.has('locale')) this._nav.setAttribute('aria-label', breadcrumbText('breadcrumb.label'));
    if (changed.has('maxItems')) this._expanded = false;
    this._sync();
  }

  _items() {
    return [...this.children].filter((el) => el.localName === 'hui-breadcrumb-item');
  }

  get _before() {
    return Math.max(1, this.itemsBeforeCollapse ?? 1);
  }

  _schedule() {
    if (this._queued) return;
    this._queued = true;
    queueMicrotask(() => {
      this._queued = false;
      this._sync();
    });
  }

  _sync() {
    if (!this._hasRendered) return;
    const items = this._items();
    const sepNode = this._sepSlot.assignedElements()[0] || null;
    const max = this.maxItems;
    const before = this._before;
    const after = Math.max(1, this.itemsAfterCollapse ?? ((max || 0) - before));
    const collapse = !this._expanded && max > 0 && items.length > max && before + after < items.length;

    items.forEach((item, i) => {
      const hidden = collapse && i >= before && i < items.length - after;
      item._applyContext?.({
        separator: this.separator ?? '/',
        separatorNode: sepNode,
        last: i === items.length - 1,
        hiddenByCollapse: hidden,
        ellipsisAfter: collapse && i === before - 1,
      });
    });
  }
}

defineElement('hui-breadcrumb', HuiBreadcrumb);

export default HuiBreadcrumb;
