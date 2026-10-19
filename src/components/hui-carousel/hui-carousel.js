/**
 * HUI Carousel — banner / hero slider (Organism)
 *   <hui-carousel autoplay="5000" loop effect="fade" indicator="thumbnails">
 *     <div><img src="a.jpg" alt="…"></div>
 *     <div><img data-src="b.jpg" alt="…"></div>   ← data-src: chỉ tải khi slide sắp hiện
 *   </hui-carousel>
 * Không dựng trên hui-scroller: scroller dùng cuộn native + scroll-snap nên không làm được loop vô hạn
 * và effect fade/zoom. Carousel tự điều khiển track bằng transform:
 * - slide + loop: "xoay vòng" thứ tự slide bằng CSS `order` (không nhân bản DOM của người dùng),
 *   slide hiện tại luôn có hàng xóm 2 bên → trượt liền mạch qua mép.
 * - fade / zoom: các slide chồng lên nhau (grid 1/1), đổi opacity; zoom thêm hiệu ứng Ken Burns cho ảnh.
 * ARIA theo mẫu Carousel của WAI-ARIA APG: region + aria-roledescription, slide = group, nút tạm dừng đứng đầu.
 */

import styles from './hui-carousel.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import { tx, toLength, toAspectRatio, ensureMediaIcons, animationsDisabled } from '../hui-image/media-shared.js';
import '../hui-icon/hui-icon.js';

ensureMediaIcons();

const EFFECTS = ['slide', 'fade', 'zoom'];
const INDICATORS = ['dots', 'thumbnails', 'none'];
const ARROWS = ['always', 'hover', 'never'];
const SKIP_TAGS = new Set(['template', 'style', 'script', 'link', 'meta']);
const EASE = 'cubic-bezier(0.25, 0.8, 0.25, 1)';
const KB_ORIGINS = ['center', 'top left', 'bottom right', 'top right', 'bottom left'];

const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Thuộc tính ARIA do carousel tự gắn lên slide: el → { attr: giá trị đã gắn } */
const ownedAria = new WeakMap();

let uid = 0;

/**
 * @fires hui-slide-change - Đổi slide. detail: { index, previous }
 * @slot - Các slide (mỗi phần tử con trực tiếp là 1 slide). data-thumb="url" = ảnh cho indicator="thumbnails"
 * @csspart base - Khung ngoài (role="region", aria-roledescription="carousel")
 * @csspart frame - Khung chứa viewport + nút
 * @csspart viewport - Vùng nhìn (cắt phần tràn, nhận vuốt)
 * @csspart track - Hàng chứa slide
 * @csspart prev - Nút slide trước
 * @csspart next - Nút slide sau
 * @csspart pause - Nút tạm dừng / tiếp tục tự chạy
 * @csspart progress - Rãnh thanh tiến độ tự chạy
 * @csspart progress-bar - Thanh tiến độ tự chạy
 * @csspart nav - Hàng chấm / ảnh thu nhỏ
 * @csspart dot - Mỗi chấm (thêm dot-active cho chấm hiện tại)
 * @csspart thumb - Mỗi ảnh thu nhỏ (thêm thumb-active)
 * @cssprop --hui-carousel-duration - Thời gian chuyển slide (mặc định 500ms)
 * @cssprop --hui-carousel-gap - Khoảng cách slide khi items-per-view > 1 (attribute gap ưu tiên hơn; mặc định --hui-space-md)
 * @cssprop --hui-carousel-radius - Bo góc viewport (mặc định --hui-radius-lg)
 * @cssprop --hui-carousel-arrow-size - Kích thước nút mũi tên (mặc định 40px)
 * @cssprop --hui-carousel-arrow-bg - Nền nút mũi tên / tạm dừng
 * @cssprop --hui-carousel-arrow-color - Màu icon nút
 * @cssprop --hui-carousel-arrow-offset - Khoảng cách nút tới mép (mặc định --hui-space-md)
 * @cssprop --hui-carousel-dot-size - Đường kính chấm (mặc định 8px)
 * @cssprop --hui-carousel-dot-color - Màu chấm thường
 * @cssprop --hui-carousel-dot-active-color - Màu chấm hiện tại (mặc định --hui-primary)
 * @cssprop --hui-carousel-thumb-width - Bề rộng ảnh thu nhỏ (mặc định 72px)
 * @cssprop --hui-carousel-thumb-ratio - Tỉ lệ ảnh thu nhỏ (mặc định 4 / 3)
 * @cssprop --hui-carousel-progress-height - Độ dày thanh tiến độ (mặc định 3px)
 * @cssprop --hui-carousel-progress-color - Màu thanh tiến độ (mặc định --hui-primary)
 * @cssprop --hui-carousel-kenburns-scale - Mức phóng Ken Burns (effect="zoom", mặc định 1.15)
 * @cssprop --hui-carousel-focus-color - Viền focus
 */
