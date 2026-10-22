/**
 * HUI Mentions — Ô nhập nhắc tên (Ant Mentions), tham gia <form> native (giá trị là chữ thuần).
 * Gõ ký tự kích hoạt (`prefix`, mặc định "@", nhiều ký tự: "@,#") → danh sách gợi ý nổi ngay tại con trỏ
 * (đo vị trí con trỏ bằng "mirror div"). Gợi ý từ `options` (lọc không dấu) hoặc `fetchFn` (debounce, hủy request cũ).
 * Bàn phím theo WAI-ARIA APG Combobox đặt trên chính textarea / input (aria-activedescendant).
 */

import styles from './hui-mentions.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { autoUpdate, computePosition, floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { openOverlay } from '../../utils/overlay.js';
import '../hui-avatar/hui-avatar.js';

const FALLBACK = {
  'mentions.label': { vi: 'Gợi ý nhắc tên', en: 'Mention suggestions' },
  'mentions.noResults': { vi: 'Không tìm thấy', en: 'No matches' },
  'mentions.error': { vi: 'Không tải được gợi ý', en: 'Could not load suggestions' },
  'mentions.count': { vi: '{count} gợi ý', en: '{count} suggestions' },
  'mentions.tooLong': { vi: 'Vượt quá số ký tự cho phép', en: 'Exceeds the character limit' },
  'common.loading': { vi: 'Đang tải...', en: 'Loading...' },
};

/** t() + chuỗi dự phòng khi locale.js chưa có key */
const tx = (key, vars) => {
  let v = t(key, vars);
  if (v !== key) return v;
  v = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : v;
};

// =====================================================
// TIỆN ÍCH CHUỖI
// =====================================================

/** Bỏ dấu + chữ thường: "Hà Nội" → "ha noi" */
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Vị trí [start, end) của query trong text (không dấu, không phân biệt hoa thường) — null nếu không khớp */
function matchRange(text, query) {
  const q = fold(query);
  if (!q) return null;
  const src = String(text ?? '');
  let norm = '';
  const map = [];
  for (let i = 0; i < src.length; i++) {
    for (const ch of fold(src[i])) {
      norm += ch;
      map.push(i);
    }
  }
  const idx = norm.indexOf(q);
  return idx < 0 ? null : [map[idx], map[idx + q.length - 1] + 1];
}

/** "@, #" | ['@', '#'] → ['@', '#'] */
const toPrefixes = (p) => (Array.isArray(p) ? p : String(p ?? '@').split(','))
  .map((s) => String(s).trim()).filter(Boolean);

const labelOf = (o) => (o != null && typeof o === 'object' ? String(o.label ?? o.value ?? '') : String(o ?? ''));
const valueOf = (o) => (o != null && typeof o === 'object' ? String(o.value ?? o.label ?? '') : String(o ?? ''));
/** Gợi ý chỉ dành cho một số prefix: { prefix: '#' } hoặc { prefix: ['@', '+'] } */
const allowsPrefix = (o, prefix) => {
  const p = o && typeof o === 'object' ? o.prefix : undefined;
  return p == null || (Array.isArray(p) ? p.includes(prefix) : String(p) === prefix);
};

/**
 * Tách các lần nhắc tên trong chuỗi.
 *   getMentions('Chào @An và #du-an', '@,#') → [{ prefix: '@', value: 'An', index: 5, end: 8 }, { prefix: '#', value: 'du-an', … }]
 * Có `options` → ưu tiên khớp NHÃN dài nhất (nhãn có khoảng trắng: "@Nguyễn Văn An") và trả kèm `option`.
 * @param {string} text
 * @param {string|string[]} [prefixes='@']
 * @param {{ split?: string, options?: Array }} [opts]
 * @returns {{ prefix: string, value: string, index: number, end: number, option?: any }[]}
 */
