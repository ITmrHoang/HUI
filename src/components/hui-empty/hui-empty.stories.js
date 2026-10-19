import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

export default {
  title: 'Components/HuiEmpty',
  component: 'hui-empty',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Empty** — trạng thái không có dữ liệu.

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`description\` | locale "Không có dữ liệu" | Mô tả; \`description=""\` để ẩn |
| \`image\` | \`default\` | \`default\` / \`simple\` (nhỏ, dùng trong Select/Table) |

**Slots:** \`image\`, \`description\`, (mặc định) = hành động · **Parts:** base, image, description, footer

**Biến CSS:** \`--hui-empty-image-height\`, \`--hui-empty-color\`, \`--hui-empty-font-size\`, \`--hui-empty-padding\`
        `,
      },
    },
  },
  argTypes: {
    image: { control: 'inline-radio', options: ['default', 'simple'] },
    description: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`<hui-empty image=${args.image}></hui-empty>`,
  args: { image: 'default' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-empty');
    await expect(el.shadowRoot.textContent).toContain('Không có dữ liệu');
  },
};

export const Simple = { render: () => html`<hui-empty image="simple"></hui-empty>` };

export const WithAction = {
  render: () => html`
    <hui-empty description="Chưa có dự án nào">
      <hui-button icon="plus">Tạo dự án</hui-button>
    </hui-empty>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-empty.custom { --hui-empty-image-height: 60px; --hui-empty-color: var(--hui-primary); }
      hui-empty.custom::part(description) { font-style: italic; }
    </style>
    <hui-empty class="custom" description="Biến CSS + ::part"></hui-empty>
  `,
};
