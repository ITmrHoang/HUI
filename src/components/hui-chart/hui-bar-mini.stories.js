/**
 * Storybook Stories — HUI Bar Mini (cột nhỏ / thanh xếp hạng)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { format } from '../../core/format.js';
import './index.js';
import '../hui-card/index.js';

const sr = (el) => el.shadowRoot;
const items = (el) => [...sr(el).querySelectorAll('[part~="item"]')];
const bars = (el) => [...sr(el).querySelectorAll('[part~="bar"]')];

const WEEK = [
  { label: 'T2', value: 32 }, { label: 'T3', value: 45 }, { label: 'T4', value: 28 }, { label: 'T5', value: 51 },
  { label: 'T6', value: 64 }, { label: 'T7', value: 80 }, { label: 'CN', value: 58 },
];
const CHANNELS = [
  { label: 'Tìm kiếm tự nhiên', value: 48200 },
  { label: 'Mạng xã hội', value: 31500 },
  { label: 'Trực tiếp', value: 22800 },
  { label: 'Email', value: 9400 },
  { label: 'Giới thiệu', value: 6100 },
];
const random = () => WEEK.map((d) => ({ ...d, value: Math.round(10 + Math.random() * 90) }));

export default {
  title: 'Molecules/Charts/HuiBarMini',
  component: 'hui-bar-mini',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Bar Mini** — biểu đồ cột nhỏ cho dashboard: **dọc** (cột) hoặc **ngang** (danh sách xếp hạng: nhãn trái, thanh, giá trị phải).
Cột **mọc lần lượt** khi cuộn tới; data đổi thì thanh chuyển tiếp mượt (CSS transition). Bấm cột → \`hui-select\`.

\`\`\`html
<hui-bar-mini data='[{"label":"T2","value":32},{"label":"T3","value":45}]' show-labels highlight="T3"></hui-bar-mini>
<hui-bar-mini orientation="horizontal" sort="desc" format="compact"
  data='[{"label":"Tìm kiếm","value":48200},{"label":"Email","value":9400}]'></hui-bar-mini>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`data\` | JSON | \`[]\` | Mảng \`{label, value, color?}\` hoặc số |
| \`orientation\` | string | \`vertical\` | \`vertical\` \\| \`horizontal\` |
| \`show-labels\` | string | \`auto\` | \`auto\` (chỉ horizontal) \\| \`true\` \\| \`false\`; attribute rỗng = true |
| \`show-values\` | string | \`auto\` | \`auto\` (chỉ horizontal) \\| \`true\` \\| \`false\`; attribute rỗng = true |
| \`max\` | number | max(data) | Giá trị ứng với thanh dài nhất |
| \`gap\` | number | 4 / 10 | Khoảng cách cột (px) |
| \`radius\` | number | \`3\` | Bo góc thanh (px) |
| \`height\` | number | \`80\` | Chiều cao vùng cột khi dọc (px) |
| \`highlight\` | string | — | Index (trong data gốc) hoặc label — các mục khác nhạt đi |
| \`sort\` | string | \`none\` | \`none\` \\| \`asc\` \\| \`desc\` |
| \`color\` | string | \`primary\` | Preset / màu CSS / \`palette\` (mỗi mục một màu); \`item.color\` ưu tiên |
| \`format\` | string | — | Định dạng số (format.js) |
| \`label\` | string | "Biểu đồ cột" | Tên cho trình đọc màn hình |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Properties
\`data\`, \`formatter\` (hàm \`(value, item) => string\`), \`rows\` (chỉ đọc — các mục theo thứ tự hiển thị).

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-select\` | \`{ index, item, position }\` | Bấm / Enter / Space trên một mục (\`index\` = vị trí trong data gốc) |

### Parts
\`base\`, \`list\`, \`item\` (+ \`item-highlight\`), \`label\`, \`track\`, \`bar\`, \`value\`, \`tooltip\` (+ \`tooltip-label\`, \`tooltip-value\`).

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-bar-mini-color\` | Màu thanh mặc định |
| \`--hui-bar-mini-height\` | Chiều cao vùng cột (dọc) |
| \`--hui-bar-mini-bar-size\` | Độ dày thanh (ngang, 8px) |
| \`--hui-bar-mini-gap\` / \`--hui-bar-mini-radius\` | Khoảng cách / bo góc |
| \`--hui-bar-mini-track-bg\` | Nền rãnh |
| \`--hui-bar-mini-label-color\` / \`--hui-bar-mini-value-color\` | Màu nhãn / giá trị |
| \`--hui-bar-mini-label-width\` | Rộng tối đa cột nhãn (ngang, 12em) |
| \`--hui-bar-mini-dim-opacity\` | Độ mờ mục không nổi bật (0.45) |
| \`--hui-bar-mini-duration\` | Thời lượng chuyển động (600ms) |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| Tab | Vào nhóm (roving tabindex — chỉ 1 điểm dừng) |
| ← → / ↑ ↓ | Mục trước / sau |
| Home / End | Mục đầu / cuối |
| Enter / Space | Chọn (\`hui-select\`) |
| Esc | Ẩn tooltip |

### Accessibility
Khung \`role="group"\` với nhãn tóm tắt (số mục, mục cao nhất); mỗi mục \`role="button"\` + \`aria-label\` "Nhãn: giá trị";
mục highlight có \`aria-current="true"\`.

### Locale
\`chart.bar\` · \`chart.barSummary\` · \`chart.point\` · \`chart.empty\`.
        `,
      },
    },
  },
  argTypes: {
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    sort: { control: 'select', options: ['none', 'asc', 'desc'] },
    color: { control: 'select', options: ['primary', 'success', 'warning', 'danger', 'info', 'secondary', 'palette'] },
    showLabels: { control: 'select', options: ['auto', 'true', 'false'] },
    showValues: { control: 'select', options: ['auto', 'true', 'false'] },
    height: { control: 'number' },
    gap: { control: 'number' },
    radius: { control: 'number' },
    highlight: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 360px;">
      <hui-bar-mini
        .data=${WEEK}
        orientation=${args.orientation}
        sort=${args.sort}
        color=${args.color}
        show-labels=${args.showLabels}
        show-values=${args.showValues}
        height=${args.height}
        gap=${args.gap}
        radius=${args.radius}
        highlight=${args.highlight}
      ></hui-bar-mini>
    </div>
  `,
  args: { orientation: 'vertical', sort: 'none', color: 'primary', showLabels: 'true', showValues: 'auto', height: 96, gap: 6, radius: 4, highlight: 'T7' },
};

/** Chiều cao cột tỉ lệ với giá trị (max mặc định = giá trị lớn nhất) */
export const Proportional = {
  render: () => html`
    <div style="display: grid; gap: 24px; max-width: 360px;">
      <hui-bar-mini id="bm-v" .data=${[{ label: 'A', value: 10 }, { label: 'B', value: 20 }, { label: 'C', value: 40 }]} height="100" no-animation></hui-bar-mini>
      <hui-bar-mini id="bm-max" .data=${[10, 20, 40]} max="80" height="100" no-animation></hui-bar-mini>
      <hui-bar-mini id="bm-h" orientation="horizontal" .data=${[{ label: 'A', value: 10 }, { label: 'B', value: 20 }, { label: 'C', value: 40 }]} no-animation></hui-bar-mini>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const v = canvasElement.querySelector('#bm-v');
    const hs = bars(v).map((b) => b.getBoundingClientRect().height);
    await expect(Math.abs(hs[2] - 100)).toBeLessThan(1);
    await expect(Math.abs(hs[1] - 50)).toBeLessThan(1);
    await expect(Math.abs(hs[0] - 25)).toBeLessThan(1);
    // Mặc định dọc: không nhãn, không số
    await expect(sr(v).querySelector('[part~="label"]').hidden).toBe(true);

    const max = canvasElement.querySelector('#bm-max');
    const hm = bars(max).map((b) => b.getBoundingClientRect().height);
    await expect(Math.abs(hm[2] - 50)).toBeLessThan(1);

    // Ngang: chiều rộng tỉ lệ, nhãn + giá trị hiện mặc định
    const h = canvasElement.querySelector('#bm-h');
    const ws = bars(h).map((b) => b.getBoundingClientRect().width);
    await expect(Math.abs(ws[0] * 4 - ws[2])).toBeLessThan(2);
    await expect(Math.abs(ws[1] * 2 - ws[2])).toBeLessThan(2);
    await expect(sr(h).querySelector('[part~="label"]').hidden).toBe(false);
    await expect(sr(h).querySelector('[part~="value"]').textContent).toBe(format(10, 'number'));
  },
};

/** Ngang = danh sách xếp hạng: sort desc, định dạng compact, highlight theo label */
export const RankingList = {
  render: () => html`
    <div style="max-width: 420px;">
      <hui-bar-mini id="bm-rank" orientation="horizontal" sort="desc" format="compact" .data=${[...CHANNELS].reverse()} highlight="Trực tiếp" color="info" label="Nguồn truy cập"></hui-bar-mini>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#bm-rank');
    const labels = items(el).map((it) => it.querySelector('[part~="label"]').textContent);
    await expect(labels).toEqual(CHANNELS.map((c) => c.label));
    await expect(el.rows[0].value).toBe(48200);
    // highlight theo label
    const hl = sr(el).querySelector('[part~="item-highlight"]');
    await expect(hl.getAttribute('aria-current')).toBe('true');
    await expect(hl.getAttribute('aria-label')).toBe(`Trực tiếp: ${format(22800, 'compact')}`);
    await expect(sr(el).querySelector('[part="base"]').getAttribute('aria-label')).toContain('Nguồn truy cập');
  },
};

