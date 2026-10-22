/**
 * HUI Command Palette — Bảng lệnh (Organism): Ctrl/⌘+K mở hộp tìm lệnh / trang.
 * Lọc gần đúng (bỏ dấu tiếng Việt, khớp ký tự lần lượt) + tô sáng ký tự khớp, kết quả theo nhóm,
 * điều hướng bàn phím theo mẫu APG combobox + listbox, Enter chạy lệnh (mở href hoặc phát hui-select).
 * Mở/đóng: <dialog>.showModal() + utils/overlay.js (Esc, click ngoài, giữ focus, khóa cuộn) như hui-modal.
 */

import styles from './hui-command-palette.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { openOverlay } from '../../utils/overlay.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { registerHotkey } from '../hui-hotkey/hui-hotkey.js';
import '../hui-icon/hui-icon.js';
import '../hui-kbd/hui-kbd.js';

const FALLBACK = {
  'commandPalette.label': { vi: 'Bảng lệnh', en: 'Command palette' },
  'commandPalette.placeholder': { vi: 'Tìm lệnh hoặc trang...', en: 'Search commands or pages...' },
  'commandPalette.empty': { vi: 'Không tìm thấy lệnh phù hợp', en: 'No matching commands' },
  'commandPalette.recent': { vi: 'Gần đây', en: 'Recent' },
  'commandPalette.results': { vi: '{count} kết quả', en: '{count} results' },
  'commandPalette.navigate': { vi: 'di chuyển', en: 'navigate' },
  'commandPalette.run': { vi: 'chọn', en: 'select' },
  'commandPalette.close': { vi: 'đóng', en: 'close' },
  'commandPalette.listLabel': { vi: 'Danh sách lệnh', en: 'Commands' },
};
const msg = (key, vars) => {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
};

// =====================================================
// LỌC GẦN ĐÚNG
// =====================================================

/** Chuẩn hóa 1 ký tự: bỏ dấu, đ → d, viết thường */
const fold = (ch) => ch.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Chuẩn hóa cả chuỗi (dùng cho keywords) */
export const foldText = (s) => [...String(s ?? '')].map(fold).join('');

