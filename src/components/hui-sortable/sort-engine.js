/**
 * Lõi kéo thả sắp xếp dùng chung cho hui-sortable và hui-kanban.
 *
 * "Container" là một vùng chứa item (danh sách / cột):
 *   {
 *     el,                      // phần tử đo vùng nhận thả (getBoundingClientRect)
 *     host,                    // component sở hữu (phát sự kiện)
 *     getGroup(): string|null, // cùng group → kéo qua lại được
 *     axis(): 'y' | 'x' | 'grid',
 *     getItems(): Element[],   // item theo thứ tự hiển thị
 *     insert(item, before),    // đặt item trước `before` (null = cuối danh sách)
 *     accepts?(item, from),    // có nhận item từ container `from` không
 *     animated?(): boolean,
 *     label?(): string,        // tên danh sách (đọc cho trình đọc màn hình)
 *   }
 *
 * Kéo bằng chuột/cảm ứng: item thật nằm lại trong danh sách làm "chỗ trống" (data-hui-sort-placeholder),
 * một bản sao (ghost) bay theo con trỏ trên top-layer. Mỗi lần đổi chỗ chạy FLIP cho các item xung quanh.
 * Bàn phím: startKeyboardSort() — Space nhấc, mũi tên di chuyển, Space/Enter thả, Esc hủy.
 */

import { animationsDisabled } from '../../utils/animate.js';
import { supportsPopover } from '../../utils/floating.js';

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
const FLIP_MS = 200;

/** Mọi container đang gắn trên trang */
const containers = new Set();

export function registerContainer(container) {
  containers.add(container);
  return () => containers.delete(container);
}

/** Các container kéo qua lại được với `c` (cùng group), theo thứ tự trên màn hình */
export function groupContainers(c) {
  const group = c.getGroup?.() || null;
  if (!group) return [c];
  return [...containers]
    .filter((o) => o === c || (o.getGroup?.() || null) === group)
    .filter((o) => o.el.isConnected)
    .sort((a, b) => {
      const ra = a.el.getBoundingClientRect();
      const rb = b.el.getBoundingClientRect();
      // Cột cạnh nhau → trái sang phải; danh sách xếp chồng (cùng mép trái) → trên xuống dưới
      return Math.abs(ra.left - rb.left) > 8 ? ra.left - rb.left : ra.top - rb.top;
    });
}

// =====================================================
// DOM + FLIP
// =====================================================

/**
 * Đặt `node` vào `parent` trước `before`. Dùng moveBefore() (Chrome 133+) khi có:
 * giữ nguyên focus và không gọi lại disconnected/connectedCallback của component bên trong.
 */
export function place(parent, node, before = null) {
  if (node.parentNode === parent && (before ? node.nextSibling === before : !node.nextSibling)) return;
  if (typeof parent.moveBefore === 'function' && node.isConnected && node.getRootNode() === parent.getRootNode()) {
    try {
      parent.moveBefore(node, before);
      return;
    } catch { /* khác root / chưa hỗ trợ → insertBefore */ }
  }
  parent.insertBefore(node, before);
}

const flipAnims = new WeakMap();
/** Vị trí layout (không tính transform của animation FLIP đang chạy) — dùng để dò vị trí thả, tránh rung */
let layoutRects = new WeakMap();

function layoutRect(el) {
  const cached = layoutRects.get(el);
  if (cached && performance.now() < cached.until) return cached.rect;
  return el.getBoundingClientRect();
}

/**
 * FLIP: đo vị trí các phần tử → chạy `mutate()` (đổi DOM) → animate từ chỗ cũ về chỗ mới.
 * @param {Element[]} elements
 * @param {() => void} mutate
 * @param {boolean} animate
 */
