import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

/** Ảnh minh họa bằng SVG data-URI, tỉ lệ khác nhau (không dùng tài nguyên mạng) */
const art = (w, h, hue, label) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 75% 70%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 70% 45%)"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.7}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.12}" fill="rgba(255,255,255,0.55)"/><path d="M0 ${h} L${w * 0.35} ${h * 0.6} L${w * 0.6} ${h * 0.8} L${w} ${h * 0.5} L${w} ${h} Z" fill="rgba(0,0,0,0.18)"/><text x="16" y="${h - 16}" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="white">${label}</text></svg>`
)}`;

const RATIOS = [[400, 520], [400, 300], [400, 640], [400, 400], [400, 260], [400, 560], [400, 340], [400, 480], [400, 300], [400, 600]];
const makeItems = (count, offset = 0) => Array.from({ length: count }, (_, i) => {
  const n = i + offset;
  const [w, h] = RATIOS[n % RATIOS.length];
  return { id: n + 1, title: `Ý tưởng #${n + 1}`, image: art(w, h, (n * 37) % 360, `#${n + 1}`), likes: 12 + ((n * 17) % 90) };
});

const card = 'border-radius: 12px; overflow: hidden; background: var(--hui-bg-elevated); box-shadow: var(--hui-shadow-sm);';

/** Kiểm tra theo tọa độ layout (offset*, không tính transform của hiệu ứng): không item nào chồng lên nhau */
function assertNoOverlap(items) {
  const rects = items.map((el) => ({ left: el.offsetLeft, top: el.offsetTop, right: el.offsetLeft + el.offsetWidth, bottom: el.offsetTop + el.offsetHeight }));
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i];
      const b = rects[j];
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX > 1 && overlapY > 1) throw new Error(`Item ${i} chồng lên item ${j}`);
    }
  }
}

export default {
  title: 'Organisms/HuiMasonry',
  component: 'hui-masonry',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Masonry** — lưới so le kiểu Pinterest. Mỗi item vào **cột đang thấp nhất**; thứ tự DOM giữ nguyên
(Tab / trình đọc màn hình đi đúng thứ tự). Tự xếp lại khi khung đổi bề rộng, item đổi chiều cao, ảnh tải xong,
thêm/bớt item. Item mới hiện bằng fade-up (tắt bằng \`no-animation\` / giảm chuyển động).

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`columns\` | \`3\` | Số cột (mobile-first) |
| \`columns-sm\` · \`-md\` · \`-lg\` · \`-xl\` | — | Số cột khi màn hình ≥ 576 / 768 / 992 / 1200px |
| \`gap\` | \`md\` | \`xs\` · \`sm\` · \`md\` · \`lg\` · \`xl\` · \`none\`, số (px) hoặc CSS length (ngang = dọc) |
| \`row-key\` | — | Trường làm key khi render từ \`data\` |
| \`no-animation\` | — | Tắt hiệu ứng hiện / trượt |
| \`src\` · \`data-path\` · \`params\` · \`loading\` · \`empty-text\` | — | DataController (tự tải JSON) |

**Thuộc tính JS:** \`data\`, \`fetchFn\`, \`columnCount\` (chỉ đọc), \`items\` (chỉ đọc) · **Phương thức:** \`refresh()\`, \`reload()\`
**Sự kiện:** \`hui-layout\` {columns, height, count}, \`hui-action\` {action, item, index}, \`hui-load\`, \`hui-error\`
**Template:** \`<template>\` con với \`data-bind\`, \`data-bind-attr\`, \`data-action\`… (xem Foundations/Template)
**Slot:** mặc định (item) · **Parts:** \`base\`, \`grid\`, \`state\`

| Biến CSS | Mặc định | Mô tả |
|----------|----------|-------|
| \`--hui-masonry-gap\` | \`--hui-space-lg\` | Khoảng cách (khi không có attribute gap) |
| \`--hui-masonry-duration\` | \`--hui-motion-duration-slow\` | Thời gian trượt khi xếp lại |

**Lưu ý:** item được đặt \`position: absolute\` + \`top\` / \`inset-inline-start\` / \`width\` inline; \`margin\` của item bị bỏ qua — dùng \`gap\`.
**Bàn phím:** không có tương tác riêng; thứ tự Tab theo DOM.
        `,
      },
    },
  },
  argTypes: {
    columns: { control: { type: 'number', min: 1, max: 6 } },
    gap: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'] },
  },
};

export const Default = {
  args: { columns: 2, gap: 'md' },
  render: (args) => html`
    <hui-masonry columns=${args.columns} columns-md="3" columns-xl="4" gap=${args.gap}>
      ${makeItems(10).map((it) => html`
        <article style=${card}>
          <img src=${it.image} alt=${it.title} style="display: block; width: 100%; height: auto;">
          <div style="padding: 10px 12px; font-size: 14px;"><strong>${it.title}</strong></div>
        </article>
      `)}
    </hui-masonry>
  `,
  play: async ({ canvasElement }) => {
    const m = canvasElement.querySelector('hui-masonry');
    const items = [...m.querySelectorAll(':scope > article')];
    await waitFor(() => expect(items.every((el) => el.style.top !== '')).toBe(true));
    // Đợi ảnh tải + xếp lại
    await waitFor(() => expect(items.every((el) => el.querySelector('img').complete)).toBe(true));
    await new Promise((r) => setTimeout(r, 100));
    assertNoOverlap(items);
    const cols = m.columnCount;
    const lefts = new Set(items.map((el) => el.offsetLeft));
    await expect(lefts.size).toBe(cols);
    // Khung cao bằng cột cao nhất
    const grid = m.shadowRoot.querySelector('[part="grid"]');
    const maxBottom = Math.max(...items.map((el) => el.offsetTop + el.offsetHeight));
    await expect(Math.abs(maxBottom - grid.clientHeight)).toBeLessThan(2);
    // Thứ tự DOM giữ nguyên
    await expect([...m.children].filter((c) => c.localName === 'article')).toEqual(items);
  },
};

