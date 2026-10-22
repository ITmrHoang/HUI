/**
 * Storybook Stories — HUI Autocomplete (ô nhập có gợi ý)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const q = (el, sel) => el.shadowRoot.querySelector(sel);
const options = (el) => [...el.shadowRoot.querySelectorAll('[role="option"]')];
const isOpen = (el) => q(el, 'input').getAttribute('aria-expanded') === 'true';
/** userEvent.clear không focus được input trong shadow DOM → bấm 3 lần chọn hết rồi xóa */
const clearInput = async (input) => {
  await userEvent.tripleClick(input);
  await userEvent.keyboard('{Backspace}');
};

const CITIES = ['Hà Nội', 'Hải Phòng', 'Huế', 'Đà Nẵng', 'Hồ Chí Minh', 'Cần Thơ', 'Nha Trang', 'Đà Lạt', 'Vũng Tàu', 'Hạ Long'];
const GROUPED = [
  { label: 'Trái cây', options: [{ value: 'apple', label: 'Táo', icon: 'heart' }, { value: 'mango', label: 'Xoài' }, { value: 'banana', label: 'Chuối', disabled: true }] },
  { label: 'Rau', options: [{ value: 'cabbage', label: 'Bắp cải', description: 'Rau họ cải' }, { value: 'carrot', label: 'Cà rốt' }] },
];

/** API giả: trả về sau `ms`, hủy được bằng signal */
const fakeApi = (ms = 250) => (query, { signal }) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    resolve(CITIES.filter((c) => c.toLowerCase().includes(query.toLowerCase())).map((c) => ({ value: c, label: c, description: 'Việt Nam' })));
  }, ms);
  signal.addEventListener('abort', () => {
    clearTimeout(timer);
    reject(new DOMException('Aborted', 'AbortError'));
  });
});

export default {
  title: 'Molecules/HuiAutocomplete',
  component: 'hui-autocomplete',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Autocomplete** — ô nhập kèm danh sách gợi ý (Ant AutoComplete + MUI Autocomplete), tham gia \`<form>\`.
Lọc tại chỗ **không dấu** ("ha noi" khớp "Hà Nội") và tô đậm phần khớp, hoặc lấy gợi ý từ server qua \`fetchFn\`
(debounce, "Đang tải...", tự hủy request cũ). Popup ở top-layer nên không bị \`overflow: hidden\` cắt.

\`\`\`html
<hui-autocomplete label="Thành phố" name="city" clearable></hui-autocomplete>
<script>
  el.options = ['Hà Nội', 'Huế', …];                                   // tĩnh
  el.fetchFn = (q, { signal }) => fetch('/api?q=' + q, { signal }).then(r => r.json()); // server
</script>
\`\`\`

### Attributes / Properties
| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| \`options\` | \`string[] \\| {value,label,icon,description,disabled}[] \\| {label, options}[]\` | \`[]\` | Gợi ý (có nhóm) |
| \`fetchFn\` | \`(query, { signal }) => Promise<options>\` | — | Gợi ý từ server (property) |
| \`filterFn\` | \`(option, query) => boolean\` | — | Luật lọc riêng (property) |
| \`renderOption\` | \`(option, { query }) => Node \\| string\` | — | Tự vẽ gợi ý (property) |
| \`value\` | string | \`''\` | value của gợi ý đã chọn; \`free-solo\`: chữ trong ô |
| \`free-solo\` | boolean | — | Cho nhập giá trị tự do |
| \`min-chars\` | number | \`0\` | Số ký tự tối thiểu trước khi gợi ý |
| \`debounce\` | number (ms) | \`300\` | Trễ trước khi phát \`hui-search\` / gọi \`fetchFn\` |
| \`limit\` | number | \`0\` | Số gợi ý tối đa (0 = không giới hạn) |
| \`auto-highlight\` | boolean | — | Tự highlight gợi ý đầu (Enter chọn luôn) |
| \`open-on-focus\` | boolean | — | Mở danh sách khi focus |
| \`clearable\` | boolean | — | Nút ✕ |
| \`loading\` | boolean | — | Ép trạng thái đang tải |
| \`label\` / \`placeholder\` / \`hint\` / \`error\` | string | — | Nhãn / gợi ý / thông báo |
| \`size\` / \`status\` / \`name\` / \`disabled\` / \`readonly\` / \`required\` | — | — | Như hui-input |
| \`no-animation\` | boolean | — | Tắt hiệu ứng popup |
| \`query\` (chỉ đọc) | string | — | Chữ đang có trong ô |

Methods: \`showSuggestions()\`, \`hideSuggestions()\`, \`focus()\`, \`blur()\`.

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-search\` | \`{ query, trigger }\` | Chữ gõ đổi (sau debounce) / bấm xóa (\`trigger: 'clear'\`) |
| \`hui-select\` | \`{ value, label, option }\` | Chọn một gợi ý |
| \`change\` | \`{ value, option }\` | Giá trị đã chốt |
| \`input\` | \`{ value }\` | free-solo: chữ đổi khi gõ |
| \`hui-error\` | \`{ error }\` | fetchFn lỗi |
| \`clear\` | — | Bấm ✕ |

### Slots
\`prefix\`, \`suffix\` — nội dung trước / sau ô nhập.

### Parts
\`base\`, \`label\`, \`control\`, \`container\`, \`prefix\`, \`suffix\`, \`input\`, \`clear\`, \`loading\`, \`dropdown\`, \`listbox\`, \`group-label\`,
\`option\` (+ \`option-active\`, \`option-selected\`, \`option-disabled\`), \`option-icon\`, \`option-description\`, \`highlight\`, \`empty\`, \`message\`

### CSS Variables
\`--hui-autocomplete-height | radius | bg | color | border-color | hover-border-color | focus-border-color | focus-shadow | font-size\`,
\`--hui-autocomplete-dropdown-bg | dropdown-shadow | dropdown-radius | dropdown-max-height\`,
\`--hui-autocomplete-option-padding | option-active-bg | highlight-color | highlight-bg\`

### Bàn phím (WAI-ARIA APG Combobox — list autocomplete)
| Phím | Tác dụng |
|------|----------|
| \`↓\` / \`↑\` | Mở danh sách / chuyển gợi ý (vòng lại, bỏ qua disabled) |
| \`Alt+↓\` / \`Alt+↑\` | Mở không chọn / đóng |
| \`Enter\` | Chọn gợi ý đang highlight (free-solo: chốt chữ) |
| \`Esc\` | Đóng danh sách; đang đóng thì xóa chữ |
| \`Tab\` | Đóng danh sách, rời ô |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <div style="max-width:320px">
      <hui-autocomplete label="Thành phố" placeholder="Gõ tên thành phố, vd: ha noi" clearable .options=${CITIES}></hui-autocomplete>
    </div>
  `,
};

