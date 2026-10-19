/**
 * HUI Sparkline — biểu đồ đường / vùng / cột nhỏ gọn (không trục), rộng 100% khung chứa.
 * Vẽ bằng chuỗi path SVG; chỉ tính lại khi data đổi hoặc khung đổi kích thước (ResizeObserver).
 */

import sharedStyles from './chart-shared.css?raw';
import styles from './hui-sparkline.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import {
  svgEl, msg, normalizeData, resolveColor, formatValue, clamp, lerp, linePath, areaPath, resamplePoints,
  canAnimate, durationOf, tween, createTooltip, showTooltip, hideTooltip, createSrTable, fillSrTable,
} from './chart-shared.js';

const TYPES = ['line', 'area', 'bar'];
const EASE = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
let uid = 0;

/**
 * Sparkline: xu hướng của một dãy số trong không gian nhỏ (ô KPI, bảng, danh sách).
 * Bàn phím: Tab để focus · ←/→ chuyển điểm · Home/End điểm đầu/cuối · Esc ẩn tooltip.
 *
 * @csspart base - Khung (role="img", nhận focus)
 * @csspart svg - Thẻ <svg>
 * @csspart line - Đường (type line / area)
 * @csspart area - Vùng tô dưới đường (type area)
 * @csspart bar - Path chứa toàn bộ cột (type bar)
 * @csspart bar-active - Cột đang được chọn (type bar)
 * @csspart dots - Chấm tại mọi điểm (show-dots="all")
 * @csspart dot-last - Chấm điểm cuối
 * @csspart dot-active - Chấm điểm đang chọn (hover / bàn phím)
 * @csspart cursor - Đường dọc tại điểm đang chọn
 * @csspart reference - Đường tham chiếu ngang (attribute reference)
 * @csspart tooltip - Tooltip (kèm tooltip-label, tooltip-value)
 * @csspart data-table - Bảng dữ liệu ẩn cho trình đọc màn hình
 * @cssprop --hui-sparkline-color - Màu đường / cột (ghi đè attribute color)
 * @cssprop --hui-sparkline-height - Chiều cao (ghi đè attribute height)
 * @cssprop --hui-sparkline-stroke-width - Độ dày nét
 * @cssprop --hui-sparkline-area-opacity - Độ đậm vùng tô ở mép trên (mặc định 0.28)
 * @cssprop --hui-sparkline-reference-color - Màu đường tham chiếu
 * @cssprop --hui-sparkline-cursor-color - Màu đường dọc khi hover
 * @cssprop --hui-sparkline-dot-ring - Màu viền chấm (mặc định nền khối)
 * @cssprop --hui-sparkline-duration - Thời lượng hiệu ứng vẽ (mặc định 800ms; cập nhật data = 60%)
 * @cssprop --hui-chart-tooltip-bg - Nền tooltip (chung các chart)
 * @cssprop --hui-chart-tooltip-color - Chữ tooltip (chung các chart)
 */
class HuiSparkline extends HuiElement {
  static localized = true;

  static properties = {
    /** Mảng số hoặc {label, value} — attribute nhận JSON "[3,5,4,8]" */
    data: { type: Array, default: [] },
    /** line | area | bar — đường | đường + vùng tô | cột */
    type: { type: String, default: 'line' },
    /** linear | smooth — đoạn thẳng | cong mượt monotone (không vọt quá dữ liệu) */
    curve: { type: String, default: 'linear' },
    /** primary | success | warning | danger | info | secondary (kèm sắc độ, vd primary-4) hoặc màu CSS bất kỳ */
    color: { type: String, default: 'primary' },
    /** Chiều cao (px) */
    height: { type: Number, default: 40 },
    /** Độ dày nét (px) */
    strokeWidth: { type: Number, default: 2 },
    /** last | all | none — chấm ở điểm cuối | mọi điểm | không chấm (attribute rỗng = all) */
    showDots: { type: String, default: 'last' },
    /** Ghi đè giá trị nhỏ nhất của thang */
    min: { type: Number },
    /** Ghi đè giá trị lớn nhất của thang */
    max: { type: Number },
    /** Giá trị đường tham chiếu ngang (mục tiêu, trung bình…) */
    reference: { type: Number },
    /** Định dạng số (format.js): number | number:1 | currency | currency:USD | percent | compact */
    format: { type: String },
    /** Hàm định dạng (value, item) => string — chỉ gán bằng JS, ưu tiên hơn format */
    formatter: { type: Object, attribute: false },
    /** Tên biểu đồ cho trình đọc màn hình (mặc định "Biểu đồ đường") */
    label: { type: String },
    /** Tắt hiệu ứng vẽ / chuyển tiếp */
    noAnimation: { type: Boolean },
  };

