/**
 * Storybook Stories — HUI Bottom Nav (Molecule)
 * Thanh điều hướng đáy cho mobile: icon nhún khi chọn, badge, safe-area, ẩn khi cuộn xuống.
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

const ITEMS = [
  { value: 'home', label: 'Trang chủ', icon: 'home' },
  { value: 'search', label: 'Tìm kiếm', icon: 'search' },
  { value: 'cart', label: 'Giỏ hàng', icon: 'cart', badge: 3 },
  { value: 'wishlist', label: 'Yêu thích', icon: 'heart', dot: true },
  { value: 'account', label: 'Tài khoản', icon: 'user' },
];

/** Khung điện thoại: transform → thanh position:fixed nằm ở đáy khung */
const phone = (content, id = '') => html`
  <div style="position: relative; width: 360px; height: 560px; transform: translateZ(0); overflow: hidden;
    border: 1px solid var(--hui-border); border-radius: 28px; background: var(--hui-bg-secondary);">
    <div id=${id || 'scroller'} style="height: 100%; overflow: auto; padding: 16px 16px 88px; box-sizing: border-box;">
      ${Array.from({ length: 14 }, (_, i) => html`
        <div style="height: 72px; margin-bottom: 12px; border-radius: 12px; background: var(--hui-bg-container); border: 1px solid var(--hui-border-secondary); padding: 12px; color: var(--hui-text-secondary);">Bài viết ${i + 1}</div>`)}
    </div>
    ${content}
  </div>
`;

const items = (nav) => [...nav.shadowRoot.querySelectorAll('[part="item"]')];

export default {
  title: 'Molecules/HuiBottomNav',
  component: 'hui-bottom-nav',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Bottom Nav** — thanh điều hướng đáy cho mobile.

\`\`\`html
<hui-bottom-nav id="nav" value="home" hide-on-scroll hide-above="768"></hui-bottom-nav>
<script>
  nav.items = [
    { value: 'home', label: 'Trang chủ', icon: 'home', href: '/' },
    { value: 'cart', label: 'Giỏ hàng', icon: 'cart', href: '/cart', badge: 3 },
    { value: 'me', label: 'Tài khoản', icon: 'user', dot: true },
  ];
  nav.addEventListener('hui-change', (e) => console.log(e.detail.value));
</script>
<style>body { padding-bottom: calc(64px + env(safe-area-inset-bottom)); }</style>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`items\` | JSON array | \`[]\` | \`[{ value, label, icon, href, badge, dot, disabled }]\` |
| \`value\` | string | mục đầu | Mục đang chọn |
| \`labels\` | string | \`'always'\` | \`always\` / \`selected\` (chỉ mục chọn hiện nhãn) |
| \`position\` | string | \`'fixed'\` | \`fixed\` (đáy màn hình) / \`static\` |
| \`hide-on-scroll\` | boolean | \`false\` | Ẩn khi cuộn xuống, hiện khi cuộn lên |
| \`scroll-target\` | string | window | Selector phần tử cuộn để theo dõi |
| \`hide-above\` | number | \`0\` | Viewport rộng hơn (px) → ẩn hẳn (0 = luôn hiện) |
| \`label\` | string | theo locale | \`aria-label\` của \`<nav>\` |
| \`no-animation\` | boolean | \`false\` | Tắt nhún / trượt |

### Properties
\`selectedItem\` — mục đang chọn.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-change\` | \`{ value, previous, item }\` | Cancelable — \`preventDefault()\` giữ mục cũ và chặn điều hướng của link |

### Parts
\`base\`, \`list\`, \`item\`, \`indicator\`, \`icon\`, \`badge\`, \`label\`

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-bottom-nav-bg\` | \`--hui-bg-elevated\` | Nền |
| \`--hui-bottom-nav-color\` | \`--hui-text-secondary\` | Mục thường |
| \`--hui-bottom-nav-active-color\` | \`--hui-primary\` | Mục chọn |
| \`--hui-bottom-nav-indicator-bg\` | \`--hui-primary-1\` | Viên thuốc sau icon |
| \`--hui-bottom-nav-height\` | 64px | Chiều cao (chưa gồm safe-area) |
| \`--hui-bottom-nav-icon-size\` | 1.375rem | Cỡ icon |
| \`--hui-bottom-nav-font-size\` | \`--hui-font-xs\` | Cỡ nhãn |
| \`--hui-bottom-nav-border-color\` | \`--hui-border-secondary\` | Viền trên |
| \`--hui-bottom-nav-shadow\` | bóng nhẹ phía trên | Đổ bóng |
| \`--hui-bottom-nav-max-width\` | 640px | Rộng tối đa hàng mục |
| \`--hui-bottom-nav-z-index\` | \`--hui-z-sticky\` | z-index |

### Bàn phím & trợ năng
\`Tab\` đi qua từng mục, \`Enter\` (link) / \`Enter\`·\`Space\` (nút) để chọn. Mục chọn có \`aria-current\` (\`page\` với link).
Badge đọc kèm nhãn ("Giỏ hàng 3"). Focus vào thanh khi đang ẩn do cuộn → hiện lại. Ẩn khi in trang.
        `,
      },
    },
  },
  argTypes: {
    labels: { control: 'inline-radio', options: ['always', 'selected'] },
  },
};

