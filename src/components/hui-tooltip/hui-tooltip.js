/**
 * HUI Tooltip — Chú thích nổi khi hover / focus / click (Ant Tooltip + MUI Tooltip)
 * Định vị bằng utils/floating.js: 12 vị trí (+ tên kiểu Ant topLeft...), tự lật, bám theo khi cuộn,
 * popup nằm trên top-layer (Popover API) nên không bị overflow/z-index của thẻ cha che.
 * Parts: trigger, popup, content, arrow · Slots: (mặc định) trigger, content
 * Event: open-change { open } · Methods: show(), hide(), toggle()
 * Biến CSS: xem đầu hui-tooltip.css.
 */

import styles from './hui-tooltip.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { computePosition, autoUpdate, showFloating, hideFloating, floatingCss } from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';

const COLOR_VARIANTS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];
let uid = 0;

/**
 * @fires open-change - Mở/đóng do người dùng hoặc method (không phát khi đổi attribute open từ ngoài). detail: { open }
 * @slot - Phần tử kích hoạt (trigger)
 * @slot content - Nội dung HTML (ưu tiên hơn attribute content)
 * @csspart trigger - Khung bọc trigger
 * @csspart popup - Khung tooltip
 * @csspart content - Vùng nội dung bên trong popup
 * @csspart arrow - Mũi tên
 * @cssprop --hui-tooltip-bg - Màu nền (attribute color ưu tiên hơn)
 * @cssprop --hui-tooltip-color - Màu chữ
 * @cssprop --hui-tooltip-max-width - Chiều rộng tối đa (attribute max-width ưu tiên hơn)
 * @cssprop --hui-tooltip-radius - Bo góc
 * @cssprop --hui-tooltip-shadow - Đổ bóng
 * @cssprop --hui-tooltip-font-size - Cỡ chữ
 * @cssprop --hui-tooltip-padding - Padding nội dung
 */
class HuiTooltip extends HuiElement {
  static properties = {
    /** Nội dung text */
    content: { type: String },
    /** Alias của content (giống Ant). Attribute bị gỡ khỏi host để không hiện tooltip native */
    title: { type: String, reflect: false },
    /** top | bottom | left | right, kèm -start / -end (chấp nhận cả topLeft, bottomRight...) */
    placement: { type: String, default: 'top' },
    /** hover (gồm focus bàn phím) | focus | click | manual — kết hợp bằng dấu cách: "hover click" */
    trigger: { type: String, default: 'hover' },
    /** Trạng thái mở (controlled), tự phản chiếu khi mở/đóng */
    open: { type: Boolean },
    /** 'false' = ẩn mũi tên */
    arrow: { type: String, default: 'true' },
    /** Độ trễ trước khi hiện (ms) */
    delay: { type: Number, default: 100 },
    /** Độ trễ trước khi ẩn (ms) */
    hideDelay: { type: Number, default: 100 },
    /** primary | secondary | success | warning | danger | info hoặc màu CSS bất kỳ */
    color: { type: String },
    /** Chiều rộng tối đa (mặc định 250px) */
    maxWidth: { type: String },
    /** Tắt tooltip */
    disabled: { type: Boolean },
    /** Khoảng cách trigger ↔ popup (px) */
    offset: { type: Number, default: 8 },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._shown = false;     // trạng thái hiển thị thực tế
    this._token = 0;         // bỏ qua animation đóng cũ khi mở lại
    this._showTimer = null;
    this._hideTimer = null;
    this._stopAutoUpdate = null;
    this._popupId = `hui-tooltip-${++uid}`;
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  show() { this._clearTimers(); this._setOpen(true); }
  hide() { this._clearTimers(); this._setOpen(false); }
  toggle() { this._clearTimers(); this._setOpen(!this._shown); }

  // =====================================================
  // RENDER / LIFECYCLE
  // =====================================================

  render() {
    this._trigger = createElement('span', { className: 'trigger', part: 'trigger' }, createElement('slot'));

    this._text = document.createTextNode('');
    this._contentSlot = createElement('slot', { name: 'content' }, this._text);
    this._arrow = createElement('span', { className: 'arrow', part: 'arrow' });
    this._popup = createElement('div', {
      className: 'popup hui-floating',
      part: 'popup',
      role: 'tooltip',
      id: this._popupId,
      'aria-hidden': 'true',
      hidden: true,
    }, createElement('div', { className: 'inner', part: 'content' }, this._contentSlot), this._arrow);

    // Listener gắn 1 lần, kiểm tra trigger tại thời điểm xảy ra sự kiện → đổi attribute trigger không cần dựng lại
    const t = this._trigger;
    t.addEventListener('mouseenter', () => this._has('hover') && this._scheduleShow());
    t.addEventListener('mouseleave', () => this._has('hover') && this._scheduleHide());
    // Rê chuột từ trigger sang popup → vẫn mở (interactive như MUI)
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
    t.addEventListener('focusout', () => (this._has('hover') || this._has('focus')) && this._scheduleHide());
    t.addEventListener('click', () => this._has('click') && this.toggle());

    this._contentSlot.addEventListener('slotchange', () => this._shown && this._position());

    return [this._trigger, this._popup];
  }

  connectedCallback() {
    super.connectedCallback();
    // Giữ hành vi cũ (liên kết trigger với nội dung tooltip)
    this.setAttribute('aria-describedby', this._popupId);

    // Click ra ngoài → đóng (chỉ với trigger click)
    this.listen(document, 'click', (e) => {
      if (!this._shown || !this._has('click') || e.composedPath().includes(this)) return;
      this.hide();
    }, { capture: true });

    // Esc → đóng (trừ manual). Bắt ở window/capture để vẫn chạy khi nằm trong Modal
    // (overlay manager chặn lan truyền Esc ở document)
    this.listen(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this._shown && !this._has('manual')) this.hide();
    }, { capture: true });

