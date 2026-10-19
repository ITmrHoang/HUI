/**
 * Storybook Stories — HUI Layout (hui-layout, hui-header, hui-sider, hui-content, hui-footer)
 * Bố cục trang kiểu Ant Layout: header/footer, sider thu gọn được, breakpoint tự thu gọn.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { t } from '../../core/locale.js';
import './index.js';
import '../hui-button/index.js';
import '../hui-icon/index.js';

const menu = html`
  <nav style="display: flex; flex-direction: column; gap: 4px; padding: 12px 8px; font: 14px var(--hui-font-family);">
    ${[['home', 'Trang chủ'], ['user', 'Người dùng'], ['calendar', 'Lịch'], ['settings', 'Cài đặt']].map(([icon, label]) => html`
      <a href="#" style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 6px;
        color: inherit; text-decoration: none; white-space: nowrap; overflow: hidden;">
        <hui-icon name=${icon} size="18"></hui-icon><span>${label}</span>
      </a>
    `)}
  </nav>
`;

const logo = html`<strong style="font-size: 18px; white-space: nowrap;">HUI</strong>`;
const page = html`
  <div style="padding: 24px; min-height: 160px; border-radius: 8px; background: var(--hui-bg-container);">Nội dung trang</div>
`;

export default {
  title: 'Components/Layout/HuiLayout',
  component: 'hui-layout',
  subcomponents: { HuiHeader: 'hui-header', HuiSider: 'hui-sider', HuiContent: 'hui-content', HuiFooter: 'hui-footer' },
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**HUI Layout** — Khung bố cục trang (Ant Layout): \`hui-layout\`, \`hui-header\`, \`hui-sider\`, \`hui-content\`, \`hui-footer\`.
Có \`hui-sider\` là con trực tiếp → \`hui-layout\` tự xếp ngang. Lồng \`hui-layout\` để kết hợp header + sider.

\`\`\`html
<hui-layout style="min-height: 100vh">
  <hui-sider collapsible breakpoint="lg">…menu…</hui-sider>
  <hui-layout>
    <hui-header sticky>…</hui-header>
    <hui-content>…</hui-content>
    <hui-footer>© 2026</hui-footer>
  </hui-layout>
</hui-layout>
\`\`\`

### hui-layout
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`has-sider\` | boolean | tự phát hiện | Ép xếp ngang (cũng có \`:state(has-sider)\`) |

### hui-header
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`sticky\` | boolean | \`false\` | Dính trên cùng khi cuộn |

### hui-sider
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`width\` | string | \`200\` | Chiều rộng khi mở (số = px) |
| \`collapsed\` | boolean | \`false\` | Đang thu gọn (phản chiếu khi bấm nút / breakpoint) |
| \`collapsible\` | boolean | \`false\` | Hiện nút thu/mở ở đáy |
| \`collapsed-width\` | string | \`80\` | Chiều rộng khi thu gọn; \`0\` = ẩn hẳn, nút nổi bên cạnh |
| \`breakpoint\` | string | — | xs (480), sm (576), md (768), lg (992), xl (1200), xxl (1600): màn hình nhỏ hơn → tự thu gọn |
| \`reverse-arrow\` | boolean | \`false\` | Đảo mũi tên (sider bên phải) |

| Property / method | Mô tả |
|-------------------|-------|
| \`toggle()\` | Thu / mở (phát \`hui-collapse\` với \`type: 'clickTrigger'\`) |
| \`broken\` | Màn hình đang nhỏ hơn breakpoint |

### Events (hui-sider)
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-collapse\` | \`{ collapsed, type }\` | \`type\`: \`clickTrigger\` (bấm nút / toggle()) hoặc \`responsive\` (breakpoint) |
| \`hui-breakpoint\` | \`{ broken }\` | Màn hình vượt qua breakpoint |

### Slots
| Thẻ | Slot | Mô tả |
|-----|------|-------|
| hui-layout / header / content / footer | (default) | Nội dung |
| hui-sider | (default) | Nội dung thanh bên |
| hui-sider | \`trigger\` | Nội dung nút thu/mở (thay icon mũi tên) |

### Bàn phím & ARIA
- Nút thu/mở là \`<button>\`: \`Tab\` để focus, \`Enter\` / \`Space\` để bấm; có \`aria-expanded\` và \`aria-label\` theo locale (\`common.collapse\` / \`common.expand\`).

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-layout-bg\` | Nền hui-layout (\`--hui-bg-secondary\`) |
| \`--hui-header-height\` / \`--hui-header-padding-x\` / \`--hui-header-bg\` / \`--hui-header-color\` / \`--hui-header-border-color\` / \`--hui-header-shadow\` | Header |
| \`--hui-sider-width\` / \`--hui-sider-collapsed-width\` | Chiều rộng sider (attribute thắng) |
| \`--hui-sider-bg\` / \`--hui-sider-color\` / \`--hui-sider-border-color\` | Màu sider |
| \`--hui-sider-trigger-height\` / \`--hui-sider-trigger-bg\` / \`--hui-sider-trigger-color\` | Nút thu/mở |
| \`--hui-content-padding\` / \`--hui-content-bg\` | Content |
| \`--hui-footer-padding\` / \`--hui-footer-bg\` / \`--hui-footer-color\` / \`--hui-footer-font-size\` / \`--hui-footer-border-color\` | Footer |

**Parts:** hui-layout: \`base\` · hui-sider: \`base\`, \`children\`, \`trigger\`. Header / content / footer không có DOM bên trong (style trực tiếp thẻ).
        `,
      },
    },
  },
};

/** Header — Content — Footer */
export const Default = {
  render: () => html`
    <hui-layout style="min-height: 420px;">
      <hui-header>${logo}<span style="flex: 1"></span><hui-button size="sm">Đăng nhập</hui-button></hui-header>
      <hui-content>${page}</hui-content>
      <hui-footer style="text-align: center;">HUI ©2026 — Zero-dependency Web Components</hui-footer>
    </hui-layout>
  `,
  play: async ({ canvasElement }) => {
    const layout = canvasElement.querySelector('hui-layout');
    const base = layout.shadowRoot.querySelector('[part="base"]');
    await expect(getComputedStyle(base).flexDirection).toBe('column');
    const header = canvasElement.querySelector('hui-header');
    await expect(Math.round(header.getBoundingClientRect().height)).toBe(64);
    // Content chiếm phần còn lại → footer nằm sát đáy layout
    const footer = canvasElement.querySelector('hui-footer').getBoundingClientRect();
    await expect(Math.round(footer.bottom)).toBe(Math.round(layout.getBoundingClientRect().bottom));
  },
};

