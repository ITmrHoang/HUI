/**
 * HUI Avatar Group — Nhóm avatar xếp chồng (Ant Avatar.Group + MUI AvatarGroup). Xem JSDoc của class.
 */

import styles from './hui-avatar-group.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { AVATAR_SHAPES, avatarSizeValue } from './hui-avatar.js';

/**
 * Xếp chồng các <hui-avatar> con; `max` gộp phần tràn thành avatar "+N".
 * size / shape truyền xuống avatar con chưa tự đặt qua biến CSS nội bộ (kế thừa xuyên slot).
 *
 * @slot - Danh sách các <hui-avatar>
 * @csspart base - Khung xếp chồng (role="group")
 * @csspart surplus - Avatar "+N"
 * @csspart surplus-base - Part `base` của avatar "+N" (nền, màu chữ)
 * @cssprop --hui-avatar-group-spacing - Độ chồng lấn giữa các avatar (ghi đè attribute spacing)
 * @cssprop --hui-avatar-group-hover-lift - Độ nhấc avatar khi hover (2px)
 */
class HuiAvatarGroup extends HuiElement {
  static properties = {
    /** Số avatar hiển thị tối đa, phần còn lại gộp thành "+N" */
    max: { type: Number },
    /** sm | md | lg | xl hoặc số px — áp cho avatar con chưa tự đặt size */
    size: { type: String },
    /** Mức chồng lấn: sm | md | lg */
    spacing: { type: String, default: 'md' },
    /** circle | square | rounded — áp cho avatar con chưa tự đặt shape */
    shape: { type: String },
  };

  static styles = styles;

  render() {
    // Chỉ gỡ `hidden` trên avatar do group tự ẩn, không đụng avatar người dùng tự ẩn
    this._hiddenByGroup = new WeakSet();

    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncOverflow());
    this._surplus = createElement('hui-avatar', {
      className: 'hui-avatar-group__surplus',
      part: 'surplus',
      exportparts: 'base: surplus-base',
      color: 'secondary',
      hidden: true,
    });
    this._base = createElement('div', { part: 'base', role: 'group' }, this._slot, this._surplus);
    return this._base;
  }

  updated(changed) {
    const base = this._base;

    if (changed.has('spacing')) {
      const spacing = ['sm', 'md', 'lg'].includes(this.spacing) ? this.spacing : 'md';
      base.className = `hui-avatar-group hui-avatar-group--spacing-${spacing}`;
    }

    // Đặt trên khung bên trong (cha của slot) → avatar con và "+N" kế thừa, không đụng style của host
    if (changed.has('size')) {
      const v = avatarSizeValue(this.size);
      if (v) base.style.setProperty('--_avatar-group-size', v);
      else base.style.removeProperty('--_avatar-group-size');
    }
    if (changed.has('shape')) {
      if (AVATAR_SHAPES[this.shape]) base.style.setProperty('--_avatar-group-radius', AVATAR_SHAPES[this.shape]);
      else base.style.removeProperty('--_avatar-group-radius');
    }

    if (changed.has('max')) this._syncOverflow();
  }

  /** Ẩn con vượt quá `max` bằng `hidden`, cập nhật avatar "+N" */
  _syncOverflow() {
    if (!this._base) return;
    const max = Number.isFinite(this.max) && this.max > 0 ? Math.floor(this.max) : Infinity;

    let surplus = 0;
    Array.from(this.children).forEach((child, index) => {
      if (index >= max) {
        if (!child.hidden) {
          child.hidden = true;
          this._hiddenByGroup.add(child);
        }
        surplus++;
      } else if (this._hiddenByGroup.has(child)) {
        child.hidden = false;
        this._hiddenByGroup.delete(child);
      }
    });

    this._surplus.hidden = surplus === 0;
    if (surplus > 0) {
      this._surplus.textContent = `+${surplus}`;
      this._surplus.setAttribute('alt', `Và ${surplus} người khác`);
    }
  }
}

defineElement('hui-avatar-group', HuiAvatarGroup);

export default HuiAvatarGroup;
