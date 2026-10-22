/**
 * HUI Language Switch — Chọn ngôn ngữ (cờ + tên): dropdown (hui-dropdown + hui-menu) hoặc hàng nút inline.
 * Chọn xong gọi setLocale() nếu mã ngôn ngữ đã đăng ký (registerLocale) và phát `hui-language-change`.
 */

import styles from './hui-language-switch.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName, setLocale } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-dropdown/index.js';
import '../hui-menu/index.js';
import '../hui-icon/index.js';

const VARIANTS = ['dropdown', 'inline'];
const MODES = ['both', 'flag', 'label', 'code'];
const SIZES = ['sm', 'md', 'lg'];

const FALLBACK = {
  vi: { 'languageSwitch.label': 'Ngôn ngữ', 'languageSwitch.current': 'Ngôn ngữ: {label}' },
  en: { 'languageSwitch.label': 'Language', 'languageSwitch.current': 'Language: {label}' },
};
function tx(key, vars) {
  let v = t(key, vars);
  if (v !== key) return v;
  v = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : v;
}

export const DEFAULT_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

/**
 * Gọi setLocale(name) chỉ khi `name` đã đăng ký. locale.js không có API kiểm tra → gọi thử (tắt cảnh báo
 * console tạm thời) rồi so sánh getLocaleName(). Trả về true nếu đổi được.
 */
function trySetLocale(name) {
  if (!name) return false;
  if (getLocaleName() === name) return true;
  const warn = console.warn;
  console.warn = () => {};
  try {
    setLocale(name);
  } finally {
    console.warn = warn;
  }
  return getLocaleName() === name;
}

/** Cờ: emoji / chữ, chuỗi SVG ('<svg…'), hoặc URL ảnh (data:, .svg, .png…) */
function renderFlag(flag) {
  const wrap = createElement('span', { className: 'ls__flag', part: 'flag', 'aria-hidden': 'true' });
  if (!flag) {
    wrap.hidden = true;
    return wrap;
  }
  const value = String(flag).trim();
  if (value.startsWith('<svg')) {
    // SVG do lập trình viên khai báo trong `languages` (dữ liệu tin cậy, không phải nội dung người dùng nhập)
    const tpl = document.createElement('template');
    tpl.innerHTML = value;
    const svg = tpl.content.querySelector('svg');
    if (svg) wrap.append(svg);
  } else if (/^(data:image\/|https?:\/\/|\/|\.\/)/.test(value) || /\.(svg|png|webp|gif|jpe?g)(\?.*)?$/i.test(value)) {
    wrap.append(createElement('img', { src: value, alt: '', loading: 'lazy', decoding: 'async' }));
  } else {
    wrap.textContent = value;
  }
  return wrap;
}

/**
 * Chọn ngôn ngữ. `value` = mã ngôn ngữ đang chọn (mặc định theo getLocaleName()).
 * Mỗi mục: { code, label, flag, locale } — `locale` (mặc định = code) là tên truyền cho setLocale;
 * `locale: false` = không đổi locale của HUI (chỉ phát sự kiện, vd: trang tự điều hướng /en/).
 *
 * @fires hui-language-change - Người dùng chọn ngôn ngữ khác. Cancelable (preventDefault() → giữ ngôn ngữ cũ).
 *   detail: { code, previous, language, locale } — locale: tên đã truyền cho setLocale, null nếu không đổi
 * @csspart base - Khung ngoài
 * @csspart trigger - Nút mở menu (variant dropdown)
 * @csspart flag - Cờ
 * @csspart label - Tên ngôn ngữ
 * @csspart arrow - Mũi tên trên nút
 * @csspart dropdown - hui-dropdown (variant dropdown)
 * @csspart menu - hui-menu trong popup
 * @csspart item - Mỗi mục (hui-menu-item hoặc nút inline)
 * @csspart check - Dấu ✓ cạnh mục đang chọn (dropdown)
 * @cssprop --hui-language-switch-gap - Khoảng cách cờ ↔ tên
 * @cssprop --hui-language-switch-color - Màu chữ nút
 * @cssprop --hui-language-switch-bg - Nền nút
 * @cssprop --hui-language-switch-hover-bg - Nền khi hover
 * @cssprop --hui-language-switch-border-color - Viền nút
 * @cssprop --hui-language-switch-radius - Bo góc
 * @cssprop --hui-language-switch-active-bg - Nền mục đang chọn (inline)
 * @cssprop --hui-language-switch-active-color - Chữ mục đang chọn (inline)
 * @cssprop --hui-language-switch-flag-size - Cỡ cờ
 */
