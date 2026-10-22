/**
 * Storybook Stories — HUI Command Palette
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import { fuzzyMatch } from './index.js';
import { isMacPlatform } from '../hui-kbd/index.js';
import '../hui-button/index.js';
import '../hui-kbd/index.js';

const COMMANDS = [
  { id: 'home', label: 'Trang chủ', group: 'Trang', icon: 'home', href: '#home' },
  { id: 'orders', label: 'Đơn hàng', group: 'Trang', icon: 'cart', href: '#orders', keywords: ['orders', 'mua'] },
  { id: 'customers', label: 'Khách hàng', group: 'Trang', icon: 'user', href: '#customers', description: 'Danh sách & phân nhóm khách' },
  { id: 'settings', label: 'Cài đặt tài khoản', group: 'Trang', icon: 'settings', shortcut: 'mod+,', href: '#settings' },
  { id: 'new-product', label: 'Tạo sản phẩm mới', group: 'Hành động', icon: 'plus', shortcut: 'mod+shift+n' },
  { id: 'export', label: 'Xuất báo cáo CSV', group: 'Hành động', icon: 'download', keywords: ['excel', 'export'] },
  { id: 'theme', label: 'Đổi giao diện sáng / tối', group: 'Hành động', icon: 'moon', shortcut: 'mod+j' },
  { id: 'copy-link', label: 'Sao chép liên kết trang', group: 'Hành động', icon: 'copy' },
  { id: 'logout', label: 'Đăng xuất', group: 'Tài khoản', icon: 'close', disabled: true },
];

const options = (el) => [...el.shadowRoot.querySelectorAll('[role="option"]')];
const input = (el) => el.shadowRoot.querySelector('[part="input"]');
const activeLabel = (el) => {
  const id = input(el).getAttribute('aria-activedescendant');
  return id ? el.shadowRoot.getElementById(id).querySelector('[part="option-label"]').textContent : null;
};
const pressModK = () => {
  const mac = isMacPlatform();
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', ctrlKey: !mac, metaKey: mac, bubbles: true, composed: true, cancelable: true }));
};
/** Xóa chữ trong ô nhập nằm trong shadow DOM (userEvent.clear không focus được xuyên shadow root) */
async function clearInput(el) {
  el.focus();
  await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
}
/** Chặn điều hướng href trong Storybook */
const noNav = (e) => { if (e.detail.command.href) e.preventDefault(); };

