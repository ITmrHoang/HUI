/**
 * HUI Blog Card — Thẻ bài viết (Molecule): ảnh, chuyên mục, tiêu đề (link), tóm tắt cắt dòng,
 * tác giả + avatar, ngày đăng, thời gian đọc. Dựng trên <hui-card>.
 */

import styles from './hui-blog-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { formatDate, toDate } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import {
  forwardToCard, createMsg, createForwardSlot, hasContent, isNum, CARD_EXPORTPARTS,
} from '../hui-product-card/card-shared.js';
import '../hui-card/hui-card.js';
import '../hui-tag/hui-tag.js';
import '../hui-avatar/hui-avatar.js';

const RATIO = /^\d+(\.\d+)?(\s*\/\s*\d+(\.\d+)?)?$/;
/** Tốc độ đọc trung bình (từ / phút) dùng để ước tính thời gian đọc */
export const WORDS_PER_MINUTE = 200;

const msg = createMsg({
  'blog.readingTime': { vi: '{minutes} phút đọc', en: '{minutes} min read' },
});

/** Số phút đọc: reading-time ưu tiên; không có → ước tính từ số từ (≥ 1 phút); không đủ dữ liệu → null */
export function readingMinutes(readingTime, contentLength, wpm = WORDS_PER_MINUTE) {
  if (isNum(readingTime) && Number(readingTime) > 0) return Math.round(Number(readingTime));
  if (isNum(contentLength) && Number(contentLength) > 0) return Math.max(1, Math.ceil(Number(contentLength) / wpm));
  return null;
}

/**
 * Thẻ bài viết. `orientation="horizontal"` cho bài nổi bật (ảnh trái). Thời gian đọc lấy từ `reading-time`
 * hoặc ước tính từ `content-length` (số từ, 200 từ/phút).
 *
 * @slot - Nội dung thêm dưới tóm tắt
 * @slot category - Chuyên mục tùy biến (thay attribute category)
 * @slot actions - Thanh hành động (chuyển xuống hui-card)
 * @slot footer - Chân thẻ (chuyển xuống hui-card)
 * @slot overlay - Lớp phủ trên ảnh (dùng với effect="reveal")
 * @csspart image - Ảnh bài viết
 * @csspart category - <hui-tag> chuyên mục; kèm category-base
 * @csspart heading - Tiêu đề (role heading)
 * @csspart title-link - Link tiêu đề (khi có href)
 * @csspart excerpt - Đoạn tóm tắt
 * @csspart meta - Hàng tác giả · ngày · thời gian đọc
 * @csspart avatar - <hui-avatar> tác giả
 * @csspart author - Tên tác giả
 * @csspart date - Ngày đăng (<time>)
 * @csspart reading-time - Thời gian đọc
 * @csspart card - Khung <hui-card> (và cover, main, header, body, skeleton, actions, footer, overlay, card-link, card-check, card-glow)
 * @cssprop --hui-blog-card-title-color - Màu tiêu đề
 * @cssprop --hui-blog-card-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-blog-card-title-lines - Số dòng tối đa của tiêu đề (mặc định 2)
 * @cssprop --hui-blog-card-excerpt-color - Màu tóm tắt
 * @cssprop --hui-blog-card-meta-color - Màu hàng meta
 * @cssprop --hui-blog-card-image-bg - Nền vùng ảnh
 */
class HuiBlogCard extends HuiElement {
  static localized = true;

