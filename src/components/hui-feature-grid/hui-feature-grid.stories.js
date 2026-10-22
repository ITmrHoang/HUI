/**
 * Storybook Stories — HUI Feature Grid (lưới tính năng)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const sr = (el) => el.shadowRoot;
const cards = (el) => [...sr(el).querySelectorAll('hui-feature-card')];

const FEATURES = [
  { icon: 'star', title: 'Nhanh như chớp', description: 'Zero-dependency, tải trang dưới 1 giây.', href: '#nhanh' },
  { icon: 'moon', title: 'Dark mode sẵn', description: 'Token màu tự đổi theo theme, không viết thêm CSS.', color: 'secondary' },
  { icon: 'settings', title: 'Tùy biến dễ', description: 'Biến CSS, ::part, slot cho mọi phần.', color: 'success' },
  { icon: 'user', title: 'A11y chuẩn', description: 'Bàn phím + ARIA theo WAI-ARIA APG.', color: 'info' },
  { icon: 'grid', title: 'Data-driven', description: 'Truyền mảng data là có giao diện.', color: 'warning' },
  { icon: 'heart', title: 'Hiệu ứng đẹp', description: 'Tilt, glow, reveal… bật bằng 1 attribute.', color: 'danger', effect: 'tilt glow' },
];

export default {
  title: 'Organisms/HuiFeatureGrid',
  component: 'hui-feature-grid',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Feature Grid** — Lưới tính năng: \`data\` → các \`<hui-feature-card>\` (hoặc đặt sẵn thẻ con). Số cột tự chia theo
bề rộng khung (container query, mặc định thẻ ≥ 240px); \`columns\` cố định tự giảm còn 2 cột (< 640px) rồi 1 cột (< 400px).
Thẻ **hiện lần lượt** khi cuộn tới (\`stagger\` ms); \`no-animation\` / giảm chuyển động → hiện ngay.

\`\`\`html
<hui-feature-grid columns="3" variant="outline" align="center"></hui-feature-grid>
<script>grid.data = [{ icon: 'star', title: 'Nhanh', description: '…', href: '/nhanh' }, …];</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | array (JSON) | — | \`[{ icon, title, description, href, target, linkText, color, iconShape, effect }]\` |
| \`columns\` | number | tự động | Số cột cố định |
| \`variant\` | string | \`card\` | \`plain\` \\| \`card\` \\| \`outline\` (áp cho mọi thẻ) |
| \`align\` / \`orientation\` / \`size\` | string | \`start\` / \`vertical\` / \`md\` | Chuyển xuống từng thẻ |
| \`effect\` | string | — | Hiệu ứng hui-card cho mọi thẻ (\`item.effect\` ưu tiên) |
| \`heading-level\` | number | \`3\` | Cấp heading tiêu đề thẻ |
| \`gap\` | string | — | \`xs\`…\`xl\`, số (px) hoặc CSS length |
| \`stagger\` | number | \`80\` | Trễ giữa các thẻ khi hiện (ms) |
| \`label\` | string | — | aria-label của danh sách |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

Thẻ con (không có \`data\`): lưới chỉ điền \`variant\` / \`align\` / \`orientation\` / \`size\` / \`effect\` mà thẻ **chưa tự đặt**.

### Properties
\`items\` (chỉ đọc) — các thẻ đang hiển thị.

### Events · Slots · Parts
Không có event riêng. Slot mặc định: thẻ con. Parts: \`base\` (lưới, role="list" khi từ data), \`item\` (mỗi thẻ).

### CSS Variables
\`--hui-feature-grid-gap\` · \`--hui-feature-grid-min-width\` (mặc định 240px) · và mọi \`--hui-feature-card-*\`.

### Bàn phím
Tab lần lượt qua link "Tìm hiểu thêm" của từng thẻ.
        `,
      },
    },
  },
  argTypes: {
    columns: { control: { type: 'number', min: 1, max: 6 } },
    variant: { control: 'select', options: ['plain', 'card', 'outline'] },
    align: { control: 'select', options: ['start', 'center'] },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-feature-grid id="fg" .data=${FEATURES} columns=${args.columns} variant=${args.variant} align=${args.align}
      orientation=${args.orientation} size=${args.size} label="Tính năng nổi bật"></hui-feature-grid>
  `,
  args: { columns: 3, variant: 'card', align: 'start', orientation: 'vertical', size: 'md' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fg');
    const list = cards(el);
    await expect(list.length).toBe(6);
    const base = sr(el).querySelector('[part="base"]');
    await expect(base.getAttribute('role')).toBe('list');
    await expect(base.getAttribute('aria-label')).toBe('Tính năng nổi bật');
    await expect(list[0].getAttribute('role')).toBe('listitem');
    await expect(list[0].title).toBe('Nhanh như chớp');
    await expect(list[0].getAttribute('href')).toBe('#nhanh');
    await expect(list[1].getAttribute('color')).toBe('secondary');
    await expect(list[5].getAttribute('effect')).toBe('tilt glow');
    // 3 cột cố định
    await expect(getComputedStyle(base).gridTemplateColumns.split(' ').length).toBe(3);
    // Hiện lần lượt khi cuộn tới → hết ẩn
    await waitFor(() => expect(list.every((c) => c.style.opacity === '')).toBe(true));
  },
};

/** Cột tự co theo bề rộng khung (container query) */
export const ResponsiveColumns = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <div style="width: 360px; border: 1px dashed var(--hui-border); padding: 8px;">
        <hui-feature-grid id="fg-narrow" .data=${FEATURES.slice(0, 3)} columns="3" variant="plain" size="sm"></hui-feature-grid>
      </div>
      <div style="width: 600px; border: 1px dashed var(--hui-border); padding: 8px;">
        <hui-feature-grid id="fg-mid" .data=${FEATURES.slice(0, 4)} columns="4" variant="outline" size="sm"></hui-feature-grid>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cols = (id) => getComputedStyle(sr(canvasElement.querySelector(id)).querySelector('[part="base"]')).gridTemplateColumns.split(' ').length;
    await expect(cols('#fg-narrow')).toBe(1);
    await expect(cols('#fg-mid')).toBe(2);
  },
};

