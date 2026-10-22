/**
 * Storybook Stories — HUI Search Overlay (Organism)
 * Lớp phủ tìm kiếm toàn màn hình: phím / và Ctrl+K, gợi ý tĩnh hoặc fetchFn, lịch sử, combobox + listbox.
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const SUGGESTIONS = [
  { label: 'Điện thoại iPhone 16', description: 'Điện thoại · từ 22.990.000₫', icon: 'phone', group: 'Sản phẩm' },
  { label: 'Điện thoại Samsung Galaxy', description: 'Điện thoại · từ 7.490.000₫', icon: 'phone', group: 'Sản phẩm' },
  { label: 'Tai nghe không dây', description: 'Phụ kiện', icon: 'tag', group: 'Sản phẩm' },
  { label: 'Áo khoác gió', description: 'Thời trang nam', icon: 'tag', group: 'Sản phẩm' },
  { label: 'Chính sách đổi trả', description: 'Hỗ trợ', icon: 'info', group: 'Trang' },
  { label: 'Theo dõi đơn hàng', description: 'Hỗ trợ', icon: 'truck', group: 'Trang' },
];

const CATALOG = ['Bàn phím cơ', 'Bàn làm việc', 'Bàn chải điện', 'Balo laptop', 'Bình giữ nhiệt', 'Bút ký', 'Đèn bàn LED', 'Chuột không dây'];

const input = (so) => so.shadowRoot.querySelector('[part="input"]');
const options = (so) => [...so.shadowRoot.querySelectorAll('[role="option"]')];
const dialog = (so) => so.shadowRoot.querySelector('[part="dialog"]');
const clear = (key) => { try { localStorage.removeItem(key); } catch { /* bỏ qua */ } };

export default {
  title: 'Organisms/HuiSearchOverlay',
  component: 'hui-search-overlay',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Search Overlay** — bấm kính lúp (hoặc phím \`/\`, \`Ctrl\`/\`⌘\`+\`K\`) → lớp phủ toàn màn hình với ô tìm lớn,
gợi ý, lịch sử tìm kiếm.

\`\`\`html
<hui-search-overlay id="so" recent-key="shop-recent"></hui-search-overlay>
<script>
  so.suggestions = [{ label: 'Điện thoại', description: '…', href: '/c/phone', icon: 'phone', group: 'Danh mục' }];
  // hoặc lấy từ API (debounce, tự hủy yêu cầu cũ):
  so.fetchFn = async (q, { signal }) => (await fetch('/api/suggest?q=' + encodeURIComponent(q), { signal })).json();
  so.addEventListener('hui-search', (e) => location.href = '/search?q=' + encodeURIComponent(e.detail.query));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`open\` | boolean | \`false\` | Trạng thái mở |
| \`placeholder\` | string | theo locale | Placeholder |
| \`suggestions\` | JSON array | — | Chuỗi hoặc \`{ label, value, description, href, icon, group, keywords }\` — lọc không phân biệt dấu |
| \`debounce\` | number | \`250\` | Trễ gọi fetchFn (ms) |
| \`min-chars\` | number | \`1\` | Số ký tự tối thiểu |
| \`max-results\` | number | \`8\` | Số gợi ý tối đa |
| \`recent-key\` | string | — | Lưu lịch sử trong localStorage (bị chặn → nhớ trong phiên) |
| \`max-recent\` | number | \`5\` | Số mục lịch sử |
| \`hotkeys\` | string | \`'/ mod+k'\` | \`/\`, \`mod+k\` (Ctrl hoặc ⌘), \`ctrl+k\`, \`meta+k\`; \`none\` = tắt |
| \`label\` | string | theo locale | Nhãn hộp thoại / ô tìm |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng |

### Properties & methods
\`fetchFn(query, { signal })\` → \`Promise<Array>\` · \`query\` (đọc/ghi) · \`recentSearches\` · \`show()\` · \`hide()\` · \`clearRecent()\`

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-search\` | \`{ query, recent }\` | Enter không chọn gợi ý / chọn mục lịch sử. Cancelable (giữ lớp phủ mở) |
| \`hui-select\` | \`{ item, query }\` | Chọn gợi ý. Cancelable (không đóng, không theo \`href\`) |
| \`hui-open\` / \`hui-close\` | — | Mở / đóng |
| \`hui-error\` | \`{ error, query }\` | fetchFn lỗi |

### Slots
_(default)_ trigger (mặc định: nút kính lúp + phím tắt) · \`empty\` — nội dung khi ô trống và chưa có lịch sử.

### Parts
\`trigger\`, \`shortcut\`, \`dialog\`, \`panel\`, \`bar\`, \`input\`, \`spinner\`, \`clear\`, \`close\`, \`results\`, \`section-title\`,
\`clear-recent\`, \`listbox\`, \`option\`, \`option-active\`, \`status\`, \`footer\`

### CSS Variables
\`--hui-search-overlay-bg\`, \`-backdrop-filter\` (blur 8px), \`-max-width\` (720px), \`-top\`, \`-input-size\` (1.75rem), \`-input-color\`,
\`-border-color\`, \`-accent\`, \`-option-active-bg\`, \`-mark-bg\`, \`-z-index\`

### Bàn phím (APG combobox + listbox)
| Phím | Hành động |
|------|-----------|
| \`/\` · \`Ctrl\`/\`⌘\`+\`K\` | Mở (\`/\` không tác dụng khi đang gõ trong ô nhập khác) |
| \`↓\` / \`↑\` | Di chuyển trong gợi ý (\`aria-activedescendant\`, focus vẫn ở ô tìm) |
| \`Enter\` | Chọn gợi ý đang sáng, hoặc tìm nội dung đã gõ |
| \`Shift\`+\`Delete\` | Xóa mục lịch sử đang sáng |
| \`Esc\` | Đóng, trả focus về trigger |
| \`Tab\` | Focus bị giữ trong lớp phủ |

Số kết quả / không có kết quả / lỗi được đọc qua vùng \`role="status"\`. Gõ bằng bộ gõ (IME) không bị Enter cắt ngang.
        `,
      },
    },
  },
};

