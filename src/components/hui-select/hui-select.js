/**
 * HUI Select — Chọn một / nhiều giá trị từ danh sách (Ant Select + MUI Select), tham gia <form> native
 * Options: string[] / object[] (field-label / field-value) / nhóm { label, options: [...] }, lọc (show-search),
 * tải qua API (fetchFn), mode multiple | tags, virtual list khi > 100 option.
 * Dropdown nằm ở top-layer (utils/floating) nên không bị overflow: hidden của thẻ cha cắt.
 * Parts / events / biến CSS: xem JSDoc của class bên dưới. Cách override: xem hui-demo.
 */

import styles from './hui-select.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { debounce } from '../../utils/events.js';
import { autoUpdate, computePosition, floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { openOverlay } from '../../utils/overlay.js';
import '../hui-empty/hui-empty.js';
import { HOST_ARIA_ATTRS, hostAriaDescription, hostAriaName, setOrRemove } from '../hui-input/host-aria.js';

const LABEL_ALIAS = { above: 'top', left: 'inline' };
const LABEL_POSITIONS = ['top', 'inline', 'inside'];

/** Quá ngưỡng này thì chỉ vẽ các dòng đang nhìn thấy (virtual list) */
const VIRTUAL_THRESHOLD = 100;
/** Số dòng vẽ dư phía trên / dưới vùng nhìn thấy để cuộn không bị trống */
const OVERSCAN = 6;
/** Chiều cao dòng dự phòng khi chưa đo được (popup đang ẩn) */
const FALLBACK_ROW_HEIGHT = 32;

/** Đánh dấu option "tạo mới" trong mode="tags" */
const CREATE = Symbol('create');

/**
 * Dropdown chọn một hoặc nhiều giá trị, tham gia <form> native.
 * @fires change - Khi chọn / bỏ chọn / xóa. detail: { value, label, option } (mode multiple|tags: value, label, option là mảng)
 * @fires clear - Khi bấm nút xóa (allow-clear / clearable)
 * @slot not-found - Nội dung khi không có option nào (mặc định <hui-empty image="simple">)
 * @csspart base - Khung ngoài cùng (label + ô + thông báo)
 * @csspart label - Nhãn
 * @csspart trigger - Ô hiển thị giá trị (role=combobox)
 * @csspart value - Chữ của giá trị đang chọn / placeholder
 * @csspart tags - Vùng chứa tag (mode multiple|tags)
 * @csspart tag - Mỗi tag giá trị (thêm tag-rest cho tag "+N")
 * @csspart tag-remove - Nút ✕ trên tag
 * @csspart clear - Nút xóa ✕
 * @csspart arrow - Mũi tên ▼
 * @csspart loading - Vòng xoay ở trigger khi loading
 * @csspart dropdown - Khung popup
 * @csspart search - Ô tìm kiếm trong popup (show-search / tags)
 * @csspart listbox - Danh sách option (role=listbox)
 * @csspart group-label - Tiêu đề nhóm option
 * @csspart option - Mỗi option (thêm option-selected / option-active / option-disabled / option-create)
 * @csspart check - Dấu ✓ của option đang chọn
 * @csspart empty - Vùng "Không tìm thấy" / "Đang tải..." (+ loading)
 * @csspart message - Dòng thông báo lỗi / thành công / gợi ý
 * @cssprop --hui-select-height - Chiều cao ô (mode multiple: chiều cao tối thiểu)
 * @cssprop --hui-select-padding-x - Khoảng đệm ngang của ô
 * @cssprop --hui-select-font-size - Cỡ chữ
 * @cssprop --hui-select-radius - Bo góc ô
 * @cssprop --hui-select-bg - Màu nền ô
 * @cssprop --hui-select-color - Màu chữ
 * @cssprop --hui-select-placeholder-color - Màu placeholder
 * @cssprop --hui-select-border-color - Màu viền
 * @cssprop --hui-select-hover-border-color - Màu viền khi hover
 * @cssprop --hui-select-focus-border-color - Màu viền khi mở / focus
 * @cssprop --hui-select-focus-shadow - Vòng sáng khi mở
 * @cssprop --hui-select-label-color - Màu nhãn
 * @cssprop --hui-select-label-font-size - Cỡ chữ nhãn
 * @cssprop --hui-select-dropdown-bg - Màu nền popup
 * @cssprop --hui-select-dropdown-radius - Bo góc popup
 * @cssprop --hui-select-dropdown-shadow - Đổ bóng popup
 * @cssprop --hui-select-dropdown-max-height - Chiều cao tối đa danh sách
 * @cssprop --hui-select-option-padding - Khoảng đệm mỗi option
 * @cssprop --hui-select-option-hover-bg - Nền option khi hover / highlight bằng phím
 * @cssprop --hui-select-option-selected-bg - Nền option đang chọn
 * @cssprop --hui-select-option-selected-color - Màu chữ option đang chọn
 * @cssprop --hui-select-tag-bg - Nền tag (mode multiple|tags)
 * @cssprop --hui-select-tag-color - Màu chữ tag
 * @cssprop --hui-select-tag-radius - Bo góc tag
 */
class HuiSelect extends HuiFormElement {
  static properties = {
    /** Giá trị đang chọn (khớp field-value của option); null = chưa chọn. mode multiple|tags: mảng */
    value: { type: String, default: null, reflect: false },
    /** string[] / object[] / nhóm { label, options: [...] } — nên gán bằng property (attribute nhận JSON) */
    options: { type: Array, default: [] },
    /** '' | multiple | tags — '' chọn một; multiple chọn nhiều; tags chọn nhiều + gõ Enter để tạo giá trị mới */
    mode: { type: String, default: '' },
    /** Chữ khi chưa chọn (mặc định theo locale: "Chọn...") */
    placeholder: { type: String, default: '' },
    /** Nhãn của ô chọn */
    label: { type: String, default: '' },
    /** top | inline | inside (floating label) — alias cũ: above, left */
    labelPosition: { type: String, default: 'top' },
    /** Thông báo lỗi (viền đỏ) — ưu tiên hơn success / hint */
    error: { type: String, default: '' },
    /** Thông báo thành công (viền xanh) */
    success: { type: String, default: '' },
    /** Gợi ý nhỏ phía dưới */
    hint: { type: String, default: '' },
    /** Hiện nút ✕ khi đã chọn (tên cũ của allow-clear) */
    clearable: { type: Boolean },
    /** Hiện nút ✕ khi đã chọn (tên kiểu Ant) */
    allowClear: { type: Boolean },
    /** Hiện ô tìm kiếm trong dropdown (tên cũ của show-search) */
    searchable: { type: Boolean },
    /** Hiện ô tìm kiếm + lọc option theo nhãn (tên kiểu Ant) */
    showSearch: { type: Boolean },
    /** mode multiple|tags: số tag tối đa hiển thị, phần còn lại gộp thành tag "+N" */
    maxTagCount: { type: Number },
    /** Đang tải: vòng xoay ở trigger, dropdown hiện "Đang tải..." */
    loading: { type: Boolean },
    /** Tên field làm nhãn khi option là object */
    fieldLabel: { type: String, default: 'label' },
    /** Tên field làm giá trị khi option là object */
    fieldValue: { type: String, default: 'value' },
  };

  static styles = [floatingCss, styles];

  // Theo dõi thêm aria-label / -labelledby / -describedby của host để chuyển xuống trigger (combobox)
  static get observedAttributes() {
    return [...super.observedAttributes, ...HOST_ARIA_ATTRS];
  }

  attributeChangedCallback(attrName, oldVal, newVal) {
    if (HOST_ARIA_ATTRS.includes(attrName)) {
      if (oldVal !== newVal) this.requestUpdate('hostAria');
      return;
    }
    super.attributeChangedCallback(attrName, oldVal, newVal);
  }

  connectedCallback() {
    super.connectedCallback();
    // Phần tử được aria-labelledby trỏ tới có thể nằm SAU host trong DOM → đọc lại ở microtask kế tiếp
    this.requestUpdate('hostAria');
  }

  constructor() {
    super();
    this._fetchFn = null;
    this._compareFn = null;
    this._isOpen = false;
    this._query = '';
    /** Danh sách option chọn được sau khi lọc (phẳng, không gồm tiêu đề nhóm) — index dùng cho bàn phím */
    this._filtered = [];
    /** Các dòng để vẽ: { group: nhãn } hoặc { index } (index trong _filtered) */
    this._rows = [];
    /** Phần tử option đang có trong DOM theo index (virtual list: mảng thưa) */
    this._optionEls = [];
    /** Option do người dùng tạo trong mode="tags" */
    this._created = [];
    this._activeIndex = -1;
    this._fetching = false;
    this._fetchId = 0;
    this._popupToken = 0;
    this._side = 'bottom';
    this._overlay = null;
    this._stopAutoUpdate = null;
    this._virtual = false;
    this._rowHeight = 0;
    this._window = [-1, -1];
    this._scrollFrame = 0;
    this._debouncedFetch = debounce((q) => this._fetch(q), 300);
  }

  // =====================================================
  // JS PROPERTIES
  // =====================================================

  get options() {
    return this._getProp('options');
  }

  set options(val) {
    this._setProp('options', Array.isArray(val) ? val : []);
  }

  /** Hàm async (query) => Promise<options[]> — có hàm này thì tìm kiếm gọi API thay vì lọc tại chỗ */
  get fetchFn() {
    return this._fetchFn;
  }

  set fetchFn(fn) {
    if (typeof fn === 'function') this._fetchFn = fn;
  }

  /** Hàm (optionValue, selectedValue) => boolean thay cho so sánh == mặc định */
  get compareFn() {
    return this._compareFn;
  }

  set compareFn(fn) {
    if (typeof fn !== 'function') return;
    this._compareFn = fn;
    this.requestUpdate('compareFn');
  }

  get _multiple() {
    return this.mode === 'multiple' || this.mode === 'tags';
  }

  get _searchEnabled() {
    return this.searchable || this.showSearch || this.mode === 'tags';
  }

  get _clearEnabled() {
    return this.clearable || this.allowClear;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._label = createElement('span', { className: 'hui-select__label', part: 'label', id: 'label' });
    this._label.addEventListener('click', () => this.focus());

    this._valueEl = createElement('span', { className: 'hui-select__value', part: 'value' });
    this._tags = createElement('span', { className: 'hui-select__tags', part: 'tags', hidden: true });
    this._tags.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove]');
      if (!btn) return;
      e.stopPropagation(); // không mở/đóng dropdown
      this._removeValueAt(Number(btn.dataset.remove));
    });
    this._clearBtn = createElement('button', {
      className: 'hui-select__clear', part: 'clear', type: 'button', tabindex: '-1',
    }, '✕');
    this._clearBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // không mở dropdown
      this._clear();
    });
    this._arrow = createElement('span', { className: 'hui-select__arrow', part: 'arrow', 'aria-hidden': 'true' }, '▼');
    this._spinner = createElement('span', { className: 'hui-select__spinner', part: 'loading', 'aria-hidden': 'true', hidden: true });

    this._trigger = createElement('div', {
      className: 'hui-select__trigger',
      part: 'trigger',
      role: 'combobox',
      tabindex: '0',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-controls': 'listbox',
    }, this._valueEl, this._tags, this._clearBtn, this._spinner, this._arrow);
    this._trigger.addEventListener('click', () => (this._isOpen ? this._closeDropdown() : this._openDropdown()));
    this._trigger.addEventListener('keydown', (e) => this._onKeydown(e, false));
    this._trigger.addEventListener('blur', () => {
      if (!this._isOpen) this.markInteracted();
    });

    this._search = createElement('input', {
      className: 'hui-select__search', part: 'search', type: 'text', autocomplete: 'off',
      'aria-controls': 'listbox', 'aria-autocomplete': 'list',
    });
    this._search.addEventListener('input', (e) => {
      e.stopPropagation(); // input của ô tìm kiếm không phải giá trị của select
      this._onSearch(this._search.value);
    });
    this._search.addEventListener('change', (e) => e.stopPropagation());
    this._search.addEventListener('keydown', (e) => this._onKeydown(e, true));
    this._searchWrap = createElement('div', { className: 'hui-select__search-wrap' }, this._search);

    this._listbox = createElement('div', { className: 'hui-select__listbox', part: 'listbox', role: 'listbox', id: 'listbox' });
    // Giữ focus ở trigger / ô tìm kiếm khi bấm vào option
    this._listbox.addEventListener('mousedown', (e) => e.preventDefault());
    this._listbox.addEventListener('click', (e) => {
      const el = e.target.closest('[role="option"]');
      if (el) this._selectIndex(Number(el.dataset.index));
    });
    this._listbox.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[role="option"]');
      if (el && !el.hasAttribute('aria-disabled')) this._setActive(Number(el.dataset.index), false);
    });
    this._listbox.addEventListener('scroll', () => this._onListScroll(), { passive: true });
    this._spacer = createElement('div', { className: 'hui-select__spacer', 'aria-hidden': 'true' });

    // Trống: slot not-found (mặc định hui-empty); đang tải: spinner + chữ
    this._empty = createElement('hui-empty', { image: 'simple' });
    this._notFoundSlot = createElement('slot', { name: 'not-found' }, this._empty);
    this._loadingEl = createElement('span', { className: 'hui-select__loading' },
      createElement('span', { className: 'hui-select__spinner', 'aria-hidden': 'true' }),
      this._loadingText = createElement('span'));
    this._status = createElement('div', { className: 'hui-select__status', part: 'empty' }, this._notFoundSlot, this._loadingEl);

    this._dropdown = createElement('div', { className: 'hui-floating hui-select__dropdown', part: 'dropdown', hidden: true },
      this._searchWrap, this._listbox, this._status);

    this._message = createElement('div', { className: 'hui-select__message', part: 'message', id: 'message' });
    this._group = createElement('div', { className: 'hui-select__group' }, this._trigger, this._message, this._dropdown);
    this._wrapper = createElement('div', { className: 'hui-select', part: 'base' }, this._label, this._group);
    return this._wrapper;
  }

  updated(changed) {
    // mode nhiều giá trị: value luôn là mảng (attribute value nhận JSON '["a","b"]' hoặc 'a,b')
    if (this._multiple && !Array.isArray(this.value)) this.value = this._values();
    // Lần đầu: chưa có 'locale' trong changed → vẫn cần gán chuỗi locale
    const localeChanged = changed.has('locale') || !this._localeReady;
    this._localeReady = true;

    const optionsChanged = ['options', 'fieldLabel', 'fieldValue', 'compareFn', 'mode'].some((k) => changed.has(k));
    if (optionsChanged) this._applyFilter();
    if (optionsChanged || localeChanged || ['value', 'loading'].some((k) => changed.has(k))) this._renderList();
    if (optionsChanged || localeChanged || ['value', 'placeholder', 'maxTagCount', 'disabled', 'readonly'].some((k) => changed.has(k))) this._syncDisplay();

    if (changed.has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
      if (this.label) this._trigger.setAttribute('aria-labelledby', 'label');
      else this._trigger.removeAttribute('aria-labelledby');
      if (this.label) this._listbox.setAttribute('aria-label', this.label);
      else this._listbox.removeAttribute('aria-label');
    }
    if (changed.has('label') || changed.has('hostAria')) {
      // Có label → aria-labelledby như cũ; không có → lấy aria-label / aria-labelledby của host
      const hostName = this.label ? '' : hostAriaName(this);
      setOrRemove(this._trigger, 'aria-label', hostName);
      if (!this.label) setOrRemove(this._listbox, 'aria-label', hostName);
      setOrRemove(this._trigger, 'aria-description', hostAriaDescription(this));
    }
    if (changed.has('labelPosition')) this._placeLabel();
    if (changed.has('disabled')) {
      this._trigger.tabIndex = this.isDisabled ? -1 : 0;
      this._trigger.toggleAttribute('aria-disabled', this.isDisabled);
      if (this.isDisabled) this._closeDropdown();
    }
    if (changed.has('required')) {
      this._trigger.toggleAttribute('aria-required', this.required);
      this._label.classList.toggle('hui-select__label--required', this.required);
    }
    if (['searchable', 'showSearch', 'mode'].some((k) => changed.has(k))) this._searchWrap.hidden = !this._searchEnabled;
    if (changed.has('mode')) {
      if (this._multiple) this._listbox.setAttribute('aria-multiselectable', 'true');
      else this._listbox.removeAttribute('aria-multiselectable');
    }
    if (changed.has('loading')) {
      this._trigger.toggleAttribute('aria-busy', this.loading);
      this._spinner.hidden = !this.loading;
      this._arrow.hidden = this.loading;
    }
    if (changed.has('name')) this._syncForm(); // mode nhiều giá trị: FormData phụ thuộc name
    if (['error', 'success', 'hint', 'status'].some((k) => changed.has(k))) this._syncMessage();
    if (localeChanged) {
      const search = t('common.search');
      this._search.placeholder = `${search}...`;
      this._search.setAttribute('aria-label', search);
      this._clearBtn.setAttribute('aria-label', t('common.clear'));
      this._empty.setAttribute('description', t('select.notFound'));
      this._loadingText.textContent = t('common.loading');
    }

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
    cancelAnimationFrame(this._scrollFrame);
    hideFloating(this._dropdown);
  }

  // =====================================================
  // FORM
  // =====================================================

  /** Giá trị gửi form: primitive → chuỗi, object → JSON. Nhiều giá trị → FormData, mỗi giá trị 1 entry cùng name */
  formValue() {
    if (this._isEmpty()) return null;
    const str = (v) => (typeof v === 'object' ? JSON.stringify(v) : String(v));
    if (this._multiple) {
      if (!this.name) return null;
      const data = new FormData();
      for (const v of this._values()) data.append(this.name, str(v));
      return data;
    }
    return str(this.value);
  }

  _isEmpty() {
    return this._multiple ? this._values().length === 0 : super._isEmpty();
  }

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() {
    return this._trigger;
  }

  /** form.reset() không có attribute value → về null (chưa chọn) / [] (nhiều giá trị) thay vì chuỗi rỗng */
  formResetCallback() {
    super.formResetCallback();
    this._created = [];
    if (this._multiple) this.value = this._values();
    else if (this.value === '') this.value = null;
  }

  formStateRestoreCallback(state) {
    if (this._multiple && state instanceof FormData) this.value = state.getAll(this.name);
    else super.formStateRestoreCallback(state);
  }

  focus(options) {
    if (this._trigger) this._trigger.focus(options);
    else super.focus(options);
  }

  blur() {
    this._trigger?.blur();
  }

  // =====================================================
  // OPTION HELPERS
  // =====================================================

  _isGroup(option) {
    return Boolean(option && typeof option === 'object' && Array.isArray(option.options));
  }

  /** Option gốc + option tạo trong mode tags (chưa có trong danh sách) */
  _allOptions() {
    const list = Array.isArray(this.options) ? this.options : [];
    if (!this._created.length) return list;
    const flat = this._flatten(list);
    return [...list, ...this._created.filter((c) => !flat.some((o) => this._eq(this._valueOf(o), c.value)))];
  }

  _flatten(list) {
    return list.flatMap((o) => (this._isGroup(o) ? o.options : [o]));
  }

  _flatOptions() {
    return this._flatten(this._allOptions());
  }

  _labelOf(option) {
    if (option == null) return '';
    if (typeof option !== 'object') return String(option);
    if (option[CREATE]) return option.label;
    return String(option[this.fieldLabel || 'label'] ?? '');
  }

  _valueOf(option) {
    if (option == null) return null;
    if (typeof option !== 'object') return option;
    if (option[CREATE]) return option.value;
    return option[this.fieldValue || 'value'] ?? null;
  }

  _isOptionDisabled(option) {
    return Boolean(option && typeof option === 'object' && option.disabled);
  }

  _eq(optionValue, selected) {
    // eslint-disable-next-line eqeqeq -- so sánh lỏng để '1' khớp 1 (giá trị từ attribute luôn là chuỗi)
    return this._compareFn ? Boolean(this._compareFn(optionValue, selected)) : optionValue == selected;
  }

  /** Giá trị dạng mảng (mode nhiều giá trị) — chấp nhận mảng, JSON, 'a,b' hoặc 1 giá trị */
  _values() {
    const v = this.value;
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

  _isSelected(option) {
    if (option && option[CREATE]) return false;
    if (this._isEmpty()) return false;
    const v = this._valueOf(option);
    if (this._multiple) return this._values().some((s) => this._eq(v, s));
    return this._eq(v, this.value);
  }

  _optionForValue(value) {
    return this._flatOptions().find((o) => this._eq(this._valueOf(o), value));
  }

  /** Lọc theo nhãn, giữ cấu trúc nhóm; mode tags thêm dòng "tạo mới" khi chữ gõ chưa khớp option nào */
  _applyFilter() {
    const q = this._query.toLowerCase();
    // fetchFn tự lọc phía server → giữ nguyên kết quả trả về
    const match = (o) => !q || this._fetchFn || this._labelOf(o).toLowerCase().includes(q);
    const rows = [];
    const filtered = [];
    const push = (o, gid = null) => {
      rows.push({ index: filtered.length, gid });
      filtered.push(o);
    };

    const query = this._query.trim();
    if (this.mode === 'tags' && query) {
      const exists = this._flatOptions().some((o) => this._labelOf(o) === query || String(this._valueOf(o)) === query);
      if (!exists) push({ [CREATE]: true, label: query, value: query });
    }

    let gid = 0;
    for (const item of this._allOptions()) {
      if (this._isGroup(item)) {
        const kids = item.options.filter(match);
        if (!kids.length) continue;
        const id = gid++;
        rows.push({ group: String(item.label ?? ''), gid: id });
        kids.forEach((k) => push(k, id));
      } else if (match(item)) {
        push(item);
      }
    }
    this._rows = rows;
    this._filtered = filtered;
  }

  // =====================================================
  // HIỂN THỊ
  // =====================================================

  get _labelPos() {
    const pos = LABEL_ALIAS[this.labelPosition] || this.labelPosition;
    return LABEL_POSITIONS.includes(pos) ? pos : 'top';
  }

  _placeLabel() {
    const parent = this._labelPos === 'inside' ? this._trigger : this._wrapper;
    if (this._label.parentNode !== parent) parent.prepend(this._label);
  }

  _syncDisplay() {
    const empty = this._isEmpty();
    const placeholder = this.placeholder || t('select.placeholder');

    if (this._multiple) {
      this._renderTags();
      this._valueEl.hidden = !empty;
      this._valueEl.textContent = placeholder;
      this._valueEl.classList.add('hui-select__value--placeholder');
      return;
    }

    this._tags.hidden = true;
    this._valueEl.hidden = false;
    let text = placeholder;
    if (!empty) {
      const found = this._optionForValue(this.value);
      text = found !== undefined ? this._labelOf(found) : String(this.value);
    }
    this._valueEl.textContent = text;
    this._valueEl.classList.toggle('hui-select__value--placeholder', empty);
  }

  /** Tag cho mode nhiều giá trị; vượt max-tag-count thì gộp phần còn lại thành "+N" */
  _renderTags() {
    const values = this._values();
    const labelFor = (v) => {
      const o = this._optionForValue(v);
      return o !== undefined ? this._labelOf(o) : String(v);
    };
    const max = this.maxTagCount != null && this.maxTagCount >= 0 ? this.maxTagCount : values.length;
    const shown = values.slice(0, max);
    const rest = values.slice(max);
    const clear = t('common.clear');
    const removable = !this.isDisabled && !this.readonly;

    const tags = shown.map((v, i) => {
      const text = labelFor(v);
      const tag = createElement('span', { className: 'hui-select__tag', part: 'tag', title: text },
        createElement('span', { className: 'hui-select__tag-label' }, text));
      if (removable) {
        tag.append(createElement('button', {
          className: 'hui-select__tag-remove', part: 'tag-remove', type: 'button', tabindex: '-1',
          'aria-label': `${clear} ${text}`, dataset: { remove: String(i) },
        }, '✕'));
      }
      return tag;
    });
    if (rest.length) {
      tags.push(createElement('span', {
        className: 'hui-select__tag hui-select__tag--rest', part: 'tag tag-rest', title: rest.map(labelFor).join(', '),
      }, `+${rest.length}`));
    }
    this._tags.replaceChildren(...tags);
    this._tags.hidden = !values.length;
  }

  _syncMessage() {
    const text = this.error || this.success || this.hint || '';
    const kind = this.error ? 'error' : this.success ? 'success' : 'hint';
    this._message.textContent = text;
    this._message.hidden = !text;
    this._message.className = `hui-select__message hui-select__message--${kind}`;
    if (text) this._trigger.setAttribute('aria-describedby', 'message');
    else this._trigger.removeAttribute('aria-describedby');
    if (this.error || this.status === 'error') this._trigger.setAttribute('aria-invalid', 'true');
    else this._trigger.removeAttribute('aria-invalid');
  }

  _syncClasses() {
    const tone = this.error || this.status === 'error' ? 'error'
      : this.status === 'warning' ? 'warning'
        : this.success ? 'success' : '';
    const empty = this._isEmpty();

    this._wrapper.className = [
      'hui-select',
      `hui-select--${this.effectiveSize}`,
      `hui-select--label-${this._labelPos}`,
      this._multiple ? 'hui-select--multiple' : '',
      this.label ? 'hui-select--has-label' : '',
      empty ? '' : 'hui-select--has-value',
      this._isOpen ? 'hui-select--open' : '',
      tone ? `hui-select--${tone}` : '',
      this.isDisabled ? 'hui-select--disabled' : '',
    ].filter(Boolean).join(' ');

    this._clearBtn.hidden = !this._clearEnabled || empty || this.isDisabled;
    this._trigger.setAttribute('aria-expanded', String(this._isOpen));
    this.setState('open', this._isOpen);
    this.setState('disabled', this.isDisabled);
  }

  // =====================================================
  // DANH SÁCH (thường + virtual)
  // =====================================================

  _createOptionEl(option, index) {
    const selected = this._isSelected(option);
    const disabled = this._isOptionDisabled(option);
    const create = Boolean(option && option[CREATE]);
    const el = createElement('div', {
      className: ['hui-select__option', selected && 'hui-select__option--selected', disabled && 'hui-select__option--disabled',
        create && 'hui-select__option--create'].filter(Boolean).join(' '),
      part: ['option', selected && 'option-selected', disabled && 'option-disabled', create && 'option-create'].filter(Boolean).join(' '),
      role: 'option',
      id: `option-${index}`,
      'aria-selected': String(selected),
      dataset: { index: String(index) },
    },
    createElement('span', { className: 'hui-select__check', part: 'check', 'aria-hidden': 'true' }, selected ? '✓' : create ? '+' : ''),
    createElement('span', { className: 'hui-select__option-label' }, this._labelOf(option)));
    if (disabled) el.setAttribute('aria-disabled', 'true');
    if (index === this._activeIndex) {
      el.classList.add('hui-select__option--highlighted');
      el.part.add('option-active');
    }
    return el;
  }

  _createGroupLabel(text, id) {
    return createElement('div', { className: 'hui-select__group-label', part: 'group-label', id }, text);
  }

  /** Vẽ lại danh sách option (option không nhận focus — focus luôn ở trigger/ô tìm kiếm, dùng aria-activedescendant) */
  _renderList() {
    const busy = this.loading || this._fetching;
    if (busy || !this._filtered.length) {
      this._optionEls = [];
      this._virtual = false;
      this._listbox.classList.remove('hui-select__listbox--virtual');
      this._listbox.replaceChildren();
      this._listbox.toggleAttribute('aria-busy', busy);
      this._status.hidden = false;
      this._status.setAttribute('part', busy ? 'empty loading' : 'empty');
      this._notFoundSlot.hidden = busy;
      this._loadingEl.hidden = !busy;
      this._setActive(-1, false);
      return;
    }

    this._listbox.removeAttribute('aria-busy');
    this._status.hidden = true;
    if (this._activeIndex >= this._filtered.length) this._activeIndex = -1;

    this._virtual = this._filtered.length > VIRTUAL_THRESHOLD;
    this._listbox.classList.toggle('hui-select__listbox--virtual', this._virtual);
    if (this._virtual) {
      this._window = [-1, -1];
      this._renderWindow();
      return;
    }

    // Danh sách thường: option trong nhóm được bọc role=group (aria-labelledby = tiêu đề nhóm)
    this._optionEls = [];
    const children = [];
    const groups = new Map();
    for (const row of this._rows) {
      if (row.group !== undefined) {
        const id = `group-${row.gid}`;
        const groupEl = createElement('div', { role: 'group', 'aria-labelledby': id, className: 'hui-select__group-wrap' },
          this._createGroupLabel(row.group, id));
        groups.set(row.gid, groupEl);
        children.push(groupEl);
        continue;
      }
      const el = this._createOptionEl(this._filtered[row.index], row.index);
      this._optionEls[row.index] = el;
      if (row.gid !== null) groups.get(row.gid).append(el);
      else children.push(el);
    }
    this._listbox.replaceChildren(...children);
    this._setActive(this._activeIndex, false);
  }

  _measureRowHeight() {
    if (this._rowHeight) return this._rowHeight;
    if (!this._filtered.length || this._dropdown.hidden) return FALLBACK_ROW_HEIGHT;
    const probe = this._createOptionEl(this._filtered[0], -1);
    probe.style.visibility = 'hidden';
    this._listbox.append(probe);
    const h = probe.offsetHeight;
    probe.remove();
    if (h > 0) this._rowHeight = h;
    return h || FALLBACK_ROW_HEIGHT;
  }

  /**
   * VIRTUAL LIST: listbox chứa 1 khối đệm (spacer) cao bằng tổng số dòng × chiều cao dòng để thanh cuộn
   * đúng tỉ lệ; chỉ các dòng nằm trong vùng nhìn thấy (± OVERSCAN) được tạo và đặt position: absolute
   * tại top = vị trí dòng × chiều cao dòng. Cuộn → tính lại cửa sổ [start, end) và vẽ lại khi đổi.
   * Tiêu đề nhóm cũng là 1 dòng (aria-hidden, vì không bọc role=group được khi chỉ vẽ một phần).
   */
  _renderWindow(force = true) {
    const rh = this._measureRowHeight();
    const total = this._rows.length;
    const list = this._listbox;
    const viewH = list.clientHeight || parseFloat(getComputedStyle(list).maxHeight) || 240;
    const start = Math.max(0, Math.floor(list.scrollTop / rh) - OVERSCAN);
    const end = Math.min(total, Math.ceil((list.scrollTop + viewH) / rh) + OVERSCAN);
    if (!force && start === this._window[0] && end === this._window[1]) return;
    this._window = [start, end];

    this._spacer.style.height = `${total * rh}px`;
    this._optionEls = [];
    const els = [this._spacer];
    for (let r = start; r < end; r++) {
      const row = this._rows[r];
      let el;
      if (row.group !== undefined) {
        el = this._createGroupLabel(row.group);
        el.setAttribute('aria-hidden', 'true');
      } else {
        el = this._createOptionEl(this._filtered[row.index], row.index);
        el.setAttribute('aria-setsize', String(this._filtered.length));
        el.setAttribute('aria-posinset', String(row.index + 1));
        this._optionEls[row.index] = el;
      }
      el.style.top = `${r * rh}px`;
      el.style.height = `${rh}px`;
      els.push(el);
    }
    list.replaceChildren(...els);
    this._syncActiveDescendant();
  }

  _onListScroll() {
    if (!this._virtual || this._scrollFrame) return;
    this._scrollFrame = requestAnimationFrame(() => {
      this._scrollFrame = 0;
      this._renderWindow(false);
    });
  }

  /** Đổi option đang highlight: chỉ đổi class/part, không vẽ lại cả danh sách */
  _setActive(index, scroll = true) {
    const prev = this._optionEls[this._activeIndex];
    if (prev) {
      prev.classList.remove('hui-select__option--highlighted');
      prev.part.remove('option-active');
    }
    this._activeIndex = index;
    if (scroll && index >= 0) this._scrollToIndex(index);
    const el = this._optionEls[index];
    if (el) {
      el.classList.add('hui-select__option--highlighted');
      el.part.add('option-active');
    }
    this._syncActiveDescendant();
  }

  _syncActiveDescendant() {
    const el = this._optionEls[this._activeIndex];
    for (const host of [this._trigger, this._search]) {
      if (el) host.setAttribute('aria-activedescendant', el.id);
      else host.removeAttribute('aria-activedescendant');
    }
  }

  /** Cuộn trong listbox (không dùng scrollIntoView vì có thể cuộn cả trang) */
  _scrollToIndex(index) {
    const list = this._listbox;
    let top;
    let height;
    if (this._virtual) {
      const rh = this._measureRowHeight();
      top = this._rows.findIndex((r) => r.index === index) * rh;
      height = rh;
    } else {
      const el = this._optionEls[index];
      if (!el) return;
      top = el.offsetTop;
      height = el.offsetHeight;
    }
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + height > list.scrollTop + list.clientHeight) list.scrollTop = top + height - list.clientHeight;
    if (this._virtual) this._renderWindow(false);
  }

  // =====================================================
  // ĐÓNG / MỞ
  // =====================================================

  _openDropdown() {
    if (this._isOpen || this.isDisabled || this.readonly) return;
    this._isOpen = true;
    this._query = '';
    this._search.value = '';
    this._applyFilter();
    if (this._fetchFn && !this._allOptions().length) this._fetch('');
    this._activeIndex = -1;
    this._listbox.scrollTop = 0;
    this._renderList();
    this._syncClasses();

    // Huỷ lượt đóng đang chạy animation (nếu mở lại ngay)
    ++this._popupToken;
    showFloating(this._dropdown);
    this._stopAutoUpdate ||= autoUpdate(this._trigger, this._dropdown, () => this._position());
    animateIn(this._dropdown, this._side === 'top' ? 'slide-up' : 'slide-down');
    // Popup đã hiển thị: đo lại chiều cao dòng (virtual) rồi cuộn tới option đang chọn
    if (this._virtual) {
      this._rowHeight = 0;
      this._renderWindow();
    }
    this._setActive(this._filtered.findIndex((o) => this._isSelected(o)));

    this._overlay = openOverlay({
      element: this._dropdown,
      ignore: [this._trigger],
      restoreFocus: false,
      onEscape: () => this._closeDropdown(true),
      onClickOutside: () => this._closeDropdown(),
    });

    if (this._searchEnabled) this._search.focus({ preventScroll: true });
  }

  _closeDropdown(focusTrigger = false) {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._overlay?.close();
    this._overlay = null;
    this._syncClasses();
    if (focusTrigger) this._trigger.focus();
    this.markInteracted();

    const token = ++this._popupToken;
    animateOut(this._dropdown, this._side === 'top' ? 'slide-up' : 'slide-down').then(() => {
      if (token !== this._popupToken) return;
      this._stopAutoUpdate?.();
      this._stopAutoUpdate = null;
      hideFloating(this._dropdown);
      // animateOut giữ khung cuối (fill: forwards) → gỡ để lần mở sau không bị trong suốt
      this._dropdown.getAnimations?.().forEach((a) => a.cancel());
    });
  }

  _position() {
    const pos = computePosition(this._trigger, this._dropdown, {
      placement: 'bottom-start', offset: 4, matchWidth: 'min-width',
    });
    this._dropdown.style.left = `${pos.x}px`;
    this._dropdown.style.top = `${pos.y}px`;
    this._side = pos.side;
  }

  // =====================================================
  // CHỌN / TÌM KIẾM
  // =====================================================

  _selectIndex(index) {
    const option = this._filtered[index];
    if (option === undefined || this._isOptionDisabled(option)) return;

    if (!this._multiple) {
      const value = this._valueOf(option);
      this.value = value;
      this._closeDropdown(true);
      this.emit('change', { value, label: this._labelOf(option), option });
      return;
    }

    // Nhiều giá trị: bật/tắt, dropdown vẫn mở
    let target = option;
    if (option[CREATE]) {
      target = { label: option.label, value: option.value };
      this._created.push(target);
    }
    const value = this._valueOf(target);
    const values = this._values();
    const exists = values.some((v) => this._eq(value, v));
    const next = exists ? values.filter((v) => !this._eq(value, v)) : [...values, value];
    if (exists) this._created = this._created.filter((c) => !this._eq(c.value, value));
    this.value = next;

    // Đã chọn xong thì xóa chữ tìm kiếm (giống Ant autoClearSearchValue) để thấy lại toàn bộ danh sách
    if (this._query) {
      this._query = '';
      this._search.value = '';
    }
    this._applyFilter();
    this._renderList();
    this._setActive(this._filtered.findIndex((o) => this._eq(this._valueOf(o), value)), true);
    this._emitMultiChange();
  }

  _emitMultiChange() {
    const value = [...this._values()];
    const option = value.map((v) => this._optionForValue(v) ?? v);
    this.emit('change', { value, label: option.map((o) => this._labelOf(o)), option });
  }

  _removeValueAt(i) {
    if (this.isDisabled || this.readonly) return;
    const values = [...this._values()]; // bản sao: không sửa mảng value đang giữ
    const [removed] = values.splice(i, 1);
    this._created = this._created.filter((c) => !this._eq(c.value, removed));
    this.value = values;
    this.markInteracted();
    if (this._isOpen) {
      this._applyFilter();
      this._renderList();
    }
    this._emitMultiChange();
  }

  _clear() {
    if (this.isDisabled || this.readonly) return;
    this.markInteracted();
    if (this._multiple) {
      this._created = [];
      this.value = [];
      this._emitMultiChange();
    } else {
      this.value = null;
      this.emit('change', { value: null, label: '', option: null });
    }
    this.emit('clear');
  }

  _onSearch(query) {
    this._query = query;
    if (this._fetchFn) {
      this._debouncedFetch(query);
      return;
    }
    this._applyFilter();
    this._activeIndex = -1;
    this._listbox.scrollTop = 0;
    this._renderList();
    if (query) this._setActive(this._step(-1, 1));
  }

  /** Gọi fetchFn; kết quả của lượt gọi cũ (về muộn) bị bỏ qua */
  async _fetch(query) {
    if (!this._fetchFn) return;
    const id = ++this._fetchId;
    this._fetching = true;
    this._renderList();

    let result = [];
    try {
      const data = await this._fetchFn(query);
      result = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('[hui-select] fetchFn error:', err);
    }
    if (id !== this._fetchId) return;
    this._fetching = false;
    this.options = result;
    this.requestUpdate('options');
  }

  // =====================================================
  // BÀN PHÍM
  // =====================================================

  /** Index option kế tiếp (bỏ qua option disabled) theo hướng dir, tính từ `from`; không có thì giữ `from` */
  _step(from, dir) {
    for (let i = from + dir; i >= 0 && i < this._filtered.length; i += dir) {
      if (!this._isOptionDisabled(this._filtered[i])) return i;
    }
    return from;
  }

  _onKeydown(e, fromSearch) {
    if (this.isDisabled) return;
    const { key } = e;

    // Nhiều giá trị: Backspace (ô tìm kiếm đang trống) xóa tag cuối
    if (key === 'Backspace' && this._multiple && !this.readonly && (!fromSearch || this._search.value === '')) {
      const count = this._values().length;
      if (count) {
        e.preventDefault();
        this._removeValueAt(count - 1);
      }
      return;
    }

    if (!this._isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        e.preventDefault();
        this._openDropdown();
        if (this._activeIndex < 0) {
          this._setActive(key === 'ArrowUp' ? this._step(this._filtered.length, -1) : this._step(-1, 1));
        }
      }
      return;
    }

    const count = this._filtered.length;
    switch (key) {
      case 'ArrowDown':
        e.preventDefault();
        this._setActive(this._step(this._activeIndex, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._setActive(this._activeIndex < 0 ? this._step(count, -1) : this._step(this._activeIndex, -1));
        break;
      case 'Home':
      case 'End':
        if (fromSearch) return; // trong ô tìm kiếm: Home/End di chuyển con trỏ chữ
        e.preventDefault();
        this._setActive(key === 'Home' ? this._step(-1, 1) : this._step(count, -1));
        break;
      case ' ':
        if (fromSearch) return;
      // falls through
      case 'Enter':
        e.preventDefault();
        if (this._activeIndex >= 0) this._selectIndex(this._activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        this._closeDropdown(true);
        break;
      case 'Tab':
        this._closeDropdown();
        break;
      default:
    }
  }
}

defineElement('hui-select', HuiSelect);

export default HuiSelect;
