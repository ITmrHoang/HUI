/**
 * HUI Slider — Thanh trượt chọn giá trị (Ant Slider + MUI Slider), tham gia <form> native qua HuiFormElement
 * Một tay nắm (value = số) hoặc range (value = [a, b], FormData gửi "a,b").
 * Bàn phím theo WAI-ARIA APG Slider / Multi-thumb Slider. Parts / biến CSS: xem JSDoc class.
 */

import styles from './hui-slider.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';

/** Chuỗi locale chưa có trong locale.js → dùng chuỗi dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  'slider.start': { vi: 'Giá trị đầu', en: 'Start value' },
  'slider.end': { vi: 'Giá trị cuối', en: 'End value' },
};
const msg = (key) => {
  const v = t(key);
  return v !== key ? v : FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

const TOOLTIP_MODES = ['auto', 'always', 'never'];
/** Vẽ chấm cho từng bước tối đa bao nhiêu chấm (tránh hàng nghìn phần tử khi step nhỏ) */
const MAX_DOTS = 200;

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function decimals(n) {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  if (s.includes('e-')) return Number(s.split('e-')[1]) || 0;
  return (s.split('.')[1] || '').length;
}

/**
 * Thanh trượt một hoặc hai tay nắm.
 * @fires input - Giá trị đổi trong lúc kéo / bấm phím, detail: { value }
 * @fires change - Thả chuột sau khi kéo (nếu giá trị đã đổi) / mỗi lần bấm phím, detail: { value }
 * @csspart base - Khung ngoài cùng (label + thanh trượt)
 * @csspart label - Nhãn
 * @csspart control - Vùng bấm/kéo (chứa rail, track, thumb, marks)
 * @csspart rail - Đường ray nền
 * @csspart track - Đoạn đã chọn (tô màu)
 * @csspart thumb - Tay nắm (thumb-start / thumb-end là từng tay khi range)
 * @csspart thumb-start - Tay nắm đầu
 * @csspart thumb-end - Tay nắm cuối (chỉ có khi range)
 * @csspart tooltip - Bong bóng hiện giá trị trên tay nắm
 * @csspart dot - Chấm trên ray (dots / marks); dot-active khi nằm trong đoạn đã chọn
 * @csspart marks - Vùng chứa nhãn mốc
 * @csspart mark - Nhãn của một mốc
 * @cssprop --hui-slider-rail-size - Độ dày ray
 * @cssprop --hui-slider-rail-bg - Màu ray
 * @cssprop --hui-slider-rail-hover-bg - Màu ray khi hover
 * @cssprop --hui-slider-track-bg - Màu đoạn đã chọn
 * @cssprop --hui-slider-thumb-size - Cỡ tay nắm
 * @cssprop --hui-slider-thumb-bg - Nền tay nắm
 * @cssprop --hui-slider-thumb-border-color - Viền tay nắm
 * @cssprop --hui-slider-focus-ring - box-shadow khi tay nắm được focus / kéo
 * @cssprop --hui-slider-tooltip-bg - Nền bong bóng giá trị
 * @cssprop --hui-slider-tooltip-color - Màu chữ bong bóng giá trị
 * @cssprop --hui-slider-dot-size - Cỡ chấm
 * @cssprop --hui-slider-mark-color - Màu chữ nhãn mốc
 * @cssprop --hui-slider-vertical-height - Chiều cao khi vertical
 */
