/**
 * Storybook Stories — HUI Drawer
 * Ngăn kéo trượt từ mép màn hình: 4 hướng, kích thước, mask, drawer lồng nhau.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

export default {
  title: 'Components/HuiDrawer',
  component: 'hui-drawer',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
**HUI Drawer** — Ngăn kéo trượt ra từ mép màn hình (Ant Drawer + MUI Drawer).

Có mask: \`<dialog>.showModal()\` (top-layer, trang bên dưới inert, focus trap, khóa cuộn). \`mask="false"\`: hiện bằng
Popover API — không modal, trang bên dưới vẫn thao tác được. Đóng xong trả focus về phần tử đã mở drawer.
Drawer đặt bên trong drawer khác → khi mở, drawer cha lùi vào một đoạn (\`--hui-drawer-push-distance\`).

### Cách sử dụng
\`\`\`html
<hui-drawer id="d" title="Bộ lọc" placement="right" size="large">
  <hui-button slot="extra" size="sm">Áp dụng</hui-button>
  Nội dung...
  <div slot="footer"><hui-button>Đóng</hui-button></div>
</hui-drawer>
<script> document.querySelector('#d').show(); </script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`open\` | boolean | \`false\` | Trạng thái mở |
| \`title\` | string | — | Tiêu đề (hoặc slot \`header\`) |
| \`placement\` | string | \`'right'\` | \`right\` \\| \`left\` \\| \`top\` \\| \`bottom\` |
| \`size\` | string | \`'default'\` | \`default\` (378px) \\| \`large\` (736px) \\| độ dài CSS bất kỳ (số = px). Rộng với left/right, cao với top/bottom |
| \`mask\` | string | \`'true'\` | \`'false'\` = không lớp phủ, không modal |
| \`mask-closable\` | string | \`'true'\` | \`'false'\` = click mask không đóng |
| \`closable\` | string | \`'true'\` | \`'false'\` = ẩn nút X |
| \`keyboard\` | string | \`'true'\` | \`'false'\` = Esc không đóng |

### Methods
| Method | Mô tả |
|--------|-------|
| \`show()\` / \`hide()\` / \`toggle()\` | Mở / đóng / đảo trạng thái |

### Events
| Event | Mô tả |
|-------|-------|
| \`hui-open\` | Vừa mở |
| \`hui-close\` | Bắt đầu đóng |
| \`hui-after-close\` | Đã đóng xong (hết animation) |
| \`hui-cancel\` | Người dùng muốn đóng (X / Esc / mask). Cancelable: \`preventDefault()\` để giữ mở |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Nội dung body |
| \`header\` | Thay vùng tiêu đề |
| \`extra\` | Hành động bên phải header |
| \`footer\` | Footer (tự ẩn khi trống) |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Esc\` | Đóng drawer trên cùng (trừ \`keyboard="false"\`) |
| \`Tab\` / \`Shift+Tab\` | Chạy vòng trong drawer (khi có mask) |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-drawer-size\` | Rộng / cao (attribute \`size\` dạng độ dài ưu tiên hơn) |
| \`--hui-drawer-bg\` / \`--hui-drawer-color\` | Nền / màu chữ |
| \`--hui-drawer-shadow\` / \`--hui-drawer-mask-bg\` | Đổ bóng / nền lớp phủ |
| \`--hui-drawer-border-color\` | Đường kẻ header / footer |
| \`--hui-drawer-header-padding\` / \`--hui-drawer-body-padding\` / \`--hui-drawer-footer-padding\` | Padding |
| \`--hui-drawer-title-font-size\` / \`--hui-drawer-title-color\` | Tiêu đề |
| \`--hui-drawer-push-distance\` | Khoảng đẩy drawer cha (180px) |

**Parts:** \`dialog\`, \`mask\`, \`panel\`, \`header\`, \`close\`, \`title\`, \`extra\`, \`body\`, \`footer\`. Custom state: \`hui-drawer:state(open)\`.
        `,
      },
    },
  },
  argTypes: {
    placement: { control: 'select', options: ['right', 'left', 'top', 'bottom'], table: { defaultValue: { summary: 'right' } } },
    size: { control: 'text', table: { defaultValue: { summary: 'default' } } },
    title: { control: 'text' },
    mask: { control: 'radio', options: ['true', 'false'] },
    maskClosable: { control: 'radio', options: ['true', 'false'] },
    closable: { control: 'radio', options: ['true', 'false'] },
  },
};

const byId = (id) => document.querySelector(`#${id}`);

/** Drawer cơ bản — Controls đổi placement, size, mask... */
export const Default = {
  args: { placement: 'right', size: 'default', title: 'Thông tin', mask: 'true', maskClosable: 'true', closable: 'true' },
  render: (args) => html`
    <div style="padding: 24px;">
      <hui-button id="drawer-trigger" @hui-click=${() => byId('drawer-default').show()}>Mở Drawer</hui-button>
    </div>
    <hui-drawer
      id="drawer-default"
      title=${args.title}
      placement=${args.placement}
      size=${args.size}
      mask=${args.mask}
      mask-closable=${args.maskClosable}
      closable=${args.closable}
    >
      <p>Nội dung drawer.</p>
      <p><input placeholder="Ô nhập để thử Tab" /></p>
      <div slot="footer">
        <hui-button variant="ghost" @hui-click=${() => byId('drawer-default').hide()}>Đóng</hui-button>
      </div>
    </hui-drawer>
  `,
  // Kiểm thử: mở → focus vào trong → Esc đóng → trả focus về nút đã mở
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector('#drawer-trigger');
    const drawer = canvasElement.querySelector('#drawer-default');
    const dialog = drawer.shadowRoot.querySelector('dialog');
    const events = [];
    drawer.addEventListener('hui-open', () => events.push('open'));
    drawer.addEventListener('hui-close', () => events.push('close'));

    trigger.focus();
    drawer.show();
    await waitFor(() => expect(dialog.open).toBe(true));
    await expect(drawer.hasAttribute('open')).toBe(true);
    // Focus trap: focus nằm trong drawer (nút X là phần tử Tab tới được đầu tiên)
    await waitFor(() => expect(drawer.shadowRoot.activeElement).toBe(drawer.shadowRoot.querySelector('[part="close"]')));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(dialog.open).toBe(false), { timeout: 2000 });
    await expect(drawer.open).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await expect(events).toEqual(['open', 'close']);
  },
};

