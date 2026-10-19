/**
 * HUI Layout — Khung bố cục trang (Ant Layout)
 * hui-layout chứa hui-header / hui-sider / hui-content / hui-footer; có hui-sider con trực tiếp
 * → tự chuyển sang xếp ngang (Ant hasSider). Lồng hui-layout trong hui-layout để kết hợp.
 * Biến CSS: xem đầu hui-layout.css.
 */

import styles from './hui-layout.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/**
 * @slot - hui-header, hui-sider, hui-content, hui-footer hoặc hui-layout lồng nhau
 * @csspart base - Khung flex bên trong
 * @cssprop --hui-layout-bg - Màu nền (mặc định --hui-bg-secondary)
 */
class HuiLayout extends HuiElement {
  static properties = {
    /** Ép xếp ngang (mặc định tự phát hiện khi có hui-sider con trực tiếp) */
    hasSider: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncSider());
    this._base = createElement('div', { className: 'layout', part: 'base' }, this._slot);
    return this._base;
  }

  updated() {
    this._syncSider();
  }

  _syncSider() {
    const auto = this._slot.assignedElements().some((el) => el.localName === 'hui-sider');
    const on = this.hasSider || auto;
    this._base.classList.toggle('layout--has-sider', on);
    this.setState('has-sider', on);
  }
}

defineElement('hui-layout', HuiLayout);

export default HuiLayout;
