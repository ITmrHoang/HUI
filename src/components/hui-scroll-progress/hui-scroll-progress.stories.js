/**
 * Storybook Stories — HUI Scroll Progress
 * Thanh tiến độ đọc trang: cố định ở mép trên / dưới cửa sổ, hoặc nằm trong luồng trang theo một vùng cuộn.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const base = (el) => el.shadowRoot.querySelector('[part="base"]');
const bar = (el) => el.shadowRoot.querySelector('[part="bar"]');

const paragraphs = (n) => Array.from({ length: n }, (_, i) => html`
  <p style="margin: 0 0 16px; line-height: 1.7; color: var(--hui-text-secondary);">
    <b style="color: var(--hui-text);">Đoạn ${i + 1}.</b> Thanh tiến độ đọc cho biết người đọc đã đi được bao nhiêu phần của bài viết.
    Nó theo dõi cuộn của cả trang hoặc của một vùng cuộn riêng, gom cập nhật về một lần mỗi khung hình nên rất nhẹ.
  </p>
`);

export default {
  title: 'Atoms/HuiScrollProgress',
  component: 'hui-scroll-progress',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Scroll Progress** — Thanh tiến độ đọc trang (reading progress). Mặc định cố định ở **mép trên cửa sổ** và theo cuộn của cả trang;
\`target\` = CSS selector để theo một vùng cuộn riêng; \`fixed="false"\` để thanh nằm trong luồng trang.
Cập nhật gom về 1 lần mỗi frame (\`onScroll\` của \`utils/scroll.js\`).

\`\`\`html
<!-- Cả trang -->
<hui-scroll-progress></hui-scroll-progress>
<hui-scroll-progress position="bottom" height="4" color="var(--hui-success)"></hui-scroll-progress>

<!-- Một khung cuộn riêng, thanh nằm ngay trên khung -->
<hui-scroll-progress target="#article" fixed="false"></hui-scroll-progress>
<div id="article" style="height: 400px; overflow: auto">…</div>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`target\` | string | — | CSS selector vùng cuộn; trống = window. Property nhận cả Element |
| \`position\` | \`top \\| bottom\` | \`top\` | Mép cửa sổ (khi fixed) |
| \`height\` | string | \`3\` | Độ dày: số (px) hoặc độ dài CSS |
| \`color\` | string | — | Màu CSS (ưu tiên hơn biến CSS) |
| \`fixed\` | string | \`'true'\` | \`'false'\` = nằm trong luồng trang |
| \`label\` | string | _locale_ | Nhãn cho trình đọc màn hình |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng chạy của thanh |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`value\` | number | Tiến độ hiện tại 0–100 (chỉ đọc) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-progress\` | \`{ percent }\` | Phần trăm (làm tròn) thay đổi |

### ARIA
\`role="progressbar"\`, \`aria-valuenow\` 0–100, \`aria-label\` theo locale \`scrollProgress.label\` ("Tiến độ đọc trang").
Không nhận focus (chỉ là chỉ báo) → không có phím tắt.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-scroll-progress-color\` | Màu thanh (mặc định \`--hui-primary\`) |
| \`--hui-scroll-progress-track-color\` | Màu rãnh (fixed: trong suốt; inline: \`--hui-fill-secondary\`) |
| \`--hui-scroll-progress-height\` | Độ dày (3px) |
| \`--hui-scroll-progress-z-index\` | Lớp xếp chồng khi fixed (\`--hui-z-sticky\`) |
| \`--hui-scroll-progress-radius\` | Bo góc đầu thanh |

**Parts:** \`base\`, \`bar\`. **State:** \`:state(fixed)\`.
        `,
      },
    },
  },
  argTypes: {
    position: { control: 'inline-radio', options: ['top', 'bottom'] },
    color: { control: 'color' },
    height: { control: 'text' },
    noAnimation: { control: 'boolean' },
  },
};

/** Theo một vùng cuộn riêng (target) — thanh nằm trong luồng trang ngay trên khung */
export const ContainerTarget = {
  render: () => html`
    <div style="max-width: 560px; border: 1px solid var(--hui-border); border-radius: 12px; overflow: hidden;">
      <hui-scroll-progress id="sp-target" target="#sp-article" fixed="false" height="4"></hui-scroll-progress>
      <div id="sp-article" style="height: 240px; overflow: auto; padding: 16px;">${paragraphs(10)}</div>
    </div>
  `,
  // Kiểm thử: cuộn khung → aria-valuenow + width cập nhật, sự kiện hui-progress
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-target');
    const box = canvasElement.querySelector('#sp-article');
    const events = [];
    el.addEventListener('hui-progress', (e) => events.push(e.detail.percent));

    await expect(base(el).getAttribute('role')).toBe('progressbar');
    await expect(base(el).getAttribute('aria-label')).toBe('Tiến độ đọc trang');
    await expect(base(el).getAttribute('aria-valuemin')).toBe('0');
    await expect(base(el).getAttribute('aria-valuemax')).toBe('100');
    await expect(base(el).classList.contains('track--inline')).toBe(true);
    await expect(base(el).style.getPropertyValue('--_sp-height')).toBe('4px');
    await waitFor(() => expect(base(el).getAttribute('aria-valuenow')).toBe('0'));

    const max = box.scrollHeight - box.clientHeight;
    box.scrollTop = max / 2;
    await waitFor(() => expect(Number(base(el).getAttribute('aria-valuenow'))).toBeCloseTo(50, -1));
    await expect(Math.abs(el.value - 50)).toBeLessThan(2);

    box.scrollTop = max;
    await waitFor(() => expect(base(el).getAttribute('aria-valuenow')).toBe('100'));
    await expect(bar(el).style.width).toBe('100%');
    await expect(events.at(-1)).toBe(100);

    box.scrollTop = 0;
    await waitFor(() => expect(base(el).getAttribute('aria-valuenow')).toBe('0'));
  },
};

