/**
 * Storybook Stories — HUI Filter Chips (hàng chip lọc nhanh)
 */

import { html } from 'lit';
import { expect, userEvent, waitFor } from 'storybook/test';
import './index.js';

const chip = (el, value) => el.shadowRoot.querySelector(`[data-value="${value}"]`);
const clearChip = (el) => el.shadowRoot.querySelector('[part="clear"]');

const CATEGORIES = [
  { value: 'ao', label: 'Áo', count: 128, icon: 'tag' },
  { value: 'quan', label: 'Quần', count: 64 },
  { value: 'giay', label: 'Giày', count: 37 },
  { value: 'phu-kien', label: 'Phụ kiện', count: 12500 },
  { value: 'sale', label: 'Đang giảm giá', icon: 'star' },
  { value: 'het', label: 'Hết hàng', count: 0, disabled: true },
];

export default {
  title: 'Molecules/HuiFilterChips',
  component: 'hui-filter-chips',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Filter Chips** — hàng chip lọc nhanh (chọn một / nhiều) nhận \`options\` data, chip "Xóa lọc" khi đang lọc,
tràn thì cuộn ngang (kéo chuột, lăn chuột, mép mờ dần). Tham gia \`<form>\`.

\`\`\`html
<hui-filter-chips name="category" multiple all-label="Tất cả"></hui-filter-chips>
<script>el.options = [{ value: 'ao', label: 'Áo', count: 128, icon: 'tag' }, …]</script>
\`\`\`

### Attributes / Properties
| Tên | Kiểu | Mặc định | Mô tả |
|-----|------|----------|-------|
| \`options\` | \`(string \\| {value,label,count,icon,disabled})[]\` | \`[]\` | Danh sách chip |
| \`value\` | string \\| string[] | \`''\` | Chọn một: chuỗi; \`multiple\`: mảng (attribute \`"a,b"\` / JSON) |
| \`multiple\` | boolean | — | Chọn nhiều (chip chọn có dấu ✓) |
| \`all-label\` | string | — | Thêm chip "Tất cả" đầu hàng (= bỏ lọc) |
| \`no-clear\` | boolean | — | Ẩn chip "Xóa lọc" |
| \`clear-text\` | string | "Xóa lọc" | Chữ chip xóa |
| \`wrap\` | boolean | — | Xuống dòng thay vì cuộn ngang |
| \`label\` | string | "Bộ lọc nhanh" | aria-label của nhóm |
| \`size\` / \`name\` / \`disabled\` / \`required\` | — | — | Như form control |

### Events
| Event | Detail |
|-------|--------|
| \`input\` / \`change\` / \`hui-change\` | \`{ value }\` |

### Parts
\`base\`, \`chip\` (+ \`chip-selected\`, \`chip-disabled\`, \`chip-all\`), \`icon\`, \`check\`, \`label\`, \`count\`, \`clear\`

### CSS Variables
\`--hui-filter-chips-gap | height | radius | bg | color | border-color | hover-bg | selected-bg | selected-color | selected-border-color | count-bg | fade\`

### Bàn phím
| Phím | Tác dụng |
|------|----------|
| \`Tab\` | Đi qua từng chip |
| \`Enter\` / \`Space\` | Bật / tắt chip (aria-pressed) |
| \`←\` / \`→\`, \`Home\` / \`End\` | Chuyển focus giữa các chip |
        `,
      },
    },
  },
};

export const Default = {
  render: () => html`<hui-filter-chips .options=${CATEGORIES}></hui-filter-chips>`,
};

