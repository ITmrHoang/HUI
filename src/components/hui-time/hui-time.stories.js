/**
 * Storybook Stories — HUI Time
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { setLocale } from '../../core/locale.js';
import { refreshInterval } from './hui-time.js';
import './index.js';

const timeEl = (el) => el.shadowRoot.querySelector('time');
const ago = (ms) => new Date(Date.now() - ms).toISOString();

export default {
  title: 'Atoms/HuiTime',
  component: 'hui-time',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Time** — Hiển thị thời điểm: **tương đối** ("3 phút trước", tự cập nhật) hoặc **tuyệt đối** (ngày / ngày giờ / giờ)
theo ngôn ngữ hiện tại. Dựng thẻ \`<time datetime="ISO">\` chuẩn ngữ nghĩa, tooltip (title) là ngày giờ đầy đủ.

\`\`\`html
<hui-time datetime="2026-10-20T08:00:00Z"></hui-time>             <!-- "3 phút trước" -->
<hui-time datetime="2026-10-20T08:00:00Z" format="date:long"></hui-time>
<hui-time datetime="1760947200000" format="datetime"></hui-time>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`datetime\` | string | — | ISO, timestamp ms hoặc chuỗi ngày |
| \`format\` | string | \`relative\` | \`relative\` \\| \`date\` \\| \`date:short\` \\| \`date:long\` \\| \`date:full\` \\| \`datetime\` \\| \`time\` |
| \`no-tooltip\` | boolean | \`false\` | Không gắn title ngày giờ đầy đủ |
| \`no-refresh\` | boolean | \`false\` | Không tự cập nhật chuỗi tương đối |

### Tự cập nhật (format="relative")
| Khoảng cách tới hiện tại | Chu kỳ làm mới |
|---------------------------|----------------|
| < 1 phút | 10 giây |
| < 1 giờ | mỗi phút |
| còn lại | mỗi giờ |
Tab quay lại hiển thị (\`visibilitychange\`) → làm mới ngay. Đổi ngôn ngữ (\`setLocale\`) → vẽ lại.

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`date\` | (chỉ đọc) \`Date\` đã chuẩn hóa hoặc \`null\` |
| \`refresh()\` | Vẽ lại chuỗi ngay |

### Events · Slots
Không có. (Nội dung light DOM chỉ là chữ dự phòng khi JS chưa chạy.)

### Parts
\`base\` — thẻ \`<time>\`.

### CSS Variables
\`--hui-time-color\`, \`--hui-time-font-size\`, \`--hui-time-decoration\` (khi có tooltip, vd \`underline dotted\`).

### Accessibility
Thẻ \`<time datetime>\` giúp máy (SEO, trình đọc) hiểu đúng thời điểm. Không nhận focus.
        `,
      },
    },
  },
  argTypes: {
    format: { control: 'select', options: ['relative', 'date', 'date:short', 'date:long', 'date:full', 'datetime', 'time'] },
    noTooltip: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`<hui-time datetime=${ago(3 * 60_000)} format=${args.format} ?no-tooltip=${args.noTooltip}></hui-time>`,
  args: { format: 'relative', noTooltip: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-time');
    await expect(timeEl(el).textContent).toBe('3 phút trước');
    await expect(timeEl(el).getAttribute('datetime')).toBe(el.date.toISOString());
    await expect(timeEl(el).title.length).toBeGreaterThan(10);
  },
};

/** Tương đối — quá khứ & tương lai */
export const Relative = {
  render: () => html`
    <ul style="display: grid; gap: 6px; margin: 0;">
      <li><hui-time id="r-now" datetime=${ago(5_000)}></hui-time></li>
      <li><hui-time id="r-min" datetime=${ago(3 * 60_000)}></hui-time></li>
      <li><hui-time id="r-hour" datetime=${ago(2 * 3600_000)}></hui-time></li>
      <li><hui-time id="r-day" datetime=${ago(3 * 86400_000)}></hui-time></li>
      <li><hui-time id="r-future" datetime=${new Date(Date.now() + 3 * 86400_000 + 60_000).toISOString()}></hui-time></li>
    </ul>
  `,
  play: async ({ canvasElement }) => {
    const text = (id) => timeEl(canvasElement.querySelector(`#${id}`)).textContent;
    await expect(text('r-now')).toBe('bây giờ');
    await expect(text('r-hour')).toBe('2 giờ trước');
    await expect(text('r-day')).toBe('3 ngày trước');
    await expect(text('r-future')).toBe('sau 3 ngày nữa');
    // Chu kỳ làm mới thích nghi theo độ xa
    await expect(refreshInterval(30_000)).toBe(10_000);
    await expect(refreshInterval(-20 * 60_000)).toBe(60_000);
    await expect(refreshInterval(5 * 3600_000)).toBe(3_600_000);
  },
};

