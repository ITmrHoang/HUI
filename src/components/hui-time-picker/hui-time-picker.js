/**
 * HUI Time Picker — Chọn giờ / phút / giây (Ant TimePicker + MUI TimePicker), tham gia <form> native.
 * Cột cuộn cho từng đơn vị (bước nhảy riêng), 12 giờ SA/CH, disabledTime, nút "Bây giờ", gõ giờ trực tiếp.
 * Giá trị form luôn 24 giờ 'HH:mm' (hoặc 'HH:mm:ss' khi format có giây).
 */

import styles from './hui-time-picker.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { dmsg } from '../hui-calendar/calendar-panel.js';
import { formatPattern, makeDate, pad, parsePattern } from '../hui-calendar/date-utils.js';
import { HuiPickerBase, baseStyles, floatingCss } from '../hui-date-picker/picker-base.js';
import { TimePanel, timeFormatInfo, timeStyles } from './time-panel.js';


const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** 'HH:mm[:ss]' → { h, m, s } | null */
export function parseTime(value) {
  const m = TIME_RE.exec(String(value ?? '').trim());
  if (!m) return null;
  const [h, mi, s = 0] = m.slice(1).map((x) => Number(x || 0));
  return h > 23 || mi > 59 || s > 59 ? null : { h, m: mi, s };
}

const toSeconds = (v) => v.h * 3600 + v.m * 60 + v.s;

/**
 * Ô chọn giờ với popup các cột giờ / phút / giây.
 * @fires input - Giá trị đổi do người dùng. detail: { value }
 * @fires change - Như input (phát ngay sau input). detail: { value }
 * @fires clear - Bấm nút xóa
 * @fires hui-open - Mở popup
 * @fires hui-close - Đóng popup
 * @csspart base - Khung ngoài
 * @csspart trigger - Khung ô nhập
 * @csspart input - Ô nhập chữ
 * @csspart suffix - Icon đồng hồ
 * @csspart clear - Nút xóa
 * @csspart popup - Popup
 * @csspart time-panel - Vùng các cột
 * @csspart time-column - Mỗi cột (kèm hour-column | minute-column | second-column | meridiem-column)
 * @csspart time-cell - Mỗi ô (kèm time-cell-selected | time-cell-disabled)
 * @csspart footer - Chân popup
 * @csspart now-btn - Nút "Bây giờ"
 * @csspart ok-btn - Nút "Đồng ý"
 * @cssprop --hui-picker-width - Chiều rộng ô nhập
 * @cssprop --hui-picker-height - Chiều cao ô nhập
 * @cssprop --hui-picker-radius - Bo góc ô nhập
 * @cssprop --hui-picker-border-color - Viền
 * @cssprop --hui-picker-focus-border-color - Viền khi focus / mở
 * @cssprop --hui-picker-popup-bg - Nền popup
 * @cssprop --hui-picker-popup-radius - Bo góc popup
 * @cssprop --hui-picker-popup-shadow - Đổ bóng popup
 * @cssprop --hui-time-picker-column-height - Chiều cao cột
 * @cssprop --hui-time-picker-column-width - Chiều rộng cột
 * @cssprop --hui-time-picker-cell-height - Chiều cao ô
 * @cssprop --hui-time-picker-selected-bg - Nền ô đang chọn
 * @cssprop --hui-time-picker-hover-bg - Nền ô khi hover
 */
class HuiTimePicker extends HuiPickerBase {
  static properties = {
    /** Dùng 12 giờ (SA/CH) khi không đặt format — tương đương format "hh:mm A" */
    use12Hours: { type: Boolean, attribute: 'use12-hours' },
    /** Bước nhảy cột giờ */
    hourStep: { type: Number, default: 1 },
    /** Bước nhảy cột phút (vd 15 → 00, 15, 30, 45) */
    minuteStep: { type: Number, default: 1 },
    /** Bước nhảy cột giây */
    secondStep: { type: Number, default: 1 },
    /** Ẩn nút "Bây giờ" */
    hideNow: { type: Boolean },
  };

  static styles = [floatingCss, timeStyles, baseStyles, styles];

  static suffixIcon = 'clock';

  constructor() {
    super();
    this._disabledTime = null;
    /** Giờ tạm khi popup mở ({h,m,s}); undefined = không có */
    this._pending = undefined;
    this._typed = false;
  }

