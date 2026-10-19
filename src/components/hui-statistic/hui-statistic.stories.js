/**
 * Storybook Stories — HUI Statistic
 * Số liệu thống kê (Ant Statistic) + đếm ngược (Statistic.Countdown).
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import { formatCountdown } from './index.js';
import { setLocale, getLocaleName } from '../../core/locale.js';
import '../hui-card/index.js';
import '../hui-button/index.js';

/** Chuỗi giá trị đang hiển thị (phần nguyên + thập phân) */
const shown = (el) => el.shadowRoot.querySelector('[part="value"]').textContent;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  title: 'Components/HuiStatistic',
  component: 'hui-statistic',
  subcomponents: { HuiStatisticCountdown: 'hui-statistic-countdown' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Statistic** — hiển thị số liệu: tiêu đề + giá trị lớn có prefix/suffix, phân tách nghìn theo ngôn ngữ.

\`\`\`html
<hui-statistic title="Người dùng hoạt động" value="112893"></hui-statistic>
<hui-statistic title="Tăng trưởng" value="11.28" precision="2" suffix="%" type="success"></hui-statistic>
<hui-statistic-countdown title="Kết thúc sau" format="HH:mm:ss"></hui-statistic-countdown>
<script>document.querySelector('hui-statistic-countdown').value = Date.now() + 3600e3;</script>
\`\`\`

### Attributes — \`hui-statistic\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`title\` | string | — | Tiêu đề (hoặc slot) |
| \`value\` | string \\| number | — | Số hoặc chuỗi bất kỳ (chuỗi không phải số hiển thị nguyên văn) |
| \`precision\` | number | — | Số chữ số thập phân (làm tròn) |
| \`prefix\` / \`suffix\` | string | — | Tiền tố / hậu tố (hoặc slot) |
| \`group-separator\` | string | theo ngôn ngữ | Dấu nghìn — \`vi\` "." · \`en\` "," (\`Intl.NumberFormat\`); \`""\` để bỏ |
| \`decimal-separator\` | string | theo ngôn ngữ | Dấu thập phân — \`vi\` "," · \`en\` "." |
| \`type\` | string | — | Màu giá trị: \`primary\` / \`secondary\` / \`success\` / \`warning\` / \`danger\` / \`info\` |
| \`loading\` | boolean | \`false\` | Placeholder nhấp nháy (CSS thuần) |
| \`animated\` | string | (bật) | Đếm dần khi value đổi; \`animated="false"\` để tắt. Tự tắt khi \`prefers-reduced-motion\` |
| \`duration\` | number | \`800\` | Thời gian đếm dần (ms) |

### Attributes — \`hui-statistic-countdown\` (kế thừa mọi attribute trên)
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | number \\| string | — | Thời điểm đích: timestamp ms hoặc chuỗi ngày ISO |
| \`format\` | string | \`'HH:mm:ss'\` | Token \`Y M D H m s S\` (lặp = thêm số 0, \`SSS\` = mili giây), \`[chữ]\` giữ nguyên |

### Properties (chỉ JS)
| Property | Type | Mô tả |
|----------|------|-------|
| \`formatter\` | \`(value) => string \\| Node\` | Tự định dạng (statistic) |
| \`remaining\` | number (readonly) | ms còn lại (countdown) |

### Events (countdown)
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-finish\` | — | Về 0 (không phát nếu đích đã qua từ đầu) |
| \`hui-change\` | \`{ remaining }\` | Chuỗi hiển thị đổi |

### Slots
\`title\`, \`prefix\`, \`suffix\`

### Parts
\`base\`, \`title\`, \`content\`, \`prefix\`, \`value\`, \`value-int\`, \`value-decimal\`, \`suffix\`, \`skeleton\`

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-statistic-title-color\` | \`--hui-text-secondary\` | Màu tiêu đề |
| \`--hui-statistic-title-font-size\` | \`--hui-font-sm\` | Cỡ tiêu đề |
| \`--hui-statistic-value-color\` | theo \`type\` | Màu giá trị |
| \`--hui-statistic-value-font-size\` | \`--hui-font-2xl\` | Cỡ giá trị |
| \`--hui-statistic-decimal-font-size\` | bằng phần nguyên | Cỡ phần thập phân |
| \`--hui-statistic-value-font-family\` | kế thừa | Font giá trị |
| \`--hui-statistic-skeleton-width\` | \`6em\` | Rộng placeholder loading |

### Bàn phím
Không có tương tác. Trong lúc đếm dần, khung có \`aria-busy="true"\` để trình đọc màn hình chờ số cuối.
        `,
      },
    },
  },
  argTypes: {
    value: { control: 'text' },
    precision: { control: 'number' },
    type: { control: 'select', options: ['', 'primary', 'secondary', 'success', 'warning', 'danger', 'info'] },
    loading: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-statistic
      title=${args.title}
      value=${args.value}
      precision=${args.precision ?? ''}
      prefix=${args.prefix}
      suffix=${args.suffix}
      type=${args.type}
      ?loading=${args.loading}
    ></hui-statistic>
  `,
  args: { title: 'Người dùng hoạt động', value: '112893', precision: undefined, prefix: '', suffix: '', type: '', loading: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-statistic');
    // Mặc định locale vi → dấu nghìn "."
    if (getLocaleName() === 'vi') await expect(shown(el)).toBe('112.893');
  },
};

export const SeparatorAndPrecision = {
  render: () => html`
    <div style="display: flex; gap: 48px; flex-wrap: wrap;">
      <hui-statistic id="s1" title="Doanh thu (vi)" value="1234567.891" precision="2" suffix="₫"></hui-statistic>
      <hui-statistic id="s2" title="Dấu tùy chỉnh" value="9876543.5" precision="1" group-separator=" " decimal-separator="."></hui-statistic>
      <hui-statistic id="s3" title="Không phải số" value="N/A"></hui-statistic>
      <hui-statistic id="s4" title="Âm" value="-1500.456" precision="0"></hui-statistic>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const prev = getLocaleName();
    try {
      setLocale('vi');
      await wait(0);
      const s1 = canvasElement.querySelector('#s1');
      await expect(shown(s1)).toBe('1.234.567,89');
      await expect(s1.shadowRoot.querySelector('[part="value-decimal"]').textContent).toBe(',89');

      // Đổi ngôn ngữ → dấu phân tách đổi theo Intl.NumberFormat
      setLocale('en');
      await wait(0);
      await expect(shown(s1)).toBe('1,234,567.89');

      await expect(shown(canvasElement.querySelector('#s2'))).toBe('9 876 543.5');
      await expect(shown(canvasElement.querySelector('#s3'))).toBe('N/A');
      await expect(shown(canvasElement.querySelector('#s4'))).toBe('-1,500');

      // precision làm tròn + bù 0
      s1.precision = 4;
      s1.value = 2.5;
      await s1.updateComplete;
      await wait(1000); // chờ đếm dần xong
      await expect(shown(s1)).toBe('2.5000');
    } finally {
      setLocale(prev);
    }
  },
};

