/**
 * Storybook Stories — HUI Title
 * Tiêu đề cấp 1–5 với role="heading" + aria-level.
 */

import { html, nothing } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Components/Typography/HuiTitle',
  component: 'hui-title',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Title** — Tiêu đề h1–h5 (Ant Typography.Title + MUI Typography h1…h5). Kế thừa mọi tính năng của \`hui-text\`.

\`\`\`html
<hui-title level="2">Bảng điều khiển</hui-title>
<hui-title level="4" type="secondary" ellipsis>Tiêu đề dài bị cắt…</hui-title>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`level\` | number | \`1\` | 1–5: cỡ chữ (\`--hui-font-h1\` … \`--hui-font-h5\`) + \`aria-level\` |
| \`type\` | string | — | secondary, success, warning, danger |
| \`ellipsis\` / \`rows\` | boolean / number | — | Cắt 1 dòng / nhiều dòng, tự gắn \`title\` khi bị cắt |
| \`copyable\` / \`copy-text\` | boolean / string | — | Nút sao chép (phát \`hui-copy\`) |
| \`strong\`, \`italic\`, \`underline\`, \`delete\`, \`code\`, \`mark\`, \`keyboard\`, \`disabled\` | boolean | — | Như \`hui-text\` |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-copy\` | \`{ text }\` | Sao chép thành công |
| \`hui-ellipsis\` | \`{ ellipsis }\` | Trạng thái bị cắt chữ thay đổi |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Nội dung tiêu đề |

### Accessibility
- Khung \`part="base"\` có \`role="heading"\` + \`aria-level\` = level → trình đọc màn hình nhận là tiêu đề.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-title-color\` | Màu khi không có \`type\` |
| \`--hui-title-font-size\` | Cỡ chữ (mặc định theo level) |
| \`--hui-title-font-weight\` | Độ đậm (600) |
| \`--hui-title-line-height\` | Chiều cao dòng |
| \`--hui-title-margin\` | Lề ngoài (\`0 0 0.5em\`) |

**Parts:** \`base\`, \`content\`, \`actions\`, \`copy\` (+ thẻ kiểu chữ như hui-text).
        `,
      },
    },
  },
  argTypes: {
    level: { control: 'select', options: [1, 2, 3, 4, 5] },
    type: { control: 'select', options: ['', 'secondary', 'success', 'warning', 'danger'] },
    ellipsis: { control: 'boolean' },
    copyable: { control: 'boolean' },
    label: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-title level=${args.level} type=${args.type || nothing} ?ellipsis=${args.ellipsis} ?copyable=${args.copyable}>
      ${args.label}
    </hui-title>
  `,
  args: { level: 1, type: '', ellipsis: false, copyable: false, label: 'Tiêu đề trang' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-title');
    const base = el.shadowRoot.querySelector('[part="base"]');
    await expect(base.getAttribute('role')).toBe('heading');
    await expect(base.getAttribute('aria-level')).toBe('1');
    el.level = 3;
    await el.updateComplete;
    await expect(base.getAttribute('aria-level')).toBe('3');
    await expect(el.getAttribute('level')).toBe('3');
    el.level = 1;
  },
};

/** 5 cấp tiêu đề */
export const Levels = {
  render: () => html`
    ${[1, 2, 3, 4, 5].map((level) => html`<hui-title level=${level}>h${level}. Tiêu đề HUI</hui-title>`)}
  `,
};

/** Màu theo type */
export const Types = {
  render: () => html`
    <hui-title level="4" type="secondary">Secondary</hui-title>
    <hui-title level="4" type="success">Success</hui-title>
    <hui-title level="4" type="warning">Warning</hui-title>
    <hui-title level="4" type="danger">Danger</hui-title>
    <hui-title level="4" disabled>Disabled</hui-title>
  `,
};

/** Cắt chữ + sao chép */
export const EllipsisAndCopy = {
  render: () => html`
    <div style="width: 320px;">
      <hui-title level="3" ellipsis copyable>Tiêu đề rất dài sẽ bị cắt bằng dấu ba chấm ở cuối dòng</hui-title>
      <hui-title level="4" rows="2">Tiêu đề dài cắt ở dòng thứ hai: Lorem ipsum dolor sit amet consectetur adipiscing elit sed do</hui-title>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-title');
    await waitFor(() => expect(el.truncated).toBe(true));
  },
};

/** Override từ bên ngoài */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .title-brand { --hui-title-color: var(--hui-primary); --hui-title-font-weight: 800; --hui-title-margin: 0 0 4px; }
      hui-title.gradient::part(content) {
        background: linear-gradient(90deg, var(--hui-primary), var(--hui-success));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
    </style>
    <div class="title-brand">
      <hui-title level="2">Biến CSS từ thẻ cha</hui-title>
      <hui-title level="2" class="gradient">::part(content) chữ gradient</hui-title>
      <hui-title level="5" style="--hui-title-font-size: 13px; text-transform: uppercase;">Cỡ chữ riêng</hui-title>
    </div>
  `,
};
