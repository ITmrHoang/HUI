/**
 * Storybook Stories — HUI Input
 * Ô nhập liệu đa năng với: icon trái/phải, clearable ẩn/hiện, slot prefix/suffix,
 * các trạng thái validation, kích thước.
 */

import { html } from 'lit';
import './index.js';

export default {
  title: 'Components/HuiInput',
  component: 'hui-input',
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Input** — Ô nhập liệu đa năng hỗ trợ icon, clearable, validation states, slots.

### Cách sử dụng cơ bản
\`\`\`html
<hui-input label="Email" placeholder="Nhập email..." type="email"></hui-input>
\`\`\`

### Cách thêm icon (2 cách)

**Cách 1: Attribute icon-left / icon-right (Đơn giản — emoji, text)**
\`\`\`html
<hui-input icon-left="🔍" icon-right="✉️" placeholder="Tìm kiếm..."></hui-input>
\`\`\`

**Cách 2: Slot prefix / suffix (Phức tạp — HTML tùy ý)**
\`\`\`html
<hui-input label="Website">
  <span slot="prefix">https://</span>
  <span slot="suffix">.com</span>
</hui-input>
\`\`\`

> **Lưu ý:** Nếu cùng lúc có cả \`icon-left\` attribute VÀ \`slot="prefix"\`, attribute sẽ được ưu tiên.

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`type\` | string | \`text\` | Loại input: text, email, password, search, number... |
| \`label\` | string | — | Nhãn hiển thị phía trên |
| \`placeholder\` | string | \`''\` | Placeholder text |
| \`value\` | string | \`''\` | Giá trị khởi tạo |
| \`size\` | string | \`md\` | Kích thước: sm, md, lg |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa input |
| \`required\` | boolean | \`false\` | Đánh dấu bắt buộc (dấu *) |
| \`error\` | string | — | Thông báo lỗi (đỏ) |
| \`success\` | string | — | Thông báo thành công (xanh) |
| \`hint\` | string | — | Gợi ý nhỏ phía dưới |
| \`clearable\` | boolean | \`false\` | Hiện nút xóa (✕) — tự ẩn khi input trống |
| \`icon-left\` | string | — | Icon/emoji hiển thị bên trái input |
| \`icon-right\` | string | — | Icon/emoji hiển thị bên phải input |
| \`name\` | string | \`''\` | Thuộc tính name cho form |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` | \`{ value }\` | Phát khi gõ chữ |
| \`change\` | \`{ value }\` | Phát khi blur ra ngoài |
| \`search\` | \`{ value }\` | Phát debounced khi type="search" |
| \`clear\` | — | Phát khi nhấn nút xóa |

### Slots
| Slot | Mô tả |
|------|-------|
| \`prefix\` | Nội dung HTML tùy ý phía trước input (bị ghi đè nếu có icon-left) |
| \`suffix\` | Nội dung HTML tùy ý phía sau input (bị ghi đè nếu có icon-right) |
        `,
      },
    },
  },

  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'number', 'tel', 'url'],
      description: 'Loại ô nhập liệu',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'text' } },
    },
    label: { control: 'text', description: 'Nhãn hiển thị trên ô nhập liệu' },
    'label-position': {
      control: 'select',
      options: ['top', 'inline', 'inside'],
      description: 'Vị trí của label',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'top' } },
    },
    placeholder: { control: 'text', description: 'Placeholder text khi chưa nhập' },
    value: { control: 'text', description: 'Giá trị mặc định' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Kích thước ô nhập liệu',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'md' } },
    },
    disabled: { control: 'boolean', description: 'Vô hiệu hóa ô nhập liệu' },
    required: { control: 'boolean', description: 'Đánh dấu bắt buộc' },
    error: { control: 'text', description: 'Thông báo lỗi (đỏ)' },
    success: { control: 'text', description: 'Thông báo thành công (xanh)' },
    hint: { control: 'text', description: 'Gợi ý nhỏ' },
    clearable: { control: 'boolean', description: 'Hiện nút xóa nhanh (✕) — tự ẩn khi trống' },
    'icon-left': { control: 'text', description: 'Icon/emoji bên trái input' },
    'icon-right': { control: 'text', description: 'Icon/emoji bên phải input' },
  },
};

// === STORIES ===

/**
 * Story mặc định — Input cơ bản có label và placeholder.
 */
export const Default = {
  render: (args) => html`
    <div style="max-width: 400px;">
      <hui-input
        type=${args.type || 'text'}
        label=${args.label || ''}
        label-position=${args['label-position'] || 'top'}
        placeholder=${args.placeholder || ''}
        value=${args.value || ''}
        size=${args.size || 'md'}
        ?disabled=${args.disabled}
        ?required=${args.required}
        ?clearable=${args.clearable}
        error=${args.error || ''}
        success=${args.success || ''}
        hint=${args.hint || ''}
        icon-left=${args['icon-left'] || ''}
        icon-right=${args['icon-right'] || ''}
      ></hui-input>
    </div>
  `,
  args: {
    type: 'text',
    label: 'Tên đăng nhập',
    'label-position': 'top',
    placeholder: 'Nhập tên của bạn...',
    value: '',
    size: 'md',
    disabled: false,
    required: false,
    clearable: false,
    error: '',
    success: '',
    hint: '',
    'icon-left': '',
    'icon-right': '',
  },
};

