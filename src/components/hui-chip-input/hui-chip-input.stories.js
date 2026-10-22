/**
 * Storybook Stories — HUI Chip Input (gõ để thêm chip / tag)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const input = (el) => el.shadowRoot.querySelector('[part="input"]');
const tags = (el) => [...el.shadowRoot.querySelectorAll('hui-tag')];

/**
 * Gõ phím trực tiếp vào <input> trong shadow DOM. userEvent không theo dõi được giá trị của input nằm trong
 * shadow root (chỉ chuẩn bị phần tử là host) → sau khi component tự xóa ô, userEvent vẫn nối chữ cũ.
 * '{Enter}' / '{Backspace}' là phím đặc biệt, còn lại gõ từng ký tự.
 */
const typeKeys = (target, text) => {
  for (const token of text.match(/\{[A-Za-z]+\}|./gu)) {
    const key = token.startsWith('{') ? token.slice(1, -1) : token;
    const ok = target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
    if (!ok) continue;
    if (key === 'Backspace') target.value = target.value.slice(0, -1);
    else if (key.length === 1) target.value += key;
    else continue;
    target.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  }
};

/** Dán chữ vào ô (ClipboardEvent tự tạo) */
const paste = (target, text) => {
  const data = new DataTransfer();
  data.setData('text', text);
  target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true, composed: true }));
};

export default {
  title: 'Molecules/HuiChipInput',
  component: 'hui-chip-input',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Chip Input** — gõ rồi \`Enter\` / dấu phẩy để thêm chip (tag, email, từ khóa). \`Backspace\` ở ô trống xóa chip cuối,
dán "a, b, c" tự tách, chặn trùng (không phân biệt hoa thường), giới hạn \`max\`, hàm \`validate\`. Tham gia \`<form>\`.

\`\`\`html
<hui-chip-input name="tags" label="Thẻ" placeholder="Nhập rồi Enter" max="5" value="web,ui"></hui-chip-input>
<script>el.validate = (text) => /^\\S+@\\S+$/.test(text) || 'Email không hợp lệ';</script>
\`\`\`

### Attributes / Properties
| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| \`value\` | \`string[]\` | \`[]\` | Danh sách chip (attribute \`"a,b"\` hoặc JSON = giá trị ban đầu khi reset) |
| \`max\` | number | — | Số chip tối đa |
| \`separators\` | string | \`","\` | Ký tự tách khi gõ / dán (ngoài Enter, xuống dòng, tab) — vd \`",; "\` |
| \`allow-duplicates\` | boolean | — | Cho trùng |
| \`add-on-blur\` | boolean | — | Rời ô thì tự thêm chữ đang gõ |
| \`validate\` | \`(text, values) => true \\| false \\| string\` | — | Kiểm tra trước khi thêm (property) |
| \`form-mode\` | \`multiple \\| comma\` | \`multiple\` | Gửi form: mỗi chip 1 entry cùng name, hoặc 1 chuỗi nối dấu phẩy |
| \`tag-color\` / \`tag-variant\` | string | — | Màu / kiểu chip (của hui-tag) |
| \`label\` / \`placeholder\` / \`hint\` / \`error\` | string | — | Nhãn / gợi ý / thông báo |
| \`size\` / \`name\` / \`disabled\` / \`readonly\` / \`required\` / \`minlength\` / \`maxlength\` | — | — | min/maxlength tính theo **số chip** |

Methods: \`add(...values)\` (có kiểm tra), \`removeValue(value)\`, \`focus()\`, \`blur()\`.

### Events
| Event | Detail |
|-------|--------|
| \`input\` / \`change\` | \`{ value }\` — thêm / xóa chip |
| \`hui-add\` | \`{ value }\` |
| \`hui-remove\` | \`{ value, index }\` |
| \`hui-invalid\` | \`{ value, reason: 'duplicate' \\| 'max' \\| 'invalid', message }\` — chữ bị từ chối (khung rung nhẹ, \`:state(rejected)\`) |

### Parts
\`base\`, \`label\`, \`container\`, \`chip\` (\`<hui-tag>\`), \`input\`, \`message\`

### CSS Variables
\`--hui-chip-input-min-height | radius | bg | border-color | focus-border-color | gap\`

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Enter\` / ký tự trong \`separators\` | Thêm chip từ chữ đang gõ |
| \`Backspace\` (ô trống) | Xóa chip cuối |
| \`←\` (con trỏ ở đầu ô) | Focus chip cuối |
| \`←\` / \`→\` trên chip | Chuyển giữa các chip (→ ở chip cuối về ô gõ) |
| \`Backspace\` / \`Delete\` trên chip | Xóa chip đó |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <div style="max-width:420px">
      <hui-chip-input label="Kỹ năng" placeholder="Nhập rồi Enter hoặc dấu phẩy" value="JavaScript,CSS" hint="Tối đa 8 kỹ năng" max="8"></hui-chip-input>
    </div>
  `,
};

