/**
 * Storybook Stories — HUI Segmented (chọn một dạng thanh trượt)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const items = (el) => [...el.shadowRoot.querySelectorAll('[role="radio"]')];

export default {
  title: 'Atoms/HuiSegmented',
  component: 'hui-segmented',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Segmented** — chọn một trong nhiều lựa chọn, vệt nền trượt tới lựa chọn đang chọn (Ant Segmented).
Tham gia \`<form>\` native như radio group.

\`\`\`html
<hui-segmented name="period" value="week"></hui-segmented>  <!-- el.options = ['Ngày', 'Tuần', …] -->
<hui-segmented block>
  <option value="list" icon="menu">Danh sách</option>
  <option value="grid" icon="grid">Lưới</option>
</hui-segmented>
\`\`\`

### Attributes / Properties
| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| \`options\` | \`(string \\| {value,label,icon,disabled,title})[]\` | \`[]\` | Lựa chọn (property hoặc JSON). Không có → đọc \`<option>\` con |
| \`value\` | string | lựa chọn đầu | Giá trị đang chọn (attribute = giá trị ban đầu khi reset) |
| \`block\` | boolean | — | Chiếm hết chiều ngang, chia đều |
| \`size\` | \`sm \\| md \\| lg\` | \`md\` | Bỏ trống = theo \`hui-form\` |
| \`label\` | string | — | aria-label của nhóm |
| \`no-animation\` | boolean | — | Tắt trượt indicator |
| \`name\` / \`disabled\` / \`readonly\` / \`required\` | — | — | Như form control native |

### Events
| Event | Detail |
|-------|--------|
| \`input\` / \`change\` | \`{ value }\` — người dùng chọn lựa chọn khác |

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | \`<option value icon disabled title>\` — chỉ để khai báo, không hiển thị trực tiếp |

### Parts
\`base\` (role=radiogroup), \`indicator\`, \`item\` (+ \`item-selected\`, \`item-disabled\`), \`icon\`, \`label\`

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-segmented-bg\` / \`--hui-segmented-padding\` / \`--hui-segmented-radius\` | Khung |
| \`--hui-segmented-item-height\` / \`--hui-segmented-item-padding-x\` / \`--hui-segmented-item-radius\` | Lựa chọn |
| \`--hui-segmented-color\` / \`--hui-segmented-hover-color\` / \`--hui-segmented-item-hover-bg\` | Màu thường / hover |
| \`--hui-segmented-selected-color\` | Chữ lựa chọn đang chọn |
| \`--hui-segmented-indicator-bg\` / \`--hui-segmented-indicator-shadow\` | Vệt trượt |
| \`--hui-segmented-duration\` / \`--hui-segmented-font-size\` | Thời gian trượt / cỡ chữ |

### Bàn phím (WAI-ARIA APG Radio Group)
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Vào / ra nhóm (chỉ dừng ở lựa chọn đang chọn) |
| \`→\` \`↓\` / \`←\` \`↑\` | Chọn lựa chọn kế / trước (vòng lại, bỏ qua disabled) |
| \`Home\` / \`End\` | Chọn lựa chọn đầu / cuối |
        `,
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    block: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

const PERIODS = ['Ngày', 'Tuần', 'Tháng', 'Quý', 'Năm'];

export const Default = {
  render: (args) => html`
    <hui-segmented .options=${PERIODS} value="Tuần" size=${args.size} ?block=${args.block} ?disabled=${args.disabled}
      label="Kỳ báo cáo"></hui-segmented>
  `,
  args: { size: 'md', block: false, disabled: false },
};

export const Sizes = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
      <hui-segmented size="sm" .options=${PERIODS} label="sm"></hui-segmented>
      <hui-segmented size="md" .options=${PERIODS} label="md"></hui-segmented>
      <hui-segmented size="lg" .options=${PERIODS} label="lg"></hui-segmented>
    </div>
  `,
};

/** Lựa chọn khai báo bằng <option> con, có icon; block chia đều */
export const SlottedWithIcons = {
  render: () => html`
    <div style="max-width:420px">
      <hui-segmented id="seg-slot" block label="Chế độ xem">
        <option value="list" icon="menu">Danh sách</option>
        <option value="grid" icon="grid" selected>Lưới</option>
        <option value="table" icon="table">Bảng</option>
      </hui-segmented>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#seg-slot');
    await waitFor(() => expect(items(el).length).toBe(3));
    expect(el.value).toBe('grid');
    expect(items(el)[1].getAttribute('aria-checked')).toBe('true');
    // <option> mới thêm vào → tự đọc lại
    el.append(Object.assign(document.createElement('option'), { value: 'map', textContent: 'Bản đồ' }));
    await waitFor(() => expect(items(el).length).toBe(4));
  },
};

/** Chỉ icon (aria-label lấy từ title) + lựa chọn bị khóa */
export const IconOnlyAndDisabled = {
  render: () => html`
    <hui-segmented label="Căn lề" .options=${[
      { value: 'left', icon: 'chevron-left', title: 'Căn trái' },
      { value: 'center', icon: 'menu', title: 'Căn giữa' },
      { value: 'right', icon: 'chevron-right', title: 'Căn phải', disabled: true },
    ]}></hui-segmented>
  `,
};

export const States = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:12px;align-items:flex-start">
      <hui-segmented disabled .options=${PERIODS} value="Tháng" label="Disabled"></hui-segmented>
      <hui-segmented readonly .options=${PERIODS} value="Quý" label="Readonly"></hui-segmented>
      <hui-segmented no-animation .options=${PERIODS} label="Không hiệu ứng"></hui-segmented>
    </div>
  `,
};

