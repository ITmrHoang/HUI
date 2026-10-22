/**
 * HUI Transfer — Hai danh sách chuyển qua lại (Ant Transfer), tham gia <form> native (giá trị = targetKeys).
 * Mỗi danh sách: tiêu đề, ô "chọn tất cả" kèm đếm "3/10 mục", tìm kiếm không dấu (tô đậm), phân trang hoặc virtual,
 * item tùy biến bằng renderItem(item) hoặc <template> con. one-way: danh sách đích có nút ✕ thay cho ô check.
 * Mỗi danh sách là một listbox chọn nhiều (WAI-ARIA APG), focus ở danh sách + aria-activedescendant.
 * Màn hẹp: hai danh sách xếp dọc, nút chuyển xoay theo.
 */

import styles from './hui-transfer.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t } from '../../core/locale.js';
import { renderTemplate } from '../../core/template.js';
import { createElement } from '../../utils/dom.js';
import { VirtualWindow } from '../../utils/virtual.js';
import { animationsDisabled } from '../../utils/animate.js';
import { matchRange, highlight, textOf, msg, svgIcon } from '../hui-tree/tree-utils.js';

const FALLBACK = {
  'transfer.source': { vi: 'Nguồn', en: 'Source' },
  'transfer.target': { vi: 'Đích', en: 'Target' },
  'transfer.total': { vi: '{total} mục', en: '{total} items' },
  'transfer.count': { vi: '{checked}/{total} mục', en: '{checked}/{total} items' },
  'transfer.selectAll': { vi: 'Chọn tất cả', en: 'Select all' },
  'transfer.searchPlaceholder': { vi: 'Tìm trong danh sách', en: 'Search here' },
  'transfer.notFound': { vi: 'Không tìm thấy', en: 'Not found' },
  'transfer.empty': { vi: 'Không có dữ liệu', en: 'No data' },
  'transfer.moveTo': { vi: 'Chuyển sang {title}', en: 'Move to {title}' },
  'transfer.remove': { vi: 'Bỏ {title}', en: 'Remove {title}' },
  'transfer.moved': { vi: 'Đã chuyển {count} mục sang {title}', en: 'Moved {count} items to {title}' },
  'transfer.page': { vi: 'Trang {page}/{total}', en: 'Page {page} of {total}' },
};
const m = (key, vars) => msg(key, vars, FALLBACK);

const SIDES = ['source', 'target'];
const FALLBACK_ITEM_HEIGHT = 32;

/**
 * Chuyển mục giữa hai danh sách.
 * @fires change - Sau khi chuyển. detail: { value, targetKeys, direction: 'right' | 'left', moveKeys }
 * @fires hui-change - Giống change (tên kiểu Ant onChange). detail: { targetKeys, direction, moveKeys }
 * @fires hui-select-change - Đổi mục đang check. detail: { sourceSelectedKeys, targetSelectedKeys }
 * @fires hui-search - Gõ ô tìm kiếm. detail: { direction: 'left' | 'right', value }
 * @slot - <template> mẫu cho từng item (data-bind="title" ...), thay cho renderItem
 * @csspart base - Khung ngoài
 * @csspart list - Mỗi danh sách (+ list-source / list-target)
 * @csspart header - Đầu danh sách
 * @csspart select-all - Ô "chọn tất cả" (role=checkbox)
 * @csspart count - Chữ đếm "3/10 mục"
 * @csspart title - Tiêu đề danh sách
 * @csspart search - Ô tìm kiếm
 * @csspart body - Vùng item (role=listbox)
 * @csspart item - Mỗi item (+ item-checked / item-active / item-disabled)
 * @csspart checkbox - Ô check của item / chọn tất cả (+ checkbox-checked / checkbox-indeterminate)
 * @csspart item-title - Chữ chính của item
 * @csspart item-description - Mô tả phụ
 * @csspart item-remove - Nút ✕ (one-way, danh sách đích)
 * @csspart highlight - Phần chữ khớp tìm kiếm
 * @csspart empty - Vùng trống
 * @csspart pagination - Thanh phân trang
 * @csspart operations - Cột nút chuyển
 * @csspart move-button - Nút chuyển (+ move-right / move-left)
 * @cssprop --hui-transfer-list-width - Độ rộng mỗi danh sách
 * @cssprop --hui-transfer-list-height - Chiều cao mỗi danh sách
 * @cssprop --hui-transfer-radius - Bo góc danh sách
 * @cssprop --hui-transfer-border-color - Viền danh sách
 * @cssprop --hui-transfer-bg - Nền danh sách
 * @cssprop --hui-transfer-header-bg - Nền đầu danh sách
 * @cssprop --hui-transfer-item-padding - Đệm mỗi item
 * @cssprop --hui-transfer-item-hover-bg - Nền item khi hover / focus
 * @cssprop --hui-transfer-item-checked-bg - Nền item đang check
 * @cssprop --hui-transfer-checked-bg - Nền ô check
 * @cssprop --hui-transfer-highlight-color - Màu chữ phần khớp
 * @cssprop --hui-transfer-gap - Khoảng cách danh sách ↔ nút
 */
