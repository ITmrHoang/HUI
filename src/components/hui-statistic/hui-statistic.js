/**
 * HUI Statistic — Hiển thị số liệu thống kê (Ant Statistic). Parts/slots/biến CSS: xem JSDoc của class.
 */

import styles from './hui-statistic.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { getLocaleName } from '../../core/locale.js';
import { prefersReducedMotion } from '../../utils/motion.js';

const TYPES = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];
const NUMERIC = /^(-?)(\d*)(?:\.(\d+))?$/;

/** Dấu phân tách nghìn / thập phân theo ngôn ngữ (vi: "." và ","; en: "," và ".") — cache theo locale */
const separatorCache = new Map();
export function getSeparators(locale = getLocaleName()) {
  if (!separatorCache.has(locale)) {
    let group = ',';
    let decimal = '.';
    try {
      const parts = new Intl.NumberFormat(locale).formatToParts(1234567.5);
      group = parts.find((p) => p.type === 'group')?.value ?? group;
      decimal = parts.find((p) => p.type === 'decimal')?.value ?? decimal;
    } catch { /* locale không hợp lệ → mặc định en */ }
    separatorCache.set(locale, { group, decimal });
  }
  return separatorCache.get(locale);
}

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * Tiêu đề + giá trị lớn (prefix / số / suffix). Số được phân tách nghìn theo ngôn ngữ hiện tại,
 * làm tròn theo `precision`; giá trị đổi → đếm dần tới số mới (tắt khi prefers-reduced-motion).
 * Giá trị không phải số (vd "N/A") hiển thị nguyên văn.
 *
 * @slot title - Tiêu đề tùy biến (thay attribute title)
 * @slot prefix - Tiền tố tùy biến (vd: icon)
 * @slot suffix - Hậu tố tùy biến
 * @csspart base - Khung ngoài
 * @csspart title - Tiêu đề
 * @csspart content - Hàng prefix + giá trị + suffix
 * @csspart prefix - Tiền tố
 * @csspart value - Giá trị
 * @csspart value-int - Phần nguyên (kèm dấu âm)
 * @csspart value-decimal - Phần thập phân (kèm dấu thập phân)
 * @csspart suffix - Hậu tố
 * @csspart skeleton - Khối placeholder khi loading
 * @cssprop --hui-statistic-title-color - Màu tiêu đề
 * @cssprop --hui-statistic-title-font-size - Cỡ chữ tiêu đề
 * @cssprop --hui-statistic-value-color - Màu giá trị (ghi đè type)
 * @cssprop --hui-statistic-value-font-size - Cỡ chữ giá trị
 * @cssprop --hui-statistic-decimal-font-size - Cỡ chữ phần thập phân (mặc định bằng phần nguyên)
 * @cssprop --hui-statistic-value-font-family - Font giá trị
 * @cssprop --hui-statistic-skeleton-width - Chiều rộng placeholder loading
 */
class HuiStatistic extends HuiElement {
  static localized = true;

  static properties = {
    /** Tiêu đề (hoặc slot="title") */
    title: { type: String },
    /** Giá trị: số (property number hoặc chuỗi số "1128.5") hoặc chuỗi bất kỳ */
    value: { type: String },
    /** Số chữ số thập phân (làm tròn). Bỏ trống → giữ nguyên */
    precision: { type: Number },
    /** Tiền tố (hoặc slot="prefix") */
    prefix: { type: String },
    /** Hậu tố (hoặc slot="suffix") */
    suffix: { type: String },
    /** Dấu phân tách nghìn. Bỏ trống → theo ngôn ngữ hiện tại (vi ".", en ","); group-separator="" để bỏ */
    groupSeparator: { type: String },
    /** Dấu thập phân. Bỏ trống → theo ngôn ngữ hiện tại (vi ",", en ".") */
    decimalSeparator: { type: String },
    /** primary | secondary | success | warning | danger | info — màu giá trị */
    type: { type: String },
    /** Hiện placeholder nhấp nháy thay cho giá trị */
    loading: { type: Boolean },
    /** Đếm dần khi value đổi. Mặc định bật; animated="false" để tắt */
    animated: { type: String },
    /** Thời gian đếm dần (ms) */
    duration: { type: Number, default: 800 },
    /** (value) => string | Node — tự định dạng giá trị, chỉ gán bằng property */
    formatter: { type: Object, attribute: false },
  };

  static styles = styles;

  render() {
    const slot = (name, fallback) => {
      const s = createElement('slot', { name }, fallback);
      s.addEventListener('slotchange', () => this._syncSections());
      return s;
    };
    this._titleText = createElement('span');
    this._prefixText = createElement('span');
    this._suffixText = createElement('span');
    this._titleSlot = slot('title', this._titleText);
    this._prefixSlot = slot('prefix', this._prefixText);
    this._suffixSlot = slot('suffix', this._suffixText);

    this._title = createElement('div', { className: 'hui-statistic__title', part: 'title' }, this._titleSlot);
    this._prefix = createElement('span', { className: 'hui-statistic__prefix', part: 'prefix' }, this._prefixSlot);
    this._suffix = createElement('span', { className: 'hui-statistic__suffix', part: 'suffix' }, this._suffixSlot);
    this._int = createElement('span', { className: 'hui-statistic__int', part: 'value-int' });
    this._decimal = createElement('span', { className: 'hui-statistic__decimal', part: 'value-decimal' });
    this._value = createElement('span', { className: 'hui-statistic__value', part: 'value' }, this._int, this._decimal);
    this._skeleton = createElement('span', { className: 'hui-statistic__skeleton', part: 'skeleton', 'aria-hidden': 'true' });
    this._content = createElement('div', { className: 'hui-statistic__content', part: 'content' },
      this._prefix, this._value, this._skeleton, this._suffix);

    this._base = createElement('div', { className: 'hui-statistic', part: 'base' }, this._title, this._content);
    return this._base;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopCount();
  }

