/**
 * Storybook Stories — HUI Copy
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

/** Thay clipboard thật bằng bản ghi nhớ (test ổn định, không cần quyền clipboard) */
function mockClipboard() {
  const log = [];
  const clip = navigator.clipboard;
  if (clip) clip.writeText = async (text) => { log.push(text); };
  return { log, restore: () => { if (clip) delete clip.writeText; } };
}

const innerButton = (el) => el.shadowRoot.querySelector('hui-button').shadowRoot.querySelector('button');

export default {
  title: 'Atoms/HuiCopy',
  component: 'hui-copy',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Copy** — Nút sao chép: chép \`value\` (hoặc chữ của phần tử \`target\`) vào clipboard bằng Clipboard API,
tự fallback \`execCommand('copy')\` khi bị chặn (http, iframe). Icon **copy → check** trong 2 giây, bong bóng "Đã sao chép".
Dựng trên \`<hui-button>\` nên \`variant\` / \`size\` / \`shape\` giống hệt.

\`\`\`html
<hui-copy value="npm i @itmrhoang/h-ui"></hui-copy>
<hui-copy target="#coupon" variant="outline">Sao chép mã</hui-copy>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | string | — | Chuỗi cần chép (ưu tiên hơn target) |
| \`target\` | string | — | CSS selector phần tử lấy chữ (input/textarea → value) |
| \`variant\` | string | \`ghost\` | Như hui-button: primary, secondary, outline, dashed, ghost, text, link, danger |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`shape\` | string | \`default\` | \`default\` \\| \`round\` \\| \`circle\` (chỉ icon → tự circle) |
| \`label\` | string | "Sao chép" | aria-label khi chỉ có icon |
| \`copied-label\` | string | "Đã sao chép" | Chữ bong bóng |
| \`duration\` | number | \`2000\` | Thời gian giữ trạng thái đã chép (ms) |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa |
| \`no-tooltip\` | boolean | \`false\` | Ẩn bong bóng (vẫn thông báo cho trình đọc màn hình) |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`copy()\` | Sao chép, trả \`Promise<boolean>\` |
| \`textToCopy\` | (chỉ đọc) chuỗi sẽ được chép |
| \`copied\` | (chỉ đọc) đang ở trạng thái đã chép |
| \`copyText(text)\` | Hàm export dùng lại: \`import { copyText } from '@itmrhoang/h-ui/hui-copy'\` |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-copy\` | \`{ value }\` | Chép thành công |
| \`hui-copy-error\` | \`{ value }\` | Không ghi được clipboard |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Chữ của nút — bỏ trống = nút chỉ icon |

### Parts
\`button\` (hui-button), \`button-base\` (thẻ button thật), \`button-label\`, \`icon\`, \`tooltip\`. Custom state: \`hui-copy:state(copied)\`.

### CSS Variables
\`--hui-copy-success-color\`, \`--hui-copy-tooltip-bg\`, \`--hui-copy-tooltip-color\` + mọi biến \`--hui-button-*\`.

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Focus nút |
| \`Enter\` / \`Space\` | Sao chép |

Bong bóng là \`role="status"\` → trình đọc màn hình đọc "Đã sao chép".
        `,
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    variant: { control: 'select', options: ['primary', 'secondary', 'outline', 'dashed', 'ghost', 'text', 'link', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    noTooltip: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="padding-top: 32px;">
      <hui-copy
        value=${args.value}
        variant=${args.variant}
        size=${args.size}
        ?disabled=${args.disabled}
        ?no-tooltip=${args.noTooltip}
      ></hui-copy>
    </div>
  `,
  args: { value: 'npm i @itmrhoang/h-ui', variant: 'ghost', size: 'md', disabled: false, noTooltip: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-copy');
    const btn = innerButton(el);
    await expect(btn.getAttribute('aria-label')).toBe('Sao chép');
    const clip = mockClipboard();
    try {
      let detail = null;
      el.addEventListener('hui-copy', (e) => { detail = e.detail; }, { once: true });
      await userEvent.click(btn);
      await waitFor(() => expect(detail).toEqual({ value: 'npm i @itmrhoang/h-ui' }));
      if (navigator.clipboard) await expect(clip.log).toEqual(['npm i @itmrhoang/h-ui']);
      await expect(el.copied).toBe(true);
      await expect(el.shadowRoot.querySelector('hui-button').getAttribute('icon')).toBe('check');
      await expect(el.shadowRoot.querySelector('[part="tooltip"]').textContent).toBe('Đã sao chép');
    } finally {
      clip.restore();
    }
  },
};

/** Có chữ, các variant / size như hui-button */
export const WithLabelAndVariants = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding-top: 32px;">
      <hui-copy value="SALE50" variant="primary">Sao chép mã</hui-copy>
      <hui-copy value="SALE50" variant="outline" size="sm">Sao chép</hui-copy>
      <hui-copy value="SALE50" variant="dashed" size="lg">Sao chép mã giảm giá</hui-copy>
      <hui-copy value="SALE50" variant="text"></hui-copy>
      <hui-copy value="SALE50" variant="secondary" shape="round">Copy</hui-copy>
      <hui-copy value="SALE50" disabled>Không chép được</hui-copy>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const first = canvasElement.querySelector('hui-copy');
    await expect(first.shadowRoot.querySelector('hui-button').getAttribute('shape')).toBe('default');
    await expect(innerButton(first).hasAttribute('aria-label')).toBe(false);
    const disabled = canvasElement.querySelectorAll('hui-copy')[5];
    await expect(innerButton(disabled).disabled).toBe(true);
    await expect(await disabled.copy()).toBe(false);
  },
};

/** Chép từ phần tử khác: target="#selector" (input → value, phần tử khác → chữ hiển thị) */
export const FromTarget = {
  render: () => html`
    <div style="display: grid; gap: 16px; max-width: 420px; padding-top: 32px;">
      <div style="display: flex; gap: 8px; align-items: center;">
        <input id="share-link" value="https://example.com/khuyen-mai" style="flex: 1; padding: 6px 8px;" aria-label="Liên kết" />
        <hui-copy target="#share-link" variant="outline">Sao chép</hui-copy>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <code id="coupon" style="padding: 4px 8px; background: var(--hui-fill-secondary); border-radius: 4px;">HUI-2026</code>
        <hui-copy target="#coupon" size="sm"></hui-copy>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [a, b] = canvasElement.querySelectorAll('hui-copy');
    await expect(a.textToCopy).toBe('https://example.com/khuyen-mai');
    await expect(b.textToCopy).toBe('HUI-2026');
    const clip = mockClipboard();
    try {
      // Bàn phím: Tab tới nút rồi Enter
      innerButton(b).focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(b.copied).toBe(true));
      if (navigator.clipboard) await expect(clip.log).toEqual(['HUI-2026']);
    } finally {
      clip.restore();
    }
  },
};

