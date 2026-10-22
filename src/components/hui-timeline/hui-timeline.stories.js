/**
 * Storybook Stories — HUI Timeline + HUI Timeline Item
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-avatar/index.js';

const HISTORY = [
  { label: '2015', heading: 'Thành lập', content: 'Ba nhà sáng lập mở văn phòng đầu tiên tại Đà Nẵng.', dot: 'home' },
  { label: '2017', heading: 'Sản phẩm đầu tiên', content: 'Ra mắt nền tảng bán hàng cho 500 cửa hàng nhỏ.', color: 'success' },
  { label: '2019', heading: 'Gọi vốn Series A', content: '5 triệu USD từ quỹ đầu tư khu vực.', dot: 'star', color: 'warning' },
  { label: '2022', heading: 'Mở rộng khu vực', content: 'Có mặt tại Thái Lan, Indonesia và Philippines.', color: 'info' },
  { label: '2026', heading: '1 triệu khách hàng', content: 'Đội ngũ 400 người, 6 văn phòng.', dot: 'heart', color: 'danger' },
];

const sides = (tl) => tl.items.map((el) => el.getAttribute('data-side'));

export default {
  title: 'Organisms/HuiTimeline',
  component: 'hui-timeline',
  subcomponents: { HuiTimelineItem: 'hui-timeline-item' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Timeline** — Dòng thời gian dọc (nội dung bên phải / trái / **xen kẽ 2 bên** kiểu "lịch sử công ty") hoặc ngang.
Mốc lấy từ \`<hui-timeline-item>\` con hoặc property \`data\`. Mỗi mốc **hiện dần khi cuộn tới** (lần lượt, trượt vào từ phía nội dung)
— tắt bằng \`no-animation\`, tự tắt khi người dùng bật giảm chuyển động.

\`\`\`html
<hui-timeline mode="alternate">
  <hui-timeline-item label="2015" heading="Thành lập" dot="home">Văn phòng đầu tiên…</hui-timeline-item>
  <hui-timeline-item label="2019" heading="Series A" color="warning">5 triệu USD…</hui-timeline-item>
</hui-timeline>
<hui-timeline pending="Đang ghi nhận..."></hui-timeline>
\`\`\`

### hui-timeline — Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`mode\` | string | \`left\` | \`left\` (nội dung bên phải trục) \\| \`right\` (bên trái) \\| \`alternate\` (xen kẽ) |
| \`orientation\` | string | \`vertical\` | \`vertical\` \\| \`horizontal\` (cuộn ngang khi hẹp) |
| \`pending\` | string | — | Có attribute → thêm mốc "đang tiếp diễn" ở cuối; giá trị = chữ hiển thị |
| \`reverse\` | boolean | \`false\` | Đảo thứ tự hiển thị |
| \`stagger\` / \`duration\` | number | \`90\` / \`500\` | Trễ giữa các mốc / thời lượng hiệu ứng hiện (ms) |
| \`label\` | string | "Dòng thời gian" | Nhãn ARIA của danh sách |
| \`no-animation\` | boolean | \`false\` | Tắt hiệu ứng hiện dần |

### hui-timeline — Properties
| Property | Mô tả |
|----------|-------|
| \`data\` | \`[{ label, heading, content, color, dot, position, pending }]\` — thay cho thẻ con |
| \`renderItem\` | \`(item, index) => Node \\| string\` — tự dựng nội dung mốc từ data |
| \`items\` | (chỉ đọc) các mốc đang hiển thị |

### hui-timeline-item — Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`color\` | string | \`primary\` | \`primary\` \\| \`success\` \\| \`warning\` \\| \`danger\` \\| \`info\` \\| \`gray\` hoặc màu CSS |
| \`dot\` | string | — | Tên icon (hui-icon) làm chấm |
| \`label\` | string | — | Nhãn thời gian (phía đối diện nội dung) |
| \`heading\` | string | — | Tiêu đề mốc |
| \`pending\` | boolean | \`false\` | Mốc đang diễn ra (chấm xoay) |
| \`position\` | string | — | \`left\` \\| \`right\` — ép phía nội dung khi mode="alternate" |

### Events
| Event | Detail | Khi nào |
|-------|--------|---------|
| \`hui-item-reveal\` | \`{ items }\` | Một nhóm mốc vừa hiện khi cuộn tới |

### Slots
| Thẻ | Slot | Mô tả |
|-----|------|-------|
| timeline | (mặc định) | Các \`<hui-timeline-item>\` |
| item | (mặc định) | Nội dung |
| item | \`dot\` | Chấm tùy biến (avatar, icon…) |
| item | \`label\` / \`heading\` | Nhãn / tiêu đề HTML |

### Parts
- timeline: \`base\`, \`list\`, \`item\` (mốc từ data), \`pending\`
- item: \`item\`, \`label\`, \`axis\`, \`dot\`, \`tail\`, \`body\`, \`heading\`, \`content\`

### CSS Variables (đặt trên hui-timeline hoặc từng item)
| Biến | Mô tả |
|------|-------|
| \`--hui-timeline-dot-size\` / \`--hui-timeline-dot-color\` / \`--hui-timeline-dot-bg\` | Chấm |
| \`--hui-timeline-tail-color\` / \`--hui-timeline-tail-width\` | Đường nối |
| \`--hui-timeline-gap\` / \`--hui-timeline-item-spacing\` / \`--hui-timeline-axis-width\` | Khoảng cách |
| \`--hui-timeline-label-color\` / \`--hui-timeline-heading-color\` / \`--hui-timeline-content-color\` | Màu chữ |
| \`--hui-timeline-item-min-width\` | Bề rộng tối thiểu mỗi mốc (ngang) |

### Accessibility
Danh sách \`role="list"\` (có \`aria-label\`), mỗi mốc \`role="listitem"\`; chấm/đường nối \`aria-hidden\`.
Không có điều khiển nên không cần phím tắt; link/nút bên trong nội dung giữ thứ tự Tab tự nhiên.
        `,
      },
    },
  },
  argTypes: {
    mode: { control: 'select', options: ['left', 'right', 'alternate'] },
    orientation: { control: 'select', options: ['vertical', 'horizontal'] },
    reverse: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`
    <hui-timeline id="tl-default" mode=${args.mode} orientation=${args.orientation} ?reverse=${args.reverse}>
      <hui-timeline-item heading="Tạo đơn hàng">Khách đặt 2 sản phẩm qua website.</hui-timeline-item>
      <hui-timeline-item heading="Thanh toán thành công" color="success">Ví điện tử · 1.250.000 ₫</hui-timeline-item>
      <hui-timeline-item heading="Đang giao" color="warning" dot="truck">Đơn vị vận chuyển đã lấy hàng.</hui-timeline-item>
      <hui-timeline-item heading="Giao hàng thành công" color="gray">Dự kiến 22/10.</hui-timeline-item>
    </hui-timeline>
  `,
  args: { mode: 'left', orientation: 'vertical', reverse: false },
  play: async ({ canvasElement }) => {
    const tl = canvasElement.querySelector('#tl-default');
    await tl.updateComplete;
    const list = tl.shadowRoot.querySelector('[part="list"]');
    await expect(list.getAttribute('role')).toBe('list');
    await expect(list.getAttribute('aria-label')).toBe('Dòng thời gian');
    const items = tl.items;
    await expect(items.length).toBe(4);
    await expect(items[0].getAttribute('role')).toBe('listitem');
    await expect(sides(tl)).toEqual(['right', 'right', 'right', 'right']);
    await expect(items[3].hasAttribute('data-last')).toBe(true);
    await expect(items[0].hasAttribute('data-last')).toBe(false);
    // Đường nối của mốc cuối bị ẩn
    await expect(getComputedStyle(items[3].shadowRoot.querySelector('[part="tail"]')).display).toBe('none');
    // Hiện dần khi cuộn tới → cuối cùng không còn mốc nào ẩn
    await waitFor(() => expect(items.every((el) => !el.hasAttribute('data-reveal'))).toBe(true), { timeout: 3000 });
  },
};

/** Lịch sử công ty — xen kẽ 2 bên, nhãn năm phía đối diện */
export const CompanyHistory = {
  render: () => html`
    <hui-timeline id="tl-history" mode="alternate">
      ${HISTORY.map((h) => html`
        <hui-timeline-item label=${h.label} heading=${h.heading} dot=${h.dot || ''} color=${h.color || 'primary'}>${h.content}</hui-timeline-item>`)}
    </hui-timeline>
  `,
  play: async ({ canvasElement }) => {
    const tl = canvasElement.querySelector('#tl-history');
    await tl.updateComplete;
    await expect(sides(tl)).toEqual(['right', 'left', 'right', 'left', 'right']);
    await expect(tl.items.every((el) => el.hasAttribute('data-centered'))).toBe(true);
    // Trục nằm giữa: cột nhãn và cột nội dung rộng bằng nhau
    const first = tl.items[0].shadowRoot;
    const label = first.querySelector('[part="label"]').getBoundingClientRect();
    const body = first.querySelector('[part="body"]').getBoundingClientRect();
    await expect(Math.abs(label.width - body.width)).toBeLessThan(2);
  },
};