/** Thẻ con: lưới điền thuộc tính chung, giữ giá trị thẻ tự đặt */
export const SlottedCards = {
  render: () => html`
    <hui-feature-grid id="fg-slot" variant="outline" align="center" effect="lift" gap="lg">
      <hui-feature-card icon="mail" title="Email" description="Hỗ trợ qua email 24/7."></hui-feature-card>
      <hui-feature-card icon="phone" title="Hotline" description="Gọi miễn phí." variant="card" effect="glow"></hui-feature-card>
      <hui-feature-card icon="chat" title="Chat" description="Phản hồi trong 5 phút."></hui-feature-card>
    </hui-feature-grid>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fg-slot');
    const [a, b] = el.querySelectorAll('hui-feature-card');
    await waitFor(() => expect(a.getAttribute('variant')).toBe('outline'));
    await expect(a.getAttribute('align')).toBe('center');
    await expect(a.getAttribute('effect')).toBe('lift');
    // Thẻ tự đặt → giữ nguyên
    await expect(b.getAttribute('variant')).toBe('card');
    await expect(b.getAttribute('effect')).toBe('glow');
    await expect(el.items.length).toBe(3);
    // Đổi variant của lưới → thẻ chưa tự đặt đổi theo
    el.variant = 'plain';
    await el.updateComplete;
    await expect(a.getAttribute('variant')).toBe('plain');
    await expect(b.getAttribute('variant')).toBe('card');
  },
};

/** Đổi data lúc chạy; no-animation */
export const DynamicData = {
  render: () => html`
    <hui-feature-grid id="fg-dyn" no-animation .data=${FEATURES.slice(0, 2)} variant="plain" orientation="horizontal"></hui-feature-grid>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fg-dyn');
    await expect(cards(el).length).toBe(2);
    await expect(cards(el)[0].getAttribute('orientation')).toBe('horizontal');
    await expect(cards(el)[0].hasAttribute('no-animation')).toBe(true);
    el.data = FEATURES;
    await el.updateComplete;
    await expect(cards(el).length).toBe(6);
    await expect(cards(el).every((c) => c.style.opacity === '')).toBe(true);
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .fg-custom {
        --hui-feature-grid-gap: 8px;
        --hui-feature-grid-min-width: 180px;
        --hui-feature-card-accent: #0d9488;
      }
      .fg-custom::part(item) { outline: 1px dashed #0d9488; outline-offset: 4px; border-radius: 12px; }
    </style>
    <hui-feature-grid id="fg-custom" class="fg-custom" .data=${FEATURES} variant="plain" size="sm"></hui-feature-grid>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fg-custom');
    await expect(getComputedStyle(sr(el).querySelector('[part="base"]')).rowGap).toBe('8px');
    await expect(getComputedStyle(cards(el)[0]).outlineStyle).toBe('dashed');
  },
};
