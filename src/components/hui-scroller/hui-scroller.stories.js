/**
 * Storybook Stories — HUI Scroller (Organism)
 * Khung cuộn ngang: card / ảnh / tag, items-per-view responsive, data + template, chấm / thanh vị trí, bóng mờ mép, tự chạy.
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-card/index.js';
import '../hui-tag/index.js';
import '../hui-button/index.js';

// ---------- Dữ liệu mẫu ----------
const HUES = [250, 200, 160, 30, 340, 280, 100, 10, 190, 50, 300, 130];

/** Ảnh SVG gradient (data URI) — không cần mạng */
const art = (i, w = 400, h = 260) => {
  const a = HUES[i % HUES.length];
  const b = (a + 40) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a},70%,62%)"/><stop offset="1" stop-color="hsl(${b},75%,45%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="54%" font-family="sans-serif" font-size="56" font-weight="700" fill="white" text-anchor="middle">${i + 1}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const PRODUCTS = [
  { id: 1, name: 'Áo thun HUI', price: 199000, isNew: true },
  { id: 2, name: 'Cốc sứ trắng', price: 89000 },
  { id: 3, name: 'Sổ tay A5', price: 59000, isNew: true },
  { id: 4, name: 'Bình giữ nhiệt', price: 259000 },
  { id: 5, name: 'Túi canvas', price: 129000 },
  { id: 6, name: 'Bút ký kim loại', price: 99000 },
  { id: 7, name: 'Móc khóa logo', price: 39000 },
  { id: 8, name: 'Mũ lưỡi trai', price: 149000, isNew: true },
].map((p, i) => ({ ...p, image: art(i) }));

const TAGS = ['Tất cả', 'Điện thoại', 'Laptop', 'Máy tính bảng', 'Tai nghe', 'Đồng hồ', 'Máy ảnh', 'Phụ kiện', 'Gaming', 'Nhà thông minh', 'Âm thanh', 'Màn hình', 'Bàn phím', 'Chuột', 'Sạc dự phòng'];

const cards = (count, offset = 0) => Array.from({ length: count }, (_, i) => html`
  <hui-card title="Thẻ số ${i + 1 + offset}" subtitle="Mô tả ngắn" cover=${art(i + offset)} cover-height="140" variant="outlined">
    Nội dung thẻ ${i + 1 + offset}: kéo, vuốt hoặc bấm mũi tên để xem tiếp.
  </hui-card>`);

// ---------- Tiện ích cho play ----------
const scrollerOf = (canvas, sel = 'hui-scroller') => canvas.querySelector(sel);
const partOf = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
async function settle(el) {
  await el.updateComplete;
  await nextFrame();
  await nextFrame();
}

export default {
  title: 'Organisms/HuiScroller',
  component: 'hui-scroller',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Scroller** — khung **cuộn ngang** cho bất kỳ nội dung nào (card, ảnh, tag…), lõi là \`overflow-x\` + CSS scroll-snap
của trình duyệt (vuốt cảm ứng tự nhiên), thêm: số item mỗi khung nhìn (responsive, cho phép lẻ \`1.2\` để lộ thẻ kế tiếp),
nút mũi tên, kéo bằng chuột, lăn chuột dọc → ngang, bàn phím, chấm / thanh vị trí, bóng mờ 2 mép, tự chạy.

Item là **con trực tiếp** của thẻ, hoặc **\`data\` + \`<template>\`** con (render vào light DOM → CSS trang áp dụng được),
hỗ trợ \`src\` / \`fetchFn\` (DataController) với giao diện loading / empty / error có sẵn.

### Cách sử dụng
\`\`\`html
<!-- Card: 1.2 thẻ trên mobile, 2 từ 768px, 3 từ 992px -->
<hui-scroller items-per-view="1.2" items-per-view-md="2" items-per-view-lg="3" gap="md" indicator="dots" label="Sản phẩm nổi bật">
  <hui-card title="...">...</hui-card>
  <hui-card title="...">...</hui-card>
</hui-scroller>

<!-- Tag: bề rộng tự nhiên, lăn chuột dọc cuộn ngang -->
<hui-scroller gap="sm" snap="none" wheel scrollbar="hidden" edge-fade>
  <hui-tag>Điện thoại</hui-tag> <hui-tag>Laptop</hui-tag> ...
</hui-scroller>

<!-- Dữ liệu + template -->
<hui-scroller id="products" items-per-view="2.2" row-key="id">
  <template>
    <div class="product">
      <img data-bind-attr="src:image, alt:name">
      <h3 data-bind="name"></h3>
      <span data-bind="price" data-format="currency"></span>
      <hui-button data-action="buy">Mua</hui-button>
    </div>
  </template>
</hui-scroller>
<script>
  products.data = [...];
  products.addEventListener('hui-action', (e) => console.log(e.detail.action, e.detail.item));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`gap\` | string | \`md\` | \`xs\` \\| \`sm\` \\| \`md\` \\| \`lg\` \\| \`xl\` \\| \`none\`, số (px) hoặc CSS length |
| \`items-per-view\` | number | — | Số item trong khung nhìn (lẻ được, vd \`1.2\`); bỏ trống = bề rộng tự nhiên |
| \`items-per-view-sm\` … \`-xxl\` | number | — | Theo breakpoint ≥ 576 / 768 / 992 / 1200 / 1600px (kế thừa mức nhỏ hơn) |
| \`item-width\` | string | — | Bề rộng cố định mỗi item (số = px) — thay cho items-per-view |
| \`padding\` | string | \`0\` | Đệm 2 bên hàng item (thẻ đầu thẳng lề nội dung trang); khớp cả scroll-padding |
| \`snap\` | string | \`start\` | \`start\` \\| \`center\` \\| \`none\` — CSS scroll-snap |
| \`scrollbar\` | string | \`auto\` | \`auto\` \\| \`hidden\` |
| \`drag-scroll\` | string | \`"true"\` | \`"false"\` = tắt kéo bằng chuột |
| \`wheel\` | boolean | \`false\` | Lăn chuột dọc → cuộn ngang (tới mép thì trả lại cuộn trang) |
| \`arrows\` | string | \`auto\` | \`auto\` (chỉ thiết bị có chuột, hiện khi rê vào) \\| \`always\` \\| \`never\` |
| \`scroll-by\` | string | \`item\` | \`item\` \\| \`page\` — bước của nút mũi tên (property: \`scrollStep\`) |
| \`edge-fade\` | boolean | \`false\` | Bóng mờ ở mép còn nội dung bị che |
| \`indicator\` | string | \`none\` | \`dots\` (1 chấm / trang, bấm được) \\| \`bar\` (thanh vị trí) \\| \`none\` |
| \`autoplay\` | number | \`0\` | Tự chuyển sau N ms (attribute rỗng = 3000); dừng khi hover / focus / tab ẩn, tắt khi giảm chuyển động |
| \`label\` | string | locale | \`aria-label\` của vùng cuộn |
| \`row-key\` | string | — | Trường làm key khi render \`data\` |
| \`no-animation\` | boolean | \`false\` | Tắt cuộn mượt và hiệu ứng |
| \`src\` / \`data-path\` / \`params\` / \`debounce\` / \`loading\` / \`empty-text\` | | | DataController (xem Foundations) |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`data\` | Array | Dữ liệu render bằng \`<template>\` con |
| \`fetchFn\` | Function | \`async (params, { signal }) => Array \\| { data, total }\` |
| \`currentIndex\` | number | **Chỉ đọc** — item đầu đang hiển thị |
| \`currentPage\` / \`pageCount\` | number | **Chỉ đọc** — trang hiện tại (0-based) / số trang |
| \`items\` | Element[] | **Chỉ đọc** — các item |

### Methods
| Method | Mô tả |
|--------|-------|
| \`scrollToIndex(i, { smooth = true })\` | Cuộn tới item i |
| \`next()\` / \`prev()\` | Item / trang kế, trước (theo \`scroll-by\`) |
| \`refresh()\` | Đo lại vị trí item (khi tự đổi kích thước bằng code) |
| \`reload()\` | Tải lại \`src\` / \`fetchFn\` |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-scroll\` | \`{ index, progress, atStart, atEnd }\` | Vị trí cuộn đổi (gom theo frame) |
| \`hui-action\` | \`{ action, item, index, originalEvent }\` | Bấm phần tử \`data-action\` trong template |
| \`hui-load\` / \`hui-error\` | \`{ data, total }\` / \`{ error }\` | Tải \`src\` / \`fetchFn\` xong / lỗi |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Các item; một \`<template>\` con dùng làm khuôn khi có \`data\` |

### Bàn phím (khi vùng cuộn đang focus)
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Focus vào vùng cuộn (rồi tới nội dung bên trong) |
| \`←\` / \`→\` | Item trước / kế (RTL: \`←\` = kế, \`→\` = trước) |
| \`PageUp\` / \`PageDown\` | Trang trước / kế |
| \`Home\` / \`End\` | Item đầu / cuối |

### RTL
Đặt \`dir="rtl"\` trên scroller hoặc tổ tiên: item xếp phải → trái, nút "trước" ở bên phải (mũi tên đảo chiều), \`←\` / \`→\`
và lăn chuột đổi chiều theo hướng đọc, bóng mờ / chấm / thanh vị trí đúng mép. Bên trong tính vị trí từ mép đầu
(\`scrollLeft\` âm của RTL được đổi dấu). Đổi \`dir\` lúc đang chạy → gọi \`refresh()\`. Property chỉ đọc \`isRtl\`; CSS: \`hui-scroller:state(rtl)\`.

### Danh sách rất dài
Scroller đo mọi item thật (ổn tới vài trăm item). Hàng nghìn item → dùng \`<hui-virtual-list horizontal item-height="…">\`
(ảo hóa bằng \`VirtualWindow\` ngang, chỉ render phần nhìn thấy) — đánh đổi: không có scroll-snap / chấm / mũi tên.

ARIA: vùng cuộn \`role="region"\` + \`aria-label\` (attribute \`label\` hoặc locale \`scroller.label\`).
Mỗi item được gắn \`role="group"\`, \`aria-roledescription\` (\`scroller.itemRole\`) và \`aria-label\` "i / n" (\`scroller.slide\`)
— **không đè** giá trị bạn tự đặt; chỉ gắn cho \`div\` / \`span\` / \`section\` và custom element (\`img\`, \`a\`, \`article\`, \`figure\`… giữ ngữ nghĩa gốc). Chấm: \`aria-current\` cho trang hiện tại.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-scroller-gap\` / \`--hui-scroller-padding\` | Khoảng cách / đệm 2 bên (attribute ưu tiên hơn) |
| \`--hui-scroller-padding-block\` | Đệm trên dưới hàng item (chừa chỗ bóng đổ) |
| \`--hui-scroller-item-width\` | Bề rộng item khi không có items-per-view / item-width |
| \`--hui-scroller-fade-size\` | Độ dài bóng mờ mép |
| \`--hui-scroller-arrow-size\` / \`-arrow-bg\` / \`-arrow-color\` / \`-arrow-shadow\` / \`-arrow-offset\` | Nút mũi tên |
| \`--hui-scroller-dot-size\` / \`-dot-color\` / \`-dot-active-color\` | Chấm |
| \`--hui-scroller-bar-height\` / \`-bar-track-color\` / \`-bar-color\` | Thanh vị trí |
| \`--hui-scroller-indicator-gap\` | Khoảng cách viewport ↔ indicator |
| \`--hui-scroller-focus-color\` | Viền focus |

**Parts:** \`base\`, \`frame\`, \`viewport\`, \`track\`, \`prev\`, \`next\`, \`indicator\`, \`dot\`, \`dot-active\`, \`bar\`, \`state\`.
**Custom state:** \`:state(at-start)\`, \`:state(at-end)\`, \`:state(scrollable)\`, \`:state(loading | empty | error | ready)\`.
        `,
      },
    },
  },
  argTypes: {
    itemsPerView: { control: { type: 'number', step: 0.1, min: 1 }, table: { defaultValue: { summary: '—' } } },
    itemsPerViewMd: { control: { type: 'number', step: 0.1, min: 1 } },
    itemsPerViewLg: { control: { type: 'number', step: 0.1, min: 1 } },
    gap: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'], table: { defaultValue: { summary: 'md' } } },
    padding: { control: 'text' },
    snap: { control: 'select', options: ['start', 'center', 'none'], table: { defaultValue: { summary: 'start' } } },
    arrows: { control: 'select', options: ['auto', 'always', 'never'], table: { defaultValue: { summary: 'auto' } } },
    scrollStep: { name: 'scroll-by', control: 'select', options: ['item', 'page'], table: { defaultValue: { summary: 'item' } } },
    indicator: { control: 'select', options: ['none', 'dots', 'bar'], table: { defaultValue: { summary: 'none' } } },
    scrollbar: { control: 'select', options: ['auto', 'hidden'], table: { defaultValue: { summary: 'auto' } } },
    edgeFade: { control: 'boolean' },
    wheel: { control: 'boolean' },
    noAnimation: { control: 'boolean' },
  },
};

