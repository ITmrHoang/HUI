/**
 * HUI List Item — Một dòng trong <hui-list>. Parts/slots/biến CSS: xem JSDoc của class.
 * Vuốt ngang (cảm ứng / chuột / bút) để hiện nút thao tác 2 bên (swipe actions), thả ra tự bám mở / đóng,
 * vuốt hết (full-swipe) chạy thao tác chính. Bàn phím: Tab tới nút thao tác → tự mở phía đó.
 */

import styles from './hui-list-item.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animationsDisabled } from '../../utils/animate.js';
import '../hui-icon/hui-icon.js';

const hasContent = (slot) => slot.assignedNodes().some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/** Chuỗi dự phòng khi locale.js chưa có key listItem.* */
const FALLBACK = {
  vi: {
    'listItem.actions': 'Thao tác', 'listItem.delete': 'Xóa', 'listItem.edit': 'Sửa', 'listItem.archive': 'Lưu trữ',
    'listItem.pin': 'Ghim', 'listItem.share': 'Chia sẻ', 'listItem.more': 'Thêm', 'listItem.read': 'Đã đọc',
  },
  en: {
    'listItem.actions': 'Actions', 'listItem.delete': 'Delete', 'listItem.edit': 'Edit', 'listItem.archive': 'Archive',
    'listItem.pin': 'Pin', 'listItem.share': 'Share', 'listItem.more': 'More', 'listItem.read': 'Mark as read',
  },
};

