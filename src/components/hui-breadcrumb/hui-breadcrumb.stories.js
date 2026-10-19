/**
 * Storybook Stories — HUI Breadcrumb
 * Ant Breadcrumb + MUI Breadcrumbs: separator, icon, item có menu thả xuống, rút gọn "…" khi quá dài.
 */

import { html } from 'lit';
import { expect, waitFor } from 'storybook/test';
import './index.js';

export default {
  title: 'Components/HuiBreadcrumb',
  component: 'hui-breadcrumb',
  subcomponents: { HuiBreadcrumbItem: 'hui-breadcrumb-item' },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
**HUI Breadcrumb** — Đường dẫn vị trí trang hiện tại. Landmark \`<nav aria-label>\`, danh sách \`<ol>\`,
item cuối tự gắn \`aria-current="page"\`.

\`\`\`html
<hui-breadcrumb max-items="4">
  <hui-breadcrumb-item href="/" icon="home">Trang chủ</hui-breadcrumb-item>
  <hui-breadcrumb-item href="/projects">Dự án</hui-breadcrumb-item>
  <hui-breadcrumb-item .menu=\${[{ key: 'a', label: 'Dự án A' }]}>HUI</hui-breadcrumb-item>
  <hui-breadcrumb-item>Cài đặt</hui-breadcrumb-item>
</hui-breadcrumb>
\`\`\`

### Attributes — hui-breadcrumb
| Attribute | Type | Default | Mô tả |
|-----------|------|---------|-------|
| \`separator\` | string | \`/\` | Dấu phân cách (slot \`separator\` ưu tiên hơn) |
| \`max-items\` | number | — | Quá N item → gộp phần giữa thành "…" (bấm để hiện đủ) |
| \`items-before-collapse\` | number | \`1\` | Số item giữ lại trước "…" |
| \`items-after-collapse\` | number | \`max-items - before\` | Số item giữ lại sau "…" |

### Attributes — hui-breadcrumb-item
| Attribute | Type | Mô tả |
|-----------|------|-------|
| \`href\` | string | Có → render \`<a>\` |
| \`target\` | string | target của link |
| \`icon\` | string | Tên hui-icon |
| _property_ \`menu\` | array | Item menu thả xuống (hover) — dùng hui-dropdown, cấu trúc như \`hui-dropdown.menu\` |

### Events
| Event | Detail | Mô tả |
|-------|--------|-------|
| \`hui-click\` _(item)_ | \`{ originalEvent }\` | Bấm vào item |
| \`hui-select\` | \`{ key, keyPath, item }\` | Chọn item trong menu thả xuống (nổi bọt từ hui-menu) |

### Slots
| Thẻ | Slot |
|-----|------|
| \`hui-breadcrumb\` | _(default)_ các item · \`separator\` dấu phân cách HTML |
| \`hui-breadcrumb-item\` | _(default)_ nhãn |

### Bàn phím
\`Tab\` đi qua các link và nút "…"; \`Enter\` mở link / bấm "…" (focus chuyển vào item đầu tiên vừa hiện).
Item có menu: hover để mở, hoặc \`↓\` trên link (theo hui-dropdown).

### Parts
- \`hui-breadcrumb\`: \`base\` (nav), \`list\` (ol)
- \`hui-breadcrumb-item\`: \`base\`, \`link\`, \`icon\`, \`dropdown-icon\`, \`separator\`, \`ellipsis\` · state \`:state(last)\`

### CSS Variables
| Biến | Mô tả |
|------|-------|
| \`--hui-breadcrumb-font-size\` | Cỡ chữ |
| \`--hui-breadcrumb-color\` | Màu chữ thường |
| \`--hui-breadcrumb-link-color\` / \`--hui-breadcrumb-link-hover-color\` / \`--hui-breadcrumb-link-hover-bg\` | Link |
| \`--hui-breadcrumb-last-color\` | Item cuối |
| \`--hui-breadcrumb-separator-color\` / \`--hui-breadcrumb-separator-margin\` | Dấu phân cách |
        `,
      },
    },
  },
  argTypes: {
    separator: { control: 'text' },
    'max-items': { control: 'number' },
  },
};

const crumbs = () => html`
  <hui-breadcrumb-item href="#" icon="home">Trang chủ</hui-breadcrumb-item>
  <hui-breadcrumb-item href="#">Dự án</hui-breadcrumb-item>
  <hui-breadcrumb-item href="#">HUI Library</hui-breadcrumb-item>
  <hui-breadcrumb-item href="#">Components</hui-breadcrumb-item>
  <hui-breadcrumb-item href="#">Navigation</hui-breadcrumb-item>
  <hui-breadcrumb-item>Breadcrumb</hui-breadcrumb-item>
`;

