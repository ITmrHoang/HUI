/**
 * Storybook Stories — HUI List
 * Danh sách (Ant List + MUI List): header/footer, meta, actions, loading, rỗng, lưới, phân trang.
 */

import { html } from 'lit';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';
import '../hui-avatar/index.js';
import '../hui-button/index.js';

const PEOPLE = [
  { title: 'Nguyễn Văn An', description: 'Kỹ sư frontend · Hà Nội' },
  { title: 'Trần Thị Bình', description: 'Thiết kế sản phẩm · Đà Nẵng' },
  { title: 'Lê Hoàng Châu', description: 'Quản lý dự án · TP. Hồ Chí Minh' },
  { title: 'Phạm Minh Dũng', description: 'Kỹ sư backend · Cần Thơ' },
];

const items = (list = PEOPLE) => list.map((p) => html`
  <hui-list-item>
    <hui-list-item-meta title=${p.title} description=${p.description}>
      <hui-avatar slot="avatar">${p.title.split(' ').pop()[0]}</hui-avatar>
    </hui-list-item-meta>
    <a slot="actions" href="#">Sửa</a>
    <a slot="actions" href="#">Xem</a>
  </hui-list-item>
`);

export default {
  title: 'Components/HuiList',
  component: 'hui-list',
  subcomponents: { HuiListItem: 'hui-list-item', HuiListItemMeta: 'hui-list-item-meta' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI List** — danh sách hiển thị dữ liệu; item gồm meta (avatar + tiêu đề + mô tả), actions, extra.

\`\`\`html
<hui-list header="Thành viên" bordered>
  <hui-list-item>
    <hui-list-item-meta title="Nguyễn Văn An" description="Kỹ sư frontend">
      <hui-avatar slot="avatar">A</hui-avatar>
    </hui-list-item-meta>
    <a slot="actions" href="#">Sửa</a>
  </hui-list-item>
  <hui-pagination slot="pagination" total="50"></hui-pagination>
</hui-list>
\`\`\`

### Attributes — \`hui-list\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`header\` / \`footer\` | string | — | Chữ đầu / chân danh sách (hoặc slot) |
| \`bordered\` | boolean | \`false\` | Viền ngoài + bo góc |
| \`split\` | string | (bật) | Đường kẻ giữa item; \`split="false"\` để tắt |
| \`size\` | string | \`'md'\` | \`sm\` / \`md\` / \`lg\` |
| \`loading\` | boolean | \`false\` | Phủ \`hui-spinner\`, khóa tương tác (\`inert\`) |
| \`item-layout\` | string | \`'horizontal'\` | \`vertical\`: actions dưới nội dung, extra là vùng lớn bên phải |
| \`empty-text\` | string | locale | Mô tả của \`hui-empty\` khi rỗng |
| \`grid-column\` | number | — | Bật chế độ lưới, số cột |
| \`grid-gutter\` | string | \`16\` | Khoảng cách thẻ (số = px) |
| \`grid-column-xs\` … \`grid-column-xxl\` | number | — | Số cột theo breakpoint (576/768/992/1200/1600px), mobile-first |
| \`hoverable\` | boolean | \`false\` | Item nổi nhẹ khi rê chuột (nền + bóng + nhấc 2px; giảm chuyển động → không nhấc) |
| \`full-swipe\` | boolean | \`false\` | Vuốt hết chiều ngang item → chạy thao tác chính (áp cho mọi item con) |

### Attributes — \`hui-list-item\` (swipe actions)
| Attribute / Property | Type | Mô tả |
|-----------|------|-------|
| \`swipe-start\` / \`swipeStart\` | JSON array | Nút phía đầu (LTR: vuốt sang phải để hiện). Phần tử: \`"delete"\` hoặc \`{ action, label, icon, color, primary }\` |
| \`swipe-end\` / \`swipeEnd\` | JSON array | Nút phía cuối (LTR: vuốt sang trái để hiện) |
| \`full-swipe\` | boolean | Như trên, cho riêng item |
| \`rowData\` | object (JS) | Dữ liệu gốc trả về trong \`detail.item\` (tự gán khi render từ \`dataSource\`) |
| \`swipeState\` | (chỉ đọc) | \`'start'\` \\| \`'end'\` \\| \`null\` |
| \`openActions(side)\` / \`closeActions()\` | method | Mở / đóng bằng code |

Tên dựng sẵn (icon + màu + nhãn theo locale): \`delete\`, \`edit\`, \`archive\`, \`pin\`, \`share\`, \`more\`, \`read\`.
\`dataSource\`: object có \`actions\` (mảng → phía cuối, hoặc \`{ start, end }\`) tự thành nút vuốt.
Thao tác chính khi vuốt hết: nút có \`data-primary\` / \`primary: true\`, nếu không có thì nút đầu tiên của phía đó.
Chỉ 1 item mở cùng lúc; chạm vào nội dung / ra ngoài / Esc → đóng. Thả tay: quá nửa bề rộng nút (hoặc vẩy nhanh) → mở.

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-swipe-action\` | \`{ action, item, element, side, full }\` | Bấm nút thao tác (\`action\` = \`data-action\` / chữ nút) hoặc vuốt hết (\`full: true\`). \`item\` = \`rowData\` hoặc chính item |
| \`hui-swipe-open\` | \`{ side }\` | Item mở một phía |
| \`hui-swipe-close\` | — | Item đóng |

### Properties (chỉ JS)
| Property | Type | Mô tả |
|----------|------|-------|
| \`dataSource\` | \`any[]\` | Chế độ dữ liệu |
| \`renderItem\` | \`(item, index) => Node \\| string\` | Mặc định: object \`{ title, description, content }\` → item + meta |
| \`itemCount\` | number (readonly) | Số item hiện có |

### Slots
| Thẻ | Slot | Mô tả |
|-----|------|-------|
| list | _(default)_ | Các \`hui-list-item\` |
| list | \`header\` / \`footer\` | Đầu / chân |
| list | \`pagination\` | Phân trang (vd \`hui-pagination\`), canh phải |
| list | \`empty\` | Thay \`hui-empty\` mặc định |
| item | _(default)_ | Nội dung chính |
| item | \`actions\` | Hành động |
| item | \`extra\` | Vùng lớn bên phải |
| item | \`actions-start\` / \`actions-end\` | Nút thao tác vuốt tự thiết kế (thay cho \`swipe-start\` / \`swipe-end\`) |
| meta | \`avatar\`, \`title\`, \`description\` | Avatar, tiêu đề, mô tả |

### Parts
| Thẻ | Part |
|-----|------|
| list | \`base\`, \`header\`, \`body\`, \`items\`, \`empty\`, \`loading\`, \`footer\`, \`pagination\` |
| item | \`base\` (phần trượt), \`main\`, \`actions\`, \`extra\`, \`swipe\`, \`actions-start\`, \`actions-end\`, \`swipe-action\` + \`swipe-action-<màu>\` |
| meta | \`base\`, \`avatar\`, \`content\`, \`title\`, \`description\` |

### Custom state
\`hui-list:state(empty)\` — không có item.

### CSS Variables
| Biến | Mặc định | Mô tả |
|------|----------|-------|
| \`--hui-list-bg\` | \`--hui-bg-container\` | Nền (bordered) |
| \`--hui-list-border-color\` | \`--hui-border\` | Viền ngoài |
| \`--hui-list-radius\` | \`--hui-radius-lg\` | Bo góc |
| \`--hui-list-split-color\` | \`--hui-border\` | Đường kẻ |
| \`--hui-list-item-padding\` | theo size | Đệm item |
| \`--hui-list-item-color\` | \`--hui-text\` | Màu chữ item |
| \`--hui-list-item-actions-gap\` | \`--hui-space-lg\` | Khoảng cách actions |
| \`--hui-list-header-bg\` | trong suốt | Nền header/footer |
| \`--hui-list-card-bg\` / \`-border-color\` / \`-radius\` | — | Thẻ ở chế độ lưới |
| \`--hui-list-loading-bg\` | nền mờ | Lớp phủ loading |
| \`--hui-list-pagination-justify\` | \`flex-end\` | Canh phân trang |
| \`--hui-list-hover-bg\` / \`-hover-shadow\` / \`-hover-lift\` | fill-tertiary / shadow-md / \`-2px\` | Item khi hover (\`hoverable\`) |
| \`--hui-list-item-swipe-bg\` | \`--hui-bg-container\` | Nền phần trượt của item có thao tác vuốt |
| \`--hui-list-item-swipe-action-width\` | \`72px\` | Bề rộng tối thiểu mỗi nút vuốt |
| \`--hui-list-item-swipe-action-color\` | \`--hui-text-inverse\` | Màu chữ nút vuốt dựng sẵn |
| \`--hui-list-meta-title-color\` / \`-title-font-size\` / \`-description-color\` / \`-gap\` | — | Meta |

### Bàn phím
Tab đi qua các phần tử bấm được bên trong item. Khối item có \`role="list"\`, mỗi item \`role="listitem"\`.

**Thay thế bàn phím cho vuốt:** nút thao tác luôn nằm trong thứ tự Tab (đầu → nội dung → cuối, mỗi phía là \`role="group"\`
có nhãn "Thao tác"); Tab tới nút → item tự mở phía đó; Enter / Space bấm nút; Esc hoặc Tab ra khỏi item → đóng.
Cử chỉ: kéo ngang bằng cảm ứng / chuột / bút (\`touch-action: pan-y\` → cuộn dọc vẫn bình thường); RTL tự đảo hướng.
Giảm chuyển động → bám mở / đóng tức thì, không nhấc item khi hover.
        `,
      },
    },
  },
  argTypes: {
    bordered: { control: 'boolean' },
    split: { control: 'inline-radio', options: ['true', 'false'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    'item-layout': { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
};

export const Default = {
  render: (args) => html`
    <hui-list
      header="Thành viên"
      footer="4 người"
      ?bordered=${args.bordered}
      split=${args.split}
      size=${args.size}
      ?loading=${args.loading}
      item-layout=${args['item-layout']}
    >${items()}</hui-list>
  `,
  args: { bordered: true, split: 'true', size: 'md', loading: false, 'item-layout': 'horizontal' },
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    await expect(list.itemCount).toBe(4);
    await expect(list.shadowRoot.querySelector('[part="items"]').getAttribute('role')).toBe('list');
    await expect(list.shadowRoot.querySelector('[part="empty"]').hidden).toBe(true);
    await expect(list.shadowRoot.querySelector('[part="header"]').textContent).toContain('Thành viên');
  },
};

export const AllSizes = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      ${['sm', 'md', 'lg'].map((s) => html`<hui-list bordered size=${s} header="size=${s}">${items(PEOPLE.slice(0, 2))}</hui-list>`)}
    </div>
  `,
};

export const NoSplit = {
  render: () => html`<hui-list split="false">${items()}</hui-list>`,
};

export const Loading = {
  render: () => html`<hui-list bordered loading>${items(PEOPLE.slice(0, 2))}</hui-list>`,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    const overlay = list.shadowRoot.querySelector('[part="loading"]');
    await expect(overlay.hidden).toBe(false);
    await expect(overlay.querySelector('hui-spinner')).toBeTruthy();
    await expect(list.shadowRoot.querySelector('[part="body"]').getAttribute('aria-busy')).toBe('true');
    list.loading = false;
    await list.updateComplete;
    await expect(overlay.hidden).toBe(true);
  },
};

export const Empty = {
  render: () => html`<hui-list bordered header="Không có ai"></hui-list>`,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    const empty = list.shadowRoot.querySelector('[part="empty"]');
    await expect(empty.hidden).toBe(false);
    await expect(empty.querySelector('hui-empty')).toBeTruthy();
    await expect(list.shadowRoot.querySelector('[part="items"]').hidden).toBe(true);

    // Thêm item → hết rỗng
    const item = document.createElement('hui-list-item');
    item.textContent = 'Item mới';
    list.append(item);
    await new Promise((r) => setTimeout(r, 0)); // chờ slotchange
    await expect(empty.hidden).toBe(true);
    await expect(list.itemCount).toBe(1);
  },
};

export const VerticalLayout = {
  render: () => html`
    <hui-list item-layout="vertical" size="lg">
      ${PEOPLE.slice(0, 2).map((p) => html`
        <hui-list-item>
          <hui-list-item-meta title=${p.title} description=${p.description}>
            <hui-avatar slot="avatar" size="lg">${p.title.split(' ').pop()[0]}</hui-avatar>
          </hui-list-item-meta>
          <p style="margin: 12px 0 0;">Đoạn nội dung dài mô tả chi tiết bài viết của thành viên, hiển thị dưới meta.</p>
          <span slot="actions">★ 156</span>
          <span slot="actions">♥ 32</span>
          <span slot="actions">💬 2</span>
          <div slot="extra" style="width: 200px; height: 120px; border-radius: 8px; background: linear-gradient(135deg, var(--hui-primary-3), var(--hui-primary-6));"></div>
        </hui-list-item>
      `)}
    </hui-list>
  `,
};

export const Grid = {
  render: () => html`
    <hui-list grid-column="4" grid-column-xs="1" grid-column-sm="2" grid-column-md="3" grid-gutter="16">
      ${['Hà Nội', 'Huế', 'Đà Nẵng', 'Hội An', 'Nha Trang', 'Đà Lạt', 'Sài Gòn', 'Cần Thơ'].map((city) => html`
        <hui-list-item>
          <strong>${city}</strong>
          <div style="color: var(--hui-text-secondary); margin-top: 4px;">Nội dung thẻ</div>
        </hui-list-item>
      `)}
    </hui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    const base = list.shadowRoot.querySelector('[part="base"]');
    const itemsEl = list.shadowRoot.querySelector('[part="items"]');
    await expect(base.classList.contains('hui-list--grid')).toBe(true);
    await expect(getComputedStyle(itemsEl).display).toBe('grid');
    await expect(itemsEl.style.getPropertyValue('--_list-gutter')).toBe('16px');
  },
};

