/**
 * Storybook Stories — HUI Space
 * Khoảng cách đều giữa các phần tử, phân cách (split), gộp viền (compact).
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';
import '../hui-input/index.js';
import '../hui-divider/index.js';

export default {
  title: 'Components/Layout/HuiSpace',
  component: 'hui-space',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Space** — Khoảng cách đều giữa các phần tử inline (Ant Space + Space.Compact).
Mỗi con được bọc trong một ô \`part="item"\` (gán slot thủ công) → chèn được phân cách mà không sửa DOM của bạn.

\`\`\`html
<hui-space><hui-button>A</hui-button><hui-button>B</hui-button></hui-space>
<hui-space split="|"><a>Sửa</a><a>Xóa</a></hui-space>
<hui-space compact><hui-input></hui-input><hui-button>Tìm</hui-button></hui-space>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`size\` | string | \`sm\` (8px) | none, xs, sm, md (16), lg (24), xl (32) · số (px) · \`"h,v"\` = ngang, dọc |
| \`direction\` | string | \`horizontal\` | horizontal, vertical |
| \`align\` | string | \`center\` | start, center, end, baseline, stretch |
| \`wrap\` | boolean | \`false\` | Tự xuống dòng |
| \`split\` | string | — | Chuỗi phân cách đơn giản (vd: \`"|"\`). \`slot="split"\` được ưu tiên |
| \`compact\` | boolean | \`false\` | Gộp viền nút / ô nhập liền nhau: bo góc chỉ ở 2 đầu, chồng viền 1px |
| \`block\` | boolean | \`false\` | Chiếm toàn bộ chiều ngang (compact: phần tử giãn đều) |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Các phần tử (mỗi con một ô) |
| \`split\` | Phần tử phân cách, nhân bản chèn giữa các ô (vd: \`<hui-divider slot="split" orientation="vertical">\`) |

### Compact hoạt động thế nào?
Mỗi ô đặt biến \`--hui-button-radius\`, \`--hui-input-radius\`, \`--hui-select-radius\` (giá trị 4 góc) và \`border-radius\` cho con trực tiếp
→ dùng được với hui-button, hui-input, hui-select và \`<button>\` / \`<input>\` native.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-space-gap\` | Khoảng cách mặc định khi không có attribute \`size\` (8px) |
| \`--hui-space-split-color\` | Màu phân cách dạng chữ |
| \`--hui-space-compact-radius\` | Bo góc ngoài cùng khi compact (\`--hui-radius\`) |

**Parts:** \`base\`, \`item\`, \`split\`.
        `,
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '20', '8,24'] },
    direction: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    align: { control: 'select', options: ['', 'start', 'center', 'end', 'baseline'] },
    wrap: { control: 'boolean' },
    split: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-space size=${args.size} direction=${args.direction} align=${args.align || ''} ?wrap=${args.wrap} split=${args.split || ''}>
      <hui-button>Primary</hui-button>
      <hui-button variant="outline">Outline</hui-button>
      <hui-button variant="dashed">Dashed</hui-button>
      Chữ trơn
    </hui-space>
  `,
  args: { size: 'sm', direction: 'horizontal', align: '', wrap: false, split: '' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-space');
    // 3 nút + 1 text node → 4 ô
    const items = el.shadowRoot.querySelectorAll('[part="item"]');
    await expect(items.length).toBe(4);
    const a = items[0].getBoundingClientRect();
    const b = items[1].getBoundingClientRect();
    await expect(Math.round(b.left - a.right)).toBe(8);

    // Thêm con mới → tự dựng lại ô
    const extra = document.createElement('hui-button');
    extra.textContent = 'Mới';
    el.append(extra);
    await waitFor(() => expect(el.shadowRoot.querySelectorAll('[part="item"]').length).toBe(5));
    extra.remove();
    await waitFor(() => expect(el.shadowRoot.querySelectorAll('[part="item"]').length).toBe(4));
  },
};

/** Kích thước khoảng cách */
export const Sizes = {
  render: () => html`
    <hui-space direction="vertical" size="md">
      ${['xs', 'sm', 'md', 'lg', '40'].map((size) => html`
        <hui-space size=${size}>
          <code style="width: 40px; display: inline-block;">${size}</code>
          <hui-button size="sm">A</hui-button><hui-button size="sm">B</hui-button><hui-button size="sm">C</hui-button>
        </hui-space>
      `)}
    </hui-space>
  `,
};

