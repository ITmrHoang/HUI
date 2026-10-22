/**
 * HUI Hover Card — Rê chuột / focus vào trigger (tên, avatar, link) → hiện thẻ thông tin chi tiết nổi
 * (kiểu GitHub / X), có trễ mở / đóng. Cảm ứng: chạm lần đầu mở thẻ, chạm lần hai mới theo link.
 * Định vị bằng utils/floating (top-layer qua Popover API), Esc / chạm ra ngoài để đóng.
 */

import styles from './hui-hover-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { autoUpdate, computePosition, floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { getDeepActiveElement, getTabbables, openOverlay } from '../../utils/overlay.js';

let uid = 0;

/**
 * Thẻ nổi khi hover. Nội dung thẻ là phần tử slot="content" (light DOM) → trigger được gắn
 * `aria-describedby` trỏ tới nội dung (ID nằm cùng cây DOM nên trình đọc màn hình đọc được) và `aria-expanded`.
 *
 * @fires hui-open-change - Thẻ mở / đóng. detail: { open }
 * @slot - Phần tử kích hoạt (link tên người dùng, avatar…)
 * @slot content - Nội dung thẻ
 * @csspart trigger - Khung bọc trigger
 * @csspart card - Thẻ nổi (top-layer)
 * @csspart arrow - Mũi tên (attribute arrow)
 * @cssprop --hui-hover-card-bg - Nền thẻ
 * @cssprop --hui-hover-card-color - Màu chữ
 * @cssprop --hui-hover-card-padding - Đệm
 * @cssprop --hui-hover-card-radius - Bo góc
 * @cssprop --hui-hover-card-shadow - Đổ bóng
 * @cssprop --hui-hover-card-border-color - Viền
 * @cssprop --hui-hover-card-width - Chiều rộng (mặc định 320px, không vượt màn hình)
 */
class HuiHoverCard extends HuiElement {
  static properties = {
    /** top | bottom | left | right, kèm -start / -end */
    placement: { type: String, default: 'bottom-start' },
    /** Trễ trước khi mở (ms) */
    openDelay: { type: Number, default: 400 },
    /** Trễ trước khi đóng khi rời chuột / mất focus (ms) */
    closeDelay: { type: Number, default: 250 },
    /** Khoảng cách trigger ↔ thẻ (px) */
    offset: { type: Number, default: 8 },
    /** Hiện mũi tên */
    arrow: { type: Boolean },
    /** Trạng thái mở (phản chiếu khi mở / đóng) */
    open: { type: Boolean },
    /** Không mở */
    disabled: { type: Boolean },
    /** Tắt hiệu ứng */
    noAnimation: { type: Boolean },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._uid = ++uid;
    this._shown = false;
    this._token = 0;
    this._timer = 0;
    this._overlay = null;
    this._stop = null;
    this._lastPointer = 'mouse';
    this._describedEl = null;
  }

