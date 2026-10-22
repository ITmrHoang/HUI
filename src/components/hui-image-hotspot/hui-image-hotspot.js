/**
 * HUI Image Hotspot — Ảnh có các điểm chấm nhấp nháy (Organism): rê chuột / bấm / focus bàn phím vào điểm
 * → hui-popover hiện tiêu đề + mô tả + link. Toạ độ điểm theo % nên tự đúng vị trí ở mọi kích thước ảnh.
 * Ảnh: attribute `src` (dựng hui-image) hoặc <img> / <picture> / <hui-image> đặt vào slot mặc định.
 */

import styles from './hui-image-hotspot.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-image/index.js';
import '../hui-popover/index.js';

const COLOR_TOKENS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

const FALLBACK = {
  vi: { 'imageHotspot.spot': 'Điểm {index}', 'imageHotspot.more': 'Xem chi tiết', 'imageHotspot.label': 'Ảnh có {count} điểm thông tin' },
  en: { 'imageHotspot.spot': 'Point {index}', 'imageHotspot.more': 'Learn more', 'imageHotspot.label': 'Image with {count} hotspots' },
};

function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/** "45%" | "45" | 45 → 45 (kẹp 0..100) */
const pct = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : 50;
};

const safeHref = (href) => (/^\s*javascript:/i.test(String(href)) ? '#' : String(href));

/**
 * Ảnh hotspot. spots: [{ x, y (phần trăm), title, content, href, linkText, color, placement }]
 *
 * @fires hui-spot-toggle - Popover của một điểm mở/đóng. detail: { index, spot, open }
 * @slot - Ảnh tùy biến (<img>, <picture>, <hui-image>…) khi không dùng attribute src
 * @csspart base - Khung ảnh (position: relative)
 * @csspart image - <hui-image> dựng từ src
 * @csspart spots - Lớp phủ chứa các điểm
 * @csspart spot - Nút chấm của từng điểm; thêm spot-active khi đang mở
 * @csspart spot-label - Số thứ tự trong chấm (numbered)
 * @csspart popover - <hui-popover> của từng điểm
 * @csspart spot-title - Tiêu đề trong popover
 * @csspart spot-content - Mô tả trong popover
 * @csspart spot-link - Link "Xem chi tiết"
 * @cssprop --hui-image-hotspot-size - Đường kính chấm (mặc định 24px; numbered 28px)
 * @cssprop --hui-image-hotspot-color - Màu chấm (attribute color / spot.color ưu tiên hơn)
 * @cssprop --hui-image-hotspot-ring - Màu viền trắng quanh chấm
 * @cssprop --hui-image-hotspot-pulse-duration - Chu kỳ nhấp nháy (mặc định 2s)
 * @cssprop --hui-image-hotspot-radius - Bo góc ảnh
 */
class HuiImageHotspot extends HuiElement {
  static localized = true;

  static properties = {
    /** Đường dẫn ảnh (dựng hui-image); bỏ trống → dùng ảnh trong slot */
    src: { type: String },
    /** Mô tả ảnh */
    alt: { type: String },
    /** Tỉ lệ khung ảnh: 16/9, 4/3… (truyền cho hui-image) */
    ratio: { type: String },
    /** Danh sách điểm [{ x, y, title, content, href, linkText, color, placement }] — x/y tính theo % */
    spots: { type: Array },
    /** hover | click — cách mở popover (hover gồm cả focus bàn phím) */
    trigger: { type: String, default: 'hover' },
    /** Vị trí popover mặc định: top | bottom | left | right (kèm -start / -end) */
    placement: { type: String, default: 'top' },
    /** Màu chấm: primary | success | warning | danger | info hoặc màu CSS */
    color: { type: String },
    /** Hiện số thứ tự trong chấm */
    numbered: { type: Boolean },
    /** Bo góc ảnh */
    rounded: { type: Boolean },
    /** Tắt nhấp nháy */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._popovers = [];
  }

  render() {
    this._image = createElement('hui-image', { part: 'image', className: 'ih__image', hidden: true });
    this._slot = createElement('slot');
    this._spots = createElement('div', { className: 'ih__spots', part: 'spots' });
    this._base = createElement('div', { className: 'ih', part: 'base', role: 'group' }, this._image, this._slot, this._spots);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._base.classList.toggle('ih--static', animationsDisabled());
  }

