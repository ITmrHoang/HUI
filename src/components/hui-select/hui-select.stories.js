/**
 * Storybook Stories — HUI Select
 * Dropdown chọn lựa đa năng: hỗ trợ string[], object[], fetchFn API,
 * compareFn, field-label/field-value, searchable, clearable.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Components/HuiSelect',
  component: 'hui-select',
  tags: ['autodocs'],

  parameters: {
    docs: {
      description: {
        component: `
**HUI Select** — Component Dropdown chọn lựa đa năng.

### Cách sử dụng cơ bản

**1. Options dạng mảng string:**
\`\`\`html
<hui-select id="s1" label="Chọn trái cây"></hui-select>
<script>
  document.querySelector('#s1').options = ['Táo', 'Cam', 'Xoài'];
</script>
\`\`\`

**2. Options dạng mảng object:**
\`\`\`html
<hui-select id="s2" label="Chọn quốc gia" field-label="name" field-value="code"></hui-select>
<script>
  document.querySelector('#s2').options = [
    { name: 'Việt Nam', code: 'VN' },
    { name: 'Nhật Bản', code: 'JP' },
  ];
</script>
\`\`\`

**3. Gọi API bất đồng bộ:**
\`\`\`html
<hui-select id="s3" label="Tìm user" searchable></hui-select>
<script>
  document.querySelector('#s3').fetchFn = async (query) => {
    const res = await fetch(\\\`/api/users?q=\\\${query}\\\`);
    return res.json();
  };
</script>
\`\`\`

**4. Hàm so sánh tùy chỉnh:**
\`\`\`js
  select.compareFn = (optVal, selectedVal) => optVal.id === selectedVal.id;
\`\`\`

### HTML Attributes
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`label\` | string | — | Nhãn hiển thị phía trên |
| \`placeholder\` | string | \`'Chọn...'\` | Placeholder khi chưa chọn |
| \`size\` | string | \`md\` | Kích thước: sm, md, lg |
| \`disabled\` | boolean | \`false\` | Vô hiệu hóa |
| \`required\` | boolean | \`false\` | Đánh dấu bắt buộc (dấu *) |
| \`clearable\` | boolean | \`false\` | Hiện nút xóa lựa chọn |
| \`searchable\` | boolean | \`false\` | Hiện ô tìm kiếm trong dropdown |
| \`error\` | string | — | Thông báo lỗi (đỏ) |
| \`success\` | string | — | Thông báo thành công (xanh) |
| \`hint\` | string | — | Gợi ý nhỏ phía dưới |
| \`field-label\` | string | \`'label'\` | Tên field hiển thị khi option là object |
| \`field-value\` | string | \`'value'\` | Tên field giá trị khi option là object |
| \`value\` | string | — | Giá trị khởi tạo |
| \`name\` | string | \`''\` | Tên field khi gửi form |
| \`label-position\` | string | \`top\` | Vị trí label: top, inline, inside (floating) |
| \`status\` | string | — | Viền theo trạng thái: error, warning (không cần thông báo) |
| \`mode\` | \`'' \\| multiple \\| tags\` | \`''\` | Chọn nhiều (value là mảng); \`tags\`: gõ + Enter để tạo giá trị mới |
| \`show-search\` | boolean | \`false\` | Ô tìm kiếm + lọc theo nhãn (tên kiểu Ant của \`searchable\`) |
| \`allow-clear\` | boolean | \`false\` | Nút xóa (tên kiểu Ant của \`clearable\`) |
| \`max-tag-count\` | number | — | Số tag tối đa hiển thị, phần còn lại gộp thành tag \`+N\` |
| \`loading\` | boolean | \`false\` | Vòng xoay ở trigger, dropdown hiện "Đang tải..." |

### Nhiều giá trị · nhóm · virtual list
- \`mode="multiple"\`: \`value\` là mảng (attribute nhận JSON \`'["a","b"]'\` hoặc \`a,b\`), option bật/tắt, dropdown vẫn mở,
  \`Backspace\` xóa tag cuối. Trong \`<form>\` mỗi giá trị là 1 entry cùng \`name\` → \`FormData.getAll(name)\`.
- \`mode="tags"\`: như multiple + gõ chữ chưa có trong danh sách → dòng "tạo mới", \`Enter\` để thêm.
- Nhóm option: \`{ label: 'Châu Á', options: [...] }\` (lẫn với option thường được).
- Hơn 100 option (sau khi lọc) → virtual list: chỉ vẽ các dòng đang nhìn thấy trong listbox.
- Không có option: slot \`not-found\` (mặc định \`<hui-empty image="simple">\`).

### Form
\`<hui-select>\` tham gia \`<form>\`: \`FormData\` (value primitive → chuỗi, object → JSON), \`form.reset()\`,
\`<fieldset disabled>\`, \`required\` + \`checkValidity()\`. CSS bắt lỗi sau tương tác: \`hui-select:state(user-invalid)\`.
Dropdown nằm ở top-layer nên không bị \`overflow: hidden\` của thẻ cha cắt; tự lật lên trên khi thiếu chỗ.

### JS Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`options\` | Array | Mảng string[] hoặc object[] (object có \`disabled: true\` thì không chọn được) |
| \`fetchFn\` | Function | Hàm async (query) => Promise<Array> |
| \`compareFn\` | Function | Hàm (optionValue, selectedValue) => boolean |
| \`value\` | any | Getter/Setter giá trị hiện tại |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ value, label, option }\` | Phát khi chọn / bỏ chọn option (mode nhiều giá trị: cả 3 là mảng) |
| \`clear\` | — | Phát khi xóa lựa chọn |

### Slots
| Slot | Mô tả |
|------|-------|
| \`not-found\` | Nội dung khi không có option (mặc định \`<hui-empty image="simple">\`) |

### Keyboard
| Phím | Hành động |
|------|-----------|
| \`↑ ↓\` | Mở dropdown / di chuyển highlight |
| \`Home\` / \`End\` | Về option đầu / cuối |
| \`Enter\` / \`Space\` | Mở dropdown / chọn option đang highlight (multiple: bật/tắt, giữ dropdown mở) |
| \`Escape\` | Đóng dropdown |
| \`Backspace\` | mode multiple/tags: xóa tag cuối (khi ô tìm kiếm trống) |
| \`Enter\` (tags) | Tạo giá trị mới từ chữ đang gõ |

### Override giao diện từ bên ngoài
Biến CSS đặt được trên chính thẻ, thẻ cha hoặc \`:root\` (popup cũng nhận); \`::part()\` để chỉnh sâu hơn.

| Biến CSS | Mô tả |
|----------|-------|
| \`--hui-select-height\` / \`--hui-select-padding-x\` | Chiều cao / đệm ngang của ô |
| \`--hui-select-font-size\` / \`--hui-select-radius\` | Cỡ chữ / bo góc ô |
| \`--hui-select-bg\` / \`--hui-select-color\` / \`--hui-select-placeholder-color\` | Nền / chữ / placeholder |
| \`--hui-select-border-color\` / \`--hui-select-hover-border-color\` | Viền / viền khi hover |
| \`--hui-select-focus-border-color\` / \`--hui-select-focus-shadow\` | Viền / vòng sáng khi mở |
| \`--hui-select-label-color\` / \`--hui-select-label-font-size\` | Màu / cỡ chữ nhãn |
| \`--hui-select-dropdown-bg\` / \`--hui-select-dropdown-radius\` / \`--hui-select-dropdown-shadow\` | Nền / bo góc / bóng popup |
| \`--hui-select-dropdown-max-height\` | Chiều cao tối đa danh sách |
| \`--hui-select-option-padding\` / \`--hui-select-option-hover-bg\` | Đệm / nền hover option |
| \`--hui-select-option-selected-bg\` / \`--hui-select-option-selected-color\` | Nền / chữ option đang chọn |
| \`--hui-select-tag-bg\` / \`--hui-select-tag-color\` / \`--hui-select-tag-radius\` | Tag (mode nhiều giá trị) |

**Parts:** \`base\`, \`label\`, \`trigger\`, \`value\`, \`tags\`, \`tag\` (+ \`tag-rest\`), \`tag-remove\`, \`clear\`, \`arrow\`, \`loading\`,
\`dropdown\`, \`search\`, \`listbox\`, \`group-label\`, \`option\` (+ \`option-selected\`, \`option-active\`, \`option-disabled\`,
\`option-create\`), \`check\`, \`empty\` (+ \`loading\`), \`message\`.
        `,
      },
    },
  },

  argTypes: {
    label: {
      control: 'text',
      description: 'Nhãn hiển thị phía trên',
    },
    'label-position': {
      control: 'select',
      options: ['top', 'inline', 'inside'],
      description: 'Vị trí của label',
      table: { defaultValue: { summary: 'top' } },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder khi chưa chọn',
      table: { defaultValue: { summary: 'Chọn...' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Kích thước',
      table: { defaultValue: { summary: 'md' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Vô hiệu hóa',
    },
    required: {
      control: 'boolean',
      description: 'Bắt buộc (dấu *)',
    },
    clearable: {
      control: 'boolean',
      description: 'Hiện nút xóa',
    },
    searchable: {
      control: 'boolean',
      description: 'Hiện ô tìm kiếm',
    },
    error: {
      control: 'text',
      description: 'Thông báo lỗi',
    },
    success: {
      control: 'text',
      description: 'Thông báo thành công',
    },
    hint: {
      control: 'text',
      description: 'Gợi ý',
    },
  },
};

// ========================================================
// HELPERS — Hàm tiện ích set options sau khi render
// ========================================================

/**
 * Hàm gán options cho select theo id — cần setTimeout vì lit render async
 */
