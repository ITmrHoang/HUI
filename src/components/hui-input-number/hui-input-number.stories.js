/**
 * Storybook Stories — HUI InputNumber
 */

import { html, nothing } from 'lit';
import { expect, userEvent } from 'storybook/test';
import './index.js';

/** Phân tách hàng nghìn + đơn vị ₫ (formatter/parser là property hàm) */
const vndFormatter = (text) => `${text.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;
const vndParser = (text) => text.replace(/[^\d-]/g, '');
const thousands = (text) => {
  const [int, dec] = text.split('.');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dec !== undefined ? `.${dec}` : '');
};
const stripCommas = (text) => text.replace(/,/g, '');

export default {
  title: 'Components/HuiInputNumber',
  component: 'hui-input-number',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI InputNumber** — Ô nhập số (Ant InputNumber). \`value\` là **Number** (\`null\` khi trống).
Nút tăng/giảm (nhấn giữ để lặp), phím ↑/↓, \`formatter\`/\`parser\` để hiển thị "1.000.000 ₫" mà value vẫn là \`1000000\`.

\`\`\`html
<hui-input-number min="0" max="10" step="0.5" value="3"></hui-input-number>
<hui-input-number id="price"></hui-input-number>
<script>
  price.formatter = (text) => text.replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.') + ' ₫';
  price.parser = (text) => text.replace(/[^\\d-]/g, '');
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | number | — | Giá trị ban đầu (property \`value\`: Number \\| null) |
| \`min\` / \`max\` | number | — | Khoảng giá trị (nút/phím không vượt qua; gõ tay ngoài khoảng → \`rangeUnderflow\` / \`rangeOverflow\`) |
| \`step\` | number | \`1\` | Bước nhảy (Shift + ↑/↓ = ×10) |
| \`precision\` | number | — | Số chữ số thập phân (làm tròn khi chốt + hiển thị) |
| \`controls\` | \`"true"\` \\| \`"false"\` | \`true\` | \`controls="false"\` ẩn nút tăng/giảm |
| \`label\` / \`placeholder\` / \`hint\` / \`error\` / \`success\` | string | — | Như hui-input |
| \`variant\` | string | \`outlined\` | \`outlined\` \\| \`filled\` \\| \`borderless\` |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`status\` | string | — | \`error\` \\| \`warning\` |
| \`name\` / \`required\` / \`disabled\` / \`readonly\` | — | — | Như input native |

### Properties
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`value\` | \`number \\| null\` | Giá trị số |
| \`formatter\` | \`(text, value) => string\` | Định dạng hiển thị (text đã làm tròn theo precision) |
| \`parser\` | \`(text) => string \\| number\` | Đọc ngược chữ người dùng gõ thành số |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` | \`{ value }\` | Mỗi lần value đổi (gõ hợp lệ, nút, phím) |
| \`change\` | \`{ value }\` | Khi chốt: rời ô / Enter / bấm nút / phím mũi tên |

### Slots
| Slot | Mô tả |
|------|-------|
| \`prefix\` | Trước ô nhập (vd: \`$\`) |
| \`suffix\` | Sau ô nhập, trước nút tăng/giảm (vd: \`kg\`) |

### Parts
\`base\`, \`label\`, \`container\`, \`input\`, \`prefix\`, \`suffix\`, \`controls\`, \`increment\`, \`decrement\`, \`message\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-input-number-height\` / \`--hui-input-number-padding-x\` / \`--hui-input-number-font-size\` | Kích thước |
| \`--hui-input-number-radius\` | Bo góc |
| \`--hui-input-number-bg\` / \`--hui-input-number-filled-bg\` / \`--hui-input-number-color\` | Nền / nền filled / chữ |
| \`--hui-input-number-border-color\` / \`--hui-input-number-hover-border-color\` | Viền |
| \`--hui-input-number-focus-border-color\` / \`--hui-input-number-focus-shadow\` | Focus |
| \`--hui-input-number-label-color\` / \`--hui-input-number-affix-color\` / \`--hui-input-number-placeholder-color\` | Chữ phụ |
| \`--hui-input-number-controls-width\` / \`--hui-input-number-controls-color\` / \`--hui-input-number-controls-hover-bg\` | Nút tăng/giảm |

Bề ngang mặc định 10rem — đặt \`width\` trực tiếp trên thẻ để đổi.

### Bàn phím (WAI-ARIA spinbutton)
| Phím | Tác dụng |
|------|----------|
| \`↑\` / \`↓\` | Tăng / giảm 1 bước (kẹp trong min/max) |
| \`Shift\` + \`↑\` / \`↓\` | Tăng / giảm 10 bước |
| \`Enter\` | Chốt giá trị đang gõ (làm tròn, phát \`change\`) |

Chữ gõ không hợp lệ (vd \`abc\`) giữ nguyên value cũ và được trả lại khi rời ô.
        `,
      },
    },
  },
  argTypes: {
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    precision: { control: 'number' },
    controls: { control: 'boolean' },
    variant: { control: 'select', options: ['outlined', 'filled', 'borderless'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-input-number
      label=${args.label || ''}
      value=${args.value ?? nothing}
      min=${args.min ?? nothing}
      max=${args.max ?? nothing}
      step=${args.step ?? nothing}
      precision=${args.precision ?? nothing}
      controls=${args.controls === false ? 'false' : 'true'}
      variant=${args.variant || 'outlined'}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      placeholder="Nhập số"
    ></hui-input-number>
  `,
  args: { label: 'Số lượng', value: 3, min: 1, max: 10, step: 1, controls: true, variant: 'outlined', size: 'md', disabled: false },
};

/** Bàn phím — ↑/↓ ±step, Shift ×10, luôn kẹp trong [min, max] */
export const Keyboard = {
  render: () => html`
    <hui-input-number id="num-kb" label="0 → 100, step 5" min="0" max="100" step="5" value="10"></hui-input-number>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#num-kb');
    const input = el.shadowRoot.querySelector('input');
    const changes = [];
    el.addEventListener('change', (e) => changes.push(e.detail.value));

    input.focus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(el.value).toBe(15);
    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}');
    await expect(el.value).toBe(65);
    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}');
    await expect(el.value).toBe(100); // kẹp ở max
    await el.updateComplete;
    await expect(el.shadowRoot.querySelector('[part="increment"]').disabled).toBe(true);
    await userEvent.keyboard('{ArrowDown}');
    await expect(el.value).toBe(95);
    await expect(changes).toEqual([15, 65, 100, 95]);
    await expect(input.getAttribute('aria-valuenow')).toBe('95');
    input.blur();
  },
};

