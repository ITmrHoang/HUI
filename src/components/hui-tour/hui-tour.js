/**
 * HUI Tour — hướng dẫn từng bước (onboarding), làm nổi bật phần tử đích (Ant Tour).
 *   <hui-tour id="tour"></hui-tour>
 *   tour.steps = [
 *     { target: '#upload', title: 'Tải lên', description: 'Kéo thả file vào đây' },
 *     { target: () => app.shadowRoot.querySelector('.save'), title: 'Lưu', placement: 'top' },
 *     { title: 'Xong!', description: 'Không có target → hộp thoại ở giữa màn hình' },
 *   ];
 *   tour.start();   // hoặc <hui-tour open>
 * Lớp phủ tối + ô sáng (spotlight bằng box-shadow) chạy mượt giữa các đích; khung nội dung định vị bằng
 * utils/floating.js; cả hai nằm trên top-layer (Popover API). Esc đóng (utils/overlay.js), ←/→ chuyển bước.
 */

import styles from './hui-tour.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { t, getLocaleName } from '../../core/locale.js';
import { computePosition, autoUpdate, showFloating, hideFloating, floatingCss } from '../../utils/floating.js';
import { openOverlay } from '../../utils/overlay.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-button/index.js';
import '../hui-icon/index.js';

let uid = 0;

/** Chuỗi chưa có trong locale.js → chuỗi dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  vi: { 'tour.next': 'Tiếp', 'tour.prev': 'Quay lại', 'tour.finish': 'Hoàn thành', 'tour.skip': 'Bỏ qua', 'tour.close': 'Đóng hướng dẫn', 'tour.indicator': '{current}/{total}', 'tour.step': 'Bước {current} trên {total}', 'tour.label': 'Hướng dẫn sử dụng' },
  en: { 'tour.next': 'Next', 'tour.prev': 'Previous', 'tour.finish': 'Finish', 'tour.skip': 'Skip', 'tour.close': 'Close tour', 'tour.indicator': '{current}/{total}', 'tour.step': 'Step {current} of {total}', 'tour.label': 'Product tour' },
};
function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

const isEditable = (el) => el instanceof Element
  && (el.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"]') || el.isContentEditable);

/** Đối tượng giả làm reference cho computePosition (vùng spotlight) */
const rectRef = (r) => ({
  getBoundingClientRect: () => ({ x: r.x, y: r.y, left: r.x, top: r.y, right: r.x + r.w, bottom: r.y + r.h, width: r.w, height: r.h }),
});

/** Nội dung: chuỗi → text, Node → gắn vào (dùng bản sao nếu Node đang nằm ở chỗ khác trong trang) */
function fill(el, value) {
  el.textContent = '';
  if (value instanceof Node) el.append(value.isConnected && !el.contains(value) ? value.cloneNode(true) : value);
  else if (value !== null && value !== undefined && value !== '') el.textContent = String(value);
}

/**
 * @fires hui-change - Chuyển bước do người dùng / method (không phát khi đổi attribute current từ ngoài). detail: { current, previous }
 * @fires hui-finish - Bấm nút Hoàn thành ở bước cuối. detail: { current }
 * @fires hui-close - Đóng do người dùng (× / Esc / Bỏ qua / Hoàn thành / close()). detail: { current, reason: 'close' | 'escape' | 'skip' | 'finish' }
 * @csspart mask - Lớp phủ toàn màn hình
 * @csspart spotlight - Ô sáng quanh phần tử đích
 * @csspart panel - Khung nội dung (role="dialog")
 * @csspart arrow - Mũi tên của khung
 * @csspart close - Nút đóng ×
 * @csspart cover - Vùng ảnh bìa
 * @csspart title - Tiêu đề bước
 * @csspart description - Mô tả bước
 * @csspart footer - Chân khung (chỉ báo + nút)
 * @csspart indicator - Chỉ báo "1/4" hoặc chấm
 * @csspart skip-button - Nút Bỏ qua (hui-button)
 * @csspart prev-button - Nút Quay lại (hui-button)
 * @csspart next-button - Nút Tiếp / Hoàn thành (hui-button)
 * @cssprop --hui-tour-mask-color - Màu lớp phủ (mặc định --hui-overlay)
 * @cssprop --hui-tour-width - Chiều rộng khung (mặc định 320px)
 * @cssprop --hui-tour-bg - Nền khung (type default)
 * @cssprop --hui-tour-color - Màu chữ mô tả
 * @cssprop --hui-tour-title-color - Màu tiêu đề
 * @cssprop --hui-tour-radius - Bo góc khung
 * @cssprop --hui-tour-shadow - Đổ bóng khung
 * @cssprop --hui-tour-padding - Khoảng đệm khung
 * @cssprop --hui-tour-primary-bg - Nền khung khi type="primary"
 * @cssprop --hui-tour-duration - Thời gian chuyển spotlight giữa các đích (mặc định 300ms)
 * @cssprop --hui-tour-spotlight-ring - Viền quanh spotlight (mặc định không có)
 */
