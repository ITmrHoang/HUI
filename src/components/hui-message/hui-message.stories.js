/**
 * Storybook Stories — HUI Message
 * Thông báo ngắn gọi bằng hàm, hiện giữa phía trên màn hình.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { message } from './index.js';
import '../hui-button/index.js';
import '../hui-modal/index.js';

export default {
  title: 'Components/HuiMessage',
  component: 'hui-message-container',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Message** — Thông báo ngắn gọi bằng hàm (Ant \`message\` + MUI Snackbar), hiển thị giữa phía trên, tự đóng.

Container \`<hui-message-container>\` tự gắn vào \`<body>\` ở lần gọi đầu, nằm trên **top-layer** (Popover API,
\`popover="manual"\`) nên luôn nằm trên Modal / Drawer — kể cả Modal mở sau message. Vùng chứa có \`aria-live="polite"\`.

### Cách sử dụng
\`\`\`js
import { message } from '@itmrhoang/h-ui/hui-message';

message.success('Đã lưu');
message.error('Lỗi kết nối', { duration: 5 });

// loading → success: cùng key thì cập nhật thông báo cũ
message.loading('Đang lưu...', { key: 'save', duration: 0 });
await api.save();
message.success('Đã lưu', { key: 'save' });

// Giá trị trả về: hàm đóng, đồng thời là thenable
const close = message.info('Đang xử lý', { duration: 0 });
close();                 // đóng ngay
await message.info('Chờ tôi đóng');   // resolve khi đã đóng hẳn
\`\`\`

### Hàm
| Hàm | Mô tả |
|-----|-------|
| \`message.success / error / warning / info / loading(content, options?)\` | Hiện message. \`options\` là object hoặc số giây (kiểu Ant: \`(content, duration, onClose)\`) |
| \`message.open({ type, content, ... })\` | Dạng đầy đủ |
| \`message.config({ top, maxCount, duration })\` | Cấu hình toàn cục: khoảng cách mép trên, số message tối đa, thời lượng mặc định |
| \`message.destroy(key?)\` | Đóng 1 message theo key, hoặc tất cả |

### Options
| Option | Type | Default | Mô tả |
|--------|------|---------|-------|
| \`content\` | string \\| Node | — | Nội dung (chuỗi chèn dạng text, không phải HTML) |
| \`duration\` | number | \`3\` | Số giây tự đóng; \`0\` = không tự đóng. Rê chuột vào → tạm dừng đếm |
| \`key\` | string | — | Cùng key → cập nhật message đang hiển thị |
| \`icon\` | string \\| false | theo type | Tên hui-icon thay icon mặc định; \`false\` = ẩn |
| \`className\` | string | — | Class thêm vào khung message |
| \`onClose\` | function | — | Gọi sau khi đóng hẳn |
| \`onClick\` | function | — | Click vào message |

### Override giao diện từ bên ngoài
Container nằm trong \`<body>\` → đặt biến trên \`:root\` (hoặc \`body\`); style sâu bằng \`hui-message-container::part(...)\`.
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-message-top\` | Khoảng cách tới mép trên (8px; \`config({ top })\` ưu tiên hơn) |
| \`--hui-message-gap\` | Khoảng cách giữa các message |
| \`--hui-message-bg\` / \`--hui-message-color\` | Nền / màu chữ |
| \`--hui-message-radius\` / \`--hui-message-shadow\` | Bo góc / đổ bóng |
| \`--hui-message-padding\` / \`--hui-message-font-size\` | Padding / cỡ chữ |
| \`--hui-message-icon-size\` | Kích thước icon |

**Parts:** \`list\`, \`notice\` (kèm \`notice-success\` / \`notice-error\` / \`notice-warning\` / \`notice-info\` / \`notice-loading\`), \`icon\`, \`content\`.

### Bàn phím & trợ năng
Message không nhận focus (không làm gián đoạn thao tác); nội dung được đọc qua vùng \`aria-live="polite"\`.
        `,
      },
    },
  },
};

/** Các loại message — bấm để hiện */
export const Default = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <hui-button @hui-click=${() => message.info('Đây là một thông báo')}>Info</hui-button>
      <hui-button variant="secondary" @hui-click=${() => message.success('Đã lưu thay đổi')}>Success</hui-button>
      <hui-button variant="danger" @hui-click=${() => message.error('Không thể kết nối máy chủ')}>Error</hui-button>
      <hui-button variant="outline" @hui-click=${() => message.warning('Bạn chưa lưu bản nháp')}>Warning</hui-button>
      <hui-button variant="ghost" @hui-click=${() => message.loading('Đang tải dữ liệu...')}>Loading</hui-button>
    </div>
  `,
  // Kiểm thử: message xuất hiện trên top-layer rồi tự đóng sau thời lượng ngắn; await handle resolve khi đóng
  play: async () => {
    message.destroy();
    const close = message.success('Đã lưu (test)', { duration: 0.3 });
    const container = document.querySelector('hui-message-container');
    const notices = () => container.shadowRoot.querySelectorAll('.notice');

    await waitFor(() => expect(notices().length).toBe(1));
    await expect(notices()[0].textContent).toContain('Đã lưu (test)');
    await expect(notices()[0].classList.contains('notice--success')).toBe(true);
    await expect(container.matches(':popover-open')).toBe(true);
    await expect(container.shadowRoot.querySelector('[part="list"]').getAttribute('aria-live')).toBe('polite');

    await expect(await close).toBe(true);
    await waitFor(() => expect(notices().length).toBe(0), { timeout: 3000 });
    await expect(container.matches(':popover-open')).toBe(false);
  },
};

/** loading → success bằng cùng key */
export const UpdateByKey = {
  render: () => html`
    <hui-button
      @hui-click=${() => {
        message.loading('Đang lưu...', { key: 'save', duration: 0 });
        setTimeout(() => message.success('Đã lưu!', { key: 'save', duration: 2 }), 1200);
      }}
    >Lưu (loading → success)</hui-button>
  `,
  play: async () => {
    message.destroy();
    const container = () => document.querySelector('hui-message-container');
    message.loading('Đang tải', { key: 'play-key', duration: 0 });
    await waitFor(() => expect(container().shadowRoot.querySelectorAll('.notice').length).toBe(1));
    const icon = container().shadowRoot.querySelector('.notice hui-icon');
    await expect(icon.hasAttribute('spin')).toBe(true);

    const done = message.success('Xong', { key: 'play-key', duration: 0.2 });
    const list = container().shadowRoot.querySelectorAll('.notice');
    await expect(list.length).toBe(1);
    await expect(list[0].classList.contains('notice--success')).toBe(true);
    await expect(list[0].textContent).toContain('Xong');
    await expect(icon.hasAttribute('spin')).toBe(false);
    await done;
    await waitFor(() => expect(container().shadowRoot.querySelectorAll('.notice').length).toBe(0), { timeout: 3000 });
  },
};

/** Thời lượng: 10 giây, hoặc 0 = không tự đóng (gọi hàm trả về để đóng) */
export const Duration = {
  render: () => {
    let closeSticky = null;
    return html`
      <div style="display: flex; gap: 8px;">
        <hui-button @hui-click=${() => message.info('Hiện 10 giây', 10)}>10 giây</hui-button>
        <hui-button variant="secondary" @hui-click=${() => { closeSticky = message.warning('Không tự đóng', { duration: 0 }); }}>Không tự đóng</hui-button>
        <hui-button variant="outline" @hui-click=${() => closeSticky?.()}>Đóng message trên</hui-button>
        <hui-button variant="ghost" @hui-click=${() => message.destroy()}>destroy()</hui-button>
      </div>
    `;
  },
};

/** Cấu hình toàn cục — top 80px, tối đa 3 message (cái cũ nhất bị đóng) */
export const Config = {
  render: () => html`
    <div style="display: flex; gap: 8px;">
      <hui-button @hui-click=${() => message.config({ top: 80, maxCount: 3 })}>config({ top: 80, maxCount: 3 })</hui-button>
      <hui-button variant="secondary" @hui-click=${() => message.info(`Message lúc ${new Date().toLocaleTimeString()}`)}>Thêm message</hui-button>
      <hui-button variant="ghost" @hui-click=${() => message.config({ top: null, maxCount: 0 })}>Đặt lại</hui-button>
    </div>
  `,
};

/** Message nằm trên Modal — kể cả khi Modal mở sau */
export const AboveModal = {
  render: () => html`
    <hui-button @hui-click=${() => document.querySelector('#msg-modal').open()}>Mở Modal</hui-button>
    <hui-modal id="msg-modal" title="Modal" @hui-ok=${(e) => { e.preventDefault(); message.success('Message nằm trên Modal'); }}>
      <p>Bấm OK để hiện message (modal giữ nguyên).</p>
    </hui-modal>
  `,
  // Kiểm thử: message mở khi Modal đang mở vẫn nằm trên; click lên message (rơi xuống mask) không đóng Modal
  play: async ({ canvasElement }) => {
    message.destroy();
    const modalEl = canvasElement.querySelector('#msg-modal');
    const dialog = modalEl.shadowRoot.querySelector('dialog');
    modalEl.open();
    await waitFor(() => expect(dialog.open).toBe(true));

    message.info('Trên modal', { duration: 0, key: 'above' });
    const container = document.querySelector('hui-message-container');
    await waitFor(() => expect(container.shadowRoot.querySelectorAll('.notice').length).toBe(1));
    await expect(container.matches(':popover-open')).toBe(true);

    await new Promise((r) => setTimeout(r, 300)); // chờ animation vào xong để đo đúng vị trí
    const rect = container.shadowRoot.querySelector('.notice').getBoundingClientRect();
    const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, bubbles: true, composed: true };
    modalEl.shadowRoot.querySelector('.wrap').dispatchEvent(new PointerEvent('pointerdown', point));
    await new Promise((r) => setTimeout(r, 100));
    await expect(modalEl.isOpen).toBe(true);

    message.destroy('above');
    modalEl.close();
    await waitFor(() => expect(dialog.open).toBe(false), { timeout: 2000 });
  },
};

/** Override từ bên ngoài — biến CSS trên :root và ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      :root {
        --hui-message-radius: 999px;
        --hui-message-padding: 10px 18px;
      }
      hui-message-container::part(notice-error) {
        background: var(--hui-danger-1);
        border: 1px solid var(--hui-danger-3);
      }
    </style>
    <hui-button variant="danger" @hui-click=${() => message.error('Bo tròn + nền đỏ nhạt')}>Message tùy biến</hui-button>
  `,
};
