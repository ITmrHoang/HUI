/**
 * HUI Watermark — phủ chữ / ảnh chìm lặp lại lên nội dung bên trong (Ant Watermark).
 *   <hui-watermark content="Bảo mật nội bộ"> …nội dung… </hui-watermark>
 *   <hui-watermark content='["Nguyễn Văn A", "2026-10-22"]' rotate="-30" gap="[120,120]"></hui-watermark>
 *   <hui-watermark image="data:image/svg+xml,…" image-width="120" image-height="40"></hui-watermark>
 * Ô lặp sinh bằng canvas (theo devicePixelRatio) → data URL; không có canvas thì sinh SVG data URL.
 * Chữ: ô lặp dùng làm mask, màu lấy từ CSS (--hui-watermark-color, mặc định --hui-fill) → tự đổi theo dark mode.
 * Chống xóa: MutationObserver dựng lại lớp phủ khi bị gỡ / sửa style, attribute (giới hạn: xem docs).
 */

import styles from './hui-watermark.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const DEFAULT_FONT = { fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', fontFamily: 'sans-serif' };

/** "[a,b]" | "a,b" | "a b" | số | mảng → [x, y] */
function toPair(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  let v = value;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s.startsWith('[')) {
      try { v = JSON.parse(s); } catch { return fallback; }
    } else v = s.split(/[\s,]+/).map(Number);
  }
  if (typeof v === 'number') v = [v, v];
  if (!Array.isArray(v)) return fallback;
  const x = Number(v[0]);
  const y = v.length > 1 ? Number(v[1]) : x;
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : fallback;
}

/** content: chuỗi | mảng | chuỗi JSON mảng → mảng dòng (bỏ dòng rỗng) */
function toLines(content) {
  if (content === null || content === undefined) return [];
  let v = content;
  if (typeof v === 'string' && v.trim().startsWith('[')) {
    try { v = JSON.parse(v); } catch { /* giữ nguyên chuỗi */ }
  }
  return (Array.isArray(v) ? v : [v]).map((s) => String(s ?? '')).filter((s) => s !== '');
}

function fontString(f) {
  return `${f.fontStyle} normal ${f.fontWeight} ${f.fontSize}px ${f.fontFamily}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Không tải được ảnh watermark: ${src}`));
    img.src = src;
  });
}

/**
 * Kích thước 1 mục (chữ hoặc ảnh) trước khi xoay. Không có canvas → ước lượng 0.6em / ký tự.
 * @returns {{ width:number, height:number, lineHeight:number }}
 */
function measure(lines, font, image, imageWidth, imageHeight, ctx) {
  if (image) {
    const ratio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 120 / 64;
    let w = imageWidth;
    let h = imageHeight;
    if (!w && !h) { w = 120; h = 120 / ratio; } else if (!w) w = h * ratio; else if (!h) h = w / ratio;
    return { width: w, height: h, lineHeight: 0 };
  }
  const lineHeight = Math.round(font.fontSize * 1.35);
  let width = 0;
  if (ctx) {
    ctx.font = fontString(font);
    for (const line of lines) width = Math.max(width, ctx.measureText(line).width);
  } else {
    for (const line of lines) width = Math.max(width, line.length * font.fontSize * 0.6);
  }
  return { width: Math.ceil(width), height: lineHeight * lines.length, lineHeight };
}

/** Tâm các mục trong 1 ô lặp: stagger = 2 mục so le (ô lặp gấp đôi), grid = 1 mục */
function itemCenters(cw, ch, layout) {
  return layout === 'grid' ? [[cw / 2, ch / 2]] : [[cw / 2, ch / 2], [cw * 1.5, ch * 1.5]];
}

/** Vẽ ô lặp. Trả null khi không có canvas / canvas bị "bẩn" (ảnh khác origin không CORS) */
function drawCanvasTile(geom, lines, font, image, ratio) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return null;
  canvas.width = Math.ceil(geom.tileW * ratio);
  canvas.height = Math.ceil(geom.tileH * ratio);
  ctx.scale(ratio, ratio);
  for (const [cx, cy] of geom.centers) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((geom.rotate * Math.PI) / 180);
    if (image) {
      ctx.drawImage(image, -geom.width / 2, -geom.height / 2, geom.width, geom.height);
    } else {
      ctx.font = fontString(font);
      ctx.fillStyle = font.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, -geom.height / 2 + geom.lineHeight * (i + 0.5));
      });
    }
    ctx.restore();
  }
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

