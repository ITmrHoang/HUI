/**
 * Storybook Stories — HUI Navbar
 * Thanh điều hướng website: logo, link / hui-menu ngang, actions, sticky, trong suốt ở đầu trang, hamburger trên mobile.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';
import '../hui-menu/index.js';

const links = () => html`
  <a href="#" aria-current="page">Trang chủ</a>
  <a href="#">Sản phẩm</a>
  <a href="#">Bảng giá</a>
  <a href="#">Tài liệu</a>
  <a href="#">Blog</a>
`;
const logo = () => html`<a slot="logo" href="#">◆ HUI</a>`;
const actions = () => html`
  <hui-button slot="actions" variant="text" size="sm">Đăng nhập</hui-button>
  <hui-button slot="actions" size="sm">Dùng thử</hui-button>
`;

export default {
  title: 'Components/HuiNavbar',
  component: 'hui-navbar',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**HUI Navbar** — Thanh điều hướng đầu trang cho website (MUI AppBar + Ant Layout.Header).
Khi chiều rộng navbar < \`breakpoint\`, vùng nav thu vào nút hamburger và mở thành panel full-width ngay dưới thanh
(cùng một khung chứa slot — nội dung không bị nhân đôi). \`<hui-menu mode="horizontal">\` trong nav tự chuyển sang
\`inline\` ở mobile và trả lại mode cũ ở desktop.

\`\`\`html
<hui-navbar sticky transparent-on-top>
  <a slot="logo" href="/">Brand</a>
  <a href="/docs">Tài liệu</a>
  <a href="/blog">Blog</a>
  <hui-button slot="actions">Đăng nhập</hui-button>
</hui-navbar>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`sticky\` | boolean | \`false\` | Dính đầu trang khi cuộn |
| \`transparent-on-top\` | boolean | \`false\` | Nền trong suốt ở đầu trang; cuộn > 8px → nền đặc + bóng |
| \`breakpoint\` | number | \`768\` | Chiều rộng (px) dưới mức này → hamburger |
| \`open\` | boolean | \`false\` | Panel mobile đang mở (tự phản chiếu) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`open-change\` | \`{ open }\` | Panel mobile mở / đóng do người dùng |

### Slots
| Slot | Mô tả |
|------|-------|
| \`logo\` | Logo / tên thương hiệu |
| _(default)_ | Link điều hướng hoặc \`<hui-menu mode="horizontal">\` |
| \`actions\` | Nút bên phải (luôn hiện) |

### Bàn phím & ARIA
| Phím | Hành động |
|------|-----------|
| \`Enter\` / \`Space\` trên hamburger | Mở / đóng panel (\`aria-expanded\`, \`aria-controls\`) |
| \`Esc\` | Đóng panel, focus về hamburger |
| Click ra ngoài / bấm link trong panel | Đóng panel |

Panel đóng thì nav có \`hidden\` (không Tab vào được). Vùng nav là \`<nav aria-label>\`.

### Parts
\`base\` (header), \`inner\`, \`logo\`, \`nav\`, \`actions\`, \`toggle\`. State: \`:state(mobile)\`, \`:state(scrolled)\`, \`:state(open)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-navbar-height\` | Chiều cao (64px) |
| \`--hui-navbar-bg\` / \`--hui-navbar-color\` / \`--hui-navbar-border-color\` | Nền, chữ, viền dưới |
| \`--hui-navbar-shadow\` | Bóng khi đã cuộn |
| \`--hui-navbar-max-width\` / \`--hui-navbar-padding-x\` / \`--hui-navbar-gap\` | Bố cục |
| \`--hui-navbar-link-color\` / \`--hui-navbar-link-hover-color\` | Link |
| \`--hui-navbar-panel-bg\` / \`--hui-navbar-panel-shadow\` | Panel mobile |
| \`--hui-navbar-z-index\` | z-index khi sticky |
        `,
      },
    },
  },
  argTypes: {
    sticky: { control: 'boolean' },
    'transparent-on-top': { control: 'boolean' },
    breakpoint: { control: 'number' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-navbar ?sticky=${args.sticky} ?transparent-on-top=${args['transparent-on-top']} breakpoint=${args.breakpoint}
      @open-change=${(e) => console.log('[hui-navbar] open-change', e.detail)}>
      ${logo()}${links()}${actions()}
    </hui-navbar>
    <div style="padding: 24px; height: 120vh; color: var(--hui-text-secondary);">Nội dung trang…</div>
  `,
  args: { sticky: true, 'transparent-on-top': false, breakpoint: 768 },
};

/** Nav là một hui-menu ngang (tự chuyển inline khi thu vào hamburger). */
export const WithMenu = {
  render: () => html`
    <hui-navbar>
      ${logo()}
      <hui-menu mode="horizontal" selected-keys="home" style="--hui-menu-border-color: transparent; --hui-menu-bg: transparent;">
        <hui-menu-item key="home">Trang chủ</hui-menu-item>
        <hui-sub-menu key="products" label="Sản phẩm">
          <hui-menu-item key="ui">HUI Library</hui-menu-item>
          <hui-menu-item key="admin">Admin Template</hui-menu-item>
        </hui-sub-menu>
        <hui-menu-item key="pricing">Bảng giá</hui-menu-item>
      </hui-menu>
      ${actions()}
    </hui-navbar>
    <div style="height: 240px;"></div>
  `,
};

