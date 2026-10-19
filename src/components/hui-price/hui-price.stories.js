/**
 * Storybook Stories — HUI Price (giá bán, giá gốc, % giảm)
 */

import { html, nothing } from 'lit';
import { expect } from 'storybook/test';
import { formatCurrency } from '../../core/format.js';
import './index.js';

const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const srText = (el) => el.shadowRoot.querySelector('.sr-only').textContent;

export default {
  title: 'Atoms/HuiPrice',
  component: 'hui-price',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Price** — Hiển thị giá bán đã định dạng theo tiền tệ (\`formatCurrency\`, VND mặc định), giá gốc gạch ngang
(\`<del>\`) và nhãn **% giảm tự tính** khi \`original\` > \`value\`. Giá = 0 → "Miễn phí".

\`\`\`html
<hui-price value="750000" original="1000000"></hui-price>          <!-- 750.000 ₫  1.000.000 ₫  -25% -->
<hui-price value="19.99" currency="USD" size="lg"></hui-price>
<hui-price value="199000" suffix="/tháng"></hui-price>
<hui-price value="0"></hui-price>                                  <!-- Miễn phí -->
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | number | — | Giá bán |
| \`original\` | number | — | Giá gốc — lớn hơn \`value\` thì gạch ngang + nhãn % giảm |
| \`currency\` | string | \`VND\` | Mã tiền tệ ISO 4217 |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`show-discount\` | string | \`true\` | \`show-discount="false"\` để ẩn nhãn % giảm |
| \`free-text\` | string | locale \`price.free\` | Chữ khi giá = 0 |
| \`suffix\` | string | — | Hậu tố nhỏ sau giá (vd "/tháng") |

### Properties
| Property | Mô tả |
|----------|-------|
| \`discount\` (chỉ đọc) | % giảm đang hiển thị (0 = không giảm) |

Hàm tiện ích: \`import { discountPercent } from '@itmrhoang/h-ui/hui-price'\` → \`discountPercent(750000, 1000000) === 25\`.

### Events
Không có (chỉ hiển thị).

### Parts
\`base\`, \`value\`, \`suffix\`, \`original\`, \`discount\`.

### Custom states
\`:state(sale)\` (đang giảm giá) · \`:state(free)\` (giá = 0).

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-price-color\` | Màu giá bán (mặc định: chữ thường; có giảm → danger) |
| \`--hui-price-font-size\` / \`--hui-price-font-weight\` | Cỡ / độ đậm giá bán |
| \`--hui-price-original-color\` / \`--hui-price-original-font-size\` | Giá gốc |
| \`--hui-price-discount-bg\` / \`--hui-price-discount-color\` / \`--hui-price-discount-radius\` | Nhãn % giảm |
| \`--hui-price-free-color\` | Màu chữ "Miễn phí" |
| \`--hui-price-gap\` | Khoảng cách giữa các phần |

### Accessibility
Phần hiển thị \`aria-hidden\`; trình đọc màn hình đọc một câu đầy đủ: "Giá gốc 1.000.000 ₫, giá bán 750.000 ₫, giảm 25%".
Không nhận focus (không có phím tắt).

### Locale
\`price.free\` · \`price.label\` · \`price.srSale\` · \`price.srDiscount\` (chưa có trong locale.js → dùng bản dự phòng vi/en).
        `,
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    original: { control: 'number' },
    currency: { control: 'select', options: ['VND', 'USD', 'EUR', 'JPY'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    showDiscount: { control: 'select', options: ['true', 'false'] },
    suffix: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-price
      value=${args.value ?? nothing}
      original=${args.original ?? nothing}
      currency=${args.currency || nothing}
      size=${args.size || 'md'}
      show-discount=${args.showDiscount || nothing}
      suffix=${args.suffix || nothing}
    ></hui-price>
  `,
  args: { value: 750000, original: 1000000, currency: 'VND', size: 'md', showDiscount: 'true', suffix: '' },
};

/** % giảm tự tính + câu đọc cho trình đọc màn hình */
export const Discount = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-price id="pr-25" value="750000" original="1000000"></hui-price>
      <hui-price id="pr-33" value="1990000" original="2990000"></hui-price>
      <hui-price id="pr-none" value="500000"></hui-price>
      <hui-price id="pr-hide" value="750000" original="1000000" show-discount="false"></hui-price>
      <hui-price id="pr-higher" value="900000" original="800000"></hui-price>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const p25 = canvasElement.querySelector('#pr-25');
    await expect(part(p25, 'discount').textContent).toBe('-25%');
    await expect(p25.discount).toBe(25);
    await expect(part(p25, 'value').textContent).toBe(formatCurrency(750000));
    await expect(part(p25, 'original').tagName).toBe('DEL');
    await expect(part(p25, 'original').textContent).toBe(formatCurrency(1000000));
    await expect(srText(p25)).toBe(`Giá gốc ${formatCurrency(1000000)}, giá bán ${formatCurrency(750000)}, giảm 25%`);

    // 1 - 1.990.000 / 2.990.000 = 33,4% → làm tròn 33
    await expect(part(canvasElement.querySelector('#pr-33'), 'discount').textContent).toBe('-33%');

    const none = canvasElement.querySelector('#pr-none');
    await expect(part(none, 'discount').hidden).toBe(true);
    await expect(part(none, 'original').hidden).toBe(true);
    await expect(srText(none)).toBe(`Giá ${formatCurrency(500000)}`);

    await expect(part(canvasElement.querySelector('#pr-hide'), 'discount').hidden).toBe(true);
    // Giá gốc thấp hơn giá bán → không gạch ngang, không giảm
    const higher = canvasElement.querySelector('#pr-higher');
    await expect(part(higher, 'original').hidden).toBe(true);
    await expect(higher.discount).toBe(0);

    // Đổi property → vẽ lại
    p25.value = 500000;
    await p25.updateComplete;
    await expect(part(p25, 'discount').textContent).toBe('-50%');
  },
};

export const Sizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${['sm', 'md', 'lg'].map((s) => html`<div><hui-price size=${s} value="349000" original="499000"></hui-price></div>`)}
    </div>
  `,
};

/** Tiền tệ khác + hậu tố kỳ hạn */
export const CurrencyAndSuffix = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-price value="19.99" original="29.99" currency="USD"></hui-price>
      <hui-price value="49" currency="EUR" size="lg"></hui-price>
      <hui-price value="199000" suffix="/tháng" size="lg"></hui-price>
    </div>
  `,
};

/** Giá 0 → "Miễn phí" (hoặc free-text) */
export const Free = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-price id="pr-free" value="0" original="150000"></hui-price>
      <hui-price id="pr-free-custom" value="0" free-text="Tặng kèm"></hui-price>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const free = canvasElement.querySelector('#pr-free');
    await expect(part(free, 'value').textContent).toBe('Miễn phí');
    await expect(part(free, 'discount').hidden).toBe(true);
    await expect(part(canvasElement.querySelector('#pr-free-custom'), 'value').textContent).toBe('Tặng kèm');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .price-brand {
        --hui-price-color: var(--hui-primary);
        --hui-price-font-size: 1.75rem;
        --hui-price-discount-bg: var(--hui-warning);
        --hui-price-discount-color: var(--hui-text-inverse);
        --hui-price-discount-radius: 999px;
      }
      hui-price.ticket::part(original) { text-decoration-color: var(--hui-danger); text-decoration-thickness: 2px; }
      hui-price.ticket::part(discount) { transform: rotate(-6deg); }
    </style>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div class="price-brand"><hui-price value="1290000" original="1890000"></hui-price></div>
      <hui-price class="ticket" value="99000" original="199000" size="lg"></hui-price>
    </div>
  `,
};
