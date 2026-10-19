/**
 * Storybook Stories — HUI Blog Card (thẻ bài viết)
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import { formatDate } from '../../core/format.js';
import { readingMinutes } from './index.js';
import '../hui-product-card/index.js';
import '../hui-stat-card/index.js';
import '../hui-button/index.js';

/** Ảnh minh họa SVG tự sinh (không tải ảnh ngoài mạng) */
const svgImage = (label, hue = 220, w = 800, h = 450) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`
  + `<stop offset="0" stop-color="hsl(${hue} 80% 68%)"/><stop offset="1" stop-color="hsl(${hue + 50} 65% 40%)"/></linearGradient></defs>`
  + `<rect width="100%" height="100%" fill="url(#g)"/>`
  + `<path d="M0 ${h * 0.75} Q ${w * 0.25} ${h * 0.55} ${w * 0.5} ${h * 0.72} T ${w} ${h * 0.62} V ${h} H 0 Z" fill="rgba(255,255,255,.18)"/>`
  + `<circle cx="${w * 0.8}" cy="${h * 0.28}" r="${h * 0.14}" fill="rgba(255,255,255,.35)"/>`
  + `<text x="${w * 0.07}" y="${h * 0.5}" font-family="sans-serif" font-size="${h * 0.11}" font-weight="700" fill="#fff">${label}</text></svg>`,
)}`;
const avatar = (initial, hue) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue} 60% 55%)"/>`
  + `<text x="50%" y="62%" font-family="sans-serif" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">${initial}</text></svg>`,
)}`;

const IMG = {
  webc: svgImage('Web Components', 220),
  css: svgImage('CSS hiện đại', 330),
  a11y: svgImage('Accessibility', 150),
  perf: svgImage('Hiệu năng', 30),
};

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);

export default {
  title: 'Molecules/HuiBlogCard',
  component: 'hui-blog-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Blog Card** — Thẻ bài viết dựng trên \`<hui-card>\`: ảnh, chuyên mục (\`<hui-tag>\`), tiêu đề (link), tóm tắt cắt
\`excerpt-lines\` dòng, tác giả + \`<hui-avatar>\`, ngày đăng (\`formatDate\`), thời gian đọc ("5 phút đọc").
Không có \`reading-time\` mà có \`content-length\` (số từ) → ước tính 200 từ/phút. \`orientation="horizontal"\` cho bài nổi bật.

\`\`\`html
<hui-blog-card image="/img/cover.jpg" category="Frontend" title="Web Components từ A đến Z" href="/blog/web-components"
  excerpt="…" author="Minh Anh" author-avatar="/img/minh-anh.jpg" date="2026-10-01" reading-time="5">
</hui-blog-card>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`image\` / \`image-alt\` | string | — | Ảnh bài viết / mô tả (mặc định rỗng: ảnh trang trí) |
| \`ratio\` | string | \`16/9\` | Tỉ lệ ảnh (layout dọc) |
| \`category\` / \`category-color\` | string | — / \`primary\` | Chuyên mục (hui-tag) và màu tag |
| \`title\` | string | — | Tiêu đề (attribute bị gỡ khỏi host để không hiện tooltip native) |
| \`heading-level\` | number | \`3\` | aria-level của tiêu đề |
| \`href\` / \`target\` | string | — | Link bài: tiêu đề là \`<a>\`, cả card bấm được (chuyển xuống hui-card) |
| \`excerpt\` / \`excerpt-lines\` | string / number | — / \`3\` | Tóm tắt, cắt theo số dòng (-webkit-line-clamp) |
| \`author\` / \`author-avatar\` | string | — | Tác giả + ảnh (không có ảnh → chữ cái viết tắt) |
| \`date\` / \`date-style\` | string | — / \`medium\` | Ngày đăng (ISO / timestamp) + kiểu \`short\` \\| \`medium\` \\| \`long\` \\| \`full\` |
| \`reading-time\` | number | — | Số phút đọc |
| \`content-length\` | number | — | Số từ → ước tính phút đọc (200 từ/phút) khi không có reading-time |
| \`effect\` | string | \`lift zoom-media\` | Hiệu ứng hui-card |
| \`variant\` / \`orientation\` / \`size\` / \`loading\` / \`no-animation\` | — | — | Chuyển thẳng xuống hui-card |

### Properties
| Property | Mô tả |
|----------|-------|
| \`readingMinutes\` (chỉ đọc) | Số phút đọc đang hiển thị (null = ẩn) |

Hàm tiện ích: \`import { readingMinutes } from '@itmrhoang/h-ui/hui-blog-card'\` → \`readingMinutes(null, 1000) === 5\`.

### Events
Không có (link tiêu đề / \`href\` của hui-card điều hướng như link thường).

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Nội dung thêm dưới tóm tắt |
| \`category\` | Chuyên mục tùy biến (thay attribute category) |
| \`actions\` / \`footer\` / \`overlay\` | Chuyển xuống hui-card |

### Parts
\`image\`, \`category\` (+ \`category-base\`), \`heading\`, \`title-link\`, \`excerpt\`, \`meta\`, \`avatar\`, \`author\`, \`date\`,
\`reading-time\`, và part của hui-card (\`card\`, \`cover\`, \`body\`, \`actions\`, \`footer\`, \`overlay\`…).

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-blog-card-title-color\` / \`--hui-blog-card-title-font-size\` / \`--hui-blog-card-title-lines\` | Tiêu đề |
| \`--hui-blog-card-excerpt-color\` | Màu tóm tắt |
| \`--hui-blog-card-meta-color\` | Màu hàng meta |
| \`--hui-blog-card-image-bg\` | Nền vùng ảnh |
| \`--hui-card-*\` | Mọi biến của hui-card |

### Bàn phím
\`Tab\` tới link tiêu đề · \`Enter\` mở bài. Ngày đăng là \`<time datetime>\` cho SEO / trình đọc màn hình.

### Locale
\`blog.readingTime\` ("{minutes} phút đọc" / "{minutes} min read").
        `,
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    excerpt: { control: 'text' },
    excerptLines: { control: { type: 'number', min: 1, max: 6 } },
    readingTime: { control: 'number' },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    variant: { control: 'select', options: ['elevated', 'outlined', 'filled', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
  },
};