  render() {
    this._triggerSlot = createElement('slot');
    this._triggerSlot.addEventListener('slotchange', () => this._syncAria());
    this._trigger = createElement('span', { className: 'trigger', part: 'trigger' }, this._triggerSlot);

    this._contentSlot = createElement('slot', { name: 'content' });
    this._contentSlot.addEventListener('slotchange', () => this._syncAria());
    this._arrow = createElement('span', { className: 'arrow', part: 'arrow', hidden: true });
    this._card = createElement('div', { className: 'card hui-floating', part: 'card', hidden: true }, this._contentSlot, this._arrow);

    const t = this._trigger;
    t.addEventListener('pointerenter', (e) => {
      this._lastPointer = e.pointerType;
      if (e.pointerType === 'mouse') this._schedule(true);
    });
    t.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this._schedule(false); });
    t.addEventListener('pointerdown', (e) => { this._lastPointer = e.pointerType; });
    // Cảm ứng: chạm lần đầu mở thẻ (chặn điều hướng của link), chạm lần hai đi tiếp như bình thường
    t.addEventListener('click', (e) => {
      if (this._lastPointer === 'mouse' || this._lastPointer === 'pen' || this.disabled) return;
      if (!this._shown) {
        e.preventDefault();
        this._clear();
        this._setOpen(true);
      }
    });
    t.addEventListener('focusin', (e) => {
      // Chỉ mở khi focus bằng bàn phím (click chuột đã có hover)
      let keyboard = true;
      try { keyboard = e.composedPath()[0].matches(':focus-visible'); } catch { /* trình duyệt cũ */ }
      if (keyboard) this._schedule(true);
    });
    t.addEventListener('focusout', (e) => { if (!this._containsNode(e.relatedTarget)) this._schedule(false); });

    this._card.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') this._clear(); });
    this._card.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') this._schedule(false); });
    this._card.addEventListener('focusout', (e) => { if (!this._containsNode(e.relatedTarget)) this._schedule(false); });
    return [this._trigger, this._card];
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._mounted && this.open) requestAnimationFrame(() => this._apply(this.open));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clear();
    if (this._shown) {
      this._shown = false;
      this._token++;
      this._teardown();
      hideFloating(this._card);
    }
    this._unlinkAria();
  }

  updated(changed) {
    if (changed.has('arrow')) this._arrow.hidden = !this.arrow;
    if (changed.has('disabled') && this.disabled) this.hide();
    if (changed.has('open')) {
      if (!this._mounted) requestAnimationFrame(() => this._apply(this.open));
      else this._apply(this.open);
    }
    if (this._shown && ['placement', 'offset', 'arrow'].some((k) => changed.has(k))) this._position();
  }

  firstUpdated() {
    this._mounted = true;
    this._syncAria();
  }

  /** Mở ngay (không trễ) */
  show() {
    this._clear();
    this._setOpen(true);
  }

  /** Đóng ngay */
  hide() {
    this._clear();
    this._setOpen(false);
  }

  // =====================================================
  // ARIA
  // =====================================================

  _triggerEl() {
    return this._triggerSlot.assignedElements({ flatten: true })[0] || null;
  }

  _contentEl() {
    return this._contentSlot.assignedElements({ flatten: true })[0] || null;
  }

  /** Trigger ↔ nội dung cùng nằm ở light DOM → gắn được aria-describedby bằng ID */
  _syncAria() {
    if (!this._hasRendered) return;
    const trigger = this._triggerEl();
    const content = this._contentEl();
    if (this._describedEl && this._describedEl !== trigger) this._unlinkAria();
    if (!trigger) return;
    this._describedEl = trigger;
    if (content) {
      if (!content.id) content.id = `hui-hover-card-${this._uid}`;
      const ids = (trigger.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)
        .filter((id) => id !== this._linkedId);
      ids.push(content.id);
      this._linkedId = content.id;
      trigger.setAttribute('aria-describedby', ids.join(' '));
    }
    trigger.setAttribute('aria-expanded', String(this._shown));
  }

  _unlinkAria() {
    const el = this._describedEl;
    if (!el) return;
    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter((id) => id && id !== this._linkedId);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
    el.removeAttribute('aria-expanded');
    this._describedEl = null;
  }

  // =====================================================
  // MỞ / ĐÓNG
  // =====================================================

  _clear() {
    clearTimeout(this._timer);
    this._timer = 0;
  }

  _schedule(open) {
    this._clear();
    if (open === this._shown) return;
    this._timer = setTimeout(() => {
      this._timer = 0;
      this._setOpen(open);
    }, Math.max(0, open ? this.openDelay ?? 400 : this.closeDelay ?? 250));
  }

  _setOpen(open) {
    if (open && (this.disabled || !this._contentEl())) return;
    if (open === this._shown) return;
    this._apply(open);
    this.open = open;
    this.emit('hui-open-change', { open });
  }

  get _animated() {
    return !this.noAnimation && !animationsDisabled();
  }

  _apply(open) {
    if (open && (this.disabled || !this.isConnected || !this._contentEl())) open = false;
    if (open === this._shown) return;
    this._shown = open;
    const token = ++this._token;
    const card = this._card;
    this.setState('open', open);
    this._triggerEl()?.setAttribute('aria-expanded', String(open));

    if (open) {
      card.getAnimations?.().forEach((a) => a.cancel());
      showFloating(card, '--hui-z-popover');
      this._stop = autoUpdate(this._trigger, card, () => this._position());
      this._overlay = openOverlay({
        element: card,
        ignore: [this._trigger],
        restoreFocus: false,
        onEscape: () => this._closeByEscape(),
        onClickOutside: () => this._setOpen(false),
      });
      if (this._animated) animateIn(card, 'zoom', { origin: this._origin });
      return;
    }

    this._teardown();
    const done = () => {
      if (token !== this._token) return;
      hideFloating(card);
      card.getAnimations?.().forEach((a) => a.cancel());
    };
    if (this._animated) animateOut(card, 'zoom', { origin: this._origin }).then(done);
    else done();
  }

  _teardown() {
    this._stop?.();
    this._stop = null;
    this._overlay?.close();
    this._overlay = null;
  }

  /** Esc khi focus trong thẻ → trả focus về trigger */
  _closeByEscape() {
    const inside = this._containsNode(getDeepActiveElement());
    this._setOpen(false);
    if (inside) {
      const el = this._triggerEl();
      if (el) (el.matches?.('a[href], button, [tabindex]') ? el : getTabbables(el)[0] || el).focus?.();
    }
  }

  _position() {
    const pos = computePosition(this._trigger, this._card, {
      placement: this.placement || 'bottom-start',
      offset: (this.offset ?? 8) + (this.arrow ? 6 : 0),
      arrow: this.arrow ? this._arrow : undefined,
    });
    const card = this._card;
    card.style.left = `${pos.x}px`;
    card.style.top = `${pos.y}px`;
    card.dataset.side = pos.side;
    if (pos.arrowX !== undefined) card.style.setProperty('--_hc-arrow-x', `${pos.arrowX}px`);
    else card.style.removeProperty('--_hc-arrow-x');
    if (pos.arrowY !== undefined) card.style.setProperty('--_hc-arrow-y', `${pos.arrowY}px`);
    else card.style.removeProperty('--_hc-arrow-y');
    const h = { start: 'left', end: 'right', center: 'center' }[pos.align] || 'center';
    const v = { start: 'top', end: 'bottom', center: 'center' }[pos.align] || 'center';
    this._origin = { bottom: `top ${h}`, top: `bottom ${h}`, right: `${v} left`, left: `${v} right` }[pos.side];
  }

  _containsNode(node) {
    for (let n = node; n; n = n.assignedSlot || n.parentNode || n.host) {
      if (n === this || n === this._card) return true;
    }
    return false;
  }
}

defineElement('hui-hover-card', HuiHoverCard);

export default HuiHoverCard;
