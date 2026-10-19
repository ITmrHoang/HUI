/**
 * Storybook Stories — HUI Prose
 */

import { html, nothing } from 'lit';
import { expect } from 'storybook/test';
import './index.js';

/** Ảnh minh họa tự sinh (SVG data-URI, không tải mạng) */
const IMG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="360" viewBox="0 0 800 360">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#10b981"/></linearGradient></defs>
<rect width="800" height="360" fill="url(#g)"/><circle cx="620" cy="110" r="60" fill="#fff" opacity=".35"/>
<path d="M0 300 L220 170 L380 270 L540 150 L800 290 V360 H0Z" fill="#0f172a" opacity=".35"/></svg>`)}`;

const article = html`
  <h1>Hướng dẫn dựng landing page với H-UI</h1>
  <p>H-UI là thư viện <strong>Web Components</strong> không phụ thuộc, dùng được với mọi framework. Bài viết này giới thiệu
    cách <a href="#cai-dat">cài đặt</a>, cấu hình theme và ghép các khối giao diện có sẵn.</p>
  <h2 id="cai-dat">Cài đặt</h2>
  <p>Chạy lệnh sau trong thư mục dự án, sau đó import một lần ở file chính: <code>import '@itmrhoang/h-ui'</code>.</p>
  <pre><code>npm install @itmrhoang/h-ui
npm run dev</code></pre>
  <h3>Những gì có sẵn</h3>
  <ul>
    <li>Hơn 60 component: nút, form, bảng, biểu đồ mini…</li>
    <li>Dark mode tự động theo hệ điều hành
      <ul><li>Hoặc ép bằng <code>data-theme="dark"</code></li></ul>
    </li>
    <li>Hiệu ứng xuất hiện khi cuộn tới</li>
  </ul>
  <ol>
    <li>Cài gói</li>
    <li>Import</li>
    <li>Dùng thẻ <kbd>hui-*</kbd></li>
  </ol>
  <blockquote>
    <p>Thiết kế tốt là thiết kế mà người dùng không cần nghĩ.</p>
    <cite>— Một nhà thiết kế</cite>
  </blockquote>
  <figure>
    <img src=${IMG} alt="Ảnh minh họa chuyển màu tím sang xanh" width="800" height="360" />
    <figcaption>Hình 1. Ảnh minh họa tự sinh bằng SVG.</figcaption>
  </figure>
  <h2>Bảng so sánh</h2>
  <table>
    <caption>Gói dịch vụ</caption>
    <thead><tr><th>Gói</th><th>Giá</th><th>Người dùng</th></tr></thead>
    <tbody>
      <tr><td>Cơ bản</td><td>0 ₫</td><td>1</td></tr>
      <tr><td>Chuyên nghiệp</td><td>199.000 ₫</td><td>10</td></tr>
      <tr><td>Doanh nghiệp</td><td>Liên hệ</td><td>Không giới hạn</td></tr>
    </tbody>
  </table>
  <hr />
  <h3>Ghi chú</h3>
  <p>Có thể <mark>tô sáng</mark> chữ, viết <em>nghiêng</em>, <small>chữ nhỏ</small> và <abbr title="Web Components">WC</abbr>.</p>
  <h4>Tiêu đề cấp 4</h4>
  <h5>Tiêu đề cấp 5</h5>
  <h6>Tiêu đề cấp 6</h6>
  <p>Đoạn kết thúc bài viết.</p>
`;