export default {
  title: 'Organisms/HuiCommandPalette',
  component: 'hui-command-palette',
  tags: ['autodocs'],
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 520 },
      description: {
        component: `
**HUI Command Palette** — Bảng lệnh mở bằng **Ctrl/⌘ + K**: tìm lệnh / trang, lọc gần đúng (**bỏ dấu tiếng Việt**: gõ "cai dat" ra "Cài đặt"),
tô sáng ký tự khớp, kết quả theo nhóm, điều hướng bàn phím theo mẫu **APG combobox + listbox**.
**Enter** chạy lệnh: phát \`hui-select\`, gọi \`action()\` nếu có, rồi mở \`href\` (Ctrl/⌘ + Enter hoặc \`target: '_blank'\` → tab mới).
Mở bằng \`<dialog>.showModal()\` + overlay manager (Esc, click ngoài, giữ focus, khóa cuộn, trả focus) như \`hui-modal\`.

\`\`\`html
<hui-command-palette id="cp" recent>
  <hui-button slot="trigger" variant="outline" icon="search">Tìm nhanh… <hui-kbd keys="mod+k"></hui-kbd></hui-button>
</hui-command-palette>
<script>
  cp.commands = [
    { id: 'orders', label: 'Đơn hàng', group: 'Trang', icon: 'cart', href: '/orders', keywords: ['orders'] },
    { id: 'theme', label: 'Đổi giao diện', group: 'Hành động', icon: 'moon', shortcut: 'mod+j', action: () => toggleTheme() },
  ];
  cp.addEventListener('hui-select', (e) => console.log(e.detail.command));
</script>
\`\`\`

### Attributes / Properties
| Tên | Type | Default | Mô tả |
|-----|------|---------|-------|
| \`commands\` | array | — | \`[{ id, label, group, icon, shortcut, keywords, description, href, target, action, disabled }]\` |
| \`open\` | boolean | \`false\` | Trạng thái mở (đọc \`isOpen\`) |
| \`hotkey\` | string | \`mod+k\` | Phím mở/đóng (cú pháp hui-hotkey), \`none\` = tắt |
| \`placeholder\` | string | "Tìm lệnh hoặc trang..." | Gợi ý ô tìm |
| \`empty-text\` | string | "Không tìm thấy lệnh phù hợp" | Khi không có kết quả |
| \`label\` | string | "Bảng lệnh" | Tên hộp thoại |
| \`recent\` | boolean | \`false\` | Nhóm "Gần đây" khi chưa gõ (lưu trong bộ nhớ) |
| \`recent-limit\` | number | \`5\` | Số lệnh gần đây tối đa |
| \`limit\` | number | \`50\` | Số kết quả tối đa |
| \`keep-open\` | boolean | \`false\` | Chọn xong vẫn mở |
| \`no-footer\` | boolean | \`false\` | Ẩn dòng gợi ý phím |
| \`no-animation\` | boolean | \`false\` | Tắt animation |

### Methods
\`open()\`, \`close()\`, \`toggle()\`, \`isOpen\`, \`query\` (đọc/ghi từ khóa), \`results\`, \`recentIds\`, \`clearRecent()\`.
Hàm lọc dùng lại: \`import { fuzzyMatch, foldText } from '@itmrhoang/h-ui/hui-command-palette'\`.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-open\` / \`hui-close\` | — | Mở / đóng |
| \`hui-select\` | \`{ command, originalEvent }\` | Chọn lệnh. Cancelable → không chạy action/href, bảng giữ nguyên |
| \`hui-search\` | \`{ query, count }\` | Từ khóa đổi |

### Slots
\`trigger\` (bấm để mở), \`empty\` (thay trạng thái rỗng), \`footer\` (thay dòng gợi ý phím).

### Parts
\`dialog\`, \`mask\`, \`panel\`, \`search\`, \`search-icon\`, \`input\`, \`list\`, \`group\`, \`group-label\`, \`option\`, \`option-active\`, \`option-icon\`,
\`option-label\`, \`option-description\`, \`option-shortcut\`, \`match\`, \`empty\`, \`footer\`. States: \`:state(open)\`, \`:state(empty)\`.

### CSS Variables
\`--hui-command-palette-width\`, \`--hui-command-palette-top\`, \`--hui-command-palette-max-height\`, \`--hui-command-palette-bg\`, \`--hui-command-palette-radius\`,
\`--hui-command-palette-shadow\`, \`--hui-command-palette-mask-bg\`, \`--hui-command-palette-active-bg\`, \`--hui-command-palette-match-color\`, \`--hui-command-palette-font-size\`.

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`Ctrl/⌘ + K\` | Mở / đóng (kể cả khi đang ở ô nhập khác) |
| \`↑ ↓\` | Lệnh trước / sau (vòng, bỏ qua lệnh disabled) |
| \`PageUp\` / \`PageDown\` | Nhảy 5 lệnh |
| \`Ctrl + Home / End\` | Lệnh đầu / cuối |
| \`Enter\` | Chạy lệnh (\`Ctrl/⌘ + Enter\`: mở href ở tab mới) |
| \`Esc\` | Đóng, trả focus về chỗ cũ |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-command-palette .commands=${COMMANDS} @hui-select=${noNav}>
      <hui-button slot="trigger" variant="outline" icon="search">Tìm nhanh… <hui-kbd keys="mod+k" size="sm"></hui-kbd></hui-button>
    </hui-command-palette>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-command-palette');
    await expect(el.isOpen).toBe(false);
    pressModK();
    await waitFor(() => expect(el.isOpen).toBe(true));
    const dlg = el.shadowRoot.querySelector('dialog');
    await waitFor(() => expect(dlg.open).toBe(true));
    await waitFor(() => expect(el.shadowRoot.activeElement).toBe(input(el)));
    await expect(input(el).getAttribute('role')).toBe('combobox');
    await expect(el.shadowRoot.querySelectorAll('[part="group-label"]').length).toBe(3);
    await expect(activeLabel(el)).toBe('Trang chủ');

    // Gõ không dấu → khớp có dấu, tô sáng ký tự
    await userEvent.type(input(el), 'cai dat');
    await expect(options(el).length).toBe(1);
    await expect(activeLabel(el)).toBe('Cài đặt tài khoản');
    const marks = [...options(el)[0].querySelectorAll('mark')].map((m) => m.textContent).join('');
    await expect(marks).toBe('Cài đặt');

    // Từ khóa (keywords)
    await clearInput(input(el));
    await userEvent.type(input(el), 'excel');
    await expect(activeLabel(el)).toBe('Xuất báo cáo CSV');

    // Mũi tên + Enter → hui-select
    await clearInput(input(el));
    let selected = null;
    el.addEventListener('hui-select', (e) => { selected = e.detail.command; }, { once: true });
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(activeLabel(el)).toBe('Khách hàng');
    await userEvent.keyboard('{ArrowUp}');
    await expect(activeLabel(el)).toBe('Đơn hàng');
    await userEvent.keyboard('{Enter}');
    await expect(selected.id).toBe('orders');

    // Esc đóng
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(el.isOpen).toBe(false));
    await waitFor(() => expect(dlg.open).toBe(false));

    // Bấm trigger cũng mở; chạy lệnh có action → đóng
    let ran = false;
    el.commands = [...COMMANDS, { id: 'act', label: 'Chạy hành động thử', group: 'Thử', action: () => { ran = true; } }];
    await userEvent.click(canvasElement.querySelector('hui-button'));
    await waitFor(() => expect(el.isOpen).toBe(true));
    await userEvent.type(input(el), 'chay hanh');
    await userEvent.keyboard('{Enter}');
    await expect(ran).toBe(true);
    await waitFor(() => expect(el.isOpen).toBe(false));
  },
};

/** Lệnh gần đây (recent) + bỏ qua lệnh disabled khi di chuyển */
export const RecentCommands = {
  render: () => html`
    <hui-command-palette recent recent-limit="3" .commands=${COMMANDS.map(({ href, ...c }) => c)}>
      <hui-button slot="trigger" icon="search">Mở bảng lệnh</hui-button>
    </hui-command-palette>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-command-palette');
    // keep-open tạm để chạy liên tiếp 2 lệnh
    el.keepOpen = true;
    el.open();
    await waitFor(() => expect(el.isOpen).toBe(true));
    await userEvent.type(input(el), 'xuat');
    await userEvent.keyboard('{Enter}');
    el.query = 'khach';
    await userEvent.keyboard('{Enter}');
    el.query = '';
    await expect(el.recentIds).toEqual(['customers', 'export']);
    const firstGroup = el.shadowRoot.querySelector('[part="group-label"]');
    await expect(firstGroup.textContent).toBe('Gần đây');
    await expect(activeLabel(el)).toBe('Khách hàng');
    // Lệnh disabled không được chọn khi đi vòng
    await userEvent.keyboard('{ArrowUp}');
    await expect(activeLabel(el)).not.toBe('Đăng xuất');
    el.keepOpen = false;
    el.close();
    await waitFor(() => expect(el.isOpen).toBe(false));
  },
};