  updated(changed) {
    const img = this._image;
    if (changed.has('src')) {
      img.hidden = !this.src;
      this._slot.hidden = Boolean(this.src);
      if (this.src) img.setAttribute('src', this.src);
      else img.removeAttribute('src');
    }
    if (changed.has('alt')) img.setAttribute('alt', this.alt || '');
    if (changed.has('ratio')) {
      if (this.ratio) img.setAttribute('ratio', this.ratio);
      else img.removeAttribute('ratio');
    }
    if (changed.has('color')) {
      const c = this.color ? (COLOR_TOKENS.includes(this.color) ? `var(--hui-${this.color})` : this.color) : '';
      if (c) this._base.style.setProperty('--_ih-color', c);
      else this._base.style.removeProperty('--_ih-color');
    }
    this._base.classList.toggle('ih--rounded', this.rounded);
    this._base.classList.toggle('ih--pulse', !this.noAnimation);

    if (['spots', 'trigger', 'placement', 'numbered', 'locale'].some((k) => changed.has(k))) this._renderSpots();
  }

  get _list() {
    return Array.isArray(this.spots) ? this.spots.filter((s) => s && typeof s === 'object') : [];
  }

  /** Mở popover điểm thứ i */
  openSpot(i) {
    this._popovers[i]?.show();
  }

  /** Đóng mọi popover */
  closeAll() {
    this._popovers.forEach((p) => p.hide());
  }

  _renderSpots() {
    const list = this._list;
    this._base.setAttribute('aria-label', this.alt ? `${this.alt} — ${tx('imageHotspot.label', { count: list.length })}` : tx('imageHotspot.label', { count: list.length }));
    const trigger = this.trigger === 'click' ? 'click' : 'hover';

    this._popovers = list.map((spot, i) => {
      const name = spot.title || tx('imageHotspot.spot', { index: i + 1 });
      const btn = createElement('button', {
        type: 'button',
        className: 'ih__spot',
        part: 'spot',
        'aria-label': name,
        'aria-expanded': 'false',
      });
      if (this.numbered) btn.append(createElement('span', { className: 'ih__spot-label', part: 'spot-label', 'aria-hidden': 'true' }, String(i + 1)));
      const color = spot.color ? (COLOR_TOKENS.includes(spot.color) ? `var(--hui-${spot.color})` : spot.color) : '';
      if (color) btn.style.setProperty('--_ih-spot-color', color);

      const content = createElement('div', { slot: 'content', className: 'ih__pop' });
      if (spot.content) content.append(createElement('p', { className: 'ih__pop-content', part: 'spot-content' }, String(spot.content)));
      if (spot.href) {
        content.append(createElement('a', { className: 'ih__pop-link', part: 'spot-link', href: safeHref(spot.href) }, spot.linkText || tx('imageHotspot.more')));
      }

      const pop = createElement('hui-popover', {
        className: 'ih__popover',
        part: 'popover',
        trigger,
        placement: spot.placement || this.placement || 'top',
        style: `left: ${pct(spot.x)}%; top: ${pct(spot.y)}%;`,
      }, btn);
      if (spot.title) pop.append(createElement('div', { slot: 'title', className: 'ih__pop-title', part: 'spot-title' }, String(spot.title)));
      if (spot.content || spot.href) pop.append(content);
      // Không có nội dung → không mở popover, chấm vẫn hiện tên qua aria-label
      pop.addEventListener('open-change', (e) => {
        e.stopPropagation();
        const open = Boolean(e.detail?.open);
        btn.setAttribute('aria-expanded', String(open));
        btn.setAttribute('part', open ? 'spot spot-active' : 'spot');
        pop.classList.toggle('ih__popover--open', open);
        this.emit('hui-spot-toggle', { index: i, spot, open });
      });
      return pop;
    });
    this._spots.replaceChildren(...this._popovers);
  }
}

defineElement('hui-image-hotspot', HuiImageHotspot);

export default HuiImageHotspot;
