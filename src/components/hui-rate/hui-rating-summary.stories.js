/**
 * Storybook Stories — HUI Rating Summary (khối tổng hợp đánh giá)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const DIST = { 5: 120, 4: 30, 3: 6, 2: 2, 1: 2 };
const rowsOf = (el) => [...el.shadowRoot.querySelectorAll('[part~="row"]')];

export default {
  title: 'Organisms/HuiRatingSummary',
  component: 'hui-rating-summary',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Rating Summary** — Khối tổng hợp đánh giá cho trang sản phẩm: điểm trung bình lớn, \`hui-rating-display\`,
tổng lượt và **thanh phân bố 5★…1★** (bấm để lọc, bấm lại để bỏ). Thanh chạy từ 0 khi cuộn tới lần đầu.

\`\`\`html
<hui-rating-summary average="4.6" total="160" distribution='{"5":120,"4":30,"3":6,"2":2,"1":2}'></hui-rating-summary>
<!-- Chỉ có distribution → tự tính average + total -->
<hui-rating-summary distribution='{"5":8,"4":3,"3":1}'></hui-rating-summary>
<!-- Từ API -->
<hui-rating-summary src="/api/products/1/rating"></hui-rating-summary>
<script>
  summary.fetchFn = async ({ signal }) => (await fetch('/api/rating', { signal })).json();
  summary.addEventListener('hui-filter', (e) => reviewList.filter(e.detail.stars));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`average\` | number | tự tính | Điểm trung bình (bỏ trống → tính từ \`distribution\`) |
| \`total\` | number | tự tính | Tổng lượt (bỏ trống → tổng \`distribution\`) |
| \`distribution\` | JSON | — | Số lượt theo mức sao \`{"5":120,"4":30,...}\` |
| \`count\` | number | \`5\` | Số mức sao (số thanh) |
| \`active\` | number | — | Mức sao đang lọc (tự đổi khi bấm thanh) |
| \`color\` | string | warning | \`primary\` \\| \`success\` \\| \`warning\` \\| \`danger\` \\| \`info\` hoặc màu CSS |
| \`src\` | string | — | URL trả JSON \`{ average, total, distribution }\` |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng thanh chạy |

### Properties
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`data\` | \`{ average?, total?, distribution }\` | Ưu tiên hơn các attribute lẻ |
| \`fetchFn\` | \`async ({ signal }) => data\` | Tự lấy dữ liệu |
| \`summary\` | \`{ average, total, counts, sum }\` | (chỉ đọc) số liệu đã chuẩn hóa |
| \`reload()\` | \`() => Promise\` | Tải lại từ \`src\` / \`fetchFn\` |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-filter\` | \`{ stars }\` | Bấm thanh (\`stars\` = 5…1), bấm lại để bỏ (\`stars: null\`) |
| \`hui-load\` | \`{ data }\` | Tải xong từ \`src\` / \`fetchFn\` |
| \`hui-error\` | \`{ error }\` | Tải lỗi |

### Slots
Không có.

### Parts
\`base\`, \`overview\`, \`average\`, \`display\` (+ \`display-stars\`, \`display-star\`), \`total\`, \`bars\`,
\`row\` (+ \`row-active\`), \`row-label\`, \`track\`, \`fill\`, \`row-count\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-rating-summary-gap\` | Khoảng cách cột điểm ↔ các thanh |
| \`--hui-rating-summary-average-size\` / \`--hui-rating-summary-average-color\` | Số điểm lớn |
| \`--hui-rating-summary-color\` | Màu sao + phần tô thanh |
| \`--hui-rating-summary-track-bg\` / \`--hui-rating-summary-bar-height\` | Rãnh thanh |
| \`--hui-rating-summary-row-hover-bg\` / \`--hui-rating-summary-row-active-bg\` | Nền dòng hover / đang lọc |

### Bàn phím
Mỗi thanh là \`<button aria-pressed>\`: \`Tab\` di chuyển giữa các thanh, \`Enter\` / \`Space\` bật/tắt lọc.
\`aria-label\` mỗi thanh: "5 sao: 120 đánh giá (75%)".
        `,
      },
    },
  },
  argTypes: {
    average: { control: 'number' },
    total: { control: 'number' },
    color: { control: 'text' },
    noAnimation: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 560px;">
      <hui-rating-summary
        average=${args.average}
        total=${args.total}
        distribution=${JSON.stringify(DIST)}
        color=${args.color || ''}
        ?no-animation=${args.noAnimation}
      ></hui-rating-summary>
    </div>
  `,
  args: { average: 4.6, total: 160, color: '', noAnimation: false },
};

/** Chỉ truyền distribution → tự tính điểm trung bình + tổng; thanh chạy từ 0 khi hiện ra */
export const Computed = {
  render: () => html`
    <div style="max-width: 560px;">
      <hui-rating-summary id="rs-comp" distribution='{"5":8,"4":3,"3":1,"2":0,"1":0}'></hui-rating-summary>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rs-comp');
    const { average, total } = el.summary;
    await expect(total).toBe(12);
    await expect(average).toBeCloseTo((5 * 8 + 4 * 3 + 3) / 12, 5);
    await expect(el.shadowRoot.querySelector('[part="average"]').textContent).toBe('4,6');
    await expect(el.shadowRoot.querySelector('[part="total"]').textContent).toBe('12 đánh giá');
    const fill5 = rowsOf(el)[0].querySelector('[part="fill"]');
    await waitFor(() => expect(fill5.style.width).toBe('66.7%'));
    await expect(rowsOf(el)[4].querySelector('[part="fill"]').style.width).toBe('0%');
  },
};

/** Bấm thanh để lọc — phát hui-filter { stars }, bấm lại để bỏ */
export const Filter = {
  render: () => html`
    <div style="max-width: 560px;">
      <hui-rating-summary id="rs-filter" average="4.6" total="160" .distribution=${DIST}></hui-rating-summary>
      <p id="rs-filter-out" style="font-size: 13px; color: var(--hui-text-secondary);">Đang lọc: tất cả</p>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rs-filter');
    const out = canvasElement.querySelector('#rs-filter-out');
    const events = [];
    el.addEventListener('hui-filter', (e) => {
      events.push(e.detail.stars);
      out.textContent = `Đang lọc: ${e.detail.stars ?? 'tất cả'}`;
    });
    const rows = rowsOf(el);
    await expect(rows.length).toBe(5);
    await expect(rows[0].getAttribute('aria-label')).toBe('5 sao: 120 đánh giá (75%)');

    rows[0].click(); // 5★
    await expect(events).toEqual([5]);
    await expect(el.active).toBe(5);
    await el.updateComplete;
    await expect(rows[0].getAttribute('aria-pressed')).toBe('true');
    await expect(rows[0].getAttribute('part')).toBe('row row-active');

    rows[2].click(); // đổi sang 3★
    await el.updateComplete;
    await expect(rows[0].getAttribute('aria-pressed')).toBe('false');
    await expect(rows[2].getAttribute('aria-pressed')).toBe('true');

    rows[2].click(); // bấm lại → bỏ lọc
    await el.updateComplete;
    await expect(events).toEqual([5, 3, null]);
    await expect(el.active).toBe(null);
    await expect(el.hasAttribute('active')).toBe(false);
  },
};