class HuiTransfer extends HuiFormElement {
  static properties = {
    /** Khóa các mục ở danh sách đích (= targetKeys). Attribute nhận JSON '["a","b"]' */
    value: { type: Array, default: [], reflect: false },
    /** [{ key, title, description, disabled }] — nên gán bằng property */
    dataSource: { type: Array, default: [] },
    /** Khóa đang check (cả hai bên) */
    selectedKeys: { type: Array, default: [] },
    /** Tiêu đề ["Nguồn", "Đích"] */
    titles: { type: Array, default: [] },
    /** Ô tìm kiếm cho mỗi danh sách (không dấu) */
    showSearch: { type: Boolean },
    /** Placeholder ô tìm kiếm */
    searchPlaceholder: { type: String, default: '' },
    /** Một chiều: chỉ chuyển sang đích; bỏ mục ở đích bằng nút ✕ */
    oneWay: { type: Boolean },
    /** Số mục mỗi trang (bật phân trang) */
    pageSize: { type: Number },
    /** Chỉ vẽ mục đang nhìn thấy (danh sách rất dài) */
    virtual: { type: Boolean },
    /** Tắt hiệu ứng khi chuyển */
    noAnimation: { type: Boolean },
    /** (item) => string | Node — tự vẽ nội dung item (thay title / description; tên `render` trùng method nội bộ) */
    renderItem: { type: Object, attribute: false },
    /** (query, item, direction) => boolean — luật lọc riêng (mặc định khớp không dấu title / description) */
    filterOption: { type: Object, attribute: false },
  };

  static styles = styles;

  constructor() {
    super();
    this._query = { source: '', target: '' };
    this._page = { source: 1, target: 1 };
    this._active = { source: null, target: null };
    this._anchor = { source: null, target: null };
    this._views = { source: [], target: [] };
    this._vw = { source: null, target: null };
    this._itemH = 0;
    this._flash = null;
    this._ui = {};
  }

  // =====================================================
  // JS PROPERTIES
  // =====================================================

  /**
   * Khóa ở danh sách đích — alias của value (tên kiểu Ant)
   * @public
   * @type {Array}
   */
  get targetKeys() { return this.value; }
  set targetKeys(v) { this.value = v; }

  get _itemFn() { return typeof this.renderItem === 'function' ? this.renderItem : null; }
  get _filterFn() { return typeof this.filterOption === 'function' ? this.filterOption : null; }

  _targetKeys() {
    const v = this.value;
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v) {
      try {
        const p = JSON.parse(v);
        if (Array.isArray(p)) return p;
      } catch { /* tách dấu phẩy */ }
      return v.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }

  // =====================================================
  // FORM
  // =====================================================

  formValue() {
    const keys = this._targetKeys();
    if (!keys.length || !this.name) return null;
    const fd = new FormData();
    for (const k of keys) fd.append(this.name, String(k));
    return fd;
  }

