/**
 * HUI Scroll Progress — Thanh tiến độ đọc trang ở mép trên / dưới cửa sổ (hoặc nằm trong luồng trang).
 * Theo dõi cuộn của window hoặc một vùng cuộn (`target` = CSS selector). Biến CSS: xem đầu hui-scroll-progress.css.
 */

import styles from './hui-scroll-progress.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { onScroll } from '../../utils/scroll.js';

/** Chuỗi dự phòng khi locale.js chưa có key scrollProgress.* */
const FALLBACK = {
  vi: { label: 'Tiến độ đọc trang' },
  en: { label: 'Reading progress' },
};

function tr(key) {
  const path = `scrollProgress.${key}`;
  const value = t(path);
  return value === path ? (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? key : value;
}

/**
 * @fires hui-progress - Tiến độ thay đổi. detail: { percent } (0–100, làm tròn)
 * @csspart base - Rãnh thanh (role="progressbar")
 * @csspart bar - Phần đã đọc
 * @cssprop --hui-scroll-progress-color - Màu thanh (attribute color ưu tiên hơn; mặc định --hui-primary)
 * @cssprop --hui-scroll-progress-track-color - Màu rãnh (mặc định trong suốt)
 * @cssprop --hui-scroll-progress-height - Độ dày (attribute height ưu tiên hơn; mặc định 3px)
 * @cssprop --hui-scroll-progress-z-index - Lớp xếp chồng khi fixed (mặc định --hui-z-sticky)
 * @cssprop --hui-scroll-progress-radius - Bo góc đầu thanh
 */
class HuiScrollProgress extends HuiElement {
  static properties = {
    /** CSS selector của vùng cuộn cần theo dõi; trống = cuộn của cả trang (window). Gán Element bằng JS cũng được */
    target: { type: String, reflect: false },
    /** top | bottom — mép trên | mép dưới cửa sổ (khi fixed) */
    position: { type: String, default: 'top' },
    /** Độ dày: số (px) hoặc độ dài CSS */
    height: { type: String },
    /** Màu CSS của thanh */
    color: { type: String },
    /** 'false' = thanh nằm trong luồng trang (không cố định ở mép cửa sổ) */
    fixed: { type: String, default: 'true' },
    /** Nhãn cho trình đọc màn hình (mặc định theo locale scrollProgress.label) */
    label: { type: String },
    /** Tắt hiệu ứng chạy của thanh */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._percent = 0;
    this._stop = null;
    this._retry = 0;
  }

  /** Tiến độ hiện tại 0–100 (chỉ đọc) */
  get value() {
    return this._percent;
  }

  render() {
    this._bar = createElement('div', { className: 'bar', part: 'bar' });
    this._base = createElement('div', {
      className: 'track', part: 'base', role: 'progressbar',
      'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0',
    }, this._bar);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._attach();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._detach();
  }

  updated(changed) {
    const fixed = String(this.fixed) !== 'false';
    this._base.className = [
      'track',
      fixed ? 'track--fixed' : 'track--inline',
      fixed && this.position === 'bottom' ? 'track--bottom' : '',
      this.noAnimation ? 'track--no-animation' : '',
    ].filter(Boolean).join(' ');
    this.setState('fixed', fixed);

    if (changed.has('color')) {
      if (this.color) this._base.style.setProperty('--_sp-color', this.color);
      else this._base.style.removeProperty('--_sp-color');
    }
    if (changed.has('height')) {
      const h = this.height;
      if (h) this._base.style.setProperty('--_sp-height', /^\d+(\.\d+)?$/.test(h) ? `${h}px` : h);
      else this._base.style.removeProperty('--_sp-height');
    }
    if (changed.has('label') || changed.has('locale')) {
      this._base.setAttribute('aria-label', this.label || tr('label'));
    }
    // Đổi vùng cuộn → gắn lại (lần đầu do connectedCallback lo)
    if (changed.has('target') && changed.get('target') !== undefined && this.isConnected) this._attach();
  }

  // =====================================================
  // THEO DÕI CUỘN
  // =====================================================

  /** Phần tử cuộn theo `target`: selector / Element / trống = window */
  _resolveTarget() {
    const target = this.target;
    if (!target) return window;
    if (target instanceof Element) return target;
    try {
      return document.querySelector(target);
    } catch {
      return null; // selector không hợp lệ
    }
  }

  _attach() {
    this._detach();
    const el = this._resolveTarget();
    if (!el) {
      // Vùng cuộn chưa có trong trang (render sau) → thử lại ở frame kế tiếp, tối đa ~1 giây
      if (this._retry++ < 60) this._raf = requestAnimationFrame(() => this.isConnected && this._attach());
      return;
    }
    this._retry = 0;
    this._stop = onScroll(el, ({ progress }) => this._draw(progress * 100));
  }

  _detach() {
    cancelAnimationFrame(this._raf);
    this._stop?.();
    this._stop = null;
  }

  _draw(percent) {
    const p = Math.min(100, Math.max(0, percent));
    this._bar.style.width = `${p}%`;
    const rounded = Math.round(p);
    const previous = Math.round(this._percent);
    this._percent = p;
    // Chỉ cập nhật ARIA + phát sự kiện khi phần trăm (làm tròn) đổi
    if (rounded === previous) return;
    this._base.setAttribute('aria-valuenow', String(rounded));
    this.emit('hui-progress', { percent: rounded });
  }
}

defineElement('hui-scroll-progress', HuiScrollProgress);

export default HuiScrollProgress;
