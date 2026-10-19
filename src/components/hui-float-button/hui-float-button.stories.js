/**
 * Storybook Stories — HUI Float Button + Float Group
 * Nút nổi góc màn hình: kiểu, hình dạng, badge, tooltip, liên kết; cụm nút xòe ra (SpeedDial) có stagger.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-back-top/index.js';

export default {
  title: 'Molecules/HuiFloatButton',
  component: 'hui-float-button',
  subcomponents: { HuiFloatGroup: 'hui-float-group' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Float Button** — Nút nổi ở góc màn hình (Ant FloatButton + MUI Fab), và **\`<hui-float-group>\`**
— cụm nút xòe ra từ một nút chính (Ant FloatButton.Group + MUI SpeedDial).

Nút đứng riêng được cố định ở góc (\`position\`, \`offset\`). Trong nhóm, nhóm tự gắn \`inline\` cho các con
(\`hui-float-button\`, \`hui-back-top\`) để xếp chồng theo chiều dọc. Khi mở, các nút con xuất hiện **so le** (~40ms/nút).

> Các ví dụ đặt trong khung có \`transform\` để phần tử \`position: fixed\` bám theo khung thay vì cửa sổ.

### Cách sử dụng
\`\`\`html
<hui-float-button icon="chat" type="primary" tooltip="Hỗ trợ" badge="3"></hui-float-button>

<hui-float-group trigger="click" position="bottom-right">
  <hui-float-button icon="edit" tooltip="Soạn bài"></hui-float-button>
  <hui-float-button icon="settings" tooltip="Cài đặt"></hui-float-button>
  <hui-back-top></hui-back-top>
</hui-float-group>
\`\`\`

### Attributes — \`hui-float-button\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`icon\` | string | — | Tên icon (hui-icon) |
| \`description\` | string | — | Mô tả ngắn dưới icon (hợp với \`shape="square"\`) |
| \`href\` / \`target\` | string | — | Biến nút thành liên kết \`<a>\`; \`_blank\` tự thêm \`rel="noopener noreferrer"\` |
| \`type\` | string | \`'default'\` | \`default\` \\| \`primary\` |
| \`shape\` | string | \`'circle'\` | \`circle\` \\| \`square\` |
| \`size\` | string | \`'md'\` | \`sm\` (32) \\| \`md\` (40) \\| \`lg\` (48) |
| \`badge\` | string | — | Số đếm (hui-badge); \`"dot"\` = chấm |
| \`tooltip\` | string | — | Tooltip (hui-tooltip), đồng thời làm \`aria-label\` |
| \`tooltip-placement\` | string | \`'left'\` | Vị trí tooltip (nhóm tự đặt theo góc) |
| \`position\` | string | \`'bottom-right'\` | \`bottom-right\` \\| \`bottom-left\` \\| \`top-right\` \\| \`top-left\` (khi đứng riêng) |
| \`offset\` | string | \`'24'\` | Khoảng cách tới mép (px): \`"24"\` hoặc \`"x,y"\` |
| \`inline\` | boolean | \`false\` | Nằm trong luồng trang (nhóm tự đặt) |
| \`pulse\` | boolean | \`false\` | Vòng lan nhẹ thu hút chú ý |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Attributes — \`hui-float-group\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`trigger\` | string | \`'click'\` | \`click\` \\| \`hover\` \\| \`none\` (luôn bung, ẩn nút chính) |
| \`open\` | boolean | \`false\` | Trạng thái mở (tự phản chiếu) |
| \`position\` / \`offset\` | string | \`'bottom-right'\` / \`'24'\` | Góc màn hình / khoảng cách tới mép |
| \`icon\` | string | \`'plus'\` | Icon nút chính — xoay 45° thành × khi mở |
| \`close-icon\` | string | — | Icon thay thế khi mở (thay cho xoay) |
| \`type\` | string | \`'primary'\` | Kiểu nút chính |
| \`shape\` / \`size\` | string | \`'circle'\` / \`'md'\` | Áp cho nút chính và (khi có attribute) mọi nút con |
| \`label\` | string | locale | \`aria-label\` nút chính (\`floatGroup.toggle\`) |
| \`pulse\` / \`inline\` / \`no-animation\` | boolean | \`false\` | Như hui-float-button |

### Methods (\`hui-float-group\`) · Events
| Tên | Mô tả |
|-----|-------|
| \`show()\` / \`hide()\` / \`toggle()\` | Mở / đóng / đảo |
| \`open-change\` | Mở/đóng do người dùng hoặc method. \`detail: { open }\` |

### Slots
| Thẻ | Slot | Mô tả |
|-----|------|-------|
| float-button | \`icon\` | Icon tùy chỉnh |
| float-button | \`description\` | Mô tả dạng HTML |
| float-group | _(default)_ | Các nút con |
| float-group | \`icon\` | Icon nút chính |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Enter\` / \`Space\` | Bấm nút / mở-đóng nhóm |
| \`Tab\` | Đi qua nút chính và các nút con |
| \`Esc\` | Đóng nhóm, trả focus về nút chính |

Nút chính có \`aria-expanded\` + \`aria-controls\`. Click ra ngoài nhóm → đóng.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-float-button-size\` / \`--hui-float-button-radius\` | Đường kính / bo góc (square) |
| \`--hui-float-button-bg\` / \`-color\` / \`-hover-bg\` | Màu kiểu default |
| \`--hui-float-button-primary-bg\` / \`-primary-color\` / \`-primary-hover-bg\` | Màu kiểu primary |
| \`--hui-float-button-shadow\` / \`--hui-float-button-icon-size\` | Đổ bóng / cỡ icon |
| \`--hui-float-button-focus-color\` / \`--hui-float-button-pulse-color\` | Viền focus / màu vòng lan |
| \`--hui-float-button-offset-x\` / \`-offset-y\` | Khoảng cách tới mép (nút đứng riêng) |
| \`--hui-float-group-gap\` | Khoảng cách giữa các nút trong nhóm (16px) |
| \`--hui-float-group-offset-x\` / \`-offset-y\` | Khoảng cách nhóm tới mép |

**Parts (float-button):** \`base\`, \`icon\`, \`description\`, \`badge\`, \`badge-indicator\`.
**Parts (float-group):** \`base\`, \`list\`, \`toggle\`, \`toggle-icon\`. Custom state: \`hui-float-group:state(open)\`.
        `,
      },
    },
  },
  argTypes: {
    icon: { control: 'text' },
    description: { control: 'text' },
    type: { control: 'select', options: ['default', 'primary'], table: { defaultValue: { summary: 'default' } } },
    shape: { control: 'select', options: ['circle', 'square'], table: { defaultValue: { summary: 'circle' } } },
    size: { control: 'select', options: ['sm', 'md', 'lg'], table: { defaultValue: { summary: 'md' } } },
    position: { control: 'select', options: ['bottom-right', 'bottom-left', 'top-right', 'top-left'] },
    badge: { control: 'text' },
    tooltip: { control: 'text' },
    pulse: { control: 'boolean' },
  },
};

/** Khung có transform → con `position: fixed` bám theo khung */
const frame = (content, height = 260) => html`
  <div style="position: relative; height: ${height}px; transform: translateZ(0); border: 1px dashed var(--hui-border); border-radius: 12px; overflow: hidden; color: var(--hui-text-muted); padding: 16px; box-sizing: border-box;">
    <span>Khung demo (nút cố định ở góc khung)</span>
    ${content}
  </div>
`;