/** mode="right" + nhãn thời gian (có nhãn → trục ở giữa) */
export const RightAndLabels = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px;">
      <hui-timeline id="tl-right" mode="right">
        <hui-timeline-item heading="Bắt đầu">Nội dung nằm bên trái trục.</hui-timeline-item>
        <hui-timeline-item heading="Tiếp theo" color="success">Căn phải theo trục.</hui-timeline-item>
        <hui-timeline-item heading="Kết thúc" color="danger">Mốc cuối.</hui-timeline-item>
      </hui-timeline>
      <hui-timeline id="tl-labels">
        <hui-timeline-item label="09:00" heading="Check-in">Đón khách tại sảnh.</hui-timeline-item>
        <hui-timeline-item label="10:30" heading="Hội thảo" color="info">Phòng A2.</hui-timeline-item>
        <hui-timeline-item label="12:00" heading="Ăn trưa" color="warning">Nhà hàng tầng 5.</hui-timeline-item>
      </hui-timeline>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const right = canvasElement.querySelector('#tl-right');
    await right.updateComplete;
    await expect(sides(right)).toEqual(['left', 'left', 'left']);
    const labels = canvasElement.querySelector('#tl-labels');
    await expect(labels.items[0].hasAttribute('data-centered')).toBe(true);
    await expect(labels.items[0].shadowRoot.querySelector('[part="label"]').textContent).toBe('09:00');
  },
};

