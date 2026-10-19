/**
 * HUI Step Progress — Đầu trang wizard gọn: "Bước 2/5" + tên bước + thanh tiến độ mảnh + nút Trước/Sau.
 * Bước cuối nút Sau thành "Hoàn thành" → sự kiện hui-finish. Biến CSS: xem đầu hui-step-progress.css.
 */

import styles from './hui-step-progress.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-button/hui-button.js';

/** Chuỗi dự phòng khi locale.js chưa có key stepProgress.* */
const FALLBACK = {
  vi: { label: 'Tiến trình các bước', counter: 'Bước {index}/{total}', prev: 'Quay lại', next: 'Tiếp tục', finish: 'Hoàn thành' },
  en: { label: 'Step progress', counter: 'Step {index}/{total}', prev: 'Back', next: 'Next', finish: 'Finish' },
};

function tr(key, vars) {
  const path = `stepProgress.${key}`;
  let value = t(path, vars);
  if (value === path) {
    value = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? key;
    if (vars) value = value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }
  return value;
}

/**
 * @fires change - Chuyển bước bằng nút / next() / prev() (cancelable — preventDefault() để chặn, vd: form chưa hợp lệ).
 *   detail: { current, previous, direction: 'next' | 'prev' }
 * @fires hui-finish - Bấm "Hoàn thành" ở bước cuối. detail: { current }
 * @slot title - Tên bước tùy biến (ưu tiên hơn steps[current])
 * @slot extra - Nội dung thêm cạnh nút (vd: nút "Lưu nháp")
 * @csspart base - Khung ngoài
 * @csspart header - Hàng chữ + nút
 * @csspart info - Khối "Bước 2/5" + tên bước
 * @csspart counter - Chữ "Bước 2/5"
 * @csspart title - Tên bước hiện tại
 * @csspart actions - Cụm nút
 * @csspart prev - Nút Trước (hui-button)
 * @csspart next - Nút Sau / Hoàn thành (hui-button)
 * @csspart track - Rãnh thanh tiến độ (role="progressbar")
 * @csspart bar - Phần đã đi của thanh tiến độ
 * @cssprop --hui-step-progress-color - Màu thanh tiến độ và chữ "Bước 2/5" (mặc định --hui-primary)
 * @cssprop --hui-step-progress-track-color - Màu rãnh
 * @cssprop --hui-step-progress-height - Độ dày thanh (4px)
 * @cssprop --hui-step-progress-radius - Bo góc thanh
 * @cssprop --hui-step-progress-gap - Khoảng cách giữa hàng chữ và thanh
 * @cssprop --hui-step-progress-title-color - Màu tên bước
 * @cssprop --hui-step-progress-counter-color - Màu chữ "Bước 2/5"
 */
