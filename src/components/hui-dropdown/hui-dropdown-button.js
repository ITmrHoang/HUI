/**
 * HUI Dropdown Button — Nút hành động chính + nút mũi tên mở menu (Ant Dropdown.Button + MUI Split Button)
 *   <hui-dropdown-button @hui-click=${save}>Lưu<hui-menu slot="menu">...</hui-menu></hui-dropdown-button>
 */

import styles from './hui-dropdown-button.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-button/hui-button.js';
import './hui-dropdown.js';

const FALLBACK = { vi: 'Thêm tùy chọn', en: 'More options' };

/**
 * @fires hui-click - Bấm nút chính. detail: { originalEvent }
 * @fires hui-select - (nổi bọt từ hui-menu) chọn một item. detail: { key, keyPath, item }
 * @fires open-change - Menu mở/đóng. detail: { open }
 * @slot - Nhãn nút chính
 * @slot menu - Nội dung menu (thường là <hui-menu>), ưu tiên hơn property menu
 * @csspart base - Khung nhóm 2 nút
 * @csspart button - hui-button chính
 * @csspart button-base - Part base (<button>) của nút chính
 * @csspart arrow-button - hui-button mũi tên
 * @csspart arrow-button-base - Part base (<button>) của nút mũi tên
 * @csspart dropdown - hui-dropdown bên trong
 * @cssprop --hui-dropdown-button-gap - Khoảng cách giữa 2 nút (mặc định 0, liền nhau)
 */
class HuiDropdownButton extends HuiElement {
  static properties = {
    /** Variant của hai nút (xem hui-button) */
    variant: { type: String, default: 'outline' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Vô hiệu hóa cả hai nút */
    disabled: { type: Boolean },
    /** Nút chính đang xử lý (spinner) */
    loading: { type: Boolean },
    /** Icon trước nhãn nút chính */
    icon: { type: String },
    /** Icon của nút mũi tên */
    arrowIcon: { type: String, default: 'chevron-down' },
    /** hover | click | contextmenu — cách mở menu bằng nút mũi tên */
    trigger: { type: String, default: 'click' },
    /** Vị trí menu (xem hui-dropdown) */
    placement: { type: String, default: 'bottom-end' },
    /** Trạng thái mở menu */
    open: { type: Boolean },
    /** Mảng item → tự dựng hui-menu (xem hui-dropdown) */
    menu: { type: Array, default: [] },
  };

  static styles = styles;

  static localized = true;

  render() {
    this.requestUpdate('locale'); // lần updated() đầu cũng đặt chữ theo locale
    this._main = createElement('hui-button', { part: 'button', exportparts: 'base: button-base' }, createElement('slot'));
    this._arrowBtn = createElement('hui-button', { part: 'arrow-button', exportparts: 'base: arrow-button-base' });
    // hui-click của nút mũi tên chỉ để mở menu → không nổi bọt ra ngoài (tránh nhầm với nút chính)
    this._arrowBtn.addEventListener('hui-click', (e) => e.stopPropagation());

    // Chuyển tiếp slot menu vào hui-dropdown (chỉ khi người dùng có slot="menu", nếu không fallback
    // của dropdown — menu dựng từ property — bị che bởi chính <slot> chuyển tiếp)
    this._forward = createElement('slot', { name: 'menu', slot: 'menu' });
    this._dropdown = createElement('hui-dropdown', { part: 'dropdown' }, this._arrowBtn);
    this._dropdown.addEventListener('open-change', (e) => {
      if (e.target !== this._dropdown) return;
      this.open = e.detail.open;
    });
    this._base = createElement('div', { className: 'group', part: 'base', role: 'group' }, this._main, this._dropdown);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._observer ||= new MutationObserver(() => this._syncForward());
    this._observer.observe(this, { childList: true, attributes: true, subtree: false, attributeFilter: ['slot'] });
    this._syncForward();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
  }

  updated(changed) {
    for (const btn of [this._main, this._arrowBtn]) {
      if (changed.has('variant')) btn.setAttribute('variant', this.variant);
      if (changed.has('size')) btn.setAttribute('size', this.size);
      if (changed.has('disabled')) btn.toggleAttribute('disabled', this.disabled);
    }
    if (changed.has('loading')) this._main.toggleAttribute('loading', this.loading);
    if (changed.has('icon')) {
      if (this.icon) this._main.setAttribute('icon', this.icon);
      else this._main.removeAttribute('icon');
    }
    if (changed.has('arrowIcon')) this._arrowBtn.setAttribute('icon', this.arrowIcon || 'chevron-down');
    if (changed.has('locale')) this._arrowBtn.setAttribute('aria-label', this._moreLabel());
    if (changed.has('trigger')) this._dropdown.setAttribute('trigger', this.trigger || 'click');
    if (changed.has('placement')) this._dropdown.setAttribute('placement', this.placement || 'bottom-end');
    if (changed.has('disabled')) this._dropdown.toggleAttribute('disabled', this.disabled);
    if (changed.has('menu')) this._dropdown.menu = this.menu;
    if (changed.has('open')) this._dropdown.open = this.open;
  }

  _moreLabel() {
    const v = t('common.more');
    return v !== 'common.more' ? v : FALLBACK[getLocaleName() === 'vi' ? 'vi' : 'en'];
  }

  _syncForward() {
    const has = [...this.children].some((el) => el.getAttribute('slot') === 'menu');
    if (has && !this._forward.isConnected) this._dropdown.append(this._forward);
    else if (!has && this._forward.isConnected) this._forward.remove();
  }
}

defineElement('hui-dropdown-button', HuiDropdownButton);

export default HuiDropdownButton;
