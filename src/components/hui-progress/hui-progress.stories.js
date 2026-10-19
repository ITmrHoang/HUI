/**
 * Storybook Stories — HUI Progress
 * Thanh tiến độ: line / circle / dashboard, steps, gradient, success-percent.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

export default {
  title: 'Components/HuiProgress',
  component: 'hui-progress',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Progress** — Hiển thị tiến độ thao tác (Ant Progress + MUI LinearProgress / CircularProgress).

### Cách sử dụng
\`\`\`html
<hui-progress percent="30"></hui-progress>
<hui-progress percent="70" status="active" stroke-color="#108ee9,#87d068"></hui-progress>
<hui-progress type="circle" percent="75" size="lg"></hui-progress>
<hui-progress percent="60" steps="5"></hui-progress>
\`\`\`
\`\`\`js
progress.format = (percent) => \`\${percent} ngày\`;
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`type\` | string | \`'line'\` | \`line\` \\| \`circle\` \\| \`dashboard\` |
| \`percent\` | number | \`0\` | Phần trăm 0–100 |
| \`success-percent\` | number | — | Phần "thành công" vẽ đè màu success |
| \`status\` | string | \`'normal'\` | \`normal\` \\| \`active\` (vệt sáng chạy, line) \\| \`success\` \\| \`exception\`. \`percent\` = 100 tự thành \`success\` |
| \`steps\` | number | — | Chia thanh line thành N ô |
| \`stroke-color\` | string | — | Màu tiến độ; gradient: \`"from,to"\` |
| \`trail-color\` | string | — | Màu rãnh nền |
| \`stroke-width\` | number | — | Độ dày: px (line/steps) hoặc đơn vị viewBox 100 (circle, mặc định 6) |
| \`stroke-linecap\` | string | \`'round'\` | \`round\` \\| \`butt\` \\| \`square\` |
| \`size\` | string | \`'md'\` | \`sm\` \\| \`md\` \\| \`lg\` hoặc số px (đường kính circle / độ dày line) |
| \`show-info\` | string | \`'true'\` | \`'false'\` = ẩn chữ / icon |
| \`gap-degree\` | number | \`75\` | Góc hở đáy của dashboard |
| \`label\` | string | locale \`progress.label\` | Nhãn cho trình đọc màn hình |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`format\` | \`(percent, successPercent) => string \\| Node\` | Định dạng chữ hiển thị (chỉ gán bằng JS) |

### Trợ năng
Part \`base\` có \`role="progressbar"\`, \`aria-valuemin="0"\`, \`aria-valuemax="100"\`, \`aria-valuenow\`, \`aria-valuetext\` (chữ hiển thị) và \`aria-label\`.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-progress-color\` | Màu tiến độ (\`stroke-color\` ưu tiên hơn) |
| \`--hui-progress-success-color\` | Màu success |
| \`--hui-progress-trail-color\` | Màu rãnh (\`trail-color\` ưu tiên hơn) |
| \`--hui-progress-radius\` | Bo góc thanh |
| \`--hui-progress-step-width\` / \`--hui-progress-step-gap\` | Kích thước ô (steps) |
| \`--hui-progress-info-color\` / \`--hui-progress-font-size\` | Chữ phần trăm |

**Parts:** \`base\`, \`track\`, \`bar\`, \`success-bar\`, \`steps\`, \`step\` (+ \`step-active\`), \`circle\`, \`svg\`, \`trail\`, \`path\`, \`success-path\`, \`info\`.
        `,
      },
    },
  },
  argTypes: {
    type: { control: 'select', options: ['line', 'circle', 'dashboard'] },
    percent: { control: { type: 'range', min: 0, max: 100 } },
    status: { control: 'select', options: ['normal', 'active', 'success', 'exception'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    steps: { control: 'number' },
    strokeColor: { control: 'text' },
  },
};

/** Mặc định — điều khiển bằng Controls */
export const Default = {
  args: { type: 'line', percent: 30, status: 'normal', size: 'md', steps: 0, strokeColor: '' },
  render: (args) => html`
    <div style="width: 360px;">
      <hui-progress
        type=${args.type}
        percent=${args.percent}
        status=${args.status}
        size=${args.size}
        steps=${args.steps || ''}
        stroke-color=${args.strokeColor || ''}
      ></hui-progress>
    </div>
  `,
  // Kiểm thử: ARIA progressbar + aria-valuenow đổi theo percent; 100% tự thành success
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-progress');
    const base = el.shadowRoot.querySelector('[part="base"]');
    await expect(base.getAttribute('role')).toBe('progressbar');
    await expect(base.getAttribute('aria-valuenow')).toBe('30');
    await expect(base.getAttribute('aria-valuetext')).toBe('30%');
    await expect(el.shadowRoot.querySelector('[part="bar"]').style.width).toBe('30%');

    el.percent = 75;
    await waitFor(() => expect(base.getAttribute('aria-valuenow')).toBe('75'));
    el.setAttribute('percent', '120');
    await waitFor(() => expect(base.getAttribute('aria-valuenow')).toBe('100'));
    await expect(base.classList.contains('progress--success')).toBe(true);

    el.format = (p) => `${p} ngày`;
    el.percent = 30;
    await waitFor(() => expect(el.shadowRoot.querySelector('[part="info"]').textContent).toBe('30 ngày'));
    el.format = null;
  },
};

