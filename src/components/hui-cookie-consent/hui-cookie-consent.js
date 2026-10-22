/**
 * HUI Cookie Consent — Banner đồng ý cookie (Chấp nhận tất cả / Từ chối / Tùy chỉnh theo nhóm).
 * Lựa chọn lưu trong localStorage (`storage-key`) → lần sau không hiện lại; `open()` / `reset()` để mở lại.
 * Hộp "Tùy chỉnh" dùng hui-modal + hui-switch cho từng nhóm cookie.
 */

import styles from './hui-cookie-consent.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import { getDeepActiveElement, getTabbables } from '../../utils/overlay.js';
import '../hui-button/index.js';
import '../hui-modal/index.js';
import '../hui-switch/index.js';

const POSITIONS = ['bottom', 'bottom-left', 'bottom-right'];
const DEFAULT_KEY = 'hui-cookie-consent';
let uid = 0;

/** Chuỗi chưa có trong locale.js → dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  vi: {
    'cookieConsent.label': 'Đồng ý cookie',
    'cookieConsent.title': 'Chúng tôi sử dụng cookie',
    'cookieConsent.message': 'Chúng tôi dùng cookie để website hoạt động ổn định, phân tích lưu lượng và cá nhân hóa nội dung. Bạn có thể chọn loại cookie cho phép.',
    'cookieConsent.acceptAll': 'Chấp nhận tất cả',
    'cookieConsent.reject': 'Từ chối',
    'cookieConsent.customize': 'Tùy chỉnh',
    'cookieConsent.save': 'Lưu lựa chọn',
    'cookieConsent.dialogTitle': 'Tùy chỉnh cookie',
    'cookieConsent.policy': 'Chính sách cookie',
    'cookieConsent.required': 'Luôn bật',
    'cookieConsent.necessary': 'Cần thiết',
    'cookieConsent.necessaryDesc': 'Bắt buộc để website hoạt động (đăng nhập, giỏ hàng, bảo mật).',
    'cookieConsent.analytics': 'Phân tích',
    'cookieConsent.analyticsDesc': 'Giúp chúng tôi hiểu cách bạn sử dụng website để cải thiện trải nghiệm.',
    'cookieConsent.marketing': 'Tiếp thị',
    'cookieConsent.marketingDesc': 'Dùng để hiển thị quảng cáo phù hợp với bạn.',
  },
  en: {
    'cookieConsent.label': 'Cookie consent',
    'cookieConsent.title': 'We use cookies',
    'cookieConsent.message': 'We use cookies to keep the site working, analyse traffic and personalise content. You can choose which cookies to allow.',
    'cookieConsent.acceptAll': 'Accept all',
    'cookieConsent.reject': 'Reject',
    'cookieConsent.customize': 'Customize',
    'cookieConsent.save': 'Save preferences',
    'cookieConsent.dialogTitle': 'Cookie preferences',
    'cookieConsent.policy': 'Cookie policy',
    'cookieConsent.required': 'Always on',
    'cookieConsent.necessary': 'Necessary',
    'cookieConsent.necessaryDesc': 'Required for the site to work (sign-in, cart, security).',
    'cookieConsent.analytics': 'Analytics',
    'cookieConsent.analyticsDesc': 'Helps us understand how the site is used so we can improve it.',
    'cookieConsent.marketing': 'Marketing',
    'cookieConsent.marketingDesc': 'Used to show you relevant ads.',
  },
};
function tx(key) {
  const v = t(key);
  return v !== key ? v : (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

/** Nhóm cookie mặc định (khi không gán `categories`) — nhãn theo locale hiện tại */
function defaultCategories() {
  return [
    { id: 'necessary', label: tx('cookieConsent.necessary'), description: tx('cookieConsent.necessaryDesc'), required: true },
    { id: 'analytics', label: tx('cookieConsent.analytics'), description: tx('cookieConsent.analyticsDesc') },
    { id: 'marketing', label: tx('cookieConsent.marketing'), description: tx('cookieConsent.marketingDesc') },
  ];
}

