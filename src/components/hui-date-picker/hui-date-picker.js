/**
 * HUI Date Picker — Chọn ngày / tuần / tháng / quý / năm (+ giờ) (Ant DatePicker + MUI DatePicker), tham gia <form>.
 * Hiển thị theo `format` (mặc định theo locale: vi DD/MM/YYYY), giá trị form luôn là ISO (YYYY-MM-DD…).
 * Gõ ngày vào ô nhập được đọc theo `format`. Không dùng thư viện ngày giờ (xem hui-calendar/date-utils.js).
 */

import styles from './hui-date-picker.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { CalendarPanel, dmsg, panelStyles } from '../hui-calendar/calendar-panel.js';
import {
  compareUnit, defaultFormat, endOfUnit, formatPattern, isSameUnit, isValidDate, localeWeekStart, makeDate, parseISO,
  parsePattern, startOfDay, startOfWeek, toISO,
} from '../hui-calendar/date-utils.js';
import { TimePanel, timeFormatInfo, timeStyles } from '../hui-time-picker/time-panel.js';
import { HuiPickerBase, baseStyles, floatingCss, resolvePresetValue } from './picker-base.js';

const PICKERS = ['date', 'week', 'month', 'quarter', 'year'];

/**
 * Ô chọn ngày với popup lịch, tham gia <form> native.
 * @fires input - Giá trị đổi do người dùng (chọn ô / gõ + Enter / preset / xóa). detail: { value, date }
 * @fires change - Như input (phát ngay sau input). detail: { value, date }
 * @fires clear - Bấm nút xóa
 * @fires hui-open - Mở popup
 * @fires hui-close - Đóng popup
 * @csspart base - Khung ngoài
 * @csspart trigger - Khung ô nhập
 * @csspart input - Ô nhập chữ
 * @csspart suffix - Icon lịch
 * @csspart clear - Nút xóa
 * @csspart popup - Popup
 * @csspart presets - Cột chọn nhanh
 * @csspart preset - Mỗi nút chọn nhanh
 * @csspart panel - Bảng lịch (xem part của hui-calendar: header, nav-btn, title-btn, grid, cell…)
 * @csspart time-panel - Cột giờ (show-time) — time-column, time-cell
 * @csspart footer - Chân popup
 * @csspart today-btn - Nút "Hôm nay"
 * @csspart now-btn - Nút "Bây giờ" (show-time)
 * @csspart ok-btn - Nút "Đồng ý" (show-time)
 * @cssprop --hui-picker-width - Chiều rộng ô nhập
 * @cssprop --hui-picker-height - Chiều cao ô nhập
 * @cssprop --hui-picker-radius - Bo góc ô nhập
 * @cssprop --hui-picker-bg - Nền ô nhập
 * @cssprop --hui-picker-border-color - Viền
 * @cssprop --hui-picker-hover-border-color - Viền khi hover
 * @cssprop --hui-picker-focus-border-color - Viền khi focus / mở
 * @cssprop --hui-picker-focus-shadow - Vòng sáng khi focus
 * @cssprop --hui-picker-icon-color - Màu icon
 * @cssprop --hui-picker-popup-bg - Nền popup
 * @cssprop --hui-picker-popup-radius - Bo góc popup
 * @cssprop --hui-picker-popup-shadow - Đổ bóng popup
 * @cssprop --hui-picker-presets-width - Chiều rộng cột chọn nhanh
 * @cssprop --hui-calendar-panel-width - Chiều rộng bảng lịch
 * @cssprop --hui-calendar-selected-bg - Nền ô đang chọn (cùng các biến --hui-calendar-* khác)
 */
class HuiDatePicker extends HuiPickerBase {
  static properties = {
    /** date | week | month | quarter | year — đơn vị chọn; value: YYYY-MM-DD | YYYY-Www | YYYY-MM | YYYY-Qn | YYYY */
    picker: { type: String, default: 'date' },
    /** Thêm cột giờ (picker date) — value 'YYYY-MM-DDTHH:mm' (có giây nếu time-format có ss) */
    showTime: { type: Boolean },
    /** HH:mm | HH:mm:ss | hh:mm A — mẫu giờ khi show-time (A = SA/CH, AM/PM) */
    timeFormat: { type: String, default: 'HH:mm' },
    /** Bước nhảy cột giờ */
    hourStep: { type: Number, default: 1 },
    /** Bước nhảy cột phút */
    minuteStep: { type: Number, default: 1 },
    /** Bước nhảy cột giây */
    secondStep: { type: Number, default: 1 },
    /** [{ label, value }] — value: chuỗi ISO, Date hoặc hàm trả về Date (tính lúc bấm) */
    presets: { type: Array, default: [] },
    /** Tháng hiện khi mở popup lúc chưa có giá trị (ISO) */
    defaultPickerValue: { type: String, default: '' },
    /** Hiện cột số tuần (picker week luôn hiện) */
    showWeek: { type: Boolean },
  };

