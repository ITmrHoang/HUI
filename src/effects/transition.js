/**
 * viewTransition(updateFn, { type }) — đổi giao diện kèm View Transitions API.
 *   await viewTransition(() => list.classList.toggle('grid'), { type: 'slide-left' });
 * Trình duyệt chưa hỗ trợ / giảm chuyển động → chỉ chạy updateFn (không hiệu ứng).
 *
 * Trong lúc chuyển cảnh <html> mang data-hui-transition="<type>" → viết CSS riêng cho từng kiểu:
 *   :root[data-hui-transition="my-type"]::view-transition-old(root) { animation: … }
 * Kiểu có sẵn: fade (mặc định của trình duyệt) | slide-left | slide-right | slide-up | slide-down | zoom | none.
 * Phần tử chung (shared element: thumbnail → lightbox) chỉ cần đặt cùng `view-transition-name`.
 */

import { animationsDisabled } from '../utils/animate.js';

export const VIEW_TRANSITION_ATTR = 'data-hui-transition';
export const VIEW_TRANSITION_TYPES = ['fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom', 'none'];

const A = VIEW_TRANSITION_ATTR;
const DUR = 'var(--hui-view-transition-duration, 320ms)';
const EASE = 'var(--hui-motion-ease-in-out, cubic-bezier(0.645, 0.045, 0.355, 1))';
const slide = (name, out, inn) => `
:root[${A}="${name}"]::view-transition-old(root) { animation: ${DUR} ${EASE} both hui-vt-${name}-out; }
:root[${A}="${name}"]::view-transition-new(root) { animation: ${DUR} ${EASE} both hui-vt-${name}-in; }
@keyframes hui-vt-${name}-out { to { opacity: 0; transform: ${out}; } }
@keyframes hui-vt-${name}-in { from { opacity: 0; transform: ${inn}; } }`;

const VT_CSS = `
${slide('slide-left', 'translateX(-48px)', 'translateX(48px)')}
${slide('slide-right', 'translateX(48px)', 'translateX(-48px)')}
${slide('slide-up', 'translateY(-32px)', 'translateY(32px)')}
${slide('slide-down', 'translateY(32px)', 'translateY(-32px)')}
${slide('zoom', 'scale(1.06)', 'scale(0.94)')}
:root[${A}="none"]::view-transition-group(*),
:root[${A}="none"]::view-transition-old(*),
:root[${A}="none"]::view-transition-new(*) { animation: none; }
:root[${A}]::view-transition-group(*) { animation-duration: ${DUR}; }
`;

/** Đếm lượt chuyển cảnh: chỉ lượt mới nhất được gỡ cờ trên <html> */
let seq = 0;

function ensureStyle() {
  if (document.querySelector('style[data-hui-view-transition]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-hui-view-transition', '');
  style.textContent = VT_CSS;
  document.head.append(style);
}

/** Trình duyệt hỗ trợ View Transitions (cùng tài liệu) */
export function supportsViewTransition() {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

/**
 * @param {() => (void|Promise<void>)} updateFn - hàm cập nhật DOM
 * @param {object} [opts]
 * @param {string} [opts.type='fade'] - kiểu chuyển cảnh (ghi vào html[data-hui-transition])
 * @param {boolean} [opts.skip=false] - bỏ hiệu ứng, chỉ chạy updateFn
 * @returns {Promise<void>} resolve khi chuyển cảnh xong (hoặc ngay sau updateFn nếu không có hiệu ứng);
 *   reject nếu updateFn ném lỗi
 */
export async function viewTransition(updateFn, { type = 'fade', skip = false } = {}) {
  const run = () => Promise.resolve().then(() => updateFn?.());
  if (skip || !supportsViewTransition() || animationsDisabled()) return run();

  ensureStyle();
  const root = document.documentElement;
  root.setAttribute(A, type);
  const mine = ++seq;
  let vt;
  try {
    // Chrome 125+: types → dùng được :active-view-transition-type(...)
    const typed = typeof ViewTransition !== 'undefined' && 'types' in ViewTransition.prototype;
    vt = typed ? document.startViewTransition({ update: run, types: [type] }) : document.startViewTransition(run);
  } catch {
    root.removeAttribute(A);
    return run();
  }
  // ready / finished cũng reject khi updateFn lỗi hoặc chuyển cảnh bị bỏ qua → chặn "unhandled rejection"
  vt.ready.catch(() => {});
  const finished = vt.finished.catch(() => {});
  try {
    await vt.updateCallbackDone;
  } catch (err) {
    if (mine === seq) root.removeAttribute(A);
    throw err;
  }
  await finished;
  // Chuyển cảnh khác bắt đầu trong lúc chờ → để nó tự gỡ cờ của mình
  if (mine === seq) root.removeAttribute(A);
}
