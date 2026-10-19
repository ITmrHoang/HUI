/**
 * HUI Scroll Steps — Khung cuộn từng bước, mỗi bước full chiều cao (fullpage, kiểu fullPage.js)
 * Lõi là CSS scroll-snap (mandatory) → nhẹ, cuộn/vuốt tự nhiên; `wheel-step` (tùy chọn) = mỗi lần lăn đúng 1 bước.
 * Chấm điều hướng + nhãn, bộ đếm "2 / 5", nút Trước/Sau, thanh tiến độ, bàn phím, đồng bộ #hash.
 * Con là <hui-step-section> (hoặc phần tử bất kỳ). Biến CSS: xem đầu hui-scroll-steps.css.
 */

import styles from './hui-scroll-steps.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { onScroll, scrollToPosition } from '../../utils/scroll.js';
import '../hui-icon/hui-icon.js';
import './hui-step-section.js';

/** Chuỗi dự phòng khi locale.js chưa có key scrollSteps.* */
const FALLBACK = {
  vi: { label: 'Nội dung theo bước', nav: 'Điều hướng các bước', step: 'Bước {index}', prev: 'Bước trước', next: 'Bước sau', counter: 'Bước {index} / {count}' },
  en: { label: 'Step content', nav: 'Step navigation', step: 'Step {index}', prev: 'Previous step', next: 'Next step', counter: 'Step {index} of {count}' },
};

function tr(key, vars) {
  const path = `scrollSteps.${key}`;
  let value = t(path, vars);
  if (value === path) {
    value = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? key;
    if (vars) value = value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }
  return value;
}

const ACTIVE_RATIO = 0.6;
const WHEEL_LOCK = 700; // ms khóa sau mỗi bước của wheel-step
const WHEEL_GAP = 200; // ms im lặng = kết thúc một cử chỉ lăn
const WHEEL_THRESHOLD = 40; // px tích lũy tối thiểu để tính là một lần lăn

/** Phần tử nhận phím Space/Enter riêng → không chiếm phím của nó */
const isInteractive = (el) =>
  el instanceof Element && (el.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY|VIDEO|AUDIO)$/.test(el.tagName) ||
    /^(textbox|combobox|slider|spinbutton|listbox|menu|button|link)$/.test(el.getAttribute('role') || ''));
const isEditable = (el) =>
  el instanceof Element && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) ||
    /^(textbox|combobox|slider|spinbutton)$/.test(el.getAttribute('role') || ''));

/**
 * @fires hui-step-change - Đổi bước. detail: { index, id, direction: 'forward' | 'backward', previous }
 * @slot - Các bước (<hui-step-section> hoặc phần tử bất kỳ), mỗi con = 1 bước full chiều cao
 * @csspart base - Khung ngoài
 * @csspart viewport - Vùng cuộn chứa các bước (scroll-snap)
 * @csspart nav - Thanh chấm điều hướng (<nav>)
 * @csspart dot - Nút chấm của từng bước (thêm part dot-active khi đang xem)
 * @csspart dot-label - Nhãn cạnh chấm
 * @csspart controls - Cụm nút Trước/Sau + bộ đếm
 * @csspart counter - Bộ đếm "2 / 5"
 * @csspart prev - Nút bước trước
 * @csspart next - Nút bước sau
 * @csspart progress - Rãnh thanh tiến độ
 * @csspart progress-bar - Phần đã cuộn của thanh tiến độ
 * @cssprop --hui-scroll-steps-height - Chiều cao khi container="self" (mặc định 100dvh; attribute height ưu tiên hơn)
 * @cssprop --hui-scroll-steps-nav-offset - Khoảng cách thanh chấm tới mép (mặc định 24px)
 * @cssprop --hui-scroll-steps-nav-gap - Khoảng cách giữa các chấm
 * @cssprop --hui-scroll-steps-dot-size - Đường kính chấm (8px)
 * @cssprop --hui-scroll-steps-dot-color - Màu chấm thường
 * @cssprop --hui-scroll-steps-dot-active-color - Màu chấm đang xem
 * @cssprop --hui-scroll-steps-label-bg - Nền nhãn cạnh chấm
 * @cssprop --hui-scroll-steps-label-color - Chữ nhãn cạnh chấm
 * @cssprop --hui-scroll-steps-control-size - Kích thước nút Trước/Sau (36px)
 * @cssprop --hui-scroll-steps-control-bg - Nền nút Trước/Sau và bộ đếm
 * @cssprop --hui-scroll-steps-control-color - Màu icon / chữ cụm điều khiển
 * @cssprop --hui-scroll-steps-progress-height - Độ dày thanh tiến độ (3px)
 * @cssprop --hui-scroll-steps-progress-color - Màu thanh tiến độ
 * @cssprop --hui-scroll-steps-focus-color - Viền focus
 */
