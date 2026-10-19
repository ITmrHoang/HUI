/**
 * HUI Compare Slider — so sánh ảnh trước / sau bằng thanh kéo (Molecule)
 *   <hui-compare-slider before-src="old.jpg" after-src="new.jpg" before-label="Trước" after-label="Sau"></hui-compare-slider>
 *   <hui-compare-slider position="30" orientation="vertical">
 *     <img slot="before" src="a.jpg" alt="…"><img slot="after" src="b.jpg" alt="…">
 *   </hui-compare-slider>
 * Ảnh "sau" nằm dưới (quyết định chiều cao khi không có ratio), ảnh "trước" phủ lên và được cắt bằng clip-path.
 * Tay nắm là role="slider" (APG): ←/→ (↑/↓) từng bước, PageUp/PageDown 10, Home/End.
 */

import styles from './hui-compare-slider.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { tx, toAspectRatio } from '../hui-image/media-shared.js';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * @fires input - Vị trí đổi trong lúc kéo / bấm phím. detail: { position }
 * @fires change - Kết thúc thay đổi (thả chuột, bấm phím). detail: { position }
 * @slot before - Nội dung "trước" (ảnh, video…) — thay before-src
 * @slot after - Nội dung "sau" — thay after-src
 * @slot handle - Nội dung tay nắm tùy biến
 * @csspart base - Khung ngoài
 * @csspart before - Lớp "trước" (bị cắt)
 * @csspart after - Lớp "sau"
 * @csspart divider - Đường chia
 * @csspart handle - Tay nắm (role="slider")
 * @csspart label - Mỗi nhãn (thêm label-before / label-after)
 * @cssprop --hui-compare-slider-divider-width - Độ dày đường chia (mặc định 2px)
 * @cssprop --hui-compare-slider-divider-color - Màu đường chia (mặc định --hui-text-light-solid)
 * @cssprop --hui-compare-slider-handle-size - Đường kính tay nắm (mặc định 40px)
 * @cssprop --hui-compare-slider-handle-bg - Nền tay nắm (mặc định --hui-bg-elevated)
 * @cssprop --hui-compare-slider-handle-color - Màu icon tay nắm (mặc định --hui-text)
 * @cssprop --hui-compare-slider-radius - Bo góc (mặc định --hui-radius-lg)
 * @cssprop --hui-compare-slider-label-bg - Nền nhãn (mặc định --hui-bg-spotlight)
 * @cssprop --hui-compare-slider-label-color - Màu chữ nhãn (mặc định --hui-text-light-solid)
 * @cssprop --hui-compare-slider-focus-color - Viền focus tay nắm
 */