  static styles = [sharedStyles, styles];

  constructor() {
    super();
    this._active = -1;
    this._entered = false;
    this._shown = [];
    this._target = null;
  }

  // =====================================================
  // API chỉ đọc
  // =====================================================

  /** Tọa độ px các điểm (trong viewBox = kích thước thật) */
  get points() {
    return (this._target?.pts || []).map((p) => ({ x: p.x, y: p.y }));
  }

  /** Thang giá trị đang dùng {min, max} */
  get domain() {
    return this._target ? { min: this._target.lo, max: this._target.hi } : null;
  }

  /** up | down | flat — so sánh điểm cuối với điểm đầu */
  get trend() {
    const v = normalizeData(this.data).map((d) => d.value);
    if (v.length < 2) return 'flat';
    return v[v.length - 1] > v[0] ? 'up' : v[v.length - 1] < v[0] ? 'down' : 'flat';
  }

  /** Focus vào biểu đồ (khung role="img") */
  focus(options) {
    this._base?.focus(options);
  }

  // =====================================================
  // RENDER
  // =====================================================

  render() {
    const gid = `hui-spark-grad-${++uid}`;
    const grad = svgEl('linearGradient', { id: gid, x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.append(
      svgEl('stop', { offset: '0%', class: 'spark__stop spark__stop--top' }),
      svgEl('stop', { offset: '100%', class: 'spark__stop spark__stop--bottom' }),
    );
    const defs = svgEl('defs');
    defs.append(grad);

    this._area = svgEl('path', { part: 'area', class: 'spark__area', fill: `url(#${gid})` });
    this._ref = svgEl('line', { part: 'reference', class: 'spark__ref' });
    this._bars = svgEl('path', { part: 'bar', class: 'spark__bars' });
    this._activeBar = svgEl('path', { part: 'bar-active', class: 'spark__bar-active' });
    this._cursor = svgEl('line', { part: 'cursor', class: 'spark__cursor' });
    this._line = svgEl('path', { part: 'line', class: 'spark__line' });
    this._dots = svgEl('path', { part: 'dots', class: 'spark__dots' });
    this._lastDot = svgEl('circle', { part: 'dot-last', class: 'spark__dot' });
    this._activeDot = svgEl('circle', { part: 'dot-active', class: 'spark__dot spark__dot--active' });
    this._svg = svgEl('svg', { part: 'svg', class: 'spark__svg', 'aria-hidden': 'true', focusable: 'false' });
    this._svg.append(defs, this._area, this._ref, this._bars, this._activeBar, this._cursor, this._line,
      this._dots, this._lastDot, this._activeDot);

    this._tip = createTooltip();
    this._base = createElement('div', { className: 'spark chart-focus', part: 'base', role: 'img', tabindex: '0' },
      this._svg, this._tip);
    this._live = createElement('div', { className: 'sr-only', 'aria-live': 'polite' });
    this._table = createSrTable();

    this._base.addEventListener('pointermove', (e) => this._onPointer(e));
    this._base.addEventListener('pointerdown', (e) => this._onPointer(e));
    this._base.addEventListener('pointerleave', () => { if (!this._focused) this._setActive(-1); });
    this._base.addEventListener('focus', () => {
      this._focused = true;
      if (this._active < 0) this._setActive(this._count - 1);
    });
    this._base.addEventListener('blur', () => {
      this._focused = false;
      this._setActive(-1);
    });
    this._base.addEventListener('keydown', (e) => this._onKey(e));
    return [this._base, this._live, this._table];
  }

  connectedCallback() {
    super.connectedCallback();
    if (typeof ResizeObserver === 'function') {
      this._ro ??= new ResizeObserver(() => this._onResize());
      this._ro.observe(this._base);
    }
    this._watchEntry();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._stopView?.();
    this._stopView = null;
    // Đang tween dở → nhảy tới trạng thái cuối (gắn lại không bị kẹt giữa chừng)
    if (this._cancelTween) {
      this._cancelTween();
      this._cancelTween = null;
      if (this._target) this._paint((this._shown = this._target.pts.map((p) => ({ ...p }))));
    }
  }

  updated(changed) {
    const has = (...keys) => keys.some((k) => changed.has(k));
    if (has('color')) this._base.style.setProperty('--_spark-color', resolveColor(this.color));
    if (has('height')) this._base.style.setProperty('--_spark-h', `${this.height > 0 ? this.height : 40}px`);
    if (has('strokeWidth')) this._base.style.setProperty('--_spark-sw', String(this._sw));
    if (has('type')) this._base.className = `spark chart-focus spark--${this._type}${this._entered ? '' : ' is-pending'}`;
    if (has('data', 'min', 'max', 'reference', 'type', 'curve', 'strokeWidth', 'showDots', 'height')) {
      this._draw(has('data', 'min', 'max', 'reference'));
    }
    if (has('data', 'format', 'formatter', 'locale', 'label', 'reference')) this._syncA11y();
    if (changed.has('noAnimation') && this.noAnimation && !this._entered && this._hasRendered) this._play();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  get _type() {
    return TYPES.includes(this.type) ? this.type : 'line';
  }

  get _sw() {
    return this.strokeWidth >= 0 ? Number(this.strokeWidth) : 2;
  }

  get _dotsMode() {
    if (this.showDots === '' || this.showDots === 'true' || this.showDots === 'all') return 'all';
    return this.showDots === 'none' || this.showDots === 'false' ? 'none' : 'last';
  }

  get _count() {
    return this._target?.pts.length || 0;
  }

  _fmt(value, item) {
    return formatValue(value, { format: this.format, formatter: this.formatter, item });
  }

  /** Tính thang + tọa độ đích theo kích thước khung (w × h px) */
  _compute(w, h) {
    const items = normalizeData(this.data);
    const n = items.length;
    const type = this._type;
    const sw = this._sw;
    const dotR = Math.max(2, sw * 1.25);
    const activeR = dotR + 1.5;
    const ref = isNum(this.reference) ? Number(this.reference) : null;
    // Thang luôn chứa đường tham chiếu; cột luôn có gốc 0
    const extra = [...(ref !== null ? [ref] : []), ...(type === 'bar' ? [0] : [])];
    const vals = items.map((d) => d.value);
    let lo = isNum(this.min) ? Number(this.min) : Math.min(...vals, ...extra);
    let hi = isNum(this.max) ? Number(this.max) : Math.max(...vals, ...extra);
    if (!n && !extra.length) [lo, hi] = [0, 1];
    if (lo > hi) [lo, hi] = [hi, lo];
    if (lo === hi) { lo -= 1; hi += 1; } // dãy phẳng → nằm giữa

    // Chừa lề cho nét + chấm để không bị cắt
    const padY = type === 'bar' ? 1 : sw / 2 + activeR;
    const padX = type === 'bar' ? 0 : activeR;
    const innerH = Math.max(0, h - padY * 2);
    const y = (v) => padY + (1 - (clamp(v, lo, hi) - lo) / (hi - lo)) * innerH;

    let pts;
    let band = 0;
    if (type === 'bar') {
      band = n ? w / n : 0;
      pts = items.map((d, i) => ({ x: band * i + band / 2, y: y(d.value) }));
    } else {
      const step = n > 1 ? (w - padX * 2) / (n - 1) : 0;
      pts = items.map((d, i) => ({ x: n > 1 ? padX + i * step : w / 2, y: y(d.value) }));
    }
    return {
      items, pts, lo, hi, w, h, band, sw, dotR, activeR, type,
      baseY: type === 'bar' ? y(clamp(0, lo, hi)) : h,
      refY: ref !== null ? y(ref) : null,
      curve: this.curve === 'smooth' ? 'smooth' : 'linear',
      dots: this._dotsMode,
    };
  }

  /** Path 1 cột (hình chữ nhật) quanh điểm p, gốc tại baseY */
  _barPath(p, T) {
    const gap = T.band > 6 ? Math.max(1, T.band * 0.2) : T.band * 0.1;
    const bw = Math.max(0.5, T.band - gap);
    const top = Math.min(p.y, T.baseY);
    const hh = Math.abs(T.baseY - p.y);
    const r = (v) => Math.round(v * 100) / 100;
    return `M${r(p.x - bw / 2)},${r(top)}h${r(bw)}v${r(hh)}h${r(-bw)}Z`;
  }

  _draw(animate) {
    const w = this._base.clientWidth;
    const h = this._base.clientHeight;
    if (!w || !h) return; // chưa hiển thị → chờ ResizeObserver
    const prev = this._shown;
    const T = (this._target = this._compute(w, h));
    this._svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    this._ref.toggleAttribute('hidden', T.refY === null);
    if (T.refY !== null) {
      for (const [k, v] of Object.entries({ x1: 0, x2: w, y1: T.refY, y2: T.refY })) this._ref.setAttribute(k, String(v));
    }

    this._cancelTween?.();
    this._cancelTween = null;
    const to = T.pts;
    if (animate && this._entered && canAnimate(this) && prev.length && to.length) {
      // Chuyển tiếp mượt: nội suy từ hình đang hiển thị (đổi số điểm → resample) sang hình mới
      const from = resamplePoints(prev, to.length);
      const dur = durationOf(this, '--hui-sparkline-duration', 800) * 0.6;
      this._cancelTween = tween(dur, (p) => {
        this._shown = from.map((a, i) => ({ x: lerp(a.x, to[i].x, p), y: lerp(a.y, to[i].y, p) }));
        this._paint(this._shown);
      }, { onDone: () => { this._cancelTween = null; } });
    } else {
      this._shown = to.map((p) => ({ ...p }));
      this._paint(this._shown);
    }
    if (this._active >= to.length) this._setActive(to.length - 1);
    else if (this._active >= 0) this._setActive(this._active);
  }

  /** Ghi các chuỗi path theo tọa độ `pts` (mỗi frame của tween gọi lại) */
  _paint(pts) {
    const T = this._target;
    if (!T) return;
    const bar = T.type === 'bar';
    this._bars.setAttribute('d', bar ? pts.map((p) => this._barPath(p, T)).join('') : '');
    this._line.setAttribute('d', bar ? '' : linePath(pts, T.curve));
    this._area.setAttribute('d', T.type === 'area' ? areaPath(pts, T.baseY, T.curve) : '');

    const r = T.dotR;
    this._dots.setAttribute('d', !bar && T.dots === 'all'
      ? pts.map((p) => `M${p.x - r},${p.y}a${r},${r} 0 1 0 ${r * 2},0a${r},${r} 0 1 0 ${-r * 2},0`).join('')
      : '');
    const last = pts[pts.length - 1];
    const showLast = !bar && T.dots !== 'none' && last;
    this._lastDot.toggleAttribute('hidden', !showLast);
    if (showLast) {
      this._lastDot.setAttribute('cx', String(last.x));
      this._lastDot.setAttribute('cy', String(last.y));
      this._lastDot.setAttribute('r', String(r));
    }
    this._paintActive();
  }

  _paintActive() {
    const T = this._target;
    const p = this._active >= 0 ? this._shown[this._active] : null;
    const bar = T?.type === 'bar';
    this._base.classList.toggle('has-active', !!p);
    this._cursor.toggleAttribute('hidden', !p || bar);
    this._activeDot.toggleAttribute('hidden', !p || bar);
    this._activeBar.toggleAttribute('hidden', !p || !bar);
    if (!p) return;
    if (bar) {
      this._activeBar.setAttribute('d', this._barPath(p, T));
      return;
    }
    for (const [k, v] of Object.entries({ x1: p.x, x2: p.x, y1: 0, y2: T.h })) this._cursor.setAttribute(k, String(v));
    this._activeDot.setAttribute('cx', String(p.x));
    this._activeDot.setAttribute('cy', String(p.y));
    this._activeDot.setAttribute('r', String(T.activeR));
  }

  /** Chọn điểm i (−1 = bỏ chọn): vẽ con trỏ + tooltip; `announce` = đọc qua aria-live (bàn phím) */
  _setActive(i, announce = false) {
    const T = this._target;
    if (i < 0 || !T?.pts.length) {
      this._active = -1;
      this._paintActive();
      hideTooltip(this._tip);
      return;
    }
    this._active = clamp(i, 0, T.pts.length - 1);
    this._paintActive();
    const item = T.items[this._active];
    const p = T.pts[this._active];
    const value = this._fmt(item.value, item.raw);
    showTooltip(this._tip, { label: item.label, value }, p.x, T.type === 'bar' ? Math.min(p.y, T.baseY) : p.y, this._base);
    if (announce) this._live.textContent = `${item.label || msg('chart.point', { index: this._active + 1 })}: ${value}`;
  }

  _onPointer(e) {
    const pts = this._target?.pts;
    if (!pts?.length) return;
    const x = e.clientX - this._base.getBoundingClientRect().left;
    let best = 0;
    let dist = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p.x - x);
      if (d < dist) { dist = d; best = i; }
    });
    if (best !== this._active) this._setActive(best);
  }

