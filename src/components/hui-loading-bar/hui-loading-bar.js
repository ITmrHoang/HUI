/**
 * HUI Loading Bar — Thanh tiến trình mảnh ở mép trên khi chuyển trang / gọi API (kiểu NProgress)
 *   import { loadingBar } from 'hui-lib/hui-loading-bar';
 *   loadingBar.start();          // hiện + tự nhích dần (trickle)
 *   await fetch(...);
 *   loadingBar.done();           // chạy tới 100% rồi mờ dần và tự gỡ khỏi trang
 *   loadingBar.error();          // chuyển đỏ rồi mờ dần
 * <hui-loading-bar> tự gắn vào <body>, nằm trên top-layer (Popover API) → trên cả Modal.
 * Dùng khai báo: <hui-loading-bar percent="40"></hui-loading-bar> (thêm `inline` để nằm trong luồng trang).
 * Chỉ là chỉ báo thị giác → aria-hidden (thông báo trạng thái cho trình đọc màn hình do trang tự lo).
 */

import styles from './hui-loading-bar.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import { supportsPopover } from '../../utils/floating.js';

const clamp = (n) => Math.min(100, Math.max(0, Number(n) || 0));

/**
 * @csspart bar - Thanh tiến trình
 * @csspart peg - Vệt sáng ở đầu thanh
 * @cssprop --hui-loading-bar-color - Màu thanh (mặc định --hui-primary)
 * @cssprop --hui-loading-bar-error-color - Màu khi lỗi (mặc định --hui-danger)
 * @cssprop --hui-loading-bar-height - Độ dày (3px)
 * @cssprop --hui-loading-bar-shadow - Vệt sáng ở đầu thanh
 */
class HuiLoadingBar extends HuiElement {
  static properties = {
    /** Tiến độ 0–100; bỏ trống = ẩn thanh */
    percent: { type: Number },
    /** normal | error — error: chuyển màu đỏ */
    status: { type: String, default: 'normal' },
    /** Màu CSS của thanh (ưu tiên hơn --hui-loading-bar-color) */
    color: { type: String },
    /** Độ dày: số (px) hoặc độ dài CSS */
    height: { type: String },
    /** Nằm trong luồng trang thay vì cố định ở mép trên cửa sổ */
    inline: { type: Boolean },
    /** Tắt hiệu ứng chạy / mờ dần */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._fading = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('aria-hidden', 'true');
  }

  render() {
    this._bar = createElement('div', { className: 'bar', part: 'bar', hidden: true },
      createElement('span', { className: 'peg', part: 'peg' }));
    return this._bar;
  }

  updated(changed) {
    if (changed.has('percent')) {
      const empty = this.percent === null || this.percent === undefined || Number.isNaN(this.percent);
      this._bar.hidden = empty;
      this._bar.style.width = empty ? '0%' : `${clamp(this.percent)}%`;
    }
    if (changed.has('color')) {
      if (this.color) this.style.setProperty('--_lb-color', this.color);
      else this.style.removeProperty('--_lb-color');
    }
    if (changed.has('height')) {
      const h = this.height;
      if (h) this.style.setProperty('--_lb-height', /^\d+(\.\d+)?$/.test(h) ? `${h}px` : h);
      else this.style.removeProperty('--_lb-height');
    }
    this._syncClass();
  }

  /** Mờ dần (dùng khi done / error) */
  _fade(on) {
    this._fading = on;
    this._syncClass();
  }

  _syncClass() {
    this._bar.className = [
      'bar',
      this.status === 'error' ? 'bar--error' : '',
      this._fading ? 'bar--fading' : '',
      this.noAnimation ? 'bar--no-animation' : '',
    ].filter(Boolean).join(' ');
  }
}

defineElement('hui-loading-bar', HuiLoadingBar);

// =====================================================
// API GỌI BẰNG HÀM
// =====================================================

/** Cấu hình toàn cục — loadingBar.config() */
const settings = { color: null, height: null, trickleSpeed: 200, trickle: true, minimum: 8 };
/** Thời lượng (ms): chạy nốt tới 100%, mờ dần, giữ màu đỏ khi lỗi */
const WIDTH_MS = 200;
const FADE_MS = 300;
const ERROR_HOLD_MS = 400;

let bar = null;
let started = false;
let trickleTimer = 0;
let finishTimer = 0;
let removeTimer = 0;

const instant = () => prefersReducedMotion() || Boolean(bar?.noAnimation);

/** Bước nhích theo tiến độ hiện tại: càng gần cuối càng chậm, không bao giờ tự tới 100% */
function trickleAmount(p) {
  if (p < 20) return 10;
  if (p < 50) return 4;
  if (p < 80) return 2;
  if (p < 99) return 0.5;
  return 0;
}

