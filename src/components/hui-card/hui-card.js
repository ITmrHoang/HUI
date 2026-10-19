/**
 * HUI Card — Thẻ nội dung (Ant Card + MUI Card). Parts/slots/biến CSS: xem JSDoc của class.
 */

import styles from './hui-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { t } from '../../core/locale.js';
import '../hui-icon/hui-icon.js';

/** Slot có nội dung thật (bỏ qua text node chỉ chứa khoảng trắng) */
const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/** Hiệu ứng hợp lệ của attribute effect (nhiều giá trị cách nhau bởi khoảng trắng) */
const EFFECTS = ['lift', 'tilt', 'glow', 'zoom-media', 'reveal', 'border-gradient'];

/** Phần tử tương tác bên trong card: click vào đây không kích hoạt link/chọn card */
const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [contenteditable], hui-button, hui-checkbox, hui-switch, hui-select, hui-input, hui-rate, hui-dropdown';

/**
 * Thẻ nội dung: header (avatar, title, extra), cover, body, actions, footer, skeleton loading.
 *
 * @fires click - Card `clickable` được nhấn Enter/Space (detail { originalEvent }); click chuột là event native
 * @fires change - Card `selectable` đổi trạng thái chọn. detail: { selected }
 * @slot - Nội dung body
 * @slot overlay - Lớp phủ trên cover (với effect="reveal": chỉ hiện khi hover/focus)
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
 * @csspart overlay - Lớp phủ trên cover
 * @csspart link - Link tiêu đề (khi có href)
 * @csspart check - Dấu chọn góc trên (khi selectable)
 * @csspart glow - Lớp đốm sáng (effect="glow")
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
 * @cssprop --hui-card-selected-color - Màu viền + dấu chọn khi selected
 * @cssprop --hui-card-media-zoom - Độ phóng ảnh cover khi hover (effect="zoom-media", mặc định 1.06)
 * @cssprop --hui-card-glow-color - Màu đốm sáng (effect="glow")
 * @cssprop --hui-card-glow-size - Bán kính đốm sáng (mặc định 280px)
 * @cssprop --hui-card-gradient - Dải màu viền chạy (effect="border-gradient")
 * @cssprop --hui-card-gradient-width - Độ dày viền chạy (mặc định 2px)
 * @cssprop --hui-card-gradient-duration - Thời gian một vòng viền chạy (mặc định 4s)
 * @cssprop --hui-card-overlay-bg - Nền lớp phủ trên cover
 */
class HuiCard extends HuiElement {
  static properties = {
    /** Tiêu đề header */
    title: { type: String },
    /** Phụ đề dưới tiêu đề */
    subtitle: { type: String },
    /** elevated | outlined | filled | ghost — ghost: không nền, không viền, không bóng */
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
    /** Hiệu ứng, nhiều giá trị cách nhau bởi khoảng trắng: lift tilt glow zoom-media reveal border-gradient */
    effect: { type: String },
    /** Cả card là một link: bấm vào chỗ trống của card sẽ mở href (nút bên trong vẫn hoạt động riêng) */
    href: { type: String },
    /** target của link (vd _blank) */
    target: { type: String },
    /** Bấm để chọn / bỏ chọn (chọn nhiều card), phát change {selected} */
    selectable: { type: Boolean },
    /** Trạng thái đang chọn (dùng với selectable) */
    selected: { type: Boolean },
    /** Tắt mọi hiệu ứng chuyển động của card */
    noAnimation: { type: Boolean },
  };

  static localized = true;

  static styles = styles;