/** Thanh ngang — các trạng thái */
export const Line = {
  render: () => html`
    <div style="width: 360px; display: grid; gap: 12px;">
      <hui-progress percent="30"></hui-progress>
      <hui-progress percent="50" status="active"></hui-progress>
      <hui-progress percent="70" status="exception"></hui-progress>
      <hui-progress percent="100"></hui-progress>
      <hui-progress percent="50" show-info="false"></hui-progress>
    </div>
  `,
};

/** Vòng tròn & dashboard */
export const Circle = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
      <hui-progress type="circle" percent="75"></hui-progress>
      <hui-progress type="circle" percent="70" status="exception"></hui-progress>
      <hui-progress type="circle" percent="100"></hui-progress>
      <hui-progress type="dashboard" percent="75"></hui-progress>
      <hui-progress type="dashboard" percent="60" gap-degree="120" stroke-linecap="butt"></hui-progress>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-progress');
    const path = el.shadowRoot.querySelector('[part="path"]');
    await expect(path.getAttribute('stroke-dasharray')).toBe('75 100');
    const dash = canvasElement.querySelectorAll('hui-progress')[3];
    // Dashboard 75° hở → cung nhìn thấy = 100 * (1 - 75/360)
    const trail = dash.shadowRoot.querySelector('[part="trail"]');
    await expect(Number.parseFloat(trail.getAttribute('stroke-dasharray'))).toBeCloseTo(79.17, 1);
  },
};

/** Kích thước sm / md / lg và số px */
export const Sizes = {
  render: () => html`
    <div style="display: grid; gap: 16px; width: 360px;">
      <hui-progress percent="40" size="sm"></hui-progress>
      <hui-progress percent="40"></hui-progress>
      <hui-progress percent="40" size="lg"></hui-progress>
      <div style="display: flex; gap: 16px; align-items: center;">
        <hui-progress type="circle" percent="40" size="sm"></hui-progress>
        <hui-progress type="circle" percent="40"></hui-progress>
        <hui-progress type="circle" percent="40" size="lg"></hui-progress>
        <hui-progress type="circle" percent="40" size="48" show-info="false" stroke-width="12"></hui-progress>
      </div>
    </div>
  `,
};

/** Steps — thanh chia ô */
export const Steps = {
  render: () => html`
    <div style="display: grid; gap: 12px;">
      <hui-progress percent="50" steps="3"></hui-progress>
      <hui-progress percent="30" steps="5"></hui-progress>
      <hui-progress percent="100" steps="5" size="sm"></hui-progress>
      <hui-progress percent="60" steps="10" stroke-color="#3b82f6,#10b981"></hui-progress>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelectorAll('hui-progress')[1];
    const steps = el.shadowRoot.querySelectorAll('[part~="step"]');
    await expect(steps.length).toBe(5);
    await expect(el.shadowRoot.querySelectorAll('[part~="step-active"]').length).toBe(2);
  },
};

/** Gradient, success-percent, màu tùy biến */
export const ColorsAndSuccess = {
  render: () => html`
    <div style="display: grid; gap: 12px; width: 360px;">
      <hui-progress percent="90" stroke-color="#108ee9,#87d068"></hui-progress>
      <hui-progress percent="60" success-percent="30"></hui-progress>
      <hui-progress percent="45" stroke-color="#ec4899" trail-color="#fce7f3"></hui-progress>
      <div style="display: flex; gap: 16px;">
        <hui-progress type="circle" percent="90" stroke-color="#108ee9,#87d068"></hui-progress>
        <hui-progress type="dashboard" percent="60" success-percent="30"></hui-progress>
      </div>
    </div>
  `,
};

/** Tăng / giảm động */
export const Dynamic = {
  render: () => {
    const change = (d) => {
      document.querySelectorAll('.dyn-progress').forEach((el) => { el.percent = Math.min(100, Math.max(0, el.percent + d)); });
    };
    return html`
      <div style="display: grid; gap: 12px; width: 360px;">
        <hui-progress class="dyn-progress" percent="0"></hui-progress>
        <hui-progress class="dyn-progress" type="circle" percent="0"></hui-progress>
        <div style="display: flex; gap: 8px;">
          <hui-button size="sm" variant="outline" @hui-click=${() => change(-10)}>−10</hui-button>
          <hui-button size="sm" @hui-click=${() => change(10)}>+10</hui-button>
        </div>
      </div>
    `;
  },
};

/** Override từ bên ngoài — biến CSS trên thẻ cha + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .progress-brand {
        --hui-progress-color: var(--hui-warning);
        --hui-progress-trail-color: var(--hui-warning-1);
        --hui-progress-radius: 2px;
        --hui-progress-info-color: var(--hui-warning-7);
      }
      .progress-brand hui-progress::part(info) { font-weight: var(--hui-font-weight-bold); }
      .progress-brand hui-progress::part(track) { box-shadow: inset 0 0 0 1px var(--hui-warning-3); }
    </style>
    <div class="progress-brand" style="display: grid; gap: 12px; width: 360px;">
      <hui-progress percent="65" stroke-width="12"></hui-progress>
      <hui-progress type="circle" percent="65"></hui-progress>
    </div>
  `,
};
