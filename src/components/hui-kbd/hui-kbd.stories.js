/**
 * Storybook Stories — HUI Kbd
 */

import { html, nothing } from 'lit';
import { expect } from 'storybook/test';
import { parseKeys } from './hui-kbd.js';
import './index.js';

const keysOf = (el) => [...el.shadowRoot.querySelectorAll('[part="key"]')];

export default {
  title: 'Atoms/HuiKbd',
  component: 'hui-kbd',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Kbd** — Hiển thị phím bàn phím. Dùng nội dung slot cho một phím, hoặc \`keys\` để dựng **tổ hợp** có dấu nối.
Tự đổi theo hệ điều hành khi \`platform="auto"\`: trên Mac \`ctrl\` → ⌘, \`alt\` → ⌥, \`shift\` → ⇧, \`enter\` → ↩.

\`\`\`html
<hui-kbd>Esc</hui-kbd>
<hui-kbd keys="ctrl+k"></hui-kbd>          <!-- Ctrl + K  |  ⌘ + K trên Mac -->
<hui-kbd keys="ctrl+shift+p"></hui-kbd>
<hui-kbd keys="g g"></hui-kbd>             <!-- bấm G rồi G -->
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`keys\` | string | — | Tổ hợp: \`ctrl+k\`; dấu cách / dấu phẩy = bấm lần lượt (\`g g\`) |
| \`platform\` | string | \`auto\` | \`auto\` \\| \`mac\` \\| \`windows\` |
| \`separator\` | string | \`+\` | Dấu nối trong tổ hợp; \`""\` = không có |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`variant\` | string | \`raised\` | \`raised\` (nổi 3D) \\| \`outline\` \\| \`filled\` |

Tên phím hỗ trợ: \`ctrl/mod/cmd\` (⌘ trên Mac), \`control\` (⌃), \`meta/win\`, \`alt/option\`, \`shift\`, \`enter\`, \`esc\`, \`tab\`,
\`space\`, \`backspace\`, \`delete\`, \`up/down/left/right\`, \`pageup/pagedown\`, \`home/end\`, \`plus\`; còn lại viết hoa chữ đầu.

### Properties
| Tên | Mô tả |
|-----|-------|
| \`isMac\` | (chỉ đọc) đang hiển thị kiểu Mac |
| \`parseKeys(keys, mac)\` | Hàm export: chuỗi → mảng tổ hợp \`{ text, name }\` |

### Events
Không có.

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Chữ của phím khi không dùng \`keys\` |

### Parts
\`base\`, \`key\` (mỗi \`<kbd>\`), \`separator\`, \`then\`.

### CSS Variables
\`--hui-kbd-bg\`, \`--hui-kbd-color\`, \`--hui-kbd-border-color\`, \`--hui-kbd-shadow\`, \`--hui-kbd-radius\`, \`--hui-kbd-font-size\`,
\`--hui-kbd-font-family\`, \`--hui-kbd-min-width\`, \`--hui-kbd-separator-color\`.

### Accessibility
Dùng thẻ \`<kbd>\` chuẩn. Ký hiệu (⌘ ⇧ ↑…) có tên đầy đủ ẩn cho trình đọc màn hình ("Command") + \`title\`. Dấu "+" \`aria-hidden\`.
Không nhận focus.
        `,
      },
    },
  },
  argTypes: {
    keys: { control: 'text' },
    platform: { control: 'inline-radio', options: ['auto', 'mac', 'windows'] },
    separator: { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'inline-radio', options: ['raised', 'outline', 'filled'] },
  },
};

export const Default = {
  render: (args) => html`
    <p>Mở bảng lệnh: <hui-kbd keys=${args.keys || nothing} platform=${args.platform} separator=${args.separator ?? nothing} size=${args.size} variant=${args.variant}></hui-kbd></p>
  `,
  args: { keys: 'ctrl+k', platform: 'windows', separator: '+', size: 'md', variant: 'raised' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-kbd');
    const keys = keysOf(el);
    await expect(keys.map((k) => k.textContent)).toEqual(['Ctrl', 'K']);
    await expect(keys[0].tagName).toBe('KBD');
    await expect(el.shadowRoot.querySelector('[part="separator"]').textContent).toBe('+');
  },
};

