import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-image/index.js';
import { svgSet } from '../hui-image/story-images.js';

const SLIDES = svgSet(5, { w: 1600, h: 700, prefix: 'Slide' });
const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const parts = (el, name) => [...el.shadowRoot.querySelectorAll(`[part~="${name}"]`)];

const caption = (title, text) => html`
  <div style="position: absolute; left: 24px; bottom: 28px; max-width: 60%; color: var(--hui-text-light-solid); text-shadow: 0 1px 8px rgb(0 0 0 / .5)">
    <h3 style="margin: 0 0 4px; font-size: 1.5rem">${title}</h3><p style="margin: 0">${text}</p>
  </div>`;

/** Slide: ảnh + chú thích phủ */
const slide = (it, i, lazy = false) => html`
  <div style="position: relative">
    ${lazy && i > 1
      ? html`<img data-src=${it.src} alt=${it.alt} style="display: block; width: 100%; height: 100%; aspect-ratio: 16 / 7; object-fit: cover">`
      : html`<img src=${it.src} alt=${it.alt} style="display: block; width: 100%; height: 100%; aspect-ratio: 16 / 7; object-fit: cover">`}
    ${caption(`Tiêu đề slide ${i + 1}`, 'Mô tả ngắn cho banner, có thể kèm nút CTA.')}
  </div>`;

