/**
 * Overlay manager — quản lý các lớp nổi (Modal, Drawer, Dropdown, Popover, Image preview...).
 *
 *   const handle = openOverlay({
 *     element: panelEl,                // vùng nội dung của lớp nổi
 *     ignore: [triggerEl],             // click vào đây không tính là "click ra ngoài"
 *     onEscape: () => close(),         // phím Esc
 *     onClickOutside: () => close(),
 *     trapFocus: true,                 // Tab chỉ chạy vòng trong panel (Modal/Drawer)
 *     lockScroll: true,                // khóa cuộn trang
 *     restoreFocus: true,              // đóng xong trả focus về phần tử cũ
 *   });
 *   handle.close();
 *
 * Nhiều lớp chồng nhau (Modal mở Dropdown): chỉ lớp TRÊN CÙNG nhận Esc / click ngoài / focus trap.
 * Lưu ý: khi có lớp đang mở, phím Esc bị chặn (stopPropagation, capture ở document) để không đóng nhầm
 * lớp bên dưới → component KHÔNG đăng ký overlay mà muốn nghe Esc thì lắng nghe ở window (capture).
 * Mọi xử lý đi theo composedPath() nên hoạt động đúng xuyên Shadow DOM.
 */

/** @type {Array<object>} ngăn xếp overlay, phần tử cuối = trên cùng */
const stack = [];
let listening = false;
let scrollLocks = 0;
let savedBodyStyle = null;

// =====================================================
// FOCUS — tìm phần tử focus được, xuyên qua Shadow DOM
// =====================================================

const FOCUSABLE = 'a[href], area[href], button, input, select, textarea, iframe, summary, [contenteditable=""], [contenteditable="true"], [tabindex]';

function isVisible(el) {
  if (typeof el.checkVisibility === 'function') return el.checkVisibility({ visibilityProperty: true });
  return el.getClientRects().length > 0;
}

function isTabbable(el) {
  if (!el.matches?.(FOCUSABLE)) return false;
  if (el.disabled || el.getAttribute('tabindex') === '-1' || el.closest('[inert]')) return false;
  if (el.tagName === 'INPUT' && el.type === 'hidden') return false;
  return isVisible(el);
}

/**
 * Danh sách phần tử Tab tới được trong `root` theo thứ tự hiển thị,
 * đi xuyên shadowRoot của custom element và nội dung được gán vào <slot>.
 */
export function getTabbables(root) {
  const out = [];
  const walk = (node) => {
    for (const child of node.children || []) {
      if (child.tagName === 'SLOT') {
        for (const assigned of child.assignedElements({ flatten: true })) visit(assigned);
        if (!child.assignedElements().length) walk(child); // fallback content
        continue;
      }
      visit(child);
    }
  };
  const visit = (el) => {
    if (isTabbable(el)) out.push(el);
    if (el.shadowRoot) walk(el.shadowRoot);
    else walk(el);
  };
  // Có shadowRoot thì con light DOM đã được duyệt qua <slot> — không duyệt lại lần nữa
  walk(root.shadowRoot || root);
  return out;
}

/** Phần tử đang focus thật sự (đi sâu vào shadowRoot.activeElement) */
export function getDeepActiveElement() {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el;
}

/** `node` có nằm trong `container` không — tính cả Shadow DOM lẫn slot */
function containsDeep(container, node) {
  for (let n = node; n; n = n.assignedSlot || n.parentNode || n.host) {
    if (n === container) return true;
  }
  return false;
}

// =====================================================
// KHÓA CUỘN TRANG
// =====================================================

