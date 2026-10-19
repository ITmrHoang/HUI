/**
 * Storybook Stories — HUI Variant Picker (chọn màu / cỡ / ảnh biến thể)
 */

import { html } from 'lit';
import { expect, userEvent } from 'storybook/test';
import './index.js';

/** Ảnh SVG tự sinh (không dùng ảnh mạng) */
const thumb = (bg, fg) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${bg}"/><path d="M22 26l10-8h16l10 8-7 8v28H29V34z" fill="${fg}"/></svg>`,
)}`;

const COLORS = [
  { value: 'black', label: 'Đen', color: '#1f1f1f' },
  { value: 'white', label: 'Trắng', color: '#ffffff' },
  { value: 'red', label: 'Đỏ', color: '#e53935' },
  { value: 'blue', label: 'Xanh dương', color: '#1e88e5', disabled: true },
  { value: 'green', label: 'Xanh lá', color: '#43a047' },
];
const SIZES = [
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L', disabled: true },
  { value: 'XL', label: 'XL' },
  { value: 'XXL', label: 'XXL' },
];
const IMAGES = [
  { value: 'sand', label: 'Cát', image: thumb('#f3e5c8', '#c49a5a') },
  { value: 'sky', label: 'Trời', image: thumb('#dcecfb', '#4a90d9') },
  { value: 'rose', label: 'Hồng', image: thumb('#fde4ea', '#d9577a'), disabled: true },
  { value: 'mint', label: 'Bạc hà', image: thumb('#dff5ec', '#3aa57a') },
];

const opts = (el) => [...el.shadowRoot.querySelectorAll('[part~="option"]')];

export default {
  title: 'Molecules/HuiVariantPicker',
  component: 'hui-variant-picker',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Variant Picker** — chọn biến thể sản phẩm: ô màu (\`type="color"\`), nút cỡ dạng pill (\`type="button"\`)
hoặc ảnh thu nhỏ (\`type="image"\`). Ngữ nghĩa radio group, mục \`disabled\` (hết hàng) gạch chéo. Gửi \`value\` lên form.

\`\`\`html
<hui-variant-picker name="color" type="color" label="Màu sắc" value="red"
  options='[{"value":"red","label":"Đỏ","color":"#e53935"},{"value":"blue","label":"Xanh","color":"#1e88e5","disabled":true}]'>
</hui-variant-picker>
<hui-variant-picker name="size" label="Kích cỡ" options='["S","M","L"]'></hui-variant-picker>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | string | \`''\` | Giá trị đang chọn (attribute = giá trị ban đầu khi reset) |
| \`options\` | JSON array | \`[]\` | \`[{ value, label, color, image, disabled }]\` hoặc mảng chuỗi |
| \`type\` | \`button\` \\| \`color\` \\| \`image\` | \`button\` | Kiểu hiển thị |
| \`label\` | string | — | Nhãn nhóm, hiện "Nhãn: Mục đang chọn" |
| \`hide-selected\` | boolean | — | Ẩn tên mục đang chọn |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Kích thước |
| \`no-animation\` | boolean | — | Tắt hiệu ứng nảy khi chọn |
| \`name\` / \`required\` / \`disabled\` / \`readonly\` | — | — | Như control native |

### Properties
| Property | Mô tả |
|----------|-------|
| \`options\` | Mảng option (nên gán bằng JS) |
| \`selectedOption\` | Option đang chọn (chỉ đọc) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` / \`change\` | \`{ value, option }\` | Người dùng chọn mục khác |

### Parts
\`base\`, \`header\`, \`label\`, \`selected\`, \`group\`, \`option\` (+ \`option-checked\`, \`option-disabled\`), \`swatch\`, \`thumb\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-variant-picker-gap\` | Khoảng cách giữa các mục |
| \`--hui-variant-picker-radius\` | Bo góc nút cỡ (mặc định pill) |
| \`--hui-variant-picker-border-color\` | Viền mục chưa chọn |
| \`--hui-variant-picker-active-color\` / \`--hui-variant-picker-active-bg\` | Mục đang chọn |
| \`--hui-variant-picker-bg\` / \`--hui-variant-picker-color\` | Nền / chữ nút cỡ |
| \`--hui-variant-picker-disabled-color\` | Gạch chéo / chữ mục hết hàng |

### Bàn phím (WAI-ARIA APG Radio Group)
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Vào / ra nhóm (chỉ mục đang chọn nhận Tab — roving tabindex) |
| \`→\` / \`↓\` | Chuyển + chọn mục kế tiếp còn hàng (vòng tròn) |
| \`←\` / \`↑\` | Chuyển + chọn mục trước |
| \`Space\` / \`Enter\` | Chọn mục đang focus |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <div style="display:grid;gap:20px">
      <hui-variant-picker type="color" label="Màu sắc" value="red" .options=${COLORS}></hui-variant-picker>
      <hui-variant-picker label="Kích cỡ" value="M" .options=${SIZES}></hui-variant-picker>
    </div>
  `,
};

