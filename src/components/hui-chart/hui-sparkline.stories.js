/**
 * Storybook Stories — HUI Sparkline (mini chart đường / vùng / cột)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { format } from '../../core/format.js';
import { linePath, monotoneTangents, niceMax } from './index.js';
import '../hui-card/index.js';

const sr = (el) => el.shadowRoot;
const part = (el, name) => sr(el).querySelector(`[part~="${name}"]`);
/** Số lệnh vẽ (M/L/C) trong chuỗi d = số điểm */
const commands = (d) => (d.match(/[MLC]/g) || []).length;

const REVENUE = [12, 14, 13, 17, 16, 19, 22, 21, 25, 28];
const WEEK = [
  { label: 'T2', value: 4200000 }, { label: 'T3', value: 5100000 }, { label: 'T4', value: 4800000 },
  { label: 'T5', value: 6100000 }, { label: 'T6', value: 7300000 }, { label: 'T7', value: 6900000 },
  { label: 'CN', value: 8200000 },
];
const random = (n, base = 20) => Array.from({ length: n }, () => Math.round(base + Math.random() * base * 1.5));

export default {
  title: 'Molecules/Charts/HuiSparkline',
  component: 'hui-sparkline',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Sparkline** — biểu đồ xu hướng nhỏ (không trục) rộng 100% khung chứa: \`line\` | \`area\` | \`bar\`, đường cong
\`smooth\` dạng **monotone** (không vọt quá dữ liệu), đường tham chiếu, tooltip + điều hướng bàn phím.
Vẽ bằng chuỗi path SVG; chỉ tính lại khi data đổi hoặc khung đổi kích thước (ResizeObserver).
Đường **tự vẽ** khi cuộn tới (stroke-dashoffset), data đổi thì **chuyển tiếp mượt** giữa hình cũ và mới.

\`\`\`html
<hui-sparkline data="[12,14,13,17,16,19,22]"></hui-sparkline>
<hui-sparkline type="area" curve="smooth" color="success" height="56" format="currency"
  data='[{"label":"T2","value":4200000},{"label":"T3","value":5100000}]' reference="4500000"></hui-sparkline>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | JSON | \`[]\` | Mảng số hoặc \`{label, value}\` |
| \`type\` | string | \`line\` | \`line\` \\| \`area\` \\| \`bar\` |
| \`curve\` | string | \`linear\` | \`linear\` \\| \`smooth\` (monotone cubic) |
| \`color\` | string | \`primary\` | Preset \`primary\` \\| \`success\` \\| \`warning\` \\| \`danger\` \\| \`info\` \\| \`secondary\` (kèm sắc độ \`primary-4\`…) hoặc màu CSS |
| \`height\` | number | \`40\` | Chiều cao (px); chiều rộng luôn 100% |
| \`stroke-width\` | number | \`2\` | Độ dày nét |
| \`show-dots\` | string | \`last\` | \`last\` \\| \`all\` \\| \`none\` (attribute rỗng = \`all\`) |
| \`min\` / \`max\` | number | — | Ghi đè thang giá trị |
| \`reference\` | number | — | Đường tham chiếu ngang (mục tiêu, trung bình) |
| \`format\` | string | — | Định dạng số của format.js: \`number:1\`, \`currency\`, \`currency:USD\`, \`percent\`, \`compact\` |
| \`label\` | string | "Biểu đồ đường" | Tên cho trình đọc màn hình |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng vẽ / chuyển tiếp |

### Properties
| Property | Mô tả |
|----------|-------|
| \`data\` | Mảng (gán trực tiếp) |
| \`formatter\` | Hàm \`(value, item) => string\` — ưu tiên hơn \`format\` |
| \`points\` (chỉ đọc) | Tọa độ px các điểm |
| \`domain\` (chỉ đọc) | Thang đang dùng \`{min, max}\` |
| \`trend\` (chỉ đọc) | \`up\` \\| \`down\` \\| \`flat\` |

Hàm thuần dùng lại được: \`import { linePath, areaPath, arcPath, monotoneTangents, niceMax } from 'hui-lib/hui-chart'\`.

### Events
Không có (chỉ hiển thị).

### Parts
\`base\`, \`svg\`, \`line\`, \`area\`, \`bar\`, \`bar-active\`, \`dots\`, \`dot-last\`, \`dot-active\`, \`cursor\`, \`reference\`,
\`tooltip\` (+ \`tooltip-label\`, \`tooltip-value\`), \`data-table\`.

### Custom states
\`:state(trend-up)\` · \`:state(trend-down)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-sparkline-color\` | Màu (ghi đè attribute color) |
| \`--hui-sparkline-height\` | Chiều cao |
| \`--hui-sparkline-stroke-width\` | Độ dày nét |
| \`--hui-sparkline-area-opacity\` | Độ đậm vùng tô (mặc định 0.28) |
| \`--hui-sparkline-reference-color\` / \`--hui-sparkline-cursor-color\` | Đường tham chiếu / đường dọc khi hover |
| \`--hui-sparkline-dot-ring\` | Viền chấm |
| \`--hui-sparkline-duration\` | Thời lượng vẽ (mặc định 800ms) |
| \`--hui-chart-tooltip-bg\` / \`--hui-chart-tooltip-color\` | Tooltip (chung các chart) |
| \`--hui-chart-color-1\` … \`-12\` | Bảng màu chuỗi (chung các chart) |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| Tab | Focus biểu đồ (hiện điểm cuối) |
| ← / → | Điểm trước / sau (tooltip + aria-live đọc giá trị) |
| Home / End | Điểm đầu / cuối |
| Esc | Ẩn tooltip |

### Accessibility
Khung \`role="img"\` với \`aria-label\` tóm tắt: thấp nhất, cao nhất, hiện tại, xu hướng tăng/giảm (+ mốc tham chiếu).
Kèm **bảng dữ liệu ẩn** (sr-only) để trình đọc màn hình duyệt từng điểm.

### Locale
\`chart.sparkline\` · \`chart.summary\` · \`chart.trendUp\` · \`chart.trendDown\` · \`chart.trendFlat\` · \`chart.reference\` · \`chart.point\` ·
\`chart.label\` · \`chart.value\` · \`chart.empty\` (chưa có trong locale.js → dùng bản dự phòng vi/en).
        `,
      },
    },
  },
  argTypes: {
    type: { control: 'select', options: ['line', 'area', 'bar'] },
    curve: { control: 'select', options: ['linear', 'smooth'] },
    color: { control: 'select', options: ['primary', 'success', 'warning', 'danger', 'info', 'secondary'] },
    height: { control: 'number' },
    strokeWidth: { control: 'number' },
    showDots: { control: 'select', options: ['last', 'all', 'none'] },
    format: { control: 'text' },
    noAnimation: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 320px;">
      <hui-sparkline
        .data=${REVENUE}
        type=${args.type}
        curve=${args.curve}
        color=${args.color}
        height=${args.height}
        stroke-width=${args.strokeWidth}
        show-dots=${args.showDots}
        format=${args.format}
        ?no-animation=${args.noAnimation}
      ></hui-sparkline>
    </div>
  `,
  args: { type: 'area', curve: 'smooth', color: 'primary', height: 48, strokeWidth: 2, showDots: 'last', format: 'number', noAnimation: false },
};

/** line / area / bar / smooth — số lệnh vẽ trong path = số điểm dữ liệu */
export const Types = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px;">
      ${[
        ['sp-line', 'line', 'linear', 'Line'],
        ['sp-smooth', 'line', 'smooth', 'Line smooth'],
        ['sp-area', 'area', 'smooth', 'Area smooth'],
        ['sp-bar', 'bar', 'linear', 'Bar'],
      ].map(([id, type, curve, title]) => html`
        <div>
          <div style="font-size: 12px; color: var(--hui-text-secondary); margin-bottom: 6px;">${title}</div>
          <hui-sparkline id=${id} type=${type} curve=${curve} .data=${REVENUE} height="48" show-dots="all" no-animation></hui-sparkline>
        </div>
      `)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const get = (id) => canvasElement.querySelector(`#${id}`);
    await waitFor(() => expect(commands(part(get('sp-line'), 'line').getAttribute('d'))).toBe(REVENUE.length));
    const line = part(get('sp-line'), 'line').getAttribute('d');
    await expect(line.startsWith('M')).toBe(true);
    await expect((line.match(/L/g) || []).length).toBe(REVENUE.length - 1);

    const smooth = part(get('sp-smooth'), 'line').getAttribute('d');
    await expect(commands(smooth)).toBe(REVENUE.length);
    await expect((smooth.match(/C/g) || []).length).toBe(REVENUE.length - 1);

    // Area: đường + khép đáy (2 lệnh L + Z)
    const area = part(get('sp-area'), 'area').getAttribute('d');
    await expect(area.endsWith('Z')).toBe(true);
    await expect(commands(area)).toBe(REVENUE.length + 2);

    // Bar: mỗi cột 1 hình chữ nhật (1 lệnh M)
    const bars = part(get('sp-bar'), 'bar').getAttribute('d');
    await expect((bars.match(/M/g) || []).length).toBe(REVENUE.length);
    await expect(part(get('sp-bar'), 'line').getAttribute('d')).toBe('');

    // show-dots="all": 1 vòng tròn (M + 2 cung a) mỗi điểm
    await expect((part(get('sp-line'), 'dots').getAttribute('d').match(/M/g) || []).length).toBe(REVENUE.length);
    await expect(get('sp-line').points.length).toBe(REVENUE.length);
  },
};