class HuiCompareSlider extends HuiElement {
  static properties = {
    /** Vị trí đường chia, 0–100 (% phần "trước" hiện ra) */
    position: { type: Number, default: 50 },
    /** horizontal | vertical — chia trái/phải hoặc trên/dưới */
    orientation: { type: String, default: 'horizontal' },
    /** Ảnh "trước" (thay cho slot before) */
    beforeSrc: { type: String },
    /** Ảnh "sau" (thay cho slot after) */
    afterSrc: { type: String },
    /** alt của ảnh "trước" */
    beforeAlt: { type: String },
    /** alt của ảnh "sau" */
    afterAlt: { type: String },
    /** Nhãn góc ảnh "trước" (vd "Trước") — bỏ trống = không hiện */
    beforeLabel: { type: String },
    /** Nhãn góc ảnh "sau" */
    afterLabel: { type: String },
    /** Tỉ lệ khung: 16/9, 4/3… Bỏ trống = theo nội dung "sau" */
    ratio: { type: String },
    /** Bước khi bấm phím mũi tên (mặc định 1) */
    step: { type: Number, default: 1 },
    /** Di chuyển đường chia theo con trỏ chuột khi rê (không cần nhấn giữ) */
    hover: { type: Boolean },
    /** Nhãn ARIA của tay nắm (mặc định theo locale) */
    label: { type: String },
    /** Không cho kéo / bấm phím */
    disabled: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  render() {
    this._beforeImg = createElement('img', { className: 'media', draggable: 'false', alt: '' });
    this._afterImg = createElement('img', { className: 'media', draggable: 'false', alt: '' });
    this._before = createElement('div', { className: 'layer layer--before', part: 'before' },
      createElement('slot', { name: 'before' }, this._beforeImg));
    this._after = createElement('div', { className: 'layer layer--after', part: 'after' },
      createElement('slot', { name: 'after' }, this._afterImg));

    this._beforeLabel = createElement('span', { className: 'label label--before', part: 'label label-before', 'aria-hidden': 'true' });
    this._afterLabel = createElement('span', { className: 'label label--after', part: 'label label-after', 'aria-hidden': 'true' });

    this._handle = createElement('div', { className: 'handle', part: 'handle', role: 'slider', tabindex: '0', 'aria-valuemin': '0', 'aria-valuemax': '100' },
      createElement('slot', { name: 'handle' }, createElement('span', { className: 'handle__arrows', 'aria-hidden': 'true' })));
    this._divider = createElement('div', { className: 'divider', part: 'divider' }, this._handle);

    this._base = createElement('div', { className: 'compare', part: 'base' },
      this._after, this._before, this._afterLabel, this._beforeLabel, this._divider);

    this._base.addEventListener('pointerdown', (e) => this._onDown(e));
    this._base.addEventListener('pointermove', (e) => this._onMove(e));
    this._base.addEventListener('pointerup', (e) => this._onUp(e));
    this._base.addEventListener('pointercancel', (e) => this._onUp(e));
    this._base.addEventListener('dragstart', (e) => e.preventDefault());
    this._handle.addEventListener('keydown', (e) => this._onKeydown(e));
    return this._base;
  }

  updated(changed) {
    if (changed.has('position')) this._paint();
    if (changed.has('orientation')) {
      const vertical = this.orientation === 'vertical';
      this._base.classList.toggle('compare--vertical', vertical);
      this._handle.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
    }
    if (changed.has('beforeSrc')) this._setSrc(this._beforeImg, this.beforeSrc);
    if (changed.has('afterSrc')) this._setSrc(this._afterImg, this.afterSrc);
    if (changed.has('beforeAlt')) this._beforeImg.alt = this.beforeAlt || '';
    if (changed.has('afterAlt')) this._afterImg.alt = this.afterAlt || '';
    if (changed.has('beforeLabel')) {
      this._beforeLabel.textContent = this.beforeLabel || '';
      this._beforeLabel.hidden = !this.beforeLabel;
    }
    if (changed.has('afterLabel')) {
      this._afterLabel.textContent = this.afterLabel || '';
      this._afterLabel.hidden = !this.afterLabel;
    }
    if (changed.has('ratio')) {
      const r = toAspectRatio(this.ratio);
      if (r) this._base.style.setProperty('--_compare-ratio', r);
      else this._base.style.removeProperty('--_compare-ratio');
      this._base.classList.toggle('compare--ratio', Boolean(r));
    }
    if (changed.has('disabled')) {
      this._base.classList.toggle('compare--disabled', this.disabled);
      this._handle.setAttribute('tabindex', this.disabled ? '-1' : '0');
      if (this.disabled) this._handle.setAttribute('aria-disabled', 'true');
      else this._handle.removeAttribute('aria-disabled');
    }
    if (['label', 'locale', 'position', 'beforeLabel'].some((k) => changed.has(k))) {
      this._handle.setAttribute('aria-label', this.label || tx('compare.label'));
      this._handle.setAttribute('aria-valuetext', tx('compare.valueText', { value: this._value }));
    }
  }

  // =====================================================
  // NỘI BỘ
  // =====================================================

  get _value() {
    const v = Number(this.position);
    return Math.round(clamp(Number.isFinite(v) ? v : 50, 0, 100) * 100) / 100;
  }

  _setSrc(img, src) {
    if (src) img.src = src;
    else img.removeAttribute('src');
  }

  _paint() {
    const v = this._value;
    this._base.style.setProperty('--_compare-pos', `${v}%`);
    this._handle.setAttribute('aria-valuenow', String(v));
    this.setState('start', v <= 0);
    this.setState('end', v >= 100);
  }

  /** Đặt vị trí + phát input (và change nếu commit) */
  _setPosition(v, commit) {
    const next = Math.round(clamp(v, 0, 100) * 100) / 100;
    const changedValue = next !== this._value;
    if (changedValue) {
      this.position = next;
      this.emit('input', { position: next });
    }
    if (commit && (changedValue || this._dirty)) this.emit('change', { position: next });
    this._dirty = !commit && (this._dirty || changedValue);
  }

  _positionFromEvent(e) {
    const r = this._base.getBoundingClientRect();
    if (this.orientation === 'vertical') return r.height ? ((e.clientY - r.top) / r.height) * 100 : 50;
    return r.width ? ((e.clientX - r.left) / r.width) * 100 : 50;
  }

  _onDown(e) {
    if (this.disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    this._dragging = true;
    try { this._base.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
    this._base.classList.add('is-dragging');
    this._setPosition(this._positionFromEvent(e), false);
    // Bấm vào ảnh → tay nắm nhận focus để dùng tiếp bàn phím
    this._handle.focus({ preventScroll: true });
    e.preventDefault();
  }

  _onMove(e) {
    if (this.disabled) return;
    if (this._dragging || (this.hover && e.pointerType === 'mouse')) this._setPosition(this._positionFromEvent(e), false);
  }

  _onUp(e) {
    if (!this._dragging) return;
    this._dragging = false;
    try { this._base.releasePointerCapture(e.pointerId); } catch { /* bỏ qua */ }
    this._base.classList.remove('is-dragging');
    this._setPosition(this._value, true);
  }

  _onKeydown(e) {
    if (this.disabled) return;
    const step = this.step > 0 ? this.step : 1;
    const v = this._value;
    const keys = {
      ArrowLeft: v - step,
      ArrowDown: v - step,
      ArrowRight: v + step,
      ArrowUp: v + step,
      PageDown: v - 10,
      PageUp: v + 10,
      Home: 0,
      End: 100,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    this._setPosition(keys[e.key], true);
  }
}

defineElement('hui-compare-slider', HuiCompareSlider);

export default HuiCompareSlider;
