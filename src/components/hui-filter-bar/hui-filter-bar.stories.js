/**
 * Storybook Stories — HUI Filter Bar (thanh lọc tổng hợp)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';
import '../hui-select/index.js';
import '../hui-switch/index.js';
import '../hui-data-view/index.js';

const sh = (el, sel) => el.shadowRoot.querySelector(sel);
const searchInput = (bar) => sh(bar, 'hui-search').shadowRoot.querySelector('input');
const chip = (bar, value) => sh(bar, 'hui-filter-chips').shadowRoot.querySelector(`[data-value="${value}"]`);

const CHIPS = [
  { value: 'ao', label: 'Áo', count: 4 },
  { value: 'quan', label: 'Quần', count: 3 },
  { value: 'giay', label: 'Giày', count: 2 },
];
const BRANDS = [{ value: 'hui', label: 'HUI' }, { value: 'acme', label: 'Acme' }, { value: 'local', label: 'Local' }];
const PRODUCTS = [
  { id: 1, name: 'Áo thun cotton', tag: 'ao', brand: 'hui' },
  { id: 2, name: 'Áo sơ mi trắng', tag: 'ao', brand: 'acme' },
  { id: 3, name: 'Áo khoác gió', tag: 'ao', brand: 'local' },
  { id: 4, name: 'Áo len', tag: 'ao', brand: 'hui' },
  { id: 5, name: 'Quần jean', tag: 'quan', brand: 'acme' },
  { id: 6, name: 'Quần short', tag: 'quan', brand: 'hui' },
  { id: 7, name: 'Quần tây', tag: 'quan', brand: 'local' },
  { id: 8, name: 'Giày thể thao', tag: 'giay', brand: 'hui' },
  { id: 9, name: 'Giày da', tag: 'giay', brand: 'acme' },
];

export default {
  title: 'Organisms/HuiFilterBar',
  component: 'hui-filter-bar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Filter Bar** — thanh lọc tổng hợp: ô tìm (\`hui-search\`) + hàng chip lọc nhanh (\`hui-filter-chips\`) + control
bất kỳ đặt vào slot (\`hui-select\`, \`hui-input\`, \`hui-switch\`, \`<select>\`… — mỗi control cần \`name\`).
Gom mọi giá trị thành \`params\`, phát \`hui-filter-change\` (debounce khi gõ, ngay khi chọn).
\`for="id"\` tự đẩy bộ lọc sang component dữ liệu: **hui-data-view** qua \`updateQuery({ q, filters })\` (lọc client lẫn server,
tự về trang 1); component DataController khác qua \`params\`. Màn hình hẹp → control phụ gom vào drawer "Bộ lọc" kèm số đếm.

\`\`\`html
<hui-filter-bar for="products" search-placeholder="Tìm sản phẩm...">
  <hui-select name="brand" placeholder="Thương hiệu" allow-clear></hui-select>
  <hui-switch name="inStock" label="Còn hàng"></hui-switch>
</hui-filter-bar>
<hui-data-view id="products" …></hui-data-view>
<script>bar.chips = [{ value: 'ao', label: 'Áo', count: 4 }, …]</script>
\`\`\`

### Attributes / Properties
| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| \`for\` | string | — | id component dữ liệu nhận bộ lọc |
| \`params\` | object | \`null\` | Bộ lọc hiện tại; gán để đặt sẵn (vd đọc từ URL) → đổ vào control |
| \`debounce\` | number (ms) | \`300\` | Trễ khi gõ chữ |
| \`search-name\` | string | \`q\` | Key của ô tìm trong params |
| \`search-placeholder\` | string | "Tìm kiếm..." | |
| \`no-search\` | boolean | — | Ẩn ô tìm |
| \`chips\` | \`{value,label,count,icon}[]\` | \`[]\` | Chip lọc nhanh (property) |
| \`chips-name\` | string | \`tag\` | Key của hàng chip |
| \`chips-multiple\` / \`chips-all-label\` | — | — | Chip chọn nhiều / chip "Tất cả" |
| \`collapse-width\` | number (px) | \`640\` | Rộng ≤ giá trị này → gom control vào drawer |
| \`no-reset\` | boolean | — | Ẩn nút "Đặt lại" |
| \`size\` | \`sm \\| md \\| lg\` | \`md\` | Kích thước control nội bộ |

Methods: \`reset()\`, \`apply()\` (chốt ngay, trả params).

### Events
| Event | Detail |
|-------|--------|
| \`hui-filter-change\` | \`{ params, count }\` — count = số bộ lọc đang bật (không tính ô tìm) |
| \`hui-reset\` | — bấm "Đặt lại" |

Sự kiện của ô tìm / chip nội bộ không lọt ra ngoài; sự kiện của control trong slot vẫn nổi bọt như thường.

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Control lọc thêm (cần \`name\`) — màn hình hẹp được chuyển vào drawer |
| \`actions\` | Nút / nội dung bên phải (luôn hiển thị) |

### Parts
\`base\`, \`row\`, \`search\`, \`filters\`, \`toggle\`, \`count\`, \`reset\`, \`chips\`, \`drawer\` · State: \`:state(active)\`, \`:state(narrow)\`

### CSS Variables
\`--hui-filter-bar-gap | search-width | bg | padding | radius | count-bg | count-color\`

### Bàn phím
Theo từng control (hui-search: \`/\` không bật mặc định, Enter tìm ngay; chip: ←/→). Nút "Bộ lọc" mở drawer (Esc đóng, focus trap).
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-filter-bar id="fb-d" search-placeholder="Tìm sản phẩm..." .chips=${CHIPS} chips-all-label="Tất cả">
      <hui-select name="brand" placeholder="Thương hiệu" allow-clear .options=${BRANDS} style="width:160px"></hui-select>
      <hui-switch name="inStock" label="Còn hàng"></hui-switch>
      <hui-button slot="actions" variant="primary" icon="plus">Thêm</hui-button>
    </hui-filter-bar>
  `,
};

/** Gom giá trị: chip + select chốt ngay, gõ chữ chờ debounce; đếm bộ lọc; Đặt lại */
export const CollectParams = {
  render: () => html`
    <hui-filter-bar id="fb-c" debounce="60" .chips=${CHIPS} chips-name="category">
      <hui-select name="brand" placeholder="Thương hiệu" .options=${BRANDS} style="width:160px"></hui-select>
      <label><input type="checkbox" name="sale" /> Giảm giá</label>
    </hui-filter-bar>
  `,
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('#fb-c');
    const log = [];
    bar.addEventListener('hui-filter-change', (e) => log.push(e.detail));
    const leaked = [];
    bar.addEventListener('hui-search', () => leaked.push('hui-search'));
    await waitFor(() => expect(chip(bar, 'quan')).toBeTruthy());

    await userEvent.click(chip(bar, 'quan'));
    expect(log.at(-1).params).toEqual({ category: 'quan' });

    const select = bar.querySelector('hui-select');
    select.value = 'acme';
    select.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { value: 'acme' } }));
    expect(log.at(-1).params).toEqual({ category: 'quan', brand: 'acme' });

    await userEvent.click(bar.querySelector('input[name="sale"]'));
    expect(log.at(-1).params).toEqual({ category: 'quan', brand: 'acme', sale: true });
    expect(log.at(-1).count).toBe(3);
    expect(sh(bar, '[part="count"]').textContent).toBe('3');

    await userEvent.click(searchInput(bar));
    await userEvent.keyboard('jean');
    const before = log.length;
    await waitFor(() => expect(log.length).toBe(before + 1)); // gom thành 1 lần sau debounce
    expect(log.at(-1).params.q).toBe('jean');
    expect(leaked).toEqual([]); // sự kiện nội bộ không lọt ra ngoài

    await userEvent.click(sh(bar, '[part="reset"]'));
    expect(log.at(-1).params).toEqual({});
    expect(select.value).toBe(null);
    expect(bar.querySelector('input[name="sale"]').checked).toBe(false);
    expect(searchInput(bar).value).toBe('');
    await waitFor(() => expect(sh(bar, '[part="reset"]').hidden).toBe(true));
  },
};