export const Default = {
  render: (args) => html`
    <hui-breadcrumb separator=${args.separator} max-items=${args['max-items'] || ''}>${crumbs()}</hui-breadcrumb>
  `,
  args: { separator: '/', 'max-items': 0 },
};

/** Dấu phân cách: chữ, ký tự, hoặc HTML qua slot separator (icon). */
export const Separators = {
  render: () => html`
    <div style="display: grid; gap: 16px;">
      <hui-breadcrumb separator=">">${crumbs()}</hui-breadcrumb>
      <hui-breadcrumb separator="•">${crumbs()}</hui-breadcrumb>
      <hui-breadcrumb>
        <hui-icon slot="separator" name="chevron-right"></hui-icon>
        ${crumbs()}
      </hui-breadcrumb>
    </div>
  `,
};

/** max-items: quá dài → gộp phần giữa thành "…", bấm để hiện đủ. */
export const Collapsed = {
  render: () => html`<hui-breadcrumb id="bc-collapse" max-items="3">${crumbs()}</hui-breadcrumb>`,
  play: async ({ canvasElement }) => {
    const bc = canvasElement.querySelector('#bc-collapse');
    const items = [...bc.querySelectorAll('hui-breadcrumb-item')];
    await waitFor(() => expect(items.filter((i) => !i.hidden).length).toBe(3));
    await expect(items[1].hidden && items[2].hidden && items[3].hidden).toBe(true);

    const ellipsis = items[0].shadowRoot.querySelector('[part="ellipsis"]');
    await expect(ellipsis.closest('[hidden]')).toBeNull();
    ellipsis.click();
    await waitFor(() => expect(items.every((i) => !i.hidden)).toBe(true));
  },
};

/** Item có menu thả xuống (hover) — tái dùng hui-dropdown. */
export const WithDropdown = {
  render: () => html`
    <div style="padding-bottom: 160px;">
      <hui-breadcrumb>
        <hui-breadcrumb-item href="#" icon="home">Trang chủ</hui-breadcrumb-item>
        <hui-breadcrumb-item .menu=${[
          { key: 'hui', label: 'HUI Library' },
          { key: 'docs', label: 'Tài liệu' },
          { key: 'site', label: 'Website' },
        ]}>HUI Library</hui-breadcrumb-item>
        <hui-breadcrumb-item>Cài đặt</hui-breadcrumb-item>
      </hui-breadcrumb>
    </div>
  `,
};

/** ARIA: nav có aria-label, item cuối aria-current="page", không có dấu phân cách sau item cuối. */
export const Accessibility = {
  render: () => html`<hui-breadcrumb id="bc-a11y">${crumbs()}</hui-breadcrumb>`,
  play: async ({ canvasElement }) => {
    const bc = canvasElement.querySelector('#bc-a11y');
    const nav = bc.shadowRoot.querySelector('nav');
    await expect(nav.getAttribute('aria-label')).toBeTruthy();
    const items = [...bc.querySelectorAll('hui-breadcrumb-item')];
    const last = items[items.length - 1];
    await waitFor(() => expect(last.shadowRoot.querySelector('[part="link"]').getAttribute('aria-current')).toBe('page'));
    await expect(last.shadowRoot.querySelector('.sep').hidden).toBe(true);
    await expect(items[0].shadowRoot.querySelector('.sep').textContent).toBe('/');
    await expect(items[0].shadowRoot.querySelector('a').getAttribute('href')).toBe('#');
    await expect(items[0].getAttribute('role')).toBe('listitem');
  },
};

/** Override từ bên ngoài — biến CSS + ::part(). */
export const CustomizeFromOutside = {
  render: () => html`
    <style>
      .bc-brand {
        --hui-breadcrumb-link-color: var(--hui-primary);
        --hui-breadcrumb-separator-color: var(--hui-primary-4);
        --hui-breadcrumb-separator-margin: 0 12px;
        --hui-breadcrumb-font-size: 15px;
      }
      .bc-brand hui-breadcrumb-item:state(last)::part(link) { font-weight: 600; }
    </style>
    <div class="bc-brand"><hui-breadcrumb id="bc-custom" separator="›">${crumbs()}</hui-breadcrumb></div>
  `,
  play: async ({ canvasElement }) => {
    const bc = canvasElement.querySelector('#bc-custom');
    const sep = bc.querySelector('hui-breadcrumb-item').shadowRoot.querySelector('.sep');
    await waitFor(() => expect(getComputedStyle(sep).marginLeft).toBe('12px'));
  },
};
