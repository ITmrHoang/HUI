/**
 * Storybook Stories — HUI Donut (vành khuyên nhiều phần / vòng tiến độ)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { format, formatPercent } from '../../core/format.js';
import { arcPath, polar } from './index.js';
import '../hui-card/index.js';

const sr = (el) => el.shadowRoot;
const segs = (el) => [...sr(el).querySelectorAll('[part~="segment"]')];
const drawn = (el) => segs(el).filter((s) => s.getAttribute('d'));
const legendItems = (el) => [...sr(el).querySelectorAll('[part~="legend-item"]')];
const centerValue = (el) => sr(el).querySelector('[part="center-value"]').textContent;

const TRAFFIC = [
  { label: 'Tìm kiếm', value: 4820 },
  { label: 'Mạng xã hội', value: 3150 },
  { label: 'Trực tiếp', value: 2280 },
  { label: 'Email', value: 940 },
  { label: 'Khác', value: 610 },
];
const STATUS = [
  { label: 'Hoàn thành', value: 64, color: 'success' },
  { label: 'Đang làm', value: 24, color: 'info' },
  { label: 'Trễ hạn', value: 12, color: 'danger' },
];
const random = () => TRAFFIC.map((d) => ({ ...d, value: Math.round(300 + Math.random() * 4000) }));

export default {
  title: 'Molecules/Charts/HuiDonut',
  component: 'hui-donut',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Donut** — vành khuyên nhiều phần (\`data\`) hoặc **vòng tiến độ** (\`value\` / \`max\`), tròn hoặc **nửa vòng** (\`semi\`).
Giữa vòng mặc định hiện **tổng** (đổi theo phần đang hiện). Chú giải tương tác: hover ↔ làm nổi cung, bấm để **ẩn/hiện** phần.
Cung **quét** từ góc bắt đầu khi cuộn tới; data đổi / bật tắt phần thì góc chuyển tiếp mượt.

\`\`\`html
<hui-donut legend="right" gap-degree="2" data='[{"label":"Tìm kiếm","value":4820},{"label":"Email","value":940}]'></hui-donut>
<hui-donut value="72" color="success" size="120" center-label="Hoàn thành"></hui-donut>
<hui-donut semi value="64" thickness="14"></hui-donut>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | JSON | \`[]\` | Mảng \`{label, value, color?}\` hoặc số; màu mặc định theo bảng màu token (lặp vòng) |
| \`value\` / \`max\` | number | — / \`100\` | Chế độ tiến độ (khi không có data) |
| \`thickness\` | number | ~14% size | Độ dày vành (px) |
| \`size\` | number | \`160\` | Đường kính (px; co theo khung hẹp hơn) |
| \`gap-degree\` | number | \`0\` | Khe hở giữa các phần (độ) |
| \`center-label\` / \`center-value\` | string | "Tổng" / tổng | Chữ giữa vòng (chế độ tiến độ: phần trăm) |
| \`legend\` | string | \`none\` | \`none\` \\| \`right\` \\| \`bottom\` |
| \`semi\` | boolean | \`false\` | Nửa vòng |
| \`color\` | string | \`primary\` | Màu cung tiến độ (preset hoặc màu CSS) |
| \`format\` | string | — | Định dạng số (format.js) |
| \`label\` | string | "Biểu đồ tròn" | Tên cho trình đọc màn hình |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Properties & methods
\`data\`, \`formatter\`, \`total\` (chỉ đọc — tổng phần đang hiện), \`visibleCount\` (chỉ đọc),
\`toggleSegment(index, force?)\` — ẩn/hiện một phần bằng code.

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-select\` | \`{ index, item }\` | Bấm / Enter trên một cung |
| \`hui-toggle\` | \`{ index, item, visible }\` | Bật/tắt phần qua chú giải (hoặc \`toggleSegment\`) |

### Slots
| Slot | Mô tả |
|------|-------|
| \`center\` | Nội dung giữa vòng (thay center-label / center-value) |

### Parts
\`base\`, \`chart\`, \`svg\`, \`track\`, \`segment\` (+ \`segment-active\`), \`center\`, \`center-label\`, \`center-value\`, \`legend\`,
\`legend-item\` (+ \`legend-item-off\`), \`legend-swatch\`, \`legend-label\`, \`legend-value\`, \`legend-percent\`, \`tooltip\`, \`data-table\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-donut-size\` | Đường kính |
| \`--hui-donut-color\` / \`--hui-donut-track-color\` | Cung tiến độ / vòng nền |
| \`--hui-donut-label-color\` / \`--hui-donut-value-color\` / \`--hui-donut-value-font-size\` | Chữ giữa |
| \`--hui-donut-legend-gap\` | Khoảng cách biểu đồ ↔ chú giải |
| \`--hui-donut-dim-opacity\` | Độ mờ cung không chọn (0.4) |
| \`--hui-donut-duration\` | Thời lượng quét (900ms) |
| \`--hui-chart-color-1\` … \`-12\` | Bảng màu chuỗi |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| Tab | Vào cung (roving tabindex) rồi tới các nút chú giải |
| ← → / ↑ ↓ | Cung trước / sau (vòng lặp), tooltip hiện giá trị + % |
| Home / End | Cung đầu / cuối |
| Enter / Space | Chọn cung (\`hui-select\`); trên chú giải: bật/tắt phần |
| Esc | Ẩn tooltip |

### Accessibility
SVG \`role="group"\` + nhãn tóm tắt ("5 phần, tổng …"); mỗi cung \`role="img"\` + "Nhãn: giá trị (phần trăm)";
nút chú giải \`aria-pressed\`. Bảng dữ liệu ẩn (sr-only). Chế độ tiến độ: SVG \`role="img"\` + phần trăm.

### Locale
\`chart.donut\` · \`chart.donutSummary\` · \`chart.total\` · \`chart.point\` · \`chart.label\` · \`chart.value\` · \`chart.empty\`.
        `,
      },
    },
  },
  argTypes: {
    legend: { control: 'select', options: ['none', 'right', 'bottom'] },
    size: { control: 'number' },
    thickness: { control: 'number' },
    gapDegree: { control: 'number' },
    semi: { control: 'boolean' },
    format: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-donut .data=${TRAFFIC} legend=${args.legend} size=${args.size} thickness=${args.thickness}
      gap-degree=${args.gapDegree} ?semi=${args.semi} format=${args.format}></hui-donut>
  `,
  args: { legend: 'right', size: 180, thickness: 24, gapDegree: 2, semi: false, format: 'number' },
};

/** Số cung = số phần; legend bấm để ẩn → tổng giữa vòng cập nhật */
export const LegendToggle = {
  render: () => html`
    <hui-donut id="dn-legend" .data=${TRAFFIC} legend="right" gap-degree="2" no-animation label="Nguồn truy cập"></hui-donut>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dn-legend');
    const total = TRAFFIC.reduce((s, d) => s + d.value, 0);
    await expect(segs(el).length).toBe(TRAFFIC.length);
    await expect(drawn(el).length).toBe(TRAFFIC.length);
    await expect(el.total).toBe(total);
    await expect(centerValue(el)).toBe(format(total, 'number'));
    await expect(sr(el).querySelector('[part="center-label"]').textContent).toBe('Tổng');
    await expect(legendItems(el).length).toBe(TRAFFIC.length);
    await expect(legendItems(el)[0].querySelector('[part="legend-percent"]').textContent)
      .toBe(formatPercent((TRAFFIC[0].value / total) * 100, 0));

    const events = [];
    el.addEventListener('hui-toggle', (e) => events.push(e.detail));
    await userEvent.click(legendItems(el)[0]);
    await expect(events[0]).toEqual({ index: 0, item: TRAFFIC[0], visible: false });
    await expect(legendItems(el)[0].getAttribute('aria-pressed')).toBe('false');
    await expect(legendItems(el)[0].getAttribute('part')).toContain('legend-item-off');
    await expect(segs(el)[0].getAttribute('d')).toBe('');
    await expect(drawn(el).length).toBe(TRAFFIC.length - 1);
    await expect(el.total).toBe(total - TRAFFIC[0].value);
    await expect(centerValue(el)).toBe(format(total - TRAFFIC[0].value, 'number'));
    await expect(sr(el).querySelector('svg').getAttribute('aria-label')).toContain('4 phần');

    // Bật lại
    await userEvent.click(legendItems(el)[0]);
    await expect(drawn(el).length).toBe(TRAFFIC.length);
    await expect(el.total).toBe(total);

    // Hover legend ↔ làm nổi cung tương ứng
    await userEvent.hover(legendItems(el)[2]);
    await expect(segs(el)[2].classList.contains('is-active')).toBe(true);
    await expect(segs(el)[2].getAttribute('part')).toBe('segment segment-active');
    await userEvent.unhover(legendItems(el)[2]);
    await expect(segs(el)[2].classList.contains('is-active')).toBe(false);
  },
};

/** Bàn phím trên cung: tooltip hiện nhãn + giá trị + phần trăm; Enter → hui-select */
export const KeyboardSegments = {
  render: () => html`
    <div style="padding: 24px;">
      <hui-donut id="dn-kb" .data=${STATUS} legend="bottom" size="200" no-animation></hui-donut>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dn-kb');
    const tip = sr(el).querySelector('[part~="tooltip"]');
    const selected = [];
    el.addEventListener('hui-select', (e) => selected.push(e.detail.index));
    await expect(segs(el).filter((s) => s.getAttribute('tabindex') === '0').length).toBe(1);
    el.focus();
    await expect(sr(el).activeElement).toBe(segs(el)[0]);
    await expect(tip.classList.contains('is-visible')).toBe(true);
    await expect(tip.textContent).toContain('Hoàn thành');
    await userEvent.keyboard('{ArrowRight}');
    await expect(sr(el).activeElement).toBe(segs(el)[1]);
    await expect(tip.textContent).toContain('Đang làm');
    await expect(tip.textContent).toContain(formatPercent(24, 0));
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}'); // vòng lặp về cung cuối
    await expect(sr(el).activeElement).toBe(segs(el)[2]);
    await userEvent.keyboard('{Enter}');
    await expect(selected).toEqual([2]);
    await expect(segs(el)[2].getAttribute('aria-label')).toContain('Trễ hạn: 12');
    sr(el).activeElement.blur();
    await expect(tip.classList.contains('is-visible')).toBe(false);
  },
};

