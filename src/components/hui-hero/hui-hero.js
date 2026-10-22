/**
 * HUI Hero — Khối mở đầu landing page (Organism): eyebrow, tiêu đề lớn, mô tả, nút hành động, media.
 * Bố cục `centered` (giữa) | `split` (2 cột, media trái/phải, tự xếp dọc khi khung hẹp — container query).
 * Nền tùy biến qua slot background (hui-gradient-bg, hui-pattern, ảnh, video…).
 * Hiệu ứng vào trang: các phần hiện lần lượt (stagger) khi cuộn tới; tắt bằng no-animation / giảm chuyển động.
 */

import styles from './hui-hero.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { ANIMATIONS } from '../../utils/animate.js';
import { revealOnView, headingLevel } from '../hui-feature-card/landing-shared.js';

const assigned = (slot) => slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());

/**
 * @slot - Nội dung thêm dưới hàng nút (logo khách hàng, ghi chú "Không cần thẻ tín dụng"…)
 * @slot eyebrow - Dòng nhỏ trên tiêu đề (thay attribute eyebrow) — vd <hui-tag>
 * @slot title - Tiêu đề (thay attribute heading) — vd <hui-gradient-text>
 * @slot description - Mô tả (thay attribute description)
 * @slot actions - Các nút hành động
 * @slot media - Ảnh / video / mockup (cột bên cạnh khi split, bên dưới khi centered)
 * @slot background - Lớp nền phủ kín khối (hui-gradient-bg, hui-pattern, <img>…)
 * @csspart base - Thẻ <section>
 * @csspart background - Lớp nền
 * @csspart container - Khung căn giữa có max-width
 * @csspart content - Cột chữ (eyebrow → actions)
 * @csspart eyebrow - Dòng nhỏ trên tiêu đề
 * @csspart title - Tiêu đề (role heading, mặc định cấp 1)
 * @csspart description - Mô tả
 * @csspart actions - Hàng nút
 * @csspart extra - Vùng nội dung thêm (slot mặc định)
 * @csspart media - Vùng media
 * @cssprop --hui-hero-max-width - Bề rộng tối đa khung nội dung (mặc định 1200px)
 * @cssprop --hui-hero-padding - Đệm trong khối (mặc định co giãn theo bề rộng)
 * @cssprop --hui-hero-gap - Khoảng cách 2 cột (split)
 * @cssprop --hui-hero-bg - Nền khối (mặc định trong suốt)
 * @cssprop --hui-hero-color - Màu chữ
 * @cssprop --hui-hero-title-color - Màu tiêu đề
 * @cssprop --hui-hero-title-font-size - Cỡ chữ tiêu đề (mặc định clamp theo size)
 * @cssprop --hui-hero-description-color - Màu mô tả
 * @cssprop --hui-hero-description-font-size - Cỡ chữ mô tả
 * @cssprop --hui-hero-eyebrow-color - Màu eyebrow (mặc định primary)
 * @cssprop --hui-hero-content-width - Bề rộng tối đa cột chữ khi centered (mặc định 760px)
 * @cssprop --hui-hero-media-radius - Bo góc media (mặc định --hui-radius-xl)
 * @cssprop --hui-hero-media-shadow - Bóng media
 */
