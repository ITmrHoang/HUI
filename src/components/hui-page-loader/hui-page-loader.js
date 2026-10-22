/**
 * HUI Page Loader — Màn chờ toàn màn hình khi tải trang lần đầu (logo + spinner / thanh tiến độ).
 * Tự ẩn khi window `load` (hoặc gọi hide()), hiện tối thiểu `min-duration` để không nháy, mờ dần rồi rời layout.
 */

import styles from './hui-page-loader.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animateIn, animateOut } from '../../utils/motion.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-spinner/index.js';

const INDICATORS = ['spinner', 'dots', 'bar', 'none'];

const FALLBACK = {
  vi: { 'pageLoader.label': 'Đang tải trang…' },
  en: { 'pageLoader.label': 'Loading page…' },
};
function tx(key) {
  const v = t(key);
  return v !== key ? v : (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

// aria-busy trên <body> dùng chung cho mọi loader: chỉ gỡ khi loader cuối cùng ẩn
// và chỉ khi chính HUI đã đặt (không đụng tới giá trị trang tự đặt)
const busyOwners = new Set();
let busySetByUs = false;
function setBodyBusy(owner, on) {
  const body = document.body;
  if (!body) return;
  if (on) {
    if (!busyOwners.size && !body.hasAttribute('aria-busy')) {
      body.setAttribute('aria-busy', 'true');
      busySetByUs = true;
    }
    busyOwners.add(owner);
    return;
  }
  if (!busyOwners.delete(owner) || busyOwners.size) return;
  if (busySetByUs && body.getAttribute('aria-busy') === 'true') body.removeAttribute('aria-busy');
  busySetByUs = false;
}

/**
 * Màn chờ tải trang. Đặt ngay đầu <body> để hiện sớm nhất.
 * Đang hiện: <body aria-busy="true"> (chỉ khi trang chưa tự đặt). Ẩn xong: host có `hidden` (rời layout),
 * `remove-on-hide` → gỡ hẳn khỏi DOM.
 *
 * @fires hui-show - Hiện lại bằng show()
 * @fires hui-hide - Đã ẩn xong (sau hiệu ứng mờ dần)
 * @slot logo - Logo / thương hiệu phía trên chỉ báo
 * @slot - Nội dung phụ dưới chỉ báo (mẹo, khẩu hiệu…)
 * @csspart base - Lớp phủ toàn màn hình
 * @csspart content - Cột nội dung giữa màn hình
 * @csspart logo - Vùng logo
 * @csspart indicator - hui-spinner (spinner | dots)
 * @csspart bar - Thanh tiến độ (indicator="bar")
 * @csspart bar-fill - Phần đã chạy của thanh
 * @csspart text - Dòng chữ
 * @cssprop --hui-page-loader-bg - Nền lớp phủ
 * @cssprop --hui-page-loader-color - Màu chữ
 * @cssprop --hui-page-loader-accent - Màu chỉ báo (spinner / thanh)
 * @cssprop --hui-page-loader-gap - Khoảng cách logo ↔ chỉ báo ↔ chữ
 * @cssprop --hui-page-loader-bar-width - Độ rộng thanh tiến độ
 * @cssprop --hui-page-loader-bar-height - Độ dày thanh tiến độ
 * @cssprop --hui-page-loader-z-index - z-index
 * @cssprop --hui-page-loader-duration - Thời lượng mờ dần khi ẩn
 */
class HuiPageLoader extends HuiElement {
  static properties = {
    /** Thời gian hiện tối thiểu (ms) kể từ khi thẻ được gắn — tránh nháy khi trang tải quá nhanh */
    minDuration: { type: Number, default: 400 },
    /** Không tự ẩn khi window load — tự gọi hide() (vd: chờ dữ liệu API) */
    manual: { type: Boolean },
    /** spinner | dots | bar | none — kiểu chỉ báo */
    indicator: { type: String, default: 'spinner' },
    /** 0–100 → tiến độ xác định (spinner vòng / thanh); bỏ trống = chạy vô hạn */
    progress: { type: Number },
    /** Dòng chữ hiển thị (cũng là nhãn trợ năng); bỏ trống = chỉ đọc nhãn mặc định theo locale */
    text: { type: String },
    /** Ẩn xong thì gỡ hẳn thẻ khỏi DOM */
    removeOnHide: { type: Boolean },
    /** Tắt hiệu ứng mờ dần */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._visible = true;
    this._start = 0;
    this._token = 0;
    this._hiding = null;
  }

  render() {
    const logoSlot = createElement('slot', { name: 'logo' });
    this._logo = createElement('div', { className: 'pl__logo', part: 'logo', hidden: true }, logoSlot);
    logoSlot.addEventListener('slotchange', () => { this._logo.hidden = !logoSlot.assignedNodes().length; });

    this._spinner = createElement('hui-spinner', { part: 'indicator', size: 'lg', color: 'inherit', className: 'pl__spinner', 'aria-hidden': 'true' });
    this._fill = createElement('div', { className: 'pl__fill', part: 'bar-fill' });
    this._bar = createElement('div', { className: 'pl__bar', part: 'bar' }, this._fill);
    this._text = createElement('div', { className: 'pl__text', part: 'text' });

    this._content = createElement('div', { className: 'pl__content', part: 'content' },
      this._logo, this._spinner, this._bar, this._text, createElement('slot'));
    this._base = createElement('div', {
      className: 'pl', part: 'base', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
    }, this._content);
    return this._base;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._visible) return;
    this._start = performance.now();
    setBodyBusy(this, true);
    if (!this.manual) this._autoHide();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    setBodyBusy(this, false);
  }

  updated(changed) {
    if (changed.has('indicator') || changed.has('progress')) {
      const kind = INDICATORS.includes(this.indicator) ? this.indicator : 'spinner';
      const determinate = typeof this.progress === 'number' && Number.isFinite(this.progress);
      const value = determinate ? Math.min(100, Math.max(0, this.progress)) : null;
      this._spinner.hidden = kind !== 'spinner' && kind !== 'dots';
      this._spinner.setAttribute('type', kind === 'dots' ? 'dots' : 'circular');
      if (value !== null && kind === 'spinner') this._spinner.setAttribute('value', String(value));
      else this._spinner.removeAttribute('value');
      this._bar.hidden = kind !== 'bar';
      this._bar.classList.toggle('pl__bar--indeterminate', value === null);
      this._fill.style.width = value === null ? '' : `${value}%`;
      if (value === null) this._base.removeAttribute('aria-valuenow');
      else this._base.setAttribute('aria-valuenow', String(Math.round(value)));
    }
    if (changed.has('text') || changed.has('locale')) {
      this._text.textContent = this.text || '';
      this._text.hidden = !this.text;
      this._base.setAttribute('aria-label', this.text || tx('pageLoader.label'));
    }
    // Đổi sang manual=false sau khi gắn → tự ẩn theo load
    if (changed.has('manual') && this._mounted && !this.manual && this._visible) this._autoHide();
  }

  firstUpdated() {
    this._mounted = true;
  }

  _autoHide() {
    if (document.readyState === 'complete') this.hide();
    else this.listen(window, 'load', () => { if (!this.manual) this.hide(); }, { once: true });
  }

  get _animated() {
    return !this.noAnimation && !animationsDisabled();
  }

  /** Đang hiện (chưa ẩn xong) */
  get isVisible() {
    return this._visible;
  }

  /**
   * Ẩn: chờ đủ min-duration → mờ dần → host `hidden` (hoặc gỡ khỏi DOM nếu remove-on-hide).
   * @returns {Promise<void>} resolve khi đã ẩn xong
   */
  hide() {
    if (!this._visible) return Promise.resolve();
    if (this._hiding) return this._hiding;
    const token = ++this._token;
    this._hiding = (async () => {
      const wait = Math.max(0, (this.minDuration ?? 0) - (performance.now() - this._start));
      if (wait) await new Promise((r) => setTimeout(r, wait));
      if (token !== this._token) return;
      if (this._animated) {
        const raw = getComputedStyle(this).getPropertyValue('--hui-page-loader-duration').trim();
        const ms = parseFloat(raw);
        await animateOut(this._base, 'fade', { duration: Number.isFinite(ms) ? (raw.endsWith('ms') ? ms : ms * 1000) : 400 });
      }
      if (token !== this._token) return;
      this._visible = false;
      this.hidden = true;
      this.setState('hidden', true);
      setBodyBusy(this, false);
      this.emit('hui-hide');
      if (this.removeOnHide) this.remove();
    })().finally(() => {
      if (token === this._token) this._hiding = null;
    });
    return this._hiding;
  }

  /** Hiện lại (vd: chuyển trang trong SPA); tự ẩn lại khi gọi hide() */
  show() {
    this._token++;
    this._hiding = null;
    const wasVisible = this._visible;
    this._visible = true;
    this._start = performance.now();
    this.hidden = false;
    this.setState('hidden', false);
    if (this.isConnected) setBodyBusy(this, true);
    if (!wasVisible) {
      if (this._animated) animateIn(this._base, 'fade');
      this.emit('hui-show');
    }
  }
}

defineElement('hui-page-loader', HuiPageLoader);

export default HuiPageLoader;
