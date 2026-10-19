/**
 * Storybook Stories — HUI Text
 * Chữ inline: type màu, kiểu chữ, cắt chữ (ellipsis/rows), sao chép (copyable).
 */

import { html, nothing } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { t } from '../../core/locale.js';
import './index.js';

const LONG = 'Ant Design + MUI: thư viện Web Components không phụ thuộc framework, hỗ trợ dark mode, đa ngôn ngữ và override bằng biến CSS.';

/** Thay navigator.clipboard bằng bản giả để test không phụ thuộc quyền clipboard của trình duyệt */
function mockClipboard() {
  const store = { text: null };
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    get: () => ({ writeText: async (s) => { store.text = s; } }),
  });
  return { store, restore: () => delete navigator.clipboard };
}

export default {
  title: 'Components/Typography/HuiText',
  component: 'hui-text',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Text** — Đoạn chữ inline (Ant Typography.Text + MUI Typography). Mặc định kế thừa màu/cỡ chữ từ thẻ cha.

\`\`\`html
<hui-text type="danger" strong>Lỗi</hui-text>
<hui-text code>npm i @itmrhoang/h-ui</hui-text>
<hui-text ellipsis style="width: 200px">Chữ rất dài sẽ bị cắt…</hui-text>
<hui-text copyable copy-text="ABC-123">Mã đơn: ABC-123</hui-text>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`type\` | string | — | secondary, success, warning, danger |
| \`disabled\` | boolean | \`false\` | Chữ mờ, nút sao chép bị khóa |
| \`strong\` / \`italic\` / \`underline\` / \`delete\` | boolean | \`false\` | Đậm / nghiêng / gạch chân / gạch ngang (thẻ ngữ nghĩa \`<strong> <em> <u> <del>\`) |
| \`code\` / \`mark\` / \`keyboard\` | boolean | \`false\` | Dạng mã / tô sáng / phím (\`<code> <mark> <kbd>\`) |
| \`ellipsis\` | boolean | \`false\` | Cắt 1 dòng bằng "…"; khi bị cắt tự gắn \`title\` = toàn văn |
| \`rows\` | number | — | Cắt nhiều dòng (≥ 2). Đặt rows cũng tự bật ellipsis |
| \`copyable\` | boolean | \`false\` | Hiện nút sao chép (icon copy → check 3 giây) |
| \`copy-text\` | string | nội dung chữ | Chuỗi được sao chép |

### Properties & methods
| Tên | Mô tả |
|-----|-------|
| \`truncated\` (chỉ đọc) | Chữ đang bị cắt hay không (cũng có \`:state(truncated)\`) |
| \`copy()\` | Sao chép bằng code, trả về \`Promise<boolean>\` |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-copy\` | \`{ text }\` | Sao chép thành công |
| \`hui-ellipsis\` | \`{ ellipsis }\` | Trạng thái bị cắt chữ thay đổi |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Nội dung chữ |

### Bàn phím
- \`Tab\` tới nút sao chép, \`Enter\` / \`Space\` để sao chép (nút \`<button>\` có \`aria-label\` theo locale).

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-text-color\` | Màu khi không có \`type\` (mặc định kế thừa) |
| \`--hui-text-font-size\` | Cỡ chữ (mặc định kế thừa) |
| \`--hui-typography-code-bg\` / \`--hui-typography-code-border-color\` | Chữ dạng code |
| \`--hui-typography-kbd-bg\` | Nền phím |
| \`--hui-typography-mark-bg\` / \`--hui-typography-mark-color\` | Chữ tô sáng |
| \`--hui-typography-action-color\` / \`--hui-typography-action-hover-color\` | Nút sao chép |
| \`--hui-typography-copied-color\` | Nút sau khi sao chép |

**Parts:** \`base\`, \`content\`, \`actions\`, \`copy\` và thẻ kiểu chữ \`code\`, \`keyboard\`, \`mark\`, \`delete\`, \`underline\`, \`strong\`, \`italic\`.
        `,
      },
    },
  },
  argTypes: {
    type: { control: 'select', options: ['', 'secondary', 'success', 'warning', 'danger'] },
    strong: { control: 'boolean' },
    italic: { control: 'boolean' },
    underline: { control: 'boolean' },
    delete: { control: 'boolean' },
    code: { control: 'boolean' },
    mark: { control: 'boolean' },
    keyboard: { control: 'boolean' },
    disabled: { control: 'boolean' },
    ellipsis: { control: 'boolean' },
    copyable: { control: 'boolean' },
    label: { control: 'text', description: 'Nội dung (slot mặc định)' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-text
      type=${args.type || nothing}
      ?strong=${args.strong}
      ?italic=${args.italic}
      ?underline=${args.underline}
      ?delete=${args.delete}
      ?code=${args.code}
      ?mark=${args.mark}
      ?keyboard=${args.keyboard}
      ?disabled=${args.disabled}
      ?ellipsis=${args.ellipsis}
      ?copyable=${args.copyable}
    >${args.label}</hui-text>
  `,
  args: {
    type: '', strong: false, italic: false, underline: false, delete: false, code: false,
    mark: false, keyboard: false, disabled: false, ellipsis: false, copyable: false, label: 'HUI Text',
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-text');
    el.strong = true;
    await el.updateComplete;
    await expect(el.hasAttribute('strong')).toBe(true);
    await expect(el.shadowRoot.querySelector('strong[part="strong"]')).not.toBeNull();
    el.strong = false;
  },
};

/** Màu ngữ nghĩa theo type + disabled */
export const Types = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px; font: 14px var(--hui-font-family);">
      <hui-text>Mặc định (kế thừa màu cha)</hui-text>
      <hui-text type="secondary">Secondary</hui-text>
      <hui-text type="success">Success</hui-text>
      <hui-text type="warning">Warning</hui-text>
      <hui-text type="danger">Danger</hui-text>
      <hui-text disabled>Disabled</hui-text>
    </div>
  `,
};

/** Kiểu chữ — mỗi attribute là một thẻ ngữ nghĩa, kết hợp được với nhau */
export const Decorations = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px; font: 14px var(--hui-font-family);">
      <hui-text strong>strong</hui-text>
      <hui-text italic>italic</hui-text>
      <hui-text underline>underline</hui-text>
      <hui-text delete>delete</hui-text>
      <hui-text code>code</hui-text>
      <hui-text mark>mark</hui-text>
      <span>Nhấn <hui-text keyboard>Ctrl</hui-text> + <hui-text keyboard>K</hui-text> để tìm kiếm</span>
      <hui-text strong italic underline type="danger">strong + italic + underline + danger</hui-text>
    </div>
  `,
};

/** Cắt chữ — 1 dòng (ellipsis) và nhiều dòng (rows). Rê chuột để xem title toàn văn */
export const Ellipsis = {
  render: () => html`
    <div style="width: 280px; display: flex; flex-direction: column; gap: 12px; font: 14px var(--hui-font-family);">
      <hui-text id="one" ellipsis>${LONG}</hui-text>
      <hui-text id="two" rows="2">${LONG}</hui-text>
      <hui-text id="short" ellipsis>Chữ ngắn không bị cắt</hui-text>
      <hui-text ellipsis copyable>${LONG}</hui-text>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const one = canvasElement.querySelector('#one');
    const two = canvasElement.querySelector('#two');
    const short = canvasElement.querySelector('#short');
    await waitFor(() => expect(one.truncated).toBe(true));
    await expect(one.shadowRoot.querySelector('[part="content"]').getAttribute('title')).toBe(LONG);
    await waitFor(() => expect(two.truncated).toBe(true));
    await expect(short.truncated).toBe(false);
    await expect(short.shadowRoot.querySelector('[part="content"]').hasAttribute('title')).toBe(false);
  },
};

