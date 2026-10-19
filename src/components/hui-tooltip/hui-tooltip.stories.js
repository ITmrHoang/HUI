/**
 * Storybook Stories — HUI Tooltip
 * Chú thích nổi kết hợp Ant Design Tooltip + MUI Tooltip: 12 vị trí, nhiều kiểu trigger, auto-flip.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
// Import button làm phần tử trigger trong các demo
import '../hui-button/index.js';

export default {
  title: 'Components/HuiTooltip',
  component: 'hui-tooltip',
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Tooltip** — Chú thích nổi hiển thị khi hover / focus / click vào phần tử, kết hợp API của Ant Design Tooltip và MUI Tooltip.

Định vị bằng engine dùng chung \`utils/floating.js\`: tự lật sang phía đối diện khi thiếu chỗ,
luôn nằm trong viewport (cách mép 8px), tự định vị lại khi cuộn / đổi kích thước. Popup nằm trên top-layer
(Popover API) nên không bị \`overflow: hidden\` hay \`z-index\` của thẻ cha che mất (kể cả bên trong Modal).

### Cách sử dụng cơ bản
\`\`\`html
<hui-tooltip content="Lưu thay đổi" placement="bottom">
  <hui-button>Lưu</hui-button>
</hui-tooltip>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`content\` | string | — | Nội dung text của tooltip |
| \`title\` | string | — | Alias của \`content\` (giống Ant). Attribute sẽ bị gỡ khỏi host để không hiện tooltip native |
| \`placement\` | string | \`'top'\` | 12 vị trí: \`top\`, \`top-start\`, \`top-end\`, \`bottom\`, \`bottom-start\`, \`bottom-end\`, \`left\`, \`left-start\`, \`left-end\`, \`right\`, \`right-start\`, \`right-end\` |
| \`trigger\` | string | \`'hover'\` | Cách kích hoạt, cách nhau bởi dấu cách: \`hover\` (gồm cả focus bàn phím), \`focus\`, \`click\`, \`manual\` |
| \`open\` | boolean | \`false\` | Trạng thái mở (controlled) — tự phản chiếu khi tooltip mở/đóng |
| \`arrow\` | string | \`'true'\` | \`arrow="false"\` để ẩn mũi tên |
| \`delay\` | number | \`100\` | Thời gian chờ trước khi hiện (ms) |
| \`hide-delay\` | number | \`100\` | Thời gian chờ trước khi ẩn (ms) |
| \`color\` | string | _xám đậm_ | \`primary\`, \`secondary\`, \`success\`, \`warning\`, \`danger\`, \`info\` hoặc màu CSS bất kỳ |
| \`max-width\` | string | \`'250px'\` | Chiều rộng tối đa của popup |
| \`disabled\` | boolean | \`false\` | Tắt tooltip |
| \`offset\` | number | \`8\` | Khoảng cách (px) giữa trigger và popup |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`open-change\` | \`{ open: boolean }\` | Phát khi tooltip mở/đóng do người dùng hoặc method (không phát khi đổi attribute \`open\` từ ngoài) |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Phần tử kích hoạt (trigger) |
| \`content\` | Nội dung phong phú (HTML), ưu tiên hơn attribute \`content\` |

### Methods
| Method | Mô tả |
|--------|-------|
| \`show()\` | Mở tooltip ngay lập tức |
| \`hide()\` | Đóng tooltip ngay lập tức |
| \`toggle()\` | Đảo trạng thái |

### Tương tác & trợ năng
- Rê chuột từ trigger sang tooltip → tooltip vẫn mở (interactive như MUI).
- \`Escape\` đóng tooltip (trừ \`trigger="manual"\`); \`trigger="click"\` đóng khi click ra ngoài.
- Popup có \`role="tooltip"\` và host được gắn \`aria-describedby\`.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-tooltip-bg\` | Màu nền (attribute \`color\` được ưu tiên hơn) |
| \`--hui-tooltip-color\` | Màu chữ |
| \`--hui-tooltip-max-width\` | Chiều rộng tối đa (attribute \`max-width\` ưu tiên hơn), mặc định 250px |
| \`--hui-tooltip-radius\` | Bo góc |
| \`--hui-tooltip-shadow\` | Đổ bóng |
| \`--hui-tooltip-font-size\` | Cỡ chữ |
| \`--hui-tooltip-padding\` | Padding nội dung |

**Parts:** \`trigger\`, \`popup\`, \`content\`, \`arrow\`. Custom state: \`hui-tooltip:state(open)\`.
        `,
      },
    },
    // Ghi chú layout: Rule chung khuyên dùng 'fullscreen' cho overlay (modal, drawer) vì chúng phủ kín màn hình.
    // Tooltip chỉ là popup nhỏ cạnh trigger nên 'centered' (kèm padding trong từng story) hiển thị đẹp hơn
    // và vẫn đủ chỗ cho tooltip bung ra mọi hướng.
    layout: 'centered',
  },

  argTypes: {
    content: { control: 'text', description: 'Nội dung tooltip', table: { type: { summary: 'string' } } },
    title: { control: 'text', description: 'Alias của content', table: { type: { summary: 'string' } } },
    placement: {
      control: 'select',
      options: [
        'top', 'top-start', 'top-end',
        'bottom', 'bottom-start', 'bottom-end',
        'left', 'left-start', 'left-end',
        'right', 'right-start', 'right-end',
      ],
      description: 'Vị trí hiển thị',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'top' } },
    },
    trigger: {
      control: 'select',
      options: ['hover', 'focus', 'click', 'manual', 'hover click'],
      description: 'Cách kích hoạt',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'hover' } },
    },
    open: { control: 'boolean', description: 'Trạng thái mở (controlled)', table: { defaultValue: { summary: 'false' } } },
    arrow: {
      control: 'radio',
      options: ['true', 'false'],
      description: 'Hiện mũi tên',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'true' } },
    },
    delay: { control: 'number', description: 'Độ trễ hiện (ms)', table: { type: { summary: 'number' }, defaultValue: { summary: '100' } } },
    'hide-delay': { control: 'number', description: 'Độ trễ ẩn (ms)', table: { type: { summary: 'number' }, defaultValue: { summary: '100' } } },
    color: {
      control: 'select',
      options: ['', 'primary', 'secondary', 'success', 'warning', 'danger', 'info', '#ec4899'],
      description: 'Màu nền (variant hoặc màu CSS)',
      table: { type: { summary: 'string' } },
    },
    'max-width': { control: 'text', description: 'Chiều rộng tối đa', table: { type: { summary: 'string' }, defaultValue: { summary: '250px' } } },
    disabled: { control: 'boolean', description: 'Tắt tooltip', table: { defaultValue: { summary: 'false' } } },
    offset: { control: 'number', description: 'Khoảng cách tới trigger (px)', table: { type: { summary: 'number' }, defaultValue: { summary: '8' } } },
  },
};

// === STORIES ===

/**
 * Story mặc định — hover (hoặc Tab tới) nút để xem tooltip. Mọi attribute được bind với Controls.
 */
