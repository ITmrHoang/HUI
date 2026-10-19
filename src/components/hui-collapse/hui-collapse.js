/**
 * HUI Collapse — Nhóm panel đóng/mở (Ant Collapse + MUI Accordion). Parts/slots/biến CSS: xem JSDoc của class.
 */

import styles from './hui-collapse.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/** "1, 2" | ['1', 2] | null → ['1', '2'] */
export function parseKeys(value) {
  if (value === null || value === undefined || value === '') return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list.map((k) => String(k).trim()).filter((k) => k !== '');
}

const SIZES = ['sm', 'md', 'lg'];

/**
 * Bọc các <hui-collapse-panel>; quản lý panel nào đang mở (`active-key`), chế độ accordion.
 * Panel không khai báo `key` → dùng chỉ số (0, 1, 2...).
 *
 * @fires change - Panel được mở/đóng bởi người dùng (detail { activeKeys: string[] })
 * @slot - Các <hui-collapse-panel>
 * @csspart base - Khung ngoài
 * @cssprop --hui-collapse-bg - Nền khung (mặc định --hui-fill-tertiary; ghost: trong suốt)
 * @cssprop --hui-collapse-border-color - Màu viền khung và đường kẻ giữa các panel
 * @cssprop --hui-collapse-radius - Bo góc khung
 * @cssprop --hui-collapse-header-bg - Nền header panel
 * @cssprop --hui-collapse-header-padding - Khoảng đệm header (mặc định theo size)
 * @cssprop --hui-collapse-header-color - Màu chữ header
 * @cssprop --hui-collapse-content-bg - Nền vùng nội dung
 * @cssprop --hui-collapse-content-padding - Khoảng đệm nội dung (mặc định theo size)
 * @cssprop --hui-collapse-content-color - Màu chữ nội dung
 * @cssprop --hui-collapse-icon-color - Màu mũi tên
 */
class HuiCollapse extends HuiElement {
  static properties = {
    /** Key các panel đang mở — property là mảng, attribute là danh sách phân tách bằng dấu phẩy ("1,3") */
    activeKey: { type: String },
    /** Chỉ mở tối đa 1 panel cùng lúc */
    accordion: { type: Boolean },
    /** Viền ngoài + kẻ giữa panel. Mặc định bật; bordered="false" để tắt */
    bordered: { type: String },
    /** Trong suốt hoàn toàn: không nền, không viền */
    ghost: { type: Boolean },
    /** sm | md | lg — khoảng đệm header / nội dung */
    size: { type: String, default: 'md' },
    /** start | end — vị trí mũi tên trong header */
    expandIconPosition: { type: String, default: 'start' },
  };

  static styles = styles;

  /** Luôn trả về mảng key (string) */
  get activeKey() {
    const keys = parseKeys(this._getProp('activeKey'));
    return this.accordion ? keys.slice(0, 1) : keys;
  }

  set activeKey(value) {
    // Lưu dạng chuỗi chuẩn hóa → so sánh được, reflect ra attribute "1,2"
    const keys = parseKeys(value);
    this._setProp('activeKey', keys.length ? keys.join(',') : null);
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncPanels());
    this._base = createElement('div', { part: 'base' }, this._slot);
    // Panel phát yêu cầu đóng/mở → collapse quyết định (accordion, controlled key)
    this.addEventListener('hui-collapse-panel-toggle', (e) => this._onPanelToggle(e));
    return this._base;
  }

  updated(changed) {
    if (['bordered', 'ghost', 'size', 'expandIconPosition'].some((k) => changed.has(k))) {
      const size = SIZES.includes(this.size) ? this.size : 'md';
      const bordered = this.bordered !== 'false' && this.bordered !== false;
      this._base.className = [
        'hui-collapse',
        `hui-collapse--${size}`,
        this.ghost ? 'hui-collapse--ghost' : bordered ? 'hui-collapse--bordered' : 'hui-collapse--borderless',
        this.expandIconPosition === 'end' ? 'hui-collapse--icon-end' : 'hui-collapse--icon-start',
      ].join(' ');
    }
    if (changed.has('activeKey') || changed.has('accordion')) this._syncPanels();
  }

  /** Panel con trực tiếp (bỏ qua panel của collapse lồng bên trong) */
  _panels() {
    return Array.from(this.children).filter((el) => el.localName === 'hui-collapse-panel');
  }

  _syncPanels() {
    const keys = this.activeKey;
    this._panels().forEach((panel, index) => {
      const key = panel.getAttribute('key') ?? String(index);
      panel._collapseKey = key;
      panel.active = keys.includes(key);
    });
  }

  _onPanelToggle(e) {
    const panel = e.target;
    if (panel.parentElement !== this) return; // Sự kiện từ collapse lồng bên trong
    e.preventDefault(); // Báo cho panel: collapse đã xử lý
    e.stopPropagation();

    const key = panel._collapseKey ?? panel.getAttribute('key');
    const keys = this.activeKey;
    let next;
    if (keys.includes(key)) next = keys.filter((k) => k !== key);
    else next = this.accordion ? [key] : [...keys, key];

    this.activeKey = next;
    this._syncPanels(); // Đồng bộ ngay để aria-expanded đúng trong cùng tick
    this.emit('change', { activeKeys: next });
  }
}

defineElement('hui-collapse', HuiCollapse);

export default HuiCollapse;