export default {
  title: 'Molecules/HuiProse',
  component: 'hui-prose',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Prose** — Bọc nội dung HTML từ CMS / Markdown để có **typography đẹp sẵn**: heading h1–h6, đoạn văn, link,
danh sách (lồng nhau), trích dẫn, code inline / khối, bảng, ảnh, figure, hr, kbd, mark, details.

Nội dung nằm ở **light DOM** (CSS trang + SEO vẫn thấy). Vì \`::slotted()\` không chạm được phần tử cháu, H-UI gắn
**một** stylesheet vào document (hoặc shadow root chứa thẻ) với selector \`:where()\` (độ ưu tiên 0) → CSS bạn viết luôn thắng.

\`\`\`html
<hui-prose>
  <h2>Tiêu đề</h2>
  <p>Nội dung từ CMS…</p>
</hui-prose>
<hui-prose size="lg" max-width="720px">…</hui-prose>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` — cỡ chữ & nhịp dòng |
| \`max-width\` | string | \`65ch\` | Bề rộng tối đa (độ dài CSS, số = px, \`none\` = không giới hạn) |

### Events
Không có.

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Nội dung HTML |

### Parts
\`base\` — khung bọc slot.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-prose-max-width\` | Bề rộng tối đa |
| \`--hui-prose-font-size\` / \`--hui-prose-line-height\` / \`--hui-prose-space\` | Cỡ chữ / nhịp dòng / khoảng cách khối |
| \`--hui-prose-color\` / \`--hui-prose-heading-color\` / \`--hui-prose-heading-font\` / \`--hui-prose-muted-color\` | Chữ |
| \`--hui-prose-link-color\` / \`--hui-prose-link-hover-color\` | Link |
| \`--hui-prose-marker-color\` | Dấu đầu dòng / số thứ tự |
| \`--hui-prose-quote-border\` / \`--hui-prose-quote-bg\` | Trích dẫn |
| \`--hui-prose-code-bg\` / \`--hui-prose-code-color\` / \`--hui-prose-pre-bg\` / \`--hui-prose-pre-color\` | Code |
| \`--hui-prose-border-color\` / \`--hui-prose-radius\` | Viền / bo góc |
| \`--hui-prose-scroll-margin\` | Chừa chỗ phía trên heading khi nhảy tới #id (header dính) |

### Accessibility
Giữ nguyên ngữ nghĩa HTML gốc (heading, list, table…). Link có \`:focus-visible\` rõ ràng.
        `,
      },
    },
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    maxWidth: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`<hui-prose size=${args.size} max-width=${args.maxWidth || nothing}>${article}</hui-prose>`,
  args: { size: 'md', maxWidth: '' },
  play: async ({ canvasElement }) => {
    const prose = canvasElement.querySelector('hui-prose');
    const css = (sel) => getComputedStyle(prose.querySelector(sel));
    const base = parseFloat(css('p').fontSize);
    await expect(parseFloat(css('h1').fontSize)).toBeGreaterThan(base * 2);
    await expect(parseFloat(css('h2').fontSize)).toBeGreaterThan(parseFloat(css('h3').fontSize));
    await expect(css('blockquote').borderInlineStartWidth).toBe('4px');
    await expect(css('table').borderCollapse).toBe('collapse');
    await expect(css('ul').listStyleType).toBe('disc');
    await expect(css('p code').fontFamily).toMatch(/mono|consolas|menlo/i);
    await expect(css('h1').marginTop).toBe('0px');
    // Bề rộng mặc định 65ch
    const host = getComputedStyle(prose);
    await expect(parseFloat(host.maxWidth)).toBeGreaterThan(400);
    // Ảnh co theo khung
    await expect(prose.querySelector('img').getBoundingClientRect().width).toBeLessThanOrEqual(prose.getBoundingClientRect().width + 0.5);
  },
};

/** sm | md | lg */
export const Sizes = {
  render: () => html`
    <div style="display: grid; gap: 32px;">
      ${['sm', 'md', 'lg'].map((s) => html`
        <hui-prose size=${s} data-size=${s}>
          <h3>Cỡ ${s}</h3>
          <p>Đoạn văn mẫu với <a href="#">liên kết</a> và <code>code</code>. Nhịp dòng thay đổi theo cỡ chữ để dễ đọc.</p>
        </hui-prose>
      `)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fs = (s) => parseFloat(getComputedStyle(canvasElement.querySelector(`[data-size="${s}"] p`)).fontSize);
    await expect(fs('sm')).toBeLessThan(fs('md'));
    await expect(fs('md')).toBeLessThan(fs('lg'));
  },
};

/** max-width: 65ch (mặc định) / px / none */
export const MaxWidth = {
  render: () => html`
    <hui-prose id="mw-px" max-width="320"><p>Khung tối đa 320px — chữ tự xuống dòng gọn gàng trong cột hẹp như sidebar.</p></hui-prose>
    <hui-prose id="mw-none" max-width="none"><p>Không giới hạn bề rộng — giãn theo khung chứa.</p></hui-prose>
  `,
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(canvasElement.querySelector('#mw-px')).maxWidth).toBe('320px');
    await expect(getComputedStyle(canvasElement.querySelector('#mw-none')).maxWidth).toBe('none');
  },
};

/** CSS trang luôn thắng (selector :where độ ưu tiên 0) — không cần !important */
export const PageCssWins = {
  render: () => html`
    <style>
      .my-article h2 { color: var(--hui-success); }
      .my-article p { margin-block: 4px; }
    </style>
    <hui-prose class="my-article">
      <h2 id="pw-h2">Heading màu theo CSS trang</h2>
      <p id="pw-p">Đoạn có margin do trang đặt.</p>
    </hui-prose>
  `,
  play: async ({ canvasElement }) => {
    const p = canvasElement.querySelector('#pw-p');
    await expect(getComputedStyle(p).marginTop).toBe('4px');
    const probe = document.createElement('span');
    probe.style.color = 'var(--hui-success)';
    canvasElement.append(probe);
    await expect(getComputedStyle(canvasElement.querySelector('#pw-h2')).color).toBe(getComputedStyle(probe).color);
    probe.remove();
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .prose-brand {
        --hui-prose-link-color: var(--hui-success-8);
        --hui-prose-quote-border: var(--hui-warning);
        --hui-prose-quote-bg: var(--hui-warning-light);
        --hui-prose-heading-color: var(--hui-primary-7);
        --hui-prose-marker-color: var(--hui-primary);
        --hui-prose-code-color: var(--hui-info-7);
        --hui-prose-radius: 0;
        --hui-prose-max-width: 560px;
      }
      hui-prose.prose-brand::part(base) { padding: 24px; border: 1px dashed var(--hui-border); border-radius: 12px; }
    </style>
    <hui-prose class="prose-brand">
      <h2>Thương hiệu riêng</h2>
      <p>Đổi màu <a href="#">liên kết</a>, heading, <code>code</code> và trích dẫn bằng biến CSS.</p>
      <ul><li>Mục một</li><li>Mục hai</li></ul>
      <blockquote><p>Trích dẫn với màu cảnh báo.</p></blockquote>
    </hui-prose>
  `,
};
