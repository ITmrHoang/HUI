/**
 * Storybook Stories — HUI Spinner
 * Vòng xoay báo trạng thái đang tải: standalone, có tiến độ (determinate),
 * kiểu chấm nhảy và chế độ bọc nội dung (wrapper mode).
 */

import { html } from 'lit';
import './index.js';
import '../hui-button/index.js';

export default {
  // Phân cấp trên sidebar Storybook
  title: 'Components/HuiSpinner',
  // Tên thẻ HTML custom element
  component: 'hui-spinner',
  // Tự sinh trang Docs
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Spinner** — Chỉ báo đang tải, kết hợp Ant Design \`Spin\` và MUI \`CircularProgress\`.
Dùng độc lập như một icon, hoặc bọc quanh nội dung để phủ lớp loading lên trên (wrapper mode).

### Cách sử dụng cơ bản
\`\`\`html
<!-- Standalone -->
<hui-spinner size="md" color="primary" label="Đang tải..."></hui-spinner>

<!-- Có tiến độ (determinate) -->
<hui-spinner value="65"></hui-spinner>

<!-- Wrapper mode: phủ overlay lên nội dung -->
<hui-spinner spinning="true" label="Đang tải dữ liệu">
  <div>Nội dung bên trong</div>
</hui-spinner>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`size\` | string \\| number | \`md\` | Kích thước: sm (16px), md (24px), lg (36px) hoặc số px tự do |
| \`color\` | string | \`primary\` | primary, secondary, success, warning, danger, info, inherit (theo màu chữ) hoặc màu CSS bất kỳ |
| \`thickness\` | number | \`4\` | Độ dày nét vẽ (trên hệ tọa độ 44) — chỉ cho type circular |
| \`type\` | string | \`circular\` | Kiểu hiển thị: circular, dots |
| \`value\` | number | — | 0–100. Có giá trị → vòng tròn tiến độ (determinate). Bỏ trống → xoay vô hạn |
| \`label\` | string | — | Dòng chữ mô tả (Ant \`tip\`), cũng dùng làm aria-label |
| \`label-position\` | string | \`bottom\` | Vị trí label: bottom, right |
| \`spinning\` | string | (đang xoay) | Chỉ có tác dụng ở wrapper mode. Đặt \`"false"\` để tắt overlay |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Nội dung được bọc. Có nội dung → tự chuyển sang wrapper mode (overlay + làm mờ + \`aria-busy\`) |
        `,
      },
    },
  },

  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', '48'],
      description: 'Kích thước spinner (keyword hoặc số px)',
      table: { type: { summary: 'string | number' }, defaultValue: { summary: 'md' } },
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'inherit', '#ec4899'],
      description: 'Màu sắc (biến thể, inherit hoặc màu CSS tự do)',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'primary' } },
    },
    thickness: {
      control: { type: 'number', min: 1, max: 10, step: 0.5 },
      description: 'Độ dày nét vẽ của vòng tròn',
      table: { type: { summary: 'number' }, defaultValue: { summary: '4' } },
    },
    type: {
      control: 'select',
      options: ['circular', 'dots'],
      description: 'Kiểu hiển thị',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'circular' } },
    },
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'Phần trăm tiến độ (bỏ trống = indeterminate)',
      table: { type: { summary: 'number' } },
    },
    label: {
      control: 'text',
      description: 'Dòng chữ mô tả bên dưới / bên phải spinner',
      table: { type: { summary: 'string' } },
    },
    'label-position': {
      control: 'select',
      options: ['bottom', 'right'],
      description: 'Vị trí label',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'bottom' } },
    },
    spinning: {
      control: 'select',
      options: ['true', 'false'],
      description: 'Bật/tắt overlay loading ở wrapper mode',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'true' } },
    },
  },
};

// === STORIES ===

/**
 * Story mặc định — Spinner vòng tròn xoay vô hạn, kích thước trung bình.
 * Thay đổi các controls để thử mọi attribute.
 */
export const Default = {
  render: (args) => html`
    <hui-spinner
      size=${args.size}
      color=${args.color}
      thickness=${args.thickness}
      type=${args.type}
      value=${args.value ?? ''}
      label=${args.label ?? ''}
      label-position=${args['label-position']}
      spinning=${args.spinning}
    ></hui-spinner>
  `,
  args: {
    size: 'md',
    color: 'primary',
    thickness: 4,
    type: 'circular',
    value: undefined,
    label: '',
    'label-position': 'bottom',
    spinning: 'true',
  },
};