/** Sider thu gọn được — bấm nút ở đáy sider */
export const WithSider = {
  render: () => html`
    <hui-layout style="min-height: 420px;">
      <hui-sider collapsible id="sider">${menu}</hui-sider>
      <hui-layout>
        <hui-header>${logo}</hui-header>
        <hui-content>${page}</hui-content>
        <hui-footer>Footer</hui-footer>
      </hui-layout>
    </hui-layout>
  `,
  play: async ({ canvasElement }) => {
    const layout = canvasElement.querySelector('hui-layout');
    await expect(getComputedStyle(layout.shadowRoot.querySelector('[part="base"]')).flexDirection).toBe('row');

    const sider = canvasElement.querySelector('#sider');
    const trigger = sider.shadowRoot.querySelector('[part="trigger"]');
    await expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await expect(trigger.getAttribute('aria-label')).toBe(t('common.collapse'));
    await waitFor(() => expect(Math.round(sider.getBoundingClientRect().width)).toBe(200));

    const events = [];
    sider.addEventListener('hui-collapse', (e) => events.push(e.detail));
    trigger.click();
    await sider.updateComplete;
    await expect(sider.hasAttribute('collapsed')).toBe(true);
    await expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(Math.round(sider.getBoundingClientRect().width)).toBe(80));

    trigger.click();
    await sider.updateComplete;
    await expect(sider.collapsed).toBe(false);
    await expect(events).toEqual([
      { collapsed: true, type: 'clickTrigger' },
      { collapsed: false, type: 'clickTrigger' },
    ]);
  },
};

