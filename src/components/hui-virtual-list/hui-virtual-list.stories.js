/**
 * Storybook Stories — HUI Virtual List
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-tag/index.js';

const FIRST = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Khoa', 'Linh', 'Minh', 'Nam', 'Oanh', 'Phúc', 'Quân', 'Sơn', 'Trang', 'Vy'];
const LAST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const LOREM = 'Danh sách ảo chỉ render những dòng đang nhìn thấy nên cuộn mượt kể cả khi có hàng chục nghìn dòng dữ liệu.';

/** Dữ liệu giả cố định (không ngẫu nhiên → test ổn định) */
const makeRows = (n, from = 0) => Array.from({ length: n }, (_, k) => {
  const i = from + k;
  return {
    id: i + 1,
    name: `${LAST[i % LAST.length]} ${FIRST[(i * 7) % FIRST.length]}`,
    email: `user${i + 1}@example.com`,
    note: LOREM.slice(0, 20 + ((i * 37) % LOREM.length)),
  };
});

const ROWS_10K = makeRows(10000);

const rowsOf = (el) => [...el.children].filter((n) => n.dataset?.index !== undefined);
const nextEvent = (el, type) => new Promise((resolve) => el.addEventListener(type, (e) => resolve(e), { once: true }));

const rowStyles = html`
  <style>
    .vl-demo .row { display: flex; align-items: center; gap: 12px; padding: 0 16px; border-bottom: 1px solid var(--hui-border); font-size: 14px; }
    .vl-demo .row .idx { width: 56px; color: var(--hui-text-muted); font-variant-numeric: tabular-nums; }
    .vl-demo .row .mail { margin-inline-start: auto; color: var(--hui-text-secondary); }
    .vl-demo .card { padding: 12px 16px; border-bottom: 1px solid var(--hui-border); font-size: 14px; }
    .vl-demo .card p { margin: 4px 0 0; color: var(--hui-text-secondary); }
  </style>
`;