export const Default = {
  render: (args) => html`
    <div style="padding: 80px;">
      <hui-tooltip
        content=${args.content}
        title=${args.title || ''}
        placement=${args.placement}
        trigger=${args.trigger}
        ?open=${args.open}
        arrow=${args.arrow}
        delay=${args.delay}
        hide-delay=${args['hide-delay']}
        color=${args.color || ''}
        max-width=${args['max-width']}
        ?disabled=${args.disabled}
        offset=${args.offset}
        @open-change=${(e) => console.log('[hui-tooltip] open-change', e.detail)}
      >
        <hui-button>Di chuột vào đây</hui-button>
      </hui-tooltip>
    </div>
  `,
  args: {
    content: 'Đây là nội dung tooltip',
    title: '',
    placement: 'top',
    trigger: 'hover',
    open: false,
    arrow: 'true',
    delay: 100,
    'hide-delay': 100,
    color: '',
    'max-width': '250px',
    disabled: false,
    offset: 8,
  },
};

/**
 * 12 vị trí — bố cục giống demo của Ant Design.
 */
export const Placements = {
  render: () => {
    const btn = (p) => html`
      <hui-tooltip content="Tooltip ${p}" placement=${p}>
        <hui-button size="sm" variant="outline" style="width: 96px;">${p}</hui-button>
      </hui-tooltip>
    `;
    return html`
      <div style="padding: 80px; display: grid; grid-template-columns: 110px repeat(3, 110px) 110px; gap: 8px; justify-items: center;">
        <div></div>${btn('top-start')}${btn('top')}${btn('top-end')}<div></div>
        ${btn('left-start')}<div></div><div></div><div></div>${btn('right-start')}
        ${btn('left')}<div></div><div></div><div></div>${btn('right')}
        ${btn('left-end')}<div></div><div></div><div></div>${btn('right-end')}
        <div></div>${btn('bottom-start')}${btn('bottom')}${btn('bottom-end')}<div></div>
      </div>
    `;
  },
};