const isWordStart = (chars, i) => i === 0 || /[\s\-_/.:([]/.test(chars[i - 1]);

/**
 * So khớp `query` với `text`: chuỗi con liền nhau được điểm cao nhất (đầu từ càng cao),
 * không có thì khớp từng ký tự lần lượt (ưu tiên đầu từ, ký tự liền kề).
 * @returns {{score: number, indices: number[]} | null} indices = vị trí ký tự (theo code point) trong text gốc
 */
export function fuzzyMatch(query, text) {
  const q = foldText(query).replace(/\s+/g, ' ').trim();
  if (!q) return { score: 0, indices: [] };
  const chars = [...String(text ?? '')];
  const folded = chars.map(fold);
  const hay = folded.join('');
  // fold() có thể đổi độ dài 1 ký tự (hiếm) → map vị trí trong chuỗi đã chuẩn hóa về ký tự gốc
  const map = [];
  folded.forEach((f, i) => { for (let k = 0; k < f.length; k++) map.push(i); });

  const sub = hay.indexOf(q);
  if (sub !== -1) {
    // Ưu tiên lần xuất hiện ở đầu từ
    let pos = sub;
    for (let p = sub; p !== -1; p = hay.indexOf(q, p + 1)) {
      if (isWordStart(chars, map[p])) { pos = p; break; }
    }
    const idx = [];
    for (let k = 0; k < q.length; k++) idx.push(map[pos + k]);
    const score = 1000 - pos * 2 + (isWordStart(chars, map[pos]) ? 200 : 0) + (pos === 0 ? 300 : 0) - (hay.length - q.length) * 0.5;
    return { score, indices: [...new Set(idx)] };
  }

  const needle = q.replace(/\s/g, '');
  let score = 0;
  let last = -2;
  const idx = [];
  let from = 0;
  for (const c of needle) {
    // Tìm ký tự kế tiếp, ưu tiên vị trí đầu từ trong phần còn lại
    let found = -1;
    for (let p = hay.indexOf(c, from); p !== -1; p = hay.indexOf(c, p + 1)) {
      if (found === -1) found = p;
      if (p === last + 1) { found = p; break; }
      if (isWordStart(chars, map[p])) { found = p; break; }
    }
    if (found === -1) return null;
    score += found === last + 1 ? 15 : isWordStart(chars, map[found]) ? 10 : 1;
    idx.push(map[found]);
    last = found;
    from = found + 1;
  }
  return { score: score - hay.length * 0.2, indices: [...new Set(idx)] };
}

/** Chuỗi gốc + vị trí khớp → DocumentFragment có <mark> (không dùng innerHTML) */
function highlight(text, indices) {
  const frag = document.createDocumentFragment();
  const chars = [...String(text ?? '')];
  const set = new Set(indices);
  let buf = '';
  let marked = false;
  const flush = () => {
    if (!buf) return;
    frag.append(marked ? createElement('mark', { part: 'match' }, buf) : buf);
    buf = '';
  };
  chars.forEach((ch, i) => {
    const m = set.has(i);
    if (m !== marked) {
      flush();
      marked = m;
    }
    buf += ch;
  });
  flush();
  return frag;
}

let uid = 0;

/**
 * Bảng lệnh.
 *
 * @fires hui-open - Vừa mở
 * @fires hui-close - Vừa đóng
 * @fires hui-select - Chọn một lệnh (Enter / click). detail: { command, originalEvent }. Cancelable: preventDefault() → không chạy action / không mở href, bảng giữ nguyên
 * @fires hui-search - Từ khóa đổi. detail: { query, count }
 * @slot trigger - Nút / ô tìm giả mở bảng lệnh khi bấm
 * @slot empty - Nội dung khi không có kết quả (thay chữ mặc định)
 * @slot footer - Thay dòng gợi ý phím ở chân bảng
 * @csspart dialog - Thẻ <dialog>
 * @csspart mask - Lớp phủ nền
 * @csspart panel - Khung bảng lệnh
 * @csspart search - Hàng ô tìm kiếm
 * @csspart search-icon - Icon kính lúp
 * @csspart input - Ô nhập (role="combobox")
 * @csspart list - Danh sách kết quả (role="listbox")
 * @csspart group - Một nhóm kết quả
 * @csspart group-label - Tên nhóm
 * @csspart option - Một lệnh (role="option")
 * @csspart option-active - Lệnh đang được chọn (thêm cùng part option)
 * @csspart option-icon - Icon của lệnh
 * @csspart option-label - Tên lệnh
 * @csspart option-description - Mô tả phụ của lệnh
 * @csspart option-shortcut - Phím tắt hiển thị (hui-kbd)
 * @csspart match - Ký tự khớp được tô sáng (<mark>)
 * @csspart empty - Trạng thái không có kết quả
 * @csspart footer - Chân bảng (gợi ý phím)
 * @cssprop --hui-command-palette-width - Bề rộng bảng
 * @cssprop --hui-command-palette-top - Khoảng cách tới mép trên
 * @cssprop --hui-command-palette-max-height - Chiều cao tối đa vùng kết quả
 * @cssprop --hui-command-palette-bg - Nền bảng
 * @cssprop --hui-command-palette-radius - Bo góc
 * @cssprop --hui-command-palette-shadow - Đổ bóng
 * @cssprop --hui-command-palette-mask-bg - Nền lớp phủ
 * @cssprop --hui-command-palette-active-bg - Nền lệnh đang chọn
 * @cssprop --hui-command-palette-match-color - Màu ký tự khớp
 * @cssprop --hui-command-palette-font-size - Cỡ chữ ô tìm
 */
class HuiCommandPalette extends HuiElement {
  static localized = true;

  static properties = {
    /** Trạng thái mở. Đọc bằng `isOpen` (vì `open()` là method) */
    open: { type: Boolean },
    /** Danh sách lệnh: [{ id, label, group, icon, shortcut, keywords, description, href, target, action, disabled }] */
    commands: { type: Array, default: null },
    /** Phím tắt mở/đóng (cú pháp hui-hotkey); "none" = không đăng ký */
    hotkey: { type: String, default: 'mod+k' },
    /** Chữ gợi ý trong ô tìm */
    placeholder: { type: String },
    /** Chữ khi không có kết quả */
    emptyText: { type: String },
    /** Tên hộp thoại cho trình đọc màn hình */
    label: { type: String },
    /** Hiện nhóm "Gần đây" (lưu trong bộ nhớ, mất khi tải lại trang) khi chưa gõ gì */
    recent: { type: Boolean },
    /** Số lệnh gần đây tối đa */
    recentLimit: { type: Number, default: 5 },
    /** Số kết quả tối đa hiển thị */
    limit: { type: Number, default: 50 },
    /** Chọn lệnh xong vẫn giữ bảng mở */
    keepOpen: { type: Boolean },
    /** Ẩn dòng gợi ý phím ở chân bảng */
    noFooter: { type: Boolean },
    /** Tắt animation mở/đóng */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._handle = null;
    this._token = 0;
    this._query = '';
    this._results = [];
    this._active = -1;
    this._recentIds = [];
    this._optSeq = 0;
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  /** Mở bảng lệnh */
  open() {
    this._setProp('open', true);
  }

  /** Đóng bảng lệnh */
  close() {
    this._setProp('open', false);
  }

  /** Mở ↔ đóng */
  toggle() {
    this._setProp('open', !this._props.open);
  }

  get isOpen() {
    return this._props.open;
  }

  /** Từ khóa đang gõ */
  get query() {
    return this._query;
  }

  set query(v) {
    this._query = String(v ?? '');
    if (this._input) this._input.value = this._query;
    this._refresh(true);
  }

  /** id các lệnh dùng gần đây (mới nhất trước) */
  get recentIds() {
    return [...this._recentIds];
  }

  clearRecent() {
    this._recentIds = [];
    this._refresh();
  }

  /** Danh sách đang hiển thị (sau lọc), mỗi phần tử { command, indices, group } */
  get results() {
    return this._results.map((r) => ({ ...r }));
  }

  // =====================================================
  // RENDER
  // =====================================================

  render() {
    const id = ++uid;
    this._uid = id;
    this._listId = `hui-cp-list-${id}`;

    this._triggerSlot = createElement('slot', { name: 'trigger' });
    this._triggerSlot.addEventListener('click', () => this.open());

    this._input = createElement('input', {
      className: 'input', part: 'input', type: 'text', role: 'combobox',
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      'aria-expanded': 'true', 'aria-controls': this._listId, 'aria-autocomplete': 'list', 'aria-haspopup': 'listbox',
      autofocus: true,
    });
    this._input.addEventListener('input', () => {
      this._query = this._input.value;
      this._refresh(true);
    });
    this._input.addEventListener('keydown', (e) => this._onKeyDown(e));

    const search = createElement('div', { className: 'search', part: 'search' },
      createElement('hui-icon', { className: 'search-icon', part: 'search-icon', name: 'search', 'aria-hidden': 'true' }),
      this._input,
      createElement('hui-kbd', { className: 'esc', keys: 'esc', size: 'sm', 'aria-hidden': 'true' }));

    this._list = createElement('div', { className: 'list', part: 'list', role: 'listbox', id: this._listId });
    this._list.addEventListener('pointermove', (e) => {
      const opt = e.composedPath().find((n) => n instanceof Element && n.getAttribute?.('role') === 'option');
      if (!opt) return;
      const i = Number(opt.dataset.index);
      if (i !== this._active) this._setActive(i, false);
    });
    this._list.addEventListener('click', (e) => {
      const opt = e.composedPath().find((n) => n instanceof Element && n.getAttribute?.('role') === 'option');
      if (opt) this._run(Number(opt.dataset.index), e);
    });
    // Không để click vào danh sách lấy mất focus khỏi ô nhập
    this._list.addEventListener('mousedown', (e) => e.preventDefault());

    this._emptyText = createElement('span');
    this._empty = createElement('div', { className: 'empty', part: 'empty', hidden: true },
      createElement('slot', { name: 'empty' }, this._emptyText));

    this._hints = createElement('div', { className: 'hints' });
    this._footer = createElement('div', { className: 'footer', part: 'footer' }, createElement('slot', { name: 'footer' }, this._hints));
    this._live = createElement('div', { className: 'sr-only', role: 'status', 'aria-live': 'polite' });

    this._panel = createElement('div', { className: 'panel', part: 'panel' },
      search, createElement('div', { className: 'body' }, this._list, this._empty), this._footer, this._live);
    this._mask = createElement('div', { className: 'mask', part: 'mask' });
    this._dialog = createElement('dialog', { className: 'dialog', part: 'dialog' },
      this._mask, createElement('div', { className: 'wrap' }, this._panel));

    this._dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      if (this._handle?.isTop()) this.close();
    });
    // Sự kiện 'close' đến sau 1 task: nếu đã mở lại ngay (dialog.open = true) thì bỏ qua, tránh đóng nhầm
    this._dialog.addEventListener('close', () => {
      if (this._props.open && !this._dialog.open) this.close();
    });

    return [this._triggerSlot, this._dialog];
  }

  connectedCallback() {
    super.connectedCallback();
    // Chặn Esc mặc định của <dialog> (overlay manager tự xử lý theo thứ tự lớp)
    this.listen(window, 'keydown', (e) => {
      if (e.key === 'Escape' && this._dialog?.open) e.preventDefault();
    }, { capture: true });
    this._bindHotkey();
    if (this._props.open && !this._handle && this._hasRendered) this._show();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._offHotkey?.();
    this._offHotkey = null;
    this._token++;
    this._handle?.close();
    this._handle = null;
  }

  updated(changed) {
    if (changed.has('hotkey')) this._bindHotkey();
    if (['label', 'placeholder', 'locale'].some((k) => changed.has(k))) {
      const label = this.label || msg('commandPalette.label');
      this._dialog.setAttribute('aria-label', label);
      this._input.setAttribute('aria-label', label);
      this._input.setAttribute('placeholder', this.placeholder || msg('commandPalette.placeholder'));
      this._list.setAttribute('aria-label', msg('commandPalette.listLabel'));
    }
    if (changed.has('locale')) this._renderHints();
    if (changed.has('noFooter')) this._footer.hidden = this.noFooter;
    if (['commands', 'recent', 'recentLimit', 'limit', 'emptyText', 'locale'].some((k) => changed.has(k))) this._refresh();
    if (changed.has('open')) {
      const first = !this._mounted;
      if (this._props.open) this._show();
      else if (!first) this._hide();
      if (!first) this.emit(this._props.open ? 'hui-open' : 'hui-close');
    }
  }

  firstUpdated() {
    this._mounted = true;
  }

  _bindHotkey() {
    this._offHotkey?.();
    this._offHotkey = null;
    if (!this.isConnected || !this.hotkey || this.hotkey === 'none') return;
    // Ctrl/⌘+K không phải "gõ chữ" → cho phép ngay cả khi đang ở trong ô nhập
    this._offHotkey = registerHotkey(this.hotkey, () => this.toggle(), { allowInInputs: true, preventDefault: true });
  }

  _renderHints() {
    const hint = (keys, text) => createElement('span', { className: 'hint' },
      ...keys.map((k) => createElement('hui-kbd', { keys: k, size: 'sm' })), createElement('span', {}, text));
    this._hints.replaceChildren(
      hint(['up', 'down'], msg('commandPalette.navigate')),
      hint(['enter'], msg('commandPalette.run')),
      hint(['esc'], msg('commandPalette.close')),
    );
  }

  // =====================================================
  // LỌC + VẼ KẾT QUẢ
  // =====================================================

  _commandList() {
    return (Array.isArray(this.commands) ? this.commands : []).filter((c) => c && (c.label || c.id));
  }

  /** Tính danh sách kết quả: [{ command, indices, group }] theo đúng thứ tự hiển thị */
  _compute() {
    const all = this._commandList();
    const q = this._query.trim();
    const limit = Math.max(1, Number(this.limit) || 50);
    const groupOf = (c) => c.group || '';

    if (!q) {
      const out = [];
      const used = new Set();
      if (this.recent && this._recentIds.length) {
        const byId = new Map(all.map((c) => [c.id ?? c.label, c]));
        for (const rid of this._recentIds) {
          const c = byId.get(rid);
          if (c) {
            out.push({ command: c, indices: [], group: msg('commandPalette.recent'), recent: true });
            used.add(c);
          }
        }
      }
      // Giữ thứ tự nhóm theo lần xuất hiện đầu tiên trong commands
      const groups = new Map();
      for (const c of all) {
        if (used.has(c)) continue;
        const g = groupOf(c);
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(c);
      }
      for (const [g, list] of groups) for (const c of list) out.push({ command: c, indices: [], group: g });
      return out.slice(0, limit);
    }

    const scored = [];
    all.forEach((c, order) => {
      const label = String(c.label ?? c.id ?? '');
      let m = fuzzyMatch(q, label);
      let indices = m?.indices || [];
      let score = m ? m.score : -Infinity;
      // Không khớp tên → thử từ khóa / mô tả / nhóm (điểm thấp hơn, không tô sáng)
      const extra = [].concat(c.keywords || [], c.description || [], c.group || []).join(' ');
      if (extra) {
        const m2 = fuzzyMatch(q, extra);
        if (m2 && m2.score * 0.6 > score) {
          score = m2.score * 0.6;
          indices = m ? indices : [];
        }
      }
      if (score === -Infinity) return;
      scored.push({ command: c, indices, score, order, group: groupOf(c) });
    });
    // Nhóm xếp theo điểm cao nhất của nhóm, lệnh trong nhóm theo điểm
    const best = new Map();
    for (const r of scored) best.set(r.group, Math.max(best.get(r.group) ?? -Infinity, r.score));
    scored.sort((a, b) => (a.group === b.group
      ? b.score - a.score || a.order - b.order
      : best.get(b.group) - best.get(a.group) || a.order - b.order));
    return scored.slice(0, limit);
  }

  /** Lọc + vẽ lại. `resetActive` (từ khóa đổi) → chọn lệnh đầu; còn lại giữ lệnh đang chọn nếu vẫn còn */
  _refresh(resetActive = false) {
    if (!this._list) return;
    const prev = this._results[this._active]?.command;
    this._results = this._compute();
    this._renderList();
    const keep = resetActive ? -1 : this._results.findIndex((r) => r.command === prev && !r.command.disabled);
    const first = this._results.findIndex((r) => !r.command.disabled);
    this._setActive(keep !== -1 ? keep : first, true);
    const count = this._results.length;
    this._empty.hidden = count > 0;
    this._list.hidden = count === 0;
    this._emptyText.textContent = this.emptyText || msg('commandPalette.empty');
    this.setState('empty', count === 0);
    if (this._props.open) {
      this._live.textContent = this._query ? (count ? msg('commandPalette.results', { count }) : this._emptyText.textContent) : '';
    }
    this.emit('hui-search', { query: this._query, count });
  }

  _renderList() {
    const frag = document.createDocumentFragment();
    let groupEl = null;
    let groupName = null;
    this._optionEls = [];
    this._results.forEach((r, i) => {
      if (!groupEl || r.group !== groupName) {
        groupName = r.group;
        const gid = `hui-cp-${this._uid}-g${++this._optSeq}`;
        groupEl = createElement('div', { className: 'group', part: 'group', role: 'group' });
        if (groupName) {
          groupEl.setAttribute('aria-labelledby', gid);
          groupEl.append(createElement('div', { className: 'group-label', part: 'group-label', role: 'presentation', id: gid }, groupName));
        }
        frag.append(groupEl);
      }
      const c = r.command;
      const label = String(c.label ?? c.id ?? '');
      const opt = createElement('div', {
        className: 'option', part: 'option', role: 'option', id: `hui-cp-${this._uid}-o${++this._optSeq}`,
        'aria-selected': 'false', 'data-index': String(i),
      });
      if (c.disabled) opt.setAttribute('aria-disabled', 'true');
      opt.append(createElement('span', { className: 'option-icon', part: 'option-icon', 'aria-hidden': 'true' },
        c.icon ? createElement('hui-icon', { name: c.icon }) : ''));
      const text = createElement('span', { className: 'option-text' },
        createElement('span', { className: 'option-label', part: 'option-label' }, highlight(label, r.indices)));
      if (c.description) text.append(createElement('span', { className: 'option-description', part: 'option-description' }, String(c.description)));
      opt.append(text);
      if (c.shortcut) opt.append(createElement('hui-kbd', { className: 'option-shortcut', part: 'option-shortcut', keys: String(c.shortcut), size: 'sm' }));
      groupEl.append(opt);
      this._optionEls.push(opt);
    });
    this._list.replaceChildren(frag);
  }

  _setActive(i, fromRefresh) {
    const prev = this._optionEls?.[this._active];
    prev?.setAttribute('aria-selected', 'false');
    prev?.classList.remove('option--active');
    prev?.setAttribute('part', 'option');
    this._active = i;
    const el = this._optionEls?.[i];
    if (el) {
      el.setAttribute('aria-selected', 'true');
      el.classList.add('option--active');
      el.setAttribute('part', 'option option-active');
      this._input.setAttribute('aria-activedescendant', el.id);
      if (!fromRefresh || this._props.open) el.scrollIntoView?.({ block: 'nearest' });
    } else {
      this._input.removeAttribute('aria-activedescendant');
    }
  }

  /** Bước sang lệnh kế (bỏ qua lệnh disabled), vòng lại đầu/cuối */
  _step(dir) {
    const n = this._results.length;
    if (!n) return;
    let i = this._active;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!this._results[i].command.disabled) break;
    }
    this._setActive(i, false);
  }

  _onKeyDown(e) {
    if (e.isComposing) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._step(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._step(-1);
        break;
      case 'PageDown':
      case 'PageUp': {
        e.preventDefault();
        const n = this._results.length;
        if (!n) break;
        const next = Math.max(0, Math.min(n - 1, this._active + (e.key === 'PageDown' ? 5 : -5)));
        this._setActive(next, false);
        break;
      }
      case 'Home':
      case 'End':
        // Ctrl+Home / Ctrl+End: lệnh đầu / cuối (Home/End thường vẫn di chuyển con trỏ trong ô nhập)
        if (!e.ctrlKey && !e.metaKey) break;
        e.preventDefault();
        this._setActive(e.key === 'Home' ? 0 : this._results.length - 1, false);
        break;
      case 'Enter':
        e.preventDefault();
        this._run(this._active, e);
        break;
      default:
    }
  }

  _pushRecent(c) {
    if (!this.recent) return;
    const key = c.id ?? c.label;
    this._recentIds = [key, ...this._recentIds.filter((k) => k !== key)].slice(0, Math.max(1, Number(this.recentLimit) || 5));
  }

  /** Chạy lệnh ở vị trí `i`: hui-select (cancelable) → đóng → action() → mở href */
  _run(i, e) {
    const r = this._results[i];
    if (!r || r.command.disabled) return;
    const c = r.command;
    const ok = this.emit('hui-select', { command: c, originalEvent: e || null }, { cancelable: true });
    if (!ok) return;
    this._pushRecent(c);
    if (!this.keepOpen) this.close();
    else this._refresh();
    if (typeof c.action === 'function') c.action(c);
    if (c.href) {
      const newTab = c.target === '_blank' || e?.ctrlKey || e?.metaKey;
      if (newTab) window.open(c.href, '_blank', 'noopener');
      else window.location.assign(c.href);
    }
  }

  // =====================================================
  // MỞ / ĐÓNG
  // =====================================================

  get _animated() {
    return !this.noAnimation && !animationsDisabled();
  }

  _show() {
    if (!this.isConnected) return;
    this._token++;
    this._query = '';
    this._input.value = '';
    if (!this._handle) {
      this._handle = openOverlay({
        element: this._panel,
        trapFocus: true,
        lockScroll: true,
        restoreFocus: true,
        onEscape: () => this.close(),
        onClickOutside: () => this.close(),
      });
    }
    const dlg = this._dialog;
    if (!dlg.open) {
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    }
    this._refresh(true);
    this.setState('open', true);
    this._input.focus({ preventScroll: true });
    if (this._animated) {
      animateIn(this._mask, 'fade');
      animateIn(this._panel, 'slide-down');
    }
  }

  async _hide() {
    const token = ++this._token;
    this.setState('open', false);
    const dlg = this._dialog;
    if (dlg.open) {
      if (this._animated) {
        await Promise.all([animateOut(this._mask, 'fade'), animateOut(this._panel, 'slide-down')]);
        if (token !== this._token) return;
      }
      dlg.close();
      dlg.removeAttribute('open');
      for (const el of [this._mask, this._panel]) el.getAnimations?.().forEach((a) => a.cancel());
    }
    this._handle?.close();
    this._handle = null;
  }
}

defineElement('hui-command-palette', HuiCommandPalette);

export default HuiCommandPalette;
