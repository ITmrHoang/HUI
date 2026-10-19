/**
 * HUI Pattern — nền hoa văn lưới / chấm / sọc mờ dần ra mép (A7.4), hay dùng sau hero.
 *   <hui-pattern>…</hui-pattern>                                   ← lưới, mờ dần hình tròn
 *   <hui-pattern variant="dots" size="18" color="primary-3" fade="bottom">…</hui-pattern>
 *   <hui-pattern variant="lines" angle="135" animated>…</hui-pattern>
 * Thuần CSS (background-image + mask-image) → nhẹ, không cần canvas.
 */

import styles from './hui-pattern.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { toCssColor } from '../../effects/colors.js';
import { watchMotion } from '../../effects/motion-watch.js';

const VARIANTS = ['grid', 'dots', 'lines'];
const FADES = ['radial', 'top', 'bottom', 'edges', 'none'];

/**
 * @slot - Nội dung nằm trên hoa văn
 * @csspart base - Khung ngoài
 * @csspart pattern - Lớp hoa văn
 * @csspart content - Khung nội dung
 * @cssprop --hui-pattern-color - Màu nét (ghi đè attribute color)
 * @cssprop --hui-pattern-bg - Nền khung (mặc định trong suốt)
 * @cssprop --hui-pattern-opacity - Độ đậm lớp hoa văn (mặc định 1)
 * @cssprop --hui-pattern-mask - mask-image tuỳ biến (ghi đè attribute fade)
 * @cssprop --hui-pattern-radius - Bo góc khung
 * @cssprop --hui-pattern-padding - Khoảng đệm nội dung
 * @cssprop --hui-pattern-min-height - Chiều cao tối thiểu
 * @cssprop --hui-pattern-duration - Chu kỳ trôi khi animated (mặc định 6s)
 */
class HuiPattern extends HuiElement {
  static properties = {
    /** grid | dots | lines — kiểu hoa văn */
    variant: { type: String, default: 'grid' },
    /** Khoảng cách ô lặp (px) */
    size: { type: Number, default: 24 },
    /** Màu nét; nhận tên token ("primary-3") hoặc màu CSS */
    color: { type: String, default: 'var(--hui-border)' },
    /** Độ dày nét / bán kính chấm (px) */
    thickness: { type: Number, default: 1 },
    /** radial | top | bottom | edges | none — vùng mờ dần */
    fade: { type: String, default: 'radial' },
    /** Góc sọc (độ, variant="lines") */
    angle: { type: Number, default: 45 },
    /** Hoa văn trôi chậm (grid / dots) */
    animated: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._layer = createElement('div', { className: 'pat__layer', part: 'pattern', 'aria-hidden': 'true' });
    this._base = createElement('div', { className: 'pat', part: 'base' },
      this._layer,
      createElement('div', { className: 'pat__content', part: 'content' }, createElement('slot')));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._stopMotion = watchMotion((off) => this._base.classList.toggle('is-still', off));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopMotion?.();
  }

  updated(changed) {
    const s = this._layer.style;
    if (changed.has('variant')) {
      const v = VARIANTS.includes(this.variant) ? this.variant : 'grid';
      VARIANTS.forEach((name) => this._base.classList.toggle(`pat--${name}`, name === v));
    }
    if (changed.has('fade')) {
      const f = FADES.includes(this.fade) ? this.fade : 'radial';
      FADES.forEach((name) => this._base.classList.toggle(`pat--fade-${name}`, name === f));
    }
    if (changed.has('size')) s.setProperty('--_pat-size', `${Math.max(4, Number(this.size) || 24)}px`);
    if (changed.has('thickness')) s.setProperty('--_pat-t', `${Math.max(0.5, Number(this.thickness) || 1)}px`);
    if (changed.has('color')) s.setProperty('--_pat-color', toCssColor(this.color || 'var(--hui-border)'));
    if (changed.has('angle')) s.setProperty('--_pat-angle', `${Number(this.angle) || 0}deg`);
    if (changed.has('animated')) this._base.classList.toggle('pat--animated', this.animated);
  }
}

defineElement('hui-pattern', HuiPattern);

export default HuiPattern;
