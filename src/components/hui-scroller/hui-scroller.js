/**
 * HUI Scroller — Khung cuộn ngang chứa bất kỳ nội dung nào (card, ảnh, tag…) (Organism)
 * Lõi là overflow-x + CSS scroll-snap của trình duyệt (cuộn cảm ứng tự nhiên), thêm:
 * số item mỗi khung nhìn (responsive, cho phép lẻ 1.2 để lộ thẻ kế), nút mũi tên, kéo chuột,
 * lăn chuột dọc → ngang, bàn phím, chấm / thanh chỉ vị trí, bóng mờ 2 mép, tự chạy.
 * Item: con trực tiếp (slot mặc định) hoặc `data` + <template> (render vào light DOM → CSS trang áp dụng được).
 * RTL (dir="rtl" trên thẻ / tổ tiên): mũi tên, bàn phím, lăn chuột, chấm / thanh vị trí đều đảo chiều.
 * Mọi vị trí bên trong tính theo "khoảng cách từ mép đầu" (RTL: scrollLeft âm → đổi dấu).
 */

import styles from './hui-scroller.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { DataController } from '../../core/data-controller.js';
import { renderTemplate, updateTemplateNode, delegateActions } from '../../core/template.js';
import { Repeater } from '../../core/repeat.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { onScroll, scrollToPosition, dragToScroll } from '../../utils/scroll.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import '../hui-icon/hui-icon.js';

/** Chuỗi dự phòng khi locale.js chưa có key scroller.* */
const FALLBACK = {
  vi: {
    'scroller.label': 'Danh sách cuộn ngang',
    'scroller.prev': 'Trước',
    'scroller.next': 'Tiếp',
    'scroller.slide': '{index} / {count}',
    'scroller.goTo': 'Đến trang {index}',
    'scroller.pagination': 'Chọn trang',
    'scroller.itemRole': 'mục',
  },
  en: {
    'scroller.label': 'Horizontal list',
    'scroller.prev': 'Previous',
    'scroller.next': 'Next',
    'scroller.slide': '{index} of {count}',
    'scroller.goTo': 'Go to page {index}',
    'scroller.pagination': 'Choose page',
    'scroller.itemRole': 'slide',
  },
};

function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

/** Từ khóa khoảng cách — giống hui-flex / hui-space */
const GAP_TOKENS = {
  none: '0px',
  xs: 'var(--hui-space-xs)',
  sm: 'var(--hui-space-sm)',
  md: 'var(--hui-space-lg)',
  lg: 'var(--hui-space-xl)',
  xl: 'var(--hui-space-2xl)',
};