export const Default = {
  render: (args) => phone(html`<hui-bottom-nav .items=${ITEMS} value="home" labels=${args.labels}></hui-bottom-nav>`),
  args: { labels: 'always' },
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector('hui-bottom-nav');
    await nav.updateComplete;
    const els = items(nav);
    await expect(els.length).toBe(5);
    await expect(els[0].getAttribute('aria-current')).toBe('true');
    await expect(nav.shadowRoot.querySelector('[part="base"]').getAttribute('aria-label')).toBeTruthy();
    // Badge số + chấm
    await expect(els[2].querySelector('hui-badge').getAttribute('count')).toBe('3');
    await expect(els[3].querySelector('hui-badge').hasAttribute('dot')).toBe(true);

    let detail = null;
    nav.addEventListener('hui-change', (e) => { detail = e.detail; }, { once: true });
    await userEvent.click(els[2]);
    await expect(detail).toMatchObject({ value: 'cart', previous: 'home' });
    await expect(nav.value).toBe('cart');
    await nav.updateComplete;
    await expect(els[2].getAttribute('aria-current')).toBe('true');
    await expect(els[0].hasAttribute('aria-current')).toBe(false);
    await expect(nav.selectedItem.label).toBe('Giỏ hàng');
  },
};

export const LabelsSelected = {
  name: 'Chỉ hiện nhãn mục chọn',
  render: () => phone(html`<hui-bottom-nav .items=${ITEMS} value="search" labels="selected"></hui-bottom-nav>`),
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector('hui-bottom-nav');
    await nav.updateComplete;
    const [home, search] = items(nav);
    await expect(getComputedStyle(home.querySelector('[part="label"]')).position).toBe('absolute');
    await expect(getComputedStyle(search.querySelector('[part="label"]')).position).toBe('static');
  },
};

export const Cancelable = {
  name: 'Chặn đổi mục (preventDefault)',
  render: () => phone(html`<hui-bottom-nav .items=${[...ITEMS.slice(0, 4), { value: 'off', label: 'Bảo trì', icon: 'settings', disabled: true }]}></hui-bottom-nav>`),
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector('hui-bottom-nav');
    await nav.updateComplete;
    await expect(nav.value).toBe('home'); // mặc định mục đầu
    nav.addEventListener('hui-change', (e) => { if (e.detail.value === 'account') e.preventDefault(); });
    const els = items(nav);
    els[1].click();
    await expect(nav.value).toBe('search');
    // Mục disabled: không chọn được
    els[4].click();
    await expect(nav.value).toBe('search');
    await expect(els[4].disabled).toBe(true);
  },
};

export const HideOnScroll = {
  name: 'Ẩn khi cuộn xuống',
  render: () => phone(html`<hui-bottom-nav .items=${ITEMS} hide-on-scroll scroll-target="#feed"></hui-bottom-nav>`, 'feed'),
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector('hui-bottom-nav');
    await nav.updateComplete;
    const base = nav.shadowRoot.querySelector('[part="base"]');
    const feed = canvasElement.querySelector('#feed');
    feed.scrollTop = 0;
    await new Promise((r) => requestAnimationFrame(r));
    feed.scrollTop = 300;
    await waitFor(() => expect(base.classList.contains('bn--scroll-hidden')).toBe(true));
    feed.scrollTop = 150;
    await waitFor(() => expect(base.classList.contains('bn--scroll-hidden')).toBe(false));
    feed.scrollTop = 400;
    await waitFor(() => expect(base.classList.contains('bn--scroll-hidden')).toBe(true));
    // Focus bàn phím → hiện lại
    items(nav)[0].focus();
    await expect(base.classList.contains('bn--scroll-hidden')).toBe(false);
    feed.scrollTop = 0;
  },
};

export const Static = {
  name: 'position="static"',
  render: () => html`
    <div style="max-width: 420px; border: 1px solid var(--hui-border); border-radius: 12px; overflow: hidden;">
      <div style="padding: 24px; color: var(--hui-text-secondary);">Thanh nằm trong luồng của khung</div>
      <hui-bottom-nav position="static" value="cart" .items=${ITEMS.slice(0, 4)}></hui-bottom-nav>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-nav {
        --hui-bottom-nav-bg: var(--hui-primary-9);
        --hui-bottom-nav-color: rgb(255 255 255 / 0.7);
        --hui-bottom-nav-active-color: var(--hui-text-light-solid);
        --hui-bottom-nav-indicator-bg: rgb(255 255 255 / 0.18);
        --hui-bottom-nav-height: 72px;
        --hui-bottom-nav-icon-size: 1.5rem;
        --hui-bottom-nav-border-color: transparent;
      }
      .brand-nav::part(base) { margin: 0 12px 12px; border-radius: 24px; }
      .brand-nav::part(label) { letter-spacing: 0.02em; }
    </style>
    ${phone(html`<hui-bottom-nav class="brand-nav" .items=${ITEMS.slice(0, 4)} value="search"></hui-bottom-nav>`)}
  `,
};
