/**
 * HUI Card — Thẻ nội dung (Ant Card + MUI Card). Parts/slots/biến CSS: xem JSDoc của class.
 */

import styles from './hui-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/** Slot có nội dung thật (bỏ qua text node chỉ chứa khoảng trắng) */
const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * Thẻ nội dung: header (avatar, title, extra), cover, body, actions, footer, skeleton loading.
 *
 * @fires click - Card `clickable` được nhấn Enter/Space (detail { originalEvent }); click chuột là event native
 * @slot - Nội dung body
 * @slot header - Thay toàn bộ header mặc định
 * @slot avatar - Avatar bên trái tiêu đề
 * @slot extra - Vùng góc phải header
 * @slot cover - Media tùy biến thay cho attribute cover
 * @slot actions - Thanh hành động có viền trên
 * @slot footer - Chân card
 * @csspart card - Khung card
 * @csspart cover - Vùng cover
 * @csspart cover-img - Ảnh cover (từ attribute cover)
 * @csspart main - Khối header + body + actions + footer
 * @csspart header - Header
 * @csspart avatar - Vùng avatar
 * @csspart title - Tiêu đề
 * @csspart subtitle - Phụ đề
 * @csspart extra - Vùng extra
 * @csspart body - Body
 * @csspart skeleton - Skeleton khi loading
 * @csspart actions - Thanh actions
 * @csspart footer - Footer
 * @cssprop --hui-card-bg - Nền card
 * @cssprop --hui-card-color - Màu chữ body
 * @cssprop --hui-card-radius - Bo góc
 * @cssprop --hui-card-padding - Khoảng đệm (mặc định theo size 12/16/24px)
 * @cssprop --hui-card-border-color - Màu viền
 * @cssprop --hui-card-shadow - Bóng đổ (mặc định theo elevation)
 * @cssprop --hui-card-hover-shadow - Bóng đổ khi hover
 * @cssprop --hui-card-title-color - Màu tiêu đề
 * @cssprop --hui-card-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-card-divider-color - Màu đường kẻ trên actions/footer
 * @cssprop --hui-card-cover-height - Chiều cao cover (attribute cover-height ưu tiên hơn)
 * @cssprop --hui-card-cover-width - Chiều rộng cover ở layout horizontal
 * @cssprop --hui-card-focus-color - Màu viền focus khi clickable
 * @cssprop --hui-card-header-bg - Nền header (mặc định trong suốt; type="inner": --hui-fill-tertiary)
 */
class HuiCard extends HuiElement {
  static properties = {
    /** Tiêu đề header */
    title: { type: String },
    /** Phụ đề dưới tiêu đề */
    subtitle: { type: String },
    /** elevated | outlined | filled */
    variant: { type: String, default: 'elevated' },
    /** 0–4, chỉ áp dụng cho elevated */
    elevation: { type: Number, default: 1 },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Nổi lên khi hover */
    hoverable: { type: Boolean },
    /** Như hoverable + role="button", focus được, Enter/Space phát `click` */
    clickable: { type: Boolean },
    /** Hiện skeleton thay cho nội dung */
    loading: { type: Boolean },
    /** URL ảnh cover */
    cover: { type: String },
    /** Chiều cao cover (CSS length; số trơn = px). Vắng mặt → --hui-card-cover-height hoặc 180px */
    coverHeight: { type: String },
    /** vertical | horizontal */
    orientation: { type: String, default: 'vertical' },
    /** inner — card lồng bên trong card khác: header nền nhạt + kẻ dưới, viền mảnh, không bóng */
    type: { type: String },
  };

  static styles = styles;

  render() {
    const slot = (name, ...fallback) => {
      const s = createElement('slot', name ? { name } : {}, ...fallback);
      s.addEventListener('slotchange', () => this._syncSections());
      return s;
    };

    // Cover: slot "cover" thay được ảnh mặc định (attribute cover)
    this._coverImg = createElement('img', { className: 'hui-card__cover-img', part: 'cover-img', alt: '', loading: 'lazy' });
    this._coverSlot = slot('cover', this._coverImg);
    this._cover = createElement('div', { className: 'hui-card__cover', part: 'cover' }, this._coverSlot);

    // Header mặc định: avatar | title + subtitle | extra — slot "header" thay toàn bộ
    this._title = createElement('div', { className: 'hui-card__title', part: 'title' });
    this._subtitle = createElement('div', { className: 'hui-card__subtitle', part: 'subtitle' });
    this._avatarSlot = slot('avatar');
    this._avatar = createElement('div', { className: 'hui-card__avatar', part: 'avatar' }, this._avatarSlot);
    this._extraSlot = slot('extra');
    this._extra = createElement('div', { className: 'hui-card__extra', part: 'extra' }, this._extraSlot);
    const defaultHeader = createElement('div', { className: 'hui-card__header-default' },
      this._avatar,
      createElement('div', { className: 'hui-card__titles' }, this._title, this._subtitle),
      this._extra);
    this._headerSlot = slot('header', defaultHeader);
    this._header = createElement('div', { className: 'hui-card__header', part: 'header' }, this._headerSlot);

    // Body: skeleton hiện khi loading, nội dung slot chỉ bị ẩn (không mất)
    this._skeleton = createElement('div', { className: 'hui-card__skeleton', part: 'skeleton', 'aria-hidden': 'true' },
      ...[1, 2, 3].map(() => createElement('span', { className: 'hui-card__skeleton-line' })),
      createElement('span', { className: 'hui-card__skeleton-line hui-card__skeleton-line--short' }));
    this._content = createElement('div', { className: 'hui-card__content' }, slot());
    const body = createElement('div', { className: 'hui-card__body', part: 'body' }, this._skeleton, this._content);

    this._actionsSlot = slot('actions');
    this._actions = createElement('div', { className: 'hui-card__actions', part: 'actions' }, this._actionsSlot);
    this._footerSlot = slot('footer');
    this._footer = createElement('div', { className: 'hui-card__footer', part: 'footer' }, this._footerSlot);

    // Tách main khỏi cover để layout horizontal đặt cover bên trái
    const main = createElement('div', { className: 'hui-card__main', part: 'main' },
      this._header, body, this._actions, this._footer);

    this._card = createElement('div', { part: 'card' }, this._cover, main);
    this._card.addEventListener('keydown', (e) => this._handleKeydown(e));
    this._card.addEventListener('keyup', (e) => this._handleKeyup(e));
    return this._card;
  }

