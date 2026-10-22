/**
 * Storybook Stories — HUI Mentions (ô nhập nhắc tên)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import { getMentions } from './index.js';

const q = (el, sel) => el.shadowRoot.querySelector(sel);
const field = (el) => q(el, '[part="field"]');
const options = (el) => [...el.shadowRoot.querySelectorAll('[role="option"]')];
const isOpen = (el) => field(el).getAttribute('aria-expanded') === 'true';
/**
 * user-event chỉ theo dõi ô nhập nhận sự kiện focus ở document — trong shadow DOM nó thấy host chứ không thấy
 * <textarea> → không biết value đã được chèn bằng code và gõ tiếp vào giá trị cũ. Xóa bộ nhớ "UI" của nó trên ô nhập.
 */
const syncUserEvent = (input) => {
  for (const sym of Object.getOwnPropertySymbols(input)) {
    if (/^Displayed (value|selection) in UI$/.test(sym.description)) input[sym] = undefined;
  }
};

/** Ảnh đại diện SVG data-URI (không dùng tài nguyên mạng) */
const avatar = (text, bg) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="${bg}"/><text x="20" y="25" font-size="14" font-family="sans-serif" fill="#fff" text-anchor="middle">${text}</text></svg>`,
)}`;

const USERS = [
  { value: 'an', label: 'Nguyễn An', avatar: avatar('NA', '#1677ff'), description: 'Thiết kế' },
  { value: 'binh', label: 'Trần Bình', avatar: avatar('TB', '#52c41a'), description: 'Frontend' },
  { value: 'chi', label: 'Lê Chi', avatar: avatar('LC', '#eb2f96'), description: 'Backend' },
  { value: 'dung', label: 'Phạm Dũng', avatar: '', description: 'QA (không ảnh → chữ cái)' },
  { value: 'ngoc', label: 'Đỗ Ngọc', avatar: avatar('ĐN', '#fa8c16'), description: 'Product' },
  { value: 'old', label: 'Tài khoản cũ', description: 'Đã khóa', disabled: true },
];
const TAGS = [
  { value: 'bug', label: 'bug', prefix: '#', description: 'Lỗi' },
  { value: 'feature', label: 'feature', prefix: '#', description: 'Tính năng mới' },
  { value: 'urgent', label: 'gấp', prefix: '#' },
];

/** API giả: trả về sau `ms`, hủy được bằng signal */
const fakeApi = (ms = 150) => (query, { signal, prefix }) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    const src = prefix === '#' ? TAGS : USERS;
    resolve(src.filter((u) => u.label.toLowerCase().includes(query.toLowerCase())));
  }, ms);
  signal.addEventListener('abort', () => {
    clearTimeout(timer);
    reject(new DOMException('Aborted', 'AbortError'));
  });
});

