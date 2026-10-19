/**
 * HUI Row — Hàng của lưới 24 cột (Ant Grid Row + MUI Grid container)
 * gutter="16" (ngang) hoặc "16,24" (ngang, dọc); từ khóa sm / md / lg cũng được.
 * Khoảng cách ngang truyền xuống hui-col qua biến nội bộ --_row-gx (kế thừa xuyên slot).
 * Biến CSS: xem đầu hui-row.css.
 */

import styles from './hui-row.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { toGap } from '../hui-flex/hui-flex.js';

/**
 * @slot - Các cột hui-col
 * @csspart base - Khung flex bên trong (mang margin âm = gutter / 2)
 * @cssprop --hui-row-gutter-x - Khoảng cách ngang mặc định khi không có attribute gutter (0)
 * @cssprop --hui-row-gutter-y - Khoảng cách dọc mặc định (0)
 */
class HuiRow extends HuiElement {
  static properties = {
    /** Khoảng cách giữa các cột: "h" hoặc "h,v" — số (px), từ khóa sm | md | lg hoặc độ dài CSS */
    gutter: { type: String },
    /** top | middle | bottom | stretch | baseline — căn dọc các cột */
    align: { type: String },
    /** start | end | center | space-around | space-between | space-evenly — căn ngang các cột */
    justify: { type: String },
    /** "false" = không xuống dòng khi tổng span > 24 */
    wrap: { type: String, default: 'true' },
  };

  static styles = styles;

  render() {
    this._base = createElement('div', { className: 'row', part: 'base' }, createElement('slot'));
    return this._base;
  }

  updated(changed) {
    if (changed.has('gutter')) {
      const [h, v] = String(this.gutter ?? '').split(/[,\s]+/).filter(Boolean);
      // Luôn đặt giá trị (kể cả mặc định) để hàng lồng trong cột không kế thừa gutter của hàng ngoài
      this._base.style.setProperty('--_row-gx', toGap(h) ?? 'var(--hui-row-gutter-x, 0px)');
      this._base.style.setProperty('--_row-gy', toGap(v) ?? 'var(--hui-row-gutter-y, 0px)');
    }
    this._base.classList.toggle('row--nowrap', this.wrap === 'false');
  }
}

defineElement('hui-row', HuiRow);

export default HuiRow;