/** Enter / dấu phẩy thêm chip, chặn trùng, Backspace xóa chip cuối */
export const AddAndRemove = {
  render: () => html`<div style="max-width:420px"><hui-chip-input id="ci-a" label="Thẻ"></hui-chip-input></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ci-a');
    const log = [];
    el.addEventListener('change', (e) => log.push(e.detail.value.join('|')));
    const invalid = [];
    el.addEventListener('hui-invalid', (e) => invalid.push(e.detail.reason));

    input(el).focus();
    typeKeys(input(el), 'react{Enter}vue,');
    expect(el.value).toEqual(['react', 'vue']);
    await waitFor(() => expect(tags(el).length).toBe(2));
    expect(input(el).value).toBe('');
    typeKeys(input(el), 'React{Enter}');
    expect(invalid).toEqual(['duplicate']);
    expect(el.value).toEqual(['react', 'vue']);
    input(el).value = '';
    typeKeys(input(el), '{Backspace}');
    expect(el.value).toEqual(['react']);
    expect(log).toEqual(['react', 'react|vue', 'react']);
  },
};

/** Dán "a, b\nc" tự tách; max chặn phần thừa */
export const PasteAndMax = {
  render: () => html`<div style="max-width:420px"><hui-chip-input id="ci-p" label="Email" max="3"></hui-chip-input></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ci-p');
    const reasons = [];
    el.addEventListener('hui-invalid', (e) => reasons.push(e.detail.reason));
    input(el).focus();
    paste(input(el), 'a@x.vn, b@x.vn\nc@x.vn, d@x.vn');
    expect(el.value).toEqual(['a@x.vn', 'b@x.vn', 'c@x.vn']);
    expect(reasons).toEqual(['max']);
    expect(input(el).value).toBe('d@x.vn'); // phần bị từ chối giữ lại trong ô
  },
};

/** validate: trả chuỗi = thông báo lỗi */
export const Validate = {
  render: () => html`<div style="max-width:420px"><hui-chip-input id="ci-v" label="Email người nhận" placeholder="ten@mien.vn"></hui-chip-input></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ci-v');
    el.validate = (text) => /^\S+@\S+\.\S+$/.test(text) || 'Email không hợp lệ';
    let message = '';
    el.addEventListener('hui-invalid', (e) => { message = e.detail.message; });
    await userEvent.click(input(el));
    await userEvent.keyboard('khong-phai-email{Enter}');
    expect(el.value).toEqual([]);
    expect(message).toBe('Email không hợp lệ');
    expect(input(el).value).toBe('khong-phai-email');
  },
};

/** Bàn phím trên chip: ← từ ô gõ vào chip cuối, Delete xóa chip đang focus */
export const ChipKeyboard = {
  render: () => html`<div style="max-width:420px"><hui-chip-input id="ci-k" label="Thẻ" value="mot,hai,ba"></hui-chip-input></div>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ci-k');
    await waitFor(() => expect(tags(el).length).toBe(3));
    await userEvent.click(input(el));
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(el.shadowRoot.activeElement).toBe(tags(el)[2]));
    await userEvent.keyboard('{ArrowLeft}');
    expect(el.shadowRoot.activeElement).toBe(tags(el)[1]);
    await userEvent.keyboard('{Delete}');
    await waitFor(() => expect(el.value).toEqual(['mot', 'ba']));
    // bấm × trên chip
    const close = tags(el)[0].shadowRoot.querySelector('[part="close"]');
    await userEvent.click(close);
    await waitFor(() => expect(el.value).toEqual(['ba']));
  },
};

/** Gửi form: mỗi chip 1 entry, hoặc nối dấu phẩy; required + reset */
export const InForm = {
  render: () => html`
    <form id="ci-f" style="display:grid;gap:12px;max-width:420px">
      <hui-chip-input name="tags" value="a,b" label="multiple"></hui-chip-input>
      <hui-chip-input name="joined" form-mode="comma" value="x,y" label="comma"></hui-chip-input>
      <hui-chip-input name="need" required label="required"></hui-chip-input>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#ci-f');
    const fd = new FormData(form);
    expect(fd.getAll('tags')).toEqual(['a', 'b']);
    expect(fd.get('joined')).toBe('x,y');
    expect(form.checkValidity()).toBe(false);
    const need = form.querySelector('[name="need"]');
    need.add('ok');
    expect(form.checkValidity()).toBe(true);
    const tagsEl = form.querySelector('[name="tags"]');
    tagsEl.add('c');
    expect(new FormData(form).getAll('tags')).toEqual(['a', 'b', 'c']);
    form.reset();
    expect(tagsEl.value).toEqual(['a', 'b']);
    expect(need.value).toEqual([]);
  },
};

export const SizesAndStates = {
  render: () => html`
    <div style="display:grid;gap:12px;max-width:420px">
      <hui-chip-input size="sm" value="sm,nhỏ" placeholder="sm"></hui-chip-input>
      <hui-chip-input size="lg" value="lg,lớn" placeholder="lg" tag-color="primary"></hui-chip-input>
      <hui-chip-input disabled value="khóa,disabled"></hui-chip-input>
      <hui-chip-input readonly value="chỉ,đọc"></hui-chip-input>
      <hui-chip-input error="Cần ít nhất 1 thẻ" placeholder="Error"></hui-chip-input>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .ci-brand {
        --hui-chip-input-radius: 16px;
        --hui-chip-input-bg: var(--hui-fill-tertiary);
        --hui-chip-input-border-color: transparent;
        --hui-chip-input-gap: 6px;
      }
      .ci-brand::part(chip) { --hui-tag-radius: 999px; }
    </style>
    <div style="max-width:420px"><hui-chip-input class="ci-brand" tag-color="success" tag-variant="filled" value="xanh,lá" placeholder="Thêm..."></hui-chip-input></div>
  `,
};
