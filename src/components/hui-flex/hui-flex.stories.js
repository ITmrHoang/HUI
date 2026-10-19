/**
 * Storybook Stories — HUI Flex
 * Khung flexbox: hướng, gap, căn chỉnh, xuống dòng. Chính thẻ hui-flex là flex container.
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const box = (label, h = 40) => html`
  <div style="min-width: 64px; height: ${h}px; display: grid; place-items: center; border-radius: 6px;
    background: var(--hui-primary-2); color: var(--hui-primary-9); font: 14px var(--hui-font-family);">${label}</div>
`;

export default {
  title: 'Components/Layout/HuiFlex',
  component: 'hui-flex',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Flex** — Khung flexbox (Ant Flex + MUI Stack). Chính \`<hui-flex>\` là flex container → con trực tiếp là flex item, không có DOM bọc thêm.

\`\`\`html
<hui-flex gap="md" align="center" justify="between">
  <span>Logo</span><hui-button>Đăng nhập</hui-button>
</hui-flex>
<hui-flex vertical gap="12">…</hui-flex>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`vertical\` | boolean | \`false\` | Xếp dọc (column) |
| \`gap\` | string | \`--hui-flex-gap\` / 0 | none, xs (4), sm (8), md (16), lg (24), xl (32) · số (px) · độ dài CSS (\`"8px 16px"\` = hàng, cột) |
| \`align\` | string | — | start, center, end, stretch, baseline (align-items) |
| \`justify\` | string | — | start, center, end, between, around, evenly (nhận cả \`space-between\`…) |
| \`wrap\` | string | — | Có attribute = wrap; \`wrap-reverse\`, \`nowrap\` |
| \`inline\` | boolean | \`false\` | inline-flex |
| \`flex\` | string | — | CSS \`flex\` của chính thẻ khi nằm trong flex container khác |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Các flex item |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-flex-gap\` | Khoảng cách mặc định khi không có attribute \`gap\` |

Attribute \`gap\` luôn thắng biến CSS; CSS ngoài \`hui-flex { gap / align-items … }\` thắng tất cả (style \`:host\`).
Không có part (không có DOM bên trong).
        `,
      },
    },
  },
  argTypes: {
    vertical: { control: 'boolean' },
    gap: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '12', '4px 24px'] },
    align: { control: 'select', options: ['', 'start', 'center', 'end', 'stretch', 'baseline'] },
    justify: { control: 'select', options: ['', 'start', 'center', 'end', 'between', 'around', 'evenly'] },
    wrap: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-flex
      ?vertical=${args.vertical}
      gap=${args.gap}
      align=${args.align || ''}
      justify=${args.justify || ''}
      ?wrap=${args.wrap}
      style="padding: 12px; border: 1px dashed var(--hui-border); min-height: 120px;"
    >
      ${box('1')}${box('2', 60)}${box('3', 30)}${box('4')}
    </hui-flex>
  `,
  args: { vertical: false, gap: 'md', align: '', justify: '', wrap: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-flex');
    const items = el.querySelectorAll(':scope > div');
    const a = items[0].getBoundingClientRect();
    const b = items[1].getBoundingClientRect();
    // gap="md" = --hui-space-lg = 16px
    await expect(Math.round(b.left - a.right)).toBe(16);

    el.vertical = true;
    el.gap = '10';
    await el.updateComplete;
    const a2 = items[0].getBoundingClientRect();
    const b2 = items[1].getBoundingClientRect();
    await expect(getComputedStyle(el).flexDirection).toBe('column');
    await expect(Math.round(b2.top - a2.bottom)).toBe(10);
    el.vertical = false;
    el.gap = 'md';
  },
};

/** Xếp dọc */
export const Vertical = {
  render: () => html`<hui-flex vertical gap="sm" style="max-width: 240px;">${box('A')}${box('B')}${box('C')}</hui-flex>`,
};

/** gap từ khóa / số */
export const Gaps = {
  render: () => html`
    <hui-flex vertical gap="lg">
      ${['xs', 'sm', 'md', 'lg', 'xl', '40'].map((gap) => html`
        <hui-flex gap=${gap} align="center">
          <code style="width: 56px; font-size: 12px;">${gap}</code>${box('1')}${box('2')}${box('3')}
        </hui-flex>
      `)}
    </hui-flex>
  `,
};

/** justify + align */
export const Alignment = {
  render: () => html`
    <hui-flex vertical gap="md">
      ${['start', 'center', 'end', 'between', 'around', 'evenly'].map((j) => html`
        <hui-flex justify=${j} align="center" style="padding: 8px; border: 1px dashed var(--hui-border);">
          ${box(j)}${box('2', 56)}${box('3', 24)}
        </hui-flex>
      `)}
    </hui-flex>
  `,
};

/** Xuống dòng */
export const Wrap = {
  render: () => html`
    <hui-flex wrap gap="8px 12px" style="max-width: 420px;">
      ${Array.from({ length: 12 }, (_, i) => html`<hui-button variant="outline">Nút ${i + 1}</hui-button>`)}
    </hui-flex>
  `,
};

/** Override từ bên ngoài — biến CSS trên thẻ cha + CSS thường cho :host */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .toolbar { --hui-flex-gap: 4px; }
      hui-flex.card-row { padding: 16px; border-radius: 12px; background: var(--hui-bg-tertiary); }
    </style>
    <div class="toolbar">
      <hui-flex>${box('--hui-flex-gap')}${box('= 4px')}</hui-flex>
    </div>
    <br />
    <hui-flex class="card-row" gap="lg" justify="center">${box('CSS ngoài')}${box('trên hui-flex')}</hui-flex>
  `,
};
