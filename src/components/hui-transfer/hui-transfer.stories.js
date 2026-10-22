/**
 * Storybook Stories — HUI Transfer
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import { VN_ADMIN } from '../hui-tree/vn-admin-data.js';

/** 12 quận / huyện, mô tả = tỉnh / thành */
const DISTRICTS = () => VN_ADMIN.flatMap((p) => p.children.map((d) => ({ key: d.value, title: d.label, description: p.label })));
const BIG = (n = 2000) => Array.from({ length: n }, (_, i) => ({ key: `u${i}`, title: `Nhân viên ${i + 1}`, description: `Phòng ${(i % 12) + 1}` }));

const list = (el, side) => el.shadowRoot.querySelector(`[part~="list-${side}"]`);
const items = (el, side) => [...list(el, side).querySelectorAll('[role="option"]')];
const titlesOf = (el, side) => items(el, side).map((i) => i.querySelector('[part="item-title"]')?.textContent ?? i.textContent);
const itemOf = (el, side, text) => items(el, side).find((i) => i.textContent.includes(text));
const count = (el, side) => list(el, side).querySelector('[part="count"]').textContent;
const moveRight = (el) => el.shadowRoot.querySelector('[part~="move-right"]');
const moveLeft = (el) => el.shadowRoot.querySelector('[part~="move-left"]');

