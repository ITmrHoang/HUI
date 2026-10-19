/**
 * Hiệu ứng tương tác gắn lên phần tử bất kỳ (kể cả component hui-*):
 *   attachRipple(el)              — gợn sóng mực lan từ vị trí bấm (chuột, chạm, Enter/Space)
 *   attachMagnetic(el, {strength}) — phần tử bị "hút" nhẹ theo con trỏ
 *   attachPress(el, {scale})       — nhún nhỏ lại khi nhấn
 * Mỗi hàm trả về hàm gỡ. Kiểm tra giảm chuyển động ở MỖI lần tương tác → bật/tắt
 * html[data-hui-no-animation] có tác dụng ngay, không cần gắn lại.
 */

import { animationsDisabled } from '../utils/animate.js';

const EASE_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
/** Thẻ không chứa được phần tử con → không vẽ ripple bên trong được */
const VOID_TAGS = /^(INPUT|IMG|TEXTAREA|SELECT|BR|HR|VIDEO|CANVAS|IFRAME)$/;

/** Thiết bị có chuột/trackpad thật (hover được) */
export function canHover() {
  return typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function isDisabled(el) {
  return el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.matches?.(':disabled') || false;
}

/** Transform không áp lên phần tử inline → chuyển sang inline-block (ghi nhớ để trả lại) */
function ensureTransformable(el) {
  if (getComputedStyle(el).display !== 'inline') return () => {};
  const prev = el.style.display;
  el.style.display = 'inline-block';
  return () => { el.style.display = prev; };
}

/**
 * Bề mặt vẽ ripple: component hui-* có Shadow DOM thì lấy khung chính (part="base"),
 * để sóng bo đúng góc của nút bên trong thay vì hình chữ nhật của host.
 */
function surfaceOf(el, target) {
  if (target) return target;
  return el.shadowRoot?.querySelector('[part~="base"]') || el;
}

/**
 * Gợn sóng mực từ vị trí bấm.
 * @param {HTMLElement} el
 * @param {object} [opts]
 * @param {string} [opts.color] - màu sóng (mặc định: --hui-ripple-color hoặc màu chữ của bề mặt)
 * @param {number} [opts.duration=550] - thời gian lan (ms)
 * @param {boolean} [opts.center=false] - luôn lan từ tâm
 * @param {HTMLElement} [opts.target] - bề mặt vẽ (mặc định tự tìm part="base" trong Shadow DOM)
 * @returns {() => void}
 */
export function attachRipple(el, { color, duration = 550, center = false, target } = {}) {
  if (!el || VOID_TAGS.test(el.tagName)) return () => {};
  let restorePosition = null;
  const live = new Set();

  const spawn = (clientX, clientY) => {
    if (animationsDisabled() || isDisabled(el)) return null;
    const surface = surfaceOf(el, target);
    const parent = el.shadowRoot || el;
    const cs = getComputedStyle(el);
    if (cs.position === 'static' && !restorePosition) {
      const prev = el.style.position;
      el.style.position = 'relative';
      restorePosition = () => { el.style.position = prev; };
    }
    const hostRect = el.getBoundingClientRect();
    const rect = surface.getBoundingClientRect();
    const sCs = getComputedStyle(surface);
    const layer = document.createElement('span');
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('data-hui-ripple-layer', '');
    // Toạ độ absolute tính từ mép trong viền của host
    Object.assign(layer.style, {
      position: 'absolute',
      left: `${rect.left - hostRect.left - el.clientLeft}px`,
      top: `${rect.top - hostRect.top - el.clientTop}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      borderRadius: sCs.borderRadius,
      overflow: 'hidden',
      pointerEvents: 'none',
      contain: 'strict',
    });
    const x = center || clientX == null ? rect.width / 2 : clientX - rect.left;
    const y = center || clientY == null ? rect.height / 2 : clientY - rect.top;
    // Bán kính = khoảng cách tới góc xa nhất → sóng phủ kín bề mặt
    const r = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
    const wave = document.createElement('span');
    Object.assign(wave.style, {
      position: 'absolute',
      left: `${x - r}px`,
      top: `${y - r}px`,
      width: `${r * 2}px`,
      height: `${r * 2}px`,
      borderRadius: '50%',
      background: color || `var(--hui-ripple-color, ${sCs.color})`,
      opacity: 'var(--hui-ripple-opacity, 0.22)',
      transform: 'scale(0)',
    });
    layer.append(wave);
    parent.append(layer);
    const started = performance.now();
    const grow = wave.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration, easing: EASE_OUT, fill: 'forwards' });
    const item = {
      layer,
      release() {
        // Nhả sớm: vẫn để sóng lan được ~40% rồi mới mờ dần (tránh "chớp" mất)
        const wait = Math.max(0, duration * 0.4 - (performance.now() - started));
        setTimeout(() => {
          const from = getComputedStyle(wave).opacity;
          wave.animate([{ opacity: from }, { opacity: 0 }], { duration: 320, easing: 'linear', fill: 'forwards' })
            .finished.catch(() => {}).then(() => {
              grow.cancel();
              layer.remove();
              live.delete(item);
            });
        }, wait);
      },
    };
    live.add(item);
    return item;
  };

  let pressing = [];
  const releaseAll = () => {
    pressing.forEach((w) => w.release());
    pressing = [];
  };
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const w = spawn(e.clientX, e.clientY);
    if (w) {
      pressing.push(w);
      document.addEventListener('pointerup', releaseAll, { once: true });
      document.addEventListener('pointercancel', releaseAll, { once: true });
    }
  };
  // Bàn phím: chỉ khi chính phần tử đang focus (không bắt phím gõ trong ô nhập bên trong)
  const onKeyDown = (e) => {
    if (e.repeat || e.target !== el || (e.key !== 'Enter' && e.key !== ' ')) return;
    const w = spawn(null, null);
    if (w) {
      // Enter kích hoạt ngay → nhả luôn; Space kích hoạt khi nhả phím
      if (e.key === 'Enter') w.release();
      else pressing.push(w);
    }
  };
  const onKeyUp = (e) => {
    if (e.key === ' ') releaseAll();
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('keydown', onKeyDown);
  el.addEventListener('keyup', onKeyUp);
  return () => {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('keydown', onKeyDown);
    el.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('pointerup', releaseAll);
    document.removeEventListener('pointercancel', releaseAll);
    live.forEach((w) => w.layer.remove());
    live.clear();
    restorePosition?.();
    restorePosition = null;
  };
}

/**
 * Phần tử bị hút nhẹ theo con trỏ (nút CTA "nam châm"). Dùng thuộc tính `translate`
 * nên không đè lên `transform` sẵn có (tilt, scale…). Chỉ chạy trên thiết bị có chuột.
 * @param {HTMLElement} el
 * @param {object} [opts]
 * @param {number} [opts.strength=0.3] - tỉ lệ đi theo (0–1) so với khoảng cách con trỏ ↔ tâm
 * @param {number} [opts.max=24] - dịch chuyển tối đa (px)
 * @param {boolean} [opts.force=false] - chạy cả khi thiết bị không có hover (dùng cho test/demo)
 * @returns {() => void}
 */
export function attachMagnetic(el, { strength = 0.3, max = 24, force = false } = {}) {
  if (!el || (!force && !canHover())) return () => {};
  const restoreDisplay = ensureTransformable(el);
  let tx = 0;
  let ty = 0;
  let cx = 0;
  let cy = 0;
  let frame = 0;
  let rect = null;

  // Nội suy về đích mỗi frame → mượt, không cần CSS transition (không đè transition của người dùng)
  const step = () => {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;
    if (Math.abs(tx - cx) < 0.1 && Math.abs(ty - cy) < 0.1) {
      cx = tx;
      cy = ty;
      frame = 0;
    } else frame = requestAnimationFrame(step);
    el.style.translate = cx === 0 && cy === 0 ? '' : `${cx.toFixed(2)}px ${cy.toFixed(2)}px`;
  };
  const kick = () => { if (!frame) frame = requestAnimationFrame(step); };
  const clamp = (v) => Math.max(-max, Math.min(max, v));

  const onEnter = () => { rect = null; };
  const onMove = (e) => {
    if (animationsDisabled() || isDisabled(el)) return;
    // Đo khi chưa dịch (trừ phần đang dịch) để tâm không "chạy theo" chính nó
    if (!rect) {
      const r = el.getBoundingClientRect();
      rect = { cx: r.left + r.width / 2 - cx, cy: r.top + r.height / 2 - cy };
    }
    tx = clamp((e.clientX - rect.cx) * strength);
    ty = clamp((e.clientY - rect.cy) * strength);
    kick();
  };
  const onLeave = () => {
    tx = 0;
    ty = 0;
    rect = null;
    kick();
  };

  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  return () => {
    cancelAnimationFrame(frame);
    frame = 0;
    el.style.translate = '';
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    restoreDisplay();
  };
}

/**
 * Nhún nhỏ lại khi nhấn (chuột, chạm, Space/Enter). Dùng Web Animations trên thuộc tính `scale`
 * → không đổi style inline, không đè `transform`.
 * @param {HTMLElement} el
 * @param {object} [opts]
 * @param {number} [opts.scale=0.96] - tỉ lệ khi nhấn
 * @returns {() => void}
 */
export function attachPress(el, { scale = 0.96 } = {}) {
  if (!el) return () => {};
  const restoreDisplay = ensureTransformable(el);
  let anim = null;

  const press = () => {
    if (anim || animationsDisabled() || isDisabled(el) || typeof el.animate !== 'function') return;
    anim = el.animate([{ scale: 1 }, { scale: String(scale) }], { duration: 110, easing: EASE_OUT, fill: 'forwards' });
    document.addEventListener('pointerup', release, { once: true });
    document.addEventListener('pointercancel', release, { once: true });
  };
  const release = () => {
    if (!anim) return;
    const current = getComputedStyle(el).scale;
    anim.cancel();
    anim = null;
    // Bật nhẹ về 1 (hơi vượt quá rồi về) cho cảm giác đàn hồi
    el.animate([{ scale: current === 'none' ? String(scale) : current }, { scale: '1.015' }, { scale: '1' }], { duration: 260, easing: 'ease-out' });
  };
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    press();
  };
  const onKeyDown = (e) => {
    if (!e.repeat && e.target === el && (e.key === ' ' || e.key === 'Enter')) press();
  };
  const onKeyUp = (e) => {
    if (e.key === ' ' || e.key === 'Enter') release();
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('keydown', onKeyDown);
  el.addEventListener('keyup', onKeyUp);
  return () => {
    anim?.cancel();
    anim = null;
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('keydown', onKeyDown);
    el.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('pointerup', release);
    document.removeEventListener('pointercancel', release);
    restoreDisplay();
  };
}
