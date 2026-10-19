/**
 * Storybook Stories — HUI Result
 * Trang kết quả: success / error / info / warning và 404 / 403 / 500 có hình minh họa.
 */

import { html } from 'lit';
import { expect } from 'storybook/test';
import './index.js';
import '../hui-button/index.js';

export default {
  title: 'Components/HuiResult',
  component: 'hui-result',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Result** — Thông báo kết quả của một thao tác hoặc trang lỗi (Ant Result).

### Cách sử dụng
\`\`\`html
<hui-result status="success" title="Thanh toán thành công" sub-title="Mã đơn: 2024-001">
  <hui-button slot="extra">Về trang chủ</hui-button>
  <hui-button slot="extra" variant="outline">Xem đơn hàng</hui-button>
</hui-result>
<hui-result status="404" title="404" sub-title="Trang bạn tìm không tồn tại."></hui-result>
\`\`\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`status\` | string | \`'info'\` | \`success\` \\| \`error\` \\| \`info\` \\| \`warning\` \\| \`404\` \\| \`403\` \\| \`500\` — 3 mã lỗi dùng hình minh họa SVG |
| \`title\` | string | — | Tiêu đề (attribute bị gỡ khỏi host để không hiện tooltip native) |
| \`sub-title\` | string | — | Phụ đề |

### Slots
| Slot | Mô tả |
|------|-------|
| _(default)_ | Nội dung chi tiết (khung nền nhạt bên dưới) |
| \`icon\` | Icon / hình minh họa tùy biến |
| \`title\` / \`sub-title\` | Nội dung HTML thay attribute |
| \`extra\` | Nút hành động |

Hình minh họa 404 / 403 / 500 tô màu bằng token (\`--hui-primary\`, \`--hui-fill-*\`, \`--hui-bg-elevated\`…) → tự đổi theo
theme và dark mode; đổi \`--hui-primary\` là hình đổi màu theo.

### Override giao diện từ bên ngoài
| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-result-padding\` | Padding khung (48px 32px) |
| \`--hui-result-icon-size\` / \`--hui-result-icon-color\` | Icon trạng thái |
| \`--hui-result-image-width\` | Chiều rộng hình minh họa (250px) |
| \`--hui-result-title-font-size\` / \`--hui-result-title-color\` | Tiêu đề |
| \`--hui-result-subtitle-color\` | Phụ đề |
| \`--hui-result-content-bg\` | Nền vùng nội dung |

**Parts:** \`base\`, \`icon\`, \`image\`, \`title\`, \`subtitle\`, \`extra\`, \`content\`.
        `,
      },
    },
  },
  argTypes: {
    status: { control: 'select', options: ['success', 'error', 'info', 'warning', '404', '403', '500'] },
    title: { control: 'text' },
    subTitle: { control: 'text' },
  },
};

/** Mặc định — Controls đổi status */
export const Default = {
  args: { status: 'success', title: 'Đặt hàng thành công!', subTitle: 'Mã đơn 2024-001. Đơn hàng sẽ được giao trong 2–3 ngày.' },
  render: (args) => html`
    <hui-result status=${args.status} title=${args.title} sub-title=${args.subTitle}>
      <hui-button slot="extra">Về trang chủ</hui-button>
      <hui-button slot="extra" variant="outline">Mua tiếp</hui-button>
    </hui-result>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('hui-result');
    const root = el.shadowRoot;
    await expect(el.hasAttribute('title')).toBe(false);
    await expect(root.querySelector('[part="title"]').textContent).toBe('Đặt hàng thành công!');
    await expect(root.querySelector('hui-icon').getAttribute('name')).toBe('success');
    await expect(root.querySelector('[part="extra"]').hidden).toBe(false);
    await expect(root.querySelector('[part="content"]').hidden).toBe(true);

    el.status = '404';
    await el.updateComplete;
    await expect(root.querySelector('hui-icon').hidden).toBe(true);
    await expect(root.querySelector('[part="image"]').querySelector('text').textContent).toBe('404');
    el.status = 'success';
  },
};

/** 4 trạng thái có icon */
export const Statuses = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
      <hui-result status="success" title="Thành công" sub-title="Thao tác đã hoàn tất."></hui-result>
      <hui-result status="info" title="Thông tin" sub-title="Yêu cầu đang được xử lý."></hui-result>
      <hui-result status="warning" title="Cảnh báo" sub-title="Có vấn đề cần kiểm tra."></hui-result>
      <hui-result status="error" title="Gửi thất bại" sub-title="Vui lòng kiểm tra lại thông tin.">
        <hui-button slot="extra" variant="danger">Thử lại</hui-button>
        <div>
          <strong>Nội dung bạn gửi có lỗi sau:</strong>
          <ul style="margin: 8px 0 0;"><li>Tài khoản đã bị khóa</li><li>Chưa xác minh email</li></ul>
        </div>
      </hui-result>
    </div>
  `,
};

/** Trang lỗi 404 / 403 / 500 với hình minh họa */
export const ErrorPages = {
  render: () => html`
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
      <hui-result status="404" title="404" sub-title="Trang bạn tìm không tồn tại."><hui-button slot="extra">Về trang chủ</hui-button></hui-result>
      <hui-result status="403" title="403" sub-title="Bạn không có quyền truy cập trang này."><hui-button slot="extra">Về trang chủ</hui-button></hui-result>
      <hui-result status="500" title="500" sub-title="Máy chủ gặp sự cố, vui lòng thử lại sau."><hui-button slot="extra">Thử lại</hui-button></hui-result>
    </div>
  `,
};

/** Icon tùy biến qua slot */
export const CustomIcon = {
  render: () => html`
    <hui-result title="Bạn thật tuyệt!" sub-title="Hoàn thành 100% bài học tuần này.">
      <hui-icon slot="icon" name="star" style="font-size: 72px; color: var(--hui-warning);"></hui-icon>
      <hui-button slot="extra">Tiếp tục</hui-button>
    </hui-result>
  `,
};

/** Override từ bên ngoài — biến CSS + ::part() */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .result-brand {
        --hui-primary: #0ea5e9;
        --hui-result-image-width: 180px;
        --hui-result-title-color: var(--hui-primary);
        --hui-result-padding: 24px;
      }
      .result-brand hui-result::part(base) { border: 1px dashed var(--hui-border-hover); border-radius: 12px; }
      .result-brand hui-result::part(subtitle) { font-style: italic; }
    </style>
    <div class="result-brand" style="max-width: 420px;">
      <hui-result status="404" title="Không tìm thấy" sub-title="Hình minh họa đổi màu theo --hui-primary."></hui-result>
    </div>
  `,
};
