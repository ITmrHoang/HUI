/**
 * Storybook Stories — HUI Alert
 * Hộp thông báo trạng thái (info / success / warning / error), kết hợp API Ant Design + MUI.
 */

import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import './index.js';
import '../hui-button/index.js'; // Component phụ trợ cho demo slot action

export default {
  // Phân cấp trên sidebar Storybook
  title: 'Components/HuiAlert',
  // Tên thẻ HTML custom element
  component: 'hui-alert',
  // Tự sinh trang Docs
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Alert** — Hộp thông báo trạng thái, hiển thị thông điệp ngắn gọn cho người dùng. Kết hợp Ant Design Alert và MUI Alert.

### Cách sử dụng cơ bản
\`\`\`html
<hui-alert severity="success" title="Thành công" closable>
  Dữ liệu đã được lưu.
</hui-alert>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`severity\` | string | \`info\` | Mức độ: info, success, warning, error |
| \`type\` | string | — | Alias của \`severity\` (giống Ant). Nếu có cả hai thì \`severity\` được ưu tiên |
| \`variant\` | string | \`standard\` | Kiểu hiển thị: standard (nền nhạt), filled (nền đặc), outlined (chỉ viền) |
| \`title\` | string | — | Tiêu đề (Ant \`message\` / MUI \`AlertTitle\`). Có thể thay bằng slot \`title\` |
| \`description\` | string | — | Nội dung mô tả. Slot mặc định (nếu có) sẽ thay thế attribute này |
| \`hide-icon\` | boolean | \`false\` | Ẩn icon (mặc định icon luôn hiển thị như MUI) |
| \`closable\` | boolean | \`false\` | Hiển thị nút đóng |
| \`close-text\` | string | — | Text hiển thị thay cho icon × ở nút đóng |
| \`banner\` | boolean | \`false\` | Dạng dải ngang đầu trang: không bo góc, không viền 2 bên |
| \`size\` | string | \`md\` | Kích thước (padding, cỡ chữ): sm, md, lg |
| \`hidden\` | boolean | \`false\` | Thuộc tính HTML chuẩn — được tự động gắn sau khi alert đóng xong. Xóa đi để hiện lại |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`close\` | \`null\` | Phát ra khi bắt đầu đóng. **Cancelable**: gọi \`event.preventDefault()\` để giữ alert lại |
| \`after-close\` | \`null\` | Phát ra sau khi animation đóng kết thúc và alert đã được gắn \`hidden\` |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Nội dung mô tả — ưu tiên hơn attribute \`description\` |
| \`title\` | Tiêu đề tùy biến — ưu tiên hơn attribute \`title\` |
| \`icon\` | Icon tùy biến thay cho icon mặc định theo severity |
| \`action\` | Vùng hành động bên phải (nút bấm, link...) |

### Methods
| Method | Mô tả |
|--------|-------|
| \`close()\` | Đóng alert bằng code (vẫn phát event \`close\` có thể hủy và \`after-close\`) |

### Accessibility
- \`role="alert"\` cho error/warning (đọc ngay), \`role="status"\` cho info/success.
- Nút đóng là \`<button>\` thật, có \`aria-label="Đóng"\`, dùng được bằng bàn phím.
        `,
      },
    },
  },

  // ArgTypes — map 100% observedAttributes
  argTypes: {
    severity: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
      description: 'Mức độ thông báo',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'info' } },
    },
    type: {
      control: 'select',
      options: ['', 'info', 'success', 'warning', 'error'],
      description: 'Alias của severity (API Ant Design). severity được ưu tiên',
      table: { type: { summary: 'string' }, defaultValue: { summary: '—' } },
    },
    variant: {
      control: 'select',
      options: ['standard', 'filled', 'outlined'],
      description: 'Kiểu hiển thị',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'standard' } },
    },
    title: {
      control: 'text',
      description: 'Tiêu đề alert',
      table: { type: { summary: 'string' } },
    },
    description: {
      control: 'text',
      description: 'Nội dung mô tả (bị thay thế nếu có slot mặc định)',
      table: { type: { summary: 'string' } },
    },
    hideIcon: {
      name: 'hide-icon',
      control: 'boolean',
      description: 'Ẩn icon',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    closable: {
      control: 'boolean',
      description: 'Hiển thị nút đóng',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    closeText: {
      name: 'close-text',
      control: 'text',
      description: 'Text thay cho icon × ở nút đóng',
      table: { type: { summary: 'string' } },
    },
    banner: {
      control: 'boolean',
      description: 'Dạng banner full width, không bo góc',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Kích thước',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'md' } },
    },
  },
};

// === STORIES (Kịch bản) ===

/**
 * Story mặc định — Alert info dạng standard, có title và mô tả.
 * Mọi control trong panel đều được bind vào component.
 */
export const Default = {
  render: (args) => html`
    <hui-alert
      severity=${args.severity}
      type=${ifDefined(args.type || undefined)}
      variant=${args.variant}
      title=${ifDefined(args.title || undefined)}
      description=${ifDefined(args.description || undefined)}
      ?hide-icon=${args.hideIcon}
      ?closable=${args.closable}
      close-text=${ifDefined(args.closeText || undefined)}
      ?banner=${args.banner}
      size=${args.size}
    ></hui-alert>
  `,
  args: {
    severity: 'info',
    type: '',
    variant: 'standard',
    title: 'Thông tin',
    description: 'Phiên bản mới đã sẵn sàng. Tải lại trang để cập nhật.',
    hideIcon: false,
    closable: false,
    closeText: '',
    banner: false,
    size: 'md',
  },
};

/**
 * Success — Thông báo thao tác thành công.
 */
