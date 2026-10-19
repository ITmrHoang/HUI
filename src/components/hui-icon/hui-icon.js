/**
 * HUI Icon — Icon SVG theo tên (Ant Icons + MUI SvgIcon)
 * <hui-icon name="search" size="20" spin label="..."> · Part: svg
 * Biến CSS: --hui-icon-size, --hui-icon-stroke-width · Màu theo currentColor
 */

import styles from './hui-icon.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getIcon } from './icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @csspart svg - Thẻ <svg>
 * @cssprop --hui-icon-size - Kích thước (mặc định 1em)
 * @cssprop --hui-icon-stroke-width - Độ dày nét (mặc định 2)
 */
class HuiIcon extends HuiElement {
  static properties = {
    /** Tên icon trong registry (xem icons.js) */
    name: { type: String },
    /** Kích thước: số (px) hoặc giá trị CSS bất kỳ ('1.5em', '2rem'). Mặc định 1em (theo cỡ chữ) */
    size: { type: String },
    /** Nhãn cho trình đọc màn hình. Không có → icon chỉ để trang trí (aria-hidden) */
    label: { type: String },
    /** Xoay liên tục (dùng cho loading) */
    spin: { type: Boolean },
    /** Góc xoay cố định (độ) */
    rotate: { type: Number },
  };

  static styles = styles;

  render() {
    this._svg = document.createElementNS(SVG_NS, 'svg');
    this._svg.setAttribute('viewBox', '0 0 24 24');
    this._svg.setAttribute('fill', 'none');
    this._svg.setAttribute('stroke', 'currentColor');
    this._svg.setAttribute('stroke-linecap', 'round');
    this._svg.setAttribute('stroke-linejoin', 'round');
    this._svg.setAttribute('part', 'svg');
    return this._svg;
  }

  connectedCallback() {
    super.connectedCallback();
    // Icon được đăng ký muộn (sau khi thẻ đã hiển thị) → vẽ lại nếu trùng tên
    this.listen(document, 'hui-icon-registered', (e) => {
      if (e.detail?.name === this.name) this._drawIcon();
    });
  }

  updated(changed) {
    if (changed.has('name')) this._drawIcon();

    if (changed.has('size')) {
      // Số trơn → px; còn lại giữ nguyên. Ghi vào biến CSS để CSS ngoài vẫn có thể ghi đè bằng ::part
      const size = this.size;
      if (size) this.style.setProperty('--hui-icon-size', /^\d+(\.\d+)?$/.test(size) ? `${size}px` : size);
      else this.style.removeProperty('--hui-icon-size');
    }

    if (changed.has('rotate')) {
      this._svg.style.transform = this.rotate ? `rotate(${this.rotate}deg)` : '';
    }

    if (changed.has('label')) {
      // Icon có nghĩa → role="img" + aria-label; icon trang trí → ẩn khỏi trình đọc màn hình
      if (this.label) {
        this.setAttribute('role', 'img');
        this.setAttribute('aria-label', this.label);
        this.removeAttribute('aria-hidden');
      } else {
        this.removeAttribute('role');
        this.removeAttribute('aria-label');
        this.setAttribute('aria-hidden', 'true');
      }
    }
  }

  _drawIcon() {
    // Nội dung lấy từ registry nội bộ (icon có sẵn hoặc do dự án tự registerIcon)
    this._svg.innerHTML = getIcon(this.name) || '';
  }
}

defineElement('hui-icon', HuiIcon);

export default HuiIcon;