/** Đường cong monotone: dữ liệu có bậc thang vẫn không vọt quá đỉnh / đáy (so với spline thường) */
export const SmoothNoOvershoot = {
  render: () => html`
    <div style="max-width: 360px;">
      <hui-sparkline id="sp-step" curve="smooth" .data=${[10, 10, 10, 30, 30, 30, 10, 10]} height="60" show-dots="all" no-animation></hui-sparkline>
    </div>
  `,
  play: async ({ canvasElement }) => {
    // Hàm thuần: điểm cực trị / đoạn phẳng có tiếp tuyến 0 → không vượt
    const pts = [{ x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 30 }, { x: 3, y: 30 }];
    const m = monotoneTangents(pts);
    await expect(m[1]).toBe(0);
    await expect(m[2]).toBe(0);
    await expect(linePath([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toBe('M0,0L10,5');
    await expect(niceMax(87)).toBe(100);
    await expect(niceMax(2300)).toBe(2500);

    const el = canvasElement.querySelector('#sp-step');
    await waitFor(() => expect(el.points.length).toBe(8));
    // Mọi tọa độ y của điểm điều khiển Bézier nằm trong [y cao nhất, y thấp nhất] của dữ liệu
    const ys = el.points.map((p) => p.y);
    const d = part(el, 'line').getAttribute('d');
    const ctrlYs = [...d.matchAll(/[ ,C](-?[\d.]+),(-?[\d.]+)/g)].map((x) => Number(x[2]));
    for (const y of ctrlYs) {
      await expect(y).toBeGreaterThanOrEqual(Math.min(...ys) - 0.01);
      await expect(y).toBeLessThanOrEqual(Math.max(...ys) + 0.01);
    }
  },
};

/** min / max ghi đè thang; reference vẽ đường ngang và luôn nằm trong thang */
export const MinMaxReference = {
  render: () => html`
    <div style="display: grid; gap: 24px; max-width: 360px;">
      <hui-sparkline id="sp-auto" .data=${[5, 8, 6, 10, 7]} height="60" no-animation></hui-sparkline>
      <hui-sparkline id="sp-range" .data=${[5, 8, 6, 10, 7]} min="0" max="20" reference="15" format="number:1" height="60" no-animation></hui-sparkline>
      <hui-sparkline id="sp-ref-out" .data=${[5, 8, 6, 10, 7]} reference="2" type="area" color="warning" height="60" no-animation></hui-sparkline>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const auto = canvasElement.querySelector('#sp-auto');
    await waitFor(() => expect(auto.points.length).toBe(5));
    await expect(auto.domain).toEqual({ min: 5, max: 10 });
    const ys = auto.points.map((p) => p.y);
    // Giá trị nhỏ nhất ở thấp nhất (y lớn nhất), lớn nhất ở cao nhất
    await expect(ys[0]).toBe(Math.max(...ys));
    await expect(ys[3]).toBe(Math.min(...ys));
    await expect(part(auto, 'reference').hasAttribute('hidden')).toBe(true);

    const range = canvasElement.querySelector('#sp-range');
    await expect(range.domain).toEqual({ min: 0, max: 20 });
    const ref = part(range, 'reference');
    await expect(ref.hasAttribute('hidden')).toBe(false);
    const refY = Number(ref.getAttribute('y1'));
    // 15 > mọi giá trị → đường tham chiếu nằm trên cả đường dữ liệu
    for (const p of range.points) await expect(refY).toBeLessThan(p.y);
    // Thang 0–20: điểm 10 nằm đúng giữa vùng vẽ
    const h = range.shadowRoot.querySelector('[part="base"]').clientHeight;
    await expect(Math.abs(range.points[3].y - h / 2)).toBeLessThan(0.5);
    // Tóm tắt cho trình đọc màn hình theo format number:1
    const label = part(range, 'base').getAttribute('aria-label');
    await expect(label).toContain(`Thấp nhất ${format(5, 'number:1')}`);
    await expect(label).toContain(`cao nhất ${format(10, 'number:1')}`);
    await expect(label).toContain(`hiện tại ${format(7, 'number:1')}`);
    await expect(label).toContain('xu hướng tăng');
    await expect(label).toContain(`mốc tham chiếu ${format(15, 'number:1')}`);

    // reference ngoài dữ liệu → thang tự mở rộng
    const out = canvasElement.querySelector('#sp-ref-out');
    await expect(out.domain.min).toBe(2);
    // Bảng dữ liệu ẩn: 5 dòng
    await expect(part(out, 'data-table').querySelectorAll('tbody tr').length).toBe(5);
  },
};

/** Tooltip + bàn phím: Home → ArrowRight hiện giá trị điểm thứ 2 đã định dạng tiền tệ */
export const TooltipKeyboard = {
  render: () => html`
    <div style="max-width: 360px; padding-top: 48px;">
      <hui-sparkline id="sp-kb" .data=${WEEK} type="area" curve="smooth" format="currency" height="64" label="Doanh thu tuần" no-animation></hui-sparkline>
      <p style="font-size: 12px; color: var(--hui-text-secondary);">Tab vào biểu đồ → ←/→ chuyển ngày, Home/End, Esc ẩn tooltip. Di chuột để xem từng điểm.</p>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-kb');
    await waitFor(() => expect(el.points.length).toBe(WEEK.length));
    const base = part(el, 'base');
    const tip = part(el, 'tooltip');
    await expect(base.getAttribute('role')).toBe('img');
    await expect(base.getAttribute('tabindex')).toBe('0');
    await expect(base.getAttribute('aria-label')).toContain('Doanh thu tuần');

    el.focus();
    await expect(sr(el).activeElement).toBe(base);
    // Focus → hiện điểm cuối
    await expect(tip.classList.contains('is-visible')).toBe(true);
    await expect(tip.textContent).toContain(format(8200000, 'currency'));

    await userEvent.keyboard('{Home}');
    await userEvent.keyboard('{ArrowRight}');
    await expect(tip.textContent).toContain('T3');
    await expect(tip.textContent).toContain(format(5100000, 'currency'));
    await expect(part(el, 'dot-active').hasAttribute('hidden')).toBe(false);
    await expect(Number(part(el, 'dot-active').getAttribute('cx'))).toBeCloseTo(el.points[1].x, 1);
    // aria-live đọc điểm vừa chọn
    await expect(sr(el).querySelector('[aria-live]').textContent).toBe(`T3: ${format(5100000, 'currency')}`);

    await userEvent.keyboard('{End}');
    await expect(tip.textContent).toContain('CN');
    await userEvent.keyboard('{Escape}');
    await expect(tip.classList.contains('is-visible')).toBe(false);
    base.blur();
    await expect(part(el, 'cursor').hasAttribute('hidden')).toBe(true);
  },
};

/** Màu preset (token — tự đổi theo dark mode), sắc độ và màu CSS truyền từ ngoài */
export const Colors = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 20px;">
      ${['primary', 'success', 'warning', 'danger', 'info', 'secondary', 'primary-4', 'var(--hui-success-8)'].map((c) => html`
        <div>
          <div style="font-size: 12px; color: var(--hui-text-secondary); margin-bottom: 4px;"><code>${c}</code></div>
          <hui-sparkline type="area" curve="smooth" color=${c} .data=${random(10)} height="40"></hui-sparkline>
        </div>
      `)}
    </div>
  `,
};

/** Cùng một biểu đồ trên nền sáng và vùng data-theme="dark" — màu lấy từ token nên tự đổi */
export const DarkModeFriendly = {
  render: () => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      ${['light', 'dark'].map((theme) => html`
        <div data-theme=${theme} style="padding: 16px; border-radius: 12px; background: var(--hui-bg); color: var(--hui-text); border: 1px solid var(--hui-border);">
          <div style="font-size: 12px; color: var(--hui-text-secondary); margin-bottom: 8px;">data-theme="${theme}"</div>
          <hui-sparkline type="area" curve="smooth" .data=${REVENUE} reference="20" height="56"></hui-sparkline>
          <hui-sparkline type="bar" color="info" .data=${REVENUE} height="40" style="margin-top: 12px;"></hui-sparkline>
        </div>
      `)}
    </div>
  `,
};

/** Trong ô KPI (hui-card): sparkline rộng 100% card */
export const InKpiCard = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
      ${[
        ['Doanh thu', '82,4 Tr ₫', '+12,5%', 'success', WEEK.map((d) => d.value), 'currency'],
        ['Đơn hàng', '1.284', '+4,1%', 'primary', [40, 42, 39, 45, 48, 47, 52], 'number'],
        ['Tỉ lệ hủy', '3,2%', '-0,8%', 'danger', [4.1, 3.9, 4.0, 3.6, 3.5, 3.4, 3.2], 'percent'],
      ].map(([title, value, delta, color, data, fmt]) => html`
        <hui-card variant="outlined">
          <div style="font-size: 13px; color: var(--hui-text-secondary);">${title}</div>
          <div style="display: flex; align-items: baseline; gap: 8px; margin: 4px 0 12px;">
            <strong style="font-size: 22px;">${value}</strong>
            <span style="font-size: 12px; color: var(--hui-${color});">${delta}</span>
          </div>
          <hui-sparkline type="area" curve="smooth" color=${color} .data=${data} format=${fmt} height="48" label=${title}></hui-sparkline>
        </hui-card>
      `)}
    </div>
  `,
};

/** Bấm nút → data ngẫu nhiên mới (đổi cả số điểm) → đường chuyển tiếp mượt sang hình mới */
export const DataUpdate = {
  render: () => {
    const update = (e) => {
      const root = e.target.closest('div');
      const n = 6 + Math.floor(Math.random() * 8);
      root.querySelectorAll('hui-sparkline').forEach((el) => { el.data = random(n); });
    };
    return html`
      <div style="display: grid; gap: 16px; max-width: 420px;">
        <hui-sparkline id="sp-update" type="area" curve="smooth" .data=${REVENUE} height="64" reference="25"></hui-sparkline>
        <hui-sparkline type="bar" color="info" .data=${REVENUE} height="48"></hui-sparkline>
        <button id="sp-randomize" type="button" @click=${update} style="justify-self: start;">Dữ liệu ngẫu nhiên</button>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-update');
    await waitFor(() => expect(el.points.length).toBe(REVENUE.length));
    el.data = [3, 9, 4, 12];
    await el.updateComplete;
    // Hình đích có ngay; path chuyển tiếp xong thì số lệnh = 4
    await expect(el.points.length).toBe(4);
    await waitFor(() => expect(commands(part(el, 'line').getAttribute('d'))).toBe(4), { timeout: 3000 });
    await expect(el.trend).toBe('up');
  },
};

