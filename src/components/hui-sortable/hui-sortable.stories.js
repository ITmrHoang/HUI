/**
 * Storybook Stories — HUI Sortable
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

/** Kéo bằng PointerEvent giả lập: từ giữa `el` tới (x, y) qua nhiều bước */
async function pointerDrag(el, x, y, { steps = 8, pointerId = 11 } = {}) {
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

const texts = (el) => el.sortItems.map((i) => i.textContent.trim());

const itemStyle = 'padding: 10px 14px; border: 1px solid var(--hui-border); border-radius: 8px; background: var(--hui-bg-container); color: var(--hui-text);';

export default {
  title: 'Molecules/HuiSortable',
  component: 'hui-sortable',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Sortable** — Sắp xếp phần tử con bằng kéo thả. Item là **light DOM** (con trực tiếp) nên CSS của trang áp dụng bình thường.
Kéo chuột / cảm ứng có **chỗ trống** (item thật mờ đi) + **ghost** bay theo con trỏ + **FLIP** cho item xung quanh, tự cuộn khi sát mép.
Bàn phím theo kiểu dnd-kit: **Space** nhấc → **mũi tên** di chuyển → **Space/Enter** thả, **Esc** hủy; mọi bước được đọc qua live region.

\`\`\`html
<hui-sortable label="Việc cần làm">
  <div data-id="a">Viết tài liệu</div>
  <div data-id="b">Review code</div>
</hui-sortable>
<script>
  list.addEventListener('hui-sort', (e) => save(e.target.toArray()));
</script>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`direction\` | string | \`vertical\` | \`vertical\` \\| \`horizontal\` \\| \`grid\` — bố cục + trục phím mũi tên |
| \`handle\` | string | — | Selector tay nắm trong item (có → chỉ kéo khi nắm vào đây) |
| \`group\` | string | — | Cùng group → kéo qua lại giữa các danh sách |
| \`item-selector\` | string | — | Lọc phần tử con nào là item |
| \`disabled\` | boolean | \`false\` | Tắt kéo thả |
| \`delay\` | number | \`200\` | Giữ bao lâu trên cảm ứng mới kéo (khi không có handle) |
| \`label\` | string | — | aria-label của danh sách, cũng dùng khi đọc "chuyển sang …" |
| \`no-animation\` | boolean | \`false\` | Tắt FLIP / ghost đáp xuống |

### Properties / Methods
| Tên | Mô tả |
|-----|-------|
| \`sortItems\` | (chỉ đọc) item theo thứ tự hiện tại |
| \`toArray()\` | \`data-id\` (hoặc id / vị trí) của item theo thứ tự |
| \`moveItem(from, to)\` | Di chuyển bằng code (không phát sự kiện) |

Lõi kéo thả dùng lại được: \`import { beginPointerDrag, startKeyboardSort, flipMove, registerContainer } from '@itmrhoang/h-ui/hui-sortable'\`.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-sort-start\` | \`{ item, index }\` | Bắt đầu kéo |
| \`hui-sort\` | \`{ oldIndex, newIndex, item, from, to }\` | Thả ở vị trí mới — phát trên danh sách **đích**. Cancelable: \`preventDefault()\` → trả về chỗ cũ |
| \`hui-sort-cancel\` | \`{ item, index }\` | Hủy (Esc) |

### Slots / Parts / States
Slot mặc định: các item. Part: \`announcer\` (live region ẩn). State: \`hui-sortable:state(dragging)\`.
Item đang kéo có \`[data-hui-sort-placeholder]\`, đang nhấc bằng phím có \`[data-hui-sort-grabbed]\` (+ \`aria-pressed="true"\`) — style được từ CSS trang.

### CSS Variables
\`--hui-sortable-gap\`, \`--hui-sortable-placeholder-opacity\`, \`--hui-sortable-placeholder-outline\`, \`--hui-sortable-grabbed-outline\`,
\`--hui-sortable-focus-color\`, \`--hui-sortable-min-item-width\` (direction="grid").

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Focus item (item tự có tabindex="0") |
| \`Space\` | Nhấc item / thả |
| \`↑ ↓\` (vertical) · \`← →\` (horizontal/grid) | Di chuyển 1 vị trí (grid: ↑ ↓ theo hàng) |
| \`← →\` (vertical) · \`↑ ↓\` (horizontal) | Sang danh sách kề cùng \`group\` |
| \`Home\` / \`End\` | Lên đầu / xuống cuối |
| \`Enter\` | Thả (khi đang nhấc) |
| \`Esc\` | Hủy, trả về chỗ cũ |
        `,
      },
    },
  },
  argTypes: {
    direction: { control: 'inline-radio', options: ['vertical', 'horizontal', 'grid'] },
    disabled: { control: 'boolean' },
    noAnimation: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-sortable label="Việc cần làm" direction=${args.direction} ?disabled=${args.disabled} ?no-animation=${args.noAnimation} style="max-width: 360px;">
      <div data-id="a" style=${itemStyle}>Viết tài liệu</div>
      <div data-id="b" style=${itemStyle}>Review code</div>
      <div data-id="c" style=${itemStyle}>Sửa lỗi đăng nhập</div>
      <div data-id="d" style=${itemStyle}>Phát hành v2</div>
    </hui-sortable>
  `,
  args: { direction: 'vertical', disabled: false, noAnimation: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-sortable');
    await expect(el.getAttribute('role')).toBe('list');
    const [first] = el.sortItems;
    await expect(first.getAttribute('role')).toBe('listitem');
    await expect(first.getAttribute('tabindex')).toBe('0');

    // Bàn phím: Space nhấc → ↓ ↓ → Space thả
    let detail = null;
    el.addEventListener('hui-sort', (e) => { detail = e.detail; }, { once: true });
    first.focus();
    await userEvent.keyboard(' ');
    await expect(first.hasAttribute('data-hui-sort-grabbed')).toBe(true);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(texts(el)).toEqual(['Review code', 'Sửa lỗi đăng nhập', 'Viết tài liệu', 'Phát hành v2']);
    await expect(document.activeElement).toBe(first);
    await userEvent.keyboard(' ');
    await expect(detail).toMatchObject({ oldIndex: 0, newIndex: 2, item: first, from: el, to: el });
    await expect(first.hasAttribute('data-hui-sort-grabbed')).toBe(false);
    await expect(el.toArray()).toEqual(['b', 'c', 'a', 'd']);
    const live = el.shadowRoot.querySelector('[part="announcer"]');
    await waitFor(() => expect(live.textContent).toContain('Đã thả'));

    // Esc hủy → trả về chỗ cũ
    const second = el.sortItems[1];
    second.focus();
    await userEvent.keyboard(' {ArrowUp}');
    await expect(el.toArray()).toEqual(['c', 'b', 'a', 'd']);
    await userEvent.keyboard('{Escape}');
    await expect(el.toArray()).toEqual(['b', 'c', 'a', 'd']);

    // Kéo bằng chuột: item đầu xuống dưới item cuối
    const items = el.sortItems;
    const last = items[3].getBoundingClientRect();
    let pointerDetail = null;
    el.addEventListener('hui-sort', (e) => { pointerDetail = e.detail; }, { once: true });
    await pointerDrag(items[0], last.left + 20, last.bottom - 4);
    await waitFor(() => expect(pointerDetail).toMatchObject({ oldIndex: 0, newIndex: 3 }));
    await expect(el.toArray()).toEqual(['c', 'a', 'd', 'b']);
    await waitFor(() => expect(document.querySelector('[data-hui-sort-ghost]')).toBe(null));
  },
};

/** Tay nắm: chỉ kéo được khi nắm vào ⠿ — chữ trong item vẫn bôi đen / bấm được bình thường */
export const WithHandle = {
  render: () => html`
    <hui-sortable handle=".grip" style="max-width: 380px;">
      ${['Trang chủ', 'Sản phẩm', 'Bảng giá', 'Liên hệ'].map((name, i) => html`
        <div data-id=${i} style="${itemStyle} display: flex; align-items: center; gap: 10px;">
          <span class="grip" aria-hidden="true" style="color: var(--hui-text-tertiary); font-size: 18px;">⠿</span>
          <span style="flex: 1;">${name}</span>
          <button type="button" style="font: inherit;">Sửa</button>
        </div>
      `)}
    </hui-sortable>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-sortable');
    const items = el.sortItems;
    await expect(items[0].querySelector('.grip').style.touchAction).toBe('none');
    // Kéo từ chữ (không phải tay nắm) → không đổi chỗ
    const label = items[0].querySelector('span:nth-child(2)');
    const target = items[2].getBoundingClientRect();
    await pointerDrag(label, target.left + 40, target.bottom - 2);
    await expect(el.toArray()).toEqual(['0', '1', '2', '3']);
    // Kéo từ tay nắm → đổi chỗ
    await pointerDrag(items[0].querySelector('.grip'), target.left + 40, target.bottom - 2);
    await waitFor(() => expect(el.toArray()).toEqual(['1', '2', '0', '3']));
  },
};

