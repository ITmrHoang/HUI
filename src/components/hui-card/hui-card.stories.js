/**
 * Storybook Stories — HUI Card
 * Thẻ nội dung kết hợp Ant Design Card + MUI Card: header, cover, actions, loading skeleton.
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
// Import button để dùng trong các demo slot actions / extra
import '../hui-button/index.js';
import '../hui-avatar/index.js';

// Ảnh mẫu dùng chung cho các story có cover
const SAMPLE_COVER = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=60';

// Avatar mẫu dạng chữ cái (không cần ảnh ngoài)
const avatar = (text, bg = 'var(--hui-primary, #6366f1)') => html`
  <span
    slot="avatar"
    style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:${bg};color:#fff;font-weight:600;"
  >${text}</span>
`;

export default {
  title: 'Components/HuiCard',
  component: 'hui-card',
  subcomponents: { HuiCardMeta: 'hui-card-meta' },
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Card** — Thẻ nội dung đa năng, kết hợp API của Ant Design Card và MUI Card.

### Cách sử dụng cơ bản
\`\`\`html
<hui-card title="Tiêu đề" subtitle="Phụ đề" cover="/anh.jpg" hoverable>
  <span slot="avatar">A</span>
  <hui-button slot="extra" variant="ghost" size="sm">Thêm</hui-button>
  Nội dung chính của card.
  <div slot="actions">
    <hui-button size="sm">Chia sẻ</hui-button>
  </div>
</hui-card>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`title\` | string | — | Tiêu đề trên header |
| \`subtitle\` | string | — | Phụ đề dưới tiêu đề (MUI CardHeader subheader) |
| \`variant\` | string | \`'elevated'\` | Kiểu card: \`elevated\` (bóng đổ), \`outlined\` (viền), \`filled\` (nền xám) |
| \`elevation\` | number | \`1\` | Độ nổi 0–4, chỉ áp dụng cho \`elevated\` |
| \`size\` | string | \`'md'\` | Padding: \`sm\` (12px), \`md\` (16px), \`lg\` (24px) |
| \`hoverable\` | boolean | \`false\` | Nổi lên + đậm bóng khi hover |
| \`clickable\` | boolean | \`false\` | Như hoverable + \`role="button"\`, focus được, Enter/Space phát \`click\` |
| \`loading\` | boolean | \`false\` | Hiện skeleton nhấp nháy thay cho nội dung |
| \`cover\` | string | — | URL ảnh cover (MUI CardMedia) |
| \`cover-height\` | string | \`'180px'\` | Chiều cao vùng cover |
| \`orientation\` | string | \`'vertical'\` | \`vertical\` hoặc \`horizontal\` (cover bên trái) |
| \`type\` | string | — | \`inner\`: card lồng trong card (header nền nhạt + kẻ dưới, viền mảnh, không bóng) |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`click\` | \`{ originalEvent }\` (khi dùng bàn phím) | Card clickable được click chuột (event native) hoặc nhấn Enter/Space |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Nội dung body |
| \`header\` | Thay thế toàn bộ header mặc định |
| \`avatar\` | Avatar bên trái tiêu đề |
| \`extra\` | Vùng góc phải header (Ant \`extra\` / MUI \`action\`) |
| \`cover\` | Media tùy biến (thay cho attribute \`cover\`) |
| \`actions\` | Thanh hành động cuối card có viền trên (Ant actions / MUI CardActions) |
| \`footer\` | Chân card |

> Các vùng header / cover / actions / footer tự ẩn khi không có attribute lẫn nội dung slot.

### Methods
| Method | Mô tả |
|--------|-------|
| _(không có)_ | Điều khiển hoàn toàn qua attribute |

### Mọi attribute đều có property tương ứng
\`\`\`js
card.loading = true;      // attribute "loading" tự được thêm
card.coverHeight = '120px'; // ↔ cover-height
\`\`\`

### Override giao diện từ bên ngoài
Biến CSS đặt trên card, thẻ cha hoặc \`:root\` đều có hiệu lực. Cần chỉnh sâu hơn → \`hui-card::part(...)\`.

| Biến CSS | Mặc định | Mô tả |
|----------|----------|-------|
| \`--hui-card-bg\` | \`--hui-bg-container\` | Nền card (filled: \`--hui-bg-secondary\`) |
| \`--hui-card-color\` | \`--hui-text-secondary\` | Màu chữ body |
| \`--hui-card-radius\` | \`--hui-radius-lg\` | Bo góc |
| \`--hui-card-padding\` | 12 / 16 / 24px | Khoảng đệm (theo size) |
| \`--hui-card-border-color\` | theo variant | Màu viền |
| \`--hui-card-shadow\` | theo elevation | Bóng đổ |
| \`--hui-card-hover-shadow\` | \`--hui-shadow-lg\` | Bóng đổ khi hover |
| \`--hui-card-title-color\` | \`--hui-text\` | Màu tiêu đề |
| \`--hui-card-title-font-size\` | theo size | Cỡ chữ tiêu đề |
| \`--hui-card-divider-color\` | \`--hui-border\` | Đường kẻ trên actions / footer |
| \`--hui-card-cover-height\` | \`180px\` | Chiều cao cover (attribute \`cover-height\` ưu tiên hơn) |
| \`--hui-card-cover-width\` | \`40%\` | Chiều rộng cover ở layout \`horizontal\` (tối đa 280px) |
| \`--hui-card-focus-color\` | \`--hui-primary\` | Viền focus khi clickable |
| \`--hui-card-header-bg\` | trong suốt (inner: \`--hui-fill-tertiary\`) | Nền header |

| Part | Phần tử |
|------|---------|
| \`card\` | Khung card |
| \`cover\`, \`cover-img\` | Vùng cover, ảnh cover |
| \`main\` | Khối header + body + actions + footer |
| \`header\`, \`avatar\`, \`title\`, \`subtitle\`, \`extra\` | Các phần của header |
| \`body\`, \`skeleton\` | Body, skeleton khi loading |
| \`actions\`, \`footer\` | Thanh actions, chân card |

### \`hui-card-meta\` (Ant Card.Meta)
Đặt trong body: avatar + tiêu đề + mô tả.

| Attribute / Slot | Mô tả |
|------------------|-------|
| \`title\` / slot \`title\` | Tiêu đề (1 dòng, ellipsis) |
| \`description\` / slot \`description\` | Mô tả |
| slot \`avatar\` | Avatar bên trái |

Parts: \`base\`, \`avatar\`, \`detail\`, \`title\`, \`description\` ·
Biến CSS: \`--hui-card-meta-title-color\`, \`--hui-card-meta-title-font-size\`, \`--hui-card-meta-description-color\`, \`--hui-card-meta-gap\`

### Bàn phím
| Phím | Hành động |
|------|-----------|
| \`Tab\` | Focus vào card \`clickable\` |
| \`Enter\` / \`Space\` | Phát \`click\` (card clickable) |
        `,
      },
    },
  },

  argTypes: {
    type: {
      control: 'radio',
      options: ['', 'inner'],
      description: 'Card lồng trong card',
      table: { type: { summary: 'string' } },
    },
    title: { control: 'text', description: 'Tiêu đề card', table: { type: { summary: 'string' } } },
    subtitle: { control: 'text', description: 'Phụ đề', table: { type: { summary: 'string' } } },
    variant: {
      control: 'select',
      options: ['elevated', 'outlined', 'filled'],
      description: 'Kiểu hiển thị',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'elevated' } },
    },
    elevation: {
      control: { type: 'range', min: 0, max: 4, step: 1 },
      description: 'Độ nổi (chỉ với elevated)',
      table: { type: { summary: 'number' }, defaultValue: { summary: '1' } },
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
      description: 'Kích thước padding',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'md' } },
    },
    hoverable: { control: 'boolean', description: 'Hiệu ứng nổi khi hover', table: { defaultValue: { summary: 'false' } } },
    clickable: { control: 'boolean', description: 'Card bấm được (role=button)', table: { defaultValue: { summary: 'false' } } },
    loading: { control: 'boolean', description: 'Hiện skeleton loading', table: { defaultValue: { summary: 'false' } } },
    cover: { control: 'text', description: 'URL ảnh cover', table: { type: { summary: 'string' } } },
    'cover-height': {
      control: 'text',
      description: 'Chiều cao cover',
      table: { type: { summary: 'string' }, defaultValue: { summary: '180px' } },
    },
    orientation: {
      control: 'radio',
      options: ['vertical', 'horizontal'],
      description: 'Hướng bố cục',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'vertical' } },
    },
  },
};

// === STORIES ===

/**
 * Story mặc định — Card có header, cover, nội dung và thanh actions.
 * Tất cả attribute đều được bind với Controls.
 */
