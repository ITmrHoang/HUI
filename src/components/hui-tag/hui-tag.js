/**
 * HUI Tag — Nhãn / Chip (Ant Tag + CheckableTag + MUI Chip)
 * color: preset (primary, success...) hoặc mã màu CSS bất kỳ · variant: soft | filled | outlined
 * Parts: base, avatar, icon, label, close · Slots: (mặc định), icon, avatar
 * Events: click (native), change { checked }, close { originalEvent } (cancelable)
 * Biến CSS: xem đầu hui-tag.css
 */

import styles from './hui-tag.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animateOut } from '../../utils/motion.js';
import '../hui-icon/hui-icon.js';

const PRESET_COLORS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];
const VARIANTS = ['soft', 'filled', 'outlined'];
const SIZES = ['sm', 'md', 'lg'];
const SHAPES = ['rounded', 'pill', 'square'];

/** Giá trị không hợp lệ → mặc định */
const pick = (value, list, fallback) => (list.includes(value) ? value : fallback);

/**
 * @fires click - Click (native), hoặc Enter/Space trên tag clickable/checkable. Không phát khi disabled
 * @fires change - Tag checkable được bật/tắt. detail: { checked }
 * @fires close - Bấm × / Backspace / Delete. Cancelable: preventDefault() để giữ tag. detail: { originalEvent }
 * @slot - Nội dung nhãn
 * @slot icon - Icon phía trước (thay cho attribute icon)
 * @slot avatar - Avatar tròn phía trước (MUI Chip avatar)
 * @csspart base - Khung tag
 * @csspart avatar - Vùng avatar
 * @csspart icon - Vùng icon
 * @csspart label - Vùng chữ
 * @csspart close - Nút đóng ×
 * @cssprop --hui-tag-height - Chiều cao
 * @cssprop --hui-tag-padding-x - Khoảng đệm ngang
 * @cssprop --hui-tag-font-size - Cỡ chữ
 * @cssprop --hui-tag-font-weight - Độ đậm chữ
 * @cssprop --hui-tag-radius - Bo góc
 * @cssprop --hui-tag-gap - Khoảng cách icon, chữ, nút đóng
 * @cssprop --hui-tag-bg - Màu nền
 * @cssprop --hui-tag-color - Màu chữ
 * @cssprop --hui-tag-border-color - Màu viền
 */
class HuiTag extends HuiElement {
  static localized = true;

  static properties = {
    /** primary | secondary | success | warning | danger | info, hoặc mã màu CSS (#f50, rgb(...)) */
    color: { type: String },
    /** soft | filled | outlined */
    variant: { type: String, default: 'soft' },
    /** sm | md | lg (20 / 24 / 32px) */
    size: { type: String, default: 'md' },
    /** rounded | pill | square */
    shape: { type: String, default: 'rounded' },
    /** Tên icon (xem hui-icon) hiển thị trước chữ */
    icon: { type: String },
    /** Hiện nút × để xóa tag (Backspace/Delete khi focus cũng xóa) */
    closable: { type: Boolean },
    /** Tag hoạt động như nút bấm (role="button") */
    clickable: { type: Boolean },
    /** Tag bật/tắt được (Ant CheckableTag, role="checkbox") */
    checkable: { type: Boolean },
    /** Đang được chọn (chỉ có tác dụng khi checkable) */
    checked: { type: Boolean },
    /** Vô hiệu hóa mọi tương tác */
    disabled: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    // Nghe click trên host: bắt cả click chuột lẫn this.click() (từ code hoặc Enter/Space)
    this.addEventListener('click', (e) => this._onHostClick(e));
  }

  render() {
    this._avatarSlot = createElement('slot', { name: 'avatar' });
    this._avatar = createElement('span', { className: 'hui-tag__avatar', part: 'avatar' }, this._avatarSlot);

    // slot="icon" thay được icon mặc định (lấy theo attribute icon)
    this._iconEl = createElement('hui-icon', {});
    this._iconSlot = createElement('slot', { name: 'icon' }, this._iconEl);
    this._icon = createElement('span', { className: 'hui-tag__icon', part: 'icon' }, this._iconSlot);

    this._avatarSlot.addEventListener('slotchange', () => this._syncSlots());
    this._iconSlot.addEventListener('slotchange', () => this._syncSlots());

    const label = createElement('span', { className: 'hui-tag__label', part: 'label' }, createElement('slot'));

    this._close = createElement('button', { type: 'button', className: 'hui-tag__close', part: 'close' },
      createElement('hui-icon', { name: 'close', className: 'hui-tag__close-icon' }));
    this._close.addEventListener('click', (e) => {
      // Bấm × không tính là click / toggle của tag
      e.stopPropagation();
      this.close(e);
    });

    this._base = createElement('span', { part: 'base' }, this._avatar, this._icon, label, this._close);
    this._base.addEventListener('keydown', (e) => this._onKeyDown(e));
    return this._base;
  }

