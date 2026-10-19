/**
 * HUI Collapse Panel — Một panel trong <hui-collapse>. Parts/slots/biến CSS: xem JSDoc của class.
 */

import styles from './hui-collapse-panel.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { collapse } from '../../utils/motion.js';

const ARROW_SVG = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

let uid = 0;

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * Header (mũi tên + tiêu đề + extra) và vùng nội dung đóng/mở theo mẫu APG Accordion:
 * nút có aria-expanded / aria-controls, vùng nội dung role="region".
 * Bàn phím: Enter/Space đóng mở · ↓/↑ chuyển header kế tiếp/trước · Home/End header đầu/cuối.
 * Dùng độc lập (không nằm trong hui-collapse) → tự đảo `active`.
 *
 * @slot - Nội dung panel
 * @slot header - Tiêu đề tùy biến (thay attribute header)
 * @slot extra - Vùng góc phải header (click vào đây không đóng/mở panel)
 * @slot icon - Thay mũi tên mặc định (tự xoay 90° khi mở)
 * @csspart item - Khung panel
 * @csspart header - Hàng header (role="button" khi collapsible mặc định)
 * @csspart icon - Mũi tên
 * @csspart title - Tiêu đề
 * @csspart extra - Vùng extra
 * @csspart content - Vùng nội dung (role="region", animate chiều cao)
 * @csspart content-box - Khối đệm bên trong vùng nội dung
 */
class HuiCollapsePanel extends HuiElement {
  static properties = {
    /** Định danh panel trong active-key của hui-collapse (bỏ trống → chỉ số) */
    key: { type: String },
    /** Tiêu đề (hoặc slot="header") */
    header: { type: String },
    /** Đang mở — thường do hui-collapse điều khiển */
    active: { type: Boolean },
    /** Không cho đóng/mở */
    disabled: { type: Boolean },
    /** header | icon | disabled — vùng bấm được: header (chỉ chữ tiêu đề + mũi tên), icon (chỉ mũi tên), disabled; bỏ trống = cả hàng */
    collapsible: { type: String },
    /** Hiện mũi tên. Mặc định bật; show-arrow="false" để ẩn */
    showArrow: { type: String },
    /** Cấp heading (aria-level) bọc header, mặc định 3 */
    headingLevel: { type: Number, default: 3 },
  };

  static styles = styles;

  render() {
    const id = `hui-collapse-panel-${++uid}`;

    this._iconBox = createElement('span', { className: 'hui-collapse-panel__arrow' });
    this._iconBox.innerHTML = ARROW_SVG;
    this._icon = createElement('span', { className: 'hui-collapse-panel__icon', part: 'icon' },
      createElement('slot', { name: 'icon' }, this._iconBox));

    this._titleText = createElement('span');
    this._title = createElement('span', { className: 'hui-collapse-panel__title', part: 'title', id: `${id}-title` },
      createElement('slot', { name: 'header' }, this._titleText));

    this._extraSlot = createElement('slot', { name: 'extra' });
    this._extra = createElement('span', { className: 'hui-collapse-panel__extra', part: 'extra' }, this._extraSlot);
    this._extraSlot.addEventListener('slotchange', () => { this._extra.hidden = !hasContent(this._extraSlot); });
    this._extra.hidden = true;

    this._header = createElement('div', { className: 'hui-collapse-panel__header', part: 'header' },
      this._icon, this._title, this._extra);
    this._heading = createElement('div', { className: 'hui-collapse-panel__heading', role: 'heading' }, this._header);

    this._contentBox = createElement('div', { className: 'hui-collapse-panel__content-box', part: 'content-box' },
      createElement('slot'));
    this._content = createElement('div', {
      className: 'hui-collapse-panel__content',
      part: 'content',
      id: `${id}-content`,
      role: 'region',
      'aria-labelledby': `${id}-title`,
    }, this._contentBox);

    this._header.addEventListener('click', (e) => this._onClick(e));
    this._header.addEventListener('keydown', (e) => this._onKeydown(e));

    this._item = createElement('div', { className: 'hui-collapse-panel', part: 'item' }, this._heading, this._content);
    return this._item;
  }

  updated(changed) {
    if (changed.has('header')) this._titleText.textContent = this.header || '';
    if (changed.has('headingLevel')) this._heading.setAttribute('aria-level', String(this.headingLevel || 3));
    if (changed.has('showArrow')) this._icon.hidden = this.showArrow === 'false' || this.showArrow === false;

    if (changed.has('collapsible') || changed.has('disabled')) this._syncTrigger();
    if (changed.has('active')) this._syncActive(!this._activeInit);
  }

