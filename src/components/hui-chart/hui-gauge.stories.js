/**
 * Storybook Stories — HUI Gauge (đồng hồ đo)
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { format } from '../../core/format.js';
import './index.js';
import '../hui-card/index.js';

const sr = (el) => el.shadowRoot;
const base = (el) => sr(el).querySelector('[part="base"]');
const arc = (el) => sr(el).querySelector('[part="arc"]');
/** Màu thật của một token (so sánh với computed color) */
const tokenColor = (token) => {
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
};

const BANDS = [
  { value: 60, color: 'success' },
  { value: 85, color: 'warning' },
  { value: 100, color: 'danger' },
];

export default {
  title: 'Molecules/Charts/HuiGauge',
  component: 'hui-gauge',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Gauge** — đồng hồ đo một giá trị trong \`[min, max]\`: kiểu **cung** (\`arc\`, tô tới giá trị) hoặc **kim** (\`needle\`,
kim chỉ trên các dải màu). Dải ngưỡng \`thresholds\` đổi màu theo giá trị (xanh / vàng / đỏ…).
Cung / kim **quét** từ min khi cuộn tới, giá trị đổi thì quét tiếp từ giá trị cũ (chữ số đếm theo).

\`\`\`html
<hui-gauge value="72" unit="%" label="CPU"
  thresholds='[{"value":60,"color":"success"},{"value":85,"color":"warning"},{"value":100,"color":"danger"}]'></hui-gauge>
<hui-gauge variant="needle" sweep="180" value="420" max="1000" unit="ms" show-limits></hui-gauge>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | number | \`0\` | Giá trị (bị kẹp trong [min, max] khi vẽ) |
| \`min\` / \`max\` | number | \`0\` / \`100\` | Khoảng đo |
| \`thresholds\` | JSON | \`[]\` | \`[{value, color}]\` — \`value\` là **cận trên** của dải (dải đầu bắt đầu từ min; dải cuối kéo tới max) |
| \`unit\` | string | — | Đơn vị sau giá trị |
| \`format\` | string | — | Định dạng số (format.js) |
| \`variant\` | string | \`arc\` | \`arc\` \\| \`needle\` |
| \`size\` | number | \`200\` | Đường kính (px; co theo khung hẹp hơn) |
| \`thickness\` | number | ~9% size | Độ dày cung (px) |
| \`sweep\` | number | \`240\` | Góc mở (90–300°; 180 = nửa vòng) |
| \`color\` | string | \`primary\` | Màu cung khi không có thresholds |
| \`label\` | string | — | Nhãn dưới giá trị + tên cho trình đọc màn hình |
| \`show-limits\` | boolean | \`false\` | Nhãn min / max ở hai đầu |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng quét |

### Properties
\`formatter\` (hàm \`(value) => string\`), \`currentColor\` (chỉ đọc — màu CSS của dải chứa giá trị).

### Events
Không có (chỉ hiển thị).

### Slots
| Slot | Mô tả |
|------|-------|
| \`center\` | Thay vùng chữ giữa (giá trị + đơn vị + nhãn) |

### Parts
\`base\`, \`svg\`, \`track\`, \`band\`, \`arc\`, \`needle\`, \`hub\`, \`limit\`, \`center\`, \`value\`, \`unit\`, \`label\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-gauge-size\` | Đường kính |
| \`--hui-gauge-color\` | Màu cung giá trị (ghi đè màu ngưỡng) |
| \`--hui-gauge-track-color\` | Cung nền |
| \`--hui-gauge-needle-color\` | Kim + trục |
| \`--hui-gauge-value-color\` / \`--hui-gauge-value-font-size\` / \`--hui-gauge-label-color\` | Chữ |
| \`--hui-gauge-duration\` | Thời lượng quét (1000ms) |

### Bàn phím
Không nhận focus (chỉ hiển thị).

### Accessibility
\`role="meter"\` + \`aria-valuenow\` / \`aria-valuemin\` / \`aria-valuemax\` / \`aria-valuetext\` ("72 %") + \`aria-label\` (label hoặc "Đồng hồ đo").
SVG \`aria-hidden\`. aria-valuenow luôn là giá trị cuối (không đếm theo hiệu ứng).

### Locale
\`chart.gauge\`.
        `,
      },
    },
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    variant: { control: 'select', options: ['arc', 'needle'] },
    sweep: { control: { type: 'range', min: 90, max: 300, step: 10 } },
    size: { control: 'number' },
    thickness: { control: 'number' },
    showLimits: { control: 'boolean' },
    unit: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-gauge value=${args.value} variant=${args.variant} sweep=${args.sweep} size=${args.size} thickness=${args.thickness}
      ?show-limits=${args.showLimits} unit=${args.unit} label="CPU" .thresholds=${BANDS}></hui-gauge>
  `,
  args: { value: 72, variant: 'arc', sweep: 240, size: 200, thickness: 18, showLimits: true, unit: '%' },
};

/** role="meter" + aria-valuenow/min/max/valuetext; màu cung theo dải ngưỡng */
export const ThresholdsAndAria = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 24px;">
      <hui-gauge id="gg-a" value="92" unit="%" label="CPU" .thresholds=${BANDS} no-animation></hui-gauge>
      <hui-gauge id="gg-b" value="250" min="0" max="500" format="number" unit="ms" label="Độ trễ" no-animation></hui-gauge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const a = canvasElement.querySelector('#gg-a');
    const meter = base(a);
    await expect(meter.getAttribute('role')).toBe('meter');
    await expect(meter.getAttribute('aria-valuenow')).toBe('92');
    await expect(meter.getAttribute('aria-valuemin')).toBe('0');
    await expect(meter.getAttribute('aria-valuemax')).toBe('100');
    await expect(meter.getAttribute('aria-valuetext')).toBe('92 %');
    await expect(meter.getAttribute('aria-label')).toBe('CPU');
    // 92 > 85 → dải đỏ
    await expect(getComputedStyle(arc(a)).stroke).toBe(tokenColor('--hui-danger'));
    await expect(sr(a).querySelectorAll('[part="band"]').length).toBe(3);
    await expect(sr(a).querySelector('.gauge__value-text').textContent).toBe(format(92, 'number'));

    a.value = 70;
    await a.updateComplete;
    await expect(meter.getAttribute('aria-valuenow')).toBe('70');
    await expect(getComputedStyle(arc(a)).stroke).toBe(tokenColor('--hui-warning'));
    a.value = 30;
    await a.updateComplete;
    await expect(getComputedStyle(arc(a)).stroke).toBe(tokenColor('--hui-success'));
    // Vượt max → kẹp lại
    a.value = 140;
    await a.updateComplete;
    await expect(meter.getAttribute('aria-valuenow')).toBe('100');

    const b = canvasElement.querySelector('#gg-b');
    await expect(base(b).getAttribute('aria-valuemax')).toBe('500');
    await expect(base(b).getAttribute('aria-valuetext')).toBe(`${format(250, 'number')} ms`);
    // Không thresholds → màu color (primary)
    await expect(getComputedStyle(arc(b)).stroke).toBe(tokenColor('--hui-primary'));
  },
};

/** Kiểu kim: dải màu là cung nền, kim xoay quanh tâm (0° = 12 giờ khi giá trị ở giữa) */
export const Needle = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end;">
      <hui-gauge id="gg-needle" variant="needle" value="50" .thresholds=${BANDS} label="Tải" no-animation></hui-gauge>
      <hui-gauge variant="needle" sweep="180" value="420" max="1000" unit="ms" show-limits .thresholds=${[
        { value: 300, color: 'success' }, { value: 700, color: 'warning' }, { value: 1000, color: 'danger' },
      ]}></hui-gauge>
      <hui-gauge variant="needle" sweep="180" value="64" color="info" unit="%" show-limits></hui-gauge>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#gg-needle');
    const needle = sr(el).querySelector('[part="needle"]');
    await expect(needle.hasAttribute('hidden')).toBe(false);
    await expect(needle.getAttribute('transform')).toBe('rotate(0 100 100)');
    // Có thresholds → không vẽ cung giá trị, nền là các dải
    await expect(arc(el).getAttribute('d')).toBe('');
    el.value = 100;
    await el.updateComplete;
    await expect(needle.getAttribute('transform')).toBe('rotate(120 100 100)');
  },
};

/** Góc mở & kích thước */
export const SweepAndSize = {
  render: () => html`
    <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end;">
      <hui-gauge value="45" sweep="180" size="160" color="success" unit="%" label="180°"></hui-gauge>
      <hui-gauge value="45" sweep="240" size="160" color="info" unit="%" label="240°"></hui-gauge>
      <hui-gauge value="45" sweep="300" size="160" color="warning" unit="%" label="300°"></hui-gauge>
      <hui-gauge value="45" size="110" thickness="8" unit="%"></hui-gauge>
    </div>
  `,
};

/** Trong ô KPI + dark mode */
export const InKpiCardDarkMode = {
  render: () => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      ${['light', 'dark'].map((theme) => html`
        <div data-theme=${theme} style="padding: 16px; border-radius: 12px; background: var(--hui-bg);">
          <hui-card variant="outlined" title="Máy chủ" subtitle="data-theme=${theme}">
            <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 12px;">
              <hui-gauge value="72" size="130" unit="%" label="CPU" .thresholds=${BANDS}></hui-gauge>
              <hui-gauge value="41" size="130" unit="%" label="RAM" color="info"></hui-gauge>
            </div>
          </hui-card>
        </div>
      `)}
    </div>
  `,
};

