/**
 * Storybook Stories — HUI Kanban
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

/** Kéo bằng PointerEvent giả lập: từ giữa `el` tới (x, y) */
async function pointerDrag(el, x, y, { steps = 10, pointerId = 21 } = {}) {
  const r = el.getBoundingClientRect();
  const x0 = r.left + r.width / 2;
  const y0 = r.top + r.height / 2;
  const opts = (cx, cy) => ({ bubbles: true, composed: true, cancelable: true, clientX: cx, clientY: cy, pointerId, pointerType: 'mouse', button: 0, buttons: 1, isPrimary: true });
  el.dispatchEvent(new PointerEvent('pointerdown', opts(x0, y0)));
  for (let i = 1; i <= steps; i++) {
    document.dispatchEvent(new PointerEvent('pointermove', opts(x0 + ((x - x0) * i) / steps, y0 + ((y - y0) * i) / steps)));
    await frame();
  }
  document.dispatchEvent(new PointerEvent('pointerup', opts(x, y)));
  await frame();
}

const COLUMNS = [
  { id: 'todo', title: 'Cần làm', color: 'info' },
  { id: 'doing', title: 'Đang làm', color: 'warning', limit: 2 },
  { id: 'review', title: 'Chờ duyệt', color: 'primary', limit: 3 },
  { id: 'done', title: 'Hoàn thành', color: 'success' },
];

const ITEMS = () => [
  { id: 't1', column: 'todo', title: 'Thiết kế trang đăng nhập', description: 'Form email + mật khẩu, quên mật khẩu, đăng nhập Google.', tags: [{ label: 'UI', color: 'primary' }, 'Web'], avatar: 'Lan Anh' },
  { id: 't2', column: 'todo', title: 'Viết API giỏ hàng', tags: [{ label: 'Backend', color: 'success' }], avatar: 'Minh Quân' },
  { id: 't3', column: 'todo', title: 'Tối ưu ảnh sản phẩm', description: 'Chuyển sang AVIF, lazy-load.', tags: ['Hiệu năng'] },
  { id: 't4', column: 'doing', title: 'Trang thanh toán', tags: [{ label: 'UI', color: 'primary' }, { label: 'Gấp', color: 'danger' }], avatar: 'Hoàng' },
  { id: 't5', column: 'review', title: 'Dark mode cho dashboard', avatar: 'Thu Trang' },
  { id: 't6', column: 'done', title: 'Thiết lập CI', tags: ['DevOps'] },
];

/** Tên thẻ theo cột */
const columnTitles = (el, col) => el.items.filter((i) => i.column === col).map((i) => i.title);
const countOf = (el, col) => el.shadowRoot.querySelector(`[data-column="${col}"] [part="column-count"]`).textContent;

