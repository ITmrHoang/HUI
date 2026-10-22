/**
 * CalendarPanel — bảng lịch dùng chung (KHÔNG phải custom element) cho hui-calendar, hui-date-picker,
 * hui-range-picker: dựng DOM vào shadow root của component chủ để focus / ::part / CSS ở cùng một chỗ.
 *
 * View (bảng đang hiển thị):
 *   month   — lưới ngày của 1 tháng (6 tuần)        decade — lưới 12 năm
 *   year    — lưới 12 tháng của 1 năm               quarter — 4 quý của 1 năm
 * picker (đơn vị được CHỌN): date | week | month | quarter | year → view gốc month | month | year | quarter | decade.
 * Bấm ô ở view cấp trên view gốc = đi xuống (năm → tháng → ngày), không phải chọn.
 *
 * Bàn phím theo mẫu WAI-ARIA APG Grid (date picker dialog): mũi tên, Home/End, PageUp/PageDown
 * (+Shift = theo năm), Enter/Space chọn. Focus kiểu roving tabindex (chỉ ô đang active có tabindex=0).
 */

import panelStyles from './calendar-panel.css?raw';

import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animateIn } from '../../utils/motion.js';
import '../hui-icon/index.js';
import {
  addDays, addMonths, addYears, decadeGrid, fullDateLabel, isSameUnit, makeDate, monthGrid, monthNames,
  pad, quarterOf, startOfMonth, startOfWeek, daysInMonth, toISO, weekdayNames, weekdayShortNames, weekInfo, yearGrid,
} from './date-utils.js';

export { panelStyles };


/** Chuỗi locale dùng chung của bộ ngày giờ — dự phòng khi locale.js chưa có key */
export const DATE_FALLBACK = {
  'datePicker.prevMonth': { vi: 'Tháng trước', en: 'Previous month' },
  'datePicker.nextMonth': { vi: 'Tháng sau', en: 'Next month' },
  'datePicker.prevYear': { vi: 'Năm trước', en: 'Previous year' },
  'datePicker.nextYear': { vi: 'Năm sau', en: 'Next year' },
  'datePicker.prevDecade': { vi: 'Thập kỷ trước', en: 'Previous decade' },
  'datePicker.nextDecade': { vi: 'Thập kỷ sau', en: 'Next decade' },
  'datePicker.chooseMonth': { vi: 'Chọn tháng', en: 'Choose month' },
  'datePicker.chooseYear': { vi: 'Chọn năm', en: 'Choose year' },
  'datePicker.week': { vi: 'Tuần', en: 'Wk' },
  'datePicker.weekLabel': { vi: 'Tuần {week}, {year}', en: 'Week {week}, {year}' },
  'datePicker.quarterLabel': { vi: 'Quý {quarter}, {year}', en: 'Quarter {quarter}, {year}' },
  'datePicker.weekPlaceholder': { vi: 'Chọn tuần', en: 'Select week' },
  'datePicker.monthPlaceholder': { vi: 'Chọn tháng', en: 'Select month' },
  'datePicker.quarterPlaceholder': { vi: 'Chọn quý', en: 'Select quarter' },
  'datePicker.yearPlaceholder': { vi: 'Chọn năm', en: 'Select year' },
  'datePicker.dateTimePlaceholder': { vi: 'Chọn ngày giờ', en: 'Select date and time' },
  'datePicker.presets': { vi: 'Chọn nhanh', en: 'Presets' },
  'datePicker.invalid': { vi: 'Ngày không hợp lệ', en: 'Invalid date' },
  'datePicker.dialog': { vi: 'Chọn ngày', en: 'Choose date' },
  'datePicker.last7Days': { vi: '7 ngày qua', en: 'Last 7 days' },
  'datePicker.last30Days': { vi: '30 ngày qua', en: 'Last 30 days' },
  'datePicker.thisWeek': { vi: 'Tuần này', en: 'This week' },
  'datePicker.thisMonth': { vi: 'Tháng này', en: 'This month' },
  'datePicker.lastMonth': { vi: 'Tháng trước', en: 'Last month' },
  'datePicker.thisYear': { vi: 'Năm nay', en: 'This year' },
  'calendar.label': { vi: 'Lịch', en: 'Calendar' },
  'calendar.modeMonth': { vi: 'Tháng', en: 'Month' },
  'calendar.modeYear': { vi: 'Năm', en: 'Year' },
  'calendar.mode': { vi: 'Chế độ xem', en: 'View mode' },
  'timePicker.placeholder': { vi: 'Chọn giờ', en: 'Select time' },
  'timePicker.hours': { vi: 'Giờ', en: 'Hours' },
  'timePicker.minutes': { vi: 'Phút', en: 'Minutes' },
  'timePicker.seconds': { vi: 'Giây', en: 'Seconds' },
  'timePicker.meridiem': { vi: 'Buổi', en: 'AM/PM' },
};

