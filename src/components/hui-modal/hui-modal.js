/**
 * HUI Modal — Hộp thoại (Ant Modal + MUI Dialog)
 * Hiển thị trên top-layer bằng <dialog>.showModal() → luôn nằm trên mọi z-index.
 * Esc / click mask / focus trap / khóa cuộn / trả focus: utils/overlay.js (chỉ lớp trên cùng nhận Esc).
 * Parts: dialog, mask, panel, header, title, close, body, footer, ok-button, cancel-button
 * Slots: (mặc định) nội dung, title, footer (thay cụm nút mặc định)
 * Events: hui-open, hui-close, hui-ok (cancelable), hui-cancel (cancelable)
 * Biến CSS: xem đầu hui-modal.css.
 */

import styles from './hui-modal.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { openOverlay } from '../../utils/overlay.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import '../hui-icon/hui-icon.js';
import '../hui-button/hui-button.js';

const SIZES = ['sm', 'md', 'lg', 'full'];
let uid = 0;

/**
 * @fires hui-open - Modal vừa mở (không phát khi render lần đầu với sẵn attribute open)
 * @fires hui-close - Modal vừa đóng
 * @fires hui-ok - Bấm nút OK mặc định. Cancelable: preventDefault() để giữ modal mở
 * @fires hui-cancel - Bấm Hủy / nút X / Esc / click mask. Cancelable: preventDefault() để giữ modal mở
 * @slot - Nội dung body
 * @slot title - Tiêu đề tùy biến (thay attribute title)
 * @slot footer - Footer tùy biến (thay cụm nút OK / Hủy mặc định)
 * @csspart dialog - Thẻ <dialog> phủ toàn màn hình
 * @csspart mask - Lớp phủ nền tối
 * @csspart panel - Khung hộp thoại
 * @csspart header - Vùng tiêu đề
 * @csspart title - Tiêu đề
 * @csspart close - Nút đóng X
 * @csspart body - Vùng nội dung
 * @csspart footer - Vùng nút hành động
 * @csspart ok-button - Nút OK mặc định (hui-button)
 * @csspart cancel-button - Nút Hủy mặc định (hui-button)
 * @cssprop --hui-modal-width - Chiều rộng (ghi đè size)
 * @cssprop --hui-modal-max-height - Chiều cao tối đa
 * @cssprop --hui-modal-bg - Nền hộp thoại
 * @cssprop --hui-modal-color - Màu chữ nội dung
 * @cssprop --hui-modal-radius - Bo góc
 * @cssprop --hui-modal-shadow - Đổ bóng
 * @cssprop --hui-modal-border-color - Đường kẻ header/footer
 * @cssprop --hui-modal-mask-bg - Nền lớp phủ
 * @cssprop --hui-modal-gutter - Khoảng cách tới mép màn hình
 * @cssprop --hui-modal-header-padding - Padding header
 * @cssprop --hui-modal-body-padding - Padding body
 * @cssprop --hui-modal-footer-padding - Padding footer
 * @cssprop --hui-modal-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-modal-title-color - Màu tiêu đề
 */
class HuiModal extends HuiElement {
  static properties = {
    /** Trạng thái mở. Đọc bằng `isOpen` (vì `open()` là method) */
    open: { type: Boolean },
    /** Tiêu đề (hoặc dùng slot="title") */
    title: { type: String },
    /** sm | md | lg | full */
    size: { type: String, default: 'md' },
    /** 'false' = không có nút X, Esc và click mask không đóng */
    closable: { type: String, default: 'true' },
    /** 'false' = click mask không đóng */
    closeOnOverlay: { type: String, default: 'true' },
    /** Chữ nút OK mặc định (mặc định theo locale: modal.ok) */
    okText: { type: String },
    /** Chữ nút Hủy mặc định (mặc định theo locale: modal.cancel) */
    cancelText: { type: String },
    /** Ẩn hẳn vùng footer */
    noFooter: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._handle = null; // handle của overlay manager khi đang mở
    this._token = 0;     // tăng mỗi lần mở/đóng → bỏ qua animation cũ khi bấm liên tục
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  /** Mở modal (giữ API cũ: method, không phải property) */
  open() {
    this._setProp('open', true);
  }

  /** Đóng modal (không phát hui-cancel) */
  close() {
    this._setProp('open', false);
  }

  get isOpen() {
    return this._props.open;
  }

  get _closable() {
    return this.closable !== 'false';
  }

  // =====================================================
  // RENDER
  // =====================================================

  render() {
    const titleId = `hui-modal-title-${++uid}`;

    this._titleText = document.createTextNode('');
    this._title = createElement('h2', { className: 'title', part: 'title', id: titleId },
      createElement('slot', { name: 'title' }, this._titleText));

    this._closeBtn = createElement('button', { type: 'button', className: 'close', part: 'close' },
      createElement('hui-icon', { name: 'close' }));
    this._closeBtn.addEventListener('click', () => this._dismiss());

    const header = createElement('div', { className: 'header', part: 'header' }, this._title, this._closeBtn);
    const body = createElement('div', { className: 'body', part: 'body' }, createElement('slot'));

    // Nút mặc định = nội dung fallback của slot footer (người dùng đặt slot="footer" là thay hết)
    this._cancelBtn = createElement('hui-button', { variant: 'ghost', part: 'cancel-button' });
    this._okBtn = createElement('hui-button', { variant: 'primary', part: 'ok-button' });
    this._cancelBtn.addEventListener('hui-click', () => this._dismiss());
    this._okBtn.addEventListener('hui-click', () => {
      if (this.emit('hui-ok', null, { cancelable: true })) this.close();
    });
    this._footer = createElement('div', { className: 'footer', part: 'footer' },
      createElement('slot', { name: 'footer' }, this._cancelBtn, this._okBtn));

    this._panel = createElement('div', { className: 'panel', part: 'panel', tabindex: '-1' }, header, body, this._footer);
    this._mask = createElement('div', { className: 'mask', part: 'mask' });

    this._dialog = createElement('dialog', { className: 'dialog', part: 'dialog', 'aria-labelledby': titleId },
      this._mask, createElement('div', { className: 'wrap' }, this._panel));

    // Esc do overlay manager xử lý; 'cancel' native (nút Back trên Android...) đi cùng đường đó
    this._dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      if (this._handle?.isTop()) this._dismiss();
    });
    // Trình duyệt tự đóng dialog (vd: chống lạm dụng chặn Esc) → đồng bộ lại trạng thái
    this._dialog.addEventListener('close', () => {
      if (!this._props.open) return;
      if (this._closable) this.close();
      else this._showDialog();
    });

