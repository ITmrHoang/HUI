/**
 * Storybook Stories — HUI Modal
 * Hộp thoại popup hỗ trợ: kích thước, đóng/mở, overlay click, ESC key, slots.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { modal } from './index.js';
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

Hiển thị trên top-layer (\`<dialog>.showModal()\`) nên luôn nằm trên mọi z-index. Esc chỉ đóng lớp trên cùng,
Tab chạy vòng trong modal (xuyên Shadow DOM), khóa cuộn trang, đóng xong trả focus về phần tử cũ.

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
| \`width\` | string | — | Chiều rộng: số (px) hoặc độ dài CSS — ưu tiên hơn \`size\` và \`--hui-modal-width\` |
| \`centered\` | boolean | \`false\` | Căn giữa theo chiều dọc. Mặc định cách mép trên \`--hui-modal-top\` (giống Ant) |
| \`closable\` | string | \`'true'\` | Cho phép đóng (nút X, ESC) |
| \`close-on-overlay\` | string | \`'true'\` | Đóng khi click overlay |
| \`mask-closable\` | string | — | Alias kiểu Ant của \`close-on-overlay\` (có giá trị thì ưu tiên hơn) |
| \`destroy-on-close\` | boolean | \`false\` | Đóng xong gỡ nội dung dựng từ \`<template>\` con (mở lại → dựng mới) và reset các \`<form>\` bên trong |
| \`ok-text\` | string | locale \`modal.ok\` | Chữ nút OK mặc định |
| \`cancel-text\` | string | locale \`modal.cancel\` | Chữ nút Hủy mặc định |
| \`ok-type\` | string | \`primary\` | Variant nút OK (\`primary\`, \`danger\`... của hui-button) |
| \`confirm-loading\` | boolean | \`false\` | Nút OK hiện loading, chặn bấm lặp |
| \`confirm-type\` | string | — | \`confirm\` \\| \`info\` \\| \`success\` \\| \`error\` \\| \`warning\` — bố cục hộp xác nhận (dùng bởi \`modal.confirm()\`): ẩn header, icon trước tiêu đề |
| \`no-footer\` | boolean | \`false\` | Ẩn hẳn vùng footer |

### Events
| Event | Mô tả |
|-------|-------|
| \`hui-open\` | Phát khi modal mở |
| \`hui-close\` | Phát khi modal bắt đầu đóng |
| \`hui-after-close\` | Đã đóng xong (hết animation) |
| \`hui-ok\` | Bấm nút OK mặc định. Cancelable: \`preventDefault()\` để giữ modal mở |
| \`hui-cancel\` | Bấm Hủy / ✕ / Esc / click overlay. Cancelable: \`preventDefault()\` để giữ modal mở |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Nội dung body chính. Bọc trong \`<template>\` để chỉ dựng khi mở (kết hợp \`destroy-on-close\`) |
| \`title\` | Tiêu đề tùy biến (thay attribute \`title\`) |
| \`footer\` | Khu vực footer — thay cụm nút OK / Hủy mặc định |

### Methods
| Method | Mô tả |
|--------|-------|
| \`open()\` | Mở modal từ JS |
| \`close()\` | Đóng modal từ JS |
| \`isOpen\` | (getter) Modal đang mở hay không |

### Gọi bằng hàm — \`modal.confirm | info | success | error | warning(options)\`
\`\`\`js
import { modal } from 'hui-lib/hui-modal';
const ok = await modal.confirm({ title: 'Xóa mục này?', content: 'Không thể hoàn tác.', okType: 'danger' });
modal.confirm({ title: 'Gửi?', onOk: () => api.send() }); // onOk trả Promise → nút OK loading tới khi xong
\`\`\`
| Option | Type | Default | Mô tả |
|--------|------|---------|-------|
| \`title\` / \`content\` | string \\| Node | — | Tiêu đề / nội dung (chuỗi chèn dạng text) |
| \`okText\` / \`cancelText\` | string | locale | Chữ nút |
| \`okType\` | string | \`primary\` | Variant nút OK |
| \`onOk\` | function | — | Trả Promise → nút OK loading tới khi resolve; reject → giữ hộp mở |
| \`onCancel\` | function | — | Hủy / Esc |
| \`width\` | number \\| string | \`416\` | Chiều rộng |
| \`centered\` / \`maskClosable\` | boolean | \`false\` | Căn giữa / click mask để hủy |

Trả về \`Promise<boolean>\` (\`true\` = OK) kèm \`.close()\`; \`modal.destroyAll()\` đóng mọi hộp đang mở.
Chỉ \`confirm\` có nút Hủy; nút OK được focus sẵn.

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Esc\` | Đóng (phát \`hui-cancel\`) — chỉ lớp trên cùng |
| \`Tab\` / \`Shift+Tab\` | Chạy vòng trong modal |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-modal-width\` | Chiều rộng (ghi đè size; attribute \`width\` ưu tiên hơn) |
| \`--hui-modal-max-height\` | Chiều cao tối đa (90vh) |
| \`--hui-modal-top\` | Khoảng cách tới mép trên khi không \`centered\` (min(100px, 10vh)) |
| \`--hui-modal-bg\` / \`--hui-modal-color\` | Nền / màu chữ nội dung |
| \`--hui-modal-radius\` / \`--hui-modal-shadow\` | Bo góc / đổ bóng |
| \`--hui-modal-border-color\` | Đường kẻ header, footer |
| \`--hui-modal-mask-bg\` | Nền lớp phủ |
| \`--hui-modal-gutter\` | Khoảng cách tới mép màn hình |
| \`--hui-modal-header-padding\` / \`--hui-modal-body-padding\` / \`--hui-modal-footer-padding\` | Padding từng vùng |
| \`--hui-modal-title-font-size\` / \`--hui-modal-title-color\` | Tiêu đề |

**Parts:** \`dialog\`, \`mask\`, \`panel\`, \`header\`, \`title\`, \`close\`, \`body\`, \`footer\`, \`ok-button\`, \`cancel-button\`, \`confirm-icon\`, \`confirm-title\`.
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

/**
 * Nút mặc định — không truyền slot footer → hiện nút Hủy / OK (chữ theo locale, đổi bằng ok-text / cancel-text).
 * hui-ok bị preventDefault → modal giữ nguyên rồi tự đóng sau 1 giây.
 */
