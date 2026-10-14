/**
 * Storybook Stories — HUI Divider
 * Đường phân cách nội dung ngang/dọc, có thể kèm chữ. Kết hợp Ant Design Divider + MUI Divider.
 */

import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import './index.js';

// Đoạn văn mẫu để minh họa divider nằm giữa các khối nội dung
const para = html`
  <p style="margin: 0; font-family: sans-serif; font-size: 14px; color: #475569;">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero.
  </p>
`;

export default {
  // Phân cấp trên sidebar Storybook
  title: 'Components/HuiDivider',
  // Tên thẻ HTML custom element
  component: 'hui-divider',
  // Tự sinh trang Docs
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Divider** — Đường phân cách giữa các khối nội dung (ngang) hoặc giữa các phần tử inline (dọc). Kết hợp Ant Design Divider và MUI Divider.

### Cách sử dụng cơ bản
\`\`\`html
<hui-divider></hui-divider>
<hui-divider text-align="left">Tiêu đề</hui-divider>
<a>Link 1</a><hui-divider orientation="vertical"></hui-divider><a>Link 2</a>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`orientation\` | string | \`horizontal\` | horizontal (ngang) hoặc vertical (dọc, inline-block cao 0.9em) |
| \`text-align\` | string | \`center\` | Vị trí chữ trên divider ngang: center, left, right (tương đương \`orientation\` của Ant) |
| \`variant\` | string | \`solid\` | Kiểu nét: solid, dashed, dotted |
| \`plain\` | boolean | \`false\` | Chữ nhỏ, mảnh và nhạt hơn (Ant \`plain\`) |
| \`spacing\` | string | \`md\` | Khoảng cách: none (0), sm (8px), md (16px), lg (24px). Divider dọc: 0 / 4 / 8 / 12px hai bên |
| \`inset\` | boolean \\| string | — | Thụt lề trái (MUI inset). Để trống = 72px, hoặc truyền độ dài CSS (vd: \`inset="40px"\`) |
| \`color\` | string | \`--hui-border\` | Ghi đè màu đường kẻ (mã màu CSS bất kỳ) |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Chữ nằm trên đường kẻ (chỉ với divider ngang). Không có nội dung → chỉ hiển thị đường kẻ |

### Accessibility
- \`role="separator"\` kèm \`aria-orientation\` tương ứng.
        `,
      },
    },
  },

  // ArgTypes — map 100% observedAttributes
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Hướng của divider',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'horizontal' } },
    },
    textAlign: {
      name: 'text-align',
      control: 'select',
      options: ['center', 'left', 'right'],
      description: 'Vị trí chữ trên divider ngang',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'center' } },
    },
    variant: {
      control: 'select',
      options: ['solid', 'dashed', 'dotted'],
      description: 'Kiểu nét kẻ',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'solid' } },
    },
    plain: {
      control: 'boolean',
      description: 'Chữ dạng thường (nhỏ, mảnh)',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    spacing: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Khoảng cách margin',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'md' } },
    },
    inset: {
      control: 'text',
      description: 'Thụt lề trái. Để trống = không thụt; "default" = 72px; hoặc độ dài CSS (vd: 40px)',
      table: { type: { summary: 'boolean | string' } },
    },
    color: {
      control: 'color',
      description: 'Màu đường kẻ',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'var(--hui-border)' } },
    },
    label: {
      control: 'text',
      description: 'Chữ hiển thị trên divider (slot mặc định)',
    },
  },
};

// === STORIES (Kịch bản) ===

/**
 * Story mặc định — Divider ngang có chữ ở giữa.
 * Mọi control trong panel đều được bind vào component.
 * Control `inset`: nhập "default" để dùng thụt lề mặc định 72px.
 */