function tx(key) {
  const v = t(key);
  if (v !== key) return v;
  return (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? FALLBACK.en[key] ?? key;
}

/** Thao tác dựng sẵn: tên → [icon, màu] (nhãn theo locale listItem.<tên>) */
const PRESETS = {
  delete: ['delete', 'danger'],
  edit: ['edit', 'primary'],
  archive: ['folder', 'warning'],
  pin: ['star', 'warning'],
  share: ['share', 'info'],
  more: ['more', 'secondary'],
  read: ['check', 'success'],
};
const COLORS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

/** "delete" | { action, label, icon, color, primary } → mô tả đầy đủ */
function normalizeAction(spec) {
  const o = typeof spec === 'string' ? { action: spec } : { ...(spec || {}) };
  const action = String(o.action ?? o.key ?? '').trim();
  const preset = PRESETS[action] || [];
  return {
    action,
    label: o.label ?? (PRESETS[action] ? tx(`listItem.${action}`) : action),
    icon: o.icon ?? preset[0] ?? null,
    color: COLORS.includes(o.color) ? o.color : preset[1] || 'secondary',
    primary: Boolean(o.primary),
  };
}

/** Item đang mở (chỉ mở 1 item mỗi lúc, giống iOS) */
let openItem = null;

/** Ngưỡng nhận diện vuốt ngang / tỉ lệ vuốt hết / vận tốc vẩy (px/ms) */
const DRAG_SLOP = 6;
const FULL_RATIO = 0.6;
const FLICK_SPEED = 0.5;

/**
 * Dòng danh sách: nội dung chính (thường là <hui-list-item-meta>), actions, extra.
 * Bố cục (actions bên phải hay bên dưới) và kiểu thẻ lưới do <hui-list> cha quyết định.
 *
 * @fires hui-swipe-action - Bấm nút thao tác vuốt, hoặc vuốt hết (full). detail: { action, item, element, side, full }
 * @fires hui-swipe-open - Đã mở một phía. detail: { side }
 * @fires hui-swipe-close - Đã đóng
 * @slot - Nội dung chính (meta + mô tả thêm)
 * @slot actions - Các hành động (bên phải; item-layout="vertical" → bên dưới nội dung)
 * @slot extra - Vùng lớn bên phải (vd: ảnh minh họa)
 * @slot actions-start - Nút thao tác hiện khi vuốt về phía cuối (LTR: vuốt sang phải) — thay cho swipe-start
 * @slot actions-end - Nút thao tác hiện khi vuốt về phía đầu (LTR: vuốt sang trái) — thay cho swipe-end
 * @csspart base - Khung item (phần trượt khi vuốt)
 * @csspart main - Nội dung chính
 * @csspart actions - Vùng hành động
 * @csspart extra - Vùng extra
 * @csspart swipe - Khung bao (cắt phần trượt, nổi lên khi hover trong list hoverable)
 * @csspart actions-start - Vùng nút thao tác phía đầu
 * @csspart actions-end - Vùng nút thao tác phía cuối
 * @csspart swipe-action - Nút thao tác dựng từ swipe-start / swipe-end (thêm part swipe-action-<màu>)
 * @cssprop --hui-list-item-padding - Khoảng đệm item
 * @cssprop --hui-list-split-color - Màu đường kẻ dưới item
 * @cssprop --hui-list-item-color - Màu chữ nội dung
 * @cssprop --hui-list-item-actions-gap - Khoảng cách giữa các hành động
 * @cssprop --hui-list-item-swipe-bg - Nền phần trượt khi item có thao tác vuốt (mặc định --hui-bg-container)
 * @cssprop --hui-list-item-swipe-action-width - Bề rộng tối thiểu mỗi nút thao tác (mặc định 72px)
 * @cssprop --hui-list-item-swipe-action-color - Màu chữ nút thao tác (mặc định --hui-text-inverse)
 */
class HuiListItem extends HuiElement {
  static properties = {
    /** Thao tác phía đầu: mảng "delete" | { action, label, icon, color, primary } (JSON hoặc property) */
    swipeStart: { type: Array, attribute: 'swipe-start' },
    /** Thao tác phía cuối: mảng "delete" | { action, label, icon, color, primary } (JSON hoặc property) */
    swipeEnd: { type: Array, attribute: 'swipe-end' },
    /** Vuốt hết chiều ngang → chạy thao tác chính (data-primary / primary, hoặc nút đầu tiên). Bật cả khi <hui-list full-swipe> */
    fullSwipe: { type: Boolean },
    /** Dữ liệu gốc của dòng (khi render từ dataSource) — trả về trong detail.item. Chỉ gán bằng property */
    rowData: { type: Object, attribute: false },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    this._offset = 0;
    /** 'start' | 'end' | null */
    this._open = null;
    this._drag = null;
    this._suppressClick = false;
    this._onDocDown = (e) => {
      if (!e.composedPath().includes(this)) this.closeActions();
    };
  }

  connectedCallback() {
    super.connectedCallback();
    // role="listitem" qua ElementInternals → không thêm attribute lên thẻ của người dùng
    if (this._internals && 'role' in this._internals) this._internals.role = 'listitem';
    else if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this._onDocDown, true);
    clearTimeout(this._hideTimer);
    if (openItem === this) openItem = null;
  }

  render() {
    this._actionsSlot = createElement('slot', { name: 'actions' });
    this._actions = createElement('div', { className: 'hui-list-item__actions', part: 'actions' }, this._actionsSlot);
    this._extraSlot = createElement('slot', { name: 'extra' });
    this._extra = createElement('div', { className: 'hui-list-item__extra', part: 'extra' }, this._extraSlot);
    const sync = () => {
      this._actions.hidden = !hasContent(this._actionsSlot);
      this._extra.hidden = !hasContent(this._extraSlot);
    };
    this._actionsSlot.addEventListener('slotchange', sync);
    this._extraSlot.addEventListener('slotchange', sync);
    this._actions.hidden = true;
    this._extra.hidden = true;

    const main = createElement('div', { className: 'hui-list-item__main', part: 'main' }, createElement('slot'));
    this._base = createElement('div', { className: 'hui-list-item', part: 'base' }, main, this._actions, this._extra);

    // Vùng nút thao tác vuốt: slot của người dùng, dự phòng = nút dựng từ swipe-start / swipe-end
    const panel = (side) => {
      const slot = createElement('slot', { name: `actions-${side}` });
      slot.addEventListener('slotchange', () => this._syncSwipe());
      const el = createElement('div', {
        className: `hui-list-item__swipe-actions hui-list-item__swipe-actions--${side}`, part: `actions-${side}`, role: 'group',
      }, slot);
      el.addEventListener('click', (e) => this._onActionClick(e, side));
      return { el, slot };
    };
    this._start = panel('start');
    this._end = panel('end');

    // Thứ tự DOM: đầu → nội dung → cuối (Tab đi đúng thứ tự đọc)
    this._swipe = createElement('div', { className: 'hui-list-item__swipe', part: 'swipe' }, this._start.el, this._base, this._end.el);

    this._base.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this._base.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this._base.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this._base.addEventListener('pointercancel', (e) => this._onPointerUp(e, true));
    // Vừa kéo / chạm để đóng → nuốt cú click ngay sau đó (tránh mở nhầm link)
    this.addEventListener('click', (e) => {
      if (!this._suppressClick || !e.composedPath().includes(this._base)) return;
      this._suppressClick = false;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
    // Bàn phím: focus vào nút thao tác → mở phía đó; focus rời item → đóng
    this.addEventListener('focusin', (e) => {
      const side = this._sideOfNode(e.composedPath());
      if (side) this.openActions(side);
    });
    this.addEventListener('focusout', (e) => {
      const next = e.relatedTarget;
      if (next && (this.contains(next) || this.shadowRoot.contains(next))) return;
      this.closeActions();
    });
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._open) {
        e.stopPropagation();
        this.closeActions();
      }
    });
    return this._swipe;
  }

  updated(changed) {
    if (changed.has('swipeStart') || changed.has('locale')) this._renderGenerated(this._start.slot, this.swipeStart, 'start');
    if (changed.has('swipeEnd') || changed.has('locale')) this._renderGenerated(this._end.slot, this.swipeEnd, 'end');
    if (changed.has('locale')) {
      this._start.el.setAttribute('aria-label', tx('listItem.actions'));
      this._end.el.setAttribute('aria-label', tx('listItem.actions'));
    }
    this._syncSwipe();
  }

  // =====================================================
  // API
  // =====================================================

  /** Phía đang mở: 'start' | 'end' | null (chỉ đọc) */
  get swipeState() {
    return this._open;
  }

  /** Mở nút thao tác phía `side` ('start' | 'end') */
  openActions(side = 'end') {
    if (!this._hasSide(side)) return;
    if (openItem && openItem !== this) openItem.closeActions();
    const width = this._panelWidth(side);
    this._setOffset(this._physical(side) * width, true);
    if (this._open !== side) {
      this._open = side;
      openItem = this;
      this._swipe.classList.add('is-open');
      document.addEventListener('pointerdown', this._onDocDown, true);
      this.emit('hui-swipe-open', { side });
    }
  }

  /** Đóng nút thao tác */
  closeActions() {
    if (!this._open && !this._offset) return;
    this._setOffset(0, true);
    document.removeEventListener('pointerdown', this._onDocDown, true);
    if (openItem === this) openItem = null;
    const was = this._open;
    this._open = null;
    this._swipe?.classList.remove('is-open');
    if (was) this.emit('hui-swipe-close');
  }

  // =====================================================
  // DỰNG NÚT + ĐỒNG BỘ
  // =====================================================

  _renderGenerated(slot, specs, side) {
    const list = Array.isArray(specs) ? specs.map(normalizeAction).filter((a) => a.action) : [];
    slot.replaceChildren(...list.map((a) => {
      const btn = createElement('button', {
        type: 'button',
        className: `hui-list-item__swipe-btn hui-list-item__swipe-btn--${a.color}`,
        part: `swipe-action swipe-action-${a.color}`,
        'data-action': a.action,
        'data-primary': a.primary ? '' : undefined,
        'data-side': side,
      }, a.icon ? createElement('hui-icon', { name: a.icon }) : null, createElement('span', {}, String(a.label)));
      return btn;
    }));
  }

  /** Nút thao tác của 1 phía (slot người dùng, hoặc nút dựng sẵn) */
  _sideActions(side) {
    const p = side === 'start' ? this._start : this._end;
    const assigned = p.slot.assignedElements();
    return assigned.length ? assigned : [...p.slot.children];
  }

  _hasSide(side) {
    return this._hasRendered && this._sideActions(side).length > 0;
  }

  _syncSwipe() {
    if (!this._hasRendered) return;
    const start = this._hasSide('start');
    const end = this._hasSide('end');
    this._start.el.hidden = !start;
    this._end.el.hidden = !end;
    this._swipe.classList.toggle('is-swipeable', start || end);
    if (this._open && !this._hasSide(this._open)) this.closeActions();
  }

  get _rtl() {
    return getComputedStyle(this).direction === 'rtl';
  }

  /** Hướng vật lý (dấu translateX) để mở phía `side`: LTR start = +, end = − ; RTL ngược lại */
  _physical(side) {
    const sign = side === 'start' ? 1 : -1;
    return this._rtl ? -sign : sign;
  }

  _sideOfOffset(offset) {
    if (!offset) return null;
    const ltrSide = offset > 0 ? 'start' : 'end';
    return this._rtl ? (ltrSide === 'start' ? 'end' : 'start') : ltrSide;
  }

  _sideOfNode(path) {
    if (path.includes(this._start.el)) return 'start';
    if (path.includes(this._end.el)) return 'end';
    return null;
  }

  _panelWidth(side) {
    const el = side === 'start' ? this._start.el : this._end.el;
    el.style.minWidth = '';
    return el.offsetWidth;
  }

  get _fullSwipeEnabled() {
    if (this.fullSwipe) return true;
    // <hui-list full-swipe>: item có thể nằm trong shadow DOM của list (dataSource)
    let p = this.parentElement || this.getRootNode()?.host;
    while (p && p.localName !== 'hui-list') p = p.parentElement || p.getRootNode?.()?.host;
    return Boolean(p?.hasAttribute('full-swipe'));
  }

  _setOffset(px, animate) {
    this._offset = px;
    const noAnim = !animate || animationsDisabled();
    this._swipe.classList.toggle('is-dragging', !animate);
    this._base.classList.toggle('no-anim', noAnim);
    this._base.style.transform = px ? `translateX(${px}px)` : '';
    // Vuốt quá bề rộng nút → vùng nút giãn theo (nút chính giãn ra, kiểu iOS)
    const side = this._sideOfOffset(px);
    for (const s of ['start', 'end']) {
      const el = s === 'start' ? this._start.el : this._end.el;
      el.style.minWidth = s === side && !animate ? `${Math.abs(px)}px` : '';
      if (s === side) el.classList.add('is-revealed');
    }
    // Vùng nút chỉ hiện khi đang lộ ra (tránh viền màu lấp ló ở mép subpixel khi đóng);
    // đang trượt về 0 có hiệu ứng → đợi trượt xong mới ẩn
    clearTimeout(this._hideTimer);
    const hide = () => {
      for (const el of [this._start.el, this._end.el]) {
        if (this._sideOfOffset(this._offset) !== (el === this._start.el ? 'start' : 'end')) el.classList.remove('is-revealed');
      }
    };
    if (noAnim) hide();
    else this._hideTimer = setTimeout(hide, 350);
  }

  // =====================================================
  // KÉO
  // =====================================================

  _onPointerDown(e) {
    if (!(this._hasSide('start') || this._hasSide('end'))) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this._drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      origin: this._offset,
      active: false,
      lastX: e.clientX,
      lastT: e.timeStamp,
      v: 0,
      wasOpen: Boolean(this._open),
    };
  }

  _onPointerMove(e) {
    const d = this._drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dy) > DRAG_SLOP && Math.abs(dy) >= Math.abs(dx)) {
        this._drag = null; // cuộn dọc → bỏ
        return;
      }
      if (Math.abs(dx) <= DRAG_SLOP || Math.abs(dx) < Math.abs(dy)) return;
      d.active = true;
      try { this._base.setPointerCapture(e.pointerId); } catch { /* pointer giả lập / đã nhả */ }
      if (openItem && openItem !== this) openItem.closeActions();
    }
    e.preventDefault();
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = (e.clientX - d.lastX) / dt;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;

    let next = d.origin + dx;
    const side = this._sideOfOffset(next);
    if (side && !this._hasSide(side)) next = 0;
    else if (side) {
      const width = this._panelWidth(side);
      const limit = this._fullSwipeEnabled ? this._base.offsetWidth : width;
      const abs = Math.abs(next);
      // Quá giới hạn → kéo nặng dần (rubber band)
      if (abs > limit) next = Math.sign(next) * (limit + (abs - limit) * 0.2);
    }
    this._setOffset(next, false);
  }

  _onPointerUp(e, cancelled = false) {
    const d = this._drag;
    if (!d || d.id !== e.pointerId) return;
    this._drag = null;
    if (!d.active) {
      // Chạm vào nội dung khi đang mở → chỉ đóng, không kích hoạt link bên trong
      if (d.wasOpen && !cancelled) {
        this._suppressClick = true;
        this.closeActions();
      }
      return;
    }
    try { this._base.releasePointerCapture(e.pointerId); } catch { /* đã nhả */ }
    this._suppressClick = true;
    // Click tổng hợp chỉ tới ngay sau pointerup; không tới thì bỏ cờ để không nuốt click sau này
    setTimeout(() => { this._suppressClick = false; }, 0);

    const offset = this._offset;
    const side = this._sideOfOffset(offset);
    if (!side || cancelled) {
      this.closeActions();
      return;
    }
    const width = this._panelWidth(side);
    const abs = Math.abs(offset);
    const outward = Math.sign(d.v) === Math.sign(offset);
    if (this._fullSwipeEnabled && abs >= this._base.offsetWidth * FULL_RATIO) {
      this._runPrimary(side);
      return;
    }
    if (Math.abs(d.v) > FLICK_SPEED) {
      if (outward) this.openActions(side);
      else this.closeActions();
      return;
    }
    if (abs >= width / 2) this.openActions(side);
    else this.closeActions();
  }

  _runPrimary(side) {
    const actions = this._sideActions(side);
    const el = actions.find((a) => a.hasAttribute('data-primary')) || actions[0];
    if (!el) return;
    // Trượt hết rồi đóng lại: ứng dụng thường xóa item ngay trong sự kiện
    this._setOffset(this._physical(side) * this._base.offsetWidth, true);
    this._emitAction(el, side, true);
    this.closeActions();
  }

  _onActionClick(e, side) {
    const slot = side === 'start' ? this._start.slot : this._end.slot;
    const el = e.composedPath().find((n) => n instanceof Element && (n.parentNode === this || n.parentNode === slot));
    if (!el || el.matches(':disabled, [disabled], [aria-disabled="true"]')) return;
    this._emitAction(el, side, false);
    if (!el.hasAttribute('data-keep-open')) this.closeActions();
  }

  _emitAction(el, side, full) {
    const action = el.dataset.action || el.getAttribute('action') || el.textContent.trim();
    this.emit('hui-swipe-action', { action, item: this.rowData ?? this, element: el, side, full });
  }
}

defineElement('hui-list-item', HuiListItem);

export default HuiListItem;
