import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

export default {
  title: 'Molecules/HuiBlob',
  component: 'hui-blob',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Blob** — khung có các khối màu mờ trôi lơ lửng phía sau nội dung (trang trí hero, section).

\`\`\`html
<hui-blob>…nội dung…</hui-blob>
<hui-blob count="5" colors="primary, danger, warning" blur-radius="80" size="35%">…</hui-blob>
\`\`\`

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`count\` | 3 | Số khối (1–12) |
| \`colors\` | \`primary, info, success, warning, danger\` | Phân cách dấu phẩy; nhận tên token hoặc màu CSS (dùng lần lượt) |
| \`size\` | \`45%\` | Cỡ mỗi khối (độ dài CSS; % theo chiều rộng khung) |
| \`blur-radius\` | 60 | Độ nhoè (px) |
| \`opacity\` | 0.5 | Độ đậm (0–1) |
| \`duration\` | 20000 | Chu kỳ trôi (ms; mỗi khối lệch nhịp một chút) |
| \`no-animation\` | — | Khối đứng yên |

**Slot:** mặc định · **Part:** \`base\`, \`blobs\` (lớp chứa), \`blob\` (mỗi khối), \`content\`

**Biến CSS:** \`--hui-blob-bg\` (mặc định trong suốt), \`--hui-blob-radius\`, \`--hui-blob-padding\`, \`--hui-blob-min-height\`

Vị trí khối rải đều theo tỉ lệ vàng (cố định → không nhảy khi render lại). Lớp khối \`aria-hidden\`.
Giảm chuyển động / \`html[data-hui-no-animation]\` → đứng yên.
        `,
      },
    },
  },
  argTypes: {
    count: { control: { type: 'range', min: 1, max: 12 } },
    blurRadius: { control: { type: 'range', min: 0, max: 140 } },
    opacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    size: { control: 'text' },
    colors: { control: 'text' },
  },
};

const content = (title) => html`
  <div style="text-align: center; padding: 64px 24px;">
    <h2 style="font: 800 32px var(--hui-font-family); margin: 0 0 16px;">${title}</h2>
    <hui-button variant="primary">Khám phá</hui-button>
  </div>`;

export const Default = {
  render: (args) => html`
    <hui-blob count=${args.count} blur-radius=${args.blurRadius} opacity=${args.opacity} size=${args.size} colors=${args.colors}
      style="--hui-blob-radius: 16px; --hui-blob-bg: var(--hui-bg-container); border: 1px solid var(--hui-border); border-radius: 16px">
      ${content('Khối màu trôi')}
    </hui-blob>
  `,
  args: { count: 3, blurRadius: 60, opacity: 0.5, size: '45%', colors: 'primary, info, success, warning, danger' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-blob');
    const blobs = el.shadowRoot.querySelectorAll('[part="blob"]');
    await expect(blobs.length).toBe(3);
    await expect(el.shadowRoot.querySelector('[part="blobs"]').getAttribute('aria-hidden')).toBe('true');
    await expect(blobs[1].style.getPropertyValue('--_blob-color')).toBe('var(--hui-info)');
    el.count = 6;
    await el.updateComplete;
    await expect(el.shadowRoot.querySelectorAll('[part="blob"]').length).toBe(6);
  },
};

export const ManyBlobs = {
  render: () => html`
    <hui-blob count="7" size="30%" blur-radius="70" opacity="0.6" colors="primary, danger, warning, info" duration="12000"
      style="--hui-blob-radius: 16px; --hui-blob-bg: var(--hui-bg-container)">${content('7 khối, nhịp nhanh hơn')}</hui-blob>
  `,
};

export const NoAnimation = {
  render: () => html`<hui-blob no-animation style="--hui-blob-bg: var(--hui-bg-container)">${content('Đứng yên')}</hui-blob>`,
  play: async ({ canvasElement }) => {
    const blob = canvasElement.querySelector('hui-blob').shadowRoot.querySelector('.blob__item');
    await expect(getComputedStyle(blob).animationName).toBe('none');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .blob-custom { --hui-blob-bg: var(--hui-primary-1); --hui-blob-radius: 28px; --hui-blob-min-height: 260px; }
      .blob-custom::part(blob) { mix-blend-mode: multiply; }
      .blob-custom::part(content) { display: grid; place-items: center; min-height: 260px; }
    </style>
    <hui-blob class="blob-custom" count="4" blur-radius="40"><strong style="font: 700 24px var(--hui-font-family)">Biến CSS + ::part(blob)</strong></hui-blob>
  `,
};
