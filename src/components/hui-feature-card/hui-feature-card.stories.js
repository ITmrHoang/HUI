/**
 * Storybook Stories — HUI Feature Card (thẻ tính năng landing page)
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);

export default {
  title: 'Molecules/HuiFeatureCard',
  component: 'hui-feature-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Feature Card** — Thẻ tính năng cho landing page, dựng trên \`<hui-card>\`: icon lớn trong vòng tròn tô màu nhạt,
tiêu đề, mô tả, link "Tìm hiểu thêm →". Có \`href\` → cả thẻ bấm được (link là điểm Tab duy nhất).
Hiệu ứng thẻ qua \`effect\` (\`lift\`, \`tilt\`, \`glow\`, \`border-gradient\`…) của hui-card.

\`\`\`html
<hui-feature-card icon="star" title="Nhanh như chớp" description="Tải trang dưới 1 giây." href="/tinh-nang"></hui-feature-card>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`icon\` | string | — | Tên icon hui-icon (slot \`icon\` ưu tiên hơn) |
| \`title\` | string | — | Tiêu đề (attribute bị gỡ khỏi host để không hiện tooltip native) |
| \`heading-level\` | number | \`3\` | aria-level của tiêu đề |
| \`description\` | string | — | Mô tả |
| \`href\` / \`target\` | string | — | Hiện link + cả thẻ bấm được |
| \`link-text\` | string | "Tìm hiểu thêm" | Chữ link (aria-label kèm tiêu đề) |
| \`variant\` | string | \`card\` | \`plain\` \\| \`card\` \\| \`outline\` |
| \`align\` | string | \`start\` | \`start\` \\| \`center\` |
| \`orientation\` | string | \`vertical\` | \`vertical\` \\| \`horizontal\` (icon trái) |
| \`color\` | string | \`primary\` | Token màu hoặc màu CSS — icon + link |
| \`icon-shape\` | string | \`circle\` | \`circle\` \\| \`rounded\` \\| \`square\` |
| \`effect\` | string | — | Hiệu ứng hui-card: \`lift\` \`tilt\` \`glow\` \`border-gradient\`… |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`loading\` / \`no-animation\` | boolean | \`false\` | Skeleton / tắt chuyển động |

### Events
Không có (link điều hướng như link thường; \`href\` của hui-card).

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Nội dung thêm dưới mô tả |
| \`icon\` | Icon / hình tùy biến |
| \`actions\` / \`footer\` | Chuyển xuống hui-card |

### Parts
\`base\`, \`icon\`, \`content\`, \`heading\`, \`description\`, \`link\`, \`link-icon\` và part của hui-card (\`card\`, \`body\`, \`actions\`…).

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-feature-card-accent\` | Màu nhấn |
| \`--hui-feature-card-icon-bg\` / \`-icon-size\` / \`-icon-radius\` | Vòng icon |
| \`--hui-feature-card-title-color\` / \`-title-font-size\` | Tiêu đề |
| \`--hui-feature-card-description-color\` | Mô tả |
| \`--hui-feature-card-gap\` | Khoảng cách các dòng |
| \`--hui-card-*\` | Mọi biến của hui-card |

### Bàn phím
\`Tab\` tới link "Tìm hiểu thêm" · \`Enter\` mở link. Bấm vào chỗ trống của thẻ cũng mở link.

### Locale
\`featureCard.more\` ("Tìm hiểu thêm" / "Learn more").
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['plain', 'card', 'outline'] },
    align: { control: 'select', options: ['start', 'center'] },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: ['primary', 'secondary', 'success', 'warning', 'danger', 'info'] },
    iconShape: { control: 'select', options: ['circle', 'rounded', 'square'] },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 320px;">
      <hui-feature-card id="fc" icon=${args.icon} title=${args.title} description=${args.description} href="#tinh-nang"
        variant=${args.variant} align=${args.align} orientation=${args.orientation} size=${args.size}
        color=${args.color} icon-shape=${args.iconShape}></hui-feature-card>
    </div>
  `,
  args: {
    icon: 'star',
    title: 'Nhanh như chớp',
    description: 'Không phụ thuộc framework, tải trang dưới 1 giây và chạy mượt trên mọi thiết bị.',
    variant: 'card',
    align: 'start',
    orientation: 'vertical',
    size: 'md',
    color: 'primary',
    iconShape: 'circle',
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fc');
    await expect(el.hasAttribute('title')).toBe(false);
    await expect(el.title).toBe('Nhanh như chớp');
    await expect(part(el, 'heading').textContent).toBe('Nhanh như chớp');
    await expect(part(el, 'heading').getAttribute('aria-level')).toBe('3');
    const link = part(el, 'link');
    await expect(link.getAttribute('href')).toBe('#tinh-nang');
    await expect(link.getAttribute('aria-label')).toBe('Tìm hiểu thêm: Nhanh như chớp');
    const card = sr(el).querySelector('hui-card');
    await expect(card.getAttribute('href')).toBe('#tinh-nang');
    await expect(card.getAttribute('variant')).toBe('elevated');
    // hui-card dùng chính link "Tìm hiểu thêm" → không thêm link ẩn thứ 2
    await waitFor(() => expect(sr(card).querySelector('.hui-card__link')?.isConnected ?? false).toBe(false));
  },
};

/** 3 variant × 2 kiểu căn */
export const Variants = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px;">
      <hui-feature-card id="fc-plain" variant="plain" icon="search" title="plain" description="Chữ trơn, không nền."></hui-feature-card>
      <hui-feature-card id="fc-card" variant="card" icon="heart" color="danger" title="card" description="Thẻ nổi có bóng."></hui-feature-card>
      <hui-feature-card id="fc-outline" variant="outline" icon="settings" color="success" title="outline" description="Thẻ viền mảnh."></hui-feature-card>
      <hui-feature-card align="center" variant="plain" icon="user" color="info" title="center · plain" description="Căn giữa."></hui-feature-card>
      <hui-feature-card align="center" icon="truck" color="warning" title="center · card" description="Căn giữa trong thẻ." icon-shape="rounded"></hui-feature-card>
      <hui-feature-card align="center" variant="outline" icon="calendar" color="#8b5cf6" title="Màu CSS tùy ý" description="color=&quot;#8b5cf6&quot;" icon-shape="square"></hui-feature-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const card = (id) => sr(canvasElement.querySelector(id)).querySelector('hui-card');
    await expect(card('#fc-plain').getAttribute('variant')).toBe('ghost');
    await expect(card('#fc-outline').getAttribute('variant')).toBe('outlined');
    // Không có href → link ẩn
    await expect(part(canvasElement.querySelector('#fc-card'), 'link').hidden).toBe(true);
  },
};

