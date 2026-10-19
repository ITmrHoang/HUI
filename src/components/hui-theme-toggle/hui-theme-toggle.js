/**
 * HUI Theme Toggle — Nút đổi giao diện sáng / tối / theo hệ thống, nhớ lựa chọn (localStorage "hui-theme"),
 * hiệu ứng lan vòng tròn từ nút bấm (View Transitions API, fallback mờ dần).
 * Helper dùng không cần component: applyTheme(mode), getStoredTheme() — vd đặt trong <head> để tránh nháy theme.
 */

import styles from './hui-theme-toggle.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import '../hui-icon/index.js';

export const THEME_MODES = ['light', 'dark', 'system'];
export const THEME_STORAGE_KEY = 'hui-theme';
const VARIANTS = ['icon', 'switch', 'segmented'];
const SIZES = ['sm', 'md', 'lg'];
const ICON_OF = { light: 'sun', dark: 'moon', system: 'monitor' };

// Icon sun / moon / monitor nằm trong bộ icon chung (hui-icon/icons.js)

/** Chuỗi chưa có trong locale.js → chuỗi dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  vi: { 'theme.label': 'Giao diện', 'theme.light': 'Sáng', 'theme.dark': 'Tối', 'theme.system': 'Theo hệ thống', 'theme.darkMode': 'Chế độ tối' },
  en: { 'theme.label': 'Theme', 'theme.light': 'Light', 'theme.dark': 'Dark', 'theme.system': 'System', 'theme.darkMode': 'Dark mode' },
};
function tx(key) {
  const v = t(key);
  return v !== key ? v : (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

// =====================================================
// HELPER DÙNG CHUNG (export)
// =====================================================

const darkQuery = () => (typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null);

/** Lựa chọn đã lưu ('light' | 'dark' | 'system') hoặc null (chưa lưu / storage bị chặn) */
export function getStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_MODES.includes(v) ? v : null;
  } catch {
    return null;
  }
}

/** Lưu lựa chọn (bỏ qua nếu storage bị chặn) */
export function storeTheme(mode) {
  try {
    if (THEME_MODES.includes(mode)) localStorage.setItem(THEME_STORAGE_KEY, mode);
    else localStorage.removeItem(THEME_STORAGE_KEY);
  } catch { /* storage bị chặn → chỉ áp dụng trong phiên */ }
}

/** Chế độ đang áp trên <html>: data-theme light/dark, không có → 'system' */
export function getCurrentTheme() {
  const v = document.documentElement.getAttribute('data-theme');
  return v === 'light' || v === 'dark' ? v : 'system';
}

/** 'system' → 'light' | 'dark' theo hệ điều hành */
export function resolveTheme(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return darkQuery()?.matches ? 'dark' : 'light';
}

/**
 * Áp chế độ lên <html>: light/dark → data-theme; system → gỡ data-theme (token theo prefers-color-scheme).
 * mode không hợp lệ / null (vd: applyTheme(getStoredTheme()) khi chưa lưu) → không làm gì.
 * Phát `hui-theme-change` {mode, resolved} trên document. Trả về theme thực tế ('light' | 'dark').
 */
export function applyTheme(mode) {
  if (typeof document === 'undefined') return null;
  if (!THEME_MODES.includes(mode)) return resolveTheme(getCurrentTheme());
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  const resolved = resolveTheme(mode);
  document.dispatchEvent(new CustomEvent('hui-theme-change', { detail: { mode, resolved } }));
  return resolved;
}

// =====================================================
// HIỆU ỨNG CHUYỂN THEME
// =====================================================

const VT_ATTR = 'data-hui-theme-transition';
const VT_CSS = `
:root[${VT_ATTR}]::view-transition-old(root),
:root[${VT_ATTR}]::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
`;
let vtStyle = null;

/** Chèn 1 lần CSS tắt hiệu ứng mặc định của view transition — chỉ khi <html> đang mang cờ của HUI */
function ensureVtStyle() {
  if (vtStyle?.isConnected) return;
  vtStyle = document.querySelector(`style[${VT_ATTR}]`) || createElement('style', { [VT_ATTR]: '' });
  vtStyle.textContent = VT_CSS;
  if (!vtStyle.isConnected) document.head.append(vtStyle);
}

