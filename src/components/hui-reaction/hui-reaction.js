/**
 * HUI Reaction — Nút bày tỏ cảm xúc kiểu mạng xã hội (Molecule): bấm = Thích / bỏ thích;
 * rê chuột (hoặc giữ trên màn hình cảm ứng, hoặc phím ↑/↓) mở bảng chọn 👍❤️😂😮😢😡; đếm theo từng cảm xúc.
 * Bảng chọn định vị bằng utils/floating.js, Esc / bấm ra ngoài để đóng (utils/overlay.js).
 */

import styles from './hui-reaction.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { formatCompact, formatNumber } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { computePosition, autoUpdate, showFloating, hideFloating, floatingCss } from '../../utils/floating.js';
import { openOverlay } from '../../utils/overlay.js';
import { animationsDisabled } from '../../utils/animate.js';

const DEFAULT_REACTIONS = [
  { key: 'like', emoji: '👍', color: 'var(--hui-primary)' },
  { key: 'love', emoji: '❤️', color: 'var(--hui-danger)' },
  { key: 'haha', emoji: '😂', color: 'var(--hui-warning)' },
  { key: 'wow', emoji: '😮', color: 'var(--hui-warning)' },
  { key: 'sad', emoji: '😢', color: 'var(--hui-warning)' },
  { key: 'angry', emoji: '😡', color: 'var(--hui-danger)' },
];

const SIZES = ['sm', 'md', 'lg'];
const HOVER_OPEN_DELAY = 500;
const HOVER_CLOSE_DELAY = 300;
const LONG_PRESS = 450;

const FALLBACK = {
  vi: {
    'reaction.like': 'Thích', 'reaction.love': 'Yêu thích', 'reaction.haha': 'Haha', 'reaction.wow': 'Wow',
    'reaction.sad': 'Buồn', 'reaction.angry': 'Phẫn nộ',
    'reaction.picker': 'Chọn cảm xúc',
    'reaction.hint': 'Nhấn mũi tên lên để chọn cảm xúc khác',
    'reaction.summary': '{total} lượt bày tỏ cảm xúc: {detail}',
    'reaction.reacted': 'Đã bày tỏ cảm xúc {label}',
    'reaction.removed': 'Đã bỏ cảm xúc',
  },
  en: {
    'reaction.like': 'Like', 'reaction.love': 'Love', 'reaction.haha': 'Haha', 'reaction.wow': 'Wow',
    'reaction.sad': 'Sad', 'reaction.angry': 'Angry',
    'reaction.picker': 'Choose a reaction',
    'reaction.hint': 'Press arrow up to choose another reaction',
    'reaction.summary': '{total} reactions: {detail}',
    'reaction.reacted': 'Reacted with {label}',
    'reaction.removed': 'Reaction removed',
  },
};

