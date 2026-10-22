/**
 * Storybook Stories — HUI Tag
 * Nhãn / Chip nhỏ gọn: phân loại, đánh dấu, lọc. Kết hợp Ant Design Tag/CheckableTag + MUI Chip.
 */

import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { expect, waitFor, userEvent } from 'storybook/test';
import './index.js';

// Ảnh avatar tự sinh (SVG data URI — không dùng tài nguyên mạng)
const avatarSrc = (bg) => `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="${bg}"/><circle cx="20" cy="15" r="7" fill="#fff" opacity=".9"/><rect x="8" y="25" width="24" height="16" rx="8" fill="#fff" opacity=".9"/></svg>`,
)}`;

// Đổi màu CSS bất kỳ (oklab, color(srgb-linear …)…) → [r, g, b, a] 0..255 qua canvas
const toRgba = (css) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data];
};
// Chồng màu bán trong suốt lên nền đặc
const over = ([r, g, b, a], base) => [r, g, b].map((v, i) => v * (a / 255) + base[i] * (1 - a / 255));
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Tỷ lệ tương phản WCAG giữa chữ và nền (đã chồng lên nền trang) của [part=base] trong tag */
const tagContrast = (tag) => {
  const pageBg = toRgba(getComputedStyle(document.body).backgroundColor);
  const base = tag.shadowRoot.querySelector('[part="base"]');
  const cs = getComputedStyle(base);
  const bg = over(toRgba(cs.backgroundColor), pageBg);
  const fg = over(toRgba(cs.color), bg);
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
};

// Icon SVG dùng chung cho các demo slot
const starIcon = html`
  <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