export default {
  title: 'Molecules/HuiMentions',
  component: 'hui-mentions',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Mentions** — ô nhập nhắc tên (Ant Mentions), tham gia \`<form>\` với giá trị là **chữ thuần**.
Gõ ký tự kích hoạt (\`prefix\`, mặc định \`@\`, nhiều ký tự: \`"@,#"\`) → danh sách gợi ý nổi **ngay tại con trỏ**
(đo bằng mirror div). Lọc không dấu ("ngoc" khớp "Đỗ Ngọc"), hoặc lấy từ server qua \`fetchFn\` (debounce, tự hủy request cũ).
Chọn → chèn \`@label\` + \`split\`.

\`\`\`html
<hui-mentions name="comment" label="Bình luận" prefix="@,#" autosize></hui-mentions>
<script>
  el.options = [{ value: 'an', label: 'Nguyễn An', avatar: '/a.png', description: 'Thiết kế' }, { value: 'bug', label: 'bug', prefix: '#' }];
  // hoặc: el.fetchFn = (query, { signal, prefix }) => fetch('/users?q=' + query, { signal }).then(r => r.json());
  getMentions(el.value, '@,#', { options: el.options }); // → [{ prefix, value, index, end, option }]
</script>
\`\`\`

### Attributes / Properties
| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| \`options\` | \`string[] \\| {value,label,avatar,description,disabled,prefix}[]\` | \`[]\` | Gợi ý; \`prefix\` giới hạn gợi ý cho 1 (mảng) ký tự kích hoạt; \`avatar: ''\` → avatar chữ cái |
| \`fetchFn\` | \`(query, { signal, prefix }) => Promise<options>\` | — | Gợi ý từ server (property) |
| \`filterFn\` | \`(option, query, prefix) => boolean\` | — | Luật lọc riêng (property) |
| \`renderOption\` | \`(option, { query, prefix }) => Node \\| string\` | — | Tự vẽ gợi ý (property) |
| \`prefix\` (property \`mentionPrefix\`) | string | \`@\` | Ký tự kích hoạt, ngăn bằng dấu phẩy |
| \`split\` | string | \`' '\` | Chuỗi chèn sau tên |
| \`debounce\` | number (ms) | \`200\` | Trễ trước \`hui-search\` / \`fetchFn\` |
| \`loading\` | boolean | — | Ép trạng thái đang tải |
| \`limit\` | number | \`0\` | Số gợi ý tối đa |
| \`placement\` | \`auto \\| top \\| bottom\` | \`auto\` | Popup dưới con trỏ, auto tự lật lên khi thiếu chỗ |
| \`single-line\` | boolean | — | Dùng \`<input>\` một dòng |
| \`rows\` / \`autosize\` / \`min-rows\` / \`max-rows\` | — | \`3\` | Như hui-textarea |
| \`maxlength\` / \`show-count\` | — | — | Giới hạn + bộ đếm ký tự (chèn tên vượt giới hạn bị chặn) |
| \`label\` / \`placeholder\` / \`hint\` / \`error\` | string | — | Nhãn / gợi ý / thông báo |
| \`size\` / \`status\` / \`name\` / \`disabled\` / \`readonly\` / \`required\` | — | — | Như các form control khác |
| \`no-animation\` | boolean | — | Tắt hiệu ứng popup |
| \`prefixes\` / \`mentions\` (chỉ đọc) | — | — | Danh sách prefix / các lần nhắc tên trong value |

Methods: \`focus()\`, \`blur()\`, \`insertText(text)\`. Helper: \`getMentions(text, prefixes = '@', { split, options })\`.

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`input\` | \`{ value }\` | Gõ chữ / chèn tên |
| \`change\` | \`{ value }\` | Rời ô khi giá trị đã đổi |
| \`hui-search\` | \`{ query, prefix }\` | Chuỗi sau prefix đổi (sau debounce) |
| \`hui-select\` | \`{ option, prefix, value, label }\` | Chọn một gợi ý |
| \`hui-error\` | \`{ error }\` | fetchFn lỗi |

### Parts
\`base\`, \`label\`, \`field\`, \`dropdown\`, \`listbox\`, \`option\` (+ \`option-active\`, \`option-disabled\`), \`option-avatar\`, \`option-label\`,
\`option-description\`, \`highlight\`, \`empty\` (+ \`loading\`), \`footer\`, \`message\`, \`count\`

### CSS Variables
\`--hui-mentions-padding | font-size | line-height | radius | bg | color | border-color | hover-border-color | focus-border-color | focus-shadow\`,
\`--hui-mentions-dropdown-bg | dropdown-shadow | dropdown-radius | dropdown-width | dropdown-max-height | option-active-bg | highlight-color\`

### Bàn phím (WAI-ARIA APG Combobox trên ô nhập)
| Phím | Tác dụng |
|------|----------|
| gõ \`prefix\` | Mở gợi ý (prefix phải ở đầu hoặc sau khoảng trắng) |
| \`↓\` / \`↑\` | Chuyển gợi ý (vòng lại, bỏ qua disabled) |
| \`Enter\` / \`Tab\` | Chèn gợi ý đang chọn |
| \`Esc\` | Đóng, không tự mở lại cho tới lần nhắc tên kế tiếp |
| khoảng trắng | Kết thúc từ đang gõ → đóng |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <div style="max-width:480px">
      <hui-mentions id="mn-d" label="Bình luận" placeholder="Gõ @ để nhắc tên đồng đội" debounce="0" no-animation .options=${USERS}></hui-mentions>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#mn-d');
    const f = field(el);
    expect(f.getAttribute('role')).toBe('combobox');
    const events = [];
    el.addEventListener('hui-select', (e) => events.push(['select', e.detail.value, e.detail.prefix]));
    el.addEventListener('hui-search', (e) => events.push(['search', e.detail.query, e.detail.prefix]));

    await userEvent.click(f);
    await userEvent.keyboard('Chào @ng');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    // Không dấu: "ng" khớp "Nguyễn An", "Phạm Dũng", "Đỗ Ngọc"
    expect(options(el).map((o) => o.textContent)).toEqual(['Nguyễn AnThiết kế', 'Phạm DũngQA (không ảnh → chữ cái)', 'Đỗ NgọcProduct']);
    expect(q(el, '[part~="highlight"]').textContent).toBe('Ng');
    expect(f.getAttribute('aria-activedescendant')).toBe(options(el)[0].id);

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(f.getAttribute('aria-activedescendant')).toBe(options(el)[2].id);
    await userEvent.keyboard('{Enter}');
    expect(el.value).toBe('Chào @Đỗ Ngọc ');
    expect(f.value).toBe('Chào @Đỗ Ngọc ');
    expect(isOpen(el)).toBe(false);
    expect(events.at(-1)).toEqual(['select', 'ngoc', '@']);
    expect(events.some((e) => e[0] === 'search' && e[1] === 'ng')).toBe(true);
    expect(el.mentions.map((m) => m.value)).toEqual(['Đỗ Ngọc']);
    syncUserEvent(f);

    // Email (không có khoảng trắng trước @) không kích hoạt
    await userEvent.keyboard('mail a@b');
    expect(isOpen(el)).toBe(false);
  },
};

/** Nhiều prefix: @ người, # thẻ (option.prefix giới hạn gợi ý) */
export const MultiplePrefixes = {
  render: () => html`
    <div style="max-width:480px">
      <hui-mentions id="mn-p" label="Công việc" prefix="@,#" debounce="0" no-animation .options=${[...USERS.map((u) => ({ ...u, prefix: '@' })), ...TAGS]}></hui-mentions>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#mn-p');
    const f = field(el);
    let last = null;
    el.addEventListener('hui-select', (e) => { last = e.detail; });
    await userEvent.click(f);
    await userEvent.keyboard('#');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    expect(options(el).length).toBe(3);
    await userEvent.keyboard('fe{Tab}');
    expect(el.value).toBe('#feature ');
    expect(last.prefix).toBe('#');
    syncUserEvent(f);
    await userEvent.keyboard('@le');

    await waitFor(() => expect(options(el).map((o) => o.textContent)).toEqual(['Lê ChiBackend']));
    await userEvent.keyboard('{Enter}');
    expect(el.value).toBe('#feature @Lê Chi ');
    expect(getMentions(el.value, el.mentionPrefix, { options: el.options }).map((m) => `${m.prefix}${m.value}`)).toEqual(['#feature', '@Lê Chi']);
  },
};