export const Default = {
  render: (args) => html`
    <div style="max-width: 360px;">
      <hui-card
        title=${args.title}
        subtitle=${args.subtitle}
        variant=${args.variant}
        elevation=${args.elevation}
        size=${args.size}
        ?hoverable=${args.hoverable}
        ?clickable=${args.clickable}
        ?loading=${args.loading}
        cover=${args.cover}
        cover-height=${args['cover-height']}
        orientation=${args.orientation}
        type=${args.type}
      >
        Một chiếc card mẫu với ảnh cover, tiêu đề, phụ đề và các nút hành động ở cuối.
        <div slot="actions">
          <hui-button size="sm" variant="ghost">Chia sẻ</hui-button>
          <hui-button size="sm" variant="primary">Xem thêm</hui-button>
        </div>
      </hui-card>
    </div>
  `,
  args: {
    title: 'Hồ Hallstatt',
    subtitle: 'Áo · 14/10/2026',
    variant: 'elevated',
    elevation: 1,
    size: 'md',
    hoverable: false,
    clickable: false,
    loading: false,
    cover: SAMPLE_COVER,
    'cover-height': '180px',
    orientation: 'vertical',
    type: '',
  },
};

/**
 * Tất cả variant — elevated (bóng đổ), outlined (viền), filled (nền xám).
 */
