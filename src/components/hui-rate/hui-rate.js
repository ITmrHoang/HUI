/**
 * HUI Rate — Chấm sao nhập liệu (Ant Rate + MUI Rating), tham gia <form> qua HuiFormElement.
 * Một phần tử focus duy nhất theo WAI-ARIA APG Slider (role="slider"), hover xem trước, nửa sao,
 * bấm lại để xóa, tooltip theo từng sao, hiệu ứng phóng to / nảy / sáng lần lượt.
 * Parts / biến CSS: xem JSDoc class.
 */

import starStyles from './rate-star.css?raw';
import styles from './hui-rate.css?raw';

import { defineElement } from '../../core/hui-element.js';
import { HuiFormElement } from '../../core/hui-form-element.js';
import { formatNumber } from '../../core/format.js';
import { createElement } from '../../utils/dom.js';
import { msg, resolveColor, motionOff, createStar, paintStars, normalizeCount } from './rate-shared.js';

const EASE_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
/** Nảy có vượt (overshoot) */
const EASE_BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
/** Khoảng cách giữa các sao khi sáng lần lượt (ms) */
const STAGGER = 40;

/**
 * Chấm sao nhập liệu.
 * @fires hover-change - Rê chuột đổi số sao xem trước; rời khỏi vùng sao → value null. detail: { value }
 * @fires input - Người dùng chọn (click / bàn phím). detail: { value }
 * @fires change - Phát cùng lúc với input. detail: { value }
 * @slot character - Ký hiệu tùy chỉnh (được nhân bản cho mọi sao), vd <span slot="character">❤</span>
 * @csspart base - Khung ngoài (thanh sao + tooltip)
 * @csspart stars - Thanh sao — phần tử role="slider" nhận focus
 * @csspart star - Từng sao; kèm star-full | star-half | star-zero theo mức tô
 * @csspart tooltip - Bong bóng chữ (tooltips) khi hover / focus bàn phím
 * @cssprop --hui-rate-size - Cạnh mỗi sao (mặc định theo size)
 * @cssprop --hui-rate-gap - Khoảng cách giữa các sao
 * @cssprop --hui-rate-color - Màu sao đã chọn (attribute color ưu tiên hơn)
 * @cssprop --hui-rate-inactive-color - Màu sao chưa chọn
 * @cssprop --hui-rate-hover-scale - Tỉ lệ phóng to khi hover (mặc định 1.15)
 * @cssprop --hui-rate-focus-outline - Viền focus bàn phím
 * @cssprop --hui-rate-tooltip-bg - Nền bong bóng
 * @cssprop --hui-rate-tooltip-color - Màu chữ bong bóng
 */
class HuiRate extends HuiFormElement {
  static properties = {
    /** Số sao */
    count: { type: Number, default: 5 },
    /** Số sao đã chọn (0 = chưa chọn); attribute value = giá trị ban đầu khi reset form */
    value: { type: Number, default: 0, reflect: false },
    /** Cho phép chọn nửa sao (bước 0.5) */
    allowHalf: { type: Boolean },
    /** 'true' | 'false' — bấm lại đúng giá trị hiện tại để xóa về 0 (mặc định bật) */
    allowClear: { type: String, default: 'true' },
    /** primary | success | warning | danger | info hoặc màu CSS bất kỳ — mặc định màu warning (vàng) */
    color: { type: String },
    /** Tên icon trong registry hui-icon (vd 'heart'), vẽ dạng tô đặc. Mặc định: ngôi sao */
    icon: { type: String },
    /** Ký tự thay cho sao (vd 'A', '❤'); slot character ưu tiên hơn */
    character: { type: String },
    /** Chữ cho từng sao, vd ["Tệ","Tạm","Ổn","Tốt","Tuyệt vời"] (attribute dạng JSON) */
    tooltips: { type: Array },
    /** Tên cho trình đọc màn hình (mặc định "Đánh giá") */
    label: { type: String },
    /** Tắt hiệu ứng (phóng to khi hover, nảy, sáng lần lượt) */
    noAnimation: { type: Boolean },
  };

  static styles = [starStyles, styles];

  constructor() {
    super();
    this._starEls = [];
    this._hover = null;
    /** Vừa bấm để xóa → không xem trước lại đúng vị trí đó cho tới khi chuột di chuyển sang sao khác */
    this._suppressHover = null;
    this._userCommit = false;
    this._painted = false;
    this._focusVisible = false;
    this._tipShown = false;
  }

  // =====================================================
  // GIÁ TRỊ
  // =====================================================

  /** Luôn là số trong [0, count], bám bước 1 (hoặc 0.5 khi allow-half) */
  get value() {
    return this._normalize(this._getProp('value'));
  }
  set value(v) {
    this._setProp('value', v === null || v === undefined || v === '' ? 0 : Number(v));
  }

  get _count() {
    return normalizeCount(this.count);
  }