/** Card responsive: 1.2 thẻ (lộ thẻ kế) → 2 thẻ từ 768px → 3 thẻ từ 992px */
export const Default = {
  args: {
    itemsPerView: 1.2, itemsPerViewMd: 2, itemsPerViewLg: 3, gap: 'md', padding: '', snap: 'start',
    arrows: 'auto', scrollStep: 'item', indicator: 'none', scrollbar: 'auto', edgeFade: false, wheel: false, noAnimation: false,
  },
  render: (args) => html`
    <hui-scroller
      label="Thẻ nổi bật"
      items-per-view=${args.itemsPerView}
      items-per-view-md=${args.itemsPerViewMd}
      items-per-view-lg=${args.itemsPerViewLg}
      gap=${args.gap}
      padding=${args.padding}
      snap=${args.snap}
      arrows=${args.arrows}
      scroll-by=${args.scrollStep}
      indicator=${args.indicator}
      scrollbar=${args.scrollbar}
      ?edge-fade=${args.edgeFade}
      ?wheel=${args.wheel}
      ?no-animation=${args.noAnimation}
    >${cards(8)}</hui-scroller>
  `,
  // Kiểm thử: mũi tên trái bị tắt ở đầu; next() cuộn đúng 1 item, cập nhật currentIndex + phát hui-scroll
  play: async ({ canvasElement }) => {
    const sc = scrollerOf(canvasElement);
    await settle(sc);
    const viewport = partOf(sc, 'viewport');
    const items = sc.items;

    await expect(items.length).toBe(8);
    await expect(viewport.getAttribute('role')).toBe('region');
    await expect(viewport.getAttribute('aria-label')).toBe('Thẻ nổi bật');
    await expect(partOf(sc, 'prev').disabled).toBe(true);
    await expect(partOf(sc, 'next').disabled).toBe(false);
    await expect(sc.currentIndex).toBe(0);
    await expect(items[0].getAttribute('aria-label')).toBe('1 / 8');

    // Bề rộng item theo items-per-view (đo tại item ở light DOM)
    const n = Number(sc.getAttribute(window.innerWidth >= 992 ? 'items-per-view-lg' : window.innerWidth >= 768 ? 'items-per-view-md' : 'items-per-view'));
    const gap = items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().right;
    const expected = (viewport.clientWidth - (n - 1) * gap) / n;
    await expect(Math.abs(items[0].getBoundingClientRect().width - expected)).toBeLessThan(2);

    const events = [];
    sc.addEventListener('hui-scroll', (e) => events.push(e.detail));
    sc.next();
    await expect(sc.currentIndex).toBe(1);
    const stride = items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().left;
    await waitFor(() => expect(Math.abs(viewport.scrollLeft - stride)).toBeLessThan(2), { timeout: 3000 });
    await waitFor(() => expect(events.some((d) => d.index === 1 && d.atStart === false)).toBe(true));
    await waitFor(() => expect(partOf(sc, 'prev').disabled).toBe(false));

    sc.prev();
    await waitFor(() => expect(viewport.scrollLeft).toBeLessThan(2), { timeout: 3000 });
    await expect(sc.currentIndex).toBe(0);
  },
};

