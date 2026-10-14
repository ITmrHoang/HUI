/**
 * HUI Avatar Group — Nhóm avatar xếp chồng lên nhau (Web Component Vanilla JS)
 *
 * Giống Ant Design <Avatar.Group> / MUI <AvatarGroup>:
 * - Các <hui-avatar> con được xếp chồng, mỗi avatar có vòng viền trắng để tách nhau
 * - `max`: chỉ hiện N avatar đầu tiên, phần còn lại gộp thành một avatar "+N"
 * - `size` / `shape`: truyền xuống cho các avatar con chưa tự đặt (qua CSS custom property)
 * - `spacing`: mức độ chồng lấn sm | md | lg
 */

import styles from './hui-avatar-group.css?raw';
import { createElement, createStyle, injectTokens } from '../../utils/dom.js';
import './hui-avatar.js'; // Cần để render avatar "+N" bên trong Shadow DOM

class HuiAvatarGroup extends HTMLElement {
  static get observedAttributes() {
    return ['max', 'size', 'spacing', 'shape'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._wrapper = null;
    this._initialized = false;
    // Danh sách avatar con mà group đã tự ẩn → chỉ gỡ `hidden` trên những phần tử này,
    // không đụng tới avatar mà người dùng tự ẩn.
    this._hiddenByGroup = new WeakSet();
    // Danh sách con ở lần render trước — so sánh để biết có cần tính lại không
    this._lastChildren = [];

    // Khi thêm/bớt/đổi thứ tự avatar con → tính lại số lượng tràn và avatar "+N"
    this.shadowRoot.addEventListener('slotchange', () => {
      // Chỉ render lại khi danh sách con thực sự đổi (render tạo slot mới cũng bắn slotchange)
      const current = Array.from(this.children);
      const changed = current.length !== this._lastChildren.length
        || current.some((child, i) => child !== this._lastChildren[i]);
      if (changed) this._render();
    });
  }

  connectedCallback() {
    // Chỉ tiêm style 1 lần — tránh nhân đôi <style> khi phần tử được gắn lại vào DOM
    if (!this._initialized) {
      injectTokens(this.shadowRoot);
      this.shadowRoot.appendChild(createStyle(styles));
      this._initialized = true;
    }
    this._render();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (this._wrapper) this._render();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Size dạng số (px) không thể viết sẵn trong CSS bằng :host([size="..."]),
   * nên đặt trực tiếp biến --hui-avatar-size lên host để avatar con kế thừa.
   */
  _applyNumericSize() {
    const size = this.getAttribute('size');
    const num = parseFloat(size);
    if (size && !['sm', 'md', 'lg', 'xl'].includes(size) && Number.isFinite(num) && num > 0) {
      this.style.setProperty('--hui-avatar-size', `${num}px`);
    } else {
      this.style.removeProperty('--hui-avatar-size');
    }
  }

  /**
   * Ẩn các avatar vượt quá `max` bằng thuộc tính `hidden`.
   * @returns {number} số avatar bị ẩn (để hiển thị "+N")
   */
  _applyOverflow() {
    const children = Array.from(this.children);
    const maxRaw = parseInt(this.getAttribute('max'), 10);
    // max không hợp lệ hoặc không đủ con để tràn → hiện tất cả
    const max = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : Infinity;

    let surplus = 0;
    children.forEach((child, index) => {
      if (index >= max) {
        if (!child.hidden) {
          child.hidden = true;
          this._hiddenByGroup.add(child);
        }
        surplus++;
      } else if (this._hiddenByGroup.has(child)) {
        // Avatar trước đó do group ẩn, giờ nằm trong giới hạn → hiện lại
        child.hidden = false;
        this._hiddenByGroup.delete(child);
      }
    });
    return surplus;
  }

  // =====================================================
  // RENDER UI
  // =====================================================

  _render() {
    if (this._wrapper) this._wrapper.remove();

    this._lastChildren = Array.from(this.children);
    this._applyNumericSize();
    const surplus = this._applyOverflow();

    // Avatar "+N" tổng hợp số người bị ẩn
    let surplusAvatar = null;
    if (surplus > 0) {
      surplusAvatar = createElement('hui-avatar', {
        className: 'hui-avatar-group__surplus',
        color: 'secondary',
        alt: `Và ${surplus} người khác`,
      }, `+${surplus}`);
    }

    const spacing = ['sm', 'md', 'lg'].includes(this.getAttribute('spacing'))
      ? this.getAttribute('spacing')
      : 'md';

    this._wrapper = createElement('div', {
      className: `hui-avatar-group hui-avatar-group--spacing-${spacing}`,
      role: 'group',
    }, createElement('slot'), ...[surplusAvatar].filter(Boolean));

    this.shadowRoot.appendChild(this._wrapper);
  }
}

if (!customElements.get('hui-avatar-group')) {
  customElements.define('hui-avatar-group', HuiAvatarGroup);
}

export default HuiAvatarGroup;