export const DefaultFooter = {
  render: () => html`
    <hui-button variant="primary" @hui-click=${() => openModal('modal-footer')}>Mở Modal</hui-button>
    <hui-modal
      id="modal-footer"
      title="Nút mặc định"
      ok-text="Lưu"
      @hui-ok=${(e) => {
        e.preventDefault();
        const modal = e.currentTarget;
        setTimeout(() => modal.close(), 1000);
      }}
    >
      <p>Bấm <strong>Lưu</strong> (đóng sau 1 giây) hoặc <strong>Hủy</strong>.</p>
    </hui-modal>
  `,
  // Kiểm thử: mở → Esc đóng → mở lại → click mask đóng
  play: async ({ canvasElement }) => {
    const modal = canvasElement.querySelector('#modal-footer');
    const dialog = modal.shadowRoot.querySelector('dialog');
    const wait = (fn) => waitFor(() => expect(fn()).toBe(true), { timeout: 2000 });

    modal.open();
    await wait(() => dialog.open);
    await expect(modal.shadowRoot.querySelector('[part="ok-button"]').textContent).toBe('Lưu');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(() => !modal.isOpen && !dialog.open);

    modal.open();
    await wait(() => dialog.open);
    modal.shadowRoot.querySelector('.wrap').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await wait(() => !modal.isOpen && !dialog.open);
  },
};

