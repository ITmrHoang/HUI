/**
 * Foundations/Motion — trình diễn toàn bộ hệ thống hiệu ứng (A7): preset xuất hiện, hover/press,
 * ripple / magnetic, phản hồi vui, hiệu ứng chữ, nền, view transition + bảng token motion.
 * Nút "Giảm chuyển động" bật <html data-hui-no-animation> để thử trạng thái tắt hiệu ứng.
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import { enableAnimations, playAnimation, ANIMATIONS } from '../../utils/animate.js';
import { ensureTokens } from '../../utils/dom.js';
import {
  enableEffects, confetti, clearConfetti, burst, shake, viewTransition, VIEW_TRANSITION_TYPES,
} from '../../effects/index.js';
import '../hui-button/index.js';
import '../hui-input/index.js';
import '../hui-card/index.js';
import '../hui-typewriter/index.js';
import '../hui-text-rotate/index.js';
import '../hui-gradient-text/index.js';
import '../hui-split-text/index.js';
import '../hui-gradient-bg/index.js';
import '../hui-blob/index.js';
import '../hui-pattern/index.js';
import '../hui-parallax/index.js';
import '../hui-confetti/index.js';

const MOTION_TOKENS = [
  ['--hui-motion-duration-fast', 'Hover, đổi màu nhỏ'],
  ['--hui-motion-duration', 'Mặc định (motion.js đọc token này; đặt 0ms để tắt mọi hiệu ứng)'],
  ['--hui-motion-duration-slow', 'Mở panel, hover lift / scale'],
  ['--hui-motion-ease-out', 'Phần tử xuất hiện'],
  ['--hui-motion-ease-in', 'Phần tử biến mất'],
  ['--hui-motion-ease-in-out', 'Di chuyển / chuyển cảnh'],
];

export default {
  title: 'Foundations/Motion',
  // Rời story → luôn bật lại hiệu ứng (nút giảm chuyển động không "dính" sang story khác)
  beforeEach() {
    return () => document.documentElement.removeAttribute('data-hui-no-animation');
  },
  parameters: {
    docs: {
      description: {
        component: `
Hệ thống hiệu ứng của H-UI: **Web Animations API + CSS**, không thư viện ngoài. Mọi hiệu ứng tự tắt khi
người dùng bật *giảm chuyển động* (\`prefers-reduced-motion\`), khi \`<html data-hui-no-animation>\`, hoặc token \`--hui-motion-duration: 0ms\`.

| Nhóm | Dùng | Nằm ở |
|------|------|-------|
| Xuất hiện khi cuộn | \`data-hui-animate="fade-up"\` · \`<hui-reveal>\` | bundle chính / \`core\` (\`enableAnimations()\`) |
| Hover / nhấn | \`.hui-hover-lift\` · \`.hui-hover-glow\` · \`.hui-hover-scale\` · \`.hui-press\` · \`data-hui-ripple\` · \`data-hui-magnetic\` · \`data-hui-press\` · \`data-hui-tilt\` · \`data-hui-glow\` | \`@itmrhoang/h-ui/effects\` (\`enableEffects()\`) |
| JS | \`attachRipple\` · \`attachMagnetic\` · \`attachPress\` · \`attachTilt\` · \`attachGlow\` | \`effects\` |
| Phản hồi vui | \`confetti(opts)\` · \`burst(el, {icon})\` · \`shake(el)\` · \`<hui-confetti>\` | \`effects\` |
| Chuyển cảnh | \`viewTransition(updateFn, { type })\` | \`effects\` |
| Chữ | \`<hui-typewriter>\` · \`<hui-text-rotate>\` · \`<hui-gradient-text>\` · \`<hui-split-text>\` | component |
| Nền | \`<hui-gradient-bg>\` · \`<hui-blob>\` · \`<hui-pattern>\` · \`<hui-parallax>\` | component |

\`\`\`js
import { enableEffects, confetti, viewTransition } from '@itmrhoang/h-ui/effects';
enableEffects();   // bật data-hui-ripple / magnetic / press / tilt / glow + chèn class .hui-hover-*
\`\`\`
\`\`\`html
<button class="hui-hover-lift" data-hui-ripple data-hui-press>Lift + ripple + press</button>
<a data-hui-magnetic="0.4" href="#">Nút nam châm</a>
<hui-button data-hui-ripple>Ripple trên component</hui-button>
\`\`\`
        `,
      },
    },
  },
};

// ── Dùng chung ────────────────────────────────────────────────────────────
const CSS = html`<style>
  .mo { font-family: var(--hui-font-family); color: var(--hui-text); display: grid; gap: 20px; }
  .mo h3 { margin: 0; font-size: 1.05rem; }
  .mo p.hint { margin: 0; color: var(--hui-text-secondary); font-size: 0.875rem; }
  .mo-bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 10px 14px; border-radius: 12px;
    background: var(--hui-bg-secondary); border: 1px solid var(--hui-border-secondary); }
  .mo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .mo-tile { padding: 22px 12px; border-radius: 12px; background: var(--hui-bg-container); border: 1px solid var(--hui-border);
    text-align: center; font-weight: 600; cursor: pointer; user-select: none; }
  .mo-tile:focus-visible { outline: 2px solid var(--hui-primary); outline-offset: 2px; }
  .mo-chip { padding: 18px 12px; border-radius: 12px; background: var(--hui-primary-1); color: var(--hui-primary-7);
    text-align: center; font-weight: 600; }
  .mo-btn { font: 600 14px var(--hui-font-family); padding: 10px 18px; border-radius: var(--hui-radius); border: 0; cursor: pointer;
    background: var(--hui-primary); color: var(--hui-text-light-solid); }
  .mo-btn--ghost { background: var(--hui-fill-secondary); color: var(--hui-text); }
  .mo-btn:focus-visible { outline: 2px solid var(--hui-primary); outline-offset: 2px; }
  .mo table { border-collapse: collapse; width: 100%; font-size: 0.875rem; }
  .mo th, .mo td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--hui-border-secondary); vertical-align: middle; }
  .mo code { font-family: var(--hui-font-mono); font-size: 0.8125rem; }
  .mo-track { position: relative; width: 160px; height: 8px; border-radius: 4px; background: var(--hui-fill-secondary); }
  .mo-dot { position: absolute; top: -4px; left: 0; width: 16px; height: 16px; border-radius: 50%; background: var(--hui-primary); }
</style>`;

/** Thanh bật/tắt giảm chuyển động — đặt <html data-hui-no-animation> */
const motionToggle = () => {
  const on = document.documentElement.hasAttribute('data-hui-no-animation');
  return html`
    <div class="mo-bar">
      <button class="mo-btn mo-btn--ghost" data-motion-toggle aria-pressed=${String(on)} @click=${(e) => {
        const root = document.documentElement;
        root.toggleAttribute('data-hui-no-animation');
        const off = root.hasAttribute('data-hui-no-animation');
        e.currentTarget.setAttribute('aria-pressed', String(off));
        e.currentTarget.textContent = off ? '▶ Bật lại hiệu ứng' : '⏸ Giảm chuyển động';
      }}>${on ? '▶ Bật lại hiệu ứng' : '⏸ Giảm chuyển động'}</button>
      <span class="hint" style="color: var(--hui-text-secondary); font-size: 0.875rem">
        Đặt <code>&lt;html data-hui-no-animation&gt;</code> — giống người dùng bật "giảm chuyển động" trong hệ điều hành.
      </span>
    </div>`;
};