  render() {
    const slot = (name, ...fallback) => {
      const s = createElement('slot', name ? { name } : {}, ...fallback);
      s.addEventListener('slotchange', () => {
        this._syncSections();
        // Nội dung slot đổi có thể thêm/bớt <a href> → quyết định lại có cần link ẩn không
        if (this.href && !this.title) this._syncLink();
      });
      return s;
    };

    // Cover: slot "cover" thay được ảnh mặc định (attribute cover)
    this._coverImg = createElement('img', { className: 'hui-card__cover-img', part: 'cover-img', alt: '', loading: 'lazy' });
    this._coverSlot = slot('cover', this._coverImg);
    this._overlaySlot = slot('overlay');
    this._overlay = createElement('div', { className: 'hui-card__overlay', part: 'overlay' }, this._overlaySlot);
    this._cover = createElement('div', { className: 'hui-card__cover', part: 'cover' }, this._coverSlot, this._overlay);

    // Header mặc định: avatar | title + subtitle | extra — slot "header" thay toàn bộ
    // Có href → tiêu đề là <a> thật (Tab tới được, chuột giữa/Ctrl+click mở tab mới như link thường)
    this._titleText = createElement('span');
    this._link = createElement('a', { className: 'hui-card__link', part: 'link' });
    this._title = createElement('div', { className: 'hui-card__title', part: 'title' }, this._titleText);
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

    // Dấu chọn (selectable) và lớp đốm sáng (effect glow)
    this._check = createElement('span', { className: 'hui-card__check', part: 'check', 'aria-hidden': 'true' },
      createElement('hui-icon', { name: 'check' }));
    this._glow = createElement('span', { className: 'hui-card__glow', part: 'glow', 'aria-hidden': 'true' });

    this._card = createElement('div', { part: 'card' }, this._cover, main, this._check, this._glow);
    this._card.addEventListener('keydown', (e) => this._handleKeydown(e));
    this._card.addEventListener('keyup', (e) => this._handleKeyup(e));
    this._card.addEventListener('click', (e) => this._handleCardClick(e));
    // Chuột giữa trên vùng trống của card có href → mở tab mới như link thường
    this._card.addEventListener('auxclick', (e) => {
      if (e.button === 1 && this.href && !this._fromInteractive(e)) window.open(this.href, '_blank', 'noopener');
    });
    return this._card;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._fxToken = (this._fxToken || 0) + 1; // hủy lượt tải module đang chờ
    this._fxCleanup?.();
    this._fxCleanup = null;
    this._fxDetached = true;
  }

  connectedCallback() {
    super.connectedCallback();
    // Bị tháo ra rồi gắn lại → gắn lại hiệu ứng theo chuột (lần đầu đã do updated() lo)
    if (this._fxDetached) {
      this._fxDetached = false;
      this._syncPointerEffects();
    }
  }

  /** Danh sách hiệu ứng hợp lệ đang bật */
  get effects() {
    return (this.effect || '').split(/\s+/).filter((e) => EFFECTS.includes(e));
  }

  updated(changed) {
    const card = this._card;

    const classKeys = ['variant', 'elevation', 'size', 'orientation', 'hoverable', 'clickable', 'loading', 'type',
      'effect', 'href', 'selectable', 'selected', 'noAnimation'];
    if (classKeys.some((k) => changed.has(k))) {
      const elevation = Number.isFinite(this.elevation) ? Math.min(4, Math.max(0, Math.round(this.elevation))) : 1;
      const fx = this.noAnimation ? [] : this.effects;
      card.className = [
        'hui-card',
        `hui-card--${this.variant}`,
        `hui-card--${this.size}`,
        `hui-card--${this.orientation}`,
        this.variant === 'elevated' ? `hui-card--elevation-${elevation}` : '',
        // clickable / href / effect lift luôn kèm hiệu ứng nổi khi hover (giống MUI CardActionArea)
        this.hoverable || this.clickable || fx.includes('lift') ? 'hui-card--hoverable' : '',
        this.clickable || this.href || this.selectable ? 'hui-card--clickable' : '',
        this.href ? 'hui-card--link' : '',
        this.selectable ? 'hui-card--selectable' : '',
        this.selectable && this.selected ? 'hui-card--selected' : '',
        this.loading ? 'hui-card--loading' : '',
        this.type === 'inner' ? 'hui-card--inner' : '',
        this.noAnimation ? 'hui-card--static' : '',
        ...fx.map((e) => `hui-card--fx-${e}`),
      ].filter(Boolean).join(' ');
    }

    if (changed.has('effect') || changed.has('noAnimation')) this._syncPointerEffects();

    if (changed.has('title') || changed.has('href') || changed.has('target') || changed.has('locale')) this._syncLink();
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

    if (changed.has('clickable') || changed.has('selectable') || changed.has('selected') || changed.has('href')) {
      // selectable → checkbox; clickable → button; có href thì phần tử focus được là <a> ở tiêu đề
      if (this.selectable) {
        card.setAttribute('role', 'checkbox');
        card.setAttribute('aria-checked', String(Boolean(this.selected)));
        card.setAttribute('tabindex', '0');
      } else if (this.clickable && !this.href) {
        card.setAttribute('role', 'button');
        card.removeAttribute('aria-checked');
        card.setAttribute('tabindex', '0');
      } else {
        card.removeAttribute('role');
        card.removeAttribute('aria-checked');
        card.removeAttribute('tabindex');
      }
      this._check.hidden = !this.selectable;
    }

    if (changed.has('loading')) {
      card.toggleAttribute('aria-busy', this.loading);
      this._skeleton.hidden = !this.loading;
      this._content.hidden = this.loading;
    }

    this._syncSections();
  }

