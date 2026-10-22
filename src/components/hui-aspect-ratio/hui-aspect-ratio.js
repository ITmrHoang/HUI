/**
 * HUI Aspect Ratio — Khung giữ tỉ lệ (Atom) cho ảnh / video / iframe / bản đồ nhúng.
 * Dùng CSS `aspect-ratio`; phần tử con được kéo phủ kín khung, ảnh/video lấp theo `fit` (object-fit).
 */

import styles from './hui-aspect-ratio.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

const FITS = ['cover', 'contain', 'fill', 'none', 'scale-down'];
const DEFAULT_RATIO = 16 / 9;

/**
 * "16/9" | "16:9" | "4 / 3" | "1" | "1.5" → số dương; không hợp lệ → null
 * @param {string|number|null|undefined} value
 */
export function parseRatio(value) {
  if (value === null || value === undefined || value === '') return null;
  const parts = String(value).split(/[/:]/).map((s) => Number(s.trim()));
  if (parts.length === 1) return parts[0] > 0 ? parts[0] : null;
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return parts[0] / parts[1];
  return null;
}

/**
 * Khung tỉ lệ cố định. Con trực tiếp (img, video, iframe, picture, div…) phủ kín khung.
 *
 * @slot - Nội dung giữ tỉ lệ (img / video / iframe / phần tử bất kỳ)
 * @csspart base - Khung giữ tỉ lệ
 * @cssprop --hui-aspect-ratio-radius - Bo góc khi có `rounded` (mặc định --hui-radius-lg)
 * @cssprop --hui-aspect-ratio-bg - Nền khung khi nội dung chưa tải (mặc định --hui-fill-tertiary)
 */
class HuiAspectRatio extends HuiElement {
  static properties = {
    /** Tỉ lệ rộng/cao: "16/9", "4:3", "1", "1.5"… (không hợp lệ → 16/9) */
    ratio: { type: String, default: '16/9' },
    /** cover | contain | fill | none | scale-down — cách ảnh/video lấp khung (object-fit) */
    fit: { type: String, default: 'cover' },
    /** Điểm neo ảnh khi bị cắt (object-position), vd "center top", "30% 50%" */
    objectPosition: { type: String },
    /** Bo góc khung (--hui-aspect-ratio-radius) */
    rounded: { type: Boolean },
  };

  static styles = styles;

  /** Tỉ lệ đang áp dụng (số) — chỉ đọc */
  get ratioValue() {
    return parseRatio(this.ratio) ?? DEFAULT_RATIO;
  }

  render() {
    this._base = createElement('div', { className: 'ar', part: 'base' }, createElement('slot'));
    return this._base;
  }

  updated(changed) {
    if (changed.has('ratio')) this._base.style.setProperty('--_ar-ratio', String(this.ratioValue));
    if (changed.has('fit')) this._base.style.setProperty('--_ar-fit', FITS.includes(this.fit) ? this.fit : 'cover');
    if (changed.has('objectPosition')) {
      if (this.objectPosition) this._base.style.setProperty('--_ar-position', this.objectPosition);
      else this._base.style.removeProperty('--_ar-position');
    }
  }
}

defineElement('hui-aspect-ratio', HuiAspectRatio);

export default HuiAspectRatio;
