/**
 * Storybook Stories — HUI Textarea
 */

import { html, nothing } from 'lit';
import { expect, userEvent } from 'storybook/test';
import './index.js';
import '../hui-input/index.js';

export default {
  title: 'Components/HuiTextarea',
  component: 'hui-textarea',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Textarea** — Ô nhập nhiều dòng, cùng giao diện với \`hui-input\` (viền, focus ring, size, variant, trạng thái).
Tham gia \`<form>\` như \`<textarea>\` native.

\`\`\`html
<hui-textarea label="Mô tả" rows="4" show-count maxlength="200"></hui-textarea>
<hui-textarea autosize min-rows="2" max-rows="6" placeholder="Tự cao theo nội dung"></hui-textarea>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`label\` | string | — | Nhãn phía trên |
| \`label-position\` | string | \`top\` | \`top\` \\| \`inline\` |
| \`placeholder\` | string | — | Chữ gợi ý |
| \`value\` | string | \`''\` | Giá trị (attribute = giá trị ban đầu khi reset form) |
| \`rows\` | number | \`3\` | Số dòng hiển thị (khi không autosize) |
| \`autosize\` | boolean | \`false\` | Tự cao theo nội dung |
| \`min-rows\` / \`max-rows\` | number | \`1\` / — | Giới hạn số dòng khi autosize (vượt max → thanh cuộn) |
| \`show-count\` | boolean | \`false\` | Bộ đếm dưới ô: \`12\` hoặc \`12 / 200\` |
| \`maxlength\` / \`minlength\` | number | — | Giới hạn độ dài (validate) |
| \`resize\` | string | \`vertical\` | \`none\` \\| \`vertical\` \\| \`both\` (autosize luôn \`none\`) |
| \`variant\` | string | \`outlined\` | \`outlined\` \\| \`filled\` \\| \`borderless\` |
| \`size\` | string | \`md\` | \`sm\` \\| \`md\` \\| \`lg\` (1 dòng cao bằng hui-input cùng size) |
| \`status\` | string | — | \`error\` \\| \`warning\` (chỉ đổi màu viền) |
| \`error\` / \`success\` / \`hint\` | string | — | Dòng thông báo dưới ô |
| \`name\` / \`required\` / \`disabled\` / \`readonly\` | — | — | Như \`<textarea>\` native |

### Properties
\`value\` (string), \`focus()\`, \`blur()\`, \`select()\`, \`checkValidity()\`, \`reportValidity()\`, \`setCustomValidity()\`.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` | \`{ value }\` | Mỗi lần gõ |
| \`change\` | \`{ value }\` | Rời ô sau khi đổi |

### Slots
Không có.

### Parts
\`base\`, \`label\`, \`textarea\`, \`footer\`, \`message\`, \`count\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-textarea-padding\` | Khoảng đệm trong ô |
| \`--hui-textarea-font-size\` / \`--hui-textarea-line-height\` | Cỡ chữ / chiều cao dòng |
| \`--hui-textarea-radius\` | Bo góc |
| \`--hui-textarea-bg\` / \`--hui-textarea-filled-bg\` / \`--hui-textarea-color\` | Nền / nền filled / màu chữ |
| \`--hui-textarea-placeholder-color\` | Màu placeholder |
| \`--hui-textarea-border-color\` / \`--hui-textarea-hover-border-color\` | Viền / viền hover |
| \`--hui-textarea-focus-border-color\` / \`--hui-textarea-focus-shadow\` | Viền / vòng sáng khi focus |
| \`--hui-textarea-label-color\` / \`--hui-textarea-label-font-size\` | Nhãn |
| \`--hui-textarea-count-color\` | Màu bộ đếm |

### Bàn phím
Như \`<textarea>\` native (\`Tab\` vào/ra, \`Enter\` xuống dòng).

CSS trạng thái: \`hui-textarea:state(user-invalid)\`, \`:state(filled)\`, \`:state(disabled)\`.
        `,
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    rows: { control: 'number' },
    autosize: { control: 'boolean' },
    'min-rows': { control: 'number' },
    'max-rows': { control: 'number' },
    'show-count': { control: 'boolean' },
    maxlength: { control: 'number' },
    resize: { control: 'select', options: ['none', 'vertical', 'both'] },
    variant: { control: 'select', options: ['outlined', 'filled', 'borderless'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    status: { control: 'select', options: ['', 'error', 'warning'] },
    disabled: { control: 'boolean' },
    hint: { control: 'text' },
  },
};

export const Default = {
  render: (args) => html`
    <div style="max-width: 480px;">
      <hui-textarea
        label=${args.label || ''}
        placeholder=${args.placeholder || ''}
        rows=${args.rows ?? nothing}
        ?autosize=${args.autosize}
        min-rows=${args['min-rows'] ?? nothing}
        max-rows=${args['max-rows'] ?? nothing}
        ?show-count=${args['show-count']}
        maxlength=${args.maxlength ?? nothing}
        resize=${args.resize || 'vertical'}
        variant=${args.variant || 'outlined'}
        size=${args.size || 'md'}
        status=${args.status || ''}
        ?disabled=${args.disabled}
        hint=${args.hint || ''}
      ></hui-textarea>
    </div>
  `,
  args: {
    label: 'Mô tả',
    placeholder: 'Viết vài dòng...',
    rows: 3,
    autosize: false,
    'show-count': true,
    maxlength: 200,
    resize: 'vertical',
    variant: 'outlined',
    size: 'md',
    status: '',
    disabled: false,
    hint: '',
  },
};

/** Đếm ký tự — gõ vào ô, bộ đếm cập nhật "n / max" */
export const ShowCount = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 480px;">
      <hui-textarea id="ta-count" label="Bình luận" show-count maxlength="100" hint="Tối đa 100 ký tự"></hui-textarea>
      <hui-textarea label="Không giới hạn" show-count value="Đếm cả khoảng trắng"></hui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ta-count');
    const count = el.shadowRoot.querySelector('[part="count"]');
    await expect(count.textContent).toBe('0 / 100');
    await userEvent.type(el.shadowRoot.querySelector('textarea'), 'Xin chào');
    await el.updateComplete;
    await expect(el.value).toBe('Xin chào');
    await expect(count.textContent).toBe('8 / 100');
  },
};