/** t() + dự phòng theo ngôn ngữ hiện tại */
export function dmsg(key, vars) {
  let v = t(key, vars);
  if (v === key) {
    const f = DATE_FALLBACK[key];
    v = f ? (f[getLocaleName()] || f.en) : key;
    if (vars) v = v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }
  return v;
}

/** picker → view gốc */
export const BASE_VIEW = { date: 'month', week: 'month', month: 'year', quarter: 'quarter', year: 'decade' };
/** view → đơn vị của ô */
export const VIEW_UNIT = { month: 'date', year: 'month', quarter: 'quarter', decade: 'year' };

/** Khóa duy nhất của ô theo đơn vị (dùng làm data-key) */
export function unitKey(date, unit) {
  switch (unit) {
    case 'month': return toISO(date, 'month');
    case 'quarter': return toISO(date, 'quarter');
    case 'year': return toISO(date, 'year');
    default: return toISO(date, 'date');
  }
}

let uid = 0;
const icon = (name) => createElement('hui-icon', { name, 'aria-hidden': 'true' });

export class CalendarPanel {
  /**
   * @param {object} o
   * @param {'date'|'week'|'month'|'quarter'|'year'} [o.picker='date']
   * @param {number} [o.weekStart=1]
   * @param {() => Date} [o.now]
   * @param {boolean} [o.showWeekNumber]
   * @param {boolean} [o.hideOutside] - ẩn ô tràn (ngày của tháng trước/sau, năm ngoài thập kỷ) — range picker 2 bảng
   * @param {{superPrev?: boolean, prev?: boolean, next?: boolean, superNext?: boolean}} [o.nav] - nút false = ẩn trên màn rộng
   * @param {(date: Date, unit: string) => boolean} [o.isDisabled]
   * @param {(date: Date, unit: string) => object} [o.cellState] - { selected, rangeStart, rangeEnd, inRange, previewStart, previewEnd, inPreview, weekSelected }
   * @param {(date: Date, unit: string) => (Node|string|null)} [o.cellContent]
   * @param {(date: Date, unit: string, ev: Event) => void} [o.onSelect]
   * @param {(date: Date|null, unit: string) => void} [o.onHover]
   * @param {(info: {view: string, viewDate: Date, source: string}) => void} [o.onViewChange]
   * @param {(date: Date, unit: string) => void} [o.onActive] - ô active đổi bằng bàn phím (xem trước khoảng)
   * @param {() => boolean} [o.animated]
   */
  constructor(o = {}) {
    this.o = {
      picker: 'date', weekStart: 1, now: () => new Date(), showWeekNumber: false, hideOutside: false, nav: {},
      isDisabled: () => false, cellState: () => null, cellContent: null,
      onSelect: () => {}, onHover: () => {}, onViewChange: () => {}, animated: () => true,
      ...o,
    };
    this.id = `hui-cal-${++uid}`;
    this.view = BASE_VIEW[this.o.picker] || 'month';
    const now = this.o.now();
    this.viewDate = startOfMonth(now);
    this.activeDate = makeDate(now.getFullYear(), now.getMonth(), now.getDate());
    /** @type {Map<string, {td: HTMLElement, date: Date, unit: string, outside: boolean}>} */
    this._cells = new Map();
    this._build();
  }

  get baseView() {
    return BASE_VIEW[this.o.picker] || 'month';
  }

  get unit() {
    return VIEW_UNIT[this.view];
  }

  /** Đổi tùy chọn rồi vẽ lại */
  set(opts) {
    Object.assign(this.o, opts);
    if ('picker' in opts) this.view = this.baseView;
    this.paint();
  }

