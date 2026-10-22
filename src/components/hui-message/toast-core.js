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

// =====================================================
// ĐẶT CONTAINER VÀO MODAL ĐANG MỞ
// showModal() làm mọi thứ NGOÀI dialog bị inert — kể cả popover nằm trên nó ở top-layer → nút trên
// thông báo không bấm được. Cách xử lý: khi có modal đang mở, chuyển container vào trong <dialog> trên cùng
// (con trực tiếp của dialog, kể cả dialog trong Shadow DOM của hui-modal/hui-drawer) → không còn inert;
// modal đóng (mất attribute open) → chuyển về modal kế tiếp hoặc <body>.
// =====================================================

/** host → { shown, observer, dialog } */
const placement = new WeakMap();
/** Mọi container đã từng hiện (có thể nằm trong Shadow DOM của modal → querySelector không thấy) */
const hosts = new Set();

const stateOf = (host) => {
  let s = placement.get(host);
  if (!s) placement.set(host, (s = { shown: false, observer: null, dialog: null }));
  return s;
};

const isModal = (el) => {
  try { return el.localName === 'dialog' && el.matches(':modal'); } catch { return false; }
};

/** Phần tử đang focus thật sự (đi sâu vào shadowRoot.activeElement) */
function deepActive() {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el;
}

/** Cha theo cây hiển thị (slot → shadow host) */
const flatParent = (n) => n.assignedSlot || n.parentNode || n.host || null;

/**
 * <dialog> modal trên cùng (null nếu không có). Focus luôn nằm trong modal trên cùng vì phần còn lại
 * bị inert → đi ngược từ phần tử đang focus. Focus ở <body> (hiếm) → quét cả Shadow DOM, lấy modal cuối.
 */
export function topModalDialog() {
  const active = deepActive();
  for (let n = active; n; n = flatParent(n)) if (isModal(n)) return n;
  if (active && active !== document.body && active !== document.documentElement) return null;
  let found = null;
  const walk = (root) => {
    for (const el of root.querySelectorAll('*')) {
      if (isModal(el)) found = el;
      if (el.shadowRoot) walk(el.shadowRoot);
    }
  };
  walk(document);
  return found;
}

/** Chuyển host vào modal trên cùng / về <body>. Trả về true nếu đã di chuyển. */
function place(host) {
  const s = stateOf(host);
  const dialog = topModalDialog();
  const parent = dialog || document.body;
  if (host.parentNode === parent) return false;
  // Không di chuyển khi focus đang ở trong thông báo (tránh trình duyệt "sửa focus" về control khác)
  const active = deepActive();
  for (let n = active; n; n = flatParent(n)) if (n === host) return false;

  s.observer?.disconnect();
  s.observer = null;
  s.dialog = dialog;
  s.moving = true;
  parent.append(host);
  s.moving = false;
  if (dialog) {
    // Modal đóng → attribute open bị gỡ đồng bộ → microtask (trước khi vẽ) chuyển host đi tiếp
    s.observer = new MutationObserver(() => {
      if (dialog.open && dialog.isConnected) return;
      if (place(host) && s.shown) showPopover(host);
    });
    s.observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  }
  return true;
}

function showPopover(host) {
  if (!supportsPopover) return;
  if (!host.hasAttribute('popover')) host.setAttribute('popover', 'manual');
  try {
    if (host.matches(':popover-open')) host.hidePopover();
    host.showPopover();
  } catch { /* host chưa gắn vào trang */ }
}

/**
 * Hiện container trên top-layer. Gọi lại mỗi lần có thông báo mới: ẩn rồi hiện lại để đưa container
 * lên TRÊN CÙNG top-layer (phần tử vào top-layer sau nằm trên) → vẫn nằm trên Modal/Drawer mở sau nó.
 * Có modal đang mở → container nằm trong modal đó để bấm được (xem place()).
 * showPopover() của popover="manual" không lấy focus → không cướp focus của nội dung modal.
 */
export function raiseTopLayer(host) {
  hosts.add(host);
  const s = stateOf(host);
  s.shown = true;
  if (host.isConnected) place(host);
  showPopover(host);
}

export function hideTopLayer(host) {
  stateOf(host).shown = false;
  if (supportsPopover && host.matches?.(':popover-open')) host.hidePopover();
}

/**
 * Gọi từ disconnectedCallback của container: modal chứa container bị gỡ khỏi trang khi còn thông báo
 * → gắn lại vào <body> (hoặc modal kế tiếp) để thông báo không biến mất.
 */
export function toastHostDisconnected(host) {
  const s = stateOf(host);
  if (s.moving) return;
  queueMicrotask(() => {
    if (host.isConnected) return;
    s.observer?.disconnect();
    s.observer = null;
    if (!s.shown) return;
    place(host);
    showPopover(host);
  });
}

/**
 * Sự kiện chuột có rơi trên một message / notification đang hiển thị không. Container nằm trong dialog
 * (ngoài panel) → overlay coi là "click ra ngoài"; container còn bị inert (vd: modal mở sau thông báo)
 * → click "xuyên" xuống mask. Modal/Drawer dùng hàm này để không đóng nhầm trong cả hai trường hợp.
 */
export function isPointOnToast(e) {
  if (e?.composedPath?.().some((n) => hosts.has(n))) return true;
  if (typeof e?.clientX !== 'number') return false;
  const all = new Set([...hosts, ...document.querySelectorAll('hui-message-container, hui-notification-container')]);
  for (const host of all) {
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