/** Gợi ý từ server: debounce, "Đang tải...", hủy request cũ */
export const Async = {
  render: () => html`
    <div style="max-width:480px">
      <hui-mentions id="mn-a" label="Nhắc tên (server)" prefix="@,#" debounce="50" no-animation .fetchFn=${fakeApi(120)}></hui-mentions>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#mn-a');
    const f = field(el);
    const searches = [];
    el.addEventListener('hui-search', (e) => searches.push(`${e.detail.prefix}${e.detail.query}`));
    await userEvent.click(f);
    await userEvent.keyboard('@');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    expect(q(el, '[part~="empty"]').textContent).toBe('Đang tải...');
    await userEvent.keyboard('tr');
    await waitFor(() => expect(options(el).map((o) => o.textContent)).toEqual(['Trần BìnhFrontend']));
    expect(searches.at(-1)).toBe('@tr');
    await userEvent.keyboard('{Enter}');
    expect(el.value).toBe('@Trần Bình ');
  },
};

/** Esc đóng và không tự mở lại khi gõ tiếp cùng từ; nhắc tên mới thì mở lại */
export const EscapeAndCaret = {
  render: () => html`
    <div style="max-width:420px">
      <hui-mentions id="mn-e" debounce="0" no-animation rows="4" .options=${USERS}></hui-mentions>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#mn-e');
    const f = field(el);
    await userEvent.click(f);
    await userEvent.keyboard('Một đoạn chữ khá dài trước khi @');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    // Popup đặt tại con trỏ, không phải mép trái ô
    const dd = q(el, '[part="dropdown"]').getBoundingClientRect();
    expect(dd.left).toBeGreaterThan(f.getBoundingClientRect().left + 40);

    await userEvent.keyboard('{Escape}');
    expect(isOpen(el)).toBe(false);
    await userEvent.keyboard('a');
    expect(isOpen(el)).toBe(false);
    await userEvent.keyboard(' @');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    // Khoảng trắng kết thúc từ → đóng
    await userEvent.keyboard('x ');
    expect(isOpen(el)).toBe(false);
  },
};

