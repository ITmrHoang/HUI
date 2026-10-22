/**
 * HUI Comparison Table — Bảng so sánh gói / sản phẩm: cột (gói) × dòng (tính năng) với ✓ / ✗ / chữ,
 * cột nổi bật, nhóm dòng, header + cột đầu dính khi cuộn; màn hẹp: chọn gói để so (select) hoặc cuộn ngang.
 */

import styles from './hui-comparison-table.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { formatCurrency } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/index.js';
import '../hui-button/index.js';

const STICKY = ['both', 'header', 'column', 'none'];
const MOBILE = ['select', 'scroll'];
let uid = 0;

const FALLBACK = {
  vi: {
    'comparisonTable.feature': 'Tính năng',
    'comparisonTable.choose': 'Chọn gói để so sánh',
    'comparisonTable.label': 'Bảng so sánh',
    'pricing.included': 'Có',
    'pricing.excluded': 'Không có',
    'pricing.popular': 'Phổ biến',
    'pricing.cta': 'Chọn gói',
  },
  en: {
    'comparisonTable.feature': 'Features',
    'comparisonTable.choose': 'Choose a plan to compare',
    'comparisonTable.label': 'Comparison table',
    'pricing.included': 'Included',
    'pricing.excluded': 'Not included',
    'pricing.popular': 'Popular',
    'pricing.cta': 'Choose plan',
  },
};
function tx(key) {
  const v = t(key);
  return v !== key ? v : (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

/**
 * Bảng so sánh. `columns`: [{ id, title, price, period, description, highlighted, badge, cta }]
 * — cta: chuỗi (nhãn nút) hoặc { label, href, variant }; price: số (định dạng theo `currency`) hoặc chuỗi.
 * `rows`: [{ label, description, group, values: { [colId]: true | false | 'chữ' | số } }] — dòng cùng `group` gom thành nhóm.
 *
 * @fires hui-select - Bấm nút CTA không có href. detail: { column }
 * @fires hui-column-change - Đổi gói đang xem ở chế độ chọn (màn hẹp). detail: { id, column }
 * @csspart base - Khung ngoài
 * @csspart picker - Khung chọn gói (màn hẹp, mobile="select")
 * @csspart select - Thẻ <select> chọn gói
 * @csspart scroller - Vùng cuộn ngang bọc bảng
 * @csspart table - Thẻ <table>
 * @csspart caption - Chú thích bảng
 * @csspart corner - Ô góc trên trái
 * @csspart column-header - Ô tiêu đề cột (gói)
 * @csspart column-header-highlighted - Ô tiêu đề cột nổi bật
 * @csspart badge - Nhãn "Phổ biến" của cột nổi bật
 * @csspart column-title - Tên gói
 * @csspart price - Giá
 * @csspart period - Chu kỳ (/tháng)
 * @csspart column-description - Mô tả gói
 * @csspart cta - Nút / link hành động
 * @csspart group-title - Ô tiêu đề nhóm dòng
 * @csspart row - Một dòng tính năng
 * @csspart row-header - Ô tên tính năng
 * @csspart cell - Ô giá trị
 * @csspart icon-yes - Dấu ✓
 * @csspart icon-no - Dấu ✗
 * @cssprop --hui-comparison-table-bg - Nền bảng (ô dính cũng dùng nền này)
 * @cssprop --hui-comparison-table-border-color - Đường kẻ
 * @cssprop --hui-comparison-table-radius - Bo góc khung
 * @cssprop --hui-comparison-table-cell-padding - Đệm ô
 * @cssprop --hui-comparison-table-first-col-width - Rộng cột tính năng
 * @cssprop --hui-comparison-table-col-min-width - Rộng tối thiểu mỗi cột gói
 * @cssprop --hui-comparison-table-sticky-top - Khoảng cách header dính tới mép trên (vd: chiều cao navbar)
 * @cssprop --hui-comparison-table-max-height - Chiều cao tối đa (cuộn dọc bên trong bảng)
 * @cssprop --hui-comparison-table-highlight-bg - Nền cột nổi bật
 * @cssprop --hui-comparison-table-highlight-color - Màu nhấn cột nổi bật (viền, badge)
 * @cssprop --hui-comparison-table-group-bg - Nền dòng tiêu đề nhóm
 * @cssprop --hui-comparison-table-yes-color - Màu dấu ✓
 * @cssprop --hui-comparison-table-no-color - Màu dấu ✗
 * @cssprop --hui-comparison-table-row-hover-bg - Nền dòng khi hover
 */
class HuiComparisonTable extends HuiElement {
  static properties = {
    /** Cột (gói / sản phẩm) — xem JSDoc của class */
    columns: { type: Array, default: [] },
    /** Dòng (tính năng) — xem JSDoc của class */
    rows: { type: Array, default: [] },
    /** Chú thích bảng (caption) — cũng là nhãn trợ năng */
    caption: { type: String },
    /** Tiêu đề cột đầu (mặc định theo locale: "Tính năng") */
    featureLabel: { type: String },
    /** both | header | column | none — phần dính khi cuộn */
    sticky: { type: String, default: 'both' },
    /** select | scroll — màn hẹp: chọn 1 gói để so với cột tính năng, hay cuộn ngang toàn bảng */
    mobile: { type: String, default: 'select' },
    /** Ngưỡng chuyển sang giao diện hẹp (px, theo chiều rộng thẻ) */
    mobileBreakpoint: { type: Number, default: 640 },
    /** Mã tiền tệ khi price là số */
    currency: { type: String, default: 'VND' },
    /** Hiện caption (mặc định chỉ cho trình đọc màn hình) */
    showCaption: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    this._mobile = false;
    this._activeCol = null;
  }

  render() {
    this._selectId = `hui-ct-select-${this._uid}`;
    this._select = createElement('select', { className: 'ct__select', part: 'select', id: this._selectId });
    this._select.addEventListener('change', () => {
      this._activeCol = this._select.value;
      this._syncVisibility();
      const column = this._columns.find((c) => c.id === this._activeCol);
      this.emit('hui-column-change', { id: this._activeCol, column });
    });
    this._pickerLabel = createElement('label', { className: 'ct__picker-label', for: this._selectId });
    this._picker = createElement('div', { className: 'ct__picker', part: 'picker', hidden: true }, this._pickerLabel,
      createElement('span', { className: 'ct__select-wrap' }, this._select, createElement('hui-icon', { name: 'chevron-down', className: 'ct__select-arrow' })));

    this._table = createElement('table', { className: 'ct__table', part: 'table' });
    this._scroller = createElement('div', { className: 'ct__scroller', part: 'scroller' }, this._table);
    this._base = createElement('div', { className: 'ct', part: 'base' }, this._picker, this._scroller);
    this._table.addEventListener('hui-click', (e) => {
      const btn = e.composedPath().find((n) => n.dataset?.ctaFor);
      if (!btn) return;
      const column = this._columns.find((c) => c.id === btn.dataset.ctaFor);
      if (column) this.emit('hui-select', { column });
    });
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._ro ||= new ResizeObserver(() => this._syncLayout());
    this._ro.observe(this);
    this._ro.observe(this._table);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
  }

  updated(changed) {
    if (changed.has('sticky')) {
      const sticky = STICKY.includes(this.sticky) ? this.sticky : 'both';
      this._base.classList.toggle('ct--sticky-header', sticky === 'both' || sticky === 'header');
      this._base.classList.toggle('ct--sticky-column', sticky === 'both' || sticky === 'column');
    }
    if (['columns', 'rows', 'caption', 'featureLabel', 'currency', 'showCaption', 'locale'].some((k) => changed.has(k))) this._build();
    if (changed.has('mobile') || changed.has('mobileBreakpoint')) this._syncLayout();
  }

  // =====================================================
  // DỮ LIỆU
  // =====================================================

  get _columns() {
    return (Array.isArray(this.columns) ? this.columns : []).filter(Boolean).map((c, i) => ({ ...c, id: String(c.id ?? i) }));
  }

  get _rows() {
    return (Array.isArray(this.rows) ? this.rows : []).filter(Boolean);
  }

  /** Gom dòng theo group (giữ thứ tự xuất hiện); dòng không group nằm nhóm đầu không tiêu đề */
  get _groups() {
    const groups = [];
    const byName = new Map();
    for (const row of this._rows) {
      const name = row.group ?? '';
      if (!byName.has(name)) {
        const g = { name, rows: [] };
        byName.set(name, g);
        if (name === '') groups.unshift(g);
        else groups.push(g);
      }
      byName.get(name).rows.push(row);
    }
    return groups;
  }

  /** Gói đang xem ở chế độ chọn (màn hẹp) */
  get activeColumn() {
    return this._activeCol;
  }

  set activeColumn(id) {
    this._activeCol = id === null || id === undefined ? null : String(id);
    if (this._hasRendered) {
      this._select.value = this._activeCol ?? '';
      this._syncVisibility();
    }
  }

  // =====================================================
  // DỰNG BẢNG
  // =====================================================

  _build() {
    const cols = this._columns;
    const label = this.caption || tx('comparisonTable.label');

    const caption = createElement('caption', { className: `ct__caption${this.showCaption ? '' : ' ct__sr'}`, part: 'caption' }, label);
    const headRow = createElement('tr', {},
      createElement('th', { scope: 'col', className: 'ct__corner', part: 'corner' }, this.featureLabel || tx('comparisonTable.feature')),
      ...cols.map((col) => this._columnHeader(col)));
    const thead = createElement('thead', { className: 'ct__head' }, headRow);

    const bodies = this._groups.map((g) => {
      const tbody = createElement('tbody', { className: 'ct__group' });
      if (g.name) {
        tbody.append(createElement('tr', { className: 'ct__group-row' },
          createElement('th', { scope: 'rowgroup', colspan: String(cols.length + 1), className: 'ct__group-title', part: 'group-title' },
            createElement('span', { className: 'ct__group-label' }, String(g.name)))));
      }
      g.rows.forEach((row) => tbody.append(this._row(row, cols)));
      return tbody;
    });

    this._table.replaceChildren(caption, thead, ...bodies);

    // Ô chọn gói (màn hẹp)
    this._pickerLabel.textContent = tx('comparisonTable.choose');
    this._select.replaceChildren(...cols.map((c) => createElement('option', { value: c.id }, String(c.title ?? c.id))));
    if (!cols.some((c) => c.id === this._activeCol)) {
      this._activeCol = (cols.find((c) => c.highlighted) || cols[0])?.id ?? null;
    }
    if (this._activeCol !== null) this._select.value = this._activeCol;
    this._syncVisibility();
    this._syncLayout();
  }

  _columnHeader(col) {
    const th = createElement('th', {
      scope: 'col', className: `ct__col-head${col.highlighted ? ' ct__col--highlight' : ''}`,
      part: col.highlighted ? 'column-header column-header-highlighted' : 'column-header', 'data-col': col.id,
    });
    if (col.highlighted || col.badge) {
      th.append(createElement('span', { className: 'ct__badge', part: 'badge' }, String(col.badge || tx('pricing.popular'))));
    }
    th.append(createElement('span', { className: 'ct__col-title', part: 'column-title' }, String(col.title ?? col.id)));
    if (col.price !== undefined && col.price !== null && col.price !== '') {
      const price = typeof col.price === 'number' ? formatCurrency(col.price, this.currency || 'VND') : String(col.price);
      const p = createElement('span', { className: 'ct__price', part: 'price' }, price);
      if (col.period) p.append(createElement('span', { className: 'ct__period', part: 'period' }, String(col.period)));
      th.append(p);
    }
    if (col.description) th.append(createElement('span', { className: 'ct__col-desc', part: 'column-description' }, String(col.description)));
    if (col.cta) {
      const cta = typeof col.cta === 'string' ? { label: col.cta } : col.cta;
      const text = String(cta.label || tx('pricing.cta'));
      if (cta.href) {
        th.append(createElement('a', {
          className: `ct__cta ct__cta--${col.highlighted ? 'primary' : 'outline'}`, part: 'cta', href: cta.href,
        }, text));
      } else {
        th.append(createElement('hui-button', {
          className: 'ct__cta-btn', part: 'cta', size: 'sm', block: true, 'data-cta-for': col.id,
          variant: cta.variant || (col.highlighted ? 'primary' : 'outline'),
        }, text));
      }
    }
    return th;
  }

  _row(row, cols) {
    const head = createElement('th', { scope: 'row', className: 'ct__row-head', part: 'row-header' },
      createElement('span', { className: 'ct__row-label' }, String(row.label ?? '')));
    if (row.description) head.append(createElement('span', { className: 'ct__row-desc' }, String(row.description)));
    const values = row.values || {};
    return createElement('tr', { className: 'ct__row', part: 'row' }, head,
      ...cols.map((col) => createElement('td', {
        className: `ct__cell${col.highlighted ? ' ct__col--highlight' : ''}`, part: 'cell', 'data-col': col.id,
      }, this._value(values[col.id]))));
  }

  /** true → ✓, false / null → ✗ (kèm chữ cho trình đọc màn hình), còn lại hiển thị chữ */
  _value(v) {
    if (v === true || v === false || v === null || v === undefined) {
      const yes = v === true;
      return createElement('span', { className: `ct__mark ct__mark--${yes ? 'yes' : 'no'}` },
        createElement('hui-icon', { name: yes ? 'check' : 'minus', part: yes ? 'icon-yes' : 'icon-no' }),
        createElement('span', { className: 'ct__sr' }, yes ? tx('pricing.included') : tx('pricing.excluded')));
    }
    return createElement('span', { className: 'ct__text' }, String(v));
  }

  // =====================================================
  // RESPONSIVE
  // =====================================================

  _syncLayout() {
    if (!this._hasRendered) return;
    const width = this.getBoundingClientRect().width;
    const mobile = width > 0 && width < (this.mobileBreakpoint || 640);
    const selectMode = mobile && (MOBILE.includes(this.mobile) ? this.mobile : 'select') === 'select' && this._columns.length > 1;
    if (mobile !== this._mobile || selectMode !== this._selectMode) {
      this._mobile = mobile;
      this._selectMode = selectMode;
      this._base.classList.toggle('ct--mobile', mobile);
      this._base.classList.toggle('ct--select', selectMode);
      this._picker.hidden = !selectMode;
      this.setState('mobile', mobile);
      this._syncVisibility();
    }
    // Bảng rộng / cao hơn khung → cuộn; vùng cuộn cần focus được để dùng bàn phím (Tab rồi ← →)
    const scrollable = this._table.offsetWidth > this._scroller.clientWidth + 1
      || this._table.offsetHeight > this._scroller.clientHeight + 1; // max-height → cuộn dọc bên trong
    this._scroller.classList.toggle('ct__scroller--scroll', scrollable);
    if (scrollable) {
      this._scroller.setAttribute('tabindex', '0');
      this._scroller.setAttribute('role', 'region');
      this._scroller.setAttribute('aria-label', this.caption || tx('comparisonTable.label'));
    } else {
      this._scroller.removeAttribute('tabindex');
      this._scroller.removeAttribute('role');
      this._scroller.removeAttribute('aria-label');
    }
  }

  /** Chế độ chọn: chỉ hiện cột tính năng + gói đang chọn */
  _syncVisibility() {
    const only = this._selectMode ? this._activeCol : null;
    this._table.querySelectorAll('[data-col]').forEach((cell) => {
      cell.classList.toggle('ct__col--hidden', only !== null && cell.dataset.col !== only);
    });
    this._table.querySelectorAll('.ct__group-title').forEach((th) => {
      th.colSpan = only !== null ? 2 : this._columns.length + 1;
    });
  }
}

defineElement('hui-comparison-table', HuiComparisonTable);

export default HuiComparisonTable;
