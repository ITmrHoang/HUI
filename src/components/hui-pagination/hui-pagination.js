/**
 * HUI Pagination — Phân trang (Ant Pagination + MUI Pagination)
 *   <hui-pagination total="500" current="3" page-size="20" show-size-changer show-quick-jumper show-total>
 * Danh sách trang có nút "•••" nhảy ±5 trang khi nhiều trang. Chữ theo locale (pagination.*).
 */

import styles from './hui-pagination.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { getLocaleName, t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/hui-icon.js';
import '../hui-select/index.js';

/** Chuỗi chưa có trong locale.js → mặc định theo ngôn ngữ (xem báo cáo locale keys mới) */
const FALLBACK = {
  vi: { 'pagination.label': 'Phân trang', 'pagination.prev5': 'Lùi 5 trang', 'pagination.next5': 'Tiến 5 trang' },
  en: { 'pagination.label': 'Pagination', 'pagination.prev5': 'Previous 5 pages', 'pagination.next5': 'Next 5 pages' },
};
function tx(key, vars) {
  const v = t(key, vars);
  return v !== key ? v : FALLBACK[getLocaleName() === 'vi' ? 'vi' : 'en'][key] ?? key;
}

/** Số trang hiển thị hai bên trang hiện tại */
const BUFFER = 2;
const JUMP = 5;

/**
 * Danh sách nút trang: số trang hoặc 'jump-prev' / 'jump-next'.
 * ≤ 9 trang: hiện đủ. Nhiều hơn: 1 … (hiện tại ±2) … cuối; "…" chỉ thay cho ≥ 2 trang.
 */
export function pageItems(current, pages) {
  if (pages <= 5 + BUFFER * 2) return Array.from({ length: pages }, (_, i) => i + 1);
  let left = Math.max(1, current - BUFFER);
  let right = Math.min(pages, current + BUFFER);
  if (current - 1 <= BUFFER) right = 1 + BUFFER * 2;
  if (pages - current <= BUFFER) left = pages - BUFFER * 2;

  const out = [1];
  if (left > 3) out.push('jump-prev');
  else for (let p = 2; p < left; p++) out.push(p);
  for (let p = Math.max(2, left); p <= Math.min(pages - 1, right); p++) out.push(p);
  if (right < pages - 2) out.push('jump-next');
  else for (let p = right + 1; p < pages; p++) out.push(p);
  out.push(pages);
  return out;
}

/**
 * @fires change - Đổi trang hoặc số mục mỗi trang do người dùng. detail: { current, pageSize }
 * @csspart base - Thẻ <nav> (landmark)
 * @csspart total - Dòng "Tổng N mục"
 * @csspart list - Danh sách nút <ul>
 * @csspart item - Mỗi nút trang (thêm item-active cho trang hiện tại)
 * @csspart prev - Nút trang trước
 * @csspart next - Nút trang sau
 * @csspart jump-prev - Nút "•••" lùi 5 trang
 * @csspart jump-next - Nút "•••" tiến 5 trang
 * @csspart size-changer - hui-select chọn số mục / trang
 * @csspart quick-jumper - Khung "Đến trang [ ]"
 * @csspart jumper-input - Ô nhập số trang (quick jumper / simple)
 * @csspart simple-pager - Khung "[3] / 10" của mode simple
 * @cssprop --hui-pagination-item-size - Kích thước nút trang
 * @cssprop --hui-pagination-item-radius - Bo góc nút trang
 * @cssprop --hui-pagination-item-color - Màu chữ nút trang
 * @cssprop --hui-pagination-item-bg - Nền nút trang
 * @cssprop --hui-pagination-item-hover-bg - Nền nút khi hover
 * @cssprop --hui-pagination-active-color - Màu chữ / viền trang hiện tại
 * @cssprop --hui-pagination-active-bg - Nền trang hiện tại
 * @cssprop --hui-pagination-active-border-color - Viền trang hiện tại
 * @cssprop --hui-pagination-gap - Khoảng cách giữa các nút
 * @cssprop --hui-pagination-font-size - Cỡ chữ
 */
class HuiPagination extends HuiElement {
  static properties = {
    /** Tổng số mục */
    total: { type: Number, default: 0 },
    /** Trang hiện tại (bắt đầu từ 1) */
    current: { type: Number, default: 1 },
    /** Số mục mỗi trang */
    pageSize: { type: Number, default: 10 },
    /** Các lựa chọn số mục / trang, phân tách bằng dấu phẩy */
    pageSizeOptions: { type: String, default: '10,20,50,100' },
    /** Hiện ô chọn số mục / trang (hui-select) */
    showSizeChanger: { type: Boolean },
    /** Hiện ô "Đến trang" */
    showQuickJumper: { type: Boolean },
    /** Hiện "Tổng N mục" (đổi chữ bằng property totalFormat) */
    showTotal: { type: Boolean },
    /** Dạng gọn: ‹ [3] / 10 › */
    simple: { type: Boolean },
    /** sm | md */
    size: { type: String, default: 'md' },
    disabled: { type: Boolean },
    /** Chỉ có 1 trang thì ẩn cả thanh phân trang */
    hideOnSinglePage: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._totalFormat = null;
  }

