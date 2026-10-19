/**
 * HUI Space — Khoảng cách đều giữa các phần tử (Ant Space + Space.Compact)
 * Mỗi con được bọc trong một ô riêng (part="item") nhờ gán slot thủ công (slotAssignment: 'manual')
 * → chèn được phần tử phân cách (split) giữa các ô mà không đụng vào DOM của người dùng.
 * compact: gộp viền các nút/ô nhập liền nhau (bo góc ngoài cùng, chồng viền 1px).
 * Biến CSS: xem đầu hui-space.css.
 */

import styles from './hui-space.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { toGap } from '../hui-flex/hui-flex.js';

/**
 * @slot - Các phần tử con (mỗi con nằm trong một ô part="item")
 * @slot split - Phần tử phân cách, được nhân bản chèn giữa các ô (vd: <hui-divider orientation="vertical">)
 * @csspart base - Khung flex bên trong
 * @csspart item - Ô bọc từng phần tử con
 * @csspart split - Ô chứa phần tử phân cách
 * @cssprop --hui-space-gap - Khoảng cách mặc định khi không có attribute size (mặc định 8px)
 * @cssprop --hui-space-split-color - Màu phân cách dạng chữ (attribute split)
 * @cssprop --hui-space-compact-radius - Bo góc ngoài cùng khi compact (mặc định --hui-radius)
 */
class HuiSpace extends HuiElement {
  static properties = {
    /** none | xs | sm | md | lg | xl — hoặc số (px) / độ dài CSS; "h,v" = khoảng cách ngang, dọc */
    size: { type: String },
    /** horizontal | vertical — hướng xếp */
    direction: { type: String, default: 'horizontal' },
    /** start | center | end | baseline | stretch — căn theo trục phụ (ngang mặc định center) */
    align: { type: String },
    /** Tự xuống dòng khi hết chỗ */
    wrap: { type: Boolean },
    /** Chuỗi phân cách đơn giản giữa các phần tử (vd: "|"); slot="split" được ưu tiên */
    split: { type: String },
    /** Gộp viền các nút / ô nhập liền nhau (Space.Compact) */
    compact: { type: Boolean },
    /** Chiếm toàn bộ chiều ngang (compact: các phần tử giãn đều) */
    block: { type: Boolean },
  };

  static styles = styles;

  /** Bật gán slot thủ công — HuiElement gọi this.attachShadow() trong constructor */
  attachShadow(init) {
    try {
      return super.attachShadow({ ...init, slotAssignment: 'manual' });
    } catch {
      return super.attachShadow(init);
    }
  }

  constructor() {
    super();
    this._observer = null;
  }

  render() {
    this._base = createElement('div', { className: 'space', part: 'base' });
    this._manual = this.shadowRoot.slotAssignment === 'manual' && typeof HTMLSlotElement.prototype.assign === 'function';
    // Trình duyệt cũ: 1 slot chung, chỉ có gap (không có split / ô bọc)
    if (!this._manual) this._base.append(createElement('slot'));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._manual) return;
    this._observer = new MutationObserver(() => this._buildItems());
    this._observer.observe(this, { childList: true });
    this._buildItems();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
  }

  updated(changed) {
    const base = this._base;
    const vertical = this.direction === 'vertical';
    base.classList.toggle('space--vertical', vertical);
    base.classList.toggle('space--compact', this.compact);
    base.classList.toggle('space--wrap', this.wrap);

    // "h,v" hoặc "h v" → column-gap, row-gap
    const parts = String(this.size ?? '').split(/[,\s]+/).filter(Boolean);
    const h = toGap(parts[0]);
    const v = toGap(parts[1] ?? parts[0]);
    const fallback = 'var(--hui-space-gap, var(--hui-space-sm))';
    base.style.setProperty('--_space-gap-x', h ?? fallback);
    base.style.setProperty('--_space-gap-y', v ?? fallback);

    if (changed.has('split') && this._manual) this._buildItems();
  }

  /** Dựng lại các ô: mỗi con (bỏ khoảng trắng và slot="split") một ô, chèn split giữa các ô */
  _buildItems() {
    if (!this._manual) return;
    const nodes = [...this.childNodes].filter((n) =>
      n.nodeType === Node.ELEMENT_NODE ? n.getAttribute('slot') !== 'split' : n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== ''
    );
    const splitEls = [...this.children].filter((el) => el.getAttribute('slot') === 'split');

    const frag = document.createDocumentFragment();
    const assignments = [];
    nodes.forEach((node, i) => {
      if (i > 0 && (splitEls.length || this.split)) {
        // Phần tử split chỉ gán được vào 1 slot → ô đầu dùng bản gốc, các ô sau dùng bản sao
        const split = createElement('span', { className: 'space__split', part: 'split', 'aria-hidden': 'true' });
        if (splitEls.length) {
          if (i === 1) {
            const slot = createElement('slot');
            split.append(slot);
            assignments.push([slot, splitEls]);
          } else {
            for (const el of splitEls) split.append(el.cloneNode(true));
          }
        } else {
          split.textContent = this.split;
        }
        frag.append(split);
      }

      const slot = createElement('slot');
      const cls = ['space__item'];
      if (i === 0) cls.push('space__item--first');
      if (i === nodes.length - 1) cls.push('space__item--last');
      frag.append(createElement('div', { className: cls.join(' '), part: 'item' }, slot));
      assignments.push([slot, [node]]);
    });

    this._base.replaceChildren(frag);
    for (const [slot, assigned] of assignments) slot.assign(...assigned);
  }
}

defineElement('hui-space', HuiSpace);

export default HuiSpace;
