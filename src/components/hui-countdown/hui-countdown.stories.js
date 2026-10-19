/**
 * Storybook Stories — HUI Countdown
 */

import { html, nothing } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { splitDuration } from './hui-countdown.js';
import './index.js';

const DAY = 86_400_000;
const future = (ms) => new Date(Date.now() + ms).toISOString();
const values = (el) => [...el.shadowRoot.querySelectorAll('[part="value"]')].map((v) => (v.querySelector('.cd__half--top') || v).textContent);
const labels = (el) => [...el.shadowRoot.querySelectorAll('[part="label"]')].map((v) => v.textContent);

export default {
  title: 'Molecules/HuiCountdown',
  component: 'hui-countdown',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Countdown** — Đếm ngược sự kiện / flash sale: các ô **ngày / giờ / phút / giây**, kiểu ô số, **đồng hồ lật** (flip)
hoặc một dòng chữ. Nhãn theo ngôn ngữ hiện tại. Tính thời gian theo cùng ý tưởng \`hui-statistic-countdown\`.

\`\`\`html
<hui-countdown target="2026-12-31T23:59:59+07:00"></hui-countdown>
<hui-countdown target="1767200399000" variant="flip"></hui-countdown>
<hui-countdown target="…" variant="inline" format="hms"></hui-countdown>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`target\` | string | — | Thời điểm đích: ISO hoặc timestamp ms |
| \`variant\` | string | \`blocks\` | \`blocks\` (ô số) \\| \`flip\` (đồng hồ lật) \\| \`inline\` (một dòng) |
| \`format\` | string | \`dhms\` | Đơn vị hiển thị (d h m s); vd \`hms\` ẩn ngày — đơn vị lớn nhất gộp phần dư (2 ngày → 48 giờ) |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` |
| \`hide-labels\` | boolean | \`false\` | Ẩn nhãn đơn vị |
| \`separator\` | string | \`:\` | Dấu giữa các ô (blocks / flip); \`""\` = không có |
| \`label\` | string | "Đếm ngược" | Tên cho trình đọc màn hình |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng lật |

### Properties
| Tên | Mô tả |
|-----|-------|
| \`remaining\` | (chỉ đọc) số ms còn lại |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-tick\` | \`{ remaining, days, hours, minutes, seconds }\` | Mỗi giây |
| \`hui-finish\` | — | Về 0 (chỉ khi đích ở tương lai lúc bắt đầu) |

### Slots
| Slot | Mô tả |
|------|-------|
| \`finished\` | Nội dung thay các ô số khi hết giờ |

### Parts
\`base\` (role="timer"), \`unit\` (+ \`unit-days\` \\| \`unit-hours\` \\| \`unit-minutes\` \\| \`unit-seconds\`), \`value\`, \`label\`, \`separator\`, \`finished\`.
Custom state: \`hui-countdown:state(finished)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-countdown-gap\` | Khoảng cách giữa các ô |
| \`--hui-countdown-font-size\` / \`--hui-countdown-font-weight\` / \`--hui-countdown-color\` | Chữ số |
| \`--hui-countdown-bg\` / \`--hui-countdown-radius\` / \`--hui-countdown-min-width\` / \`--hui-countdown-shadow\` | Ô số |
| \`--hui-countdown-label-color\` / \`--hui-countdown-label-size\` | Nhãn |
| \`--hui-countdown-separator-color\` | Dấu phân cách |
| \`--hui-countdown-flip-duration\` | Thời lượng lật (mặc định 600ms) |

### Accessibility
\`role="timer"\` (aria-live mặc định tắt — không đọc mỗi giây). Phần hiển thị \`aria-hidden\`, một bản chữ ẩn
"2 ngày 5 giờ 3 phút 9 giây" cho trình đọc màn hình. Hiệu ứng lật tắt khi \`prefers-reduced-motion\` / \`no-animation\`.
Không nhận focus.
        `,
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['blocks', 'flip', 'inline'] },
    format: { control: 'select', options: ['dhms', 'hms', 'ms', 'dhm'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    hideLabels: { control: 'boolean' },
    separator: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-countdown
      target=${future(2 * DAY + 5 * 3600_000 + 3 * 60_000 + 9_500)}
      variant=${args.variant}
      format=${args.format}
      size=${args.size}
      separator=${args.separator ?? nothing}
      ?hide-labels=${args.hideLabels}
    ></hui-countdown>
  `,
  args: { variant: 'blocks', format: 'dhms', size: 'md', hideLabels: false, separator: ':' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-countdown');
    const v = values(el);
    await expect(v.slice(0, 3)).toEqual(['02', '05', '03']);
    await expect(labels(el)).toEqual(['Ngày', 'Giờ', 'Phút', 'Giây']);
    await expect(el.shadowRoot.querySelector('[part="base"]').getAttribute('role')).toBe('timer');
    await expect(el.shadowRoot.querySelectorAll('[part="separator"]').length).toBe(3);
    await expect(el.shadowRoot.querySelector('.cd__sr').textContent).toMatch(/^2 ngày 5 giờ 3 phút \d+ giây$/);
    // Giây chạy
    const first = values(el)[3];
    await waitFor(() => expect(values(el)[3]).not.toBe(first), { timeout: 2500 });
  },
};

export const Variants = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <hui-countdown id="v-blocks" target=${future(12 * DAY + 3600_000 * 7)}></hui-countdown>
      <hui-countdown id="v-flip" variant="flip" target=${future(3 * DAY + 3600_000 * 2 + 4_500)}></hui-countdown>
      <p style="margin: 0;">Flash sale kết thúc sau <hui-countdown id="v-inline" variant="inline" format="hms" target=${future(DAY + 3600_000 * 3 + 30_000)}></hui-countdown></p>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const flip = canvasElement.querySelector('#v-flip');
    await expect(flip.shadowRoot.querySelectorAll('.cd__card').length).toBe(4);
    // Lật: lá trên/dưới hiện ra trong lúc giây đổi
    await waitFor(() => expect(flip.shadowRoot.querySelector('[part~="unit-seconds"] .cd__leaf--top').hidden).toBe(false), { timeout: 2500 });
    const inline = canvasElement.querySelector('#v-inline');
    // format="hms": 1 ngày 3 giờ → 27 giờ
    await expect(values(inline)[0]).toBe('27');
    await expect(inline.shadowRoot.querySelectorAll('[part="separator"]').length).toBe(0);
  },
};

export const Sizes = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${['sm', 'md', 'lg'].map((s) => html`<hui-countdown size=${s} target=${future(5 * DAY + 4_000)}></hui-countdown>`)}
      ${['sm', 'md', 'lg'].map((s) => html`<hui-countdown variant="flip" size=${s} format="hms" target=${future(3600_000 * 5)}></hui-countdown>`)}
    </div>
  `,
};

/** Hết giờ — phát hui-finish, :state(finished), slot "finished" thay các ô số */
export const Finished = {
  render: () => html`
    <style>
      hui-countdown:state(finished)::part(value) { opacity: 0.5; }
    </style>
    <div style="display: grid; gap: 16px;">
      <hui-countdown id="fin" format="ms" target=${future(1_200)}>
        <strong slot="finished" style="color: var(--hui-success-8);">Sự kiện đã bắt đầu!</strong>
      </hui-countdown>
      <hui-countdown id="past" target="2020-01-01T00:00:00Z" hide-labels></hui-countdown>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fin');
    let finished = 0;
    let ticks = 0;
    el.addEventListener('hui-finish', () => { finished++; });
    el.addEventListener('hui-tick', (e) => { ticks++; expect(typeof e.detail.remaining).toBe('number'); });
    await waitFor(() => expect(finished).toBe(1), { timeout: 4000 });
    await expect(ticks).toBeGreaterThan(0);
    await expect(el.shadowRoot.querySelector('.cd__units').hidden).toBe(true);
    await expect(el.shadowRoot.querySelector('[part="finished"]').hidden).toBe(false);
    // Đích đã qua từ đầu → hiện 00, không phát finish
    const past = canvasElement.querySelector('#past');
    await expect(values(past)).toEqual(['00', '00', '00', '00']);
    await expect(past.remaining).toBe(0);
    await expect(past.shadowRoot.querySelector('[part="label"]').hidden).toBe(true);
    // Hàm tách thời gian: đơn vị lớn nhất gộp phần dư
    await expect(splitDuration(2 * DAY + 61_000, ['h', 'm', 's'])).toEqual({ h: 48, m: 1, s: 1 });
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cd-sale {
        --hui-countdown-bg: var(--hui-danger);
        --hui-countdown-color: var(--hui-text-light-solid);
        --hui-countdown-radius: 4px;
        --hui-countdown-label-color: var(--hui-danger-7);
        --hui-countdown-separator-color: var(--hui-danger);
      }
      hui-countdown.cd-pill::part(value) { border-radius: 999px; padding-inline: 0.6em; }
      hui-countdown.cd-pill::part(unit-days) { display: none; }
      .cd-flip-brand { --hui-countdown-bg: var(--hui-primary); --hui-countdown-flip-duration: 400ms; }
    </style>
    <div style="display: grid; gap: 20px;">
      <hui-countdown class="cd-sale" target=${future(DAY / 2)} format="hms"></hui-countdown>
      <hui-countdown class="cd-pill" target=${future(4 * DAY)} separator=""></hui-countdown>
      <hui-countdown class="cd-flip-brand" variant="flip" target=${future(9 * DAY)}></hui-countdown>
    </div>
  `,
};
