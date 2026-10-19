/**
 * HUI Text — Đoạn chữ inline (Ant Typography.Text + MUI Typography)
 * type màu, kiểu chữ (strong/italic/underline/delete/code/mark/keyboard), ellipsis + rows, copyable.
 * Biến CSS: xem đầu hui-text.css và hui-typography.css.
 */

import styles from './hui-text.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiTypographyBase, baseStyles } from './typography-base.js';

/**
 * @fires hui-copy - Sao chép thành công. detail: { text }
 * @fires hui-ellipsis - Trạng thái bị cắt chữ thay đổi. detail: { ellipsis }
 * @slot - Nội dung chữ
 * @csspart base - Khung ngoài
 * @csspart content - Vùng chữ (bị cắt khi ellipsis)
 * @csspart actions - Vùng nút hành động
 * @csspart copy - Nút sao chép
 * @csspart code - Thẻ <code> khi có attribute code (tương tự: keyboard, mark, delete, underline, strong, italic)
 * @cssprop --hui-text-color - Màu chữ khi không có type (mặc định kế thừa từ thẻ cha)
 * @cssprop --hui-text-font-size - Cỡ chữ (mặc định kế thừa)
 * @cssprop --hui-typography-code-bg - Nền chữ dạng code
 * @cssprop --hui-typography-mark-bg - Nền chữ tô sáng
 * @cssprop --hui-typography-action-color - Màu nút sao chép
 * @cssprop --hui-typography-copied-color - Màu nút sau khi sao chép
 */
class HuiText extends HuiTypographyBase {
  static styles = [baseStyles, styles];
}

defineElement('hui-text', HuiText);

export default HuiText;