/** Ngang và lưới — phím ← → di chuyển; lưới: ↑ ↓ nhảy theo hàng */
export const HorizontalAndGrid = {
  render: () => html`
    <div style="display: grid; gap: 24px;">
      <hui-sortable id="h" direction="horizontal" label="Thẻ">
        ${['React', 'Vue', 'Svelte', 'Lit', 'Solid'].map((n) => html`<span data-id=${n} style="${itemStyle} padding: 6px 12px; border-radius: 999px;">${n}</span>`)}
      </hui-sortable>
      <hui-sortable id="g" direction="grid" label="Ảnh" style="--hui-sortable-min-item-width: 96px; max-width: 460px;">
        ${Array.from({ length: 8 }, (_, i) => html`
          <div data-id=${i + 1} style="aspect-ratio: 1; display: grid; place-items: center; border-radius: 10px; font-weight: 600; color: var(--hui-text-light-solid); background: var(--hui-${['primary', 'success', 'warning', 'danger', 'info', 'secondary', 'primary', 'success'][i]});">${i + 1}</div>
        `)}
      </hui-sortable>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const h = canvasElement.querySelector('#h');
    h.sortItems[0].focus();
    await userEvent.keyboard(' {ArrowRight}{ArrowRight} ');
    await expect(h.toArray()).toEqual(['Vue', 'Svelte', 'React', 'Lit', 'Solid']);

    const g = canvasElement.querySelector('#g');
    const cols = g.sortItems.filter((el) => Math.abs(el.getBoundingClientRect().top - g.sortItems[0].getBoundingClientRect().top) < 2).length;
    g.sortItems[0].focus();
    await userEvent.keyboard(' {ArrowDown} ');
    await expect(g.toArray()[cols]).toBe('1');
    g.sortItems[cols].focus();
    await userEvent.keyboard(' {Home} ');
    await expect(g.toArray()[0]).toBe('1');
  },
};

/** Hai danh sách cùng group: kéo qua lại; bàn phím ← → chuyển danh sách */
export const SharedGroup = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 220px)); gap: 24px; align-items: start;">
      <div>
        <strong>Có sẵn</strong>
        <hui-sortable id="left" group="fields" label="Trường có sẵn" style="margin-top: 8px; min-height: 120px; padding: 8px; border: 1px dashed var(--hui-border); border-radius: 10px;">
          ${['Họ tên', 'Email', 'Điện thoại', 'Địa chỉ'].map((n) => html`<div data-id=${n} style=${itemStyle}>${n}</div>`)}
        </hui-sortable>
      </div>
      <div>
        <strong>Đã chọn</strong>
        <hui-sortable id="right" group="fields" label="Trường đã chọn" style="margin-top: 8px; min-height: 120px; padding: 8px; border: 1px dashed var(--hui-border); border-radius: 10px;">
          <div data-id="Công ty" style=${itemStyle}>Công ty</div>
        </hui-sortable>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const left = canvasElement.querySelector('#left');
    const right = canvasElement.querySelector('#right');
    let detail = null;
    right.addEventListener('hui-sort', (e) => { detail = e.detail; }, { once: true });
    left.sortItems[1].focus();
    await userEvent.keyboard(' {ArrowRight}');
    await expect(right.toArray()).toEqual(['Công ty', 'Email']);
    await userEvent.keyboard(' ');
    await expect(detail).toMatchObject({ oldIndex: 1, newIndex: 1, from: left, to: right });
    await expect(left.toArray()).toEqual(['Họ tên', 'Điện thoại', 'Địa chỉ']);

    // Kéo chuột từ phải sang trái
    const target = left.getBoundingClientRect();
    await pointerDrag(right.sortItems[0], target.left + 40, target.top + 6);
    await waitFor(() => expect(left.toArray()[0]).toBe('Công ty'));
    await expect(right.toArray()).toEqual(['Email']);
  },
};

/** hui-sort cancelable: chặn thả → item trở về chỗ cũ (vd: API báo lỗi, hoặc không cho đổi item bị khóa) */
export const Cancelable = {
  render: () => html`
    <hui-sortable id="locked" style="max-width: 360px;"
      @hui-sort=${(e) => { if (e.detail.item.dataset.locked !== undefined || e.detail.newIndex === 0) e.preventDefault(); }}>
      <div data-id="pin" data-locked style="${itemStyle} background: var(--hui-fill-secondary);">📌 Luôn ở đầu (khóa)</div>
      <div data-id="x" style=${itemStyle}>Mục X</div>
      <div data-id="y" style=${itemStyle}>Mục Y</div>
    </hui-sortable>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#locked');
    el.sortItems[2].focus();
    await userEvent.keyboard(' {ArrowUp}{ArrowUp} ');
    await waitFor(() => expect(el.toArray()).toEqual(['pin', 'x', 'y']));
    el.sortItems[2].focus();
    await userEvent.keyboard(' {ArrowUp} ');
    await expect(el.toArray()).toEqual(['pin', 'y', 'x']);
  },
};

