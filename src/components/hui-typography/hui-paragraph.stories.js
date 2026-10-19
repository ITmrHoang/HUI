/**
 * Storybook Stories — HUI Paragraph
 * Đoạn văn: cắt nhiều dòng + "Xem thêm" / "Thu gọn", sao chép, kiểu chữ.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { t } from '../../core/locale.js';
import './index.js';

const LOREM = 'HUI là thư viện Web Components zero-dependency lấy cảm hứng từ Ant Design và MUI. Mọi component đều kế thừa HuiElement, '
  + 'dùng design token để tự chuyển dark mode, override được bằng biến CSS, ::part() và slot. Thư viện chạy được với HTML thuần, '
  + 'React, Vue, Angular hay Svelte mà không cần cấu hình thêm. Đoạn văn này đủ dài để minh họa tính năng cắt chữ nhiều dòng.';

export default {
  title: 'Components/Typography/HuiParagraph',
  component: 'hui-paragraph',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Paragraph** — Đoạn văn (Ant Typography.Paragraph). Kế thừa mọi tính năng của \`hui-text\` + nút "Xem thêm" / "Thu gọn".

\`\`\`html
<hui-paragraph rows="3" expandable>Đoạn văn dài…</hui-paragraph>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`rows\` | number | — | Số dòng tối đa (≥ 2 = cắt nhiều dòng) |
| \`ellipsis\` | boolean | \`false\` | Cắt 1 dòng (khi không có rows) |
| \`expandable\` | boolean | \`false\` | Hiện nút "Xem thêm" khi bị cắt, "Thu gọn" khi đang mở |
| \`expanded\` | boolean | \`false\` | Đang mở rộng toàn văn (phản chiếu khi bấm nút) |
| \`type\`, \`strong\`, \`italic\`, \`underline\`, \`delete\`, \`code\`, \`mark\`, \`keyboard\`, \`disabled\` | — | — | Như \`hui-text\` |
| \`copyable\` / \`copy-text\` | boolean / string | — | Nút sao chép |

### Properties & methods
| Tên | Mô tả |
|-----|-------|
| \`toggle()\` | Mở rộng / thu gọn (phát \`hui-expand\`) |
| \`truncated\` | Chữ đang bị cắt hay không |
| \`copy()\` | Sao chép bằng code |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-expand\` | \`{ expanded }\` | Bấm "Xem thêm" / "Thu gọn" |
| \`hui-copy\` | \`{ text }\` | Sao chép thành công |
| \`hui-ellipsis\` | \`{ ellipsis }\` | Trạng thái bị cắt chữ thay đổi |

### Locale
"Xem thêm" / "Thu gọn" lấy từ \`t('common.more')\` / \`t('common.collapse')\` → \`setLocale('en')\` tự đổi thành "More" / "Collapse".

### Bàn phím
- \`Tab\` tới nút "Xem thêm", \`Enter\` / \`Space\` để mở/thu (có \`aria-expanded\`).

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-paragraph-color\` | Màu khi không có \`type\` |
| \`--hui-paragraph-font-size\` | Cỡ chữ (\`--hui-font-sm\`) |
| \`--hui-paragraph-line-height\` | Chiều cao dòng |
| \`--hui-paragraph-margin\` | Lề ngoài (\`0 0 1em\`) |
| \`--hui-typography-action-color\` | Màu nút "Xem thêm" / sao chép |

**Parts:** \`base\`, \`content\`, \`actions\`, \`expand\`, \`copy\` (+ thẻ kiểu chữ như hui-text).
        `,
      },
    },
  },
  argTypes: {
    rows: { control: { type: 'number', min: 0, max: 10 } },
    expandable: { control: 'boolean' },
    copyable: { control: 'boolean' },
    type: { control: 'select', options: ['', 'secondary', 'success', 'warning', 'danger'] },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 480px;">
      <hui-paragraph rows=${args.rows || 0} ?expandable=${args.expandable} ?copyable=${args.copyable} type=${args.type || ''}>${LOREM}</hui-paragraph>
    </div>
  `,
  args: { rows: 2, expandable: true, copyable: false, type: '' },
};

/** Xem thêm / Thu gọn — kiểm thử nút và sự kiện hui-expand */
export const Expandable = {
  render: () => html`
    <div style="width: 360px;">
      <hui-paragraph rows="2" expandable>${LOREM}</hui-paragraph>
      <hui-paragraph id="short" rows="2" expandable>Đoạn ngắn → không có nút "Xem thêm".</hui-paragraph>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-paragraph');
    const btn = el.shadowRoot.querySelector('[part="expand"]');
    await waitFor(() => expect(btn.hidden).toBe(false));
    await expect(btn.textContent).toBe(t('common.more'));
    await expect(btn.getAttribute('aria-expanded')).toBe('false');

    const events = [];
    el.addEventListener('hui-expand', (e) => events.push(e.detail.expanded));
    btn.click();
    await el.updateComplete;
    await expect(el.hasAttribute('expanded')).toBe(true);
    await expect(btn.textContent).toBe(t('common.collapse'));
    await expect(btn.hidden).toBe(false);

    btn.click();
    await el.updateComplete;
    await expect(el.expanded).toBe(false);
    await expect(events).toEqual([true, false]);

    const short = canvasElement.querySelector('#short');
    await expect(short.shadowRoot.querySelector('[part="expand"]').hidden).toBe(true);
  },
};

/** Kiểu chữ & type trong đoạn văn, kết hợp hui-text bên trong */
export const RichContent = {
  render: () => html`
    <div style="max-width: 560px;">
      <hui-paragraph>
        Cài đặt bằng <hui-text code>npm i @itmrhoang/h-ui</hui-text>, sau đó nhấn <hui-text keyboard>Ctrl</hui-text> +
        <hui-text keyboard>S</hui-text>. Phần <hui-text mark>tô sáng</hui-text> và
        <hui-text strong>in đậm</hui-text> dùng thẻ ngữ nghĩa.
      </hui-paragraph>
      <hui-paragraph type="secondary">Đoạn văn màu secondary.</hui-paragraph>
      <hui-paragraph type="danger" copyable>Đoạn văn danger có nút sao chép.</hui-paragraph>
    </div>
  `,
};

/** Override từ bên ngoài */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .para-brand {
        --hui-paragraph-color: var(--hui-text-secondary);
        --hui-paragraph-line-height: 1.8;
        --hui-paragraph-font-size: var(--hui-font-base);
        --hui-typography-action-color: var(--hui-success);
      }
      hui-paragraph.pill::part(expand) {
        padding: 0 8px;
        border-radius: 999px;
        background: var(--hui-success-1);
      }
    </style>
    <div class="para-brand" style="max-width: 420px;">
      <hui-paragraph class="pill" rows="3" expandable>${LOREM}</hui-paragraph>
    </div>
  `,
};
