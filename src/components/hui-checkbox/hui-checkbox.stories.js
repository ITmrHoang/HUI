/**
 * Storybook Stories — HUI Checkbox
 */

import { html } from 'lit';
import './index.js';

export default {
  title: 'Components/HuiCheckbox',
  component: 'hui-checkbox',
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Checkbox** — Component hộp kiểm đa năng.

Hỗ trợ các tính năng:
- **Trạng thái**: \`checked\`, \`indeterminate\` (chưa xác định), \`disabled\`.
- **Vị trí nhãn (label)**: Bên phải (mặc định) hoặc bên trái (\`label-position="left"\`), hoặc đứng một mình không nhãn.
- **Biến thể màu sắc**: \`primary\` (mặc định), \`success\`, \`danger\`, \`warning\`.
- **Kích thước**: \`sm\`, \`md\`, \`lg\`.
- **Validation**: \`required\`, \`error\`.

### Cách sử dụng cơ bản
\`\`\`html
<hui-checkbox label="Tôi đồng ý với điều khoản"></hui-checkbox>
\`\`\`

### Các thuộc tính (Attributes)
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`label\` | string | — | Nội dung nhãn kế bên checkbox |
| \`label-position\` | string | \`'right'\` | Vị trí của nhãn: \`'left'\` hoặc \`'right'\` |
| \`checked\` | boolean | \`false\` | Có đang được chọn hay không |
| \`indeterminate\` | boolean | \`false\` | Trạng thái hiển thị dấu gạch ngang (-) |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa checkbox |
| \`required\` | boolean | \`false\` | Hiển thị dấu * đỏ bắt buộc |
| \`size\` | string | \`'md'\` | Kích thước: \`'sm'\`, \`'md'\`, \`'lg'\` |
| \`variant\` | string | \`'primary'\` | Màu sắc: \`'primary'\`, \`'success'\`, \`'warning'\`, \`'danger'\` |
| \`error\` | string | — | Chuỗi thông báo lỗi (viền đỏ) |
              `
      }
    }
  },

  argTypes: {
    label: { control: 'text' },
    'label-position': { control: 'radio', options: ['left', 'right'] },
    checked: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
    variant: { control: 'select', options: ['primary', 'success', 'warning', 'danger'] },
    error: { control: 'text' },
  }
};

/** 
 * Story: Default 
 */
export const Default = {
  render: (args) => html`
    <hui-checkbox
      label=${args.label || ''}
      label-position=${args['label-position'] || 'right'}
      size=${args.size || 'md'}
      variant=${args.variant || 'primary'}
      ?checked=${args.checked}
      ?indeterminate=${args.indeterminate}
      ?disabled=${args.disabled}
      ?required=${args.required}
      error=${args.error || ''}
    ></hui-checkbox>
  `,
  args: {
    label: 'Đồng ý điều khoản',
    'label-position': 'right',
    checked: false,
    indeterminate: false,
    disabled: false,
    required: false,
    size: 'md',
    variant: 'primary',
    error: ''
  }
};

/** 
 * Story: Label Positions (Trái / Phải hoặc Không lable)
 */
export const LabelPositions = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: flex-end;">
      <hui-checkbox label="Nhãn bên phải mặc định"></hui-checkbox>
      <hui-checkbox label="Nhãn nằm bên trái" label-position="left"></hui-checkbox>
      <hui-checkbox></hui-checkbox> <!-- Không lable -->
    </div>
  `
};

/** 
 * Story: States (Trạng thái)
 */
export const States = {
  render: () => html`
    <div style="display: flex; gap: 24px;">
      <hui-checkbox label="Unchecked"></hui-checkbox>
      <hui-checkbox label="Checked" checked></hui-checkbox>
      <hui-checkbox label="Indeterminate" indeterminate></hui-checkbox>
      <hui-checkbox label="Disabled" disabled></hui-checkbox>
      <hui-checkbox label="Disabled Checked" disabled checked></hui-checkbox>
    </div>
  `
};

/** 
 * Story: Variants (Màu đổi màu được)
 */
export const Variants = {
  render: () => html`
    <div style="display: flex; gap: 24px;">
      <hui-checkbox label="Primary" variant="primary" checked></hui-checkbox>
      <hui-checkbox label="Success" variant="success" checked></hui-checkbox>
      <hui-checkbox label="Warning" variant="warning" checked></hui-checkbox>
      <hui-checkbox label="Danger" variant="danger" checked></hui-checkbox>
    </div>
  `
};

/** 
 * Story: Sizes (Kích thước)
 */
export const Sizes = {
  render: () => html`
    <div style="display: flex; gap: 24px; align-items: center;">
      <hui-checkbox label="Small" size="sm"></hui-checkbox>
      <hui-checkbox label="Medium" size="md"></hui-checkbox>
      <hui-checkbox label="Large" size="lg"></hui-checkbox>
    </div>
  `
};

/** 
 * Story: Validation (Bắt buộc / Lỗi)
 */
export const Validation = {
  render: () => html`
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <hui-checkbox label="Phải check vào em" required></hui-checkbox>
      <hui-checkbox label="Bạn chưa đồng ý điều khoản" error="Vui lòng xác nhận để tiếp tục"></hui-checkbox>
    </div>
  `
};
