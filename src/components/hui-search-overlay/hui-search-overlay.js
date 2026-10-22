/**
 * HUI Search Overlay — Bấm kính lúp (hoặc phím `/`, Ctrl/⌘+K) → lớp phủ toàn màn hình với ô tìm lớn,
 * gợi ý (dữ liệu tĩnh hoặc fetchFn bất đồng bộ có debounce), lịch sử tìm kiếm, điều hướng bàn phím
 * theo mẫu APG combobox + listbox.
 */

import styles from './hui-search-overlay.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { openOverlay } from '../../utils/overlay.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-icon/index.js';
import '../hui-spinner/index.js';

let uid = 0;

const FALLBACK = {
  vi: {
    'searchOverlay.label': 'Tìm kiếm',
    'searchOverlay.placeholder': 'Tìm kiếm…',
    'searchOverlay.open': 'Mở tìm kiếm',
    'searchOverlay.close': 'Đóng tìm kiếm',
    'searchOverlay.clear': 'Xóa nội dung tìm',
    'searchOverlay.recent': 'Tìm kiếm gần đây',
    'searchOverlay.clearRecent': 'Xóa lịch sử',
    'searchOverlay.removeRecent': 'Xóa "{query}" khỏi lịch sử',
    'searchOverlay.suggestions': 'Gợi ý',
    'searchOverlay.loading': 'Đang tìm…',
    'searchOverlay.noResults': 'Không tìm thấy kết quả cho "{query}"',
    'searchOverlay.error': 'Không tải được gợi ý',
    'searchOverlay.count': '{count} gợi ý',
    'searchOverlay.hintNavigate': 'di chuyển',
    'searchOverlay.hintSelect': 'chọn',
    'searchOverlay.hintClose': 'đóng',
  },
  en: {
    'searchOverlay.label': 'Search',
    'searchOverlay.placeholder': 'Search…',
    'searchOverlay.open': 'Open search',
    'searchOverlay.close': 'Close search',
    'searchOverlay.clear': 'Clear search',
    'searchOverlay.recent': 'Recent searches',
    'searchOverlay.clearRecent': 'Clear history',
    'searchOverlay.removeRecent': 'Remove "{query}" from history',
    'searchOverlay.suggestions': 'Suggestions',
    'searchOverlay.loading': 'Searching…',
    'searchOverlay.noResults': 'No results for "{query}"',
    'searchOverlay.error': 'Could not load suggestions',
    'searchOverlay.count': '{count} suggestions',
    'searchOverlay.hintNavigate': 'navigate',
    'searchOverlay.hintSelect': 'select',
    'searchOverlay.hintClose': 'close',
  },
};
function tx(key, vars) {
  let v = t(key, vars);
  if (v !== key) return v;
  v = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : v;
}

