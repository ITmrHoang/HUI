/**
 * HUI Autocomplete — Ô nhập có gợi ý (Ant AutoComplete + MUI Autocomplete), tham gia <form> native.
 * Gợi ý từ `options` (lọc tại chỗ, bỏ dấu tiếng Việt, tô đậm phần khớp) hoặc `fetchFn(query, { signal })`
 * (debounce, hiện "Đang tải...", hủy request cũ). `free-solo`: giá trị là chữ gõ tự do.
 * Popup ở top-layer (utils/floating). Bàn phím theo WAI-ARIA APG Combobox (list autocomplete).
 * hui-search kế thừa lớp này (xem ../hui-search).
 */

import styles from './hui-autocomplete.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { autoUpdate, computePosition, floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { openOverlay } from '../../utils/overlay.js';
import '../hui-icon/hui-icon.js';

const FALLBACK = {
  'autocomplete.noResults': { vi: 'Không có gợi ý phù hợp', en: 'No matching suggestions' },
  'autocomplete.error': { vi: 'Không tải được gợi ý', en: 'Could not load suggestions' },
  'autocomplete.count': { vi: '{count} gợi ý', en: '{count} suggestions' },
};

/** t() + chuỗi dự phòng khi locale.js chưa có key */
export const msg = (key, vars, table = FALLBACK) => {
  let v = t(key, vars);
  if (v !== key) return v;
  v = table[key]?.[getLocaleName()] || table[key]?.en || key;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : v;
};

// =====================================================
// KHỚP CHUỖI KHÔNG DẤU
// =====================================================

/** Bỏ dấu + chữ thường: "Hà Nội" → "ha noi", "Đà" → "da" */
export const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/**
 * Vị trí [start, end) của `query` trong `text` (so khớp không dấu, không phân biệt hoa thường), null nếu không khớp.
 * Gập dấu từng ký tự và ghi lại chỉ số gốc → tô đậm đúng đoạn trong chuỗi CÓ dấu.
 */
export function matchRange(text, query) {
  const q = fold(query).trim();
  if (!q) return null;
  const src = String(text ?? '');
  let norm = '';
  const map = [];
  for (let i = 0; i < src.length; i++) {
    const f = fold(src[i]);
    for (let k = 0; k < f.length; k++) {
      norm += f[k];
      map.push(i);
    }
  }
  const idx = norm.indexOf(q);
  if (idx < 0) return null;
  return [map[idx], map[idx + q.length - 1] + 1];
}

/** Nút chữ có phần khớp bọc <mark part="highlight"> */
export function highlight(text, query) {
  const src = String(text ?? '');
  const range = query ? matchRange(src, query) : null;
  if (!range) return [document.createTextNode(src)];
  const [a, b] = range;
  return [
    document.createTextNode(src.slice(0, a)),
    createElement('mark', { className: 'ac__mark', part: 'highlight' }, src.slice(a, b)),
    document.createTextNode(src.slice(b)),
  ];
}

const isGroup = (o) => Boolean(o && typeof o === 'object' && Array.isArray(o.options));

