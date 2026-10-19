/**
 * HUI Col — Cột của lưới 24 cột (Ant Grid Col + MUI Grid item)
 * span / offset / order / push / pull + responsive span-xs … span-xxl, offset-xs … offset-xxl.
 * Toàn bộ quy tắc sinh sẵn thành CSS :host([span-md="6"]) đặt trong @media → không cần JS theo dõi màn hình.
 * Breakpoint (giống Ant): xs < 576 · sm ≥ 576 · md ≥ 768 · lg ≥ 992 · xl ≥ 1200 · xxl ≥ 1600.
 */

import styles from './hui-col.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const COLUMNS = 24;

/** xs không nằm trong @media (mobile-first như Ant): áp dụng mọi kích thước, breakpoint lớn hơn ghi đè */
export const BREAKPOINTS = [
  ['xs', null],
  ['sm', 576],
  ['md', 768],
  ['lg', 992],
  ['xl', 1200],
  ['xxl', 1600],
];

/** Sinh quy tắc span / offset cho một hậu tố breakpoint ('' = attribute gốc) */
function spanRules(suffix) {
  const s = suffix ? `-${suffix}` : '';
  let css = '';
  for (let n = 0; n <= COLUMNS; n++) {
    css += n === 0
      ? `:host([span${s}="0"]){display:none}`
      : `:host([span${s}="${n}"]){--_col-span:${n};display:block}`;
    css += `:host([offset${s}="${n}"]){--_col-offset:${n}}`;
  }
  return css;
}

function buildGridCss() {
  let css = spanRules('');
  for (let n = 0; n <= COLUMNS; n++) {
    css += `:host([order="${n}"]){order:${n}}`;
    css += `:host([push="${n}"]){inset-inline-start:calc(${n} / ${COLUMNS} * 100%)}`;
    css += `:host([pull="${n}"]){inset-inline-end:calc(${n} / ${COLUMNS} * 100%)}`;
  }
  // Thứ tự tăng dần: breakpoint lớn đứng sau → thắng khi cùng độ ưu tiên
  for (const [name, min] of BREAKPOINTS) {
    css += min ? `@media (min-width:${min}px){${spanRules(name)}}` : spanRules(name);
  }
  return `${css}:host([hidden]){display:none !important}`;
}

const gridCss = buildGridCss();

/** Chuẩn hóa attribute flex kiểu Ant: 2 → "2 2 auto", "100px" → "0 0 100px", "auto" → "1 1 auto" */
function toFlex(value) {
  const v = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(v)) return `${v} ${v} auto`;
  if (/^\d+(\.\d+)?(px|em|rem|%|vw|ch)$/.test(v)) return `0 0 ${v}`;
  if (v === 'auto') return '1 1 auto';
  if (v === 'none') return '0 0 auto';
  return v;
}

/**
 * @slot - Nội dung cột
 * @cssprop --hui-col-padding-y - Khoảng đệm dọc trong cột (mặc định 0)
 */
class HuiCol extends HuiElement {
  static properties = {
    /** Số cột chiếm (0–24); 0 = ẩn */
    span: { type: Number },
    /** Số cột lùi lề trái */
    offset: { type: Number },
    /** Thứ tự hiển thị (flex order) */
    order: { type: Number },
    /** Dịch sang phải n cột (không ảnh hưởng cột khác) */
    push: { type: Number },
    /** Dịch sang trái n cột */
    pull: { type: Number },
    /** CSS flex: số ("2" = 2 2 auto), độ dài ("100px" = 0 0 100px), "auto", "none" hoặc giá trị flex đầy đủ */
    flex: { type: String },
    /** span khi màn hình < 576px (và mặc định cho mọi kích thước nếu không có breakpoint lớn hơn) */
    spanXs: { type: Number },
    /** span khi màn hình ≥ 576px */
    spanSm: { type: Number },
    /** span khi màn hình ≥ 768px */
    spanMd: { type: Number },
    /** span khi màn hình ≥ 992px */
    spanLg: { type: Number },
    /** span khi màn hình ≥ 1200px */
    spanXl: { type: Number },
    /** span khi màn hình ≥ 1600px */
    spanXxl: { type: Number },
    /** offset mặc định mọi kích thước (mobile-first) */
    offsetXs: { type: Number },
    /** offset khi màn hình ≥ 576px */
    offsetSm: { type: Number },
    /** offset khi màn hình ≥ 768px */
    offsetMd: { type: Number },
    /** offset khi màn hình ≥ 992px */
    offsetLg: { type: Number },
    /** offset khi màn hình ≥ 1200px */
    offsetXl: { type: Number },
    /** offset khi màn hình ≥ 1600px */
    offsetXxl: { type: Number },
  };

  static styles = [styles, gridCss];

  render() {
    return createElement('slot');
  }

  updated(changed) {
    if (changed.has('flex')) {
      if (this.flex) this.style.setProperty('--_col-flex', toFlex(this.flex));
      else this.style.removeProperty('--_col-flex');
    }
  }
}

defineElement('hui-col', HuiCol);

export default HuiCol;
