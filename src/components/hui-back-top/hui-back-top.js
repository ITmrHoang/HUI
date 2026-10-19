/**
 * HUI Back Top — Nút cuộn lên đầu trang (Ant FloatButton.BackTop + MUI Scroll to top)
 * Hiện (zoom + fade) khi cuộn quá `visibility-height`, vòng tiến độ % đã cuộn (`progress`),
 * cuộn mượt về đầu (nhảy thẳng khi người dùng bật giảm chuyển động).
 * Trong <hui-float-group>: nhóm tự gắn `inline` → nằm trong cụm nút thay vì cố định ở góc.
 */

import styles from './hui-back-top.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { onScroll, scrollToPosition } from '../../utils/scroll.js';
import { applyOffset, tr } from '../hui-float-button/float-utils.js';
import '../hui-icon/hui-icon.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * @slot icon - Icon tùy chỉnh (mặc định chevron-up)
 * @csspart base - Thẻ <button>
 * @csspart icon - Icon mặc định
 * @csspart progress - SVG vòng tiến độ
 * @csspart progress-track - Nền vòng tiến độ
 * @csspart progress-bar - Phần đã cuộn của vòng tiến độ
 * @cssprop --hui-back-top-size - Đường kính (sm 32px, md 40px, lg 48px)
 * @cssprop --hui-back-top-radius - Bo góc khi shape="square"
 * @cssprop --hui-back-top-bg - Nền
 * @cssprop --hui-back-top-color - Màu icon
 * @cssprop --hui-back-top-hover-bg - Nền khi hover
 * @cssprop --hui-back-top-shadow - Đổ bóng
 * @cssprop --hui-back-top-icon-size - Cỡ icon
 * @cssprop --hui-back-top-focus-color - Viền focus
 * @cssprop --hui-back-top-progress-color - Màu vòng tiến độ
 * @cssprop --hui-back-top-track-color - Màu nền vòng tiến độ
 * @cssprop --hui-back-top-offset-x - Khoảng cách tới mép trái/phải (24px)
 * @cssprop --hui-back-top-offset-y - Khoảng cách tới mép dưới (24px)
 */
class HuiBackTop extends HuiElement {
  static properties = {
    /** Cuộn quá số px này thì hiện nút */
    visibilityHeight: { type: Number, default: 400 },
    /** CSS selector của vùng cuộn; bỏ trống = cửa sổ trang */
    target: { type: String },
    /** bottom-right | bottom-left — góc màn hình */
    position: { type: String, default: 'bottom-right' },
    /** Khoảng cách tới mép (px): "24" hoặc "x,y" */
    offset: { type: String },
    /** circle | square — tròn hoặc vuông bo góc */
    shape: { type: String, default: 'circle' },
    /** sm | md | lg — 32 / 40 / 48px */
    size: { type: String, default: 'md' },
    /** Vòng quanh nút thể hiện % đã cuộn */
    progress: { type: Boolean },
    /** Nằm trong luồng trang thay vì cố định ở góc (hui-float-group tự đặt) */
    inline: { type: Boolean },
    /** Tắt hiệu ứng hiện/ẩn và cuộn mượt */
    noAnimation: { type: Boolean },
  };

  static styles = styles;
  static localized = true;

  constructor() {
    super();
    this._shown = false;
    this._token = 0;
    this._stop = null;
    this._retry = 0;
    this._scroller = window;
    this._lastTop = 0;
  }

