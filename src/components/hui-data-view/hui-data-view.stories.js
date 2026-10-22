/**
 * Storybook Stories — HUI Data View (Organism)
 * Một nguồn dữ liệu, nhiều cách xem: list | grid | table + tìm (bỏ dấu), chip lọc, sắp xếp, phân trang / xem thêm / cuộn vô hạn,
 * chọn nhiều + thao tác hàng loạt, đồng bộ URL, chế độ server (fetchFn), trạng thái rỗng / lỗi / đang tải.
 */

import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { foldText, processRows } from './data-view-query.js';
import '../hui-button/index.js';
import '../hui-tag/index.js';

// =====================================================
// DỮ LIỆU MẪU (tự sinh, ảnh SVG data URI — không cần mạng)
// =====================================================

const HUES = [250, 200, 160, 30, 340, 280, 100, 10, 190, 50, 300, 130];

const art = (i, label = '', w = 320, h = 240) => {
  const a = HUES[i % HUES.length];
  const b = (a + 40) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a},70%,62%)"/><stop offset="1" stop-color="hsl(${b},75%,45%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="56%" font-family="sans-serif" font-size="44" font-weight="700" fill="white" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const BASES = [
  ['Áo thun basic', 'ao', 189000],
  ['Áo khoác gió', 'ao', 459000],
  ['Áo sơ mi linen', 'ao', 329000],
  ['Quần jean slim', 'quan', 399000],
  ['Quần short kaki', 'quan', 229000],
  ['Quần jogger nỉ', 'quan', 279000],
  ['Giày sneaker trắng', 'giay', 699000],
  ['Giày lười da', 'giay', 899000],
  ['Túi đeo chéo', 'phu-kien', 259000],
  ['Mũ lưỡi trai', 'phu-kien', 149000],
  ['Kính râm', 'phu-kien', 199000],
  ['Đồng hồ dây da', 'phu-kien', 1290000],
];
const COLORS = ['Đen', 'Trắng', 'Xanh'];
const CATEGORY_LABELS = { ao: 'Áo', quan: 'Quần', giay: 'Giày', 'phu-kien': 'Phụ kiện' };
const CATEGORY_COLORS = { ao: 'primary', quan: 'success', giay: 'warning', 'phu-kien': 'info' };
const DAY = 24 * 3600 * 1000;
const NOW = Date.UTC(2026, 9, 19);

/** 36 sản phẩm: 12 mẫu × 3 màu */
const PRODUCTS = BASES.flatMap(([base, category, price], b) => COLORS.map((color, c) => {
  const id = b * 3 + c + 1;
  return {
    id,
    name: `${base} ${color}`,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    price: price + c * 10000,
    stock: (id * 37) % 100,
    inStock: id % 5 !== 0,
    tags: [id % 4 === 0 ? 'new' : null, id % 3 === 0 ? 'sale' : null].filter(Boolean),
    createdAt: new Date(NOW - id * 2.5 * DAY).toISOString(),
    description: `${CATEGORY_LABELS[category]} · màu ${color.toLowerCase()} · mã SP${String(id).padStart(3, '0')}`,
    image: art(id, String(id)),
  };
}));

const FILTERS = [
  { key: 'category', label: 'Danh mục', options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })) },
  { key: 'tags', label: 'Nhãn', multiple: true, options: [{ value: 'new', label: 'Mới' }, { value: 'sale', label: 'Giảm giá' }] },
];

const SORT_OPTIONS = [
  { label: 'Giá tăng dần', key: 'price', order: 'asc' },
  { label: 'Giá giảm dần', key: 'price', order: 'desc' },
  { label: 'Tên A → Z', key: 'name', order: 'asc' },
  { label: 'Mới nhất', key: 'createdAt', order: 'desc' },
];

const COLUMNS = [
  { key: 'name', title: 'Sản phẩm', sortable: true },
  { key: 'category', title: 'Danh mục', type: 'tag', colors: CATEGORY_COLORS, labels: CATEGORY_LABELS },
  { key: 'price', title: 'Giá', type: 'currency', sortable: true, width: 130 },
  { key: 'stock', title: 'Tồn kho', type: 'progress', width: 140 },
  { key: 'inStock', title: 'Còn hàng', type: 'boolean', width: 100 },
  { key: 'createdAt', title: 'Ngày tạo', type: 'date', sortable: true },
  {
    key: 'actions', title: 'Thao tác', type: 'actions',
    actions: [{ key: 'edit', label: 'Sửa', icon: 'edit' }, { key: 'delete', icon: 'delete', danger: true, ariaLabel: 'Xóa' }],
  },
];

/** CSS cho template (item ở light DOM → CSS trang áp dụng trực tiếp) */
const TEMPLATE_CSS = `
  .p-row { display: flex; align-items: center; gap: 14px; padding: 10px 14px; border: 1px solid var(--hui-border-secondary); border-radius: 12px; background: var(--hui-bg-container); font-family: var(--hui-font-family); }
  .p-row img { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; }
  .p-row .p-info { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .p-row h3, .p-card h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--hui-text); }
  .p-meta { font-size: 13px; color: var(--hui-text-secondary); }
  .p-price { font-weight: 600; color: var(--hui-primary); white-space: nowrap; }
  .p-card { display: flex; flex-direction: column; gap: 6px; padding: 10px 10px 14px; border: 1px solid var(--hui-border-secondary); border-radius: 14px; background: var(--hui-bg-container); font-family: var(--hui-font-family); transition: box-shadow .2s, transform .2s; }
  .p-card:hover { box-shadow: var(--hui-shadow-md); transform: translateY(-2px); }
  .p-card img { width: 100%; aspect-ratio: 4 / 3; border-radius: 10px; object-fit: cover; }
  .p-card .p-foot { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
`;