const setOptionsById = (id, options, extra = {}) => {
  setTimeout(() => {
    const el = document.querySelector(`hui-select#${id}`)
      || document.querySelectorAll('hui-select');

    // Tìm trong tất cả shadow roots
    const allSelects = document.querySelectorAll('div[id^="storybook"]');
    let target = document.getElementById(id);

    // Fallback: tìm trong shadow DOM của Storybook
    if (!target) {
      document.querySelectorAll('hui-select').forEach((s) => {
        if (s.id === id) target = s;
      });
    }

    if (target) {
      target.options = options;
      if (extra.fetchFn) target.fetchFn = extra.fetchFn;
      if (extra.compareFn) target.compareFn = extra.compareFn;
      if (extra.value !== undefined) target.value = extra.value;
    }
  }, 100);
};

// ========================================================
// STORY DATA
// ========================================================

// Mảng string đơn giản
const FRUIT_OPTIONS = ['🍎 Táo', '🍊 Cam', '🍋 Chanh', '🍇 Nho', '🍉 Dưa hấu', '🍌 Chuối', '🥭 Xoài', '🍑 Đào'];

// Mảng object {label, value} mặc định
const COUNTRY_OPTIONS = [
  { label: '🇻🇳 Việt Nam', value: 'VN' },
  { label: '🇯🇵 Nhật Bản', value: 'JP' },
  { label: '🇰🇷 Hàn Quốc', value: 'KR' },
  { label: '🇺🇸 Hoa Kỳ', value: 'US' },
  { label: '🇬🇧 Anh Quốc', value: 'GB' },
  { label: '🇫🇷 Pháp', value: 'FR' },
  { label: '🇩🇪 Đức', value: 'DE' },
  { label: '🇨🇦 Canada', value: 'CA' },
  { label: '🇦🇺 Úc', value: 'AU' },
  { label: '🇸🇬 Singapore', value: 'SG' },
];

