/**
 * Storybook Stories — HUI Input
 * Ô nhập liệu đa năng với: icon trái/phải, clearable ẩn/hiện, slot prefix/suffix,
 * các trạng thái validation, kích thước.
 */

import { html, nothing } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Components/HuiInput',
  component: 'hui-input',
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Input** — Ô nhập liệu đa năng hỗ trợ icon, clearable, validation states, slots.

### Cách sử dụng cơ bản
\`\`\`html
<hui-input label="Email" placeholder="Nhập email..." type="email"></hui-input>
\`\`\`

### Cách thêm icon (2 cách)

**Cách 1: Attribute icon-left / icon-right (Đơn giản — emoji, text)**
\`\`\`html
<hui-input icon-left="🔍" icon-right="✉️" placeholder="Tìm kiếm..."></hui-input>
\`\`\`

**Cách 2: Slot prefix / suffix (Phức tạp — HTML tùy ý)**
\`\`\`html
<hui-input label="Website">
  <span slot="prefix">https://</span>
  <span slot="suffix">.com</span>
</hui-input>
\`\`\`

> **Lưu ý:** Nếu cùng lúc có cả \`icon-left\` attribute VÀ \`slot="prefix"\`, attribute sẽ được ưu tiên.

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`type\` | string | \`text\` | Loại input: text, email, password, search, number... |
| \`label\` | string | — | Nhãn hiển thị phía trên |
| \`placeholder\` | string | \`''\` | Placeholder text |
| \`value\` | string | \`''\` | Giá trị khởi tạo |
| \`size\` | string | \`md\` | Kích thước: sm, md, lg |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa input |
| \`required\` | boolean | \`false\` | Đánh dấu bắt buộc (dấu *) |
| \`error\` | string | — | Thông báo lỗi (đỏ) |
| \`success\` | string | — | Thông báo thành công (xanh) |
| \`hint\` | string | — | Gợi ý nhỏ phía dưới |
| \`clearable\` / \`allow-clear\` | boolean | \`false\` | Hiện nút xóa (✕) — tự ẩn khi input trống (\`allow-clear\` là tên kiểu Ant) |
| \`show-count\` | boolean | \`false\` | Bộ đếm ký tự trong khung: \`12\` hoặc \`12 / 50\` khi có \`maxlength\` |
| \`variant\` | string | \`outlined\` | Kiểu khung: \`outlined\`, \`filled\`, \`borderless\` |
| \`password-visible\` | boolean | \`false\` | \`type="password"\`: đang hiện mật khẩu (nút con mắt bật/tắt) |
| \`icon-left\` | string | — | Icon/emoji hiển thị bên trái input |
| \`icon-right\` | string | — | Icon/emoji hiển thị bên phải input |
| \`name\` | string | \`''\` | Tên field khi gửi form |
| \`label-position\` | string | \`top\` | Vị trí label: top, inline, inside (floating) |
| \`status\` | string | — | Viền theo trạng thái: error, warning (không cần thông báo) |
| \`readonly\` | boolean | \`false\` | Chỉ đọc |
| \`minlength\` / \`maxlength\` / \`pattern\` | — | — | Ràng buộc validate (giống \`<input>\` native) |

### Form
\`<hui-input>\` tham gia \`<form>\` như \`<input>\` native: \`FormData\`, \`form.reset()\`, \`<fieldset disabled>\`,
\`checkValidity()\` / \`reportValidity()\` (required, minlength, maxlength, pattern, type email/url).
CSS bắt lỗi sau khi người dùng đã tương tác: \`hui-input:state(user-invalid)\`.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`input\` | \`{ value }\` | Phát khi gõ chữ |
| \`change\` | \`{ value }\` | Phát khi blur ra ngoài |
| \`hui-search\` | \`{ value }\` | Phát debounced (300ms) khi type="search" |
| \`clear\` | — | Phát khi nhấn nút xóa |
| \`hui-visibility-change\` | \`{ visible }\` | \`type="password"\`: bấm nút ẩn/hiện |

### Slots
| Slot | Mô tả |
|------|-------|
| \`prefix\` | Nội dung HTML tùy ý phía trước input, trong khung (bị ghi đè nếu có icon-left) |
| \`suffix\` | Nội dung HTML tùy ý phía sau input, trong khung (bị ghi đè nếu có icon-right) |
| \`addon-before\` | Hộp xám gắn liền bên trái khung (vd: \`https://\`) |
| \`addon-after\` | Hộp xám gắn liền bên phải khung (vd: \`.com\`) |

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Vào ô nhập → nút ẩn/hiện mật khẩu (nút xóa không nhận focus) |
| \`Space\` / \`Enter\` trên nút con mắt | Bật/tắt hiện mật khẩu (\`aria-pressed\`) |

### Override giao diện từ bên ngoài
Biến CSS đặt được trên chính thẻ, thẻ cha hoặc \`:root\`; \`::part()\` để chỉnh sâu hơn.

| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-input-height\` | Chiều cao khung |
| \`--hui-input-padding-x\` | Khoảng đệm ngang |
| \`--hui-input-font-size\` | Cỡ chữ |
| \`--hui-input-radius\` | Bo góc |
| \`--hui-input-bg\` / \`--hui-input-color\` | Nền / màu chữ |
| \`--hui-input-placeholder-color\` | Màu placeholder |
| \`--hui-input-border-color\` / \`--hui-input-hover-border-color\` | Viền / viền khi hover |
| \`--hui-input-focus-border-color\` / \`--hui-input-focus-shadow\` | Viền / vòng sáng khi focus |
| \`--hui-input-label-color\` / \`--hui-input-label-font-size\` | Màu / cỡ chữ nhãn |
| \`--hui-input-icon-color\` | Màu icon, prefix, suffix, nút ẩn/hiện mật khẩu |
| \`--hui-input-filled-bg\` | Nền variant \`filled\` |
| \`--hui-input-addon-bg\` | Nền hộp addon |
| \`--hui-input-count-color\` | Màu bộ đếm ký tự |

**Parts:** \`base\`, \`label\`, \`control\`, \`container\`, \`input\`, \`prefix\`, \`suffix\`, \`addon-before\`, \`addon-after\`,
\`icon\` (\`icon-left\`, \`icon-right\`), \`clear\`, \`count\`, \`password-toggle\`, \`message\`.
        `,
      },
    },
  },

  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'number', 'tel', 'url'],
      description: 'Loại ô nhập liệu',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'text' } },
    },
    label: { control: 'text', description: 'Nhãn hiển thị trên ô nhập liệu' },
    'label-position': {
      control: 'select',
      options: ['top', 'inline', 'inside'],
      description: 'Vị trí của label',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'top' } },
    },
    placeholder: { control: 'text', description: 'Placeholder text khi chưa nhập' },
    value: { control: 'text', description: 'Giá trị mặc định' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Kích thước ô nhập liệu',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'md' } },
    },
    disabled: { control: 'boolean', description: 'Vô hiệu hóa ô nhập liệu' },
    required: { control: 'boolean', description: 'Đánh dấu bắt buộc' },
    error: { control: 'text', description: 'Thông báo lỗi (đỏ)' },
    success: { control: 'text', description: 'Thông báo thành công (xanh)' },
    hint: { control: 'text', description: 'Gợi ý nhỏ' },
    clearable: { control: 'boolean', description: 'Hiện nút xóa nhanh (✕) — tự ẩn khi trống' },
    'show-count': { control: 'boolean', description: 'Hiện bộ đếm ký tự' },
    maxlength: { control: 'number', description: 'Số ký tự tối đa' },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'borderless'],
      description: 'Kiểu khung viền',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'outlined' } },
    },
    'icon-left': { control: 'text', description: 'Icon/emoji bên trái input' },
    'icon-right': { control: 'text', description: 'Icon/emoji bên phải input' },
  },
};

