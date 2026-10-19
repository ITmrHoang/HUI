/**
 * HUI Donut — biểu đồ vành khuyên: nhiều phần (data) hoặc 1 giá trị tiến độ (value / max), tròn hoặc nửa vòng (semi).
 * Mỗi phần là 1 cung vẽ bằng stroke (arcPath); chuyển tiếp = nội suy góc bắt đầu/kết thúc của từng cung.
 */

import sharedStyles from './chart-shared.css?raw';
import styles from './hui-donut.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { formatPercent } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import {
  svgEl, msg, normalizeData, resolveColor, paletteColor, formatValue, clamp, lerp, arcPath, polar,
  canAnimate, durationOf, tween, createTooltip, showTooltip, hideTooltip, createSrTable, fillSrTable,
} from './chart-shared.js';

const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const LEGENDS = ['none', 'right', 'bottom'];
/** Biên chừa cho hiệu ứng phóng to cung khi hover (px mỗi bên) */
const GROW = 3;

/**
 * Donut / vòng tiến độ.
 * Bàn phím: Tab vào cung · ←/→ (↑/↓) chuyển cung · Enter/Space chọn (hui-select) · Esc ẩn tooltip;
 * legend là các nút bật/tắt (Enter/Space).
 *
 * @fires hui-select - Bấm / Enter trên một cung. detail { index, item }
 * @fires hui-toggle - Bật/tắt một phần qua legend. detail { index, item, visible }
 * @slot center - Nội dung giữa vòng (thay center-label / center-value)
 * @csspart base - Khung ngoài
 * @csspart chart - Khung chứa SVG + phần giữa
 * @csspart svg - Thẻ <svg>
 * @csspart track - Vòng nền (chế độ tiến độ / không có dữ liệu)
 * @csspart segment - Một cung; cung đang chọn có thêm part segment-active
 * @csspart center - Vùng giữa vòng
 * @csspart center-label - Nhãn giữa (mặc định "Tổng")
 * @csspart center-value - Giá trị giữa (mặc định tổng / phần trăm)
 * @csspart legend - Chú giải
 * @csspart legend-item - Một mục chú giải (nút bật/tắt); mục đang tắt có thêm part legend-item-off
 * @csspart legend-swatch - Ô màu
 * @csspart legend-label - Nhãn chú giải
 * @csspart legend-value - Giá trị chú giải
 * @csspart legend-percent - Phần trăm chú giải
 * @csspart tooltip - Tooltip (kèm tooltip-label, tooltip-value)
 * @csspart data-table - Bảng dữ liệu ẩn cho trình đọc màn hình
 * @cssprop --hui-donut-size - Đường kính (ghi đè attribute size)
 * @cssprop --hui-donut-color - Màu vòng tiến độ (chế độ value)
 * @cssprop --hui-donut-track-color - Màu vòng nền
 * @cssprop --hui-donut-label-color - Màu nhãn giữa
 * @cssprop --hui-donut-value-color - Màu giá trị giữa
 * @cssprop --hui-donut-value-font-size - Cỡ chữ giá trị giữa (mặc định theo kích thước)
 * @cssprop --hui-donut-legend-gap - Khoảng cách biểu đồ ↔ chú giải
 * @cssprop --hui-donut-dim-opacity - Độ mờ các cung không được chọn (mặc định 0.4)
 * @cssprop --hui-donut-duration - Thời lượng hiệu ứng quét (mặc định 900ms; cập nhật data = 60%)
 */
class HuiDonut extends HuiElement {
  static localized = true;