class HuiScrollSteps extends HuiElement {
  static properties = {
    /** self | window — self: chính component là vùng cuộn cao cố định; window: các bước snap theo cuộn trang */
    container: { type: String, default: 'self' },
    /** vertical | horizontal — horizontal: các bước nằm ngang (luôn cuộn trong chính component) */
    direction: { type: String, default: 'vertical' },
    /** Chiều cao khi container="self": số (px) hoặc độ dài CSS; mặc định 100dvh */
    height: { type: String },
    /** mandatory | proximity — độ "hút" của scroll-snap (window có nội dung khác trên trang nên cân nhắc proximity) */
    snap: { type: String, default: 'mandatory' },
    /** Mỗi lần lăn chuột = đúng 1 bước (khóa trong lúc chuyển); cảm ứng vẫn vuốt tự nhiên */
    wheelStep: { type: Boolean },
    /** left | right | bottom | none — vị trí thanh chấm điều hướng */
    nav: { type: String, default: 'right' },
    /** Luôn hiện nhãn cạnh chấm (mặc định chỉ hiện khi hover/focus) */
    navLabels: { type: Boolean },
    /** Hiện bộ đếm "2 / 5" */
    counter: { type: Boolean },
    /** Hiện nút Trước/Sau */
    arrows: { type: Boolean },
    /** Thanh tiến độ mảnh ở mép trên (theo vị trí cuộn) */
    progress: { type: Boolean },
    /** Đồng bộ #id của bước lên URL: có mặt = replaceState; "push" = pushState (nút Back quay lại bước trước) */
    hash: { type: String },
    /** Tắt cuộn mượt và hiệu ứng vào của các bước */
    noAnimation: { type: Boolean },
  };

  static styles = styles;
  static localized = true;

  constructor() {
    super();
    this._sections = [];
    this._dots = [];
    this._current = -1;
    this._ready = false;
    this._io = null;
    this._hostIo = null;
    this._mo = null;
    this._setupAbort = null;
    this._stopScroll = null;
    this._locked = false;
    this._lockTimer = 0;
    this._release = null;
    this._visible = new Map(); // section → tỉ lệ hiển thị gần nhất
    this._wheel = { last: 0, used: false, acc: 0, until: 0, prevAbs: 0 };
    this._rootSnapPrev = null;
    this._inView = false;
  }

