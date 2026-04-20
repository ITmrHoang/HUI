/**
 * Storybook Stories — HUI Select
 * Dropdown chọn lựa đa năng: hỗ trợ string[], object[], fetchFn API,
 * compareFn, field-label/field-value, searchable, clearable.
 */

import { html } from 'lit';
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
| \`name\` | string | \`''\` | Thuộc tính name cho form |

### JS Properties
| Property | Type | Mô tả |
|----------|------|-------|
| \`options\` | Array | Mảng string[] hoặc object[] |
| \`fetchFn\` | Function | Hàm async (query) => Promise<Array> |
| \`compareFn\` | Function | Hàm (optionValue, selectedValue) => boolean |
| \`value\` | any | Getter/Setter giá trị hiện tại |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`change\` | \`{ value, label, option }\` | Phát khi chọn option |
| \`clear\` | — | Phát khi xóa lựa chọn |

### Keyboard
| Phím | Hành động |
|------|-----------|
| \`↑ ↓\` | Di chuyển highlight |
| \`Enter\` | Chọn option đang highlight |
| \`Escape\` | Đóng dropdown |
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