/**
 * Ô nhập kèm danh sách gợi ý.
 * @fires input - free-solo: chữ đổi khi gõ. detail: { value }
 * @fires change - Giá trị đã chốt (chọn gợi ý, xóa, rời ô ở free-solo). detail: { value, option }
 * @fires hui-search - Chữ gõ đổi (sau `debounce` ms). detail: { query, trigger: 'input' | 'clear' }
 * @fires hui-select - Chọn một gợi ý. detail: { value, label, option }
 * @fires hui-error - fetchFn lỗi. detail: { error }
 * @fires clear - Bấm nút xóa
 * @slot prefix - Nội dung trước ô nhập (icon…)
 * @slot suffix - Nội dung sau ô nhập
 * @csspart base - Khung ngoài (nhãn + ô + thông báo)
 * @csspart label - Nhãn
 * @csspart control - Hàng chứa khung ô nhập (+ nút của hui-search)
 * @csspart container - Khung viền
 * @csspart input - Thẻ <input> (role=combobox)
 * @csspart clear - Nút xóa
 * @csspart loading - Vòng xoay khi đang tải
 * @csspart dropdown - Popup gợi ý
 * @csspart listbox - Danh sách gợi ý (role=listbox)
 * @csspart group-label - Tiêu đề nhóm
 * @csspart option - Mỗi gợi ý (+ option-active, option-selected, option-disabled)
 * @csspart option-icon - Icon của gợi ý
 * @csspart option-description - Dòng mô tả phụ của gợi ý
 * @csspart highlight - Phần chữ khớp (<mark>)
 * @csspart empty - Dòng "Không có gợi ý" / "Đang tải..." / lỗi
 * @csspart message - Dòng thông báo lỗi / gợi ý
 * @cssprop --hui-autocomplete-height - Chiều cao ô
 * @cssprop --hui-autocomplete-radius - Bo góc ô
 * @cssprop --hui-autocomplete-bg - Nền ô
 * @cssprop --hui-autocomplete-color - Màu chữ
 * @cssprop --hui-autocomplete-border-color - Viền
 * @cssprop --hui-autocomplete-hover-border-color - Viền khi hover
 * @cssprop --hui-autocomplete-focus-border-color - Viền khi focus
 * @cssprop --hui-autocomplete-focus-shadow - Vòng sáng khi focus
 * @cssprop --hui-autocomplete-font-size - Cỡ chữ
 * @cssprop --hui-autocomplete-dropdown-bg - Nền popup
 * @cssprop --hui-autocomplete-dropdown-shadow - Đổ bóng popup
 * @cssprop --hui-autocomplete-dropdown-radius - Bo góc popup
 * @cssprop --hui-autocomplete-dropdown-max-height - Chiều cao tối đa danh sách
 * @cssprop --hui-autocomplete-option-padding - Đệm mỗi gợi ý
 * @cssprop --hui-autocomplete-option-active-bg - Nền gợi ý đang highlight
 * @cssprop --hui-autocomplete-highlight-color - Màu chữ phần khớp
 * @cssprop --hui-autocomplete-highlight-bg - Nền phần khớp
 */
export class HuiAutocomplete extends HuiFormElement {
  static properties = {
    /** Giá trị: value của gợi ý đã chọn (free-solo: chữ trong ô) */
    value: { type: String, default: '', reflect: false },
    /** Gợi ý: string[] / { value, label, icon, description, disabled }[] / nhóm { label, options } — gán bằng property */
    options: { type: Array, default: [] },
    /** Chữ gợi ý khi ô trống */
    placeholder: { type: String, default: '' },
    /** Nhãn phía trên ô */
    label: { type: String, default: '' },
    /** Gợi ý nhỏ phía dưới */
    hint: { type: String, default: '' },
    /** Thông báo lỗi (viền đỏ) */
    error: { type: String, default: '' },
    /** Cho phép giá trị tự do (không bắt buộc chọn gợi ý) */
    freeSolo: { type: Boolean },
    /** Số ký tự tối thiểu trước khi gợi ý / gọi fetchFn */
    minChars: { type: Number, default: 0 },
    /** Trì hoãn (ms) trước khi phát hui-search / gọi fetchFn khi gõ */
    debounce: { type: Number, default: 300 },
    /** Ép hiện trạng thái đang tải */
    loading: { type: Boolean },
    /** Hiện nút ✕ khi có chữ */
    clearable: { type: Boolean },
    /** Tự highlight gợi ý đầu tiên (Enter chọn luôn) */
    autoHighlight: { type: Boolean },
    /** Mở danh sách ngay khi focus */
    openOnFocus: { type: Boolean },
    /** Số gợi ý tối đa hiển thị (0 = không giới hạn) */
    limit: { type: Number, default: 0 },
    /** Tắt hiệu ứng mở popup */
    noAnimation: { type: Boolean },
    /** async (query, { signal }) => options[] — gợi ý từ server */
    fetchFn: { type: Object, attribute: false },
    /** (option, query) => boolean — luật lọc riêng thay cho khớp nhãn không dấu */
    filterFn: { type: Object, attribute: false },
    /** (option, { query }) => Node | string — tự vẽ nội dung gợi ý */
    renderOption: { type: Object, attribute: false },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._text = '';
    this._items = [];
    this._rows = [];
    this._optionEls = [];
    this._active = -1;
    this._wantOpen = false;
    this._visible = false;
    this._remote = null;
    this._fetching = false;
    this._fetchError = null;
    this._abortCtrl = null;
    this._seq = 0;
    this._timer = 0;
    this._selected = null;
    this._focusValue = '';
    this._overlay = null;
    this._stopAuto = null;
    this._token = 0;
  }

