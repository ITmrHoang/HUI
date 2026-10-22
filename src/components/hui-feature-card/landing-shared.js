/**
 * Dùng chung cho nhóm "landing" (feature / testimonial / profile / media card, hero, các grid…):
 * alias `title` không để lại tooltip native, hiệu ứng xuất hiện so le khi cuộn tới.
 */

import { inView } from '../../utils/scroll.js';
import { runAnimation, animationsDisabled } from '../../utils/animate.js';

export {
  createMsg, hasContent, isNum, canAnimate, forwardToCard, createForwardSlot, CARD_EXPORTPARTS,
} from '../hui-product-card/card-shared.js';

/** Màu theo tên token → biến CSS; còn lại coi là màu CSS bất kỳ */
export const COLOR_TOKENS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

export function colorValue(color) {
  if (!color) return null;
  return COLOR_TOKENS.includes(color) ? `var(--hui-${color})` : color;
}

/** Số trơn → px, từ khóa khoảng cách → token, còn lại giữ nguyên CSS length */
const GAP_TOKENS = {
  none: '0px', xs: 'var(--hui-space-xs)', sm: 'var(--hui-space-sm)', md: 'var(--hui-space-lg)',
  lg: 'var(--hui-space-xl)', xl: 'var(--hui-space-2xl)',
};

export function toLength(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).trim();
  if (GAP_TOKENS[v]) return GAP_TOKENS[v];
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

/** Kẹp cấp heading về 1–6 */
export const headingLevel = (v, fallback = 3) => (Number.isFinite(v) ? Math.min(6, Math.max(1, Math.round(v))) : fallback);

/**
 * Lớp alias `title`: nhận attribute rồi gỡ khỏi host (tránh tooltip native khi rê chuột), giống hui-blog-card.
 * @template {new (...args: any[]) => HTMLElement} T
 * @param {T} Base
 */
export const TitleAttrMixin = (Base) => class extends Base {
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'title') {
      if (newVal === null) return; // lần gọi do chính ta removeAttribute
      super.attributeChangedCallback(name, oldVal, newVal);
      this.removeAttribute('title');
      return;
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }
};

/**
 * Hiện các phần tử lần lượt (stagger) khi `host` cuộn vào màn hình — chạy 1 lần.
 * Trong lúc chờ, phần tử bị ẩn bằng opacity inline (onShow gọi khi bắt đầu hiện); hiệu ứng tắt (no-animation / giảm chuyển động) → hiện ngay.
 * @returns {() => void} hàm hủy (hiện lại mọi phần tử)
 */
export function revealOnView(host, targets, { effect = 'fade-up', stagger = 80, duration = 600, threshold = 0.1, onShow } = {}) {
  const list = targets.filter(Boolean);
  if (!list.length || host.noAnimation || animationsDisabled()) return () => {};
  for (const el of list) el.style.opacity = '0';
  let done = false;
  const show = () => {
    if (done) return;
    done = true;
    for (const el of list) el.style.opacity = '';
    runAnimation(list, effect, { duration, stagger: Math.max(0, Number(stagger) || 0) });
    onShow?.();
  };
  const stop = inView(host, (entry) => { if (entry.isIntersecting) show(); }, { threshold, once: true });
  return () => {
    stop();
    if (!done) for (const el of list) el.style.opacity = '';
    done = true;
  };
}

/** Phần tử con thật của host (bỏ template / style / script) */
export const contentChildren = (host) => [...host.children].filter((c) => !['TEMPLATE', 'STYLE', 'SCRIPT'].includes(c.tagName));
