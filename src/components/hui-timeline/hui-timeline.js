/**
 * HUI Timeline — Dòng thời gian (Organism nhẹ): dọc (trái / phải / xen kẽ 2 bên kiểu "lịch sử công ty") hoặc ngang.
 * Mốc lấy từ <hui-timeline-item> con hoặc `data`; mốc `pending` ở cuối; mốc hiện dần (stagger) khi cuộn tới.
 */

import styles from './hui-timeline.css?raw';
import './hui-timeline-item.js';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { runAnimation, animationsDisabled } from '../../utils/animate.js';

const MODES = ['left', 'right', 'alternate'];

const FALLBACK = {
  vi: { 'timeline.label': 'Dòng thời gian', 'timeline.pending': 'Đang tiếp diễn...' },
  en: { 'timeline.label': 'Timeline', 'timeline.pending': 'In progress...' },
};

function tx(key) {
  const v = t(key);
  if (v !== key) return v;
  return (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

/**
 * @fires hui-item-reveal - Một nhóm mốc vừa hiện khi cuộn tới. detail: { items }
 * @slot - Các <hui-timeline-item> (bị bỏ qua khi có `data`)
 * @csspart base - Khung ngoài
 * @csspart list - Danh sách mốc (role="list")
 * @csspart item - Mốc dựng từ `data` (<hui-timeline-item>)
 * @csspart pending - Mốc "đang tiếp diễn" (<hui-timeline-item>; chỉnh sâu hơn bằng CSS biến của item)
 * @cssprop --hui-timeline-item-min-width - Bề rộng tối thiểu mỗi mốc khi orientation="horizontal" (mặc định 160px)
 */
class HuiTimeline extends HuiElement {
  static localized = true;

  static properties = {
    /** left | right | alternate — left: nội dung bên phải trục; right: bên trái; alternate: xen kẽ 2 bên */
    mode: { type: String, default: 'left' },
    /** vertical | horizontal — horizontal: các mốc xếp ngang, cuộn ngang khi hẹp */
    orientation: { type: String, default: 'vertical' },
    /** Có attribute → thêm mốc "đang tiếp diễn" ở cuối; giá trị là chữ hiển thị (rỗng = chữ mặc định) */
    pending: { type: String },
    /** Đảo thứ tự hiển thị (mới nhất lên đầu) */
    reverse: { type: Boolean },
    /** Mảng mốc [{ label, heading, content, color, dot, position, pending }] — thay cho thẻ con */
    data: { type: Array },
    /** Hàm dựng nội dung mốc từ data: (item, index) => Node | string */
    renderItem: { type: Object, attribute: false },
    /** Độ trễ giữa các mốc khi hiện dần (ms) */
    stagger: { type: Number, default: 90 },
    /** Thời lượng hiệu ứng hiện của mỗi mốc (ms) */
    duration: { type: Number, default: 500 },
    /** Nhãn ARIA của danh sách (mặc định "Dòng thời gian") */
    label: { type: String },
    /** Tắt hiệu ứng hiện dần */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._generated = [];
    this._revealed = new WeakSet();
    this._watch = new Map();
    this._queue = [];
    this._flushQueued = false;
    this._syncQueued = false;
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._queueSync());
    this._holder = createElement('div', { hidden: true });
    this._pendingItem = createElement('hui-timeline-item', { part: 'pending', pending: '', color: 'gray' });
    this._list = createElement('div', { className: 'tl__list', part: 'list', role: 'list' }, this._slot);
    this._base = createElement('div', { className: 'tl', part: 'base' }, this._list, this._holder);
    return this._base;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const stop of this._watch.values()) stop();
    this._watch.clear();
    // Mốc đang chờ hiệu ứng → hiện luôn (gắn lại không bị kẹt opacity 0)
    for (const el of this._queue) el.removeAttribute('data-reveal');
    this._queue = [];
    this.items.forEach((el) => {
      if (el.getAttribute('data-reveal') === 'pending') el.removeAttribute('data-reveal');
    });
  }

  connectedCallback() {
    const again = this._hasRendered;
    super.connectedCallback();
    if (again) this._queueSync();
  }

  updated(changed) {
    if (changed.has('data') || changed.has('renderItem')) this._buildFromData();
    if (changed.has('label') || changed.has('locale')) this._list.setAttribute('aria-label', this.label || tx('timeline.label'));
    if (changed.has('orientation')) {
      const horizontal = this.orientation === 'horizontal';
      this._base.dataset.orientation = horizontal ? 'horizontal' : 'vertical';
      // Danh sách ngang cuộn được → cho focus để cuộn bằng bàn phím
      if (horizontal) this._list.setAttribute('tabindex', '0');
      else this._list.removeAttribute('tabindex');
    }
    if (changed.has('reverse')) this._base.classList.toggle('tl--reverse', this.reverse);
    if (changed.has('pending') || changed.has('locale')) {
      this._pendingItem.heading = this.pending ? this.pending : tx('timeline.pending');
    }
    this._sync();
  }

  /** Các mốc đang hiển thị theo thứ tự DOM (không gồm mốc pending) — chỉ đọc */
  get items() {
    if (this.data != null) return [...this._generated];
    return this._slot ? this._slot.assignedElements({ flatten: true }).filter((el) => el.localName === 'hui-timeline-item') : [];
  }

  /** Gom nhiều thay đổi (slotchange, item đổi label/position) về 1 lần bố trí */
  _queueSync() {
    if (this._syncQueued || !this._hasRendered) return;
    this._syncQueued = true;
    queueMicrotask(() => {
      this._syncQueued = false;
      this._sync();
    });
  }

  _buildFromData() {
    this._generated.forEach((el) => el.remove());
    this._generated = [];
    // Có data → slot (thẻ con) bị cất đi
    if (this.data != null) {
      if (this._slot.parentNode !== this._holder) this._holder.append(this._slot);
    } else if (this._slot.parentNode !== this._list) {
      this._list.prepend(this._slot);
    }
    if (!Array.isArray(this.data)) return;

    this.data.forEach((d, i) => {
      const item = d && typeof d === 'object' ? d : { content: String(d ?? '') };
      const el = document.createElement('hui-timeline-item');
      el.setAttribute('part', 'item');
      if (item.label != null) el.label = String(item.label);
      const heading = item.heading ?? item.title;
      if (heading != null) el.heading = String(heading);
      if (item.color) el.color = item.color;
      if (item.dot) el.dot = item.dot;
      if (item.position) el.position = item.position;
      if (item.pending) el.pending = true;
      const content = this.renderItem ? this.renderItem(item, i) : item.content;
      if (content instanceof Node) el.append(content);
      else if (content != null && content !== '') el.textContent = String(content);
      this._generated.push(el);
    });
    this._list.append(...this._generated);
  }

  /** Tính phía hiển thị / cột nhãn / mốc cuối cho từng mốc */
  _sync() {
    if (!this._list) return;
    const items = this.items;
    const hasPending = this.pending !== null && this.pending !== undefined;
    if (hasPending) this._list.append(this._pendingItem);
    else this._pendingItem.remove();

    const all = hasPending ? [...items, this._pendingItem] : items;
    // Thứ tự nhìn thấy: reverse → đảo (CSS column-reverse), mốc pending lên đầu
    const visual = this.reverse ? [...all].reverse() : all;
    const mode = MODES.includes(this.mode) ? this.mode : 'left';
    const horizontal = this.orientation === 'horizontal';
    const centered = !horizontal && (mode === 'alternate' || all.some((el) => el.hasLabel));

    visual.forEach((el, i) => {
      let side = mode === 'right' ? 'left' : 'right';
      if (mode === 'alternate') {
        side = el.position === 'left' || el.position === 'right' ? el.position : i % 2 === 0 ? 'right' : 'left';
      }
      el.setAttribute('data-side', side);
      el.toggleAttribute('data-centered', centered);
      el.toggleAttribute('data-last', i === visual.length - 1);
      el.toggleAttribute('data-dashed', hasPending && visual[i + 1] === this._pendingItem);
      el.setAttribute('data-orientation', horizontal ? 'horizontal' : 'vertical');
    });

    this._observeReveal(all);
  }

  // =====================================================
  // HIỆN DẦN KHI CUỘN TỚI
  // =====================================================

  get _motionOff() {
    return this.noAnimation || animationsDisabled();
  }

  _observeReveal(items) {
    // Bỏ theo dõi mốc đã rời DOM
    for (const [el, stop] of this._watch) {
      if (!items.includes(el)) {
        stop();
        this._watch.delete(el);
        el.removeAttribute('data-reveal');
      }
    }
    if (this._motionOff || !this.isConnected) {
      for (const el of items) {
        this._revealed.add(el);
        this._watch.get(el)?.();
        this._watch.delete(el);
        el.removeAttribute('data-reveal');
      }
      return;
    }
    for (const el of items) {
      if (this._revealed.has(el) || this._watch.has(el)) continue;
      el.setAttribute('data-reveal', 'pending');
      let stop = null;
      stop = inView(el, (entry) => {
        if (!entry.isIntersecting) return;
        stop?.();
        this._watch.delete(el);
        this._enqueue(el);
      }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
      // Trình duyệt không có IntersectionObserver → callback chạy ngay, mốc đã vào hàng đợi
      if (!this._queue.includes(el)) this._watch.set(el, stop);
    }
  }

  /**
   * Mốc cùng vào màn hình trong 1 lần IntersectionObserver báo → chạy lần lượt cách nhau `stagger` ms.
   * Gom bằng microtask (không dùng rAF: tab nền tạm dừng rAF → mốc kẹt ở trạng thái ẩn).
   */
  _enqueue(el) {
    this._queue.push(el);
    if (this._flushQueued) return;
    this._flushQueued = true;
    queueMicrotask(() => {
      this._flushQueued = false;
      if (!this._queue.length) return;
      const batch = this._queue;
      this._queue = [];
      const horizontal = this.orientation === 'horizontal';
      batch.forEach((item, i) => {
        this._revealed.add(item);
        const side = item.getAttribute('data-side');
        // Ngang: phóng nhẹ (không dịch chuyển → không làm hiện thanh cuộn của danh sách ngang)
        const effect = horizontal ? 'zoom-in' : side === 'left' ? 'fade-right' : 'fade-left';
        runAnimation([item], effect, { duration: this.duration ?? 500, delay: i * (this.stagger ?? 90) });
        item.removeAttribute('data-reveal');
      });
      this.emit('hui-item-reveal', { items: batch });
    });
  }
}

defineElement('hui-timeline', HuiTimeline);

export default HuiTimeline;