export default {
  title: 'Organisms/HuiTransfer',
  component: 'hui-transfer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Transfer** — Hai danh sách chuyển qua lại (Ant Transfer). Mỗi danh sách: tiêu đề, ô **chọn tất cả** kèm đếm "3/10 mục",
tìm kiếm **không dấu** (tô đậm), phân trang (\`page-size\`) hoặc \`virtual\` cho danh sách rất dài, item tùy biến bằng
\`renderItem(item)\` hoặc \`<template>\` con. \`one-way\`: chỉ chuyển sang đích, bỏ bằng nút ✕. Tham gia \`<form>\` (giá trị = targetKeys).
Màn hẹp: hai danh sách xếp dọc.

\`\`\`html
<hui-transfer name="districts" show-search titles='["Có thể chọn","Đã chọn"]'></hui-transfer>
<script>
  el.dataSource = [{ key: 'hn-bd', title: 'Quận Ba Đình', description: 'Hà Nội' }, ...];
  el.targetKeys = ['hn-bd'];
  el.addEventListener('hui-change', (e) => console.log(e.detail.targetKeys, e.detail.direction, e.detail.moveKeys));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`value\` | JSON | \`[]\` | Khóa ở danh sách đích (= \`targetKeys\`) |
| \`data-source\` | JSON | \`[]\` | \`[{ key, title, description, disabled }]\` — nên gán bằng property \`dataSource\` |
| \`selected-keys\` | JSON | \`[]\` | Khóa đang check (cả hai bên) |
| \`titles\` | JSON | \`["Nguồn","Đích"]\` | Tiêu đề hai danh sách |
| \`show-search\` / \`search-placeholder\` | boolean / string | — | Ô tìm kiếm mỗi danh sách |
| \`one-way\` | boolean | \`false\` | Một chiều |
| \`page-size\` | number | — | Phân trang |
| \`virtual\` | boolean | \`false\` | Chỉ vẽ mục đang nhìn thấy (khi không phân trang) |
| \`name\` / \`required\` / \`disabled\` | — | — | Như control form (\`required\` = đích phải có ít nhất 1 mục) |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng trượt khi chuyển |

### Properties
| Property | Kiểu | Mô tả |
|----------|------|-------|
| \`targetKeys\` | \`Array\` | Alias của \`value\` |
| \`renderItem\` | \`(item) => string \\| Node\` | Tự vẽ nội dung item (tên \`render\` trùng method nội bộ nên đổi thành \`renderItem\`) |
| \`filterOption\` | \`(query, item, direction) => boolean\` | Luật lọc riêng |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ value, targetKeys, direction, moveKeys }\` | Sau khi chuyển (\`direction\`: \`right\` = sang đích, \`left\` = về nguồn) |
| \`hui-change\` | \`{ targetKeys, direction, moveKeys }\` | Như \`change\` (tên kiểu Ant) |
| \`hui-select-change\` | \`{ sourceSelectedKeys, targetSelectedKeys }\` | Đổi mục đang check |
| \`hui-search\` | \`{ direction, value }\` | Gõ ô tìm kiếm |

### Slots
Default slot: \`<template>\` mẫu cho item (\`data-bind="title"\`, \`data-bind="description"\`…, xem core/template).

### Parts
\`base\`, \`list\` (+ \`list-source\` \\| \`list-target\`), \`header\`, \`select-all\`, \`count\`, \`title\`, \`search\`, \`body\`,
\`item\` (+ \`item-checked\` \\| \`item-active\` \\| \`item-disabled\`), \`checkbox\` (+ \`checkbox-checked\` \\| \`checkbox-indeterminate\`),
\`item-title\`, \`item-description\`, \`item-remove\`, \`highlight\`, \`empty\`, \`pagination\`, \`operations\`, \`move-button\` (+ \`move-right\` \\| \`move-left\`).

### CSS Variables
\`--hui-transfer-list-width\`, \`-list-height\`, \`-radius\`, \`-border-color\`, \`-bg\`, \`-header-bg\`, \`-item-padding\`, \`-item-hover-bg\`,
\`-item-checked-bg\`, \`-checked-bg\`, \`-highlight-color\`, \`-gap\` (tiền tố \`--hui-transfer\`).

### Bàn phím (mỗi danh sách là listbox chọn nhiều)
| Phím | Tác dụng |
|------|----------|
| \`↑\` / \`↓\` / \`Home\` / \`End\` | Di chuyển mục đang focus |
| \`Shift\` + \`↑\` / \`↓\` | Di chuyển và check thêm |
| \`Space\` | Check / bỏ check |
| \`Ctrl/⌘ + A\` | Check / bỏ check tất cả (đang lọc) |
| \`Enter\` | Chuyển các mục đang check sang bên kia (không có thì chuyển mục đang focus) |
| \`PageUp\` / \`PageDown\` | Trang trước / sau (page-size) |
| \`Delete\` / \`Backspace\` | one-way: bỏ mục khỏi danh sách đích |
| \`↓\` (trong ô tìm kiếm) | Vào danh sách |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-transfer id="tf-default" .titles=${['Quận / huyện', 'Vùng phục vụ']} .dataSource=${DISTRICTS()} .targetKeys=${['dn-hc']}></hui-transfer>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-default');
    await expect(count(el, 'source')).toBe('11 mục');
    await expect(count(el, 'target')).toBe('1 mục');
    await expect(titlesOf(el, 'target')).toEqual(['Quận Hải Châu']);
    await expect(moveRight(el).disabled).toBe(true);

    const changes = [];
    el.addEventListener('hui-change', (e) => changes.push(e.detail));
    itemOf(el, 'source', 'Quận 3').click();
    itemOf(el, 'source', 'Quận Ba Đình').click();
    await waitFor(() => expect(count(el, 'source')).toBe('2/11 mục'));
    await expect(itemOf(el, 'source', 'Quận 3').getAttribute('aria-selected')).toBe('true');
    await expect(list(el, 'source').querySelector('[part="select-all"]').getAttribute('aria-checked')).toBe('mixed');
    await expect(moveRight(el).disabled).toBe(false);

    moveRight(el).click();
    await waitFor(() => expect(titlesOf(el, 'target')).toEqual(['Quận Hải Châu', 'Quận Ba Đình', 'Quận 3']));
    await expect(el.targetKeys).toEqual(['dn-hc', 'hn-bd', 'hcm-q3']);
    await expect(changes).toEqual([{ targetKeys: ['dn-hc', 'hn-bd', 'hcm-q3'], direction: 'right', moveKeys: ['hn-bd', 'hcm-q3'] }]);
    await expect(count(el, 'source')).toBe('9 mục');
    await expect(el.selectedKeys).toEqual([]);

    itemOf(el, 'target', 'Quận Hải Châu').click();
    await waitFor(() => expect(moveLeft(el).disabled).toBe(false));
    moveLeft(el).click();
    await waitFor(() => expect(el.targetKeys).toEqual(['hn-bd', 'hcm-q3']));
    await expect(changes[1].direction).toBe('left');
    await expect(titlesOf(el, 'source')).toContain('Quận Hải Châu');
  },
};

/** Tìm kiếm không dấu + chọn tất cả (chỉ các mục đang lọc, bỏ qua mục disabled) */
export const SearchAndSelectAll = {
  render: () => html`
    <hui-transfer id="tf-search" show-search
      .dataSource=${DISTRICTS().map((d) => (d.key === 'hn-cg' ? { ...d, disabled: true } : d))}></hui-transfer>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-search');
    const search = list(el, 'source').querySelector('[part="search"]');
    const events = [];
    el.addEventListener('hui-search', (e) => events.push(e.detail));
    search.focus();
    await userEvent.keyboard('ha noi');
    await waitFor(() => expect(titlesOf(el, 'source')).toEqual(['Quận Ba Đình', 'Quận Hoàn Kiếm', 'Quận Cầu Giấy']));
    await expect(list(el, 'source').querySelector('[part="highlight"]').textContent).toBe('Hà Nội');
    await expect(events.at(-1)).toEqual({ direction: 'left', value: 'ha noi' });

    list(el, 'source').querySelector('[part="select-all"]').click();
    await waitFor(() => expect(count(el, 'source')).toBe('2/12 mục'));
    await expect(list(el, 'source').querySelector('[part="select-all"]').getAttribute('aria-checked')).toBe('true');
    await expect(itemOf(el, 'source', 'Quận Cầu Giấy').getAttribute('aria-disabled')).toBe('true');
    moveRight(el).click();
    await waitFor(() => expect(el.value).toEqual(['hn-bd', 'hn-hk']));
    await expect(titlesOf(el, 'source')).toEqual(['Quận Cầu Giấy']);

    // Không khớp → "Không tìm thấy"
    search.value = 'xyz';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await waitFor(() => expect(list(el, 'source').querySelector('[part="empty"]').hidden).toBe(false));
    await expect(list(el, 'source').querySelector('[part="empty"]').textContent).toBe('Không tìm thấy');
    search.blur();
  },
};

