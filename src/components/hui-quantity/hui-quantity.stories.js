/**
 * Storybook Stories — HUI Quantity (bộ chọn số lượng cho giỏ hàng)
 */

import { html, nothing } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const part = (el, name) => el.shadowRoot.querySelector(`[part="${name}"]`);

export default {
  title: 'Molecules/HuiQuantity',
  component: 'hui-quantity',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Quantity** — bộ chọn số lượng \`− [n] +\` cho giỏ hàng / trang sản phẩm. Tham gia \`<form>\` như input native.
Nút tự khóa ở biên \`min\` / \`max\`, nhấn giữ để lặp (tăng tốc dần), số "trượt" theo hướng tăng/giảm.

\`\`\`html
<hui-quantity name="qty" value="1" min="1" max="10"></hui-quantity>
<hui-quantity size="sm" variant="filled"></hui-quantity>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | number | \`1\` | Số lượng (attribute = giá trị ban đầu khi reset form) |
| \`min\` / \`max\` | number | \`1\` / — | Biên; giá trị luôn bị kẹp trong khoảng |
| \`step\` | number | \`1\` | Bước nhảy |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Bỏ trống = theo \`hui-form\` |
| \`variant\` | \`outlined\` \\| \`filled\` \\| \`borderless\` | \`outlined\` | Kiểu khung |
| \`label\` | string | "Số lượng" | Tên cho trình đọc màn hình |
| \`no-animation\` | boolean | — | Tắt hiệu ứng số trượt |
| \`name\` / \`disabled\` / \`readonly\` | — | — | Như input native |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`value\` | \`number\` trong [min, max] |
| \`stepUp()\` / \`stepDown()\` | Tăng / giảm 1 bước (phát input + change) |
| \`focus()\` / \`blur()\` | Focus ô số |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` | \`{ value }\` | Số lượng đổi |
| \`change\` | \`{ value }\` | Đã chốt (nút / phím / rời ô) |

### Parts
\`base\`, \`decrement\`, \`increment\`, \`input\` (role="spinbutton").

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-quantity-height\` / \`--hui-quantity-input-width\` | Chiều cao / bề ngang ô số |
| \`--hui-quantity-radius\` / \`--hui-quantity-bg\` | Bo góc / nền |
| \`--hui-quantity-border-color\` / \`--hui-quantity-focus-border-color\` | Viền / viền khi focus |
| \`--hui-quantity-color\` / \`--hui-quantity-font-size\` | Chữ số |
| \`--hui-quantity-button-color\` / \`--hui-quantity-button-hover-bg\` | Nút −/+ |

### Bàn phím (WAI-ARIA APG Spinbutton)
| Phím | Tác dụng |
|------|----------|
| \`↑\` / \`↓\` | Tăng / giảm 1 bước |
| \`PageUp\` / \`PageDown\` | ±10 bước |
| \`Home\` / \`End\` | Về min / max (khi có max) |
| \`Enter\` | Chốt số đang gõ |

Nút −/+ không nằm trong thứ tự Tab (giống Ant InputNumber); ô số có \`aria-valuenow/min/max\`.
        `,
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: { control: 'select', options: ['outlined', 'filled', 'borderless'] },
    disabled: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-quantity
      value=${args.value ?? nothing} min=${args.min ?? nothing} max=${args.max ?? nothing} step=${args.step ?? nothing}
      size=${args.size || nothing} variant=${args.variant || nothing} ?disabled=${args.disabled}
    ></hui-quantity>
  `,
  args: { value: 1, min: 1, max: 10, step: 1, size: 'md', variant: 'outlined', disabled: false },
};

export const Sizes = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:center">
      <hui-quantity size="sm" value="2"></hui-quantity>
      <hui-quantity size="md" value="2"></hui-quantity>
      <hui-quantity size="lg" value="2"></hui-quantity>
    </div>
  `,
};

