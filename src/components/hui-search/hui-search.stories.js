/**
 * Storybook Stories — HUI Search (ô tìm kiếm, gợi ý tùy chọn)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const q = (el, sel) => el.shadowRoot.querySelector(sel);
const options = (el) => [...el.shadowRoot.querySelectorAll('[role="option"]')];

const PRODUCTS = ['Áo thun cotton', 'Áo sơ mi', 'Quần jean', 'Quần short', 'Giày thể thao', 'Giày da', 'Túi xách', 'Mũ lưỡi trai'];

export default {
  title: 'Molecules/HuiSearch',
  component: 'hui-search',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Search** — ô tìm kiếm (Ant Input.Search): icon kính lúp, nút xóa, nút tìm tùy chọn, phát \`hui-search\`
sau debounce khi gõ và **ngay lập tức** khi Enter / bấm nút / xóa. Phím tắt \`/\` (hoặc \`ctrl+k\`, \`mod+k\`) focus ô từ bất kỳ đâu.
Kế thừa **hui-autocomplete** → gán \`options\` / \`fetchFn\` là có gợi ý (không gán = ô tìm thường, \`type="search"\`).

\`\`\`html
<hui-search placeholder="Tìm sản phẩm..." shortcut enter-button="Tìm"></hui-search>
<script>
  el.addEventListener('hui-search', (e) => load(e.detail.query));
</script>
\`\`\`

### Attributes (thêm vào hui-autocomplete)
| Attribute | Kiểu | Mặc định | Mô tả |
|-----------|------|----------|-------|
| \`shortcut\` | string | — | Phím tắt focus: rỗng = \`/\`; \`ctrl+k\`, \`mod+k\` (⌘ trên Mac, Ctrl nơi khác) |
| \`enter-button\` | string | — | Nút tìm bên phải: rỗng = nút icon, có chữ = nút chữ |
| \`debounce\` | number (ms) | \`300\` | Trễ \`hui-search\` khi gõ |
| \`options\` / \`fetchFn\` / \`min-chars\` … | — | — | Gợi ý — xem HuiAutocomplete |
| \`placeholder\` / \`label\` / \`size\` / \`loading\` / \`disabled\` / \`name\` | — | — | Như hui-autocomplete (luôn \`free-solo\`, luôn có nút xóa) |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-search\` | \`{ query, trigger: 'input' \\| 'enter' \\| 'button' \\| 'clear' }\` | Gõ (sau debounce) / Enter / bấm nút / xóa |
| \`input\` | \`{ value }\` | Chữ đổi |
| \`change\` | \`{ value }\` | Chữ đã chốt (Enter, chọn gợi ý, rời ô) |
| \`hui-select\` | \`{ value, label, option }\` | Chọn gợi ý |

### Slots
\`prefix\` (thay icon kính lúp), \`suffix\`.

### Parts
\`icon\`, \`shortcut\` (\`<kbd>\`), \`submit\` + toàn bộ part của hui-autocomplete (\`container\`, \`input\`, \`clear\`, \`dropdown\`, \`option\`…).

### CSS Variables
\`--hui-search-height | radius | bg | border-color | focus-border-color | icon-color | button-bg | button-color\`
(và \`--hui-autocomplete-*\` cho popup gợi ý).

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`/\` (hoặc phím trong \`shortcut\`) | Focus ô tìm (khi không gõ ở ô khác) |
| \`Enter\` | Tìm ngay (hoặc chọn gợi ý đang highlight) |
| \`Esc\` | Đóng gợi ý; đang đóng thì xóa chữ |
| \`↓\` / \`↑\` | Chuyển gợi ý (khi có options / fetchFn) |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <div style="max-width:360px"><hui-search placeholder="Tìm sản phẩm..." shortcut></hui-search></div>
  `,
};

/** Debounce khi gõ, Enter / nút / xóa phát ngay */
export const Events = {
  render: () => html`
    <div style="max-width:360px"><hui-search id="s-e" debounce="80" enter-button="Tìm" placeholder="Từ khóa"></hui-search></div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#s-e');
    const input = q(el, 'input');
    expect(input.type).toBe('search');
    expect(input.hasAttribute('role')).toBe(false); // không gợi ý → ô tìm thường
    const log = [];
    el.addEventListener('hui-search', (e) => log.push(`${e.detail.trigger}:${e.detail.query}`));

    await userEvent.click(input);
    await userEvent.keyboard('áo');
    expect(log).toEqual([]); // đang chờ debounce
    await waitFor(() => expect(log).toEqual(['input:áo']));
    await userEvent.keyboard('{Enter}');
    expect(log.at(-1)).toBe('enter:áo');
    await userEvent.click(q(el, '[part="submit"]'));
    expect(log.at(-1)).toBe('button:áo');
    await userEvent.click(q(el, '[part="clear"]'));
    expect(log.at(-1)).toBe('clear:');
    expect(el.value).toBe('');
  },
};

/** Phím tắt "/" focus ô tìm; không cướp phím khi đang gõ ở ô khác */
export const Shortcut = {
  render: () => html`
    <div style="display:grid;gap:12px;max-width:360px">
      <hui-search id="s-k" shortcut placeholder="Bấm / để tìm"></hui-search>
      <input id="s-k-other" placeholder="Ô khác" aria-label="Ô khác" />
      <hui-search shortcut="ctrl+k" placeholder="Ctrl K"></hui-search>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#s-k');
    const other = canvasElement.querySelector('#s-k-other');
    expect(q(el, '[part="shortcut"]').textContent).toBe('/');
    other.focus();
    await userEvent.keyboard('/');
    expect(other.value).toBe('/'); // đang gõ ở ô khác → không cướp
    other.blur();
    document.body.focus();
    await userEvent.keyboard('/');
    expect(el.shadowRoot.activeElement).toBe(q(el, 'input'));
    expect(q(el, 'input').value).toBe('');
  },
};

