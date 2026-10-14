/**
 * Storybook Stories — HUI Badge
 * Huy hiệu số đếm / chấm đỏ gắn ở góc nội dung, hoặc nhãn trạng thái độc lập.
 */

import { html } from 'lit';
import './index.js';
import '../hui-button/index.js';

// Hộp vuông giả lập nội dung được bọc (giống demo của Ant Design)
const box = (label = '') => html`
  <span
    style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;
           border-radius: 8px; background: #e2e8f0; color: #475569; font: 600 12px sans-serif;"
  >${label}</span>
`;

// Hình tròn giả lập avatar — dùng cho demo overlap="circular"
const circle = () => html`
  <span style="display: inline-block; width: 40px; height: 40px; border-radius: 50%; background: #cbd5e1;"></span>
`;

// Icon chuông dùng trong demo
const bellIcon = html`
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" style="display: block; color: #475569;">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
`;

export default {
  // Phân cấp trên sidebar Storybook
  title: 'Components/HuiBadge',
  // Tên thẻ HTML custom element
  component: 'hui-badge',
  // Tự sinh trang Docs
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Badge** — Huy hiệu số đếm, kết hợp Ant Design \`Badge\` và MUI \`Badge\`.
Bọc quanh nội dung (icon, avatar, nút...) để gắn chỉ báo ở góc, hoặc dùng độc lập như một nhãn inline.

### Cách sử dụng cơ bản
\`\`\`html
<hui-badge count="5">
  <hui-avatar name="Nguyễn Văn A"></hui-avatar>
</hui-badge>

<hui-badge dot><span>Tin nhắn</span></hui-badge>
<hui-badge count="120" max="99"></hui-badge>      <!-- standalone: 99+ -->
<hui-badge status="processing" text="Đang chạy"></hui-badge>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`count\` | number \\| string | — | Số đếm hoặc chữ (ví dụ "NEW"). Rỗng/0 → ẩn chỉ báo |
| \`max\` | number | \`99\` | Vượt quá max sẽ hiển thị \`max+\` |
| \`dot\` | boolean | \`false\` | Hiển thị chấm nhỏ thay cho số |
| \`show-zero\` | boolean | \`false\` | Vẫn hiển thị khi count = 0 |
| \`color\` | string | \`danger\` | primary, secondary, success, warning, danger, info hoặc màu CSS bất kỳ |
| \`variant\` | string | \`standard\` | standard (nền đặc), soft (nền nhạt) |
| \`placement\` | string | \`top-right\` | top-right, top-left, bottom-right, bottom-left |
| \`overlap\` | string | \`rectangular\` | rectangular, circular (kéo chỉ báo vào trong cho phần tử tròn) |
| \`offset\` | string | — | Dịch chuyển chỉ báo, dạng \`"x,y"\` (px) |
| \`status\` | string | — | success, processing, default, error, warning — chấm trạng thái (processing có vòng sóng) |
| \`text\` | string | — | Text cạnh chấm ở status mode; ở chế độ khác dùng làm aria-label cho chỉ báo |
| \`invisible\` | boolean | \`false\` | Ẩn chỉ báo (có animation thu nhỏ) |
| \`size\` | string | \`md\` | sm, md |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Nội dung được gắn badge. Bỏ trống → badge hiển thị inline độc lập |
| \`count\` | Nội dung tùy biến cho chỉ báo (ví dụ icon) thay cho số đếm |
        `,
      },
    },
  },

  argTypes: {
    count: {
      control: 'text',
      description: 'Số đếm hoặc text hiển thị',
      table: { type: { summary: 'number | string' } },
    },
    max: {
      control: 'number',
      description: 'Giá trị tối đa trước khi hiển thị "max+"',
      table: { type: { summary: 'number' }, defaultValue: { summary: '99' } },
    },
    dot: {
      control: 'boolean',
      description: 'Hiển thị chấm thay cho số',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    'show-zero': {
      control: 'boolean',
      description: 'Hiển thị cả khi count = 0',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'info', '#ec4899'],
      description: 'Màu chỉ báo (biến thể hoặc màu CSS tự do)',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'danger' } },
    },
    variant: {
      control: 'select',
      options: ['standard', 'soft'],
      description: 'Kiểu nền của chỉ báo',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'standard' } },
    },
    placement: {
      control: 'select',
      options: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
      description: 'Góc gắn chỉ báo',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'top-right' } },
    },
    overlap: {
      control: 'select',
      options: ['rectangular', 'circular'],
      description: 'Hình dạng nội dung bọc bên trong',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'rectangular' } },
    },
    offset: {
      control: 'text',
      description: 'Dịch chuyển chỉ báo dạng "x,y" (px)',
      table: { type: { summary: 'string' } },
    },
    status: {
      control: 'select',
      options: ['', 'success', 'processing', 'default', 'error', 'warning'],
      description: 'Chế độ chấm trạng thái (Ant Design)',
      table: { type: { summary: 'string' } },
    },
    text: {
      control: 'text',
      description: 'Text trạng thái / aria-label của chỉ báo',
      table: { type: { summary: 'string' } },
    },
    invisible: {
      control: 'boolean',
      description: 'Ẩn chỉ báo có animation',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
      description: 'Kích thước chỉ báo',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'md' } },
    },
  },
};