  // =====================================================
  // RENDER
  // =====================================================

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._collect());
    this._viewport = createElement('div', { className: 'steps__viewport', part: 'viewport', role: 'region' }, this._slot);

    this._navList = createElement('div', { className: 'steps__dots' });
    this._nav = createElement('nav', { className: 'steps__nav', part: 'nav' }, this._navList);

    this._prevIcon = createElement('hui-icon', { name: 'chevron-up', 'aria-hidden': 'true' });
    this._nextIcon = createElement('hui-icon', { name: 'chevron-down', 'aria-hidden': 'true' });
    this._prev = createElement('button', { type: 'button', className: 'steps__btn', part: 'prev' }, this._prevIcon);
    this._next = createElement('button', { type: 'button', className: 'steps__btn', part: 'next' }, this._nextIcon);
    this._counter = createElement('span', { className: 'steps__counter', part: 'counter', 'aria-live': 'polite' });
    this._controls = createElement('div', { className: 'steps__controls', part: 'controls' }, this._prev, this._counter, this._next);
    this._prev.addEventListener('click', () => this.prev());
    this._next.addEventListener('click', () => this.next());

    this._bar = createElement('div', { className: 'steps__progress-bar', part: 'progress-bar' });
    this._progress = createElement('div', { className: 'steps__progress', part: 'progress', 'aria-hidden': 'true' }, this._bar);

    this._base = createElement('div', { className: 'steps', part: 'base' },
      this._viewport, this._progress, this._nav, this._controls);

    this.addEventListener('keydown', (e) => this._onKeydown(e, false));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._setup();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._teardown();
  }

  updated(changed) {
    if (changed.has('height')) {
      const v = this.height;
      const h = v ? (/^\d+(\.\d+)?$/.test(v) ? `${v}px` : v) : null;
      if (h) this.style.setProperty('--_steps-height', h);
      else this.style.removeProperty('--_steps-height');
    }

    if (changed.has('direction')) {
      const horizontal = this.direction === 'horizontal';
      this._prevIcon.setAttribute('name', horizontal ? 'chevron-left' : 'chevron-up');
      this._nextIcon.setAttribute('name', horizontal ? 'chevron-right' : 'chevron-down');
    }

    if (changed.has('nav')) this._nav.hidden = this.nav === 'none';
    if (changed.has('progress')) this._progress.hidden = !this.progress;
    if (changed.has('counter') || changed.has('arrows')) {
      this._counter.hidden = !this.counter;
      this._prev.hidden = !this.arrows;
      this._next.hidden = !this.arrows;
      this._controls.hidden = !this.counter && !this.arrows;
    }

    if (changed.has('locale')) {
      this._nav.setAttribute('aria-label', tr('nav'));
      this._prev.setAttribute('aria-label', tr('prev'));
      this._next.setAttribute('aria-label', tr('next'));
    }
    if (changed.has('locale') || changed.has('container') || changed.has('direction')) {
      this._viewport.setAttribute('aria-label', this.getAttribute('aria-label') || tr('label'));
      // Chỉ vùng cuộn thật (self) mới cần nhận focus để dùng bàn phím
      if (this._mode === 'self') this._viewport.setAttribute('tabindex', '0');
      else this._viewport.removeAttribute('tabindex');
      this._base.classList.toggle('steps--window', this._mode === 'window');
    }

    if (changed.has('locale') && this._sections.length) this._labelSections();

    // Đổi cách cuộn sau khi đã gắn → gắn lại observer / listener
    if (this._ready && ['container', 'direction', 'wheelStep', 'hash', 'progress', 'snap'].some((k) => changed.has(k))) {
      this._setup();
    }
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  /** Chỉ số bước đang xem (0-based), -1 khi chưa có bước nào */
  get current() {
    return this._current;
  }

  /** Số bước */
  get count() {
    return this._sections.length;
  }

  /**
   * Tới bước theo chỉ số hoặc id.
   * @param {number|string} target
   * @param {{smooth?: boolean}} [options] - smooth mặc định true (trừ no-animation / giảm chuyển động)
   * @returns {boolean} false khi không tìm thấy bước
   */
  goTo(target, { smooth, _source = 'api' } = {}) {
    const index = this._resolve(target);
    if (index < 0) return false;
    const el = this._sections[index];
    const scroller = this._scroller;
    const horizontal = this.direction === 'horizontal';

    // Vị trí đích tính từ khung hình (offsetTop không dùng được với phần tử slot qua shadow)
    const rect = el.getBoundingClientRect();
    let top;
    let left;
    if (this._mode === 'window') {
      top = window.scrollY + rect.top;
    } else {
      const box = this._viewport.getBoundingClientRect();
      if (horizontal) left = this._viewport.scrollLeft + rect.left - box.left;
      else top = this._viewport.scrollTop + rect.top - box.top;
    }

    // Khóa nhận diện theo IntersectionObserver trong lúc cuộn mượt → không phát sự kiện cho các bước đi ngang qua
    this._lock(scroller, smooth !== false && !this.noAnimation);
    scrollToPosition(scroller, { top, left, smooth: smooth ?? !this.noAnimation });
    this._setActive(index, _source);
    return true;
  }

  /** Bước kế tiếp; false khi đã ở bước cuối */
  next(options) {
    if (this._current >= this._sections.length - 1) return false;
    return this.goTo(this._current + 1, options);
  }

  /** Bước trước; false khi đã ở bước đầu */
  prev(options) {
    if (this._current <= 0) return false;
    return this.goTo(this._current - 1, options);
  }

  // =====================================================
  // THIẾT LẬP / GỠ
  // =====================================================

  /** window chỉ áp cho chiều dọc; ngang luôn cuộn trong chính component */
  get _mode() {
    return this.container === 'window' && this.direction !== 'horizontal' ? 'window' : 'self';
  }

  get _scroller() {
    return this._mode === 'window' ? window : this._viewport;
  }

  _setup() {
    this._teardown();
    if (!this.isConnected) return;
    this._ready = true;
    this._setupAbort = new AbortController();
    const signal = this._setupAbort.signal;
    const win = this._mode === 'window';

    if (win) {
      // Snap theo trang: gắn scroll-snap-type lên vùng cuộn gốc, trả lại giá trị cũ khi gỡ
      const root = document.scrollingElement || document.documentElement;
      this._rootSnapPrev = root.style.scrollSnapType;
      root.style.scrollSnapType = `y ${this.snap === 'proximity' ? 'proximity' : 'mandatory'}`;
      document.addEventListener('keydown', (e) => this._onKeydown(e, true), { signal });
      // Thanh chấm / tiến độ (position: fixed) chỉ hiện khi component đang trong màn hình
      if (typeof IntersectionObserver === 'function') {
        this._hostIo = new IntersectionObserver(([entry]) => {
          this._inView = entry.isIntersecting;
          this.setState('in-view', this._inView);
          this._base.classList.toggle('steps--in-view', this._inView);
        });
        this._hostIo.observe(this);
      }
    }

    // Ngang: lăn chuột dọc luôn được đổi thành bước (không thì chuột không cuộn ngang được)
    if (this.wheelStep || this.direction === 'horizontal') {
      (win ? window : this._viewport).addEventListener('wheel', (e) => this._onWheel(e), { passive: false, signal });
    }

    if (this.hash !== null) {
      const apply = () => this._applyHash(true);
      window.addEventListener('hashchange', apply, { signal });
      window.addEventListener('popstate', apply, { signal });
    }

    if (this.progress) {
      this._stopScroll = onScroll(this._scroller, (info) => {
        let p;
        if (win) {
          const rect = this.getBoundingClientRect();
          const range = rect.height - window.innerHeight;
          p = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
        } else {
          p = this.direction === 'horizontal' ? info.progressX : info.progress;
        }
        this._bar.style.transform = `scaleX(${p})`;
      });
    }

    this._observe();
    this._collect();
  }

  _teardown() {
    this._setupAbort?.abort();
    this._setupAbort = null;
    this._io?.disconnect();
    this._io = null;
    this._hostIo?.disconnect();
    this._hostIo = null;
    this._stopScroll?.();
    this._stopScroll = null;
    this._mo?.disconnect();
    this._mo = null;
    this._unlock();
    if (this._rootSnapPrev !== null) {
      const root = document.scrollingElement || document.documentElement;
      root.style.scrollSnapType = this._rootSnapPrev;
      this._rootSnapPrev = null;
    }
  }

  // =====================================================
  // CÁC BƯỚC
  // =====================================================

  /** Gom các bước từ slot, gắn nhãn ARIA, dựng chấm điều hướng, theo dõi lại */
  _collect() {
    if (!this._ready) return;
    this._sections = this._slot.assignedElements();
    if (this.hash !== null) {
      this._sections.forEach((el, i) => { if (!el.id) el.id = `step-${i + 1}`; });
    }

    this._labelSections();
    this._buildDots();

    // Theo dõi IO + đổi nhãn khi `label` của bước thay đổi
    this._io?.disconnect();
    this._visible.clear();
    this._sections.forEach((el) => this._io?.observe(el));
    this._mo?.disconnect();
    if (typeof MutationObserver === 'function') {
      this._mo = new MutationObserver(() => { this._labelSections(); this._buildDots(); });
      this._sections.forEach((el) => this._mo.observe(el, { attributes: true, attributeFilter: ['label', 'theme'] }));
    }

    const count = this._sections.length;
    if (!count) {
      this._current = -1;
      this._syncUi();
      return;
    }

    // Lần đầu: bước theo #hash trên URL (nếu có), không thì bước 0 — không phát sự kiện.
    // Danh sách bước đổi về sau: giữ bước hiện tại (cắt về bước cuối nếu bị xóa bớt).
    const first = this._current < 0;
    const fromHash = first && this.hash !== null ? this._indexFromHash() : -1;
    const index = first ? Math.max(0, fromHash) : Math.min(this._current, count - 1);
    this._current = -1;
    this._setActive(index, 'init');
    if (index > 0 && first) {
      // Chờ layout xong rồi nhảy thẳng tới bước (goTo không phát sự kiện vì bước đã là current)
      requestAnimationFrame(() => this.goTo(index, { smooth: false, _source: 'hash' }));
    }
  }

  _labelSections() {
    const n = this._sections.length;
    this._sections.forEach((el, i) => {
      if (!el.hasAttribute('role')) el.setAttribute('role', 'group');
      // Tôn trọng aria-label người dùng tự đặt (không có dấu tự sinh)
      if (el.hasAttribute('aria-label') && !el.hasAttribute('data-hui-step-label')) return;
      el.setAttribute('aria-label', `${this._labelOf(el, i)} (${i + 1}/${n})`);
      el.setAttribute('data-hui-step-label', '');
    });
  }

  _labelOf(el, i) {
    return el.getAttribute('label') || el.dataset.label || tr('step', { index: i + 1 });
  }

  _buildDots() {
    this._navList.replaceChildren();
    this._dots = this._sections.map((el, i) => {
      const label = this._labelOf(el, i);
      const dot = createElement('button', { type: 'button', className: 'steps__dot', part: 'dot', 'aria-label': label },
        createElement('span', { className: 'steps__dot-mark', 'aria-hidden': 'true' }),
        createElement('span', { className: 'steps__dot-label', part: 'dot-label', 'aria-hidden': 'true' }, label));
      dot.addEventListener('click', () => this.goTo(i));
      this._navList.append(dot);
      return dot;
    });
    this._syncUi();
  }

  /** Đổi bước đang xem: attribute/state trên bước, chấm, bộ đếm, sự kiện, #hash */
  _setActive(index, source) {
    if (index === this._current || index < 0 || index >= this._sections.length) return;
    const previous = this._current;
    this._current = index;
    this._sections.forEach((el, i) => el.toggleAttribute('active', i === index));
    this._syncUi();

    if (source === 'init') return;
    const el = this._sections[index];
    const id = el.id || `step-${index + 1}`;
    this.emit('hui-step-change', { index, id, direction: index > previous ? 'forward' : 'backward', previous });

    // URL đổi theo bước (không ghi lại khi chính URL vừa điều khiển việc đổi bước)
    if (this.hash !== null && source !== 'hash' && el.id && decodeURIComponent(location.hash.slice(1)) !== el.id) {
      const url = `#${encodeURIComponent(el.id)}`;
      if (this.hash === 'push') history.pushState(history.state, '', url);
      else history.replaceState(history.state, '', url);
    }
  }

  _syncUi() {
    const n = this._sections.length;
    const i = this._current;
    this._dots.forEach((dot, k) => {
      const on = k === i;
      dot.setAttribute('part', on ? 'dot dot-active' : 'dot');
      dot.classList.toggle('steps__dot--active', on);
      if (on) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    this._counter.textContent = n ? `${i + 1} / ${n}` : '';
    this._counter.setAttribute('aria-label', n ? tr('counter', { index: i + 1, count: n }) : '');
    this._prev.disabled = i <= 0;
    this._next.disabled = i < 0 || i >= n - 1;
    // Bước tối → chấm/nút đổi tông sáng cho dễ nhìn
    const theme = this._sections[i]?.getAttribute('theme') || this._sections[i]?.getAttribute('data-theme');
    this._base.classList.toggle('steps--on-dark', theme === 'dark');
  }

  _resolve(target) {
    if (typeof target === 'string' && !/^\d+$/.test(target)) {
      const id = target.replace(/^#/, '');
      return this._sections.findIndex((el) => el.id === id);
    }
    const i = Math.trunc(Number(target));
    return Number.isFinite(i) && i >= 0 && i < this._sections.length ? i : -1;
  }

  // =====================================================
  // NHẬN DIỆN BƯỚC ĐANG XEM
  // =====================================================

  /**
   * IntersectionObserver (ngưỡng 0 và 0.6): bước nào hiện ≥ 60% khung → là bước đang xem.
   * Root = viewport (self) hoặc màn hình (window). Ngưỡng 0 để biết bước đã ra hẳn khỏi khung
   * (reset hiệu ứng khi animate-once="false"). Trong lúc goTo() cuộn mượt thì bỏ qua (xem _lock).
   */
  _observe() {
    if (typeof IntersectionObserver !== 'function') return;
    this._io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        this._visible.set(entry.target, entry.intersectionRatio);
        if (!entry.isIntersecting) entry.target.resetAnimation?.();
      }
      if (this._locked) return;
      this._pickVisible();
    }, { root: this._mode === 'window' ? null : this._viewport, threshold: [0, ACTIVE_RATIO] });
  }

  _pickVisible() {
    let best = -1;
    let bestRatio = ACTIVE_RATIO - 0.01;
    this._sections.forEach((el, i) => {
      const r = this._visible.get(el) ?? 0;
      if (r > bestRatio) { best = i; bestRatio = r; }
    });
    if (best >= 0) this._setActive(best, 'scroll');
  }

  /** Đo trực tiếp (dùng khi vừa mở khóa — IO có thể chưa báo lại nếu tỉ lệ không vượt ngưỡng) */
  _syncFromGeometry() {
    const box = this._mode === 'window'
      ? { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth }
      : this._viewport.getBoundingClientRect();
    const horizontal = this.direction === 'horizontal';
    let best = -1;
    let bestRatio = 0.5;
    this._sections.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const size = horizontal ? r.width : r.height;
      if (!size) return;
      const seen = horizontal
        ? Math.min(r.right, box.right) - Math.max(r.left, box.left)
        : Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top);
      const ratio = Math.max(0, seen) / Math.min(size, horizontal ? box.right - box.left : box.bottom - box.top);
      if (ratio > bestRatio) { best = i; bestRatio = ratio; }
    });
    if (best >= 0) this._setActive(best, 'scroll');
  }

  /**
   * Khóa nhận diện tới khi cuộn xong: sự kiện scrollend, hoặc (trình duyệt chưa có scrollend / không cuộn gì)
   * vị trí cuộn đứng yên qua 2 lần đo liên tiếp (100ms/lần, tối đa ~4s). Mở khóa → đo lại bước đang xem thực tế.
   */
  _lock(scroller, smooth) {
    this._unlock();
    this._locked = true;
    const release = () => {
      this._unlock();
      this._syncFromGeometry();
    };
    this._release = { scroller, fn: release };
    scroller.addEventListener('scrollend', release, { once: true });

    const el = scroller === window ? document.scrollingElement || document.documentElement : scroller;
    let last = null;
    let stable = 0;
    let ticks = 0;
    const poll = () => {
      const pos = `${el.scrollTop}|${el.scrollLeft}`;
      stable = pos === last ? stable + 1 : 0;
      last = pos;
      if (stable >= 2 || ++ticks > 40) release();
      else this._lockTimer = setTimeout(poll, 100);
    };
    this._lockTimer = setTimeout(poll, smooth ? 150 : 50);
  }

  _unlock() {
    clearTimeout(this._lockTimer);
    if (this._release) this._release.scroller.removeEventListener('scrollend', this._release.fn);
    this._release = null;
    this._locked = false;
  }

  // =====================================================
  // #HASH
  // =====================================================

  _indexFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    return id ? this._sections.findIndex((el) => el.id === id) : -1;
  }

  /** hashchange / popstate (nút Back khi hash="push") → tới bước tương ứng, không ghi URL lại */
  _applyHash(smooth) {
    const i = this._indexFromHash();
    if (i >= 0 && i !== this._current) this.goTo(i, { smooth, _source: 'hash' });
  }

  // =====================================================
  // BÀN PHÍM
  // =====================================================

  /**
   * self: phím bắt trên chính component (focus ở trong). window: bắt trên document khi component đang trong
   * màn hình và focus không nằm ở control khác ngoài component. Không di chuyển được (đầu/cuối) → để trình duyệt cuộn tiếp.
   */
  _onKeydown(e, fromDocument) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const win = this._mode === 'window';
    if (fromDocument !== win) return;
    const target = e.composedPath()[0];
    if (isEditable(target)) return;

    if (win) {
      if (!this._inView) return;
      const active = document.activeElement;
      if (active && active !== document.body && active !== document.documentElement && !this.contains(active) && active !== this) return;
    }

    const horizontal = this.direction === 'horizontal';
    const nextKeys = horizontal ? ['ArrowRight', 'ArrowDown', 'PageDown'] : ['ArrowDown', 'PageDown'];
    const prevKeys = horizontal ? ['ArrowLeft', 'ArrowUp', 'PageUp'] : ['ArrowUp', 'PageUp'];
    let index = -1;
    if (nextKeys.includes(e.key)) index = this._current + 1;
    else if (prevKeys.includes(e.key)) index = this._current - 1;
    else if (e.key === ' ' || e.key === 'Spacebar') {
      if (isInteractive(target)) return;
      index = this._current + (e.shiftKey ? -1 : 1);
    } else if (e.key === 'Home') index = 0;
    else if (e.key === 'End') index = this._sections.length - 1;
    else return;

    // Phím mũi tên trong một bước cuộn được bên trong → nhường cho cuộn nội bộ
    if (e.key.startsWith('Arrow') && this._innerCanScroll(e, index > this._current ? 1 : -1, /Up|Down/.test(e.key))) return;
    if (index < 0 || index >= this._sections.length || index === this._current) return;
    e.preventDefault();
    this.goTo(index);
  }

  // =====================================================
  // WHEEL-STEP
  // =====================================================

  /**
   * Mỗi cử chỉ lăn = đúng 1 bước:
   * - Cử chỉ kết thúc khi không có sự kiện wheel trong WHEEL_GAP ms. Trackpad có "quán tính" (chuỗi sự kiện
   *   giảm dần sau khi nhấc tay) → vẫn thuộc cử chỉ cũ nên bị bỏ qua. Lực lăn TĂNG trở lại sau khi hết khóa
   *   = người dùng lăn tiếp → tính là cử chỉ mới.
   * - Tích lũy delta tới WHEEL_THRESHOLD mới bước (bỏ rung nhẹ), rồi khóa WHEEL_LOCK ms trong lúc cuộn mượt.
   * - Ở bước đầu/cuối mà lăn ra ngoài → không chặn, để trang cuộn tiếp; bước cuộn được bên trong → cuộn nội bộ trước.
   */
  _onWheel(e) {
    if (e.ctrlKey || !this._sections.length) return; // ctrl + lăn = zoom
    const horizontal = this.direction === 'horizontal';
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? (horizontal ? this.clientWidth : window.innerHeight) : 1;
    const useX = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    // Dọc: bỏ vuốt ngang trên trackpad. Ngang không bật wheel-step: vuốt ngang để snap tự nhiên,
    // chỉ đổi lăn dọc (chuột) thành bước (snap mandatory không cho cuộn từng chút bằng code)
    if (useX && (!horizontal || !this.wheelStep)) return;
    const delta = (useX ? e.deltaX : e.deltaY) * unit;
    if (!delta) return;
    const dir = delta > 0 ? 1 : -1;

    if (this._mode === 'window') {
      // Chỉ điều khiển khi component phủ kín màn hình
      const rect = this.getBoundingClientRect();
      if (rect.top > 1 || rect.bottom < window.innerHeight - 1) return;
    }

    const w = this._wheel;
    const now = performance.now();
    const abs = Math.abs(delta);
    if (now - w.last > WHEEL_GAP || (now > w.until && abs > w.prevAbs * 1.5 && abs >= WHEEL_THRESHOLD / 2)) {
      w.used = false;
      w.acc = 0;
    }
    w.last = now;
    w.prevAbs = abs;

    if (this._innerCanScroll(e, dir, !useX)) return;
    const target = this._current + dir;
    if (target < 0 || target >= this._sections.length) return;

    e.preventDefault();
    if (w.used || now < w.until) return;
    w.acc += delta;
    if (Math.abs(w.acc) < WHEEL_THRESHOLD) return;
    w.used = true;
    w.acc = 0;
    w.until = now + WHEEL_LOCK;
    this.goTo(target);
  }

  /** Có phần tử nào (giữa đích sự kiện và vùng cuộn chính) còn cuộn được theo hướng `dir` trên trục dọc/ngang? */
  _innerCanScroll(e, dir, vertical) {
    const horizontal = !vertical;
    for (const node of e.composedPath()) {
      if (node === this._viewport || node === this || node === document.scrollingElement) break;
      if (!(node instanceof Element)) continue;
      const style = getComputedStyle(node);
      const overflow = horizontal ? style.overflowX : style.overflowY;
      if (overflow !== 'auto' && overflow !== 'scroll') continue;
      if (horizontal) {
        if (node.scrollWidth <= node.clientWidth + 1) continue;
        if (dir > 0 ? node.scrollLeft + node.clientWidth < node.scrollWidth - 1 : node.scrollLeft > 1) return true;
      } else {
        if (node.scrollHeight <= node.clientHeight + 1) continue;
        if (dir > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 1) return true;
      }
    }
    return false;
  }
}

defineElement('hui-scroll-steps', HuiScrollSteps);

export default HuiScrollSteps;