export default {
  title: 'Organisms/HuiCarousel',
  component: 'hui-carousel',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Carousel** — banner / hero slider. Tự điều khiển track bằng \`transform\` (không dùng \`hui-scroller\` vì cuộn native + scroll-snap không làm được loop vô hạn và effect fade / zoom).
Loop: "xoay vòng" thứ tự slide bằng CSS \`order\` — không nhân bản DOM của bạn.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`autoplay\` | — | Tự chuyển sau N ms (attribute rỗng = 5000). Dừng khi hover / focus bên trong / tab ẩn; có nút tạm dừng + thanh tiến độ. Giảm chuyển động → bắt đầu ở trạng thái dừng |
| \`loop\` | — | Vòng vô hạn liền mạch |
| \`effect\` | \`slide\` | \`slide\` \\| \`fade\` \\| \`zoom\` (fade + Ken Burns cho ảnh) |
| \`indicator\` | \`dots\` | \`dots\` \\| \`thumbnails\` (lấy \`data-thumb\` của slide hoặc ảnh đầu tiên) \\| \`none\` |
| \`arrows\` | \`always\` | \`always\` \\| \`hover\` \\| \`never\` |
| \`items-per-view\` | \`1\` | Số slide mỗi khung (effect slide, cho phép lẻ) |
| \`gap\` | \`md\` | Khoảng cách slide khi items-per-view > 1 |
| \`ratio\` | — | Tỉ lệ khung (\`16/9\`, \`21/9\`…) |
| \`index\` | \`0\` | Slide hiện tại |
| \`no-progress\` / \`label\` / \`no-animation\` | — | Ẩn thanh tiến độ / nhãn ARIA / tắt hiệu ứng |

**Methods:** \`next()\`, \`prev()\`, \`goTo(i)\`, \`play()\`, \`pause()\` · **Chỉ đọc:** \`currentIndex\`, \`slideCount\`, \`playing\`

**Event:** \`hui-slide-change\` {index, previous}

**Lazy:** đặt \`data-src\` / \`data-srcset\` thay cho \`src\` → chỉ gán khi slide sắp hiện (slide hiện tại ± 1); \`img[loading=lazy]\` và \`hui-image\` của slide kế được tải sớm.

**Slots:** (mặc định) các slide · **Parts:** base, frame, viewport, track, prev, next, pause, progress, progress-bar, nav, dot, dot-active, thumb, thumb-active
· **States:** \`:state(playing)\`, \`:state(at-start)\`, \`:state(at-end)\`

**CSS:** \`--hui-carousel-duration\`, \`-gap\`, \`-radius\`, \`-arrow-size\`, \`-arrow-bg\`, \`-arrow-color\`, \`-arrow-offset\`, \`-dot-size\`, \`-dot-color\`, \`-dot-active-color\`, \`-thumb-width\`, \`-thumb-ratio\`, \`-progress-height\`, \`-progress-color\`, \`-kenburns-scale\`, \`-focus-color\`

**ARIA (APG Carousel):** khung \`role="region"\` + \`aria-roledescription="carousel"\`; mỗi slide \`role="group"\` + \`aria-roledescription="slide"\` + "2 / 5"; slide ẩn được \`inert\`;
nút tạm dừng đứng đầu thứ tự Tab; \`aria-live="off"\` khi đang tự chạy, \`polite\` khi dừng.
**Bàn phím:** ← / → slide trước / sau · Home / End · Tab tới nút / chấm. **Cảm ứng:** vuốt ngang.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-carousel style="max-width: 900px">
      ${SLIDES.map((it, i) => slide(it, i))}
    </hui-carousel>
  `,
  play: async ({ canvasElement }) => {
    const c = canvasElement.querySelector('hui-carousel');
    const slides = [...c.children];
    const events = [];
    c.addEventListener('hui-slide-change', (e) => events.push(e.detail));
    await waitFor(() => expect(c.slideCount).toBe(5));

    // ARIA
    const base = part(c, 'base');
    await expect(base.getAttribute('role')).toBe('region');
    await expect(base.getAttribute('aria-roledescription')).toBeTruthy();
    await expect(slides[0].getAttribute('role')).toBe('group');
    await expect(slides[0].getAttribute('aria-roledescription')).toBeTruthy();
    await expect(slides[1].getAttribute('aria-label')).toMatch(/2/);
    await expect(slides[1].inert).toBe(true);
    await expect(part(c, 'prev').disabled).toBe(true);
    await expect(part(c, 'pause').hidden).toBe(true); // không autoplay → không có nút tạm dừng
    await expect(parts(c, 'dot').length).toBe(5);

    part(c, 'next').click();
    await expect(c.currentIndex).toBe(1);
    await expect(events[0]).toEqual({ index: 1, previous: 0 });
    await expect(slides[1].inert).toBe(false);
    await expect(slides[0].inert).toBe(true);
    await expect(c.getAttribute('index')).toBe('1');
    await expect(part(c, 'dot-active')).toBe(parts(c, 'dot')[1]);

    parts(c, 'dot')[3].click();
    await expect(c.currentIndex).toBe(3);

    // Bàn phím trong vùng carousel
    part(c, 'viewport').focus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(c.currentIndex).toBe(2);
    await userEvent.keyboard('{End}');
    await expect(c.currentIndex).toBe(4);
    await expect(part(c, 'next').disabled).toBe(true);
    c.next(); // không loop → đứng yên ở cuối
    await expect(c.currentIndex).toBe(4);

    // Track dịch đúng vị trí sau khi animation xong
    const vp = part(c, 'viewport').getBoundingClientRect();
    await waitFor(() => expect(Math.abs(slides[4].getBoundingClientRect().left - vp.left)).toBeLessThan(2), { timeout: 2000 });

    // index attribute → goTo
    c.setAttribute('index', '0');
    await waitFor(() => expect(c.currentIndex).toBe(0));
  },
};

export const LoopAndSwipe = {
  render: () => html`
    <hui-carousel loop arrows="hover" style="max-width: 900px">
      ${SLIDES.map((it, i) => slide(it, i))}
    </hui-carousel>
  `,
  play: async ({ canvasElement }) => {
    const c = canvasElement.querySelector('hui-carousel');
    await waitFor(() => expect(c.slideCount).toBe(5));
    const slides = [...c.children];
    await expect(part(c, 'prev').disabled).toBe(false);
    c.prev(); // 0 → 4 (vòng ngược)
    await expect(c.currentIndex).toBe(4);
    c.next(); // 4 → 0
    await expect(c.currentIndex).toBe(0);
    // Trượt xong: slide hiện tại luôn có hàng xóm 2 bên (thứ tự CSS order)
    await waitFor(() => expect(slides[4].style.order).toBe('0'), { timeout: 2000 });
    await expect(slides[0].style.order).toBe('1');
    const vp = part(c, 'viewport').getBoundingClientRect();
    await waitFor(() => expect(Math.abs(slides[0].getBoundingClientRect().left - vp.left)).toBeLessThan(2), { timeout: 2000 });

    // Vuốt trái → slide kế
    const viewport = part(c, 'viewport');
    const y = vp.top + vp.height / 2;
    const fire = (type, x) => viewport.dispatchEvent(new PointerEvent(type, {
      bubbles: true, composed: true, pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true,
    }));
    fire('pointerdown', vp.left + vp.width * 0.8);
    fire('pointermove', vp.left + vp.width * 0.6);
    fire('pointermove', vp.left + vp.width * 0.3);
    fire('pointerup', vp.left + vp.width * 0.3);
    await expect(c.currentIndex).toBe(1);
    // Kéo ngắn, chậm → trượt về chỗ cũ (vuốt nhanh ngắn vẫn tính là chuyển slide)
    fire('pointerdown', vp.left + vp.width * 0.5);
    fire('pointermove', vp.left + vp.width * 0.47);
    await new Promise((r) => setTimeout(r, 300));
    fire('pointerup', vp.left + vp.width * 0.47);
    await expect(c.currentIndex).toBe(1);
  },
};