// === STORIES ===

/**
 * Story mặc định — Input cơ bản có label và placeholder.
 */
export const Default = {
  render: (args) => html`
    <div style="max-width: 400px;">
      <hui-input
        type=${args.type || 'text'}
        label=${args.label || ''}
        label-position=${args['label-position'] || 'top'}
        placeholder=${args.placeholder || ''}
        value=${args.value || ''}
        size=${args.size || 'md'}
        ?disabled=${args.disabled}
        ?required=${args.required}
        ?clearable=${args.clearable}
        ?show-count=${args['show-count']}
        maxlength=${args.maxlength ?? nothing}
        variant=${args.variant || 'outlined'}
        error=${args.error || ''}
        success=${args.success || ''}
        hint=${args.hint || ''}
        icon-left=${args['icon-left'] || ''}
        icon-right=${args['icon-right'] || ''}
      ></hui-input>
    </div>
  `,
  args: {
    type: 'text',
    label: 'Tên đăng nhập',
    'label-position': 'top',
    placeholder: 'Nhập tên của bạn...',
    value: '',
    size: 'md',
    disabled: false,
    required: false,
    clearable: false,
    'show-count': false,
    maxlength: undefined,
    variant: 'outlined',
    error: '',
    success: '',
    hint: '',
    'icon-left': '',
    'icon-right': '',
  },
};

