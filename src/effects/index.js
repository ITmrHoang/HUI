/**
 * @itmrhoang/h-ui/effects — hiệu ứng nặng/tuỳ chọn (tách riêng để bundle chính không phình).
 *
 * Theo con trỏ / khi nhấn:
 *   attachTilt(el, { max: 10 })      nghiêng 3D        attachGlow(el)                 đốm sáng theo chuột
 *   attachRipple(el)                 gợn sóng mực      attachMagnetic(el, {strength}) hút theo con trỏ
 *   attachPress(el, { scale })       nhún khi nhấn
 * Phản hồi vui: confetti(opts) · burst(el, {icon}) · shake(el)
 * Chuyển cảnh:  viewTransition(updateFn, { type })
 *
 * Khai báo trên HTML bất kỳ (sau khi gọi enableEffects() — gọi 1 lần, tự bắt cả phần tử thêm sau):
 *   <div data-hui-tilt="10">  <div data-hui-glow>  <button data-hui-ripple>  <a data-hui-magnetic="0.4">
 *   <button data-hui-press="0.94">
 *   class tiện ích: .hui-hover-lift · .hui-hover-glow · .hui-hover-scale · .hui-press
 *
 * hui-card dùng module này khi có effect="tilt" / "glow" (tự import động, không cần gọi gì).
 * Tự tắt khi: prefers-reduced-motion, html[data-hui-no-animation], token --hui-motion-duration: 0ms
 * (tilt / glow / magnetic còn tắt trên thiết bị cảm ứng không có hover).
 */

import { animationsDisabled } from '../utils/animate.js';
import { attachRipple, attachMagnetic, attachPress, canHover } from './interactions.js';

/**
 * Nghiêng 3D theo vị trí con trỏ.
 * @param {HTMLElement} el - phần tử nhận chuột
 * @param {object} [opts]
 * @param {number} [opts.max=8] - góc nghiêng tối đa (độ)
 * @param {number} [opts.scale=1.02] - phóng nhẹ khi hover
 * @param {number} [opts.perspective=900]
 * @param {HTMLElement} [opts.target=el] - phần tử được nghiêng (vd khung bên trong shadow DOM)
 * @returns {() => void} hàm gỡ hiệu ứng
 */
export function attachTilt(el, { max = 8, scale = 1.02, perspective = 900, target = el } = {}) {
  if (!canHover() || animationsDisabled()) return () => {};
  let frame = 0;
  let rect = null;

  const onEnter = () => {
    rect = el.getBoundingClientRect();
    target.style.transition = 'transform 120ms ease-out';
    target.style.willChange = 'transform';
  };
  const onMove = (e) => {
    if (!rect) rect = el.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      // -0.5 … 0.5 tính từ tâm → góc xoay; trục Y xoay theo chiều ngang và ngược lại
      const px = (x - rect.left) / rect.width - 0.5;
      const py = (y - rect.top) / rect.height - 0.5;
      target.style.transform = `perspective(${perspective}px) rotateX(${(-py * max * 2).toFixed(2)}deg) rotateY(${(px * max * 2).toFixed(2)}deg) scale(${scale})`;
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(frame);
    rect = null;
    target.style.transition = 'transform 400ms cubic-bezier(0.215, 0.61, 0.355, 1)';
    target.style.transform = '';
    target.style.willChange = '';
  };

  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  return () => {
    onLeave();
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
  };
}

/**
 * Đốm sáng theo con trỏ: ghi vị trí chuột vào biến CSS --hui-glow-x / --hui-glow-y (px) trên `target`
 * và bật/tắt thuộc tính data-hui-glowing. Phần vẽ do CSS đảm nhận (hui-card có sẵn; phần tử thường
 * dùng style mặc định do enableEffects() chèn vào trang).
 */
export function attachGlow(el, { target = el } = {}) {
  if (!canHover() || animationsDisabled()) return () => {};
  let frame = 0;
  const onMove = (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      target.style.setProperty('--hui-glow-x', `${x}px`);
      target.style.setProperty('--hui-glow-y', `${y}px`);
    });
  };
  const onEnter = () => target.setAttribute('data-hui-glowing', '');
  const onLeave = () => target.removeAttribute('data-hui-glowing');
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  return () => {
    cancelAnimationFrame(frame);
    onLeave();
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
  };
}

// ── Khai báo trên HTML: data-hui-tilt / glow / ripple / magnetic / press ──
const EASE = 'var(--hui-motion-ease-out, cubic-bezier(0.215, 0.61, 0.355, 1))';
const DUR = 'var(--hui-motion-duration-slow, 300ms)';
const NO_MOTION = ':root[data-hui-no-animation]';
const GLOW_RING = `0 0 0 var(--hui-hover-glow-width, 3px) var(--hui-hover-glow-color, color-mix(in srgb, var(--hui-primary) 30%, transparent)),
    0 0 var(--hui-hover-glow-blur, 24px) var(--hui-hover-glow-color, color-mix(in srgb, var(--hui-primary) 45%, transparent))`;
const LIFT = 'translate: 0 calc(-1 * var(--hui-hover-lift-distance, 4px)); box-shadow: var(--hui-hover-lift-shadow, var(--hui-shadow-lg));';

