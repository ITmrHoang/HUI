/**
 * HUI Prose — Bọc nội dung HTML từ CMS / Markdown để có typography đẹp sẵn (Molecule):
 * heading, đoạn văn, link, danh sách, trích dẫn, code, bảng, ảnh, figure, hr.
 * Nội dung ở LIGHT DOM; CSS gắn vào document / shadow root chứa thẻ (hui-prose-light.css, selector :where()).
 */

import styles from './hui-prose.css?raw';
import lightStyles from './hui-prose-light.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement, createStyle } from '../../utils/dom.js';

/**
 * ::slotted() chỉ chạm được con trực tiếp → cần 1 stylesheet ở cùng phạm vi với thẻ
 * (document hoặc shadow root cha), gắn 1 lần cho mỗi phạm vi.
 */
const styledRoots = new WeakSet();
let lightSheet = null;
function ensureLightStyles(host) {
  const root = host.getRootNode();
  if (!root || styledRoots.has(root) || !(root instanceof Document || root instanceof ShadowRoot)) return;
  styledRoots.add(root);
  if ('adoptedStyleSheets' in root && typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
    if (!lightSheet) {
      lightSheet = new CSSStyleSheet();
      lightSheet.replaceSync(lightStyles);
    }
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, lightSheet];
  } else {
    const style = createStyle(lightStyles);
    style.setAttribute('data-hui-prose', '');
    (root instanceof Document ? root.head : root).append(style);
  }
}

/**
 * Khung typography cho nội dung bài viết. Mọi CSS bọc :where() → CSS trang của bạn luôn thắng.
 *
 * @slot - Nội dung HTML (bài viết, Markdown đã render)
 * @csspart base - Khung bọc slot
 * @cssprop --hui-prose-max-width - Bề rộng tối đa (attribute max-width ưu tiên hơn; mặc định 65ch)
 * @cssprop --hui-prose-font-size - Cỡ chữ gốc (mặc định theo size)
 * @cssprop --hui-prose-line-height - Chiều cao dòng
 * @cssprop --hui-prose-space - Khoảng cách giữa các khối (đoạn, danh sách, bảng…)
 * @cssprop --hui-prose-color - Màu chữ thân bài
 * @cssprop --hui-prose-heading-color - Màu heading / chữ đậm
 * @cssprop --hui-prose-heading-font - Font heading
 * @cssprop --hui-prose-link-color - Màu link
 * @cssprop --hui-prose-link-hover-color - Màu link khi hover
 * @cssprop --hui-prose-muted-color - Màu chữ phụ (trích dẫn, chú thích)
 * @cssprop --hui-prose-marker-color - Màu dấu đầu dòng / số thứ tự
 * @cssprop --hui-prose-quote-border - Vạch trái trích dẫn
 * @cssprop --hui-prose-quote-bg - Nền trích dẫn
 * @cssprop --hui-prose-code-bg - Nền code inline
 * @cssprop --hui-prose-code-color - Màu code inline
 * @cssprop --hui-prose-pre-bg - Nền khối code
 * @cssprop --hui-prose-pre-color - Màu chữ khối code
 * @cssprop --hui-prose-border-color - Màu viền (bảng, hr, pre)
 * @cssprop --hui-prose-radius - Bo góc ảnh / khối code
 * @cssprop --hui-prose-scroll-margin - Khoảng chừa phía trên heading khi nhảy tới #id (header dính)
 */
class HuiProse extends HuiElement {
  static properties = {
    /** sm | md | lg — cỡ chữ và nhịp dòng */
    size: { type: String, default: 'md' },
    /** Bề rộng tối đa: độ dài CSS ("65ch", "720px") hoặc "none"; số trơn = px */
    maxWidth: { type: String },
  };

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    ensureLightStyles(this);
  }

  render() {
    return createElement('div', { className: 'prose', part: 'base' }, createElement('slot'));
  }

  updated(changed) {
    if (changed.has('maxWidth')) {
      const v = this.maxWidth;
      if (v) this.style.setProperty('--_prose-max-width', /^\d+(\.\d+)?$/.test(v) ? `${v}px` : v);
      else this.style.removeProperty('--_prose-max-width');
    }
  }
}

defineElement('hui-prose', HuiProse);

export default HuiProse;