/**
 * Các kiểu trigger — hover, focus, click (click ra ngoài để đóng), kết hợp hover + click.
 */
export const Triggers = {
  render: () => html`
    <div style="padding: 80px; display: flex; gap: 16px;">
      <hui-tooltip content="Hiện khi hover / Tab" trigger="hover"><hui-button>Hover</hui-button></hui-tooltip>
      <hui-tooltip content="Hiện khi focus" trigger="focus"><input placeholder="Focus vào ô này" /></hui-tooltip>
      <hui-tooltip content="Click lần nữa hoặc click ra ngoài để đóng" trigger="click"><hui-button variant="secondary">Click</hui-button></hui-tooltip>
      <hui-tooltip content="Hover hoặc click" trigger="hover click"><hui-button variant="outline">Hover + Click</hui-button></hui-tooltip>
    </div>
  `,
};

/**
 * Manual / controlled — điều khiển bằng methods show(), hide(), toggle().
 */
export const Manual = {
  render: () => {
    const tip = () => document.querySelector('#tooltip-manual');
    return html`
      <div style="padding: 80px; display: flex; flex-direction: column; align-items: center; gap: 24px;">
        <hui-tooltip id="tooltip-manual" content="Điều khiển bằng JS" trigger="manual" placement="bottom">
          <span style="padding: 6px 12px; border: 1px dashed #94a3b8; border-radius: 6px;">Mục tiêu</span>
        </hui-tooltip>
        <div style="display: flex; gap: 8px;">
          <hui-button size="sm" @click=${() => tip()?.show()}>show()</hui-button>
          <hui-button size="sm" variant="secondary" @click=${() => tip()?.hide()}>hide()</hui-button>
          <hui-button size="sm" variant="outline" @click=${() => tip()?.toggle()}>toggle()</hui-button>
        </div>
      </div>
    `;
  },
};

/**
 * Luôn mở — attribute open (controlled) để xem nhanh giao diện.
 */
export const Open = {
  render: () => html`
    <div style="padding: 80px;">
      <hui-tooltip content="Tooltip đang mở" open trigger="manual"><hui-button>Trigger</hui-button></hui-tooltip>
    </div>
  `,
};

/**
 * Tất cả màu — mặc định, 6 variant và một màu CSS tùy biến.
 */
export const AllVariants = {
  render: () => html`
    <div style="padding: 80px 24px; display: flex; gap: 12px; flex-wrap: wrap;">
      ${['', 'primary', 'secondary', 'success', 'warning', 'danger', 'info', '#ec4899'].map(
        (c) => html`
          <hui-tooltip content=${c || 'default'} color=${c} open trigger="manual">
            <hui-button size="sm" variant="ghost">${c || 'default'}</hui-button>
          </hui-tooltip>
        `
      )}
    </div>
  `,
};

/**
 * Không có mũi tên & offset tùy chỉnh.
 */
export const ArrowAndOffset = {
  render: () => html`
    <div style="padding: 80px; display: flex; gap: 24px;">
      <hui-tooltip content="Không mũi tên" arrow="false" open trigger="manual"><hui-button>arrow="false"</hui-button></hui-tooltip>
      <hui-tooltip content="Cách 20px" offset="20" open trigger="manual" placement="bottom"><hui-button>offset="20"</hui-button></hui-tooltip>
    </div>
  `,
};

/**
 * Delay — hiện chậm 600ms, ẩn chậm 400ms.
 */
export const Delays = {
  render: () => html`
    <div style="padding: 80px;">
      <hui-tooltip content="Hiện sau 600ms, ẩn sau 400ms" delay="600" hide-delay="400">
        <hui-button>Hover và chờ</hui-button>
      </hui-tooltip>
    </div>
  `,
};

/**
 * Nội dung dài — tự xuống dòng theo max-width.
 */
