/**
 * HUI Cascader — Chọn theo nhiều cấp (Ant Cascader), vd Tỉnh/Thành → Quận/Huyện → Phường/Xã. Tham gia <form> native.
 * Menu nhiều cột ở top-layer; value = mảng đường dẫn ['hn', 'hn-bd', 'hn-bd-px'] (multiple: mảng các đường dẫn).
 * change-on-select, multiple (check cha – con, tag), show-search (tìm theo cả đường dẫn, không dấu, tô đậm),
 * tải động loadData(selectedOptions), expand-trigger click | hover. Màn hẹp: các cột xếp chồng, trượt qua lại.
 * Khóa nội bộ theo đường dẫn (value chỉ cần duy nhất trong cùng cấp) — xem buildIndex({ pathIds }).
 */

import styles from './hui-cascader.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { autoUpdate, computePosition, floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { openOverlay } from '../../utils/overlay.js';
import {
  buildIndex, conductCheck, toggleCheck, strategyKeys, isCheckable, matchRange, highlight, textOf, msg, svgIcon, PATH_SEP,
} from '../hui-tree/tree-utils.js';

const FALLBACK = {
  'cascader.placeholder': { vi: 'Vui lòng chọn', en: 'Please select' },
  'cascader.notFound': { vi: 'Không tìm thấy', en: 'Not found' },
  'cascader.level': { vi: 'Cấp {level}', en: 'Level {level}' },
  'cascader.back': { vi: 'Quay lại', en: 'Back' },
};
const m = (key, vars) => msg(key, vars, FALLBACK);

/** Tối đa số kết quả tìm kiếm hiển thị */
const SEARCH_LIMIT = 100;
/** Màn hình hẹp hơn mức này: cột xếp chồng (mỗi lần 1 cột) */
const STACK_QUERY = '(max-width: 575px)';

/**
 * Chọn giá trị theo nhiều cấp.
 * @fires change - Chọn xong / bỏ chọn / xóa. detail: { value, selectedOptions } (multiple: value = mảng đường dẫn, selectedOptions = mảng các mảng)
 * @fires clear - Bấm nút xóa
 * @csspart base - Khung ngoài (nhãn + ô)
 * @csspart label - Nhãn
 * @csspart trigger - Ô hiển thị (role=combobox)
 * @csspart value - Chữ "A / B / C" hoặc placeholder
 * @csspart tags - Vùng tag (multiple)
 * @csspart tag - Mỗi tag (+ tag-rest)
 * @csspart tag-remove - Nút ✕ trên tag
 * @csspart clear - Nút xóa
 * @csspart arrow - Mũi tên
 * @csspart dropdown - Popup
 * @csspart search - Ô tìm kiếm
 * @csspart menus - Vùng chứa các cột
 * @csspart menu - Mỗi cột (role=listbox)
 * @csspart menu-header - Thanh "quay lại" khi cột xếp chồng (màn hẹp)
 * @csspart option - Mỗi mục (+ option-active / option-expanded / option-selected / option-disabled)
 * @csspart option-label - Chữ của mục
 * @csspart checkbox - Ô check (multiple) (+ checkbox-checked / checkbox-indeterminate)
 * @csspart expand-icon - Mũi tên ›
 * @csspart loading - Vòng xoay khi đang tải con
 * @csspart results - Danh sách kết quả tìm kiếm
 * @csspart highlight - Phần chữ khớp
 * @csspart empty - "Không tìm thấy"
 * @cssprop --hui-cascader-height - Chiều cao (tối thiểu) ô
 * @cssprop --hui-cascader-radius - Bo góc ô
 * @cssprop --hui-cascader-bg - Nền ô
 * @cssprop --hui-cascader-color - Màu chữ
 * @cssprop --hui-cascader-border-color - Viền
 * @cssprop --hui-cascader-hover-border-color - Viền khi hover
 * @cssprop --hui-cascader-focus-border-color - Viền khi mở / focus
 * @cssprop --hui-cascader-focus-shadow - Vòng sáng khi mở
 * @cssprop --hui-cascader-placeholder-color - Màu placeholder
 * @cssprop --hui-cascader-dropdown-bg - Nền popup
 * @cssprop --hui-cascader-dropdown-radius - Bo góc popup
 * @cssprop --hui-cascader-dropdown-shadow - Đổ bóng popup
 * @cssprop --hui-cascader-menu-width - Độ rộng tối thiểu mỗi cột
 * @cssprop --hui-cascader-menu-height - Chiều cao mỗi cột
 * @cssprop --hui-cascader-option-padding - Đệm mỗi mục
 * @cssprop --hui-cascader-option-hover-bg - Nền mục hover / đang focus
 * @cssprop --hui-cascader-option-active-bg - Nền mục đang mở / đã chọn
 * @cssprop --hui-cascader-option-active-color - Màu chữ mục đã chọn
 * @cssprop --hui-cascader-tag-bg - Nền tag
 * @cssprop --hui-cascader-highlight-color - Màu chữ phần khớp tìm kiếm
 */
