/**
 * HUI Free Ship Bar — "Mua thêm 120.000 ₫ để được miễn phí vận chuyển" + thanh tiến độ.
 * Đạt ngưỡng: thanh chuyển màu success, dấu ✓ vẽ nét + nảy nhẹ, câu chúc mừng (không confetti).
 */

import styles from './hui-free-ship-bar.css?raw';

import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { formatCurrency } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-add-to-cart/shop-icons.js';
import '../hui-icon/index.js';

const FALLBACK = {
  'freeShip.remaining': { vi: 'Mua thêm {amount} để được miễn phí vận chuyển', en: 'Spend {amount} more to get free shipping' },
  'freeShip.reached': { vi: 'Tuyệt! Đơn hàng của bạn được miễn phí vận chuyển', en: 'Great! Your order ships for free' },
  'freeShip.label': { vi: 'Tiến độ miễn phí vận chuyển', en: 'Free shipping progress' },
};
const msg = (key) => {
  const v = t(key);
  return v !== key ? v : FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Thanh tiến độ miễn phí vận chuyển.
 * @fires hui-reached - Tổng tiền vừa vượt ngưỡng (không phát ở lần render đầu). detail: { total, threshold }
 * @slot icon - Thay icon xe tải
 * @csspart base - Khung ngoài
 * @csspart message - Dòng chữ (aria-live)
 * @csspart icon - Vùng icon (xe tải / dấu ✓)
 * @csspart amount - Số tiền còn thiếu (in đậm)
 * @csspart track - Rãnh thanh tiến độ (role="progressbar")
 * @csspart fill - Phần đã đạt
 * @cssprop --hui-free-ship-bar-height - Độ dày thanh (mặc định 6px)
 * @cssprop --hui-free-ship-bar-radius - Bo góc thanh
 * @cssprop --hui-free-ship-bar-track-bg - Nền rãnh
 * @cssprop --hui-free-ship-bar-color - Màu phần đã đạt (chưa đủ ngưỡng)
 * @cssprop --hui-free-ship-bar-success-color - Màu khi đạt ngưỡng
 * @cssprop --hui-free-ship-bar-text-color - Màu chữ
 * @cssprop --hui-free-ship-bar-amount-color - Màu số tiền còn thiếu
 * @cssprop --hui-free-ship-bar-font-size - Cỡ chữ
 * @cssprop --hui-free-ship-bar-gap - Khoảng cách chữ ↔ thanh
 */
class HuiFreeShipBar extends HuiElement {
  static properties = {
    /** Ngưỡng miễn phí vận chuyển (vd 500000) */
    threshold: { type: Number, default: 0 },
    /** Tổng tiền hiện tại trong giỏ */
    total: { type: Number, default: 0 },
    /** Mã tiền tệ ISO 4217 */
    currency: { type: String, default: 'VND' },
    /** Câu khi chưa đạt — {amount} được thay bằng số tiền còn thiếu (mặc định theo locale) */
    text: { type: String },
    /** Câu khi đã đạt ngưỡng (mặc định theo locale) */
    successText: { type: String },
    /** sm | md — cỡ chữ / độ dày thanh */
    size: { type: String, default: 'md' },
    /** Tắt hiệu ứng (thanh chạy, vạch sáng, dấu ✓) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._wasReached = null;
  }

  get remaining() {
    return Math.max(0, (Number(this.threshold) || 0) - (Number(this.total) || 0));
  }

  get reached() {
    return (Number(this.threshold) || 0) > 0 && this.remaining === 0;
  }

  get percent() {
    const th = Number(this.threshold) || 0;
    if (th <= 0) return 100;
    return Math.min(100, Math.max(0, ((Number(this.total) || 0) / th) * 100));
  }

  render() {
    this._truck = createElement('hui-icon', { name: 'truck', className: 'fsb__truck' });
    const check = document.createElementNS(SVG_NS, 'svg');
    check.setAttribute('viewBox', '0 0 24 24');
    check.setAttribute('aria-hidden', 'true');
    check.classList.add('fsb__check');
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    circle.setAttribute('pathLength', '1');
    const tick = document.createElementNS(SVG_NS, 'path');
    tick.setAttribute('d', 'M7.5 12.5l3 3 6-6.5');
    tick.setAttribute('pathLength', '1');
    check.append(circle, tick);
    this._check = check;
    this._iconSlot = createElement('slot', { name: 'icon' }, this._truck);
    this._icon = createElement('span', { className: 'fsb__icon', part: 'icon', 'aria-hidden': 'true' }, this._iconSlot, check);

    this._text = createElement('span', { className: 'fsb__text' });
    this._message = createElement('div', { className: 'fsb__message', part: 'message', 'aria-live': 'polite' }, this._icon, this._text);
    this._fill = createElement('div', { className: 'fsb__fill', part: 'fill' });
    this._track = createElement('div', { className: 'fsb__track', part: 'track', role: 'progressbar', 'aria-valuemin': '0' }, this._fill);
    this._base = createElement('div', { className: 'fsb', part: 'base' }, this._message, this._track);
    return this._base;
  }

  updated() {
    const reached = this.reached;
    this._renderText(reached);

    const th = Number(this.threshold) || 0;
    this._track.setAttribute('aria-valuemax', String(th));
    this._track.setAttribute('aria-valuenow', String(Math.min(Number(this.total) || 0, th)));
    this._track.setAttribute('aria-valuetext', `${Math.round(this.percent)}%`);
    this._track.setAttribute('aria-label', msg('freeShip.label'));
    this._fill.style.width = `${this.percent}%`;

    const off = this.noAnimation || animationsDisabled();
    this._base.className = [
      'fsb', `fsb--${this.size === 'sm' ? 'sm' : 'md'}`,
      reached ? 'fsb--reached' : '', off ? 'fsb--static' : '',
    ].filter(Boolean).join(' ');
    this.setState('reached', reached);

    if (this._wasReached === false && reached) {
      this._celebrate(off);
      this.emit('hui-reached', { total: Number(this.total) || 0, threshold: th });
    }
    this._wasReached = reached;
  }

  /** Dựng câu: chuỗi mẫu có {amount} → chèn <strong part="amount"> */
  _renderText(reached) {
    // Chữ không đổi thì không dựng lại → aria-live không đọc lặp
    const key = [reached, this.remaining, this.currency, this.text, this.successText, getLocaleName()].join('|');
    if (key === this._textKey) return;
    this._textKey = key;
    if (reached) {
      this._text.replaceChildren(this.successText || msg('freeShip.reached'));
      return;
    }
    const template = this.text || msg('freeShip.remaining');
    const amount = createElement('strong', { className: 'fsb__amount', part: 'amount' }, formatCurrency(this.remaining, this.currency || 'VND'));
    const [before, ...rest] = template.split('{amount}');
    this._text.replaceChildren(before, ...(rest.length ? [amount, rest.join('{amount}')] : []));
  }

  _celebrate(off) {
    if (off || !this._icon.animate) return;
    this._icon.animate(
      [{ transform: 'scale(0.4)' }, { transform: 'scale(1.25)', offset: 0.6 }, { transform: 'scale(1)' }],
      { duration: 480, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
  }
}

defineElement('hui-free-ship-bar', HuiFreeShipBar);

export default HuiFreeShipBar;
