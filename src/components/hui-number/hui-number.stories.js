/**
 * Storybook Stories — HUI Number
 */

import { html, nothing } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const shown = (el) => el.shadowRoot.querySelector('[part="value"]').textContent;
const srText = (el) => el.shadowRoot.querySelector('.num__sr').textContent;

export default {
  title: 'Atoms/HuiNumber',
  component: 'hui-number',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Number** — Hiển thị số đã định dạng theo ngôn ngữ hiện tại (Intl), **đếm chạy** khi lần đầu cuộn tới
và mỗi khi giá trị đổi. Bề rộng giữ cố định theo giá trị cuối (không xô bố cục), chữ số đều nhau (tabular-nums).

\`\`\`html
<hui-number value="1234567"></hui-number>                 <!-- 1.234.567 -->
<hui-number value="56890000" format="currency"></hui-number> <!-- 56.890.000 ₫ -->
<hui-number value="12.5" format="percent"></hui-number>     <!-- 12,5 % -->
<hui-number value="1250000" format="compact" suffix="+"></hui-number>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | number | — | Giá trị số |
| \`format\` | string | \`number\` | \`number\` \\| \`number:2\` \\| \`currency\` \\| \`currency:USD\` \\| \`percent\` \\| \`percent:0\` \\| \`compact\` |
| \`prefix\` / \`suffix\` | string | — | Chữ trước / sau số |
| \`count-up\` | string | \`true\` | \`false\` = hiện ngay giá trị cuối |
| \`duration\` | number | \`1200\` | Thời lượng đếm (ms) |
| \`from\` | number | \`0\` | Giá trị bắt đầu ở lượt đếm đầu tiên |
| \`live\` | boolean | \`false\` | aria-live="polite" — thông báo giá trị mới |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng đếm |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`formattedValue\` | (chỉ đọc) chuỗi định dạng của giá trị cuối |
| \`replay()\` | Chạy lại hiệu ứng đếm từ \`from\` |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-count-end\` | \`{ value }\` | Kết thúc một lượt đếm |

### Slots
Không có.

### Parts
\`base\` (khung hiển thị), \`prefix\`, \`value\`, \`suffix\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-number-color\` / \`--hui-number-font-size\` / \`--hui-number-font-weight\` / \`--hui-number-font-family\` | Chữ |
| \`--hui-number-numeric\` | font-variant-numeric (mặc định \`tabular-nums\`) |
| \`--hui-number-affix-color\` | Màu prefix / suffix |
| \`--hui-number-align\` | Căn số trong ô giữ chỗ khi đếm (mặc định \`end\`) |

### Accessibility
Phần đang đếm có \`aria-hidden\`; một bản ẩn luôn chứa giá trị cuối → trình đọc màn hình không đọc số trung gian.
Hiệu ứng tự tắt khi \`prefers-reduced-motion\`, \`<html data-hui-no-animation>\` hoặc \`--hui-motion-duration: 0ms\`.
Không nhận focus (không có phím tắt).
        `,
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    format: { control: 'select', options: ['number', 'number:2', 'currency', 'currency:USD', 'percent', 'percent:0', 'compact'] },
    prefix: { control: 'text' },
    suffix: { control: 'text' },
    duration: { control: 'number' },
    noAnimation: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-number
      style="font-size: 2rem; font-weight: 700;"
      value=${args.value ?? nothing}
      format=${args.format || 'number'}
      prefix=${args.prefix || nothing}
      suffix=${args.suffix || nothing}
      duration=${args.duration ?? nothing}
      ?no-animation=${args.noAnimation}
    ></hui-number>
  `,
  args: { value: 1234567, format: 'number', prefix: '', suffix: '', duration: 600, noAnimation: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-number');
    // Cuộn tới → đếm chạy rồi dừng đúng giá trị cuối
    await waitFor(() => expect(shown(el)).toBe('1.234.567'), { timeout: 3000 });
    await expect(srText(el)).toBe('1.234.567');
    await expect(el.shadowRoot.querySelector('[part="base"]').getAttribute('aria-hidden')).toBe('true');
  },
};

/** Các định dạng — dùng chung core/format.js */
export const Formats = {
  render: () => html`
    <div style="display: grid; grid-template-columns: max-content max-content; gap: 8px 24px; align-items: baseline;">
      <code>number</code><hui-number id="f-number" value="1234567.891" no-animation></hui-number>
      <code>number:2</code><hui-number id="f-number2" value="1234.5" format="number:2" no-animation></hui-number>
      <code>currency</code><hui-number id="f-currency" value="56890000" format="currency" no-animation></hui-number>
      <code>currency:USD</code><hui-number id="f-usd" value="1999.99" format="currency:USD" no-animation></hui-number>
      <code>percent</code><hui-number id="f-percent" value="12.5" format="percent" no-animation></hui-number>
      <code>compact</code><hui-number id="f-compact" value="1250000" format="compact" no-animation></hui-number>
      <code>prefix / suffix</code><hui-number id="f-affix" value="10000" prefix="~" suffix="+" no-animation></hui-number>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const q = (id) => canvasElement.querySelector(`#${id}`);
    await expect(shown(q('f-number2'))).toBe('1.234,50');
    await expect(shown(q('f-currency'))).toMatch(/^56\.890\.000\s₫$/);
    await expect(shown(q('f-percent'))).toMatch(/^12,5\s?%$/);
    await expect(srText(q('f-affix'))).toBe('~10.000+');
    await expect(q('f-currency').formattedValue).toBe(shown(q('f-currency')));
  },
};

