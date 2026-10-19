/**
 * Storybook Stories — HUI Notification
 * Thông báo có tiêu đề ở góc màn hình, gọi bằng hàm.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { notification } from './index.js';
import '../hui-button/index.js';

export default {
  title: 'Components/HuiNotification',
  component: 'hui-notification-container',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Notification** — Thông báo có tiêu đề, mô tả, nút hành động ở góc màn hình (Ant \`notification\`).

Container \`<hui-notification-container>\` tự gắn vào \`<body>\`, nằm trên top-layer. Mỗi vị trí là một cột riêng;
rê chuột (hoặc focus) vào thông báo → tạm dừng đếm giờ.

### Cách sử dụng
\`\`\`js
import { notification } from 'hui-lib/hui-notification';

notification.success({ title: 'Đã lưu', description: 'Thay đổi đã được ghi lại.' });
notification.open({
  title: 'Có phiên bản mới',
  description: 'Tải lại trang để cập nhật.',
  duration: 0,                       // không tự đóng
  placement: 'bottomRight',
  actions: [{ label: 'Tải lại', onClick: (close) => { close(); location.reload(); } }],
});
notification.destroy();              // đóng tất cả
\`\`\`

### Hàm
| Hàm | Mô tả |
|-----|-------|
| \`notification.open(options)\` | Thông báo không icon (hoặc truyền \`type\`) |
| \`notification.success / error / warning / info(options)\` | Thông báo kèm icon trạng thái |
| \`notification.config({ placement, duration, maxCount, top, bottom })\` | Cấu hình toàn cục |
| \`notification.destroy(key?)\` | Đóng 1 thông báo theo key, hoặc tất cả |
Mỗi hàm trả về \`close()\` — đồng thời là thenable (\`await\` → đã đóng hẳn).

### Options
| Option | Type | Default | Mô tả |
|--------|------|---------|-------|
| \`title\` | string \\| Node | — | Tiêu đề (alias Ant v4: \`message\`) |
| \`description\` | string \\| Node | — | Mô tả |
| \`duration\` | number | \`4.5\` | Số giây tự đóng; \`0\` = không tự đóng |
| \`placement\` | string | \`'topRight'\` | \`topRight\` \\| \`topLeft\` \\| \`bottomRight\` \\| \`bottomLeft\` \\| \`top\` \\| \`bottom\` |
| \`key\` | string | — | Cùng key → cập nhật thông báo đang hiển thị |
| \`actions\` | \`{ label, variant?, onClick?(close, event) }[]\` | — | Nút hành động (hui-button size sm) |
| \`icon\` | string | theo type | Tên hui-icon |
| \`closable\` | boolean | \`true\` | \`false\` = ẩn nút đóng |
| \`className\` | string | — | Class thêm vào khung thông báo |
| \`onClose\` / \`onClick\` | function | — | Sau khi đóng / click vào thông báo |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-notification-width\` | Chiều rộng (384px) |
| \`--hui-notification-offset\` | Khoảng cách tới mép ngang (24px) |
| \`--hui-notification-top\` / \`--hui-notification-bottom\` | Khoảng cách mép trên / dưới (config ưu tiên hơn) |
| \`--hui-notification-gap\` | Khoảng cách giữa các thông báo |
| \`--hui-notification-bg\` / \`--hui-notification-color\` / \`--hui-notification-title-color\` | Màu |
| \`--hui-notification-radius\` / \`--hui-notification-shadow\` / \`--hui-notification-padding\` | Khung |
| \`--hui-notification-icon-size\` | Kích thước icon |

**Parts:** \`stack\` (kèm \`stack-<placement>\`), \`notice\` (kèm \`notice-<type>\`), \`icon\`, \`main\`, \`title\`, \`description\`, \`actions\`, \`close\`.

### Bàn phím & trợ năng
Mỗi cột có \`aria-live="polite"\`; thông báo \`error\` / \`warning\` có \`role="alert"\`. Nút đóng có \`aria-label\` theo locale
(\`common.close\`). Focus vào thông báo (Tab tới nút) → tạm dừng tự đóng.
        `,
      },
    },
  },
};

const sample = (type) => ({
  title: { success: 'Đã lưu', error: 'Thất bại', warning: 'Cảnh báo', info: 'Thông tin' }[type],
  description: 'Đây là nội dung mô tả của thông báo, có thể dài vài dòng.',
});

/** Các loại thông báo */
export const Default = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <hui-button @hui-click=${() => notification.open({ title: 'Thông báo', description: 'Không có icon.' })}>Open</hui-button>
      <hui-button variant="secondary" @hui-click=${() => notification.success(sample('success'))}>Success</hui-button>
      <hui-button variant="danger" @hui-click=${() => notification.error(sample('error'))}>Error</hui-button>
      <hui-button variant="outline" @hui-click=${() => notification.warning(sample('warning'))}>Warning</hui-button>
      <hui-button variant="ghost" @hui-click=${() => notification.info(sample('info'))}>Info</hui-button>
    </div>
  `,
  // Kiểm thử: hiện → tự đóng; nút X đóng ngay; hover tạm dừng đếm giờ
  play: async () => {
    notification.destroy();
    const done = notification.success({ title: 'Test', description: 'Tự đóng', duration: 0.3, key: 't1' });
    const container = document.querySelector('hui-notification-container');
    const notices = () => container.shadowRoot.querySelectorAll('.notice');
    await waitFor(() => expect(notices().length).toBe(1));
    await expect(container.shadowRoot.querySelector('.stack--topRight .notice')).toBeTruthy();
    await expect(notices()[0].querySelector('[part="title"]').textContent).toBe('Test');
    await done;
    await waitFor(() => expect(notices().length).toBe(0), { timeout: 3000 });

    // Hover → không tự đóng; rời chuột → đóng
    notification.info({ title: 'Hover', duration: 0.3, key: 't2' });
    await waitFor(() => expect(notices().length).toBe(1));
    notices()[0].dispatchEvent(new MouseEvent('mouseenter'));
    await new Promise((r) => setTimeout(r, 600));
    await expect(notices().length).toBe(1);
    notices()[0].dispatchEvent(new MouseEvent('mouseleave'));
    await waitFor(() => expect(notices().length).toBe(0), { timeout: 3000 });

    // Nút X
    let closed = false;
    notification.warning({ title: 'Sticky', duration: 0, onClose: () => { closed = true; } });
    await waitFor(() => expect(notices().length).toBe(1));
    await expect(notices()[0].getAttribute('role')).toBe('alert');
    notices()[0].querySelector('[part="close"]').click();
    await waitFor(() => expect(closed).toBe(true), { timeout: 3000 });
  },
};

/** 6 vị trí */
export const Placements = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(3, max-content); gap: 8px;">
      ${['topLeft', 'top', 'topRight', 'bottomLeft', 'bottom', 'bottomRight'].map((p) => html`
        <hui-button variant="outline" @hui-click=${() => notification.info({ title: p, description: `placement: '${p}'`, placement: p })}>${p}</hui-button>
      `)}
    </div>
  `,
};