// ── Stories ───────────────────────────────────────────────────────────────

/** Bảng token motion + nút thử easing / thời lượng */
export const Tokens = {
  render: () => {
    ensureTokens(); // token gắn vào <head> khi component đầu tiên chạy — ở đây đọc trước nên tự gắn
    const cs = getComputedStyle(document.documentElement);
    const play = (e, name) => {
      const dot = e.currentTarget.closest('tr').querySelector('.mo-dot');
      const isEase = name.includes('ease');
      const duration = isEase ? 900 : parseFloat(cs.getPropertyValue(name)) || 200;
      const easing = isEase ? cs.getPropertyValue(name).trim() : cs.getPropertyValue('--hui-motion-ease-in-out').trim();
      if (document.documentElement.hasAttribute('data-hui-no-animation')) return;
      dot.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(144px)' }], { duration, easing, fill: 'none' });
    };
    return html`${CSS}
      <div class="mo">
        ${motionToggle()}
        <table>
          <thead><tr><th>Token</th><th>Giá trị</th><th>Dùng cho</th><th>Thử</th></tr></thead>
          <tbody>
            ${MOTION_TOKENS.map(([name, use]) => html`
              <tr data-token=${name}>
                <td><code>${name}</code></td>
                <td><code class="value">${cs.getPropertyValue(name).trim()}</code></td>
                <td>${use}</td>
                <td style="display: flex; gap: 10px; align-items: center">
                  <button class="mo-btn mo-btn--ghost" style="padding: 4px 10px" aria-label="Chạy thử ${name}" @click=${(e) => play(e, name)}>▶</button>
                  <span class="mo-track" aria-hidden="true"><span class="mo-dot"></span></span>
                </td>
              </tr>`)}
          </tbody>
        </table>
        <p class="hint">Đổi toàn hệ thống một chỗ: <code>:root { --hui-motion-duration: 300ms; }</code> — đặt <code>0ms</code> để tắt mọi hiệu ứng.</p>
      </div>`;
  },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector('[data-token="--hui-motion-duration"]');
    await expect(row.querySelector('.value').textContent).toBe('200ms');
    await expect(canvasElement.querySelectorAll('tbody tr').length).toBe(MOTION_TOKENS.length);
    // Nút giảm chuyển động bật/tắt <html data-hui-no-animation>
    const toggle = canvasElement.querySelector('[data-motion-toggle]');
    await userEvent.click(toggle);
    await expect(document.documentElement.hasAttribute('data-hui-no-animation')).toBe(true);
    await expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(toggle);
    await expect(document.documentElement.hasAttribute('data-hui-no-animation')).toBe(false);
  },
};

