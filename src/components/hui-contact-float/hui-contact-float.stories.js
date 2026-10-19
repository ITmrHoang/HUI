/**
 * Storybook Stories — HUI Contact Float
 * Cụm nút liên hệ nổi cho website Việt Nam: hotline, Zalo, Messenger, email (+ lên đầu trang).
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import { registerIcon, getIcon } from '../hui-icon/icons.js';

// Icon minh họa cho story (KHÔNG phải logo thật) — dự án thật tự đăng ký logo của mình
if (!getIcon('demo-brand')) {
  registerIcon('demo-brand', '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 8h8l-8 8h8"/>');
}

export default {
  title: 'Organisms/HuiContactFloat',
  component: 'hui-contact-float',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Contact Float** — Cụm nút liên hệ nổi (gọi hotline, Zalo, Messenger, email) dựng sẵn từ
\`hui-float-group\` + \`hui-float-button\`. Tự ẩn khi in trang (\`@media print\`).

Thư viện **không kèm logo thương hiệu** — chỉ dùng icon chung \`phone\` / \`chat\` / \`mail\`.
Muốn dùng logo Zalo / Messenger: tự đăng ký SVG của dự án rồi đặt tên icon:
\`\`\`js
import { registerIcon } from '@itmrhoang/h-ui/hui-icon';
registerIcon('zalo', '<path d="..."/>');        // nội dung bên trong <svg viewBox="0 0 24 24">
\`\`\`
\`\`\`html
<hui-contact-float phone="0909 123 456" zalo="0909123456" zalo-icon="zalo"
                   messenger="huiteam" email="hello@example.com" pulse include-back-top></hui-contact-float>
\`\`\`

> Các ví dụ đặt trong khung có \`transform\` để phần tử \`position: fixed\` bám theo khung thay vì cửa sổ.

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`phone\` | string | — | Hotline → \`tel:\` (bỏ khoảng trắng, dấu chấm) |
| \`zalo\` | string | — | Số điện thoại / Zalo ID → \`https://zalo.me/<id>\` (tab mới) |
| \`messenger\` | string | — | Username trang → \`https://m.me/<tên>\` (tab mới) |
| \`email\` | string | — | Email → \`mailto:\` |
| \`zalo-icon\` / \`messenger-icon\` | string | \`'chat'\` | Tên icon (đăng ký logo riêng qua \`registerIcon\`) |
| \`trigger\` | string | \`'none'\` | \`none\` (luôn hiện) \\| \`click\` \\| \`hover\` (gom vào nút chính) |
| \`position\` | string | \`'bottom-right'\` | \`bottom-right\` \\| \`bottom-left\` \\| \`top-right\` \\| \`top-left\` |
| \`offset\` | string | \`'24'\` | Khoảng cách tới mép (px): \`"24"\` hoặc \`"x,y"\` |
| \`shape\` / \`size\` | string | \`'circle'\` / \`'lg'\` | Hình dạng / kích thước nút |
| \`pulse\` | boolean | \`false\` | Vòng lan thu hút chú ý trên nút gọi (hoặc nút chính khi gom nhóm). Tự tắt khi giảm chuyển động |
| \`include-back-top\` | boolean | \`false\` | Thêm nút lên đầu trang vào cụm |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Chuỗi locale
\`contactFloat.phone\` ("Gọi {value}"), \`contactFloat.zalo\`, \`contactFloat.messenger\`, \`contactFloat.email\`,
\`contactFloat.toggle\` — dùng làm tooltip + \`aria-label\`.

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Đi qua các nút liên hệ |
| \`Enter\` | Mở liên kết |
| \`Esc\` | Đóng cụm (khi \`trigger\` là click/hover) |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-contact-float-phone-bg\` / \`-phone-color\` | Nút gọi (mặc định \`--hui-success\`) |
| \`--hui-contact-float-zalo-bg\` / \`-zalo-color\` | Nút Zalo (mặc định \`--hui-info\`) |
| \`--hui-contact-float-messenger-bg\` / \`-messenger-color\` | Nút Messenger (mặc định \`--hui-primary\`) |
| \`--hui-contact-float-email-bg\` / \`-email-color\` | Nút email (mặc định \`--hui-warning\`) |
| \`--hui-float-group-gap\`, \`--hui-float-button-size\`... | Biến của hui-float-group / hui-float-button |

**Parts:** \`group\`, \`group-base\`, \`group-list\`, \`group-toggle\`, \`button\`, \`button-phone\`, \`button-zalo\`,
\`button-messenger\`, \`button-email\`, \`back-top\`.
        `,
      },
    },
  },
  argTypes: {
    phone: { control: 'text' },
    zalo: { control: 'text' },
    messenger: { control: 'text' },
    email: { control: 'text' },
    trigger: { control: 'select', options: ['none', 'click', 'hover'], table: { defaultValue: { summary: 'none' } } },
    position: { control: 'select', options: ['bottom-right', 'bottom-left', 'top-right', 'top-left'] },
    shape: { control: 'select', options: ['circle', 'square'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    pulse: { control: 'boolean' },
    includeBackTop: { control: 'boolean' },
  },
};

const frame = (content, height = 360) => html`
  <div style="position: relative; transform: translateZ(0); border: 1px dashed var(--hui-border); border-radius: 12px; overflow: hidden;">
    <div style="height: ${height}px; padding: 16px; color: var(--hui-text-muted);">Khung demo (cụm nút cố định ở góc khung)</div>
    ${content}
  </div>
`;

const channel = (el, ch) => el.shadowRoot.querySelector(`[data-channel="${ch}"]`);
const hrefOf = (el, ch) => channel(el, ch).shadowRoot.querySelector('a').getAttribute('href');

/** Đủ 4 kênh, pulse trên nút gọi — Controls đổi trigger, vị trí, hình dạng... */
export const Default = {
  args: {
    phone: '0909 123 456', zalo: '0909123456', messenger: 'huiteam', email: 'hello@example.com',
    trigger: 'none', position: 'bottom-right', shape: 'circle', size: 'lg', pulse: true, includeBackTop: false,
  },
  render: (args) => frame(html`
    <hui-contact-float
      id="cf-default"
      phone=${args.phone}
      zalo=${args.zalo}
      messenger=${args.messenger}
      email=${args.email}
      trigger=${args.trigger}
      position=${args.position}
      shape=${args.shape}
      size=${args.size}
      ?pulse=${args.pulse}
      ?include-back-top=${args.includeBackTop}
    ></hui-contact-float>
  `),
  // Kiểm thử: liên kết đúng định dạng từng kênh, tooltip/aria-label, pulse trên nút gọi
  play: async ({ canvasElement }) => {
    const cf = canvasElement.querySelector('#cf-default');
    await expect(hrefOf(cf, 'phone')).toBe('tel:0909123456');
    await expect(hrefOf(cf, 'zalo')).toBe('https://zalo.me/0909123456');
    await expect(hrefOf(cf, 'messenger')).toBe('https://m.me/huiteam');
    await expect(hrefOf(cf, 'email')).toBe('mailto:hello@example.com');

    const zaloLink = channel(cf, 'zalo').shadowRoot.querySelector('a');
    await expect(zaloLink.getAttribute('target')).toBe('_blank');
    await expect(zaloLink.getAttribute('rel')).toBe('noopener noreferrer');
    await expect(channel(cf, 'phone').shadowRoot.querySelector('a').getAttribute('aria-label')).toBe('Gọi 0909 123 456');
    await expect(channel(cf, 'phone').hasAttribute('pulse')).toBe(true);
    await expect(channel(cf, 'zalo').hasAttribute('pulse')).toBe(false);
    await expect(channel(cf, 'phone').getAttribute('icon')).toBe('phone');
  },
};

