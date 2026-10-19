/**
 * Directive `data-hui-animate` — hiệu ứng xuất hiện khi cuộn tới, gắn lên BẤT KỲ thẻ HTML nào:
 *
 *   <section data-hui-animate="fade-up">…</section>
 *   <div data-hui-animate="zoom-in" data-hui-delay="150" data-hui-duration="600">…</div>
 *   <ul data-hui-animate="fade-up" data-hui-stagger="80">  ← các con hiện lần lượt cách nhau 80ms
 *   <p data-hui-animate="fade" data-hui-once="false">     ← cuộn ra rồi vào lại thì chạy lại
 *
 * Hiệu ứng: fade | fade-up | fade-down | fade-left | fade-right | zoom-in | zoom-out | flip-up | blur-in | slide-up
 * Bật: import 'hui-lib' (bundle tổng tự bật) hoặc gọi enableAnimations() khi import lẻ.
 * Tắt toàn trang: <html data-hui-no-animation>, token --hui-motion-duration: 0ms,
 * hoặc người dùng bật "giảm chuyển động" trong hệ điều hành → nội dung hiện ngay, không chuyển động.
 */

import { prefersReducedMotion } from './motion.js';
import { inView } from './scroll.js';

const DISTANCE = '24px';

export const ANIMATIONS = {
  fade: [{ opacity: 0 }, { opacity: 1 }],
  'fade-up': [{ opacity: 0, transform: `translateY(${DISTANCE})` }, { opacity: 1, transform: 'none' }],
  'fade-down': [{ opacity: 0, transform: `translateY(-${DISTANCE})` }, { opacity: 1, transform: 'none' }],
  'fade-left': [{ opacity: 0, transform: `translateX(${DISTANCE})` }, { opacity: 1, transform: 'none' }],
  'fade-right': [{ opacity: 0, transform: `translateX(-${DISTANCE})` }, { opacity: 1, transform: 'none' }],
  'zoom-in': [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'none' }],
  'zoom-out': [{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'none' }],
  'flip-up': [{ opacity: 0, transform: 'perspective(800px) rotateX(18deg) translateY(12px)' }, { opacity: 1, transform: 'none' }],
  'blur-in': [{ opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'none' }],
  'slide-up': [{ transform: 'translateY(100%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
};

const EASE = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
const SELECTOR = '[data-hui-animate]';

// Trạng thái "chưa hiện": CSS do JS chèn → nếu JS không chạy thì nội dung vẫn hiện bình thường.
// Phần tử có stagger: chính nó hiện ngay, các CON mới ẩn chờ chạy lần lượt.
const HIDE_CSS = `
[data-hui-animate]:not([data-hui-stagger]):not([data-hui-animated]),
[data-hui-animate][data-hui-stagger]:not([data-hui-animated]) > * { opacity: 0; }
`;

const tracked = new WeakMap(); // phần tử → hàm hủy theo dõi
let mutationObserver = null;
let styleEl = null;

/** Hiệu ứng đang bị tắt (người dùng giảm chuyển động / html[data-hui-no-animation] / token 0ms) */
export function animationsDisabled() {
  return disabled();
}

function disabled() {
  if (prefersReducedMotion()) return true;
  if (document.documentElement.hasAttribute('data-hui-no-animation')) return true;
  const token = getComputedStyle(document.documentElement).getPropertyValue('--hui-motion-duration').trim();
  return token === '0ms' || token === '0s' || token === '0';
}

function numAttr(el, name, fallback) {
  const v = parseFloat(el.getAttribute(name));
  return Number.isFinite(v) ? v : fallback;
}

/** Chạy hiệu ứng cho 1 phần tử (hoặc lần lượt các con nếu có data-hui-stagger) */
export function playAnimation(el) {
  const name = el.getAttribute('data-hui-animate') || 'fade-up';
  const keyframes = ANIMATIONS[name] || ANIMATIONS['fade-up'];
  const duration = numAttr(el, 'data-hui-duration', 600);
  const delay = numAttr(el, 'data-hui-delay', 0);
  const stagger = el.hasAttribute('data-hui-stagger') ? numAttr(el, 'data-hui-stagger', 80) : null;

  el.setAttribute('data-hui-animated', '');
  runAnimation(stagger === null ? [el] : [...el.children], name, { duration, delay, stagger: stagger ?? 0 });
}

/**
 * Lõi chạy hiệu ứng — dùng chung cho directive và component (hui-reveal, scroll-steps…).
 * @param {Element[]} targets - phần tử chạy hiệu ứng (lần lượt nếu stagger > 0)
 * @param {string} name - tên trong ANIMATIONS
 * @returns {Animation[]} rỗng khi hiệu ứng bị tắt
 */
export function runAnimation(targets, name = 'fade-up', { duration = 600, delay = 0, stagger = 0 } = {}) {
  if (disabled()) return [];
  const keyframes = ANIMATIONS[name] || ANIMATIONS['fade-up'];
  return targets.filter((t) => typeof t.animate === 'function').map((target, i) => target.animate(keyframes, {
    duration,
    delay: delay + i * stagger,
    easing: EASE,
    fill: 'backwards', // giữ trạng thái đầu trong lúc chờ delay, xong thì trả lại style thật
  }));
}

/** Đưa về trạng thái chưa hiện (dùng khi data-hui-once="false" và phần tử cuộn ra khỏi màn hình) */
export function resetAnimation(el) {
  el.removeAttribute('data-hui-animated');
}

function track(el) {
  if (tracked.has(el)) return;
  const once = el.getAttribute('data-hui-once') !== 'false';
  const offset = el.getAttribute('data-hui-offset') || '0px 0px -10% 0px';
  const stop = inView(el, (entry) => {
    if (entry.isIntersecting) {
      if (!el.hasAttribute('data-hui-animated')) playAnimation(el);
      if (once) untrack(el);
    } else if (!once && entry.boundingClientRect.top > 0) {
      // Chỉ reset khi phần tử trôi xuống dưới màn hình (cuộn ngược lên) — tránh nháy khi cuộn qua
      resetAnimation(el);
    }
  }, { rootMargin: offset, threshold: 0.1 });
  tracked.set(el, stop);
}

function untrack(el) {
  tracked.get(el)?.();
  tracked.delete(el);
}

function scan(root) {
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.matches?.(SELECTOR)) track(root);
  root.querySelectorAll?.(SELECTOR).forEach(track);
}

