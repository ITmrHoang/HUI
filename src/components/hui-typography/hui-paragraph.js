/**
 * HUI Paragraph — Đoạn văn (Ant Typography.Paragraph + MUI Typography paragraph)
 * Kế thừa hui-text (type, kiểu chữ, copyable) + cắt nhiều dòng có nút "Xem thêm" / "Thu gọn".
 */

import styles from './hui-paragraph.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { t } from '../../core/locale.js';
import { HuiTypographyBase, baseStyles } from './typography-base.js';

/**
 * @fires hui-expand - Bấm "Xem thêm" / "Thu gọn". detail: { expanded }
 * @fires hui-copy - Sao chép thành công. detail: { text }
 * @fires hui-ellipsis - Trạng thái bị cắt chữ thay đổi. detail: { ellipsis }
 * @slot - Nội dung đoạn văn
 * @csspart base - Khung đoạn văn
 * @csspart content - Vùng chữ (bị cắt theo rows)
 * @csspart actions - Vùng nút hành động
 * @csspart copy - Nút sao chép
 * @csspart expand - Nút "Xem thêm" / "Thu gọn"
 * @cssprop --hui-paragraph-color - Màu chữ khi không có type
 * @cssprop --hui-paragraph-font-size - Cỡ chữ (mặc định --hui-font-sm)
 * @cssprop --hui-paragraph-line-height - Chiều cao dòng
 * @cssprop --hui-paragraph-margin - Lề ngoài (mặc định 0 0 1em)
 * @cssprop --hui-typography-action-color - Màu nút "Xem thêm" / sao chép
 */
class HuiParagraph extends HuiTypographyBase {
  static properties = {
    /** Hiện nút "Xem thêm" khi bị cắt chữ (cần ellipsis hoặc rows) */
    expandable: { type: Boolean },
    /** Đang mở rộng toàn văn (bỏ cắt chữ) */
    expanded: { type: Boolean },
  };

  static styles = [baseStyles, styles];

  static baseTag = 'div';

  renderActions(actions) {
    this._expandBtn = createElement('button', { type: 'button', className: 'typo__action typo__expand', part: 'expand' });
    this._expandBtn.addEventListener('click', () => this.toggle());
    actions.append(this._expandBtn);
  }

  /** Mở rộng / thu gọn (phát hui-expand) */
  toggle() {
    this.expanded = !this.expanded;
    this.emit('hui-expand', { expanded: this.expanded });
  }

  clampRows() {
    return this.expanded ? 0 : super.clampRows();
  }

  updateActions() {
    this._syncExpand();
  }

  truncateChanged() {
    this._syncExpand();
    this._actions.hidden = ![...this._actions.children].some((el) => !el.hidden);
  }

  /** "Xem thêm" chỉ hiện khi chữ đang bị cắt; "Thu gọn" luôn hiện khi đang mở rộng */
  _syncExpand() {
    const canClamp = super.clampRows() > 0;
    this._expandBtn.hidden = !this.expandable || !canClamp || (!this.expanded && !this._truncated);
    this._expandBtn.textContent = t(this.expanded ? 'common.collapse' : 'common.more');
    this._expandBtn.setAttribute('aria-expanded', String(this.expanded));
    this._expandBtn.disabled = this.disabled;
  }
}

defineElement('hui-paragraph', HuiParagraph);

export default HuiParagraph;