// Mảng object với field tùy chỉnh (name/code)
const LANGUAGE_OPTIONS = [
  { name: 'JavaScript', code: 'js', type: 'frontend' },
  { name: 'TypeScript', code: 'ts', type: 'frontend' },
  { name: 'Python', code: 'py', type: 'backend' },
  { name: 'Go', code: 'go', type: 'backend' },
  { name: 'Rust', code: 'rs', type: 'systems' },
  { name: 'Java', code: 'java', type: 'backend' },
  { name: 'C#', code: 'cs', type: 'backend' },
  { name: 'Swift', code: 'swift', type: 'mobile' },
  { name: 'Kotlin', code: 'kt', type: 'mobile' },
];

// ========================================================
// STORIES
// ========================================================

/**
 * Story mặc định — Select với mảng string đơn giản.
 */
export const Default = {
  render: (args) => {
    // Gán options sau khi render
    setTimeout(() => {
      const el = document.querySelector('#select-default');
      if (el) el.options = FRUIT_OPTIONS;
    }, 50);

    return html`
      <div style="max-width: 360px; padding: 20px;">
        <hui-select
          id="select-default"
          label=${args.label || ''}
          label-position=${args['label-position'] || 'top'}
          placeholder=${args.placeholder || ''}
          size=${args.size || 'md'}
          ?disabled=${args.disabled}
          ?required=${args.required}
          ?clearable=${args.clearable}
          ?searchable=${args.searchable}
          error=${args.error || ''}
          success=${args.success || ''}
          hint=${args.hint || ''}
        ></hui-select>
      </div>
    `;
  },
  args: {
    label: 'Chọn trái cây',
    'label-position': 'top',
    placeholder: 'Chọn một loại...',
    size: 'md',
    disabled: false,
    required: false,
    clearable: true,
    searchable: false,
    error: '',
    success: '',
    hint: '',
  },
};