class HuiSlider extends HuiFormElement {
  static properties = {
    /** Giá trị nhỏ nhất */
    min: { type: Number, default: 0 },
    /** Giá trị lớn nhất */
    max: { type: Number, default: 100 },
    /** Bước nhảy (phím mũi tên, kéo chuột đều bám theo bước) */
    step: { type: Number, default: 1 },
    /** Hai tay nắm: value = [a, b] (attribute value="20,80"), FormData gửi "a,b" */
    range: { type: Boolean },
    /** Mốc trên ray: { 0: '0°C', 37: '37°C', 100: { label: '100°C' } } (attribute dạng JSON) */
    marks: { type: Object },
    /** Hiện chấm ở mỗi bước */
    dots: { type: Boolean },
    /** Thanh trượt dọc (giá trị tăng từ dưới lên) */
    vertical: { type: Boolean },
    /** auto | always | never — bong bóng giá trị: auto = khi hover / focus / kéo */
    tooltip: { type: String, default: 'auto' },
    /** Hàm định dạng chữ trong bong bóng + aria-valuetext: (value) => string */
    tooltipFormatter: { type: Object, attribute: false },
    /** Nhãn phía trên (cũng là tên cho trình đọc màn hình) */
    label: { type: String, default: '' },
  };

  static styles = styles;

  constructor() {
    super();
    this._dragging = false;
    this._activeIndex = 0;
    this._dragStart = '';
  }

  // =====================================================
  // GIÁ TRỊ
  // =====================================================

  /** Số (một tay nắm) hoặc [a, b] (range) — luôn đã kẹp trong [min, max] và bám theo step */
  get value() {
    return this._normalize(this._getProp('value'));
  }
  set value(v) {
    this._setProp('value', Array.isArray(v) ? [...v] : v);
  }

  get _bounds() {
    const min = Number.isFinite(this.min) ? this.min : 0;
    const max = Number.isFinite(this.max) && this.max > min ? this.max : min;
    return [min, max];
  }

  _snap(n) {
    const [min, max] = this._bounds;
    const step = this.step > 0 ? this.step : 1;
    const digits = Math.max(decimals(step), decimals(min));
    let v = min + Math.round((n - min) / step) * step;
    // Bước cuối vượt max (vd max=10, step=3) → lùi về bước hợp lệ gần nhất, giống <input type="range">
    if (v > max) v = min + Math.floor((max - min) / step) * step;
    if (v < min) v = min;
    return Number(v.toFixed(Math.min(digits, 20)));
  }

  _normalize(raw) {
    const [min, max] = this._bounds;
    if (this.range) {
      let list = [];
      if (Array.isArray(raw)) list = raw;
      else if (typeof raw === 'number') list = [min, raw];
      else if (typeof raw === 'string' && raw.trim()) {
        try {
          const parsed = JSON.parse(raw);
          list = Array.isArray(parsed) ? parsed : [min, parsed];
        } catch {
          list = raw.split(',');
        }
      }
      let a = this._snap(toNumber(list[0]) ?? min);
      let b = this._snap(toNumber(list[1]) ?? max);
      if (a > b) [a, b] = [b, a];
      return [a, b];
    }
    const n = toNumber(Array.isArray(raw) ? raw[0] : raw);
    return this._snap(n ?? min);
  }

  /** Mảng giá trị theo tay nắm (1 hoặc 2 phần tử) */
  get _values() {
    const v = this.value;
    return Array.isArray(v) ? v : [v];
  }

  _percent(v) {
    const [min, max] = this._bounds;
    return max === min ? 0 : ((v - min) / (max - min)) * 100;
  }