// === STORIES ===

/**
 * Story mặc định — Badge số đếm gắn ở góc trên phải của một khối nội dung.
 * Thay đổi controls để thử mọi attribute.
 */
export const Default = {
  render: (args) => html`
    <hui-badge
      count=${args.count}
      max=${args.max}
      ?dot=${args.dot}
      ?show-zero=${args['show-zero']}
      color=${args.color}
      variant=${args.variant}
      placement=${args.placement}
      overlap=${args.overlap}
      offset=${args.offset}
      status=${args.status}
      text=${args.text}
      ?invisible=${args.invisible}
      size=${args.size}
    >
      ${box()}
    </hui-badge>
  `,
  args: {
    count: '5',
    max: 99,
    dot: false,
    'show-zero': false,
    color: 'danger',
    variant: 'standard',
    placement: 'top-right',
    overlap: 'rectangular',
    offset: '',
    status: '',
    text: '',
    invisible: false,
    size: 'md',
  },
};

/**
 * Vượt giá trị tối đa — count lớn hơn `max` sẽ hiển thị dạng "99+" / "10+".
 */
export const Overflow = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: center;">
      <hui-badge count="99">${box()}</hui-badge>
      <hui-badge count="100">${box()}</hui-badge>
      <hui-badge count="1000" max="999">${box()}</hui-badge>
      <hui-badge count="15" max="10">${box()}</hui-badge>
    </div>
  `,
};

/**
 * Chế độ dot — Chấm nhỏ báo có thông tin mới mà không cần số.
 */
export const Dot = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: center;">
      <hui-badge dot>${bellIcon}</hui-badge>
      <hui-badge dot color="success">${box()}</hui-badge>
      <hui-badge dot size="sm"><span style="font: 14px sans-serif;">Tin nhắn</span></hui-badge>
    </div>
  `,
};

/**
 * Hiển thị số 0 — Mặc định count = 0 sẽ ẩn, thêm `show-zero` để vẫn hiện.
 */
export const ShowZero = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: center;">
      <hui-badge count="0">${box('ẩn')}</hui-badge>
      <hui-badge count="0" show-zero>${box('hiện')}</hui-badge>
    </div>
  `,
};

/**
 * Ẩn/hiện có animation — Bấm nút để bật `invisible`, hoặc tăng/giảm số đếm (có hiệu ứng nảy).
 */
export const Invisible = {
  render: () => {
    const getBadge = (e) => e.target.closest('.demo').querySelector('hui-badge');
    const toggle = (e) => getBadge(e).toggleAttribute('invisible');
    const change = (delta) => (e) => {
      const badge = getBadge(e);
      const next = Math.max(0, Number(badge.getAttribute('count') || 0) + delta);
      badge.setAttribute('count', String(next));
    };
    return html`
      <div class="demo" style="display: flex; gap: 16px; align-items: center;">
        <hui-badge count="5">${box()}</hui-badge>
        <hui-button size="sm" variant="secondary" @click=${change(-1)}>−</hui-button>
        <hui-button size="sm" variant="secondary" @click=${change(1)}>+</hui-button>
        <hui-button size="sm" variant="outline" @click=${toggle}>Ẩn / hiện</hui-button>
      </div>
    `;
  },
};

/**
 * Vị trí gắn — 4 góc của nội dung.
 */
export const Placements = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: center;">
      <hui-badge count="1" placement="top-right">${box('TR')}</hui-badge>
      <hui-badge count="2" placement="top-left">${box('TL')}</hui-badge>
      <hui-badge count="3" placement="bottom-right">${box('BR')}</hui-badge>
      <hui-badge count="4" placement="bottom-left">${box('BL')}</hui-badge>
    </div>
  `,
};

