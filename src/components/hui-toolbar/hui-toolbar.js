/**
 * HUI Toolbar — Hàng nút / control (slot) theo mẫu APG Toolbar: một điểm dừng Tab, mũi tên di chuyển (roving tabindex),
 * dấu phân cách, và mục không đủ chỗ tự dồn vào menu "…" (ResizeObserver).
 */

import styles from './hui-toolbar.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { autoUpdate, computePosition, floatingCss, hideFloating, showFloating } from '../../utils/floating.js';
import { animateIn } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { openOverlay } from '../../utils/overlay.js';
import '../hui-icon/index.js';

const OVERFLOW_SLOT = 'overflow';
const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex], [contenteditable=""], [contenteditable="true"]';
const SEPARATOR = 'hr, [role="separator"], [data-separator], hui-divider';
let uid = 0;

const FALLBACK = {
  vi: { 'toolbar.more': 'Công cụ khác' },
  en: { 'toolbar.more': 'More tools' },
};
function tx(key) {
  const v = t(key);
  return v !== key ? v : (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

const isSeparator = (el) => el.matches?.(SEPARATOR);

/**
 * Phần tử focus được đầu tiên bên trong (xuyên Shadow DOM). Không dùng getTabbables vì nó bỏ qua tabindex="-1"
 * — chính toolbar đặt -1 cho control không được chọn nên cần tìm lại được.
 */
function deepFocusable(root) {
  const scope = root.shadowRoot || root;
  for (const el of scope.querySelectorAll('*')) {
    if (el.matches(FOCUSABLE) && !(el.localName === 'input' && el.type === 'hidden')) return el;
    if (el.shadowRoot) {
      const inner = deepFocusable(el);
      if (inner) return inner;
    }
  }
  return null;
}
/** Ô nhập chữ: ← → dùng để di chuyển con trỏ, không chuyển mục */
const isTextField = (el) => el && (el.isContentEditable || el.localName === 'textarea'
  || (el.localName === 'input' && !['button', 'checkbox', 'radio', 'range', 'color', 'submit', 'reset', 'image', 'file'].includes(el.type)));

/**
 * Thanh công cụ. Con trực tiếp là các control (button, a, hui-button, hui-select…); `<hr>` / `[role="separator"]` /
 * `[data-separator]` là dấu phân cách. Chỉ một control nằm trong thứ tự Tab; ← → (↑ ↓ khi dọc), Home / End di chuyển.
 * Control là custom element có nút bên trong Shadow DOM (vd hui-button): tabindex được đặt lên phần tử focus thật bên trong.
 *
 * @fires hui-overflow-change - Số mục bị dồn vào menu "…" thay đổi. detail: { count, items }
 * @slot - Các control và dấu phân cách
 * @csspart base - Khung (role="toolbar")
 * @csspart row - Hàng chứa control
 * @csspart more - Nút "…" mở menu tràn
 * @csspart popup - Menu tràn (top-layer)
 * @cssprop --hui-toolbar-gap - Khoảng cách các control
 * @cssprop --hui-toolbar-padding - Đệm khung
 * @cssprop --hui-toolbar-bg - Nền (variant filled / outlined)
 * @cssprop --hui-toolbar-border-color - Viền (variant outlined)
 * @cssprop --hui-toolbar-radius - Bo góc khung
 * @cssprop --hui-toolbar-separator-color - Màu dấu phân cách
 * @cssprop --hui-toolbar-popup-bg - Nền menu tràn
 * @cssprop --hui-toolbar-popup-shadow - Bóng menu tràn
 */
class HuiToolbar extends HuiElement {
  static properties = {
    /** Nhãn trợ năng của toolbar (aria-label) */
    label: { type: String },
    /** horizontal | vertical */
    orientation: { type: String, default: 'horizontal' },
    /** menu | wrap — menu: dồn mục thừa vào nút "…"; wrap: xuống dòng (chỉ hướng ngang) */
    overflow: { type: String, default: 'menu' },
    /** plain | outlined | filled — kiểu khung */
    variant: { type: String, default: 'plain' },
    /** Tắt hiệu ứng menu tràn */
    noAnimation: { type: Boolean },
  };

  static styles = [floatingCss, styles];

  static localized = true;

  constructor() {
    super();
    this._uid = ++uid;
    this._current = null;    // control đang giữ tabindex=0
    this._moved = new Set(); // phần tử đang nằm trong menu tràn
    this._popupOpen = false;
    this._lastWidth = -1;
    this._children = [];
  }

  render() {
    this._slot = createElement('slot');
    this._slot.addEventListener('slotchange', () => this._onChildrenChange());
    this._overflowSlot = createElement('slot', { name: OVERFLOW_SLOT });

    this._popupId = `hui-toolbar-popup-${this._uid}`;
    this._more = createElement('button', {
      type: 'button', className: 'tb__more', part: 'more', hidden: true,
      'aria-expanded': 'false', 'aria-controls': this._popupId, 'aria-haspopup': 'true',
    }, createElement('hui-icon', { name: 'more' }));
    this._more.addEventListener('click', () => this._togglePopup(!this._popupOpen, false));

    this._row = createElement('div', { className: 'tb__row', part: 'row' }, this._slot, this._more);
    this._popup = createElement('div', {
      className: 'tb__popup hui-floating', part: 'popup', id: this._popupId, role: 'group', hidden: true,
    }, this._overflowSlot);
    this._popup.addEventListener('keydown', (e) => this._onPopupKeydown(e));
    this._popup.addEventListener('click', (e) => {
      // Bấm một control trong menu tràn → đóng menu (trừ ô nhập)
      const target = e.composedPath()[0];
      if (target !== this._popup && !isTextField(target) && target.closest?.('button, a, [role="button"], hui-button')) {
        this._togglePopup(false, true);
      }
    });

    this._base = createElement('div', { className: 'tb', part: 'base', role: 'toolbar' }, this._row, this._popup);
    this._base.addEventListener('keydown', (e) => this._onKeydown(e));
    this._base.addEventListener('focusin', (e) => this._onFocusIn(e));
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    this._ro ||= new ResizeObserver(() => {
      const w = this._row.clientWidth;
      if (w === this._lastWidth) return;
      this._lastWidth = w;
      this._layout();
    });
    this._ro.observe(this._row);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._ro?.disconnect();
    this._togglePopup(false, false);
  }

  updated(changed) {
    if (changed.has('label') || changed.has('locale')) {
      if (this.label) this._base.setAttribute('aria-label', this.label);
      else this._base.removeAttribute('aria-label');
      this._more.setAttribute('aria-label', tx('toolbar.more'));
      this._popup.setAttribute('aria-label', tx('toolbar.more'));
    }
    if (['orientation', 'overflow', 'variant'].some((k) => changed.has(k))) {
      const vertical = this.orientation === 'vertical';
      const mode = this.overflow === 'wrap' ? 'wrap' : 'menu';
      const variant = ['plain', 'outlined', 'filled'].includes(this.variant) ? this.variant : 'plain';
      this._base.className = `tb tb--${vertical ? 'vertical' : 'horizontal'} tb--${mode} tb--${variant}`;
      this._base.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
      if (this._mounted) this._layout();
    }
  }

  firstUpdated() {
    this._mounted = true;
    this._onChildrenChange();
  }

  // =====================================================
  // CONTROL & ROVING TABINDEX
  // =====================================================

  /** Con trực tiếp do người dùng đặt (ở slot mặc định hoặc đang bị dồn vào menu tràn) */
  get _allChildren() {
    return [...this.children].filter((el) => !el.slot || (el.slot === OVERFLOW_SLOT && this._moved.has(el)));
  }

  _onChildrenChange() {
    if (!this._hasRendered) return;
    const list = this._allChildren;
    // slotchange do chính toolbar đổi slot (dồn vào menu) → danh sách con không đổi → bỏ qua
    const same = list.length === this._children.length && list.every((el, i) => el === this._children[i]);
    if (same) return;
    this._children = list;
    const vertical = this.orientation === 'vertical';
    list.filter(isSeparator).forEach((sep) => {
      if (sep.localName !== 'hr') sep.setAttribute('role', 'separator');
      sep.setAttribute('aria-orientation', vertical ? 'horizontal' : 'vertical');
    });
    this._layout();
  }

  /** Phần tử nhận focus thật của một control (đi vào Shadow DOM nếu cần) */
  _focusTarget(el) {
    if (el.matches?.(FOCUSABLE) && !el.shadowRoot) return el;
    return deepFocusable(el) || el;
  }

  _isDisabled(el) {
    return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.hidden;
  }

  /** Control nằm trên hàng chính (không tính dấu phân cách, mục đã dồn vào menu) + nút "…" */
  get _rowItems() {
    const items = this._children.filter((el) => !isSeparator(el) && !this._moved.has(el) && !el.hidden);
    if (!this._more.hidden) items.push(this._more);
    return items;
  }

  get _popupItems() {
    return this._children.filter((el) => this._moved.has(el) && !isSeparator(el) && !el.hidden);
  }

  /** Đúng một control có tabindex=0 (control đang chọn, hoặc control đầu tiên không bị vô hiệu) */
  _syncRoving() {
    const items = this._rowItems;
    if (!items.includes(this._current) || (this._current && this._isDisabled(this._current))) {
      this._current = items.find((el) => !this._isDisabled(el)) || items[0] || null;
    }
    let pending = false;
    for (const el of this._children) {
      if (isSeparator(el)) continue;
      const target = this._focusTarget(el);
      // Custom element chưa dựng xong Shadow DOM → không gắn tabindex lên host, thử lại ở frame sau
      if (target === el && el.localName.includes('-')) {
        pending = true;
        continue;
      }
      target.tabIndex = this._moved.has(el) ? 0 : el === this._current ? 0 : -1;
    }
    if (pending && !this._retry) {
      this._retry = requestAnimationFrame(() => {
        this._retry = 0;
        this._syncRoving();
      });
    }
    this._more.tabIndex = this._current === this._more ? 0 : -1;
  }

  _onFocusIn(e) {
    const path = e.composedPath();
    const item = this._rowItems.find((el) => path.includes(el));
    if (item && item !== this._current) {
      this._current = item;
      this._syncRoving();
    }
  }

  _onKeydown(e) {
    if (this._popupOpen && e.composedPath().includes(this._popup)) return;
    const vertical = this.orientation === 'vertical';
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
    if (![nextKey, prevKey, 'Home', 'End'].includes(e.key)) return;
    const origin = e.composedPath()[0];
    // Trong ô nhập chữ: ← → / Home End dùng để di chuyển con trỏ
    if (isTextField(origin)) return;
    const items = this._rowItems.filter((el) => !this._isDisabled(el));
    if (!items.length) return;
    const path = e.composedPath();
    let i = items.findIndex((el) => path.includes(el));
    if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = items.length - 1;
    else if (e.key === nextKey) i = (i + 1) % items.length;
    else i = (i - 1 + items.length) % items.length;
    e.preventDefault();
    this._current = items[i];
    this._syncRoving();
    this._focusTarget(items[i]).focus();
  }

  // =====================================================
  // DỒN MỤC THỪA VÀO MENU "…"
  // =====================================================

  _layout() {
    if (!this._hasRendered) return;
    const children = this._children;
    const before = this._moved.size;
    // 1. Trả mọi mục về hàng chính để đo
    this._moved.forEach((el) => el.removeAttribute('slot'));
    this._moved.clear();
    this._more.hidden = true;

    const horizontalMenu = this.orientation !== 'vertical' && this.overflow !== 'wrap';
    const visible = children.filter((el) => !el.hidden);
    if (horizontalMenu && visible.length && this.isConnected) {
      const avail = this._row.clientWidth;
      const gap = parseFloat(getComputedStyle(this._row).columnGap) || 0;
      const widths = visible.map((el) => el.getBoundingClientRect().width);
      const total = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, visible.length - 1);
      if (avail > 0 && total > avail + 0.5) {
        this._more.hidden = false;
        const moreW = this._more.getBoundingClientRect().width + gap;
        let used = 0;
        let cut = visible.length;
        for (let i = 0; i < visible.length; i++) {
          const w = widths[i] + (i > 0 ? gap : 0);
          if (used + w > avail - moreW) {
            cut = i;
            break;
          }
          used += w;
        }
        // Không để dấu phân cách treo ở cuối hàng
        while (cut > 0 && isSeparator(visible[cut - 1])) cut--;
        visible.slice(cut).forEach((el) => {
          el.slot = OVERFLOW_SLOT;
          this._moved.add(el);
        });
      }
    }
    if (!this._moved.size) this._togglePopup(false, false);
    this.setState('overflowing', this._moved.size > 0);
    this._syncRoving();
    if (before !== this._moved.size) {
      this.emit('hui-overflow-change', { count: this._popupItems.length, items: this._popupItems });
    }
  }

  /** Các control đang nằm trong menu tràn */
  get overflowItems() {
    return this._popupItems;
  }

  _togglePopup(open, focusMore) {
    if (open === this._popupOpen) return;
    this._popupOpen = open;
    this._more.setAttribute('aria-expanded', String(open));
    this.setState('menu-open', open);
    if (open) {
      showFloating(this._popup, '--hui-z-dropdown');
      this._stop = autoUpdate(this._more, this._popup, () => {
        const pos = computePosition(this._more, this._popup, { placement: 'bottom-end', offset: 6 });
        this._popup.style.left = `${pos.x}px`;
        this._popup.style.top = `${pos.y}px`;
      });
      this._overlay = openOverlay({
        element: this._popup,
        ignore: [this._more],
        restoreFocus: false,
        onEscape: () => this._togglePopup(false, true),
        onClickOutside: () => this._togglePopup(false, false),
      });
      if (!this.noAnimation && !animationsDisabled()) animateIn(this._popup, 'slide-down', { origin: 'top right' });
      requestAnimationFrame(() => {
        const first = this._popupItems.find((el) => !this._isDisabled(el));
        if (first && this._popupOpen) this._focusTarget(first).focus();
      });
      return;
    }
    this._stop?.();
    this._stop = null;
    this._overlay?.close();
    this._overlay = null;
    hideFloating(this._popup);
    if (focusMore && !this._more.hidden) {
      this._current = this._more;
      this._syncRoving();
      this._more.focus();
    }
  }

  _onPopupKeydown(e) {
    const origin = e.composedPath()[0];
    if (e.key === 'Tab') {
      this._togglePopup(false, false);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || isTextField(origin) && (e.key === 'Home' || e.key === 'End')) return;
    const items = this._popupItems.filter((el) => !this._isDisabled(el));
    if (!items.length) return;
    const path = e.composedPath();
    let i = items.findIndex((el) => path.includes(el));
    if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = items.length - 1;
    else if (e.key === 'ArrowDown') i = (i + 1) % items.length;
    else i = (i - 1 + items.length) % items.length;
    e.preventDefault();
    this._focusTarget(items[i]).focus();
  }
}

defineElement('hui-toolbar', HuiToolbar);

export default HuiToolbar;
