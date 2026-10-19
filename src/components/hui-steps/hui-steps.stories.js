/**
 * Storybook Stories — HUI Steps
 * Ant Steps + MUI Stepper: ngang / dọc, default / dot / navigation, clickable, percent, data hoặc <hui-step> con.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const itemsOf = (el) => [...el.shadowRoot.querySelectorAll('li')];
const statusOf = (li) => ['wait', 'process', 'finish', 'error'].find((s) => li.classList.contains(`step--${s}`));
const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true }));

const DATA = [
  { title: 'Đăng ký', description: 'Tạo tài khoản' },
  { title: 'Xác minh', description: 'Kiểm tra email', subTitle: '00:02:15' },
  { title: 'Thanh toán', description: 'Chọn gói dịch vụ' },
  { title: 'Hoàn tất', description: 'Bắt đầu sử dụng' },
];

export default {
  title: 'Molecules/HuiSteps',
  component: 'hui-steps',
  subcomponents: { HuiStep: 'hui-step' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Steps** — Thanh các bước của một quy trình (Ant Steps + MUI Stepper).
Trạng thái tự tính theo \`current\`: bước trước → \`finish\` (✓), bước hiện tại → \`process\` (hoặc \`status\`), bước sau → \`wait\`;
\`status\` riêng của từng bước luôn được ưu tiên. Đường nối sau bước đã xong được tô màu (có hiệu ứng, tắt bằng \`no-animation\`).
Khung hẹp hơn \`responsive-breakpoint\` (576px) → dạng ngang tự chuyển sang dọc.

\`\`\`html
<hui-steps current="1">
  <hui-step title="Đăng ký" description="Tạo tài khoản"></hui-step>
  <hui-step title="Xác minh" sub-title="00:02:15"></hui-step>
  <hui-step title="Hoàn tất" icon="star"></hui-step>
</hui-steps>

<!-- Hoặc dữ liệu (ưu tiên hơn thẻ con) -->
<hui-steps clickable .data=\${[{ title: 'A' }, { title: 'B', disabled: true }]} @change=\${(e) => e.detail.current}></hui-steps>
\`\`\`

### Attributes — hui-steps
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`current\` | number | \`0\` | Bước hiện tại (từ 0) |
| \`direction\` | \`horizontal \\| vertical\` | \`horizontal\` | Hướng hiển thị |
| \`type\` | \`default \\| dot \\| navigation\` | \`default\` | Số trong vòng tròn \\| chấm nhỏ \\| thanh điều hướng |
| \`size\` | \`sm \\| md\` | \`md\` | Kích thước |
| \`status\` | \`wait \\| process \\| finish \\| error\` | \`process\` | Trạng thái của bước hiện tại |
| \`label-placement\` | \`horizontal \\| vertical\` | \`horizontal\` | Chữ cạnh icon \\| dưới icon (type="dot" luôn dưới) |
| \`clickable\` | boolean | \`false\` | Các bước thành nút bấm → sự kiện \`change\` |
| \`percent\` | number | — | 0–100: vòng tiến độ quanh icon bước hiện tại |
| \`responsive-breakpoint\` | number | \`576\` | Bề rộng (px) dưới mức này thì ngang → dọc; \`0\` = tắt |
| \`data\` | JSON | — | Mảng bước (thường gán bằng property) |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng tô đường nối |

### Attributes — hui-step
| Attribute | Type | Mô tả |
|-----------|------|-------|
| \`title\` | string | Tiêu đề |
| \`description\` | string | Mô tả |
| \`sub-title\` | string | Tiêu đề phụ |
| \`icon\` | string | Tên hui-icon thay số thứ tự |
| \`status\` | \`wait \\| process \\| finish \\| error\` | Ghi đè trạng thái tự tính |
| \`disabled\` | boolean | Không bấm chọn được |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`data\` | \`Array<{ title, description?, subTitle?, icon?, status?, disabled? } \\| string>\` | Danh sách bước |
| \`next()\` / \`prev()\` | method | Sang bước kế / lùi lại (không phát \`change\`) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ current, previous }\` | Người dùng bấm chọn bước (khi \`clickable\`) |

### Bàn phím (khi \`clickable\`)
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Vào bước hiện tại (roving tabindex) |
| \`←\` \`→\` / \`↑\` \`↓\` | Di chuyển focus giữa các bước bấm được |
| \`Home\` / \`End\` | Bước đầu / cuối |
| \`Enter\` / \`Space\` | Chọn bước đang focus |

### ARIA
Danh sách \`<ol>\` / \`<li>\`; bước hiện tại có \`aria-current="step"\`; bước bấm được là \`<button aria-label="Bước i: tiêu đề">\`;
trạng thái từng bước được đọc qua chữ ẩn (locale \`steps.wait | process | finish | error\`).

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-steps-icon-size\` | Kích thước ô icon (32px; sm 24px) |
| \`--hui-steps-dot-size\` | Đường kính chấm (8px) |
| \`--hui-steps-color\` | Màu bước đang làm / đã xong |
| \`--hui-steps-wait-color\` | Màu bước đang chờ |
| \`--hui-steps-error-color\` | Màu bước lỗi |
| \`--hui-steps-connector-color\` | Đường nối chưa tô |
| \`--hui-steps-connector-fill-color\` | Đường nối đã tô |
| \`--hui-steps-connector-thickness\` | Độ dày đường nối |
| \`--hui-steps-title-color\` / \`--hui-steps-description-color\` | Màu chữ |
| \`--hui-steps-gap\` | Khoảng cách icon ↔ chữ |
| \`--hui-steps-focus-color\` | Viền focus |

**Parts:** \`base\`, \`item\` (+ \`item-wait\`, \`item-process\`, \`item-finish\`, \`item-error\`, \`item-active\`), \`step\`, \`icon\`, \`ring\`,
\`content\`, \`title\`, \`subtitle\`, \`description\`, \`connector\`, \`connector-fill\`.
**State:** \`:state(collapsed)\` (đang tự thu thành dọc), \`:state(vertical)\`.
        `,
      },
    },
  },
  argTypes: {
    current: { control: { type: 'number', min: 0, max: 3 } },
    direction: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    type: { control: 'inline-radio', options: ['default', 'dot', 'navigation'] },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    status: { control: 'select', options: ['wait', 'process', 'finish', 'error'] },
    labelPlacement: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    clickable: { control: 'boolean' },
    percent: { control: { type: 'range', min: 0, max: 100 } },
    noAnimation: { control: 'boolean' },
  },
};

/** Mặc định — thẻ con <hui-step>; Controls đổi current / type / status... */
export const Default = {
  args: { current: 1, direction: 'horizontal', type: 'default', size: 'md', status: 'process', labelPlacement: 'horizontal', clickable: false, noAnimation: false },
  render: (a) => html`
    <hui-steps id="st-default" current=${a.current} direction=${a.direction} type=${a.type} size=${a.size}
      status=${a.status} label-placement=${a.labelPlacement} ?clickable=${a.clickable} ?no-animation=${a.noAnimation}
      percent=${a.percent ?? ''}>
      <hui-step title="Đăng ký" description="Tạo tài khoản"></hui-step>
      <hui-step title="Xác minh" description="Kiểm tra email"></hui-step>
      <hui-step title="Hoàn tất" description="Bắt đầu sử dụng"></hui-step>
    </hui-steps>
  `,
  // Kiểm thử: trạng thái tự tính + aria-current + icon ✓ / số thứ tự + đường nối được tô
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#st-default');
    await waitFor(() => expect(itemsOf(el).length).toBe(3));
    const items = itemsOf(el);
    await expect(items.map(statusOf)).toEqual(['finish', 'process', 'wait']);
    await expect(items[1].getAttribute('aria-current')).toBe('step');
    await expect(items[0].hasAttribute('aria-current')).toBe(false);
    await expect(items[0].querySelector('hui-icon').getAttribute('name')).toBe('check');
    await expect(items[2].querySelector('.step__icon-inner').textContent).toBe('3');
    await expect(el.shadowRoot.querySelector('ol').getAttribute('aria-label')).toBeTruthy();

    // Đổi current → trạng thái cập nhật
    el.current = 2;
    await waitFor(() => expect(itemsOf(el).map(statusOf)).toEqual(['finish', 'finish', 'process']));
    await expect(itemsOf(el)[2].getAttribute('aria-current')).toBe('step');

    // status="error" áp cho bước hiện tại → icon ✕
    el.status = 'error';
    await waitFor(() => expect(statusOf(itemsOf(el)[2])).toBe('error'));
    await expect(itemsOf(el)[2].querySelector('hui-icon').getAttribute('name')).toBe('close');

    // Đổi attribute thẻ con → tự vẽ lại
    el.querySelector('hui-step').setAttribute('title', 'Tạo tài khoản');
    await waitFor(() => expect(itemsOf(el)[0].querySelector('.step__title-text').textContent).toBe('Tạo tài khoản'));
    el.current = 1;
    el.status = 'process';
  },
};

