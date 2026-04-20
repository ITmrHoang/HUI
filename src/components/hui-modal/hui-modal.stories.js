/**
 * Storybook Stories — HUI Modal
 * Hộp thoại popup hỗ trợ: kích thước, đóng/mở, overlay click, ESC key, slots.
 */

import { html } from 'lit';
import './index.js';
// Import button để dùng trong demo mở/đóng modal
import '../hui-button/index.js';

export default {
  title: 'Components/HuiModal',
  component: 'hui-modal',
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Modal** — Hộp thoại popup đa năng với hiệu ứng mượt mà.

### Cách sử dụng cơ bản
\`\`\`html
<hui-modal title="Tiêu đề" open>
  <p>Nội dung modal ở đây...</p>
  <div slot="footer">
    <hui-button variant="primary">Xác nhận</hui-button>
  </div>
</hui-modal>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`open\` | boolean | \`false\` | Hiển thị/ẩn modal |
| \`title\` | string | \`''\` | Tiêu đề modal |
| \`size\` | string | \`md\` | Kích thước: sm, md, lg, full |
| \`closable\` | string | \`'true'\` | Cho phép đóng (nút X, ESC) |
| \`close-on-overlay\` | string | \`'true'\` | Đóng khi click overlay |

### Events
| Event | Mô tả |
|-------|-------|
| \`hui-open\` | Phát khi modal mở |
| \`hui-close\` | Phát khi modal đóng |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Nội dung body chính |
| \`footer\` | Khu vực footer (thường chứa các nút hành động) |

### Methods
| Method | Mô tả |
|--------|-------|
| \`open()\` | Mở modal từ JS |
| \`close()\` | Đóng modal từ JS |
        `,
      },
    },
    // Chạy modal trong layout fullscreen để tránh bị cắt bởi iframe Storybook
    layout: 'fullscreen',
  },

  argTypes: {
    title: {
      control: 'text',
      description: 'Tiêu đề hiển thị trên header modal',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'full'],
      description: 'Kích thước modal',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
      },
    },
    open: {
      control: 'boolean',
      description: 'Trạng thái mở/đóng',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    closable: {
      control: 'select',
      options: ['true', 'false'],
      description: 'Cho phép đóng modal',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'true' },
      },
    },
    closeOnOverlay: {
      control: 'select',
      options: ['true', 'false'],
      description: 'Đóng khi click vào overlay nền tối',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'true' },
      },
    },
  },
};

// === HELPER: Hàm tạo nút mở modal bằng JS ===
const openModal = (id) => {
  // Tìm modal theo id rồi gọi method .open()
  const modal = document.querySelector(`#${id}`);
  if (modal) modal.open();
};

// === STORIES ===

/**
 * Story mặc định — Modal cơ bản với nút mở.
 * Click "Mở Modal" để xem demo.
 */
export const Default = {
  render: (args) => html`
    <hui-button variant="primary" @hui-click=${() => openModal('modal-default')}>
      Mở Modal
    </hui-button>

    <hui-modal
      id="modal-default"
      title=${args.title}
      size=${args.size}
      ?open=${args.open}
      closable=${args.closable}
      close-on-overlay=${args.closeOnOverlay}
    >
      <p>Đây là nội dung bên trong modal. Bạn có thể đặt bất kỳ HTML nào vào đây.</p>
      <p>Nhấn <strong>ESC</strong>, nút <strong>✕</strong>, hoặc click vào vùng tối bên ngoài để đóng.</p>
      <div slot="footer">
        <hui-button variant="ghost" @hui-click=${() => {
          document.querySelector('#modal-default')?.close();
        }}>Hủy</hui-button>
        <hui-button variant="primary">Xác nhận</hui-button>
      </div>
    </hui-modal>
  `,
  args: {
    title: 'Tiêu đề Modal',
    size: 'md',
    open: false,
    closable: 'true',
    closeOnOverlay: 'true',
  },
};

/**
 * Modal nhỏ (sm) — Dùng cho confirm dialog ngắn gọn.
 */