export const Disabled = {
  render: () => html`
    <hui-sortable disabled style="max-width: 360px;">
      <div style=${itemStyle}>Không kéo được 1</div>
      <div style=${itemStyle}>Không kéo được 2</div>
    </hui-sortable>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-sortable');
    await expect(el.sortItems[0].hasAttribute('tabindex')).toBe(false);
    const r = el.sortItems[1].getBoundingClientRect();
    await pointerDrag(el.sortItems[0], r.left + 10, r.bottom - 2);
    await expect(el.sortItems[0].textContent).toBe('Không kéo được 1');
  },
};

/** Override từ ngoài: biến CSS + style item đang kéo bằng [data-hui-sort-placeholder] / [data-hui-sort-grabbed] */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .custom-sort {
        --hui-sortable-gap: 4px;
        --hui-sortable-placeholder-opacity: 0.2;
        --hui-sortable-placeholder-outline: 2px dashed var(--hui-success);
        --hui-sortable-grabbed-outline: 2px solid var(--hui-warning);
        --hui-sortable-focus-color: var(--hui-success);
      }
      .custom-sort > li {
        list-style: none;
        padding: 8px 12px;
        border-radius: 6px;
        background: var(--hui-success-light);
        color: var(--hui-text);
      }
      .custom-sort > li[data-hui-sort-grabbed] { transform: scale(1.02); }
    </style>
    <hui-sortable class="custom-sort" label="Danh sách tùy biến" style="max-width: 320px; padding: 0; margin: 0;">
      <li>Một</li>
      <li>Hai</li>
      <li>Ba</li>
    </hui-sortable>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-sortable');
    await expect(getComputedStyle(el).rowGap).toBe('4px');
    const li = el.sortItems[0];
    await expect(li.hasAttribute('role')).toBe(false); // <li> giữ role mặc định
    li.focus();
    await userEvent.keyboard(' ');
    await expect(getComputedStyle(li).outlineColor).not.toBe('');
    await userEvent.keyboard('{Escape}');
  },
};
