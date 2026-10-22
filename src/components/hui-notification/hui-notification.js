/**
 * HUI Notification — Thông báo ở góc màn hình (Ant notification + MUI Snackbar có tiêu đề)
 *   import { notification } from '@itmrhoang/h-ui/hui-notification';
 *   notification.success({ title: 'Đã lưu', description: 'Thay đổi đã được ghi lại.' });
 *   notification.open({ title: 'Có bản cập nhật', duration: 0, actions: [{ label: 'Tải lại', onClick: (close) => location.reload() }] });
 * Container <hui-notification-container> tự gắn vào <body> ở lần gọi đầu, nằm trên top-layer;
 * đang mở Modal/Drawer thì chuyển vào <dialog> của modal để nút bấm được (xem hui-message/toast-core.js).
 * Biến CSS: xem đầu hui-notification.css.
 */

import styles from './hui-notification.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { t } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { animateIn, animateOut, collapse } from '../../utils/motion.js';
import { PausableTimer, createHandle, raiseTopLayer, hideTopLayer, toastHostDisconnected, setContent } from '../hui-message/toast-core.js';
import '../hui-icon/hui-icon.js';
import '../hui-button/hui-button.js';

const TYPES = ['info', 'success', 'error', 'warning'];
const PLACEMENTS = ['topRight', 'topLeft', 'bottomRight', 'bottomLeft', 'top', 'bottom'];

/** Hiệu ứng vào/ra theo phía xuất hiện */
const MOTION = {
  topRight: 'move-right', bottomRight: 'move-right',
  topLeft: 'move-left', bottomLeft: 'move-left',
  top: 'slide-down', bottom: 'slide-up',
};

/** Cấu hình toàn cục — notification.config() */
const settings = { placement: 'topRight', duration: 4.5, maxCount: 0, top: null, bottom: null };
let uid = 0;

/** Chấp nhận cả kiểu kebab: 'top-right' → 'topRight' */
function normalizePlacement(p) {
  const camel = String(p || '').replace(/-([a-z])/g, (m, c) => c.toUpperCase());
  return PLACEMENTS.includes(camel) ? camel : settings.placement;
}

/**
 * Container chứa thông báo (không cần tự đặt vào trang — dùng hàm `notification.*`).
 * @csspart stack - Cột thông báo của một vị trí (kèm stack-<placement>)
 * @csspart notice - Khung một thông báo (kèm notice-<type>)
 * @csspart icon - Icon trạng thái
 * @csspart main - Vùng tiêu đề + mô tả + hành động
 * @csspart title - Tiêu đề
 * @csspart description - Mô tả
 * @csspart actions - Vùng nút hành động
 * @csspart close - Nút đóng
 * @cssprop --hui-notification-width - Chiều rộng (384px)
 * @cssprop --hui-notification-offset - Khoảng cách tới mép ngang (24px)
 * @cssprop --hui-notification-top - Khoảng cách tới mép trên (config ưu tiên hơn)
 * @cssprop --hui-notification-bottom - Khoảng cách tới mép dưới (config ưu tiên hơn)
 * @cssprop --hui-notification-gap - Khoảng cách giữa các thông báo
 * @cssprop --hui-notification-bg - Nền
 * @cssprop --hui-notification-color - Màu chữ mô tả
 * @cssprop --hui-notification-title-color - Màu tiêu đề
 * @cssprop --hui-notification-radius - Bo góc
 * @cssprop --hui-notification-shadow - Đổ bóng
 * @cssprop --hui-notification-padding - Padding
 * @cssprop --hui-notification-icon-size - Kích thước icon trạng thái
 */
class HuiNotificationContainer extends HuiElement {
  static styles = styles;

  static localized = true;

  constructor() {
    super();
    /** @type {Map<string, object>} */
    this._records = new Map();
    this._stacks = {};
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Modal chứa container bị gỡ khi còn thông báo → gắn lại vào trang
    toastHostDisconnected(this);
  }

  render() {
    return PLACEMENTS.map((p) => {
      this._stacks[p] = createElement('div', {
        className: `stack stack--${p}`,
        part: `stack stack-${p}`,
        'aria-live': 'polite',
      });
      return this._stacks[p];
    });
  }

