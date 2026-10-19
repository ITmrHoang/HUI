/**
 * Motion — hiệu ứng vào/ra dùng chung (Web Animations API, không cần CSS keyframes riêng).
 *   await animateIn(panel, 'zoom');
 *   await animateOut(panel, 'fade');   // xong mới ẩn phần tử
 *   await collapse(body, false);       // đóng mở theo chiều cao (accordion)
 * Tôn trọng `prefers-reduced-motion`: người dùng tắt chuyển động → chạy tức thì.
 * Thời lượng mặc định đọc từ biến CSS --hui-motion-duration (ms), có thể override toàn cục.
 */

const EASE_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
const EASE_IN = 'cubic-bezier(0.55, 0.055, 0.675, 0.19)';
const EASE_IN_OUT = 'cubic-bezier(0.645, 0.045, 0.355, 1)';

/** Keyframes trạng thái "ẩn" của từng preset (trạng thái hiện = giá trị tự nhiên) */
const PRESETS = {
  fade: { opacity: 0 },
  zoom: { opacity: 0, transform: 'scale(0.85)' },
  'zoom-big': { opacity: 0, transform: 'scale(0.6)' },
  'slide-up': { opacity: 0, transform: 'translateY(8px)' },
  'slide-down': { opacity: 0, transform: 'translateY(-8px)' },
  'slide-left': { opacity: 0, transform: 'translateX(8px)' },
  'slide-right': { opacity: 0, transform: 'translateX(-8px)' },
  // Drawer: trượt hẳn từ mép màn hình
  'move-left': { transform: 'translateX(-100%)' },
  'move-right': { transform: 'translateX(100%)' },
  'move-up': { transform: 'translateY(-100%)' },
  'move-down': { transform: 'translateY(100%)' },
};

const VISIBLE = { opacity: 1, transform: 'none' };

/** Animation đang chạy của từng phần tử — mở/đóng liên tục thì hủy cái cũ */
const running = new WeakMap();

export function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function defaultDuration(el) {
  const raw = getComputedStyle(el).getPropertyValue('--hui-motion-duration').trim();
  const ms = parseFloat(raw);
  return Number.isFinite(ms) ? (raw.endsWith('s') && !raw.endsWith('ms') ? ms * 1000 : ms) : 200;
}

/**
 * Chạy animation, hủy animation cũ của cùng phần tử.
 * `keepEnd` = true (dùng cho animateOut): giữ trạng thái cuối tới khi caller ẩn phần tử xong,
 * rồi caller gọi `release()` để gỡ — nếu không, phần tử hiện lại sau này vẫn bị "đóng băng" ở trạng thái ẩn.
 */
function run(el, keyframes, options, keepEnd = false) {
  running.get(el)?.cancel();
  if (prefersReducedMotion() || typeof el.animate !== 'function') return Promise.resolve();
  const anim = el.animate(keyframes, { duration: defaultDuration(el), fill: keepEnd ? 'forwards' : 'none', ...options });
  running.set(el, anim);
  return anim.finished.then(
    () => {
      if (running.get(el) === anim) running.delete(el);
      // Nhường 1 frame cho caller đặt hidden/display:none trước khi gỡ trạng thái cuối (tránh nháy)
      if (keepEnd) requestAnimationFrame(() => anim.cancel());
    },
    () => {} // Bị cancel do mở/đóng tiếp → bỏ qua
  );
}

/**
 * Hiệu ứng xuất hiện. `origin` (vd: 'top left') đặt transform-origin cho zoom
 * — dropdown nên zoom ra từ phía nút bấm.
 */
export function animateIn(el, preset = 'fade', { duration, origin } = {}) {
  const from = PRESETS[preset] || PRESETS.fade;
  if (origin) el.style.transformOrigin = origin;
  const to = Object.fromEntries(Object.keys(from).map((k) => [k, VISIBLE[k]]));
  return run(el, [from, to], { duration, easing: EASE_OUT });
}

/** Hiệu ứng biến mất. Giữ trạng thái cuối cho tới khi caller ẩn phần tử (tránh nháy). */
export function animateOut(el, preset = 'fade', { duration, origin } = {}) {
  const to = PRESETS[preset] || PRESETS.fade;
  if (origin) el.style.transformOrigin = origin;
  const from = Object.fromEntries(Object.keys(to).map((k) => [k, VISIBLE[k]]));
  return run(el, [from, to], { duration, easing: EASE_IN }, true);
}

/**
 * Mở/đóng theo chiều cao (height auto không animate được bằng CSS thuần):
 * đo scrollHeight rồi animate giữa 0 ↔ chiều cao thật.
 * @param {HTMLElement} el
 * @param {boolean} open - true = mở ra, false = thu lại
 */
export function collapse(el, open, { duration } = {}) {
  const full = `${el.scrollHeight}px`;
  el.style.overflow = 'hidden';
  const frames = open
    ? [{ height: '0px', opacity: 0 }, { height: full, opacity: 1 }]
    : [{ height: full, opacity: 1 }, { height: '0px', opacity: 0 }];
  return run(el, frames, { duration, easing: EASE_IN_OUT }).then(() => {
    el.style.overflow = '';
  });
}

export const motionPresets = Object.keys(PRESETS);