class HuiTour extends HuiElement {
  static localized = true;

  static properties = {
    /** Danh sách bước: [{ target, title, description, placement, cover, nextLabel, prevLabel, scrollIntoView, mask, type, arrow, onEnter, beforeNext }] — target: selector | Element | () => Element */
    steps: { type: Array, default: [] },
    /** Đang mở */
    open: { type: Boolean },
    /** Chỉ số bước hiện tại (bắt đầu từ 0) */
    current: { type: Number, default: 0 },
    /** 'false' = không phủ tối (bước có thể ghi đè bằng step.mask) */
    mask: { type: String, default: 'true' },
    /** Khoảng đệm giữa phần tử đích và mép spotlight (px) */
    gap: { type: Number, default: 6 },
    /** Bo góc spotlight (px) */
    radius: { type: Number, default: 8 },
    /** Khoảng cách spotlight ↔ khung nội dung (px) */
    offset: { type: Number, default: 12 },
    /** top | bottom | left | right, kèm -start / -end — vị trí mặc định của khung (bước ghi đè bằng step.placement) */
    placement: { type: String, default: 'bottom' },
    /** default | primary — kiểu khung (bước ghi đè bằng step.type) */
    type: { type: String, default: 'default' },
    /** text | dots | none — chỉ báo tiến độ */
    indicator: { type: String, default: 'text' },
    /** 'false' = ẩn mũi tên */
    arrow: { type: String, default: 'true' },
    /** Hiện nút "Bỏ qua" (đóng với reason 'skip') */
    skippable: { type: Boolean },
    /** Chặn thao tác lên chính phần tử đích (mặc định đích vẫn bấm được qua ô sáng) */
    disableInteraction: { type: Boolean, attribute: 'disable-interaction' },
    /** Tắt phím ←/→ (Esc vẫn đóng) */
    noKeyboard: { type: Boolean, attribute: 'no-keyboard' },
    /** Tắt hiệu ứng chuyển động */
    noAnimation: { type: Boolean, attribute: 'no-animation' },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._shown = false;
    this._active = -1;
    this._nav = 0;
    this._token = 0;
    this._busy = false;
    this._target = null;
    this._hole = null;
    this._stopAuto = null;
    this._overlay = null;
    this._suspend = false;
    this._moveTimer = null;
    this._id = `hui-tour-${++uid}`;
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  /** Mở tour từ bước `index` (mặc định 0) */
  start(index = 0) {
    this.current = this._clamp(index);
    this.open = true;
  }

  /** Sang bước sau (chạy step.beforeNext trước); bước cuối → hoàn tất */
  async next() {
    if (!this._shown || this._busy) return;
    const index = this._active;
    const step = this._steps[index];
    if (step?.beforeNext) {
      this._busy = true;
      this._nextBtn.loading = true;
      let ok = true;
      try {
        ok = (await step.beforeNext({ current: index, step, tour: this })) !== false;
      } catch (err) {
        ok = false;
        console.warn('[HUI] hui-tour beforeNext lỗi:', err);
      } finally {
        this._busy = false;
        this._nextBtn.loading = false;
      }
      if (!ok || !this._shown || this._active !== index) return;
    }
    if (index >= this._steps.length - 1) this._finish();
    else this._go(index + 1);
  }

  /** Về bước trước */
  prev() {
    if (this._shown && !this._busy && this._active > 0) this._go(this._active - 1);
  }

  /** Nhảy tới bước bất kỳ (bỏ qua beforeNext) */
  goTo(index) {
    if (this._shown) this._go(this._clamp(index));
    else this.current = this._clamp(index);
  }

  /** Đóng tour (phát hui-close reason 'close') */
  close() {
    this._dismiss('close');
  }

  /** Tính lại vị trí (vd: sau khi layout trang đổi mà không có sự kiện cuộn / resize) */
  reposition() {
    if (this._shown) this._layout(false);
  }

  // =====================================================
  // RENDER / LIFECYCLE
  // =====================================================

  render() {
    this._spotlight = createElement('div', { className: 'spotlight', part: 'spotlight' });
    this._blocker = createElement('div', { className: 'blocker' });
    this._mask = createElement('div', { className: 'mask', part: 'mask', hidden: true, 'aria-hidden': 'true' }, this._blocker, this._spotlight);

    this._arrow = createElement('span', { className: 'arrow', part: 'arrow' });
    this._closeBtn = createElement('button', { type: 'button', className: 'close', part: 'close' },
      createElement('hui-icon', { name: 'close' }));
    this._cover = createElement('div', { className: 'cover', part: 'cover' });
    this._title = createElement('div', { className: 'title', part: 'title', id: `${this._id}-title` });
    this._desc = createElement('div', { className: 'description', part: 'description', id: `${this._id}-desc` });
    this._indicator = createElement('div', { className: 'indicator', part: 'indicator' });
    this._skipBtn = createElement('hui-button', { variant: 'text', size: 'sm', className: 'btn-skip', part: 'skip-button' });
    this._prevBtn = createElement('hui-button', { variant: 'secondary', size: 'sm', className: 'btn-prev', part: 'prev-button' });
    this._nextBtn = createElement('hui-button', { variant: 'primary', size: 'sm', className: 'btn-next', part: 'next-button' });
    this._footer = createElement('div', { className: 'footer', part: 'footer' }, this._indicator,
      createElement('div', { className: 'actions' }, this._skipBtn, this._prevBtn, this._nextBtn));
    this._panel = createElement('div', {
      className: 'panel hui-floating',
      part: 'panel',
      role: 'dialog',
      tabindex: '-1',
      hidden: true,
    }, this._arrow, this._closeBtn, this._cover,
    createElement('div', { className: 'body' }, this._title, this._desc), this._footer);

    this._closeBtn.addEventListener('click', () => this._dismiss('close'));
    this._skipBtn.addEventListener('click', () => this._dismiss('skip'));
    this._prevBtn.addEventListener('click', () => this.prev());
    this._nextBtn.addEventListener('click', () => this.next());
    return [this._mask, this._panel];
  }

  connectedCallback() {
    super.connectedCallback();
    this.listen(document, 'keydown', (e) => this._onKeydown(e));
    if (this._mounted && this.open) requestAnimationFrame(() => this._applyOpen(this.open));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._shown) this._teardown(true);
  }

