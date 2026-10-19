/**
 * HUI Rating Summary — Khối tổng hợp đánh giá trang sản phẩm (Organism):
 * điểm trung bình lớn + hui-rating-display + tổng lượt + thanh phân bố 5★…1★ (bấm để lọc).
 * Dữ liệu: attribute average / total / distribution, hoặc `data` / `src` / `fetchFn` trả về
 * { average, total, distribution }. Thiếu average/total → tự tính từ distribution.
 */

import styles from './hui-rating-summary.css?raw';
import './hui-rating-display.js';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { formatNumber } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { inView } from '../../utils/scroll.js';
import { msg, resolveColor, motionOff, normalizeCount, STAR_PATH } from './rate-shared.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Độ trễ giữa các thanh khi chạy hiệu ứng lần đầu (ms) */
const BAR_STAGGER = 60;

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function miniStar() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'hui-rating-summary__mini-star');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', STAR_PATH);
  svg.append(path);
  return svg;
}

/**
 * Tổng hợp đánh giá.
 * @fires hui-filter - Bấm một thanh (bấm lại để bỏ). detail: { stars } — null khi bỏ lọc
 * @fires hui-load - Tải xong từ src / fetchFn. detail: { data }
 * @fires hui-error - Tải lỗi. detail: { error }
 * @csspart base - Khung ngoài
 * @csspart overview - Cột điểm trung bình (số lớn + sao + tổng lượt)
 * @csspart average - Số điểm trung bình lớn
 * @csspart display - <hui-rating-display> bên trong (chỉnh sâu hơn qua display-stars, display-star)
 * @csspart total - Dòng tổng lượt đánh giá
 * @csspart bars - Vùng các thanh phân bố
 * @csspart row - Một thanh (nút bấm lọc); row-active khi đang lọc
 * @csspart row-label - Nhãn "5 ★"
 * @csspart track - Rãnh thanh
 * @csspart fill - Phần tô của thanh (theo %)
 * @csspart row-count - Số lượt của mức sao đó
 * @cssprop --hui-rating-summary-gap - Khoảng cách cột điểm ↔ các thanh
 * @cssprop --hui-rating-summary-average-size - Cỡ chữ điểm trung bình
 * @cssprop --hui-rating-summary-average-color - Màu chữ điểm trung bình
 * @cssprop --hui-rating-summary-color - Màu sao + phần tô của thanh (attribute color ưu tiên hơn)
 * @cssprop --hui-rating-summary-track-bg - Nền rãnh thanh
 * @cssprop --hui-rating-summary-bar-height - Độ dày thanh
 * @cssprop --hui-rating-summary-row-hover-bg - Nền dòng khi hover
 * @cssprop --hui-rating-summary-row-active-bg - Nền dòng đang lọc
 */
class HuiRatingSummary extends HuiElement {
  static localized = true;

  static properties = {
    /** Điểm trung bình (bỏ trống → tính từ distribution) */
    average: { type: Number },
    /** Tổng lượt đánh giá (bỏ trống → tổng distribution) */
    total: { type: Number },
    /** Số lượt theo mức sao, JSON {"5":120,"4":30,"3":8,"2":2,"1":1} */
    distribution: { type: Object },
    /** Số mức sao (số thanh) */
    count: { type: Number, default: 5 },
    /** Mức sao đang lọc (bấm thanh để bật/tắt); bỏ trống = không lọc */
    active: { type: Number },
    /** primary | success | warning | danger | info hoặc màu CSS — màu sao + thanh */
    color: { type: String },
    /** Dữ liệu { average, total, distribution } — ưu tiên hơn các attribute lẻ */
    data: { type: Object, attribute: false },
    /** URL trả JSON { average, total, distribution } — tự fetch khi gắn vào trang */
    src: { type: String },
    /** Hàm tự lấy dữ liệu: async ({ signal }) => { average, total, distribution } */
    fetchFn: { type: Object, attribute: false },
    /** Tắt hiệu ứng thanh chạy từ 0 khi cuộn tới */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._rows = [];
    this._revealed = false;
    this._stopInView = null;
    this._loadAbort = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._revealed) {
      if (motionOff(this)) this._reveal();
      else this._stopInView = inView(this._barsEl, (entry) => { if (entry.isIntersecting) this._reveal(); }, { once: true });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopInView?.();
    this._stopInView = null;
    this._loadAbort?.abort();
  }

  // =====================================================
  // DỮ LIỆU
  // =====================================================

  /** Số liệu đã chuẩn hóa: { average, total, counts: Map<sao, số lượt>, sum } */
  get summary() {
    const d = this.data && typeof this.data === 'object' ? (Array.isArray(this.data) ? this.data[0] || {} : this.data) : {};
    const n = normalizeCount(this.count);
    let dist = d.distribution ?? this.distribution;
    if (typeof dist === 'string') {
      try { dist = JSON.parse(dist); } catch { dist = null; }
    }
    const counts = new Map();
    let sum = 0;
    let weighted = 0;
    for (let s = n; s >= 1; s--) {
      const c = Math.max(0, toNum(Array.isArray(dist) ? dist[s - 1] : dist?.[s]) ?? 0);
      counts.set(s, c);
      sum += c;
      weighted += s * c;
    }
    const average = toNum(d.average) ?? toNum(this.average) ?? (sum ? weighted / sum : 0);
    const total = toNum(d.total) ?? toNum(this.total) ?? sum;
    return { average: Math.min(Math.max(average, 0), n), total, counts, sum };
  }