/** Mọi preset của data-hui-animate — bấm một ô để chạy lại */
export const EntrancePresets = {
  render: () => {
    queueMicrotask(() => enableAnimations());
    return html`${CSS}
      <div class="mo">
        ${motionToggle()}
        <p class="hint">Gắn <code>data-hui-animate="tên"</code> lên thẻ bất kỳ → chạy khi cuộn tới. Bấm ô để chạy lại.</p>
        <div class="mo-grid mo-presets">
          ${Object.keys(ANIMATIONS).map((name, i) => html`
            <div class="mo-chip" role="button" tabindex="0" data-hui-animate=${name} data-hui-delay=${i * 50}
              @click=${(e) => playAnimation(e.currentTarget)}
              @keydown=${(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playAnimation(e.currentTarget); } }}>${name}</div>`)}
        </div>
        <h3>Stagger — các con hiện lần lượt</h3>
        <div class="mo-grid" data-hui-animate="zoom-in" data-hui-stagger="90">
          ${[1, 2, 3, 4, 5, 6].map((n) => html`<div class="mo-chip">Mục ${n}</div>`)}
        </div>
      </div>`;
  },
  play: async ({ canvasElement }) => {
    const chips = canvasElement.querySelectorAll('.mo-presets [data-hui-animate]');
    await expect(chips.length).toBe(Object.keys(ANIMATIONS).length);
    await waitFor(() => expect(chips[0].hasAttribute('data-hui-animated')).toBe(true));
  },
};