/**
 * Overlap — `circular` kéo chỉ báo vào sát mép cho phần tử tròn (avatar),
 * so sánh với `rectangular` mặc định.
 */
export const Overlap = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: center;">
      <hui-badge count="3">${circle()}</hui-badge>
      <hui-badge count="3" overlap="circular">${circle()}</hui-badge>
      <hui-badge dot>${circle()}</hui-badge>
      <hui-badge dot overlap="circular">${circle()}</hui-badge>
    </div>
  `,
};

/**
 * Offset — Tinh chỉnh vị trí chỉ báo bằng `offset="x,y"` (px).
 */
export const Offset = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: center;">
      <hui-badge count="5">${box()}</hui-badge>
      <hui-badge count="5" offset="-6,6">${box()}</hui-badge>
      <hui-badge count="5" offset="10,-4">${box()}</hui-badge>
    </div>
  `,
};

/**
 * Standalone — Không có nội dung bọc, badge hiển thị inline như một nhãn.
 */
export const Standalone = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center;">
      <hui-badge count="25"></hui-badge>
      <hui-badge count="4" color="#faad14"></hui-badge>
      <hui-badge count="109" color="success"></hui-badge>
      <hui-badge count="NEW" color="info"></hui-badge>
      <hui-badge count="HOT" variant="soft"></hui-badge>
    </div>
  `,
};

/**
 * Status mode (Ant Design) — Chấm trạng thái kèm text; `processing` có vòng sóng lan tỏa.
 */
export const Status = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <hui-badge status="success" text="Hoàn thành"></hui-badge>
      <hui-badge status="processing" text="Đang xử lý"></hui-badge>
      <hui-badge status="default" text="Mặc định"></hui-badge>
      <hui-badge status="error" text="Lỗi"></hui-badge>
      <hui-badge status="warning" text="Cảnh báo"></hui-badge>
      <div style="display: flex; gap: 24px; margin-top: 12px;">
        <hui-badge status="processing">${box()}</hui-badge>
        <hui-badge status="success" overlap="circular">${circle()}</hui-badge>
      </div>
    </div>
  `,
};

/**
 * Tất cả kích thước — sm và md, cho cả số đếm lẫn dot.
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: center;">
      <hui-badge count="8" size="sm">${box('sm')}</hui-badge>
      <hui-badge count="8" size="md">${box('md')}</hui-badge>
      <hui-badge dot size="sm">${box('sm')}</hui-badge>
      <hui-badge dot size="md">${box('md')}</hui-badge>
    </div>
  `,
};

/**
 * Tất cả biến thể — Các màu ở hai kiểu standard (nền đặc) và soft (nền nhạt).
 */
export const AllVariants = {
  render: () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'danger', 'info', '#ec4899'];
    return html`
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; gap: 12px;">
          ${colors.map((c) => html`<hui-badge count="12" color=${c}></hui-badge>`)}
        </div>
        <div style="display: flex; gap: 12px;">
          ${colors.map((c) => html`<hui-badge count="12" color=${c} variant="soft"></hui-badge>`)}
        </div>
      </div>
    `;
  },
};

/**
 * Slot "count" — Truyền icon tùy biến làm chỉ báo thay cho số đếm.
 */
export const CustomCount = {
  render: () => html`
    <div style="display: flex; gap: 32px; align-items: center;">
      <hui-badge color="danger">
        ${box()}
        <svg slot="count" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: block;">
          <circle cx="12" cy="12" r="11" fill="white"></circle>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
        </svg>
      </hui-badge>
      <hui-badge color="success" overlap="circular">
        ${circle()}
        <svg slot="count" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: block;">
          <circle cx="12" cy="12" r="11" fill="white"></circle>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
        </svg>
      </hui-badge>
    </div>
  `,
};

/**
 * Gắn lên nút bấm — Ví dụ thực tế: số thông báo chưa đọc, kèm aria-label qua `text`.
 */
export const OnButton = {
  render: () => html`
    <hui-badge count="7" text="7 thông báo chưa đọc">
      <hui-button variant="outline">Thông báo</hui-button>
    </hui-badge>
  `,
};
