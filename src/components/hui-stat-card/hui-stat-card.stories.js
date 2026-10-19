/**
 * Storybook Stories — HUI Stat Card (ô chỉ số KPI)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { sparklinePoints } from './index.js';

const sr = (el) => el.shadowRoot;
const delta = (el) => sr(el).querySelector('[part~="delta"]');
/** Màu thật của một token (so sánh với computed color) */
const tokenColor = (token) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
};

const REVENUE = [12, 14, 13, 17, 16, 19, 22, 21, 25, 28];
const ORDERS = [40, 38, 41, 36, 34, 35, 31, 30];
const BOUNCE = [52, 50, 49, 47, 48, 45, 43, 41];
const USERS = [8, 9, 9, 10, 9, 11, 10, 12, 13, 12, 14];

export default {
  title: 'Molecules/HuiStatCard',
  component: 'hui-stat-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Stat Card** — Ô chỉ số KPI dựng trên \`<hui-card>\`: tiêu đề, giá trị **đếm dần từ 0** khi vào khung nhìn
(\`<hui-statistic>\`), chênh lệch ▲/▼ % (màu theo dấu), icon trong vòng tròn màu, **sparkline SVG** tự vẽ từ \`trend\`.

\`\`\`html
<hui-stat-card title="Doanh thu" value="128500000" suffix="₫" delta="12.5" delta-label="so với tháng trước"
  icon="star" color="success" trend="[12,14,13,17,16,19,22]"></hui-stat-card>
<hui-stat-card title="Tỉ lệ thoát" value="41.2" suffix="%" precision="1" delta="-3.4" invert-delta></hui-stat-card>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`title\` | string | — | Tiêu đề (attribute bị gỡ khỏi host để không hiện tooltip native; property \`title\` vẫn đọc được) |
| \`value\` | string | — | Giá trị: số (đếm dần) hoặc chuỗi bất kỳ ("N/A") |
| \`prefix\` / \`suffix\` / \`precision\` | — | — | Chuyển xuống \`<hui-statistic>\` |
| \`delta\` | number | — | Chênh lệch % (12.5 = 12,5%): dương ▲, âm ▼, 0 trung tính |
| \`delta-label\` | string | — | Chữ sau chênh lệch ("so với tháng trước") |
| \`invert-delta\` | boolean | \`false\` | Giảm là tốt (tỉ lệ thoát, chi phí…) → đảo màu |
| \`icon\` | string | — | Tên hui-icon trong vòng tròn màu |
| \`color\` | string | \`primary\` | \`primary\` \\| \`success\` \\| \`warning\` \\| \`danger\` \\| \`info\` |
| \`trend\` | JSON | — | Mảng số cho sparkline |
| \`loading\` | boolean | \`false\` | Skeleton của hui-card |
| \`no-animation\` | boolean | \`false\` | Tắt đếm dần + hiệu ứng vẽ sparkline |
| \`effect\` / \`href\` / \`target\` / \`variant\` / \`orientation\` / \`size\` | — | — | Chuyển thẳng xuống hui-card |

### Properties
| Property | Mô tả |
|----------|-------|
| \`trend\` | Mảng số (gán trực tiếp) |
| \`deltaDirection\` (chỉ đọc) | \`up\` \\| \`down\` \\| \`flat\` \\| \`''\` |

Hàm tiện ích: \`import { sparklinePoints } from 'hui-lib/hui-stat-card'\` → tọa độ \`{x, y}\` trong khung 100×32.

### Events
Không có (chỉ hiển thị; \`href\` biến cả card thành link qua hui-card).

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Nội dung thêm dưới chênh lệch |
| \`icon\` | Icon tùy biến (thay attribute icon) |
| \`footer\` | Chân thẻ |

### Parts
\`title\`, \`icon\`, \`statistic\` (+ \`value\`, \`prefix\`, \`suffix\`), \`delta\` (+ \`delta-up\` \\| \`delta-down\` \\| \`delta-flat\`),
\`delta-label\`, \`sparkline\`, \`sparkline-line\`, \`sparkline-area\`, và part của hui-card.

### Custom states
\`:state(delta-up)\` · \`:state(delta-down)\` · \`:state(delta-good)\` · \`:state(delta-bad)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-stat-card-title-color\` | Màu tiêu đề |
| \`--hui-stat-card-value-font-size\` | Cỡ chữ giá trị |
| \`--hui-stat-card-icon-size\` / \`--hui-stat-card-icon-color\` / \`--hui-stat-card-icon-bg\` | Vòng tròn icon |
| \`--hui-stat-card-up-color\` / \`--hui-stat-card-down-color\` | Màu chênh lệch tốt / xấu |
| \`--hui-stat-card-sparkline-color\` / \`--hui-stat-card-sparkline-height\` / \`--hui-stat-card-sparkline-width\` | Sparkline |

### Accessibility
Mũi tên ▲/▼ \`aria-hidden\`; trình đọc màn hình đọc "Tăng 12,5 % so với tháng trước". Sparkline \`role="img"\` + nhãn "Biểu đồ xu hướng: …".
Giá trị đang đếm có \`aria-busy="true"\` (trình đọc chờ số cuối). Không nhận focus (trừ khi có \`href\`).

### Locale
\`stat.up\` · \`stat.down\` · \`stat.flat\` · \`stat.trend\`.
        `,
      },
    },
  },
  argTypes: {
    title: { control: 'text' },
    value: { control: 'text' },
    delta: { control: 'number' },
    invertDelta: { control: 'boolean' },
    color: { control: 'select', options: ['primary', 'success', 'warning', 'danger', 'info'] },
    variant: { control: 'select', options: ['elevated', 'outlined', 'filled', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 300px;">
      <hui-stat-card
        title=${args.title}
        value=${args.value}
        suffix=" ₫"
        delta=${args.delta}
        delta-label="so với tháng trước"
        icon="star"
        color=${args.color}
        variant=${args.variant}
        size=${args.size}
        ?invert-delta=${args.invertDelta}
        ?loading=${args.loading}
        .trend=${REVENUE}
      ></hui-stat-card>
    </div>
  `,
  args: { title: 'Doanh thu', value: '128500000', delta: 12.5, invertDelta: false, color: 'success', variant: 'elevated', size: 'md', loading: false },
};

/** Dấu + màu chênh lệch: ▲ xanh, ▼ đỏ, 0 trung tính, invert-delta đảo màu */
export const Delta = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
      <hui-stat-card id="sc-up" title="Người dùng mới" value="1234" delta="8.2" delta-label="so với tuần trước" icon="user"></hui-stat-card>
      <hui-stat-card id="sc-down" title="Đơn hàng" value="312" delta="-4.5" icon="calendar" color="warning"></hui-stat-card>
      <hui-stat-card id="sc-flat" title="Phiên làm việc" value="980" delta="0" icon="monitor" color="info"></hui-stat-card>
      <hui-stat-card id="sc-inv" title="Tỉ lệ thoát" value="41.2" suffix="%" precision="1" delta="-3.4" invert-delta icon="eye-off" color="danger"></hui-stat-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const success = tokenColor('--hui-success');
    const danger = tokenColor('--hui-danger');

    const up = canvasElement.querySelector('#sc-up');
    await expect(up.deltaDirection).toBe('up');
    await expect(delta(up).getAttribute('part')).toBe('delta delta-up');
    await expect(delta(up).textContent).toContain('▲');
    await expect(delta(up).textContent).toContain('Tăng');
    await expect(getComputedStyle(delta(up)).color).toBe(success);
    await expect(sr(up).querySelector('[part~="delta-label"]').textContent).toBe('so với tuần trước');

    const down = canvasElement.querySelector('#sc-down');
    await expect(delta(down).getAttribute('part')).toBe('delta delta-down');
    await expect(delta(down).textContent).toContain('▼');
    await expect(getComputedStyle(delta(down)).color).toBe(danger);

    const flat = canvasElement.querySelector('#sc-flat');
    await expect(delta(flat).getAttribute('part')).toBe('delta delta-flat');
    await expect(getComputedStyle(delta(flat)).color).not.toBe(success);
    await expect(getComputedStyle(delta(flat)).color).not.toBe(danger);

    // Giảm nhưng là tốt → ▼ xanh
    const inv = canvasElement.querySelector('#sc-inv');
    await expect(delta(inv).textContent).toContain('▼');
    await expect(getComputedStyle(delta(inv)).color).toBe(success);

    // title: attribute bị gỡ khỏi host (không tooltip) nhưng vẫn hiển thị + đọc được qua property
    await expect(up.hasAttribute('title')).toBe(false);
    await expect(up.title).toBe('Người dùng mới');
    await expect(sr(up).querySelector('[part~="title"]').textContent).toBe('Người dùng mới');

    // Giá trị đếm dần tới số cuối
    const stat = sr(up).querySelector('hui-statistic');
    await waitFor(() => expect(stat.shadowRoot.querySelector('[part~="value-int"]').textContent).toBe('1.234'), { timeout: 3000 });
  },
};

/** Sparkline tự vẽ: polyline + vùng tô, số điểm = số phần tử trend */
export const Sparkline = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;">
      <hui-stat-card id="sc-spark" title="Doanh thu (triệu ₫)" value="28" delta="12" .trend=${REVENUE} no-animation></hui-stat-card>
      <hui-stat-card id="sc-spark-down" title="Đơn hủy" value="30" delta="-6" invert-delta .trend=${ORDERS}></hui-stat-card>
      <hui-stat-card id="sc-attr" title="Không có delta" value="14" color="info" trend="[8,9,9,10,9,11,10,12,13,12,14]"></hui-stat-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sc-spark');
    const line = sr(el).querySelector('[part~="sparkline-line"]');
    const area = sr(el).querySelector('[part~="sparkline-area"]');
    await expect(line.getAttribute('points').trim().split(/\s+/).length).toBe(REVENUE.length);
    // Vùng tô = các điểm của đường + 2 điểm đáy
    await expect(area.getAttribute('points').trim().split(/\s+/).length).toBe(REVENUE.length + 2);
    await expect(sr(el).querySelector('[part~="sparkline"]').getAttribute('aria-label')).toBe('Biểu đồ xu hướng: Doanh thu (triệu ₫)');
    // no-animation → hiện số ngay, không đếm
    await expect(sr(el).querySelector('hui-statistic').shadowRoot.querySelector('[part~="value-int"]').textContent).toBe('28');

    // Điểm cao nhất ở trên cùng (y nhỏ nhất), thấp nhất ở dưới cùng
    const pts = sparklinePoints(REVENUE);
    await expect(pts[pts.length - 1].y).toBe(2);
    await expect(pts[0].y).toBe(30);
    await expect(pts[0].x).toBe(0);
    await expect(pts[pts.length - 1].x).toBe(100);

    // Màu sparkline theo chênh lệch tốt/xấu
    const svgColor = (id) => getComputedStyle(sr(canvasElement.querySelector(id)).querySelector('[part~="sparkline"]')).color;
    await expect(svgColor('#sc-spark')).toBe(tokenColor('--hui-success'));
    await expect(svgColor('#sc-spark-down')).toBe(tokenColor('--hui-success'));
    await expect(svgColor('#sc-attr')).toBe(tokenColor('--hui-info'));

    // trend từ attribute JSON
    const attr = canvasElement.querySelector('#sc-attr');
    await expect(sr(attr).querySelector('[part~="sparkline-line"]').getAttribute('points').trim().split(/\s+/).length).toBe(USERS.length);

    // Đổi trend → vẽ lại; < 2 điểm → ẩn
    el.trend = [1, 3, 2];
    await el.updateComplete;
    await expect(line.getAttribute('points').trim().split(/\s+/).length).toBe(3);
    el.trend = [5];
    await el.updateComplete;
    await expect(sr(el).querySelector('[part~="sparkline"]').hasAttribute('hidden')).toBe(true);
  },
};

/** Hàng KPI cho dashboard */
export const DashboardRow = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px;">
      <hui-stat-card title="Doanh thu" value="128500000" suffix=" ₫" delta="12.5" delta-label="so với tháng trước" icon="star" color="success" .trend=${REVENUE} effect="lift"></hui-stat-card>
      <hui-stat-card title="Đơn hàng" value="3120" delta="-4.5" delta-label="so với tháng trước" icon="calendar" color="warning" .trend=${ORDERS} effect="lift"></hui-stat-card>
      <hui-stat-card title="Tỉ lệ thoát" value="41.2" suffix="%" precision="1" delta="-3.4" invert-delta delta-label="so với tháng trước" icon="eye-off" color="danger" .trend=${BOUNCE} effect="lift"></hui-stat-card>
      <hui-stat-card title="Người dùng" value="14820" delta="0" delta-label="so với tháng trước" icon="user" color="info" .trend=${USERS} effect="lift" href="#users"></hui-stat-card>
    </div>
  `,
};

export const VariantsAndSizes = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; align-items: start;">
      <hui-stat-card size="sm" variant="outlined" title="sm · outlined" value="512" delta="3.1" icon="mail"></hui-stat-card>
      <hui-stat-card size="md" variant="filled" title="md · filled" value="2048" delta="-1.2" icon="phone" color="warning"></hui-stat-card>
      <hui-stat-card size="lg" title="lg · elevated" value="99.9" suffix="%" precision="1" delta="0.4" icon="success" color="success" .trend=${REVENUE}></hui-stat-card>
      <hui-stat-card title="Chuỗi (không đếm)" value="N/A" icon="info" color="info"></hui-stat-card>
      <hui-stat-card loading title="Đang tải" value="1"></hui-stat-card>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .sc-brand {
        --hui-card-radius: 18px;
        --hui-stat-card-icon-size: 3.25rem;
        --hui-stat-card-icon-bg: var(--hui-primary);
        --hui-stat-card-icon-color: var(--hui-text-inverse);
        --hui-stat-card-value-font-size: 2.25rem;
        --hui-stat-card-sparkline-color: var(--hui-primary);
        --hui-stat-card-sparkline-height: 56px;
        --hui-stat-card-sparkline-width: 3;
      }
      hui-stat-card.sc-brand::part(title) { text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.75rem; }
      hui-stat-card.sc-brand::part(delta) { border-radius: 4px; }
      hui-stat-card.sc-brand::part(sparkline-area) { opacity: 0.3; }
    </style>
    <div style="max-width: 300px;">
      <hui-stat-card class="sc-brand" title="Lượt truy cập" value="58210" delta="22.4" delta-label="7 ngày qua" icon="eye" .trend=${USERS}></hui-stat-card>
    </div>
  `,
};
