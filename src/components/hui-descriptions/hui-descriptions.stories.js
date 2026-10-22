/**
 * Storybook Stories — HUI Descriptions
 * Danh sách nhãn/giá trị nhiều cột (Ant Descriptions).
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const items = () => html`
  <hui-descriptions-item label="Họ tên">Nguyễn Văn An</hui-descriptions-item>
  <hui-descriptions-item label="Điện thoại">0901 234 567</hui-descriptions-item>
  <hui-descriptions-item label="Thành phố">Hà Nội</hui-descriptions-item>
  <hui-descriptions-item label="Ghi chú">Không có</hui-descriptions-item>
  <hui-descriptions-item label="Địa chỉ">Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội</hui-descriptions-item>
`;

/** Ô (label/content) của item trong shadow */
const cells = (item) => [item.shadowRoot.querySelector('[part="label"]'), item.shadowRoot.querySelector('[part="content"]')];

export default {
  title: 'Components/HuiDescriptions',
  component: 'hui-descriptions',
  subcomponents: { HuiDescriptionsItem: 'hui-descriptions-item' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Descriptions** — hiển thị nhiều cặp nhãn/giá trị dạng lưới (trang chi tiết, hồ sơ).

\`\`\`html
<hui-descriptions title="Thông tin" bordered column="xs:1,sm:2,md:3">
  <hui-button slot="extra" size="sm">Sửa</hui-button>
  <hui-descriptions-item label="Họ tên">Nguyễn Văn An</hui-descriptions-item>
  <hui-descriptions-item label="Địa chỉ" span="2">Hà Nội</hui-descriptions-item>
</hui-descriptions>
\`\`\`

### Attributes — \`hui-descriptions\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`title\` | string | — | Tiêu đề (hoặc slot) |
| \`bordered\` | boolean | \`false\` | Kẻ ô dạng bảng |
| \`column\` | string | \`xs:1,sm:2,md+:3\` | Số cột: \`"3"\` hoặc theo breakpoint \`"xs:1,sm:2,md:3"\` |
| \`column-xs\` … \`column-xxl\` | number | — | Số cột theo breakpoint (ưu tiên hơn \`column\`) |
| \`layout\` | string | \`'horizontal'\` | \`vertical\`: nhãn nằm trên giá trị |
| \`size\` | string | \`'md'\` | \`sm\` / \`md\` / \`lg\` |
| \`colon\` | string | (bật) | Dấu ":" sau nhãn (horizontal, không viền); \`colon="false"\` để tắt |

### Attributes — \`hui-descriptions-item\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`label\` | string | — | Nhãn (hoặc \`slot="label"\`) |
| \`span\` | string | \`1\` | Số cột chiếm, hoặc \`filled\` = lấp hết hàng. Item cuối tự lấp hàng; span tràn hàng bị cắt |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`columnCount\` | number (readonly) | Số cột hiệu lực ở kích thước màn hình hiện tại |

Breakpoint (giống Ant): xs < 576 · sm ≥ 576 · md ≥ 768 · lg ≥ 992 · xl ≥ 1200 · xxl ≥ 1600px.
Breakpoint lớn nhất đang khớp và có giá trị sẽ được dùng.

### Slots
| Thẻ | Slot | Mô tả |
|-----|------|-------|
| descriptions | _(default)_ | Các \`hui-descriptions-item\` |
| descriptions | \`title\` / \`extra\` | Tiêu đề / vùng góc phải |
| item | _(default)_ / \`label\` | Giá trị / nhãn |

### Parts
| Thẻ | Part |
|-----|------|
| descriptions | \`base\`, \`header\`, \`title\`, \`extra\`, \`view\` |
| item | \`label\`, \`content\` |

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-descriptions-border-color\` | \`--hui-border\` | Viền (bordered) |
| \`--hui-descriptions-radius\` | \`--hui-radius-lg\` | Bo góc (bordered) |
| \`--hui-descriptions-title-color\` / \`-title-font-size\` | — | Tiêu đề |
| \`--hui-descriptions-label-color\` | \`--hui-text-secondary\` | Màu nhãn |
| \`--hui-descriptions-label-bg\` | nền nhạt | Nền ô nhãn (bordered) |
| \`--hui-descriptions-content-color\` | \`--hui-text\` | Màu giá trị |
| \`--hui-descriptions-content-bg\` | \`--hui-bg-container\` | Nền ô giá trị (bordered) |
| \`--hui-descriptions-cell-padding\` | theo size | Đệm ô |

### Accessibility & bàn phím
Khung lưới \`role="table"\` (gắn nhãn bằng tiêu đề), mỗi item là \`role="row"\` với nhãn \`rowheader\` + giá trị \`cell\`.
Không có tương tác bàn phím riêng.
        `,
      },
    },
  },
  argTypes: {
    bordered: { control: 'boolean' },
    column: { control: 'text' },
    layout: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    colon: { control: 'inline-radio', options: ['true', 'false'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-descriptions
      title="Thông tin người dùng"
      ?bordered=${args.bordered}
      column=${args.column}
      layout=${args.layout}
      size=${args.size}
      colon=${args.colon}
    >
      <hui-button slot="extra" size="sm">Sửa</hui-button>
      ${items()}
    </hui-descriptions>
  `,
  args: { bordered: false, column: '3', layout: 'horizontal', size: 'md', colon: 'true' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-descriptions');
    const view = el.shadowRoot.querySelector('[part="view"]');
    await expect(el.columnCount).toBe(3);
    await expect(view.getAttribute('role')).toBe('table');
    await expect(view.getAttribute('aria-labelledby')).toBe(el.shadowRoot.querySelector('[part="title"]').id);
    // 3 cột ngang = 6 track (nhãn + giá trị)
    await expect(getComputedStyle(view).gridTemplateColumns.split(' ').length).toBe(6);

    const all = el.querySelectorAll('hui-descriptions-item');
    // Item 4 xuống hàng 2; item cuối (5) lấp 2 cột còn lại → giá trị chiếm 3 track
    const [label4] = cells(all[3]);
    await expect(label4.style.gridRow).toBe('2');
    const [, content5] = cells(all[4]);
    await expect(content5.style.gridColumn).toBe('4 / span 3');
    await expect(cells(all[0])[0].getAttribute('role')).toBe('rowheader');
    // role=row là attribute thật trên item (axe kiểm tra quan hệ table → row → cell)
    await expect(all[0].getAttribute('role')).toBe('row');
  },
};

export const Bordered = {
  render: () => html`
    <hui-descriptions title="Đơn hàng #1024" bordered>
      <hui-descriptions-item label="Sản phẩm">Bàn phím cơ</hui-descriptions-item>
      <hui-descriptions-item label="Trạng thái">Đang giao</hui-descriptions-item>
      <hui-descriptions-item label="Thanh toán">Đã thanh toán</hui-descriptions-item>
      <hui-descriptions-item label="Địa chỉ giao" span="2">Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội</hui-descriptions-item>
      <hui-descriptions-item label="Phí ship">30.000đ</hui-descriptions-item>
      <hui-descriptions-item label="Ghi chú" span="filled">Giao giờ hành chính</hui-descriptions-item>
    </hui-descriptions>
  `,
};

export const ColumnCount = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <hui-descriptions id="c2" title="column=2" column="2" bordered>${items()}</hui-descriptions>
      <hui-descriptions id="c4" title="column-md=4" column-md="4" column-xs="1">${items()}</hui-descriptions>
      <hui-descriptions id="cr" title='column="xs:1,sm:2,md:3"' column="xs:1,sm:2,md:3">${items()}</hui-descriptions>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const c2 = canvasElement.querySelector('#c2');
    await expect(c2.columnCount).toBe(2);
    const view = c2.shadowRoot.querySelector('[part="view"]');
    await expect(getComputedStyle(view).gridTemplateColumns.split(' ').length).toBe(4);

    // Responsive: kết quả phụ thuộc chiều rộng cửa sổ test
    const w = window.innerWidth;
    const expected4 = w >= 768 ? 4 : w < 576 ? 1 : 2; // sm không đặt → mặc định 2
    await expect(canvasElement.querySelector('#c4').columnCount).toBe(expected4);
    const expectedR = w >= 768 ? 3 : w >= 576 ? 2 : 1;
    await expect(canvasElement.querySelector('#cr').columnCount).toBe(expectedR);

    // Đổi column → bố trí lại ngay
    c2.column = '1';
    await c2.updateComplete;
    await expect(getComputedStyle(view).gridTemplateColumns.split(' ').length).toBe(2);
  },
};

export const Vertical = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <hui-descriptions title="layout=vertical" layout="vertical">${items()}</hui-descriptions>
      <hui-descriptions title="layout=vertical + bordered" layout="vertical" bordered>${items()}</hui-descriptions>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-descriptions');
    const [label, content] = cells(el.querySelector('hui-descriptions-item'));
    await expect(label.style.gridRow).toBe('1');
    await expect(content.style.gridRow).toBe('2');
  },
};

export const AllSizes = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      ${['sm', 'md', 'lg'].map((s) => html`<hui-descriptions title="size=${s}" size=${s} bordered column="3">${items()}</hui-descriptions>`)}
    </div>
  `,
};

export const SpanChange = {
  render: () => html`
    <hui-descriptions column="3" bordered>
      <hui-descriptions-item label="A">1</hui-descriptions-item>
      <hui-descriptions-item label="B">2</hui-descriptions-item>
      <hui-descriptions-item label="C">3</hui-descriptions-item>
    </hui-descriptions>
  `,
  play: async ({ canvasElement }) => {
    const [a, b] = canvasElement.querySelectorAll('hui-descriptions-item');
    a.span = '2';
    await a.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    // A chiếm 2 cột → B còn 1 chỗ ở hàng 1, C xuống hàng 2
    await expect(cells(a)[1].style.gridColumn).toBe('2 / span 3');
    await expect(cells(b)[0].style.gridRow).toBe('1');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-desc {
        --hui-descriptions-border-color: var(--hui-primary-3);
        --hui-descriptions-label-bg: var(--hui-primary-1);
        --hui-descriptions-label-color: var(--hui-primary-7);
        --hui-descriptions-radius: 4px;
      }
      .brand-desc hui-descriptions::part(title) { text-transform: uppercase; letter-spacing: 0.05em; }
      .brand-desc hui-descriptions-item::part(label) { font-weight: 600; }
    </style>
    <div class="brand-desc">
      <hui-descriptions title="Biến CSS + ::part" bordered>${items()}</hui-descriptions>
    </div>
  `,
};
