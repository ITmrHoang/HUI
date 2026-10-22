/**
 * TimePanel — các cột giờ / phút / giây (+ SA/CH khi 12 giờ) dùng chung cho hui-time-picker và
 * hui-date-picker / hui-range-picker (show-time). Không phải custom element: dựng DOM vào shadow root của chủ.
 *
 * Mỗi cột là 1 listbox (WAI-ARIA APG): ↑ ↓ Home End chọn (selection follows focus), ← → sang cột khác,
 * Enter = xác nhận (onEnter). Option bị vô hiệu (disabledTime) được bỏ qua khi di chuyển.
 */

import timeStyles from './time-panel.css?raw';

import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import { dayPeriodNames, pad } from '../hui-calendar/date-utils.js';
import { dmsg } from '../hui-calendar/calendar-panel.js';

export { timeStyles };

let uid = 0;

/** Mẫu giờ → có giây / 12 giờ không */
export function timeFormatInfo(fmt = 'HH:mm') {
  return { seconds: /s/.test(fmt), use12: /h/.test(fmt) && /a/i.test(fmt), minutes: /m/.test(fmt) };
}

export class TimePanel {
  /**
   * @param {object} o
   * @param {boolean} [o.showSeconds]
   * @param {boolean} [o.use12Hours]
   * @param {number} [o.hourStep=1]
   * @param {number} [o.minuteStep=1]
   * @param {number} [o.secondStep=1]
   * @param {() => ({disabledHours?: () => number[], disabledMinutes?: (h: number) => number[], disabledSeconds?: (h: number, m: number) => number[]})} [o.disabledTime]
   * @param {(time: {h: number, m: number, s: number}, unit: string) => void} [o.onChange]
   * @param {() => void} [o.onEnter]
   * @param {() => boolean} [o.animated]
   */
  constructor(o = {}) {
    this.o = {
      showSeconds: false, use12Hours: false, hourStep: 1, minuteStep: 1, secondStep: 1, showMinutes: true,
      disabledTime: () => ({}), onChange: () => {}, onEnter: () => {}, animated: () => true,
      ...o,
    };
    this.id = `hui-time-${++uid}`;
    /** @type {{h: number, m: number, s: number} | null} */
    this.value = null;
    this.el = createElement('div', { className: 'hui-time', part: 'time-panel', role: 'group' });
    this.el.addEventListener('click', (e) => this._onClick(e));
    this.el.addEventListener('keydown', (e) => this._onKeydown(e));
    this._cols = [];
  }

  set(opts) {
    Object.assign(this.o, opts);
    this.paint();
  }

  // =====================================================
  // DỰNG CỘT
  // =====================================================

  _units() {
    const units = ['hour'];
    if (this.o.showMinutes !== false) units.push('minute');
    if (this.o.showSeconds) units.push('second');
    if (this.o.use12Hours) units.push('meridiem');
    return units;
  }

  _optionsFor(unit) {
    const step = (n) => Math.max(1, Math.floor(Number(n) || 1));
    const range = (max, st) => Array.from({ length: Math.ceil(max / st) }, (_, i) => i * st);
    switch (unit) {
      case 'hour':
        if (this.o.use12Hours) {
          // 12, 1, 2 … 11 (giá trị lưu là giờ 0-11 trong buổi)
          return range(12, step(this.o.hourStep)).map((v) => ({ value: v, text: pad(v === 0 ? 12 : v) }));
        }
        return range(24, step(this.o.hourStep)).map((v) => ({ value: v, text: pad(v) }));
      case 'minute': return range(60, step(this.o.minuteStep)).map((v) => ({ value: v, text: pad(v) }));
      case 'second': return range(60, step(this.o.secondStep)).map((v) => ({ value: v, text: pad(v) }));
      default: return dayPeriodNames().map((text, v) => ({ value: v, text }));
    }
  }

  /** Dựng lại toàn bộ cột (gọi khi đổi cấu hình / locale) */
  paint() {
    const labels = { hour: 'timePicker.hours', minute: 'timePicker.minutes', second: 'timePicker.seconds', meridiem: 'timePicker.meridiem' };
    this._cols = this._units().map((unit) => {
      const ul = createElement('ul', {
        className: `hui-time__col hui-time__col--${unit}`, part: `time-column ${unit}-column`, role: 'listbox',
        tabindex: '0', 'aria-label': dmsg(labels[unit]), dataset: { unit },
      });
      const items = this._optionsFor(unit).map((opt) => {
        const li = createElement('li', {
          className: 'hui-time__cell', part: 'time-cell', role: 'option', id: `${this.id}-${unit}-${opt.value}`,
          'aria-selected': 'false', dataset: { unit, value: String(opt.value) },
        }, opt.text);
        return { ...opt, li };
      });
      ul.append(...items.map((i) => i.li));
      return { unit, ul, items };
    });
    this.el.replaceChildren(...this._cols.map((c) => c.ul));
    this.refresh(false);
  }

  // =====================================================
  // TRẠNG THÁI
  // =====================================================

  /** Giờ 24h thực tế của option `v` ở cột giờ (12h: cộng 12 nếu đang buổi chiều) */
  _hour24(v, pm = this._pm()) {
    return this.o.use12Hours ? (v % 12) + (pm ? 12 : 0) : v;
  }

  _pm() {
    return Boolean(this.value && this.value.h >= 12);
  }

  _selectedValue(unit) {
    const v = this.value;
    if (!v) return null;
    switch (unit) {
      case 'hour': return this.o.use12Hours ? v.h % 12 : v.h;
      case 'minute': return v.m;
      case 'second': return v.s;
      default: return v.h >= 12 ? 1 : 0;
    }
  }