export const DataSource = {
  render: () => html`<hui-list bordered header="Từ dataSource"></hui-list>`,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    list.dataSource = PEOPLE;
    await list.updateComplete;
    await expect(list.itemCount).toBe(4);
    await expect(list.shadowRoot.querySelector('hui-list-item-meta').getAttribute('title')).toBe(PEOPLE[0].title);

    // renderItem tùy biến
    list.renderItem = (p, i) => {
      const li = document.createElement('hui-list-item');
      li.textContent = `${i + 1}. ${p.title}`;
      return li;
    };
    await list.updateComplete;
    await expect(list.shadowRoot.querySelector('hui-list-item').textContent).toBe(`1. ${PEOPLE[0].title}`);

    list.dataSource = [];
    await list.updateComplete;
    await expect(list.shadowRoot.querySelector('[part="empty"]').hidden).toBe(false);
  },
};

export const WithPaginationSlot = {
  render: () => html`
    <hui-list bordered>
      ${items(PEOPLE.slice(0, 3))}
      <div slot="pagination" style="display: flex; gap: 4px;">
        <hui-button size="sm" variant="ghost">‹</hui-button>
        <hui-button size="sm">1</hui-button>
        <hui-button size="sm" variant="ghost">2</hui-button>
        <hui-button size="sm" variant="ghost">›</hui-button>
      </div>
    </hui-list>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    await expect(list.shadowRoot.querySelector('[part="pagination"]').hidden).toBe(false);
    // Phần tử slot="pagination" không bị tính là item
    await expect(list.itemCount).toBe(3);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .brand-list {
        --hui-list-border-color: var(--hui-primary-3);
        --hui-list-split-color: var(--hui-primary-2);
        --hui-list-header-bg: var(--hui-primary-1);
        --hui-list-radius: 4px;
        --hui-list-meta-title-color: var(--hui-primary-7);
      }
      hui-list.brand-list::part(header) { font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      hui-list.brand-list hui-list-item::part(base):hover { background: var(--hui-fill-tertiary); }
    </style>
    <hui-list class="brand-list" bordered header="Override bằng biến CSS + ::part">${items(PEOPLE.slice(0, 3))}</hui-list>
  `,
};

