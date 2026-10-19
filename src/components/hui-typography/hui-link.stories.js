/**
 * Storybook Stories — HUI Link
 * Liên kết: external (↗ + tab mới), gạch chân none/hover/always, type màu, disabled.
 */

import { html, nothing } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-icon/index.js';

export default {
  title: 'Components/Typography/HuiLink',
  component: 'hui-link',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Link** — Liên kết (Ant Typography.Link + MUI Link). Bên trong là thẻ \`<a>\` thật → giữ nguyên hành vi trình duyệt (Ctrl+click, chuột giữa, menu chuột phải).

\`\`\`html
<hui-link href="/docs">Tài liệu</hui-link>
<hui-link href="https://github.com" external>GitHub</hui-link>
<hui-link href="#" underline="always" type="danger">Xóa</hui-link>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`href\` | string | — | Đường dẫn |
| \`target\` | string | — | \`_self\`, \`_blank\`… (external mặc định \`_blank\`) |
| \`rel\` | string | — | Tự thêm \`noopener noreferrer\` khi mở tab mới |
| \`download\` | string | — | Tải xuống (giá trị = tên file gợi ý) |
| \`external\` | boolean | \`false\` | Hiện icon ↗ và mở tab mới |
| \`underline\` | string | \`hover\` | none, hover, always |
| \`type\` | string | — | secondary, success, warning, danger |
| \`disabled\` | boolean | \`false\` | Bỏ \`href\`, \`aria-disabled="true"\`, không focus / điều hướng |

### Methods
| Tên | Mô tả |
|-----|-------|
| \`focus()\` / \`blur()\` / \`click()\` | Chuyển tới thẻ \`<a>\` bên trong |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Nội dung liên kết |
| \`icon\` | Icon phía trước chữ |

### Bàn phím
- \`Tab\` để focus, \`Enter\` để mở (hành vi native của \`<a>\`). Disabled → bị bỏ qua khi Tab.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-link-color\` / \`--hui-link-hover-color\` / \`--hui-link-active-color\` | Màu theo trạng thái (\`type\` thắng) |
| \`--hui-link-disabled-color\` | Màu khi disabled |
| \`--hui-link-font-weight\` | Độ đậm chữ |
| \`--hui-link-underline-offset\` | Khoảng cách gạch chân (0.2em) |
| \`--hui-link-gap\` | Khoảng cách icon ↔ chữ (0.25em) |

**Parts:** \`base\` (thẻ \`<a>\`), \`external-icon\`.
        `,
      },
    },
  },
  argTypes: {
    href: { control: 'text' },
    underline: { control: 'inline-radio', options: ['none', 'hover', 'always'] },
    type: { control: 'select', options: ['', 'secondary', 'success', 'warning', 'danger'] },
    external: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-link href=${args.href} underline=${args.underline} type=${args.type || nothing} ?external=${args.external} ?disabled=${args.disabled}>
      ${args.label}
    </hui-link>
  `,
  args: { href: '#', underline: 'hover', type: '', external: false, disabled: false, label: 'Liên kết HUI' },
};

/** External — icon ↗, target="_blank", rel="noopener noreferrer" */
export const External = {
  render: () => html`<hui-link href="https://developer.mozilla.org" external>MDN Web Docs</hui-link>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-link');
    const a = el.shadowRoot.querySelector('a');
    await expect(a.getAttribute('href')).toBe('https://developer.mozilla.org');
    await expect(a.getAttribute('target')).toBe('_blank');
    await expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    await expect(el.shadowRoot.querySelector('[part="external-icon"]').style.display).toBe('');
  },
};

/** Gạch chân: none / hover / always */
export const Underline = {
  render: () => html`
    <div style="display: flex; gap: 24px;">
      <hui-link href="#" underline="none">none</hui-link>
      <hui-link href="#" underline="hover">hover (mặc định)</hui-link>
      <hui-link href="#" underline="always">always</hui-link>
    </div>
  `,
};

/** Màu theo type, icon qua slot */
export const Types = {
  render: () => html`
    <div style="display: flex; gap: 24px; flex-wrap: wrap;">
      <hui-link href="#">Primary</hui-link>
      <hui-link href="#" type="secondary">Secondary</hui-link>
      <hui-link href="#" type="success">Success</hui-link>
      <hui-link href="#" type="warning">Warning</hui-link>
      <hui-link href="#" type="danger"><hui-icon slot="icon" name="delete"></hui-icon>Xóa</hui-link>
    </div>
  `,
};

/** Disabled — không có href, không focus, click bị chặn */
export const Disabled = {
  render: () => html`<hui-link href="#should-not-go" disabled>Liên kết bị khóa</hui-link>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-link');
    const a = el.shadowRoot.querySelector('a');
    await expect(a.hasAttribute('href')).toBe(false);
    await expect(a.getAttribute('aria-disabled')).toBe('true');

    let clicked = false;
    el.addEventListener('click', () => (clicked = true));
    el.click();
    await expect(clicked).toBe(false);

    el.disabled = false;
    await el.updateComplete;
    await expect(a.getAttribute('href')).toBe('#should-not-go');
    el.disabled = true;
  },
};

/** Override từ bên ngoài */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .link-brand {
        --hui-link-color: var(--hui-text);
        --hui-link-hover-color: var(--hui-primary);
        --hui-link-font-weight: 600;
        --hui-link-underline-offset: 4px;
      }
      hui-link.boxed::part(base) {
        padding: 2px 8px;
        border: 1px dashed var(--hui-border-hover);
      }
      hui-link.boxed::part(base):hover { border-color: var(--hui-primary); }
      hui-link.arrow::part(external-icon) { color: var(--hui-success); }
    </style>
    <div class="link-brand" style="display: flex; gap: 24px; align-items: center;">
      <hui-link href="#" underline="always">Biến CSS từ thẻ cha</hui-link>
      <hui-link href="#" class="boxed">::part(base) có viền</hui-link>
      <hui-link href="https://example.com" external class="arrow">::part(external-icon)</hui-link>
    </div>
  `,
};