  updated(changed) {
    if (changed.has('title')) this._titleText.textContent = this.title || '';
    if (changed.has('prefix')) this._prefixText.textContent = this.prefix || '';
    if (changed.has('suffix')) this._suffixText.textContent = this.suffix || '';
    if (changed.has('type')) {
      this._content.className = ['hui-statistic__content', TYPES.includes(this.type) ? `hui-statistic--${this.type}` : '']
        .filter(Boolean).join(' ');
    }
    if (changed.has('loading')) {
      this._base.setAttribute('aria-busy', String(this.loading));
      this._value.hidden = this.loading;
      this._skeleton.hidden = !this.loading;
    }
    if (['value', 'precision', 'groupSeparator', 'decimalSeparator', 'formatter', 'locale'].some((k) => changed.has(k))) {
      this._valueChanged(changed);
    }
    this._syncSections();
  }

  _syncSections() {
    if (!this._base) return;
    this._title.hidden = !(this.title || hasContent(this._titleSlot));
    this._prefix.hidden = !(this.prefix || hasContent(this._prefixSlot));
    this._suffix.hidden = !(this.suffix || hasContent(this._suffixSlot));
  }

  /** Giá trị đổi: đếm dần từ số cũ (nếu có) hoặc vẽ ngay */
  _valueChanged(changed) {
    const prev = this._shown;
    const next = this._toNumber(this.value);
    const canAnimate = changed.has('value') && this._didRender
      && this.animated !== 'false' && this.animated !== false
      && typeof this.formatter !== 'function'
      && Number.isFinite(prev) && Number.isFinite(next) && prev !== next
      && !prefersReducedMotion() && this.duration > 0;
    this._didRender = true;
    if (canAnimate) this._countTo(prev, next);
    else {
      this._stopCount();
      this._renderValue(this.value);
    }
  }

  /** Chuỗi/số hợp lệ → number; còn lại NaN */
  _toNumber(v) {
    if (v === null || v === undefined) return NaN;
    const raw = String(v).trim();
    return NUMERIC.test(raw) && raw !== '' && raw !== '-' ? Number(raw) : NaN;
  }

  /** Số chữ số thập phân dùng khi hiển thị (precision hoặc theo chính giá trị) */
  _decimals(v) {
    if (Number.isFinite(this.precision) && this.precision >= 0) return Math.min(20, Math.floor(this.precision));
    const m = String(v ?? '').trim().match(NUMERIC);
    return m && m[3] ? m[3].length : 0;
  }

  /**
   * Tách số thành { neg, int, dec } đã định dạng. Không phải số → null.
   * Có precision → làm tròn bằng toFixed; không có → giữ nguyên chữ số của chuỗi gốc.
   */
  formatParts(value) {
    if (Number.isNaN(this._toNumber(value))) return null;
    let raw = String(value).trim();
    if (Number.isFinite(this.precision) && this.precision >= 0) raw = Number(raw).toFixed(this._decimals(raw));
    const [, neg, int, dec = ''] = raw.match(NUMERIC);
    const { group, decimal } = getSeparators();
    const groupSep = this.groupSeparator ?? group;
    const decimalSep = this.decimalSeparator ?? decimal;
    const intPart = (int.replace(/^0+(?=\d)/, '') || '0').replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
    // "-0.00" sau làm tròn → bỏ dấu âm
    const isZero = /^0*$/.test(int) && /^0*$/.test(dec);
    return { neg: isZero ? '' : neg, int: intPart, dec: dec ? `${decimalSep}${dec}` : '' };
  }

  _renderValue(value) {
    this._shown = this._toNumber(value);
    if (typeof this.formatter === 'function') {
      const out = this.formatter(value);
      this._int.replaceChildren(out instanceof Node ? out : document.createTextNode(String(out ?? '')));
      this._decimal.textContent = '';
      this._decimal.hidden = true;
      return;
    }
    const parts = this.formatParts(value);
    if (!parts) {
      this._int.textContent = value === null || value === undefined ? '' : String(value);
      this._decimal.textContent = '';
    } else {
      this._int.textContent = `${parts.neg}${parts.int}`;
      this._decimal.textContent = parts.dec;
    }
    this._decimal.hidden = !this._decimal.textContent;
  }

  /** Đếm dần bằng requestAnimationFrame; khung cuối vẽ đúng giá trị gốc */
  _countTo(from, to) {
    this._stopCount();
    const decimals = this._decimals(this.value);
    const target = this.value;
    const start = performance.now();
    const duration = this.duration;
    this._base.setAttribute('aria-busy', 'true'); // Trình đọc màn hình chờ số cuối cùng
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      if (t >= 1) {
        this._stopCount();
        this._renderValue(target);
        return;
      }
      const current = from + (to - from) * easeOutCubic(t);
      this._renderValue(current.toFixed(decimals));
      this._shown = current;
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  _stopCount() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._base?.setAttribute('aria-busy', String(Boolean(this.loading)));
  }
}

defineElement('hui-statistic', HuiStatistic);

export { HuiStatistic };
export default HuiStatistic;