  static properties = {
    /** Mảng {label, value, color?} hoặc số — attribute nhận JSON */
    data: { type: Array, default: [] },
    /** Giá trị tiến độ (dùng khi không có data): vẽ 1 cung value / max trên vòng nền */
    value: { type: Number },
    /** Giá trị tối đa của chế độ tiến độ */
    max: { type: Number, default: 100 },
    /** Độ dày vành (px, mặc định ~14% đường kính) */
    thickness: { type: Number },
    /** Đường kính (px) */
    size: { type: Number, default: 160 },
    /** Khe hở giữa các phần (độ) */
    gapDegree: { type: Number, default: 0 },
    /** Nhãn giữa vòng (mặc định "Tổng" khi có data) */
    centerLabel: { type: String },
    /** Giá trị giữa vòng (mặc định: tổng các phần đang hiện / phần trăm tiến độ) */
    centerValue: { type: String },
    /** none | right | bottom — vị trí chú giải (bấm để ẩn/hiện phần) */
    legend: { type: String, default: 'none' },
    /** Nửa vòng (180°) */
    semi: { type: Boolean },
    /** Màu cung tiến độ (chế độ value): preset hoặc màu CSS */
    color: { type: String, default: 'primary' },
    /** Định dạng số (format.js): number | currency | percent | compact … */
    format: { type: String },
    /** Hàm định dạng (value, item) => string — chỉ gán bằng JS */
    formatter: { type: Object, attribute: false },
    /** Tên biểu đồ cho trình đọc màn hình (mặc định "Biểu đồ tròn") */
    label: { type: String },
    /** Tắt hiệu ứng quét / chuyển tiếp */
    noAnimation: { type: Boolean },
  };

  static styles = [sharedStyles, styles];

  constructor() {
    super();
    this._hiddenKeys = new Set();
    this._shown = [];
    this._model = null;
    this._active = -1;
    this._focusIndex = -1;
    this._entered = false;
  }

  // =====================================================
  // API
  // =====================================================

  /** Tổng các phần đang hiển thị (chế độ tiến độ: value) */
  get total() {
    return this._model?.total ?? 0;
  }

  /** Số cung đang hiển thị (giá trị > 0, không bị tắt) */
  get visibleCount() {
    return this._model ? this._model.fracs.filter((f) => f > 0).length : 0;
  }

  /** Ẩn/hiện phần thứ `index` (force: true = hiện, false = ẩn). Trả về trạng thái hiện mới. */
  toggleSegment(index, force) {
    const item = this._model?.items[index];
    if (!item || this._model.progress) return false;
    const key = this._keyOf(item);
    const visible = force === undefined ? this._hiddenKeys.has(key) : !!force;
    if (visible) this._hiddenKeys.delete(key);
    else this._hiddenKeys.add(key);
    this._sync(true);
    this.emit('hui-toggle', { index, item: item.raw, visible });
    return visible;
  }

  /** Focus vào cung đang nhận Tab (không có cung → mục legend đầu) */
  focus(options) {
    const seg = this._segs?.querySelector('.donut__seg[tabindex="0"]');
    (seg || this._legend?.querySelector('button'))?.focus(options);
  }

  // =====================================================
  // RENDER
  // =====================================================