/**
 * Override từ bên ngoài — biến CSS trên thẻ cha và ::part(), không sửa code thư viện.
 */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .modal-brand {
        --hui-modal-width: 480px;
        --hui-modal-radius: 20px;
        --hui-modal-mask-bg: color-mix(in srgb, var(--hui-primary) 35%, transparent);
        --hui-modal-header-padding: 16px 24px;
        --hui-modal-body-padding: 8px 24px 16px;
        --hui-modal-footer-padding: 12px 24px 20px;
        --hui-modal-border-color: transparent;
        --hui-modal-title-color: var(--hui-primary);
      }
      .modal-brand hui-modal::part(header) { background: var(--hui-primary-1); }
      .modal-brand hui-modal::part(title) { text-transform: uppercase; letter-spacing: 0.06em; }
      .modal-brand hui-modal::part(close):hover { color: var(--hui-danger); }
    </style>
    <div class="modal-brand">
      <hui-button variant="primary" @hui-click=${() => openModal('modal-custom')}>Mở Modal tùy biến</hui-button>
      <hui-modal id="modal-custom" title="Giao diện riêng">
        <p>Bo góc, màu mask, padding và tiêu đề được đổi bằng biến CSS + ::part() từ bên ngoài.</p>
      </hui-modal>
    </div>
  `,
};

/**
 * Vị trí & chiều rộng — mặc định cách mép trên (Ant), `centered` căn giữa, `width` đặt chiều rộng tùy ý.
 */
export const CenteredAndWidth = {
  render: () => html`
    <div style="display: flex; gap: 12px; padding: 16px;">
      <hui-button variant="outline" @hui-click=${() => openModal('modal-top')}>Mặc định (cách mép trên)</hui-button>
      <hui-button variant="outline" @hui-click=${() => openModal('modal-centered')}>centered + width="720"</hui-button>
    </div>
    <hui-modal id="modal-top" title="Cách mép trên">
      <p>Đặt <code>--hui-modal-top</code> để đổi khoảng cách.</p>
    </hui-modal>
    <hui-modal id="modal-centered" title="Căn giữa" centered width="720" mask-closable="false">
      <p>Rộng 720px, click mask không đóng (<code>mask-closable="false"</code>).</p>
    </hui-modal>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#modal-centered');
    const panel = el.shadowRoot.querySelector('[part="panel"]');
    await expect(panel.style.getPropertyValue('--_modal-width-attr')).toBe('720px');
    await expect(el.shadowRoot.querySelector('.wrap').classList.contains('wrap--centered')).toBe(true);

    // mask-closable="false" → click mask không đóng; Esc vẫn đóng
    const dialog = el.shadowRoot.querySelector('dialog');
    el.open();
    await waitFor(() => expect(dialog.open).toBe(true));
    el.shadowRoot.querySelector('.wrap').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await new Promise((r) => setTimeout(r, 100));
    await expect(el.isOpen).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(dialog.open).toBe(false), { timeout: 2000 });
  },
};

/**
 * Gọi bằng hàm — modal.confirm / info / success / error / warning trả Promise<boolean>.
 * "Xóa (async)": onOk trả Promise → nút OK loading 1.5 giây rồi mới đóng.
 */