  _onKey(e) {
    const n = this._count;
    if (!n) return;
    const cur = this._active < 0 ? n - 1 : this._active;
    const next = {
      ArrowRight: cur + 1, ArrowUp: cur + 1, ArrowLeft: cur - 1, ArrowDown: cur - 1, Home: 0, End: n - 1,
    }[e.key];
    if (e.key === 'Escape') {
      this._setActive(-1);
      return;
    }
    if (next === undefined) return;
    e.preventDefault();
    this._setActive(clamp(next, 0, n - 1), true);
  }

  _onResize() {
    const w = this._base.clientWidth;
    const h = this._base.clientHeight;
    if (this._target && w === this._target.w && h === this._target.h) return;
    this._draw(false);
  }

  _syncA11y() {
    const items = normalizeData(this.data);
    const name = this.label || msg('chart.sparkline');
    this.setState('trend-up', this.trend === 'up');
    this.setState('trend-down', this.trend === 'down');
    if (!items.length) {
      this._base.setAttribute('aria-label', `${name}: ${msg('chart.empty')}`);
      fillSrTable(this._table, name, []);
      return;
    }
    const vals = items.map((d) => d.value);
    const pick = (v) => items.find((d) => d.value === v);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const last = items[items.length - 1];
    const trend = msg(`chart.trend${{ up: 'Up', down: 'Down', flat: 'Flat' }[this.trend]}`);
    let text = `${name}. ${msg('chart.summary', {
      min: this._fmt(minV, pick(minV).raw), max: this._fmt(maxV, pick(maxV).raw), last: this._fmt(last.value, last.raw),
    })}, ${trend}`;
    if (isNum(this.reference)) text += `, ${msg('chart.reference', { value: this._fmt(Number(this.reference)) })}`;
    this._base.setAttribute('aria-label', text);
    fillSrTable(this._table, name, items.map((d, i) => [d.label || msg('chart.point', { index: i + 1 }), this._fmt(d.value, d.raw)]));
  }

