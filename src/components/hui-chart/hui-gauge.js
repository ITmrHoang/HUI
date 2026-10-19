/**
 * HUI Gauge — đồng hồ đo một giá trị trong khoảng [min, max], dải màu ngưỡng (thresholds),
 * kiểu cung (arc) hoặc kim (needle). role="meter" cho trình đọc màn hình.
 */

import sharedStyles from './chart-shared.css?raw';
import styles from './hui-gauge.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import {
  svgEl, msg, resolveColor, formatValue, decimalsOf, clamp, lerp, arcPath, polar,
  canAnimate, durationOf, tween,
} from './chart-shared.js';

const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const VARIANTS = ['arc', 'needle'];

/**
 * Gauge: KPI dạng đồng hồ (CPU, tỉ lệ hoàn thành, điểm hài lòng…).
 * Không nhận focus (chỉ hiển thị); giá trị đọc qua role="meter" + aria-valuetext.
 *
 * @slot center - Nội dung giữa (thay giá trị + đơn vị + nhãn)
 * @csspart base - Khung ngoài (role="meter")
 * @csspart svg - Thẻ <svg>
 * @csspart track - Cung nền
 * @csspart band - Một dải ngưỡng
 * @csspart arc - Cung giá trị (variant arc, hoặc needle khi không có thresholds)
 * @csspart needle - Kim (variant needle)
 * @csspart hub - Trục kim
 * @csspart limit - Nhãn min / max (show-limits)
 * @csspart center - Vùng chữ giữa
 * @csspart value - Giá trị
 * @csspart unit - Đơn vị
 * @csspart label - Nhãn dưới giá trị
 * @cssprop --hui-gauge-size - Đường kính (ghi đè attribute size)
 * @cssprop --hui-gauge-color - Màu cung giá trị (ghi đè màu theo ngưỡng)
 * @cssprop --hui-gauge-track-color - Màu cung nền
 * @cssprop --hui-gauge-needle-color - Màu kim + trục
 * @cssprop --hui-gauge-value-color - Màu chữ giá trị
 * @cssprop --hui-gauge-value-font-size - Cỡ chữ giá trị (mặc định theo kích thước)
 * @cssprop --hui-gauge-label-color - Màu nhãn
 * @cssprop --hui-gauge-duration - Thời lượng hiệu ứng quét (mặc định 1000ms; cập nhật = 60%)
 */
class HuiGauge extends HuiElement {
  static localized = true;

  static properties = {
    /** Giá trị hiện tại */
    value: { type: Number, default: 0 },
    /** Giá trị nhỏ nhất */
    min: { type: Number, default: 0 },
    /** Giá trị lớn nhất */
    max: { type: Number, default: 100 },
    /** Dải ngưỡng JSON [{value, color}] — value là CẬN TRÊN của dải (dải đầu bắt đầu từ min) */
    thresholds: { type: Array, default: [] },
    /** Đơn vị sau giá trị (vd "%", "°C", "ms") */
    unit: { type: String },
    /** Định dạng số (format.js): number | number:1 | currency | percent | compact */
    format: { type: String },
    /** Hàm định dạng (value) => string — chỉ gán bằng JS */
    formatter: { type: Object, attribute: false },
    /** arc | needle — tô cung tới giá trị | kim chỉ trên các dải màu */
    variant: { type: String, default: 'arc' },
    /** Đường kính (px) */
    size: { type: Number, default: 200 },
    /** Độ dày cung (px, mặc định ~9% đường kính) */
    thickness: { type: Number },
    /** Góc mở của đồng hồ (độ, 90–300; 180 = nửa vòng) */
    sweep: { type: Number, default: 240 },
    /** Màu cung khi không có thresholds: preset hoặc màu CSS */
    color: { type: String, default: 'primary' },
    /** Nhãn dưới giá trị + tên cho trình đọc màn hình */
    label: { type: String },
    /** Hiện nhãn min / max ở hai đầu cung */
    showLimits: { type: Boolean },
    /** Tắt hiệu ứng quét */
    noAnimation: { type: Boolean },
  };

  static styles = [sharedStyles, styles];

  constructor() {
    super();
    this._shown = null;
    this._entered = false;
  }