/** Bàn phím: focus vùng cuộn → ←/→, PageUp/PageDown, Home/End */
export const Keyboard = {
  render: () => html`
    <p style="margin: 0 0 8px; color: var(--hui-text-secondary); font: 14px var(--hui-font-family);">
      Bấm Tab để focus vùng cuộn rồi dùng ← → · PageUp PageDown · Home End
    </p>
    <hui-scroller items-per-view="2.5" no-animation label="Thử bàn phím">${cards(10)}</hui-scroller>
  `,
  play: async ({ canvasElement }) => {
    const sc = scrollerOf(canvasElement);
    await settle(sc);
    const viewport = partOf(sc, 'viewport');
    viewport.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(sc.currentIndex).toBe(1);
    await waitFor(() => expect(viewport.scrollLeft).toBeGreaterThan(10));
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(partOf(sc, 'next').disabled).toBe(true));
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(viewport.scrollLeft).toBe(0));
    await expect(sc.currentIndex).toBe(0);
  },
};

/** Ảnh: bề rộng cố định (`item-width`), snap giữa, chấm theo trang */
export const Images = {
  render: () => html`
    <style>
      .sc-photo { margin: 0; border-radius: 12px; overflow: hidden; }
      .sc-photo img { display: block; width: 100%; height: 180px; object-fit: cover; }
      .sc-photo figcaption { padding: 6px 2px 0; font: 13px var(--hui-font-family); color: var(--hui-text-secondary); }
    </style>
    <hui-scroller item-width="260" snap="center" indicator="dots" gap="sm" label="Bộ sưu tập ảnh">
      ${Array.from({ length: 9 }, (_, i) => html`
        <figure class="sc-photo"><img src=${art(i, 520, 360)} alt="Ảnh minh họa ${i + 1}" draggable="false"><figcaption>Ảnh ${i + 1}</figcaption></figure>`)}
    </hui-scroller>
  `,
};