export function flipMove(elements, mutate, animate = true) {
  const on = animate && !animationsDisabled();
  const first = on ? new Map(elements.map((el) => [el, el.getBoundingClientRect()])) : null;
  mutate();
  if (!on) return;
  const until = performance.now() + FLIP_MS;
  for (const el of elements) {
    if (!el.isConnected || typeof el.animate !== 'function') continue;
    flipAnims.get(el)?.cancel();
    const last = el.getBoundingClientRect();
    layoutRects.set(el, { rect: last, until });
    const f = first.get(el);
    const dx = f.left - last.left;
    const dy = f.top - last.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    const anim = el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: FLIP_MS, easing: EASE });
    flipAnims.set(el, anim);
  }
}

/** Vị trí chèn trong `others` (danh sách item không gồm item đang kéo) theo tọa độ con trỏ */
function indexAt(others, x, y, axis) {
  for (let i = 0; i < others.length; i++) {
    const r = layoutRect(others[i]);
    if (axis === 'y') {
      if (y < r.top + r.height / 2) return i;
    } else if (axis === 'x') {
      if (x < r.left + r.width / 2) return i;
    } else {
      // Lưới / hàng tự xuống dòng: hàng phía trên con trỏ → chèn trước; cùng hàng → so theo nửa chiều ngang
      if (y < r.top) return i;
      if (y <= r.bottom && x < r.left + r.width / 2) return i;
    }
  }
  return others.length;
}

/** Item của container trừ item đang kéo */
const othersOf = (c, item) => c.getItems().filter((i) => i !== item);

/** Chuyển `item` vào container `to` ở vị trí `index` (tính trong danh sách không gồm item), có FLIP */
export function moveItem(item, from, to, index, animate = true) {
  const targets = othersOf(to, item);
  const affected = new Set([...from.getItems(), ...targets, item]);
  flipMove([...affected], () => to.insert(item, targets[index] || null), animate);
}

const isAnimated = (c) => (c.animated ? c.animated() : true) && !animationsDisabled();

// =====================================================
// LIVE REGION
// =====================================================

/** Đọc thông báo qua live region (xóa rồi gán lại để trình đọc màn hình đọc cả khi trùng chữ) */
export function announce(region, text) {
  if (!region) return;
  region.textContent = '';
  setTimeout(() => {
    region.textContent = text;
  }, 30);
}