  // =====================================================
  // DOM
  // =====================================================

  _build() {
    const navBtn = (kind, iconName) => {
      const b = createElement('button', {
        type: 'button', className: `hui-cal__nav hui-cal__nav--${kind}`, part: `nav-btn ${kind}`,
      }, icon(iconName));
      b.addEventListener('click', () => this._onNav(kind));
      return b;
    };
    this._superPrev = navBtn('super-prev', 'chevrons-left');
    this._prev = navBtn('prev', 'chevron-left');
    this._next = navBtn('next', 'chevron-right');
    this._superNext = navBtn('super-next', 'chevrons-right');

    this._monthBtn = createElement('button', { type: 'button', className: 'hui-cal__title-btn', part: 'title-btn month-btn' });
    this._monthBtn.addEventListener('click', () => this.setView('year', 'header'));
    this._yearBtn = createElement('button', { type: 'button', className: 'hui-cal__title-btn', part: 'title-btn year-btn' });
    this._yearBtn.addEventListener('click', () => this.setView('decade', 'header'));
    this._decadeLabel = createElement('span', { className: 'hui-cal__title-text' });
    this._title = createElement('div', {
      className: 'hui-cal__title', part: 'title', id: `${this.id}-title`, 'aria-live': 'polite',
    }, this._monthBtn, this._yearBtn, this._decadeLabel);

    /** Chỗ để component chủ gắn thêm nút (Hôm nay, chế độ xem...) */
    this.headerExtra = createElement('div', { className: 'hui-cal__extra', part: 'header-extra' });
    this.header = createElement('div', { className: 'hui-cal__header', part: 'header' },
      this._superPrev, this._prev, this._title, this._next, this._superNext, this.headerExtra);

    this._grid = createElement('table', {
      className: 'hui-cal__grid', part: 'grid', role: 'grid', 'aria-labelledby': `${this.id}-title`,
    });
    this._grid.addEventListener('keydown', (e) => this._onKeydown(e));
    this._grid.addEventListener('click', (e) => this._onClick(e));
    this._grid.addEventListener('mouseover', (e) => {
      const cell = this._cellFromEvent(e);
      if (this.view === this.baseView) this.o.onHover(cell && !cell.disabled ? cell.date : null, this.unit);
    });
    this._grid.addEventListener('mouseleave', () => {
      if (this.view === this.baseView) this.o.onHover(null, this.unit);
    });
    this._gridWrap = createElement('div', { className: 'hui-cal__body', part: 'body' }, this._grid);

    this.el = createElement('div', { className: 'hui-cal', part: 'panel' }, this.header, this._gridWrap);
  }

  _cellFromEvent(e) {
    const td = e.target.closest?.('[data-key]');
    if (!td || !this._grid.contains(td)) return null;
    const c = this._cells.get(td.dataset.key);
    return c ? { ...c, disabled: this._isDisabled(c) } : null;
  }

  _isDisabled(c) {
    return Boolean(this.o.isDisabled(c.date, c.unit));
  }

  // =====================================================
  // VẼ
  // =====================================================

