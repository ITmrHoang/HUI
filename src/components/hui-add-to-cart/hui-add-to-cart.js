/**
 * HUI Add To Cart — nút "Thêm vào giỏ" có trạng thái idle → loading → added (✓) → idle.
 * fly-to: ảnh sản phẩm (source, hoặc ảnh gần nhất) bay theo đường cong vào icon giỏ, giỏ "nảy",
 * badge (hui-badge) tự tăng số. onAdd (hàm async) được await trước khi báo đã thêm.
 */

import styles from './hui-add-to-cart.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import { supportsPopover } from '../../utils/floating.js';
import './shop-icons.js';
import '../hui-icon/index.js';

const FALLBACK = {
  'product.addToCart': { vi: 'Thêm vào giỏ', en: 'Add to cart' },
  'addToCart.added': { vi: 'Đã thêm', en: 'Added' },
  'addToCart.adding': { vi: 'Đang thêm vào giỏ...', en: 'Adding to cart...' },
  'addToCart.announce': { vi: 'Đã thêm {qty} sản phẩm vào giỏ hàng', en: 'Added {qty} item(s) to cart' },
  'addToCart.failed': { vi: 'Không thêm được vào giỏ, vui lòng thử lại', en: 'Could not add to cart, please try again' },
};
const msg = (key, vars) => {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
};

const STATES = ['idle', 'loading', 'added'];
const VARIANTS = ['primary', 'outline', 'soft'];
const SVG_NS = 'http://www.w3.org/2000/svg';
const FLY_DURATION = 750;

/** Tìm phần tử theo selector: trong cùng shadow root trước, rồi tới document */
function resolve(host, selector) {
  if (!selector) return null;
  try {
    const root = host.getRootNode();
    return (root !== document && root.querySelector?.(selector)) || document.querySelector(selector);
  } catch {
    return null;
  }
}

/** Phần tử cha, đi xuyên ranh giới shadow (slot → host) */
const parentOf = (n) => n.parentElement || (n.getRootNode?.() instanceof ShadowRoot ? n.getRootNode().host : null);

/**
 * Nút thêm vào giỏ.
 * @fires hui-add - Người dùng bấm thêm. Cancelable: preventDefault() để hủy. detail: { qty }
 * @fires hui-added - Đã thêm thành công (sau onAdd). detail: { qty, result }
 * @fires hui-add-error - onAdd ném lỗi. detail: { qty, error }
 * @slot - Chữ của nút (thay attribute label)
 * @csspart button - Thẻ <button>
 * @csspart face - Từng mặt nội dung (kèm face-idle | face-loading | face-added)
 * @csspart icon - Icon giỏ
 * @csspart label - Chữ "Thêm vào giỏ"
 * @csspart spinner - Vòng xoay khi đang thêm
 * @csspart check - Dấu ✓ khi đã thêm
 * @cssprop --hui-add-to-cart-height - Chiều cao (mặc định theo size)
 * @cssprop --hui-add-to-cart-radius - Bo góc
 * @cssprop --hui-add-to-cart-bg - Nền (variant primary)
 * @cssprop --hui-add-to-cart-color - Màu chữ
 * @cssprop --hui-add-to-cart-hover-bg - Nền khi hover
 * @cssprop --hui-add-to-cart-added-bg - Nền trạng thái đã thêm (mặc định success)
 * @cssprop --hui-add-to-cart-added-color - Chữ trạng thái đã thêm
 * @cssprop --hui-add-to-cart-padding-x - Đệm ngang
 * @cssprop --hui-add-to-cart-font-size - Cỡ chữ
 * @cssprop --hui-add-to-cart-fly-size - Cạnh ảnh bay khi tới đích (mặc định 24px)
 * @cssprop --hui-add-to-cart-fly-radius - Bo góc ảnh bay (ảnh bay gắn tạm vào <body>, class hui-add-to-cart-fly)
 */
