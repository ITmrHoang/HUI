/**
 * HUI Button — Nút bấm (Ant Button + MUI Button)
 * Parts: base, label, icon, spinner · Slots: (mặc định), icon, suffix · Event: hui-click
 * Biến CSS: xem đầu hui-button.css. Cách override: xem hui-demo.
 */

import styles from './hui-button.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/hui-icon.js';

class HuiButton extends HuiElement {
  static properties = {
    /** primary | secondary | outline | dashed | ghost | text | link | danger */
    variant: { type: String, default: 'primary' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** default | round (bo tròn 2 đầu) | circle (nút tròn chỉ có icon) */
    shape: { type: String, default: 'default' },
    disabled: { type: Boolean },
    /** Hiện spinner, chặn click nhưng VẪN giữ focus (không dùng disabled native) */
    loading: { type: Boolean },
    /** Chiếm toàn bộ chiều ngang */
    block: { type: Boolean },
    /** button | submit | reset — submit/reset tác động lên <form> chứa nút */
    type: { type: String, default: 'button' },
    /** Tên icon (xem hui-icon) hiển thị trước chữ */
    icon: { type: String },
    /** start | end — vị trí icon so với chữ */
    iconPosition: { type: String, default: 'start' },
  };

  static styles = styles;

  /** Nút submit/reset phải "nhìn thấy" <form> cha — Shadow DOM tự nó không làm được điều này */
  static formAssociated = true;

  render() {
    this._spinner = createElement('span', { className: 'hui-btn__spinner', part: 'spinner', 'aria-hidden': 'true' });

    // slot="icon" thay được icon mặc định (lấy theo attribute icon)
    this._icon = createElement('hui-icon', { part: 'icon', className: 'hui-btn__icon' });
    this._iconSlot = createElement('slot', { name: 'icon' }, this._icon);
    this._iconSlot.addEventListener('slotchange', () => this._syncIconVisibility());

    this._defaultSlot = createElement('slot');
    this._label = createElement('span', { className: 'hui-btn__label', part: 'label' }, this._defaultSlot);
    this._defaultSlot.addEventListener('slotchange', () => this._syncLabelVisibility());
    this._suffix = createElement('slot', { name: 'suffix' });

    this._button = createElement('button', { part: 'base', type: 'button' },
      this._spinner, this._iconSlot, this._label, this._suffix);
    this._button.addEventListener('click', (e) => this._handleClick(e));

    // Chặn sự kiện click native nổi bọt ra ngoài khi nút đang disabled/loading
    // (listener capture trên host chạy trước listener của người dùng)
    this.addEventListener('click', (e) => {
      if (this.isDisabled || this.loading) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);

    return this._button;
  }

  updated(changed) {
    const btn = this._button;

    if (changed.has('variant') || changed.has('size') || changed.has('shape') ||
        changed.has('loading') || changed.has('iconPosition')) {
      btn.className = [
        'hui-btn',
        `hui-btn--${this.variant}`,
        `hui-btn--${this.size}`,
        this.shape !== 'default' ? `hui-btn--${this.shape}` : '',
        this.loading ? 'hui-btn--loading' : '',
        this.iconPosition === 'end' ? 'hui-btn--icon-end' : '',
      ].filter(Boolean).join(' ');
    }

    if (changed.has('disabled')) {
      btn.disabled = this.isDisabled;
    }

    if (changed.has('loading')) {
      // aria-disabled thay vì disabled: trình đọc màn hình biết nút đang bận, focus vẫn ở lại nút
      btn.toggleAttribute('aria-busy', this.loading);
      if (this.loading) btn.setAttribute('aria-disabled', 'true');
      else btn.removeAttribute('aria-disabled');
      this._spinner.hidden = !this.loading;
      this._syncIconVisibility();
    }

    if (changed.has('icon')) {
      if (this.icon) this._icon.setAttribute('name', this.icon);
      else this._icon.removeAttribute('name');
      this._syncIconVisibility();
    }

    // Nút tròn chỉ có icon → cần aria-label để trình đọc màn hình đọc được
    if (this.hasAttribute('aria-label')) {
      btn.setAttribute('aria-label', this.getAttribute('aria-label'));
    }
  }

  firstUpdated() {
    this._syncLabelVisibility();
    this._syncIconVisibility();
  }

  /** Nút chỉ có icon (không có chữ) → ẩn vùng chữ để icon nằm chính giữa, không dư khoảng cách gap */
  _syncLabelVisibility() {
    this._label.hidden = !this._defaultSlot.assignedNodes().some(
      (n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim()
    );
  }

  /** Ẩn vùng icon khi không có icon nào (tránh khoảng trống thừa), ẩn icon khi đang loading */
  _syncIconVisibility() {
    const hasSlotted = this._iconSlot.assignedNodes().length > 0;
    const hasIcon = hasSlotted || Boolean(this.icon);
    this._iconSlot.hidden = !hasIcon || this.loading;
  }

  _handleClick(e) {
    if (this.isDisabled || this.loading) return;

    // Nút nằm trong Shadow DOM không tự submit được <form> bên ngoài → làm hộ qua ElementInternals
    const form = this.form;
    if (form && this.type === 'submit') form.requestSubmit();
    else if (form && this.type === 'reset') form.reset();

    // Giữ sự kiện cũ để không vỡ code đang dùng (@hui-click / addEventListener('hui-click'))
    this.emit('hui-click', { originalEvent: e });
  }

  /** Đưa focus vào nút thật bên trong (giống HTMLButtonElement.focus) */
  focus(options) {
    this._button ? this._button.focus(options) : super.focus(options);
  }

  blur() {
    this._button?.blur();
  }
}

// Tên thẻ PHẢI có dấu gạch ngang (-) theo quy tắc của trình duyệt
defineElement('hui-button', HuiButton);

export default HuiButton;
