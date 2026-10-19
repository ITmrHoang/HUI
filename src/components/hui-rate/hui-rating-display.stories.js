/**
 * Storybook Stories — HUI Rating Display (sao chỉ đọc)
 */

import { html, nothing } from 'lit';
import { expect } from 'storybook/test';
import './index.js';

const fgOf = (el, i) => el.shadowRoot.querySelectorAll('[part~="star"]')[i].querySelector('.hui-rate__fg');

export default {
  title: 'Atoms/HuiRatingDisplay',
  component: 'hui-rating-display',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Rating Display** — Hiển thị số sao chỉ đọc, nhẹ (không focus, không form). Tô **chính xác số lẻ**:
4,3 sao → 4 sao đầy + sao thứ 5 tô 30%. Kèm điểm "4,3" và "(128 đánh giá)" theo locale.

\`\`\`html
<hui-rating-display value="4.3" show-value reviews="128"></hui-rating-display>
<hui-rating-display value="3.7" size="sm" color="danger" icon="heart"></hui-rating-display>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | number | \`0\` | Điểm (số thực), kẹp trong [0, count] |
| \`count\` | number | \`5\` | Số sao |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`color\` | string | warning | \`primary\` \\| \`success\` \\| \`warning\` \\| \`danger\` \\| \`info\` hoặc màu CSS |
| \`icon\` / \`character\` | string | — | Ký hiệu thay sao (icon hui-icon tô đặc / ký tự) |
| \`show-value\` | boolean | \`false\` | Hiện điểm "4,3" (định dạng theo locale) |
| \`precision\` | number | \`1\` | Số chữ số thập phân của điểm |
| \`reviews\` | number | — | Số lượt đánh giá → "(128 đánh giá)" |
| \`label\` | string | tự sinh | Tên cho trình đọc màn hình |

### Events
Không có (chỉ hiển thị).

### Slots
| Slot | Mô tả |
|------|-------|
| \`character\` | Ký hiệu tùy chỉnh — được nhân bản cho mọi sao |

### Parts
\`base\`, \`stars\`, \`star\` (+ \`star-full\` \\| \`star-half\` \\| \`star-zero\`), \`value\`, \`reviews\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-rating-display-size\` / \`--hui-rating-display-gap\` | Cạnh mỗi sao / khoảng cách |
| \`--hui-rating-display-color\` / \`--hui-rating-display-inactive-color\` | Màu phần tô / chưa tô |
| \`--hui-rating-display-value-color\` / \`--hui-rating-display-reviews-color\` | Màu chữ điểm / số đánh giá |
| \`--hui-rating-display-font-size\` | Cỡ chữ |

### Accessibility
Host mang \`role="img"\` + \`aria-label\` "Đánh giá 4,3 trên 5 (128 đánh giá)" — trình đọc màn hình đọc 1 câu gọn.
Không nhận focus (không có phím tắt).
        `,
      },
    },
  },
  argTypes: {
    value: { control: { type: 'number', min: 0, max: 5, step: 0.1 } },
    count: { control: 'number' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'text' },
    showValue: { control: 'boolean' },
    reviews: { control: 'number' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-rating-display
      value=${args.value ?? nothing}
      count=${args.count ?? nothing}
      size=${args.size || 'md'}
      color=${args.color || nothing}
      ?show-value=${args.showValue}
      reviews=${args.reviews ?? nothing}
    ></hui-rating-display>
  `,
  args: { value: 4.3, count: 5, size: 'md', color: '', showValue: true, reviews: 128 },
};

/** Số lẻ chính xác — 4,3 → sao thứ 5 tô 30% */
export const Fractional = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <hui-rating-display id="rd-43" value="4.3"></hui-rating-display>
      ${[0, 0.5, 1.25, 2.8, 3.5, 4.75, 5].map((v) => html`<div><hui-rating-display value=${v} show-value precision="2"></hui-rating-display></div>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rd-43');
    await expect(fgOf(el, 3).style.width).toBe('100%');
    await expect(fgOf(el, 4).style.width).toBe('30%');
    await expect(el.shadowRoot.querySelectorAll('[part~="star"]')[4].getAttribute('part')).toBe('star star-half');
    // Bề rộng thật cũng đúng 30% của ngôi sao
    const star = el.shadowRoot.querySelectorAll('[part~="star"]')[4].getBoundingClientRect();
    const fg = fgOf(el, 4).getBoundingClientRect();
    await expect(Math.abs(fg.width / star.width - 0.3)).toBeLessThan(0.02);
    await expect(el.getAttribute('role')).toBe('img');
    await expect(el.getAttribute('aria-label')).toBe('Đánh giá 4,3 trên 5');
  },
};

/** Điểm + số đánh giá theo locale */
export const WithValueAndReviews = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <hui-rating-display id="rd-full" value="4.3" show-value reviews="128"></hui-rating-display>
      <hui-rating-display value="4.8" show-value reviews="12450"></hui-rating-display>
      <hui-rating-display value="3" reviews="2"></hui-rating-display>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rd-full');
    await expect(el.shadowRoot.querySelector('[part="value"]').textContent).toBe('4,3');
    await expect(el.shadowRoot.querySelector('[part="reviews"]').textContent).toBe('(128 đánh giá)');
    await expect(el.getAttribute('aria-label')).toBe('Đánh giá 4,3 trên 5 (128 đánh giá)');
    const big = canvasElement.querySelectorAll('hui-rating-display')[1];
    await expect(big.shadowRoot.querySelector('[part="reviews"]').textContent).toBe('(12.450 đánh giá)');
  },
};

export const Sizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${['sm', 'md', 'lg'].map((s) => html`<div><hui-rating-display size=${s} value="3.6" show-value reviews="56"></hui-rating-display></div>`)}
    </div>
  `,
};

/** Màu + ký hiệu — color token / màu CSS, icon hui-icon, ký tự, slot */
export const ColorsAndSymbols = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div><hui-rating-display value="3.7" color="danger" icon="heart"></hui-rating-display></div>
      <div><hui-rating-display value="4.5" color="primary"></hui-rating-display></div>
      <div><hui-rating-display value="2.4" color="#8b5cf6" count="10"></hui-rating-display></div>
      <div><hui-rating-display value="3.5"><span slot="character">●</span></hui-rating-display></div>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .rd-brand {
        --hui-rating-display-color: var(--hui-success);
        --hui-rating-display-size: 1.5rem;
        --hui-rating-display-gap: 0;
        --hui-rating-display-value-color: var(--hui-success);
        --hui-rating-display-font-size: var(--hui-font-lg);
      }
      hui-rating-display.pill::part(base) { padding: 4px 10px; border-radius: 999px; background: var(--hui-fill-tertiary); }
      hui-rating-display.pill::part(reviews) { font-style: italic; }
    </style>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div class="rd-brand"><hui-rating-display value="4.6" show-value></hui-rating-display></div>
      <div><hui-rating-display class="pill" value="4.2" show-value reviews="320" size="sm"></hui-rating-display></div>
    </div>
  `,
};
