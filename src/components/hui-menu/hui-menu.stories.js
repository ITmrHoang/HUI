/**
 * Storybook Stories — HUI Menu
 * Ant Menu + MUI MenuList: inline (sidebar) / vertical / horizontal, thu gọn, theme dark, bàn phím APG.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }));
const titleOf = (sub) => sub.shadowRoot.querySelector('[part~="title"]');
const popupOf = (sub) => sub.shadowRoot.querySelector('[part~="popup"]');

export default {
  title: 'Components/HuiMenu',
  component: 'hui-menu',
  subcomponents: { HuiMenuItem: 'hui-menu-item', HuiSubMenu: 'hui-sub-menu', HuiMenuGroup: 'hui-menu-group', HuiMenuDivider: 'hui-menu-divider' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Menu** — Menu điều hướng (Ant Menu + MUI MenuList). \`hui-menu\` giữ \`selected-keys\` / \`open-keys\`, truyền ngữ cảnh
xuống item con và xử lý click + bàn phím tập trung.

- \`inline\`: sub-menu mở rộng ngay trong menu (animate chiều cao) — dùng cho sidebar.
- \`vertical\`: sub-menu là popup bên phải; \`horizontal\`: menubar, popup phía dưới. Popup nằm trên top-layer (utils/floating),
  Esc / click ra ngoài đóng (utils/overlay).
- \`collapsed\` (inline): chỉ còn icon, nhãn hiện qua tooltip (\`title\`), sub-menu chuyển thành popup.

\`\`\`html
<hui-menu mode="inline" selected-keys="dashboard" open-keys="users" @hui-select=\${(e) => go(e.detail.key)}>
  <hui-menu-item key="dashboard" icon="home">Tổng quan</hui-menu-item>
  <hui-sub-menu key="users" label="Người dùng" icon="user">
    <hui-menu-item key="list">Danh sách</hui-menu-item>
    <hui-menu-item key="roles">Phân quyền</hui-menu-item>
  </hui-sub-menu>
  <hui-menu-divider></hui-menu-divider>
  <hui-menu-group label="Khác">
    <hui-menu-item key="docs" href="/docs">Tài liệu</hui-menu-item>
  </hui-menu-group>
</hui-menu>
\`\`\`

### Attributes — hui-menu
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`mode\` | \`vertical \\| horizontal \\| inline\` | \`vertical\` | Kiểu hiển thị |
| \`collapsed\` | boolean | \`false\` | Thu gọn (chỉ mode inline) |
| \`selected-keys\` | string "a,b" | — | Item đang chọn. Property \`selectedKeys\`: string[] |
| \`open-keys\` | string "a,b" | — | Sub-menu đang mở. Property \`openKeys\`: string[] |
| \`accordion\` | boolean | \`false\` | Inline: mỗi cấp chỉ mở một sub-menu |
| \`theme\` | \`light \\| dark\` | — | dark: gắn \`data-theme="dark"\` lên menu (mọi token chuyển tối, kể cả popup) |
| \`inline-indent\` | number | \`24\` | Thụt lề mỗi cấp (px) |
| \`sub-menu-trigger\` | \`hover \\| click\` | \`hover\` | Cách mở popup (vertical/horizontal) |

### Attributes — item con
| Thẻ | Attribute |
|-----|-----------|
| \`hui-menu-item\` | \`key\`, \`icon\`, \`disabled\`, \`danger\`, \`href\` (render \`<a>\`), \`target\` |
| \`hui-sub-menu\` | \`key\`, \`label\` (hoặc slot \`label\`), \`icon\`, \`disabled\` |
| \`hui-menu-group\` | \`label\` (hoặc slot \`label\`) |
| \`hui-menu-divider\` | \`dashed\` |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-select\` | \`{ key, keyPath, item }\` | Chọn item. \`keyPath\` = [key item, key sub-menu cha, ...] |
| \`hui-open-change\` | \`{ openKeys }\` | Sub-menu đóng/mở do người dùng |

Methods: \`focusFirst()\`, \`focusLast()\`.

### Slots
| Thẻ | Slot |
|-----|------|
| \`hui-menu\` | _(default)_ item con |
| \`hui-menu-item\` | _(default)_ nhãn · \`icon\` · \`extra\` (phím tắt, badge) |
| \`hui-sub-menu\` | _(default)_ item con · \`label\` · \`icon\` |
| \`hui-menu-group\` | _(default)_ item · \`label\` |

### Bàn phím (WAI-ARIA APG menubar / menu, roving tabindex — Tab chỉ dừng ở 1 item)
| Phím | Horizontal (menubar) | Vertical / popup | Inline |
|------|-----|-----|-----|
| \`→\` / \`←\` | Item gốc kế / trước | → mở sub-menu; ← đóng popup, về tiêu đề | → mở / vào con; ← đóng / về cha |
| \`↓\` / \`↑\` | Mở popup, focus item đầu / cuối | Item kế / trước | Item kế / trước (danh sách phẳng) |
| \`Home\` / \`End\` | Item đầu / cuối cùng cấp | như bên | Item đầu / cuối |
| \`Enter\` / \`Space\` | Chọn item / mở sub-menu | như bên | Chọn item / đóng-mở sub-menu |
| \`Esc\` | Đóng popup, focus về tiêu đề | như bên | — |
| \`Tab\` | Rời menu (popup tự đóng) | | |

### Parts
- \`hui-menu\`: \`base\` (role menubar / menu)
- \`hui-menu-item\`: \`base\` (role menuitem), \`icon\`, \`label\`, \`extra\` · state \`:state(selected)\`, \`:state(disabled)\`
- \`hui-sub-menu\`: \`title\`, \`icon\`, \`label\`, \`arrow\`, \`popup\` (role menu) · state \`:state(open)\`
- \`hui-menu-group\`: \`title\`, \`list\` · \`hui-menu-divider\`: \`base\`

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-menu-bg\` / \`--hui-menu-border-color\` | Nền, viền phân cách |
| \`--hui-menu-item-height\` / \`--hui-menu-item-padding-x\` / \`--hui-menu-item-margin\` / \`--hui-menu-item-radius\` / \`--hui-menu-item-gap\` | Kích thước item |
| \`--hui-menu-item-color\` / \`--hui-menu-item-hover-bg\` | Màu item |
| \`--hui-menu-item-selected-bg\` / \`--hui-menu-item-selected-color\` | Item đang chọn |
| \`--hui-menu-font-size\` / \`--hui-menu-icon-size\` | Cỡ chữ / icon |
| \`--hui-menu-collapsed-width\` | Rộng khi thu gọn (64px) |
| \`--hui-menu-horizontal-height\` / \`--hui-menu-horizontal-item-padding-x\` | Menu ngang |
| \`--hui-menu-sub-bg\` | Nền danh sách con inline |
| \`--hui-menu-popup-bg\` / \`--hui-menu-popup-radius\` / \`--hui-menu-popup-shadow\` / \`--hui-menu-popup-min-width\` / \`--hui-menu-popup-max-height\` | Popup |
| \`--hui-menu-group-title-color\` / \`--hui-menu-group-title-font-size\` | Tiêu đề nhóm |
| \`--hui-menu-divider-color\` / \`--hui-menu-divider-margin\` | Divider |
        `,
      },
    },
  },
  argTypes: {
    mode: { control: 'radio', options: ['inline', 'vertical', 'horizontal'] },
    theme: { control: 'radio', options: ['light', 'dark'] },
    collapsed: { control: 'boolean' },
    accordion: { control: 'boolean' },
    'sub-menu-trigger': { control: 'radio', options: ['hover', 'click'] },
  },
};

const items = () => html`
  <hui-menu-item key="home" icon="home">Trang chủ</hui-menu-item>
  <hui-sub-menu key="users" label="Người dùng" icon="user">
    <hui-menu-item key="list">Danh sách</hui-menu-item>
    <hui-menu-item key="roles">Phân quyền</hui-menu-item>
    <hui-sub-menu key="more" label="Nâng cao">
      <hui-menu-item key="audit">Nhật ký</hui-menu-item>
      <hui-menu-item key="export">Xuất dữ liệu</hui-menu-item>
    </hui-sub-menu>
  </hui-sub-menu>
  <hui-sub-menu key="settings" label="Cài đặt" icon="settings">
    <hui-menu-group label="Chung">
      <hui-menu-item key="profile">Hồ sơ</hui-menu-item>
      <hui-menu-item key="security">Bảo mật</hui-menu-item>
    </hui-menu-group>
    <hui-menu-divider></hui-menu-divider>
    <hui-menu-item key="billing" disabled>Thanh toán</hui-menu-item>
  </hui-sub-menu>
  <hui-menu-item key="star" icon="star">Yêu thích <span slot="extra">⌘S</span></hui-menu-item>
  <hui-menu-item key="logout" icon="close" danger>Đăng xuất</hui-menu-item>
`;

export const Default = {
  render: (args) => html`
    <div style="width: 260px;">
      <hui-menu mode=${args.mode} theme=${args.theme} ?collapsed=${args.collapsed} ?accordion=${args.accordion}
        sub-menu-trigger=${args['sub-menu-trigger']} selected-keys="home" open-keys="users"
        @hui-select=${(e) => console.log('[hui-menu] hui-select', e.detail)}
        @hui-open-change=${(e) => console.log('[hui-menu] hui-open-change', e.detail)}>
        ${items()}
      </hui-menu>
    </div>
  `,
  args: { mode: 'inline', theme: 'light', collapsed: false, accordion: false, 'sub-menu-trigger': 'hover' },
};

/** Inline (sidebar): click chọn item → hui-select { key, keyPath }; click tiêu đề → đóng/mở tại chỗ. */
export const Inline = {
  render: () => html`
    <div style="width: 260px;">
      <hui-menu id="menu-inline" mode="inline" selected-keys="home">${items()}</hui-menu>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('#menu-inline');
    const users = menu.querySelector('hui-sub-menu[key="users"]');
    const roles = menu.querySelector('hui-menu-item[key="roles"]');
    const selects = [];
    const opens = [];
    menu.addEventListener('hui-select', (e) => selects.push(e.detail));
    menu.addEventListener('hui-open-change', (e) => opens.push(e.detail.openKeys));

    await waitFor(() => expect(popupOf(users).hidden).toBe(true));
    await expect(menu.shadowRoot.querySelector('[part="base"]').getAttribute('role')).toBe('menu');

    titleOf(users).click();
    await waitFor(() => expect(popupOf(users).hidden).toBe(false));
    await expect(titleOf(users).getAttribute('aria-expanded')).toBe('true');
    await expect(opens).toEqual([['users']]);

    roles.click();
    await expect(selects.length).toBe(1);
    await expect(selects[0].key).toBe('roles');
    await expect(selects[0].keyPath).toEqual(['roles', 'users']);
    await expect(menu.selectedKeys).toEqual(['roles']);
    await waitFor(() => expect(roles.shadowRoot.querySelector('[part="base"]').classList.contains('item--selected')).toBe(true));
    await expect(titleOf(users).classList.contains('item--child-selected')).toBe(true);

    // Item disabled không phát hui-select
    menu.querySelector('hui-menu-item[key="billing"]').click();
    await expect(selects.length).toBe(1);
  },
};

/** Accordion: mở sub-menu này thì sub-menu anh em đóng lại. */
export const Accordion = {
  render: () => html`
    <div style="width: 260px;">
      <hui-menu id="menu-accordion" mode="inline" accordion open-keys="users">${items()}</hui-menu>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('#menu-accordion');
    const settings = menu.querySelector('hui-sub-menu[key="settings"]');
    titleOf(settings).click();
    await expect(menu.openKeys).toEqual(['settings']);
  },
};

