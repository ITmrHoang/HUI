/**
 * HUI Step — Khai báo một bước bên trong <hui-steps>. Xem JSDoc của class.
 */

import { HuiElement, defineElement } from '../../core/hui-element.js';

/** Thẻ chỉ chứa dữ liệu, không tự hiển thị — hui-steps cha đọc attribute rồi vẽ */
const styles = ':host { display: none !important; }';

/**
 * Một bước của <hui-steps>. hui-steps cha đọc title / description / sub-title / icon / status / disabled
 * để dựng danh sách; đổi attribute bất kỳ → cha tự vẽ lại.
 */
class HuiStep extends HuiElement {
  static properties = {
    /** Tiêu đề bước */
    title: { type: String },
    /** Mô tả ngắn dưới tiêu đề */
    description: { type: String },
    /** Tiêu đề phụ cạnh tiêu đề (vd: "00:00:05") */
    subTitle: { type: String },
    /** Tên hui-icon thay cho số thứ tự */
    icon: { type: String },
    /** wait | process | finish | error — ghi đè trạng thái tự tính theo current */
    status: { type: String },
    /** Không bấm chọn được (khi hui-steps clickable) */
    disabled: { type: Boolean },
  };

  static styles = styles;
}

defineElement('hui-step', HuiStep);

export default HuiStep;
