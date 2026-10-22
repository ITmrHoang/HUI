/**
 * HUI Media Object — Bố cục kinh điển "ảnh / avatar bên cạnh nội dung" (bình luận, thông báo, mục danh sách):
 * media trái hoặc phải + tiêu đề, mô tả, meta, hành động; tự xếp dọc khi khung hẹp (theo chiều rộng thẻ).
 */

import styles from './hui-media-object.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const GAPS = { sm: 'var(--hui-space-sm)', md: 'var(--hui-space-md)', lg: 'var(--hui-space-lg)', xl: 'var(--hui-space-xl)' };

// Không dùng flatten: slot không có nội dung gán vào sẽ trả về chính fallback của nó
const hasNodes = (slot) => slot.assignedNodes()
  .some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());

/**
 * Media + nội dung. Nội dung chữ đặt bằng attribute (heading / description / meta) hoặc slot (ưu tiên slot).
 * `stack-at` (px): thẻ hẹp hơn → media nằm trên nội dung (đo chính thẻ bằng ResizeObserver, không phụ thuộc viewport).
 *
 * @slot media - Ảnh / avatar / icon
 * @slot title - Tiêu đề tùy biến (thay attribute heading)
 * @slot - Mô tả (thay attribute description)
 * @slot meta - Dòng phụ (thời gian, tác giả…) (thay attribute meta)
 * @slot actions - Nút / link hành động
 * @csspart base - Khung ngoài
 * @csspart media - Vùng media
 * @csspart body - Cột nội dung
 * @csspart title - Tiêu đề
 * @csspart title-link - Link tiêu đề (khi có href)
 * @csspart description - Mô tả
 * @csspart meta - Dòng phụ
 * @csspart actions - Vùng hành động
 * @cssprop --hui-media-object-gap - Khoảng cách media ↔ nội dung (ghi đè attribute gap)
 * @cssprop --hui-media-object-media-size - Rộng vùng media (mặc định theo nội dung)
 * @cssprop --hui-media-object-title-color - Màu tiêu đề
 * @cssprop --hui-media-object-title-size - Cỡ chữ tiêu đề
 * @cssprop --hui-media-object-color - Màu mô tả
 * @cssprop --hui-media-object-meta-color - Màu dòng phụ
 * @cssprop --hui-media-object-padding - Đệm khung
 */
class HuiMediaObject extends HuiElement {
  static properties = {
    /** start | center — căn media theo chiều dọc với nội dung */
    align: { type: String, default: 'start' },
    /** start | end — media ở đầu (trái) hay cuối (phải) */
    mediaPosition: { type: String, default: 'start' },
    /** sm | md | lg | xl hoặc độ dài CSS ('20px') — khoảng cách media ↔ nội dung */
    gap: { type: String, default: 'md' },
    /** Thẻ hẹp hơn giá trị này (px) → xếp dọc; 0 = không bao giờ */
    stackAt: { type: Number, default: 360 },
    /** Tiêu đề (text) */
    heading: { type: String },
    /** Biến tiêu đề thành link */
    href: { type: String },
    /** Mô tả (text) */
    description: { type: String },
    /** Dòng phụ (text) */
    meta: { type: String },
    /** 1–6 → tiêu đề có role="heading" aria-level tương ứng; 0 = chữ thường */
    headingLevel: { type: Number, default: 0 },
  };

  static styles = styles;

  render() {
    const slot = (name) => createElement('slot', name ? { name } : {});
    this._mediaSlot = slot('media');
    this._media = createElement('div', { className: 'mo__media', part: 'media' }, this._mediaSlot);

    this._titleText = createElement('span');
    this._titleLink = createElement('a', { className: 'mo__link', part: 'title-link' });
    this._titleSlot = slot('title');
    this._titleSlot.append(this._titleText);
    this._title = createElement('div', { className: 'mo__title', part: 'title' }, this._titleSlot);

    this._descSlot = slot();
    this._descText = document.createTextNode('');
    this._descSlot.append(this._descText);
    this._desc = createElement('div', { className: 'mo__desc', part: 'description' }, this._descSlot);

    this._metaSlot = slot('meta');
    this._metaText = document.createTextNode('');
    this._metaSlot.append(this._metaText);
    this._meta = createElement('div', { className: 'mo__meta', part: 'meta' }, this._metaSlot);

    this._actionsSlot = slot('actions');
    this._actions = createElement('div', { className: 'mo__actions', part: 'actions' }, this._actionsSlot);

    this._body = createElement('div', { className: 'mo__body', part: 'body' }, this._title, this._desc, this._meta, this._actions);
    this._base = createElement('div', { className: 'mo', part: 'base' }, this._media, this._body);

    for (const s of [this._mediaSlot, this._titleSlot, this._descSlot, this._metaSlot, this._actionsSlot]) {
      s.addEventListener('slotchange', () => this._syncSections());
    }
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._ro ||= new ResizeObserver(() => this._syncStack());
    this._ro.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
  }

  updated(changed) {
    if (changed.has('align') || changed.has('mediaPosition')) {
      this._base.classList.toggle('mo--center', this.align === 'center');
      this._base.classList.toggle('mo--end', this.mediaPosition === 'end');
    }
    if (changed.has('gap')) {
      const g = GAPS[this.gap] || (this.gap ? (/^\d+(\.\d+)?$/.test(this.gap) ? `${this.gap}px` : this.gap) : GAPS.md);
      this._base.style.setProperty('--_mo-gap', g);
    }
    if (changed.has('heading') || changed.has('href')) {
      this._titleLink.textContent = this.heading || '';
      this._titleText.textContent = this.heading || '';
      if (this.href) this._titleLink.href = this.href;
      this._titleSlot.replaceChildren(this.href ? this._titleLink : this._titleText);
    }
    if (changed.has('headingLevel')) {
      const lvl = Math.round(this.headingLevel || 0);
      if (lvl >= 1 && lvl <= 6) {
        this._title.setAttribute('role', 'heading');
        this._title.setAttribute('aria-level', String(lvl));
      } else {
        this._title.removeAttribute('role');
        this._title.removeAttribute('aria-level');
      }
    }
    if (changed.has('description')) this._descText.data = this.description || '';
    if (changed.has('meta')) this._metaText.data = this.meta || '';
    if (changed.has('stackAt')) this._syncStack();
    this._syncSections();
  }

  /** Ẩn vùng trống (không attribute, không slot) để không dư khoảng cách */
  _syncSections() {
    if (!this._hasRendered) return;
    this._media.hidden = !hasNodes(this._mediaSlot);
    this._title.hidden = !this.heading && !hasNodes(this._titleSlot);
    this._desc.hidden = !this.description && !hasNodes(this._descSlot);
    this._meta.hidden = !this.meta && !hasNodes(this._metaSlot);
    this._actions.hidden = !hasNodes(this._actionsSlot);
  }

  _syncStack() {
    const at = Number(this.stackAt) || 0;
    const stacked = at > 0 && this.getBoundingClientRect().width > 0 && this.getBoundingClientRect().width < at;
    if (stacked === this._stacked) return;
    this._stacked = stacked;
    this._base.classList.toggle('mo--stacked', stacked);
    this.setState('stacked', stacked);
  }

  /** Đang xếp dọc (thẻ hẹp hơn stack-at) */
  get stacked() {
    return Boolean(this._stacked);
  }
}

defineElement('hui-media-object', HuiMediaObject);

export default HuiMediaObject;
