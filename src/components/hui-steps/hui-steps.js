/**
 * HUI Steps — Thanh các bước (Ant Steps + MUI Stepper)
 * direction horizontal | vertical · type default | dot | navigation · clickable · percent (vòng tiến độ)
 * Dữ liệu: property `data` (mảng) hoặc các thẻ con <hui-step>. Biến CSS: xem đầu hui-steps.css.
 */

import styles from './hui-steps.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import '../hui-icon/hui-icon.js';
import './hui-step.js';

/** Chuỗi dự phòng khi locale.js chưa có key steps.* */
const FALLBACK = {
  vi: { label: 'Các bước', stepLabel: 'Bước {index}: {title}', wait: 'Đang chờ', process: 'Đang thực hiện', finish: 'Đã hoàn thành', error: 'Lỗi' },
  en: { label: 'Steps', stepLabel: 'Step {index}: {title}', wait: 'Waiting', process: 'In progress', finish: 'Finished', error: 'Error' },
};

function tr(key, vars) {
  const path = `steps.${key}`;
  let value = t(path, vars);
  if (value === path) {
    value = (FALLBACK[getLocaleName()] || FALLBACK.en)[key] ?? key;
    if (vars) value = value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }
  return value;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const STATUSES = ['wait', 'process', 'finish', 'error'];
const TYPES = ['default', 'dot', 'navigation'];
/** Attribute của <hui-step> con cần theo dõi */
const STEP_ATTRS = ['title', 'description', 'sub-title', 'icon', 'status', 'disabled'];

const clamp = (v) => Math.min(100, Math.max(0, Number(v) || 0));

/**
 * @fires change - Bấm chọn bước (khi clickable). detail: { current, previous }
 * @slot - Các thẻ <hui-step> (bỏ qua khi đã gán `data`)
 * @csspart base - Danh sách <ol>
 * @csspart item - Một bước <li> (thêm part item-wait | item-process | item-finish | item-error, item-active cho bước hiện tại)
 * @csspart step - Vùng bấm của bước (<button> khi clickable)
 * @csspart icon - Ô số thứ tự / icon / chấm
 * @csspart ring - Vòng tiến độ quanh icon bước hiện tại (percent)
 * @csspart content - Khối chữ
 * @csspart title - Tiêu đề
 * @csspart subtitle - Tiêu đề phụ
 * @csspart description - Mô tả
 * @csspart connector - Đường nối giữa hai bước
 * @csspart connector-fill - Phần đã tô của đường nối (bước đã hoàn thành)
 * @cssprop --hui-steps-icon-size - Kích thước ô icon (32px; sm 24px)
 * @cssprop --hui-steps-dot-size - Đường kính chấm (type="dot", 8px)
 * @cssprop --hui-steps-color - Màu bước đang làm / đã xong (mặc định --hui-primary)
 * @cssprop --hui-steps-wait-color - Màu bước đang chờ
 * @cssprop --hui-steps-error-color - Màu bước lỗi
 * @cssprop --hui-steps-connector-color - Màu đường nối chưa tô
 * @cssprop --hui-steps-connector-fill-color - Màu đường nối đã tô
 * @cssprop --hui-steps-connector-thickness - Độ dày đường nối (1px)
 * @cssprop --hui-steps-title-color - Màu tiêu đề
 * @cssprop --hui-steps-description-color - Màu mô tả
 * @cssprop --hui-steps-gap - Khoảng cách icon ↔ chữ / đường nối
 * @cssprop --hui-steps-focus-color - Viền focus của bước bấm được
 */
class HuiSteps extends HuiElement {
  static properties = {
    /** Bước hiện tại (bắt đầu từ 0) */
    current: { type: Number, default: 0 },
    /** horizontal | vertical — ngang | dọc */
    direction: { type: String, default: 'horizontal' },
    /** default | dot | navigation — số trong vòng tròn | chấm nhỏ | thanh điều hướng có mũi tên */
    type: { type: String, default: 'default' },
    /** sm | md — kích thước */
    size: { type: String, default: 'md' },
    /** wait | process | finish | error — trạng thái của bước hiện tại */
    status: { type: String, default: 'process' },
    /** horizontal | vertical — chữ nằm cạnh icon | dưới icon (chỉ khi direction="horizontal") */
    labelPlacement: { type: String, default: 'horizontal' },
    /** Các bước thành nút bấm → phát sự kiện change */
    clickable: { type: Boolean },
    /** Phần trăm 0–100 của bước hiện tại → vẽ vòng tiến độ quanh icon (type="default") */
    percent: { type: Number },
    /** Bề rộng (px) dưới mức này thì direction ngang tự chuyển thành dọc; 0 = tắt */
    responsiveBreakpoint: { type: Number, default: 576 },
    /** Mảng bước: [{ title, description, subTitle, icon, status, disabled }] — ưu tiên hơn <hui-step> con */
    data: { type: Array },
    /** Tắt hiệu ứng tô đường nối */
    noAnimation: { type: Boolean },
  };

  static styles = styles;

  static localized = true;

  constructor() {
    super();
    /** Bề rộng nhỏ hơn responsive-breakpoint → hiển thị dọc */
    this._collapsed = false;
    this._items = [];
  }

  render() {
    this._list = createElement('ol', { className: 'steps', part: 'base' });
    this._list.addEventListener('click', (e) => this._onClick(e));
    this._list.addEventListener('keydown', (e) => this._onKeydown(e));
    return this._list;
  }

  connectedCallback() {
    const reconnect = this._hasRendered;
    super.connectedCallback();
    // <hui-step> con thêm/bớt/đổi attribute → dựng lại
    this._observer ||= new MutationObserver((records) => {
      if (records.some((r) => r.target === this || r.target.localName === 'hui-step')) this.requestUpdate('_children');
    });
    this._observer.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: STEP_ATTRS });
    if (typeof ResizeObserver === 'function') {
      this._resize ||= new ResizeObserver((entries) => this._onResize(entries[0]?.contentRect.width));
      this._resize.observe(this);
    }
    // Gắn lại vào trang: thẻ con có thể đã đổi trong lúc tháo ra
    if (reconnect) this.requestUpdate('_children');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._observer?.disconnect();
    this._resize?.disconnect();
  }

  updated(changed) {
    const childrenChanged = changed.has('_children') && !Array.isArray(this.data);
    if (changed.has('data') || changed.has('clickable') || childrenChanged) this._build();
    this._syncLayout();
    this._syncItems();
  }

  // =====================================================
  // HELPERS
  // =====================================================

  get _type() {
    return TYPES.includes(this.type) ? this.type : 'default';
  }

  /** Hướng thực tế: ngang bị thu thành dọc khi khung hẹp */
  get _direction() {
    return this.direction === 'vertical' || this._collapsed ? 'vertical' : 'horizontal';
  }

  /** Chữ dưới icon: label-placement="vertical" hoặc type="dot" (ngang) */
  get _labelVertical() {
    return this._direction === 'horizontal' && this._type !== 'navigation' &&
      (this.labelPlacement === 'vertical' || this._type === 'dot');
  }

  /** Danh sách bước từ data hoặc thẻ con */
  _readSteps() {
    if (Array.isArray(this.data)) return this.data.map((s) => (typeof s === 'string' ? { title: s } : s || {}));
    return [...this.children].filter((c) => c.localName === 'hui-step').map((c) => ({
      title: c.getAttribute('title') || '',
      description: c.getAttribute('description') || '',
      subTitle: c.getAttribute('sub-title') || '',
      icon: c.getAttribute('icon') || '',
      status: c.getAttribute('status') || '',
      disabled: c.hasAttribute('disabled'),
    }));
  }

  /** Trạng thái của bước i: status riêng > tự tính theo current */
  _statusOf(step, i) {
    if (STATUSES.includes(step.status)) return step.status;
    const current = Number(this.current) || 0;
    if (i < current) return 'finish';
    if (i === current) return STATUSES.includes(this.status) ? this.status : 'process';
    return 'wait';
  }

  _onResize(width) {
    const bp = Number(this.responsiveBreakpoint) || 0;
    const collapsed = bp > 0 && width > 0 && width < bp;
    if (collapsed === this._collapsed) return;
    this._collapsed = collapsed;
    this.setState('collapsed', collapsed);
    this.requestUpdate('_collapsed');
  }

  // =====================================================
  // DỰNG DOM
  // =====================================================

  /** Dựng lại các <li> (chỉ khi danh sách bước / clickable đổi) */
  _build() {
    this._steps = this._readSteps();
    this._items = this._steps.map((step, i) => {
      const iconInner = createElement('span', { className: 'step__icon-inner' });
      const ringPath = document.createElementNS(SVG_NS, 'circle');
      const ringTrail = document.createElementNS(SVG_NS, 'circle');
      for (const c of [ringTrail, ringPath]) {
        c.setAttribute('cx', '50');
        c.setAttribute('cy', '50');
        c.setAttribute('r', '47');
        c.setAttribute('fill', 'none');
        c.setAttribute('pathLength', '100');
        c.setAttribute('transform', 'rotate(-90 50 50)');
      }
      ringTrail.setAttribute('class', 'ring__trail');
      ringPath.setAttribute('class', 'ring__path');
      const ring = document.createElementNS(SVG_NS, 'svg');
      ring.setAttribute('viewBox', '0 0 100 100');
      ring.setAttribute('class', 'ring');
      ring.setAttribute('part', 'ring');
      ring.setAttribute('aria-hidden', 'true');
      ring.append(ringTrail, ringPath);

      const icon = createElement('span', { className: 'step__icon', part: 'icon', 'aria-hidden': 'true' }, iconInner, ring);
      const titleText = createElement('span', { className: 'step__title-text' });
      const subtitle = createElement('span', { className: 'step__subtitle', part: 'subtitle' });
      const title = createElement('span', { className: 'step__title', part: 'title' }, titleText, subtitle);
      const desc = createElement('span', { className: 'step__desc', part: 'description' });
      const srStatus = createElement('span', { className: 'sr-only' });
      const content = createElement('span', { className: 'step__content', part: 'content' }, title, desc, srStatus);

      const body = this.clickable
        ? createElement('button', { type: 'button', className: 'step__body', part: 'step', 'data-index': String(i) }, icon, content)
        : createElement('div', { className: 'step__body', part: 'step' }, icon, content);

      const fill = createElement('span', { className: 'step__connector-fill', part: 'connector-fill' });
      const connector = createElement('span', { className: 'step__connector', part: 'connector', 'aria-hidden': 'true' }, fill);
      const li = createElement('li', { className: 'step' }, body, connector);
      return { li, body, icon, iconInner, ring, ringPath, titleText, subtitle, desc, srStatus, connector };
    });
    this._list.replaceChildren(...this._items.map((x) => x.li));
  }

  _syncLayout() {
    const dir = this._direction;
    this._list.className = [
      'steps',
      `steps--${dir}`,
      `steps--${this._type}`,
      `steps--${this.size === 'sm' ? 'sm' : 'md'}`,
      this._labelVertical ? 'steps--label-vertical' : '',
      this.clickable ? 'steps--clickable' : '',
      this.noAnimation ? 'steps--no-animation' : '',
    ].filter(Boolean).join(' ');
    this._list.setAttribute('aria-label', this.getAttribute('aria-label') || tr('label'));
    this.setState('vertical', dir === 'vertical');
  }

  /** Vá trạng thái / chữ / icon từng bước (chạy mỗi lần cập nhật — rẻ) */
  _syncItems() {
    const type = this._type;
    const current = Number(this.current) || 0;
    const total = this._items.length;
    const hasPercent = this.percent !== null && this.percent !== undefined && !Number.isNaN(Number(this.percent));
    // Ô nhận Tab (roving): bước hiện tại, không bấm được thì bước bấm được đầu tiên
    const focusIndex = this._focusableIndex(current);

    this._items.forEach((item, i) => {
      const step = this._steps[i];
      const status = this._statusOf(step, i);
      const active = i === current;
      const disabled = Boolean(step.disabled);
      const last = i === total - 1;
      const customIcon = type !== 'dot' && step.icon;

      item.li.className = [
        'step', `step--${status}`, active ? 'step--active' : '', disabled ? 'step--disabled' : '',
        last ? 'step--last' : '', customIcon ? 'step--custom-icon' : '',
      ].filter(Boolean).join(' ');
      item.li.setAttribute('part', ['item', `item-${status}`, active ? 'item-active' : ''].filter(Boolean).join(' '));
      if (active) item.li.setAttribute('aria-current', 'step');
      else item.li.removeAttribute('aria-current');

      // Chữ
      item.titleText.textContent = step.title || '';
      item.subtitle.textContent = step.subTitle || '';
      item.subtitle.hidden = !step.subTitle;
      item.desc.textContent = step.description || '';
      item.desc.hidden = !step.description;
      item.srStatus.textContent = ` (${tr(status)})`;

      // Icon: chấm | icon riêng | ✓ (xong) | ✕ (lỗi) | số thứ tự
      let name = '';
      if (type !== 'dot') {
        if (customIcon) name = step.icon;
        else if (status === 'finish') name = 'check';
        else if (status === 'error') name = 'close';
      }
      const prev = item.iconInner.firstChild;
      if (name) {
        if (prev?.localName === 'hui-icon') prev.setAttribute('name', name);
        else item.iconInner.replaceChildren(createElement('hui-icon', { name }));
      } else {
        item.iconInner.textContent = type === 'dot' ? '' : String(i + 1);
      }

      // Vòng tiến độ quanh bước hiện tại
      const ring = hasPercent && active && type === 'default' && status === 'process';
      item.ring.style.display = ring ? '' : 'none';
      if (ring) item.ringPath.setAttribute('stroke-dasharray', `${clamp(this.percent)} 100`);

      item.connector.hidden = last;

      // Nút bấm
      if (item.body.localName === 'button') {
        item.body.disabled = disabled;
        item.body.tabIndex = i === focusIndex ? 0 : -1;
        item.body.setAttribute('aria-label', tr('stepLabel', { index: i + 1, title: step.title || '' }) +
          (ring ? ` (${Math.round(clamp(this.percent))}%)` : ''));
      }
    });
  }

  _focusableIndex(current) {
    const ok = (i) => this._steps[i] && !this._steps[i].disabled;
    if (ok(current)) return current;
    return this._steps.findIndex((s) => !s.disabled);
  }

  // =====================================================
  // TƯƠNG TÁC
  // =====================================================

  _onClick(e) {
    const btn = e.target.closest?.('button[data-index]');
    if (!btn || btn.disabled || !this.clickable) return;
    this._select(Number(btn.dataset.index));
  }

  _select(index) {
    const previous = Number(this.current) || 0;
    if (index === previous || this._steps[index]?.disabled) return;
    this.current = index;
    this.emit('change', { current: index, previous });
  }

  /** Mũi tên di chuyển focus giữa các bước bấm được, Home/End về đầu/cuối; Enter/Space = chọn (nút native) */
  _onKeydown(e) {
    const btn = e.target.closest?.('button[data-index]');
    if (!btn) return;
    const buttons = this._items.map((x) => x.body).filter((b) => !b.disabled);
    const index = buttons.indexOf(btn);
    let target = null;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp': target = buttons[(index - 1 + buttons.length) % buttons.length]; break;
      case 'ArrowRight':
      case 'ArrowDown': target = buttons[(index + 1) % buttons.length]; break;
      case 'Home': target = buttons[0]; break;
      case 'End': target = buttons[buttons.length - 1]; break;
      default: return;
    }
    e.preventDefault();
    if (!target) return;
    for (const b of buttons) b.tabIndex = b === target ? 0 : -1;
    target.focus();
  }

  /** Bước kế tiếp / trước đó (tiện cho wizard) */
  next() {
    if (this.current < this._items.length - 1) this.current = (Number(this.current) || 0) + 1;
  }

  prev() {
    if (this.current > 0) this.current = (Number(this.current) || 0) - 1;
  }
}

defineElement('hui-steps', HuiSteps);

export default HuiSteps;