  render() {
    // Vòng tiến độ: 2 hình (tròn / vuông), CSS hiện hình hợp với shape
    const circle = { cx: 20, cy: 20, r: 18.5, transform: 'rotate(-90 20 20)' };
    const rect = { x: 1.5, y: 1.5, width: 37, height: 37, rx: 10.5 };
    this._bars = [
      svg('circle', { ...circle, class: 'ring__bar ring__circle', part: 'progress-bar', pathLength: 100 }),
      svg('rect', { ...rect, class: 'ring__bar ring__rect', part: 'progress-bar', pathLength: 100 }),
    ];
    this._ring = svg('svg', { class: 'ring', part: 'progress', viewBox: '0 0 40 40', 'aria-hidden': 'true' });
    this._ring.append(
      svg('circle', { ...circle, class: 'ring__track ring__circle', part: 'progress-track' }),
      svg('rect', { ...rect, class: 'ring__track ring__rect', part: 'progress-track' }),
      ...this._bars,
    );

    const icon = createElement('hui-icon', { name: 'chevron-up', part: 'icon' });
    this._button = createElement('button', { type: 'button', part: 'base' },
      this._ring,
      createElement('span', { className: 'bt__icon' }, createElement('slot', { name: 'icon' }, icon)));
    this._button.addEventListener('click', () => this.scrollToTop());
    return this._button;
  }

  connectedCallback() {
    super.connectedCallback();
    this._bind();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unbind();
  }

  updated(changed) {
    if (['shape', 'size', 'noAnimation'].some((k) => changed.has(k))) {
      this._button.className = [
        'bt',
        `bt--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
        this.shape === 'square' ? 'bt--square' : '',
        this.noAnimation ? 'bt--no-animation' : '',
      ].filter(Boolean).join(' ');
    }

    if (changed.has('progress')) this._ring.hidden = !this.progress;
    if (changed.has('offset')) applyOffset(this, this.offset, 'backtop');

    if (changed.has('locale') || changed.has('target')) {
      const label = this.getAttribute('aria-label') || tr('backTop.label', { vi: 'Lên đầu trang', en: 'Back to top' });
      this._button.setAttribute('aria-label', label);
    }

    // Đổi vùng cuộn sau khi đã gắn → gắn lại listener; đổi ngưỡng → tính lại ngay
    if (changed.has('target') && this._stop) this._bind();
    else if (changed.has('visibilityHeight')) this._setVisible(this._lastTop >= this.visibilityHeight);
  }

  /** Cuộn vùng đích về đầu (mượt, trừ khi no-animation / giảm chuyển động) */
  scrollToTop() {
    scrollToPosition(this._scroller, { top: 0, smooth: !this.noAnimation });
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /** Tìm vùng cuộn theo selector: trong cùng shadow root trước, rồi tới document */
  _resolveTarget() {
    if (!this.target) return window;
    const root = this.getRootNode();
    return (root !== document && root.querySelector?.(this.target)) || document.querySelector(this.target);
  }

  _bind() {
    this._unbind();
    if (!this.isConnected) return;
    const el = this._resolveTarget();
    if (!el) {
      // Vùng cuộn có thể được render sau thẻ này → thử lại ở frame kế tiếp
      this._retry = requestAnimationFrame(() => this._bind());
      return;
    }
    this._scroller = el;
    this._stop = onScroll(el, (info) => {
      this._lastTop = info.top;
      this._setVisible(info.top >= this.visibilityHeight);
      // Luôn cập nhật (rẻ) để bật `progress` sau này vẫn đúng ngay
      const offset = String(100 - info.progress * 100);
      this._bars.forEach((bar) => bar.style.setProperty('stroke-dashoffset', offset));
    });
  }

  _unbind() {
    cancelAnimationFrame(this._retry);
    this._stop?.();
    this._stop = null;
  }

  /** Hiện/ẩn có hiệu ứng; attribute `visible` chỉ bị gỡ sau khi hiệu ứng ẩn chạy xong */
  _setVisible(visible) {
    if (visible === this._shown) return;
    this._shown = visible;
    const token = ++this._token;
    this.setState('visible', visible);

    if (visible) {
      this.toggleAttribute('visible', true);
      if (!this.noAnimation) animateIn(this._button, 'zoom');
      return;
    }
    if (this.noAnimation) {
      this.removeAttribute('visible');
      return;
    }
    animateOut(this._button, 'zoom').then(() => {
      if (token === this._token) this.removeAttribute('visible');
    });
  }
}

defineElement('hui-back-top', HuiBackTop);

export default HuiBackTop;
