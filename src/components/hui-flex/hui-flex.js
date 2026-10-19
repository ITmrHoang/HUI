/**
 * HUI Flex — Khung flexbox (Ant Flex + MUI Stack)
 * Chính thẻ <hui-flex> là flex container → con trực tiếp là flex item, không có DOM bọc thêm.
 * Biến CSS: xem đầu hui-flex.css.
 */

import styles from './hui-flex.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/** Từ khóa khoảng cách dùng chung cho hui-flex / hui-space / hui-row */
export const GAP_TOKENS = {
  none: '0px',
  xs: 'var(--hui-space-xs)',
  sm: 'var(--hui-space-sm)',
  md: 'var(--hui-space-lg)',
  lg: 'var(--hui-space-xl)',
  xl: 'var(--hui-space-2xl)',
};

/**
 * Chuẩn hóa một giá trị khoảng cách: từ khóa (sm/md/lg) → token, số trơn → px, còn lại giữ nguyên.
 * @returns {string|null}
 */
export function toGap(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (GAP_TOKENS[v]) return GAP_TOKENS[v];
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

/**
 * @slot - Các phần tử con (flex item)
 * @cssprop --hui-flex-gap - Khoảng cách mặc định giữa các phần tử khi không có attribute gap (mặc định 0)
 */
class HuiFlex extends HuiElement {
  static properties = {
    /** Xếp dọc (flex-direction: column) */
    vertical: { type: Boolean },
    /** none | xs | sm | md | lg | xl — hoặc số (px) / độ dài CSS ("8px 16px" = hàng, cột) */
    gap: { type: String },
    /** start | center | end | stretch | baseline — align-items */
    align: { type: String },
    /** start | center | end | between | around | evenly — justify-content (nhận cả space-between…) */
    justify: { type: String },
    /** Xuống dòng: để trống / "wrap" = wrap, "wrap-reverse", "nowrap" */
    wrap: { type: String },
    /** Hiển thị inline-flex */
    inline: { type: Boolean },
    /** Giá trị CSS flex của chính thẻ (khi nằm trong flex container khác), vd: "1" hoặc "0 0 200px" */
    flex: { type: String },
  };

  static styles = styles;

  render() {
    return createElement('slot');
  }

  updated(changed) {
    // gap từ khóa xử lý bằng CSS :host([gap="sm"]); số / độ dài CSS → biến nội bộ trên host
    if (changed.has('gap')) {
      const v = this.gap;
      const custom = v && !GAP_TOKENS[v] ? toGap(v) : null;
      if (custom) this.style.setProperty('--_flex-gap', custom);
      else this.style.removeProperty('--_flex-gap');
    }
    if (changed.has('flex')) {
      if (this.flex) this.style.setProperty('--_flex-self', this.flex);
      else this.style.removeProperty('--_flex-self');
    }
  }
}

defineElement('hui-flex', HuiFlex);

export default HuiFlex;