/** Class hover + ripple / magnetic / press (directive) */
export const HoverAndPress = {
  render: () => {
    queueMicrotask(() => enableEffects());
    return html`${CSS}
      <div class="mo">
        ${motionToggle()}
        <h3>Class hover (thuần CSS, chèn 1 lần bởi enableEffects())</h3>
        <div class="mo-grid">
          <div class="mo-tile hui-hover-lift" tabindex="0">.hui-hover-lift</div>
          <div class="mo-tile hui-hover-glow" tabindex="0">.hui-hover-glow</div>
          <div class="mo-tile hui-hover-scale" tabindex="0">.hui-hover-scale</div>
          <div class="mo-tile hui-press" tabindex="0">.hui-press (:active)</div>
        </div>
        <h3>Directive (data-hui-*) — gắn được lên cả component hui-*</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center">
          <button class="mo-btn" data-hui-ripple id="rp">data-hui-ripple</button>
          <button class="mo-btn mo-btn--ghost" data-hui-ripple="var(--hui-primary)" data-hui-ripple-center>ripple tâm, màu primary</button>
          <hui-button data-hui-ripple id="rp-hui">hui-button + ripple</hui-button>
          <hui-button variant="outline" data-hui-ripple data-hui-press>ripple + press</hui-button>
          <button class="mo-btn" data-hui-magnetic="0.4">data-hui-magnetic="0.4"</button>
          <hui-button variant="dashed" data-hui-magnetic="0.6" data-hui-press="0.92">magnetic + press</hui-button>
          <button class="mo-btn mo-btn--ghost" data-hui-press="0.9" id="pr">data-hui-press="0.9"</button>
        </div>
        <div class="mo-grid">
          <hui-card title="Card ripple" data-hui-ripple class="hui-hover-lift">Bấm vào card — sóng bo theo góc card.</hui-card>
          <div class="mo-tile" data-hui-tilt="12" data-hui-glow style="padding: 40px 12px">data-hui-tilt + glow</div>
        </div>
        <p class="hint">Magnetic / tilt / glow chỉ chạy với chuột (thiết bị cảm ứng không có hover). Ripple chạy cả với chạm và Enter/Space.</p>
      </div>`;
  },
  play: async ({ canvasElement }) => {
    await new Promise((r) => setTimeout(r, 50));
    const down = (el) => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5, pointerType: 'mouse', button: 0 }));
    const btn = canvasElement.querySelector('#rp');
    down(btn);
    await expect(btn.querySelector('[data-hui-ripple-layer]')).toBeTruthy();
    // Component có Shadow DOM: sóng vẽ trong shadowRoot (bo theo part="base")
    const hb = canvasElement.querySelector('#rp-hui');
    down(hb);
    await expect(hb.shadowRoot.querySelector('[data-hui-ripple-layer]')).toBeTruthy();
    const pr = canvasElement.querySelector('#pr');
    down(pr);
    await expect(pr.getAnimations().length).toBeGreaterThan(0);
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    await expect(document.querySelectorAll('style[data-hui-effects]').length).toBe(1);
  },
};

/** confetti() · burst() · shake() · <hui-confetti> */
export const Feedback = {
  render: () => html`${CSS}
    <div class="mo">
      ${motionToggle()}
      <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding-top: 40px">
        <button class="mo-btn" id="cf" @click=${(e) => confetti({ origin: e.currentTarget })}>confetti()</button>
        <button class="mo-btn mo-btn--ghost" @click=${() => {
          confetti({ origin: { x: 0, y: 0.7 }, angle: 60, spread: 55, count: 80 });
          confetti({ origin: { x: 1, y: 0.7 }, angle: 120, spread: 55, count: 80 });
        }}>Hai bên màn hình</button>
        <button class="mo-btn mo-btn--ghost" id="heart" aria-label="Thích" @click=${(e) => burst(e.currentTarget, { icon: 'heart' })}>♥ burst heart</button>
        <button class="mo-btn mo-btn--ghost" @click=${(e) => burst(e.currentTarget, { icon: 'star', count: 10, distance: 60 })}>★ burst star</button>
        <hui-confetti colors="success, info"><hui-button>&lt;hui-confetti&gt;</hui-button></hui-confetti>
      </div>
      <form style="display: flex; gap: 8px; align-items: end; max-width: 420px" @submit=${(e) => {
        e.preventDefault();
        const input = e.currentTarget.querySelector('hui-input');
        if (!String(input.value || '').includes('@')) shake(input);
        else confetti({ origin: input, count: 60 });
      }}>
        <hui-input id="email" label="Email (sai → rung)" placeholder="ban@vidu.com" style="flex: 1"></hui-input>
        <button class="mo-btn" type="submit" id="send">Gửi</button>
      </form>
    </div>`,
  play: async ({ canvasElement }) => {
    const disabled = document.documentElement.hasAttribute('data-hui-no-animation') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    await userEvent.click(canvasElement.querySelector('#cf'));
    if (!disabled) await expect(document.querySelector('canvas[data-hui-confetti]')).toBeTruthy();
    clearConfetti();
    await userEvent.click(canvasElement.querySelector('#heart'));
    if (!disabled) await expect(document.querySelector('[data-hui-burst]')).toBeTruthy();
    await userEvent.click(canvasElement.querySelector('#send'));
    const input = canvasElement.querySelector('#email');
    if (!disabled) await expect(input.getAnimations().length).toBe(1);
    // Giảm chuyển động → mọi hàm là no-op
    document.documentElement.setAttribute('data-hui-no-animation', '');
    await confetti();
    await expect(document.querySelector('canvas[data-hui-confetti]')).toBeNull();
    document.documentElement.removeAttribute('data-hui-no-animation');
  },
};

