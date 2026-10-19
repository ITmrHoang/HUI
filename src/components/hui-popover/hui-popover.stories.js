/**
 * Storybook Stories — HUI Popover
 * Khung nổi có tiêu đề + nội dung tương tác: 12 vị trí, hover / click / focus / manual.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

export default {
  title: 'Components/HuiPopover',
  component: 'hui-popover',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
**HUI Popover** — Khung nổi có tiêu đề và nội dung tương tác (Ant Popover + MUI Popover).

Dùng chung engine với hui-tooltip (\`utils/floating.js\`): tự lật khi thiếu chỗ, bám theo khi cuộn, nằm trên top-layer.
Khi đang mở (trừ \`trigger="manual"\`), popover đăng ký \`utils/overlay.js\` → \`Esc\` / click ra ngoài chỉ đóng lớp
trên cùng (popover trong Modal: Esc đóng popover trước, không đóng Modal).

### Cách sử dụng
\`\`\`html
<hui-popover title="Tiêu đề" content="Nội dung ngắn" trigger="click">
  <hui-button>Mở</hui-button>
</hui-popover>

<hui-popover placement="bottom-start">
  <hui-button>Hover</hui-button>
  <strong slot="title">Tiêu đề HTML</strong>
  <div slot="content"><a href="#">Liên kết</a></div>
</hui-popover>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`title\` | string | — | Tiêu đề text (attribute bị gỡ khỏi host để không hiện tooltip native) |
| \`content\` | string | — | Nội dung text |
| \`placement\` | string | \`'top'\` | 12 vị trí: \`top\`, \`top-start\`, \`top-end\`, \`bottom…\`, \`left…\`, \`right…\` (nhận cả \`topLeft\`…) |
| \`trigger\` | string | \`'hover'\` | \`hover\` (gồm focus bàn phím) \\| \`click\` \\| \`focus\` \\| \`manual\`, kết hợp bằng dấu cách |
| \`open\` | boolean | \`false\` | Trạng thái mở (controlled), tự phản chiếu |
| \`arrow\` | string | \`'true'\` | \`'false'\` = ẩn mũi tên |
| \`delay\` / \`hide-delay\` | number | \`100\` | Độ trễ hiện / ẩn khi hover (ms) |
| \`offset\` | number | \`8\` | Khoảng cách tới trigger (px) |
| \`disabled\` | boolean | \`false\` | Tắt popover |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`open-change\` | \`{ open }\` | Mở/đóng do người dùng hoặc method (không phát khi đổi attribute \`open\` từ ngoài) |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Phần tử kích hoạt |
| \`title\` | Tiêu đề HTML |
| \`content\` | Nội dung HTML |

### Methods
\`show()\`, \`hide()\`, \`toggle()\`.

### Bàn phím & trợ năng
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | trigger="hover": focus bằng bàn phím mở popover; Tab tiếp đi vào nội dung bên trong |
| \`Esc\` | Đóng (trừ manual); focus đang ở trong popup → trả về trigger |
Popup có \`role="dialog"\`, \`aria-labelledby\` trỏ tới tiêu đề.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-popover-bg\` / \`--hui-popover-color\` / \`--hui-popover-title-color\` | Màu |
| \`--hui-popover-min-width\` / \`--hui-popover-max-width\` | Chiều rộng (177px / 360px) |
| \`--hui-popover-radius\` / \`--hui-popover-shadow\` | Bo góc / đổ bóng |
| \`--hui-popover-padding\` / \`--hui-popover-font-size\` | Padding / cỡ chữ |

**Parts:** \`trigger\`, \`popup\`, \`inner\`, \`title\`, \`content\`, \`arrow\`. Custom state: \`hui-popover:state(open)\`.
        `,
      },
    },
  },
  argTypes: {
    placement: {
      control: 'select',
      options: ['top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end', 'left', 'left-start', 'left-end', 'right', 'right-start', 'right-end'],
    },
    trigger: { control: 'select', options: ['hover', 'click', 'focus', 'manual', 'hover click'] },
    title: { control: 'text' },
    content: { control: 'text' },
    arrow: { control: 'radio', options: ['true', 'false'] },
  },
};

/** Mặc định — click để mở; Esc hoặc click ra ngoài để đóng */
export const Default = {
  args: { placement: 'top', trigger: 'click', title: 'Tiêu đề', content: 'Nội dung popover có thể tương tác.', arrow: 'true' },
  render: (args) => html`
    <div style="padding: 120px;">
      <hui-popover placement=${args.placement} trigger=${args.trigger} title=${args.title} content=${args.content} arrow=${args.arrow}>
        <hui-button>Mở popover</hui-button>
      </hui-popover>
    </div>
  `,
  // Kiểm thử: click mở → open-change + role dialog; Esc đóng; click mở lại → click ngoài đóng
  play: async ({ canvasElement }) => {
    const pop = canvasElement.querySelector('hui-popover');
    const popup = pop.shadowRoot.querySelector('[part="popup"]');
    const trigger = pop.querySelector('hui-button').shadowRoot.querySelector('button');
    const events = [];
    pop.addEventListener('open-change', (e) => events.push(e.detail.open));

    await expect(pop.hasAttribute('title')).toBe(false); // attribute title đã gỡ khỏi host
    trigger.click();
    await waitFor(() => expect(popup.hidden).toBe(false));
    await expect(pop.open).toBe(true);
    await expect(popup.getAttribute('role')).toBe('dialog');
    await expect(pop.shadowRoot.querySelector('[part="title"]').textContent).toBe('Tiêu đề');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(popup.hidden).toBe(true), { timeout: 2000 });

    trigger.click();
    await waitFor(() => expect(popup.hidden).toBe(false));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await waitFor(() => expect(popup.hidden).toBe(true), { timeout: 2000 });
    await expect(events).toEqual([true, false, true, false]);
  },
};

