/**
 * HUI Popover — Khung nổi có tiêu đề + nội dung tương tác (Ant Popover + MUI Popover)
 * Định vị bằng utils/floating.js (12 vị trí, tự lật, bám theo khi cuộn, top-layer qua Popover API).
 * Đang mở (trừ trigger manual) → đăng ký utils/overlay.js: Esc / click ra ngoài đóng lớp trên cùng.
 * Parts: trigger, popup, inner, title, content, arrow · Slots: (mặc định) trigger, title, content
 * Event: open-change { open } · Methods: show(), hide(), toggle()
 * Biến CSS: xem đầu hui-popover.css.
 */

import styles from './hui-popover.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { computePosition, autoUpdate, showFloating, hideFloating, floatingCss } from '../../utils/floating.js';
import { openOverlay, getDeepActiveElement, getTabbables } from '../../utils/overlay.js';
import { animateIn, animateOut } from '../../utils/motion.js';

let uid = 0;

/** Slot có nội dung thật (bỏ qua text chỉ toàn khoảng trắng) */
const hasNodes = (slot) => slot.assignedNodes({ flatten: true }).some(
  (n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim() !== ''
);

/**
 * @fires open-change - Mở/đóng do người dùng hoặc method (không phát khi đổi attribute open từ ngoài). detail: { open }
 * @slot - Phần tử kích hoạt (trigger)
 * @slot title - Tiêu đề HTML (ưu tiên hơn attribute title)
 * @slot content - Nội dung HTML (ưu tiên hơn attribute content)
 * @csspart trigger - Khung bọc trigger
 * @csspart popup - Khung popover
 * @csspart inner - Vùng padding bên trong popup
 * @csspart title - Tiêu đề
 * @csspart content - Nội dung
 * @csspart arrow - Mũi tên
 * @cssprop --hui-popover-bg - Nền
 * @cssprop --hui-popover-color - Màu chữ nội dung
 * @cssprop --hui-popover-title-color - Màu tiêu đề
 * @cssprop --hui-popover-min-width - Chiều rộng tối thiểu (177px)
 * @cssprop --hui-popover-max-width - Chiều rộng tối đa (360px)
 * @cssprop --hui-popover-radius - Bo góc
 * @cssprop --hui-popover-shadow - Đổ bóng
 * @cssprop --hui-popover-padding - Padding
 * @cssprop --hui-popover-font-size - Cỡ chữ
 */
class HuiPopover extends HuiElement {
  static properties = {
    /** Tiêu đề text. Attribute bị gỡ khỏi host để không hiện tooltip native */
    title: { type: String, reflect: false },
    /** Nội dung text (hoặc slot="content") */
    content: { type: String },
    /** top | bottom | left | right, kèm -start / -end (chấp nhận cả topLeft, bottomRight...) */
    placement: { type: String, default: 'top' },
    /** hover (gồm focus bàn phím) | click | focus | manual — kết hợp bằng dấu cách: "hover click" */
    trigger: { type: String, default: 'hover' },
    /** Trạng thái mở (controlled), tự phản chiếu khi mở/đóng */
    open: { type: Boolean },
    /** 'false' = ẩn mũi tên */
    arrow: { type: String, default: 'true' },
    /** Độ trễ trước khi hiện khi hover (ms) */
    delay: { type: Number, default: 100 },
    /** Độ trễ trước khi ẩn khi rời chuột (ms) */
    hideDelay: { type: Number, default: 100 },
    /** Khoảng cách trigger ↔ popup (px) */
    offset: { type: Number, default: 8 },
    /** Tắt popover */
    disabled: { type: Boolean },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._shown = false;
    this._token = 0;
    this._showTimer = null;
    this._hideTimer = null;
    this._stopAutoUpdate = null;
    this._overlay = null;
    this._popupId = `hui-popover-${++uid}`;
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  show() { this._clearTimers(); this._setOpen(true); }
  hide() { this._clearTimers(); this._setOpen(false); }
  toggle() { this._clearTimers(); this._setOpen(!this._shown); }

  /** Phần tử popup (dùng cho component xây trên popover, vd: hui-popconfirm) */
  get popup() {
    return this._popup;
  }

  // =====================================================
  // RENDER / LIFECYCLE
  // =====================================================

  render() {
    this._triggerSlot = createElement('slot');
    this._trigger = createElement('span', { className: 'trigger', part: 'trigger' }, this._triggerSlot);

    this._titleText = document.createTextNode('');
    this._titleSlot = createElement('slot', { name: 'title' }, this._titleText);
    this._title = createElement('div', { className: 'title', part: 'title', id: `${this._popupId}-title` }, this._titleSlot);

    this._contentText = document.createTextNode('');
    this._contentSlot = createElement('slot', { name: 'content' }, this._contentText);
    this._content = createElement('div', { className: 'content', part: 'content' }, this._contentSlot);

    this._arrow = createElement('span', { className: 'arrow', part: 'arrow' });
    this._popup = createElement('div', {
      className: 'popup hui-floating',
      part: 'popup',
      role: 'dialog',
      id: this._popupId,
      tabindex: '-1',
      hidden: true,
    }, createElement('div', { className: 'inner', part: 'inner' }, this._title, this._content), this._arrow);

    // Listener gắn 1 lần, kiểm tra trigger tại thời điểm xảy ra sự kiện
    const t = this._trigger;
    t.addEventListener('mouseenter', () => this._has('hover') && this._scheduleShow());
    t.addEventListener('mouseleave', () => this._has('hover') && this._scheduleHide());
    // Rê chuột từ trigger sang popup → vẫn mở để thao tác bên trong
    this._popup.addEventListener('mouseenter', () => this._has('hover') && this._scheduleShow());
    this._popup.addEventListener('mouseleave', () => this._has('hover') && this._scheduleHide());

    t.addEventListener('focusin', (e) => {
      if (this._has('focus')) return this._scheduleShow();
      if (!this._has('hover')) return;
      // hover: chỉ mở khi focus bằng bàn phím, tránh bật lại sau khi click chuột
      let keyboard = true;
      try { keyboard = e.target.matches(':focus-visible'); } catch { /* trình duyệt cũ */ }
      if (keyboard) this._scheduleShow();
    });
    t.addEventListener('focusout', (e) => {
      if (!this._has('hover') && !this._has('focus')) return;
      // Focus chuyển vào trong popup (Tab tới nút bên trong) → giữ mở
      if (this._containsFocus(e.relatedTarget)) return;
      this._scheduleHide();
    });
    this._popup.addEventListener('focusout', (e) => {
      if ((this._has('hover') || this._has('focus')) && !this._containsFocus(e.relatedTarget)) this._scheduleHide();
    });
    t.addEventListener('click', () => this._has('click') && this.toggle());

    for (const slot of [this._titleSlot, this._contentSlot]) {
      slot.addEventListener('slotchange', () => {
        this._syncSections();
        if (this._shown) this._position();
      });
    }

    return [this._trigger, this._popup];
  }

  connectedCallback() {
    super.connectedCallback();
    // Esc khi trigger manual không đăng ký overlay → không đóng (giống tooltip manual)
    if (this._mounted && this.open) requestAnimationFrame(() => this._applyOpen(this.open));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimers();
    if (this._shown) {
      this._shown = false;
      this._token++;
      this._teardown();
      hideFloating(this._popup);
    }
  }

  /** Alias `title`: lưu nội dung rồi gỡ attribute khỏi host (tránh tooltip native chồng lên) */
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'title') {
      if (newVal === null) return; // lần gọi do chính ta removeAttribute
      super.attributeChangedCallback(name, oldVal, newVal);
      this.removeAttribute('title');
      return;
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }

  updated(changed) {
    if (changed.has('title')) this._titleText.data = this.title || '';
    if (changed.has('content')) this._contentText.data = this.content || '';
    if (changed.has('title') || changed.has('content')) this._syncSections();
    if (changed.has('arrow')) this._arrow.hidden = this.arrow === 'false';
    if (changed.has('disabled') && this.disabled) this.hide();

    if (changed.has('open')) {
      // Lần đầu: đợi 1 frame cho layout + slot ổn định rồi mới đo vị trí
      if (!this._mounted) requestAnimationFrame(() => this._applyOpen(this.open));
      else this._applyOpen(this.open);
    }

    if (this._shown && ['placement', 'offset', 'arrow', 'content', 'title'].some((k) => changed.has(k))) {
      if (this._hasContent()) this._position();
      else this._setOpen(false);
    }
  }

  firstUpdated() {
    this._mounted = true;
    this._syncSections();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  _has(trigger) {
    return (this.trigger || 'hover').toLowerCase().split(/\s+/).includes(trigger);
  }

  _containsFocus(node) {
    for (let n = node; n; n = n.assignedSlot || n.parentNode || n.host) {
      if (n === this._popup || n === this) return true;
    }
    return false;
  }

  /** Ẩn vùng tiêu đề / nội dung trống; gắn aria-labelledby khi có tiêu đề */
  _syncSections() {
    if (!this._title) return;
    const hasTitle = Boolean(this.title) || hasNodes(this._titleSlot);
    this._title.hidden = !hasTitle;
    this._content.hidden = !this.content && !hasNodes(this._contentSlot);
    if (hasTitle) this._popup.setAttribute('aria-labelledby', this._title.id);
    else this._popup.removeAttribute('aria-labelledby');
  }

  _hasContent() {
    return Boolean(this.title || this.content) || hasNodes(this._titleSlot) || hasNodes(this._contentSlot);
  }

  _clearTimers() {
    clearTimeout(this._showTimer);
    clearTimeout(this._hideTimer);
    this._showTimer = null;
    this._hideTimer = null;
  }

  _scheduleShow() {
    clearTimeout(this._hideTimer);
    this._hideTimer = null;
    if (this._shown || this._showTimer) return;
    this._showTimer = setTimeout(() => {
      this._showTimer = null;
      this._setOpen(true);
    }, this.delay ?? 100);
  }

  _scheduleHide() {
    clearTimeout(this._showTimer);
    this._showTimer = null;
    if (!this._shown || this._hideTimer) return;
    this._hideTimer = setTimeout(() => {
      this._hideTimer = null;
      this._setOpen(false);
    }, this.hideDelay ?? 100);
  }

  /** Đổi trạng thái do người dùng / method: hiển thị + phản chiếu attribute open + phát open-change */
  _setOpen(open) {
    if (open && (this.disabled || !this._hasContent())) return;
    if (open === this._shown) return;
    this._applyOpen(open);
    this.open = open; // updated() gọi lại _applyOpen nhưng trạng thái đã khớp → bỏ qua
    this.emit('open-change', { open });
  }

  /** Esc khi focus đang ở trong popup → trả focus về trigger (không thì focus rơi về <body>) */
  _closeByEscape() {
    const active = getDeepActiveElement();
    const inside = this._containsFocus(active) && active !== this;
    this._setOpen(false);
    if (inside) {
      const el = this._triggerSlot.assignedElements({ flatten: true })[0];
      if (el) (getTabbables(el)[0] || el).focus?.();
    }
  }

  _teardown() {
    this._stopAutoUpdate?.();
    this._stopAutoUpdate = null;
    this._overlay?.close();
    this._overlay = null;
  }

  /** Áp trạng thái lên DOM (không phát sự kiện) */
  _applyOpen(open) {
    if (open && (this.disabled || !this.isConnected || !this._hasContent())) open = false;
    if (open === this._shown) return;
    this._shown = open;
    const token = ++this._token;
    const popup = this._popup;
    this.setState('open', open);

    if (open) {
      popup.getAnimations?.().forEach((a) => a.cancel()); // dọn khung cuối của lần đóng trước
      showFloating(popup, '--hui-z-popover');
      this._stopAutoUpdate = autoUpdate(this, popup, () => this._position());
      // manual: người dùng tự điều khiển hoàn toàn → không nghe Esc / click ngoài
      if (!this._has('manual')) {
        this._overlay = openOverlay({
          element: popup,
          ignore: [this],
          restoreFocus: false,
          onEscape: () => this._closeByEscape(),
          onClickOutside: () => this._setOpen(false),
        });
      }
      animateIn(popup, 'zoom', { origin: this._origin });
      return;
    }

    this._teardown();
    animateOut(popup, 'zoom', { origin: this._origin }).then(() => {
      if (token !== this._token) return; // đã mở lại trong lúc đang đóng
      hideFloating(popup);
      popup.getAnimations?.().forEach((a) => a.cancel());
    });
  }

  _position() {
    const popup = this._popup;
    const withArrow = this.arrow !== 'false';
    const pos = computePosition(this, popup, {
      placement: this.placement || 'top',
      offset: this.offset ?? 8,
      arrow: withArrow ? this._arrow : undefined,
    });

    popup.style.left = `${pos.x}px`;
    popup.style.top = `${pos.y}px`;
    popup.dataset.side = pos.side;

    if (pos.arrowX !== undefined) popup.style.setProperty('--_arrow-x', `${pos.arrowX}px`);
    else popup.style.removeProperty('--_arrow-x');
    if (pos.arrowY !== undefined) popup.style.setProperty('--_arrow-y', `${pos.arrowY}px`);
    else popup.style.removeProperty('--_arrow-y');

    // Gốc phóng to ở đầu mũi tên → hiệu ứng "bung ra" từ trigger
    const half = withArrow ? this._arrow.offsetWidth / 2 : 0;
    const ox = pos.arrowX !== undefined ? `${pos.arrowX + half}px` : '50%';
    const oy = pos.arrowY !== undefined ? `${pos.arrowY + half}px` : '50%';
    this._origin = { top: `${ox} 100%`, bottom: `${ox} 0`, left: `100% ${oy}`, right: `0 ${oy}` }[pos.side];
  }
}

defineElement('hui-popover', HuiPopover);

export default HuiPopover;