/** collapsed-width="0" — thu gọn hẳn, nút nổi bên cạnh; width tùy chỉnh */
export const ZeroWidthTrigger = {
  render: () => html`
    <hui-layout style="min-height: 360px;">
      <hui-sider collapsible collapsed collapsed-width="0" width="240">${menu}</hui-sider>
      <hui-layout>
        <hui-header>${logo}</hui-header>
        <hui-content>${page}</hui-content>
      </hui-layout>
    </hui-layout>
  `,
  play: async ({ canvasElement }) => {
    const sider = canvasElement.querySelector('hui-sider');
    await waitFor(() => expect(Math.round(sider.getBoundingClientRect().width)).toBe(0));
    sider.toggle();
    await sider.updateComplete;
    await waitFor(() => expect(Math.round(sider.getBoundingClientRect().width)).toBe(240));
  },
};

/** breakpoint — tự thu gọn khi màn hình nhỏ hơn breakpoint (thu nhỏ khung xem để thử) */
export const Breakpoint = {
  render: () => html`
    <hui-layout style="min-height: 360px;">
      <hui-sider collapsible breakpoint="xxl" id="bp">${menu}</hui-sider>
      <hui-layout>
        <hui-header>${logo}<span style="margin-left: auto; font-size: 13px;">breakpoint="xxl" (&lt; 1600px → thu gọn)</span></hui-header>
        <hui-content>${page}</hui-content>
      </hui-layout>
    </hui-layout>
  `,
  play: async ({ canvasElement }) => {
    const sider = canvasElement.querySelector('#bp');
    const narrow = window.matchMedia('(max-width: 1599.98px)').matches;
    await expect(sider.collapsed).toBe(narrow);
    await expect(sider.broken).toBe(narrow);
  },
};

/** Sider bên phải + nội dung trigger tùy chỉnh */
export const RightSiderCustomTrigger = {
  render: () => html`
    <hui-layout style="min-height: 320px;">
      <hui-layout>
        <hui-header>${logo}</hui-header>
        <hui-content>${page}</hui-content>
      </hui-layout>
      <hui-sider collapsible reverse-arrow width="260">
        <div style="padding: 16px; white-space: nowrap;">Panel bên phải</div>
        <span slot="trigger" style="font-size: 13px;">⇆</span>
      </hui-sider>
    </hui-layout>
  `,
};

/** Override từ bên ngoài */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-shell {
        --hui-layout-bg: var(--hui-bg);
        --hui-header-bg: var(--hui-primary);
        --hui-header-color: var(--hui-text-inverse);
        --hui-header-height: 56px;
        --hui-header-border-color: transparent;
        --hui-sider-bg: var(--hui-bg-tertiary);
        --hui-sider-width: 220px;
        --hui-sider-collapsed-width: 64px;
        --hui-sider-trigger-bg: var(--hui-bg-tertiary);
        --hui-content-padding: 16px;
        --hui-footer-border-color: var(--hui-border);
      }
      .brand-shell hui-sider::part(trigger) { color: var(--hui-primary); }
    </style>
    <hui-layout class="brand-shell" style="min-height: 380px;">
      <hui-header>${logo}</hui-header>
      <hui-layout>
        <hui-sider collapsible>${menu}</hui-sider>
        <hui-layout>
          <hui-content>${page}</hui-content>
          <hui-footer>Footer có viền trên</hui-footer>
        </hui-layout>
      </hui-layout>
    </hui-layout>
  `,
};
