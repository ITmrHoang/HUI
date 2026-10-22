/**
 * Storybook Stories — HUI Card Grid (Organism)
 * Lưới card responsive từ data + <template>: sản phẩm, bài viết, card tĩnh, cột responsive, sắp xếp / lọc,
 * chọn nhiều, phân trang / tải thêm / cuộn vô hạn, loading / empty / error, phân trang server, tùy biến từ ngoài.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-card/index.js';
import '../hui-product-card/index.js';
import '../hui-blog-card/index.js';
import '../hui-button/index.js';
import '../hui-tag/index.js';

// ---------- Dữ liệu mẫu (tự sinh, ảnh SVG data URI — không cần mạng) ----------
const HUES = [250, 200, 160, 30, 340, 280, 100, 10, 190, 50, 300, 130];

const art = (i, label = String(i + 1), w = 400, h = 400) => {
  const a = HUES[i % HUES.length];
  const b = (a + 40) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a},70%,62%)"/><stop offset="1" stop-color="hsl(${b},75%,45%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="55%" font-family="sans-serif" font-size="${Math.round(h / 6)}" font-weight="700" fill="white" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const NAMES = ['Áo thun HUI', 'Cốc sứ trắng', 'Sổ tay A5', 'Bình giữ nhiệt', 'Túi canvas', 'Bút ký kim loại', 'Móc khóa logo', 'Mũ lưỡi trai',
  'Ốp điện thoại', 'Tai nghe mini', 'Đèn bàn LED', 'Balo laptop', 'Chuột không dây', 'Bàn phím cơ', 'Lót chuột lớn', 'Giá đỡ laptop'];

const makeProducts = (count) => Array.from({ length: count }, (_, i) => {
  const price = 39000 + ((i * 37) % 23) * 10000;
  return {
    id: i + 1,
    name: `${NAMES[i % NAMES.length]}${i >= NAMES.length ? ` #${Math.floor(i / NAMES.length) + 1}` : ''}`,
    price,
    originalPrice: i % 3 === 0 ? price + 50000 : null,
    rating: 3.5 + ((i * 7) % 15) / 10,
    reviews: 12 + ((i * 53) % 400),
    badge: i % 5 === 0 ? 'Mới' : null,
    soldOut: i % 11 === 7,
    image: art(i, NAMES[i % NAMES.length].split(' ')[0]),
  };
});
const PRODUCTS = makeProducts(12);

const POSTS = [
  { id: 'p1', title: 'Thiết kế hệ thống token cho Web Components', category: 'Thiết kế', excerpt: 'Biến CSS kế thừa xuyên Shadow DOM — cách đặt token để theme toàn trang chỉ bằng một dòng.', author: 'Minh Anh', date: '2026-09-02', readingTime: 6 },
  { id: 'p2', title: 'Data binding không cần framework', category: 'Kỹ thuật', excerpt: 'Dùng <template> + data-bind để hiển thị danh sách an toàn, không innerHTML.', author: 'Quốc Bảo', date: '2026-09-15', readingTime: 8 },
  { id: 'p3', title: 'Hiệu ứng xuất hiện tôn trọng giảm chuyển động', category: 'A11y', excerpt: 'prefers-reduced-motion, token thời lượng và cách tắt hiệu ứng toàn cục.', author: 'Thu Hà', date: '2026-09-28', readingTime: 5 },
  { id: 'p4', title: 'Keyed reconcile: cập nhật 1000 item vẫn mượt', category: 'Hiệu năng', excerpt: 'Giữ node theo key để không mất focus, chữ đang gõ và trạng thái mở/đóng.', author: 'Đức Huy', date: '2026-10-03', readingTime: 7 },
  { id: 'p5', title: 'Phân trang, tải thêm hay cuộn vô hạn?', category: 'UX', excerpt: 'Ba cách chia dữ liệu dài và khi nào nên dùng cách nào.', author: 'Lan Chi', date: '2026-10-10', readingTime: 4 },
  { id: 'p6', title: 'ARIA cho lưới card có thể chọn', category: 'A11y', excerpt: 'role="list", checkbox và chọn dải bằng Shift.', author: 'Minh Anh', date: '2026-10-16', readingTime: 6 },
].map((p, i) => ({ ...p, image: art(i + 3, p.category, 640, 360), href: `#${p.id}` }));

const PRODUCT_TEMPLATE = `
  <template>
    <hui-product-card data-bind-attr="image:image, name:name, price:price, original-price:originalPrice, rating:rating, reviews:reviews, badge:badge, sold-out:soldOut"></hui-product-card>
  </template>`;

const makeGrid = (attrs, data, template = PRODUCT_TEMPLATE) => {
  const grid = document.createElement('hui-card-grid');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) grid.setAttribute(k, '');
    else if (v !== false && v !== null && v !== undefined) grid.setAttribute(k, String(v));
  }
  grid.innerHTML = template;
  if (data) grid.data = data;
  return grid;
};

// ---------- Tiện ích cho play ----------
const gridOf = (canvas, sel = 'hui-card-grid') => canvas.querySelector(sel);
const partOf = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
async function settle(el) {
  await el.updateComplete;
  await nextFrame();
  await nextFrame();
}
/** Bấm vào khung hui-card (click trên host không tới listener trong shadow) */
const clickCard = (card, init = {}) => {
  const inner = card.shadowRoot.querySelector('[part="card"]');
  inner.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, ...init }));
};
const trackCount = (el) => getComputedStyle(partOf(el, 'grid')).gridTemplateColumns.split(' ').filter(Boolean).length;

