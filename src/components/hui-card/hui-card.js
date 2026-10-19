/**
 * HUI Card — Thẻ nội dung đa năng (Web Component Vanilla JS)
 * Kết hợp API của Ant Design Card + MUI Card.
 *
 * Hỗ trợ:
 * - Header: title, subtitle, avatar, extra (góc phải)
 * - Cover (ảnh/media) ở trên hoặc bên trái (orientation="horizontal")
 * - Variants: elevated (đổ bóng), outlined (viền), filled (nền xám)
 * - Elevation 0–4, sizes sm/md/lg, hoverable, clickable, loading skeleton
 * - Slots: header, avatar, extra, cover, (default), actions, footer
 */

import styles from './hui-card.css?raw';
import { createElement, createStyle, ensureTokens } from '../../utils/dom.js';
import { emitEvent } from '../../utils/events.js';

class HuiCard extends HTMLElement {
  static get observedAttributes() {
    return [
      'title', 'subtitle', 'variant', 'elevation', 'size', 'hoverable',
      'clickable', 'loading', 'cover', 'cover-height', 'orientation',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null; // Thẻ <div class="hui-card"> gốc bên trong Shadow DOM
    this._styled = false; // Cờ đánh dấu đã chèn CSS hay chưa (tránh chèn trùng khi gắn lại vào DOM)
  }

  // =====================================================
  // LIFECYCLE CALLBACKS
  // =====================================================

  connectedCallback() {
    // Chỉ chèn tokens + CSS đúng 1 lần. Khi element bị tháo ra rồi gắn lại
    // (ví dụ: kéo thả, di chuyển DOM) thì connectedCallback chạy lại → không được chèn trùng.
    if (!this._styled) {
      ensureTokens();
      this.shadowRoot.appendChild(createStyle(styles));
      this._styled = true;
    }
    if (!this._wrapper) this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    // Chỉ vẽ lại khi component đã render lần đầu
    if (this._wrapper) this._render();
  }

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  /**
   * Hỗ trợ bàn phím khi card ở chế độ clickable (giống thẻ <button>):
   * - Enter: kích hoạt ngay khi nhấn xuống
   * - Space: kích hoạt khi nhả phím (keyup) và chặn cuộn trang mặc định
   */
  _handleKeydown(e) {
    if (e.target !== this._wrapper) return; // Bỏ qua phím bấm từ phần tử con (input, button...)
    if (e.key === 'Enter') {
      e.preventDefault();
      emitEvent(this, 'click', { originalEvent: e });
    } else if (e.key === ' ') {
      e.preventDefault(); // Không cho trang cuộn xuống khi nhấn Space
    }
  }

  _handleKeyup(e) {
    if (e.target !== this._wrapper) return;
    if (e.key === ' ') emitEvent(this, 'click', { originalEvent: e });
  }

  /**
   * Kiểm tra slot có nội dung thật hay không.
   * Bỏ qua các text node chỉ chứa khoảng trắng / xuống dòng.
   */
  _hasSlotContent(slot) {
    if (!slot) return false;
    return slot.assignedNodes().some((node) =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '')
    );
  }