/** Co giãn theo khung: ResizeObserver tính lại viewBox */
export const Responsive = {
  render: () => html`
    <div id="sp-box" style="width: 200px; resize: horizontal; overflow: hidden; border: 1px dashed var(--hui-border); padding: 8px;">
      <hui-sparkline id="sp-resp" type="area" .data=${REVENUE} height="48" no-animation></hui-sparkline>
    </div>
    <p style="font-size: 12px; color: var(--hui-text-secondary);">Kéo góc phải dưới khung để đổi chiều rộng.</p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-resp');
    const box = canvasElement.querySelector('#sp-box');
    await waitFor(() => expect(el.points.length).toBe(REVENUE.length));
    const before = el.points[REVENUE.length - 1].x;
    box.style.width = '400px';
    await waitFor(() => expect(el.points[REVENUE.length - 1].x).toBeGreaterThan(before + 100));
    await expect(part(el, 'svg').getAttribute('viewBox')).toContain(`${el.shadowRoot.querySelector('[part="base"]').clientWidth}`);
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-sparkline.brand {
        --hui-sparkline-color: var(--hui-warning-7);
        --hui-sparkline-height: 72px;
        --hui-sparkline-stroke-width: 3;
        --hui-sparkline-area-opacity: 0.5;
        --hui-sparkline-reference-color: var(--hui-danger);
        --hui-chart-tooltip-bg: var(--hui-warning-9);
      }
      hui-sparkline.brand::part(line) { stroke-dasharray: 6 3; }
      hui-sparkline.brand::part(dot-last) { fill: var(--hui-danger); }
    </style>
    <div style="max-width: 360px;">
      <hui-sparkline class="brand" type="area" curve="smooth" .data=${REVENUE} reference="20"></hui-sparkline>
    </div>
  `,
};
