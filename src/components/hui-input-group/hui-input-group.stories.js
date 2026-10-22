/**
 * Storybook Stories — HUI Input Group (ghép nhiều control liền viền)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-input/index.js';
import '../hui-select/index.js';
import '../hui-button/index.js';
import '../hui-input-number/index.js';
import '../hui-autocomplete/index.js';

export default {
  title: 'Molecules/HuiInputGroup',
  component: 'hui-input-group',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Input Group** — ghép nhiều control liền nhau thành một khối (Ant Space.Compact / Input.Group):
viền giữa gộp làm một, chỉ bo góc 2 đầu, control đang focus nổi lên trên để thấy viền màu.

\`\`\`html
<hui-input-group>
  <hui-select .options=\${['https://', 'http://']} value="https://"></hui-select>
  <hui-input placeholder="ten-mien"></hui-input>
  <hui-button>Kiểm tra</hui-button>
</hui-input-group>
<hui-input-group><span slot="before">₫</span><hui-input-number></hui-input-number><span slot="after">/ tháng</span></hui-input-group>
\`\`\`

### Attributes
| Attribute | Kiểu | Mặc định | Mô tả |
|-----------|------|----------|-------|
| \`compact\` | boolean | — | Co theo nội dung (inline-flex) thay vì giãn hết chiều ngang |
| \`size\` | \`sm \\| md \\| lg\` | — | Áp cho control con chưa tự đặt \`size\` (và addon) |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Control: hui-input, hui-select, hui-button, hui-autocomplete, hui-search, hui-input-number, \`<input>\`, \`<button>\` |
| \`before\` / \`after\` | Hộp chữ gắn trước / sau (vd "https://", ".com", "VNĐ") |

### Parts
\`base\`, \`addon-before\`, \`addon-after\`

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-input-group-radius\` | Bo góc 2 đầu khối |
| \`--hui-input-group-addon-bg\` / \`--hui-input-group-addon-color\` / \`--hui-input-group-border-color\` | Hộp addon |

Bo góc từng control được nhóm điều khiển qua \`--hui-input-radius\`, \`--hui-select-radius\`, \`--hui-button-radius\`,
\`--hui-autocomplete-radius\`, \`--hui-search-radius\`, \`--hui-input-number-radius\`.

### A11y
\`role="group"\` — đặt \`aria-label\` trên thẻ để đặt tên nhóm. Thứ tự Tab giữ nguyên của từng control.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <div style="max-width:520px">
      <hui-input-group aria-label="Địa chỉ web">
        <hui-select style="width:110px" .options=${['https://', 'http://']} value="https://"></hui-select>
        <hui-input placeholder="ten-mien-cua-ban"></hui-input>
        <hui-button>Kiểm tra</hui-button>
      </hui-input-group>
    </div>
  `,
};

/** Addon chữ trước / sau */
export const Addons = {
  render: () => html`
    <div style="display:grid;gap:12px;max-width:420px">
      <hui-input-group aria-label="Website"><span slot="before">https://</span><hui-input placeholder="example"></hui-input><span slot="after">.com</span></hui-input-group>
      <hui-input-group aria-label="Giá"><span slot="before">₫</span><hui-input-number placeholder="0"></hui-input-number><span slot="after">/ tháng</span></hui-input-group>
      <hui-input-group aria-label="Email"><hui-input placeholder="ten"></hui-input><span slot="after">@congty.vn</span></hui-input-group>
    </div>
  `,
};

/** Kích thước truyền xuống control + compact co theo nội dung */
export const SizesAndCompact = {
  render: () => html`
    <div style="display:grid;gap:12px;max-width:520px">
      <hui-input-group id="ig-sm" size="sm" aria-label="sm"><hui-input placeholder="sm"></hui-input><hui-button>Gửi</hui-button></hui-input-group>
      <hui-input-group size="md" aria-label="md"><hui-input placeholder="md"></hui-input><hui-button>Gửi</hui-button></hui-input-group>
      <hui-input-group size="lg" aria-label="lg"><hui-input placeholder="lg"></hui-input><hui-button>Gửi</hui-button></hui-input-group>
      <div><hui-input-group compact aria-label="compact"><hui-input style="width:160px" placeholder="compact"></hui-input><hui-button variant="outline" icon="search" aria-label="Tìm"></hui-button></hui-input-group></div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('#ig-sm');
    const input = group.querySelector('hui-input');
    const btn = group.querySelector('hui-button');
    await waitFor(() => expect(input.getAttribute('size')).toBe('sm'));
    expect(btn.getAttribute('size')).toBe('sm');
    // Gộp viền: control đầu bo trái, vuông phải; control sau đè 1px
    const box = input.shadowRoot.querySelector('[part="container"]');
    const cs = getComputedStyle(box);
    expect(cs.borderTopRightRadius).toBe('0px');
    expect(cs.borderTopLeftRadius).not.toBe('0px');
    expect(getComputedStyle(btn).marginInlineStart).toBe('-1px');
    expect(getComputedStyle(btn.shadowRoot.querySelector('button')).borderTopLeftRadius).toBe('0px');
  },
};

/** Thẻ native + hui-autocomplete trong nhóm */
export const MixedControls = {
  render: () => html`
    <div style="display:grid;gap:12px;max-width:520px">
      <hui-input-group aria-label="Tìm thành phố">
        <hui-select style="width:120px" .options=${['Thành phố', 'Quận']} value="Thành phố"></hui-select>
        <hui-autocomplete placeholder="Gõ tên..." .options=${['Hà Nội', 'Huế', 'Đà Nẵng', 'Hồ Chí Minh']}></hui-autocomplete>
      </hui-input-group>
      <hui-input-group aria-label="Mã giảm giá"><input placeholder="Mã giảm giá" aria-label="Mã giảm giá" /><button type="button">Áp dụng</button></hui-input-group>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .ig-pill {
        --hui-input-group-radius: 999px;
        --hui-input-group-addon-bg: var(--hui-primary-light);
        --hui-input-group-addon-color: var(--hui-primary);
      }
      .ig-pill::part(addon-before) { font-weight: 600; }
    </style>
    <div style="max-width:420px">
      <hui-input-group class="ig-pill" aria-label="Pill"><span slot="before">@</span><hui-input placeholder="username"></hui-input><hui-button>Theo dõi</hui-button></hui-input-group>
    </div>
  `,
};