`;

export default {
  // Phân cấp trên sidebar Storybook
  title: 'Components/HuiTag',
  // Tên thẻ HTML custom element
  component: 'hui-tag',
  // Tự sinh trang Docs
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Tag** — Nhãn nhỏ gọn dùng để phân loại, đánh dấu trạng thái hoặc làm bộ lọc. Kết hợp Ant Design Tag / CheckableTag và MUI Chip.

> **\`hui-chip\` được gộp vào \`hui-tag\`** (không có thẻ riêng): chip MUI = \`<hui-tag shape="pill">\` + \`avatar\` / \`icon\`;
> chip bấm được = \`clickable\`; chip lọc bật/tắt = \`clickable toggle\` (\`selected\`, \`aria-pressed\`) hoặc \`checkable\` (\`role="checkbox"\`);
> chip xóa được = \`closable\`.

### Cách sử dụng cơ bản
\`\`\`html
<hui-tag color="success">Hoạt động</hui-tag>
<hui-tag color="#f50" variant="filled" closable>Tùy chỉnh</hui-tag>
<hui-tag checkable checked>Có thể chọn</hui-tag>
<!-- Chip -->
<hui-tag shape="pill" avatar="Nguyễn Văn A" closable>Nguyễn Văn A</hui-tag>
<hui-tag shape="pill" variant="outlined" avatar="/img/u1.png" clickable>Hồ sơ</hui-tag>
<hui-tag shape="pill" clickable toggle selected>Còn hàng</hui-tag>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`color\` | string | — (xám trung tính) | primary, secondary, success, warning, danger, info **hoặc bất kỳ mã màu CSS** (\`#f50\`, \`rgb(...)\`, \`hotpink\`) |
| \`variant\` | string | \`soft\` | soft (nền nhạt), filled (nền đặc), outlined (chỉ viền) |
| \`size\` | string | \`md\` | sm (20px), md (24px), lg (32px) — nhỏ hơn form control (26/32/38px) vì tag là phần tử phụ |
| \`shape\` | string | \`rounded\` | rounded, pill, square |
| \`icon\` | string | — | Tên icon (xem HuiIcon) trước nhãn — giống \`icon\` của MUI Chip. Slot \`icon\` thắng attribute này |
| \`avatar\` | string | — | Avatar trước nhãn qua \`hui-avatar\`: URL / data URI ảnh, hoặc tên → chữ viết tắt + màu tự sinh. Slot \`avatar\` thắng attribute này |
| \`closable\` | boolean | \`false\` | Hiển thị nút × để xóa tag. Phím Backspace/Delete khi đang focus cũng xóa tag |
| \`clickable\` | boolean | \`false\` | Tag hoạt động như nút bấm: hover/active, focus được, \`role="button"\`, Enter/Space phát \`click\` |
| \`toggle\` | boolean | \`false\` | (cùng \`clickable\`) Chip bật/tắt: click / Enter / Space đảo \`selected\`, phát \`change { selected }\` |
| \`selected\` | boolean | \`false\` | Đang chọn: nền đặc + icon ✓ (khi không có icon/avatar); chip \`clickable\` → \`aria-pressed\` |
| \`checkable\` | boolean | \`false\` | Tag bật/tắt (Ant CheckableTag): \`role="checkbox"\`, click/Enter/Space để toggle |
| \`checked\` | boolean | \`false\` | Trạng thái được chọn (chỉ có tác dụng khi \`checkable\`) |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa mọi tương tác |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`click\` | — (MouseEvent native) | Phát khi click, hoặc khi nhấn Enter/Space trên tag \`clickable\`/\`checkable\`. Không phát khi disabled |
| \`change\` | \`{ checked }\` / \`{ selected }\` | Phát khi tag \`checkable\` được bật/tắt, hoặc chip \`clickable toggle\` đổi \`selected\` |
| \`close\` | \`{ originalEvent }\` | Phát khi bấm × / Backspace / Delete. **Cancelable**: \`preventDefault()\` để giữ tag lại, nếu không tag chạy hiệu ứng thu nhỏ rồi tự gắn \`hidden\` |

### Slots
| Slot | Mô tả |
|------|-------|
| (default) | Nội dung nhãn |
| \`icon\` | Icon phía trước nhãn |
| \`avatar\` | Avatar tròn nhỏ phía trước (giống MUI Chip avatar) |

### Properties & Methods
| Tên | Mô tả |
|-----|-------|
| \`checked\` | Property get/set, phản chiếu attribute \`checked\` |
| \`selected\` | Property get/set, phản chiếu attribute \`selected\` |
| \`disabled\` | Property get/set, phản chiếu attribute \`disabled\` |
| \`close()\` | Đóng tag bằng code (vẫn phát event \`close\` có thể hủy). Trả về \`true\` nếu tag sẽ bị ẩn (\`hidden\` được gắn sau hiệu ứng) |

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-tag-height\` / \`--hui-tag-padding-x\` | Chiều cao / khoảng đệm ngang |
| \`--hui-tag-font-size\` / \`--hui-tag-font-weight\` | Cỡ / độ đậm chữ |
| \`--hui-tag-radius\` | Bo góc (đè \`shape\`) |
| \`--hui-tag-gap\` | Khoảng cách icon ↔ chữ ↔ nút đóng |
| \`--hui-tag-bg\` / \`--hui-tag-color\` / \`--hui-tag-border-color\` | Nền / chữ / viền (đè \`variant\`) |

**Parts:** \`base\`, \`avatar\`, \`icon\`, \`label\`, \`close\`.

### Bàn phím & ARIA
| Kiểu | Vai trò | Phím |
|------|---------|------|
| tĩnh | — | Tab tới nút × (nếu closable), Backspace / Delete = xóa |
| \`clickable\` | \`button\` | Enter / Space = click; Backspace / Delete = xóa (closable) |
| \`clickable toggle\` / \`clickable selected\` | \`button\` + \`aria-pressed\` | Enter / Space = đảo \`selected\` (khi toggle) |
| \`checkable\` | \`checkbox\` + \`aria-checked\` | Enter / Space = đảo \`checked\` |

Avatar theo attribute là trang trí (\`aria-hidden\`) — nhãn chữ của tag đã đủ nghĩa.
        `,
      },
    },
  },

  // ArgTypes — map 100% observedAttributes
  argTypes: {
    color: {
      control: 'text',
      description: 'Màu preset (primary, secondary, success, warning, danger, info) hoặc mã màu CSS bất kỳ',
      table: { type: { summary: 'string' }, defaultValue: { summary: '— (xám)' } },
    },
    variant: {
      control: 'select',
      options: ['soft', 'filled', 'outlined'],
      description: 'Kiểu hiển thị',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'soft' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Kích thước: 20 / 24 / 32px',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'md' } },
    },
    shape: {
      control: 'select',
      options: ['rounded', 'pill', 'square'],
      description: 'Hình dạng bo góc',
      table: { type: { summary: 'string' }, defaultValue: { summary: 'rounded' } },
    },
    icon: {
      control: 'select',
      options: ['', 'star', 'check', 'user', 'heart', 'info'],
      description: 'Tên icon (hui-icon) trước nhãn',
      table: { type: { summary: 'string' } },
    },
    avatar: {
      control: 'text',
      description: 'Ảnh avatar (URL / data URI) hoặc tên → chữ viết tắt',
      table: { type: { summary: 'string' } },
    },
    toggle: {
      control: 'boolean',
      description: 'Chip bật/tắt (cùng clickable): click đảo selected',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    selected: {
      control: 'boolean',
      description: 'Đang chọn (aria-pressed khi clickable)',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    closable: {
      control: 'boolean',
      description: 'Hiển thị nút × để xóa tag',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    clickable: {
      control: 'boolean',
      description: 'Tag có thể click như nút bấm',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    checkable: {
      control: 'boolean',
      description: 'Tag bật/tắt được (CheckableTag)',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    checked: {
      control: 'boolean',
      description: 'Trạng thái được chọn (khi checkable)',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Vô hiệu hóa tag',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    label: {
      control: 'text',
      description: 'Nội dung nhãn (slot mặc định)',
    },
  },
};

// === STORIES (Kịch bản) ===

/**
 * Story mặc định — Tag xám trung tính, kiểu soft, kích thước md.
 * Mọi control trong panel đều được bind vào component.
 */
export const Default = {
  render: (args) => html`
    <hui-tag
      color=${ifDefined(args.color || undefined)}
      variant=${args.variant}
      size=${args.size}
      shape=${args.shape}
      icon=${ifDefined(args.icon || undefined)}
      avatar=${ifDefined(args.avatar || undefined)}
      ?closable=${args.closable}
      ?clickable=${args.clickable}
      ?toggle=${args.toggle}
      ?selected=${args.selected}
      ?checkable=${args.checkable}
      ?checked=${args.checked}
      ?disabled=${args.disabled}
    >${args.label}</hui-tag>
  `,
  args: {
    color: '',
    variant: 'soft',
    size: 'md',
    shape: 'rounded',
    icon: '',
    avatar: '',
    closable: false,
    clickable: false,
    toggle: false,
    selected: false,
    checkable: false,
    checked: false,
    disabled: false,
    label: 'Tag',
  },
};

/**
 * Filled — Nền đặc màu chủ đạo.
 */
export const Filled = {
  ...Default,
  args: { ...Default.args, color: 'primary', variant: 'filled', label: 'Filled' },
};

/**
 * Outlined — Chỉ có viền màu.
 */
export const Outlined = {
  ...Default,
  args: { ...Default.args, color: 'success', variant: 'outlined', label: 'Outlined' },
};

/**
 * Màu tùy ý — Truyền bất kỳ mã màu CSS nào vào `color` (hex, rgb, tên màu).
 */
export const CustomColors = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <hui-tag color="#f50">#f50</hui-tag>
      <hui-tag color="#2db7f5" variant="filled">#2db7f5</hui-tag>
      <hui-tag color="rgb(135, 208, 104)" variant="outlined">rgb(135,208,104)</hui-tag>
      <hui-tag color="hotpink" variant="filled">hotpink</hui-tag>
      <hui-tag color="#108ee9">#108ee9</hui-tag>
    </div>
  `,
};

/**
 * Closable — Có nút × để xóa. Tag tự ẩn sau khi xóa (trừ khi event `close` bị preventDefault).
 * Focus vào nút × rồi nhấn Backspace/Delete cũng xóa được.
 */
export const Closable = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <hui-tag closable>Xóa được</hui-tag>
      <hui-tag color="primary" closable>Primary</hui-tag>
      <hui-tag color="danger" variant="filled" closable>Danger</hui-tag>
      <hui-tag color="warning" closable @close=${(e) => e.preventDefault()}>Không xóa được (preventDefault)</hui-tag>
    </div>
  `,
};

/**
 * Clickable — Tag hoạt động như nút bấm (role="button", Enter/Space để kích hoạt).
 */
export const Clickable = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <hui-tag clickable color="primary" @click=${() => console.log('click primary')}>Click tôi</hui-tag>
      <hui-tag clickable color="info" variant="filled" @click=${() => console.log('click info')}>Filled clickable</hui-tag>
      <hui-tag clickable closable color="success" @click=${() => console.log('click success')}>Click + xóa</hui-tag>
    </div>
  `,
};

/**
 * Checkable — Bộ lọc dạng tag bật/tắt (Ant CheckableTag). Theo dõi event `change` trong console.
 */
export const Checkable = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap; font-family: sans-serif; font-size: 14px; align-items: center;">
      <span>Danh mục:</span>
      ${['Phim', 'Sách', 'Âm nhạc', 'Thể thao'].map((label, i) => html`
        <hui-tag checkable ?checked=${i === 0}
          @change=${(e) => console.log(label, e.detail.checked)}
        >${label}</hui-tag>
      `)}
      <hui-tag checkable checked color="success">Màu success</hui-tag>
    </div>
  `,
};

/**
 * Disabled — Tag bị vô hiệu hóa, không phản hồi click / bàn phím.
 */
export const Disabled = {
  ...Default,
  args: { ...Default.args, color: 'primary', closable: true, clickable: true, disabled: true, label: 'Disabled' },
};

/**
 * Tất cả kích thước — So sánh sm (20px), md (24px), lg (32px).
 */
export const AllSizes = {
  render: () => html`
    <div style="display: flex; align-items: center; gap: 8px;">
      <hui-tag size="sm" color="primary" closable>Small</hui-tag>
      <hui-tag size="md" color="primary" closable>Medium</hui-tag>
      <hui-tag size="lg" color="primary" closable>Large</hui-tag>
    </div>
  `,
};

/**
 * Tất cả biến thể — Ma trận màu × variant.
 */
export const AllVariants = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${['soft', 'filled', 'outlined'].map((variant) => html`
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <code style="width: 70px;">${variant}</code>
          <hui-tag variant=${variant}>default</hui-tag>
          ${['primary', 'secondary', 'success', 'warning', 'danger', 'info'].map((color) => html`
            <hui-tag variant=${variant} color=${color}>${color}</hui-tag>
          `)}
        </div>
      `)}
    </div>
  `,
  // Mọi màu × variant đạt WCAG AA (≥ 4,5:1) ở cả theme sáng lẫn tối
  play: async ({ canvasElement }) => {
    const tags = [...canvasElement.querySelectorAll('hui-tag')];
    await expect(tags.length).toBe(21);
    const root = document.documentElement;
    const prev = root.getAttribute('data-theme');
    try {
      for (const theme of ['light', 'dark']) {
        root.setAttribute('data-theme', theme);
        // waitFor: chờ transition màu sau khi đổi theme chạy xong
        for (const tag of tags) {
          await waitFor(() => {
            const ratio = tagContrast(tag);
            expect(ratio, `${theme} ${tag.getAttribute('variant')} ${tag.getAttribute('color') || 'default'}: ${ratio.toFixed(2)}`)
              .toBeGreaterThanOrEqual(4.5);
          });
        }
      }
    } finally {
      if (prev === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', prev);
      // Chờ transition màu về theme cũ xong (kiểm tra a11y chạy ngay sau play)
      await Promise.all(tags.flatMap((tag) => tag.shadowRoot.querySelector('[part="base"]').getAnimations()
        .map((a) => a.finished.catch(() => {}))));
    }
  },
};

/**
 * Tất cả hình dạng — rounded, pill, square.
 */
export const AllShapes = {
  render: () => html`
    <div style="display: flex; gap: 8px;">
      <hui-tag color="info" shape="rounded">Rounded</hui-tag>
      <hui-tag color="info" shape="pill">Pill</hui-tag>
      <hui-tag color="info" shape="square">Square</hui-tag>
    </div>
  `,
};

/**
 * Slot demo — Dùng slot `icon` và `avatar` phía trước nhãn.
 */
export const WithSlots = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
      <hui-tag color="warning">${starIcon}Nổi bật</hui-tag>
      <hui-tag color="primary" variant="filled" shape="pill">${starIcon}Yêu thích</hui-tag>
      <hui-tag shape="pill" closable>
        <span slot="avatar" style="background: #64748b; color: #fff; display: inline-flex; align-items: center; justify-content: center;">A</span>
        Nguyễn Văn A
      </hui-tag>
      <hui-tag shape="pill" size="lg" color="info" clickable>
        <span slot="avatar" style="background: var(--hui-info, #3b82f6); color: #fff; display: inline-flex; align-items: center; justify-content: center;">B</span>
        Trần Thị B
      </hui-tag>
    </div>
  `,
};

/**
 * Icon theo tên (MUI Chip `icon`) — attribute `icon` render <hui-icon>; slot `icon` vẫn thắng.
 */
export const WithIcon = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
      <hui-tag icon="star" color="warning">Nổi bật</hui-tag>
      <hui-tag icon="check" color="success" variant="filled" shape="pill">Đã duyệt</hui-tag>
      <hui-tag icon="user" variant="outlined" shape="pill" closable>Người dùng</hui-tag>
      <hui-tag icon="heart" color="danger" size="lg" clickable>Yêu thích</hui-tag>
      <hui-tag icon="info" color="info" checkable>Lọc theo info</hui-tag>
    </div>
  `,
};

/**
 * Override từ bên ngoài — biến CSS đặt trên thẻ cha / class riêng và ::part().
 */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .demo-chips { --hui-tag-height: 28px; --hui-tag-padding-x: 12px; --hui-tag-radius: 999px; }
      hui-tag.brand {
        --hui-tag-bg: var(--hui-primary-1);
        --hui-tag-color: var(--hui-primary-7);
        --hui-tag-border-color: var(--hui-primary-3);
      }
      hui-tag.caps::part(label) { text-transform: uppercase; letter-spacing: 0.06em; }
      hui-tag.caps::part(close) { opacity: 1; }
      hui-tag[checked].sel { --hui-tag-bg: var(--hui-success); --hui-tag-border-color: var(--hui-success); }
    </style>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div class="demo-chips" style="display: flex; gap: 8px;">
        <hui-tag color="primary">Biến CSS trên thẻ cha</hui-tag>
        <hui-tag icon="star" closable>Áp cho mọi tag con</hui-tag>
      </div>
      <div style="display: flex; gap: 8px;">
        <hui-tag class="brand" icon="heart">Palette --hui-primary-1/3/7</hui-tag>
        <hui-tag class="caps" color="danger" closable>::part(label | close)</hui-tag>
        <hui-tag class="sel" checkable checked>Chọn → nền success</hui-tag>
      </div>
    </div>
  `,
};

