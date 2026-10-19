/**
 * HUI List Item — Một dòng trong <hui-list>. Parts/slots/biến CSS: xem JSDoc của class.
 */

import styles from './hui-list-item.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * Dòng danh sách: nội dung chính (thường là <hui-list-item-meta>), actions, extra.
 * Bố cục (actions bên phải hay bên dưới) và kiểu thẻ lưới do <hui-list> cha quyết định.
 *
 * @slot - Nội dung chính (meta + mô tả thêm)
 * @slot actions - Các hành động (bên phải; item-layout="vertical" → bên dưới nội dung)
 * @slot extra - Vùng lớn bên phải (vd: ảnh minh họa)
 * @csspart base - Khung item
 * @csspart main - Nội dung chính
 * @csspart actions - Vùng hành động
 * @csspart extra - Vùng extra
 * @cssprop --hui-list-item-padding - Khoảng đệm item
 * @cssprop --hui-list-split-color - Màu đường kẻ dưới item
 * @cssprop --hui-list-item-color - Màu chữ nội dung
 * @cssprop --hui-list-item-actions-gap - Khoảng cách giữa các hành động
 */
class HuiListItem extends HuiElement {
  static properties = {};

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    // role="listitem" qua ElementInternals → không thêm attribute lên thẻ của người dùng
    if (this._internals && 'role' in this._internals) this._internals.role = 'listitem';
    else if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
  }

  render() {
    this._actionsSlot = createElement('slot', { name: 'actions' });
    this._actions = createElement('div', { className: 'hui-list-item__actions', part: 'actions' }, this._actionsSlot);
    this._extraSlot = createElement('slot', { name: 'extra' });
    this._extra = createElement('div', { className: 'hui-list-item__extra', part: 'extra' }, this._extraSlot);
    const sync = () => {
      this._actions.hidden = !hasContent(this._actionsSlot);
      this._extra.hidden = !hasContent(this._extraSlot);
    };
    this._actionsSlot.addEventListener('slotchange', sync);
    this._extraSlot.addEventListener('slotchange', sync);
    this._actions.hidden = true;
    this._extra.hidden = true;

    const main = createElement('div', { className: 'hui-list-item__main', part: 'main' }, createElement('slot'));
    return createElement('div', { className: 'hui-list-item', part: 'base' }, main, this._actions, this._extra);
  }
}

defineElement('hui-list-item', HuiListItem);

export default HuiListItem;
