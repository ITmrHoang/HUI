/**
 * HUI Progress — Thanh tiến độ (Ant Progress + MUI LinearProgress / CircularProgress)
 * type: line | circle | dashboard · steps (thanh chia ô) · gradient "from,to" · success-percent
 * ARIA: role="progressbar" + aria-valuenow trên part base.
 * Biến CSS: xem đầu hui-progress.css.
 */

import styles from './hui-progress.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/hui-icon.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TYPES = ['line', 'circle', 'dashboard'];
const STATUSES = ['normal', 'active', 'success', 'exception'];
/** Nét line (px) và đường kính circle (px) theo size */
const LINE_STROKE = { sm: 6, md: 8, lg: 10 };
const CIRCLE_SIZE = { sm: 80, md: 120, lg: 160 };
const STEP_WIDTH = { sm: 10, md: 14, lg: 18 };
let uid = 0;

const clamp = (v) => Math.min(100, Math.max(0, Number(v) || 0));
const round = (v) => Math.round(v * 100) / 100;

/** Chuỗi locale; key chưa có trong gói ngôn ngữ (t() trả lại chính key) → dùng fallback */
const tr = (key, fallback) => {
  const v = t(key);
  return v === key ? fallback : v;
};

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * @csspart base - Khung ngoài (role="progressbar")
 * @csspart track - Rãnh nền (line)
 * @csspart bar - Thanh tiến độ (line)
 * @csspart success-bar - Phần success-percent (line)
 * @csspart steps - Dãy ô (steps)
 * @csspart step - Một ô (steps); ô đã đạt có thêm part step-active
 * @csspart circle - Khung tròn (circle / dashboard)
 * @csspart svg - Thẻ <svg> (circle / dashboard)
 * @csspart trail - Vòng nền (circle / dashboard)
 * @csspart path - Vòng tiến độ (circle / dashboard)
 * @csspart success-path - Vòng success-percent (circle / dashboard)
 * @csspart info - Chữ phần trăm / icon trạng thái
 * @cssprop --hui-progress-color - Màu tiến độ (attribute stroke-color ưu tiên hơn)
 * @cssprop --hui-progress-success-color - Màu success-percent / trạng thái success
 * @cssprop --hui-progress-trail-color - Màu rãnh nền
 * @cssprop --hui-progress-radius - Bo góc thanh (line / steps)
 * @cssprop --hui-progress-step-width - Chiều rộng một ô (steps)
 * @cssprop --hui-progress-step-gap - Khoảng cách giữa các ô (steps)
 * @cssprop --hui-progress-info-color - Màu chữ phần trăm
 * @cssprop --hui-progress-font-size - Cỡ chữ phần trăm
 */
class HuiProgress extends HuiElement {
  static properties = {
    /** line | circle | dashboard — thanh ngang | vòng tròn | vòng hở đáy (đồng hồ) */
    type: { type: String, default: 'line' },
    /** Phần trăm hoàn thành 0–100 */
    percent: { type: Number, default: 0 },
    /** Phần đã "thành công" 0–100, vẽ đè màu success (vd: đã duyệt / đã tải) */
    successPercent: { type: Number },
    /** normal | active | success | exception — active: vệt sáng chạy (line); percent = 100 tự thành success */
    status: { type: String, default: 'normal' },
    /** Số ô — chia thanh line thành các đoạn rời */
    steps: { type: Number },
    /** Màu tiến độ: một màu, hoặc gradient "from,to" (vd: "#108ee9,#87d068") */
    strokeColor: { type: String },
    /** Màu rãnh nền */
    trailColor: { type: String },
    /** Độ dày nét: px với line/steps, đơn vị viewBox 100 với circle (mặc định 6) */
    strokeWidth: { type: Number },
    /** round | butt | square — đầu nét */
    strokeLinecap: { type: String, default: 'round' },
    /** sm | md | lg hoặc số px (đường kính circle / độ dày line) */
    size: { type: String, default: 'md' },
    /** 'false' = ẩn chữ phần trăm / icon */
    showInfo: { type: String, default: 'true' },
    /** Góc hở đáy của dashboard (độ) */
    gapDegree: { type: Number, default: 75 },
    /** Nhãn cho trình đọc màn hình (mặc định theo locale progress.label) */
    label: { type: String },
    /** Hàm định dạng chữ: (percent, successPercent) => string | Node. Chỉ gán bằng JS */
    format: { type: Object, attribute: false },
  };

  static styles = styles;

  static localized = true;

