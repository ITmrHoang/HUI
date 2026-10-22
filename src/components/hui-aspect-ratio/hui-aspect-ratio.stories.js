/**
 * Storybook Stories — HUI Aspect Ratio (khung giữ tỉ lệ)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { svgImage } from '../hui-image/story-images.js';
import './index.js';

const IMG = svgImage({ w: 1200, h: 800, hue: 200, label: 'Ảnh 3:2' });
const TALL = svgImage({ w: 600, h: 900, hue: 320, label: 'Ảnh dọc' });

export default {
  title: 'Atoms/HuiAspectRatio',
  component: 'hui-aspect-ratio',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Aspect Ratio** — Khung giữ tỉ lệ cố định cho ảnh, video, iframe (YouTube, bản đồ…) hoặc phần tử bất kỳ.
Dùng CSS \`aspect-ratio\` → không nhảy layout khi nội dung chưa tải. Con trực tiếp được kéo phủ kín khung.

\`\`\`html
<hui-aspect-ratio ratio="16/9" rounded>
  <iframe src="https://www.youtube.com/embed/…" title="Video giới thiệu"></iframe>
</hui-aspect-ratio>
<hui-aspect-ratio ratio="1" fit="contain"><img src="logo.png" alt="Logo"></hui-aspect-ratio>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`ratio\` | string | \`16/9\` | \`16/9\`, \`4:3\`, \`1\`, \`1.5\`… (không hợp lệ → 16/9) |
| \`fit\` | string | \`cover\` | \`cover\` \\| \`contain\` \\| \`fill\` \\| \`none\` \\| \`scale-down\` (object-fit cho img/video) |
| \`object-position\` | string | \`center\` | Điểm neo ảnh khi bị cắt, vd \`center top\` |
| \`rounded\` | boolean | \`false\` | Bo góc khung |

### Properties
\`ratioValue\` (chỉ đọc) — tỉ lệ đang áp dụng dạng số (16/9 → 1.777…).

### Events
Không có.

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | img / video / iframe / picture / phần tử bất kỳ — phủ kín khung |

### Parts
\`base\` — khung giữ tỉ lệ.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-aspect-ratio-radius\` | Bo góc khi \`rounded\` (mặc định \`--hui-radius-lg\`) |
| \`--hui-aspect-ratio-bg\` | Nền khung khi nội dung chưa tải |

### Bàn phím
Không nhận focus (nội dung bên trong giữ hành vi riêng).
        `,
      },
    },
  },
  argTypes: {
    ratio: { control: 'text' },
    fit: { control: 'select', options: ['cover', 'contain', 'fill', 'none', 'scale-down'] },
    rounded: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 480px;">
      <hui-aspect-ratio id="ar-default" ratio=${args.ratio} fit=${args.fit} ?rounded=${args.rounded}>
        <img src=${IMG} alt="Phong cảnh minh họa">
      </hui-aspect-ratio>
    </div>
  `,
  args: { ratio: '16/9', fit: 'cover', rounded: true },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ar-default');
    el.style.width = '320px';
    await waitFor(() => expect(Math.round(el.getBoundingClientRect().height)).toBe(180));
    const img = el.querySelector('img');
    await expect(Math.round(img.getBoundingClientRect().height)).toBe(180);
    await expect(getComputedStyle(img).objectFit).toBe('cover');
    await expect(el.ratioValue).toBeCloseTo(16 / 9, 5);
  },
};

/** Nhiều cách viết tỉ lệ: "1", "4:3", "21/9", "9/16" */
export const Ratios = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; align-items: start;">
      ${['1', '4:3', '16/9', '21/9', '9/16'].map((r) => html`
        <figure style="margin: 0;">
          <hui-aspect-ratio ratio=${r} rounded data-ratio=${r}>
            <img src=${IMG} alt="Ảnh tỉ lệ ${r}">
          </hui-aspect-ratio>
          <figcaption style="font: 12px system-ui; color: var(--hui-text-secondary); margin-top: 4px;">ratio="${r}"</figcaption>
        </figure>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const box = (r) => canvasElement.querySelector(`[data-ratio="${r}"]`).getBoundingClientRect();
    await waitFor(() => expect(box('1').height).toBeGreaterThan(0));
    await expect(Math.abs(box('1').width - box('1').height)).toBeLessThan(1);
    await expect(Math.abs(box('4:3').width / box('4:3').height - 4 / 3)).toBeLessThan(0.02);
    await expect(Math.abs(box('9/16').width / box('9/16').height - 9 / 16)).toBeLessThan(0.02);
  },
};

/** fit: cover cắt ảnh lấp đầy, contain giữ trọn ảnh */
export const Fit = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
      ${['cover', 'contain', 'fill', 'scale-down'].map((f) => html`
        <figure style="margin: 0;">
          <hui-aspect-ratio ratio="1" fit=${f} rounded data-fit=${f}><img src=${TALL} alt="Ảnh dọc, fit ${f}"></hui-aspect-ratio>
          <figcaption style="font: 12px system-ui; color: var(--hui-text-secondary); margin-top: 4px;">fit="${f}"</figcaption>
        </figure>`)}
      <figure style="margin: 0;">
        <hui-aspect-ratio ratio="1" object-position="center top" rounded><img src=${TALL} alt="Ảnh neo phía trên"></hui-aspect-ratio>
        <figcaption style="font: 12px system-ui; color: var(--hui-text-secondary); margin-top: 4px;">object-position="center top"</figcaption>
      </figure>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const img = canvasElement.querySelector('[data-fit="contain"] img');
    await expect(getComputedStyle(img).objectFit).toBe('contain');
  },
};

/** Iframe / video / phần tử bất kỳ (nội dung tự sinh, không dùng mạng) */
export const IframeAndContent = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
      <hui-aspect-ratio ratio="16/9" rounded>
        <iframe title="Bản đồ minh họa" srcdoc="<body style='margin:0;display:grid;place-items:center;height:100vh;background:#dbeafe;font:600 18px system-ui;color:#1e3a8a'>iframe 16:9</body>"></iframe>
      </hui-aspect-ratio>
      <hui-aspect-ratio ratio="4/3" rounded>
        <div style="display: grid; place-items: center; background: var(--hui-primary-1); color: var(--hui-primary); font-weight: 600;">div 4:3</div>
      </hui-aspect-ratio>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .ar-brand {
        --hui-aspect-ratio-radius: 24px;
        --hui-aspect-ratio-bg: var(--hui-warning-1);
      }
      .ar-brand::part(base) { box-shadow: var(--hui-shadow-lg); outline: 3px solid var(--hui-warning); outline-offset: 4px; }
    </style>
    <div style="max-width: 360px; padding: 12px;">
      <hui-aspect-ratio class="ar-brand" id="ar-custom" ratio="4:3" rounded><img src=${IMG} alt="Ảnh tùy biến"></hui-aspect-ratio>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ar-custom');
    const base = el.shadowRoot.querySelector('[part="base"]');
    await expect(getComputedStyle(base).borderTopLeftRadius).toBe('24px');
  },
};
