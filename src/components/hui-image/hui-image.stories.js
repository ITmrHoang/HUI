import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { lightbox } from '../hui-lightbox/index.js';
import { svgImage } from './story-images.js';

const IMG = svgImage({ w: 1200, h: 675, hue: 205, label: 'hui-image' });
const IMG_SQ = svgImage({ w: 600, h: 600, hue: 140, label: '1 / 1' });
const IMG_TALL = svgImage({ w: 500, h: 800, hue: 20, label: 'Ảnh dọc' });
const TINY = svgImage({ w: 24, h: 14, hue: 205 });
const BROKEN = 'data:image/png;base64,AAAA';

const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);

export default {
  title: 'Atoms/HuiImage',
  component: 'hui-image',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Image** — ảnh có khung tỉ lệ, tải lười, placeholder khi đang tải, ảnh dự phòng khi lỗi, bấm để xem lớn (lightbox).

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`src\` / \`alt\` | — | Đường dẫn + mô tả ảnh |
| \`ratio\` | — | \`16/9\`, \`4/3\`, \`1/1\`, \`1.5\`… (aspect-ratio). Bỏ trống = theo ảnh |
| \`fit\` | \`cover\` | \`cover\` \\| \`contain\` \\| \`fill\` \\| \`none\` \\| \`scale-down\` |
| \`lazy\` | \`true\` | \`false\` = tải ngay. Mặc định \`loading="lazy"\` + \`decoding="async"\` |
| \`placeholder\` | \`skeleton\` | \`skeleton\` (vệt sáng) \\| \`blur\` (ảnh mờ \`placeholder-src\`) \\| \`none\` |
| \`placeholder-src\` | — | Ảnh nhỏ (LQIP) hiện mờ trong lúc tải |
| \`fallback\` | — | Ảnh thay thế khi \`src\` lỗi; không có → icon ảnh hỏng |
| \`rounded\` | — | Bo góc (\`--hui-image-radius\`) |
| \`preview\` | — | Bấm / Enter / Space → mở \`hui-lightbox\` (trong \`hui-gallery\` → mở cả nhóm) |
| \`preview-src\` / \`caption\` | — | Ảnh lớn + chú thích dùng trong lightbox |
| \`srcset\` / \`sizes\` / \`width\` / \`height\` | — | Ảnh responsive / giữ chỗ chống nhảy layout |
| \`no-animation\` | — | Tắt hiện dần + shimmer |

**Properties (chỉ đọc):** \`status\` (idle | loading | loaded | error), \`imageElement\`, \`previewItem\` · **Method:** \`openPreview()\`

**Events:** \`load\` {src, naturalWidth, naturalHeight} và \`error\` {src} (không nổi bọt, giống \`<img>\`) · \`hui-preview\` {item} (cancelable)

**Slots:** (mặc định) nội dung phủ lên ảnh · \`placeholder\` · \`error\` · **Parts:** \`base\`, \`img\`, \`placeholder\`, \`error\`

**States:** \`:state(loading)\`, \`:state(loaded)\`, \`:state(error)\`

**CSS:** \`--hui-image-radius\`, \`-bg\`, \`-placeholder-color\`, \`-placeholder-highlight\`, \`-placeholder-ratio\`, \`-blur\`, \`-duration\`, \`-error-color\`, \`-focus-color\`

**Bàn phím (khi \`preview\`):** Tab tới ảnh · Enter / Space mở lightbox.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-image style="max-width: 560px" src=${IMG} alt="Phong cảnh minh họa" ratio="16/9" rounded preview caption="Bấm ảnh để xem lớn"></hui-image>
  `,
  play: async ({ canvasElement }) => {
    const img = canvasElement.querySelector('hui-image');
    await waitFor(() => expect(img.status).toBe('loaded'));
    await expect(part(img, 'img').alt).toBe('Phong cảnh minh họa');
    await expect(part(img, 'img').loading).toBe('lazy');
    await expect(part(img, 'img').decoding).toBe('async');
    await expect(part(img, 'base').getAttribute('role')).toBe('button');
    await expect(part(img, 'base').getAttribute('tabindex')).toBe('0');
    await expect(part(img, 'base').getAttribute('aria-label')).toContain('Phong cảnh minh họa');
    await expect(getComputedStyle(part(img, 'base')).aspectRatio).toContain('16');
    // attribute ↔ property
    img.fit = 'contain';
    await img.updateComplete;
    await expect(img.getAttribute('fit')).toBe('contain');
    await expect(getComputedStyle(part(img, 'img')).objectFit).toBe('contain');
    img.setAttribute('fit', 'cover');
    await expect(img.fit).toBe('cover');
  },
};