/** Có options → thành combobox gợi ý (kế thừa hui-autocomplete) */
export const WithSuggestions = {
  render: () => html`
    <div style="max-width:360px"><hui-search id="s-s" debounce="0" placeholder="Tìm sản phẩm..." .options=${PRODUCTS}></hui-search></div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#s-s');
    const input = q(el, 'input');
    expect(input.getAttribute('role')).toBe('combobox');
    const log = [];
    el.addEventListener('hui-search', (e) => log.push(`${e.detail.trigger}:${e.detail.query}`));
    await userEvent.click(input);
    await userEvent.keyboard('giay');
    await waitFor(() => expect(options(el).length).toBe(2));
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(el.value).toBe('Giày thể thao');
    // chưa highlight gợi ý nào → Enter = tìm
    await userEvent.keyboard('{Enter}');
    expect(log.at(-1)).toBe('enter:Giày thể thao');
  },
};

export const EnterButtonAndSizes = {
  render: () => html`
    <div style="display:grid;gap:12px;max-width:360px">
      <hui-search size="sm" placeholder="sm" enter-button></hui-search>
      <hui-search size="md" placeholder="md" enter-button="Tìm kiếm"></hui-search>
      <hui-search size="lg" placeholder="lg" loading></hui-search>
      <hui-search disabled placeholder="Disabled"></hui-search>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .s-pill {
        --hui-search-radius: 999px;
        --hui-search-bg: var(--hui-fill-tertiary);
        --hui-search-border-color: transparent;
        --hui-search-icon-color: var(--hui-primary);
        --hui-search-button-bg: var(--hui-success);
      }
      .s-pill::part(shortcut) { border-radius: 999px; }
    </style>
    <div style="max-width:360px"><hui-search class="s-pill" shortcut placeholder="Tùy biến từ ngoài" enter-button="Đi"></hui-search></div>
  `,
};