  render() {
    this._track = svgEl('path', { part: 'track', class: 'donut__track' });
    this._segs = svgEl('g', { class: 'donut__segs' });
    this._svg = svgEl('svg', { part: 'svg', class: 'donut__svg' });
    this._svg.append(this._track, this._segs);

    this._centerLabel = createElement('span', { className: 'donut__center-label', part: 'center-label' });
    this._centerValue = createElement('span', { className: 'donut__center-value', part: 'center-value' });
    this._center = createElement('div', { className: 'donut__center', part: 'center' },
      createElement('slot', { name: 'center' }, this._centerLabel, this._centerValue));
    this._tip = createTooltip();
    this._chart = createElement('div', { className: 'donut__chart', part: 'chart' }, this._svg, this._center, this._tip);
    this._legend = createElement('div', { className: 'donut__legend', part: 'legend' });
    this._table = createSrTable();
    this._base = createElement('div', { className: 'donut', part: 'base' }, this._chart, this._legend, this._table);

    // Cung: hover / focus / bấm / bàn phím
    const segOf = (e) => (e.target.classList?.contains('donut__seg') ? e.target : null);
    this._segs.addEventListener('pointermove', (e) => {
      const seg = segOf(e);
      if (!seg) return;
      const r = this._chart.getBoundingClientRect();
      this._setActive(Number(seg.dataset.index), { x: e.clientX - r.left, y: e.clientY - r.top });
    });
    this._segs.addEventListener('pointerleave', () => {
      if (!this._segs.contains(this.shadowRoot.activeElement)) this._setActive(-1);
    });
    this._segs.addEventListener('click', (e) => {
      const seg = segOf(e);
      if (seg) this._select(Number(seg.dataset.index));
    });
    this._segs.addEventListener('focusin', (e) => {
      const seg = segOf(e);
      if (!seg) return;
      this._focusIndex = Number(seg.dataset.index);
      this._syncTabindex();
      this._setActive(this._focusIndex, 'mid');
    });
    this._segs.addEventListener('focusout', (e) => {
      if (!this._segs.contains(e.relatedTarget)) this._setActive(-1);
    });
    this._segs.addEventListener('keydown', (e) => this._onKey(e));

    // Legend: hover ↔ cung, bấm = bật/tắt
    const itemOf = (e) => e.target.closest?.('.donut__legend-item');
    this._legend.addEventListener('pointerover', (e) => {
      const it = itemOf(e);
      if (it) this._setActive(Number(it.dataset.index));
    });
    this._legend.addEventListener('pointerleave', () => this._setActive(-1));
    this._legend.addEventListener('focusin', (e) => {
      const it = itemOf(e);
      if (it) this._setActive(Number(it.dataset.index));
    });
    this._legend.addEventListener('focusout', () => this._setActive(-1));
    this._legend.addEventListener('click', (e) => {
      const it = itemOf(e);
      if (it) this.toggleSegment(Number(it.dataset.index));
    });
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._watchEntry();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopView?.();
    this._stopView = null;
    if (this._cancelTween) {
      this._cancelTween();
      this._cancelTween = null;
      if (this._model) this._paint((this._shown = this._model.angles.map((a) => ({ ...a }))));
    }
  }