class HuiAddToCart extends HuiElement {
  static properties = {
    /** Số lượng gửi kèm sự kiện / onAdd và cộng vào badge */
    qty: { type: Number, default: 1 },
    /** Chữ nút (mặc định "Thêm vào giỏ"); slot mặc định ưu tiên hơn */
    label: { type: String },
    /** Chữ khi đã thêm (mặc định "Đã thêm") */
    addedLabel: { type: String },
    /** idle | loading | added — trạng thái hiện tại (tự chuyển khi bấm; gán tay để demo) */
    state: { type: String, default: 'idle' },
    /** Selector icon giỏ hàng (đích bay tới), vd "#cart-icon" — là / chứa hui-badge thì badge tự tăng */
    flyTo: { type: String },
    /** Selector ảnh nguồn bay vào giỏ (bỏ trống = ảnh gần nhất: hui-product-card cha hoặc <img> trong khối cha) */
    source: { type: String },
    /** Thời gian giữ trạng thái "Đã thêm" (ms) trước khi về idle */
    resetDelay: { type: Number, default: 1800 },
    /** primary | outline | soft — kiểu nút */
    variant: { type: String, default: 'primary' },
    /** sm | md | lg */
    size: { type: String, default: 'md' },
    /** Tên icon hui-icon (mặc định "cart"); icon="" để ẩn */
    icon: { type: String, default: 'cart' },
    /** Chiếm hết chiều ngang */
    block: { type: Boolean },
    /** Vô hiệu hóa (vd hết hàng) */
    disabled: { type: Boolean },
    /** Tắt hiệu ứng (không bay, không nảy) */
    noAnimation: { type: Boolean },
    /** Hàm async ({ qty, element }) => any — được await trước khi chuyển sang "Đã thêm"; ném lỗi = thất bại; trả false = hủy */
    onAdd: { type: Object, attribute: false },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._resetTimer = null;
  }

  get _motion() {
    return !this.noAnimation && !animationsDisabled();
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._icon = createElement('hui-icon', { className: 'atc__icon', part: 'icon' });
    this._labelText = document.createTextNode('');
    this._slot = createElement('slot', {}, this._labelText);
    const idle = createElement('span', { className: 'atc__face atc__face--idle', part: 'face face-idle' },
      this._icon, createElement('span', { className: 'atc__label', part: 'label' }, this._slot));

    const loading = createElement('span', { className: 'atc__face atc__face--loading', part: 'face face-loading' },
      createElement('span', { className: 'atc__spinner', part: 'spinner' }),
      this._loadingText = createElement('span', { className: 'atc__sr' }));

    const check = document.createElementNS(SVG_NS, 'svg');
    check.setAttribute('viewBox', '0 0 24 24');
    check.setAttribute('part', 'check');
    check.setAttribute('aria-hidden', 'true');
    check.classList.add('atc__check');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M5 12.5l4.5 4.5L19 7.5');
    path.setAttribute('pathLength', '1');
    check.append(path);
    this._addedText = createElement('span', { className: 'atc__label' });
    const added = createElement('span', { className: 'atc__face atc__face--added', part: 'face face-added' }, check, this._addedText);

    this._btn = createElement('button', { type: 'button', className: 'atc', part: 'button' }, idle, loading, added);
    this._btn.addEventListener('click', () => this.add());
    this._live = createElement('span', { className: 'atc__sr', role: 'status', 'aria-live': 'polite' });
    return [this._btn, this._live];
  }