/** Hiệu ứng chữ */
export const TextEffects = {
  render: () => html`${CSS}
    <div class="mo">
      ${motionToggle()}
      <h2 style="font: 800 34px/1.3 var(--hui-font-family); margin: 0">
        <hui-gradient-text>H-UI</hui-gradient-text> giúp làm web
        <hui-typewriter words='["nhanh hơn","đẹp hơn","dễ tiếp cận hơn"]' loop></hui-typewriter>
      </h2>
      <p style="font: 600 22px var(--hui-font-family); margin: 0">
        Chạy được với <hui-text-rotate words="HTML thuần|React|Vue|Angular" effect="flip" interval="1800"></hui-text-rotate> mà không cần cấu hình.
      </p>
      <h3 style="font: 700 26px var(--hui-font-family)">
        <hui-split-text effect="fade-up" stagger="70">Từng từ hiện lần lượt khi cuộn tới</hui-split-text>
      </h3>
      <h3 style="font: 700 26px var(--hui-font-family)">
        <hui-split-text by="chars" effect="blur-in" stagger="25">Hoặc từng ký tự</hui-split-text>
      </h3>
    </div>`,
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelector('hui-split-text').revealed).toBe(true));
    await expect(canvasElement.querySelector('hui-typewriter').wordList.length).toBe(3);
  },
};

/** Nền & trang trí */
export const Backgrounds = {
  render: () => html`${CSS}
    <div class="mo">
      ${motionToggle()}
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px">
        <hui-gradient-bg style="--hui-gradient-bg-radius: 16px"><div style="padding: 48px 16px; text-align: center; font-weight: 700">hui-gradient-bg (mesh)</div></hui-gradient-bg>
        <hui-gradient-bg variant="linear" style="--hui-gradient-bg-radius: 16px"><div style="padding: 48px 16px; text-align: center; font-weight: 700">hui-gradient-bg (linear)</div></hui-gradient-bg>
        <hui-blob style="--hui-blob-radius: 16px; --hui-blob-bg: var(--hui-bg-container); border: 1px solid var(--hui-border); border-radius: 16px"><div style="padding: 48px 16px; text-align: center; font-weight: 700">hui-blob</div></hui-blob>
        <hui-pattern variant="dots" animated style="--hui-pattern-radius: 16px; border: 1px solid var(--hui-border); border-radius: 16px"><div style="padding: 48px 16px; text-align: center; font-weight: 700">hui-pattern (dots)</div></hui-pattern>
        <hui-pattern style="--hui-pattern-radius: 16px; border: 1px solid var(--hui-border); border-radius: 16px"><div style="padding: 48px 16px; text-align: center; font-weight: 700">hui-pattern (grid)</div></hui-pattern>
        <hui-pattern variant="lines" fade="edges" style="--hui-pattern-radius: 16px; border: 1px solid var(--hui-border); border-radius: 16px"><div style="padding: 48px 16px; text-align: center; font-weight: 700">hui-pattern (lines)</div></hui-pattern>
      </div>
      <div style="height: 300px; overflow: auto; border-radius: 16px; border: 1px dashed var(--hui-border)">
        <div style="height: 120px; display: grid; place-items: center; color: var(--hui-text-secondary)">hui-parallax — cuộn trong khung ↓</div>
        <hui-parallax style="height: 260px; background: var(--hui-primary-1)">
          <hui-pattern data-layer data-speed="0.5" variant="grid" size="32" color="primary-3" fade="none"></hui-pattern>
          <div data-speed="-0.2" style="padding-top: 100px; text-align: center; font: 800 28px var(--hui-font-family)">Lớp trước trôi nhanh hơn</div>
        </hui-parallax>
        <div style="height: 400px"></div>
      </div>
    </div>`,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('hui-gradient-bg, hui-blob, hui-pattern, hui-parallax').length).toBe(8);
    // Giảm chuyển động → nền CSS đứng yên ngay (component tự theo dõi html[data-hui-no-animation])
    const blob = canvasElement.querySelector('hui-blob').shadowRoot.querySelector('.blob__item');
    document.documentElement.setAttribute('data-hui-no-animation', '');
    await waitFor(() => expect(getComputedStyle(blob).animationName).toBe('none'));
    document.documentElement.removeAttribute('data-hui-no-animation');
    await waitFor(() => expect(getComputedStyle(blob).animationName).not.toBe('none'));
  },
};