/** Tag / chip: bề rộng tự nhiên, không snap, lăn chuột dọc → ngang, ẩn thanh cuộn, bóng mờ mép */
export const Tags = {
  render: () => html`
    <hui-scroller gap="sm" snap="none" wheel scrollbar="hidden" edge-fade label="Danh mục" style="--hui-scroller-arrow-size: 28px;">
      ${TAGS.map((tag, i) => html`<hui-tag color=${i === 0 ? 'primary' : ''} variant=${i === 0 ? 'filled' : 'outlined'}>${tag}</hui-tag>`)}
    </hui-scroller>
  `,
};

/** Dữ liệu + `<template>`: item render vào light DOM, `data-action` → `hui-action` */
export const DataTemplate = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <style>
        .sc-product { display: grid; gap: 6px; padding: 12px; border: 1px solid var(--hui-border); border-radius: 12px; background: var(--hui-bg-container); font-family: var(--hui-font-family); }
        .sc-product img { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; }
        .sc-product h3 { margin: 0; font-size: 15px; }
        .sc-product .price { color: var(--hui-primary); font-weight: 600; }
        .sc-log { margin-top: 8px; font: 13px var(--hui-font-mono); color: var(--hui-text-secondary); }
      </style>
      <hui-scroller id="sc-products" items-per-view="2.2" items-per-view-md="4" row-key="id" indicator="bar" scrollbar="hidden" label="Sản phẩm">
        <template>
          <div class="sc-product">
            <img data-bind-attr="src:image, alt:name" draggable="false">
            <h3 data-bind="name"></h3>
            <span class="price" data-bind="price" data-format="currency"></span>
            <hui-tag data-show="isNew" color="success">Mới</hui-tag>
            <hui-button data-action="buy" size="sm" variant="outline">Mua</hui-button>
          </div>
        </template>
      </hui-scroller>
      <div class="sc-log">Bấm "Mua" để xem sự kiện hui-action</div>`;
    const sc = wrap.querySelector('hui-scroller');
    sc.data = PRODUCTS;
    sc.addEventListener('hui-action', (e) => {
      wrap.querySelector('.sc-log').textContent = `hui-action: ${e.detail.action} → ${e.detail.item.name} (#${e.detail.index})`;
    });
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const sc = scrollerOf(canvasElement);
    await settle(sc);
    const products = sc.querySelectorAll('.sc-product');
    await expect(products.length).toBe(PRODUCTS.length);
    await expect(sc.items.length).toBe(PRODUCTS.length);
    await expect(products[0].parentElement).toBe(sc); // light DOM
    await expect(products[1].querySelector('h3').textContent).toBe('Cốc sứ trắng');
    await expect(products[2].getAttribute('aria-label')).toBe(`3 / ${PRODUCTS.length}`);

    let detail = null;
    sc.addEventListener('hui-action', (e) => { detail = e.detail; }, { once: true });
    products[1].querySelector('hui-button').click();
    await expect(detail?.action).toBe('buy');
    await expect(detail?.item.id).toBe(2);
    await expect(detail?.index).toBe(1);

    // Đổi dữ liệu theo row-key → giữ node cũ
    const keep = products[0];
    sc.data = [PRODUCTS[0], ...PRODUCTS.slice(2)];
    await settle(sc);
    await expect(sc.querySelectorAll('.sc-product').length).toBe(PRODUCTS.length - 1);
    await expect(sc.querySelector('.sc-product')).toBe(keep);
  },
};