/**
 * Icon bên trái — Dùng attribute icon-left để thêm emoji/icon đơn giản.
 */
export const IconLeft = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input label="Tìm kiếm" icon-left="🔍" placeholder="Gõ để tìm..." clearable></hui-input>
      <hui-input label="Email" icon-left="✉️" placeholder="user@example.com" type="email"></hui-input>
      <hui-input label="Điện thoại" icon-left="📞" placeholder="0912-345-678" type="tel"></hui-input>
      <hui-input label="Mật khẩu" icon-left="🔒" placeholder="Nhập mật khẩu..." type="password"></hui-input>
    </div>
  `,
};

/**
 * Icon bên phải — Emoji/icon phía sau input.
 */
export const IconRight = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input label="Link" icon-right="🔗" placeholder="https://example.com"></hui-input>
      <hui-input label="Ghi chú" icon-right="📝" placeholder="Thêm ghi chú..."></hui-input>
    </div>
  `,
};

/**
 * Icon hai bên — Kết hợp icon-left và icon-right cùng lúc.
 */
export const IconBothSides = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input label="Tìm kiếm" icon-left="🔍" icon-right="⌘K" placeholder="Tìm kiếm..." clearable></hui-input>
      <hui-input label="Số tiền" icon-left="💰" icon-right="VNĐ" placeholder="0" type="number"></hui-input>
    </div>
  `,
};

/**
 * Clearable (bật/tắt) — Nút ✕ tự hiện khi có text, tự ẩn khi trống.
 */
export const Clearable = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input
        label="Có nút xóa (clearable)"
        placeholder="Gõ gì đó rồi xem nút ✕ hiện ra..."
        clearable
        icon-left="🔍"
        hint="Nút ✕ tự hiện khi có text, ẩn khi trống"
      ></hui-input>
      <hui-input
        label="Đã có value sẵn"
        value="Xóa tôi đi!"
        clearable
        icon-left="📝"
      ></hui-input>
      <hui-input
        label="Không có nút xóa"
        placeholder="Không thể xóa nhanh..."
        value="Không có clearable"
      ></hui-input>
    </div>
  `,
};

/**
 * Input bắt buộc — Hiển thị dấu * sau label.
 */
export const Required = {
  ...Default,
  args: {
    ...Default.args,
    label: 'Email',
    placeholder: 'Nhập email...',
    type: 'email',
    required: true,
    hint: 'Chúng tôi sẽ không chia sẻ email của bạn.',
    'icon-left': '✉️',
  },
};

/**
 * Trạng thái lỗi — Viền đỏ với thông báo lỗi bên dưới.
 */
