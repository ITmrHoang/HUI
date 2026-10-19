/**
 * Storybook Stories — HUI Dropdown + Dropdown Button
 * Ant Dropdown + MUI Menu: trigger hover / click / contextmenu, 12 vị trí, mũi tên, menu từ slot hoặc property.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const popupOf = (dd) => dd.shadowRoot.querySelector('[part~="popup"]');

const MENU = [
  { key: 'edit', label: 'Chỉnh sửa', icon: 'edit' },
  { key: 'copy', label: 'Sao chép', icon: 'copy' },
  { key: 'share', label: 'Chia sẻ', children: [
    { key: 'mail', label: 'Email' },
    { key: 'link', label: 'Sao chép link' },
  ] },
  { key: 'locked', label: 'Không khả dụng', disabled: true },
  { divider: true },
  { key: 'delete', label: 'Xóa', icon: 'delete', danger: true },
];

export default {
  title: 'Components/HuiDropdown',
  component: 'hui-dropdown',
  subcomponents: { HuiDropdownButton: 'hui-dropdown-button' },
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
**HUI Dropdown** — Menu thả xuống gắn vào một trigger (Ant Dropdown + MUI Menu). Popup nằm trên top-layer (utils/floating),
đóng khi chọn item, Esc hoặc click ra ngoài (utils/overlay). Nội dung: slot \`menu\` (thường là \`<hui-menu>\`) hoặc property
\`menu\` (mảng item → tự dựng \`<hui-menu>\`).

\`\`\`html
<hui-dropdown trigger="click" @hui-select=\${(e) => run(e.detail.key)}>
  <hui-button>Thao tác</hui-button>
  <hui-menu slot="menu">
    <hui-menu-item key="edit" icon="edit">Sửa</hui-menu-item>
    <hui-menu-item key="delete" danger>Xóa</hui-menu-item>
  </hui-menu>
</hui-dropdown>

<script>
  dropdown.menu = [{ key: 'edit', label: 'Sửa', icon: 'edit' }, { divider: true }, { key: 'more', label: 'Thêm', children: [...] }];
</script>
\`\`\`

### Attributes — hui-dropdown
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`trigger\` | \`hover \\| click \\| contextmenu\` | \`hover\` | Kết hợp bằng dấu cách. contextmenu: mở tại vị trí chuột |
| \`placement\` | string | \`bottom-start\` | 12 vị trí (\`top\`, \`bottom-end\`, \`right-start\`...) hoặc tên Ant (\`bottomLeft\`, \`topRight\`, \`bottomCenter\`...) |
| \`arrow\` | boolean | \`false\` | Mũi tên chỉ vào trigger |
| \`open\` | boolean | \`false\` | Trạng thái mở (controlled), tự phản chiếu |
| \`disabled\` | boolean | \`false\` | Không mở được |
| \`selectable\` | boolean | \`false\` | Giữ đánh dấu item đã chọn |
| \`offset\` | number | \`4\` | Khoảng cách tới trigger (px) |
| \`mouse-enter-delay\` / \`mouse-leave-delay\` | number | \`150\` / \`100\` | Độ trễ hover (ms) |

Property \`menu\`: \`Array<{ key, label, icon?, disabled?, danger?, href?, divider?, type?: 'group', children? }>\`.
Methods: \`show()\`, \`hide()\`, \`toggle()\`.

### Attributes — hui-dropdown-button
\`variant\` (\`outline\`), \`size\`, \`disabled\`, \`loading\`, \`icon\`, \`arrow-icon\` (\`chevron-down\`), \`trigger\` (\`click\`),
\`placement\` (\`bottom-end\`), \`open\`, property \`menu\`.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-select\` | \`{ key, keyPath, item }\` | Nổi bọt từ hui-menu bên trong khi chọn item (popup tự đóng) |
| \`open-change\` | \`{ open }\` | Mở / đóng do người dùng hoặc method |
| \`hui-click\` _(dropdown-button)_ | \`{ originalEvent }\` | Bấm nút chính |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Trigger (dropdown) / nhãn nút chính (dropdown-button) |
| \`menu\` | Nội dung popup |

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`↓\` / \`↑\` trên trigger | Mở và focus item đầu / cuối |
| \`Enter\` / \`Space\` trên trigger | Mở (trigger click: theo click native của nút) |
| Trong menu | Như hui-menu (↑ ↓, → mở sub-menu, Enter chọn) |
| \`Esc\` | Đóng (sub-menu trước), focus về trigger |
| \`Tab\` | Đóng popup |

Trigger được gắn \`aria-haspopup="menu"\` + \`aria-expanded\`.

### Parts
\`trigger\`, \`popup\`, \`content\`, \`arrow\`, \`menu\`, \`menu-base\` · dropdown-button: \`base\`, \`button\`, \`button-base\`,
\`arrow-button\`, \`arrow-button-base\`, \`dropdown\`. State: \`hui-dropdown:state(open)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-dropdown-bg\` | Nền popup |
| \`--hui-dropdown-radius\` | Bo góc |
| \`--hui-dropdown-shadow\` | Đổ bóng |
| \`--hui-dropdown-padding\` | Padding hộp nội dung |
| \`--hui-dropdown-min-width\` / \`--hui-dropdown-max-height\` | Kích thước |
| \`--hui-dropdown-button-gap\` | Khoảng cách 2 nút của dropdown-button |
        `,
      },
    },
  },
  argTypes: {
    trigger: { control: 'select', options: ['hover', 'click', 'contextmenu', 'hover click'] },
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom', 'bottom-end', 'top-start', 'top', 'top-end', 'left-start', 'left', 'left-end',
        'right-start', 'right', 'right-end', 'bottomLeft', 'bottomCenter', 'topRight'],
    },
    arrow: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="padding: 40px 40px 220px;">
      <hui-dropdown trigger=${args.trigger} placement=${args.placement} ?arrow=${args.arrow} ?disabled=${args.disabled}
        .menu=${MENU}
        @hui-select=${(e) => console.log('[hui-dropdown] hui-select', e.detail.key)}
        @open-change=${(e) => console.log('[hui-dropdown] open-change', e.detail)}>
        <hui-button variant="outline" icon="chevron-down" icon-position="end">Thao tác</hui-button>
      </hui-dropdown>
    </div>
  `,
  args: { trigger: 'hover', placement: 'bottom-start', arrow: false, disabled: false },
};

/** Nội dung qua slot menu: chọn item → popup đóng, hui-select nổi bọt, open-change phát 2 lần. */
export const SlotMenu = {
  render: () => html`
    <div style="padding: 20px 20px 200px;">
      <hui-dropdown id="dd-slot" trigger="click">
        <hui-button>Tài khoản</hui-button>
        <hui-menu slot="menu">
          <hui-menu-item key="profile" icon="user">Hồ sơ</hui-menu-item>
          <hui-menu-item key="settings" icon="settings">Cài đặt</hui-menu-item>
          <hui-menu-divider></hui-menu-divider>
          <hui-menu-item key="logout" danger>Đăng xuất</hui-menu-item>
        </hui-menu>
      </hui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dd = canvasElement.querySelector('#dd-slot');
    const popup = popupOf(dd);
    const trigger = dd.querySelector('hui-button');
    const opens = [];
    const selects = [];
    dd.addEventListener('open-change', (e) => opens.push(e.detail.open));
    dd.addEventListener('hui-select', (e) => selects.push(e.detail.key));

    await expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    trigger.click();
    await waitFor(() => expect(popup.hidden).toBe(false));
    await expect(dd.open).toBe(true);
    await expect(trigger.getAttribute('aria-expanded')).toBe('true');

    dd.querySelector('hui-menu-item[key="settings"]').click();
    await expect(selects).toEqual(['settings']);
    await waitFor(() => expect(popup.hidden).toBe(true), { timeout: 2000 });
    await expect(opens).toEqual([true, false]);
    await expect(dd.querySelector('hui-menu').selectedKeys).toEqual([]); // không selectable

    // Esc đóng
    trigger.click();
    await waitFor(() => expect(popup.hidden).toBe(false));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() => expect(popup.hidden).toBe(true), { timeout: 2000 });

    // Click ra ngoài đóng
    trigger.click();
    await waitFor(() => expect(popup.hidden).toBe(false));
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await waitFor(() => expect(popup.hidden).toBe(true), { timeout: 2000 });
  },
};

/** Property menu: mảng item (icon, sub-menu, disabled, divider, danger) → tự dựng hui-menu. ↓ trên trigger mở + focus item đầu. */
export const MenuProperty = {
  render: () => html`
    <div style="padding: 20px 20px 260px;">
      <hui-dropdown id="dd-prop" trigger="click" .menu=${MENU}>
        <hui-button variant="secondary">Menu từ property</hui-button>
      </hui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dd = canvasElement.querySelector('#dd-prop');
    const menu = dd.shadowRoot.querySelector('hui-menu');
    await waitFor(() => expect(menu.querySelectorAll('hui-menu-item').length).toBe(6));
    await expect(menu.querySelector('hui-sub-menu[key="share"]')).toBeTruthy();

    dd.querySelector('hui-button').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    await waitFor(() => expect(popupOf(dd).hidden).toBe(false));
    await expect(menu.querySelector('hui-menu-item[key="edit"]').shadowRoot.activeElement).toBeTruthy();

    const keys = [];
    dd.addEventListener('hui-select', (e) => keys.push(e.detail.key));
    menu.querySelector('hui-menu-item[key="delete"]').click();
    await expect(keys).toEqual(['delete']);
    await waitFor(() => expect(popupOf(dd).hidden).toBe(true), { timeout: 2000 });
  },
};