  updated(changed) {
    this._applyConfig();
    if (changed.has('locale')) {
      for (const r of this._records.values()) r.closeBtn.setAttribute('aria-label', t('common.close'));
    }
  }

  _applyConfig() {
    for (const side of ['top', 'bottom']) {
      const v = settings[side];
      if (v === null || v === undefined) this.style.removeProperty(`--_notif-${side}`);
      else this.style.setProperty(`--_notif-${side}`, typeof v === 'number' ? `${v}px` : String(v));
    }
  }

  _open(opts) {
    const key = opts.key !== undefined && opts.key !== null ? String(opts.key) : `hui-notification-${++uid}`;
    const existing = this._records.get(key);
    if (existing && !existing.closing) {
      this._patch(existing, opts);
      existing.timer.start(existing.duration);
      raiseTopLayer(this);
      return existing;
    }

    const record = this._create(key, opts);
    this._records.set(key, record);

    const max = settings.maxCount;
    if (max > 0) {
      const alive = [...this._records.values()].filter((r) => !r.closing);
      alive.slice(0, Math.max(0, alive.length - max)).forEach((r) => r.close());
    }

    raiseTopLayer(this);
    // Vị trí phía trên: thông báo mới nằm trên cùng; phía dưới: mới nằm dưới cùng (sát mép)
    const stack = this._stacks[record.placement];
    if (record.placement.startsWith('top')) stack.prepend(record.wrap);
    else stack.append(record.wrap);
    animateIn(record.el, MOTION[record.placement]);
    collapse(record.wrap, true);
    record.timer.start(record.duration);
    return record;
  }

  _create(key, opts) {
    const icon = createElement('hui-icon', { className: 'icon', part: 'icon' });
    const title = createElement('div', { className: 'title', part: 'title' });
    const description = createElement('div', { className: 'description', part: 'description' });
    const actions = createElement('div', { className: 'actions', part: 'actions' });
    const main = createElement('div', { className: 'main', part: 'main' }, title, description, actions);
    const closeBtn = createElement('button', {
      type: 'button', className: 'close', part: 'close', 'aria-label': t('common.close'),
    }, createElement('hui-icon', { name: 'close' }));
    const el = createElement('div', { className: 'notice' }, icon, main, closeBtn);
    const wrap = createElement('div', { className: 'wrap' }, el);

    const record = {
      key, el, wrap, icon, title, description, actions, closeBtn, closing: false,
      placement: normalizePlacement(opts.placement),
    };
    record.promise = new Promise((resolve) => { record.resolve = resolve; });
    record.timer = new PausableTimer(() => record.close());
    record.close = () => this._close(record);

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      record.close();
    });
    // Rê chuột / focus vào → dừng đếm giờ (đủ thời gian đọc và bấm nút)
    el.addEventListener('mouseenter', () => record.timer.pause());
    el.addEventListener('mouseleave', () => record.timer.resume());
    el.addEventListener('focusin', () => record.timer.pause());
    el.addEventListener('focusout', () => record.timer.resume());
    el.addEventListener('click', (e) => record.onClick?.(e));

    this._patch(record, opts);
    return record;
  }

  _patch(record, opts) {
    const type = TYPES.includes(opts.type) ? opts.type : null;
    record.duration = opts.duration ?? settings.duration;
    record.onClose = opts.onClose;
    record.onClick = opts.onClick;

    record.el.className = ['notice', type ? `notice--${type}` : '', opts.onClick ? 'notice--clickable' : ''].filter(Boolean).join(' ');
    record.el.setAttribute('part', type ? `notice notice-${type}` : 'notice');
    if (opts.className) record.el.classList.add(...String(opts.className).split(/\s+/).filter(Boolean));
    // Lỗi / cảnh báo → đọc ngay; còn lại theo vùng aria-live="polite" của stack
    if (type === 'error' || type === 'warning') record.el.setAttribute('role', 'alert');
    else record.el.removeAttribute('role');

    const iconName = opts.icon ?? type;
    record.icon.hidden = !iconName || iconName === 'none';
    if (!record.icon.hidden) record.icon.setAttribute('name', iconName);

    record.title.hidden = !setContent(record.title, opts.title ?? opts.message);
    record.description.hidden = !setContent(record.description, opts.description);
    record.closeBtn.hidden = opts.closable === false;

    record.actions.replaceChildren();
    const list = Array.isArray(opts.actions) ? opts.actions : [];
    for (const action of list) {
      const btn = createElement('hui-button', { size: 'sm', variant: action.variant || 'primary' }, action.label ?? '');
      btn.addEventListener('hui-click', (e) => {
        e.stopPropagation();
        action.onClick?.(record.close, e);
      });
      record.actions.append(btn);
    }
    record.actions.hidden = list.length === 0;
  }

  async _close(record) {
    if (record.closing) return;
    record.closing = true;
    record.timer.stop();
    if (this._records.get(record.key) === record) this._records.delete(record.key);

    const { el, wrap } = record;
    const done = Promise.all([animateOut(el, MOTION[record.placement]), collapse(wrap, false)]);
    wrap.style.height = '0px';
    await done;
    wrap.remove();

    record.onClose?.();
    record.resolve(true);
    if (!Object.values(this._stacks).some((s) => s.children.length)) hideTopLayer(this);
  }

  _destroy(key) {
    if (key !== undefined && key !== null) {
      this._records.get(String(key))?.close();
      return;
    }
    [...this._records.values()].forEach((r) => r.close());
  }
}

