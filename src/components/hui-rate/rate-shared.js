/**
 * Dùng chung cho hui-rate / hui-rating-display / hui-rating-summary:
 * chuỗi locale (kèm dự phòng), dựng ký hiệu sao, tô phần trăm, kiểm tra tắt chuyển động.
 */

import { t, getLocaleName } from '../../core/locale.js';
import { prefersReducedMotion } from '../../utils/motion.js';
import { getIcon } from '../hui-icon/icons.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Ngôi sao đặc (fill) — hui-icon 'star' là nét viền nên không dùng làm sao tô màu */
export const STAR_PATH = 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

/** Chuỗi chưa có trong locale.js → dùng bản dự phòng theo ngôn ngữ hiện tại */
const FALLBACK = {
  'rate.label': { vi: 'Đánh giá', en: 'Rating' },
  'rate.valueText': { vi: '{value} trên {count} sao', en: '{value} out of {count} stars' },
  'rate.required': { vi: 'Vui lòng chọn số sao', en: 'Please select a rating' },
  'rate.displayLabel': { vi: 'Đánh giá {value} trên {count}', en: 'Rated {value} out of {count}' },
  'rate.reviews': { vi: '({count} đánh giá)', en: '({count} reviews)' },
  'rate.total': { vi: '{count} đánh giá', en: '{count} reviews' },
  'rate.bar': { vi: '{stars} sao: {count} đánh giá ({percent})', en: '{stars} stars: {count} reviews ({percent})' },
  'rate.summary': { vi: 'Phân bố đánh giá', en: 'Rating distribution' },
};

export function msg(key, vars) {
  const v = t(key, vars);
  if (v !== key) return v;
  const raw = FALLBACK[key]?.[getLocaleName()] || FALLBACK[key]?.en || key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m)) : raw;
}

const COLOR_TOKENS = ['primary', 'success', 'warning', 'danger', 'info'];

/** 'danger' → var(--hui-danger); màu CSS bất kỳ giữ nguyên; rỗng → '' */
export function resolveColor(color) {
  if (!color) return '';
  return COLOR_TOKENS.includes(color) ? `var(--hui-${color})` : color;
}

/** Tắt hiệu ứng: attribute no-animation, <html data-hui-no-animation>, token 0ms hoặc hệ điều hành giảm chuyển động */
export function motionOff(el) {
  if (el.noAnimation || prefersReducedMotion()) return true;
  if (document.documentElement.hasAttribute('data-hui-no-animation')) return true;
  const token = getComputedStyle(el).getPropertyValue('--hui-motion-duration').trim();
  return token === '0ms' || token === '0s' || token === '0';
}

/**
 * Một ký hiệu (sao/ký tự). Ưu tiên: nodes (slot character, được clone) > character (chữ) > icon > sao mặc định.
 * @param {{ nodes?: Node[], character?: string, icon?: string }} opts
 */
function createSymbol({ nodes, character, icon }) {
  const span = document.createElement('span');
  span.className = 'hui-rate__symbol';
  if (nodes?.length) {
    for (const n of nodes) span.append(n.cloneNode(true));
    return span;
  }
  if (character) {
    span.textContent = character;
    span.classList.add('hui-rate__symbol--text');
    return span;
  }
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  const markup = icon ? getIcon(icon) : '';
  if (markup) {
    // Icon nét (hui-icon) → tô đặc + viền cùng màu cho sắc nét
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = markup; // nội dung từ registry của dự án (giống hui-icon)
  } else {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', STAR_PATH);
    svg.append(path);
  }
  span.append(svg);
  return span;
}

/**
 * Một ngôi sao 2 lớp: nền (màu nhạt) + lớp tô (màu chính, cắt theo bề rộng % → hỗ trợ số lẻ).
 *   <span.star part="star"><span.inner><span.bg/><span.fg/></span></span>
 */
export function createStar(opts) {
  const star = document.createElement('span');
  star.className = 'hui-rate__star';
  star.setAttribute('part', 'star');
  const inner = document.createElement('span');
  inner.className = 'hui-rate__inner';
  const bg = document.createElement('span');
  bg.className = 'hui-rate__bg';
  bg.append(createSymbol(opts));
  const fg = document.createElement('span');
  fg.className = 'hui-rate__fg';
  fg.append(createSymbol(opts));
  inner.append(bg, fg);
  star.append(inner);
  star._inner = inner;
  star._fg = fg;
  return star;
}

/** Tô sao theo `display` (vd 4.3 → sao 1–4: 100%, sao 5: 30%) + đổi part full/half/zero */
export function paintStars(stars, display) {
  stars.forEach((star, i) => {
    const fill = Math.min(Math.max(display - i, 0), 1);
    const pct = Math.round(fill * 1000) / 10;
    star._fill = fill;
    star._fg.style.width = `${pct}%`;
    star.setAttribute('part', `star ${fill >= 1 ? 'star-full' : fill > 0 ? 'star-half' : 'star-zero'}`);
  });
}

/** Số sao hợp lệ (1–100), mặc định 5 */
export function normalizeCount(count) {
  const n = Math.floor(Number(count));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 5;
}