const EXCERPT = 'Custom Elements, Shadow DOM và template giúp bạn xây thư viện UI dùng được với mọi framework. '
  + 'Bài viết đi từ khái niệm cơ bản tới cách tổ chức style, slot, part và kiểm thử component trong trình duyệt thật.';

export const Default = {
  render: (args) => html`
    <div style="max-width: 340px;">
      <hui-blog-card
        image=${IMG.webc}
        category="Frontend"
        title=${args.title}
        href="#bai-viet"
        excerpt=${args.excerpt}
        excerpt-lines=${args.excerptLines}
        author="Minh Anh"
        author-avatar=${avatar('M', 210)}
        date="2026-10-01"
        reading-time=${args.readingTime}
        orientation=${args.orientation}
        variant=${args.variant}
        size=${args.size}
        ?loading=${args.loading}
      ></hui-blog-card>
    </div>
  `,
  args: {
    title: 'Web Components từ A đến Z: xây thư viện UI không phụ thuộc framework',
    excerpt: EXCERPT,
    excerptLines: 3,
    readingTime: 5,
    orientation: 'vertical',
    variant: 'elevated',
    size: 'md',
    loading: false,
  },
};

/** Thời gian đọc: reading-time hoặc ước tính từ content-length (200 từ/phút) */
export const ReadingTime = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;">
      <hui-blog-card id="bc-rt" image=${IMG.css} category="CSS" title="Container queries trong thực tế" reading-time="5" date="2026-09-20"
        excerpt="Thiết kế component tự thích ứng theo khung chứa thay vì màn hình." author="Thu Hà"></hui-blog-card>
      <hui-blog-card id="bc-words" image=${IMG.a11y} category="A11y" title="ARIA đúng cách" content-length="1001"
        excerpt="Khi nào cần ARIA và khi nào HTML gốc là đủ." author="Quang Huy"></hui-blog-card>
      <hui-blog-card id="bc-none" title="Bài không có ảnh, không có thời gian đọc" excerpt="Chỉ có tiêu đề và tóm tắt."></hui-blog-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const rt = canvasElement.querySelector('#bc-rt');
    await expect(part(rt, 'reading-time').textContent).toBe('5 phút đọc');
    await expect(rt.readingMinutes).toBe(5);
    await expect(part(rt, 'date').textContent).toBe(formatDate('2026-09-20'));
    await expect(part(rt, 'date').getAttribute('datetime')).toBe(new Date('2026-09-20').toISOString());

    // 1001 từ / 200 = 5,005 → làm tròn lên 6 phút
    const words = canvasElement.querySelector('#bc-words');
    await expect(part(words, 'reading-time').textContent).toBe('6 phút đọc');
    await expect(readingMinutes(null, 1000)).toBe(5);
    await expect(readingMinutes(null, 30)).toBe(1);
    await expect(readingMinutes(3, 5000)).toBe(3);

    const none = canvasElement.querySelector('#bc-none');
    await expect(part(none, 'reading-time').hidden).toBe(true);
    await expect(part(none, 'meta').hidden).toBe(true);

    // reading-time ưu tiên hơn content-length; đổi property → vẽ lại
    words.readingTime = 2;
    await words.updateComplete;
    await expect(part(words, 'reading-time').textContent).toBe('2 phút đọc');
  },
};