  static properties = {
    /** URL ảnh bài viết */
    image: { type: String },
    /** Mô tả ảnh (mặc định rỗng — ảnh trang trí, tiêu đề đã mô tả bài) */
    imageAlt: { type: String },
    /** Tỉ lệ ảnh rộng/cao (dọc), vd "16/9", "4/3" */
    ratio: { type: String, default: '16/9' },
    /** Chuyên mục (hiện bằng hui-tag) */
    category: { type: String },
    /** primary | secondary | success | warning | danger | info hoặc màu CSS — màu tag chuyên mục */
    categoryColor: { type: String, default: 'primary' },
    /** Tiêu đề bài. Attribute bị gỡ khỏi host để không hiện tooltip native */
    title: { type: String, reflect: false },
    /** Cấp heading của tiêu đề (aria-level) */
    headingLevel: { type: Number, default: 3 },
    /** Đoạn tóm tắt */
    excerpt: { type: String },
    /** Số dòng tối đa của tóm tắt */
    excerptLines: { type: Number, default: 3 },
    /** Tên tác giả */
    author: { type: String },
    /** URL avatar tác giả (không có → chữ cái viết tắt) */
    authorAvatar: { type: String },
    /** Ngày đăng (ISO, timestamp ms hoặc chuỗi Date đọc được) */
    date: { type: String },
    /** short | medium | long | full — kiểu định dạng ngày */
    dateStyle: { type: String, default: 'medium' },
    /** Thời gian đọc (phút) */
    readingTime: { type: Number },
    /** Số từ của bài — ước tính thời gian đọc khi không có reading-time (200 từ/phút) */
    contentLength: { type: Number },
    /** Hiệu ứng của hui-card: lift | tilt | glow | zoom-media | reveal | border-gradient */
    effect: { type: String, default: 'lift zoom-media' },
    /** Link bài viết — tiêu đề thành link, cả card bấm được */
    href: { type: String },
    /** target của link (vd _blank) */
    target: { type: String },
    /** elevated | outlined | filled | ghost — biến thể hui-card */
    variant: { type: String, default: 'elevated' },
    /** vertical | horizontal — horizontal: bài nổi bật, ảnh trái */
    orientation: { type: String, default: 'vertical' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Skeleton thay cho nội dung */
    loading: { type: Boolean },
    /** Tắt chuyển động */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  /** Alias `title`: lưu nội dung rồi gỡ attribute khỏi host (tránh tooltip native) */
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'title') {
      if (newVal === null) return; // lần gọi do chính ta removeAttribute
      super.attributeChangedCallback(name, oldVal, newVal);
      this.removeAttribute('title');
      return;
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }

  /** Số phút đọc đang hiển thị (null = ẩn) */
  get readingMinutes() {
    return readingMinutes(this.readingTime, this.contentLength);
  }

  render() {
    this._img = createElement('img', { slot: 'cover', className: 'bc__img', part: 'image', alt: '', loading: 'lazy', decoding: 'async' });

    this._tag = createElement('hui-tag', { className: 'bc__tag', part: 'category', exportparts: 'base: category-base', size: 'sm' });
    this._categorySlot = createElement('slot', { name: 'category' }, this._tag);
    this._categorySlot.addEventListener('slotchange', () => this._syncCategory());
    this._category = createElement('div', { className: 'bc__category' }, this._categorySlot);

    this._link = createElement('a', { className: 'bc__title-link', part: 'title-link' });
    this._heading = createElement('div', { className: 'bc__heading', part: 'heading', role: 'heading' }, this._link);
    this._excerpt = createElement('p', { className: 'bc__excerpt', part: 'excerpt' });

    this._extraSlot = createElement('slot');
    this._extra = createElement('div', { className: 'bc__extra' }, this._extraSlot);
    this._extraSlot.addEventListener('slotchange', () => { this._extra.hidden = !hasContent(this._extraSlot); });

    this._avatar = createElement('hui-avatar', { className: 'bc__avatar', part: 'avatar', size: 'sm' });
    this._author = createElement('span', { className: 'bc__author', part: 'author' });
    this._date = createElement('time', { className: 'bc__date', part: 'date' });
    this._reading = createElement('span', { className: 'bc__reading', part: 'reading-time' });
    this._metaInfo = createElement('span', { className: 'bc__meta-info' }, this._date, this._reading);
    this._meta = createElement('div', { className: 'bc__meta', part: 'meta' },
      this._avatar, createElement('span', { className: 'bc__meta-text' }, this._author, this._metaInfo));

    const content = createElement('div', { className: 'bc__content' },
      this._category, this._heading, this._excerpt, this._extra, this._meta);

    this._actionsSlot = createForwardSlot('actions');
    this._card = createElement('hui-card', { className: 'bc__card', 'cover-height': 'auto', exportparts: CARD_EXPORTPARTS },
      this._img, content, this._actionsSlot, createForwardSlot('footer'), createForwardSlot('overlay'));
    return this._card;
  }

  firstUpdated() {
    this._extra.hidden = !hasContent(this._extraSlot);
    this._syncCategory();
  }

  updated(changed) {
    forwardToCard(this, this._card, changed);

    if (changed.has('image') || changed.has('imageAlt')) {
      if (this.image) this._img.src = this.image;
      else this._img.removeAttribute('src');
      this._img.alt = this.imageAlt || '';
      this._img.hidden = !this.image;
    }

    if (changed.has('ratio')) {
      const ratio = RATIO.test(String(this.ratio || '').trim()) ? String(this.ratio).trim() : '16/9';
      this._img.style.setProperty('--_bc-ratio', ratio);
    }

    if (changed.has('category') || changed.has('categoryColor')) {
      this._tag.textContent = this.category || '';
      this._tag.setAttribute('color', this.categoryColor || 'primary');
      this._syncCategory();
    }

    if (changed.has('title') || changed.has('href') || changed.has('target')) {
      this._link.textContent = this.title || '';
      if (this.href) {
        this._link.href = this.href;
        if (this.target) this._link.target = this.target;
        else this._link.removeAttribute('target');
        if (this.target === '_blank') this._link.rel = 'noopener noreferrer';
        else this._link.removeAttribute('rel');
      } else {
        for (const a of ['href', 'target', 'rel']) this._link.removeAttribute(a);
      }
      this._heading.hidden = !this.title;
    }
    if (changed.has('headingLevel')) {
      const level = Number.isFinite(this.headingLevel) ? Math.min(6, Math.max(1, Math.round(this.headingLevel))) : 3;
      this._heading.setAttribute('aria-level', String(level));
    }

    if (changed.has('excerpt') || changed.has('excerptLines')) {
      this._excerpt.textContent = this.excerpt || '';
      this._excerpt.hidden = !this.excerpt;
      const lines = Number.isFinite(this.excerptLines) && this.excerptLines > 0 ? Math.round(this.excerptLines) : 3;
      this._excerpt.style.setProperty('--_bc-lines', String(lines));
    }

    if (changed.has('author') || changed.has('authorAvatar')) {
      this._author.textContent = this.author || '';
      this._author.hidden = !this.author;
      if (this.authorAvatar) this._avatar.setAttribute('src', this.authorAvatar);
      else this._avatar.removeAttribute('src');
      if (this.author) {
        this._avatar.setAttribute('name', this.author);
        this._avatar.setAttribute('alt', this.author);
      } else {
        this._avatar.removeAttribute('name');
        this._avatar.removeAttribute('alt');
      }
      this._avatar.hidden = !this.author && !this.authorAvatar;
    }

    if (['date', 'dateStyle', 'readingTime', 'contentLength', 'locale'].some((k) => changed.has(k))) {
      const d = toDate(this.date);
      this._date.textContent = this.date ? formatDate(this.date, this.dateStyle || 'medium') : '';
      if (d) this._date.setAttribute('datetime', d.toISOString());
      else this._date.removeAttribute('datetime');
      this._date.hidden = !this.date;
      const minutes = this.readingMinutes;
      this._reading.textContent = minutes ? msg('blog.readingTime', { minutes }) : '';
      this._reading.hidden = !minutes;
      this._metaInfo.hidden = this._date.hidden && this._reading.hidden;
    }

    this._meta.hidden = !this.author && !this.authorAvatar && !this.date && !this.readingMinutes;
  }

  _syncCategory() {
    if (!this._category) return;
    const slotted = this._categorySlot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    this._category.hidden = !slotted && !this.category;
  }
}

defineElement('hui-blog-card', HuiBlogCard);

export { HuiBlogCard };
export default HuiBlogCard;
