/**
 * HUI Card Meta — Khối avatar + tiêu đề + mô tả đặt trong body của <hui-card> (Ant Card.Meta). Xem JSDoc của class.
 */

import styles from './hui-card-meta.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * @slot avatar - Avatar bên trái
 * @slot title - Tiêu đề tùy biến (thay attribute title)
 * @slot description - Mô tả tùy biến (thay attribute description)
 * @csspart base - Khung meta
 * @csspart avatar - Vùng avatar
 * @csspart detail - Khối tiêu đề + mô tả
 * @csspart title - Tiêu đề
 * @csspart description - Mô tả
 * @cssprop --hui-card-meta-title-color - Màu tiêu đề
 * @cssprop --hui-card-meta-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-card-meta-description-color - Màu mô tả
 * @cssprop --hui-card-meta-gap - Khoảng cách avatar ↔ nội dung
 */
class HuiCardMeta extends HuiElement {
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

    this._avatar = createElement('div', { className: 'hui-card-meta__avatar', part: 'avatar' }, this._avatarSlot);
    this._title = createElement('div', { className: 'hui-card-meta__title', part: 'title' }, this._titleSlot);
    this._desc = createElement('div', { className: 'hui-card-meta__description', part: 'description' }, this._descSlot);
    const detail = createElement('div', { className: 'hui-card-meta__detail', part: 'detail' }, this._title, this._desc);
    return createElement('div', { className: 'hui-card-meta', part: 'base' }, this._avatar, detail);
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

defineElement('hui-card-meta', HuiCardMeta);

export default HuiCardMeta;
