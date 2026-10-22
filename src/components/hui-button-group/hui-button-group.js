/**
 * HUI Button Group — Gộp các <hui-button> liền nhau thành một khối (Ant Button.Group / MUI ButtonGroup).
 * Chỉ bo góc 2 đầu nhóm, viền giữa các nút gộp làm một. `size` / `variant` của nhóm áp cho nút con
 * nào chưa tự đặt. Parts / biến CSS: xem JSDoc class.
 */

import styles from './hui-button-group.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import '../hui-button/hui-button.js';

/** Thuộc tính nhóm truyền xuống nút con (chỉ khi nút con không tự đặt) */
const INHERITED = ['size', 'variant'];

/**
 * Nhóm nút gộp viền, role="group".
 * @slot - Các <hui-button> (hoặc <button>)
 * @csspart base - Khung flex chứa các nút
 * @cssprop --hui-button-group-radius - Bo góc 2 đầu nhóm
 */
class HuiButtonGroup extends HuiElement {
  static properties = {
    /** horizontal | vertical — hướng xếp nút */
    orientation: { type: String, default: 'horizontal' },
    /** '' | sm | md | lg — áp cho nút con chưa có size riêng */
    size: { type: String, default: '' },
    /** '' | primary | outline | … — áp cho nút con chưa có variant riêng */
    variant: { type: String, default: '' },
    /** Chiếm toàn bộ chiều ngang, các nút chia đều */
    block: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    /** Nút con → { size, variant } attribute gốc do chính người dùng đặt */
    this._own = new WeakMap();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._internals && 'role' in this._internals) this._internals.role = 'group';
    else if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncChildren());
    return createElement('div', { className: 'bgroup', part: 'base' }, this._slot);
  }

  updated(changed) {
    if (changed.has('orientation') && this._internals && 'ariaOrientation' in this._internals) {
      this._internals.ariaOrientation = this.orientation === 'vertical' ? 'vertical' : null;
    }
    this._syncChildren();
  }

  _children() {
    return this._slot ? this._slot.assignedElements() : [];
  }

  _syncChildren() {
    for (const el of this._children()) {
      if (!this._own.has(el)) {
        this._own.set(el, Object.fromEntries([...INHERITED, 'block'].map((k) => [k, el.getAttribute(k)])));
      }
      const own = this._own.get(el);
      for (const key of INHERITED) {
        if (own[key] !== null) continue;
        if (this[key]) el.setAttribute(key, this[key]);
        else el.removeAttribute(key);
      }
      // block: hui-button bên trong cũng phải giãn 100%
      if (el.localName === 'hui-button' && own.block === null) el.toggleAttribute('block', this.block);
    }
  }
}

defineElement('hui-button-group', HuiButtonGroup);

export default HuiButtonGroup;