  render() {
    this._gradientId = `hui-progress-gradient-${++uid}`;
    this._info = createElement('span', { className: 'info', part: 'info' });

    // LINE
    this._bar = createElement('div', { className: 'bar', part: 'bar' });
    this._successBar = createElement('div', { className: 'success-bar', part: 'success-bar' });
    this._track = createElement('div', { className: 'track', part: 'track' }, this._bar, this._successBar);

    // STEPS
    this._steps = createElement('div', { className: 'steps', part: 'steps' });

    // CIRCLE / DASHBOARD — pathLength="100" để stroke-dasharray tính theo phần trăm
    this._stopFrom = svg('stop', { offset: '0%' });
    this._stopTo = svg('stop', { offset: '100%' });
    const gradient = svg('linearGradient', { id: this._gradientId, x1: '0%', y1: '0%', x2: '100%', y2: '0%' });
    gradient.append(this._stopFrom, this._stopTo);
    const defs = svg('defs');
    defs.append(gradient);
    const circleAttrs = { cx: '50', cy: '50', fill: 'none', pathLength: '100' };
    this._trail = svg('circle', { ...circleAttrs, class: 'trail', part: 'trail' });
    this._path = svg('circle', { ...circleAttrs, class: 'path', part: 'path' });
    this._successPath = svg('circle', { ...circleAttrs, class: 'success-path', part: 'success-path' });
    this._svg = svg('svg', { viewBox: '0 0 100 100', class: 'svg', part: 'svg', 'aria-hidden': 'true' });
    this._svg.append(defs, this._trail, this._path, this._successPath);
    this._circle = createElement('div', { className: 'circle', part: 'circle' }, this._svg);

    this._base = createElement('div', {
      className: 'progress', part: 'base', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
    });
    return this._base;
  }