/** Một phím bằng slot */
export const SingleKey = {
  render: () => html`
    <p>Nhấn <hui-kbd>Esc</hui-kbd> để đóng, <hui-kbd>Enter</hui-kbd> để xác nhận, <hui-kbd>/</hui-kbd> để tìm kiếm.</p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-kbd');
    const key = keysOf(el)[0];
    await expect(key.querySelector('slot').assignedNodes()[0].textContent).toBe('Esc');
  },
};

/** Theo hệ điều hành: cùng keys, khác hiển thị */
export const PlatformAware = {
  render: () => html`
    <div style="display: grid; grid-template-columns: max-content max-content max-content; gap: 8px 24px; align-items: center;">
      <strong>keys</strong><strong>windows</strong><strong>mac</strong>
      ${['ctrl+k', 'ctrl+shift+p', 'alt+enter', 'shift+up', 'ctrl+backspace'].map((k) => html`
        <code>${k}</code>
        <hui-kbd keys=${k} platform="windows"></hui-kbd>
        <hui-kbd keys=${k} platform="mac" class=${k === 'ctrl+k' ? 'mac-k' : ''}></hui-kbd>
      `)}
      <code>auto</code><hui-kbd keys="mod+s"></hui-kbd><span></span>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const mac = canvasElement.querySelector('.mac-k');
    const [cmd, k] = keysOf(mac);
    await expect(cmd.querySelector('.kbd__glyph').textContent).toBe('⌘');
    await expect(cmd.querySelector('.kbd__sr').textContent).toBe('Command');
    await expect(cmd.title).toBe('Command');
    await expect(k.textContent).toBe('K');
    await expect(mac.isMac).toBe(true);
    await expect(parseKeys('alt+enter', true).flat().map((x) => x.text)).toEqual(['⌥', '↩']);
    await expect(parseKeys('alt+enter', false).flat().map((x) => x.text)).toEqual(['Alt', 'Enter']);
  },
};

/** Bấm lần lượt (dấu cách / dấu phẩy) */
export const Sequence = {
  render: () => html`<p>Về trang chủ: <hui-kbd keys="g h"></hui-kbd> · Hộp thư: <hui-kbd keys="g, i"></hui-kbd></p>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-kbd');
    await expect(keysOf(el).map((k) => k.textContent)).toEqual(['G', 'H']);
    await expect(el.shadowRoot.querySelectorAll('[part="then"]').length).toBe(1);
    await expect(el.shadowRoot.querySelectorAll('[part="separator"]').length).toBe(0);
  },
};

export const SizesAndVariants = {
  render: () => html`
    <div style="display: grid; gap: 12px;">
      ${['raised', 'outline', 'filled'].map((v) => html`
        <div style="display: flex; gap: 16px; align-items: center;">
          ${['sm', 'md', 'lg'].map((s) => html`<hui-kbd keys="ctrl+shift+z" size=${s} variant=${v} platform="windows"></hui-kbd>`)}
        </div>
      `)}
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .kbd-dark {
        --hui-kbd-bg: var(--hui-bg-spotlight);
        --hui-kbd-color: var(--hui-text-light-solid);
        --hui-kbd-border-color: transparent;
        --hui-kbd-shadow: none;
        --hui-kbd-radius: 6px;
        --hui-kbd-separator-color: var(--hui-primary);
      }
      hui-kbd.kbd-round::part(key) { border-radius: 999px; min-width: 2.2em; }
      hui-kbd.kbd-round::part(separator) { font-weight: 700; }
    </style>
    <p class="kbd-dark">Lưu: <hui-kbd keys="ctrl+s" platform="windows"></hui-kbd></p>
    <p>Hoàn tác: <hui-kbd class="kbd-round" keys="ctrl+z" platform="mac" separator=""></hui-kbd></p>
  `,
};