// === VUỐT (SWIPE ACTIONS) + HOVERABLE ===

/** Kéo ngang phần nội dung của item bằng PointerEvent giả lập (chuột) */
async function swipe(item, dx) {
  const base = item.shadowRoot.querySelector('[part="base"]');
  const r = base.getBoundingClientRect();
  const y = r.top + r.height / 2;
  const x0 = dx < 0 ? r.right - 20 : r.left + 20;
  const opts = (x) => ({ bubbles: true, composed: true, pointerId: 7, pointerType: 'mouse', button: 0, buttons: 1, clientX: x, clientY: y });
  base.dispatchEvent(new PointerEvent('pointerdown', opts(x0)));
  const steps = 6;
  for (let k = 1; k <= steps; k++) {
    base.dispatchEvent(new PointerEvent('pointermove', opts(x0 + (dx * k) / steps)));
    await new Promise((res) => setTimeout(res, 30)); // đều tay → không bị coi là "vẩy" nhanh
  }
  base.dispatchEvent(new PointerEvent('pointerup', { ...opts(x0 + dx), buttons: 0 }));
}

const offsetOf = (item) => {
  const tf = item.shadowRoot.querySelector('[part="base"]').style.transform;
  const m = /translateX\((-?[\d.]+)px\)/.exec(tf);
  return m ? Number(m[1]) : 0;
};