/** Dữ liệu qua property `data` (ưu tiên hơn thẻ con) + status riêng từng bước */
export const DataMode = {
  render: () => html`
    <hui-steps id="st-data" current="1" .data=${[
      ...DATA.slice(0, 2),
      { title: 'Thanh toán', description: 'Thẻ bị từ chối', status: 'error' },
      { title: 'Hoàn tất', icon: 'star' },
    ]}>
      <hui-step title="Bị bỏ qua khi có data"></hui-step>
    </hui-steps>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#st-data');
    await waitFor(() => expect(itemsOf(el).length).toBe(4));
    const items = itemsOf(el);
    await expect(items.map(statusOf)).toEqual(['finish', 'process', 'error', 'wait']);
    await expect(items[1].querySelector('.step__subtitle').textContent).toBe('00:02:15');
    await expect(items[3].querySelector('hui-icon').getAttribute('name')).toBe('star');
    await expect(items[3].classList.contains('step--custom-icon')).toBe(true);

    // Gán data mới → dựng lại
    el.data = ['Một', 'Hai'];
    await waitFor(() => expect(itemsOf(el).length).toBe(2));
    await expect(itemsOf(el)[0].querySelector('.step__title-text').textContent).toBe('Một');
  },
};

/** clickable — bấm / bàn phím chọn bước, phát `change` */
export const Clickable = {
  render: () => html`
    <hui-steps id="st-click" clickable current="0" .data=${[
      { title: 'Giỏ hàng' }, { title: 'Giao hàng' }, { title: 'Khuyến mãi', disabled: true }, { title: 'Thanh toán' },
    ]}></hui-steps>
    <p id="st-click-log" style="color: var(--hui-text-secondary); font-size: 14px;">Bấm vào một bước</p>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#st-click');
    const log = [];
    el.addEventListener('change', (e) => {
      log.push(e.detail);
      canvasElement.querySelector('#st-click-log').textContent = `current = ${e.detail.current}`;
    });
    await waitFor(() => expect(el.shadowRoot.querySelectorAll('button').length).toBe(4));
    const buttons = [...el.shadowRoot.querySelectorAll('button')];
    await expect(buttons[1].getAttribute('aria-label')).toMatch(/2: Giao hàng$/);
    await expect(buttons[0].tabIndex).toBe(0);
    await expect(buttons[1].tabIndex).toBe(-1);
    await expect(buttons[2].disabled).toBe(true);

    buttons[1].click();
    await expect(log).toEqual([{ current: 1, previous: 0 }]);
    await expect(el.current).toBe(1);
    await waitFor(() => expect(itemsOf(el)[1].getAttribute('aria-current')).toBe('step'));

    // Bước disabled không chọn được
    buttons[2].click();
    await expect(log.length).toBe(1);

    // Bàn phím: → bỏ qua bước disabled, End về cuối, Enter (nút native) chọn
    buttons[1].focus();
    key(buttons[1], 'ArrowRight');
    await expect(el.shadowRoot.activeElement).toBe(buttons[3]);
    key(buttons[3], 'Home');
    await expect(el.shadowRoot.activeElement).toBe(buttons[0]);
    key(buttons[0], 'End');
    await expect(el.shadowRoot.activeElement).toBe(buttons[3]);
    buttons[3].click();
    await expect(log[1]).toEqual({ current: 3, previous: 1 });
  },
};