class HuiCarousel extends HuiElement {
  static properties = {
    /** Tự chuyển slide sau mỗi N ms (attribute rỗng = 5000). Dừng khi hover / focus / tab ẩn; giảm chuyển động → bắt đầu ở trạng thái dừng */
    autoplay: { type: Number, default: 0 },
    /** Vòng vô hạn: slide cuối → slide đầu liền mạch */
    loop: { type: Boolean },
    /** slide | fade | zoom — trượt ngang, mờ chồng, hoặc mờ chồng + Ken Burns (ảnh phóng chậm) */
    effect: { type: String, default: 'slide' },
    /** dots | thumbnails | none — chấm, ảnh thu nhỏ hoặc không có */
    indicator: { type: String, default: 'dots' },
    /** always | hover | never — nút mũi tên luôn hiện, chỉ hiện khi hover/focus, hoặc ẩn */
    arrows: { type: String, default: 'always' },
    /** Số slide trong 1 khung nhìn (chỉ effect="slide"; cho phép lẻ, vd 1.2) */
    itemsPerView: { type: Number, default: 1 },
    /** Khoảng cách slide khi items-per-view > 1: xs | sm | md | lg | xl | none, số (px) hoặc CSS length */
    gap: { type: String },
    /** Tỉ lệ khung: 16/9, 21/9… Bỏ trống = cao theo slide cao nhất */
    ratio: { type: String },
    /** Chỉ số slide hiện tại (0-based) */
    index: { type: Number, default: 0 },
    /** Ẩn thanh tiến độ tự chạy */
    noProgress: { type: Boolean },
    /** Nhãn ARIA (mặc định theo locale) */
    label: { type: String },
    /** Tắt hiệu ứng chuyển */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    this._slides = [];
    this._current = 0;
    this._trackX = 0;
    this._loopOffset = 1;
    this._anim = null;
    this._animDone = null;
    this._paused = { hover: false, focus: false };
    this._userPaused = false;
    this._elapsed = 0;
    this._raf = 0;
    this._drag = null;
    this._kb = null;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    const id = `hui-carousel-${this._uid}`;
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncSlides());
    this._track = createElement('div', { className: 'track', part: 'track', id: `${id}-track` }, this._slot);
    this._viewport = createElement('div', { className: 'viewport', part: 'viewport', tabindex: '0' }, this._track);

    const btn = (part, icon) => createElement('button', {
      type: 'button', className: `btn btn--${part}`, part, 'aria-controls': `${id}-track`,
    }, createElement('hui-icon', { name: icon }));
    this._prevBtn = btn('prev', 'chevron-left');
    this._nextBtn = btn('next', 'chevron-right');
    this._pauseIcon = createElement('hui-icon', { name: 'pause' });
    this._pauseBtn = createElement('button', { type: 'button', className: 'btn btn--pause', part: 'pause', 'aria-controls': `${id}-track` }, this._pauseIcon);
    this._prevBtn.addEventListener('click', () => this.prev());
    this._nextBtn.addEventListener('click', () => this.next());
    this._pauseBtn.addEventListener('click', () => (this._userPaused ? this.play() : this.pause()));

