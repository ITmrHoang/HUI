/**
 * HUI Select — Chọn một giá trị từ danh sách (Ant Select + MUI Select), tham gia <form> native
 * Options: string[] hoặc object[] (field-label / field-value), lọc (searchable), tải qua API (fetchFn).
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

const LABEL_ALIAS = { above: 'top', left: 'inline' };
const LABEL_POSITIONS = ['top', 'inline', 'inside'];

/**
 * Dropdown chọn một giá trị, tham gia <form> native.
 * @fires change - Khi chọn hoặc xóa lựa chọn, detail: { value, label, option }
 * @fires clear - Khi bấm nút xóa (clearable)
 * @csspart base - Khung ngoài cùng (label + ô + thông báo)
 * @csspart label - Nhãn
 * @csspart trigger - Ô hiển thị giá trị (role=combobox)
 * @csspart value - Chữ của giá trị đang chọn / placeholder
 * @csspart clear - Nút xóa ✕
 * @csspart arrow - Mũi tên ▼
 * @csspart dropdown - Khung popup
 * @csspart search - Ô tìm kiếm trong popup (searchable)
 * @csspart listbox - Danh sách option (role=listbox)
 * @csspart option - Mỗi option (thêm option-selected / option-active / option-disabled theo trạng thái)
 * @csspart check - Dấu ✓ của option đang chọn
 * @csspart empty - Dòng "Không tìm thấy" / "Đang tải..."
 * @csspart message - Dòng thông báo lỗi / thành công / gợi ý
 * @cssprop --hui-select-height - Chiều cao ô
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
 */
