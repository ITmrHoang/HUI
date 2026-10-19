/**
 * Storybook Stories — HUI Popconfirm
 * Hộp xác nhận nhỏ bật ra cạnh nút, xây trên hui-popover.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';
import { message } from '../hui-message/index.js';

export default {
  title: 'Components/HuiPopconfirm',
  component: 'hui-popconfirm',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
**HUI Popconfirm** — Hộp xác nhận nhỏ bật ra cạnh nút bấm (Ant Popconfirm), xây trên \`hui-popover\` (trigger click).

### Cách sử dụng
\`\`\`html
<hui-popconfirm title="Xóa mục này?" description="Không thể hoàn tác." ok-type="danger">
  <hui-button variant="danger">Xóa</hui-button>
</hui-popconfirm>
\`\`\`
\`\`\`js
// Xác nhận bất đồng bộ: nút OK loading tới khi promise xong rồi mới đóng (reject → giữ mở)
el.addEventListener('hui-confirm', (e) => e.detail.waitUntil(api.delete(id)));
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`title\` | string | — | Câu hỏi (attribute bị gỡ khỏi host để không hiện tooltip native) |
| \`description\` | string | — | Mô tả thêm |
| \`ok-text\` / \`cancel-text\` | string | locale \`popconfirm.ok\` / \`popconfirm.cancel\` | Chữ nút |
| \`ok-type\` | string | \`'primary'\` | Variant nút OK (\`primary\`, \`danger\`…) |
| \`show-cancel\` | string | \`'true'\` | \`'false'\` = ẩn nút Hủy |
| \`icon\` | string | \`'warning'\` | Tên hui-icon; \`'none'\` = ẩn |
| \`placement\` | string | \`'top'\` | 12 vị trí như hui-popover |
| \`open\` | boolean | \`false\` | Trạng thái mở (controlled), tự phản chiếu |
| \`disabled\` | boolean | \`false\` | Không bật hộp xác nhận |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-confirm\` | \`{ waitUntil(promise) }\` | Bấm OK. Cancelable: \`preventDefault()\` giữ hộp mở. Gọi \`waitUntil\` đồng bộ trong listener để OK loading tới khi xong |
| \`hui-cancel\` | — | Bấm Hủy |
| \`open-change\` | \`{ open }\` | Mở / đóng |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Phần tử kích hoạt |
| \`title\` / \`description\` / \`icon\` | Nội dung HTML thay attribute tương ứng |

### Methods
\`show()\`, \`hide()\`.

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Enter\` / \`Space\` trên trigger | Mở |
| \`Tab\` | Đi tới nút Hủy / OK trong hộp |
| \`Esc\` | Đóng, trả focus về trigger |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-popconfirm-icon-color\` | Màu icon (màu cảnh báo) |
| \`--hui-popconfirm-max-width\` | Chiều rộng tối đa nội dung (320px) |
| \`--hui-popover-*\` | Mọi biến của hui-popover (nền, bo góc, padding…) |

**Parts:** \`popover\`, \`popup\`, \`arrow\`, \`body\`, \`icon\`, \`title\`, \`description\`, \`actions\`, \`ok-button\`, \`cancel-button\`.
        `,
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    okType: { control: 'select', options: ['primary', 'danger'] },
    placement: { control: 'select', options: ['top', 'bottom', 'left', 'right', 'top-start', 'bottom-end'] },
  },
};

/** Mặc định — OK chờ 800ms (waitUntil) rồi mới đóng */
export const Default = {
  args: { title: 'Xóa công việc này?', description: 'Hành động không thể hoàn tác.', okType: 'danger', placement: 'top' },
  render: (args) => html`
    <div style="padding: 140px;">
      <hui-popconfirm
        title=${args.title}
        description=${args.description}
        ok-type=${args.okType}
        placement=${args.placement}
        @hui-confirm=${(e) => e.detail.waitUntil(new Promise((r) => setTimeout(r, 800)).then(() => message.success('Đã xóa')))}
        @hui-cancel=${() => message.info('Đã hủy')}
      >
        <hui-button variant="danger">Xóa</hui-button>
      </hui-popconfirm>
    </div>
  `,
  // Kiểm thử: click mở → hui-confirm phát → OK loading (waitUntil) → đóng; Hủy phát hui-cancel
  play: async ({ canvasElement }) => {
    const pc = canvasElement.querySelector('hui-popconfirm');
    const popover = pc.shadowRoot.querySelector('hui-popover');
    const trigger = pc.querySelector('hui-button').shadowRoot.querySelector('button');
    const ok = pc.shadowRoot.querySelector('[part="ok-button"]');
    const cancel = pc.shadowRoot.querySelector('[part="cancel-button"]');
    const events = [];
    let release;
    pc.addEventListener('hui-confirm', (e) => {
      events.push('confirm');
      e.stopImmediatePropagation(); // bỏ qua listener demo (message) ở trên
      e.detail.waitUntil(new Promise((r) => { release = r; }));
    }, { capture: true });
    pc.addEventListener('hui-cancel', () => events.push('cancel'));

    await expect(pc.hasAttribute('title')).toBe(false);
    trigger.click();
    await waitFor(() => expect(popover.popup.hidden).toBe(false));
    await expect(pc.open).toBe(true);
    await expect(pc.shadowRoot.querySelector('[part="title"]').textContent).toBe('Xóa công việc này?');
    await expect(ok.getAttribute('variant')).toBe('danger');

    ok.shadowRoot.querySelector('button').click();
    await expect(events).toEqual(['confirm']);
    await waitFor(() => expect(ok.loading).toBe(true));
    await expect(pc.open).toBe(true); // còn chờ promise → chưa đóng
    release();
    await waitFor(() => expect(pc.open).toBe(false), { timeout: 2000 });
    await expect(ok.loading).toBe(false);

    trigger.click();
    await waitFor(() => expect(pc.open).toBe(true));
    cancel.shadowRoot.querySelector('button').click();
    await waitFor(() => expect(pc.open).toBe(false), { timeout: 2000 });
    await expect(events).toEqual(['confirm', 'cancel']);
  },
};