/** Nút tăng/giảm + precision (step thập phân không bị lỗi số thực) */
export const StepAndPrecision = {
  render: () => html`
    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
      <hui-input-number id="num-step" label="step 0.1" step="0.1" value="0.2"></hui-input-number>
      <hui-input-number label="precision 2" precision="2" step="0.25" value="1"></hui-input-number>
      <hui-input-number label="Ẩn nút" controls="false" value="42"></hui-input-number>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#num-step');
    el.shadowRoot.querySelector('[part="increment"]').click();
    await expect(el.value).toBe(0.3); // không phải 0.30000000000000004
    el.shadowRoot.querySelector('[part="decrement"]').click();
    el.shadowRoot.querySelector('[part="decrement"]').click();
    await expect(el.value).toBe(0.1);
    const [, fixed, hidden] = canvasElement.querySelectorAll('hui-input-number');
    await expect(fixed.shadowRoot.querySelector('input').value).toBe('1.00');
    await expect(hidden.shadowRoot.querySelector('[part="controls"]').hidden).toBe(true);
  },
};

/** formatter / parser — hiển thị có định dạng, value vẫn là số */
export const FormatterParser = {
  render: () => html`
    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
      <hui-input-number id="num-vnd" label="Giá (₫)" value="1500000" step="1000" min="0" style="width: 14rem"
        .formatter=${vndFormatter} .parser=${vndParser}></hui-input-number>
      <hui-input-number label="Phân tách nghìn" value="1234567.89" precision="2" style="width: 14rem"
        .formatter=${thousands} .parser=${stripCommas}></hui-input-number>
      <hui-input-number label="Phần trăm" value="50" min="0" max="100"
        .formatter=${(t) => `${t}%`} .parser=${(t) => t.replace('%', '')}></hui-input-number>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#num-vnd');
    const input = el.shadowRoot.querySelector('input');
    await expect(input.value).toBe('1.500.000 ₫');
    await expect(el.value).toBe(1500000);
    // Gõ đè toàn bộ chữ đang có
    await userEvent.type(input, '2.000.000', { initialSelectionStart: 0, initialSelectionEnd: input.value.length });
    await expect(el.value).toBe(2000000);
    input.blur();
    await el.updateComplete;
    await expect(input.value).toBe('2.000.000 ₫');
  },
};