/**
 * Có label — Dòng chữ mô tả (giống `tip` của Ant Design), đặt bên dưới hoặc bên phải.
 */
export const WithLabel = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 48px;">
      <hui-spinner label="Đang tải..."></hui-spinner>
      <hui-spinner label="Đang xử lý" label-position="right"></hui-spinner>
    </div>
  `,
};

/**
 * Determinate — Vòng tròn hiển thị đúng phần trăm tiến độ (giống MUI CircularProgress).
 */
export const Determinate = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 24px;">
      <hui-spinner size="lg" value="0"></hui-spinner>
      <hui-spinner size="lg" value="25"></hui-spinner>
      <hui-spinner size="lg" value="50" color="success"></hui-spinner>
      <hui-spinner size="lg" value="75" color="warning"></hui-spinner>
      <hui-spinner size="lg" value="100" color="danger"></hui-spinner>
    </div>
  `,
};

/**
 * Kiểu dots — 3 chấm nhảy lên xuống, phù hợp cho chat/typing indicator.
 */
export const Dots = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 24px;">
      <hui-spinner type="dots" size="sm"></hui-spinner>
      <hui-spinner type="dots"></hui-spinner>
      <hui-spinner type="dots" size="lg" color="info" label="Đang gõ" label-position="right"></hui-spinner>
    </div>
  `,
};

/**
 * Độ dày nét — Thay đổi `thickness` để có vòng mảnh hoặc dày.
 */
export const Thickness = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 24px;">
      <hui-spinner size="lg" thickness="1.5"></hui-spinner>
      <hui-spinner size="lg" thickness="4"></hui-spinner>
      <hui-spinner size="lg" thickness="7"></hui-spinner>
    </div>
  `,
};

/**
 * Tất cả kích thước — sm, md, lg và một size số tự do (56px).
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 24px;">
      <hui-spinner size="sm"></hui-spinner>
      <hui-spinner size="md"></hui-spinner>
      <hui-spinner size="lg"></hui-spinner>
      <hui-spinner size="56"></hui-spinner>
    </div>
  `,
};

/**
 * Tất cả màu sắc — Các biến thể màu, `inherit` (theo màu chữ cha) và màu tự do.
 */
export const AllVariants = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
      <hui-spinner color="primary"></hui-spinner>
      <hui-spinner color="secondary"></hui-spinner>
      <hui-spinner color="success"></hui-spinner>
      <hui-spinner color="warning"></hui-spinner>
      <hui-spinner color="danger"></hui-spinner>
      <hui-spinner color="info"></hui-spinner>
      <span style="color: #ec4899;"><hui-spinner color="inherit"></hui-spinner></span>
      <hui-spinner color="#14b8a6"></hui-spinner>
    </div>
  `,
};

/**
 * Wrapper mode — Bọc nội dung qua slot mặc định. Khi `spinning` khác "false",
 * nội dung bị làm mờ + khóa thao tác, spinner hiển thị chính giữa.
 */
export const WrapperMode = {
  render: (args) => html`
    <hui-spinner
      spinning=${args.spinning}
      label=${args.label}
      size=${args.size}
      style="max-width: 420px;"
    >
      <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: sans-serif;">
        <h4 style="margin: 0 0 8px;">Báo cáo doanh thu</h4>
        <p style="margin: 0 0 12px; color: #475569;">
          Dữ liệu đang được đồng bộ từ máy chủ. Vui lòng chờ trong giây lát.
        </p>
        <hui-button size="sm">Xem chi tiết</hui-button>
      </div>
    </hui-spinner>
  `,
  args: {
    spinning: 'true',
    label: 'Đang tải dữ liệu...',
    size: 'lg',
  },
};

/**
 * Bật/tắt loading — Bấm nút để chuyển `spinning` giữa "true" và "false".
 */
export const ToggleSpinning = {
  render: () => {
    const toggle = (e) => {
      const spinner = e.target.closest('div').querySelector('hui-spinner');
      const next = spinner.getAttribute('spinning') === 'false' ? 'true' : 'false';
      spinner.setAttribute('spinning', next);
    };
    return html`
      <div style="max-width: 420px; display: flex; flex-direction: column; gap: 12px;">
        <hui-button @click=${toggle}>Bật / tắt loading</hui-button>
        <hui-spinner spinning="false" label="Đang tải...">
          <div style="padding: 24px; background: #f1f5f9; border-radius: 8px; font-family: sans-serif;">
            Nội dung có thể được phủ lớp loading.
          </div>
        </hui-spinner>
      </div>
    `;
  },
};