class HuiHero extends HuiElement {
  static properties = {
    /** centered | split — căn giữa / chia 2 cột chữ + media */
    layout: { type: String, default: 'centered' },
    /** end | start — vị trí media khi split (end = bên phải) */
    mediaPosition: { type: String, default: 'end' },
    /** Dòng nhỏ trên tiêu đề */
    eyebrow: { type: String },
    /** Tiêu đề lớn */
    heading: { type: String },
    /** Cấp heading của tiêu đề (aria-level, mặc định 1 — hero thường là tiêu đề trang) */
    headingLevel: { type: Number, default: 1 },
    /** Mô tả dưới tiêu đề */
    description: { type: String },
    /** Chiều cao tối thiểu: CSS length, số (px) hoặc "screen" (= 100svh, toàn màn hình) */
    minHeight: { type: String },
    /** sm | md | lg — cỡ chữ tiêu đề + đệm */
    size: { type: String, default: 'md' },
    /** fade-up | fade | zoom-in | blur-in | fade-left | fade-right | none — hiệu ứng vào (tên trong ANIMATIONS) */
    entrance: { type: String, default: 'fade-up' },
    /** Khoảng trễ giữa các phần khi hiện lần lượt (ms) */
    stagger: { type: Number, default: 120 },
    /** Tắt hiệu ứng vào */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    const slot = (name, ...fallback) => {
      const s = createElement('slot', name ? { name } : {}, ...fallback);
      s.addEventListener('slotchange', () => this._syncSections());
      return s;
    };

    this._bgSlot = slot('background');
    this._bg = createElement('div', { className: 'hero__bg', part: 'background' }, this._bgSlot);

    this._eyebrowText = document.createTextNode('');
    this._eyebrowSlot = slot('eyebrow', this._eyebrowText);
    this._eyebrow = createElement('div', { className: 'hero__eyebrow', part: 'eyebrow' }, this._eyebrowSlot);

    this._titleText = document.createTextNode('');
    this._titleSlot = slot('title', this._titleText);
    this._title = createElement('div', { className: 'hero__title', part: 'title', role: 'heading', id: 'title' }, this._titleSlot);

    this._descText = document.createTextNode('');
    this._descSlot = slot('description', this._descText);
    this._desc = createElement('div', { className: 'hero__desc', part: 'description' }, this._descSlot);

    this._actionsSlot = slot('actions');
    this._actions = createElement('div', { className: 'hero__actions', part: 'actions' }, this._actionsSlot);
    this._extraSlot = slot();
    this._extra = createElement('div', { className: 'hero__extra', part: 'extra' }, this._extraSlot);

    this._content = createElement('div', { className: 'hero__content', part: 'content' },
      this._eyebrow, this._title, this._desc, this._actions, this._extra);

    this._mediaSlot = slot('media');
    this._media = createElement('div', { className: 'hero__media', part: 'media' }, this._mediaSlot);

    this._container = createElement('div', { className: 'hero__container', part: 'container' }, this._content, this._media);
    this._base = createElement('section', { className: 'hero', part: 'base' }, this._bg, this._container);
    return this._base;
  }

  firstUpdated() {
    this._syncSections();
    this._startEntrance();
  }

  // Hiệu ứng vào chỉ chạy 1 lần (firstUpdated); bị tháo ra trước khi chạy → hủy, nội dung hiện ngay
  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopEntrance?.();
    this._stopEntrance = null;
  }

  updated(changed) {
    if (['layout', 'mediaPosition', 'size'].some((k) => changed.has(k))) {
      this._base.className = [
        'hero',
        `hero--${this.layout === 'split' ? 'split' : 'centered'}`,
        this.layout === 'split' && this.mediaPosition === 'start' ? 'hero--media-start' : '',
        `hero--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
      ].filter(Boolean).join(' ');
    }
    if (changed.has('eyebrow')) this._eyebrowText.textContent = this.eyebrow ?? '';
    if (changed.has('heading')) this._titleText.textContent = this.heading ?? '';
    if (changed.has('description')) this._descText.textContent = this.description ?? '';
    if (changed.has('headingLevel')) this._title.setAttribute('aria-level', String(headingLevel(this.headingLevel, 1)));

    if (changed.has('minHeight')) {
      const v = String(this.minHeight ?? '').trim();
      const value = !v ? '' : v === 'screen' ? '100svh' : /^\d+(\.\d+)?$/.test(v) ? `${v}px` : v;
      if (value) this._base.style.setProperty('--_hero-min-height', value);
      else this._base.style.removeProperty('--_hero-min-height');
    }

    if (changed.has('noAnimation') && this.noAnimation) {
      this._stopEntrance?.();
      this._stopEntrance = null;
    }

    this._syncSections();
  }

  /** Các phần đang hiển thị — theo thứ tự hiện lần lượt */
  get _parts() {
    return [this._eyebrow, this._title, this._desc, this._actions, this._extra, this._media].filter((el) => !el.hidden);
  }

  _startEntrance() {
    if (this.entrance === 'none') return;
    const effect = ANIMATIONS[this.entrance] ? this.entrance : 'fade-up';
    this._stopEntrance = revealOnView(this, this._parts, { effect, stagger: this.stagger, duration: 700 });
  }

  _syncSections() {
    if (!this._base) return;
    const has = (slot, text) => assigned(slot) || Boolean(text);
    this._eyebrow.hidden = !has(this._eyebrowSlot, this.eyebrow);
    this._eyebrow.classList.toggle('hero__eyebrow--custom', assigned(this._eyebrowSlot));
    this._title.hidden = !has(this._titleSlot, this.heading);
    this._desc.hidden = !has(this._descSlot, this.description);
    this._actions.hidden = !assigned(this._actionsSlot);
    this._extra.hidden = !assigned(this._extraSlot);
    this._media.hidden = !assigned(this._mediaSlot);
    this._bg.hidden = !assigned(this._bgSlot);
    this._base.classList.toggle('hero--has-media', !this._media.hidden);
    this._base.classList.toggle('hero--has-bg', !this._bg.hidden);
    if (!this._title.hidden) this._base.setAttribute('aria-labelledby', 'title');
    else this._base.removeAttribute('aria-labelledby');
  }
}

defineElement('hui-hero', HuiHero);

export { HuiHero };
export default HuiHero;