  /** Màu (CSS) của dải chứa giá trị hiện tại */
  get currentColor() {
    return this._colorAt(this._clamped);
  }

  render() {
    this._track = svgEl('path', { part: 'track', class: 'gauge__track' });
    this._bandsG = svgEl('g', { class: 'gauge__bands' });
    this._arc = svgEl('path', { part: 'arc', class: 'gauge__arc' });
    this._needlePath = svgEl('path', { class: 'gauge__needle-shape' });
    this._hub = svgEl('circle', { part: 'hub', class: 'gauge__hub' });
    this._needle = svgEl('g', { part: 'needle', class: 'gauge__needle' });
    this._needle.append(this._needlePath);
    this._minText = svgEl('text', { part: 'limit', class: 'gauge__limit', 'text-anchor': 'middle' });
    this._maxText = svgEl('text', { part: 'limit', class: 'gauge__limit', 'text-anchor': 'middle' });
    this._svg = svgEl('svg', { part: 'svg', class: 'gauge__svg', 'aria-hidden': 'true', focusable: 'false' });
    this._svg.append(this._track, this._bandsG, this._arc, this._needle, this._hub, this._minText, this._maxText);

    this._valueText = createElement('span', { className: 'gauge__value-text' });
    this._unit = createElement('span', { className: 'gauge__unit', part: 'unit' });
    this._value = createElement('span', { className: 'gauge__value', part: 'value' }, this._valueText, this._unit);
    this._label = createElement('span', { className: 'gauge__label', part: 'label' });
    this._center = createElement('div', { className: 'gauge__center', part: 'center' },
      createElement('slot', { name: 'center' }, this._value, this._label));
    this._chart = createElement('div', { className: 'gauge__chart' }, this._svg, this._center);
    this._base = createElement('div', { className: 'gauge', part: 'base', role: 'meter' }, this._chart);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._watchEntry();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopView?.();
    this._stopView = null;
    if (this._cancelTween) {
      this._cancelTween();
      this._cancelTween = null;
      this._paint((this._shown = this._clamped));
    }
  }