/**
 * Options dạng Object {label, value} — Sử dụng field mặc định.
 */
export const ObjectOptions = {
  render: () => {
    setTimeout(() => {
      const el = document.querySelector('#select-object');
      if (el) {
        el.options = COUNTRY_OPTIONS;
        el.value = 'VN'; // Pre-select Việt Nam
      }
    }, 50);

    return html`
      <div style="max-width: 360px; padding: 20px;">
        <hui-select
          id="select-object"
          label="Chọn quốc gia"
          placeholder="Chọn quốc gia..."
          clearable
          searchable
        ></hui-select>
      </div>
    `;
  },
};

/**
 * Custom Field Label/Value — Dùng field-label="name" field-value="code" cho object có key khác.
 */
export const CustomFields = {
  render: () => {
    setTimeout(() => {
      const el = document.querySelector('#select-custom-fields');
      if (el) el.options = LANGUAGE_OPTIONS;
    }, 50);

    return html`
      <div style="max-width: 360px; padding: 20px;">
        <hui-select
          id="select-custom-fields"
          label="Ngôn ngữ lập trình"
          placeholder="Chọn ngôn ngữ..."
          field-label="name"
          field-value="code"
          clearable
          searchable
          hint="Sử dụng field-label='name' và field-value='code'"
        ></hui-select>
      </div>
    `;
  },
};

/**
 * Searchable — Ô tìm kiếm filter option trong dropdown.
 */
export const Searchable = {
  render: () => {
    setTimeout(() => {
      const el = document.querySelector('#select-search');
      if (el) el.options = COUNTRY_OPTIONS;
    }, 50);

    return html`
      <div style="max-width: 360px; padding: 20px;">
        <hui-select
          id="select-search"
          label="Tìm & chọn quốc gia"
          placeholder="Gõ để tìm..."
          searchable
          clearable
        ></hui-select>
      </div>
    `;
  },
};

/**
 * Fetch API — Gọi hàm bất đồng bộ để lấy options.
 * Demo giả lập API delay 800ms.
 */
export const FetchAPI = {
  render: () => {
    setTimeout(() => {
      const el = document.querySelector('#select-fetch');
      if (el) {
        // Giả lập API: delay 800ms, filter theo query
        el.fetchFn = async (query) => {
          // Giả lập network delay
          await new Promise((r) => setTimeout(r, 800));

          const allUsers = [
            { label: '👤 Nguyễn Văn A', value: 1 },
            { label: '👤 Trần Thị B', value: 2 },
            { label: '👤 Lê Hoàng C', value: 3 },
            { label: '👤 Phạm Minh D', value: 4 },
            { label: '👤 Võ Thanh E', value: 5 },
            { label: '👤 Đỗ Quang F', value: 6 },
            { label: '👤 Bùi Hải G', value: 7 },
            { label: '👤 Hoàng Thị H', value: 8 },
          ];

          if (!query) return allUsers;
          return allUsers.filter((u) =>
            u.label.toLowerCase().includes(query.toLowerCase())
          );
        };
      }
    }, 50);

    return html`
      <div style="max-width: 360px; padding: 20px;">
        <hui-select
          id="select-fetch"
          label="Tìm người dùng (API)"
          placeholder="Gõ tên để tìm..."
          searchable
          clearable
          hint="fetchFn giả lập delay 800ms"
        ></hui-select>
      </div>
    `;
  },
};

