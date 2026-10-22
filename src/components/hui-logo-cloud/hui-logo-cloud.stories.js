/**
 * Storybook Stories — HUI Logo Cloud (logo khách hàng / đối tác)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);
const parts = (el, name) => [...sr(el).querySelectorAll(`[part~="${name}"]`)];

/** Logo SVG tự sinh: hình + chữ, màu theo hue (không tải ảnh ngoài mạng) */
const logo = (name, hue) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 48"><rect x="2" y="8" width="32" height="32" rx="9" fill="hsl(${hue} 70% 50%)"/>`
  + `<circle cx="18" cy="24" r="7" fill="#fff"/><text x="44" y="32" font-family="sans-serif" font-size="22" font-weight="700" fill="hsl(${hue} 55% 35%)">${name}</text></svg>`,
)}`;
const LOGOS = ['Sao Việt', 'Mây Xanh', 'Nam Phong', 'Bếp Nhà', 'Hà Thành', 'Biển Đông'].map((name, i) => ({
  src: logo(name, (i * 57 + 200) % 360), alt: name, href: `#${i}`,
}));

export default {
  title: 'Organisms/HuiLogoCloud',
  component: 'hui-logo-cloud',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Logo Cloud** — Logo khách hàng / đối tác: \`variant="grid"\` (lưới tĩnh, cột co theo khung) hoặc \`variant="marquee"\`
(chạy vô hạn bằng \`<hui-marquee>\`, dừng khi rê chuột / focus). \`grayscale\` → logo xám + mờ, rê vào / focus hiện màu.
Nhận \`data\` hoặc \`<img>\` / \`<a><img></a>\` con (được **sao chép** vào bên trong; bản gốc không hiển thị).

\`\`\`html
<hui-logo-cloud heading="Được tin dùng bởi 500+ doanh nghiệp" variant="marquee" grayscale edge-fade>
  <img src="/logos/a.svg" alt="Công ty A">
  <a href="https://b.vn"><img src="/logos/b.svg" alt="Công ty B"></a>
</hui-logo-cloud>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | array (JSON) | — | \`[{ src, alt, href, target, name }]\` (không src → chữ name) |
| \`variant\` | string | \`grid\` | \`grid\` \\| \`marquee\` |
| \`grayscale\` | boolean | \`false\` | Xám đến khi rê / focus |
| \`columns\` | number | tự động | Số cột lưới (khung < 640px còn 3, < 400px còn 2) |
| \`logo-height\` | string | \`40\` | Chiều cao logo (số = px) |
| \`gap\` | string | — | Khoảng cách logo |
| \`speed\` / \`direction\` / \`edge-fade\` | number / string / boolean | \`40\` / \`left\` / \`false\` | Dải chạy (marquee) |
| \`heading\` | string | — | Tiêu đề nhỏ phía trên (slot \`title\` thay được) |
| \`label\` | string | heading / locale | aria-label của vùng logo |
| \`no-animation\` | boolean | \`false\` | Dải chạy thành hàng tĩnh cuộn tay |

### Events
Không có.

### Slots
\`title\` — tiêu đề tùy biến. Con không có slot = nguồn logo (khi \`data\` trống).

### Parts
\`base\`, \`title\`, \`list\` (grid, \`<ul role="list">\`), \`marquee\`, \`item\`, \`link\`, \`logo\`.

### CSS Variables
\`--hui-logo-cloud-logo-height\` · \`-gap\` · \`-min-width\` · \`-item-bg\` · \`-item-padding\` · \`-item-radius\` · \`-opacity\` · \`-title-color\` · \`-text-color\`.

### Bàn phím
\`Tab\` qua link logo (marquee tạm dừng khi focus vào trong). Bản sao của dải chạy là \`aria-hidden\` + \`inert\`.

### Locale
\`logoCloud.label\` ("Khách hàng và đối tác" / "Customers and partners").
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['grid', 'marquee'] },
    grayscale: { control: 'boolean' },
    columns: { control: { type: 'number', min: 2, max: 8 } },
  },
};

export const Default = {
  render: (args) => html`
    <hui-logo-cloud id="lc" .data=${LOGOS} heading="Được tin dùng bởi 500+ doanh nghiệp" variant=${args.variant}
      ?grayscale=${args.grayscale} columns=${args.columns}></hui-logo-cloud>
  `,
  args: { variant: 'grid', grayscale: true, columns: 6 },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#lc');
    const list = part(el, 'list');
    await expect(list.tagName).toBe('UL');
    await expect(list.getAttribute('aria-label')).toBe('Được tin dùng bởi 500+ doanh nghiệp');
    await expect(parts(el, 'item').length).toBe(6);
    await expect(parts(el, 'link')[0].getAttribute('href')).toBe('#0');
    await expect(parts(el, 'logo')[1].getAttribute('alt')).toBe('Mây Xanh');
    await expect(part(el, 'marquee').hidden).toBe(true);
    await expect(part(el, 'title').textContent).toBe('Được tin dùng bởi 500+ doanh nghiệp');
    // grayscale: logo xám
    await expect(getComputedStyle(parts(el, 'logo')[0]).filter).toBe('grayscale(1)');
  },
};

/** Dải chạy vô hạn (hui-marquee) */
export const Marquee = {
  render: () => html`
    <hui-logo-cloud id="lc-m" variant="marquee" .data=${LOGOS} grayscale edge-fade speed="50" heading="Đối tác chiến lược"></hui-logo-cloud>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#lc-m');
    const marquee = part(el, 'marquee');
    await expect(marquee.hidden).toBe(false);
    await expect(part(el, 'list').hidden).toBe(true);
    await expect(marquee.getAttribute('label')).toBe('Đối tác chiến lược');
    await expect(marquee.hasAttribute('pause-on-hover')).toBe(true);
    await expect(marquee.hasAttribute('edge-fade')).toBe(true);
    await expect(marquee.getAttribute('speed')).toBe('50');
    // 6 logo gốc (bản sao do hui-marquee thêm, mang data-hui-marquee-clone)
    await expect(marquee.querySelectorAll('.lc__item:not([data-hui-marquee-clone])').length).toBe(6);
  },
};

