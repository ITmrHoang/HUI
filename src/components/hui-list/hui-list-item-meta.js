/**
 * HUI List Item Meta — Avatar + tiêu đề + mô tả trong <hui-list-item>. Xem JSDoc của class.
 */

import styles from './hui-list-item-meta.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * @slot avatar - Avatar / icon bên trái
 * @slot title - Tiêu đề tùy biến (thay attribute title)
 * @slot description - Mô tả tùy biến (thay attribute description)
 * @csspart base - Khung meta
 * @csspart avatar - Vùng avatar
 * @csspart content - Khối tiêu đề + mô tả
 * @csspart title - Tiêu đề
 * @csspart description - Mô tả
 * @cssprop --hui-list-meta-title-color - Màu tiêu đề
 * @cssprop --hui-list-meta-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-list-meta-description-color - Màu mô tả
 * @cssprop --hui-list-meta-gap - Khoảng cách avatar ↔ nội dung
 */
class HuiListItemMeta extends HuiElement {
  static properties = {
    /** Tiêu đề (hoặc slot="title") */
    title: { type: String },
    /** Mô tả (hoặc slot="description") */
    description: { type: String },
  };

  static styles = styles;

  render() {
    const slot = (name, fallback) => {
      const s = createElement('slot', { name }, fallback);
      s.addEventListener('slotchange', () => this._sync());
      return s;
    };
    this._titleText = createElement('span');
    this._descText = createElement('span');
    this._avatarSlot = slot('avatar');
    this._titleSlot = slot('title', this._titleText);
    this._descSlot = slot('description', this._descText);

    this._avatar = createElement('div', { className: 'hui-list-meta__avatar', part: 'avatar' }, this._avatarSlot);
    this._title = createElement('div', { className: 'hui-list-meta__title', part: 'title' }, this._titleSlot);
    this._desc = createElement('div', { className: 'hui-list-meta__description', part: 'description' }, this._descSlot);
    const content = createElement('div', { className: 'hui-list-meta__content', part: 'content' }, this._title, this._desc);
    return createElement('div', { className: 'hui-list-meta', part: 'base' }, this._avatar, content);
  }

  updated(changed) {
    if (changed.has('title')) this._titleText.textContent = this.title || '';
    if (changed.has('description')) this._descText.textContent = this.description || '';
    this._sync();
  }

  _sync() {
    this._avatar.hidden = !hasContent(this._avatarSlot);
    this._title.hidden = !(this.title || hasContent(this._titleSlot));
    this._desc.hidden = !(this.description || hasContent(this._descSlot));
  }
}

defineElement('hui-list-item-meta', HuiListItemMeta);

export default HuiListItemMeta;
