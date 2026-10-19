/**
 * HUI Descriptions Item — Một cặp nhãn/giá trị trong <hui-descriptions>. Xem JSDoc của class.
 */

import styles from './hui-descriptions-item.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/**
 * Host dùng `display: contents` → ô nhãn và ô giá trị trong shadow trở thành ô của lưới cha.
 * Vị trí (hàng, cột, span) do <hui-descriptions> tính và gán qua `_place()`.
 *
 * @slot - Giá trị
 * @slot label - Nhãn tùy biến (thay attribute label)
 * @csspart label - Ô nhãn (role="rowheader")
 * @csspart content - Ô giá trị (role="cell")
 */
class HuiDescriptionsItem extends HuiElement {
  static properties = {
    /** Nhãn (hoặc slot="label") */
    label: { type: String },
    /** Số cột chiếm (mặc định 1) hoặc "filled" = lấp hết phần còn lại của hàng */
    span: { type: String },
  };

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    if (this._internals && 'role' in this._internals) this._internals.role = 'row';
    else if (!this.hasAttribute('role')) this.setAttribute('role', 'row');
  }

  render() {
    this._labelText = createElement('span');
    this._labelCell = createElement('div', { className: 'hui-descriptions-item__label', part: 'label', role: 'rowheader' },
      createElement('slot', { name: 'label' }, this._labelText));
    this._contentCell = createElement('div', { className: 'hui-descriptions-item__content', part: 'content', role: 'cell' },
      createElement('slot'));
    if (this._placement) this._applyPlacement();
    return [this._labelCell, this._contentCell];
  }

  updated(changed) {
    if (changed.has('label')) this._labelText.textContent = this.label || '';
    // span đổi (hoặc lần đầu được nâng cấp) → nhờ cha bố trí lại
    if (changed.has('span')) this.emit('hui-descriptions-item-change', null, { composed: false });
  }

  /** Gọi bởi hui-descriptions: { vertical, row, col, span } (đếm từ 0) */
  _place(placement) {
    this._placement = placement;
    if (this._labelCell) this._applyPlacement();
  }

  _applyPlacement() {
    const { vertical, row, col, span } = this._placement;
    const l = this._labelCell.style;
    const c = this._contentCell.style;
    if (vertical) {
      // Mỗi hàng logic = 2 hàng lưới: nhãn trên, giá trị dưới
      l.gridColumn = c.gridColumn = `${col + 1} / span ${span}`;
      l.gridRow = String(row * 2 + 1);
      c.gridRow = String(row * 2 + 2);
    } else {
      // Mỗi cột logic = 2 track: nhãn (auto) + giá trị (1fr)
      l.gridColumn = `${col * 2 + 1} / span 1`;
      c.gridColumn = `${col * 2 + 2} / span ${span * 2 - 1}`;
      l.gridRow = c.gridRow = String(row + 1);
    }
  }
}

defineElement('hui-descriptions-item', HuiDescriptionsItem);

export default HuiDescriptionsItem;