class HuiStepProgress extends HuiElement {
  static properties = {
    /** Bước hiện tại (bắt đầu từ 0) */
    current: { type: Number, default: 0 },
    /** Tổng số bước (bỏ qua khi có `steps`) */
    total: { type: Number },
    /** Mảng tên bước: ['Thông tin', 'Thanh toán'] hoặc [{ title }] */
    steps: { type: Array },
    /** 'false' = ẩn cụm nút Trước/Sau */
    showButtons: { type: String, default: 'true' },
    /** Chữ nút Trước (mặc định theo locale) */
    prevText: { type: String },
    /** Chữ nút Sau (mặc định theo locale) */
    nextText: { type: String },
    /** Chữ nút ở bước cuối (mặc định theo locale) */
    finishText: { type: String },
    /** sm | md | lg — kích thước nút và chữ */
    size: { type: String, default: 'md' },
    /** Nhãn thanh tiến độ cho trình đọc màn hình */
    label: { type: String },
    /** Tắt hiệu ứng chạy của thanh */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  render() {
    this._counter = createElement('span', { className: 'sp__counter', part: 'counter' });
    this._titleText = document.createTextNode('');
    this._titleSlot = createElement('slot', { name: 'title' }, this._titleText);
    this._title = createElement('span', { className: 'sp__title', part: 'title' }, this._titleSlot);
    // Đổi bước → trình đọc màn hình đọc "Bước 2/5 Tên bước"
    const info = createElement('div', { className: 'sp__info', part: 'info', 'aria-live': 'polite' }, this._counter, this._title);

    this._prev = createElement('hui-button', { part: 'prev', variant: 'outline' });
    this._next = createElement('hui-button', { part: 'next', variant: 'primary' });
    this._prev.addEventListener('hui-click', () => this.prev());
    this._next.addEventListener('hui-click', () => (this._isLast ? this._finish() : this.next()));
    this._actions = createElement('div', { className: 'sp__actions', part: 'actions' },
      createElement('slot', { name: 'extra' }), this._prev, this._next);

    this._bar = createElement('div', { className: 'sp__bar', part: 'bar' });
    this._track = createElement('div', {
      className: 'sp__track', part: 'track', role: 'progressbar', 'aria-valuemin': '0',
    }, this._bar);

    this._base = createElement('div', { className: 'sp', part: 'base' },
      createElement('div', { className: 'sp__header', part: 'header' }, info, this._actions),
      this._track);
    return this._base;
  }

  updated() {
    const total = this._total;
    const current = this._current;
    const index = current + 1;
    const size = ['sm', 'md', 'lg'].includes(this.size) ? this.size : 'md';

    this._base.className = ['sp', `sp--${size}`, this.noAnimation ? 'sp--no-animation' : ''].filter(Boolean).join(' ');

    const counter = tr('counter', { index, total });
    const title = this._titleOf(current);
    this._counter.textContent = counter;
    this._titleText.data = title;

    // Thanh tiến độ: bước 2/5 → 40%
    this._bar.style.width = `${(index / total) * 100}%`;
    this._track.setAttribute('aria-valuemax', String(total));
    this._track.setAttribute('aria-valuenow', String(index));
    this._track.setAttribute('aria-valuetext', title ? `${counter}: ${title}` : counter);
    this._track.setAttribute('aria-label', this.label || tr('label'));

    // Nút
    this._actions.hidden = String(this.showButtons) === 'false';
    for (const btn of [this._prev, this._next]) btn.setAttribute('size', size);
    this._prev.textContent = this.prevText || tr('prev');
    this._prev.disabled = current <= 0;
    this._next.textContent = this._isLast ? this.finishText || tr('finish') : this.nextText || tr('next');
    this.setState('first', current <= 0);
    this.setState('last', this._isLast);
  }

  // =====================================================
  // HELPERS
  // =====================================================

  get _total() {
    if (Array.isArray(this.steps) && this.steps.length) return this.steps.length;
    return Math.max(1, Math.floor(Number(this.total) || 1));
  }

  /** current kẹp trong [0, total - 1] */
  get _current() {
    return Math.min(this._total - 1, Math.max(0, Math.floor(Number(this.current) || 0)));
  }

  get _isLast() {
    return this._current >= this._total - 1;
  }

  _titleOf(i) {
    const step = Array.isArray(this.steps) ? this.steps[i] : null;
    if (!step) return '';
    return typeof step === 'string' ? step : step.title || '';
  }

  // =====================================================
  // API
  // =====================================================

  /** Chuyển tới bước `index` (phát change, cancelable). Trả về true nếu đã chuyển */
  goTo(index, direction) {
    const previous = this._current;
    const next = Math.min(this._total - 1, Math.max(0, Math.floor(Number(index) || 0)));
    if (next === previous) return false;
    const dir = direction || (next > previous ? 'next' : 'prev');
    const ok = this.emit('change', { current: next, previous, direction: dir }, { cancelable: true });
    if (!ok) return false;
    this.current = next;
    return true;
  }

  next() {
    return this.goTo(this._current + 1, 'next');
  }

  prev() {
    return this.goTo(this._current - 1, 'prev');
  }

  _finish() {
    this.emit('hui-finish', { current: this._current });
  }
}

defineElement('hui-step-progress', HuiStepProgress);

export default HuiStepProgress;