export default {
  title: 'Organisms/HuiVirtualList',
  component: 'hui-virtual-list',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Virtual List** — Danh sách rất dài (10.000+ dòng) chỉ render các dòng đang nhìn thấy (+ \`overscan\`), dựa trên
\`VirtualWindow\` (src/utils/virtual.js). Dòng cao cố định (\`item-height\`) hoặc **tự đo** (ước lượng \`estimated-height\` rồi đo
thật bằng ResizeObserver, giữ nguyên vị trí đang đọc khi dòng phía trên đổi cao). Nền móng cho Select / Table / Tree.

\`\`\`html
<hui-virtual-list item-height="40" height="360" row-key="id">
  <template>
    <div class="row"><b data-bind="name"></b> <span data-bind="email"></span></div>
  </template>
</hui-virtual-list>
<script>list.data = rows; // 10.000 dòng</script>
\`\`\`

Dòng được render vào **light DOM** (CSS của trang áp dụng được). Khuôn dòng: \`<template>\` con (binding \`data-bind\`… của
src/core/template.js — chỉ textContent / setAttribute, an toàn) hoặc property \`renderItem(item, index)\` trả Node / chuỗi.
Template phải có **1 phần tử gốc**; dùng padding thay margin giữa các dòng (margin không được tính vào kích thước đo).

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`item-height\` | number | — | Kích thước cố định mỗi dòng (px, theo trục cuộn). Bỏ trống = tự đo |
| \`estimated-height\` | number | \`48\` | Ước lượng cho dòng chưa đo (chế độ tự đo) |
| \`height\` | string | \`400px\` | Chiều cao vùng cuộn (số = px). Ngang: mặc định \`auto\` |
| \`overscan\` | number | \`6\` | Số dòng render dư mỗi phía |
| \`horizontal\` | boolean | \`false\` | Cuộn ngang |
| \`row-key\` | string | — | Trường làm key: giữ node + kích thước đã đo khi dữ liệu đổi / thêm |
| \`selectable\` | boolean | \`false\` | Chế độ chọn: \`role="listbox"\`, bàn phím APG |
| \`value\` | string | — | Key dòng đang chọn (row-key, hoặc vị trí khi không có row-key) |
| \`end-threshold\` | number | \`200\` | Cách cuối ≤ N px → phát \`hui-reach-end\` |
| \`loading-more\` | boolean | \`false\` | Hiện "Đang tải thêm…" ở cuối, tạm ngừng phát \`hui-reach-end\` |
| \`bordered\` | boolean | \`false\` | Viền + bo góc |
| \`label\` | string | locale | Nhãn ARIA |
| \`src\` / \`data-path\` / \`params\` / \`loading\` / \`empty-text\` | | | DataController (xem HuiDataView) |

### Properties & Methods
| Tên | Mô tả |
|-----|-------|
| \`data\` | Mảng dữ liệu |
| \`renderItem\` | \`(item, index) => Node \\| string\` |
| \`fetchFn\` | \`async (params, { signal }) => Array \\| { data, total }\` |
| \`scrollToIndex(i, align)\` | \`align\`: \`start\` \\| \`center\` \\| \`end\` \\| \`auto\` — trả Promise khi vị trí ổn định |
| \`refresh()\` | Bỏ kích thước đã đo, đo lại |
| \`renderedRange\` | \`{ start, end }\` đang render (chỉ đọc) |
| \`activeIndex\` | Dòng active khi điều khiển bằng bàn phím (chỉ đọc) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-select\` | \`{ item, index, key }\` | (selectable) click / Enter / Space |
| \`hui-reach-end\` | \`{ count }\` | Cuộn gần cuối — mỗi độ dài dữ liệu phát 1 lần |
| \`hui-range-change\` | \`{ start, end }\` | Khoảng dòng render đổi |
| \`hui-action\` | \`{ action, item, index }\` | Bấm phần tử \`data-action\` trong template |
| \`hui-load\` / \`hui-error\` | | DataController |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | \`<template>\` khuôn dòng; các dòng render vào đây |
| \`footer\` | Thay nội dung vùng "đang tải thêm" |

### Parts
\`base\`, \`viewport\`, \`spacer\`, \`window\`, \`footer\`, \`state\`.

### CSS Variables
\`--hui-virtual-list-height\`, \`--hui-virtual-list-bg\`, \`--hui-virtual-list-border-color\`, \`--hui-virtual-list-radius\`,
\`--hui-virtual-list-row-padding\`, \`--hui-virtual-list-split-color\`, \`--hui-virtual-list-hover-bg\`,
\`--hui-virtual-list-selected-bg\`, \`--hui-virtual-list-selected-color\`, \`--hui-virtual-list-focus-color\`.

Dòng nhận \`data-index\`, \`role\` (\`listitem\` / \`option\`), \`aria-setsize\`, \`aria-posinset\`, \`aria-selected\`, \`data-hui-active\`
→ style được bằng CSS trang, vd \`hui-virtual-list [aria-selected="true"] { … }\`.

### Bàn phím
| Phím | Chế độ | Tác dụng |
|------|--------|----------|
| Tab | mọi | Focus vùng cuộn (thường) / cả listbox (selectable) |
| ↑ ↓ (ngang: ← →) | selectable | Dòng trước / sau (tự cuộn tới) |
| Home / End | selectable | Dòng đầu / cuối |
| PageUp / PageDown | selectable | Lùi / tiến 1 khung nhìn |
| Enter / Space | selectable | Chọn dòng active |
| ↑ ↓ PageUp PageDown Home End | thường | Cuộn (trình duyệt) |

Selectable dùng \`aria-activedescendant\` trên host (focus không rời host khi dòng bị gỡ khỏi DOM do ảo hóa).
Hạn chế: chế độ \`horizontal\` chưa hỗ trợ RTL; chưa ảo hóa dạng lưới nhiều cột.
        `,
      },
    },
  },
  argTypes: {
    itemHeight: { control: 'number' },
    height: { control: 'text' },
    overscan: { control: 'number' },
    selectable: { control: 'boolean' },
    bordered: { control: 'boolean' },
  },
};