/** Nút đứng riêng ở góc — Controls đổi kiểu, hình dạng, badge... */
export const Default = {
  args: { icon: 'chat', description: '', type: 'primary', shape: 'circle', size: 'md', position: 'bottom-right', badge: '3', tooltip: 'Hỗ trợ trực tuyến', pulse: false },
  render: (args) => frame(html`
    <hui-float-button
      id="fb-default"
      icon=${args.icon}
      description=${args.description}
      type=${args.type}
      shape=${args.shape}
      size=${args.size}
      position=${args.position}
      badge=${args.badge}
      tooltip=${args.tooltip}
      ?pulse=${args.pulse}
    ></hui-float-button>
  `),
  play: async ({ canvasElement }) => {
    const fb = canvasElement.querySelector('#fb-default');
    const base = fb.shadowRoot.querySelector('[part~="base"]');
    await expect(base.tagName).toBe('BUTTON');
    await expect(base.getAttribute('aria-label')).toBe('Hỗ trợ trực tuyến');
    await expect(fb.shadowRoot.querySelector('hui-badge').getAttribute('count')).toBe('3');
    await expect(getComputedStyle(fb).position).toBe('fixed');
  },
};

/** Kiểu, hình dạng, kích thước, mô tả (đặt `inline` để xếp trong luồng) */
export const Variants = {
  render: () => html`
    <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
      <hui-float-button inline icon="plus" aria-label="Thêm"></hui-float-button>
      <hui-float-button inline icon="plus" type="primary" aria-label="Thêm"></hui-float-button>
      <hui-float-button inline icon="edit" shape="square" aria-label="Sửa"></hui-float-button>
      <hui-float-button inline icon="edit" shape="square" type="primary" aria-label="Sửa"></hui-float-button>
      <hui-float-button inline icon="star" size="sm" aria-label="Nhỏ"></hui-float-button>
      <hui-float-button inline icon="star" size="lg" type="primary" aria-label="Lớn"></hui-float-button>
      <hui-float-button inline icon="info" shape="square" description="Trợ giúp"></hui-float-button>
      <hui-float-button inline shape="square" type="primary" description="HELP" aria-label="Help"></hui-float-button>
    </div>
  `,
};

