/**
 * HUI Map — Nhúng Google Maps dạng facade: chỉ hiện hình bản đồ minh họa (SVG tự sinh) + địa chỉ + nút "Mở bản đồ";
 * bấm mới tạo iframe Google Maps → trang không tải script / cookie của Google cho tới khi người dùng cần.
 */

import styles from './hui-map.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animateIn } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { toAspectRatio } from '../hui-image/media-shared.js';
import '../hui-spinner/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const FALLBACK = {
  vi: {
    'map.load': 'Mở bản đồ',
    'map.loadLabel': 'Mở bản đồ: {place}',
    'map.openExternal': 'Mở trong Google Maps',
    'map.frameTitle': 'Bản đồ: {place}',
    'map.label': 'Bản đồ',
    'map.privacy': 'Bản đồ do Google cung cấp, chỉ tải khi bạn bấm mở.',
  },
  en: {
    'map.load': 'Show map',
    'map.loadLabel': 'Show map: {place}',
    'map.openExternal': 'Open in Google Maps',
    'map.frameTitle': 'Map: {place}',
    'map.label': 'Map',
    'map.privacy': 'Map provided by Google, loaded only when you open it.',
  },
};
function tx(key, vars) {
  let v = t(key, vars);
  if (v !== key) return v;
  v = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : v;
}

