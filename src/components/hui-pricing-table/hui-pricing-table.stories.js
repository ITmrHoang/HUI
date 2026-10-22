/**
 * Storybook Stories — HUI Pricing Table (bảng giá + công tắc tháng / năm)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { maxYearlySaving } from './index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);
const options = (el) => [...sr(el).querySelectorAll('[part~="toggle-option"]')];
const cards = (el) => [...sr(el).querySelectorAll('hui-pricing-card')];

const PLANS = [
  { plan: 'Cơ bản', price: 0, yearlyPrice: 0, description: 'Cho cá nhân dùng thử.', features: ['1 dự án', '1 GB lưu trữ', { text: 'Tên miền riêng', included: false }] },
  {
    plan: 'Chuyên nghiệp', price: 199000, yearlyPrice: 1910000, description: 'Cho nhóm nhỏ đang phát triển.', highlighted: true,
    features: ['10 dự án', '50 GB lưu trữ', 'Tên miền riêng', 'Hỗ trợ ưu tiên'], ctaText: 'Dùng thử 14 ngày',
  },
  { plan: 'Doanh nghiệp', price: 499000, yearlyPrice: 4790000, description: 'Không giới hạn, SLA 99,9%.', features: ['Không giới hạn dự án', '1 TB lưu trữ', 'SSO + Audit log', 'Quản lý tài khoản riêng'] },
];

export default {
  title: 'Organisms/HuiPricingTable',
  component: 'hui-pricing-table',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Pricing Table** — Bảng giá: \`data\` các gói → \`<hui-pricing-card>\`, công tắc **Theo tháng ↔ Theo năm** dựng sẵn
(radiogroup dạng segmented, nền trượt, nhãn giảm giá tự tính "-20%" từ \`price\` × 12 so với \`yearlyPrice\`), gói nổi bật
(\`highlighted\` → phóng to + viền chạy + ruy-băng "Phổ biến"). Đặt sẵn \`<hui-pricing-card>\` con cũng được — bảng chỉ đồng bộ \`billing\`.

\`\`\`html
<hui-pricing-table billing="yearly" columns="3"></hui-pricing-table>
<script>
  table.data = [{ plan: 'Pro', price: 199000, yearlyPrice: 1910000, features: ['10 dự án'], highlighted: true }, …];
  table.addEventListener('hui-select', (e) => console.log(e.detail.plan, e.detail.billing));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | array (JSON) | — | \`[{ plan, price, yearlyPrice, description, features, highlighted, highlightText, ctaText, ctaHref, period, yearlyPeriod, currency, effect }]\` |
| \`billing\` | string | \`monthly\` | \`monthly\` \\| \`yearly\` |
| \`currency\` | string | \`VND\` | Tiền tệ chung |
| \`discount\` | string | tự tính | Nhãn trên "Theo năm" (\`""\` = ẩn) |
| \`monthly-label\` / \`yearly-label\` | string | locale | Chữ 2 lựa chọn |
| \`no-toggle\` | boolean | \`false\` | Ẩn công tắc |
| \`columns\` | number | tự động | Số cột cố định (khung < 720px còn 2, < 480px còn 1) |
| \`variant\` / \`size\` / \`effect\` | string | \`outlined\` / \`md\` / — | Chuyển xuống mọi thẻ |
| \`gap\` | string | — | Khoảng cách các gói |
| \`no-animation\` | boolean | \`false\` | Tắt chuyển động |

### Properties
\`plans\` (chỉ đọc) — các thẻ gói đang hiển thị. Hàm: \`import { maxYearlySaving } from '@itmrhoang/h-ui/hui-pricing-table'\`.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-billing-change\` | \`{ billing }\` | Người dùng đổi kỳ thanh toán |
| \`hui-select\` | \`{ plan, name, index, billing, price }\` | Bấm CTA của gói từ data (\`plan\` = object gốc). Cancelable |

### Slots
\`(mặc định)\` thẻ \`<hui-pricing-card>\` con · \`footer\` ghi chú dưới bảng.

### Parts
\`base\`, \`toggle\`, \`toggle-thumb\`, \`toggle-option\` (+ \`toggle-option-active\`), \`discount\`, \`grid\`, \`plan\`, \`footer\`.

### CSS Variables
\`--hui-pricing-table-gap\` · \`-min-width\` · \`-toggle-bg\` · \`-toggle-thumb-bg\` · \`-toggle-color\` · \`-toggle-active-color\` ·
\`-discount-bg\` · \`-discount-color\` · và mọi \`--hui-pricing-card-*\`.

### Bàn phím (APG Radio Group)
\`Tab\` vào lựa chọn đang chọn · \`←\`/\`→\`/\`↑\`/\`↓\` đổi và chọn luôn · \`Home\`/\`End\` về đầu / cuối.

### Locale
\`pricingTable.monthly\` · \`pricingTable.yearly\` · \`pricingTable.billing\` · \`pricingTable.plans\`.
        `,
      },
    },
  },
  argTypes: {
    billing: { control: 'select', options: ['monthly', 'yearly'] },
    columns: { control: { type: 'number', min: 1, max: 4 } },
    variant: { control: 'select', options: ['elevated', 'outlined', 'filled', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-pricing-table id="pt" .data=${PLANS} billing=${args.billing} columns=${args.columns} variant=${args.variant} size=${args.size}>
      <span slot="footer">Giá chưa gồm VAT · Hủy bất cứ lúc nào</span>
    </hui-pricing-table>
  `,
  args: { billing: 'monthly', columns: 3, variant: 'outlined', size: 'md' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pt');
    const list = cards(el);
    await expect(list.length).toBe(3);
    await expect(list[1].hasAttribute('highlighted')).toBe(true);
    await expect(list[1].getAttribute('cta-text')).toBe('Dùng thử 14 ngày');
    await expect(list.every((c) => c.getAttribute('billing') === 'monthly')).toBe(true);
    await expect(list[0].features.length).toBe(3);
    // Nhãn giảm giá tự tính: 1 - 1.910.000 / (199.000 × 12) ≈ 20%
    await expect(maxYearlySaving(PLANS)).toBe(20);
    await expect(part(el, 'discount').textContent).toBe('-20%');
    const [month, year] = options(el);
    await expect(part(el, 'toggle').getAttribute('role')).toBe('radiogroup');
    await expect(month.getAttribute('aria-checked')).toBe('true');
    await expect(year.tabIndex).toBe(-1);
    await expect(part(el, 'footer').hidden).toBe(false);

    // Bấm "Theo năm" → hui-billing-change + thẻ đổi billing
    let changed = null;
    el.addEventListener('hui-billing-change', (e) => { changed = e.detail.billing; }, { once: true });
    await userEvent.click(year);
    await expect(changed).toBe('yearly');
    await expect(el.billing).toBe('yearly');
    await waitFor(() => expect(list.every((c) => c.getAttribute('billing') === 'yearly')).toBe(true));
    await expect(year.getAttribute('aria-checked')).toBe('true');
    await expect(year.getAttribute('part')).toContain('toggle-option-active');
  },
};

/** Bàn phím trên công tắc (APG radiogroup) */
export const Keyboard = {
  render: () => html`<hui-pricing-table id="pt-kb" .data=${PLANS} no-animation></hui-pricing-table>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pt-kb');
    const [month, year] = options(el);
    month.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(el.billing).toBe('yearly');
    await expect(sr(el).activeElement).toBe(year);
    await userEvent.keyboard('{ArrowRight}');
    await expect(el.billing).toBe('monthly');
    await userEvent.keyboard('{End}');
    await expect(el.billing).toBe('yearly');
    await userEvent.keyboard('{Home}');
    await expect(el.billing).toBe('monthly');
    await expect(sr(el).activeElement).toBe(month);
  },
};

/** hui-select gom từ thẻ: detail.plan = object gốc; preventDefault() chặn cta-href */
export const SelectEvent = {
  render: () => html`<hui-pricing-table id="pt-sel" billing="yearly" .data=${PLANS.map((p) => ({ ...p, ctaHref: '#mua' }))}></hui-pricing-table>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pt-sel');
    let detail = null;
    let outerCount = 0;
    const onSelect = (e) => { outerCount += 1; detail = e.detail; e.preventDefault(); };
    el.addEventListener('hui-select', onSelect);
    const hashBefore = location.hash;
    const card = cards(el)[2];
    card.shadowRoot.querySelector('[part~="cta"]').shadowRoot.querySelector('button').click();
    await expect(outerCount).toBe(1);
    await expect(detail.plan.plan).toBe('Doanh nghiệp');
    await expect(detail.name).toBe('Doanh nghiệp');
    await expect(detail.index).toBe(2);
    await expect(detail.billing).toBe('yearly');
    await expect(detail.price).toBe(4790000);
    await expect(location.hash).toBe(hashBefore);
    el.removeEventListener('hui-select', onSelect);
  },
};