class HuiLanguageSwitch extends HuiElement {
  static properties = {
    /** Danh sách ngôn ngữ [{ code, label, flag, locale }] */
    languages: { type: Array, default: null },
    /** Mã ngôn ngữ đang chọn (mặc định theo locale hiện tại của HUI) */
    value: { type: String },
    /** dropdown | inline — dropdown: nút + menu thả xuống; inline: hàng nút (radiogroup) */
    variant: { type: String, default: 'dropdown' },
    /** both | flag | label | code — nội dung hiển thị trên nút (tên vẫn có cho trình đọc màn hình) */
    mode: { type: String, default: 'both' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Vị trí menu (xem hui-dropdown) */
    placement: { type: String, default: 'bottom-end' },
    /** Không gọi setLocale (chỉ phát sự kiện) */
    manual: { type: Boolean },
    /** Đồng bộ <html lang> theo ngôn ngữ đã chọn */
    htmlLang: { type: Boolean },
    /** Vô hiệu hóa */
    disabled: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  render() {
    this._base = createElement('div', { className: 'ls', part: 'base' });
    return this._base;
  }

  updated(changed) {
    // Đổi locale ở nơi khác (setLocale) → chọn theo, không phát sự kiện
    if (changed.has('locale') && this._mounted && !this.manual) {
      const match = this._list.find((l) => this._localeOf(l) === getLocaleName());
      if (match && match.code !== this.value) this.value = match.code;
    }
    if (!this.value && this._list.length) {
      const cur = getLocaleName();
      const match = this._list.find((l) => this._localeOf(l) === cur || l.code === cur);
      this.value = (match || this._list[0]).code;
    }

    const structural = ['languages', 'variant', 'mode', 'size', 'placement', 'disabled'].some((k) => changed.has(k));
    if (structural) this._build();
    else if (changed.has('value') || changed.has('locale')) this._sync();

    if (changed.has('value') && this.htmlLang && this.value) document.documentElement.lang = this.value;
  }

  firstUpdated() {
    this._mounted = true;
  }

  // =====================================================
  // DỮ LIỆU
  // =====================================================

  get _list() {
    const list = Array.isArray(this.languages) && this.languages.length ? this.languages : DEFAULT_LANGUAGES;
    return list.filter((l) => l && l.code !== undefined && l.code !== null).map((l) => ({ ...l, code: String(l.code) }));
  }

  _localeOf(lang) {
    if (lang.locale === false) return null;
    return lang.locale ? String(lang.locale) : lang.code;
  }

  /** Ngôn ngữ đang chọn */
  get selectedLanguage() {
    return this._list.find((l) => l.code === this.value) || null;
  }

  // =====================================================
  // DỰNG GIAO DIỆN
  // =====================================================

  _content(lang, extraClass = '') {
    const mode = MODES.includes(this.mode) ? this.mode : 'both';
    const flag = renderFlag(lang.flag);
    if (mode === 'label' || mode === 'code') flag.hidden = true;
    const label = createElement('span', { className: `ls__label${extraClass}`, part: 'label', lang: lang.code },
      mode === 'code' ? lang.code.toUpperCase() : String(lang.label ?? lang.code));
    // Chỉ cờ / mã → tên đầy đủ vẫn đọc được bằng trình đọc màn hình
    if (mode === 'flag') label.classList.add('ls__sr');
    const nodes = [flag, label];
    if (mode === 'code') nodes.push(createElement('span', { className: 'ls__sr', lang: lang.code }, String(lang.label ?? '')));
    return nodes;
  }

  _build() {
    const variant = VARIANTS.includes(this.variant) ? this.variant : 'dropdown';
    const size = SIZES.includes(this.size) ? this.size : 'md';
    this._base.className = `ls ls--${variant} ls--${size}${this.disabled ? ' ls--disabled' : ''}`;
    this._items = [];
    if (variant === 'inline') this._buildInline();
    else this._buildDropdown();
    this._sync();
  }

  _buildDropdown() {
    this._triggerContent = createElement('span', { className: 'ls__current' });
    this._trigger = createElement('button', {
      type: 'button', className: 'ls__trigger', part: 'trigger', disabled: this.disabled,
    }, this._triggerContent, createElement('hui-icon', { name: 'chevron-down', className: 'ls__arrow', part: 'arrow' }));

    this._menu = createElement('hui-menu', { slot: 'menu', part: 'menu', mode: 'vertical' });
    this._menu.append(...this._list.map((lang) => {
      const item = createElement('hui-menu-item', { key: lang.code, part: 'item' });
      // Menu luôn hiện cờ + tên đầy đủ (bất kể mode của nút)
      const flag = renderFlag(lang.flag);
      flag.slot = 'icon';
      const label = createElement('span', { className: 'ls__label', part: 'label', lang: lang.code }, String(lang.label ?? lang.code));
      const check = createElement('hui-icon', { name: 'check', slot: 'extra', className: 'ls__check', part: 'check' });
      item.append(flag, label, check);
      this._items.push({ code: lang.code, el: item, check });
      return item;
    }));

    this._dropdown = createElement('hui-dropdown', {
      trigger: 'click', placement: this.placement || 'bottom-end', part: 'dropdown', selectable: true, disabled: this.disabled,
    }, this._trigger, this._menu);
    this._dropdown.addEventListener('hui-select', (e) => {
      // Sự kiện nội bộ của menu → không cho lọt ra ngoài (component phát hui-language-change riêng)
      e.stopPropagation();
      this._choose(String(e.detail?.key ?? ''));
    });
    this._base.replaceChildren(this._dropdown);
  }

  _buildInline() {
    this._dropdown = null;
    this._menu = null;
    const group = createElement('div', { className: 'ls__group', role: 'radiogroup' });
    group.append(...this._list.map((lang) => {
      const btn = createElement('button', {
        type: 'button', className: 'ls__option', part: 'item', role: 'radio', 'data-code': lang.code, disabled: this.disabled,
      }, ...this._content(lang));
      btn.addEventListener('click', () => this._choose(lang.code, btn));
      this._items.push({ code: lang.code, el: btn });
      return btn;
    }));
    group.addEventListener('keydown', (e) => this._onInlineKeydown(e));
    this._group = group;
    this._base.replaceChildren(group);
  }

  /** Cập nhật trạng thái chọn + nhãn (không dựng lại DOM) */
  _sync() {
    const current = this.selectedLanguage || this._list[0];
    if (this._group) this._group.setAttribute('aria-label', tx('languageSwitch.label'));
    if (this._trigger && current) {
      this._triggerContent.replaceChildren(...this._content(current));
      this._trigger.setAttribute('aria-label', tx('languageSwitch.current', { label: current.label ?? current.code }));
    }
    if (this._menu) {
      this._menu.selectedKeys = current ? [current.code] : [];
      this._menu.setAttribute('aria-label', tx('languageSwitch.label'));
    }
    const hasSelected = this._items.some((it) => it.code === this.value);
    this._items.forEach((it, i) => {
      const on = it.code === this.value;
      if (it.check) {
        it.check.hidden = !on;
        it.el.toggleAttribute('data-selected', on);
      } else {
        it.el.setAttribute('aria-checked', String(on));
        // Roving tabindex: chỉ mục đang chọn (hoặc mục đầu) nằm trong thứ tự Tab
        it.el.tabIndex = on || (!hasSelected && i === 0) ? 0 : -1;
      }
    });
  }

  _onInlineKeydown(e) {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const btns = this._items.map((it) => it.el).filter((b) => !b.disabled);
    if (!btns.length) return;
    e.preventDefault();
    let i = btns.indexOf(this.shadowRoot.activeElement);
    if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = btns.length - 1;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (i + 1) % btns.length;
    else i = (i - 1 + btns.length) % btns.length;
    // APG radiogroup: mũi tên vừa di chuyển focus vừa chọn
    btns[i].focus();
    this._choose(btns[i].dataset.code, btns[i]);
  }

  // =====================================================
  // CHỌN
  // =====================================================

  _choose(code, focusEl) {
    if (this.disabled || !code) return;
    const language = this._list.find((l) => l.code === code);
    if (!language) return;
    if (code === this.value) {
      this._sync();
      return;
    }
    const previous = this.value;
    const name = this.manual ? null : this._localeOf(language);
    const ok = this.emit('hui-language-change', { code, previous, language, locale: name }, { cancelable: true });
    if (!ok) {
      this._sync(); // trả trạng thái chọn của menu / radio về cũ
      return;
    }
    this.value = code;
    const changed = name ? trySetLocale(name) : false;
    if (!changed) this._sync();
    if (focusEl) focusEl.focus();
  }

  /** Mở menu (variant dropdown) */
  show() {
    this._dropdown?.show();
  }

  /** Đóng menu */
  hide() {
    this._dropdown?.hide();
  }
}

defineElement('hui-language-switch', HuiLanguageSwitch);

export default HuiLanguageSwitch;