/** Chỉ một số kênh: kênh không khai báo bị ẩn */
export const SomeChannels = {
  render: () => frame(html`<hui-contact-float id="cf-some" phone="1900 1234" zalo="0909123456"></hui-contact-float>`, 220),
  play: async ({ canvasElement }) => {
    const cf = canvasElement.querySelector('#cf-some');
    await expect(channel(cf, 'phone').hidden).toBe(false);
    await expect(channel(cf, 'messenger').hidden).toBe(true);
    await expect(channel(cf, 'email').hidden).toBe(true);
    await expect(hrefOf(cf, 'phone')).toBe('tel:19001234');
  },
};

/** Gom vào nút chính (`trigger="click"`), pulse chuyển sang nút chính */
export const Collapsed = {
  render: () => frame(html`
    <hui-contact-float id="cf-click" trigger="click" pulse phone="0909123456" zalo="0909123456" messenger="huiteam" email="hello@example.com"></hui-contact-float>
  `),
  play: async ({ canvasElement }) => {
    const cf = canvasElement.querySelector('#cf-click');
    const group = cf.shadowRoot.querySelector('hui-float-group');
    const toggle = group.shadowRoot.querySelector('[part="toggle"]');
    await expect(group.hasAttribute('pulse')).toBe(true);
    await expect(toggle.getAttribute('aria-label')).toBe('Liên hệ');

    toggle.click();
    await waitFor(() => expect(group.open).toBe(true));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(group.open).toBe(false));
  },
};

/** Kèm nút lên đầu trang (nằm ở đầu cụm) + vị trí bên trái */
export const WithBackTop = {
  render: () => frame(html`
    <hui-contact-float id="cf-backtop" position="bottom-left" size="md" include-back-top phone="0909123456" email="hello@example.com"></hui-contact-float>
  `, 260),
  play: async ({ canvasElement }) => {
    const cf = canvasElement.querySelector('#cf-backtop');
    const backTop = cf.shadowRoot.querySelector('hui-back-top');
    await expect(backTop).not.toBe(null);
    await expect(backTop.hasAttribute('inline')).toBe(true);
    // Nút lên đầu trang đứng đầu cụm (xa góc nhất) → hiện/ẩn không làm xê dịch các nút kênh
    await expect(cf.shadowRoot.querySelector('hui-float-group').firstElementChild).toBe(backTop);
  },
};

/** Logo riêng của dự án: registerIcon('<tên>', svg) rồi đặt zalo-icon / messenger-icon */
export const CustomBrandIcon = {
  render: () => frame(html`
    <hui-contact-float id="cf-brand" zalo="0909123456" zalo-icon="demo-brand" messenger="huiteam" messenger-icon="demo-brand"></hui-contact-float>
  `, 200),
  play: async ({ canvasElement }) => {
    const cf = canvasElement.querySelector('#cf-brand');
    await expect(channel(cf, 'zalo').getAttribute('icon')).toBe('demo-brand');
  },
};

/** Override từ bên ngoài — màu từng kênh + biến của float-group/button + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cf-brand {
        --hui-contact-float-phone-bg: var(--hui-danger);
        --hui-contact-float-zalo-bg: #0068ff;
        --hui-contact-float-zalo-color: #ffffff;
        --hui-float-group-gap: 12px;
        --hui-float-button-size: 56px;
      }
      .cf-brand hui-contact-float::part(button-email) { display: none; }
      .cf-brand hui-contact-float::part(button) { --hui-float-button-shadow: 0 6px 16px rgba(0, 0, 0, 0.18); }
    </style>
    <div class="cf-brand">
      ${frame(html`<hui-contact-float pulse phone="0909123456" zalo="0909123456" email="hello@example.com" shape="square"></hui-contact-float>`)}
    </div>
  `,
};
