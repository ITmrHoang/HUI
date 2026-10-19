/**
 * Storybook Stories — HUI OTP Input (ô nhập mã xác thực)
 */

import { html, nothing } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const boxes = (el) => [...el.shadowRoot.querySelectorAll('[part~="box"]')];
const active = (el) => el.shadowRoot.activeElement;

/** Dán chuỗi vào ô (ClipboardEvent giả lập) */
function paste(box, text) {
  const data = new DataTransfer();
  data.setData('text/plain', text);
  box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, composed: true, cancelable: true }));
}

export default {
  title: 'Molecules/HuiOtpInput',
  component: 'hui-otp-input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI OTP Input** — Ô nhập mã xác thực (OTP / PIN) gồm N ô riêng (Ant \`Input.OTP\`). Gõ tự nhảy sang ô kế,
Backspace lùi và xóa, phím mũi tên di chuyển, dán cả mã từ ô bất kỳ, \`autocomplete="one-time-code"\` ở ô đầu
(trình duyệt / iOS tự điền mã SMS). Tham gia \`<form>\` / \`hui-form\`: giá trị = chuỗi ghép các ô.

\`\`\`html
<hui-otp-input name="otp" required></hui-otp-input>
<hui-otp-input length="4" mask></hui-otp-input>
<hui-otp-input type="alphanumeric" length="8"></hui-otp-input>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`length\` | number | \`6\` | Số ô (1–12) |
| \`value\` | string | \`''\` | Mã ban đầu (dùng khi reset form) |
| \`type\` | \`numeric\` \\| \`alphanumeric\` | \`numeric\` | Chỉ chữ số (\`inputmode="numeric"\`) hoặc chữ + số; ký tự khác bị lọc |
| \`mask\` | boolean | \`false\` | Che ký tự dạng chấm |
| \`placeholder\` | string | — | Ký tự gợi ý trong ô trống (vd \`○\`) |
| \`label\` | string | "Mã xác thực" | Tên nhóm cho trình đọc màn hình |
| \`status\` | \`''\` \\| \`error\` \\| \`warning\` | — | Viền màu; chuyển sang \`error\` thì cả nhóm rung nhẹ |
| \`size\` | \`sm\` \\| \`md\` \\| \`lg\` | \`md\` | Bỏ trống = theo \`hui-form\` |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng nảy / rung |
| \`name\` / \`required\` / \`disabled\` / \`readonly\` | — | — | Như input native. \`required\` = phải nhập đủ \`length\` ký tự |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`value\` | Chuỗi mã đã lọc, tối đa \`length\` ký tự |
| \`focus()\` | Focus ô trống đầu tiên |
| \`clear()\` | Xóa mã, focus ô đầu |
| \`shake()\` | Rung nhóm ô (vd khi server báo mã sai) |
| \`checkValidity()\` / \`validationMessage\` | Form API — thiếu ký tự → "Vui lòng nhập đủ 6 ký tự" |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` | \`{ value }\` | Mỗi lần người dùng đổi ký tự |
| \`change\` | \`{ value }\` | Khi nhập đủ mã, hoặc rời component với giá trị đã đổi |
| \`hui-complete\` | \`{ value }\` | Người dùng vừa điền đủ mọi ô (gửi mã ngay tại đây) |

### Parts
\`base\` (nhóm \`role="group"\`), \`box\` (từng \`<input>\`, thêm \`box-filled\` khi có ký tự).
Custom state: \`:state(complete)\`, \`:state(user-invalid)\`, \`:state(filled)\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-otp-input-size\` / \`--hui-otp-input-gap\` | Cạnh mỗi ô / khoảng cách |
| \`--hui-otp-input-radius\` / \`--hui-otp-input-font-size\` | Bo góc / cỡ chữ |
| \`--hui-otp-input-bg\` / \`--hui-otp-input-color\` | Nền / chữ |
| \`--hui-otp-input-border-color\` / \`--hui-otp-input-filled-border-color\` | Viền ô trống / đã điền |
| \`--hui-otp-input-focus-border-color\` / \`--hui-otp-input-focus-shadow\` | Viền + vòng sáng khi focus |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| Ký tự hợp lệ | Điền ô hiện tại, nhảy sang ô kế |
| \`Backspace\` | Ô có ký tự → xóa; ô trống → lùi về ô trước và xóa |
| \`Delete\` | Xóa ô hiện tại |
| \`←\` / \`→\` | Sang ô trước / sau (RTL đảo chiều) |
| \`Home\` / \`End\` | Ô đầu / ô trống đầu tiên |
| \`Ctrl/⌘ + V\` | Dán cả mã (đủ dài thì điền từ ô đầu, dù đang ở ô nào) |

Mỗi ô có \`aria-label\` "Ký tự 1/6"; nhóm có \`role="group"\` + nhãn. Không cho bỏ trống ô ở giữa:
focus ô phía sau ô trống đầu tiên sẽ được đưa về ô trống đó.
        `,
      },
    },
  },
  argTypes: {
    length: { control: { type: 'number', min: 1, max: 12 } },
    type: { control: 'select', options: ['numeric', 'alphanumeric'] },
    mask: { control: 'boolean' },
    placeholder: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    status: { control: 'select', options: ['', 'error', 'warning'] },
    disabled: { control: 'boolean' },
    noAnimation: { control: 'boolean' },
  },
};