/** Vòng tiến độ (value / max) + nửa vòng + slot center */
export const Progress = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: flex-end;">
      <hui-donut id="dn-progress" value="72" size="120" color="success" center-label="Hoàn thành" no-animation></hui-donut>
      <hui-donut value="38" max="50" size="120" color="warning" format="number"></hui-donut>
      <hui-donut id="dn-semi" semi value="64" size="200" thickness="18" color="info" center-label="Mục tiêu quý"></hui-donut>
      <hui-donut value="9" max="12" size="120" color="primary">
        <div slot="center" style="text-align: center; line-height: 1.2;">
          <strong style="font-size: 22px;">9/12</strong><br /><span style="font-size: 12px; color: var(--hui-text-secondary);">tháng</span>
        </div>
      </hui-donut>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dn-progress');
    await expect(centerValue(el)).toBe(formatPercent(72, 0));
    await expect(sr(el).querySelector('[part="track"]').getAttribute('d')).not.toBe('');
    await expect(drawn(el).length).toBe(1);
    await expect(sr(el).querySelector('svg').getAttribute('role')).toBe('img');
    await expect(sr(el).querySelector('svg').getAttribute('aria-label')).toContain(formatPercent(72, 0));
    // Nửa vòng: khung cao = nửa đường kính
    const semi = canvasElement.querySelector('#dn-semi');
    await expect(sr(semi).querySelector('svg').getAttribute('viewBox')).toBe('0 0 200 100');
    // Hàm thuần: cung 90° từ 12 giờ sang 3 giờ
    const p = polar(50, 50, 40, 90);
    await expect(Math.round(p.x)).toBe(90);
    await expect(Math.round(p.y)).toBe(50);
    await expect(arcPath(50, 50, 40, 0, 90)).toBe('M50,10A40,40 0 0 1 90,50');
  },
};

