/**
 * HUI Filter Chips — Hàng chip lọc nhanh (chọn một / nhiều), tham gia <form> native.
 * Nhận `options` [{ value, label, count, icon, disabled }], chip "Xóa lọc" khi đang lọc, chip "Tất cả" tùy chọn.
 * Tràn chiều ngang → cuộn ngang (kéo chuột / lăn chuột), mép mờ dần. Chip là nút bật/tắt (aria-pressed).
 */

import styles from './hui-filter-chips.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { formatNumber } from '../../core/format.js';
import { dragToScroll, overflowEdges, wheelToHorizontal } from '../../utils/scroll.js';
import '../hui-icon/hui-icon.js';

const FALLBACK = {
  'filterChips.clear': { vi: 'Xóa lọc', en: 'Clear filters' },
  'filterChips.label': { vi: 'Bộ lọc nhanh', en: 'Quick filters' },
};
const msg = (key) => {
  const v = t(key);
  return v !== key ? v : FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

function toArray(v) {
  if (Array.isArray(v)) return v.map(String);
  if (v === null || v === undefined || v === '') return [];
  const s = String(v);
  if (s.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch { /* tách dấu phẩy */ }
  }
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

function normalize(o) {
  if (o !== null && typeof o === 'object') {
    return {
      value: String(o.value ?? o.label ?? ''),
      label: String(o.label ?? o.value ?? ''),
      count: o.count ?? null,
      icon: o.icon ? String(o.icon) : '',
      disabled: Boolean(o.disabled),
    };
  }
  return { value: String(o), label: String(o), count: null, icon: '', disabled: false };
}

/**
 * Hàng chip lọc.
 * @fires input - Lựa chọn đổi (phát trước change). detail: { value }
 * @fires change - Lựa chọn đổi. detail: { value }
 * @fires hui-change - Như change. detail: { value }
 * @csspart base - Vùng cuộn ngang chứa chip
 * @csspart chip - Mỗi chip (+ chip-selected, chip-disabled, chip-all)
 * @csspart icon - Icon của chip
 * @csspart check - Dấu ✓ trên chip đang chọn (multiple)
 * @csspart label - Chữ của chip
 * @csspart count - Số đếm của chip
 * @csspart clear - Chip "Xóa lọc"
 * @cssprop --hui-filter-chips-gap - Khoảng cách giữa các chip
 * @cssprop --hui-filter-chips-height - Chiều cao chip
 * @cssprop --hui-filter-chips-radius - Bo góc chip
 * @cssprop --hui-filter-chips-bg - Nền chip
 * @cssprop --hui-filter-chips-color - Màu chữ chip
 * @cssprop --hui-filter-chips-border-color - Viền chip
 * @cssprop --hui-filter-chips-hover-bg - Nền chip khi hover
 * @cssprop --hui-filter-chips-selected-bg - Nền chip đang chọn
 * @cssprop --hui-filter-chips-selected-color - Màu chữ chip đang chọn
 * @cssprop --hui-filter-chips-selected-border-color - Viền chip đang chọn
 * @cssprop --hui-filter-chips-count-bg - Nền số đếm
 * @cssprop --hui-filter-chips-fade - Độ rộng vùng mờ ở mép khi tràn (mặc định 24px)
 */
class HuiFilterChips extends HuiFormElement {
  static properties = {
    /** Chọn một: chuỗi ('' = không lọc); multiple: mảng (attribute nhận 'a,b' hoặc JSON) */
    value: { type: String, default: '', reflect: false },
    /** [{ value, label, count, icon, disabled }] hoặc mảng chuỗi — gán bằng property (attribute nhận JSON) */
    options: { type: Array, default: [] },
    /** Cho chọn nhiều chip */
    multiple: { type: Boolean },
    /** Chữ chip "Tất cả" đặt đầu hàng (bỏ trống = không có chip này) */
    allLabel: { type: String, default: '' },
    /** Ẩn chip "Xóa lọc" */
    noClear: { type: Boolean },
    /** Chữ chip xóa (mặc định "Xóa lọc") */
    clearText: { type: String, default: '' },
    /** Xuống dòng thay vì cuộn ngang khi tràn */
    wrap: { type: Boolean },
    /** Nhãn ARIA của nhóm (mặc định "Bộ lọc nhanh") */
    label: { type: String, default: '' },
  };

  static styles = styles;

  constructor() {
    super();
    this._chips = [];
  }

  get value() {
    const raw = this._getProp('value');
    if (this.multiple) return toArray(raw);
    if (Array.isArray(raw)) return raw.length ? String(raw[0]) : '';
    return raw == null ? '' : String(raw);
  }

  set value(v) {
    this._setProp('value', Array.isArray(v) ? v.map(String) : v);
  }

  connectedCallback() {
    super.connectedCallback();
    this._cleanups = [dragToScroll(this._track), wheelToHorizontal(this._track)].filter((f) => typeof f === 'function');
    if (typeof ResizeObserver === 'function') {
      this._ro = new ResizeObserver(() => this._syncFade());
      this._ro.observe(this._track);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanups?.forEach((f) => f());
    this._ro?.disconnect();
  }

  render() {
    this._track = createElement('div', { className: 'fc', part: 'base', role: 'group' });
    this._track.addEventListener('click', (e) => {
      const chip = e.target.closest?.('button');
      if (!chip) return;
      if (chip.dataset.action === 'clear') this._commit(this.multiple ? [] : '');
      else if (chip.dataset.action === 'all') this._commit(this.multiple ? [] : '');
      else this._toggle(chip.dataset.value);
    });
    this._track.addEventListener('keydown', (e) => this._onKeydown(e));
    this._track.addEventListener('scroll', () => this._syncFade(), { passive: true });
    this._track.addEventListener('focusout', (e) => {
      if (!this._track.contains(e.relatedTarget)) this.markInteracted();
    });
    return this._track;
  }

  updated(changed) {
    if (changed.has('name') || changed.has('multiple')) this._syncForm();
    this._renderChips();
    this._track.className = ['fc', `fc--${this.effectiveSize}`, this.wrap && 'fc--wrap', this.isDisabled && 'fc--disabled']
      .filter(Boolean).join(' ');
    this._track.setAttribute('aria-label', this.label || msg('filterChips.label'));
    this.setState('disabled', this.isDisabled);
    super.updated(changed);
    requestAnimationFrame(() => this._syncFade());
  }

  _isOn(v) {
    return this.multiple ? this.value.includes(v) : this.value === v;
  }

  _chip({ value, label, count, icon, disabled }, kind = '') {
    const on = kind === 'all' ? this._isEmpty() : kind === 'clear' ? false : this._isOn(value);
    const btn = createElement('button', { type: 'button', className: 'fc__chip' });
    if (kind) btn.dataset.action = kind;
    else btn.dataset.value = value;
    if (kind !== 'clear') btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('fc__chip--selected', on);
    btn.disabled = this.isDisabled || disabled;
    btn.setAttribute('part', [kind === 'clear' ? 'clear' : 'chip', on && 'chip-selected', disabled && 'chip-disabled', kind === 'all' && 'chip-all']
      .filter(Boolean).join(' '));
    if (kind === 'clear') btn.append(createElement('hui-icon', { name: 'close', className: 'fc__icon', 'aria-hidden': 'true' }));
    else if (this.multiple && on && kind !== 'all') btn.append(createElement('hui-icon', { name: 'check', className: 'fc__check', part: 'check', 'aria-hidden': 'true' }));
    if (icon) btn.append(createElement('hui-icon', { name: icon, className: 'fc__icon', part: 'icon', 'aria-hidden': 'true' }));
    btn.append(createElement('span', { className: 'fc__label', part: 'label' }, label));
    if (count !== null && count !== undefined && count !== '') {
      const n = Number(count);
      btn.append(createElement('span', { className: 'fc__count', part: 'count' }, Number.isFinite(n) ? formatNumber(n, { notation: n >= 10000 ? 'compact' : 'standard' }) : String(count)));
    }
    return btn;
  }

  _renderChips() {
    const items = (Array.isArray(this.options) ? this.options : []).map(normalize);
    // Giữ focus ở đúng chip sau khi vẽ lại
    const focused = this.shadowRoot.activeElement;
    const focusKey = focused ? focused.dataset.value ?? `@${focused.dataset.action}` : null;

    const chips = [];
    if (this.allLabel) chips.push(this._chip({ value: '', label: this.allLabel, count: null, icon: '', disabled: false }, 'all'));
    for (const item of items) chips.push(this._chip(item));
    if (!this.noClear && !this._isEmpty()) {
      chips.push(this._chip({ value: '', label: this.clearText || msg('filterChips.clear'), count: null, icon: '', disabled: false }, 'clear'));
    }
    this._chips = chips;
    this._track.replaceChildren(...chips);
    if (focusKey !== null) {
      const again = chips.find((c) => (c.dataset.value ?? `@${c.dataset.action}`) === focusKey) || chips.find((c) => !c.disabled);
      again?.focus({ preventScroll: true });
    }
  }

  _toggle(v) {
    if (this.isDisabled || this.readonly) return;
    if (this.multiple) {
      const set = new Set(this.value);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      const order = (Array.isArray(this.options) ? this.options : []).map((o) => normalize(o).value);
      this._commit([...order.filter((x) => set.has(x)), ...[...set].filter((x) => !order.includes(x))]);
    } else {
      this._commit(this.value === v ? '' : v);
    }
  }

  _commit(next) {
    if (this.isDisabled || this.readonly) return;
    const before = JSON.stringify(this.value);
    this.value = next;
    this.markInteracted();
    if (JSON.stringify(this.value) === before) return;
    const detail = { value: this.value };
    this.emit('input', detail);
    this.emit('change', detail);
    this.emit('hui-change', detail);
  }

  /** ←/→, Home/End di chuyển focus giữa các chip */
  _onKeydown(e) {
    const chips = this._chips.filter((c) => !c.disabled);
    const i = chips.indexOf(e.target);
    if (i < 0) return;
    let target = null;
    if (e.key === 'ArrowRight') target = chips[Math.min(i + 1, chips.length - 1)];
    else if (e.key === 'ArrowLeft') target = chips[Math.max(i - 1, 0)];
    else if (e.key === 'Home') target = chips[0];
    else if (e.key === 'End') target = chips[chips.length - 1];
    if (!target) return;
    e.preventDefault();
    target.focus();
    target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  /** Mép nào còn chip bị che → làm mờ mép đó */
  _syncFade() {
    if (!this._track || this.wrap) return;
    const edges = overflowEdges(this._track);
    this._track.classList.toggle('fc--fade-start', edges.start);
    this._track.classList.toggle('fc--fade-end', edges.end);
  }

  // =====================================================
  // FORM
  // =====================================================

  formValue() {
    if (this._isEmpty()) return null;
    if (!this.multiple) return this.value;
    if (!this.name) return null;
    const data = new FormData();
    for (const v of this.value) data.append(this.name, v);
    return data;
  }

  _isEmpty() {
    return this.multiple ? this.value.length === 0 : this.value === '';
  }

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() {
    return this._chips.find((c) => !c.dataset.action) || this._chips[0];
  }

  formStateRestoreCallback(state) {
    if (state instanceof FormData) this.value = state.getAll(this.name);
    else super.formStateRestoreCallback(state);
  }

  focus(options) {
    const first = this._chips.find((c) => !c.disabled);
    if (first) first.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-filter-chips', HuiFilterChips);

export default HuiFilterChips;