  // =====================================================
  // HIỆU ỨNG XUẤT HIỆN (chạy 1 lần khi cuộn tới)
  // =====================================================

  _watchEntry() {
    if (this._entered || this._stopView) return;
    if (!canAnimate(this)) {
      this._entered = true;
      this._base.classList.remove('is-pending');
      return;
    }
    this._base.classList.add('is-pending');
    this._stopView = inView(this, (entry) => {
      if (!entry.isIntersecting) return;
      this._stopView = null;
      this._play();
    }, { once: true });
  }

  _play() {
    this._stopView?.();
    this._stopView = null;
    this._entered = true;
    this._base.classList.remove('is-pending');
    const T = this._target;
    if (!canAnimate(this) || !T?.pts.length) return;
    const dur = durationOf(this, '--hui-sparkline-duration', 800);

    if (T.type === 'bar') {
      // Cột mọc từ gốc lên
      const to = T.pts;
      const from = to.map((p) => ({ x: p.x, y: T.baseY }));
      this._cancelTween?.();
      this._cancelTween = tween(dur, (k) => {
        this._shown = from.map((a, i) => ({ x: a.x, y: lerp(a.y, to[i].y, k) }));
        this._paint(this._shown);
      }, { onDone: () => { this._cancelTween = null; } });
      return;
    }
    if (typeof this._line.animate !== 'function') return;
    // Đường tự vẽ: pathLength=1 → dasharray "1 1", dashoffset 1 → 0 (không cần đo độ dài thật)
    this._line.setAttribute('pathLength', '1');
    const draw = this._line.animate(
      [{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }],
      { duration: dur, easing: EASE },
    );
    const done = () => this._line.removeAttribute('pathLength');
    draw.onfinish = done;
    draw.oncancel = done;
    // Vùng tô lộ dần từ trái sang; chấm hiện sau cùng
    this._area.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: dur, easing: EASE });
    this._lastDot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: dur * 0.85, fill: 'backwards' });
    this._dots.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur * 0.6, delay: dur * 0.4, fill: 'backwards' });
  }
}

defineElement('hui-sparkline', HuiSparkline);

export { HuiSparkline };
export default HuiSparkline;