  updated(changed) {
    const card = this._card;

    if (['variant', 'elevation', 'size', 'orientation', 'hoverable', 'clickable', 'loading', 'type'].some((k) => changed.has(k))) {
      const elevation = Number.isFinite(this.elevation) ? Math.min(4, Math.max(0, Math.round(this.elevation))) : 1;
      card.className = [
        'hui-card',
        `hui-card--${this.variant}`,
        `hui-card--${this.size}`,
        `hui-card--${this.orientation}`,
        this.variant === 'elevated' ? `hui-card--elevation-${elevation}` : '',
        // clickable luôn kèm hiệu ứng hover (giống MUI CardActionArea)
        this.hoverable || this.clickable ? 'hui-card--hoverable' : '',
        this.clickable ? 'hui-card--clickable' : '',
        this.loading ? 'hui-card--loading' : '',
        this.type === 'inner' ? 'hui-card--inner' : '',
      ].filter(Boolean).join(' ');
    }

    if (changed.has('title')) this._title.textContent = this.title || '';
    if (changed.has('subtitle')) this._subtitle.textContent = this.subtitle || '';

    if (changed.has('cover')) {
      if (this.cover) this._coverImg.src = this.cover;
      else this._coverImg.removeAttribute('src');
      this._coverImg.hidden = !this.cover;
    }

    if (changed.has('coverHeight')) {
      const h = this.coverHeight;
      if (h) this._cover.style.setProperty('--_card-cover-height', /^\d+(\.\d+)?$/.test(h) ? `${h}px` : h);
      else this._cover.style.removeProperty('--_card-cover-height');
    }

    if (changed.has('clickable')) {
      if (this.clickable) {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
      } else {
        card.removeAttribute('role');
        card.removeAttribute('tabindex');
      }
    }

    if (changed.has('loading')) {
      card.toggleAttribute('aria-busy', this.loading);
      this._skeleton.hidden = !this.loading;
      this._content.hidden = this.loading;
    }

    this._syncSections();
  }

  /** Ẩn vùng không có attribute lẫn nội dung slot (chỉ toggle hidden, không dựng lại DOM) */
  _syncSections() {
    if (!this._card) return;
    const hasAvatar = hasContent(this._avatarSlot);
    const hasExtra = hasContent(this._extraSlot);
    this._header.hidden = !(this.title || this.subtitle || hasAvatar || hasExtra || hasContent(this._headerSlot));
    this._title.hidden = !this.title;
    this._subtitle.hidden = !this.subtitle;
    this._avatar.hidden = !hasAvatar;
    this._extra.hidden = !hasExtra;
    this._cover.hidden = !(this.cover || hasContent(this._coverSlot));
    this._actions.hidden = !hasContent(this._actionsSlot);
    this._footer.hidden = !hasContent(this._footerSlot);
  }

  /** Bàn phím giống <button>: Enter kích hoạt khi nhấn, Space khi nhả (chặn cuộn trang) */
  _handleKeydown(e) {
    if (!this.clickable || e.target !== this._card) return; // Bỏ qua phím từ phần tử con
    if (e.key === 'Enter') {
      e.preventDefault();
      this.emit('click', { originalEvent: e });
    } else if (e.key === ' ') {
      e.preventDefault();
    }
  }

  _handleKeyup(e) {
    if (!this.clickable || e.target !== this._card) return;
    if (e.key === ' ') this.emit('click', { originalEvent: e });
  }

  /** Card clickable: focus vào khung bên trong (nơi có tabindex) */
  focus(options) {
    this.clickable && this._card ? this._card.focus(options) : super.focus(options);
  }
}

defineElement('hui-card', HuiCard);

export default HuiCard;
