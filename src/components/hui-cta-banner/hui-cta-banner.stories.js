/**
 * Storybook Stories — HUI CTA Banner (dải kêu gọi hành động)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);

const actions = (light = true) => html`
  <hui-button slot="actions" variant=${light ? 'secondary' : 'primary'}>Bắt đầu miễn phí</hui-button>
  <hui-button slot="actions" variant=${light ? 'ghost' : 'outline'}>Liên hệ tư vấn</hui-button>
`;

export default {
  title: 'Organisms/HuiCtaBanner',
  component: 'hui-cta-banner',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI CTA Banner** — Dải kêu gọi hành động: tiêu đề, mô tả, nút. \`variant\` \`filled\` (nền màu) | \`gradient\` | \`outline\`;
\`layout\` \`inline\` (chữ trái, nút phải — tự xếp dọc khi khung < 640px) | \`stacked\` (xếp chồng căn giữa); \`dismissible\` → nút ×.

\`\`\`html
<hui-cta-banner variant="gradient" heading="Sẵn sàng tăng tốc?" description="Dùng thử 14 ngày, không cần thẻ." dismissible>
  <hui-button slot="actions" variant="secondary">Bắt đầu</hui-button>
</hui-cta-banner>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`heading\` / \`description\` | string | — | Chữ (slot \`title\` / \`description\` thay được) |
| \`heading-level\` | number | \`2\` | aria-level |
| \`variant\` | string | \`filled\` | \`filled\` \\| \`gradient\` \\| \`outline\` |
| \`layout\` | string | \`inline\` | \`inline\` \\| \`stacked\` |
| \`color\` | string | \`primary\` | Token màu hoặc màu CSS |
| \`icon\` | string | — | Icon bên trái (slot \`icon\`) |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`dismissible\` | boolean | \`false\` | Nút đóng |
| \`dismissed\` | boolean | \`false\` | Đã đóng (ẩn) — gỡ để hiện lại |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng đóng |

### Methods
\`dismiss()\` — đóng như bấm nút × (phát \`hui-close\`).

### Events
| Event | Mô tả |
|-------|-------|
| \`hui-close\` | Trước khi đóng. Cancelable: \`preventDefault()\` giữ banner |

### Slots
\`(mặc định)\` nội dung thêm · \`title\` · \`description\` · \`actions\` · \`icon\`.

### Parts
\`base\` (\`<section aria-labelledby>\`), \`icon\`, \`content\`, \`title\`, \`description\`, \`actions\`, \`close\`.

### CSS Variables
\`--hui-cta-banner-bg\` · \`-gradient\` · \`-color\` · \`-border-color\` · \`-radius\` · \`-padding\` · \`-title-font-size\` · \`-description-color\` · \`-shadow\`.

### Bàn phím
\`Tab\` qua các nút và nút đóng (\`Enter\`/\`Space\` đóng).

### Locale
\`ctaBanner.close\` ("Đóng" / "Dismiss").
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['filled', 'gradient', 'outline'] },
    layout: { control: 'select', options: ['inline', 'stacked'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['primary', 'secondary', 'success', 'warning', 'danger', 'info'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-cta-banner id="cta" heading="Sẵn sàng dựng website của bạn?" description="Dùng thử 14 ngày, không cần thẻ tín dụng."
      variant=${args.variant} layout=${args.layout} size=${args.size} color=${args.color} ?dismissible=${args.dismissible}>
      ${actions(args.variant !== 'outline')}
    </hui-cta-banner>
  `,
  args: { variant: 'filled', layout: 'inline', size: 'md', color: 'primary', dismissible: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cta');
    const base = part(el, 'base');
    await expect(base.tagName).toBe('SECTION');
    await expect(base.getAttribute('aria-labelledby')).toBe('title');
    await expect(part(el, 'title').getAttribute('aria-level')).toBe('2');
    await expect(part(el, 'title').textContent).toBe('Sẵn sàng dựng website của bạn?');
    await expect(part(el, 'actions').hidden).toBe(false);
    await expect(part(el, 'close').hidden).toBe(true);
    await expect(part(el, 'icon').hidden).toBe(true);
    // filled: nền primary
    await expect(base.classList.contains('cta--filled')).toBe(true);
  },
};

/** 3 variant × 2 layout, icon, màu */
export const Variants = {
  render: () => html`
    <div style="display: grid; gap: 20px;">
      <hui-cta-banner icon="star" heading="Filled" description="Nền màu primary.">${actions()}</hui-cta-banner>
      <hui-cta-banner id="cta-gradient" variant="gradient" icon="heart" heading="Gradient" description="Dải màu + vòng tròn trang trí.">${actions()}</hui-cta-banner>
      <hui-cta-banner id="cta-outline" variant="outline" color="success" icon="check" heading="Outline" description="Viền màu, nền nhạt.">${actions(false)}</hui-cta-banner>
      <hui-cta-banner variant="gradient" layout="stacked" size="lg" color="secondary" heading="Stacked · lg" description="Xếp chồng căn giữa, phù hợp cuối trang.">${actions()}</hui-cta-banner>
      <hui-cta-banner layout="stacked" size="sm" color="#0f766e" heading="Màu CSS tùy ý" description="color=&quot;#0f766e&quot;">${actions()}</hui-cta-banner>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const g = canvasElement.querySelector('#cta-gradient');
    await expect(getComputedStyle(part(g, 'base')).backgroundImage).toContain('linear-gradient');
    await expect(part(g, 'icon').hidden).toBe(false);
    const o = canvasElement.querySelector('#cta-outline');
    await expect(getComputedStyle(part(o, 'base')).borderTopWidth).toBe('2px');
  },
};

/** Đóng: hui-close (hủy được) → dismissed */
export const Dismissible = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      <hui-cta-banner id="cta-close" dismissible variant="gradient" heading="Ưu đãi tháng 10: giảm 30%" description="Áp dụng cho gói năm.">
        <hui-button slot="actions" variant="secondary">Nhận ưu đãi</hui-button>
      </hui-cta-banner>
      <hui-cta-banner id="cta-keep" dismissible no-animation variant="outline" heading="Không đóng được" description="preventDefault() trong hui-close."></hui-cta-banner>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cta-close');
    const close = part(el, 'close');
    await expect(close.hidden).toBe(false);
    await expect(close.getAttribute('aria-label')).toBe('Đóng');
    let fired = 0;
    el.addEventListener('hui-close', () => { fired += 1; });
    await userEvent.click(close);
    await waitFor(() => expect(el.dismissed).toBe(true));
    await expect(fired).toBe(1);
    await expect(getComputedStyle(el).display).toBe('none');
    // Hiện lại
    el.dismissed = false;
    await expect(getComputedStyle(el).display).toBe('block');

    const keep = canvasElement.querySelector('#cta-keep');
    keep.addEventListener('hui-close', (e) => e.preventDefault());
    await keep.dismiss();
    await expect(keep.dismissed).toBe(false);
  },
};

/** Slot title / description / icon */
export const Slots = {
  render: () => html`
    <hui-cta-banner id="cta-slots" variant="outline">
      <span slot="icon" style="font-size: 28px;">🎁</span>
      <span slot="title">Tặng <strong>3 tháng</strong> miễn phí</span>
      <span slot="description">Khi đăng ký trước 31/10.</span>
      <small>* Áp dụng cho khách hàng mới.</small>
      <hui-button slot="actions">Đăng ký</hui-button>
    </hui-cta-banner>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cta-slots');
    await expect(part(el, 'icon').hidden).toBe(false);
    await expect(part(el, 'title').hidden).toBe(false);
    await expect(part(el, 'description').hidden).toBe(false);
    el.heading = 'bị slot che';
    el.headingLevel = 3;
    await el.updateComplete;
    await expect(part(el, 'title').getAttribute('aria-level')).toBe('3');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cta-custom {
        --hui-cta-banner-gradient: linear-gradient(90deg, #f43f5e, #f59e0b);
        --hui-cta-banner-radius: 0;
        --hui-cta-banner-title-font-size: 24px;
      }
      .cta-custom::part(title) { text-transform: uppercase; }
      .cta-custom::part(actions) { gap: 4px; }
    </style>
    <hui-cta-banner id="cta-custom" class="cta-custom" variant="gradient" heading="Flash sale" description="Chỉ hôm nay.">${actions()}</hui-cta-banner>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cta-custom');
    await expect(getComputedStyle(part(el, 'base')).borderTopLeftRadius).toBe('0px');
    await expect(getComputedStyle(part(el, 'title')).fontSize).toBe('24px');
    await expect(getComputedStyle(part(el, 'title')).textTransform).toBe('uppercase');
    await expect(getComputedStyle(part(el, 'base')).backgroundImage).toContain('rgb(244, 63, 94)');
  },
};
