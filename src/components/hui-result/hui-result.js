/**
 * HUI Result — Trang kết quả / thông báo trạng thái lớn (Ant Result)
 *   <hui-result status="success" title="Đặt hàng thành công" sub-title="Mã đơn: 2024-001">
 *     <hui-button slot="extra">Về trang chủ</hui-button>
 *   </hui-result>
 * status 404 / 403 / 500: hình minh họa SVG vẽ bằng token (tự đổi theo dark mode).
 * Biến CSS: xem đầu hui-result.css.
 */

import styles from './hui-result.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/hui-icon.js';

const ICON_STATUSES = ['success', 'error', 'info', 'warning'];

// Hình minh họa (viewBox 250x200). Nội dung cố định của thư viện, không chứa dữ liệu người dùng.
const GROUND = '<ellipse class="ill-ground" cx="125" cy="184" rx="104" ry="11"/><circle class="ill-soft" cx="125" cy="96" r="84"/>';
const pill = (code) => `<rect class="ill-main" x="170" y="22" width="56" height="26" rx="13"/><text x="198" y="40" font-size="15" text-anchor="middle" style="fill: var(--hui-text-inverse); font-family: var(--hui-font-family); font-weight: 700">${code}</text>`;

const ILLUSTRATIONS = {
  // Trang giấy + kính lúp: không tìm thấy
  404: `${GROUND}
    <rect class="ill-paper" x="66" y="38" width="100" height="130" rx="8"/>
    <path class="ill-line" d="M84 62h52M84 78h64M84 94h40"/>
    <text class="ill-text" x="116" y="148" font-size="34" text-anchor="middle">404</text>
    <circle class="ill-mid" cx="172" cy="96" r="26" fill-opacity="0.45"/>
    <circle class="ill-stroke" cx="172" cy="96" r="26"/>
    <path class="ill-stroke" d="m191 115 22 22" stroke-width="8"/>`,
  // Khiên + ổ khóa: không có quyền
  403: `${GROUND}
    <path class="ill-mid" d="M125 30 180 51v47c0 35-23 60-55 72-32-12-55-37-55-72V51Z"/>
    <path class="ill-paper" d="M125 45 167 61v37c0 27-18 47-42 57-24-10-42-30-42-57V61Z"/>
    <path class="ill-stroke" d="M112 98V88a13 13 0 0 1 26 0v10"/>
    <rect class="ill-main" x="104" y="96" width="42" height="34" rx="6"/>
    <circle cx="125" cy="110" r="4.5" style="fill: var(--hui-bg-elevated)"/>
    <path d="M125 113v8" stroke-width="4" stroke-linecap="round" style="stroke: var(--hui-bg-elevated)"/>
    ${pill(403)}`,
  // Tủ máy chủ + tia sét: lỗi máy chủ
  500: `${GROUND}
    <rect class="ill-paper" x="72" y="46" width="96" height="36" rx="6"/>
    <rect class="ill-paper" x="72" y="90" width="96" height="36" rx="6"/>
    <rect class="ill-paper" x="72" y="134" width="96" height="36" rx="6"/>
    <circle class="ill-main" cx="89" cy="64" r="5"/>
    <circle class="ill-danger" cx="89" cy="108" r="5"/>
    <circle class="ill-main" cx="89" cy="152" r="5"/>
    <path class="ill-line" d="M104 64h46M104 108h46M104 152h46"/>
    <path class="ill-warning" d="M186 62 164 108h16l-10 38 32-50h-17l11-34Z"/>
    ${pill(500)}`,
};