/** Bàn phím: ↑↓ di chuyển, Space check, Shift+↓ check thêm, Enter chuyển, Ctrl+A chọn tất cả */
export const Keyboard = {
  render: () => html`<hui-transfer id="tf-kb" .dataSource=${DISTRICTS().slice(0, 6)}></hui-transfer>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-kb');
    const body = list(el, 'source').querySelector('[part="body"]');
    const active = () => el.shadowRoot.getElementById(body.getAttribute('aria-activedescendant'))?.textContent;
    body.focus();
    await waitFor(() => expect(active()).toContain('Quận Ba Đình'));
    await userEvent.keyboard('{ArrowDown}');
    await expect(active()).toContain('Quận Hoàn Kiếm');
    await userEvent.keyboard(' ');
    await waitFor(() => expect(el.selectedKeys).toEqual(['hn-hk']));
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}');
    await waitFor(() => expect(el.selectedKeys).toEqual(['hn-hk', 'hn-cg']));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(el.value).toEqual(['hn-hk', 'hn-cg']));

    await userEvent.keyboard('{Control>}a{/Control}');
    await waitFor(() => expect(count(el, 'source')).toBe('4/4 mục'));
    await userEvent.keyboard('{Control>}a{/Control}');
    await waitFor(() => expect(count(el, 'source')).toBe('4 mục'));
    await userEvent.keyboard('{End}{Enter}'); // không check gì → chuyển mục đang focus
    await waitFor(() => expect(el.value).toEqual(['hn-hk', 'hn-cg', 'hcm-td']));
    body.blur();
  },
};

/** one-way: chỉ chuyển sang đích; bỏ bằng nút ✕ hoặc Delete */
export const OneWay = {
  render: () => html`<hui-transfer id="tf-oneway" one-way .dataSource=${DISTRICTS()} .targetKeys=${['hn-bd', 'hcm-q1', 'ct-nk']}></hui-transfer>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-oneway');
    await expect(moveLeft(el).hidden).toBe(true);
    await expect(list(el, 'target').querySelector('[part="select-all"]').hidden).toBe(true);
    itemOf(el, 'target', 'Quận 1').querySelector('[part="item-remove"]').click();
    await waitFor(() => expect(el.value).toEqual(['hn-bd', 'ct-nk']));
    const body = list(el, 'target').querySelector('[part="body"]');
    body.focus();
    await userEvent.keyboard('{Delete}');
    await waitFor(() => expect(el.value).toEqual(['ct-nk']));
    body.blur();
  },
};

