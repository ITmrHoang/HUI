/**
 * Storybook Stories — HUI KPI Row (Organism)
 * Dải ô KPI từ data (hui-stat-card): 4 ô có sparkline, bấm chọn ô, loading skeleton, cuộn ngang trên mobile,
 * ô đặt sẵn, trạng thái dữ liệu, tùy biến từ ngoài.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

// ---------- Dữ liệu mẫu ----------
const KPIS = [
  { key: 'revenue', title: 'Doanh thu', value: 128450000, suffix: ' ₫', delta: 12.4, deltaLabel: 'so với tháng trước', icon: 'star', color: 'primary', trend: [42, 48, 45, 52, 58, 55, 63, 70] },
  { key: 'orders', title: 'Đơn hàng', value: 1284, delta: 4.1, deltaLabel: 'so với tháng trước', icon: 'check', color: 'success', trend: [80, 82, 79, 88, 90, 94, 92, 99] },
  { key: 'bounce', title: 'Tỉ lệ thoát', value: 38.6, precision: 1, suffix: '%', delta: -6.2, invertDelta: true, deltaLabel: 'giảm là tốt', icon: 'info', color: 'warning', trend: [52, 50, 47, 49, 44, 42, 40, 38] },
  { key: 'refunds', title: 'Hoàn tiền', value: 23, delta: 9.5, invertDelta: true, deltaLabel: 'so với tháng trước', icon: 'close', color: 'danger', trend: [12, 14, 13, 15, 18, 17, 21, 23] },
];

// ---------- Tiện ích cho play ----------
const rowOf = (canvas, sel = 'hui-kpi-row') => canvas.querySelector(sel);
const partOf = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
async function settle(el) {
  await el.updateComplete;
  await nextFrame();
  await nextFrame();
}

export default {
  title: 'Organisms/HuiKpiRow',
  component: 'hui-kpi-row',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI KPI Row** — dải ô chỉ số dựng từ **\`<hui-stat-card>\`**: nhận \`data\` / \`src\` / \`fetchFn\` (DataController),
mỗi item một ô (render vào light DOM, giữ node theo \`row-key\`), hoặc đặt sẵn các \`<hui-stat-card>\` làm con.
Lưới auto-fit theo \`min-width\`, \`columns\` là **số cột tối đa**; \`scroll\` → màn hình < 576px thành hàng cuộn ngang có snap.

### Cách sử dụng
\`\`\`html
<hui-kpi-row id="kpis" variant="outlined" effect="lift" clickable></hui-kpi-row>
<script>
  kpis.data = [
    { key: 'revenue', title: 'Doanh thu', value: 128450000, suffix: ' ₫', delta: 12.4, deltaLabel: 'so với tháng trước', icon: 'star', trend: [42, 48, 52, 58] },
    { key: 'bounce', title: 'Tỉ lệ thoát', value: 38.6, precision: 1, suffix: '%', delta: -6.2, invertDelta: true },
  ];
  kpis.addEventListener('hui-select', (e) => console.log(e.detail.key, e.detail.item));
</script>
\`\`\`

### Item
\`{ key, title, value, prefix, suffix, precision, delta, deltaLabel, invertDelta, icon, color, trend: number[], href, target, variant, effect, size }\`
— chép thẳng xuống property cùng tên của \`hui-stat-card\` (variant / effect / size của item ghi đè giá trị của dải).

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`min-width\` | string | \`200px\` | Bề rộng tối thiểu mỗi ô trước khi xuống dòng (số = px) |
| \`columns\` | number | — | Số cột tối đa (ô vẫn xuống dòng khi hẹp hơn min-width) |
| \`gap\` | string | \`md\` | \`xs\` \\| \`sm\` \\| \`md\` \\| \`lg\` \\| \`xl\` \\| \`none\`, số (px) hoặc CSS length |
| \`variant\` | string | — | \`elevated\` \\| \`outlined\` \\| \`filled\` \\| \`ghost\` — chuyển xuống mọi ô |
| \`effect\` | string | — | Hiệu ứng hui-card, vd \`lift\` |
| \`size\` | string | — | \`sm\` \\| \`md\` \\| \`lg\` |
| \`clickable\` | boolean | \`false\` | Ô là nút (\`role="button"\`), phát \`hui-select\` |
| \`active-key\` | string | — | Ô đang chọn (\`aria-pressed\`), tự cập nhật khi bấm |
| \`scroll\` | boolean | \`false\` | < 576px: hàng cuộn ngang có snap (property \`scrollMode\`) |
| \`skeleton-count\` | number | \`4\` | Số ô skeleton khi đang tải |
| \`row-key\` | string | \`key\` | Trường làm key |
| \`label\` | string | locale | \`aria-label\` của dải (\`kpiRow.label\`) |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng xuất hiện + đếm số |
| \`src\` / \`data-path\` / \`params\` / \`loading\` / \`empty-text\` | | | DataController |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`data\` | Array | Danh sách KPI |
| \`fetchFn\` | Function | \`async (params, { signal }) => Array\` |
| \`tiles\` | HuiStatCard[] | **Chỉ đọc** — các ô đang hiển thị |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-select\` | \`{ key, item, tile }\` | Bấm / Enter / Space trên ô (clickable) |
| \`hui-load\` / \`hui-error\` | \`{ data, total }\` / \`{ error }\` | Tải xong / lỗi |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | \`<hui-stat-card>\` đặt sẵn (khi không dùng data) |

### Bàn phím & ARIA
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Tới từng ô (clickable) / vùng cuộn (scroll trên mobile) |
| \`Enter\` / \`Space\` | Chọn ô → \`hui-select\` |

Không clickable: dải \`role="list"\`, ô \`role="listitem"\`. Clickable: dải \`role="group"\`, ô \`role="button"\` + \`aria-pressed\` khi có \`active-key\`.
Không đè role / tabindex bạn tự đặt trên ô. \`aria-busy\` khi đang tải.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-kpi-row-gap\` / \`--hui-kpi-row-min-width\` | Khoảng cách / bề rộng tối thiểu ô (attribute ưu tiên hơn) |
| \`--hui-kpi-row-scroll-item-width\` | Bề rộng ô ở chế độ cuộn ngang (80%) |
| \`--hui-kpi-row-active-color\` / \`--hui-kpi-row-focus-color\` | Viền ô đang chọn / focus |
| \`--hui-kpi-row-radius\` | Bo góc vòng chọn / focus |

Ô là \`hui-stat-card\` ở light DOM → tùy biến thẳng bằng CSS (\`hui-kpi-row hui-stat-card { … }\`, \`--hui-stat-card-*\`, \`::part(delta)\`).
**Parts:** \`base\`, \`row\`, \`skeleton\`, \`state\`. **Custom state:** \`:state(loading | empty | error | ready)\`.
        `,
      },
    },
  },
  argTypes: {
    minWidth: { name: 'min-width', control: 'text', table: { defaultValue: { summary: '200px' } } },
    columns: { control: { type: 'number', min: 1, max: 6 } },
    gap: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'] },
    variant: { control: 'select', options: ['elevated', 'outlined', 'filled', 'ghost'] },
    effect: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    clickable: { control: 'boolean' },
    scrollMode: { name: 'scroll', control: 'boolean' },
    noAnimation: { name: 'no-animation', control: 'boolean' },
  },
};

/** 4 ô KPI có sparkline: tăng tốt (xanh), giảm tốt với invert-delta, tăng xấu (đỏ) */
export const Default = {
  args: { minWidth: '200', columns: 4, gap: 'md', variant: 'elevated', effect: 'lift', size: 'md', clickable: false, scrollMode: false, noAnimation: false },
  render: (args) => {
    const row = document.createElement('hui-kpi-row');
    const attrs = { 'min-width': args.minWidth, columns: args.columns, gap: args.gap, variant: args.variant, effect: args.effect, size: args.size };
    for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined && v !== '') row.setAttribute(k, String(v));
    for (const [k, v] of Object.entries({ clickable: args.clickable, scroll: args.scrollMode, 'no-animation': args.noAnimation })) row.toggleAttribute(k, Boolean(v));
    row.data = KPIS;
    return row;
  },
  // Kiểm thử: số ô = số item, chênh lệch đúng chiều / màu, role list
  play: async ({ canvasElement }) => {
    const row = rowOf(canvasElement);
    await settle(row);
    const tiles = row.querySelectorAll('hui-stat-card');
    await expect(tiles.length).toBe(KPIS.length);
    await expect(row.tiles.length).toBe(KPIS.length);
    await expect(tiles[0].parentElement).toBe(row);
    await expect(partOf(row, 'row').getAttribute('role')).toBe('list');
    await expect(tiles[0].getAttribute('role')).toBe('listitem');
    await expect(tiles[0].getAttribute('variant')).toBe('elevated');
    await expect(tiles[0].getAttribute('effect')).toBe('lift');

    const deltaPart = (tile) => tile.shadowRoot.querySelector('[part~="delta"]');
    await expect(tiles[0].deltaDirection).toBe('up');
    await expect(deltaPart(tiles[0]).getAttribute('part')).toContain('delta-up');
    await expect(deltaPart(tiles[0]).classList.contains('sc__delta--good')).toBe(true);
    await expect(deltaPart(tiles[2]).getAttribute('part')).toContain('delta-down');
    await expect(deltaPart(tiles[2]).classList.contains('sc__delta--good')).toBe(true); // invert-delta
    await expect(deltaPart(tiles[3]).classList.contains('sc__delta--bad')).toBe(true);

    // Đổi data theo key → giữ node
    const keep = tiles[1];
    row.data = [KPIS[1], { ...KPIS[0], value: 1 }];
    await settle(row);
    await expect(row.querySelectorAll('hui-stat-card').length).toBe(2);
    await expect(row.querySelector('hui-stat-card')).toBe(keep);
  },
};