const TEMPLATES = `
  <template view="list">
    <div class="p-row">
      <img data-bind-attr="src:image, alt:name" loading="lazy">
      <div class="p-info">
        <h3 data-bind="name"></h3>
        <span class="p-meta" data-bind="description"></span>
      </div>
      <span class="p-price" data-bind="price" data-format="currency"></span>
      <hui-button size="sm" variant="outline" data-action="buy">Mua</hui-button>
    </div>
  </template>
  <template view="grid">
    <article class="p-card">
      <img data-bind-attr="src:image, alt:name" loading="lazy">
      <h3 data-bind="name"></h3>
      <span class="p-meta" data-bind="categoryLabel"></span>
      <div class="p-foot">
        <span class="p-price" data-bind="price" data-format="currency"></span>
        <hui-button size="sm" data-action="buy">Mua</hui-button>
      </div>
    </article>
  </template>`;

/** Tạo <hui-data-view> bằng DOM (template con + property mảng / hàm) */
function makeView(attrs = {}, inner = TEMPLATES, props = {}) {
  const el = document.createElement('hui-data-view');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) el.setAttribute(k, '');
    else if (v !== false && v !== null && v !== undefined && v !== '') el.setAttribute(k, String(v));
  }
  el.innerHTML = inner;
  Object.assign(el, props);
  return el;
}

function stage(...children) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'font-family: var(--hui-font-family); color: var(--hui-text);';
  const style = document.createElement('style');
  style.textContent = TEMPLATE_CSS;
  wrap.append(style, ...children);
  return wrap;
}

/** "Giả lập server": lọc / sắp xếp / cắt trang như API thật, trễ `latency` ms */
function fakeServer(log, latency = 250) {
  return async (params, { signal }) => {
    log.push({ ...params });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, latency);
      signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
    });
    const filters = {};
    for (const f of FILTERS) if (params[f.key]) filters[f.key] = [].concat(params[f.key]);
    const rows = processRows(PRODUCTS, { q: params.q || '', fields: ['name'], filters, sort: params.sort, order: params.order });
    const page = params.page || 1;
    const size = params.pageSize || 12;
    return { data: rows.slice((page - 1) * size, page * size), total: rows.length };
  };
}

// =====================================================
// TIỆN ÍCH CHO PLAY
// =====================================================

const dvOf = (canvas, sel = 'hui-data-view') => canvas.querySelector(sel);
const partOf = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const itemsOf = (el, view) => [...el.querySelectorAll(`[slot="view-${view}"] > .hui-dv-item`)];
const viewBtn = (el, view) => el.shadowRoot.querySelector(`[part~="views"] button[data-view="${view}"]`);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
async function settle(el) {
  await el.updateComplete;
  await nextFrame();
  await el.updateComplete;
}
const countText = (n) => `${n} kết quả`;
const innerInput = (dv) => partOf(dv, 'search').querySelector('hui-input').shadowRoot.querySelector('input');
const checkboxInput = (cb) => cb.shadowRoot.querySelector('input');
/** Thẻ con data-view tải động khi dùng tới (search / sort-options / filters / selectable / phân trang) */
const defined = (...tags) => Promise.all(tags.map((t) => customElements.whenDefined(t)));

// =====================================================
// META + DOCS
// =====================================================

