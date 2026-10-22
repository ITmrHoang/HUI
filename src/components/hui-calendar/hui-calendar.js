/**
 * HUI Calendar — Lịch tháng / năm / thập kỷ (Ant Calendar + MUI DateCalendar), không thư viện ngày giờ.
 * Dạng thẻ (card) hoặc toàn trang (full, ô đủ lớn để chứa sự kiện); nội dung ô qua dateCellRender / <template>.
 * Lõi lưới + bàn phím dùng chung với date-picker: ./calendar-panel.js. Tiện ích ngày: ./date-utils.js.
 */

import styles from './hui-calendar.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { renderTemplate } from '../../core/template.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import { CalendarPanel, dmsg, panelStyles, unitKey } from './calendar-panel.js';
import {
  compareUnit, daysInMonth, endOfMonth, localeWeekStart, makeDate, parseISO, startOfMonth, toISO,
} from './date-utils.js';

const MODES = ['month', 'year', 'decade'];
/** mode của calendar → view của panel (trùng tên) */
const SOURCE = { month: 'date', year: 'month', decade: 'year' };

/**
 * Lịch hiển thị / chọn ngày.
 * @fires hui-select - Chọn một ô. detail: { value: 'YYYY-MM-DD', date: Date, source: 'date' | 'month' | 'year' }
 * @fires hui-panel-change - Đổi tháng / năm / chế độ xem. detail: { year, month (1-12), mode, value: 'YYYY-MM-DD' (ngày 1 của tháng đang xem) }
 * @slot - Đặt `<template>` để vẽ nội dung ô theo `cell-data` (data-bind / data-show / data-format…)
 * @csspart base - Khung ngoài
 * @csspart panel - Bảng lịch
 * @csspart header - Hàng tiêu đề (điều hướng + tháng/năm + nút)
 * @csspart nav-btn - Nút « ‹ › » (kèm super-prev | prev | next | super-next)
 * @csspart title - Vùng tiêu đề tháng / năm
 * @csspart title-btn - Nút tháng / năm trong tiêu đề (kèm month-btn | year-btn)
 * @csspart today-btn - Nút "Hôm nay"
 * @csspart mode-switch - Nhóm nút đổi chế độ Tháng / Năm (variant full)
 * @csspart mode-btn - Mỗi nút chế độ
 * @csspart grid - Bảng (role=grid)
 * @csspart weekday - Ô tên thứ
 * @csspart week-num - Ô số tuần (show-week)
 * @csspart cell - Mỗi ô (kèm cell-today | cell-selected | cell-disabled | cell-outside)
 * @csspart cell-inner - Số ngày / tên tháng / năm trong ô
 * @csspart cell-content - Nội dung thêm của ô (dateCellRender / template)
 * @cssprop --hui-calendar-bg - Nền
 * @cssprop --hui-calendar-padding - Khoảng đệm
 * @cssprop --hui-calendar-radius - Bo góc (variant card)
 * @cssprop --hui-calendar-border-color - Viền (variant card)
 * @cssprop --hui-calendar-width - Chiều rộng (variant card)
 * @cssprop --hui-calendar-cell-size - Kích thước ô ngày (variant card)
 * @cssprop --hui-calendar-cell-radius - Bo góc ô
 * @cssprop --hui-calendar-cell-hover-bg - Nền ô khi hover
 * @cssprop --hui-calendar-selected-bg - Nền ô đang chọn
 * @cssprop --hui-calendar-selected-color - Chữ ô đang chọn
 * @cssprop --hui-calendar-range-bg - Nền ô chọn ở variant full
 * @cssprop --hui-calendar-today-color - Màu viền / chữ ô hôm nay
 * @cssprop --hui-calendar-disabled-bg - Nền ô bị vô hiệu hóa
 * @cssprop --hui-calendar-full-cell-height - Chiều cao ô ở variant full
 */
class HuiCalendar extends HuiElement {
  static localized = true;

  static properties = {
    /** Ngày đang chọn 'YYYY-MM-DD' (rỗng = chưa chọn) */
    value: { type: String, default: '', reflect: false },
    /** month | year | decade — month: lưới ngày; year: lưới tháng; decade: lưới năm */
    mode: { type: String, default: 'month' },
    /** card | full — card: thẻ nhỏ gọn; full: toàn chiều rộng, ô cao chứa được sự kiện */
    variant: { type: String, default: 'card' },
    /** Ngày nhỏ nhất chọn được 'YYYY-MM-DD' */
    min: { type: String, default: '' },
    /** Ngày lớn nhất chọn được 'YYYY-MM-DD' */
    max: { type: String, default: '' },
    /** Ngày "hôm nay" 'YYYY-MM-DD' (mặc định ngày máy) — dùng cho test / demo cố định */
    now: { type: String, default: '' },
    /** Tháng hiển thị ban đầu khi chưa có value 'YYYY-MM' hoặc 'YYYY-MM-DD' */
    defaultMonth: { type: String, default: '' },
    /** Hiện cột số tuần */
    showWeek: { type: Boolean },
    /** Ẩn nút "Hôm nay" */
    hideToday: { type: Boolean },
    /** Tắt hiệu ứng trượt khi đổi tháng */
    noAnimation: { type: Boolean },
  };

