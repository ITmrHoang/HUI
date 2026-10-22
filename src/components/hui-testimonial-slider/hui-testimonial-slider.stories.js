/**
 * Storybook Stories — HUI Testimonial Slider (băng chuyền lời nhận xét)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const sr = (el) => el.shadowRoot;
const scroller = (el) => sr(el).querySelector('hui-scroller');
const items = (el) => [...scroller(el).querySelectorAll('hui-testimonial')];

const avatar = (initial, hue) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue} 60% 55%)"/>`
  + `<text x="50%" y="62%" font-family="sans-serif" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">${initial}</text></svg>`,
)}`;

const DATA = [
  { quote: 'Dựng xong landing page trong 2 ngày, tỉ lệ chuyển đổi tăng 35%.', author: 'Minh Anh', jobTitle: 'CEO', company: 'Sao Việt', avatar: avatar('M', 210), rating: 5 },
  { quote: 'Dark mode chạy ngay, không phải viết thêm dòng CSS nào.', author: 'Thu Hà', jobTitle: 'Designer', company: 'Mây Xanh', avatar: avatar('H', 330), rating: 5 },
  { quote: 'Bỏ được 3 thư viện UI cũ, bundle nhẹ hơn 60%.', author: 'Quang Huy', jobTitle: 'Tech Lead', company: 'Nam Phong', avatar: avatar('Q', 150), rating: 4.5 },
  { quote: 'Tài liệu tiếng Việt rõ ràng, đội mới vào làm được ngay.', author: 'Lan Chi', jobTitle: 'PM', company: 'Bếp Nhà', avatar: avatar('L', 30), rating: 5 },
  { quote: 'Hỗ trợ nhanh, component a11y chuẩn chỉnh.', author: 'Đức Long', jobTitle: 'CTO', company: 'Hà Thành', avatar: avatar('Đ', 270), rating: 4 },
];

export default {
  title: 'Organisms/HuiTestimonialSlider',
  component: 'hui-testimonial-slider',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Testimonial Slider** — Băng chuyền lời nhận xét: \`data\` → các \`<hui-testimonial>\` trong \`<hui-scroller>\`
(cuộn native + scroll-snap, vuốt / kéo chuột / bàn phím, chấm chỉ trang, tự chạy). Số thẻ mỗi khung nhìn mặc định
1 → 2 (≥ 768px) → 3 (≥ 992px). Không có \`data\` → sao chép \`<hui-testimonial>\` con vào băng chuyền.

\`\`\`html
<hui-testimonial-slider autoplay variant="bubble"></hui-testimonial-slider>
<script>slider.data = [{ quote: '…', author: 'Minh Anh', jobTitle: 'CEO', company: 'ABC', avatar: '/a.jpg', rating: 5 }, …];</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | array (JSON) | — | \`[{ quote, author, jobTitle, company, avatar, rating, href }]\` |
| \`variant\` / \`align\` / \`size\` / \`effect\` | string | \`card\` / \`start\` / \`md\` / — | Chuyển xuống từng hui-testimonial |
| \`items-per-view\` / \`-md\` / \`-lg\` | number | \`1\` / \`2\` / \`3\` | Số thẻ mỗi khung nhìn theo màn hình |
| \`autoplay\` | number | \`0\` | Tự chuyển sau N ms (attribute rỗng = 5000) |
| \`indicator\` | string | \`dots\` | \`dots\` \\| \`bar\` \\| \`none\` |
| \`arrows\` | string | \`auto\` | \`auto\` \\| \`always\` \\| \`never\` |
| \`gap\` | string | \`lg\` | Khoảng cách thẻ |
| \`label\` | string | locale | aria-label vùng cuộn |
| \`no-animation\` | boolean | \`false\` | Tắt cuộn mượt + tự chạy |

### Properties
\`scroller\` (chỉ đọc) — \`<hui-scroller>\` bên trong: \`el.scroller.next()\`, \`.prev()\`, \`.scrollToIndex(i)\`.

### Events
\`hui-scroll\` (từ hui-scroller) — \`{ index, progress, atStart, atEnd }\`.

### Parts
\`base\`, \`scroller\` (+ \`scroller-viewport\`, \`scroller-prev\`, \`scroller-next\`, \`scroller-indicator\`, \`scroller-dot\`, \`scroller-dot-active\`), \`item\`.

### CSS Variables
Không có biến riêng — dùng \`--hui-scroller-*\` (padding, dot, arrow…) và \`--hui-testimonial-*\`.

### Bàn phím (từ hui-scroller)
Focus vùng cuộn → \`←\`/\`→\` chuyển thẻ, \`PageUp\`/\`PageDown\` theo trang, \`Home\`/\`End\` về đầu / cuối. Tự chạy dừng khi focus / hover.

### Locale
\`testimonialSlider.label\` ("Nhận xét của khách hàng" / "Customer testimonials").
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['card', 'plain', 'bubble'] },
    indicator: { control: 'select', options: ['dots', 'bar', 'none'] },
    arrows: { control: 'select', options: ['auto', 'always', 'never'] },
    autoplay: { control: 'number' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-testimonial-slider id="ts" .data=${DATA} variant=${args.variant} indicator=${args.indicator} arrows=${args.arrows}
      autoplay=${args.autoplay}></hui-testimonial-slider>
  `,
  args: { variant: 'card', indicator: 'dots', arrows: 'always', autoplay: 0 },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ts');
    const s = scroller(el);
    await expect(items(el).length).toBe(5);
    await expect(items(el)[0].getAttribute('author')).toBe('Minh Anh');
    await expect(items(el)[0].getAttribute('job-title')).toBe('CEO');
    await expect(items(el)[2].getAttribute('rating')).toBe('4.5');
    await expect(items(el)[0].getAttribute('variant')).toBe('card');
    await expect(s.getAttribute('items-per-view')).toBe('1');
    await expect(s.getAttribute('items-per-view-md')).toBe('2');
    await expect(s.getAttribute('items-per-view-lg')).toBe('3');
    await expect(s.getAttribute('indicator')).toBe('dots');
    await expect(s.getAttribute('label')).toBe('Nhận xét của khách hàng');
    await expect(s.hasAttribute('autoplay')).toBe(false);
    // Chấm chỉ trang do hui-scroller dựng
    await waitFor(() => expect(s.shadowRoot.querySelectorAll('[part~="dot"]').length).toBeGreaterThan(0));
    // Mũi tên next cuộn tới thẻ kế
    el.scroller.scrollToIndex(1, { smooth: false });
    await waitFor(() => expect(s.shadowRoot.querySelector('[part~="viewport"]').scrollLeft).toBeGreaterThan(0));
  },
};

/** Tự chạy (attribute rỗng = 5000ms), bubble, 1 thẻ mỗi khung, căn giữa */
export const AutoplaySingle = {
  render: () => html`
    <div style="max-width: 640px; margin: 0 auto;">
      <hui-testimonial-slider id="ts-auto" autoplay .data=${DATA} variant="bubble" align="center" size="lg"
        items-per-view="1" items-per-view-md="1" items-per-view-lg="1"></hui-testimonial-slider>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ts-auto');
    const s = scroller(el);
    await expect(s.getAttribute('autoplay')).toBe('5000');
    await expect(s.getAttribute('items-per-view-lg')).toBe('1');
    await expect(items(el)[0].getAttribute('align')).toBe('center');
    // Đổi variant → mọi thẻ đổi theo
    el.variant = 'plain';
    await el.updateComplete;
    await expect(items(el).every((t) => t.getAttribute('variant') === 'plain')).toBe(true);
    // no-animation tắt tự chạy
    el.noAnimation = true;
    await el.updateComplete;
    await expect(s.hasAttribute('autoplay')).toBe(false);
  },
};

/** Thẻ con được sao chép vào băng chuyền; giữ thuộc tính thẻ tự đặt */
export const SlottedTestimonials = {
  render: () => html`
    <hui-testimonial-slider id="ts-slot" variant="card" indicator="bar">
      <hui-testimonial quote="Thẻ con 1" author="A" rating="5"></hui-testimonial>
      <hui-testimonial quote="Thẻ con 2" author="B" variant="bubble"></hui-testimonial>
      <hui-testimonial quote="Thẻ con 3" author="C"></hui-testimonial>
    </hui-testimonial-slider>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ts-slot');
    await expect(items(el).length).toBe(3);
    await expect(items(el)[0].getAttribute('variant')).toBe('card');
    await expect(items(el)[1].getAttribute('variant')).toBe('bubble');
    // Thêm con → dựng lại
    const t = document.createElement('hui-testimonial');
    t.setAttribute('quote', 'Mới');
    el.append(t);
    await waitFor(() => expect(items(el).length).toBe(4));
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .ts-custom {
        --hui-scroller-dot-active-color: #db2777;
        --hui-testimonial-mark-color: #db2777;
      }
      .ts-custom::part(scroller-dot) { width: 12px; height: 12px; }
      .ts-custom::part(item) { --hui-card-radius: 24px; }
    </style>
    <hui-testimonial-slider id="ts-custom" class="ts-custom" .data=${DATA} arrows="never"></hui-testimonial-slider>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ts-custom');
    const s = scroller(el);
    await waitFor(() => expect(s.shadowRoot.querySelector('[part~="dot"]')).not.toBe(null));
    await expect(getComputedStyle(s.shadowRoot.querySelector('[part~="dot"]')).width).toBe('12px');
    await expect(s.getAttribute('arrows')).toBe('never');
  },
};
