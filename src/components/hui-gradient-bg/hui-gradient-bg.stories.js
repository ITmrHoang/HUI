import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

export default {
  title: 'Molecules/HuiGradientBg',
  component: 'hui-gradient-bg',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Gradient Bg** — khung nền gradient chuyển động chậm cho hero / banner / CTA.

\`\`\`html
<hui-gradient-bg style="--hui-gradient-bg-padding: 48px">…nội dung…</hui-gradient-bg>
<hui-gradient-bg variant="linear" colors="primary, info, success" angle="120">…</hui-gradient-bg>
\`\`\`

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`variant\` | \`mesh\` | \`mesh\` (các đốm màu xoay chậm) · \`linear\` (dải gradient trôi qua lại) |
| \`colors\` | \`primary-4, info-3, success-3, danger-3\` | Phân cách dấu phẩy; nhận tên token hoặc màu CSS (mesh dùng tối đa 4 màu) |
| \`angle\` | 120 | Góc gradient (độ, \`linear\`) |
| \`duration\` | 18000 | Chu kỳ chuyển động (ms) |
| \`no-animation\` | — | Nền đứng yên |

**Slot:** mặc định (nội dung) · **Part:** \`base\`, \`layer\` (lớp gradient), \`content\`

**Biến CSS:** \`--hui-gradient-bg-base\` (nền dưới mesh, mặc định \`--hui-bg-container\`), \`--hui-gradient-bg-opacity\`,
\`--hui-gradient-bg-blur\`, \`--hui-gradient-bg-radius\`, \`--hui-gradient-bg-padding\`, \`--hui-gradient-bg-min-height\`, \`--hui-gradient-bg-color\`

Màu mặc định là sắc độ nhạt của token → chữ \`--hui-text\` đủ tương phản ở cả theme sáng và tối.
Lớp gradient \`aria-hidden\`, không nhận chuột. Giảm chuyển động / \`html[data-hui-no-animation]\` → đứng yên.
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['mesh', 'linear'] },
    colors: { control: 'text' },
    duration: { control: 'number' },
    angle: { control: { type: 'range', min: 0, max: 360 } },
  },
};

const hero = (title) => html`
  <div style="text-align: center; padding: 56px 24px;">
    <h2 style="font: 800 34px var(--hui-font-family); margin: 0 0 8px;">${title}</h2>
    <p style="margin: 0 0 20px; color: var(--hui-text-secondary)">Nền chuyển động chậm, không gây xao nhãng.</p>
    <hui-button variant="primary">Bắt đầu</hui-button>
  </div>`;

export const Default = {
  render: (args) => html`
    <hui-gradient-bg variant=${args.variant} colors=${args.colors || ''} duration=${args.duration} angle=${args.angle}
      style="--hui-gradient-bg-radius: 16px">${hero('Gradient mesh')}</hui-gradient-bg>
  `,
  args: { variant: 'mesh', colors: '', duration: 18000, angle: 120 },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-gradient-bg');
    const layer = el.shadowRoot.querySelector('[part="layer"]');
    await expect(layer.getAttribute('aria-hidden')).toBe('true');
    await expect(getComputedStyle(layer).pointerEvents).toBe('none');
    await expect(layer.style.getPropertyValue('--_gbg-c1')).toBe('var(--hui-primary-4)');
    await expect(el.querySelector('hui-button')).toBeTruthy();
  },
};

export const Linear = {
  render: () => html`
    <hui-gradient-bg variant="linear" colors="primary-3, info-3, success-3, warning-3" duration="8000" style="--hui-gradient-bg-radius: 16px">
      ${hero('Gradient linear')}
    </hui-gradient-bg>
  `,
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector('hui-gradient-bg').shadowRoot.querySelector('.gbg__layer');
    await expect(getComputedStyle(layer).backgroundImage).toContain('linear-gradient');
  },
};

/** Màu đậm + chữ sáng */
export const Vivid = {
  render: () => html`
    <hui-gradient-bg colors="primary, info, danger, warning" style="--hui-gradient-bg-radius: 16px; --hui-gradient-bg-color: var(--hui-text-light-solid); --hui-gradient-bg-base: var(--hui-primary-8)">
      <div style="text-align: center; padding: 56px 24px; font: 800 30px var(--hui-font-family); text-shadow: 0 1px 8px rgb(0 0 0 / 0.3)">Màu đậm, chữ sáng</div>
    </hui-gradient-bg>
  `,
};

export const NoAnimation = {
  render: () => html`<hui-gradient-bg no-animation style="--hui-gradient-bg-radius: 16px">${hero('Đứng yên')}</hui-gradient-bg>`,
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector('hui-gradient-bg').shadowRoot.querySelector('.gbg__layer');
    await expect(getComputedStyle(layer).animationName).toBe('none');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .gbg-custom { --hui-gradient-bg-opacity: 0.6; --hui-gradient-bg-blur: 30px; --hui-gradient-bg-radius: 24px; --hui-gradient-bg-padding: 8px; }
      .gbg-custom::part(base) { border: 1px solid var(--hui-border); }
      .gbg-custom::part(content) { backdrop-filter: saturate(1.2); }
    </style>
    <hui-gradient-bg class="gbg-custom">${hero('Biến CSS + ::part')}</hui-gradient-bg>
  `,
};
