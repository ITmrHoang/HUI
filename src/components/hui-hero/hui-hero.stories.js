/**
 * Storybook Stories — HUI Hero (khối mở đầu landing page)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { svgImage } from '../hui-image/story-images.js';
import './index.js';
import '../hui-button/index.js';
import '../hui-tag/index.js';
import '../hui-gradient-bg/index.js';
import '../hui-gradient-text/index.js';
import '../hui-pattern/index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);
const MOCKUP = svgImage({ w: 1200, h: 800, hue: 230, label: 'Dashboard' });

const actions = () => html`
  <hui-button slot="actions" size="lg">Bắt đầu miễn phí</hui-button>
  <hui-button slot="actions" size="lg" variant="outline">Xem demo</hui-button>
`;

export default {
  title: 'Organisms/HuiHero',
  component: 'hui-hero',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**HUI Hero** — Khối mở đầu landing page: eyebrow, tiêu đề lớn (heading cấp 1), mô tả, nút hành động, media.
\`layout="centered"\` (giữa, media bên dưới) | \`layout="split"\` (2 cột, \`media-position\` \`end\`/\`start\`; tự xếp dọc khi khung
< 768px — container query). Nền qua slot \`background\` (hui-gradient-bg, hui-pattern, ảnh…) phủ kín khối.
**Hiệu ứng vào:** các phần hiện lần lượt (\`entrance\` + \`stagger\`) khi cuộn tới; \`no-animation\`, \`entrance="none"\`
hoặc "giảm chuyển động" của hệ điều hành → hiện ngay.

\`\`\`html
<hui-hero layout="split" min-height="screen" eyebrow="Mới · v2.0" heading="Dựng website nhanh gấp 10 lần"
  description="Thư viện Web Components zero-dependency.">
  <hui-gradient-bg slot="background" variant="mesh"></hui-gradient-bg>
  <hui-button slot="actions">Bắt đầu</hui-button>
  <img slot="media" src="/mockup.png" alt="Ảnh chụp bảng điều khiển">
</hui-hero>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`layout\` | string | \`centered\` | \`centered\` \\| \`split\` |
| \`media-position\` | string | \`end\` | \`end\` \\| \`start\` (split: media phải / trái) |
| \`eyebrow\` / \`heading\` / \`description\` | string | — | Chữ (slot cùng tên thay được) |
| \`heading-level\` | number | \`1\` | aria-level của tiêu đề |
| \`min-height\` | string | — | CSS length, số (px) hoặc \`screen\` (= 100svh) |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` — cỡ tiêu đề + đệm |
| \`entrance\` | string | \`fade-up\` | Tên hiệu ứng (\`fade\`, \`zoom-in\`, \`blur-in\`, \`fade-left\`…) hoặc \`none\` |
| \`stagger\` | number | \`120\` | Trễ giữa các phần (ms) |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng vào |

### Events
Không có.

### Slots
| Slot | Mô tả |
|------|-------|
| \`eyebrow\` / \`title\` / \`description\` | Thay chữ tương ứng (vd \`<hui-tag>\`, \`<hui-gradient-text>\`) |
| \`actions\` | Các nút |
| (mặc định) | Nội dung thêm dưới hàng nút |
| \`media\` | Ảnh / video / mockup |
| \`background\` | Lớp nền phủ kín (tự đặt \`--hui-gradient-bg-min-height\` / \`--hui-pattern-min-height\` = 100%) |

### Parts
\`base\` (\`<section aria-labelledby>\`), \`background\`, \`container\`, \`content\`, \`eyebrow\`, \`title\`, \`description\`, \`actions\`, \`extra\`, \`media\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-hero-max-width\` / \`-padding\` / \`-gap\` | Khung |
| \`--hui-hero-bg\` / \`-color\` | Nền / chữ |
| \`--hui-hero-title-color\` / \`-title-font-size\` | Tiêu đề (mặc định co giãn theo bề rộng khung) |
| \`--hui-hero-description-color\` / \`-description-font-size\` | Mô tả |
| \`--hui-hero-eyebrow-color\` | Eyebrow |
| \`--hui-hero-content-width\` | Bề rộng cột chữ khi centered (760px) |
| \`--hui-hero-media-radius\` / \`-media-shadow\` | Media |

### Bàn phím
Không có tương tác riêng — Tab qua các nút trong slot \`actions\`.
        `,
      },
    },
  },
  argTypes: {
    layout: { control: 'select', options: ['centered', 'split'] },
    mediaPosition: { control: 'select', options: ['end', 'start'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    entrance: { control: 'select', options: ['fade-up', 'fade', 'zoom-in', 'blur-in', 'fade-left', 'none'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-hero id="hero" layout=${args.layout} media-position=${args.mediaPosition} size=${args.size} entrance=${args.entrance}
      eyebrow="Mới · Phiên bản 2.0" heading="Dựng website nhanh gấp 10 lần với Web Components"
      description="Hơn 120 component sẵn hiệu ứng, dark mode, đa ngôn ngữ — dùng được với HTML thuần, Vue, React, Angular.">
      ${actions()}
      <span>Không cần thẻ tín dụng · Miễn phí mãi mãi</span>
      <img slot="media" src=${MOCKUP} alt="Ảnh chụp bảng điều khiển H-UI">
    </hui-hero>
  `,
  args: { layout: 'centered', mediaPosition: 'end', size: 'md', entrance: 'fade-up' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#hero');
    await expect(part(el, 'base').tagName).toBe('SECTION');
    await expect(part(el, 'base').getAttribute('aria-labelledby')).toBe('title');
    const title = part(el, 'title');
    await expect(title.getAttribute('role')).toBe('heading');
    await expect(title.getAttribute('aria-level')).toBe('1');
    await expect(title.textContent).toBe('Dựng website nhanh gấp 10 lần với Web Components');
    await expect(part(el, 'eyebrow').hidden).toBe(false);
    await expect(part(el, 'actions').hidden).toBe(false);
    await expect(part(el, 'extra').hidden).toBe(false);
    await expect(part(el, 'media').hidden).toBe(false);
    await expect(part(el, 'background').hidden).toBe(true);
    // Hiệu ứng vào: hết trạng thái ẩn sau khi khối vào màn hình
    await waitFor(() => expect(part(el, 'title').style.opacity).toBe(''));
  },
};

/** Split: media phải / trái, nền gradient, full màn hình */
export const Split = {
  render: () => html`
    <hui-hero id="hero-split" layout="split" min-height="screen" heading="Bán hàng online chưa bao giờ dễ thế"
      description="Trang sản phẩm, giỏ hàng, thanh toán — kéo thả là xong.">
      <hui-gradient-bg slot="background" variant="mesh"></hui-gradient-bg>
      <hui-tag slot="eyebrow" color="primary">🚀 Ra mắt tháng 10</hui-tag>
      ${actions()}
      <img slot="media" src=${svgImage({ w: 900, h: 700, hue: 280, label: 'Cửa hàng' })} alt="Minh họa cửa hàng">
    </hui-hero>
    <hui-hero id="hero-start" layout="split" media-position="start" size="sm" heading="Media bên trái" description="media-position=&quot;start&quot;">
      <hui-pattern slot="background" variant="dots" fade="radial"></hui-pattern>
      <hui-button slot="actions">Liên hệ</hui-button>
      <img slot="media" src=${svgImage({ w: 900, h: 600, hue: 160 })} alt="Minh họa">
    </hui-hero>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#hero-split');
    await expect(part(el, 'base').classList.contains('hero--split')).toBe(true);
    await expect(part(el, 'base').style.getPropertyValue('--_hero-min-height')).toBe('100svh');
    await expect(part(el, 'background').hidden).toBe(false);
    await expect(part(el, 'eyebrow').classList.contains('hero__eyebrow--custom')).toBe(true);
    // Nền phủ kín khối
    const bg = el.querySelector('hui-gradient-bg');
    await expect(Math.round(bg.getBoundingClientRect().height)).toBe(Math.round(part(el, 'base').getBoundingClientRect().height));
    const start = canvasElement.querySelector('#hero-start');
    await expect(part(start, 'base').classList.contains('hero--media-start')).toBe(true);
  },
};

/** Slot title (gradient text), tắt hiệu ứng, min-height số */
export const SlotsAndNoAnimation = {
  render: () => html`
    <hui-hero id="hero-static" no-animation min-height="420" heading-level="2" description="Tiêu đề dùng hui-gradient-text qua slot title.">
      <span slot="title">Giao diện <hui-gradient-text>tuyệt đẹp</hui-gradient-text> ngay lập tức</span>
      ${actions()}
    </hui-hero>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#hero-static');
    await expect(part(el, 'title').hidden).toBe(false);
    await expect(part(el, 'title').getAttribute('aria-level')).toBe('2');
    await expect(part(el, 'base').style.getPropertyValue('--_hero-min-height')).toBe('420px');
    // no-animation → không ẩn phần nào, không có animation
    await expect(part(el, 'title').style.opacity).toBe('');
    await expect(part(el, 'title').getAnimations().length).toBe(0);
    await expect(part(el, 'media').hidden).toBe(true);
    // Đổi property → vẽ lại
    el.heading = 'bị slot title che';
    el.eyebrow = 'Eyebrow mới';
    await el.updateComplete;
    await expect(part(el, 'eyebrow').hidden).toBe(false);
    await expect(part(el, 'eyebrow').textContent).toBe('Eyebrow mới');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .hero-custom {
        --hui-hero-bg: #0f172a;
        --hui-hero-color: #e2e8f0;
        --hui-hero-title-color: #fff;
        --hui-hero-description-color: #94a3b8;
        --hui-hero-eyebrow-color: #38bdf8;
        --hui-hero-title-font-size: 44px;
      }
      .hero-custom::part(content) { gap: 12px; }
      .hero-custom::part(title) { font-family: Georgia, serif; }
    </style>
    <hui-hero id="hero-custom" class="hero-custom" eyebrow="Dark hero" heading="Tùy biến từ ngoài" description="Biến CSS + ::part." no-animation>
      <hui-button slot="actions">Hành động</hui-button>
    </hui-hero>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#hero-custom');
    await expect(getComputedStyle(part(el, 'base')).backgroundColor).toBe('rgb(15, 23, 42)');
    await expect(getComputedStyle(part(el, 'title')).fontSize).toBe('44px');
    await expect(getComputedStyle(part(el, 'title')).color).toBe('rgb(255, 255, 255)');
    await expect(getComputedStyle(part(el, 'content')).rowGap).toBe('12px');
  },
};
