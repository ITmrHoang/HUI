/**
 * HUI Stats Counter — Dải số liệu nổi bật ("10.000+ khách hàng") đếm chạy khi cuộn tới (Organism).
 * Nhận `data` [{ value, label, prefix, suffix, format, icon, description }] hoặc phần tử con mang data-*.
 * Mỗi số là một <hui-number> (tự đếm khi vào màn hình). Lưới cột tự co theo bề rộng khung (container query).
 */

import styles from './hui-stats-counter.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-number/hui-number.js';
import '../hui-icon/hui-icon.js';

const FALLBACK = { 'statsCounter.label': { vi: 'Số liệu nổi bật', en: 'Key figures' } };

function msg(key) {
  const v = t(key);
  if (v !== key) return v;
  return FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
}

const FIELDS = ['value', 'label', 'prefix', 'suffix', 'format', 'icon', 'description'];

/** Phần tử con → item: đọc data-* (hoặc attribute cùng tên); label mặc định = chữ bên trong */
function itemFromElement(el) {
  const item = {};
  for (const f of FIELDS) {
    const v = el.dataset[f] ?? el.getAttribute(f);
    if (v !== null && v !== undefined) item[f] = v;
  }
  if (item.label === undefined) item.label = el.textContent.trim();
  return item;
}

/**
 * Dải số liệu. Con trực tiếp (vd `<div data-value="10000" data-suffix="+">Khách hàng</div>`) chỉ dùng làm
 * dữ liệu khi `data` trống — không hiển thị trực tiếp (giao diện thống nhất do component dựng).
 *
 * @fires hui-count-end - Nổi bọt từ từng hui-number khi đếm xong. detail: { value }
 * @csspart base - Lưới (role="list")
 * @csspart item - Mỗi ô số liệu (role="listitem")
 * @csspart icon - Icon
 * @csspart value - Dòng số (chứa hui-number)
 * @csspart number - Phần số của hui-number (part value bên trong)
 * @csspart prefix - Prefix của số
 * @csspart suffix - Suffix của số
 * @csspart label - Nhãn
 * @csspart description - Mô tả phụ
 * @cssprop --hui-stats-counter-gap - Khoảng cách giữa các ô
 * @cssprop --hui-stats-counter-min-width - Bề rộng tối thiểu mỗi ô khi không đặt columns (mặc định 160px)
 * @cssprop --hui-stats-counter-value-size - Cỡ chữ số (mặc định theo size)
 * @cssprop --hui-stats-counter-value-weight - Độ đậm số
 * @cssprop --hui-stats-counter-value-color - Màu số
 * @cssprop --hui-stats-counter-affix-color - Màu prefix / suffix
 * @cssprop --hui-stats-counter-label-color - Màu nhãn
 * @cssprop --hui-stats-counter-label-size - Cỡ chữ nhãn
 * @cssprop --hui-stats-counter-description-color - Màu mô tả
 * @cssprop --hui-stats-counter-icon-color - Màu icon
 * @cssprop --hui-stats-counter-icon-bg - Nền ô icon
 * @cssprop --hui-stats-counter-item-bg - Nền ô (variant card)
 * @cssprop --hui-stats-counter-item-radius - Bo góc ô (variant card)
 * @cssprop --hui-stats-counter-item-padding - Đệm trong ô
 * @cssprop --hui-stats-counter-item-shadow - Đổ bóng ô (variant card)
 * @cssprop --hui-stats-counter-divider-color - Màu vạch chia (variant divided)
 */
class HuiStatsCounter extends HuiElement {
  static localized = true;

  static properties = {
    /** Mảng số liệu [{ value, label, prefix, suffix, format, icon, description }] */
    data: { type: Array },
    /** plain | card | divided — chữ trơn / mỗi ô một thẻ / vạch chia giữa các ô */
    variant: { type: String, default: 'plain' },
    /** Số cột cố định (tự giảm còn 2 → 1 cột khi khung hẹp); bỏ trống = tự chia theo bề rộng */
    columns: { type: Number },
    /** sm | md | lg — cỡ chữ số */
    size: { type: String, default: 'md' },
    /** center | start — căn nội dung trong ô */
    align: { type: String, default: 'center' },
    /** Thời lượng đếm (ms) */
    duration: { type: Number, default: 2000 },
    /** Mỗi ô sau đếm lâu hơn ô trước bấy nhiêu ms — các số dừng lần lượt (0 = cùng lúc) */
    stagger: { type: Number, default: 0 },
    /** Tắt đếm chạy */
    noAnimation: { type: Boolean },
    /** Tên vùng cho trình đọc màn hình (mặc định "Số liệu nổi bật") */
    label: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    this._observer = null;
  }

