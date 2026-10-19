/**
 * HUI Blob — khung có các khối màu mờ trôi lơ lửng phía sau nội dung (A7.4).
 *   <hui-blob>…nội dung hero…</hui-blob>
 *   <hui-blob count="5" colors="primary, danger, warning" blur-radius="80" size="35%">…</hui-blob>
 * Vị trí khối được rải đều theo dãy tỉ lệ vàng (cố định, không ngẫu nhiên → không nhảy khi render lại).
 * Giảm chuyển động / no-animation → khối đứng yên.
 */

import styles from './hui-blob.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { parseColors } from '../../effects/colors.js';
import { watchMotion } from '../../effects/motion-watch.js';

const GOLDEN = 0.618033988749895;

/**
 * @slot - Nội dung nằm trên các khối màu
 * @csspart base - Khung ngoài
 * @csspart blobs - Lớp chứa các khối
 * @csspart blob - Mỗi khối màu
 * @csspart content - Khung nội dung
 * @cssprop --hui-blob-bg - Nền khung (mặc định trong suốt)
 * @cssprop --hui-blob-radius - Bo góc khung
 * @cssprop --hui-blob-padding - Khoảng đệm nội dung
 * @cssprop --hui-blob-min-height - Chiều cao tối thiểu
 */
class HuiBlob extends HuiElement {
  static properties = {
    /** Số khối màu (1–12) */
    count: { type: Number, default: 3 },
    /** Danh sách màu, phân cách dấu phẩy; nhận tên token: "primary, info, #f0abfc" */
    colors: { type: String, default: 'primary, info, success, warning, danger' },
    /** Cỡ mỗi khối (độ dài CSS, % theo chiều rộng khung) */
    size: { type: String, default: '45%' },
    /** Độ nhoè (px) */
    blurRadius: { type: Number, default: 60 }, // không đặt tên `blur` — trùng HTMLElement.blur()
    /** Độ đậm (0–1) */
    opacity: { type: Number, default: 0.5 },
    /** Chu kỳ trôi (ms) */
    duration: { type: Number, default: 20000 },
    /** Khối đứng yên */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._blobs = createElement('div', { className: 'blob__layer', part: 'blobs', 'aria-hidden': 'true' });
    this._base = createElement('div', { className: 'blob', part: 'base' },
      this._blobs,
      createElement('div', { className: 'blob__content', part: 'content' }, createElement('slot')));
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
    const s = this._blobs.style;
    if (changed.has('size')) s.setProperty('--_blob-size', this.size || '45%');
    if (changed.has('blurRadius')) s.setProperty('--_blob-blur', `${Math.max(0, Number(this.blurRadius) || 0)}px`);
    if (changed.has('opacity')) {
      const o = Number(this.opacity);
      s.setProperty('--_blob-opacity', String(Number.isFinite(o) ? Math.min(1, Math.max(0, o)) : 0.5));
    }
    if (changed.has('count') || changed.has('colors') || changed.has('duration')) this._build();
  }

  _build() {
    const n = Math.max(1, Math.min(12, Math.round(Number(this.count) || 3)));
    const colors = parseColors(this.colors, ['primary', 'info', 'success']);
    const dur = Math.max(2000, Number(this.duration) || 20000);
    const nodes = [];
    for (let i = 0; i < n; i++) {
      // Rải đều trong khung bằng dãy tỉ lệ vàng; hướng trôi luân phiên
      const x = ((i * GOLDEN + 0.1) % 1) * 80 - 10;
      const y = ((i * GOLDEN * 1.7 + 0.25) % 1) * 70 - 10;
      const el = createElement('span', { className: 'blob__item', part: 'blob' });
      Object.assign(el.style, { left: `${x.toFixed(1)}%`, top: `${y.toFixed(1)}%` });
      el.style.setProperty('--_blob-color', colors[i % colors.length]);
      el.style.setProperty('--_blob-dx', `${i % 2 ? -18 : 22}%`);
      el.style.setProperty('--_blob-dy', `${i % 3 ? 16 : -20}%`);
      el.style.setProperty('--_blob-dur', `${Math.round(dur * (0.8 + ((i * 0.37) % 0.4)))}ms`);
      el.style.setProperty('--_blob-delay', `${-Math.round((dur / n) * i)}ms`);
      nodes.push(el);
    }
    this._blobs.replaceChildren(...nodes);
  }
}

defineElement('hui-blob', HuiBlob);

export default HuiBlob;
