/**
 * HUI Title — Tiêu đề h1–h5 (Ant Typography.Title + MUI Typography variant h1…h5)
 * Dùng role="heading" + aria-level nên đổi level không phải dựng lại DOM.
 * Kế thừa mọi tính năng của hui-text (type, kiểu chữ, ellipsis/rows, copyable).
 */

import styles from './hui-title.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiTypographyBase, baseStyles } from './typography-base.js';

/**
 * @fires hui-copy - Sao chép thành công. detail: { text }
 * @fires hui-ellipsis - Trạng thái bị cắt chữ thay đổi. detail: { ellipsis }
 * @slot - Nội dung tiêu đề
 * @csspart base - Khung tiêu đề (role="heading")
 * @csspart content - Vùng chữ
 * @csspart actions - Vùng nút hành động
 * @csspart copy - Nút sao chép
 * @cssprop --hui-title-color - Màu chữ khi không có type
 * @cssprop --hui-title-font-size - Cỡ chữ (mặc định theo level: --hui-font-h1 … --hui-font-h5)
 * @cssprop --hui-title-font-weight - Độ đậm (mặc định 600)
 * @cssprop --hui-title-line-height - Chiều cao dòng
 * @cssprop --hui-title-margin - Lề ngoài (mặc định 0 0 0.5em)
 */
class HuiTitle extends HuiTypographyBase {
  static properties = {
    /** 1 | 2 | 3 | 4 | 5 — cấp tiêu đề (cỡ chữ + aria-level) */
    level: { type: Number, default: 1 },
  };

  static styles = [baseStyles, styles];

  static baseTag = 'div';

  updated(changed) {
    if (changed.has('level')) {
      const level = Math.min(5, Math.max(1, Math.floor(Number(this.level)) || 1));
      this._base.setAttribute('role', 'heading');
      this._base.setAttribute('aria-level', String(level));
      for (let i = 1; i <= 5; i++) this._base.classList.toggle(`typo--h${i}`, i === level);
    }
    super.updated(changed);
  }
}

defineElement('hui-title', HuiTitle);

export default HuiTitle;