/** Indicator: chấm theo trang (bấm được) và thanh vị trí; `scroll-by="page"` */
export const Indicators = {
  render: () => html`
    <div style="display: grid; gap: 32px;">
      <hui-scroller id="sc-dots" items-per-view="2" indicator="dots" scroll-by="page" arrows="always" label="Chấm theo trang">${cards(7)}</hui-scroller>
      <hui-scroller id="sc-bar" items-per-view="1.5" indicator="bar" label="Thanh vị trí">${cards(6, 7)}</hui-scroller>
    </div>
  `,
  // Kiểm thử: số chấm = pageCount; bấm chấm cuối → tới trang cuối
  play: async ({ canvasElement }) => {
    const sc = scrollerOf(canvasElement, '#sc-dots');
    await settle(sc);
    const dots = sc.shadowRoot.querySelectorAll('[part~="dot"]');
    await expect(sc.pageCount).toBe(4); // ceil(7 / 2)
    await expect(dots.length).toBe(sc.pageCount);
    await expect(dots[0].getAttribute('aria-current')).toBe('true');

    dots[dots.length - 1].click();
    const viewport = partOf(sc, 'viewport');
    await waitFor(() => expect(viewport.scrollLeft).toBeGreaterThanOrEqual(viewport.scrollWidth - viewport.clientWidth - 1), { timeout: 3000 });
    await waitFor(() => expect(sc.currentPage).toBe(sc.pageCount - 1));
    await waitFor(() => expect(dots[dots.length - 1].getAttribute('aria-current')).toBe('true'));

    const bar = scrollerOf(canvasElement, '#sc-bar');
    await settle(bar);
    await expect(partOf(bar, 'bar')).toBeTruthy();
  },
};