/** Bấm cột → hui-select; bàn phím ←/→ chuyển cột, tooltip hiện giá trị đã định dạng */
export const SelectAndKeyboard = {
  render: () => html`
    <div style="max-width: 360px; padding-top: 40px;">
      <hui-bar-mini id="bm-kb" .data=${WEEK} show-labels format="number" height="90"></hui-bar-mini>
      <p id="bm-out" style="font-size: 12px; color: var(--hui-text-secondary);">Bấm vào một cột…</p>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#bm-kb');
    const out = canvasElement.querySelector('#bm-out');
    const events = [];
    el.addEventListener('hui-select', (e) => {
      events.push(e.detail);
      out.textContent = `Đã chọn ${e.detail.item.label}: ${e.detail.item.value}`;
    });

    await userEvent.click(items(el)[3]);
    await expect(events[0].index).toBe(3);
    await expect(events[0].item).toEqual(WEEK[3]);

    // Roving tabindex: chỉ 1 mục tabindex=0
    await expect(items(el).filter((it) => it.getAttribute('tabindex') === '0').length).toBe(1);
    el.focus();
    await userEvent.keyboard('{Home}');
    await expect(sr(el).activeElement).toBe(items(el)[0]);
    await userEvent.keyboard('{ArrowRight}');
    await expect(sr(el).activeElement).toBe(items(el)[1]);
    const tip = sr(el).querySelector('[part~="tooltip"]');
    await expect(tip.classList.contains('is-visible')).toBe(true);
    await expect(tip.textContent).toContain(`T3`);
    await expect(tip.textContent).toContain(format(45, 'number'));
    await userEvent.keyboard('{Enter}');
    await expect(events[1].index).toBe(1);
    await userEvent.keyboard('{End}');
    await expect(sr(el).activeElement).toBe(items(el)[WEEK.length - 1]);
    await userEvent.keyboard('{Escape}');
    await expect(tip.classList.contains('is-visible')).toBe(false);
    sr(el).activeElement.blur();
  },
};

/** Màu: preset, palette (mỗi mục một màu), item.color riêng */
export const Colors = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px;">
      ${['primary', 'success', 'warning', 'danger', 'palette'].map((c) => html`
        <div>
          <div style="font-size: 12px; color: var(--hui-text-secondary); margin-bottom: 6px;"><code>color="${c}"</code></div>
          <hui-bar-mini color=${c} .data=${WEEK} show-labels height="64"></hui-bar-mini>
        </div>
      `)}
      <div>
        <div style="font-size: 12px; color: var(--hui-text-secondary); margin-bottom: 6px;">item.color</div>
        <hui-bar-mini show-labels height="64" .data=${[
          { label: 'Đạt', value: 72, color: 'success' }, { label: 'Chờ', value: 18, color: 'warning' }, { label: 'Lỗi', value: 10, color: 'danger' },
        ]}></hui-bar-mini>
      </div>
    </div>
  `,
};