export const Default = {
  render: () => {
    clear('story-so-recent');
    return html`
      <hui-search-overlay recent-key="story-so-recent" placeholder="Tìm sản phẩm, trang hỗ trợ…" .suggestions=${SUGGESTIONS}>
        <div slot="empty" style="display: flex; flex-wrap: wrap; gap: 8px; color: var(--hui-text-secondary);">
          Phổ biến: <a href="#">iPhone</a> <a href="#">Tai nghe</a> <a href="#">Áo khoác</a>
        </div>
      </hui-search-overlay>
    `;
  },
  play: async ({ canvasElement }) => {
    const so = canvasElement.querySelector('hui-search-overlay');
    await so.updateComplete;
    const trigger = so.shadowRoot.querySelector('[part="trigger"]');
    await expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');

    // Chuột / Enter đều sinh click trên nút; focus trước để kiểm tra trả focus khi đóng
    trigger.focus();
    trigger.click();
    await waitFor(() => expect(dialog(so).open).toBe(true));
    await expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await waitFor(() => expect(so.shadowRoot.activeElement).toBe(input(so)));
    await expect(input(so).getAttribute('role')).toBe('combobox');

    // Không phân biệt dấu: "dien" khớp "Điện thoại"
    await userEvent.type(input(so), 'dien');
    await waitFor(() => expect(options(so).length).toBe(2));
    await expect(options(so)[0].querySelector('mark').textContent).toBe('Điện');
    await expect(input(so).getAttribute('aria-expanded')).toBe('true');

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(input(so).getAttribute('aria-activedescendant')).toBe(options(so)[1].id);
    await expect(options(so)[1].getAttribute('aria-selected')).toBe('true');
    await userEvent.keyboard('{ArrowDown}'); // vòng về đầu
    await expect(input(so).getAttribute('aria-activedescendant')).toBe(options(so)[0].id);

    let selected = null;
    so.addEventListener('hui-select', (e) => { selected = e.detail; }, { once: true });
    await userEvent.keyboard('{Enter}');
    await expect(selected.item.label).toBe('Điện thoại iPhone 16');
    await expect(selected.query).toBe('dien');
    await waitFor(() => expect(dialog(so).open).toBe(false));
    // Trả focus về trigger
    await waitFor(() => expect(so.shadowRoot.activeElement).toBe(trigger));
    await expect(so.recentSearches).toEqual(['dien']);
    clear('story-so-recent');
  },
};

export const HotkeysAndRecent = {
  name: 'Phím tắt + lịch sử tìm',
  render: () => {
    clear('story-so-hotkey');
    return html`
      <p style="color: var(--hui-text-secondary)">Nhấn <kbd>/</kbd> hoặc <kbd>Ctrl</kbd>+<kbd>K</kbd> để mở.</p>
      <hui-search-overlay recent-key="story-so-hotkey" no-animation .suggestions=${CATALOG}></hui-search-overlay>
      <input id="other" placeholder="Ô nhập khác (gõ / ở đây không mở)">
    `;
  },
  play: async ({ canvasElement }) => {
    const so = canvasElement.querySelector('hui-search-overlay');
    await so.updateComplete;

    // "/" trong ô nhập khác → không mở
    canvasElement.querySelector('#other').focus();
    await userEvent.keyboard('/');
    await expect(so.open).toBe(false);
    canvasElement.querySelector('#other').blur();

    // Ctrl+K → mở; Esc → đóng
    await userEvent.keyboard('{Control>}k{/Control}');
    await waitFor(() => expect(dialog(so).open).toBe(true));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(dialog(so).open).toBe(false));

    // "/" → mở; gõ + Enter → hui-search, lưu lịch sử
    document.body.focus();
    await userEvent.keyboard('/');
    await waitFor(() => expect(dialog(so).open).toBe(true));
    const searches = [];
    so.addEventListener('hui-search', (e) => searches.push(e.detail));
    await waitFor(() => expect(so.shadowRoot.activeElement).toBe(input(so)));
    await userEvent.type(input(so), 'bàn phím');
    await userEvent.keyboard('{Enter}');
    await expect(searches[0]).toEqual({ query: 'bàn phím', recent: false });
    await waitFor(() => expect(dialog(so).open).toBe(false));
    await expect(JSON.parse(localStorage.getItem('story-so-hotkey'))).toEqual(['bàn phím']);

    // Mở lại: ô trống → hiện lịch sử; chọn mục lịch sử → tìm lại
    so.show();
    await waitFor(() => expect(dialog(so).open).toBe(true));
    await waitFor(() => expect(options(so).length).toBe(1));
    await expect(so.shadowRoot.querySelector('[part="section-title"]').textContent).toBe('Tìm kiếm gần đây');
    options(so)[0].click();
    await expect(searches[1]).toEqual({ query: 'bàn phím', recent: true });

    // Xóa lịch sử
    so.show();
    await waitFor(() => expect(dialog(so).open).toBe(true));
    so.shadowRoot.querySelector('[part="clear-recent"]').click();
    await expect(so.recentSearches).toEqual([]);
    await expect(options(so).length).toBe(0);
    so.hide();
    clear('story-so-hotkey');
  },
};

