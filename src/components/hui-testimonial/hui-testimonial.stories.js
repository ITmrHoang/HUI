/**
 * Storybook Stories — HUI Testimonial (lời nhận xét khách hàng)
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);

/** Avatar SVG tự sinh (không tải ảnh ngoài mạng) */
const avatar = (initial, hue) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue} 60% 55%)"/>`
  + `<text x="50%" y="62%" font-family="sans-serif" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">${initial}</text></svg>`,
)}`;

const QUOTE = 'Đội ngũ dựng xong landing page chỉ trong 2 ngày. Tốc độ tải nhanh hơn hẳn, tỉ lệ chuyển đổi tăng 35% sau tháng đầu tiên.';

export default {
  title: 'Molecules/HuiTestimonial',
  component: 'hui-testimonial',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Testimonial** — Lời nhận xét của khách hàng dựng trên \`<hui-card>\`: dấu ngoặc kép trang trí, số sao
(\`<hui-rating-display>\` chỉ đọc), trích dẫn, avatar (\`<hui-avatar>\`), tên, chức danh · công ty.
Ngữ nghĩa \`<figure>\` + \`<blockquote>\` + \`<figcaption>\` + \`<cite>\`.

\`\`\`html
<hui-testimonial quote="Tuyệt vời!" author="Minh Anh" job-title="CEO" company="ABC Corp" avatar="/a.jpg" rating="5"></hui-testimonial>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`quote\` | string | — | Trích dẫn (slot mặc định ưu tiên — cho phép HTML) |
| \`author\` | string | — | Tên người nhận xét |
| \`job-title\` / \`company\` | string | — | Chức danh · công ty |
| \`avatar\` | string | — | URL ảnh (không có → chữ cái viết tắt) |
| \`rating\` | number | — | Số sao (cho phép lẻ, vd 4.5); bỏ trống = ẩn |
| \`variant\` | string | \`card\` | \`card\` \\| \`plain\` \\| \`bubble\` |
| \`align\` | string | \`start\` | \`start\` \\| \`center\` |
| \`orientation\` | string | \`vertical\` | \`vertical\` \\| \`horizontal\` (tác giả bên trái; tự dọc khi thẻ < 480px) |
| \`no-quote-mark\` | boolean | \`false\` | Ẩn dấu ngoặc kép |
| \`effect\` | string | — | Hiệu ứng hui-card (\`lift\`, \`tilt\`, \`glow\`…) |
| \`href\` / \`target\` | string | — | Link nguồn — cả thẻ bấm được |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`loading\` / \`no-animation\` | boolean | \`false\` | Skeleton / tắt chuyển động |

### Events
Không có.

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Nội dung trích dẫn |
| \`avatar\` | Avatar tùy biến |
| \`footer\` | Chân thẻ (chuyển xuống hui-card) |

### Parts
\`base\`, \`bubble\`, \`quote-mark\`, \`rating\`, \`quote\`, \`author\`, \`avatar\`, \`name\`, \`meta\` và part của hui-card.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-testimonial-quote-color\` / \`-quote-font-size\` | Trích dẫn |
| \`--hui-testimonial-mark-color\` / \`-mark-size\` | Dấu ngoặc kép |
| \`--hui-testimonial-bubble-bg\` / \`-bubble-radius\` | Bong bóng (variant bubble) |
| \`--hui-testimonial-name-color\` / \`-meta-color\` | Tên / chức danh |
| \`--hui-testimonial-gap\` | Khoảng cách các khối |

### Bàn phím
Không có điểm dừng Tab riêng (trừ khi có \`href\` → link của hui-card).
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['card', 'plain', 'bubble'] },
    align: { control: 'select', options: ['start', 'center'] },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    rating: { control: { type: 'number', min: 0, max: 5, step: 0.5 } },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 420px;">
      <hui-testimonial id="tm" quote=${args.quote} author="Nguyễn Minh Anh" job-title="Giám đốc Marketing" company="Sao Việt"
        avatar=${avatar('M', 210)} rating=${args.rating} variant=${args.variant} align=${args.align}
        orientation=${args.orientation} size=${args.size}></hui-testimonial>
    </div>
  `,
  args: { quote: QUOTE, rating: 5, variant: 'card', align: 'start', orientation: 'vertical', size: 'md' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tm');
    await expect(part(el, 'base').tagName).toBe('FIGURE');
    await expect(part(el, 'quote').tagName).toBe('BLOCKQUOTE');
    await expect(part(el, 'quote').textContent.trim()).toBe(QUOTE);
    await expect(part(el, 'name').textContent).toBe('Nguyễn Minh Anh');
    await expect(part(el, 'meta').textContent).toBe('Giám đốc Marketing · Sao Việt');
    await expect(part(el, 'rating').getAttribute('value')).toBe('5');
    await expect(part(el, 'avatar').getAttribute('src')).toBe(avatar('M', 210));
    await expect(sr(el).querySelector('hui-card').getAttribute('variant')).toBe('elevated');
  },
};

