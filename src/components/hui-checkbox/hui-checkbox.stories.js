/**
 * Storybook Stories — HUI Checkbox
 */

import { html } from 'lit';
import './index.js';

export default {
  title: 'Components/HuiCheckbox',
  component: 'hui-checkbox',
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Checkbox** — Component hộp kiểm đa năng.

Hỗ trợ các tính năng:
- **Trạng thái**: \`checked\`, \`indeterminate\` (chưa xác định), \`disabled\`.
- **Vị trí nhãn (label)**: Bên phải (mặc định) hoặc bên trái (\`label-position="left"\`), hoặc đứng một mình không nhãn.
- **Biến thể màu sắc**: \`primary\` (mặc định), \`success\`, \`danger\`, \`warning\`.
- **Kích thước**: \`sm\`, \`md\`, \`lg\`.
- **Validation**: \`required\`, \`error\`.

### Cách sử dụng cơ bản
\`\`\`html
<hui-checkbox label="Tôi đồng ý với điều khoản"></hui-checkbox>
\`\`\`

### Các thuộc tính (Attributes)
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`label\` | string | — | Nội dung nhãn kế bên checkbox |
| \`label-position\` | string | \`'right'\` | Vị trí của nhãn: \`'left'\` hoặc \`'right'\` |
| \`checked\` | boolean | \`false\` | Có đang được chọn hay không |
| \`indeterminate\` | boolean | \`false\` | Trạng thái hiển thị dấu gạch ngang (-) |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa checkbox |
| \`required\` | boolean | \`false\` | Hiển thị dấu * đỏ bắt buộc |
| \`size\` | string | \`'md'\` | Kích thước: \`'sm'\`, \`'md'\`, \`'lg'\` |
| \`variant\` | string | \`'primary'\` | Màu sắc: \`'primary'\`, \`'success'\`, \`'warning'\`, \`'danger'\` |
| \`error\` | string | — | Chuỗi thông báo lỗi (viền đỏ) |
| \`name\` / \`value\` | string | — / \`'on'\` | Tên field và giá trị gửi lên \`<form>\` khi được chọn |

Tham gia \`<form>\` như \`<input type="checkbox">\` (FormData, reset, \`<fieldset disabled>\`, \`required\` = phải chọn).

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ checked, value }\` | Người dùng bật/tắt |
| \`input\` | \`{ checked, value }\` | Phát cùng lúc với \`change\` |
| \`hui-change\` | \`{ checked, value }\` | Tên cũ, giữ để tương thích |

### Slot
| Slot | Mô tả |
|------|-------|
| (mặc định) | Nhãn (thay cho attribute \`label\`) |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-checkbox-size\` | Cạnh ô vuông |
| \`--hui-checkbox-radius\` | Bo góc ô |
| \`--hui-checkbox-gap\` | Khoảng cách ô ↔ nhãn |
| \`--hui-checkbox-bg\` / \`--hui-checkbox-border-color\` | Nền / viền ô khi chưa chọn |
| \`--hui-checkbox-hover-border-color\` | Viền ô khi hover |
| \`--hui-checkbox-checked-bg\` | Nền + viền khi đã chọn |
| \`--hui-checkbox-check-color\` | Màu dấu check |
| \`--hui-checkbox-focus-ring\` | box-shadow khi focus bàn phím |
| \`--hui-checkbox-label-color\` / \`--hui-checkbox-font-size\` | Màu / cỡ chữ nhãn |

**Parts:** \`base\`, \`control\`, \`box\`, \`icon\`, \`label\`, \`message\`.
              `
      }
    }
  },

  argTypes: {
    label: { control: 'text' },
    'label-position': { control: 'radio', options: ['left', 'right'] },
    checked: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'select', options: ['primary', 'success', 'warning', 'danger'] },
    error: { control: 'text' },
  }
};

/** 
 * Story: Default 
 */
export const Default = {
  render: (args) => html`
    <hui-checkbox
      label=${args.label || ''}
      label-position=${args['label-position'] || 'right'}
      size=${args.size || 'md'}
      variant=${args.variant || 'primary'}
      ?checked=${args.checked}
      ?indeterminate=${args.indeterminate}
      ?disabled=${args.disabled}
      ?required=${args.required}
      error=${args.error || ''}
    ></hui-checkbox>
  `,
  args: {
    label: 'Đồng ý điều khoản',
    'label-position': 'right',
    checked: false,
    indeterminate: false,
    disabled: false,
    required: false,
    size: 'md',
    variant: 'primary',
    error: ''
  }
};