export default {
  title: 'Organisms/HuiCardGrid',
  component: 'hui-card-grid',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Card Grid** — lưới card **responsive từ dữ liệu**: \`data\` / \`src\` / \`fetchFn\` (DataController) + \`<template>\` con
(hoặc hàm \`renderItem\`), item render vào **light DOM** (CSS trang áp dụng được), giữ node theo \`row-key\`.
Con trực tiếp cũng là item (lưới tĩnh). Có sẵn: sắp xếp / lọc / giới hạn phía client, chọn nhiều, phân trang /
tải thêm / cuộn vô hạn, skeleton khi tải, empty / error + Thử lại, hiệu ứng fade-up lần lượt cho item mới.

### Cách sử dụng
\`\`\`html
<hui-card-grid id="products" row-key="id" min-card-width="220" gap="lg" equal-height paging="load-more" page-size="8">
  <template>
    <hui-product-card data-bind-attr="image:image, name:name, price:price, rating:rating"></hui-product-card>
  </template>
</hui-card-grid>
<script>
  products.data = [...];
  products.filter = (p) => p.price < 200000;     // lọc phía client
  products.sortBy = 'price';                      // hoặc attribute sort-by + sort-order="desc"
</script>

<!-- Cột cố định responsive: 1 → 2 (≥576) → 3 (≥992) → 4 (≥1200) -->
<hui-card-grid columns="1" columns-sm="2" columns-lg="3" columns-xl="4">
  <hui-card title="...">...</hui-card>
</hui-card-grid>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`columns\` | number | — | Số cột cố định; bỏ trống = auto-fill theo \`min-card-width\` |
| \`columns-sm\` … \`columns-xxl\` | number | — | Số cột từ 576 / 768 / 992 / 1200 / 1600px (kế thừa mức nhỏ hơn) |
| \`min-card-width\` | string | \`240px\` | Bề rộng tối thiểu card ở chế độ auto-fill (số = px) |
| \`gap\` | string | \`md\` | \`xs\` \\| \`sm\` \\| \`md\` \\| \`lg\` \\| \`xl\` \\| \`none\`, số (px) hoặc CSS length |
| \`equal-height\` | boolean | \`false\` | Card cùng hàng cao bằng nhau |
| \`row-key\` | string | — | Trường làm key (giữ DOM khi dữ liệu đổi, khóa lựa chọn); trống = vị trí trong \`data\` |
| \`sort-by\` / \`sort-order\` | string | — / \`asc\` | Sắp xếp phía client theo trường (đường dẫn \`a.b\`), \`asc\` \\| \`desc\` |
| \`limit\` | number | — | Giới hạn số item (sau lọc + sắp xếp) |
| \`selectable\` | boolean | \`false\` | Chọn nhiều; \`hui-card\` tự nhận \`selectable\`, item khác có checkbox phủ góc |
| \`selected-keys\` | JSON | \`[]\` | Key đang chọn (property \`selectedKeys\`) |
| \`paging\` | string | \`none\` | \`none\` \\| \`pagination\` \\| \`load-more\` \\| \`infinite\` |
| \`page-size\` / \`page\` | number | \`12\` / \`1\` | Số item mỗi trang / trang hiện tại |
| \`total\` | number | — | Tổng bản ghi phía server → \`data\` là trang hiện tại (pagination) hoặc dữ liệu đã nối (load-more) |
| \`skeleton-count\` | number | auto | Số card skeleton (mặc định \`page-size\`, hoặc \`columns × 2\`, hoặc 6) |
| \`item-animation\` | string | \`fade-up\` | Hiệu ứng item mới: \`fade\` \\| \`fade-up\` \\| \`zoom-in\` \\| \`flip-up\` \\| \`blur-in\` … |
| \`stagger\` | number | \`60\` | Độ trễ giữa các item (ms) |
| \`label\` | string | — | \`aria-label\` của lưới |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng xuất hiện + skeleton nhấp nháy |
| \`src\` / \`data-path\` / \`total-path\` / \`params\` / \`debounce\` / \`loading\` / \`empty-text\` | | | DataController (xem Foundations) |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`data\` | Array | Dữ liệu render bằng \`<template>\` con |
| \`fetchFn\` | Function | \`async (params, { signal }) => Array \\| { data, total }\` |
| \`renderItem\` | Function | \`(item, index) => Node\` — thay cho template (gọi 1 lần mỗi key) |
| \`updateItem\` | Function | \`(node, item, index) => void\` — cập nhật node của renderItem khi item đổi |
| \`filter\` | Function | \`(item, index) => boolean\` — lọc phía client |
| \`selectedKeys\` | Array | Key đang chọn |
| \`items\` | Element[] | **Chỉ đọc** — item đang hiển thị |
| \`pageCount\` / \`hasMore\` | number / boolean | **Chỉ đọc** — số trang / còn trang để tải thêm |

### Methods
| Method | Mô tả |
|--------|-------|
| \`loadMore()\` | Tải trang kế (load-more / infinite) |
| \`selectAll()\` / \`clearSelection()\` | Chọn tất cả (sau lọc) / bỏ chọn — có phát \`hui-selection-change\` |
| \`refresh()\` | Dựng lại toàn bộ item |
| \`reload()\` | Tải lại \`src\` / \`fetchFn\` |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-selection-change\` | \`{ keys, items }\` | Người dùng đổi lựa chọn |
| \`hui-page-change\` | \`{ page, pageSize }\` | Đổi trang / tải thêm (phân trang server: tự nạp \`data\` trong handler) |
| \`hui-action\` | \`{ action, item, index, originalEvent }\` | Bấm phần tử \`data-action\` trong template |
| \`hui-load\` / \`hui-error\` | \`{ data, total }\` / \`{ error }\` | Tải \`src\` / \`fetchFn\` xong / lỗi |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Item của lưới tĩnh; \`<template>\` con làm khuôn khi có \`data\` |

### Bàn phím & ARIA
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Đi qua từng card / checkbox |
| \`Space\` / \`Enter\` | Chọn / bỏ chọn card (hui-card selectable) hoặc checkbox |
| \`Shift\` + click / \`Shift\` + \`Space\` | Chọn cả dải từ item chọn trước đó |

Lưới \`role="list"\` (\`aria-label\` theo attribute \`label\`), mỗi ô \`role="listitem"\`; \`aria-busy\` khi đang tải.
hui-card khi chọn có \`role="checkbox"\` + \`aria-checked\`; item khác có checkbox thật với nhãn "Chọn mục N" (\`cardGrid.select\`).

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-card-grid-gap\` | Khoảng cách (attribute \`gap\` ưu tiên hơn) |
| \`--hui-card-grid-min-card-width\` | Bề rộng tối thiểu card (attribute ưu tiên hơn) |
| \`--hui-card-grid-item-radius\` | Bo góc ô (vòng chọn, skeleton) |
| \`--hui-card-grid-selected-color\` | Màu vòng chọn + checkbox |
| \`--hui-card-grid-check-size\` | Cạnh checkbox phủ |
| \`--hui-card-grid-skeleton-bg\` / \`--hui-card-grid-skeleton-height\` | Skeleton |
| \`--hui-card-grid-footer-gap\` / \`--hui-card-grid-footer-justify\` | Footer phân trang / tải thêm |

**Parts:** \`base\`, \`grid\`, \`item\`, \`item-selected\`, \`check\`, \`skeleton\`, \`skeleton-card\`, \`state\`, \`footer\`, \`pagination\`, \`load-more\`, \`sentinel\`.
**Custom state:** \`:state(loading | empty | error | ready)\`.
        `,
      },
    },
  },
  argTypes: {
    columns: { control: { type: 'number', min: 1, max: 6 } },
    minCardWidth: { name: 'min-card-width', control: 'text', table: { defaultValue: { summary: '240px' } } },
    gap: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'], table: { defaultValue: { summary: 'md' } } },
    equalHeight: { name: 'equal-height', control: 'boolean' },
    sortBy: { name: 'sort-by', control: 'select', options: ['', 'name', 'price', 'rating'] },
    sortOrder: { name: 'sort-order', control: 'inline-radio', options: ['asc', 'desc'] },
    paging: { control: 'select', options: ['none', 'pagination', 'load-more', 'infinite'] },
    pageSize: { name: 'page-size', control: { type: 'number', min: 1 } },
    selectable: { control: 'boolean' },
    noAnimation: { name: 'no-animation', control: 'boolean' },
  },
};