// === CHIP (hui-chip gộp vào hui-tag) ===

/**
 * Chip có avatar — attribute `avatar`: ảnh (URL / data URI) hoặc tên → chữ viết tắt qua hui-avatar.
 */
export const ChipAvatars = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
      <hui-tag class="img" shape="pill" avatar=${avatarSrc('#6366f1')}>Ảnh data URI</hui-tag>
      <hui-tag class="initials" shape="pill" avatar="Nguyễn Văn An" closable>Nguyễn Văn An</hui-tag>
      <hui-tag shape="pill" variant="outlined" color="primary" avatar="Trần Bình" clickable>Outlined + clickable</hui-tag>
      <hui-tag shape="pill" variant="filled" color="success" avatar=${avatarSrc('#059669')} size="lg">Filled lg</hui-tag>
      <hui-tag shape="pill" size="sm" avatar="Lê Chi">sm</hui-tag>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const img = canvasElement.querySelector('.img');
    const initials = canvasElement.querySelector('.initials');
    const avatarOf = (el) => el.shadowRoot.querySelector('[part="avatar"] hui-avatar');
    await waitFor(() => expect(avatarOf(img).getAttribute('src')).toMatch(/^data:image\/svg\+xml/));
    await expect(avatarOf(img).hasAttribute('name')).toBe(false);
    await expect(avatarOf(initials).getAttribute('name')).toBe('Nguyễn Văn An');
    await expect(avatarOf(initials).hasAttribute('src')).toBe(false);
    await expect(avatarOf(initials).getAttribute('aria-hidden')).toBe('true');
    // Vùng avatar hiện (không bị ẩn như khi trống)
    await expect(getComputedStyle(initials.shadowRoot.querySelector('[part="avatar"]')).display).not.toBe('none');
  },
};