/** 4 hướng */
export const Placements = {
  render: () => html`
    <div style="padding: 24px; display: flex; gap: 8px;">
      ${['left', 'right', 'top', 'bottom'].map((p) => html`
        <hui-button variant="outline" @hui-click=${() => byId(`drawer-${p}`).show()}>${p}</hui-button>
        <hui-drawer id="drawer-${p}" placement=${p} title="placement=&quot;${p}&quot;"><p>Trượt từ mép ${p}.</p></hui-drawer>
      `)}
    </div>
  `,
};

/** Kích thước: large (736px) và độ dài CSS tùy ý */
export const Sizes = {
  render: () => html`
    <div style="padding: 24px; display: flex; gap: 8px;">
      <hui-button variant="outline" @hui-click=${() => byId('drawer-large').show()}>size="large"</hui-button>
      <hui-button variant="outline" @hui-click=${() => byId('drawer-50').show()}>size="50%"</hui-button>
      <hui-button variant="outline" @hui-click=${() => byId('drawer-bottom-200').show()}>bottom, size="200"</hui-button>
    </div>
    <hui-drawer id="drawer-large" size="large" title="736px"><p>Kích thước large.</p></hui-drawer>
    <hui-drawer id="drawer-50" size="50%" title="50%"><p>Nửa màn hình.</p></hui-drawer>
    <hui-drawer id="drawer-bottom-200" size="200" placement="bottom" title="Cao 200px"><p>Placement bottom.</p></hui-drawer>
  `,
  play: async ({ canvasElement }) => {
    const wrapper = (id) => canvasElement.querySelector(`#${id}`).shadowRoot.querySelector('.wrapper');
    await expect(wrapper('drawer-large').classList.contains('wrapper--large')).toBe(true);
    await expect(wrapper('drawer-50').style.getPropertyValue('--_drawer-size-attr')).toBe('50%');
    await expect(wrapper('drawer-bottom-200').style.getPropertyValue('--_drawer-size-attr')).toBe('200px');
  },
};