function lockBodyScroll() {
  if (scrollLocks++ > 0) return;
  const body = document.body;
  // Bù độ rộng thanh cuộn để trang không bị "giật" sang phải khi ẩn scrollbar
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  savedBodyStyle = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  body.style.overflow = 'hidden';
  if (scrollbar > 0) {
    const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${current + scrollbar}px`;
  }
}

function unlockBodyScroll() {
  if (scrollLocks === 0 || --scrollLocks > 0) return;
  Object.assign(document.body.style, savedBodyStyle);
  savedBodyStyle = null;
}

// =====================================================
// LISTENER TOÀN CỤC (chỉ gắn 1 lần, phục vụ lớp trên cùng)
// =====================================================

function top() {
  return stack[stack.length - 1];
}

function onKeydown(e) {
  const layer = top();
  if (!layer) return;

  if (e.key === 'Escape' && layer.onEscape) {
    e.stopPropagation();
    layer.onEscape(e);
    return;
  }

  if (e.key === 'Tab' && layer.trapFocus) {
    const items = getTabbables(layer.element);
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const active = getDeepActiveElement();
    const index = items.indexOf(active);
    // Đi vòng: cuối → đầu (Tab), đầu → cuối (Shift+Tab), focus đang ở ngoài → kéo vào trong
    if (e.shiftKey && (index <= 0)) {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (!e.shiftKey && (index === -1 || index === items.length - 1)) {
      e.preventDefault();
      items[0].focus();
    }
  }
}

function onPointerDown(e) {
  const layer = top();
  if (!layer?.onClickOutside) return;
  const path = e.composedPath();
  const inside = path.includes(layer.element) || layer.ignore.some((el) => path.includes(el));
  if (!inside) layer.onClickOutside(e);
}

/** Focus chạy ra ngoài lớp có trapFocus (vd: click chuột vào vùng ngoài) → kéo lại */
function onFocusIn(e) {
  const layer = top();
  if (!layer?.trapFocus) return;
  const target = e.composedPath()[0];
  if (!containsDeep(layer.element, target)) {
    (getTabbables(layer.element)[0] || layer.element).focus?.();
  }
}

function ensureListeners() {
  if (listening) return;
  listening = true;
  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('focusin', onFocusIn, true);
}

function removeListenersIfIdle() {
  if (stack.length || !listening) return;
  listening = false;
  document.removeEventListener('keydown', onKeydown, true);
  document.removeEventListener('pointerdown', onPointerDown, true);
  document.removeEventListener('focusin', onFocusIn, true);
}

// =====================================================
// API
// =====================================================

/**
 * Mở một lớp nổi. Trả về handle: { close(), isTop(), zIndex }.
 * zIndex tăng dần theo thứ tự mở → lớp mở sau luôn nằm trên (khi không dùng top-layer).
 */
export function openOverlay({
  element,
  ignore = [],
  onEscape = null,
  onClickOutside = null,
  trapFocus = false,
  lockScroll = false,
  restoreFocus = true,
  autoFocus = true,
}) {
  ensureListeners();

  const layer = {
    element,
    ignore,
    onEscape,
    onClickOutside,
    trapFocus,
    lockScroll,
    previousFocus: restoreFocus ? getDeepActiveElement() : null,
    zIndex: 1000 + stack.length * 10,
    closed: false,
  };
  stack.push(layer);
  if (lockScroll) lockBodyScroll();

  if (trapFocus && autoFocus) {
    // Đợi 1 frame để panel kịp hiển thị (animation/hidden → visible) rồi mới focus
    requestAnimationFrame(() => {
      if (layer.closed) return;
      const first = element.querySelector?.('[autofocus]') || getTabbables(element)[0];
      (first || element).focus?.({ preventScroll: true });
    });
  }

  return {
    zIndex: layer.zIndex,
    isTop: () => top() === layer,
    close() {
      if (layer.closed) return;
      layer.closed = true;
      const i = stack.indexOf(layer);
      if (i !== -1) stack.splice(i, 1);
      if (layer.lockScroll) unlockBodyScroll();
      if (layer.previousFocus?.isConnected) layer.previousFocus.focus?.({ preventScroll: true });
      removeListenersIfIdle();
    },
  };
}

/** Số lớp đang mở (tiện cho test / debug) */
export function overlayCount() {
  return stack.length;
}
