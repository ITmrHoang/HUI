/**
 * HUI Select — Component Dropdown chọn lựa đa năng (Web Component Vanilla JS)
 *
 * Hỗ trợ:
 * - Options dạng mảng string: ['A', 'B', 'C']
 * - Options dạng mảng object: [{ label: 'A', value: 1 }, ...]
 * - Tùy chỉnh field-label, field-value cho object (vd: name/id)
 * - Hàm so sánh (compareFn) để khớp value với option object
 * - Tìm kiếm lọc (searchable)
 * - Gọi API bất đồng bộ fetch options (fetchFn)
 * - Clearable, disabled, error, success, hint, required
 * - Keyboard navigation (arrow, enter, escape)
 */

import styles from './hui-select.css?raw';
import { createElement, createStyle, injectTokens } from '../../utils/dom.js';
import { emitEvent, debounce } from '../../utils/events.js';

class HuiSelect extends HTMLElement {
  /**
   * 1. observedAttributes:
   * Danh sách attribute HTML mà trình duyệt theo dõi để kích hoạt re-render.
   * Các thuộc tính phức tạp (options, fetchFn, compareFn) phải set qua JS property.
   */
  static get observedAttributes() {
    return [
      'placeholder', 'size', 'disabled', 'required', 'clearable',
      'searchable', 'label', 'label-position', 'error', 'success', 'hint', 'name',
      'field-label', 'field-value', 'value',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // === Biến nội bộ ===
    this._isOpen = false;             // Dropdown đang mở hay đóng
    this._selectedValue = null;       // Giá trị (value) đang chọn
    this._selectedLabel = '';         // Nhãn hiển thị tương ứng
    this._options = [];               // Mảng options gốc (string[] hoặc object[])
    this._filteredOptions = [];       // Mảng options sau khi lọc tìm kiếm
    this._highlightIndex = -1;        // Index option đang highlight bằng keyboard
    this._isLoading = false;          // Đang loading (fetch API)
    this._fetchFn = null;             // Hàm async gọi API trả về options
    this._compareFn = null;           // Hàm so sánh tùy chỉnh (optionValue, selectedValue) => boolean
    this._searchQuery = '';           // Chuỗi tìm kiếm hiện tại

    // Trỏ đến các phần tử DOM bên trong Shadow
    this._wrapper = null;
    this._dropdownEl = null;
    this._searchInput = null;

    // Debounce cho search khi gọi API
    this._debouncedFetch = debounce((query) => {
      this._fetchOptions(query);
    }, 300);

    // Bind methods
    this._handleDocClick = this._handleDocClick.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  // =====================================================
  // 2. JAVASCRIPT PROPERTIES (API cho lập trình viên)
  // Không truyền qua HTML attribute được, phải set bằng JS.
  // =====================================================

  /** Mảng options — Chấp nhận string[] hoặc object[] */
  get options() {
    return this._options;
  }
  set options(val) {
    this._options = Array.isArray(val) ? val : [];
    this._filteredOptions = [...this._options];
    // Đồng bộ lại label hiển thị nếu đã có value
    this._syncSelectedLabel();
    if (this._wrapper) this._render();
  }

  /** Hàm gọi API bất đồng bộ — Nhận (searchQuery) => Promise<options[]> */
  get fetchFn() {
    return this._fetchFn;
  }
  set fetchFn(fn) {
    if (typeof fn === 'function') {
      this._fetchFn = fn;
    }
  }

  /** Hàm so sánh tùy chỉnh — Nhận (optionValue, selectedValue) => boolean */
  get compareFn() {
    return this._compareFn;
  }
  set compareFn(fn) {
    if (typeof fn === 'function') {
      this._compareFn = fn;
    }
  }

  /** Getter/Setter giá trị hiện tại */
  get value() {
    return this._selectedValue;
  }
  set value(val) {
    this._selectedValue = val;
    this._syncSelectedLabel();
    if (this._wrapper) this._render();
  }

  // =====================================================
  // 3. LIFECYCLE CALLBACKS
  // =====================================================

  connectedCallback() {
    injectTokens(this.shadowRoot);
    this.shadowRoot.appendChild(createStyle(styles));

    // Đọc value từ attribute nếu có
    const attrValue = this.getAttribute('value');
    if (attrValue !== null && this._selectedValue === null) {
      this._selectedValue = attrValue;
    }

    this._render();

    // Lắng nghe click ngoài component để đóng dropdown
    document.addEventListener('click', this._handleDocClick);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this._handleDocClick);
    document.removeEventListener('keydown', this._handleKeyDown);
  }

  attributeChangedCallback(name) {
    if (name === 'value') {
      const attrVal = this.getAttribute('value');
      this._selectedValue = attrVal;
      this._syncSelectedLabel();
    }
    if (this._wrapper) this._render();
  }

  // =====================================================
  // 4. HELPER — Lấy tên field từ attribute hoặc mặc định
  // =====================================================

  /** Tên field chứa nhãn hiển thị trong object option */
  get _fieldLabel() {
    return this.getAttribute('field-label') || 'label';
  }

  /** Tên field chứa giá trị trong object option */
  get _fieldValue() {
    return this.getAttribute('field-value') || 'value';
  }

  // =====================================================
  // 5. HELPER — Trích xuất label/value từ option bất kỳ
  // =====================================================

  /**
   * Trích label từ option (string hoặc object)
   * @param {string|Object} option
   * @returns {string}
   */
  _getLabel(option) {
    if (option == null) return '';
    if (typeof option === 'string' || typeof option === 'number') return String(option);
    return String(option[this._fieldLabel] ?? '');
  }

  /**
   * Trích value từ option (string hoặc object)
   * @param {string|Object} option
   * @returns {*}
   */
  _getValue(option) {
    if (option == null) return null;
    if (typeof option === 'string' || typeof option === 'number') return option;
    return option[this._fieldValue] ?? null;
  }

  /**
   * So sánh xem optionValue có khớp với selectedValue không.
   * Ưu tiên dùng compareFn nếu user set, nếu không thì so sánh đơn giản.
   */
  _isMatch(optionValue, selectedValue) {
    if (this._compareFn) {
      return this._compareFn(optionValue, selectedValue);
    }
    // So sánh lỏng (loose equality) để khớp cả string '1' với number 1
    // eslint-disable-next-line eqeqeq
    return optionValue == selectedValue;
  }

  /** Đồng bộ label hiển thị dựa trên value hiện tại */
  _syncSelectedLabel() {
    if (this._selectedValue === null || this._selectedValue === undefined) {
      this._selectedLabel = '';
      return;
    }
    const found = this._options.find(
      (opt) => this._isMatch(this._getValue(opt), this._selectedValue)
    );
    this._selectedLabel = found ? this._getLabel(found) : String(this._selectedValue);
  }

  // =====================================================
  // 6. API FETCH — Gọi hàm bất đồng bộ lấy options
  // =====================================================

  async _fetchOptions(query = '') {
    if (!this._fetchFn) return;

    this._isLoading = true;
    this._renderDropdownContent();

    try {
      const result = await this._fetchFn(query);
      this._options = Array.isArray(result) ? result : [];
      this._filteredOptions = [...this._options];
      this._syncSelectedLabel();
    } catch (err) {
      console.error('[hui-select] fetchFn error:', err);
      this._options = [];
      this._filteredOptions = [];
    } finally {
      this._isLoading = false;
      this._renderDropdownContent();
    }
  }

  // =====================================================
  // 7. TÌM KIẾM LỌC — Filter options theo từ khóa
  // =====================================================

  _filterOptions(query) {
    this._searchQuery = query;

    // Nếu có fetchFn → gọi API thay vì filter local
    if (this._fetchFn) {
      this._debouncedFetch(query);
      return;
    }

    // Filter local: tìm trong label
    if (!query) {
      this._filteredOptions = [...this._options];
    } else {
      const lower = query.toLowerCase();
      this._filteredOptions = this._options.filter(
        (opt) => this._getLabel(opt).toLowerCase().includes(lower)
      );
    }
    this._highlightIndex = -1;
    this._renderDropdownContent();
  }

  // =====================================================
  // 8. ĐÓNG / MỞ DROPDOWN
  // =====================================================

  _open() {
    if (this._isOpen) return;
    this._isOpen = true;
    this._highlightIndex = -1;
    this._searchQuery = '';
    this._filteredOptions = [...this._options];

    // Nếu có fetchFn và chưa có options → load lần đầu
    if (this._fetchFn && this._options.length === 0) {
      this._fetchOptions('');
    }

    document.addEventListener('keydown', this._handleKeyDown);
    this._render();

    // Auto-focus vào ô search nếu có
    requestAnimationFrame(() => {
      if (this._searchInput) this._searchInput.focus();
    });
  }

  _close() {
    if (!this._isOpen) return;
    this._isOpen = false;
    document.removeEventListener('keydown', this._handleKeyDown);
    this._render();
  }

  _toggle() {
    this._isOpen ? this._close() : this._open();
  }

  // =====================================================
  // 9. CHỌN OPTIONS
  // =====================================================

  _selectOption(option) {
    const value = this._getValue(option);
    const label = this._getLabel(option);

    this._selectedValue = value;
    this._selectedLabel = label;
    this._close();

    // Phát event cho bên ngoài bắt
    emitEvent(this, 'change', { value, label, option });
  }

  /** Xóa lựa chọn hiện tại */
  _clearSelection(e) {
    e?.stopPropagation();
    this._selectedValue = null;
    this._selectedLabel = '';
    this._render();
    emitEvent(this, 'change', { value: null, label: '', option: null });
    emitEvent(this, 'clear');
  }

  // =====================================================
  // 10. EVENT HANDLERS
  // =====================================================

  /** Click bên ngoài component → đóng dropdown */
  _handleDocClick(e) {
    if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) {
      this._close();
    }
  }

