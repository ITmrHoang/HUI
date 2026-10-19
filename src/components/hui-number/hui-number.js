/**
 * HUI Number — Hiển thị số đã định dạng theo locale (Atom), đếm chạy (count-up) khi giá trị đổi
 * và khi lần đầu cuộn tới. Định dạng dùng chung core/format.js: number | number:2 | currency | currency:USD | percent | compact.
 */

import styles from './hui-number.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { format as formatValue } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { animationsDisabled } from '../../utils/animate.js';

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/** Số chữ số thập phân của một số (12.5 → 1, 3e-7 → 7) — để làm tròn giá trị trung gian khi đếm */
export function decimalsOf(n) {
  const s = String(n);
  const exp = s.match(/e-(\d+)$/i);
  if (exp) return Math.min(20, Number(exp[1]));
  const i = s.indexOf('.');
  return i < 0 ? 0 : Math.min(20, s.length - i - 1);
}

const toFinite = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Số đã định dạng. Phần hiển thị (đang đếm) ẩn với trình đọc màn hình; một bản sao ẩn luôn chứa giá trị cuối
 * → trình đọc màn hình không đọc các số trung gian. `live` bật aria-live="polite" để thông báo khi giá trị đổi.
 * Bề rộng được giữ sẵn theo giá trị cuối → không xô lệch bố cục khi đếm.
 *
 * @fires hui-count-end - Kết thúc một lượt đếm chạy. detail: { value }
 * @csspart base - Khung hiển thị (aria-hidden)
 * @csspart prefix - Chữ đứng trước số
 * @csspart value - Số đã định dạng
 * @csspart suffix - Chữ đứng sau số
 * @cssprop --hui-number-color - Màu chữ
 * @cssprop --hui-number-font-size - Cỡ chữ
 * @cssprop --hui-number-font-weight - Độ đậm
 * @cssprop --hui-number-font-family - Font chữ
 * @cssprop --hui-number-numeric - font-variant-numeric (mặc định tabular-nums — chữ số đều nhau, không nhảy khi đếm)
 * @cssprop --hui-number-affix-color - Màu prefix / suffix
 * @cssprop --hui-number-align - Căn số trong ô giữ chỗ khi đếm (mặc định end)
 */
class HuiNumber extends HuiElement {
  static localized = true;

  static properties = {
    /** Giá trị số (chuỗi số cũng được) */
    value: { type: Number },
    /** number | number:2 | currency | currency:USD | percent | percent:0 | compact — xem core/format.js */
    format: { type: String, default: 'number' },
    /** Chữ trước số, vd "~" hoặc "$" */
    prefix: { type: String },
    /** Chữ sau số, vd "+" hoặc " khách hàng" */
    suffix: { type: String },
    /** 'false' = tắt đếm chạy, hiện ngay giá trị cuối (mặc định bật) */
    countUp: { type: String, default: 'true' },
    /** Thời lượng một lượt đếm (ms) */
    duration: { type: Number, default: 1200 },
    /** Giá trị bắt đầu đếm ở lượt đầu tiên (khi cuộn tới) */
    from: { type: Number, default: 0 },
    /** Thông báo giá trị mới cho trình đọc màn hình (aria-live="polite") */
    live: { type: Boolean },
    /** Tắt hiệu ứng (tương đương count-up="false") */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._current = null; // giá trị đang hiển thị (số)
    this._seen = false;   // đã cuộn tới lần nào chưa
    this._raf = 0;
    this._stopView = null;
  }