/**
 * Icon bên trái — Dùng attribute icon-left để thêm emoji/icon đơn giản.
 */
export const IconLeft = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input label="Tìm kiếm" icon-left="🔍" placeholder="Gõ để tìm..." clearable></hui-input>
      <hui-input label="Email" icon-left="✉️" placeholder="user@example.com" type="email"></hui-input>
      <hui-input label="Điện thoại" icon-left="📞" placeholder="0912-345-678" type="tel"></hui-input>
      <hui-input label="Mật khẩu" icon-left="🔒" placeholder="Nhập mật khẩu..." type="password"></hui-input>
    </div>
  `,
};

/**
 * Icon bên phải — Emoji/icon phía sau input.
 */
export const IconRight = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input label="Link" icon-right="🔗" placeholder="https://example.com"></hui-input>
      <hui-input label="Ghi chú" icon-right="📝" placeholder="Thêm ghi chú..."></hui-input>
    </div>
  `,
};

/**
 * Icon hai bên — Kết hợp icon-left và icon-right cùng lúc.
 */
export const IconBothSides = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input label="Tìm kiếm" icon-left="🔍" icon-right="⌘K" placeholder="Tìm kiếm..." clearable></hui-input>
      <hui-input label="Số tiền" icon-left="💰" icon-right="VNĐ" placeholder="0" type="number"></hui-input>
    </div>
  `,
};

/**
 * Clearable (bật/tắt) — Nút ✕ tự hiện khi có text, tự ẩn khi trống.
 */
export const Clearable = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input
        label="Có nút xóa (clearable)"
        placeholder="Gõ gì đó rồi xem nút ✕ hiện ra..."
        clearable
        icon-left="🔍"
        hint="Nút ✕ tự hiện khi có text, ẩn khi trống"
      ></hui-input>
      <hui-input
        label="Đã có value sẵn"
        value="Xóa tôi đi!"
        clearable
        icon-left="📝"
      ></hui-input>
      <hui-input
        label="Không có nút xóa"
        placeholder="Không thể xóa nhanh..."
        value="Không có clearable"
      ></hui-input>
    </div>
  `,
};

/**
 * Input bắt buộc — Hiển thị dấu * sau label.
 */
export const Required = {
  ...Default,
  args: {
    ...Default.args,
    label: 'Email',
    placeholder: 'Nhập email...',
    type: 'email',
    required: true,
    hint: 'Chúng tôi sẽ không chia sẻ email của bạn.',
    'icon-left': '✉️',
  },
};

/**
 * Trạng thái lỗi — Viền đỏ với thông báo lỗi bên dưới.
 */
export const WithError = {
  ...Default,
  args: {
    ...Default.args,
    label: 'Mật khẩu',
    type: 'password',
    value: '123',
    error: 'Mật khẩu phải có ít nhất 8 ký tự.',
    'icon-left': '🔒',
  },
};

/**
 * Trạng thái thành công — Viền xanh với thông báo OK.
 */
export const WithSuccess = {
  ...Default,
  args: {
    ...Default.args,
    label: 'Username',
    value: 'hoang_dev',
    success: 'Tên người dùng hợp lệ!',
    'icon-left': '👤',
    'icon-right': '✅',
  },
};

/**
 * Input có gợi ý — Dòng chữ nhỏ bên dưới hướng dẫn.
 */
export const WithHint = {
  ...Default,
  args: {
    ...Default.args,
    label: 'Số điện thoại',
    type: 'tel',
    placeholder: '0912-345-678',
    hint: 'Nhập số điện thoại 10 chữ số.',
    'icon-left': '📞',
  },
};

/**
 * Input bị khóa — Không cho phép tương tác.
 */
export const Disabled = {
  ...Default,
  args: {
    ...Default.args,
    label: 'Readonly field',
    value: 'Không thể sửa',
    disabled: true,
    'icon-left': '🔒',
  },
};

/**
 * Các chế độ hiển thị Label (label-position).
 */
export const LabelPositions = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 32px; max-width: 400px;">
      <hui-input
        label="Label Top (Mặc định)"
        label-position="top"
        placeholder="Label ở trên..."
      ></hui-input>

      <hui-input
        label="Label Inline"
        label-position="inline"
        placeholder="Label nằm ngang hàng..."
      ></hui-input>

      <hui-input
        label="Label Inside (Floating)"
        label-position="inside"
        placeholder="Gõ để float..."
      ></hui-input>
    </div>
  `,
};

/**
 * Tất cả kích thước — So sánh sm, md, lg.
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input label="Small" size="sm" placeholder="Size sm..." icon-left="📏" clearable></hui-input>
      <hui-input label="Medium" size="md" placeholder="Size md..." icon-left="📐" clearable></hui-input>
      <hui-input label="Large" size="lg" placeholder="Size lg..." icon-left="📏" clearable></hui-input>
    </div>
  `,
};

/**
 * Input có prefix/suffix slot — Kèm nội dung HTML phụ trợ phức tạp (thay vì icon đơn giản).
 */
export const WithSlots = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input label="Website" placeholder="example.com">
        <span slot="prefix">https://</span>
        <span slot="suffix">.com</span>
      </hui-input>
      <hui-input label="Giá tiền" placeholder="0" type="number" clearable>
        <span slot="suffix">VNĐ</span>
      </hui-input>
    </div>
  `,
};
