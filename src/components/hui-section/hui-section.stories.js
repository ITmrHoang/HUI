/**
 * Storybook Stories — HUI Section
 * Khối nội dung landing page: padding theo thang, nền theo variant, tiêu đề + mô tả, max-width.
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const features = html`
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
    ${['Zero-dependency', 'Dark mode', 'Override bằng biến CSS'].map((title) => html`
      <div style="padding: 20px; border-radius: 12px; border: 1px solid var(--hui-border); background: var(--hui-bg-container); color: var(--hui-text);">
        <strong>${title}</strong>
        <p style="margin: 8px 0 0; color: var(--hui-text-secondary); font-size: 14px;">Mô tả ngắn cho tính năng.</p>
      </div>
    `)}
  </div>
`;

export default {
  title: 'Components/Layout/HuiSection',
  component: 'hui-section',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**HUI Section** — Khối nội dung cho landing page: khoảng đệm dọc theo thang, nền theo \`variant\`, header (eyebrow + tiêu đề + mô tả) và nội dung căn giữa trong \`max-width\`.

\`\`\`html
<hui-section heading="Tính năng" description="Mọi thứ bạn cần" variant="muted" padding="lg">
  …lưới tính năng…
</hui-section>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`padding\` | string | \`md\` | none, sm, md, lg, xl — co giãn theo màn hình (\`clamp()\`) |
| \`variant\` | string | \`plain\` | plain (trong suốt), muted (\`--hui-bg-secondary\`), tinted (\`--hui-primary-1\`), primary (nền primary, chữ inverse) |
| \`max-width\` | string | \`lg\` | sm (640), md (960), lg (1200), xl (1440), full hoặc độ dài CSS |
| \`align\` | string | \`center\` | start, center — căn header |
| \`heading\` | string | — | Tiêu đề dạng chữ (slot \`title\` ưu tiên) |
| \`description\` | string | — | Mô tả dạng chữ (slot \`description\` ưu tiên) |
| \`level\` | number | \`2\` | \`aria-level\` của tiêu đề |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Nội dung chính |
| \`eyebrow\` | Dòng chữ nhỏ phía trên tiêu đề |
| \`title\` | Tiêu đề (thay \`heading\`) |
| \`description\` | Mô tả (thay \`description\`) |

Header tự ẩn khi không có eyebrow / tiêu đề / mô tả.

### Accessibility
- \`<section>\` có \`aria-labelledby\` trỏ tới tiêu đề (\`role="heading"\` + \`aria-level\`) → là landmark có tên.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-section-padding-y\` / \`--hui-section-padding-x\` | Khoảng đệm |
| \`--hui-section-bg\` / \`--hui-section-color\` | Nền / chữ (thắng variant) |
| \`--hui-section-max-width\` | Chiều rộng tối đa nội dung |
| \`--hui-section-title-size\` / \`--hui-section-title-color\` | Tiêu đề |
| \`--hui-section-description-color\` | Mô tả |
| \`--hui-section-header-gap\` / \`--hui-section-header-margin\` | Khoảng cách trong header / header ↔ nội dung |

**Parts:** \`base\`, \`container\`, \`header\`, \`eyebrow\`, \`title\`, \`description\`, \`body\`.
        `,
      },
    },
  },
  argTypes: {
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg', 'xl'] },
    variant: { control: 'select', options: ['plain', 'muted', 'tinted', 'primary'] },
    maxWidth: { name: 'max-width', control: 'select', options: ['sm', 'md', 'lg', 'xl', 'full'] },
    align: { control: 'inline-radio', options: ['start', 'center'] },
    heading: { control: 'text' },
    description: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-section padding=${args.padding} variant=${args.variant} max-width=${args.maxWidth} align=${args.align}
      heading=${args.heading} description=${args.description}>
      ${features}
    </hui-section>
  `,
  args: {
    padding: 'md', variant: 'plain', maxWidth: 'lg', align: 'center',
    heading: 'Tính năng nổi bật', description: 'Bộ component đầy đủ cho ứng dụng web hiện đại.',
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-section');
    const title = el.shadowRoot.querySelector('[part="title"]');
    await expect(title.textContent).toBe('Tính năng nổi bật');
    await expect(title.getAttribute('aria-level')).toBe('2');
    await expect(el.shadowRoot.querySelector('section').getAttribute('aria-labelledby')).toBe('title');

    el.heading = '';
    el.description = '';
    await el.updateComplete;
    await expect(el.shadowRoot.querySelector('[part="header"]').hidden).toBe(true);
    el.heading = 'Tính năng nổi bật';
    el.description = 'Bộ component đầy đủ cho ứng dụng web hiện đại.';
  },
};

/** Nền theo variant */
export const Variants = {
  render: () => html`
    ${['plain', 'muted', 'tinted', 'primary'].map((variant) => html`
      <hui-section variant=${variant} padding="sm" heading=${`variant="${variant}"`} description="Mô tả ngắn cho khối."></hui-section>
    `)}
  `,
};

/** Hero dùng slot: eyebrow, title, description + nút hành động */
export const HeroWithSlots = {
  render: () => html`
    <hui-section variant="tinted" padding="xl" max-width="md">
      <span slot="eyebrow">Mới · v1.0</span>
      <h1 slot="title" style="font-size: clamp(2rem, 5vw, 3rem);">Xây giao diện nhanh hơn với HUI</h1>
      <p slot="description">Web Components không phụ thuộc framework, cảm hứng từ Ant Design và MUI.</p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <hui-button size="lg">Bắt đầu</hui-button>
        <hui-button size="lg" variant="outline">Xem tài liệu</hui-button>
      </div>
    </hui-section>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-section');
    await expect(el.shadowRoot.querySelector('[part="eyebrow"]').hidden).toBe(false);
    const container = el.shadowRoot.querySelector('[part="container"]');
    await expect(getComputedStyle(container).maxWidth).toBe('960px');
  },
};

/** Header căn trái, max-width tùy chỉnh */
export const AlignStart = {
  render: () => html`
    <hui-section align="start" max-width="800px" heading="Câu hỏi thường gặp" description="Header căn trái, nội dung tối đa 800px.">
      <p style="margin: 0; color: var(--hui-text-secondary);">Nội dung…</p>
    </hui-section>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-section');
    await expect(getComputedStyle(el.shadowRoot.querySelector('[part="container"]')).maxWidth).toBe('800px');
  },
};

/** Override từ bên ngoài */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .landing {
        --hui-section-padding-y: 48px;
        --hui-section-title-size: 2.5rem;
        --hui-section-title-color: var(--hui-primary);
        --hui-section-header-margin: 24px;
      }
      hui-section.striped::part(base) {
        background: repeating-linear-gradient(45deg, var(--hui-bg-secondary) 0 12px, var(--hui-bg) 12px 24px);
      }
      hui-section.striped::part(eyebrow) { color: var(--hui-success); }
    </style>
    <div class="landing">
      <hui-section heading="Biến CSS từ thẻ cha" description="Padding 48px, tiêu đề 2.5rem màu primary."></hui-section>
      <hui-section class="striped" heading="::part(base)" description="Nền sọc tùy biến bằng ::part.">
        <span slot="eyebrow">::part(eyebrow)</span>
      </hui-section>
    </div>
  `,
};
