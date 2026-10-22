/**
 * Storybook Stories — HUI Description Card (thẻ chi tiết bản ghi)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { svgImage } from '../hui-image/story-images.js';
import './index.js';
import '../hui-button/index.js';
import '../hui-tag/index.js';

const ORDER = {
  id: 'DH-10245',
  customer: { name: 'Nguyễn Thị Lan', avatar: svgImage({ w: 96, h: 96, hue: 330, label: 'L' }) },
  email: 'lan.nguyen@example.com',
  phone: '0901 234 567',
  total: 56890000,
  discount: 12.5,
  items: 3,
  createdAt: '2026-10-18T09:30:00',
  status: 'shipping',
  tags: ['VIP', 'Trả góp'],
  paid: true,
  giftWrap: false,
  website: 'https://example.com/orders/DH-10245',
  note: '',
  address: { city: 'Đà Nẵng' },
};

const FIELDS = [
  { key: 'id', label: 'Mã đơn', copyable: true },
  { key: 'customer', label: 'Khách hàng', type: 'avatar' },
  { key: 'email', label: 'Email', type: 'email', copyable: true },
  { key: 'phone', label: 'Điện thoại', type: 'phone' },
  { key: 'total', label: 'Tổng tiền', type: 'currency' },
  { key: 'discount', label: 'Giảm giá', type: 'percent' },
  { key: 'items', label: 'Số sản phẩm', type: 'number' },
  { key: 'createdAt', label: 'Ngày tạo', type: 'date', format: 'long' },
  {
    key: 'status', label: 'Trạng thái', type: 'badge',
    status: { pending: 'default', shipping: 'processing', done: 'success', cancelled: 'error' },
    labels: { pending: 'Chờ xử lý', shipping: 'Đang giao', done: 'Hoàn tất', cancelled: 'Đã hủy' },
  },
  { key: 'tags', label: 'Nhãn', type: 'tag', colors: { VIP: 'warning', 'Trả góp': 'info' } },
  { key: 'paid', label: 'Đã thanh toán', type: 'boolean' },
  { key: 'giftWrap', label: 'Gói quà', type: 'boolean' },
  { key: 'website', label: 'Trang theo dõi', type: 'link', span: 2 },
  { key: 'address.city', label: 'Thành phố' },
  { key: 'note', label: 'Ghi chú', span: 'filled' },
];

const itemsOf = (el) => [...el.shadowRoot.querySelectorAll('hui-descriptions-item')];
const valueOf = (el, label) => itemsOf(el).find((i) => i.label === label)?.querySelector('[part~="value"]');
/** Bỏ khoảng trắng (Intl dùng NBSP / không có khoảng trắng tùy bản ICU) */
const norm = (s) => s.replace(/\s/g, '');