export default {
  title: 'Organisms/HuiKanban',
  component: 'hui-kanban',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
**HUI Kanban** — Bảng Kanban từ dữ liệu \`columns\` + \`items\`. Kéo thả thẻ trong cột / giữa các cột bằng chuột, cảm ứng (giữ 200ms)
hoặc **bàn phím** (dùng chung lõi với \`hui-sortable\`), đếm số thẻ, cảnh báo vượt **giới hạn WIP**, cuộn ngang trên màn hình hẹp.
Thẻ render vào **light DOM** → \`<template>\` tự viết nhận CSS của trang; thẻ mặc định có tiêu đề, mô tả, \`hui-tag\`, \`hui-avatar\`.

\`\`\`html
<hui-kanban id="board"></hui-kanban>
<script>
  board.columns = [{ id: 'todo', title: 'Cần làm' }, { id: 'doing', title: 'Đang làm', limit: 3 }];
  board.items = [{ id: 1, column: 'todo', title: 'Viết tài liệu', tags: ['Docs'], avatar: 'Lan' }];
  board.addEventListener('hui-change', async (e) => {
    // e.preventDefault() → thẻ quay về chỗ cũ; không chặn → board.items đã là e.detail.items
    await api.move(e.detail.item.id, e.detail.to, e.detail.index);
  });
</script>
\`\`\`

### Attributes / Properties
| Tên | Type | Default | Mô tả |
|-----|------|---------|-------|
| \`columns\` | array | — | \`[{ id, title, color, limit }]\` — color: primary/success/warning/danger/info/secondary hoặc màu CSS |
| \`items\` | array | — | \`[{ id, column, title, description, tags, avatar }]\` — thứ tự trong mảng = thứ tự trong cột. tags: chuỗi hoặc \`{ label, color }\`; avatar: tên, URL hoặc \`{ src, name }\` |
| \`renderItem\` | function | — | \`(item, index) => Element\` thay cho thẻ mặc định / template |
| \`enforce-limit\` | boolean | \`false\` | Không cho thả thêm vào cột đã đủ \`limit\` (mặc định chỉ cảnh báo) |
| \`disabled\` | boolean | \`false\` | Tắt kéo thả |
| \`empty-text\` | string | "Chưa có thẻ" | Chữ khi cột trống |
| \`label\` | string | "Bảng Kanban" | Tên bảng cho trình đọc màn hình |
| \`delay\` | number | \`200\` | Giữ bao lâu trên cảm ứng mới kéo (ms) |
| \`no-animation\` | boolean | \`false\` | Tắt FLIP / thẻ nghiêng |
| \`cardOf(id)\` | method | — | Element của thẻ theo id |

### Template
\`<template>\` con trực tiếp làm khuôn thẻ: \`data-bind\`, \`data-bind-attr\`, \`data-format\`, \`data-show\`, \`data-action\` (→ \`hui-action\`) — xem \`core/template.js\`.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-change\` | \`{ item, from, to, index, oldIndex, items }\` | Thả thẻ ở vị trí mới (index trong cột đích). Cancelable → trả về chỗ cũ |
| \`hui-drag-start\` | \`{ item, column }\` | Bắt đầu kéo |
| \`hui-item-click\` | \`{ item, originalEvent }\` | Bấm / Enter vào thẻ |
| \`hui-action\` | \`{ action, item, index }\` | (template) bấm phần tử có \`data-action\` |

### Slots
\`footer-{columnId}\` — chân cột (vd nút "Thêm thẻ"); slot mặc định nhận \`<template>\`.

### Parts
\`board\`, \`column\`, \`column-over\` (cột vượt WIP), \`column-header\`, \`column-dot\`, \`column-title\`, \`column-count\`, \`column-body\`, \`column-empty\`, \`column-footer\`.
State: \`hui-kanban:state(dragging)\`. Thẻ đang kéo: \`[data-hui-sort-placeholder]\`, đang nhấc bằng phím: \`[data-hui-sort-grabbed]\`.

### CSS Variables
\`--hui-kanban-gap\`, \`--hui-kanban-column-width\`, \`--hui-kanban-column-max-width\`, \`--hui-kanban-column-bg\`, \`--hui-kanban-column-radius\`,
\`--hui-kanban-column-max-height\`, \`--hui-kanban-card-gap\`, \`--hui-kanban-over-color\`, \`--hui-kanban-focus-color\`,
thẻ mặc định: \`--hui-kanban-card-bg\`, \`--hui-kanban-card-border-color\`, \`--hui-kanban-card-radius\`, \`--hui-kanban-card-shadow\`, \`--hui-kanban-card-padding\`.

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Focus thẻ |
| \`Enter\` | Mở thẻ (\`hui-item-click\`) / thả khi đang nhấc |
| \`Space\` | Nhấc / thả thẻ |
| \`↑ ↓\` | Di chuyển trong cột |
| \`← →\` | Sang cột trước / sau (bỏ qua cột đã đủ khi \`enforce-limit\`) |
| \`Home\` / \`End\` | Đầu / cuối cột |
| \`Esc\` | Hủy, trả thẻ về chỗ cũ |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`
    <hui-kanban .columns=${COLUMNS} .items=${ITEMS()}></hui-kanban>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-kanban');
    await waitFor(() => expect(el.cardOf('t1')).not.toBe(null));
    await expect(countOf(el, 'todo')).toBe('3');
    await expect(countOf(el, 'doing')).toBe('1/2');
    const card = el.cardOf('t1');
    await expect(card.parentElement).toBe(el); // light DOM
    await expect(card.classList.contains('hui-kanban-card')).toBe(true);
    await expect(getComputedStyle(card).borderTopStyle).toBe('solid'); // stylesheet thẻ mặc định đã gắn

    // Bàn phím: Space nhấc t1 → → sang "Đang làm" → ↓ xuống cuối → Space thả
    let detail = null;
    el.addEventListener('hui-change', (e) => { detail = e.detail; }, { once: true });
    card.focus();
    await userEvent.keyboard(' ');
    await expect(card.hasAttribute('data-hui-sort-grabbed')).toBe(true);
    await userEvent.keyboard('{ArrowRight}');
    await expect(countOf(el, 'doing')).toBe('2/2'); // đếm theo DOM ngay khi đang kéo
    await userEvent.keyboard('{ArrowDown} ');
    await expect(detail).toMatchObject({ from: 'todo', to: 'doing', index: 1, oldIndex: 0 });
    await expect(detail.item.id).toBe('t1');
    await expect(columnTitles(el, 'doing')).toEqual(['Trang thanh toán', 'Thiết kế trang đăng nhập']);
    await expect(columnTitles(el, 'todo')).toEqual(['Viết API giỏ hàng', 'Tối ưu ảnh sản phẩm']);
    await expect(document.activeElement).toBe(el.cardOf('t1'));

    // Enter → hui-item-click
    let clicked = null;
    el.addEventListener('hui-item-click', (e) => { clicked = e.detail.item; }, { once: true });
    await userEvent.keyboard('{Enter}');
    await expect(clicked.id).toBe('t1');

    // Kéo chuột: t2 sang cột "Hoàn thành"
    const doneBody = el.shadowRoot.querySelector('[data-column="done"] [part="column-body"]').getBoundingClientRect();
    let pointerDetail = null;
    el.addEventListener('hui-change', (e) => { pointerDetail = e.detail; }, { once: true });
    await pointerDrag(el.cardOf('t2'), doneBody.left + doneBody.width / 2, doneBody.bottom - 10);
    await waitFor(() => expect(pointerDetail).toMatchObject({ from: 'todo', to: 'done', index: 1 }));
    await expect(columnTitles(el, 'done')).toEqual(['Thiết lập CI', 'Viết API giỏ hàng']);
  },
};