  /** Chữ đang có trong ô nhập */
  get query() {
    return this._text;
  }

  /** Lớp con (hui-search) ép free-solo */
  get _free() {
    return this.freeSolo;
  }

  /** Lớp con ép luôn có nút xóa */
  get _clearEnabled() {
    return this.clearable;
  }

  get _hasSuggestions() {
    return typeof this.fetchFn === 'function' || (Array.isArray(this.options) && this.options.length > 0);
  }

  /** hui-search không có gợi ý → bỏ role combobox (là ô tìm kiếm thường) */
  get _comboRole() {
    return true;
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._label = createElement('label', { className: 'ac__label', part: 'label', id: 'label', for: 'input' });
    this._input = createElement('input', {
      className: 'ac__input', part: 'input', id: 'input', type: 'text', autocomplete: 'off', spellcheck: 'false',
    });
    this._input.addEventListener('input', (e) => {
      e.stopPropagation();
      this._onInput();
    });
    this._input.addEventListener('change', (e) => e.stopPropagation());
    this._input.addEventListener('keydown', (e) => this._onKeydown(e));
    this._input.addEventListener('focus', () => this._onFocus());
    this._input.addEventListener('blur', () => this._onBlur());

    this._prefixSlot = createElement('slot', { name: 'prefix' });
    this._suffixSlot = createElement('slot', { name: 'suffix' });
    this._prefix = createElement('span', { className: 'ac__affix ac__prefix', part: 'prefix' }, this._prefixSlot);
    this._suffix = createElement('span', { className: 'ac__affix ac__suffix', part: 'suffix' }, this._suffixSlot);
    for (const s of [this._prefixSlot, this._suffixSlot]) s.addEventListener('slotchange', () => this._syncAffixes());

    this._spinner = createElement('span', { className: 'ac__spinner', part: 'loading', 'aria-hidden': 'true', hidden: true });
    this._clearBtn = createElement('button', { className: 'ac__clear', part: 'clear', type: 'button', tabindex: '-1' },
      createElement('hui-icon', { name: 'close' }));
    this._clearBtn.addEventListener('mousedown', (e) => e.preventDefault());
    this._clearBtn.addEventListener('click', () => this._clear());

    this._container = createElement('div', { className: 'ac__container', part: 'container' },
      this._prefix, this._input, this._spinner, this._clearBtn, this._suffix);
    this._container.addEventListener('mousedown', (e) => {
      if (e.target === this._container) {
        e.preventDefault();
        this._input.focus();
      }
    });
    this._control = createElement('div', { className: 'ac__control', part: 'control' }, this._container);

    this._listbox = createElement('div', { className: 'ac__listbox', part: 'listbox', role: 'listbox', id: 'listbox' });
    // Giữ focus ở ô nhập khi bấm vào gợi ý
    this._listbox.addEventListener('mousedown', (e) => e.preventDefault());
    this._listbox.addEventListener('click', (e) => {
      const el = e.target.closest?.('[role="option"]');
      if (el) this._select(Number(el.dataset.index));
    });
    this._listbox.addEventListener('mousemove', (e) => {
      const el = e.target.closest?.('[role="option"]');
      if (el && !el.hasAttribute('aria-disabled') && Number(el.dataset.index) !== this._active) {
        this._setActive(Number(el.dataset.index), false);
      }
    });
    this._status = createElement('div', { className: 'ac__status', part: 'empty', hidden: true });
    this._dropdown = createElement('div', { className: 'hui-floating ac__dropdown', part: 'dropdown', hidden: true },
      this._listbox, this._status);
    this._dropdown.addEventListener('mousedown', (e) => e.preventDefault());

    // Thông báo số gợi ý cho trình đọc màn hình
    this._live = createElement('div', { className: 'ac__sr', 'aria-live': 'polite', role: 'status' });
    this._message = createElement('div', { className: 'ac__message', part: 'message', id: 'message' });

    this._wrapper = createElement('div', { className: 'ac', part: 'base' },
      this._label, this._control, this._message, this._dropdown, this._live);
    return this._wrapper;
  }