export const AllVariants = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(3, 240px); gap: 24px;">
      <hui-card title="Elevated" subtitle="variant=elevated">Nổi bằng bóng đổ (MUI).</hui-card>
      <hui-card title="Outlined" subtitle="variant=outlined" variant="outlined">Viền mảnh (Ant bordered).</hui-card>
      <hui-card title="Filled" subtitle="variant=filled" variant="filled">Nền xám, không viền.</hui-card>
    </div>
  `,
};

/**
 * Các mức elevation 0 → 4 của variant elevated.
 */
export const Elevations = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(5, 150px); gap: 24px; padding: 16px;">
      ${[0, 1, 2, 3, 4].map((n) => html`<hui-card title="Elevation ${n}" elevation=${n} size="sm">Độ nổi ${n}</hui-card>`)}
    </div>
  `,
};

/**
 * Tất cả kích thước — sm (12px), md (16px), lg (24px) padding.
 */
export const AllSizes = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(3, 240px); gap: 24px; align-items: start;">
      <hui-card title="Small" subtitle="size=sm" size="sm" variant="outlined">Padding 12px.</hui-card>
      <hui-card title="Medium" subtitle="size=md" size="md" variant="outlined">Padding 16px.</hui-card>
      <hui-card title="Large" subtitle="size=lg" size="lg" variant="outlined">Padding 24px.</hui-card>
    </div>
  `,
};

/**
 * Hoverable & Clickable — card nổi lên khi hover; card clickable còn focus được bằng Tab
 * và phát sự kiện click khi nhấn Enter/Space.
 */
export const HoverableAndClickable = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(2, 260px); gap: 24px;">
      <hui-card title="Hoverable" hoverable>Di chuột vào để thấy hiệu ứng nổi.</hui-card>
      <hui-card
        title="Clickable"
        clickable
        @click=${() => {
          const out = document.querySelector('#card-click-log');
          if (out) out.textContent = `Đã click lúc ${new Date().toLocaleTimeString()}`;
        }}
      >
        Click hoặc Tab tới rồi nhấn Enter/Space.
        <div slot="footer" id="card-click-log">Chưa click</div>
      </hui-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('hui-card[clickable]');
    const inner = card.shadowRoot.querySelector('[part="card"]');
    await expect(inner.getAttribute('role')).toBe('button');

    let clicks = 0;
    card.addEventListener('click', () => clicks++);
    inner.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await expect(clicks).toBe(1);

    // Đổi property không dựng lại DOM
    card.loading = true;
    await card.updateComplete;
    await expect(card.hasAttribute('loading')).toBe(true);
    await expect(card.shadowRoot.querySelector('[part="card"]')).toBe(inner);
    await expect(card.shadowRoot.querySelector('[part="skeleton"]').hidden).toBe(false);
    card.loading = false;
    await card.updateComplete;
    await expect(card.shadowRoot.querySelector('[part="skeleton"]').hidden).toBe(true);
  },
};

/**
 * Loading — hiển thị skeleton shimmer thay cho nội dung body.
 */
export const Loading = {
  render: () => html`
    <div style="max-width: 360px;">
      <hui-card title="Đang tải dữ liệu" subtitle="Vui lòng chờ..." loading>
        Nội dung này bị ẩn trong lúc loading.
      </hui-card>
    </div>
  `,
};

/**
 * Cover — ảnh qua attribute `cover`, tùy chỉnh chiều cao bằng `cover-height`.
 */
export const WithCover = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(2, 300px); gap: 24px; align-items: start;">
      <hui-card cover=${SAMPLE_COVER} title="Cover 180px (mặc định)">Ảnh cover chuẩn.</hui-card>
      <hui-card cover=${SAMPLE_COVER} cover-height="120px" title="Cover 120px">Ảnh cover thấp hơn.</hui-card>
    </div>
  `,
};

