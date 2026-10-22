/**
 * Storybook Stories — HUI Mega Menu (Organism)
 * Menu xổ lớn nhiều cột cho navbar: hover intent, click, bàn phím (APG disclosure navigation), accordion trên mobile.
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

const svgImage = (label, hue = 230) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 80% 62%)"/><stop offset="1" stop-color="hsl(${hue + 40} 75% 45%)"/></linearGradient></defs>
    <rect width="640" height="360" fill="url(#g)"/><circle cx="520" cy="80" r="120" fill="rgb(255 255 255 / .15)"/>
    <text x="40" y="320" font-family="sans-serif" font-size="44" font-weight="700" fill="#fff">${label}</text></svg>`,
)}`;

const ITEMS = [
  {
    key: 'products',
    label: 'Sản phẩm',
    columns: [
      {
        title: 'Bán hàng',
        links: [
          { label: 'Cửa hàng online', href: '#shop', icon: 'cart', description: 'Website bán hàng có giỏ hàng, thanh toán' },
          { label: 'Quản lý kho', href: '#stock', icon: 'grid', description: 'Tồn kho nhiều chi nhánh theo thời gian thực' },
          { label: 'Vận chuyển', href: '#ship', icon: 'truck', description: 'Kết nối GHN, GHTK, Viettel Post', badge: 'Mới' },
        ],
      },
      {
        title: 'Marketing',
        links: [
          { label: 'Email & SMS', href: '#mail', icon: 'mail', description: 'Chiến dịch tự động theo hành vi' },
          { label: 'Mã giảm giá', href: '#coupon', icon: 'tag', description: 'Voucher, flash sale, combo' },
          { label: 'Chat đa kênh', href: '#chat', icon: 'chat', description: 'Zalo, Messenger trong một hộp thư' },
        ],
      },
    ],
    featured: {
      image: svgImage('Ra mắt 2026'), title: 'H-UI Commerce 2.0',
      description: 'Bộ giao diện cửa hàng dựng sẵn, tải trang dưới 1 giây.', href: '#launch', cta: 'Xem ngay',
    },
    footer: { label: 'Xem tất cả sản phẩm', href: '#all' },
  },
  {
    key: 'solutions',
    label: 'Giải pháp',
    columns: [
      { title: 'Theo ngành', links: [{ label: 'Thời trang', href: '#fashion', icon: 'heart' }, { label: 'Mỹ phẩm', href: '#beauty', icon: 'star' }, { label: 'Điện máy', href: '#electronic', icon: 'monitor' }] },
      { title: 'Theo quy mô', links: [{ label: 'Cửa hàng nhỏ', href: '#small', icon: 'home' }, { label: 'Chuỗi bán lẻ', href: '#chain', icon: 'table' }] },
      { title: 'Hỗ trợ', links: [{ label: 'Trung tâm trợ giúp', href: '#help', icon: 'info' }, { label: 'Liên hệ', href: '#contact', icon: 'phone' }] },
    ],
  },
  { key: 'pricing', label: 'Bảng giá', href: '#pricing' },
  { key: 'blog', label: 'Blog', href: '#blog' },
];

const triggers = (mm) => [...mm.shadowRoot.querySelectorAll('[part="trigger"]')];
const panelOf = (mm, trigger) => mm.shadowRoot.getElementById(trigger.getAttribute('aria-controls'));
const hover = (el, type) => el.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse', bubbles: false }));

const bar = (content) => html`
  <div style="min-height: 520px;">
    <div style="display: flex; align-items: center; gap: 24px; padding: 0 16px; border-bottom: 1px solid var(--hui-border); background: var(--hui-bg-container);">
      <strong style="color: var(--hui-primary)">H-UI</strong>
      ${content}
    </div>
  </div>
`;

export default {
  title: 'Organisms/HuiMegaMenu',
  component: 'hui-mega-menu',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Mega Menu** — menu xổ lớn nhiều cột cho navbar. Mở bằng hover (có trễ chống mở nhầm), click hoặc bàn phím;
viewport hẹp hơn \`breakpoint\` → accordion.

\`\`\`html
<hui-mega-menu id="mm" full-width></hui-mega-menu>
<script>
  mm.items = [
    { key: 'products', label: 'Sản phẩm',
      columns: [{ title: 'Bán hàng', links: [{ label: 'Cửa hàng', href: '/shop', icon: 'cart', description: '…', badge: 'Mới' }] }],
      featured: { image: '/promo.jpg', title: 'Ra mắt', description: '…', href: '/launch', cta: 'Xem ngay' },
      footer: { label: 'Xem tất cả', href: '/products' } },
    { key: 'pricing', label: 'Bảng giá', href: '/pricing' },
  ];
</script>

<!-- Hoặc nội dung slot: mỗi phần tử con có data-label là một panel -->
<hui-mega-menu>
  <div data-label="Tài nguyên" data-key="res">…HTML tùy ý…</div>
  <a href="/blog" data-label="Blog">Blog</a>
</hui-mega-menu>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`items\` | JSON array | — | Mục menu (xem trên); bỏ trống = dùng slot |
| \`open-key\` | string | \`''\` | Key panel đang mở |
| \`open-delay\` / \`close-delay\` | number | \`120\` / \`200\` | Trễ mở / đóng khi rê chuột (ms) |
| \`layout\` | string | \`'auto'\` | \`auto\` / \`horizontal\` / \`accordion\` |
| \`breakpoint\` | number | \`768\` | Ngưỡng viewport chuyển accordion (layout auto) |
| \`full-width\` | boolean | \`false\` | Panel phủ cả bề ngang màn hình (fixed dưới menu) |
| \`label\` | string | theo locale | \`aria-label\` của \`<nav>\` |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Methods
\`show(key)\`, \`hide()\`

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-open\` | \`{ key }\` | Panel mở |
| \`hui-close\` | \`{ key }\` | Panel đóng |
| \`hui-select\` | \`{ key, link }\` | Bấm link trong panel dữ liệu (không chặn điều hướng) |

### Slots
_(default)_ phần tử con có \`data-label\` (+ \`data-key\`, \`data-icon\`) → panel; \`<a href data-label>\` → link thường.
\`featured-<key>\` — khối nổi bật tùy biến cho panel dữ liệu \`key\`.

### Parts
\`base\`, \`list\`, \`item\`, \`trigger\`, \`top-link\`, \`arrow\`, \`panel\`, \`panel-inner\`, \`columns\`, \`group\`, \`group-title\`,
\`link\`, \`link-icon\`, \`link-label\`, \`link-description\`, \`badge\`, \`featured\`, \`featured-image\`, \`panel-footer\`

### CSS Variables
\`--hui-mega-menu-color\`, \`-hover-color\`, \`-item-padding\`, \`-item-height\`, \`-panel-bg\`, \`-panel-shadow\`, \`-panel-radius\`,
\`-panel-padding\`, \`-panel-width\`, \`-panel-max-width\`, \`-column-min-width\` (200px), \`-gap\`, \`-link-hover-bg\`, \`-icon-color\`,
\`-icon-bg\`, \`-featured-bg\`, \`-featured-width\` (280px), \`-z-index\`

### Bàn phím (APG disclosure navigation)
| Phím | Hành động |
|------|-----------|
| \`Enter\` / \`Space\` | Mở / đóng panel của nút |
| \`←\` / \`→\` (accordion: \`↑\` / \`↓\`) | Chuyển giữa các mục trên cùng |
| \`Home\` / \`End\` | Mục đầu / cuối |
| \`↓\` trên nút (ngang) | Mở panel và vào link đầu tiên |
| \`↑\` / \`↓\` trong panel | Link trước / sau (\`↑\` ở link đầu → về nút) |
| \`Esc\` | Đóng panel, focus về nút |
| \`Tab\` | Đi tiếp như bình thường; rời menu → panel đóng |

Nút có \`aria-expanded\` + \`aria-controls\`; nhóm link có \`aria-labelledby\` tiêu đề nhóm. Hover chỉ áp dụng chuột (cảm ứng dùng chạm).
        `,
      },
    },
  },
};

export const Default = {
  render: () => bar(html`<hui-mega-menu layout="horizontal" .items=${ITEMS}></hui-mega-menu>`),
  play: async ({ canvasElement }) => {
    const mm = canvasElement.querySelector('hui-mega-menu');
    await mm.updateComplete;
    const [products, solutions] = triggers(mm);
    await expect(triggers(mm).length).toBe(2);
    await expect(mm.shadowRoot.querySelectorAll('[part="top-link"]').length).toBe(2);
    await expect(products.getAttribute('aria-expanded')).toBe('false');
    await expect(panelOf(mm, products).hidden).toBe(true);

    // Click mở / đóng
    const opened = [];
    mm.addEventListener('hui-open', (e) => opened.push(e.detail.key));
    await userEvent.click(products);
    await expect(products.getAttribute('aria-expanded')).toBe('true');
    await expect(mm.openKey).toBe('products');
    await expect(panelOf(mm, products).hidden).toBe(false);
    await expect(opened).toEqual(['products']);

    // Click link → hui-select (không điều hướng trong story)
    let selected = null;
    mm.addEventListener('hui-select', (e) => { e.preventDefault(); selected = e.detail; }, { once: true });
    const link = panelOf(mm, products).querySelector('[part="link"]');
    link.addEventListener('click', (e) => e.preventDefault(), { once: true });
    link.click();
    await expect(selected.key).toBe('products');
    await expect(selected.link.label).toBe('Cửa hàng online');

    // Mở mục khác → panel cũ ẩn ngay
    await userEvent.click(solutions);
    await expect(panelOf(mm, products).hidden).toBe(true);
    await expect(solutions.getAttribute('aria-expanded')).toBe('true');

    // Click ra ngoài → đóng
    await userEvent.click(canvasElement.querySelector('strong'));
    await expect(mm.openKey).toBe('');
    await expect(solutions.getAttribute('aria-expanded')).toBe('false');
  },
};

export const HoverIntent = {
  name: 'Hover có trễ (intent)',
  render: () => bar(html`<hui-mega-menu layout="horizontal" open-delay="150" close-delay="150" no-animation .items=${ITEMS}></hui-mega-menu>`),
  play: async ({ canvasElement }) => {
    const mm = canvasElement.querySelector('hui-mega-menu');
    await mm.updateComplete;
    const [products, solutions] = triggers(mm);
    const liA = products.parentElement;
    const liB = solutions.parentElement;

    // Rê qua rất nhanh (< open-delay) → không mở
    hover(liA, 'pointerenter');
    await new Promise((r) => setTimeout(r, 60));
    hover(liA, 'pointerleave');
    await new Promise((r) => setTimeout(r, 200));
    await expect(mm.openKey).toBe('');

    // Dừng lại đủ lâu → mở
    hover(liA, 'pointerenter');
    await waitFor(() => expect(mm.openKey).toBe('products'));
    // Click ngay sau khi hover mở → không đóng nhầm
    products.click();
    await expect(mm.openKey).toBe('products');

    // Đã có panel mở → chuyển sang mục khác nhanh
    hover(liA, 'pointerleave');
    hover(liB, 'pointerenter');
    await waitFor(() => expect(mm.openKey).toBe('solutions'));

    // Rời hẳn → đóng sau close-delay
    hover(liB, 'pointerleave');
    await expect(mm.openKey).toBe('solutions');
    await waitFor(() => expect(mm.openKey).toBe(''));
  },
};

export const Keyboard = {
  name: 'Bàn phím',
  render: () => bar(html`<hui-mega-menu layout="horizontal" no-animation .items=${ITEMS}></hui-mega-menu>`),
  play: async ({ canvasElement }) => {
    const mm = canvasElement.querySelector('hui-mega-menu');
    await mm.updateComplete;
    const [products, solutions] = triggers(mm);
    const active = () => mm.shadowRoot.activeElement;

    products.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(active()).toBe(solutions);
    await userEvent.keyboard('{End}');
    await expect(active().textContent).toBe('Blog');
    await userEvent.keyboard('{ArrowRight}'); // vòng về đầu
    await expect(active()).toBe(products);

    // ↓ mở panel và vào link đầu
    await userEvent.keyboard('{ArrowDown}');
    await expect(mm.openKey).toBe('products');
    const links = [...panelOf(mm, products).querySelectorAll('a')];
    await waitFor(() => expect(active()).toBe(links[0]));
    await userEvent.keyboard('{ArrowDown}');
    await expect(active()).toBe(links[1]);
    await userEvent.keyboard('{End}');
    await expect(active()).toBe(links[links.length - 1]);
    await userEvent.keyboard('{Home}');
    await userEvent.keyboard('{ArrowUp}'); // về nút
    await expect(active()).toBe(products);

    // Esc trong panel → đóng, focus về nút
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(active()).toBe(links[0]));
    await userEvent.keyboard('{Escape}');
    await expect(mm.openKey).toBe('');
    await expect(active()).toBe(products);

    // Enter mở / đóng
    await userEvent.keyboard('{Enter}');
    await expect(mm.openKey).toBe('products');
    await userEvent.keyboard('{Enter}');
    await expect(mm.openKey).toBe('');
  },
};

export const Accordion = {
  name: 'Accordion (mobile)',
  render: () => html`
    <div style="max-width: 380px; border: 1px solid var(--hui-border); border-radius: 12px; padding: 8px 12px;">
      <hui-mega-menu layout="accordion" .items=${ITEMS}></hui-mega-menu>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const mm = canvasElement.querySelector('hui-mega-menu');
    await mm.updateComplete;
    const [products, solutions] = triggers(mm);
    await expect(mm.shadowRoot.querySelector('.mm--accordion')).toBeTruthy();
    // Hover không mở ở accordion
    hover(products.parentElement, 'pointerenter');
    await new Promise((r) => setTimeout(r, 200));
    await expect(mm.openKey).toBe('');

    await userEvent.click(products);
    await expect(mm.openKey).toBe('products');
    // Panel nằm trong luồng (không nổi)
    await expect(getComputedStyle(panelOf(mm, products)).position).toBe('static');
    // ↓ ở accordion chuyển sang nút kế
    products.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(mm.shadowRoot.activeElement).toBe(solutions);
    await userEvent.click(solutions);
    await expect(mm.openKey).toBe('solutions');
    await waitFor(() => expect(panelOf(mm, products).hidden).toBe(true));
  },
};

export const SlottedContent = {
  name: 'Nội dung slot',
  render: () => bar(html`
    <hui-mega-menu layout="horizontal" style="--hui-mega-menu-panel-width: 560px;">
      <div data-label="Tài nguyên" data-key="resources" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <a href="#docs" style="color: var(--hui-text)">📘 Tài liệu</a>
        <a href="#api" style="color: var(--hui-text)">🧩 API</a>
        <a href="#community" style="color: var(--hui-text)">💬 Cộng đồng</a>
        <a href="#changelog" style="color: var(--hui-text)">📝 Nhật ký thay đổi</a>
      </div>
      <a href="#about" data-label="Giới thiệu"></a>
    </hui-mega-menu>
  `),
  play: async ({ canvasElement }) => {
    const mm = canvasElement.querySelector('hui-mega-menu');
    await mm.updateComplete;
    const [trigger] = triggers(mm);
    await expect(triggers(mm).length).toBe(1);
    await expect(trigger.textContent).toContain('Tài nguyên');
    const panelDiv = mm.querySelector('[data-key="resources"]');
    await expect(panelDiv.slot).toBe('panel-resources');
    await userEvent.click(trigger);
    await expect(panelDiv.assignedSlot.closest('[part="panel"]').hidden).toBe(false);
    await expect(mm.querySelector('a[data-label]').slot).toBe('link-1');
  },
};

export const FullWidthWithFeaturedSlot = {
  name: 'Full width + slot featured',
  render: () => bar(html`
    <hui-mega-menu layout="horizontal" full-width open-key="products" .items=${ITEMS}>
      <div slot="featured-products" style="height: 100%; padding: 16px; border-radius: 12px; background: var(--hui-warning-1); color: var(--hui-text);">
        <strong>Ưu đãi tháng 10</strong>
        <p style="margin: 8px 0 0; font-size: 13px;">Giảm 30% gói năm cho cửa hàng mới.</p>
      </div>
    </hui-mega-menu>
  `),
  play: async ({ canvasElement }) => {
    const mm = canvasElement.querySelector('hui-mega-menu');
    await mm.updateComplete;
    const [products] = triggers(mm);
    await waitFor(() => expect(products.getAttribute('aria-expanded')).toBe('true'));
    const panel = panelOf(mm, products);
    await expect(getComputedStyle(panel).position).toBe('fixed');
    await waitFor(() => expect(panel.style.getPropertyValue('--_mm-top')).not.toBe(''));
    mm.hide();
  },
};

export const CustomizeFromOutside = {
  render: () => bar(html`
    <style>
      .brand-mm {
        --hui-mega-menu-hover-color: var(--hui-success);
        --hui-mega-menu-panel-radius: 0 0 20px 20px;
        --hui-mega-menu-icon-bg: var(--hui-success-1);
        --hui-mega-menu-icon-color: var(--hui-success);
        --hui-mega-menu-column-min-width: 180px;
        --hui-mega-menu-featured-width: 240px;
      }
      .brand-mm::part(group-title) { color: var(--hui-success); }
      .brand-mm::part(link-icon) { border-radius: 50%; }
    </style>
    <hui-mega-menu class="brand-mm" layout="horizontal" .items=${ITEMS}></hui-mega-menu>
  `),
};
