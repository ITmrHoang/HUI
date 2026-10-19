/**
 * HUI Flip Card — thẻ lật mặt trước / mặt sau (A6.5).
 *   <hui-flip-card trigger="hover">
 *     <div slot="front">Mặt trước</div>
 *     <div slot="back">Mặt sau</div>
 *   </hui-flip-card>
 * Lật bằng hover, click (Enter/Space với bàn phím) hoặc điều khiển bằng JS (flipped / flip()).
 * Giảm chuyển động / no-animation → đổi mặt tức thì (mờ dần thay vì xoay 3D).
 */

import styles from './hui-flip-card.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { t } from '../../core/locale.js';

/**
 * @fires change - Đổi mặt. detail: { flipped }
 * @slot front - Mặt trước
 * @slot back - Mặt sau
 * @csspart base - Khung (nhận focus khi trigger="click")
 * @csspart inner - Lớp xoay 3D
 * @csspart front - Mặt trước
 * @csspart back - Mặt sau
 * @cssprop --hui-flip-card-height - Chiều cao (mặc định 260px; bỏ qua khi auto-height)
 * @cssprop --hui-flip-card-radius - Bo góc
 * @cssprop --hui-flip-card-duration - Thời gian lật (mặc định 600ms)
 * @cssprop --hui-flip-card-perspective - Độ sâu phối cảnh (mặc định 1000px)
 * @cssprop --hui-flip-card-front-bg - Nền mặt trước
 * @cssprop --hui-flip-card-back-bg - Nền mặt sau
 * @cssprop --hui-flip-card-shadow - Bóng đổ
 * @cssprop --hui-flip-card-padding - Khoảng đệm mỗi mặt
 */
class HuiFlipCard extends HuiElement {
  static localized = true;

  static properties = {
    /** hover | click | manual — cách lật */
    trigger: { type: String, default: 'hover' },
    /** horizontal | vertical — trục lật */
    direction: { type: String, default: 'horizontal' },
    /** Đang hiện mặt sau */
    flipped: { type: Boolean },
    /** Chiều cao theo mặt cao hơn thay vì cố định */
    autoHeight: { type: Boolean },
    /** Tắt hiệu ứng xoay 3D (đổi mặt bằng mờ dần) */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  render() {
    this._front = createElement('div', { className: 'flip__face flip__front', part: 'front' }, createElement('slot', { name: 'front' }));
    this._back = createElement('div', { className: 'flip__face flip__back', part: 'back' }, createElement('slot', { name: 'back' }));
    this._inner = createElement('div', { className: 'flip__inner', part: 'inner' }, this._front, this._back);
    this._base = createElement('div', { className: 'flip', part: 'base' }, this._inner);

    this._base.addEventListener('click', (e) => {
      if (this.trigger !== 'click') return;
      // Click vào nút/link bên trong mặt thẻ → để phần tử đó tự xử lý, không lật
      if (e.composedPath().some((n) => n instanceof Element && n !== this && n.matches?.('a, button, input, select, textarea, hui-button'))) return;
      this.flip();
    });
    this._base.addEventListener('keydown', (e) => {
      if (this.trigger !== 'click' || e.target !== this._base) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.flip();
      }
    });
    // Hover: mặt sau có nút bấm thì người dùng bàn phím vẫn với tới được nhờ :focus-within (xem CSS)
    this._base.addEventListener('pointerenter', (e) => {
      if (this.trigger === 'hover' && e.pointerType === 'mouse') this._setFlipped(true);
    });
    this._base.addEventListener('pointerleave', (e) => {
      if (this.trigger === 'hover' && e.pointerType === 'mouse') this._setFlipped(false);
    });
    // Cảm ứng không có hover → chạm để lật
    this._base.addEventListener('pointerup', (e) => {
      if (this.trigger === 'hover' && e.pointerType !== 'mouse') this.flip();
    });
    this._base.addEventListener('focusin', () => {
      if (this.trigger === 'hover') this._setFlipped(true);
    });
    this._base.addEventListener('focusout', (e) => {
      if (this.trigger === 'hover' && !this.contains(e.relatedTarget)) this._setFlipped(false);
    });
    return this._base;
  }

  updated(changed) {
    if (changed.has('flipped')) {
      this._base.classList.toggle('flip--flipped', this.flipped);
      // Mặt đang ẩn không nhận focus / không được đọc bởi trình đọc màn hình
      this._front.inert = this.flipped;
      this._back.inert = !this.flipped;
      this._front.setAttribute('aria-hidden', String(this.flipped));
      this._back.setAttribute('aria-hidden', String(!this.flipped));
      if (this.trigger === 'click') this._base.setAttribute('aria-pressed', String(this.flipped));
    }
    if (changed.has('trigger') || changed.has('locale')) {
      const clickable = this.trigger === 'click';
      if (clickable) {
        this._base.setAttribute('role', 'button');
        this._base.setAttribute('tabindex', '0');
        this._base.setAttribute('aria-pressed', String(this.flipped));
        this._base.setAttribute('aria-label', t('flipCard.flip'));
      } else {
        ['role', 'aria-pressed', 'aria-label'].forEach((a) => this._base.removeAttribute(a));
        // hover: khung focus được để người dùng bàn phím cũng lật được (focusin)
        if (this.trigger === 'hover') this._base.setAttribute('tabindex', '0');
        else this._base.removeAttribute('tabindex');
      }
    }
    if (changed.has('direction')) this._base.classList.toggle('flip--vertical', this.direction === 'vertical');
    if (changed.has('autoHeight')) this._base.classList.toggle('flip--auto', this.autoHeight);
    if (changed.has('noAnimation')) this._base.classList.toggle('flip--static', this.noAnimation);
  }

  _setFlipped(value) {
    if (this.flipped === value) return;
    this.flipped = value;
    this.emit('change', { flipped: value });
  }

  /** Lật sang mặt còn lại */
  flip() {
    this._setFlipped(!this.flipped);
  }
}

defineElement('hui-flip-card', HuiFlipCard);

export default HuiFlipCard;
