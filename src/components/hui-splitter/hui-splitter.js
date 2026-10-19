/**
 * HUI Splitter — chia vùng kéo đổi kích thước (Organism, A3.9).
 *   <hui-splitter persist-key="editor">
 *     <hui-splitter-panel size="25%" min="15%" collapsible>Cây thư mục</hui-splitter-panel>
 *     <hui-splitter-panel>Nội dung</hui-splitter-panel>
 *   </hui-splitter>
 * Kích thước lưu theo % phần còn lại (trừ bề dày thanh chia) → khung đổi kích thước thì các vùng co giãn theo.
 * Thanh kéo nằm ở lớp phủ trong shadow DOM, đặt đúng khe giữa 2 vùng bằng calc() — không chèn gì vào light DOM.
 * Bàn phím theo mẫu WAI-ARIA Window Splitter: ←/→ (hoặc ↑/↓), Home/End, Enter thu gọn / mở lại.
 */

import styles from './hui-splitter.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import './hui-splitter-panel.js';

const PANEL_TAG = 'hui-splitter-panel';
const STORAGE_PREFIX = 'hui-splitter:';

const FALLBACK = {
  vi: { 'splitter.handle': 'Thay đổi kích thước vùng {index}' },
  en: { 'splitter.handle': 'Resize panel {index}' },
};

function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

const round = (n) => Math.round(n * 100) / 100;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

let uid = 0;

/**
 * @fires hui-resize - Kích thước đã đổi (thả chuột, phím, thu gọn, reset). detail: { sizes, collapsed }
 * @fires hui-resizing - Đang kéo (mỗi frame). detail: { sizes }
 * @slot - Các <hui-splitter-panel> (2 trở lên)
 * @csspart base - Khung ngoài
 * @csspart panels - Hàng/cột chứa các vùng
 * @csspart handle - Mỗi thanh kéo (role="separator"; thêm part handle-active khi đang kéo)
 * @csspart grip - Nút nắm ở giữa thanh kéo
 * @cssprop --hui-splitter-gutter - Bề dày khe chia (mặc định 1px)
 * @cssprop --hui-splitter-gutter-color - Màu khe chia (mặc định --hui-border-secondary)
 * @cssprop --hui-splitter-handle-size - Bề rộng vùng bắt chuột của thanh kéo (mặc định 9px)
 * @cssprop --hui-splitter-active-color - Màu thanh kéo khi hover / kéo / focus (mặc định --hui-primary)
 * @cssprop --hui-splitter-height - Chiều cao khung (mặc định auto; direction="vertical" nên đặt chiều cao)
 */