  updated(changed) {
    const has = (...keys) => keys.some((k) => changed.has(k));
    if (has('size', 'thickness', 'sweep', 'variant', 'showLimits', 'thresholds', 'min', 'max', 'color')) this._layout();
    if (has('value', 'min', 'max', 'unit', 'format', 'formatter', 'label', 'locale')) this._syncAria();
    if (has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
    }
    if (has('unit')) {
      this._unit.textContent = this.unit || '';
      this._unit.hidden = !this.unit;
    }
    // Giá trị đổi → quét từ giá trị đang hiển thị tới giá trị mới
    const to = this._clamped;
    if (!this._entered) {
      this._paint(this._shown = this._lo);
    } else if (has('value', 'min', 'max')) {
      if (this._shown !== null && canAnimate(this)) this._sweepTo(to, durationOf(this, '--hui-gauge-duration', 1000) * 0.6);
      else {
        this._cancelTween?.();
        this._cancelTween = null;
        this._paint((this._shown = to));
      }
    } else if (!this._cancelTween) {
      this._paint((this._shown = to));
    }
    if (changed.has('noAnimation') && this.noAnimation && !this._entered && this._hasRendered) this._play();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  get _lo() {
    const a = isNum(this.min) ? Number(this.min) : 0;
    const b = isNum(this.max) ? Number(this.max) : 100;
    return Math.min(a, b);
  }

  get _hi() {
    const a = isNum(this.min) ? Number(this.min) : 0;
    const b = isNum(this.max) ? Number(this.max) : 100;
    return a === b ? a + 1 : Math.max(a, b);
  }

  get _clamped() {
    return clamp(isNum(this.value) ? Number(this.value) : this._lo, this._lo, this._hi);
  }

  get _variant() {
    return VARIANTS.includes(this.variant) ? this.variant : 'arc';
  }

  /** Ngưỡng đã sắp xếp: [{value, color}] */
  get _thresholds() {
    return (Array.isArray(this.thresholds) ? this.thresholds : [])
      .map((t) => ({ value: Number(t?.value), color: resolveColor(t?.color) }))
      .filter((t) => Number.isFinite(t.value))
      .sort((a, b) => a.value - b.value);
  }

  /** Màu dải chứa v: ngưỡng đầu tiên có v ≤ value; vượt ngưỡng cuối → màu ngưỡng cuối */
  _colorAt(v) {
    const list = this._thresholds;
    if (!list.length) return resolveColor(this.color);
    return (list.find((t) => v <= t.value) || list[list.length - 1]).color;
  }

  _fmt(v, final = false) {
    if (typeof this.formatter === 'function' || this.format) return formatValue(v, { format: this.format, formatter: this.formatter });
    // Số đếm dần: giữ đúng số chữ số lẻ của giá trị cuối
    const digits = decimalsOf(isNum(this.value) ? Number(this.value) : 0);
    return formatValue(final ? v : Number(v.toFixed(digits)), { digits });
  }

  /** Góc (độ, 0 = 12 giờ) ứng với giá trị v */
  _angle(v) {
    const g = this._g;
    return g.start + ((clamp(v, this._lo, this._hi) - this._lo) / (this._hi - this._lo)) * g.sweep;
  }

  /** Tính hình học + vẽ phần tĩnh (nền, dải ngưỡng, nhãn min/max) */
  _layout() {
    const S = this.size > 0 ? Number(this.size) : 200;
    const T = this.thickness > 0 ? Math.min(Number(this.thickness), S / 4) : Math.max(6, Math.round(S * 0.09));
    const sweep = clamp(isNum(this.sweep) ? Number(this.sweep) : 240, 90, 300);
    const half = sweep / 2;
    const cx = S / 2;
    const cy = S / 2;
    const r = S / 2 - T / 2 - 2;
    const needle = this._variant === 'needle';
    const hubR = Math.max(4, S * 0.035);
    // Đáy khung: thấp nhất của 2 đầu cung (đoạn hướng tâm r ± T/2 tại góc ±half) / trục kim / vùng chữ
    const cos = Math.cos((half * Math.PI) / 180);
    const capBottom = cy - (cos >= 0 ? r - T / 2 : r + T / 2) * cos;
    let H = Math.max(capBottom, needle ? cy + hubR : 0) + 4;
    if (needle) H = Math.max(H, cy + hubR + S * 0.24);
    if (this.showLimits) H = Math.max(H, capBottom + 18);
    H = Math.ceil(H);

    const g = (this._g = { S, T, sweep, start: -half, cx, cy, r, H, hubR, needle });
    const thresholds = this._thresholds;
    const bands = [];
    let from = this._lo;
    thresholds.forEach((t, i) => {
      const to = i === thresholds.length - 1 ? this._hi : clamp(t.value, this._lo, this._hi);
      if (to > from) bands.push({ from, to, color: t.color });
      from = Math.max(from, to);
    });

    this._base.className = `gauge gauge--${this._variant}${this._entered ? '' : ' is-pending'}`;
    this._base.style.setProperty('--_gauge-size', `${S}px`);
    this._svg.setAttribute('viewBox', `0 0 ${S} ${H}`);
    this._svg.style.setProperty('--_gauge-t', `${T}px`);
    this._track.setAttribute('d', arcPath(cx, cy, r, g.start, g.start + sweep));

    // Dải ngưỡng: needle → chính là cung nền (dày T); arc → vạch mảnh phía trong cung
    const bandR = needle ? r : r - T / 2 - 3 - Math.max(2, T * 0.22) / 2;
    const bandT = needle ? T : Math.max(2, T * 0.22);
    while (this._bandsG.children.length > bands.length) this._bandsG.lastChild.remove();
    while (this._bandsG.children.length < bands.length) this._bandsG.append(svgEl('path', { part: 'band', class: 'gauge__band' }));
    bands.forEach((b, i) => {
      const p = this._bandsG.children[i];
      p.setAttribute('d', arcPath(cx, cy, bandR, this._angle(b.from), this._angle(b.to)));
      p.style.stroke = b.color;
      p.style.strokeWidth = `${bandT}px`;
    });
    this._track.toggleAttribute('hidden', needle && bands.length > 0);
    this._showArc = !needle || !bands.length;

    // Kim: tam giác hướng lên 12 giờ, xoay quanh tâm theo giá trị
    const len = r - T / 2 - 2;
    const w = hubR * 0.6;
    this._needlePath.setAttribute('d', `M${cx - w},${cy}L${cx},${cy - len}L${cx + w},${cy}Z`);
    this._hub.setAttribute('cx', String(cx));
    this._hub.setAttribute('cy', String(cy));
    this._hub.setAttribute('r', String(hubR));
    this._needle.toggleAttribute('hidden', !needle);
    this._hub.toggleAttribute('hidden', !needle);

    // Nhãn min/max dưới hai đầu cung
    const a = polar(cx, cy, r, g.start);
    const b = polar(cx, cy, r, g.start + sweep);
    this._minText.setAttribute('x', String(a.x));
    this._minText.setAttribute('y', String(Math.max(a.y + T / 2, capBottom) + 14));
    this._maxText.setAttribute('x', String(b.x));
    this._maxText.setAttribute('y', String(Math.max(b.y + T / 2, capBottom) + 14));
    this._minText.textContent = this._fmt(this._lo, true);
    this._maxText.textContent = this._fmt(this._hi, true);
    this._minText.toggleAttribute('hidden', !this.showLimits);
    this._maxText.toggleAttribute('hidden', !this.showLimits);

    // Vị trí chữ: needle → dưới trục kim; arc mở rộng (> 200°) → giữa tâm; arc hẹp → ngay trên đường tâm
    const place = needle ? 'below' : sweep > 200 ? 'middle' : 'above';
    this._center.className = `gauge__center gauge__center--${place}`;
    const top = needle ? cy + hubR + 4 : cy;
    this._center.style.setProperty('--_gauge-top', `${(top / H) * 100}%`);

    if (this._shown !== null) this._paint(this._shown);
  }

  /** Vẽ phần phụ thuộc giá trị: cung, kim, chữ, màu */
  _paint(v) {
    if (!this._g) return;
    const g = this._g;
    const angle = this._angle(v);
    this._arc.setAttribute('d', this._showArc ? arcPath(g.cx, g.cy, g.r, g.start, angle) : '');
    this._needle.setAttribute('transform', `rotate(${Math.round(angle * 100) / 100} ${g.cx} ${g.cy})`);
    this._base.style.setProperty('--_gauge-color', this._colorAt(v));
    this._valueText.textContent = this._fmt(v, v === this._clamped);
  }

  _sweepTo(to, duration) {
    this._cancelTween?.();
    const from = this._shown ?? this._lo;
    this._cancelTween = tween(duration, (p) => {
      this._shown = lerp(from, to, p);
      this._paint(this._shown);
    }, { onDone: () => { this._cancelTween = null; this._paint((this._shown = to)); } });
  }

  _syncAria() {
    const v = this._clamped;
    const text = `${this._fmt(v, true)}${this.unit ? ` ${this.unit}` : ''}`;
    this._base.setAttribute('aria-valuenow', String(v));
    this._base.setAttribute('aria-valuemin', String(this._lo));
    this._base.setAttribute('aria-valuemax', String(this._hi));
    this._base.setAttribute('aria-valuetext', text);
    this._base.setAttribute('aria-label', this.label || msg('chart.gauge'));
  }

  // =====================================================
  // HIỆU ỨNG XUẤT HIỆN — quét từ min khi cuộn tới
  // =====================================================

  _watchEntry() {
    if (this._entered || this._stopView) return;
    if (!canAnimate(this)) {
      this._enterNow();
      return;
    }
    this._stopView = inView(this, (entry) => {
      if (!entry.isIntersecting) return;
      this._stopView = null;
      this._play();
    }, { once: true });
  }

  _enterNow() {
    this._entered = true;
    this._base.classList.remove('is-pending');
    this._cancelTween?.();
    this._paint((this._shown = this._clamped));
  }

  _play() {
    this._stopView?.();
    this._stopView = null;
    if (!canAnimate(this)) {
      this._enterNow();
      return;
    }
    this._entered = true;
    this._base.classList.remove('is-pending');
    this._shown = this._lo;
    this._sweepTo(this._clamped, durationOf(this, '--hui-gauge-duration', 1000));
  }
}

defineElement('hui-gauge', HuiGauge);

export { HuiGauge };
export default HuiGauge;
