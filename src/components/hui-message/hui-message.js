/**
 * HUI Message — Thông báo ngắn ở giữa phía trên màn hình (Ant message + MUI Snackbar)
 *   import { message } from 'hui-lib/hui-message';
 *   const close = message.loading('Đang lưu...', { key: 'save', duration: 0 });
 *   await api.save();
 *   message.success('Đã lưu', { key: 'save' });   // cùng key → cập nhật thông báo cũ
 * Container <hui-message-container> tự gắn vào <body> ở lần gọi đầu, nằm trên top-layer (trên cả Modal).
 * Biến CSS: xem đầu hui-message.css.
 */

import styles from './hui-message.css?raw';
import { HuiElement, defineElement } from '../../core/hui-element.js';
import { createElement } from '../../utils/dom.js';
import { animateIn, animateOut, collapse } from '../../utils/motion.js';
import { PausableTimer, createHandle, raiseTopLayer, hideTopLayer, setContent } from './toast-core.js';
import '../hui-icon/hui-icon.js';

const TYPES = ['info', 'success', 'error', 'warning', 'loading'];

/** Cấu hình toàn cục — message.config() */
const settings = { top: null, maxCount: 0, duration: 3 };
let uid = 0;

/**
 * Container chứa các message (không cần tự đặt vào trang — dùng hàm `message.*`).
 * @csspart list - Danh sách message (aria-live="polite")
 * @csspart notice - Khung một message (kèm notice-<type>)
 * @csspart icon - Icon trạng thái
 * @csspart content - Nội dung
 * @cssprop --hui-message-top - Khoảng cách tới mép trên (message.config({ top }) ưu tiên hơn)
 * @cssprop --hui-message-gap - Khoảng cách giữa các message
 * @cssprop --hui-message-bg - Nền
 * @cssprop --hui-message-color - Màu chữ
 * @cssprop --hui-message-radius - Bo góc
 * @cssprop --hui-message-shadow - Đổ bóng
 * @cssprop --hui-message-padding - Padding
 * @cssprop --hui-message-font-size - Cỡ chữ
 * @cssprop --hui-message-icon-size - Kích thước icon
 */
class HuiMessageContainer extends HuiElement {
  static styles = styles;

  constructor() {
    super();
    /** @type {Map<string, object>} key → bản ghi message đang hiển thị */
    this._records = new Map();
  }

  render() {
    this._list = createElement('div', { className: 'list', part: 'list', role: 'status', 'aria-live': 'polite' });
    return this._list;
  }

  updated() {
    // Áp cấu hình top (nếu có) — biến nội bộ, ưu tiên hơn --hui-message-top
    this._applyConfig();
  }

  _applyConfig() {
    const { top } = settings;
    if (top === null || top === undefined) this.style.removeProperty('--_message-top');
    else this.style.setProperty('--_message-top', typeof top === 'number' ? `${top}px` : String(top));
  }

  /** Mở mới hoặc cập nhật (cùng key) một message. Trả về bản ghi. */
  _open(opts) {
    const key = opts.key !== undefined && opts.key !== null ? String(opts.key) : `hui-message-${++uid}`;
    const existing = this._records.get(key);
    if (existing && !existing.closing) {
      this._patch(existing, opts);
      existing.timer.start(existing.duration);
      raiseTopLayer(this);
      return existing;
    }

    const record = this._create(key, opts);
    this._records.set(key, record);

    // Vượt maxCount → đóng các message cũ nhất
    const max = settings.maxCount;
    if (max > 0) {
      const alive = [...this._records.values()].filter((r) => !r.closing);
      alive.slice(0, Math.max(0, alive.length - max)).forEach((r) => r.close());
    }

    raiseTopLayer(this);
    this._list.append(record.wrap);
    animateIn(record.el, 'slide-down');
    collapse(record.wrap, true);
    record.timer.start(record.duration);
    return record;
  }

  _create(key, opts) {
    const icon = createElement('hui-icon', { className: 'icon', part: 'icon' });
    const content = createElement('span', { className: 'content', part: 'content' });
    const el = createElement('div', { className: 'notice' }, icon, content);
    const wrap = createElement('div', { className: 'wrap' }, el);

    const record = { key, el, wrap, icon, content, closing: false };
    record.promise = new Promise((resolve) => { record.resolve = resolve; });
    record.timer = new PausableTimer(() => record.close());
    record.close = () => this._close(record);

    // Rê chuột vào → dừng đếm giờ
    el.addEventListener('mouseenter', () => record.timer.pause());
    el.addEventListener('mouseleave', () => record.timer.resume());
    el.addEventListener('click', (e) => record.onClick?.(e));

    this._patch(record, opts);
    return record;
  }

