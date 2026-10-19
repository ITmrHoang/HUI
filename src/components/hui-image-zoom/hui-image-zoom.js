/**
 * HUI Image Zoom — rê chuột phóng to ảnh sản phẩm.
 * mode: lens (kính lúp tròn theo con trỏ) | side (khung phóng to bên cạnh + ô chọn vùng) | inner (phóng tại chỗ).
 * Cảm ứng: chạm để bật/tắt phóng tại chỗ, kéo để di chuyển. Bàn phím: Enter/Space bật, mũi tên di chuyển, Esc thoát.
 * Ảnh độ phân giải cao (zoom-src) tải ngầm ở lần phóng đầu; trong lúc tải dùng tạm src.
 */

import styles from './hui-image-zoom.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';

const FALLBACK = {
  'imageZoom.label': { vi: 'Phóng to ảnh', en: 'Zoom image' },
};
const msg = (key) => {
  const v = t(key);
  return v !== key ? v : FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

const MODES = ['lens', 'side', 'inner'];
/** Bước di chuyển bằng phím mũi tên (tỉ lệ khung) */
const KEY_STEP = 0.1;

const cssUrl = (u) => `url("${String(u).replace(/["\\\n]/g, (c) => `\\${c}`)}")`;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/**
 * Phóng to ảnh khi rê chuột / chạm.
 * @fires hui-zoom-change - Bật / tắt phóng to. detail: { active }
 * @csspart base - Khung ngoài (chứa cả panel side)
 * @csspart frame - Khung ảnh (nhận chuột / focus, role="button")
 * @csspart image - Thẻ <img>
 * @csspart lens - Kính lúp tròn (lens) hoặc ô chọn vùng (side)
 * @csspart inner - Lớp phóng tại chỗ (inner, và chế độ chạm / bàn phím)
 * @csspart panel - Khung phóng to bên cạnh (side)
 * @cssprop --hui-image-zoom-radius - Bo góc khung ảnh
 * @cssprop --hui-image-zoom-lens-border - Viền kính lúp
 * @cssprop --hui-image-zoom-lens-shadow - Bóng kính lúp
 * @cssprop --hui-image-zoom-region-bg - Nền ô chọn vùng (side)
 * @cssprop --hui-image-zoom-panel-width - Rộng khung side (mặc định = rộng ảnh)
 * @cssprop --hui-image-zoom-panel-height - Cao khung side (mặc định = cao ảnh)
 * @cssprop --hui-image-zoom-panel-gap - Khoảng cách ảnh ↔ khung side
 * @cssprop --hui-image-zoom-panel-shadow - Bóng khung side
 * @cssprop --hui-image-zoom-cursor - Con trỏ khi rê trên ảnh (mặc định crosshair / zoom-in)
 */
class HuiImageZoom extends HuiElement {
  static properties = {
    /** Ảnh hiển thị */
    src: { type: String },
    /** Ảnh độ phân giải cao dùng khi phóng (bỏ trống = dùng src) */
    zoomSrc: { type: String },
    /** Mô tả ảnh (alt) */
    alt: { type: String, default: '' },
    /** lens | side | inner — kính lúp | khung bên cạnh | phóng tại chỗ */
    mode: { type: String, default: 'lens' },
    /** Hệ số phóng (mặc định 2.5) */
    zoom: { type: Number, default: 2.5 },
    /** Đường kính kính lúp (px) */
    lensSize: { type: Number, default: 160 },
    /** right | left — phía đặt khung phóng của mode side */
    sidePlacement: { type: String, default: 'right' },
    /** Tắt phóng to */
    disabled: { type: Boolean },
    /** Tắt hiệu ứng mờ dần */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    /** null | 'pointer' (rê chuột) | 'touch' | 'key' — nguồn đang phóng */
    this._active = null;
    this._pos = { x: 0.5, y: 0.5 };
    this._lastPointerType = 'mouse';
    this._hiResReady = false;
    this._frameRaf = 0;
  }

  get _mode() {
    return MODES.includes(this.mode) ? this.mode : 'lens';
  }

  get _zoom() {
    return Number.isFinite(this.zoom) && this.zoom > 1 ? this.zoom : 2.5;
  }

  /** Đang phóng hay không */
  get zoomed() {
    return this._active !== null;
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._img = createElement('img', { className: 'iz__img', part: 'image', draggable: 'false' });
    this._img.addEventListener('load', () => this._layout());
    this._lens = createElement('div', { className: 'iz__lens', part: 'lens', 'aria-hidden': 'true' });
    this._inner = createElement('div', { className: 'iz__inner', part: 'inner', 'aria-hidden': 'true' });
    this._frame = createElement('div', { className: 'iz__frame', part: 'frame', role: 'button', tabindex: '0', 'aria-pressed': 'false' },
      this._img, this._inner, this._lens);
    this._panel = createElement('div', { className: 'iz__panel', part: 'panel', 'aria-hidden': 'true' });
    this._base = createElement('div', { className: 'iz', part: 'base' }, this._frame, this._panel);

    const f = this._frame;
    f.addEventListener('pointerdown', (e) => { this._lastPointerType = e.pointerType || 'mouse'; });
    f.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch' || this.disabled) return;
      this._start('pointer', e);
    });
    f.addEventListener('pointermove', (e) => {
      if (this.disabled) return;
      if (e.pointerType !== 'touch' && this._active === null) this._start('pointer', e);
      if (this._active === 'pointer' || this._active === 'touch') this._move(e);
    });
    f.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch' && this._active === 'pointer') this._stop();
    });
    // Chạm: bật/tắt phóng tại chỗ ngay vị trí chạm
    f.addEventListener('click', (e) => {
      if (this.disabled || this._lastPointerType !== 'touch') return;
      if (this._active === 'touch') this._stop();
      else this._start('touch', e);
    });
    f.addEventListener('keydown', (e) => this._onKeydown(e));
    f.addEventListener('blur', () => {
      if (this._active === 'key') this._stop();
    });
    return this._base;
  }

  updated(changed) {
    if (changed.has('src')) {
      if (this.src) this._img.setAttribute('src', this.src);
      else this._img.removeAttribute('src');
    }
    if (changed.has('src') || changed.has('zoomSrc')) {
      this._hiResReady = false;
      this._applyBackground();
    }
    if (changed.has('alt') || changed.has('locale')) {
      this._img.alt = this.alt || '';
      this._frame.setAttribute('aria-label', this.alt ? `${msg('imageZoom.label')}: ${this.alt}` : msg('imageZoom.label'));
    }
    if (changed.has('disabled')) {
      this._frame.setAttribute('tabindex', this.disabled ? '-1' : '0');
      this._frame.toggleAttribute('aria-disabled', this.disabled);
      if (this.disabled && this._active) this._stop();
    }
    if (changed.has('mode') && this._active) this._stop();
    this._base.className = [
      'iz', `iz--${this._mode}`, `iz--side-${this.sidePlacement === 'left' ? 'left' : 'right'}`,
      this.noAnimation || animationsDisabled() ? 'iz--static' : '',
      this._active ? `iz--active iz--via-${this._active}` : '',
    ].filter(Boolean).join(' ');
    if (this._active) this._layout();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this._frameRaf);
  }

  /** Nền phóng: ảnh lớn phủ trên ảnh nhỏ (ảnh nhỏ hiện tạm trong lúc ảnh lớn đang tải) */
  _applyBackground() {
    const layers = [];
    const hi = this.zoomSrc || this.src;
    if (hi) layers.push(cssUrl(hi));
    if (this.zoomSrc && this.src && this.zoomSrc !== this.src) layers.push(cssUrl(this.src));
    const bg = layers.join(', ');
    for (const el of [this._lens, this._inner, this._panel]) el.style.backgroundImage = bg;
  }

  _preload() {
    if (this._hiResReady || !this.zoomSrc) return;
    this._hiResReady = true;
    const img = new Image();
    img.src = this.zoomSrc;
  }

  // =====================================================
  // PHÓNG / DI CHUYỂN
  // =====================================================

  _start(source, e) {
    if (!this.src) return;
    const was = this._active;
    this._active = source;
    this._preload();
    if (e) this._readPointer(e);
    this.requestUpdate('active');
    this._frame.setAttribute('aria-pressed', 'true');
    this.setState('zoomed', true);
    this._layout();
    if (was === null) this.emit('hui-zoom-change', { active: true });
  }

  _stop() {
    if (this._active === null) return;
    this._active = null;
    this._frame.setAttribute('aria-pressed', 'false');
    this.setState('zoomed', false);
    this.requestUpdate('active');
    this.emit('hui-zoom-change', { active: false });
  }

  _readPointer(e) {
    const r = this._frame.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this._pos = { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
  }

  _move(e) {
    this._readPointer(e);
    // Gom theo frame: pointermove có thể bắn > 60 lần/giây
    if (this._frameRaf) return;
    this._frameRaf = requestAnimationFrame(() => {
      this._frameRaf = 0;
      this._layout();
    });
  }

  /** Tính kích thước / vị trí nền phóng theo mode và vị trí con trỏ (tỉ lệ 0..1) */
  _layout() {
    if (!this._active) return;
    const W = this._frame.clientWidth;
    const H = this._frame.clientHeight;
    if (!W || !H) return;
    const z = this._zoom;
    const px = this._pos.x * W;
    const py = this._pos.y * H;
    const bgSize = `${W * z}px ${H * z}px`;
    // Chạm / bàn phím luôn dùng phóng tại chỗ (không có con trỏ để theo)
    const mode = this._active === 'pointer' ? this._mode : 'inner';
    this._base.dataset.render = mode;

    if (mode === 'inner') {
      const s = this._inner.style;
      s.backgroundSize = bgSize;
      s.backgroundPosition = `${this._pos.x * 100}% ${this._pos.y * 100}%`;
    } else if (mode === 'lens') {
      const L = Math.max(40, Number(this.lensSize) || 160);
      const s = this._lens.style;
      s.width = `${L}px`;
      s.height = `${L}px`;
      s.transform = `translate(${px - L / 2}px, ${py - L / 2}px)`;
      s.backgroundSize = bgSize;
      s.backgroundPosition = `${-(px * z - L / 2)}px ${-(py * z - L / 2)}px`;
    } else {
      // side: ô chọn vùng = kích thước khung phóng / hệ số, kẹp trong ảnh
      const PW = this._panel.clientWidth || W;
      const PH = this._panel.clientHeight || H;
      const rw = Math.min(W, PW / z);
      const rh = Math.min(H, PH / z);
      const lx = clamp(px - rw / 2, 0, W - rw);
      const ly = clamp(py - rh / 2, 0, H - rh);
      const s = this._lens.style;
      s.width = `${rw}px`;
      s.height = `${rh}px`;
      s.transform = `translate(${lx}px, ${ly}px)`;
      const p = this._panel.style;
      p.backgroundSize = bgSize;
      p.backgroundPosition = `${-lx * z}px ${-ly * z}px`;
    }
  }

  _onKeydown(e) {
    if (this.disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this._active) this._stop();
      else {
        this._pos = { x: 0.5, y: 0.5 };
        this._start('key');
      }
      return;
    }
    if (e.key === 'Escape' && this._active) {
      e.preventDefault();
      this._stop();
      return;
    }
    if (!this._active) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!d) return;
    e.preventDefault();
    this._pos = { x: clamp(this._pos.x + d[0] * KEY_STEP, 0, 1), y: clamp(this._pos.y + d[1] * KEY_STEP, 0, 1) };
    this._layout();
  }
}

defineElement('hui-image-zoom', HuiImageZoom);

export default HuiImageZoom;