    // Gắn lại vào trang khi đang có attribute open
    if (this._mounted && this.open) requestAnimationFrame(() => this._applyOpen(this.open));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimers();
    if (this._shown) {
      this._shown = false;
      this._token++;
      this._stopAutoUpdate?.();
      this._stopAutoUpdate = null;
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
    if (changed.has('content') || changed.has('title')) {
      this._text.data = this.content || this.title || '';
    }

    if (changed.has('arrow')) this._arrow.hidden = this.arrow === 'false';

    if (changed.has('maxWidth')) {
      if (this.maxWidth) this._popup.style.setProperty('--_max-width', this.maxWidth);
      else this._popup.style.removeProperty('--_max-width');
    }

    if (changed.has('color')) {
      // Variant đi qua :host([color=...]) trong CSS; màu tùy biến gán thẳng vào biến nền
      const custom = this.color && !COLOR_VARIANTS.includes(this.color);
      if (custom) this._popup.style.setProperty('--_bg', this.color);
      else this._popup.style.removeProperty('--_bg');
    }

    if (changed.has('disabled') && this.disabled) this.hide();

    if (changed.has('open')) {
      // Lần đầu: đợi 1 frame cho layout + slot ổn định rồi mới đo vị trí
      if (!this._mounted) requestAnimationFrame(() => this._applyOpen(this.open));
      else this._applyOpen(this.open);
    }

    if (this._shown && ['placement', 'offset', 'arrow', 'content', 'title', 'maxWidth'].some((k) => changed.has(k))) {
      if (this._hasContent()) this._position();
      else this._setOpen(false);
    }
  }

  firstUpdated() {
    this._mounted = true;
  }

  // =====================================================
  // HELPERS
  // =====================================================

  _has(trigger) {
    return (this.trigger || 'hover').toLowerCase().split(/\s+/).includes(trigger);
  }

  _hasContent() {
    if (this.content || this.title) return true;
    return this._contentSlot.assignedNodes({ flatten: true }).some(
      (n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim() !== ''
    );
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

  /** Áp trạng thái lên DOM (không phát sự kiện) */
  _applyOpen(open) {
    if (open && (this.disabled || !this.isConnected || !this._hasContent())) open = false;
    if (open === this._shown) return;
    this._shown = open;
    const token = ++this._token;
    const popup = this._popup;
    popup.setAttribute('aria-hidden', String(!open));
    this.setState('open', open);

    if (open) {
      popup.getAnimations?.().forEach((a) => a.cancel()); // dọn khung cuối của lần đóng trước
      showFloating(popup, '--hui-z-tooltip');
      this._stopAutoUpdate = autoUpdate(this, popup, () => this._position());
      animateIn(popup, 'zoom', { origin: this._origin });
      return;
    }

    this._stopAutoUpdate?.();
    this._stopAutoUpdate = null;
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

    // Gốc phóng to ở phía gần trigger (đúng đầu mũi tên) → hiệu ứng "bung ra" từ trigger
    const half = withArrow ? this._arrow.offsetWidth / 2 : 0;
    const ox = pos.arrowX !== undefined ? `${pos.arrowX + half}px` : '50%';
    const oy = pos.arrowY !== undefined ? `${pos.arrowY + half}px` : '50%';
    this._origin = {
      top: `${ox} 100%`,
      bottom: `${ox} 0`,
      left: `100% ${oy}`,
      right: `0 ${oy}`,
    }[pos.side];
  }
}

defineElement('hui-tooltip', HuiTooltip);

export default HuiTooltip;
