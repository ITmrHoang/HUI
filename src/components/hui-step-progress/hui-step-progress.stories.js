/**
 * Storybook Stories — HUI Step Progress
 * Đầu trang wizard gọn: "Bước 2/5" + tên bước + thanh tiến độ mảnh + nút Trước/Sau (hui-button).
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-steps/index.js';

const STEPS = ['Thông tin cá nhân', 'Địa chỉ giao hàng', 'Phương thức thanh toán', 'Xác nhận đơn'];
const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const innerButton = (huiButton) => huiButton.shadowRoot.querySelector('button');

export default {
  title: 'Molecules/HuiStepProgress',
  component: 'hui-step-progress',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Step Progress** — Đầu trang wizard nhỏ gọn (kiểu form nhiều bước trên mobile):
"Bước 2/5" + tên bước + thanh tiến độ mảnh + nút Trước/Sau. Nút Trước tự tắt ở bước đầu; bước cuối nút Sau thành **Hoàn thành**.

\`\`\`html
<hui-step-progress current="1" .steps=\${['Thông tin', 'Địa chỉ', 'Thanh toán']}
  @change=\${(e) => { if (!formValid) e.preventDefault(); }}
  @hui-finish=\${submit}></hui-step-progress>

<!-- Chỉ có tổng số bước, không có tên -->
<hui-step-progress current="0" total="5" show-buttons="false"></hui-step-progress>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`current\` | number | \`0\` | Bước hiện tại (từ 0, tự kẹp trong khoảng hợp lệ) |
| \`total\` | number | — | Tổng số bước (bỏ qua khi có \`steps\`) |
| \`steps\` | JSON | — | Mảng tên bước \`['A', 'B']\` hoặc \`[{ title }]\` |
| \`show-buttons\` | string | \`'true'\` | \`'false'\` = ẩn cụm nút |
| \`prev-text\` / \`next-text\` / \`finish-text\` | string | _locale_ | Chữ trên nút |
| \`size\` | \`sm \\| md \\| lg\` | \`md\` | Kích thước nút + chữ |
| \`label\` | string | _locale_ | Nhãn thanh tiến độ cho trình đọc màn hình |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng chạy của thanh |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`steps\` | Mảng tên bước |
| \`next()\` / \`prev()\` / \`goTo(index)\` | Chuyển bước (phát \`change\`, trả về \`false\` nếu bị chặn) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ current, previous, direction: 'next' \\| 'prev' }\` | Chuyển bước — **cancelable**: \`preventDefault()\` để chặn (form chưa hợp lệ) |
| \`hui-finish\` | \`{ current }\` | Bấm "Hoàn thành" ở bước cuối |

### Slots
| Slot | Mô tả |
|------|-------|
| \`title\` | Tên bước tùy biến (ưu tiên hơn \`steps[current]\`) |
| \`extra\` | Nội dung thêm trước cụm nút (vd: "Lưu nháp") |

### Bàn phím & ARIA
Nút là \`hui-button\` (Tab / Enter / Space). Thanh tiến độ \`role="progressbar"\` với \`aria-valuenow\` = số thứ tự bước,
\`aria-valuemax\` = tổng, \`aria-valuetext\` = "Bước 2/5: tên bước"; khối chữ \`aria-live="polite"\` để đọc khi đổi bước.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-step-progress-color\` | Màu thanh + chữ "Bước 2/5" |
| \`--hui-step-progress-track-color\` | Màu rãnh |
| \`--hui-step-progress-height\` | Độ dày thanh (4px) |
| \`--hui-step-progress-radius\` | Bo góc thanh |
| \`--hui-step-progress-gap\` | Khoảng cách hàng chữ ↔ thanh |
| \`--hui-step-progress-title-color\` / \`--hui-step-progress-counter-color\` | Màu chữ |

**Parts:** \`base\`, \`header\`, \`info\`, \`counter\`, \`title\`, \`actions\`, \`prev\`, \`next\`, \`track\`, \`bar\`.
**State:** \`:state(first)\`, \`:state(last)\`.
        `,
      },
    },
  },
  argTypes: {
    current: { control: { type: 'number', min: 0, max: 3 } },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    showButtons: { control: 'inline-radio', options: ['true', 'false'] },
    noAnimation: { control: 'boolean' },
  },
};

/** Mặc định — Controls đổi bước, kích thước, ẩn nút */
export const Default = {
  args: { current: 1, size: 'md', showButtons: 'true', noAnimation: false },
  render: (a) => html`
    <hui-step-progress id="sp-default" current=${a.current} size=${a.size} show-buttons=${a.showButtons}
      ?no-animation=${a.noAnimation} .steps=${STEPS}></hui-step-progress>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-default');
    await expect(part(el, 'counter').textContent).toBe('Bước 2/4');
    await expect(part(el, 'title').textContent).toBe('Địa chỉ giao hàng');
    await expect(part(el, 'bar').style.width).toBe('50%');
    const track = part(el, 'track');
    await expect(track.getAttribute('role')).toBe('progressbar');
    await expect(track.getAttribute('aria-valuenow')).toBe('2');
    await expect(track.getAttribute('aria-valuemax')).toBe('4');
  },
};

/** Next / Prev / Finish — sự kiện change + hui-finish */
export const Navigation = {
  render: () => html`<hui-step-progress id="sp-nav" current="0" .steps=${STEPS.slice(0, 3)}></hui-step-progress>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-nav');
    const changes = [];
    let finished = null;
    el.addEventListener('change', (e) => changes.push(e.detail));
    el.addEventListener('hui-finish', (e) => { finished = e.detail; });
    const prev = part(el, 'prev');
    const next = part(el, 'next');

    // Bước đầu: Prev bị tắt
    await expect(prev.disabled).toBe(true);
    await expect(innerButton(prev).disabled).toBe(true);
    await expect(next.textContent).toBe('Tiếp tục');

    innerButton(next).click();
    await expect(changes[0]).toEqual({ current: 1, previous: 0, direction: 'next' });
    await waitFor(() => expect(part(el, 'counter').textContent).toBe('Bước 2/3'));
    await expect(prev.disabled).toBe(false);

    innerButton(prev).click();
    await expect(changes[1]).toEqual({ current: 0, previous: 1, direction: 'prev' });
    await waitFor(() => expect(el.current).toBe(0));

    // Tới bước cuối → nút thành "Hoàn thành"
    el.next();
    el.next();
    await waitFor(() => expect(next.textContent).toBe('Hoàn thành'));
    await expect(part(el, 'bar').style.width).toBe('100%');
    innerButton(next).click();
    await expect(finished).toEqual({ current: 2 });
    await expect(el.current).toBe(2);
  },
};