/** Các kiểu trigger — hover, click, chuột phải (menu mở tại vị trí con trỏ). */
export const Triggers = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: center; padding: 20px 20px 240px;">
      <hui-dropdown .menu=${MENU}><hui-button variant="outline">Hover</hui-button></hui-dropdown>
      <hui-dropdown trigger="click" .menu=${MENU}><hui-button variant="outline">Click</hui-button></hui-dropdown>
      <hui-dropdown id="dd-context" trigger="contextmenu" .menu=${MENU}>
        <div style="width: 260px; height: 120px; display: grid; place-items: center; border: 1px dashed var(--hui-border);
          border-radius: 8px; color: var(--hui-text-secondary); user-select: none;">Chuột phải vào vùng này</div>
      </hui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dd = canvasElement.querySelector('#dd-context');
    const area = dd.querySelector('div');
    const rect = area.getBoundingClientRect();
    const x = Math.round(rect.left + 40);
    const y = Math.round(rect.top + 30);
    area.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, composed: true, cancelable: true, clientX: x, clientY: y }));
    const popup = popupOf(dd);
    await waitFor(() => expect(popup.hidden).toBe(false));
    await waitFor(() => expect(Math.abs(parseFloat(popup.style.left) - x)).toBeLessThanOrEqual(2));
    dd.hide();
    await waitFor(() => expect(popup.hidden).toBe(true), { timeout: 2000 });
  },
};

