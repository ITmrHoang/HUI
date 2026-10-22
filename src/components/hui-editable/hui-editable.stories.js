/**
 * Storybook Stories — HUI Editable
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

const view = (el) => el.shadowRoot.querySelector('[part="view"]');
const control = (el) => el.shadowRoot.querySelector('[part="control"]');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Xóa chữ trong ô nhập nằm trong shadow DOM (userEvent.clear không focus được xuyên shadow root) */
async function clearInput(input) {
  input.focus();
  await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
}

export default {
  title: 'Atoms/HuiEditable',
  component: 'hui-editable',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Editable** — Sửa tại chỗ: bấm (hoặc Enter / F2) vào chữ → ô nhập; **Enter** lưu, **Esc** hủy, rời ô thì lưu (\`blur-action\`).
Kế thừa font của phần tử cha → dùng được trong tiêu đề, ô bảng, thẻ Kanban.
Lưu **bất đồng bộ**: listener \`hui-save\` gọi \`e.detail.waitUntil(promise)\` → hiện trạng thái đang lưu (giá trị mới hiển thị ngay);
promise lỗi / trả về \`false\`, hoặc \`preventDefault()\` → **khôi phục giá trị cũ** + trạng thái lỗi.

\`\`\`html
<h2><hui-editable label="Tên dự án" value="Website bán hàng"></hui-editable></h2>
<script>
  el.addEventListener('hui-save', (e) => e.detail.waitUntil(api.rename(e.detail.value)));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | string | \`''\` | Giá trị |
| \`type\` | string | \`text\` | \`text\` \\| \`textarea\` \\| \`select\` \\| \`number\` \\| \`email\` \\| \`url\` \\| \`tel\` \\| \`date\` \\| \`time\` |
| \`options\` | array | — | Lựa chọn của select: \`["A","B"]\` hoặc \`[{ value, label }]\` |
| \`placeholder\` | string | "Nhấn để sửa" | Hiện khi rỗng (và trong ô nhập) |
| \`label\` | string | — | Tên trường cho trình đọc màn hình |
| \`blur-action\` | string | \`save\` | \`save\` \\| \`cancel\` \\| \`none\` khi rời ô nhập |
| \`required\` | boolean | \`false\` | Không cho lưu rỗng (báo lỗi, giữ ô nhập) |
| \`maxlength\` | number | — | Số ký tự tối đa |
| \`rows\` | number | \`3\` | Số dòng textarea |
| \`format\` | string | — | Định dạng hiển thị (như data-format): \`currency\`, \`number\`, \`date\`, \`percent\`… |
| \`no-icon\` | boolean | \`false\` | Ẩn icon bút chì |
| \`disabled\` | boolean | \`false\` | Không cho sửa |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`formatFn\` | \`(value) => string\` — định dạng hiển thị tùy ý |
| \`edit()\` / \`save()\` / \`cancel()\` | Điều khiển bằng code (\`save()\` trả \`Promise<boolean>\`) |
| \`editing\` / \`saving\` / \`displayValue\` | Chỉ đọc |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-edit-start\` | \`{ value }\` | Vào chế độ sửa |
| \`hui-save\` | \`{ value, oldValue, waitUntil(promise) }\` | Lưu giá trị mới (chỉ khi khác cũ). Cancelable: chặn = từ chối |
| \`hui-saved\` | \`{ value, oldValue }\` | Lưu xong (mọi promise thành công) |
| \`hui-save-error\` | \`{ value, oldValue, error }\` | Bị từ chối / promise lỗi → đã khôi phục |
| \`hui-cancel\` | \`{ value }\` | Hủy sửa |

### Parts / States
Parts: \`view\` (role="button"), \`text\`, \`icon\`, \`spinner\`, \`editor\`, \`control\`, \`message\`.
States: \`:state(editing)\`, \`:state(saving)\`, \`:state(error)\`, \`:state(empty)\`.

### CSS Variables
\`--hui-editable-hover-bg\`, \`--hui-editable-radius\`, \`--hui-editable-padding\`, \`--hui-editable-placeholder-color\`, \`--hui-editable-border-color\`,
\`--hui-editable-focus-color\`, \`--hui-editable-error-color\`, \`--hui-editable-icon-color\`, \`--hui-editable-min-width\`.

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Focus chữ (role="button") |
| \`Enter\` / \`Space\` / \`F2\` | Vào chế độ sửa |
| \`Enter\` | Lưu (textarea: \`Ctrl/⌘ + Enter\`) |
| \`Esc\` | Hủy (không làm đóng modal bao ngoài) |
        `,
      },
    },
  },
  argTypes: {
    type: { control: 'select', options: ['text', 'textarea', 'select', 'number', 'email', 'date'] },
    blurAction: { control: 'inline-radio', options: ['save', 'cancel', 'none'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <p style="font-size: 20px; font-weight: 600; margin: 0;">
      <hui-editable label="Tên dự án" value=${args.value} type=${args.type} blur-action=${args.blurAction}
        ?disabled=${args.disabled} ?required=${args.required}></hui-editable>
    </p>
  `,
  args: { value: 'Website bán hàng', type: 'text', blurAction: 'save', disabled: false, required: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-editable');
    const v = view(el);
    await expect(v.getAttribute('role')).toBe('button');
    await expect(v.getAttribute('aria-label')).toBe('Tên dự án: Website bán hàng');

    // Click → sửa → Enter lưu
    let saved = null;
    el.addEventListener('hui-save', (e) => { saved = e.detail; }, { once: true });
    await userEvent.click(v);
    await expect(el.editing).toBe(true);
    const input = control(el);
    await expect(el.shadowRoot.activeElement).toBe(input);
    await clearInput(input);
    await userEvent.type(input, 'Cửa hàng H-UI{Enter}');
    await expect(saved).toMatchObject({ value: 'Cửa hàng H-UI', oldValue: 'Website bán hàng' });
    await expect(el.value).toBe('Cửa hàng H-UI');
    await expect(el.editing).toBe(false);
    await expect(el.shadowRoot.activeElement).toBe(v); // focus trả về chữ

    // Bàn phím: Enter mở, Esc hủy
    let cancelled = false;
    el.addEventListener('hui-cancel', () => { cancelled = true; }, { once: true });
    await userEvent.keyboard('{Enter}');
    await expect(el.editing).toBe(true);
    await userEvent.type(control(el), ' thử');
    await userEvent.keyboard('{Escape}');
    await expect(cancelled).toBe(true);
    await expect(el.value).toBe('Cửa hàng H-UI');
  },
};

/** textarea (Ctrl/⌘+Enter lưu), select, number định dạng tiền, ngày */
export const Types = {
  render: () => html`
    <div style="display: grid; gap: 16px; max-width: 480px; font-size: 14px;">
      <div><strong>Mô tả:</strong> <hui-editable id="ta" type="textarea" label="Mô tả" value="Dòng 1&#10;Dòng 2"></hui-editable></div>
      <div><strong>Trạng thái:</strong> <hui-editable id="sel" type="select" label="Trạng thái" value="doing"
        .options=${[{ value: 'todo', label: 'Cần làm' }, { value: 'doing', label: 'Đang làm' }, { value: 'done', label: 'Hoàn thành' }]}></hui-editable></div>
      <div><strong>Ngân sách:</strong> <hui-editable id="num" type="number" label="Ngân sách" value="15000000" format="currency"></hui-editable></div>
      <div><strong>Hạn chót:</strong> <hui-editable type="date" label="Hạn chót" value="2026-12-31" format="date"></hui-editable></div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sel = canvasElement.querySelector('#sel');
    await expect(sel.displayValue).toBe('Đang làm');
    await userEvent.click(view(sel));
    await userEvent.selectOptions(control(sel), 'done');
    await waitFor(() => expect(sel.value).toBe('done'));
    await expect(sel.editing).toBe(false);

    const num = canvasElement.querySelector('#num');
    await expect(num.displayValue).toMatch(/15.000.000/);

    const ta = canvasElement.querySelector('#ta');
    await userEvent.click(view(ta));
    await userEvent.type(control(ta), '{Enter}Dòng 3');
    await expect(ta.editing).toBe(true); // Enter thường chỉ xuống dòng
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await expect(ta.value).toBe('Dòng 1\nDòng 2\nDòng 3');
  },
};

/** Lưu bất đồng bộ: waitUntil(promise) → saving; lỗi → khôi phục + error; preventDefault → từ chối ngay */
export const AsyncSave = {
  render: () => html`
    <div style="display: grid; gap: 14px; font-size: 15px;">
      <div>Thành công (400ms): <hui-editable id="ok" label="Email" type="email" value="lan@vidu.vn"
        @hui-save=${(e) => e.detail.waitUntil(new Promise((r) => setTimeout(r, 400)))}></hui-editable></div>
      <div>Server lỗi: <hui-editable id="fail" label="Tên đăng nhập" value="lananh"
        @hui-save=${(e) => e.detail.waitUntil(new Promise((_, rej) => setTimeout(() => rej(new Error('Tên đăng nhập đã tồn tại')), 300)))}></hui-editable></div>
      <div>Từ chối (preventDefault nếu &lt; 3 ký tự): <hui-editable id="deny" label="Mã" value="ABC"
        @hui-save=${(e) => { if (e.detail.value.length < 3) e.preventDefault(); }}></hui-editable></div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const ok = canvasElement.querySelector('#ok');
    let done = false;
    ok.addEventListener('hui-saved', () => { done = true; }, { once: true });
    ok.edit();
    await clearInput(control(ok));
    await userEvent.type(control(ok), 'anh@vidu.vn{Enter}');
    await expect(ok.saving).toBe(true);
    await expect(ok.value).toBe('anh@vidu.vn'); // hiển thị lạc quan
    await expect(view(ok).getAttribute('aria-busy')).toBe('');
    await waitFor(() => expect(done).toBe(true));
    await expect(ok.saving).toBe(false);

    const fail = canvasElement.querySelector('#fail');
    let error = null;
    fail.addEventListener('hui-save-error', (e) => { error = e.detail.error; }, { once: true });
    fail.edit();
    await userEvent.type(control(fail), '2{Enter}');
    await waitFor(() => expect(error?.message).toBe('Tên đăng nhập đã tồn tại'));
    await expect(fail.value).toBe('lananh');
    await expect(fail.shadowRoot.querySelector('[part="message"]').textContent).toBe('Tên đăng nhập đã tồn tại');

    const deny = canvasElement.querySelector('#deny');
    deny.edit();
    await clearInput(control(deny));
    await userEvent.type(control(deny), 'X{Enter}');
    await expect(deny.value).toBe('ABC');
    await expect(deny.shadowRoot.querySelector('[part="message"]').textContent).toContain('khôi phục');
  },
};

/** Placeholder khi rỗng, required, blur-action, disabled */
export const States = {
  render: () => html`
    <div style="display: grid; gap: 14px; font-size: 15px;">
      <div>Rỗng: <hui-editable id="empty" label="Ghi chú" placeholder="Thêm ghi chú…"></hui-editable></div>
      <div>Bắt buộc: <hui-editable id="req" label="Tiêu đề" value="Bắt buộc" required></hui-editable></div>
      <div>Rời ô thì hủy: <hui-editable id="bc" label="Tạm" value="Không lưu khi blur" blur-action="cancel"></hui-editable></div>
      <div>Disabled: <hui-editable id="dis" label="Khóa" value="Không sửa được" disabled></hui-editable></div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const empty = canvasElement.querySelector('#empty');
    await expect(empty.shadowRoot.querySelector('[part="text"]').textContent).toBe('Thêm ghi chú…');

    const req = canvasElement.querySelector('#req');
    req.edit();
    await clearInput(control(req));
    await userEvent.keyboard('{Enter}');
    await expect(req.editing).toBe(true);
    await expect(control(req).getAttribute('aria-invalid')).toBe('true');
    await userEvent.keyboard('{Escape}');
    await expect(req.value).toBe('Bắt buộc');

    const bc = canvasElement.querySelector('#bc');
    bc.edit();
    await userEvent.type(control(bc), ' sửa');
    control(bc).blur();
    await sleep(0);
    await expect(bc.editing).toBe(false);
    await expect(bc.value).toBe('Không lưu khi blur');

    const dis = canvasElement.querySelector('#dis');
    await userEvent.click(view(dis));
    await expect(dis.editing).toBe(false);
    await expect(view(dis).getAttribute('aria-disabled')).toBe('true');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .custom-editable {
        --hui-editable-hover-bg: var(--hui-warning-light);
        --hui-editable-focus-color: var(--hui-warning);
        --hui-editable-radius: 0;
        --hui-editable-icon-color: var(--hui-warning);
      }
      .custom-editable::part(text) { border-bottom: 1px dashed var(--hui-warning); }
      .custom-editable::part(control) { font-weight: 600; }
    </style>
    <span style="font-size: 18px;">Khách hàng: <hui-editable class="custom-editable" label="Khách hàng" value="Công ty ABC"></hui-editable></span>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-editable');
    await expect(getComputedStyle(el.shadowRoot.querySelector('[part="text"]')).borderBottomStyle).toBe('dashed');
    el.edit();
    await expect(getComputedStyle(control(el)).fontWeight).toBe('600');
    el.cancel();
  },
};