/** Slot có nội dung thật (bỏ qua text chỉ toàn khoảng trắng) */
const hasNodes = (slot) => slot.assignedNodes({ flatten: true }).some(
  (n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim() !== ''
);

/**
 * @slot - Nội dung chi tiết (khung nền nhạt bên dưới)
 * @slot icon - Icon / hình minh họa tùy biến
 * @slot title - Tiêu đề HTML (thay attribute title)
 * @slot sub-title - Phụ đề HTML (thay attribute sub-title)
 * @slot extra - Vùng nút hành động
 * @csspart base - Khung ngoài
 * @csspart icon - Vùng icon / hình minh họa
 * @csspart image - Hình SVG minh họa (404 / 403 / 500)
 * @csspart title - Tiêu đề
 * @csspart subtitle - Phụ đề
 * @csspart extra - Vùng hành động
 * @csspart content - Vùng nội dung chi tiết
 * @cssprop --hui-result-padding - Padding khung
 * @cssprop --hui-result-icon-size - Kích thước icon (72px)
 * @cssprop --hui-result-icon-color - Màu icon (ghi đè màu theo status)
 * @cssprop --hui-result-image-width - Chiều rộng hình minh họa (250px)
 * @cssprop --hui-result-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-result-title-color - Màu tiêu đề
 * @cssprop --hui-result-subtitle-color - Màu phụ đề
 * @cssprop --hui-result-content-bg - Nền vùng nội dung
 */
class HuiResult extends HuiElement {
  static properties = {
    /** success | error | info | warning | 404 | 403 | 500 — 3 mã lỗi dùng hình minh họa thay icon */
    status: { type: String, default: 'info' },
    /** Tiêu đề. Attribute bị gỡ khỏi host để không hiện tooltip native */
    title: { type: String, reflect: false },
    /** Phụ đề / mô tả ngắn */
    subTitle: { type: String },
  };

  static styles = styles;

  render() {
    this._icon = createElement('hui-icon');
    this._image = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this._image.setAttribute('viewBox', '0 0 250 200');
    this._image.setAttribute('class', 'image');
    this._image.setAttribute('part', 'image');
    this._image.setAttribute('aria-hidden', 'true');
    this._iconWrap = createElement('div', { className: 'icon', part: 'icon' },
      createElement('slot', { name: 'icon' }, this._icon, this._image));

    this._titleText = document.createTextNode('');
    this._titleSlot = createElement('slot', { name: 'title' }, this._titleText);
    this._title = createElement('div', { className: 'title', part: 'title' }, this._titleSlot);

    this._subText = document.createTextNode('');
    this._subSlot = createElement('slot', { name: 'sub-title' }, this._subText);
    this._sub = createElement('div', { className: 'subtitle', part: 'subtitle' }, this._subSlot);

    this._extraSlot = createElement('slot', { name: 'extra' });
    this._extra = createElement('div', { className: 'extra', part: 'extra' }, this._extraSlot);

    this._contentSlot = createElement('slot');
    this._content = createElement('div', { className: 'content', part: 'content' }, this._contentSlot);

    for (const slot of [this._titleSlot, this._subSlot, this._extraSlot, this._contentSlot]) {
      slot.addEventListener('slotchange', () => this._syncSlots());
    }

    this._base = createElement('div', { className: 'result', part: 'base' },
      this._iconWrap, this._title, this._sub, this._extra, this._content);
    return this._base;
  }

  /** Alias `title`: lưu nội dung rồi gỡ attribute khỏi host (tránh tooltip native chồng lên) */
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'title') {
      if (newVal === null) return;
      super.attributeChangedCallback(name, oldVal, newVal);
      this.removeAttribute('title');
      return;
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }

  updated(changed) {
    if (changed.has('status')) {
      const status = String(this.status || 'info');
      const illustration = ILLUSTRATIONS[status];
      const iconStatus = ICON_STATUSES.includes(status) ? status : 'info';
      this._base.className = `result result--${illustration ? `code-${status}` : iconStatus}`;
      this._icon.hidden = Boolean(illustration);
      this._image.style.display = illustration ? '' : 'none';
      if (illustration) this._image.innerHTML = illustration;
      else this._icon.setAttribute('name', iconStatus);
    }
    if (changed.has('title')) this._titleText.data = this.title || '';
    if (changed.has('subTitle')) this._subText.data = this.subTitle || '';
    this._syncSlots();
  }

  _syncSlots() {
    this._title.hidden = !this.title && !hasNodes(this._titleSlot);
    this._sub.hidden = !this.subTitle && !hasNodes(this._subSlot);
    this._extra.hidden = !hasNodes(this._extraSlot);
    this._content.hidden = !hasNodes(this._contentSlot);
  }
}

defineElement('hui-result', HuiResult);

export default HuiResult;