/**
 * Chip lọc bật/tắt — `clickable toggle`: button + aria-pressed, click / Enter / Space đảo `selected`,
 * khi chọn hiện icon ✓ (nếu không có icon/avatar riêng).
 */
export const ChipToggle = {
  render: () => html`
    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;" role="group" aria-label="Lọc sản phẩm">
      ${['Còn hàng', 'Giảm giá', 'Freeship', 'Chính hãng'].map((label, i) => html`
        <hui-tag shape="pill" variant="outlined" clickable toggle ?selected=${i === 0}>${label}</hui-tag>
      `)}
      <hui-tag shape="pill" clickable toggle icon="heart" color="danger">Yêu thích</hui-tag>
    </div>
    <p class="out" style="font-size: 13px;"></p>
  `,
  play: async ({ canvasElement }) => {
    const chips = [...canvasElement.querySelectorAll('hui-tag')];
    const out = canvasElement.querySelector('.out');
    const baseOf = (el) => el.shadowRoot.querySelector('[part="base"]');
    const iconOf = (el) => el.shadowRoot.querySelector('[part="icon"] hui-icon');
    chips.forEach((c) => c.addEventListener('change', (e) => { out.textContent = `${c.textContent.trim()}: ${e.detail.selected}`; }));

    await waitFor(() => expect(baseOf(chips[0]).getAttribute('aria-pressed')).toBe('true'));
    await expect(baseOf(chips[0]).getAttribute('role')).toBe('button');
    await expect(baseOf(chips[1]).getAttribute('aria-pressed')).toBe('false');
    await expect(iconOf(chips[0]).getAttribute('name')).toBe('check');
    await expect(iconOf(chips[1]).hasAttribute('name')).toBe(false);

    // Click → bật
    await userEvent.click(chips[1]);
    await expect(chips[1].selected).toBe(true);
    await waitFor(() => expect(baseOf(chips[1]).getAttribute('aria-pressed')).toBe('true'));
    await expect(iconOf(chips[1]).getAttribute('name')).toBe('check');
    await expect(out.textContent).toBe('Giảm giá: true');

    // Bàn phím: Space → tắt
    baseOf(chips[0]).focus();
    await userEvent.keyboard(' ');
    await expect(chips[0].selected).toBe(false);
    await waitFor(() => expect(baseOf(chips[0]).getAttribute('aria-pressed')).toBe('false'));
    await expect(chips[0].hasAttribute('selected')).toBe(false);

    // Chip có icon riêng: giữ icon, không thay bằng ✓
    await userEvent.click(chips[4]);
    await expect(chips[4].selected).toBe(true);
    await waitFor(() => expect(iconOf(chips[4]).getAttribute('name')).toBe('heart'));
  },
};

