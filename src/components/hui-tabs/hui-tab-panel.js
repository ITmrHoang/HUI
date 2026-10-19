/**
 * HUI Tab Panel — Một thẻ nội dung bên trong <hui-tabs>. Xem JSDoc của class.
 */

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const styles = `
:host { display: block; outline: none; }
:host([hidden]) { display: none !important; }
:host(:focus-visible) { box-shadow: var(--hui-focus-ring); border-radius: var(--hui-radius-sm); }
`;

/**
 * Nội dung của một tab. hui-tabs cha đọc key / label / icon / disabled / closable để dựng thanh tab,
 * gắn role="tabpanel" và bật/tắt `hidden` (panel chưa từng mở thì nội dung vẫn ẩn).
 *
 * @slot - Nội dung panel
 * @slot label - Nhãn tab dạng HTML (ưu tiên hơn attribute label; được sao chép lên thanh tab)
 */
class HuiTabPanel extends HuiElement {
  static properties = {
    /** Khóa định danh (so với active-key của hui-tabs); trống → dùng name hoặc vị trí */
    key: { type: String },
    /** Alias của key */
    name: { type: String },
    /** Nhãn hiển thị trên thanh tab */
    label: { type: String },
    /** Tên hui-icon hiển thị trước nhãn */
    icon: { type: String },
    /** Không chọn được tab này */
    disabled: { type: Boolean },
    /** Hiện nút ✕ — với type="editable-card" mặc định có, đặt closable="false" để tắt */
    closable: { type: Boolean },
  };

  static styles = styles;

  render() {
    return createElement('slot');
  }
}

defineElement('hui-tab-panel', HuiTabPanel);

export default HuiTabPanel;
