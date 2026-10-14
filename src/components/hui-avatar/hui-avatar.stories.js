/**
 * Storybook Stories — HUI Avatar & HUI Avatar Group
 * Ảnh đại diện với chuỗi fallback (ảnh → slot → chữ cái → icon) và nhóm avatar xếp chồng.
 */

import { html } from 'lit';
import './index.js';
import '../hui-badge/index.js';

// Ảnh mẫu (pravatar.cc trả về ảnh chân dung ngẫu nhiên theo id)
const photo = (id) => `https://i.pravatar.cc/150?img=${id}`;

export default {
  // Phân cấp trên sidebar Storybook
  title: 'Components/HuiAvatar',
  // Tên thẻ HTML custom element
  component: 'hui-avatar',
  // Tự sinh trang Docs
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Avatar** — Ảnh đại diện người dùng, kết hợp Ant Design \`Avatar\` và MUI \`Avatar\`.

Thứ tự ưu tiên hiển thị: **ảnh (\`src\`)** → **nội dung slot** → **chữ cái viết tắt từ \`name\`** → **icon người dùng mặc định**.
Ảnh lỗi sẽ tự chuyển sang fallback và phát event \`error\`.

### Cách sử dụng cơ bản
\`\`\`html
<hui-avatar src="/me.jpg" alt="Hoàng"></hui-avatar>
<hui-avatar name="Nguyễn Văn An"></hui-avatar>      <!-- "NA", màu nền tự sinh -->
<hui-avatar shape="rounded" color="success">OK</hui-avatar>

<hui-avatar-group max="3" size="lg">
  <hui-avatar name="An"></hui-avatar>
  <hui-avatar name="Bình"></hui-avatar>
  <hui-avatar name="Chi"></hui-avatar>
  <hui-avatar name="Dũng"></hui-avatar>   <!-- gộp vào "+1" -->
</hui-avatar-group>
\`\`\`

### Attributes — \`<hui-avatar>\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`src\` | string | — | Đường dẫn ảnh |
| \`alt\` | string | — | Mô tả ảnh, đồng thời là aria-label |
| \`name\` | string | — | Tên người dùng → chữ cái viết tắt (tối đa 2 chữ) + màu nền tự sinh theo tên |
| \`size\` | string \\| number | \`md\` | sm (26px), md (32px), lg (38px), xl (56px) hoặc số px |
| \`shape\` | string | \`circle\` | circle, square, rounded |
| \`color\` | string | — | Ghi đè màu nền: primary, secondary, success, warning, danger, info hoặc màu CSS |
| \`bordered\` | boolean | \`false\` | Vòng viền trắng bao quanh |

### Attributes — \`<hui-avatar-group>\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`max\` | number | — | Số avatar hiển thị tối đa, phần còn lại gộp thành "+N" |
| \`size\` | string \\| number | — | Kích thước áp dụng cho avatar con chưa tự đặt \`size\` |
| \`spacing\` | string | \`md\` | Mức chồng lấn: sm, md, lg |
| \`shape\` | string | — | Hình dạng áp dụng cho avatar con chưa tự đặt \`shape\` |

### Events — \`<hui-avatar>\`
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`error\` | \`{ src }\` | Ảnh tải thất bại (không bubble, giống \`<img>\`), avatar tự chuyển sang fallback |

### Slots
| Component | Slot | Mô tả |
|-----------|------|-------|
| \`hui-avatar\` | (default) | Icon hoặc chữ tùy ý, hiển thị khi không có ảnh (ưu tiên hơn \`name\`) |
| \`hui-avatar-group\` | (default) | Danh sách các \`<hui-avatar>\` |
        `,
      },
    },
  },

  argTypes: {
    src: {
      control: 'text',
      description: 'Đường dẫn ảnh đại diện',
      table: { type: { summary: 'string' } },
    },
    alt: {
      control: 'text',
      description: 'Mô tả ảnh / aria-label',
      table: { type: { summary: 'string' } },
    },
    name: {
      control: 'text',
      description: 'Tên người dùng (sinh chữ cái viết tắt + màu nền)',
      table: { type: { summary: 'string' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '72'],
      description: 'Kích thước (keyword hoặc số px)',
      table: { type: { summary: 'string | number' }, defaultValue: { summary: 'md' } },
    },
    shape: {
      control: 'select',
      options: ['circle', 'square', 'rounded'],
      description: 'Hình dạng avatar',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'circle' } },
    },
    color: {
      control: 'select',
      options: ['', 'primary', 'secondary', 'success', 'warning', 'danger', 'info', '#f97316'],
      description: 'Ghi đè màu nền (biến thể hoặc màu CSS)',
      table: { type: { summary: 'string' } },
    },
    bordered: {
      control: 'boolean',
      description: 'Vòng viền trắng bao quanh',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
};

// === STORIES — HUI AVATAR ===