/** Bóng mờ ở mép còn nội dung (tự ẩn khi đã tới đầu / cuối) + đệm 2 bên thẳng lề trang */
export const EdgeFade = {
  render: () => html`
    <hui-scroller items-per-view="2.4" edge-fade padding="24" label="Bóng mờ mép">${cards(8)}</hui-scroller>
  `,
  play: async ({ canvasElement }) => {
    const sc = scrollerOf(canvasElement);
    await settle(sc);
    await expect(partOf(sc, 'base').classList.contains('scroller--at-start')).toBe(true);
    await expect(getComputedStyle(partOf(sc, 'track')).paddingLeft).toBe('24px');
  },
};

/** Tự chạy mỗi 2.5s, quay về đầu khi tới cuối; dừng khi rê chuột / focus / tab ẩn */
export const Autoplay = {
  render: () => html`
    <hui-scroller autoplay="2500" items-per-view="1" indicator="dots" label="Banner">
      ${Array.from({ length: 4 }, (_, i) => html`
        <div style="height: 180px; border-radius: 12px; background: center / cover no-repeat url('${art(i, 800, 360)}');"></div>`)}
    </hui-scroller>
  `,
};

/** Trạng thái dữ liệu: đang tải (fetchFn chậm), rỗng, lỗi + Thử lại */
export const DataStates = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display: grid; gap: 24px;';
    const make = (fetchFn) => {
      const sc = document.createElement('hui-scroller');
      sc.setAttribute('items-per-view', '3');
      sc.innerHTML = '<template><div class="sc-chip" data-bind="name" style="padding: 16px; border: 1px solid var(--hui-border); border-radius: 8px;"></div></template>';
      sc.fetchFn = fetchFn;
      wrap.append(sc);
      return sc;
    };
    make(() => new Promise(() => {})); // mãi đang tải
    make(async () => []);
    make(async () => { throw new Error('Mất kết nối'); });
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const [loading, empty, error] = canvasElement.querySelectorAll('hui-scroller');
    await waitFor(() => expect(loading.dataState).toBe('loading'));
    await waitFor(() => expect(empty.dataState).toBe('empty'));
    await waitFor(() => expect(error.dataState).toBe('error'));
    await expect(partOf(empty, 'state').hidden).toBe(false);
    await expect(partOf(empty, 'frame').hidden).toBe(true);
  },
};