  /** Tải lại từ src / fetchFn — trả Promise khi xong */
  async reload() {
    if (!this.src && typeof this.fetchFn !== 'function') return;
    this._loadAbort?.abort();
    const abort = new AbortController();
    this._loadAbort = abort;
    this.setState('loading', true);
    this.setAttribute('aria-busy', 'true');
    try {
      let raw;
      if (typeof this.fetchFn === 'function') {
        raw = await this.fetchFn({ signal: abort.signal });
      } else {
        const res = await fetch(new URL(this.src, document.baseURI), { signal: abort.signal, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        raw = await res.json();
      }
      if (abort.signal.aborted) return;
      this.data = raw;
      this.emit('hui-load', { data: raw });
    } catch (error) {
      if (abort.signal.aborted) return;
      this.emit('hui-error', { error });
    } finally {
      if (this._loadAbort === abort) {
        this.setState('loading', false);
        this.removeAttribute('aria-busy');
      }
    }
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._averageEl = createElement('div', { className: 'hui-rating-summary__average', part: 'average' });
    this._display = createElement('hui-rating-display', {
      part: 'display', exportparts: 'stars: display-stars, star: display-star', size: 'md',
    });
    this._totalEl = createElement('div', { className: 'hui-rating-summary__total', part: 'total' });
    const overview = createElement('div', { className: 'hui-rating-summary__overview', part: 'overview' },
      this._averageEl, this._display, this._totalEl);

    this._barsEl = createElement('div', { className: 'hui-rating-summary__bars', part: 'bars', role: 'group' });
    this._barsEl.addEventListener('click', (e) => {
      const row = e.target.closest?.('.hui-rating-summary__row');
      if (row) this._toggle(Number(row.dataset.stars));
    });

    this._base = createElement('div', { className: 'hui-rating-summary', part: 'base' }, overview, this._barsEl);
    return this._base;
  }

  updated(changed) {
    if (changed.has('count')) this._buildRows();
    if (changed.has('src') || changed.has('fetchFn')) {
      if (this.src || typeof this.fetchFn === 'function') this.reload();
    }
    if (changed.has('color')) {
      const c = resolveColor(this.color);
      if (c) {
        this._base.style.setProperty('--_rsum-custom-color', c);
        this._display.setAttribute('color', this.color);
      } else {
        this._base.style.removeProperty('--_rsum-custom-color');
        this._display.removeAttribute('color');
      }
    }
    this._sync();
  }

  _buildRows() {
    const n = normalizeCount(this.count);
    this._rows = [];
    for (let s = n; s >= 1; s--) {
      const fill = createElement('span', { className: 'hui-rating-summary__fill', part: 'fill' });
      fill.style.setProperty('--_rsum-delay', `${(n - s) * BAR_STAGGER}ms`);
      const countEl = createElement('span', { className: 'hui-rating-summary__count', part: 'row-count' });
      const row = createElement('button', {
        type: 'button',
        className: 'hui-rating-summary__row',
        part: 'row',
        'data-stars': String(s),
      },
      createElement('span', { className: 'hui-rating-summary__label', part: 'row-label' }, String(s), miniStar()),
      createElement('span', { className: 'hui-rating-summary__track', part: 'track' }, fill),
      countEl);
      row._fill = fill;
      row._count = countEl;
      row._stars = s;
      this._rows.push(row);
    }
    this._barsEl.replaceChildren(...this._rows);
  }

  _sync() {
    const { average, total, counts, sum } = this.summary;
    const n = normalizeCount(this.count);

    this._averageEl.textContent = formatNumber(average, 1);
    this._display.setAttribute('value', String(average));
    this._display.setAttribute('count', String(n));
    this._totalEl.textContent = msg('rate.total', { count: formatNumber(total) });
    this._barsEl.setAttribute('aria-label', msg('rate.summary'));

    const active = toNum(this.active);
    for (const row of this._rows) {
      const c = counts.get(row._stars) ?? 0;
      const pct = sum ? (c / sum) * 100 : 0;
      const pctText = `${Math.round(pct * 10) / 10}%`;
      row._fill.style.width = this._revealed ? pctText : '0%';
      row._fill.dataset.width = pctText;
      row._count.textContent = formatNumber(c);
      const on = active === row._stars;
      row.setAttribute('aria-pressed', String(on));
      row.setAttribute('part', on ? 'row row-active' : 'row');
      row.setAttribute('aria-label', msg('rate.bar', { stars: row._stars, count: formatNumber(c), percent: `${Math.round(pct)}%` }));
    }
    this._base.classList.toggle('hui-rating-summary--filtered', active !== null);
    this._base.classList.toggle('hui-rating-summary--static', motionOff(this));
  }

  /** Lần đầu cuộn tới → các thanh chạy từ 0 tới đúng % */
  _reveal() {
    if (this._revealed) return;
    this._revealed = true;
    this._stopInView = null;
    // Nhường 1 frame để trình duyệt vẽ trạng thái 0% trước → transition chạy được
    requestAnimationFrame(() => this._sync());
  }

  _toggle(stars) {
    if (!Number.isFinite(stars)) return;
    this.active = toNum(this.active) === stars ? null : stars;
    this.emit('hui-filter', { stars: this.active ?? null });
  }
}

defineElement('hui-rating-summary', HuiRatingSummary);

export default HuiRatingSummary;
