/**
 * HUI Drawer — Ngăn kéo trượt từ mép màn hình (Ant Drawer + MUI Drawer)
 * Có mask: <dialog>.showModal() (top-layer, trang bên dưới inert). mask="false": Popover API (không modal).
 * Esc / click mask / focus trap / khóa cuộn / trả focus: utils/overlay.js (chỉ lớp trên cùng nhận Esc).
 * Drawer lồng nhau: drawer con mở → drawer cha lùi vào (push) một đoạn --hui-drawer-push-distance.
 * Biến CSS: xem đầu hui-drawer.css.
 */

import styles from './hui-drawer.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { openOverlay } from '../../utils/overlay.js';
import { supportsPopover } from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { isPointOnToast } from '../hui-message/toast-core.js';
import '../hui-icon/hui-icon.js';

const PLACEMENTS = ['right', 'left', 'top', 'bottom'];
const MOTION = { right: 'move-right', left: 'move-left', top: 'move-up', bottom: 'move-down' };
let uid = 0;

/** Slot có nội dung thật (bỏ qua text chỉ toàn khoảng trắng) */
const hasNodes = (slot) => slot.assignedNodes({ flatten: true }).some(
  (n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim() !== ''
);

/**
 * @fires hui-open - Drawer vừa mở (không phát khi render lần đầu với sẵn attribute open)
 * @fires hui-close - Drawer bắt đầu đóng
 * @fires hui-after-close - Đã đóng xong (hết animation)
 * @fires hui-cancel - Người dùng muốn đóng (nút X / Esc / click mask). Cancelable: preventDefault() để giữ mở
 * @slot - Nội dung body
 * @slot header - Thay vùng tiêu đề (mặc định là attribute title)
 * @slot extra - Vùng hành động bên phải header
 * @slot footer - Footer (ẩn khi không có nội dung)
 * @csspart dialog - Thẻ <dialog> phủ toàn màn hình
 * @csspart mask - Lớp phủ nền
 * @csspart panel - Khung drawer
 * @csspart header - Vùng header
 * @csspart close - Nút đóng X
 * @csspart title - Tiêu đề
 * @csspart extra - Vùng extra
 * @csspart body - Vùng nội dung
 * @csspart footer - Vùng footer
 * @cssprop --hui-drawer-size - Rộng (left/right) hoặc cao (top/bottom); size dạng độ dài CSS ưu tiên hơn
 * @cssprop --hui-drawer-bg - Nền
 * @cssprop --hui-drawer-color - Màu chữ nội dung
 * @cssprop --hui-drawer-shadow - Đổ bóng
 * @cssprop --hui-drawer-mask-bg - Nền lớp phủ
 * @cssprop --hui-drawer-border-color - Đường kẻ header / footer
 * @cssprop --hui-drawer-header-padding - Padding header
 * @cssprop --hui-drawer-body-padding - Padding body
 * @cssprop --hui-drawer-footer-padding - Padding footer
 * @cssprop --hui-drawer-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-drawer-title-color - Màu tiêu đề
 * @cssprop --hui-drawer-push-distance - Khoảng đẩy drawer cha khi mở drawer con (180px)
 */
class HuiDrawer extends HuiElement {
  static properties = {
    /** Trạng thái mở (hoặc gọi show() / hide()) */
    open: { type: Boolean },
    /** Tiêu đề (hoặc slot="header") */
    title: { type: String },
    /** right | left | top | bottom — mép trượt ra */
    placement: { type: String, default: 'right' },
    /** default | large — 378px | 736px, hoặc độ dài CSS bất kỳ (số = px): rộng với left/right, cao với top/bottom */
    size: { type: String, default: 'default' },
    /** 'false' = không có lớp phủ, trang bên dưới vẫn thao tác được (không modal) */
    mask: { type: String, default: 'true' },
    /** 'false' = click mask không đóng */
    maskClosable: { type: String, default: 'true' },
    /** 'false' = ẩn nút X */
    closable: { type: String, default: 'true' },
    /** 'false' = phím Esc không đóng */
    keyboard: { type: String, default: 'true' },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._handle = null;
    this._token = 0;
    this._parentDrawer = null; // drawer cha đang bị đẩy bởi drawer này
    this._pushCount = 0;       // số drawer con đang mở
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  show() { this.open = true; }
  hide() { this.open = false; }
  toggle() { this.open = !this.open; }

  get _hasMask() {
    return this.mask !== 'false';
  }

  // =====================================================
  // RENDER
  // =====================================================

  render() {
    const titleId = `hui-drawer-title-${++uid}`;

    this._closeBtn = createElement('button', { type: 'button', className: 'close', part: 'close' },
      createElement('hui-icon', { name: 'close' }));
    this._closeBtn.addEventListener('click', () => this._dismiss());

    this._titleText = document.createTextNode('');
    this._headerSlot = createElement('slot', { name: 'header' }, this._titleText);
    this._title = createElement('div', { className: 'title', part: 'title', id: titleId }, this._headerSlot);
    this._extraSlot = createElement('slot', { name: 'extra' });
    this._extra = createElement('div', { className: 'extra', part: 'extra' }, this._extraSlot);
    this._header = createElement('div', { className: 'header', part: 'header' }, this._closeBtn, this._title, this._extra);

    this._body = createElement('div', { className: 'body', part: 'body' }, createElement('slot'));
    this._footerSlot = createElement('slot', { name: 'footer' });
    this._footer = createElement('div', { className: 'footer', part: 'footer', hidden: true }, this._footerSlot);

    for (const slot of [this._headerSlot, this._extraSlot, this._footerSlot]) {
      slot.addEventListener('slotchange', () => this._syncSlots());
    }

    this._panel = createElement('div', { className: 'panel', part: 'panel', tabindex: '-1' },
      this._header, this._body, this._footer);
    this._wrapper = createElement('div', { className: 'wrapper' }, this._panel);
    this._mask = createElement('div', { className: 'mask', part: 'mask' });

    this._dialog = createElement('dialog', { className: 'dialog', part: 'dialog', 'aria-labelledby': titleId },
      this._mask, this._wrapper);
    this._mask.addEventListener('click', (e) => {
      // Click lên message/notification nổi phía trên (bị inert) rơi xuống mask → bỏ qua
      if (isPointOnToast(e)) return;
      if (this.maskClosable !== 'false') this._dismiss();
    });

    // Esc do overlay manager xử lý; 'cancel' native (nút Back Android...) đi cùng đường đó
    this._dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      if (this._handle?.isTop() && this.keyboard !== 'false') this._dismiss();
    });

    return this._dialog;
  }

  connectedCallback() {
    const reconnect = this._mounted;
    super.connectedCallback();
    // Chặn hành vi Esc mặc định của <dialog> (đóng ngay, bỏ qua thứ tự lớp)
    this.listen(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this._isShown()) e.preventDefault();
    }, { capture: true });
    // Gắn lại vào trang khi đang mở
    if (reconnect && this.open && !this._handle) this._show();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._token++;
    this._release();
  }

  updated(changed) {
    if (changed.has('title')) this._titleText.data = this.title || '';

    if (changed.has('placement') || changed.has('size')) {
      const placement = PLACEMENTS.includes(this.placement) ? this.placement : 'right';
      this._placement = placement;
      const size = String(this.size || 'default').trim();
      const preset = size === 'large' || size === 'default';
      this._wrapper.className = [
        'wrapper', `wrapper--${placement}`, size === 'large' ? 'wrapper--large' : '',
        this._pushCount ? 'wrapper--pushed' : '',
      ].filter(Boolean).join(' ');
      if (preset) this._wrapper.style.removeProperty('--_drawer-size-attr');
      else this._wrapper.style.setProperty('--_drawer-size-attr', /^\d+(\.\d+)?$/.test(size) ? `${size}px` : size);
    }

    if (changed.has('mask')) this._mask.hidden = !this._hasMask;
    if (changed.has('closable')) this._closeBtn.hidden = this.closable === 'false';
    if (changed.has('locale')) this._closeBtn.setAttribute('aria-label', t('common.close'));
    if (changed.has('title') || changed.has('closable')) this._syncSlots();

    if (changed.has('open')) {
      const first = !this._mounted;
      if (this.open) {
        // Lần đầu đã có sẵn open: đợi 1 frame cho slot/layout ổn định
        if (first) requestAnimationFrame(() => this.open && this._show());
        else this._show();
      } else if (!first) this._hide();
      if (!first) this.emit(this.open ? 'hui-open' : 'hui-close');
    }
  }

  firstUpdated() {
    this._mounted = true;
    this._syncSlots();
  }

  _syncSlots() {
    if (!this._header) return;
    const hasTitle = Boolean(this.title) || hasNodes(this._headerSlot);
    const hasExtra = hasNodes(this._extraSlot);
    this._extra.hidden = !hasExtra;
    this._header.hidden = !hasTitle && !hasExtra && this.closable === 'false';
    this._footer.hidden = !hasNodes(this._footerSlot);
  }

  // =====================================================
  // MỞ / ĐÓNG
  // =====================================================

  _isShown() {
    const dlg = this._dialog;
    return dlg.open || (supportsPopover && dlg.matches(':popover-open'));
  }

  /** Người dùng muốn đóng (X, Esc, mask) → hui-cancel có thể bị chặn */
  _dismiss() {
    if (!this.open) return;
    if (this.emit('hui-cancel', null, { cancelable: true })) this.hide();
  }

  _showDialog() {
    const dlg = this._dialog;
    if (this._isShown()) return;
    if (this._hasMask && typeof dlg.showModal === 'function') {
      dlg.showModal();
    } else if (supportsPopover) {
      dlg.setAttribute('popover', 'manual');
      dlg.showPopover();
    } else {
      dlg.setAttribute('open', '');
    }
  }

  _closeDialog() {
    const dlg = this._dialog;
    if (supportsPopover && dlg.matches(':popover-open')) dlg.hidePopover();
    if (dlg.open) dlg.close();
    dlg.removeAttribute('open');
    dlg.removeAttribute('popover');
  }

  /** Drawer cha (light DOM) đang mở → đẩy nó lùi vào */
  _findParentDrawer() {
    for (let n = this.parentNode; n; n = n.parentNode || n.host) {
      if (n instanceof HuiDrawer && n.open) return n;
    }
    return null;
  }

  _setPushed(on) {
    this._pushCount = Math.max(0, this._pushCount + (on ? 1 : -1));
    this._wrapper.classList.toggle('wrapper--pushed', this._pushCount > 0);
  }

  _show() {
    if (!this.isConnected) return;
    this._token++;
    const modal = this._hasMask;
    if (!this._handle) {
      this._handle = openOverlay({
        element: this._panel,
        trapFocus: modal,
        lockScroll: modal,
        restoreFocus: true,
        onEscape: () => { if (this.keyboard !== 'false') this._dismiss(); },
      });
      // mask="false": không trap focus nên overlay không tự focus → focus panel để Esc / Tab hoạt động ngay
      if (!modal) requestAnimationFrame(() => this._panel.focus({ preventScroll: true }));
    }
    if (!this._parentDrawer) {
      this._parentDrawer = this._findParentDrawer();
      this._parentDrawer?._setPushed(true);
    }
    this._showDialog();
    this.setState('open', true);
    this._panel.getAnimations?.().forEach((a) => a.cancel());
    if (modal) animateIn(this._mask, 'fade');
    animateIn(this._panel, MOTION[this._placement] || 'move-right');
  }

  async _hide() {
    const token = ++this._token;
    this.setState('open', false);
    this._parentDrawer?._setPushed(false);
    this._parentDrawer = null;

    if (this._isShown()) {
      await Promise.all([
        this._hasMask ? animateOut(this._mask, 'fade') : null,
        animateOut(this._panel, MOTION[this._placement] || 'move-right'),
      ]);
      if (token !== this._token) return; // đã mở lại trong lúc đang đóng
      this._closeDialog();
      for (const el of [this._mask, this._panel]) el.getAnimations?.().forEach((a) => a.cancel());
    }

    // Đóng overlay SAU khi dialog đóng: trang hết inert nên trả focus được
    this._handle?.close();
    this._handle = null;
    this.emit('hui-after-close');
  }

  /** Bị tháo khỏi trang khi đang mở: trả lại overlay stack, khóa cuộn, trạng thái push */
  _release() {
    this._handle?.close();
    this._handle = null;
    this._parentDrawer?._setPushed(false);
    this._parentDrawer = null;
  }
}

defineElement('hui-drawer', HuiDrawer);

export default HuiDrawer;