/** Nhãn ngắn của item để đọc: aria-label → data-sort-label → chữ hiển thị (cắt 60 ký tự) */
export function itemLabel(item) {
  const raw = item.getAttribute('aria-label') || item.dataset?.sortLabel || item.textContent || '';
  const text = raw.replace(/\s+/g, ' ').trim();
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

// =====================================================
// TỰ CUỘN KHI KÉO SÁT MÉP
// =====================================================

function scrollParents(el) {
  const out = [];
  let n = el;
  while (n && n !== document.documentElement) {
    n = n.assignedSlot || n.parentElement || n.getRootNode?.().host || null;
    if (!n || n === document.body || n === document.documentElement) break;
    const cs = getComputedStyle(n);
    const sx = /(auto|scroll|overlay)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth;
    const sy = /(auto|scroll|overlay)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight;
    if (sx || sy) out.push(n);
  }
  out.push(document.scrollingElement || document.documentElement);
  return out;
}

const EDGE = 48;
const MAX_SPEED = 18;
const speed = (dist) => Math.ceil(MAX_SPEED * Math.min(1, Math.max(0, (EDGE - dist) / EDGE)));

/** Cuộn vùng cuộn gần nhất khi con trỏ sát mép; trả về true nếu đã cuộn */
function autoScroll(el, x, y) {
  for (const s of scrollParents(el)) {
    const isDoc = s === document.scrollingElement || s === document.documentElement;
    const r = isDoc ? { left: 0, top: 0, right: innerWidth, bottom: innerHeight } : s.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
    let dx = 0;
    let dy = 0;
    if (s.scrollWidth > s.clientWidth) {
      if (x - r.left < EDGE) dx = -speed(x - r.left);
      else if (r.right - x < EDGE) dx = speed(r.right - x);
    }
    if (s.scrollHeight > s.clientHeight) {
      if (y - r.top < EDGE) dy = -speed(y - r.top);
      else if (r.bottom - y < EDGE) dy = speed(r.bottom - y);
    }
    if (!dx && !dy) continue;
    const bx = s.scrollLeft;
    const by = s.scrollTop;
    s.scrollLeft += dx;
    s.scrollTop += dy;
    if (s.scrollLeft !== bx || s.scrollTop !== by) return true;
  }
  return false;
}

// =====================================================
// GHOST — bản sao bay theo con trỏ
// =====================================================

const COPY_STYLES = [
  'background-color', 'background-image', 'color', 'font-family', 'font-size', 'font-weight', 'line-height',
  'border-top', 'border-right', 'border-bottom', 'border-left', 'border-radius', 'padding', 'display',
  'flex-direction', 'align-items', 'justify-content', 'gap', 'text-align', 'grid-template-columns',
];

function createGhost(item, rect, tilt) {
  const ghost = item.cloneNode(true);
  for (const n of [ghost, ...ghost.querySelectorAll('[id]')]) n.removeAttribute('id');
  ['slot', 'data-hui-sort-placeholder', 'data-hui-sort-grabbed', 'tabindex', 'popover'].forEach((a) => ghost.removeAttribute(a));
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('data-hui-sort-ghost', '');
  ghost.inert = true;
  const cs = getComputedStyle(item);
  for (const p of COPY_STYLES) {
    const v = cs.getPropertyValue(p);
    if (v && !(p === 'display' && v === 'contents')) ghost.style.setProperty(p, v);
  }
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    right: 'auto',
    bottom: 'auto',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    boxSizing: 'border-box',
    overflow: 'hidden',
    zIndex: '2147483000',
    pointerEvents: 'none',
    opacity: '0.96',
    transition: 'none',
    willChange: 'transform',
    boxShadow: 'var(--hui-shadow-xl, 0 12px 32px rgba(0, 0, 0, 0.18))',
    cursor: 'grabbing',
  });
  ghost._tilt = tilt;
  // Gắn vào cùng root với item → CSS theo class của trang/shadow root cha vẫn áp dụng
  const root = item.getRootNode();
  (root === document ? document.body : root).appendChild(ghost);
  if (supportsPopover) {
    ghost.setAttribute('popover', 'manual');
    try { ghost.showPopover(); } catch { /* không lên được top-layer → vẫn fixed */ }
  }
  return ghost;
}

function moveGhost(ghost, dx, dy) {
  ghost.style.transform = `translate(${dx}px, ${dy}px)${ghost._tilt ? ` rotate(${ghost._tilt}deg) scale(1.02)` : ' scale(1.02)'}`;
}

// =====================================================
// KÉO BẰNG CON TRỎ
// =====================================================

const INTERACTIVE = 'input, textarea, select, button, a[href], label, [contenteditable=""], [contenteditable="true"], [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="slider"], [role="textbox"]';

/** Con trỏ bấm vào phần tử tương tác bên trong item (không phải chính item) → không kéo */
export function isInteractiveTarget(path, item) {
  for (const n of path) {
    if (n === item) return false;
    if (n instanceof Element && n.matches(INTERACTIVE)) return true;
  }
  return false;
}

let activeSession = null;

/** Đang có phiên kéo (chuột hoặc bàn phím) */
export function isSorting() {
  return Boolean(activeSession);
}

/**
 * Bắt đầu theo dõi pointerdown trên `item`. Kéo thật sự bắt đầu khi di chuyển > 4px
 * (cảm ứng không có tay nắm: giữ `delay` ms trước để vẫn cuộn trang được).
 * @param {PointerEvent} e
 * @param {{container: object, item: Element, delay?: number, tilt?: number,
 *   onStart?: Function, onMove?: Function, onDrop?: Function, onCancel?: Function}} opts
 */