/** Xếp dọc */
export const Vertical = {
  render: () => html`
    <hui-space direction="vertical" size="md" style="width: 280px;">
      <hui-input placeholder="Họ tên"></hui-input>
      <hui-input placeholder="Email"></hui-input>
      <hui-button block>Gửi</hui-button>
    </hui-space>
  `,
};

/** Phân cách: chuỗi (split="|") hoặc phần tử qua slot="split" */
export const Split = {
  render: () => html`
    <hui-space direction="vertical" size="lg">
      <hui-space split="|">
        <a href="#">Sửa</a><a href="#">Sao chép</a><a href="#">Xóa</a>
      </hui-space>
      <hui-space id="slot-split">
        <hui-divider slot="split" orientation="vertical"></hui-divider>
        <a href="#">Trang chủ</a><a href="#">Sản phẩm</a><a href="#">Liên hệ</a>
      </hui-space>
    </hui-space>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#slot-split');
    const splits = el.shadowRoot.querySelectorAll('[part="split"]');
    // 3 mục → 2 phân cách
    await expect(splits.length).toBe(2);
    await expect(splits[1].querySelector('hui-divider')).not.toBeNull();
  },
};

/** Compact — gộp viền nút / ô nhập */
export const Compact = {
  render: () => html`
    <hui-space direction="vertical" size="lg">
      <hui-space compact id="compact">
        <hui-button variant="outline">Trái</hui-button>
        <hui-button variant="outline">Giữa</hui-button>
        <hui-button variant="outline">Phải</hui-button>
      </hui-space>
      <hui-space compact style="width: 360px;">
        <hui-input placeholder="Tìm kiếm..."></hui-input>
        <hui-button icon="search">Tìm</hui-button>
      </hui-space>
      <hui-space compact direction="vertical">
        <hui-button variant="outline">Trên</hui-button>
        <hui-button variant="outline">Dưới</hui-button>
      </hui-space>
      <hui-space compact block style="width: 360px;">
        <hui-button variant="outline" block>Ngày</hui-button>
        <hui-button variant="outline" block>Tuần</hui-button>
        <hui-button variant="outline" block>Tháng</hui-button>
      </hui-space>
    </hui-space>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#compact');
    const [first, middle, last] = el.querySelectorAll('hui-button');
    const radius = (btn) => getComputedStyle(btn.shadowRoot.querySelector('[part="base"]'));
    await waitFor(() => expect(radius(middle).borderTopLeftRadius).toBe('0px'));
    await expect(radius(first).borderTopRightRadius).toBe('0px');
    await expect(radius(first).borderTopLeftRadius).not.toBe('0px');
    await expect(radius(last).borderTopLeftRadius).toBe('0px');
    await expect(radius(last).borderBottomRightRadius).not.toBe('0px');
    // Chồng viền 1px
    const items = el.shadowRoot.querySelectorAll('[part="item"]');
    await expect(Math.round(items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().right)).toBe(-1);
  },
};

/** Override từ bên ngoài */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .space-brand { --hui-space-gap: 20px; --hui-space-split-color: var(--hui-primary); --hui-space-compact-radius: 999px; }
      hui-space.chips::part(item) { padding: 4px 10px; border-radius: 999px; background: var(--hui-fill-secondary); }
    </style>
    <div class="space-brand" style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
      <hui-space split="•"><span>--hui-space-gap</span><span>= 20px</span><span>split màu primary</span></hui-space>
      <hui-space class="chips" size="xs"><span>::part(item)</span><span>dạng chip</span><span>HUI</span></hui-space>
      <hui-space compact><hui-button>Bo</hui-button><hui-button>tròn</hui-button><hui-button>2 đầu</hui-button></hui-space>
    </div>
  `,
};