/**
 * Chạy `apply` kèm hiệu ứng: View Transitions → vòng tròn lan từ (x, y); không hỗ trợ → mờ dần trang.
 * Trả Promise khi xong.
 */
function runTransition(apply, origin, animate) {
  if (!animate) {
    apply();
    return Promise.resolve();
  }
  const root = document.documentElement;
  if (typeof document.startViewTransition === 'function') {
    ensureVtStyle();
    root.setAttribute(VT_ATTR, '');
    let vt;
    try {
      vt = document.startViewTransition(apply);
    } catch {
      root.removeAttribute(VT_ATTR);
      apply();
      return Promise.resolve();
    }
    const { x, y } = origin || { x: innerWidth / 2, y: innerHeight / 2 };
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 500, easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
    return vt.finished.catch(() => {}).finally(() => root.removeAttribute(VT_ATTR));
  }
  apply();
  document.body?.animate?.([{ opacity: 0.55 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
  return Promise.resolve();
}

/** Toggle đầu tiên trên trang khôi phục lựa chọn đã lưu */
let restored = false;

/**
 * Nút đổi giao diện. Bấm → lưu lựa chọn + áp lên <html data-theme> với hiệu ứng lan vòng tròn.
 * Nhiều toggle trên trang (và nhiều tab trình duyệt) tự đồng bộ với nhau.
 *
 * @fires change - Người dùng đổi chế độ. detail: { mode: 'light'|'dark'|'system', resolved: 'light'|'dark' }
 * @csspart base - Khung ngoài
 * @csspart button - Nút (variant icon)
 * @csspart icon - Icon trong nút (variant icon)
 * @csspart label - Chữ tên chế độ (show-label)
 * @csspart switch - Nút gạt role="switch" (variant switch)
 * @csspart track - Rãnh của nút gạt
 * @csspart thumb - Núm của nút gạt (chứa icon)
 * @csspart segmented - Nhóm 3 lựa chọn role="radiogroup" (variant segmented)
 * @csspart option - Mỗi lựa chọn (thêm option-active khi đang chọn)
 * @csspart indicator - Nền trượt dưới lựa chọn đang chọn
 * @cssprop --hui-theme-toggle-size - Chiều cao (mặc định theo size)
 * @cssprop --hui-theme-toggle-radius - Bo góc (variant icon / segmented)
 * @cssprop --hui-theme-toggle-bg - Nền nút / nhóm
 * @cssprop --hui-theme-toggle-color - Màu icon / chữ
 * @cssprop --hui-theme-toggle-border-color - Viền
 * @cssprop --hui-theme-toggle-hover-color - Màu khi hover
 * @cssprop --hui-theme-toggle-active-color - Màu lựa chọn đang chọn (segmented)
 * @cssprop --hui-theme-toggle-indicator-bg - Nền trượt (segmented)
 * @cssprop --hui-theme-toggle-track-bg - Rãnh nút gạt khi sáng
 * @cssprop --hui-theme-toggle-track-active-bg - Rãnh nút gạt khi tối
 * @cssprop --hui-theme-toggle-thumb-bg - Núm nút gạt
 */
class HuiThemeToggle extends HuiElement {
  static properties = {
    /** light | dark | system — chế độ đang chọn (system: theo hệ điều hành) */
    mode: { type: String, default: 'system' },
    /** icon | switch | segmented — icon: 1 nút xoay vòng 3 chế độ; switch: gạt sáng ↔ tối; segmented: 3 lựa chọn */
    variant: { type: String, default: 'icon' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Hiện chữ tên chế độ cạnh icon (icon / segmented) */
    showLabel: { type: Boolean },
    /** Tắt hiệu ứng lan vòng tròn / xoay icon */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  render() {
    // Variant icon
    this._icon = createElement('hui-icon', { name: 'monitor' });
    this._iconBox = createElement('span', { className: 'tt__icon', part: 'icon' }, this._icon);
    this._label = createElement('span', { className: 'tt__label', part: 'label' });
    this._button = createElement('button', { className: 'tt__button', part: 'button', type: 'button' }, this._iconBox, this._label);
    this._button.addEventListener('click', () => {
      const next = THEME_MODES[(THEME_MODES.indexOf(this._mode) + 1) % THEME_MODES.length];
      this.setMode(next, { origin: this._button });
    });

    // Variant switch
    this._thumbIcon = createElement('hui-icon', { name: 'sun' });
    this._thumb = createElement('span', { className: 'tt__thumb', part: 'thumb' }, this._thumbIcon);
    this._switch = createElement('button', { className: 'tt__switch', part: 'switch', type: 'button', role: 'switch' },
      createElement('span', { className: 'tt__track', part: 'track' }, this._thumb));
    this._switch.addEventListener('click', () => {
      this.setMode(resolveTheme(this._mode) === 'dark' ? 'light' : 'dark', { origin: this._switch });
    });

    // Variant segmented (APG radio group: mũi tên di chuyển + chọn, roving tabindex)
    this._indicator = createElement('span', { className: 'tt__indicator', part: 'indicator', 'aria-hidden': 'true' });
    this._options = THEME_MODES.map((mode) => {
      const label = createElement('span', { className: 'tt__label', part: 'label' });
      const btn = createElement('button', {
        className: 'tt__option', part: 'option', type: 'button', role: 'radio', dataset: { mode },
      }, createElement('hui-icon', { name: ICON_OF[mode] }), label);
      btn.addEventListener('click', () => this.setMode(mode, { origin: btn }));
      return btn;
    });
    this._segmented = createElement('div', { className: 'tt__segmented', part: 'segmented', role: 'radiogroup' },
      this._indicator, ...this._options);
    this._segmented.addEventListener('keydown', (e) => this._onSegmentedKey(e));

    this._base = createElement('div', { className: 'tt', part: 'base' }, this._button, this._switch, this._segmented);
    return this._base;
  }

  connectedCallback() {
    if (!this._initialized) {
      this._initialized = true;
      const stored = getStoredTheme();
      if (!restored) {
        restored = true;
        if (stored) applyTheme(stored);
      }
      // Ưu tiên: đã lưu → attribute mode của tác giả (áp ở lần updated đầu) → trạng thái đang có trên <html>
      if (stored) this.mode = stored;
      else if (!this.hasAttribute('mode')) this.mode = getCurrentTheme();
    }
    super.connectedCallback();
    // Toggle khác / applyTheme() đổi theme → đồng bộ
    this.listen(document, 'hui-theme-change', (e) => {
      const mode = e.detail?.mode;
      if (THEME_MODES.includes(mode) && mode !== this.mode) this.mode = mode;
      else this._syncUi();
    });
    // Tab trình duyệt khác đổi lựa chọn
    this.listen(window, 'storage', (e) => {
      if (e.key === THEME_STORAGE_KEY && THEME_MODES.includes(e.newValue)) applyTheme(e.newValue);
    });
    // Hệ điều hành đổi sáng/tối khi đang ở system
    const mq = darkQuery();
    if (mq) this.listen(mq, 'change', () => this._syncUi());
  }

  updated(changed) {
    if (changed.has('variant') || changed.has('size')) {
      const variant = this._variant;
      const size = SIZES.includes(this.size) ? this.size : 'md';
      this._base.className = `tt tt--${variant} tt--${size}`;
      this._button.hidden = variant !== 'icon';
      this._switch.hidden = variant !== 'switch';
      this._segmented.hidden = variant !== 'segmented';
    }
    // Đổi mode bằng attribute / property → áp lên <html> (setMode tự áp kèm hiệu ứng)
    if (changed.has('mode') && !this._transitioning && this._mode !== getCurrentTheme()) applyTheme(this._mode);

    const prevMode = this._shownMode;
    this._syncUi();
    if (changed.has('mode') && prevMode && prevMode !== this._mode) this._animateIcons();
  }

  get _mode() {
    return THEME_MODES.includes(this.mode) ? this.mode : 'system';
  }

  get _variant() {
    return VARIANTS.includes(this.variant) ? this.variant : 'icon';
  }

  /** Theme thực tế đang hiển thị: 'light' | 'dark' */
  get resolved() {
    return resolveTheme(this._mode);
  }

  get _animationsOn() {
    if (this.noAnimation || prefersReducedMotion()) return false;
    return !document.documentElement.hasAttribute('data-hui-no-animation');
  }

  /**
   * Đổi chế độ như người dùng bấm: lưu localStorage, áp lên <html> có hiệu ứng, phát `change`.
   * @param {'light'|'dark'|'system'} mode
   * @param {{ origin?: Element, animate?: boolean }} [options] origin: tâm vòng tròn lan (mặc định chính toggle)
   */
  setMode(mode, { origin, animate = true } = {}) {
    if (!THEME_MODES.includes(mode)) return Promise.resolve();
    storeTheme(mode);
    const rect = (origin || this).getBoundingClientRect();
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const token = (this._transitionToken = (this._transitionToken || 0) + 1);
    this._transitioning = true;
    this.mode = mode; // cập nhật giao diện nút ngay, theme áp trong callback của transition
    // Trùng chế độ thực tế (vd: system → light khi hệ điều hành đang sáng) thì không cần lan vòng tròn
    const sameLook = resolveTheme(getCurrentTheme()) === resolveTheme(mode);
    return runTransition(() => {
      const resolved = applyTheme(mode);
      this.emit('change', { mode, resolved });
    }, point, animate && !sameLook && this._animationsOn).finally(() => {
      if (token === this._transitionToken) this._transitioning = false;
    });
  }

  _syncUi() {
    if (!this._hasRendered) return;
    const mode = this._mode;
    const resolved = resolveTheme(mode);
    this._shownMode = mode;

    // icon
    this._icon.name = ICON_OF[mode];
    this._label.textContent = tx(`theme.${mode}`);
    this._label.hidden = !this.showLabel;
    const label = `${tx('theme.label')}: ${tx(`theme.${mode}`)}`;
    this._button.setAttribute('aria-label', label);
    this._button.title = label;

    // switch
    this._switch.setAttribute('aria-checked', String(resolved === 'dark'));
    this._switch.setAttribute('aria-label', tx('theme.darkMode'));
    this._switch.title = `${tx('theme.label')}: ${tx(`theme.${resolved}`)}`;
    this._thumbIcon.name = ICON_OF[resolved];
    this._thumb.dataset.theme = resolved;

    // segmented
    this._segmented.setAttribute('aria-label', tx('theme.label'));
    this._options.forEach((btn, i) => {
      const m = THEME_MODES[i];
      const on = m === mode;
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;
      btn.setAttribute('part', on ? 'option option-active' : 'option');
      btn.title = tx(`theme.${m}`);
      const text = btn.querySelector('.tt__label');
      text.textContent = tx(`theme.${m}`);
      text.hidden = !this.showLabel;
      if (this.showLabel) btn.removeAttribute('aria-label');
      else btn.setAttribute('aria-label', tx(`theme.${m}`));
    });
    this._indicator.style.setProperty('--_theme-toggle-index', String(THEME_MODES.indexOf(mode)));
    this._base.classList.toggle('tt--labels', this.showLabel);
  }

  /** Icon mới xoay + phóng nhẹ vào */
  _animateIcons() {
    if (!this._animationsOn) return;
    const target = this._variant === 'icon' ? this._iconBox : this._variant === 'switch' ? this._thumbIcon : null;
    target?.animate?.(
      [{ transform: 'rotate(-90deg) scale(0.4)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 350, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
    );
  }

  _onSegmentedKey(e) {
    const i = THEME_MODES.indexOf(this._mode);
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % 3;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i + 2) % 3;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 2;
    if (next === null) return;
    e.preventDefault();
    const btn = this._options[next];
    this.setMode(THEME_MODES[next], { origin: btn });
    btn.focus();
  }

  /** Focus vào nút đang hiển thị */
  focus(options) {
    const target = this._variant === 'switch' ? this._switch
      : this._variant === 'segmented' ? this._options[THEME_MODES.indexOf(this._mode)] : this._button;
    if (target) target.focus(options);
    else super.focus(options);
  }
}

defineElement('hui-theme-toggle', HuiThemeToggle);

export default HuiThemeToggle;
