/**
 * Storybook Stories — HUI Skeleton
 * Khung xương giữ chỗ khi đang tải + các khối lẻ (button / input / image / avatar).
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

export default {
  title: 'Components/HuiSkeleton',
  component: 'hui-skeleton',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Skeleton** — Khung xương giữ chỗ khi nội dung đang tải (Ant Skeleton + MUI Skeleton).

### Cách sử dụng
\`\`\`html
<hui-skeleton avatar active></hui-skeleton>

<!-- Tải xong: loading="false" → hiện nội dung thật trong slot -->
<hui-skeleton loading="false"><article>Nội dung thật</article></hui-skeleton>

<hui-skeleton-button active></hui-skeleton-button>
<hui-skeleton-input block></hui-skeleton-input>
<hui-skeleton-avatar shape="square" size="lg"></hui-skeleton-avatar>
<hui-skeleton-image></hui-skeleton-image>
\`\`\`

### Attributes — \`<hui-skeleton>\`
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`loading\` | string | \`'true'\` | \`'false'\` = hiện nội dung thật (slot mặc định). Gán JS nhận cả boolean |
| \`active\` | boolean | \`false\` | Vệt sáng chạy |
| \`avatar\` | boolean | \`false\` | Hiện khối avatar |
| \`avatar-shape\` | string | \`'circle'\` | \`circle\` \\| \`square\` |
| \`no-title\` | boolean | \`false\` | Ẩn khối tiêu đề |
| \`no-paragraph\` | boolean | \`false\` | Ẩn các dòng |
| \`rows\` | number | 3 (2 khi có avatar + tiêu đề) | Số dòng đoạn văn |
| \`round\` | boolean | \`false\` | Bo tròn hai đầu tiêu đề và dòng |

### Khối lẻ
| Thẻ | Attributes |
|-----|-----------|
| \`hui-skeleton-button\` | \`active\`, \`size\` (sm \\| md \\| lg), \`shape\` (default \\| round \\| circle \\| square), \`block\` |
| \`hui-skeleton-input\` | \`active\`, \`size\`, \`block\` |
| \`hui-skeleton-avatar\` | \`active\`, \`size\` (sm \\| md \\| lg \\| số px), \`shape\` (circle \\| square) |
| \`hui-skeleton-image\` | \`active\` |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Nội dung thật, hiện khi \`loading="false"\` |

### Trợ năng
Khung xương có \`aria-hidden\`; khi đang tải host có \`aria-busy="true"\` (ElementInternals) và một dòng chữ ẩn
"Đang tải..." (locale \`common.loading\`) cho trình đọc màn hình. Hiệu ứng tắt khi \`prefers-reduced-motion\`.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-skeleton-color\` / \`--hui-skeleton-highlight\` | Màu khối / vệt sáng |
| \`--hui-skeleton-radius\` | Bo góc khối |
| \`--hui-skeleton-duration\` | Thời gian một vòng shimmer (1.4s) |
| \`--hui-skeleton-avatar-size\` | Avatar trong hui-skeleton (40px) |
| \`--hui-skeleton-title-width\` / \`--hui-skeleton-title-height\` | Tiêu đề |
| \`--hui-skeleton-row-height\` / \`--hui-skeleton-row-gap\` / \`--hui-skeleton-last-row-width\` | Các dòng |
| \`--hui-skeleton-button-width\` / \`--hui-skeleton-input-width\` / \`--hui-skeleton-image-size\` | Khối lẻ |

**Parts:** hui-skeleton: \`base\`, \`avatar\`, \`content\`, \`title\`, \`paragraph\`, \`row\` · khối lẻ: \`base\`.
        `,
      },
    },
  },
  argTypes: {
    active: { control: 'boolean' },
    avatar: { control: 'boolean' },
    rows: { control: 'number' },
    round: { control: 'boolean' },
  },
};

/** Mặc định — Controls đổi active / avatar / rows / round */
export const Default = {
  args: { active: true, avatar: false, rows: 3, round: false },
  render: (args) => html`
    <div style="width: 480px;">
      <hui-skeleton ?active=${args.active} ?avatar=${args.avatar} rows=${args.rows} ?round=${args.round}></hui-skeleton>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-skeleton');
    await expect(el.shadowRoot.querySelectorAll('[part="row"]').length).toBe(3);
    await expect(el.shadowRoot.querySelector('[part="base"]').classList.contains('active')).toBe(true);
    el.rows = 5;
    await waitFor(() => expect(el.shadowRoot.querySelectorAll('[part="row"]').length).toBe(5));
    el.rows = 3;
  },
};

/** Có avatar, bo tròn */
export const WithAvatar = {
  render: () => html`
    <div style="width: 480px; display: grid; gap: 32px;">
      <hui-skeleton avatar active></hui-skeleton>
      <hui-skeleton avatar avatar-shape="square" round rows="1"></hui-skeleton>
      <hui-skeleton no-title rows="2"></hui-skeleton>
    </div>
  `,
};

/** loading → nội dung thật */
export const LoadingToContent = {
  render: () => html`
    <div style="width: 480px; display: grid; gap: 16px;">
      <hui-button size="sm" @hui-click=${() => {
        const el = document.querySelector('#sk-toggle');
        el.loading = el.loading === 'false' ? 'true' : 'false';
      }}>Bật / tắt loading</hui-button>
      <hui-skeleton id="sk-toggle" avatar active>
        <article class="sk-real">
          <strong>Nguyễn Văn A</strong>
          <p style="margin: 4px 0 0;">Nội dung thật đã tải xong.</p>
        </article>
      </hui-skeleton>
    </div>
  `,
  // Kiểm thử: đang tải → ẩn slot, aria-busy; loading=false → hiện nội dung thật
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#sk-toggle');
    const real = el.querySelector('.sk-real');
    const base = el.shadowRoot.querySelector('[part="base"]');
    await expect(real.offsetHeight).toBe(0);
    await expect(base.hidden).toBe(false);
    await expect(el._internals.ariaBusy).toBe('true');

    el.loading = false;
    await waitFor(() => expect(real.offsetHeight).toBeGreaterThan(0));
    await expect(base.hidden).toBe(true);
    await expect(el.getAttribute('loading')).toBe('false');
    await expect(el._internals.ariaBusy).toBe('false');
  },
};

/** Các khối lẻ */
export const Elements = {
  render: () => html`
    <div style="display: grid; gap: 16px; width: 480px;">
      <div style="display: flex; gap: 12px; align-items: center;">
        <hui-skeleton-button active size="sm"></hui-skeleton-button>
        <hui-skeleton-button active></hui-skeleton-button>
        <hui-skeleton-button active size="lg" shape="round"></hui-skeleton-button>
        <hui-skeleton-button active shape="circle"></hui-skeleton-button>
        <hui-skeleton-button active shape="square"></hui-skeleton-button>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <hui-skeleton-avatar active size="sm"></hui-skeleton-avatar>
        <hui-skeleton-avatar active></hui-skeleton-avatar>
        <hui-skeleton-avatar active size="lg"></hui-skeleton-avatar>
        <hui-skeleton-avatar active size="64" shape="square"></hui-skeleton-avatar>
      </div>
      <hui-skeleton-input active></hui-skeleton-input>
      <hui-skeleton-input active block size="lg"></hui-skeleton-input>
      <hui-skeleton-button block></hui-skeleton-button>
      <hui-skeleton-image active></hui-skeleton-image>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const avatar = canvasElement.querySelector('hui-skeleton-avatar[size="64"]');
    const block = avatar.shadowRoot.querySelector('[part="base"]');
    await expect(block.offsetWidth).toBe(64);
    const circle = canvasElement.querySelector('hui-skeleton-button[shape="circle"]').shadowRoot.querySelector('[part="base"]');
    await expect(circle.offsetWidth).toBe(circle.offsetHeight);
  },
};

/** Override từ bên ngoài — biến CSS trên thẻ cha + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .sk-brand {
        --hui-skeleton-color: var(--hui-primary-1);
        --hui-skeleton-highlight: var(--hui-primary-2);
        --hui-skeleton-radius: 0;
        --hui-skeleton-row-height: 12px;
        --hui-skeleton-row-gap: 10px;
        --hui-skeleton-avatar-size: 56px;
      }
      .sk-brand hui-skeleton::part(title) { height: 20px; }
    </style>
    <div class="sk-brand" style="width: 480px;">
      <hui-skeleton avatar active rows="4"></hui-skeleton>
    </div>
  `,
};
