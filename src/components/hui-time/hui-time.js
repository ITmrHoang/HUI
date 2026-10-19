/**
 * HUI Time — Hiển thị thời điểm (Atom): tương đối "3 phút trước" tự cập nhật, hoặc ngày/giờ tuyệt đối theo locale.
 * Dựng thẻ <time datetime="ISO"> chuẩn ngữ nghĩa, tooltip (title) là ngày giờ đầy đủ.
 */

import styles from './hui-time.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { toDate, formatDate, relativeTime } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';

const DATE_STYLES = ['short', 'medium', 'long', 'full'];
const FULL_STYLE = { dateStyle: 'full', timeStyle: 'short' };

/**
 * Chu kỳ làm mới theo độ xa của thời điểm: < 1 phút → 10 giây, < 1 giờ → mỗi phút, còn lại → mỗi giờ.
 * @param {number} diffMs - khoảng cách tới hiện tại (ms, có thể âm)
 */
export function refreshInterval(diffMs) {
  const abs = Math.abs(diffMs) / 1000;
  if (abs < 60) return 10_000;
  if (abs < 3600) return 60_000;
  return 3_600_000;
}

/**
 * Chuỗi hiển thị theo `format`:
 *   relative | date | date:short | date:long | date:full | datetime | time
 */
export function formatTime(value, fmt = 'relative', now = Date.now()) {
  const [kind, arg] = String(fmt || 'relative').split(':');
  switch (kind) {
    case 'date': return formatDate(value, DATE_STYLES.includes(arg) ? arg : 'medium');
    case 'datetime': return formatDate(value, 'datetime');
    case 'time': return formatDate(value, 'time');
    case 'short': case 'medium': case 'long': case 'full': return formatDate(value, kind);
    default: return relativeTime(value, now);
  }
}

/**
 * Thời điểm. Nội dung light DOM (nếu có) chỉ là chữ dự phòng khi JS chưa chạy.
 * Ngôn ngữ đổi (setLocale) → tự vẽ lại.
 *
 * @csspart base - Thẻ <time> bên trong
 * @cssprop --hui-time-color - Màu chữ
 * @cssprop --hui-time-font-size - Cỡ chữ
 * @cssprop --hui-time-decoration - text-decoration khi có tooltip (mặc định none, vd `underline dotted`)
 */
class HuiTime extends HuiElement {
  static localized = true;

  static properties = {
    /** Thời điểm: chuỗi ISO ("2026-10-20T08:00:00Z"), timestamp ms, hoặc chuỗi ngày bất kỳ Date hiểu được */
    datetime: { type: String },
    /** relative | date | date:short | date:long | date:full | datetime | time — relative tự cập nhật */
    format: { type: String, default: 'relative' },
    /** Không gắn tooltip (title) ngày giờ đầy đủ */
    noTooltip: { type: Boolean },
    /** Không tự cập nhật chuỗi tương đối */
    noRefresh: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._timer = null;
  }

  /** Date đã chuẩn hóa (null nếu không hợp lệ) */
  get date() {
    return toDate(this.datetime);
  }

  connectedCallback() {
    super.connectedCallback();
    // Tab ẩn lâu rồi quay lại → làm mới ngay thay vì chờ chu kỳ kế
    this.listen(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') this.refresh();
    });
    this._schedule();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
    this._timer = null;
  }

  render() {
    this._time = createElement('time', { className: 'time', part: 'base' });
    return this._time;
  }

  updated() {
    this._paint();
    this._schedule();
  }

  /** Vẽ lại chuỗi ngay (vd sau khi đồng bộ giờ) */
  refresh() {
    this._paint();
    this._schedule();
  }

  _isRelative() {
    const kind = String(this.format || 'relative').split(':')[0];
    return !['date', 'datetime', 'time', ...DATE_STYLES].includes(kind);
  }

  _paint() {
    const d = this.date;
    this._time.textContent = d ? formatTime(d, this.format) : (this.datetime || '');
    if (d) this._time.setAttribute('datetime', d.toISOString());
    else this._time.removeAttribute('datetime');
    const full = d && !this.noTooltip ? formatDate(d, FULL_STYLE) : '';
    if (full) this._time.title = full;
    else this._time.removeAttribute('title');
    this._time.classList.toggle('time--tip', Boolean(full));
  }

  _schedule() {
    clearTimeout(this._timer);
    this._timer = null;
    const d = this.date;
    if (!d || !this.isConnected || this.noRefresh || !this._isRelative()) return;
    this._timer = setTimeout(() => this.refresh(), refreshInterval(d.getTime() - Date.now()));
  }
}

defineElement('hui-time', HuiTime);

export default HuiTime;