function tx(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

let uid = 0;

/**
 * @fires hui-react - Người dùng đổi cảm xúc (số đếm đổi ngay). Cancelable: preventDefault() để hoàn tác. detail: { reaction, previous, counts } — reaction null = bỏ cảm xúc
 * @fires hui-picker-toggle - Bảng chọn mở/đóng. detail: { open }
 * @csspart base - Khung ngoài (nút + tổng hợp)
 * @csspart button - Nút chính (aria-pressed)
 * @csspart emoji - Biểu tượng trên nút chính
 * @csspart label - Chữ trên nút chính
 * @csspart picker - Bảng chọn cảm xúc (role="menu")
 * @csspart option - Mỗi cảm xúc trong bảng; thêm option-selected khi đang chọn
 * @csspart summary - Tổng hợp (3 biểu tượng nhiều nhất + tổng số)
 * @csspart summary-emoji - Biểu tượng trong tổng hợp
 * @csspart total - Tổng số lượt
 * @cssprop --hui-reaction-color - Màu chữ khi đã chọn (mặc định theo cảm xúc, vd 👍 → --hui-primary)
 * @cssprop --hui-reaction-button-bg - Nền nút chính
 * @cssprop --hui-reaction-button-hover-bg - Nền nút chính khi hover
 * @cssprop --hui-reaction-radius - Bo góc nút chính
 * @cssprop --hui-reaction-picker-bg - Nền bảng chọn
 * @cssprop --hui-reaction-picker-shadow - Đổ bóng bảng chọn
 * @cssprop --hui-reaction-option-size - Cỡ biểu tượng trong bảng chọn (mặc định 32px)
 * @cssprop --hui-reaction-summary-color - Màu chữ tổng số
 */
class HuiReaction extends HuiElement {
  static localized = true;

  static properties = {
    /** Danh sách cảm xúc [{ key, emoji, label, color }] hoặc mảng emoji ["👍","🎉"] (JSON) — mặc định 6 cảm xúc Facebook */
    reactions: { type: Array },
    /** key cảm xúc đang chọn ('' = chưa bày tỏ) */
    value: { type: String, default: '' },
    /** Số lượt theo từng cảm xúc, JSON {"like": 12, "love": 3} — tự cộng/trừ khi người dùng bấm */
    counts: { type: Object },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Chỉ hiện biểu tượng trên nút (ẩn chữ "Thích") */
    iconOnly: { type: Boolean },
    /** Ẩn tổng hợp số lượt */
    noSummary: { type: Boolean },
    /** Không mở bảng chọn (chỉ bật/tắt cảm xúc đầu tiên) */
    noPicker: { type: Boolean },
    /** Vô hiệu hóa */
    disabled: { type: Boolean },
    /** Tắt hiệu ứng nảy / bung bảng chọn */
    noAnimation: { type: Boolean },
  };

  static styles = [floatingCss, styles];

  constructor() {
    super();
    this._uid = ++uid;
    this._open = false;
    this._openTimer = 0;
    this._closeTimer = 0;
    this._pressTimer = 0;
    this._suppressClick = false;
    this._stopAuto = null;
    this._overlay = null;
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  /** Danh sách cảm xúc đã chuẩn hóa [{ key, emoji, label, color }] — chỉ đọc */
  get reactionList() {
    const raw = Array.isArray(this.reactions) && this.reactions.length ? this.reactions : DEFAULT_REACTIONS;
    return raw.map((r) => {
      const item = typeof r === 'string' ? { key: r, emoji: r } : { ...r };
      item.key = String(item.key ?? item.emoji);
      item.emoji = item.emoji ?? item.key;
      if (!item.label) {
        const k = `reaction.${item.key}`;
        const l = tx(k);
        item.label = l !== k ? l : item.emoji;
      }
      return item;
    });
  }

  /** Cảm xúc đang chọn (object) hoặc null */
  get selectedReaction() {
    return this.reactionList.find((r) => r.key === this.value) || null;
  }

  /** Đang mở bảng chọn */
  get pickerOpen() {
    return this._open;
  }

  /** Mở bảng chọn; focus=true → đưa focus vào cảm xúc đang chọn (bàn phím) */
  openPicker({ focus = false } = {}) {
    if (this.disabled || this.noPicker) return;
    clearTimeout(this._closeTimer);
    if (!this._open) {
      this._open = true;
      this._buildOptions();
      const picker = this._picker;
      showFloating(picker, '--hui-z-popover');
      picker.classList.toggle('rx__picker--animate', !this._motionOff);
      requestAnimationFrame(() => picker.classList.add('rx__picker--open'));
      this._stopAuto = autoUpdate(this._main, picker, () => this._position());
      this._overlay = openOverlay({
        element: picker,
        ignore: [this],
        restoreFocus: false,
        onEscape: () => this.closePicker({ focusButton: true }),
        onClickOutside: () => this.closePicker(),
      });
      this._main.setAttribute('aria-expanded', 'true');
      this.setState('open', true);
      this.emit('hui-picker-toggle', { open: true });
    }
    if (focus) {
      const opts = this._options;
      const i = Math.max(0, opts.findIndex((o) => o.dataset.key === this.value));
      this._focusOption(i);
    }
  }

  /** Đóng bảng chọn */
  closePicker({ focusButton = false } = {}) {
    clearTimeout(this._openTimer);
    clearTimeout(this._closeTimer);
    if (!this._open) return;
    this._open = false;
    this._stopAuto?.();
    this._stopAuto = null;
    this._overlay?.close();
    this._overlay = null;
    this._picker.classList.remove('rx__picker--open');
    hideFloating(this._picker);
    this._main.setAttribute('aria-expanded', 'false');
    this.setState('open', false);
    if (focusButton) this._main.focus();
    this.emit('hui-picker-toggle', { open: false });
  }

  /** Đặt cảm xúc như người dùng chọn (phát hui-react, cập nhật số đếm). key null/'' = bỏ */
  react(key) {
    this._apply(key ? String(key) : '');
  }

  // =====================================================
  // RENDER
  // =====================================================

  render() {
    this._emoji = createElement('span', { className: 'rx__emoji', part: 'emoji', 'aria-hidden': 'true' });
    this._label = createElement('span', { className: 'rx__label', part: 'label' });
    const hintId = `rx${this._uid}-hint`;
    this._main = createElement('button', {
      type: 'button', className: 'rx__main', part: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-describedby': hintId,
    }, this._emoji, this._label);
    this._hint = createElement('span', { className: 'rx__sr', id: hintId });
    this._live = createElement('span', { className: 'rx__sr', 'aria-live': 'polite' });

    this._picker = createElement('div', { className: 'rx__picker hui-floating', part: 'picker', role: 'menu', hidden: true });
    this._summaryEmojis = createElement('span', { className: 'rx__summary-emojis', 'aria-hidden': 'true' });
    this._total = createElement('span', { className: 'rx__total', part: 'total', 'aria-hidden': 'true' });
    this._summary = createElement('span', { className: 'rx__summary', part: 'summary', role: 'img' }, this._summaryEmojis, this._total);

    this._base = createElement('div', { className: 'rx', part: 'base' },
      this._main, this._summary, this._hint, this._live, this._picker);

    this._bindEvents();
    return this._base;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._pressTimer);
    this.closePicker();
  }

  updated(changed) {
    if (changed.has('reactions') || changed.has('locale')) {
      this._picker.setAttribute('aria-label', tx('reaction.picker'));
      this._hint.textContent = this.noPicker ? '' : tx('reaction.hint');
      if (this._open) this._buildOptions();
    }
    if (changed.has('noPicker')) {
      this._hint.textContent = this.noPicker ? '' : tx('reaction.hint');
      if (this.noPicker) {
        this._main.removeAttribute('aria-haspopup');
        this._main.removeAttribute('aria-expanded');
        this.closePicker();
      } else {
        this._main.setAttribute('aria-haspopup', 'menu');
        this._main.setAttribute('aria-expanded', String(this._open));
      }
    }
    if (changed.has('disabled')) {
      this._main.disabled = this.disabled;
      if (this.disabled) this.closePicker();
    }
    this._base.dataset.size = SIZES.includes(this.size) ? this.size : 'md';
    this._syncButton();
    this._syncSummary();
  }

  get _motionOff() {
    return this.noAnimation || animationsDisabled();
  }

  get _options() {
    return [...this._picker.querySelectorAll('[role="menuitemradio"]')];
  }

  _syncButton() {
    const list = this.reactionList;
    const sel = this.selectedReaction;
    const shown = sel || list[0];
    this._emoji.textContent = shown?.emoji || '';
    this._label.textContent = shown?.label || '';
    this._label.hidden = this.iconOnly;
    this._main.setAttribute('aria-pressed', String(Boolean(sel)));
    // Chỉ icon → cần tên cho nút
    if (this.iconOnly) this._main.setAttribute('aria-label', shown?.label || '');
    else this._main.removeAttribute('aria-label');
    this._base.classList.toggle('rx--active', Boolean(sel));
    if (sel?.color) this._base.style.setProperty('--_rx-color', sel.color);
    else this._base.style.removeProperty('--_rx-color');
    this._options.forEach((o) => {
      const on = o.dataset.key === this.value;
      o.setAttribute('aria-checked', String(on));
      o.setAttribute('part', on ? 'option option-selected' : 'option');
    });
  }

  _syncSummary() {
    const counts = this.counts && typeof this.counts === 'object' ? this.counts : {};
    const list = this.reactionList;
    const entries = list.map((r) => ({ r, n: Math.max(0, Number(counts[r.key]) || 0) })).filter((e) => e.n > 0)
      .sort((a, b) => b.n - a.n);
    const total = entries.reduce((s, e) => s + e.n, 0);
    this._summary.hidden = this.noSummary || total === 0;
    this._summaryEmojis.replaceChildren(...entries.slice(0, 3).map((e) => createElement('span', { className: 'rx__summary-emoji', part: 'summary-emoji' }, e.r.emoji)));
    this._total.textContent = formatCompact(total);
    const detail = entries.map((e) => `${e.r.label} ${formatNumber(e.n)}`).join(', ');
    this._summary.setAttribute('aria-label', tx('reaction.summary', { total: formatNumber(total), detail }));
  }

  _buildOptions() {
    const opts = this.reactionList.map((r, i) => {
      const btn = createElement('button', {
        type: 'button',
        className: 'rx__option',
        part: r.key === this.value ? 'option option-selected' : 'option',
        role: 'menuitemradio',
        'aria-checked': String(r.key === this.value),
        'aria-label': r.label,
        tabindex: '-1',
        'data-key': r.key,
        'data-tip': r.label,
        style: `--_rx-i: ${i}`,
      }, createElement('span', { className: 'rx__option-emoji', 'aria-hidden': 'true' }, r.emoji));
      return btn;
    });
    this._picker.replaceChildren(...opts);
  }

  _position() {
    const pos = computePosition(this._main, this._picker, { placement: 'top-start', offset: 6 });
    this._picker.style.left = `${pos.x}px`;
    this._picker.style.top = `${pos.y}px`;
    this._picker.dataset.side = pos.side;
  }

  _focusOption(i) {
    const opts = this._options;
    if (!opts.length) return;
    const idx = (i + opts.length) % opts.length;
    opts.forEach((o, k) => o.setAttribute('tabindex', k === idx ? '0' : '-1'));
    opts[idx].focus();
  }

  // =====================================================
  // SỰ KIỆN
  // =====================================================

  _bindEvents() {
    const main = this._main;
    main.addEventListener('click', () => {
      if (this._suppressClick) {
        this._suppressClick = false;
        return;
      }
      if (this.disabled) return;
      this.closePicker();
      this._apply(this.value ? '' : this.reactionList[0]?.key || '');
    });
    main.addEventListener('keydown', (e) => {
      if (this.noPicker || this.disabled) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.openPicker({ focus: true });
      }
    });

    // Rê chuột (chỉ chuột thật) → mở sau một nhịp; rời cả nút lẫn bảng → đóng
    const enter = (e) => {
      if (e.pointerType !== 'mouse' || this.disabled || this.noPicker) return;
      clearTimeout(this._closeTimer);
      if (!this._open) {
        clearTimeout(this._openTimer);
        this._openTimer = setTimeout(() => this.openPicker(), HOVER_OPEN_DELAY);
      }
    };
    const leave = (e) => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(this._openTimer);
      if (this._open) this._closeTimer = setTimeout(() => this.closePicker(), HOVER_CLOSE_DELAY);
    };
    main.addEventListener('pointerenter', enter);
    main.addEventListener('pointerleave', leave);
    this._picker.addEventListener('pointerenter', enter);
    this._picker.addEventListener('pointerleave', leave);

    // Giữ (cảm ứng / bút) → mở bảng chọn, bỏ qua click ngay sau đó
    main.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || this.disabled || this.noPicker) return;
      clearTimeout(this._pressTimer);
      this._pressTimer = setTimeout(() => {
        this._suppressClick = true;
        this.openPicker();
      }, LONG_PRESS);
    });
    const cancelPress = () => clearTimeout(this._pressTimer);
    main.addEventListener('pointerup', cancelPress);
    main.addEventListener('pointercancel', cancelPress);
    main.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' && (Math.abs(e.movementX) > 6 || Math.abs(e.movementY) > 6)) cancelPress();
    });
    main.addEventListener('contextmenu', (e) => {
      if (this._open || this._suppressClick) e.preventDefault();
    });

    this._picker.addEventListener('click', (e) => {
      const opt = e.target.closest?.('[role="menuitemradio"]');
      if (!opt) return;
      // Enter/Space trên nút tạo click có detail = 0 → trả focus về nút chính
      const viaKeyboard = e.detail === 0;
      const key = opt.dataset.key;
      this.closePicker({ focusButton: viaKeyboard });
      this._apply(key === this.value ? '' : key);
    });
    this._picker.addEventListener('keydown', (e) => {
      const opts = this._options;
      const i = opts.indexOf(this.shadowRoot.activeElement);
      const keys = {
        ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: opts.length - 1,
      };
      if (e.key in keys) {
        e.preventDefault();
        this._focusOption(keys[e.key]);
      } else if (e.key === 'Tab') {
        this.closePicker({ focusButton: true });
        e.preventDefault();
      }
    });
  }

  /** Đổi cảm xúc: cập nhật lạc quan, phát hui-react (cancelable → hoàn tác) */
  _apply(next) {
    const previous = this.value || '';
    if (next === previous) return;
    const before = this.counts && typeof this.counts === 'object' ? { ...this.counts } : {};
    const after = { ...before };
    if (previous) after[previous] = Math.max(0, (Number(after[previous]) || 0) - 1);
    if (next) after[next] = (Number(after[next]) || 0) + 1;

    this.value = next;
    this.counts = after;
    const ok = this.emit('hui-react', { reaction: next || null, previous: previous || null, counts: after }, { cancelable: true });
    if (!ok) {
      this.value = previous;
      this.counts = before;
      return;
    }
    const sel = this.reactionList.find((r) => r.key === next);
    this._live.textContent = sel ? tx('reaction.reacted', { label: sel.label }) : tx('reaction.removed');
    if (next && !this._motionOff && typeof this._emoji.animate === 'function') {
      this._emoji.animate([
        { transform: 'scale(1)' }, { transform: 'scale(1.5) rotate(-10deg)', offset: 0.4 }, { transform: 'scale(0.9)', offset: 0.7 }, { transform: 'scale(1)' },
      ], { duration: 420, easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)' });
    }
  }
}

defineElement('hui-reaction', HuiReaction);

export default HuiReaction;