  _isEmpty() { return this._targetKeys().length === 0; }

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() { return this._ui.target?.body; }

  formResetCallback() {
    super.formResetCallback();
    this.value = this._targetKeys();
    this.selectedKeys = [];
  }

  formStateRestoreCallback(state) {
    if (state instanceof FormData) this.value = state.getAll(this.name);
  }

  // =====================================================
  // DOM
  // =====================================================

  _buildList(side) {
    const ui = {};
    ui.box = createElement('span', { className: 'tf__checkbox', part: 'checkbox', 'aria-hidden': 'true' }, svgIcon('check', 'tf__check'));
    ui.all = createElement('span', { className: 'tf__all', part: 'select-all', role: 'checkbox', tabindex: '0', 'aria-checked': 'false' }, ui.box);
    ui.all.addEventListener('click', () => this._toggleAll(side));
    ui.all.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this._toggleAll(side);
      }
    });
    ui.count = createElement('span', { className: 'tf__count', part: 'count' });
    ui.title = createElement('span', { className: 'tf__title', part: 'title', id: `${side}-title` });
    ui.header = createElement('div', { className: 'tf__header', part: 'header' }, ui.all, ui.count, ui.title);

    ui.search = createElement('input', { className: 'tf__search', part: 'search', type: 'search', autocomplete: 'off' });
    ui.search.addEventListener('input', (e) => {
      e.stopPropagation();
      this._query[side] = ui.search.value;
      this._page[side] = 1;
      this._renderList(side);
      this.emit('hui-search', { direction: side === 'source' ? 'left' : 'right', value: ui.search.value });
    });
    ui.search.addEventListener('change', (e) => e.stopPropagation());
    ui.search.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        ui.body.focus();
      }
    });
    ui.searchWrap = createElement('div', { className: 'tf__search-wrap' }, ui.search);

    ui.spacer = createElement('div', { className: 'tf__spacer', 'aria-hidden': 'true' });
    ui.items = createElement('div', { className: 'tf__items' });
    ui.body = createElement('div', {
      className: 'tf__body', part: 'body', role: 'listbox', tabindex: '0', 'aria-multiselectable': 'true',
      'aria-labelledby': `${side}-title`, id: `${side}-list`,
    }, ui.spacer, ui.items);
    ui.body.addEventListener('click', (e) => this._onItemClick(side, e));
    ui.body.addEventListener('keydown', (e) => this._onKeydown(side, e));
    ui.body.addEventListener('focus', () => {
      if (this._active[side] == null) this._active[side] = this._pageItems(side)[0]?.key ?? null;
      this._syncActive(side, true);
    });
    ui.empty = createElement('div', { className: 'tf__empty', part: 'empty', hidden: true });

    ui.prev = createElement('button', { className: 'tf__page-btn', type: 'button' }, svgIcon('chevron-left'));
    ui.next = createElement('button', { className: 'tf__page-btn', type: 'button' }, svgIcon('chevron-right'));
    ui.pageText = createElement('span', { className: 'tf__page-text' });
    ui.prev.addEventListener('click', () => this._goPage(side, -1));
    ui.next.addEventListener('click', () => this._goPage(side, 1));
    ui.pager = createElement('div', { className: 'tf__pagination', part: 'pagination', hidden: true }, ui.prev, ui.pageText, ui.next);

    ui.root = createElement('section', { className: `tf__list tf__list--${side}`, part: `list list-${side}` },
      ui.header, ui.searchWrap, ui.body, ui.empty, ui.pager);
    return ui;
  }

  render() {
    this._ui.source = this._buildList('source');
    this._ui.target = this._buildList('target');
    this._toRight = createElement('button', { className: 'tf__move', part: 'move-button move-right', type: 'button', disabled: true },
      svgIcon('chevron-right', 'tf__move-icon'));
    this._toLeft = createElement('button', { className: 'tf__move', part: 'move-button move-left', type: 'button', disabled: true },
      svgIcon('chevron-left', 'tf__move-icon'));
    this._toRight.addEventListener('click', () => this._move('right'));
    this._toLeft.addEventListener('click', () => this._move('left'));
    this._ops = createElement('div', { className: 'tf__operations', part: 'operations' }, this._toRight, this._toLeft);
    this._live = createElement('div', { className: 'tf__sr', role: 'status', 'aria-live': 'polite' });
    this._slot = createElement('slot', { className: 'tf__slot' });
    this._slot.addEventListener('slotchange', () => this.requestUpdate('template'));
    this._base = createElement('div', { className: 'tf', part: 'base' },
      this._ui.source.root, this._ops, this._ui.target.root, this._live, this._slot);
    return this._base;
  }

  updated(changed) {
    const localeChanged = changed.has('locale');
    if (changed.has('value') && !Array.isArray(this.value)) this.value = this._targetKeys();
    if (changed.has('dataSource') || changed.has('value')) {
      this._items = new Map((this.dataSource || []).map((it) => [String(it.key), it]));
    }
    if (changed.has('selectedKeys') || changed.has('dataSource') || changed.has('value')) this._syncChecked();
    if (localeChanged || changed.has('titles') || changed.has('oneWay')) this._syncTitles();
    if (localeChanged || changed.has('searchPlaceholder') || changed.has('showSearch')) {
      for (const side of SIDES) {
        const ui = this._ui[side];
        ui.searchWrap.hidden = !this.showSearch;
        ui.search.placeholder = this.searchPlaceholder || m('transfer.searchPlaceholder');
        ui.search.setAttribute('aria-label', `${t('common.search')} — ${this._titleOf(side)}`);
        ui.prev.setAttribute('aria-label', t('pagination.prev'));
        ui.next.setAttribute('aria-label', t('pagination.next'));
        ui.all.setAttribute('aria-label', `${m('transfer.selectAll')} — ${this._titleOf(side)}`);
      }
    }
    if (changed.has('virtual') || changed.has('pageSize')) this._setupVirtual();
    if (changed.has('disabled')) {
      this._base.classList.toggle('tf--disabled', this.isDisabled);
      for (const side of SIDES) {
        this._ui[side].body.tabIndex = this.isDisabled ? -1 : 0;
        this._ui[side].all.tabIndex = this.isDisabled ? -1 : 0;
        this._ui[side].search.disabled = this.isDisabled;
      }
    }
    this._base.classList.toggle('tf--one-way', this.oneWay);
    for (const side of SIDES) this._renderList(side);
    super.updated(changed);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const side of SIDES) {
      this._vw[side]?.destroy();
      this._vw[side] = null;
    }
  }

  _titleOf(side) {
    const titles = Array.isArray(this.titles) ? this.titles : [];
    return titles[side === 'source' ? 0 : 1] || m(side === 'source' ? 'transfer.source' : 'transfer.target');
  }

  _syncTitles() {
    for (const side of SIDES) this._ui[side].title.textContent = this._titleOf(side);
    this._toRight.setAttribute('aria-label', m('transfer.moveTo', { title: this._titleOf('target') }));
    this._toLeft.setAttribute('aria-label', m('transfer.moveTo', { title: this._titleOf('source') }));
    this._toLeft.hidden = this.oneWay;
  }

  _setupVirtual() {
    for (const side of SIDES) {
      const on = this.virtual && !(this.pageSize > 0);
      const ui = this._ui[side];
      ui.body.classList.toggle('tf__body--virtual', on);
      if (on && !this._vw[side]) {
        this._vw[side] = new VirtualWindow(ui.body, {
          count: 0, itemSize: this._itemH || FALLBACK_ITEM_HEIGHT, overscan: 6,
          onRange: (r) => this._paintRange(side, r),
        });
      } else if (!on && this._vw[side]) {
        this._vw[side].destroy();
        this._vw[side] = null;
        ui.spacer.style.height = '';
        ui.items.style.transform = '';
      }
    }
  }

  // =====================================================
  // DỮ LIỆU
  // =====================================================

  _syncChecked() {
    const targets = new Set(this._targetKeys().map(String));
    const sel = new Set((this.selectedKeys || []).map(String));
    this._checked = { source: new Set(), target: new Set() };
    for (const id of sel) {
      if (!this._items?.has(id)) continue;
      this._checked[targets.has(id) ? 'target' : 'source'].add(id);
    }
  }

  /** Mục của mỗi bên: nguồn theo thứ tự dataSource, đích theo thứ tự targetKeys */
  _sideItems(side) {
    const targets = this._targetKeys().map(String);
    if (side === 'target') return targets.map((k) => this._items.get(k)).filter(Boolean);
    const set = new Set(targets);
    return (this.dataSource || []).filter((it) => !set.has(String(it.key)));
  }

  _filtered(side) {
    const q = this._query[side];
    const all = this._sideItems(side);
    if (!q.trim()) return all;
    const dir = side === 'source' ? 'left' : 'right';
    return all.filter((it) => (this._filterFn
      ? this._filterFn(q, it, dir)
      : matchRange(textOf(it.title), q) || matchRange(textOf(it.description), q)));
  }

  _pageCount(side) {
    return this.pageSize > 0 ? Math.max(1, Math.ceil(this._views[side].length / this.pageSize)) : 1;
  }

  _pageItems(side) {
    const list = this._views[side];
    if (!(this.pageSize > 0)) return list;
    const start = (this._page[side] - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  // =====================================================
  // VẼ
  // =====================================================

  _renderList(side) {
    const ui = this._ui[side];
    if (!ui || !this._items) return;
    this._views[side] = this._filtered(side);
    const pages = this._pageCount(side);
    if (this._page[side] > pages) this._page[side] = pages;
    const items = this._pageItems(side);
    if (this._active[side] != null && !items.some((it) => String(it.key) === this._active[side])) this._active[side] = null;

    if (this._vw[side]) {
      this._vw[side].setCount(items.length);
    } else {
      this._paintRange(side, { start: 0, end: items.length });
    }

    const total = this._sideItems(side).length;
    ui.empty.hidden = items.length > 0;
    ui.empty.textContent = total ? m('transfer.notFound') : m('transfer.empty');
    ui.body.hidden = items.length === 0;
    ui.pager.hidden = !(this.pageSize > 0) || pages <= 1;
    ui.pageText.textContent = `${this._page[side]}/${pages}`;
    ui.pageText.setAttribute('aria-label', m('transfer.page', { page: this._page[side], total: pages }));
    ui.prev.disabled = this._page[side] <= 1;
    ui.next.disabled = this._page[side] >= pages;
    this._syncHeader(side);
    this._syncButtons();
  }

  _paintRange(side, { start, end, offset = 0, total = 0 }) {
    const ui = this._ui[side];
    const items = this._pageItems(side);
    const tpl = this.querySelector(':scope > template');
    const els = [];
    for (let i = start; i < end; i++) els.push(this._createItem(side, items[i], i, items.length, tpl));
    ui.items.replaceChildren(...els);
    if (this._vw[side]) {
      ui.spacer.style.height = `${total}px`;
      ui.items.style.transform = `translateY(${offset}px)`;
      const h = els[0]?.offsetHeight;
      if (h && h !== this._vw[side].itemSize) {
        this._itemH = h;
        this._vw[side].itemSize = h;
        queueMicrotask(() => this._vw[side]?.update(true));
      }
    }
    // Hiệu ứng: mục vừa chuyển sang trượt vào
    if (this._flash?.side === side && !this.noAnimation && !animationsDisabled()) {
      const dx = side === 'target' ? -12 : 12;
      for (const el of els) {
        if (this._flash.keys.has(el.dataset.key)) {
          el.animate?.([{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
        }
      }
    }
    this._syncActive(side, false);
  }

  _createItem(side, item, i, count, tpl) {
    const key = String(item.key);
    const checked = this._checked[side].has(key);
    const disabled = Boolean(item.disabled) || this.isDisabled;
    const removable = this.oneWay && side === 'target';
    const el = createElement('div', {
      className: ['tf__item', checked && 'tf__item--checked', disabled && 'tf__item--disabled'].filter(Boolean).join(' '),
      part: ['item', checked && 'item-checked', disabled && 'item-disabled'].filter(Boolean).join(' '),
      role: 'option', id: `${side}-${i}`, 'aria-selected': String(checked),
      'aria-setsize': String(count), 'aria-posinset': String(i + 1),
      dataset: { key },
    });
    if (disabled) el.setAttribute('aria-disabled', 'true');
    if (!removable) {
      el.append(createElement('span', {
        className: ['tf__checkbox', checked && 'tf__checkbox--checked'].filter(Boolean).join(' '),
        part: ['checkbox', checked && 'checkbox-checked'].filter(Boolean).join(' '), 'aria-hidden': 'true',
      }, svgIcon('check', 'tf__check')));
    }
    const content = createElement('span', { className: 'tf__content' });
    const custom = this._itemFn?.(item);
    const q = this._query[side];
    if (custom instanceof Node) content.append(custom);
    else if (custom != null) content.textContent = String(custom);
    else if (tpl) content.append(renderTemplate(tpl, item, i));
    else {
      content.append(createElement('span', { className: 'tf__item-title', part: 'item-title' }, ...highlight(textOf(item.title), q, 'tf__mark')));
      if (item.description) {
        content.append(createElement('span', { className: 'tf__item-desc', part: 'item-description' }, ...highlight(textOf(item.description), q, 'tf__mark')));
      }
    }
    el.append(content);
    if (removable && !disabled) {
      // Nút ✕ chỉ cho chuột (không lồng control trong option); bàn phím dùng Delete — báo qua aria-keyshortcuts
      el.setAttribute('aria-keyshortcuts', 'Delete');
      el.append(createElement('span', {
        className: 'tf__remove', part: 'item-remove', 'aria-hidden': 'true',
        title: m('transfer.remove', { title: textOf(item.title) }), dataset: { remove: '' },
      }, svgIcon('close')));
    }
    return el;
  }

  /** Ô chọn tất cả + đếm "3/10 mục" (tính trên các mục đang lọc, bỏ qua disabled) */
  _syncHeader(side) {
    const ui = this._ui[side];
    const total = this._sideItems(side).length;
    const checked = this._checked[side].size;
    const pool = this._views[side].filter((it) => !it.disabled);
    const n = pool.filter((it) => this._checked[side].has(String(it.key))).length;
    const state = !pool.length || n === 0 ? 'false' : n === pool.length ? 'true' : 'mixed';
    ui.all.setAttribute('aria-checked', state);
    ui.all.toggleAttribute('aria-disabled', !pool.length || this.isDisabled);
    ui.all.hidden = this.oneWay && side === 'target';
    ui.box.className = ['tf__checkbox', state === 'true' && 'tf__checkbox--checked', state === 'mixed' && 'tf__checkbox--half'].filter(Boolean).join(' ');
    ui.box.setAttribute('part', ['checkbox', state === 'true' && 'checkbox-checked', state === 'mixed' && 'checkbox-indeterminate'].filter(Boolean).join(' '));
    ui.box.replaceChildren(svgIcon(state === 'mixed' ? 'minus' : 'check', 'tf__check'));
    ui.count.textContent = checked ? m('transfer.count', { checked, total }) : m('transfer.total', { total });
  }

  _syncButtons() {
    this._toRight.disabled = this.isDisabled || this._checked.source.size === 0;
    this._toLeft.disabled = this.isDisabled || this._checked.target.size === 0;
  }

  _syncActive(side, scroll) {
    const ui = this._ui[side];
    const key = this._active[side];
    let activeEl = null;
    for (const el of ui.items.children) {
      const on = key != null && el.dataset.key === key;
      el.classList.toggle('tf__item--active', on);
      if (on) {
        el.part.add('item-active');
        activeEl = el;
      } else {
        el.part.remove('item-active');
      }
    }
    if (activeEl) ui.body.setAttribute('aria-activedescendant', activeEl.id);
    else ui.body.removeAttribute('aria-activedescendant');
    if (scroll && key != null) this._scrollTo(side, key);
  }

  _scrollTo(side, key) {
    const ui = this._ui[side];
    const items = this._pageItems(side);
    const i = items.findIndex((it) => String(it.key) === key);
    if (i < 0) return;
    const body = ui.body;
    let top;
    let h;
    if (this._vw[side]) {
      h = this._vw[side].itemSize;
      top = i * h;
    } else {
      const el = ui.items.children[i];
      if (!el) return;
      top = el.offsetTop;
      h = el.offsetHeight;
    }
    if (top < body.scrollTop) body.scrollTop = top;
    else if (top + h > body.scrollTop + body.clientHeight) body.scrollTop = top + h - body.clientHeight;
    if (this._vw[side]) {
      this._vw[side].update();
      this._syncActive(side, false);
    }
  }

  // =====================================================
  // HÀNH ĐỘNG
  // =====================================================

  /** Đổi tập check của 1 bên → ghi selectedKeys (nguồn sự thật) + phát hui-select-change */
  _setChecked(side, set) {
    this._checked[side] = set;
    this.selectedKeys = [...this._checked.source, ...this._checked.target].map((id) => this._items.get(id)?.key ?? id);
    this.emit('hui-select-change', {
      sourceSelectedKeys: [...this._checked.source].map((id) => this._items.get(id).key),
      targetSelectedKeys: [...this._checked.target].map((id) => this._items.get(id).key),
    });
  }

  _toggleKey(side, key) {
    const item = this._items.get(key);
    if (!item || item.disabled || this.isDisabled) return;
    const set = new Set(this._checked[side]);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    this._setChecked(side, set);
  }

  _toggleAll(side) {
    if (this.isDisabled) return;
    const pool = this._views[side].filter((it) => !it.disabled).map((it) => String(it.key));
    if (!pool.length) return;
    const set = new Set(this._checked[side]);
    const all = pool.every((k) => set.has(k));
    for (const k of pool) {
      if (all) set.delete(k);
      else set.add(k);
    }
    this._setChecked(side, set);
  }

  /** Chuyển các mục đang check (hoặc `keys`) sang bên kia */
  _move(direction, keys) {
    if (this.isDisabled) return;
    const from = direction === 'right' ? 'source' : 'target';
    const ids = keys ? keys.map(String) : [...this._checked[from]];
    const moving = ids.filter((id) => this._items.get(id) && !this._items.get(id).disabled);
    if (!moving.length) return;
    const current = this._targetKeys();
    let next;
    if (direction === 'right') {
      // Giữ thứ tự dataSource cho nhóm mới chuyển sang, nối vào cuối danh sách đích
      const order = new Map((this.dataSource || []).map((it, i) => [String(it.key), i]));
      moving.sort((a, b) => order.get(a) - order.get(b));
      next = [...current, ...moving.map((id) => this._items.get(id).key)];
    } else {
      const drop = new Set(moving);
      next = current.filter((k) => !drop.has(String(k)));
    }
    const moveKeys = moving.map((id) => this._items.get(id).key);
    const rest = new Set(this._checked[from]);
    for (const id of moving) rest.delete(id);
    this._flash = { side: direction === 'right' ? 'target' : 'source', keys: new Set(moving) };
    this.value = next;
    this._checked[from] = rest;
    this.selectedKeys = [...this._checked.source, ...this._checked.target].map((id) => this._items.get(id)?.key ?? id);
    this.markInteracted();
    const toTitle = this._titleOf(direction === 'right' ? 'target' : 'source');
    this._live.textContent = m('transfer.moved', { count: moving.length, title: toTitle });
    const detail = { value: [...next], targetKeys: [...next], direction, moveKeys };
    this.emit('change', detail);
    this.emit('hui-change', { targetKeys: [...next], direction, moveKeys });
    this.updateComplete.then(() => { this._flash = null; });
  }

  _goPage(side, delta) {
    const pages = this._pageCount(side);
    const next = Math.max(1, Math.min(pages, this._page[side] + delta));
    if (next === this._page[side]) return;
    this._page[side] = next;
    this._active[side] = null;
    this._renderList(side);
  }

  _onItemClick(side, e) {
    const el = e.target.closest('[role="option"]');
    if (!el || el.getAttribute('aria-disabled') === 'true') return;
    const key = el.dataset.key;
    this._active[side] = key;
    if (e.target.closest('[data-remove]')) {
      this._move('left', [key]);
      return;
    }
    if (this.oneWay && side === 'target') {
      this._syncActive(side, false);
      return;
    }
    // Shift + click: check cả đoạn từ mục neo
    if (e.shiftKey && this._anchor[side] != null) {
      this._checkRange(side, this._anchor[side], key);
    } else {
      this._anchor[side] = key;
      this._toggleKey(side, key);
    }
  }

  _checkRange(side, fromKey, toKey) {
    const items = this._pageItems(side);
    const a = items.findIndex((it) => String(it.key) === fromKey);
    const b = items.findIndex((it) => String(it.key) === toKey);
    if (a < 0 || b < 0) return;
    const set = new Set(this._checked[side]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (!items[i].disabled) set.add(String(items[i].key));
    this._setChecked(side, set);
  }

  // =====================================================
  // BÀN PHÍM (APG Listbox chọn nhiều)
  // =====================================================

  _onKeydown(side, e) {
    if (this.isDisabled) return;
    const items = this._pageItems(side);
    if (!items.length) return;
    const keys = items.map((it) => String(it.key));
    const i = keys.indexOf(this._active[side]);
    const go = (j, extend = false) => {
      e.preventDefault();
      const k = Math.max(0, Math.min(keys.length - 1, j));
      this._active[side] = keys[k];
      if (extend && !(this.oneWay && side === 'target')) {
        const item = items[k];
        if (!item.disabled && !this._checked[side].has(keys[k])) this._toggleKey(side, keys[k]);
      }
      this._syncActive(side, true);
    };
    const removable = this.oneWay && side === 'target';
    switch (e.key) {
      case 'ArrowDown': go(i < 0 ? 0 : i + 1, e.shiftKey); break;
      case 'ArrowUp': go(i < 0 ? 0 : i - 1, e.shiftKey); break;
      case 'Home': go(0); break;
      case 'End': go(keys.length - 1); break;
      case 'PageDown':
      case 'PageUp':
        if (this.pageSize > 0) {
          e.preventDefault();
          this._goPage(side, e.key === 'PageDown' ? 1 : -1);
          this._active[side] = this._pageItems(side)[0] ? String(this._pageItems(side)[0].key) : null;
          this._syncActive(side, true);
        }
        break;
      case ' ':
        e.preventDefault();
        if (i >= 0 && !removable) {
          this._anchor[side] = keys[i];
          this._toggleKey(side, keys[i]);
        }
        break;
      case 'Enter': {
        // Enter: chuyển các mục đang check (không có thì chuyển mục đang focus)
        e.preventDefault();
        const direction = side === 'source' ? 'right' : 'left';
        if (side === 'target' && this.oneWay && i < 0) break;
        if (this._checked[side].size && !removable) this._move(direction);
        else if (i >= 0) this._move(direction, [keys[i]]);
        break;
      }
      case 'Delete':
      case 'Backspace':
        if (removable && i >= 0) {
          e.preventDefault();
          this._move('left', [keys[i]]);
        }
        break;
      default:
        if ((e.key === 'a' || e.key === 'A') && (e.ctrlKey || e.metaKey) && !removable) {
          e.preventDefault();
          this._toggleAll(side);
        }
    }
  }
}

defineElement('hui-transfer', HuiTransfer);

export { HuiTransfer };
export default HuiTransfer;