/** Không có kết quả: chữ mặc định hoặc slot="empty" */
export const EmptyState = {
  render: () => html`
    <hui-command-palette open .commands=${COMMANDS.slice(0, 4)} hotkey="none">
      <div slot="empty" style="display: grid; gap: 6px; justify-items: center;">
        <strong>Không có lệnh nào khớp</strong>
        <span>Thử từ khóa khác, ví dụ “đơn hàng”.</span>
      </div>
    </hui-command-palette>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-command-palette');
    await waitFor(() => expect(el.shadowRoot.querySelector('dialog').open).toBe(true));
    el.query = 'zzzz';
    await expect(options(el).length).toBe(0);
    await expect(el.shadowRoot.querySelector('[part="empty"]').hidden).toBe(false);
    await expect(el.matches(':state(empty)')).toBe(true);
    await expect(input(el).hasAttribute('aria-activedescendant')).toBe(false);
    el.close();
  },
};

/** Thuật toán lọc: chuỗi con > đầu từ > từng ký tự lần lượt; bỏ dấu tiếng Việt */
export const FuzzyMatching = {
  render: () => html`
    <ul style="font-family: var(--hui-font-family); color: var(--hui-text); line-height: 1.8;">
      <li><code>"dh"</code> khớp <b>Đ</b>ơn <b>h</b>àng (đầu từ)</li>
      <li><code>"cai dat"</code> khớp <b>Cài đặt</b> tài khoản (bỏ dấu)</li>
      <li><code>"xbc"</code> khớp <b>X</b>uất <b>b</b>áo <b>c</b>áo</li>
    </ul>
  `,
  play: async () => {
    await expect(fuzzyMatch('dh', 'Đơn hàng').indices).toEqual([0, 4]);
    await expect(fuzzyMatch('cai dat', 'Cài đặt tài khoản').indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
    await expect(fuzzyMatch('xbc', 'Xuất báo cáo CSV').indices).toEqual([0, 5, 9]);
    await expect(fuzzyMatch('qqq', 'Đơn hàng')).toBe(null);
    // Chuỗi con ở đầu được điểm cao hơn khớp rải rác
    await expect(fuzzyMatch('don', 'Đơn hàng').score).toBeGreaterThan(fuzzyMatch('don', 'Ẩn định dạng ổn').score);
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .custom-cp {
        --hui-command-palette-width: 520px;
        --hui-command-palette-radius: 4px;
        --hui-command-palette-active-bg: var(--hui-success-light);
        --hui-command-palette-match-color: var(--hui-success);
        --hui-command-palette-top: 20vh;
      }
      .custom-cp::part(group-label) { text-transform: none; font-style: italic; }
      .custom-cp::part(option-active) { box-shadow: inset 3px 0 0 var(--hui-success); }
    </style>
    <hui-command-palette class="custom-cp" .commands=${COMMANDS} @hui-select=${noNav}>
      <hui-button slot="trigger" variant="dashed" icon="search">Bảng lệnh tùy biến</hui-button>
    </hui-command-palette>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-command-palette');
    el.open();
    await waitFor(() => expect(el.shadowRoot.querySelector('dialog').open).toBe(true));
    const panel = el.shadowRoot.querySelector('[part="panel"]');
    await expect(getComputedStyle(panel).borderTopLeftRadius).toBe('4px');
    const active = el.shadowRoot.querySelector('[part~="option-active"]');
    await expect(getComputedStyle(active).boxShadow).not.toBe('none');
    await expect(getComputedStyle(el.shadowRoot.querySelector('[part="group-label"]')).fontStyle).toBe('italic');
    el.close();
    await waitFor(() => expect(el.isOpen).toBe(false));
  },
};