export const Default = {
  render: (args) => html`
    ${para}
    <hui-divider
      orientation=${args.orientation}
      text-align=${args.textAlign}
      variant=${args.variant}
      ?plain=${args.plain}
      spacing=${args.spacing}
      inset=${ifDefined(args.inset ? (args.inset === 'default' ? '' : args.inset) : undefined)}
      color=${ifDefined(args.color || undefined)}
    >${args.label}</hui-divider>
    ${para}
  `,
  args: {
    orientation: 'horizontal',
    textAlign: 'center',
    variant: 'solid',
    plain: false,
    spacing: 'md',
    inset: '',
    color: '',
    label: 'Văn bản',
  },
};

/**
 * Không có chữ — Chỉ là một đường kẻ ngang đơn giản.
 */
export const WithoutText = {
  ...Default,
  args: { ...Default.args, label: '' },
};

/**
 * Vị trí chữ — left, center, right (giống Ant `orientation`).
 */
export const TextAlign = {
  render: () => html`
    ${para}
    <hui-divider text-align="left">Trái</hui-divider>
    ${para}
    <hui-divider text-align="center">Giữa</hui-divider>
    ${para}
    <hui-divider text-align="right">Phải</hui-divider>
    ${para}
  `,
};

/**
 * Chữ plain — Nhỏ, mảnh, nhạt hơn (giống Ant `plain`).
 */
export const PlainText = {
  ...Default,
  args: { ...Default.args, plain: true, label: 'Chữ plain' },
};

/**
 * Divider dọc — Chen giữa các phần tử inline (link, text).
 */
export const Vertical = {
  render: () => html`
    <div style="font-family: sans-serif; font-size: 14px;">
      <a href="#">Trang chủ</a>
      <hui-divider orientation="vertical"></hui-divider>
      <a href="#">Sản phẩm</a>
      <hui-divider orientation="vertical" variant="dashed"></hui-divider>
      <a href="#">Liên hệ</a>
    </div>
  `,
};

/**
 * Inset — Thụt lề trái như MUI, thường dùng trong danh sách có avatar/icon.
 */
export const Inset = {
  render: () => html`
    <div style="font-family: sans-serif; font-size: 14px; max-width: 360px;">
      <div style="padding: 8px 16px;">Mục 1</div>
      <hui-divider inset spacing="none"></hui-divider>
      <div style="padding: 8px 16px;">Mục 2</div>
      <hui-divider inset="16px" spacing="none"></hui-divider>
      <div style="padding: 8px 16px;">Mục 3 (inset 16px phía trên)</div>
    </div>
  `,
};

/**
 * Màu tùy biến — Ghi đè màu đường kẻ bằng attribute `color`.
 */
export const CustomColor = {
  render: () => html`
    <hui-divider color="#6366f1">Primary</hui-divider>
    <hui-divider color="#ef4444" variant="dashed">Danger dashed</hui-divider>
    <hui-divider color="#10b981"></hui-divider>
  `,
};

/**
 * Tất cả kích thước (spacing) — So sánh khoảng cách none, sm, md, lg.
 */
export const AllSizes = {
  name: 'All Sizes (Spacing)',
  render: () => html`
    ${['none', 'sm', 'md', 'lg'].map((spacing) => html`
      ${para}
      <hui-divider spacing=${spacing} text-align="left" plain>spacing="${spacing}"</hui-divider>
    `)}
    ${para}
  `,
};

/**
 * Tất cả biến thể — solid, dashed, dotted (có và không có chữ).
 */
export const AllVariants = {
  render: () => html`
    ${['solid', 'dashed', 'dotted'].map((variant) => html`
      <hui-divider variant=${variant}></hui-divider>
      <hui-divider variant=${variant}>${variant}</hui-divider>
    `)}
  `,
};

/**
 * Slot demo — Nội dung slot có thể là HTML phong phú (icon, chữ in đậm...).
 */
export const WithSlot = {
  render: () => html`
    <hui-divider>
      <span style="display: inline-flex; align-items: center; gap: 6px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <strong>Nổi bật</strong>
      </span>
    </hui-divider>
    <hui-divider text-align="right" plain>
      <a href="#">Xem thêm →</a>
    </hui-divider>
  `,
};
