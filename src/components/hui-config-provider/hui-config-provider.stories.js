/**
 * Storybook Stories — HUI ConfigProvider + bảng sắc độ token
 */

import { html } from 'lit';
import './index.js';
import '../hui-button/index.js';

const COLORS = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

export default {
  title: 'Theme/HuiConfigProvider',
  component: 'hui-config-provider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HuiConfigProvider** — đổi theme / màu / bo góc / kích thước cho một vùng.

\`\`\`html
<hui-config-provider theme="dark" primary-color="#e11d48" radius="4" size="lg">…</hui-config-provider>
\`\`\`

| Attribute | Mô tả |
|-----------|-------|
| \`theme\` | light / dark (bỏ trống = theo trang) |
| \`primary-color\`, \`success-color\`, \`warning-color\`, \`danger-color\`, \`info-color\` | Màu gốc — hover/active/sắc độ 1–10 tự tính |
| \`radius\` | Bo góc gốc (px) |
| \`size\` | Kích thước mặc định của control con |
| \`font-family\` | Font chữ |
| \`.tokens\` (property) | Ghi đè token bất kỳ: \`{ '--hui-space-md': '1rem' }\` |

Không cần provider vẫn đổi được toàn trang: \`:root { --hui-primary: #e11d48 }\`.
        `,
      },
    },
  },
  argTypes: {
    theme: { control: 'inline-radio', options: ['', 'light', 'dark'] },
    primaryColor: { control: 'color' },
    radius: { control: { type: 'range', min: 0, max: 20 } },
  },
};

const swatches = () => html`
  <div style="display: grid; gap: 6px; font: 12px var(--hui-font-mono);">
    ${COLORS.map((c) => html`
      <div style="display: grid; grid-template-columns: 80px repeat(10, 1fr); gap: 4px; align-items: center;">
        <span style="color: var(--hui-text-secondary)">${c}</span>
        ${Array.from({ length: 10 }, (_, i) => html`
          <div title="--hui-${c}-${i + 1}" style="height: 28px; border-radius: 4px; background: var(--hui-${c}-${i + 1});
            ${i === 5 ? 'outline: 2px solid var(--hui-text); outline-offset: 1px;' : ''}"></div>
        `)}
      </div>
    `)}
  </div>
`;

/** Đổi màu gốc / theme / bo góc → toàn bộ sắc độ và component bên trong đổi theo */
export const Playground = {
  render: (args) => html`
    <hui-config-provider theme=${args.theme} primary-color=${args.primaryColor} radius=${args.radius}>
      <div style="padding: 16px; background: var(--hui-bg); color: var(--hui-text); border-radius: 12px; display: grid; gap: 16px;">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <hui-button>Primary</hui-button>
          <hui-button variant="outline">Outline</hui-button>
          <hui-button variant="dashed" icon="plus">Dashed</hui-button>
          <hui-button variant="text">Text</hui-button>
          <hui-button variant="danger">Danger</hui-button>
        </div>
        ${swatches()}
      </div>
    </hui-config-provider>
  `,
  args: { theme: '', primaryColor: '#6366f1', radius: 8 },
};

/** Hai vùng theme khác nhau trên cùng một trang */
export const NestedThemes = {
  render: () => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <hui-config-provider theme="light">
        <div style="padding: 16px; background: var(--hui-bg); border-radius: 12px; display: flex; gap: 8px;">
          <hui-button>Light</hui-button><hui-button variant="outline">Outline</hui-button>
        </div>
      </hui-config-provider>
      <hui-config-provider theme="dark" primary-color="#f59e0b">
        <div style="padding: 16px; background: var(--hui-bg); border-radius: 12px; display: flex; gap: 8px;">
          <hui-button>Dark + amber</hui-button><hui-button variant="outline">Outline</hui-button>
        </div>
      </hui-config-provider>
    </div>
  `,
};

/** Bảng 10 sắc độ của mọi màu (theo theme đang chọn trên toolbar) */
export const Palette = {
  render: swatches,
};