  static styles = [panelStyles, styles];

  constructor() {
    super();
    this._disabledDate = null;
    this._dateCellRender = null;
    this._monthCellRender = null;
    this._cellData = null;
  }

  // =====================================================
  // JS PROPERTIES (hàm / dữ liệu — không có attribute)
  // =====================================================

  /** (date: Date) => boolean — true = ngày không chọn được */
  get disabledDate() { return this._disabledDate; }
  set disabledDate(fn) {
    this._disabledDate = typeof fn === 'function' ? fn : null;
    this.requestUpdate('disabledDate');
  }

  /** (date: Date) => Node | string | null — nội dung thêm cho ô ngày (mode month) */
  get dateCellRender() { return this._dateCellRender; }
  set dateCellRender(fn) {
    this._dateCellRender = typeof fn === 'function' ? fn : null;
    this.requestUpdate('cells');
  }

  /** (date: Date) => Node | string | null — nội dung thêm cho ô tháng (mode year) */
  get monthCellRender() { return this._monthCellRender; }
  set monthCellRender(fn) {
    this._monthCellRender = typeof fn === 'function' ? fn : null;
    this.requestUpdate('cells');
  }

  /**
   * Dữ liệu cho `<template>`: object { 'YYYY-MM-DD' | 'YYYY-MM': {...} } hoặc hàm (date, unit) => object | null.
   * Ô có dữ liệu được vẽ template với item = { date, day, ...dữ liệu }.
   */
  get cellData() { return this._cellData; }
  set cellData(v) {
    this._cellData = v && (typeof v === 'function' || typeof v === 'object') ? v : null;
    this.requestUpdate('cells');
  }