/** viewTransition(): đổi list ↔ grid, các mục trượt về vị trí mới (shared element qua view-transition-name) */
export const ViewTransitions = {
  render: () => {
    let type = 'fade';
    const items = ['Áo thun', 'Cốc sứ', 'Sổ tay', 'Bút ký', 'Túi vải', 'Ô dù'];
    const toggle = (e) => {
      const list = e.currentTarget.closest('.mo').querySelector('.vt-list');
      viewTransition(() => list.classList.toggle('vt-list--grid'), { type });
    };
    const shuffle = (e) => {
      const list = e.currentTarget.closest('.mo').querySelector('.vt-list');
      viewTransition(() => list.append(...[...list.children].reverse()), { type });
    };
    return html`${CSS}
      <style>
        .vt-list { display: grid; gap: 8px; grid-template-columns: 1fr; list-style: none; padding: 0; margin: 0; }
        .vt-list--grid { grid-template-columns: repeat(3, 1fr); }
        .vt-list li { padding: 14px; border-radius: 10px; background: var(--hui-bg-container); border: 1px solid var(--hui-border); }
        .vt-list--grid li { padding: 28px 14px; text-align: center; background: var(--hui-primary-1); }
      </style>
      <div class="mo">
        ${motionToggle()}
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center">
          <button class="mo-btn" id="vt-toggle" @click=${toggle}>List ↔ Grid</button>
          <button class="mo-btn mo-btn--ghost" @click=${shuffle}>Đảo thứ tự</button>
          <label style="font-size: 0.875rem">type:
            <select @change=${(e) => { type = e.target.value; }} style="font: inherit; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--hui-border); background: var(--hui-bg-container); color: var(--hui-text)">
              ${VIEW_TRANSITION_TYPES.map((t) => html`<option value=${t}>${t}</option>`)}
            </select>
          </label>
          <span class="hint" style="color: var(--hui-text-secondary); font-size: 0.875rem">
            ${typeof document.startViewTransition === 'function' ? 'Trình duyệt hỗ trợ View Transitions.' : 'Trình duyệt chưa hỗ trợ → chỉ cập nhật, không hiệu ứng.'}
          </span>
        </div>
        <ul class="vt-list">
          ${items.map((name, i) => html`<li style="view-transition-name: hui-vt-demo-${i}">${name}</li>`)}
        </ul>
        <p class="hint">Trong lúc chuyển, <code>&lt;html data-hui-transition="type"&gt;</code> → viết CSS riêng:
          <code>:root[data-hui-transition="my-type"]::view-transition-new(root) { … }</code></p>
      </div>`;
  },
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('.vt-list');
    await userEvent.click(canvasElement.querySelector('#vt-toggle'));
    await waitFor(() => expect(list.classList.contains('vt-list--grid')).toBe(true));
    await waitFor(() => expect(document.documentElement.hasAttribute('data-hui-transition')).toBe(false), { timeout: 3000 });
    // Gọi trực tiếp: chờ xong mới resolve
    await viewTransition(() => list.classList.remove('vt-list--grid'), { type: 'slide-up' });
    await expect(list.classList.contains('vt-list--grid')).toBe(false);
  },
};