defineElement('hui-notification-container', HuiNotificationContainer);

// =====================================================
// API GỌI BẰNG HÀM
// =====================================================

let container = null;

function getContainer() {
  // Giữ nguyên container cũ (kể cả khi vừa bị tháo cùng modal chứa nó) → không sinh container thứ hai
  if (!container) container = document.querySelector('hui-notification-container') || document.createElement('hui-notification-container');
  if (!container.isConnected) document.body.appendChild(container);
  return container;
}

/**
 * @typedef {object} NotificationAction
 * @property {string} label - Chữ trên nút
 * @property {string} [variant='primary'] - Variant của hui-button
 * @property {(close: Function, event: Event) => void} [onClick] - Gọi close() để đóng thông báo
 */

/**
 * @typedef {object} NotificationOptions
 * @property {string|Node} [title] - Tiêu đề (alias kiểu Ant v4: message)
 * @property {string|Node} [description] - Mô tả
 * @property {number} [duration=4.5] - Số giây tự đóng; 0 = không tự đóng
 * @property {'topRight'|'topLeft'|'bottomRight'|'bottomLeft'|'top'|'bottom'} [placement='topRight']
 * @property {string} [key] - Cùng key → cập nhật thông báo đang hiển thị
 * @property {NotificationAction[]} [actions] - Các nút hành động
 * @property {string} [icon] - Tên icon thay icon theo type
 * @property {boolean} [closable=true] - false = ẩn nút đóng
 * @property {string} [className] - Class thêm vào khung thông báo
 * @property {Function} [onClose] - Gọi sau khi đóng hẳn
 * @property {Function} [onClick] - Click vào thông báo
 */

const open = (opts = {}) => createHandle(getContainer()._open(opts));
const typed = (type) => (opts = {}) => open({ ...opts, type });

/** Hàm hiển thị thông báo. Mỗi hàm trả về `close()` — đồng thời là thenable (await → đã đóng). */
export const notification = {
  /** @param {NotificationOptions & { type?: 'info'|'success'|'error'|'warning' }} opts */
  open,
  success: typed('success'),
  error: typed('error'),
  warning: typed('warning'),
  info: typed('info'),

  /**
   * Cấu hình toàn cục.
   * @param {{ placement?: string, duration?: number, maxCount?: number, top?: number|string, bottom?: number|string }} cfg
   */
  config(cfg = {}) {
    if (cfg.placement) settings.placement = normalizePlacement(cfg.placement);
    if ('duration' in cfg) settings.duration = Number(cfg.duration) || 0;
    if ('maxCount' in cfg) settings.maxCount = Number(cfg.maxCount) || 0;
    if ('top' in cfg) settings.top = cfg.top;
    if ('bottom' in cfg) settings.bottom = cfg.bottom;
    if (container?.isConnected) container._applyConfig();
  },

  /** Đóng thông báo theo key, hoặc tất cả khi không truyền key */
  destroy(key) {
    container?._destroy(key);
  },

  /** Alias của destroy(key) */
  close(key) {
    if (key !== undefined && key !== null) container?._destroy(key);
  },
};

export default HuiNotificationContainer;