export default {
  title: 'Organisms/HuiDataView',
  component: 'hui-data-view',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Data View** — organism trung tâm cho **trang danh sách**: MỘT nguồn dữ liệu, NHIỀU cách xem (**list | grid | table**).
Thanh công cụ có ô tìm (**bỏ dấu tiếng Việt**: gõ "ao" ra "Áo"), chip lọc, sắp xếp, chuyển chế độ xem (nhớ lựa chọn), đếm kết quả;
phân trang | "Xem thêm" | cuộn vô hạn; chọn nhiều + thanh thao tác hàng loạt; đồng bộ trạng thái lên **URL** (F5 / chia sẻ link giữ nguyên);
skeleton đúng hình dạng từng chế độ; item hiện so le (stagger), **chuyển list ↔ grid mượt bằng FLIP**.

**Hai chế độ dữ liệu** (qua DataController):
- **CLIENT** — gán \`data\` (mảng): tìm / lọc / sắp xếp / cắt trang trong bộ nhớ.
- **SERVER** — \`src\` hoặc \`fetchFn\` (hoặc attribute \`server\`): component ghi \`{ q, sort, order, page, pageSize, …lọc }\` vào \`params\`
  → DataController tải lại; tổng số lấy từ \`{ data, total }\` (fetchFn) hoặc \`total-path\` (src). \`client-side\` = tải 1 lần rồi xử lý ở client.

Item list / grid render từ \`<template view="list">\` / \`<template view="grid">\` vào **light DOM** → CSS trang áp dụng trực tiếp.
Không có template → list là dòng tiêu đề / mô tả, grid là thẻ (đọc \`title|name|label\`, \`description\`, \`image\`). Chế độ table dùng \`columns\`.

### Cách sử dụng
\`\`\`html
<hui-data-view id="products" search search-fields="name,sku" view="grid" page-size="12" row-key="id" sync-url persist-view>
  <template view="grid">
    <article class="card">
      <img data-bind-attr="src:image, alt:name">
      <h3 data-bind="name"></h3>
      <span data-bind="price" data-format="currency"></span>
      <hui-button data-action="buy">Mua</hui-button>
    </article>
  </template>
  <template view="list">…</template>
  <hui-button slot="toolbar-end" icon="plus">Thêm</hui-button>
  <hui-button slot="bulk-actions" variant="danger">Xóa</hui-button>
</hui-data-view>
<script>
  products.data = [...];
  products.filters = [{ key: 'category', label: 'Danh mục', options: [{ label: 'Áo', value: 'ao' }], multiple: false }];
  products.sortOptions = [{ label: 'Giá tăng dần', key: 'price', order: 'asc' }];
  products.columns = [
    { key: 'name', title: 'Sản phẩm', sortable: true },
    { key: 'price', title: 'Giá', type: 'currency', sortable: true },
    { key: 'actions', type: 'actions', actions: [{ key: 'edit', label: 'Sửa', icon: 'edit' }, { key: 'delete', icon: 'delete', danger: true }] },
  ];
  products.addEventListener('hui-action', (e) => console.log(e.detail.action, e.detail.item));
  products.addEventListener('hui-change', (e) => console.log(e.detail.state));

  // SERVER: API tự lọc / cắt trang
  products.fetchFn = async (params, { signal }) => {
    const res = await fetch('/api/products?' + new URLSearchParams(params), { signal });
    return res.json(); // { data: [...], total: 120 }
  };
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`view\` | string | \`list\` | \`list\` \\| \`grid\` \\| \`table\` (reflect) |
| \`views\` | string | \`list,grid,table\` | Các nút chuyển chế độ xem (1 chế độ = ẩn nhóm nút) |
| \`row-key\` | string | — | Trường làm key (mặc định \`id\` → \`key\` → vị trí) |
| \`search\` | boolean | \`false\` | Hiện ô tìm kiếm |
| \`search-placeholder\` | string | locale | Chữ gợi ý ô tìm |
| \`search-fields\` | string | mọi trường chuỗi | Trường được tìm, phân tách dấu phẩy (hỗ trợ \`a.b\`) |
| \`search-debounce\` | number | \`300\` | Trễ áp dụng từ khóa (ms); Enter áp dụng ngay |
| \`paging\` | string | \`pagination\` | \`pagination\` \\| \`load-more\` \\| \`infinite\` \\| \`none\` |
| \`page-size\` | number | \`12\` | Số item mỗi trang / mỗi lần tải thêm |
| \`selectable\` | boolean | \`false\` | Checkbox mỗi item; bảng có ô chọn tất cả (trang hiện tại) |
| \`sync-url\` | string | — | Có mặt = bật đồng bộ URL; giá trị = tiền tố key (\`sync-url="p"\` → \`p_view\`, \`p_q\`, \`p_f_category\`) |
| \`sync-url-mode\` | string | \`replace\` | \`replace\` (không thêm lịch sử) \\| \`push\` (mỗi thay đổi = 1 bước Back) |
| \`persist-view\` | boolean | \`false\` | Nhớ chế độ xem trong localStorage \`hui-data-view:<persist-key \\| id>\` |
| \`persist-key\` | string | id | Tên khóa nhớ |
| \`server\` | boolean | tự động | Ép SERVER mode (tự bật khi có \`src\` / \`fetchFn\`) |
| \`client-side\` | boolean | \`false\` | Ép CLIENT mode dù dùng \`src\` / \`fetchFn\` |
| \`striped\` | boolean | \`false\` | Bảng kẻ sọc |
| \`title-key\` / \`description-key\` / \`image-key\` | string | tự dò | Trường của item dự phòng (không template) |
| \`label\` | string | locale | \`aria-label\` của danh sách / bảng |
| \`no-animation\` | boolean | \`false\` | Tắt stagger / FLIP (luôn tắt khi hệ điều hành bật giảm chuyển động) |
| \`src\` / \`data-path\` / \`total-path\` / \`params\` / \`debounce\` / \`loading\` / \`empty-text\` | | | DataController |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`data\` | Array | Dữ liệu (CLIENT) |
| \`fetchFn\` | Function | \`async (params, { signal }) => Array \\| { data, total }\` |
| \`columns\` | Array | \`[{ key, title, type, sortable, width, align, format, render, actions, colors, labels, srcKey, compare }]\` |
| \`filters\` | Array | \`[{ key, label, options: [{ label, value }], multiple, field?, match?(item, values) }]\` |
| \`sortOptions\` | Array | \`[{ label, key, order, compare?(a, b) }]\` |
| \`selectedKeys\` | Array | Key đang chọn |
| \`query\` | object | **Chỉ đọc** — \`{ view, q, sort, order, page, pageSize, filters }\` |
| \`selectedItems\` / \`visibleItems\` | Array | **Chỉ đọc** — item đang chọn / đang hiển thị |
| \`resultCount\` | number | **Chỉ đọc** — tổng kết quả (sau lọc / \`total\` của server) |

Kiểu cột (\`type\`): \`text\` · \`number\` (\`format\`: số chữ số / tùy chọn Intl) · \`currency\` (\`format\`: mã tiền, mặc định VND) · \`percent\` ·
\`date\` / \`datetime\` (\`format\`: short | medium | long) · \`relative\` · \`tag\` (\`colors\` / \`labels\` theo giá trị, nhận mảng) ·
\`avatar\` (chuỗi tên / URL hoặc \`{ name, src }\`, \`srcKey\`) · \`progress\` · \`boolean\` · \`actions\` (\`actions: [{ key, label, icon, danger }]\`).
\`format\` là hàm \`(value, item) => string\` hoặc \`render(value, item, index) => Node | string\` để tự vẽ ô.

### Methods
| Method | Mô tả |
|--------|-------|
| \`updateQuery(partial)\` | Đổi một phần trạng thái (\`{ view, q, sort, order, page, pageSize, filters }\`); đổi q / lọc / sắp xếp → về trang 1 |
| \`refresh()\` | SERVER: tải lại · CLIENT: xử lý lại dữ liệu |
| \`loadMore()\` | Tải trang kế (load-more / infinite) |
| \`clearFilters()\` | Bỏ mọi bộ lọc + từ khóa |
| \`clearSelection()\` | Bỏ chọn tất cả |
| \`reload()\` | (DataController) tải lại \`src\` / \`fetchFn\` |

> Không dùng tên \`setState\` — HuiElement đã có \`setState(name, on)\` cho \`:state()\`.

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-change\` | \`{ state }\` | Trạng thái đổi (chế độ xem, từ khóa, lọc, sắp xếp, trang) — kể cả khi Back / Forward |
| \`hui-action\` | \`{ action, item, index, originalEvent }\` | Bấm \`data-action\` trong template / nút cột \`actions\` |
| \`hui-selection-change\` | \`{ keys, items }\` | Người dùng chọn / bỏ chọn, \`clearSelection()\` |
| \`hui-load\` / \`hui-error\` | \`{ data, total }\` / \`{ error }\` | Tải xong / lỗi |

### Slots
| Slot | Mô tả |
|------|-------|
| \`toolbar-start\` / \`toolbar-end\` | Đầu / cuối thanh công cụ (nút "Thêm", xuất file…) |
| \`bulk-actions\` | Nút thao tác hàng loạt (hiện trong thanh "Đã chọn N") |
| \`<template view="list \\| grid">\` | Khuôn item (không có \`view\` = dùng chung list & grid) |

### Đồng bộ URL
\`?view=grid&q=ao&sort=price&order=desc&page=2&f_category=ao,quan\` — chỉ ghi giá trị khác mặc định, giữ nguyên tham số khác của trang;
đọc lại khi tải trang và khi Back / Forward (\`popstate\`). \`load-more\` / \`infinite\` không ghi \`page\`. Hai data-view cùng trang: \`sync-url="a"\` và \`sync-url="b"\`.

### Bàn phím & ARIA
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Ô tìm → chip lọc → sắp xếp → nút chế độ xem → item / tiêu đề cột → phân trang |
| \`Enter\` (ô tìm) | Áp dụng ngay (bỏ qua debounce) |
| \`Space\` / \`Enter\` | Bật / tắt chip lọc, checkbox; bấm nút chế độ xem / tiêu đề cột (đổi sắp xếp) |

Ô tìm nằm trong \`role="search"\`; nút chế độ xem \`aria-pressed\` trong \`role="group"\`; nhóm chip \`role="group"\` (\`aria-labelledby\` = nhãn nhóm);
đếm kết quả \`role="status"\` + \`aria-live="polite"\`; list / grid \`role="list"\` + \`role="listitem"\`; bảng là \`<table>\` thật,
tiêu đề sắp xếp được có \`aria-sort\`; vùng nội dung \`aria-busy\` khi đang tải.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-data-view-gap\` / \`-toolbar-gap\` / \`-search-width\` | Khoảng cách khối / control, bề rộng ô tìm |
| \`--hui-data-view-list-gap\` / \`-grid-min\` / \`-grid-gap\` | Bố cục list / grid |
| \`--hui-data-view-item-bg\` / \`-item-radius\` / \`-item-border-color\` / \`-item-hover-shadow\` | Item dự phòng |
| \`--hui-data-view-selected-color\` | Viền item được chọn |
| \`--hui-data-view-view-active-bg\` / \`-view-active-color\` | Nút chế độ xem đang chọn |
| \`--hui-data-view-count-color\` / \`-bulk-bg\` / \`-bulk-color\` | Dòng đếm / thanh hàng loạt |
| \`--hui-data-view-table-max-height\` | Đặt giá trị → bảng cuộn bên trong, tiêu đề dính |
| \`--hui-data-view-table-header-bg\` / \`-table-border-color\` / \`-table-row-hover-bg\` / \`-table-stripe-bg\` / \`-table-cell-padding\` | Bảng |
| \`--hui-data-view-skeleton-color\` | Skeleton |

**Parts:** \`base\`, \`toolbar\`, \`search\`, \`sort\`, \`views\`, \`view-button\` (+\`view-button-active\`), \`filters\`, \`filter-group\`, \`filter-label\`,
\`clear-filters\`, \`count\`, \`bulk-bar\`, \`bulk-count\`, \`bulk-clear\`, \`body\`, \`state\`, \`skeleton\`, \`list\`, \`grid\`, \`table-wrap\`, \`table\`,
\`th\`, \`sort-button\`, \`row\` (+\`row-selected\`), \`cell\`, \`action\` (+\`action-danger\`), \`footer\`, \`pagination\`, \`load-more\`, \`sentinel\`.
Item ở light DOM: \`hui-data-view .hui-dv-item\`, \`[data-selected]\`, \`.hui-dv-item__check\`, \`.hui-dv-fallback\`.
**Custom state:** \`:state(loading | empty | error | ready)\`.
        `,
      },
    },
  },
  argTypes: {
    view: { control: 'select', options: ['list', 'grid', 'table'], table: { defaultValue: { summary: 'list' } } },
    paging: { control: 'select', options: ['pagination', 'load-more', 'infinite', 'none'], table: { defaultValue: { summary: 'pagination' } } },
    pageSize: { control: { type: 'number', min: 1 }, table: { defaultValue: { summary: 12 } } },
    selectable: { control: 'boolean' },
    striped: { control: 'boolean' },
    noAnimation: { control: 'boolean' },
  },
};