/** Cả trang — cố định ở mép trên cửa sổ (cuộn khung xem Storybook để thấy thanh chạy) */
export const Default = {
  args: { position: 'top', color: '', height: '3', noAnimation: false },
  render: (a) => html`
    <hui-scroll-progress id="sp-window" position=${a.position} color=${a.color || ''} height=${a.height}
      ?no-animation=${a.noAnimation}></hui-scroll-progress>
    <div style="max-width: 640px;">${paragraphs(30)}</div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-window');
    await expect(base(el).classList.contains('track--fixed')).toBe(true);
    await expect(getComputedStyle(base(el)).position).toBe('fixed');
  },
};

/** Mép dưới + màu tùy chỉnh + đổi target bằng JS */
export const BottomAndColor = {
  render: () => html`
    <div style="display: grid; gap: 24px; max-width: 560px;">
      <div style="border: 1px solid var(--hui-border); border-radius: 12px; overflow: hidden;">
        <hui-scroll-progress id="sp-switch" target="#sp-a" fixed="false" color="var(--hui-success)" height="6"></hui-scroll-progress>
        <div id="sp-a" style="height: 160px; overflow: auto; padding: 16px;">${paragraphs(6)}</div>
      </div>
      <div id="sp-b" style="height: 160px; overflow: auto; padding: 16px; border: 1px dashed var(--hui-border); border-radius: 12px;">
        ${paragraphs(6)}
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-switch');
    const b = canvasElement.querySelector('#sp-b');
    await expect(base(el).style.getPropertyValue('--_sp-color')).toBe('var(--hui-success)');
    // Đổi sang theo khung B (gán Element)
    el.target = b;
    await el.updateComplete;
    b.scrollTop = b.scrollHeight;
    await waitFor(() => expect(base(el).getAttribute('aria-valuenow')).toBe('100'));
    b.scrollTop = 0;
    await waitFor(() => expect(base(el).getAttribute('aria-valuenow')).toBe('0'));
  },
};

/** Override từ bên ngoài — biến CSS + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .sp-brand {
        --hui-scroll-progress-height: 8px;
        --hui-scroll-progress-track-color: var(--hui-warning-light);
        --hui-scroll-progress-radius: 0;
      }
      .sp-brand hui-scroll-progress::part(bar) {
        background-image: linear-gradient(90deg, var(--hui-warning), var(--hui-danger));
      }
    </style>
    <div class="sp-brand" style="max-width: 560px; border: 1px solid var(--hui-border); border-radius: 12px; overflow: hidden;">
      <hui-scroll-progress id="sp-custom" target="#sp-custom-box" fixed="false" no-animation></hui-scroll-progress>
      <div id="sp-custom-box" style="height: 200px; overflow: auto; padding: 16px;">${paragraphs(8)}</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-custom');
    await expect(getComputedStyle(base(el)).height).toBe('8px');
    await expect(getComputedStyle(bar(el)).transitionDuration).toBe('0s');
  },
};
