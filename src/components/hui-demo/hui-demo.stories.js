/**
 * Storybook Stories — HUI Demo (tài liệu sống về cách override component)
 * Giải thích chi tiết nằm trong hui-demo.js và hui-demo.css.
 */

import { html } from 'lit';
import './index.js';

export default {
  title: 'Guide/HuiDemo — Override & Selectors',
  component: 'hui-demo',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HuiDemo** — component mẫu minh họa mọi cách nhận dữ liệu và override giao diện của thư viện HUI.

| Muốn | Dùng |
|------|------|
| Đổi màu/kích thước cả hệ thống | Token trên \`:root\` (\`--hui-primary\`) |
| Đổi mọi component cùng loại / một vùng | Biến component (\`--hui-demo-accent\`) trên \`:root\` hoặc thẻ cha |
| Đổi thuộc tính không có biến | \`hui-demo::part(box)\` |
| Chỉnh part của component lồng bên trong | \`exportparts\` → \`hui-demo::part(button-base)\` |
| Thay nội dung | \`<slot>\`, \`slot="actions"\`, \`::slotted()\` |
| Theo trạng thái người dùng gán | \`hui-demo[dark]\`, \`:host([dark])\` |
| Theo trạng thái nội bộ | \`hui-demo:state(has-count)\` |
        `,
      },
    },
  },
  argTypes: {
    heading: { control: 'text' },
    count: { control: 'number' },
    variant: { control: 'select', options: ['default', 'success', 'danger'] },
    dark: { control: 'boolean' },
  },
};

/** Attribute + slot cơ bản */
export const Basic = {
  render: (args) => html`
    <hui-demo heading=${args.heading} count=${args.count} variant=${args.variant} ?dark=${args.dark}>
      <hui-button slot="actions" size="sm" variant="text" icon="settings">Cài đặt</hui-button>
      <p class="tieu-de">Đoạn này truyền vào slot mặc định, được style bằng ::slotted(.tieu-de)</p>
    </hui-demo>
  `,
  args: { heading: 'Ví dụ tổng hợp HUI', count: 0, variant: 'default', dark: false },
};

/** Slot fallback: không truyền gì → hiện nội dung mặc định */
export const SlotFallback = {
  render: () => html`<hui-demo heading="Slot rỗng"></hui-demo>`,
};

/** Property kiểu Array — chỉ truyền bằng JS (.items trong lit = gán property) */
export const ArrayProperty = {
  render: () => html`
    <hui-demo heading="Truyền mảng bằng property" .items=${['Ant Design', 'MUI', 'HUI']}></hui-demo>
  `,
};

/** Tất cả cách override từ bên ngoài, không sửa code thư viện */
export const OverrideFromOutside = {
  render: () => html`
    <style>
      /* 1. Biến CSS đặt trên thẻ cha → mọi hui-demo bên trong đều nhận */
      .zone-brand { --hui-demo-accent: #db2777; --hui-demo-radius: 20px; }

      /* 2. ::part — chỉnh thuộc tính không có biến, kèm pseudo-class trạng thái */
      hui-demo.custom::part(title) { font-style: italic; letter-spacing: 0.04em; }
      hui-demo.custom::part(box) { background: linear-gradient(90deg, #6366f1, #db2777); }
      hui-demo.custom::part(box):hover { filter: saturate(1.4); }

      /* 3. exportparts — part của hui-button lồng bên trong */
      hui-demo.custom::part(button-base) { border-style: dashed; }
      hui-demo.custom::part(button-label) { text-transform: uppercase; }

      /* 4. Custom state — đổi khi count > 0 (bấm nút "Tăng count") */
      hui-demo.custom:state(has-count)::part(container) { box-shadow: 0 0 0 4px #fbcfe8; }

      /* 5. Class trên host → :host(.compact) bên trong */
    </style>
    <div class="zone-brand">
      <hui-demo class="custom compact" heading="Đã override từ bên ngoài">
        <p class="tieu-de">Bấm "Tăng count" để thấy :state(has-count) hoạt động</p>
      </hui-demo>
    </div>
  `,
};

/** Dark mode qua attribute + sự kiện ra ngoài */
export const DarkAndEvents = {
  render: () => html`
    <hui-demo
      dark
      heading="Dark + sự kiện hui-change"
      @hui-change=${(e) => {
        e.currentTarget.nextElementSibling.textContent = `Nhận sự kiện hui-change: count = ${e.detail.count}`;
      }}
    ></hui-demo>
    <p style="font-family: sans-serif; font-size: 14px;">Chưa có sự kiện</p>
  `,
};
