/**
 * Storybook Stories — HUI Media Object (Molecule)
 * Media (ảnh / avatar) bên cạnh nội dung: tiêu đề, mô tả, meta, hành động; tự xếp dọc khi khung hẹp.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-avatar/index.js';
import '../hui-button/index.js';

const thumb = (hue = 210, label = '') => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">
    <rect width="240" height="160" fill="hsl(${hue} 70% 55%)"/><circle cx="180" cy="40" r="50" fill="rgb(255 255 255 / .2)"/>
    <text x="16" y="144" font-family="sans-serif" font-size="22" font-weight="700" fill="#fff">${label}</text></svg>`,
)}`;

const part = (el, name) => el.shadowRoot.querySelector(`[part="${name}"]`);

export default {
  title: 'Molecules/HuiMediaObject',
  component: 'hui-media-object',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Media Object** — bố cục "media bên cạnh nội dung" (bình luận, thông báo, mục danh sách, tin tức).

\`\`\`html
<hui-media-object heading="Nguyễn Thu Lan" meta="2 giờ trước" align="start">
  <hui-avatar slot="media" name="Nguyễn Thu Lan"></hui-avatar>
  Giao diện mới đẹp quá, tốc độ tải trang cũng nhanh hơn hẳn!
  <hui-button slot="actions" size="sm" variant="text">Trả lời</hui-button>
</hui-media-object>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`align\` | string | \`'start'\` | \`start\` / \`center\` — căn media theo chiều dọc |
| \`media-position\` | string | \`'start'\` | \`start\` (trái) / \`end\` (phải) |
| \`gap\` | string | \`'md'\` | \`sm\` / \`md\` / \`lg\` / \`xl\` hoặc độ dài CSS |
| \`stack-at\` | number | \`360\` | Thẻ hẹp hơn (px) → xếp dọc; \`0\` = không |
| \`heading\` | string | — | Tiêu đề |
| \`href\` | string | — | Tiêu đề thành link |
| \`description\` | string | — | Mô tả (slot mặc định ưu tiên hơn) |
| \`meta\` | string | — | Dòng phụ |
| \`heading-level\` | number | \`0\` | 1–6 → \`role="heading"\` \`aria-level\` |

### Properties
\`stacked\` — đang xếp dọc (cũng có \`:state(stacked)\`).

### Slots
\`media\`, \`title\`, _(default)_ mô tả, \`meta\`, \`actions\`

### Parts
\`base\`, \`media\`, \`body\`, \`title\`, \`title-link\`, \`description\`, \`meta\`, \`actions\`

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-media-object-gap\` | theo \`gap\` | Khoảng cách |
| \`--hui-media-object-media-size\` | auto | Rộng vùng media |
| \`--hui-media-object-title-color\` / \`-title-size\` | \`--hui-text\` / \`--hui-font-base\` | Tiêu đề |
| \`--hui-media-object-color\` | \`--hui-text-secondary\` | Mô tả |
| \`--hui-media-object-meta-color\` | \`--hui-text-tertiary\` | Dòng phụ |
| \`--hui-media-object-padding\` | 0 | Đệm |

Không có tương tác bàn phím riêng — link / nút bên trong theo thứ tự Tab bình thường.
        `,
      },
    },
  },
  argTypes: {
    align: { control: 'inline-radio', options: ['start', 'center'] },
    mediaPosition: { control: 'inline-radio', options: ['start', 'end'] },
    gap: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-media-object heading="Nguyễn Thu Lan" meta="2 giờ trước · Hà Nội" align=${args.align}
      media-position=${args.mediaPosition} gap=${args.gap} heading-level="3" style="max-width: 560px;">
      <hui-avatar slot="media" name="Nguyễn Thu Lan" size="lg"></hui-avatar>
      Giao diện mới đẹp quá, tốc độ tải trang cũng nhanh hơn hẳn. Mong đội ngũ ra thêm chế độ tối cho trang quản trị!
      <hui-button slot="actions" size="sm" variant="text" icon="chat">Trả lời</hui-button>
      <hui-button slot="actions" size="sm" variant="text" icon="heart">Thích</hui-button>
    </hui-media-object>
  `,
  args: { align: 'start', mediaPosition: 'start', gap: 'md' },
  play: async ({ canvasElement }) => {
    const mo = canvasElement.querySelector('hui-media-object');
    await mo.updateComplete;
    await expect(part(mo, 'title').textContent).toBe('Nguyễn Thu Lan');
    await expect(part(mo, 'title').getAttribute('aria-level')).toBe('3');
    await expect(part(mo, 'meta').hidden).toBe(false);
    await expect(part(mo, 'actions').hidden).toBe(false);
    await expect(part(mo, 'media').hidden).toBe(false);
    // Trái → phải
    await expect(part(mo, 'media').getBoundingClientRect().left).toBeLessThan(part(mo, 'body').getBoundingClientRect().left);
    mo.mediaPosition = 'end';
    await mo.updateComplete;
    await expect(part(mo, 'media').getBoundingClientRect().left).toBeGreaterThan(part(mo, 'body').getBoundingClientRect().left);
  },
};

export const Variants = {
  render: () => html`
    <div style="display: grid; gap: 24px; max-width: 640px;">
      <hui-media-object heading="Ra mắt H-UI 2.0" href="#news" description="Hơn 120 component, dark mode, form native và hệ thống hiệu ứng." meta="20/10/2026" gap="lg">
        <img slot="media" src=${thumb(250, 'H-UI 2.0')} alt="" width="160" style="border-radius: 12px;">
      </hui-media-object>
      <hui-media-object heading="Đơn hàng #10293 đã giao" description="Shipper đã giao thành công lúc 14:20." align="center" gap="sm">
        <span slot="media" style="display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; background: var(--hui-success-1); color: var(--hui-success);">✓</span>
      </hui-media-object>
      <hui-media-object heading="Gói Pro" description="Thanh toán theo năm, tiết kiệm 20%." media-position="end" align="center">
        <hui-button slot="media" variant="primary">Nâng cấp</hui-button>
      </hui-media-object>
      <hui-media-object heading="Không có media" description="Vùng media trống tự ẩn, không dư khoảng cách."></hui-media-object>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const items = canvasElement.querySelectorAll('hui-media-object');
    await items[0].updateComplete;
    await expect(part(items[0], 'title-link').getAttribute('href')).toBe('#news');
    await expect(part(items[3], 'media').hidden).toBe(true);
    await expect(part(items[3], 'actions').hidden).toBe(true);
  },
};

export const StackOnNarrow = {
  name: 'Xếp dọc khi khung hẹp',
  render: () => html`
    <div id="box" style="width: 520px; resize: horizontal; overflow: auto; padding: 12px; border: 1px dashed var(--hui-border);">
      <hui-media-object heading="Khóa học Web Components" description="12 bài · 4 giờ · Cơ bản đến nâng cao" align="center" stack-at="400">
        <img slot="media" src=${thumb(160, 'WC')} alt="" width="180" style="border-radius: 12px;">
        <hui-button slot="actions" size="sm">Học ngay</hui-button>
      </hui-media-object>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const mo = canvasElement.querySelector('hui-media-object');
    const box = canvasElement.querySelector('#box');
    await mo.updateComplete;
    await waitFor(() => expect(mo.stacked).toBe(false));
    box.style.width = '320px';
    await waitFor(() => expect(mo.stacked).toBe(true));
    // Media nằm trên nội dung
    await expect(part(mo, 'media').getBoundingClientRect().bottom).toBeLessThanOrEqual(part(mo, 'body').getBoundingClientRect().top + 1);
    box.style.width = '520px';
    await waitFor(() => expect(mo.stacked).toBe(false));
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-mo {
        --hui-media-object-gap: 20px;
        --hui-media-object-padding: 16px;
        --hui-media-object-title-color: var(--hui-primary);
        --hui-media-object-title-size: 1.125rem;
        --hui-media-object-meta-color: var(--hui-warning);
        --hui-media-object-media-size: 64px;
      }
      .brand-mo::part(base) { border: 1px solid var(--hui-border); border-radius: 16px; background: var(--hui-bg-container); }
      .brand-mo::part(meta) { text-transform: uppercase; letter-spacing: 0.06em; }
    </style>
    <hui-media-object class="brand-mo" heading="Trần Minh" meta="Thành viên Vàng" description="Đã mua 24 đơn hàng trong năm 2026." align="center" style="max-width: 480px;">
      <hui-avatar slot="media" name="Trần Minh" size="xl" color="warning"></hui-avatar>
    </hui-media-object>
  `,
};