export const WithError = {
  ...Default,
  args: {
    ...Default.args,
    label: 'Mật khẩu',
    type: 'password',
    value: '123',
    error: 'Mật khẩu phải có ít nhất 8 ký tự.',
    'icon-left': '🔒',
  },
};

/**
 * Trạng thái thành công — Viền xanh với thông báo OK.
 */
export const WithSuccess = {
  ...Default,
  args: {
    ...Default.args,
    label: 'Username',
    value: 'hoang_dev',
    success: 'Tên người dùng hợp lệ!',
    'icon-left': '👤',
    'icon-right': '✅',
  },
};

/**
 * Input có gợi ý — Dòng chữ nhỏ bên dưới hướng dẫn.
 */
export const WithHint = {
  ...Default,
  args: {
    ...Default.args,
    label: 'Số điện thoại',
    type: 'tel',
    placeholder: '0912-345-678',
    hint: 'Nhập số điện thoại 10 chữ số.',
    'icon-left': '📞',
  },
};

/**
 * Input bị khóa — Không cho phép tương tác.
 */
export const Disabled = {
  ...Default,
  args: {
    ...Default.args,
    label: 'Readonly field',
    value: 'Không thể sửa',
    disabled: true,
    'icon-left': '🔒',
  },
};

/**
 * Các chế độ hiển thị Label (label-position).
 */
export const LabelPositions = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 32px; max-width: 400px;">
      <hui-input
        label="Label Top (Mặc định)"
        label-position="top"
        placeholder="Label ở trên..."
      ></hui-input>

      <hui-input
        label="Label Inline"
        label-position="inline"
        placeholder="Label nằm ngang hàng..."
      ></hui-input>

      <hui-input
        label="Label Inside (Floating)"
        label-position="inside"
        placeholder="Gõ để float..."
      ></hui-input>
    </div>
  `,
};

/**
 * Tất cả kích thước — So sánh sm, md, lg.
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input label="Small" size="sm" placeholder="Size sm..." icon-left="📏" clearable></hui-input>
      <hui-input label="Medium" size="md" placeholder="Size md..." icon-left="📐" clearable></hui-input>
      <hui-input label="Large" size="lg" placeholder="Size lg..." icon-left="📏" clearable></hui-input>
    </div>
  `,
};

/**
 * Input có prefix/suffix slot — Kèm nội dung HTML phụ trợ phức tạp (thay vì icon đơn giản).
 */
export const WithSlots = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input label="Website" placeholder="example.com">
        <span slot="prefix">https://</span>
        <span slot="suffix">.com</span>
      </hui-input>
      <hui-input label="Giá tiền" placeholder="0" type="number" clearable>
        <span slot="suffix">VNĐ</span>
      </hui-input>
    </div>
  `,
};

/**
 * Override từ bên ngoài — biến CSS đặt trên thẻ cha / chính thẻ, và ::part() cho chỉnh sâu.
 */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .demo-pill-inputs {
        --hui-input-radius: 999px;
        --hui-input-padding-x: 18px;
        --hui-input-focus-border-color: var(--hui-success);
        --hui-input-focus-shadow: 0 0 0 3px var(--hui-success-light);
      }
      hui-input.brand {
        --hui-input-height: 44px;
        --hui-input-bg: var(--hui-primary-1);
        --hui-input-border-color: var(--hui-primary-3);
        --hui-input-icon-color: var(--hui-primary);
        --hui-input-label-color: var(--hui-primary-7);
      }
      hui-input.underline::part(container) {
        border-width: 0 0 2px;
        border-radius: 0;
        box-shadow: none;
        background: transparent;
      }
      hui-input.underline::part(label) { text-transform: uppercase; letter-spacing: 0.06em; }
      hui-input.underline::part(input)::placeholder { font-style: italic; }
    </style>
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <div class="demo-pill-inputs" style="display: flex; flex-direction: column; gap: 12px;">
        <hui-input label="Biến CSS trên thẻ cha" placeholder="Bo tròn, focus màu success" clearable></hui-input>
        <hui-input icon-left="🔍" placeholder="Áp cho mọi hui-input con"></hui-input>
      </div>
      <hui-input class="brand" label="Biến CSS trên chính thẻ" icon-left="✉️" placeholder="Nền + viền theo palette primary"></hui-input>
      <hui-input class="underline" label="::part(container)" placeholder="Kiểu gạch chân"></hui-input>
    </div>
  `,
};