/** Thời gian giữ trạng thái + chữ bong bóng tùy chỉnh */
export const CustomDuration = {
  render: () => html`
    <div style="padding-top: 32px;">
      <hui-copy id="short" value="abc" duration="300" copied-label="Xong!" variant="outline">Chép (300ms)</hui-copy>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#short');
    const clip = mockClipboard();
    try {
      await el.copy();
      await expect(el.shadowRoot.querySelector('[part="tooltip"]').textContent).toBe('Xong!');
      await waitFor(() => expect(el.copied).toBe(false), { timeout: 2000 });
      await expect(el.shadowRoot.querySelector('hui-button').getAttribute('icon')).toBe('copy');
    } finally {
      clip.restore();
    }
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .copy-brand {
        --hui-copy-success-color: var(--hui-primary);
        --hui-copy-tooltip-bg: var(--hui-primary);
        --hui-copy-tooltip-color: var(--hui-text-inverse);
        --hui-button-radius: 999px;
      }
      hui-copy.copy-mono::part(button-base) { font-family: var(--hui-font-mono); letter-spacing: 0.05em; }
      hui-copy.copy-mono::part(tooltip) { font-weight: 600; }
      hui-copy:state(copied)::part(button-base) { border-color: var(--hui-success); }
    </style>
    <div style="display: flex; gap: 12px; padding-top: 32px;">
      <span class="copy-brand"><hui-copy value="hello" variant="outline">Brand</hui-copy></span>
      <hui-copy class="copy-mono" value="XYZ-123" variant="dashed">XYZ-123</hui-copy>
    </div>
  `,
};