/** Dọc — kèm mô tả dài */
export const Vertical = {
  render: () => html`
    <hui-steps id="st-vertical" direction="vertical" current="1" style="max-width: 420px;" .data=${DATA}></hui-steps>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#st-vertical');
    await waitFor(() => expect(itemsOf(el).length).toBe(4));
    const list = el.shadowRoot.querySelector('ol');
    await expect(list.classList.contains('steps--vertical')).toBe(true);
    await expect(getComputedStyle(list).flexDirection).toBe('column');
    // Bước cuối không có đường nối
    await expect(itemsOf(el)[3].querySelector('[part="connector"]').hidden).toBe(true);
    await expect(itemsOf(el)[0].querySelector('[part="connector"]').hidden).toBe(false);
  },
};

/** Responsive — khung hẹp hơn 576px thì dạng ngang tự chuyển dọc */
export const Responsive = {
  render: () => html`
    <div id="st-resp-box" style="width: 720px; max-width: 100%; border: 1px dashed var(--hui-border); padding: 12px; resize: horizontal; overflow: auto;">
      <hui-steps id="st-resp" current="1" .data=${DATA.slice(0, 3)}></hui-steps>
    </div>
    <p style="color: var(--hui-text-secondary); font-size: 14px;">Kéo góc phải dưới khung để thu hẹp.</p>
  `,
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('#st-resp-box');
    const el = canvasElement.querySelector('#st-resp');
    const list = () => el.shadowRoot.querySelector('ol');
    box.style.width = '720px';
    await waitFor(() => expect(list().classList.contains('steps--horizontal')).toBe(true));
    box.style.width = '360px';
    await waitFor(() => expect(list().classList.contains('steps--vertical')).toBe(true));
    box.style.width = '720px';
    await waitFor(() => expect(list().classList.contains('steps--horizontal')).toBe(true));
  },
};

/** Các type: default · dot · navigation; label-placement vertical; size sm */
export const Types = {
  render: () => html`
    <div style="display: grid; gap: 40px;">
      <hui-steps current="1" .data=${DATA.slice(0, 3)}></hui-steps>
      <hui-steps current="1" label-placement="vertical" .data=${DATA.slice(0, 3)}></hui-steps>
      <hui-steps current="2" type="dot" .data=${DATA}></hui-steps>
      <hui-steps current="1" type="navigation" clickable .data=${DATA.slice(0, 3)}></hui-steps>
      <hui-steps current="1" size="sm" .data=${DATA.slice(0, 3)}></hui-steps>
      <hui-steps current="1" type="dot" direction="vertical" .data=${DATA.slice(0, 3)} style="max-width: 360px;"></hui-steps>
    </div>
  `,
};

/** percent — vòng tiến độ quanh bước hiện tại */
export const Percent = {
  args: { percent: 60 },
  render: (a) => html`<hui-steps id="st-percent" current="1" percent=${a.percent} .data=${DATA.slice(0, 3)}></hui-steps>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#st-percent');
    await waitFor(() => expect(itemsOf(el).length).toBe(3));
    const ring = itemsOf(el)[1].querySelector('[part="ring"]');
    await expect(ring.style.display).toBe('');
    await expect(ring.querySelector('.ring__path').getAttribute('stroke-dasharray')).toBe('60 100');
    await expect(itemsOf(el)[0].querySelector('[part="ring"]').style.display).toBe('none');
  },
};