/**
 * Horizontal — cover nằm bên trái, nội dung bên phải.
 */
export const Horizontal = {
  render: () => html`
    <div style="max-width: 560px;">
      <hui-card orientation="horizontal" cover=${SAMPLE_COVER} title="Bố cục ngang" subtitle="orientation=horizontal">
        Cover chiếm 40% chiều rộng (tối đa 280px), nội dung nằm bên phải.
        <div slot="actions"><hui-button size="sm">Đặt phòng</hui-button></div>
      </hui-card>
    </div>
  `,
};

/**
 * Slots header — avatar bên trái tiêu đề và extra góc phải.
 */
export const HeaderSlots = {
  render: () => html`
    <div style="max-width: 380px;">
      <hui-card title="Nguyễn Văn A" subtitle="2 giờ trước" variant="outlined">
        ${avatar('A')}
        <hui-button slot="extra" size="sm" variant="ghost">Theo dõi</hui-button>
        Header kiểu MUI CardHeader: avatar + title + subheader + action.
      </hui-card>
    </div>
  `,
};

/**
 * Slot header tùy biến — thay thế toàn bộ header mặc định.
 */
export const CustomHeader = {
  render: () => html`
    <div style="max-width: 360px;">
      <hui-card variant="outlined">
        <div slot="header" style="display:flex;justify-content:space-between;align-items:center;">
          <strong>Header tùy biến</strong>
          <span style="font-size:12px;color:#94a3b8;">slot="header"</span>
        </div>
        Nội dung body.
      </hui-card>
    </div>
  `,
};

/**
 * Slot cover tùy biến — chèn media bất kỳ (ở đây là gradient) thay cho ảnh.
 */
export const CustomCover = {
  render: () => html`
    <div style="max-width: 320px;">
      <hui-card title="Cover tùy biến">
        <div
          slot="cover"
          style="height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;font-size:24px;font-weight:700;"
        >HUI</div>
        Slot cover nhận bất kỳ nội dung nào.
      </hui-card>
    </div>
  `,
};

/**
 * Slots actions + footer — thanh hành động có viền trên và chân card.
 */