  updated() {
    // Mọi property đều ảnh hưởng tới hình vẽ → vẽ lại toàn bộ (rẻ: vài thuộc tính style)
    this._draw();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  get _type() {
    return TYPES.includes(this.type) ? this.type : 'line';
  }

  /** Status thực tế: percent >= 100 (và chưa đặt exception) → success */
  get _status() {
    const s = STATUSES.includes(this.status) ? this.status : 'normal';
    if (s !== 'exception' && clamp(this.percent) >= 100) return 'success';
    return s;
  }

  /** "from,to" → [from, to]; một màu → [color] */
  get _colors() {
    return String(this.strokeColor || '').split(',').map((c) => c.trim()).filter(Boolean);
  }

  get _sizeKey() {
    return ['sm', 'md', 'lg'].includes(this.size) ? this.size : null;
  }

  _infoContent(percent, success, status) {
    if (typeof this.format === 'function') return this.format(percent, success);
    const line = this._type === 'line';
    if (status === 'exception') return createElement('hui-icon', { name: line ? 'error' : 'close' });
    if (status === 'success') return createElement('hui-icon', { name: line ? 'success' : 'check' });
    return `${round(percent)}%`;
  }

  _draw() {
    const type = this._type;
    const status = this._status;
    const percent = clamp(this.percent);
    const hasSuccess = this.successPercent !== null && this.successPercent !== undefined;
    const success = hasSuccess ? Math.min(clamp(this.successPercent), percent) : 0;
    const steps = type === 'line' && this.steps > 0 ? Math.floor(this.steps) : 0;
    const sizeKey = this._sizeKey;
    const sizeNum = sizeKey ? null : Number.parseFloat(this.size);
    const colors = this._colors;
    const useGradient = colors.length > 1 && status !== 'success' && status !== 'exception';

    const base = this._base;
    base.className = [
      'progress', `progress--${steps ? 'steps' : type}`, `progress--${status}`, `progress--${sizeKey || 'md'}`,
    ].join(' ');

    // Màu
    if (colors.length) base.style.setProperty('--_progress-stroke-attr', colors[0]);
    else base.style.removeProperty('--_progress-stroke-attr');
    if (this.trailColor) base.style.setProperty('--_progress-trail-attr', this.trailColor);
    else base.style.removeProperty('--_progress-trail-attr');

    // ARIA
    base.setAttribute('aria-valuenow', String(round(percent)));
    base.setAttribute('aria-label', this.label || tr('progress.label', 'Progress'));

    // Chữ phần trăm / icon
    const content = this._infoContent(percent, success, status);
    this._info.replaceChildren();
    if (content !== null && content !== undefined && content !== '') {
      this._info.append(content instanceof Node ? content : document.createTextNode(String(content)));
    }
    this._info.hidden = this.showInfo === 'false';
    if (typeof content === 'string' || typeof content === 'number') base.setAttribute('aria-valuetext', String(content));
    else base.removeAttribute('aria-valuetext');

    if (type === 'line' && !steps) this._drawLine(percent, success, sizeKey, sizeNum, useGradient, colors);
    else if (steps) this._drawSteps(percent, steps, sizeKey, sizeNum, useGradient, colors);
    else this._drawCircle(percent, success, hasSuccess, sizeKey, sizeNum, useGradient, colors);
  }

  _strokePx(sizeKey, sizeNum) {
    if (this.strokeWidth > 0) return this.strokeWidth;
    if (sizeKey) return LINE_STROKE[sizeKey];
    return sizeNum > 0 ? sizeNum : LINE_STROKE.md;
  }

  _drawLine(percent, success, sizeKey, sizeNum, useGradient, colors) {
    const base = this._base;
    base.replaceChildren(this._track, this._info);
    base.style.setProperty('--_progress-stroke', `${this._strokePx(sizeKey, sizeNum)}px`);
    base.style.setProperty('--_progress-radius', this.strokeLinecap === 'round' ? '999px' : '0');
    this._bar.style.width = `${percent}%`;
    this._successBar.style.width = `${success}%`;
    this._successBar.hidden = success <= 0;
    if (useGradient) base.style.setProperty('--_progress-gradient', `linear-gradient(to right, ${colors[0]}, ${colors[1]})`);
    else base.style.removeProperty('--_progress-gradient');
  }

  _drawSteps(percent, count, sizeKey, sizeNum, useGradient, colors) {
    const base = this._base;
    base.replaceChildren(this._steps, this._info);
    base.style.setProperty('--_progress-stroke', `${this._strokePx(sizeKey, sizeNum)}px`);
    base.style.setProperty('--_progress-step-width', `${STEP_WIDTH[sizeKey || 'md']}px`);

    const on = Math.round((count * percent) / 100);
    while (this._steps.children.length > count) this._steps.lastChild.remove();
    while (this._steps.children.length < count) this._steps.append(createElement('span', { className: 'step' }));
    [...this._steps.children].forEach((step, i) => {
      const active = i < on;
      step.className = active ? 'step step--on' : 'step';
      step.setAttribute('part', active ? 'step step-active' : 'step');
      // Gradient: mỗi ô một màu nội suy giữa from → to
      if (active && useGradient) {
        const ratio = count > 1 ? Math.round((i / (count - 1)) * 100) : 0;
        step.style.setProperty('--_progress-step-color', `color-mix(in srgb, ${colors[1]} ${ratio}%, ${colors[0]})`);
      } else step.style.removeProperty('--_progress-step-color');
    });
  }

  _drawCircle(percent, success, hasSuccess, sizeKey, sizeNum, useGradient, colors) {
    const base = this._base;
    base.replaceChildren(this._circle);
    this._circle.append(this._info);
    base.style.removeProperty('--_progress-gradient');

    const diameter = sizeKey ? CIRCLE_SIZE[sizeKey] : (sizeNum > 0 ? sizeNum : CIRCLE_SIZE.md);
    base.style.setProperty('--_progress-diameter', `${diameter}px`);

    const stroke = this.strokeWidth > 0 ? this.strokeWidth : 6;
    const r = String(50 - stroke / 2);
    const dashboard = this._type === 'dashboard';
    const gap = dashboard ? Math.min(Math.max(Number(this.gapDegree) || 0, 0), 295) : 0;
    // Độ dài cung nhìn thấy (theo pathLength 100)
    const arc = 100 * (1 - gap / 360);
    // Circle bắt đầu từ 12 giờ; dashboard bắt đầu ngay sau khe hở ở đáy (chạy theo chiều kim đồng hồ)
    const rotate = dashboard ? 90 + gap / 2 : -90;

    for (const el of [this._trail, this._path, this._successPath]) {
      el.setAttribute('r', r);
      el.setAttribute('stroke-width', String(stroke));
      el.setAttribute('stroke-linecap', this.strokeLinecap || 'round');
      el.setAttribute('transform', `rotate(${rotate} 50 50)`);
    }

    this._trail.setAttribute('stroke-dasharray', `${arc} 100`);
    this._path.setAttribute('stroke-dasharray', `${(arc * percent) / 100} 100`);
    this._successPath.setAttribute('stroke-dasharray', `${(arc * success) / 100} 100`);
    // Đầu nét tròn vẫn vẽ 1 chấm khi độ dài = 0 → ẩn hẳn
    this._path.style.opacity = percent > 0 ? '' : '0';
    this._successPath.style.opacity = hasSuccess && success > 0 ? '' : '0';

    if (useGradient) {
      this._stopFrom.setAttribute('stop-color', colors[0]);
      this._stopTo.setAttribute('stop-color', colors[1]);
      this._path.style.stroke = `url(#${this._gradientId})`;
    } else {
      this._path.style.stroke = '';
    }
  }
}

defineElement('hui-progress', HuiProgress);

export default HuiProgress;