  get _step() {
    return this.allowHalf ? 0.5 : 1;
  }

  _normalize(raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    const snapped = Math.round(n / this._step) * this._step;
    return Math.min(snapped, this._count);
  }

  get _locked() {
    return this.isDisabled || this.readonly;
  }

  get _clearable() {
    return String(this.allowClear) !== 'false';
  }

  /** Giá trị đang hiển thị: xem trước khi hover, nếu không thì value */
  get _display() {
    return this._hover ?? this.value;
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  render() {
    this._stars = createElement('div', { className: 'hui-rate__stars', part: 'stars', role: 'slider' });
    this._stars.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this._stars.addEventListener('pointerleave', () => this._setHover(null));
    this._stars.addEventListener('click', (e) => this._onClick(e));
    this._stars.addEventListener('keydown', (e) => this._onKeydown(e));
    this._stars.addEventListener('focus', () => {
      this._focusVisible = this._stars.matches(':focus-visible');
      this._syncTip();
    });
    this._stars.addEventListener('blur', () => {
      this._focusVisible = false;
      this._syncTip();
      this.markInteracted();
    });

    this._tip = createElement('span', { className: 'hui-rate__tip', part: 'tooltip', 'aria-hidden': 'true' });

    // Slot ẩn: chỉ để đọc nội dung slot character rồi nhân bản vào từng sao
    this._charSlot = createElement('slot', { name: 'character' });
    this._charSlot.addEventListener('slotchange', () => {
      this._buildStars();
      this._syncFill();
    });
    const slotHolder = createElement('span', { className: 'hui-rate__slot', hidden: true }, this._charSlot);

    this._base = createElement('div', { className: 'hui-rate', part: 'base' }, this._stars, this._tip, slotHolder);
    return this._base;
  }

  updated(changed) {
    super.updated(changed);
    if (['count', 'icon', 'character'].some((k) => changed.has(k))) this._buildStars();
    // Số sao / bước đổi → giá trị chuẩn hóa đổi theo
    if (changed.has('count') || changed.has('allowHalf')) this._syncForm();
    if (changed.has('color')) {
      const c = resolveColor(this.color);
      if (c) this._base.style.setProperty('--_rate-custom-color', c);
      else this._base.style.removeProperty('--_rate-custom-color');
    }

    this._syncFill();
    this._syncAria();
    this._syncClasses();

    if (changed.has('value') && this._painted) {
      const old = this._normalize(changed.get('value'));
      if (this._userCommit) this._bounce();
      else if (old !== this.value) this._lightUp(old, this.value);
    }
    this._userCommit = false;
  }

  firstUpdated() {
    this._painted = true;
  }

  _buildStars() {
    const nodes = this._charSlot.assignedNodes({ flatten: true })
      .filter((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
    const opts = { nodes, character: this.character, icon: this.icon };
    this._starEls = Array.from({ length: this._count }, () => createStar(opts));
    this._stars.replaceChildren(...this._starEls);
  }

  _syncFill() {
    paintStars(this._starEls, this._display);
    this._syncTip();
  }

  /** Chữ tooltip của mức `v` (sao thứ ceil(v)) */
  _tipText(v) {
    const list = Array.isArray(this.tooltips) ? this.tooltips : null;
    if (!list || v <= 0) return '';
    const text = list[Math.ceil(v) - 1];
    return text == null ? '' : String(text);
  }

  _syncTip() {
    const v = this._display;
    const text = this._tipText(v);
    const show = Boolean(text) && (this._hover !== null || this._focusVisible);
    this._tip.textContent = text;
    this._tipShown = show;
    this._base.classList.toggle('hui-rate--tip', show);
    if (!show) return;
    const star = this._starEls[Math.ceil(v) - 1];
    if (star) this._tip.style.setProperty('--_rate-tip-x', `${star.offsetLeft + star.offsetWidth / 2}px`);
  }

  _valueText(v) {
    const text = msg('rate.valueText', { value: formatNumber(v), count: this._count });
    const tip = this._tipText(v);
    return tip ? `${tip}, ${text}` : text;
  }

  _syncAria() {
    const s = this._stars;
    const v = this.value;
    s.setAttribute('aria-valuemin', '0');
    s.setAttribute('aria-valuemax', String(this._count));
    s.setAttribute('aria-valuenow', String(v));
    s.setAttribute('aria-valuetext', this._valueText(v));
    s.setAttribute('aria-label', this.label || msg('rate.label'));
    s.setAttribute('tabindex', this.isDisabled ? '-1' : '0');
    if (this.isDisabled) s.setAttribute('aria-disabled', 'true');
    else s.removeAttribute('aria-disabled');
    if (this.readonly) s.setAttribute('aria-readonly', 'true');
    else s.removeAttribute('aria-readonly');
  }

  _syncClasses() {
    const off = motionOff(this);
    this._base.className = [
      'hui-rate',
      `hui-rate--${this.effectiveSize}`,
      this._locked ? '' : 'hui-rate--interactive',
      this.isDisabled ? 'hui-rate--disabled' : '',
      this.readonly ? 'hui-rate--readonly' : '',
      off ? 'hui-rate--static' : '',
      this._hover !== null ? 'hui-rate--hovering' : '',
      this._tipShown ? 'hui-rate--tip' : '',
    ].filter(Boolean).join(' ');
    this.setState('disabled', this.isDisabled);
  }

  // =====================================================
  // HIỆU ỨNG
  // =====================================================

  /** "Nảy" ở sao vừa chọn */
  _bounce() {
    if (motionOff(this) || !this.value) return;
    const star = this._starEls[Math.ceil(this.value) - 1];
    star?._inner.animate?.(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(0.92)' }, { transform: 'scale(1)' }],
      { duration: 420, easing: EASE_BOUNCE },
    );
  }

  /** Giá trị đổi bằng code → các sao mới được tô sáng lần lượt */
  _lightUp(from, to) {
    if (motionOff(this) || to <= from) return;
    let k = 0;
    for (let i = Math.floor(from); i < Math.ceil(to); i++) {
      const star = this._starEls[i];
      if (!star?._fg.animate) continue;
      const delay = k++ * STAGGER;
      star._fg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay, easing: EASE_OUT, fill: 'backwards' });
      star._inner.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
        { duration: 300, delay, easing: EASE_OUT },
      );
    }
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  /** Vị trí con trỏ → số sao (sao gần nhất; nửa trái = .5 khi allow-half, RTL đảo chiều) */
  _valueFromPointer(e) {
    if (!this._starEls.length) return 0;
    const rtl = getComputedStyle(this).direction === 'rtl';
    let index = 0;
    let best = Infinity;
    let rect = null;
    this._starEls.forEach((star, i) => {
      const r = star.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      if (d < best) {
        best = d;
        index = i;
        rect = r;
      }
    });
    if (this.allowHalf) {
      const mid = rect.left + rect.width / 2;
      const firstHalf = rtl ? e.clientX > mid : e.clientX < mid;
      if (firstHalf) return index + 0.5;
    }
    return index + 1;
  }

  _setHover(v) {
    if (v === null) this._suppressHover = null;
    if (this._hover === v) return;
    this._hover = v;
    this._base.classList.toggle('hui-rate--hovering', v !== null);
    this._syncFill();
    this.emit('hover-change', { value: v });
  }

  _onPointerMove(e) {
    if (this._locked) return;
    const v = this._valueFromPointer(e);
    if (this._suppressHover !== null) {
      if (v === this._suppressHover) return;
      this._suppressHover = null;
    }
    this._setHover(v);
  }

  _onClick(e) {
    if (this._locked) return;
    const v = this._valueFromPointer(e);
    const cleared = this._clearable && v === this.value;
    this._commit(cleared ? 0 : v);
    if (cleared) {
      // Xóa xong không tô lại ngay dưới con trỏ (giống Ant)
      this._setHover(null);
      this._suppressHover = v;
    }
  }

  /** Chọn giá trị do người dùng → nảy + input/change. Trả về true nếu đổi */
  _commit(v) {
    const next = this._normalize(v);
    if (next === this.value) return false;
    this._userCommit = true;
    this.value = next;
    this.markInteracted();
    this.emit('input', { value: next });
    this.emit('change', { value: next });
    return true;
  }

  /** APG Slider: ←/↓ giảm 1 bước, →/↑ tăng 1 bước (RTL: ←/→ đảo), Home = 0, End = count */
  _onKeydown(e) {
    if (this._locked) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const step = this._step;
    const v = this.value;
    let next;
    switch (e.key) {
      case 'ArrowUp': next = v + step; break;
      case 'ArrowDown': next = v - step; break;
      case 'ArrowRight': next = rtl ? v - step : v + step; break;
      case 'ArrowLeft': next = rtl ? v + step : v - step; break;
      case 'Home': next = 0; break;
      case 'End': next = this._count; break;
      default: return;
    }
    e.preventDefault();
    if (this._hover !== null) this._setHover(null);
    this._commit(Math.min(Math.max(next, 0), this._count));
  }

  // =====================================================
  // FORM
  // =====================================================

  _isEmpty() {
    return this.value === 0;
  }

  formValue() {
    return this._isEmpty() ? null : String(this.value);
  }

  checkConstraints() {
    if (this.isDisabled || !this.required || !this._isEmpty()) return null;
    return { flags: { valueMissing: true }, message: msg('rate.required') };
  }

  validationAnchor() {
    return this._stars;
  }

  focus(options) {
    if (this._stars) this._stars.focus(options);
    else super.focus(options);
  }

  blur() {
    this._stars?.blur();
  }
}

defineElement('hui-rate', HuiRate);

export default HuiRate;