/**
 * Chip theo variant (filled / outlined / soft) — tổ hợp avatar, icon, clickable, closable.
 */
export const ChipVariants = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 10px;">
      ${['filled', 'outlined', 'soft'].map((variant) => html`
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <code style="width: 70px;">${variant}</code>
          <hui-tag shape="pill" variant=${variant}>Cơ bản</hui-tag>
          <hui-tag shape="pill" variant=${variant} color="primary" clickable>Bấm được</hui-tag>
          <hui-tag shape="pill" variant=${variant} color="info" icon="user" closable>Có icon</hui-tag>
          <hui-tag shape="pill" variant=${variant} color="success" avatar="Minh">Avatar</hui-tag>
          <hui-tag shape="pill" variant=${variant} clickable selected>Đang chọn</hui-tag>
          <hui-tag shape="pill" variant=${variant} color="danger" disabled closable>Disabled</hui-tag>
        </div>
      `)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const selected = canvasElement.querySelector('hui-tag[selected]');
    const base = selected.shadowRoot.querySelector('[part="base"]');
    // selected không có color → mặc định primary, nền đặc; clickable (không toggle) vẫn báo aria-pressed
    await waitFor(() => expect(base.classList.contains('hui-tag--selected')).toBe(true));
    await expect(base.getAttribute('aria-pressed')).toBe('true');
    await expect(base.classList.contains('hui-tag--default')).toBe(false);
    // Clickable thường (không toggle / selected) giữ nguyên ngữ nghĩa nút, không có aria-pressed
    const plain = canvasElement.querySelector('hui-tag[clickable]:not([selected])');
    await expect(plain.shadowRoot.querySelector('[part="base"]').hasAttribute('aria-pressed')).toBe(false);
    await userEvent.click(plain);
    await expect(plain.selected).toBe(false);
  },
};