export const Success = {
  ...Default,
  args: { ...Default.args, severity: 'success', title: 'Thành công', description: 'Dữ liệu đã được lưu.' },
};

/**
 * Warning — Cảnh báo người dùng cần chú ý (role="alert").
 */
export const Warning = {
  ...Default,
  args: { ...Default.args, severity: 'warning', title: 'Cảnh báo', description: 'Dung lượng lưu trữ sắp đầy.' },
};

/**
 * Error — Báo lỗi (role="alert", trình đọc màn hình đọc ngay lập tức).
 * Đặt tên export là ErrorState để tránh che khuất class Error có sẵn của JS.
 */
export const ErrorState = {
  ...Default,
  name: 'Error',
  args: { ...Default.args, severity: 'error', title: 'Lỗi', description: 'Không thể kết nối tới máy chủ.' },
};

/**
 * Chỉ có title — Alert gọn một dòng (giống Ant Alert chỉ có `message`).
 */
export const TitleOnly = {
  ...Default,
  args: { ...Default.args, description: '', title: 'Đây là thông báo một dòng' },
};

/**
 * Filled — Nền đặc màu chủ đạo, chữ trắng.
 */
export const Filled = {
  ...Default,
  args: { ...Default.args, variant: 'filled', severity: 'success', title: 'Đã gửi', description: 'Email xác nhận đã được gửi.' },
};

/**
 * Outlined — Chỉ có viền màu, nền trong suốt.
 */
export const Outlined = {
  ...Default,
  args: { ...Default.args, variant: 'outlined', severity: 'warning', title: 'Lưu ý', description: 'Phiên đăng nhập sẽ hết hạn sau 5 phút.' },
};

/**
 * Closable — Có nút đóng. Bấm × để xem animation thu gọn, sau đó alert được gắn `hidden`.
 */
export const Closable = {
  ...Default,
  args: { ...Default.args, closable: true, title: 'Có thể đóng', description: 'Bấm nút × để đóng alert này.' },
};

/**
 * Close text — Nút đóng hiển thị text thay vì icon × (giống Ant `closeText`).
 */
export const CloseText = {
  ...Default,
  args: { ...Default.args, closable: true, closeText: 'Đã hiểu', severity: 'warning', title: 'Thông báo bảo trì', description: 'Hệ thống bảo trì lúc 22:00 tối nay.' },
};

/**
 * Hủy đóng — Lắng nghe event `close` và gọi preventDefault() để xác nhận trước khi đóng.
 * Kèm nút "Hiện lại" để xóa attribute `hidden`.
 */
export const PreventClose = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-alert
        id="alert-prevent"
        severity="error"
        title="Xác nhận trước khi đóng"
        description="Bấm × sẽ hỏi xác nhận (event close bị preventDefault nếu bạn chọn Hủy)."
        closable
        @close=${(e) => { if (!window.confirm('Đóng alert này?')) e.preventDefault(); }}
        @after-close=${() => console.log('after-close')}
      ></hui-alert>
      <div>
        <hui-button variant="outline" size="sm"
          @hui-click=${() => document.getElementById('alert-prevent').removeAttribute('hidden')}
        >Hiện lại</hui-button>
      </div>
    </div>
  `,
};

/**
 * Ẩn icon — Dùng attribute `hide-icon`.
 */
export const HideIcon = {
  ...Default,
  args: { ...Default.args, hideIcon: true, title: 'Không có icon', description: 'Alert không hiển thị icon.' },
};

/**
 * Banner — Dải thông báo full width đầu trang, không bo góc và không viền 2 bên.
 */
export const Banner = {
  ...Default,
  args: { ...Default.args, banner: true, severity: 'warning', title: '', description: 'Bạn đang xem phiên bản thử nghiệm.', closable: true },
};

/**
 * Alias `type` — Dùng API kiểu Ant Design (`type="success"`) thay vì `severity`.
 */
export const TypeAlias = {
  render: () => html`
    <hui-alert type="success" title="Dùng type (Ant Design)" description="type='success' tương đương severity='success'."></hui-alert>
  `,
};

/**
 * Tất cả kích thước — So sánh sm, md, lg.
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-alert size="sm" title="Small" description="Alert kích thước nhỏ."></hui-alert>
      <hui-alert size="md" title="Medium" description="Alert kích thước trung bình."></hui-alert>
      <hui-alert size="lg" title="Large" description="Alert kích thước lớn."></hui-alert>
    </div>
  `,
};

/**
 * Tất cả biến thể — Ma trận severity × variant.
 */
export const AllVariants = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
      ${['standard', 'filled', 'outlined'].map((variant) => html`
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <strong style="font-family: sans-serif; font-size: 13px;">${variant}</strong>
          ${['info', 'success', 'warning', 'error'].map((severity) => html`
            <hui-alert variant=${variant} severity=${severity} title=${severity}></hui-alert>
          `)}
        </div>
      `)}
    </div>
  `,
};

/**
 * Slot demo — Dùng slot `title`, `icon`, `action` và slot mặc định (HTML phong phú).
 */
export const WithSlots = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-alert severity="info" closable>
        <span slot="title">Có bản cập nhật <em>v2.0</em></span>
        Xem <a href="#">ghi chú phát hành</a> để biết thêm chi tiết.
        <hui-button slot="action" size="sm" variant="outline">Cập nhật</hui-button>
      </hui-alert>

      <hui-alert severity="success" title="Icon tùy biến">
        <svg slot="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        Slot icon thay thế icon mặc định.
      </hui-alert>

      <hui-alert severity="error" variant="filled" title="Thanh toán thất bại">
        Thẻ của bạn đã bị từ chối.
        <hui-button slot="action" size="sm" variant="secondary">Thử lại</hui-button>
      </hui-alert>
    </div>
  `,
};