export const Autoplay = {
  render: () => html`
    <hui-carousel autoplay="700" loop style="max-width: 900px">
      ${SLIDES.map((it, i) => slide(it, i))}
    </hui-carousel>
  `,
  play: async ({ canvasElement }) => {
    const c = canvasElement.querySelector('hui-carousel');
    await waitFor(() => expect(c.slideCount).toBe(5));
    const pause = part(c, 'pause');
    await expect(pause.hidden).toBe(false);
    await expect(part(c, 'progress').hidden).toBe(false);
    await expect(part(c, 'viewport').getAttribute('aria-live')).toBe('off');
    // Trên CI con trỏ thật có thể nằm sẵn trên vùng story: slide trượt dưới con trỏ đứng yên → Chrome phát lại
    // pointerenter → autoplay dừng (đúng hành vi với người dùng thật). Chặn pointerenter lạc trong test này.
    const blockHover = (e) => e.stopImmediatePropagation();
    c.addEventListener('pointerenter', blockHover, { capture: true });
    c.dispatchEvent(new PointerEvent('pointerleave'));
    await waitFor(() => expect(c.currentIndex, `playing=${c.playing} running=${c.matches(':state(playing)')} visibility=${document.visibilityState}`).toBeGreaterThan(0), { timeout: 6000 });
    c.removeEventListener('pointerenter', blockHover, { capture: true });
    pause.click();
    await expect(c.playing).toBe(false);
    await expect(pause.getAttribute('aria-label')).toMatch(/autoplay|tự chạy/i);
    await expect(part(c, 'viewport').getAttribute('aria-live')).toBe('polite');
    const stopped = c.currentIndex;
    await new Promise((r) => setTimeout(r, 1000));
    await expect(c.currentIndex).toBe(stopped);
    c.play();
    await expect(c.playing).toBe(true);
    // Focus bên trong → tạm dừng (nút tạm dừng đang focus)
    pause.focus();
    await new Promise((r) => setTimeout(r, 50));
    await expect(c.matches(':state(playing)')).toBe(false);
    pause.blur();
  },
};

export const EffectFade = {
  render: () => html`
    <hui-carousel effect="fade" indicator="thumbnails" loop ratio="16/7" style="max-width: 900px">
      ${SLIDES.map((it, i) => html`<div data-thumb=${it.thumb} style="position: relative">
        <img src=${it.src} alt=${it.alt} style="display: block; width: 100%; height: 100%; object-fit: cover">
        ${caption(`Fade ${i + 1}`, 'Các slide chồng lên nhau và mờ dần.')}</div>`)}
    </hui-carousel>
  `,
  play: async ({ canvasElement }) => {
    const c = canvasElement.querySelector('hui-carousel');
    await waitFor(() => expect(c.slideCount).toBe(5));
    const thumbs = parts(c, 'thumb');
    await expect(thumbs.length).toBe(5);
    await expect(thumbs[0].querySelector('img').getAttribute('src')).toBe(SLIDES[0].thumb);
    thumbs[2].click();
    await expect(c.currentIndex).toBe(2);
    await expect(c.children[2].hasAttribute('data-hui-active')).toBe(true);
    await waitFor(() => expect(getComputedStyle(c.children[2]).opacity).toBe('1'), { timeout: 2000 });
    await waitFor(() => expect(getComputedStyle(c.children[0]).opacity).toBe('0'), { timeout: 2000 });
  },
};

