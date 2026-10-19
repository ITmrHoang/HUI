/**
 * Storybook Stories — HUI Icon
 */

import { html } from 'lit';
import './index.js';
import { getIconNames } from './icons.js';

export default {
  title: 'Components/HuiIcon',
  component: 'hui-icon',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Icon** — Icon SVG theo tên, màu theo \`color\` của chữ xung quanh.

\`\`\`html
<hui-icon name="search"></hui-icon>
<hui-icon name="loading" spin></hui-icon>
<hui-icon name="info" size="24" label="Thông tin"></hui-icon>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`name\` | string | — | Tên icon trong registry |
| \`size\` | string | \`1em\` | Số (px) hoặc giá trị CSS |
| \`label\` | string | — | Nhãn cho trình đọc màn hình; bỏ trống = icon trang trí |
| \`spin\` | boolean | \`false\` | Xoay liên tục |
| \`rotate\` | number | — | Góc xoay cố định (độ) |

### Thêm icon riêng
\`\`\`js
import { registerIcon } from '@itmrhoang/h-ui/hui-icon';
registerIcon('rocket', '<path d="..."/>'); // nội dung bên trong <svg viewBox="0 0 24 24">
\`\`\`

### Override
\`hui-icon { --hui-icon-size: 20px; --hui-icon-stroke-width: 1.5; color: red; }\`, \`hui-icon::part(svg)\`.
        `,
      },
    },
  },
  argTypes: {
    name: { control: 'select', options: getIconNames() },
    size: { control: 'text' },
    spin: { control: 'boolean' },
    rotate: { control: 'number' },
    label: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-icon name=${args.name} size=${args.size} ?spin=${args.spin} rotate=${args.rotate} label=${args.label}></hui-icon>
  `,
  args: { name: 'search', size: '32', spin: false, rotate: 0, label: '' },
};

/** Toàn bộ icon có sẵn */
export const Gallery = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 12px; font-family: sans-serif;">
      ${getIconNames().map((name) => html`
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <hui-icon name=${name} size="24"></hui-icon>
          <code style="font-size: 12px; color: #475569;">${name}</code>
        </div>
      `)}
    </div>
  `,
};

/** Màu, kích thước và độ dày nét override từ bên ngoài */
export const Customize = {
  render: () => html`
    <div style="display: flex; gap: 20px; align-items: center;">
      <hui-icon name="heart" size="32" style="color: #ef4444;"></hui-icon>
      <hui-icon name="star" style="--hui-icon-size: 40px; --hui-icon-stroke-width: 1.25; color: #f59e0b;"></hui-icon>
      <hui-icon name="loading" size="28" spin style="color: #6366f1;"></hui-icon>
      <span style="font-size: 20px;">Theo cỡ chữ <hui-icon name="chevron-right"></hui-icon></span>
    </div>
  `,
};
