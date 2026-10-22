/**
 * HUI Range Picker — Chọn khoảng ngày / tháng / năm (+ giờ) (Ant RangePicker + MUI DateRangePicker), tham gia <form>.
 * 2 bảng lịch cạnh nhau (màn hẹp: 1 bảng), chọn ngày đầu rồi ngày cuối, hover xem trước khoảng, chọn nhanh (presets).
 * value = [start, end] (ISO); form gửi 'start/end' theo `name`, hoặc 2 trường riêng qua `name-start` / `name-end`.
 */

import styles from './hui-range-picker.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { CalendarPanel, dmsg, panelStyles } from '../hui-calendar/calendar-panel.js';
import {
  addDays, addMonths, addYears, compareUnit, defaultFormat, endOfMonth, endOfUnit, formatPattern, isValidDate, localeWeekStart,
  makeDate, parseISO, parsePattern, startOfMonth, startOfWeek, startOfYear, toISO,
} from '../hui-calendar/date-utils.js';
import { TimePanel, timeFormatInfo, timeStyles } from '../hui-time-picker/time-panel.js';
import { HuiPickerBase, baseStyles, floatingCss, resolvePresetValue } from '../hui-date-picker/picker-base.js';

const PICKERS = ['date', 'month', 'year'];

const RANGE_FALLBACK = {
  'datePicker.monthRangePlaceholder': { vi: ['Từ tháng', 'Đến tháng'], en: ['Start month', 'End month'] },
  'datePicker.yearRangePlaceholder': { vi: ['Từ năm', 'Đến năm'], en: ['Start year', 'End year'] },
};

/** Chuỗi / mảng / JSON → ['start', 'end'] (thiếu một đầu = []) */
export function normalizeRange(v) {
  let list = v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith('[')) {
      try {
        list = JSON.parse(s);
      } catch {
        return [];
      }
    } else {
      list = s.split(s.includes('/') ? '/' : ',');
    }
  }
  if (!Array.isArray(list) || list.length < 2) return [];
  const out = list.slice(0, 2).map((x) => (x instanceof Date ? (isValidDate(x) ? x : '') : String(x ?? '').trim()));
  return out.every((x) => x !== '') ? out : [];
}

/**
 * Bộ chọn nhanh thông dụng (nhãn theo ngôn ngữ hiện tại, tính lúc bấm theo `now`):
 * 7 ngày qua, 30 ngày qua, Tuần này, Tháng này, Tháng trước, Năm nay.
 */
export function rangePresets(now = () => new Date()) {
  const get = () => (typeof now === 'function' ? now() : parseISO(now) || new Date());
  const today = () => { const d = get(); return makeDate(d.getFullYear(), d.getMonth(), d.getDate()); };
  return [
    { label: dmsg('datePicker.last7Days'), value: () => [addDays(today(), -6), today()] },
    { label: dmsg('datePicker.last30Days'), value: () => [addDays(today(), -29), today()] },
    { label: dmsg('datePicker.thisWeek'), value: () => { const s = startOfWeek(today(), localeWeekStart()); return [s, addDays(s, 6)]; } },
    { label: dmsg('datePicker.thisMonth'), value: () => [startOfMonth(today()), endOfMonth(today())] },
    { label: dmsg('datePicker.lastMonth'), value: () => { const p = addMonths(startOfMonth(today()), -1); return [p, endOfMonth(p)]; } },
    { label: dmsg('datePicker.thisYear'), value: () => [startOfYear(today()), makeDate(today().getFullYear(), 11, 31)] },
  ];
}

