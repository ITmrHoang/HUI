/**
 * HUI Parallax — các lớp con trôi với tốc độ khác nhau khi cuộn (A7.4).
 *   <hui-parallax speed="0.3" style="height: 420px">
 *     <img data-layer data-speed="0.5" src="…" alt="">     ← lớp nền (data-layer: phủ kín khung)
 *     <div data-layer data-speed="0.2">…</div>
 *     <h1 data-speed="-0.15">Tiêu đề</h1>                 ← số âm: trôi nhanh hơn (tiền cảnh)
 *   </hui-parallax>
 * speed > 0: lớp trôi chậm hơn trang (cảm giác ở xa); 0: đứng yên theo trang; < 0: nhanh hơn.
 * Dùng thuộc tính `translate` (không đè transform của lớp). Tự tìm khung cuộn gần nhất (hoặc window).
 * Giảm chuyển động / no-animation → các lớp đứng yên ở vị trí gốc.
 */

import styles from './hui-parallax.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { onScroll, inView } from '../../utils/scroll.js';
import { watchMotion } from '../../effects/motion-watch.js';

/** Khung cuộn gần nhất (đi xuyên Shadow DOM); không có → window */
function findScroller(el) {
  let node = el.parentElement || el.getRootNode()?.host;
  while (node && node !== document.body && node !== document.documentElement) {
    const { overflowY, overflowX } = getComputedStyle(node);
    if (/(auto|scroll|overlay)/.test(overflowY + overflowX)) return node;
    node = node.parentElement || node.getRootNode()?.host;
  }
  return window;
}

/**
 * @slot - Các lớp (phần tử con; data-speed riêng từng lớp, data-layer = phủ kín khung)
 * @csspart base - Khung ngoài
 * @cssprop --hui-parallax-height - Chiều cao khung (mặc định auto)
 * @cssprop --hui-parallax-overflow - Cắt phần lớp tràn ra ngoài (mặc định hidden)
 * @cssprop --hui-parallax-radius - Bo góc khung
 */
class HuiParallax extends HuiElement {
  static properties = {
    /** Tốc độ mặc định cho lớp không có data-speed (0 = theo trang, 0.5 = chậm một nửa, âm = nhanh hơn) */
    speed: { type: Number, default: 0.3 },
    /** y | x — trục trôi */
    axis: { type: String, default: 'y' },
    /** Tắt hiệu ứng: các lớp đứng yên */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._base = createElement('div', { className: 'px', part: 'base' }, createElement('slot'));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._active = true;
    this._scroller = findScroller(this);
    this._stopScroll = onScroll(this._scroller, () => this.refresh());
    this._stopView = inView(this, (entry) => {
      this._active = entry.isIntersecting;
      if (this._active) this.refresh();
    }, { threshold: 0, rootMargin: '25% 0px' });
    this._stopMotion = watchMotion((off) => {
      this._still = off;
      this.refresh();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopScroll?.();
    this._stopView?.();
    this._stopMotion?.();
  }

  updated() {
    this.refresh();
  }

  /** Các lớp đang tham gia (con trực tiếp) */
  get layers() {
    return [...this.children];
  }

  /** Tính lại vị trí các lớp (gọi khi tự đổi bố cục bằng JS) */
  refresh() {
    if (!this._hasRendered || !this.isConnected) return;
    const layers = this.layers;
    if (this.noAnimation || this._still) {
      layers.forEach((l) => { l.style.translate = ''; });
      return;
    }
    if (!this._active) return;
    const rect = this.getBoundingClientRect();
    const vp = this._scroller === window
      ? { top: 0, left: 0, height: innerHeight, width: innerWidth }
      : this._scroller.getBoundingClientRect();
    const horizontal = this.axis === 'x';
    // Độ lệch tâm khung so với tâm vùng nhìn: 0 khi khung nằm giữa màn hình → lớp về đúng chỗ gốc
    const delta = horizontal
      ? rect.left + rect.width / 2 - (vp.left + vp.width / 2)
      : rect.top + rect.height / 2 - (vp.top + vp.height / 2);
    for (const layer of layers) {
      const own = parseFloat(layer.getAttribute('data-speed'));
      const sp = Number.isFinite(own) ? own : Number(this.speed) || 0;
      const v = (-delta * sp).toFixed(1);
      layer.style.translate = sp === 0 ? '' : horizontal ? `${v}px 0` : `0 ${v}px`;
    }
  }
}

defineElement('hui-parallax', HuiParallax);

export default HuiParallax;