export const AsyncFetch = {
  name: 'fetchFn bất đồng bộ',
  render: () => html`<hui-search-overlay debounce="150" no-animation hotkeys="none"></hui-search-overlay>`,
  play: async ({ canvasElement }) => {
    const so = canvasElement.querySelector('hui-search-overlay');
    const calls = [];
    so.fetchFn = (q, { signal }) => new Promise((resolve, reject) => {
      calls.push({ q, signal });
      if (q === 'loi') { setTimeout(() => reject(new Error('500')), 50); return; }
      setTimeout(() => resolve(CATALOG.filter((s) => s.toLowerCase().includes(q.toLowerCase())).map((label) => ({ label, href: '' }))), 120);
    });
    await so.updateComplete;
    so.show();
    await waitFor(() => expect(dialog(so).open).toBe(true));

    // Gõ liên tiếp → debounce: chỉ 1 lần gọi với chuỗi cuối
    await userEvent.type(input(so), 'bàn');
    await waitFor(() => expect(so.shadowRoot.querySelector('[part="spinner"]').hidden).toBe(false));
    await expect(so.shadowRoot.querySelector('[part="status"]').textContent).toBe('Đang tìm…');
    await waitFor(() => expect(options(so).length).toBe(4));
    await expect(calls.map((c) => c.q)).toEqual(['bàn']);
    await expect(so.shadowRoot.querySelector('[part="spinner"]').hidden).toBe(true);
    await expect(so.shadowRoot.querySelector('[part="status"]').textContent).toBe('4 gợi ý');

    // Không có kết quả
    so.query = 'xyz';
    await waitFor(() => expect(so.shadowRoot.querySelector('[part="status"]').textContent).toContain('Không tìm thấy'));

    // Lỗi
    let error = null;
    so.addEventListener('hui-error', (e) => { error = e.detail; }, { once: true });
    so.query = 'loi';
    await waitFor(() => expect(error?.query).toBe('loi'));
    await expect(so.shadowRoot.querySelector('[part="status"]').classList.contains('so__status--error')).toBe(true);
    so.hide();
  },
};

export const CustomTrigger = {
  name: 'Trigger tùy biến',
  render: () => html`
    <hui-search-overlay hotkeys="mod+k" .suggestions=${SUGGESTIONS}>
      <hui-button variant="outline" icon="search">Tìm kiếm</hui-button>
    </hui-search-overlay>
  `,
  play: async ({ canvasElement }) => {
    const so = canvasElement.querySelector('hui-search-overlay');
    await so.updateComplete;
    const btn = so.querySelector('hui-button');
    await expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    btn.click();
    await waitFor(() => expect(dialog(so).open).toBe(true));
    // Chặn hui-search → lớp phủ giữ mở
    so.addEventListener('hui-search', (e) => e.preventDefault(), { once: true });
    so.query = 'áo';
    input(so).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await expect(dialog(so).open).toBe(true);
    so.hide();
    await waitFor(() => expect(dialog(so).open).toBe(false));
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-so {
        --hui-search-overlay-bg: color-mix(in srgb, var(--hui-primary-9) 94%, transparent);
        --hui-search-overlay-input-color: var(--hui-text-light-solid);
        --hui-search-overlay-accent: var(--hui-warning);
        --hui-search-overlay-border-color: rgb(255 255 255 / 0.25);
        --hui-search-overlay-max-width: 560px;
        --hui-search-overlay-input-size: 2rem;
      }
      .brand-so::part(option) { color: var(--hui-text-light-solid); }
      .brand-so::part(option-active) { background: rgb(255 255 255 / 0.12); }
      .brand-so::part(trigger) { border-radius: 999px; }
    </style>
    <hui-search-overlay class="brand-so" .suggestions=${SUGGESTIONS}></hui-search-overlay>
  `,
};
