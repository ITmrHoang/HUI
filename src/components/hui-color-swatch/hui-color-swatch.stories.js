/**
 * Storybook Stories — HUI Color Swatch (ô màu)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const PALETTE = [
  { color: '#1677ff', label: 'Xanh dương' },
  { color: '#52c41a', label: 'Xanh lá' },
  { color: '#faad14', label: 'Vàng' },
  { color: '#ff4d4f', label: 'Đỏ' },
  { color: '#111827', label: 'Đen' },
  { color: '#ffffff', label: 'Trắng' },
];

export default {
  title: 'Atoms/HuiColorSwatch',
  component: 'hui-color-swatch',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Color Swatch** — Ô hiển thị một màu: vuông / bo góc / tròn, nền ô cờ phía sau để thấy được màu trong suốt.
Tùy chọn \`selectable\` (nút bật/tắt chọn) hoặc \`copyable\` (bấm để sao chép mã màu). Dùng cho bảng màu thương hiệu,
bộ chọn màu sản phẩm, tài liệu design token.

\`\`\`html
<hui-color-swatch color="#1677ff" label="Xanh dương" show-label copyable></hui-color-swatch>
<hui-color-swatch color="rgba(22,119,255,.35)" shape="circle"></hui-color-swatch>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`color\` | string | — | Màu CSS bất kỳ hoặc token \`primary\` \\| \`success\` \\| \`warning\` \\| \`danger\` \\| \`info\` |
| \`shape\` | string | \`rounded\` | \`square\` \\| \`circle\` \\| \`rounded\` |
| \`size\` | string | \`md\` | \`sm\` (20px) \\| \`md\` (28px) \\| \`lg\` (40px) hoặc số px |
| \`label\` | string | mã màu | Tên màu (trình đọc màn hình + chữ khi show-label) |
| \`show-label\` | boolean | \`false\` | Hiện tên + mã màu dưới ô |
| \`selectable\` | boolean | \`false\` | Ô là nút bật/tắt (\`aria-pressed\`) |
| \`selected\` | boolean | \`false\` | Đang chọn (vòng + ✓) |
| \`copyable\` | boolean | \`false\` | Bấm để sao chép mã màu |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`change\` | \`{ selected, color }\` | (selectable) người dùng bật/tắt |
| \`hui-copy\` | \`{ value }\` | (copyable) đã sao chép |
| \`hui-copy-error\` | \`{ value }\` | không ghi được clipboard |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Chữ tên màu (thay \`label\` khi show-label) |

### Parts
\`base\`, \`swatch\`, \`color\`, \`check\`, \`label\`, \`value\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-color-swatch-size\` | Cạnh ô màu |
| \`--hui-color-swatch-radius\` | Bo góc (shape rounded) |
| \`--hui-color-swatch-border\` | Viền mờ quanh ô |
| \`--hui-color-swatch-ring-color\` | Vòng chọn / focus |
| \`--hui-color-swatch-checker\` | Màu ô cờ |
| \`--hui-color-swatch-label-color\` | Màu chữ tên |

### Bàn phím
| Phím | Hành động |
|------|-----------|
| Tab | Focus ô (khi selectable / copyable) |
| Enter / Space | Bật/tắt chọn hoặc sao chép |

Dấu ✓ tự đổi trắng/đen theo độ sáng màu nền. Sao chép xong có thông báo cho trình đọc màn hình (\`aria-live\`).
        `,
      },
    },
  },
  argTypes: {
    color: { control: 'color' },
    shape: { control: 'select', options: ['square', 'rounded', 'circle'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    label: { control: 'text' },
    showLabel: { control: 'boolean' },
    selectable: { control: 'boolean' },
    copyable: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-color-swatch id="cs-default" color=${args.color} shape=${args.shape} size=${args.size} label=${args.label}
      ?show-label=${args.showLabel} ?selectable=${args.selectable} ?copyable=${args.copyable}></hui-color-swatch>
  `,
  args: { color: '#1677ff', shape: 'rounded', size: 'lg', label: 'Xanh thương hiệu', showLabel: true, selectable: false, copyable: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cs-default');
    await el.updateComplete;
    const sw = el.shadowRoot.querySelector('[part="swatch"]');
    await expect(sw.getAttribute('role')).toBe('img');
    await expect(sw.getAttribute('aria-label')).toBe('Màu Xanh thương hiệu');
    await expect(sw.getBoundingClientRect().width).toBe(40);
    await expect(el.shadowRoot.querySelector('[part="value"]').textContent).toBe('#1677ff');
  },
};

/** Hình dạng + kích thước */
export const ShapesAndSizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${['square', 'rounded', 'circle'].map((shape) => html`
        <div style="display: flex; gap: 12px; align-items: center;">
          ${['sm', 'md', 'lg', '56'].map((size) => html`<hui-color-swatch color="primary" shape=${shape} size=${size} label="${shape} ${size}"></hui-color-swatch>`)}
        </div>`)}
    </div>
  `,
};

/** Màu trong suốt — nền ô cờ phía sau */
export const Transparent = {
  render: () => html`
    <div style="display: flex; gap: 16px;">
      ${['rgba(22, 119, 255, 0.25)', 'rgba(255, 77, 79, 0.5)', 'hsl(140 60% 45% / 0.7)', 'transparent'].map((c) => html`
        <hui-color-swatch color=${c} size="lg" show-label></hui-color-swatch>`)}
    </div>
  `,
};

/** Bảng chọn màu — selectable (aria-pressed), chọn 1 bằng cách bỏ chọn các ô khác */
export const Selectable = {
  render: () => html`
    <div id="cs-group" role="group" aria-label="Chọn màu sản phẩm" style="display: flex; gap: 12px;">
      ${PALETTE.map((p, i) => html`<hui-color-swatch color=${p.color} label=${p.label} shape="circle" size="lg" selectable ?selected=${i === 0}></hui-color-swatch>`)}
    </div>
    <p id="cs-picked" style="font: 14px system-ui; color: var(--hui-text-secondary);">Đã chọn: Xanh dương</p>
  `,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('#cs-group');
    const swatches = [...group.querySelectorAll('hui-color-swatch')];
    const events = [];
    group.addEventListener('change', (e) => {
      events.push(e.detail);
      if (e.detail.selected) swatches.forEach((s) => { if (s !== e.target) s.selected = false; });
      canvasElement.querySelector('#cs-picked').textContent = `Đã chọn: ${e.target.label}`;
    });
    await swatches[3].updateComplete;
    const btn = (el) => el.shadowRoot.querySelector('button[part="swatch"]');
    await expect(btn(swatches[0]).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(btn(swatches[3]));
    await expect(swatches[3].selected).toBe(true);
    await expect(swatches[0].selected).toBe(false);
    await expect(events[0]).toEqual({ selected: true, color: '#ff4d4f' });
    // Bàn phím: Space bật/tắt
    btn(swatches[1]).focus();
    await userEvent.keyboard(' ');
    await expect(swatches[1].selected).toBe(true);
    await swatches[1].updateComplete;
    await expect(btn(swatches[1]).getAttribute('aria-pressed')).toBe('true');
    // Màu tối → dấu ✓ trắng; màu sáng → dấu ✓ tối
    await waitFor(() => expect(swatches[4].shadowRoot.querySelector('.cs').dataset.contrast).toBe('light'));
    await expect(swatches[5].shadowRoot.querySelector('.cs').dataset.contrast).toBe('dark');
  },
};

/** Bấm để sao chép mã màu (bảng màu design token) */
export const Copyable = {
  render: () => html`
    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
      ${PALETTE.map((p) => html`<hui-color-swatch color=${p.color} label=${p.label} size="56" show-label copyable></hui-color-swatch>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-color-swatch');
    let copied = null;
    el.addEventListener('hui-copy', (e) => { copied = e.detail.value; });
    el.addEventListener('hui-copy-error', (e) => { copied = `error:${e.detail.value}`; });
    await el.updateComplete;
    const btn = el.shadowRoot.querySelector('button[part="swatch"]');
    await expect(btn.getAttribute('aria-label')).toBe('Sao chép mã màu Xanh dương');
    await userEvent.click(btn);
    await waitFor(() => expect(copied).not.toBeNull());
    if (copied === '#1677ff') {
      await waitFor(() => expect(el.shadowRoot.querySelector('[part="check"]').hidden).toBe(false));
    }
  },
};

export const Disabled = {
  render: () => html`<hui-color-swatch id="cs-disabled" color="#52c41a" selectable disabled label="Hết hàng"></hui-color-swatch>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cs-disabled');
    await el.updateComplete;
    await expect(el.shadowRoot.querySelector('button').disabled).toBe(true);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cs-brand {
        --hui-color-swatch-size: 48px;
        --hui-color-swatch-radius: 14px;
        --hui-color-swatch-ring-color: var(--hui-warning);
        --hui-color-swatch-label-color: var(--hui-primary);
      }
      .cs-brand::part(swatch) { box-shadow: var(--hui-shadow-md); }
      .cs-brand::part(value) { font-style: italic; }
    </style>
    <div style="display: flex; gap: 16px;">
      <hui-color-swatch id="cs-brand" class="cs-brand" color="#722ed1" label="Tím" show-label selectable selected></hui-color-swatch>
      <hui-color-swatch class="cs-brand" color="#13c2c2" label="Ngọc" show-label selectable></hui-color-swatch>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#cs-brand');
    await el.updateComplete;
    const sw = el.shadowRoot.querySelector('[part="swatch"]');
    await expect(sw.getBoundingClientRect().width).toBe(48);
    await expect(getComputedStyle(sw).borderTopLeftRadius).toBe('14px');
  },
};