  /** Danh sách item đang hiển thị (từ data hoặc phần tử con) */
  get items() {
    if (Array.isArray(this.data) && this.data.length) return this.data;
    return [...this.children].filter((c) => c.tagName !== 'TEMPLATE' && c.tagName !== 'STYLE' && c.tagName !== 'SCRIPT').map(itemFromElement);
  }

  connectedCallback() {
    super.connectedCallback();
    this._observer = new MutationObserver(() => {
      if (!(Array.isArray(this.data) && this.data.length)) this._build();
    });
    this._observer.observe(this, { childList: true, subtree: true, attributes: true, characterData: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = null;
  }

  render() {
    this._grid = createElement('div', { className: 'sc', part: 'base', role: 'list' });
    return this._grid;
  }

  updated(changed) {
    if (['variant', 'size', 'align', 'columns'].some((k) => changed.has(k))) {
      const cols = Number(this.columns);
      const fixed = Number.isFinite(cols) && cols > 0;
      this._grid.className = [
        'sc',
        `sc--${['plain', 'card', 'divided'].includes(this.variant) ? this.variant : 'plain'}`,
        `sc--${['sm', 'md', 'lg'].includes(this.size) ? this.size : 'md'}`,
        this.align === 'start' ? 'sc--start' : '',
        fixed ? 'sc--fixed' : '',
        fixed && cols > 2 ? 'sc--fixed-many' : '',
      ].filter(Boolean).join(' ');
      if (fixed) this._grid.style.setProperty('--_sc-cols', String(Math.round(cols)));
      else this._grid.style.removeProperty('--_sc-cols');
    }
    if (changed.has('label') || changed.has('locale')) this._grid.setAttribute('aria-label', this.label || msg('statsCounter.label'));
    if (changed.has('data')) this._build();
    else if (changed.has('duration') || changed.has('noAnimation') || changed.has('stagger')) this._syncNumbers();
  }

  _build() {
    const items = this.items;
    this._grid.replaceChildren(...items.map((item, i) => this._renderItem(item || {}, i)));
    this._syncNumbers();
  }

  _renderItem(item, index) {
    const nodes = [];
    if (item.icon) {
      nodes.push(createElement('span', { className: 'sc__icon', part: 'icon', 'aria-hidden': 'true' },
        createElement('hui-icon', { name: String(item.icon) })));
    }
    const raw = item.value;
    const numeric = raw !== null && raw !== undefined && raw !== '' && Number.isFinite(Number(raw));
    let valueEl;
    if (numeric) {
      valueEl = createElement('hui-number', {
        value: String(raw),
        format: item.format || 'number',
        exportparts: 'value: number, prefix, suffix',
        'data-index': String(index),
      });
      if (item.prefix) valueEl.setAttribute('prefix', String(item.prefix));
      if (item.suffix) valueEl.setAttribute('suffix', String(item.suffix));
    } else {
      // Giá trị không phải số ("24/7") → hiện nguyên văn
      valueEl = createElement('span', { className: 'sc__text' }, `${item.prefix ?? ''}${raw ?? ''}${item.suffix ?? ''}`);
    }
    nodes.push(createElement('div', { className: 'sc__value', part: 'value' }, valueEl));
    if (item.label) nodes.push(createElement('div', { className: 'sc__label', part: 'label' }, String(item.label)));
    if (item.description) nodes.push(createElement('div', { className: 'sc__desc', part: 'description' }, String(item.description)));
    return createElement('div', { className: 'sc__item', part: 'item', role: 'listitem' }, ...nodes);
  }

  _syncNumbers() {
    const stagger = Math.max(0, Number(this.stagger) || 0);
    this._grid.querySelectorAll('hui-number').forEach((n, i) => {
      // Mỗi ô đếm lâu hơn ô trước một chút → cảm giác chạy lần lượt mà vẫn kết thúc gần nhau
      n.setAttribute('duration', String((Number(this.duration) || 2000) + i * stagger));
      n.toggleAttribute('no-animation', this.noAnimation);
    });
  }
}

defineElement('hui-stats-counter', HuiStatsCounter);

export default HuiStatsCounter;
