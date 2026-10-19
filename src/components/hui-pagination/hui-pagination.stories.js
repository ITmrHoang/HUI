/**
 * Storybook Stories — HUI Pagination
 * Ant Pagination + MUI Pagination: nút "•••" nhảy 5 trang, chọn số mục / trang, đến trang, simple, size.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const pagesOf = (el) => [...el.shadowRoot.querySelectorAll('[part~="item"]')].map((b) => b.textContent);

export default {
  title: 'Components/HuiPagination',
  component: 'hui-pagination',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Pagination** — Phân trang. ≤ 9 trang hiện đủ; nhiều hơn: \`1 … (hiện tại ± 2) … cuối\`, nút "•••" nhảy ±5 trang
(hover hiện mũi tên). Chữ theo locale \`pagination.*\` (đổi bằng \`setLocale\`).

\`\`\`html
<hui-pagination total="500" current="1" page-size="20" show-size-changer show-quick-jumper show-total
  @change=\${(e) => load(e.detail.current, e.detail.pageSize)}></hui-pagination>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`total\` | number | \`0\` | Tổng số mục |
| \`current\` | number | \`1\` | Trang hiện tại (tự cập nhật khi người dùng đổi trang) |
| \`page-size\` | number | \`10\` | Số mục / trang |
| \`page-size-options\` | string | \`"10,20,50,100"\` | Lựa chọn số mục / trang |
| \`show-size-changer\` | boolean | \`false\` | Ô chọn số mục / trang (hui-select) |
| \`show-quick-jumper\` | boolean | \`false\` | Ô "Đến trang" (Enter / blur để nhảy) |
| \`show-total\` | boolean | \`false\` | "Tổng N mục" — property \`totalFormat(total, [from, to])\` để đổi chữ |
| \`simple\` | boolean | \`false\` | Dạng gọn ‹ [3] / 10 › |
| \`size\` | \`sm \\| md\` | \`md\` | Kích thước |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa |
| \`hide-on-single-page\` | boolean | \`false\` | Chỉ 1 trang thì ẩn |

Getter \`pageCount\`: tổng số trang.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ current, pageSize }\` | Đổi trang / số mục mỗi trang do người dùng. Đổi page-size giữ mục đầu trang hiện tại trong trang mới |

### Bàn phím & ARIA
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Đi qua các nút trang, ô chọn số mục, ô "Đến trang" |
| \`Enter\` / \`Space\` | Bấm nút đang focus (focus giữ nguyên trên nút tương ứng sau khi đổi trang) |
| \`Enter\` trong ô nhập | Nhảy tới trang (tự kẹp trong [1, số trang]) |

\`<nav aria-label>\` landmark; nút có \`aria-label\` (\`pagination.prev\` / \`next\` / \`page\`), trang hiện tại \`aria-current="page"\`.

### Parts
\`base\`, \`total\`, \`list\`, \`item\` (+ \`item-active\`), \`prev\`, \`next\`, \`jump-prev\`, \`jump-next\`, \`size-changer\`,
\`quick-jumper\`, \`jumper-input\`, \`simple-pager\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-pagination-item-size\` | Kích thước nút |
| \`--hui-pagination-item-radius\` | Bo góc |
| \`--hui-pagination-item-color\` / \`--hui-pagination-item-bg\` / \`--hui-pagination-item-hover-bg\` | Nút thường |
| \`--hui-pagination-active-color\` / \`--hui-pagination-active-bg\` / \`--hui-pagination-active-border-color\` | Trang hiện tại |
| \`--hui-pagination-gap\` / \`--hui-pagination-font-size\` | Khoảng cách / cỡ chữ |
        `,
      },
    },
  },
  argTypes: {
    total: { control: 'number' },
    current: { control: 'number' },
    'page-size': { control: 'number' },
    size: { control: 'radio', options: ['sm', 'md'] },
    simple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    'show-size-changer': { control: 'boolean' },
    'show-quick-jumper': { control: 'boolean' },
    'show-total': { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="padding-bottom: 220px;">
      <hui-pagination total=${args.total} current=${args.current} page-size=${args['page-size']} size=${args.size}
        ?simple=${args.simple} ?disabled=${args.disabled} ?show-size-changer=${args['show-size-changer']}
        ?show-quick-jumper=${args['show-quick-jumper']} ?show-total=${args['show-total']}
        @change=${(e) => console.log('[hui-pagination] change', e.detail)}></hui-pagination>
    </div>
  `,
  args: {
    total: 500, current: 1, 'page-size': 10, size: 'md', simple: false, disabled: false,
    'show-size-changer': true, 'show-quick-jumper': true, 'show-total': true,
  },
};

/** Ít trang (hiện đủ) và nhiều trang (rút gọn bằng "•••"). Bấm trang → change { current, pageSize }. */
export const Basic = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      <hui-pagination total="50"></hui-pagination>
      <hui-pagination id="pg-basic" total="200" current="6"></hui-pagination>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const pg = canvasElement.querySelector('#pg-basic');
    const events = [];
    pg.addEventListener('change', (e) => events.push(e.detail));
    await expect(pg.pageCount).toBe(20);
    await expect(pagesOf(pg)).toEqual(['1', '4', '5', '6', '7', '8', '20']);
    await expect(pg.shadowRoot.querySelector('[aria-current="page"]').textContent).toBe('6');
    await expect(pg.shadowRoot.querySelector('nav').getAttribute('aria-label')).toBeTruthy();

    pg.shadowRoot.querySelector('[data-id="page-8"]').click();
    await expect(events).toEqual([{ current: 8, pageSize: 10 }]);
    await waitFor(() => expect(pg.shadowRoot.querySelector('[aria-current="page"]').textContent).toBe('8'));

    pg.shadowRoot.querySelector('[part~="jump-next"]').click();
    await expect(events[1]).toEqual({ current: 13, pageSize: 10 });

    pg.shadowRoot.querySelector('[part~="next"]').click();
    await expect(events[2].current).toBe(14);
    await expect(pg.current).toBe(14);

    // Trang cuối → nút "trang sau" bị vô hiệu
    pg.current = 20;
    await waitFor(() => expect(pg.shadowRoot.querySelector('[part~="next"]').disabled).toBe(true));
    await expect(pagesOf(pg)).toEqual(['1', '16', '17', '18', '19', '20']);
  },
};