/** Autosize — cao dần theo nội dung trong khoảng min-rows … max-rows */
export const Autosize = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 480px;">
      <hui-textarea id="ta-auto" label="autosize (1 → 4 dòng)" autosize max-rows="4" placeholder="Gõ nhiều dòng..."></hui-textarea>
      <hui-textarea label="autosize min-rows=2" autosize min-rows="2" placeholder="Tối thiểu 2 dòng, không giới hạn trên"></hui-textarea>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ta-auto');
    const ta = el.shadowRoot.querySelector('textarea');
    const h1 = ta.getBoundingClientRect().height;
    el.value = 'một\nhai\nba';
    await el.updateComplete;
    const h3 = ta.getBoundingClientRect().height;
    await expect(h3).toBeGreaterThan(h1);
    el.value = 'a\nb\nc\nd\ne\nf\ng\nh';
    await el.updateComplete;
    const h8 = ta.getBoundingClientRect().height;
    // max-rows=4 → dừng lớn, hiện thanh cuộn
    await expect(h8).toBeLessThan(h1 * 4 + 4);
    await expect(ta.style.overflowY).toBe('auto');
  },
};

export const Resize = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 480px;">
      <hui-textarea label="resize=vertical (mặc định)" rows="2"></hui-textarea>
      <hui-textarea label="resize=both" resize="both" rows="2"></hui-textarea>
      <hui-textarea label="resize=none" resize="none" rows="2"></hui-textarea>
    </div>
  `,
};

export const Variants = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 760px;">
      ${['outlined', 'filled', 'borderless'].map((variant) => html`
        <hui-textarea variant=${variant} label=${variant} rows="2" placeholder=${`variant=${variant}`}></hui-textarea>
      `)}
    </div>
  `,
};

/** Kích thước — 1 dòng cao bằng hui-input cùng size */
export const Sizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 480px;">
      ${['sm', 'md', 'lg'].map((size) => html`
        <div style="display: flex; gap: 8px; align-items: flex-start;">
          <hui-textarea style="flex: 1" size=${size} rows="1" resize="none" placeholder=${`textarea ${size}`}></hui-textarea>
          <hui-input style="flex: 1" size=${size} placeholder=${`input ${size}`}></hui-input>
        </div>
      `)}
    </div>
  `,
};

export const States = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 480px;">
      <hui-textarea label="Lỗi" error="Nội dung không hợp lệ" value="abc" rows="2"></hui-textarea>
      <hui-textarea label="Cảnh báo" status="warning" hint="status=warning" rows="2"></hui-textarea>
      <hui-textarea label="Thành công" success="Đã lưu" rows="2"></hui-textarea>
      <hui-textarea label="Disabled" disabled value="Không sửa được" rows="2"></hui-textarea>
      <hui-textarea label="Readonly" readonly value="Chỉ đọc" rows="2"></hui-textarea>
    </div>
  `,
};

/** Trong <form> — FormData, minlength, reset */
export const InForm = {
  render: () => html`
    <form id="ta-form" style="display: flex; flex-direction: column; gap: 12px; max-width: 480px;"
      @submit=${(e) => e.preventDefault()}>
      <hui-textarea name="bio" label="Giới thiệu" value="Xin chào" required minlength="5" show-count maxlength="120"></hui-textarea>
      <div style="display: flex; gap: 8px;">
        <button type="submit">Gửi</button>
        <button type="reset">Reset</button>
      </div>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#ta-form');
    const el = form.querySelector('hui-textarea');
    await expect(new FormData(form).get('bio')).toBe('Xin chào');
    el.value = 'abc';
    await expect(el.checkValidity()).toBe(false);
    await expect(el.validity.tooShort).toBe(true);
    el.value = 'Dòng 1\nDòng 2';
    await expect(new FormData(form).get('bio')).toBe('Dòng 1\nDòng 2');
    form.reset();
    await el.updateComplete;
    await expect(el.value).toBe('Xin chào');
    await expect(el.shadowRoot.querySelector('textarea').value).toBe('Xin chào');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .ta-soft {
        --hui-textarea-radius: 14px;
        --hui-textarea-padding: 12px 16px;
        --hui-textarea-focus-border-color: var(--hui-success);
        --hui-textarea-focus-shadow: 0 0 0 3px var(--hui-success-light);
      }
      hui-textarea.mono::part(textarea) { font-family: var(--hui-font-mono); background: var(--hui-bg-secondary); }
      hui-textarea.mono::part(count) { font-weight: 600; color: var(--hui-primary); }
    </style>
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 480px;">
      <div class="ta-soft"><hui-textarea label="Biến CSS trên thẻ cha" rows="2" placeholder="Bo tròn, focus màu success"></hui-textarea></div>
      <hui-textarea class="mono" label="::part(textarea) + ::part(count)" show-count rows="3" value="const hui = 'zero-dependency';"></hui-textarea>
    </div>
  `,
};
