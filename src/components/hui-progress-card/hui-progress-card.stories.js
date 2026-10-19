/**
 * Storybook Stories — HUI Progress Card
 * Thẻ tiến độ: tiêu đề + hui-progress + "12/20 việc" + hạn chót (warning < 2 ngày, danger khi quá hạn).
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';
import '../hui-avatar/index.js';
import '../hui-tag/index.js';

const DAY = 24 * 3600 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY).toISOString();
const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);

export default {
  title: 'Molecules/HuiProgressCard',
  component: 'hui-progress-card',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Progress Card** — Thẻ theo dõi tiến độ một đầu việc / dự án: tiêu đề, thanh \`hui-progress\`, số đếm "12/20 việc"
và hạn chót dạng thời gian tương đối ("trong 3 ngày"). Hạn chót **< 2 ngày** → màu warning, **đã quá** → danger,
đã đủ 100% → gạch ngang. Số đếm **chạy** khi \`value\` đổi (tắt bằng \`no-animation\` / prefers-reduced-motion).

\`\`\`html
<hui-progress-card title="Thiết kế landing page" value="12" total="20" deadline="2026-10-25">
  <hui-avatar slot="avatar" name="Trần Khoa"></hui-avatar>
  <hui-tag slot="extra" color="primary">Đang làm</hui-tag>
  Hoàn thiện bố cục và hình ảnh
</hui-progress-card>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`title\` | string | — | Tiêu đề (slot \`title\` ưu tiên hơn) |
| \`description\` | string | — | Mô tả (slot mặc định ưu tiên hơn) |
| \`value\` / \`total\` | number | — | Số việc đã xong / tổng → "12/20 việc" (locale \`progressCard.count\`) và phần trăm |
| \`percent\` | number | — | 0–100, ưu tiên hơn value/total khi vẽ thanh |
| \`status\` | \`normal \\| active \\| success \\| exception\` | \`normal\` | Truyền thẳng cho hui-progress |
| \`deadline\` | string | — | Hạn chót (ISO / timestamp) |
| \`color\` | string | — | Màu thanh (một màu hoặc gradient \`"from,to"\`) |
| \`show-info\` | string | \`'true'\` | \`'false'\` = ẩn chữ % của thanh |
| \`no-animation\` | boolean | \`false\` | Tắt đếm số chạy / thanh chạy |

### Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`deadlineState\` | \`none \\| normal \\| warning \\| danger \\| done\` | Trạng thái hạn chót hiện tại (chỉ đọc) |

### Slots
| Slot | Mô tả |
|------|-------|
| _(mặc định)_ | Mô tả |
| \`title\` | Tiêu đề HTML |
| \`avatar\` | Ảnh / icon trái tiêu đề |
| \`extra\` | Góc phải (tag, menu…) |
| \`footer\` | Chân thẻ (thành viên, nút…) |

### ARIA
Khung \`role="group"\` gắn nhãn bằng tiêu đề; thanh là \`hui-progress\` (\`role="progressbar"\`, nhãn = tiêu đề);
hạn chót là \`<time datetime>\` (tooltip ngày giờ đầy đủ). Không có phần tương tác riêng → không có phím tắt.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-progress-card-bg\` | Nền thẻ |
| \`--hui-progress-card-border-color\` | Màu viền |
| \`--hui-progress-card-radius\` | Bo góc |
| \`--hui-progress-card-padding\` | Khoảng đệm |
| \`--hui-progress-card-shadow\` | Đổ bóng |
| \`--hui-progress-card-gap\` | Khoảng cách các hàng |
| \`--hui-progress-card-title-color\` | Màu tiêu đề |
| \`--hui-progress-card-count-color\` | Màu số đếm |
| \`--hui-progress-card-warning-color\` / \`--hui-progress-card-danger-color\` | Màu hạn chót sắp tới / quá hạn |
| \`--hui-progress-color\` | Màu thanh (biến của hui-progress) |

**Parts:** \`base\`, \`header\`, \`avatar\`, \`title\`, \`description\`, \`extra\`, \`progress\` (+ \`progress-track\`, \`progress-bar\`, \`progress-info\`),
\`meta\`, \`count\`, \`deadline\`, \`footer\`. **State:** \`:state(overdue)\`, \`:state(due-soon)\`.
        `,
      },
    },
  },
  argTypes: {
    value: { control: { type: 'number', min: 0, max: 20 } },
    total: { control: { type: 'number', min: 1 } },
    status: { control: 'select', options: ['normal', 'active', 'success', 'exception'] },
    color: { control: 'color' },
    noAnimation: { control: 'boolean' },
  },
};

/** Mặc định — value/total + hạn chót còn 5 ngày */
export const Default = {
  args: { title: 'Thiết kế landing page', value: 12, total: 20, status: 'normal', color: '', noAnimation: false },
  render: (a) => html`
    <hui-progress-card id="pc-default" style="max-width: 360px;" title=${a.title} value=${a.value} total=${a.total}
      status=${a.status} color=${a.color || ''} ?no-animation=${a.noAnimation} deadline=${inDays(5)}>
      Hoàn thiện bố cục, hình ảnh và nội dung
    </hui-progress-card>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pc-default');
    await expect(part(el, 'count').textContent).toBe('12/20 việc');
    await expect(part(el, 'progress').getAttribute('percent')).toBe('60');
    await expect(part(el, 'progress').getAttribute('label')).toBe('Thiết kế landing page');
    await expect(part(el, 'deadline').dataset.state).toBe('normal');
    await expect(part(el, 'deadline').textContent).toMatch(/^Hạn chót/);
    await expect(el.deadlineState).toBe('normal');
    await expect(part(el, 'base').getAttribute('role')).toBe('group');

    // Đổi value → số chạy tới giá trị mới
    el.value = 18;
    await waitFor(() => expect(part(el, 'count').textContent).toBe('18/20 việc'), { timeout: 2000 });
    await expect(part(el, 'progress').getAttribute('percent')).toBe('90');
    el.value = 12;
  },
};

/** Hạn chót: bình thường · sắp tới (< 2 ngày → warning) · quá hạn (danger) · đã xong */
export const DeadlineStates = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
      <hui-progress-card id="pc-normal" title="Viết tài liệu API" value="3" total="10" deadline=${inDays(7)}></hui-progress-card>
      <hui-progress-card id="pc-warning" title="Kiểm thử thanh toán" value="8" total="12" deadline=${inDays(1)}></hui-progress-card>
      <hui-progress-card id="pc-danger" title="Sửa lỗi đăng nhập" value="2" total="5" deadline=${inDays(-3)} status="exception"></hui-progress-card>
      <hui-progress-card id="pc-done" title="Phát hành v1.0" value="6" total="6" deadline=${inDays(-1)}></hui-progress-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const state = (id) => part(canvasElement.querySelector(id), 'deadline').dataset.state;
    await expect(state('#pc-normal')).toBe('normal');
    await expect(state('#pc-warning')).toBe('warning');
    await expect(state('#pc-danger')).toBe('danger');
    await expect(state('#pc-done')).toBe('done');
    const danger = canvasElement.querySelector('#pc-danger');
    await expect(part(danger, 'deadline').textContent).toMatch(/^Quá hạn/);
    await expect(part(danger, 'deadline').getAttribute('datetime')).toBeTruthy();
    await expect(part(danger, 'progress').getAttribute('status')).toBe('exception');

    // Màu theo trạng thái
    const warn = part(canvasElement.querySelector('#pc-warning'), 'deadline');
    await expect(warn.classList.contains('pc__deadline--warning')).toBe(true);

    // Đổi deadline → cập nhật lại
    const normal = canvasElement.querySelector('#pc-normal');
    normal.deadline = inDays(-1);
    await waitFor(() => expect(state('#pc-normal')).toBe('danger'));
    normal.deadline = inDays(7);
  },
};

/** percent thay cho value/total; không có hạn chót */
export const PercentOnly = {
  render: () => html`
    <hui-progress-card id="pc-percent" style="max-width: 360px;" title="Dung lượng đã dùng" percent="72" color="#722ed1,#eb2f96"
      description="7,2 GB / 10 GB"></hui-progress-card>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pc-percent');
    await expect(part(el, 'count').hidden).toBe(true);
    await expect(part(el, 'deadline').hidden).toBe(true);
    await expect(part(el, 'progress').getAttribute('stroke-color')).toBe('#722ed1,#eb2f96');
    await expect(part(el, 'description').textContent).toBe('7,2 GB / 10 GB');
  },
};