    this._bar = createElement('div', { className: 'progress__bar', part: 'progress-bar' });
    this._progress = createElement('div', { className: 'progress', part: 'progress', 'aria-hidden': 'true', hidden: true }, this._bar);

    // Nút tạm dừng đứng đầu trong thứ tự Tab (APG)
    this._frame = createElement('div', { className: 'frame', part: 'frame' },
      this._pauseBtn, this._viewport, this._prevBtn, this._nextBtn, this._progress);
    this._nav = createElement('div', { className: 'nav', part: 'nav', role: 'group', hidden: true });
    this._base = createElement('div', {
      className: 'carousel', part: 'base', role: 'region', id,
    }, this._frame, this._nav);

    this._bindPointer();
    this._viewport.addEventListener('dragstart', (e) => e.preventDefault());
    // Đã kéo → chặn click ngay sau đó (tránh mở nhầm link trong slide)
    this._viewport.addEventListener('click', (e) => {
      if (this._suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        this._suppressClick = false;
      }
    }, true);

    this.addEventListener('keydown', (e) => this._onKeydown(e));
    this.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { this._paused.hover = true; this._syncAutoplay(); } });
    this.addEventListener('pointerleave', () => { this._paused.hover = false; this._syncAutoplay(); });
    this.addEventListener('focusin', () => { this._paused.focus = true; this._syncAutoplay(); });
    this.addEventListener('focusout', (e) => {
      if (this.contains(e.relatedTarget) || this.shadowRoot.contains(e.relatedTarget)) return;
      this._paused.focus = false;
      this._syncAutoplay();
    });

    return this._base;
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback();
    this.listen(document, 'visibilitychange', () => this._syncAutoplay());
    if (typeof ResizeObserver === 'function') {
      // Chỉ đặt lại khi bề rộng đổi thật (lần gọi đầu của observer không được cắt ngang animation)
      this._ro = new ResizeObserver(() => {
        const w = this._viewport.clientWidth;
        if (w === this._lastWidth) return;
        this._lastWidth = w;
        this._reposition();
      });
      this._ro.observe(this._viewport);
    }
    if (reconnect) this._syncSlides();
    this._syncAutoplay();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._ro = null;
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._settle();
    this._kb?.cancel();
    this._kb = null;
    this._kbKey = null;
  }

  firstUpdated() {
    // Người dùng giảm chuyển động → không tự chạy (vẫn bấm nút để chạy được)
    if (prefersReducedMotion()) this._userPaused = true;
    this._mounted = true;
    this._syncAutoplay();
  }

  updated(changed) {
    if (['effect', 'itemsPerView', 'gap', 'ratio', 'noAnimation', 'loop'].some((k) => changed.has(k))) this._applyLayout();

    if (changed.has('arrows')) {
      const mode = ARROWS.includes(this.arrows) ? this.arrows : 'always';
      for (const m of ARROWS) this._base.classList.toggle(`carousel--arrows-${m}`, m === mode);
    }

    if (changed.has('label') || changed.has('locale')) {
      this._base.setAttribute('aria-roledescription', tx('carousel.roleDescription'));
      this._base.setAttribute('aria-label', this.label || tx('carousel.label'));
      this._prevBtn.setAttribute('aria-label', tx('carousel.prev'));
      this._nextBtn.setAttribute('aria-label', tx('carousel.next'));
      this._nav.setAttribute('aria-label', tx('carousel.nav'));
    }

    if (['indicator', 'locale', 'loop', 'itemsPerView', 'effect'].some((k) => changed.has(k))) this._renderNav();
    if (changed.has('locale')) this._labelSlides();
    if (['autoplay', 'noProgress', 'locale'].some((k) => changed.has(k))) this._syncAutoplay();

    if (changed.has('index') && this._slides.length) {
      const i = Math.round(Number(this.index) || 0);
      if (i !== this._current) this._go(i, { animate: Boolean(this._mounted) });
    }
  }

  // =====================================================
  // API
  // =====================================================

  /** Chỉ số slide hiện tại (chỉ đọc) */
  get currentIndex() {
    return this._current;
  }

  /** Số slide (chỉ đọc) */
  get slideCount() {
    return this._slides.length;
  }

  /** Đang tự chạy (chưa bị người dùng tạm dừng) — chỉ đọc */
  get playing() {
    return this._autoplayMs > 0 && !this._userPaused;
  }

  next() {
    this._step(1);
  }

  prev() {
    this._step(-1);
  }

  /** Tới slide i (loop → đi đường ngắn nhất) */
  goTo(i) {
    this._go(i, { animate: true });
  }

  /** Bật tự chạy (bỏ trạng thái tạm dừng do người dùng) */
  play() {
    this._userPaused = false;
    this._syncAutoplay();
  }

  /** Tạm dừng tự chạy cho tới khi gọi play() / bấm nút */
  pause() {
    this._userPaused = true;
    this._syncAutoplay();
  }

  // =====================================================
  // BỐ CỤC
  // =====================================================

  get _effect() {
    return EFFECTS.includes(this.effect) ? this.effect : 'slide';
  }

  /** Số slide mỗi khung nhìn (fade/zoom luôn 1) */
  get _perView() {
    if (this._effect !== 'slide') return 1;
    const n = Number(this.itemsPerView);
    return n > 0 ? Math.min(n, Math.max(1, this._slides.length)) : 1;
  }

  get _maxIndex() {
    const n = this._slides.length;
    if (this.loop || this._effect !== 'slide') return Math.max(0, n - 1);
    return Math.max(0, n - Math.floor(this._perView));
  }

  get _noMotion() {
    return this.noAnimation || animationsDisabled();
  }

  _duration() {
    const raw = getComputedStyle(this._base).getPropertyValue('--hui-carousel-duration').trim();
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return 500;
    return raw.endsWith('ms') ? v : raw.endsWith('s') ? v * 1000 : v;
  }

  _applyLayout() {
    const effect = this._effect;
    const cl = this._base.classList;
    for (const e of EFFECTS) cl.toggle(`carousel--${e}`, e === effect);
    cl.toggle('carousel--static', this.noAnimation);
    const style = this._base.style;
    style.setProperty('--_carousel-n', String(this._perView));
    const gap = toLength(this.gap);
    if (gap) style.setProperty('--_carousel-gap', gap);
    else style.removeProperty('--_carousel-gap');
    const ratio = toAspectRatio(this.ratio);
    if (ratio) style.setProperty('--_carousel-ratio', ratio);
    else style.removeProperty('--_carousel-ratio');
    cl.toggle('carousel--ratio', Boolean(ratio));
    this._current = clamp(this._current, 0, this._maxIndex);
    this._reposition();
    this._syncState();
  }

  /** Bước dịch chuyển 1 slide (px) = (bề rộng track + gap) / items-per-view */
  _stepPx() {
    const w = this._track.clientWidth;
    const gap = parseFloat(getComputedStyle(this._track).columnGap) || 0;
    return (w + gap) / this._perView;
  }

  /** Vị trí track (px, dương) của slide i khi không loop — kẹp để slide cuối thẳng mép phải */
  _clampPx(i) {
    const step = this._stepPx();
    const max = Math.max(0, (this._slides.length - this._perView) * step);
    return clamp(i * step, 0, max);
  }

  /** Vị trí "đặt sẵn" của slide hiện tại trong vòng loop khi đi d bước (đủ hàng xóm để không lộ khoảng trống) */
  _offsetFor(d) {
    const n = this._slides.length;
    if (d < 0) return -d;
    return 1 + d + Math.ceil(this._perView) <= n ? 1 : 0;
  }

  /** Loop: xếp thứ tự slide sao cho `cur` đứng ở vị trí `o`, track đặt ngay tại đó (không animation) */
  _arrange(cur, o) {
    const n = this._slides.length;
    this._slides.forEach((s, i) => { s.style.order = String(mod(i - cur + o, n)); });
    this._loopOffset = o;
    this._setTrack(-o * this._stepPx());
  }

  _setTrack(x) {
    this._trackX = x;
    this._track.style.transform = x ? `translate3d(${x}px, 0, 0)` : '';
  }

  /** Đặt lại vị trí tức thì (đổi kích thước, đổi effect, đổi slide) */
  _reposition() {
    if (!this._hasRendered) return;
    this._settle();
    const slides = this._slides;
    if (this._effect !== 'slide') {
      slides.forEach((s) => s.style.removeProperty('order'));
      this._setTrack(0);
      return;
    }
    if (this.loop && slides.length > 1) this._arrange(this._current, 1);
    else {
      slides.forEach((s) => s.style.removeProperty('order'));
      this._setTrack(-this._clampPx(this._current));
    }
  }

  /** Kết thúc ngay animation track đang chạy (trước khi bắt đầu chuyển mới / kéo) */
  _settle() {
    const a = this._anim;
    if (!a) return;
    this._anim = null;
    a.cancel();
    const done = this._animDone;
    this._animDone = null;
    done?.();
  }

  _animateTrack(fromX, toX, animate, done) {
    this._setTrack(toX);
    if (!animate || this._noMotion || typeof this._track.animate !== 'function' || fromX === toX) {
      done?.();
      return;
    }
    const anim = this._track.animate([
      { transform: `translate3d(${fromX}px, 0, 0)` },
      { transform: `translate3d(${toX}px, 0, 0)` },
    ], { duration: this._duration(), easing: EASE });
    this._anim = anim;
    this._animDone = done;
    anim.finished.then(() => {
      if (this._anim !== anim) return;
      this._anim = null;
      const fn = this._animDone;
      this._animDone = null;
      fn?.();
    }, () => {});
  }

  // =====================================================
  // CHUYỂN SLIDE
  // =====================================================

  _step(dir) {
    const n = this._slides.length;
    if (n < 2) return;
    if (!this.loop && (this._current + dir < 0 || this._current + dir > this._maxIndex)) return;
    this._go(this._current + dir, { animate: true, delta: dir });
  }

  /**
   * @param {number} target
   * @param {{animate?: boolean, delta?: number, dragX?: number}} opts - delta: số bước có dấu (loop),
   *   dragX: độ lệch đang kéo (px) → animation bắt đầu từ chỗ tay thả
   */
  _go(target, { animate = true, delta, dragX = 0 } = {}) {
    const n = this._slides.length;
    if (!n) return;
    const to = this.loop ? mod(Math.round(target), n) : clamp(Math.round(target), 0, this._maxIndex);
    const from = this._current;
    if (to === from) {
      if (dragX) this._snapBack(dragX);
      return;
    }
    this._settle();
    this._current = to;

    if (this._effect === 'slide') {
      if (this.loop && n > 1) {
        let d = delta ?? mod(to - from, n);
        if (delta === undefined && d > n / 2) d -= n;
        const o = this._offsetFor(d);
        if (o + Math.max(d, 0) + Math.ceil(this._perView) > n || -d > n - Math.ceil(this._perView)) {
          // Không đủ slide để trượt liền mạch (nhảy xa khi items-per-view lớn) → đặt thẳng
          this._arrange(to, 1);
        } else {
          this._arrange(from, o);
          const fromX = this._trackX + dragX;
          this._animateTrack(fromX, -(o + d) * this._stepPx(), animate, () => this._arrange(this._current, 1));
        }
      } else {
        this._animateTrack(this._trackX + dragX, -this._clampPx(to), animate);
      }
    }

    this._afterChange(from, animate);
  }

  _snapBack(dragX) {
    this._animateTrack(this._trackX + dragX, this._trackX, true);
  }

  _afterChange(from, animate) {
    this._elapsed = 0;
    this._syncState(animate);
    this._loadAround(this._current);
    // Đồng bộ property index (updated() thấy index === _current nên không chạy lại)
    this.index = this._current;
    this.emit('hui-slide-change', { index: this._current, previous: from });
  }

  // =====================================================
  // SLIDE + ARIA
  // =====================================================

  _syncSlides() {
    const prev = this._slides;
    this._slides = this._slot.assignedElements().filter((el) => !SKIP_TAGS.has(el.localName));
    prev.filter((s) => !this._slides.includes(s)).forEach((s) => {
      s.style.removeProperty('order');
      s.removeAttribute('data-hui-active');
    });
    const wanted = Math.round(Number(this.index) || 0);
    this._current = clamp(this.loop ? mod(wanted, Math.max(1, this._slides.length)) : wanted, 0, this._maxIndex);
    this._base.style.setProperty('--_carousel-n', String(this._perView));
    this._labelSlides();
    this._renderNav();
    this._reposition();
    this._syncState(false);
    this._loadAround(this._current);
    this._syncAutoplay();
  }

  /** role="group" + aria-roledescription="slide" + aria-label "i / n" — không đè giá trị người dùng tự đặt */
  _labelSlides() {
    const count = this._slides.length;
    const roleDesc = tx('carousel.slideRole');
    this._slides.forEach((el, i) => {
      let owned = ownedAria.get(el);
      if (!owned) ownedAria.set(el, (owned = {}));
      const apply = (attr, value) => {
        const current = el.getAttribute(attr);
        if (current === null || owned[attr] === current) {
          if (current !== value) el.setAttribute(attr, value);
          owned[attr] = value;
        }
      };
      apply('role', 'group');
      apply('aria-roledescription', roleDesc);
      apply('aria-label', tx('carousel.slide', { index: i + 1, count }));
    });
  }

  /** Slide i có nằm trong khung nhìn không */
  _isVisible(i) {
    const n = this._slides.length;
    const pv = this._perView;
    if (this._effect !== 'slide' || pv <= 1) return i === this._current;
    if (this.loop) return mod(i - this._current, n) < Math.ceil(pv - 0.001);
    const start = this._clampPx(this._current) / (this._stepPx() || 1);
    return i + 1 > start + 0.01 && i < start + pv - 0.01;
  }

  /** Cập nhật slide đang hiện (inert cho slide ẩn), nút, chấm, Ken Burns */
  _syncState(animate = true) {
    const cur = this._current;
    this._slides.forEach((s, i) => {
      const visible = this._isVisible(i);
      s.toggleAttribute('data-hui-active', i === cur);
      if (visible) s.removeAttribute('aria-hidden');
      else s.setAttribute('aria-hidden', 'true');
      s.inert = !visible;
    });

    const n = this._slides.length;
    const single = n < 2;
    this._prevBtn.hidden = single || this.arrows === 'never';
    this._nextBtn.hidden = single || this.arrows === 'never';
    this._prevBtn.disabled = !this.loop && cur <= 0;
    this._nextBtn.disabled = !this.loop && cur >= this._maxIndex;
    this.setState('at-start', !this.loop && cur <= 0);
    this.setState('at-end', !this.loop && cur >= this._maxIndex);

    (this._navButtons || []).forEach((b, i) => {
      const on = i === cur;
      const kind = b.dataset.kind;
      b.setAttribute('part', on ? `${kind} ${kind}-active` : kind);
      b.classList.toggle('is-active', on);
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });

    this._kenBurns(animate);
  }

  /** Dựng chấm / ảnh thu nhỏ — mỗi vị trí dừng một nút */
  _renderNav() {
    if (!this._hasRendered) return;
    const mode = INDICATORS.includes(this.indicator) ? this.indicator : 'dots';
    const stops = this._maxIndex + 1;
    if (mode === 'none' || this._slides.length < 2) {
      this._nav.hidden = true;
      this._nav.replaceChildren();
      this._navButtons = [];
      return;
    }
    const kind = mode === 'thumbnails' ? 'thumb' : 'dot';
    this._nav.className = `nav nav--${kind}s`;
    this._navButtons = Array.from({ length: stops }, (_, i) => {
      const b = createElement('button', {
        type: 'button',
        className: kind,
        part: kind,
        'aria-label': tx('carousel.goTo', { index: i + 1 }),
        'aria-controls': this._track.id,
        dataset: { kind },
      });
      if (kind === 'thumb') {
        const src = this._thumbOf(this._slides[i]);
        if (src) b.append(createElement('img', { src, alt: '', loading: 'lazy', decoding: 'async', draggable: 'false' }));
      }
      b.addEventListener('click', () => this.goTo(i));
      return b;
    });
    this._nav.replaceChildren(...this._navButtons);
    this._nav.hidden = false;
    this._syncState(false);
  }

  _thumbOf(slide) {
    if (!slide) return '';
    if (slide.dataset.thumb) return slide.dataset.thumb;
    const media = slide.matches('img, hui-image') ? slide : slide.querySelector('img, hui-image');
    if (!media) return '';
    return media.dataset.thumb || media.dataset.src || media.getAttribute('src') || '';
  }

  /** Tải ảnh của slide hiện tại + hàng xóm: data-src → src, loading="lazy" → eager */
  _loadAround(cur) {
    const n = this._slides.length;
    if (!n) return;
    const ahead = Math.ceil(this._perView);
    for (let k = -1; k <= ahead; k++) {
      const i = this.loop ? mod(cur + k, n) : cur + k;
      const slide = this._slides[i];
      if (!slide) continue;
      const nodes = [...(slide.matches('[data-src], [data-srcset]') ? [slide] : []), ...slide.querySelectorAll('[data-src], [data-srcset]')];
      for (const el of nodes) {
        if (el.dataset.srcset) {
          el.setAttribute('srcset', el.dataset.srcset);
          delete el.dataset.srcset;
        }
        if (el.dataset.src) {
          el.setAttribute('src', el.dataset.src);
          delete el.dataset.src;
        }
      }
      slide.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
      slide.querySelectorAll('hui-image:not([lazy="false"])').forEach((img) => img.setAttribute('lazy', 'false'));
    }
  }

  /** effect="zoom": ảnh của slide hiện tại phóng chậm (Ken Burns); slide cũ dừng sau khi mờ hẳn */
  _kenBurns(animate) {
    const key = `${this._effect}|${this._current}|${this._noMotion}|${this._slides.length}`;
    if (key === this._kbKey) return;
    this._kbKey = key;
    const old = this._kb;
    this._kb = null;
    if (old) {
      if (animate && !this._noMotion) setTimeout(() => old.cancel(), this._duration() + 50);
      else old.cancel();
    }
    if (this._effect !== 'zoom' || this._noMotion) return;
    const slide = this._slides[this._current];
    if (!slide) return;
    const target = slide.querySelector('[data-ken-burns], img, hui-image, picture, video') || slide;
    if (typeof target.animate !== 'function') return;
    const scale = parseFloat(getComputedStyle(this._base).getPropertyValue('--hui-carousel-kenburns-scale')) || 1.15;
    target.style.transformOrigin = KB_ORIGINS[this._current % KB_ORIGINS.length];
    const duration = (this._autoplayMs || 6000) + this._duration() * 2;
    this._kb = target.animate([{ transform: 'scale(1)' }, { transform: `scale(${scale})` }], {
      duration, easing: 'linear', fill: 'forwards',
    });
    if (!this._isRunning) this._kb.pause();
  }

  // =====================================================
  // TỰ CHẠY
  // =====================================================

  get _autoplayMs() {
    if (this.autoplay > 0) return this.autoplay;
    return this.hasAttribute('autoplay') ? 5000 : 0;
  }

  get _isRunning() {
    return this._autoplayMs > 0 && this.isConnected && !this._userPaused
      && !this._paused.hover && !this._paused.focus && document.visibilityState !== 'hidden'
      && this._slides.length > 1;
  }

  _syncAutoplay() {
    if (!this._hasRendered) return;
    const ms = this._autoplayMs;
    const run = this._isRunning;
    // Nút tạm dừng: luôn có khi có autoplay (APG), nhãn theo lựa chọn của người dùng
    this._pauseBtn.hidden = !ms || this._slides.length < 2;
    this._pauseIcon.setAttribute('name', this._userPaused ? 'play' : 'pause');
    this._pauseBtn.setAttribute('aria-label', tx(this._userPaused ? 'carousel.play' : 'carousel.pause'));
    this._progress.hidden = !ms || this.noProgress || this._slides.length < 2;
    // Đang tự chạy → không đọc từng slide (aria-live off); dừng → đọc khi đổi slide
    this._viewport.setAttribute('aria-live', ms && !this._userPaused ? 'off' : 'polite');
    this.setState('playing', run);
    this._base.classList.toggle('carousel--playing', run);

    if (run) {
      this._kb?.play();
      if (!this._raf) {
        this._last = performance.now();
        this._raf = requestAnimationFrame((t) => this._tick(t));
      }
    } else {
      this._kb?.pause();
      cancelAnimationFrame(this._raf);
      this._raf = 0;
      if (!ms) this._elapsed = 0;
      this._bar.style.transform = `scaleX(${ms ? Math.min(1, this._elapsed / ms) : 0})`;
    }
  }

  _tick(now) {
    const ms = this._autoplayMs;
    this._elapsed += Math.max(0, now - this._last);
    this._last = now;
    if (this._elapsed >= ms) {
      this._elapsed = 0;
      if (!this.loop && this._current >= this._maxIndex) this._go(0, { animate: true });
      else this._step(1);
    }
    this._bar.style.transform = `scaleX(${Math.min(1, this._elapsed / ms)})`;
    this._raf = this._isRunning ? requestAnimationFrame((t) => this._tick(t)) : 0;
  }

  // =====================================================
  // VUỐT / KÉO + BÀN PHÍM
  // =====================================================

  _bindPointer() {
    const vp = this._viewport;
    vp.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (this._slides.length < 2) return;
      this._drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, moving: false, time: performance.now() };
    });
    vp.addEventListener('pointermove', (e) => {
      const d = this._drag;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moving) {
        if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) {
          if (Math.abs(dy) > 10) this._drag = null; // cuộn dọc trang
          return;
        }
        d.moving = true;
        this._settle();
        try { vp.setPointerCapture(e.pointerId); } catch { /* bỏ qua */ }
        this._base.classList.add('is-dragging');
      }
      d.dx = dx;
      if (this._effect !== 'slide') return;
      if (this.loop) {
        // n = 2: hàng xóm nằm phía tay kéo tới
        const o = this._offsetFor(dx < 0 ? 1 : -1);
        if (o !== this._loopOffset) this._arrange(this._current, o);
        this._track.style.transform = `translate3d(${this._trackX + dx}px, 0, 0)`;
      } else {
        // Mép đầu / cuối: kéo nặng tay hơn
        const atEdge = (dx > 0 && this._current <= 0) || (dx < 0 && this._current >= this._maxIndex);
        d.dx = atEdge ? dx * 0.35 : dx;
        this._track.style.transform = `translate3d(${this._trackX + d.dx}px, 0, 0)`;
      }
    });
    const end = (e) => {
      const d = this._drag;
      if (!d || d.id !== e.pointerId) return;
      this._drag = null;
      if (!d.moving) return;
      this._base.classList.remove('is-dragging');
      this._suppressClick = true;
      setTimeout(() => { this._suppressClick = false; }, 0);
      const width = this._stepPx() || this._viewport.clientWidth || 1;
      const fast = Math.abs(d.dx) / Math.max(1, performance.now() - d.time) > 0.4;
      const dir = d.dx < 0 ? 1 : -1;
      const passed = Math.abs(d.dx) > width * 0.2 || (fast && Math.abs(d.dx) > 20);
      const canGo = this.loop || (this._current + dir >= 0 && this._current + dir <= this._maxIndex);
      const dragX = this._effect === 'slide' ? d.dx : 0;
      if (passed && canGo) this._go(this._current + dir, { animate: true, delta: dir, dragX });
      else if (dragX) this._snapBack(dragX);
      this._elapsed = 0;
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
  }

  _onKeydown(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.composedPath()[0];
    if (target?.matches?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
    const actions = {
      ArrowLeft: () => this.prev(),
      ArrowRight: () => this.next(),
      Home: () => this.goTo(0),
      End: () => this.goTo(this._maxIndex),
    };
    const fn = actions[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  }
}

defineElement('hui-carousel', HuiCarousel);

export default HuiCarousel;