export function beginPointerDrag(e, opts) {
  if (activeSession) return null;
  const { container, item, delay = 0, tilt = 0 } = opts;
  const startX = e.clientX;
  const startY = e.clientY;
  const pointerId = e.pointerId;
  const touch = e.pointerType === 'touch';
  const ac = new AbortController();
  const sig = { signal: ac.signal };

  const s = {
    item,
    from: container,
    current: container,
    oldIndex: container.getItems().indexOf(item),
    active: false,
    ghost: null,
    offsetX: 0,
    offsetY: 0,
    origin: null,
    x: startX,
    y: startY,
    raf: 0,
    timer: 0,
  };
  activeSession = s;

  const cleanup = () => {
    ac.abort();
    clearTimeout(s.timer);
    cancelAnimationFrame(s.raf);
    item.removeAttribute('data-hui-sort-placeholder');
    if (activeSession === s) activeSession = null;
  };

  const removeGhost = (animateBack) => {
    const ghost = s.ghost;
    if (!ghost) return;
    s.ghost = null;
    const done = () => {
      try { ghost.hidePopover?.(); } catch { /* đã ẩn */ }
      ghost.remove();
    };
    if (!animateBack || !isAnimated(s.current) || typeof ghost.animate !== 'function') return done();
    // Ghost "đáp" vào chỗ của item rồi mới biến mất
    const r = item.getBoundingClientRect();
    const anim = ghost.animate([
      { transform: ghost.style.transform },
      { transform: `translate(${r.left - s.origin.left}px, ${r.top - s.origin.top}px)` },
    ], { duration: 160, easing: EASE, fill: 'forwards' });
    anim.finished.then(done, done);
    return undefined;
  };

  const reposition = () => {
    const candidates = groupContainers(s.from);
    let target = null;
    for (const c of candidates) {
      const r = c.el.getBoundingClientRect();
      if (s.x >= r.left && s.x <= r.right && s.y >= r.top && s.y <= r.bottom) {
        target = c;
        break;
      }
    }
    if (!target) return;
    if (target !== s.current && target.accepts && !target.accepts(item, s.from)) return;
    const others = othersOf(target, item);
    const index = indexAt(others, s.x, s.y, target.axis());
    const currentIndex = target === s.current ? target.getItems().indexOf(item) : -1;
    if (target === s.current && index === currentIndex) return;
    const prev = s.current;
    moveItem(item, prev, target, index, isAnimated(target));
    s.current = target;
    opts.onMove?.({ item, from: s.from, to: target, prevContainer: prev, index: target.getItems().indexOf(item) });
  };

  const activate = () => {
    if (s.active) return;
    s.active = true;
    clearTimeout(s.timer);
    const rect = item.getBoundingClientRect();
    s.origin = rect;
    s.offsetX = startX - rect.left;
    s.offsetY = startY - rect.top;
    window.getSelection?.()?.removeAllRanges();
    s.ghost = createGhost(item, rect, tilt);
    moveGhost(s.ghost, s.x - startX, s.y - startY);
    item.setAttribute('data-hui-sort-placeholder', '');
    layoutRects = new WeakMap();
    opts.onStart?.({ item, from: container, oldIndex: s.oldIndex });
    const tick = () => {
      if (!s.active) return;
      if (autoScroll(s.current.el, s.x, s.y)) {
        layoutRects = new WeakMap();
        reposition();
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  };

  const finish = (cancelled) => {
    const wasActive = s.active;
    s.active = false;
    cleanup();
    if (!wasActive) return;
    // Chặn click phát sinh ngay sau khi thả (item là link/nút)
    const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    window.addEventListener('click', stop, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0);

    const revert = () => {
      const target = s.from;
      const others = othersOf(target, item);
      moveItem(item, s.current, target, Math.min(s.oldIndex, others.length), isAnimated(target));
      s.current = target;
    };
    if (cancelled) {
      revert();
      removeGhost(true);
      opts.onCancel?.({ item, from: s.from, oldIndex: s.oldIndex });
      return;
    }
    removeGhost(true);
    opts.onDrop?.({
      item,
      from: s.from,
      to: s.current,
      oldIndex: s.oldIndex,
      newIndex: s.current.getItems().indexOf(item),
    }, revert);
  };

  window.addEventListener('pointermove', (ev) => {
    if (ev.pointerId !== pointerId) return;
    s.x = ev.clientX;
    s.y = ev.clientY;
    const dist = Math.hypot(s.x - startX, s.y - startY);
    if (!s.active) {
      if (touch && delay > 0) {
        if (dist > 8) finish(true); // vuốt trước khi hết thời gian giữ → người dùng đang cuộn
        return;
      }
      if (dist < 4) return;
      activate();
    }
    moveGhost(s.ghost, s.x - startX, s.y - startY);
    reposition();
  }, sig);
  window.addEventListener('pointerup', (ev) => { if (ev.pointerId === pointerId) finish(false); }, sig);
  window.addEventListener('pointercancel', (ev) => { if (ev.pointerId === pointerId) finish(true); }, sig);
  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && s.active) {
      ev.preventDefault();
      ev.stopPropagation();
      finish(true);
    }
  }, { ...sig, capture: true });
  // Đang kéo: chặn cuộn trang bằng cảm ứng, chặn bôi đen chữ, chặn menu chuột phải khi giữ lâu
  document.addEventListener('touchmove', (ev) => { if (s.active && ev.cancelable) ev.preventDefault(); }, { ...sig, passive: false });
  document.addEventListener('selectstart', (ev) => { if (s.active) ev.preventDefault(); }, sig);
  document.addEventListener('contextmenu', (ev) => { if (s.active || (touch && delay)) ev.preventDefault(); }, sig);
  document.addEventListener('dragstart', (ev) => ev.preventDefault(), sig);
  document.addEventListener('scroll', () => {
    if (!s.active) return;
    layoutRects = new WeakMap();
    reposition();
  }, { ...sig, capture: true, passive: true });

  if (touch && delay > 0) s.timer = setTimeout(activate, delay);
  return s;
}