export const ActionsAndFooter = {
  render: () => html`
    <div style="max-width: 360px;">
      <hui-card title="Gói Pro" subtitle="199.000đ / tháng">
        Không giới hạn dự án, hỗ trợ ưu tiên 24/7.
        <div slot="actions" style="display:flex;gap:8px;width:100%;justify-content:flex-end;">
          <hui-button size="sm" variant="ghost">Để sau</hui-button>
          <hui-button size="sm" variant="primary">Nâng cấp</hui-button>
        </div>
        <span slot="footer">Có thể hủy bất kỳ lúc nào.</span>
      </hui-card>
    </div>
  `,
};

/**
 * Chỉ có body — header/cover/actions/footer tự ẩn khi không có nội dung.
 */
export const BodyOnly = {
  render: () => html`
    <div style="max-width: 320px;">
      <hui-card variant="filled">Card tối giản chỉ có nội dung.</hui-card>
    </div>
  `,
};

/**
 * Card Meta — avatar + tiêu đề + mô tả trong body (Ant Card.Meta), kết hợp cover + hoverable.
 */
export const Meta = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(2, 300px); gap: 24px;">
      <hui-card hoverable cover=${SAMPLE_COVER} cover-height="160">
        <hui-card-meta title="Hồ Hallstatt" description="Ngôi làng bên hồ đẹp nhất nước Áo">
          <hui-avatar slot="avatar">H</hui-avatar>
        </hui-card-meta>
        <div slot="actions" style="display:flex;gap:8px;">
          <hui-button size="sm" variant="ghost">Lưu</hui-button>
          <hui-button size="sm">Đặt tour</hui-button>
        </div>
      </hui-card>
      <hui-card variant="outlined">
        <hui-card-meta>
          <span slot="title">Tiêu đề qua slot</span>
          <span slot="description">Mô tả qua slot, không có avatar.</span>
        </hui-card-meta>
      </hui-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('hui-card[hoverable]');
    const inner = card.shadowRoot.querySelector('[part="card"]');
    await expect(inner.classList.contains('hui-card--hoverable')).toBe(true);
    // Hoverable không biến card thành nút
    await expect(inner.hasAttribute('role')).toBe(false);

    const meta = card.querySelector('hui-card-meta');
    await expect(meta.shadowRoot.querySelector('[part="title"]').textContent).toBe('Hồ Hallstatt');
    await expect(meta.shadowRoot.querySelector('[part="avatar"]').hidden).toBe(false);

    const slotted = canvasElement.querySelectorAll('hui-card-meta')[1];
    await expect(slotted.shadowRoot.querySelector('[part="avatar"]').hidden).toBe(true);
    await expect(slotted.shadowRoot.querySelector('[part="title"]').hidden).toBe(false);

    meta.description = '';
    await meta.updateComplete;
    await expect(meta.shadowRoot.querySelector('[part="description"]').hidden).toBe(true);
  },
};

/**
 * type="inner" — card lồng trong card: header nền nhạt + kẻ dưới, không bóng.
 */
export const InnerType = {
  render: () => html`
    <div style="max-width: 520px;">
      <hui-card title="Card ngoài" variant="outlined">
        <hui-card type="inner" title="Card con 1" size="sm">
          <a slot="extra" href="#">Thêm</a>
          Nội dung card con.
        </hui-card>
        <div style="height: 16px;"></div>
        <hui-card type="inner" title="Card con 2" size="sm">Nội dung card con.</hui-card>
      </hui-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const inner = canvasElement.querySelector('hui-card[type="inner"]');
    const frame = inner.shadowRoot.querySelector('[part="card"]');
    await expect(frame.classList.contains('hui-card--inner')).toBe(true);
    await expect(getComputedStyle(frame).boxShadow).toBe('none');
    const header = inner.shadowRoot.querySelector('[part="header"]');
    await expect(getComputedStyle(header).borderBottomStyle).toBe('solid');
  },
};

/**
 * Override từ bên ngoài — biến CSS đặt trên thẻ cha / chính card, và ::part().
 */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .demo-cards { --hui-card-radius: 4px; --hui-card-padding: 20px; }
      hui-card.brand {
        --hui-card-bg: var(--hui-primary-1);
        --hui-card-border-color: var(--hui-primary-3);
        --hui-card-title-color: var(--hui-primary-7);
        --hui-card-divider-color: var(--hui-primary-3);
        --hui-card-shadow: none;
      }
      hui-card.caps::part(title) { text-transform: uppercase; letter-spacing: 0.06em; }
      hui-card.caps::part(header) { border-bottom: 1px dashed var(--hui-border); padding-bottom: 12px; }
    </style>
    <div class="demo-cards" style="display: grid; grid-template-columns: repeat(3, 240px); gap: 24px; align-items: start;">
      <hui-card title="Biến CSS trên thẻ cha" variant="outlined">radius 4px + padding 20px cho mọi card con.</hui-card>
      <hui-card class="brand" title="Màu thương hiệu" subtitle="--hui-card-*">
        Nền, viền, tiêu đề theo palette primary.
        <div slot="actions"><hui-button size="sm">OK</hui-button></div>
      </hui-card>
      <hui-card class="caps" title="::part(title)" variant="filled">Chỉnh sâu bằng ::part().</hui-card>
    </div>
  `,
};