  /**
   * Tiêu đề: có href → bọc chữ trong <a> (link thật để Tab / trình đọc màn hình / Ctrl+click hoạt động);
   * không có tiêu đề mà có href → link ẩn với nhãn "Xem chi tiết" để card vẫn truy cập được bằng bàn phím.
   */
  _syncLink() {
    const text = this.title || '';
    if (this.href) {
      this._link.href = this.href;
      if (this.target) this._link.target = this.target;
      else this._link.removeAttribute('target');
      if (this.target === '_blank') this._link.rel = 'noopener noreferrer';
      else this._link.removeAttribute('rel');
      this._link.textContent = text;
      this._link.classList.toggle('hui-card__link--hidden', !text);
      if (!text) this._link.setAttribute('aria-label', t('card.open'));
      else this._link.removeAttribute('aria-label');
      if (text) this._title.replaceChildren(this._link);
      // Không tiêu đề: nội dung đã có <a href> (vd tên sản phẩm) thì dùng link đó, không thêm link ẩn
      // → tránh 2 điểm dừng Tab cho cùng một card
      else if (this.querySelector('a[href]')) this._link.remove();
      else this._card.prepend(this._link);
    } else {
      this._link.remove();
      this._titleText.textContent = text;
      this._title.replaceChildren(this._titleText);
    }
  }

  /** Bật/tắt hiệu ứng theo con trỏ — module effects chỉ tải khi thật sự cần (tilt / glow) */
  _syncPointerEffects() {
    const fx = this.noAnimation ? [] : this.effects.filter((e) => e === 'tilt' || e === 'glow');
    // Mỗi lần đồng bộ là một "lượt"; lượt cũ đang chờ tải module sẽ tự bỏ qua
    const token = (this._fxToken = (this._fxToken || 0) + 1);
    this._fxCleanup?.();
    this._fxCleanup = null;
    if (!fx.length || !this.isConnected) return;
    import('../../effects/index.js').then(({ attachTilt, attachGlow }) => {
      if (token !== this._fxToken || !this.isConnected) return;
      const stops = [];
      if (fx.includes('tilt')) stops.push(attachTilt(this, { target: this._card }));
      if (fx.includes('glow')) stops.push(attachGlow(this, { target: this._card }));
      this._fxCleanup = () => stops.forEach((s) => s());
    });
  }

  /** Click xuất phát từ nút/link/ô nhập bên trong card → để phần tử đó tự xử lý */
  _fromInteractive(e) {
    for (const node of e.composedPath()) {
      if (node === this._card) return false;
      if (node === this._link) return true;
      if (node instanceof Element && node.matches(INTERACTIVE)) return true;
    }
    return false;
  }

  _handleCardClick(e) {
    if (this._fromInteractive(e)) return;
    // Đang bôi đen chữ trong card → không coi là click mở/chọn
    if (String(window.getSelection?.() || '').length > 0) return;
    if (this.selectable) {
      this._toggleSelected();
      return;
    }
    if (this.href) {
      if (e.ctrlKey || e.metaKey || e.shiftKey) window.open(this.href, '_blank', 'noopener');
      else this._primaryLink()?.click();
    }
  }

  /** Link đại diện cho card: link tiêu đề / link ẩn của card, hoặc <a href> có sẵn trong nội dung */
  _primaryLink() {
    return this._link.isConnected ? this._link : this.querySelector('a[href]');
  }

  _toggleSelected() {
    this.selected = !this.selected;
    this.emit('change', { selected: this.selected });
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
    this._overlay.hidden = !hasContent(this._overlaySlot);
    this._actions.hidden = !hasContent(this._actionsSlot);
    this._footer.hidden = !hasContent(this._footerSlot);
  }

  /** Bàn phím giống <button>: Enter kích hoạt khi nhấn, Space khi nhả (chặn cuộn trang) */
  _handleKeydown(e) {
    if (this.selectable && e.target === this._card && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      this._toggleSelected();
      return;
    }
    if (!this.clickable || e.target !== this._card) return; // Bỏ qua phím từ phần tử con
    if (e.key === 'Enter') {
      e.preventDefault();
      this.emit('click', { originalEvent: e });
    } else if (e.key === ' ') {
      e.preventDefault();
    }
  }

  _handleKeyup(e) {
    if (this.selectable || !this.clickable || e.target !== this._card) return;
    if (e.key === ' ') this.emit('click', { originalEvent: e });
  }

  /** Focus vào phần tử nhận focus thật: link (href) → khung (clickable/selectable) → chính host */
  focus(options) {
    if (this.href && this._primaryLink()) this._primaryLink().focus(options);
    else if ((this.clickable || this.selectable) && this._card) this._card.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-card', HuiCard);

export default HuiCard;