  updated(changed) {
    const input = this._input;
    if (changed.has('value')) this._syncTextFromValue();
    if (changed.has('placeholder')) input.placeholder = this.placeholder || '';
    if (changed.has('disabled')) {
      input.disabled = this.isDisabled;
      if (this.isDisabled) this._closePopup();
    }
    if (changed.has('readonly')) input.readOnly = this.readonly;
    if (changed.has('required')) input.toggleAttribute('aria-required', this.required);
    if (changed.has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
      if (this.label) this._listbox.setAttribute('aria-label', this.label);
      else this._listbox.removeAttribute('aria-label');
    }
    if (['error', 'hint', 'status'].some((k) => changed.has(k))) this._syncMessage();
    if (changed.has('loading')) this._spinner.hidden = !this.loading;
    if (changed.has('options') || changed.has('fetchFn')) this._syncRole();
    if (changed.has('locale')) this._clearBtn.setAttribute('aria-label', t('common.clear'));
    // Dữ liệu gợi ý / luật lọc đổi khi popup đang mở → vẽ lại
    if (this._wantOpen && ['options', 'loading', 'filterFn', 'renderOption', 'limit'].some((k) => changed.has(k))) {
      this._refresh();
    }
    this._syncClasses();
    super.updated(changed);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
    this._abortCtrl?.abort();
    this._wantOpen = false;
    this._closePopup(true);
  }

  // =====================================================
  // OPTION HELPERS
  // =====================================================

  _labelOf(o) {
    if (o == null) return '';
    if (typeof o !== 'object') return String(o);
    return String(o.label ?? o.value ?? '');
  }

  _valueOf(o) {
    if (o == null) return '';
    if (typeof o !== 'object') return String(o);
    return String(o.value ?? o.label ?? '');
  }

  _isDisabledOption(o) {
    return Boolean(o && typeof o === 'object' && o.disabled);
  }

  _source() {
    if (typeof this.fetchFn === 'function') return this._remote || [];
    return Array.isArray(this.options) ? this.options : [];
  }

  _flat(list = this._source()) {
    return list.flatMap((o) => (isGroup(o) ? o.options : [o]));
  }

  /** Nhãn hiển thị của giá trị hiện tại (không free-solo) */
  _displayLabel() {
    if (this._isEmpty()) return '';
    const v = String(this.value);
    if (this._selected && this._valueOf(this._selected) === v) return this._labelOf(this._selected);
    const all = [...this._flat(Array.isArray(this.options) ? this.options : []), ...this._flat(this._remote || [])];
    const found = all.find((o) => this._valueOf(o) === v);
    return found !== undefined ? this._labelOf(found) : v;
  }

  _syncTextFromValue() {
    const text = this._free ? (this.value == null ? '' : String(this.value)) : this._displayLabel();
    // Đang gõ (không free-solo) thì không ghi đè chữ người dùng
    if (!this._free && this._typing) return;
    this._text = text;
    if (this._input.value !== text) this._input.value = text;
    this._syncClasses();
  }

