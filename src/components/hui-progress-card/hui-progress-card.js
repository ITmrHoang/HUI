/**
 * HUI Progress Card — Thẻ tiến độ: tiêu đề + hui-progress + "12/20 việc" + hạn chót (tự cảnh báo khi sắp/quá hạn).
 * Số đếm chạy khi value đổi (tôn trọng reduced motion / no-animation). Biến CSS: xem đầu hui-progress-card.css.
 */

import styles from './hui-progress-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { formatNumber, formatDate, relativeTime, toDate } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import '../hui-progress/hui-progress.js';
import '../hui-icon/hui-icon.js';

/** Chuỗi dự phòng khi locale.js chưa có key progressCard.* */
const FALLBACK = {
  vi: { count: '{value}/{total} việc', deadline: 'Hạn chót {time}', overdue: 'Quá hạn {time}' },
  en: { count: '{value}/{total} tasks', deadline: 'Due {time}', overdue: 'Overdue {time}' },
};

function tr(key, vars) {
  const path = `progressCard.${key}`;
  let value = t(path, vars);
  if (value === path) {
    value = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? key;
    if (vars) value = value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }
  return value;
}

const DAY = 24 * 3600 * 1000;
/** Còn dưới 2 ngày → cảnh báo */
const WARNING_MS = 2 * DAY;
const COUNT_MS = 600;
const isSet = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v));
const hasContent = (slot) => slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());

let uid = 0;

/**
 * @slot - Mô tả (ưu tiên hơn attribute description)
 * @slot title - Tiêu đề tùy biến (ưu tiên hơn attribute title)
 * @slot avatar - Ảnh / icon bên trái tiêu đề (hui-avatar…)
 * @slot extra - Góc phải tiêu đề (tag, menu…)
 * @slot footer - Chân thẻ (danh sách người làm, nút…)
 * @csspart base - Khung thẻ
 * @csspart header - Hàng tiêu đề
 * @csspart avatar - Vùng slot avatar
 * @csspart title - Tiêu đề
 * @csspart description - Mô tả
 * @csspart extra - Vùng slot extra
 * @csspart progress - Thẻ hui-progress bên trong (xuất thêm progress-track, progress-bar, progress-info)
 * @csspart meta - Hàng số đếm + hạn chót
 * @csspart count - Chữ "12/20 việc"
 * @csspart deadline - Hạn chót (<time>)
 * @csspart footer - Chân thẻ
 * @cssprop --hui-progress-card-bg - Nền thẻ
 * @cssprop --hui-progress-card-border-color - Màu viền
 * @cssprop --hui-progress-card-radius - Bo góc
 * @cssprop --hui-progress-card-padding - Khoảng đệm
 * @cssprop --hui-progress-card-shadow - Đổ bóng
 * @cssprop --hui-progress-card-gap - Khoảng cách giữa các hàng
 * @cssprop --hui-progress-card-title-color - Màu tiêu đề
 * @cssprop --hui-progress-card-count-color - Màu chữ số đếm
 * @cssprop --hui-progress-card-warning-color - Màu hạn chót sắp tới (< 2 ngày)
 * @cssprop --hui-progress-card-danger-color - Màu hạn chót đã quá
 */
class HuiProgressCard extends HuiElement {
  static properties = {
    /** Tiêu đề (hoặc slot="title") */
    title: { type: String },
    /** Mô tả ngắn (hoặc slot mặc định) */
    description: { type: String },
    /** Số việc đã xong — cùng `total` → "12/20 việc" và tự tính phần trăm */
    value: { type: Number },
    /** Tổng số việc */
    total: { type: Number },
    /** Phần trăm 0–100 — ưu tiên hơn value/total khi tính thanh tiến độ */
    percent: { type: Number },
    /** normal | active | success | exception — truyền thẳng cho hui-progress */
    status: { type: String, default: 'normal' },
    /** Hạn chót (ISO / timestamp) — hiện "trong 3 ngày"; < 2 ngày → warning, quá hạn → danger */
    deadline: { type: String },
    /** Màu thanh tiến độ (một màu hoặc gradient "from,to") */
    color: { type: String },
    /** 'false' = ẩn chữ phần trăm của hui-progress */
    showInfo: { type: String, default: 'true' },
    /** Tắt hiệu ứng đếm số / chạy thanh */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    /** Giá trị đang hiển thị (khác value khi đang đếm chạy) */
    this._shown = null;
    this._frame = 0;
    this._timer = 0;
  }