/** Chấm tùy biến: icon, màu CSS, slot dot (avatar) */
export const CustomDots = {
  render: () => html`
    <hui-timeline>
      <hui-timeline-item dot="check" color="success" heading="Đã duyệt">Icon làm chấm.</hui-timeline-item>
      <hui-timeline-item color="#8b5cf6" heading="Màu CSS bất kỳ">color="#8b5cf6"</hui-timeline-item>
      <hui-timeline-item heading="Nguyễn An bình luận">
        <hui-avatar slot="dot" name="Nguyễn An" size="sm"></hui-avatar>
        Slot dot nhận avatar / phần tử bất kỳ.
      </hui-timeline-item>
      <hui-timeline-item dot="calendar" color="info">
        <strong slot="heading">Tiêu đề HTML</strong>
        Slot heading + slot label.
        <em slot="label">Hôm nay</em>
      </hui-timeline-item>
    </hui-timeline>
  `,
};

/** pending — mốc "đang tiếp diễn" ở cuối, đường nối trước nó nét đứt */
export const Pending = {
  render: () => html`
    <hui-timeline id="tl-pending" pending="Đang chờ xác nhận...">
      <hui-timeline-item heading="Gửi hồ sơ" color="success">01/10</hui-timeline-item>
      <hui-timeline-item heading="Phỏng vấn" color="success">08/10</hui-timeline-item>
    </hui-timeline>
  `,
  play: async ({ canvasElement }) => {
    const tl = canvasElement.querySelector('#tl-pending');
    await tl.updateComplete;
    const pending = tl.shadowRoot.querySelector('[part="pending"]');
    await expect(pending).not.toBeNull();
    await expect(pending.heading).toBe('Đang chờ xác nhận...');
    await expect(pending.hasAttribute('data-last')).toBe(true);
    await expect(tl.items[1].hasAttribute('data-dashed')).toBe(true);
    await expect(tl.items[1].hasAttribute('data-last')).toBe(false);
    // Bỏ pending → mốc cuối là item thật
    tl.pending = null;
    await tl.updateComplete;
    await expect(tl.shadowRoot.querySelector('[part="pending"]')).toBeNull();
    await expect(tl.items[1].hasAttribute('data-last')).toBe(true);
  },
};

/** data + reverse (mới nhất lên đầu) */
export const FromData = {
  render: () => html`<hui-timeline id="tl-data" mode="alternate" reverse pending=""></hui-timeline>`,
  play: async ({ canvasElement }) => {
    const tl = canvasElement.querySelector('#tl-data');
    tl.data = HISTORY;
    await tl.updateComplete;
    await expect(tl.items.length).toBe(5);
    await expect(tl.items[0].heading).toBe('Thành lập');
    await expect(tl.items[0].textContent).toContain('Đà Nẵng');
    // reverse: mốc đầu DOM nằm cuối khi nhìn → data-last
    await expect(tl.items[0].hasAttribute('data-last')).toBe(true);
    const pending = tl.shadowRoot.querySelector('[part="pending"]');
    await expect(pending.heading).toBe('Đang tiếp diễn...');
    // pending hiện đầu tiên (column-reverse) → bên phải
    await expect(pending.getAttribute('data-side')).toBe('right');
  },
};

/** renderItem — tự dựng nội dung từ data */
export const RenderItem = {
  render: () => html`<hui-timeline id="tl-render"></hui-timeline>`,
  play: async ({ canvasElement }) => {
    const tl = canvasElement.querySelector('#tl-render');
    tl.renderItem = (item) => {
      const p = document.createElement('p');
      p.style.margin = '0';
      p.innerHTML = '<b></b> — <span></span>';
      p.querySelector('b').textContent = item.label;
      p.querySelector('span').textContent = item.content;
      return p;
    };
    tl.data = HISTORY.slice(0, 3);
    await tl.updateComplete;
    await expect(tl.items[1].querySelector('b').textContent).toBe('2017');
  },
};