/**
 * Mật khẩu — nút con mắt ẩn/hiện (aria-pressed), giữ nguyên vị trí con trỏ khi đổi.
 */
export const Password = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input id="pw" label="Mật khẩu" type="password" value="hui-secret" placeholder="Nhập mật khẩu..."></hui-input>
      <hui-input label="Đang hiện sẵn" type="password" value="hiện-sẵn" password-visible></hui-input>
    </div>
  `,
  // Kiểm thử: bấm nút → type đổi password ↔ text, aria-pressed + event theo đúng
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pw');
    const input = el.shadowRoot.querySelector('input');
    const toggle = el.shadowRoot.querySelector('[part="password-toggle"]');
    let visible = null;
    el.addEventListener('hui-visibility-change', (e) => { visible = e.detail.visible; });

    await expect(input.type).toBe('password');
    await expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(toggle);
    await el.updateComplete;
    await expect(input.type).toBe('text');
    await expect(toggle.getAttribute('aria-pressed')).toBe('true');
    await expect(visible).toBe(true);
    await expect(el.value).toBe('hui-secret');
    await userEvent.click(toggle);
    await el.updateComplete;
    await expect(input.type).toBe('password');
  },
};

/**
 * Đếm ký tự — show-count, kèm maxlength thì hiện "12 / 50".
 */
export const ShowCount = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <hui-input id="count-max" label="Tiêu đề" show-count maxlength="20" placeholder="Tối đa 20 ký tự"></hui-input>
      <hui-input label="Không giới hạn" show-count value="HUI" allow-clear></hui-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#count-max');
    const count = el.shadowRoot.querySelector('[part="count"]');
    await expect(count.textContent).toBe('0 / 20');
    await userEvent.type(el.shadowRoot.querySelector('input'), 'Hello');
    await el.updateComplete;
    await expect(el.value).toBe('Hello');
    await expect(count.textContent).toBe('5 / 20');
  },
};

/**
 * Addon — hộp xám gắn liền hai bên khung (Ant addonBefore / addonAfter), khác prefix/suffix nằm TRONG khung.
 */
export const Addons = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 420px;">
      <hui-input label="Website" placeholder="mysite">
        <span slot="addon-before">https://</span>
        <span slot="addon-after">.com</span>
      </hui-input>
      <hui-input label="Giá" placeholder="0" allow-clear>
        <span slot="addon-before">₫</span>
        <span slot="suffix">/ tháng</span>
      </hui-input>
      <hui-input size="sm" placeholder="size sm"><span slot="addon-after">kg</span></hui-input>
      <hui-input size="lg" placeholder="size lg"><span slot="addon-before">@</span></hui-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [first, , third] = canvasElement.querySelectorAll('hui-input');
    await expect(first.shadowRoot.querySelector('[part="addon-before"]').hidden).toBe(false);
    await expect(first.shadowRoot.querySelector('[part="addon-after"]').hidden).toBe(false);
    await expect(third.shadowRoot.querySelector('[part="addon-before"]').hidden).toBe(true);
  },
};

/**
 * Variant — outlined (mặc định) · filled · borderless; kết hợp status.
 */
export const Variants = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 760px;">
      ${['outlined', 'filled', 'borderless'].map((variant) => html`
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <hui-input variant=${variant} label=${variant} placeholder="Bình thường"></hui-input>
          <hui-input variant=${variant} status="warning" placeholder="status=warning"></hui-input>
          <hui-input variant=${variant} status="error" placeholder="status=error"></hui-input>
          <hui-input variant=${variant} disabled value="disabled" placeholder="disabled"></hui-input>
        </div>
      `)}
    </div>
  `,
};

