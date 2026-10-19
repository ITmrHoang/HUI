/**
 * HUI Popconfirm — Hộp xác nhận nhỏ bật ra cạnh nút (Ant Popconfirm)
 *   <hui-popconfirm title="Xóa mục này?" @hui-confirm=${(e) => e.detail.waitUntil(api.delete())}>
 *     <hui-button variant="danger">Xóa</hui-button>
 *   </hui-popconfirm>
 * Xây trên hui-popover (trigger="click"): Esc / click ra ngoài để đóng, định vị 12 hướng.
 * Biến CSS: xem đầu hui-popconfirm.css (+ --hui-popover-*).
 */

import styles from './hui-popconfirm.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-popover/hui-popover.js';
import '../hui-button/hui-button.js';
import '../hui-icon/hui-icon.js';

/** Slot có nội dung thật (bỏ qua text chỉ toàn khoảng trắng) */
const hasNodes = (slot) => slot.assignedNodes({ flatten: true }).some(
  (n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim() !== ''
);

/**
 * @fires hui-confirm - Bấm OK. Cancelable: preventDefault() để giữ mở. detail: { waitUntil(promise) } —
 *   gọi đồng bộ trong listener: nút OK loading tới khi promise resolve rồi mới đóng (reject → giữ mở)
 * @fires hui-cancel - Bấm Hủy
 * @fires open-change - Mở/đóng (phát từ hui-popover bên trong). detail: { open }
 * @slot - Phần tử kích hoạt
 * @slot title - Tiêu đề HTML (thay attribute title)
 * @slot description - Mô tả HTML (thay attribute description)
 * @slot icon - Icon tùy biến (thay attribute icon)
 * @csspart popover - hui-popover bên trong
 * @csspart popup - Khung nổi (xuất từ hui-popover)
 * @csspart arrow - Mũi tên (xuất từ hui-popover)
 * @csspart body - Vùng icon + chữ
 * @csspart icon - Icon
 * @csspart title - Tiêu đề
 * @csspart description - Mô tả
 * @csspart actions - Vùng nút
 * @csspart ok-button - Nút OK (hui-button)
 * @csspart cancel-button - Nút Hủy (hui-button)
 * @cssprop --hui-popconfirm-icon-color - Màu icon (mặc định màu cảnh báo)
 * @cssprop --hui-popconfirm-max-width - Chiều rộng tối đa phần nội dung (320px)
 */
class HuiPopconfirm extends HuiElement {
  static properties = {
    /** Tiêu đề câu hỏi. Attribute bị gỡ khỏi host để không hiện tooltip native */
    title: { type: String, reflect: false },
    /** Mô tả thêm dưới tiêu đề */
    description: { type: String },
    /** Chữ nút OK (mặc định locale popconfirm.ok) */
    okText: { type: String },
    /** Chữ nút Hủy (mặc định locale popconfirm.cancel) */
    cancelText: { type: String },
    /** Variant của nút OK (xem hui-button): primary | danger | ... */
    okType: { type: String, default: 'primary' },
    /** 'false' = ẩn nút Hủy */
    showCancel: { type: String, default: 'true' },
    /** Tên icon (hui-icon), mặc định warning; 'none' = ẩn icon */
    icon: { type: String, default: 'warning' },
    /** Vị trí (12 hướng, như hui-popover) */
    placement: { type: String, default: 'top' },
    /** Trạng thái mở (controlled), tự phản chiếu khi mở/đóng */
    open: { type: Boolean },
    /** Không bật hộp xác nhận */
    disabled: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  // =====================================================
  // PUBLIC API
  // =====================================================

  show() { this._popover.show(); }
  hide() { this._popover.hide(); }

  // =====================================================
  // RENDER
  // =====================================================

  render() {
    this._icon = createElement('hui-icon', { name: 'warning' });
    this._iconSlot = createElement('slot', { name: 'icon' }, this._icon);
    this._iconWrap = createElement('span', { className: 'icon', part: 'icon' }, this._iconSlot);

    this._titleText = document.createTextNode('');
    this._titleSlot = createElement('slot', { name: 'title' }, this._titleText);
    this._title = createElement('div', { className: 'title', part: 'title' }, this._titleSlot);

    this._descText = document.createTextNode('');
    this._descSlot = createElement('slot', { name: 'description' }, this._descText);
    this._desc = createElement('div', { className: 'description', part: 'description' }, this._descSlot);

    for (const slot of [this._titleSlot, this._descSlot, this._iconSlot]) {
      slot.addEventListener('slotchange', () => this._syncSlots());
    }

    this._cancelBtn = createElement('hui-button', { size: 'sm', variant: 'outline', part: 'cancel-button' });
    this._okBtn = createElement('hui-button', { size: 'sm', variant: 'primary', part: 'ok-button' });
    this._cancelBtn.addEventListener('hui-click', () => this._cancel());
    this._okBtn.addEventListener('hui-click', () => this._confirm());

    const content = createElement('div', { slot: 'content' },
      createElement('div', { className: 'body', part: 'body' },
        this._iconWrap,
        createElement('div', { className: 'text' }, this._title, this._desc)),
      createElement('div', { className: 'actions', part: 'actions' }, this._cancelBtn, this._okBtn));

    this._popover = createElement('hui-popover', {
      trigger: 'click', part: 'popover', exportparts: 'popup, arrow, inner',
    }, createElement('slot'), content);

    // Đồng bộ trạng thái mở do người dùng (click / Esc / click ngoài) về attribute open
    this._popover.addEventListener('open-change', (e) => {
      if (e.target === this._popover) this._setProp('open', e.detail.open);
    });

    return this._popover;
  }

  /** Alias `title`: lưu nội dung rồi gỡ attribute khỏi host (tránh tooltip native chồng lên) */
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'title') {
      if (newVal === null) return;
      super.attributeChangedCallback(name, oldVal, newVal);
      this.removeAttribute('title');
      return;
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }

  updated(changed) {
    if (changed.has('title')) this._titleText.data = this.title || '';
    if (changed.has('description')) this._descText.data = this.description || '';
    if (changed.has('icon')) {
      const none = !this.icon || this.icon === 'none' || this.icon === 'false';
      this._icon.hidden = none;
      if (!none) this._icon.setAttribute('name', this.icon);
    }
    if (changed.has('okType')) this._okBtn.setAttribute('variant', this.okType || 'primary');
    if (changed.has('showCancel')) this._cancelBtn.hidden = this.showCancel === 'false';
    if (changed.has('okText') || changed.has('cancelText') || changed.has('locale')) {
      this._okBtn.textContent = this.okText || t('popconfirm.ok');
      this._cancelBtn.textContent = this.cancelText || t('popconfirm.cancel');
    }
    if (changed.has('placement')) this._popover.setAttribute('placement', this.placement || 'top');
    if (changed.has('disabled')) this._popover.disabled = this.disabled;
    if (changed.has('open')) this._popover.open = this.open;
    this._syncSlots();
  }

  _syncSlots() {
    this._title.hidden = !this.title && !hasNodes(this._titleSlot);
    this._desc.hidden = !this.description && !hasNodes(this._descSlot);
    const noIcon = this._icon.hidden && !hasNodes(this._iconSlot);
    this._iconWrap.hidden = noIcon;
  }

  // =====================================================
  // XỬ LÝ NÚT
  // =====================================================

  async _confirm() {
    if (this._busy) return;
    let pending = null;
    const detail = {
      /** Gọi đồng bộ trong listener: giữ hộp mở + nút OK loading tới khi promise xong */
      waitUntil: (promise) => { pending = Promise.resolve(promise); },
    };
    if (!this.emit('hui-confirm', detail, { cancelable: true })) return;

    if (pending) {
      this._busy = true;
      this._okBtn.loading = true;
      try {
        await pending;
      } catch {
        // Promise bị reject → giữ mở để người dùng thử lại
        return;
      } finally {
        this._busy = false;
        this._okBtn.loading = false;
      }
    }
    this.hide();
  }

  _cancel() {
    if (this._busy) return;
    this.emit('hui-cancel');
    this.hide();
  }
}

defineElement('hui-popconfirm', HuiPopconfirm);

export default HuiPopconfirm;