/**
 * Custom CompareFn — Hàm so sánh tùy chỉnh cho object phức tạp.
 */
export const CustomCompare = {
  render: () => {
    setTimeout(() => {
      const el = document.querySelector('#select-compare');
      if (el) {
        const complexOptions = [
          { id: 1, title: '📋 Task #1: Setup project', priority: 'high' },
          { id: 2, title: '📋 Task #2: Build UI', priority: 'medium' },
          { id: 3, title: '📋 Task #3: Write tests', priority: 'low' },
          { id: 4, title: '📋 Task #4: Deploy', priority: 'high' },
        ];

        el.options = complexOptions;

        // So sánh theo field 'id' thay vì toàn bộ object
        el.compareFn = (optValue, selectedValue) => {
          return optValue === selectedValue;
        };

        // Pre-select task #2
        el.value = 2;
      }
    }, 50);

    return html`
      <div style="max-width: 400px; padding: 20px;">
        <hui-select
          id="select-compare"
          label="Chọn task (Custom Compare)"
          field-label="title"
          field-value="id"
          clearable
          hint="compareFn so sánh theo field 'id'"
        ></hui-select>
      </div>
    `;
  },
};

/**
 * Trạng thái lỗi — Viền đỏ + thông báo bên dưới.
 */
export const WithError = {
  render: () => {
    setTimeout(() => {
      const el = document.querySelector('#select-error');
      if (el) el.options = FRUIT_OPTIONS;
    }, 50);

    return html`
      <div style="max-width: 360px; padding: 20px;">
        <hui-select
          id="select-error"
          label="Chọn trái cây"
          placeholder="Bắt buộc chọn..."
          required
          error="Vui lòng chọn ít nhất một mục."
        ></hui-select>
      </div>
    `;
  },
};

/**
 * Trạng thái thành công — Viền xanh + thông báo OK.
 */
export const WithSuccess = {
  render: () => {
    setTimeout(() => {
      const el = document.querySelector('#select-success');
      if (el) {
        el.options = COUNTRY_OPTIONS;
        el.value = 'VN';
      }
    }, 50);

    return html`
      <div style="max-width: 360px; padding: 20px;">
        <hui-select
          id="select-success"
          label="Quốc gia"
          success="Đã xác nhận quốc gia!"
          clearable
        ></hui-select>
      </div>
    `;
  },
};

/**
 * Disabled — Không cho phép tương tác.
 */
export const Disabled = {
  render: () => {
    setTimeout(() => {
      const el = document.querySelector('#select-disabled');
      if (el) {
        el.options = COUNTRY_OPTIONS;
        el.value = 'JP';
      }
    }, 50);

    return html`
      <div style="max-width: 360px; padding: 20px;">
        <hui-select
          id="select-disabled"
          label="Quốc gia (Disabled)"
          disabled
        ></hui-select>
      </div>
    `;
  },
};

/**
 * Các chế độ hiển thị Label (label-position).
 */
export const LabelPositions = {
  render: () => {
    setTimeout(() => {
      document.querySelectorAll('.label-pos-demo hui-select').forEach((el) => {
        el.options = FRUIT_OPTIONS;
      });
    }, 50);

    return html`
      <div class="label-pos-demo" style="display: flex; flex-direction: column; gap: 32px; max-width: 400px; padding: 20px;">
        <hui-select
          label="Label Top (Mặc định)"
          label-position="top"
          placeholder="Label ở trên..."
        ></hui-select>

        <hui-select
          label="Label Inline"
          label-position="inline"
          placeholder="Label nằm ngang..."
        ></hui-select>

        <hui-select
          label="Label Inside (Floating)"
          label-position="inside"
          placeholder="Nhấn để hiện dropdown..."
        ></hui-select>
      </div>
    `;
  },
};

/**
 * Tất cả kích thước — So sánh sm, md, lg cạnh nhau.
 */