/** 12 vị trí (+ mũi tên). */
export const Placements = {
  render: () => {
    const dd = (p) => html`
      <hui-dropdown placement=${p} arrow .menu=${MENU.slice(0, 3)}>
        <hui-button size="sm" variant="outline" style="width: 110px;">${p}</hui-button>
      </hui-dropdown>
    `;
    return html`
      <div style="padding: 160px 200px; display: grid; grid-template-columns: repeat(5, 120px); gap: 8px; justify-items: center;">
        <div></div>${dd('top-start')}${dd('top')}${dd('top-end')}<div></div>
        ${dd('left-start')}<div></div><div></div><div></div>${dd('right-start')}
        ${dd('left')}<div></div><div></div><div></div>${dd('right')}
        ${dd('left-end')}<div></div><div></div><div></div>${dd('right-end')}
        <div></div>${dd('bottom-start')}${dd('bottom')}${dd('bottom-end')}<div></div>
      </div>
    `;
  },
};

/** Disabled — không mở. */
export const Disabled = {
  render: () => html`
    <hui-dropdown id="dd-disabled" disabled trigger="click" .menu=${MENU}><hui-button disabled>Disabled</hui-button></hui-dropdown>
  `,
  play: async ({ canvasElement }) => {
    const dd = canvasElement.querySelector('#dd-disabled');
    dd.show();
    await expect(popupOf(dd).hidden).toBe(true);
  },
};

/** hui-dropdown-button: nút chính (hui-click) + nút mũi tên mở menu. */
export const DropdownButton = {
  render: () => html`
    <div style="display: flex; gap: 16px; align-items: center; padding: 20px 20px 220px;">
      <hui-dropdown-button id="ddb" .menu=${MENU} @hui-click=${() => console.log('[hui-dropdown-button] main click')}>Lưu</hui-dropdown-button>
      <hui-dropdown-button variant="primary" icon="download">
        Tải xuống
        <hui-menu slot="menu">
          <hui-menu-item key="pdf">PDF</hui-menu-item>
          <hui-menu-item key="xlsx">Excel</hui-menu-item>
        </hui-menu>
      </hui-dropdown-button>
      <hui-dropdown-button size="sm" disabled .menu=${MENU}>Disabled</hui-dropdown-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ddb = canvasElement.querySelector('#ddb');
    const clicks = [];
    ddb.addEventListener('hui-click', () => clicks.push('main'));
    const [main, arrow] = ddb.shadowRoot.querySelectorAll('hui-button');
    main.shadowRoot.querySelector('button').click();
    await expect(clicks).toEqual(['main']);

    arrow.shadowRoot.querySelector('button').click();
    await expect(clicks).toEqual(['main']); // nút mũi tên không phát hui-click ra ngoài
    const dd = ddb.shadowRoot.querySelector('hui-dropdown');
    await waitFor(() => expect(popupOf(dd).hidden).toBe(false));
    await expect(ddb.open).toBe(true);
    dd.shadowRoot.querySelector('hui-menu-item[key="copy"]').click();
    await waitFor(() => expect(popupOf(dd).hidden).toBe(true), { timeout: 2000 });
    await expect(ddb.open).toBe(false);
  },
};

/** Override từ bên ngoài — biến CSS + ::part(). */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .dd-brand {
        --hui-dropdown-radius: 4px;
        --hui-dropdown-padding: 6px;
        --hui-dropdown-min-width: 220px;
        --hui-menu-item-radius: 4px;
      }
      .dd-brand hui-dropdown::part(content) { border: 1px solid var(--hui-primary-3); }
      .dd-brand hui-dropdown:state(open)::part(trigger) { outline: 2px dashed var(--hui-primary); outline-offset: 4px; border-radius: 6px; }
    </style>
    <div class="dd-brand" style="padding: 20px 20px 240px;">
      <hui-dropdown id="dd-custom" trigger="click" open .menu=${MENU}><hui-button>Mở sẵn</hui-button></hui-dropdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const dd = canvasElement.querySelector('#dd-custom');
    const content = dd.shadowRoot.querySelector('[part="content"]');
    await waitFor(() => expect(popupOf(dd).hidden).toBe(false));
    await expect(getComputedStyle(content).minWidth).toBe('220px');
  },
};