/** localStorage có thể bị chặn (Safari private, iframe sandbox) → bọc try/catch */
function readStore(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data.categories === 'object' ? data : null;
  } catch {
    return null;
  }
}
function writeStore(key, data) {
  try {
    if (data) localStorage.setItem(key, JSON.stringify(data));
    else localStorage.removeItem(key);
  } catch { /* không lưu được → chỉ nhớ trong phiên hiện tại */ }
}

/**
 * Đọc lựa chọn đã lưu (không cần thẻ trên trang) — vd: quyết định có nạp script analytics hay không.
 * @param {string} [storageKey]
 * @returns {Record<string, boolean> | null}
 */
export function readConsent(storageKey = DEFAULT_KEY) {
  return readStore(storageKey)?.categories ?? null;
}

/**
 * Banner đồng ý cookie. Hiện tự động nếu chưa có lựa chọn lưu trong localStorage (hoặc `consent-version` đổi).
 * Banner không chiếm focus khi tự hiện (không làm phiền người dùng bàn phím); `open()` thì đưa focus vào nút đầu tiên
 * và trả focus về chỗ cũ sau khi chọn.
 *
 * @fires hui-consent - Người dùng chọn. detail: { categories: Record<id, boolean>, accepted: string[], action: 'accept-all' | 'reject-all' | 'custom' }
 * @slot - Nội dung mô tả (thay attribute message)
 * @slot title - Tiêu đề tùy biến (thay attribute heading)
 * @slot icon - Icon / hình minh họa phía trước
 * @slot actions - Nút bổ sung đặt trước cụm nút mặc định
 * @csspart base - Khung banner (role="dialog", không modal)
 * @csspart icon - Vùng slot icon
 * @csspart body - Vùng tiêu đề + mô tả
 * @csspart title - Tiêu đề
 * @csspart message - Mô tả
 * @csspart policy - Link chính sách cookie
 * @csspart actions - Cụm nút
 * @csspart accept-button - Nút "Chấp nhận tất cả" (hui-button)
 * @csspart reject-button - Nút "Từ chối" (hui-button)
 * @csspart customize-button - Nút "Tùy chỉnh" (hui-button)
 * @csspart dialog - hui-modal tùy chỉnh
 * @csspart category - Một dòng nhóm cookie trong hộp tùy chỉnh
 * @csspart category-label - Tên nhóm
 * @csspart category-description - Mô tả nhóm
 * @csspart switch - hui-switch của nhóm
 * @csspart save-button - Nút "Lưu lựa chọn"
 * @cssprop --hui-cookie-consent-bg - Nền banner
 * @cssprop --hui-cookie-consent-color - Màu chữ mô tả
 * @cssprop --hui-cookie-consent-title-color - Màu tiêu đề
 * @cssprop --hui-cookie-consent-radius - Bo góc (dạng hộp góc / bottom có offset)
 * @cssprop --hui-cookie-consent-shadow - Đổ bóng
 * @cssprop --hui-cookie-consent-border-color - Viền
 * @cssprop --hui-cookie-consent-padding - Khoảng đệm
 * @cssprop --hui-cookie-consent-max-width - Rộng tối đa (bottom: hàng nội dung; góc: cả hộp, mặc định 400px)
 * @cssprop --hui-cookie-consent-offset - Khoảng cách tới mép màn hình
 * @cssprop --hui-cookie-consent-z-index - z-index
 */
