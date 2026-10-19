/**
 * Scroll utils — dùng chung cho scroller, scroll-steps, back-top, reveal, infinite-scroll…
 * Mọi hàm trả về hàm hủy (cleanup) để gọi khi component bị tháo khỏi trang.
 */

import { prefersReducedMotion } from './motion.js';

/** Phần tử/cửa sổ đang cuộn: window → document.scrollingElement */
const scrollerOf = (target) => (target === window || !target ? document.scrollingElement || document.documentElement : target);

/**
 * Gọi `cb(info)` khi cuộn (gom về 1 lần mỗi frame) và 1 lần ngay khi gắn.
 * info = { top, left, progress (0–1 theo chiều dọc), progressX, direction: 'up' | 'down' }
 */
export function onScroll(target, cb) {
  const el = scrollerOf(target);
  const source = target === window || !target ? window : target;
  let frame = 0;
  let lastTop = el.scrollTop;
  const run = () => {
    frame = 0;
    const top = el.scrollTop;
    const maxY = el.scrollHeight - el.clientHeight;
    const maxX = el.scrollWidth - el.clientWidth;
    cb({
      top,
      left: el.scrollLeft,
      progress: maxY > 0 ? Math.min(1, Math.max(0, top / maxY)) : 0,
      progressX: maxX > 0 ? Math.min(1, Math.max(0, el.scrollLeft / maxX)) : 0,
      direction: top < lastTop ? 'up' : 'down',
    });
    lastTop = top;
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(run); };
  source.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  run();
  return () => {
    cancelAnimationFrame(frame);
    source.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}

/** Cuộn mượt tới vị trí; người dùng bật giảm chuyển động → nhảy thẳng */
export function scrollToPosition(target, { top, left, smooth = true } = {}) {
  const el = target === window || !target ? window : target;
  el.scrollTo({ top, left, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
}

/** Mép nào còn nội dung bị che (dùng để hiện bóng mờ / nút mũi tên) */
export function overflowEdges(el) {
  const x = el.scrollLeft;
  const y = el.scrollTop;
  // Sai số 1px do làm tròn subpixel
  return {
    start: x > 1,
    end: x + el.clientWidth < el.scrollWidth - 1,
    top: y > 1,
    bottom: y + el.clientHeight < el.scrollHeight - 1,
  };
}

/**
 * Kéo bằng chuột để cuộn (như vuốt trên điện thoại). Chỉ áp dụng cho chuột — cảm ứng đã cuộn sẵn.
 * Nếu đã kéo quá 5px thì chặn cú click ngay sau đó (tránh mở nhầm link/card khi thả chuột).
 */
export function dragToScroll(el, { axis = 'x' } = {}) {
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let dragging = false;
  let moved = false;

  const onDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    originLeft = el.scrollLeft;
    originTop = el.scrollTop;
  };
  const onMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && Math.hypot(dx, dy) > 5) {
      moved = true;
      el.setPointerCapture?.(e.pointerId);
      el.style.scrollSnapType = 'none'; // tắt snap trong lúc kéo cho mượt, bật lại khi thả
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    }
    if (!moved) return;
    if (axis !== 'y') el.scrollLeft = originLeft - dx;
    if (axis !== 'x') el.scrollTop = originTop - dy;
  };
  const onUp = (e) => {
    if (!dragging) return;
    dragging = false;
    if (moved) {
      el.releasePointerCapture?.(e.pointerId);
      el.style.scrollSnapType = '';
      el.style.cursor = '';
      el.style.userSelect = '';
    }
  };
  const onClick = (e) => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('click', onClick, true);
  return () => {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    el.removeEventListener('click', onClick, true);
  };
}

/**
 * Lăn chuột dọc → cuộn ngang (chỉ khi vùng còn cuộn ngang được theo hướng đó,
 * hết đường thì trả lại cuộn dọc cho trang — không "kẹt" người dùng).
 */
export function wheelToHorizontal(el) {
  const onWheel = (e) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // zoom / touchpad đã cuộn ngang
    const edges = overflowEdges(el);
    if ((e.deltaY > 0 && !edges.end) || (e.deltaY < 0 && !edges.start)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  };
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => el.removeEventListener('wheel', onWheel);
}

// IntersectionObserver dùng chung theo cấu hình → 100 phần tử chỉ tốn 1 observer
const observers = new Map();

/**
 * Gọi `cb(entry)` khi phần tử vào/ra vùng nhìn thấy.
 * opts: { threshold = 0.15, rootMargin = '0px', root = null, once = false }
 */
export function inView(el, cb, { threshold = 0.15, rootMargin = '0px', root = null, once = false } = {}) {
  if (typeof IntersectionObserver !== 'function') {
    cb({ isIntersecting: true, target: el, intersectionRatio: 1 });
    return () => {};
  }
  const key = root ? null : `${threshold}|${rootMargin}`;
  let shared = key && observers.get(key);
  if (!shared) {
    const callbacks = new Map();
    const io = new IntersectionObserver((list) => {
      for (const entry of list) callbacks.get(entry.target)?.(entry);
    }, { threshold, rootMargin, root });
    shared = { io, callbacks };
    if (key) observers.set(key, shared);
  }
  const handler = (entry) => {
    cb(entry);
    if (once && entry.isIntersecting) stop();
  };
  const stop = () => {
    shared.callbacks.delete(el);
    shared.io.unobserve(el);
  };
  shared.callbacks.set(el, handler);
  shared.io.observe(el);
  return stop;
}
