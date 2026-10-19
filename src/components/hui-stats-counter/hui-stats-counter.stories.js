/**
 * Storybook Stories — HUI Stats Counter
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const DATA = [
  { value: 10000, suffix: '+', label: 'Khách hàng', icon: 'user' },
  { value: 98.5, format: 'number:1', suffix: '%', label: 'Hài lòng', icon: 'heart' },
  { value: 1250000000, format: 'compact', label: 'Doanh thu (VND)', icon: 'star', description: 'Năm 2025' },
  { value: '24/7', label: 'Hỗ trợ', icon: 'phone' },
];

const numbers = (el) => [...el.shadowRoot.querySelectorAll('hui-number')];
const shown = (n) => n.shadowRoot.querySelector('[part="value"]').textContent;

export default {
  title: 'Organisms/HuiStatsCounter',
  component: 'hui-stats-counter',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Stats Counter** — Dải số liệu nổi bật ("10.000+ khách hàng") **đếm chạy khi cuộn tới**. Mỗi số là một
\`<hui-number>\` (định dạng theo locale: number / currency / percent / compact). Lưới cột tự co theo bề rộng khung
(container query): \`columns\` cố định tự giảm còn 2 rồi 1 cột trên màn hình hẹp.

\`\`\`html
<hui-stats-counter variant="card" columns="4"></hui-stats-counter>
<script>
  el.data = [{ value: 10000, suffix: '+', label: 'Khách hàng', icon: 'user' }, …];
</script>

<!-- Hoặc khai báo bằng phần tử con (data-*) -->
<hui-stats-counter>
  <div data-value="120" data-suffix="+" data-icon="home">Chi nhánh</div>
  <div data-value="35" data-format="percent">Tăng trưởng</div>
</hui-stats-counter>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | array (JSON) | — | \`[{ value, label, prefix, suffix, format, icon, description }]\` |
| \`variant\` | string | \`plain\` | \`plain\` \\| \`card\` \\| \`divided\` |
| \`columns\` | number | tự động | Số cột cố định; bỏ trống = tự chia theo \`--hui-stats-counter-min-width\` |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`align\` | string | \`center\` | \`center\` \\| \`start\` |
| \`duration\` | number | \`2000\` | Thời lượng đếm (ms) |
| \`stagger\` | number | \`0\` | Mỗi ô sau đếm lâu hơn ô trước bấy nhiêu ms |
| \`no-animation\` | boolean | \`false\` | Tắt đếm chạy |
| \`label\` | string | "Số liệu nổi bật" | Tên vùng cho trình đọc màn hình |

Item: \`value\` không phải số (vd \`"24/7"\`) → hiện nguyên văn, không đếm.

### Properties
| Tên | Mô tả |
|-----|-------|
| \`items\` | (chỉ đọc) danh sách item đang hiển thị |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-count-end\` | \`{ value }\` | Nổi bọt từ từng số khi đếm xong |

### Slots
Không có — phần tử con chỉ là **dữ liệu** (đọc \`data-value\`, \`data-label\` (hoặc chữ bên trong), \`data-prefix\`, \`data-suffix\`,
\`data-format\`, \`data-icon\`, \`data-description\`), tự cập nhật khi con thay đổi.

### Parts
\`base\` (role="list"), \`item\` (role="listitem"), \`icon\`, \`value\`, \`number\`, \`prefix\`, \`suffix\`, \`label\`, \`description\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-stats-counter-gap\` / \`--hui-stats-counter-min-width\` | Lưới |
| \`--hui-stats-counter-value-size\` / \`-value-weight\` / \`-value-color\` / \`-affix-color\` | Số |
| \`--hui-stats-counter-label-color\` / \`-label-size\` / \`-description-color\` | Chữ |
| \`--hui-stats-counter-icon-color\` / \`-icon-bg\` | Icon |
| \`--hui-stats-counter-item-bg\` / \`-item-radius\` / \`-item-padding\` / \`-item-shadow\` | Ô (card) |
| \`--hui-stats-counter-divider-color\` | Vạch chia (divided) |

### Accessibility
\`role="list"\` + \`aria-label\`; số đang đếm ẩn với trình đọc màn hình, luôn đọc giá trị cuối ("10.000+ Khách hàng").
Không nhận focus.
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['plain', 'card', 'divided'] },
    columns: { control: 'number' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    align: { control: 'inline-radio', options: ['center', 'start'] },
    duration: { control: 'number' },
    noAnimation: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-stats-counter
      .data=${DATA}
      variant=${args.variant}
      columns=${args.columns || ''}
      size=${args.size}
      align=${args.align}
      duration=${args.duration}
      ?no-animation=${args.noAnimation}
    ></hui-stats-counter>
  `,
  args: { variant: 'plain', columns: 4, size: 'md', align: 'center', duration: 600, noAnimation: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-stats-counter');
    const base = el.shadowRoot.querySelector('[part="base"]');
    await expect(base.getAttribute('role')).toBe('list');
    await expect(base.getAttribute('aria-label')).toBe('Số liệu nổi bật');
    await expect(el.shadowRoot.querySelectorAll('[role="listitem"]').length).toBe(4);
    const nums = numbers(el);
    await expect(nums.length).toBe(3); // "24/7" không phải số
    await waitFor(() => expect(shown(nums[0])).toBe('10.000'), { timeout: 4000 });
    await expect(nums[0].shadowRoot.querySelector('.num__sr').textContent).toBe('10.000+');
    await waitFor(() => expect(shown(nums[1])).toBe('98,5'), { timeout: 4000 });
    await expect(el.shadowRoot.querySelector('.sc__text').textContent).toBe('24/7');
    await expect(el.shadowRoot.querySelector('[part="description"]').textContent).toBe('Năm 2025');
    // 4 cột trên khung rộng
    const cols = getComputedStyle(base).gridTemplateColumns.split(' ').length;
    await expect(cols).toBe(el.getBoundingClientRect().width > 640 ? 4 : 2);
  },
};

export const Variants = {
  render: () => html`
    <div style="display: grid; gap: 40px;">
      <hui-stats-counter variant="plain" .data=${DATA}></hui-stats-counter>
      <hui-stats-counter variant="card" .data=${DATA}></hui-stats-counter>
      <hui-stats-counter id="divided" variant="divided" .data=${DATA.slice(0, 3)} align="start"></hui-stats-counter>
    </div>
  `,
};

/** Khai báo bằng phần tử con (data-*), tự cập nhật khi con thay đổi */
export const FromChildren = {
  render: () => html`
    <hui-stats-counter id="kids" variant="card" no-animation>
      <div data-value="120" data-suffix="+" data-icon="home">Chi nhánh</div>
      <div data-value="35" data-format="percent" data-icon="star">Tăng trưởng</div>
      <div data-value="56890000" data-format="currency" data-label="Doanh thu TB" data-description="mỗi tháng"></div>
    </hui-stats-counter>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#kids');
    const labels = () => [...el.shadowRoot.querySelectorAll('[part="label"]')].map((n) => n.textContent);
    await expect(labels()).toEqual(['Chi nhánh', 'Tăng trưởng', 'Doanh thu TB']);
    await expect(shown(numbers(el)[1])).toMatch(/^35\s?%$/);
    await expect(shown(numbers(el)[2])).toMatch(/^56\.890\.000\s₫$/);
    // Thêm con → tự dựng lại
    const div = document.createElement('div');
    div.dataset.value = '7';
    div.textContent = 'Năm kinh nghiệm';
    el.append(div);
    await waitFor(() => expect(labels().length).toBe(4));
    await expect(shown(numbers(el)[3])).toBe('7');
  },
};

/** Khung hẹp → columns tự giảm (container query) */
export const Responsive = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <div style="width: 520px; max-width: 100%; border: 1px dashed var(--hui-border);">
        <hui-stats-counter id="narrow" columns="4" size="sm" .data=${DATA}></hui-stats-counter>
      </div>
      <div style="width: 300px; border: 1px dashed var(--hui-border);">
        <hui-stats-counter id="tiny" columns="4" size="sm" variant="divided" .data=${DATA}></hui-stats-counter>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cols = (id) => getComputedStyle(canvasElement.querySelector(`#${id}`).shadowRoot.querySelector('[part="base"]'))
      .gridTemplateColumns.split(' ').length;
    await expect(cols('narrow')).toBe(2);
    await expect(cols('tiny')).toBe(1);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .sc-brand {
        --hui-stats-counter-value-color: var(--hui-primary);
        --hui-stats-counter-affix-color: var(--hui-success);
        --hui-stats-counter-label-color: var(--hui-text);
        --hui-stats-counter-icon-bg: var(--hui-success-light);
        --hui-stats-counter-icon-color: var(--hui-success);
        --hui-stats-counter-item-bg: var(--hui-primary-1);
        --hui-stats-counter-item-radius: 4px;
        --hui-stats-counter-gap: 12px;
      }
      hui-stats-counter.sc-brand::part(label) { text-transform: uppercase; letter-spacing: 0.06em; font-size: 12px; }
      hui-stats-counter.sc-brand::part(suffix) { font-size: 0.6em; vertical-align: super; }
    </style>
    <hui-stats-counter class="sc-brand" variant="card" size="lg" stagger="250" .data=${DATA}></hui-stats-counter>
  `,
};