/** 10.000 dòng, cao cố định 40px, khuôn <template> */
export const Default = {
  args: { itemHeight: 40, height: '360', overscan: 6, selectable: false, bordered: true },
  render: (args) => html`
    ${rowStyles}
    <div class="vl-demo">
      <hui-virtual-list item-height=${args.itemHeight} height=${args.height} overscan=${args.overscan}
        ?selectable=${args.selectable} ?bordered=${args.bordered} row-key="id" label="Người dùng" .data=${ROWS_10K}>
        <template>
          <div class="row"><span class="idx" data-bind="id"></span><strong data-bind="name"></strong><span class="mail" data-bind="email"></span></div>
        </template>
      </hui-virtual-list>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-virtual-list');
    await waitFor(() => expect(rowsOf(el).length).toBeGreaterThan(5));
    // Chỉ render phần nhìn thấy: 360/40 = 9 dòng + overscan
    await expect(rowsOf(el).length).toBeLessThan(30);
    const first = rowsOf(el)[0];
    await expect(first.getAttribute('aria-setsize')).toBe('10000');
    await expect(first.getAttribute('aria-posinset')).toBe('1');
    await expect(first.querySelector('strong').textContent).toBe(ROWS_10K[0].name);
    const spacer = el.shadowRoot.querySelector('[part="spacer"]');
    await expect(spacer.style.height).toBe('400000px');

    // Nhảy tới giữa danh sách
    const range = nextEvent(el, 'hui-range-change');
    await el.scrollToIndex(5000);
    await range;
    await waitFor(() => expect(rowsOf(el).some((r) => r.dataset.index === '5000')).toBe(true));
    await expect(el.shadowRoot.querySelector('[part="viewport"]').scrollTop).toBe(200000);
    await expect(rowsOf(el).length).toBeLessThan(30);
    const row = rowsOf(el).find((r) => r.dataset.index === '5000');
    await expect(row.querySelector('.idx').textContent).toBe('5001');
  },
};

/** Dòng cao khác nhau — tự đo bằng ResizeObserver */
export const DynamicHeights = {
  render: () => html`
    ${rowStyles}
    <div class="vl-demo">
      <hui-virtual-list height="360" estimated-height="60" bordered row-key="id" .data=${makeRows(3000)}>
        <template>
          <div class="card"><strong data-bind="name"></strong> · <span data-bind="email"></span><p data-bind="note"></p></div>
        </template>
      </hui-virtual-list>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-virtual-list');
    const vp = el.shadowRoot.querySelector('[part="viewport"]');
    await waitFor(() => expect(rowsOf(el).length).toBeGreaterThan(3));
    await el.scrollToIndex(1500, 'start');
    await waitFor(() => {
      const row = rowsOf(el).find((r) => r.dataset.index === '1500');
      expect(row).toBeTruthy();
      // Mép trên dòng 1500 trùng mép trên vùng cuộn (sai số làm tròn)
      expect(Math.abs(row.getBoundingClientRect().top - vp.getBoundingClientRect().top)).toBeLessThan(3);
    });
    // Dòng đã render đều có kích thước thật (không cắt) — dòng kề nhau nối tiếp không chồng lên nhau
    const rows = rowsOf(el);
    for (let k = 1; k < rows.length; k++) {
      const a = rows[k - 1].getBoundingClientRect();
      const b = rows[k].getBoundingClientRect();
      await expect(Math.abs(b.top - a.bottom)).toBeLessThan(1.5);
    }
  },
};