/** Logo là phần tử con (img / a > img / chữ), logo-height, đổi children */
export const SlottedLogos = {
  render: () => html`
    <hui-logo-cloud id="lc-slot" logo-height="32" columns="4">
      <span slot="title">Báo chí nói về chúng tôi</span>
      <img src=${logo('Tin Nhanh', 10)} alt="Tin Nhanh">
      <a href="#dan-tri"><img src=${logo('Dân Số', 120)} alt="Dân Số"></a>
      <img src=${logo('Kinh Tế', 220)} alt="Kinh Tế">
      <img src=${logo('Công Nghệ', 300)} alt="Công Nghệ">
    </hui-logo-cloud>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#lc-slot');
    await expect(parts(el, 'item').length).toBe(4);
    await expect(parts(el, 'link').length).toBe(1);
    await expect(getComputedStyle(parts(el, 'logo')[0]).height).toBe('32px');
    await expect(part(el, 'title').hidden).toBe(false);
    // Thêm con → tự dựng lại
    const img = document.createElement('img');
    img.src = logo('Mới', 50);
    img.alt = 'Mới';
    el.append(img);
    await waitFor(() => expect(parts(el, 'item').length).toBe(5));
  },
};

/** Logo chữ (không src); no-animation */
export const TextLogos = {
  render: () => html`
    <hui-logo-cloud id="lc-text" variant="marquee" no-animation .data=${[{ name: 'ACME' }, { name: 'Globex' }, { name: 'Initech' }, { name: 'Umbrella' }]}></hui-logo-cloud>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#lc-text');
    const marquee = part(el, 'marquee');
    await expect(marquee.hasAttribute('no-animation')).toBe(true);
    await expect(marquee.querySelector('.lc__logo--text').textContent).toBe('ACME');
    await expect(marquee.getAttribute('label')).toBe('Khách hàng và đối tác');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .lc-custom {
        --hui-logo-cloud-item-bg: var(--hui-fill-tertiary);
        --hui-logo-cloud-item-padding: 20px;
        --hui-logo-cloud-item-radius: 16px;
        --hui-logo-cloud-opacity: 0.4;
      }
      .lc-custom::part(title) { text-transform: uppercase; letter-spacing: 0.1em; }
    </style>
    <hui-logo-cloud id="lc-custom" class="lc-custom" .data=${LOGOS.slice(0, 4)} grayscale columns="4" heading="Tùy biến"></hui-logo-cloud>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#lc-custom');
    await expect(getComputedStyle(parts(el, 'item')[0]).paddingTop).toBe('20px');
    await expect(getComputedStyle(parts(el, 'logo')[0]).opacity).toBe('0.4');
    await expect(getComputedStyle(part(el, 'title')).textTransform).toBe('uppercase');
  },
};