  updated(changed) {
    if (changed.has('open')) {
      // Lần đầu: đợi 1 frame để trang (và phần tử đích) dựng xong rồi mới đo
      if (!this._mounted) requestAnimationFrame(() => this._applyOpen(this.open));
      else this._applyOpen(this.open);
    }
    if (!this._shown) return;
    if (changed.has('current') && this._clamp(this.current) !== this._active) {
      this._activate(this._clamp(this.current), { animate: true });
    } else if (changed.has('steps')) {
      if (!this._steps.length) this._dismiss('close');
      else this._activate(this._clamp(this._active), { animate: false });
    } else if (['locale', 'type', 'indicator', 'skippable', 'arrow', 'mask', 'placement', 'gap', 'radius', 'offset', 'disableInteraction'].some((k) => changed.has(k))) {
      this._renderStep();
      this._layout(false);
    }
  }

  firstUpdated() {
    this._mounted = true;
  }

  // =====================================================
  // MỞ / ĐÓNG
  // =====================================================

  get _steps() {
    return Array.isArray(this.steps) ? this.steps.filter(Boolean) : [];
  }

  _clamp(i) {
    const n = this._steps.length;
    return Math.min(Math.max(0, Math.floor(Number(i)) || 0), Math.max(0, n - 1));
  }