/**
 * Trong <form> — FormData, required, reset về giá trị ban đầu.
 */
export const InForm = {
  render: () => html`
    <form id="input-form" style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;"
      @submit=${(e) => {
        e.preventDefault();
        const out = e.target.querySelector('output');
        out.textContent = JSON.stringify(Object.fromEntries(new FormData(e.target)));
      }}>
      <hui-input name="user" label="Tài khoản" value="hoang" required></hui-input>
      <hui-input name="password" label="Mật khẩu" type="password" required minlength="6"></hui-input>
      <hui-input name="site" label="Website" show-count maxlength="30">
        <span slot="addon-before">https://</span>
      </hui-input>
      <div style="display: flex; gap: 8px;">
        <button type="submit">Gửi</button>
        <button type="reset">Reset</button>
      </div>
      <output style="font-family: monospace; font-size: 12px;"></output>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#input-form');
    const [user, pass] = form.querySelectorAll('hui-input');
    await expect(form.checkValidity()).toBe(false); // password trống
    pass.value = '123456';
    await expect(form.checkValidity()).toBe(true);
    user.value = 'khac';
    await expect(new FormData(form).get('user')).toBe('khac');
    await expect(new FormData(form).get('password')).toBe('123456');
    form.reset();
    await expect(user.value).toBe('hoang');
    await expect(pass.value).toBe('');
  },
};

/**
 * Không có `label` — đặt `aria-label` / `aria-labelledby` / `aria-describedby` trên thẻ: component chuyển xuống `<input>`
 * bên trong (id ở light DOM không trỏ xuyên shadow root được nên chữ được đọc rồi gán `aria-label` / `aria-description`).
 * Đổi attribute trên host lúc chạy cũng được cập nhật. Có `label` thì `<label>` đặt tên như cũ.
 */
export const HostAria = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px; max-width: 360px;">
      <hui-input id="ha-label" aria-label="Tìm sản phẩm" placeholder="Nhập tên..."></hui-input>
      <span id="ha-title">Mã giảm giá</span>
      <span id="ha-desc">Tối đa 10 ký tự</span>
      <hui-input id="ha-ref" aria-labelledby="ha-title" aria-describedby="ha-desc"></hui-input>
      <hui-input id="ha-both" label="Email" aria-label="Bị bỏ qua vì đã có label"></hui-input>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const field = (id) => canvasElement.querySelector(`#${id}`).shadowRoot.querySelector('input');
    await waitFor(() => expect(field('ha-label').getAttribute('aria-label')).toBe('Tìm sản phẩm'));
    await expect(field('ha-ref').getAttribute('aria-label')).toBe('Mã giảm giá');
    await expect(field('ha-ref').getAttribute('aria-description')).toBe('Tối đa 10 ký tự');
    // Có label → giữ <label for="input">, không gán aria-label
    await expect(field('ha-both').hasAttribute('aria-label')).toBe(false);
    await expect(field('ha-both').labels[0].textContent).toBe('Email');

    // Đổi / gỡ attribute trên host → cập nhật theo
    const host = canvasElement.querySelector('#ha-label');
    host.setAttribute('aria-label', 'Tìm đơn hàng');
    await waitFor(() => expect(field('ha-label').getAttribute('aria-label')).toBe('Tìm đơn hàng'));
    host.removeAttribute('aria-label');
    await waitFor(() => expect(field('ha-label').hasAttribute('aria-label')).toBe(false));
    host.setAttribute('aria-label', 'Tìm sản phẩm');
    await waitFor(() => expect(field('ha-label').getAttribute('aria-label')).toBe('Tìm sản phẩm'));
    // aria-labelledby thắng aria-label
    const ref = canvasElement.querySelector('#ha-ref');
    ref.setAttribute('aria-label', 'Không dùng');
    await new Promise((r) => setTimeout(r));
    await expect(field('ha-ref').getAttribute('aria-label')).toBe('Mã giảm giá');
    ref.removeAttribute('aria-label');
  },
};