/** Sao chép — copy-text tùy chỉnh; icon đổi thành check, phát hui-copy */
export const Copyable = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px; font: 14px var(--hui-font-family);">
      <hui-text copyable>Sao chép chính nội dung này</hui-text>
      <hui-text copyable copy-text="ABC-123">Mã đơn hàng: <hui-text code>ABC-123</hui-text></hui-text>
      <hui-text copyable disabled>Disabled — không sao chép được</hui-text>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const { store, restore } = mockClipboard();
    try {
      const el = canvasElement.querySelectorAll('hui-text[copyable]')[1];
      const btn = el.shadowRoot.querySelector('[part="copy"]');
      await expect(btn.getAttribute('aria-label')).toBe(t('common.copy'));

      const events = [];
      el.addEventListener('hui-copy', (e) => events.push(e.detail.text));
      btn.click();
      await waitFor(() => expect(events).toEqual(['ABC-123']));
      await expect(store.text).toBe('ABC-123');
      await expect(btn.getAttribute('aria-label')).toBe(t('common.copied'));
      await expect(btn.querySelector('hui-icon').getAttribute('name')).toBe('check');

      // Disabled → nút bị khóa
      const disabled = canvasElement.querySelectorAll('hui-text[copyable]')[2];
      await expect(disabled.shadowRoot.querySelector('[part="copy"]').disabled).toBe(true);
    } finally {
      restore();
    }
  },
};

/** Override từ bên ngoài — biến CSS trên thẻ cha / class và ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .text-brand {
        --hui-text-color: var(--hui-primary);
        --hui-typography-code-bg: var(--hui-primary-1);
        --hui-typography-code-border-color: var(--hui-primary-3);
        --hui-typography-mark-bg: var(--hui-success-3);
        --hui-typography-action-color: var(--hui-warning);
      }
      hui-text.caps::part(content) { text-transform: uppercase; letter-spacing: 0.08em; }
      hui-text.pill::part(code) { border-radius: 999px; padding-inline: 0.8em; }
    </style>
    <div class="text-brand" style="display: flex; flex-direction: column; gap: 8px; font: 14px var(--hui-font-family);">
      <hui-text>Màu chữ từ --hui-text-color của thẻ cha</hui-text>
      <hui-text code class="pill">::part(code) bo tròn</hui-text>
      <hui-text mark>Nền mark màu success</hui-text>
      <hui-text class="caps" copyable>::part(content) chữ hoa + nút copy màu warning</hui-text>
    </div>
  `,
};