const MAIL = [
  { title: 'Hóa đơn tháng 10', description: 'Phòng kế toán · 09:12', actions: ['archive', 'delete'] },
  { title: 'Lịch họp sprint', description: 'Nguyễn Văn An · 08:30', actions: { start: ['read'], end: ['more', { action: 'delete', primary: true }] } },
  { title: 'Khuyến mãi cuối tuần', description: 'Cửa hàng · Hôm qua', actions: ['delete'] },
];

/**
 * Swipe actions bằng slot `actions-start` / `actions-end` (nút tự thiết kế).
 * Vuốt trái hiện nút phía cuối, vuốt phải hiện nút phía đầu; thả ra tự bám mở / đóng.
 * Bàn phím: Tab tới nút thao tác → item tự mở phía đó; Esc / rời focus → đóng.
 */
export const SwipeActions = {
  render: () => html`
    <style>
      .sw-btn { border: 0; color: var(--hui-text-inverse); font: inherit; font-size: 13px; padding: 0 16px; cursor: pointer; }
      .sw-btn.edit { background: var(--hui-primary); }
      .sw-btn.del { background: var(--hui-danger); }
      .sw-btn.pin { background: var(--hui-warning); }
    </style>
    <hui-list bordered header="Vuốt item sang trái / phải" style="max-width: 480px;">
      ${PEOPLE.slice(0, 3).map((p) => html`
        <hui-list-item>
          <hui-list-item-meta title=${p.title} description=${p.description}></hui-list-item-meta>
          <button slot="actions-start" class="sw-btn pin" data-action="pin">Ghim</button>
          <button slot="actions-end" class="sw-btn edit" data-action="edit">Sửa</button>
          <button slot="actions-end" class="sw-btn del" data-action="delete">Xóa</button>
        </hui-list-item>
      `)}
    </hui-list>
    <p class="out" role="status" style="font-size: 13px;"></p>
  `,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    const [a, b] = [...canvasElement.querySelectorAll('hui-list-item')];
    const out = canvasElement.querySelector('.out');
    list.addEventListener('hui-swipe-action', (e) => { out.textContent = `${e.detail.action} @ ${e.detail.side}`; });

    // Vuốt trái → mở phía cuối (Sửa + Xóa)
    await swipe(a, -120);
    await waitFor(() => expect(a.swipeState).toBe('end'));
    const endPanel = a.shadowRoot.querySelector('[part="actions-end"]');
    await waitFor(() => expect(Math.abs(offsetOf(a) + endPanel.offsetWidth)).toBeLessThan(1));

    // Mở item khác → item trước tự đóng
    await swipe(b, 100);
    await waitFor(() => expect(b.swipeState).toBe('start'));
    await expect(a.swipeState).toBe(null);
    await expect(offsetOf(a)).toBe(0);

    // Bấm nút → hui-swipe-action rồi đóng
    b.querySelector('[data-action="pin"]').click();
    await expect(out.textContent).toBe('pin @ start');
    await expect(b.swipeState).toBe(null);

    // Vuốt ngắn (< nửa bề rộng nút) → bật về
    await swipe(a, -20);
    await waitFor(() => expect(offsetOf(a)).toBe(0));
    await expect(a.swipeState).toBe(null);

    // Bàn phím: focus nút "Sửa" → mở phía cuối; Esc → đóng
    a.querySelector('[data-action="edit"]').focus();
    await waitFor(() => expect(a.swipeState).toBe('end'));
    await userEvent.keyboard('{Escape}');
    await expect(a.swipeState).toBe(null);
  },
};

