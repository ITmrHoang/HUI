/**
 * HUI Lightbox — trình xem ảnh toàn màn hình (Organism)
 *   <hui-lightbox id="lb" loop></hui-lightbox>
 *   lb.items = [{ src, alt, caption }]; lb.show(2);
 *   // hoặc gọi bằng hàm: import { lightbox } from '@itmrhoang/h-ui/hui-lightbox'; lightbox.open(items, 0, { origin: thumbEl });
 * Zoom (lăn chuột, +/-, nhấp đúp, chụm 2 ngón), kéo để di chuyển khi đang zoom, vuốt / ←→ chuyển ảnh, xoay, tải ảnh, Esc đóng.
 * Top-layer: <dialog>.showModal() (giống hui-modal) + utils/overlay.js (focus trap, khóa cuộn, Esc theo thứ tự lớp).
 * Mở/đóng: phóng từ ảnh thu nhỏ (FLIP) khi có `origin`, không thì zoom + mờ dần.
 */

import styles from './hui-lightbox.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { openOverlay } from '../../utils/overlay.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { tx, ensureMediaIcons, animationsDisabled } from '../hui-image/media-shared.js';
import '../hui-icon/hui-icon.js';

ensureMediaIcons();

const EASE = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
const ZOOM_STEP = 1.5;

