/**
 * HUI QR Code — sinh mã QR bằng encoder tự viết (qr-encoder.js), vẽ SVG hoặc canvas.
 *   <hui-qrcode value="https://hui.dev" error-level="M" size="160"></hui-qrcode>
 *   <hui-qrcode value="…" icon="logo.svg"></hui-qrcode>   ← có icon thì tự nâng mức sửa lỗi lên H
 *   <hui-qrcode value="…" status="expired"></hui-qrcode>  ← lớp phủ + nút làm mới (hui-refresh)
 * Màu mặc định lấy từ token (--hui-text / --hui-bg-container) → tự đổi theo dark mode.
 */

import styles from './hui-qrcode.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { t, getLocaleName } from '../../core/locale.js';
import { encodeQR } from './qr-encoder.js';
import '../hui-icon/index.js';
import '../hui-button/index.js';
import '../hui-spinner/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LEVELS = ['L', 'M', 'Q', 'H'];
const STATUSES = ['active', 'loading', 'expired', 'scanned'];

/** Chuỗi chưa có trong locale.js → chuỗi dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  vi: { 'qrcode.label': 'Mã QR: {value}', 'qrcode.loading': 'Đang tải mã QR…', 'qrcode.expired': 'Mã QR đã hết hạn', 'qrcode.refresh': 'Làm mới', 'qrcode.scanned': 'Đã quét', 'qrcode.error': 'Không tạo được mã QR: nội dung quá dài' },
  en: { 'qrcode.label': 'QR code: {value}', 'qrcode.loading': 'Loading QR code…', 'qrcode.expired': 'QR code expired', 'qrcode.refresh': 'Refresh', 'qrcode.scanned': 'Scanned', 'qrcode.error': 'Cannot create QR code: content is too long' },
};
function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/** Một path duy nhất cho mọi ô tối (gộp các ô liền nhau trên cùng hàng → path ngắn hơn nhiều) */
function modulesToPath(modules, margin) {
  let d = '';
  modules.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue;
      let end = c;
      while (end + 1 < row.length && row[end + 1]) end++;
      d += `M${c + margin} ${r + margin}h${end - c + 1}v1h${-(end - c + 1)}z`;
      c = end;
    }
  });
  return d;
}

/**
 * @fires hui-refresh - Bấm nút làm mới khi status="expired"
 * @fires hui-error - Không mã hóa được (nội dung quá dài). detail: { message }
 * @slot status - Nội dung lớp phủ tùy chỉnh (thay cho nội dung mặc định của loading / expired / scanned)
 * @csspart base - Khung ngoài (viền khi bordered)
 * @csspart code - Phần tử <svg> hoặc <canvas> chứa mã (role="img")
 * @csspart status - Lớp phủ trạng thái
 * @csspart refresh-button - Nút làm mới (hui-button)
 * @cssprop --hui-qrcode-color - Màu ô tối (mặc định --hui-text)
 * @cssprop --hui-qrcode-bg - Màu nền (mặc định --hui-bg-container)
 * @cssprop --hui-qrcode-padding - Khoảng đệm khi bordered (mặc định 12px)
 * @cssprop --hui-qrcode-radius - Bo góc khung
 * @cssprop --hui-qrcode-border-color - Màu viền khi bordered
 * @cssprop --hui-qrcode-mask-bg - Nền lớp phủ trạng thái
 */
class HuiQrcode extends HuiElement {
  static localized = true;