export const Small = {
  render: () => html`
    <hui-button variant="primary" @hui-click=${() => openModal('modal-sm')}>
      Mở Modal Small
    </hui-button>

    <hui-modal id="modal-sm" title="Xác nhận xóa" size="sm">
      <p>Bạn có chắc chắn muốn xóa item này? Hành động này không thể hoàn tác.</p>
      <div slot="footer">
        <hui-button variant="ghost" @hui-click=${() => {
          document.querySelector('#modal-sm')?.close();
        }}>Hủy</hui-button>
        <hui-button variant="danger">Xóa</hui-button>
      </div>
    </hui-modal>
  `,
};

/**
 * Modal lớn (lg) — Dùng cho nội dung phức tạp, form dài.
 */
export const Large = {
  render: () => html`
    <hui-button variant="primary" @hui-click=${() => openModal('modal-lg')}>
      Mở Modal Large
    </hui-button>

    <hui-modal id="modal-lg" title="Thông tin chi tiết" size="lg">
      <div>
        <h3 style="margin-top: 0;">Phần 1: Giới thiệu</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <h3>Phần 2: Nội dung</h3>
        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        <h3>Phần 3: Kết luận</h3>
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      </div>
      <div slot="footer">
        <hui-button variant="ghost" @hui-click=${() => {
          document.querySelector('#modal-lg')?.close();
        }}>Đóng</hui-button>
        <hui-button variant="primary">Lưu thay đổi</hui-button>
      </div>
    </hui-modal>
  `,
};

/**
 * Modal toàn màn hình (full) — Chiếm gần hết viewport.
 */
export const FullScreen = {
  render: () => html`
    <hui-button variant="primary" @hui-click=${() => openModal('modal-full')}>
      Mở Modal Full Screen
    </hui-button>

    <hui-modal id="modal-full" title="Chế độ toàn màn hình" size="full">
      <p>Modal này chiếm gần toàn bộ màn hình. Phù hợp cho editor, preview, hoặc dashboard nội bộ.</p>
      <div slot="footer">
        <hui-button variant="ghost" @hui-click=${() => {
          document.querySelector('#modal-full')?.close();
        }}>Đóng</hui-button>
      </div>
    </hui-modal>
  `,
};

/**
 * Modal không cho đóng — closable="false", không có nút X, ESC không hoạt động.
 * Phải xử lý bằng code riêng.
 */
export const NotClosable = {
  render: () => html`
    <hui-button variant="danger" @hui-click=${() => openModal('modal-lock')}>
      Mở Modal Bắt Buộc
    </hui-button>

    <hui-modal id="modal-lock" title="⚠️ Cảnh báo quan trọng" size="sm" closable="false" close-on-overlay="false">
      <p>Modal này <strong>không thể đóng</strong> bằng ESC hay click overlay. Bạn phải nhấn nút bên dưới.</p>
      <div slot="footer">
        <hui-button variant="primary" @hui-click=${() => {
          document.querySelector('#modal-lock')?.close();
        }}>Tôi đã hiểu</hui-button>
      </div>
    </hui-modal>
  `,
};

/**
 * So sánh kích thước — Hiển thị cả 4 size cạnh nhau (qua các nút).
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
      <hui-button variant="outline" @hui-click=${() => openModal('sz-sm')}>Small</hui-button>
      <hui-button variant="outline" @hui-click=${() => openModal('sz-md')}>Medium</hui-button>
      <hui-button variant="outline" @hui-click=${() => openModal('sz-lg')}>Large</hui-button>
      <hui-button variant="outline" @hui-click=${() => openModal('sz-full')}>Full</hui-button>
    </div>

    <hui-modal id="sz-sm" title="Small Modal" size="sm">
      <p>Kích thước: 400px</p>
    </hui-modal>
    <hui-modal id="sz-md" title="Medium Modal" size="md">
      <p>Kích thước: 560px</p>
    </hui-modal>
    <hui-modal id="sz-lg" title="Large Modal" size="lg">
      <p>Kích thước: 800px</p>
    </hui-modal>
    <hui-modal id="sz-full" title="Full Modal" size="full">
      <p>Kích thước: 95vw</p>
    </hui-modal>
  `,
};