/** Các kiểu trigger */
export const Triggers = {
  render: () => html`
    <div style="padding: 120px; display: flex; gap: 16px;">
      <hui-popover title="Hover" content="Rê chuột sang đây vẫn mở"><hui-button>Hover</hui-button></hui-popover>
      <hui-popover title="Click" content="Click ra ngoài để đóng" trigger="click"><hui-button variant="secondary">Click</hui-button></hui-popover>
      <hui-popover title="Focus" content="Hiện khi ô nhập được focus" trigger="focus"><input placeholder="Focus vào đây" /></hui-popover>
    </div>
  `,
};

/** 12 vị trí */
export const Placements = {
  render: () => {
    const btn = (p) => html`
      <hui-popover placement=${p} title=${p} content="Nội dung" open trigger="manual">
        <hui-button size="sm" variant="outline" style="width: 100px;">${p}</hui-button>
      </hui-popover>`;
    return html`
      <div style="padding: 140px 200px; display: grid; grid-template-columns: repeat(5, 110px); gap: 8px; justify-items: center;">
        <div></div>${btn('top-start')}${btn('top')}${btn('top-end')}<div></div>
        ${btn('left-start')}<div></div><div></div><div></div>${btn('right-start')}
        ${btn('left')}<div></div><div></div><div></div>${btn('right')}
        ${btn('left-end')}<div></div><div></div><div></div>${btn('right-end')}
        <div></div>${btn('bottom-start')}${btn('bottom')}${btn('bottom-end')}<div></div>
      </div>
    `;
  },
};

/** Nội dung HTML qua slot */
export const RichContent = {
  render: () => html`
    <div style="padding: 160px 80px;">
      <hui-popover trigger="click" placement="bottom-start">
        <hui-button variant="secondary">Tài khoản</hui-button>
        <strong slot="title">Nguyễn Văn A</strong>
        <div slot="content" style="display: grid; gap: 8px;">
          <span>Quản trị viên · Hà Nội</span>
          <hui-button size="sm" variant="outline">Xem hồ sơ</hui-button>
        </div>
      </hui-popover>
    </div>
  `,
};

/** Manual — điều khiển bằng show() / hide() */
export const Manual = {
  render: () => {
    const pop = () => document.querySelector('#popover-manual');
    return html`
      <div style="padding: 100px; display: flex; flex-direction: column; align-items: center; gap: 24px;">
        <hui-popover id="popover-manual" title="Manual" content="Không đóng bằng Esc / click ngoài" trigger="manual" placement="bottom">
          <span style="padding: 6px 12px; border: 1px dashed var(--hui-border-hover); border-radius: 6px;">Mục tiêu</span>
        </hui-popover>
        <div style="display: flex; gap: 8px;">
          <hui-button size="sm" @hui-click=${() => pop()?.show()}>show()</hui-button>
          <hui-button size="sm" variant="secondary" @hui-click=${() => pop()?.hide()}>hide()</hui-button>
        </div>
      </div>
    `;
  },
};

/** Override từ bên ngoài — biến CSS trên thẻ cha + ::part() + :state(open) */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .pop-brand {
        --hui-popover-bg: var(--hui-primary-1);
        --hui-popover-title-color: var(--hui-primary);
        --hui-popover-radius: 4px;
        --hui-popover-padding: 16px;
        --hui-popover-max-width: 240px;
      }
      .pop-brand hui-popover::part(popup) { border: 1px solid var(--hui-primary-3); }
      .pop-brand hui-popover::part(title) { text-transform: uppercase; letter-spacing: 0.05em; }
      .pop-brand hui-popover:state(open)::part(trigger) { outline: 2px dashed var(--hui-primary); outline-offset: 4px; border-radius: 4px; }
    </style>
    <div class="pop-brand" style="padding: 120px;">
      <hui-popover title="Tùy biến" content="Nền, viền, bo góc, tiêu đề đổi từ bên ngoài." open trigger="manual" placement="bottom">
        <hui-button>Mở sẵn</hui-button>
      </hui-popover>
    </div>
  `,
};