// ── Hiệu ứng, link, chọn nhiều (A2.1 + A6.5) ────────────────────────────

/** Ảnh minh họa tự tạo (SVG) — không phụ thuộc mạng */
const art = (seed) => {
  const hue = (seed * 53) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${hue} 75% 62%)"/><stop offset="1" stop-color="hsl(${(hue + 70) % 360} 70% 42%)"/></linearGradient></defs><rect width="400" height="240" fill="url(#g)"/><circle cx="320" cy="60" r="70" fill="white" opacity=".15"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const fxGrid = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; padding: 8px;';

/**
 * effect="lift | tilt | glow | zoom-media | reveal | border-gradient" — kết hợp nhiều giá trị bằng khoảng trắng.
 * tilt / glow tải module hui-lib/effects khi cần (chỉ chạy trên thiết bị có chuột).
 */
export const Effects = {
  render: () => html`
    <div style=${fxGrid}>
      ${['lift', 'tilt', 'glow', 'zoom-media', 'reveal', 'border-gradient', 'lift zoom-media reveal', 'tilt glow'].map((fx, i) => html`
        <hui-card effect=${fx} cover=${art(i)} cover-height="130" title=${fx}>
          ${fx.includes('reveal') ? html`<hui-button slot="overlay" size="sm" variant="secondary">Xem nhanh</hui-button>` : ''}
          Rê chuột lên card để thấy hiệu ứng.
        </hui-card>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const cards = canvasElement.querySelectorAll('hui-card');
    const inner = (c) => c.shadowRoot.querySelector('[part="card"]');
    await expect(inner(cards[0]).classList.contains('hui-card--fx-lift')).toBe(true);
    await expect(inner(cards[0]).classList.contains('hui-card--hoverable')).toBe(true);
    await expect(inner(cards[5]).classList.contains('hui-card--fx-border-gradient')).toBe(true);
    await expect(getComputedStyle(inner(cards[5]), '::before').animationName).toMatch(/hui-card-spin|none/);
    // reveal: lớp phủ ẩn cho tới khi hover
    const overlay = cards[4].shadowRoot.querySelector('[part="overlay"]');
    await expect(overlay.hidden).toBe(false);
    await expect(getComputedStyle(overlay).opacity).toBe('0');
  },
};