  /** Lọc theo nhãn (không dấu), giữ nhóm; fetchFn tự lọc phía server */
  _applyFilter() {
    const q = this._text.trim();
    const remote = typeof this.fetchFn === 'function';
    const custom = typeof this.filterFn === 'function' ? this.filterFn : null;
    const match = (o) => {
      if (remote || !q) return true;
      if (custom) return Boolean(custom(o, q));
      return matchRange(this._labelOf(o), q) !== null;
    };
    const limit = this.limit > 0 ? this.limit : Infinity;
    const rows = [];
    const items = [];
    let gid = 0;
    for (const entry of this._source()) {
      if (items.length >= limit) break;
      if (isGroup(entry)) {
        const kids = entry.options.filter(match).slice(0, limit - items.length);
        if (!kids.length) continue;
        const id = gid++;
        rows.push({ group: String(entry.label ?? ''), gid: id });
        for (const k of kids) {
          rows.push({ index: items.length, gid: id });
          items.push(k);
        }
      } else if (match(entry)) {
        rows.push({ index: items.length, gid: null });
        items.push(entry);
      }
    }
    this._rows = rows;
    this._items = items;
  }

  // =====================================================
  // VẼ DANH SÁCH
  // =====================================================

  _createOption(o, index) {
    const disabled = this._isDisabledOption(o);
    const selected = !this._free && !this._isEmpty() && this._valueOf(o) === String(this.value);
    const el = createElement('div', {
      className: 'ac__option', role: 'option', id: `opt-${index}`, dataset: { index: String(index) },
      'aria-selected': String(selected),
    });
    el.setAttribute('part', ['option', selected && 'option-selected', disabled && 'option-disabled'].filter(Boolean).join(' '));
    if (disabled) el.setAttribute('aria-disabled', 'true');
    if (selected) el.classList.add('ac__option--selected');

    const custom = typeof this.renderOption === 'function' ? this.renderOption(o, { query: this._text }) : null;
    if (custom != null) {
      el.append(custom instanceof Node ? custom : document.createTextNode(String(custom)));
      return el;
    }
    if (o && typeof o === 'object' && o.icon) {
      el.append(createElement('hui-icon', { name: String(o.icon), className: 'ac__option-icon', part: 'option-icon', 'aria-hidden': 'true' }));
    }
    const body = createElement('span', { className: 'ac__option-body' },
      createElement('span', { className: 'ac__option-label' }, ...highlight(this._labelOf(o), this._text)));
    if (o && typeof o === 'object' && o.description) {
      body.append(createElement('span', { className: 'ac__option-desc', part: 'option-description' }, String(o.description)));
    }
    el.append(body);
    return el;
  }

  /** Vẽ gợi ý + dòng trạng thái. Trả về true nếu popup có nội dung để hiện */
  _renderList() {
    const busy = this.loading || this._fetching;
    this._optionEls = [];
    const children = [];
    const groups = new Map();
    for (const row of this._rows) {
      if (row.group !== undefined) {
        const id = `group-${row.gid}`;
        const wrap = createElement('div', { role: 'group', 'aria-labelledby': id, className: 'ac__group' },
          createElement('div', { className: 'ac__group-label', part: 'group-label', id }, row.group));
        groups.set(row.gid, wrap);
        children.push(wrap);
        continue;
      }
      const el = this._createOption(this._items[row.index], row.index);
      this._optionEls[row.index] = el;
      if (row.gid !== null) groups.get(row.gid).append(el);
      else children.push(el);
    }
    this._listbox.replaceChildren(...children);
    this._listbox.toggleAttribute('aria-busy', busy);

    let status = '';
    if (busy && !this._items.length) status = t('common.loading');
    else if (this._fetchError) status = msg('autocomplete.error');
    else if (!this._items.length && this._text.trim() && !this._free) status = msg('autocomplete.noResults');
    this._status.textContent = status;
    this._status.hidden = !status;
    this._status.setAttribute('part', busy ? 'empty loading' : 'empty');
    this._spinner.hidden = !busy;

    if (this._active >= this._items.length) this._active = -1;
    this._live.textContent = busy ? '' : this._items.length ? msg('autocomplete.count', { count: this._items.length }) : status;
    return this._items.length > 0 || Boolean(status);
  }