/** Ngang — cuộn ngang khi hẹp; alternate đặt nội dung trên/dưới xen kẽ */
export const Horizontal = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 32px;">
      <hui-timeline id="tl-h" orientation="horizontal">
        <hui-timeline-item label="Bước 1" heading="Đăng ký" color="success">Tạo tài khoản</hui-timeline-item>
        <hui-timeline-item label="Bước 2" heading="Xác minh" color="success">Email + SĐT</hui-timeline-item>
        <hui-timeline-item label="Bước 3" heading="Thiết lập">Cửa hàng</hui-timeline-item>
        <hui-timeline-item label="Bước 4" heading="Bán hàng" color="gray">Đơn đầu tiên</hui-timeline-item>
      </hui-timeline>
      <hui-timeline orientation="horizontal" mode="alternate" .data=${HISTORY}></hui-timeline>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const tl = canvasElement.querySelector('#tl-h');
    await tl.updateComplete;
    const [a, b] = tl.items.map((el) => el.getBoundingClientRect());
    await expect(Math.abs(a.top - b.top)).toBeLessThan(1);
    await expect(b.left).toBeGreaterThan(a.left);
    await expect(tl.items[0].getAttribute('data-orientation')).toBe('horizontal');
  },
};

/** Hiện dần khi cuộn tới (cuộn khung bên dưới) — no-animation hiện ngay */
export const RevealOnScroll = {
  render: () => html`
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div id="tl-scroll-box" style="height: 260px; overflow: auto; border: 1px dashed var(--hui-border); padding: 12px;">
        <p style="height: 320px; margin: 0; color: var(--hui-text-secondary);">↓ Cuộn xuống để thấy các mốc hiện lần lượt</p>
        <hui-timeline id="tl-reveal" mode="alternate" stagger="120" .data=${HISTORY}></hui-timeline>
      </div>
      <div style="height: 260px; overflow: auto; border: 1px dashed var(--hui-border); padding: 12px;">
        <hui-timeline id="tl-static" no-animation .data=${HISTORY}></hui-timeline>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const tl = canvasElement.querySelector('#tl-reveal');
    const still = canvasElement.querySelector('#tl-static');
    await tl.updateComplete;
    await expect(still.items.some((el) => el.hasAttribute('data-reveal'))).toBe(false);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      // Chưa cuộn tới → đang ẩn chờ hiện
      await expect(tl.items[4].getAttribute('data-reveal')).toBe('pending');
    }
    const revealed = [];
    tl.addEventListener('hui-item-reveal', (e) => revealed.push(...e.detail.items));
    canvasElement.querySelector('#tl-scroll-box').scrollTop = 2000;
    await waitFor(() => expect(tl.items[4].hasAttribute('data-reveal')).toBe(false), { timeout: 3000 });
    if (!reduced) await expect(revealed.length).toBeGreaterThan(0);
  },
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .tl-brand {
        --hui-timeline-dot-size: 14px;
        --hui-timeline-dot-color: var(--hui-warning);
        --hui-timeline-tail-color: var(--hui-warning-3);
        --hui-timeline-tail-width: 3px;
        --hui-timeline-item-spacing: 32px;
        --hui-timeline-heading-color: var(--hui-warning-7);
      }
      .tl-brand hui-timeline-item::part(body) {
        padding: 8px 12px;
        margin-bottom: 16px;
        border-radius: 8px;
        background: var(--hui-fill-tertiary);
      }
      .tl-brand hui-timeline-item::part(dot) { box-shadow: 0 0 0 4px var(--hui-warning-1); }
    </style>
    <hui-timeline class="tl-brand" id="tl-brand" no-animation>
      <hui-timeline-item color="" heading="Ý tưởng">Phác thảo</hui-timeline-item>
      <hui-timeline-item color="" heading="Thiết kế">Figma</hui-timeline-item>
      <hui-timeline-item color="" heading="Phát triển">Web Components</hui-timeline-item>
    </hui-timeline>
  `,
  play: async ({ canvasElement }) => {
    const tl = canvasElement.querySelector('#tl-brand');
    await tl.updateComplete;
    const dot = tl.items[0].shadowRoot.querySelector('[part="dot"]');
    await expect(dot.getBoundingClientRect().width).toBe(14);
    const tail = tl.items[0].shadowRoot.querySelector('[part="tail"]');
    await expect(getComputedStyle(tail).borderLeftWidth).toBe('3px');
  },
};