export function getMentions(text, prefixes = '@', { split = ' ', options } = {}) {
  const list = toPrefixes(prefixes).sort((a, b) => b.length - a.length);
  const labels = Array.isArray(options)
    ? options.map((o) => ({ label: labelOf(o), option: o })).filter((x) => x.label).sort((a, b) => b.label.length - a.label.length)
    : null;
  const s = String(text ?? '');
  const sep = split && split.trim() ? split : '';
  const boundary = (pos) => pos >= s.length || /\s/.test(s[pos]) || (sep && s.startsWith(sep, pos));
  const out = [];
  let i = 0;
  while (i < s.length) {
    const p = (i === 0 || /\s/.test(s[i - 1])) ? list.find((x) => s.startsWith(x, i)) : undefined;
    if (p) {
      const from = i + p.length;
      const hit = labels?.find((x) => allowsPrefix(x.option, p) && s.startsWith(x.label, from) && boundary(from + x.label.length));
      let value = hit?.label;
      if (!value) {
        let j = from;
        while (j < s.length && !boundary(j)) j++;
        value = s.slice(from, j);
      }
      if (value) {
        out.push({ prefix: p, value, index: i, end: from + value.length, ...(hit ? { option: hit.option } : {}) });
        i = from + value.length;
        continue;
      }
    }
    i++;
  }
  return out;
}

/** Thuộc tính style chép sang mirror div để chữ xuống dòng giống hệt ô nhập */
const MIRROR_PROPS = [
  'boxSizing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch', 'letterSpacing', 'lineHeight',
  'textTransform', 'textIndent', 'wordSpacing', 'tabSize', 'textAlign',
];

/**
 * Ô nhập nhắc tên.
 * @fires input - Chữ đổi (gõ hoặc chèn gợi ý). detail: { value }
 * @fires change - Rời ô khi giá trị đã đổi. detail: { value }
 * @fires hui-search - Chuỗi tìm sau prefix đổi (sau `debounce` ms). detail: { query, prefix }
 * @fires hui-select - Chọn một gợi ý. detail: { option, prefix, value, label }
 * @fires hui-error - fetchFn lỗi. detail: { error }
 * @csspart base - Khung ngoài (nhãn + ô + chân)
 * @csspart label - Nhãn
 * @csspart field - Ô nhập (textarea, hoặc input khi single-line) — cũng là khung viền
 * @csspart dropdown - Popup gợi ý
 * @csspart listbox - Danh sách gợi ý (role=listbox)
 * @csspart option - Mỗi gợi ý (+ option-active, option-disabled)
 * @csspart option-avatar - Ảnh đại diện của gợi ý (hui-avatar)
 * @csspart option-label - Nhãn gợi ý
 * @csspart option-description - Dòng mô tả phụ
 * @csspart highlight - Phần chữ khớp (<mark>)
 * @csspart empty - Dòng "Không tìm thấy" / "Đang tải..." / lỗi
 * @csspart footer - Hàng dưới ô: thông báo + bộ đếm
 * @csspart message - Thông báo lỗi / gợi ý
 * @csspart count - Bộ đếm ký tự
 * @cssprop --hui-mentions-padding - Khoảng đệm trong ô
 * @cssprop --hui-mentions-font-size - Cỡ chữ
 * @cssprop --hui-mentions-line-height - Chiều cao dòng
 * @cssprop --hui-mentions-radius - Bo góc ô
 * @cssprop --hui-mentions-bg - Nền ô
 * @cssprop --hui-mentions-color - Màu chữ
 * @cssprop --hui-mentions-border-color - Viền
 * @cssprop --hui-mentions-hover-border-color - Viền khi hover
 * @cssprop --hui-mentions-focus-border-color - Viền khi focus
 * @cssprop --hui-mentions-focus-shadow - Vòng sáng khi focus
 * @cssprop --hui-mentions-dropdown-bg - Nền popup
 * @cssprop --hui-mentions-dropdown-shadow - Đổ bóng popup
 * @cssprop --hui-mentions-dropdown-radius - Bo góc popup
 * @cssprop --hui-mentions-dropdown-width - Bề rộng popup (mặc định 240px)
 * @cssprop --hui-mentions-dropdown-max-height - Chiều cao tối đa danh sách
 * @cssprop --hui-mentions-option-active-bg - Nền gợi ý đang highlight
 * @cssprop --hui-mentions-highlight-color - Màu chữ phần khớp
 */