  updated(changed) {
    if (changed.has('label') || changed.has('locale')) this._labelText.data = this.label || msg('product.addToCart');
    if (changed.has('addedLabel') || changed.has('locale')) this._addedText.textContent = this.addedLabel || msg('addToCart.added');
    if (changed.has('locale')) this._loadingText.textContent = msg('addToCart.adding');
    if (changed.has('icon')) {
      this._icon.hidden = !this.icon;
      if (this.icon) this._icon.setAttribute('name', this.icon);
    }
    const state = STATES.includes(this.state) ? this.state : 'idle';
    this._btn.disabled = this.disabled;
    // loading: giữ focus (aria-disabled) thay vì disabled native
    this._btn.toggleAttribute('aria-busy', state === 'loading');
    if (state === 'loading') this._btn.setAttribute('aria-disabled', 'true');
    else this._btn.removeAttribute('aria-disabled');
    this._btn.className = [
      'atc', `atc--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
      `atc--${VARIANTS.includes(this.variant) ? this.variant : 'primary'}`,
      `atc--${state}`, this._motion ? '' : 'atc--static',
    ].filter(Boolean).join(' ');
    for (const s of STATES) this.setState(s, s === state);
    if (changed.has('state') && changed.get('state') !== undefined && state === 'added' && this._motion) {
      this._btn.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(0.96)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
        { duration: 360, easing: 'ease-out' });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._resetTimer);
  }

  // =====================================================
  // THÊM VÀO GIỎ
  // =====================================================

  /** Chạy quy trình thêm vào giỏ (giống bấm nút). Trả về true nếu thêm thành công */
  async add() {
    if (this.disabled || this.state === 'loading') return false;
    const qty = Math.max(1, Number(this.qty) || 1);
    if (!this.emit('hui-add', { qty }, { cancelable: true })) return false;

    clearTimeout(this._resetTimer);
    let result;
    if (typeof this.onAdd === 'function') {
      this.state = 'loading';
      this._live.textContent = msg('addToCart.adding');
      try {
        result = await this.onAdd({ qty, element: this });
      } catch (error) {
        this.state = 'idle';
        this._live.textContent = msg('addToCart.failed');
        this._shake();
        this.emit('hui-add-error', { qty, error });
        return false;
      }
      if (result === false) {
        this.state = 'idle';
        this._live.textContent = '';
        return false;
      }
    }

    this.state = 'added';
    this._live.textContent = msg('addToCart.announce', { qty });
    this.emit('hui-added', { qty, result });
    this.flyToCart(qty);
    this._resetTimer = setTimeout(() => {
      if (this.state === 'added') this.state = 'idle';
    }, Math.max(0, Number(this.resetDelay) || 0));
    return true;
  }

  _shake() {
    if (!this._motion) return;
    this._btn.animate?.(
      [0, -6, 6, -4, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 420, easing: 'ease-in-out' },
    );
  }

  /** Ảnh nguồn: attribute source → ảnh của hui-product-card cha → <img> đầu tiên trong khối cha gần nhất */
  _findSource() {
    if (this.source) return resolve(this, this.source);
    for (let n = parentOf(this); n && n !== document.body; n = parentOf(n)) {
      if (n.localName === 'hui-product-card') {
        const img = n.shadowRoot?.querySelector('[part~="image"]');
        if (img) return img;
      }
      const img = n.querySelector?.('img');
      if (img) return img;
    }
    return null;
  }

  /**
   * Cho ảnh bay vào giỏ (fly-to) rồi nảy giỏ + tăng badge. Không có ảnh / tắt hiệu ứng → chỉ nảy + tăng badge.
   * @returns {Promise<void>} xong khi ảnh tới đích
   */
  async flyToCart(qty = this.qty) {
    const target = resolve(this, this.flyTo);
    if (!target) return;
    const src = this._findSource();
    const from = src?.getBoundingClientRect();
    if (this._motion && from && from.width && from.height) {
      await this._flyClone(src, from, target.getBoundingClientRect());
    }
    this._hitTarget(target, qty);
  }

  _flyClone(src, from, to) {
    const isImg = src.localName === 'img';
    const clone = isImg
      ? createElement('img', { src: src.currentSrc || src.src, alt: '' })
      : src.cloneNode(true);
    clone.className = 'hui-add-to-cart-fly';
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, {
      position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, right: 'auto', bottom: 'auto',
      width: `${from.width}px`, height: `${from.height}px`, margin: '0', padding: '0', border: '0',
      inset: `${from.top}px auto auto ${from.left}px`, overflow: 'hidden', background: 'transparent',
      objectFit: 'cover', pointerEvents: 'none', zIndex: 'var(--hui-z-toast, 2000)',
      borderRadius: 'var(--hui-add-to-cart-fly-radius, var(--hui-radius-md, 8px))',
      boxShadow: 'var(--hui-shadow-lg)', transformOrigin: 'center center', willChange: 'transform, opacity',
    });
    document.body.append(clone);
    // Lên top-layer (nằm trên cả Modal / Drawer đang mở)
    if (supportsPopover) {
      clone.setAttribute('popover', 'manual');
      try { clone.showPopover(); } catch { /* bỏ qua */ }
    }

    const endSize = parseFloat(getComputedStyle(this).getPropertyValue('--hui-add-to-cart-fly-size')) || 24;
    const endScale = Math.min(1, endSize / Math.max(from.width, from.height));
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    // Đường cong parabol: nhô lên trên đoạn thẳng nối 2 điểm
    const lift = Math.min(220, 80 + Math.abs(dx) * 0.25);
    const steps = 16;
    const frames = Array.from({ length: steps + 1 }, (_, i) => {
      const p = i / steps;
      const x = dx * p;
      const y = dy * p - lift * 4 * p * (1 - p);
      const s = 1 + (endScale - 1) * p ** 0.8;
      return { transform: `translate(${x}px, ${y}px) scale(${s})`, opacity: p > 0.85 ? 0.6 : 1, offset: p };
    });
    const anim = clone.animate(frames, { duration: FLY_DURATION, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });
    return anim.finished.catch(() => {}).finally(() => clone.remove());
  }

  /** Giỏ nảy + badge tăng (đích là hui-badge, nằm trong hoặc chứa hui-badge) */
  _hitTarget(target, qty) {
    const badge = target.localName === 'hui-badge'
      ? target
      : target.closest?.('hui-badge') || target.querySelector?.('hui-badge');
    if (badge) {
      const current = Number.parseInt(badge.count, 10) || 0;
      badge.count = String(current + Math.max(1, Number(qty) || 1));
    }
    if (this._motion && target.animate) {
      target.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }],
        { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      );
    }
  }

  focus(options) {
    if (this._btn) this._btn.focus(options);
    else super.focus(options);
  }

  blur() {
    this._btn?.blur();
  }
}

defineElement('hui-add-to-cart', HuiAddToCart);

export default HuiAddToCart;
