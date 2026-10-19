/**
 * HUI Skeleton — Khung xương giữ chỗ khi đang tải (Ant Skeleton + MUI Skeleton)
 *   <hui-skeleton avatar active rows="3"></hui-skeleton>
 *   <hui-skeleton loading="false"><article>Nội dung thật</article></hui-skeleton>
 * Kèm khối lẻ: hui-skeleton-button, hui-skeleton-input, hui-skeleton-image, hui-skeleton-avatar.
 * Biến CSS: xem đầu skeleton-base.css, hui-skeleton.css, skeleton-element.css.
 */

import baseStyles from './skeleton-base.css?raw';
import styles from './hui-skeleton.css?raw';
import elementStyles from './skeleton-element.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';

const SIZES = ['sm', 'md', 'lg'];

/** loading là chuỗi 'true' | 'false' (mặc định đang tải) — chấp nhận cả boolean gán bằng JS */
const isOff = (v) => v === false || v === 'false';

/**
 * @slot - Nội dung thật, hiện khi loading="false"
 * @csspart base - Khung skeleton
 * @csspart avatar - Khối avatar
 * @csspart content - Cột tiêu đề + đoạn văn
 * @csspart title - Khối tiêu đề
 * @csspart paragraph - Danh sách dòng
 * @csspart row - Một dòng
 * @cssprop --hui-skeleton-color - Màu khối
 * @cssprop --hui-skeleton-highlight - Màu vệt sáng khi active
 * @cssprop --hui-skeleton-radius - Bo góc khối
 * @cssprop --hui-skeleton-duration - Thời gian một vòng shimmer
 * @cssprop --hui-skeleton-avatar-size - Kích thước avatar (40px)
 * @cssprop --hui-skeleton-title-height - Chiều cao tiêu đề
 * @cssprop --hui-skeleton-title-width - Chiều rộng tiêu đề
 * @cssprop --hui-skeleton-row-height - Chiều cao mỗi dòng
 * @cssprop --hui-skeleton-row-gap - Khoảng cách giữa các dòng
 * @cssprop --hui-skeleton-last-row-width - Chiều rộng dòng cuối (61%)
 */
class HuiSkeleton extends HuiElement {
  static properties = {
    /** 'true' | 'false' — 'false' = hiện nội dung thật (slot mặc định) thay cho khung xương */
    loading: { type: String, default: 'true' },
    /** Hiệu ứng vệt sáng chạy */
    active: { type: Boolean },
    /** Hiện khối avatar bên trái */
    avatar: { type: Boolean },
    /** circle | square — hình dạng avatar */
    avatarShape: { type: String, default: 'circle' },
    /** Ẩn khối tiêu đề */
    noTitle: { type: Boolean },
    /** Ẩn các dòng đoạn văn */
    noParagraph: { type: Boolean },
    /** Số dòng đoạn văn (mặc định 3; 2 khi có cả avatar và tiêu đề) */
    rows: { type: Number },
    /** Bo tròn hai đầu tiêu đề và các dòng */
    round: { type: Boolean },
  };

  static styles = [baseStyles, styles];

  static localized = true;

  render() {
    this._avatar = createElement('span', { className: 'block avatar', part: 'avatar' });
    this._title = createElement('h3', { className: 'block title', part: 'title' });
    this._paragraph = createElement('ul', { className: 'paragraph', part: 'paragraph' });
    const content = createElement('div', { className: 'content', part: 'content' }, this._title, this._paragraph);
    this._skeleton = createElement('div', { className: 'skeleton', part: 'base', 'aria-hidden': 'true' }, this._avatar, content);
    this._srText = createElement('span', { className: 'sr-only' });
    this._slot = createElement('slot', { className: 'real' });
    return [this._skeleton, this._srText, this._slot];
  }