/** Bỏ dấu tiếng Việt + chữ thường để so khớp ("dien thoai" khớp "Điện thoại") */
function fold(str) {
  return String(str).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/** Tô đậm đoạn khớp. Chỉ khi mỗi ký tự gốc bỏ dấu còn đúng 1 ký tự (để vị trí trùng khớp) */
function highlight(text, query) {
  const src = String(text);
  const q = fold(query.trim());
  if (!q) return [src];
  const chars = [...src];
  const folded = chars.map((c) => fold(c));
  if (folded.some((f) => f.length !== 1)) return [src];
  const idx = folded.join('').indexOf(q);
  if (idx < 0) return [src];
  const qLen = [...q].length;
  return [
    chars.slice(0, idx).join(''),
    createElement('mark', { className: 'so__mark' }, chars.slice(idx, idx + qLen).join('')),
    chars.slice(idx + qLen).join(''),
  ];
}

function normalizeItem(it) {
  if (it === null || it === undefined) return null;
  if (typeof it !== 'object') return { label: String(it), value: String(it) };
  const label = String(it.label ?? it.value ?? '');
  return { ...it, label, value: it.value !== undefined ? String(it.value) : label };
}

/** localStorage có thể bị chặn → bọc try/catch */
function readRecent(key) {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}
function writeRecent(key, list) {
  try {
    if (list.length) localStorage.setItem(key, JSON.stringify(list));
    else localStorage.removeItem(key);
  } catch { /* không lưu được → chỉ nhớ trong phiên */ }
}

/**
 * Lớp phủ tìm kiếm. Gợi ý: `suggestions` (chuỗi hoặc { label, value, description, href, icon, group })
 * lọc tại chỗ (không phân biệt dấu), hoặc `fetchFn(query, { signal })` trả Promise mảng (debounce, hủy yêu cầu cũ).
 * `recent-key` → lưu lịch sử tìm trong localStorage, hiện khi ô tìm trống.
 *
 * @fires hui-search - Nhấn Enter (không chọn gợi ý) hoặc chọn mục lịch sử. Cancelable (preventDefault() → giữ lớp phủ mở). detail: { query, recent }
 * @fires hui-select - Chọn một gợi ý. Cancelable (preventDefault() → không đóng, không điều hướng href). detail: { item, query }
 * @fires hui-open - Lớp phủ mở
 * @fires hui-close - Lớp phủ đóng
 * @fires hui-error - fetchFn bị lỗi. detail: { error, query }
 * @slot - Phần tử kích hoạt (mặc định: nút kính lúp + gợi ý phím tắt)
 * @slot empty - Nội dung khi ô tìm trống và chưa có lịch sử (vd: từ khóa phổ biến)
 * @csspart trigger - Nút kính lúp mặc định
 * @csspart shortcut - Gợi ý phím tắt trên nút mặc định
 * @csspart dialog - Thẻ <dialog> toàn màn hình
 * @csspart panel - Cột nội dung giữa màn hình
 * @csspart bar - Hàng ô tìm
 * @csspart input - Ô nhập (role="combobox")
 * @csspart spinner - Biểu tượng đang tải
 * @csspart clear - Nút xóa nội dung
 * @csspart close - Nút đóng
 * @csspart results - Vùng kết quả
 * @csspart section-title - Tiêu đề nhóm (Gợi ý / Tìm kiếm gần đây / group)
 * @csspart clear-recent - Nút xóa lịch sử
 * @csspart listbox - Danh sách (role="listbox")
 * @csspart option - Một gợi ý (role="option")
 * @csspart option-active - Gợi ý đang được chọn bằng bàn phím
 * @csspart status - Dòng trạng thái (đang tìm / không có kết quả / lỗi)
 * @csspart footer - Gợi ý phím tắt cuối lớp phủ
 * @cssprop --hui-search-overlay-bg - Nền lớp phủ
 * @cssprop --hui-search-overlay-backdrop-filter - Hiệu ứng làm mờ nền trang phía sau
 * @cssprop --hui-search-overlay-max-width - Rộng tối đa cột nội dung
 * @cssprop --hui-search-overlay-top - Khoảng cách tới mép trên
 * @cssprop --hui-search-overlay-input-size - Cỡ chữ ô tìm
 * @cssprop --hui-search-overlay-input-color - Màu chữ ô tìm
 * @cssprop --hui-search-overlay-border-color - Đường kẻ dưới ô tìm
 * @cssprop --hui-search-overlay-accent - Màu nhấn (đường kẻ khi focus, chữ tô đậm)
 * @cssprop --hui-search-overlay-option-active-bg - Nền gợi ý đang chọn
 * @cssprop --hui-search-overlay-mark-bg - Nền đoạn chữ khớp
 * @cssprop --hui-search-overlay-z-index - z-index (khi trình duyệt không có top-layer)
 */
class HuiSearchOverlay extends HuiElement {
  static properties = {
    /** Trạng thái mở */
    open: { type: Boolean },
    /** Placeholder ô tìm (mặc định theo locale) */
    placeholder: { type: String },
    /** Gợi ý tĩnh: chuỗi hoặc { label, value, description, href, icon, group } */
    suggestions: { type: Array, default: null },
    /** Hàm lấy gợi ý bất đồng bộ (query, { signal }) => Promise<Array> — chỉ gán bằng property */
    fetchFn: { type: Object, attribute: false, default: null },
    /** Trễ trước khi gọi fetchFn (ms) */
    debounce: { type: Number, default: 250 },
    /** Số ký tự tối thiểu để bắt đầu gợi ý */
    minChars: { type: Number, default: 1 },
    /** Số gợi ý tối đa */
    maxResults: { type: Number, default: 8 },
    /** Khóa localStorage lưu lịch sử tìm (bỏ trống = không lưu) */
    recentKey: { type: String },
    /** Số mục lịch sử tối đa */
    maxRecent: { type: Number, default: 5 },
    /** Phím tắt mở, cách nhau bằng dấu cách: "/" | "mod+k" (Ctrl hoặc ⌘) | "ctrl+k" | "meta+k"; "none" = tắt */
    hotkeys: { type: String, default: '/ mod+k' },
    /** Nhãn hộp thoại (mặc định theo locale) */
    label: { type: String },
    /** Tắt hiệu ứng mở / đóng */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    this._query = '';
    this._results = [];   // { item, kind: 'suggestion' | 'recent' }
    this._active = -1;
    this._state = 'idle'; // idle | loading | done | error
    this._handle = null;
    this._token = 0;
    this._reqId = 0;
    this._timer = 0;
    this._abortCtl = null;
    this._memoryRecent = [];
  }

  // =====================================================
  // DOM
  // =====================================================

  render() {
    const id = this._uid;
    this._listId = `hui-so-list-${id}`;

    // Trigger: slot mặc định, fallback là nút kính lúp
    this._shortcut = createElement('kbd', { className: 'so__kbd', part: 'shortcut', 'aria-hidden': 'true' });
    this._fallbackBtn = createElement('button', { type: 'button', className: 'so__trigger', part: 'trigger', 'aria-haspopup': 'dialog' },
      createElement('hui-icon', { name: 'search' }), this._shortcut);
    // Nút mặc định nằm ngoài slot: khoảng trắng giữa các thẻ con cũng được gán vào slot mặc định
    // → fallback của <slot> sẽ không hiện; tự ẩn/hiện theo nội dung thật
    this._triggerSlot = createElement('slot');
    this._triggerSlot.addEventListener('slotchange', () => {
      this._fallbackBtn.hidden = this._hasCustomTrigger();
      this._syncTriggerAria();
    });
    this._triggerWrap = createElement('span', { className: 'so__trigger-wrap' }, this._triggerSlot, this._fallbackBtn);
    this._triggerWrap.addEventListener('click', () => this.show());

    // Hàng ô tìm
    this._input = createElement('input', {
      className: 'so__input', part: 'input', type: 'search', role: 'combobox', autocomplete: 'off', spellcheck: 'false',
      'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': this._listId, enterkeyhint: 'search', autofocus: true,
    });
    this._input.addEventListener('input', () => this._onInput());
    this._input.addEventListener('keydown', (e) => this._onKeydown(e));
    this._spinner = createElement('hui-spinner', { part: 'spinner', size: 'sm', color: 'inherit', className: 'so__spinner', hidden: true, 'aria-hidden': 'true' });
    this._clearBtn = createElement('button', { type: 'button', className: 'so__icon-btn', part: 'clear', hidden: true },
      createElement('hui-icon', { name: 'close' }));
    this._clearBtn.addEventListener('click', () => {
      this._input.value = '';
      this._onInput();
      this._input.focus();
    });
    this._closeBtn = createElement('button', { type: 'button', className: 'so__close', part: 'close' },
      createElement('kbd', { className: 'so__kbd' }, 'Esc'));
    this._closeBtn.addEventListener('click', () => this.hide());
    const bar = createElement('div', { className: 'so__bar', part: 'bar' },
      createElement('hui-icon', { name: 'search', className: 'so__bar-icon' }), this._input, this._spinner, this._clearBtn, this._closeBtn);

    // Kết quả
    this._sectionTitle = createElement('div', { className: 'so__section-title', part: 'section-title', id: `${this._listId}-title` });
    this._clearRecentBtn = createElement('button', { type: 'button', className: 'so__link-btn', part: 'clear-recent', hidden: true });
    this._clearRecentBtn.addEventListener('click', () => this.clearRecent());
    this._sectionHead = createElement('div', { className: 'so__section-head' }, this._sectionTitle, this._clearRecentBtn);
    this._listbox = createElement('ul', { className: 'so__listbox', part: 'listbox', id: this._listId, role: 'listbox' });
    this._listbox.addEventListener('mousedown', (e) => e.preventDefault()); // giữ focus ở ô tìm
    this._listbox.addEventListener('click', (e) => this._onOptionClick(e));
    this._status = createElement('div', { className: 'so__status', part: 'status', role: 'status', 'aria-live': 'polite' });
    this._emptySlot = createElement('slot', { name: 'empty' });
    this._empty = createElement('div', { className: 'so__empty' }, this._emptySlot);
    this._resultsEl = createElement('div', { className: 'so__results', part: 'results' },
      this._sectionHead, this._listbox, this._status, this._empty);

    this._footer = createElement('div', { className: 'so__footer', part: 'footer', 'aria-hidden': 'true' });

    this._panel = createElement('div', { className: 'so__panel', part: 'panel' }, bar, this._resultsEl, this._footer);
    this._dialog = createElement('dialog', { className: 'so__dialog', part: 'dialog' }, this._panel);
    // Esc do overlay manager xử lý; 'cancel' native (nút Back Android…) đi cùng đường đó
    this._dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      this.hide();
    });
    // Trình duyệt tự đóng dialog → đồng bộ lại trạng thái
    this._dialog.addEventListener('close', () => {
      // Sự kiện close đến muộn (task) — nếu đã mở lại thì bỏ qua
      if (this.open && !this._dialog.open) this.open = false;
    });
    // Click vùng nền (ngoài cột nội dung) → đóng
    this._dialog.addEventListener('click', (e) => {
      if (e.target === this._dialog) this.hide();
    });
    return [this._triggerWrap, this._dialog];
  }

  connectedCallback() {
    super.connectedCallback();
    this.listen(document, 'keydown', (e) => this._onHotkey(e));
    // Chặn hành vi Esc mặc định của <dialog> (đóng ngay, bỏ qua animation)
    this.listen(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this._dialog.open) e.preventDefault();
    }, { capture: true });
    if (this._mounted && this.open) this._show();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
    this._abortCtl?.abort();
    this._token++;
    this._handle?.close();
    this._handle = null;
    if (this._dialog.open) this._dialog.close();
  }

  updated(changed) {
    if (changed.has('locale') || changed.has('placeholder')) {
      this._input.placeholder = this.placeholder || tx('searchOverlay.placeholder');
    }
    if (changed.has('locale') || changed.has('label')) {
      const label = this.label || tx('searchOverlay.label');
      this._dialog.setAttribute('aria-label', label);
      this._input.setAttribute('aria-label', label);
      this._fallbackBtn.setAttribute('aria-label', tx('searchOverlay.open'));
      this._clearBtn.setAttribute('aria-label', tx('searchOverlay.clear'));
      this._closeBtn.setAttribute('aria-label', tx('searchOverlay.close'));
      this._clearRecentBtn.textContent = tx('searchOverlay.clearRecent');
      this._footer.replaceChildren(
        createElement('span', {}, createElement('kbd', { className: 'so__kbd' }, '↑'), createElement('kbd', { className: 'so__kbd' }, '↓'), ` ${tx('searchOverlay.hintNavigate')}`),
        createElement('span', {}, createElement('kbd', { className: 'so__kbd' }, 'Enter'), ` ${tx('searchOverlay.hintSelect')}`),
        createElement('span', {}, createElement('kbd', { className: 'so__kbd' }, 'Esc'), ` ${tx('searchOverlay.hintClose')}`),
      );
      if (this._mounted) this._renderResults();
    }
    if (changed.has('hotkeys')) {
      const keys = this._hotkeyList;
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
      const show = keys.includes('mod+k') ? (isMac ? '⌘K' : 'Ctrl K') : keys.includes('/') ? '/' : keys.includes('ctrl+k') ? 'Ctrl K' : keys.includes('meta+k') ? '⌘K' : '';
      this._shortcut.textContent = show;
      this._shortcut.hidden = !show;
    }
    if (changed.has('suggestions') && this._mounted && this._dialog.open) this._runQuery(true);
    if (changed.has('open')) {
      if (this.open) this._show();
      else if (this._mounted) this._hide();
    }
  }

  firstUpdated() {
    this._mounted = true;
    this._syncTriggerAria();
  }

  // =====================================================
  // MỞ / ĐÓNG
  // =====================================================

  /** Mở lớp phủ */
  show() {
    this.open = true;
  }

  /** Đóng lớp phủ */
  hide() {
    this.open = false;
  }

  /** Nội dung đang nhập */
  get query() {
    return this._query;
  }

  set query(v) {
    this._input.value = v ?? '';
    this._onInput();
  }

  get _animated() {
    return !this.noAnimation && !animationsDisabled();
  }

  _triggerEl() {
    return this._triggerSlot.assignedElements({ flatten: true })[0] || this._fallbackBtn;
  }

  _hasCustomTrigger() {
    return this._triggerSlot.assignedNodes({ flatten: true })
      .some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
  }

  _syncTriggerAria() {
    const el = this._triggerEl();
    if (!el) return;
    el.setAttribute('aria-haspopup', 'dialog');
    el.setAttribute('aria-expanded', String(Boolean(this._dialog?.open)));
  }

  _show() {
    if (!this.isConnected || this._dialog.open) return;
    this._token++;
    // Mở overlay TRƯỚC showModal để nhớ đúng phần tử đang focus (trả focus khi đóng)
    this._handle = openOverlay({
      element: this._panel,
      trapFocus: true,
      lockScroll: true,
      restoreFocus: true,
      onEscape: () => this.hide(),
    });
    if (typeof this._dialog.showModal === 'function') this._dialog.showModal();
    else this._dialog.setAttribute('open', '');
    this.setState('open', true);
    this._syncTriggerAria();
    this._runQuery(true);
    if (this._animated) {
      animateIn(this._dialog, 'fade');
      animateIn(this._panel, 'slide-down');
    }
    this._input.focus({ preventScroll: true });
    this.emit('hui-open');
  }

  async _hide() {
    if (!this._dialog.open && !this._handle) return;
    const token = ++this._token;
    clearTimeout(this._timer);
    this._abortCtl?.abort();
    this.setState('open', false);
    if (this._animated && this._dialog.open) {
      await Promise.all([animateOut(this._dialog, 'fade'), animateOut(this._panel, 'slide-down')]);
      if (token !== this._token) return;
    }
    if (this._dialog.open) this._dialog.close();
    this._dialog.removeAttribute('open');
    [this._dialog, this._panel].forEach((el) => el.getAnimations?.().forEach((a) => a.cancel()));
    // Đóng overlay SAU khi dialog đóng: trang hết inert nên trả focus được
    this._handle?.close();
    this._handle = null;
    this._syncTriggerAria();
    this.emit('hui-close');
  }

  // =====================================================
  // PHÍM TẮT TOÀN TRANG
  // =====================================================

  get _hotkeyList() {
    const raw = (this.hotkeys || '').trim().toLowerCase();
    if (!raw || raw === 'none') return [];
    return raw.split(/[\s,]+/).filter(Boolean);
  }

  _onHotkey(e) {
    if (this.open || e.defaultPrevented) return;
    const keys = this._hotkeyList;
    if (!keys.length) return;
    const key = (e.key || '').toLowerCase();
    const target = e.composedPath()[0];
    const editable = target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName || ''));
    const match = keys.some((k) => {
      if (k === '/') return key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !editable;
      const [mod, letter] = k.split('+');
      if (!letter || key !== letter) return false;
      if (mod === 'mod') return (e.ctrlKey || e.metaKey) && !e.altKey;
      if (mod === 'ctrl') return e.ctrlKey && !e.altKey;
      if (mod === 'meta') return e.metaKey && !e.altKey;
      return false;
    });
    if (!match) return;
    e.preventDefault();
    this.show();
  }

  // =====================================================
  // GỢI Ý
  // =====================================================

  _onInput() {
    this._query = this._input.value;
    this._clearBtn.hidden = !this._query;
    this._runQuery(false);
  }

  get _recent() {
    if (!this.recentKey) return this._memoryRecent;
    const stored = readRecent(this.recentKey);
    return stored.length ? stored : this._memoryRecent;
  }

  /** Lịch sử tìm kiếm (mới nhất trước) */
  get recentSearches() {
    return [...this._recent];
  }

  /** Xóa toàn bộ lịch sử */
  clearRecent() {
    this._memoryRecent = [];
    if (this.recentKey) writeRecent(this.recentKey, []);
    if (!this._query.trim()) this._runQuery(true);
    this._input.focus();
  }

  _addRecent(query) {
    const q = String(query || '').trim();
    if (!q || !this.recentKey) return;
    const list = [q, ...this._recent.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, Math.max(1, this.maxRecent || 5));
    this._memoryRecent = list;
    writeRecent(this.recentKey, list);
  }

  _runQuery(immediate) {
    clearTimeout(this._timer);
    this._abortCtl?.abort();
    this._abortCtl = null;
    const q = this._query.trim();
    const reqId = ++this._reqId;

    if (!q || q.length < (this.minChars ?? 1)) {
      this._state = 'idle';
      this._setResults(q ? [] : this._recent.map((s) => ({ item: { label: s, value: s }, kind: 'recent' })));
      return;
    }

    if (typeof this.fetchFn === 'function') {
      this._state = 'loading';
      this._renderResults();
      const run = async () => {
        const ctl = new AbortController();
        this._abortCtl = ctl;
        try {
          const data = await this.fetchFn(q, { signal: ctl.signal });
          if (reqId !== this._reqId) return; // đã có yêu cầu mới hơn
          this._state = 'done';
          this._setResults(this._toResults(Array.isArray(data) ? data : []));
        } catch (err) {
          if (reqId !== this._reqId || ctl.signal.aborted) return;
          this._state = 'error';
          this._setResults([]);
          this.emit('hui-error', { error: err, query: q });
        }
      };
      if (immediate) run();
      else this._timer = setTimeout(run, Math.max(0, this.debounce ?? 250));
      return;
    }

    // Lọc dữ liệu tĩnh: không phân biệt hoa thường / dấu
    const fq = fold(q);
    const list = (Array.isArray(this.suggestions) ? this.suggestions : []).map(normalizeItem).filter(Boolean)
      .filter((it) => fold(it.label).includes(fq) || (it.description && fold(it.description).includes(fq)) || (it.keywords && fold(it.keywords).includes(fq)));
    this._state = 'done';
    this._setResults(this._toResults(list));
  }

  _toResults(list) {
    return list.map(normalizeItem).filter(Boolean).slice(0, Math.max(1, this.maxResults || 8))
      .map((item) => ({ item, kind: 'suggestion' }));
  }

  _setResults(results) {
    this._results = results;
    this._active = -1;
    this._renderResults();
  }

  _renderResults() {
    const q = this._query.trim();
    const results = this._results;
    const recentMode = !q;
    const loading = this._state === 'loading';

    this._spinner.hidden = !loading;
    this._listbox.setAttribute('aria-busy', String(loading));
    this._sectionTitle.textContent = recentMode ? tx('searchOverlay.recent') : tx('searchOverlay.suggestions');
    this._sectionHead.hidden = !results.length || loading;
    this._clearRecentBtn.hidden = !recentMode || !results.length;
    this._listbox.setAttribute('aria-labelledby', this._sectionTitle.id);
    this._empty.hidden = !recentMode || results.length > 0 || !this._emptySlot.assignedNodes().length;

    // Gom theo group (giữ thứ tự xuất hiện)
    const nodes = [];
    let lastGroup;
    results.forEach((res, i) => {
      const { item } = res;
      if (res.kind === 'suggestion' && item.group && item.group !== lastGroup) {
        nodes.push(createElement('li', { className: 'so__group', role: 'presentation', part: 'section-title' }, String(item.group)));
      }
      lastGroup = item.group;
      const id = `${this._listId}-opt-${i}`;
      const iconName = res.kind === 'recent' ? 'history' : item.icon;
      const option = createElement('li', {
        className: 'so__option', part: 'option', role: 'option', id, 'aria-selected': 'false', 'data-index': String(i),
      });
      if (iconName) option.append(createElement('hui-icon', { name: iconName, className: 'so__option-icon' }));
      const text = createElement('span', { className: 'so__option-text' },
        createElement('span', { className: 'so__option-label' }, ...(res.kind === 'recent' ? [item.label] : highlight(item.label, q))));
      if (item.description) text.append(createElement('span', { className: 'so__option-desc' }, String(item.description)));
      option.append(text);
      if (res.kind === 'recent') {
        const remove = createElement('button', {
          type: 'button', className: 'so__option-remove', tabindex: '-1', 'data-remove': String(i),
          'aria-label': tx('searchOverlay.removeRecent', { query: item.label }),
        }, createElement('hui-icon', { name: 'close' }));
        option.append(remove);
      } else if (item.href) {
        option.append(createElement('hui-icon', { name: 'chevron-right', className: 'so__option-go' }));
      }
      nodes.push(option);
    });
    this._listbox.replaceChildren(...nodes);
    this._listbox.hidden = !results.length;

    // Trạng thái đọc cho trình đọc màn hình (và hiện chữ khi cần)
    let status = '';
    let visible = false;
    if (loading) status = tx('searchOverlay.loading');
    else if (this._state === 'error') { status = tx('searchOverlay.error'); visible = true; }
    else if (q && q.length >= (this.minChars ?? 1) && !results.length) { status = tx('searchOverlay.noResults', { query: q }); visible = true; }
    else if (q && results.length) status = tx('searchOverlay.count', { count: results.length });
    this._status.textContent = status;
    this._status.classList.toggle('so__status--visible', visible || loading);
    this._status.classList.toggle('so__status--error', this._state === 'error');

    this._input.setAttribute('aria-expanded', String(results.length > 0));
    this._syncActive();
  }

  _optionEls() {
    return [...this._listbox.querySelectorAll('[role="option"]')];
  }

  _syncActive() {
    const opts = this._optionEls();
    opts.forEach((el, i) => {
      const on = i === this._active;
      el.setAttribute('aria-selected', String(on));
      el.setAttribute('part', on ? 'option option-active' : 'option');
      if (on) el.scrollIntoView?.({ block: 'nearest' });
    });
    if (this._active >= 0 && opts[this._active]) this._input.setAttribute('aria-activedescendant', opts[this._active].id);
    else this._input.removeAttribute('aria-activedescendant');
  }

  _onKeydown(e) {
    const n = this._results.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!n) return;
      e.preventDefault();
      if (e.key === 'ArrowDown') this._active = this._active >= n - 1 ? 0 : this._active + 1;
      else this._active = this._active <= 0 ? n - 1 : this._active - 1;
      this._syncActive();
    } else if (e.key === 'Enter') {
      if (e.isComposing) return; // đang gõ bộ gõ tiếng Việt / IME
      e.preventDefault();
      if (this._active >= 0) this._choose(this._active);
      else this._submit(this._query.trim(), false);
    } else if (e.key === 'Delete' && e.shiftKey && this._active >= 0 && this._results[this._active]?.kind === 'recent') {
      e.preventDefault();
      this._removeRecent(this._active);
    }
  }

  _onOptionClick(e) {
    const path = e.composedPath();
    const remove = path.find((n) => n.dataset?.remove !== undefined);
    if (remove) {
      this._removeRecent(Number(remove.dataset.remove));
      return;
    }
    const opt = path.find((n) => n.getAttribute?.('role') === 'option');
    if (opt) this._choose(Number(opt.dataset.index));
  }

  _removeRecent(index) {
    const res = this._results[index];
    if (!res || res.kind !== 'recent') return;
    const list = this._recent.filter((s) => s !== res.item.label);
    this._memoryRecent = list;
    if (this.recentKey) writeRecent(this.recentKey, list);
    this._runQuery(true);
    this._input.focus();
  }

  _choose(index) {
    const res = this._results[index];
    if (!res) return;
    if (res.kind === 'recent') {
      this._input.value = res.item.label;
      this._onInput();
      this._submit(res.item.label, true);
      return;
    }
    const { item } = res;
    const ok = this.emit('hui-select', { item, query: this._query.trim() }, { cancelable: true });
    if (!ok) return;
    this._addRecent(this._query.trim() || item.label);
    this._reset();
    this.hide();
    if (item.href) window.location.assign(item.href);
  }

  _submit(query, recent) {
    if (!query) return;
    const ok = this.emit('hui-search', { query, recent }, { cancelable: true });
    if (!ok) return;
    this._addRecent(query);
    this._reset();
    this.hide();
  }

  /** Tìm / chọn xong → ô tìm trống cho lần mở sau (hiện lại lịch sử) */
  _reset() {
    this._input.value = '';
    this._query = '';
    this._clearBtn.hidden = true;
    this._state = 'idle';
  }
}

defineElement('hui-search-overlay', HuiSearchOverlay);

export default HuiSearchOverlay;