export const EffectZoomKenBurns = {
  render: () => html`
    <hui-carousel effect="zoom" autoplay="4000" loop ratio="16/7" style="max-width: 900px">
      ${SLIDES.map((it, i) => html`<div style="position: relative">
        <img src=${it.src} alt=${it.alt} style="display: block; width: 100%; height: 100%; object-fit: cover">
        ${caption(`Ken Burns ${i + 1}`, 'Ảnh phóng chậm trong lúc hiển thị.')}</div>`)}
    </hui-carousel>
  `,
  play: async ({ canvasElement }) => {
    const c = canvasElement.querySelector('hui-carousel');
    await waitFor(() => expect(c.slideCount).toBe(5));
    const img = c.children[0].querySelector('img');
    await waitFor(() => expect(img.getAnimations().length).toBeGreaterThan(0));
    c.next();
    await waitFor(() => expect(c.children[1].querySelector('img').getAnimations().length).toBeGreaterThan(0));
  },
};

export const ItemsPerView = {
  render: () => html`
    <hui-carousel items-per-view="3" gap="md" style="max-width: 900px">
      ${svgSet(7, { w: 600, h: 400, prefix: 'Thẻ' }).map((it) => html`
        <hui-image src=${it.src} alt=${it.alt} ratio="3/2" rounded></hui-image>`)}
    </hui-carousel>
  `,
  play: async ({ canvasElement }) => {
    const c = canvasElement.querySelector('hui-carousel');
    await waitFor(() => expect(c.slideCount).toBe(7));
    // 7 slide, 3 mỗi khung → 5 vị trí dừng
    await expect(parts(c, 'dot').length).toBe(5);
    const [a, b] = [...c.children].map((s) => s.getBoundingClientRect());
    const vp = part(c, 'viewport').getBoundingClientRect();
    await expect(Math.abs(a.width * 3 + (b.left - a.right) * 2 - vp.width)).toBeLessThan(3);
    await expect(c.children[2].inert).toBe(false);
    await expect(c.children[3].inert).toBe(true);
    c.goTo(10);
    await expect(c.currentIndex).toBe(4);
  },
};

export const LazySlides = {
  render: () => html`
    <p style="margin: 0 0 12px">Slide 3–5 dùng <code>data-src</code> → chỉ gán <code>src</code> khi sắp hiện.</p>
    <hui-carousel style="max-width: 900px">
      ${SLIDES.map((it, i) => slide(it, i, true))}
    </hui-carousel>
  `,
  play: async ({ canvasElement }) => {
    const c = canvasElement.querySelector('hui-carousel');
    await waitFor(() => expect(c.slideCount).toBe(5));
    const imgOf = (i) => c.children[i].querySelector('img');
    await expect(imgOf(3).hasAttribute('src')).toBe(false);
    await expect(imgOf(4).hasAttribute('src')).toBe(false);
    c.goTo(2); // tải slide 2 và hàng xóm (1, 3)
    await expect(imgOf(3).getAttribute('src')).toBe(SLIDES[3].src);
    await expect(imgOf(4).hasAttribute('src')).toBe(false);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-carousel.brand {
        --hui-carousel-radius: 24px;
        --hui-carousel-arrow-bg: var(--hui-primary);
        --hui-carousel-arrow-color: var(--hui-text-light-solid);
        --hui-carousel-arrow-size: 48px;
        --hui-carousel-dot-active-color: var(--hui-danger);
        --hui-carousel-progress-color: var(--hui-warning);
        --hui-carousel-progress-height: 5px;
        --hui-carousel-duration: 900ms;
      }
      hui-carousel.brand::part(nav) { justify-content: flex-start; }
      hui-carousel.brand::part(dot-active) { box-shadow: 0 0 0 2px var(--hui-danger-2); }
    </style>
    <hui-carousel class="brand" autoplay="3500" loop style="max-width: 900px">
      ${SLIDES.map((it, i) => slide(it, i))}
    </hui-carousel>
  `,
};
