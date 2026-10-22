/**
 * Storybook Stories — HUI Toolbar (Molecule)
 * Hàng nút theo APG Toolbar: roving tabindex + mũi tên, dấu phân cách, mục thừa dồn vào menu "…".
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const tools = () => html`
  <hui-button variant="text" icon="edit" aria-label="Sửa">Sửa</hui-button>
  <hui-button variant="text" icon="copy">Sao chép</hui-button>
  <hui-button variant="text" icon="delete">Xóa</hui-button>
  <hr>
  <hui-button variant="text" icon="share">Chia sẻ</hui-button>
  <hui-button variant="text" icon="download">Tải xuống</hui-button>
  <hr>
  <hui-button variant="text" icon="star">Ghim</hui-button>
  <hui-button variant="text" icon="settings">Cài đặt</hui-button>
`;

/** Chỉ icon (gọn) — vừa cả màn hẹp */
const iconTools = () => html`
  <hui-button variant="text" icon="edit" aria-label="Sửa"></hui-button>
  <hui-button variant="text" icon="copy" aria-label="Sao chép"></hui-button>
  <hui-button variant="text" icon="delete" aria-label="Xóa"></hui-button>
  <hr>
  <hui-button variant="text" icon="share" aria-label="Chia sẻ"></hui-button>
  <hui-button variant="text" icon="download" aria-label="Tải xuống"></hui-button>
  <hr>
  <hui-button variant="text" icon="star" aria-label="Ghim" disabled></hui-button>
  <hui-button variant="text" icon="settings" aria-label="Cài đặt"></hui-button>
`;

/** Phần tử focus thật của control (hui-button → <button> bên trong) */
const inner = (el) => el.shadowRoot?.querySelector('button') || el;
const deepActive = () => {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
};