export class HuiMentions extends HuiFormElement {
  static properties = {
    /** Gợi ý: string[] / { value, label, avatar, description, disabled, prefix }[] — gán bằng property */
    options: { type: Array, default: [] },
    // Không đặt tên property là prefix (trùng Element.prefix native) → property mentionPrefix, attribute prefix
    /** Ký tự kích hoạt (attribute prefix), nhiều ký tự ngăn bằng dấu phẩy: "@" hoặc "@,#" */
    mentionPrefix: { type: String, default: '@', attribute: 'prefix' },
    /** Chuỗi chèn sau tên vừa chọn (mặc định 1 khoảng trắng) */
    split: { type: String, default: ' ' },
    /** async (query, { signal, prefix }) => options[] — gợi ý từ server */
    fetchFn: { type: Object, attribute: false },
    /** (option, query, prefix) => boolean — luật lọc riêng thay cho khớp nhãn không dấu */
    filterFn: { type: Object, attribute: false },
    /** (option, { query, prefix }) => Node | string — tự vẽ nội dung gợi ý */
    renderOption: { type: Object, attribute: false },
    /** Trì hoãn (ms) trước khi phát hui-search / gọi fetchFn */
    debounce: { type: Number, default: 200 },
    /** Ép hiện trạng thái đang tải */
    loading: { type: Boolean },
    /** Số gợi ý tối đa (0 = không giới hạn) */
    limit: { type: Number, default: 0 },
    /** auto | top | bottom — popup dưới con trỏ, auto = tự lật lên trên khi thiếu chỗ */
    placement: { type: String, default: 'auto' },
    /** Ô một dòng (<input>) thay cho textarea */
    singleLine: { type: Boolean },
    /** Số dòng hiển thị (khi không autosize) */
    rows: { type: Number, default: 3 },
    /** Tự cao theo nội dung (giới hạn bởi min-rows / max-rows) */
    autosize: { type: Boolean },
    /** autosize: số dòng tối thiểu */
    minRows: { type: Number },
    /** autosize: số dòng tối đa */
    maxRows: { type: Number },
    /** Chữ gợi ý khi ô trống */
    placeholder: { type: String, default: '' },
    /** Nhãn phía trên ô */
    label: { type: String, default: '' },
    /** Gợi ý nhỏ phía dưới */
    hint: { type: String, default: '' },
    /** Thông báo lỗi (viền đỏ) */
    error: { type: String, default: '' },
    /** Hiện bộ đếm ký tự */
    showCount: { type: Boolean },
    /** Tắt hiệu ứng mở popup */
    noAnimation: { type: Boolean },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._measure = null;
    this._dismissed = null;
    this._wantOpen = false;
    this._items = [];
    this._optionEls = [];
    this._active = -1;
    this._visible = false;
    this._remote = null;
    this._fetching = false;
    this._fetchError = null;
    this._abortCtrl = null;
    this._seq = 0;
    this._timer = 0;
    this._overlay = null;
    this._stopAuto = null;
    this._token = 0;
    this._focusValue = '';
  }

  /** Các ký tự kích hoạt đã tách */
  get prefixes() {
    return toPrefixes(this.mentionPrefix);
  }