/**
 * Ô chọn khoảng thời gian (2 ô nhập + 2 bảng lịch), tham gia <form> native.
 * @fires input - Khoảng đổi do người dùng. detail: { value: [start, end], dates: [Date, Date] } (xóa: value [])
 * @fires change - Như input (phát ngay sau input)
 * @fires clear - Bấm nút xóa
 * @fires hui-open - Mở popup
 * @fires hui-close - Đóng popup
 * @csspart base - Khung ngoài
 * @csspart trigger - Khung ô nhập
 * @csspart input - Mỗi ô nhập (kèm input-start | input-end)
 * @csspart separator - Dấu phân cách giữa 2 ô
 * @csspart suffix - Icon lịch
 * @csspart clear - Nút xóa
 * @csspart popup - Popup
 * @csspart presets - Cột chọn nhanh
 * @csspart preset - Mỗi nút chọn nhanh
 * @csspart panel - Mỗi bảng lịch (cell-range-start / cell-range-end / cell-in-range / cell-in-preview…)
 * @csspart time-panel - Cột giờ (show-time)
 * @csspart footer - Chân popup (show-time)
 * @csspart ok-btn - Nút "Đồng ý" (show-time)
 * @cssprop --hui-picker-width - Chiều rộng ô nhập
 * @cssprop --hui-picker-height - Chiều cao ô nhập
 * @cssprop --hui-picker-radius - Bo góc ô nhập
 * @cssprop --hui-picker-border-color - Viền
 * @cssprop --hui-picker-focus-border-color - Viền / gạch dưới ô đang nhập
 * @cssprop --hui-picker-popup-bg - Nền popup
 * @cssprop --hui-picker-popup-radius - Bo góc popup
 * @cssprop --hui-picker-popup-shadow - Đổ bóng popup
 * @cssprop --hui-picker-presets-width - Chiều rộng cột chọn nhanh
 * @cssprop --hui-calendar-panel-width - Chiều rộng mỗi bảng
 * @cssprop --hui-calendar-range-bg - Nền dải khoảng đã chọn
 * @cssprop --hui-calendar-preview-color - Viền nét đứt xem trước khoảng
 * @cssprop --hui-calendar-selected-bg - Nền ô đầu / cuối khoảng
 */
class HuiRangePicker extends HuiPickerBase {
  static properties = {
    // value ghi đè getter/setter bên dưới: luôn là mảng ['start', 'end'] hoặc []
    /** Khoảng [start, end] ISO — attribute nhận 'start/end' hoặc JSON '["start","end"]' */
    value: { type: String, default: '', reflect: false },
    /** date | month | year — đơn vị chọn; value: YYYY-MM-DD | YYYY-MM | YYYY */
    picker: { type: String, default: 'date' },
    /** Thêm cột giờ (picker date) — value 'YYYY-MM-DDTHH:mm' */
    showTime: { type: Boolean },
    /** HH:mm | HH:mm:ss | hh:mm A — mẫu giờ khi show-time */
    timeFormat: { type: String, default: 'HH:mm' },
    /** Bước nhảy cột giờ */
    hourStep: { type: Number, default: 1 },
    /** Bước nhảy cột phút */
    minuteStep: { type: Number, default: 1 },
    /** Bước nhảy cột giây */
    secondStep: { type: Number, default: 1 },
    /** [{ label, value: [start, end] | () => [start, end] }] — xem rangePresets() */
    presets: { type: Array, default: [] },
    /** Gửi form thành 2 trường: tên trường ngày đầu (cần cả name-end) */
    nameStart: { type: String, default: '' },
    /** Gửi form thành 2 trường: tên trường ngày cuối */
    nameEnd: { type: String, default: '' },
    /** Ký tự giữa 2 ô nhập */
    separator: { type: String, default: '→' },
    /** Chữ gợi ý ô đầu (mặc định theo locale) */
    placeholderStart: { type: String, default: '' },
    /** Chữ gợi ý ô cuối (mặc định theo locale) */
    placeholderEnd: { type: String, default: '' },
    /** Tháng hiện ở bảng trái khi mở lúc chưa có giá trị (ISO) */
    defaultPickerValue: { type: String, default: '' },
  };

  static styles = [floatingCss, panelStyles, timeStyles, baseStyles, styles];

  constructor() {
    super();
    this._disabledDate = null;
    this._disabledTime = null;
    /** Khoảng nháp khi popup mở: [Date|null, Date|null] */
    this._draft = [null, null];
    this._dirty = false;
    this._typed = false;
    this._hover = null;
  }

