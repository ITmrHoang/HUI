# RULE: Storybook Bắt Buộc Cho Mọi Component

> **Phạm vi áp dụng:** Mỗi khi tạo mới hoặc chỉnh sửa component trong thư mục `src/components/`.

## NGUYÊN TẮC BẮT BUỘC

### 1. Tạo Component Mới → PHẢI Có Story

Khi tạo một component mới (ví dụ: `hui-xyz`), **BẮT BUỘC** phải tạo file story tương ứng:

```
src/components/hui-xyz/
├── hui-xyz.js          ← Component logic
├── hui-xyz.css         ← Component styles (nếu có, tách CSS riêng)
├── hui-xyz.stories.js  ← ⚡ BẮT BUỘC — Storybook stories
├── index.js            ← Export entry
```

**KHÔNG ĐƯỢC** commit/hoàn thành task mà THIẾU file `*.stories.js`.

### 2. Cấu Trúc File Story Chuẩn

Mỗi file `*.stories.js` PHẢI tuân thủ cấu trúc sau:

```js
/**
 * Storybook Stories — HUI [Tên Component]
 * [Mô tả ngắn gọn chức năng component]
 */

import { html } from 'lit';
import './index.js';

export default {
  // Phân cấp trên sidebar Storybook
  title: 'Components/Hui[TenComponent]',
  // Tên thẻ HTML custom element
  component: 'hui-[ten-component]',
  // Tự sinh trang Docs
  tags: ['autodocs'],

  // Mô tả chi tiết cho docs — BẮT BUỘC phải có đầy đủ:
  parameters: {
    docs: {
      description: {
        component: `
**HUI [Tên]** — [Mô tả chức năng].

### Cách sử dụng cơ bản
\\\`\\\`\\\`html
<hui-xyz attribute="value">Content</hui-xyz>
\\\`\\\`\\\`

### Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| ... | ... | ... | ... |

### Events (nếu có)
| Event | Detail | Mô tả |
|-------|--------|-------|
| ... | ... | ... |

### Slots (nếu có)
| Slot | Mô tả |
|------|-------|
| ... | ... |
        `,
      },
    },
  },

  // ArgTypes — map từ observedAttributes của component
  argTypes: {
    // Mỗi attribute trong observedAttributes phải có argType tương ứng
    // Dùng control phù hợp: 'select', 'boolean', 'text', 'number'
  },
};

// Story mặc định — trạng thái phổ biến nhất
export const Default = {
  render: (args) => html`<hui-xyz ...>${args.label}</hui-xyz>`,
  args: { /* giá trị mặc định */ },
};

// Thêm các story khác cho từng trạng thái quan trọng
// export const Disabled = { ... };
// export const Loading = { ... };
// export const AllSizes = { ... };
// export const AllVariants = { ... };
```

### 3. Checklist Bắt Buộc Cho Mỗi Story

- [ ] **Default story**: Trạng thái mặc định, phổ biến nhất
- [ ] **Mỗi variant/trạng thái** phải có story riêng (disabled, loading, error, v.v.)
- [ ] **AllSizes story**: Nếu component hỗ trợ size (sm/md/lg), tạo story so sánh cạnh nhau
- [ ] **AllVariants story**: Nếu component hỗ trợ variant, tạo story so sánh
- [ ] **Slot demo**: Nếu component có `<slot>`, tạo story minh họa
- [ ] **argTypes đầy đủ**: Map 100% `observedAttributes` sang Storybook controls
- [ ] **Docs description**: Bảng Attributes, Events, Slots, Methods đầy đủ
- [ ] **Comment tiếng Việt**: Mỗi story export có JSDoc comment mô tả bằng tiếng Việt

### 4. Sửa Component → Cập Nhật Story

Khi thay đổi `observedAttributes`, thêm/xóa event, hoặc thêm slot:
- **CẬP NHẬT** file `*.stories.js` tương ứng
- **CẬP NHẬT** bảng Attributes/Events/Slots trong docs description
- **THÊM** story mới nếu có trạng thái/variant mới

### 5. Quy Tắc Đặt Tên

| Thành phần | Quy tắc | Ví dụ |
|------------|---------|-------|
| File story | `[tên-component].stories.js` | `hui-button.stories.js` |
| Title | `Components/Hui[PascalCase]` | `Components/HuiButton` |
| Story name | `PascalCase`, mô tả trạng thái | `Primary`, `WithError`, `AllSizes` |
| ID dùng trong render | `[component]-[story]` | `modal-default`, `modal-sm` |

### 6. Import Component

- **LUÔN** import từ `./index.js` (entry file) chứ không import trực tiếp file `.js` chính
- Nếu story cần component khác hỗ trợ demo (ví dụ button trong modal), import chúng luôn:

```js
import './index.js';
import '../hui-button/index.js'; // Component phụ trợ cho demo
```

### 7. Layout Đặc Biệt

- Component overlay/popup (modal, tooltip, drawer): Thêm `parameters.layout: 'fullscreen'`
- Component inline (button, input, badge): Giữ layout mặc định

## VÍ DỤ THAM KHẢO

Xem các file story mẫu đã có trong project:
- `src/components/hui-button/hui-button.stories.js` — Button đa variant
- `src/components/hui-input/hui-input.stories.js` — Input với validation states
- `src/components/hui-modal/hui-modal.stories.js` — Modal với JS methods

## LỆNH CHẠY

```bash
# Chạy Storybook dev server
npm run storybook

# Build static Storybook (cho deploy)
npm run build-storybook

# Chạy test stories bằng Vitest
npx vitest --project=storybook
```
