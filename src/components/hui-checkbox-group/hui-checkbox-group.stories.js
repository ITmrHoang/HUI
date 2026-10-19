/**
 * Storybook Stories — HUI Checkbox Group
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

const FRUITS = [
  { label: 'Táo', value: 'apple' },
  { label: 'Cam', value: 'orange' },
  { label: 'Xoài (hết hàng)', value: 'mango', disabled: true },
  { label: 'Nho', value: 'grape' },
];
const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6'];

/** Bấm vào ô checkbox thật bên trong (giống người dùng click) */
const toggle = (box) => box.shadowRoot.querySelector('input').click();

export default {
  title: 'Components/HuiCheckboxGroup',
  component: 'hui-checkbox-group',
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Checkbox Group** — Chọn nhiều giá trị (Ant Checkbox.Group). Giá trị là mảng, tham gia \`<form>\` native:
mỗi giá trị được thêm 1 entry cùng \`name\` → \`new FormData(form).getAll(name)\`.

\`\`\`html
<hui-checkbox-group name="days" value='["T2","T4"]'>
  <hui-checkbox value="T2">Thứ 2</hui-checkbox>
  <hui-checkbox value="T3">Thứ 3</hui-checkbox>
  <hui-checkbox value="T4">Thứ 4</hui-checkbox>
</hui-checkbox-group>

<!-- Hoặc options qua property -->
<script>
  group.options = ['A', 'B', { label: 'C', value: 'c', disabled: true }];
  group.addEventListener('change', (e) => console.log(e.detail.value)); // ['A', 'B']
</script>
\`\`\`
Checkbox con không cần (và không nên) đặt \`name\` — nhóm gửi giá trị thay cho chúng.

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | JSON / \`a,b\` | \`[]\` | Giá trị ban đầu (khi reset form) |
| \`name\` | string | — | Tên field khi gửi form |
| \`direction\` | \`horizontal \\| vertical\` | \`horizontal\` | Hướng xếp |
| \`size\` | \`sm \\| md \\| lg\` | theo \`hui-form\` / \`md\` | Kích thước checkbox con (con tự đặt size thì giữ) |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa cả nhóm |
| \`required\` | boolean | \`false\` | Phải chọn ít nhất 1 |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`value\` | \`string[]\` | Mảng giá trị đang chọn (luôn trả về bản sao) |
| \`options\` | \`Array<string \\| {label, value, disabled}>\` | Danh sách lựa chọn — có options thì checkbox con bị bỏ qua |
| \`formValue()\` | \`FormData \\| null\` | Giá trị gửi form |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` | \`{ value }\` | Người dùng bật/tắt 1 lựa chọn (phát trước change) |
| \`change\` | \`{ value }\` | Người dùng bật/tắt 1 lựa chọn |
Sự kiện \`change\`/\`input\` của checkbox con bị chặn lại — chỉ nhóm phát.

### Slots · Parts
Slot mặc định = các \`<hui-checkbox>\` · part \`base\` · state \`:state(user-invalid)\`, \`:state(filled)\`.

### Bàn phím
Mỗi checkbox là 1 tab stop riêng (giống native) · \`Space\` bật/tắt.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-checkbox-group-gap\` | Khoảng cách giữa các lựa chọn |
| \`--hui-checkbox-group-row-gap\` | Khoảng cách dòng |
| \`--hui-checkbox-*\` | Biến của hui-checkbox (đặt trên nhóm là áp cho mọi ô) |
        `,
      },
    },
  },

  argTypes: {
    direction: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
};

export const Default = {
  args: { direction: 'horizontal', size: 'md', disabled: false },
  render: (args) => html`
    <hui-checkbox-group
      aria-label="Trái cây"
      .options=${FRUITS}
      .value=${['orange']}
      direction=${args.direction}
      size=${args.size}
      ?disabled=${args.disabled}
      @change=${(e) => console.log('[hui-checkbox-group] change', e.detail.value)}
    ></hui-checkbox-group>
  `,
};

/** Checkbox con thay cho options */
export const WithChildren = {
  render: () => html`
    <hui-checkbox-group aria-label="Ngày làm việc" value='["T2","T4"]'>
      <hui-checkbox value="T2">Thứ 2</hui-checkbox>
      <hui-checkbox value="T3">Thứ 3</hui-checkbox>
      <hui-checkbox value="T4">Thứ 4</hui-checkbox>
      <hui-checkbox value="T5" disabled>Thứ 5</hui-checkbox>
    </hui-checkbox-group>
  `,
};

export const Vertical = {
  render: () => html`<hui-checkbox-group aria-label="Trái cây" direction="vertical" .options=${FRUITS} .value=${['apple', 'grape']}></hui-checkbox-group>`,
};