  /** Vẽ lại toàn bộ lưới của view hiện tại */
  paint() {
    const view = this.view;
    this.el.className = ['hui-cal', `hui-cal--${view}`, this.o.picker === 'week' && view === 'month' ? 'hui-cal--week' : '',
      this.o.className || ''].filter(Boolean).join(' ');
    this._paintHeader();
    this._cells.clear();
    const rows = [];
    let head = null;

    if (view === 'month') {
      const y = this.viewDate.getFullYear();
      const m = this.viewDate.getMonth();
      const days = monthGrid(y, m, this.o.weekStart);
      const long = weekdayNames('long');
      const short = weekdayShortNames();
      const headCells = [];
      if (this.o.showWeekNumber) {
        headCells.push(createElement('th', { scope: 'col', role: 'columnheader', className: 'hui-cal__week-head', part: 'week-head' },
          dmsg('datePicker.week')));
      }
      for (let i = 0; i < 7; i++) {
        const wd = (this.o.weekStart + i) % 7;
        headCells.push(createElement('th', {
          scope: 'col', role: 'columnheader', abbr: long[wd], className: 'hui-cal__weekday', part: 'weekday',
        }, short[wd]));
      }
      head = createElement('thead', {}, createElement('tr', { role: 'row' }, ...headCells));
      for (let r = 0; r < 6; r++) {
        const week = days.slice(r * 7, r * 7 + 7);
        const cells = [];
        if (this.o.showWeekNumber) {
          const info = weekInfo(week[0], this.o.weekStart);
          const wn = createElement('td', {
            role: 'rowheader', className: 'hui-cal__week-num', part: 'week-num',
            'aria-label': dmsg('datePicker.weekLabel', { week: info.week, year: info.year }),
            dataset: { week: toISO(week[0], 'date') },
          }, String(info.week));
          cells.push(wn);
        }
        for (const d of week) cells.push(this._cell(d, 'date', d.getMonth() !== m));
        rows.push(createElement('tr', { role: 'row', className: 'hui-cal__row', part: 'row' }, ...cells));
      }
    } else if (view === 'year' || view === 'decade') {
      const list = view === 'year' ? yearGrid(this.viewDate.getFullYear()) : decadeGrid(this.viewDate.getFullYear());
      const decade = Math.floor(this.viewDate.getFullYear() / 10);
      for (let r = 0; r < 4; r++) {
        const cells = list.slice(r * 3, r * 3 + 3).map((d) => this._cell(d, VIEW_UNIT[view],
          view === 'decade' && Math.floor(d.getFullYear() / 10) !== decade));
        rows.push(createElement('tr', { role: 'row', className: 'hui-cal__row', part: 'row' }, ...cells));
      }
    } else {
      const y = this.viewDate.getFullYear();
      const cells = [0, 1, 2, 3].map((q) => this._cell(makeDate(y, q * 3, 1), 'quarter', false));
      rows.push(createElement('tr', { role: 'row', className: 'hui-cal__row', part: 'row' }, ...cells));
    }

    const body = createElement('tbody', {}, ...rows);
    this._grid.replaceChildren(...[head, body].filter(Boolean));
    this._ensureActiveVisible();
    this.refresh();
  }

  _cell(date, unit, outside) {
    const key = unitKey(date, unit);
    const hidden = outside && this.o.hideOutside;
    const td = createElement('td', { role: 'gridcell', className: 'hui-cal__cell', part: 'cell' });
    if (hidden) {
      td.className = 'hui-cal__cell hui-cal__cell--hidden';
      return td;
    }
    td.dataset.key = key;
    td.tabIndex = -1;
    const inner = createElement('div', { className: 'hui-cal__cell-inner', part: 'cell-inner' }, this._cellText(date, unit));
    td.append(inner);
    let label = this._cellLabel(date, unit);
    const content = this.o.cellContent?.(date, unit);
    if (content !== null && content !== undefined && content !== '' && content !== false) {
      const box = createElement('div', { className: 'hui-cal__cell-content', part: 'cell-content' });
      box.append(content instanceof Node ? content : String(content));
      td.append(box);
      const extra = box.textContent.trim();
      if (extra) label += `, ${extra}`;
    }
    td.setAttribute('aria-label', label);
    this._cells.set(key, { td, date, unit, outside });
    return td;
  }

  _cellText(date, unit) {
    switch (unit) {
      case 'month': return monthNames('short')[date.getMonth()];
      case 'quarter': return `Q${quarterOf(date)}`;
      case 'year': return String(date.getFullYear());
      default: return String(date.getDate());
    }
  }

  _cellLabel(date, unit) {
    switch (unit) {
      case 'month': return `${monthNames('long')[date.getMonth()]} ${date.getFullYear()}`;
      case 'quarter': return dmsg('datePicker.quarterLabel', { quarter: quarterOf(date), year: date.getFullYear() });
      case 'year': return String(date.getFullYear());
      default: return fullDateLabel(date);
    }
  }