/** Tuyệt đối — date / datetime / time */
export const Absolute = {
  render: () => html`
    <div style="display: grid; grid-template-columns: max-content max-content; gap: 6px 24px;">
      <code>date</code><hui-time id="a-date" datetime="2026-10-20T08:30:00" format="date"></hui-time>
      <code>date:short</code><hui-time datetime="2026-10-20T08:30:00" format="date:short"></hui-time>
      <code>date:long</code><hui-time id="a-long" datetime="2026-10-20T08:30:00" format="date:long"></hui-time>
      <code>date:full</code><hui-time datetime="2026-10-20T08:30:00" format="date:full"></hui-time>
      <code>datetime</code><hui-time datetime="2026-10-20T08:30:00" format="datetime"></hui-time>
      <code>time</code><hui-time id="a-time" datetime="2026-10-20T08:30:00" format="time"></hui-time>
      <code>timestamp</code><hui-time id="a-ts" datetime="1760947200000" format="date"></hui-time>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const text = (id) => timeEl(canvasElement.querySelector(`#${id}`)).textContent;
    await expect(text('a-long')).toContain('2026');
    await expect(text('a-long')).toContain('tháng 10');
    await expect(text('a-time')).toBe('08:30');
    await expect(timeEl(canvasElement.querySelector('#a-ts')).getAttribute('datetime')).toBe(new Date(1760947200000).toISOString());
  },
};

/** Đổi ngôn ngữ → tự vẽ lại; không hợp lệ → hiện chuỗi gốc, không có datetime */
export const LocaleAndInvalid = {
  render: () => html`
    <p><hui-time id="l-time" datetime=${ago(3 * 60_000)}></hui-time></p>
    <p><hui-time id="l-bad" datetime="không phải ngày"></hui-time></p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#l-time');
    try {
      setLocale('en');
      await waitFor(() => expect(timeEl(el).textContent).toBe('3 minutes ago'));
    } finally {
      setLocale('vi');
    }
    await waitFor(() => expect(timeEl(el).textContent).toBe('3 phút trước'));
    const bad = canvasElement.querySelector('#l-bad');
    await expect(timeEl(bad).textContent).toBe('không phải ngày');
    await expect(timeEl(bad).hasAttribute('datetime')).toBe(false);
    await expect(bad.date).toBe(null);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .time-meta { --hui-time-color: var(--hui-text-secondary); --hui-time-font-size: var(--hui-font-sm); --hui-time-decoration: underline dotted; }
      hui-time.time-badge::part(base) { padding: 2px 8px; border-radius: 999px; background: var(--hui-primary-light); color: var(--hui-primary-7); }
    </style>
    <p class="time-meta">Đăng <hui-time datetime=${ago(42 * 60_000)}></hui-time> · Cập nhật <hui-time datetime=${ago(70_000)}></hui-time></p>
    <hui-time class="time-badge" datetime="2026-12-24T19:00:00" format="datetime"></hui-time>
  `,
};
