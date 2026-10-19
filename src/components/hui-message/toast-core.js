/**
 * Phần lõi dùng chung cho message + notification (thông báo gọi bằng hàm):
 * hẹn giờ tự đóng có tạm dừng, handle "đóng được + await được", đưa container lên top-layer.
 */

import { supportsPopover } from '../../utils/floating.js';

/**
 * Hẹn giờ có thể tạm dừng (rê chuột vào thông báo → dừng đếm, rời ra → chạy tiếp phần còn lại).
 * `seconds` <= 0 → không tự đóng.
 */
export class PausableTimer {
  constructor(callback) {
    this._callback = callback;
    this._id = null;
    this._remaining = 0;
    this._startedAt = 0;
  }

  start(seconds) {
    this.stop();
    this._remaining = seconds > 0 ? seconds * 1000 : 0;
    this.resume();
  }

  pause() {
    if (!this._id) return;
    clearTimeout(this._id);
    this._id = null;
    this._remaining -= Date.now() - this._startedAt;
  }

  resume() {
    if (this._id || this._remaining <= 0) return;
    this._startedAt = Date.now();
    this._id = setTimeout(() => {
      this._id = null;
      this._remaining = 0;
      this._callback();
    }, Math.max(0, this._remaining));
  }

  stop() {
    clearTimeout(this._id);
    this._id = null;
  }
}

/**
 * Hàm đóng kiêm thenable: `const close = message.info('...')` → `close()` để đóng,
 * `await close` / `close.then(...)` để chờ tới khi thông báo đóng hẳn.
 */
export function createHandle(record) {
  const close = () => record.close();
  close.then = (onFulfilled, onRejected) => record.promise.then(onFulfilled, onRejected);
  close.key = record.key;
  return close;
}

/**
 * Hiện container trên top-layer. Gọi lại mỗi lần có thông báo mới: ẩn rồi hiện lại để đưa container
 * lên TRÊN CÙNG top-layer (phần tử vào top-layer sau nằm trên) → vẫn nằm trên Modal/Drawer mở sau nó.
 */
export function raiseTopLayer(host) {
  if (!supportsPopover) return;
  if (!host.hasAttribute('popover')) host.setAttribute('popover', 'manual');
  try {
    if (host.matches(':popover-open')) host.hidePopover();
    host.showPopover();
  } catch { /* host chưa gắn vào trang */ }
}

export function hideTopLayer(host) {
  if (supportsPopover && host.matches?.(':popover-open')) host.hidePopover();
}

/**
 * Điểm click có nằm trên một message / notification đang hiển thị không.
 * Khi Modal/Drawer mở bằng showModal(), mọi thứ ngoài dialog bị inert → click lên thông báo "xuyên" xuống
 * mask của dialog. Modal/Drawer dùng hàm này để không coi đó là click mask (không đóng nhầm).
 */
export function isPointOnToast(e) {
  if (typeof e?.clientX !== 'number') return false;
  for (const host of document.querySelectorAll('hui-message-container, hui-notification-container')) {
    for (const notice of host.shadowRoot?.querySelectorAll('.notice') || []) {
      const r = notice.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return true;
    }
  }
  return false;
}

/** Nội dung truyền vào: chuỗi → text node (an toàn, không chèn HTML), Node → dùng nguyên */
export function setContent(target, value) {
  target.replaceChildren();
  if (value === null || value === undefined || value === '') return false;
  target.append(value instanceof Node ? value : document.createTextNode(String(value)));
  return true;
}
