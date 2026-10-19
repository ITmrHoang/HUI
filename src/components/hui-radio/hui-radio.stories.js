/**
 * Storybook Stories — HUI Radio + Radio Group
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

const CITIES = ['Hà Nội', 'Đà Nẵng', 'TP.HCM'];

/** Gửi phím lên phần tử (composed để đi xuyên shadow như phím thật) */
const press = (el, key) => el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));

export default {
  title: 'Components/HuiRadio',
  component: 'hui-radio-group',
  subcomponents: { HuiRadio: 'hui-radio' },
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Radio Group** — Chọn một trong nhiều lựa chọn (Ant Radio.Group + MUI RadioGroup). Tham gia \`<form>\` native.

\`\`\`html
<!-- Radio con -->
<hui-radio-group name="size" value="m">
  <hui-radio value="s">Nhỏ</hui-radio>
  <hui-radio value="m">Vừa</hui-radio>
  <hui-radio value="l" disabled>Lớn</hui-radio>
</hui-radio-group>

<!-- Hoặc options qua property, dạng nút liền -->
<hui-radio-group id="g" option-type="button" button-style="solid"></hui-radio-group>
<script>
  g.options = ['Ngày', 'Tuần', { label: 'Tháng', value: 'month', disabled: true }];
  g.addEventListener('change', (e) => console.log(e.detail.value));
</script>
\`\`\`

### Attributes — hui-radio-group
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | string | \`''\` | Giá trị đang chọn (attribute = giá trị ban đầu khi reset form) |
| \`name\` | string | — | Tên field khi gửi form |
| \`direction\` | \`horizontal \\| vertical\` | \`horizontal\` | Hướng xếp (dạng mặc định) |
| \`option-type\` | \`default \\| button\` | \`default\` | \`button\`: các nút liền nhau (segmented) |
| \`button-style\` | \`outline \\| solid\` | \`outline\` | Kiểu nút đang chọn |
| \`size\` | \`sm \\| md \\| lg\` | theo \`hui-form\` / \`md\` | Kích thước |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa cả nhóm |
| \`required\` | boolean | \`false\` | Bắt buộc chọn (\`checkValidity()\`) |
| \`readonly\` | boolean | \`false\` | Không đổi được lựa chọn (vẫn focus được) |

### Attributes — hui-radio
| Attribute | Type | Mô tả |
|-----------|------|-------|
| \`value\` | string | Giá trị của lựa chọn |
| \`label\` | string | Nhãn (hoặc dùng slot mặc định) |
| \`checked\` | boolean | Được chọn (nhóm tự quản lý; đặt sẵn = giá trị ban đầu nếu nhóm chưa có value) |
| \`disabled\` | boolean | Vô hiệu hóa lựa chọn này |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`options\` | \`Array<string \\| {label, value, disabled}>\` | Danh sách lựa chọn — có options thì radio con bị bỏ qua |
| \`value\` | string | Giá trị hiện tại |
| \`form\` / \`validity\` / \`checkValidity()\` / \`reportValidity()\` | — | Form API (ElementInternals) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` | \`{ value }\` | Người dùng chọn (phát trước change) |
| \`change\` | \`{ value }\` | Người dùng chọn lựa chọn khác |

### Slots · Parts
- **hui-radio-group**: slot mặc định = các \`<hui-radio>\` · part \`base\`
- **hui-radio**: slot mặc định = nhãn · parts \`base\`, \`control\` (vòng tròn), \`dot\`, \`label\` · state \`:state(checked)\`

### Bàn phím (WAI-ARIA APG Radio Group)
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Vào nhóm tại lựa chọn đang chọn (chưa chọn: lựa chọn bật đầu tiên) — cả nhóm là 1 tab stop |
| \`↓\` \`→\` | Chọn + focus lựa chọn kế tiếp (bỏ qua disabled, cuối → đầu) |
| \`↑\` \`←\` | Chọn + focus lựa chọn trước (đầu → cuối) |
| \`Space\` | Chọn lựa chọn đang focus |

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-radio-size\` / \`--hui-radio-gap\` | Đường kính vòng tròn / khoảng cách tới nhãn |
| \`--hui-radio-color\` | Màu khi được chọn |
| \`--hui-radio-border-color\` / \`--hui-radio-bg\` | Viền / nền |
| \`--hui-radio-label-color\` / \`--hui-radio-font-size\` | Chữ nhãn |
| \`--hui-radio-button-height\` / \`--hui-radio-button-padding-x\` / \`--hui-radio-button-radius\` | Dạng nút |
| \`--hui-radio-solid-color\` | Chữ nút đang chọn (solid) |
| \`--hui-radio-focus-ring\` | Vòng focus bàn phím |
| \`--hui-radio-group-gap\` / \`--hui-radio-group-row-gap\` | Khoảng cách giữa các lựa chọn |
        `,
      },
    },
  },

  argTypes: {
    'option-type': { control: 'inline-radio', options: ['default', 'button'] },
    'button-style': { control: 'inline-radio', options: ['outline', 'solid'] },
    direction: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
};