export const RatiosAndFit = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; align-items: start">
      <figure style="margin: 0"><hui-image src=${IMG} alt="16/9 cover" ratio="16/9"></hui-image><figcaption>16/9 · cover</figcaption></figure>
      <figure style="margin: 0"><hui-image src=${IMG} alt="1/1 cover" ratio="1/1" rounded></hui-image><figcaption>1/1 · cover · rounded</figcaption></figure>
      <figure style="margin: 0"><hui-image src=${IMG_TALL} alt="4/3 contain" ratio="4/3" fit="contain"></hui-image><figcaption>4/3 · contain</figcaption></figure>
      <figure style="margin: 0"><hui-image src=${IMG_SQ} alt="Không ratio" width="600" height="600"></hui-image><figcaption>width/height (theo ảnh)</figcaption></figure>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const imgs = [...canvasElement.querySelectorAll('hui-image')];
    await waitFor(() => expect(imgs.every((i) => i.status === 'loaded')).toBe(true));
    const [wide, square] = imgs.map((i) => part(i, 'base').getBoundingClientRect());
    await expect(Math.abs(wide.width / wide.height - 16 / 9)).toBeLessThan(0.05);
    await expect(Math.abs(square.width - square.height)).toBeLessThan(2);
  },
};

/** Gán src sau 1,5s để thấy placeholder */
const loadLater = (root) => setTimeout(() => {
  root.querySelectorAll('hui-image[data-later]').forEach((i) => { i.src = i.dataset.later; });
}, 1500);