/** Header có extra + footer */
export const ExtraAndFooter = {
  render: () => html`
    <div style="padding: 24px;"><hui-button @hui-click=${() => byId('drawer-extra').show()}>Tạo mới</hui-button></div>
    <hui-drawer id="drawer-extra" title="Tạo tài khoản" size="480">
      <hui-button slot="extra" size="sm" variant="ghost" @hui-click=${() => byId('drawer-extra').hide()}>Hủy</hui-button>
      <hui-button slot="extra" size="sm" @hui-click=${() => byId('drawer-extra').hide()}>Lưu</hui-button>
      <p>Form tạo tài khoản...</p>
      <div slot="footer" style="width: 100%; color: var(--hui-text-muted); font-size: var(--hui-font-sm);">Bản nháp tự lưu</div>
    </hui-drawer>
  `,
};

/** Không có mask — trang bên dưới vẫn thao tác được */
export const NoMask = {
  render: () => html`
    <div style="padding: 24px; display: flex; gap: 8px;">
      <hui-button @hui-click=${() => byId('drawer-nomask').toggle()}>Bật / tắt drawer</hui-button>
      <input placeholder="Vẫn gõ được khi drawer mở" />
    </div>
    <hui-drawer id="drawer-nomask" mask="false" title="Không mask"><p>Trang bên dưới không bị khóa.</p></hui-drawer>
  `,
  play: async ({ canvasElement }) => {
    const drawer = canvasElement.querySelector('#drawer-nomask');
    const dialog = drawer.shadowRoot.querySelector('dialog');
    drawer.show();
    await waitFor(() => expect(dialog.matches(':popover-open')).toBe(true));
    await expect(dialog.open).toBe(false); // không phải showModal → trang không inert
    drawer.hide();
    await waitFor(() => expect(dialog.matches(':popover-open')).toBe(false), { timeout: 2000 });
  },
};

/** Drawer lồng nhau — mở drawer con thì drawer cha lùi vào */
export const Nested = {
  render: () => html`
    <div style="padding: 24px;"><hui-button @hui-click=${() => byId('drawer-parent').show()}>Mở drawer cấp 1</hui-button></div>
    <hui-drawer id="drawer-parent" title="Cấp 1" size="520">
      <hui-button @hui-click=${() => byId('drawer-child').show()}>Mở drawer cấp 2</hui-button>
      <hui-drawer id="drawer-child" title="Cấp 2"><p>Esc đóng drawer này trước.</p></hui-drawer>
    </hui-drawer>
  `,
  play: async ({ canvasElement }) => {
    const parent = canvasElement.querySelector('#drawer-parent');
    const child = canvasElement.querySelector('#drawer-child');
    const pWrapper = parent.shadowRoot.querySelector('.wrapper');
    parent.show();
    await waitFor(() => expect(parent.shadowRoot.querySelector('dialog').open).toBe(true));
    child.show();
    await waitFor(() => expect(child.shadowRoot.querySelector('dialog').open).toBe(true));
    await expect(pWrapper.classList.contains('wrapper--pushed')).toBe(true);

    // Esc chỉ đóng drawer trên cùng
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(child.open).toBe(false));
    await expect(parent.open).toBe(true);
    await expect(pWrapper.classList.contains('wrapper--pushed')).toBe(false);

    parent.hide();
    await waitFor(() => expect(parent.shadowRoot.querySelector('dialog').open).toBe(false), { timeout: 2000 });
  },
};

/** Override từ bên ngoài — biến CSS trên thẻ cha + ::part() + :state(open) */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .drawer-brand {
        --hui-drawer-size: 420px;
        --hui-drawer-bg: var(--hui-primary-1);
        --hui-drawer-mask-bg: color-mix(in srgb, var(--hui-primary) 30%, transparent);
        --hui-drawer-header-padding: 20px 24px;
        --hui-drawer-title-color: var(--hui-primary);
      }
      .drawer-brand hui-drawer::part(panel) { border-radius: 16px 0 0 16px; }
      .drawer-brand hui-drawer::part(title) { text-transform: uppercase; letter-spacing: 0.06em; }
    </style>
    <div class="drawer-brand" style="padding: 24px;">
      <hui-button @hui-click=${() => byId('drawer-custom').show()}>Drawer tùy biến</hui-button>
      <hui-drawer id="drawer-custom" title="Giao diện riêng"><p>Nền, mask, bo góc, tiêu đề đổi từ bên ngoài.</p></hui-drawer>
    </div>
  `,
};