export const Variants = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:center">
      <hui-quantity variant="outlined"></hui-quantity>
      <hui-quantity variant="filled"></hui-quantity>
      <hui-quantity variant="borderless"></hui-quantity>
    </div>
  `,
};

export const States = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:center">
      <hui-quantity value="3" disabled></hui-quantity>
      <hui-quantity value="3" readonly></hui-quantity>
      <hui-quantity value="5" max="5" label="Tồn kho còn 5"></hui-quantity>
    </div>
  `,
};

/** Nút −/+ tự khóa ở biên, phát input + change */
export const Bounds = {
  render: () => html`<hui-quantity id="q-b" value="1" min="1" max="3"></hui-quantity>`,
  play: async ({ canvasElement }) => {
    const q = canvasElement.querySelector('#q-b');
    await q.updateComplete;
    const dec = part(q, 'decrement');
    const inc = part(q, 'increment');
    expect(dec.disabled).toBe(true);
    const events = [];
    q.addEventListener('change', (e) => events.push(e.detail.value));
    inc.click();
    inc.click();
    await q.updateComplete;
    expect(q.value).toBe(3);
    expect(events).toEqual([2, 3]);
    expect(inc.disabled).toBe(true);
    expect(dec.disabled).toBe(false);
    inc.click();
    expect(q.value).toBe(3);
    // gán ngoài khoảng bằng code → bị kẹp
    q.value = 99;
    expect(q.value).toBe(3);
  },
};

/** Bàn phím: ↑/↓, Home/End, gõ số rồi rời ô */
export const Keyboard = {
  render: () => html`<hui-quantity id="q-k" value="2" min="1" max="20"></hui-quantity>`,
  play: async ({ canvasElement }) => {
    const q = canvasElement.querySelector('#q-k');
    await q.updateComplete;
    const input = part(q, 'input');
    input.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(q.value).toBe(3);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(q.value).toBe(1);
    await userEvent.keyboard('{End}');
    expect(q.value).toBe(20);
    await userEvent.keyboard('{Home}');
    expect(q.value).toBe(1);
    expect(input.getAttribute('aria-valuenow')).toBe('1');

    input.select();
    await userEvent.keyboard('7a');
    expect(input.value).toBe('7');
    expect(q.value).toBe(7);
    input.select();
    await userEvent.keyboard('50');
    input.blur();
    await waitFor(() => expect(q.value).toBe(20));
    expect(input.value).toBe('20');
  },
};

/** Nhấn giữ nút + → lặp liên tục */
export const LongPress = {
  render: () => html`<hui-quantity id="q-l" value="1" max="99"></hui-quantity>`,
  play: async ({ canvasElement }) => {
    const q = canvasElement.querySelector('#q-l');
    await q.updateComplete;
    const inc = part(q, 'increment');
    inc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }));
    await waitFor(() => expect(q.value).toBeGreaterThan(3), { timeout: 2000 });
    inc.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    const stopped = q.value;
    await new Promise((r) => setTimeout(r, 300));
    expect(q.value).toBe(stopped);
  },
};

/** Gửi form native + reset */
export const InForm = {
  render: () => html`
    <form id="q-f">
      <hui-quantity name="qty" value="2"></hui-quantity>
      <button type="reset">Reset</button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#q-f');
    const q = form.querySelector('hui-quantity');
    await q.updateComplete;
    q.stepUp();
    expect(new FormData(form).get('qty')).toBe('3');
    form.reset();
    expect(q.value).toBe(2);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .qty-custom {
        --hui-quantity-radius: 999px;
        --hui-quantity-height: 40px;
        --hui-quantity-border-color: var(--hui-primary);
        --hui-quantity-button-color: var(--hui-primary);
      }
      .qty-custom::part(input) { font-weight: 700; }
      .qty-custom::part(increment) { background: var(--hui-primary); color: var(--hui-text-inverse); }
    </style>
    <hui-quantity class="qty-custom" value="4"></hui-quantity>
  `,
};
