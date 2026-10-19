import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';

export default {
  title: 'Atoms/HuiPattern',
  component: 'hui-pattern',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Pattern** — nền hoa văn lưới / chấm / sọc mờ dần ra mép, hay đặt sau hero. Thuần CSS (\`background-image\` + \`mask-image\`).

\`\`\`html
<hui-pattern>…</hui-pattern>
<hui-pattern variant="dots" size="18" color="primary-3" fade="bottom">…</hui-pattern>
<hui-pattern variant="lines" angle="135" animated>…</hui-pattern>
\`\`\`

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`variant\` | \`grid\` | \`grid\` · \`dots\` · \`lines\` |
| \`size\` | 24 | Khoảng cách ô lặp (px) |
| \`color\` | \`var(--hui-border)\` | Màu nét; nhận tên token (\`primary-3\`) hoặc màu CSS |
| \`thickness\` | 1 | Độ dày nét / bán kính chấm (px) |
| \`fade\` | \`radial\` | \`radial\` · \`top\` · \`bottom\` · \`edges\` · \`none\` — vùng mờ dần |
| \`angle\` | 45 | Góc sọc (độ, \`lines\`) |
| \`animated\` | — | Hoa văn trôi chậm (grid / dots) |

**Slot:** mặc định · **Part:** \`base\`, \`pattern\` (lớp hoa văn), \`content\`

**Biến CSS:** \`--hui-pattern-color\`, \`--hui-pattern-bg\`, \`--hui-pattern-opacity\`, \`--hui-pattern-mask\` (mask-image tuỳ biến),
\`--hui-pattern-radius\`, \`--hui-pattern-padding\`, \`--hui-pattern-min-height\`, \`--hui-pattern-duration\` (6s)

Lớp hoa văn \`aria-hidden\`. Giảm chuyển động / \`html[data-hui-no-animation]\` → không trôi.
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['grid', 'dots', 'lines'] },
    fade: { control: 'inline-radio', options: ['radial', 'top', 'bottom', 'edges', 'none'] },
    size: { control: { type: 'range', min: 8, max: 64 } },
    thickness: { control: { type: 'range', min: 0.5, max: 4, step: 0.5 } },
    color: { control: 'text' },
    animated: { control: 'boolean' },
  },
};

const inner = (text) => html`<div style="display: grid; place-items: center; min-height: 220px; font: 700 26px var(--hui-font-family); color: var(--hui-text);">${text}</div>`;
const frame = 'border: 1px solid var(--hui-border); border-radius: 16px; --hui-pattern-radius: 16px;';

export const Default = {
  render: (args) => html`
    <hui-pattern variant=${args.variant} fade=${args.fade} size=${args.size} thickness=${args.thickness} color=${args.color} ?animated=${args.animated} style=${frame}>
      ${inner('Nền hoa văn')}
    </hui-pattern>
  `,
  args: { variant: 'grid', fade: 'radial', size: 24, thickness: 1, color: 'var(--hui-border)', animated: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-pattern');
    const layer = el.shadowRoot.querySelector('[part="pattern"]');
    await expect(layer.getAttribute('aria-hidden')).toBe('true');
    await expect(getComputedStyle(layer).backgroundImage).toContain('linear-gradient');
    await expect(getComputedStyle(layer).maskImage).toContain('radial-gradient');
    el.variant = 'dots';
    await el.updateComplete;
    await expect(getComputedStyle(layer).backgroundImage).toContain('radial-gradient');
  },
};

/** Ba kiểu hoa văn × các kiểu mờ dần */
export const Variants = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
      <hui-pattern style=${frame}>${inner('grid')}</hui-pattern>
      <hui-pattern variant="dots" size="16" color="primary-4" thickness="1.5" style=${frame}>${inner('dots')}</hui-pattern>
      <hui-pattern variant="lines" size="12" fade="edges" style=${frame}>${inner('lines')}</hui-pattern>
      <hui-pattern fade="top" color="info-3" style=${frame}>${inner('fade top')}</hui-pattern>
      <hui-pattern variant="dots" fade="bottom" style=${frame}>${inner('fade bottom')}</hui-pattern>
      <hui-pattern variant="grid" fade="none" size="32" color="var(--hui-border-secondary)" style=${frame}>${inner('fade none')}</hui-pattern>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dots = canvasElement.querySelectorAll('hui-pattern')[1];
    await expect(dots.shadowRoot.querySelector('.pat__layer').style.getPropertyValue('--_pat-color')).toBe('var(--hui-primary-4)');
  },
};

export const Animated = {
  render: () => html`<hui-pattern variant="dots" animated color="primary-3" style=${frame}>${inner('Chấm trôi chậm')}</hui-pattern>`,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .pat-custom {
        --hui-pattern-color: var(--hui-primary-3);
        --hui-pattern-bg: var(--hui-primary-1);
        --hui-pattern-mask: linear-gradient(135deg, black, transparent 70%);
        --hui-pattern-radius: 20px;
      }
      .pat-custom::part(content) { padding: 24px; }
    </style>
    <hui-pattern class="pat-custom" size="20">${inner('Biến CSS + ::part')}</hui-pattern>
  `,
};