class HuiCookieConsent extends HuiElement {
  static properties = {
    /** bottom | bottom-left | bottom-right — bottom: dải ngang cả màn hình; còn lại: hộp nhỏ ở góc */
    position: { type: String, default: 'bottom' },
    /** Khóa localStorage lưu lựa chọn */
    storageKey: { type: String, default: DEFAULT_KEY },
    /** Nhóm cookie [{ id, label, description, required, checked }] — bỏ trống = Cần thiết / Phân tích / Tiếp thị */
    categories: { type: Array, default: null },
    /** Tiêu đề (mặc định theo locale) */
    heading: { type: String },
    /** Mô tả (mặc định theo locale; slot mặc định ưu tiên hơn) */
    message: { type: String },
    /** URL trang chính sách cookie → hiện link sau mô tả */
    policyHref: { type: String },
    /** Phiên bản chính sách: khác với bản đã lưu → hỏi lại người dùng */
    consentVersion: { type: String },
    /** Ẩn nút "Từ chối" */
    hideReject: { type: Boolean },
    /** Ẩn nút "Tùy chỉnh" */
    hideCustomize: { type: Boolean },
    /** Trễ trước khi tự hiện lần đầu (ms) */
    delay: { type: Number, default: 0 },
    /** Tắt hiệu ứng trượt vào / ra */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._visible = false;
    this._returnFocus = null;
    this._token = 0;
    this._timer = 0;
    this._switches = new Map();
  }

  render() {
    const id = ++uid;
    this._titleId = `hui-cc-title-${id}`;
    this._msgId = `hui-cc-msg-${id}`;

    const iconSlot = createElement('slot', { name: 'icon' });
    this._icon = createElement('div', { className: 'cc__icon', part: 'icon', hidden: true }, iconSlot);
    iconSlot.addEventListener('slotchange', () => { this._icon.hidden = !iconSlot.assignedNodes().length; });

    this._titleText = document.createTextNode('');
    this._title = createElement('h2', { className: 'cc__title', part: 'title', id: this._titleId },
      createElement('slot', { name: 'title' }, this._titleText));
    this._msgText = document.createTextNode('');
    this._policy = createElement('a', { className: 'cc__policy', part: 'policy', hidden: true });
    this._message = createElement('div', { className: 'cc__message', part: 'message', id: this._msgId },
      createElement('slot', {}, this._msgText), ' ', this._policy);
    const body = createElement('div', { className: 'cc__body', part: 'body' }, this._title, this._message);

    this._acceptBtn = createElement('hui-button', { variant: 'primary', part: 'accept-button' });
    this._rejectBtn = createElement('hui-button', { variant: 'secondary', part: 'reject-button' });
    this._customBtn = createElement('hui-button', { variant: 'text', part: 'customize-button' });
    this._acceptBtn.addEventListener('hui-click', () => this.acceptAll());
    this._rejectBtn.addEventListener('hui-click', () => this.rejectAll());
    this._customBtn.addEventListener('hui-click', () => this.openPreferences());
    this._actions = createElement('div', { className: 'cc__actions', part: 'actions' },
      createElement('slot', { name: 'actions' }), this._customBtn, this._rejectBtn, this._acceptBtn);

    this._base = createElement('div', {
      className: 'cc', part: 'base', role: 'dialog', 'aria-modal': 'false',
      'aria-labelledby': this._titleId, 'aria-describedby': this._msgId, hidden: true,
    }, createElement('div', { className: 'cc__inner' }, this._icon, body, this._actions));

    // Hộp tùy chỉnh: danh sách nhóm + footer riêng (Từ chối / Lưu / Chấp nhận tất cả)
    this._list = createElement('div', { className: 'cc__list', role: 'list' });
    this._saveBtn = createElement('hui-button', { variant: 'secondary', part: 'save-button', slot: 'footer' });
    this._dlgAccept = createElement('hui-button', { variant: 'primary', slot: 'footer' });
    this._saveBtn.addEventListener('hui-click', () => this._savePreferences());
    this._dlgAccept.addEventListener('hui-click', () => this.acceptAll());
    this._dialog = createElement('hui-modal', { part: 'dialog', centered: true, size: 'md' },
      this._list, this._saveBtn, this._dlgAccept);

    return [this._base, this._dialog];
  }