/** Dữ liệu qua fetchFn (giả lập API chậm 600ms) — :state(loading) + aria-busy trong lúc tải */
export const FromFetchFn = {
  render: () => {
    const fetchFn = () => new Promise((resolve) => {
      setTimeout(() => resolve({ average: 4.2, total: 1280, distribution: { 5: 700, 4: 320, 3: 150, 2: 60, 1: 50 } }), 600);
    });
    return html`
      <div style="max-width: 560px;">
        <hui-rating-summary id="rs-fetch" .fetchFn=${fetchFn} color="primary"></hui-rating-summary>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#rs-fetch');
    await expect(el.getAttribute('aria-busy')).toBe('true');
    await waitFor(() => expect(el.shadowRoot.querySelector('[part="total"]').textContent).toBe('1.280 đánh giá'), { timeout: 3000 });
    await expect(el.hasAttribute('aria-busy')).toBe(false);
    await expect(el.shadowRoot.querySelector('[part="average"]').textContent).toBe('4,2');
  },
};

/** Thang 10 điểm + màu */
export const CountAndColor = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 32px; max-width: 560px;">
      <hui-rating-summary color="success" distribution='{"5":40,"4":25,"3":10,"2":5,"1":20}'></hui-rating-summary>
      <hui-rating-summary count="3" color="#8b5cf6" distribution='{"3":12,"2":6,"1":2}'></hui-rating-summary>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .rs-brand {
        --hui-rating-summary-color: var(--hui-danger);
        --hui-rating-summary-average-size: 4rem;
        --hui-rating-summary-average-color: var(--hui-danger);
        --hui-rating-summary-bar-height: 12px;
        --hui-rating-summary-track-bg: var(--hui-danger-light);
        --hui-rating-summary-gap: var(--hui-space-3xl);
      }
      hui-rating-summary.card::part(base) { padding: 20px; border: 1px solid var(--hui-border); border-radius: 12px; }
      hui-rating-summary.card::part(overview) { padding-inline-end: 24px; border-inline-end: 1px solid var(--hui-border); }
      hui-rating-summary.card::part(row-active) { outline: 2px solid var(--hui-primary); }
      hui-rating-summary.card::part(display-star) { filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2)); }
    </style>
    <div style="display: flex; flex-direction: column; gap: 32px; max-width: 600px;">
      <div class="rs-brand"><hui-rating-summary .distribution=${DIST}></hui-rating-summary></div>
      <hui-rating-summary class="card" .distribution=${DIST} active="4"></hui-rating-summary>
    </div>
  `,
};