export const Default = {
  args: { 'option-type': 'default', 'button-style': 'outline', direction: 'horizontal', size: 'md', disabled: false },
  render: (args) => html`
    <hui-radio-group
      name="plan"
      value="pro"
      aria-label="Gói dịch vụ"
      option-type=${args['option-type']}
      button-style=${args['button-style']}
      direction=${args.direction}
      size=${args.size}
      ?disabled=${args.disabled}
    >
      <hui-radio value="free">Miễn phí</hui-radio>
      <hui-radio value="pro">Pro</hui-radio>
      <hui-radio value="team">Team</hui-radio>
      <hui-radio value="enterprise" disabled>Enterprise</hui-radio>
    </hui-radio-group>
  `,
};

/** Options qua property — string[] hoặc { label, value, disabled }[] */
export const WithOptions = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <hui-radio-group aria-label="Thành phố" .options=${CITIES} value="Đà Nẵng"></hui-radio-group>
      <hui-radio-group aria-label="Trái cây" .options=${FRUITS} value="apple"></hui-radio-group>
    </div>
  `,
};

export const Vertical = {
  render: () => html`
    <hui-radio-group aria-label="Trái cây" direction="vertical" .options=${FRUITS} value="orange"></hui-radio-group>
  `,
};

/** option-type="button": nút liền nhau. button-style="solid": nút đang chọn tô nền */
export const ButtonStyle = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
      <hui-radio-group aria-label="Outline" option-type="button" .options=${CITIES} value="Hà Nội"></hui-radio-group>
      <hui-radio-group aria-label="Solid" option-type="button" button-style="solid" .options=${CITIES} value="Đà Nẵng"></hui-radio-group>
      <hui-radio-group aria-label="Có disabled" option-type="button" .options=${FRUITS} value="grape"></hui-radio-group>
      <hui-radio-group aria-label="Small" option-type="button" size="sm" .options=${CITIES} value="TP.HCM"></hui-radio-group>
      <hui-radio-group aria-label="Large" option-type="button" button-style="solid" size="lg" .options=${CITIES} value="Hà Nội"></hui-radio-group>
    </div>
  `,
};

export const Sizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      ${['sm', 'md', 'lg'].map((s) => html`<hui-radio-group aria-label=${s} size=${s} .options=${CITIES} value="Hà Nội"></hui-radio-group>`)}
    </div>
  `,
};

export const Disabled = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <hui-radio-group aria-label="Cả nhóm disabled" disabled .options=${CITIES} value="Hà Nội"></hui-radio-group>
      <hui-radio-group aria-label="Nút disabled" disabled option-type="button" .options=${CITIES} value="Đà Nẵng"></hui-radio-group>
    </div>
  `,
};