  /** Không đóng/mở được (disabled hoặc collapsible="disabled") */
  get isDisabled() {
    return this.disabled || this.collapsible === 'disabled';
  }

  /** Phần tử nhận vai trò "nút" theo collapsible */
  _getTrigger() {
    if (this.collapsible === 'icon') return this._icon;
    if (this.collapsible === 'header') return this._title;
    return this._header;
  }

  _syncTrigger() {
    const trigger = this._getTrigger();
    const disabled = this.isDisabled;
    for (const el of [this._header, this._title, this._icon]) {
      if (el === trigger) continue;
      ['role', 'tabindex', 'aria-expanded', 'aria-controls', 'aria-disabled', 'aria-labelledby'].forEach((a) => el.removeAttribute(a));
    }
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-controls', this._content.id);
    trigger.setAttribute('aria-expanded', String(this.active));
    if (disabled) {
      trigger.setAttribute('aria-disabled', 'true');
      trigger.removeAttribute('tabindex');
    } else {
      trigger.removeAttribute('aria-disabled');
      trigger.setAttribute('tabindex', '0');
    }
    // Chỉ mũi tên là nút → mượn chữ tiêu đề làm tên
    if (trigger === this._icon) trigger.setAttribute('aria-labelledby', this._title.id);
    else trigger.removeAttribute('aria-labelledby');

    this._trigger = trigger;
    this._item.className = [
      'hui-collapse-panel',
      disabled ? 'hui-collapse-panel--disabled' : '',
      `hui-collapse-panel--collapsible-${this.collapsible === 'icon' || this.collapsible === 'header' ? this.collapsible : 'all'}`,
    ].filter(Boolean).join(' ');
    this._item.classList.toggle('hui-collapse-panel--active', this.active);
  }

  /** Lần đầu: đặt trạng thái ngay. Các lần sau: animate chiều cao rồi mới ẩn */
  _syncActive(initial) {
    const open = this.active;
    this._trigger?.setAttribute('aria-expanded', String(open));
    this._item.classList.toggle('hui-collapse-panel--active', open);
    this.setState('active', open);

    const token = (this._animToken = (this._animToken || 0) + 1);
    this._activeInit = true;
    if (initial || !this.isConnected) {
      this._content.hidden = !open;
      return;
    }
    if (open) {
      this._content.hidden = false;
      collapse(this._content, true);
    } else {
      collapse(this._content, false).then(() => {
        // Bị mở lại trong lúc đang đóng → giữ nguyên
        if (token === this._animToken) this._content.hidden = true;
      });
    }
  }

  _onClick(e) {
    if (this.isDisabled) return;
    const path = e.composedPath();
    if (path.includes(this._extra)) return; // Extra thường chứa nút riêng
    if (!path.includes(this._trigger)) return;
    this._requestToggle();
  }

  _onKeydown(e) {
    if (e.composedPath()[0] !== this._trigger) return;
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!this.isDisabled) this._requestToggle();
        break;
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Home':
      case 'End': {
        const panels = this._siblingPanels();
        if (!panels.length) return;
        e.preventDefault();
        const i = panels.indexOf(this);
        let next;
        if (e.key === 'Home') next = panels[0];
        else if (e.key === 'End') next = panels[panels.length - 1];
        else if (e.key === 'ArrowDown') next = panels[(i + 1) % panels.length];
        else next = panels[(i - 1 + panels.length) % panels.length];
        next.focus();
        break;
      }
      default:
    }
  }

  /** Panel cùng cấp còn focus được (để di chuyển bằng phím mũi tên) */
  _siblingPanels() {
    const parent = this.parentElement;
    if (!parent) return [];
    return Array.from(parent.children).filter((el) => el.localName === 'hui-collapse-panel' && !el.isDisabled);
  }

  /** Hỏi hui-collapse cha; không có cha xử lý → tự đảo trạng thái */
  _requestToggle() {
    const handled = !this.emit('hui-collapse-panel-toggle', null, { cancelable: true, composed: false });
    if (!handled) this.active = !this.active;
  }

  /** Focus vào nút đóng/mở của panel */
  focus(options) {
    if (this._trigger && !this.isDisabled) this._trigger.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-collapse-panel', HuiCollapsePanel);

export default HuiCollapsePanel;
