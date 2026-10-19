/**
 * HUI Scrolly — scrollytelling: một cột đồ họa dính (sticky, cao full màn hình) + cột các bước (Organism, A3.3).
 *   <hui-scrolly side="left">
 *     <div slot="sticky">…ảnh / biểu đồ…</div>
 *     <hui-scrolly-step>Bước 1</hui-scrolly-step>
 *     <hui-scrolly-step>Bước 2</hui-scrolly-step>
 *   </hui-scrolly>
 *   hui-scrolly[step="1"] .chart { … }   ← đổi đồ họa theo bước bằng CSS, hoặc nghe hui-step-enter
 *
 * Bước nào cắt qua đường ngang giữa màn hình (IntersectionObserver rootMargin -50%) thì thành bước hiện tại:
 * gắn `active` lên bước, `step` lên host, phát `hui-step-enter`. Khung hẹp hơn `breakpoint` → xếp chồng,
 * đồ họa dính ở trên cùng, các bước cuộn bên dưới.
 */

import styles from './hui-scrolly.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import './hui-scrolly-step.js';

const STEP_TAG = 'hui-scrolly-step';

/**
 * @fires hui-step-enter - Một bước trở thành bước hiện tại. detail: { index, step, direction: 'down' | 'up' }
 * @fires hui-step-exit - Bước hiện tại nhường chỗ cho bước khác. detail: { index, step }
 * @slot sticky - Đồ họa dính (ảnh, biểu đồ, bản đồ…)
 * @slot - Các bước: <hui-scrolly-step> (hoặc phần tử bất kỳ có attribute data-scrolly-step)
 * @csspart base - Khung lưới 2 cột
 * @csspart graphic - Cột đồ họa dính
 * @csspart steps - Cột các bước
 * @cssprop --hui-scrolly-graphic-width - Bề rộng cột đồ họa (mặc định 1fr = bằng cột bước)
 * @cssprop --hui-scrolly-steps-width - Bề rộng cột bước (mặc định 1fr)
 * @cssprop --hui-scrolly-gap - Khoảng cách 2 cột (mặc định --hui-space-2xl)
 * @cssprop --hui-scrolly-top - Khoảng cách đồ họa tới mép trên khi dính (mặc định 0, vd chừa chỗ header)
 * @cssprop --hui-scrolly-graphic-height - Chiều cao đồ họa (mặc định 100vh)
 * @cssprop --hui-scrolly-stacked-height - Chiều cao đồ họa khi xếp chồng (mặc định 50vh)
 * @cssprop --hui-scrolly-graphic-bg - Nền cột đồ họa (mặc định --hui-bg-container)
 * @cssprop --hui-scrolly-step-gap - Khoảng cách giữa các bước (mặc định 0 — bước tự cao 80vh)
 */
class HuiScrolly extends HuiElement {
  static properties = {
    /** left | right — cột đồ họa dính nằm bên nào */
    side: { type: String, default: 'left' },
    /** Bề rộng khung (px) dưới mức này thì xếp chồng 1 cột, đồ họa dính ở trên */
    breakpoint: { type: Number, default: 768 },
    /** Vị trí đường kích hoạt theo chiều cao khung nhìn (0 = mép trên, 0.5 = giữa, 1 = mép dưới) */
    offset: { type: Number, default: 0.5 },
    /** Chỉ số bước hiện tại (-1 = chưa có) — component tự cập nhật, gán để đổi bằng code (không cuộn) */
    step: { type: Number, default: -1 },
    /** CSS selector của khung cuộn chứa scrolly (bỏ trống = cửa sổ) */
    root: { type: String },
    /** Tắt cuộn mượt khi gọi scrollToStep() */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._steps = [];
    this._active = new Set();
  }