/** Sản phẩm: <template> với hui-product-card, auto-fill theo min-card-width */
export const Default = {
  args: { columns: null, minCardWidth: '220', gap: 'lg', equalHeight: true, sortBy: '', sortOrder: 'asc', paging: 'none', pageSize: 12, selectable: false, noAnimation: false },
  render: (args) => {
    const grid = makeGrid({
      'row-key': 'id', columns: args.columns, 'min-card-width': args.minCardWidth, gap: args.gap, 'equal-height': args.equalHeight,
      'sort-by': args.sortBy || null, 'sort-order': args.sortOrder, paging: args.paging, 'page-size': args.pageSize,
      selectable: args.selectable, 'no-animation': args.noAnimation, label: 'Sản phẩm',
    }, PRODUCTS);
    return grid;
  },
  // Kiểm thử: N item từ data, nằm ở light DOM, mỗi ô role=listitem; đổi data theo row-key giữ node cũ
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    await settle(grid);
    const cards = grid.querySelectorAll('hui-product-card');
    await expect(cards.length).toBe(PRODUCTS.length);
    await expect(cards[0].parentElement).toBe(grid);
    await expect(cards[1].name).toBe(PRODUCTS[1].name);
    await expect(partOf(grid, 'grid').getAttribute('role')).toBe('list');
    await expect(grid.shadowRoot.querySelectorAll('[part~="item"][role="listitem"]').length).toBe(PRODUCTS.length);
    await expect(cards[2].assignedSlot.parentElement.getAttribute('part')).toBe('item');

    const keep = cards[0];
    const third = cards[2];
    grid.data = [{ ...PRODUCTS[0], name: 'Áo thun (đổi tên)' }, ...PRODUCTS.slice(2)];
    await settle(grid);
    const after = grid.querySelectorAll('hui-product-card');
    await expect(after.length).toBe(PRODUCTS.length - 1);
    await expect(after[0]).toBe(keep);
    await expect(after[1]).toBe(third);
    await expect(keep.name).toBe('Áo thun (đổi tên)');
  },
};