/** Đổi giá trị → đếm từ giá trị cũ sang giá trị mới; `live` thông báo cho trình đọc màn hình */
export const ValueChange = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 16px;">
      <hui-number id="vc" value="100" duration="400" live style="font-size: 1.75rem; font-weight: 600;"></hui-number>
      <hui-button id="vc-btn" size="sm">+ 900</hui-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#vc');
    const btn = canvasElement.querySelector('#vc-btn');
    btn.addEventListener('click', () => { el.value += 900; });
    await waitFor(() => expect(shown(el)).toBe('100'), { timeout: 3000 });
    await expect(el.shadowRoot.querySelector('.num__sr').getAttribute('aria-live')).toBe('polite');

    let ended = 0;
    el.addEventListener('hui-count-end', (e) => { if (e.detail.value === 1000) ended++; });
    await userEvent.click(btn);
    // Bản đọc cho trình đọc màn hình đổi ngay, phần hiển thị đếm dần
    await waitFor(() => expect(srText(el)).toBe('1.000'));
    await waitFor(() => expect(shown(el)).toBe('1.000'), { timeout: 3000 });
    await expect(ended).toBe(1);
  },
};

/** Tắt hiệu ứng: count-up="false" hoặc no-animation → hiện ngay giá trị cuối */
export const NoAnimation = {
  render: () => html`
    <hui-number id="na" value="98765" count-up="false" style="font-size: 1.5rem;"></hui-number>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#na');
    await expect(shown(el)).toBe('98.765');
    el.value = 5;
    await el.updateComplete;
    await expect(shown(el)).toBe('5');
    await expect(el.getAttribute('value')).toBe('5');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .num-brand {
        --hui-number-color: var(--hui-primary);
        --hui-number-font-size: 2.5rem;
        --hui-number-font-weight: 800;
        --hui-number-affix-color: var(--hui-text-tertiary);
      }
      hui-number.num-pill::part(base) { padding: 2px 10px; border-radius: 999px; background: var(--hui-primary-light); }
      hui-number.num-pill::part(suffix) { font-size: 0.75em; }
    </style>
    <div style="display: flex; gap: 32px; align-items: center;">
      <span class="num-brand"><hui-number value="250000" suffix="+" duration="800"></hui-number></span>
      <hui-number class="num-pill" value="87" suffix="%" format="number" duration="800"></hui-number>
    </div>
  `,
};