export const AllSizes = {
  render: () => {
    setTimeout(() => {
      document.querySelectorAll('.size-demo hui-select').forEach((el) => {
        el.options = FRUIT_OPTIONS;
      });
    }, 50);

    return html`
      <div class="size-demo" style="display: flex; flex-direction: column; gap: 16px; max-width: 360px; padding: 20px;">
        <hui-select label="Small" size="sm" placeholder="Size sm..." clearable></hui-select>
        <hui-select label="Medium" size="md" placeholder="Size md..." clearable></hui-select>
        <hui-select label="Large" size="lg" placeholder="Size lg..." clearable></hui-select>
      </div>
    `;
  },
};

/**
 * Override từ bên ngoài — biến CSS (cả popup cũng nhận) và ::part() cho chỉnh sâu.
 * Khung cha có overflow: hidden nhưng dropdown vẫn hiện đầy đủ (top-layer).
 */
export const CustomizeFromOutside = {
  render: () => {
    setTimeout(() => {
      document.querySelectorAll('.customize-demo hui-select').forEach((el) => {
        el.options = COUNTRY_OPTIONS;
      });
    }, 50);

    return html`
      <style>
        .customize-demo .pill {
          --hui-select-radius: 999px;
          --hui-select-padding-x: 18px;
          --hui-select-dropdown-radius: 16px;
          --hui-select-option-padding: 8px 16px;
          --hui-select-option-selected-bg: var(--hui-success-light);
          --hui-select-option-selected-color: var(--hui-success);
          --hui-select-focus-border-color: var(--hui-success);
          --hui-select-focus-shadow: 0 0 0 3px var(--hui-success-light);
        }
        hui-select.brand {
          --hui-select-height: 44px;
          --hui-select-bg: var(--hui-primary-1);
          --hui-select-border-color: var(--hui-primary-3);
          --hui-select-dropdown-bg: var(--hui-primary-1);
          --hui-select-option-hover-bg: var(--hui-primary-2);
          --hui-select-dropdown-max-height: 160px;
        }
        hui-select.parts::part(trigger) { border-style: dashed; }
        hui-select.parts::part(arrow) { color: var(--hui-primary); }
        hui-select.parts::part(option-active) { font-weight: var(--hui-font-weight-semibold); }
        hui-select.parts::part(check) { color: var(--hui-warning); }
      </style>
      <div class="customize-demo" style="display: flex; flex-direction: column; gap: 16px; max-width: 360px; padding: 20px;">
        <div class="pill">
          <hui-select label="Biến CSS trên thẻ cha" placeholder="Bo tròn, option màu success" searchable></hui-select>
        </div>
        <hui-select class="brand" label="Biến CSS trên chính thẻ" placeholder="Nền theo palette primary"></hui-select>
        <div style="overflow: hidden; height: 90px; border: 1px dashed var(--hui-border); padding: 8px; border-radius: 8px;">
          <hui-select class="parts" label="::part() + cha overflow: hidden" placeholder="Dropdown không bị cắt" clearable></hui-select>
        </div>
      </div>
    `;
  },
};

// ========================================================
// NÂNG CẤP: multiple / tags / nhóm / loading / not-found / virtual list
// ========================================================

