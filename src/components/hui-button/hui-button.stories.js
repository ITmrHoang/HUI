/**
 * Storybook Stories — HUI Button
 * Mỗi export đặt tên là một "story" (kịch bản) hiển thị component ở một trạng thái khác nhau.
 * Storybook sẽ tự động render từng story thành một trang demo + docs.
 */

import { html, nothing } from 'lit';
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
| \`variant\` | string | \`primary\` | Biến thể: primary, secondary, outline, dashed, ghost, text, link, danger |
| \`shape\` | string | \`default\` | Hình dạng: default, round, circle |
| \`icon\` | string | — | Tên icon (xem HuiIcon) |
| \`icon-position\` | string | \`start\` | Vị trí icon: start, end |
| \`type\` | string | \`button\` | button, submit, reset — submit/reset tác động lên form chứa nút |
| \`size\` | string | \`md\` | Kích thước: sm, md, lg |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa nút |
| \`loading\` | boolean | \`false\` | Hiển thị spinner đang tải |
| \`block\` | boolean | \`false\` | Nút chiếm full chiều ngang |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-click\` | \`{ originalEvent }\` | Phát ra khi click (không phát khi disabled/loading) |

### Mọi attribute đều có property tương ứng
\`\`\`js
btn.variant = 'danger';
btn.loading = true; // attribute "loading" tự được thêm vào thẻ
\`\`\`

### Override giao diện từ bên ngoài
| Cách | Ví dụ |
|------|-------|
| Biến CSS (đặt trên nút, thẻ cha hoặc :root) | \`.toolbar { --hui-button-radius: 999px; }\` |
| \`::part()\` | \`hui-button::part(label) { text-transform: uppercase; }\` |
| Slot | \`<svg slot="icon">…</svg>\`, \`<span slot="suffix">→</span>\` |

**Biến CSS:** \`--hui-button-height\`, \`--hui-button-padding-x\`, \`--hui-button-font-size\`, \`--hui-button-font-weight\`,
\`--hui-button-radius\`, \`--hui-button-gap\`, \`--hui-button-bg\`, \`--hui-button-color\`, \`--hui-button-border-color\`,
\`--hui-button-hover-bg\`, \`--hui-button-hover-color\`, \`--hui-button-shadow\`, \`--hui-button-focus-color\`.

**Parts:** \`base\`, \`label\`, \`icon\`, \`spinner\`.
        `,
      },
    },
  },

  // Định nghĩa Controls Panel — cho phép người dùng thay đổi props trực tiếp trên Storybook UI
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'dashed', 'ghost', 'text', 'link', 'danger'],
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
    shape: {
      control: 'select',
      options: ['default', 'round', 'circle'],
      description: 'Hình dạng nút',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'default' } },
    },
    icon: {
      control: 'select',
      options: ['', 'plus', 'search', 'download', 'edit', 'delete', 'check'],
      description: 'Tên icon hiển thị cạnh chữ',
    },
    iconPosition: {
      control: 'inline-radio',
      options: ['start', 'end'],
      description: 'Vị trí icon (attribute: icon-position)',
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
      shape=${args.shape}
      icon=${args.icon || nothing}
      icon-position=${args.iconPosition}
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
    shape: 'default',
    icon: '',
    iconPosition: 'start',
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
      <hui-button variant="dashed">Dashed</hui-button>
      <hui-button variant="ghost">Ghost</hui-button>
      <hui-button variant="text">Text</hui-button>
      <hui-button variant="link">Link</hui-button>
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

/**
 * Icon & hình dạng — icon theo tên, icon phía sau chữ, nút tròn chỉ có icon, icon qua slot.
 */
export const WithIcons = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
      <hui-button icon="plus">Thêm mới</hui-button>
      <hui-button variant="outline" icon="download">Tải xuống</hui-button>
      <hui-button variant="dashed" icon="plus">Thêm dòng</hui-button>
      <hui-button variant="text" icon="chevron-right" icon-position="end">Tiếp theo</hui-button>
      <hui-button shape="round" icon="search">Tìm kiếm</hui-button>
      <hui-button shape="circle" icon="search" aria-label="Tìm kiếm"></hui-button>
      <hui-button shape="circle" variant="danger" icon="delete" aria-label="Xóa"></hui-button>
      <hui-button variant="secondary"><span slot="icon">⭐</span>Icon qua slot</hui-button>
    </div>
  `,
};

/**
 * Override từ bên ngoài — biến CSS đặt trên thẻ cha, class riêng và ::part().
 * Không cần sửa code thư viện.
 */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .demo-pill { --hui-button-radius: 999px; --hui-button-padding-x: 22px; }
      hui-button.brand {
        --hui-button-bg: #0f172a;
        --hui-button-border-color: #0f172a;
        --hui-button-hover-bg: #334155;
        --hui-button-color: #fbbf24;
      }
      hui-button.caps::part(label) { text-transform: uppercase; letter-spacing: 0.08em; }
    </style>
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div class="demo-pill" style="display: flex; gap: 12px;">
        <hui-button>Biến CSS trên thẻ cha</hui-button>
        <hui-button variant="outline">Áp cho mọi nút con</hui-button>
      </div>
      <div style="display: flex; gap: 12px;">
        <hui-button class="brand" icon="star">Màu thương hiệu</hui-button>
        <hui-button class="caps" variant="secondary">::part(label)</hui-button>
      </div>
    </div>
  `,
};

/**
 * Property JS + form — đổi `btn.loading` bằng code (attribute tự cập nhật),
 * nút type="submit"/"reset" hoạt động với form bên ngoài Shadow DOM.
 */
export const PropertyAndForm = {
  render: () => html`
    <form
      style="display: flex; gap: 12px; align-items: center;"
      @submit=${(e) => {
        e.preventDefault();
        const btn = e.target.querySelector('hui-button[type="submit"]');
        btn.loading = true;
        setTimeout(() => (btn.loading = false), 1500);
      }}
    >
      <input name="q" placeholder="Nhập gì đó" />
      <hui-button type="submit" icon="check">Gửi form</hui-button>
      <hui-button type="reset" variant="ghost">Reset</hui-button>
    </form>
  `,
};