/** Màu: bảng màu token mặc định (lặp vòng), item.color riêng; dark mode tự đổi */
export const ColorsAndDarkMode = {
  render: () => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      ${['light', 'dark'].map((theme) => html`
        <div data-theme=${theme} style="padding: 16px; border-radius: 12px; background: var(--hui-bg); color: var(--hui-text); border: 1px solid var(--hui-border); display: grid; gap: 16px; justify-items: center;">
          <hui-donut .data=${[1, 2, 3, 4, 5, 6, 7, 8]} size="140" gap-degree="2"></hui-donut>
          <hui-donut .data=${STATUS} legend="bottom" size="140" thickness="14"></hui-donut>
        </div>
      `)}
    </div>
  `,
};

/** Trong ô KPI */
export const InKpiCard = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
      <hui-card variant="outlined" title="Trạng thái công việc">
        <hui-donut .data=${STATUS} legend="right" size="120" thickness="16" center-label="Việc"></hui-donut>
      </hui-card>
      <hui-card variant="outlined" title="Dung lượng">
        <div style="display: flex; align-items: center; gap: 16px;">
          <hui-donut value="68" size="88" thickness="10" color="warning"></hui-donut>
          <div><strong style="font-size: 20px;">68 GB</strong><div style="font-size: 12px; color: var(--hui-text-secondary);">trên 100 GB</div></div>
        </div>
      </hui-card>
    </div>
  `,
};