/** Badge số / chấm và vòng lan `pulse` */
export const BadgeAndPulse = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: center; padding: 16px;">
      <hui-float-button inline icon="heart" badge="5" aria-label="Yêu thích"></hui-float-button>
      <hui-float-button inline icon="heart" badge="120" shape="square" aria-label="Yêu thích"></hui-float-button>
      <hui-float-button inline icon="info" badge="dot" aria-label="Thông báo"></hui-float-button>
      <hui-float-button inline icon="user" type="primary" pulse aria-label="Hỗ trợ"></hui-float-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [count, , dot, pulse] = canvasElement.querySelectorAll('hui-float-button');
    await expect(count.shadowRoot.querySelector('hui-badge').getAttribute('count')).toBe('5');
    await expect(dot.shadowRoot.querySelector('hui-badge').hasAttribute('dot')).toBe(true);
    await expect(pulse.shadowRoot.querySelector('[part~="base"]').classList.contains('fb--pulse')).toBe(true);
  },
};

/** Liên kết: có `href` → thẻ `<a>` */
export const Link = {
  render: () => html`
    <div style="display: flex; gap: 16px;">
      <hui-float-button id="fb-link" inline icon="home" href="https://example.com" target="_blank" tooltip="Trang chủ (tab mới)"></hui-float-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const link = canvasElement.querySelector('#fb-link').shadowRoot.querySelector('a');
    await expect(link.getAttribute('href')).toBe('https://example.com');
    await expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  },
};

/** Nhóm mở bằng click — Esc / click ra ngoài để đóng */
export const Group = {
  render: () => frame(html`
    <hui-float-group id="fg-click">
      <hui-float-button icon="edit" tooltip="Soạn bài"></hui-float-button>
      <hui-float-button icon="copy" tooltip="Nhân bản"></hui-float-button>
      <hui-float-button icon="settings" tooltip="Cài đặt" badge="2"></hui-float-button>
    </hui-float-group>
  `, 320),
  // Kiểm thử: click mở (aria-expanded, open-change) → Esc đóng và trả focus về nút chính
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('#fg-click');
    const toggle = group.shadowRoot.querySelector('[part="toggle"]');
    const list = group.shadowRoot.querySelector('[part="list"]');
    const events = [];
    group.addEventListener('open-change', (e) => events.push(e.detail.open));

    // Nhóm tự gắn inline cho con
    await expect([...group.children].every((el) => el.hasAttribute('inline'))).toBe(true);
    await expect(list.hidden).toBe(true);

    toggle.click();
    await waitFor(() => expect(group.open).toBe(true));
    await expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await expect(list.hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(group.open).toBe(false));
    await expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await waitFor(() => expect(list.hidden).toBe(true), { timeout: 2000 });
    await expect(group.shadowRoot.activeElement).toBe(toggle);

    // Click ra ngoài cũng đóng
    group.show();
    await waitFor(() => expect(list.hidden).toBe(false));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await waitFor(() => expect(group.open).toBe(false));
    await expect(events).toEqual([true, false, true, false]);
  },
};

/** Mở khi rê chuột (hover) */
export const GroupHover = {
  render: () => frame(html`
    <hui-float-group trigger="hover" type="default" icon="more">
      <hui-float-button icon="search" tooltip="Tìm kiếm"></hui-float-button>
      <hui-float-button icon="calendar" tooltip="Lịch"></hui-float-button>
    </hui-float-group>
  `, 240),
};

/** `trigger="none"` — luôn bung, không có nút chính; kèm hui-back-top (tự nằm trong cụm) */
export const GroupAlwaysOpen = {
  render: () => html`
    <div style="position: relative; transform: translateZ(0); border: 1px dashed var(--hui-border); border-radius: 12px; overflow: hidden;">
      <div id="fg-scroll" style="height: 320px; overflow: auto; padding: 16px; color: var(--hui-text-muted);">
        <p>Cuộn xuống để hui-back-top xuất hiện ở đầu cụm.</p>
        ${Array.from({ length: 30 }, (_, i) => html`<p>Dòng ${i + 1}</p>`)}
      </div>
      <hui-float-group id="fg-none" trigger="none" shape="square">
        <hui-back-top target="#fg-scroll" visibility-height="100"></hui-back-top>
        <hui-float-button icon="chat" tooltip="Chat"></hui-float-button>
        <hui-float-button icon="info" description="Hỏi đáp"></hui-float-button>
      </hui-float-group>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('#fg-none');
    const backTop = group.querySelector('hui-back-top');
    await expect(group.shadowRoot.querySelector('[part="toggle"]').hidden).toBe(true);
    await expect(group.shadowRoot.querySelector('[part="list"]').hidden).toBe(false);
    await expect(backTop.hasAttribute('inline')).toBe(true);
    await expect(getComputedStyle(backTop).position).toBe('relative');
    await expect(group.querySelector('hui-float-button').getAttribute('shape')).toBe('square');

    canvasElement.querySelector('#fg-scroll').scrollTop = 500;
    await waitFor(() => expect(backTop.hasAttribute('visible')).toBe(true));
  },
};