/** preventDefault() trên hui-confirm → giữ hộp mở; ẩn nút Hủy; icon khác */
export const Variants = {
  render: () => html`
    <div style="padding: 140px; display: flex; gap: 12px;">
      <hui-popconfirm title="Đăng xuất?" ok-text="Đăng xuất" cancel-text="Ở lại" icon="info">
        <hui-button variant="outline">Tùy chữ + icon</hui-button>
      </hui-popconfirm>
      <hui-popconfirm title="Đã hiểu?" show-cancel="false" icon="none">
        <hui-button variant="outline">Không nút Hủy, không icon</hui-button>
      </hui-popconfirm>
      <hui-popconfirm title="OK sẽ không đóng" @hui-confirm=${(e) => { e.preventDefault(); message.warning('preventDefault() — hộp vẫn mở'); }}>
        <hui-button variant="outline">preventDefault</hui-button>
      </hui-popconfirm>
    </div>
  `,
};

/** Nội dung HTML qua slot */
export const Slots = {
  render: () => html`
    <div style="padding: 160px;">
      <hui-popconfirm placement="bottom">
        <hui-button>Chuyển quyền sở hữu</hui-button>
        <span slot="title">Chuyển cho <strong>Trần Thị B</strong>?</span>
        <span slot="description">Bạn sẽ mất quyền quản trị dự án.</span>
        <hui-icon slot="icon" name="user" style="color: var(--hui-primary);"></hui-icon>
      </hui-popconfirm>
    </div>
  `,
};

/** Override từ bên ngoài — biến CSS + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .pc-brand {
        --hui-popconfirm-icon-color: var(--hui-danger);
        --hui-popover-bg: var(--hui-danger-1);
        --hui-popover-radius: 6px;
      }
      .pc-brand hui-popconfirm::part(title) { color: var(--hui-danger-7); }
      .pc-brand hui-popconfirm::part(popup) { border: 1px solid var(--hui-danger-3); }
    </style>
    <div class="pc-brand" style="padding: 140px;">
      <hui-popconfirm title="Xóa vĩnh viễn?" description="Không khôi phục được." ok-type="danger" open>
        <hui-button variant="danger">Mở sẵn</hui-button>
      </hui-popconfirm>
    </div>
  `,
};