// =====================================================
// STORIES
// =====================================================

/** Sản phẩm: list / grid / table + tìm (bỏ dấu) + chip lọc + sắp xếp + phân trang */
export const Products = {
  args: { view: 'list', paging: 'pagination', pageSize: 12, selectable: false, striped: false, noAnimation: false },
  render: (args) => {
    const dv = makeView({
      id: 'dv-products', search: true, 'search-fields': 'name', 'row-key': 'id', label: 'Sản phẩm',
      view: args.view, paging: args.paging, 'page-size': args.pageSize, selectable: args.selectable, striped: args.striped, 'no-animation': args.noAnimation,
    }, TEMPLATES, { data: PRODUCTS, filters: FILTERS, sortOptions: SORT_OPTIONS, columns: COLUMNS });
    const log = document.createElement('p');
    log.className = 'dv-log';
    log.style.cssText = 'margin: 12px 0 0; font: 13px var(--hui-font-mono); color: var(--hui-text-secondary);';
    log.textContent = 'Bấm "Mua" / "Sửa" để xem hui-action';
    dv.addEventListener('hui-action', (e) => { log.textContent = `hui-action: ${e.detail.action} → ${e.detail.item.name}`; });
    return stage(dv, log);
  },
  play: async ({ canvasElement }) => {
    const dv = dvOf(canvasElement);
    await settle(dv);
    await defined('hui-input', 'hui-select', 'hui-tag', 'hui-pagination');

    // --- Mặc định: list, 12 item / trang, đếm 36 kết quả ---
    await expect(viewBtn(dv, 'list').getAttribute('aria-pressed')).toBe('true');
    await expect(partOf(dv, 'list').hidden).toBe(false);
    await expect(itemsOf(dv, 'list').length).toBe(12);
    await expect(partOf(dv, 'count').textContent).toBe(countText(36));
    await expect(dv.querySelector('[slot="view-list"]').getAttribute('role')).toBe('list');
    await expect(itemsOf(dv, 'list')[0].getAttribute('role')).toBe('listitem');

    // --- Chuyển sang grid: đổi khung chứa + aria-pressed ---
    const changes = [];
    dv.addEventListener('hui-change', (e) => changes.push(e.detail.state));
    viewBtn(dv, 'grid').click();
    await settle(dv);
    await expect(dv.view).toBe('grid');
    await expect(dv.getAttribute('view')).toBe('grid');
    await expect(viewBtn(dv, 'grid').getAttribute('aria-pressed')).toBe('true');
    await expect(viewBtn(dv, 'list').getAttribute('aria-pressed')).toBe('false');
    await expect(partOf(dv, 'grid').hidden).toBe(false);
    await expect(partOf(dv, 'list').hidden).toBe(true);
    await expect(itemsOf(dv, 'grid').length).toBe(12);
    await expect(itemsOf(dv, 'list').length).toBe(0);
    await expect(itemsOf(dv, 'grid')[0].querySelector('.p-card')).toBeTruthy();
    await expect(changes.at(-1)?.view).toBe('grid');

    // --- hui-action từ template ---
    let action = null;
    dv.addEventListener('hui-action', (e) => { action = e.detail; }, { once: true });
    itemsOf(dv, 'grid')[1].querySelector('[data-action="buy"]').click();
    await expect(action?.action).toBe('buy');
    await expect(action?.item.id).toBe(PRODUCTS[1].id);

    // --- Tìm "ao" khớp "Áo" (bỏ dấu) + đếm cập nhật ---
    const expected = PRODUCTS.filter((p) => foldText(p.name).includes('ao'));
    await expect(expected.length).toBeGreaterThan(0);
    await userEvent.type(innerInput(dv), 'ao');
    await waitFor(() => expect(partOf(dv, 'count').textContent).toBe(countText(expected.length)), { timeout: 3000 });
    await settle(dv);
    const names = itemsOf(dv, 'grid').map((n) => n.querySelector('h3').textContent);
    await expect(names.length).toBe(Math.min(12, expected.length));
    await expect(names.every((n) => n.startsWith('Áo'))).toBe(true);
    await expect(dv.query.q).toBe('ao');

    // --- Chip lọc thu hẹp kết quả ---
    dv.clearFilters();
    await settle(dv);
    await expect(partOf(dv, 'count').textContent).toBe(countText(36));
    const chip = partOf(dv, 'filters').querySelector('hui-tag[data-filter="category"][data-value="quan"]');
    chip.click();
    await settle(dv);
    const quan = PRODUCTS.filter((p) => p.category === 'quan');
    await expect(partOf(dv, 'count').textContent).toBe(countText(quan.length));
    await expect(chip.checked).toBe(true);
    await expect(dv.query.filters).toEqual({ category: ['quan'] });
    await expect(partOf(dv, 'clear-filters').hidden).toBe(false);
    // Chọn 1 (multiple: false) → bấm chip khác thay thế
    partOf(dv, 'filters').querySelector('hui-tag[data-value="giay"]').click();
    await settle(dv);
    await expect(dv.query.filters).toEqual({ category: ['giay'] });
    await expect(chip.checked).toBe(false);
    dv.clearFilters();
    await settle(dv);

    // --- Sắp xếp (hui-select phát change) ---
    partOf(dv, 'sort').dispatchEvent(new CustomEvent('change', { detail: { value: 'price:desc' } }));
    await settle(dv);
    const prices = itemsOf(dv, 'grid').map((n) => PRODUCTS.find((p) => String(p.id) === n.dataset.key).price);
    await expect(prices).toEqual([...prices].sort((a, b) => b - a));
    await expect(prices[0]).toBe(Math.max(...PRODUCTS.map((p) => p.price)));
    await expect(dv.query).toMatchObject({ sort: 'price', order: 'desc' });
    dv.updateQuery({ sort: null });
    await settle(dv);

    // --- Phân trang: trang 2 = item 13–24 ---
    const pager = partOf(dv, 'pagination');
    await expect(pager.hidden).toBe(false);
    pager.shadowRoot.querySelector('[data-id="page-2"]').click();
    await settle(dv);
    await expect(dv.query.page).toBe(2);
    const keys = itemsOf(dv, 'grid').map((n) => n.dataset.key);
    await expect(keys).toEqual(PRODUCTS.slice(12, 24).map((p) => String(p.id)));

    // --- Bảng: tiêu đề sắp xếp đổi aria-sort (tăng → giảm → bỏ) ---
    viewBtn(dv, 'table').click();
    await settle(dv);
    await expect(partOf(dv, 'table-wrap').hidden).toBe(false);
    const priceTh = [...dv.shadowRoot.querySelectorAll('th')].find((th) => th.textContent.includes('Giá'));
    await expect(priceTh.getAttribute('aria-sort')).toBe('none');
    priceTh.querySelector('button').click();
    await settle(dv);
    await expect(priceTh.getAttribute('aria-sort')).toBe('ascending');
    const rowPrice = () => [...dv.shadowRoot.querySelectorAll('tbody tr')].map((tr) => PRODUCTS.find((p) => String(p.id) === tr.dataset.key).price);
    await expect(rowPrice()[0]).toBe(Math.min(...PRODUCTS.map((p) => p.price)));
    await expect(dv.query.page).toBe(1); // đổi sắp xếp → về trang 1
    priceTh.querySelector('button').click();
    await settle(dv);
    await expect(priceTh.getAttribute('aria-sort')).toBe('descending');
    await expect(rowPrice()[0]).toBe(Math.max(...PRODUCTS.map((p) => p.price)));
    priceTh.querySelector('button').click();
    await settle(dv);
    await expect(priceTh.getAttribute('aria-sort')).toBe('none');
    await expect(dv.query.sort).toBe(null);

    // --- Nút cột actions → hui-action ---
    action = null;
    dv.addEventListener('hui-action', (e) => { action = e.detail; }, { once: true });
    dv.shadowRoot.querySelector('tbody tr [data-action="delete"]').click();
    await expect(action?.action).toBe('delete');
    await expect(action?.item.id).toBe(PRODUCTS[0].id);
  },
};