  _paintHeader() {
    const view = this.view;
    const y = this.viewDate.getFullYear();
    const nav = this.o.nav || {};
    const month = view === 'month';
    this._monthBtn.hidden = !month;
    this._yearBtn.hidden = view === 'decade';
    this._decadeLabel.hidden = view !== 'decade';
    this._monthBtn.textContent = monthNames('long')[this.viewDate.getMonth()];
    this._monthBtn.setAttribute('aria-label', `${dmsg('datePicker.chooseMonth')}: ${this._monthBtn.textContent}`);
    this._yearBtn.textContent = String(y);
    this._yearBtn.setAttribute('aria-label', `${dmsg('datePicker.chooseYear')}: ${y}`);
    const start = Math.floor(y / 10) * 10;
    this._decadeLabel.textContent = `${start} – ${start + 9}`;
    // Bảng gốc là năm/quý/thập kỷ thì không đi lên được nữa
    this._monthBtn.disabled = false;
    this._yearBtn.disabled = this.baseView === 'decade';

    this._prev.hidden = !month;
    this._next.hidden = !month;
    const superLabel = view === 'decade' ? ['prevDecade', 'nextDecade'] : ['prevYear', 'nextYear'];
    this._superPrev.setAttribute('aria-label', dmsg(`datePicker.${superLabel[0]}`));
    this._superNext.setAttribute('aria-label', dmsg(`datePicker.${superLabel[1]}`));
    this._prev.setAttribute('aria-label', dmsg('datePicker.prevMonth'));
    this._next.setAttribute('aria-label', dmsg('datePicker.nextMonth'));
    // nav[x] === false: ẩn trên màn rộng (range picker hiện 2 bảng) — CSS hiện lại khi chỉ còn 1 bảng
    for (const [k, el] of [['superPrev', this._superPrev], ['prev', this._prev], ['next', this._next], ['superNext', this._superNext]]) {
      el.classList.toggle('hui-cal__nav--wide-hidden', nav[k] === false);
    }
  }

  /** Chỉ cập nhật trạng thái các ô (chọn / khoảng / hover / disabled / focus) — không dựng lại DOM */
  refresh() {
    const now = this.o.now();
    const activeKey = unitKey(this.activeDate, this.unit);
    for (const [key, c] of this._cells) {
      const st = (this.view === this.baseView || c.unit !== 'date' ? this.o.cellState(c.date, c.unit) : null) || {};
      const disabled = this._isDisabled(c);
      const today = isSameUnit(c.date, now, c.unit);
      const flags = {
        today, outside: c.outside, disabled,
        selected: st.selected, 'range-start': st.rangeStart, 'range-end': st.rangeEnd, 'in-range': st.inRange,
        'preview-start': st.previewStart, 'preview-end': st.previewEnd, 'in-preview': st.inPreview, 'week-selected': st.weekSelected,
        active: key === activeKey,
      };
      const on = Object.keys(flags).filter((k) => flags[k]);
      c.td.className = ['hui-cal__cell', ...on.map((k) => `hui-cal__cell--${k}`)].join(' ');
      c.td.setAttribute('part', ['cell', ...on.filter((k) => k !== 'active').map((k) => `cell-${k}`)].join(' '));
      c.td.setAttribute('aria-selected', String(Boolean(st.selected || st.rangeStart || st.rangeEnd || st.weekSelected)));
      if (disabled) c.td.setAttribute('aria-disabled', 'true');
      else c.td.removeAttribute('aria-disabled');
      if (today && c.unit === 'date') c.td.setAttribute('aria-current', 'date');
      else c.td.removeAttribute('aria-current');
      c.td.tabIndex = key === activeKey ? 0 : -1;
    }
  }

  // =====================================================
  // ĐIỀU HƯỚNG
  // =====================================================

  /** Ô active phải nằm trong lưới hiện tại; không thì chọn ô hợp lý (đã chọn → hôm nay → ô đầu) */
  _ensureActiveVisible() {
    if (this._cells.has(unitKey(this.activeDate, this.unit))) {
      const c = this._cells.get(unitKey(this.activeDate, this.unit));
      if (!c.outside) return;
    }
    const inView = [...this._cells.values()].filter((c) => !c.outside);
    const pick = inView.find((c) => {
      const st = this.o.cellState(c.date, c.unit) || {};
      return st.selected || st.rangeStart;
    }) || inView.find((c) => isSameUnit(c.date, this.o.now(), c.unit)) || inView[0];
    if (pick) this.activeDate = this._day(pick.date);
  }