export const Types = {
  render: () => html`
    <div style="display: flex; gap: 48px; flex-wrap: wrap;">
      ${['primary', 'success', 'warning', 'danger', 'info'].map((t) => html`
        <hui-statistic title=${t} type=${t} value="93.12" precision="2" suffix="%"></hui-statistic>
      `)}
    </div>
  `,
};

export const PrefixSuffixSlots = {
  render: () => html`
    <div style="display: flex; gap: 48px;">
      <hui-statistic title="Lượt thích" value="1128">
        <span slot="prefix" aria-hidden="true">♥</span>
      </hui-statistic>
      <hui-statistic title="Đánh giá" value="93">
        <span slot="suffix" style="font-size: 0.6em; color: var(--hui-text-secondary);">/ 100</span>
      </hui-statistic>
    </div>
  `,
};

export const Loading = {
  render: () => html`<hui-statistic title="Đang tải" value="1000" loading></hui-statistic>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-statistic');
    await expect(el.shadowRoot.querySelector('[part="skeleton"]').hidden).toBe(false);
    await expect(el.shadowRoot.querySelector('[part="value"]').hidden).toBe(true);
    await expect(el.shadowRoot.querySelector('[part="base"]').getAttribute('aria-busy')).toBe('true');
  },
};

export const CountUp = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: end;">
      <hui-statistic id="counter" title="Bấm để đổi giá trị" value="1000" duration="300"></hui-statistic>
      <hui-button size="sm" @click=${(e) => {
        const el = e.target.closest('div').querySelector('#counter');
        el.value = Math.round(Math.random() * 100000);
      }}>Ngẫu nhiên</hui-button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#counter');
    el.groupSeparator = ',';
    el.value = 5000;
    await el.updateComplete;
    await wait(500);
    await expect(shown(el)).toBe('5,000');
  },
};

export const Countdown = {
  render: () => html`
    <div style="display: flex; gap: 48px; flex-wrap: wrap;">
      <hui-statistic-countdown id="cd1" title="Còn lại (HH:mm:ss)"></hui-statistic-countdown>
      <hui-statistic-countdown id="cd2" title="Ngày + mili giây" format="D [ngày] HH:mm:ss:SSS" type="danger"></hui-statistic-countdown>
      <hui-statistic-countdown id="cd3" title="Đếm 2 giây" format="ss:SS"></hui-statistic-countdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    canvasElement.querySelector('#cd1').value = Date.now() + 1000 * 60 * 60 * 2 + 30000;
    canvasElement.querySelector('#cd2').value = Date.now() + 1000 * 60 * 60 * 24 * 2 + 5000;

    // Hàm định dạng
    await expect(formatCountdown(2 * 86400e3 + 3723004, 'D [ngày] HH:mm:ss:SSS')).toBe('2 ngày 01:02:03:004');
    await expect(formatCountdown(2 * 86400e3, 'HH:mm')).toBe('48:00');
    await expect(formatCountdown(1500, 's.S')).toBe('1.5');

    // Đích ngắn → phát hui-finish và hiển thị 0
    const cd3 = canvasElement.querySelector('#cd3');
    const finished = new Promise((resolve) => cd3.addEventListener('hui-finish', resolve, { once: true }));
    cd3.value = Date.now() + 300;
    const result = await Promise.race([finished.then(() => 'finish'), wait(3000).then(() => 'timeout')]);
    await expect(result).toBe('finish');
    await expect(shown(cd3)).toBe('00:00');
    await expect(cd3.remaining).toBe(0);
  },
};

export const InCards = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(3, 220px); gap: 16px;">
      <hui-card variant="outlined"><hui-statistic title="Đơn hàng" value="1284"></hui-statistic></hui-card>
      <hui-card variant="outlined"><hui-statistic title="Tăng trưởng" value="11.28" precision="2" suffix="%" type="success"></hui-statistic></hui-card>
      <hui-card variant="outlined"><hui-statistic title="Hoàn tiền" value="9.3" precision="2" suffix="%" type="danger"></hui-statistic></hui-card>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-stats {
        --hui-statistic-title-color: var(--hui-primary-7);
        --hui-statistic-value-color: var(--hui-primary);
        --hui-statistic-value-font-size: 2.25rem;
        --hui-statistic-decimal-font-size: 1rem;
      }
      .brand-stats hui-statistic::part(title) { text-transform: uppercase; letter-spacing: 0.06em; }
    </style>
    <div class="brand-stats" style="display: flex; gap: 48px;">
      <hui-statistic title="Biến CSS" value="2048.75" precision="2"></hui-statistic>
      <hui-statistic title="::part(title)" value="512"></hui-statistic>
    </div>
  `,
};
