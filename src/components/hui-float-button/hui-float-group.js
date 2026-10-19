/**
 * HUI Float Group — Cụm nút nổi xòe ra từ một nút chính (Ant FloatButton.Group + MUI SpeedDial)
 * Con (<hui-float-button>, <hui-back-top>) được tự gắn `inline` để xếp chồng thay vì cố định ở góc.
 * Mở/đóng: trigger click | hover | none (none = luôn bung), các nút con xuất hiện so le (stagger).
 * Esc / click ra ngoài → đóng (utils/overlay.js).
 */

import skin from './float-button-skin.css?raw';
import styles from './hui-float-group.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import { openOverlay } from '../../utils/overlay.js';
import { applyOffset, tr, motionDuration } from './float-utils.js';
import '../hui-icon/hui-icon.js';
import './hui-float-button.js';

/** Độ trễ giữa 2 nút con liên tiếp khi xòe ra (ms) */
const STAGGER = 40;
/** Độ trễ đóng khi rời chuột (trigger hover) — đủ để rê chuột qua khe giữa các nút */
const HOVER_CLOSE_DELAY = 150;
const EASE_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
const EASE_IN = 'cubic-bezier(0.55, 0.055, 0.675, 0.19)';
/** Thẻ con được nhóm tự gắn inline (+ shape/size/no-animation) */
const MANAGED = ['HUI-FLOAT-BUTTON', 'HUI-BACK-TOP'];
let uid = 0;

/**
 * @fires open-change - Mở/đóng do người dùng (click, hover, Esc, click ngoài) hoặc method. detail: { open }
 * @slot - Các nút con (hui-float-button, hui-back-top...)
 * @slot icon - Icon tùy chỉnh cho nút chính
 * @csspart base - Khung bọc danh sách + nút chính
 * @csspart list - Danh sách nút con
 * @csspart toggle - Nút chính (<button>)
 * @csspart toggle-icon - Icon của nút chính
 * @cssprop --hui-float-group-gap - Khoảng cách giữa các nút (16px)
 * @cssprop --hui-float-group-offset-x - Khoảng cách tới mép trái/phải (24px)
 * @cssprop --hui-float-group-offset-y - Khoảng cách tới mép trên/dưới (24px)
 */
class HuiFloatGroup extends HuiElement {
  static properties = {
    /** bottom-right | bottom-left | top-right | top-left — góc màn hình */
    position: { type: String, default: 'bottom-right' },
    /** Khoảng cách tới mép (px): "24" hoặc "x,y" */
    offset: { type: String },
    /** click | hover | none — cách mở; none = luôn bung, ẩn nút chính */
    trigger: { type: String, default: 'click' },
    /** Trạng thái mở, tự phản chiếu khi mở/đóng */
    open: { type: Boolean },
    /** Icon nút chính (mặc định plus — xoay 45° thành × khi mở) */
    icon: { type: String, default: 'plus' },
    /** Icon thay thế khi mở; bỏ trống → xoay icon 45° */
    closeIcon: { type: String },
    /** default | primary — kiểu nút chính */
    type: { type: String, default: 'primary' },
    /** circle | square — áp cho nút chính và mọi nút con (khi có attribute) */
    shape: { type: String, default: 'circle' },
    /** sm | md | lg — áp cho nút chính và mọi nút con (khi có attribute) */
    size: { type: String, default: 'md' },
    /** Nhãn nút chính cho trình đọc màn hình (mặc định theo locale) */
    label: { type: String },
    /** Vòng lan thu hút sự chú ý trên nút chính */
    pulse: { type: Boolean },
    /** Nằm trong luồng trang thay vì cố định ở góc */
    inline: { type: Boolean },
    /** Tắt hiệu ứng (kể cả của nút con) */
    noAnimation: { type: Boolean },
  };

  static styles = [skin, styles];
  static localized = true;