export default {
  title: 'Organisms/HuiDescriptionCard',
  component: 'hui-description-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Description Card** — Thẻ xem chi tiết **một bản ghi**: truyền \`data\` (object) + \`fields\` khai báo kiểu → hiển thị đẹp ngay
(tiền tệ, ngày, tag, avatar, link, trạng thái…) qua \`core/format.js\`. Lưới nhãn/giá trị dùng \`hui-descriptions\`
(cột responsive, \`span\`), giá trị rỗng hiện "—", tùy chọn nút sao chép từng trường.

\`\`\`html
<hui-description-card heading="Đơn hàng DH-10245" column="xs:1,md:2" bordered></hui-description-card>
<script>
  card.data = order;
  card.fields = [
    { key: 'total', label: 'Tổng tiền', type: 'currency' },
    { key: 'createdAt', label: 'Ngày tạo', type: 'date', format: 'long' },
    { key: 'status', label: 'Trạng thái', type: 'badge', status: { done: 'success' } },
  ];
</script>
\`\`\`

### Field
| Thuộc tính | Mô tả |
|------------|-------|
| \`key\` | Đường dẫn trong data (\`"address.city"\`) |
| \`label\` | Nhãn |
| \`type\` | \`text\` \\| \`number\` \\| \`currency\` \\| \`percent\` \\| \`date\` \\| \`datetime\` \\| \`relative\` \\| \`tag\` \\| \`avatar\` \\| \`link\` \\| \`email\` \\| \`phone\` \\| \`boolean\` \\| \`badge\` |
| \`format\` | number: số lẻ (\`"2"\`) · currency: mã tiền (\`"USD"\`) · date: \`short\` \\| \`medium\` \\| \`long\` \\| \`full\` · text: bộ chọn data-format |
| \`span\` | Số cột chiếm hoặc \`"filled"\` |
| \`copyable\` | Nút sao chép giá trị |
| \`colors\` / \`color\` | (tag/badge) map giá trị → màu |
| \`status\` / \`labels\` | (badge) map giá trị → \`success\` \\| \`processing\` \\| \`error\` \\| \`warning\` \\| \`default\`; map giá trị → chữ |
| \`href\` / \`target\` | (link) mẫu URL \`"/users/{id}"\`; target (mặc định \`_blank\` với http) |
| \`render(value, data)\` | Tự dựng giá trị (Node \\| string) |
| \`emptyText\` | Chữ khi rỗng (ghi đè \`empty-text\`) |

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`heading\` | string | — | Tiêu đề (hoặc slot \`title\`) |
| \`column\` | string | xs1·sm2·md3 | Số cột: \`"2"\` hoặc \`"xs:1,sm:2,lg:3"\` |
| \`layout\` | string | \`horizontal\` | \`horizontal\` \\| \`vertical\` |
| \`bordered\` | boolean | \`false\` | Kẻ ô dạng bảng |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`empty-text\` | string | \`—\` | Chữ giá trị rỗng |
| \`copyable\` | boolean | \`false\` | Mọi trường có nút sao chép |
| \`loading\` | boolean | \`false\` | Skeleton |
| \`flat\` | boolean | \`false\` | Bỏ khung thẻ |

### Properties
\`data\` (object), \`fields\` (array) — bỏ trống \`fields\` → mọi khóa của data hiển thị dạng text.

### Events
\`hui-copy\` \`{ value }\` — nổi bọt từ nút sao chép.

### Slots
| Slot | Mô tả |
|------|-------|
| \`title\` | Tiêu đề HTML |
| \`extra\` | Góc phải tiêu đề (nút Sửa, tag…) |
| \`actions\` | Hàng nút ở chân thẻ |
| \`field-<key>\` | Thay giá trị của trường \`key\` (vd \`slot="field-email"\`) |

### Parts
\`base\`, \`header\`, \`title\`, \`extra\`, \`body\`, \`descriptions\`, \`value\`, \`empty-value\`, \`copy\`, \`footer\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-description-card-bg\` / \`--hui-description-card-border\` / \`--hui-description-card-radius\` / \`--hui-description-card-shadow\` | Khung thẻ |
| \`--hui-description-card-padding\` | Khoảng đệm |
| \`--hui-description-card-title-size\` | Cỡ tiêu đề |
| \`--hui-description-card-empty-color\` | Màu "—" |
| \`--hui-descriptions-*\` | Lưới nhãn/giá trị (kế thừa) |

### Accessibility
Thẻ là \`<section aria-labelledby>\` tiêu đề; lưới \`role="table"\` (nhãn = rowheader, giá trị = cell). Avatar trang trí,
boolean có icon + chữ "Có/Không". Tab đi qua link / nút sao chép / nút trong slot.
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-description-card id="dc-default" heading="Đơn hàng DH-10245" column="xs:1,md:2" .data=${ORDER} .fields=${FIELDS}>
      <hui-tag slot="extra" color="info">Đang giao</hui-tag>
      <hui-button slot="actions" variant="outline">In hóa đơn</hui-button>
      <hui-button slot="actions">Cập nhật</hui-button>
    </hui-description-card>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dc-default');
    await el.updateComplete;
    await expect(itemsOf(el).length).toBe(FIELDS.length);
    await expect(el.shadowRoot.querySelector('[part="base"]').getAttribute('aria-labelledby')).toBe('dc-title');
    await expect(norm(valueOf(el, 'Tổng tiền').textContent)).toBe('56.890.000₫');
    await expect(norm(valueOf(el, 'Giảm giá').textContent)).toBe('12,5%');
    await expect(valueOf(el, 'Ngày tạo').textContent).toBe('18 tháng 10, 2026');
    await expect(valueOf(el, 'Thành phố').textContent).toBe('Đà Nẵng');
    // Rỗng → "—"
    const note = valueOf(el, 'Ghi chú');
    await expect(note.textContent).toBe('—');
    await expect(note.getAttribute('part')).toBe('value empty-value');
    // Tag theo màu
    const tags = valueOf(el, 'Nhãn').querySelectorAll('hui-tag');
    await expect([...tags].map((t) => t.getAttribute('color'))).toEqual(['warning', 'info']);
    // Badge → hui-dot
    const dot = valueOf(el, 'Trạng thái').querySelector('hui-dot');
    await expect(dot.getAttribute('status')).toBe('processing');
    await expect(dot.getAttribute('label')).toBe('Đang giao');
    // Link / email / phone
    const link = valueOf(el, 'Trang theo dõi').querySelector('a');
    await expect(link.getAttribute('target')).toBe('_blank');
    await expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    await expect(valueOf(el, 'Email').querySelector('a').getAttribute('href')).toBe('mailto:lan.nguyen@example.com');
    await expect(valueOf(el, 'Điện thoại').querySelector('a').getAttribute('href')).toBe('tel:0901234567');
    // Boolean
    await expect(valueOf(el, 'Đã thanh toán').textContent).toBe('Có');
    await expect(valueOf(el, 'Gói quà').textContent).toBe('Không');
    // Copyable
    await expect(valueOf(el, 'Mã đơn').querySelector('hui-copy').getAttribute('value')).toBe('DH-10245');
    await expect(el.shadowRoot.querySelector('[part="footer"]').hidden).toBe(false);
  },
};

/** Viền bảng + bố cục dọc, 3 cột */
export const BorderedVertical = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <hui-description-card heading="Bordered" bordered column="xs:1,sm:2,lg:3" .data=${ORDER} .fields=${FIELDS.slice(0, 9)}></hui-description-card>
      <hui-description-card heading="Vertical" layout="vertical" column="xs:1,sm:2,lg:4" size="sm" .data=${ORDER} .fields=${FIELDS.slice(0, 8)}></hui-description-card>
    </div>
  `,
};