/** change cancelable — chặn chuyển bước khi chưa đồng ý điều khoản */
export const CancelChange = {
  render: () => html`
    <hui-step-progress id="sp-cancel" .steps=${['Điều khoản', 'Thông tin', 'Xong']}
      @change=${(e) => {
        const ok = document.querySelector('#sp-agree')?.checked;
        if (e.detail.direction === 'next' && !ok) e.preventDefault();
      }}></hui-step-progress>
    <label style="display: flex; gap: 8px; margin-top: 16px; font-size: 14px;">
      <input type="checkbox" id="sp-agree"> Tôi đồng ý với điều khoản
    </label>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-cancel');
    await expect(el.next()).toBe(false);
    await expect(el.current).toBe(0);
    canvasElement.querySelector('#sp-agree').checked = true;
    await expect(el.next()).toBe(true);
    await expect(el.current).toBe(1);
  },
};

/** Chỉ có `total`, ẩn nút, chữ tùy chỉnh, slot title / extra */
export const Variants = {
  render: () => html`
    <div style="display: grid; gap: 32px;">
      <hui-step-progress id="sp-total" current="2" total="5" show-buttons="false"></hui-step-progress>
      <hui-step-progress current="0" .steps=${STEPS} size="sm" prev-text="Trước" next-text="Sau"></hui-step-progress>
      <hui-step-progress current="3" .steps=${STEPS} size="lg" finish-text="Đặt hàng"></hui-step-progress>
      <hui-step-progress current="1" total="3">
        <span slot="title">Tên bước bằng <b>slot</b></span>
        <hui-button slot="extra" variant="text" size="md">Lưu nháp</hui-button>
      </hui-step-progress>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-total');
    await expect(part(el, 'counter').textContent).toBe('Bước 3/5');
    await expect(part(el, 'actions').hidden).toBe(true);
    await expect(part(el, 'bar').style.width).toBe('60%');
  },
};

/** Kết hợp hui-steps — thanh bước đầy đủ cho desktop, step-progress gọn cho mobile */
export const WithSteps = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <hui-steps id="sp-steps" current="0" .data=${STEPS}></hui-steps>
      <hui-step-progress .steps=${STEPS}
        @change=${(e) => { document.querySelector('#sp-steps').current = e.detail.current; }}
        @hui-finish=${() => { document.querySelector('#sp-steps').status = 'finish'; }}></hui-step-progress>
    </div>
  `,
};

/** Override từ bên ngoài — biến CSS + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .sp-brand {
        --hui-step-progress-color: var(--hui-success);
        --hui-step-progress-height: 8px;
        --hui-step-progress-radius: 2px;
      }
      .sp-brand hui-step-progress::part(base) {
        padding: 16px;
        border: 1px solid var(--hui-border);
        border-radius: 12px;
      }
      .sp-brand hui-step-progress::part(counter) {
        text-transform: uppercase;
      }
    </style>
    <div class="sp-brand">
      <hui-step-progress id="sp-custom" current="1" .steps=${STEPS}></hui-step-progress>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sp-custom');
    await expect(getComputedStyle(part(el, 'track')).height).toBe('8px');
    await expect(getComputedStyle(part(el, 'base')).paddingTop).toBe('16px');
  },
};
