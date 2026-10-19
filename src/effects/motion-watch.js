/**
 * Theo dõi trạng thái "tắt chuyển động" của trang: html[data-hui-no-animation] + prefers-reduced-motion.
 * CSS trong Shadow DOM không đọc được attribute trên <html> → component gọi hàm này để bật class tĩnh.
 *   const stop = watchMotion((disabled) => base.classList.toggle('is-still', disabled));
 * Một MutationObserver + một matchMedia dùng chung cho mọi component.
 */

import { animationsDisabled } from '../utils/animate.js';

const listeners = new Set();
let mo = null;
let mq = null;

const notify = () => {
  const off = animationsDisabled();
  listeners.forEach((fn) => fn(off));
};

/**
 * @param {(disabled: boolean) => void} cb - gọi ngay 1 lần và mỗi khi trạng thái đổi
 * @returns {() => void} hàm huỷ theo dõi
 */
export function watchMotion(cb) {
  if (typeof document === 'undefined') return () => {};
  listeners.add(cb);
  if (!mo) {
    mo = new MutationObserver(notify);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-hui-no-animation', 'style', 'data-theme'] });
    if (typeof matchMedia === 'function') {
      mq = matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener?.('change', notify);
    }
  }
  cb(animationsDisabled());
  return () => {
    listeners.delete(cb);
    if (!listeners.size && mo) {
      mo.disconnect();
      mo = null;
      mq?.removeEventListener?.('change', notify);
      mq = null;
    }
  };
}