/** prefix / suffix */
export const PrefixSuffix = {
  render: () => html`
    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
      <hui-input-number label="Giá" value="99" precision="2"><span slot="prefix">$</span></hui-input-number>
      <hui-input-number label="Cân nặng" value="65" min="0"><span slot="suffix">kg</span></hui-input-number>
    </div>
  `,
};

export const Variants = {
  render: () => html`
    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
      ${['outlined', 'filled', 'borderless'].map((v) => html`<hui-input-number variant=${v} label=${v} value="10"></hui-input-number>`)}
    </div>
  `,
};

export const Sizes = {
  render: () => html`
    <div style="display: flex; gap: 16px; align-items: flex-start;">
      ${['sm', 'md', 'lg'].map((s) => html`<hui-input-number size=${s} value="1" placeholder=${s}></hui-input-number>`)}
    </div>
  `,
};

export const States = {
  render: () => html`
    <div style="display: flex; gap: 16px; flex-wrap: wrap;">
      <hui-input-number label="Lỗi" error="Không hợp lệ" value="5"></hui-input-number>
      <hui-input-number label="Cảnh báo" status="warning" value="5"></hui-input-number>
      <hui-input-number label="Disabled" disabled value="5"></hui-input-number>
      <hui-input-number label="Readonly" readonly value="5"></hui-input-number>
    </div>
  `,
};

/** Trong <form> — FormData gửi chuỗi số, validate min/max, reset */
export const InForm = {
  render: () => html`
    <form id="num-form" style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;"
      @submit=${(e) => e.preventDefault()}>
      <hui-input-number name="qty" label="Số lượng (1–10)" min="1" max="10" value="2" required></hui-input-number>
      <div style="display: flex; gap: 8px;">
        <button type="submit">Gửi</button>
        <button type="reset">Reset</button>
      </div>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#num-form');
    const el = form.querySelector('hui-input-number');
    await expect(new FormData(form).get('qty')).toBe('2');
    el.value = 20;
    await expect(el.validity.rangeOverflow).toBe(true);
    await expect(el.validationMessage).toContain('10');
    el.value = 0;
    await expect(el.validity.rangeUnderflow).toBe(true);
    el.value = null;
    await expect(el.validity.valueMissing).toBe(true);
    await expect(new FormData(form).has('qty')).toBe(false);
    form.reset();
    await expect(el.value).toBe(2);
    await expect(el.checkValidity()).toBe(true);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .num-pill {
        --hui-input-number-radius: 999px;
        --hui-input-number-controls-width: 2rem;
        --hui-input-number-focus-border-color: var(--hui-success);
        --hui-input-number-focus-shadow: 0 0 0 3px var(--hui-success-light);
      }
      hui-input-number.big::part(input) { font-weight: 600; text-align: center; }
      hui-input-number.big::part(increment) { color: var(--hui-success); }
      hui-input-number.big::part(decrement) { color: var(--hui-danger); }
    </style>
    <div style="display: flex; gap: 16px;">
      <hui-input-number class="num-pill" label="Biến CSS" value="7"></hui-input-number>
      <hui-input-number class="big" label="::part()" value="7" size="lg"></hui-input-number>
    </div>
  `,
};