  render() {
    const titleId = `hui-progress-card-title-${++uid}`;
    this._titleText = document.createTextNode('');
    this._titleSlot = createElement('slot', { name: 'title' }, this._titleText);
    this._title = createElement('div', { className: 'pc__title', part: 'title', id: titleId }, this._titleSlot);
    this._descText = document.createTextNode('');
    this._descSlot = createElement('slot', {}, this._descText);
    this._desc = createElement('div', { className: 'pc__desc', part: 'description' }, this._descSlot);

    this._avatarSlot = createElement('slot', { name: 'avatar' });
    this._avatar = createElement('div', { className: 'pc__avatar', part: 'avatar' }, this._avatarSlot);
    this._extraSlot = createElement('slot', { name: 'extra' });
    this._extra = createElement('div', { className: 'pc__extra', part: 'extra' }, this._extraSlot);
    this._footerSlot = createElement('slot', { name: 'footer' });
    this._footer = createElement('div', { className: 'pc__footer', part: 'footer' }, this._footerSlot);
    for (const slot of [this._titleSlot, this._descSlot, this._avatarSlot, this._extraSlot, this._footerSlot]) {
      slot.addEventListener('slotchange', () => this._syncSlots());
    }

    this._progress = createElement('hui-progress', {
      className: 'pc__progress', part: 'progress',
      exportparts: 'track: progress-track, bar: progress-bar, info: progress-info',
    });

    this._count = createElement('span', { className: 'pc__count', part: 'count' });
    this._deadlineText = createElement('span');
    this._deadline = createElement('time', { className: 'pc__deadline', part: 'deadline' },
      createElement('hui-icon', { name: 'calendar' }), this._deadlineText);
    this._meta = createElement('div', { className: 'pc__meta', part: 'meta' }, this._count, this._deadline);

    this._base = createElement('div', { className: 'pc', part: 'base', role: 'group', 'aria-labelledby': titleId },
      createElement('div', { className: 'pc__header', part: 'header' },
        this._avatar,
        createElement('div', { className: 'pc__heading' }, this._title, this._desc),
        this._extra),
      this._progress,
      this._meta,
      this._footer);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._startTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this._frame);
    clearInterval(this._timer);
    this._timer = 0;
  }

  updated(changed) {
    if (changed.has('title')) this._titleText.data = this.title || '';
    if (changed.has('description')) this._descText.data = this.description || '';
    if (changed.has('title') || changed.has('description')) this._syncSlots();

    this._base.classList.toggle('pc--no-animation', this.noAnimation);

    // hui-progress
    const p = this._progress;
    p.setAttribute('percent', String(this._percent));
    p.setAttribute('status', this.status || 'normal');
    p.setAttribute('show-info', String(this.showInfo) === 'false' ? 'false' : 'true');
    if (this.color) p.setAttribute('stroke-color', this.color);
    else p.removeAttribute('stroke-color');
    // Nhãn thanh cho trình đọc màn hình = tiêu đề thẻ (trống → mặc định của hui-progress)
    if (this.title) p.setAttribute('label', this.title);
    else p.removeAttribute('label');

    // Số đếm: chạy từ giá trị cũ tới mới (lần đầu hiện ngay)
    if (changed.has('value') || changed.has('total') || changed.has('locale')) {
      const from = changed.get('value');
      const animate = changed.has('value') && isSet(from) && isSet(this.value) && this._shown !== null;
      if (animate) this._countTo(Number(this._shown), Number(this.value));
      else this._drawCount(this.value);
    }

    if (changed.has('deadline')) this._startTimer();
    this._syncDeadline();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  get _percent() {
    if (isSet(this.percent)) return Math.min(100, Math.max(0, Number(this.percent)));
    const total = Number(this.total);
    if (isSet(this.value) && total > 0) return Math.min(100, Math.max(0, (Number(this.value) / total) * 100));
    return 0;
  }

  get _animationsOff() {
    return this.noAnimation || prefersReducedMotion();
  }

  _syncSlots() {
    this._avatar.hidden = !hasContent(this._avatarSlot);
    this._extra.hidden = !hasContent(this._extraSlot);
    this._footer.hidden = !hasContent(this._footerSlot);
    this._title.hidden = !this.title && !hasContent(this._titleSlot);
    this._desc.hidden = !this.description && !hasContent(this._descSlot);
  }

  _drawCount(value) {
    this._shown = isSet(value) ? Number(value) : null;
    const show = isSet(value) && isSet(this.total);
    this._count.hidden = !show;
    if (!show) return;
    this._count.textContent = tr('count', { value: formatNumber(Number(value)), total: formatNumber(this.total) });
  }

  /** Đếm chạy từ `from` → `to` (ease-out), tắt hiệu ứng thì nhảy thẳng */
  _countTo(from, to) {
    cancelAnimationFrame(this._frame);
    if (this._animationsOff || from === to || typeof requestAnimationFrame !== 'function') {
      this._drawCount(to);
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - (1 - k) ** 3;
      if (k < 1) {
        this._drawCount(Math.round(from + (to - from) * eased));
        this._frame = requestAnimationFrame(step);
      } else {
        this._frame = 0;
        this._drawCount(to);
      }
    };
    this._frame = requestAnimationFrame(step);
  }

  /** Trạng thái hạn chót (chỉ đọc): none | normal | warning (< 2 ngày) | danger (quá hạn) | done (đã đủ 100%) */
  get deadlineState() {
    const d = toDate(this.deadline);
    if (!d) return 'none';
    if (this._percent >= 100 || this.status === 'success') return 'done';
    const diff = d.getTime() - Date.now();
    if (diff < 0) return 'danger';
    if (diff < WARNING_MS) return 'warning';
    return 'normal';
  }

  _syncDeadline() {
    const d = toDate(this.deadline);
    const state = this.deadlineState;
    this._deadline.hidden = !d;
    this._meta.hidden = this._count.hidden && !d;
    this._deadline.dataset.state = state;
    this._deadline.className = `pc__deadline pc__deadline--${state}`;
    this.setState('overdue', state === 'danger');
    this.setState('due-soon', state === 'warning');
    if (!d) return;

    this._deadline.setAttribute('datetime', d.toISOString());
    this._deadline.setAttribute('title', formatDate(d, 'datetime'));
    const time = relativeTime(d);
    this._deadlineText.textContent = state === 'danger'
      ? tr('overdue', { time })
      : tr('deadline', { time });
  }

  /** Cập nhật lại "trong 3 ngày" mỗi phút khi có hạn chót */
  _startTimer() {
    clearInterval(this._timer);
    this._timer = 0;
    if (!this.isConnected || !toDate(this.deadline)) return;
    this._timer = setInterval(() => this._syncDeadline(), 60 * 1000);
  }
}

defineElement('hui-progress-card', HuiProgressCard);

export default HuiProgressCard;