/** Bài viết: hui-blog-card, 1 → 2 → 3 cột, bài nổi bật dùng data-action */
export const BlogPosts = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <hui-card-grid columns="1" columns-md="2" columns-lg="3" gap="lg" equal-height row-key="id" label="Bài viết">
        <template>
          <hui-blog-card data-bind-attr="image:image, title:title, category:category, excerpt:excerpt, author:author, date:date, reading-time:readingTime, href:href"></hui-blog-card>
        </template>
      </hui-card-grid>`;
    wrap.querySelector('hui-card-grid').data = POSTS;
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    await settle(grid);
    const posts = grid.querySelectorAll('hui-blog-card');
    await expect(posts.length).toBe(POSTS.length);
    await expect(posts[0].title).toBe(POSTS[0].title);
    await expect(partOf(grid, 'grid').style.getPropertyValue('--_cg-t-md')).toContain('repeat(2');
  },
};

/** Lưới tĩnh: con trực tiếp là item (không cần data) */
export const StaticCards = {
  render: () => html`
    <hui-card-grid min-card-width="200" gap="md" equal-height>
      ${Array.from({ length: 6 }, (_, i) => html`
        <hui-card title="Tính năng ${i + 1}" subtitle="Mô tả ngắn" variant="outlined" hoverable>
          ${i % 2 ? 'Nội dung dài hơn một chút để thấy các card cùng hàng vẫn cao bằng nhau khi bật equal-height.' : 'Nội dung ngắn.'}
        </hui-card>`)}
    </hui-card-grid>
  `,
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    await settle(grid);
    await expect(grid.items.length).toBe(6);
    await expect(grid.shadowRoot.querySelectorAll('[part~="item"]').length).toBe(6);
    // Thêm con mới → tự thành item
    const extra = document.createElement('hui-card');
    extra.setAttribute('title', 'Thêm sau');
    grid.append(extra);
    await waitFor(() => expect(grid.items.length).toBe(7));
    extra.remove();
    await waitFor(() => expect(grid.items.length).toBe(6));
  },
};

/** Cột responsive: columns / columns-sm / -md / -lg / -xl (kế thừa mức nhỏ hơn) */
export const ResponsiveColumns = {
  render: () => html`
    <div style="display: grid; gap: 32px;">
      <div>
        <p style="font: 13px var(--hui-font-family); color: var(--hui-text-secondary); margin: 0 0 8px;">columns="1" columns-sm="2" columns-md="3" columns-xl="4"</p>
        <hui-card-grid id="cg-resp" columns="1" columns-sm="2" columns-md="3" columns-xl="4" gap="sm">
          ${Array.from({ length: 8 }, (_, i) => html`<hui-card variant="filled" title="Ô ${i + 1}"></hui-card>`)}
        </hui-card-grid>
      </div>
      <div>
        <p style="font: 13px var(--hui-font-family); color: var(--hui-text-secondary); margin: 0 0 8px;">columns="3" (mọi kích thước)</p>
        <hui-card-grid id="cg-fixed" columns="3" gap="sm">
          ${Array.from({ length: 6 }, (_, i) => html`<hui-card variant="outlined" title="Cố định ${i + 1}"></hui-card>`)}
        </hui-card-grid>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const fixed = gridOf(canvasElement, '#cg-fixed');
    await settle(fixed);
    await expect(trackCount(fixed)).toBe(3);
    const resp = gridOf(canvasElement, '#cg-resp');
    const width = window.innerWidth;
    const expected = width >= 1200 ? 4 : width >= 768 ? 3 : width >= 576 ? 2 : 1;
    await expect(trackCount(resp)).toBe(expected);
  },
};