  /** () => { disabledHours?(): number[], disabledMinutes?(h): number[], disabledSeconds?(h, m): number[] } */
  get disabledTime() { return this._disabledTime; }
  set disabledTime(fn) {
    this._disabledTime = typeof fn === 'function' ? fn : null;
    this.requestUpdate('disabledTime');
  }

  get _displayFormat() {
    if (this.format) return this.format;
    return this.use12Hours ? 'hh:mm A' : 'HH:mm';
  }

  get _info() {
    return timeFormatInfo(this._displayFormat);
  }

  get _time() {
    return parseTime(this.value);
  }

  _current() {
    return this._pending !== undefined ? this._pending : this._time;
  }

  // =====================================================
  // DOM
  // =====================================================

  _renderInputs() {
    this._input = createElement('input', { part: 'input', type: 'text', id: 'input' });
    return { nodes: [this._input], inputs: [this._input] };
  }

  _renderPopup() {
    this._panel = new TimePanel({
      disabledTime: () => this._mergedDisabled(),
      onChange: (time) => this._onPick(time),
      onEnter: () => this._confirm(),
      animated: () => this._animated(),
    });
    this._nowBtn = createElement('button', { type: 'button', className: 'hui-picker__link', part: 'now-btn' });
    this._nowBtn.addEventListener('click', () => {
      const n = this._now();
      const time = { h: n.getHours(), m: n.getMinutes(), s: this._info.seconds ? n.getSeconds() : 0 };
      if (!this._isTimeDisabled(time)) this._finish(time);
    });
    this._okBtn = createElement('button', { type: 'button', className: 'hui-picker__ok', part: 'ok-btn' });
    this._okBtn.addEventListener('click', () => this._confirm());
    this._footer = createElement('div', { className: 'hui-picker__footer', part: 'footer' }, this._nowBtn, this._okBtn);
    return createElement('div', { className: 'hui-picker__main' }, this._panel.el, this._footer);
  }

  updated(changed) {
    if (changed.has('locale')) {
      this._nowBtn.textContent = dmsg('datePicker.now');
      this._okBtn.textContent = t('common.ok');
    }
    if (['format', 'use12Hours', 'hourStep', 'minuteStep', 'secondStep', 'locale'].some((k) => changed.has(k))) {
      const info = this._info;
      Object.assign(this._panel.o, {
        showSeconds: info.seconds, use12Hours: info.use12, showMinutes: info.minutes,
        hourStep: this.hourStep, minuteStep: this.minuteStep, secondStep: this.secondStep,
      });
      this._panel.paint();
    }
    if (changed.has('hideNow')) this._nowBtn.hidden = this.hideNow;
    if (['value', 'format', 'use12Hours', 'locale'].some((k) => changed.has(k)) && !this._typed) this._syncInput();
    if (['value', 'disabledTime', 'min', 'max'].some((k) => changed.has(k))) this._panel.setValue(this._current());
    this._syncFooter();
    super.updated(changed);
  }

  _syncPlaceholders() {
    this._input.placeholder = this.placeholder || dmsg('timePicker.placeholder');
  }

  _dialogLabel() {
    return dmsg('timePicker.placeholder');
  }

  _extraClasses() {
    return ['hui-picker--time'];
  }

  _format(time) {
    return time ? formatPattern(makeDate(2000, 0, 1, time.h, time.m, time.s), this._displayFormat) : '';
  }

  _toValue(time) {
    if (!time) return '';
    return `${pad(time.h)}:${pad(time.m)}${this._info.seconds ? `:${pad(time.s)}` : ''}`;
  }

  _syncInput() {
    const text = this._format(this._current());
    if (this._input.value !== text) this._input.value = text;
  }

  _syncFooter() {
    this._okBtn.disabled = this._pending === undefined;
  }

  // =====================================================
  // RÀNG BUỘC (disabledTime + min / max)
  // =====================================================