/** Bấm nút → giá trị ngẫu nhiên → cung / kim quét tiếp từ giá trị cũ, chữ số đếm theo */
export const DataUpdate = {
  render: () => {
    const update = (e) => {
      e.target.closest('div').querySelectorAll('hui-gauge').forEach((g) => { g.value = Math.round(Math.random() * 100); });
    };
    return html`
      <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: center;">
        <hui-gauge id="gg-update" value="30" unit="%" .thresholds=${BANDS}></hui-gauge>
        <hui-gauge variant="needle" value="30" .thresholds=${BANDS}></hui-gauge>
        <button type="button" @click=${update}>Giá trị ngẫu nhiên</button>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#gg-update');
    el.value = 90;
    await el.updateComplete;
    await expect(base(el).getAttribute('aria-valuenow')).toBe('90');
    // Chữ đếm dần tới giá trị cuối
    await waitFor(() => expect(sr(el).querySelector('.gauge__value-text').textContent).toBe('90'), { timeout: 4000 });
    await expect(el.currentColor).toBe('var(--hui-danger)');
  },
};

/** Override từ ngoài: biến CSS + ::part + slot center */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-gauge.brand {
        --hui-gauge-size: 240px;
        --hui-gauge-track-color: var(--hui-primary-2);
        --hui-gauge-color: var(--hui-primary-7);
        --hui-gauge-value-font-size: 40px;
        --hui-gauge-needle-color: var(--hui-danger);
      }
      hui-gauge.brand::part(arc) { stroke-linecap: butt; }
      hui-gauge.brand::part(label) { text-transform: uppercase; letter-spacing: 0.08em; }
    </style>
    <div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-end;">
      <hui-gauge class="brand" value="64" unit="pts" label="Điểm NPS" thickness="24"></hui-gauge>
      <hui-gauge value="3.6" max="5" sweep="180" color="warning">
        <div slot="center" style="text-align: center;"><strong style="font-size: 28px;">3,6</strong> <span style="color: var(--hui-warning);">★</span></div>
      </hui-gauge>
    </div>
  `,
};