    return this._dialog;
  }

  connectedCallback() {
    super.connectedCallback();
    // Chặn hành vi Esc mặc định của <dialog> (đóng ngay, bỏ qua closable và thứ tự lớp)
    this.listen(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this._dialog.open) e.preventDefault();
    }, { capture: true });
    // Gắn lại vào trang khi đang mở
    if (this._props.open && !this._handle) this._show();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Bị tháo khỏi trang: dialog tự rời top-layer → trả lại overlay stack + khóa cuộn
    this._token++;
    this._handle?.close();
    this._handle = null;
  }

  updated(changed) {
    if (changed.has('title')) this._titleText.data = this.title || '';

    if (changed.has('size')) {
      const size = SIZES.includes(this.size) ? this.size : 'md';
      this._panel.className = `panel panel--${size}`;
    }

    if (changed.has('closable')) this._closeBtn.hidden = !this._closable;
    if (changed.has('noFooter')) this._footer.hidden = this.noFooter;

    if (changed.has('okText') || changed.has('cancelText') || changed.has('locale')) {
      this._okBtn.textContent = this.okText || t('modal.ok');
      this._cancelBtn.textContent = this.cancelText || t('modal.cancel');
      this._closeBtn.setAttribute('aria-label', t('common.close'));
    }

    if (changed.has('open')) {
      const first = !this._mounted;
      if (this._props.open) this._show();
      else if (!first) this._hide();
      // Giữ hành vi cũ: không phát sự kiện ở lần render đầu
      if (!first) this.emit(this._props.open ? 'hui-open' : 'hui-close');
    }
  }

  firstUpdated() {
    this._mounted = true;
  }

  // =====================================================
  // MỞ / ĐÓNG
  // =====================================================

  /** Người dùng muốn đóng (X, Hủy, Esc, mask) → hui-cancel có thể bị chặn */
  _dismiss() {
    if (!this._props.open) return;
    if (this.emit('hui-cancel', null, { cancelable: true })) this.close();
  }

  _showDialog() {
    const dlg = this._dialog;
    if (dlg.open) return;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  _show() {
    if (!this.isConnected) return;
    this._token++;
    // Mở overlay TRƯỚC showModal để overlay ghi nhớ đúng phần tử đang focus (trả focus khi đóng)
    if (!this._handle) {
      this._handle = openOverlay({
        element: this._panel,
        trapFocus: true,
        lockScroll: true,
        restoreFocus: true,
        onEscape: () => { if (this._closable) this._dismiss(); },
        onClickOutside: () => {
          if (this._closable && this.closeOnOverlay !== 'false') this._dismiss();
        },
      });
    }
    this._showDialog();
    this.setState('open', true);
    animateIn(this._mask, 'fade');
    animateIn(this._panel, 'zoom');
  }

  async _hide() {
    const token = ++this._token;
    this.setState('open', false);
    const dlg = this._dialog;

    if (dlg.open) {
      await Promise.all([animateOut(this._mask, 'fade'), animateOut(this._panel, 'zoom')]);
      if (token !== this._token) return; // đã mở lại trong lúc đang đóng
      dlg.close();
      dlg.removeAttribute('open');
      // animateOut giữ khung cuối (fill: forwards) → hủy để lần mở sau không bị kẹt ở trạng thái ẩn
      for (const el of [this._mask, this._panel]) el.getAnimations?.().forEach((a) => a.cancel());
    }

    // Đóng overlay SAU khi dialog đóng: lúc này trang hết inert nên trả focus được
    this._handle?.close();
    this._handle = null;
  }
}

defineElement('hui-modal', HuiModal);

export default HuiModal;