function applySettings(el) {
  if (settings.color) el.setAttribute('color', settings.color);
  else el.removeAttribute('color');
  if (settings.height !== null && settings.height !== undefined) el.setAttribute('height', String(settings.height));
  else el.removeAttribute('height');
}

/** Đưa thanh lên TRÊN CÙNG top-layer (ẩn rồi hiện lại) → nằm trên Modal/Drawer mở trước đó */
function raise(el) {
  if (!supportsPopover) return;
  if (!el.hasAttribute('popover')) el.setAttribute('popover', 'manual');
  try {
    if (el.matches(':popover-open')) el.hidePopover();
    el.showPopover();
  } catch { /* chưa gắn vào trang */ }
}

/** Lấy (hoặc tạo) thanh tự động; hủy lượt mờ dần / gỡ đang chờ */
function ensureBar() {
  clearTimeout(finishTimer);
  clearTimeout(removeTimer);
  const fresh = !bar || !bar.isConnected;
  if (fresh) {
    bar = document.createElement('hui-loading-bar');
    document.body.appendChild(bar);
  }
  applySettings(bar);
  bar._fade?.(false);
  if (fresh) raise(bar);
  return bar;
}

function stopTrickle() {
  clearInterval(trickleTimer);
  trickleTimer = 0;
}

function startTrickle() {
  stopTrickle();
  if (!settings.trickle) return;
  trickleTimer = setInterval(() => {
    if (!bar || !started) return stopTrickle();
    const p = bar.percent ?? 0;
    bar.percent = Math.min(99.4, p + trickleAmount(p));
  }, Math.max(16, Number(settings.trickleSpeed) || 200));
}

/** Chạy nốt → mờ dần → gỡ khỏi trang */
function finish(hold = 0) {
  started = false;
  stopTrickle();
  const el = bar;
  const fast = instant();
  finishTimer = setTimeout(() => {
    el._fade(true);
    removeTimer = setTimeout(() => {
      if (supportsPopover && el.matches(':popover-open')) el.hidePopover();
      el.remove();
      if (bar === el) bar = null;
    }, fast ? 0 : FADE_MS);
  }, fast ? 0 : WIDTH_MS + hold);
}

export const loadingBar = {
  /** Bắt đầu (hoặc tiếp tục) — hiện thanh và tự nhích dần */
  start() {
    const el = ensureBar();
    if (!started) {
      el.status = 'normal';
      el.percent = settings.minimum;
      started = true;
    }
    startTrickle();
    return loadingBar;
  },

  /** Đặt tiến độ 0–100 (chưa start thì tự hiện); 100 = hoàn tất */
  set(percent) {
    const el = ensureBar();
    const p = clamp(percent);
    el.percent = p;
    if (p >= 100) finish();
    else if (!started) {
      started = true;
      el.status = 'normal';
      startTrickle();
    }
    return loadingBar;
  },

  /** Nhích thêm `amount` (mặc định theo kiểu trickle) */
  inc(amount) {
    if (!started) return loadingBar.start();
    const p = bar.percent ?? 0;
    bar.percent = Math.min(99.4, p + (amount ?? trickleAmount(p)));
    return loadingBar;
  },

  /** Hoàn tất: chạy tới 100% rồi mờ dần và gỡ khỏi trang. Chưa start thì bỏ qua */
  done() {
    if (!bar || !bar.isConnected || !started) return loadingBar;
    clearTimeout(finishTimer);
    bar.percent = 100;
    finish();
    return loadingBar;
  },

  /** Lỗi: chuyển đỏ, chạy tới 100%, giữ một nhịp rồi mờ dần */
  error() {
    const el = ensureBar();
    el.status = 'error';
    el.percent = 100;
    finish(ERROR_HOLD_MS);
    return loadingBar;
  },

  /**
   * Cấu hình toàn cục.
   * @param {{ color?: string, height?: number|string, trickleSpeed?: number, trickle?: boolean, minimum?: number }} cfg
   */
  config(cfg = {}) {
    if ('color' in cfg) settings.color = cfg.color || null;
    if ('height' in cfg) settings.height = cfg.height ?? null;
    if ('trickleSpeed' in cfg) settings.trickleSpeed = Number(cfg.trickleSpeed) || 200;
    if ('trickle' in cfg) settings.trickle = cfg.trickle !== false;
    if ('minimum' in cfg) settings.minimum = clamp(cfg.minimum);
    if (bar?.isConnected) {
      applySettings(bar);
      if (started) startTrickle();
    }
    return loadingBar;
  },

  /** Đang chạy (đã start, chưa done/error) */
  get isStarted() {
    return started;
  },
};

export default HuiLoadingBar;