/** Sắp xếp / lọc / giới hạn phía client */
export const SortAndFilter = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="cg-toolbar" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
        <hui-button size="sm" variant="outline" data-sort="price:asc">Giá tăng dần</hui-button>
        <hui-button size="sm" variant="outline" data-sort="price:desc">Giá giảm dần</hui-button>
        <hui-button size="sm" variant="outline" data-sort="name:asc">Tên A → Z</hui-button>
        <hui-button size="sm" variant="outline" data-filter="cheap">Dưới 150.000 ₫</hui-button>
        <hui-button size="sm" variant="text" data-filter="all">Bỏ lọc</hui-button>
      </div>
      <hui-card-grid row-key="id" min-card-width="200" sort-by="price" sort-order="asc" equal-height>${PRODUCT_TEMPLATE}</hui-card-grid>`;
    const grid = wrap.querySelector('hui-card-grid');
    grid.data = PRODUCTS;
    wrap.querySelector('.cg-toolbar').addEventListener('click', (e) => {
      const btn = e.target.closest('hui-button');
      if (!btn) return;
      if (btn.dataset.sort) {
        const [by, order] = btn.dataset.sort.split(':');
        grid.sortBy = by;
        grid.sortOrder = order;
      }
      if (btn.dataset.filter) grid.filter = btn.dataset.filter === 'cheap' ? (p) => p.price < 150000 : null;
    });
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    await settle(grid);
    const prices = () => [...grid.querySelectorAll('hui-product-card')].map((c) => c.price);
    const asc = [...PRODUCTS].map((p) => p.price).sort((a, b) => a - b);
    await expect(prices()).toEqual(asc);

    grid.sortOrder = 'desc';
    await settle(grid);
    await expect(prices()).toEqual([...asc].reverse());

    grid.filter = (p) => p.price < 150000;
    await settle(grid);
    await expect(prices().every((p) => p < 150000)).toBe(true);
    await expect(prices().length).toBe(PRODUCTS.filter((p) => p.price < 150000).length);

    grid.filter = null;
    grid.limit = 3;
    await settle(grid);
    await expect(prices()).toEqual([...asc].reverse().slice(0, 3));
    grid.limit = null;
  },
};

/** Chọn nhiều: hui-card tự nhận selectable; hui-product-card có checkbox phủ góc. Shift + click = chọn dải */
export const Selectable = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display: grid; gap: 24px; font-family: var(--hui-font-family);';
    wrap.innerHTML = `
      <div class="cg-log" style="font: 13px var(--hui-font-mono); color: var(--hui-text-secondary);">Chưa chọn</div>
      <hui-card-grid id="cg-cards" selectable row-key="id" min-card-width="180" gap="md">
        <template><hui-card variant="outlined" data-bind-attr="title:name, cover:image" cover-height="120"><span data-bind="price" data-format="currency"></span></hui-card></template>
      </hui-card-grid>
      <hui-card-grid id="cg-products" selectable row-key="id" min-card-width="200" gap="md" equal-height>${PRODUCT_TEMPLATE}</hui-card-grid>`;
    const [cards, products] = wrap.querySelectorAll('hui-card-grid');
    cards.data = PRODUCTS.slice(0, 8);
    products.data = PRODUCTS.slice(0, 4);
    products.selectedKeys = [2];
    wrap.addEventListener('hui-selection-change', (e) => {
      wrap.querySelector('.cg-log').textContent = `hui-selection-change: keys = [${e.detail.keys.join(', ')}]`;
    });
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement, '#cg-cards');
    await settle(grid);
    const cards = grid.querySelectorAll('hui-card');
    await expect(cards[0].selectable).toBe(true);
    await expect(partOf(grid, 'check').hidden).toBe(true); // hui-card không cần checkbox phủ

    const events = [];
    grid.addEventListener('hui-selection-change', (e) => events.push(e.detail));
    clickCard(cards[0]);
    await waitFor(() => expect(events.length).toBe(1));
    await expect(events[0].keys).toEqual([1]);
    await expect(events[0].items[0].name).toBe(PRODUCTS[0].name);
    await expect(cards[0].selected).toBe(true);

    // Shift + click thẻ thứ 4 → chọn dải 1..4
    clickCard(cards[3], { shiftKey: true });
    await waitFor(() => expect(events.length).toBe(2));
    await expect([...events[1].keys].sort()).toEqual([1, 2, 3, 4]);
    await settle(grid);
    await expect(cards[1].selected).toBe(true);
    await expect(cards[2].selected).toBe(true);

    // Item không tự hỗ trợ chọn → checkbox phủ
    const products = gridOf(canvasElement, '#cg-products');
    await settle(products);
    const checks = products.shadowRoot.querySelectorAll('[part~="check"]');
    await expect(checks[0].hidden).toBe(false);
    await expect(checks[1].querySelector('input').checked).toBe(true); // selectedKeys = [2]
    let detail = null;
    products.addEventListener('hui-selection-change', (e) => { detail = e.detail; }, { once: true });
    checks[0].querySelector('input').click();
    await expect(detail?.keys).toEqual([2, 1]);
    await expect(products.shadowRoot.querySelectorAll('[part~="item-selected"]').length).toBe(2);
  },
};

/** Phân trang bằng hui-pagination (client): 30 sản phẩm, 6 / trang */
export const Pagination = {
  render: () => makeGrid({ 'row-key': 'id', paging: 'pagination', 'page-size': 6, 'min-card-width': 200, 'equal-height': true }, makeProducts(30)),
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    await settle(grid);
    await expect(grid.querySelectorAll('hui-product-card').length).toBe(6);
    await expect(grid.pageCount).toBe(5);
    const pager = partOf(grid, 'pagination');
    await expect(pager.hidden).toBe(false);
    await customElements.whenDefined('hui-pagination'); // tải động khi có nhiều hơn 1 trang
    await pager.updateComplete;

    let page = null;
    grid.addEventListener('hui-page-change', (e) => { page = e.detail.page; }, { once: true });
    let leaked = false;
    canvasElement.addEventListener('change', () => { leaked = true; }, { once: true });
    pager.shadowRoot.querySelector('[data-id="page-2"]').click();
    await expect(page).toBe(2);
    await expect(leaked).toBe(false); // change nội bộ của pagination không lọt ra ngoài
    await settle(grid);
    const names = [...grid.querySelectorAll('hui-product-card')].map((c) => c.name);
    await expect(names.length).toBe(6);
    await expect(names[0]).toBe(makeProducts(30)[6].name);
    await expect(grid.page).toBe(2);
  },
};

/** Nút "Tải thêm": mỗi lần nối thêm 1 trang, chỉ item mới chạy hiệu ứng */
export const LoadMore = {
  render: () => makeGrid({ 'row-key': 'id', paging: 'load-more', 'page-size': 4, 'min-card-width': 200, 'equal-height': true }, makeProducts(10)),
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    await settle(grid);
    const first = grid.querySelectorAll('hui-product-card');
    await expect(first.length).toBe(4);
    const btn = partOf(grid, 'load-more');
    await expect(btn.hidden).toBe(false);

    let page = null;
    grid.addEventListener('hui-page-change', (e) => { page = e.detail.page; }, { once: true });
    btn.click();
    await expect(page).toBe(2);
    await settle(grid);
    const after = grid.querySelectorAll('hui-product-card');
    await expect(after.length).toBe(8);
    await expect(after[0]).toBe(first[0]); // node cũ được giữ
    btn.click();
    await settle(grid);
    await expect(grid.querySelectorAll('hui-product-card').length).toBe(10);
    await expect(grid.hasMore).toBe(false);
    await expect(btn.hidden).toBe(true);
  },
};

/** Cuộn vô hạn: mốc cuối lưới vào khung nhìn → tự tải trang kế */
export const InfiniteScroll = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.innerHTML = '<p style="font: 13px var(--hui-font-family); color: var(--hui-text-secondary);">Cuộn xuống để tải thêm (48 sản phẩm, 8 / lần).</p>';
    wrap.append(makeGrid({ 'row-key': 'id', paging: 'infinite', 'page-size': 8, 'min-card-width': 200, 'equal-height': true }, makeProducts(48)));
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    await settle(grid);
    const sentinel = partOf(grid, 'sentinel');
    sentinel.scrollIntoView({ block: 'end' });
    await waitFor(() => expect(grid.querySelectorAll('hui-product-card').length).toBeGreaterThan(8), { timeout: 3000 });
    window.scrollTo(0, 0);
  },
};

/** Trạng thái dữ liệu: đang tải (skeleton), rỗng, lỗi + Thử lại */
export const DataStates = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display: grid; gap: 32px;';
    const make = (fetchFn, attrs = {}) => {
      const grid = makeGrid({ 'min-card-width': 200, ...attrs });
      grid.fetchFn = fetchFn;
      wrap.append(grid);
      return grid;
    };
    make(() => new Promise(() => {}), { columns: 4, 'skeleton-count': 4 }); // mãi đang tải
    make(async () => [], { 'empty-text': 'Chưa có sản phẩm nào' });
    make(async () => { throw new Error('Mất kết nối máy chủ'); });
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const [loading, empty, error] = canvasElement.querySelectorAll('hui-card-grid');
    await waitFor(() => expect(loading.dataState).toBe('loading'));
    await settle(loading);
    await expect(loading.hasAttribute('aria-busy')).toBe(true);
    await expect(loading.shadowRoot.querySelectorAll('[part~="skeleton-card"]').length).toBe(4);
    await expect(partOf(loading, 'grid').hidden).toBe(true);
    await waitFor(() => expect(empty.dataState).toBe('empty'));
    await settle(empty);
    await expect(partOf(empty, 'state').hidden).toBe(false);
    // hui-empty / hui-result tải động → trạng thái được vẽ lại khi định nghĩa xong
    await waitFor(() => expect(partOf(empty, 'state').querySelector('hui-empty')).toBeTruthy());
    await waitFor(() => expect(error.dataState).toBe('error'));
    await settle(error);
    await waitFor(() => expect(partOf(error, 'state').querySelector('hui-result')).toBeTruthy());
  },
};

/** Phân trang phía server: `total` + fetchFn theo params, nghe hui-page-change để đổi params */
export const ServerPaging = {
  render: () => {
    const all = makeProducts(40);
    const grid = makeGrid({ 'row-key': 'id', paging: 'pagination', 'page-size': 8, total: all.length, 'min-card-width': 200, 'equal-height': true });
    grid.params = { page: 1, pageSize: 8 };
    grid.fetchFn = async ({ page = 1, pageSize = 8 }, { signal }) => {
      await new Promise((r) => setTimeout(r, 400));
      if (signal.aborted) return [];
      return { data: all.slice((page - 1) * pageSize, page * pageSize), total: all.length };
    };
    grid.addEventListener('hui-page-change', (e) => {
      grid.params = { page: e.detail.page, pageSize: e.detail.pageSize };
    });
    return grid;
  },
};

/** renderItem: tự dựng node bằng hàm thay cho <template> */
export const RenderItem = {
  render: () => {
    const grid = document.createElement('hui-card-grid');
    grid.setAttribute('min-card-width', '160');
    grid.setAttribute('row-key', 'id');
    grid.renderItem = (item, i) => {
      const card = document.createElement('hui-card');
      card.setAttribute('variant', 'filled');
      card.setAttribute('title', `${i + 1}. ${item.name}`);
      card.textContent = item.badge ? `Nhãn: ${item.badge}` : 'Không nhãn';
      return card;
    };
    grid.data = PRODUCTS.slice(0, 8);
    return grid;
  },
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    await settle(grid);
    const cards = grid.querySelectorAll('hui-card');
    await expect(cards.length).toBe(8);
    await expect(cards[2].getAttribute('title')).toBe(`3. ${PRODUCTS[2].name}`);
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <style>
        .brand-grid {
          --hui-card-grid-gap: 10px;
          --hui-card-grid-selected-color: var(--hui-success);
          --hui-card-grid-item-radius: 4px;
          --hui-card-grid-footer-justify: flex-end;
          --hui-card-grid-skeleton-height: 100px;
        }
        .brand-grid::part(item) { transition: transform var(--hui-transition); }
        .brand-grid::part(item):hover { transform: translateY(-2px); }
        .brand-grid::part(load-more) { min-width: 200px; }
      </style>
      <hui-card-grid class="brand-grid" selectable row-key="id" columns="2" columns-md="4" paging="load-more" page-size="4" equal-height>${PRODUCT_TEMPLATE}</hui-card-grid>`;
    wrap.querySelector('hui-card-grid').data = PRODUCTS.slice(0, 8);
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    await settle(grid);
    await expect(getComputedStyle(partOf(grid, 'grid')).columnGap).toBe('10px');
    await expect(getComputedStyle(partOf(grid, 'footer')).justifyContent).toBe('flex-end');
  },
};
