/**
 * HUI Container — Khung căn giữa nội dung theo breakpoint (MUI Container + Bootstrap .container)
 * Mặc định: max-width tăng theo màn hình 540 / 720 / 960 / 1140 / 1320px.
 * max-width="md" → cố định tối đa 720px · fluid → luôn 100%.
 * Biến CSS: xem đầu hui-container.css.
 */

import styles from './hui-container.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

/**
 * @slot - Nội dung
 * @cssprop --hui-container-max-width - Ghi đè max-width ở mọi breakpoint
 * @cssprop --hui-container-padding-x - Khoảng đệm hai bên (mặc định 16px, ≥ 768px: 24px)
 */
class HuiContainer extends HuiElement {
  static properties = {
    /** xs | sm | md | lg | xl | xxl — cố định chiều rộng tối đa theo breakpoint, hoặc độ dài CSS ("800px", "60rem") */
    maxWidth: { type: String },
    /** Luôn rộng 100% (không giới hạn max-width) */
    fluid: { type: Boolean },
    /** Bỏ khoảng đệm hai bên (MUI disableGutters) */
    disableGutters: { type: Boolean },
  };

  static styles = styles;

  render() {
    return createElement('slot');
  }

  updated(changed) {
    if (changed.has('maxWidth')) {
      // Từ khóa xử lý trong CSS; độ dài tùy ý → biến nội bộ trên host (attribute thắng biến CSS công khai)
      const v = this.maxWidth;
      const custom = v && !SIZES.includes(v) ? (/^\d+(\.\d+)?$/.test(v) ? `${v}px` : v) : null;
      if (custom) this.style.setProperty('--_container-custom', custom);
      else this.style.removeProperty('--_container-custom');
    }
  }
}

defineElement('hui-container', HuiContainer);

export default HuiContainer;