/**
 * Bật directive cho `root` (mặc định cả trang) + tự theo dõi phần tử thêm sau (MutationObserver).
 * Gọi nhiều lần không sao.
 */
export function enableAnimations(root = document) {
  if (typeof document === 'undefined') return;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.setAttribute('data-hui-animate-style', '');
    styleEl.textContent = HIDE_CSS;
    document.head.append(styleEl);
  }
  const start = () => {
    scan(root === document ? document.body : root);
    if (!mutationObserver) {
      mutationObserver = new MutationObserver((records) => {
        for (const r of records) {
          for (const n of r.addedNodes) scan(n);
          for (const n of r.removedNodes) {
            if (n.nodeType === 1) {
              if (tracked.has(n)) untrack(n);
              n.querySelectorAll?.(SELECTOR).forEach(untrack);
            }
          }
          if (r.type === 'attributes' && r.target.matches?.(SELECTOR)) track(r.target);
        }
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-hui-animate'] });
    }
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}

/** Tắt directive: hiện mọi phần tử, ngừng theo dõi */
export function disableAnimations() {
  mutationObserver?.disconnect();
  mutationObserver = null;
  document.querySelectorAll(SELECTOR).forEach((el) => {
    untrack(el);
    el.setAttribute('data-hui-animated', '');
  });
}