/** Hiện số trên đỉnh cột (dọc) */
export const WithValues = {
  render: () => html`
    <div style="max-width: 420px;">
      <hui-bar-mini .data=${WEEK} show-labels show-values height="110" gap="8" radius="6" color="success"></hui-bar-mini>
    </div>
  `,
};

/** Trong ô KPI */
export const InKpiCard = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
      <hui-card variant="outlined">
        <div style="font-size: 13px; color: var(--hui-text-secondary);">Đơn hàng 7 ngày</div>
        <strong style="display: block; font-size: 22px; margin: 4px 0 12px;">358</strong>
        <hui-bar-mini .data=${WEEK} show-labels highlight="CN" height="64" label="Đơn hàng 7 ngày"></hui-bar-mini>
      </hui-card>
      <hui-card variant="outlined">
        <div style="font-size: 13px; color: var(--hui-text-secondary); margin-bottom: 12px;">Nguồn truy cập</div>
        <hui-bar-mini orientation="horizontal" sort="desc" format="compact" .data=${CHANNELS} color="palette"></hui-bar-mini>
      </hui-card>
    </div>
  `,
};

/** Dark mode: màu từ token */
export const DarkModeFriendly = {
  render: () => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      ${['light', 'dark'].map((theme) => html`
        <div data-theme=${theme} style="padding: 16px; border-radius: 12px; background: var(--hui-bg); color: var(--hui-text); border: 1px solid var(--hui-border);">
          <hui-bar-mini .data=${WEEK} show-labels height="64" highlight="T7"></hui-bar-mini>
          <hui-bar-mini orientation="horizontal" .data=${CHANNELS.slice(0, 3)} format="compact" style="margin-top: 16px;"></hui-bar-mini>
        </div>
      `)}
    </div>
  `,
};