/** Giới hạn WIP: cột vượt limit → viền + số đếm màu cảnh báo, part column-over. enforce-limit: chặn thả vào cột đã đủ */
export const WipLimit = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <hui-kanban id="warn" .columns=${[{ id: 'a', title: 'Backlog' }, { id: 'b', title: 'Đang làm (tối đa 1)', color: 'warning', limit: 1 }]}
        .items=${[{ id: 1, column: 'a', title: 'Việc A' }, { id: 2, column: 'b', title: 'Việc B' }, { id: 3, column: 'b', title: 'Việc C' }]}></hui-kanban>
      <hui-kanban id="strict" enforce-limit .columns=${[{ id: 'a', title: 'Backlog' }, { id: 'b', title: 'Đang làm (khóa ở 1)', color: 'danger', limit: 1 }]}
        .items=${[{ id: 1, column: 'a', title: 'Việc A' }, { id: 2, column: 'b', title: 'Việc B' }]}></hui-kanban>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const warn = canvasElement.querySelector('#warn');
    await waitFor(() => expect(countOf(warn, 'b')).toBe('2/1'));
    const col = warn.shadowRoot.querySelector('[data-column="b"]');
    await expect(col.getAttribute('part')).toBe('column column-over');
    await expect(col.querySelector('[part="column-count"]').getAttribute('aria-label')).toContain('vượt giới hạn');

    const strict = canvasElement.querySelector('#strict');
    await waitFor(() => expect(strict.cardOf(1)).not.toBe(null));
    const before = strict.cardOf(1).getAttribute('slot');
    strict.cardOf(1).focus();
    await userEvent.keyboard(' {ArrowRight}');
    // Cột b đã đủ → không chuyển được, trình đọc màn hình được báo
    await expect(strict.cardOf(1).getAttribute('slot')).toBe(before);
    await waitFor(() => expect(strict.shadowRoot.querySelector('[role="status"]').textContent).toContain('Không còn cột'));
    await userEvent.keyboard('{Escape}');
    await expect(strict.items.find((i) => i.id === 1).column).toBe('a');
  },
};

