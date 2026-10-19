/**
 * Storybook Stories — HUI List
 * Danh sách (Ant List + MUI List): header/footer, meta, actions, loading, rỗng, lưới, phân trang.
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-avatar/index.js';
import '../hui-button/index.js';

const PEOPLE = [
  { title: 'Nguyễn Văn An', description: 'Kỹ sư frontend · Hà Nội' },
  { title: 'Trần Thị Bình', description: 'Thiết kế sản phẩm · Đà Nẵng' },
  { title: 'Lê Hoàng Châu', description: 'Quản lý dự án · TP. Hồ Chí Minh' },
  { title: 'Phạm Minh Dũng', description: 'Kỹ sư backend · Cần Thơ' },
];

const items = (list = PEOPLE) => list.map((p) => html`
  <hui-list-item>
    <hui-list-item-meta title=${p.title} description=${p.description}>
      <hui-avatar slot="avatar">${p.title.split(' ').pop()[0]}</hui-avatar>
    </hui-list-item-meta>
    <a slot="actions" href="#">Sửa</a>
    <a slot="actions" href="#">Xem</a>
  </hui-list-item>
`);

export default {
  title: 'Components/HuiList',
  component: 'hui-list',
  subcomponents: { HuiListItem: 'hui-list-item', HuiListItemMeta: 'hui-list-item-meta' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI List** — danh sách hiển thị dữ liệu; item gồm meta (avatar + tiêu đề + mô tả), actions, extra.

\`\`\`html
<hui-list header="Thành viên" bordered>
  <hui-list-item>
    <hui-list-item-meta title="Nguyễn Văn An" description="Kỹ sư frontend">
      <hui-avatar slot="avatar">A</hui-avatar>
    </hui-list-item-meta>
    <a slot="actions" href="#">Sửa</a>
  </hui-list-item>
  <hui-pagination slot="pagination" total="50"></hui-pagination>
</hui-list>
\`\`\`

### Attributes — \`hui-list\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`header\` / \`footer\` | string | — | Chữ đầu / chân danh sách (hoặc slot) |
| \`bordered\` | boolean | \`false\` | Viền ngoài + bo góc |
| \`split\` | string | (bật) | Đường kẻ giữa item; \`split="false"\` để tắt |
| \`size\` | string | \`'md'\` | \`sm\` / \`md\` / \`lg\` |
| \`loading\` | boolean | \`false\` | Phủ \`hui-spinner\`, khóa tương tác (\`inert\`) |
| \`item-layout\` | string | \`'horizontal'\` | \`vertical\`: actions dưới nội dung, extra là vùng lớn bên phải |
| \`empty-text\` | string | locale | Mô tả của \`hui-empty\` khi rỗng |
| \`grid-column\` | number | — | Bật chế độ lưới, số cột |
| \`grid-gutter\` | string | \`16\` | Khoảng cách thẻ (số = px) |
| \`grid-column-xs\` … \`grid-column-xxl\` | number | — | Số cột theo breakpoint (576/768/992/1200/1600px), mobile-first |

### Properties (chỉ JS)
| Property | Type | Mô tả |
|----------|------|-------|
| \`dataSource\` | \`any[]\` | Chế độ dữ liệu |
| \`renderItem\` | \`(item, index) => Node \\| string\` | Mặc định: object \`{ title, description, content }\` → item + meta |
| \`itemCount\` | number (readonly) | Số item hiện có |

### Slots
| Thẻ | Slot | Mô tả |
|-----|------|-------|
| list | _(default)_ | Các \`hui-list-item\` |
| list | \`header\` / \`footer\` | Đầu / chân |
| list | \`pagination\` | Phân trang (vd \`hui-pagination\`), canh phải |
| list | \`empty\` | Thay \`hui-empty\` mặc định |
| item | _(default)_ | Nội dung chính |
| item | \`actions\` | Hành động |
| item | \`extra\` | Vùng lớn bên phải |
| meta | \`avatar\`, \`title\`, \`description\` | Avatar, tiêu đề, mô tả |

### Parts
| Thẻ | Part |
|-----|------|
| list | \`base\`, \`header\`, \`body\`, \`items\`, \`empty\`, \`loading\`, \`footer\`, \`pagination\` |
| item | \`base\`, \`main\`, \`actions\`, \`extra\` |
| meta | \`base\`, \`avatar\`, \`content\`, \`title\`, \`description\` |

### Custom state
\`hui-list:state(empty)\` — không có item.

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-list-bg\` | \`--hui-bg-container\` | Nền (bordered) |
| \`--hui-list-border-color\` | \`--hui-border\` | Viền ngoài |
| \`--hui-list-radius\` | \`--hui-radius-lg\` | Bo góc |
| \`--hui-list-split-color\` | \`--hui-border\` | Đường kẻ |
| \`--hui-list-item-padding\` | theo size | Đệm item |
| \`--hui-list-item-color\` | \`--hui-text\` | Màu chữ item |
| \`--hui-list-item-actions-gap\` | \`--hui-space-lg\` | Khoảng cách actions |
| \`--hui-list-header-bg\` | trong suốt | Nền header/footer |
| \`--hui-list-card-bg\` / \`-border-color\` / \`-radius\` | — | Thẻ ở chế độ lưới |
| \`--hui-list-loading-bg\` | nền mờ | Lớp phủ loading |
| \`--hui-list-pagination-justify\` | \`flex-end\` | Canh phân trang |
| \`--hui-list-meta-title-color\` / \`-title-font-size\` / \`-description-color\` / \`-gap\` | — | Meta |

### Bàn phím
Không có tương tác riêng — Tab đi qua các phần tử bấm được bên trong item. Khối item có \`role="list"\`, mỗi item \`role="listitem"\`.
        `,
      },
    },
  },
  argTypes: {
    bordered: { control: 'boolean' },
    split: { control: 'inline-radio', options: ['true', 'false'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    'item-layout': { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-list
      header="Thành viên"
      footer="4 người"
      ?bordered=${args.bordered}
      split=${args.split}
      size=${args.size}
      ?loading=${args.loading}
      item-layout=${args['item-layout']}
    >${items()}</hui-list>
  `,
  args: { bordered: true, split: 'true', size: 'md', loading: false, 'item-layout': 'horizontal' },
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    await expect(list.itemCount).toBe(4);
    await expect(list.shadowRoot.querySelector('[part="items"]').getAttribute('role')).toBe('list');
    await expect(list.shadowRoot.querySelector('[part="empty"]').hidden).toBe(true);
    await expect(list.shadowRoot.querySelector('[part="header"]').textContent).toContain('Thành viên');
  },
};

export const AllSizes = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${['sm', 'md', 'lg'].map((s) => html`<hui-list bordered size=${s} header="size=${s}">${items(PEOPLE.slice(0, 2))}</hui-list>`)}
    </div>
  `,
};

export const NoSplit = {
  render: () => html`<hui-list split="false">${items()}</hui-list>`,
};

export const Loading = {
  render: () => html`<hui-list bordered loading>${items(PEOPLE.slice(0, 2))}</hui-list>`,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    const overlay = list.shadowRoot.querySelector('[part="loading"]');
    await expect(overlay.hidden).toBe(false);
    await expect(overlay.querySelector('hui-spinner')).toBeTruthy();
    await expect(list.shadowRoot.querySelector('[part="body"]').getAttribute('aria-busy')).toBe('true');
    list.loading = false;
    await list.updateComplete;
    await expect(overlay.hidden).toBe(true);
  },
};

export const Empty = {
  render: () => html`<hui-list bordered header="Không có ai"></hui-list>`,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    const empty = list.shadowRoot.querySelector('[part="empty"]');
    await expect(empty.hidden).toBe(false);
    await expect(empty.querySelector('hui-empty')).toBeTruthy();
    await expect(list.shadowRoot.querySelector('[part="items"]').hidden).toBe(true);

    // Thêm item → hết rỗng
    const item = document.createElement('hui-list-item');
    item.textContent = 'Item mới';
    list.append(item);
    await new Promise((r) => setTimeout(r, 0)); // chờ slotchange
    await expect(empty.hidden).toBe(true);
    await expect(list.itemCount).toBe(1);
  },
};

export const VerticalLayout = {
  render: () => html`
    <hui-list item-layout="vertical" size="lg">
      ${PEOPLE.slice(0, 2).map((p) => html`
        <hui-list-item>
          <hui-list-item-meta title=${p.title} description=${p.description}>
            <hui-avatar slot="avatar" size="lg">${p.title.split(' ').pop()[0]}</hui-avatar>
          </hui-list-item-meta>
          <p style="margin: 12px 0 0;">Đoạn nội dung dài mô tả chi tiết bài viết của thành viên, hiển thị dưới meta.</p>
          <span slot="actions">★ 156</span>
          <span slot="actions">♥ 32</span>
          <span slot="actions">💬 2</span>
          <div slot="extra" style="width: 200px; height: 120px; border-radius: 8px; background: linear-gradient(135deg, var(--hui-primary-3), var(--hui-primary-6));"></div>
        </hui-list-item>
      `)}
    </hui-list>
  `,
};

export const Grid = {
  render: () => html`
    <hui-list grid-column="4" grid-column-xs="1" grid-column-sm="2" grid-column-md="3" grid-gutter="16">
      ${['Hà Nội', 'Huế', 'Đà Nẵng', 'Hội An', 'Nha Trang', 'Đà Lạt', 'Sài Gòn', 'Cần Thơ'].map((city) => html`
        <hui-list-item>
          <strong>${city}</strong>
          <div style="color: var(--hui-text-secondary); margin-top: 4px;">Nội dung thẻ</div>
        </hui-list-item>
      `)}
    </hui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    const base = list.shadowRoot.querySelector('[part="base"]');
    const itemsEl = list.shadowRoot.querySelector('[part="items"]');
    await expect(base.classList.contains('hui-list--grid')).toBe(true);
    await expect(getComputedStyle(itemsEl).display).toBe('grid');
    await expect(itemsEl.style.getPropertyValue('--_list-gutter')).toBe('16px');
  },
};

export const DataSource = {
  render: () => html`<hui-list bordered header="Từ dataSource"></hui-list>`,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    list.dataSource = PEOPLE;
    await list.updateComplete;
    await expect(list.itemCount).toBe(4);
    await expect(list.shadowRoot.querySelector('hui-list-item-meta').getAttribute('title')).toBe(PEOPLE[0].title);

    // renderItem tùy biến
    list.renderItem = (p, i) => {
      const li = document.createElement('hui-list-item');
      li.textContent = `${i + 1}. ${p.title}`;
      return li;
    };
    await list.updateComplete;
    await expect(list.shadowRoot.querySelector('hui-list-item').textContent).toBe(`1. ${PEOPLE[0].title}`);

    list.dataSource = [];
    await list.updateComplete;
    await expect(list.shadowRoot.querySelector('[part="empty"]').hidden).toBe(false);
  },
};

export const WithPaginationSlot = {
  render: () => html`
    <hui-list bordered>
      ${items(PEOPLE.slice(0, 3))}
      <div slot="pagination" style="display: flex; gap: 4px;">
        <hui-button size="sm" variant="ghost">‹</hui-button>
        <hui-button size="sm">1</hui-button>
        <hui-button size="sm" variant="ghost">2</hui-button>
        <hui-button size="sm" variant="ghost">›</hui-button>
      </div>
    </hui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    await expect(list.shadowRoot.querySelector('[part="pagination"]').hidden).toBe(false);
    // Phần tử slot="pagination" không bị tính là item
    await expect(list.itemCount).toBe(3);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-list {
        --hui-list-border-color: var(--hui-primary-3);
        --hui-list-split-color: var(--hui-primary-2);
        --hui-list-header-bg: var(--hui-primary-1);
        --hui-list-radius: 4px;
        --hui-list-meta-title-color: var(--hui-primary-7);
      }
      hui-list.brand-list::part(header) { font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      hui-list.brand-list hui-list-item::part(base):hover { background: var(--hui-fill-tertiary); }
    </style>
    <hui-list class="brand-list" bordered header="Override bằng biến CSS + ::part">${items(PEOPLE.slice(0, 3))}</hui-list>
  `,
};
