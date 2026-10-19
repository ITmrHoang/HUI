/**
 * HUI Sticky — dính khi cuộn trong khung cha (CSS position: sticky) + báo trạng thái "đang dính" (Atom, A3.7).
 *   <hui-sticky top="0"><header>…</header></hui-sticky>
 *   hui-sticky:state(stuck) { box-shadow: var(--hui-shadow-md); }   hoặc   hui-sticky[stuck] { … }
 *
 * Phát hiện "đang dính" bằng IntersectionObserver + 2 mốc 1px nằm trong shadow DOM, đặt cách mép host
 * đúng bằng offset: khi host dính, host đứng yên ở vị trí `top` → mốc A (cao hơn 1px) nằm trên mép khung cuộn,
 * mốc B (thấp hơn 1px) còn bên dưới. Host bị khung cha đẩy đi (hết khung) → cả 2 mốc đều trên mép → hết dính.
 * Không chèn phần tử nào vào light DOM của trang.
 */

import styles from './hui-sticky.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';

/** Số trơn → px; CSS length / var() giữ nguyên */
function toLength(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  return /^-?\d+(\.\d+)?$/.test(v) ? `${v}px` : v;
}

/** Khung cuộn gần nhất (theo cây hiển thị, xuyên shadow DOM) — null = cửa sổ */
function scrollParentOf(el) {
  let node = el.assignedSlot || el.parentElement || el.parentNode?.host;
  while (node && node !== document.body && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    if (/(auto|scroll|hidden|overlay)/.test(`${cs.overflowY}${cs.overflowX}`)) return node;
    node = node.assignedSlot || node.parentElement || node.parentNode?.host;
  }
  return null;
}

/**
 * @fires hui-stuck-change - Bắt đầu / thôi dính. detail: { stuck, edge: 'top' | 'bottom' | null }
 * @slot - Nội dung dính (header, thanh công cụ, mục lục…)
 * @csspart base - Khung bọc nội dung
 * @cssprop --hui-sticky-bg - Nền khi đang dính (mặc định trong suốt — đặt nền để nội dung bên dưới không lộ qua)
 * @cssprop --hui-sticky-shadow - Bóng khi đang dính (mặc định không có)
 * @cssprop --hui-sticky-transition - Chuyển tiếp nền / bóng khi đổi trạng thái
 */
class HuiSticky extends HuiElement {
  static properties = {
    /** Khoảng cách tới mép trên khung cuộn khi dính: số (px) hoặc CSS length. Không đặt top lẫn bottom → 0 */
    top: { type: String },
    /** Khoảng cách tới mép dưới khung cuộn khi dính (dính ở đáy): số (px) hoặc CSS length */
    bottom: { type: String },
    /** z-index khi dính (mặc định --hui-z-sticky) — attribute `z-index` */
    zIndex: { type: String, attribute: 'z-index' },
    /** Đang dính (chỉ đọc — component tự cập nhật) */
    stuck: { type: Boolean },
    /** Tắt dính (về position: static) */
    disabled: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._entries = new Map();
  }

  render() {
    this._instanceStyle = createElement('style');
    const sentinel = (name) => createElement('span', { className: `sticky__sentinel sticky__sentinel--${name}`, 'aria-hidden': 'true' });
    this._sentinels = {
      topA: sentinel('top-a'),
      topB: sentinel('top-b'),
      bottomA: sentinel('bottom-a'),
      bottomB: sentinel('bottom-b'),
    };
    this._base = createElement('div', { className: 'sticky', part: 'base' }, createElement('slot'));
    return [this._instanceStyle, ...Object.values(this._sentinels), this._base];
  }

  connectedCallback() {
    super.connectedCallback();
    this._observe();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._io?.disconnect();
    this._io = null;
  }