/** Vertical: sub-menu mở popup bên phải khi hover (hoặc click / bàn phím). */
export const Vertical = {
  render: () => html`
    <div style="width: 240px; padding-bottom: 160px;">
      <hui-menu mode="vertical" selected-keys="profile">${items()}</hui-menu>
    </div>
  `,
};

/**
 * Horizontal (menubar): ↓ mở popup và focus item đầu, Enter chọn (popup đóng), Esc đóng popup.
 */
export const Horizontal = {
  render: () => html`
    <div style="padding-bottom: 200px;">
      <hui-menu id="menu-bar" mode="horizontal" selected-keys="home" sub-menu-trigger="click">${items()}</hui-menu>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('#menu-bar');
    const home = menu.querySelector('hui-menu-item[key="home"]');
    const users = menu.querySelector('hui-sub-menu[key="users"]');
    const list = menu.querySelector('hui-menu-item[key="list"]');
    const roles = menu.querySelector('hui-menu-item[key="roles"]');
    const selects = [];
    menu.addEventListener('hui-select', (e) => selects.push(e.detail.key));

    await expect(menu.shadowRoot.querySelector('[part="base"]').getAttribute('role')).toBe('menubar');
    // Roving tabindex: chỉ item đang chọn có tabindex 0
    await waitFor(() => expect(home.shadowRoot.querySelector('[part="base"]').tabIndex).toBe(0));
    await expect(titleOf(users).tabIndex).toBe(-1);

    home.focus();
    key(home.shadowRoot.querySelector('[part="base"]'), 'ArrowRight');
    await expect(document.activeElement).toBe(users);

    key(titleOf(users), 'ArrowDown');
    await waitFor(() => expect(popupOf(users).hidden).toBe(false));
    await expect(document.activeElement).toBe(list);

    key(list.shadowRoot.querySelector('[part="base"]'), 'ArrowDown');
    await expect(document.activeElement).toBe(roles);

    // Esc (overlay manager) → đóng popup, focus về tiêu đề
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(popupOf(users).hidden).toBe(true), { timeout: 2000 });
    await expect(document.activeElement).toBe(users);

    // Mở lại, Enter chọn → popup đóng, phát hui-select
    key(titleOf(users), 'Enter');
    await waitFor(() => expect(popupOf(users).hidden).toBe(false));
    key(list.shadowRoot.querySelector('[part="base"]'), 'Enter');
    await expect(selects).toEqual(['list']);
    await waitFor(() => expect(popupOf(users).hidden).toBe(true), { timeout: 2000 });
    await expect(menu.openKeys).toEqual([]);
  },
};

/** Inline bàn phím: ↓ ↑ di chuyển trong danh sách phẳng, → mở sub-menu, ← đóng. */
export const InlineKeyboard = {
  render: () => html`
    <div style="width: 260px;">
      <hui-menu id="menu-kbd" mode="inline">${items()}</hui-menu>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('#menu-kbd');
    const home = menu.querySelector('hui-menu-item[key="home"]');
    const users = menu.querySelector('hui-sub-menu[key="users"]');
    const list = menu.querySelector('hui-menu-item[key="list"]');

    home.focus();
    key(home.shadowRoot.querySelector('[part="base"]'), 'ArrowDown');
    await expect(document.activeElement).toBe(users);
    key(titleOf(users), 'ArrowRight');
    await expect(menu.openKeys).toEqual(['users']);
    key(titleOf(users), 'ArrowDown');
    await expect(document.activeElement).toBe(list);
    key(list.shadowRoot.querySelector('[part="base"]'), 'ArrowLeft');
    await expect(document.activeElement).toBe(users);
    key(titleOf(users), 'ArrowLeft');
    await expect(menu.openKeys).toEqual([]);
    key(titleOf(users), 'End');
    await expect(document.activeElement).toBe(menu.querySelector('hui-menu-item[key="logout"]'));
  },
};