/** Cả card là link: Tab tới tiêu đề, Ctrl/chuột giữa mở tab mới; nút bên trong vẫn hoạt động riêng */
export const AsLink = {
  render: () => html`
    <div style=${fxGrid}>
      <hui-card href="#bai-viet" title="Bấm vào chỗ trống của card" cover=${art(3)} cover-height="120" effect="lift zoom-media">
        Card dẫn tới <code>#bai-viet</code>.
        <hui-button slot="actions" size="sm" variant="text" id="inner-btn">Nút riêng (không mở link)</hui-button>
      </hui-card>
      <hui-card href="#khong-tieu-de" cover=${art(8)} cover-height="120">Không có tiêu đề → link ẩn "Xem chi tiết" cho bàn phím</hui-card>
      <hui-card href="#san-pham" cover=${art(9)} cover-height="120">
        <a href="#san-pham" id="own-link">Nội dung đã có link riêng</a> → không thêm link ẩn (1 điểm dừng Tab)
      </hui-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const [card, noTitle] = canvasElement.querySelectorAll('hui-card');
    const link = card.shadowRoot.querySelector('[part="link"]');
    await expect(link.getAttribute('href')).toBe('#bai-viet');
    await expect(link.textContent).toBe('Bấm vào chỗ trống của card');
    // Click vào nút bên trong không kích hoạt link
    let navigated = 0;
    link.addEventListener('click', (e) => { navigated++; e.preventDefault(); });
    canvasElement.querySelector('#inner-btn').click();
    await expect(navigated).toBe(0);
    card.shadowRoot.querySelector('[part="body"]').click();
    await expect(navigated).toBe(1);
    const hidden = noTitle.shadowRoot.querySelector('[part="link"]');
    await expect(hidden.getAttribute('aria-label')).toBe('Xem chi tiết');
    // Có <a href> trong nội dung → không chèn link ẩn; click chỗ trống dùng chính link đó
    const ownCard = canvasElement.querySelectorAll('hui-card')[2];
    await expect(ownCard.shadowRoot.querySelector('[part="link"]')).toBe(null);
    let ownClicks = 0;
    canvasElement.querySelector('#own-link').addEventListener('click', (e) => { ownClicks++; e.preventDefault(); });
    ownCard.shadowRoot.querySelector('[part="cover"]').click();
    await expect(ownClicks).toBe(1);
  },
};

/** Chọn nhiều card (bấm / Space / Enter), phát change {selected} */
export const Selectable = {
  render: () => html`
    <div style=${fxGrid} id="sel-grid">
      ${['Gói cơ bản', 'Gói tiêu chuẩn', 'Gói nâng cao'].map((name, i) => html`
        <hui-card selectable ?selected=${i === 1} title=${name} variant="outlined">Bấm để chọn</hui-card>`)}
    </div>
    <p id="sel-log" style="font: 13px var(--hui-font-mono)">Đang chọn: Gói tiêu chuẩn</p>
  `,
  play: async ({ canvasElement }) => {
    const cards = [...canvasElement.querySelectorAll('hui-card')];
    const log = canvasElement.querySelector('#sel-log');
    const sync = () => { log.textContent = `Đang chọn: ${cards.filter((c) => c.selected).map((c) => c.title).join(', ')}`; };
    cards.forEach((c) => c.addEventListener('change', sync));
    const inner = (c) => c.shadowRoot.querySelector('[part="card"]');
    await expect(inner(cards[1]).getAttribute('aria-checked')).toBe('true');
    inner(cards[0]).click();
    await expect(cards[0].selected).toBe(true);
    inner(cards[2]).dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true }));
    await expect(cards[2].selected).toBe(true);
    await expect(log.textContent).toBe('Đang chọn: Gói cơ bản, Gói tiêu chuẩn, Gói nâng cao');
  },
};

/** variant="ghost" + slot overlay luôn hiện (không có effect reveal) */
export const GhostAndOverlay = {
  render: () => html`
    <div style=${fxGrid}>
      <hui-card variant="ghost" cover=${art(5)} cover-height="160">
        <span slot="overlay" style="font-weight: 600">Chú thích trên ảnh</span>
        Card ghost: không nền, không viền, không bóng.
      </hui-card>
      <hui-card cover=${art(6)} cover-height="160" title="Nút block trong actions">
        <hui-button slot="actions" block>Mua ngay</hui-button>
      </hui-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelectorAll('hui-card')[1];
    const btn = card.querySelector('hui-button');
    const actions = card.shadowRoot.querySelector('[part="actions"]');
    // Nút block giãn gần hết chiều ngang thanh actions
    await expect(btn.getBoundingClientRect().width).toBeGreaterThan(actions.getBoundingClientRect().width * 0.7);
  },
};