  _animated() {
    return !this.noAnimation && !animationsDisabled();
  }

  _applyOpen(open) {
    if (open && (!this.isConnected || !this._steps.length)) open = false;
    if (open === this._shown) return;
    this._shown = open;
    this.setState('open', open);
    const token = ++this._token;

    if (open) {
      // Mở overlay TRƯỚC khi đổi focus → overlay nhớ đúng phần tử để trả focus khi đóng
      this._overlay = openOverlay({ element: this._panel, restoreFocus: true, onEscape: () => this._dismiss('escape') });
      for (const el of [this._mask, this._panel]) el.getAnimations?.().forEach((a) => a.cancel());
      // Dựng sẵn nội dung + ẩn tạm khung tới khi định vị xong (tránh nháy ở góc trang / đổi màu nút)
      this._active = this._clamp(this.current);
      this._renderStep();
      this._panel.classList.add('panel--waiting');
      showFloating(this._mask, '--hui-z-modal');
      showFloating(this._panel, '--hui-z-popover');
      if (this._animated()) animateIn(this._mask, 'fade');
      this._activate(this._active, { animate: false, first: true });
      return;
    }

    this._teardown(false);
    const done = () => {
      if (token !== this._token) return;
      hideFloating(this._mask);
      hideFloating(this._panel);
      for (const el of [this._mask, this._panel]) el.getAnimations?.().forEach((a) => a.cancel());
    };
    if (this._animated()) Promise.all([animateOut(this._mask, 'fade'), animateOut(this._panel, 'fade')]).then(done);
    else done();
  }

  /** Gỡ theo dõi + trả focus (overlay.close); `immediate` = ẩn ngay (element bị tháo khỏi trang) */
  _teardown(immediate) {
    this._nav++;
    this._stopAuto?.();
    this._stopAuto = null;
    clearTimeout(this._moveTimer);
    this._mask.classList.remove('mask--moving');
    this._suspend = false;
    this._overlay?.close();
    this._overlay = null;
    this._active = -1;
    if (immediate) {
      this._shown = false;
      this._token++;
      hideFloating(this._mask);
      hideFloating(this._panel);
    }
  }

  /** Người dùng đóng: phát hui-close rồi đóng */
  _dismiss(reason) {
    if (!this._shown) return;
    const current = this._active < 0 ? this._clamp(this.current) : this._active;
    this.open = false;
    this._applyOpen(false);
    this.emit('hui-close', { current, reason });
  }

  _finish() {
    const current = this._active;
    this.emit('hui-finish', { current });
    this._dismiss('finish');
  }

  // =====================================================
  // CHUYỂN BƯỚC
  // =====================================================

  /** Chuyển bước do người dùng / method → phản chiếu current + phát hui-change */
  async _go(index) {
    if (index === this._active) return;
    const previous = this._active;
    const ok = await this._activate(index, { animate: true });
    if (!ok) return;
    this.emit('hui-change', { current: index, previous });
  }

  _resolveTarget(target) {
    let el = target;
    try {
      if (typeof el === 'function') el = el();
      if (typeof el === 'string' && el) {
        const root = this.getRootNode();
        el = (root !== document && root.querySelector?.(el)) || document.querySelector(el);
      }
    } catch {
      el = null;
    }
    return el instanceof Element && el.isConnected ? el : null;
  }