/** renderItem — tự dựng node bằng code (không template) */
export const RenderItem = {
  render: () => {
    const renderItem = (item, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.style.height = '100%';
      const badge = document.createElement('hui-tag');
      badge.textContent = i % 3 === 0 ? 'VIP' : 'Thường';
      badge.setAttribute('color', i % 3 === 0 ? 'warning' : 'info');
      const name = document.createElement('span');
      name.textContent = item.name;
      row.append(badge, name);
      return row;
    };
    return html`
      ${rowStyles}
      <div class="vl-demo">
        <hui-virtual-list item-height="44" height="300" bordered .renderItem=${renderItem} .data=${makeRows(500)}></hui-virtual-list>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-virtual-list');
    await waitFor(() => expect(rowsOf(el).length).toBeGreaterThan(3));
    await expect(rowsOf(el)[0].querySelector('span').textContent).toBe(makeRows(1)[0].name);
    await expect(rowsOf(el)[0].getAttribute('role')).toBe('listitem');
  },
};

/** Chọn bằng chuột / bàn phím (listbox APG) */
export const Selectable = {
  render: () => html`
    ${rowStyles}
    <div class="vl-demo">
      <hui-virtual-list selectable item-height="40" height="240" bordered row-key="id" label="Chọn người dùng" .data=${makeRows(1000)}>
        <template><div class="row"><span class="idx" data-bind="id"></span><span data-bind="name"></span></div></template>
      </hui-virtual-list>
      <p class="out" role="status" style="font-size: 14px;"></p>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-virtual-list');
    const out = canvasElement.querySelector('.out');
    el.addEventListener('hui-select', (e) => { out.textContent = `Đã chọn: ${e.detail.item.name} (#${e.detail.key})`; });
    await waitFor(() => expect(rowsOf(el).length).toBeGreaterThan(3));
    await expect(el.getAttribute('role')).toBe('listbox');
    await expect(rowsOf(el)[0].getAttribute('role')).toBe('option');

    el.focus();
    await waitFor(() => expect(el.activeIndex).toBe(0));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(el.activeIndex).toBe(2);
    await expect(el.getAttribute('aria-activedescendant')).toBe(rowsOf(el).find((r) => r.dataset.index === '2').id);
    await userEvent.keyboard('{Enter}');
    await expect(el.value).toBe('3');
    await waitFor(() => expect(rowsOf(el).find((r) => r.dataset.index === '2').getAttribute('aria-selected')).toBe('true'));

    // End → dòng cuối (tự cuộn tới, dòng có trong DOM)
    const select = nextEvent(el, 'hui-select');
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(rowsOf(el).some((r) => r.dataset.index === '999')).toBe(true));
    await userEvent.keyboard(' ');
    const e = await select;
    await expect(e.detail.index).toBe(999);
    await expect(e.detail.key).toBe(1000);
    await expect(out.textContent).toContain('#1000');

    // Click chọn
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(rowsOf(el).some((r) => r.dataset.index === '0')).toBe(true));
    await userEvent.click(rowsOf(el).find((r) => r.dataset.index === '1'));
    await expect(el.value).toBe('2');
    await expect(el.activeIndex).toBe(1);
  },
};

