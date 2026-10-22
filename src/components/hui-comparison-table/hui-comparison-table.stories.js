/**
 * Storybook Stories — HUI Comparison Table (Organism)
 * Bảng so sánh gói: ✓ / ✗ / chữ, cột nổi bật, nhóm dòng, header + cột đầu dính; màn hẹp: chọn gói hoặc cuộn ngang.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const COLUMNS = [
  { id: 'free', title: 'Miễn phí', price: 0, period: '/tháng', description: 'Cho cá nhân thử nghiệm', cta: 'Bắt đầu' },
  { id: 'pro', title: 'Pro', price: 199000, period: '/tháng', description: 'Cho cửa hàng đang phát triển', highlighted: true, cta: { label: 'Dùng thử 14 ngày' } },
  { id: 'business', title: 'Doanh nghiệp', price: 'Liên hệ', description: 'Nhiều chi nhánh, SLA riêng', cta: { label: 'Liên hệ', href: '#contact' } },
];

const ROWS = [
  { label: 'Số sản phẩm', values: { free: '50', pro: 'Không giới hạn', business: 'Không giới hạn' } },
  { label: 'Tên miền riêng', values: { free: false, pro: true, business: true } },
  { group: 'Bán hàng', label: 'Thanh toán online', description: 'VNPay, MoMo, thẻ quốc tế', values: { free: true, pro: true, business: true } },
  { group: 'Bán hàng', label: 'Mã giảm giá', values: { free: false, pro: true, business: true } },
  { group: 'Bán hàng', label: 'Đa kho / chi nhánh', values: { free: false, pro: '2 kho', business: 'Không giới hạn' } },
  { group: 'Marketing', label: 'Email tự động', values: { free: false, pro: true, business: true } },
  { group: 'Marketing', label: 'Báo cáo nâng cao', values: { free: false, pro: false, business: true } },
  { group: 'Hỗ trợ', label: 'Kênh hỗ trợ', values: { free: 'Email', pro: 'Chat 24/7', business: 'Quản lý riêng' } },
  { group: 'Hỗ trợ', label: 'Cam kết SLA', values: { free: false, pro: false, business: '99,9%' } },
];

const part = (el, name) => [...el.shadowRoot.querySelectorAll(`[part~="${name}"]`)];
const visibleCols = (ct) => part(ct, 'column-header').filter((th) => getComputedStyle(th).display !== 'none').map((th) => th.dataset.col);

export default {
  title: 'Organisms/HuiComparisonTable',
  component: 'hui-comparison-table',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Comparison Table** — bảng so sánh gói / sản phẩm.

\`\`\`html
<hui-comparison-table id="ct" caption="So sánh các gói" mobile="select"></hui-comparison-table>
<script>
  ct.columns = [{ id: 'pro', title: 'Pro', price: 199000, period: '/tháng', highlighted: true, cta: 'Dùng thử' }, …];
  ct.rows = [{ group: 'Bán hàng', label: 'Mã giảm giá', values: { free: false, pro: true } }, …];
  ct.addEventListener('hui-select', (e) => openCheckout(e.detail.column.id));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`columns\` | JSON array | \`[]\` | \`[{ id, title, price, period, description, highlighted, badge, cta }]\` — cta: chuỗi hoặc \`{ label, href, variant }\` |
| \`rows\` | JSON array | \`[]\` | \`[{ label, description, group, values: { [colId]: true \\| false \\| 'chữ' } }]\` |
| \`caption\` | string | theo locale | Chú thích bảng (nhãn trợ năng) |
| \`show-caption\` | boolean | \`false\` | Hiện caption (mặc định chỉ cho trình đọc màn hình) |
| \`feature-label\` | string | "Tính năng" | Tiêu đề cột đầu |
| \`sticky\` | string | \`'both'\` | \`both\` / \`header\` / \`column\` / \`none\` |
| \`mobile\` | string | \`'select'\` | Màn hẹp: \`select\` (chọn 1 gói so với cột tính năng) / \`scroll\` (cuộn ngang) |
| \`mobile-breakpoint\` | number | \`640\` | Ngưỡng (px, theo chiều rộng thẻ) |
| \`currency\` | string | \`'VND'\` | Tiền tệ khi \`price\` là số |

### Properties
\`activeColumn\` — id gói đang xem ở chế độ chọn (mặc định cột nổi bật).

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-select\` | \`{ column }\` | Bấm CTA không có \`href\` |
| \`hui-column-change\` | \`{ id, column }\` | Đổi gói ở ô chọn (màn hẹp) |

### Parts
\`base\`, \`picker\`, \`select\`, \`scroller\`, \`table\`, \`caption\`, \`corner\`, \`column-header\`, \`column-header-highlighted\`, \`badge\`,
\`column-title\`, \`price\`, \`period\`, \`column-description\`, \`cta\`, \`group-title\`, \`row\`, \`row-header\`, \`cell\`, \`icon-yes\`, \`icon-no\`

### CSS Variables
\`--hui-comparison-table-bg\`, \`-border-color\`, \`-radius\`, \`-cell-padding\`, \`-first-col-width\` (32%), \`-col-min-width\` (150px),
\`-sticky-top\` (vd: chiều cao navbar), \`-max-height\`, \`-highlight-bg\`, \`-highlight-color\`, \`-group-bg\`, \`-yes-color\`, \`-no-color\`, \`-row-hover-bg\`

### Bàn phím & trợ năng
Bảng HTML chuẩn: \`<th scope="col">\` cho gói, \`<th scope="row">\` cho tính năng, \`<th scope="rowgroup">\` cho nhóm — trình đọc
màn hình đọc "Pro, Mã giảm giá, Có". ✓ / ✗ có chữ ẩn "Có" / "Không có". Khi bảng phải cuộn, vùng cuộn có \`tabindex="0"\` +
\`role="region"\` để cuộn bằng phím mũi tên. Header chỉ dính theo trang khi bảng không cuộn ngang (giới hạn của CSS sticky).
        `,
      },
    },
  },
  argTypes: {
    sticky: { control: 'inline-radio', options: ['both', 'header', 'column', 'none'] },
    mobile: { control: 'inline-radio', options: ['select', 'scroll'] },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 960px;">
      <hui-comparison-table caption="So sánh các gói H-UI Commerce" sticky=${args.sticky} mobile=${args.mobile}
        mobile-breakpoint="560" .columns=${COLUMNS} .rows=${ROWS}></hui-comparison-table>
    </div>
  `,
  args: { sticky: 'both', mobile: 'select' },
  play: async ({ canvasElement }) => {
    const ct = canvasElement.querySelector('hui-comparison-table');
    await ct.updateComplete;
    const table = ct.shadowRoot.querySelector('table');
    await expect(table.querySelector('caption').textContent).toBe('So sánh các gói H-UI Commerce');
    await expect(part(ct, 'column-header').length).toBe(3);
    await expect(part(ct, 'column-header')[0].getAttribute('scope')).toBe('col');
    await expect(part(ct, 'row-header')[0].getAttribute('scope')).toBe('row');
    // Nhóm: dòng không nhóm đứng đầu, sau đó Bán hàng / Marketing / Hỗ trợ
    await expect(part(ct, 'group-title').map((th) => th.textContent)).toEqual(['Bán hàng', 'Marketing', 'Hỗ trợ']);
    await expect(part(ct, 'group-title')[0].getAttribute('scope')).toBe('rowgroup');
    // Cột nổi bật + badge
    const pro = part(ct, 'column-header-highlighted');
    await expect(pro.length).toBe(1);
    await expect(pro[0].querySelector('[part="badge"]').textContent).toBe('Phổ biến');
    // Giá số → định dạng tiền tệ
    await expect(pro[0].querySelector('[part="price"]').textContent).toContain('199.000');
    // ✓ / ✗ có chữ cho trình đọc màn hình
    const domainRow = part(ct, 'row')[1];
    await expect(domainRow.querySelectorAll('[part="icon-no"]').length).toBe(1);
    await expect(domainRow.querySelectorAll('[part="icon-yes"]').length).toBe(2);
    await expect(domainRow.querySelector('.ct__mark--no .ct__sr').textContent).toBe('Không có');

    // CTA không href → hui-select; có href → link
    let selected = null;
    ct.addEventListener('hui-select', (e) => { selected = e.detail.column; }, { once: true });
    pro[0].querySelector('hui-button').shadowRoot.querySelector('button').click();
    await expect(selected.id).toBe('pro');
    await expect(part(ct, 'cta')[2].getAttribute('href')).toBe('#contact');
  },
};

export const MobileSelect = {
  name: 'Màn hẹp: chọn gói',
  render: () => html`
    <div id="box" style="width: 360px; border: 1px dashed var(--hui-border); padding: 8px;">
      <hui-comparison-table .columns=${COLUMNS} .rows=${ROWS}></hui-comparison-table>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ct = canvasElement.querySelector('hui-comparison-table');
    const box = canvasElement.querySelector('#box');
    await ct.updateComplete;
    const picker = ct.shadowRoot.querySelector('[part="picker"]');
    await waitFor(() => expect(picker.hidden).toBe(false));
    // Mặc định xem cột nổi bật
    await expect(ct.activeColumn).toBe('pro');
    await expect(visibleCols(ct)).toEqual(['pro']);
    const select = ct.shadowRoot.querySelector('[part="select"]');
    await expect(select.labels[0].textContent).toBe('Chọn gói để so sánh');

    let changed = null;
    ct.addEventListener('hui-column-change', (e) => { changed = e.detail; }, { once: true });
    select.value = 'business';
    select.dispatchEvent(new Event('change'));
    await expect(changed.id).toBe('business');
    await expect(visibleCols(ct)).toEqual(['business']);
    await expect(part(ct, 'group-title')[0].colSpan).toBe(2);

    // Nới rộng → hiện đủ cột
    box.style.width = '900px';
    await waitFor(() => expect(picker.hidden).toBe(true));
    await expect(visibleCols(ct)).toEqual(['free', 'pro', 'business']);
    await expect(part(ct, 'group-title')[0].colSpan).toBe(4);
  },
};

export const MobileScroll = {
  name: 'Màn hẹp: cuộn ngang + cột đầu dính',
  render: () => html`
    <div style="width: 360px; border: 1px dashed var(--hui-border); padding: 8px;">
      <hui-comparison-table mobile="scroll" .columns=${COLUMNS} .rows=${ROWS}></hui-comparison-table>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ct = canvasElement.querySelector('hui-comparison-table');
    await ct.updateComplete;
    const scroller = ct.shadowRoot.querySelector('[part="scroller"]');
    await waitFor(() => expect(scroller.getAttribute('tabindex')).toBe('0'));
    await expect(scroller.getAttribute('role')).toBe('region');
    await expect(ct.shadowRoot.querySelector('[part="picker"]').hidden).toBe(true);
    await expect(visibleCols(ct).length).toBe(3);
    const firstHead = part(ct, 'row-header')[0];
    await expect(getComputedStyle(firstHead).position).toBe('sticky');
    // Cuộn ngang: cột tính năng vẫn ở mép trái
    const left = firstHead.getBoundingClientRect().left;
    scroller.scrollLeft = 200;
    await new Promise((r) => requestAnimationFrame(r));
    await expect(Math.round(firstHead.getBoundingClientRect().left)).toBe(Math.round(left));
  },
};

export const StickyHeaderInsideScroll = {
  name: 'Header dính (max-height)',
  render: () => html`
    <hui-comparison-table style="--hui-comparison-table-max-height: 320px; max-width: 900px;" .columns=${COLUMNS} .rows=${ROWS}></hui-comparison-table>
  `,
  play: async ({ canvasElement }) => {
    const ct = canvasElement.querySelector('hui-comparison-table');
    await ct.updateComplete;
    const scroller = ct.shadowRoot.querySelector('[part="scroller"]');
    await waitFor(() => expect(scroller.classList.contains('ct__scroller--scroll')).toBe(true));
    const head = part(ct, 'column-header')[0];
    const top = head.getBoundingClientRect().top;
    scroller.scrollTop = 150;
    await new Promise((r) => requestAnimationFrame(r));
    await expect(Math.round(head.getBoundingClientRect().top)).toBe(Math.round(top));
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-ct {
        --hui-comparison-table-highlight-color: var(--hui-success);
        --hui-comparison-table-radius: 20px;
        --hui-comparison-table-group-bg: var(--hui-success-1);
        --hui-comparison-table-yes-color: var(--hui-success);
        --hui-comparison-table-cell-padding: 14px 20px;
        --hui-comparison-table-first-col-width: 40%;
      }
      .brand-ct::part(price) { color: var(--hui-success); }
      .brand-ct::part(group-title) { color: var(--hui-success-7); }
    </style>
    <hui-comparison-table class="brand-ct" sticky="none" feature-label="Quyền lợi" .columns=${COLUMNS.slice(0, 2)} .rows=${ROWS.slice(0, 5)} style="max-width: 720px;"></hui-comparison-table>
  `,
};
