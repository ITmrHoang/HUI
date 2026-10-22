/**
 * Storybook Stories — HUI Dot (chấm trạng thái)
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-avatar/index.js';

const STATUSES = ['success', 'processing', 'default', 'error', 'warning', 'online', 'offline', 'busy'];

export default {
  title: 'Atoms/HuiDot',
  component: 'hui-dot',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Dot** — Chấm trạng thái nhỏ: thành công, đang xử lý (nhấp nháy), lỗi, cảnh báo, trực tuyến / ngoại tuyến / bận.
Đi kèm chữ (attribute \`label\` hoặc slot) hoặc đứng một mình (tự có tên trạng thái cho trình đọc màn hình).

\`\`\`html
<hui-dot status="online" label="Đang hoạt động"></hui-dot>
<hui-dot status="processing">Đang đồng bộ</hui-dot>
<hui-dot color="#8b5cf6" size="lg" pulse></hui-dot>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`status\` | string | \`default\` | \`success\` \\| \`processing\` \\| \`default\` \\| \`error\` \\| \`warning\` \\| \`online\` \\| \`offline\` \\| \`busy\` |
| \`size\` | string | \`md\` | \`sm\` (6px) \\| \`md\` (8px) \\| \`lg\` (10px) hoặc số px |
| \`color\` | string | — | Màu tùy chỉnh: token (\`primary\`…) hoặc màu CSS — ưu tiên hơn status |
| \`label\` | string | — | Chữ cạnh chấm (hoặc slot) |
| \`pulse\` | boolean | \`false\` | Ép nhấp nháy với mọi trạng thái (processing tự nhấp nháy) |
| \`no-animation\` | boolean | \`false\` | Tắt nhấp nháy |

### Events
Không có.

### Slots
| Slot | Mô tả |
|------|-------|
| (mặc định) | Chữ cạnh chấm |

### Parts
\`base\`, \`dot\`, \`ring\` (vòng lan tỏa khi nhấp nháy), \`label\`.

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-dot-size\` / \`--hui-dot-color\` | Đường kính / màu chấm |
| \`--hui-dot-gap\` | Khoảng cách chấm ↔ chữ |
| \`--hui-dot-label-color\` / \`--hui-dot-font-size\` | Màu / cỡ chữ |
| \`--hui-dot-pulse-duration\` | Chu kỳ nhấp nháy (1.6s) |
| \`--hui-dot-ring-width\` | Viền nền quanh chấm (đặt khi đè lên avatar) |

### Accessibility
Có chữ → chấm \`aria-hidden\`, chữ là nội dung. Không có chữ → host \`role="img"\` + \`aria-label\` theo trạng thái
("Trực tuyến"…). Ngoại tuyến vẽ vòng rỗng để không phân biệt chỉ bằng màu. Nhấp nháy tắt khi \`prefers-reduced-motion\`.
Không nhận focus.
        `,
      },
    },
  },
  argTypes: {
    status: { control: 'select', options: STATUSES },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'text' },
    label: { control: 'text' },
    pulse: { control: 'boolean' },
  },
};

export const Default = {
  render: (args) => html`<hui-dot id="dot-default" status=${args.status} size=${args.size} label=${args.label} ?pulse=${args.pulse}></hui-dot>`,
  args: { status: 'online', size: 'md', label: 'Đang hoạt động', pulse: false },
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dot-default');
    await el.updateComplete;
    await expect(el.shadowRoot.querySelector('[part="label"]').hidden).toBe(false);
    await expect(el.hasAttribute('role')).toBe(false);
    const dot = el.shadowRoot.querySelector('[part="dot"]');
    await expect(dot.getBoundingClientRect().width).toBe(8);
  },
};

/** Mọi trạng thái — processing tự nhấp nháy */
export const Statuses = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;">
      ${STATUSES.map((s) => html`<hui-dot status=${s} label=${s}></hui-dot>`)}
    </div>
  `,
  play: async ({ canvasElement }) => {
    const processing = canvasElement.querySelector('hui-dot[status="processing"]');
    await processing.updateComplete;
    await expect(processing.shadowRoot.querySelector('.dot').classList.contains('dot--pulse')).toBe(true);
    const success = canvasElement.querySelector('hui-dot[status="success"]');
    await expect(success.shadowRoot.querySelector('.dot').classList.contains('dot--pulse')).toBe(false);
  },
};

/** Không có chữ → host là ảnh mang tên trạng thái (theo locale) */
export const StandaloneA11y = {
  render: () => html`
    <div style="display: flex; gap: 16px; align-items: center;">
      <hui-dot id="dot-alone" status="busy"></hui-dot>
      <hui-dot status="offline"></hui-dot>
      <hui-dot status="processing"></hui-dot>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dot-alone');
    await el.updateComplete;
    await expect(el.getAttribute('role')).toBe('img');
    await expect(el.getAttribute('aria-label')).toBe('Bận');
    // Thêm chữ qua slot → bỏ role img
    el.textContent = 'Đang họp';
    await new Promise((r) => requestAnimationFrame(r));
    await expect(el.hasAttribute('role')).toBe(false);
    await expect(el.hasAttribute('aria-label')).toBe(false);
  },
};

