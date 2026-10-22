/**
 * HUI TreeSelect — Ô chọn dạng cây (Ant TreeSelect), tham gia <form> native.
 * Trigger giống hui-select (chọn một / nhiều với tag "+N"), popup ở top-layer chứa <hui-tree>:
 * tree-checkable (giá trị theo show-checked all | parent | child), ô tìm kiếm lọc cây không dấu,
 * tải con bất đồng bộ (loadData chuyển thẳng cho cây). Bàn phím: Alt+↓ / Enter mở, focus vào cây, Esc đóng.
 */

import styles from './hui-tree-select.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { autoUpdate, computePosition, floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { openOverlay } from '../../utils/overlay.js';
import '../hui-tree/hui-tree.js';
import { buildIndex, conductCheck, toggleCheck, strategyKeys, textOf } from '../hui-tree/tree-utils.js';

const STRATEGIES = ['all', 'parent', 'child'];

/** Chuẩn hóa value → mảng (nhận mảng, JSON '["a"]', 'a,b' hoặc 1 giá trị) */
export function toValues(v) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined || v === '') return [];
  if (typeof v === 'string') {
    if (v.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* tách dấu phẩy */ }
    }
    return v.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [v];
}

/**
 * Ô chọn giá trị từ cây phân cấp.
 * @fires change - Chọn / bỏ chọn / xóa. detail: { value, label, node } (nhiều giá trị: mảng)
 * @fires clear - Bấm nút xóa
 * @csspart base - Khung ngoài (nhãn + ô)
 * @csspart label - Nhãn
 * @csspart trigger - Ô hiển thị giá trị (role=combobox)
 * @csspart value - Chữ giá trị / placeholder
 * @csspart tags - Vùng tag (multiple / tree-checkable)
 * @csspart tag - Mỗi tag (+ tag-rest cho "+N")
 * @csspart tag-remove - Nút ✕ trên tag
 * @csspart clear - Nút xóa
 * @csspart arrow - Mũi tên
 * @csspart loading - Vòng xoay khi loading
 * @csspart dropdown - Popup
 * @csspart search - Ô tìm kiếm trong popup
 * @csspart tree - Thẻ <hui-tree> trong popup (style tiếp bằng biến --hui-tree-*)
 * @cssprop --hui-tree-select-height - Chiều cao (tối thiểu) của ô
 * @cssprop --hui-tree-select-radius - Bo góc ô
 * @cssprop --hui-tree-select-bg - Nền ô
 * @cssprop --hui-tree-select-color - Màu chữ
 * @cssprop --hui-tree-select-border-color - Viền
 * @cssprop --hui-tree-select-hover-border-color - Viền khi hover
 * @cssprop --hui-tree-select-focus-border-color - Viền khi mở / focus
 * @cssprop --hui-tree-select-focus-shadow - Vòng sáng khi mở
 * @cssprop --hui-tree-select-placeholder-color - Màu placeholder
 * @cssprop --hui-tree-select-dropdown-bg - Nền popup
 * @cssprop --hui-tree-select-dropdown-radius - Bo góc popup
 * @cssprop --hui-tree-select-dropdown-shadow - Đổ bóng popup
 * @cssprop --hui-tree-select-dropdown-max-height - Chiều cao tối đa vùng cây (không virtual)
 * @cssprop --hui-tree-select-tag-bg - Nền tag
 * @cssprop --hui-tree-select-tag-color - Màu chữ tag
 */