/** Không khai báo fields → mọi khóa của data dạng text; slot field-<key> thay giá trị */
export const AutoFieldsAndSlot = {
  render: () => html`
    <hui-description-card id="dc-auto" heading="Người dùng" column="2" copyable
      .data=${{ name: 'Trần Minh', email: 'minh@example.com', role: 'Quản trị', team: '' }}>
      <a slot="field-email" href="mailto:minh@example.com">✉ minh@example.com</a>
    </hui-description-card>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dc-auto');
    await el.updateComplete;
    await expect(itemsOf(el).map((i) => i.label)).toEqual(['name', 'email', 'role', 'team']);
    const slot = itemsOf(el)[1].querySelector('slot[name="field-email"]');
    await expect(slot.assignedElements()[0].textContent).toContain('minh@example.com');
    // copyable toàn thẻ → trường có giá trị đều có nút sao chép, trường rỗng thì không
    await expect(itemsOf(el)[0].querySelector('hui-copy').getAttribute('value')).toBe('Trần Minh');
    await expect(itemsOf(el)[3].querySelector('hui-copy')).toBeNull();
  },
};

/** render(value, data) tùy biến + empty-text */
export const CustomRender = {
  render: () => html`
    <hui-description-card id="dc-render" heading="Sản phẩm" empty-text="Chưa cập nhật" column="2"
      .data=${{ name: 'Áo khoác gió', stock: 4, sku: '' }}
      .fields=${[
        { key: 'name', label: 'Tên' },
        {
          key: 'stock', label: 'Tồn kho',
          render: (v) => {
            const s = document.createElement('strong');
            s.style.color = v < 5 ? 'var(--hui-danger)' : 'var(--hui-success)';
            s.textContent = `${v} chiếc${v < 5 ? ' (sắp hết)' : ''}`;
            return s;
          },
        },
        { key: 'sku', label: 'SKU' },
      ]}></hui-description-card>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dc-render');
    await el.updateComplete;
    await expect(valueOf(el, 'Tồn kho').textContent).toBe('4 chiếc (sắp hết)');
    await expect(valueOf(el, 'SKU').textContent).toBe('Chưa cập nhật');
  },
};

export const Loading = {
  render: () => html`<hui-description-card id="dc-loading" heading="Đang tải hồ sơ" loading></hui-description-card>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dc-loading');
    await el.updateComplete;
    await expect(el.getAttribute('aria-busy')).not.toBeNull();
    await expect(el.shadowRoot.querySelector('hui-skeleton').hidden).toBe(false);
    await expect(el.shadowRoot.querySelector('[part="descriptions"]').hidden).toBe(true);
    el.data = ORDER;
    el.fields = FIELDS.slice(0, 4);
    el.loading = false;
    await el.updateComplete;
    await waitFor(() => expect(itemsOf(el).length).toBe(4));
  },
};

/** flat — bỏ khung thẻ (đặt trong drawer / modal) */
export const Flat = {
  render: () => html`<hui-description-card flat column="1" .data=${ORDER} .fields=${FIELDS.slice(0, 6)}></hui-description-card>`,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .dc-brand {
        --hui-description-card-bg: var(--hui-primary-1);
        --hui-description-card-border: 2px solid var(--hui-primary-3);
        --hui-description-card-radius: 20px;
        --hui-description-card-shadow: var(--hui-shadow-lg);
        --hui-description-card-padding: 28px;
        --hui-description-card-title-size: 1.5rem;
        --hui-description-card-empty-color: var(--hui-danger);
        --hui-descriptions-label-color: var(--hui-primary);
      }
      .dc-brand::part(title) { letter-spacing: -0.01em; }
      .dc-brand::part(footer) { justify-content: flex-start; }
    </style>
    <hui-description-card id="dc-brand" class="dc-brand" heading="Hồ sơ khách hàng" column="2" .data=${ORDER} .fields=${FIELDS.slice(0, 6).concat(FIELDS.slice(-1))}>
      <hui-button slot="actions" size="sm">Nhắn tin</hui-button>
    </hui-description-card>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dc-brand');
    await el.updateComplete;
    const base = el.shadowRoot.querySelector('[part="base"]');
    await expect(getComputedStyle(base).borderTopLeftRadius).toBe('20px');
    await expect(getComputedStyle(el.shadowRoot.querySelector('[part="title"]')).fontSize).toBe('24px');
  },
};