/**
 * Swipe actions từ dữ liệu: `actions` của mỗi object (mảng → phía cuối, hoặc { start, end }).
 * Tên dựng sẵn: delete, edit, archive, pin, share, more, read (icon + màu + nhãn theo locale).
 * `full-swipe`: vuốt hết → chạy thao tác chính (primary, hoặc nút đầu tiên).
 */
export const SwipeFromData = {
  render: () => html`<hui-list bordered full-swipe header="Hộp thư (vuốt hết để chạy thao tác chính)" style="max-width: 480px;"></hui-list>
    <p class="out" role="status" style="font-size: 13px;"></p>`,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    const out = canvasElement.querySelector('.out');
    list.dataSource = MAIL;
    list.addEventListener('hui-swipe-action', (e) => {
      out.textContent = `${e.detail.action}:${e.detail.full}:${e.detail.item.title}`;
      if (e.detail.action === 'delete') list.dataSource = list.dataSource.filter((m) => m !== e.detail.item);
    });
    await list.updateComplete;
    const itemsOf = () => [...list.shadowRoot.querySelectorAll('hui-list-item')];
    await waitFor(() => expect(itemsOf().length).toBe(3));
    const first = itemsOf()[0];
    const btns = [...first.shadowRoot.querySelectorAll('[part~="swipe-action"]')];
    await expect(btns.map((x) => x.dataset.action)).toEqual(['archive', 'delete']);
    await expect(btns[1].getAttribute('part')).toBe('swipe-action swipe-action-danger');
    await expect(btns[1].textContent).toBe('Xóa');

    // Item 2: phía đầu "read", phía cuối primary = delete
    const second = itemsOf()[1];
    await expect(second.shadowRoot.querySelector('[part="actions-start"] [data-action]').dataset.action).toBe('read');

    // Vuốt hết item 1 → archive (nút đầu tiên), full = true
    await swipe(first, -(first.offsetWidth * 0.8));
    await waitFor(() => expect(out.textContent).toBe(`archive:true:${MAIL[0].title}`));
    await waitFor(() => expect(first.swipeState).toBe(null));

    // Vuốt hết item 2 → delete (primary) → bị xóa khỏi dữ liệu
    await swipe(second, -(second.offsetWidth * 0.8));
    await waitFor(() => expect(out.textContent).toBe(`delete:true:${MAIL[1].title}`));
    await waitFor(() => expect(itemsOf().length).toBe(2));

    // Bàn phím: focus nút dựng sẵn → mở; Enter → sự kiện
    const third = itemsOf()[1];
    const del = third.shadowRoot.querySelector('[data-action="delete"]');
    del.focus();
    await waitFor(() => expect(third.swipeState).toBe('end'));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(out.textContent).toBe(`delete:false:${MAIL[2].title}`));
    await waitFor(() => expect(itemsOf().length).toBe(1));
  },
};