/** Gửi phím lên phần tử trong shadow (composed như phím thật) */
const press = (el, key) => el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
const part = (el, name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const typeSearch = (sel, text) => {
  const search = part(sel, 'search');
  search.value = text;
  search.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  return search;
};

const GROUPED_OPTIONS = [
  { label: 'Châu Á', options: [{ label: 'Việt Nam', value: 'VN' }, { label: 'Nhật Bản', value: 'JP' }, { label: 'Hàn Quốc', value: 'KR' }] },
  { label: 'Châu Âu', options: [{ label: 'Pháp', value: 'FR' }, { label: 'Đức', value: 'DE', disabled: true }] },
  { label: 'Khác (không thuộc nhóm)', value: 'OTHER' },
];

const MANY_OPTIONS = Array.from({ length: 1000 }, (_, i) => ({ label: `Mục số ${i + 1}`, value: i + 1 }));

/**
 * mode="multiple" — value là mảng, tag có nút ✕, max-tag-count gộp tag thừa thành "+N".
 * Trong <form>: mỗi giá trị là 1 entry cùng name.
 */
export const Multiple = {
  render: () => html`
    <form id="select-multi-form" style="max-width: 400px; padding: 20px; display: flex; flex-direction: column; gap: 12px;"
      @submit=${(e) => {
        e.preventDefault();
        e.target.querySelector('output').textContent = JSON.stringify(new FormData(e.target).getAll('countries'));
      }}>
      <hui-select
        name="countries"
        label="Quốc gia đã đến"
        mode="multiple"
        allow-clear
        show-search
        max-tag-count="2"
        placeholder="Chọn nhiều quốc gia"
        .options=${COUNTRY_OPTIONS}
        value='["VN"]'
      ></hui-select>
      <div style="display: flex; gap: 8px;"><button type="submit">Gửi</button><button type="reset">Đặt lại</button></div>
      <output>[]</output>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#select-multi-form');
    const sel = form.querySelector('hui-select');
    await waitFor(() => expect(sel.value).toEqual(['VN']));
    await expect(new FormData(form).getAll('countries')).toEqual(['VN']);

    const changes = [];
    sel.addEventListener('change', (e) => changes.push(e.detail.value));
    part(sel, 'trigger').click();
    await waitFor(() => expect(sel.shadowRoot.querySelector('#option-1')).toBeTruthy());
    sel.shadowRoot.querySelector('#option-1').click(); // JP
    sel.shadowRoot.querySelector('#option-2').click(); // KR
    await expect(sel.value).toEqual(['VN', 'JP', 'KR']);
    await expect(part(sel, 'base').classList.contains('hui-select--open')).toBe(true); // vẫn mở
    await expect(new FormData(form).getAll('countries')).toEqual(['VN', 'JP', 'KR']);
    await waitFor(() => expect(sel.shadowRoot.querySelectorAll('[part="tag"]').length).toBe(2));
    await expect(part(sel, 'tag-rest').textContent).toBe('+1');
    await expect(sel.shadowRoot.querySelector('#option-1').getAttribute('aria-selected')).toBe('true');

    // Bỏ chọn bằng click lại, Backspace (ô tìm kiếm trống) xóa tag cuối
    sel.shadowRoot.querySelector('#option-1').click();
    await expect(sel.value).toEqual(['VN', 'KR']);
    press(part(sel, 'search'), 'Backspace');
    await expect(sel.value).toEqual(['VN']);
    await expect(changes).toEqual([['VN', 'JP'], ['VN', 'JP', 'KR'], ['VN', 'KR'], ['VN']]);

    // Nút ✕ trên tag → rỗng → không gửi form; reset về attribute value
    await waitFor(() => expect(part(sel, 'tag-remove')).toBeTruthy());
    part(sel, 'tag-remove').click();
    await expect(sel.value).toEqual([]);
    await expect(sel.formValue()).toBe(null);
    await expect(new FormData(form).getAll('countries')).toEqual([]);
    form.reset();
    await waitFor(() => expect(sel.value).toEqual(['VN']));
    press(part(sel, 'search'), 'Escape');
  },
};

/** mode="tags" — gõ chữ chưa có rồi Enter để tạo giá trị mới */
export const Tags = {
  render: () => html`
    <div style="max-width: 400px; padding: 20px;">
      <hui-select id="select-tags" label="Nhãn" mode="tags" allow-clear placeholder="Gõ rồi Enter để thêm"
        .options=${['frontend', 'backend', 'devops']}></hui-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sel = canvasElement.querySelector('#select-tags');
    await waitFor(() => expect(part(sel, 'trigger')).toBeTruthy());
    part(sel, 'trigger').click();

    let search = typeSearch(sel, 'mobile');
    await expect(part(sel, 'option-create').textContent).toContain('mobile');
    press(search, 'Enter');
    await expect(sel.value).toEqual(['mobile']);
    await expect(search.value).toBe(''); // tự xóa chữ sau khi chọn

    search = typeSearch(sel, 'backend'); // khớp option có sẵn → không có dòng "tạo mới"
    await expect(part(sel, 'option-create')).toBe(null);
    press(search, 'Enter');
    await expect(sel.value).toEqual(['mobile', 'backend']);
    await waitFor(() => expect([...sel.shadowRoot.querySelectorAll('[part="tag"]')]
      .map((t) => t.querySelector('.hui-select__tag-label').textContent)).toEqual(['mobile', 'backend']));
    press(search, 'Escape');
  },
};

