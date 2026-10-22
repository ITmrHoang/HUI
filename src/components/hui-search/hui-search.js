/**
 * HUI Search — Ô tìm kiếm (Ant Input.Search), kế thừa hui-autocomplete nên có sẵn gợi ý khi gán
 * `options` / `fetchFn`. Icon kính lúp, nút xóa, nút tìm (enter-button), phát `hui-search` sau debounce
 * khi gõ và ngay lập tức khi Enter / bấm nút / xóa. Phím tắt `/` (attribute shortcut) để focus từ bất kỳ đâu.
 */

import searchStyles from './hui-search.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { HuiAutocomplete } from '../hui-autocomplete/hui-autocomplete.js';
import '../hui-icon/hui-icon.js';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

/** "ctrl+k" | "mod+k" | "/" → { key, ctrl, meta, alt, shift } */
function parseShortcut(raw) {
  const parts = String(raw).toLowerCase().split('+').map((s) => s.trim()).filter(Boolean);
  const key = parts.pop() || '/';
  const mods = new Set(parts);
  const mod = mods.has('mod');
  return {
    key,
    ctrl: mods.has('ctrl') || (mod && !IS_MAC),
    meta: mods.has('meta') || mods.has('cmd') || (mod && IS_MAC),
    alt: mods.has('alt'),
    shift: mods.has('shift'),
  };
}

function shortcutLabel(sc) {
  const keys = [];
  if (sc.ctrl) keys.push(IS_MAC ? '⌃' : 'Ctrl');
  if (sc.meta) keys.push(IS_MAC ? '⌘' : 'Win');
  if (sc.alt) keys.push(IS_MAC ? '⌥' : 'Alt');
  if (sc.shift) keys.push('Shift');
  keys.push(sc.key.length === 1 ? sc.key.toUpperCase() : sc.key);
  return keys.join(IS_MAC ? '' : ' ');
}

/** Phần tử đang nhận chữ (không cướp phím tắt khi người dùng đang gõ ở ô khác) */
function isEditable(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || '');
}

/**
 * Ô tìm kiếm (giá trị = chữ đang gõ), gợi ý tùy chọn.
 * @fires hui-search - detail: { query, trigger: 'input' | 'enter' | 'button' | 'clear' } — 'input' phát sau `debounce` ms
 * @fires input - Chữ đổi khi gõ. detail: { value }
 * @fires change - Chữ đã chốt (Enter, chọn gợi ý, rời ô). detail: { value }
 * @fires hui-select - Chọn một gợi ý. detail: { value, label, option }
 * @fires clear - Bấm nút xóa
 * @slot prefix - Thay icon kính lúp
 * @slot suffix - Nội dung sau ô nhập
 * @csspart icon - Icon kính lúp
 * @csspart shortcut - Gợi ý phím tắt (<kbd>)
 * @csspart submit - Nút tìm (enter-button)
 * @csspart container - Khung viền (xem thêm các part của hui-autocomplete)
 * @csspart input - Thẻ <input type="search">
 * @csspart dropdown - Popup gợi ý
 * @cssprop --hui-search-height - Chiều cao ô
 * @cssprop --hui-search-radius - Bo góc ô
 * @cssprop --hui-search-bg - Nền ô
 * @cssprop --hui-search-border-color - Viền
 * @cssprop --hui-search-focus-border-color - Viền khi focus
 * @cssprop --hui-search-icon-color - Màu icon kính lúp
 * @cssprop --hui-search-button-bg - Nền nút tìm
 * @cssprop --hui-search-button-color - Màu chữ nút tìm
 */
class HuiSearch extends HuiAutocomplete {
  static properties = {
    /** Phím tắt focus ô tìm (vd "/", "ctrl+k", "mod+k"); attribute rỗng = "/" */
    shortcut: { type: String, default: null },
    /** Nút tìm gắn bên phải: attribute rỗng = nút icon, có chữ = nút chữ */
    enterButton: { type: String, default: null },
  };

  static styles = [...HuiAutocomplete.styles, searchStyles];

  get _free() {
    return true;
  }