/** Bàn phím theo APG: mũi tên chọn + focus, bỏ qua lựa chọn disabled, đi vòng; roving tabindex */
export const Keyboard = {
  render: () => html`<hui-radio-group id="kb-group" aria-label="Trái cây" .options=${FRUITS} value="orange"></hui-radio-group>`,
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('#kb-group');
    await waitFor(() => expect(group.shadowRoot.querySelectorAll('hui-radio').length).toBe(4));
    const radios = [...group.shadowRoot.querySelectorAll('hui-radio')];
    const changes = [];
    group.addEventListener('change', (e) => changes.push(e.detail.value));

    // Roving tabindex: chỉ radio đang chọn là tab stop
    await expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1]);
    await expect(radios[1].getAttribute('role')).toBe('radio');
    await expect(radios[1].getAttribute('aria-checked')).toBe('true');

    radios[1].focus();
    press(radios[1], 'ArrowRight'); // bỏ qua "Xoài" (disabled) → Nho
    await expect(group.value).toBe('grape');
    await expect(group.shadowRoot.activeElement).toBe(radios[3]);
    press(radios[3], 'ArrowDown'); // cuối → vòng về đầu
    await expect(group.value).toBe('apple');
    press(radios[0], 'ArrowUp'); // đầu → vòng về cuối
    await expect(group.value).toBe('grape');
    press(radios[3], 'ArrowLeft');
    await expect(group.value).toBe('orange');
    await expect(changes).toEqual(['grape', 'apple', 'grape', 'orange']);
    await waitFor(() => expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1]));

    // Click radio con / radio disabled
    radios[0].click();
    await expect(group.value).toBe('apple');
    radios[2].click();
    await expect(group.value).toBe('apple');
  },
};

/** Tham gia <form>: FormData, reset, required */
export const InForm = {
  render: () => html`
    <form id="radio-form" style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;"
      @submit=${(e) => {
        e.preventDefault();
        e.target.querySelector('output').textContent = JSON.stringify(Object.fromEntries(new FormData(e.target)));
      }}>
      <hui-radio-group name="ship" value="fast" aria-label="Giao hàng">
        <hui-radio value="std">Tiêu chuẩn</hui-radio>
        <hui-radio value="fast">Nhanh</hui-radio>
        <hui-radio value="now">Hỏa tốc</hui-radio>
      </hui-radio-group>
      <hui-radio-group name="pay" required option-type="button" .options=${['COD', 'Thẻ', 'Ví']} aria-label="Thanh toán"></hui-radio-group>
      <div style="display: flex; gap: 8px;">
        <button type="submit">Gửi</button>
        <button type="reset">Đặt lại</button>
      </div>
      <output>{}</output>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#radio-form');
    const [ship, pay] = form.querySelectorAll('hui-radio-group');
    await waitFor(() => expect(pay.shadowRoot.querySelectorAll('hui-radio').length).toBe(3));
    await expect(new FormData(form).get('ship')).toBe('fast');
    await expect(pay.checkValidity()).toBe(false);
    pay.shadowRoot.querySelectorAll('hui-radio')[1].click();
    await expect(pay.checkValidity()).toBe(true);
    ship.querySelector('hui-radio[value="now"]').click();
    const data = new FormData(form);
    await expect(data.get('ship')).toBe('now');
    await expect(data.get('pay')).toBe('Thẻ');
    form.reset();
    await expect(ship.value).toBe('fast');
    await expect(pay.value).toBe('');
  },
};

/** Override từ ngoài: biến CSS trên thẻ cha / chính thẻ + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .radio-brand {
        --hui-radio-color: var(--hui-success);
        --hui-radio-size: 20px;
        --hui-radio-group-gap: 24px;
      }
      hui-radio-group.pill {
        --hui-radio-button-radius: 999px;
        --hui-radio-button-padding-x: 20px;
        --hui-radio-color: var(--hui-warning);
      }
      hui-radio.fancy::part(label) { font-style: italic; }
      hui-radio.fancy::part(control) { border-width: 2px; }
    </style>
    <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
      <div class="radio-brand">
        <hui-radio-group aria-label="Biến trên thẻ cha" .options=${CITIES} value="Hà Nội"></hui-radio-group>
      </div>
      <hui-radio-group class="pill" aria-label="Pill" option-type="button" button-style="solid" .options=${CITIES} value="TP.HCM"></hui-radio-group>
      <hui-radio-group aria-label="Part" value="b">
        <hui-radio class="fancy" value="a">::part(label)</hui-radio>
        <hui-radio class="fancy" value="b">::part(control)</hui-radio>
      </hui-radio-group>
    </div>
  `,
};