  /** Lọc lại + vẽ lại + đóng/mở popup theo nội dung */
  _refresh() {
    this._applyFilter();
    if (this.autoHighlight) this._active = this._step(-1, 1);
    else if (this._active >= this._items.length) this._active = -1;
    const hasContent = this._renderList();
    if (this._wantOpen && hasContent && this._hasSuggestions && !this.isDisabled && !this.readonly) this._openPopup();
    else this._closePopup();
    this._setActive(this._active, true);
  }

  _setActive(index, scroll = true) {
    this._optionEls.forEach((el, i) => {
      if (!el) return;
      const on = i === index;
      el.classList.toggle('ac__option--active', on);
      if (on) el.part.add('option-active');
      else el.part.remove('option-active');
    });
    this._active = index;
    const el = this._optionEls[index];
    if (el && this._visible) {
      this._input.setAttribute('aria-activedescendant', el.id);
      if (scroll) {
        const list = this._listbox;
        if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
        }
      }
    } else {
      this._input.removeAttribute('aria-activedescendant');
    }
  }

  /** Index gợi ý bật kế tiếp theo hướng dir (vòng lại); không có thì -1 */
  _step(from, dir) {
    const n = this._items.length;
    for (let k = 1; k <= n; k++) {
      const i = (((from + dir * k) % n) + n) % n;
      if (!this._isDisabledOption(this._items[i])) return i;
    }
    return -1;
  }

  // =====================================================
  // POPUP
  // =====================================================

  _openPopup() {
    if (this._visible) return;
    this._visible = true;
    ++this._token;
    // Lượt đóng trước còn giữ khung cuối (fill: forwards) → gỡ để popup không bị trong suốt
    this._dropdown.getAnimations?.().forEach((a) => a.cancel());
    showFloating(this._dropdown);
    this._stopAuto ||= autoUpdate(this._container, this._dropdown, () => this._position());
    if (!this.noAnimation && !animationsDisabled()) animateIn(this._dropdown, this._side === 'top' ? 'slide-up' : 'slide-down');
    this._overlay = openOverlay({
      element: this._dropdown,
      ignore: [this._container],
      restoreFocus: false,
      onEscape: () => {
        this._wantOpen = false;
        this._closePopup();
      },
      onClickOutside: () => {
        this._wantOpen = false;
        this._closePopup();
      },
    });
    this._input.setAttribute('aria-expanded', 'true');
    this.setState('open', true);
  }

  _closePopup(immediate = false) {
    if (!this._visible) return;
    this._visible = false;
    this._overlay?.close();
    this._overlay = null;
    this._input.setAttribute('aria-expanded', 'false');
    this._input.removeAttribute('aria-activedescendant');
    this.setState('open', false);
    const token = ++this._token;
    const done = () => {
      if (token !== this._token) return;
      this._stopAuto?.();
      this._stopAuto = null;
      hideFloating(this._dropdown);
      this._dropdown.getAnimations?.().forEach((a) => a.cancel());
    };
    if (immediate || this.noAnimation || animationsDisabled()) done();
    else animateOut(this._dropdown, 'fade').then(done);
  }

  _position() {
    const pos = computePosition(this._container, this._dropdown, { placement: 'bottom-start', offset: 4, matchWidth: 'width' });
    this._dropdown.style.left = `${pos.x}px`;
    this._dropdown.style.top = `${pos.y}px`;
    this._side = pos.side;
  }

  /** Mở danh sách gợi ý bằng code */
  showSuggestions() {
    this._wantOpen = true;
    this._maybeFetchNow();
    this._refresh();
  }

  hideSuggestions() {
    this._wantOpen = false;
    this._closePopup();
  }

  // =====================================================
  // GÕ / TẢI GỢI Ý
  // =====================================================

  _onInput() {
    this._text = this._input.value;
    this._typing = true;
    if (this._free) {
      this.value = this._text;
      this.emit('input', { value: this.value });
    }
    this._typing = false;
    this._active = -1;
    this._wantOpen = this._text.length >= this.minChars && (this._text.length > 0 || this.openOnFocus);
    this._scheduleSearch();
    if (typeof this.fetchFn !== 'function') this._refresh();
    this._syncClasses();
  }

  _scheduleSearch() {
    clearTimeout(this._timer);
    const query = this._text;
    const run = () => {
      this.emit('hui-search', { query, trigger: 'input' });
      if (typeof this.fetchFn !== 'function') return;
      if (query.length >= this.minChars && (query.length > 0 || this.openOnFocus)) this._fetch(query);
      else {
        this._abortCtrl?.abort();
        this._fetching = false;
        this._remote = null;
        this._refresh();
      }
    };
    if (this.debounce > 0) this._timer = setTimeout(run, this.debounce);
    else run();
  }

  /** Mở bằng phím / focus mà chưa có dữ liệu server → tải ngay */
  _maybeFetchNow() {
    if (typeof this.fetchFn === 'function' && this._remote === null && !this._fetching && this._text.length >= this.minChars) {
      this._fetch(this._text);
    }
  }

  async _fetch(query) {
    this._abortCtrl?.abort();
    const ctrl = new AbortController();
    this._abortCtrl = ctrl;
    const seq = ++this._seq;
    this._fetching = true;
    this._fetchError = null;
    this._refresh();
    let result = [];
    try {
      const res = await this.fetchFn(query, { signal: ctrl.signal });
      result = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    } catch (error) {
      if (ctrl.signal.aborted || seq !== this._seq) return;
      this._fetchError = error;
      this.emit('hui-error', { error });
    }
    if (seq !== this._seq) return; // đã có request mới hơn → bỏ kết quả cũ
    this._fetching = false;
    this._remote = result;
    this._refresh();
  }

  // =====================================================
  // CHỌN / XÓA / RỜI Ô
  // =====================================================

  _select(index) {
    const o = this._items[index];
    if (o === undefined || this._isDisabledOption(o)) return;
    const label = this._labelOf(o);
    const optionValue = this._valueOf(o);
    this._selected = o;
    this._text = label;
    this._input.value = label;
    const next = this._free ? label : optionValue;
    const changedValue = next !== String(this.value ?? '');
    this.value = next;
    this._wantOpen = false;
    this._closePopup();
    clearTimeout(this._timer);
    this.emit('hui-select', { value: optionValue, label, option: o });
    if (changedValue) {
      if (this._free) this.emit('input', { value: this.value });
      this.emit('change', { value: this.value, option: o });
    }
    this._focusValue = String(this.value);
    this.markInteracted();
    this._syncClasses();
  }

  _clear() {
    if (this.isDisabled || this.readonly) return;
    const had = !this._isEmpty();
    this._text = '';
    this._input.value = '';
    this._selected = null;
    clearTimeout(this._timer);
    this.value = '';
    if (this._free && had) this.emit('input', { value: '' });
    if (had) this.emit('change', { value: '', option: null });
    this._focusValue = '';
    this.emit('clear');
    this.emit('hui-search', { query: '', trigger: 'clear' });
    if (typeof this.fetchFn === 'function') this._remote = null;
    this._wantOpen = this.openOnFocus;
    this._refresh();
    this._input.focus();
    this._syncClasses();
  }

  _onFocus() {
    this._focusValue = String(this.value ?? '');
    if (this.openOnFocus && !this.readonly) {
      this._wantOpen = true;
      this._maybeFetchNow();
      this._refresh();
    }
  }

  _onBlur() {
    this._wantOpen = false;
    this._closePopup();
    if (!this._free) {
      const label = this._displayLabel();
      if (this._text !== label) {
        if (!this._text.trim() && !this._isEmpty()) {
          // Xóa hết chữ rồi rời ô → bỏ chọn
          this._selected = null;
          this.value = '';
          this.emit('change', { value: '', option: null });
        }
        this._text = this._displayLabel();
        this._input.value = this._text;
      }
    } else {
      this._commit();
    }
    this.markInteracted();
    this._syncClasses();
  }

  /** free-solo: phát change nếu chữ đã khác lúc focus */
  _commit() {
    const v = String(this.value ?? '');
    if (v !== this._focusValue) {
      this._focusValue = v;
      this.emit('change', { value: v, option: null });
    }
  }

  /** Enter khi không có gợi ý đang highlight (lớp con mở rộng) */
  _onEnter() {
    if (this._free) this._commit();
    this._wantOpen = false;
    this._closePopup();
  }

  // =====================================================
  // BÀN PHÍM (APG Combobox)
  // =====================================================

  _onKeydown(e) {
    if (this.isDisabled || this.readonly || e.isComposing) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!this._hasSuggestions) return;
        e.preventDefault();
        const down = e.key === 'ArrowDown';
        if (e.altKey) {
          // Alt+↓ mở không chọn; Alt+↑ đóng
          if (down) this.showSuggestions();
          else this.hideSuggestions();
          return;
        }
        if (!this._visible) {
          this._wantOpen = true;
          this._maybeFetchNow();
          this._refresh();
          if (this._active < 0) this._setActive(down ? this._step(-1, 1) : this._step(0, -1));
          return;
        }
        this._setActive(this._active < 0 ? (down ? this._step(-1, 1) : this._step(0, -1)) : this._step(this._active, down ? 1 : -1));
        break;
      }
      case 'Enter':
        if (this._visible && this._active >= 0) {
          e.preventDefault();
          this._select(this._active);
          return;
        }
        this._onEnter(e);
        break;
      case 'Escape':
        // Popup đang mở: overlay đã nhận Esc ở document (capture) → tới đây nghĩa là popup đóng → xóa chữ
        if (!this._visible && this._text) {
          e.preventDefault();
          this._clear();
        }
        break;
      case 'Tab':
        this._wantOpen = false;
        this._closePopup();
        break;
      default:
    }
  }

  // =====================================================
  // TRẠNG THÁI HIỂN THỊ
  // =====================================================

  _syncRole() {
    const input = this._input;
    if (this._comboRole) {
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-controls', 'listbox');
      input.setAttribute('aria-expanded', String(this._visible));
    } else {
      for (const a of ['role', 'aria-autocomplete', 'aria-controls', 'aria-expanded', 'aria-activedescendant']) input.removeAttribute(a);
    }
  }

  _syncAffixes() {
    this._prefix.hidden = !this._prefixSlot.assignedNodes().length;
    this._suffix.hidden = !this._suffixSlot.assignedNodes().length;
  }

  _syncMessage() {
    const text = this.error || this.hint || '';
    this._message.textContent = text;
    this._message.hidden = !text;
    this._message.className = `ac__message ac__message--${this.error ? 'error' : 'hint'}`;
    if (text) this._input.setAttribute('aria-describedby', 'message');
    else this._input.removeAttribute('aria-describedby');
    if (this.error || this.status === 'error') this._input.setAttribute('aria-invalid', 'true');
    else this._input.removeAttribute('aria-invalid');
  }

  _syncClasses() {
    if (!this._wrapper) return;
    const tone = this.error || this.status === 'error' ? 'error' : this.status === 'warning' ? 'warning' : '';
    const hasText = this._input.value.length > 0;
    this._wrapper.className = [
      'ac', `ac--${this.effectiveSize}`, hasText ? 'ac--has-value' : '', tone ? `ac--${tone}` : '',
      this.isDisabled ? 'ac--disabled' : '',
    ].filter(Boolean).join(' ');
    this._clearBtn.hidden = !this._clearEnabled || !hasText || this.isDisabled || this.readonly;
    if (this._prefix && this._prefixSlot) this._syncAffixes();
    this.setState('disabled', this.isDisabled);
  }

  // =====================================================
  // FORM
  // =====================================================

  validationAnchor() {
    return this._input;
  }

  formResetCallback() {
    this._selected = null;
    super.formResetCallback();
    this._syncTextFromValue();
  }

  focus(options) {
    if (this._input) this._input.focus(options);
    else super.focus(options);
  }

  blur() {
    this._input?.blur();
  }
}

defineElement('hui-autocomplete', HuiAutocomplete);

export default HuiAutocomplete;