  static styles = [floatingCss, panelStyles, timeStyles, baseStyles, styles];

  static suffixIcon = 'calendar';

  constructor() {
    super();
    this._disabledDate = null;
    this._disabledTime = null;
    /** Giá trị tạm khi popup đang mở (show-time / đang gõ); undefined = không có */
    this._pending = undefined;
    this._typed = false;
  }

  // =====================================================
  // JS PROPERTIES
  // =====================================================

  /** (date: Date) => boolean — true = không chọn được (gọi cho ô thuộc đơn vị picker) */
  get disabledDate() { return this._disabledDate; }
  set disabledDate(fn) {
    this._disabledDate = typeof fn === 'function' ? fn : null;
    this.requestUpdate('disabledDate');
  }

  /** (date: Date | null) => { disabledHours?(), disabledMinutes?(h), disabledSeconds?(h, m) } — show-time */
  get disabledTime() { return this._disabledTime; }
  set disabledTime(fn) {
    this._disabledTime = typeof fn === 'function' ? fn : null;
    this.requestUpdate('disabledTime');
  }

  /** Giá trị dạng Date (null nếu rỗng / không hợp lệ) */
  get valueAsDate() {
    return this._date;
  }

  get _weekStart() {
    return localeWeekStart();
  }

  get _picker() {
    return PICKERS.includes(this.picker) ? this.picker : 'date';
  }

  get _withTime() {
    return this.showTime && this._picker === 'date';
  }

  get _timeInfo() {
    return timeFormatInfo(this.timeFormat || 'HH:mm');
  }

  /** Loại chuỗi ISO của value */
  get _kind() {
    if (this._picker !== 'date') return this._picker;
    if (!this._withTime) return 'date';
    return this._timeInfo.seconds ? 'datetime-seconds' : 'datetime';
  }

  get _displayFormat() {
    return this.format || defaultFormat(this._picker, { showTime: this._withTime, timeFormat: this.timeFormat || 'HH:mm' });
  }

  get _date() {
    return parseISO(this.value, { weekStart: this._weekStart });
  }

  /** Giá trị đang hiển thị trên bảng: tạm (nếu có) hoặc value */
  _current() {
    return this._pending !== undefined ? this._pending : this._date;
  }

  // =====================================================
  // DOM
  // =====================================================

  _renderInputs() {
    this._input = createElement('input', { part: 'input', type: 'text', id: 'input' });
    return { nodes: [this._input], inputs: [this._input] };
  }

