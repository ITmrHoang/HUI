/**
 * Storybook Stories — HUI Container
 * Khung căn giữa có max-width theo breakpoint.
 */

import { html, nothing } from 'lit';
import { expect } from 'storybook/test';
import './index.js';

const filler = html`
  <div style="padding: 16px; border-radius: 8px; background: var(--hui-primary-1); color: var(--hui-primary-9);
    border: 1px dashed var(--hui-primary-4); font: 14px var(--hui-font-family);">
    Nội dung nằm trong hui-container
  </div>
`;

export default {
  title: 'Components/Layout/HuiContainer',
  component: 'hui-container',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**HUI Container** — Khung căn giữa nội dung (MUI Container + Bootstrap \`.container\`). Chính \`<hui-container>\` là khung.

\`\`\`html
<hui-container>…</hui-container>                <!-- max-width tăng theo màn hình -->
<hui-container max-width="md">…</hui-container> <!-- tối đa 720px -->
<hui-container fluid>…</hui-container>          <!-- luôn 100% -->
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`max-width\` | string | — (theo breakpoint) | xs (444), sm (540), md (720), lg (960), xl (1140), xxl (1320) hoặc độ dài CSS (\`800px\`, \`60rem\`, số = px) |
| \`fluid\` | boolean | \`false\` | Luôn rộng 100% |
| \`disable-gutters\` | boolean | \`false\` | Bỏ khoảng đệm hai bên |

### Mặc định theo breakpoint
| Màn hình | < 576 | ≥ 576 | ≥ 768 | ≥ 992 | ≥ 1200 | ≥ 1600 |
|----------|-------|-------|-------|-------|--------|--------|
| max-width | 100% | 540px | 720px | 960px | 1140px | 1320px |
| padding-x | 16px | 16px | 24px | 24px | 24px | 24px |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Nội dung |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-container-max-width\` | Ghi đè max-width ở mọi breakpoint (attribute độ dài thắng) |
| \`--hui-container-padding-x\` | Khoảng đệm hai bên |
        `,
      },
    },
  },
  argTypes: {
    maxWidth: { name: 'max-width', control: 'select', options: ['', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', '600px'] },
    fluid: { control: 'boolean' },
    disableGutters: { name: 'disable-gutters', control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-container max-width=${args.maxWidth || nothing} ?fluid=${args.fluid} ?disable-gutters=${args.disableGutters}
      style="background: var(--hui-bg-tertiary);">
      ${filler}
    </hui-container>
  `,
  args: { maxWidth: '', fluid: false, disableGutters: false },
};

/** max-width cố định theo từ khóa / độ dài */
export const MaxWidth = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; padding-block: 12px;">
      <hui-container max-width="sm" id="sm">${filler}</hui-container>
      <hui-container max-width="480">${filler}</hui-container>
      <hui-container fluid>${filler}</hui-container>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sm = canvasElement.querySelector('#sm');
    await expect(getComputedStyle(sm).maxWidth).toBe('540px');
    const px = canvasElement.querySelector('hui-container[max-width="480"]');
    await expect(getComputedStyle(px).maxWidth).toBe('480px');
    const fluid = canvasElement.querySelector('hui-container[fluid]');
    await expect(getComputedStyle(fluid).maxWidth).toBe('100%');
    // Căn giữa
    const parent = sm.parentElement.getBoundingClientRect();
    const box = sm.getBoundingClientRect();
    await expect(Math.abs((box.left - parent.left) - (parent.right - box.right)) < 1).toBe(true);
  },
};

/** Override từ bên ngoài */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .narrow-page { --hui-container-max-width: 640px; --hui-container-padding-x: 40px; }
    </style>
    <div class="narrow-page" style="padding-block: 12px;">
      <hui-container style="background: var(--hui-bg-tertiary);">${filler}</hui-container>
    </div>
  `,
};