export const Default = {
  args: { length: 6, type: 'numeric', mask: false, placeholder: '', size: 'md', status: '', disabled: false, noAnimation: false },
  render: (args) => html`
    <hui-otp-input
      id="otp-default"
      length=${args.length}
      type=${args.type}
      ?mask=${args.mask}
      placeholder=${args.placeholder || nothing}
      size=${args.size}
      status=${args.status || nothing}
      ?disabled=${args.disabled}
      ?no-animation=${args.noAnimation}
    ></hui-otp-input>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#otp-default');
    const list = boxes(el);
    await expect(list.length).toBe(6);
    await expect(list[0].getAttribute('autocomplete')).toBe('one-time-code');
    await expect(list[1].getAttribute('autocomplete')).toBe('off');
    await expect(list[0].getAttribute('inputmode')).toBe('numeric');
    await expect(list[2].getAttribute('aria-label')).toBe('Ký tự 3/6');

    const inputs = [];
    const completes = [];
    el.addEventListener('input', (e) => inputs.push(e.detail.value));
    el.addEventListener('hui-complete', (e) => completes.push(e.detail.value));

    // Gõ: tự nhảy ô, ký tự không hợp lệ bị bỏ qua
    list[0].focus();
    await userEvent.keyboard('12a3');
    await expect(el.value).toBe('123');
    await expect(active(el)).toBe(list[3]);
    await expect(inputs).toEqual(['1', '12', '123']);

    // Backspace trên ô trống → lùi về ô trước và xóa
    await userEvent.keyboard('{Backspace}');
    await expect(el.value).toBe('12');
    await expect(active(el)).toBe(list[2]);

    // Mũi tên di chuyển
    await userEvent.keyboard('{ArrowLeft}');
    await expect(active(el)).toBe(list[1]);
    await userEvent.keyboard('{ArrowRight}');
    await expect(active(el)).toBe(list[2]);

    await userEvent.keyboard('3456');
    await expect(el.value).toBe('123456');
    await expect(completes).toEqual(['123456']);
    await expect(el.matches(':state(complete)')).toBe(true);
    await el.updateComplete;
    await expect(list[5].getAttribute('part')).toBe('box box-filled');

    // Backspace trên ô có ký tự → xóa tại chỗ
    await userEvent.keyboard('{Backspace}');
    await expect(el.value).toBe('12345');
    await expect(active(el)).toBe(list[5]);
    list[5].blur();
  },
};

/** Dán cả mã từ ô bất kỳ — mã đủ dài thì điền từ ô đầu; ký tự lạ (khoảng trắng, gạch) bị lọc */
export const Paste = {
  render: () => html`<hui-otp-input id="otp-paste"></hui-otp-input>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#otp-paste');
    const list = boxes(el);
    let complete = null;
    el.addEventListener('hui-complete', (e) => { complete = e.detail.value; });

    paste(list[3], '987-654');
    await expect(el.value).toBe('987654');
    await expect(complete).toBe('987654');
    await el.updateComplete;
    await expect(list.map((b) => b.value)).toEqual(['9', '8', '7', '6', '5', '4']);

    // Mã ngắn hơn → điền từ ô đang đứng
    el.value = '';
    await el.updateComplete;
    paste(list[0], '12');
    await expect(el.value).toBe('12');
    await expect(active(el)).toBe(list[2]);

    // Autofill SMS: cả mã rơi vào ô đầu qua sự kiện input
    el.value = '';
    await el.updateComplete;
    list[0].value = '246810';
    list[0].dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await expect(el.value).toBe('246810');
    list.forEach((b) => b.blur());
  },
};

/** Gán value bằng code + form: required = phải đủ length ký tự */
export const FormValidation = {
  render: () => html`
    <form id="otp-form" style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start;">
      <hui-otp-input id="otp-req" name="code" length="4" required></hui-otp-input>
      <hui-button type="submit">Xác nhận</hui-button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#otp-form');
    const el = canvasElement.querySelector('#otp-req');
    await expect(el.checkValidity()).toBe(false);
    await expect(el.validationMessage).toBe('Vui lòng nhập đủ 4 ký tự');
    el.value = '12';
    await expect(el.validity.tooShort).toBe(true);
    el.value = '12x34'; // lọc ký tự lạ, cắt theo length
    await expect(el.value).toBe('1234');
    await expect(el.checkValidity()).toBe(true);
    await expect(new FormData(form).get('code')).toBe('1234');
    await el.updateComplete;
    await expect(boxes(el).map((b) => b.value)).toEqual(['1', '2', '3', '4']);
    form.reset();
    await expect(el.value).toBe('');
  },
};

/** Chữ + số, che ký tự, placeholder */
export const Variants = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <hui-otp-input id="otp-alpha" type="alphanumeric" length="8" placeholder="•"></hui-otp-input>
      <hui-otp-input id="otp-mask" length="4" mask value="1234"></hui-otp-input>
      <hui-otp-input length="6" placeholder="○"></hui-otp-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const alpha = canvasElement.querySelector('#otp-alpha');
    await expect(boxes(alpha)[0].getAttribute('inputmode')).toBe('text');
    alpha.value = 'ab-12 CD';
    await expect(alpha.value).toBe('ab12CD');
    const mask = canvasElement.querySelector('#otp-mask');
    await expect(boxes(mask)[0].type).toBe('password');
    await expect(mask.value).toBe('1234');
  },
};

export const Sizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <hui-otp-input size="sm" length="4"></hui-otp-input>
      <hui-otp-input size="md" length="4"></hui-otp-input>
      <hui-otp-input size="lg" length="4"></hui-otp-input>
    </div>
  `,
};

