/**
 * Storybook Stories — HUI Pricing Card (thẻ gói giá)
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import { formatCurrency } from '../../core/format.js';
import './index.js';
import '../hui-icon/index.js';

const sr = (el) => el.shadowRoot;
const priceValue = (el) => sr(el).querySelector('hui-price').shadowRoot.querySelector('[part~="value"]').textContent;
const priceSuffix = (el) => sr(el).querySelector('hui-price').shadowRoot.querySelector('[part~="suffix"]').textContent;

const BASIC = ['5 dự án', '10 GB lưu trữ', { text: 'Tên miền riêng', included: false }, { text: 'Hỗ trợ 24/7', included: false }];
const PRO = ['50 dự án', '100 GB lưu trữ', 'Tên miền riêng', { text: 'Hỗ trợ 24/7', included: false }];
const BUSINESS = ['Không giới hạn dự án', '1 TB lưu trữ', 'Tên miền riêng', 'Hỗ trợ 24/7'];

export default {
  title: 'Molecules/HuiPricingCard',
  component: 'hui-pricing-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Pricing Card** — Thẻ gói giá dựng trên \`<hui-card>\`: tên gói, giá / kỳ (\`<hui-price>\`), mô tả, danh sách tính năng ✓/✗,
nút CTA. \`highlighted\` = gói đề xuất: phóng to nhẹ + \`effect="border-gradient"\` + ruy-băng "Phổ biến" (\`<hui-badge-ribbon>\`).
\`billing="yearly"\` + \`yearly-price\` → đổi giá hiển thị (kèm "Tiết kiệm x%").

\`\`\`html
<hui-pricing-card plan="Pro" price="199000" yearly-price="1990000" description="Cho nhóm nhỏ" highlighted
  features='["50 dự án", "100 GB lưu trữ", {"text": "Hỗ trợ 24/7", "included": false}]'>
</hui-pricing-card>

<!-- hoặc tính năng dạng <li> -->
<hui-pricing-card plan="Basic" price="0">
  <li>5 dự án</li>
  <li data-excluded>Tên miền riêng</li>
</hui-pricing-card>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`plan\` | string | — | Tên gói |
| \`heading-level\` | number | \`3\` | aria-level của tên gói |
| \`price\` | number | — | Giá tháng (0 = "Miễn phí") |
| \`yearly-price\` | number | — | Giá năm (dùng khi \`billing="yearly"\`) |
| \`billing\` | string | \`monthly\` | \`monthly\` \\| \`yearly\` |
| \`period\` / \`yearly-period\` | string | locale \`/tháng\` · \`/năm\` | Kỳ hiển thị sau giá |
| \`currency\` | string | \`VND\` | Mã tiền tệ |
| \`description\` | string | — | Mô tả ngắn |
| \`features\` | JSON | — | Mảng chuỗi hoặc \`{ text, included }\` |
| \`highlighted\` | boolean | \`false\` | Gói nổi bật (phóng to + viền chạy + ruy-băng) |
| \`highlight-text\` | string | locale \`Phổ biến\` | Chữ ruy-băng |
| \`cta-text\` / \`cta-href\` | string | locale \`Chọn gói\` / — | Nút CTA / link mở khi bấm |
| \`effect\` | string | — | Hiệu ứng hui-card (highlighted tự thêm \`border-gradient\`) |
| \`variant\` | string | \`outlined\` | \`elevated\` \\| \`outlined\` \\| \`filled\` \\| \`ghost\` |
| \`href\` / \`target\` / \`orientation\` / \`size\` / \`loading\` | — | — | Chuyển thẳng xuống hui-card |
| \`no-animation\` | boolean | \`false\` | Tắt phóng to, viền chạy, hiệu ứng đổi giá |

### Properties
| Property | Mô tả |
|----------|-------|
| \`features\` | Mảng tính năng (gán trực tiếp không cần JSON) |
| \`currentPrice\` (chỉ đọc) | Giá đang hiển thị theo billing |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-select\` | \`{ plan, billing, price }\` | Bấm CTA. Cancelable: \`preventDefault()\` để không mở \`cta-href\` |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Thêm tính năng \`<li>\` (\`<li data-excluded>\` = không có) |
| \`icon\` | Icon / hình minh họa trên tên gói |
| \`footer\` | Chân thẻ |
| \`overlay\` | Lớp phủ (chuyển xuống hui-card) |

### Parts
\`ribbon\`, \`ribbon-text\`, \`icon\`, \`plan\`, \`description\`, \`pricing\`, \`price\` (+ \`price-value\`, \`price-suffix\`),
\`save\`, \`features\`, \`feature\` (+ \`feature-included\` \\| \`feature-excluded\`), \`feature-icon\`, \`cta\` (+ \`cta-base\`),
và part của hui-card (\`card\`, \`body\`, \`actions\`, \`footer\`…).

### Custom states
\`:state(highlighted)\` · \`:state(yearly)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-pricing-card-accent\` | Màu nhấn (vòng icon) |
| \`--hui-pricing-card-plan-color\` / \`--hui-pricing-card-plan-font-size\` | Tên gói |
| \`--hui-pricing-card-price-font-size\` | Cỡ chữ giá |
| \`--hui-pricing-card-check-color\` / \`--hui-pricing-card-excluded-color\` | Màu ✓ / tính năng không có |
| \`--hui-pricing-card-feature-gap\` | Khoảng cách giữa các tính năng |
| \`--hui-pricing-card-highlight-scale\` | Độ phóng gói nổi bật (1.04) |
| \`--hui-card-gradient\` … | Biến hiệu ứng của hui-card (viền chạy) |

### Bàn phím
\`Tab\` tới nút CTA · \`Enter\` / \`Space\` chọn gói. Icon ✓/✗ có nhãn "Có" / "Không có" cho trình đọc màn hình.

### Locale
\`pricing.popular\` · \`pricing.month\` · \`pricing.year\` · \`pricing.cta\` · \`pricing.included\` · \`pricing.excluded\` · \`pricing.save\`.
        `,
      },
    },
  },
  argTypes: {
    plan: { control: 'text' },
    price: { control: 'number' },
    yearlyPrice: { control: 'number' },
    billing: { control: 'select', options: ['monthly', 'yearly'] },
    highlighted: { control: 'boolean' },
    variant: { control: 'select', options: ['elevated', 'outlined', 'filled', 'ghost'] },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 320px; padding: 16px;">
      <hui-pricing-card
        plan=${args.plan}
        price=${args.price}
        yearly-price=${args.yearlyPrice}
        billing=${args.billing}
        variant=${args.variant}
        description="Cho nhóm nhỏ đang phát triển"
        ?highlighted=${args.highlighted}
        .features=${PRO}
      ></hui-pricing-card>
    </div>
  `,
  args: { plan: 'Pro', price: 199000, yearlyPrice: 1990000, billing: 'monthly', highlighted: true, variant: 'outlined' },
};

/** Tính năng ✓/✗ từ property features + slot <li> */
export const Features = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 260px)); gap: 24px;">
      <hui-pricing-card id="pc-feat" plan="Basic" price="0" .features=${BASIC}></hui-pricing-card>
      <hui-pricing-card id="pc-li" plan="Starter" price="99000">
        <li>3 thành viên</li>
        <li>Báo cáo cơ bản</li>
        <li data-excluded>Xuất dữ liệu</li>
      </hui-pricing-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pc-feat');
    const items = sr(el).querySelectorAll('[part~="feature"]');
    await expect(items.length).toBe(4);
    await expect(sr(el).querySelectorAll('[part~="feature-included"]').length).toBe(2);
    await expect(sr(el).querySelectorAll('[part~="feature-excluded"]').length).toBe(2);
    await expect(items[0].querySelector('hui-icon').getAttribute('name')).toBe('check');
    await expect(items[2].querySelector('hui-icon').getAttribute('name')).toBe('close');
    await expect(items[2].querySelector('hui-icon').getAttribute('label')).toBe('Không có');
    // li là con trực tiếp của ul (đúng ngữ nghĩa danh sách)
    await expect(items[0].parentElement.tagName).toBe('UL');
    // Giá 0 → "Miễn phí", không hậu tố
    await expect(priceValue(el)).toBe('Miễn phí');

    // Đổi property features → vẽ lại
    el.features = ['A', { text: 'B', included: false }, 'C'];
    await el.updateComplete;
    await expect(sr(el).querySelectorAll('[part~="feature-included"]').length).toBe(2);
    await expect(sr(el).querySelectorAll('[part~="feature-excluded"]').length).toBe(1);

    // Slot <li>: danh sách hiện, không có li sinh ra
    const li = canvasElement.querySelector('#pc-li');
    await expect(sr(li).querySelector('[part~="features"]').hidden).toBe(false);
    await expect(sr(li).querySelectorAll('[part~="feature"]').length).toBe(0);
  },
};