/** 
 * Story: Label Positions (Trái / Phải hoặc Không lable)
 */
export const LabelPositions = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: flex-end;">
      <hui-checkbox label="Nhãn bên phải mặc định"></hui-checkbox>
      <hui-checkbox label="Nhãn nằm bên trái" label-position="left"></hui-checkbox>
      <hui-checkbox></hui-checkbox> <!-- Không lable -->
    </div>
  `
};

/** 
 * Story: States (Trạng thái)
 */
export const States = {
  render: () => html`
    <div style="display: flex; gap: 24px;">
      <hui-checkbox label="Unchecked"></hui-checkbox>
      <hui-checkbox label="Checked" checked></hui-checkbox>
      <hui-checkbox label="Indeterminate" indeterminate></hui-checkbox>
      <hui-checkbox label="Disabled" disabled></hui-checkbox>
      <hui-checkbox label="Disabled Checked" disabled checked></hui-checkbox>
    </div>
  `
};

/** 
 * Story: Variants (Màu đổi màu được)
 */
export const Variants = {
  render: () => html`
    <div style="display: flex; gap: 24px;">
      <hui-checkbox label="Primary" variant="primary" checked></hui-checkbox>
      <hui-checkbox label="Success" variant="success" checked></hui-checkbox>
      <hui-checkbox label="Warning" variant="warning" checked></hui-checkbox>
      <hui-checkbox label="Danger" variant="danger" checked></hui-checkbox>
    </div>
  `
};

/** 
 * Story: Sizes (Kích thước)
 */
export const Sizes = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: center;">
      <hui-checkbox label="Small" size="sm"></hui-checkbox>
      <hui-checkbox label="Medium" size="md"></hui-checkbox>
      <hui-checkbox label="Large" size="lg"></hui-checkbox>
    </div>
  `
};

/** 
 * Story: Validation (Bắt buộc / Lỗi)
 */
export const Validation = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <hui-checkbox label="Phải check vào em" required></hui-checkbox>
      <hui-checkbox label="Bạn chưa đồng ý điều khoản" error="Vui lòng xác nhận để tiếp tục"></hui-checkbox>
    </div>
  `
};

/**
 * Override từ bên ngoài — biến CSS đặt trên thẻ cha / class riêng và ::part().
 */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .demo-round { --hui-checkbox-radius: 50%; --hui-checkbox-size: 20px; }
      hui-checkbox.brand {
        --hui-checkbox-checked-bg: var(--hui-success);
        --hui-checkbox-border-color: var(--hui-success);
      }
      hui-checkbox.caps::part(label) { text-transform: uppercase; letter-spacing: 0.06em; }
      hui-checkbox.caps::part(box) { border-width: 2px; }
    </style>
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div class="demo-round" style="display: flex; gap: 24px;">
        <hui-checkbox label="Biến CSS trên thẻ cha" checked></hui-checkbox>
        <hui-checkbox label="Áp cho mọi checkbox con"></hui-checkbox>
      </div>
      <div style="display: flex; gap: 24px;">
        <hui-checkbox class="brand" label="Màu riêng" checked></hui-checkbox>
        <hui-checkbox class="caps" label="::part(label) + ::part(box)" checked></hui-checkbox>
        <hui-checkbox>Nhãn qua <b>slot</b></hui-checkbox>
      </div>
    </div>
  `,
};

/**
 * Tham gia form — name/value/required. Submit để xem dữ liệu, Đặt lại trả về trạng thái ban đầu.
 */
export const InForm = {
  render: () => html`
    <form
      style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;"
      @submit=${(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        e.target.querySelector('output').textContent = JSON.stringify(data);
      }}
    >
      <hui-checkbox name="newsletter" value="yes" label="Nhận bản tin" checked></hui-checkbox>
      <hui-checkbox name="terms" label="Tôi đồng ý điều khoản" required></hui-checkbox>
      <div style="display: flex; gap: 8px;">
        <button type="submit">Gửi</button>
        <button type="reset">Đặt lại</button>
      </div>
      <output>{}</output>
    </form>
  `,
};
