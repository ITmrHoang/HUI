/**
 * HUI Footer Links — Các cột link chân trang (Organism): `data` [{ title, links: [{ label, href }] }],
 * vùng thương hiệu (slot brand) và thanh dưới cùng (slot bottom: bản quyền, mạng xã hội).
 * Khung hẹp (container < 600px) → các cột thành accordion (mẫu Disclosure của WAI-ARIA APG).
 */

import styles from './hui-footer-links.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { collapse } from '../../utils/motion.js';
import { createMsg, headingLevel } from '../hui-feature-card/landing-shared.js';
import '../hui-icon/hui-icon.js';

const msg = createMsg({
  'footerLinks.label': { vi: 'Liên kết chân trang', en: 'Footer links' },
});

const assigned = (slot) => slot.assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent.trim());
let uid = 0;

/**
 * @fires hui-toggle - Mở / đóng một cột ở chế độ accordion. detail: { index, open }
 * @slot brand - Cột thương hiệu đầu tiên (logo, mô tả, mạng xã hội)
 * @slot bottom - Thanh dưới cùng (bản quyền, mạng xã hội, chọn ngôn ngữ…)
 * @csspart base - Khung ngoài
 * @csspart top - Hàng trên (brand + các cột)
 * @csspart brand - Vùng thương hiệu
 * @csspart nav - Thẻ <nav> chứa các cột
 * @csspart column - Mỗi cột (kèm column-open khi mở ở chế độ accordion)
 * @csspart heading - Tiêu đề cột (role heading)
 * @csspart toggle - Nút mở / đóng cột (chỉ hiện ở chế độ accordion)
 * @csspart toggle-icon - Mũi tên của nút
 * @csspart list - Danh sách link (<ul>)
 * @csspart link - Mỗi link
 * @csspart badge - Nhãn nhỏ cạnh link (vd "Mới")
 * @csspart bottom - Thanh dưới cùng
 * @cssprop --hui-footer-links-gap - Khoảng cách giữa các cột
 * @cssprop --hui-footer-links-min-width - Bề rộng tối thiểu mỗi cột khi không đặt columns (mặc định 160px)
 * @cssprop --hui-footer-links-brand-width - Bề rộng cột thương hiệu (mặc định 280px)
 * @cssprop --hui-footer-links-heading-color - Màu tiêu đề cột
 * @cssprop --hui-footer-links-link-color - Màu link
 * @cssprop --hui-footer-links-link-hover-color - Màu link khi hover (mặc định primary)
 * @cssprop --hui-footer-links-divider-color - Màu vạch chia (thanh dưới, các mục accordion)
 * @cssprop --hui-footer-links-bottom-color - Màu chữ thanh dưới
 */
class HuiFooterLinks extends HuiElement {
  static localized = true;

