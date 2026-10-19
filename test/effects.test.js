import { describe, it, expect, afterEach } from 'vitest';
import {
  enableEffects, ensureEffectStyles, attachRipple, attachMagnetic, attachPress,
  confetti, clearConfetti, burst, shake, viewTransition, parseColors,
} from '../src/effects/index.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n = 2) => new Promise((r) => {
  const step = () => (n-- <= 0 ? r() : requestAnimationFrame(step));
  step();
});

afterEach(() => {
  clearConfetti();
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-hui-no-animation');
  document.documentElement.removeAttribute('data-hui-transition');
});

function box(style = 'width: 200px; height: 80px;') {
  const el = document.createElement('div');
  el.style.cssText = `position: fixed; left: 50px; top: 50px; ${style}`;
  document.body.append(el);
  return el;
}

const pointer = (el, type, x, y, extra = {}) => el.dispatchEvent(new PointerEvent(type, {
  bubbles: true, composed: true, clientX: x, clientY: y, button: 0, pointerType: 'mouse', ...extra,
}));

describe('effects — colors', () => {
  it('parseColors: tên token → var(), giữ màu có dấu phẩy trong ngoặc', () => {
    expect(parseColors('primary, info-5, rgb(1, 2, 3), #fff')).toEqual([
      'var(--hui-primary)', 'var(--hui-info-5)', 'rgb(1, 2, 3)', '#fff',
    ]);
    expect(parseColors('["danger","--brand"]')).toEqual(['var(--hui-danger)', 'var(--brand)']);
    expect(parseColors('', ['success'])).toEqual(['var(--hui-success)']);
  });
});

describe('effects — CSS tiện ích', () => {
  it('chèn CSS đúng 1 lần, có đủ class hover', () => {
    ensureEffectStyles();
    enableEffects();
    const styles = document.querySelectorAll('style[data-hui-effects]');
    expect(styles.length).toBe(1);
    for (const cls of ['.hui-hover-lift', '.hui-hover-glow', '.hui-hover-scale', '.hui-press']) {
      expect(styles[0].textContent).toContain(cls);
    }
  });
});

describe('effects — ripple', () => {
  it('nhấn chuột → sóng lan từ vị trí bấm, nhả → tự gỡ', async () => {
    const el = box();
    const stop = attachRipple(el, { duration: 120 });
    pointer(el, 'pointerdown', 60, 60);
    const layer = el.querySelector('[data-hui-ripple-layer]');
    expect(layer).toBeTruthy();
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    // Khung fixed → không bị đổi position; sóng nằm quanh điểm bấm (10, 10) so với góc phần tử
    const wave = layer.firstElementChild;
    const r = parseFloat(wave.style.width) / 2;
    expect(parseFloat(wave.style.left) + r).toBeCloseTo(10, 0);
    expect(parseFloat(wave.style.top) + r).toBeCloseTo(10, 0);
    pointer(document, 'pointerup', 60, 60);
    await wait(600);
    expect(el.querySelector('[data-hui-ripple-layer]')).toBeNull();
    stop();
  });

  it('phần tử position: static được chuyển sang relative, gỡ thì trả lại', () => {
    const el = document.createElement('button');
    el.textContent = 'OK';
    document.body.append(el);
    const stop = attachRipple(el);
    pointer(el, 'pointerdown', 5, 5);
    expect(el.style.position).toBe('relative');
    stop();
    expect(el.style.position).toBe('');
    expect(el.querySelector('[data-hui-ripple-layer]')).toBeNull();
  });

  it('component có Shadow DOM → vẽ trong shadowRoot, bo theo part="base"', () => {
    const tag = 'x-ripple-host';
    if (!customElements.get(tag)) {
      customElements.define(tag, class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' }).innerHTML = '<button part="base" style="border-radius: 12px; width: 100px; height: 40px">x</button>';
        }
      });
    }
    const el = document.createElement(tag);
    document.body.append(el);
    attachRipple(el);
    pointer(el, 'pointerdown', 10, 10);
    const layer = el.shadowRoot.querySelector('[data-hui-ripple-layer]');
    expect(layer).toBeTruthy();
    expect(layer.style.borderRadius).toBe('12px');
    expect(el.querySelector('[data-hui-ripple-layer]')).toBeNull();
  });

  it('Enter trên phần tử đang focus → sóng từ tâm', () => {
    const el = box();
    el.tabIndex = 0;
    attachRipple(el);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(el.querySelector('[data-hui-ripple-layer]')).toBeTruthy();
  });

  it('không chạy khi disabled hoặc html[data-hui-no-animation]', () => {
    const el = box();
    attachRipple(el);
    document.documentElement.setAttribute('data-hui-no-animation', '');
    pointer(el, 'pointerdown', 60, 60);
    expect(el.querySelector('[data-hui-ripple-layer]')).toBeNull();
    document.documentElement.removeAttribute('data-hui-no-animation');
    el.setAttribute('aria-disabled', 'true');
    pointer(el, 'pointerdown', 60, 60);
    expect(el.querySelector('[data-hui-ripple-layer]')).toBeNull();
  });

  it('directive data-hui-ripple gắn cả phần tử thêm sau', async () => {
    enableEffects();
    const el = box();
    el.setAttribute('data-hui-ripple', '');
    await wait(0); // MutationObserver
    pointer(el, 'pointerdown', 60, 60);
    expect(el.querySelector('[data-hui-ripple-layer]')).toBeTruthy();
  });
});

