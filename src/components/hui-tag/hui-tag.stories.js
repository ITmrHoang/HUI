/**
 * Storybook Stories — HUI Tag
 * Nhãn / Chip nhỏ gọn: phân loại, đánh dấu, lọc. Kết hợp Ant Design Tag/CheckableTag + MUI Chip.
 */

import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import './index.js';

// Icon SVG dùng chung cho các demo slot
const starIcon = html`
  <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
`;

export default {
  // Phân cấp trên sidebar Storybook
  title: 'Components/HuiTag',
  // Tên thẻ HTML custom element
  component: 'hui-tag',
  // Tự sinh trang Docs
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Tag** — Nhãn nhỏ gọn dùng để phân loại, đánh dấu trạng thái hoặc làm bộ lọc. Kết hợp Ant Design Tag / CheckableTag và MUI Chip.

### Cách sử dụng cơ bản
\`\`\`html
<hui-tag color="success">Hoạt động</hui-tag>
<hui-tag color="#f50" variant="filled" closable>Tùy chỉnh</hui-tag>
<hui-tag checkable checked>Có thể chọn</hui-tag>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`color\` | string | — (xám trung tính) | primary, secondary, success, warning, danger, info **hoặc bất kỳ mã màu CSS** (\`#f50\`, \`rgb(...)\`, \`hotpink\`) |
| \`variant\` | string | \`soft\` | soft (nền nhạt), filled (nền đặc), outlined (chỉ viền) |
| \`size\` | string | \`md\` | sm (20px), md (24px), lg (32px) — nhỏ hơn form control (26/32/38px) vì tag là phần tử phụ |
| \`shape\` | string | \`rounded\` | rounded, pill, square |
| \`closable\` | boolean | \`false\` | Hiển thị nút × để xóa tag. Phím Backspace/Delete khi đang focus cũng xóa tag |
| \`clickable\` | boolean | \`false\` | Tag hoạt động như nút bấm: hover/active, focus được, \`role="button"\`, Enter/Space phát \`click\` |
| \`checkable\` | boolean | \`false\` | Tag bật/tắt (Ant CheckableTag): \`role="checkbox"\`, click/Enter/Space để toggle |
| \`checked\` | boolean | \`false\` | Trạng thái được chọn (chỉ có tác dụng khi \`checkable\`) |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa mọi tương tác |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`click\` | — (MouseEvent native) | Phát khi click, hoặc khi nhấn Enter/Space trên tag \`clickable\`/\`checkable\`. Không phát khi disabled |
| \`change\` | \`{ checked }\` | Phát khi tag \`checkable\` được bật/tắt |
| \`close\` | \`{ originalEvent }\` | Phát khi bấm × / Backspace / Delete. **Cancelable**: \`preventDefault()\` để giữ tag lại, nếu không tag tự gắn \`hidden\` |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Nội dung nhãn |
| \`icon\` | Icon phía trước nhãn |
| \`avatar\` | Avatar tròn nhỏ phía trước (giống MUI Chip avatar) |

### Properties & Methods
| Tên | Mô tả |
|-----|-------|
| \`checked\` | Property get/set, phản chiếu attribute \`checked\` |
| \`disabled\` | Property get/set, phản chiếu attribute \`disabled\` |
| \`close()\` | Đóng tag bằng code (vẫn phát event \`close\` có thể hủy). Trả về \`true\` nếu tag đã bị ẩn |
        `,
      },
    },
  },

  // ArgTypes — map 100% observedAttributes
  argTypes: {
    color: {
      control: 'text',
      description: 'Màu preset (primary, secondary, success, warning, danger, info) hoặc mã màu CSS bất kỳ',
      table: { type: { summary: 'string' }, defaultValue: { summary: '— (xám)' } },
    },
    variant: {
      control: 'select',
      options: ['soft', 'filled', 'outlined'],
      description: 'Kiểu hiển thị',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'soft' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Kích thước: 20 / 24 / 32px',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'md' } },
    },
    shape: {
      control: 'select',
      options: ['rounded', 'pill', 'square'],
      description: 'Hình dạng bo góc',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'rounded' } },
    },
    closable: {
      control: 'boolean',
      description: 'Hiển thị nút × để xóa tag',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    clickable: {
      control: 'boolean',
      description: 'Tag có thể click như nút bấm',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    checkable: {
      control: 'boolean',
      description: 'Tag bật/tắt được (CheckableTag)',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    checked: {
      control: 'boolean',
      description: 'Trạng thái được chọn (khi checkable)',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Vô hiệu hóa tag',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    label: {
      control: 'text',
      description: 'Nội dung nhãn (slot mặc định)',
    },
  },
};

// === STORIES (Kịch bản) ===

/**
 * Story mặc định — Tag xám trung tính, kiểu soft, kích thước md.
 * Mọi control trong panel đều được bind vào component.
 */
export const Default = {
  render: (args) => html`
    <hui-tag
      color=${ifDefined(args.color || undefined)}
      variant=${args.variant}
      size=${args.size}
      shape=${args.shape}
      ?closable=${args.closable}
      ?clickable=${args.clickable}
      ?checkable=${args.checkable}
      ?checked=${args.checked}
      ?disabled=${args.disabled}
    >${args.label}</hui-tag>
  `,
  args: {
    color: '',
    variant: 'soft',
    size: 'md',
    shape: 'rounded',
    closable: false,
    clickable: false,
    checkable: false,
    checked: false,
    disabled: false,
    label: 'Tag',
  },
};

/**
 * Filled — Nền đặc màu chủ đạo.
 */
export const Filled = {
  ...Default,
  args: { ...Default.args, color: 'primary', variant: 'filled', label: 'Filled' },
};

/**
 * Outlined — Chỉ có viền màu.
 */
export const Outlined = {
  ...Default,
  args: { ...Default.args, color: 'success', variant: 'outlined', label: 'Outlined' },
};

/**
 * Màu tùy ý — Truyền bất kỳ mã màu CSS nào vào `color` (hex, rgb, tên màu).
 */
export const CustomColors = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <hui-tag color="#f50">#f50</hui-tag>
      <hui-tag color="#2db7f5" variant="filled">#2db7f5</hui-tag>
      <hui-tag color="rgb(135, 208, 104)" variant="outlined">rgb(135,208,104)</hui-tag>
      <hui-tag color="hotpink" variant="filled">hotpink</hui-tag>
      <hui-tag color="#108ee9">#108ee9</hui-tag>
    </div>
  `,
};

/**
 * Closable — Có nút × để xóa. Tag tự ẩn sau khi xóa (trừ khi event `close` bị preventDefault).
 * Focus vào nút × rồi nhấn Backspace/Delete cũng xóa được.
 */
export const Closable = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <hui-tag closable>Xóa được</hui-tag>
      <hui-tag color="primary" closable>Primary</hui-tag>
      <hui-tag color="danger" variant="filled" closable>Danger</hui-tag>
      <hui-tag color="warning" closable @close=${(e) => e.preventDefault()}>Không xóa được (preventDefault)</hui-tag>
    </div>
  `,
};

