/**
 * HUI Countdown — Đếm ngược sự kiện / flash sale (Molecule): các ô ngày / giờ / phút / giây.
 * variant: blocks (ô số) | flip (đồng hồ lật) | inline (một dòng chữ). Ý tưởng tính thời gian giống hui-statistic-countdown.
 */

import styles from './hui-countdown.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';

/** Chuỗi chưa có trong locale.js → bản dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  'countdown.label': { vi: 'Đếm ngược', en: 'Countdown' },
  'countdown.days': { vi: 'Ngày', en: 'Days' },
  'countdown.hours': { vi: 'Giờ', en: 'Hours' },
  'countdown.minutes': { vi: 'Phút', en: 'Minutes' },
  'countdown.seconds': { vi: 'Giây', en: 'Seconds' },
};

function msg(key) {
  const v = t(key);
  if (v !== key) return v;
  return FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
}

/** Đơn vị: chữ cái trong `format` → [tên, ms, khóa locale] */
const UNITS = [
  ['d', 86_400_000, 'days'],
  ['h', 3_600_000, 'hours'],
  ['m', 60_000, 'minutes'],
  ['s', 1000, 'seconds'],
];

const VARIANTS = ['blocks', 'flip', 'inline'];
const SIZES = ['sm', 'md', 'lg'];

/** Timestamp (ms) / chuỗi số / chuỗi ngày ISO → ms; không hợp lệ → NaN */
export function toTimestamp(v) {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const raw = String(v).trim();
  return /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : Date.parse(raw);
}

/**
 * Tách ms còn lại thành các đơn vị được hiển thị — đơn vị lớn nhất "ăn" phần dư:
 * format "hms" với 2 ngày → { h: 48, m: 0, s: 0 }.
 * @param {number} ms
 * @param {string[]} keys - vd ['d','h','m','s']
 */