class HuiCascader extends HuiFormElement {
  static properties = {
    /** Đường dẫn đang chọn ['hn','hn-bd']; multiple: mảng đường dẫn. Attribute nhận JSON hoặc chuỗi nối bằng value-separator */
    value: { type: String, default: null, reflect: false },
    /** [{ value, label, children, isLeaf, disabled }] — nên gán bằng property */
    options: { type: Array, default: [] },
    /** Chọn nhiều (ô check, cha – con liên kết, tag) */
    multiple: { type: Boolean },
    /** Chọn được cả mục cha (không bắt buộc đi tới lá) */
    changeOnSelect: { type: Boolean },
    /** Ô tìm kiếm theo cả đường dẫn (không dấu) */
    showSearch: { type: Boolean },
    /** click | hover — cách mở cột con */
    expandTrigger: { type: String, default: 'click' },
    /** multiple: parent | child — giá trị gồm cha cao nhất đã check đủ / chỉ các lá */
    showChecked: { type: String, default: 'parent' },
    /** Chữ khi chưa chọn (mặc định "Vui lòng chọn") */
    placeholder: { type: String, default: '' },
    /** Nhãn của ô */
    label: { type: String, default: '' },
    /** Hiện nút ✕ khi đã chọn */
    clearable: { type: Boolean },
    /** Chuỗi nối nhãn khi hiển thị */
    separator: { type: String, default: ' / ' },
    /** Gửi form dạng chuỗi nối bằng ký tự này (vd "/"); bỏ trống = JSON '["hn","hn-bd"]' */
    valueSeparator: { type: String, default: '' },
    /** multiple: số tag tối đa, còn lại gộp "+N" */
    maxTagCount: { type: Number },
    /** Tắt hiệu ứng */
    noAnimation: { type: Boolean },
    /** async (selectedOptions) => children[] | void — tải con của mục cuối trong đường dẫn */
    loadData: { type: Object, attribute: false },
    /** (labels, selectedOptions) => string — tự hiển thị giá trị (mặc định labels.join(separator)) */
    displayRender: { type: Object, attribute: false },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._index = buildIndex([], { pathIds: true });
    /** Chuỗi id đang mở (mỗi id mở 1 cột con) */
    this._path = [];
    /** Mục đang focus bằng bàn phím: { col, id } */
    this._focus = null;
    this._viewCol = 0;
    this._loading = new Set();
    this._loaded = new Set();
    this._results = [];
    this._query = '';
    this._uids = new Map();
    this._isOpen = false;
    this._overlay = null;
    this._stopAutoUpdate = null;
    this._popupToken = 0;
    this._side = 'bottom';
    this._stacked = false;
  }

  get _loader() { return typeof this.loadData === 'function' ? this.loadData : null; }
  get _renderFn() { return typeof this.displayRender === 'function' ? this.displayRender : null; }

  // =====================================================
  // GIÁ TRỊ
  // =====================================================