/** Thu gọn: chỉ còn icon (item không icon hiện chữ cái đầu), nhãn qua tooltip, sub-menu thành popup. */
export const Collapsed = {
  render: () => {
    const toggle = () => {
      const m = document.querySelector('#menu-collapsed');
      m.collapsed = !m.collapsed;
    };
    return html`
      <div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start; padding-bottom: 200px;">
        <button @click=${toggle}>Thu gọn / mở rộng</button>
        <hui-menu id="menu-collapsed" mode="inline" collapsed selected-keys="home" style="width: auto;">${items()}</hui-menu>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('#menu-collapsed');
    const home = menu.querySelector('hui-menu-item[key="home"]');
    const base = home.shadowRoot.querySelector('[part="base"]');
    await waitFor(() => expect(base.title).toBe('Trang chủ'));
    await expect(base.classList.contains('item--collapsed')).toBe(true);
  },
};

/** Theme dark — token chuyển tối cho cả menu lẫn popup. */
export const Dark = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: flex-start; padding-bottom: 160px;">
      <div style="width: 240px;">
        <hui-menu theme="dark" mode="inline" selected-keys="list" open-keys="users">${items()}</hui-menu>
      </div>
      <hui-menu theme="dark" mode="horizontal" selected-keys="home" style="flex: 1;">${items()}</hui-menu>
    </div>
  `,
};

/** Override từ bên ngoài — biến CSS trên thẻ cha, ::part() và :state(). */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .menu-brand {
        --hui-menu-item-height: 36px;
        --hui-menu-item-radius: 999px;
        --hui-menu-item-selected-bg: var(--hui-success-1);
        --hui-menu-item-selected-color: var(--hui-success);
        --hui-menu-bg: var(--hui-bg-secondary);
      }
      .menu-brand hui-menu-item::part(label) { font-weight: 500; }
      .menu-brand hui-menu-item:state(selected)::part(base) { box-shadow: inset 3px 0 0 var(--hui-success); }
      .menu-brand hui-sub-menu::part(arrow) { color: var(--hui-success); }
    </style>
    <div class="menu-brand" style="width: 260px;">
      <hui-menu id="menu-custom" mode="inline" selected-keys="home">${items()}</hui-menu>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const menu = canvasElement.querySelector('#menu-custom');
    const base = menu.querySelector('hui-menu-item[key="home"]').shadowRoot.querySelector('[part="base"]');
    await waitFor(() => expect(getComputedStyle(base).minHeight).toBe('36px'));
  },
};