  /** Hiển thị bước `index`: onEnter → nội dung → cuộn tới đích (nếu cần) → định vị + spotlight → focus */
  async _activate(index, { animate = true, first = false } = {}) {
    const nav = ++this._nav;
    const step = this._steps[index];
    if (!step) return false;
    this._active = index;
    if (this.current !== index) this.current = index; // updated() thấy _active đã khớp → bỏ qua

    if (typeof step.onEnter === 'function') {
      try {
        await step.onEnter({ current: index, step, tour: this });
      } catch (err) {
        console.warn('[HUI] hui-tour onEnter lỗi:', err);
      }
      if (nav !== this._nav) return false;
    }

    this._renderStep();
    const target = this._resolveTarget(step.target);
    this._target = target;
    this._stopAuto?.();
    this._stopAuto = null;

    if (target && step.scrollIntoView !== false && !this._inViewport(target)) {
      this._suspend = true;
      this._panel.classList.add('panel--waiting');
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: this._animated() ? 'smooth' : 'auto' });
      await this._waitScrollEnd(target);
      this._suspend = false;
      if (nav !== this._nav) return false;
    }

    this._panel.classList.remove('panel--waiting');
    this._layout(animate && !first);
    this._stopAuto = autoUpdate(target || this._panel, this._panel, () => {
      if (!this._suspend) this._layout(false);
    });
    if (this._animated() && !first) animateIn(this._panel, 'fade');
    else if (this._animated()) animateIn(this._panel, 'zoom');
    this._panel.focus({ preventScroll: true });
    return true;
  }

  _inViewport(el) {
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    return r.top >= 0 && r.left >= 0 && r.bottom <= vh && r.right <= vw;
  }

  /** Đợi cuộn mượt kết thúc: vị trí đích đứng yên 3 frame liên tiếp (tối đa 1.2s) */
  _waitScrollEnd(el) {
    return new Promise((resolve) => {
      const start = performance.now();
      let last = '';
      let still = 0;
      const tick = () => {
        const r = el.getBoundingClientRect();
        const key = `${Math.round(r.top)},${Math.round(r.left)}`;
        still = key === last ? still + 1 : 0;
        last = key;
        if (still >= 3 || performance.now() - start > 1200) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /** Dựng nội dung khung theo bước hiện tại */
  _renderStep() {
    const steps = this._steps;
    const index = this._active;
    const step = steps[index];
    if (!step) return;
    const total = steps.length;
    const last = index === total - 1;

    fill(this._title, step.title);
    fill(this._desc, step.description);
    this._title.hidden = !this._title.childNodes.length;
    this._desc.hidden = !this._desc.childNodes.length;

    this._cover.textContent = '';
    if (step.cover instanceof Node) fill(this._cover, step.cover);
    else if (step.cover) this._cover.append(createElement('img', { src: String(step.cover), alt: '' }));
    this._cover.hidden = !step.cover;

    const type = step.type || this.type;
    this._panel.classList.toggle('panel--primary', type === 'primary');
    this._panel.classList.toggle('panel--cover', Boolean(step.cover));
    this._nextBtn.variant = type === 'primary' ? 'secondary' : 'primary';
    this._prevBtn.variant = type === 'primary' ? 'text' : 'secondary';

    // ARIA: hộp thoại không chặn trang (non-modal) có tiêu đề + mô tả
    if (this._title.hidden) {
      this._panel.removeAttribute('aria-labelledby');
      this._panel.setAttribute('aria-label', tx('tour.label'));
    } else {
      this._panel.removeAttribute('aria-label');
      this._panel.setAttribute('aria-labelledby', this._title.id);
    }
    if (this._desc.hidden) this._panel.removeAttribute('aria-describedby');
    else this._panel.setAttribute('aria-describedby', this._desc.id);

    // Chỉ báo tiến độ
    const mode = ['text', 'dots', 'none'].includes(this.indicator) ? this.indicator : 'text';
    this._indicator.textContent = '';
    this._indicator.hidden = mode === 'none' || total < 2;
    this._indicator.setAttribute('aria-label', tx('tour.step', { current: index + 1, total }));
    this._indicator.setAttribute('role', 'img');
    if (mode === 'dots') {
      for (let i = 0; i < total; i++) this._indicator.append(createElement('span', { className: i === index ? 'dot dot--active' : 'dot' }));
    } else {
      this._indicator.textContent = tx('tour.indicator', { current: index + 1, total });
    }

    this._prevBtn.hidden = index === 0;
    this._prevBtn.textContent = step.prevLabel || tx('tour.prev');
    this._nextBtn.textContent = step.nextLabel || tx(last ? 'tour.finish' : 'tour.next');
    this._skipBtn.hidden = !this.skippable || last;
    this._skipBtn.textContent = tx('tour.skip');
    this._closeBtn.setAttribute('aria-label', tx('tour.close'));
  }

  // =====================================================
  // ĐỊNH VỊ
  // =====================================================

  /** Đặt spotlight + vùng chặn click + khung nội dung. `animate` = chạy chuyển động giữa 2 đích */
  _layout(animate) {
    const step = this._steps[this._active];
    if (!step) return;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const target = this._target?.isConnected ? this._target : null;
    const gap = Math.max(0, Number(this.gap) || 0);
    let hole = null;
    if (target) {
      const r = target.getBoundingClientRect();
      hole = { x: r.left - gap, y: r.top - gap, w: r.width + gap * 2, h: r.height + gap * 2 };
    }
    this._hole = hole;

    const masked = this.mask !== 'false' && step.mask !== false;
    this._mask.classList.toggle('mask--off', !masked);
    if (animate && this._animated()) {
      this._mask.classList.add('mask--moving');
      clearTimeout(this._moveTimer);
      const ms = parseFloat(getComputedStyle(this._spotlight).transitionDuration) * 1000 || 300;
      this._moveTimer = setTimeout(() => this._mask.classList.remove('mask--moving'), ms + 60);
    }
    const s = hole || { x: vw / 2, y: vh / 2, w: 0, h: 0 };
    const radius = hole ? Math.max(0, Number(this.radius) || 0) : 0;
    Object.assign(this._spotlight.style, {
      transform: `translate(${s.x}px, ${s.y}px)`,
      width: `${s.w}px`,
      height: `${s.h}px`,
      borderRadius: `${radius}px`,
    });
    this._spotlight.hidden = !hole && !masked;
    // Vùng chặn click phủ kín, chừa lỗ ở đích (trừ khi disable-interaction)
    if (hole && !this.disableInteraction) {
      const x1 = hole.x; const y1 = hole.y; const x2 = hole.x + hole.w; const y2 = hole.y + hole.h;
      this._blocker.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px)`;
    } else {
      this._blocker.style.clipPath = 'none';
    }

    // Khung nội dung
    const panel = this._panel;
    const withArrow = Boolean(hole) && this.arrow !== 'false' && step.arrow !== false;
    this._arrow.hidden = !withArrow;
    panel.style.setProperty('--_tour-radius', `${radius}px`);
    if (hole) {
      const pos = computePosition(rectRef(hole), panel, {
        placement: step.placement || this.placement || 'bottom',
        offset: Math.max(0, Number(this.offset) || 0),
        arrow: withArrow ? this._arrow : undefined,
      });
      panel.style.left = `${pos.x}px`;
      panel.style.top = `${pos.y}px`;
      panel.dataset.side = pos.side;
      if (pos.arrowX !== undefined) panel.style.setProperty('--_arrow-x', `${pos.arrowX}px`);
      else panel.style.removeProperty('--_arrow-x');
      if (pos.arrowY !== undefined) panel.style.setProperty('--_arrow-y', `${pos.arrowY}px`);
      else panel.style.removeProperty('--_arrow-y');
    } else {
      panel.style.left = `${Math.max(8, Math.round((vw - panel.offsetWidth) / 2))}px`;
      panel.style.top = `${Math.max(8, Math.round((vh - panel.offsetHeight) / 2))}px`;
      panel.dataset.side = 'center';
    }
  }

  // =====================================================
  // BÀN PHÍM
  // =====================================================

  _onKeydown(e) {
    if (!this._shown || this.noKeyboard || e.defaultPrevented) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (this._overlay && !this._overlay.isTop()) return; // có lớp nổi khác đang mở phía trên
    if (isEditable(e.composedPath()[0])) return; // đang gõ trong ô nhập → để phím mũi tên di chuyển con trỏ
    e.preventDefault();
    if (e.key === 'ArrowRight') {
      if (this._active < this._steps.length - 1) this.next();
    } else this.prev();
  }
}

defineElement('hui-tour', HuiTour);

export default HuiTour;