/** Wizard: kết hợp nút ngoài + next()/prev() */
export const WithButtons = {
  render: () => html`
    <hui-steps id="st-wizard" current="0" .data=${DATA}></hui-steps>
    <div style="display: flex; gap: 8px; margin-top: 24px;">
      <hui-button variant="outline" @hui-click=${() => document.querySelector('#st-wizard').prev()}>Quay lại</hui-button>
      <hui-button @hui-click=${() => document.querySelector('#st-wizard').next()}>Tiếp tục</hui-button>
    </div>
  `,
};

/** Override từ bên ngoài — biến CSS + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .steps-brand {
        --hui-steps-color: var(--hui-success);
        --hui-steps-connector-thickness: 3px;
        --hui-steps-icon-size: 36px;
      }
      .steps-brand hui-steps::part(icon) {
        border-radius: 8px;
      }
      .steps-brand hui-steps::part(item-active) {
        background: var(--hui-success-light);
        border-radius: 8px;
      }
    </style>
    <div class="steps-brand">
      <hui-steps id="st-custom" current="1" .data=${DATA.slice(0, 3)}></hui-steps>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#st-custom');
    await waitFor(() => expect(itemsOf(el).length).toBe(3));
    const icon = itemsOf(el)[0].querySelector('[part="icon"]');
    await expect(getComputedStyle(icon).width).toBe('36px');
    await expect(getComputedStyle(icon).borderTopLeftRadius).toBe('8px');
  },
};