/** Không có template: list = dòng tiêu đề / mô tả / ảnh, grid = thẻ; chuyển list ↔ grid bằng FLIP */
export const Fallback = {
  render: () => stage(makeView({ view: 'grid', 'page-size': 8, views: 'list,grid', label: 'Sản phẩm' }, '', { data: PRODUCTS })),
  play: async ({ canvasElement }) => {
    const dv = dvOf(canvasElement);
    await settle(dv);
    const cards = itemsOf(dv, 'grid');
    await expect(cards.length).toBe(8);
    await expect(cards[0].querySelector('.hui-dv-fallback__title').textContent).toBe(PRODUCTS[0].name);
    await expect(cards[0].querySelector('.hui-dv-fallback__desc').textContent).toBe(PRODUCTS[0].description);
    await expect(dv.shadowRoot.querySelector('[part~="views"]').children.length).toBe(2);
    viewBtn(dv, 'list').click();
    await settle(dv);
    await expect(itemsOf(dv, 'list').length).toBe(8);
    await expect(itemsOf(dv, 'list')[0].querySelector('.hui-dv-fallback--list')).toBeTruthy();
  },
};

/** SERVER: fetchFn nhận { q, sort, order, page, pageSize, …lọc } (trễ 250ms), trả { data, total } */
export const ServerMode = {
  render: () => {
    const log = [];
    const dv = makeView({ search: true, 'search-debounce': 200, 'row-key': 'id', view: 'table', 'page-size': 8, label: 'Sản phẩm (server)' }, TEMPLATES, {
      filters: FILTERS, sortOptions: SORT_OPTIONS, columns: COLUMNS, fetchFn: fakeServer(log),
    });
    dv._log = log;
    const out = document.createElement('pre');
    out.style.cssText = 'margin: 12px 0 0; padding: 8px 12px; border-radius: 8px; background: var(--hui-fill-tertiary); font: 12px var(--hui-font-mono); white-space: pre-wrap;';
    out.textContent = 'params: (đang tải...)';
    dv.addEventListener('hui-load', () => { out.textContent = `params: ${JSON.stringify(log.at(-1))}\ntotal: ${dv.dataTotal}`; });
    return stage(dv, out);
  },
  play: async ({ canvasElement }) => {
    const dv = dvOf(canvasElement);
    const log = dv._log;
    await waitFor(() => expect(dv.dataState).toBe('ready'), { timeout: 3000 });
    await settle(dv);
    await defined('hui-pagination');
    await expect(log[0]).toMatchObject({ page: 1, pageSize: 8 });
    await expect(partOf(dv, 'count').textContent).toBe(countText(36));
    await expect(dv.shadowRoot.querySelectorAll('tbody tr').length).toBe(8);

    // Trang 2 → params.page = 2, dữ liệu do server cắt sẵn
    partOf(dv, 'pagination').shadowRoot.querySelector('[data-id="page-2"]').click();
    await waitFor(() => expect(log.at(-1)).toMatchObject({ page: 2, pageSize: 8 }));
    await waitFor(() => expect(dv.shadowRoot.querySelector('tbody tr')?.dataset.key).toBe(String(PRODUCTS[8].id)), { timeout: 3000 });

    // Từ khóa + lọc + sắp xếp → về trang 1, gửi đủ params
    dv.updateQuery({ q: 'ao', filters: { tags: ['sale'] }, sort: 'price', order: 'desc' });
    await waitFor(() => expect(log.at(-1)).toMatchObject({ q: 'ao', tags: ['sale'], sort: 'price', order: 'desc', page: 1, pageSize: 8 }));
    const expected = processRows(PRODUCTS, { q: 'ao', fields: ['name'], filters: { tags: ['sale'] } });
    await waitFor(() => expect(partOf(dv, 'count').textContent).toBe(countText(expected.length)), { timeout: 3000 });
    await expect(dv.resultCount).toBe(expected.length);
  },
};

