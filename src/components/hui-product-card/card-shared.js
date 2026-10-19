/**
 * Dùng chung cho các card chuyên biệt (product / pricing / stat / blog):
 * chuyển attribute xuống <hui-card> bên trong, chuỗi locale có dự phòng, slot chuyển tiếp.
 */

import { t, getLocaleName } from '../../core/locale.js';
import { createElement } from '../../utils/dom.js';
import { prefersReducedMotion } from '../../utils/motion.js';

/** Property của card ngoài → attribute của <hui-card> bên trong (chép nguyên giá trị) */
export const CARD_FORWARD = {
  effect: 'effect',
  href: 'href',
  target: 'target',
  variant: 'variant',
  orientation: 'orientation',
  loading: 'loading',
  size: 'size',
  noAnimation: 'no-animation',
};

/**
 * Chép các property trong CARD_FORWARD xuống hui-card (chỉ khi có property đổi).
 * `override` ghi đè giá trị (vd pricing highlighted → thêm border-gradient vào effect).
 */
export function forwardToCard(host, card, changed, override = {}, extraKeys = []) {
  const keys = Object.keys(CARD_FORWARD);
  if (![...keys, ...extraKeys].some((k) => changed.has(k))) return;
  for (const prop of keys) {
    const value = prop in override ? override[prop] : host[prop];
    const attr = CARD_FORWARD[prop];
    if (value === null || value === undefined || value === false || value === '') card.removeAttribute(attr);
    else card.setAttribute(attr, value === true ? '' : String(value));
  }
}

/** Danh sách part của hui-card được xuất ra ngoài (giữ nguyên tên) */
export const CARD_EXPORTPARTS = 'card, cover, main, header, body, skeleton, actions, footer, overlay, link: card-link, check: card-check, glow: card-glow';

/** Slot có nội dung thật (bỏ qua text node chỉ chứa khoảng trắng) */
export const hasContent = (slot) => slot.assignedNodes({ flatten: true }).some((n) =>
  n.nodeType === Node.ELEMENT_NODE || (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
);

/**
 * Tạo hàm dịch có dự phòng: key chưa có trong locale.js → lấy bảng `fallback` theo ngôn ngữ hiện tại.
 * @param {Record<string, {vi: string, en: string}>} fallback
 */
export function createMsg(fallback) {
  return (key, vars) => {
    const v = t(key, vars);
    if (v !== key) return v;
    const raw = fallback[key]?.[getLocaleName()] || fallback[key]?.en || key;
    return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
  };
}

/**
 * Slot chuyển tiếp xuống slot `target` của hui-card — chỉ gắn slot="target" khi người dùng thật sự
 * truyền nội dung (để hui-card tự ẩn vùng trống, vd overlay).
 */
export function createForwardSlot(name, target = name) {
  const slot = createElement('slot', { name });
  const sync = () => {
    if (hasContent(slot)) slot.setAttribute('slot', target);
    else slot.removeAttribute('slot');
  };
  slot.addEventListener('slotchange', sync);
  return slot;
}

/** Có nên chạy chuyển động không (no-animation + prefers-reduced-motion) */
export const canAnimate = (host) => !host.noAnimation && !prefersReducedMotion();

/** Số hợp lệ (null / '' / NaN → false) */
export const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
