/**
 * Storybook Stories — HUI Wishlist Toggle (nút tim yêu thích)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const btnOf = (el) => el.shadowRoot.querySelector('[part="button"]');

export default {
  title: 'Molecules/HuiWishlistToggle',
  component: 'hui-wishlist-toggle',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Wishlist Toggle** — nút trái tim bật/tắt yêu thích (\`aria-pressed\`). Khi bật: tim nảy + vòng sóng + hạt bắn ra
(burst tự viết, nhẹ, không phụ thuộc gói effects).

\`\`\`html
<hui-wishlist-toggle></hui-wishlist-toggle>
<hui-wishlist-toggle active variant="outlined">Yêu thích</hui-wishlist-toggle>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`active\` | boolean | — | Đang bật |
| \`label\` | string | "Yêu thích" | Tên cho trình đọc màn hình (khi không có chữ trong slot) |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Kích thước |
| \`variant\` | \`filled\` \\| \`outlined\` \\| \`plain\` | \`filled\` | Nền tròn có bóng / viền / chỉ icon |
| \`particles\` | number | \`10\` | Số hạt bắn ra (0–24) |
| \`disabled\` | boolean | — | Vô hiệu hóa |
| \`no-animation\` | boolean | — | Tắt hiệu ứng |

### Methods
| Method | Mô tả |
|--------|-------|
| \`celebrate()\` | Chạy hiệu ứng nảy + hạt |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ active }\` | Người dùng bật/tắt. Cancelable — \`preventDefault()\` giữ trạng thái cũ |

### Slots / Parts
Slot mặc định: chữ bên cạnh tim. Parts: \`button\`, \`icon\`, \`label\`, \`burst\`. State: \`:state(active)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-wishlist-toggle-size\` / \`--hui-wishlist-toggle-icon-size\` | Cạnh nút / cỡ tim |
| \`--hui-wishlist-toggle-color\` / \`--hui-wishlist-toggle-active-color\` | Màu tim tắt / bật |
| \`--hui-wishlist-toggle-bg\` / \`--hui-wishlist-toggle-hover-bg\` / \`--hui-wishlist-toggle-shadow\` | Nền / hover / bóng |
| \`--hui-wishlist-toggle-burst-color\` | Màu hạt + vòng sóng |

### Bàn phím
\`Tab\` focus, \`Enter\` / \`Space\` bật/tắt (thẻ \`<button>\` native).
        `,
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: { control: 'select', options: ['filled', 'outlined', 'plain'] },
    active: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="padding:24px">
      <hui-wishlist-toggle size=${args.size} variant=${args.variant} ?active=${args.active}></hui-wishlist-toggle>
    </div>
  `,
  args: { size: 'md', variant: 'filled', active: false },
};

export const Variants = {
  render: () => html`
    <div style="display:flex;gap:20px;align-items:center;padding:24px">
      <hui-wishlist-toggle variant="filled"></hui-wishlist-toggle>
      <hui-wishlist-toggle variant="outlined" active></hui-wishlist-toggle>
      <hui-wishlist-toggle variant="plain"></hui-wishlist-toggle>
      <hui-wishlist-toggle variant="outlined">Yêu thích</hui-wishlist-toggle>
      <hui-wishlist-toggle disabled></hui-wishlist-toggle>
    </div>
  `,
};

export const Sizes = {
  render: () => html`
    <div style="display:flex;gap:20px;align-items:center;padding:24px">
      <hui-wishlist-toggle size="sm" active></hui-wishlist-toggle>
      <hui-wishlist-toggle size="md" active></hui-wishlist-toggle>
      <hui-wishlist-toggle size="lg" active></hui-wishlist-toggle>
    </div>
  `,
};

/** Click bật/tắt: aria-pressed, sự kiện change, hạt được tạo rồi tự dọn */
export const Toggle = {
  render: () => html`<div style="padding:24px"><hui-wishlist-toggle id="wl-t"></hui-wishlist-toggle></div>`,
  play: async ({ canvasElement }) => {
    const wl = canvasElement.querySelector('#wl-t');
    await wl.updateComplete;
    const btn = btnOf(wl);
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.getAttribute('aria-label')).toBeTruthy();
    const events = [];
    wl.addEventListener('change', (e) => events.push(e.detail.active));
    await userEvent.click(btn);
    await wl.updateComplete;
    expect(wl.active).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(wl.hasAttribute('active')).toBe(true);
    await userEvent.keyboard(' ');
    await wl.updateComplete;
    expect(wl.active).toBe(false);
    expect(events).toEqual([true, false]);
    const burst = wl.shadowRoot.querySelector('[part="burst"]');
    await waitFor(() => expect(burst.children.length).toBe(0), { timeout: 2000 });
  },
};

/** preventDefault() trên change → giữ nguyên trạng thái */
export const Cancelable = {
  render: () => html`<div style="padding:24px"><hui-wishlist-toggle id="wl-c" @change=${(e) => e.preventDefault()}></hui-wishlist-toggle></div>`,
  play: async ({ canvasElement }) => {
    const wl = canvasElement.querySelector('#wl-c');
    await wl.updateComplete;
    await userEvent.click(btnOf(wl));
    await wl.updateComplete;
    expect(wl.active).toBe(false);
    expect(btnOf(wl).getAttribute('aria-pressed')).toBe('false');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .wl-custom {
        --hui-wishlist-toggle-size: 52px;
        --hui-wishlist-toggle-icon-size: 28px;
        --hui-wishlist-toggle-active-color: var(--hui-primary);
        --hui-wishlist-toggle-burst-color: var(--hui-warning);
      }
      .wl-custom::part(button) { border-radius: 12px; }
    </style>
    <div style="padding:24px"><hui-wishlist-toggle class="wl-custom" variant="outlined" particles="16"></hui-wishlist-toggle></div>
  `,
};
