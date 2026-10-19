/**
 * Phản hồi vui (zero-dependency):
 *   await confetti({ origin: buttonEl, count: 150 })   — pháo giấy vẽ bằng canvas
 *   burst(likeButton, { icon: 'heart' })               — hạt nổ quanh phần tử (thả tim, wishlist)
 *   shake(inputEl)                                     — rung ngang khi nhập sai
 * Giảm chuyển động / html[data-hui-no-animation] / token 0ms → không làm gì (Promise resolve ngay).
 */

import { animationsDisabled } from '../utils/animate.js';
import { parseColors, resolveColors } from './colors.js';

/**
 * Đưa lớp phủ lên top layer (popover="manual") để nằm trên cả <dialog> modal;
 * trình duyệt cũ: position fixed + z-index rất cao.
 */
function mountOverlay(node) {
  Object.assign(node.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    margin: '0',
    padding: '0',
    border: '0',
    background: 'transparent',
    overflow: 'visible',
    pointerEvents: 'none',
    zIndex: '2147483000',
    maxWidth: 'none',
    maxHeight: 'none',
  });
  node.setAttribute('aria-hidden', 'true');
  if ('popover' in HTMLElement.prototype) node.setAttribute('popover', 'manual');
  document.body.append(node);
  try { node.showPopover?.(); } catch { /* không hỗ trợ top layer → vẫn có z-index */ }
  return node;
}

/** {x, y} (px; ≤ 1 hiểu là tỉ lệ màn hình) hoặc phần tử (lấy tâm) → toạ độ viewport */
function resolveOrigin(origin) {
  const w = innerWidth;
  const h = innerHeight;
  if (origin && typeof origin.getBoundingClientRect === 'function') {
    const r = origin.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  const o = origin || { x: 0.5, y: 0.6 };
  const px = (v, size) => (Math.abs(v) <= 1 ? v * size : v);
  return { x: px(o.x ?? 0.5, w), y: px(o.y ?? 0.6, h) };
}

// ── Confetti: một canvas dùng chung cho mọi lần bắn đang chạy ─────────────
let engine = null;

function createEngine() {
  const canvas = mountOverlay(document.createElement('canvas'));
  canvas.setAttribute('data-hui-confetti', '');
  const ctx = canvas.getContext('2d');
  const state = { canvas, ctx, particles: [], frame: 0, waiters: [], dpr: 1 };
  const resize = () => {
    state.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(innerWidth * state.dpr);
    canvas.height = Math.round(innerHeight * state.dpr);
  };
  resize();
  window.addEventListener('resize', resize);
  state.dispose = () => {
    cancelAnimationFrame(state.frame);
    window.removeEventListener('resize', resize);
    try { canvas.hidePopover?.(); } catch { /* bỏ qua */ }
    canvas.remove();
    state.waiters.forEach((fn) => fn());
    engine = null;
  };
  let last = performance.now();
  const tick = (now) => {
    // dt chuẩn hoá theo 60fps; chặn trên để tab bị ẩn lâu không làm hạt "bay vọt"
    const dt = Math.min(3, (now - last) / 16.67);
    last = now;
    const { dpr } = state;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    state.particles = state.particles.filter((p) => {
      p.age += dt * 16.67;
      if (p.age >= p.life) return false;
      p.vx *= p.drag ** dt;
      p.vy = p.vy * p.drag ** dt + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.wobble += 0.1 * dt;
      const fade = 1 - Math.max(0, (p.age - p.life * 0.7) / (p.life * 0.3));
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x + Math.cos(p.wobble) * 2, p.y);
      ctx.rotate(p.rot);
      // Lật theo trục để giả lập mảnh giấy xoay 3D
      ctx.scale(1, Math.cos(p.wobble * 1.3));
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
      return p.y < innerHeight + 40;
    });
    if (state.particles.length) state.frame = requestAnimationFrame(tick);
    else state.dispose();
  };
  state.start = () => {
    if (state.frame) return; // đang chạy → hạt mới tự được vẽ ở frame kế
    last = performance.now();
    state.frame = requestAnimationFrame(tick);
  };
  return state;
}

/**
 * Bắn pháo giấy. Canvas phủ toàn màn hình được tạo khi cần và tự gỡ khi hạt cuối cùng rơi hết.
 * @param {object} [options]
 * @param {{x:number,y:number}|Element} [options.origin] - điểm bắn (px hoặc tỉ lệ 0–1; mặc định {x:.5,y:.6}) hoặc phần tử
 * @param {number} [options.count=120] - số mảnh
 * @param {number} [options.angle=90] - hướng bắn (độ, 90 = thẳng lên)
 * @param {number} [options.spread=70] - độ toả (độ)
 * @param {number} [options.velocity=13] - vận tốc đầu
 * @param {number} [options.gravity=0.35]
 * @param {number} [options.duration=2600] - tuổi thọ tối đa mỗi mảnh (ms)
 * @param {string|string[]} [options.colors] - màu / tên token (mặc định primary, info, success, warning, danger)
 * @param {Array<'rect'|'circle'>} [options.shapes]
 * @returns {Promise<void>} resolve khi canvas đã gỡ (mọi mảnh đã rơi hết)
 */
