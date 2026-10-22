/**
 * HUI Tag — Nhãn / Chip (Ant Tag + CheckableTag + MUI Chip). `hui-chip` được gộp vào đây (không có thẻ riêng):
 * color: preset (primary, success...) hoặc mã màu CSS bất kỳ · variant: soft | filled | outlined
 * avatar (ảnh hoặc chữ viết tắt qua hui-avatar) · clickable (nút) · toggle + selected (nút bật/tắt, aria-pressed)
 * Parts: base, avatar, icon, label, close · Slots: (mặc định), icon, avatar
 * Events: click (native), change { checked } | { selected }, close { originalEvent } (cancelable)
 * Biến CSS: xem đầu hui-tag.css
 */

import styles from './hui-tag.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animateOut } from '../../utils/motion.js';
import '../hui-icon/hui-icon.js';
import '../hui-avatar/hui-avatar.js';

const PRESET_COLORS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];
const VARIANTS = ['soft', 'filled', 'outlined'];
const SIZES = ['sm', 'md', 'lg'];
const SHAPES = ['rounded', 'pill', 'square'];

/** Chuỗi trông như đường dẫn ảnh (URL, data:, đuôi ảnh) → dùng làm src; còn lại là tên → chữ viết tắt */
const isImageSrc = (v) => /^(data:|blob:|https?:|\/|\.\.?\/)/i.test(v) || /\.(png|jpe?g|gif|webp|avif|svg)([?#].*)?$/i.test(v);

/** Giá trị không hợp lệ → mặc định */
const pick = (value, list, fallback) => (list.includes(value) ? value : fallback);

/**
 * @fires click - Click (native), hoặc Enter/Space trên tag clickable/checkable. Không phát khi disabled
 * @fires change - Tag checkable được bật/tắt (detail: { checked }) hoặc chip toggle đổi selected (detail: { selected })
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
    /** Ảnh avatar phía trước (URL / data URI) hoặc tên → chữ viết tắt (hui-avatar). Slot avatar thắng attribute này */
    avatar: { type: String },
    /** Tag hoạt động như nút bấm (role="button") */
    clickable: { type: Boolean },
    /** Chip bật/tắt: click / Enter / Space đảo `selected` (cần clickable) */
    toggle: { type: Boolean },
    /** Đang được chọn (chip clickable → aria-pressed, nền đặc + icon ✓ khi không có icon/avatar) */
    selected: { type: Boolean },
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
    // Avatar theo attribute (ảnh / chữ viết tắt) là nội dung dự phòng của slot avatar; chỉ trang trí → aria-hidden
    this._avatarEl = createElement('hui-avatar', { 'aria-hidden': 'true' });
    this._avatarSlot.append(this._avatarEl);
    this._avatar = createElement('span', { className: 'hui-tag__avatar', part: 'avatar' }, this._avatarSlot);

    // slot="icon" thay được icon mặc định (lấy theo attribute icon)
    this._iconEl = createElement('hui-icon', {});
    this._iconSlot = createElement('slot', { name: 'icon' }, this._iconEl);
    this._icon = createElement('span', { className: 'hui-tag__icon', part: 'icon' }, this._iconSlot);

    this._avatarSlot.addEventListener('slotchange', () => this._syncSlots());
    this._iconSlot.addEventListener('slotchange', () => this._syncSlots());

    const label = createElement('span', { className: 'hui-tag__label', part: 'label' }, createElement('slot'));

    // × là span (không phải <button>): trong tag tương tác (role=button/checkbox) nó không được focus được
    // để tránh control lồng nhau; tag tĩnh → updated() gán role=button + tabindex
    this._close = createElement('span', { className: 'hui-tag__close', part: 'close' },
      createElement('hui-icon', { name: 'close', className: 'hui-tag__close-icon' }));
    this._close.addEventListener('click', (e) => {
      // Bấm × không tính là click / toggle của tag
      e.stopPropagation();
      this.close(e);
    });
    this._close.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
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
    // Chip chọn được (checkable / toggle / selected) mặc định màu primary
    const choosable = this.checkable || (this.clickable && (this.toggle || this.selected)) || this.selected;
    const color = (this.color || '').trim() || (choosable ? 'primary' : '');
    const interactive = this.clickable || this.checkable;
    const checked = this.checkable && this.checked;
    const selected = !this.checkable && this.selected;
    // Nút bật/tắt (APG toggle button): clickable + (toggle hoặc đang selected)
    const pressable = this.clickable && !this.checkable && (this.toggle || this.selected);

    base.className = [
      'hui-tag',
      `hui-tag--${variant}`,
      `hui-tag--${size}`,
      `hui-tag--${shape}`,
      color ? '' : 'hui-tag--default',
      this.clickable ? 'hui-tag--clickable' : '',
      this.checkable ? 'hui-tag--checkable' : '',
      checked ? 'hui-tag--checked' : '',
      selected ? 'hui-tag--selected' : '',
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

    if (pressable) base.setAttribute('aria-pressed', String(selected));
    else base.removeAttribute('aria-pressed');

    if (interactive) base.tabIndex = this.disabled ? -1 : 0;
    else base.removeAttribute('tabindex');
    // Cả tag tĩnh cũng báo aria-disabled: trình đọc màn hình biết trạng thái, công cụ kiểm tra tương phản bỏ qua (chữ mờ 50%)
    if (this.disabled) base.setAttribute('aria-disabled', 'true');
    else base.removeAttribute('aria-disabled');

    // Nút ×: tag tương tác đã focus được → × chỉ để bấm chuột, ẩn khỏi cây a11y, không focus được
    // (xóa bằng Backspace/Delete); tag tĩnh → × là nút (role=button) và là điểm focus duy nhất
    this._close.hidden = !this.closable;
    if (interactive) {
      this._close.removeAttribute('role');
      this._close.removeAttribute('tabindex');
      this._close.removeAttribute('aria-disabled');
      this._close.setAttribute('aria-hidden', 'true');
    } else {
      this._close.setAttribute('role', 'button');
      this._close.tabIndex = this.disabled ? -1 : 0;
      if (this.disabled) this._close.setAttribute('aria-disabled', 'true');
      else this._close.removeAttribute('aria-disabled');
      this._close.removeAttribute('aria-hidden');
    }
    if (changed.has('locale') || !this._close.hasAttribute('aria-label')) {
      this._close.setAttribute('aria-label', t('common.close'));
    }

    if (changed.has('avatar')) {
      const v = (this.avatar || '').trim();
      const isSrc = v && isImageSrc(v);
      if (isSrc) this._avatarEl.setAttribute('src', v);
      else this._avatarEl.removeAttribute('src');
      if (v && !isSrc) this._avatarEl.setAttribute('name', v);
      else this._avatarEl.removeAttribute('name');
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
    } else if (this.clickable && this.toggle) {
      this.selected = !this.selected;
      this.emit('change', { selected: this.selected });
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

  /** Ẩn vùng icon/avatar khi trống (tránh gap thừa); chip selected không có icon/avatar → icon ✓ (MUI filter chip) */
  _syncSlots() {
    if (!this._base) return;
    const hasIconSlot = this._iconSlot.assignedNodes().length > 0;
    const hasAvatar = this._avatarSlot.assignedNodes().length > 0 || Boolean((this.avatar || '').trim());
    const autoCheck = this.selected && !this.checkable && !this.icon && !hasIconSlot && !hasAvatar;
    const iconName = this.icon || (autoCheck ? 'check' : '');
    if (iconName) {
      if (this._iconEl.getAttribute('name') !== iconName) this._iconEl.setAttribute('name', iconName);
    } else this._iconEl.removeAttribute('name');
    this._base.classList.toggle('hui-tag--has-icon', hasIconSlot || Boolean(iconName));
    this._base.classList.toggle('hui-tag--has-avatar', hasAvatar);
  }

  focus(options) {
    const target = this.clickable || this.checkable ? this._base : this.closable ? this._close : null;
    target ? target.focus(options) : super.focus(options);
  }
}

defineElement('hui-tag', HuiTag);

export default HuiTag;