  /** Hàm (total, [from, to]) => string thay cho chữ mặc định "Tổng N mục" (bật luôn show-total) */
  get totalFormat() {
    return this._totalFormat;
  }

  set totalFormat(fn) {
    this._totalFormat = typeof fn === 'function' ? fn : null;
    this.requestUpdate('totalFormat');
  }

  /** Tổng số trang (≥ 1) */
  get pageCount() {
    const size = Math.max(1, this.pageSize || 10);
    return Math.max(1, Math.ceil((this.total || 0) / size));
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._totalEl = createElement('span', { className: 'total', part: 'total', hidden: true });
    this._list = createElement('ul', { className: 'list', part: 'list' });
    this._list.addEventListener('click', (e) => this._onListClick(e));

    this._sizeSelect = createElement('hui-select', { part: 'size-changer', className: 'size-changer', hidden: true });
    // change của hui-select nổi bọt (composed) — chặn lại để không lẫn với change của pagination
    this._sizeSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      this._onSizeChange(Number(e.detail?.value));
    });

    this._jumpInput = createElement('input', { className: 'jumper-input', part: 'jumper-input', type: 'text', inputmode: 'numeric' });
    this._jumpInput.addEventListener('input', (e) => e.stopPropagation());
    this._jumpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._jumpTo(this._jumpInput);
    });
    this._jumpInput.addEventListener('change', () => this._jumpTo(this._jumpInput));
    this._jumpLabelText = document.createTextNode('');
    this._jumper = createElement('label', { className: 'jumper', part: 'quick-jumper', hidden: true },
      this._jumpLabelText, this._jumpInput);

    this._base = createElement('nav', { className: 'pagination', part: 'base' },
      this._totalEl, this._list, this._sizeSelect, this._jumper);
    return this._base;
  }

  updated(changed) {
    const pages = this.pageCount;
    const current = this._current;

    this._base.className = [
      'pagination',
      `pagination--${this.size === 'sm' ? 'sm' : 'md'}`,
      this.simple ? 'pagination--simple' : '',
      this.disabled ? 'pagination--disabled' : '',
    ].filter(Boolean).join(' ');
    this._base.setAttribute('aria-label', tx('pagination.label'));
    this._base.hidden = this.hideOnSinglePage && pages <= 1;

    // Tổng
    const showTotal = this.showTotal || Boolean(this._totalFormat);
    this._totalEl.hidden = !showTotal || this.simple;
    if (showTotal) {
      const size = Math.max(1, this.pageSize || 10);
      const from = this.total ? (current - 1) * size + 1 : 0;
      const to = Math.min(this.total || 0, current * size);
      this._totalEl.textContent = this._totalFormat
        ? String(this._totalFormat(this.total || 0, [from, to]))
        : t('pagination.total', { total: this.total || 0 });
    }

    this._renderList(pages, current);

    // Chọn số mục / trang
    this._sizeSelect.hidden = !this.showSizeChanger || this.simple;
    if (!this._sizeSelect.hidden) {
      const suffix = t('pagination.itemsPerPage');
      const opts = this._sizeOptions();
      const optsKey = `${opts.join(',')}|${suffix}`;
      if (optsKey !== this._optsKey) {
        this._optsKey = optsKey;
        this._sizeSelect.options = opts.map((n) => ({ value: String(n), label: `${n} ${suffix}` }));
      }
      this._sizeSelect.value = String(this.pageSize || 10);
      this._sizeSelect.setAttribute('size', this.size === 'sm' ? 'sm' : 'md');
      this._sizeSelect.toggleAttribute('disabled', this.disabled);
      this._sizeSelect.setAttribute('aria-label', t('pagination.itemsPerPage').replace(/^\/\s*/, ''));
    }

    // Quick jumper
    this._jumper.hidden = !this.showQuickJumper || this.simple;
    this._jumpLabelText.data = `${t('pagination.jumpTo')} `;
    this._jumpInput.disabled = this.disabled;
    this._jumpInput.setAttribute('aria-label', t('pagination.jumpTo'));
  }

  // =====================================================
  // NỘI BỘ
  // =====================================================

  /** Trang hiện tại đã kẹp trong [1, pageCount] */
  get _current() {
    return Math.min(Math.max(1, Math.floor(this.current || 1)), this.pageCount);
  }

  _sizeOptions() {
    const list = String(this.pageSizeOptions || '').split(',').map((s) => Number(s.trim())).filter((n) => n > 0);
    const size = this.pageSize || 10;
    if (!list.includes(size)) list.push(size);
    return [...new Set(list)].sort((a, b) => a - b);
  }

  _button(id, part, content, { label, disabled = false, active = false } = {}) {
    const btn = createElement('button', {
      type: 'button',
      className: `btn btn--${part}`,
      part,
      dataset: { id },
    }, ...[].concat(content));
    if (label) btn.setAttribute('aria-label', label);
    if (active) btn.setAttribute('aria-current', 'page');
    btn.disabled = disabled || this.disabled;
    return createElement('li', {}, btn);
  }

  /** Dựng lại danh sách nút; giữ focus trên nút tương ứng (vd: vẫn ở nút "trang sau") */
  _renderList(pages, current) {
    const focusedId = this.shadowRoot.activeElement?.dataset?.id;
    const prevLabel = t('pagination.prev');
    const nextLabel = t('pagination.next');
    const items = [
      this._button('prev', 'prev', createElement('hui-icon', { name: 'chevron-left' }), { label: prevLabel, disabled: current <= 1 }),
    ];

    if (this.simple) {
      const input = createElement('input', {
        className: 'jumper-input', part: 'jumper-input', type: 'text', inputmode: 'numeric',
        value: String(current), 'aria-label': t('pagination.page'), dataset: { id: 'simple-input' },
      });
      input.disabled = this.disabled;
      input.addEventListener('input', (e) => e.stopPropagation());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._jumpTo(input, false);
      });
      input.addEventListener('change', () => this._jumpTo(input, false));
      items.push(createElement('li', { className: 'simple', part: 'simple-pager' },
        input, createElement('span', { className: 'simple__sep', 'aria-hidden': 'true' }, '/'),
        createElement('span', { className: 'simple__total' }, String(pages))));
    } else {
      for (const it of pageItems(current, pages)) {
        if (it === 'jump-prev' || it === 'jump-next') {
          const prev = it === 'jump-prev';
          items.push(this._button(it, it, [
            createElement('span', { className: 'dots', 'aria-hidden': 'true' }, '•••'),
            createElement('hui-icon', { className: 'jump-icon', name: prev ? 'chevron-left' : 'chevron-right' }),
          ], { label: tx(prev ? 'pagination.prev5' : 'pagination.next5') }));
        } else {
          const active = it === current;
          items.push(this._button(`page-${it}`, active ? 'item item-active' : 'item', String(it), {
            label: `${t('pagination.page')} ${it}`,
            active,
          }));
        }
      }
    }

    items.push(this._button('next', 'next', createElement('hui-icon', { name: 'chevron-right' }), { label: nextLabel, disabled: current >= pages }));
    this._list.replaceChildren(...items);

    if (focusedId) {
      const el = this._list.querySelector(`[data-id="${focusedId}"]`);
      if (el && !el.disabled) el.focus();
      else this._list.querySelector('[aria-current="page"]')?.focus();
    }
  }

  _onListClick(e) {
    const btn = e.target.closest('button[data-id]');
    if (!btn || btn.disabled || this.disabled) return;
    const id = btn.dataset.id;
    const cur = this._current;
    let page = cur;
    if (id === 'prev') page = cur - 1;
    else if (id === 'next') page = cur + 1;
    else if (id === 'jump-prev') page = cur - JUMP;
    else if (id === 'jump-next') page = cur + JUMP;
    else if (id.startsWith('page-')) page = Number(id.slice(5));
    this._goTo(page);
  }

  _goTo(page, pageSize = this.pageSize || 10) {
    const size = Math.max(1, pageSize);
    const pages = Math.max(1, Math.ceil((this.total || 0) / size));
    const next = Math.min(Math.max(1, Math.round(page) || 1), pages);
    if (next === this._current && size === (this.pageSize || 10)) return;
    this.pageSize = size;
    this.current = next;
    this.emit('change', { current: next, pageSize: size });
  }

  _onSizeChange(size) {
    if (!size || size === this.pageSize) return;
    // Giữ mục đầu của trang hiện tại vẫn nằm trong trang mới (giống Ant)
    const firstItem = (this._current - 1) * (this.pageSize || 10);
    this._goTo(Math.floor(firstItem / size) + 1, size);
  }

  _jumpTo(input, clear = true) {
    const raw = input.value.trim();
    if (!raw) return;
    const page = Number.parseInt(raw, 10);
    if (Number.isFinite(page)) this._goTo(page);
    if (clear) input.value = '';
    else input.value = String(this._current);
  }
}

defineElement('hui-pagination', HuiPagination);

export default HuiPagination;
