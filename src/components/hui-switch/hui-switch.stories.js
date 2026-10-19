/**
 * Storybook Stories — HUI Switch
 * Công tắc bật/tắt kết hợp Ant Design Switch + MUI Switch: loading, chữ trong track, form.
 */

import { html } from 'lit';
import './index.js';
// Import button để dùng trong demo form
import '../hui-button/index.js';

export default {
  title: 'Components/HuiSwitch',
  component: 'hui-switch',
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Switch** — Công tắc bật/tắt, kết hợp API của Ant Design Switch và MUI Switch.

Render một \`<button role="switch" aria-checked>\` thật: Tab để focus, Space/Enter để bật/tắt.
Tham gia \`<form>\` như \`<input type="checkbox">\` nhờ ElementInternals.

### Cách sử dụng cơ bản
\`\`\`html
<hui-switch label="Nhận thông báo" checked></hui-switch>
<hui-switch checked-text="BẬT" unchecked-text="TẮT" color="success"></hui-switch>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`checked\` | boolean | \`false\` | Trạng thái bật |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa |
| \`loading\` | boolean | \`false\` | Spinner trong nút tròn, không thao tác được |
| \`size\` | string | \`'md'\` | Kích thước: \`sm\`, \`md\`, \`lg\` |
| \`color\` | string | \`'primary'\` | Màu khi bật: \`primary\`, \`secondary\`, \`success\`, \`warning\`, \`danger\`, \`info\` |
| \`label\` | string | — | Nhãn chữ cạnh công tắc |
| \`label-position\` | string | \`'right'\` | Vị trí nhãn: \`left\` hoặc \`right\` |
| \`checked-text\` | string | — | Chữ trong track khi bật (Ant checkedChildren) |
| \`unchecked-text\` | string | — | Chữ trong track khi tắt (Ant unCheckedChildren) |
| \`name\` | string | — | Tên field khi submit form |
| \`value\` | string | \`'on'\` | Giá trị gửi lên form khi bật |
| \`required\` | boolean | \`false\` | Bắt buộc bật mới submit được form (dấu * đỏ) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ checked: boolean, value: string }\` | Phát khi người dùng bật/tắt (không phát khi đổi bằng JS) |

### Slots
| Slot | Mô tả |
|------|-------|
| _(không có)_ | Nội dung truyền qua attribute \`label\`, \`checked-text\`, \`unchecked-text\` |

### Methods & Properties
| Tên | Mô tả |
|-----|-------|
| \`toggle()\` | Đảo trạng thái (không phát \`change\`) |
| \`checked\` | Property get/set, phản chiếu sang attribute |
| \`value\`, \`disabled\` | Property get/set |
| \`checkValidity()\`, \`reportValidity()\` | Kiểm tra hợp lệ (khi \`required\`) |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-switch-height\` / \`--hui-switch-width\` | Chiều cao / độ rộng tối thiểu track |
| \`--hui-switch-thumb-size\` | Cỡ nút tròn |
| \`--hui-switch-track-bg\` / \`--hui-switch-track-hover-bg\` | Màu track khi tắt / tắt + hover |
| \`--hui-switch-checked-bg\` | Màu track khi bật (đè \`color\`) |
| \`--hui-switch-thumb-bg\` / \`--hui-switch-thumb-shadow\` | Màu / bóng nút tròn |
| \`--hui-switch-text-color\` | Màu chữ trong track |
| \`--hui-switch-label-color\` / \`--hui-switch-gap\` | Màu nhãn / khoảng cách track ↔ nhãn |
| \`--hui-switch-focus-color\` | Màu viền focus |

**Parts:** \`base\`, \`track\`, \`thumb\`, \`text\`, \`label\`.
        `,
      },
    },
  },

  argTypes: {
    checked: { control: 'boolean', description: 'Trạng thái bật', table: { defaultValue: { summary: 'false' } } },
    disabled: { control: 'boolean', description: 'Vô hiệu hóa', table: { defaultValue: { summary: 'false' } } },
    loading: { control: 'boolean', description: 'Đang tải', table: { defaultValue: { summary: 'false' } } },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Kích thước',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'md' } },
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'info'],
      description: 'Màu khi bật',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'primary' } },
    },
    label: { control: 'text', description: 'Nhãn chữ', table: { type: { summary: 'string' } } },
    'label-position': {
      control: 'radio',
      options: ['left', 'right'],
      description: 'Vị trí nhãn',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'right' } },
    },
    'checked-text': { control: 'text', description: 'Chữ trong track khi bật', table: { type: { summary: 'string' } } },
    'unchecked-text': { control: 'text', description: 'Chữ trong track khi tắt', table: { type: { summary: 'string' } } },
    name: { control: 'text', description: 'Tên field trong form', table: { type: { summary: 'string' } } },
    value: { control: 'text', description: 'Giá trị gửi lên form khi bật', table: { type: { summary: 'string' }, defaultValue: { summary: 'on' } } },
    required: { control: 'boolean', description: 'Bắt buộc bật', table: { defaultValue: { summary: 'false' } } },
  },
};

// === STORIES ===

/**
 * Story mặc định — công tắc có nhãn, mọi attribute được bind với Controls.
 */
export const Default = {
  render: (args) => html`
    <hui-switch
      ?checked=${args.checked}
      ?disabled=${args.disabled}
      ?loading=${args.loading}
      size=${args.size}
      color=${args.color}
      label=${args.label}
      label-position=${args['label-position']}
      checked-text=${args['checked-text'] || ''}
      unchecked-text=${args['unchecked-text'] || ''}
      name=${args.name}
      value=${args.value}
      ?required=${args.required}
      @change=${(e) => console.log('[hui-switch] change', e.detail)}
    ></hui-switch>
  `,
  args: {
    checked: false,
    disabled: false,
    loading: false,
    size: 'md',
    color: 'primary',
    label: 'Nhận thông báo',
    'label-position': 'right',
    'checked-text': '',
    'unchecked-text': '',
    name: 'notify',
    value: 'on',
    required: false,
  },
};

