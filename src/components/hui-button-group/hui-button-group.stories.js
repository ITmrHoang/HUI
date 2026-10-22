/**
 * Storybook Stories — HUI Button Group (gộp viền các nút liền nhau)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Molecules/HuiButtonGroup',
  component: 'hui-button-group',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Button Group** — gộp các \`<hui-button>\` liền nhau thành một khối: viền giữa gộp làm một, chỉ bo góc 2 đầu
(Ant Button.Group / MUI ButtonGroup). Nhóm nút bật/tắt có giá trị: xem **HuiToggleButtonGroup**.

\`\`\`html
<hui-button-group variant="outline">
  <hui-button>Trước</hui-button>
  <hui-button>Hôm nay</hui-button>
  <hui-button>Sau</hui-button>
</hui-button-group>
\`\`\`

### Attributes
| Attribute | Kiểu | Mặc định | Mô tả |
|-----------|------|----------|-------|
| \`orientation\` | \`horizontal \\| vertical\` | \`horizontal\` | Hướng xếp |
| \`size\` | \`sm \\| md \\| lg\` | — | Áp cho nút con chưa có \`size\` riêng (đồng thời đổi bo góc nhóm) |
| \`variant\` | variant của hui-button | — | Áp cho nút con chưa có \`variant\` riêng |
| \`block\` | boolean | — | Chiếm hết chiều ngang, các nút chia đều |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Các \`<hui-button>\` (hoặc \`<button>\`) |

### Parts / CSS Variables
\`base\` · \`--hui-button-group-radius\` (bo góc 2 đầu). Nhóm điều khiển bo góc từng nút qua \`--hui-button-radius\`.

### A11y / Bàn phím
\`role="group"\` (đặt \`aria-label\` trên thẻ để đặt tên nhóm); mỗi nút vẫn là một điểm Tab như bình thường.
        `,
      },
    },
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: { control: 'select', options: ['primary', 'secondary', 'outline', 'dashed', 'ghost'] },
    block: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-button-group aria-label="Điều hướng" orientation=${args.orientation} size=${args.size} variant=${args.variant} ?block=${args.block}>
      <hui-button icon="chevron-left">Trước</hui-button>
      <hui-button>Hôm nay</hui-button>
      <hui-button icon="chevron-right" icon-position="end">Sau</hui-button>
    </hui-button-group>
  `,
  args: { orientation: 'horizontal', size: 'md', variant: 'outline', block: false },
};

export const Variants = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
      <hui-button-group aria-label="primary"><hui-button>Một</hui-button><hui-button>Hai</hui-button><hui-button>Ba</hui-button></hui-button-group>
      <hui-button-group aria-label="outline" variant="outline"><hui-button>Một</hui-button><hui-button>Hai</hui-button><hui-button>Ba</hui-button></hui-button-group>
      <hui-button-group aria-label="secondary" variant="secondary"><hui-button>Một</hui-button><hui-button>Hai</hui-button><hui-button>Ba</hui-button></hui-button-group>
      <hui-button-group aria-label="icon" variant="outline">
        <hui-button icon="edit" aria-label="Sửa"></hui-button><hui-button icon="copy" aria-label="Chép"></hui-button><hui-button icon="delete" aria-label="Xóa"></hui-button>
      </hui-button-group>
    </div>
  `,
};

export const SizesAndVertical = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:flex-start">
      <hui-button-group aria-label="sm" size="sm" variant="outline"><hui-button>S</hui-button><hui-button>M</hui-button><hui-button>L</hui-button></hui-button-group>
      <hui-button-group aria-label="lg" size="lg" variant="outline"><hui-button>S</hui-button><hui-button>M</hui-button><hui-button>L</hui-button></hui-button-group>
      <hui-button-group aria-label="dọc" orientation="vertical" variant="outline">
        <hui-button>Trên</hui-button><hui-button>Giữa</hui-button><hui-button>Dưới</hui-button>
      </hui-button-group>
    </div>
  `,
};

/** Nhóm truyền size / variant cho nút con chưa tự đặt; nút tự đặt giữ nguyên; bo góc chỉ ở 2 đầu */
export const Inheritance = {
  render: () => html`
    <hui-button-group id="bg-i" aria-label="Kế thừa" size="sm" variant="outline">
      <hui-button>Một</hui-button>
      <hui-button variant="primary">Hai (tự đặt)</hui-button>
      <hui-button>Ba</hui-button>
    </hui-button-group>
  `,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('#bg-i');
    const [a, b, c] = group.querySelectorAll('hui-button');
    await waitFor(() => expect(a.getAttribute('size')).toBe('sm'));
    expect(a.getAttribute('variant')).toBe('outline');
    expect(b.getAttribute('variant')).toBe('primary');
    group.variant = 'secondary';
    await group.updateComplete;
    expect(c.getAttribute('variant')).toBe('secondary');
    expect(b.getAttribute('variant')).toBe('primary');
    // nút giữa vuông góc, nút đầu bo bên trái
    const radius = (el) => getComputedStyle(el.shadowRoot.querySelector('button')).borderTopLeftRadius;
    expect(radius(b)).toBe('0px');
    expect(radius(a)).not.toBe('0px');
    expect(getComputedStyle(b).marginInlineStart).toBe('-1px');
  },
};

export const Block = {
  render: () => html`
    <div style="max-width:480px">
      <hui-button-group aria-label="block" block variant="outline"><hui-button>Ngày</hui-button><hui-button>Tuần</hui-button><hui-button>Tháng</hui-button></hui-button-group>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .bg-round { --hui-button-group-radius: 999px; }
      .bg-round::part(base) { gap: 0; }
    </style>
    <hui-button-group class="bg-round" aria-label="Bo tròn" variant="outline">
      <hui-button>Trái</hui-button><hui-button>Giữa</hui-button><hui-button>Phải</hui-button>
    </hui-button-group>
  `,
};