/** Nhóm option: { label, options: [...] } — option lẻ đặt cùng cấp với nhóm */
export const OptionGroups = {
  render: () => html`
    <div style="max-width: 360px; padding: 20px;">
      <hui-select id="select-groups" label="Quốc gia (theo châu lục)" show-search allow-clear .options=${GROUPED_OPTIONS}></hui-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sel = canvasElement.querySelector('#select-groups');
    await waitFor(() => expect(part(sel, 'trigger')).toBeTruthy());
    part(sel, 'trigger').click();
    await waitFor(() => expect(sel.shadowRoot.querySelectorAll('[role="group"]').length).toBe(2));
    await expect([...sel.shadowRoot.querySelectorAll('[part="group-label"]')].map((g) => g.textContent)).toEqual(['Châu Á', 'Châu Âu']);
    const search = typeSearch(sel, 'pháp');
    await expect(sel.shadowRoot.querySelectorAll('[role="group"]').length).toBe(1);
    press(search, 'Enter');
    await expect(sel.value).toBe('FR');
    await waitFor(() => expect(part(sel, 'value').textContent).toBe('Pháp'));
  },
};

/** loading: vòng xoay ở trigger; slot not-found thay nội dung khi không có option */
export const LoadingAndNotFound = {
  render: () => html`
    <div style="max-width: 360px; padding: 20px; display: flex; flex-direction: column; gap: 16px;">
      <hui-select label="Đang tải dữ liệu" loading placeholder="Đợi chút..."></hui-select>
      <hui-select id="select-empty" label="Mặc định: hui-empty" show-search .options=${['Một', 'Hai']}></hui-select>
      <hui-select label="Slot not-found tùy chỉnh" show-search>
        <div slot="not-found" style="padding: 8px; text-align: center; color: var(--hui-text-tertiary);">
          Chưa có gì — <a href="#" @click=${(e) => e.preventDefault()}>tạo mới</a>
        </div>
      </hui-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sel = canvasElement.querySelector('#select-empty');
    await waitFor(() => expect(part(sel, 'trigger')).toBeTruthy());
    part(sel, 'trigger').click();
    const search = typeSearch(sel, 'không có');
    const status = part(sel, 'empty');
    await expect(status.hidden).toBe(false);
    await expect(status.querySelector('hui-empty')).toBeTruthy();
    press(search, 'Escape');
  },
};

/** > 100 option → virtual list: chỉ vẽ các dòng đang nhìn thấy (1000 option ở đây) */
export const VirtualList = {
  render: () => html`
    <div style="max-width: 360px; padding: 20px;">
      <hui-select id="select-virtual" label="1000 option" show-search .options=${MANY_OPTIONS}></hui-select>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const sel = canvasElement.querySelector('#select-virtual');
    await waitFor(() => expect(part(sel, 'trigger')).toBeTruthy());
    part(sel, 'trigger').click();
    const listbox = part(sel, 'listbox');
    await waitFor(() => expect(listbox.classList.contains('hui-select__listbox--virtual')).toBe(true));
    const rendered = listbox.querySelectorAll('[role="option"]').length;
    await expect(rendered).toBeGreaterThan(0);
    await expect(rendered).toBeLessThan(60);

    // ↑ khi chưa highlight → option cuối được vẽ + highlight; Enter chọn
    const search = part(sel, 'search');
    press(search, 'ArrowUp');
    await waitFor(() => expect(sel.shadowRoot.querySelector('#option-999')).toBeTruthy());
    await expect(search.getAttribute('aria-activedescendant')).toBe('option-999');
    await expect(listbox.querySelectorAll('[role="option"]').length).toBeLessThan(60);
    press(search, 'Enter');
    await expect(sel.value).toBe(1000);

    // Lọc còn ít option → về danh sách thường
    part(sel, 'trigger').click();
    typeSearch(sel, 'Mục số 99');
    await expect(listbox.classList.contains('hui-select__listbox--virtual')).toBe(false);
    await expect(listbox.querySelectorAll('[role="option"]').length).toBe(11); // 99, 990–999
    press(search, 'Escape');
  },
};
