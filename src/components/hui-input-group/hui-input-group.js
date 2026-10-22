/**
 * HUI Input Group — Ghép nhiều control liền nhau thành một khối (Ant Space.Compact / Input.Group):
 * hui-select + hui-input + hui-button… viền gộp làm một, chỉ bo góc 2 đầu, hộp chữ addon trước/sau.
 * Bo góc từng control được điều khiển qua biến --hui-<control>-radius (4 giá trị góc).
 */

import styles from './hui-input-group.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/**
 * Khối control gộp viền, role="group".
 * @slot - Các control (hui-input, hui-select, hui-button, hui-autocomplete, hui-input-number, input, button…)
 * @slot before - Hộp chữ gắn trước (vd "https://")
 * @slot after - Hộp chữ gắn sau (vd ".com", "VNĐ")
 * @csspart base - Khung flex
 * @csspart addon-before - Hộp addon trước
 * @csspart addon-after - Hộp addon sau
 * @cssprop --hui-input-group-radius - Bo góc 2 đầu khối
 * @cssprop --hui-input-group-addon-bg - Nền hộp addon
 * @cssprop --hui-input-group-addon-color - Màu chữ addon
 * @cssprop --hui-input-group-border-color - Viền hộp addon
 */
class HuiInputGroup extends HuiElement {
  static properties = {
    /** Co theo nội dung (inline-flex) thay vì giãn hết chiều ngang */
    compact: { type: Boolean },
    /** '' | sm | md | lg — áp cho control con chưa tự đặt size */
    size: { type: String, default: '' },
  };

  static styles = styles;

  constructor() {
    super();
    this._ownSize = new WeakMap();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._internals && 'role' in this._internals) this._internals.role = 'group';
    else if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
  }

  render() {
    this._slot = createElement('slot');
    this._beforeSlot = createElement('slot', { name: 'before' });
    this._afterSlot = createElement('slot', { name: 'after' });
    this._before = createElement('span', { className: 'ig__addon ig__addon--before', part: 'addon-before' }, this._beforeSlot);
    this._after = createElement('span', { className: 'ig__addon ig__addon--after', part: 'addon-after' }, this._afterSlot);
    for (const s of [this._slot, this._beforeSlot, this._afterSlot]) s.addEventListener('slotchange', () => this._sync());
    this._base = createElement('div', { className: 'ig', part: 'base' }, this._before, this._slot, this._after);
    return this._base;
  }

  updated() {
    this._sync();
  }

  _sync() {
    if (!this._base) return;
    const hasBefore = this._beforeSlot.assignedNodes().length > 0;
    const hasAfter = this._afterSlot.assignedNodes().length > 0;
    this._before.hidden = !hasBefore;
    this._after.hidden = !hasAfter;
    this._base.className = ['ig', `ig--${this.size || 'md'}`, hasBefore && 'ig--has-before', hasAfter && 'ig--has-after']
      .filter(Boolean).join(' ');
    for (const el of this._slot.assignedElements()) {
      // Chỉ custom element (thẻ native <input size> nghĩa là số ký tự — không đụng tới)
      if (!el.localName.includes('-')) continue;
      if (!this._ownSize.has(el)) this._ownSize.set(el, el.getAttribute('size'));
      if (this._ownSize.get(el) !== null) continue;
      if (this.size) el.setAttribute('size', this.size);
      else el.removeAttribute('size');
    }
  }
}

defineElement('hui-input-group', HuiInputGroup);

export default HuiInputGroup;