/** Click + bàn phím APG: mũi tên chọn và vòng lại, bỏ qua lựa chọn disabled, Home/End */
export const Keyboard = {
  render: () => html`
    <hui-segmented id="seg-k" label="Kỳ" .options=${['A', 'B', { value: 'C', disabled: true }, 'D']}></hui-segmented>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#seg-k');
    await waitFor(() => expect(items(el).length).toBe(4));
    expect(el.value).toBe('A'); // tự chọn lựa chọn đầu
    const events = [];
    el.addEventListener('change', (e) => events.push(e.detail.value));

    await userEvent.click(items(el)[1]);
    expect(el.value).toBe('B');
    await userEvent.keyboard('{ArrowRight}');
    expect(el.value).toBe('D'); // bỏ qua C (disabled)
    await userEvent.keyboard('{ArrowRight}');
    expect(el.value).toBe('A'); // vòng lại
    await userEvent.keyboard('{End}');
    expect(el.value).toBe('D');
    await userEvent.keyboard('{Home}');
    expect(el.value).toBe('A');
    expect(events).toEqual(['B', 'D', 'A', 'D', 'A']);
    // roving tabindex: chỉ lựa chọn đang chọn nhận Tab
    expect(items(el).map((b) => b.tabIndex)).toEqual([0, -1, -1, -1]);
    // indicator nằm dưới lựa chọn đang chọn
    const ind = el.shadowRoot.querySelector('[part="indicator"]');
    await waitFor(() => expect(Math.round(parseFloat(ind.style.width))).toBe(items(el)[0].offsetWidth));
  },
};

/** Gửi form native + reset */
export const InForm = {
  render: () => html`
    <form id="seg-form">
      <hui-segmented name="plan" value="pro" .options=${[{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }, { value: 'team', label: 'Team' }]}></hui-segmented>
      <button type="reset">Reset</button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#seg-form');
    const el = form.querySelector('hui-segmented');
    await waitFor(() => expect(items(el).length).toBe(3));
    expect(new FormData(form).get('plan')).toBe('pro');
    await userEvent.click(items(el)[2]);
    expect(new FormData(form).get('plan')).toBe('team');
    form.reset();
    await el.updateComplete;
    expect(el.value).toBe('pro');
    expect(items(el)[1].getAttribute('aria-checked')).toBe('true');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .seg-brand {
        --hui-segmented-bg: var(--hui-primary-light);
        --hui-segmented-radius: 999px;
        --hui-segmented-item-radius: 999px;
        --hui-segmented-indicator-bg: var(--hui-primary);
        --hui-segmented-selected-color: var(--hui-text-inverse);
        --hui-segmented-color: var(--hui-primary);
      }
      .seg-brand::part(item) { font-weight: 600; }
    </style>
    <hui-segmented class="seg-brand" label="Thương hiệu" .options=${['Mới nhất', 'Phổ biến', 'Giá tốt']}></hui-segmented>
  `,
};