/** Gán params từ ngoài (vd đọc URL) → đổ ngược vào control */
export const PresetParams = {
  render: () => html`
    <hui-filter-bar id="fb-p" .chips=${CHIPS} .params=${{ q: 'áo', tag: 'ao', brand: 'hui' }}>
      <hui-select name="brand" placeholder="Thương hiệu" .options=${BRANDS} style="width:160px"></hui-select>
    </hui-filter-bar>
  `,
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('#fb-p');
    await waitFor(() => expect(searchInput(bar).value).toBe('áo'));
    expect(sh(bar, 'hui-filter-chips').value).toBe('ao');
    expect(bar.querySelector('hui-select').value).toBe('hui');
    expect(sh(bar, '[part="count"]').textContent).toBe('2');
  },
};

/** for="id" → hui-data-view lọc theo thanh (client-side, qua updateQuery) */
export const WithDataView = {
  render: () => html`
    <div style="display:grid;gap:12px">
      <hui-filter-bar id="fb-v" for="fb-v-list" debounce="0" .chips=${CHIPS} chips-all-label="Tất cả">
        <hui-select name="brand" placeholder="Thương hiệu" allow-clear .options=${BRANDS} style="width:160px"></hui-select>
      </hui-filter-bar>
      <hui-data-view id="fb-v-list" views="list" title-key="name" description-key="brand" page-size="20" .data=${PRODUCTS}></hui-data-view>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('#fb-v');
    const view = canvasElement.querySelector('#fb-v-list');
    await waitFor(() => expect(chip(bar, 'giay')).toBeTruthy());
    await userEvent.click(chip(bar, 'giay'));
    await waitFor(() => expect(view.query.filters).toEqual({ tag: ['giay'] }));
    await userEvent.click(searchInput(bar));
    await userEvent.keyboard('da');
    await waitFor(() => expect(view.query.q).toBe('da'));
  },
};

/** Đích là component DataController bất kỳ → gán params (giữ params gốc của đích) */
export const ParamsTarget = {
  render: () => html`
    <hui-filter-bar id="fb-t" for="fb-t-target" no-search .chips=${CHIPS}></hui-filter-bar>
    <div id="fb-t-target"></div>
  `,
  play: async ({ canvasElement }) => {
    const target = canvasElement.querySelector('#fb-t-target');
    target.params = { pageSize: 20 };
    const bar = canvasElement.querySelector('#fb-t');
    await waitFor(() => expect(chip(bar, 'ao')).toBeTruthy());
    await userEvent.click(chip(bar, 'ao'));
    expect(target.params).toEqual({ pageSize: 20, tag: 'ao' });
  },
};

/** Màn hình hẹp: control phụ vào drawer, nút "Bộ lọc" có số đếm */
export const Narrow = {
  render: () => html`
    <div style="max-width:360px;border:1px dashed var(--hui-border);padding:8px">
      <hui-filter-bar id="fb-n" .chips=${CHIPS}>
        <hui-select name="brand" placeholder="Thương hiệu" .options=${BRANDS}></hui-select>
        <hui-switch name="inStock" label="Còn hàng"></hui-switch>
      </hui-filter-bar>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('#fb-n');
    const toggle = sh(bar, '[part="toggle"]');
    await waitFor(() => expect(toggle.hidden).toBe(false));
    expect(sh(bar, '[part="filters"]').hidden).toBe(true);
    await userEvent.click(toggle);
    const drawer = sh(bar, 'hui-drawer');
    await waitFor(() => expect(drawer.open).toBe(true));
    // slot control nằm trong drawer
    expect(sh(bar, '.fb__drawer-body slot')).toBeTruthy();
    const sw = bar.querySelector('hui-switch');
    sw.checked = true;
    sw.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { checked: true } }));
    await waitFor(() => expect(sh(bar, '[part="count"]').textContent).toBe('1'));
    drawer.open = false;
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .fb-card {
        --hui-filter-bar-bg: var(--hui-bg-container);
        --hui-filter-bar-padding: 12px;
        --hui-filter-bar-radius: 12px;
        --hui-filter-bar-count-bg: var(--hui-success);
        --hui-filter-bar-search-width: 280px;
      }
      .fb-card::part(search) { --hui-search-radius: 999px; }
      .fb-card::part(chips) { --hui-filter-chips-selected-bg: var(--hui-success-light); --hui-filter-chips-selected-color: var(--hui-success); --hui-filter-chips-selected-border-color: var(--hui-success); }
    </style>
    <hui-filter-bar class="fb-card" .chips=${CHIPS} chips-multiple>
      <hui-select name="brand" placeholder="Thương hiệu" .options=${BRANDS} style="width:160px"></hui-select>
    </hui-filter-bar>
  `,
};