  updated(changed) {
    const loading = !isOff(this.loading);

    if (changed.has('loading')) {
      this._skeleton.hidden = !loading;
      this._srText.hidden = !loading;
      this._slot.hidden = loading;
      if (this._internals) this._internals.ariaBusy = loading ? 'true' : 'false';
    }
    if (changed.has('locale')) this._srText.textContent = t('common.loading');

    this._skeleton.className = [
      'skeleton',
      this.active ? 'active' : '',
      this.avatar ? 'skeleton--with-avatar' : '',
      this.round ? 'skeleton--round' : '',
    ].filter(Boolean).join(' ');

    this._avatar.hidden = !this.avatar;
    this._avatar.classList.toggle('avatar--square', this.avatarShape === 'square');
    this._title.hidden = this.noTitle;
    this._paragraph.hidden = this.noParagraph;

    if (changed.has('rows') || changed.has('avatar') || changed.has('noTitle')) {
      const fallback = this.avatar && !this.noTitle ? 2 : 3;
      const count = Math.max(0, Math.floor(this.rows ?? fallback));
      const rows = this._paragraph;
      while (rows.children.length > count) rows.lastChild.remove();
      while (rows.children.length < count) rows.append(createElement('li', { className: 'block row', part: 'row' }));
    }
  }
}

// =====================================================
// KHỐI LẺ: button / input / image / avatar
// =====================================================

/**
 * Lớp nền cho các khối skeleton lẻ.
 * @csspart base - Khối skeleton
 */
class SkeletonElement extends HuiElement {
  static properties = {
    /** Hiệu ứng vệt sáng chạy */
    active: { type: Boolean },
    /** sm | md | lg — theo --hui-size-* */
    size: { type: String, default: 'md' },
  };

  static styles = [baseStyles, elementStyles];

  /** Tên loại khối — lớp con ghi đè */
  static kind = 'button';

  render() {
    this._block = createElement('span', { part: 'base', 'aria-hidden': 'true' });
    return this._block;
  }

  updated() {
    const kind = this.constructor.kind;
    const size = SIZES.includes(this.size) ? this.size : 'md';
    this._block.className = [
      'block', `el--${kind}`, `size--${size}`,
      this.shape ? `shape--${this.shape}` : '',
      this.active ? 'active' : '',
    ].filter(Boolean).join(' ');
  }
}

/**
 * Khối giữ chỗ cho nút.
 * @csspart base - Khối skeleton
 * @cssprop --hui-skeleton-button-width - Chiều rộng (block = 100%)
 */
class HuiSkeletonButton extends SkeletonElement {
  static properties = {
    /** default | round | circle | square */
    shape: { type: String, default: 'default' },
    /** Chiếm toàn bộ chiều ngang */
    block: { type: Boolean },
  };

  static kind = 'button';
}

/**
 * Khối giữ chỗ cho ô nhập.
 * @csspart base - Khối skeleton
 * @cssprop --hui-skeleton-input-width - Chiều rộng (block = 100%)
 */
class HuiSkeletonInput extends SkeletonElement {
  static properties = {
    /** Chiếm toàn bộ chiều ngang */
    block: { type: Boolean },
  };

  static kind = 'input';
}

/**
 * Khối giữ chỗ cho avatar.
 * @csspart base - Khối skeleton
 */
class HuiSkeletonAvatar extends SkeletonElement {
  static properties = {
    /** sm | md | lg hoặc số px */
    size: { type: String, default: 'md' },
    /** circle | square */
    shape: { type: String, default: 'circle' },
  };

  static kind = 'avatar';

  updated(changed) {
    super.updated(changed);
    const custom = !SIZES.includes(this.size) && Number.parseFloat(this.size) > 0;
    if (custom) this._block.style.setProperty('--_skeleton-size', `${Number.parseFloat(this.size)}px`);
    else this._block.style.removeProperty('--_skeleton-size');
  }
}

/**
 * Khối giữ chỗ cho ảnh (có biểu tượng ảnh ở giữa).
 * @csspart base - Khối skeleton
 * @cssprop --hui-skeleton-image-size - Kích thước (96px)
 */
class HuiSkeletonImage extends SkeletonElement {
  static kind = 'image';

  render() {
    const block = super.render();
    // Biểu tượng ảnh (khung + núi + mặt trời), màu theo currentColor
    block.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';
    return block;
  }
}

defineElement('hui-skeleton', HuiSkeleton);
defineElement('hui-skeleton-button', HuiSkeletonButton);
defineElement('hui-skeleton-input', HuiSkeletonInput);
defineElement('hui-skeleton-avatar', HuiSkeletonAvatar);
defineElement('hui-skeleton-image', HuiSkeletonImage);

export { HuiSkeletonButton, HuiSkeletonInput, HuiSkeletonAvatar, HuiSkeletonImage };
export default HuiSkeleton;