class HuiSelect extends HuiFormElement {
  static properties = {
    /** Giá trị đang chọn (khớp với field-value của option); null = chưa chọn */
    value: { type: String, default: null, reflect: false },
    /** string[] hoặc object[] — nên gán bằng property: el.options = [...] (attribute nhận JSON) */
    options: { type: Array, default: [] },
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
    /** Hiện nút ✕ khi đã chọn */
    clearable: { type: Boolean },
    /** Hiện ô tìm kiếm trong dropdown */
    searchable: { type: Boolean },
    /** Tên field làm nhãn khi option là object */
    fieldLabel: { type: String, default: 'label' },
    /** Tên field làm giá trị khi option là object */
    fieldValue: { type: String, default: 'value' },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._fetchFn = null;
    this._compareFn = null;
    this._isOpen = false;
    this._query = '';
    this._filtered = [];
    this._optionEls = [];
    this._activeIndex = -1;
    this._loading = false;
    this._fetchId = 0;
    this._popupToken = 0;
    this._side = 'bottom';
    this._overlay = null;
    this._stopAutoUpdate = null;
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

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._label = createElement('span', { className: 'hui-select__label', part: 'label', id: 'label' });
    this._label.addEventListener('click', () => this.focus());

    this._valueEl = createElement('span', { className: 'hui-select__value', part: 'value' });
    this._clearBtn = createElement('button', {
      className: 'hui-select__clear', part: 'clear', type: 'button', tabindex: '-1',
    }, '✕');
    this._clearBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // không mở dropdown
      this._clear();
    });
    this._arrow = createElement('span', { className: 'hui-select__arrow', part: 'arrow', 'aria-hidden': 'true' }, '▼');

    this._trigger = createElement('div', {
      className: 'hui-select__trigger',
      part: 'trigger',
      role: 'combobox',
      tabindex: '0',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-controls': 'listbox',
    }, this._valueEl, this._clearBtn, this._arrow);
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
    this._status = createElement('div', { className: 'hui-select__status', part: 'empty' });

    this._dropdown = createElement('div', { className: 'hui-floating hui-select__dropdown', part: 'dropdown', hidden: true },
      this._searchWrap, this._listbox, this._status);

    this._message = createElement('div', { className: 'hui-select__message', part: 'message', id: 'message' });
    this._group = createElement('div', { className: 'hui-select__group' }, this._trigger, this._message, this._dropdown);
    this._wrapper = createElement('div', { className: 'hui-select', part: 'base' }, this._label, this._group);
    return this._wrapper;
  }

  updated(changed) {
    const optionsChanged = ['options', 'fieldLabel', 'fieldValue', 'compareFn'].some((k) => changed.has(k));
    if (optionsChanged) this._applyFilter();
    if (optionsChanged || changed.has('value') || changed.has('locale')) this._renderList();
    if (optionsChanged || ['value', 'placeholder', 'locale'].some((k) => changed.has(k))) this._syncDisplay();

    if (changed.has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
      if (this.label) this._trigger.setAttribute('aria-labelledby', 'label');
      else this._trigger.removeAttribute('aria-labelledby');
      if (this.label) this._listbox.setAttribute('aria-label', this.label);
      else this._listbox.removeAttribute('aria-label');
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
    if (changed.has('searchable')) this._searchWrap.hidden = !this.searchable;
    if (['error', 'success', 'hint', 'status'].some((k) => changed.has(k))) this._syncMessage();
    if (changed.has('locale')) {
      const search = t('common.search');
      this._search.placeholder = `${search}...`;
      this._search.setAttribute('aria-label', search);
      this._clearBtn.setAttribute('aria-label', t('common.clear'));
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
    hideFloating(this._dropdown);
  }

  // =====================================================
  // FORM
  // =====================================================

  /** Giá trị gửi form: primitive → chuỗi, object → JSON */
  formValue() {
    if (this._isEmpty()) return null;
    return typeof this.value === 'object' ? JSON.stringify(this.value) : String(this.value);
  }

  checkConstraints() {
    if (this.isDisabled) return null;
    if (this.required && this._isEmpty()) return { flags: { valueMissing: true }, message: t('form.requiredSelect') };
    return null;
  }

  validationAnchor() {
    return this._trigger;
  }

  /** form.reset() không có attribute value → về null (chưa chọn) thay vì chuỗi rỗng */
  formResetCallback() {
    super.formResetCallback();
    if (this.value === '') this.value = null;
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

  _allOptions() {
    return Array.isArray(this.options) ? this.options : [];
  }

  _labelOf(option) {
    if (option == null) return '';
    if (typeof option !== 'object') return String(option);
    return String(option[this.fieldLabel || 'label'] ?? '');
  }

  _valueOf(option) {
    if (option == null) return null;
    if (typeof option !== 'object') return option;
    return option[this.fieldValue || 'value'] ?? null;
  }

  _isOptionDisabled(option) {
    return Boolean(option && typeof option === 'object' && option.disabled);
  }

  _isSelected(option) {
    if (this._isEmpty()) return false;
    const v = this._valueOf(option);
    // eslint-disable-next-line eqeqeq -- so sánh lỏng để '1' khớp 1 (giá trị từ attribute luôn là chuỗi)
    return this._compareFn ? Boolean(this._compareFn(v, this.value)) : v == this.value;
  }

  _applyFilter() {
    const all = this._allOptions();
    const q = this._query.toLowerCase();
    // fetchFn tự lọc phía server → giữ nguyên kết quả trả về
    this._filtered = !q || this._fetchFn ? [...all] : all.filter((o) => this._labelOf(o).toLowerCase().includes(q));
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
    let text = this.placeholder || t('select.placeholder');
    if (!empty) {
      const found = this._allOptions().find((o) => this._isSelected(o));
      text = found !== undefined ? this._labelOf(found) : String(this.value);
    }
    this._valueEl.textContent = text;
    this._valueEl.classList.toggle('hui-select__value--placeholder', empty);
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
      this.label ? 'hui-select--has-label' : '',
      empty ? '' : 'hui-select--has-value',
      this._isOpen ? 'hui-select--open' : '',
      tone ? `hui-select--${tone}` : '',
      this.isDisabled ? 'hui-select--disabled' : '',
    ].filter(Boolean).join(' ');

    this._clearBtn.hidden = !this.clearable || empty || this.isDisabled;
    this._trigger.setAttribute('aria-expanded', String(this._isOpen));
    this.setState('open', this._isOpen);
    this.setState('disabled', this.isDisabled);
  }

  /** Vẽ lại danh sách option (option không nhận focus — focus luôn ở trigger/ô tìm kiếm, dùng aria-activedescendant) */
  _renderList() {
    if (this._loading || !this._filtered.length) {
      this._optionEls = [];
      this._listbox.replaceChildren();
      this._listbox.toggleAttribute('aria-busy', this._loading);
      this._status.hidden = false;
      this._status.setAttribute('part', this._loading ? 'empty loading' : 'empty');
      this._status.replaceChildren(
        ...(this._loading ? [createElement('span', { className: 'hui-select__spinner', 'aria-hidden': 'true' })] : []),
        this._loading ? t('common.loading') : t('select.notFound'),
      );
      this._setActive(-1, false);
      return;
    }

    this._listbox.removeAttribute('aria-busy');
    this._status.hidden = true;
    this._optionEls = this._filtered.map((option, index) => {
      const selected = this._isSelected(option);
      const disabled = this._isOptionDisabled(option);
      const el = createElement('div', {
        className: ['hui-select__option', selected && 'hui-select__option--selected', disabled && 'hui-select__option--disabled']
          .filter(Boolean).join(' '),
        part: ['option', selected && 'option-selected', disabled && 'option-disabled'].filter(Boolean).join(' '),
        role: 'option',
        id: `option-${index}`,
        'aria-selected': String(selected),
        dataset: { index: String(index) },
      },
      createElement('span', { className: 'hui-select__check', part: 'check', 'aria-hidden': 'true' }, selected ? '✓' : ''),
      createElement('span', { className: 'hui-select__option-label' }, this._labelOf(option)));
      if (disabled) el.setAttribute('aria-disabled', 'true');
      return el;
    });
    this._listbox.replaceChildren(...this._optionEls);
    this._setActive(this._activeIndex < this._optionEls.length ? this._activeIndex : -1, false);
  }

  /** Đổi option đang highlight: chỉ đổi class/part, không vẽ lại cả danh sách */
  _setActive(index, scroll = true) {
    const prev = this._optionEls[this._activeIndex];
    if (prev) {
      prev.classList.remove('hui-select__option--highlighted');
      prev.part.remove('option-active');
    }
    this._activeIndex = index;
    const el = this._optionEls[index];
    if (el) {
      el.classList.add('hui-select__option--highlighted');
      el.part.add('option-active');
      if (scroll) this._scrollToOption(el);
      this._trigger.setAttribute('aria-activedescendant', el.id);
      this._search.setAttribute('aria-activedescendant', el.id);
    } else {
      this._trigger.removeAttribute('aria-activedescendant');
      this._search.removeAttribute('aria-activedescendant');
    }
  }

  /** Cuộn trong listbox (không dùng scrollIntoView vì có thể cuộn cả trang) */
  _scrollToOption(el) {
    const list = this._listbox;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
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
    this._renderList();
    this._syncClasses();

    // Huỷ lượt đóng đang chạy animation (nếu mở lại ngay)
    ++this._popupToken;
    showFloating(this._dropdown);
    this._stopAutoUpdate ||= autoUpdate(this._trigger, this._dropdown, () => this._position());
    animateIn(this._dropdown, this._side === 'top' ? 'slide-up' : 'slide-down');
    // Popup đã hiển thị mới đo được vị trí để cuộn tới option đang chọn
    this._setActive(this._optionEls.findIndex((el) => el.getAttribute('aria-selected') === 'true'));

    this._overlay = openOverlay({
      element: this._dropdown,
      ignore: [this._trigger],
      restoreFocus: false,
      onEscape: () => this._closeDropdown(true),
      onClickOutside: () => this._closeDropdown(),
    });

    if (this.searchable) this._search.focus({ preventScroll: true });
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
    const value = this._valueOf(option);
    this.value = value;
    this._closeDropdown(true);
    this.emit('change', { value, label: this._labelOf(option), option });
  }

  _clear() {
    if (this.isDisabled || this.readonly) return;
    this.value = null;
    this.markInteracted();
    this.emit('change', { value: null, label: '', option: null });
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
    this._renderList();
    if (query) this._setActive(this._step(-1, 1));
  }

  /** Gọi fetchFn; kết quả của lượt gọi cũ (về muộn) bị bỏ qua */
  async _fetch(query) {
    if (!this._fetchFn) return;
    const id = ++this._fetchId;
    this._loading = true;
    this._renderList();

    let result = [];
    try {
      const data = await this._fetchFn(query);
      result = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('[hui-select] fetchFn error:', err);
    }
    if (id !== this._fetchId) return;
    this._loading = false;
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