  /** Ghi nội dung / kiểu / thời lượng mới lên bản ghi */
  _patch(record, opts) {
    const type = TYPES.includes(opts.type) ? opts.type : 'info';
    record.type = type;
    record.duration = opts.duration ?? settings.duration;
    record.onClose = opts.onClose;
    record.onClick = opts.onClick;

    record.el.className = `notice notice--${type}`;
    record.el.setAttribute('part', `notice notice-${type}`);
    if (opts.className) record.el.classList.add(...String(opts.className).split(/\s+/).filter(Boolean));

    const iconName = opts.icon ?? type;
    record.icon.hidden = iconName === false || iconName === 'none';
    if (!record.icon.hidden) record.icon.setAttribute('name', iconName);
    record.icon.toggleAttribute('spin', type === 'loading' && opts.icon === undefined);
    setContent(record.content, opts.content);
  }

  async _close(record) {
    if (record.closing) return;
    record.closing = true;
    record.timer.stop();
    if (this._records.get(record.key) === record) this._records.delete(record.key);

    const { el, wrap } = record;
    const done = Promise.all([animateOut(el, 'slide-down'), collapse(wrap, false)]);
    // collapse() đã đo chiều cao → giữ 0 sau khi animation kết thúc, tránh nháy lại 1 frame
    wrap.style.height = '0px';
    await done;
    wrap.remove();

    record.onClose?.();
    record.resolve(true);
    if (!this._list.children.length) hideTopLayer(this);
  }

  /** Đóng một (theo key) hoặc tất cả message */
  _destroy(key) {
    if (key !== undefined && key !== null) {
      this._records.get(String(key))?.close();
      return;
    }
    [...this._records.values()].forEach((r) => r.close());
  }
}

defineElement('hui-message-container', HuiMessageContainer);

// =====================================================
// API GỌI BẰNG HÀM
// =====================================================

let container = null;

function getContainer() {
  if (!container || !container.isConnected) {
    container = document.querySelector('hui-message-container') || document.createElement('hui-message-container');
    if (!container.isConnected) document.body.appendChild(container);
  }
  return container;
}

/**
 * Chuẩn hóa tham số kiểu Ant: (content, duration?, onClose?) | (content, { duration, key, ... }) | ({ content, ... })
 */
function normalize(type, content, options, onClose) {
  let opts;
  if (content && typeof content === 'object' && !(content instanceof Node)) opts = { ...content };
  else if (typeof options === 'number') opts = { content, duration: options, onClose };
  else opts = { ...(options || {}), content };
  if (type) opts.type = type;
  return opts;
}

function open(opts) {
  return createHandle(getContainer()._open(opts));
}

/**
 * @typedef {object} MessageOptions
 * @property {string|Node} [content] - Nội dung (chuỗi được chèn dạng text, không phải HTML)
 * @property {number} [duration=3] - Số giây trước khi tự đóng; 0 = không tự đóng
 * @property {string} [key] - Cùng key → cập nhật message đang hiển thị thay vì tạo mới
 * @property {string|false} [icon] - Tên icon thay icon mặc định; false = ẩn icon
 * @property {string} [className] - Class thêm vào khung message (style qua ::part(notice))
 * @property {Function} [onClose] - Gọi sau khi message đóng hẳn
 * @property {Function} [onClick] - Click vào message
 */

/**
 * Hàm hiển thị message. Mỗi hàm trả về `close()` — đồng thời là thenable (await → message đã đóng).
 */
export const message = {
  /** @param {MessageOptions & { type?: 'info'|'success'|'error'|'warning'|'loading' }} opts */
  open: (opts = {}) => open({ ...opts }),
  info: (content, options, onClose) => open(normalize('info', content, options, onClose)),
  success: (content, options, onClose) => open(normalize('success', content, options, onClose)),
  error: (content, options, onClose) => open(normalize('error', content, options, onClose)),
  warning: (content, options, onClose) => open(normalize('warning', content, options, onClose)),
  /** Mặc định vẫn tự đóng sau `duration` — truyền { duration: 0 } để giữ tới khi cập nhật cùng key */
  loading: (content, options, onClose) => open(normalize('loading', content, options, onClose)),

  /**
   * Cấu hình toàn cục.
   * @param {{ top?: number|string, maxCount?: number, duration?: number }} cfg
   */
  config(cfg = {}) {
    if ('top' in cfg) settings.top = cfg.top;
    if ('maxCount' in cfg) settings.maxCount = Number(cfg.maxCount) || 0;
    if ('duration' in cfg) settings.duration = Number(cfg.duration) || 0;
    if (container?.isConnected) container._applyConfig();
  },

  /** Đóng message theo key, hoặc tất cả khi không truyền key */
  destroy(key) {
    container?._destroy(key);
  },
};

export default HuiMessageContainer;