  /** Danh sách nhắc tên trong value hiện tại (khớp nhãn của options) */
  get mentions() {
    return getMentions(this.value, this.mentionPrefix, { split: this.split, options: Array.isArray(this.options) ? this.options : undefined });
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    this._label = createElement('label', { className: 'mn__label', part: 'label', for: 'field' });
    this._control = createElement('div', { className: 'mn__control' });

    this._listbox = createElement('div', { className: 'mn__listbox', part: 'listbox', role: 'listbox', id: 'listbox' });
    this._listbox.addEventListener('click', (e) => {
      const el = e.target.closest?.('[role="option"]');
      if (el) this._select(Number(el.dataset.index));
    });
    this._listbox.addEventListener('mousemove', (e) => {
      const el = e.target.closest?.('[role="option"]');
      if (el && !el.hasAttribute('aria-disabled') && Number(el.dataset.index) !== this._active) this._setActive(Number(el.dataset.index), false);
    });
    this._status = createElement('div', { className: 'mn__status', part: 'empty', hidden: true });
    this._dropdown = createElement('div', { className: 'hui-floating mn__dropdown', part: 'dropdown', hidden: true },
      this._listbox, this._status);
    // Giữ focus ở ô nhập khi bấm vào popup
    this._dropdown.addEventListener('mousedown', (e) => e.preventDefault());

    this._message = createElement('div', { className: 'mn__message', part: 'message', id: 'message' });
    this._count = createElement('span', { className: 'mn__count', part: 'count', 'aria-hidden': 'true' });
    this._footer = createElement('div', { className: 'mn__footer', part: 'footer' }, this._message, this._count);
    this._live = createElement('div', { className: 'mn__sr', role: 'status', 'aria-live': 'polite' });
    this._mirror = createElement('div', { className: 'mn__mirror', 'aria-hidden': 'true' });

    this._wrapper = createElement('div', { className: 'mn', part: 'base' },
      this._label, this._control, this._footer, this._dropdown, this._live, this._mirror);

    this._ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
      const w = this._field?.clientWidth;
      if (w !== this._lastWidth) {
        this._lastWidth = w;
        this._autoResize();
      }
    }) : null;
    return this._wrapper;
  }

  /** Dựng ô nhập (textarea / input) — gọi lại khi đổi single-line */
  _buildField() {
    const old = this._field;
    const multi = !this.singleLine;
    const f = createElement(multi ? 'textarea' : 'input', {
      className: `mn__field ${multi ? 'mn__field--multi' : 'mn__field--single'}`, part: 'field', id: 'field',
      role: 'combobox', 'aria-autocomplete': 'list', 'aria-controls': 'listbox', 'aria-expanded': 'false', 'aria-haspopup': 'listbox',
      autocomplete: 'off',
    });
    if (multi) f.setAttribute('aria-multiline', 'true');
    else f.type = 'text';
    f.value = this.value == null ? '' : String(this.value);

    f.addEventListener('input', (e) => {
      e.stopPropagation();
      this.value = f.value;
      this.emit('input', { value: this.value });
      this._syncCount();
      this._autoResize();
      this._check();
    });
    f.addEventListener('change', (e) => e.stopPropagation());
    f.addEventListener('keydown', (e) => this._onKeydown(e));
    f.addEventListener('keyup', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)
        || (!this._visible && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))) this._check();
    });
    f.addEventListener('click', () => this._check());
    f.addEventListener('focus', () => {
      this._focusValue = String(this.value ?? '');
    });
    f.addEventListener('blur', () => this._onBlur());
    f.addEventListener('scroll', () => {
      if (this._visible) this._position();
    });

    if (old) {
      this._ro?.unobserve(old);
      old.replaceWith(f);
    } else this._control.append(f);
    this._field = f;
    if (this.isConnected) this._ro?.observe(f);
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._field) this._ro?.observe(this._field);
    this._autoResize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    clearTimeout(this._timer);
    this._abortCtrl?.abort();
    this._close(true);
  }

  updated(changed) {
    const rebuilt = changed.has('singleLine');
    if (rebuilt) this._buildField();
    const f = this._field;
    const has = (k) => rebuilt || changed.has(k);

    if (has('value')) {
      const v = this.value == null ? '' : String(this.value);
      if (f.value !== v) f.value = v;
    }
    if (has('placeholder')) f.placeholder = this.placeholder || '';
    if (has('name')) f.name = this.name || '';
    if (has('readonly')) f.readOnly = this.readonly;
    if (has('disabled')) {
      f.disabled = this.isDisabled;
      if (this.isDisabled) this._close();
    }
    if (has('maxlength')) {
      if (this.maxlength != null) f.maxLength = this.maxlength;
      else f.removeAttribute('maxlength');
    }
    if (has('required')) f.toggleAttribute('aria-required', this.required);
    if (has('label')) {
      this._label.textContent = this.label || '';
      this._label.hidden = !this.label;
    }
    if (has('locale') || has('label')) this._listbox.setAttribute('aria-label', this.label || tx('mentions.label'));
    if (['error', 'hint', 'status'].some(has)) this._syncMessage();
    if (this._visible && ['options', 'loading', 'filterFn', 'renderOption', 'limit', 'locale'].some((k) => changed.has(k))) this._refresh();
    if (changed.has('mentionPrefix') || changed.has('split')) this._check();

    this._syncClasses();
    this._syncCount();
    if (['value', 'rows', 'autosize', 'minRows', 'maxRows', 'size', 'singleLine'].some(has)) this._autoResize();
    super.updated(changed);
  }

  // =====================================================
  // AUTOSIZE / BỘ ĐẾM / THÔNG BÁO
  // =====================================================

  /** Giống hui-textarea: đặt rows=1 + height:auto để đo scrollHeight rồi kẹp trong [min-rows, max-rows] */
  _autoResize() {
    const ta = this._field;
    if (!ta || this.singleLine) return;
    if (!this.autosize) {
      ta.rows = Math.max(1, this.rows || 3);
      ta.style.height = '';
      ta.style.overflowY = '';
      return;
    }
    if (!this.isConnected) return;
    const cs = getComputedStyle(ta);
    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5 || 20;
    const borders = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const extra = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + borders;
    const minH = Math.max(1, this.minRows || 1) * lineHeight + extra;
    const maxH = this.maxRows ? Math.max(this.maxRows, this.minRows || 1) * lineHeight + extra : Infinity;
    const scrollTop = ta.scrollTop;
    ta.rows = 1;
    ta.style.height = 'auto';
    const content = ta.scrollHeight + borders;
    ta.style.height = `${Math.min(Math.max(content, minH), maxH)}px`;
    ta.style.overflowY = content > maxH ? 'auto' : 'hidden';
    ta.scrollTop = scrollTop;
  }

  _syncCount() {
    this._count.hidden = !this.showCount;
    if (!this.showCount) return;
    const len = String(this.value ?? '').length;
    const max = this.maxlength;
    this._count.textContent = max != null ? `${len} / ${max}` : String(len);
    this._count.classList.toggle('mn__count--exceed', max != null && len > max);
  }

  _syncMessage() {
    const text = this.error || this.hint || '';
    this._message.textContent = text;
    this._message.className = `mn__message mn__message--${this.error ? 'error' : 'hint'}`;
    if (text) this._field.setAttribute('aria-describedby', 'message');
    else this._field.removeAttribute('aria-describedby');
    if (this.error || this.status === 'error') this._field.setAttribute('aria-invalid', 'true');
    else this._field.removeAttribute('aria-invalid');
  }

  _syncClasses() {
    const tone = this.error || this.status === 'error' ? 'error' : this.status === 'warning' ? 'warning' : '';
    this._wrapper.className = [
      'mn', `mn--${this.effectiveSize}`, this.singleLine ? 'mn--single' : 'mn--multi', tone ? `mn--${tone}` : '',
      this.isDisabled ? 'mn--disabled' : '', this.autosize ? 'mn--autosize' : '',
    ].filter(Boolean).join(' ');
    this._footer.hidden = !this.showCount && !(this.error || this.hint);
    this.setState('disabled', this.isDisabled);
  }

  // =====================================================
  // DÒ PREFIX TẠI CON TRỎ
  // =====================================================

  /** { prefix, query, start, caret } nếu con trỏ đang đứng sau một prefix hợp lệ, ngược lại null */
  _measureAt() {
    const f = this._field;
    if (!f || f.selectionStart == null || f.selectionStart !== f.selectionEnd) return null;
    const caret = f.selectionStart;
    const before = f.value.slice(0, caret);
    let best = null;
    for (const p of this.prefixes) {
      const i = before.lastIndexOf(p);
      if (i >= 0 && (!best || i > best.start)) best = { prefix: p, start: i };
    }
    if (!best) return null;
    // Prefix phải đứng đầu chuỗi hoặc sau khoảng trắng (email "a@b" không kích hoạt)
    if (best.start > 0 && !/\s/.test(before[best.start - 1])) return null;
    const query = before.slice(best.start + best.prefix.length);
    if (/\s/.test(query)) return null;
    if (this.split && this.split.trim() && query.includes(this.split)) return null;
    return { ...best, query, caret };
  }

  /** Gọi sau mỗi lần gõ / di chuyển con trỏ: mở, cập nhật hoặc đóng gợi ý */
  _check() {
    if (this.isDisabled || this.readonly) return;
    const m = this._measureAt();
    if (!m) {
      this._dismissed = null;
      this._close();
      return;
    }
    // Esc / vừa chèn tên tại đúng vị trí này → không tự mở lại
    if (this._dismissed && this._dismissed.start === m.start && this._dismissed.prefix === m.prefix) {
      this._close();
      return;
    }
    this._dismissed = null;
    const prev = this._measure;
    this._measure = m;
    const changedQuery = !prev || !this._wantOpen || prev.query !== m.query || prev.prefix !== m.prefix || prev.start !== m.start;
    this._wantOpen = true;
    if (changedQuery) {
      this._active = -1;
      this._scheduleSearch(m, prev && prev.prefix === m.prefix && prev.start === m.start);
      if (typeof this.fetchFn !== 'function') this._refresh();
    } else if (this._visible) this._position();
  }

  _scheduleSearch(m, typing) {
    clearTimeout(this._timer);
    const remote = typeof this.fetchFn === 'function';
    const run = () => {
      this.emit('hui-search', { query: m.query, prefix: m.prefix });
      if (remote) this._fetch(m);
    };
    if (remote && !typing) {
      // Vừa gõ prefix → hiện "Đang tải..." ngay thay vì danh sách cũ
      this._remote = null;
      this._fetching = true;
      this._refresh();
    }
    if (this.debounce > 0) this._timer = setTimeout(run, this.debounce);
    else run();
  }

  async _fetch(m) {
    this._abortCtrl?.abort();
    const ctrl = new AbortController();
    this._abortCtrl = ctrl;
    const seq = ++this._seq;
    this._fetching = true;
    this._fetchError = null;
    this._refresh();
    let result = [];
    try {
      const res = await this.fetchFn(m.query, { signal: ctrl.signal, prefix: m.prefix });
      result = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    } catch (error) {
      if (ctrl.signal.aborted || seq !== this._seq) return;
      this._fetchError = error;
      this.emit('hui-error', { error });
    }
    if (seq !== this._seq) return; // đã có request mới hơn
    this._fetching = false;
    this._remote = result;
    this._refresh();
  }

  // =====================================================
  // DANH SÁCH GỢI Ý
  // =====================================================

  _applyFilter() {
    const m = this._measure;
    if (!m) {
      this._items = [];
      return;
    }
    const remote = typeof this.fetchFn === 'function';
    const src = remote ? this._remote || [] : Array.isArray(this.options) ? this.options : [];
    const custom = typeof this.filterFn === 'function' ? this.filterFn : null;
    const q = m.query;
    const match = (o) => {
      if (!allowsPrefix(o, m.prefix)) return false;
      if (remote) return true;
      if (custom) return Boolean(custom(o, q, m.prefix));
      return !q || matchRange(labelOf(o), q) !== null || matchRange(valueOf(o), q) !== null;
    };
    const items = src.filter(match);
    this._items = this.limit > 0 ? items.slice(0, this.limit) : items;
  }

  _highlight(text) {
    const q = this._measure?.query;
    const range = q ? matchRange(text, q) : null;
    if (!range) return [document.createTextNode(text)];
    const [a, b] = range;
    return [
      document.createTextNode(text.slice(0, a)),
      createElement('mark', { className: 'mn__mark', part: 'highlight' }, text.slice(a, b)),
      document.createTextNode(text.slice(b)),
    ];
  }

  _createOption(o, index) {
    const disabled = Boolean(o && typeof o === 'object' && o.disabled);
    const el = createElement('div', {
      className: 'mn__option', role: 'option', id: `opt-${index}`, dataset: { index: String(index) }, 'aria-selected': 'false',
    });
    el.setAttribute('part', disabled ? 'option option-disabled' : 'option');
    if (disabled) el.setAttribute('aria-disabled', 'true');
    const custom = typeof this.renderOption === 'function'
      ? this.renderOption(o, { query: this._measure?.query ?? '', prefix: this._measure?.prefix ?? '' }) : null;
    if (custom != null) {
      el.append(custom instanceof Node ? custom : document.createTextNode(String(custom)));
      return el;
    }
    const label = labelOf(o);
    if (o && typeof o === 'object' && 'avatar' in o) {
      const av = createElement('hui-avatar', { className: 'mn__avatar', part: 'option-avatar', size: '24', name: label, 'aria-hidden': 'true' });
      if (o.avatar && typeof o.avatar === 'string') av.setAttribute('src', o.avatar);
      el.append(av);
    }
    const body = createElement('span', { className: 'mn__option-body' },
      createElement('span', { className: 'mn__option-label', part: 'option-label' }, ...this._highlight(label)));
    if (o && typeof o === 'object' && o.description) {
      body.append(createElement('span', { className: 'mn__option-desc', part: 'option-description' }, String(o.description)));
    }
    el.append(body);
    return el;
  }

  /** Lọc + vẽ lại + đóng/mở popup */
  _refresh() {
    if (!this._wantOpen || !this._measure) {
      this._close();
      return;
    }
    this._applyFilter();
    const busy = this.loading || this._fetching;
    this._optionEls = this._items.map((o, i) => this._createOption(o, i));
    this._listbox.replaceChildren(...this._optionEls);
    this._listbox.toggleAttribute('aria-busy', busy);

    let status = '';
    if (busy && !this._items.length) status = tx('common.loading');
    else if (this._fetchError) status = tx('mentions.error');
    else if (!this._items.length) status = tx('mentions.noResults');
    this._status.textContent = status;
    this._status.hidden = !status;
    this._status.setAttribute('part', busy ? 'empty loading' : 'empty');
    this._live.textContent = busy ? '' : this._items.length ? tx('mentions.count', { count: this._items.length }) : status;

    // Ant: luôn highlight gợi ý đầu tiên → Enter chọn luôn
    if (this._active < 0 || this._active >= this._items.length) this._active = this._step(-1, 1);
    this._open();
    this._setActive(this._active, true);
    this._position();
  }

  _step(from, dir) {
    const n = this._items.length;
    for (let k = 1; k <= n; k++) {
      const i = (((from + dir * k) % n) + n) % n;
      const o = this._items[i];
      if (!(o && typeof o === 'object' && o.disabled)) return i;
    }
    return -1;
  }

  _setActive(index, scroll = true) {
    this._optionEls.forEach((el, i) => {
      const on = i === index;
      el.classList.toggle('mn__option--active', on);
      el.setAttribute('aria-selected', String(on));
      if (on) el.part.add('option-active');
      else el.part.remove('option-active');
    });
    this._active = index;
    const el = this._optionEls[index];
    if (el && this._visible) {
      this._field.setAttribute('aria-activedescendant', el.id);
      if (scroll) {
        const list = this._listbox;
        if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
        else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
          list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
        }
      }
    } else this._field.removeAttribute('aria-activedescendant');
  }

  // =====================================================
  // CHỌN
  // =====================================================

  _select(index) {
    const o = this._items[index];
    const m = this._measure;
    if (o === undefined || !m || (o && typeof o === 'object' && o.disabled)) return;
    const f = this._field;
    const label = labelOf(o);
    const text = `${m.prefix}${label}${this.split ?? ''}`;
    const next = f.value.slice(0, m.start) + text + f.value.slice(m.caret);
    if (this.maxlength != null && next.length > this.maxlength) {
      this._live.textContent = tx('mentions.tooLong');
      return;
    }
    f.focus();
    // Gán value + đặt con trỏ (không dùng setRangeText để thư viện test / framework theo dõi được con trỏ)
    f.value = next;
    f.setSelectionRange(m.start + text.length, m.start + text.length);
    this._dismissed = { start: m.start, prefix: m.prefix };
    this._close();
    this.value = f.value;
    this.emit('input', { value: this.value });
    this.emit('hui-select', { option: o, prefix: m.prefix, value: valueOf(o), label });
    this._syncCount();
    this._autoResize();
  }

  // =====================================================
  // POPUP
  // =====================================================

  _open() {
    if (this._visible) return;
    this._visible = true;
    ++this._token;
    this._dropdown.getAnimations?.().forEach((a) => a.cancel());
    showFloating(this._dropdown);
    this._position();
    // Tham chiếu ảo = vị trí con trỏ → autoUpdate chỉ bám cuộn / đổi kích thước
    this._stopAuto ||= autoUpdate({ getBoundingClientRect: () => this._caretRect() }, this._dropdown, () => this._position());
    if (!this.noAnimation && !animationsDisabled()) animateIn(this._dropdown, this._side === 'top' ? 'slide-up' : 'slide-down');
    this._overlay = openOverlay({
      element: this._dropdown,
      ignore: [this._field],
      restoreFocus: false,
      onEscape: () => this._dismiss(),
      onClickOutside: () => this._close(),
    });
    this._field.setAttribute('aria-expanded', 'true');
    this.setState('open', true);
  }

  _close(immediate = false) {
    this._wantOpen = false;
    clearTimeout(this._timer);
    if (!this._visible) return;
    this._visible = false;
    this._overlay?.close();
    this._overlay = null;
    this._field.setAttribute('aria-expanded', 'false');
    this._field.removeAttribute('aria-activedescendant');
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

  /** Esc: đóng và không tự mở lại cho tới khi gõ prefix mới */
  _dismiss() {
    if (this._measure) this._dismissed = { start: this._measure.start, prefix: this._measure.prefix };
    this._close();
  }

  /**
   * Toạ độ viewport của con trỏ trong ô nhập: dựng "mirror div" chép style chữ của ô,
   * đặt chữ trước con trỏ + 1 <span> → vị trí span = vị trí con trỏ.
   */
  _caretRect() {
    const f = this._field;
    const r = f.getBoundingClientRect();
    const caret = this._measure ? this._measure.start : f.selectionStart ?? 0;
    const cs = getComputedStyle(f);
    const mirror = this._mirror;
    for (const p of MIRROR_PROPS) mirror.style[p] = cs[p];
    const bl = parseFloat(cs.borderLeftWidth) || 0;
    const br = parseFloat(cs.borderRightWidth) || 0;
    const bt = parseFloat(cs.borderTopWidth) || 0;
    // Trừ thanh cuộn dọc để chữ xuống dòng đúng chỗ như trong textarea
    const scrollbar = Math.max(0, f.offsetWidth - f.clientWidth - bl - br);
    mirror.style.boxSizing = 'border-box';
    mirror.style.width = `${f.offsetWidth - scrollbar}px`;
    mirror.style.whiteSpace = this.singleLine ? 'pre' : 'pre-wrap';
    const span = createElement('span', {}, f.value.slice(caret) || '.');
    mirror.replaceChildren(document.createTextNode(f.value.slice(0, caret)), span);
    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 20;
    const x = r.left + bl + span.offsetLeft - f.scrollLeft;
    let top;
    let height;
    if (this.singleLine) {
      top = r.top;
      height = r.height;
    } else {
      top = r.top + bt + span.offsetTop - f.scrollTop;
      // Con trỏ cuộn khuất → kẹp trong khung ô
      top = Math.min(Math.max(top, r.top), r.bottom - lineHeight);
      height = lineHeight;
    }
    const left = Math.min(Math.max(x, r.left), r.right);
    mirror.replaceChildren();
    return { x: left, y: top, left, right: left, top, bottom: top + height, width: 0, height };
  }

  _position() {
    if (!this._visible) return;
    const ref = { getBoundingClientRect: () => this._caretRect() };
    const side = this.placement === 'top' ? 'top' : 'bottom';
    const pos = computePosition(ref, this._dropdown, { placement: `${side}-start`, offset: 4, flip: this.placement !== 'top' && this.placement !== 'bottom' });
    this._dropdown.style.left = `${pos.x}px`;
    this._dropdown.style.top = `${pos.y}px`;
    this._side = pos.side;
    this._dropdown.dataset.side = pos.side;
  }

  // =====================================================
  // BÀN PHÍM / FOCUS
  // =====================================================

  _onKeydown(e) {
    if (this.isDisabled || this.readonly || e.isComposing || !this._visible) return;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        const down = e.key === 'ArrowDown';
        this._setActive(this._active < 0 ? this._step(down ? -1 : 0, down ? 1 : -1) : this._step(this._active, down ? 1 : -1));
        break;
      }
      case 'Enter':
      case 'Tab':
        if (this._active >= 0 && !e.shiftKey) {
          e.preventDefault();
          this._select(this._active);
        } else if (e.key === 'Tab') this._close();
        break;
      default:
    }
  }

  _onBlur() {
    this._close();
    this.markInteracted();
    const v = String(this.value ?? '');
    if (v !== this._focusValue) {
      this._focusValue = v;
      this.emit('change', { value: v });
    }
  }

  // =====================================================
  // FORM / API
  // =====================================================

  validationAnchor() {
    return this._field;
  }

  /** Đưa focus vào ô nhập */
  focus(options) {
    if (this._field) this._field.focus(options);
    else super.focus(options);
  }

  blur() {
    this._field?.blur();
  }

  /** Chèn chữ tại con trỏ (vd: nút "@" trên toolbar) rồi dò gợi ý */
  insertText(text) {
    const f = this._field;
    if (!f || this.isDisabled || this.readonly) return;
    f.focus();
    const start = f.selectionStart ?? f.value.length;
    const str = String(text);
    f.value = f.value.slice(0, start) + str + f.value.slice(f.selectionEnd ?? start);
    f.setSelectionRange(start + str.length, start + str.length);
    this.value = f.value;
    this.emit('input', { value: this.value });
    this._syncCount();
    this._autoResize();
    this._check();
  }
}

defineElement('hui-mentions', HuiMentions);

export default HuiMentions;