export const ConfirmApi = {
  render: () => {
    const result = (ok) => {
      const out = document.querySelector('#confirm-result');
      if (out) out.textContent = `Kết quả: ${ok}`;
    };
    return html`
      <div style="display: flex; gap: 8px; flex-wrap: wrap; padding: 16px;">
        <hui-button @hui-click=${async () => result(await modal.confirm({ title: 'Bạn có chắc muốn rời trang?', content: 'Các thay đổi chưa lưu sẽ mất.' }))}>confirm</hui-button>
        <hui-button variant="danger" @hui-click=${async () => result(await modal.confirm({
          title: 'Xóa dự án này?',
          content: 'Hành động không thể hoàn tác.',
          okText: 'Xóa',
          okType: 'danger',
          onOk: () => new Promise((r) => setTimeout(r, 1500)),
        }))}>Xóa (async)</hui-button>
        <hui-button variant="outline" @hui-click=${() => modal.info({ title: 'Thông tin', content: 'Phiên bản 1.2.0' })}>info</hui-button>
        <hui-button variant="outline" @hui-click=${() => modal.success({ title: 'Thành công', content: 'Đã gửi biểu mẫu.' })}>success</hui-button>
        <hui-button variant="outline" @hui-click=${() => modal.error({ title: 'Lỗi', content: 'Không thể kết nối máy chủ.' })}>error</hui-button>
        <hui-button variant="outline" @hui-click=${() => modal.warning({ title: 'Cảnh báo', content: 'Dung lượng sắp đầy.' })}>warning</hui-button>
      </div>
      <p id="confirm-result" style="padding: 0 16px;">Kết quả: —</p>
    `;
  },
  // Kiểm thử: confirm có onOk async → OK loading → resolve true → modal tự gỡ khỏi body; Hủy → false
  play: async () => {
    const findModal = () => [...document.querySelectorAll('hui-modal[confirm-type]')].pop();
    const inner = (btn) => btn.shadowRoot.querySelector('button');

    let resolveOk;
    const okDone = new Promise((r) => { resolveOk = r; });
    const p = modal.confirm({ title: 'Xóa?', content: 'Test', onOk: () => okDone });
    const el = findModal();
    await expect(el.getAttribute('confirm-type')).toBe('confirm');
    const dialog = el.shadowRoot.querySelector('dialog');
    await waitFor(() => expect(dialog.open).toBe(true));
    await expect(dialog.getAttribute('role')).toBe('alertdialog');
    await expect(el.shadowRoot.querySelector('[part="header"]').hidden).toBe(true);

    const okBtn = el.shadowRoot.querySelector('[part="ok-button"]');
    inner(okBtn).click();
    await waitFor(() => expect(okBtn.loading).toBe(true));
    // Đang loading → Esc không đóng
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await expect(el.isOpen).toBe(true);

    resolveOk();
    await expect(await p).toBe(true);
    await waitFor(() => expect(el.isConnected).toBe(false), { timeout: 2000 });

    // Hủy → false; info chỉ có nút OK
    const p2 = modal.confirm({ title: 'Hủy thử' });
    const el2 = findModal();
    await waitFor(() => expect(el2.shadowRoot.querySelector('dialog').open).toBe(true));
    inner(el2.shadowRoot.querySelector('[part="cancel-button"]')).click();
    await expect(await p2).toBe(false);

    const p3 = modal.info({ title: 'Info' });
    const el3 = findModal();
    await expect(el3.shadowRoot.querySelector('[part="cancel-button"]').hidden).toBe(true);
    p3.close();
    await expect(await p3).toBe(false);
    await waitFor(() => expect(document.querySelectorAll('hui-modal[confirm-type]').length).toBe(0), { timeout: 2000 });
  },
};

/**
 * destroy-on-close + <template>: nội dung chỉ dựng khi mở, đóng xong bị gỡ → mở lại là bản mới (ô nhập trống).
 */
export const DestroyOnClose = {
  render: () => html`
    <div style="padding: 16px;">
      <hui-button @hui-click=${() => openModal('modal-destroy')}>Mở form</hui-button>
    </div>
    <hui-modal id="modal-destroy" title="Form mới mỗi lần mở" destroy-on-close>
      <template>
        <label>Tên: <input class="destroy-input" placeholder="Gõ gì đó rồi đóng" /></label>
      </template>
    </hui-modal>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#modal-destroy');
    const dialog = el.shadowRoot.querySelector('dialog');
    await expect(el.querySelector('.destroy-input')).toBe(null);

    el.open();
    await waitFor(() => expect(dialog.open).toBe(true));
    const input = el.querySelector('.destroy-input');
    await expect(input).toBeTruthy();
    input.value = 'abc';

    let afterClose = 0;
    el.addEventListener('hui-after-close', () => afterClose++);
    el.close();
    await waitFor(() => expect(afterClose).toBe(1), { timeout: 2000 });
    await expect(el.querySelector('.destroy-input')).toBe(null);

    el.open();
    await waitFor(() => expect(dialog.open).toBe(true));
    await expect(el.querySelector('.destroy-input').value).toBe('');
    el.close();
    await waitFor(() => expect(dialog.open).toBe(false), { timeout: 2000 });
  },
};