/**
 * Các trạng thái — tắt, bật, disabled, disabled + bật.
 */
export const States = {
  render: () => html`
    <div style="display: flex; gap: 24px; flex-wrap: wrap;">
      <hui-switch label="Tắt"></hui-switch>
      <hui-switch label="Bật" checked></hui-switch>
      <hui-switch label="Disabled" disabled></hui-switch>
      <hui-switch label="Disabled bật" disabled checked></hui-switch>
    </div>
  `,
};

/**
 * Loading — spinner xoay trong nút tròn, không thể bật/tắt.
 */
export const Loading = {
  render: () => html`
    <div style="display: flex; gap: 24px;">
      <hui-switch label="Đang lưu..." loading></hui-switch>
      <hui-switch label="Đang lưu..." loading checked></hui-switch>
    </div>
  `,
};

/**
 * Tất cả kích thước — sm, md, lg (thẳng hàng với chiều cao form control 26/32/38px).
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: center;">
      <hui-switch size="sm" label="Small" checked></hui-switch>
      <hui-switch size="md" label="Medium" checked></hui-switch>
      <hui-switch size="lg" label="Large" checked></hui-switch>
    </div>
  `,
};

/**
 * Tất cả màu — primary, secondary, success, warning, danger, info.
 */
export const AllVariants = {
  render: () => html`
    <div style="display: flex; gap: 24px; flex-wrap: wrap;">
      ${['primary', 'secondary', 'success', 'warning', 'danger', 'info'].map(
        (c) => html`<hui-switch color=${c} label=${c} checked></hui-switch>`
      )}
    </div>
  `,
};

/**
 * Chữ trong track — giống checkedChildren / unCheckedChildren của Ant Design.
 */
export const WithInnerText = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: center;">
      <hui-switch size="sm" checked-text="BẬT" unchecked-text="TẮT"></hui-switch>
      <hui-switch checked-text="BẬT" unchecked-text="TẮT" checked></hui-switch>
      <hui-switch size="lg" color="success" checked-text="ON" unchecked-text="OFF"></hui-switch>
    </div>
  `,
};

/**
 * Vị trí nhãn — bên phải (mặc định), bên trái, hoặc không có nhãn.
 */
export const LabelPositions = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: center;">
      <hui-switch label="Nhãn bên phải"></hui-switch>
      <hui-switch label="Nhãn bên trái" label-position="left"></hui-switch>
      <hui-switch aria-label="Không nhãn"></hui-switch>
    </div>
  `,
};

/**
 * Tham gia form — name/value/required. Submit để xem dữ liệu gửi đi;
 * nếu switch "required" chưa bật, trình duyệt sẽ chặn submit.
 */
export const InForm = {
  render: () => html`
    <form
      style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;"
      @submit=${(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        e.target.querySelector('#switch-form-output').textContent = JSON.stringify(data);
      }}
    >
      <hui-switch name="newsletter" value="yes" label="Đăng ký bản tin" checked></hui-switch>
      <hui-switch name="terms" label="Tôi đồng ý điều khoản" required></hui-switch>
      <div style="display: flex; gap: 8px;">
        <button type="submit">Gửi</button>
        <button type="reset">Đặt lại</button>
      </div>
      <code id="switch-form-output">{}</code>
    </form>
  `,
};

/**
 * Điều khiển bằng JS — gọi method toggle() và lắng nghe sự kiện change.
 */
export const Methods = {
  render: () => html`
    <div style="display: flex; gap: 16px; align-items: center;">
      <hui-switch
        id="switch-methods"
        label="Wi-Fi"
        @change=${(e) => {
          document.querySelector('#switch-methods-log').textContent = `change: ${JSON.stringify(e.detail)}`;
        }}
      ></hui-switch>
      <hui-button size="sm" variant="outline" @click=${() => document.querySelector('#switch-methods')?.toggle()}>
        toggle()
      </hui-button>
      <span id="switch-methods-log" style="font-size: 12px; color: #64748b;">Chưa có sự kiện</span>
    </div>
  `,
};

/**
 * Override từ bên ngoài — biến CSS đặt trên thẻ cha / class riêng và ::part().
 */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .demo-big { --hui-switch-height: 30px; --hui-switch-width: 60px; --hui-switch-thumb-size: 24px; }
      hui-switch.brand {
        --hui-switch-checked-bg: var(--hui-warning);
        --hui-switch-track-bg: var(--hui-danger-3);
        --hui-switch-thumb-bg: var(--hui-bg-tertiary);
      }
      hui-switch.square::part(track) { border-radius: var(--hui-radius-sm); }
      hui-switch.square::part(thumb) { border-radius: 3px; }
      hui-switch.square::part(label) { font-style: italic; }
    </style>
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div class="demo-big" style="display: flex; gap: 24px;">
        <hui-switch label="Biến CSS trên thẻ cha" checked></hui-switch>
        <hui-switch label="Áp cho mọi switch con" checked-text="ON" unchecked-text="OFF"></hui-switch>
      </div>
      <div style="display: flex; gap: 24px;">
        <hui-switch class="brand" label="Màu riêng" checked></hui-switch>
        <hui-switch class="brand" label="Màu riêng (tắt)"></hui-switch>
        <hui-switch class="square" label="::part(track | thumb | label)" checked></hui-switch>
      </div>
    </div>
  `,
};