/** Lọc không dấu + tô đậm + chọn bằng bàn phím (APG combobox) */
export const KeyboardSelect = {
  render: () => html`
    <div style="max-width:320px">
      <hui-autocomplete id="ac-k" label="Thành phố" debounce="0" .options=${CITIES}></hui-autocomplete>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ac-k');
    const input = q(el, 'input');
    expect(input.getAttribute('role')).toBe('combobox');
    const events = [];
    el.addEventListener('hui-select', (e) => events.push(['select', e.detail.value]));
    el.addEventListener('change', (e) => events.push(['change', e.detail.value]));

    await userEvent.click(input);
    await userEvent.keyboard('da n');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    expect(options(el).map((o) => o.textContent)).toEqual(['Đà Nẵng']);
    expect(q(el, '[part~="highlight"]').textContent).toBe('Đà N');

    await clearInput(input);
    await userEvent.keyboard('h');
    await waitFor(() => expect(options(el).length).toBeGreaterThan(3));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const active = q(el, '[part~="option-active"]');
    expect(input.getAttribute('aria-activedescendant')).toBe(active.id);
    const label = active.textContent;
    await userEvent.keyboard('{Enter}');
    expect(isOpen(el)).toBe(false);
    expect(el.value).toBe(label);
    expect(input.value).toBe(label);
    expect(events).toEqual([['select', label], ['change', label]]);

    // Esc khi danh sách đóng → xóa chữ
    await userEvent.keyboard('{Escape}');
    expect(el.value).toBe('');
  },
};

/** Nhóm, icon, mô tả phụ, gợi ý disabled bị bỏ qua khi dùng phím */
export const Grouped = {
  render: () => html`
    <div style="max-width:320px">
      <hui-autocomplete id="ac-g" label="Thực phẩm" open-on-focus auto-highlight .options=${GROUPED}></hui-autocomplete>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ac-g');
    const input = q(el, 'input');
    await userEvent.click(input);
    await waitFor(() => expect(isOpen(el)).toBe(true));
    expect(el.shadowRoot.querySelectorAll('[part="group-label"]').length).toBe(2);
    expect(q(el, '[part~="option-active"]').textContent).toBe('Táo'); // auto-highlight
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(q(el, '[part~="option-active"]').textContent).toContain('Bắp cải'); // bỏ qua Chuối (disabled)
    await userEvent.keyboard('{Enter}');
    expect(el.value).toBe('cabbage');
    expect(input.value).toBe('Bắp cải');
  },
};