/** Tiêu đề / link / chuyên mục / tóm tắt cắt dòng / chuyển attribute xuống hui-card */
export const Content = {
  render: () => html`
    <div style="max-width: 340px;">
      <hui-blog-card id="bc-c" image=${IMG.perf} category="Hiệu năng" category-color="warning" title="Tối ưu Core Web Vitals"
        href="#perf" target="_blank" excerpt=${EXCERPT} excerpt-lines="2" author="Lan Chi" date="2026-08-15" reading-time="7"></hui-blog-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#bc-c');
    await expect(el.hasAttribute('title')).toBe(false);
    await expect(el.title).toBe('Tối ưu Core Web Vitals');
    const link = part(el, 'title-link');
    await expect(link.textContent).toBe('Tối ưu Core Web Vitals');
    await expect(link.getAttribute('href')).toBe('#perf');
    await expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    await expect(part(el, 'heading').getAttribute('aria-level')).toBe('3');
    const tag = part(el, 'category');
    await expect(tag.textContent).toBe('Hiệu năng');
    await expect(tag.getAttribute('color')).toBe('warning');
    // Tóm tắt cắt 2 dòng
    await expect(getComputedStyle(part(el, 'excerpt')).webkitLineClamp).toBe('2');
    await expect(part(el, 'author').textContent).toBe('Lan Chi');
    await expect(part(el, 'avatar').getAttribute('name')).toBe('Lan Chi');
    const card = sr(el).querySelector('hui-card');
    await expect(card.getAttribute('effect')).toBe('lift zoom-media');
    await expect(card.getAttribute('href')).toBe('#perf');
    await expect(card.getAttribute('target')).toBe('_blank');
  },
};

/** Bài nổi bật (ngang) + lưới bài viết */
export const BlogGrid = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <hui-blog-card orientation="horizontal" size="lg" image=${IMG.webc} category="Nổi bật" title="Web Components từ A đến Z: xây thư viện UI không phụ thuộc framework"
        href="#1" excerpt=${EXCERPT} author="Minh Anh" author-avatar=${avatar('M', 210)} date="2026-10-01" reading-time="12"
        style="--hui-card-cover-width: 45%;"></hui-blog-card>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px;">
        <hui-blog-card image=${IMG.css} category="CSS" category-color="secondary" title="Container queries trong thực tế" href="#2"
          excerpt="Thiết kế component tự thích ứng theo khung chứa thay vì màn hình." author="Thu Hà" author-avatar=${avatar('H', 330)} date="2026-09-20" reading-time="6"></hui-blog-card>
        <hui-blog-card image=${IMG.a11y} category="A11y" category-color="success" title="ARIA đúng cách: khi nào cần, khi nào không" href="#3"
          excerpt="Khi nào cần ARIA và khi nào HTML gốc là đủ — kèm checklist kiểm tra nhanh." author="Quang Huy" date="2026-09-12" content-length="1400"></hui-blog-card>
        <hui-blog-card image=${IMG.perf} category="Hiệu năng" category-color="warning" title="Tối ưu Core Web Vitals cho trang thương mại điện tử" href="#4"
          excerpt=${EXCERPT} author="Lan Chi" author-avatar=${avatar('L', 30)} date="2026-08-15" reading-time="7" effect="lift zoom-media reveal">
          <hui-button slot="overlay" size="sm" variant="secondary">Đọc ngay</hui-button>
        </hui-blog-card>
      </div>
    </div>
  `,
};

/** Kết hợp các card chuyên biệt trong một trang */
export const MixedCards = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; align-items: start;">
      <hui-stat-card title="Bài viết tháng này" value="48" delta="9.1" delta-label="so với tháng trước" icon="edit" .trend=${[20, 24, 22, 30, 35, 33, 41, 48]}></hui-stat-card>
      <hui-blog-card image=${IMG.css} category="CSS" title="Container queries trong thực tế" href="#2" excerpt="Thiết kế component tự thích ứng theo khung chứa."
        author="Thu Hà" date="2026-09-20" reading-time="6"></hui-blog-card>
      <hui-product-card image=${svgImage('Sách', 260, 600, 600)} name="Sách: Web Components thực chiến" price="249000" original-price="320000"
        rating="4.9" reviews="210" badge="Bán chạy" wishlist></hui-product-card>
    </div>
  `,
};

export const Loading = {
  render: () => html`
    <div style="max-width: 320px;">
      <hui-blog-card loading image=${IMG.css} title="Đang tải"></hui-blog-card>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .bc-brand {
        --hui-card-radius: 0;
        --hui-blog-card-title-font-size: 1.375rem;
        --hui-blog-card-title-color: var(--hui-primary);
        --hui-blog-card-excerpt-color: var(--hui-text);
        --hui-blog-card-meta-color: var(--hui-primary);
        --hui-card-media-zoom: 1.12;
      }
      hui-blog-card.bc-brand::part(category-base) { border-radius: 0; text-transform: uppercase; letter-spacing: 0.06em; }
      hui-blog-card.bc-brand::part(image) { filter: saturate(1.3); }
      hui-blog-card.bc-brand::part(meta) { border-top: 1px dashed var(--hui-border); padding-top: 8px; width: 100%; }
    </style>
    <div style="max-width: 340px;">
      <hui-blog-card class="bc-brand" image=${IMG.a11y} category="A11y" title="ARIA đúng cách" href="#a11y"
        excerpt="Khi nào cần ARIA và khi nào HTML gốc là đủ." author="Quang Huy" date="2026-09-12" reading-time="4"></hui-blog-card>
    </div>
  `,
};