  _format(v) {
    if (typeof this.tooltipFormatter === 'function') {
      const out = this.tooltipFormatter(v);
      return out == null ? '' : String(out);
    }
    return String(v);
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._label = createElement('div', { className: 'hui-slider__label', part: 'label', id: 'label' });

    this._rail = createElement('div', { className: 'hui-slider__rail', part: 'rail' });
    this._track = createElement('div', { className: 'hui-slider__track', part: 'track' });
    this._dots = createElement('div', { className: 'hui-slider__dots', 'aria-hidden': 'true' });
    this._marks = createElement('div', { className: 'hui-slider__marks', part: 'marks', 'aria-hidden': 'true' });

    this._thumbs = [0, 1].map((i) => {
      const tooltip = createElement('span', { className: 'hui-slider__tooltip', part: 'tooltip', 'aria-hidden': 'true' });
      const thumb = createElement('div', {
        className: 'hui-slider__thumb',
        part: i === 0 ? 'thumb thumb-start' : 'thumb thumb-end',
        role: 'slider',
      }, tooltip);
      thumb._tooltip = tooltip;
      thumb.addEventListener('keydown', (e) => this._onKeydown(e, i));
      thumb.addEventListener('blur', () => this.markInteracted());
      return thumb;
    });

    this._control = createElement('div', { className: 'hui-slider__control', part: 'control' },
      this._rail, this._track, this._dots, ...this._thumbs, this._marks);
    this._control.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this._control.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this._control.addEventListener('pointerup', (e) => this._endDrag(e));
    this._control.addEventListener('pointercancel', (e) => this._endDrag(e));
    this._control.addEventListener('lostpointercapture', (e) => this._endDrag(e));

    this._wrapper = createElement('div', { className: 'hui-slider', part: 'base' }, this._label, this._control);
    return this._wrapper;
  }

  updated(changed) {
    if (changed.has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
    }
    if (['min', 'max', 'step', 'marks', 'dots', 'range', 'vertical'].some((k) => changed.has(k))) this._buildScale();

    this._syncPositions();
    this._syncAria();
    this._syncClasses();
    super.updated(changed);
    // range bật/tắt hoặc min/max đổi → giá trị chuẩn hóa đổi theo
    if (['range', 'min', 'max', 'step'].some((k) => changed.has(k))) this._syncForm();
  }

  /** Dựng lại chấm + nhãn mốc (chỉ khi min/max/step/marks/dots đổi) */
  _buildScale() {
    const [min, max] = this._bounds;
    const points = new Map(); // giá trị → nhãn (null = chỉ có chấm)

    if (this.dots) {
      const step = this.step > 0 ? this.step : 1;
      const count = Math.floor((max - min) / step);
      if (count <= MAX_DOTS) for (let k = 0; k <= count; k++) points.set(this._snap(min + k * step), null);
    }
    const marks = this.marks && typeof this.marks === 'object' ? this.marks : {};
    for (const [key, raw] of Object.entries(marks)) {
      const v = toNumber(key);
      if (v == null || v < min || v > max) continue;
      const label = raw && typeof raw === 'object' ? raw.label : raw;
      points.set(v, label == null ? '' : String(label));
    }

    this._dots.replaceChildren();
    this._marks.replaceChildren();
    this._dotEls = [];
    for (const [v, label] of [...points].sort((a, b) => a[0] - b[0])) {
      const pos = `${this._percent(v)}%`;
      const dot = createElement('span', { className: 'hui-slider__dot', part: 'dot' });
      dot.style.setProperty('--_slider-pos', pos);
      dot._value = v;
      this._dots.append(dot);
      this._dotEls.push(dot);
      if (label !== null) {
        const mark = createElement('span', { className: 'hui-slider__mark', part: 'mark', 'data-value': String(v) }, label);
        mark.style.setProperty('--_slider-pos', pos);
        const style = marks[v]?.style;
        if (style && typeof style === 'object') Object.assign(mark.style, style);
        this._marks.append(mark);
      }
    }
    this._hasMarks = this._marks.childElementCount > 0;
  }

  _syncPositions() {
    const values = this._values;
    const pcts = values.map((v) => this._percent(v));
    const [start, end] = this.range ? pcts : [0, pcts[0]];
    this._control.style.setProperty('--_slider-start', `${start}%`);
    this._control.style.setProperty('--_slider-end', `${end}%`);

    this._thumbs.forEach((thumb, i) => {
      thumb.hidden = i >= values.length;
      if (thumb.hidden) return;
      thumb.style.setProperty('--_slider-pos', `${pcts[i]}%`);
      const text = this._format(values[i]);
      thumb._tooltip.textContent = text;
      thumb._tooltip.hidden = this.tooltip === 'never' || !text;
    });

    const [lo, hi] = this.range ? values : [this._bounds[0], values[0]];
    for (const dot of this._dotEls || []) {
      const active = dot._value >= lo && dot._value <= hi;
      dot.classList.toggle('hui-slider__dot--active', active);
      dot.setAttribute('part', active ? 'dot dot-active' : 'dot');
    }
  }