/** Vuốt trong giao diện RTL: vuốt sang PHẢI hiện nút phía cuối (nằm bên trái) */
export const SwipeRTL = {
  render: () => html`
    <div dir="rtl" style="max-width: 420px;">
      <hui-list bordered header="RTL">
        <hui-list-item swipe-end='["delete"]' swipe-start='["pin"]'>
          <hui-list-item-meta title="Mục RTL" description="Vuốt phải → phía cuối, vuốt trái → phía đầu"></hui-list-item-meta>
        </hui-list-item>
      </hui-list>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const item = canvasElement.querySelector('hui-list-item');
    await swipe(item, 120);
    await waitFor(() => expect(item.swipeState).toBe('end'));
    await expect(offsetOf(item)).toBeGreaterThan(0);
    item.closeActions();
    await swipe(item, -120);
    await waitFor(() => expect(item.swipeState).toBe('start'));
    await expect(offsetOf(item)).toBeLessThan(0);
  },
};

/** hoverable — item nổi nhẹ khi rê chuột (nền + bóng + nhấc 2px; giảm chuyển động → không nhấc) */
export const Hoverable = {
  render: () => html`<hui-list hoverable bordered header="Rê chuột lên item" style="max-width: 480px;">${items(PEOPLE.slice(0, 3))}</hui-list>`,
  play: async ({ canvasElement }) => {
    const list = canvasElement.querySelector('hui-list');
    await expect(list.shadowRoot.querySelector('[part="base"]').classList.contains('hui-list--hoverable')).toBe(true);
    const item = canvasElement.querySelector('hui-list-item');
    // Biến nội bộ kế thừa xuống item (qua slot)
    await expect(getComputedStyle(item).getPropertyValue('--_list-hover-shadow').trim()).not.toBe('');
  },
};

/** Override thao tác vuốt từ ngoài: biến CSS + ::part */
export const SwipeCustomize = {
  render: () => html`
    <style>
      .sw-brand hui-list-item {
        --hui-list-item-swipe-action-width: 88px;
        --hui-list-item-swipe-bg: var(--hui-bg-secondary);
      }
      .sw-brand hui-list-item::part(swipe-action-danger) { background: var(--hui-danger-7, var(--hui-danger)); }
      .sw-brand hui-list-item::part(swipe-action) { font-size: 12px; text-transform: uppercase; }
    </style>
    <hui-list class="sw-brand" bordered style="max-width: 480px;">
      <hui-list-item swipe-end='["edit", "delete"]'><hui-list-item-meta title="Item tùy biến" description="Nút rộng 88px, chữ in hoa"></hui-list-item-meta></hui-list-item>
    </hui-list>
  `,
  play: async ({ canvasElement }) => {
    const item = canvasElement.querySelector('hui-list-item');
    await waitFor(() => expect(item.shadowRoot.querySelector('[data-action="edit"]')).not.toBeNull());
    const btn = item.shadowRoot.querySelector('[data-action="edit"]');
    await expect(btn.offsetWidth).toBeGreaterThanOrEqual(88);
    await expect(getComputedStyle(btn).textTransform).toBe('uppercase');
  },
};