/** Các góc + icon đóng riêng (`close-icon`) */
export const Positions = {
  render: () => frame(html`
    <hui-float-group position="top-left" offset="16" open icon="menu" close-icon="close" type="default">
      <hui-float-button icon="home" tooltip="Trang chủ"></hui-float-button>
      <hui-float-button icon="user" tooltip="Tài khoản"></hui-float-button>
    </hui-float-group>
    <hui-float-group position="bottom-left" offset="16" open>
      <hui-float-button icon="star" tooltip="Đánh dấu"></hui-float-button>
      <hui-float-button icon="heart" tooltip="Yêu thích"></hui-float-button>
    </hui-float-group>
  `, 340),
};

/** Override từ bên ngoài — biến CSS trên thẻ cha + ::part() + :state(open) */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .fb-brand {
        --hui-float-button-size: 52px;
        --hui-float-button-bg: var(--hui-primary-1);
        --hui-float-button-color: var(--hui-primary);
        --hui-float-button-hover-bg: var(--hui-primary-2);
        --hui-float-button-primary-bg: var(--hui-success);
        --hui-float-button-primary-hover-bg: color-mix(in oklab, var(--hui-success) 85%, var(--hui-shade-mix));
        --hui-float-button-icon-size: 22px;
        --hui-float-group-gap: 10px;
      }
      .fb-brand hui-float-group::part(toggle) { box-shadow: 0 6px 20px color-mix(in srgb, var(--hui-success) 45%, transparent); }
      .fb-brand hui-float-group:state(open)::part(toggle) { background: var(--hui-danger); }
      .fb-brand hui-float-button::part(base) { border: 1px solid var(--hui-primary-3); }
    </style>
    <div class="fb-brand">
      ${frame(html`
        <hui-float-group open>
          <hui-float-button icon="edit" tooltip="Soạn"></hui-float-button>
          <hui-float-button icon="download" tooltip="Tải về"></hui-float-button>
        </hui-float-group>
      `, 300)}
    </div>
  `,
};