  /** Keyboard navigation: Arrow Up/Down, Enter, Escape */
  _handleKeyDown(e) {
    const opts = this._filteredOptions;
    if (!opts.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._highlightIndex = Math.min(this._highlightIndex + 1, opts.length - 1);
        this._renderDropdownContent();
        this._scrollToHighlighted();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this._highlightIndex = Math.max(this._highlightIndex - 1, 0);
        this._renderDropdownContent();
        this._scrollToHighlighted();
        break;

      case 'Enter':
        e.preventDefault();
        if (this._highlightIndex >= 0 && this._highlightIndex < opts.length) {
          this._selectOption(opts[this._highlightIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        this._close();
        break;
    }
  }

  /** Cuộn dropdown để option highlight luôn nằm trong tầm nhìn */
  _scrollToHighlighted() {
    if (!this._dropdownEl) return;
    const items = this._dropdownEl.querySelectorAll('.hui-select__option');
    const target = items[this._highlightIndex];
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }

  // =====================================================
  // 11. RENDER — Vẽ toàn bộ component
  // =====================================================

  _render() {
    if (this._wrapper) this._wrapper.remove();

    const label = this.getAttribute('label');
    let labelPos = this.getAttribute('label-position') || 'top';
    if (labelPos === 'above') labelPos = 'top'; // alias
    if (labelPos === 'left') labelPos = 'inline'; // alias

    const placeholder = this.getAttribute('placeholder') || 'Chọn...';
    const size = this.getAttribute('size') || 'md';
    const required = this.hasAttribute('required');
    const clearable = this.hasAttribute('clearable');
    const searchable = this.hasAttribute('searchable');
    const error = this.getAttribute('error');
    const success = this.getAttribute('success');
    const hint = this.getAttribute('hint');
    const hasValue = this._selectedValue !== null && this._selectedValue !== undefined;

    // ---- Label ----
    const labelEl = label
      ? createElement('label', {
          className: `hui-select__label${required ? ' hui-select__label--required' : ''}`,
        }, label)
      : null;

    // ---- Trigger (phần click mở dropdown) ----
    const triggerClasses = [
      'hui-select__trigger',
      `hui-select__trigger--${size}`,
      this._isOpen ? 'hui-select__trigger--open' : '',
      error ? 'hui-select__trigger--error' : '',
      success ? 'hui-select__trigger--success' : '',
    ].filter(Boolean).join(' ');

    // Text hiển thị: label đã chọn hoặc placeholder
    const valueEl = createElement('span', {
      className: `hui-select__value${!hasValue ? ' hui-select__value--placeholder' : ''}`,
    }, hasValue ? this._selectedLabel : placeholder);

    // Nút xóa (✕)
    const clearBtn = (clearable && hasValue)
      ? createElement('button', {
          className: 'hui-select__clear',
          type: 'button',
          'aria-label': 'Clear',
          onClick: (e) => this._clearSelection(e),
        }, '✕')
      : null;

    // Mũi tên ▼
    const arrowEl = createElement('span', {
      className: `hui-select__arrow${this._isOpen ? ' hui-select__arrow--open' : ''}`,
    }, '▼');

    const triggerChildren = [valueEl, ...[clearBtn, arrowEl].filter(Boolean)];
    if (labelPos === 'inside' && labelEl) {
      triggerChildren.unshift(labelEl);
    }

    const trigger = createElement('div', {
      className: triggerClasses,
      tabindex: '0',
      role: 'combobox',
      'aria-expanded': String(this._isOpen),
      'aria-haspopup': 'listbox',
      onClick: () => this._toggle(),
    }, ...triggerChildren);

    // ---- Dropdown ----
    this._dropdownEl = createElement('div', {
      className: `hui-select__dropdown${this._isOpen ? ' hui-select__dropdown--open' : ''}`,
      role: 'listbox',
    });

    // Ô tìm kiếm (nếu searchable)
    if (searchable && this._isOpen) {
      this._searchInput = createElement('input', {
        className: 'hui-select__search',
        type: 'text',
        placeholder: 'Tìm kiếm...',
        value: this._searchQuery,
        onInput: (e) => this._filterOptions(e.target.value),
      });
      const searchWrap = createElement('div', { className: 'hui-select__search-wrap' }, this._searchInput);
      this._dropdownEl.appendChild(searchWrap);
    } else {
      this._searchInput = null;
    }

    // Render nội dung dropdown (options / loading / empty)
    this._renderDropdownContent();

    // ---- Message (lỗi / thành công / gợi ý) ----
    const message = error || success || hint;
    const messageEl = message
      ? createElement('span', {
          className: `hui-select__message hui-select__message--${error ? 'error' : success ? 'success' : 'hint'}`,
        }, message)
      : null;

    // ---- Ghép tất cả ----
    const wrapperClasses = [
      'hui-select-wrapper',
      `hui-select-wrapper--label-${labelPos}`,
      hasValue ? 'hui-select-wrapper--has-value' : '',
      label ? 'hui-select-wrapper--has-label' : '',
      error ? 'hui-select-wrapper--has-error' : ''
    ].filter(Boolean).join(' ');
    
    let wrapperChildren = [];
    if (labelPos === 'inline') {
      const rightGroup = createElement('div', { className: 'hui-select__right-group' }, ...[trigger, this._dropdownEl, messageEl].filter(Boolean));
      wrapperChildren = [labelEl, rightGroup];
    } else if (labelPos === 'inside') {
      wrapperChildren = [trigger, this._dropdownEl, messageEl];
    } else {
      wrapperChildren = [labelEl, trigger, this._dropdownEl, messageEl];
    }

    this._wrapper = createElement('div', { className: wrapperClasses },
      ...wrapperChildren.filter(Boolean));

    this.shadowRoot.appendChild(this._wrapper);
  }

  // =====================================================
  // 12. RENDER NỘI DUNG DROPDOWN — Tách riêng để update nhanh
  // =====================================================

  _renderDropdownContent() {
    if (!this._dropdownEl) return;

    // Xóa option cũ (giữ lại searchWrap nếu có)
    const searchWrap = this._dropdownEl.querySelector('.hui-select__search-wrap');
    this._dropdownEl.innerHTML = '';
    if (searchWrap) this._dropdownEl.appendChild(searchWrap);

    // Trạng thái loading
    if (this._isLoading) {
      const spinner = createElement('span', { className: 'hui-select__spinner' });
      const loadingEl = createElement('div', { className: 'hui-select__loading' }, spinner, 'Đang tải...');
      this._dropdownEl.appendChild(loadingEl);
      return;
    }

    // Trạng thái trống
    if (this._filteredOptions.length === 0) {
      const emptyEl = createElement('div', { className: 'hui-select__empty' }, 'Không có kết quả');
      this._dropdownEl.appendChild(emptyEl);
      return;
    }

    // Render từng option
    this._filteredOptions.forEach((option, index) => {
      const optLabel = this._getLabel(option);
      const optValue = this._getValue(option);
      const isSelected = this._isMatch(optValue, this._selectedValue);
      const isHighlighted = index === this._highlightIndex;

      const classes = [
        'hui-select__option',
        isSelected ? 'hui-select__option--selected' : '',
        isHighlighted ? 'hui-select__option--highlighted' : '',
      ].filter(Boolean).join(' ');

      // Dấu tích ✓ cho option đã chọn
      const checkEl = createElement('span', { className: 'hui-select__check' }, isSelected ? '✓' : '');
      const labelEl = createElement('span', {}, optLabel);

      const optionEl = createElement('div', {
        className: classes,
        role: 'option',
        'aria-selected': String(isSelected),
        dataset: { index: String(index) },
        onClick: () => this._selectOption(option),
        onMouseenter: () => {
          this._highlightIndex = index;
          this._renderDropdownContent();
        },
      }, checkEl, labelEl);

      this._dropdownEl.appendChild(optionEl);
    });
  }
}

// Đăng ký custom element
if (!customElements.get('hui-select')) {
  customElements.define('hui-select', HuiSelect);
}

export default HuiSelect;