/** Thẻ tự thiết kế bằng <template> + data-bind (CSS của trang áp dụng vì thẻ ở light DOM), data-action → hui-action */
export const TemplateCards = {
  render: () => html`
    <style>
      .ticket { padding: 10px 12px; border-radius: 10px; background: var(--hui-bg-container); border: 1px solid var(--hui-border-secondary); border-left: 4px solid var(--hui-primary); font-family: var(--hui-font-family); font-size: 14px; color: var(--hui-text); }
      .ticket__meta { display: flex; justify-content: space-between; margin-top: 6px; color: var(--hui-text-tertiary); font-size: 12px; }
      .ticket__btn { font: inherit; font-size: 12px; border: 0; background: none; color: var(--hui-primary); cursor: pointer; padding: 0; }
    </style>
    <hui-kanban id="tpl"
      .columns=${[{ id: 'open', title: 'Mở' }, { id: 'closed', title: 'Đã đóng', color: 'success' }]}
      .items=${[
        { id: 101, column: 'open', title: 'Lỗi thanh toán thẻ', points: 3, due: '2026-11-02' },
        { id: 102, column: 'open', title: 'Thêm bộ lọc giá', points: 5, due: '2026-11-10' },
        { id: 103, column: 'closed', title: 'Sửa font tiêu đề', points: 1, due: '2026-10-15' },
      ]}>
      <template>
        <article class="ticket">
          <strong data-bind="title"></strong>
          <div class="ticket__meta">
            <span>#<span data-bind="id"></span> · <span data-bind="points"></span> điểm</span>
            <span data-bind="due" data-format="date"></span>
          </div>
          <button class="ticket__btn" type="button" data-action="open">Chi tiết</button>
        </article>
      </template>
    </hui-kanban>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#tpl');
    await waitFor(() => expect(el.cardOf(101)).not.toBe(null));
    const card = el.cardOf(101);
    await expect(card.classList.contains('ticket')).toBe(true);
    await expect(card.querySelector('strong').textContent).toBe('Lỗi thanh toán thẻ');
    await expect(getComputedStyle(card).borderLeftWidth).toBe('4px');
    let action = null;
    el.addEventListener('hui-action', (e) => { action = e.detail; }, { once: true });
    await userEvent.click(card.querySelector('.ticket__btn'));
    await expect(action).toMatchObject({ action: 'open' });
    await expect(action.item.id).toBe(101);
  },
};

/** hui-change cancelable: chặn → thẻ quay về chỗ cũ (vd: không cho mở lại thẻ đã đóng) */
export const Cancelable = {
  render: () => html`
    <hui-kanban id="guard"
      .columns=${[{ id: 'open', title: 'Mở' }, { id: 'closed', title: 'Đã đóng (không mở lại)', color: 'success' }]}
      .items=${[{ id: 'a', column: 'open', title: 'Việc A' }, { id: 'b', column: 'closed', title: 'Việc B' }]}
      @hui-change=${(e) => { if (e.detail.from === 'closed' && e.detail.to !== 'closed') e.preventDefault(); }}></hui-kanban>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#guard');
    await waitFor(() => expect(el.cardOf('b')).not.toBe(null));
    el.cardOf('b').focus();
    await userEvent.keyboard(' {ArrowLeft} ');
    await waitFor(() => expect(countOf(el, 'closed')).toBe('1'));
    await expect(el.items.find((i) => i.id === 'b').column).toBe('closed');
    // Chiều ngược lại được phép
    el.cardOf('a').focus();
    await userEvent.keyboard(' {ArrowRight} ');
    await expect(el.items.find((i) => i.id === 'a').column).toBe('closed');
  },
};

/** Chân cột qua slot footer-{id}, cột trống, màn hình hẹp cuộn ngang */
export const FooterAndNarrow = {
  render: () => html`
    <div style="max-width: 420px; border: 1px dashed var(--hui-border); padding: 8px;">
      <hui-kanban id="narrow" .columns=${COLUMNS} .items=${ITEMS().slice(0, 2)} empty-text="Kéo thẻ vào đây">
        <hui-button slot="footer-todo" variant="text" size="sm" icon="plus" block>Thêm thẻ</hui-button>
      </hui-kanban>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#narrow');
    const board = el.shadowRoot.querySelector('[part="board"]');
    await waitFor(() => expect(board.scrollWidth).toBeGreaterThan(board.clientWidth));
    const empty = el.shadowRoot.querySelector('[data-column="doing"] [part="column-empty"]');
    await expect(empty.hidden).toBe(false);
    await expect(empty.textContent).toBe('Kéo thẻ vào đây');
    await expect(el.shadowRoot.querySelector('slot[name="footer-todo"]').assignedElements().length).toBe(1);
  },
};

export const Disabled = {
  render: () => html`<hui-kanban disabled .columns=${COLUMNS.slice(0, 2)} .items=${ITEMS().slice(0, 3)}></hui-kanban>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-kanban');
    await waitFor(() => expect(el.cardOf('t1')).not.toBe(null));
    el.cardOf('t1').focus();
    await userEvent.keyboard(' {ArrowRight} ');
    await expect(el.items[0].column).toBe('todo');
  },
};

/** Override từ ngoài: biến CSS + ::part */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .custom-kanban {
        --hui-kanban-gap: 20px;
        --hui-kanban-column-width: 240px;
        --hui-kanban-column-bg: var(--hui-bg-secondary);
        --hui-kanban-card-radius: 4px;
        --hui-kanban-card-shadow: none;
        --hui-kanban-card-border-color: var(--hui-border);
        --hui-kanban-focus-color: var(--hui-success);
        --hui-kanban-over-color: var(--hui-danger);
      }
      .custom-kanban::part(column-title) { text-transform: uppercase; letter-spacing: 0.04em; font-size: 12px; }
      .custom-kanban::part(column-over) { background: var(--hui-danger-light); }
      .custom-kanban::part(column) { border-top-width: 0; }
    </style>
    <hui-kanban class="custom-kanban" .columns=${COLUMNS} .items=${[...ITEMS(), { id: 't7', column: 'doing', title: 'Quá tải' }, { id: 't8', column: 'doing', title: 'Quá tải 2' }]}></hui-kanban>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-kanban');
    await waitFor(() => expect(countOf(el, 'doing')).toBe('3/2'));
    const title = el.shadowRoot.querySelector('[part="column-title"]');
    await expect(getComputedStyle(title).textTransform).toBe('uppercase');
    await expect(getComputedStyle(el.cardOf('t1')).borderTopLeftRadius).toBe('4px');
  },
};