  _renderPopup() {
    this._panel = new CalendarPanel({
      picker: this._picker,
      weekStart: this._weekStart,
      now: () => this._now(),
      isDisabled: (date, unit) => this._isCellDisabled(date, unit),
      cellState: (date, unit) => this._cellState(date, unit),
      onSelect: (date) => this._onSelect(date),
      animated: () => this._animated(),
    });
    this._time = new TimePanel({
      disabledTime: () => this._disabledTime?.(this._current()) || {},
      onChange: (time) => this._onTimeChange(time),
      onEnter: () => this._confirm(),
      animated: () => this._animated(),
    });

    this._presetBox = createElement('div', { className: 'hui-picker__presets', part: 'presets', role: 'group' });
    this._presetBox.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn) return;
      const preset = this.presets?.[Number(btn.dataset.preset)];
      const d = preset ? resolvePresetValue(preset.value, this._weekStart) : null;
      if (isValidDate(d) && !this._isValueDisabled(d)) this._finish(d);
    });

    this._todayBtn = createElement('button', { type: 'button', className: 'hui-picker__link', part: 'today-btn' });
    this._todayBtn.addEventListener('click', () => {
      const now = this._now();
      if (!this._isValueDisabled(now)) this._finish(startOfDay(now));
    });
    this._nowBtn = createElement('button', { type: 'button', className: 'hui-picker__link', part: 'now-btn' });
    this._nowBtn.addEventListener('click', () => {
      const now = this._now();
      if (!this._isValueDisabled(now)) this._finish(now);
    });
    this._okBtn = createElement('button', { type: 'button', className: 'hui-picker__ok', part: 'ok-btn' });
    this._okBtn.addEventListener('click', () => this._confirm());
    this._footer = createElement('div', { className: 'hui-picker__footer', part: 'footer' }, this._todayBtn, this._nowBtn, this._okBtn);

    const panels = createElement('div', { className: 'hui-picker__panels' }, this._panel.el, this._time.el);
    const main = createElement('div', { className: 'hui-picker__main' }, panels, this._footer);
    return createElement('div', { className: 'hui-picker__layout' }, this._presetBox, main);
  }

  updated(changed) {
    // value gán bằng Date → chuẩn hóa về ISO
    if (this.value instanceof Date) {
      this._props.value = isValidDate(this.value) ? toISO(this.value, this._kind, { weekStart: this._weekStart }) : '';
      changed.set('value', undefined);
    }
    const panel = this._panel;
    if (changed.has('locale')) {
      panel.o.weekStart = this._weekStart;
      this._todayBtn.textContent = dmsg('datePicker.today');
      this._nowBtn.textContent = dmsg('datePicker.now');
      this._okBtn.textContent = t('common.ok');
      this._presetBox.setAttribute('aria-label', dmsg('datePicker.presets'));
    }
    if (changed.has('picker') || changed.has('showWeek')) {
      panel.o.picker = this._picker;
      panel.o.showWeekNumber = this.showWeek || this._picker === 'week';
      panel.view = panel.baseView;
    }
    if (['showTime', 'picker', 'timeFormat', 'hourStep', 'minuteStep', 'secondStep', 'locale'].some((k) => changed.has(k))) {
      const info = this._timeInfo;
      this._time.o.showSeconds = info.seconds;
      this._time.o.use12Hours = info.use12;
      this._time.o.hourStep = this.hourStep;
      this._time.o.minuteStep = this.minuteStep;
      this._time.o.secondStep = this.secondStep;
      this._time.el.hidden = !this._withTime;
      if (this._withTime) this._time.paint();
      this._todayBtn.hidden = this._withTime || this._picker !== 'date';
      this._nowBtn.hidden = !this._withTime;
      this._okBtn.hidden = !this._withTime;
      this._footer.hidden = this._picker !== 'date';
    }
    if (changed.has('presets')) this._renderPresets();
    if (['value', 'format', 'picker', 'showTime', 'timeFormat', 'locale'].some((k) => changed.has(k))) {
      if (!this._typed) this._syncInput();
    }
    const repaint = ['locale', 'picker', 'showWeek', 'value', 'min', 'max', 'now', 'disabledDate'].some((k) => changed.has(k));
    if (repaint && (this._isOpen || this.inline)) {
      if (changed.has('value') && this._pending === undefined) this._moveToCurrent();
      const focused = panel.hasFocus;
      panel.paint();
      if (focused) panel.focus();
    }
    if (changed.has('disabledTime') || changed.has('value')) this._time.setValue(this._timeOf(this._current()));
    this._syncFooter();
    super.updated(changed);
  }

  _renderPresets() {
    const list = Array.isArray(this.presets) ? this.presets : [];
    this._presetBox.replaceChildren(...list.map((p, i) => createElement('button', {
      type: 'button', className: 'hui-picker__preset', part: 'preset', dataset: { preset: String(i) },
    }, String(p?.label ?? ''))));
    this._presetBox.hidden = !list.length;
  }

  _syncPlaceholders() {
    const key = {
      week: 'datePicker.weekPlaceholder', month: 'datePicker.monthPlaceholder',
      quarter: 'datePicker.quarterPlaceholder', year: 'datePicker.yearPlaceholder',
    }[this._picker] || (this._withTime ? 'datePicker.dateTimePlaceholder' : 'datePicker.placeholder');
    this._input.placeholder = this.placeholder || dmsg(key);
  }

  _extraClasses() {
    return [this._withTime && 'hui-picker--datetime'];
  }

  _syncInput() {
    const d = this._current();
    const text = d ? formatPattern(d, this._displayFormat, { weekStart: this._weekStart }) : '';
    if (this._input.value !== text) this._input.value = text;
  }

  _syncFooter() {
    this._okBtn.disabled = this._pending === undefined;
    const now = this._now();
    this._todayBtn.disabled = this._isValueDisabled(now);
    this._nowBtn.disabled = this._isValueDisabled(now);
  }

  // =====================================================
  // TRẠNG THÁI Ô
  // =====================================================

  _timeOf(d) {
    return d ? { h: d.getHours(), m: d.getMinutes(), s: this._timeInfo.seconds ? d.getSeconds() : 0 } : null;
  }

  /** Đơn vị của ô ở view gốc (week picker: ô ngày) */
  get _baseUnit() {
    return this._picker === 'week' ? 'date' : this._picker;
  }

  _isCellDisabled(date, unit) {
    const ws = this._weekStart;
    const min = parseISO(this.min, { weekStart: ws });
    const max = parseISO(this.max, { weekStart: ws });
    if (unit === this._baseUnit) {
      if (min && compareUnit(date, min, unit, ws) < 0) return true;
      if (max && compareUnit(date, max, unit, ws) > 0) return true;
      return Boolean(this._disabledDate?.(date));
    }
    // View cấp trên (đang đi lên để chọn tháng / năm): chỉ vô hiệu khi nằm trọn ngoài [min, max]
    if (min && compareUnit(endOfUnit(date, unit), min) < 0) return true;
    if (max && compareUnit(date, max) > 0) return true;
    return false;
  }

  /** Giá trị d (sau khi chọn / gõ) có bị chặn không */
  _isValueDisabled(d) {
    if (!d) return true;
    const unit = this._baseUnit;
    const cell = this._picker === 'week' ? startOfWeek(d, this._weekStart) : d;
    if (this._picker === 'week') {
      // Tuần bị chặn khi mọi ngày trong tuần bị chặn
      return Array.from({ length: 7 }, (_, i) => makeDate(cell.getFullYear(), cell.getMonth(), cell.getDate() + i))
        .every((x) => this._isCellDisabled(x, 'date'));
    }
    return this._isCellDisabled(cell, unit);
  }

  _cellState(date, unit) {
    const cur = this._current();
    if (!cur) return null;
    if (this._picker === 'week' && unit === 'date') return { weekSelected: isSameUnit(date, cur, 'week', this._weekStart) };
    return { selected: compareUnit(date, cur, unit, this._weekStart) === 0 };
  }

  // =====================================================
  // POPUP
  // =====================================================

  /** Đưa bảng về tháng của giá trị hiện tại (hoặc default-picker-value / hôm nay) */
  _moveToCurrent() {
    const panel = this._panel;
    const d = this._current() || parseISO(this.defaultPickerValue, { weekStart: this._weekStart }) || this._now();
    panel.view = panel.baseView;
    panel.activeDate = makeDate(d.getFullYear(), d.getMonth(), d.getDate());
    panel.viewDate = panel._viewDateFor(panel.activeDate);
  }

  _onOpen() {
    if (!this._typed) this._pending = undefined;
    this._moveToCurrent();
    this._panel.paint();
    this._time.setValue(this._timeOf(this._current()));
    this._syncFooter();
  }

  _afterShow() {
    this._time.syncScroll();
  }

  _focusPanel() {
    this._panel.focus();
  }

  // =====================================================
  // CHỌN
  // =====================================================

  _onSelect(date) {
    let d = date;
    if (this._picker === 'week') d = startOfWeek(date, this._weekStart);
    if (this._withTime) {
      // Chọn ngày giữ nguyên giờ đang chọn; cần "Đồng ý" để xác nhận
      const time = this._time.value || this._timeOf(this._current()) || { h: 0, m: 0, s: 0 };
      this._pending = makeDate(d.getFullYear(), d.getMonth(), d.getDate(), time.h, time.m, time.s);
      this._typed = false;
      this._time.setValue(this._timeOf(this._pending));
      this._syncInput();
      this._panel.refresh();
      this._syncFooter();
      return;
    }
    this._finish(d);
  }

  _onTimeChange(time) {
    const base = this._current() || this._now();
    this._pending = makeDate(base.getFullYear(), base.getMonth(), base.getDate(), time.h, time.m, time.s);
    this._typed = false;
    this._syncInput();
    this._panel.refresh();
    this._syncFooter();
  }

  /** Nút "Đồng ý" / Enter trong cột giờ */
  _confirm() {
    if (this._pending !== undefined) this._finish(this._pending);
    else this._closePopup({ commit: false, focusInput: true });
  }

  /** Xác nhận giá trị d (null = xóa) rồi đóng popup */
  _finish(d) {
    this._commit(d);
    if (this._isOpen) this._closePopup({ commit: false, focusInput: true });
    else if (this.inline) this._panel.paint();
  }

  _commit(d) {
    const value = d ? toISO(d, this._kind, { weekStart: this._weekStart }) : '';
    this._pending = undefined;
    this._typed = false;
    const date = d ? parseISO(value, { weekStart: this._weekStart }) : null;
    this._setUserValue(value, { value, date });
    this._syncInput();
    this._syncFooter();
  }

  // =====================================================
  // GÕ CHỮ
  // =====================================================

  _parseText(text) {
    const ws = this._weekStart;
    const s = String(text || '').trim();
    if (!s) return null;
    let d = parsePattern(s, this._displayFormat, { weekStart: ws });
    // Chấp nhận thêm dạng ISO và (show-time) ngày không kèm giờ
    if (!d && /^\d{4}-/.test(s)) d = parseISO(s, { weekStart: ws });
    if (!d && this._withTime) d = parsePattern(s, defaultFormat('date'), { weekStart: ws });
    return d;
  }

  _onInputText() {
    this._typed = true;
    if (!this._isOpen && !this.inline) this._openPopup();
    const d = this._parseText(this._input.value);
    if (!d || this._isValueDisabled(d)) return;
    // Bảng nhảy tới ngày đang gõ (chưa xác nhận)
    this._pending = d;
    const panel = this._panel;
    panel.activeDate = makeDate(d.getFullYear(), d.getMonth(), d.getDate());
    if (!panel._inView(panel.activeDate)) panel.setViewDate(panel.activeDate, 'input');
    else panel.refresh();
    this._time.setValue(this._timeOf(d));
    this._syncFooter();
  }

  _commitPending() {
    if (this._typed) {
      const text = this._input.value.trim();
      if (!text) {
        this._commit(null);
        return;
      }
      const d = this._parseText(text);
      if (d && !this._isValueDisabled(d)) this._commit(this._picker === 'week' ? startOfWeek(d, this._weekStart) : d);
      else this._revertPending();
      return;
    }
    if (this._pending !== undefined) this._commit(this._pending);
  }

  _revertPending() {
    this._pending = undefined;
    this._typed = false;
    this._syncInput();
    this._time.setValue(this._timeOf(this._date));
    this._syncFooter();
  }

  _clearValue() {
    this._pending = undefined;
    this._typed = false;
    this._setUserValue('', { value: '', date: null });
    this._syncInput();
    if (this._isOpen || this.inline) this._panel.refresh();
  }

  // =====================================================
  // VALIDATE
  // =====================================================

  checkConstraints() {
    const error = super.checkConstraints();
    if (error || this.isDisabled || this._isEmpty()) return error;
    const d = this._date;
    const ws = this._weekStart;
    const fmt = (v) => formatPattern(parseISO(v, { weekStart: ws }), this._displayFormat, { weekStart: ws });
    if (!d) return { flags: { badInput: true }, message: dmsg('datePicker.invalid') };
    const unit = this._baseUnit === 'date' && this._picker === 'week' ? 'week' : this._baseUnit;
    const min = parseISO(this.min, { weekStart: ws });
    const max = parseISO(this.max, { weekStart: ws });
    if (min && compareUnit(d, min, unit, ws) < 0) return { flags: { rangeUnderflow: true }, message: t('form.rangeUnderflow', { min: fmt(this.min) }) };
    if (max && compareUnit(d, max, unit, ws) > 0) return { flags: { rangeOverflow: true }, message: t('form.rangeOverflow', { max: fmt(this.max) }) };
    return null;
  }
}

defineElement('hui-date-picker', HuiDatePicker);

export default HuiDatePicker;
