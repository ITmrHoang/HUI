/**
 * Storybook Stories — HUI Free Ship Bar (thanh tiến độ miễn phí vận chuyển)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { setLocale } from '../../core/locale.js';
import './index.js';

const part = (el, name) => el.shadowRoot.querySelector(`[part="${name}"]`);

export default {
  title: 'Molecules/HuiFreeShipBar',
  component: 'hui-free-ship-bar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Free Ship Bar** — "Mua thêm **120.000 ₫** để được miễn phí vận chuyển" + thanh tiến độ. Đạt ngưỡng: thanh chuyển
màu success, dấu ✓ vẽ nét + nảy nhẹ, câu chúc mừng. Dùng sẵn trong \`hui-cart-drawer\`.

\`\`\`html
<hui-free-ship-bar threshold="500000" total="380000"></hui-free-ship-bar>
<hui-free-ship-bar threshold="50" total="20" currency="USD" text="Only {amount} away from free shipping"></hui-free-ship-bar>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`threshold\` | number | \`0\` | Ngưỡng miễn phí vận chuyển |
| \`total\` | number | \`0\` | Tổng tiền hiện tại |
| \`currency\` | string | \`VND\` | Mã tiền tệ (formatCurrency) |
| \`text\` | string | locale | Câu khi chưa đạt — \`{amount}\` = số tiền còn thiếu |
| \`success-text\` | string | locale | Câu khi đã đạt |
| \`size\` | \`sm\` \\| \`md\` | \`md\` | Cỡ chữ / độ dày thanh |
| \`no-animation\` | boolean | — | Tắt hiệu ứng |

### Properties (chỉ đọc)
\`remaining\` (số tiền còn thiếu), \`reached\` (đã đạt), \`percent\` (0–100).

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-reached\` | \`{ total, threshold }\` | Vừa vượt ngưỡng (không phát ở lần render đầu) |

### Slots / Parts
Slot \`icon\`: thay icon xe tải. Parts: \`base\`, \`message\` (aria-live), \`icon\`, \`amount\`, \`track\` (role="progressbar"), \`fill\`.
State: \`:state(reached)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-free-ship-bar-height\` / \`--hui-free-ship-bar-radius\` | Độ dày / bo góc thanh |
| \`--hui-free-ship-bar-track-bg\` | Nền rãnh |
| \`--hui-free-ship-bar-color\` / \`--hui-free-ship-bar-success-color\` | Màu chưa đạt / đã đạt |
| \`--hui-free-ship-bar-text-color\` / \`--hui-free-ship-bar-amount-color\` | Màu chữ / số tiền |
| \`--hui-free-ship-bar-font-size\` / \`--hui-free-ship-bar-gap\` | Cỡ chữ / khoảng cách chữ ↔ thanh |

### A11y
Thanh có \`role="progressbar"\` + \`aria-valuenow/max/text\`; câu thông báo nằm trong vùng \`aria-live="polite"\`
(chỉ dựng lại khi chữ đổi).
        `,
      },
    },
  },
  argTypes: {
    threshold: { control: 'number' },
    total: { control: { type: 'range', min: 0, max: 600000, step: 10000 } },
  },
};

export const Default = {
  render: (args) => html`<div style="max-width:420px"><hui-free-ship-bar threshold=${args.threshold} total=${args.total}></hui-free-ship-bar></div>`,
  args: { threshold: 500000, total: 380000 },
};

export const States = {
  render: () => html`
    <div style="display:grid;gap:20px;max-width:420px">
      <hui-free-ship-bar threshold="500000" total="0"></hui-free-ship-bar>
      <hui-free-ship-bar threshold="500000" total="250000"></hui-free-ship-bar>
      <hui-free-ship-bar threshold="500000" total="520000"></hui-free-ship-bar>
      <hui-free-ship-bar size="sm" threshold="500000" total="420000"></hui-free-ship-bar>
      <hui-free-ship-bar threshold="50" total="31.5" currency="USD" text="Only {amount} away from free shipping 🚚"></hui-free-ship-bar>
    </div>
  `,
};

/** Tăng tổng tiền → vượt ngưỡng: chữ đổi, hui-reached phát 1 lần, progressbar đúng giá trị */
export const ReachThreshold = {
  render: () => html`<div style="max-width:420px"><hui-free-ship-bar id="fsb-r" threshold="500000" total="380000"></hui-free-ship-bar></div>`,
  play: async ({ canvasElement }) => {
    setLocale('vi');
    const bar = canvasElement.querySelector('#fsb-r');
    await bar.updateComplete;
    expect(part(bar, 'amount').textContent).toMatch(/120\.000/);
    expect(part(bar, 'message').textContent).toContain('Mua thêm');
    const track = part(bar, 'track');
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-valuenow')).toBe('380000');
    expect(part(bar, 'fill').style.width).toBe('76%');

    let reached = 0;
    bar.addEventListener('hui-reached', () => reached++);
    bar.total = 520000;
    await bar.updateComplete;
    await waitFor(() => expect(bar.reached).toBe(true));
    expect(part(bar, 'amount')).toBeNull();
    expect(part(bar, 'message').textContent).toContain('miễn phí vận chuyển');
    expect(part(bar, 'fill').style.width).toBe('100%');
    bar.total = 600000;
    await bar.updateComplete;
    expect(reached).toBe(1);
    bar.total = 100000;
    await bar.updateComplete;
    expect(bar.remaining).toBe(400000);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .fsb-custom {
        --hui-free-ship-bar-height: 10px;
        --hui-free-ship-bar-color: var(--hui-warning);
        --hui-free-ship-bar-amount-color: var(--hui-warning);
        --hui-free-ship-bar-track-bg: var(--hui-warning-light);
      }
      .fsb-custom::part(base) { padding: 12px; border-radius: 10px; background: var(--hui-bg-secondary); }
    </style>
    <div style="max-width:420px">
      <hui-free-ship-bar class="fsb-custom" threshold="300000" total="120000"><span slot="icon">🎁</span></hui-free-ship-bar>
    </div>
  `,
};