/** Phân trang (page-size) */
export const Pagination = {
  render: () => html`<hui-transfer id="tf-page" page-size="5" show-search .dataSource=${DISTRICTS()}></hui-transfer>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-page');
    const pager = list(el, 'source').querySelector('[part="pagination"]');
    await expect(items(el, 'source').length).toBe(5);
    await expect(pager.textContent).toBe('1/3');
    pager.querySelectorAll('button')[1].click();
    await waitFor(() => expect(pager.textContent).toBe('2/3'));
    await expect(titlesOf(el, 'source')[0]).toBe('TP. Thủ Đức');
    // Chọn tất cả = mọi mục (cả các trang khác)
    list(el, 'source').querySelector('[part="select-all"]').click();
    await waitFor(() => expect(count(el, 'source')).toBe('12/12 mục'));
    moveRight(el).click();
    await waitFor(() => expect(el.value.length).toBe(12));
    await expect(list(el, 'target').querySelector('[part="pagination"]').textContent).toBe('1/3');
  },
};

/** 2.000 mục — virtual: chỉ vẽ phần đang nhìn thấy */
export const Virtual = {
  render: () => html`<hui-transfer id="tf-virtual" virtual show-search .dataSource=${BIG()}></hui-transfer>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-virtual');
    await waitFor(() => expect(items(el, 'source').length).toBeGreaterThan(3));
    await expect(items(el, 'source').length).toBeLessThan(40);
    await expect(count(el, 'source')).toBe('2000 mục');
    const body = list(el, 'source').querySelector('[part="body"]');
    body.focus();
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(titlesOf(el, 'source')).toContain('Nhân viên 2000'));
    await userEvent.keyboard(' {Enter}');
    await waitFor(() => expect(el.value).toEqual(['u1999']));
    body.blur();
  },
};

/** Item tùy biến: <template> con (data-bind) hoặc renderItem(item) */
export const CustomRender = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <hui-transfer id="tf-tpl" .dataSource=${DISTRICTS().slice(0, 5)}>
        <template>
          <span style="display: flex; justify-content: space-between; gap: 8px;">
            <strong data-bind="title"></strong>
            <small data-bind="description" style="opacity: 0.7;"></small>
          </span>
        </template>
      </hui-transfer>
      <hui-transfer id="tf-fn" .dataSource=${DISTRICTS().slice(0, 5)}
        .renderItem=${(item) => `${item.title} — ${item.description}`}></hui-transfer>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const tpl = canvasElement.querySelector('#tf-tpl');
    await expect(items(tpl, 'source')[0].querySelector('strong').textContent).toBe('Quận Ba Đình');
    const fn = canvasElement.querySelector('#tf-fn');
    await expect(items(fn, 'source')[0].textContent).toBe('Quận Ba Đình — Hà Nội');
  },
};

/** Tham gia <form>: FormData (mỗi khóa 1 entry), required, reset */
export const InForm = {
  render: () => html`
    <form id="tf-form" style="display: grid; gap: 12px;" @submit=${(e) => e.preventDefault()}>
      <hui-transfer name="areas" required value='["hn-bd"]' .dataSource=${DISTRICTS()}></hui-transfer>
      <div><button type="reset">Đặt lại</button></div>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#tf-form');
    const el = form.querySelector('hui-transfer');
    await expect(new FormData(form).getAll('areas')).toEqual(['hn-bd']);
    el.targetKeys = [];
    await expect(el.checkValidity()).toBe(false);
    el.targetKeys = ['ct-nk', 'dn-st'];
    await expect(new FormData(form).getAll('areas')).toEqual(['ct-nk', 'dn-st']);
    form.reset();
    await expect(el.value).toEqual(['hn-bd']);
  },
};

/** Override từ ngoài: biến --hui-transfer-* + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .custom-tf {
        --hui-transfer-list-width: 300px;
        --hui-transfer-list-height: 280px;
        --hui-transfer-radius: 16px;
        --hui-transfer-header-bg: var(--hui-fill-tertiary);
        --hui-transfer-item-checked-bg: var(--hui-success-light);
        --hui-transfer-checked-bg: var(--hui-success);
      }
      .custom-tf::part(title) { color: var(--hui-success); }
      .custom-tf::part(move-button) { border-radius: 999px; }
    </style>
    <hui-transfer id="tf-custom" class="custom-tf" show-search .dataSource=${DISTRICTS()} .selectedKeys=${['hn-bd']}></hui-transfer>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tf-custom');
    await expect(getComputedStyle(list(el, 'source')).borderTopLeftRadius).toBe('16px');
    await expect(getComputedStyle(moveRight(el)).borderTopLeftRadius).toBe('999px');
    await expect(count(el, 'source')).toBe('1/12 mục');
  },
};

export const Disabled = {
  render: () => html`<hui-transfer disabled .dataSource=${DISTRICTS().slice(0, 4)} .targetKeys=${['hn-bd']}></hui-transfer>`,
};