/** Đổi kỳ thanh toán tháng ↔ năm + sự kiện hui-select */
export const BillingSwitch = {
  render: () => html`
    <div style="max-width: 320px; padding: 16px;">
      <hui-pricing-card id="pc-bill" plan="Pro" price="199000" yearly-price="1990000" .features=${PRO} highlighted></hui-pricing-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pc-bill');
    await expect(priceValue(el)).toBe(formatCurrency(199000));
    await expect(priceSuffix(el)).toBe('/tháng');
    await expect(sr(el).querySelector('[part~="save"]').hidden).toBe(true);

    el.billing = 'yearly';
    await el.updateComplete;
    await new Promise((r) => requestAnimationFrame(r));
    await expect(el.currentPrice).toBe(1990000);
    await expect(priceValue(el)).toBe(formatCurrency(1990000));
    await expect(priceSuffix(el)).toBe('/năm');
    // 1 - 1.990.000 / (199.000 × 12) = 16,7% → 17
    await expect(sr(el).querySelector('[part~="save"]').textContent).toBe('Tiết kiệm 17%');

    // CTA → hui-select { plan, billing, price }
    const selected = [];
    el.addEventListener('hui-select', (e) => selected.push(e.detail));
    const cta = sr(el).querySelector('[part~="cta"]');
    await expect(cta.textContent).toBe('Chọn gói');
    await expect(cta.getAttribute('variant')).toBe('primary');
    cta.shadowRoot.querySelector('button').click();
    await expect(selected).toEqual([{ plan: 'Pro', billing: 'yearly', price: 1990000 }]);

    // highlighted → ruy-băng + effect border-gradient trên hui-card
    await expect(sr(el).querySelector('hui-badge-ribbon').getAttribute('text')).toBe('Phổ biến');
    await expect(sr(el).querySelector('hui-card').getAttribute('effect')).toBe('border-gradient');
    el.highlighted = false;
    el.effect = 'lift';
    await el.updateComplete;
    await expect(sr(el).querySelector('hui-card').getAttribute('effect')).toBe('lift');
    await expect(cta.getAttribute('variant')).toBe('outline');
  },
};

/** Bảng giá 3 gói + nút chuyển tháng / năm */
export const PricingTable = {
  render: () => {
    const toggle = (e) => {
      const yearly = e.target.checked;
      e.target.closest('.pricing-demo').querySelectorAll('hui-pricing-card')
        .forEach((card) => { card.billing = yearly ? 'yearly' : 'monthly'; });
    };
    return html`
      <div class="pricing-demo" style="padding: 24px 16px;">
        <label style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 28px; font-size: 14px;">
          Theo tháng <input type="checkbox" @change=${toggle} aria-label="Thanh toán theo năm"> Theo năm (tiết kiệm ~17%)
        </label>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; align-items: stretch;">
          <hui-pricing-card plan="Basic" price="0" description="Dùng thử cho cá nhân" .features=${BASIC} cta-text="Bắt đầu miễn phí">
            <hui-icon slot="icon" name="user"></hui-icon>
          </hui-pricing-card>
          <hui-pricing-card plan="Pro" price="199000" yearly-price="1990000" description="Cho nhóm nhỏ đang phát triển" .features=${PRO} highlighted>
            <hui-icon slot="icon" name="star"></hui-icon>
            <span slot="footer">Không cần thẻ tín dụng</span>
          </hui-pricing-card>
          <hui-pricing-card plan="Business" price="499000" yearly-price="4990000" description="Cho doanh nghiệp" .features=${BUSINESS} cta-text="Liên hệ">
            <hui-icon slot="icon" name="home"></hui-icon>
          </hui-pricing-card>
        </div>
      </div>
    `;
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .pr-brand {
        --hui-pricing-card-accent: var(--hui-success);
        --hui-pricing-card-check-color: var(--hui-success);
        --hui-pricing-card-price-font-size: 2.5rem;
        --hui-pricing-card-highlight-scale: 1;
        --hui-card-gradient: conic-gradient(var(--hui-success), var(--hui-info), var(--hui-success));
        --hui-badge-ribbon-bg: var(--hui-success);
      }
      hui-pricing-card.pr-brand::part(plan) { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.8rem; }
      hui-pricing-card.pr-brand::part(cta-base) { border-radius: 999px; }
      hui-pricing-card.pr-brand::part(feature-excluded) { text-decoration: line-through; }
    </style>
    <div style="max-width: 320px; padding: 16px;">
      <hui-pricing-card class="pr-brand" plan="Team" price="299000" highlighted highlight-text="Tiết kiệm nhất" .features=${PRO}>
        <hui-icon slot="icon" name="settings"></hui-icon>
      </hui-pricing-card>
    </div>
  `,
};