describe('effects — magnetic & press', () => {
  it('magnetic: con trỏ lệch tâm → phần tử dịch theo, rời đi → về chỗ cũ', async () => {
    const el = box('width: 100px; height: 100px;');
    const stop = attachMagnetic(el, { strength: 0.5, max: 20, force: true });
    pointer(el, 'pointerenter', 140, 100);
    pointer(el, 'pointermove', 140, 100); // tâm (100, 100) → lệch +40px x
    await frames(40);
    const [x, y] = el.style.translate.split(' ').map(parseFloat);
    expect(x).toBeCloseTo(20, 0); // 40 * 0.5 = 20 (đúng bằng max)
    expect(y || 0).toBeCloseTo(0, 0);
    pointer(el, 'pointerleave', 300, 300);
    await frames(60);
    expect(el.style.translate).toBe('');
    stop();
  });

  it('press: nhấn → animation scale, nhả → bật lại', async () => {
    const el = box();
    attachPress(el, { scale: 0.9 });
    pointer(el, 'pointerdown', 60, 60);
    const [anim] = el.getAnimations();
    expect(anim).toBeTruthy();
    expect(anim.effect.getKeyframes().at(-1).scale).toBe('0.9');
    pointer(document, 'pointerup', 60, 60);
    expect(el.getAnimations().some((a) => a.effect.getKeyframes().at(-1).scale === '1')).toBe(true);
  });
});

describe('effects — confetti / burst / shake', () => {
  it('confetti tạo canvas khi cần và tự gỡ khi hết hạt', async () => {
    const done = confetti({ count: 12, duration: 150, origin: { x: 0.5, y: 0.5 } });
    const canvas = document.querySelector('canvas[data-hui-confetti]');
    expect(canvas).toBeTruthy();
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(canvas).pointerEvents).toBe('none');
    await done;
    expect(document.querySelector('canvas[data-hui-confetti]')).toBeNull();
  });

  it('confetti nhận phần tử làm điểm bắn; giảm chuyển động → không làm gì', async () => {
    document.documentElement.setAttribute('data-hui-no-animation', '');
    await confetti({ origin: box() });
    expect(document.querySelector('canvas[data-hui-confetti]')).toBeNull();
  });

  it('burst: số hạt đúng count, xong thì gỡ lớp phủ', async () => {
    const el = box('width: 40px; height: 40px;');
    const done = burst(el, { icon: 'star', count: 6, duration: 100 });
    const layer = document.querySelector('[data-hui-burst]');
    expect(layer.children.length).toBe(6);
    expect(layer.querySelector('svg path')).toBeTruthy();
    await done;
    expect(document.querySelector('[data-hui-burst]')).toBeNull();
  });

  it('shake: chạy animation translate rồi resolve', async () => {
    const el = box();
    const done = shake(el, { duration: 80 });
    const [anim] = el.getAnimations();
    expect(anim.effect.getKeyframes()[1].translate).toMatch(/^-6px/);
    await done;
    expect(el.getAnimations().length).toBe(0);
  });
});

describe('effects — viewTransition', () => {
  it('chạy updateFn, gắn cờ data-hui-transition trong lúc chuyển và gỡ khi xong', async () => {
    const el = box();
    let flagDuring = null;
    await viewTransition(() => {
      el.textContent = 'mới';
      flagDuring = document.documentElement.getAttribute('data-hui-transition');
    }, { type: 'slide-left' });
    expect(el.textContent).toBe('mới');
    if (typeof document.startViewTransition === 'function') expect(flagDuring).toBe('slide-left');
    expect(document.documentElement.hasAttribute('data-hui-transition')).toBe(false);
  });

  it('giảm chuyển động / skip → chỉ chạy updateFn; lỗi trong updateFn được ném ra', async () => {
    document.documentElement.setAttribute('data-hui-no-animation', '');
    let flag = 'x';
    await viewTransition(() => { flag = document.documentElement.getAttribute('data-hui-transition'); });
    expect(flag).toBeNull();
    document.documentElement.removeAttribute('data-hui-no-animation');
    await expect(viewTransition(() => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(document.documentElement.hasAttribute('data-hui-transition')).toBe(false);
  });
});
