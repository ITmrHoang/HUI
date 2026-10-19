/**
 * HUI Radio — Một lựa chọn trong nhóm (Ant Radio + MUI Radio). Dùng bên trong <hui-radio-group>:
 * nhóm quản lý giá trị, gửi form, bàn phím (roving tabindex). Đứng riêng thì chỉ bật được, không tắt.
 * Parts / slots / biến CSS: xem JSDoc của class bên dưới.
 */

import styles from './hui-radio.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/**
 * @slot - Nhãn (thay cho attribute label)
 * @csspart base - Khung ngoài (vòng tròn + nhãn, hoặc cả nút ở dạng button)
 * @csspart control - Vòng tròn
 * @csspart dot - Chấm tròn bên trong khi được chọn
 * @csspart label - Vùng chữ nhãn
 * @cssprop --hui-radio-size - Đường kính vòng tròn
 * @cssprop --hui-radio-gap - Khoảng cách vòng tròn ↔ nhãn
 * @cssprop --hui-radio-color - Màu khi được chọn (viền, chấm, nút)
 * @cssprop --hui-radio-border-color - Viền vòng tròn / nút khi chưa chọn
 * @cssprop --hui-radio-bg - Nền vòng tròn / nút
 * @cssprop --hui-radio-label-color - Màu chữ nhãn
 * @cssprop --hui-radio-font-size - Cỡ chữ nhãn
 * @cssprop --hui-radio-button-height - Chiều cao ở dạng button
 * @cssprop --hui-radio-button-padding-x - Khoảng đệm ngang ở dạng button
 * @cssprop --hui-radio-button-radius - Bo góc 2 đầu nhóm nút
 * @cssprop --hui-radio-solid-color - Màu chữ nút đang chọn ở button-style="solid"
 * @cssprop --hui-radio-focus-ring - box-shadow khi focus bằng bàn phím
 */
class HuiRadio extends HuiElement {
  static properties = {
    /** Giá trị của lựa chọn — nhóm so sánh với value của <hui-radio-group> */
    value: { type: String, default: '' },
    /** Đang được chọn (nhóm tự đặt; đứng riêng thì đặt trực tiếp) */
    checked: { type: Boolean },
    /** Vô hiệu hóa lựa chọn này */
    disabled: { type: Boolean },
    /** Nhãn chữ (hoặc dùng slot mặc định) */
    label: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    /** <hui-radio-group> đang quản lý radio này (null = đứng riêng) */
    this._group = null;
    this._groupDisabled = false;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'radio');
    // Radio con được thêm sau (kể cả lồng trong thẻ khác) → báo nhóm đồng bộ lại
    this.closest('hui-radio-group')?._syncRadios?.();
    // Đứng riêng: tự xử lý click; trong nhóm thì nhóm xử lý (xem hui-radio-group)
    this.listen(this, 'click', () => {
      if (!this._group && !this.isDisabled && !this.checked) this.checked = true;
    });
  }

  render() {
    this._dot = createElement('span', { className: 'hui-radio__dot', part: 'dot' });
    this._circle = createElement('span', { className: 'hui-radio__circle', part: 'control', 'aria-hidden': 'true' }, this._dot);
    this._fallback = document.createTextNode('');
    this._slot = createElement('slot', {}, this._fallback);
    this._labelEl = createElement('span', { className: 'hui-radio__label', part: 'label' }, this._slot);
    this._slot.addEventListener('slotchange', () => this._syncLabel());
    this._base = createElement('span', { className: 'hui-radio', part: 'base' }, this._circle, this._labelEl);
    return this._base;
  }

  updated(changed) {
    if (changed.has('label')) {
      this._fallback.textContent = this.label || '';
      this._syncLabel();
    }
    this.setAttribute('aria-checked', String(this.checked));
    if (this.isDisabled) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
    // Đứng riêng: tự là 1 tab stop. Trong nhóm: nhóm đặt tabindex (roving)
    if (!this._group) this.tabIndex = this.isDisabled ? -1 : 0;
    this.toggleAttribute('data-disabled', this.isDisabled);
    this.setState('checked', this.checked);
  }

  /** Bị vô hiệu hóa bởi chính nó hoặc bởi nhóm */
  get isDisabled() {
    return this.disabled || this._groupDisabled;
  }

  /**
   * Nhóm gọi để áp cấu hình chung: kiểu hiển thị, kích thước, disabled của nhóm.
   * @param {{group: HTMLElement, button: boolean, solid: boolean, size: string, disabled: boolean}} cfg
   */
  _applyGroup({ group, button, solid, size, disabled }) {
    this._group = group;
    this.toggleAttribute('data-button', button);
    this.toggleAttribute('data-solid', button && solid);
    this.setAttribute('data-size', size);
    if (this._groupDisabled !== disabled) {
      this._groupDisabled = disabled;
      this.requestUpdate('disabled', this.disabled);
    }
  }

  _syncLabel() {
    const slotted = this._slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    this._labelEl.hidden = !slotted && !this.label;
  }
}

defineElement('hui-radio', HuiRadio);

export default HuiRadio;
