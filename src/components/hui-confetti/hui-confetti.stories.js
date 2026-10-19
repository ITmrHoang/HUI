import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';
import { clearConfetti } from '../../effects/feedback.js';

export default {
  title: 'Atoms/HuiConfetti',
  component: 'hui-confetti',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Confetti** — bọc phần tử bất kỳ, bắn pháo giấy khi bấm, khi cuộn tới, hoặc khi gọi \`fire()\`.
Dùng \`confetti()\` của \`@itmrhoang/h-ui/effects\`: canvas tự viết, phủ toàn màn hình trên top layer (nằm trên cả modal),
tạo khi cần và tự gỡ khi mảnh cuối rơi hết.

\`\`\`html
<hui-confetti><hui-button variant="primary">Đặt hàng</hui-button></hui-confetti>
<hui-confetti trigger="visible" count="200" block><h2>Chúc mừng!</h2></hui-confetti>
<hui-confetti trigger="manual" id="c"></hui-confetti>  <!-- c.fire() -->
\`\`\`
\`\`\`js
import { confetti } from '@itmrhoang/h-ui/effects';
confetti({ origin: buttonEl, count: 150, spread: 90, colors: 'primary, warning' });
\`\`\`

| Attribute | Mặc định | Mô tả |
|-----------|----------|-------|
| \`trigger\` | \`click\` | \`click\` (bấm phần tử con) · \`visible\` (cuộn tới, 1 lần) · \`manual\` (chỉ \`fire()\`) |
| \`count\` | 120 | Số mảnh |
| \`spread\` / \`angle\` / \`velocity\` | 70 / 90 / 13 | Độ toả (độ) / hướng bắn (90 = lên) / vận tốc đầu |
| \`colors\` | — | Phân cách dấu phẩy; tên token hoặc màu CSS. Trống → primary, info, success, warning, danger |
| \`origin\` | \`element\` | \`element\` (tâm phần tử được bấm) · \`pointer\` (vị trí con trỏ) · \`center\` (giữa màn hình) |
| \`once\` | — | \`click\`: chỉ bắn lần đầu |
| \`block\` | — | \`display: block\` thay vì inline-block |
| \`no-animation\` | — | Không bắn |

**Phương thức:** \`fire(opts?)\` → Promise (xong khi rơi hết) · **Sự kiện:** \`hui-confetti\` {count, origin: {x, y}, skipped}

**Slot:** mặc định · **Part:** \`base\`

Canvas \`aria-hidden\`, \`pointer-events: none\` → không chặn thao tác. Giảm chuyển động / \`html[data-hui-no-animation]\` → không bắn
(sự kiện vẫn phát với \`skipped: true\` để bạn hiện phản hồi khác nếu muốn).
        `,
      },
    },
  },
  argTypes: {
    count: { control: { type: 'range', min: 10, max: 400, step: 10 } },
    spread: { control: { type: 'range', min: 10, max: 360 } },
    origin: { control: 'inline-radio', options: ['element', 'pointer', 'center'] },
    colors: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="padding: 120px 0 24px; text-align: center;">
      <hui-confetti count=${args.count} spread=${args.spread} origin=${args.origin} colors=${args.colors}>
        <hui-button variant="primary">🎉 Đặt hàng</hui-button>
      </hui-confetti>
    </div>
  `,
  args: { count: 120, spread: 70, origin: 'element', colors: '' },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-confetti');
    let detail = null;
    el.addEventListener('hui-confetti', (e) => { detail = e.detail; });
    await userEvent.click(el.querySelector('hui-button'));
    await waitFor(() => expect(detail).not.toBeNull());
    await expect(detail.count).toBe(120);
    if (!detail.skipped) {
      const canvas = document.querySelector('canvas[data-hui-confetti]');
      await expect(canvas).toBeTruthy();
      await expect(canvas.getAttribute('aria-hidden')).toBe('true');
    }
    clearConfetti();
    await expect(document.querySelector('canvas[data-hui-confetti]')).toBeNull();
  },
};

/** Bắn khi cuộn tới */
export const Visible = {
  render: () => html`
    <div style="height: 260px; overflow: auto; border: 1px dashed var(--hui-border); border-radius: 12px; padding: 16px; font-family: var(--hui-font-family); color: var(--hui-text)">
      <p style="color: var(--hui-text-secondary)">Cuộn xuống ↓</p>
      <div style="height: 400px"></div>
      <hui-confetti trigger="visible" block count="80"><h2 style="text-align: center">Chúc mừng bạn đã hoàn thành!</h2></hui-confetti>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-confetti');
    let fired = 0;
    el.addEventListener('hui-confetti', () => { fired++; });
    await new Promise((r) => setTimeout(r, 200));
    await expect(fired).toBe(0);
    el.scrollIntoView();
    await waitFor(() => expect(fired).toBe(1));
    clearConfetti();
  },
};

/** Gọi fire() bằng JS + màu riêng + no-animation */
export const ManualAndApi = {
  render: () => html`
    <div style="display: flex; gap: 12px; padding: 80px 0 24px; justify-content: center;">
      <hui-confetti id="m" trigger="manual" colors="warning, danger" count="60"></hui-confetti>
      <hui-button id="fire">fire() màu warning + danger</hui-button>
      <hui-confetti no-animation><hui-button id="quiet">no-animation</hui-button></hui-confetti>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const m = canvasElement.querySelector('#m');
    canvasElement.querySelector('#fire').addEventListener('click', (e) => m.fire({ origin: e.currentTarget }));
    let manualClicks = 0;
    m.addEventListener('hui-confetti', () => { manualClicks++; });
    // trigger="manual": bấm vào chính nó không bắn
    m.click();
    await expect(manualClicks).toBe(0);
    await userEvent.click(canvasElement.querySelector('#fire'));
    await expect(manualClicks).toBe(1);
    clearConfetti();
    const quiet = canvasElement.querySelector('#quiet').parentElement;
    let skipped = null;
    quiet.addEventListener('hui-confetti', (e) => { skipped = e.detail.skipped; });
    await userEvent.click(canvasElement.querySelector('#quiet'));
    await expect(skipped).toBe(true);
    await expect(document.querySelector('canvas[data-hui-confetti]')).toBeNull();
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cf-custom::part(base) { display: inline-flex; gap: 8px; }
      .cf-custom { padding: 8px; border-radius: var(--hui-radius-lg); background: var(--hui-primary-1); }
    </style>
    <div style="padding: 80px 0 24px; text-align: center;">
      <hui-confetti class="cf-custom" colors="success, info" spread="120" origin="pointer">
        <hui-button>Bấm tôi</hui-button><hui-button variant="primary">hoặc tôi</hui-button>
      </hui-confetti>
    </div>
  `,
};