/** Băm chuỗi → số (FNV-1a) để mỗi địa chỉ có hình bản đồ minh họa riêng nhưng cố định */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Bộ sinh số giả ngẫu nhiên có seed (mulberry32) */
function rng(seed) {
  let a = seed || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/**
 * Hình bản đồ minh họa: khu nhà, công viên, sông, đường lớn / nhỏ — màu lấy từ class CSS (token) nên tự đổi theo dark mode.
 * Khung 800×450, phủ kín (slice) mọi tỉ lệ.
 */
function buildPattern(seed) {
  const r = rng(seed);
  const svg = svgEl('svg', { viewBox: '0 0 800 450', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true', focusable: 'false', class: 'map__art', part: 'art' });
  svg.append(svgEl('rect', { width: 800, height: 450, class: 'map__land' }));
  // Khu nhà: lưới ô lệch nhẹ
  const g = svgEl('g', { class: 'map__blocks' });
  for (let x = 0; x < 800; x += 90) {
    for (let y = 0; y < 450; y += 70) {
      if (r() < 0.18) continue;
      g.append(svgEl('rect', { x: x + 8 + r() * 6, y: y + 8 + r() * 6, width: 62 + r() * 12, height: 44 + r() * 10, rx: 4 }));
    }
  }
  svg.append(g);
  // Công viên
  for (let i = 0; i < 2; i++) {
    svg.append(svgEl('rect', { x: 60 + r() * 600, y: 30 + r() * 300, width: 110 + r() * 80, height: 70 + r() * 60, rx: 18, class: 'map__park' }));
  }
  // Sông uốn lượn
  const y0 = 80 + r() * 290;
  const river = `M-20 ${y0} C 180 ${y0 - 90 + r() * 60}, 300 ${y0 + 110}, 460 ${y0 + 10} S 700 ${y0 - 80 + r() * 50}, 820 ${y0 + 40}`;
  svg.append(svgEl('path', { d: river, class: 'map__river' }));
  // Đường nhỏ + đường lớn
  const minor = svgEl('g', { class: 'map__road-minor' });
  for (let x = 90; x < 800; x += 90) minor.append(svgEl('line', { x1: x, y1: 0, x2: x + (r() - 0.5) * 30, y2: 450 }));
  for (let y = 70; y < 450; y += 70) minor.append(svgEl('line', { x1: 0, y1: y, x2: 800, y2: y + (r() - 0.5) * 24 }));
  svg.append(minor);
  const major = svgEl('g', { class: 'map__road-major' });
  major.append(svgEl('path', { d: `M0 ${190 + r() * 60} Q 400 ${150 + r() * 140} 800 ${170 + r() * 80}` }));
  major.append(svgEl('path', { d: `M${300 + r() * 120} 0 Q ${380 + r() * 60} 225 ${330 + r() * 160} 450` }));
  svg.append(major);
  return svg;
}

/**
 * Google Maps facade. Không có request nào tới Google cho tới khi bấm "Mở bản đồ" (hoặc gọi load()).
 * Vị trí: `query` (địa chỉ / tên địa điểm) hoặc `lat` + `lng`.
 *
 * @fires hui-load - Ngay trước khi tạo iframe. Cancelable (preventDefault() → giữ facade, vd: hỏi đồng ý cookie trước). detail: { src }
 * @slot - Nội dung thêm trong thẻ thông tin (giờ mở cửa, số điện thoại…)
 * @slot placeholder - Ảnh / nội dung thay cho hình bản đồ minh họa
 * @csspart base - Khung (giữ tỉ lệ)
 * @csspart art - SVG bản đồ minh họa
 * @csspart pin - Ghim vị trí ở giữa
 * @csspart info - Thẻ thông tin (tên + địa chỉ + nút)
 * @csspart heading - Tên địa điểm
 * @csspart address - Địa chỉ
 * @csspart load-button - Nút "Mở bản đồ"
 * @csspart external-link - Link "Mở trong Google Maps"
 * @csspart frame - iframe Google Maps (sau khi mở)
 * @cssprop --hui-map-radius - Bo góc
 * @cssprop --hui-map-border-color - Viền
 * @cssprop --hui-map-land - Màu nền đất
 * @cssprop --hui-map-block - Màu khu nhà
 * @cssprop --hui-map-road - Màu đường
 * @cssprop --hui-map-water - Màu sông
 * @cssprop --hui-map-park - Màu công viên
 * @cssprop --hui-map-pin-color - Màu ghim
 * @cssprop --hui-map-info-bg - Nền thẻ thông tin
 * @cssprop --hui-map-info-max-width - Rộng tối đa thẻ thông tin
 * @cssprop --hui-map-min-height - Chiều cao tối thiểu (mặc định 240px)
 */
class HuiMap extends HuiElement {
  static properties = {
    /** Địa chỉ / tên địa điểm cần hiển thị */
    query: { type: String },
    /** Vĩ độ (dùng cùng lng, ưu tiên hơn query khi tạo bản đồ) */
    lat: { type: Number },
    /** Kinh độ */
    lng: { type: Number },
    /** Mức phóng 1–21 */
    zoom: { type: Number, default: 15 },
    /** Tỉ lệ khung: '16/9' | '4:3' | '1' … */
    ratio: { type: String, default: '16/9' },
    /** Tên địa điểm hiển thị trên thẻ thông tin */
    heading: { type: String },
    /** Địa chỉ hiển thị (mặc định = query) */
    address: { type: String },
    /** Ẩn link "Mở trong Google Maps" */
    hideExternal: { type: Boolean },
    /** Tắt hiệu ứng hiện bản đồ */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._frame = null;
  }

  render() {
    this._artWrap = createElement('div', { className: 'map__art-wrap' });
    this._phSlot = createElement('slot', { name: 'placeholder' }, this._artWrap);
    this._pin = createElement('span', { className: 'map__pin', part: 'pin', 'aria-hidden': 'true' },
      createElement('hui-icon', { name: 'map-pin' }));

    this._heading = createElement('div', { className: 'map__heading', part: 'heading' });
    this._address = createElement('div', { className: 'map__address', part: 'address' });
    this._loadBtn = createElement('button', { type: 'button', className: 'map__load', part: 'load-button' },
      createElement('hui-icon', { name: 'map-pin' }), createElement('span', { className: 'map__load-text' }));
    this._loadBtn.addEventListener('click', () => this.load());
    this._external = createElement('a', { className: 'map__external', part: 'external-link', target: '_blank', rel: 'noopener noreferrer' },
      createElement('span', { className: 'map__external-text' }), createElement('hui-icon', { name: 'external-link' }));
    this._privacy = createElement('p', { className: 'map__privacy' });
    this._info = createElement('div', { className: 'map__info', part: 'info' },
      this._heading, this._address, createElement('slot'),
      createElement('div', { className: 'map__actions' }, this._loadBtn, this._external), this._privacy);

    this._facade = createElement('div', { className: 'map__facade' }, this._phSlot, this._pin, this._info);
    this._spinner = createElement('hui-spinner', { className: 'map__spinner', hidden: true, 'aria-hidden': 'true' });
    this._base = createElement('div', { className: 'map', part: 'base', role: 'group' }, this._facade, this._spinner);
    return this._base;
  }

  updated(changed) {
    if (changed.has('ratio')) this._base.style.setProperty('--_map-ratio', toAspectRatio(this.ratio) || '16 / 9');
    const place = this._place;
    if (['query', 'lat', 'lng', 'heading', 'address', 'zoom', 'locale'].some((k) => changed.has(k))) {
      this._heading.textContent = this.heading || '';
      this._heading.hidden = !this.heading;
      const addr = this.address || this.query || (this._hasCoords ? `${this.lat}, ${this.lng}` : '');
      this._address.textContent = addr;
      this._address.hidden = !addr || addr === this.heading;
      this._loadBtn.querySelector('.map__load-text').textContent = tx('map.load');
      this._loadBtn.setAttribute('aria-label', tx('map.loadLabel', { place }));
      this._external.querySelector('.map__external-text').textContent = tx('map.openExternal');
      this._external.href = this.externalUrl;
      this._privacy.textContent = tx('map.privacy');
      this._base.setAttribute('aria-label', `${tx('map.label')}: ${place}`);
      // Hình minh họa đổi theo địa điểm
      if (changed.has('query') || changed.has('lat') || changed.has('lng') || !this._artWrap.firstChild) {
        this._artWrap.replaceChildren(buildPattern(hash(this.query || `${this.lat},${this.lng}` || 'hui-map')));
      }
      // Đã mở bản đồ → cập nhật iframe theo vị trí mới
      if (this._frame && ['query', 'lat', 'lng', 'zoom'].some((k) => changed.has(k))) this._frame.src = this.embedUrl;
      if (this._frame) this._frame.title = tx('map.frameTitle', { place });
    }
    if (changed.has('hideExternal')) this._external.hidden = this.hideExternal;
  }

  get _hasCoords() {
    return Number.isFinite(this.lat) && Number.isFinite(this.lng);
  }

  get _place() {
    return this.heading || this.address || this.query || (this._hasCoords ? `${this.lat}, ${this.lng}` : tx('map.label'));
  }

  get _q() {
    return this._hasCoords ? `${this.lat},${this.lng}` : this.query || this.address || '';
  }

  /** URL iframe Google Maps (không cần API key) */
  get embedUrl() {
    const params = new URLSearchParams({ q: this._q, z: String(Math.min(21, Math.max(1, Math.round(this.zoom || 15)))), hl: getLocaleName(), output: 'embed' });
    return `https://www.google.com/maps?${params}`;
  }

  /** URL mở Google Maps ở tab mới */
  get externalUrl() {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this._q)}`;
  }

  /** Đã tạo iframe bản đồ */
  get loaded() {
    return Boolean(this._frame);
  }

  /** Tạo iframe Google Maps (chỉ chạy khi người dùng bấm hoặc gọi tay) */
  load() {
    if (this._frame) return;
    const src = this.embedUrl;
    if (!this.emit('hui-load', { src }, { cancelable: true })) return;
    const frame = createElement('iframe', {
      className: 'map__frame', part: 'frame', src, title: tx('map.frameTitle', { place: this._place }),
      loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade', allowfullscreen: true,
    });
    this._frame = frame;
    this._spinner.hidden = false;
    frame.addEventListener('load', () => { this._spinner.hidden = true; }, { once: true });
    this._facade.hidden = true;
    this._base.prepend(frame);
    this.setState('loaded', true);
    if (!this.noAnimation && !animationsDisabled()) animateIn(frame, 'fade', { duration: 300 });
    frame.focus?.({ preventScroll: true });
  }
}

defineElement('hui-map', HuiMap);

export default HuiMap;