/** Bấm nút → data ngẫu nhiên → thanh chuyển tiếp mượt; sort desc thì thứ tự đổi theo */
export const DataUpdate = {
  render: () => {
    const update = (e) => {
      e.target.closest('div').querySelectorAll('hui-bar-mini').forEach((el) => { el.data = random(); });
    };
    return html`
      <div style="display: grid; gap: 20px; max-width: 420px;">
        <hui-bar-mini id="bm-update" .data=${WEEK} show-labels show-values height="96"></hui-bar-mini>
        <hui-bar-mini orientation="horizontal" sort="desc" .data=${WEEK} color="info"></hui-bar-mini>
        <button type="button" @click=${update} style="justify-self: start;">Dữ liệu ngẫu nhiên</button>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#bm-update');
    el.data = [{ label: 'X', value: 5 }, { label: 'Y', value: 10 }];
    await el.updateComplete;
    await expect(items(el).length).toBe(2);
    // Sau khi chuyển tiếp: cột Y cao gấp đôi cột X
    await waitFor(() => {
      const [a, b] = bars(el).map((x) => x.getBoundingClientRect().height);
      expect(b).toBeGreaterThan(40);
      expect(Math.abs(a * 2 - b)).toBeLessThan(1);
    }, { timeout: 3000 });
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      hui-bar-mini.brand {
        --hui-bar-mini-color: var(--hui-danger-5);
        --hui-bar-mini-height: 120px;
        --hui-bar-mini-radius: 999px;
        --hui-bar-mini-gap: 10px;
        --hui-bar-mini-track-bg: var(--hui-fill-tertiary);
        --hui-bar-mini-dim-opacity: 0.25;
      }
      hui-bar-mini.brand::part(label) { font-weight: 600; text-transform: uppercase; }
      hui-bar-mini.rank {
        --hui-bar-mini-bar-size: 14px;
        --hui-bar-mini-color: var(--hui-success);
      }
      hui-bar-mini.rank::part(value) { color: var(--hui-success-7); }
    </style>
    <div style="display: grid; gap: 24px; max-width: 420px;">
      <hui-bar-mini class="brand" .data=${WEEK} show-labels highlight="5"></hui-bar-mini>
      <hui-bar-mini class="rank" orientation="horizontal" sort="desc" format="compact" .data=${CHANNELS}></hui-bar-mini>
    </div>
  `,
};