  /** Bỏ phần giờ */
  _day(d) {
    return makeDate(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Ngày `d` có nằm trong khoảng đang hiển thị (không tính ngày tràn) của view hiện tại */
  _inView(d) {
    const v = this.viewDate;
    switch (this.view) {
      case 'month': return d.getFullYear() === v.getFullYear() && d.getMonth() === v.getMonth();
      case 'decade': return Math.floor(d.getFullYear() / 10) === Math.floor(v.getFullYear() / 10);
      default: return d.getFullYear() === v.getFullYear();
    }
  }

  /** Mốc hiển thị chứa ngày `d` theo view */
  _viewDateFor(d, view = this.view) {
    return view === 'month' ? startOfMonth(d) : makeDate(d.getFullYear(), 0, 1);
  }

  /** Đổi mốc hiển thị (tháng / năm / thập kỷ), source: nav | keyboard | select | api */
  setViewDate(date, source = 'api', { silent = false } = {}) {
    const next = this._viewDateFor(date);
    const changed = next.getTime() !== this.viewDate.getTime();
    const dir = Math.sign(next - this.viewDate);
    this.viewDate = next;
    if (!this._inView(this.activeDate)) {
      // Đưa ô active vào khoảng mới, giữ ngày trong tháng (31 → ngày cuối tháng)
      const a = this.activeDate;
      const y = next.getFullYear();
      const m = this.view === 'month' ? next.getMonth() : a.getMonth();
      this.activeDate = makeDate(y, m, Math.min(a.getDate(), daysInMonth(y, m)));
    }
    this.paint();
    if (changed && dir && this.o.animated()) {
      animateIn(this._grid, dir > 0 ? 'slide-left' : 'slide-right', { duration: 160 });
    }
    if (changed && !silent) this.o.onViewChange({ view: this.view, viewDate: this.viewDate, source });
  }

  /** Đổi view (month | year | quarter | decade) */
  setView(view, source = 'api') {
    if (!VIEW_UNIT[view]) return;
    const prev = this.view;
    this.view = view;
    // Sau mỗi lần vẽ ô active luôn nằm trong lưới → lấy nó làm mốc cho view mới
    this.viewDate = this._viewDateFor(this.activeDate);
    this.paint();
    if (prev !== view) this.o.onViewChange({ view, viewDate: this.viewDate, source });
    if (source !== 'api') this.focus();
  }

  /** Đặt ô active (focus = chuyển focus thật vào ô) — tự đổi tháng/năm nếu ô nằm ngoài lưới */
  setActive(date, focus = true, source = 'keyboard') {
    this.activeDate = this._day(date);
    if (!this._inView(this.activeDate)) this.setViewDate(this.activeDate, source);
    else this.refresh();
    if (focus) this.focus();
    if (source === 'keyboard' && this.view === this.baseView) this.o.onActive?.(this.activeDate, this.unit);
  }

  /** Focus vào ô active (roving tabindex) */
  focus() {
    const c = this._cells.get(unitKey(this.activeDate, this.unit));
    (c?.td || this._grid.querySelector('[tabindex="0"]'))?.focus({ preventScroll: true });
  }

  /** Ô đang active có focus không (để biết có cần trả focus khi vẽ lại) */
  get hasFocus() {
    const root = this.el.getRootNode();
    return Boolean(root.activeElement && this.el.contains(root.activeElement));
  }

  _onNav(kind) {
    const v = this.viewDate;
    let next;
    if (kind === 'prev') next = addMonths(v, -1);
    else if (kind === 'next') next = addMonths(v, 1);
    else {
      const step = this.view === 'decade' ? 10 : 1;
      next = addYears(v, kind === 'super-prev' ? -step : step);
    }
    // Ô active đi theo cùng khoảng để Tab vào lưới đúng tháng mới
    const delta = this.view === 'month' && (kind === 'prev' || kind === 'next') ? (kind === 'prev' ? -1 : 1) : 0;
    if (delta) this.activeDate = addMonths(this.activeDate, delta);
    else {
      const years = (this.view === 'decade' ? 10 : 1) * (kind === 'super-prev' ? -1 : 1);
      this.activeDate = addYears(this.activeDate, years);
    }
    this.setViewDate(next, 'nav');
  }

  _drill(date) {
    // Đi xuống 1 cấp: thập kỷ → năm (hoặc quý) → tháng
    const target = this.view === 'decade' ? (this.baseView === 'quarter' ? 'quarter' : 'year') : 'month';
    if (this.view === 'decade') {
      const a = this.activeDate;
      this.activeDate = makeDate(date.getFullYear(), a.getMonth(), Math.min(a.getDate(), daysInMonth(date.getFullYear(), a.getMonth())));
    } else {
      const a = this.activeDate;
      this.activeDate = makeDate(date.getFullYear(), date.getMonth(), Math.min(a.getDate(), daysInMonth(date.getFullYear(), date.getMonth())));
    }
    this.view = target;
    this.viewDate = this._viewDateFor(this.activeDate);
    this.paint();
    this.o.onViewChange({ view: this.view, viewDate: this.viewDate, source: 'select' });
    this.focus();
  }

  _activate(c, ev) {
    if (!c || this._isDisabled(c)) return;
    if (this.view !== this.baseView) {
      this._drill(c.date);
      return;
    }
    this.activeDate = this._day(c.date);
    if (c.outside) this.setViewDate(c.date, 'select');
    this.o.onSelect(c.date, this.o.picker, ev);
  }

  _onClick(e) {
    const wn = e.target.closest?.('[data-week]');
    if (wn && this.o.picker === 'week') {
      const c = this._cells.get(wn.dataset.week);
      if (c) this._activate(c, e);
      return;
    }
    const cell = this._cellFromEvent(e);
    if (cell) this._activate(this._cells.get(unitKey(cell.date, cell.unit)), e);
  }

  _onKeydown(e) {
    const { key, shiftKey } = e;
    const a = this.activeDate;
    let next = null;
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      this._activate(this._cells.get(unitKey(a, this.unit)), e);
      return;
    }
    switch (this.view) {
      case 'month': {
        const ws = startOfWeek(a, this.o.weekStart);
        next = {
          ArrowLeft: () => addDays(a, -1), ArrowRight: () => addDays(a, 1),
          ArrowUp: () => addDays(a, -7), ArrowDown: () => addDays(a, 7),
          Home: () => ws, End: () => addDays(ws, 6),
          PageUp: () => (shiftKey ? addYears(a, -1) : addMonths(a, -1)),
          PageDown: () => (shiftKey ? addYears(a, 1) : addMonths(a, 1)),
        }[key];
        break;
      }
      case 'year': {
        const m = a.getMonth();
        next = {
          ArrowLeft: () => addMonths(a, -1), ArrowRight: () => addMonths(a, 1),
          ArrowUp: () => addMonths(a, -3), ArrowDown: () => addMonths(a, 3),
          Home: () => addMonths(a, -(m % 3)), End: () => addMonths(a, 2 - (m % 3)),
          PageUp: () => addYears(a, -1), PageDown: () => addYears(a, 1),
        }[key];
        break;
      }
      case 'quarter': {
        const q = quarterOf(a) - 1;
        next = {
          ArrowLeft: () => addMonths(a, -3), ArrowRight: () => addMonths(a, 3),
          ArrowUp: () => addYears(a, -1), ArrowDown: () => addYears(a, 1),
          Home: () => addMonths(a, -3 * q), End: () => addMonths(a, 3 * (3 - q)),
          PageUp: () => addYears(a, -1), PageDown: () => addYears(a, 1),
        }[key];
        break;
      }
      default: {
        const idx = a.getFullYear() - (Math.floor(this.viewDate.getFullYear() / 10) * 10 - 1);
        next = {
          ArrowLeft: () => addYears(a, -1), ArrowRight: () => addYears(a, 1),
          ArrowUp: () => addYears(a, -3), ArrowDown: () => addYears(a, 3),
          Home: () => addYears(a, -(idx % 3)), End: () => addYears(a, 2 - (idx % 3)),
          PageUp: () => addYears(a, -10), PageDown: () => addYears(a, 10),
        }[key];
      }
    }
    if (!next) return;
    e.preventDefault();
    this.setActive(next(), true, 'keyboard');
  }
}

/** Mẫu ngày ISO 'YYYY-MM-DD' của ô active — tiện cho test */
export const isoDay = (d) => `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
