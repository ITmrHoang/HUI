/**
 * HUI Statistic Countdown — Đếm ngược tới một thời điểm (Ant Statistic.Countdown). Xem JSDoc của class.
 */

import { defineElement } from '../../core/hui-element.js';
import { HuiStatistic } from './hui-statistic.js';

/** Đơn vị thời gian theo thứ tự lớn → nhỏ (Y = 365 ngày, M = 30 ngày như Ant) */
const UNITS = [
  ['Y', 1000 * 60 * 60 * 24 * 365],
  ['M', 1000 * 60 * 60 * 24 * 30],
  ['D', 1000 * 60 * 60 * 24],
  ['H', 1000 * 60 * 60],
  ['m', 1000 * 60],
  ['s', 1000],
  ['S', 1],
];

/**
 * Định dạng khoảng thời gian (ms). Token lặp = số chữ số tối thiểu ("HH" → 05).
 * Chỉ token có mặt mới "ăn" thời gian: "HH:mm" với 2 ngày → "48:00".
 * S/SS/SSS = 1/2/3 chữ số đầu của mili giây. Chữ trong [ngoặc vuông] giữ nguyên.
 */
export function formatCountdown(duration, format = 'HH:mm:ss') {
  let left = Math.max(0, duration);
  const escaped = format.match(/\[[^\]]*]/g) || [];
  let out = format.replace(/\[[^\]]*]/g, '[]');
  for (const [token, unit] of UNITS) {
    if (!out.includes(token)) continue;
    const value = Math.floor(left / unit);
    left -= value * unit;
    out = out.replace(new RegExp(`${token}+`, 'g'), (match) => (token === 'S'
      ? String(value).padStart(3, '0').slice(0, match.length)
      : String(value).padStart(match.length, '0')));
  }
  let i = 0;
  return out.replace(/\[]/g, () => escaped[i++].slice(1, -1));
}

/** Timestamp (ms) / chuỗi số / chuỗi ngày ISO → ms; không hợp lệ → NaN */
function toTimestamp(v) {
  if (v === null || v === undefined || v === '') return NaN;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const raw = String(v).trim();
  return /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : Date.parse(raw);
}

/**
 * Kế thừa toàn bộ API hiển thị của <hui-statistic> (title, prefix, suffix, type, loading, slots, parts).
 * Đích đã qua ngay từ đầu → hiển thị 0, không phát hui-finish (giống Ant).
 *
 * @fires hui-finish - Đếm ngược về 0
 * @fires hui-change - Mỗi lần chuỗi hiển thị đổi (detail { remaining } — ms còn lại)
 */
class HuiStatisticCountdown extends HuiStatistic {
  static properties = {
    /** Thời điểm đích: timestamp ms (vd Date.now() + 60000) hoặc chuỗi ngày ISO */
    value: { type: String },
    /** Định dạng: Y M D H m s S (lặp để thêm số 0), chữ trong [ ] giữ nguyên. Mặc định "HH:mm:ss" */
    format: { type: String, default: 'HH:mm:ss' },
  };

  connectedCallback() {
    super.connectedCallback();
    // Gắn lại sau khi bị tháo → chạy tiếp
    if (this._timerPaused) this._startTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._timerPaused = Boolean(this._timer);
    this._stopTimer();
  }

  updated(changed) {
    super.updated(changed);
    if (changed.has('format') && !changed.has('value')) this._startTimer();
  }

  /** Thay hành vi đếm dần của hui-statistic bằng đồng hồ đếm ngược */
  _valueChanged() {
    this._startTimer();
  }

  /** Số ms còn lại tới đích */
  get remaining() {
    const target = toTimestamp(this.value);
    return Number.isFinite(target) ? Math.max(0, target - Date.now()) : 0;
  }

  _startTimer() {
    this._stopTimer();
    this._timerPaused = false;
    const target = toTimestamp(this.value);
    this._tick(false);
    if (!Number.isFinite(target) || target <= Date.now()) return;
    // Có mili giây → ~30 khung/giây; không có → 10 lần/giây là đủ để giây nhảy đúng lúc
    const interval = this.format.includes('S') ? 1000 / 30 : 100;
    this._timer = setInterval(() => this._tick(true), interval);
  }

  _stopTimer() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  _tick(running) {
    const remaining = this.remaining;
    const text = Number.isFinite(toTimestamp(this.value)) ? formatCountdown(remaining, this.format || 'HH:mm:ss') : '';
    if (text !== this._text) {
      this._text = text;
      this._int.textContent = text;
      this._decimal.textContent = '';
      this._decimal.hidden = true;
      if (running) this.emit('hui-change', { remaining });
    }
    if (running && remaining <= 0) {
      this._stopTimer();
      this.emit('hui-finish');
    }
  }
}

defineElement('hui-statistic-countdown', HuiStatisticCountdown);

export default HuiStatisticCountdown;