/** Không free-solo: gõ chữ không khớp rồi rời ô → quay về nhãn đã chọn; xóa hết → bỏ chọn */
export const StrictValue = {
  render: () => html`
    <div style="max-width:320px">
      <hui-autocomplete id="ac-s" label="Thành phố" value="Huế" debounce="0" .options=${CITIES}></hui-autocomplete>
      <button id="ac-s-out">Ra ngoài</button>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ac-s');
    const input = q(el, 'input');
    await waitFor(() => expect(input.value).toBe('Huế'));
    await userEvent.click(input);
    await userEvent.keyboard('xyz');
    await userEvent.click(canvasElement.querySelector('#ac-s-out'));
    expect(input.value).toBe('Huế');
    expect(el.value).toBe('Huế');
    await clearInput(input);
    await userEvent.click(canvasElement.querySelector('#ac-s-out'));
    expect(el.value).toBe('');
  },
};

/** free-solo: giá trị là chữ tự do; vẫn có gợi ý */
export const FreeSolo = {
  render: () => html`
    <form id="ac-f" style="max-width:320px">
      <hui-autocomplete name="email" label="Email" free-solo debounce="0" placeholder="ten@..."
        .options=${['an@gmail.com', 'binh@yahoo.com', 'chi@outlook.com']}></hui-autocomplete>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#ac-f');
    const el = form.querySelector('hui-autocomplete');
    const input = q(el, 'input');
    await userEvent.click(input);
    await userEvent.keyboard('khach@moi.vn');
    expect(el.value).toBe('khach@moi.vn');
    expect(new FormData(form).get('email')).toBe('khach@moi.vn');
    await clearInput(input);
    await userEvent.keyboard('bi');
    await waitFor(() => expect(options(el).length).toBe(1));
    await userEvent.click(options(el)[0]);
    expect(el.value).toBe('binh@yahoo.com');
  },
};

/** fetchFn: debounce + "Đang tải" + hủy request cũ khi gõ tiếp */
export const Async = {
  render: () => html`
    <div style="max-width:320px">
      <hui-autocomplete id="ac-a" label="Tìm qua API" min-chars="1" debounce="50" placeholder="Gõ ít nhất 1 ký tự"
        .fetchFn=${fakeApi(150)}></hui-autocomplete>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#ac-a');
    const calls = [];
    const aborted = [];
    const api = fakeApi(150);
    el.fetchFn = (query, ctx) => {
      calls.push(query);
      ctx.signal.addEventListener('abort', () => aborted.push(query));
      return api(query, ctx);
    };
    const input = q(el, 'input');
    await userEvent.click(input);
    await userEvent.keyboard('h');
    await waitFor(() => expect(calls).toEqual(['h']));
    await waitFor(() => expect(q(el, '[part~="loading"]').hidden).toBe(false));
    await userEvent.keyboard('a');
    await waitFor(() => expect(calls).toEqual(['h', 'ha']));
    expect(aborted).toContain('h');
    await waitFor(() => expect(options(el).length).toBeGreaterThan(0), { timeout: 2000 });
    expect(options(el).every((o) => o.textContent.toLowerCase().includes('ha'))).toBe(true);
    expect(q(el, '[part="option-description"]').textContent).toBe('Việt Nam');
  },
};

export const SizesAndStates = {
  render: () => html`
    <div style="display:grid;gap:12px;max-width:320px">
      <hui-autocomplete size="sm" placeholder="sm" .options=${CITIES}></hui-autocomplete>
      <hui-autocomplete size="md" placeholder="md" .options=${CITIES}></hui-autocomplete>
      <hui-autocomplete size="lg" placeholder="lg" .options=${CITIES}></hui-autocomplete>
      <hui-autocomplete disabled placeholder="Disabled" .options=${CITIES}></hui-autocomplete>
      <hui-autocomplete loading placeholder="Loading" .options=${CITIES}></hui-autocomplete>
      <hui-autocomplete error="Vui lòng chọn thành phố" placeholder="Error" .options=${CITIES}></hui-autocomplete>
      <hui-autocomplete status="warning" hint="Gợi ý dưới ô" placeholder="Warning" .options=${CITIES}></hui-autocomplete>
    </div>
  `,
};

/** Bắt buộc chọn — validate theo form */
export const Required = {
  render: () => html`
    <form id="ac-r" style="max-width:320px">
      <hui-autocomplete name="city" required label="Thành phố" .options=${CITIES}></hui-autocomplete>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#ac-r');
    const el = form.querySelector('hui-autocomplete');
    expect(form.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    el.value = 'Huế';
    expect(form.checkValidity()).toBe(true);
    await el.updateComplete;
    expect(q(el, 'input').value).toBe('Huế');
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .ac-brand {
        --hui-autocomplete-radius: 999px;
        --hui-autocomplete-focus-border-color: var(--hui-success);
        --hui-autocomplete-highlight-color: var(--hui-success);
        --hui-autocomplete-option-active-bg: var(--hui-success-light);
        --hui-autocomplete-dropdown-radius: 16px;
      }
      .ac-brand::part(option) { padding: 8px 14px; }
      .ac-brand::part(highlight) { text-decoration: underline; }
    </style>
    <div style="max-width:320px">
      <hui-autocomplete class="ac-brand" placeholder="Tùy biến từ ngoài" open-on-focus .options=${CITIES}>
        <hui-icon slot="prefix" name="home"></hui-icon>
      </hui-autocomplete>
    </div>
  `,
};
