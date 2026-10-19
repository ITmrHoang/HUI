/**
 * @itmrhoang/h-ui/effects — hiệu ứng theo con trỏ chuột (tách riêng để bundle chính không phình).
 *
 * Dùng bằng JS:
 *   import { attachTilt, attachGlow } from '@itmrhoang/h-ui/effects';
 *   const stop = attachTilt(el, { max: 10, scale: 1.03 });   // nghiêng 3D theo chuột
 *   attachGlow(el);                                          // đốm sáng chạy theo chuột
 *
 * Hoặc khai báo trên HTML bất kỳ (sau khi gọi enableEffects()):
 *   <div data-hui-tilt="10">…</div>   <div data-hui-glow>…</div>
 *
 * hui-card dùng module này khi có effect="tilt" / "glow" (tự import động, không cần gọi gì).
 * Tự tắt khi: thiết bị cảm ứng (không có hover), prefers-reduced-motion, html[data-hui-no-animation].
 */

import { animationsDisabled } from '../utils/animate.js';

/** Thiết bị có chuột/trackpad thật (hover được) — cảm ứng thì bỏ qua hiệu ứng theo con trỏ */
function canHover() {
  return typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
}

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

// ── Khai báo trên HTML: data-hui-tilt / data-hui-glow ─────────────────────
const GLOW_CSS = `
[data-hui-glow] { position: relative; }
[data-hui-glow]::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(var(--hui-glow-size, 260px) circle at var(--hui-glow-x, 50%) var(--hui-glow-y, 50%),
    var(--hui-glow-color, color-mix(in srgb, var(--hui-primary) 22%, transparent)), transparent 70%);
  opacity: 0; transition: opacity 200ms ease;
}
[data-hui-glow][data-hui-glowing]::after { opacity: 1; }
`;

const attached = new WeakMap();
let observer = null;

function bind(el) {
  if (attached.has(el)) return;
  const cleanups = [];
  if (el.hasAttribute('data-hui-tilt')) {
    const max = parseFloat(el.getAttribute('data-hui-tilt'));
    cleanups.push(attachTilt(el, Number.isFinite(max) ? { max } : {}));
  }
  if (el.hasAttribute('data-hui-glow')) cleanups.push(attachGlow(el));
  attached.set(el, () => cleanups.forEach((fn) => fn()));
}

/** Bật data-hui-tilt / data-hui-glow cho toàn trang (kể cả phần tử thêm sau) */
export function enableEffects(root = document) {
  if (typeof document === 'undefined') return;
  if (!document.querySelector('style[data-hui-effects]')) {
    const style = document.createElement('style');
    style.setAttribute('data-hui-effects', '');
    style.textContent = GLOW_CSS;
    document.head.append(style);
  }
  const scan = (node) => {
    if (node.nodeType !== 1 && node.nodeType !== 9) return;
    if (node.matches?.('[data-hui-tilt],[data-hui-glow]')) bind(node);
    node.querySelectorAll?.('[data-hui-tilt],[data-hui-glow]').forEach(bind);
  };
  scan(root);
  if (!observer && document.body) {
    observer = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach(scan);
        r.removedNodes.forEach((n) => {
          if (n.nodeType === 1 && attached.has(n)) {
            attached.get(n)();
            attached.delete(n);
          }
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
