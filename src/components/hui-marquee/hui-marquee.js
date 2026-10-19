/**
 * HUI Marquee — dải chạy vô hạn (logo đối tác, tin nhanh…) theo chiều ngang hoặc dọc (Molecule, A3.5).
 *   <hui-marquee speed="60" pause-on-hover edge-fade>
 *     <img src="logo-1.svg" alt="Đối tác 1"> <img src="logo-2.svg" alt="Đối tác 2">
 *   </hui-marquee>
 * Cách chạy liền mạch: nhân bản các item (bản sao aria-hidden + inert, nằm ở light DOM để CSS trang vẫn áp dụng)
 * cho tới khi phủ kín khung, rồi dịch cả hàng đúng bằng 1 bộ item (+ gap) → vòng lặp không thấy mối nối.
 * Tự dừng khi khung ra khỏi màn hình / tab bị ẩn. Giảm chuyển động hoặc no-animation → hàng tĩnh cuộn tay được.
 */

import styles from './hui-marquee.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { animationsDisabled } from '../../utils/animate.js';

/** Từ khóa khoảng cách — giống hui-scroller */
const GAP_TOKENS = {
  none: '0px',
  xs: 'var(--hui-space-xs)',
  sm: 'var(--hui-space-sm)',
  md: 'var(--hui-space-lg)',
  lg: 'var(--hui-space-xl)',
  xl: 'var(--hui-space-2xl)',
};