  _syncAria() {
    const [min, max] = this._bounds;
    const values = this._values;
    const name = this.label || this.getAttribute('aria-label') || '';
    const disabled = this.isDisabled;

    this._thumbs.forEach((thumb, i) => {
      if (i >= values.length) {
        thumb.removeAttribute('tabindex');
        return;
      }
      // APG multi-thumb: khoảng hợp lệ của mỗi tay nắm bị giới hạn bởi tay còn lại
      const lo = this.range && i === 1 ? values[0] : min;
      const hi = this.range && i === 0 ? values[1] : max;
      thumb.setAttribute('aria-valuenow', String(values[i]));
      thumb.setAttribute('aria-valuemin', String(lo));
      thumb.setAttribute('aria-valuemax', String(hi));
      thumb.setAttribute('aria-valuetext', this._format(values[i]) || String(values[i]));
      thumb.setAttribute('aria-orientation', this.vertical ? 'vertical' : 'horizontal');
      thumb.setAttribute('tabindex', disabled ? '-1' : '0');
      if (disabled) thumb.setAttribute('aria-disabled', 'true');
      else thumb.removeAttribute('aria-disabled');
      if (this.readonly) thumb.setAttribute('aria-readonly', 'true');
      else thumb.removeAttribute('aria-readonly');

      const part = this.range ? msg(i === 0 ? 'slider.start' : 'slider.end') : '';
      const label = [name, part].filter(Boolean).join(' – ');
      if (label) thumb.setAttribute('aria-label', label);
      else thumb.removeAttribute('aria-label');
    });
  }