/**
 * Story mặc định — Avatar chữ cái từ `name`. Thử nhập `src` để hiển thị ảnh,
 * hoặc xóa `name` để thấy icon mặc định.
 */
export const Default = {
  render: (args) => html`
    <hui-avatar
      src=${args.src}
      alt=${args.alt}
      name=${args.name}
      size=${args.size}
      shape=${args.shape}
      color=${args.color}
      ?bordered=${args.bordered}
    ></hui-avatar>
  `,
  args: {
    src: '',
    alt: '',
    name: 'Nguyễn Văn An',
    size: 'lg',
    shape: 'circle',
    color: '',
    bordered: false,
  },
};

/**
 * Ảnh — Avatar hiển thị ảnh từ `src`, ảnh được cắt vừa khung (object-fit: cover).
 */
export const WithImage = {
  render: () => html`
    <div style="display: flex; gap: 16px; align-items: center;">
      <hui-avatar size="xl" src=${photo(12)} alt="Người dùng 12"></hui-avatar>
      <hui-avatar size="xl" src=${photo(32)} alt="Người dùng 32" shape="rounded"></hui-avatar>
      <hui-avatar size="xl" src=${photo(47)} alt="Người dùng 47" shape="square"></hui-avatar>
    </div>
  `,
};

/**
 * Chữ cái viết tắt — Lấy chữ đầu của từ đầu + từ cuối. Màu nền cố định theo tên
 * (cùng tên luôn ra cùng màu).
 */
export const Initials = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center;">
      <hui-avatar size="lg" name="Nguyễn Văn An"></hui-avatar>
      <hui-avatar size="lg" name="Trần Thị Bình"></hui-avatar>
      <hui-avatar size="lg" name="Lê Chi"></hui-avatar>
      <hui-avatar size="lg" name="Phạm Dũng"></hui-avatar>
      <hui-avatar size="lg" name="hoang"></hui-avatar>
      <hui-avatar size="lg" name="Võ Minh Em"></hui-avatar>
    </div>
  `,
};

/**
 * Fallback — Ảnh lỗi → chữ cái từ `name`; không có `name` → icon mặc định.
 * Event `error` được phát ra khi ảnh lỗi (xem tab Actions / console).
 */
export const Fallback = {
  render: () => {
    const onError = (e) => console.log('[hui-avatar] error', e.detail);
    return html`
      <div style="display: flex; gap: 12px; align-items: center;">
        <hui-avatar size="lg" src="https://invalid.example/broken.png" name="Ảnh Lỗi" @error=${onError}></hui-avatar>
        <hui-avatar size="lg" src="https://invalid.example/broken.png" @error=${onError}></hui-avatar>
        <hui-avatar size="lg"></hui-avatar>
      </div>
    `;
  },
};

/**
 * Slot mặc định — Truyền icon SVG hoặc chữ tùy ý vào avatar.
 */
export const SlotContent = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center;">
      <hui-avatar size="lg" color="info">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"></path>
        </svg>
      </hui-avatar>
      <hui-avatar size="lg" color="warning">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path>
        </svg>
      </hui-avatar>
      <hui-avatar size="lg" color="success">OK</hui-avatar>
      <hui-avatar size="lg" shape="rounded" color="#f97316">VIP</hui-avatar>
    </div>
  `,
};

/**
 * Tất cả kích thước — sm, md, lg (đồng bộ với token form), xl và một size số (72px).
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center;">
      <hui-avatar size="sm" name="Small Size"></hui-avatar>
      <hui-avatar size="md" name="Medium Size"></hui-avatar>
      <hui-avatar size="lg" name="Large Size"></hui-avatar>
      <hui-avatar size="xl" name="Extra Large"></hui-avatar>
      <hui-avatar size="72" name="Custom Px"></hui-avatar>
    </div>
  `,
};

/**
 * Tất cả hình dạng — circle (mặc định), rounded, square.
 */