  static properties = {
    /** Nội dung mã hóa (UTF-8, tiếng Việt có dấu được) */
    value: { type: String, default: '' },
    /** L | M | Q | H — mức sửa lỗi ~7% | 15% | 25% | 30% (có icon → tự nâng lên H) */
    errorLevel: { type: String, attribute: 'error-level', default: 'M' },
    /** Kích thước cạnh (px), đã gồm vùng lặng */
    size: { type: Number, default: 160 },
    /** Màu ô tối (CSS color); bỏ trống = token --hui-qrcode-color / --hui-text */
    color: { type: String },
    /** Màu nền; bỏ trống = token --hui-qrcode-bg / --hui-bg-container */
    bgColor: { type: String, attribute: 'bg-color' },
    /** Vùng lặng quanh mã, tính theo số ô (chuẩn khuyến nghị 4) */
    margin: { type: Number, default: 4 },
    /** svg | canvas — cách vẽ */
    renderMode: { type: String, attribute: 'render', default: 'svg' },
    /** URL / data URI của logo ở giữa (nền đệm cùng màu nền) */
    icon: { type: String },
    /** Kích thước logo (px); bỏ trống = 22% cạnh */
    iconSize: { type: Number, attribute: 'icon-size' },
    /** active | loading | expired | scanned — trạng thái hiển thị lớp phủ */
    status: { type: String, default: 'active' },
    /** Viền + khoảng đệm quanh mã */
    bordered: { type: Boolean },
    /** Nhãn cho trình đọc màn hình (mặc định "Mã QR: <value>") */
    label: { type: String },
  };

  static styles = styles;