/** Bấm nút → data ngẫu nhiên → các cung chuyển tiếp mượt sang góc mới */
export const DataUpdate = {
  render: () => {
    const update = (e) => {
      const root = e.target.closest('div');
      root.querySelector('#dn-update').data = random();
      root.querySelector('#dn-update-progress').value = Math.round(Math.random() * 100);
    };
    return html`
      <div style="display: flex; flex-wrap: wrap; gap: 32px; align-items: center;">
        <hui-donut id="dn-update" .data=${TRAFFIC} legend="right" gap-degree="2" format="compact"></hui-donut>
        <hui-donut id="dn-update-progress" value="40" size="120"></hui-donut>
        <button type="button" @click=${update}>Dữ liệu ngẫu nhiên</button>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dn-update');
    el.data = [{ label: 'A', value: 1 }, { label: 'B', value: 3 }];
    await el.updateComplete;
    await expect(el.total).toBe(4);
    await expect(segs(el).length).toBe(2);
    await waitFor(() => expect(drawn(el).length).toBe(2), { timeout: 3000 });
    await expect(centerValue(el)).toBe(format(4, 'compact'));
  },
};

/** Override từ ngoài: biến CSS + ::part + bảng màu chuỗi */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-donut.brand {
        --hui-donut-size: 220px;
        --hui-donut-value-color: var(--hui-primary-7);
        --hui-donut-value-font-size: 34px;
        --hui-donut-dim-opacity: 0.2;
        --hui-chart-color-1: var(--hui-danger);
        --hui-chart-color-2: var(--hui-warning);
        --hui-chart-color-3: var(--hui-success);
      }
      hui-donut.brand::part(segment) { stroke-linecap: round; }
      hui-donut.brand::part(legend-item) { border: 1px solid var(--hui-border); }
    </style>
    <hui-donut class="brand" .data=${STATUS.map(({ label, value }) => ({ label, value }))} legend="bottom" gap-degree="10" thickness="18"></hui-donut>
  `,
};