/** 200 item: đo vị trí 1 lần (ResizeObserver), cuộn gom theo frame — vẫn mượt */
export const ManyItems = {
  render: () => {
    const sc = document.createElement('hui-scroller');
    sc.setAttribute('item-width', '120');
    sc.setAttribute('gap', 'sm');
    sc.setAttribute('indicator', 'bar');
    sc.setAttribute('label', '200 mục');
    sc.innerHTML = '<template><div class="sc-num" data-bind="label" style="display: grid; place-items: center; height: 80px; border-radius: 8px; background: var(--hui-fill-secondary); font: 600 18px var(--hui-font-family);"></div></template>';
    sc.data = Array.from({ length: 200 }, (_, i) => ({ id: i, label: `#${i + 1}` }));
    sc.setAttribute('row-key', 'id');
    return sc;
  },
  play: async ({ canvasElement }) => {
    const sc = scrollerOf(canvasElement);
    await settle(sc);
    await expect(sc.items.length).toBe(200);
    sc.scrollToIndex(150, { smooth: false });
    await waitFor(() => expect(sc.currentIndex).toBe(150));
    await expect(sc.items[150].getAttribute('aria-label')).toBe('151 / 200');
  },
};

/** Override từ ngoài: biến CSS + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-scroller {
        --hui-scroller-gap: 12px;
        --hui-scroller-arrow-size: 44px;
        --hui-scroller-arrow-bg: var(--hui-primary);
        --hui-scroller-arrow-color: var(--hui-text-inverse);
        --hui-scroller-dot-size: 10px;
        --hui-scroller-dot-active-color: var(--hui-success);
        --hui-scroller-indicator-gap: 20px;
      }
      .brand-scroller::part(viewport) { border-radius: 16px; }
      .brand-scroller::part(prev),
      .brand-scroller::part(next) { border: none; }
      .brand-scroller::part(indicator) { justify-content: flex-start; }
    </style>
    <hui-scroller class="brand-scroller" items-per-view="2.5" arrows="always" indicator="dots" label="Tùy biến">${cards(8)}</hui-scroller>
  `,
  play: async ({ canvasElement }) => {
    const sc = scrollerOf(canvasElement);
    await settle(sc);
    const next = partOf(sc, 'next');
    await expect(getComputedStyle(next).width).toBe('44px');
    await expect(getComputedStyle(partOf(sc, 'track')).columnGap).toBe('12px');
  },
};

/** RTL: dir="rtl" — mũi tên, bàn phím (← = kế), lăn chuột, chấm đều đảo chiều */
export const RTL = {
  render: () => html`
    <div dir="rtl">
      <hui-scroller items-per-view="2.5" arrows="always" indicator="dots" no-animation label="RTL">${cards(8)}</hui-scroller>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sc = scrollerOf(canvasElement);
    await settle(sc);
    const viewport = partOf(sc, 'viewport');
    const prev = partOf(sc, 'prev');
    const next = partOf(sc, 'next');
    await waitFor(() => expect(sc.isRtl).toBe(true));
    await expect(partOf(sc, 'base').classList.contains('scroller--rtl')).toBe(true);
    // Mép đầu nằm bên phải: nút "trước" ở bên phải nút "kế", bắt đầu ở mép đầu
    await expect(prev.getBoundingClientRect().left).toBeGreaterThan(next.getBoundingClientRect().left);
    await waitFor(() => expect(prev.disabled).toBe(true));
    await expect(next.disabled).toBe(false);
    // Item đầu nằm sát mép phải
    const first = sc.items[0].getBoundingClientRect();
    await expect(Math.abs(first.right - viewport.getBoundingClientRect().right)).toBeLessThan(2);

    // Nút kế → cuộn về bên trái (scrollLeft âm), item 1
    next.click();
    await waitFor(() => expect(viewport.scrollLeft).toBeLessThan(-10));
    await expect(sc.currentIndex).toBe(1);
    await waitFor(() => expect(prev.disabled).toBe(false));

    // Bàn phím: ← = kế, → = trước
    viewport.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(sc.currentIndex).toBe(2));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(sc.currentIndex).toBe(1));
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(next.disabled).toBe(true));
    await expect(sc.currentPage).toBe(sc.pageCount - 1);
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(Math.abs(viewport.scrollLeft)).toBeLessThan(1));
    await expect(sc.currentIndex).toBe(0);

    // Chấm cuối → trang cuối
    const dots = sc.shadowRoot.querySelectorAll('[part~="dot"]');
    dots[dots.length - 1].click();
    await waitFor(() => expect(next.disabled).toBe(true));
    await waitFor(() => expect(dots[dots.length - 1].getAttribute('aria-current')).toBe('true'));
  },
};

/** RTL + thanh vị trí + lăn chuột dọc → ngang */
export const RTLWheelBar = {
  render: () => html`
    <div dir="rtl">
      <hui-scroller item-width="160" gap="sm" wheel indicator="bar" edge-fade scrollbar="hidden" no-animation label="RTL wheel">${cards(10)}</hui-scroller>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sc = scrollerOf(canvasElement);
    await settle(sc);
    const viewport = partOf(sc, 'viewport');
    // Lăn xuống → tiến về cuối (RTL: scrollLeft âm)
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
    await waitFor(() => expect(viewport.scrollLeft).toBeLessThan(-50));
    // Thanh vị trí chạy từ phải sang trái
    await waitFor(() => expect(partOf(sc, 'bar').style.transform).toMatch(/translateX\(-/));
    // Mép đầu đã bị che → không còn trạng thái at-start (bóng mờ hiện ở mép đầu)
    await waitFor(() => expect(partOf(sc, 'base').classList.contains('scroller--at-start')).toBe(false));
    // Lăn lên tới mép đầu → về 0
    viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: -1000, bubbles: true, cancelable: true }));
    await waitFor(() => expect(Math.abs(viewport.scrollLeft)).toBeLessThan(1));
  },
};
