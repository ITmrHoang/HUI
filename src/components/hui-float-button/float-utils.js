/**
 * Tiện ích nhỏ dùng chung cho hui-float-button / hui-float-group / hui-contact-float.
 */

import { t, getLocaleName } from '../../core/locale.js';

/** "24" → [24, 24]; "16,32" → [16, 32] (x = mép trái/phải, y = mép trên/dưới); sai → null */
export function parseOffset(value) {
  if (value === null || value === undefined || value === '') return null;
  const [a, b] = String(value).split(',').map((v) => parseFloat(v));
  if (!Number.isFinite(a)) return null;
  return [a, Number.isFinite(b) ? b : a];
}

/** Ghi offset vào 2 biến nội bộ trên host (vd: --_fb-x / --_fb-y); không có → xóa để dùng biến công khai */
export function applyOffset(host, value, prefix) {
  const xy = parseOffset(value);
  if (xy) {
    host.style.setProperty(`--_${prefix}-x`, `${xy[0]}px`);
    host.style.setProperty(`--_${prefix}-y`, `${xy[1]}px`);
  } else {
    host.style.removeProperty(`--_${prefix}-x`);
    host.style.removeProperty(`--_${prefix}-y`);
  }
}

/**
 * Chuỗi locale có dự phòng tại chỗ: locale.js chưa có key → lấy từ `fallback[vi|en]`.
 * @param {string} key - vd: 'contactFloat.phone'
 * @param {{vi: string, en: string}} fallback
 * @param {Record<string, any>} [vars] - thay {biến}
 */
export function tr(key, fallback, vars) {
  let value = t(key, vars);
  if (value === key) {
    value = fallback[getLocaleName()] ?? fallback.en;
    if (vars) value = value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  }
  return value;
}

/** Thời lượng motion (ms) đọc từ token --hui-motion-duration */
export function motionDuration(el) {
  const raw = getComputedStyle(el).getPropertyValue('--hui-motion-duration').trim();
  const ms = parseFloat(raw);
  if (!Number.isFinite(ms)) return 200;
  return raw.endsWith('ms') ? ms : raw.endsWith('s') ? ms * 1000 : ms;
}