  /**
   * Ẩn/hiện các vùng (header, cover, actions, footer) tùy theo việc có attribute
   * hoặc có nội dung slot hay không.
   * LƯU Ý: Hàm này chỉ toggle class, KHÔNG gọi _render() → tránh vòng lặp vô hạn
   * (render → tạo slot mới → slotchange → render...).
   */
  _updateSections() {
    if (!this._wrapper) return;
    const root = this._wrapper;
    const q = (name) => root.querySelector(`slot[name="${name}"]`);

    const hasHeader =
      !!this.getAttribute('title') ||
      !!this.getAttribute('subtitle') ||
      this._hasSlotContent(q('header')) ||
      this._hasSlotContent(q('avatar')) ||
      this._hasSlotContent(q('extra'));
    const hasCover = !!this.getAttribute('cover') || this._hasSlotContent(q('cover'));
    const hasActions = this._hasSlotContent(q('actions'));
    const hasFooter = this._hasSlotContent(q('footer'));

    root.querySelector('.hui-card__header').hidden = !hasHeader;
    root.querySelector('.hui-card__cover').hidden = !hasCover;
    root.querySelector('.hui-card__actions').hidden = !hasActions;
    root.querySelector('.hui-card__footer').hidden = !hasFooter;

    // Ẩn riêng vùng avatar / extra nếu không có gì để khỏi chiếm khoảng trống (gap)
    root.querySelector('.hui-card__avatar').hidden = !this._hasSlotContent(q('avatar'));
    root.querySelector('.hui-card__extra').hidden = !this._hasSlotContent(q('extra'));
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  _render() {
    if (this._wrapper) this._wrapper.remove();

    const title = this.getAttribute('title') || '';
    const subtitle = this.getAttribute('subtitle') || '';
    const variant = this.getAttribute('variant') || 'elevated';
    const size = this.getAttribute('size') || 'md';
    const orientation = this.getAttribute('orientation') || 'vertical';
    const cover = this.getAttribute('cover') || '';
    const coverHeight = this.getAttribute('cover-height') || '180px';
    const loading = this.hasAttribute('loading');
    const clickable = this.hasAttribute('clickable');
    // clickable luôn kèm hiệu ứng hoverable (giống MUI CardActionArea)
    const hoverable = this.hasAttribute('hoverable') || clickable;

    // Elevation chỉ có ý nghĩa với variant "elevated"; giới hạn trong khoảng 0–4
    let elevation = parseInt(this.getAttribute('elevation') ?? '1', 10);
    if (Number.isNaN(elevation)) elevation = 1;
    elevation = Math.min(4, Math.max(0, elevation));

    const classes = [
      'hui-card',
      `hui-card--${variant}`,
      `hui-card--${size}`,
      `hui-card--${orientation}`,
      variant === 'elevated' ? `hui-card--elevation-${elevation}` : '',
      hoverable ? 'hui-card--hoverable' : '',
      clickable ? 'hui-card--clickable' : '',
      loading ? 'hui-card--loading' : '',
    ].filter(Boolean).join(' ');

    // ---------- COVER (MUI CardMedia) ----------
    // Slot "cover" cho phép truyền media tùy biến (video, carousel...).
    // Nếu không có slot thì dùng ảnh từ attribute "cover" làm nội dung mặc định (fallback).
    const coverImg = cover
      ? createElement('img', { className: 'hui-card__cover-img', src: cover, alt: '', loading: 'lazy' })
      : null;
    const coverEl = createElement('div', {
      className: 'hui-card__cover',
      part: 'cover',
    },createElement('slot', { name: 'cover' }, ...[coverImg].filter(Boolean)));
    // Biến CSS custom phải gán qua setProperty (Object.assign không nhận tên "--xxx")
    coverEl.style.setProperty('--hui-card-cover-height', coverHeight);

    // ---------- HEADER (Ant Card title/extra + MUI CardHeader) ----------
    const titleEl = title ? createElement('div', { className: 'hui-card__title', part: 'title' }, title) : null;
    const subtitleEl = subtitle ? createElement('div', { className: 'hui-card__subtitle', part: 'subtitle' }, subtitle) : null;

    const defaultHeader = createElement('div', { className: 'hui-card__header-default' },
      createElement('div', { className: 'hui-card__avatar' }, createElement('slot', { name: 'avatar' })),
      createElement('div', { className: 'hui-card__titles' }, ...[titleEl, subtitleEl].filter(Boolean)),
      createElement('div', { className: 'hui-card__extra' }, createElement('slot', { name: 'extra' })),
    );
    // Slot "header" thay thế TOÀN BỘ header mặc định (nội dung mặc định nằm bên trong làm fallback)
    const headerEl = createElement('div', { className: 'hui-card__header', part: 'header' },
      createElement('slot', { name: 'header' }, defaultHeader)
    );

    // ---------- BODY ----------
    // Khi loading: hiển thị skeleton nhấp nháy thay cho nội dung.
    // Slot mặc định vẫn được giữ lại (chỉ ẩn đi) để nội dung không bị mất khi tắt loading.
    const skeleton = loading
      ? createElement('div', { className: 'hui-card__skeleton', 'aria-hidden': 'true' },
          createElement('span', { className: 'hui-card__skeleton-line' }),
          createElement('span', { className: 'hui-card__skeleton-line' }),
          createElement('span', { className: 'hui-card__skeleton-line' }),
          createElement('span', { className: 'hui-card__skeleton-line hui-card__skeleton-line--short' }),
        )
      : null;
    const bodyEl = createElement('div', { className: 'hui-card__body', part: 'body' },
      ...[skeleton].filter(Boolean),
      createElement('div', { className: 'hui-card__content', hidden: loading }, createElement('slot'))
    );

    // ---------- ACTIONS (Ant actions / MUI CardActions) & FOOTER ----------
    const actionsEl = createElement('div', { className: 'hui-card__actions', part: 'actions' },
      createElement('slot', { name: 'actions' })
    );
    const footerEl = createElement('div', { className: 'hui-card__footer', part: 'footer' },
      createElement('slot', { name: 'footer' })
    );

    // Phần nội dung chính (header + body + actions + footer).
    // Tách riêng khỏi cover để layout horizontal đặt cover bên trái, nội dung bên phải.
    const mainEl = createElement('div', { className: 'hui-card__main' },
      headerEl, bodyEl, actionsEl, footerEl
    );

    // Thuộc tính trợ năng: card clickable hoạt động như một nút bấm
    const a11yAttrs = clickable ? { role: 'button', tabindex: '0' } : {};
    if (loading) a11yAttrs['aria-busy'] = 'true';

    this._wrapper = createElement('div', { className: classes, part: 'card', ...a11yAttrs },
      coverEl, mainEl
    );

    if (clickable) {
      this._wrapper.addEventListener('keydown', (e) => this._handleKeydown(e));
      this._wrapper.addEventListener('keyup', (e) => this._handleKeyup(e));
    }

    // Lắng nghe slotchange để ẩn/hiện các vùng khi người dùng thêm/xóa nội dung slot
    this._wrapper.querySelectorAll('slot').forEach((slot) => {
      slot.addEventListener('slotchange', () => this._updateSections());
    });

    this.shadowRoot.appendChild(this._wrapper);
    this._updateSections();
  }
}

if (!customElements.get('hui-card')) {
  customElements.define('hui-card', HuiCard);
}

export default HuiCard;
