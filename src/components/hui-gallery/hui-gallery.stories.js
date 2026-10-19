import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { lightbox } from '../hui-lightbox/index.js';
import { svgSet } from '../hui-image/story-images.js';

const SET = svgSet(8);
const VARIED = svgSet(9, { w: 900, h: 600, varied: true });
const dialogOf = (el) => el.shadowRoot.querySelector('dialog');

async function closeLightbox() {
  lightbox.close();
  await waitFor(() => expect(dialogOf(lightbox.element).open).toBe(false));
}

export default {
  title: 'Organisms/HuiGallery',
  component: 'hui-gallery',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Gallery** — lưới ảnh \`grid\` (ô đều, cắt theo \`ratio\`) hoặc \`masonry\` (CSS columns, giữ tỉ lệ ảnh). Bấm 1 ảnh → \`hui-lightbox\` chứa cả nhóm, phóng từ chính ảnh đó.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`layout\` | \`grid\` | \`grid\` \\| \`masonry\` |
| \`columns\` | \`3\` | Số cột mặc định |
| \`columns-sm\` / \`-md\` / \`-lg\` / \`-xl\` | — | Số cột khi màn hình ≥ 576 / 768 / 992 / 1200px |
| \`gap\` | \`sm\` | \`xs\` \\| \`sm\` \\| \`md\` \\| \`lg\` \\| \`xl\` \\| \`none\`, số (px) hoặc CSS length |
| \`ratio\` | \`1/1\` | Tỉ lệ ô ở layout grid |
| \`data\` | — | \`[{ src, thumb?, alt, caption, width?, height? }]\` — thay cho phần tử con |
| \`loop\` / \`no-download\` | — | Truyền cho lightbox |
| \`label\` | locale | Nhãn ARIA của lưới |

**Phần tử con:** \`<hui-image>\` (tự bật \`preview\`, dùng \`preview-src\` + \`caption\`), \`<img>\` (\`data-full\` = ảnh lớn, \`data-caption\`; được gắn \`tabindex="0"\` + \`role="button"\`), \`<a href="ảnh lớn"><img></a>\`.

**Property:** \`items\` (chỉ đọc — danh sách mục lightbox) · **Method:** \`openLightbox(index)\` · **Event:** \`hui-open\` {index, items}

**Parts:** \`base\`, \`item\` (chế độ data) · **CSS:** \`--hui-gallery-gap\`, \`-radius\`, \`-ratio\`, \`-focus-color\`

**Bàn phím:** Tab tới ảnh · Enter / Space mở lightbox (sau đó dùng phím của lightbox).
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-gallery columns="2" columns-md="3" columns-lg="4" gap="sm" loop>
      ${SET.map((it) => html`<hui-image src=${it.thumb} preview-src=${it.src} alt=${it.alt} caption=${it.caption}></hui-image>`)}
    </hui-gallery>
  `,
  play: async ({ canvasElement }) => {
    const g = canvasElement.querySelector('hui-gallery');
    const imgs = g.querySelectorAll('hui-image');
    await expect(g.items.length).toBe(8);
    await expect(g.items[2].src).toBe(SET[2].src);
    // hui-image con được bật preview để focus / bấm được
    await expect(imgs[0].hasAttribute('preview')).toBe(true);
    const opened = [];
    g.addEventListener('hui-open', (e) => opened.push(e.detail.index));

    imgs[2].shadowRoot.querySelector('[part="base"]').click();
    await waitFor(() => expect(dialogOf(lightbox.element).open).toBe(true));
    await expect(opened).toEqual([2]);
    await expect(lightbox.element.count).toBe(8);
    await expect(lightbox.element.index).toBe(2);
    await expect(lightbox.element.loop).toBe(true);
    await closeLightbox();

    // Bàn phím: focus ảnh thứ 5 → Enter
    imgs[4].focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(lightbox.element.open).toBe(true));
    await expect(lightbox.element.index).toBe(4);
    await closeLightbox();

    // Cột responsive + gap
    const base = g.shadowRoot.querySelector('[part="base"]');
    await expect(getComputedStyle(base).display).toBe('grid');
    await expect(Number(base.style.getPropertyValue('--_gallery-cols'))).toBeGreaterThanOrEqual(2);
  },
};