  static properties = {
    /** Mảng cột [{ title, links: [{ label, href, target, badge }] }] */
    data: { type: Array },
    /** Số cột link cố định; bỏ trống = tự chia theo bề rộng */
    columns: { type: Number },
    /** auto | always | never — accordion khi khung < 600px / luôn luôn / không bao giờ */
    collapse: { type: String, default: 'auto' },
    /** Chế độ accordion chỉ mở 1 cột mỗi lúc */
    accordion: { type: Boolean },
    /** Cấp heading của tiêu đề cột (aria-level) */
    headingLevel: { type: Number, default: 2 },
    /** Nhãn của <nav> (mặc định locale "Liên kết chân trang") */
    label: { type: String },
    /** Tắt hiệu ứng mở / đóng */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  constructor() {
    super();
    this._uid = `fl${++uid}`;
    /** Chỉ số các cột đang mở (chế độ accordion) */
    this._open = new Set();
  }

  /** Đang ở chế độ accordion (nút mở / đóng đang hiện) */
  get collapsed() {
    const btn = this._nav?.querySelector('.fl__toggle');
    return btn ? getComputedStyle(btn).display !== 'none' : this.collapse === 'always';
  }

  render() {
    this._brandSlot = createElement('slot', { name: 'brand' });
    this._brand = createElement('div', { className: 'fl__brand', part: 'brand' }, this._brandSlot);
    this._nav = createElement('nav', { className: 'fl__nav', part: 'nav' });
    this._top = createElement('div', { className: 'fl__top', part: 'top' }, this._brand, this._nav);
    this._bottomSlot = createElement('slot', { name: 'bottom' });
    this._bottom = createElement('div', { className: 'fl__bottom', part: 'bottom' }, this._bottomSlot);
    for (const s of [this._brandSlot, this._bottomSlot]) s.addEventListener('slotchange', () => this._syncSlots());
    this._base = createElement('div', { className: 'fl', part: 'base' }, this._top, this._bottom);
    return this._base;
  }

  firstUpdated() {
    this._syncSlots();
  }

  updated(changed) {
    if (changed.has('collapse')) {
      this._base.classList.remove('fl--auto', 'fl--always', 'fl--never');
      this._base.classList.add(`fl--${['always', 'never'].includes(this.collapse) ? this.collapse : 'auto'}`);
    }
    if (changed.has('columns')) {
      const cols = Number(this.columns);
      const fixed = Number.isFinite(cols) && cols > 0;
      this._nav.classList.toggle('fl__nav--fixed', fixed);
      if (fixed) this._nav.style.setProperty('--_fl-cols', String(Math.round(cols)));
      else this._nav.style.removeProperty('--_fl-cols');
    }
    if (changed.has('label') || changed.has('locale')) this._nav.setAttribute('aria-label', this.label || msg('footerLinks.label'));
    if (changed.has('data')) {
      this._open.clear();
      this._renderColumns();
    } else if (changed.has('headingLevel')) {
      this._nav.querySelectorAll('.fl__heading').forEach((h) => h.setAttribute('aria-level', String(headingLevel(this.headingLevel, 2))));
    }
    if (changed.has('accordion') && this.accordion && this._open.size > 1) {
      const [first] = this._open;
      this._open = new Set([first]);
      this._syncOpen();
    }
  }

  _renderColumns() {
    const cols = Array.isArray(this.data) ? this.data.filter((c) => c && typeof c === 'object') : [];
    const level = String(headingLevel(this.headingLevel, 2));
    this._nav.replaceChildren(...cols.map((col, i) => {
      const listId = `${this._uid}-list-${i}`;
      const title = String(col.title ?? '');
      const toggle = createElement('button', {
        type: 'button', className: 'fl__toggle', part: 'toggle', 'aria-expanded': 'false', 'aria-controls': listId,
      }, createElement('span', {}, title), createElement('hui-icon', { className: 'fl__toggle-icon', part: 'toggle-icon', name: 'chevron-down' }));
      toggle.addEventListener('click', () => this.toggleColumn(i));
      const heading = createElement('div', { className: 'fl__heading', part: 'heading', role: 'heading', 'aria-level': level },
        createElement('span', { className: 'fl__heading-text' }, title), toggle);
      const links = Array.isArray(col.links) ? col.links : [];
      const list = createElement('ul', { className: 'fl__list', part: 'list', id: listId }, ...links.map((l) => {
        const a = createElement('a', { className: 'fl__link', part: 'link', href: String(l?.href ?? '#') }, String(l?.label ?? ''));
        if (l?.target) a.target = String(l.target);
        if (l?.target === '_blank') a.rel = 'noopener noreferrer';
        if (l?.badge) a.append(createElement('span', { className: 'fl__badge', part: 'badge' }, String(l.badge)));
        return createElement('li', {}, a);
      }));
      return createElement('div', { className: 'fl__col', part: 'column', 'data-index': String(i) }, heading, list);
    }));
    this._syncOpen();
  }

  /** Mở / đóng cột thứ `index` (chế độ accordion). `force` = true/false để ép trạng thái */
  async toggleColumn(index, force) {
    const col = this._nav.querySelector(`.fl__col[data-index="${index}"]`);
    if (!col) return;
    const open = force ?? !this._open.has(index);
    if (open === this._open.has(index)) return;
    const closing = open && this.accordion ? [...this._open] : [];
    if (open) this._open.add(index);
    else this._open.delete(index);
    for (const i of closing) this._open.delete(i);

    const list = col.querySelector('.fl__list');
    const animate = !this.noAnimation && this.collapsed;
    if (open) {
      this._syncOpen();
      if (animate) collapse(list, true);
    } else {
      // Đóng: chạy hiệu ứng thu lại xong mới ẩn hẳn
      col.querySelector('.fl__toggle').setAttribute('aria-expanded', 'false');
      if (animate) await collapse(list, false);
      this._syncOpen();
    }
    this.emit('hui-toggle', { index, open });
  }

  _syncOpen() {
    this._nav.querySelectorAll('.fl__col').forEach((col) => {
      const open = this._open.has(Number(col.dataset.index));
      col.classList.toggle('fl__col--open', open);
      col.setAttribute('part', open ? 'column column-open' : 'column');
      col.querySelector('.fl__toggle').setAttribute('aria-expanded', String(open));
    });
  }

  _syncSlots() {
    this._brand.hidden = !assigned(this._brandSlot);
    this._bottom.hidden = !assigned(this._bottomSlot);
    this._top.classList.toggle('fl__top--brand', !this._brand.hidden);
  }
}

defineElement('hui-footer-links', HuiFooterLinks);

export { HuiFooterLinks };
export default HuiFooterLinks;