class HuiTreeSelect extends HuiFormElement {
  static properties = {
    /** Khóa đang chọn (node.value ?? node.key); multiple / tree-checkable: mảng. Attribute nhận JSON hoặc 'a,b' */
    value: { type: String, default: null, reflect: false },
    /** Dữ liệu cây [{ value | key, title, children, isLeaf, disabled, disableCheckbox, selectable }] */
    data: { type: Array, default: [] },
    /** Chọn nhiều node (tag) */
    multiple: { type: Boolean },
    /** Hiện ô check (luôn nhiều giá trị, cha – con liên kết) */
    treeCheckable: { type: Boolean },
    /** all | parent | child — tree-checkable: giá trị gồm mọi node / chỉ node cha cao nhất đã check đủ / chỉ node lá */
    showChecked: { type: String, default: 'child' },
    /** tree-checkable: cha – con độc lập */
    treeCheckStrictly: { type: Boolean },
    /** Ô tìm kiếm lọc cây (không dấu) */
    showSearch: { type: Boolean },
    /** Hiện nút ✕ khi đã chọn */
    clearable: { type: Boolean },
    /** Chữ khi chưa chọn (mặc định "Chọn...") */
    placeholder: { type: String, default: '' },
    /** Nhãn của ô */
    label: { type: String, default: '' },
    /** Số tag tối đa hiển thị, phần còn lại gộp thành "+N" */
    maxTagCount: { type: Number },
    /** Đang tải: vòng xoay ở trigger */
    loading: { type: Boolean },
    /** Mở toàn bộ cây ở lần đầu */
    treeDefaultExpandAll: { type: Boolean },
    /** Đường nối trong cây */
    treeLine: { type: Boolean },
    /** Hiện icon node trong cây */
    treeIcon: { type: Boolean },
    /** Virtual scroll cho cây lớn (dùng list-height) */
    virtual: { type: Boolean },
    /** Chiều cao vùng cây khi virtual (px) */
    listHeight: { type: Number, default: 256 },
    /** Tắt hiệu ứng mở popup */
    noAnimation: { type: Boolean },
    /** async (node) => children[] | void — tải con, chuyển thẳng cho <hui-tree> */
    loadData: { type: Object, attribute: false },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._index = buildIndex([]);
    this._isOpen = false;
    this._overlay = null;
    this._stopAutoUpdate = null;
    this._popupToken = 0;
    this._side = 'bottom';
  }

  get _multi() { return this.multiple || this.treeCheckable; }

  get _strategy() { return STRATEGIES.includes(this.showChecked) ? this.showChecked : 'child'; }

  _values() { return toValues(this.value); }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._label = createElement('span', { className: 'ts__label', part: 'label', id: 'label', hidden: true });
    this._label.addEventListener('click', () => this.focus());