  /** Gộp disabledTime của người dùng với min / max ('HH:mm[:ss]') */
  _mergedDisabled() {
    const user = this._disabledTime?.() || {};
    const min = parseTime(this.min);
    const max = parseTime(this.max);
    const call = (fn, ...a) => (typeof fn === 'function' ? fn(...a) || [] : []);
    const lo = min ? toSeconds(min) : 0;
    const hi = max ? toSeconds(max) : 86399;
    // Đơn vị bị chặn khi khoảng [đầu, cuối] của nó không giao với [min, max]
    const outside = (from, to) => to < lo || from > hi;
    const all = (n) => Array.from({ length: n }, (_, i) => i);
    const ranged = Boolean(min || max);
    return {
      disabledHours: () => [...call(user.disabledHours),
        ...(ranged ? all(24).filter((h) => outside(h * 3600, h * 3600 + 3599)) : [])],
      disabledMinutes: (h) => [...call(user.disabledMinutes, h),
        ...(ranged ? all(60).filter((m) => outside(h * 3600 + m * 60, h * 3600 + m * 60 + 59)) : [])],
      disabledSeconds: (h, m) => [...call(user.disabledSeconds, h, m),
        ...(ranged ? all(60).filter((s) => outside(h * 3600 + m * 60 + s, h * 3600 + m * 60 + s)) : [])],
    };
  }

  _isTimeDisabled(time) {
    const d = this._mergedDisabled();
    return d.disabledHours().includes(time.h) || d.disabledMinutes(time.h).includes(time.m)
      || (this._info.seconds && d.disabledSeconds(time.h, time.m).includes(time.s));
  }

  // =====================================================
  // POPUP / CHỌN
  // =====================================================

  _onOpen() {
    if (!this._typed) this._pending = undefined;
    this._panel.setValue(this._current());
    this._syncFooter();
  }

  _afterShow() {
    this._panel.syncScroll();
  }

  _focusPanel() {
    this._panel.focus();
  }

  _onPick(time) {
    this._pending = time;
    this._typed = false;
    this._syncInput();
    this._syncFooter();
  }

  _confirm() {
    if (this._pending !== undefined) this._finish(this._pending);
    else this._closePopup({ commit: false, focusInput: true });
  }

  _finish(time) {
    this._commit(time);
    if (this._isOpen) this._closePopup({ commit: false, focusInput: true });
  }

  _commit(time) {
    const value = this._toValue(time);
    this._pending = undefined;
    this._typed = false;
    this._setUserValue(value, { value });
    this._panel.setValue(this._time);
    this._syncInput();
    this._syncFooter();
  }

  _parseText(text) {
    const s = String(text || '').trim();
    if (!s) return null;
    const d = parsePattern(s, this._displayFormat);
    if (d) return { h: d.getHours(), m: d.getMinutes(), s: this._info.seconds ? d.getSeconds() : 0 };
    // Luôn nhận thêm dạng 24 giờ 'HH:mm[:ss]'
    const t24 = parseTime(s);
    return t24 ? { ...t24, s: this._info.seconds ? t24.s : 0 } : null;
  }

  _onInputText() {
    this._typed = true;
    if (!this._isOpen && !this.inline) this._openPopup();
    const time = this._parseText(this._input.value);
    if (!time || this._isTimeDisabled(time)) return;
    this._pending = time;
    this._panel.setValue(time);
    this._syncFooter();
  }

  _commitPending() {
    if (this._typed) {
      const text = this._input.value.trim();
      if (!text) {
        this._commit(null);
        return;
      }
      const time = this._parseText(text);
      if (time && !this._isTimeDisabled(time)) this._commit(time);
      else this._revertPending();
      return;
    }
    if (this._pending !== undefined) this._commit(this._pending);
  }

  _revertPending() {
    this._pending = undefined;
    this._typed = false;
    this._syncInput();
    this._panel.setValue(this._time);
    this._syncFooter();
  }

  _clearValue() {
    this._pending = undefined;
    this._typed = false;
    this._setUserValue('', { value: '' });
    this._panel.setValue(null);
    this._syncInput();
  }

  checkConstraints() {
    const error = super.checkConstraints();
    if (error || this.isDisabled || this._isEmpty()) return error;
    const time = this._time;
    if (!time) return { flags: { badInput: true }, message: dmsg('datePicker.invalid') };
    const min = parseTime(this.min);
    const max = parseTime(this.max);
    if (min && toSeconds(time) < toSeconds(min)) return { flags: { rangeUnderflow: true }, message: t('form.rangeUnderflow', { min: this._format(min) }) };
    if (max && toSeconds(time) > toSeconds(max)) return { flags: { rangeOverflow: true }, message: t('form.rangeOverflow', { max: this._format(max) }) };
    return null;
  }
}

defineElement('hui-time-picker', HuiTimePicker);

export default HuiTimePicker;