function toLength(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (GAP_TOKENS[v]) return GAP_TOKENS[v];
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

const DIRECTIONS = ['left', 'right', 'up', 'down'];
const CLONE_ATTR = 'data-hui-marquee-clone';
const SKIP_TAGS = new Set(['template', 'style', 'script', 'link', 'meta']);
/** Giới hạn số bộ bản sao (item quá nhỏ so với khung) */
const MAX_COPIES = 20;

/**
 * @slot - Các item chạy (phần tử con trực tiếp)
 * @csspart base - Khung ngoài (cắt nội dung, mặt nạ mờ 2 mép)
 * @csspart track - Hàng chuyển động (chứa bộ gốc + bản sao)
 * @csspart group - Bộ item gốc
 * @csspart clones - Vùng chứa bản sao (aria-hidden)
 * @cssprop --hui-marquee-gap - Khoảng cách item khi không có attribute gap (mặc định --hui-space-lg)
 * @cssprop --hui-marquee-fade-size - Độ dài vùng mờ ở 2 mép (edge-fade, mặc định 64px)
 * @cssprop --hui-marquee-height - Chiều cao khung khi chạy dọc (up/down, mặc định 240px)
 * @cssprop --hui-marquee-padding - Đệm trong khung (mặc định 0)
 */
class HuiMarquee extends HuiElement {
  static properties = {
    /** Tốc độ chạy (px mỗi giây) */
    speed: { type: Number, default: 50 },
    /** left | right | up | down — hướng chạy (up/down: dải dọc, cần chiều cao) */
    direction: { type: String, default: 'left' },
    /** Dừng khi rê chuột vào (và khi focus vào item bên trong) */
    pauseOnHover: { type: Boolean },
    /** Dừng chạy (điều khiển bằng JS / nút tạm dừng riêng của trang) */
    paused: { type: Boolean },
    /** Khoảng cách giữa item: xs | sm | md | lg | xl | none, số (px) hoặc CSS length */
    gap: { type: String },
    /** Làm mờ dần 2 mép khung */
    edgeFade: { type: Boolean },
    /** Nhãn ARIA của vùng (có nhãn → role="region") */
    label: { type: String },
    /** Tắt chuyển động: hiện hàng tĩnh, cuộn tay được */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._items = [];
    this._clones = [];
    this._visible = true;
    this._hover = false;
    this._focus = false;
    this._frame = 0;
    this._distance = 0;
    this._copies = 0;
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncItems());
    this._cloneSlot = createElement('slot', { name: '__hui-clone' });
    this._group = createElement('div', { className: 'marquee__group', part: 'group' }, this._slot);
    this._cloneBox = createElement('div', { className: 'marquee__clones', part: 'clones', 'aria-hidden': 'true' }, this._cloneSlot);
    this._track = createElement('div', { className: 'marquee__track', part: 'track' }, this._group, this._cloneBox);
    this._base = createElement('div', { className: 'marquee', part: 'base' }, this._track);

    this.addEventListener('pointerenter', () => { this._hover = true; this._syncPlay(); });
    this.addEventListener('pointerleave', () => { this._hover = false; this._syncPlay(); });
    this.addEventListener('focusin', () => { this._focus = true; this._syncPlay(); });
    this.addEventListener('focusout', (e) => {
      if (this.contains(e.relatedTarget)) return;
      this._focus = false;
      this._syncPlay();
    });
    return this._base;
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback();
    this.listen(document, 'visibilitychange', () => this._syncPlay());
    if (typeof matchMedia === 'function') {
      this.listen(matchMedia('(prefers-reduced-motion: reduce)'), 'change', () => this._rebuild());
    }
    this._stopView = inView(this, (entry) => {
      this._visible = entry.isIntersecting;
      this._syncPlay();
    }, { threshold: 0 });
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._schedule());
      this._ro.observe(this._base);
      this._ro.observe(this._group);
    }
    if (reconnect) this._syncItems();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopView?.();
    this._ro?.disconnect();
    this._ro = null;
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    this._removeClones();
  }

  updated(changed) {
    if (changed.has('direction')) {
      const dir = this._direction;
      for (const d of DIRECTIONS) this._base.classList.toggle(`marquee--${d}`, d === dir);
      this._base.classList.toggle('marquee--vertical', dir === 'up' || dir === 'down');
    }
    if (changed.has('gap')) {
      const gap = toLength(this.gap);
      if (gap) this._base.style.setProperty('--_marquee-gap', gap);
      else this._base.style.removeProperty('--_marquee-gap');
    }
    if (changed.has('edgeFade')) this._base.classList.toggle('marquee--fade', this.edgeFade);
    if (changed.has('label')) {
      if (this.label) {
        this._base.setAttribute('role', 'region');
        this._base.setAttribute('aria-label', this.label);
      } else {
        this._base.removeAttribute('role');
        this._base.removeAttribute('aria-label');
      }
    }
    if (changed.has('noAnimation')) this._rebuild();
    else if (['direction', 'gap'].some((k) => changed.has(k))) this._schedule();
    if (changed.has('speed')) this._applyDuration();
    if (['paused', 'pauseOnHover'].some((k) => changed.has(k))) this._syncPlay();
  }

  // =====================================================
  // API
  // =====================================================

  /** Đang chuyển động thật sự (không bị dừng vì hover / ẩn / paused / giảm chuyển động) — chỉ đọc */
  get running() {
    return this._running === true;
  }

  /** Đo lại và dựng lại bản sao (gọi khi tự đổi kích thước item bằng code) */
  refresh() {
    this._rebuild();
  }

  // =====================================================
  // NỘI BỘ
  // =====================================================

  get _direction() {
    return DIRECTIONS.includes(this.direction) ? this.direction : 'left';
  }

  get _static() {
    return this.noAnimation || animationsDisabled();
  }

  _syncItems() {
    this._items = this._slot.assignedElements().filter((el) => !SKIP_TAGS.has(el.localName) && !el.hasAttribute(CLONE_ATTR));
    this._rebuild();
  }

  _removeClones() {
    for (const c of this._clones) c.remove();
    this._clones = [];
    this._copies = 0;
  }

  _rebuild() {
    if (!this._hasRendered) return;
    this._removeClones();
    this._base.classList.toggle('marquee--static', this._static);
    this.setState('static', this._static);
    // Hàng tĩnh cuộn được → cho bàn phím focus để cuộn bằng phím mũi tên
    if (this._static) this._base.setAttribute('tabindex', '0');
    else this._base.removeAttribute('tabindex');
    this._schedule();
  }

  _schedule() {
    if (this._frame || !this.isConnected) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = 0;
      this._measure();
    });
  }

  /**
   * Đo bộ gốc → tính quãng dịch (1 bộ + gap) và số bộ bản sao cần để phủ kín khung.
   * Thiếu bản sao thì thêm, thừa thì bớt (không dựng lại toàn bộ mỗi lần resize).
   */
  _measure() {
    if (this._static || !this._items.length) {
      this._removeClones();
      this._distance = 0;
      this._syncPlay();
      return;
    }
    const vertical = this._direction === 'up' || this._direction === 'down';
    const groupSize = vertical ? this._group.offsetHeight : this._group.offsetWidth;
    const viewSize = vertical ? this._base.clientHeight : this._base.clientWidth;
    const gap = parseFloat(getComputedStyle(this._track)[vertical ? 'rowGap' : 'columnGap']) || 0;
    const set = groupSize + gap;
    if (set <= 0) return;

    const copies = Math.min(MAX_COPIES, Math.max(1, Math.ceil(viewSize / set)));
    if (copies !== this._copies) {
      this._removeClones();
      const frag = document.createDocumentFragment();
      for (let i = 0; i < copies; i++) {
        for (const item of this._items) {
          const clone = item.cloneNode(true);
          clone.setAttribute(CLONE_ATTR, '');
          clone.setAttribute('slot', '__hui-clone');
          clone.setAttribute('aria-hidden', 'true');
          clone.inert = true;
          // Tránh trùng id trong trang
          clone.removeAttribute('id');
          clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
          this._clones.push(clone);
          frag.append(clone);
        }
      }
      this.append(frag);
      this._copies = copies;
    }
    if (Math.abs(set - this._distance) > 0.5) {
      this._distance = set;
      this._base.style.setProperty('--_marquee-distance', `${-set}px`);
      this._applyDuration();
    }
    this._syncPlay();
  }

  _applyDuration() {
    const speed = this.speed > 0 ? this.speed : 50;
    if (this._distance > 0) this._base.style.setProperty('--_marquee-duration', `${(this._distance / speed).toFixed(3)}s`);
  }

  _syncPlay() {
    if (!this._hasRendered) return;
    const pausedBy = this.paused || (this.pauseOnHover && (this._hover || this._focus))
      || !this._visible || document.visibilityState === 'hidden';
    const running = !this._static && this._distance > 0 && !pausedBy;
    this._running = running;
    this._base.classList.toggle('marquee--running', !this._static && this._distance > 0);
    this._base.classList.toggle('marquee--paused', !running);
    this.setState('paused', !running);
  }
}

defineElement('hui-marquee', HuiMarquee);

export default HuiMarquee;