    this._valueEl = createElement('span', { className: 'ts__value', part: 'value' });
    this._tags = createElement('span', { className: 'ts__tags', part: 'tags', hidden: true });
    this._tags.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove]');
      if (!btn) return;
      e.stopPropagation();
      this._removeValue(this._values()[Number(btn.dataset.remove)]);
    });
    this._clearBtn = createElement('button', { className: 'ts__clear', part: 'clear', type: 'button', tabindex: '-1' }, '✕');
    this._clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._clear();
    });
    this._arrow = createElement('span', { className: 'ts__arrow', part: 'arrow', 'aria-hidden': 'true' }, '▼');
    this._spinner = createElement('span', { className: 'ts__spinner', part: 'loading', 'aria-hidden': 'true', hidden: true });

    this._trigger = createElement('div', {
      className: 'ts__trigger', part: 'trigger', role: 'combobox', tabindex: '0',
      'aria-haspopup': 'tree', 'aria-expanded': 'false', 'aria-controls': 'dropdown',
    }, this._valueEl, this._tags, this._clearBtn, this._spinner, this._arrow);
    this._trigger.addEventListener('click', () => (this._isOpen ? this._close() : this._open()));
    this._trigger.addEventListener('keydown', (e) => this._onTriggerKey(e));
    this._trigger.addEventListener('blur', () => { if (!this._isOpen) this.markInteracted(); });

    this._search = createElement('input', { className: 'ts__search', part: 'search', type: 'text', autocomplete: 'off' });
    this._search.addEventListener('input', (e) => {
      e.stopPropagation();
      this._tree.filterValue = this._search.value;
    });
    this._search.addEventListener('change', (e) => e.stopPropagation());
    this._search.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._tree.focus();
      } else if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        this._close(true);
      }
    });
    this._searchWrap = createElement('div', { className: 'ts__search-wrap' }, this._search);

    this._tree = createElement('hui-tree', { className: 'ts__tree', part: 'tree', 'block-node': '', 'filter-mode': 'hide' });
    // Sự kiện của cây bên trong không lọt ra ngoài; chọn / check do TreeSelect tự quyết
    for (const type of ['hui-expand', 'hui-load', 'hui-drop']) {
      this._tree.addEventListener(type, (e) => {
        e.stopPropagation();
        if (type === 'hui-load') this._reindex();
      });
    }
    this._tree.addEventListener('hui-select', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this._onTreeSelect(e.detail.node);
    });
    this._tree.addEventListener('hui-check', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this._applyChecked(new Set(e.detail.checkedKeys.map(String)), e.detail.node);
    });
    this._tree.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey && this.showSearch) this._search.focus();
        else this._close(true);
      }
    });

    this._dropdown = createElement('div', { className: 'hui-floating ts__dropdown', part: 'dropdown', id: 'dropdown', hidden: true },
      this._searchWrap, this._tree);

    this._wrapper = createElement('div', { className: 'ts', part: 'base' }, this._label, this._trigger, this._dropdown);
    return this._wrapper;
  }

  updated(changed) {
    if (this._multi && !Array.isArray(this.value)) this.value = this._values();
    const localeChanged = changed.has('locale');

    if (changed.has('loadData')) this._tree.loadData = this.loadData;
    if (changed.has('data')) {
      this._tree.data = this.data;
      this._reindex();
    }
    if (changed.has('treeCheckable') || changed.has('multiple')) {
      this._tree.checkable = this.treeCheckable;
      this._tree.selectable = this.treeCheckable ? 'false' : 'true';
      this._tree.multiple = this.multiple && !this.treeCheckable;
    }
    if (changed.has('treeCheckStrictly')) this._tree.checkStrictly = this.treeCheckStrictly;
    if (changed.has('treeLine')) this._tree.showLine = this.treeLine;
    if (changed.has('treeIcon')) this._tree.showIcon = this.treeIcon;
    if (changed.has('noAnimation')) this._tree.noAnimation = this.noAnimation;
    if (changed.has('treeDefaultExpandAll')) this._tree.defaultExpandAll = this.treeDefaultExpandAll;
    if (changed.has('virtual') || changed.has('listHeight')) {
      this._tree.virtual = this.virtual;
      this._tree.height = this.virtual ? this.listHeight : null;
    }
    if (changed.has('size')) this._tree.size = this.effectiveSize;
    if (['value', 'treeCheckable', 'multiple', 'treeCheckStrictly', 'data'].some((k) => changed.has(k))) this._syncTree();
    if (['value', 'data', 'placeholder', 'maxTagCount', 'disabled', 'readonly', 'treeCheckable', 'multiple', 'showChecked'].some((k) => changed.has(k)) || localeChanged) {
      this._syncDisplay();
    }
    if (changed.has('label')) {
      this._label.textContent = this.label;
      this._label.hidden = !this.label;
      if (this.label) {
        this._trigger.setAttribute('aria-labelledby', 'label');
        this._tree.label = this.label;
      } else {
        this._trigger.removeAttribute('aria-labelledby');
      }
    }
    if (changed.has('label') || changed.has('placeholder') || localeChanged) {
      if (this.label) this._trigger.removeAttribute('aria-label');
      else this._trigger.setAttribute('aria-label', this.placeholder || t('select.placeholder'));
    }
    if (changed.has('required')) {
      this._trigger.toggleAttribute('aria-required', this.required);
      this._label.classList.toggle('ts__label--required', this.required);
    }
    if (changed.has('disabled')) {
      this._trigger.tabIndex = this.isDisabled ? -1 : 0;
      this._trigger.toggleAttribute('aria-disabled', this.isDisabled);
      if (this.isDisabled) this._close();
    }
    if (changed.has('showSearch')) this._searchWrap.hidden = !this.showSearch;
    if (changed.has('loading')) {
      this._spinner.hidden = !this.loading;
      this._arrow.hidden = this.loading;
      this._trigger.toggleAttribute('aria-busy', this.loading);
    }
    if (localeChanged) {
      const search = t('common.search');
      this._search.placeholder = `${search}...`;
      this._search.setAttribute('aria-label', search);
      this._clearBtn.setAttribute('aria-label', t('common.clear'));
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

  focus(options) {
    if (this._trigger) this._trigger.focus(options);
    else super.focus(options);
  }

  blur() {
    this._trigger?.blur();
  }

  // =====================================================
  // FORM
  // =====================================================

  formValue() {
    if (this._isEmpty()) return null;
    if (this._multi) {
      if (!this.name) return null;
      const fd = new FormData();
      for (const v of this._values()) fd.append(this.name, String(v));
      return fd;
    }
    return String(this.value);
  }

  _isEmpty() {
    return this._multi ? this._values().length === 0 : super._isEmpty();
  }

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() {
    return this._trigger;
  }

  formResetCallback() {
    super.formResetCallback();
    if (this._multi) this.value = this._values();
    else if (this.value === '') this.value = null;
  }

  formStateRestoreCallback(state) {
    if (this._multi && state instanceof FormData) this.value = state.getAll(this.name);
    else super.formStateRestoreCallback(state);
  }

  // =====================================================
  // GIÁ TRỊ ↔ CÂY
  // =====================================================

  _reindex() {
    this._index = buildIndex(this.data);
    this._syncDisplay();
  }

  _syncTree() {
    const values = this._values();
    if (this.treeCheckable) {
      this._tree.checkedKeys = values;
      this._tree.selectedKeys = [];
    } else {
      this._tree.checkedKeys = [];
      this._tree.selectedKeys = this._multi ? values : this._isEmpty() ? [] : [this.value];
    }
  }

  _labelOf(v) {
    const e = this._index.map.get(String(v));
    return e ? textOf(e.node.title ?? e.node.label) : String(v);
  }

  _nodeOf(v) {
    return this._index.map.get(String(v))?.node ?? null;
  }

  _onTreeSelect(node) {
    const e = this._index.map.get(String(node.value ?? node.key));
    if (!e) return;
    const key = e.key;
    if (!this._multi) {
      const changed = String(this.value) !== String(key);
      this.value = key;
      this._close(true);
      if (changed) this.emit('change', { value: key, label: this._labelOf(key), node });
      return;
    }
    const values = this._values();
    const has = values.some((v) => String(v) === String(key));
    this.value = has ? values.filter((v) => String(v) !== String(key)) : [...values, key];
    this._emitMulti();
  }

  /** Tập đã check (đầy đủ) → giá trị theo show-checked */
  _applyChecked(checked) {
    this.value = this.treeCheckStrictly
      ? strategyKeys(this._index, checked, 'all')
      : strategyKeys(this._index, checked, this._strategy);
    this._emitMulti();
  }

  _emitMulti() {
    const value = [...this._values()];
    this.markInteracted();
    this.emit('change', { value, label: value.map((v) => this._labelOf(v)), node: value.map((v) => this._nodeOf(v)) });
  }

  _removeValue(v) {
    if (this.isDisabled || this.readonly || v === undefined) return;
    if (this.treeCheckable && !this.treeCheckStrictly) {
      const { checked } = conductCheck(this._index, this._values().map(String));
      const next = toggleCheck(this._index, checked, v, false).checked;
      this._applyChecked(next);
      return;
    }
    this.value = this._values().filter((x) => String(x) !== String(v));
    this._emitMulti();
  }

  _clear() {
    if (this.isDisabled || this.readonly) return;
    this.markInteracted();
    if (this._multi) {
      this.value = [];
      this.emit('change', { value: [], label: [], node: [] });
    } else {
      this.value = null;
      this.emit('change', { value: null, label: '', node: null });
    }
    this.emit('clear');
  }

  // =====================================================
  // HIỂN THỊ
  // =====================================================

  _syncDisplay() {
    if (!this._valueEl) return;
    const empty = this._isEmpty();
    const placeholder = this.placeholder || t('select.placeholder');
    if (this._multi) {
      this._renderTags();
      this._valueEl.hidden = !empty;
      this._valueEl.textContent = placeholder;
      this._valueEl.classList.add('ts__value--placeholder');
    } else {
      this._tags.hidden = true;
      this._valueEl.hidden = false;
      this._valueEl.textContent = empty ? placeholder : this._labelOf(this.value);
      this._valueEl.classList.toggle('ts__value--placeholder', empty);
    }
  }

  _renderTags() {
    const values = this._values();
    const max = this.maxTagCount != null && this.maxTagCount >= 0 ? this.maxTagCount : values.length;
    const removable = !this.isDisabled && !this.readonly;
    const clear = t('common.clear');
    const tags = values.slice(0, max).map((v, i) => {
      const text = this._labelOf(v);
      const tag = createElement('span', { className: 'ts__tag', part: 'tag', title: text },
        createElement('span', { className: 'ts__tag-label' }, text));
      if (removable) {
        tag.append(createElement('button', {
          className: 'ts__tag-remove', part: 'tag-remove', type: 'button', tabindex: '-1',
          'aria-label': `${clear} ${text}`, dataset: { remove: String(i) },
        }, '✕'));
      }
      return tag;
    });
    const rest = values.slice(max);
    if (rest.length) {
      tags.push(createElement('span', { className: 'ts__tag ts__tag--rest', part: 'tag tag-rest', title: rest.map((v) => this._labelOf(v)).join(', ') }, `+${rest.length}`));
    }
    this._tags.replaceChildren(...tags);
    this._tags.hidden = !values.length;
  }

  _syncClasses() {
    const tone = this.status === 'error' ? 'error' : this.status === 'warning' ? 'warning' : '';
    const empty = this._isEmpty();
    this._wrapper.className = ['ts', `ts--${this.effectiveSize}`, this._multi && 'ts--multiple', this._isOpen && 'ts--open',
      tone && `ts--${tone}`, this.isDisabled && 'ts--disabled', empty ? '' : 'ts--has-value'].filter(Boolean).join(' ');
    this._clearBtn.hidden = !this.clearable || empty || this.isDisabled || this.readonly;
    this._trigger.setAttribute('aria-expanded', String(this._isOpen));
    this.setState('open', this._isOpen);
  }

  // =====================================================
  // ĐÓNG / MỞ
  // =====================================================

  _open() {
    if (this._isOpen || this.isDisabled || this.readonly) return;
    this._isOpen = true;
    this._search.value = '';
    this._tree.filterValue = '';
    this._syncClasses();

    ++this._popupToken;
    showFloating(this._dropdown);
    this._stopAutoUpdate ||= autoUpdate(this._trigger, this._dropdown, () => this._position());
    if (!this.noAnimation && !animationsDisabled()) animateIn(this._dropdown, this._side === 'top' ? 'slide-up' : 'slide-down');

    this._overlay = openOverlay({
      element: this._dropdown,
      ignore: [this._trigger],
      restoreFocus: false,
      onEscape: () => this._close(true),
      onClickOutside: () => this._close(),
    });

    // Cây vừa hiện: đo lại (virtual), cuộn tới giá trị đang chọn rồi đưa focus vào trong
    this._tree.refreshLayout();
    const first = this._values()[0];
    if (first !== undefined && this._index.map.has(String(first))) this._tree.scrollToKey(first);
    if (this.showSearch) this._search.focus({ preventScroll: true });
    else this._tree.focus({ preventScroll: true });
  }

  _close(focusTrigger = false) {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._overlay?.close();
    this._overlay = null;
    this._syncClasses();
    // Đưa focus về trigger TRƯỚC khi ẩn popup (tránh focus rơi về body)
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
    if (this.noAnimation || animationsDisabled()) done();
    else animateOut(this._dropdown, this._side === 'top' ? 'slide-up' : 'slide-down').then(done);
  }

  _position() {
    const pos = computePosition(this._trigger, this._dropdown, { placement: 'bottom-start', offset: 4, matchWidth: 'min-width' });
    this._dropdown.style.left = `${pos.x}px`;
    this._dropdown.style.top = `${pos.y}px`;
    this._side = pos.side;
  }

  _onTriggerKey(e) {
    if (this.isDisabled) return;
    const { key } = e;
    if (key === 'Backspace' && this._multi && !this.readonly) {
      const values = this._values();
      if (values.length) {
        e.preventDefault();
        this._removeValue(values[values.length - 1]);
      }
      return;
    }
    if (!this._isOpen && (['ArrowDown', 'Enter', ' '].includes(key) || (key === 'ArrowDown' && e.altKey))) {
      e.preventDefault();
      this._open();
    } else if (this._isOpen && key === 'ArrowUp' && e.altKey) {
      e.preventDefault();
      this._close(true);
    }
  }
}

defineElement('hui-tree-select', HuiTreeSelect);

export { HuiTreeSelect };
export default HuiTreeSelect;
