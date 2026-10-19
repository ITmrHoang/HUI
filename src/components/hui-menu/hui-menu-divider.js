/**
 * HUI Menu Divider — Đường kẻ phân cách giữa các item. Xem JSDoc của class.
 */

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const styles = `
:host { display: block; }
:host([hidden]) { display: none !important; }
.divider {
  margin: var(--hui-menu-divider-margin, 4px 0);
  border-top: 1px solid var(--hui-menu-divider-color, var(--hui-border-secondary));
}
:host([dashed]) .divider { border-top-style: dashed; }
`;

/**
 * @csspart base - Đường kẻ (role=separator)
 * @cssprop --hui-menu-divider-color - Màu đường kẻ
 * @cssprop --hui-menu-divider-margin - Khoảng cách trên/dưới
 */
class HuiMenuDivider extends HuiElement {
  static properties = {
    /** Nét đứt */
    dashed: { type: Boolean },
  };

  static styles = styles;

  render() {
    return createElement('div', { className: 'divider', part: 'base', role: 'separator' });
  }
}

defineElement('hui-menu-divider', HuiMenuDivider);

export default HuiMenuDivider;