/** Đầy đủ: tổng, chọn số mục / trang (hui-select), đến trang. */
export const Full = {
  render: () => html`
    <div style="padding-bottom: 220px;">
      <hui-pagination id="pg-full" total="85" current="5" show-total show-size-changer show-quick-jumper></hui-pagination>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const pg = canvasElement.querySelector('#pg-full');
    const events = [];
    pg.addEventListener('change', (e) => events.push(e.detail));
    await expect(pg.pageCount).toBe(9);
    await waitFor(() => expect(pg.shadowRoot.querySelector('[part="total"]').textContent).toContain('85'));

    // Đổi page-size qua hui-select: change của select bị chặn, pagination phát change riêng
    const select = pg.shadowRoot.querySelector('hui-select');
    await waitFor(() => expect(select.options.length).toBe(4));
    select.shadowRoot.querySelector('[part~="trigger"]').click();
    const option = await waitFor(() => {
      const el = [...select.shadowRoot.querySelectorAll('[role="option"]')].find((o) => o.textContent.startsWith('20'));
      expect(el).toBeTruthy();
      return el;
    });
    option.click();
    // Mục đầu trang 5 (mục 41) → trang 3 khi 20 mục / trang
    await expect(events).toEqual([{ current: 3, pageSize: 20 }]);
    await waitFor(() => expect(pg.pageCount).toBe(5));

    // Quick jumper: nhập 99 → kẹp về trang cuối
    const input = pg.shadowRoot.querySelector('[part="quick-jumper"] input');
    input.value = '99';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await expect(events[1]).toEqual({ current: 5, pageSize: 20 });
    await expect(input.value).toBe('');
  },
};

/** Tùy biến chữ tổng bằng property totalFormat. */
export const TotalFormat = {
  render: () => html`
    <hui-pagination id="pg-format" total="85" current="2" .totalFormat=${(total, [from, to]) => `${from}-${to} / ${total}`}></hui-pagination>
  `,
  play: async ({ canvasElement }) => {
    const pg = canvasElement.querySelector('#pg-format');
    await waitFor(() => expect(pg.shadowRoot.querySelector('[part="total"]').textContent).toBe('11-20 / 85'));
  },
};

/** Simple, size sm, disabled, hide-on-single-page. */
export const Variants = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      <hui-pagination id="pg-simple" simple total="120" current="3"></hui-pagination>
      <hui-pagination size="sm" total="300" current="10"></hui-pagination>
      <hui-pagination disabled total="300" current="10"></hui-pagination>
      <div>hide-on-single-page (total=5): <hui-pagination id="pg-hide" hide-on-single-page total="5"></hui-pagination>(ẩn)</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const simple = canvasElement.querySelector('#pg-simple');
    const input = simple.shadowRoot.querySelector('[part~="simple-pager"] input');
    await expect(input.value).toBe('3');
    const events = [];
    simple.addEventListener('change', (e) => events.push(e.detail.current));
    input.value = '7';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await expect(events).toEqual([7]);
    await expect(canvasElement.querySelector('#pg-hide').shadowRoot.querySelector('nav').hidden).toBe(true);
  },
};

/** Override từ bên ngoài — biến CSS + ::part(). */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .pg-brand {
        --hui-pagination-item-radius: 999px;
        --hui-pagination-active-bg: var(--hui-primary);
        --hui-pagination-active-color: var(--hui-text-light-solid);
        --hui-pagination-item-size: 36px;
      }
      .pg-brand hui-pagination::part(prev),
      .pg-brand hui-pagination::part(next) { border: 1px solid var(--hui-border); }
    </style>
    <div class="pg-brand"><hui-pagination id="pg-custom" total="120" current="4"></hui-pagination></div>
  `,
  play: async ({ canvasElement }) => {
    const pg = canvasElement.querySelector('#pg-custom');
    const active = pg.shadowRoot.querySelector('[aria-current="page"]');
    await waitFor(() => expect(getComputedStyle(active).height).toBe('36px'));
  },
};