export const AllShapes = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center;">
      <hui-avatar size="xl" shape="circle" name="Circle Shape"></hui-avatar>
      <hui-avatar size="xl" shape="rounded" name="Rounded Shape"></hui-avatar>
      <hui-avatar size="xl" shape="square" name="Square Shape"></hui-avatar>
    </div>
  `,
};

/**
 * Tất cả màu sắc — Ghi đè màu nền bằng biến thể hoặc màu CSS tự do.
 */
export const AllVariants = {
  render: () => html`
    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
      <hui-avatar size="lg" color="primary">P</hui-avatar>
      <hui-avatar size="lg" color="secondary">S</hui-avatar>
      <hui-avatar size="lg" color="success">S</hui-avatar>
      <hui-avatar size="lg" color="warning">W</hui-avatar>
      <hui-avatar size="lg" color="danger">D</hui-avatar>
      <hui-avatar size="lg" color="info">I</hui-avatar>
      <hui-avatar size="lg" color="#0f172a">#</hui-avatar>
    </div>
  `,
};

/**
 * Bordered — Vòng viền trắng, hữu ích khi đặt avatar trên nền màu.
 */
export const Bordered = {
  render: () => html`
    <div style="display: flex; gap: 12px; padding: 16px; background: #6366f1; border-radius: 8px; width: fit-content;">
      <hui-avatar size="lg" bordered src=${photo(5)} alt="Ảnh"></hui-avatar>
      <hui-avatar size="lg" bordered name="Viền Trắng"></hui-avatar>
    </div>
  `,
};

/**
 * Kết hợp với hui-badge — Chấm trạng thái online / số tin nhắn trên avatar
 * (dùng overlap="circular" để chấm bám sát mép tròn).
 */
export const WithBadge = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: center;">
      <hui-badge dot color="success" overlap="circular" placement="bottom-right">
        <hui-avatar size="lg" src=${photo(8)} alt="Online"></hui-avatar>
      </hui-badge>
      <hui-badge count="3" overlap="circular">
        <hui-avatar size="lg" name="Tin Nhắn"></hui-avatar>
      </hui-badge>
    </div>
  `,
};

// === STORIES — HUI AVATAR GROUP ===

/**
 * Avatar Group — Xếp chồng nhiều avatar, mỗi avatar có vòng viền trắng tách nhau.
 * Điều chỉnh `max`, `size`, `spacing`, `shape` để thử mọi attribute của group.
 */
export const Group = {
  argTypes: {
    max: { control: { type: 'number', min: 1, max: 8 }, description: 'Số avatar hiển thị tối đa' },
    groupSize: {
      name: 'size',
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '48'],
      description: 'Kích thước truyền xuống avatar con',
    },
    spacing: { control: 'select', options: ['sm', 'md', 'lg'], description: 'Mức chồng lấn' },
    groupShape: {
      name: 'shape',
      control: 'select',
      options: ['circle', 'rounded', 'square'],
      description: 'Hình dạng truyền xuống avatar con',
    },
  },
  render: (args) => html`
    <hui-avatar-group
      max=${args.max}
      size=${args.groupSize}
      spacing=${args.spacing}
      shape=${args.groupShape}
    >
      <hui-avatar src=${photo(1)} alt="An"></hui-avatar>
      <hui-avatar name="Bình Trần"></hui-avatar>
      <hui-avatar src=${photo(5)} alt="Chi"></hui-avatar>
      <hui-avatar name="Dũng Phạm"></hui-avatar>
      <hui-avatar src=${photo(9)} alt="Em"></hui-avatar>
      <hui-avatar name="Giang Võ"></hui-avatar>
    </hui-avatar-group>
  `,
  args: {
    max: 4,
    groupSize: 'lg',
    spacing: 'md',
    groupShape: 'circle',
  },
};

/**
 * Group với max — Chỉ hiện N avatar đầu, phần còn lại gộp thành avatar "+N".
 */
export const GroupMax = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <hui-avatar-group max="2">
        <hui-avatar name="An Nguyễn"></hui-avatar>
        <hui-avatar name="Bình Trần"></hui-avatar>
        <hui-avatar name="Chi Lê"></hui-avatar>
        <hui-avatar name="Dũng Phạm"></hui-avatar>
      </hui-avatar-group>
      <hui-avatar-group max="3" size="lg">
        <hui-avatar src=${photo(11)} alt="1"></hui-avatar>
        <hui-avatar src=${photo(12)} alt="2"></hui-avatar>
        <hui-avatar src=${photo(13)} alt="3"></hui-avatar>
        <hui-avatar src=${photo(14)} alt="4"></hui-avatar>
        <hui-avatar src=${photo(15)} alt="5"></hui-avatar>
        <hui-avatar src=${photo(16)} alt="6"></hui-avatar>
        <hui-avatar src=${photo(17)} alt="7"></hui-avatar>
      </hui-avatar-group>
    </div>
  `,
};

/**
 * Group spacing & size — So sánh các mức chồng lấn sm / md / lg và kích thước nhóm.
 */
export const GroupSpacing = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${['sm', 'md', 'lg'].map((spacing) => html`
        <hui-avatar-group spacing=${spacing} size="lg">
          <hui-avatar name="An Nguyễn"></hui-avatar>
          <hui-avatar name="Bình Trần"></hui-avatar>
          <hui-avatar name="Chi Lê"></hui-avatar>
          <hui-avatar name="Dũng Phạm"></hui-avatar>
        </hui-avatar-group>
      `)}
      <hui-avatar-group size="sm" shape="rounded">
        <hui-avatar name="An Nguyễn"></hui-avatar>
        <hui-avatar name="Bình Trần"></hui-avatar>
        <!-- Avatar tự đặt size/shape riêng sẽ không bị group ghi đè -->
        <hui-avatar name="Chi Lê" size="lg" shape="circle"></hui-avatar>
      </hui-avatar-group>
    </div>
  `,
};