/** card | plain | bubble */
export const Variants = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; align-items: start;">
      <hui-testimonial id="tm-card" variant="card" quote=${QUOTE} author="Minh Anh" job-title="CEO" company="Sao Việt" rating="5"></hui-testimonial>
      <hui-testimonial id="tm-plain" variant="plain" quote=${QUOTE} author="Thu Hà" job-title="Designer" avatar=${avatar('H', 330)} rating="4.5"></hui-testimonial>
      <hui-testimonial id="tm-bubble" variant="bubble" quote=${QUOTE} author="Quang Huy" company="Nam Phong" avatar=${avatar('Q', 150)} rating="4"></hui-testimonial>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const plain = canvasElement.querySelector('#tm-plain');
    await expect(sr(plain).querySelector('hui-card').getAttribute('variant')).toBe('ghost');
    const bubble = canvasElement.querySelector('#tm-bubble');
    await expect(part(bubble, 'base').classList.contains('tm--bubble')).toBe(true);
    // Bong bóng có viền + đuôi
    await expect(getComputedStyle(part(bubble, 'bubble'), '::after').content).toBe('""');
  },
};

/** Căn giữa, ngang, kích thước, slot HTML, ẩn dấu ngoặc / sao */
export const Layouts = {
  render: () => html`
    <div style="display: grid; gap: 24px; max-width: 720px;">
      <hui-testimonial align="center" variant="bubble" quote=${QUOTE} author="Lan Chi" job-title="Founder" company="Bếp Nhà" rating="5" size="lg"></hui-testimonial>
      <hui-testimonial id="tm-h" orientation="horizontal" author="Đức Long" job-title="CTO" company="Mây Xanh" avatar=${avatar('L', 30)} rating="4.5">
        <p>Bộ component <strong>zero-dependency</strong> giúp chúng tôi bỏ được 3 thư viện UI cũ.</p>
        <p>Dark mode hoạt động ngay, không cần chỉnh gì thêm.</p>
      </hui-testimonial>
      <hui-testimonial id="tm-min" size="sm" no-quote-mark quote="Ngắn gọn, đủ dùng." author="Khách ẩn danh"></hui-testimonial>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const h = canvasElement.querySelector('#tm-h');
    await expect(part(h, 'quote').hidden).toBe(false);
    await expect(part(h, 'base').classList.contains('tm--horizontal')).toBe(true);
    const min = canvasElement.querySelector('#tm-min');
    await expect(part(min, 'quote-mark').hidden).toBe(true);
    await expect(part(min, 'rating').hidden).toBe(true);
    await expect(part(min, 'meta').hidden).toBe(true);
    // Đổi property → vẽ lại
    min.rating = 3;
    min.company = 'ABC';
    await min.updateComplete;
    await expect(part(min, 'rating').hidden).toBe(false);
    await expect(part(min, 'meta').textContent).toBe('ABC');
  },
};

/** Hiệu ứng + link nguồn + loading */
export const EffectsAndStates = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;">
      <hui-testimonial id="tm-link" effect="tilt glow" href="#case-study" quote=${QUOTE} author="Minh Anh" rating="5"></hui-testimonial>
      <hui-testimonial effect="lift border-gradient" quote=${QUOTE} author="Thu Hà" rating="4"></hui-testimonial>
      <hui-testimonial loading quote=${QUOTE} author="Đang tải"></hui-testimonial>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const card = sr(canvasElement.querySelector('#tm-link')).querySelector('hui-card');
    await expect(card.getAttribute('effect')).toBe('tilt glow');
    await expect(card.getAttribute('href')).toBe('#case-study');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .tm-custom {
        --hui-testimonial-mark-color: #f59e0b;
        --hui-testimonial-bubble-bg: #fffbeb;
        --hui-testimonial-quote-font-size: 18px;
        --hui-testimonial-name-color: #b45309;
      }
      .tm-custom::part(quote) { font-style: italic; }
      .tm-custom::part(avatar) { outline: 3px solid #f59e0b; border-radius: 50%; }
    </style>
    <div style="max-width: 420px;">
      <hui-testimonial id="tm-custom" class="tm-custom" variant="bubble" quote=${QUOTE} author="Minh Anh" avatar=${avatar('M', 40)} rating="5"></hui-testimonial>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tm-custom');
    await expect(getComputedStyle(part(el, 'quote')).fontStyle).toBe('italic');
    await expect(getComputedStyle(part(el, 'quote')).fontSize).toBe('18px');
    await expect(getComputedStyle(part(el, 'bubble')).backgroundColor).toBe('rgb(255, 251, 235)');
  },
};