/** Trạng thái: lỗi (rung khi chuyển sang error), cảnh báo, disabled, readonly */
export const States = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; align-items: flex-start;">
      <hui-otp-input id="otp-err" value="123456"></hui-otp-input>
      <hui-button id="otp-err-btn" variant="outline" size="sm"
        @hui-click=${() => { const el = document.getElementById('otp-err'); el.status = el.status === 'error' ? '' : 'error'; }}>
        Bật / tắt status="error"
      </hui-button>
      <hui-otp-input status="warning" value="12"></hui-otp-input>
      <hui-otp-input id="otp-disabled" disabled value="1234" length="4"></hui-otp-input>
      <hui-otp-input id="otp-readonly" readonly value="12" length="4"></hui-otp-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const err = canvasElement.querySelector('#otp-err');
    err.status = 'error';
    await err.updateComplete;
    await expect(boxes(err)[0].getAttribute('aria-invalid')).toBe('true');
    const disabled = canvasElement.querySelector('#otp-disabled');
    await expect(boxes(disabled).every((b) => b.disabled)).toBe(true);
    const ro = canvasElement.querySelector('#otp-readonly');
    boxes(ro)[1].focus();
    await userEvent.keyboard('{Backspace}9');
    await expect(ro.value).toBe('12');
    boxes(ro)[1].blur();
  },
};

/** Kịch bản thật: nhập đủ → giả lập kiểm tra mã → sai thì rung + xóa */
export const VerifyFlow = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start;">
      <p style="margin: 0; color: var(--hui-text-secondary); font-size: 14px;">Mã đúng là <b>246810</b></p>
      <hui-otp-input id="otp-flow"
        @hui-complete=${async (e) => {
          const el = e.currentTarget;
          const out = document.getElementById('otp-flow-out');
          out.textContent = 'Đang kiểm tra...';
          await new Promise((r) => setTimeout(r, 50));
          if (e.detail.value === '246810') {
            el.status = '';
            out.textContent = 'Mã chính xác ✓';
          } else {
            el.status = 'error';
            out.textContent = 'Mã không đúng, vui lòng thử lại';
            setTimeout(() => { el.clear(); el.status = ''; }, 600);
          }
        }}></hui-otp-input>
      <span id="otp-flow-out" role="status" style="font-size: 14px; color: var(--hui-text-secondary);"></span>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#otp-flow');
    const out = canvasElement.querySelector('#otp-flow-out');
    paste(boxes(el)[0], '111111');
    await waitFor(() => expect(out.textContent).toBe('Mã không đúng, vui lòng thử lại'));
    await expect(el.status).toBe('error');
    await waitFor(() => expect(el.value).toBe(''), { timeout: 2000 });
    paste(boxes(el)[0], '246810');
    await waitFor(() => expect(out.textContent).toBe('Mã chính xác ✓'));
    boxes(el).forEach((b) => b.blur());
  },
};

/** Override từ ngoài: biến CSS + ::part(box | box-filled) + :state(complete) */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .otp-brand {
        --hui-otp-input-size: 3.25rem;
        --hui-otp-input-gap: 12px;
        --hui-otp-input-radius: 999px;
        --hui-otp-input-bg: var(--hui-fill-tertiary);
        --hui-otp-input-border-color: transparent;
        --hui-otp-input-focus-border-color: var(--hui-success);
        --hui-otp-input-focus-shadow: 0 0 0 4px var(--hui-success-light);
      }
      hui-otp-input.underline::part(box) {
        border-width: 0 0 2px;
        border-radius: 0;
        background: transparent;
      }
      hui-otp-input.underline::part(box-filled) { border-color: var(--hui-primary); color: var(--hui-primary); }
      hui-otp-input.underline:state(complete)::part(box) { border-color: var(--hui-success); color: var(--hui-success); }
    </style>
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <hui-otp-input class="otp-brand" length="4" value="12"></hui-otp-input>
      <hui-otp-input class="underline" value="1234"></hui-otp-input>
    </div>
  `,
};
