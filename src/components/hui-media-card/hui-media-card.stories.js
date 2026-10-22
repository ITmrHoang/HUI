/**
 * Storybook Stories — HUI Media Card (ảnh / video + nội dung + meta)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { svgImage } from '../hui-image/story-images.js';
import './index.js';
import '../hui-button/index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);

const avatar = (initial, hue) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue} 60% 55%)"/>`
  + `<text x="50%" y="62%" font-family="sans-serif" font-size="28" font-weight="700" fill="#fff" text-anchor="middle">${initial}</text></svg>`,
)}`;
const IMG = svgImage({ w: 800, h: 450, hue: 200, label: 'Media' });
const HOURS_AGO = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
const DESC = 'Hướng dẫn dựng landing page hoàn chỉnh chỉ với Web Components: hero, tính năng, bảng giá và chân trang.';

export default {
  title: 'Molecules/HuiMediaCard',
  component: 'hui-media-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Media Card** — Thẻ media dựng trên \`<hui-card>\`: ảnh (\`<hui-image>\` tải lười + skeleton) hoặc video
(\`<hui-video>\` dạng facade — bấm mới tải trình phát, \`image\` làm poster), tiêu đề (link), mô tả cắt dòng,
meta tác giả (\`<hui-avatar>\`) + thời gian (\`<hui-time>\` tương đối, tự cập nhật), actions.

\`\`\`html
<hui-media-card image="/cover.jpg" title="Dựng landing page" href="/bai-viet" description="…"
  author="Minh Anh" datetime="2026-10-20T08:00:00Z" badge="Mới"></hui-media-card>
<hui-media-card video="https://youtu.be/VIDEO_ID" image="/poster.jpg" title="Video giới thiệu" badge="12:30"></hui-media-card>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`image\` / \`image-alt\` | string | — | Ảnh (với video: poster) / mô tả ảnh |
| \`video\` | string | — | YouTube / Vimeo / mp4 → \`<hui-video>\` facade |
| \`ratio\` | string | \`16/9\` | Tỉ lệ media (layout dọc) |
| \`lazy\` | string | \`true\` | \`false\` = tải ảnh ngay |
| \`badge\` | string | — | Nhãn góc media |
| \`title\` | string | — | Tiêu đề (attribute bị gỡ khỏi host) |
| \`heading-level\` | number | \`3\` | aria-level |
| \`description\` / \`description-lines\` | string / number | — / \`3\` | Mô tả cắt dòng |
| \`author\` / \`author-avatar\` | string | — | Tác giả |
| \`datetime\` / \`time-format\` | string | — / \`relative\` | Thời điểm + định dạng hui-time |
| \`href\` / \`target\` | string | — | Tiêu đề là link, cả thẻ bấm được |
| \`effect\` | string | \`lift zoom-media\` | Hiệu ứng hui-card (zoom-media phóng ảnh hui-image) |
| \`variant\` / \`orientation\` / \`size\` / \`loading\` / \`no-animation\` | — | — | Như hui-card (\`horizontal\`: media trái, cao bằng thẻ) |

### Events
Không có riêng — \`<hui-video>\` phát \`hui-play\` (nổi bọt) khi bấm phát.

### Slots
\`(mặc định)\` nội dung thêm · \`media\` (thay image/video) · \`actions\` · \`footer\` · \`overlay\`.

### Parts
\`media\`, \`image\` (+ \`image-base\`, \`image-img\`), \`video\` (+ \`video-base\`, \`video-play\`), \`badge\`, \`content\`, \`heading\`,
\`title-link\`, \`description\`, \`meta\`, \`avatar\`, \`author\`, \`time\` và part của hui-card.

### CSS Variables
\`--hui-media-card-title-color\` · \`-title-font-size\` · \`-title-lines\` · \`-description-color\` · \`-meta-color\` ·
\`-badge-bg\` · \`-badge-color\` · \`-media-min-height\` · và mọi \`--hui-card-*\`.

### Bàn phím
\`Tab\` tới link tiêu đề (\`Enter\` mở) · với video: \`Tab\` tới nút phát (\`Enter\`/\`Space\` phát).
        `,
      },
    },
  },
  argTypes: {
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    variant: { control: 'select', options: ['elevated', 'outlined', 'filled', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    ratio: { control: 'select', options: ['16/9', '4/3', '1/1', '3/4'] },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 340px;">
      <hui-media-card id="mc" image=${IMG} title="Dựng landing page trong 1 buổi chiều" href="#bai-viet" description=${DESC}
        author="Minh Anh" author-avatar=${avatar('M', 210)} datetime=${HOURS_AGO} badge="Mới"
        ratio=${args.ratio} orientation=${args.orientation} variant=${args.variant} size=${args.size}>
        <hui-button slot="actions" size="sm" variant="text">Lưu</hui-button>
        <hui-button slot="actions" size="sm" variant="text">Chia sẻ</hui-button>
      </hui-media-card>
    </div>
  `,
  args: { ratio: '16/9', orientation: 'vertical', variant: 'elevated', size: 'md' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#mc');
    await expect(el.hasAttribute('title')).toBe(false);
    const img = part(el, 'image');
    await expect(img.getAttribute('src')).toBe(IMG);
    await expect(img.getAttribute('lazy')).toBe('true');
    await expect(img.getAttribute('ratio')).toBe('16/9');
    await expect(part(el, 'video').hidden).toBe(true);
    await expect(part(el, 'badge').textContent).toBe('Mới');
    await expect(part(el, 'title-link').getAttribute('href')).toBe('#bai-viet');
    await expect(part(el, 'author').textContent).toBe('Minh Anh');
    const time = part(el, 'time');
    await expect(time.getAttribute('datetime')).toBe(HOURS_AGO);
    await waitFor(() => expect(time.shadowRoot.textContent).toContain('3 giờ'));
    // zoom-media mặc định
    await expect(part(el, 'media').classList.contains('mc__media--zoom')).toBe(true);
  },
};

/** Video facade (chỉ tải trình phát khi bấm) + bố cục ngang */
export const VideoAndHorizontal = {
  render: () => html`
    <div style="display: grid; gap: 20px; max-width: 640px;">
      <hui-media-card id="mc-video" video="video-demo.mp4" image=${svgImage({ w: 800, h: 450, hue: 330, label: 'Video' })}
        title="Video giới thiệu sản phẩm" badge="12:30" description="Bấm để phát — trang không tải trình phát khi chưa cần."
        author="H-UI Team" datetime="2026-10-01" time-format="date"></hui-media-card>
      <hui-media-card id="mc-h" orientation="horizontal" image=${svgImage({ w: 600, h: 600, hue: 140 })} title="Bài nổi bật dạng ngang"
        href="#ngang" description=${DESC} author="Thu Hà" datetime=${HOURS_AGO}></hui-media-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const v = canvasElement.querySelector('#mc-video');
    const video = part(v, 'video');
    await expect(video.hidden).toBe(false);
    await expect(part(v, 'image').hidden).toBe(true);
    await expect(video.getAttribute('src')).toBe('video-demo.mp4');
    await expect(video.getAttribute('poster')).toContain('data:image/svg+xml');
    await expect(video.getAttribute('title')).toBe('Video giới thiệu sản phẩm');
    // Chưa bấm → chưa có trình phát
    await expect(video.shadowRoot.querySelector('video, iframe')).toBe(null);
    const h = canvasElement.querySelector('#mc-h');
    await expect(part(h, 'image').hasAttribute('ratio')).toBe(false);
    await expect(sr(h).querySelector('hui-card').getAttribute('orientation')).toBe('horizontal');
  },
};

/** Không media; slot media tùy biến; mô tả 2 dòng; eager */
export const Variants = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; align-items: start;">
      <hui-media-card id="mc-none" title="Không có media" description="Chỉ có chữ — vùng cover tự ẩn." variant="outlined"></hui-media-card>
      <hui-media-card id="mc-slot" title="Media tùy biến" description="Slot media nhận bất kỳ phần tử nào.">
        <div slot="media" style="display:grid;place-items:center;aspect-ratio:16/9;background:linear-gradient(135deg,var(--hui-primary-3),var(--hui-primary-6));color:#fff;font-weight:700;">SLOT</div>
      </hui-media-card>
      <hui-media-card id="mc-lines" image=${svgImage({ w: 600, h: 600, hue: 30 })} ratio="1/1" lazy="false" description-lines="2"
        title="Ảnh vuông, tải ngay" description=${DESC} size="sm" variant="filled"></hui-media-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const none = canvasElement.querySelector('#mc-none');
    await expect(part(none, 'media').hidden).toBe(true);
    await expect(sr(none).querySelector('hui-card').classList.contains('mc__card--no-media')).toBe(true);
    await expect(part(none, 'meta').hidden).toBe(true);
    const slot = canvasElement.querySelector('#mc-slot');
    await expect(part(slot, 'media').hidden).toBe(false);
    const lines = canvasElement.querySelector('#mc-lines');
    await expect(part(lines, 'image').getAttribute('lazy')).toBe('false');
    await expect(getComputedStyle(part(lines, 'description')).webkitLineClamp).toBe('2');
  },
};

/** Hiệu ứng reveal + overlay, tilt; loading */
export const EffectsAndStates = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px;">
      <hui-media-card id="mc-reveal" effect="lift zoom-media reveal" image=${IMG} title="Rê chuột để hiện nút" href="#x">
        <hui-button slot="overlay" size="sm" variant="secondary">Xem ngay</hui-button>
      </hui-media-card>
      <hui-media-card effect="tilt glow" image=${svgImage({ w: 800, h: 450, hue: 260 })} title="Tilt + glow" description="Hiệu ứng theo chuột."></hui-media-card>
      <hui-media-card loading image=${IMG} title="Đang tải"></hui-media-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#mc-reveal');
    await expect(sr(el).querySelector('hui-card').getAttribute('effect')).toBe('lift zoom-media reveal');
    await expect(sr(el).querySelector('slot[name="overlay"]').getAttribute('slot')).toBe('overlay');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .mc-custom {
        --hui-media-card-title-color: #be185d;
        --hui-media-card-badge-bg: #be185d;
        --hui-card-radius: 20px;
      }
      .mc-custom::part(badge) { text-transform: uppercase; letter-spacing: 0.05em; }
      .mc-custom::part(meta) { border-top: 1px dashed var(--hui-border); padding-top: 8px; width: 100%; }
    </style>
    <div style="max-width: 340px;">
      <hui-media-card id="mc-custom" class="mc-custom" image=${IMG} title="Tùy biến từ ngoài" badge="hot" author="Minh Anh" datetime=${HOURS_AGO}></hui-media-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#mc-custom');
    await expect(getComputedStyle(part(el, 'badge')).backgroundColor).toBe('rgb(190, 24, 93)');
    await expect(getComputedStyle(part(el, 'badge')).textTransform).toBe('uppercase');
    await expect(getComputedStyle(part(el, 'heading')).color).toBe('rgb(190, 24, 93)');
  },
};