  constructor() {
    super();
    this._shown = false;
    this._token = 0;
    this._overlay = null;
    this._anims = [];
    this._hoverTimer = null;
    /** Con mà nhóm đã tự đặt tooltip-placement (để cập nhật khi đổi position, không đè giá trị người dùng) */
    this._autoPlacement = new WeakSet();
    this._listId = `hui-float-group-${++uid}`;
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  show() { this._setOpen(true); }
  hide() { this._setOpen(false); }
  toggle() { this._setOpen(!this._shown); }

  // =====================================================
  // RENDER / LIFECYCLE
  // =====================================================

  render() {
    this._slot = createElement('slot');
    this._list = createElement('div', { className: 'list', part: 'list', id: this._listId, hidden: true }, this._slot);

    this._toggleIcon = createElement('hui-icon', { className: 'fb__icon toggle__icon', part: 'toggle-icon' });
    this._toggleIconSlot = createElement('slot', { name: 'icon' }, this._toggleIcon);
    this._toggle = createElement('button', {
      type: 'button',
      part: 'toggle',
      'aria-expanded': 'false',
      'aria-controls': this._listId,
    }, this._toggleIconSlot);
    // Trigger hover: click chỉ mở (đang mở do rê chuột thì không đóng nhầm); cảm ứng đóng bằng chạm ra ngoài
    this._toggle.addEventListener('click', () => (this.trigger === 'hover' ? this._setOpen(true) : this.toggle()));

    // Trigger hover: mở khi rê vào cả cụm, đóng trễ một chút khi rời ra
    this.addEventListener('mouseenter', () => {
      if (this.trigger !== 'hover') return;
      clearTimeout(this._hoverTimer);
      this._setOpen(true);
    });
    this.addEventListener('mouseleave', () => {
      if (this.trigger !== 'hover') return;
      clearTimeout(this._hoverTimer);
      this._hoverTimer = setTimeout(() => this._setOpen(false), HOVER_CLOSE_DELAY);
    });

    this._slot.addEventListener('slotchange', () => this._syncChildren());

    return createElement('div', { className: 'group', part: 'base' }, this._list, this._toggle);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._hoverTimer);
    this._overlay?.close();
    this._overlay = null;
  }