const escapeXml = (s) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

/** Dự phòng: ô lặp dạng SVG data URL (chỉ cho chữ, hoặc ảnh data URI) */
function drawSvgTile(geom, lines, font, imageSrc) {
  const items = geom.centers.map(([cx, cy]) => {
    const transform = `translate(${cx} ${cy}) rotate(${geom.rotate})`;
    if (imageSrc) {
      return `<image href="${escapeXml(imageSrc)}" x="${-geom.width / 2}" y="${-geom.height / 2}" width="${geom.width}" height="${geom.height}" transform="${transform}"/>`;
    }
    const tspans = lines.map((line, i) => `<tspan x="0" y="${-geom.height / 2 + geom.lineHeight * (i + 0.5)}">${escapeXml(line)}</tspan>`).join('');
    return `<text transform="${transform}" text-anchor="middle" dominant-baseline="central" fill="${escapeXml(font.color)}" font-family="${escapeXml(font.fontFamily)}" font-size="${font.fontSize}" font-weight="${escapeXml(String(font.fontWeight))}" font-style="${escapeXml(font.fontStyle)}">${tspans}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${geom.tileW}" height="${geom.tileH}" viewBox="0 0 ${geom.tileW} ${geom.tileH}">${items}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Hình học ô lặp: kích thước mục, hộp bao sau khi xoay, kích thước ô */
function geometry(size, rotate, gap, layout) {
  const rad = (rotate * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rw = size.width * cos + size.height * sin;
  const rh = size.width * sin + size.height * cos;
  const cw = Math.ceil(rw + Math.max(0, gap[0]));
  const ch = Math.ceil(rh + Math.max(0, gap[1]));
  const grid = layout === 'grid';
  return { ...size, rotate, cellW: cw, cellH: ch, tileW: grid ? cw : cw * 2, tileH: grid ? ch : ch * 2, centers: itemCenters(cw, ch, layout) };
}

/**
 * Sinh ảnh ô lặp watermark (dùng được độc lập, vd: làm nền cho vùng khác / in ấn).
 * @param {object} options
 * @param {string|string[]} [options.content]  chữ (mảng = nhiều dòng)
 * @param {string|HTMLImageElement} [options.image] URL / data URI / ảnh đã tải (ưu tiên hơn chữ)
 * @param {number} [options.width] [options.height]  kích thước ảnh (px)
 * @param {number} [options.rotate=-22]
 * @param {number[]} [options.gap=[100,100]]
 * @param {object} [options.font] { fontSize, fontWeight, fontStyle, fontFamily, color }
 * @param {'stagger'|'grid'} [options.layout='stagger']
 * @param {number} [options.ratio=devicePixelRatio]
 * @returns {Promise<{url:string, width:number, height:number, ratio:number, format:'png'|'svg'}>} width/height = kích thước CSS (background-size)
 */
export async function createWatermarkDataUrl(options = {}) {
  let image = options.image || null;
  if (typeof image === 'string') {
    try { image = await loadImage(image); } catch { image = null; }
  }
  return buildTile({ ...options, image, imageSrc: typeof options.image === 'string' ? options.image : null });
}

/** Phần đồng bộ của createWatermarkDataUrl (ảnh đã tải xong) */
function buildTile({ content, image = null, imageSrc = null, width, height, rotate = -22, gap, font, layout = 'stagger', ratio }) {
  const f = { ...DEFAULT_FONT, color: 'rgba(0, 0, 0, 0.15)', ...(font || {}) };
  f.fontSize = Number(f.fontSize) || DEFAULT_FONT.fontSize;
  const lines = toLines(content);
  const r = Math.min(3, Math.max(1, Number(ratio) || (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1));
  const probe = typeof document !== 'undefined' ? document.createElement('canvas').getContext?.('2d') : null;
  const size = measure(lines, f, image, Number(width) || 0, Number(height) || 0, probe);
  const geom = geometry(size, Number(rotate) || 0, toPair(gap, [100, 100]), layout);
  if (!image && !lines.length) return { url: '', width: geom.tileW, height: geom.tileH, ratio: r, format: 'png' };

  const png = probe ? drawCanvasTile(geom, lines, f, image, r) : null;
  if (png) return { url: png, width: geom.tileW, height: geom.tileH, ratio: r, format: 'png' };
  // Canvas bị chặn: ảnh chỉ nhúng được vào SVG khi là data URI (SVG làm ảnh nền không tải URL ngoài)
  const svgImage = imageSrc?.startsWith('data:') ? imageSrc : null;
  if (image && !svgImage && !lines.length) return { url: '', width: geom.tileW, height: geom.tileH, ratio: r, format: 'svg' };
  const svgGeom = image && !svgImage ? geometry(measure(lines, f, null, 0, 0, probe), Number(rotate) || 0, toPair(gap, [100, 100]), layout) : geom;
  return { url: drawSvgTile(svgGeom, lines, f, svgImage), width: svgGeom.tileW, height: svgGeom.tileH, ratio: r, format: 'svg' };
}

/**
 * @fires hui-tamper - Lớp watermark bị gỡ / sửa và đã được dựng lại. detail: { reason: 'removed' | 'attributes' }
 * @slot - Nội dung được phủ watermark
 * @csspart content - Khung bọc nội dung
 * @cssprop --hui-watermark-color - Màu chữ watermark (mặc định --hui-fill, đổi theo dark mode); font.color ưu tiên hơn
 */
class HuiWatermark extends HuiElement {
  static properties = {
    /** Chữ watermark: chuỗi, hoặc mảng (property / JSON attribute) cho nhiều dòng */
    content: { type: String, reflect: false },
    /** URL / data URI ảnh watermark (ưu tiên hơn content; lỗi tải → quay về content) */
    image: { type: String },
    /** Chiều rộng ảnh (px); thiếu 1 chiều thì giữ tỉ lệ ảnh */
    imageWidth: { type: Number, attribute: 'image-width' },
    /** Chiều cao ảnh (px) */
    imageHeight: { type: Number, attribute: 'image-height' },
    /** Góc xoay (độ) */
    rotate: { type: Number, default: -22 },
    /** Khoảng cách giữa các mục [x, y] (px) — "[100,100]" | "100,100" | "100" */
    gap: { type: String, reflect: false },
    /** Độ lệch ô lặp đầu tiên so với góc trên-trái [x, y] (mặc định gap/2) */
    offset: { type: String, reflect: false },
    /** Font chữ: { fontSize, fontWeight, fontStyle, fontFamily, color } (JSON attribute) */
    font: { type: Object },
    /** z-index của lớp watermark */
    zIndex: { type: Number, attribute: 'z-index', default: 9 },
    /** Độ mờ cả lớp (0–1) */
    opacity: { type: Number, default: 1 },
    /** stagger | grid — so le (giống Ant) hoặc lưới thẳng hàng */
    layout: { type: String, default: 'stagger' },
  };

  static styles = styles;

  constructor() {
    super();
    this._tile = null;
    this._token = 0;
    this._observer = null;
    this._dprQuery = null;
  }

  render() {
    this._content = createElement('div', { className: 'content', part: 'content' }, createElement('slot'));
    this._layer = this._createLayer();
    return [this._content, this._layer];
  }

  connectedCallback() {
    super.connectedCallback();
    this._observe();
    this._watchDpr();
    // Font web tải xong sau → đo lại chiều rộng chữ
    document.fonts?.ready?.then(() => this.isConnected && this._generate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._observer = null;
  }

  updated(changed) {
    if (['content', 'image', 'imageWidth', 'imageHeight', 'rotate', 'gap', 'font', 'layout'].some((k) => changed.has(k))) {
      this._generate();
    } else if (['offset', 'zIndex', 'opacity'].some((k) => changed.has(k))) {
      this._applyLayer();
    }
  }

  /** Sinh lại ô lặp (vd: sau khi đổi font hệ thống) */
  refresh() {
    this._generate();
  }

  /** Data URL ô lặp hiện tại + kích thước (để test / xuất) */
  get tile() {
    return this._tile;
  }

  // =====================================================
  // SINH Ô LẶP
  // =====================================================

  _fontOptions() {
    const f = { ...DEFAULT_FONT, ...(this.font || {}) };
    if (!this.font?.fontFamily) f.fontFamily = getComputedStyle(this).fontFamily || DEFAULT_FONT.fontFamily;
    // Chữ dùng làm mask → vẽ màu đặc, màu thật do CSS quyết định
    f.color = '#000';
    return f;
  }

  async _generate() {
    const token = ++this._token;
    const base = {
      content: this.content,
      width: this.imageWidth,
      height: this.imageHeight,
      rotate: this.rotate ?? -22,
      gap: this.gap,
      font: this._fontOptions(),
      layout: this.layout === 'grid' ? 'grid' : 'stagger',
    };
    let tile = null;
    if (this.image) {
      let img = null;
      try { img = await loadImage(this.image); } catch { img = null; }
      if (token !== this._token) return;
      if (img) {
        tile = buildTile({ ...base, image: img, imageSrc: this.image });
        if (tile.url) tile.mode = 'image';
      }
    }
    if (!tile?.url) {
      tile = buildTile(base);
      tile.mode = 'text';
    }
    if (token !== this._token) return;
    this._tile = tile;
    this._applyLayer();
  }

  _watchDpr() {
    if (typeof matchMedia !== 'function') return;
    const dpr = window.devicePixelRatio || 1;
    const mq = matchMedia(`(resolution: ${dpr}dppx)`);
    this.listen(mq, 'change', () => {
      this._generate();
      this._watchDpr(); // query cũ chỉ báo một lần → theo dõi mức mới
    }, { once: true });
  }

  // =====================================================
  // LỚP PHỦ + CHỐNG XÓA
  // =====================================================

  _createLayer() {
    return createElement('div', { className: 'layer', 'aria-hidden': 'true' });
  }

  /** Ghi toàn bộ style inline (!important) lên lớp phủ → stylesheet ngoài không ghi đè được */
  _applyLayer() {
    const layer = this._layer;
    if (!layer) return;
    const tile = this._tile;
    const gap = toPair(this.gap, [100, 100]);
    const [ox, oy] = toPair(this.offset, [gap[0] / 2, gap[1] / 2]);
    const decl = {
      position: 'absolute',
      inset: '0',
      display: 'block',
      visibility: 'visible',
      'pointer-events': 'none',
      'z-index': String(this.zIndex ?? 9),
      opacity: String(Math.min(1, Math.max(0, this.opacity ?? 1))),
      transform: 'none',
      'clip-path': 'none',
      filter: 'none',
    };
    if (tile?.url) {
      const size = `${tile.width}px ${tile.height}px`;
      const pos = `${ox - gap[0] / 2}px ${oy - gap[1] / 2}px`;
      if (tile.mode === 'image') {
        Object.assign(decl, {
          'background-image': `url("${tile.url}")`,
          'background-size': size,
          'background-position': pos,
          'background-repeat': 'repeat',
        });
      } else {
        const color = this.font?.color || 'var(--hui-watermark-color, var(--hui-fill))';
        Object.assign(decl, {
          'background-color': color,
          '-webkit-mask-image': `url("${tile.url}")`,
          'mask-image': `url("${tile.url}")`,
          '-webkit-mask-size': size,
          'mask-size': size,
          '-webkit-mask-position': pos,
          'mask-position': pos,
          '-webkit-mask-repeat': 'repeat',
          'mask-repeat': 'repeat',
        });
      }
    } else {
      decl.display = 'none';
    }
    layer.setAttribute('style', Object.entries(decl).map(([k, v]) => `${k}: ${v} !important`).join('; '));
    layer.setAttribute('aria-hidden', 'true');
    layer.className = 'layer';
    for (const attr of [...layer.attributes]) {
      if (!['style', 'aria-hidden', 'class'].includes(attr.name)) layer.removeAttribute(attr.name);
    }
    this._observer?.takeRecords(); // bỏ qua thay đổi do chính mình ghi
  }

  _observe() {
    if (this._observer || typeof MutationObserver !== 'function') return;
    this._observer = new MutationObserver((records) => this._onMutations(records));
    this._observer.observe(this.shadowRoot, { childList: true, subtree: true, attributes: true });
  }

  _onMutations(records) {
    const root = this.shadowRoot;
    const layer = this._layer;
    const touched = records.some((r) => r.type === 'attributes' && r.target === layer);
    // Bị gỡ, bị chèn thứ khác vào trong, hoặc bị đẩy xuống dưới phần tử khác → dựng lại đúng thứ tự
    const broken = layer.parentNode !== root || layer.childNodes.length > 0
      || this._content.parentNode !== root || root.lastElementChild !== layer;
    if (!touched && !broken) return;
    if (broken) {
      if (layer.parentNode !== root || layer.childNodes.length) {
        layer.remove();
        this._layer = this._createLayer();
      }
      if (this._content.parentNode !== root) root.prepend(this._content);
      root.append(this._layer);
    }
    this._applyLayer();
    this.emit('hui-tamper', { reason: broken ? 'removed' : 'attributes' });
  }
}

defineElement('hui-watermark', HuiWatermark);

export default HuiWatermark;