/** Chọn một: bấm lại để bỏ; chip "Xóa lọc" xuất hiện khi đang lọc */
export const Single = {
  render: () => html`<hui-filter-chips id="fc-s" .options=${CATEGORIES}></hui-filter-chips>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fc-s');
    await waitFor(() => expect(chip(el, 'ao')).toBeTruthy());
    expect(clearChip(el)).toBeNull();
    const log = [];
    el.addEventListener('hui-change', (e) => log.push(e.detail.value));
    await userEvent.click(chip(el, 'quan'));
    expect(el.value).toBe('quan');
    expect(chip(el, 'quan').getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(chip(el, 'ao'));
    expect(el.value).toBe('ao');
    expect(chip(el, 'quan').getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(clearChip(el));
    expect(el.value).toBe('');
    expect(log).toEqual(['quan', 'ao', '']);
    expect(chip(el, 'het').disabled).toBe(true);
    expect(chip(el, 'phu-kien').querySelector('[part="count"]').textContent).not.toBe('12500'); // số gọn
  },
};

/** Nhiều lựa chọn + chip "Tất cả" + gửi form */
export const Multiple = {
  render: () => html`
    <form id="fc-f">
      <hui-filter-chips name="cat" multiple all-label="Tất cả" .options=${CATEGORIES}></hui-filter-chips>
    </form>
  `,
  play: async ({ canvasElement }) => {
    const form = canvasElement.querySelector('#fc-f');
    const el = form.querySelector('hui-filter-chips');
    await waitFor(() => expect(chip(el, 'ao')).toBeTruthy());
    const all = el.shadowRoot.querySelector('[data-action="all"]');
    expect(all.getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(chip(el, 'giay'));
    await userEvent.click(chip(el, 'ao'));
    expect(el.value).toEqual(['ao', 'giay']); // theo thứ tự option
    expect(new FormData(form).getAll('cat')).toEqual(['ao', 'giay']);
    expect(chip(el, 'ao').querySelector('[part="check"]')).toBeTruthy();
    await userEvent.click(el.shadowRoot.querySelector('[data-action="all"]'));
    expect(el.value).toEqual([]);
  },
};

/** ←/→ chuyển focus giữa chip, Space bật chip */
export const Keyboard = {
  render: () => html`<hui-filter-chips id="fc-k" .options=${['Mới', 'Bán chạy', 'Giá tốt']}></hui-filter-chips>`,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fc-k');
    await waitFor(() => expect(chip(el, 'Mới')).toBeTruthy());
    chip(el, 'Mới').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(el.shadowRoot.activeElement).toBe(chip(el, 'Bán chạy'));
    await userEvent.keyboard(' ');
    expect(el.value).toBe('Bán chạy');
    // vẽ lại vẫn giữ focus đúng chip
    expect(el.shadowRoot.activeElement?.dataset.value).toBe('Bán chạy');
    await userEvent.keyboard('{End}');
    expect(el.shadowRoot.activeElement?.dataset.action).toBe('clear');
  },
};

/** Tràn chiều ngang → cuộn ngang, mép mờ */
export const Overflow = {
  render: () => html`
    <div style="max-width:320px;border:1px dashed var(--hui-border);padding:4px">
      <hui-filter-chips id="fc-o" .options=${CATEGORIES.concat(['Mùa hè', 'Mùa đông', 'Unisex', 'Trẻ em'])}></hui-filter-chips>
    </div>
  `,
  play: async ({ canvasElement }) => {
    const el = canvasElement.querySelector('#fc-o');
    const base = el.shadowRoot.querySelector('[part="base"]');
    await waitFor(() => expect(base.classList.contains('fc--fade-end')).toBe(true));
    base.scrollLeft = base.scrollWidth;
    base.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(base.classList.contains('fc--fade-start')).toBe(true));
  },
};

export const SizesWrapDisabled = {
  render: () => html`
    <div style="display:grid;gap:12px;max-width:420px">
      <hui-filter-chips size="sm" value="ao" .options=${CATEGORIES.slice(0, 4)}></hui-filter-chips>
      <hui-filter-chips size="lg" value="quan" .options=${CATEGORIES.slice(0, 4)}></hui-filter-chips>
      <hui-filter-chips wrap multiple value="ao,giay" .options=${CATEGORIES}></hui-filter-chips>
      <hui-filter-chips disabled value="ao" .options=${CATEGORIES.slice(0, 4)}></hui-filter-chips>
    </div>
  `,
};

export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .fc-brand {
        --hui-filter-chips-radius: 8px;
        --hui-filter-chips-selected-bg: var(--hui-primary);
        --hui-filter-chips-selected-color: var(--hui-text-inverse);
        --hui-filter-chips-border-color: transparent;
        --hui-filter-chips-bg: var(--hui-fill-tertiary);
      }
      .fc-brand::part(count) { font-weight: 700; }
    </style>
    <hui-filter-chips class="fc-brand" value="quan" .options=${CATEGORIES.slice(0, 4)}></hui-filter-chips>
  `,
};
