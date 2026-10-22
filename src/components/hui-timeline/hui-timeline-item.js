/**
 * HUI Timeline Item — Một mốc trong <hui-timeline>: chấm (màu / icon / slot dot), nhãn thời gian, tiêu đề, nội dung.
 * Vị trí (bên trái/phải trục, mốc cuối, có cột nhãn) do <hui-timeline> tính và ghi qua data-* trên host.
 */

import styles from './hui-timeline-item.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/index.js';

const COLOR_TOKENS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

/** Slot có nội dung do người dùng đặt vào (không tính nội dung dự phòng của slot) */
const hasNodes = (slot) => slot.assignedNodes()
  .some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim() !== '');

/**
 * @slot - Nội dung mốc
 * @slot dot - Chấm tùy biến (icon, avatar…) thay cho chấm tròn
 * @slot label - Nhãn tùy biến (thay attribute label)
 * @slot heading - Tiêu đề tùy biến (thay attribute heading)
 * @csspart item - Khung lưới của mốc (nhãn | trục | nội dung)
 * @csspart label - Nhãn thời gian (cột đối diện nội dung)
 * @csspart axis - Cột trục (chấm + đường nối)
 * @csspart dot - Chấm
 * @csspart tail - Đường nối tới mốc kế
 * @csspart body - Vùng nội dung (tiêu đề + nội dung)
 * @csspart heading - Tiêu đề
 * @csspart content - Nội dung
 * @cssprop --hui-timeline-dot-size - Đường kính chấm (mặc định 10px)
 * @cssprop --hui-timeline-dot-color - Màu chấm (attribute color ưu tiên hơn)
 * @cssprop --hui-timeline-dot-bg - Nền chấm (mặc định --hui-bg-container)
 * @cssprop --hui-timeline-tail-color - Màu đường nối
 * @cssprop --hui-timeline-tail-width - Độ dày đường nối (mặc định 2px)
 * @cssprop --hui-timeline-gap - Khoảng cách trục ↔ nội dung
 * @cssprop --hui-timeline-item-spacing - Khoảng cách giữa các mốc (mặc định --hui-space-xl)
 * @cssprop --hui-timeline-label-color - Màu nhãn
 * @cssprop --hui-timeline-heading-color - Màu tiêu đề
 * @cssprop --hui-timeline-content-color - Màu nội dung
 */
class HuiTimelineItem extends HuiElement {
  static properties = {
    /** primary | success | warning | danger | info | gray hoặc màu CSS — màu chấm */
    color: { type: String, default: 'primary' },
    /** Tên icon (hui-icon) làm chấm, vd "check", "star" */
    dot: { type: String },
    /** Nhãn thời gian (vd "2015", "09:30") — nằm phía đối diện nội dung */
    label: { type: String },
    /** Tiêu đề mốc */
    heading: { type: String },
    /** Mốc đang diễn ra: chấm xoay + đường nối nét đứt */
    pending: { type: Boolean },
    /** left | right — ép phía hiển thị nội dung (khi timeline mode="alternate") */
    position: { type: String },
  };

  static styles = styles;

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
  }

  render() {
    this._labelText = document.createTextNode('');
    this._labelSlot = createElement('slot', { name: 'label' }, this._labelText);
    this._label = createElement('div', { className: 'tli__label', part: 'label' }, this._labelSlot);

    this._icon = createElement('hui-icon', { className: 'tli__icon', 'aria-hidden': 'true' });
    this._dotSlot = createElement('slot', { name: 'dot' }, this._icon);
    this._dot = createElement('div', { className: 'tli__dot', part: 'dot', 'aria-hidden': 'true' }, this._dotSlot);
    this._tail = createElement('div', { className: 'tli__tail', part: 'tail', 'aria-hidden': 'true' });
    this._axis = createElement('div', { className: 'tli__axis', part: 'axis' }, this._tail, this._dot);

    this._headingText = document.createTextNode('');
    this._headingSlot = createElement('slot', { name: 'heading' }, this._headingText);
    this._heading = createElement('div', { className: 'tli__heading', part: 'heading' }, this._headingSlot);
    this._contentSlot = createElement('slot');
    this._content = createElement('div', { className: 'tli__content', part: 'content' }, this._contentSlot);
    this._body = createElement('div', { className: 'tli__body', part: 'body' }, this._heading, this._content);

    this._item = createElement('div', { className: 'tli', part: 'item' }, this._label, this._axis, this._body);

    for (const slot of [this._labelSlot, this._dotSlot, this._headingSlot, this._contentSlot]) {
      slot.addEventListener('slotchange', () => this._syncSections());
    }
    return this._item;
  }

  updated(changed) {
    if (changed.has('label')) this._labelText.data = this.label || '';
    if (changed.has('heading')) this._headingText.data = this.heading || '';
    if (changed.has('color')) {
      const c = this.color;
      const value = !c ? '' : COLOR_TOKENS.includes(c) ? `var(--hui-${c})` : c === 'gray' ? 'var(--hui-text-disabled)' : c;
      if (value) this._item.style.setProperty('--_tli-color', value);
      else this._item.style.removeProperty('--_tli-color');
    }
    if (changed.has('dot') || changed.has('pending')) {
      const name = this.pending ? 'loading' : this.dot;
      if (name) this._icon.setAttribute('name', name);
      else this._icon.removeAttribute('name');
      this._icon.toggleAttribute('spin', this.pending);
    }
    this._syncSections();
    if (['label', 'position', 'pending'].some((k) => changed.has(k))) this._timeline()?._queueSync?.();
  }

  /** <hui-timeline> chứa mốc này (con trực tiếp, hoặc mốc do timeline tự dựng trong shadow) */
  _timeline() {
    const p = this.parentElement;
    if (p?.localName === 'hui-timeline') return p;
    const host = this.getRootNode()?.host;
    return host?.localName === 'hui-timeline' ? host : null;
  }

  /** Mốc có nhãn (attribute hoặc slot) — timeline dùng để quyết định có cột nhãn */
  get hasLabel() {
    return Boolean(this.label) || (this._labelSlot ? hasNodes(this._labelSlot) : this.querySelector(':scope > [slot="label"]') !== null);
  }

  _syncSections() {
    if (!this._item) return;
    const customDot = hasNodes(this._dotSlot);
    this._dot.classList.toggle('tli__dot--custom', customDot);
    this._dot.classList.toggle('tli__dot--icon', !customDot && Boolean(this.dot || this.pending));
    this._heading.hidden = !this.heading && !hasNodes(this._headingSlot);
    this._content.hidden = !hasNodes(this._contentSlot);
    this._label.classList.toggle('tli__label--empty', !this.hasLabel);
  }
}

defineElement('hui-timeline-item', HuiTimelineItem);

export default HuiTimelineItem;