/** Chuẩn hóa 1 mục: chuỗi → { src }; object → { src, alt, caption, download } */
function normalize(item) {
  if (typeof item === 'string') return item ? { src: item, alt: '', caption: '' } : null;
  if (!item || typeof item !== 'object') return null;
  const src = item.src || item.url || '';
  if (!src) return null;
  return { src, alt: item.alt || '', caption: item.caption || '', download: item.download || '' };
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * @fires hui-open - Lightbox vừa mở. detail: { index }
 * @fires hui-close - Lightbox bắt đầu đóng. detail: { index }
 * @fires hui-change - Chuyển sang ảnh khác. detail: { index, item }
 * @csspart dialog - Thẻ <dialog> phủ toàn màn hình
 * @csspart mask - Nền tối phía sau
 * @csspart stage - Vùng hiển thị ảnh (nhận kéo / vuốt / lăn chuột)
 * @csspart image - Thẻ <img> đang xem
 * @csspart toolbar - Thanh công cụ phía trên
 * @csspart counter - Bộ đếm "2 / 8"
 * @csspart zoom-in - Nút phóng to
 * @csspart zoom-out - Nút thu nhỏ
 * @csspart rotate - Nút xoay
 * @csspart download - Nút tải ảnh (thẻ <a download>)
 * @csspart close - Nút đóng
 * @csspart prev - Nút ảnh trước
 * @csspart next - Nút ảnh sau
 * @csspart caption - Chú thích
 * @csspart loader - Vòng xoay khi đang tải
 * @csspart error - Khối báo lỗi tải ảnh
 * @cssprop --hui-lightbox-mask-bg - Nền phía sau (mặc định 2 lớp --hui-overlay)
 * @cssprop --hui-lightbox-color - Màu chữ / icon (mặc định --hui-text-light-solid)
 * @cssprop --hui-lightbox-button-bg - Nền nút
 * @cssprop --hui-lightbox-button-hover-bg - Nền nút khi hover
 * @cssprop --hui-lightbox-button-size - Kích thước nút (mặc định 40px)
 * @cssprop --hui-lightbox-padding - Khoảng đệm quanh ảnh
 * @cssprop --hui-lightbox-caption-max-width - Bề rộng tối đa chú thích (mặc định 70ch)
 * @cssprop --hui-lightbox-duration - Thời gian chuyển zoom / xoay (mặc định --hui-motion-duration)
 * @cssprop --hui-lightbox-focus-color - Viền focus của nút
 */
class HuiLightbox extends HuiElement {
  static properties = {
    /** Danh sách ảnh [{ src, alt, caption, download? }] hoặc mảng chuỗi URL (property hoặc JSON attribute) */
    items: { type: Array },
    /** Chỉ số ảnh đang xem (0-based) */
    index: { type: Number, default: 0 },
    /** Đang mở. Mở bằng `show(index)`, đóng bằng `close()` */
    open: { type: Boolean },
    /** Ảnh cuối → ảnh đầu (và ngược lại) */
    loop: { type: Boolean },
    /** Mức zoom tối đa (mặc định 4 = 400%) */
    zoomMax: { type: Number, default: 4 },
    /** Ẩn nút tải ảnh */
    noDownload: { type: Boolean },
    /** Nhãn ARIA của hộp thoại (mặc định theo locale) */
    label: { type: String },
    /** Tắt hiệu ứng mở/đóng/chuyển ảnh */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._entries = [];
    this._handle = null;
    this._token = 0;
    this._origin = null;
    this._originIndex = -1;
    this._navDir = 0;
    this._scale = 1;
    this._tx = 0;
    this._ty = 0;
    this._rot = 0;
    this._pointers = new Map();
    this._gesture = null;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    const btn = (part, icon, onClick) => {
      const b = createElement('button', { type: 'button', className: `btn btn--${part}`, part }, createElement('hui-icon', { name: icon }));
      b.addEventListener('click', onClick);
      return b;
    };
    this._zoomOutBtn = btn('zoom-out', 'zoom-out', () => this.zoomOut());
    this._zoomInBtn = btn('zoom-in', 'zoom-in', () => this.zoomIn());
    this._rotateBtn = btn('rotate', 'rotate-cw', () => this.rotate());
    this._downloadBtn = createElement('a', {
      className: 'btn btn--download', part: 'download', download: '', target: '_blank', rel: 'noopener',
    }, createElement('hui-icon', { name: 'download' }));
    this._closeBtn = btn('close', 'close', () => this.close());
    // overlay.js focus phần tử [autofocus] đầu tiên khi mở
    this._closeBtn.setAttribute('autofocus', '');

    this._counter = createElement('div', { className: 'counter', part: 'counter', 'aria-live': 'polite', 'aria-atomic': 'true' });
    this._toolbar = createElement('div', { className: 'toolbar', part: 'toolbar' },
      this._counter,
      createElement('div', { className: 'actions' }, this._zoomOutBtn, this._zoomInBtn, this._rotateBtn, this._downloadBtn, this._closeBtn));

    this._prevBtn = btn('prev', 'chevron-left', () => this.prev());
    this._nextBtn = btn('next', 'chevron-right', () => this.next());

    this._img = createElement('img', { className: 'img', part: 'image', draggable: 'false', alt: '' });
    this._img.addEventListener('load', () => this._setStatus('loaded'));
    this._img.addEventListener('error', () => { if (this._img.getAttribute('src')) this._setStatus('error'); });
    this._loader = createElement('div', { className: 'loader', part: 'loader', 'aria-hidden': 'true' });
    this._errorText = createElement('span');
    this._error = createElement('div', { className: 'error', part: 'error', hidden: true },
      createElement('hui-icon', { name: 'image', className: 'error__icon' }), this._errorText);
    this._stage = createElement('div', { className: 'stage', part: 'stage' }, this._img, this._loader, this._error);

    this._caption = createElement('div', { className: 'caption', part: 'caption', hidden: true });
    this._wrap = createElement('div', { className: 'wrap', tabindex: '-1' },
      this._toolbar, this._stage, this._caption, this._prevBtn, this._nextBtn);
    this._mask = createElement('div', { className: 'mask', part: 'mask' });
    this._dialog = createElement('dialog', { className: 'dialog', part: 'dialog' }, this._mask, this._wrap);

    // Esc do overlay manager xử lý; 'cancel' native (nút Back Android…) đi cùng đường đó
    this._dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      if (this._handle?.isTop()) this.close();
    });
    this._dialog.addEventListener('close', () => {
      if (this._props.open) this.close();
    });
    this._dialog.addEventListener('keydown', (e) => this._onKeydown(e));

    // Cử chỉ trên vùng ảnh
    const st = this._stage;
    st.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    st.addEventListener('pointermove', (e) => this._onPointerMove(e));
    st.addEventListener('pointerup', (e) => this._onPointerUp(e));
    st.addEventListener('pointercancel', (e) => this._onPointerUp(e));
    st.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    st.addEventListener('dblclick', (e) => {
      if (e.target !== this._img) return;
      if (this._scale > 1) this.zoomTo(1);
      else this.zoomTo(2.5, this._pointOf(e));
    });

    return this._dialog;
  }

  connectedCallback() {
    super.connectedCallback();
    // Chặn Esc mặc định của <dialog> (đóng ngay, bỏ qua thứ tự lớp) — overlay.js lo việc đóng
    this.listen(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this._dialog.open) e.preventDefault();
    }, { capture: true });
    this.listen(window, 'resize', () => { if (this._props.open) this._applyView(false); });
    if (this._props.open && !this._handle) this._show();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._token++;
    this._handle?.close();
    this._handle = null;
  }

  updated(changed) {
    if (changed.has('items')) {
      this._entries = (Array.isArray(this.items) ? this.items : []).map(normalize).filter(Boolean);
    }
    if (changed.has('label') || changed.has('locale')) {
      this._dialog.setAttribute('aria-label', this.label || tx('lightbox.label'));
      const labels = [
        [this._zoomOutBtn, 'lightbox.zoomOut'], [this._zoomInBtn, 'lightbox.zoomIn'], [this._rotateBtn, 'lightbox.rotate'],
        [this._downloadBtn, 'lightbox.download'], [this._closeBtn, 'lightbox.close'], [this._prevBtn, 'lightbox.prev'], [this._nextBtn, 'lightbox.next'],
      ];
      for (const [el, key] of labels) el.setAttribute('aria-label', tx(key));
      this._errorText.textContent = tx('lightbox.error');
    }
    if (changed.has('noDownload')) this._downloadBtn.hidden = this.noDownload;

    if (changed.has('open')) {
      const first = !this._mounted;
      if (this._props.open) this._show();
      else if (!first) this._hide();
      if (!first) this.emit(this._props.open ? 'hui-open' : 'hui-close', { index: this.index });
    } else if (this._props.open && ['items', 'index', 'loop', 'locale', 'noDownload'].some((k) => changed.has(k))) {
      const dir = this._navDir;
      this._navDir = 0;
      this._display(changed.has('index') ? dir : 0);
    }
  }

  firstUpdated() {
    this._mounted = true;
  }

  // =====================================================
  // API
  // =====================================================

  /** Ảnh đang xem đã chuẩn hóa (chỉ đọc) */
  get currentItem() {
    return this._entries[this.index] || null;
  }

  /** Số ảnh (chỉ đọc) */
  get count() {
    return this._entries.length;
  }

  /** Mức zoom hiện tại (1 = vừa khung) — chỉ đọc */
  get zoom() {
    return this._scale;
  }

  /** Thẻ <img> đang xem (chỉ đọc) */
  get imageElement() {
    return this._img;
  }

  /**
   * Mở lightbox tại ảnh `index`.
   * @param {number} [index]
   * @param {{ origin?: Element }} [opts] - origin: ảnh thu nhỏ để phóng to từ đó (FLIP) và thu về khi đóng
   */
  show(index = this.index, { origin = null } = {}) {
    const n = this._countFor();
    const i = clamp(Math.round(Number(index) || 0), 0, Math.max(0, n - 1));
    this._origin = origin;
    this._originIndex = i;
    if (this._props.open) {
      this.goTo(i);
      return;
    }
    this.index = i;
    this.open = true;
  }

  close() {
    this.open = false;
  }

  /** Chuyển tới ảnh i (loop → vòng lại) */
  goTo(i, dir) {
    const n = this._entries.length;
    if (!n) return;
    const target = this.loop ? (((Math.round(i) % n) + n) % n) : clamp(Math.round(i), 0, n - 1);
    if (target === this.index) return;
    this._navDir = dir ?? (target > this.index ? 1 : -1);
    this.index = target;
    this.emit('hui-change', { index: target, item: this._entries[target] });
  }

  next() {
    if (this._canGo(1)) this.goTo(this.index + 1, 1);
  }

  prev() {
    if (this._canGo(-1)) this.goTo(this.index - 1, -1);
  }

  zoomIn() {
    this.zoomTo(this._scale * ZOOM_STEP);
  }

  zoomOut() {
    this.zoomTo(this._scale / ZOOM_STEP);
  }

  /** Về kích thước vừa khung, bỏ xoay */
  resetZoom() {
    this._resetView(true);
  }

  /** Xoay ảnh 90° theo chiều kim đồng hồ */
  rotate() {
    this._rot += 90;
    this._applyView(true);
  }

  /**
   * Zoom tới mức `scale`, giữ nguyên điểm `point` (tọa độ so với tâm vùng ảnh) dưới con trỏ.
   * @param {number} scale
   * @param {{x: number, y: number}} [point]
   */
  zoomTo(scale, point = { x: 0, y: 0 }, smooth = true) {
    const max = this.zoomMax > 1 ? this.zoomMax : 4;
    const ns = clamp(Number(scale) || 1, 1, max);
    const k = ns / this._scale;
    this._tx = point.x - (point.x - this._tx) * k;
    this._ty = point.y - (point.y - this._ty) * k;
    this._scale = ns;
    if (ns === 1) {
      this._tx = 0;
      this._ty = 0;
    }
    this._applyView(smooth);
  }

  // =====================================================
  // MỞ / ĐÓNG
  // =====================================================

  get _noMotion() {
    return this.noAnimation || animationsDisabled();
  }

  /** Số ảnh — tính cả khi items vừa gán mà updated() chưa chạy */
  _countFor() {
    return (Array.isArray(this.items) ? this.items : []).map(normalize).filter(Boolean).length;
  }

  _canGo(dir) {
    const n = this._entries.length;
    if (n < 2) return false;
    if (this.loop) return true;
    const i = this.index + dir;
    return i >= 0 && i < n;
  }

  async _show() {
    if (!this.isConnected) return;
    const token = ++this._token;
    if (!this._handle) {
      // Mở overlay TRƯỚC showModal để ghi nhớ đúng phần tử đang focus (trả focus khi đóng)
      this._handle = openOverlay({
        element: this._wrap,
        trapFocus: true,
        lockScroll: true,
        restoreFocus: true,
        onEscape: () => this.close(),
      });
    }
    const dlg = this._dialog;
    if (!dlg.open) {
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    }
    this.setState('open', true);
    this._display(0);

    if (this._noMotion) return;
    animateIn(this._mask, 'fade');
    this._img.style.opacity = '0';
    const ready = await this._imageReady();
    if (token !== this._token) return;
    this._img.style.opacity = '';
    const frames = ready && this._origin && this.index === this._originIndex ? this._flipFrames(this._origin) : null;
    if (frames) this._img.animate(frames, { duration: 320, easing: EASE });
    else animateIn(this._img, 'zoom');
  }

  async _hide() {
    const token = ++this._token;
    this.setState('open', false);
    const dlg = this._dialog;
    if (dlg.open) {
      if (!this._noMotion) {
        const canFlip = this._origin?.isConnected && this.index === this._originIndex && this._scale === 1 && this._rot % 360 === 0;
        const frames = canFlip ? this._flipFrames(this._origin) : null;
        const anims = [animateOut(this._mask, 'fade')];
        if (frames) {
          anims.push(this._img.animate([frames[1], frames[0]], { duration: 260, easing: EASE, fill: 'forwards' }).finished.catch(() => {}));
        } else anims.push(animateOut(this._img, 'zoom'));
        // Trang không vẽ frame (tab nền) thì animation đứng yên → tối đa 600ms vẫn đóng
        await Promise.race([Promise.all(anims), new Promise((r) => setTimeout(r, 600))]);
        if (token !== this._token) return; // mở lại trong lúc đang đóng
      }
      dlg.close();
      dlg.removeAttribute('open');
      for (const el of [this._mask, this._img]) el.getAnimations?.().forEach((a) => a.cancel());
    }
    // Đóng overlay SAU khi dialog đóng (trang hết inert → trả focus được)
    this._handle?.close();
    this._handle = null;
    this._origin = null;
    this._resetView(false);
  }

  /** Chờ ảnh tải xong tối đa 350ms (để đo kích thước thật cho FLIP) */
  _imageReady() {
    const img = this._img;
    if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
    return Promise.race([
      new Promise((resolve) => {
        img.addEventListener('load', () => resolve(true), { once: true });
        img.addEventListener('error', () => resolve(false), { once: true });
      }),
      new Promise((resolve) => setTimeout(() => resolve(false), 350)),
    ]);
  }

  /**
   * FLIP: khung đầu = ảnh thu nhỏ (cùng tâm, scale đồng đều + clip-path cắt đúng khung thumbnail,
   * nên thumbnail object-fit: cover vẫn khớp), khung cuối = vị trí thật trong lightbox.
   */
  _flipFrames(originEl) {
    const o = originEl.getBoundingClientRect();
    const f = this._img.getBoundingClientRect();
    if (!o.width || !o.height || !f.width || !f.height) return null;
    const s = Math.max(o.width / f.width, o.height / f.height);
    const dx = o.left + o.width / 2 - (f.left + f.width / 2);
    const dy = o.top + o.height / 2 - (f.top + f.height / 2);
    const ix = Math.max(0, (f.width - o.width / s) / 2);
    const iy = Math.max(0, (f.height - o.height / s) / 2);
    return [
      { transform: `translate(${dx}px, ${dy}px) scale(${s})`, clipPath: `inset(${iy}px ${ix}px)`, opacity: 1 },
      { transform: 'none', clipPath: 'inset(0px 0px)', opacity: 1 },
    ];
  }

  // =====================================================
  // HIỂN THỊ ẢNH HIỆN TẠI
  // =====================================================

  _display(dir) {
    const list = this._entries;
    const n = list.length;
    const item = list[this.index];

    this._counter.textContent = n > 1 ? tx('lightbox.counter', { index: this.index + 1, count: n }) : '';
    this._counter.hidden = n < 2;
    this._prevBtn.hidden = n < 2;
    this._nextBtn.hidden = n < 2;
    this._prevBtn.disabled = !this._canGo(-1);
    this._nextBtn.disabled = !this._canGo(1);

    this._resetView(false);
    if (!item) {
      this._img.removeAttribute('src');
      this._caption.hidden = true;
      this._setStatus('idle');
      return;
    }

    if (this._img.getAttribute('src') !== item.src) {
      this._setStatus('loading');
      this._img.src = item.src;
      if (this._img.complete && this._img.naturalWidth > 0) this._setStatus('loaded');
    }
    this._img.alt = item.alt;
    this._caption.textContent = item.caption;
    this._caption.hidden = !item.caption;
    this._downloadBtn.href = item.download || item.src;

    // Tải trước ảnh kế bên → chuyển ảnh không phải chờ
    for (const d of [1, -1]) {
      const j = this.loop ? (this.index + d + n) % n : this.index + d;
      if (j >= 0 && j < n && j !== this.index) {
        const pre = new Image();
        pre.decoding = 'async';
        pre.src = list[j].src;
      }
    }

    if (dir && !this._noMotion && typeof this._img.animate === 'function') {
      this._img.animate([
        { opacity: 0, transform: `translateX(${dir * 48}px)` },
        { opacity: 1, transform: 'none' },
      ], { duration: 240, easing: EASE });
    }
  }

  _setStatus(status) {
    this._status = status;
    const cl = this._stage.classList;
    for (const s of ['idle', 'loading', 'loaded', 'error']) cl.toggle(`is-${s}`, s === status);
    this._error.hidden = status !== 'error';
    this.setState('loading', status === 'loading');
  }

  // =====================================================
  // ZOOM / XOAY / KÉO
  // =====================================================

  _resetView(smooth) {
    this._scale = 1;
    this._tx = 0;
    this._ty = 0;
    this._rot = 0;
    this._applyView(smooth);
  }

  /** Hệ số thu nhỏ khi xoay 90°/270° để ảnh vẫn vừa khung */
  _fitFactor() {
    const w = this._img.offsetWidth;
    const h = this._img.offsetHeight;
    if (!w || !h || (this._rot / 90) % 2 === 0) return 1;
    return Math.min(1, this._stage.clientWidth / h, this._stage.clientHeight / w);
  }

  _applyView(smooth = true) {
    const img = this._img;
    const f = this._fitFactor();
    const s = this._scale * f;
    // Giới hạn kéo: không cho mép ảnh đi vào trong khung
    const odd = (this._rot / 90) % 2 !== 0;
    const w = (odd ? img.offsetHeight : img.offsetWidth) * s;
    const h = (odd ? img.offsetWidth : img.offsetHeight) * s;
    const maxX = Math.max(0, (w - this._stage.clientWidth) / 2);
    const maxY = Math.max(0, (h - this._stage.clientHeight) / 2);
    this._tx = clamp(this._tx, -maxX, maxX);
    this._ty = clamp(this._ty, -maxY, maxY);

    this._stage.classList.toggle('is-instant', !smooth);
    const identity = s === 1 && this._tx === 0 && this._ty === 0 && this._rot === 0;
    img.style.transform = identity ? '' : `translate(${this._tx}px, ${this._ty}px) rotate(${this._rot}deg) scale(${s})`;

    const zoomed = this._scale > 1;
    this._stage.classList.toggle('is-zoomed', zoomed);
    this.setState('zoomed', zoomed);
    const max = this.zoomMax > 1 ? this.zoomMax : 4;
    this._zoomInBtn.disabled = this._scale >= max - 0.001;
    this._zoomOutBtn.disabled = this._scale <= 1.001;
  }

  /** Tọa độ con trỏ so với tâm vùng ảnh */
  _pointOf(e) {
    const r = this._stage.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  }

  _onWheel(e) {
    if (!this._entries.length) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 0.05 : 0.0015;
    this.zoomTo(this._scale * Math.exp(-e.deltaY * unit), this._pointOf(e), false);
  }

  _onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...this._pointers.values()];
    if (pts.length === 2) {
      // Chụm 2 ngón: zoom theo tỉ lệ khoảng cách, quanh trung điểm
      const [a, b] = pts;
      const r = this._stage.getBoundingClientRect();
      this._gesture = {
        type: 'pinch',
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: this._scale,
        center: { x: (a.x + b.x) / 2 - r.left - r.width / 2, y: (a.y + b.y) / 2 - r.top - r.height / 2 },
      };
      this._stage.classList.add('is-gesture');
      for (const id of this._pointers.keys()) this._capture(id);
    } else if (pts.length === 1) {
      this._gesture = {
        type: this._scale > 1 ? 'pan' : 'swipe',
        x: e.clientX,
        y: e.clientY,
        tx: this._tx,
        ty: this._ty,
        dx: 0,
        moved: false,
        time: performance.now(),
        onBackdrop: e.target === this._stage,
      };
    }
  }

  _onPointerMove(e) {
    if (!this._pointers.has(e.pointerId)) return;
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = this._gesture;
    if (!g) return;
    if (g.type === 'pinch') {
      const [a, b] = [...this._pointers.values()];
      if (!b) return;
      this.zoomTo(g.scale * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist), g.center, false);
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) > 6) {
      g.moved = true;
      this._stage.classList.add('is-gesture');
      // Chỉ bắt con trỏ khi đã kéo thật — bắt sớm sẽ đổi target của click/dblclick thành stage
      this._capture(e.pointerId);
    }
    if (!g.moved) return;
    if (g.type === 'pan') {
      this._tx = g.tx + dx;
      this._ty = g.ty + dy;
      this._applyView(false);
    } else if (this._entries.length > 1) {
      // Vuốt ngang: ảnh chạy theo tay, mờ dần
      g.dx = dx;
      this._img.style.transform = `translateX(${dx}px)`;
      this._img.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / 600));
    }
  }

  _capture(id) {
    try { this._stage.setPointerCapture?.(id); } catch { /* con trỏ đã nhả */ }
  }

  _onPointerUp(e) {
    if (!this._pointers.has(e.pointerId)) return;
    this._pointers.delete(e.pointerId);
    const g = this._gesture;
    if (this._pointers.size > 0) {
      // Nhấc 1 trong 2 ngón khi đang chụm → chuyển sang kéo bằng ngón còn lại
      if (g?.type === 'pinch') {
        const [p] = [...this._pointers.values()];
        this._gesture = { type: 'pan', x: p.x, y: p.y, tx: this._tx, ty: this._ty, moved: true };
      }
      return;
    }
    this._gesture = null;
    this._stage.classList.remove('is-gesture');
    if (!g || g.type !== 'swipe') return;
    if (g.moved) {
      const dx = g.dx;
      const fast = Math.abs(dx) / Math.max(1, performance.now() - g.time) > 0.5;
      this._img.style.opacity = '';
      const dir = dx < 0 ? 1 : -1;
      if ((Math.abs(dx) > 60 || (fast && Math.abs(dx) > 20)) && this._canGo(dir)) {
        this._img.style.transform = '';
        if (dir > 0) this.next();
        else this.prev();
      } else this._applyView(true); // chưa đủ xa → trượt về giữa
    } else if (g.onBackdrop && e.type === 'pointerup') {
      // Chạm vùng trống quanh ảnh → đóng
      this.close();
    }
  }

  _onKeydown(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const actions = {
      ArrowLeft: () => this.prev(),
      ArrowRight: () => this.next(),
      Home: () => this.goTo(0, -1),
      End: () => this.goTo(this._entries.length - 1, 1),
      '+': () => this.zoomIn(),
      '=': () => this.zoomIn(),
      '-': () => this.zoomOut(),
      _: () => this.zoomOut(),
      0: () => this.resetZoom(),
      r: () => this.rotate(),
      R: () => this.rotate(),
    };
    const fn = actions[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  }
}

defineElement('hui-lightbox', HuiLightbox);

export default HuiLightbox;