  get _clearEnabled() {
    return true;
  }

  get _comboRole() {
    return this._hasSuggestions;
  }

  connectedCallback() {
    super.connectedCallback();
    this.listen(document, 'keydown', (e) => this._onShortcut(e));
  }

  render() {
    const root = super.render();
    this._input.type = 'search';
    this._input.setAttribute('enterkeyhint', 'search');

    // Icon kính lúp là nội dung mặc định của slot prefix
    this._icon = createElement('hui-icon', { name: 'search', className: 'ac__search-icon', part: 'icon', 'aria-hidden': 'true' });
    this._prefixSlot.append(this._icon);

    this._kbd = createElement('kbd', { className: 'ac__kbd', part: 'shortcut', 'aria-hidden': 'true', hidden: true });
    this._container.insertBefore(this._kbd, this._suffix);

    this._submitIcon = createElement('hui-icon', { name: 'search', 'aria-hidden': 'true' });
    this._submitText = createElement('span', { className: 'ac__submit-text' });
    this._submit = createElement('button', { type: 'button', className: 'ac__submit', part: 'submit', hidden: true },
      this._submitIcon, this._submitText);
    this._submit.addEventListener('click', () => this._submitSearch('button'));
    this._control.append(this._submit);
    return root;
  }

  updated(changed) {
    super.updated(changed);
    if (changed.has('shortcut')) {
      this._sc = this.shortcut === null ? null : parseShortcut(this.shortcut || '/');
      this._kbd.hidden = !this._sc;
      this._kbd.textContent = this._sc ? shortcutLabel(this._sc) : '';
      if (this._sc) this._input.setAttribute('aria-keyshortcuts', this.shortcut || '/');
      else this._input.removeAttribute('aria-keyshortcuts');
    }
    if (changed.has('enterButton') || changed.has('locale')) {
      const on = this.enterButton !== null;
      this._submit.hidden = !on;
      this._submitText.textContent = this.enterButton || '';
      this._submitText.hidden = !this.enterButton;
      this._submitIcon.hidden = Boolean(this.enterButton);
      this._submit.setAttribute('aria-label', this.enterButton || t('common.search'));
      this._wrapper.classList.toggle('ac--enter-button', on);
    }
    if (changed.has('label') || changed.has('locale')) {
      if (!this.label) this._input.setAttribute('aria-label', this.placeholder || t('common.search'));
      else this._input.removeAttribute('aria-label');
    }
    if (changed.has('disabled')) this._submit.disabled = this.isDisabled;
    this._wrapper.classList.toggle('ac--enter-button', this.enterButton !== null);
  }

  /** Icon mặc định (fallback của slot prefix) luôn hiện, kể cả khi slot trống */
  _syncAffixes() {
    this._prefix.hidden = this.enterButton !== null && !this._prefixSlot.assignedNodes().length;
    this._suffix.hidden = !this._suffixSlot.assignedNodes().length;
  }

  /** Enter (không có gợi ý đang highlight) → tìm ngay */
  _onEnter() {
    this._submitSearch('enter');
  }

  _submitSearch(trigger) {
    if (this.isDisabled) return;
    clearTimeout(this._timer);
    this._wantOpen = false;
    this._closePopup();
    this._commit();
    this.emit('hui-search', { query: this._text, trigger });
  }

  _onShortcut(e) {
    const sc = this._sc;
    if (!sc || this.isDisabled || e.defaultPrevented) return;
    if (isEditable(e.composedPath()[0])) return;
    if (e.key.toLowerCase() !== sc.key) return;
    // Phím 1 ký tự không modifier (vd "/"): bỏ qua shift vì có bàn phím cần shift mới gõ được
    const single = !sc.ctrl && !sc.meta && !sc.alt;
    if (e.ctrlKey !== sc.ctrl || e.metaKey !== sc.meta || e.altKey !== sc.alt) return;
    if (!single && e.shiftKey !== sc.shift) return;
    e.preventDefault();
    this._input.focus();
    this._input.select();
  }
}

defineElement('hui-search', HuiSearch);

export default HuiSearch;
