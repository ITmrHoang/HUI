import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';

export default {
  title: 'Atoms/HuiGradientText',
  component: 'hui-gradient-text',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Gradient Text** — chữ tô gradient chạy chậm qua lại (\`background-clip: text\`).

\`\`\`html
<h1><hui-gradient-text>Tiêu đề nổi bật</hui-gradient-text></h1>
<hui-gradient-text colors="danger, warning, success" angle="45" duration="3000">Rực rỡ</hui-gradient-text>
\`\`\`

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`colors\` | \`primary, info, success\` | Danh sách màu, phân cách dấu phẩy. Nhận tên token (\`primary\`, \`info-5\`, \`danger-7\`…) hoặc màu CSS |
| \`angle\` | 90 | Góc gradient (độ) |
| \`duration\` | 6000 | Chu kỳ chạy (ms) |
| \`no-animation\` | — | Gradient đứng yên |

**Slot:** mặc định (chữ) · **Part:** \`base\`

**Biến CSS:** \`--hui-gradient-text-colors\` (ghi đè \`colors\`), \`--hui-gradient-text-duration\` (ghi đè \`duration\`)

**A11y:** chữ vẫn là chữ thật (chọn, copy, đọc được). Chế độ tương phản cao (\`forced-colors\`) → chữ màu hệ thống.
Giảm chuyển động / \`html[data-hui-no-animation]\` → đứng yên. Chọn màu đủ tương phản với nền (các màu gốc của token ổn trên cả nền sáng lẫn tối).
        `,
      },
    },
  },
  argTypes: {
    colors: { control: 'text' },
    angle: { control: { type: 'range', min: 0, max: 360 } },
    duration: { control: 'number' },
  },
};

const big = 'font: 800 44px/1.2 var(--hui-font-family); margin: 0;';

export const Default = {
  render: (args) => html`
    <h1 style=${big}><hui-gradient-text colors=${args.colors} angle=${args.angle} duration=${args.duration}>Thiết kế nổi bật</hui-gradient-text></h1>
  `,
  args: { colors: 'primary, info, success', angle: 90, duration: 6000 },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-gradient-text');
    const base = el.shadowRoot.querySelector('[part="base"]');
    const cs = getComputedStyle(base);
    await expect(cs.backgroundImage).toContain('linear-gradient');
    await expect(cs.webkitTextFillColor).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    // Màu đầu được lặp ở cuối để chạy qua lại liền mạch
    await expect(base.style.getPropertyValue('--_gt-colors')).toBe('var(--hui-primary), var(--hui-info), var(--hui-success), var(--hui-primary)');
    await expect(el.textContent).toBe('Thiết kế nổi bật');
  },
};

/** Bảng màu từ token khác nhau + màu CSS tự do */
export const Palettes = {
  render: () => html`
    <div style="display: grid; gap: 8px; font: 800 32px var(--hui-font-family);">
      <hui-gradient-text colors="danger, warning">Danger → Warning</hui-gradient-text>
      <hui-gradient-text colors="success, info" angle="45">Success → Info, 45°</hui-gradient-text>
      <hui-gradient-text colors="primary-7, primary-4, primary-7" duration="2500">Một tông primary</hui-gradient-text>
      <hui-gradient-text colors="#f43f5e, #8b5cf6, rgb(14, 165, 233)">Màu CSS tự do</hui-gradient-text>
      <span style="font-size: 18px; font-weight: 400; color: var(--hui-text)">Trong câu thường: <hui-gradient-text style="font-weight: 700">từ nổi bật</hui-gradient-text> vẫn thẳng hàng.</span>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const free = canvasElement.querySelectorAll('hui-gradient-text')[3];
    await expect(free.shadowRoot.querySelector('.gt').style.getPropertyValue('--_gt-colors')).toContain('rgb(14, 165, 233)');
  },
};

/** no-animation: đứng yên */
export const NoAnimation = {
  render: () => html`<h2 style=${big}><hui-gradient-text no-animation>Đứng yên</hui-gradient-text></h2>`,
  play: async ({ canvasElement }) => {
    const base = canvasElement.querySelector('hui-gradient-text').shadowRoot.querySelector('.gt');
    await expect(getComputedStyle(base).animationName).toBe('none');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .gt-custom { --hui-gradient-text-colors: var(--hui-warning), var(--hui-danger), var(--hui-warning); --hui-gradient-text-duration: 2s; }
      .gt-custom::part(base) { letter-spacing: 0.04em; text-transform: uppercase; }
    </style>
    <h2 style=${big}><hui-gradient-text class="gt-custom">Biến CSS + ::part</hui-gradient-text></h2>
  `,
};