export const SingleLine = {
  render: () => html`
    <div style="max-width:420px">
      <hui-mentions id="mn-s" single-line label="Một dòng" placeholder="Gõ @" debounce="0" no-animation split=", " .options=${USERS}></hui-mentions>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#mn-s');
    const f = field(el);
    expect(f.tagName).toBe('INPUT');
    await userEvent.click(f);
    await userEvent.keyboard('@an');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await userEvent.keyboard('{Enter}');
    expect(el.value).toBe('@Nguyễn An, ');
    // Đổi sang textarea vẫn giữ giá trị
    el.singleLine = false;
    await waitFor(() => expect(field(el).tagName).toBe('TEXTAREA'));
    expect(field(el).value).toBe('@Nguyễn An, ');
  },
};

/** Popup phía trên + autosize */
export const PlacementTopAutosize = {
  render: () => html`
    <div style="max-width:480px;padding-top:260px">
      <hui-mentions placement="top" autosize min-rows="1" max-rows="5" placeholder="Popup mở phía trên con trỏ" .options=${USERS}></hui-mentions>
    </div>
  `,
};

/** Tham gia <form>, maxlength + bộ đếm, sự kiện change khi rời ô */
export const InForm = {
  render: () => html`
    <form id="mn-form" style="max-width:480px">
      <hui-mentions id="mn-f" name="comment" value="Hi " maxlength="18" show-count required debounce="0" no-animation .options=${USERS}></hui-mentions>
      <button type="reset">Reset</button>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#mn-form');
    const el = canvasElement.querySelector('#mn-f');
    const f = field(el);
    const changes = [];
    el.addEventListener('change', (e) => changes.push(e.detail.value));
    expect(new FormData(form).get('comment')).toBe('Hi ');
    expect(q(el, '[part="count"]').textContent).toBe('3 / 18');

    f.focus();
    f.setSelectionRange(3, 3);
    await userEvent.keyboard('@ph');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await userEvent.keyboard('{Enter}');
    expect(el.value).toBe('Hi @Phạm Dũng ');
    expect(new FormData(form).get('comment')).toBe('Hi @Phạm Dũng ');
    expect(q(el, '[part="count"]').textContent).toBe('14 / 18');
    syncUserEvent(f);

    // Chèn vượt maxlength bị chặn
    await userEvent.keyboard('@ng');
    await waitFor(() => expect(isOpen(el)).toBe(true));
    await userEvent.keyboard('{Enter}');
    expect(el.value).toBe('Hi @Phạm Dũng @ng');

    f.blur();
    expect(changes).toEqual(['Hi @Phạm Dũng @ng']);
    form.reset();
    await waitFor(() => expect(f.value).toBe('Hi '));
  },
};

export const States = {
  render: () => html`
    <div style="display:grid;gap:12px;max-width:480px">
      <hui-mentions value="Đã khóa @Nguyễn An" disabled></hui-mentions>
      <hui-mentions value="Chỉ đọc" readonly></hui-mentions>
      <hui-mentions error="Vui lòng nhắc ít nhất 1 người" .options=${USERS}></hui-mentions>
      <hui-mentions status="warning" hint="Trạng thái cảnh báo" .options=${USERS}></hui-mentions>
      <hui-mentions size="sm" single-line placeholder="size sm" .options=${USERS}></hui-mentions>
      <hui-mentions size="lg" single-line placeholder="size lg" .options=${USERS}></hui-mentions>
    </div>
  `,
};

/** Helper getMentions */
export const GetMentionsHelper = {
  render: () => html`<p>Xem play: <code>getMentions(text, prefixes, { split, options })</code></p>`,
  play: async () => {
    expect(getMentions('Chào @an và @binh!', '@')).toEqual([
      { prefix: '@', value: 'an', index: 5, end: 8 },
      { prefix: '@', value: 'binh!', index: 12, end: 18 },
    ]);
    expect(getMentions('mail a@b.c #bug', '@,#').map((m) => m.value)).toEqual(['bug']);
    const withOptions = getMentions('@Nguyễn An hỏi @Lê Chi', '@', { options: USERS });
    expect(withOptions.map((m) => [m.value, m.option.value])).toEqual([['Nguyễn An', 'an'], ['Lê Chi', 'chi']]);
    expect(getMentions('@a,@b', ['@'], { split: ',' }).map((m) => m.value)).toEqual(['a']);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .mn-custom {
        --hui-mentions-radius: 14px;
        --hui-mentions-bg: var(--hui-fill-tertiary);
        --hui-mentions-focus-border-color: var(--hui-success);
        --hui-mentions-dropdown-width: 300px;
        --hui-mentions-dropdown-radius: 14px;
        --hui-mentions-option-active-bg: var(--hui-success-light, var(--hui-fill-secondary));
        --hui-mentions-highlight-color: var(--hui-success);
      }
      .mn-custom::part(option-avatar) { --hui-avatar-radius: 6px; }
      .mn-custom::part(option-description) { font-style: italic; }
    </style>
    <div style="max-width:480px">
      <hui-mentions class="mn-custom" label="Tùy biến từ ngoài" placeholder="Gõ @" autosize .options=${USERS}></hui-mentions>
    </div>
  `,
};