  _syncClasses() {
    const mode = TOOLTIP_MODES.includes(this.tooltip) ? this.tooltip : 'auto';
    this._wrapper.className = [
      'hui-slider',
      `hui-slider--${this.effectiveSize}`,
      this.vertical ? 'hui-slider--vertical' : 'hui-slider--horizontal',
      `hui-slider--tooltip-${mode}`,
      this.range ? 'hui-slider--range' : '',
      this._hasMarks ? 'hui-slider--has-marks' : '',
      this._dragging ? 'hui-slider--dragging' : '',
      this.isDisabled ? 'hui-slider--disabled' : '',
    ].filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  get _locked() {
    return this.isDisabled || this.readonly;
  }

  /** Đặt giá trị cho tay nắm `index` (range: không vượt qua tay còn lại). Trả về true nếu đổi */
  _setThumbValue(index, v) {
    const [min, max] = this._bounds;
    let next = this._snap(Math.min(Math.max(v, min), max));
    const current = this.value;
    let value = next;
    if (this.range) {
      const pair = [...current];
      next = index === 0 ? Math.min(next, pair[1]) : Math.max(next, pair[0]);
      pair[index] = next;
      value = pair;
    }
    if (String(value) === String(current)) return false;
    this.value = value;
    this.emit('input', { value: this.value });
    return true;
  }

  /** Vị trí con trỏ → giá trị (đã bám step) */
  _valueFromPointer(e) {
    const rect = this._rail.getBoundingClientRect();
    const [min, max] = this._bounds;
    const ratio = this.vertical
      ? (rect.bottom - e.clientY) / (rect.height || 1)
      : (e.clientX - rect.left) / (rect.width || 1);
    return this._snap(min + Math.min(Math.max(ratio, 0), 1) * (max - min));
  }

  /** Range: chọn tay nắm gần điểm bấm nhất (trùng nhau → theo hướng bấm) */
  _nearestThumb(v) {
    if (!this.range) return 0;
    const [a, b] = this.value;
    if (a === b) return v > b ? 1 : 0;
    return Math.abs(v - a) <= Math.abs(v - b) ? 0 : 1;
  }

  _onPointerDown(e) {
    if (this._locked || e.button !== 0) return;
    e.preventDefault(); // không bôi đen chữ, không mất focus
    const thumbIndex = this._thumbs.indexOf(e.target.closest?.('.hui-slider__thumb'));
    const mark = e.target.closest?.('.hui-slider__mark');
    const v = mark ? Number(mark.dataset.value) : this._valueFromPointer(e);

    this._activeIndex = thumbIndex >= 0 ? thumbIndex : this._nearestThumb(v);
    this._dragStart = String(this.value);
    this._dragging = true;
    this._thumbs[this._activeIndex].classList.add('hui-slider__thumb--active');
    try { this._control.setPointerCapture(e.pointerId); } catch { /* pointer giả lập */ }
    this._thumbs[this._activeIndex].focus({ preventScroll: true });
    // Bấm trúng tay nắm thì giữ nguyên giá trị, chỉ đổi khi bắt đầu kéo
    if (thumbIndex < 0) this._setThumbValue(this._activeIndex, v);
    this._syncClasses();
  }

  _onPointerMove(e) {
    if (!this._dragging) return;
    const v = this._valueFromPointer(e);
    // Hai tay nắm chồng lên nhau → tay nào được kéo tùy hướng kéo
    if (this.range) {
      const [a, b] = this.value;
      if (a === b && v !== a) {
        const index = v < a ? 0 : 1;
        if (index !== this._activeIndex) {
          this._thumbs[this._activeIndex].classList.remove('hui-slider__thumb--active');
          this._activeIndex = index;
          this._thumbs[index].classList.add('hui-slider__thumb--active');
          this._thumbs[index].focus({ preventScroll: true });
        }
      }
    }
    this._setThumbValue(this._activeIndex, v);
  }

  _endDrag(e) {
    if (!this._dragging) return;
    this._dragging = false;
    try {
      if (this._control.hasPointerCapture?.(e.pointerId)) this._control.releasePointerCapture(e.pointerId);
    } catch { /* bỏ qua */ }
    this._thumbs.forEach((thumb) => thumb.classList.remove('hui-slider__thumb--active'));
    this._syncClasses();
    this.markInteracted();
    if (String(this.value) !== this._dragStart) this.emit('change', { value: this.value });
  }

  /**
   * APG Slider: ←/↓ giảm 1 bước, →/↑ tăng 1 bước, PageDown/PageUp ±10 bước,
   * Home/End về min/max (range: giới hạn bởi tay nắm còn lại).
   */
  _onKeydown(e, index) {
    if (this._locked) return;
    const [min, max] = this._bounds;
    const step = this.step > 0 ? this.step : 1;
    const current = this._values[index];
    let next;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp': next = current + step; break;
      case 'ArrowLeft':
      case 'ArrowDown': next = current - step; break;
      case 'PageUp': next = current + step * 10; break;
      case 'PageDown': next = current - step * 10; break;
      case 'Home': next = min; break;
      case 'End': next = max; break;
      default: return;
    }
    e.preventDefault();
    if (this._setThumbValue(index, next)) this.emit('change', { value: this.value });
  }

  // =====================================================
  // FORM
  // =====================================================

  /** Slider luôn có giá trị (giống <input type="range">) */
  _isEmpty() {
    return false;
  }

  formValue() {
    const v = this.value;
    return Array.isArray(v) ? v.join(',') : String(v);
  }

  validationAnchor() {
    return this._thumbs?.[0];
  }

  focus(options) {
    if (this._thumbs) this._thumbs[0].focus(options);
    else super.focus(options);
  }

  blur() {
    this._thumbs?.forEach((thumb) => thumb.blur());
  }
}

defineElement('hui-slider', HuiSlider);

export default HuiSlider;