/** Từ khóa → token, số trơn → px, còn lại giữ nguyên (CSS length) */
function toLength(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (GAP_TOKENS[v]) return GAP_TOKENS[v];
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

/** Breakpoint giống hui-grid (min-width) */
const BREAKPOINTS = [
  ['Sm', 576],
  ['Md', 768],
  ['Lg', 992],
  ['Xl', 1200],
  ['Xxl', 1600],
];

/** MediaQueryList dùng chung mọi instance (tạo khi cần) */
let sharedMqls = null;
function breakpointMqls() {
  if (!sharedMqls && typeof matchMedia === 'function') {
    sharedMqls = BREAKPOINTS.map(([, px]) => matchMedia(`(min-width: ${px}px)`));
  }
  return sharedMqls;
}

/** Con không phải item (không nhận style / ARIA của item) */
const SKIP_TAGS = new Set(['template', 'style', 'script', 'link', 'meta']);
/** Chỉ thẻ không mang ngữ nghĩa riêng mới được gắn role="group" (img, a, article, figure… giữ vai trò gốc) */
const GROUPABLE_TAGS = new Set(['div', 'span', 'section']);

/** Thuộc tính ARIA do scroller tự gắn lên item: el → { attr: giá trị đã gắn } */
const ownedAria = new WeakMap();

let uid = 0;

/**
 * @fires hui-scroll - Vị trí cuộn đổi (gom theo frame). detail: { index, progress, atStart, atEnd }
 * @fires hui-action - (template) bấm phần tử có data-action. detail: { action, item, index, originalEvent }
 * @fires hui-load - (DataController) tải xong src / fetchFn. detail: { data, total }
 * @fires hui-error - (DataController) tải lỗi. detail: { error }
 * @slot - Các item (phần tử con trực tiếp). Một <template> con dùng làm khuôn khi có `data`
 * @csspart base - Khung ngoài
 * @csspart frame - Khung chứa viewport + nút mũi tên
 * @csspart viewport - Vùng cuộn (focus được, role="region")
 * @csspart track - Hàng chứa item (flex)
 * @csspart prev - Nút mũi tên trái
 * @csspart next - Nút mũi tên phải
 * @csspart indicator - Hàng chấm / rãnh thanh tiến độ
 * @csspart dot - Mỗi chấm (thêm part dot-active cho chấm hiện tại)
 * @csspart bar - Thanh vị trí (indicator="bar")
 * @csspart state - Vùng loading / empty / error của dữ liệu
 * @cssprop --hui-scroller-gap - Khoảng cách giữa item khi không có attribute gap (mặc định --hui-space-lg)
 * @cssprop --hui-scroller-padding - Đệm 2 bên hàng item khi không có attribute padding (mặc định 0)
 * @cssprop --hui-scroller-item-width - Bề rộng item khi không có items-per-view / item-width (mặc định auto)
 * @cssprop --hui-scroller-fade-size - Độ dài bóng mờ mép (edge-fade, mặc định 48px)
 * @cssprop --hui-scroller-arrow-size - Kích thước nút mũi tên (mặc định 36px)
 * @cssprop --hui-scroller-arrow-bg - Nền nút mũi tên
 * @cssprop --hui-scroller-arrow-color - Màu icon nút mũi tên
 * @cssprop --hui-scroller-arrow-shadow - Bóng nút mũi tên
 * @cssprop --hui-scroller-arrow-offset - Khoảng cách nút tới mép (mặc định --hui-space-sm)
 * @cssprop --hui-scroller-dot-size - Đường kính chấm (mặc định 8px)
 * @cssprop --hui-scroller-dot-color - Màu chấm thường
 * @cssprop --hui-scroller-dot-active-color - Màu chấm hiện tại (mặc định --hui-primary)
 * @cssprop --hui-scroller-bar-height - Độ dày thanh vị trí (mặc định 4px)
 * @cssprop --hui-scroller-bar-track-color - Màu rãnh thanh vị trí
 * @cssprop --hui-scroller-bar-color - Màu thanh vị trí (mặc định --hui-primary)
 * @cssprop --hui-scroller-indicator-gap - Khoảng cách viewport ↔ indicator (mặc định --hui-space-md)
 * @cssprop --hui-scroller-focus-color - Viền focus của viewport
 */
class HuiScroller extends DataController(HuiElement) {
  static properties = {
    /** Khoảng cách giữa item: xs | sm | md | lg | xl | none, số (px) hoặc CSS length */
    gap: { type: String },
    /** Số item trong một khung nhìn (cho phép lẻ, vd 1.2 → lộ một phần thẻ kế); bỏ trống = bề rộng tự nhiên */
    itemsPerView: { type: Number },
    /** items-per-view khi màn hình ≥ 576px */
    itemsPerViewSm: { type: Number },
    /** items-per-view khi màn hình ≥ 768px */
    itemsPerViewMd: { type: Number },
    /** items-per-view khi màn hình ≥ 992px */
    itemsPerViewLg: { type: Number },
    /** items-per-view khi màn hình ≥ 1200px */
    itemsPerViewXl: { type: Number },
    /** items-per-view khi màn hình ≥ 1600px */
    itemsPerViewXxl: { type: Number },
    /** Bề rộng cố định mỗi item (số = px, hoặc CSS length) — thay cho items-per-view */
    itemWidth: { type: String },
    /** Đệm 2 bên hàng item (để thẻ đầu thẳng lề nội dung trang): từ khóa, số (px) hoặc CSS length */
    padding: { type: String },
    /** start | center | none — vị trí bám (scroll-snap) của item */
    snap: { type: String, default: 'start' },
    /** auto | hidden — thanh cuộn của trình duyệt hay ẩn hẳn */
    scrollbar: { type: String, default: 'auto' },
    /** true | false — false: tắt kéo bằng chuột (mặc định bật). Không dùng tên draggable vì trùng thuộc tính kéo-thả native */
    dragScroll: { type: String, default: 'true' },
    /** Lăn chuột dọc → cuộn ngang (trả lại cuộn trang khi đã tới mép) */
    wheel: { type: Boolean },
    /** auto | always | never — auto: chỉ hiện trên thiết bị có chuột (ẩn trên cảm ứng), ẩn nút đã tới mép */
    arrows: { type: String, default: 'auto' },
    /** item | page — nút mũi tên / PageUp-PageDown cuộn 1 item hay 1 trang (attribute `scroll-by`) */
    scrollStep: { type: String, attribute: 'scroll-by', default: 'item' },
    /** Bóng mờ ở mép còn nội dung bị che */
    edgeFade: { type: Boolean },
    /** dots | bar | none — chấm theo trang (bấm được) hoặc thanh vị trí */
    indicator: { type: String, default: 'none' },
    /** Tự chuyển item sau mỗi N ms (attribute rỗng = 3000); dừng khi hover / focus / tab ẩn; tắt khi giảm chuyển động */
    autoplay: { type: Number, default: 0 },
    /** Nhãn ARIA của vùng cuộn (mặc định theo locale) */
    label: { type: String },
    /** Trường làm key khi render từ data (giữ DOM khi dữ liệu đổi thứ tự) */
    rowKey: { type: String },
    /** Tắt cuộn mượt và hiệu ứng chuyển */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    /** Item hiện có (phần tử con được slot) */
    this._items = [];
    /** Vị trí đo được: [{ start, width }] theo tọa độ cuộn */
    this._metrics = [];
    /** Vị trí cuộn đích (tính từ mép đầu, RTL cũng ≥ 0) của từng item, đã kẹp [0, max] */
    this._targets = [];
    /** Chỉ số item đầu mỗi trang */
    this._pages = [0];
    this._index = 0;
    this._pending = null;
    this._edges = { start: false, end: false };
    this._progress = 0;
    this._lastEmit = '';
    this._measureFrame = 0;
    this._cleanups = [];
    this._repeater = null;
    this._actionsOff = null;
    this._paused = { hover: false, focus: false };
    this._timer = 0;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    const id = `hui-scroller-${this._uid}`;
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncItems());

    this._track = createElement('div', { className: 'scroller__track', part: 'track' }, this._slot);
    this._viewport = createElement('div', {
      className: 'scroller__viewport', part: 'viewport', id, role: 'region', tabindex: '0',
    }, this._track);

    const arrow = (dir) => {
      const btn = createElement('button', {
        type: 'button',
        className: `scroller__arrow scroller__arrow--${dir}`,
        part: dir,
        'aria-controls': id,
      }, createElement('hui-icon', { name: dir === 'prev' ? 'chevron-left' : 'chevron-right' }));
      btn.addEventListener('click', () => (dir === 'prev' ? this.prev() : this.next()));
      return btn;
    };
    this._prevBtn = arrow('prev');
    this._nextBtn = arrow('next');

    this._frame = createElement('div', { className: 'scroller__frame', part: 'frame' }, this._viewport, this._prevBtn, this._nextBtn);
    this._indicator = createElement('div', { className: 'scroller__indicator', part: 'indicator', hidden: true });
    this._state = createElement('div', { className: 'scroller__state', part: 'state', hidden: true });
    this._base = createElement('div', { className: 'scroller', part: 'base' }, this._state, this._frame, this._indicator);

    this._viewport.addEventListener('keydown', (e) => this._onKeydown(e));
    // Ảnh / link bên trong mặc định kéo-thả được → chặn để kéo chuột cuộn mượt
    this._viewport.addEventListener('dragstart', (e) => { if (this._dragEnabled) e.preventDefault(); });
    // Người dùng tự cuộn → bỏ chỉ số "đang tới" của lần cuộn bằng code
    for (const type of ['pointerdown', 'wheel', 'touchstart']) {
      this._viewport.addEventListener(type, () => { this._pending = null; }, { passive: true });
    }
    this._viewport.addEventListener('scrollend', () => {
      this._pending = null;
      this._sync();
    });

    // Tự chạy: dừng khi hover / focus bên trong
    this.addEventListener('pointerenter', () => { this._paused.hover = true; this._syncAutoplay(); });
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

    // Breakpoint cho items-per-view-*: đổi kích thước màn hình → tính lại
    for (const mql of breakpointMqls() || []) this.listen(mql, 'change', () => this._applyLayout());
    this.listen(document, 'visibilitychange', () => this._syncAutoplay());

    this._cleanups.push(onScroll(this._viewport, (info) => {
      this._progress = info.progressX;
      this._sync();
    }));
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._scheduleMeasure());
      this._ro.observe(this._viewport);
      this._ro.observe(this._track);
    }
    this._bindPointer();
    this._actionsOff = delegateActions(this, this);

    if (reconnect) {
      this._applyLayout();
      this._syncItems();
    }
    this._syncAutoplay();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanups.forEach((fn) => fn());
    this._cleanups = [];
    this._unbindPointer();
    this._ro?.disconnect();
    this._ro = null;
    this._actionsOff?.();
    this._actionsOff = null;
    cancelAnimationFrame(this._measureFrame);
    this._measureFrame = 0;
    clearInterval(this._timer);
    this._timer = 0;
    clearTimeout(this._pendingTimer);
    this._pending = null;
  }

  updated(changed) {
    super.updated(changed);

    if (['gap', 'padding', 'itemWidth', 'itemsPerView', 'itemsPerViewSm', 'itemsPerViewMd', 'itemsPerViewLg', 'itemsPerViewXl', 'itemsPerViewXxl']
      .some((k) => changed.has(k))) this._applyLayout();

    if (['snap', 'scrollbar', 'arrows', 'edgeFade', 'indicator', 'noAnimation'].some((k) => changed.has(k))) {
      const snap = ['start', 'center', 'none'].includes(this.snap) ? this.snap : 'start';
      const arrows = ['auto', 'always', 'never'].includes(this.arrows) ? this.arrows : 'auto';
      // toggle từng class (không gán className) để giữ class trạng thái do _sync / _applyLayout đặt
      const cl = this._base.classList;
      for (const s of ['start', 'center', 'none']) cl.toggle(`scroller--snap-${s}`, s === snap);
      for (const a of ['auto', 'always', 'never']) cl.toggle(`scroller--arrows-${a}`, a === arrows);
      cl.toggle('scroller--no-scrollbar', this.scrollbar === 'hidden');
      cl.toggle('scroller--fade', this.edgeFade);
      cl.toggle('scroller--no-animation', this.noAnimation);
      if (changed.has('snap')) this._scheduleMeasure();
      this._prevBtn.hidden = arrows === 'never';
      this._nextBtn.hidden = arrows === 'never';
    }

    if (changed.has('dragScroll') || changed.has('wheel')) this._bindPointer();
    if (changed.has('indicator')) this._renderIndicator(true);
    if (changed.has('autoplay')) this._syncAutoplay();

    if (changed.has('label') || changed.has('locale')) {
      this._viewport.setAttribute('aria-label', this.label || tx('scroller.label'));
      this._prevBtn.setAttribute('aria-label', tx('scroller.prev'));
      this._nextBtn.setAttribute('aria-label', tx('scroller.next'));
    }

    // Dữ liệu: render template vào light DOM + giao diện loading / empty / error
    if (['data', 'rowKey'].some((k) => changed.has(k))) this._renderData();
    if (['data', 'dataState', 'loading', 'emptyText', 'src', 'fetchFn', 'locale'].some((k) => changed.has(k))) {
      if (this._isDataMode) this.renderStateView(this._state, { skeletonRows: 2 });
      else {
        this._state.hidden = true;
        this._state.replaceChildren();
      }
      this._frame.hidden = this._isDataMode && this.dataState !== 'ready';
      this._scheduleMeasure();
    }

    if (changed.has('locale')) {
      this._labelItems();
      this._renderIndicator(true);
    }
  }

  // =====================================================
  // API
  // =====================================================

  /** Chỉ số item đầu tiên đang hiển thị (chỉ đọc) */
  get currentIndex() {
    return this._pending ? this._pending.index : this._index;
  }

  /** Số trang (mỗi trang = số item vừa một khung nhìn) — chỉ đọc */
  get pageCount() {
    return this._pages.length;
  }

  /** Trang hiện tại (0-based) — chỉ đọc */
  get currentPage() {
    return this._pageOf(this.currentIndex);
  }

  /** Danh sách phần tử item (chỉ đọc) */
  get items() {
    return [...this._items];
  }

  /** Đang hiển thị theo hướng phải → trái (đọc từ CSS direction, cập nhật khi đo lại / refresh()) — chỉ đọc */
  get isRtl() {
    return Boolean(this._rtl);
  }

  /**
   * Cuộn tới item thứ i (theo vị trí snap).
   * @param {number} index
   * @param {{smooth?: boolean}} [opts] - smooth mặc định true (trừ khi no-animation / giảm chuyển động)
   */
  scrollToIndex(index, { smooth = true } = {}) {
    this._measure();
    const count = this._targets.length;
    if (!count) return;
    const i = Math.max(0, Math.min(count - 1, Math.round(Number(index) || 0)));
    const left = this._targets[i];
    this._pending = { index: i, left };
    clearTimeout(this._pendingTimer);
    // Trình duyệt không có `scrollend` → tự bỏ sau 1s
    this._pendingTimer = setTimeout(() => { this._pending = null; this._sync(); }, 1000);
    scrollToPosition(this._viewport, { left: this._toScrollLeft(left), smooth: smooth && !this.noAnimation });
    this._sync();
  }

  /** Cuộn tới item / trang kế (theo scroll-by) */
  next() {
    this._step(1, this.scrollStep === 'page');
  }

  /** Cuộn về item / trang trước (theo scroll-by) */
  prev() {
    this._step(-1, this.scrollStep === 'page');
  }

  /** Đo lại vị trí item (gọi khi tự đổi kích thước item bằng code) */
  refresh() {
    this._measure();
    this._sync();
  }

  // =====================================================
  // BỐ CỤC
  // =====================================================

  /** items-per-view đang áp dụng theo breakpoint (null = bề rộng tự nhiên) */
  get _perView() {
    let n = this.itemsPerView;
    const mqls = breakpointMqls();
    BREAKPOINTS.forEach(([suffix], i) => {
      const v = this[`itemsPerView${suffix}`];
      if (v > 0 && mqls?.[i]?.matches) n = v;
    });
    return n > 0 ? n : null;
  }

  get _dragEnabled() {
    return String(this.dragScroll) !== 'false';
  }

  get _isDataMode() {
    return this.data != null || Boolean(this.src) || Boolean(this.fetchFn);
  }

  /** Đọc hướng chữ hiện tại; đổi → gắn class scroller--rtl (CSS đảo mũi tên, bóng mờ) */
  _readDir() {
    const rtl = getComputedStyle(this).direction === 'rtl';
    if (rtl !== this._rtl) {
      this._rtl = rtl;
      this._base.classList.toggle('scroller--rtl', rtl);
      this.setState('rtl', rtl);
    }
    return rtl;
  }

  /** Vị trí cuộn tính từ mép đầu (≥ 0). RTL chuẩn hiện đại: scrollLeft từ 0 giảm dần về âm */
  get _pos() {
    const sl = this._viewport.scrollLeft;
    return this._rtl ? -sl : sl;
  }

  /** Vị trí từ mép đầu → giá trị scrollLeft thật */
  _toScrollLeft(pos) {
    return this._rtl ? -pos || 0 : pos;
  }

  /** Ghi biến nội bộ cho CSS: gap, padding, bề rộng item */
  _applyLayout() {
    const style = this._base.style;
    const set = (name, value) => (value ? style.setProperty(name, value) : style.removeProperty(name));
    set('--_scroller-gap', toLength(this.gap));
    set('--_scroller-pad', toLength(this.padding));

    const n = this._perView;
    const fixed = this.itemWidth ? toLength(this.itemWidth) : null;
    set('--_scroller-n', n && !fixed ? String(n) : null);
    set('--_scroller-fixed-w', fixed);
    this._base.classList.toggle('scroller--per-view', Boolean(n && !fixed));
    this._base.classList.toggle('scroller--fixed', Boolean(fixed));
    this._scheduleMeasure();
  }

  _scheduleMeasure() {
    if (this._measureFrame || !this.isConnected) return;
    this._measureFrame = requestAnimationFrame(() => {
      this._measureFrame = 0;
      this._measure();
      this._sync();
    });
  }

  /**
   * Đo vị trí item 1 lần (chỉ đọc layout, không ghi) → dùng lại cho mọi lần cuộn.
   * Vị trí đích của item i = mép trái item − padding đầu (khớp scroll-padding), kẹp vào [0, max].
   * Trang: bắt đầu từ item 0, mỗi trang nhảy `perPage` item, dừng khi chạm cuối vùng cuộn.
   */
  _measure() {
    const vp = this._viewport;
    const items = this._items;
    const rtl = this._readDir();
    const vpRect = vp.getBoundingClientRect();
    const sl = this._pos;
    const max = Math.max(0, vp.scrollWidth - vp.clientWidth);
    const cs = getComputedStyle(this._track);
    const pad = parseFloat(rtl ? cs.paddingRight : cs.paddingLeft) || 0;
    const center = this.snap === 'center';

    // start = khoảng cách mép đầu item tới mép đầu nội dung (RTL: đo từ bên phải)
    this._metrics = items.map((el) => {
      const r = el.getBoundingClientRect();
      return { start: (rtl ? vpRect.right - r.right : r.left - vpRect.left) + sl, width: r.width };
    });
    this._targets = this._metrics.map(({ start, width }) => {
      const raw = center ? start + width / 2 - vp.clientWidth / 2 : start - pad;
      return Math.max(0, Math.min(max, raw));
    });
    this._max = max;

    // Số item mỗi trang: theo items-per-view, hoặc ước lượng theo bề rộng item thực tế
    let perPage = 1;
    const n = this.itemWidth ? null : this._perView;
    if (n) perPage = Math.max(1, Math.floor(n + 0.001));
    else if (this._metrics.length) {
      const m = this._metrics;
      const stride = m.length > 1 ? m[1].start - m[0].start : m[0].width;
      const gapPx = Math.max(0, stride - m[0].width);
      if (stride > 0) perPage = Math.max(1, Math.floor((vp.clientWidth - pad * 2 + gapPx) / stride + 0.001));
    }
    const pages = [0];
    if (max > 1) {
      for (let i = perPage; i < this._targets.length; i += perPage) {
        pages.push(i);
        if (this._targets[i] >= max - 1) break;
      }
    }
    const pagesChanged = pages.length !== this._pages.length;
    this._pages = pages;
    if (pagesChanged) this._renderIndicator(true);
  }

  // =====================================================
  // ĐỒNG BỘ TRẠNG THÁI KHI CUỘN (gọi tối đa 1 lần / frame qua onScroll)
  // =====================================================

  _sync() {
    if (!this._hasRendered) return;
    const vp = this._viewport;
    const sl = this._pos;
    const max = Math.max(0, vp.scrollWidth - vp.clientWidth);
    // Sai số 1px do làm tròn subpixel (giống overflowEdges nhưng theo vị trí logic → đúng cả RTL)
    const atStart = sl <= 1;
    const atEnd = sl >= max - 1;
    this._progress = max > 0 ? Math.min(1, Math.max(0, sl / max)) : 0;

    // Item gần vị trí cuộn nhất (item bị kẹp cùng đích → lấy item đầu)
    const targets = this._targets;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < targets.length; i++) {
      const d = Math.abs(targets[i] - sl);
      if (d < bestDist - 0.5) {
        bestDist = d;
        best = i;
      }
    }
    this._index = best;
    if (this._pending && Math.abs(this._pending.left - sl) <= 1) this._pending = null;

    // Mép + nút mũi tên + bóng mờ
    if (atStart !== this._edges.start || atEnd !== this._edges.end || !this._edgesInit) {
      this._edgesInit = true;
      this._edges = { start: atStart, end: atEnd };
      this._prevBtn.disabled = atStart;
      this._nextBtn.disabled = atEnd;
      this._base.classList.toggle('scroller--at-start', atStart);
      this._base.classList.toggle('scroller--at-end', atEnd);
      this._base.classList.toggle('scroller--static', atStart && atEnd);
      this.setState('at-start', atStart);
      this.setState('at-end', atEnd);
      this.setState('scrollable', !(atStart && atEnd));
    }

    this._updateIndicator();

    const index = this.currentIndex;
    const progress = Math.round(this._progress * 1000) / 1000;
    const key = `${index}|${progress}|${atStart}|${atEnd}`;
    if (key !== this._lastEmit) {
      // Lần đồng bộ đầu tiên chỉ ghi nhận, không phát sự kiện (người dùng chưa cuộn)
      const first = !this._lastEmit;
      this._lastEmit = key;
      if (!first) this.emit('hui-scroll', { index, progress, atStart, atEnd });
    }
  }

  /** Trang chứa item `index` (đã ở cuối vùng cuộn → trang cuối) */
  _pageOf(index) {
    if (this._edges.end && this._pages.length > 1 && !this._pending) return this._pages.length - 1;
    let page = 0;
    for (let p = 0; p < this._pages.length; p++) if (this._pages[p] <= index) page = p;
    return page;
  }

  _step(dir, byPage) {
    this._measure();
    const targets = this._targets;
    if (!targets.length) return;
    if (byPage) {
      const page = this._pageOf(this.currentIndex) + dir;
      if (page < 0 || page >= this._pages.length) return;
      this.scrollToIndex(this._pages[page]);
      return;
    }
    // Bỏ qua item có cùng vị trí đích (bị kẹp ở cuối) → luôn cuộn thật sự
    const from = this.currentIndex;
    const here = this._pending ? this._pending.left : this._pos;
    for (let i = from + dir; i >= 0 && i < targets.length; i += dir) {
      if (Math.abs(targets[i] - here) > 1) {
        this.scrollToIndex(i);
        return;
      }
    }
  }

  // =====================================================
  // ITEM
  // =====================================================

  _syncItems() {
    this._items = this._slot.assignedElements().filter((el) => !SKIP_TAGS.has(el.localName));
    this._labelItems();
    // Kích thước item đổi (ảnh tải xong…) → track (max-content) đổi theo → ResizeObserver tự đo lại
    this._scheduleMeasure();
  }

  /** Gắn role="group" + aria-roledescription + aria-label "i / n" — không đè giá trị người dùng tự đặt */
  _labelItems() {
    const count = this._items.length;
    const roleDesc = tx('scroller.itemRole');
    this._items.forEach((el, i) => {
      if (!GROUPABLE_TAGS.has(el.localName) && !el.localName.includes('-')) return;
      let owned = ownedAria.get(el);
      if (!owned) ownedAria.set(el, (owned = {}));
      const apply = (attr, value) => {
        const current = el.getAttribute(attr);
        if (current === null || owned[attr] === current) {
          if (current !== value) el.setAttribute(attr, value);
          owned[attr] = value;
        } else delete owned[attr]; // người dùng (hoặc component con) đã đặt → bỏ quyền quản lý
      };
      apply('role', 'group');
      // Item đã có vai trò khác (vd card clickable = button) → không thêm mô tả "slide"
      if (el.getAttribute('role') !== 'group') return;
      apply('aria-roledescription', roleDesc);
      apply('aria-label', tx('scroller.slide', { index: i + 1, count }));
    });
  }

  /** Render data bằng <template> con (light DOM) — giữ node theo row-key */
  _renderData() {
    if (!this._isDataMode) {
      this._repeater?.destroy();
      this._repeater = null;
      return;
    }
    const list = Array.isArray(this.data) ? this.data : [];
    const tpl = this.querySelector(':scope > template');
    if (!this._repeater || this._repeaterKey !== this.rowKey) {
      this._repeater?.destroy();
      this._repeaterKey = this.rowKey;
      this._repeater = new Repeater(this, {
        key: this.rowKey || undefined,
        create: (item, i) => (tpl ? renderTemplate(tpl, item, i) : createElement('div', {}, String(item?.label ?? item?.name ?? item))),
        update: (node, item, i) => updateTemplateNode(node, item, i),
      });
    }
    this._repeater.render(list);
  }

  // =====================================================
  // INDICATOR
  // =====================================================

  /** Dựng lại chấm khi số trang đổi; thanh vị trí dựng 1 lần */
  _renderIndicator(rebuild) {
    if (!this._hasRendered) return;
    const mode = this.indicator;
    const ind = this._indicator;
    if (mode !== 'dots' && mode !== 'bar') {
      ind.hidden = true;
      ind.replaceChildren();
      this._dots = null;
      this._bar = null;
      return;
    }
    if (mode === 'bar') {
      if (!this._bar || rebuild) {
        this._dots = null;
        this._bar = createElement('div', { className: 'scroller__bar', part: 'bar' });
        ind.className = 'scroller__indicator scroller__indicator--bar';
        ind.removeAttribute('role');
        ind.removeAttribute('aria-label');
        ind.setAttribute('aria-hidden', 'true');
        ind.replaceChildren(this._bar);
      }
    } else if (!this._dots || rebuild) {
      this._bar = null;
      ind.className = 'scroller__indicator scroller__indicator--dots';
      ind.removeAttribute('aria-hidden');
      ind.setAttribute('role', 'group');
      ind.setAttribute('aria-label', tx('scroller.pagination'));
      this._dots = this._pages.map((_, p) => {
        const dot = createElement('button', {
          type: 'button',
          className: 'scroller__dot',
          part: 'dot',
          'aria-label': tx('scroller.goTo', { index: p + 1 }),
        });
        dot.addEventListener('click', () => this.scrollToIndex(this._pages[p] ?? 0));
        return dot;
      });
      ind.replaceChildren(...this._dots);
      this._activeDot = -1;
    }
    ind.hidden = mode === 'dots' && this._pages.length < 2;
    this._updateIndicator();
  }

  _updateIndicator() {
    if (this._bar) {
      // Thanh dài = tỉ lệ phần nhìn thấy, chạy từ mép đầu sang mép cuối (RTL: phải → trái)
      const vp = this._viewport;
      const ratio = vp.scrollWidth > 0 ? Math.min(1, vp.clientWidth / vp.scrollWidth) : 1;
      this._bar.style.width = `${ratio * 100}%`;
      const shift = ratio > 0 ? (this._progress * (1 - ratio) / ratio) * 100 : 0;
      this._bar.style.transform = `translateX(${this._rtl ? -shift : shift}%)`;
    }
    if (this._dots) {
      const active = this._pageOf(this.currentIndex);
      if (active === this._activeDot) return;
      this._activeDot = active;
      this._dots.forEach((dot, i) => {
        const on = i === active;
        dot.setAttribute('part', on ? 'dot dot-active' : 'dot');
        dot.classList.toggle('is-active', on);
        if (on) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
    }
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  _bindPointer() {
    this._unbindPointer();
    if (!this.isConnected) return;
    if (this._dragEnabled) this._pointerOff.push(dragToScroll(this._viewport, { axis: 'x' }));
    if (this.wheel) this._pointerOff.push(this._bindWheel());
    this._base.classList.toggle('scroller--draggable', this._dragEnabled);
  }

  _unbindPointer() {
    (this._pointerOff || []).forEach((fn) => fn());
    this._pointerOff = [];
  }

  /**
   * Lăn chuột dọc → cuộn ngang (như wheelToHorizontal của utils/scroll nhưng theo vị trí logic → đúng cả RTL):
   * chỉ khi còn cuộn được theo hướng đó, hết đường thì trả lại cuộn dọc cho trang.
   */
  _bindWheel() {
    const vp = this._viewport;
    const onWheel = (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const pos = this._pos;
      const max = vp.scrollWidth - vp.clientWidth;
      if ((e.deltaY > 0 && pos >= max - 1) || (e.deltaY < 0 && pos <= 1)) return;
      e.preventDefault();
      vp.scrollLeft += this._rtl ? -e.deltaY : e.deltaY;
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }

  /** ←/→ 1 item (RTL: đảo chiều), PageUp/PageDown 1 trang, Home/End — chỉ khi chính viewport đang focus */
  _onKeydown(e) {
    if (e.composedPath()[0] !== this._viewport || e.altKey || e.ctrlKey || e.metaKey) return;
    const fwd = this._readDir() ? -1 : 1;
    const actions = {
      ArrowRight: () => this._step(fwd, false),
      ArrowLeft: () => this._step(-fwd, false),
      PageDown: () => this._step(1, true),
      PageUp: () => this._step(-1, true),
      Home: () => this.scrollToIndex(0),
      End: () => this.scrollToIndex(this._targets.length - 1),
    };
    const fn = actions[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  }

  /** Tự chạy: tới cuối thì quay về đầu; dừng khi hover / focus / tab ẩn / giảm chuyển động */
  _syncAutoplay() {
    const ms = this.autoplay > 0 ? this.autoplay : this.hasAttribute('autoplay') ? 3000 : 0;
    const run = ms > 0 && this.isConnected && !prefersReducedMotion()
      && !this._paused.hover && !this._paused.focus && document.visibilityState !== 'hidden';
    if (run && this._timerMs === ms && this._timer) return;
    clearInterval(this._timer);
    this._timer = 0;
    this._timerMs = ms;
    if (!run) return;
    this._timer = setInterval(() => {
      if (this._edges.end) this.scrollToIndex(0);
      else this.next();
    }, ms);
  }
}

defineElement('hui-scroller', HuiScroller);

export default HuiScroller;