  updated(changed) {
    const base = this._base;
    const variant = pick(this.variant, VARIANTS, 'soft');
    const size = pick(this.size, SIZES, 'md');
    const shape = pick(this.shape, SHAPES, 'rounded');
    const color = (this.color || '').trim() || (this.checkable ? 'primary' : ''); // CheckableTag mặc định primary
    const interactive = this.clickable || this.checkable;
    const checked = this.checkable && this.checked;

    base.className = [
      'hui-tag',
      `hui-tag--${variant}`,
      `hui-tag--${size}`,
      `hui-tag--${shape}`,
      color ? '' : 'hui-tag--default',
      this.clickable ? 'hui-tag--clickable' : '',
      this.checkable ? 'hui-tag--checkable' : '',
      checked ? 'hui-tag--checked' : '',
      this.closable ? 'hui-tag--closable' : '',
      this.disabled ? 'hui-tag--disabled' : '',
    ].filter(Boolean).join(' ');

    // Màu preset → token; giá trị khác → dùng nguyên văn
    if (color) base.style.setProperty('--_tag-color', PRESET_COLORS.includes(color) ? `var(--hui-${color})` : color);
    else base.style.removeProperty('--_tag-color');

    // Vai trò a11y: checkable → checkbox, clickable → button, còn lại là nhãn tĩnh
    if (this.checkable) base.setAttribute('role', 'checkbox');
    else if (this.clickable) base.setAttribute('role', 'button');
    else base.removeAttribute('role');

    if (this.checkable) base.setAttribute('aria-checked', String(checked));
    else base.removeAttribute('aria-checked');

    if (interactive) {
      base.tabIndex = this.disabled ? -1 : 0;
      if (this.disabled) base.setAttribute('aria-disabled', 'true');
      else base.removeAttribute('aria-disabled');
    } else {
      base.removeAttribute('tabindex');
      base.removeAttribute('aria-disabled');
    }

    // Nút ×: tag tương tác đã focus được → × không nhận Tab (xóa bằng Backspace/Delete);
    // tag tĩnh → × là điểm focus duy nhất
    this._close.hidden = !this.closable;
    this._close.disabled = this.disabled;
    this._close.tabIndex = interactive || this.disabled ? -1 : 0;
    if (changed.has('locale') || !this._close.hasAttribute('aria-label')) {
      this._close.setAttribute('aria-label', t('common.close'));
    }

    if (changed.has('icon')) {
      if (this.icon) this._iconEl.setAttribute('name', this.icon);
      else this._iconEl.removeAttribute('name');
    }
    this._syncSlots();
  }

  /**
   * Đóng tag: phát `close` (cancelable) → không bị preventDefault thì chạy hiệu ứng rồi gắn `hidden`.
   * @returns {boolean} true nếu tag sẽ bị ẩn
   */
  close(originalEvent = null) {
    if (this.disabled || this.hidden || this._closing) return false;
    if (!this.emit('close', { originalEvent }, { cancelable: true })) return false;

    this._closing = true;
    const done = () => {
      this.hidden = true;
      this._closing = false;
      // Gỡ trạng thái cuối của animation (fill: forwards) để tag hiện lại bình thường nếu bỏ hidden
      this._base?.getAnimations?.().forEach((a) => a.cancel());
    };
    if (this._base) animateOut(this._base, 'zoom').then(done);
    else done();
    return true;
  }

  _onHostClick(e) {
    if (this.disabled) {
      // Nuốt event để listener bên ngoài không nhận được
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (this.checkable) {
      this.checked = !this.checked;
      this.emit('change', { checked: this.checked });
    }
  }

  _onKeyDown(e) {
    if (this.disabled) return;
    // Enter / Space → click (giống <button>)
    if ((this.clickable || this.checkable) && e.target === this._base && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this.click();
      return;
    }
    // Backspace / Delete → xóa tag (MUI Chip)
    if (this.closable && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
      this.close(e);
    }
  }

  /** Ẩn vùng icon/avatar khi trống (tránh gap thừa) */
  _syncSlots() {
    if (!this._base) return;
    const hasIcon = this._iconSlot.assignedNodes().length > 0 || Boolean(this.icon);
    this._base.classList.toggle('hui-tag--has-icon', hasIcon);
    this._base.classList.toggle('hui-tag--has-avatar', this._avatarSlot.assignedNodes().length > 0);
  }

  focus(options) {
    const target = this.clickable || this.checkable ? this._base : this.closable ? this._close : null;
    target ? target.focus(options) : super.focus(options);
  }
}

defineElement('hui-tag', HuiTag);

export default HuiTag;