export const Masonry = {
  render: () => html`
    <hui-gallery layout="masonry" columns="2" columns-md="3" gap="md">
      ${VARIED.map((it) => html`<img src=${it.thumb} data-full=${it.src} data-caption=${it.caption} alt=${it.alt}>`)}
    </hui-gallery>
  `,
  play: async ({ canvasElement }) => {
    const g = canvasElement.querySelector('hui-gallery');
    const imgs = g.querySelectorAll('img');
    await expect(imgs[0].getAttribute('role')).toBe('button');
    await expect(imgs[0].getAttribute('tabindex')).toBe('0');
    await expect(getComputedStyle(g.shadowRoot.querySelector('[part="base"]')).columnCount).not.toBe('auto');
    await expect(g.items[3]).toEqual({ src: VARIED[3].src, alt: VARIED[3].alt, caption: VARIED[3].caption });

    imgs[3].focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(dialogOf(lightbox.element).open).toBe(true));
    await expect(lightbox.element.index).toBe(3);
    await expect(lightbox.element.currentItem.caption).toBe(VARIED[3].caption);
    await closeLightbox();
  },
};

export const FromData = {
  render: () => html`
    <hui-gallery columns="3" ratio="4/3" gap="12" .data=${SET.slice(0, 6).map(({ src, thumb, alt, caption }) => ({ src, thumb, alt, caption }))}></hui-gallery>
  `,
  play: async ({ canvasElement }) => {
    const g = canvasElement.querySelector('hui-gallery');
    const items = g.shadowRoot.querySelectorAll('[part="item"]');
    await expect(items.length).toBe(6);
    await expect(items[0].getAttribute('src')).toBe(SET[0].thumb);
    await expect(items[0].getAttribute('ratio')).toBe('4/3');
    items[1].shadowRoot.querySelector('[part="base"]').click();
    await waitFor(() => expect(dialogOf(lightbox.element).open).toBe(true));
    await expect(lightbox.element.index).toBe(1);
    await expect(lightbox.element.currentItem.src).toBe(SET[1].src);
    await closeLightbox();

    // Đổi data → dựng lại
    g.data = SET.slice(0, 2);
    await g.updateComplete;
    await expect(g.shadowRoot.querySelectorAll('[part="item"]').length).toBe(2);
  },
};

export const LinksAsItems = {
  render: () => html`
    <p style="margin: 0 0 12px"><code>&lt;a href="ảnh lớn"&gt;&lt;img&gt;&lt;/a&gt;</code> — không JS vẫn mở được ảnh; có JS thì mở lightbox.</p>
    <hui-gallery columns="4" ratio="1/1">
      ${SET.slice(0, 4).map((it) => html`<a href=${it.src} title=${it.caption}><img src=${it.thumb} alt=${it.alt} style="width: 100%; height: 100%; object-fit: cover; display: block"></a>`)}
    </hui-gallery>
  `,
  play: async ({ canvasElement }) => {
    const g = canvasElement.querySelector('hui-gallery');
    const links = g.querySelectorAll('a');
    links[0].click();
    await waitFor(() => expect(dialogOf(lightbox.element).open).toBe(true));
    await expect(lightbox.element.currentItem.src).toBe(SET[0].src);
    await expect(lightbox.element.currentItem.caption).toBe(SET[0].caption);
    await closeLightbox();
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-gallery.brand {
        --hui-gallery-gap: 4px;
        --hui-gallery-radius: 0;
        --hui-gallery-ratio: 3 / 4;
        --hui-image-radius: 0;
      }
      hui-gallery.brand::part(base) { padding: 4px; background: var(--hui-bg-spotlight); border-radius: 16px; }
    </style>
    <hui-gallery class="brand" columns="3" columns-md="5">
      ${SET.slice(0, 5).map((it) => html`<hui-image src=${it.thumb} preview-src=${it.src} alt=${it.alt}></hui-image>`)}
    </hui-gallery>
  `,
};