/**
 * Clickable — Tag hoạt động như nút bấm (role="button", Enter/Space để kích hoạt).
 */
export const Clickable = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <hui-tag clickable color="primary" @click=${() => console.log('click primary')}>Click tôi</hui-tag>
      <hui-tag clickable color="info" variant="filled" @click=${() => console.log('click info')}>Filled clickable</hui-tag>
      <hui-tag clickable closable color="success" @click=${() => console.log('click success')}>Click + xóa</hui-tag>
    </div>
  `,
};

/**
 * Checkable — Bộ lọc dạng tag bật/tắt (Ant CheckableTag). Theo dõi event `change` trong console.
 */
export const Checkable = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap; font-family: sans-serif; font-size: 14px; align-items: center;">
      <span>Danh mục:</span>
      ${['Phim', 'Sách', 'Âm nhạc', 'Thể thao'].map((label, i) => html`
        <hui-tag checkable ?checked=${i === 0}
          @change=${(e) => console.log(label, e.detail.checked)}
        >${label}</hui-tag>
      `)}
      <hui-tag checkable checked color="success">Màu success</hui-tag>
    </div>
  `,
};

/**
 * Disabled — Tag bị vô hiệu hóa, không phản hồi click / bàn phím.
 */
export const Disabled = {
  ...Default,
  args: { ...Default.args, color: 'primary', closable: true, clickable: true, disabled: true, label: 'Disabled' },
};

/**
 * Tất cả kích thước — So sánh sm (20px), md (24px), lg (32px).
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 8px;">
      <hui-tag size="sm" color="primary" closable>Small</hui-tag>
      <hui-tag size="md" color="primary" closable>Medium</hui-tag>
      <hui-tag size="lg" color="primary" closable>Large</hui-tag>
    </div>
  `,
};

/**
 * Tất cả biến thể — Ma trận màu × variant.
 */
export const AllVariants = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${['soft', 'filled', 'outlined'].map((variant) => html`
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <code style="width: 70px;">${variant}</code>
          <hui-tag variant=${variant}>default</hui-tag>
          ${['primary', 'secondary', 'success', 'warning', 'danger', 'info'].map((color) => html`
            <hui-tag variant=${variant} color=${color}>${color}</hui-tag>
          `)}
        </div>
      `)}
    </div>
  `,
};

/**
 * Tất cả hình dạng — rounded, pill, square.
 */
export const AllShapes = {
  render: () => html`
    <div style="display: flex; gap: 8px;">
      <hui-tag color="info" shape="rounded">Rounded</hui-tag>
      <hui-tag color="info" shape="pill">Pill</hui-tag>
      <hui-tag color="info" shape="square">Square</hui-tag>
    </div>
  `,
};

/**
 * Slot demo — Dùng slot `icon` và `avatar` phía trước nhãn.
 */
export const WithSlots = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
      <hui-tag color="warning">${starIcon}Nổi bật</hui-tag>
      <hui-tag color="primary" variant="filled" shape="pill">${starIcon}Yêu thích</hui-tag>
      <hui-tag shape="pill" closable>
        <span slot="avatar" style="background: #64748b; color: #fff; display: inline-flex; align-items: center; justify-content: center;">A</span>
        Nguyễn Văn A
      </hui-tag>
      <hui-tag shape="pill" size="lg" color="info" clickable>
        <span slot="avatar" style="background: var(--hui-info, #3b82f6); color: #fff; display: inline-flex; align-items: center; justify-content: center;">B</span>
        Trần Thị B
      </hui-tag>
    </div>
  `,
};