  // =====================================================
  // JS PROPERTIES
  // =====================================================

  get value() {
    const raw = this._props.value;
    if (!Array.isArray(raw) || raw.some((x) => x instanceof Date)) this._props.value = this._normalize(raw);
    return this._props.value;
  }

  set value(v) {
    this._setProp('value', this._normalize(v));
  }

  _normalize(v) {
    return normalizeRange(v).map((x) => (x instanceof Date ? toISO(x, this._kind, { weekStart: this._weekStart }) : x));
  }

  /** (date: Date) => boolean — ô không chọn được */
  get disabledDate() { return this._disabledDate; }
  set disabledDate(fn) {
    this._disabledDate = typeof fn === 'function' ? fn : null;
    this.requestUpdate('disabledDate');
  }

  /** (date: Date | null, part: 'start' | 'end') => { disabledHours?(), disabledMinutes?(h), disabledSeconds?(h, m) } */
  get disabledTime() { return this._disabledTime; }
  set disabledTime(fn) {
    this._disabledTime = typeof fn === 'function' ? fn : null;
    this.requestUpdate('disabledTime');
  }

  /** [Date, Date] | [] */
  get valueAsDates() {
    return this.value.map((v) => parseISO(v, { weekStart: this._weekStart }));
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

  get _kind() {
    if (this._picker !== 'date') return this._picker;
    if (!this.showTime) return 'date';
    return timeFormatInfo(this.timeFormat || 'HH:mm').seconds ? 'datetime-seconds' : 'datetime';
  }

  get _displayFormat() {
    return this.format || defaultFormat(this._picker, { showTime: this._withTime, timeFormat: this.timeFormat || 'HH:mm' });
  }

  get _dates() {
    const v = this.value;
    return v.length ? v.map((x) => parseISO(x, { weekStart: this._weekStart })) : [null, null];
  }

  /** Khoảng đang hiển thị: nháp (khi đã chỉnh) hoặc value */
  _current() {
    return this._dirty || this._typed ? this._draft : this._dates;
  }

  // =====================================================
  // FORM
  // =====================================================

  /** Rỗng → không gửi; name-start + name-end → 2 trường; còn lại 'start/end' theo name */
  formValue() {
    if (this._isEmpty()) return null;
    const [s, e] = this.value;
    if (this.nameStart && this.nameEnd) {
      const data = new FormData();
      data.append(this.nameStart, s);
      data.append(this.nameEnd, e);
      return data;
    }
    return `${s}/${e}`;
  }

  formStateRestoreCallback(state) {
    if (state instanceof FormData) this.value = [state.get(this.nameStart), state.get(this.nameEnd)];
    else super.formStateRestoreCallback(state);
  }

  // =====================================================
  // DOM
  // =====================================================

  _renderInputs() {
    this._startInput = createElement('input', { part: 'input input-start', type: 'text', id: 'input-start' });
    this._endInput = createElement('input', { part: 'input input-end', type: 'text', id: 'input-end' });
    this._sep = createElement('span', { className: 'hui-picker__separator', part: 'separator', 'aria-hidden': 'true' });
    return { nodes: [this._startInput, this._sep, this._endInput], inputs: [this._startInput, this._endInput] };
  }

  _renderPopup() {
    const make = (index) => new CalendarPanel({
      picker: this._picker,
      weekStart: this._weekStart,
      now: () => this._now(),
      hideOutside: true,
      nav: index === 0 ? { next: false, superNext: false } : { prev: false, superPrev: false },
      isDisabled: (date, unit) => this._isCellDisabled(date, unit),
      cellState: (date, unit) => this._cellState(date, unit),
      onSelect: (date) => this._onSelect(date),
      onHover: (date) => this._setHover(date),
      onActive: (date) => this._setHover(date),
      onViewChange: (info) => this._onViewChange(index, info),
      animated: () => this._animated(),
    });
    this._panels = [make(0), make(1)];
    this._time = new TimePanel({
      disabledTime: () => this._disabledTime?.(this._current()[this._activeIndex], this._activeIndex ? 'end' : 'start') || {},
      onChange: (time) => this._onTimeChange(time),
      onEnter: () => this._confirm(),
      animated: () => this._animated(),
    });

    this._presetBox = createElement('div', { className: 'hui-picker__presets', part: 'presets', role: 'group' });
    this._presetBox.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-preset]');
      if (!btn) return;
      const preset = this.presets?.[Number(btn.dataset.preset)];
      const dates = preset ? resolvePresetValue(preset.value, this._weekStart) : null;
      if (Array.isArray(dates) && dates.length >= 2 && dates.every(isValidDate)) this._finish(this._ordered(dates[0], dates[1]));
    });
    this._okBtn = createElement('button', { type: 'button', className: 'hui-picker__ok', part: 'ok-btn' });
    this._okBtn.addEventListener('click', () => this._confirm());
    this._footer = createElement('div', { className: 'hui-picker__footer', part: 'footer' }, this._okBtn);

    const panels = createElement('div', { className: 'hui-picker__panels' },
      this._panels[0].el, this._panels[1].el, this._time.el);
    panels.addEventListener('mouseleave', () => this._setHover(null));
    const main = createElement('div', { className: 'hui-picker__main' }, panels, this._footer);
    return createElement('div', { className: 'hui-picker__layout' }, this._presetBox, main);
  }

  updated(changed) {
    if (changed.has('locale')) {
      for (const p of this._panels) p.o.weekStart = this._weekStart;
      this._okBtn.textContent = t('common.ok');
      this._presetBox.setAttribute('aria-label', dmsg('datePicker.presets'));
    }
    if (changed.has('picker')) {
      for (const p of this._panels) {
        p.o.picker = this._picker;
        p.view = p.baseView;
      }
    }
    if (changed.has('separator')) this._sep.textContent = this.separator;
    if (['showTime', 'picker', 'timeFormat', 'hourStep', 'minuteStep', 'secondStep', 'locale'].some((k) => changed.has(k))) {
      const info = this._timeInfo;
      Object.assign(this._time.o, {
        showSeconds: info.seconds, use12Hours: info.use12,
        hourStep: this.hourStep, minuteStep: this.minuteStep, secondStep: this.secondStep,
      });
      this._time.el.hidden = !this._withTime;
      this._footer.hidden = !this._withTime;
      if (this._withTime) this._time.paint();
    }
    if (changed.has('presets')) this._renderPresets();
    if (['value', 'format', 'picker', 'showTime', 'timeFormat', 'locale'].some((k) => changed.has(k)) && !this._typed) this._syncInputs();
    if (['nameStart', 'nameEnd', 'name'].some((k) => changed.has(k))) this._syncForm();
    const repaint = ['locale', 'picker', 'value', 'min', 'max', 'now', 'disabledDate'].some((k) => changed.has(k));
    if (repaint && (this._isOpen || this.inline)) {
      if (changed.has('value') && !this._dirty) this._resetDraft();
      this._paintPanels();
    }
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

  _placeholders() {
    const key = { month: 'datePicker.monthRangePlaceholder', year: 'datePicker.yearRangePlaceholder' }[this._picker] || 'datePicker.rangePlaceholder';
    let v = t(key);
    if (!Array.isArray(v)) {
      const f = RANGE_FALLBACK[key];
      v = f ? f[getLocaleName()] || f.en : ['', ''];
    }
    return [this.placeholderStart || v[0], this.placeholderEnd || v[1]];
  }

  _syncPlaceholders() {
    const [a, b] = this._placeholders();
    this._startInput.placeholder = a;
    this._endInput.placeholder = b;
  }

  _inputLabel(i) {
    const ph = this._placeholders()[i];
    return this.label ? `${this.label}: ${ph}` : ph;
  }

  _extraClasses() {
    return ['hui-picker--range', this._withTime && 'hui-picker--datetime'];
  }

  _fmt(d) {
    return d ? formatPattern(d, this._displayFormat, { weekStart: this._weekStart }) : '';
  }

  _syncInputs() {
    const cur = this._current();
    this._inputs.forEach((input, i) => {
      const text = this._fmt(cur[i]);
      if (input.value !== text) input.value = text;
    });
  }

  _syncFooter() {
    const [s, e] = this._draft;
    this._okBtn.disabled = !(this._activeIndex === 0 ? s : s && e);
  }

  // =====================================================
  // Ô LỊCH
  // =====================================================

  get _baseUnit() {
    return this._picker;
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
    if (min && compareUnit(endOfUnit(date, unit), min) < 0) return true;
    if (max && compareUnit(date, max) > 0) return true;
    return false;
  }

  _cellState(date, unit) {
    const [s, e] = this._current();
    const cmp = (a, b) => compareUnit(a, b, unit, this._weekStart);
    const st = {};
    const single = (s && !e) || (!s && e);
    if (s && cmp(date, s) === 0) {
      st.rangeStart = true;
      if (single) st.rangeEnd = true;
    }
    if (e && cmp(date, e) === 0) {
      st.rangeEnd = true;
      if (single) st.rangeStart = true;
    }
    if (s && e && cmp(date, s) > 0 && cmp(date, e) < 0) st.inRange = true;
    // Xem trước khoảng khi hover / di chuyển bằng phím (chỉ ở view gốc)
    const h = this._hover;
    if (h && unit === this._baseUnit) {
      let [ps, pe] = this._activeIndex === 1 ? [s, h] : [h, e];
      if (ps && pe) {
        if (cmp(ps, pe) > 0) [ps, pe] = [pe, ps];
        if (cmp(date, ps) === 0) st.previewStart = true;
        if (cmp(date, pe) === 0) st.previewEnd = true;
        if (cmp(date, ps) > 0 && cmp(date, pe) < 0) st.inPreview = true;
      }
    }
    return st;
  }

  _setHover(date) {
    const same = (!date && !this._hover) || (date && this._hover && date.getTime() === this._hover.getTime());
    if (same) return;
    this._hover = date;
    for (const p of this._panels) p.refresh();
  }

  // =====================================================
  // HAI BẢNG
  // =====================================================

  /** Bảng phải = bảng trái + 1 tháng (date) / + 1 năm (month) / + 10 năm (year) */
  _shift(d, n) {
    if (this._picker === 'date') return addMonths(d, n);
    return addYears(d, n * (this._picker === 'year' ? 10 : 1));
  }

  _onViewChange(index, { view }) {
    const self = this._panels[index];
    const other = this._panels[1 - index];
    if (view !== self.baseView) {
      // Đang đi lên chọn tháng / năm: chỉ còn 1 bảng, hiện đủ nút điều hướng
      other.el.hidden = true;
      self.o.nav = {};
      self._paintHeader();
      return;
    }
    self.o.nav = index === 0 ? { next: false, superNext: false } : { prev: false, superPrev: false };
    self._paintHeader();
    other.el.hidden = false;
    other.view = other.baseView;
    other.viewDate = other._viewDateFor(this._shift(self.viewDate, index === 0 ? 1 : -1));
    other.paint();
  }

  /** Bảng trái hiện tháng của ngày đầu (hoặc ngày cuối / default-picker-value / hôm nay) */
  _paintPanels(anchor) {
    const [left, right] = this._panels;
    const [s, e] = this._current();
    const d = anchor || s || e || parseISO(this.defaultPickerValue, { weekStart: this._weekStart }) || this._now();
    left.view = left.baseView;
    right.view = right.baseView;
    left.el.hidden = false;
    right.el.hidden = false;
    left.viewDate = left._viewDateFor(d);
    right.viewDate = right._viewDateFor(this._shift(left.viewDate, 1));
    // Ô active (Tab vào lưới): đầu khoảng ở bảng trái, cuối khoảng ở bảng phải nếu thuộc tháng đó
    left.activeDate = makeDate(d.getFullYear(), d.getMonth(), d.getDate());
    if (e && right._inView(e)) right.activeDate = makeDate(e.getFullYear(), e.getMonth(), e.getDate());
    left.paint();
    right.paint();
  }

  _resetDraft() {
    const [s, e] = this._dates;
    this._draft = [s, e];
    this._dirty = false;
    this._typed = false;
    this._hover = null;
  }

  _onOpen() {
    if (!this._typed) this._resetDraft();
    this._paintPanels();
    this._time.setValue(this._timeOf(this._current()[this._activeIndex]));
    this._syncFooter();
  }

  _afterShow() {
    this._time.syncScroll();
  }

  _onInputFocus() {
    if (!this._isOpen) return;
    this._time.setValue(this._timeOf(this._current()[this._activeIndex]));
    for (const p of this._panels) p.refresh();
    this._syncFooter();
  }

  _focusPanel() {
    const [left, right] = this._panels;
    const cur = this._current();
    const target = cur[this._activeIndex] || cur[0];
    if (target && !right.el.hidden && right._inView(target)) right.setActive(target, true, 'api');
    else if (target) left.setActive(target, true, 'api');
    else left.focus();
  }

  // =====================================================
  // CHỌN
  // =====================================================

  _timeOf(d) {
    return d ? { h: d.getHours(), m: d.getMinutes(), s: this._timeInfo.seconds ? d.getSeconds() : 0 } : null;
  }

  _ordered(a, b) {
    return compareUnit(a, b, 'date') <= 0 || (this._withTime && a.getTime() <= b.getTime()) ? [a, b] : [b, a];
  }

  _onSelect(date) {
    const i = this._activeIndex;
    const draft = [...this._current()];
    let d = date;
    if (this._withTime) {
      const time = this._timeOf(draft[i]) || (i === 1 && this._timeOf(draft[0])) || { h: 0, m: 0, s: 0 };
      d = makeDate(date.getFullYear(), date.getMonth(), date.getDate(), time.h, time.m, time.s);
    }
    const cmp = (a, b) => compareUnit(a, b, this._baseUnit, this._weekStart);
    if (i === 0) {
      draft[0] = d;
      if (draft[1] && cmp(draft[1], d) < 0) draft[1] = null;
    } else {
      draft[1] = d;
      // Chọn ngày cuối trước ngày đầu → đảo lại
      if (draft[0] && cmp(d, draft[0]) < 0) [draft[0], draft[1]] = [d, draft[0]];
    }
    this._draft = draft;
    this._dirty = true;
    this._typed = false;
    this._hover = null;
    this._syncInputs();

    if (!this._withTime && i === 1 && draft[0] && draft[1]) {
      this._finish(draft);
      return;
    }
    if (!this._withTime && i === 0) this._setPart(1);
    this._time.setValue(this._timeOf(draft[this._activeIndex]));
    for (const p of this._panels) p.refresh();
    this._syncFooter();
  }

  /** Chuyển sang nhập đầu i (0 = bắt đầu, 1 = kết thúc) */
  _setPart(i) {
    this._activeIndex = i;
    this._syncClasses();
    this._syncFooter();
  }

  _onTimeChange(time) {
    const i = this._activeIndex;
    const draft = [...this._current()];
    const base = draft[i] || (i === 1 ? draft[0] : null) || this._now();
    draft[i] = makeDate(base.getFullYear(), base.getMonth(), base.getDate(), time.h, time.m, time.s);
    this._draft = draft;
    this._dirty = true;
    this._typed = false;
    this._syncInputs();
    for (const p of this._panels) p.refresh();
    this._syncFooter();
  }

  /** "Đồng ý": đang ở ngày đầu → sang ngày cuối; ở ngày cuối (đủ 2 đầu) → xác nhận */
  _confirm() {
    const [s, e] = this._current();
    if (this._activeIndex === 0 && s) {
      this._setPart(1);
      this._endInput.focus({ preventScroll: true });
      this._time.setValue(this._timeOf(e));
      return;
    }
    if (s && e) this._finish(this._ordered(s, e));
  }

  _finish(dates) {
    this._commit(dates);
    if (this._isOpen) this._closePopup({ commit: false, focusInput: true });
    else if (this.inline) this._paintPanels();
  }

  _commit(dates) {
    const ws = this._weekStart;
    const value = dates && dates[0] && dates[1] ? dates.map((d) => toISO(d, this._kind, { weekStart: ws })) : [];
    this._resetDraft();
    const parsed = value.map((v) => parseISO(v, { weekStart: ws }));
    this._setUserValue(value, { value, dates: parsed });
    this._resetDraft();
    this._syncInputs();
    this._syncFooter();
  }

  // =====================================================
  // GÕ CHỮ
  // =====================================================

  _parseText(text) {
    const s = String(text || '').trim();
    if (!s) return null;
    const ws = this._weekStart;
    let d = parsePattern(s, this._displayFormat, { weekStart: ws });
    if (!d && /^\d{4}-/.test(s)) d = parseISO(s, { weekStart: ws });
    if (!d && this._withTime) d = parsePattern(s, defaultFormat('date'), { weekStart: ws });
    return d && !this._isCellDisabled(d, this._baseUnit) ? d : null;
  }

  _onInputText(i) {
    if (!this._typed) {
      this._draft = [...this._current()];
      this._typed = true;
    }
    if (!this._isOpen && !this.inline) this._openPopup();
    const d = this._parseText(this._inputs[i].value);
    if (!d) return;
    this._draft[i] = d;
    this._paintPanels(i === 0 ? d : this._draft[0] || d);
    this._time.setValue(this._timeOf(d));
    this._syncFooter();
  }

  /** Enter trong ô nhập: ô đầu → sang ô cuối; ô cuối → xác nhận */
  _onInputEnter(i) {
    if (i === 0 && !this._typed && this._isOpen) {
      this._setPart(1);
      this._endInput.focus({ preventScroll: true });
      return;
    }
    if (this._typed) {
      const texts = this._inputs.map((input) => input.value.trim());
      if (i === 0 && texts[0] && !texts[1]) {
        this._setPart(1);
        this._endInput.focus({ preventScroll: true });
        return;
      }
    }
    super._onInputEnter(i);
  }

  _commitPending() {
    if (this._typed) {
      const texts = this._inputs.map((input) => input.value.trim());
      if (!texts[0] && !texts[1]) {
        this._commit(null);
        return;
      }
      const [a, b] = texts.map((x) => this._parseText(x));
      if (a && b) this._commit(this._ordered(a, b));
      else this._revertPending();
      return;
    }
    if (this._dirty) {
      const [s, e] = this._draft;
      if (s && e) this._commit(this._ordered(s, e));
      else this._revertPending();
      return;
    }
    this._revertPending();
  }

  _revertPending() {
    this._resetDraft();
    this._activeIndex = 0;
    this._syncInputs();
    this._syncFooter();
  }

  _clearValue() {
    this._setUserValue([], { value: [], dates: [] });
    this._resetDraft();
    this._activeIndex = 0;
    this._syncInputs();
    if (this._isOpen || this.inline) this._paintPanels();
  }

  // =====================================================
  // VALIDATE
  // =====================================================

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.required') };
    if (this._isEmpty()) return null;
    const ws = this._weekStart;
    const [s, e] = this._dates;
    if (!s || !e) return { flags: { badInput: true }, message: dmsg('datePicker.invalid') };
    const unit = this._baseUnit;
    const fmt = (v) => this._fmt(parseISO(v, { weekStart: ws }));
    const min = parseISO(this.min, { weekStart: ws });
    const max = parseISO(this.max, { weekStart: ws });
    if (min && compareUnit(s, min, unit, ws) < 0) return { flags: { rangeUnderflow: true }, message: t('form.rangeUnderflow', { min: fmt(this.min) }) };
    if (max && compareUnit(e, max, unit, ws) > 0) return { flags: { rangeOverflow: true }, message: t('form.rangeOverflow', { max: fmt(this.max) }) };
    return null;
  }
}

defineElement('hui-range-picker', HuiRangePicker);

export default HuiRangePicker;