/** Bấm ô để chọn (vd đổi biểu đồ bên dưới): hui-select {key, item}, active-key tô viền */
export const Clickable = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <hui-kpi-row clickable active-key="revenue" variant="outlined" effect="lift"></hui-kpi-row>
      <p class="kpi-log" style="font: 13px var(--hui-font-mono); color: var(--hui-text-secondary);">Đang xem: revenue</p>`;
    const row = wrap.querySelector('hui-kpi-row');
    row.data = KPIS;
    row.addEventListener('hui-select', (e) => {
      wrap.querySelector('.kpi-log').textContent = `Đang xem: ${e.detail.key} (${e.detail.item.title})`;
    });
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const row = rowOf(canvasElement);
    await settle(row);
    const tiles = row.querySelectorAll('hui-stat-card');
    await expect(partOf(row, 'row').getAttribute('role')).toBe('group');
    await expect(tiles[0].getAttribute('role')).toBe('button');
    await expect(tiles[0].getAttribute('aria-pressed')).toBe('true');
    await expect(tiles[1].getAttribute('aria-pressed')).toBe('false');

    let detail = null;
    row.addEventListener('hui-select', (e) => { detail = e.detail; });
    tiles[1].click();
    await expect(detail?.key).toBe('orders');
    await expect(detail?.item.title).toBe('Đơn hàng');
    await settle(row);
    await expect(row.activeKey).toBe('orders');
    await expect(tiles[1].getAttribute('aria-pressed')).toBe('true');

    detail = null;
    tiles[2].focus();
    tiles[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await expect(detail?.key).toBe('bounce');
  },
};

/** Đang tải: ô stat-card ở trạng thái skeleton (skeleton-count) */
export const Loading = {
  render: () => {
    const row = document.createElement('hui-kpi-row');
    row.setAttribute('skeleton-count', '4');
    row.fetchFn = () => new Promise(() => {}); // mãi đang tải
    return row;
  },
  play: async ({ canvasElement }) => {
    const row = rowOf(canvasElement);
    await waitFor(() => expect(row.dataState).toBe('loading'));
    await settle(row);
    const sk = partOf(row, 'skeleton');
    await expect(sk.hidden).toBe(false);
    await expect(sk.querySelectorAll('hui-stat-card[loading]').length).toBe(4);
    await expect(row.hasAttribute('aria-busy')).toBe(true);
    await expect(partOf(row, 'row').hidden).toBe(true);
  },
};

/** Cuộn ngang trên màn hình hẹp (< 576px): thu nhỏ khung xem (viewport mobile) để thấy */
export const ScrollMode = {
  render: () => {
    const row = document.createElement('hui-kpi-row');
    row.setAttribute('scroll', '');
    row.setAttribute('variant', 'filled');
    row.data = KPIS;
    return row;
  },
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  play: async ({ canvasElement }) => {
    const row = rowOf(canvasElement);
    await settle(row);
    await expect(row.scrollMode).toBe(true);
    const narrow = matchMedia('(max-width: 575.98px)').matches;
    await expect(getComputedStyle(partOf(row, 'row')).display).toBe(narrow ? 'flex' : 'grid');
    await expect(partOf(row, 'row').hasAttribute('tabindex')).toBe(narrow);
  },
};

/** Ô đặt sẵn (không dùng data): dải vẫn lo bố cục + chuyển variant xuống */
export const StaticTiles = {
  render: () => html`
    <hui-kpi-row variant="outlined" gap="sm" min-width="180">
      <hui-stat-card title="Người dùng" value="8420" delta="3.2" icon="user"></hui-stat-card>
      <hui-stat-card title="Phiên" value="21450" delta="-1.4" icon="eye"></hui-stat-card>
      <hui-stat-card title="Chuyển đổi" value="2.8" precision="1" suffix="%" delta="0" variant="filled"></hui-stat-card>
    </hui-kpi-row>
  `,
  play: async ({ canvasElement }) => {
    const row = rowOf(canvasElement);
    await settle(row);
    const tiles = row.tiles;
    await expect(tiles.length).toBe(3);
    await expect(tiles[0].getAttribute('variant')).toBe('outlined');
    await expect(tiles[2].getAttribute('variant')).toBe('filled'); // giá trị tự đặt được giữ
  },
};

/** Rỗng / lỗi + Thử lại */
export const DataStates = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display: grid; gap: 24px;';
    const empty = document.createElement('hui-kpi-row');
    empty.fetchFn = async () => [];
    const error = document.createElement('hui-kpi-row');
    error.fetchFn = async () => { throw new Error('Không kết nối được API'); };
    wrap.append(empty, error);
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const [empty, error] = canvasElement.querySelectorAll('hui-kpi-row');
    await waitFor(() => expect(empty.dataState).toBe('empty'));
    await waitFor(() => expect(error.dataState).toBe('error'));
    await settle(error);
    // hui-empty / hui-result tải động → trạng thái được vẽ lại khi định nghĩa xong
    await waitFor(() => expect(partOf(empty, 'state').querySelector('hui-empty')).toBeTruthy());
    await waitFor(() => expect(partOf(error, 'state').querySelector('hui-result')).toBeTruthy());
  },
};

/** Override từ ngoài: biến CSS của dải + CSS thẳng lên ô (light DOM) */
export const CustomizeFromOutside = {
  render: () => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <style>
        .brand-kpis {
          --hui-kpi-row-gap: 24px;
          --hui-kpi-row-active-color: var(--hui-success);
          --hui-stat-card-value-font-size: 1.75rem;
        }
        .brand-kpis hui-stat-card { --hui-card-radius: 20px; }
        .brand-kpis hui-stat-card::part(title) { text-transform: uppercase; letter-spacing: 0.04em; }
      </style>
      <hui-kpi-row class="brand-kpis" clickable active-key="orders" variant="outlined"></hui-kpi-row>`;
    wrap.querySelector('hui-kpi-row').data = KPIS;
    return wrap;
  },
  play: async ({ canvasElement }) => {
    const row = rowOf(canvasElement);
    await settle(row);
    await expect(getComputedStyle(partOf(row, 'row')).columnGap).toBe('24px');
    const title = row.querySelector('hui-stat-card').shadowRoot.querySelector('[part~="title"]');
    await expect(getComputedStyle(title).textTransform).toBe('uppercase');
  },
};