/**
 * Mobile (khung hẹp 420px): nav ẩn sau hamburger; bấm để mở panel, Esc / bấm lại để đóng.
 */
export const Mobile = {
  render: () => html`
    <div style="width: 420px; border: 1px dashed var(--hui-border);">
      <hui-navbar id="nav-mobile">${logo()}${links()}${actions()}</hui-navbar>
      <div style="height: 320px; padding: 16px; color: var(--hui-text-secondary);">Nội dung…</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector('#nav-mobile');
    const toggle = nav.shadowRoot.querySelector('[part="toggle"]');
    const panel = nav.shadowRoot.querySelector('[part="nav"]');
    const events = [];
    nav.addEventListener('open-change', (e) => events.push(e.detail.open));

    await waitFor(() => expect(toggle.hidden).toBe(false));
    await expect(panel.hidden).toBe(true);
    await expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    await waitFor(() => expect(panel.hidden).toBe(false));
    await expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await expect(nav.hasAttribute('open')).toBe(true);
    await expect(getComputedStyle(panel).position).toBe('absolute');

    toggle.click();
    await waitFor(() => expect(panel.hidden).toBe(true), { timeout: 2000 });
    await expect(nav.open).toBe(false);

    // Esc đóng panel
    toggle.click();
    await waitFor(() => expect(panel.hidden).toBe(false));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(panel.hidden).toBe(true), { timeout: 2000 });
    await expect(events).toEqual([true, false, true, false]);
  },
};

/** Desktop (khung rộng): không có hamburger, nav nằm ngang. Thu hẹp khung → chuyển mobile. */
export const Responsive = {
  render: () => html`
    <div id="nav-wrap" style="width: 960px; max-width: 100%;">
      <hui-navbar id="nav-desktop">${logo()}${links()}${actions()}</hui-navbar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const wrap = canvasElement.querySelector('#nav-wrap');
    const nav = canvasElement.querySelector('#nav-desktop');
    const toggle = nav.shadowRoot.querySelector('[part="toggle"]');
    const panel = nav.shadowRoot.querySelector('[part="nav"]');
    if (wrap.getBoundingClientRect().width >= 768) {
      await waitFor(() => expect(toggle.hidden).toBe(true));
      await expect(panel.hidden).toBe(false);
    }
    wrap.style.width = '500px';
    await waitFor(() => expect(toggle.hidden).toBe(false));
    await expect(panel.hidden).toBe(true);
    wrap.style.width = '960px';
  },
};

/** Trong suốt ở đầu trang, cuộn xuống → nền đặc + bóng (đặt trên ảnh hero). */
export const TransparentOnTop = {
  render: () => html`
    <div style="background: linear-gradient(135deg, var(--hui-primary-7), var(--hui-info-6)); min-height: 140vh;">
      <hui-navbar sticky transparent-on-top style="--hui-navbar-color: var(--hui-text-light-solid); --hui-navbar-link-color: var(--hui-text-light-solid);">
        ${logo()}${links()}${actions()}
      </hui-navbar>
      <h1 style="margin: 0; padding: 120px 24px; color: var(--hui-text-light-solid);">Cuộn xuống để thấy nền đổi</h1>
    </div>
  `,
};

/** Override từ bên ngoài — biến CSS + ::part() + :state(). */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .nav-brand {
        --hui-navbar-height: 56px;
        --hui-navbar-bg: var(--hui-primary-9);
        --hui-navbar-color: var(--hui-text-light-solid);
        --hui-navbar-link-color: var(--hui-primary-2);
        --hui-navbar-link-hover-color: var(--hui-text-light-solid);
        --hui-navbar-max-width: 1100px;
      }
      .nav-brand hui-navbar::part(logo) { letter-spacing: 0.08em; }
      .nav-brand hui-navbar:state(mobile)::part(toggle) { color: var(--hui-warning); }
    </style>
    <div class="nav-brand"><hui-navbar id="nav-custom">${logo()}${links()}${actions()}</hui-navbar></div>
  `,
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector('#nav-custom');
    const inner = nav.shadowRoot.querySelector('[part="inner"]');
    await waitFor(() => expect(getComputedStyle(inner).height).toBe('56px'));
  },
};