// =====================================================
// BÀN PHÍM
// =====================================================

/**
 * Nhấc item bằng bàn phím. Phím (nghe ở window, capture → không bị overlay chặn Esc):
 *   mũi tên theo trục chính: lên/xuống 1 vị trí · mũi tên trục phụ: sang danh sách kề (cùng group)
 *   Home / End: đầu / cuối · Space / Enter: thả · Esc: hủy · rời focus: thả.
 * @param {{container: object, item: Element, onAnnounce?: (kind: string, info: object) => void,
 *   onDrop?: Function, onCancel?: Function, onMove?: Function}} opts
 * @returns {{drop: () => void, cancel: () => void}}
 */
export function startKeyboardSort(opts) {
  if (activeSession) return null;
  const { container, item } = opts;
  const ac = new AbortController();
  const s = { item, from: container, current: container, oldIndex: container.getItems().indexOf(item), keyboard: true };
  activeSession = s;
  item.setAttribute('data-hui-sort-grabbed', '');
  item.setAttribute('aria-pressed', 'true');

  const info = () => {
    const items = s.current.getItems();
    return { item, container: s.current, index: items.indexOf(item) + 1, count: items.length, label: itemLabel(item), list: s.current.label?.() || '' };
  };

  const end = () => {
    ac.abort();
    item.removeAttribute('data-hui-sort-grabbed');
    item.removeAttribute('aria-pressed');
    if (activeSession === s) activeSession = null;
  };

  const refocus = () => {
    if (item.getRootNode().activeElement !== item && document.activeElement !== item) item.focus({ preventScroll: false });
    item.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };

  const revert = () => {
    const others = othersOf(s.from, item);
    moveItem(item, s.current, s.from, Math.min(s.oldIndex, others.length), isAnimated(s.from));
    s.current = s.from;
    refocus();
  };

  const drop = () => {
    end();
    const result = { item, from: s.from, to: s.current, oldIndex: s.oldIndex, newIndex: s.current.getItems().indexOf(item) };
    opts.onAnnounce?.('dropped', info());
    opts.onDrop?.(result, revert);
  };

  const cancel = () => {
    end();
    revert();
    opts.onAnnounce?.('cancelled', { ...info(), index: s.oldIndex + 1 });
    opts.onCancel?.({ item, from: s.from, oldIndex: s.oldIndex });
  };

  const moveWithin = (index) => {
    const others = othersOf(s.current, item);
    const next = Math.max(0, Math.min(others.length, index));
    if (next === s.current.getItems().indexOf(item)) return;
    moveItem(item, s.current, s.current, next, isAnimated(s.current));
    refocus();
    opts.onMove?.({ item, from: s.from, to: s.current, prevContainer: s.current, index: next });
    opts.onAnnounce?.('moved', info());
  };

  const moveAcross = (dir) => {
    const list = groupContainers(s.from);
    let i = list.indexOf(s.current) + dir;
    // Bỏ qua container không nhận item (vd cột đã đủ giới hạn)
    while (list[i] && list[i].accepts && list[i] !== s.from && !list[i].accepts(item, s.from)) i += dir;
    const target = list[i];
    if (!target) {
      opts.onAnnounce?.('edge', info());
      return;
    }
    const index = Math.min(s.current.getItems().indexOf(item), othersOf(target, item).length);
    const prev = s.current;
    moveItem(item, prev, target, index, isAnimated(target));
    s.current = target;
    refocus();
    opts.onMove?.({ item, from: s.from, to: target, prevContainer: prev, index });
    opts.onAnnounce?.('movedList', info());
  };

  /** Số cột của lưới = số item cùng hàng với item đầu tiên */
  const gridColumns = () => {
    const items = s.current.getItems();
    if (!items.length) return 1;
    const top = items[0].getBoundingClientRect().top;
    return Math.max(1, items.filter((el) => Math.abs(el.getBoundingClientRect().top - top) < 2).length);
  };

  window.addEventListener('keydown', (e) => {
    const axis = s.current.axis();
    const idx = s.current.getItems().indexOf(item);
    const key = e.key;
    let handled = true;
    if (key === 'Escape') cancel();
    else if (key === ' ' || key === 'Enter') drop();
    else if (key === 'Home') moveWithin(0);
    else if (key === 'End') moveWithin(Infinity);
    else if (axis === 'y' && (key === 'ArrowUp' || key === 'ArrowDown')) moveWithin(idx + (key === 'ArrowUp' ? -1 : 1));
    else if (axis === 'y' && (key === 'ArrowLeft' || key === 'ArrowRight')) moveAcross(key === 'ArrowLeft' ? -1 : 1);
    else if (axis !== 'y' && (key === 'ArrowLeft' || key === 'ArrowRight')) moveWithin(idx + (key === 'ArrowLeft' ? -1 : 1));
    else if (axis === 'grid' && (key === 'ArrowUp' || key === 'ArrowDown')) {
      const step = gridColumns();
      moveWithin(idx + (key === 'ArrowUp' ? -step : step));
    } else if (axis === 'x' && (key === 'ArrowUp' || key === 'ArrowDown')) moveAcross(key === 'ArrowUp' ? -1 : 1);
    else if (key === 'Tab') {
      handled = false;
      drop();
    } else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true, signal: ac.signal });

  // Focus rời khỏi item (click ra ngoài…) → thả tại chỗ. Kiểm tra sau 1 nhịp vì di chuyển DOM có thể làm mất focus tạm thời.
  window.addEventListener('focusout', (e) => {
    if (e.composedPath()[0] !== item) return;
    setTimeout(() => {
      if (activeSession !== s) return;
      let a = document.activeElement;
      while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
      if (a !== item) drop();
    }, 0);
  }, { capture: true, signal: ac.signal });

  opts.onAnnounce?.('grabbed', info());
  return { drop, cancel };
}
