/**
 * Storybook Stories — HUI Loading Bar
 * Thanh tải mảnh ở mép trên (kiểu NProgress): gọi bằng hàm loadingBar.start() / done() / error(), hoặc khai báo.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import { loadingBar } from './index.js';
import '../hui-button/index.js';

export default {
  title: 'Atoms/HuiLoadingBar',
  component: 'hui-loading-bar',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Loading Bar** — Thanh tiến trình mảnh ở mép trên cửa sổ khi chuyển trang / gọi API (kiểu NProgress).

Gọi bằng hàm: \`<hui-loading-bar>\` tự gắn vào \`<body>\`, nằm trên top-layer (Popover API → trên cả Modal),
tự nhích dần (trickle) trong lúc chờ, \`done()\` chạy tới 100% rồi mờ dần và **tự gỡ khỏi trang**.
Chỉ là chỉ báo thị giác (\`aria-hidden\`) — trạng thái cho trình đọc màn hình do trang tự thông báo.

### Cách sử dụng
\`\`\`js
import { loadingBar } from 'hui-lib/hui-loading-bar';

loadingBar.config({ color: 'var(--hui-success)', height: 3, trickleSpeed: 300 });
loadingBar.start();
try {
  await fetch('/api/data');
  loadingBar.done();
} catch {
  loadingBar.error();       // chuyển đỏ rồi mờ dần
}
\`\`\`
\`\`\`html
<!-- Khai báo: tự đặt percent -->
<hui-loading-bar percent="40"></hui-loading-bar>
<hui-loading-bar inline percent="70" status="error"></hui-loading-bar>
\`\`\`

### API \`loadingBar\`
| Hàm | Mô tả |
|-----|-------|
| \`start()\` | Hiện thanh (bắt đầu ở \`minimum\` = 8%) và tự nhích dần, tối đa 99.4% |
| \`set(percent)\` | Đặt tiến độ 0–100 (chưa start thì tự hiện); 100 = hoàn tất |
| \`inc(amount?)\` | Nhích thêm (mặc định theo bước trickle) |
| \`done()\` | Chạy tới 100% → mờ dần → gỡ khỏi trang. Chưa start thì bỏ qua |
| \`error()\` | Chuyển đỏ, chạy tới 100%, giữ một nhịp rồi mờ dần |
| \`config({ color, height, trickleSpeed, trickle, minimum })\` | Cấu hình toàn cục (\`trickleSpeed\` ms, mặc định 200) |
| \`isStarted\` | Đang chạy hay không |

### Attributes (\`<hui-loading-bar>\`)
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`percent\` | number | — | Tiến độ 0–100; bỏ trống = ẩn |
| \`status\` | string | \`'normal'\` | \`normal\` \\| \`error\` |
| \`color\` | string | — | Màu CSS (ưu tiên hơn biến CSS) |
| \`height\` | string | \`'3'\` | Độ dày: số (px) hoặc độ dài CSS |
| \`inline\` | boolean | \`false\` | Nằm trong luồng trang thay vì cố định ở mép trên |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng chạy / mờ dần |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-loading-bar-color\` | Màu thanh (mặc định \`--hui-primary\`) |
| \`--hui-loading-bar-error-color\` | Màu khi lỗi (mặc định \`--hui-danger\`) |
| \`--hui-loading-bar-height\` | Độ dày (3px) |
| \`--hui-loading-bar-shadow\` | Vệt sáng ở đầu thanh |

**Parts:** \`bar\`, \`peg\`.
        `,
      },
    },
  },
  argTypes: {
    percent: { control: { type: 'range', min: 0, max: 100 } },
    status: { control: 'select', options: ['normal', 'error'] },
    color: { control: 'color' },
    height: { control: 'text' },
  },
};

const autoBar = () => document.body.querySelector(':scope > hui-loading-bar');
const widthOf = (el) => el.shadowRoot.querySelector('[part="bar"]').style.width;

/** Gọi bằng hàm — thanh xuất hiện ở mép trên cửa sổ */
export const Default = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <hui-button @hui-click=${() => loadingBar.start()}>start()</hui-button>
      <hui-button variant="outline" @hui-click=${() => loadingBar.set(60)}>set(60)</hui-button>
      <hui-button variant="outline" @hui-click=${() => loadingBar.inc()}>inc()</hui-button>
      <hui-button variant="secondary" @hui-click=${() => loadingBar.done()}>done()</hui-button>
      <hui-button variant="danger" @hui-click=${() => loadingBar.error()}>error()</hui-button>
    </div>
  `,
  // Kiểm thử: start → thanh tự tạo trong body + nhích dần → done → 100% → tự gỡ khỏi trang
  play: async () => {
    loadingBar.start();
    const el = autoBar();
    await expect(el).not.toBe(null);
    await expect(el.getAttribute('aria-hidden')).toBe('true');
    await waitFor(() => expect(widthOf(el)).toBe('8%'));
    await expect(loadingBar.isStarted).toBe(true);

    // Trickle: tự nhích quá mức ban đầu
    await waitFor(() => expect(parseFloat(widthOf(el))).toBeGreaterThan(8), { timeout: 2000 });

    loadingBar.done();
    await waitFor(() => expect(widthOf(el)).toBe('100%'));
    await expect(loadingBar.isStarted).toBe(false);
    await waitFor(() => expect(el.isConnected).toBe(false), { timeout: 3000 });
    await expect(autoBar()).toBe(null);
  },
};

/** error(): chuyển đỏ rồi mờ dần */
export const ErrorState = {
  render: () => html`<hui-button variant="danger" @hui-click=${() => { loadingBar.start(); setTimeout(() => loadingBar.error(), 800); }}>Mô phỏng lỗi</hui-button>`,
  play: async () => {
    loadingBar.start();
    const el = autoBar();
    loadingBar.error();
    await waitFor(() => expect(el.shadowRoot.querySelector('[part="bar"]').classList.contains('bar--error')).toBe(true));
    await waitFor(() => expect(el.isConnected).toBe(false), { timeout: 3000 });
  },
};

/** Khai báo: `inline` + `percent` — Controls đổi tiến độ, trạng thái, màu, độ dày */
export const Declarative = {
  args: { percent: 40, status: 'normal', color: '', height: '4' },
  render: (args) => html`
    <div style="border: 1px solid var(--hui-border); border-radius: 8px; overflow: hidden;">
      <hui-loading-bar id="lb-decl" inline percent=${args.percent} status=${args.status} color=${args.color || ''} height=${args.height}></hui-loading-bar>
      <div style="padding: 16px; color: var(--hui-text-secondary);">Thanh nằm ở mép trên của khung này.</div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#lb-decl');
    await expect(widthOf(el)).toBe('40%');
    await expect(el.style.getPropertyValue('--_lb-height')).toBe('4px');
    el.percent = 75;
    await waitFor(() => expect(widthOf(el)).toBe('75%'));
  },
};

/** Các trạng thái khai báo */
export const States = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      <hui-loading-bar inline percent="25"></hui-loading-bar>
      <hui-loading-bar inline percent="60" color="var(--hui-success)"></hui-loading-bar>
      <hui-loading-bar inline percent="100" status="error"></hui-loading-bar>
      <hui-loading-bar inline percent="80" height="6"></hui-loading-bar>
    </div>
  `,
};

/** Override từ bên ngoài — biến CSS + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .lb-brand {
        --hui-loading-bar-color: var(--hui-warning);
        --hui-loading-bar-height: 6px;
        --hui-loading-bar-shadow: none;
      }
      .lb-brand hui-loading-bar::part(bar) {
        background-image: linear-gradient(90deg, var(--hui-primary), var(--hui-warning));
        border-radius: 0;
      }
    </style>
    <div class="lb-brand" style="border: 1px solid var(--hui-border); border-radius: 8px; overflow: hidden;">
      <hui-loading-bar inline percent="65"></hui-loading-bar>
      <div style="padding: 16px; color: var(--hui-text-secondary);">Gradient qua ::part(bar).</div>
    </div>
  `,
};
