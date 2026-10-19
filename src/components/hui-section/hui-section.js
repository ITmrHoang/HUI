/**
 * HUI Section — Khối nội dung cho landing page
 * Khoảng đệm dọc theo thang (padding), nền theo variant, tiêu đề + mô tả, nội dung căn giữa trong max-width.
 * Biến CSS: xem đầu hui-section.css.
 */

import styles from './hui-section.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const SIZES = ['sm', 'md', 'lg', 'xl', 'full'];

/**
 * @slot - Nội dung chính của khối
 * @slot eyebrow - Dòng chữ nhỏ phía trên tiêu đề
 * @slot title - Tiêu đề (thay attribute heading)
 * @slot description - Mô tả dưới tiêu đề (thay attribute description)
 * @csspart base - Thẻ <section> (nền, khoảng đệm)
 * @csspart container - Khung căn giữa có max-width
 * @csspart header - Vùng eyebrow + tiêu đề + mô tả
 * @csspart eyebrow - Dòng chữ nhỏ phía trên tiêu đề
 * @csspart title - Tiêu đề (role="heading")
 * @csspart description - Mô tả
 * @csspart body - Vùng nội dung
 * @cssprop --hui-section-padding-y - Khoảng đệm dọc (attribute padding đổi thang)
 * @cssprop --hui-section-padding-x - Khoảng đệm ngang (mặc định 16px, ≥ 768px: 24px)
 * @cssprop --hui-section-bg - Màu nền (variant đổi mặc định)
 * @cssprop --hui-section-color - Màu chữ
 * @cssprop --hui-section-max-width - Chiều rộng tối đa của nội dung
 * @cssprop --hui-section-title-size - Cỡ chữ tiêu đề
 * @cssprop --hui-section-title-color - Màu tiêu đề
 * @cssprop --hui-section-description-color - Màu mô tả
 * @cssprop --hui-section-header-gap - Khoảng cách giữa các dòng trong header (mặc định 12px)
 * @cssprop --hui-section-header-margin - Khoảng cách header ↔ nội dung (mặc định 40px)
 */
class HuiSection extends HuiElement {
  static properties = {
    /** none | sm | md | lg | xl — thang khoảng đệm trên/dưới */
    padding: { type: String, default: 'md' },
    /** plain | muted | tinted | primary — nền của khối */
    variant: { type: String, default: 'plain' },
    /** sm | md | lg | xl | full — chiều rộng tối đa nội dung (640 / 960 / 1200 / 1440px / 100%) hoặc độ dài CSS */
    maxWidth: { type: String, default: 'lg' },
    /** start | center — căn lề phần header (tiêu đề + mô tả) */
    align: { type: String, default: 'center' },
    /** Tiêu đề dạng chữ (slot title được ưu tiên) */
    heading: { type: String },
    /** Mô tả dạng chữ (slot description được ưu tiên) */
    description: { type: String },
    /** Cấp tiêu đề cho trình đọc màn hình (aria-level), mặc định 2 */
    level: { type: Number, default: 2 },
  };

  static styles = styles;

  render() {
    this._eyebrowSlot = createElement('slot', { name: 'eyebrow' });
    this._eyebrow = createElement('div', { className: 'section__eyebrow', part: 'eyebrow' }, this._eyebrowSlot);

    this._headingText = document.createTextNode('');
    this._titleSlot = createElement('slot', { name: 'title' }, this._headingText);
    this._title = createElement('div', { className: 'section__title', part: 'title', role: 'heading', id: 'title' }, this._titleSlot);

    this._descText = document.createTextNode('');
    this._descSlot = createElement('slot', { name: 'description' }, this._descText);
    this._desc = createElement('div', { className: 'section__description', part: 'description' }, this._descSlot);

    this._header = createElement('header', { className: 'section__header', part: 'header' }, this._eyebrow, this._title, this._desc);
    this._body = createElement('div', { className: 'section__body', part: 'body' }, createElement('slot'));
    this._container = createElement('div', { className: 'section__container', part: 'container' }, this._header, this._body);
    this._base = createElement('section', { className: 'section', part: 'base', 'aria-labelledby': 'title' }, this._container);

    for (const slot of [this._eyebrowSlot, this._titleSlot, this._descSlot]) {
      slot.addEventListener('slotchange', () => this._syncHeader());
    }
    return this._base;
  }

  updated(changed) {
    if (changed.has('heading')) this._headingText.textContent = this.heading ?? '';
    if (changed.has('description')) this._descText.textContent = this.description ?? '';
    if (changed.has('level')) {
      this._title.setAttribute('aria-level', String(Math.min(6, Math.max(1, Math.floor(Number(this.level)) || 2))));
    }

    if (changed.has('maxWidth')) {
      // Từ khóa xử lý trong CSS; độ dài tùy ý → biến nội bộ trên khung
      const v = this.maxWidth;
      const custom = v && !SIZES.includes(v) ? (/^\d+(\.\d+)?$/.test(v) ? `${v}px` : v) : null;
      if (custom) this._container.style.setProperty('--_section-max-custom', custom);
      else this._container.style.removeProperty('--_section-max-custom');
    }

    this._syncHeader();
  }

  /** Ẩn từng dòng trống của header; ẩn cả header khi không có gì */
  _syncHeader() {
    const has = (slot, fallback) =>
      slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim()) || Boolean(fallback);
    const eyebrow = has(this._eyebrowSlot);
    const title = has(this._titleSlot, this.heading);
    const desc = has(this._descSlot, this.description);
    this._eyebrow.hidden = !eyebrow;
    this._title.hidden = !title;
    this._desc.hidden = !desc;
    this._header.hidden = !(eyebrow || title || desc);
    // Có tiêu đề → <section> thành landmark mang tên tiêu đề
    if (title) this._base.setAttribute('aria-labelledby', 'title');
    else this._base.removeAttribute('aria-labelledby');
  }
}

defineElement('hui-section', HuiSection);

export default HuiSection;