export default {
  title: 'Molecules/HuiToolbar',
  component: 'hui-toolbar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Toolbar** — hàng nút / control theo mẫu WAI-ARIA APG Toolbar.

\`\`\`html
<hui-toolbar label="Định dạng văn bản" variant="outlined">
  <hui-button variant="text" icon="edit">Sửa</hui-button>
  <button>B</button>
  <hr>
  <select aria-label="Cỡ chữ">…</select>
</hui-toolbar>
\`\`\`

- Chỉ **một** control nằm trong thứ tự Tab (roving tabindex) → Tab vào / ra toolbar chỉ một lần.
- Control là custom element (hui-button…) → tabindex đặt lên phần tử focus thật bên trong Shadow DOM.
- \`overflow="menu"\` (mặc định): control không đủ chỗ được dồn (giữ nguyên phần tử & listener) vào menu "…" — theo dõi bằng ResizeObserver.

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`label\` | string | — | \`aria-label\` của toolbar (nên đặt) |
| \`orientation\` | string | \`'horizontal'\` | \`horizontal\` / \`vertical\` |
| \`overflow\` | string | \`'menu'\` | \`menu\` (dồn vào "…") / \`wrap\` (xuống dòng) |
| \`variant\` | string | \`'plain'\` | \`plain\` / \`outlined\` / \`filled\` |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng menu |

### Properties
\`overflowItems\` — các control đang ở menu tràn.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-overflow-change\` | \`{ count, items }\` | Số control bị dồn vào menu đổi |

### Slots
_(default)_ control; \`<hr>\` / \`[role="separator"]\` / \`[data-separator]\` = dấu phân cách (tự gắn \`aria-orientation\`).

### Parts
\`base\` (role="toolbar"), \`row\`, \`more\`, \`popup\`

### CSS Variables
\`--hui-toolbar-gap\`, \`-padding\`, \`-bg\`, \`-border-color\`, \`-radius\`, \`-separator-color\`, \`-popup-bg\`, \`-popup-shadow\`

### Bàn phím (APG Toolbar)
| Phím | Hành động |
|------|-----------|
| \`Tab\` / \`Shift+Tab\` | Vào / ra toolbar (focus control lần trước) |
| \`→\` / \`←\` (dọc: \`↓\` / \`↑\`) | Control kế / trước (vòng lại) |
| \`Home\` / \`End\` | Control đầu / cuối |
| Trong ô nhập chữ | \`←\` \`→\` di chuyển con trỏ (không chuyển control) |
| Nút "…" + \`Enter\` | Mở menu tràn, focus mục đầu; \`↑\` \`↓\` di chuyển, \`Esc\` đóng và về nút "…" |
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['plain', 'outlined', 'filled'] },
  },
};

export const Default = {
  render: (args) => html`<hui-toolbar label="Thao tác tài liệu" variant=${args.variant}>${iconTools()}</hui-toolbar>`,
  args: { variant: 'outlined' },
  play: async ({ canvasElement }) => {
    const tb = canvasElement.querySelector('hui-toolbar');
    await tb.updateComplete;
    await expect(tb.shadowRoot.querySelector('[part="base"]').getAttribute('role')).toBe('toolbar');
    const buttons = [...tb.querySelectorAll('hui-button')];
    await waitFor(() => expect(inner(buttons[0]).tabIndex).toBe(0));
    await waitFor(() => expect(buttons.slice(1).every((b) => inner(b).tabIndex === -1)).toBe(true));
    await expect(buttons.every((b) => !b.hasAttribute('tabindex'))).toBe(true); // không gắn tabindex lên host
    await expect(tb.querySelector('hr').getAttribute('aria-orientation')).toBe('vertical');

    inner(buttons[0]).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(deepActive()).toBe(inner(buttons[1]));
    await expect(inner(buttons[1]).tabIndex).toBe(0);
    await expect(inner(buttons[0]).tabIndex).toBe(-1);
    await userEvent.keyboard('{End}');
    await expect(deepActive()).toBe(inner(buttons[buttons.length - 1]));
    await userEvent.keyboard('{ArrowLeft}'); // bỏ qua nút disabled (Ghim)
    await expect(deepActive()).toBe(inner(buttons[4]));
    await userEvent.keyboard('{End}{ArrowRight}'); // vòng về đầu
    await expect(deepActive()).toBe(inner(buttons[0]));
    await userEvent.keyboard('{ArrowLeft}');
    await expect(deepActive()).toBe(inner(buttons[buttons.length - 1]));
    await userEvent.keyboard('{Home}');
    await expect(deepActive()).toBe(inner(buttons[0]));
  },
};

export const Overflow = {
  name: 'Dồn mục thừa vào menu "…"',
  render: () => html`
    <div id="box" style="width: 300px; resize: horizontal; overflow: hidden; padding: 4px; border: 1px dashed var(--hui-border);">
      <hui-toolbar label="Thao tác" variant="filled" no-animation>${tools()}</hui-toolbar>
    </div>
    <p style="color: var(--hui-text-tertiary); font-size: 12px;">Kéo góc phải khung để đổi chiều rộng.</p>
  `,
  play: async ({ canvasElement }) => {
    const tb = canvasElement.querySelector('hui-toolbar');
    const box = canvasElement.querySelector('#box');
    await tb.updateComplete;
    const more = tb.shadowRoot.querySelector('[part="more"]');
    await waitFor(() => expect(more.hidden).toBe(false));
    const moved = tb.overflowItems;
    await expect(moved.length).toBeGreaterThan(0);
    await expect(moved.every((el) => el.slot === 'overflow')).toBe(true);
    // Hàng chính không bị tràn
    const row = tb.shadowRoot.querySelector('[part="row"]');
    await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);

    // Mở menu → focus mục đầu trong menu; ↓ di chuyển; Esc về nút "…"
    more.focus();
    more.click();
    await expect(more.getAttribute('aria-expanded')).toBe('true');
    await waitFor(() => expect(deepActive()).toBe(inner(moved[0])));
    if (moved.length > 1) {
      await userEvent.keyboard('{ArrowDown}');
      await expect(deepActive()).toBe(inner(moved[1]));
    }
    await userEvent.keyboard('{Escape}');
    await expect(more.getAttribute('aria-expanded')).toBe('false');
    await expect(deepActive()).toBe(more);

    // Nới rộng → mọi mục trở lại hàng chính
    let changed = null;
    tb.addEventListener('hui-overflow-change', (e) => { changed = e.detail; });
    box.style.width = '1200px';
    await waitFor(() => expect(more.hidden).toBe(true));
    await expect(tb.overflowItems.length).toBe(0);
    await expect(changed.count).toBe(0);
    await expect([...tb.querySelectorAll('hui-button')].every((b) => !b.slot)).toBe(true);
  },
};

export const MixedControls = {
  name: 'Control hỗn hợp (ô nhập, select)',
  render: () => html`
    <hui-toolbar label="Định dạng" variant="outlined" overflow="wrap">
      <button type="button" aria-pressed="false" style="font-weight: 700;">B</button>
      <button type="button" aria-pressed="false" style="font-style: italic;">I</button>
      <button type="button" aria-pressed="false" style="text-decoration: underline;">U</button>
      <hr>
      <select aria-label="Cỡ chữ"><option>12</option><option selected>14</option><option>16</option></select>
      <input aria-label="Tìm trong tài liệu" placeholder="Tìm…" style="width: 140px;">
      <hui-button variant="primary" size="sm">Lưu</hui-button>
    </hui-toolbar>
  `,
  play: async ({ canvasElement }) => {
    const tb = canvasElement.querySelector('hui-toolbar');
    await tb.updateComplete;
    const input = tb.querySelector('input');
    const save = tb.querySelector('hui-button');
    input.focus();
    input.value = 'abc';
    input.setSelectionRange(1, 1);
    // ← → trong ô nhập: di chuyển con trỏ, không chuyển control
    await userEvent.keyboard('{ArrowRight}');
    await expect(document.activeElement).toBe(input);
    await expect(input.tabIndex).toBe(0);
    await expect(inner(save).tabIndex).toBe(-1);
  },
};

export const Vertical = {
  render: () => html`
    <hui-toolbar label="Công cụ vẽ" orientation="vertical" variant="outlined">
      <hui-button variant="text" icon="edit" aria-label="Bút"></hui-button>
      <hui-button variant="text" icon="image" aria-label="Ảnh"></hui-button>
      <hr>
      <hui-button variant="text" icon="zoom-in" aria-label="Phóng to"></hui-button>
      <hui-button variant="text" icon="zoom-out" aria-label="Thu nhỏ"></hui-button>
    </hui-toolbar>
  `,
  play: async ({ canvasElement }) => {
    const tb = canvasElement.querySelector('hui-toolbar');
    await tb.updateComplete;
    const buttons = [...tb.querySelectorAll('hui-button')];
    await expect(tb.querySelector('hr').getAttribute('aria-orientation')).toBe('horizontal');
    await waitFor(() => expect(inner(buttons[0]).tabIndex).toBe(0));
    inner(buttons[0]).focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(deepActive()).toBe(inner(buttons[1]));
    await userEvent.keyboard('{ArrowRight}'); // không tác dụng ở hướng dọc
    await expect(deepActive()).toBe(inner(buttons[1]));
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-tb {
        --hui-toolbar-bg: var(--hui-primary-9);
        --hui-toolbar-radius: 999px;
        --hui-toolbar-padding: 6px 10px;
        --hui-toolbar-gap: 2px;
        --hui-toolbar-separator-color: rgb(255 255 255 / 0.25);
      }
      .brand-tb hui-button { --hui-button-color: var(--hui-text-light-solid); }
      .brand-tb::part(more) { color: var(--hui-text-light-solid); border-radius: 999px; }
    </style>
    <div style="max-width: 420px;">
      <hui-toolbar class="brand-tb" label="Thao tác" variant="filled">${tools()}</hui-toolbar>
    </div>
  `,
};