  connectedCallback() {
    super.connectedCallback();
    // Tự hiện khi chưa có lựa chọn hợp lệ (chạy cả khi gắn lại vào trang)
    if (!this._visible && !this._hasValidConsent()) this._scheduleAutoShow();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._timer);
  }

  updated(changed) {
    if (changed.has('position')) {
      const pos = POSITIONS.includes(this.position) ? this.position : 'bottom';
      this._base.className = `cc cc--${pos}`;
    }
    if (changed.has('heading') || changed.has('locale')) this._titleText.data = this.heading || tx('cookieConsent.title');
    if (changed.has('message') || changed.has('locale')) this._msgText.data = this.message || tx('cookieConsent.message');
    if (changed.has('policyHref') || changed.has('locale')) {
      this._policy.hidden = !this.policyHref;
      if (this.policyHref) this._policy.href = this.policyHref;
      else this._policy.removeAttribute('href');
      this._policy.textContent = tx('cookieConsent.policy');
    }
    if (changed.has('locale')) {
      this._base.setAttribute('aria-label', tx('cookieConsent.label'));
      this._acceptBtn.textContent = tx('cookieConsent.acceptAll');
      this._rejectBtn.textContent = tx('cookieConsent.reject');
      this._customBtn.textContent = tx('cookieConsent.customize');
      this._saveBtn.textContent = tx('cookieConsent.save');
      this._dlgAccept.textContent = tx('cookieConsent.acceptAll');
      this._dialog.setAttribute('title', tx('cookieConsent.dialogTitle'));
    }
    if (changed.has('hideReject')) this._rejectBtn.hidden = this.hideReject;
    if (changed.has('hideCustomize')) this._customBtn.hidden = this.hideCustomize;
    if (changed.has('categories') || changed.has('locale')) this._renderCategories();
    if (changed.has('storageKey') || changed.has('consentVersion')) {
      // Đổi khóa / phiên bản sau khi đã hiển thị: đồng bộ lại trạng thái
      if (this._mounted && !this._visible && !this._hasValidConsent()) this._scheduleAutoShow();
    }
  }

  firstUpdated() {
    this._mounted = true;
  }

  // =====================================================
  // DỮ LIỆU
  // =====================================================

  get _categories() {
    const list = Array.isArray(this.categories) && this.categories.length ? this.categories : defaultCategories();
    return list.filter((c) => c && c.id !== undefined && c.id !== null);
  }

  _hasValidConsent() {
    const data = readStore(this.storageKey || DEFAULT_KEY) || this._memory;
    if (!data) return false;
    return (data.version || '') === (this.consentVersion || '');
  }

  /** Lựa chọn hiện tại { id: boolean } (đã lưu) hoặc null nếu chưa chọn */
  get consent() {
    if (!this._hasValidConsent()) return null;
    return { ...(readStore(this.storageKey || DEFAULT_KEY) || this._memory).categories };
  }

  /** Banner đang hiện */
  get isOpen() {
    return this._visible;
  }

  /** Trạng thái các switch: lấy từ lựa chọn đã lưu, không có thì theo `checked` của nhóm */
  _renderCategories() {
    const saved = this.consent;
    this._switches.clear();
    this._list.replaceChildren(...this._categories.map((cat) => {
      const key = String(cat.id);
      const labelId = `${this._titleId}-cat-${key}`;
      const descId = `${labelId}-desc`;
      const on = cat.required ? true : saved ? Boolean(saved[key]) : Boolean(cat.checked);
      const sw = createElement('hui-switch', {
        part: 'switch', 'aria-label': String(cat.label ?? key), 'data-id': key,
        checked: on, disabled: Boolean(cat.required),
      });
      this._switches.set(key, sw);
      const head = createElement('div', { className: 'cc__cat-head' },
        createElement('span', { className: 'cc__cat-label', part: 'category-label', id: labelId }, String(cat.label ?? key)),
        cat.required ? createElement('span', { className: 'cc__cat-required' }, tx('cookieConsent.required')) : null,
        sw);
      const desc = cat.description
        ? createElement('p', { className: 'cc__cat-desc', part: 'category-description', id: descId }, String(cat.description))
        : null;
      return createElement('div', { className: 'cc__cat', part: 'category', role: 'listitem' }, head, desc);
    }));
  }

  // =====================================================
  // HIỆN / ẨN
  // =====================================================

  _scheduleAutoShow() {
    clearTimeout(this._timer);
    const delay = Math.max(0, this.delay || 0);
    if (!delay) {
      this._show(false);
      return;
    }
    this._timer = setTimeout(() => this._show(false), delay);
  }

  get _animated() {
    return !this.noAnimation && !animationsDisabled();
  }

  _show(focus) {
    clearTimeout(this._timer);
    if (!this.isConnected) return;
    const token = ++this._token;
    if (!this._visible) {
      this._visible = true;
      this._base.hidden = false;
      this._renderCategories();
      this.setState('open', true);
      if (this._animated) animateIn(this._base, this.position === 'bottom' ? 'move-down' : 'slide-up', { duration: 300 });
    }
    if (focus) {
      requestAnimationFrame(() => {
        if (token !== this._token) return;
        const first = getTabbables(this._base)[0];
        first?.focus({ preventScroll: true });
      });
    }
  }

  async _hide() {
    if (!this._visible) return;
    this._visible = false;
    const token = ++this._token;
    this.setState('open', false);
    if (this._animated) {
      await animateOut(this._base, this.position === 'bottom' ? 'move-down' : 'slide-up', { duration: 250 });
    }
    if (token !== this._token) return;
    this._base.hidden = true;
  }

  /** Hiện banner (kể cả khi đã có lựa chọn) và đưa focus vào nút đầu tiên — vd: link "Cài đặt cookie" ở footer */
  open() {
    const active = getDeepActiveElement();
    if (active && !this._containsNode(active)) this._returnFocus = active;
    this._show(true);
  }

  /** Xóa lựa chọn đã lưu và hiện lại banner */
  reset() {
    writeStore(this.storageKey || DEFAULT_KEY, null);
    this._memory = null;
    this._renderCategories();
    this.open();
  }

  /** Mở hộp tùy chỉnh theo nhóm */
  openPreferences() {
    const active = getDeepActiveElement();
    if (!this._visible && active && !this._containsNode(active)) this._returnFocus = active;
    this._renderCategories();
    this._dialog.open();
  }

  /** Chấp nhận mọi nhóm */
  acceptAll() {
    this._decide('accept-all', Object.fromEntries(this._categories.map((c) => [String(c.id), true])));
  }

  /** Chỉ giữ nhóm bắt buộc */
  rejectAll() {
    this._decide('reject-all', Object.fromEntries(this._categories.map((c) => [String(c.id), Boolean(c.required)])));
  }

  _savePreferences() {
    const categories = Object.fromEntries(this._categories.map((c) => {
      const key = String(c.id);
      return [key, Boolean(c.required) || Boolean(this._switches.get(key)?.checked)];
    }));
    this._decide('custom', categories);
  }

  _decide(action, categories) {
    const data = { version: this.consentVersion || '', categories, action, timestamp: Date.now() };
    writeStore(this.storageKey || DEFAULT_KEY, data);
    this._memory = data; // storage bị chặn → vẫn nhớ trong phiên
    const focusInside = this._containsNode(getDeepActiveElement());
    const returnTo = this._returnFocus;
    this._returnFocus = null;
    const dialogOpen = this._dialog.isOpen;
    if (dialogOpen) this._dialog.close();
    this._hide();
    this._renderCategories();
    this.emit('hui-consent', {
      categories: { ...categories },
      accepted: Object.keys(categories).filter((k) => categories[k]),
      action,
    });
    // Trả focus về chỗ cũ (nếu focus đang ở trong banner/hộp thoại, tránh rơi về <body>)
    if (returnTo?.isConnected && (focusInside || dialogOpen)) {
      const restore = () => returnTo.focus?.({ preventScroll: true });
      if (dialogOpen) this._dialog.addEventListener('hui-after-close', () => requestAnimationFrame(restore), { once: true });
      else restore();
    }
  }

  _containsNode(node) {
    for (let n = node; n; n = n.assignedSlot || n.parentNode || n.host) {
      if (n === this) return true;
    }
    return false;
  }
}

defineElement('hui-cookie-consent', HuiCookieConsent);

export default HuiCookieConsent;