export const Types = {
  render: () => html`
    <div style="display:grid;gap:20px">
      <hui-variant-picker type="button" label="Kích cỡ" .options=${SIZES}></hui-variant-picker>
      <hui-variant-picker type="color" label="Màu sắc" .options=${COLORS}></hui-variant-picker>
      <hui-variant-picker type="image" label="Họa tiết" value="sky" .options=${IMAGES}></hui-variant-picker>
    </div>
  `,
};

export const Sizes = {
  render: () => html`
    <div style="display:grid;gap:16px">
      ${['sm', 'md', 'lg'].map((s) => html`
        <div style="display:flex;gap:24px;align-items:center">
          <hui-variant-picker size=${s} value="M" .options=${SIZES}></hui-variant-picker>
          <hui-variant-picker size=${s} type="color" value="black" .options=${COLORS}></hui-variant-picker>
        </div>
      `)}
    </div>
  `,
};

export const States = {
  render: () => html`
    <div style="display:grid;gap:16px">
      <hui-variant-picker label="Disabled" value="M" disabled .options=${SIZES}></hui-variant-picker>
      <hui-variant-picker label="Readonly" value="S" readonly .options=${SIZES}></hui-variant-picker>
    </div>
  `,
};

/** Click chọn, mục hết hàng không chọn được, change phát detail { value, option } */
export const ClickToSelect = {
  render: () => html`<hui-variant-picker id="vp-c" label="Kích cỡ" .options=${SIZES}></hui-variant-picker>`,
  play: async ({ canvasElement }) => {
    const vp = canvasElement.querySelector('#vp-c');
    await vp.updateComplete;
    const group = vp.shadowRoot.querySelector('[part="group"]');
    expect(group.getAttribute('role')).toBe('radiogroup');
    const events = [];
    vp.addEventListener('change', (e) => events.push(e.detail.value));
    const items = opts(vp);
    expect(items[0].getAttribute('tabindex')).toBe('0');
    await userEvent.click(items[1]);
    expect(vp.value).toBe('M');
    expect(items[1].getAttribute('aria-checked')).toBe('true');
    expect(vp.shadowRoot.querySelector('[part="selected"]').textContent).toBe('M');
    // L hết hàng
    expect(items[2].getAttribute('aria-disabled')).toBe('true');
    await userEvent.click(items[2]);
    expect(vp.value).toBe('M');
    expect(events).toEqual(['M']);
  },
};

/** Mũi tên chuyển + chọn, bỏ qua mục hết hàng, vòng tròn */
export const Keyboard = {
  render: () => html`<hui-variant-picker id="vp-k" value="M" .options=${SIZES}></hui-variant-picker>`,
  play: async ({ canvasElement }) => {
    const vp = canvasElement.querySelector('#vp-k');
    await vp.updateComplete;
    const items = opts(vp);
    items[1].focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(vp.value).toBe('XL'); // bỏ qua L (hết hàng)
    expect(vp.shadowRoot.activeElement).toBe(items[3]);
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(vp.value).toBe('S'); // vòng về đầu
    await userEvent.keyboard('{ArrowLeft}');
    expect(vp.value).toBe('XXL');
    expect(items[4].getAttribute('tabindex')).toBe('0');
    expect(items[0].getAttribute('tabindex')).toBe('-1');
  },
};

/** Gửi form + required + reset */
export const InForm = {
  render: () => html`
    <form id="vp-f">
      <hui-variant-picker name="color" type="color" required .options=${COLORS}></hui-variant-picker>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#vp-f');
    const vp = form.querySelector('hui-variant-picker');
    await vp.updateComplete;
    expect(vp.checkValidity()).toBe(false);
    await userEvent.click(opts(vp)[2]);
    expect(vp.checkValidity()).toBe(true);
    expect(new FormData(form).get('color')).toBe('red');
    form.reset();
    expect(vp.value).toBe('');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .vp-custom {
        --hui-variant-picker-radius: 6px;
        --hui-variant-picker-active-color: var(--hui-danger);
        --hui-variant-picker-active-bg: var(--hui-danger);
        --hui-variant-picker-gap: 4px;
      }
      .vp-custom::part(option-checked) { color: var(--hui-text-inverse); }
      .vp-custom::part(label) { text-transform: uppercase; letter-spacing: .05em; }
    </style>
    <hui-variant-picker class="vp-custom" label="Size" value="XL" .options=${SIZES}></hui-variant-picker>
  `,
};