/** Cuộn vô hạn: tới cuối danh sách → tự tải thêm (`paging="infinite"`) */
export const InfiniteScroll = {
  render: () => stage(
    makeView({ view: 'list', paging: 'infinite', 'page-size': 6, views: 'list,grid', 'row-key': 'id', label: 'Cuộn vô hạn' }, TEMPLATES, { data: PRODUCTS }),
  ),
  play: async ({ canvasElement }) => {
    const dv = dvOf(canvasElement);
    await settle(dv);
    const first = itemsOf(dv, 'list').length;
    await expect(first).toBeGreaterThanOrEqual(6);
    await expect(first % 6 === 0 || first === PRODUCTS.length).toBe(true);
    // Cuộn tới mốc nhiều lần cho tới khi hết dữ liệu
    for (let i = 0; i < 12 && itemsOf(dv, 'list').length < PRODUCTS.length; i++) {
      const before = itemsOf(dv, 'list').length;
      partOf(dv, 'sentinel').scrollIntoView({ block: 'end' });
      await waitFor(() => expect(itemsOf(dv, 'list').length).toBeGreaterThan(before), { timeout: 2000 });
    }
    await expect(itemsOf(dv, 'list').length).toBe(PRODUCTS.length);
    await waitFor(() => expect(partOf(dv, 'sentinel').hidden).toBe(true));
    window.scrollTo(0, 0);
  },
};

/** "Xem thêm" (load-more) với server: mỗi lần bấm nối thêm 1 trang */
export const LoadMore = {
  render: () => {
    const log = [];
    const dv = makeView({ view: 'grid', paging: 'load-more', 'page-size': 8, views: 'grid,list', 'row-key': 'id' }, TEMPLATES, { fetchFn: fakeServer(log, 150) });
    dv._log = log;
    return stage(dv);
  },
  play: async ({ canvasElement }) => {
    const dv = dvOf(canvasElement);
    await waitFor(() => expect(itemsOf(dv, 'grid').length).toBe(8), { timeout: 3000 });
    const more = partOf(dv, 'load-more');
    await expect(more.hidden).toBe(false);
    more.click();
    await waitFor(() => expect(itemsOf(dv, 'grid').length).toBe(16), { timeout: 3000 });
    await expect(dv._log.at(-1)).toMatchObject({ page: 2, pageSize: 8 });
    // Item trang 1 vẫn giữ nguyên, trang 2 nối phía sau
    await expect(itemsOf(dv, 'grid').map((n) => n.dataset.key)).toEqual(PRODUCTS.slice(0, 16).map((p) => String(p.id)));
  },
};