/** Slots: avatar / extra / footer / title */
export const WithSlots = {
  render: () => html`
    <hui-progress-card id="pc-slots" style="max-width: 380px;" value="14" total="20" deadline=${inDays(3)} status="active">
      <hui-avatar slot="avatar" name="Minh Khang"></hui-avatar>
      <span slot="title">Chiến dịch <b>Black Friday</b></span>
      <hui-tag slot="extra" color="primary">Đang chạy</hui-tag>
      Quảng cáo, email và landing page
      <div slot="footer" style="display: flex; gap: 4px; align-items: center; color: var(--hui-text-secondary);">
        <hui-avatar size="sm" name="An"></hui-avatar>
        <hui-avatar size="sm" name="Bình"></hui-avatar>
        <span style="margin-left: 4px;">+3 thành viên</span>
      </div>
    </hui-progress-card>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pc-slots');
    await waitFor(() => expect(part(el, 'avatar').hidden).toBe(false));
    await expect(part(el, 'extra').hidden).toBe(false);
    await expect(part(el, 'footer').hidden).toBe(false);
    await expect(part(el, 'title').hidden).toBe(false);
  },
};

/** no-animation — số nhảy thẳng tới giá trị mới */
export const NoAnimation = {
  render: () => html`<hui-progress-card id="pc-noanim" no-animation title="Nhập dữ liệu" value="1" total="4"></hui-progress-card>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pc-noanim');
    el.value = 3;
    await el.updateComplete;
    await expect(part(el, 'count').textContent).toBe('3/4 việc');
  },
};

/** Override từ bên ngoài — biến CSS + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .pc-brand {
        --hui-progress-card-bg: var(--hui-primary-light);
        --hui-progress-card-border-color: transparent;
        --hui-progress-card-radius: 16px;
        --hui-progress-card-warning-color: var(--hui-secondary);
        --hui-progress-color: var(--hui-success);
      }
      .pc-brand hui-progress-card::part(title) {
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .pc-brand hui-progress-card::part(progress-track) {
        height: 12px;
      }
    </style>
    <div class="pc-brand" style="max-width: 360px;">
      <hui-progress-card id="pc-custom" title="Onboarding" value="2" total="5" deadline=${inDays(1)}></hui-progress-card>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#pc-custom');
    await expect(getComputedStyle(part(el, 'base')).borderTopLeftRadius).toBe('16px');
    await expect(getComputedStyle(part(el, 'title')).textTransform).toBe('uppercase');
  },
};