  /** Chuỗi định dạng của giá trị cuối (không gồm prefix/suffix) */
  get formattedValue() {
    const n = toFinite(this.value);
    return n === null ? '' : formatValue(n, this.format || 'number');
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._seen) this._observe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopView?.();
    this._stopView = null;
    // Đang đếm dở mà bị tháo → nhảy tới giá trị cuối
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      this._paint(toFinite(this.value));
    }
  }

  render() {
    this._prefix = createElement('span', { className: 'num__affix', part: 'prefix' });
    this._value = createElement('span', { className: 'num__value', part: 'value' });
    this._suffix = createElement('span', { className: 'num__affix', part: 'suffix' });
    this._visual = createElement('span', { className: 'num__visual' }, this._prefix, this._value, this._suffix);
    // Ô giữ chỗ (vô hình) mang giá trị cuối → bề rộng cố định trong lúc đếm
    this._ghost = createElement('span', { className: 'num__ghost' });
    this._base = createElement('span', { className: 'num', part: 'base', 'aria-hidden': 'true' }, this._ghost, this._visual);
    this._sr = createElement('span', { className: 'num__sr' });
    return [this._base, this._sr];
  }

  updated(changed) {
    if (changed.has('live')) {
      if (this.live) {
        this._sr.setAttribute('aria-live', 'polite');
        this._sr.setAttribute('aria-atomic', 'true');
      } else {
        this._sr.removeAttribute('aria-live');
        this._sr.removeAttribute('aria-atomic');
      }
    }

    const finalText = this._compose(this.formattedValue);
    this._sr.textContent = finalText;
    this._ghost.textContent = finalText;
    this._prefix.textContent = this.prefix || '';
    this._suffix.textContent = this.suffix || '';
    this._prefix.hidden = !this.prefix;
    this._suffix.hidden = !this.suffix;

    const target = toFinite(this.value);
    const valueChanged = changed.has('value');
    const canAnimate = this._canAnimate() && target !== null;

    if (!canAnimate) {
      this._stopCount();
      this._paint(target);
      return;
    }
    if (!this._seen) {
      // Chưa cuộn tới: hiện giá trị bắt đầu, chờ inView mới đếm
      if (!this._raf) this._paint(toFinite(this.from) ?? 0);
      return;
    }
    if (valueChanged && this._current !== null && this._current !== target) {
      this._countTo(this._current, target);
    } else if (!this._raf) {
      this._paint(this._current ?? target); // đổi format / locale → vẽ lại ngay
    }
  }

  /** Chạy lại hiệu ứng đếm từ `from` tới giá trị hiện tại */
  replay() {
    const target = toFinite(this.value);
    if (target === null) return;
    if (!this._canAnimate()) {
      this._paint(target);
      return;
    }
    this._countTo(toFinite(this.from) ?? 0, target);
  }

  _canAnimate() {
    return this.countUp !== 'false' && !this.noAnimation && Number(this.duration) > 0 && !animationsDisabled();
  }

  _observe() {
    this._stopView?.();
    this._stopView = inView(this, (entry) => {
      if (!entry.isIntersecting || this._seen) return;
      this._seen = true;
      this._stopView?.();
      this._stopView = null;
      const target = toFinite(this.value);
      if (target === null) return;
      if (this._canAnimate()) this._countTo(toFinite(this.from) ?? 0, target);
      else this._paint(target);
    }, { threshold: 0.1 });
  }

  _compose(text) {
    if (!text) return '';
    return `${this.prefix || ''}${text}${this.suffix || ''}`;
  }

  /** Vẽ một giá trị (null = trống) */
  _paint(n) {
    this._current = n;
    this._value.textContent = n === null ? '' : formatValue(n, this.format || 'number');
  }

  /** Đếm dần bằng requestAnimationFrame; khung cuối vẽ đúng giá trị gốc */
  _countTo(from, to) {
    this._stopCount();
    const decimals = decimalsOf(to);
    const duration = Number(this.duration) || 1200;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      if (t >= 1) {
        this._raf = 0;
        this._paint(to);
        this.emit('hui-count-end', { value: to });
        return;
      }
      const current = from + (to - from) * easeOutCubic(t);
      this._paint(Number(current.toFixed(decimals)));
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  _stopCount() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }
}

defineElement('hui-number', HuiNumber);

export default HuiNumber;