/** Chọn nhiều + thanh thao tác hàng loạt (slot bulk-actions), chọn tất cả ở tiêu đề bảng (indeterminate) */
export const Selectable = {
  render: () => {
    const dv = makeView({ selectable: true, view: 'table', 'page-size': 6, 'row-key': 'id', label: 'Đơn hàng', striped: true }, `
      ${TEMPLATES}
      <hui-button slot="bulk-actions" size="sm" variant="outline" icon="download">Xuất file</hui-button>
      <hui-button slot="bulk-actions" size="sm" variant="danger" icon="delete">Xóa</hui-button>
    `, { data: PRODUCTS, columns: COLUMNS.filter((c) => c.key !== 'actions') });
    const out = document.createElement('p');
    out.style.cssText = 'margin: 12px 0 0; font: 13px var(--hui-font-mono); color: var(--hui-text-secondary);';
    out.textContent = 'hui-selection-change: —';
    dv.addEventListener('hui-selection-change', (e) => { out.textContent = `hui-selection-change: [${e.detail.keys.join(', ')}]`; });
    return stage(dv, out);
  },
  play: async ({ canvasElement }) => {
    const dv = dvOf(canvasElement);
    await settle(dv);
    await defined('hui-checkbox');
    const events = [];
    dv.addEventListener('hui-selection-change', (e) => events.push(e.detail));
    const headCb = dv.shadowRoot.querySelector('thead hui-checkbox');
    await expect(partOf(dv, 'bulk-bar').hidden).toBe(true);

    // Chọn tất cả (trang hiện tại)
    checkboxInput(headCb).click();
    await settle(dv);
    await expect(events.at(-1).keys).toEqual(PRODUCTS.slice(0, 6).map((p) => p.id));
    await expect(events.at(-1).items.map((i) => i.name)).toEqual(PRODUCTS.slice(0, 6).map((p) => p.name));
    await expect(partOf(dv, 'bulk-bar').hidden).toBe(false);
    await expect(partOf(dv, 'bulk-count').textContent).toBe('Đã chọn 6');
    await expect(dv.shadowRoot.querySelectorAll('tbody tr[data-selected]').length).toBe(6);

    // Bỏ 1 dòng → tiêu đề indeterminate
    checkboxInput(dv.shadowRoot.querySelector('tbody tr hui-checkbox')).click();
    await settle(dv);
    await expect(dv.selectedKeys.length).toBe(5);
    await expect(headCb.indeterminate).toBe(true);
    await expect(headCb.checked).toBe(false);

    // Chế độ grid: checkbox phủ trên item, lựa chọn giữ nguyên
    dv.updateQuery({ view: 'grid' });
    await settle(dv);
    const cards = itemsOf(dv, 'grid');
    await expect(cards[1].hasAttribute('data-selected')).toBe(true);
    await expect(cards[0].hasAttribute('data-selected')).toBe(false);
    checkboxInput(cards[0].querySelector('.hui-dv-item__check')).click();
    await settle(dv);
    await expect(dv.selectedKeys.length).toBe(6);

    // Bỏ chọn tất cả
    partOf(dv, 'bulk-clear').click();
    await settle(dv);
    await expect(events.at(-1).keys).toEqual([]);
    await expect(partOf(dv, 'bulk-bar').hidden).toBe(true);
  },
};

/** Đồng bộ URL: trạng thái ghi lên ?view=…&q=…&f_…; Back / Forward (popstate) khôi phục */
export const UrlSync = {
  render: () => {
    const dv = makeView({ 'sync-url': true, search: true, 'search-debounce': 150, 'search-fields': 'name', 'row-key': 'id', 'page-size': 8 }, TEMPLATES, {
      data: PRODUCTS, filters: FILTERS, sortOptions: SORT_OPTIONS, columns: COLUMNS,
    });
    const out = document.createElement('code');
    out.className = 'dv-url';
    out.style.cssText = 'display: block; margin-bottom: 12px; padding: 8px 12px; border-radius: 8px; background: var(--hui-fill-tertiary); font: 12px var(--hui-font-mono); word-break: break-all;';
    const show = () => { out.textContent = `location.search = ${decodeURIComponent(location.search) || '(trống)'}`; };
    show();
    dv.addEventListener('hui-change', () => queueMicrotask(show));
    window.addEventListener('popstate', () => queueMicrotask(show));
    return stage(out, dv);
  },
  play: async ({ canvasElement }) => {
    const original = `${location.pathname}${location.search}${location.hash}`;
    const dv = dvOf(canvasElement);
    await settle(dv);
    await defined('hui-input');
    try {
      viewBtn(dv, 'grid').click();
      await settle(dv);
      await userEvent.type(innerInput(dv), 'ao');
      await waitFor(() => expect(new URLSearchParams(location.search).get('q')).toBe('ao'), { timeout: 3000 });
      let sp = new URLSearchParams(location.search);
      await expect(sp.get('view')).toBe('grid');
      // Tham số sẵn có của trang (Storybook: id, viewMode…) vẫn còn
      await expect(new URLSearchParams(original.split('?')[1] || '').get('id') ?? null).toBe(sp.get('id'));

      dv.updateQuery({ filters: { category: ['ao', 'quan'] } });
      await settle(dv);
      sp = new URLSearchParams(location.search);
      await expect(sp.get('f_category')).toBe('ao,quan');

      // Back / Forward: URL khác → popstate → trạng thái khôi phục theo URL
      const url = new URL(location.href);
      url.searchParams.set('view', 'table');
      url.searchParams.set('q', 'quần');
      url.searchParams.delete('f_category');
      history.replaceState(null, '', url);
      const changes = [];
      dv.addEventListener('hui-change', (e) => changes.push(e.detail.state));
      window.dispatchEvent(new PopStateEvent('popstate'));
      await settle(dv);
      await expect(dv.view).toBe('table');
      await expect(dv.query.q).toBe('quần');
      await expect(dv.query.filters).toEqual({});
      await expect(innerInput(dv).value).toBe('quần');
      await expect(changes.length).toBe(1);
      const quan = PRODUCTS.filter((p) => foldText(p.name).includes('quan'));
      await expect(partOf(dv, 'count').textContent).toBe(countText(quan.length));
    } finally {
      history.replaceState(null, '', original);
    }
  },
};