  updated(changed) {
    if (changed.has('offset')) applyOffset(this, this.offset, 'fg');

    if (['type', 'shape', 'size', 'pulse', 'noAnimation'].some((k) => changed.has(k))) {
      this._toggle.className = [
        'fb', 'toggle',
        this.type === 'default' ? '' : 'fb--primary',
        `fb--${['sm', 'lg'].includes(this.size) ? this.size : 'md'}`,
        this.shape === 'square' ? 'fb--square' : '',
        this.pulse ? 'fb--pulse' : '',
        this.noAnimation ? 'fb--no-animation' : '',
        this._shown ? 'toggle--open' : '',
      ].filter(Boolean).join(' ');
    }

    if (changed.has('label') || changed.has('locale')) {
      this._toggle.setAttribute('aria-label', this.label || tr('floatGroup.toggle', { vi: 'Mở nhóm nút', en: 'Open actions' }));
    }

    if (['position', 'shape', 'size', 'noAnimation'].some((k) => changed.has(k))) this._syncChildren();

    if (changed.has('trigger')) this._toggle.hidden = this.trigger === 'none';

    if (changed.has('trigger') || changed.has('open')) this._applyOpen(this.trigger === 'none' || this.open);

    if (changed.has('icon') || changed.has('closeIcon') || changed.has('open')) this._syncToggleIcon();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /** Nút con hiển thị được (bỏ qua phần tử hidden) */
  _items() {
    return this._slot.assignedElements().filter((el) => !el.hidden);
  }

  /** Gắn inline (+ shape/size/no-animation nếu nhóm có attribute đó) và hướng tooltip cho các con */
  _syncChildren() {
    const placement = this.position?.endsWith('left') ? 'right' : 'left';
    for (const el of this._slot.assignedElements()) {
      if (!MANAGED.includes(el.tagName)) continue;
      el.toggleAttribute('inline', true);
      if (this.hasAttribute('shape')) el.setAttribute('shape', this.shape);
      if (this.hasAttribute('size')) el.setAttribute('size', this.size);
      if (this.noAnimation) el.toggleAttribute('no-animation', true);
      if (el.tagName === 'HUI-FLOAT-BUTTON' && (!el.hasAttribute('tooltip-placement') || this._autoPlacement.has(el))) {
        el.setAttribute('tooltip-placement', placement);
        this._autoPlacement.add(el);
      }
    }
  }

  _syncToggleIcon() {
    const swap = this._shown && this.closeIcon;
    this._toggleIcon.setAttribute('name', swap ? this.closeIcon : (this.icon || 'plus'));
    // Không có closeIcon → xoay icon 45° (plus thành ×)
    this._toggleIcon.classList.toggle('toggle__icon--rotate', !this.closeIcon);
  }

  /** Đổi trạng thái do người dùng / method: áp lên DOM + phản chiếu open + phát open-change */
  _setOpen(open) {
    if (this.trigger === 'none' || open === this._shown) return;
    this._applyOpen(open);
    this.open = open;
    this.emit('open-change', { open });
  }

  /** Áp trạng thái mở/đóng lên DOM (không phát sự kiện) */
  _applyOpen(open) {
    const always = this.trigger === 'none';
    // Đổi trigger sang none khi đang có overlay → gỡ overlay (luôn bung, không cần Esc)
    if (always && this._overlay) {
      this._overlay.close();
      this._overlay = null;
    }
    if (open === this._shown) return;
    this._shown = open;
    const token = ++this._token;

    this._toggle.setAttribute('aria-expanded', String(open));
    this._toggle.classList.toggle('toggle--open', open);
    this.setState('open', open);
    this._syncToggleIcon();

    if (open) {
      this._list.hidden = false;
      this._stagger(true);
      if (!always && !this._overlay) {
        this._overlay = openOverlay({
          element: this,
          restoreFocus: false,
          onEscape: () => {
            this._setOpen(false);
            this._toggle.focus();
          },
          onClickOutside: () => this._setOpen(false),
        });
      }
      return;
    }

    this._overlay?.close();
    this._overlay = null;
    this._stagger(false).then(() => {
      if (token !== this._token) return; // đã mở lại trong lúc đang đóng
      this._list.hidden = true;
      this._cancelAnims();
    });
  }

  _cancelAnims() {
    this._anims.forEach((a) => a.cancel());
    this._anims = [];
  }

  /**
   * Hiệu ứng so le: mở → nút gần nút chính hiện trước; đóng → nút xa nhất ẩn trước.
   * Animate thẳng lên host của từng nút con (host inline không dùng transform).
   */
  _stagger(open) {
    this._cancelAnims();
    const items = this._items().filter((el) => typeof el.animate === 'function');
    if (this.noAnimation || prefersReducedMotion() || !items.length) return Promise.resolve();

    const top = this.position?.startsWith('top');
    const hidden = { opacity: 0, transform: `translateY(${top ? -12 : 12}px) scale(0.6)` };
    const visible = { opacity: 1, transform: 'none' };
    // DOM: với nhóm ở đáy, phần tử cuối nằm sát nút chính
    const nearFirst = top ? items : [...items].reverse();
    const ordered = open ? nearFirst : [...nearFirst].reverse();
    const duration = motionDuration(this);

    this._anims = ordered.map((el, i) => el.animate(open ? [hidden, visible] : [visible, hidden], {
      duration,
      delay: i * STAGGER,
      easing: open ? EASE_OUT : EASE_IN,
      // Mở: giữ trạng thái ẩn trong lúc chờ delay; đóng: giữ trạng thái ẩn tới khi danh sách bị ẩn
      fill: open ? 'backwards' : 'forwards',
    }));
    return Promise.all(this._anims.map((a) => a.finished.catch(() => {})));
  }
}

defineElement('hui-float-group', HuiFloatGroup);

export default HuiFloatGroup;