export function confetti(options = {}) {
  if (typeof document === 'undefined' || animationsDisabled()) return Promise.resolve();
  const {
    origin, count = 120, angle = 90, spread = 70, velocity = 13,
    gravity = 0.35, duration = 2600, colors, shapes = ['rect', 'rect', 'circle'],
  } = options;
  const palette = resolveColors(parseColors(colors), origin instanceof Element ? origin : undefined);
  const { x, y } = resolveOrigin(origin);
  if (!engine) engine = createEngine();
  const n = Math.max(1, Math.min(600, Math.round(count)));
  for (let i = 0; i < n; i++) {
    const a = ((angle + (Math.random() - 0.5) * spread) * Math.PI) / 180;
    const v = velocity * (0.55 + Math.random() * 0.6);
    engine.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: -Math.sin(a) * v,
      drag: 0.965,
      gravity,
      size: 6 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      wobble: Math.random() * 10,
      color: palette[i % palette.length],
      shape: shapes[Math.floor(Math.random() * shapes.length)] || 'rect',
      age: 0,
      life: duration * (0.75 + Math.random() * 0.25),
    });
  }
  const e = engine;
  e.start();
  return new Promise((resolve) => e.waiters.push(resolve));
}

/** Xoá ngay mọi pháo giấy đang bay */
export function clearConfetti() {
  engine?.dispose();
}

// ── Burst: hạt nổ quanh phần tử ──────────────────────────────────────────
const BURST_SHAPES = {
  heart: '<path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21Z"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/>',
  circle: '<circle cx="12" cy="12" r="8"/>',
};
const BURST_COLORS = { heart: 'danger', star: 'warning', circle: 'primary' };

/**
 * Nổ hạt nhỏ (tim / sao / chấm) toả tròn quanh phần tử.
 * @param {Element} element
 * @param {object} [opts]
 * @param {'heart'|'star'|'circle'} [opts.icon='heart']
 * @param {number} [opts.count=8]
 * @param {number} [opts.distance=48] - bán kính bay (px)
 * @param {number} [opts.size=14] - cỡ hạt (px)
 * @param {string|string[]} [opts.colors] - màu / tên token (mặc định theo icon: tim = danger, sao = warning)
 * @param {number} [opts.duration=700]
 * @returns {Promise<void>}
 */
export function burst(element, { icon = 'heart', count = 8, distance = 48, size = 14, colors, duration = 700 } = {}) {
  if (!element || typeof document === 'undefined' || animationsDisabled()) return Promise.resolve();
  const shape = BURST_SHAPES[icon] || BURST_SHAPES.heart;
  const palette = resolveColors(parseColors(colors, [BURST_COLORS[icon] || 'primary']), element);
  const { x, y } = resolveOrigin(element);
  const layer = mountOverlay(document.createElement('div'));
  layer.setAttribute('data-hui-burst', '');
  const n = Math.max(1, Math.min(40, Math.round(count)));
  const anims = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const d = distance * (0.7 + Math.random() * 0.5);
    const s = size * (0.7 + Math.random() * 0.6);
    const p = document.createElement('span');
    p.innerHTML = `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor">${shape}</svg>`;
    Object.assign(p.style, {
      position: 'absolute',
      left: `${x - s / 2}px`,
      top: `${y - s / 2}px`,
      width: `${s}px`,
      height: `${s}px`,
      color: palette[i % palette.length],
      lineHeight: '0',
    });
    layer.append(p);
    const dx = Math.cos(a) * d;
    const dy = Math.sin(a) * d;
    anims.push(p.animate([
      { transform: 'translate(0, 0) scale(0.2)', opacity: 1 },
      { transform: `translate(${dx * 0.7}px, ${dy * 0.7}px) scale(1.1)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy + 10}px) scale(0.6) rotate(${(Math.random() - 0.5) * 60}deg)`, opacity: 0 },
    ], { duration: duration * (0.85 + Math.random() * 0.3), easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)', fill: 'forwards' }));
  }
  return Promise.all(anims.map((an) => an.finished.catch(() => {}))).then(() => {
    try { layer.hidePopover?.(); } catch { /* bỏ qua */ }
    layer.remove();
  });
}

// ── Shake: rung ngang khi nhập sai ───────────────────────────────────────
/**
 * Rung ngang (Web Animations trên thuộc tính `translate`, không đè transform sẵn có).
 * @param {Element} element
 * @param {object} [opts]
 * @param {number} [opts.distance=6] - biên độ (px)
 * @param {number} [opts.duration=420]
 * @returns {Promise<void>}
 */
export function shake(element, { distance = 6, duration = 420 } = {}) {
  if (!element || typeof element.animate !== 'function' || animationsDisabled()) return Promise.resolve();
  const d = distance;
  const frames = [0, -d, d, -d * 0.66, d * 0.66, -d * 0.33, d * 0.33, 0].map((v) => ({ translate: `${v}px 0` }));
  return element.animate(frames, { duration, easing: 'ease-in-out' }).finished.then(() => {}, () => {});
}