class HuiSplitter extends HuiElement {
  static properties = {
    /** horizontal | vertical — horizontal: các vùng xếp ngang (thanh kéo dọc), vertical: xếp dọc */
    direction: { type: String, default: 'horizontal' },
    /** Bước đổi kích thước bằng phím mũi tên (%) */
    step: { type: Number, default: 5 },
    /** Khóa lưu kích thước vào localStorage (bỏ trống = không lưu) */
    persistKey: { type: String },
    /** Khóa kéo đổi kích thước */
    disabled: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    this._panels = [];
    this._handles = [];
    /** Kích thước hiện tại (%) của từng vùng — tổng = 100 */
    this._sizes = [];
    /** Kích thước ban đầu (để double-click / reset) */
    this._initial = [];
    /** Kích thước trước khi thu gọn (để mở lại) */
    this._restore = [];
    this._drag = null;
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._syncPanels());
    this._panelsBox = createElement('div', { className: 'splitter__panels', part: 'panels' }, this._slot);
    this._handlesBox = createElement('div', { className: 'splitter__handles' });
    this._base = createElement('div', { className: 'splitter', part: 'base' }, this._panelsBox, this._handlesBox);
    return this._base;
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback();
    if (reconnect) this._syncPanels();
  }

  updated(changed) {
    if (changed.has('direction')) {
      const vertical = this._vertical;
      this._base.classList.toggle('splitter--vertical', vertical);
      this._handles.forEach((h) => h.setAttribute('aria-orientation', vertical ? 'horizontal' : 'vertical'));
      this._applySizes();
    }
    if (changed.has('disabled')) {
      this._base.classList.toggle('splitter--disabled', this.disabled);
      this._handles.forEach((h) => {
        h.setAttribute('tabindex', this.disabled ? '-1' : '0');
        if (this.disabled) h.setAttribute('aria-disabled', 'true');
        else h.removeAttribute('aria-disabled');
      });
    }
    if (changed.has('locale')) this._labelHandles();
    if (changed.has('persistKey') && changed.get('persistKey') !== undefined) this._loadPersisted();
  }

  // =====================================================
  // API
  // =====================================================

  /** Kích thước các vùng (%, tổng 100). Gán mảng mới để đổi bằng code */
  get sizes() {
    return this._sizes.map(round);
  }

  set sizes(value) {
    if (!Array.isArray(value) || value.length !== this._panels.length) return;
    this._sizes = this._normalize(value.map((v) => Math.max(0, Number(v) || 0)));
    this._panels.forEach((p, i) => { p.collapsed = this._sizes[i] === 0 && p.collapsible; });
    this._applySizes();
    this._commit();
  }

  /** Thu gọn vùng thứ i (vùng phải có collapsible) — phần dư dồn cho vùng kề bên */
  collapse(index) {
    const p = this._panels[index];
    if (!p || !p.collapsible || this._sizes[index] === 0) return;
    const n = this._neighbor(index);
    if (n < 0) return;
    this._restore[index] = this._sizes[index];
    this._sizes[n] += this._sizes[index];
    this._sizes[index] = 0;
    p.collapsed = true;
    this._applySizes();
    this._commit();
  }

  /** Mở lại vùng thứ i về kích thước trước khi thu gọn */
  expand(index) {
    const p = this._panels[index];
    if (!p || this._sizes[index] > 0) return;
    const n = this._neighbor(index);
    if (n < 0) return;
    const { min } = this._limits(index);
    const want = this._restore[index] || this._initial[index] || this._toPercent(p.size) || min || 50;
    const give = clamp(want, 0, this._sizes[n] - this._limits(n).min);
    if (give <= 0) return;
    this._sizes[n] -= give;
    this._sizes[index] = give;
    p.collapsed = false;
    this._applySizes();
    this._commit();
  }

  /** Thu gọn ↔ mở lại vùng thứ i */
  toggleCollapse(index) {
    if (this._sizes[index] === 0) this.expand(index);
    else this.collapse(index);
  }

  /** Về kích thước ban đầu (theo attribute size của các vùng) */
  reset() {
    this._sizes = [...this._initial];
    this._panels.forEach((p, i) => { p.collapsed = this._sizes[i] === 0; });
    this._applySizes();
    this._commit();
  }

  // =====================================================
  // VÙNG & KÍCH THƯỚC
  // =====================================================

  get _vertical() {
    return this.direction === 'vertical';
  }

  _syncPanels() {
    const panels = this._slot.assignedElements().filter((el) => el.localName === PANEL_TAG);
    const same = panels.length === this._panels.length && panels.every((p, i) => p === this._panels[i]);
    if (same && this._sizes.length) return;
    this._panels = panels;
    panels.forEach((p, i) => {
      if (!p.id) p.id = `hui-splitter-${this._uid}-panel-${i + 1}`;
    });
    this._initial = this._computeInitial();
    this._sizes = [...this._initial];
    this._restore = [];
    this._buildHandles();
    this._loadPersisted(false);
    this._applySizes();
  }

  /** Kích thước từ attribute: % hoặc px; vùng không đặt chia đều phần còn lại; collapsed → 0 */
  _computeInitial() {
    const avail = this._availablePx();
    const raw = this._panels.map((p) => (p.collapsed ? 0 : this._toPercent(p.size, avail)));
    const fixed = raw.reduce((s, v) => s + (v ?? 0), 0);
    const free = raw.filter((v) => v === null).length;
    const share = free ? Math.max(0, 100 - fixed) / free : 0;
    return this._normalize(raw.map((v) => (v === null ? share : v)));
  }

  /** Tổng = 100 (chia tỉ lệ); nếu toàn 0 thì chia đều */
  _normalize(list) {
    const sum = list.reduce((s, v) => s + v, 0);
    if (sum <= 0) return list.map(() => 100 / (list.length || 1));
    return list.map((v) => (v / sum) * 100);
  }

  /** "30%" | "30" → 30; "240px" → % theo bề rộng khả dụng; rỗng → null */
  _toPercent(value, avail = this._availablePx()) {
    if (value === null || value === undefined || value === '') return null;
    const v = String(value).trim();
    const num = parseFloat(v);
    if (!Number.isFinite(num)) return null;
    if (v.endsWith('px')) return avail > 0 ? (num / avail) * 100 : null;
    return num;
  }

  /** Bề rộng (hoặc cao) khả dụng cho các vùng = khung − tổng khe chia */
  _availablePx() {
    if (!this._panelsBox) return 0;
    const rect = this._panelsBox.getBoundingClientRect();
    const size = this._vertical ? rect.height : rect.width;
    const gutter = parseFloat(getComputedStyle(this._panelsBox)[this._vertical ? 'rowGap' : 'columnGap']) || 0;
    return Math.max(0, size - gutter * Math.max(0, this._panels.length - 1));
  }

  _limits(i) {
    const p = this._panels[i];
    const avail = this._availablePx();
    const min = clamp(this._toPercent(p?.min, avail) ?? 0, 0, 100);
    const max = clamp(this._toPercent(p?.max, avail) ?? 100, min, 100);
    return { min, max, collapsible: Boolean(p?.collapsible) };
  }

  /** Vùng nhận phần dư khi vùng i thu gọn: vùng sau (nếu có) hoặc vùng trước */
  _neighbor(i) {
    if (i + 1 < this._panels.length) return i + 1;
    return i - 1;
  }

  _applySizes() {
    if (!this._hasRendered) return;
    const n = this._panels.length;
    this._base.style.setProperty('--_splitter-gutters', `calc(var(--hui-splitter-gutter, 1px) * ${Math.max(0, n - 1)})`);
    this._panels.forEach((p, i) => p._setPercent?.(this._sizes[i]));
    let cum = 0;
    this._handles.forEach((h, i) => {
      cum += this._sizes[i];
      // Tâm khe thứ i = (100% − tổng khe) × cum% + i khe + nửa khe
      const pos = `calc((100% - var(--_splitter-gutters)) * ${(cum / 100).toFixed(6)} + var(--hui-splitter-gutter, 1px) * ${i + 0.5})`;
      h.style.left = this._vertical ? '' : pos;
      h.style.top = this._vertical ? pos : '';
      this._updateAria(i);
    });
    this.setState('dragging', Boolean(this._drag));
  }

  _updateAria(i) {
    const h = this._handles[i];
    if (!h) return;
    const a = this._limits(i);
    const b = this._limits(i + 1);
    const pair = this._sizes[i] + this._sizes[i + 1];
    const lo = Math.max(a.collapsible ? 0 : a.min, pair - b.max);
    const hi = Math.min(a.max, pair - (b.collapsible ? 0 : b.min));
    h.setAttribute('aria-valuenow', String(Math.round(this._sizes[i])));
    h.setAttribute('aria-valuemin', String(Math.round(Math.max(0, lo))));
    h.setAttribute('aria-valuemax', String(Math.round(Math.max(lo, hi))));
    h.setAttribute('aria-valuetext', `${Math.round(this._sizes[i])}%`);
  }

  /**
   * Đặt kích thước vùng i (trước thanh kéo) = `value` %, vùng i+1 bù lại. Tôn trọng min/max của cả hai;
   * vùng collapsible bị kéo nhỏ hơn nửa `min` → thu gọn về 0.
   */
  _resizePair(i, value) {
    const a = this._limits(i);
    const b = this._limits(i + 1);
    const pair = this._sizes[i] + this._sizes[i + 1];
    let next = value;
    // Bám min / thu gọn cho vùng trước
    if (next < a.min) next = a.collapsible && next < a.min / 2 ? 0 : a.min;
    next = Math.min(next, a.max);
    // Vùng sau
    let other = pair - next;
    if (other < b.min) {
      if (b.collapsible && other < b.min / 2) other = 0;
      else other = b.min;
      next = pair - other;
    }
    if (other > b.max) {
      other = b.max;
      next = pair - other;
    }
    next = clamp(next, 0, pair);
    if (next !== 0 && next < a.min - 0.001) return false; // không có nghiệm hợp lệ
    if (Math.abs(next - this._sizes[i]) < 0.001) return false;
    if (this._sizes[i] > 0 && next === 0) this._restore[i] = this._sizes[i];
    if (this._sizes[i + 1] > 0 && pair - next === 0) this._restore[i + 1] = this._sizes[i + 1];
    this._sizes[i] = next;
    this._sizes[i + 1] = pair - next;
    this._panels[i].collapsed = next === 0;
    this._panels[i + 1].collapsed = pair - next === 0;
    this._applySizes();
    return true;
  }

  _commit() {
    this._savePersisted();
    this.emit('hui-resize', { sizes: this.sizes, collapsed: this._panels.map((p) => Boolean(p.collapsed)) });
  }

  // =====================================================
  // THANH KÉO
  // =====================================================

  _buildHandles() {
    const vertical = this._vertical;
    this._handles = this._panels.slice(0, -1).map((panel, i) => {
      const h = createElement('div', {
        className: 'splitter__handle',
        part: 'handle',
        role: 'separator',
        tabindex: this.disabled ? '-1' : '0',
        'aria-orientation': vertical ? 'horizontal' : 'vertical',
        'aria-controls': panel.id,
      }, createElement('span', { className: 'splitter__grip', part: 'grip', 'aria-hidden': 'true' }));
      if (this.disabled) h.setAttribute('aria-disabled', 'true');
      h.addEventListener('pointerdown', (e) => this._onPointerDown(e, i));
      h.addEventListener('pointermove', (e) => this._onPointerMove(e));
      h.addEventListener('pointerup', (e) => this._onPointerUp(e));
      h.addEventListener('pointercancel', (e) => this._onPointerUp(e));
      h.addEventListener('lostpointercapture', (e) => this._onPointerUp(e));
      h.addEventListener('dblclick', () => { if (!this.disabled) this.reset(); });
      h.addEventListener('keydown', (e) => this._onKeydown(e, i));
      return h;
    });
    this._handlesBox.replaceChildren(...this._handles);
    this._labelHandles();
  }

  _labelHandles() {
    this._handles.forEach((h, i) => h.setAttribute('aria-label', tx('splitter.handle', { index: i + 1 })));
  }

  _onPointerDown(e, i) {
    if (this.disabled || e.button !== 0) return;
    e.preventDefault();
    const h = this._handles[i];
    try { h.setPointerCapture?.(e.pointerId); } catch { /* pointer giả lập / đã nhả */ }
    h.focus({ preventScroll: true });
    this._drag = {
      index: i,
      pointerId: e.pointerId,
      start: this._vertical ? e.clientY : e.clientX,
      size: this._sizes[i],
      avail: this._availablePx(),
      moved: false,
    };
    h.setAttribute('part', 'handle handle-active');
    this._base.classList.add('splitter--dragging');
    this.setState('dragging', true);
  }

  _onPointerMove(e) {
    const d = this._drag;
    if (!d || e.pointerId !== d.pointerId || d.avail <= 0) return;
    const pos = this._vertical ? e.clientY : e.clientX;
    const delta = ((pos - d.start) / d.avail) * 100;
    if (this._resizePair(d.index, d.size + delta)) {
      d.moved = true;
      this.emit('hui-resizing', { sizes: this.sizes });
    }
  }

  _onPointerUp(e) {
    const d = this._drag;
    if (!d || (e.pointerId !== undefined && e.pointerId !== d.pointerId)) return;
    this._drag = null;
    const h = this._handles[d.index];
    if (h?.hasPointerCapture?.(d.pointerId)) h.releasePointerCapture(d.pointerId);
    h?.setAttribute('part', 'handle');
    this._base.classList.remove('splitter--dragging');
    this.setState('dragging', false);
    if (d.moved) this._commit();
  }

  /** ←/→ (↑/↓ khi vertical) đổi `step`%, Home/End về min/max, Enter thu gọn / mở lại */
  _onKeydown(e, i) {
    if (this.disabled) return;
    const dec = this._vertical ? 'ArrowUp' : 'ArrowLeft';
    const inc = this._vertical ? 'ArrowDown' : 'ArrowRight';
    const step = this.step > 0 ? this.step : 5;
    let handled = true;
    let changed = false;
    if (e.key === dec) changed = this._resizePair(i, this._sizes[i] - step);
    else if (e.key === inc) changed = this._resizePair(i, this._sizes[i] + step);
    else if (e.key === 'Home') changed = this._resizePair(i, this._limits(i).collapsible ? 0 : this._limits(i).min);
    else if (e.key === 'End') changed = this._resizePair(i, this._limits(i).max);
    else if (e.key === 'Enter') {
      // Thu gọn vùng trước thanh kéo (hoặc vùng sau nếu chỉ vùng sau collapsible)
      const target = this._panels[i].collapsible ? i : this._panels[i + 1]?.collapsible ? i + 1 : -1;
      if (target >= 0) this.toggleCollapse(target);
    } else handled = false;
    if (handled) e.preventDefault();
    if (changed) this._commit();
  }

  // =====================================================
  // LƯU KÍCH THƯỚC (localStorage — có thể bị chặn ở chế độ riêng tư)
  // =====================================================

  _loadPersisted(apply = true) {
    if (!this.persistKey) return;
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + this.persistKey);
      const saved = raw ? JSON.parse(raw) : null;
      if (Array.isArray(saved) && saved.length === this._panels.length && saved.every((v) => Number.isFinite(v) && v >= 0)) {
        this._sizes = this._normalize(saved);
        this._panels.forEach((p, i) => { p.collapsed = this._sizes[i] === 0; });
        if (apply) this._applySizes();
      }
    } catch { /* bỏ qua: storage bị chặn / dữ liệu hỏng */ }
  }

  _savePersisted() {
    if (!this.persistKey) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + this.persistKey, JSON.stringify(this.sizes));
    } catch { /* bỏ qua */ }
  }

  /** hui-splitter-panel báo attribute đổi (size / min / max / collapsible / collapsed) */
  _onPanelChange(panel, keys) {
    const i = this._panels.indexOf(panel);
    if (i < 0) return;
    if (keys.includes('size')) {
      this._initial = this._computeInitial();
      this._sizes = [...this._initial];
      this._applySizes();
      return;
    }
    if (keys.includes('collapsed')) {
      // Người dùng tự gán panel.collapsed → đồng bộ kích thước
      if (panel.collapsed && this._sizes[i] > 0) {
        const n = this._neighbor(i);
        if (n >= 0) {
          this._restore[i] = this._sizes[i];
          this._sizes[n] += this._sizes[i];
          this._sizes[i] = 0;
          this._applySizes();
          this._commit();
        }
      } else if (!panel.collapsed && this._sizes[i] === 0) this.expand(i);
    }
    this._applySizes();
  }
}

defineElement('hui-splitter', HuiSplitter);

export default HuiSplitter;