export const ShortestColumn = {
  name: 'Xếp vào cột thấp nhất',
  render: () => html`
    <hui-masonry columns="3" gap="8" no-animation style="max-width: 360px;">
      ${[200, 60, 60, 60, 60, 40].map((h, i) => html`<div style="height: ${h}px; background: var(--hui-primary-${(i % 5) + 2}); border-radius: 6px;">${i + 1}</div>`)}
    </hui-masonry>
  `,
  play: async ({ canvasElement }) => {
    const m = canvasElement.querySelector('hui-masonry');
    const els = [...m.children];
    await waitFor(() => expect(els.every((el) => el.style.top !== '')).toBe(true));
    const pos = els.map((el) => ({ left: parseFloat(el.style.insetInlineStart), top: parseFloat(el.style.top) }));
    // 1|2|3 hàng đầu; 4 vào cột 2 (cột 2 & 3 bằng nhau → lấy bên trái), 5 vào cột 3, 6 vào cột 2
    await expect(pos[0].left).toBe(0);
    await expect(pos[3].left).toBe(pos[1].left);
    await expect(pos[3].top).toBe(68);
    await expect(pos[4].left).toBe(pos[2].left);
    await expect(pos[5].left).toBe(pos[1].left);
    await expect(pos[5].top).toBe(136);
    // Item đổi chiều cao → tự xếp lại (ResizeObserver)
    let layouts = 0;
    m.addEventListener('hui-layout', () => layouts++);
    els[1].style.height = '300px';
    await waitFor(() => expect(parseFloat(els[3].style.insetInlineStart)).toBe(pos[2].left));
    await expect(layouts).toBeGreaterThan(0);
    // Đổi số cột
    m.columns = 2;
    await waitFor(() => expect(m.columnCount).toBe(2));
    await waitFor(() => expect(new Set(els.map((el) => el.style.insetInlineStart)).size).toBe(2));
  },
};

export const DataTemplate = {
  name: 'data + template + tải thêm',
  render: () => html`
    <div style="display: grid; gap: 16px;">
      <hui-masonry class="m-data" columns="2" columns-md="3" row-key="id">
        <template>
          <article style="border-radius: 12px; overflow: hidden; background: var(--hui-bg-elevated); box-shadow: var(--hui-shadow-sm);">
            <img data-bind-attr="src:image, alt:title" style="display: block; width: 100%; height: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; font-size: 14px;">
              <strong data-bind="title"></strong>
              <button type="button" data-action="like" style="border: 0; background: none; cursor: pointer; color: var(--hui-danger);">♥ <span data-bind="likes"></span></button>
            </div>
          </article>
        </template>
      </hui-masonry>
      <hui-button class="more" variant="outline">Tải thêm 6 ảnh</hui-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const m = canvasElement.querySelector('.m-data');
    m.data = makeItems(6);
    await waitFor(() => expect(m.items.length).toBe(6));
    const more = canvasElement.querySelector('.more');
    more.addEventListener('click', () => { m.data = [...m.data, ...makeItems(6, m.data.length)]; });
    more.click();
    await waitFor(() => expect(m.items.length).toBe(12));
    await waitFor(() => expect(m.items.every((el) => el.style.top !== '')).toBe(true));
    let action = null;
    m.addEventListener('hui-action', (e) => { action = e.detail; });
    m.items[2].querySelector('[data-action="like"]').click();
    await expect(action.action).toBe('like');
    await expect(action.item.id).toBe(3);
    await new Promise((r) => setTimeout(r, 150));
    assertNoOverlap(m.items);
  },
};

export const States = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      <hui-masonry class="loading" loading></hui-masonry>
      <hui-masonry class="empty" empty-text="Chưa có ảnh nào"></hui-masonry>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const empty = canvasElement.querySelector('.empty');
    empty.data = [];
    await waitFor(() => expect(empty.dataState).toBe('empty'));
    await expect(empty.shadowRoot.querySelector('[part="state"]').hidden).toBe(false);
    const loading = canvasElement.querySelector('.loading');
    await expect(loading.getAttribute('aria-busy')).toBe('true');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-masonry.brand {
        --hui-masonry-gap: 6px;
        --hui-masonry-duration: 600ms;
      }
      hui-masonry.brand::part(grid) { outline: 2px dashed var(--hui-primary-3); outline-offset: 8px; }
      hui-masonry.brand img { display: block; width: 100%; border-radius: 4px; }
    </style>
    <hui-masonry class="brand" columns="3" columns-lg="5">
      ${makeItems(12).map((it) => html`<img src=${it.image} alt=${it.title}>`)}
    </hui-masonry>
  `,
};