  _parse(v) {
    if (Array.isArray(v)) return v;
    if (v === null || v === undefined || v === '') return [];
    if (typeof v === 'string') {
      const s = v.trim();
      if (s.startsWith('[')) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed;
        } catch { /* chuỗi nối */ }
      }
      return s.split(this.valueSeparator || /[/,]/).map((x) => x.trim()).filter(Boolean);
    }
    return [v];
  }

  /** Đường dẫn đang chọn (single) */
  _single() {
    const v = this._parse(this.value);
    return Array.isArray(v[0]) ? v[0] : v;
  }

  /** Các đường dẫn đang chọn (multiple) */
  _multi() {
    const v = this._parse(this.value);
    if (!v.length) return [];
    return Array.isArray(v[0]) ? v : [v];
  }

  _idOf(path) { return path.map(String).join(PATH_SEP); }

  _pathOf(id) {
    const out = [];
    for (let e = this._index.map.get(id); e; e = e.parent) out.unshift(e.node.value);
    return out.length ? out : String(id).split(PATH_SEP);
  }

  _nodesOf(path) {
    const nodes = [];
    for (let i = 1; i <= path.length; i++) {
      const e = this._index.map.get(this._idOf(path.slice(0, i)));
      if (!e) break;
      nodes.push(e.node);
    }
    return nodes;
  }

  _labelsOf(path) {
    return path.map((v, i) => {
      const e = this._index.map.get(this._idOf(path.slice(0, i + 1)));
      return e ? textOf(e.node.label) : String(v);
    });
  }

  _display(path) {
    const labels = this._labelsOf(path);
    return this._renderFn ? String(this._renderFn(labels, this._nodesOf(path)) ?? '') : labels.join(this.separator);
  }

  /** Tập id đã check (đầy đủ) từ value (multiple) */
  _checkState() {
    return conductCheck(this._index, this._multi().map((p) => this._idOf(p)));
  }

  formValue() {
    if (this._isEmpty()) return null;
    const enc = (p) => (this.valueSeparator ? p.join(this.valueSeparator) : JSON.stringify(p));
    if (this.multiple) {
      if (!this.name) return null;
      const fd = new FormData();
      for (const p of this._multi()) fd.append(this.name, enc(p));
      return fd;
    }
    return enc(this._single());
  }

  _isEmpty() {
    return this.multiple ? this._multi().length === 0 : this._single().length === 0;
  }

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() { return this._trigger; }

  formResetCallback() {
    super.formResetCallback();
    this.value = this.multiple ? this._multi() : this._single();
  }

  formStateRestoreCallback(state) {
    if (this.multiple && state instanceof FormData) this.value = state.getAll(this.name).map((s) => this._parse(s));
    else if (typeof state === 'string') this.value = this._parse(state);
  }

  focus(options) {
    if (this._trigger) this._trigger.focus(options);
    else super.focus(options);
  }

  blur() { this._trigger?.blur(); }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._label = createElement('span', { className: 'cas__label', part: 'label', id: 'label', hidden: true });
    this._label.addEventListener('click', () => this.focus());
    this._valueEl = createElement('span', { className: 'cas__value', part: 'value' });
    this._tags = createElement('span', { className: 'cas__tags', part: 'tags', hidden: true });
    this._tags.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove]');
      if (!btn) return;
      e.stopPropagation();
      this._toggleCheck(this._idOf(this._multi()[Number(btn.dataset.remove)]), false);
    });
    this._clearBtn = createElement('button', { className: 'cas__clear', part: 'clear', type: 'button', tabindex: '-1' }, '✕');
    this._clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._clear();
    });
    this._arrow = createElement('span', { className: 'cas__arrow', part: 'arrow', 'aria-hidden': 'true' }, '▼');
    this._trigger = createElement('div', {
      className: 'cas__trigger', part: 'trigger', role: 'combobox', tabindex: '0',
      'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': 'menus',
    }, this._valueEl, this._tags, this._clearBtn, this._arrow);
    this._trigger.addEventListener('click', () => (this._isOpen ? this._close() : this._open()));
    this._trigger.addEventListener('keydown', (e) => this._onKeydown(e, false));
    this._trigger.addEventListener('blur', () => { if (!this._isOpen) this.markInteracted(); });

    this._search = createElement('input', { className: 'cas__search', part: 'search', type: 'text', autocomplete: 'off', 'aria-autocomplete': 'list' });
    this._search.addEventListener('input', (e) => {
      e.stopPropagation();
      this._onSearch(this._search.value);
    });
    this._search.addEventListener('change', (e) => e.stopPropagation());
    this._search.addEventListener('keydown', (e) => this._onKeydown(e, true));
    this._searchWrap = createElement('div', { className: 'cas__search-wrap' }, this._search);

    this._menus = createElement('div', { className: 'cas__menus', part: 'menus', id: 'menus' });
    this._results = [];
    this._resultsEl = createElement('div', { className: 'cas__results', part: 'results', role: 'listbox', id: 'results', hidden: true });
    this._empty = createElement('div', { className: 'cas__empty', part: 'empty', hidden: true });
    for (const box of [this._menus, this._resultsEl]) {
      box.addEventListener('mousedown', (e) => e.preventDefault()); // giữ focus ở trigger / ô tìm kiếm
      box.addEventListener('click', (e) => this._onMenuClick(e));
    }
    this._menus.addEventListener('mouseover', (e) => this._onMenuHover(e));

    this._dropdown = createElement('div', { className: 'hui-floating cas__dropdown', part: 'dropdown', hidden: true },
      this._searchWrap, this._menus, this._resultsEl, this._empty);
    this._wrapper = createElement('div', { className: 'cas', part: 'base' }, this._label, this._trigger, this._dropdown);
    return this._wrapper;
  }

  updated(changed) {
    const localeChanged = changed.has('locale');
    if (changed.has('options')) this._reindex();
    if (changed.has('multiple')) {
      // multiple: luôn là mảng đường dẫn
      if (this.multiple && this.value != null && !Array.isArray(this._parse(this.value)[0])) this.value = this._multi();
    }
    if (['value', 'options', 'placeholder', 'separator', 'multiple', 'maxTagCount', 'disabled', 'readonly', 'displayRender'].some((k) => changed.has(k)) || localeChanged) {
      this._syncDisplay();
      if (this._isOpen) this._renderMenus();
    }
    if (changed.has('label')) {
      this._label.textContent = this.label;
      this._label.hidden = !this.label;
      if (this.label) this._trigger.setAttribute('aria-labelledby', 'label');
      else this._trigger.removeAttribute('aria-labelledby');
    }
    // Không có nhãn → đặt tên cho combobox bằng placeholder (trình đọc màn hình)
    if (changed.has('label') || changed.has('placeholder') || localeChanged) {
      if (this.label) this._trigger.removeAttribute('aria-label');
      else this._trigger.setAttribute('aria-label', this.placeholder || m('cascader.placeholder'));
    }
    if (changed.has('required')) {
      this._trigger.toggleAttribute('aria-required', this.required);
      this._label.classList.toggle('cas__label--required', this.required);
    }
    if (changed.has('disabled')) {
      this._trigger.tabIndex = this.isDisabled ? -1 : 0;
      this._trigger.toggleAttribute('aria-disabled', this.isDisabled);
      if (this.isDisabled) this._close();
    }
    if (changed.has('showSearch')) this._searchWrap.hidden = !this.showSearch;
    if (localeChanged) {
      const search = t('common.search');
      this._search.placeholder = `${search}...`;
      this._search.setAttribute('aria-label', search);
      this._clearBtn.setAttribute('aria-label', t('common.clear'));
      this._empty.textContent = m('cascader.notFound');
    }
    if (changed.has('name')) this._syncForm();
    this._syncClasses();
    super.updated(changed);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._isOpen) {
      this._isOpen = false;
      this._overlay?.close();
      this._overlay = null;
    }
    this._stopAutoUpdate?.();
    this._stopAutoUpdate = null;
    hideFloating(this._dropdown);
  }

  _reindex() {
    this._index = buildIndex(this.options, { key: (n) => n.value, pathIds: true });
  }

  // =====================================================
  // HIỂN THỊ Ô
  // =====================================================

  _syncDisplay() {
    const empty = this._isEmpty();
    const placeholder = this.placeholder || m('cascader.placeholder');
    if (this.multiple) {
      const paths = this._multi();
      const max = this.maxTagCount != null && this.maxTagCount >= 0 ? this.maxTagCount : paths.length;
      const removable = !this.isDisabled && !this.readonly;
      const clear = t('common.clear');
      const tags = paths.slice(0, max).map((p, i) => {
        const text = this._display(p);
        const tag = createElement('span', { className: 'cas__tag', part: 'tag', title: text },
          createElement('span', { className: 'cas__tag-label' }, text));
        if (removable) {
          tag.append(createElement('button', {
            className: 'cas__tag-remove', part: 'tag-remove', type: 'button', tabindex: '-1',
            'aria-label': `${clear} ${text}`, dataset: { remove: String(i) },
          }, '✕'));
        }
        return tag;
      });
      const rest = paths.slice(max);
      if (rest.length) {
        tags.push(createElement('span', { className: 'cas__tag cas__tag--rest', part: 'tag tag-rest', title: rest.map((p) => this._display(p)).join(', ') }, `+${rest.length}`));
      }
      this._tags.replaceChildren(...tags);
      this._tags.hidden = !paths.length;
      this._valueEl.hidden = !empty;
      this._valueEl.textContent = placeholder;
      this._valueEl.classList.add('cas__value--placeholder');
      return;
    }
    this._tags.hidden = true;
    this._valueEl.hidden = false;
    this._valueEl.textContent = empty ? placeholder : this._display(this._single());
    this._valueEl.classList.toggle('cas__value--placeholder', empty);
  }

  _syncClasses() {
    const empty = this._isEmpty();
    const tone = this.status === 'error' ? 'error' : this.status === 'warning' ? 'warning' : '';
    this._wrapper.className = ['cas', `cas--${this.effectiveSize}`, this.multiple && 'cas--multiple', this._isOpen && 'cas--open',
      tone && `cas--${tone}`, this.isDisabled && 'cas--disabled'].filter(Boolean).join(' ');
    this._dropdown.classList.toggle('cas__dropdown--stacked', this._stacked);
    this._clearBtn.hidden = !this.clearable || empty || this.isDisabled || this.readonly;
    this._trigger.setAttribute('aria-expanded', String(this._isOpen));
    this.setState('open', this._isOpen);
  }

  // =====================================================
  // CỘT MENU
  // =====================================================

  _isLeaf(e) {
    const n = e.node;
    if (n.isLeaf === true) return true;
    if (e.children.length) return false;
    return Array.isArray(n.children) || !this._loader || this._loaded.has(e.id);
  }

  _needsLoad(e) {
    return Boolean(this._loader) && !this._isLeaf(e) && !e.children.length && !this._loaded.has(e.id);
  }

  /** Các cột: cột 0 = gốc, cột i+1 = con của _path[i] (nếu đã có con) */
  _columns() {
    const cols = [this._index.roots];
    for (const id of this._path) {
      const e = this._index.map.get(id);
      if (!e || !e.children.length) break;
      cols.push(e.children);
    }
    return cols;
  }

  _domId(id) {
    if (!this._uids.has(id)) this._uids.set(id, this._uids.size + 1);
    return `opt-${this._uids.get(id)}`;
  }

  _renderMenus() {
    const searching = this.showSearch && this._query.trim() !== '';
    this._menus.hidden = searching;
    this._resultsEl.hidden = !searching;
    if (searching) {
      this._renderResults();
      return;
    }
    const cols = this._columns();
    const selectedIds = new Set();
    if (!this.multiple) {
      const p = this._single();
      for (let i = 1; i <= p.length; i++) selectedIds.add(this._idOf(p.slice(0, i)));
    }
    const state = this.multiple ? this._checkState() : null;
    const els = cols.map((entries, col) => {
      const menu = createElement('ul', {
        className: 'cas__menu', part: 'menu', role: 'listbox', id: `menu-${col}`,
        'aria-label': col === 0 ? (this.label || m('cascader.level', { level: 1 })) : textOf(this._index.map.get(this._path[col - 1])?.node.label),
        dataset: { col: String(col) },
      });
      if (this.multiple) menu.setAttribute('aria-multiselectable', 'true');
      for (const e of entries) menu.append(this._createOption(e, col, selectedIds, state));
      return menu;
    });
    // Màn hẹp: chỉ hiện 1 cột (_viewCol) + thanh quay lại
    this._viewCol = Math.min(this._viewCol, cols.length - 1);
    if (this._stacked) {
      els.forEach((el, i) => { el.hidden = i !== this._viewCol; });
      if (this._viewCol > 0) {
        const parent = this._index.map.get(this._path[this._viewCol - 1]);
        const back = createElement('button', { className: 'cas__back', type: 'button', 'aria-label': m('cascader.back'), dataset: { back: '' } },
          svgIcon('chevron-left', 'cas__back-icon'), createElement('span', {}, textOf(parent?.node.label)));
        els.unshift(createElement('div', { className: 'cas__menu-header', part: 'menu-header' }, back));
      }
    }
    this._menus.replaceChildren(...els);
    this._empty.hidden = this._index.roots.length > 0;
    this._syncFocus();
  }

  _createOption(e, col, selectedIds, state) {
    const n = e.node;
    const leaf = this._isLeaf(e);
    const disabled = Boolean(n.disabled);
    const expanded = this._path[col] === e.id;
    const loading = this._loading.has(e.id);
    const selected = selectedIds.has(e.id);
    const el = createElement('li', {
      className: ['cas__option', expanded && 'cas__option--expanded', selected && 'cas__option--selected', disabled && 'cas__option--disabled'].filter(Boolean).join(' '),
      part: ['option', expanded && 'option-expanded', selected && 'option-selected', disabled && 'option-disabled'].filter(Boolean).join(' '),
      role: 'option', id: this._domId(e.id), dataset: { id: e.id, col: String(col) },
    });
    if (state) {
      const checked = state.checked.has(e.id);
      const half = !checked && state.half.has(e.id);
      el.setAttribute('aria-checked', half ? 'mixed' : String(checked));
      el.setAttribute('aria-selected', String(checked));
      el.append(createElement('span', {
        className: ['cas__checkbox', checked && 'cas__checkbox--checked', half && 'cas__checkbox--half'].filter(Boolean).join(' '),
        part: ['checkbox', checked && 'checkbox-checked', half && 'checkbox-indeterminate'].filter(Boolean).join(' '),
        'aria-hidden': 'true', dataset: { checkbox: '' },
      }, svgIcon(half ? 'minus' : 'check', 'cas__check')));
    } else {
      el.setAttribute('aria-selected', String(selected));
    }
    if (disabled) el.setAttribute('aria-disabled', 'true');
    if (loading) el.setAttribute('aria-busy', 'true');
    el.append(createElement('span', { className: 'cas__option-label', part: 'option-label' }, textOf(n.label)));
    if (loading) el.append(createElement('span', { className: 'cas__spinner', part: 'loading', 'aria-hidden': 'true' }));
    else if (!leaf) el.append(createElement('span', { className: 'cas__expand', part: 'expand-icon', 'aria-hidden': 'true' }, svgIcon('chevron-right')));
    return el;
  }

  /** Danh sách đường dẫn khớp tìm kiếm: so khớp trên TỪNG nhãn của đường dẫn */
  _findPaths() {
    const q = this._query;
    const out = [];
    const walk = (entries, trail) => {
      for (const e of entries) {
        if (out.length >= SEARCH_LIMIT) return;
        if (e.node.disabled) continue;
        const path = [...trail, e];
        const leaf = !e.children.length;
        if ((leaf && this._isLeaf(e)) || this.changeOnSelect || (this.multiple && leaf)) {
          if (path.some((p) => matchRange(textOf(p.node.label), q))) out.push(path);
        }
        if (e.children.length) walk(e.children, path);
      }
    };
    walk(this._index.roots, []);
    return out;
  }

  _renderResults() {
    const state = this.multiple ? this._checkState() : null;
    const current = this.multiple ? null : this._idOf(this._single());
    this._results = this._findPaths();
    const els = this._results.map((path, i) => {
      const last = path[path.length - 1];
      const el = createElement('div', {
        className: 'cas__option cas__result', part: 'option', role: 'option',
        id: `result-${i}`, dataset: { id: last.id, result: String(i) },
      });
      if (state) {
        const checked = state.checked.has(last.id);
        el.setAttribute('aria-checked', String(checked));
        el.setAttribute('aria-selected', String(checked));
        el.append(createElement('span', {
          className: ['cas__checkbox', checked && 'cas__checkbox--checked'].filter(Boolean).join(' '),
          part: ['checkbox', checked && 'checkbox-checked'].filter(Boolean).join(' '), 'aria-hidden': 'true',
        }, svgIcon('check', 'cas__check')));
      } else {
        el.setAttribute('aria-selected', String(last.id === current));
        if (last.id === current) {
          el.classList.add('cas__option--selected');
          el.part.add('option-selected');
        }
      }
      const label = createElement('span', { className: 'cas__option-label', part: 'option-label' });
      path.forEach((p, k) => {
        if (k) label.append(document.createTextNode(this.separator));
        label.append(...highlight(textOf(p.node.label), this._query, 'cas__mark'));
      });
      el.append(label);
      return el;
    });
    this._resultsEl.replaceChildren(...els);
    this._empty.hidden = els.length > 0;
    if (this._focus?.result == null || this._focus.result >= els.length) this._focus = els.length ? { result: 0 } : null;
    this._syncFocus();
  }

  /** Đánh dấu mục đang focus + aria-activedescendant trên trigger / ô tìm kiếm */
  _syncFocus(scroll = false) {
    const root = this.shadowRoot;
    root.querySelectorAll('.cas__option--active').forEach((el) => {
      el.classList.remove('cas__option--active');
      el.part.remove('option-active');
    });
    let el = null;
    if (this._focus?.result != null) el = this._resultsEl.querySelector(`[data-result="${this._focus.result}"]`);
    else if (this._focus) el = this._menus.querySelector(`#${this._domId(this._focus.id)}`);
    if (el && !el.closest('[hidden]')) {
      el.classList.add('cas__option--active');
      el.part.add('option-active');
      for (const host of [this._trigger, this._search]) host.setAttribute('aria-activedescendant', el.id);
      if (scroll) {
        const list = el.parentElement;
        if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
      }
    } else {
      for (const host of [this._trigger, this._search]) host.removeAttribute('aria-activedescendant');
    }
  }

  // =====================================================
  // HÀNH ĐỘNG
  // =====================================================

  /** Mở cột con của mục `id` ở cột `col` (tải trước nếu cần) */
  async _expand(id, col, { focusChild = false } = {}) {
    let e = this._index.map.get(id);
    if (!e || e.node.disabled) return;
    const prevLen = this._columns().length;
    this._path = [...this._path.slice(0, col), id];
    this._focus = { col, id };
    if (this._needsLoad(e)) {
      const ok = await this._load(e);
      if (!ok || !this._isOpen || this._path[col] !== id) return;
      e = this._index.map.get(id);
    }
    if (e.children.length) {
      if (this._stacked) this._viewCol = col + 1;
      if (focusChild) this._focus = { col: col + 1, id: e.children.find((c) => !c.node.disabled)?.id ?? e.children[0].id };
    }
    this._renderMenus();
    this._syncFocus(true);
    const cols = this._columns().length;
    if (cols > prevLen && !this._noAnim) {
      const last = this._menus.querySelector(`[data-col="${cols - 1}"]`);
      last?.animate?.([{ opacity: 0, transform: `translateX(${this._stacked ? 24 : -8}px)` }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'ease-out' });
    }
  }

  get _noAnim() { return this.noAnimation || animationsDisabled(); }

  async _load(e) {
    const id = e.id;
    if (this._loading.has(id)) return false;
    this._loading.add(id);
    if (this._isOpen) this._renderMenus(); // vòng xoay trên mục đang tải
    const selectedOptions = [];
    for (let x = e; x; x = x.parent) selectedOptions.unshift(x.node);
    let ok = false;
    try {
      const res = await this._loader(selectedOptions);
      if (Array.isArray(res)) e.node.children = res;
      ok = true;
    } catch (err) {
      console.error('[hui-cascader] loadData error:', err);
    }
    this._loading.delete(id);
    if (ok) this._loaded.add(id);
    this._reindex();
    this._syncDisplay();
    if (this._isOpen) this._renderMenus();
    return ok;
  }

  /** Chọn mục (single): lá → chốt + đóng; cha + change-on-select → chốt, vẫn mở */
  _choose(id) {
    const e = this._index.map.get(id);
    if (!e || e.node.disabled) return;
    const path = this._pathOf(id);
    const leaf = this._isLeaf(e);
    if (this.multiple) {
      if (isCheckable(e)) this._toggleCheck(id);
      return;
    }
    if (!leaf && !this.changeOnSelect) return;
    const same = this._idOf(this._single()) === id;
    this.value = path;
    if (leaf) this._close(true);
    else this._renderMenus();
    if (!same) this.emit('change', { value: path, selectedOptions: this._nodesOf(path) });
  }

  _toggleCheck(id, on) {
    const e = this._index.map.get(id);
    if (!e || !isCheckable(e)) return;
    const { checked } = this._checkState();
    const next = toggleCheck(this._index, checked, id, on ?? !checked.has(id)).checked;
    const ids = strategyKeys(this._index, next, this.showChecked === 'child' ? 'child' : 'parent');
    this.value = ids.map((x) => this._pathOf(x));
    this.markInteracted();
    if (this._isOpen) this._renderMenus();
    const value = this._multi();
    this.emit('change', { value, selectedOptions: value.map((p) => this._nodesOf(p)) });
  }

  _clear() {
    if (this.isDisabled || this.readonly) return;
    this.markInteracted();
    this.value = this.multiple ? [] : null;
    this.emit('change', { value: this.multiple ? [] : null, selectedOptions: [] });
    this.emit('clear');
  }

  _onMenuClick(e) {
    if (e.target.closest('[data-back]')) {
      this._viewCol = Math.max(0, this._viewCol - 1);
      const id = this._path[this._viewCol];
      if (id) this._focus = { col: this._viewCol, id };
      this._renderMenus();
      return;
    }
    const opt = e.target.closest('[role="option"]');
    if (!opt || opt.getAttribute('aria-disabled') === 'true') return;
    const id = opt.dataset.id;
    if (opt.dataset.result != null) {
      this._focus = { result: Number(opt.dataset.result) };
      this._chooseResult(Number(opt.dataset.result));
      return;
    }
    const col = Number(opt.dataset.col);
    const entry = this._index.map.get(id);
    if (this.multiple && e.target.closest('[data-checkbox]')) {
      this._focus = { col, id };
      this._toggleCheck(id);
      return;
    }
    if (!this._isLeaf(entry)) {
      this._expand(id, col);
      if (!this.multiple && this.changeOnSelect) this._choose(id);
    } else {
      this._focus = { col, id };
      this._path = this._path.slice(0, col);
      this._choose(id);
      if (this._isOpen) this._renderMenus();
    }
  }

  _onMenuHover(e) {
    if (this.expandTrigger !== 'hover' || this._stacked) return;
    const opt = e.target.closest('[role="option"]');
    if (!opt || opt.getAttribute('aria-disabled') === 'true') return;
    const id = opt.dataset.id;
    const col = Number(opt.dataset.col);
    const entry = this._index.map.get(id);
    if (entry && !this._isLeaf(entry) && this._path[col] !== id) this._expand(id, col);
  }

  _chooseResult(i) {
    const path = this._results[i];
    if (!path) return;
    const last = path[path.length - 1];
    if (this.multiple) {
      this._toggleCheck(last.id);
      return;
    }
    const value = this._pathOf(last.id);
    const same = this._idOf(this._single()) === last.id;
    this.value = value;
    this._close(true);
    if (!same) this.emit('change', { value, selectedOptions: this._nodesOf(value) });
  }

  _onSearch(q) {
    this._query = q;
    this._focus = null;
    this._renderMenus();
  }

  // =====================================================
  // ĐÓNG / MỞ
  // =====================================================

  _open() {
    if (this._isOpen || this.isDisabled || this.readonly) return;
    this._isOpen = true;
    this._stacked = typeof matchMedia === 'function' && matchMedia(STACK_QUERY).matches;
    this._query = '';
    this._search.value = '';
    // Mở sẵn theo giá trị đang chọn (single) / đường dẫn đầu tiên (multiple)
    const cur = this.multiple ? this._multi()[0] || [] : this._single();
    this._path = [];
    for (let i = 1; i < cur.length; i++) {
      const id = this._idOf(cur.slice(0, i));
      if (!this._index.map.has(id)) break;
      this._path.push(id);
    }
    const focusId = cur.length && this._index.map.has(this._idOf(cur)) ? this._idOf(cur) : this._index.roots[0]?.id;
    this._focus = focusId ? { col: cur.length && this._index.map.has(this._idOf(cur)) ? cur.length - 1 : 0, id: focusId } : null;
    this._viewCol = this._focus?.col ?? 0;
    this._renderMenus();
    this._syncClasses();

    ++this._popupToken;
    showFloating(this._dropdown);
    this._stopAutoUpdate ||= autoUpdate(this._trigger, this._dropdown, () => this._position());
    if (!this._noAnim) animateIn(this._dropdown, this._side === 'top' ? 'slide-up' : 'slide-down');
    this._overlay = openOverlay({
      element: this._dropdown,
      ignore: [this._trigger],
      restoreFocus: false,
      onEscape: () => this._close(true),
      onClickOutside: () => this._close(),
    });
    this._menus.querySelectorAll('.cas__menu').forEach((menu) => {
      const sel = menu.querySelector('.cas__option--expanded, .cas__option--selected');
      if (sel) menu.scrollTop = sel.offsetTop - menu.clientHeight / 2 + sel.offsetHeight / 2;
    });
    this._syncFocus();
    if (this.showSearch) this._search.focus({ preventScroll: true });
  }

  _close(focusTrigger = false) {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._overlay?.close();
    this._overlay = null;
    this._syncClasses();
    if (focusTrigger) this._trigger.focus();
    this.markInteracted();
    const token = ++this._popupToken;
    const done = () => {
      if (token !== this._popupToken) return;
      this._stopAutoUpdate?.();
      this._stopAutoUpdate = null;
      hideFloating(this._dropdown);
      this._dropdown.getAnimations?.().forEach((a) => a.cancel());
    };
    if (this._noAnim) done();
    else animateOut(this._dropdown, this._side === 'top' ? 'slide-up' : 'slide-down').then(done);
  }

  _position() {
    const pos = computePosition(this._trigger, this._dropdown, { placement: 'bottom-start', offset: 4, matchWidth: this._stacked ? 'width' : false });
    this._dropdown.style.left = `${pos.x}px`;
    this._dropdown.style.top = `${pos.y}px`;
    this._side = pos.side;
  }

  // =====================================================
  // BÀN PHÍM
  // =====================================================

  _colEntries(col) {
    return this._columns()[col] || [];
  }

  _step(list, from, dir) {
    for (let i = from + dir; i >= 0 && i < list.length; i += dir) if (!list[i].node.disabled) return i;
    return from;
  }

  _onKeydown(e, fromSearch) {
    if (this.isDisabled) return;
    const { key } = e;
    if (key === 'Backspace' && this.multiple && !this.readonly && (!fromSearch || this._search.value === '')) {
      const paths = this._multi();
      if (paths.length) {
        e.preventDefault();
        this._toggleCheck(this._idOf(paths[paths.length - 1]), false);
      }
      return;
    }
    if (!this._isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        e.preventDefault();
        this._open();
      }
      return;
    }
    if (key === 'Tab') {
      this._close();
      return;
    }

    // Chế độ tìm kiếm: danh sách phẳng
    if (!this._resultsEl.hidden) {
      const n = this._results.length;
      const i = this._focus?.result ?? -1;
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
        if (!n) return;
        this._focus = { result: Math.max(0, Math.min(n - 1, i + (key === 'ArrowDown' ? 1 : -1))) };
        this._syncFocus(true);
      } else if (key === 'Enter') {
        e.preventDefault();
        if (i >= 0) this._chooseResult(i);
      }
      return;
    }

    const f = this._focus || { col: 0, id: this._index.roots[0]?.id };
    const list = this._colEntries(f.col);
    const i = list.findIndex((x) => x.id === f.id);
    const cur = list[i];
    const move = (j) => {
      e.preventDefault();
      if (!list[j]) return;
      this._focus = { col: f.col, id: list[j].id };
      this._syncFocus(true);
    };
    switch (key) {
      case 'ArrowDown': move(i < 0 ? this._step(list, -1, 1) : this._step(list, i, 1)); break;
      case 'ArrowUp': move(i < 0 ? this._step(list, list.length, -1) : this._step(list, i, -1)); break;
      case 'Home': if (!fromSearch) move(this._step(list, -1, 1)); break;
      case 'End': if (!fromSearch) move(this._step(list, list.length, -1)); break;
      case 'ArrowRight':
        if (fromSearch && this._search.value) return;
        e.preventDefault();
        if (cur && !this._isLeaf(cur) && !cur.node.disabled) this._expand(cur.id, f.col, { focusChild: true });
        break;
      case 'ArrowLeft':
        if (fromSearch && this._search.value) return;
        e.preventDefault();
        if (f.col > 0) {
          this._focus = { col: f.col - 1, id: this._path[f.col - 1] };
          this._path = this._path.slice(0, f.col);
          this._viewCol = f.col - 1;
          this._renderMenus();
          this._syncFocus(true);
        }
        break;
      case ' ':
        if (fromSearch) return;
        e.preventDefault();
        if (!cur) break;
        if (this.multiple) this._toggleCheck(cur.id);
        else this._enter(cur, f.col);
        break;
      case 'Enter':
        e.preventDefault();
        if (cur) this._enter(cur, f.col);
        break;
      default:
    }
  }

  /** Enter: lá → chọn; cha → mở cột con (change-on-select: chọn luôn) */
  _enter(cur, col) {
    if (cur.node.disabled) return;
    if (this._isLeaf(cur)) {
      this._path = this._path.slice(0, col);
      this._choose(cur.id);
      if (this._isOpen) this._renderMenus();
      return;
    }
    this._expand(cur.id, col, { focusChild: true });
    if (!this.multiple && this.changeOnSelect) this._choose(cur.id);
  }
}

defineElement('hui-cascader', HuiCascader);

export { HuiCascader };
export default HuiCascader;