export const Placeholder = {
  render: () => {
    const reload = (e) => {
      const root = e.target.closest('.ph-wrap');
      root.querySelectorAll('hui-image').forEach((i) => { i.src = ''; });
      loadLater(root);
    };
    return html`
      <div class="ph-wrap">
        <p style="margin: 0 0 12px">Ảnh được gán <code>src</code> sau 1,5 giây → thấy placeholder trong lúc chờ.
          <button type="button" @click=${reload}>Tải lại</button></p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px">
          <hui-image data-later=${IMG} alt="Skeleton" ratio="4/3" placeholder="skeleton"></hui-image>
          <hui-image data-later=${IMG} alt="Blur" ratio="4/3" placeholder="blur" placeholder-src=${TINY}></hui-image>
          <hui-image data-later=${IMG} alt="Không placeholder" ratio="4/3" placeholder="none"></hui-image>
        </div>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const imgs = [...canvasElement.querySelectorAll('hui-image')];
    await expect(imgs[0].status).toBe('idle');
    await expect(part(imgs[0], 'error').hidden).toBe(true);
    await expect(part(imgs[1], 'base').classList.contains('image--ph-blur')).toBe(true);
    await expect(getComputedStyle(part(imgs[2], 'placeholder')).display).toBe('none');
    loadLater(canvasElement);
    await waitFor(() => expect(imgs.every((i) => i.status === 'loaded')).toBe(true), { timeout: 4000 });
  },
};

export const FallbackAndError = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px">
      <figure style="margin: 0"><hui-image id="with-fb" src=${BROKEN} fallback=${IMG_SQ} alt="Có fallback" ratio="4/3" rounded></hui-image><figcaption>src lỗi → fallback</figcaption></figure>
      <figure style="margin: 0"><hui-image id="no-fb" src=${BROKEN} alt="Không fallback" ratio="4/3" rounded></hui-image><figcaption>src lỗi, không fallback → icon</figcaption></figure>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const withFb = canvasElement.querySelector('#with-fb');
    const noFb = canvasElement.querySelector('#no-fb');
    // Sự kiện error có thể đã chạy trước play → kiểm tra theo trạng thái
    await waitFor(() => expect(withFb.status).toBe('loaded'));
    await expect(part(withFb, 'img').getAttribute('src')).toBe(IMG_SQ);
    await waitFor(() => expect(noFb.status).toBe('error'));
    await expect(part(noFb, 'error').hidden).toBe(false);

    // Sự kiện load / error phát trên host
    const events = [];
    noFb.addEventListener('error', (e) => events.push(['error', e.detail.src]));
    noFb.addEventListener('load', () => events.push(['load']));
    noFb.src = BROKEN.replace('AAAA', 'BBBB');
    await waitFor(() => expect(events.some((e) => e[0] === 'error')).toBe(true));
    noFb.src = IMG;
    await waitFor(() => expect(events.some((e) => e[0] === 'load')).toBe(true));
    await expect(noFb.status).toBe('loaded');
  },
};

export const Preview = {
  render: () => html`
    <div style="display: flex; gap: 16px; flex-wrap: wrap">
      <hui-image id="pv" style="width: 220px" src=${IMG} preview-src=${IMG} alt="Ảnh có preview" caption="Chú thích trong lightbox" ratio="1/1" rounded preview></hui-image>
      <hui-image id="pv-cancel" style="width: 220px" src=${IMG_SQ} alt="Chặn preview" ratio="1/1" rounded preview></hui-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const img = canvasElement.querySelector('#pv');
    await waitFor(() => expect(img.status).toBe('loaded'));
    part(img, 'base').click();
    await waitFor(() => expect(lightbox.element?.open).toBe(true));
    await expect(lightbox.element.count).toBe(1);
    await expect(lightbox.element.currentItem.caption).toBe('Chú thích trong lightbox');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(lightbox.element.open).toBe(false));
    await waitFor(() => expect(lightbox.element.shadowRoot.querySelector('dialog').open).toBe(false));

    // Bàn phím: focus ảnh + Enter
    img.focus();
    await expect(img.shadowRoot.activeElement).toBe(part(img, 'base'));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(lightbox.element.open).toBe(true));
    lightbox.close();
    await waitFor(() => expect(lightbox.element.shadowRoot.querySelector('dialog').open).toBe(false));

    // hui-preview cancelable
    const blocked = canvasElement.querySelector('#pv-cancel');
    blocked.addEventListener('hui-preview', (e) => e.preventDefault());
    await expect(blocked.openPreview()).toBe(null);
    await expect(lightbox.element.open).toBe(false);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-image.brand {
        --hui-image-radius: 28px 4px;
        --hui-image-bg: var(--hui-primary-1);
        --hui-image-placeholder-color: var(--hui-primary-2);
        --hui-image-placeholder-highlight: var(--hui-primary-3);
        --hui-image-focus-color: var(--hui-danger);
      }
      hui-image.brand::part(img) { filter: saturate(1.4); }
      hui-image.brand::part(base) { box-shadow: var(--hui-shadow-lg); }
    </style>
    <div style="display: flex; gap: 16px; flex-wrap: wrap">
      <hui-image class="brand" style="width: 260px" src=${IMG} alt="Tùy biến" ratio="4/3" rounded preview>
        <span style="position: absolute; left: 10px; top: 10px; padding: 2px 8px; border-radius: 99px; background: var(--hui-bg-spotlight); color: var(--hui-text-light-solid); font-size: 12px">Slot mặc định</span>
      </hui-image>
      <hui-image class="brand" style="width: 260px" alt="Đang chờ src" ratio="4/3" rounded></hui-image>
    </div>
  `,
};