/** Kích thước + bố cục ngang */
export const SizesAndHorizontal = {
  render: () => html`
    <div style="display: grid; gap: 16px; max-width: 560px;">
      <hui-feature-card size="sm" orientation="horizontal" icon="mail" title="Nhỏ, ngang" description="Icon bên trái nội dung."></hui-feature-card>
      <hui-feature-card size="md" orientation="horizontal" icon="phone" title="Vừa, ngang" description="Phù hợp danh sách tính năng dạng cột." href="#"></hui-feature-card>
      <hui-feature-card id="fc-lg" size="lg" icon="home" title="Lớn" description="Icon 72px."></hui-feature-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fc-lg');
    await expect(getComputedStyle(part(el, 'icon')).width).toBe('72px');
  },
};

/** Slot icon (SVG riêng), nội dung thêm, actions; hiệu ứng tilt + glow; loading */
export const SlotsAndEffects = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px;">
      <hui-feature-card id="fc-slot" title="Icon tùy biến" description="Slot icon nhận SVG bất kỳ." effect="tilt glow">
        <svg slot="icon" viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M12 2 2 7l10 5 10-5-10-5Zm0 7.5L4.2 5.6 2 7l10 5 10-5-2.2-1.4L12 9.5Z"/></svg>
        <ul style="margin: 0; padding-left: 18px; color: var(--hui-text-secondary);"><li>Tilt 3D theo chuột</li><li>Đốm sáng glow</li></ul>
        <hui-button slot="actions" size="sm">Dùng thử</hui-button>
      </hui-feature-card>
      <hui-feature-card title="Viền chạy" icon="star" description="effect=&quot;lift border-gradient&quot;" effect="lift border-gradient" href="#"></hui-feature-card>
      <hui-feature-card title="Đang tải" icon="loading" description="…" loading></hui-feature-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fc-slot');
    await expect(part(el, 'icon').hidden).toBe(false);
    await expect(sr(el).querySelector('hui-card').getAttribute('effect')).toBe('tilt glow');
    // Đổi property → vẽ lại
    el.description = 'Mô tả mới';
    el.headingLevel = 2;
    await el.updateComplete;
    await expect(part(el, 'description').textContent).toBe('Mô tả mới');
    await expect(part(el, 'heading').getAttribute('aria-level')).toBe('2');
  },
};

/** Bàn phím: link "Tìm hiểu thêm" là điểm Tab duy nhất; bấm chỗ trống của thẻ = bấm link */
export const Keyboard = {
  render: () => html`
    <div style="max-width: 300px;">
      <hui-feature-card id="fc-kb" icon="search" title="Tìm kiếm" description="Tab để tới link." href="#kb"></hui-feature-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fc-kb');
    const link = part(el, 'link');
    link.focus();
    await expect(sr(el).activeElement).toBe(link);
    await expect(link.tabIndex).toBe(0);
    let clicks = 0;
    link.addEventListener('click', (e) => { clicks += 1; e.preventDefault(); });
    await userEvent.click(part(el, 'description'));
    await expect(clicks).toBe(1);
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .fc-custom {
        --hui-feature-card-accent: #0ea5e9;
        --hui-feature-card-icon-bg: linear-gradient(135deg, #0ea5e9, #6366f1);
        --hui-feature-card-icon-radius: 18px;
        --hui-feature-card-title-color: #0369a1;
      }
      .fc-custom::part(icon) { color: #fff; box-shadow: 0 8px 20px rgb(14 165 233 / 0.35); }
      .fc-custom::part(link) { text-transform: uppercase; letter-spacing: 0.05em; font-size: 12px; }
    </style>
    <div style="max-width: 320px;">
      <hui-feature-card id="fc-custom" class="fc-custom" icon="share" title="Tùy biến hoàn toàn" description="Biến CSS + ::part." href="#"></hui-feature-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fc-custom');
    await expect(getComputedStyle(part(el, 'icon')).color).toBe('rgb(255, 255, 255)');
    await expect(getComputedStyle(part(el, 'icon')).borderTopLeftRadius).toBe('18px');
  },
};