  updated(changed) {
    const has = (...keys) => keys.some((k) => changed.has(k));
    if (changed.has('data') && changed.get('data') !== undefined) {
      // Data mới khác số phần → bỏ trạng thái ẩn cũ (key có thể không còn đúng)
      const prev = normalizeData(changed.get('data'));
      if (prev.length !== normalizeData(this.data).length) this._hiddenKeys.clear();
    }
    if (has('data', 'value', 'max', 'thickness', 'size', 'gapDegree', 'semi', 'legend', 'color', 'centerLabel',
      'centerValue', 'format', 'formatter', 'label', 'locale')) {
      this._sync(has('data', 'value', 'max'));
    }
    if (changed.has('noAnimation') && this.noAnimation && !this._entered && this._hasRendered) this._play();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  _keyOf(item) {
    return item.label ? `l:${item.label}` : `i:${item.index}`;
  }

  _fmt(value, item) {
    return formatValue(value, { format: this.format, formatter: this.formatter, item });
  }

  _colorOf(item, i) {
    if (this._model?.progress) return `var(--hui-donut-color, ${resolveColor(this.color)})`;
    return item.color ? resolveColor(item.color) : paletteColor(i);
  }

  /** Mô hình dữ liệu + hình học đích */
  _computeModel() {
    const size = this.size > 0 ? Number(this.size) : 160;
    const thick = this.thickness > 0 ? Math.min(Number(this.thickness), size / 2 - GROW) : Math.max(6, Math.round(size * 0.14));
    const sweep = this.semi ? 180 : 360;
    const items = normalizeData(this.data);
    let progress = false;
    let fracs;
    let total;
    let max = 0;

    if (!items.length && isNum(this.value)) {
      progress = true;
      max = this.max > 0 ? Number(this.max) : 100;
      const v = clamp(Number(this.value), 0, max);
      items.push({ label: this.label || '', value: v, color: '', index: 0, raw: { value: v } });
      fracs = [v / max];
      total = v;
    } else {
      const visible = items.map((it) => !this._hiddenKeys.has(this._keyOf(it)) && it.value > 0);
      total = items.reduce((s, it, i) => s + (visible[i] ? it.value : 0), 0);
      fracs = items.map((it, i) => (visible[i] && total > 0 ? it.value / total : 0));
    }
    // Góc tích lũy (0 → sweep) của từng phần, chưa trừ khe hở
    let acc = 0;
    const angles = fracs.map((f) => {
      const s = acc;
      acc += f * sweep;
      return { s, e: acc };
    });
    return {
      items, fracs, total, max, progress, angles, size, thick, sweep,
      start: this.semi ? -90 : 0,
      r: size / 2 - thick / 2 - GROW,
    };
  }

  _sync(animate) {
    const prevShown = this._shown;
    const M = (this._model = this._computeModel());
    const { size, thick, items } = M;
    const height = this.semi ? size / 2 : size;
    const legend = LEGENDS.includes(this.legend) && !M.progress ? this.legend : 'none';

    this._base.className = `donut donut--legend-${legend}${this.semi ? ' donut--semi' : ''}${this._entered ? '' : ' is-pending'}`;
    this._base.style.setProperty('--_donut-size', `${size}px`);
    this._svg.setAttribute('viewBox', `0 0 ${size} ${height}`);
    this._base.style.setProperty('--_donut-t', `${thick}px`);

    // Vòng nền: luôn có ở chế độ tiến độ; chế độ nhiều phần chỉ hiện khi tổng = 0
    const showTrack = M.progress || M.total <= 0;
    this._track.setAttribute('d', showTrack ? arcPath(size / 2, size / 2, M.r, M.start, M.start + M.sweep) : '');

    // Tái dùng path theo index
    while (this._segs.children.length > items.length) this._segs.lastChild.remove();
    while (this._segs.children.length < items.length) {
      this._segs.append(svgEl('path', { class: 'donut__seg', part: 'segment', role: 'img', tabindex: '-1' }));
    }
    items.forEach((it, i) => {
      const seg = this._segs.children[i];
      seg.dataset.index = String(i);
      seg.style.setProperty('--_donut-c', this._colorOf(it, i));
      seg.setAttribute('aria-label', this._describe(i));
    });
    if (this._focusIndex >= items.length) this._focusIndex = -1;
    this._syncTabindex();
    this._syncCenter();
    this._syncLegend(legend);
    this._syncA11y();

    // Hình: tween góc từ trạng thái đang hiển thị sang đích
    this._cancelTween?.();
    this._cancelTween = null;
    const to = M.angles;
    if (!this._entered) {
      this._shown = to.map(() => ({ s: 0, e: 0 }));
      this._paint(this._shown);
    } else if (animate !== false && canAnimate(this) && prevShown.length) {
      const last = prevShown[prevShown.length - 1]?.e ?? 0;
      const from = to.map((_, i) => prevShown[i] || { s: last, e: last });
      this._runTween(from, to, durationOf(this, '--hui-donut-duration', 900) * 0.6);
    } else {
      this._shown = to.map((a) => ({ ...a }));
      this._paint(this._shown);
    }
    if (this._active >= items.length) this._setActive(-1);
  }

  _runTween(from, to, duration) {
    this._cancelTween = tween(duration, (p) => {
      this._shown = to.map((a, i) => ({ s: lerp(from[i].s, a.s, p), e: lerp(from[i].e, a.e, p) }));
      this._paint(this._shown);
    }, { onDone: () => { this._cancelTween = null; } });
  }

  /** Ghi `d` cho từng cung. Khe hở: mỗi cung lùi gap/2 ở hai đầu (chỉ khi có ≥ 2 cung hiện) */
  _paint(angles) {
    const M = this._model;
    if (!M) return;
    const c = M.size / 2;
    const gap = !M.progress && this.visibleCount > 1 ? Math.max(0, Number(this.gapDegree) || 0) : 0;
    angles.forEach((a, i) => {
      const seg = this._segs.children[i];
      if (!seg) return;
      const s = M.start + a.s + gap / 2;
      const e = M.start + a.e - gap / 2;
      seg.setAttribute('d', e - s > 0.05 ? arcPath(c, c, M.r, s, e) : '');
    });
  }

  _describe(i) {
    const M = this._model;
    const it = M.items[i];
    const name = it.label || msg('chart.point', { index: i + 1 });
    if (M.progress) return `${name ? `${name}: ` : ''}${this._percentText(M.fracs[0] * 100)}`;
    const pct = M.fracs[i] > 0 ? ` (${this._percentText(M.fracs[i] * 100)})` : '';
    return `${name}: ${this._fmt(it.value, it.raw)}${pct}`;
  }

  _percentText(p) {
    return formatPercent(p, p > 0 && p < 10 ? 1 : 0);
  }

  _syncCenter() {
    const M = this._model;
    const label = this.centerLabel ?? (M.progress ? '' : msg('chart.total'));
    let value = this.centerValue;
    if (value === null || value === undefined) {
      if (M.progress) value = this.format || this.formatter ? this._fmt(M.total, M.items[0].raw) : this._percentText(M.fracs[0] * 100);
      else value = M.items.length ? this._fmt(M.total) : '';
    }
    this._centerLabel.textContent = label;
    this._centerLabel.hidden = !label;
    this._centerValue.textContent = value;
    this._centerValue.hidden = !value;
  }

  _syncLegend(mode) {
    const M = this._model;
    this._legend.hidden = mode === 'none';
    if (mode === 'none') {
      this._legend.replaceChildren();
      return;
    }
    const list = this._legend;
    while (list.children.length > M.items.length) list.lastChild.remove();
    while (list.children.length < M.items.length) {
      const swatch = createElement('span', { className: 'donut__swatch', part: 'legend-swatch', 'aria-hidden': 'true' });
      const label = createElement('span', { className: 'donut__legend-label', part: 'legend-label' });
      const value = createElement('span', { className: 'donut__legend-value', part: 'legend-value' });
      const pct = createElement('span', { className: 'donut__legend-percent', part: 'legend-percent' });
      const btn = createElement('button', { type: 'button', className: 'donut__legend-item', part: 'legend-item' }, swatch, label, value, pct);
      btn._els = { label, value, pct };
      list.append(btn);
    }
    M.items.forEach((it, i) => {
      const btn = list.children[i];
      const off = this._hiddenKeys.has(this._keyOf(it));
      btn.dataset.index = String(i);
      btn.style.setProperty('--_donut-c', this._colorOf(it, i));
      btn.setAttribute('aria-pressed', String(!off));
      btn.setAttribute('part', off ? 'legend-item legend-item-off' : 'legend-item');
      btn.classList.toggle('is-off', off);
      btn._els.label.textContent = it.label || msg('chart.point', { index: i + 1 });
      btn._els.value.textContent = this._fmt(it.value, it.raw);
      btn._els.pct.textContent = M.fracs[i] > 0 ? this._percentText(M.fracs[i] * 100) : '';
    });
  }

  _syncA11y() {
    const M = this._model;
    const name = this.label || msg('chart.donut');
    if (M.progress) {
      this._svg.setAttribute('role', 'img');
      this._svg.setAttribute('aria-label', `${name}: ${this._centerValue.textContent || this._percentText(M.fracs[0] * 100)}`);
      fillSrTable(this._table, name, []);
      this._table.hidden = true;
      return;
    }
    this._table.hidden = false;
    this._svg.setAttribute('role', 'group');
    this._svg.setAttribute('aria-label', M.items.length
      ? `${name}. ${msg('chart.donutSummary', { count: this.visibleCount, total: this._fmt(M.total) })}`
      : `${name}: ${msg('chart.empty')}`);
    fillSrTable(this._table, name, M.items.map((it, i) => [
      it.label || msg('chart.point', { index: i + 1 }),
      `${this._fmt(it.value, it.raw)}${M.fracs[i] > 0 ? ` (${this._percentText(M.fracs[i] * 100)})` : ''}`,
    ]));
  }

  /** Roving tabindex trên các cung đang hiện (chế độ tiến độ: không nhận focus) */
  _syncTabindex() {
    const M = this._model;
    const segs = [...this._segs.children];
    const visible = M && !M.progress ? M.fracs.map((f) => f > 0) : [];
    let pos = this._focusIndex >= 0 && visible[this._focusIndex] ? this._focusIndex : visible.indexOf(true);
    if (!(pos >= 0)) pos = -1;
    segs.forEach((s, i) => {
      if (M?.progress) s.removeAttribute('tabindex');
      else s.setAttribute('tabindex', i === pos ? '0' : '-1');
    });
  }

  /** Làm nổi cung i + mục legend tương ứng; `pos` = tọa độ tooltip ({x,y} px) hoặc 'mid' (giữa cung) */
  _setActive(i, pos) {
    const M = this._model;
    const valid = M && i >= 0 && i < M.items.length && M.fracs[i] > 0;
    const idx = valid ? i : -1;
    this._active = idx;
    this._base.classList.toggle('has-active', valid);
    [...this._segs.children].forEach((s, k) => {
      s.classList.toggle('is-active', k === idx);
      s.setAttribute('part', k === idx ? 'segment segment-active' : 'segment');
    });
    [...this._legend.children].forEach((b, k) => b.classList.toggle('is-active', k === i));
    if (!valid || !pos || M.progress) {
      hideTooltip(this._tip);
      return;
    }
    let point = pos;
    if (pos === 'mid') {
      const a = M.angles[idx];
      const p = polar(M.size / 2, M.size / 2, M.r, M.start + (a.s + a.e) / 2);
      const scale = this._svg.clientWidth / M.size || 1;
      point = { x: p.x * scale, y: p.y * scale };
    }
    const it = M.items[idx];
    showTooltip(this._tip, {
      label: it.label || msg('chart.point', { index: idx + 1 }),
      value: `${this._fmt(it.value, it.raw)} · ${this._percentText(M.fracs[idx] * 100)}`,
      color: this._colorOf(it, idx),
    }, point.x, point.y, this._chart);
  }

  _select(i) {
    const M = this._model;
    if (!M || M.progress || !(M.fracs[i] > 0)) return;
    this.emit('hui-select', { index: i, item: M.items[i].raw });
  }

  _onKey(e) {
    const M = this._model;
    if (!M || M.progress) return;
    const visible = M.fracs.map((f, i) => (f > 0 ? i : -1)).filter((i) => i >= 0);
    if (!visible.length) return;
    const cur = Math.max(0, visible.indexOf(Number(e.target.dataset?.index)));
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._select(visible[cur]);
      return;
    }
    if (e.key === 'Escape') {
      this._setActive(-1);
      return;
    }
    const n = visible.length;
    const next = {
      ArrowRight: (cur + 1) % n, ArrowDown: (cur + 1) % n, ArrowLeft: (cur - 1 + n) % n, ArrowUp: (cur - 1 + n) % n, Home: 0, End: n - 1,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    this._focusIndex = visible[next];
    this._syncTabindex();
    this._segs.children[this._focusIndex].focus();
  }

  // =====================================================
  // HIỆU ỨNG XUẤT HIỆN — các cung quét từ góc bắt đầu
  // =====================================================

  _watchEntry() {
    if (this._entered || this._stopView) return;
    if (!canAnimate(this)) {
      this._enterNow();
      return;
    }
    this._stopView = inView(this, (entry) => {
      if (!entry.isIntersecting) return;
      this._stopView = null;
      this._play();
    }, { once: true });
  }

  _enterNow() {
    this._entered = true;
    this._base.classList.remove('is-pending');
    if (this._model) this._paint((this._shown = this._model.angles.map((a) => ({ ...a }))));
  }

  _play() {
    this._stopView?.();
    this._stopView = null;
    if (!canAnimate(this) || !this._model) {
      this._enterNow();
      return;
    }
    this._entered = true;
    this._base.classList.remove('is-pending');
    const to = this._model.angles;
    this._cancelTween?.();
    this._runTween(to.map(() => ({ s: 0, e: 0 })), to, durationOf(this, '--hui-donut-duration', 900));
  }
}

defineElement('hui-donut', HuiDonut);

export { HuiDonut };
export default HuiDonut;