const EFFECTS_CSS = `
[data-hui-glow] { position: relative; }
[data-hui-glow]::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(var(--hui-glow-size, 260px) circle at var(--hui-glow-x, 50%) var(--hui-glow-y, 50%),
    var(--hui-glow-color, color-mix(in srgb, var(--hui-primary) 22%, transparent)), transparent 70%);
  opacity: 0; transition: opacity 200ms ease;
}
[data-hui-glow][data-hui-glowing]::after { opacity: 1; }

.hui-hover-lift { transition: translate ${DUR} ${EASE}, box-shadow ${DUR} ${EASE}; }
.hui-hover-scale { transition: scale ${DUR} ${EASE}; }
.hui-hover-glow { transition: box-shadow ${DUR} ${EASE}; }
.hui-press { transition: scale var(--hui-motion-duration-fast, 150ms) ${EASE}; }
@media (hover: hover) {
  .hui-hover-lift:hover { ${LIFT} }
  .hui-hover-scale:hover { scale: var(--hui-hover-scale, 1.04); }
  .hui-hover-glow:hover { box-shadow: ${GLOW_RING}; }
}
.hui-hover-lift:focus-visible { ${LIFT} }
.hui-hover-glow:focus-visible { box-shadow: ${GLOW_RING}; }
.hui-press:active { scale: var(--hui-press-scale, 0.96); }

/* Giảm chuyển động: không dịch / phóng (vòng sáng vẫn giữ vì không phải chuyển động) */
@media (prefers-reduced-motion: reduce) {
  .hui-hover-lift, .hui-hover-scale, .hui-hover-glow, .hui-press { transition: none; }
  .hui-hover-lift:hover, .hui-hover-lift:focus-visible, .hui-hover-scale:hover, .hui-press:active { translate: none; scale: none; }
}
${NO_MOTION} .hui-hover-lift, ${NO_MOTION} .hui-hover-scale, ${NO_MOTION} .hui-hover-glow, ${NO_MOTION} .hui-press { transition: none; }
${NO_MOTION} .hui-hover-lift:hover, ${NO_MOTION} .hui-hover-lift:focus-visible,
${NO_MOTION} .hui-hover-scale:hover, ${NO_MOTION} .hui-press:active { translate: none; scale: none; }
`;

/** Chèn CSS của directive + class tiện ích vào <head> đúng 1 lần */
export function ensureEffectStyles() {
  if (typeof document === 'undefined') return;
  let style = document.querySelector('style[data-hui-effects]');
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('data-hui-effects', '');
    (document.head || document.documentElement).append(style);
  }
  if (style.textContent !== EFFECTS_CSS) style.textContent = EFFECTS_CSS;
}

const DIRECTIVES = ['data-hui-tilt', 'data-hui-glow', 'data-hui-ripple', 'data-hui-magnetic', 'data-hui-press'];
const SELECTOR = DIRECTIVES.map((a) => `[${a}]`).join(',');

const attached = new WeakMap();
let observer = null;

const numOr = (el, name, fallback) => {
  const v = parseFloat(el.getAttribute(name));
  return Number.isFinite(v) ? v : fallback;
};

function bind(el) {
  if (attached.has(el)) return;
  const cleanups = [];
  if (el.hasAttribute('data-hui-tilt')) {
    const max = parseFloat(el.getAttribute('data-hui-tilt'));
    cleanups.push(attachTilt(el, Number.isFinite(max) ? { max } : {}));
  }
  if (el.hasAttribute('data-hui-glow')) cleanups.push(attachGlow(el));
  if (el.hasAttribute('data-hui-ripple')) {
    // data-hui-ripple="<màu>" (tuỳ chọn) · data-hui-ripple-center → luôn lan từ tâm
    const color = el.getAttribute('data-hui-ripple').trim();
    cleanups.push(attachRipple(el, { color: color || undefined, center: el.hasAttribute('data-hui-ripple-center') }));
  }
  if (el.hasAttribute('data-hui-magnetic')) cleanups.push(attachMagnetic(el, { strength: numOr(el, 'data-hui-magnetic', 0.3) }));
  if (el.hasAttribute('data-hui-press')) cleanups.push(attachPress(el, { scale: numOr(el, 'data-hui-press', 0.96) }));
  attached.set(el, () => cleanups.forEach((fn) => fn()));
}

function unbind(el) {
  attached.get(el)?.();
  attached.delete(el);
}

/** Gỡ mọi directive đã gắn trên `el` (và các con) — tự gọi khi phần tử bị tháo khỏi trang */
export function disableEffects(el) {
  if (!el || el.nodeType !== 1) return;
  if (attached.has(el)) unbind(el);
  el.querySelectorAll?.(SELECTOR).forEach(unbind);
}

/** Bật directive data-hui-* + class tiện ích cho toàn trang (kể cả phần tử thêm sau). Gọi nhiều lần không sao. */
export function enableEffects(root = document) {
  if (typeof document === 'undefined') return;
  ensureEffectStyles();
  const scan = (node) => {
    if (node.nodeType !== 1 && node.nodeType !== 9 && node.nodeType !== 11) return;
    if (node.matches?.(SELECTOR)) bind(node);
    node.querySelectorAll?.(SELECTOR).forEach(bind);
  };
  scan(root);
  if (!observer && document.body) {
    observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes') {
          // Đổi giá trị directive (vd data-hui-magnetic="0.5") → gắn lại với cấu hình mới
          unbind(r.target);
          if (r.target.matches(SELECTOR)) bind(r.target);
          continue;
        }
        r.addedNodes.forEach(scan);
        r.removedNodes.forEach((n) => { if (!n.isConnected) disableEffects(n); });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: DIRECTIVES });
  }
}

export { attachRipple, attachMagnetic, attachPress };
export { confetti, clearConfetti, burst, shake } from './feedback.js';
export { viewTransition, supportsViewTransition, VIEW_TRANSITION_TYPES } from './transition.js';
export { parseColors } from './colors.js';