/** Trạng thái: rỗng, không có kết quả (đang lọc), lỗi + Thử lại, đang tải (skeleton theo từng chế độ xem) */
export const States = {
  render: () => {
    const box = (title, el) => {
      const sec = document.createElement('section');
      sec.style.cssText = 'display: grid; gap: 8px;';
      const h = document.createElement('h4');
      h.style.cssText = 'margin: 0; font: 600 14px var(--hui-font-family); color: var(--hui-text-secondary);';
      h.textContent = title;
      sec.append(h, el);
      return sec;
    };
    const empty = makeView({ id: 'dv-empty', 'empty-text': 'Chưa có sản phẩm nào' }, '', { data: [] });
    const noResults = makeView({ id: 'dv-no-results', search: true, views: 'list' }, '', { data: PRODUCTS });
    noResults.updateQuery({ q: 'không tồn tại' });
    const error = makeView({ id: 'dv-error' }, '', { fetchFn: async () => { throw new Error('Mất kết nối máy chủ'); } });
    const never = () => new Promise(() => {});
    const loadingList = makeView({ id: 'dv-loading-list', view: 'list', views: 'list' }, '', { fetchFn: never });
    const loadingGrid = makeView({ id: 'dv-loading-grid', view: 'grid', views: 'grid', 'page-size': 4 }, '', { fetchFn: never });
    const loadingTable = makeView({ id: 'dv-loading-table', view: 'table', views: 'table' }, '', { fetchFn: never, columns: COLUMNS });
    const wrap = stage(
      box('Rỗng (empty-text)', empty),
      box('Không có kết quả phù hợp', noResults),
      box('Lỗi tải dữ liệu', error),
      box('Đang tải — list', loadingList),
      box('Đang tải — grid', loadingGrid),
      box('Đang tải — table', loadingTable),
    );
    wrap.style.cssText += 'display: grid; gap: 28px;';
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const get = (id) => canvasElement.querySelector(`#${id}`);
    const empty = get('dv-empty');
    await settle(empty);
    await expect(empty.dataState).toBe('empty');
    await expect(partOf(empty, 'state').querySelector('hui-empty').getAttribute('description')).toBe('Chưa có sản phẩm nào');
    await expect(partOf(empty, 'pagination').hidden).toBe(true);

    const noResults = get('dv-no-results');
    await settle(noResults);
    await expect(partOf(noResults, 'count').textContent).toBe(countText(0));
    const clear = partOf(noResults, 'state').querySelector('hui-button');
    await expect(clear).toBeTruthy();
    clear.click();
    await settle(noResults);
    await expect(itemsOf(noResults, 'list').length).toBe(12);

    const error = get('dv-error');
    await waitFor(() => expect(error.dataState).toBe('error'));
    await settle(error);
    // hui-result tải động → vẽ lại trạng thái lỗi khi định nghĩa xong
    await waitFor(() => expect(partOf(error, 'state').querySelector('hui-result')).toBeTruthy());

    for (const [id, cls] of [['dv-loading-list', 'sk--list'], ['dv-loading-grid', 'sk--grid'], ['dv-loading-table', 'sk--table']]) {
      const el = get(id);
      await waitFor(() => expect(el.dataState).toBe('loading'));
      await settle(el);
      await expect(partOf(el, 'skeleton').classList.contains(cls)).toBe(true);
      await expect(partOf(el, 'body').getAttribute('aria-busy')).toBe('true');
    }
  },
};

/** Override từ ngoài: biến CSS + ::part() + slot thanh công cụ */
export const CustomizeFromOutside = {
  render: () => {
    const style = document.createElement('style');
    style.textContent = `
      .brand-dv {
        --hui-data-view-grid-min: 180px;
        --hui-data-view-grid-gap: 12px;
        --hui-data-view-view-active-bg: var(--hui-primary);
        --hui-data-view-view-active-color: var(--hui-text-inverse);
        --hui-data-view-count-color: var(--hui-primary);
        --hui-data-view-table-header-bg: var(--hui-primary-1);
        --hui-data-view-search-width: 340px;
      }
      .brand-dv::part(toolbar) { padding: 10px; border-radius: 14px; background: var(--hui-fill-tertiary); }
      .brand-dv::part(views) { border-radius: 999px; }
      .brand-dv::part(view-button) { border-radius: 999px; }
      .brand-dv::part(count) { font-weight: 600; }
      .brand-dv .hui-dv-item[data-selected] { outline-color: var(--hui-success); }
    `;
    const dv = makeView({ class: 'brand-dv', search: true, view: 'grid', 'page-size': 8, 'row-key': 'id', selectable: true }, `
      ${TEMPLATES}
      <strong slot="toolbar-start" style="font: 600 16px var(--hui-font-family); margin-inline-end: 8px;">Kho hàng</strong>
      <hui-button slot="toolbar-end" icon="plus">Thêm</hui-button>
    `, { data: PRODUCTS, sortOptions: SORT_OPTIONS, columns: COLUMNS });
    return stage(style, dv);
  },
  play: async ({ canvasElement }) => {
    const dv = dvOf(canvasElement);
    await settle(dv);
    const container = dv.querySelector('[slot="view-grid"]');
    await expect(getComputedStyle(container).columnGap).toBe('12px');
    const active = viewBtn(dv, 'grid');
    const primary = getComputedStyle(partOf(dv, 'toolbar')).getPropertyValue('--hui-primary').trim();
    await expect(primary).not.toBe('');
    await expect(getComputedStyle(active).borderTopLeftRadius).toBe('999px');
    await expect(getComputedStyle(partOf(dv, 'count')).fontWeight).toBe('600');
  },
};