  /** Date đang chọn (null nếu chưa chọn / không hợp lệ) */
  get valueAsDate() {
    return parseISO(this.value);
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._panel = new CalendarPanel({
      weekStart: localeWeekStart(),
      now: () => this._now(),
      isDisabled: (date, unit) => this._isDisabled(date, unit),
      cellState: (date, unit) => this._cellState(date, unit),
      cellContent: (date, unit) => this._cellContent(date, unit),
      onSelect: (date) => this._select(date),
      onViewChange: (info) => this._onViewChange(info),
      animated: () => !this.noAnimation && !animationsDisabled(),
    });

    this._todayBtn = createElement('button', { type: 'button', className: 'hui-calendar__today', part: 'today-btn' });
    this._todayBtn.addEventListener('click', () => this._goToday());
    this._modeMonth = createElement('button', { type: 'button', className: 'hui-calendar__mode', part: 'mode-btn', dataset: { mode: 'month' } });
    this._modeYear = createElement('button', { type: 'button', className: 'hui-calendar__mode', part: 'mode-btn', dataset: { mode: 'year' } });
    this._modeSwitch = createElement('div', { className: 'hui-calendar__modes', part: 'mode-switch', role: 'group' },
      this._modeMonth, this._modeYear);
    this._modeSwitch.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mode]');
      if (btn) this._setMode(btn.dataset.mode, true);
    });
    this._panel.headerExtra.append(this._modeSwitch);
    this._footer = createElement('div', { className: 'hui-calendar__footer', part: 'footer' });

    // <template> trong light DOM đổi → vẽ lại ô
    this._slot = createElement('slot', { hidden: true });
    this._slot.addEventListener('slotchange', () => this.requestUpdate('cells'));

    this._base = createElement('div', { className: 'hui-calendar', part: 'base', role: 'group' },
      this._panel.el, this._footer, this._slot);
    return this._base;
  }

  updated(changed) {
    const panel = this._panel;
    if (changed.has('locale')) {
      panel.o.weekStart = localeWeekStart();
      this._todayBtn.textContent = dmsg('datePicker.today');
      this._modeMonth.textContent = dmsg('calendar.modeMonth');
      this._modeYear.textContent = dmsg('calendar.modeYear');
      this._modeSwitch.setAttribute('aria-label', dmsg('calendar.mode'));
      this._base.setAttribute('aria-label', dmsg('calendar.label'));
    }
    if (changed.has('variant')) {
      const full = this.variant === 'full';
      panel.o.className = full ? 'hui-cal--full' : '';
      this._base.className = `hui-calendar hui-calendar--${full ? 'full' : 'card'}`;
      // full: nút Hôm nay + đổi chế độ trên header; card: nút Hôm nay ở chân
      this._modeSwitch.hidden = !full;
      (full ? panel.headerExtra : this._footer).append(this._todayBtn);
    }
    if (changed.has('showWeek')) panel.o.showWeekNumber = this.showWeek;
    if (changed.has('hideToday') || changed.has('variant')) {
      this._todayBtn.hidden = this.hideToday;
      this._footer.hidden = this.hideToday || this.variant === 'full';
    }

    // Lần đầu / đổi value / default-month: đưa tháng đang xem về ngày được chọn
    const first = !this._painted;
    if (first || changed.has('value') || changed.has('defaultMonth')) {
      const d = this.valueAsDate || (first || changed.has('defaultMonth') ? parseISO(this.defaultMonth) : null) || (first ? this._now() : null);
      if (d) {
        panel.activeDate = makeDate(d.getFullYear(), d.getMonth(), d.getDate());
        panel.viewDate = panel._viewDateFor(d);
      }
    }
    if (first || changed.has('mode')) {
      panel.view = MODES.includes(this.mode) ? this.mode : 'month';
      panel.o.picker = { month: 'date', year: 'month', decade: 'year' }[panel.view];
      panel.viewDate = panel._viewDateFor(panel.activeDate);
      this._syncModeButtons();
    }
    // Vẽ lại khi mọi thứ ảnh hưởng tới ô thay đổi (đổi tháng bằng điều hướng do panel tự vẽ)
    const repaint = ['locale', 'variant', 'showWeek', 'value', 'mode', 'min', 'max', 'now', 'defaultMonth', 'disabledDate', 'cells']
      .some((k) => changed.has(k));
    if (repaint) {
      const focused = panel.hasFocus;
      panel.paint();
      if (focused) panel.focus();
    }
    this._painted = true;
  }

  // =====================================================
  // LOGIC
  // =====================================================

  _now() {
    return parseISO(this.now) || new Date();
  }

  _isDisabled(date, unit) {
    const min = parseISO(this.min);
    const max = parseISO(this.max);
    if (unit === 'date') {
      if (min && compareUnit(date, min) < 0) return true;
      if (max && compareUnit(date, max) > 0) return true;
      return Boolean(this._disabledDate?.(date));
    }
    // Tháng / năm: chỉ vô hiệu khi nằm trọn ngoài [min, max]
    const end = unit === 'month' ? endOfMonth(date) : makeDate(date.getFullYear(), 11, 31);
    if (min && compareUnit(end, min) < 0) return true;
    if (max && compareUnit(date, max) > 0) return true;
    return false;
  }

  _cellState(date, unit) {
    const v = this.valueAsDate;
    if (!v) return null;
    return { selected: compareUnit(date, v, unit) === 0 };
  }

  _cellContent(date, unit) {
    if (unit === 'date' && this._dateCellRender) return this._dateCellRender(date);
    if (unit === 'month' && this._monthCellRender) return this._monthCellRender(date);
    const tpl = this.querySelector(':scope > template');
    if (!tpl || !this._cellData) return null;
    const key = unitKey(date, unit);
    const data = typeof this._cellData === 'function' ? this._cellData(date, unit) : this._cellData[key];
    if (!data) return null;
    return renderTemplate(tpl, { date: key, day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear(), ...data });
  }

  /** Chọn ô: giữ ngày/tháng hiện tại khi chọn tháng / năm (giống Ant) */
  _select(date) {
    const unit = this._panel.unit;
    const base = this.valueAsDate || this._panel.activeDate;
    let d = date;
    if (unit === 'month') d = makeDate(date.getFullYear(), date.getMonth(), Math.min(base.getDate(), daysInMonth(date.getFullYear(), date.getMonth())));
    if (unit === 'year') {
      const m = base.getMonth();
      d = makeDate(date.getFullYear(), m, Math.min(base.getDate(), daysInMonth(date.getFullYear(), m)));
    }
    this._selectDate(d, SOURCE[this._panel.view]);
  }

  _selectDate(d, source) {
    const value = toISO(d, 'date');
    const changed = value !== this.value;
    this._panel.activeDate = makeDate(d.getFullYear(), d.getMonth(), d.getDate());
    this.value = value;
    if (changed || source) this.emit('hui-select', { value, date: d, source });
  }

  _goToday() {
    const now = this._now();
    const panel = this._panel;
    panel.activeDate = makeDate(now.getFullYear(), now.getMonth(), now.getDate());
    panel.setViewDate(now, 'today');
    if (!this._isDisabled(now, 'date')) this._selectDate(now, 'date');
    panel.focus();
  }

  _setMode(mode, user = false) {
    if (!MODES.includes(mode) || mode === this._panel.view) return;
    this.mode = mode;
    if (user) {
      // Đợi updated() đổi view rồi mới báo + focus vào ô
      this.updateComplete.then(() => {
        this._onViewChange({ view: this._panel.view, viewDate: this._panel.viewDate });
        this._panel.focus();
      });
    }
  }

  /** Đổi tháng / năm / view (bấm tiêu đề = đi lên tạm thời, chọn ô = quay về mode gốc) */
  _onViewChange({ view, viewDate }) {
    const d = view === 'month' ? viewDate : startOfMonth(this._panel.activeDate);
    this.emit('hui-panel-change', { year: d.getFullYear(), month: d.getMonth() + 1, mode: view, value: toISO(d, 'date') });
  }

  _syncModeButtons() {
    const view = this._panel.view;
    this._modeMonth.setAttribute('aria-pressed', String(view === 'month'));
    this._modeYear.setAttribute('aria-pressed', String(view === 'year'));
  }

  /** Focus vào ô đang active của lưới */
  focus(options) {
    if (this._panel) this._panel.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-calendar', HuiCalendar);

export default HuiCalendar;