  /** Tập giá trị bị chặn của cột (giờ: tính theo 24h) — tính 1 lần cho cả cột */
  _disabledSet(unit) {
    const dt = this.o.disabledTime?.() || {};
    const v = this.value || { h: 0, m: 0, s: 0 };
    const list = (fn, ...args) => (typeof fn === 'function' ? fn(...args) || [] : []);
    switch (unit) {
      case 'minute': return new Set(list(dt.disabledMinutes, v.h));
      case 'second': return new Set(list(dt.disabledSeconds, v.h, v.m));
      default: return new Set(list(dt.disabledHours));
    }
  }

  _isIn(unit, set, optValue) {
    if (unit === 'hour') return set.has(this._hour24(optValue));
    // Cả buổi bị vô hiệu khi mọi giờ trong buổi đều bị chặn
    if (unit === 'meridiem') return Array.from({ length: 12 }, (_, i) => i + optValue * 12).every((h) => set.has(h));
    return set.has(optValue);
  }

  _isDisabled(unit, optValue) {
    return this._isIn(unit, this._disabledSet(unit), optValue);
  }

  /** Cập nhật aria-selected / disabled + cuộn option đang chọn lên đầu cột */
  refresh(smooth = true) {
    for (const col of this._cols) {
      const sel = this._selectedValue(col.unit);
      const set = this._disabledSet(col.unit);
      let selectedLi = null;
      for (const item of col.items) {
        const selected = sel === item.value;
        const disabled = this._isIn(col.unit, set, item.value);
        item.li.setAttribute('aria-selected', String(selected));
        if (disabled) item.li.setAttribute('aria-disabled', 'true');
        else item.li.removeAttribute('aria-disabled');
        item.li.className = ['hui-time__cell', selected && 'hui-time__cell--selected', disabled && 'hui-time__cell--disabled']
          .filter(Boolean).join(' ');
        item.li.setAttribute('part', ['time-cell', selected && 'time-cell-selected', disabled && 'time-cell-disabled'].filter(Boolean).join(' '));
        if (selected) selectedLi = item.li;
      }
      if (selectedLi) col.ul.setAttribute('aria-activedescendant', selectedLi.id);
      else col.ul.removeAttribute('aria-activedescendant');
      if (selectedLi) this._scrollTo(col, selectedLi, smooth);
    }
  }

  _scrollTo(col, li, smooth) {
    const top = li.offsetTop;
    if (Math.abs(col.ul.scrollTop - top) < 1) return;
    const behavior = smooth && this.o.animated() && !prefersReducedMotion() ? 'smooth' : 'auto';
    if (typeof col.ul.scrollTo === 'function') col.ul.scrollTo({ top, behavior });
    else col.ul.scrollTop = top;
  }

  /** Gán giá trị từ ngoài (không phát onChange) */
  setValue(time) {
    this.value = time ? { h: time.h || 0, m: time.m || 0, s: time.s || 0 } : null;
    this.refresh(false);
  }

  /** Cuộn lại sau khi popup vừa hiện (lúc ẩn chưa đo được offsetTop) */
  syncScroll() {
    this.refresh(false);
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  _pick(unit, optValue) {
    if (this._isDisabled(unit, optValue)) return false;
    const v = { ...(this.value || { h: 0, m: 0, s: 0 }) };
    if (unit === 'hour') v.h = this._hour24(optValue);
    else if (unit === 'minute') v.m = optValue;
    else if (unit === 'second') v.s = optValue;
    else v.h = (v.h % 12) + (optValue ? 12 : 0);
    this.value = v;
    this.refresh();
    this.o.onChange({ ...v }, unit);
    return true;
  }

  _onClick(e) {
    const li = e.target.closest?.('[role="option"]');
    if (!li || li.getAttribute('aria-disabled') === 'true') return;
    this._pick(li.dataset.unit, Number(li.dataset.value));
    li.closest('[role="listbox"]')?.focus({ preventScroll: true });
  }

  _onKeydown(e) {
    const ul = e.target.closest?.('[role="listbox"]');
    if (!ul) return;
    const ci = this._cols.findIndex((c) => c.ul === ul);
    const col = this._cols[ci];
    const { key } = e;
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const next = this._cols[ci + (key === 'ArrowLeft' ? -1 : 1)];
      if (next) {
        e.preventDefault();
        next.ul.focus({ preventScroll: true });
      }
      return;
    }
    if (key === 'Enter') {
      e.preventDefault();
      this.o.onEnter();
      return;
    }
    const sel = this._selectedValue(col.unit);
    const idx = col.items.findIndex((i) => i.value === sel);
    const enabled = (i) => !this._isDisabled(col.unit, col.items[i].value);
    const find = (from, dir) => {
      for (let i = from; i >= 0 && i < col.items.length; i += dir) if (enabled(i)) return i;
      return -1;
    };
    let target = -1;
    if (key === 'ArrowDown') target = find(idx < 0 ? 0 : idx + 1, 1);
    else if (key === 'ArrowUp') target = idx < 0 ? find(col.items.length - 1, -1) : find(idx - 1, -1);
    else if (key === 'Home') target = find(0, 1);
    else if (key === 'End') target = find(col.items.length - 1, -1);
    else return;
    e.preventDefault();
    if (target >= 0) this._pick(col.unit, col.items[target].value);
  }

  /** Focus cột đầu tiên */
  focus() {
    this._cols[0]?.ul.focus({ preventScroll: true });
  }
}
