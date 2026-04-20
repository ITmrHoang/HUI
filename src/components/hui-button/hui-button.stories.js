/**
 * Storybook Stories — HUI Button
 * Mỗi export đặt tên là một "story" (kịch bản) hiển thị component ở một trạng thái khác nhau.
 * Storybook sẽ tự động render từng story thành một trang demo + docs.
 */

import { html } from 'lit';
import './index.js';

export default {
  // Tiêu đề hiển thị trên sidebar Storybook (phân cấp bằng dấu '/')
  title: 'Components/HuiButton',
  // Thẻ HTML gốc mà Storybook sẽ render
  component: 'hui-button',
  // Tag 'autodocs' để Storybook tự sinh trang Docs cho component
  tags: ['autodocs'],

  // Mô tả chi tiết cho trang docs
  parameters: {
    docs: {
      description: {
        component: `
**HUI Button** — Nút bấm đa năng hỗ trợ nhiều biến thể màu sắc, kích thước, và trạng thái.

### Cách sử dụng cơ bản
\`\`\`html
<hui-button variant="primary" size="md">Click Đi</hui-button>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`variant\` | string | \`primary\` | Biến thể: primary, secondary, outline, ghost, danger |
| \`size\` | string | \`md\` | Kích thước: sm, md, lg |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa nút |
| \`loading\` | boolean | \`false\` | Hiển thị spinner đang tải |
| \`block\` | boolean | \`false\` | Nút chiếm full chiều ngang |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-click\` | \`{ originalEvent }\` | Phát ra khi click (không phát khi disabled/loading) |
        `,
      },
    },
  },

  // Định nghĩa Controls Panel — cho phép người dùng thay đổi props trực tiếp trên Storybook UI
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      description: 'Biến thể màu sắc của nút',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Kích thước nút',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Vô hiệu hóa nút bấm',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    loading: {
      control: 'boolean',
      description: 'Hiển thị trạng thái đang tải (spinner)',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    block: {
      control: 'boolean',
      description: 'Nút chiếm toàn bộ chiều ngang',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    label: {
      control: 'text',
      description: 'Nội dung text hiển thị trên nút',
    },
  },
};

// === STORIES (Kịch bản) ===

/**
 * Story mặc định — Primary button kích thước trung bình.
 * Đây là trạng thái phổ biến nhất của nút.
 */
export const Primary = {
  render: (args) => html`
    <hui-button
      variant=${args.variant}
      size=${args.size}
      ?disabled=${args.disabled}
      ?loading=${args.loading}
      ?block=${args.block}
    >
      ${args.label}
    </hui-button>
  `,
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    block: false,
    label: 'Primary Button',
  },
};

/**
 * Nút phụ — Dùng cho hành động thứ cấp, ít nổi bật hơn.
 */
export const Secondary = {
  ...Primary,
  args: {
    ...Primary.args,
    variant: 'secondary',
    label: 'Secondary Button',
  },
};

/**
 * Nút viền — Chỉ có đường viền, nền trong suốt.
 */
export const Outline = {
  ...Primary,
  args: {
    ...Primary.args,
    variant: 'outline',
    label: 'Outline Button',
  },
};

/**
 * Nút ma — Không viền, không nền. Dùng cho action âm thầm.
 */
export const Ghost = {
  ...Primary,
  args: {
    ...Primary.args,
    variant: 'ghost',
    label: 'Ghost Button',
  },
};

/**
 * Nút nguy hiểm — Dùng cho hành động xóa, hủy.
 */
export const Danger = {
  ...Primary,
  args: {
    ...Primary.args,
    variant: 'danger',
    label: 'Danger Button',
  },
};

/**
 * Tất cả kích thước — So sánh sm, md, lg cạnh nhau.
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 12px;">
      <hui-button variant="primary" size="sm">Small</hui-button>
      <hui-button variant="primary" size="md">Medium</hui-button>
      <hui-button variant="primary" size="lg">Large</hui-button>
    </div>
  `,
};

/**
 * Tất cả biến thể — So sánh các variant cạnh nhau.
 */
export const AllVariants = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
      <hui-button variant="primary">Primary</hui-button>
      <hui-button variant="secondary">Secondary</hui-button>
      <hui-button variant="outline">Outline</hui-button>
      <hui-button variant="ghost">Ghost</hui-button>
      <hui-button variant="danger">Danger</hui-button>
    </div>
  `,
};

/**
 * Trạng thái disabled — Nút bị khóa, không thể tương tác.
 */
export const Disabled = {
  ...Primary,
  args: {
    ...Primary.args,
    disabled: true,
    label: 'Disabled Button',
  },
};

/**
 * Trạng thái loading — Hiển thị spinner, nút bị khóa tự động.
 */
export const Loading = {
  ...Primary,
  args: {
    ...Primary.args,
    loading: true,
    label: 'Loading...',
  },
};

/**
 * Block button — Nút chiếm toàn bộ chiều ngang container.
 */
export const Block = {
  render: (args) => html`
    <div style="width: 400px;">
      <hui-button variant="primary" block>${args.label}</hui-button>
    </div>
  `,
  args: {
    label: 'Full Width Button',
  },
};