  render() {
    this._stepSlot = createElement('slot');
    this._stepSlot.addEventListener('slotchange', () => this._syncSteps());
    this._graphic = createElement('div', { className: 'scrolly__graphic', part: 'graphic' }, createElement('slot', { name: 'sticky' }));
    this._stepsBox = createElement('div', { className: 'scrolly__steps', part: 'steps' }, this._stepSlot);
    this._base = createElement('div', { className: 'scrolly', part: 'base' }, this._graphic, this._stepsBox);
    return this._base;
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback();
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._syncStacked());
      this._ro.observe(this);
    }
    this._observe();
    if (reconnect) this._syncSteps();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._io?.disconnect();
    this._io = null;
    this._ro?.disconnect();
    this._ro = null;
  }

  updated(changed) {
    if (changed.has('side')) this._base.classList.toggle('scrolly--right', this.side === 'right');
    if (changed.has('breakpoint')) this._syncStacked();
    if ((changed.has('offset') || changed.has('root')) && this._io) this._observe();
    if (changed.has('step')) this._applyStep();
  }

  // =====================================================
  // API
  // =====================================================

  /** Các phần tử bước (chỉ đọc) */
  get steps() {
    return [...this._steps];
  }

  /** Cuộn để bước thứ i nằm giữa khung nhìn (bước sẽ tự thành bước hiện tại khi cắt qua đường kích hoạt) */
  scrollToStep(index, { smooth = true } = {}) {
    const el = this._steps[Math.max(0, Math.min(this._steps.length - 1, Number(index) || 0))];
    el?.scrollIntoView({ block: 'center', behavior: smooth && !this.noAnimation && !prefersReducedMotion() ? 'smooth' : 'auto' });
  }

  // =====================================================
  // NỘI BỘ
  // =====================================================

  _syncSteps() {
    const next = this._stepSlot.assignedElements().filter((el) => el.localName === STEP_TAG || el.hasAttribute('data-scrolly-step'));
    for (const el of this._steps) if (!next.includes(el)) this._io?.unobserve(el);
    for (const el of next) if (!this._steps.includes(el)) this._io?.observe(el);
    this._steps = next;
    next.forEach((el, i) => el.setAttribute('data-index', String(i)));
    this._applyStep();
  }

  _resolveRoot() {
    if (!this.root) return null;
    try {
      return this.closest(this.root) || document.querySelector(this.root);
    } catch {
      return null;
    }
  }

  _observe() {
    this._io?.disconnect();
    this._io = null;
    this._active.clear();
    if (typeof IntersectionObserver !== 'function') return;
    const o = Math.min(1, Math.max(0, Number.isFinite(this.offset) ? this.offset : 0.5));
    // Vùng gốc thu về 1 đường ngang ở vị trí offset → bước "cắt qua" đường đó mới tính là đang giao
    const top = -(o * 100);
    const bottom = -((1 - o) * 100);
    this._io = new IntersectionObserver((entries) => this._onIntersect(entries), {
      root: this._resolveRoot(),
      rootMargin: `${top}% 0px ${bottom}% 0px`,
      threshold: 0,
    });
    for (const el of this._steps) this._io.observe(el);
  }

  _onIntersect(entries) {
    for (const e of entries) {
      if (e.isIntersecting) this._active.add(e.target);
      else this._active.delete(e.target);
    }
    // Nhiều bước cùng giao (bước ngắn) → lấy bước có chỉ số lớn nhất khi cuộn xuống
    const indexes = [...this._active].map((el) => this._steps.indexOf(el)).filter((i) => i >= 0);
    if (!indexes.length) return; // giữa 2 bước / ngoài vùng → giữ bước cũ để đồ họa không trống
    const next = Math.max(...indexes);
    if (next === this.step) return;
    const prev = this.step;
    this.step = next;
    if (prev >= 0 && this._steps[prev]) this.emit('hui-step-exit', { index: prev, step: this._steps[prev] });
    this.emit('hui-step-enter', { index: next, step: this._steps[next], direction: next > prev ? 'down' : 'up' });
  }

  _applyStep() {
    const current = this.step;
    this._steps.forEach((el, i) => {
      const on = i === current;
      el.toggleAttribute('active', on);
      if (on) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
    this.setState('started', current >= 0);
  }

  _syncStacked() {
    const width = this.getBoundingClientRect().width;
    const bp = Number.isFinite(this.breakpoint) ? this.breakpoint : 768; // 0 = không bao giờ xếp chồng
    const stacked = width > 0 && width < bp;
    this._base.classList.toggle('scrolly--stacked', stacked);
    this.setState('stacked', stacked);
  }
}

defineElement('hui-scrolly', HuiScrolly);

export default HuiScrolly;