  constructor() {
    super();
    this._qr = null;
    this._iconImg = null;
    this._themeObserver = null;
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  /** Kết quả mã hóa hiện tại: { size, version, ecl, mask, mode, modules } (null khi lỗi) */
  get matrix() {
    return this._qr;
  }

  /** Mức sửa lỗi thực tế (có icon → H) */
  get effectiveLevel() {
    const level = String(this.errorLevel || 'M').toUpperCase();
    if (this.icon) return 'H';
    return LEVELS.includes(level) ? level : 'M';
  }

  /**
   * Xuất ảnh: 'image/png' | 'image/jpeg' | 'image/webp' (vẽ canvas 2×) hoặc 'image/svg+xml'.
   * Icon khác origin không có CORS làm "bẩn" canvas → ảnh xuất ra sẽ bỏ icon.
   */
  toDataURL(type = 'image/png', quality) {
    if (!this._qr) return '';
    const { fg, bg } = this._colors();
    if (String(type).includes('svg')) {
      const svg = this._buildSvg(fg, bg);
      svg.setAttribute('xmlns', SVG_NS);
      svg.setAttribute('width', String(this.size));
      svg.setAttribute('height', String(this.size));
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    }
    const canvas = document.createElement('canvas');
    this._paint(canvas, 2, fg, bg, true);
    try {
      return canvas.toDataURL(type, quality);
    } catch {
      this._paint(canvas, 2, fg, bg, false);
      return canvas.toDataURL(type, quality);
    }
  }

  /** Tải ảnh về máy */
  download(filename = 'qrcode.png', type) {
    const mime = type || (filename.endsWith('.svg') ? 'image/svg+xml' : filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' : 'image/png');
    const a = document.createElement('a');
    a.href = this.toDataURL(mime);
    a.download = filename;
    a.click();
  }

  // =====================================================
  // RENDER / LIFECYCLE
  // =====================================================

  render() {
    this._spinner = createElement('hui-spinner', { size: 'md' });
    this._statusText = createElement('span', { className: 'status__text' });
    this._statusIcon = createElement('hui-icon', { className: 'status__icon', name: 'success', 'aria-hidden': 'true' });
    this._refreshBtn = createElement('hui-button', { variant: 'link', icon: 'rotate-cw', part: 'refresh-button' });
    this._refreshBtn.addEventListener('click', () => this.emit('hui-refresh'));
    this._statusSlot = createElement('slot', { name: 'status' },
      this._spinner, this._statusIcon, this._statusText, this._refreshBtn);
    this._status = createElement('div', { className: 'status', part: 'status', role: 'status', hidden: true }, this._statusSlot);
    this._holder = createElement('div', { className: 'holder' });
    this._base = createElement('div', { className: 'qr', part: 'base' }, this._holder, this._status);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    // Canvas không tự đổi màu theo token → vẽ lại khi đổi theme (data-theme/class trên <html>, hoặc OS)
    this._themeObserver = new MutationObserver(() => this._repaintCanvas());
    this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    if (typeof matchMedia === 'function') this.listen(matchMedia('(prefers-color-scheme: dark)'), 'change', () => this._repaintCanvas());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._themeObserver?.disconnect();
    this._themeObserver = null;
  }

  updated(changed) {
    if (changed.has('icon')) this._loadIcon();
    if (['value', 'errorLevel', 'icon'].some((k) => changed.has(k))) this._encode();

    if (['color', 'bgColor'].some((k) => changed.has(k))) {
      if (this.color) this._base.style.setProperty('--_qr-color', this.color);
      else this._base.style.removeProperty('--_qr-color');
      if (this.bgColor) this._base.style.setProperty('--_qr-bg', this.bgColor);
      else this._base.style.removeProperty('--_qr-bg');
    }
    if (changed.has('size')) this._base.style.setProperty('--_qr-size', `${this._px()}px`);
    if (changed.has('bordered')) this._base.classList.toggle('qr--bordered', this.bordered);

    if (['value', 'errorLevel', 'icon', 'iconSize', 'margin', 'renderMode', 'size', 'color', 'bgColor'].some((k) => changed.has(k))) {
      this._draw();
    }
    if (['value', 'label', 'locale', 'errorLevel', 'icon'].some((k) => changed.has(k))) this._syncLabel();
    if (['status', 'locale'].some((k) => changed.has(k))) this._syncStatus();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  _px() {
    return Math.max(32, Number(this.size) || 160);
  }

  _encode() {
    try {
      this._qr = encodeQR(this.value ?? '', { ecl: this.effectiveLevel });
      this._base.classList.remove('qr--error');
    } catch (err) {
      this._qr = null;
      this._base.classList.add('qr--error');
      this.emit('hui-error', { message: err.message });
    }
  }

  _loadIcon() {
    this._iconImg = null;
    if (!this.icon) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => this._repaintCanvas();
    img.src = this.icon;
    this._iconImg = img;
  }

  /** Màu thật (đã giải biến CSS) — đọc từ computed style của khung */
  _colors() {
    const cs = getComputedStyle(this._holder);
    return { fg: cs.color || '#000', bg: cs.backgroundColor || '#fff' };
  }

  /** Kích thước logo theo đơn vị ô và theo px */
  _iconBox(unitsTotal) {
    const px = this._px();
    const iconPx = Math.min(px * 0.3, this.iconSize || Math.round(px * 0.22));
    const units = (iconPx / px) * unitsTotal;
    const pad = Math.max(0.5, units * 0.1);
    return { units, pad, start: (unitsTotal - units) / 2 };
  }

  _buildSvg(fg, bg) {
    const { size, modules } = this._qr;
    const margin = Math.max(0, Math.floor(this.margin ?? 4));
    const total = size + margin * 2;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${total} ${total}`);
    svg.setAttribute('shape-rendering', 'crispEdges');
    const bgRect = document.createElementNS(SVG_NS, 'rect');
    bgRect.setAttribute('width', String(total));
    bgRect.setAttribute('height', String(total));
    bgRect.setAttribute('class', 'qr__bg');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', modulesToPath(modules, margin));
    path.setAttribute('class', 'qr__modules');
    if (fg) path.setAttribute('fill', fg);
    if (bg) bgRect.setAttribute('fill', bg);
    svg.append(bgRect, path);

    if (this.icon) {
      const { units, pad, start } = this._iconBox(total);
      const plate = document.createElementNS(SVG_NS, 'rect');
      plate.setAttribute('x', String(start - pad));
      plate.setAttribute('y', String(start - pad));
      plate.setAttribute('width', String(units + pad * 2));
      plate.setAttribute('height', String(units + pad * 2));
      plate.setAttribute('rx', String(pad));
      plate.setAttribute('class', 'qr__bg');
      if (bg) plate.setAttribute('fill', bg);
      const image = document.createElementNS(SVG_NS, 'image');
      image.setAttribute('href', this.icon);
      image.setAttribute('x', String(start));
      image.setAttribute('y', String(start));
      image.setAttribute('width', String(units));
      image.setAttribute('height', String(units));
      image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.append(plate, image);
    }
    return svg;
  }

  /** Vẽ lên canvas ở tỉ lệ `scale` (devicePixelRatio khi hiển thị, 2× khi xuất ảnh) */
  _paint(canvas, scale, fg, bg, withIcon) {
    const px = this._px();
    canvas.width = Math.round(px * scale);
    canvas.height = Math.round(px * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx || !this._qr) return;
    const { size, modules } = this._qr;
    const margin = Math.max(0, Math.floor(this.margin ?? 4));
    const total = size + margin * 2;
    const unit = canvas.width / total;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fg;
    // Làm tròn mép từng ô theo pixel → không có khe hở mảnh giữa các ô
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!modules[r][c]) continue;
        const x0 = Math.round((c + margin) * unit);
        const y0 = Math.round((r + margin) * unit);
        ctx.fillRect(x0, y0, Math.round((c + margin + 1) * unit) - x0, Math.round((r + margin + 1) * unit) - y0);
      }
    }
    const img = this._iconImg;
    if (this.icon) {
      const { units, pad, start } = this._iconBox(total);
      ctx.fillStyle = bg;
      const x = (start - pad) * unit;
      const w = (units + pad * 2) * unit;
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, x, w, w, pad * unit);
        ctx.fill();
      } else ctx.fillRect(x, x, w, w);
      if (withIcon && img?.complete && img.naturalWidth) {
        // Giữ tỉ lệ ảnh (contain) trong ô vuông
        const ratio = img.naturalWidth / img.naturalHeight;
        const box = units * unit;
        const dw = ratio >= 1 ? box : box * ratio;
        const dh = ratio >= 1 ? box / ratio : box;
        ctx.drawImage(img, start * unit + (box - dw) / 2, start * unit + (box - dh) / 2, dw, dh);
      }
    }
  }

  _draw() {
    const canvasMode = this.renderMode === 'canvas';
    this._holder.textContent = '';
    this._code = null;
    if (!this._qr) {
      this._syncLabel();
      return;
    }
    if (canvasMode) {
      const canvas = createElement('canvas', { part: 'code', className: 'qr__code', role: 'img' });
      this._holder.append(canvas);
      this._code = canvas;
      this._repaintCanvas();
    } else {
      // Màu SVG lấy từ CSS (fill: var(...)) → tự đổi theo dark mode, không cần vẽ lại
      const svg = this._buildSvg(null, null);
      svg.setAttribute('part', 'code');
      svg.setAttribute('class', 'qr__code');
      svg.setAttribute('role', 'img');
      this._holder.append(svg);
      this._code = svg;
    }
    this._syncLabel();
  }

  _repaintCanvas() {
    if (this.renderMode !== 'canvas' || !(this._code instanceof HTMLCanvasElement)) return;
    const { fg, bg } = this._colors();
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    this._paint(this._code, dpr, fg, bg, true);
  }

  _syncLabel() {
    if (this._qr) {
      this._code?.setAttribute('aria-label', this.label || tx('qrcode.label', { value: this.value || '' }));
      this._holder.removeAttribute('role');
      this._holder.removeAttribute('aria-label');
    } else {
      this._holder.setAttribute('role', 'img');
      this._holder.setAttribute('aria-label', tx('qrcode.error'));
    }
  }

  _syncStatus() {
    const status = STATUSES.includes(this.status) ? this.status : 'active';
    const active = status === 'active';
    this._status.hidden = active;
    this._base.dataset.status = status;
    this._spinner.hidden = status !== 'loading';
    this._statusIcon.hidden = status !== 'scanned';
    this._refreshBtn.hidden = status !== 'expired';
    this._refreshBtn.textContent = tx('qrcode.refresh');
    this._statusText.textContent = active ? '' : tx(`qrcode.${status}`);
    this._base.setAttribute('aria-busy', String(status === 'loading'));
  }
}

defineElement('hui-qrcode', HuiQrcode);

export default HuiQrcode;