/** Thẻ con + discount tùy chỉnh + không công tắc */
export const SlottedAndOptions = {
  render: () => html`
    <div style="display: grid; gap: 40px;">
      <hui-pricing-table id="pt-slot" discount="Tiết kiệm 2 tháng" yearly-label="Hàng năm" monthly-label="Hàng tháng">
        <hui-pricing-card plan="Starter" price="99000" yearly-price="990000" .features=${['3 dự án']}></hui-pricing-card>
        <hui-pricing-card plan="Team" price="299000" yearly-price="2990000" highlighted .features=${['20 dự án', 'Nhóm 10 người']}></hui-pricing-card>
      </hui-pricing-table>
      <hui-pricing-table id="pt-notoggle" no-toggle .data=${PLANS.slice(0, 2)} columns="2" variant="elevated" effect="lift"></hui-pricing-table>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pt-slot');
    await expect(part(el, 'discount').textContent).toBe('Tiết kiệm 2 tháng');
    await expect(options(el)[1].textContent).toContain('Hàng năm');
    const slotted = [...el.querySelectorAll('hui-pricing-card')];
    await expect(el.plans.length).toBe(2);
    await userEvent.click(options(el)[1]);
    await expect(slotted.every((c) => c.getAttribute('billing') === 'yearly')).toBe(true);
    const nt = canvasElement.querySelector('#pt-notoggle');
    await expect(part(nt, 'toggle').hidden).toBe(true);
    await expect(cards(nt)[0].getAttribute('effect')).toBe('lift');
    await expect(cards(nt)[0].getAttribute('variant')).toBe('elevated');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .pt-custom {
        --hui-pricing-table-toggle-bg: #1e293b;
        --hui-pricing-table-toggle-thumb-bg: #6366f1;
        --hui-pricing-table-toggle-color: #94a3b8;
        --hui-pricing-table-toggle-active-color: #fff;
        --hui-pricing-table-discount-bg: #f59e0b;
        --hui-pricing-table-discount-color: #fff;
        --hui-pricing-card-accent: #6366f1;
      }
      .pt-custom::part(toggle) { padding: 6px; }
      .pt-custom::part(plan) { --hui-card-radius: 20px; }
    </style>
    <hui-pricing-table id="pt-custom" class="pt-custom" .data=${PLANS}></hui-pricing-table>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pt-custom');
    await expect(getComputedStyle(part(el, 'toggle')).backgroundColor).toBe('rgb(30, 41, 59)');
    await expect(getComputedStyle(part(el, 'toggle-thumb')).backgroundColor).toBe('rgb(99, 102, 241)');
    await expect(getComputedStyle(part(el, 'discount')).backgroundColor).toBe('rgb(245, 158, 11)');
    await expect(getComputedStyle(part(el, 'toggle')).paddingTop).toBe('6px');
  },
};