  updated(changed) {
    if (['top', 'bottom', 'zIndex', 'disabled'].some((k) => changed.has(k))) {
      const { top, bottom } = this._offsets;
      const rules = [];
      if (top !== null) rules.push(`top: ${top};`);
      if (bottom !== null) rules.push(`bottom: ${bottom};`);
      if (this.zIndex !== null && this.zIndex !== '') rules.push(`z-index: ${this.zIndex};`);
      const sentinels = [];
      // Mốc đặt cách mép host đúng bằng offset (±1–2px) — xem giải thích đầu file
      if (top !== null) {
        sentinels.push(`.sticky__sentinel--top-a { top: calc(-1 * (${top}) - 2px); }`);
        sentinels.push(`.sticky__sentinel--top-b { top: calc(-1 * (${top}) + 1px); }`);
      }
      if (bottom !== null) {
        sentinels.push(`.sticky__sentinel--bottom-a { bottom: calc(-1 * (${bottom}) - 2px); }`);
        sentinels.push(`.sticky__sentinel--bottom-b { bottom: calc(-1 * (${bottom}) + 1px); }`);
      }
      this._instanceStyle.textContent = `:host(:not([disabled])) { ${rules.join(' ')} } ${sentinels.join(' ')}`;
      if (this._hasRendered && this.isConnected && this._io) this._observe();
    }
  }

  /** Offset đang áp dụng (CSS length) — không đặt gì thì top = 0 */
  get _offsets() {
    const top = toLength(this.top);
    const bottom = toLength(this.bottom);
    return { top: top === null && bottom === null ? '0px' : top, bottom };
  }

  _observe() {
    this._io?.disconnect();
    this._io = null;
    this._entries.clear();
    if (this.disabled || typeof IntersectionObserver !== 'function') {
      this._setStuck(false, null);
      return;
    }
    this._root = scrollParentOf(this);
    this._io = new IntersectionObserver((entries) => {
      for (const e of entries) this._entries.set(e.target, e);
      this._compute();
    }, { root: this._root, threshold: [0, 1] });
    const { top, bottom } = this._offsets;
    const s = this._sentinels;
    if (top !== null) { this._io.observe(s.topA); this._io.observe(s.topB); }
    if (bottom !== null) { this._io.observe(s.bottomA); this._io.observe(s.bottomB); }
  }

  /** Mép trên/dưới của vùng nhìn thấy trong khung cuộn (padding box) */
  _rootEdges() {
    if (this._root) {
      const r = this._root.getBoundingClientRect();
      const top = r.top + this._root.clientTop;
      return { top, bottom: top + this._root.clientHeight };
    }
    return { top: 0, bottom: document.documentElement.clientHeight || window.innerHeight };
  }

  _compute() {
    if (!this.isConnected || this.disabled) return;
    const edges = this._rootEdges();
    const s = this._sentinels;
    const { top, bottom } = this._offsets;
    // Đọc vị trí thật tại thời điểm tính (entry có thể đã cũ khi có nhiều thay đổi cùng frame)
    const rect = (el) => el.getBoundingClientRect();
    let edge = null;
    if (top !== null) {
      const aboveA = rect(s.topA).bottom <= edges.top + 0.5;
      const aboveB = rect(s.topB).bottom <= edges.top + 0.5;
      if (aboveA && !aboveB) edge = 'top';
    }
    if (!edge && bottom !== null) {
      const belowA = rect(s.bottomA).top >= edges.bottom - 0.5;
      const belowB = rect(s.bottomB).top >= edges.bottom - 0.5;
      if (belowA && !belowB) edge = 'bottom';
    }
    this._setStuck(edge !== null, edge);
  }

  _setStuck(value, edge) {
    this.setState('stuck', value);
    this.setState('stuck-top', edge === 'top');
    this.setState('stuck-bottom', edge === 'bottom');
    if (this.stuck === value) return;
    this.stuck = value;
    this.emit('hui-stuck-change', { stuck: value, edge });
  }
}

defineElement('hui-sticky', HuiSticky);

export default HuiSticky;