export function splitDuration(ms, keys = ['d', 'h', 'm', 's']) {
  let left = Math.max(0, Math.floor(ms / 1000) * 1000);
  const out = {};
  for (const [key, unit] of UNITS) {
    if (!keys.includes(key)) continue;
    out[key] = Math.floor(left / unit);
    left -= out[key] * unit;
  }
  return out;
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * Đồng hồ đếm ngược. Đích đã qua ngay từ đầu → hiện 0, không phát hui-finish.
 * Khi về 0: phát hui-finish, bật :state(finished); có slot "finished" thì thay các ô số bằng nội dung đó.
 *
 * @fires hui-tick - Mỗi giây. detail: { remaining, days, hours, minutes, seconds }
 * @fires hui-finish - Đếm về 0 (chỉ khi đích ở tương lai lúc bắt đầu)
 * @slot finished - Nội dung hiện khi đã hết giờ (thay cho các ô số)
 * @csspart base - Khung ngoài (role="timer")
 * @csspart unit - Mỗi đơn vị; kèm unit-days | unit-hours | unit-minutes | unit-seconds
 * @csspart value - Ô số
 * @csspart label - Nhãn đơn vị ("Ngày", "Giờ"...)
 * @csspart separator - Dấu phân cách giữa các ô
 * @cssprop --hui-countdown-gap - Khoảng cách giữa các ô
 * @cssprop --hui-countdown-font-size - Cỡ chữ số
 * @cssprop --hui-countdown-font-weight - Độ đậm chữ số
 * @cssprop --hui-countdown-color - Màu chữ số
 * @cssprop --hui-countdown-bg - Nền ô số (blocks / flip)
 * @cssprop --hui-countdown-radius - Bo góc ô số
 * @cssprop --hui-countdown-min-width - Bề rộng tối thiểu ô số
 * @cssprop --hui-countdown-shadow - Đổ bóng ô số
 * @cssprop --hui-countdown-label-color - Màu nhãn
 * @cssprop --hui-countdown-label-size - Cỡ chữ nhãn
 * @cssprop --hui-countdown-separator-color - Màu dấu phân cách
 * @cssprop --hui-countdown-flip-duration - Thời lượng lật (mặc định 600ms)
 */
class HuiCountdown extends HuiElement {
  static localized = true;

  static properties = {
    /** Thời điểm đích: chuỗi ISO ("2026-12-31T23:59:59+07:00") hoặc timestamp ms */
    target: { type: String },
    /** blocks | flip | inline — ô số / đồng hồ lật / một dòng chữ */
    variant: { type: String, default: 'blocks' },
    /** Các đơn vị hiển thị (chữ cái d h m s), vd "hms" để ẩn ngày — đơn vị lớn nhất gộp phần dư */
    format: { type: String, default: 'dhms' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Ẩn nhãn đơn vị */
    hideLabels: { type: Boolean },
    /** Ký tự phân cách giữa các ô (blocks / flip); chuỗi rỗng = không có */
    separator: { type: String, default: ':' },
    /** Tên cho trình đọc màn hình (mặc định "Đếm ngược") */
    label: { type: String },
    /** Tắt hiệu ứng lật */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._timer = null;
    this._units = [];      // [{ key, valueEl, card, text }]
    this._finished = false;
    this._running = false;
  }

  /** Số ms còn lại tới đích (0 khi đã qua / không hợp lệ) */
  get remaining() {
    const target = toTimestamp(this.target);
    return Number.isFinite(target) ? Math.max(0, target - Date.now()) : 0;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._hasRendered && !this._timer) this._start();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stop();
  }

  render() {
    this._visual = createElement('span', { className: 'cd__units', 'aria-hidden': 'true' });
    this._sr = createElement('span', { className: 'cd__sr' });
    this._finishedSlot = createElement('slot', { name: 'finished' });
    this._finishedSlot.addEventListener('slotchange', () => this._syncFinished());
    this._finishedWrap = createElement('span', { className: 'cd__finished', part: 'finished' }, this._finishedSlot);
    this._base = createElement('span', { className: 'cd', part: 'base', role: 'timer' },
      this._visual, this._sr, this._finishedWrap);
    return this._base;
  }

  updated(changed) {
    const variant = VARIANTS.includes(this.variant) ? this.variant : 'blocks';
    if (['variant', 'size', 'hideLabels'].some((k) => changed.has(k))) {
      this._base.className = `cd cd--${variant} cd--${SIZES.includes(this.size) ? this.size : 'md'}${this.hideLabels ? ' cd--no-labels' : ''}`;
    }
    if (['variant', 'format', 'separator', 'hideLabels', 'locale'].some((k) => changed.has(k))) this._build();
    if (changed.has('label') || changed.has('locale')) {
      this._base.setAttribute('aria-label', this.label || msg('countdown.label'));
    }
    if (changed.has('target')) this._start();
    else this._paint(false);
  }

  /** Các đơn vị theo `format` (giữ thứ tự d → s); rỗng → đủ 4 */
  get _keys() {
    const f = String(this.format || '').toLowerCase();
    const keys = UNITS.map(([k]) => k).filter((k) => f.includes(k));
    return keys.length ? keys : ['d', 'h', 'm', 's'];
  }

  _build() {
    const flip = this.variant === 'flip';
    const sep = this.variant === 'inline' ? '' : (this.separator ?? '');
    const nodes = [];
    this._units = this._keys.map((key, i) => {
      const name = UNITS.find(([k]) => k === key)[2];
      const valueEl = createElement('span', { className: 'cd__value', part: 'value' });
      let card = null;
      if (flip) {
        // 4 nửa: tĩnh trên (số mới) / tĩnh dưới (số cũ) / lá trên lật xuống (số cũ) / lá dưới lật vào (số mới)
        const half = (cls) => createElement('span', { className: `cd__half ${cls}` }, createElement('span', {}));
        card = createElement('span', { className: 'cd__card' },
          half('cd__half--top'), half('cd__half--bottom'), half('cd__leaf cd__leaf--top'), half('cd__leaf cd__leaf--bottom'));
        card.querySelectorAll('.cd__leaf').forEach((l) => { l.hidden = true; });
        valueEl.append(card);
      }
      const labelEl = createElement('span', { className: 'cd__label', part: 'label' }, msg(`countdown.${name}`));
      labelEl.hidden = this.hideLabels;
      if (i > 0 && sep) nodes.push(createElement('span', { className: 'cd__sep', part: 'separator' }, sep));
      nodes.push(createElement('span', { className: `cd__unit cd__unit--${name}`, part: `unit unit-${name}` }, valueEl, labelEl));
      return { key, name, valueEl, card, text: null };
    });
    this._visual.replaceChildren(...nodes);
    this._paint(false);
  }

  _start() {
    this._stop();
    const target = toTimestamp(this.target);
    this._finished = false;
    this._running = Number.isFinite(target) && target > Date.now();
    this._paint(false);
    if (this._running) this._scheduleTick();
    this._syncFinished();
  }

  _stop() {
    clearTimeout(this._timer);
    this._timer = null;
  }

  /** Hẹn lần vẽ kế tiếp đúng lúc giây đổi (không trôi như setInterval) */
  _scheduleTick() {
    const rem = this.remaining;
    const delay = (rem % 1000) || 1000;
    this._timer = setTimeout(() => this._tick(), delay + 5);
  }

  _tick() {
    this._timer = null;
    const rem = this.remaining;
    this._paint(true);
    const d = splitDuration(rem);
    this.emit('hui-tick', { remaining: rem, days: d.d, hours: d.h, minutes: d.m, seconds: d.s });
    if (rem <= 0) {
      this._running = false;
      this._finished = true;
      this._syncFinished();
      this.emit('hui-finish');
      return;
    }
    if (this.isConnected) this._scheduleTick();
  }

  _canFlip() {
    return !this.noAnimation && !animationsDisabled() && typeof Element.prototype.animate === 'function';
  }

  /** Vẽ giá trị hiện tại vào các ô; `animate` = cho phép lật (chỉ khi đồng hồ chạy) */
  _paint(animate) {
    if (!this._units.length) return;
    const parts = splitDuration(this.remaining, this._keys);
    const srParts = [];
    for (const u of this._units) {
      const text = pad(parts[u.key]);
      srParts.push(`${parts[u.key]} ${msg(`countdown.${u.name}`).toLowerCase()}`);
      if (u.text === text) continue;
      const prev = u.text;
      u.text = text;
      if (u.card) this._flipTo(u.card, prev ?? text, text, animate && prev !== null && this._canFlip());
      else u.valueEl.textContent = text;
    }
    this._sr.textContent = srParts.join(' ');
  }

  _flipTo(card, prev, next, animate) {
    const [top, bottom, leafTop, leafBottom] = card.children;
    const set = (el, v) => { el.firstChild.textContent = v; };
    card._anims?.forEach((a) => a.cancel());
    card._anims = null;
    card.style.setProperty('--_cd-chars', String(next.length)); // >99 ngày → ô rộng ra
    if (!animate) {
      [top, bottom, leafTop, leafBottom].forEach((el) => set(el, next));
      leafTop.hidden = true;
      leafBottom.hidden = true;
      return;
    }
    set(top, next);
    set(bottom, prev);
    set(leafTop, prev);
    set(leafBottom, next);
    leafTop.hidden = false;
    leafBottom.hidden = false;
    const raw = getComputedStyle(this).getPropertyValue('--hui-countdown-flip-duration').trim();
    const total = parseFloat(raw) * (raw.endsWith('ms') || !raw.endsWith('s') ? 1 : 1000) || 600;
    const half = Math.min(total, 900) / 2;
    const a1 = leafTop.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }],
      { duration: half, easing: 'ease-in', fill: 'forwards' });
    const a2 = leafBottom.animate([{ transform: 'rotateX(90deg)' }, { transform: 'rotateX(0deg)' }],
      { duration: half, delay: half, easing: 'ease-out', fill: 'both' });
    card._anims = [a1, a2];
    a2.finished.then(() => {
      set(bottom, next);
      leafTop.hidden = true;
      leafBottom.hidden = true;
      a1.cancel();
      a2.cancel();
      card._anims = null;
    }, () => {});
  }

  /** Hết giờ + slot finished có nội dung → thay các ô số */
  _syncFinished() {
    const hasContent = this._finishedSlot.assignedNodes({ flatten: true })
      .some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    const showFinished = this._finished && hasContent;
    this._visual.hidden = showFinished;
    this._sr.hidden = showFinished;
    this._finishedWrap.hidden = !showFinished;
    this.setState('finished', this._finished);
  }
}

defineElement('hui-countdown', HuiCountdown);

export default HuiCountdown;