/** Nút hành động + không tự đóng (duration 0) */
export const WithActions = {
  render: () => html`
    <hui-button
      @hui-click=${() => notification.open({
        title: 'Có phiên bản mới',
        description: 'Tải lại trang để dùng phiên bản mới nhất.',
        duration: 0,
        actions: [
          { label: 'Để sau', variant: 'ghost', onClick: (close) => close() },
          { label: 'Tải lại', onClick: (close) => { close(); notification.success({ title: 'Đã cập nhật' }); } },
        ],
      })}
    >Thông báo có nút</hui-button>
  `,
};

/** Cập nhật theo key */
export const UpdateByKey = {
  render: () => html`
    <hui-button
      @hui-click=${() => {
        notification.info({ key: 'upload', title: 'Đang tải lên...', description: '0%', duration: 0 });
        setTimeout(() => notification.success({ key: 'upload', title: 'Tải lên xong', description: '100%' }), 1500);
      }}
    >Tải lên (cập nhật cùng key)</hui-button>
  `,
};

/** Override từ bên ngoài — biến CSS trên :root và ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      :root {
        --hui-notification-width: 320px;
        --hui-notification-radius: 4px;
      }
      hui-notification-container::part(notice-success) {
        border-left: 4px solid var(--hui-success);
      }
      hui-notification-container::part(title) {
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
    </style>
    <hui-button @hui-click=${() => notification.success({ title: 'Tùy biến', description: 'Viền trái + tiêu đề in hoa.' })}>Thông báo tùy biến</hui-button>
  `,
};