export const Sizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${['sm', 'md', 'lg'].map((s) => html`<hui-checkbox-group aria-label=${s} size=${s} .options=${DAYS} .value=${['T2']}></hui-checkbox-group>`)}
    </div>
  `,
};

export const Disabled = {
  render: () => html`<hui-checkbox-group aria-label="Disabled" disabled .options=${FRUITS} .value=${['apple']}></hui-checkbox-group>`,
};

/**
 * Mẫu "Chọn tất cả": hui-checkbox ở trên dùng `indeterminate` khi chỉ chọn một phần.
 * Bấm "Chọn tất cả" → chọn / bỏ mọi lựa chọn bật; đổi nhóm → cập nhật lại trạng thái ô tổng.
 */
export const CheckAll = {
  render: () => {
    const enabledValues = FRUITS.filter((o) => !o.disabled).map((o) => o.value);
    const syncAll = (root) => {
      const all = root.querySelector('.check-all');
      const group = root.querySelector('hui-checkbox-group');
      const count = group.value.filter((v) => enabledValues.includes(v)).length;
      all.checked = count === enabledValues.length;
      all.indeterminate = count > 0 && count < enabledValues.length;
    };
    return html`
      <div class="check-all-demo" style="display: flex; flex-direction: column; gap: 8px;">
        <hui-checkbox
          class="check-all"
          indeterminate
          @change=${(e) => {
            const root = e.currentTarget.closest('.check-all-demo');
            root.querySelector('hui-checkbox-group').value = e.detail.checked ? enabledValues : [];
            syncAll(root);
          }}
        >Chọn tất cả</hui-checkbox>
        <hr style="width: 100%; border: 0; border-top: 1px solid var(--hui-border); margin: 0;" />
        <hui-checkbox-group
          aria-label="Trái cây"
          .options=${FRUITS}
          .value=${['apple']}
          @change=${(e) => syncAll(e.currentTarget.closest('.check-all-demo'))}
        ></hui-checkbox-group>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    const all = canvasElement.querySelector('.check-all');
    const group = canvasElement.querySelector('hui-checkbox-group');
    await waitFor(() => expect(group.shadowRoot.querySelectorAll('hui-checkbox').length).toBe(4));
    const boxes = [...group.shadowRoot.querySelectorAll('hui-checkbox')];

    toggle(all); // indeterminate → chọn tất cả (trừ disabled)
    await expect(group.value).toEqual(['apple', 'orange', 'grape']);
    await expect(all.indeterminate).toBe(false);
    await waitFor(() => expect(boxes.map((b) => b.checked)).toEqual([true, true, false, true]));

    toggle(boxes[1]); // bỏ "Cam" → ô tổng về indeterminate
    await expect(group.value).toEqual(['apple', 'grape']);
    await expect(all.indeterminate).toBe(true);

    toggle(all); // indeterminate → bấm = chọn tất cả lại
    await expect(group.value).toEqual(['apple', 'orange', 'grape']);
    toggle(all); // bỏ tất cả
    await expect(group.value).toEqual([]);
    await expect(all.checked).toBe(false);
  },
};

/** Form native: mỗi giá trị 1 entry cùng name; required; reset về attribute value */
export const InForm = {
  render: () => html`
    <form id="cbg-form" style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;"
      @submit=${(e) => {
        e.preventDefault();
        e.target.querySelector('output').textContent = JSON.stringify(new FormData(e.target).getAll('days'));
      }}>
      <hui-checkbox-group name="days" required value="T2,T3" aria-label="Ngày" .options=${DAYS}></hui-checkbox-group>
      <div style="display: flex; gap: 8px;">
        <button type="submit">Gửi</button>
        <button type="reset">Đặt lại</button>
      </div>
      <output>[]</output>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#cbg-form');
    const group = form.querySelector('hui-checkbox-group');
    await waitFor(() => expect(group.shadowRoot.querySelectorAll('hui-checkbox').length).toBe(5));
    const boxes = [...group.shadowRoot.querySelectorAll('hui-checkbox')];
    const events = [];
    group.addEventListener('change', (e) => events.push(e.detail.value));

    await expect(new FormData(form).getAll('days')).toEqual(['T2', 'T3']);
    toggle(boxes[4]);
    await expect(new FormData(form).getAll('days')).toEqual(['T2', 'T3', 'T6']);
    await expect(events).toEqual([['T2', 'T3', 'T6']]);

    group.value = [];
    await expect(new FormData(form).getAll('days')).toEqual([]);
    await expect(group.checkValidity()).toBe(false);
    form.reset();
    await expect(group.value).toEqual(['T2', 'T3']);
    await expect(group.checkValidity()).toBe(true);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .cbg-round { --hui-checkbox-radius: 50%; --hui-checkbox-group-gap: 24px; }
      hui-checkbox-group.brand { --hui-checkbox-checked-bg: var(--hui-success); }
      hui-checkbox-group.boxed::part(base) {
        padding: 8px 12px;
        border: 1px dashed var(--hui-border);
        border-radius: var(--hui-radius);
      }
    </style>
    <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
      <div class="cbg-round"><hui-checkbox-group aria-label="Tròn" .options=${DAYS} .value=${['T3']}></hui-checkbox-group></div>
      <hui-checkbox-group class="brand" aria-label="Màu riêng" .options=${DAYS} .value=${['T2', 'T5']}></hui-checkbox-group>
      <hui-checkbox-group class="boxed" aria-label="::part(base)" .options=${DAYS}></hui-checkbox-group>
    </div>
  `,
};