export const LongContent = {
  render: () => html`
    <div style="padding: 80px; display: flex; gap: 24px;">
      <hui-tooltip content="Đây là một đoạn nội dung khá dài để minh họa việc tooltip tự động xuống dòng khi vượt quá max-width mặc định 250px.">
        <hui-button>max-width 250px</hui-button>
      </hui-tooltip>
      <hui-tooltip max-width="400px" content="Đây là một đoạn nội dung khá dài để minh họa việc tooltip tự động xuống dòng khi vượt quá max-width 400px.">
        <hui-button variant="outline">max-width 400px</hui-button>
      </hui-tooltip>
    </div>
  `,
};

/**
 * Slot content — nội dung HTML phong phú; có thể rê chuột vào tooltip để click link.
 */
export const RichContent = {
  render: () => html`
    <div style="padding: 120px 80px;">
      <hui-tooltip placement="bottom" max-width="280px">
        <hui-button variant="secondary">Thông tin tài khoản</hui-button>
        <div slot="content">
          <strong>Nguyễn Văn A</strong>
          <div style="opacity: 0.8; font-size: 12px;">Quản trị viên · Hà Nội</div>
          <a href="#" style="color: #a5b4fc;">Xem hồ sơ →</a>
        </div>
      </hui-tooltip>
    </div>
  `,
};

/**
 * Disabled — tooltip không hiển thị dù hover.
 */
export const Disabled = {
  render: () => html`
    <div style="padding: 80px;">
      <hui-tooltip content="Bạn sẽ không thấy dòng này" disabled>
        <hui-button variant="ghost">Tooltip bị tắt</hui-button>
      </hui-tooltip>
    </div>
  `,
};

/**
 * Tự lật & bám theo khi cuộn — trigger nằm sát mép trên viewport nên placement="top"
 * tự chuyển xuống dưới. Cuộn trang để thấy tooltip đổi phía và bám theo trigger.
 */
export const AutoFlip = {
  // Story này cần trigger nằm sát mép viewport → dùng layout fullscreen
  parameters: { layout: 'fullscreen' },
  render: () => html`
    <div style="height: 200vh; padding: 4px 16px;">
      <hui-tooltip content="placement=top nhưng đã tự lật xuống dưới" placement="top" open trigger="manual">
        <hui-button size="sm">placement="top"</hui-button>
      </hui-tooltip>
    </div>
  `,
};

/**
 * Override từ bên ngoài — biến CSS trên thẻ cha (áp cho mọi tooltip con), ::part() và :state(open).
 */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .tip-brand {
        --hui-tooltip-bg: var(--hui-primary-9);
        --hui-tooltip-radius: 10px;
        --hui-tooltip-padding: 8px 14px;
        --hui-tooltip-font-size: var(--hui-font-xs);
      }
      .tip-brand hui-tooltip::part(content) { font-weight: var(--hui-font-weight-semibold); letter-spacing: 0.02em; }
      .tip-brand hui-tooltip::part(popup) { border: 1px solid var(--hui-primary-5); }
      .tip-brand hui-tooltip:state(open)::part(trigger) { outline: 2px dashed var(--hui-primary); outline-offset: 4px; border-radius: 4px; }
    </style>
    <div class="tip-brand" style="padding: 80px; display: flex; gap: 24px;">
      <hui-tooltip content="Biến CSS từ thẻ cha" open trigger="manual"><hui-button>Mở sẵn</hui-button></hui-tooltip>
      <hui-tooltip content="Hover để thấy :state(open)" placement="bottom"><hui-button variant="outline">Hover</hui-button></hui-tooltip>
    </div>
  `,
  // Kiểm thử: show() → popup hiện, open-change phát, attribute open phản chiếu; hide() → ẩn
  play: async ({ canvasElement }) => {
    const tip = canvasElement.querySelectorAll('hui-tooltip')[1];
    const popup = tip.shadowRoot.querySelector('[part="popup"]');
    const events = [];
    tip.addEventListener('open-change', (e) => events.push(e.detail.open));

    tip.show();
    await waitFor(() => expect(popup.hidden).toBe(false));
    await expect(tip.hasAttribute('open')).toBe(true);
    await expect(popup.dataset.side).toBe('bottom');

    tip.hide();
    await waitFor(() => expect(popup.hidden).toBe(true), { timeout: 2000 });
    await expect(events).toEqual([true, false]);
  },
};