/** Tải thêm khi cuộn gần cuối (hui-reach-end + loading-more) */
export const InfiniteLoading = {
  render: () => html`
    ${rowStyles}
    <div class="vl-demo">
      <hui-virtual-list class="inf" item-height="40" height="280" bordered row-key="id" .data=${makeRows(40)}
        @hui-reach-end=${(e) => {
          const el = e.currentTarget;
          if (el.data.length >= 200) return;
          el.loadingMore = true;
          setTimeout(() => {
            el.data = [...el.data, ...makeRows(40, el.data.length)];
            el.loadingMore = false;
          }, 300);
        }}>
        <template><div class="row"><span class="idx" data-bind="id"></span><span data-bind="name"></span></div></template>
      </hui-virtual-list>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-virtual-list');
    const vp = el.shadowRoot.querySelector('[part="viewport"]');
    await waitFor(() => expect(rowsOf(el).length).toBeGreaterThan(3));
    const reach = nextEvent(el, 'hui-reach-end');
    vp.scrollTop = vp.scrollHeight;
    const e = await reach;
    await expect(e.detail.count).toBe(40);
    await waitFor(() => expect(el.shadowRoot.querySelector('[part="footer"]').hidden).toBe(false));
    await waitFor(() => expect(el.data.length).toBe(80));
    await waitFor(() => expect(el.loadingMore).toBe(false));
    await expect(el.shadowRoot.querySelector('[part="footer"]').hidden).toBe(true);
  },
};

/** Ngang — 2.000 thẻ rộng 120px */
export const Horizontal = {
  render: () => html`
    <style>
      .h-card { box-sizing: border-box; height: 96px; margin: 0; padding: 12px; border-inline-end: 1px solid var(--hui-border);
        display: flex; flex-direction: column; justify-content: space-between; font-size: 13px; }
      .h-card b { font-size: 20px; color: var(--hui-primary); }
    </style>
    <hui-virtual-list horizontal item-height="120" bordered .data=${makeRows(2000)}>
      <template><div class="h-card"><b data-bind="id"></b><span data-bind="name"></span></div></template>
    </hui-virtual-list>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-virtual-list');
    await waitFor(() => expect(rowsOf(el).length).toBeGreaterThan(2));
    const vp = el.shadowRoot.querySelector('[part="viewport"]');
    await expect(el.shadowRoot.querySelector('[part="spacer"]').style.width).toBe('240000px');
    await expect(vp.clientHeight).toBeGreaterThan(90);
    await el.scrollToIndex(1000);
    await waitFor(() => expect(vp.scrollLeft).toBe(120000));
    await waitFor(() => expect(rowsOf(el).some((r) => r.dataset.index === '1000')).toBe(true));
    await expect(rowsOf(el).length).toBeLessThan(40);
  },
};

/** Trạng thái: đang tải / rỗng / lỗi (DataController) */
export const States = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
      <hui-virtual-list class="loading" loading height="200" bordered .data=${[]}></hui-virtual-list>
      <hui-virtual-list class="empty" height="200" bordered empty-text="Không có người dùng" .data=${[]}></hui-virtual-list>
      <hui-virtual-list class="error" height="200" bordered .fetchFn=${async () => { throw new Error('Mất kết nối'); }}></hui-virtual-list>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const q = (s) => canvasElement.querySelector(s);
    const stateOf = (el) => el.shadowRoot.querySelector('[part="state"]');
    await waitFor(() => expect(stateOf(q('.loading')).querySelector('hui-skeleton')).not.toBeNull());
    await expect(q('.loading').getAttribute('aria-busy')).toBe('true');
    await waitFor(() => expect(stateOf(q('.empty')).querySelector('hui-empty')).not.toBeNull());
    await expect(q('.empty').shadowRoot.querySelector('[part="viewport"]').hidden).toBe(true);
    await waitFor(() => expect(stateOf(q('.error')).querySelector('hui-result')).not.toBeNull());
    await expect(q('.error').dataState).toBe('error');
  },
};

/** Override từ ngoài: biến CSS + ::part + CSS trang cho dòng */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .vl-brand {
        --hui-virtual-list-bg: var(--hui-bg-secondary);
        --hui-virtual-list-border-color: var(--hui-primary);
        --hui-virtual-list-radius: 4px;
        --hui-virtual-list-selected-bg: var(--hui-primary);
        --hui-virtual-list-selected-color: var(--hui-text-inverse);
        --hui-virtual-list-row-padding: 10px 20px;
      }
      .vl-brand::part(viewport) { scrollbar-width: thin; }
      .vl-brand [data-index]:nth-child(even) { font-style: italic; }
    </style>
    <hui-virtual-list class="vl-brand" selectable bordered height="220" value="2"
      .data=${Array.from({ length: 300 }, (_, i) => `Mục số ${i + 1}`)}></hui-virtual-list>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-virtual-list');
    await waitFor(() => expect(rowsOf(el).length).toBeGreaterThan(3));
    const row = rowsOf(el).find((r) => r.dataset.index === '2');
    await expect(row.textContent).toBe('Mục số 3');
    await expect(row.getAttribute('aria-selected')).toBe('true');
    await expect(getComputedStyle(row).paddingLeft).toBe('20px');
    await expect(getComputedStyle(el.shadowRoot.querySelector('[part="viewport"]')).scrollbarWidth).toBe('thin');
  },
};