export const SizesAndColors = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div style="display: flex; gap: 16px; align-items: center;">
        <hui-dot size="sm" status="success" label="sm"></hui-dot>
        <hui-dot size="md" status="success" label="md"></hui-dot>
        <hui-dot size="lg" status="success" label="lg"></hui-dot>
        <hui-dot id="dot-14" size="14" status="success" label="14px"></hui-dot>
      </div>
      <div style="display: flex; gap: 16px; align-items: center;">
        <hui-dot color="info" label="info"></hui-dot>
        <hui-dot id="dot-violet" color="#8b5cf6" pulse label="#8b5cf6 + pulse"></hui-dot>
        <hui-dot color="danger" pulse no-animation label="no-animation"></hui-dot>
      </div>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const big = canvasElement.querySelector('#dot-14');
    await big.updateComplete;
    await expect(big.shadowRoot.querySelector('[part="dot"]').getBoundingClientRect().width).toBe(14);
    const violet = canvasElement.querySelector('#dot-violet');
    await expect(getComputedStyle(violet.shadowRoot.querySelector('[part="dot"]')).backgroundColor).toBe('rgb(139, 92, 246)');
  },
};

/** Đặt trên avatar (góc dưới phải) */
export const OnAvatar = {
  render: () => html`
    <div style="display: flex; gap: 24px;">
      ${['online', 'busy', 'offline'].map((s) => html`
        <span style="position: relative; display: inline-block;">
          <hui-avatar name="Nguyễn An" size="lg"></hui-avatar>
          <hui-dot status=${s} size="12" style="position: absolute; right: 0; bottom: 2px; --hui-dot-ring-width: 2px;"></hui-dot>
        </span>`)}
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .dot-brand {
        --hui-dot-size: 12px;
        --hui-dot-gap: 10px;
        --hui-dot-label-color: var(--hui-primary);
        --hui-dot-font-size: var(--hui-font-base);
        --hui-dot-pulse-duration: 0.8s;
      }
      hui-dot.chip::part(base) { padding: 2px 10px; border-radius: 999px; background: var(--hui-fill-tertiary); }
      hui-dot.chip::part(label) { font-weight: 600; }
    </style>
    <div style="display: flex; gap: 16px; align-items: center;">
      <hui-dot class="dot-brand" id="dot-brand" status="processing" label="Đang phát trực tiếp"></hui-dot>
      <hui-dot class="chip" status="success" label="Đã giao hàng"></hui-dot>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#dot-brand');
    await el.updateComplete;
    await expect(el.shadowRoot.querySelector('[part="dot"]').getBoundingClientRect().width).toBe(12);
  },
};
